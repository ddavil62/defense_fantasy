// @ts-check
import { test, expect } from '@playwright/test';

/**
 * World Map Phase 4 QA Tests
 * Save v3 migration, worldProgress persistence, diamond rewards,
 * endless unlock, world/map unlock logic, campaignStats.
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

function getSceneTexts(page, sceneKey) {
  return page.evaluate((key) => {
    const s = window.__game.scene.getScene(key);
    if (!s) return [];
    return s.children.list
      .filter(c => c.type === 'Text')
      .map(c => c.text);
  }, sceneKey);
}

/**
 * Navigate to the page, set localStorage, then reload so the game
 * boots with the injected save data.
 */
async function setupSaveAndReload(page, saveData) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  if (saveData === null) {
    await page.evaluate(() => localStorage.removeItem('fantasy-td-save'));
  } else {
    await page.evaluate((save) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(save));
    }, saveData);
  }
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    return window.__game && window.__game.scene && window.__game.scene.scenes.length > 0;
  }, { timeout: 15000 });
}

function makeCleanV3Save(overrides = {}) {
  return {
    saveDataVersion: 3,
    bestRound: 0, bestKills: 0, totalGames: 0,
    diamond: 0, totalDiamondEarned: 0,
    towerUpgrades: {}, utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
    unlockedTowers: [], discoveredMerges: [],
    stats: { totalGamesPlayed: 0, bestRound: 0, bestKills: 0, totalTowersPlaced: 0, totalDamageDealt: 0, totalGoldEarned: 0, totalKills: 0, totalMerges: 0, gameHistory: [] },
    worldProgress: {}, endlessUnlocked: false,
    campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
    ...overrides,
  };
}

function makeMapData(mapId) {
  return {
    id: mapId,
    meta: { nameKey: `map.${mapId}.name`, descKey: `map.${mapId}.desc`, difficulty: 1 },
    totalWaves: 10,
    waypoints: [],
    towerSlots: [],
    theme: { emptyTile: 0, path: 0, bg: 0 },
  };
}

// ── 1. Save v3 Migration Tests ──────────────────────────────────

test.describe('Save v3 Migration', () => {
  test('New user: default save has v3 fields', async ({ page }) => {
    await setupSaveAndReload(page, null);
    await waitForScene(page, 'MenuScene');

    const registrySave = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('MenuScene');
      return scene ? scene.registry.get('saveData') : null;
    });

    expect(registrySave).toBeTruthy();
    expect(registrySave.saveDataVersion).toBe(3);
    expect(registrySave.worldProgress).toEqual({});
    expect(registrySave.endlessUnlocked).toBe(false);
    expect(registrySave.campaignStats).toEqual({ totalStars: 0, mapsCleared: 0, worldsCleared: 0 });
  });

  test('v2 save migrates to v3 preserving all v2 fields', async ({ page }) => {
    const v2Save = {
      saveDataVersion: 2,
      bestRound: 15,
      bestKills: 200,
      totalGames: 10,
      diamond: 50,
      totalDiamondEarned: 80,
      towerUpgrades: { archer: { damage: 1 } },
      utilityUpgrades: { baseHp: 2, goldBoost: 1, waveBonus: 0 },
      unlockedTowers: ['dragon'],
      discoveredMerges: ['archer+mage'],
      stats: {
        totalGamesPlayed: 10, bestRound: 15, bestKills: 200,
        totalTowersPlaced: 100, totalDamageDealt: 5000, totalGoldEarned: 3000,
        totalKills: 800, totalMerges: 20, gameHistory: [],
      },
    };

    await setupSaveAndReload(page, v2Save);
    await waitForScene(page, 'MenuScene');

    const migrated = await page.evaluate(() => {
      return window.__game.scene.getScene('MenuScene').registry.get('saveData');
    });

    expect(migrated.saveDataVersion).toBe(3);
    // v2 fields preserved
    expect(migrated.bestRound).toBe(15);
    expect(migrated.bestKills).toBe(200);
    expect(migrated.totalGames).toBe(10);
    expect(migrated.diamond).toBe(50);
    expect(migrated.totalDiamondEarned).toBe(80);
    expect(migrated.towerUpgrades).toEqual({ archer: { damage: 1 } });
    expect(migrated.utilityUpgrades).toEqual({ baseHp: 2, goldBoost: 1, waveBonus: 0 });
    expect(migrated.unlockedTowers).toEqual(['dragon']);
    expect(migrated.discoveredMerges).toEqual(['archer+mage']);
    // v3 new fields
    expect(migrated.worldProgress).toEqual({});
    expect(migrated.endlessUnlocked).toBe(false); // bestRound 15 < 20
    expect(migrated.campaignStats).toEqual({ totalStars: 0, mapsCleared: 0, worldsCleared: 0 });
  });

  test('v2 save with bestRound >= 20 unlocks endless', async ({ page }) => {
    await setupSaveAndReload(page, {
      saveDataVersion: 2,
      bestRound: 25, bestKills: 300, totalGames: 15,
      diamond: 100, totalDiamondEarned: 120,
      towerUpgrades: {}, utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
      unlockedTowers: [], discoveredMerges: [],
      stats: { totalGamesPlayed: 15, bestRound: 25, bestKills: 300, totalTowersPlaced: 0, totalDamageDealt: 0, totalGoldEarned: 0, totalKills: 0, totalMerges: 0, gameHistory: [] },
    });
    await waitForScene(page, 'MenuScene');

    const migrated = await page.evaluate(() => {
      return window.__game.scene.getScene('MenuScene').registry.get('saveData');
    });
    expect(migrated.endlessUnlocked).toBe(true);
  });

  test('v2 save with bestRound exactly 20 unlocks endless', async ({ page }) => {
    await setupSaveAndReload(page, {
      saveDataVersion: 2,
      bestRound: 20, bestKills: 100, totalGames: 5,
      diamond: 10, totalDiamondEarned: 10,
      towerUpgrades: {}, utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
      unlockedTowers: [], discoveredMerges: [],
      stats: { totalGamesPlayed: 5, bestRound: 20, bestKills: 100, totalTowersPlaced: 0, totalDamageDealt: 0, totalGoldEarned: 0, totalKills: 0, totalMerges: 0, gameHistory: [] },
    });
    await waitForScene(page, 'MenuScene');

    const migrated = await page.evaluate(() => {
      return window.__game.scene.getScene('MenuScene').registry.get('saveData');
    });
    expect(migrated.endlessUnlocked).toBe(true);
  });

  test('v2 save with bestRound 19 does NOT unlock endless', async ({ page }) => {
    await setupSaveAndReload(page, {
      saveDataVersion: 2,
      bestRound: 19, bestKills: 100, totalGames: 5,
      diamond: 10, totalDiamondEarned: 10,
      towerUpgrades: {}, utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
      unlockedTowers: [], discoveredMerges: [],
      stats: { totalGamesPlayed: 5, bestRound: 19, bestKills: 100, totalTowersPlaced: 0, totalDamageDealt: 0, totalGoldEarned: 0, totalKills: 0, totalMerges: 0, gameHistory: [] },
    });
    await waitForScene(page, 'MenuScene');

    const migrated = await page.evaluate(() => {
      return window.__game.scene.getScene('MenuScene').registry.get('saveData');
    });
    expect(migrated.endlessUnlocked).toBe(false);
  });

  test('v1 save (no saveDataVersion) migrates through v1->v2->v3 sequentially', async ({ page }) => {
    await setupSaveAndReload(page, {
      bestRound: 22, bestKills: 150, totalGames: 8,
      diamond: 30, totalDiamondEarned: 40,
      dragonUnlocked: true,
      towerUpgrades: {},
      utilityUpgrades: { baseHp: 1, goldBoost: 0, waveBonus: 0 },
    });
    await waitForScene(page, 'MenuScene');

    const migrated = await page.evaluate(() => {
      return window.__game.scene.getScene('MenuScene').registry.get('saveData');
    });

    expect(migrated.saveDataVersion).toBe(3);
    expect(migrated.unlockedTowers).toContain('dragon');
    expect(migrated.discoveredMerges).toEqual([]);
    expect(migrated.endlessUnlocked).toBe(true); // bestRound=22 >= 20
    expect(migrated.worldProgress).toEqual({});
    expect(migrated.campaignStats).toEqual({ totalStars: 0, mapsCleared: 0, worldsCleared: 0 });
    expect(migrated.diamond).toBe(30);
    expect(migrated.bestRound).toBe(22);
  });

  test('Already v3 save: no duplicate migration', async ({ page }) => {
    await setupSaveAndReload(page, {
      saveDataVersion: 3,
      bestRound: 10, bestKills: 50, totalGames: 3,
      diamond: 20, totalDiamondEarned: 25,
      towerUpgrades: {}, utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
      unlockedTowers: [], discoveredMerges: [],
      stats: { totalGamesPlayed: 3, bestRound: 10, bestKills: 50, totalTowersPlaced: 0, totalDamageDealt: 0, totalGoldEarned: 0, totalKills: 0, totalMerges: 0, gameHistory: [] },
      worldProgress: { f1_m1: { cleared: true, stars: 2 } },
      endlessUnlocked: false,
      campaignStats: { totalStars: 2, mapsCleared: 1, worldsCleared: 0 },
    });
    await waitForScene(page, 'MenuScene');

    const migrated = await page.evaluate(() => {
      return window.__game.scene.getScene('MenuScene').registry.get('saveData');
    });

    expect(migrated.saveDataVersion).toBe(3);
    expect(migrated.worldProgress).toEqual({ f1_m1: { cleared: true, stars: 2 } });
    expect(migrated.campaignStats).toEqual({ totalStars: 2, mapsCleared: 1, worldsCleared: 0 });
  });

  test('Empty localStorage: fresh start with v3 defaults', async ({ page }) => {
    await setupSaveAndReload(page, null);
    await waitForScene(page, 'MenuScene');

    const save = await page.evaluate(() => {
      return window.__game.scene.getScene('MenuScene').registry.get('saveData');
    });

    expect(save).toBeTruthy();
    expect(save.saveDataVersion).toBe(3);
    expect(save.worldProgress).toEqual({});
    expect(save.endlessUnlocked).toBe(false);
    expect(save.campaignStats).toEqual({ totalStars: 0, mapsCleared: 0, worldsCleared: 0 });
    expect(save.diamond).toBe(0);
    expect(save.bestRound).toBe(0);
  });
});

// ── 2. MapClearScene Save Logic Tests ────────────────────────────

test.describe('MapClearScene Save Processing', () => {
  test('First clear (3 stars): 8 diamonds, worldProgress saved', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({ diamond: 10, totalDiamondEarned: 10 }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 20, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m1'));

    await waitForScene(page, 'MapClearScene');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('fantasy-td-save')));
    expect(save.worldProgress.f1_m1).toEqual({ cleared: true, stars: 3 });
    expect(save.diamond).toBe(18); // 10 + 8
    expect(save.totalDiamondEarned).toBe(18);
    expect(save.campaignStats.totalStars).toBe(3);
    expect(save.campaignStats.mapsCleared).toBe(1);
  });

  test('First clear (1 star): 3 diamonds awarded', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save());
    await waitForScene(page, 'MenuScene');

    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 1, maxHP: 20, wavesCleared: 10, kills: 30, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m2'));

    await waitForScene(page, 'MapClearScene');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('fantasy-td-save')));
    expect(save.worldProgress.f1_m2).toEqual({ cleared: true, stars: 1 });
    expect(save.diamond).toBe(3);
    expect(save.campaignStats.totalStars).toBe(1);
    expect(save.campaignStats.mapsCleared).toBe(1);
  });

  test('First clear (2 stars): 5 diamonds awarded', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save());
    await waitForScene(page, 'MenuScene');

    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 10, maxHP: 20, wavesCleared: 10, kills: 30, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m3'));

    await waitForScene(page, 'MapClearScene');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('fantasy-td-save')));
    expect(save.worldProgress.f1_m3).toEqual({ cleared: true, stars: 2 });
    expect(save.diamond).toBe(5);
    expect(save.campaignStats.totalStars).toBe(2);
  });

  test('Re-clear with higher stars: difference diamond awarded, best stars kept', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 3, totalDiamondEarned: 3,
      worldProgress: { f1_m1: { cleared: true, stars: 1 } },
      campaignStats: { totalStars: 1, mapsCleared: 1, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    // Re-clear with 2 stars
    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 10, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m1'));

    await waitForScene(page, 'MapClearScene');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('fantasy-td-save')));
    expect(save.worldProgress.f1_m1).toEqual({ cleared: true, stars: 2 });
    expect(save.diamond).toBe(5); // 3 + (5-3)
    expect(save.totalDiamondEarned).toBe(5);
    expect(save.campaignStats.totalStars).toBe(2); // 1 + (2-1)
    expect(save.campaignStats.mapsCleared).toBe(1); // not new clear
  });

  test('Re-clear with same stars: 0 diamonds, "already best" text', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 8, totalDiamondEarned: 8,
      worldProgress: { f1_m1: { cleared: true, stars: 3 } },
      campaignStats: { totalStars: 3, mapsCleared: 1, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 20, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m1'));

    await waitForScene(page, 'MapClearScene');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('fantasy-td-save')));
    expect(save.worldProgress.f1_m1).toEqual({ cleared: true, stars: 3 });
    expect(save.diamond).toBe(8);
    expect(save.campaignStats.totalStars).toBe(3);

    // Wait for animations, check "already best" text
    await page.waitForTimeout(1600);
    const texts = await getSceneTexts(page, 'MapClearScene');
    const hasAlreadyBest = texts.some(t =>
      t.includes('\uC774\uBBF8 \uCD5C\uACE0 \uAE30\uB85D') || t.includes('Already Best Record')
    );
    expect(hasAlreadyBest).toBe(true);
  });

  test('Re-clear with LOWER stars: best stars preserved, 0 diamonds', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 8, totalDiamondEarned: 8,
      worldProgress: { f1_m1: { cleared: true, stars: 3 } },
      campaignStats: { totalStars: 3, mapsCleared: 1, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    // Re-clear with 1 star
    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 1, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m1'));

    await waitForScene(page, 'MapClearScene');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('fantasy-td-save')));
    expect(save.worldProgress.f1_m1).toEqual({ cleared: true, stars: 3 }); // best preserved
    expect(save.diamond).toBe(8); // 0 earned
    expect(save.campaignStats.totalStars).toBe(3);
  });

  test('Endless unlock: 30 maps all cleared triggers endlessUnlocked', async ({ page }) => {
    const allMapIds = [
      'f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6',
      'd2_m1','d2_m2','d2_m3','d2_m4','d2_m5','d2_m6',
      't3_m1','t3_m2','t3_m3','t3_m4','t3_m5','t3_m6',
      'v4_m1','v4_m2','v4_m3','v4_m4','v4_m5','v4_m6',
      's5_m1','s5_m2','s5_m3','s5_m4','s5_m5',
    ];
    const wp = {};
    for (const id of allMapIds) {
      wp[id] = { cleared: true, stars: 1 };
    }

    await setupSaveAndReload(page, makeCleanV3Save({
      worldProgress: wp,
      campaignStats: { totalStars: 29, mapsCleared: 29, worldsCleared: 4 },
    }));
    await waitForScene(page, 'MenuScene');

    // Clear s5_m6 (30th map)
    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 1, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('s5_m6'));

    await waitForScene(page, 'MapClearScene');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('fantasy-td-save')));
    expect(save.endlessUnlocked).toBe(true);
    expect(save.worldProgress.s5_m6).toEqual({ cleared: true, stars: 1 });
    expect(save.campaignStats.mapsCleared).toBe(30);
    expect(save.campaignStats.worldsCleared).toBe(5);
  });

  test('worldsCleared updates correctly when a full world is cleared', async ({ page }) => {
    const wp = {};
    ['f1_m1','f1_m2','f1_m3','f1_m4','f1_m5'].forEach(id => {
      wp[id] = { cleared: true, stars: 2 };
    });

    await setupSaveAndReload(page, makeCleanV3Save({
      worldProgress: wp,
      campaignStats: { totalStars: 10, mapsCleared: 5, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 18, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m6'));

    await waitForScene(page, 'MapClearScene');

    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('fantasy-td-save')));
    expect(save.campaignStats.worldsCleared).toBe(1);
    expect(save.worldProgress.f1_m6).toEqual({ cleared: true, stars: 3 });
  });
});

// ── 3. WorldSelectScene Progress Tests ───────────────────────────

test.describe('WorldSelectScene Progress', () => {
  test('Forest always unlocked (requiredStars=0)', async ({ page }) => {
    await setupSaveAndReload(page, null);
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const forestInteractive = await page.evaluate(() => {
      const s = window.__game.scene.getScene('WorldSelectScene');
      const rects = s.children.list.filter(c => c.type === 'Rectangle' && c.input);
      return rects.length >= 1;
    });
    expect(forestInteractive).toBe(true);
  });

  test('Desert locked when totalStars < 9', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      worldProgress: { f1_m1: { cleared: true, stars: 1 }, f1_m2: { cleared: true, stars: 1 } },
      campaignStats: { totalStars: 2, mapsCleared: 2, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const interactivePanels = await page.evaluate(() => {
      const s = window.__game.scene.getScene('WorldSelectScene');
      return s.children.list
        .filter(c => c.type === 'Rectangle' && c.input && c.width === 320)
        .length;
    });
    expect(interactivePanels).toBe(1); // Only forest
  });

  test('Desert unlocked when totalStars >= 9', async ({ page }) => {
    const wp = {};
    ['f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6'].forEach(id => {
      wp[id] = { cleared: true, stars: 2 };
    });

    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 30, totalDiamondEarned: 30,
      worldProgress: wp,
      campaignStats: { totalStars: 12, mapsCleared: 6, worldsCleared: 1 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const interactivePanels = await page.evaluate(() => {
      const s = window.__game.scene.getScene('WorldSelectScene');
      return s.children.list
        .filter(c => c.type === 'Rectangle' && c.input && c.width === 320)
        .length;
    });
    expect(interactivePanels).toBe(2); // forest + desert
  });

  test('Star progress shows correctly from save data', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      worldProgress: {
        f1_m1: { cleared: true, stars: 3 },
        f1_m2: { cleared: true, stars: 2 },
        f1_m3: { cleared: true, stars: 1 },
      },
      campaignStats: { totalStars: 6, mapsCleared: 3, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const texts = await getSceneTexts(page, 'WorldSelectScene');
    const starTexts = texts.filter(t => t.includes('6') && t.includes('18'));
    expect(starTexts.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 4. LevelSelectScene Progress Tests ───────────────────────────

test.describe('LevelSelectScene Progress', () => {
  test('First map always unlocked even with empty save', async ({ page }) => {
    await setupSaveAndReload(page, null);
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('LevelSelectScene', { worldId: 'forest' });
    });
    await waitForScene(page, 'LevelSelectScene');

    // First map should have a START button (interactive Rectangle, width=80)
    const startButtons = await page.evaluate(() => {
      const s = window.__game.scene.getScene('LevelSelectScene');
      return s.children.list.filter(c => c.type === 'Rectangle' && c.input && c.width === 80).length;
    });
    expect(startButtons).toBe(1); // First map START button
  });

  test('Map 2 unlocked when map 1 has stars >= 1', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 3, totalDiamondEarned: 3,
      worldProgress: { f1_m1: { cleared: true, stars: 1 } },
      campaignStats: { totalStars: 1, mapsCleared: 1, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('LevelSelectScene', { worldId: 'forest' });
    });
    await waitForScene(page, 'LevelSelectScene');

    const startButtons = await page.evaluate(() => {
      const s = window.__game.scene.getScene('LevelSelectScene');
      return s.children.list
        .filter(c => c.type === 'Rectangle' && c.input && c.width === 80)
        .length;
    });
    expect(startButtons).toBe(2); // map 1 + map 2
  });

  test('Map 2 locked when map 1 not cleared', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save());
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('LevelSelectScene', { worldId: 'forest' });
    });
    await waitForScene(page, 'LevelSelectScene');

    const startButtons = await page.evaluate(() => {
      const s = window.__game.scene.getScene('LevelSelectScene');
      return s.children.list
        .filter(c => c.type === 'Rectangle' && c.input && c.width === 80)
        .length;
    });
    expect(startButtons).toBe(1); // Only map 1
  });

  test('Star display reflects save data for each map', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      worldProgress: {
        f1_m1: { cleared: true, stars: 3 },
        f1_m2: { cleared: true, stars: 1 },
      },
      campaignStats: { totalStars: 4, mapsCleared: 2, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('LevelSelectScene', { worldId: 'forest' });
    });
    await waitForScene(page, 'LevelSelectScene');

    const texts = await getSceneTexts(page, 'LevelSelectScene');
    // Map 1: 3 filled stars
    const threeStars = texts.filter(t => t === '\u2605\u2605\u2605');
    expect(threeStars.length).toBeGreaterThanOrEqual(1);
    // Map 2: 1 filled + 2 empty
    const oneStar = texts.filter(t => t === '\u2605\u2606\u2606');
    expect(oneStar.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 5. MenuScene ENDLESS Button Tests ────────────────────────────

test.describe('MenuScene ENDLESS Button', () => {
  test('ENDLESS button locked (non-interactive) when endlessUnlocked=false', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      bestRound: 10, bestKills: 50, totalGames: 3,
    }));
    await waitForScene(page, 'MenuScene');

    const endlessInfo = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MenuScene');
      const endlessRects = s.children.list.filter(c => c.type === 'Rectangle' && c.y === 435);
      if (endlessRects.length === 0) return null;
      const rect = endlessRects[0];
      return { interactive: !!rect.input, fillColor: rect.fillColor };
    });

    expect(endlessInfo).toBeTruthy();
    expect(endlessInfo.interactive).toBe(false);

    // Should have locked text (actual text: "전체 클리어 시 해금")
    const texts = await getSceneTexts(page, 'MenuScene');
    const hasLockedText = texts.some(t =>
      t.includes('\uC804\uCCB4 \uD074\uB9AC\uC5B4') || t.includes('Clear all')
    );
    expect(hasLockedText).toBe(true);
  });

  test('ENDLESS button is active when endlessUnlocked=true (BUG-1 fixed)', async ({ page }) => {
    // BUG-1 FIX: _isEndlessUnlocked() now correctly checks saveData?.endlessUnlocked === true
    await setupSaveAndReload(page, makeCleanV3Save({
      bestRound: 25, bestKills: 300, totalGames: 50,
      diamond: 100, totalDiamondEarned: 200,
      endlessUnlocked: true,
      campaignStats: { totalStars: 90, mapsCleared: 30, worldsCleared: 5 },
    }));
    await waitForScene(page, 'MenuScene');

    const endlessInfo = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MenuScene');
      const endlessRects = s.children.list.filter(c => c.type === 'Rectangle' && c.y === 435);
      if (endlessRects.length === 0) return null;
      const rect = endlessRects[0];
      return { interactive: !!rect.input, fillColor: rect.fillColor };
    });

    expect(endlessInfo).toBeTruthy();
    // After BUG-1 fix: ENDLESS button is now interactive when endlessUnlocked=true
    expect(endlessInfo.interactive).toBe(true);

    // Confirm the registry also has the correct endlessUnlocked flag
    const registryValue = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MenuScene');
      return s.registry.get('saveData')?.endlessUnlocked;
    });
    expect(registryValue).toBe(true);
  });
});

// ── 6. Persistence After Reload Tests ────────────────────────────

test.describe('Persistence After Reload', () => {
  test('WorldSelectScene preserves star counts after page reload', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 16, totalDiamondEarned: 16,
      worldProgress: {
        f1_m1: { cleared: true, stars: 3 },
        f1_m2: { cleared: true, stars: 2 },
        f1_m3: { cleared: true, stars: 3 },
      },
      campaignStats: { totalStars: 8, mapsCleared: 3, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const textsBeforeReload = await getSceneTexts(page, 'WorldSelectScene');
    const starTextBefore = textsBeforeReload.filter(t => t.includes('8') && t.includes('18'));
    expect(starTextBefore.length).toBeGreaterThanOrEqual(1);

    // Reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const textsAfterReload = await getSceneTexts(page, 'WorldSelectScene');
    const starTextAfter = textsAfterReload.filter(t => t.includes('8') && t.includes('18'));
    expect(starTextAfter.length).toBeGreaterThanOrEqual(1);
  });

  test('LevelSelectScene preserves unlock state after reload', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 3, totalDiamondEarned: 3,
      worldProgress: { f1_m1: { cleared: true, stars: 2 } },
      campaignStats: { totalStars: 2, mapsCleared: 1, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('LevelSelectScene', { worldId: 'forest' });
    });
    await waitForScene(page, 'LevelSelectScene');

    const startBtnsBefore = await page.evaluate(() => {
      const s = window.__game.scene.getScene('LevelSelectScene');
      return s.children.list.filter(c => c.type === 'Rectangle' && c.input && c.width === 80).length;
    });
    expect(startBtnsBefore).toBe(2);

    // Reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('LevelSelectScene', { worldId: 'forest' });
    });
    await waitForScene(page, 'LevelSelectScene');

    const startBtnsAfter = await page.evaluate(() => {
      const s = window.__game.scene.getScene('LevelSelectScene');
      return s.children.list.filter(c => c.type === 'Rectangle' && c.input && c.width === 80).length;
    });
    expect(startBtnsAfter).toBe(2);
  });
});

// ── 7. Edge Cases ────────────────────────────────────────────────

test.describe('Edge Cases', () => {
  test('Forest 6 maps all 1 star (total=6) does NOT unlock desert (needs 9)', async ({ page }) => {
    const wp = {};
    ['f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6'].forEach(id => {
      wp[id] = { cleared: true, stars: 1 };
    });

    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 18, totalDiamondEarned: 18,
      worldProgress: wp,
      campaignStats: { totalStars: 6, mapsCleared: 6, worldsCleared: 1 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const interactivePanels = await page.evaluate(() => {
      const s = window.__game.scene.getScene('WorldSelectScene');
      return s.children.list
        .filter(c => c.type === 'Rectangle' && c.input && c.width === 320)
        .length;
    });
    expect(interactivePanels).toBe(1); // Only forest
  });

  test('Desert unlocks at exactly 9 total stars', async ({ page }) => {
    const wp = {};
    ['f1_m1','f1_m2','f1_m3'].forEach(id => {
      wp[id] = { cleared: true, stars: 3 };
    });

    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 24, totalDiamondEarned: 24,
      worldProgress: wp,
      campaignStats: { totalStars: 9, mapsCleared: 3, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const interactivePanels = await page.evaluate(() => {
      const s = window.__game.scene.getScene('WorldSelectScene');
      return s.children.list
        .filter(c => c.type === 'Rectangle' && c.input && c.width === 320)
        .length;
    });
    expect(interactivePanels).toBe(2); // forest + desert
  });

  test('Desert locked at exactly 8 total stars (boundary)', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 21, totalDiamondEarned: 21,
      worldProgress: {
        f1_m1: { cleared: true, stars: 3 },
        f1_m2: { cleared: true, stars: 3 },
        f1_m3: { cleared: true, stars: 2 },
      },
      campaignStats: { totalStars: 8, mapsCleared: 3, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    const interactivePanels = await page.evaluate(() => {
      const s = window.__game.scene.getScene('WorldSelectScene');
      return s.children.list
        .filter(c => c.type === 'Rectangle' && c.input && c.width === 320)
        .length;
    });
    expect(interactivePanels).toBe(1); // Only forest
  });

  test('No console errors during normal flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await setupSaveAndReload(page, null);
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('WorldSelectScene').scene.start('LevelSelectScene', { worldId: 'forest' });
    });
    await waitForScene(page, 'LevelSelectScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('LevelSelectScene').scene.start('MenuScene');
    });
    await waitForScene(page, 'MenuScene');

    expect(errors).toEqual([]);
  });

  test('Corrupted localStorage (invalid JSON): graceful fallback to defaults', async ({ page }) => {
    // First navigate to the page so we're on the right origin
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Corrupt the save data
    await page.evaluate(() => {
      localStorage.setItem('fantasy-td-save', 'NOT VALID JSON{{{');
    });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForFunction(() => {
      return window.__game && window.__game.scene && window.__game.scene.scenes.length > 0;
    }, { timeout: 15000 });
    await waitForScene(page, 'MenuScene');

    const save = await page.evaluate(() => {
      return window.__game.scene.getScene('MenuScene').registry.get('saveData');
    });

    expect(save).toBeTruthy();
    expect(save.saveDataVersion).toBe(3);
    expect(save.worldProgress).toEqual({});
    expect(errors).toEqual([]);
  });

  test('MapClearScene with corrupted localStorage: graceful handling', async ({ page }) => {
    // Start with valid save
    await setupSaveAndReload(page, makeCleanV3Save());
    await waitForScene(page, 'MenuScene');

    // Corrupt localStorage before triggering MapClearScene
    await page.evaluate(() => {
      localStorage.setItem('fantasy-td-save', '{corrupt');
    });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 20, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m1'));

    await waitForScene(page, 'MapClearScene');

    expect(errors).toEqual([]);

    const save = await page.evaluate(() => {
      const raw = localStorage.getItem('fantasy-td-save');
      return raw ? JSON.parse(raw) : null;
    });
    expect(save).toBeTruthy();
    expect(save.worldProgress.f1_m1).toEqual({ cleared: true, stars: 3 });
  });
});

// ── 8. Visual Tests (Screenshots) ───────────────────────────────

test.describe('Visual Verification', () => {
  test('MenuScene with ENDLESS locked - screenshot', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      bestRound: 5, bestKills: 20, totalGames: 2,
      diamond: 5, totalDiamondEarned: 5,
    }));
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/phase4-menu-endless-locked.png' });
  });

  test('MenuScene with ENDLESS unlocked - screenshot', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      bestRound: 25, bestKills: 300, totalGames: 50,
      diamond: 100, totalDiamondEarned: 200,
      endlessUnlocked: true,
      campaignStats: { totalStars: 90, mapsCleared: 30, worldsCleared: 5 },
    }));
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/phase4-menu-endless-unlocked.png' });
  });

  test('WorldSelectScene with mixed unlock states - screenshot', async ({ page }) => {
    const wp = {};
    ['f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6'].forEach(id => {
      wp[id] = { cleared: true, stars: 2 };
    });
    ['d2_m1','d2_m2'].forEach(id => {
      wp[id] = { cleared: true, stars: 1 };
    });

    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 36, totalDiamondEarned: 36,
      worldProgress: wp,
      campaignStats: { totalStars: 14, mapsCleared: 8, worldsCleared: 1 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('WorldSelectScene');
    });
    await waitForScene(page, 'WorldSelectScene');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/phase4-world-select-mixed.png' });
  });

  test('LevelSelectScene with mixed unlock states - screenshot', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 16, totalDiamondEarned: 16,
      worldProgress: {
        f1_m1: { cleared: true, stars: 3 },
        f1_m2: { cleared: true, stars: 2 },
        f1_m3: { cleared: true, stars: 1 },
      },
      campaignStats: { totalStars: 6, mapsCleared: 3, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate(() => {
      window.__game.scene.getScene('MenuScene').scene.start('LevelSelectScene', { worldId: 'forest' });
    });
    await waitForScene(page, 'LevelSelectScene');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/phase4-level-select-mixed.png' });
  });

  test('MapClearScene with first clear (3 stars) - screenshot', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save());
    await waitForScene(page, 'MenuScene');

    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 20, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m1'));

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/phase4-map-clear-3star.png' });
  });

  test('MapClearScene with "already best" - screenshot', async ({ page }) => {
    await setupSaveAndReload(page, makeCleanV3Save({
      diamond: 8, totalDiamondEarned: 8,
      worldProgress: { f1_m1: { cleared: true, stars: 3 } },
      campaignStats: { totalStars: 3, mapsCleared: 1, worldsCleared: 0 },
    }));
    await waitForScene(page, 'MenuScene');

    await page.evaluate((mapData) => {
      window.__game.scene.getScene('MenuScene').scene.start('MapClearScene', {
        currentHP: 20, maxHP: 20, wavesCleared: 10, kills: 50, gameStats: {},
        mapData: mapData, gameMode: 'campaign',
      });
    }, makeMapData('f1_m1'));

    await waitForScene(page, 'MapClearScene');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/phase4-map-clear-already-best.png' });
  });
});
