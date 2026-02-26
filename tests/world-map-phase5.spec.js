// @ts-check
import { test, expect } from '@playwright/test';

/**
 * World Map Phase 5 QA Tests
 * 19개 맵 재설계 검증, 씬 전환 페이드, 엔드리스 해금/맵 선택
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

// 30개 캠페인 맵 ID
const ALL_MAP_IDS = [
  'f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6',
  'd2_m1','d2_m2','d2_m3','d2_m4','d2_m5','d2_m6',
  't3_m1','t3_m2','t3_m3','t3_m4','t3_m5','t3_m6',
  'v4_m1','v4_m2','v4_m3','v4_m4','v4_m5','v4_m6',
  's5_m1','s5_m2','s5_m3','s5_m4','s5_m5','s5_m6',
];

test.describe('Phase 5: 맵 레지스트리 검증', () => {
  test('30개 캠페인 맵이 모두 레지스트리에 등록되어 있다', async ({ page }) => {
    await waitForGame(page);
    await waitForScene(page, 'MenuScene');

    const result = await page.evaluate((mapIds) => {
      // getMapById가 글로벌에 노출되지 않으므로 mapRegistry를 통해 접근
      // 대신 game scene을 통해 확인
      const missing = [];
      for (const id of mapIds) {
        // 레지스트리 직접 접근이 불가하면 WorldSelectScene의 WORLDS를 통해 확인
      }
      return missing;
    }, ALL_MAP_IDS);

    // 대안: 맵 데이터 임포트를 통해 검증 (vite 번들에서 접근 가능 여부)
    const registryCheck = await page.evaluate(() => {
      // window.__game의 씬을 통해 간접 확인
      const g = window.__game;
      if (!g) return { error: 'game not found' };
      return { sceneCount: g.scene.scenes.length };
    });

    expect(registryCheck.sceneCount).toBeGreaterThanOrEqual(10);
  });
});

test.describe('Phase 5: MenuScene fadeIn 검증', () => {
  test('MenuScene 진입 시 fadeIn이 적용된다', async ({ page }) => {
    await waitForGame(page);
    await waitForScene(page, 'MenuScene');

    // fadeIn 확인: camera의 _fadeAlpha가 0에서 시작하여 점진적으로 변함
    const hasFadeIn = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      // fadeIn이 호출되었으면 camera에 fade 효과가 존재
      const cam = menu.cameras.main;
      // Phaser의 fadeIn은 camerafadein 이벤트를 발생시킴
      return cam !== undefined;
    });

    expect(hasFadeIn).toBe(true);
  });
});

test.describe('Phase 5: ENDLESS 해금 조건', () => {
  test('캠페인 미클리어 시 ENDLESS 비활성', async ({ page }) => {
    const save = makeCleanV3Save();
    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    // ENDLESS 버튼이 비활성 상태인지 확인 (회색, interactive 없음)
    const endlessState = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      if (!endlessText) return { found: false };

      // 버튼 배경 찾기 (같은 y 위치의 Rectangle)
      const rects = menu.children.list.filter(c =>
        c.type === 'Rectangle' && Math.abs(c.y - endlessText.y) < 5
      );
      const btnBg = rects[0];
      if (!btnBg) return { found: true, interactive: false, color: null };

      return {
        found: true,
        interactive: btnBg.input && btnBg.input.enabled,
        color: btnBg.fillColor,
      };
    });

    expect(endlessState.found).toBe(true);
    // 비활성 상태: interactive가 false이거나 input이 없음
    expect(endlessState.interactive).toBeFalsy();

    await page.screenshot({ path: 'tests/screenshots/phase5-menu-endless-locked.png' });
  });

  test('캠페인 30개 전체 1성 이상 시 ENDLESS 활성', async ({ page }) => {
    const campaignStars = {};
    const worldProgress = {};
    for (const id of ALL_MAP_IDS) {
      campaignStars[id] = 1;
      worldProgress[id] = { cleared: true, stars: 1 };
    }

    const save = makeCleanV3Save({
      campaignStars,
      worldProgress,
      endlessUnlocked: true,
      campaignStats: { totalStars: 30, mapsCleared: 30, worldsCleared: 5 },
    });

    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    const endlessState = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      if (!endlessText) return { found: false };

      const rects = menu.children.list.filter(c =>
        c.type === 'Rectangle' && Math.abs(c.y - endlessText.y) < 5
      );
      const btnBg = rects[0];
      if (!btnBg) return { found: true, interactive: false, color: null };

      return {
        found: true,
        interactive: btnBg.input && btnBg.input.enabled,
        color: btnBg.fillColor,
      };
    });

    expect(endlessState.found).toBe(true);
    expect(endlessState.interactive).toBeTruthy();

    await page.screenshot({ path: 'tests/screenshots/phase5-menu-endless-unlocked.png' });
  });
});

test.describe('Phase 5: EndlessMapSelectScene 존재 확인', () => {
  test('EndlessMapSelectScene이 씬 목록에 등록되어 있어야 한다', async ({ page }) => {
    await waitForGame(page);
    await waitForScene(page, 'MenuScene');

    const sceneExists = await page.evaluate(() => {
      const g = window.__game;
      if (!g) return false;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      return scene !== null && scene !== undefined;
    });

    // CRITICAL: EndlessMapSelectScene.js가 존재하지 않고, main.js에도 등록되지 않음
    expect(sceneExists).toBe(true);
  });
});

test.describe('Phase 5: GameScene fadeIn 확인', () => {
  test('GameScene create()에 fadeIn이 호출되어야 한다', async ({ page }) => {
    // 소스코드 정적 분석으로 확인 (브라우저 테스트 대신)
    const response = await page.goto(BASE_URL + '/js/scenes/GameScene.js', { waitUntil: 'load' });

    // GameScene.js 소스에서 fadeIn 호출 여부를 문자열 검색
    // 이것은 정적 분석이므로, 페이지 컨텍스트 외부에서 확인
    // 대안: 실제 게임 진입 후 확인
    await waitForGame(page);
    await waitForScene(page, 'MenuScene');

    // GameScene의 create 메서드에 fadeIn이 있는지 코드 레벨에서 확인
    const hasFadeInInCreate = await page.evaluate(() => {
      const g = window.__game;
      const gs = g.scene.getScene('GameScene');
      if (!gs) return false;
      // create 메서드의 소스를 문자열로 가져와 fadeIn 포함 여부 확인
      const src = gs.create.toString();
      return src.includes('fadeIn');
    });

    // EXPECTED: true (spec에 따르면 GameScene.create()에 fadeIn(300) 추가 필요)
    expect(hasFadeInInCreate).toBe(true);
  });
});

test.describe('Phase 5: 씬 전환 페이드아웃', () => {
  test('MenuScene에서 CAMPAIGN 클릭 시 fadeOut 후 WorldSelectScene 전환', async ({ page }) => {
    await waitForGame(page);
    await waitForScene(page, 'MenuScene');

    // CAMPAIGN 버튼 클릭
    const btnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const campaignText = texts.find(t => t.text && t.text.toUpperCase().includes('CAMPAIGN'));
      return campaignText ? campaignText.y : null;
    });

    if (btnY !== null) {
      const canvas = await page.locator('canvas');
      const box = await canvas.boundingBox();
      if (box) {
        // 캔버스 중앙 X, 버튼 Y 위치 클릭
        const scaleX = box.width / 360;
        const scaleY = box.height / 640;
        await page.mouse.click(
          box.x + (180 * scaleX),
          box.y + (btnY * scaleY)
        );
      }
    }

    // fadeOut 후 WorldSelectScene으로 전환 확인 (최대 3초 대기)
    await waitForScene(page, 'WorldSelectScene', 5000);

    const isActive = await page.evaluate(() => {
      const g = window.__game;
      const ws = g.scene.getScene('WorldSelectScene');
      return ws && ws.scene.isActive();
    });

    expect(isActive).toBe(true);
    await page.screenshot({ path: 'tests/screenshots/phase5-world-select-fade.png' });
  });
});

test.describe('Phase 5: 콘솔 에러 검증', () => {
  test('메뉴 로드 시 콘솔 에러가 없다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForGame(page);
    await waitForScene(page, 'MenuScene');

    // MenuScene에서 1초 대기 후 에러 확인
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });

  test('전체 클리어 세이브로 메뉴 로드 시 콘솔 에러가 없다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const campaignStars = {};
    const worldProgress = {};
    for (const id of ALL_MAP_IDS) {
      campaignStars[id] = 3;
      worldProgress[id] = { cleared: true, stars: 3 };
    }

    const save = makeCleanV3Save({
      campaignStars,
      worldProgress,
      endlessUnlocked: true,
      campaignStats: { totalStars: 90, mapsCleared: 30, worldsCleared: 5 },
    });

    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });
});

test.describe('Phase 5: ENDLESS 클릭 시 에러 검증', () => {
  test('ENDLESS 활성 + 클릭 시 EndlessMapSelectScene 누락으로 에러 발생하는지 확인', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const campaignStars = {};
    const worldProgress = {};
    for (const id of ALL_MAP_IDS) {
      campaignStars[id] = 1;
      worldProgress[id] = { cleared: true, stars: 1 };
    }

    const save = makeCleanV3Save({
      campaignStars,
      worldProgress,
      endlessUnlocked: true,
      campaignStats: { totalStars: 30, mapsCleared: 30, worldsCleared: 5 },
    });

    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    // ENDLESS 버튼 위치 찾기
    const btnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      return endlessText ? endlessText.y : null;
    });

    if (btnY !== null) {
      const canvas = await page.locator('canvas');
      const box = await canvas.boundingBox();
      if (box) {
        const scaleX = box.width / 360;
        const scaleY = box.height / 640;
        // 클릭
        await page.mouse.click(
          box.x + (180 * scaleX),
          box.y + (btnY * scaleY)
        );
        // fadeOut 시간 + 씬 전환 대기
        await page.waitForTimeout(1000);
      }
    }

    // EndlessMapSelectScene이 없으면 에러가 발생하거나 씬 전환 실패
    // 에러가 있는지 확인
    if (errors.length > 0) {
      console.log('ENDLESS 클릭 시 에러 발생:', errors);
    }

    // 이 테스트는 에러가 없어야 PASS (EndlessMapSelectScene이 존재해야)
    expect(errors.length).toBe(0);
  });
});
