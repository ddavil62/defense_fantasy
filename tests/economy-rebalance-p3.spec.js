// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Phase 3: Economy Rebalance QA Tests
 * INITIAL_GOLD 200 -> 160 변경 검증:
 * - config.js INITIAL_GOLD 값 확인
 * - 게임 시작 시 160G 표시
 * - 첫 뽑기(80G) 가능 여부
 * - 두 번째 뽑기(100G) 불가 확인 (160-80=80 < 100)
 * - DRAW_BASE_COST, DRAW_COST_INCREMENT 변경 없음
 * - MERGE_COST 변경 없음
 * - Gold Boost 메타 업그레이드 기존 값 유지 확인
 * - 웨이브 클리어 보상 공식 변경 없음
 * - 콘솔 에러 없음
 */

const BASE_URL = 'http://localhost:5173';

// ── Helpers ──────────────────────────────────────────────────────

async function waitForGame(page, timeout = 15000) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout });
  await page.waitForFunction(() => {
    return window.__game && window.__game.scene && window.__game.scene.scenes.length > 0;
  }, { timeout });
}

async function enterGameScene(page) {
  await waitForGame(page);
  // 세이브 데이터 초기화하여 메타 업그레이드 없는 상태 보장
  await page.evaluate(() => {
    localStorage.removeItem('fantasy-td-save');
  });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    return window.__game && window.__game.scene && window.__game.scene.scenes.length > 0;
  }, { timeout: 15000 });

  // MenuScene -> WorldMapScene -> GameScene 진입
  await page.evaluate(() => {
    const game = window.__game;
    const menuScene = game.scene.getScene('MenuScene');
    if (menuScene && menuScene.scene.isActive()) {
      menuScene.scene.start('GameScene');
    }
  });
  await page.waitForFunction(() => {
    const g = window.__game;
    if (!g) return false;
    const scene = g.scene.getScene('GameScene');
    return scene && scene.scene.isActive();
  }, { timeout: 10000 });
  await page.waitForTimeout(1000);
}

// ── Test: Config Constants ──────────────────────────────────────

test.describe('Phase 3: Economy Rebalance - Config Constants', () => {

  test('INITIAL_GOLD is exactly 160', async ({ page }) => {
    await waitForGame(page);
    const initialGold = await page.evaluate(() => {
      // config.js 모듈에서 직접 가져올 수 없으므로 GameScene을 통해 검증
      const game = window.__game;
      const scenes = game.scene.scenes;
      // config 모듈의 값은 import를 통해서만 접근 가능하므로
      // 대신 동적 import 사용
      return import('/js/config.js').then(m => m.INITIAL_GOLD);
    });
    expect(initialGold).toBe(160);
  });

  test('DRAW_BASE_COST is 80 (unchanged)', async ({ page }) => {
    await waitForGame(page);
    const value = await page.evaluate(() => {
      return import('/js/config.js').then(m => m.DRAW_BASE_COST);
    });
    expect(value).toBe(80);
  });

  test('DRAW_COST_INCREMENT is 20 (unchanged)', async ({ page }) => {
    await waitForGame(page);
    const value = await page.evaluate(() => {
      return import('/js/config.js').then(m => m.DRAW_COST_INCREMENT);
    });
    expect(value).toBe(20);
  });

  test('calcDrawCost formula is correct', async ({ page }) => {
    await waitForGame(page);
    const results = await page.evaluate(() => {
      return import('/js/config.js').then(m => ({
        cost0: m.calcDrawCost(0),   // 80
        cost1: m.calcDrawCost(1),   // 100
        cost2: m.calcDrawCost(2),   // 120
        cost5: m.calcDrawCost(5),   // 180
        cost10: m.calcDrawCost(10), // 280
      }));
    });
    expect(results.cost0).toBe(80);
    expect(results.cost1).toBe(100);
    expect(results.cost2).toBe(120);
    expect(results.cost5).toBe(180);
    expect(results.cost10).toBe(280);
  });

  test('MERGE_COST is unchanged', async ({ page }) => {
    await waitForGame(page);
    const mergeCost = await page.evaluate(() => {
      return import('/js/config.js').then(m => m.MERGE_COST);
    });
    expect(mergeCost[2]).toBe(30);
    expect(mergeCost[3]).toBe(80);
    expect(mergeCost[4]).toBe(150);
    expect(mergeCost[5]).toBe(250);
  });

  test('Gold Boost meta upgrade tiers are unchanged (275/300/350)', async ({ page }) => {
    await waitForGame(page);
    const tiers = await page.evaluate(() => {
      return import('/js/config.js').then(m => {
        const gb = m.UTILITY_UPGRADES.goldBoost;
        return gb.tiers.map(t => t.value);
      });
    });
    expect(tiers).toEqual([275, 300, 350]);
  });

  test('getMetaInitialGold returns 160 when no upgrades', async ({ page }) => {
    await waitForGame(page);
    const gold = await page.evaluate(() => {
      return import('/js/config.js').then(m => m.getMetaInitialGold({ goldBoost: 0 }));
    });
    expect(gold).toBe(160);
  });

  test('getMetaInitialGold returns correct values for each tier', async ({ page }) => {
    await waitForGame(page);
    const results = await page.evaluate(() => {
      return import('/js/config.js').then(m => ({
        t0: m.getMetaInitialGold({ goldBoost: 0 }),
        t1: m.getMetaInitialGold({ goldBoost: 1 }),
        t2: m.getMetaInitialGold({ goldBoost: 2 }),
        t3: m.getMetaInitialGold({ goldBoost: 3 }),
      }));
    });
    expect(results.t0).toBe(160);
    expect(results.t1).toBe(275);
    expect(results.t2).toBe(300);
    expect(results.t3).toBe(350);
  });

  test('getMetaInitialGold handles null/undefined gracefully', async ({ page }) => {
    await waitForGame(page);
    const results = await page.evaluate(() => {
      return import('/js/config.js').then(m => ({
        nullArg: m.getMetaInitialGold(null),
        undefinedArg: m.getMetaInitialGold(undefined),
        emptyObj: m.getMetaInitialGold({}),
      }));
    });
    expect(results.nullArg).toBe(160);
    expect(results.undefinedArg).toBe(160);
    expect(results.emptyObj).toBe(160);
  });

  test('calcWaveClearBonus formula unchanged', async ({ page }) => {
    await waitForGame(page);
    const results = await page.evaluate(() => {
      return import('/js/config.js').then(m => ({
        r1_full: m.calcWaveClearBonus(1, 20, 20),    // 1*3 + floor(20/20*8) = 3+8 = 11
        r5_half: m.calcWaveClearBonus(5, 10, 20),    // 5*3 + floor(10/20*8) = 15+4 = 19
        r10_full: m.calcWaveClearBonus(10, 20, 20),   // 10*3 + floor(20/20*8) = 30+8 = 38
      }));
    });
    expect(results.r1_full).toBe(11);
    expect(results.r5_half).toBe(19);
    expect(results.r10_full).toBe(38);
  });
});

// ── Test: In-Game Gold Verification ─────────────────────────────

test.describe('Phase 3: Economy Rebalance - In-Game', () => {

  test('game starts with 160G (no meta upgrades)', async ({ page }) => {
    await enterGameScene(page);
    const gold = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      return scene.goldManager.getGold();
    });
    expect(gold).toBe(160);
  });

  test('first draw (80G) is affordable at start', async ({ page }) => {
    await enterGameScene(page);
    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const gold = scene.goldManager.getGold();
      const drawCost = 80; // calcDrawCost(0) = 80
      return {
        gold,
        drawCost,
        canAfford: gold >= drawCost,
      };
    });
    expect(result.gold).toBe(160);
    expect(result.canAfford).toBe(true);
  });

  test('after first draw (80G spent), second draw (100G) is NOT affordable', async ({ page }) => {
    await enterGameScene(page);
    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      // Simulate spending 80G for first draw
      scene.goldManager.spend(80);
      const remainingGold = scene.goldManager.getGold();
      const secondDrawCost = 100; // calcDrawCost(1) = 100
      return {
        remainingGold,
        secondDrawCost,
        canAfford: remainingGold >= secondDrawCost,
      };
    });
    expect(result.remainingGold).toBe(80);
    expect(result.canAfford).toBe(false);
  });

  test('HUD displays 160G at game start', async ({ page }) => {
    await enterGameScene(page);
    await page.waitForTimeout(500);
    // Take screenshot to verify gold display
    await page.screenshot({
      path: 'tests/screenshots/economy-p3-initial-gold-hud.png',
    });
    // Verify via internal state since canvas text is not in DOM
    const gold = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      return scene.goldManager.getGold();
    });
    expect(gold).toBe(160);
  });

  test('draw button shows 80G cost at start', async ({ page }) => {
    await enterGameScene(page);
    const drawCount = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      return scene.towerPanel.drawCount;
    });
    expect(drawCount).toBe(0);
    // Verify the draw cost calculation
    const cost = await page.evaluate(() => {
      return import('/js/config.js').then(m => m.calcDrawCost(0));
    });
    expect(cost).toBe(80);
  });
});

// ── Test: Edge Cases ────────────────────────────────────────────

test.describe('Phase 3: Economy Rebalance - Edge Cases', () => {

  test('Gold Boost T1 (275G) - getMetaInitialGold returns 275 for tier 1', async ({ page }) => {
    await waitForGame(page);
    // Gold Boost tier 1 should give 275G starting gold
    const result = await page.evaluate(() => {
      return import('/js/config.js').then(m => {
        const gold = m.getMetaInitialGold({ goldBoost: 1 });
        // 2 draws: 80 + 100 = 180G <= 275G, leaving 95G
        // 3 draws: 80 + 100 + 120 = 300G > 275G
        return {
          gold,
          canAfford2: gold >= 180,
          canAfford3: gold >= 300,
          afterTwoDraws: gold - 180,
        };
      });
    });
    expect(result.gold).toBe(275);
    expect(result.canAfford2).toBe(true);
    expect(result.canAfford3).toBe(false);
    expect(result.afterTwoDraws).toBe(95);
  });

  test('Gold Boost T3 (350G) allows 3 draws exactly with 50G leftover', async ({ page }) => {
    await waitForGame(page);
    const result = await page.evaluate(() => {
      return import('/js/config.js').then(m => {
        const gold = m.getMetaInitialGold({ goldBoost: 3 });
        // 3 draws: 80+100+120 = 300G <= 350G, leaving 50G
        // 4 draws: 80+100+120+140 = 440G > 350G
        return {
          gold,
          canAfford3: gold >= 300,
          canAfford4: gold >= 440,
          afterThreeDraws: gold - 300,
        };
      });
    });
    expect(result.gold).toBe(350);
    expect(result.canAfford3).toBe(true);
    expect(result.canAfford4).toBe(false);
    expect(result.afterThreeDraws).toBe(50);
  });

  test('Gold Boost T1 in-game: GameScene starts with 275G', async ({ page }) => {
    await waitForGame(page);
    // Set registry saveData with goldBoost tier 1 and start GameScene
    await page.evaluate(() => {
      const game = window.__game;
      const saveData = game.registry.get('saveData') || {};
      saveData.utilityUpgrades = saveData.utilityUpgrades || { baseHp: 0, goldBoost: 0, waveBonus: 0 };
      saveData.utilityUpgrades.goldBoost = 1;
      game.registry.set('saveData', saveData);
    });
    await page.evaluate(() => {
      const game = window.__game;
      const activeScenes = game.scene.scenes.filter(s => s.scene.isActive());
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('GameScene');
      }
    });
    await page.waitForFunction(() => {
      const g = window.__game;
      if (!g) return false;
      const scene = g.scene.getScene('GameScene');
      return scene && scene.scene.isActive();
    }, { timeout: 10000 });
    await page.waitForTimeout(1000);
    const gold = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      return scene.goldManager.getGold();
    });
    expect(gold).toBe(275);
  });

  test('enemy gold rewards are unchanged', async ({ page }) => {
    await waitForGame(page);
    const enemyGold = await page.evaluate(() => {
      return import('/js/config.js').then(m => {
        const stats = m.ENEMY_STATS;
        return {
          normal: stats.normal.gold,
          fast: stats.fast.gold,
          tank: stats.tank.gold,
          boss: stats.boss.gold,
          swarm: stats.swarm.gold,
          splitter: stats.splitter.gold,
          armored: stats.armored.gold,
          boss_armored: stats.boss_armored.gold,
        };
      });
    });
    expect(enemyGold.normal).toBe(5);
    expect(enemyGold.fast).toBe(3);
    expect(enemyGold.tank).toBe(15);
    expect(enemyGold.boss).toBe(100);
    expect(enemyGold.swarm).toBe(2);
    expect(enemyGold.splitter).toBe(12);
    expect(enemyGold.armored).toBe(20);
    expect(enemyGold.boss_armored).toBe(150);
  });

  test('no console errors during game initialization', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await enterGameScene(page);
    expect(errors).toEqual([]);
  });

  test('multiple game restarts maintain 160G starting gold', async ({ page }) => {
    // First game
    await enterGameScene(page);
    let gold = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      return scene.goldManager.getGold();
    });
    expect(gold).toBe(160);

    // Spend some gold
    await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      scene.goldManager.spend(50);
    });

    // Restart game - go back to menu and re-enter
    await page.evaluate(() => {
      const game = window.__game;
      const gameScene = game.scene.getScene('GameScene');
      if (gameScene && gameScene.scene.isActive()) {
        gameScene.scene.start('MenuScene');
      }
    });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const game = window.__game;
      const menuScene = game.scene.getScene('MenuScene');
      if (menuScene && menuScene.scene.isActive()) {
        menuScene.scene.start('GameScene');
      }
    });
    await page.waitForFunction(() => {
      const g = window.__game;
      if (!g) return false;
      const scene = g.scene.getScene('GameScene');
      return scene && scene.scene.isActive();
    }, { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Second game should start with 160G again
    gold = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      return scene.goldManager.getGold();
    });
    expect(gold).toBe(160);
  });
});

// ── Test: Screenshot Verification ───────────────────────────────

test.describe('Phase 3: Economy Rebalance - Visual', () => {

  test('capture game start state for visual verification', async ({ page }) => {
    await enterGameScene(page);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/economy-p3-game-start.png',
    });
  });

  test('capture draw button state', async ({ page }) => {
    await enterGameScene(page);
    await page.waitForTimeout(500);
    // Capture the bottom panel area where draw button is
    await page.screenshot({
      path: 'tests/screenshots/economy-p3-draw-button.png',
      clip: { x: 0, y: 480, width: 360, height: 160 },
    });
  });
});
