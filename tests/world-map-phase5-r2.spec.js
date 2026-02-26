// @ts-check
import { test, expect } from '@playwright/test';

/**
 * World Map Phase 5 R2 QA Tests
 * FAIL-1: EndlessMapSelectScene.js 생성 확인
 * FAIL-2: main.js 등록 확인
 * FAIL-3: GameScene fadeIn(300) 확인
 * + 추가 예외/엣지케이스 검증
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

function makeFullClearSave() {
  const ALL_MAP_IDS = [
    'f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6',
    'd2_m1','d2_m2','d2_m3','d2_m4','d2_m5','d2_m6',
    't3_m1','t3_m2','t3_m3','t3_m4','t3_m5','t3_m6',
    'v4_m1','v4_m2','v4_m3','v4_m4','v4_m5','v4_m6',
    's5_m1','s5_m2','s5_m3','s5_m4','s5_m5','s5_m6',
  ];
  const campaignStars = {};
  const worldProgress = {};
  for (const id of ALL_MAP_IDS) {
    campaignStars[id] = 2;
    worldProgress[id] = { cleared: true, stars: 2 };
  }
  return makeCleanV3Save({
    campaignStars,
    worldProgress,
    endlessUnlocked: true,
    campaignStats: { totalStars: 60, mapsCleared: 30, worldsCleared: 5 },
  });
}

async function clickCanvasAt(page, gameX, gameY) {
  const canvas = await page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  const scaleX = box.width / 360;
  const scaleY = box.height / 640;
  await page.mouse.click(
    box.x + (gameX * scaleX),
    box.y + (gameY * scaleY)
  );
}

// ── FAIL-1 재검증: EndlessMapSelectScene.js 존재 및 씬 등록 ──

test.describe('R2 FAIL-1: EndlessMapSelectScene 존재', () => {
  test('EndlessMapSelectScene이 씬 목록에 등록되어 있다', async ({ page }) => {
    await waitForGame(page);
    await waitForScene(page, 'MenuScene');

    const sceneExists = await page.evaluate(() => {
      const g = window.__game;
      if (!g) return false;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      return scene !== null && scene !== undefined;
    });

    expect(sceneExists).toBe(true);
  });

  test('EndlessMapSelectScene의 씬 키가 올바르다', async ({ page }) => {
    await waitForGame(page);

    const sceneKey = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      return scene ? scene.scene.key : null;
    });

    expect(sceneKey).toBe('EndlessMapSelectScene');
  });
});

// ── FAIL-2 재검증: main.js scene 배열 등록 ──

test.describe('R2 FAIL-2: main.js 씬 등록', () => {
  test('Phaser Game에 EndlessMapSelectScene이 포함된 올바른 씬 수가 등록되어 있다', async ({ page }) => {
    await waitForGame(page);

    const result = await page.evaluate(() => {
      const g = window.__game;
      if (!g) return { count: 0, keys: [] };
      const keys = g.scene.scenes.map(s => s.scene.key);
      return {
        count: keys.length,
        keys: keys,
        hasEndless: keys.includes('EndlessMapSelectScene'),
      };
    });

    // 11개 씬: Boot, Menu, WorldSelect, LevelSelect, Game, GameOver, MapClear,
    // Collection, Stats, MergeCodex, EndlessMapSelect
    expect(result.count).toBe(11);
    expect(result.hasEndless).toBe(true);
    expect(result.keys).toContain('EndlessMapSelectScene');
  });
});

// ── FAIL-3 재검증: GameScene fadeIn(300) ──

test.describe('R2 FAIL-3: GameScene fadeIn', () => {
  test('GameScene.create() 소스에 fadeIn 호출이 포함되어 있다', async ({ page }) => {
    await waitForGame(page);

    const hasFadeIn = await page.evaluate(() => {
      const g = window.__game;
      const gs = g.scene.getScene('GameScene');
      if (!gs) return false;
      const src = gs.create.toString();
      return src.includes('fadeIn');
    });

    expect(hasFadeIn).toBe(true);
  });

  test('GameScene.create() 소스에 fadeIn(300, 0, 0, 0) 패턴이 있다', async ({ page }) => {
    await waitForGame(page);

    const fadeInPattern = await page.evaluate(() => {
      const g = window.__game;
      const gs = g.scene.getScene('GameScene');
      if (!gs) return null;
      const src = gs.create.toString();
      // fadeIn(300 패턴 확인
      const match = src.match(/fadeIn\s*\(\s*300/);
      return match ? match[0] : null;
    });

    expect(fadeInPattern).not.toBeNull();
  });
});

// ── 기존 통과 항목 유지 검증: ENDLESS 해금 ──

test.describe('R2 기존: ENDLESS 해금 조건', () => {
  test('미클리어 시 ENDLESS 비활성', async ({ page }) => {
    const save = makeCleanV3Save();
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
      if (!btnBg) return { found: true, interactive: false };

      return {
        found: true,
        interactive: btnBg.input && btnBg.input.enabled,
      };
    });

    expect(endlessState.found).toBe(true);
    expect(endlessState.interactive).toBeFalsy();
  });

  test('전체 클리어 시 ENDLESS 활성', async ({ page }) => {
    const save = makeFullClearSave();
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
      if (!btnBg) return { found: true, interactive: false };

      return {
        found: true,
        interactive: btnBg.input && btnBg.input.enabled,
      };
    });

    expect(endlessState.found).toBe(true);
    expect(endlessState.interactive).toBeTruthy();
  });
});

// ── ENDLESS 클릭 후 EndlessMapSelectScene 진입 검증 ──

test.describe('R2 신규: ENDLESS 버튼 -> EndlessMapSelectScene 진입', () => {
  test('ENDLESS 활성 상태에서 클릭 시 EndlessMapSelectScene으로 전환된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const save = makeFullClearSave();
    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    // ENDLESS 버튼 Y 위치 찾기
    const btnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      return endlessText ? endlessText.y : null;
    });

    expect(btnY).not.toBeNull();

    // ENDLESS 버튼 클릭
    await clickCanvasAt(page, 180, btnY);

    // fadeOut(200) + 씬 전환 대기
    await waitForScene(page, 'EndlessMapSelectScene', 5000);

    const isActive = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      return scene && scene.scene.isActive();
    });

    expect(isActive).toBe(true);
    expect(errors).toEqual([]);

    await page.screenshot({ path: 'tests/screenshots/phase5-r2-endless-map-select.png' });
  });

  test('EndlessMapSelectScene에서 콘솔 에러 없이 렌더링된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const save = makeFullClearSave();
    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    const btnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      return endlessText ? endlessText.y : null;
    });

    await clickCanvasAt(page, 180, btnY);
    await waitForScene(page, 'EndlessMapSelectScene', 5000);
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });
});

// ── EndlessMapSelectScene 탭 전환 검증 ──

test.describe('R2 신규: EndlessMapSelectScene 탭 UI', () => {
  test.beforeEach(async ({ page }) => {
    const save = makeFullClearSave();
    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    const btnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      return endlessText ? endlessText.y : null;
    });

    await clickCanvasAt(page, 180, btnY);
    await waitForScene(page, 'EndlessMapSelectScene', 5000);
  });

  test('6개 탭이 존재한다 (CLASSIC, F, D, T, V, S)', async ({ page }) => {
    const tabInfo = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      if (!scene || !scene._tabElements) return { count: 0 };
      return {
        count: scene._tabElements.length,
      };
    });

    expect(tabInfo.count).toBe(6);
  });

  test('초기 탭은 CLASSIC이다', async ({ page }) => {
    const activeTab = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      return scene ? scene._activeTab : null;
    });

    expect(activeTab).toBe('classic');
  });

  test('탭 전환 시 카드가 재렌더링된다 (forest 탭)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // forest 탭 클릭 (두번째 탭)
    const tabPositions = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      if (!scene || !scene._tabElements) return [];
      return scene._tabElements.map(el => ({ x: el.bg.x, y: el.bg.y }));
    });

    expect(tabPositions.length).toBe(6);

    // forest 탭(인덱스 1) 클릭
    await clickCanvasAt(page, tabPositions[1].x, tabPositions[1].y);
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      return {
        activeTab: scene._activeTab,
        cardCount: scene._cardObjects.length,
      };
    });

    expect(result.activeTab).toBe('forest');
    // 6개 맵 * (카드배경 + 맵번호 + 맵이름 + 설명 + 웨이브 + START배경 + START텍스트) = 42+ 오브젝트
    expect(result.cardCount).toBeGreaterThan(0);
    expect(errors).toEqual([]);

    await page.screenshot({ path: 'tests/screenshots/phase5-r2-forest-tab.png' });
  });

  test('모든 탭 순회 시 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const tabPositions = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      if (!scene || !scene._tabElements) return [];
      return scene._tabElements.map(el => ({ x: el.bg.x, y: el.bg.y }));
    });

    // 모든 탭 순회
    const tabIds = ['classic', 'forest', 'desert', 'tundra', 'volcano', 'shadow'];
    for (let i = 0; i < tabPositions.length; i++) {
      await clickCanvasAt(page, tabPositions[i].x, tabPositions[i].y);
      await page.waitForTimeout(300);

      const activeTab = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScene('EndlessMapSelectScene');
        return scene ? scene._activeTab : null;
      });

      expect(activeTab).toBe(tabIds[i]);
    }

    expect(errors).toEqual([]);
  });

  test('같은 탭 연타 시 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const tabPositions = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      if (!scene || !scene._tabElements) return [];
      return scene._tabElements.map(el => ({ x: el.bg.x, y: el.bg.y }));
    });

    // 같은 탭(classic)을 5번 연타
    for (let i = 0; i < 5; i++) {
      await clickCanvasAt(page, tabPositions[0].x, tabPositions[0].y);
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});

// ── EndlessMapSelectScene 뒤로가기 검증 ──

test.describe('R2 신규: EndlessMapSelectScene 뒤로가기', () => {
  test('뒤로가기 버튼 클릭 시 MenuScene으로 돌아간다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const save = makeFullClearSave();
    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    // ENDLESS 진입
    const endlessBtnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      return endlessText ? endlessText.y : null;
    });

    await clickCanvasAt(page, 180, endlessBtnY);
    await waitForScene(page, 'EndlessMapSelectScene', 5000);

    // 뒤로가기 버튼 클릭 (좌측 상단, 약 x=30, y=25)
    await clickCanvasAt(page, 30, 25);

    // fadeOut(200) + 씬 전환 대기
    await waitForScene(page, 'MenuScene', 5000);

    const isMenuActive = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      return menu && menu.scene.isActive();
    });

    expect(isMenuActive).toBe(true);
    expect(errors).toEqual([]);
  });
});

// ── EndlessMapSelectScene fadeIn 확인 ──

test.describe('R2 신규: EndlessMapSelectScene fadeIn', () => {
  test('EndlessMapSelectScene.create()에 fadeIn(300) 호출이 있다', async ({ page }) => {
    await waitForGame(page);

    const hasFadeIn = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      if (!scene) return false;
      const src = scene.create.toString();
      return src.includes('fadeIn') && src.includes('300');
    });

    expect(hasFadeIn).toBe(true);
  });
});

// ── i18n 키 확인 ──

test.describe('R2 신규: i18n 키 확인', () => {
  test('EndlessMapSelectScene 진입 후 CLASSIC 탭에서 클래식 맵 텍스트가 표시된다', async ({ page }) => {
    const save = makeFullClearSave();
    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    const btnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      return endlessText ? endlessText.y : null;
    });

    await clickCanvasAt(page, 180, btnY);
    await waitForScene(page, 'EndlessMapSelectScene', 5000);

    // EndlessMapSelectScene에서 텍스트 확인
    const textInfo = await page.evaluate(() => {
      const g = window.__game;
      const scene = g.scene.getScene('EndlessMapSelectScene');
      if (!scene) return { found: false };
      const texts = scene.children.list
        .filter(c => c.type === 'Text')
        .map(t => t.text);
      return {
        found: true,
        texts: texts,
        // i18n 키가 정상 번역되었는지 확인 (ko 또는 en)
        hasMapSelectTitle: texts.some(t => t.includes('엔드리스') || t.includes('Endless')),
        hasClassicMap: texts.some(t => t.includes('클래식') || t.includes('Classic')),
      };
    });

    expect(textInfo.found).toBe(true);
    expect(textInfo.hasMapSelectTitle).toBe(true);
    expect(textInfo.hasClassicMap).toBe(true);
  });
});

// ── 콘솔 에러 종합 ──

test.describe('R2 콘솔 에러 종합', () => {
  test('빈 세이브로 메뉴 로드 시 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await setupSaveAndReload(page, null);
    await waitForScene(page, 'MenuScene');
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });

  test('전체 클리어 세이브로 ENDLESS 진입 후 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const save = makeFullClearSave();
    await setupSaveAndReload(page, save);
    await waitForScene(page, 'MenuScene');

    const btnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const endlessText = texts.find(t => t.text && t.text.toUpperCase().includes('ENDLESS'));
      return endlessText ? endlessText.y : null;
    });

    if (btnY !== null) {
      await clickCanvasAt(page, 180, btnY);
      await waitForScene(page, 'EndlessMapSelectScene', 5000);
      await page.waitForTimeout(1000);
    }

    expect(errors).toEqual([]);
  });
});

// ── 씬 전환 페이드 (기존 통과 항목 유지) ──

test.describe('R2 기존: 씬 전환 페이드아웃', () => {
  test('CAMPAIGN 클릭 시 WorldSelectScene으로 전환', async ({ page }) => {
    await waitForGame(page);
    await waitForScene(page, 'MenuScene');

    const btnY = await page.evaluate(() => {
      const g = window.__game;
      const menu = g.scene.getScene('MenuScene');
      const texts = menu.children.list.filter(c => c.type === 'Text');
      const campaignText = texts.find(t => t.text && t.text.toUpperCase().includes('CAMPAIGN'));
      return campaignText ? campaignText.y : null;
    });

    if (btnY !== null) {
      await clickCanvasAt(page, 180, btnY);
    }

    await waitForScene(page, 'WorldSelectScene', 5000);

    const isActive = await page.evaluate(() => {
      const g = window.__game;
      const ws = g.scene.getScene('WorldSelectScene');
      return ws && ws.scene.isActive();
    });

    expect(isActive).toBe(true);
  });
});
