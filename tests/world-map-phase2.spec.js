// @ts-check
import { test, expect } from '@playwright/test';

/**
 * World Map Phase 2 QA Tests
 * Verifies: world/map data, calcStarRating, MapClearScene, i18n, GameScene integration.
 */

const BASE_URL = 'http://localhost:3456';

// ── Helpers ──────────────────────────────────────────────────────

async function waitForGame(page, timeout = 15000) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout });
  await page.waitForFunction(() => {
    return window.__game && window.__game.scene && window.__game.scene.scenes.length > 0;
  }, { timeout });
}

async function waitForScene(page, sceneKey, timeout = 10000) {
  await page.waitForFunction((key) => {
    const g = window.__game;
    if (!g) return false;
    const scene = g.scene.getScene(key);
    return scene && scene.scene.isActive();
  }, sceneKey, { timeout });
  await page.waitForTimeout(500);
}

// ── 1. World Data Verification ──────────────────────────────────

test.describe('World Data (worlds.js)', () => {
  test('5 worlds are defined with correct properties', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(() => {
      // Access worlds via module
      const { WORLDS, getWorldById, getWorldByMapId } = require_worlds();
      return {
        count: WORLDS.length,
        ids: WORLDS.map(w => w.id),
        orders: WORLDS.map(w => w.order),
        requiredStars: WORLDS.map(w => w.requiredStars),
        mapCounts: WORLDS.map(w => w.mapIds.length),
      };
    }).catch(() => null);

    // Since require_worlds won't work in browser, use dynamic import evaluation
    const result2 = await page.evaluate(async () => {
      // Access the map registry via the game's existing infrastructure
      const g = window.__game;
      if (!g) return null;

      // Navigate to get data from scenes that import worlds
      // Try fetching the module data another way
      const scene = g.scene.getScenes(true)[0];
      if (!scene) return null;

      // Check if getMapById works for known maps
      return true;
    });

    // Use a more practical approach - verify via data accessible at runtime
    const worldCheck = await page.evaluate(async () => {
      try {
        const mod = await import('/js/data/worlds.js');
        return {
          count: mod.WORLDS.length,
          ids: mod.WORLDS.map(w => w.id),
          orders: mod.WORLDS.map(w => w.order),
          requiredStars: mod.WORLDS.map(w => w.requiredStars),
          mapCounts: mod.WORLDS.map(w => w.mapIds.length),
          nameKeys: mod.WORLDS.map(w => w.nameKey),
          descKeys: mod.WORLDS.map(w => w.descKey),
          hasThemes: mod.WORLDS.every(w => w.theme && typeof w.theme.emptyTile === 'number'),
        };
      } catch (e) {
        return { error: e.message };
      }
    });

    expect(worldCheck.error).toBeUndefined();
    expect(worldCheck.count).toBe(5);
    expect(worldCheck.ids).toEqual(['forest', 'desert', 'tundra', 'volcano', 'shadow']);
    expect(worldCheck.orders).toEqual([1, 2, 3, 4, 5]);
    expect(worldCheck.requiredStars).toEqual([0, 9, 24, 42, 60]);
    expect(worldCheck.mapCounts).toEqual([6, 6, 6, 6, 6]);
    expect(worldCheck.hasThemes).toBe(true);
  });

  test('getWorldById returns correct world or null', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { getWorldById } = await import('/js/data/worlds.js');
      return {
        forest: getWorldById('forest')?.id,
        shadow: getWorldById('shadow')?.id,
        nonexistent: getWorldById('nonexistent'),
        nullId: getWorldById(null),
        emptyId: getWorldById(''),
      };
    });

    expect(result.forest).toBe('forest');
    expect(result.shadow).toBe('shadow');
    expect(result.nonexistent).toBeNull();
    expect(result.nullId).toBeNull();
    expect(result.emptyId).toBeNull();
  });

  test('getWorldByMapId returns correct world or null', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { getWorldByMapId } = await import('/js/data/worlds.js');
      return {
        f1_m1: getWorldByMapId('f1_m1')?.id,
        d2_m3: getWorldByMapId('d2_m3')?.id,
        s5_m6: getWorldByMapId('s5_m6')?.id,
        classic: getWorldByMapId('classic'),
        nonexistent: getWorldByMapId('nonexistent'),
      };
    });

    expect(result.f1_m1).toBe('forest');
    expect(result.d2_m3).toBe('desert');
    expect(result.s5_m6).toBe('shadow');
    expect(result.classic).toBeNull();
    expect(result.nonexistent).toBeNull();
  });

  test('Theme colors match spec', async ({ page }) => {
    await waitForGame(page);
    const themes = await page.evaluate(async () => {
      const m = await import('/js/data/worlds.js');
      return {
        forest: m.THEME_FOREST,
        desert: m.THEME_DESERT,
        tundra: m.THEME_TUNDRA,
        volcano: m.THEME_VOLCANO,
        shadow: m.THEME_SHADOW,
      };
    });

    expect(themes.forest).toEqual({ emptyTile: 0x1a2e1a, path: 0x2e3e1e, bg: 0x0d1a0d });
    expect(themes.desert).toEqual({ emptyTile: 0x2e2a1a, path: 0x3e351e, bg: 0x1a150d });
    expect(themes.tundra).toEqual({ emptyTile: 0x1a2a2e, path: 0x1e3038, bg: 0x0d151a });
    expect(themes.volcano).toEqual({ emptyTile: 0x2e1a1a, path: 0x381e1e, bg: 0x1a0d0d });
    expect(themes.shadow).toEqual({ emptyTile: 0x221a2e, path: 0x2a1e38, bg: 0x120d1a });
  });
});

// ── 2. Map Data Verification ────────────────────────────────────

test.describe('Map Data (30 maps)', () => {
  test('All 30 maps registered in map registry', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { getMapById } = await import('/js/data/maps.js');
      const mapIds = [
        'f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6',
        'd2_m1','d2_m2','d2_m3','d2_m4','d2_m5','d2_m6',
        't3_m1','t3_m2','t3_m3','t3_m4','t3_m5','t3_m6',
        'v4_m1','v4_m2','v4_m3','v4_m4','v4_m5','v4_m6',
        's5_m1','s5_m2','s5_m3','s5_m4','s5_m5','s5_m6',
      ];
      const results = {};
      for (const id of mapIds) {
        const m = getMapById(id);
        results[id] = m !== null;
      }
      return { results, total: Object.values(results).filter(v => v).length };
    });

    expect(result.total).toBe(30);
    for (const [id, found] of Object.entries(result.results)) {
      expect(found, `Map ${id} should be in registry`).toBe(true);
    }
  });

  test('All maps pass validateMapData', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { getMapById, validateMapData } = await import('/js/data/maps.js');
      const mapIds = [
        'f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6',
        'd2_m1','d2_m2','d2_m3','d2_m4','d2_m5','d2_m6',
        't3_m1','t3_m2','t3_m3','t3_m4','t3_m5','t3_m6',
        'v4_m1','v4_m2','v4_m3','v4_m4','v4_m5','v4_m6',
        's5_m1','s5_m2','s5_m3','s5_m4','s5_m5','s5_m6',
        'classic',
      ];
      const failures = [];
      for (const id of mapIds) {
        const m = getMapById(id);
        if (!m) { failures.push({ id, errors: ['Map not found'] }); continue; }
        const r = validateMapData(m);
        if (!r.valid) failures.push({ id, errors: r.errors });
      }
      return { total: mapIds.length, failures };
    });

    expect(result.failures).toEqual([]);
  });

  test('Maps have correct worldId matching their world', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { WORLDS } = await import('/js/data/worlds.js');
      const { getMapById } = await import('/js/data/maps.js');
      const mismatches = [];
      for (const world of WORLDS) {
        for (const mapId of world.mapIds) {
          const m = getMapById(mapId);
          if (!m) { mismatches.push(`${mapId}: not found`); continue; }
          if (m.worldId !== world.id) {
            mismatches.push(`${mapId}: worldId=${m.worldId}, expected=${world.id}`);
          }
        }
      }
      return mismatches;
    });

    expect(result).toEqual([]);
  });

  test('Classic map still exists and works', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { getMapById, validateMapData } = await import('/js/data/maps.js');
      const m = getMapById('classic');
      if (!m) return { exists: false };
      const v = validateMapData(m);
      return { exists: true, valid: v.valid, totalWaves: m.totalWaves, errors: v.errors };
    });

    expect(result.exists).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.totalWaves).toBe(Infinity);
  });
});

// ── 3. Star Rating System ───────────────────────────────────────

test.describe('calcStarRating', () => {
  test('exact boundary values', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { calcStarRating } = await import('/js/config.js');
      return {
        percent100: calcStarRating(20, 20),  // 100% -> 3
        percent80: calcStarRating(16, 20),   // 80% exact -> 3
        percent79: calcStarRating(15, 20),   // 75% -> 2
        percent40: calcStarRating(8, 20),    // 40% exact -> 2
        percent39: calcStarRating(7, 20),    // 35% -> 1
        percent1: calcStarRating(1, 20),     // 5% -> 1
        maxHP0: calcStarRating(5, 0),        // edge: maxHP=0 -> 1
        hp0: calcStarRating(0, 20),          // 0% -> 1
        hpNeg: calcStarRating(-5, 20),       // negative -> 1
        hpOverflow: calcStarRating(100, 20), // >100% -> 3
      };
    });

    expect(result.percent100).toBe(3);
    expect(result.percent80).toBe(3);
    expect(result.percent79).toBe(2);
    expect(result.percent40).toBe(2);
    expect(result.percent39).toBe(1);
    expect(result.percent1).toBe(1);
    expect(result.maxHP0).toBe(1);
    expect(result.hp0).toBe(1);
    expect(result.hpNeg).toBe(1);
    expect(result.hpOverflow).toBe(3);
  });

  test('CAMPAIGN_DIAMOND_REWARDS correct values', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { CAMPAIGN_DIAMOND_REWARDS } = await import('/js/config.js');
      return CAMPAIGN_DIAMOND_REWARDS;
    });

    expect(result).toEqual([0, 3, 5, 8]);
  });
});

// ── 4. MapClearScene ────────────────────────────────────────────

test.describe('MapClearScene', () => {
  test('MapClearScene is registered in Phaser game', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('MapClearScene');
      return scene !== null && scene !== undefined;
    });

    expect(result).toBe(true);
  });

  test('MapClearScene renders with 3-star data', async ({ page }) => {
    await waitForGame(page);

    // Start MapClearScene directly with high HP data
    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 20,
          maxHP: 20,
          wavesCleared: 8,
          kills: 42,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000); // Wait for star animations

    await page.screenshot({ path: 'tests/screenshots/mapclear-3star.png' });
  });

  test('MapClearScene renders with 2-star data', async ({ page }) => {
    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m3');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 10,
          maxHP: 20,
          wavesCleared: 10,
          kills: 55,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/mapclear-2star.png' });
  });

  test('MapClearScene renders with 1-star data', async ({ page }) => {
    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('d2_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 2,
          maxHP: 20,
          wavesCleared: 10,
          kills: 30,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/mapclear-1star.png' });
  });

  test('MapClearScene shows diamond reward for 3-star', async ({ page }) => {
    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 20,
          maxHP: 20,
          wavesCleared: 8,
          kills: 42,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000);

    // Verify diamond reward is present by checking scene's internal state
    const hasDiamond = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MapClearScene');
      // Check if there are text objects containing "Diamond"
      const texts = s.children.list.filter(c => c.type === 'Text');
      return texts.some(t => t.text && t.text.includes('Diamond'));
    });

    expect(hasDiamond).toBe(true);
  });

  test('MapClearScene has 3 buttons (NEXT MAP, RETRY, WORLD MAP)', async ({ page }) => {
    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 20,
          maxHP: 20,
          wavesCleared: 8,
          kills: 42,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(1000);

    const buttonInfo = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MapClearScene');
      const texts = s.children.list.filter(c => c.type === 'Text');
      const rects = s.children.list.filter(c => c.type === 'Rectangle' && c.input);
      const textContents = texts.map(t => t.text);
      return {
        textContents,
        interactiveRectCount: rects.length,
        hasNextMap: textContents.some(t => t.includes('NEXT MAP')),
        hasRetry: textContents.some(t => t.includes('RETRY')),
        hasWorldMap: textContents.some(t => t.includes('WORLD MAP')),
      };
    });

    expect(buttonInfo.interactiveRectCount).toBe(3);
    expect(buttonInfo.hasNextMap).toBe(true);
    expect(buttonInfo.hasRetry).toBe(true);
    expect(buttonInfo.hasWorldMap).toBe(true);
  });

  test('RETRY button starts GameScene with same mapData', async ({ page }) => {
    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 20,
          maxHP: 20,
          wavesCleared: 8,
          kills: 42,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(500);

    // Click RETRY button - find its position
    const retryClicked = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MapClearScene');
      const rects = s.children.list.filter(c => c.type === 'Rectangle' && c.input);
      // RETRY is the second interactive rect (NEXT MAP is first)
      if (rects.length >= 2) {
        rects[1].emit('pointerdown');
        return true;
      }
      return false;
    });

    expect(retryClicked).toBe(true);

    // Should navigate to GameScene
    await page.waitForTimeout(1000);
    const activeScene = await page.evaluate(() => {
      const g = window.__game;
      const scenes = g.scene.getScenes(true);
      return scenes.length > 0 ? scenes[0].scene.key : null;
    });

    expect(activeScene).toBe('GameScene');
  });

  test('MapClearScene with missing data gracefully defaults', async ({ page }) => {
    await waitForGame(page);

    // Start with empty data object
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.evaluate(() => {
      const g = window.__game;
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {});
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(1500);

    // No JS errors should have occurred
    expect(errors).toEqual([]);

    await page.screenshot({ path: 'tests/screenshots/mapclear-empty-data.png' });
  });
});

// ── 5. i18n Verification ────────────────────────────────────────

test.describe('i18n keys', () => {
  test('All campaign/world/map i18n keys exist for ko and en', async ({ page }) => {
    await waitForGame(page);

    const result = await page.evaluate(async () => {
      const { t, setLanguage, translations } = await import('/js/i18n.js');

      const requiredKeys = [
        'ui.mapClear', 'ui.nextMap', 'ui.worldMap',
        'ui.rating1', 'ui.rating2', 'ui.rating3',
        'world.forest.name', 'world.forest.desc',
        'world.desert.name', 'world.desert.desc',
        'world.tundra.name', 'world.tundra.desc',
        'world.volcano.name', 'world.volcano.desc',
        'world.shadow.name', 'world.shadow.desc',
      ];

      // Map name keys
      const worldPrefixes = [
        { prefix: 'f1_m', count: 6 },
        { prefix: 'd2_m', count: 6 },
        { prefix: 't3_m', count: 6 },
        { prefix: 'v4_m', count: 6 },
        { prefix: 's5_m', count: 6 },
      ];

      for (const { prefix, count } of worldPrefixes) {
        for (let i = 1; i <= count; i++) {
          requiredKeys.push(`map.${prefix}${i}.name`);
          requiredKeys.push(`map.${prefix}${i}.desc`);
        }
      }

      const missingKo = [];
      const missingEn = [];

      for (const key of requiredKeys) {
        if (!translations.ko[key]) missingKo.push(key);
        if (!translations.en[key]) missingEn.push(key);
      }

      return { missingKo, missingEn, totalChecked: requiredKeys.length };
    });

    expect(result.missingKo, 'Missing Korean translations').toEqual([]);
    expect(result.missingEn, 'Missing English translations').toEqual([]);
  });

  test('t() function returns correct value for campaign keys', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(async () => {
      const { t } = await import('/js/i18n.js');
      return {
        mapClear: t('ui.mapClear'),
        rating3: t('ui.rating3'),
        forestName: t('world.forest.name'),
      };
    });

    // Default language is ko
    expect(result.mapClear).toBe('MAP CLEAR!');
    expect(result.rating3).toBeTruthy();
    expect(result.forestName).toBeTruthy();
  });
});

// ── 6. GameScene Integration ────────────────────────────────────

test.describe('GameScene integration', () => {
  test('GameScene registers mapClear event listener', async ({ page }) => {
    await waitForGame(page);

    // Start a campaign game
    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('GameScene', {
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'GameScene');

    const hasListener = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      // Check if mapClear event has listeners
      const listeners = s.events.listeners('mapClear');
      return listeners.length > 0;
    });

    expect(hasListener).toBe(true);
  });

  test('_onMapClear sets isGameOver and schedules scene transition', async ({ page }) => {
    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('GameScene', {
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'GameScene');

    // Manually emit mapClear event
    const isGameOver = await page.evaluate(() => {
      const s = window.__game.scene.getScene('GameScene');
      s.events.emit('mapClear', {
        currentHP: 15,
        maxBaseHP: 20,
        wavesCleared: 8,
      });
      return s.isGameOver;
    });

    expect(isGameOver).toBe(true);

    // Wait for 1.5s (1s delay + buffer) and check if MapClearScene is active
    await page.waitForTimeout(1500);

    const activeScene = await page.evaluate(() => {
      const g = window.__game;
      const scenes = g.scene.getScenes(true);
      return scenes.length > 0 ? scenes[0].scene.key : null;
    });

    expect(activeScene).toBe('MapClearScene');
  });
});

// ── 7. Edge Cases ───────────────────────────────────────────────

test.describe('Edge cases', () => {
  test('No console errors during MapClearScene lifecycle', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 20,
          maxHP: 20,
          wavesCleared: 8,
          kills: 42,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000);

    // Click all three buttons to test navigation
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MapClearScene');
      const rects = s.children.list.filter(c => c.type === 'Rectangle' && c.input);
      // Hover over all buttons first
      rects.forEach(r => {
        r.emit('pointerover');
        r.emit('pointerout');
      });
    });

    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });

  test('MapClearScene with HP 0 shows 1 star', async ({ page }) => {
    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 0,
          maxHP: 20,
          wavesCleared: 8,
          kills: 42,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000);

    // Verify diamond reward is 3 (for 1-star)
    const diamondInfo = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MapClearScene');
      const texts = s.children.list.filter(c => c.type === 'Text');
      const diamondText = texts.find(t => t.text && t.text.includes('Diamond'));
      return {
        hasDiamond: !!diamondText,
        text: diamondText?.text || 'none',
      };
    });

    // 1-star = 3 diamonds
    expect(diamondInfo.hasDiamond).toBe(true);
    expect(diamondInfo.text).toContain('+3');

    await page.screenshot({ path: 'tests/screenshots/mapclear-hp0.png' });
  });

  test('MapClearScene with very high kills and waves', async ({ page }) => {
    await waitForGame(page);

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('s5_m6');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 999999,
          maxHP: 999999,
          wavesCleared: 25,
          kills: 99999,
          gameStats: {},
          mapData,
          gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
    await page.screenshot({ path: 'tests/screenshots/mapclear-extreme-values.png' });
  });

  test('Double scene start does not crash', async ({ page }) => {
    await waitForGame(page);

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        // Start MapClearScene twice rapidly
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 20, maxHP: 20, wavesCleared: 8, kills: 42,
          gameStats: {}, mapData, gameMode: 'campaign',
        });
      }
    });

    await page.waitForTimeout(200);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m2');
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MapClearScene', {
          currentHP: 10, maxHP: 20, wavesCleared: 9, kills: 50,
          gameStats: {}, mapData, gameMode: 'campaign',
        });
      }
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });
});

// ── 8. Visual Verification ──────────────────────────────────────

test.describe('Visual verification', () => {
  test('MapClearScene layout for all star ratings', async ({ page }) => {
    await waitForGame(page);

    // 3-star layout
    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      g.scene.getScenes(true)[0].scene.start('MapClearScene', {
        currentHP: 20, maxHP: 20, wavesCleared: 8, kills: 42,
        gameStats: {}, mapData, gameMode: 'campaign',
      });
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'tests/screenshots/mapclear-layout-3star.png' });
  });

  test('Mobile viewport renders correctly', async ({ page }) => {
    // Viewport is already 360x640 from config
    await waitForGame(page);

    await page.evaluate(async () => {
      const g = window.__game;
      const { getMapById } = await import('/js/data/maps.js');
      const mapData = getMapById('f1_m1');
      g.scene.getScenes(true)[0].scene.start('MapClearScene', {
        currentHP: 16, maxHP: 20, wavesCleared: 8, kills: 42,
        gameStats: {}, mapData, gameMode: 'campaign',
      });
    });

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'tests/screenshots/mapclear-mobile-360x640.png' });
  });
});
