// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Sell Button Reposition QA Tests
 * TowerInfoOverlay의 Sell 버튼을 패널 하단 고정 배치하는 수정 검증
 *
 * 핵심 사실: 모든 T1 타워(archer, mage, ice 등)는 합성 재료로 사용되므로
 * canEnhance()가 false를 반환한다. 강화 버튼이 표시되려면 canEnhance를
 * 강제로 true로 오버라이드하거나, 합성 재료로 사용되지 않는 타워를 사용해야 한다.
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

async function waitForScene(page, sceneKey, timeout = 10000) {
  await page.waitForFunction((key) => {
    const g = window.__game;
    if (!g) return false;
    const scene = g.scene.getScene(key);
    return scene && scene.scene.isActive();
  }, sceneKey, { timeout });
  await page.waitForTimeout(500);
}

async function enterGameScene(page) {
  await waitForGame(page);
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

async function placeTowerViaEval(page, towerType = 'archer') {
  return page.evaluate((type) => {
    const scene = window.__game.scene.getScene('GameScene');
    if (!scene) return { success: false, error: 'no scene' };
    let col, row;
    const GRID_COLS = 9, GRID_ROWS = 12;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (scene.mapManager.isBuildable(c, r)) {
          col = c; row = r;
          break;
        }
      }
      if (col !== undefined) break;
    }
    if (col === undefined) return { success: false, error: 'no buildable cell' };
    scene.goldManager.gold = 10000;
    if (scene.hud) scene.hud.updateGold(10000);
    scene.towerPanel.selectedTowerType = type;
    scene._attemptPlaceTower(type, col, row);
    const placed = scene.towers.find(t => t.col === col && t.row === row);
    return { success: !!placed, towerCount: scene.towers.length, col, row };
  }, towerType);
}

async function enterGameAndPlaceTower(page, towerType = 'archer') {
  await enterGameScene(page);
  return await placeTowerViaEval(page, towerType);
}

async function selectTowerInGame(page, towerIndex = 0) {
  const result = await page.evaluate((idx) => {
    const gs = window.__game.scene.getScene('GameScene');
    if (!gs || !gs.towers || !gs.towers[idx]) {
      return { success: false, error: 'no tower at index ' + idx };
    }
    gs._selectPlacedTower(gs.towers[idx]);
    return { success: true, type: gs.towers[idx].mergeId || gs.towers[idx].type };
  }, towerIndex);
  await page.waitForTimeout(500);
  return result;
}

async function enterMergeCodex(page) {
  await waitForGame(page);
  await page.evaluate(() => {
    const g = window.__game;
    const activeScenes = g.scene.getScenes(true);
    if (activeScenes.length > 0) {
      activeScenes[0].scene.start('MergeCodexScene', { fromScene: 'CollectionScene' });
    }
  });
  await waitForScene(page, 'MergeCodexScene');
}

async function openCodexOverlay(page, tier, index = 0) {
  await page.evaluate(({ t, i }) => {
    const s = window.__game.scene.getScene('MergeCodexScene');
    const entry = s._tierDataCache[t][i];
    s._showCodexCardOverlay(entry);
  }, { t: tier, i: index });
  await page.waitForTimeout(500);
}

/**
 * 타워의 canEnhance를 강제로 true로 오버라이드한다.
 * T1 타워는 모두 합성 재료이므로 기본적으로 canEnhance=false이다.
 */
async function forceEnhanceable(page, towerIndex = 0) {
  await page.evaluate((idx) => {
    const gs = window.__game.scene.getScene('GameScene');
    const tower = gs.towers[idx];
    tower.canEnhance = () => true;
    tower.getEnhanceCost = () => 100; // 고정 비용
  }, towerIndex);
}


// ══════════════════════════════════════════════════════════════════
// AC-1: 강화 가능 타워 - Enhance 콘텐츠 직하단, Sell 패널 하단 고정
// ══════════════════════════════════════════════════════════════════

test.describe('AC-1: 강화 가능 타워 Sell 버튼 고정 배치', () => {

  test('Enhance 버튼은 콘텐츠 직하단, Sell 버튼은 패널 하단 고정 Y에 배치된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);
    await forceEnhanceable(page, 0);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const container = overlay._container;
      const allTexts = container.list.filter(c => c.type === 'Text');
      const sellTextObj = allTexts.find(t => t.text.includes('Sell'));
      const enhTextObj = allTexts.find(t => t.text.includes('\u2b06'));

      const GAME_HEIGHT = 640;
      const panelY = GAME_HEIGHT / 2;
      const actionH = 90;
      const panelH = 540 + actionH;
      const NS_BOTTOM = 44;
      const sellBtnH = 32;
      const expectedSellY = panelY + panelH / 2 - NS_BOTTOM - sellBtnH / 2 - 8;

      return {
        sellExists: !!sellTextObj,
        sellY: sellTextObj ? sellTextObj.y : null,
        enhExists: !!enhTextObj,
        enhY: enhTextObj ? enhTextObj.y : null,
        expectedSellY,
        sellYMatchesExpected: sellTextObj ? Math.abs(sellTextObj.y - expectedSellY) < 1 : false,
      };
    });

    expect(result.sellExists).toBe(true);
    expect(result.enhExists).toBe(true);
    expect(result.sellYMatchesExpected).toBe(true);
    // Sell 버튼은 Enhance 버튼보다 아래에 있어야 한다
    expect(result.sellY).toBeGreaterThan(result.enhY);
    expect(errors).toEqual([]);
  });

  test('Enhance 버튼과 Sell 버튼 사이에 충분한 간격이 있다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await forceEnhanceable(page, 0);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const container = overlay._container;
      const allTexts = container.list.filter(c => c.type === 'Text');
      const enhTextObj = allTexts.find(t => t.text.includes('\u2b06'));
      const sellTextObj = allTexts.find(t => t.text.includes('Sell'));

      if (!enhTextObj || !sellTextObj) return { error: 'buttons not found', enhExists: !!enhTextObj, sellExists: !!sellTextObj };

      const gap = sellTextObj.y - enhTextObj.y;
      const enhBtnH = 32;
      const sellBtnH = 32;
      const enhBottom = enhTextObj.y + enhBtnH / 2;
      const sellTop = sellTextObj.y - sellBtnH / 2;
      const clearGap = sellTop - enhBottom;

      return {
        enhY: enhTextObj.y,
        sellY: sellTextObj.y,
        gap,
        clearGap,
        noOverlap: clearGap > 0,
        gapSufficient: clearGap >= 16,
      };
    });

    expect(result.noOverlap).toBe(true);
    expect(result.gapSufficient).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-2: 최대 강화 타워 - "최대 강화" 텍스트 위치 유지, Sell 패널 하단
// ══════════════════════════════════════════════════════════════════

test.describe('AC-2: 최대 강화 타워 Sell 버튼 고정 배치', () => {

  test('최대 강화 도달 시 텍스트는 콘텐츠 직하단, Sell은 패널 하단 고정', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);

    // 타워를 최대 강화 레벨로 설정 (canEnhance는 false가 됨)
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 10; // MAX_ENHANCE_LEVEL
      // canEnhance()는 enhanceLevel < 10이 false이므로 자동으로 false
    });

    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const container = overlay._container;
      const allTexts = container.list.filter(c => c.type === 'Text');
      const maxEnhTextObj = allTexts.find(t => t.text.includes('\u2b50'));
      const sellTextObj = allTexts.find(t => t.text.includes('Sell'));
      const enhBtnTextObj = allTexts.find(t => t.text.includes('\u2b06'));

      const GAME_HEIGHT = 640;
      const panelY = GAME_HEIGHT / 2;
      const panelH = 540 + 90;
      const NS_BOTTOM = 44;
      const sellBtnH = 32;
      const expectedSellY = panelY + panelH / 2 - NS_BOTTOM - sellBtnH / 2 - 8;

      return {
        maxEnhExists: !!maxEnhTextObj,
        maxEnhY: maxEnhTextObj ? maxEnhTextObj.y : null,
        sellExists: !!sellTextObj,
        sellY: sellTextObj ? sellTextObj.y : null,
        enhBtnExists: !!enhBtnTextObj,
        expectedSellY,
        sellYMatchesExpected: sellTextObj ? Math.abs(sellTextObj.y - expectedSellY) < 1 : false,
        sellBelowMaxEnh: (sellTextObj && maxEnhTextObj) ? sellTextObj.y > maxEnhTextObj.y : false,
      };
    });

    // 최대 강화 텍스트 표시 여부: archer는 isUsedAsMergeIngredient=true이므로
    // info.canEnhance=false && info.enhanceLevel=10 >= MAX_ENHANCE_LEVEL
    // 조건: !info.canEnhance && info.enhanceLevel >= MAX_ENHANCE_LEVEL => true
    expect(result.maxEnhExists).toBe(true);
    expect(result.sellExists).toBe(true);
    expect(result.enhBtnExists).toBe(false);
    expect(result.sellYMatchesExpected).toBe(true);
    expect(result.sellBelowMaxEnh).toBe(true);
    expect(errors).toEqual([]);
  });

  test('최대 강화 텍스트와 Sell 버튼 사이에 충분한 간격이 있다', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 10;
    });

    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const allTexts = overlay._container.list.filter(c => c.type === 'Text');
      const maxEnhText = allTexts.find(t => t.text.includes('\u2b50'));
      const sellText = allTexts.find(t => t.text.includes('Sell'));

      if (!maxEnhText || !sellText) return { error: 'texts not found' };

      const gap = sellText.y - maxEnhText.y;
      return {
        maxEnhY: maxEnhText.y,
        sellY: sellText.y,
        gap,
        noOverlap: gap > 24,
      };
    });

    expect(result.noOverlap).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-3: 기본 T1 타워 (합성 재료 = 강화 불가) - Sell만 패널 하단 고정
// ══════════════════════════════════════════════════════════════════

test.describe('AC-3: 기본 T1 타워 (강화 불가) Sell만 표시', () => {

  test('합성 재료인 T1 타워에서 Sell만 패널 하단 고정 위치에 표시된다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const container = overlay._container;
      const allTexts = container.list.filter(c => c.type === 'Text');
      const sellTextObj = allTexts.find(t => t.text.includes('Sell'));
      const enhTextObj = allTexts.find(t => t.text.includes('\u2b06'));
      const maxEnhTextObj = allTexts.find(t => t.text.includes('\u2b50'));

      const GAME_HEIGHT = 640;
      const panelY = GAME_HEIGHT / 2;
      const panelH = 540 + 90;
      const NS_BOTTOM = 44;
      const sellBtnH = 32;
      const expectedSellY = panelY + panelH / 2 - NS_BOTTOM - sellBtnH / 2 - 8;

      return {
        sellExists: !!sellTextObj,
        sellY: sellTextObj ? sellTextObj.y : null,
        enhBtnExists: !!enhTextObj,
        maxEnhExists: !!maxEnhTextObj,
        expectedSellY,
        sellYMatchesExpected: sellTextObj ? Math.abs(sellTextObj.y - expectedSellY) < 1 : false,
      };
    });

    // archer는 합성 재료이므로 canEnhance=false, enhanceLevel=0 => 강화 불가, 최대 강화도 아님
    expect(result.sellExists).toBe(true);
    expect(result.enhBtnExists).toBe(false);
    expect(result.maxEnhExists).toBe(false);
    expect(result.sellYMatchesExpected).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-4: codex 모드 - Sell 버튼 없음, 영향 없음
// ══════════════════════════════════════════════════════════════════

test.describe('AC-4: codex 모드 영향 없음', () => {

  test('codex 모드에서는 Sell 버튼이 표시되지 않는다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterMergeCodex(page);
    await openCodexOverlay(page, 1, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const container = overlay._container;
      const allTexts = container.list.filter(c => c.type === 'Text');
      const sellTextObj = allTexts.find(t => t.text.includes('Sell'));
      const enhTextObj = allTexts.find(t => t.text.includes('\u2b06'));

      return {
        sellExists: !!sellTextObj,
        enhExists: !!enhTextObj,
        mode: overlay.mode,
      };
    });

    expect(result.mode).toBe('codex');
    expect(result.sellExists).toBe(false);
    expect(result.enhExists).toBe(false);
    expect(errors).toEqual([]);
  });

  test('codex T2+ 오버레이에도 Sell 버튼이 없다', async ({ page }) => {
    await enterMergeCodex(page);

    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s.codexTier = 2;
      s.codexScrollY = 0;
      s._buildSubTabs();
      s._buildCodexContent();
    });
    await page.waitForTimeout(300);

    await openCodexOverlay(page, 2, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const allTexts = overlay._container.list.filter(c => c.type === 'Text');
      return {
        sellExists: allTexts.some(t => t.text.includes('Sell')),
      };
    });

    expect(result.sellExists).toBe(false);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-5: Sell 버튼 클릭 동작 정상 확인
// ══════════════════════════════════════════════════════════════════

test.describe('AC-5: Sell 버튼 클릭 동작', () => {

  test('Sell 버튼 클릭 시 onSell 콜백 호출 및 오버레이 닫기', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const beforeCount = await page.evaluate(() => {
      return window.__game.scene.getScene('GameScene').towers.length;
    });

    // onSell 콜백을 통해 판매 수행
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      gs._onTowerSell(tower);
    });
    await page.waitForTimeout(300);

    const afterState = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        towerCount: gs.towers.length,
        overlayOpen: gs.towerPanel.towerInfoOverlay.isOpen(),
      };
    });

    expect(afterState.towerCount).toBe(beforeCount - 1);
    expect(afterState.overlayOpen).toBe(false);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-6: Enhance 버튼 클릭 동작 정상 확인 (강화 가능 타워)
// ══════════════════════════════════════════════════════════════════

test.describe('AC-6: Enhance 버튼 클릭 동작', () => {

  test('강화 가능 타워에서 Enhance 콜백 호출이 정상 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);

    // 골드를 충분히 설정하고 canEnhance 오버라이드
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.goldManager.gold = 99999;
      if (gs.hud) gs.hud.updateGold(99999);
      const tower = gs.towers[0];
      // canEnhance를 강제로 true 반환 (합성 재료 제한 우회)
      tower.canEnhance = () => tower.enhanceLevel < 10;
    });

    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      const prevLevel = tower.enhanceLevel;

      // 강화 수행 (canEnhance 오버라이드 상태이므로 성공해야 함)
      gs._onTowerEnhance(tower);

      return {
        prevLevel,
        newLevel: tower.enhanceLevel,
        enhanced: tower.enhanceLevel > prevLevel,
      };
    });

    expect(result.enhanced).toBe(true);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// sellY 계산 정확성 검증
// ══════════════════════════════════════════════════════════════════

test.describe('sellY 계산 정확성', () => {

  test('sellY 공식이 올바르게 계산된다 (panelY + panelH/2 - NS_BOTTOM - sellBtnH/2 - 8)', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const allTexts = overlay._container.list.filter(c => c.type === 'Text');
      const sellText = allTexts.find(t => t.text.includes('Sell'));

      // 직접 계산
      const GAME_HEIGHT = 640;
      const panelY = GAME_HEIGHT / 2; // 320
      const actionH = 90;
      const panelH = 540 + actionH; // 630
      const NS_BOTTOM = 44;
      const sellBtnH = 32;
      const expectedSellY = panelY + panelH / 2 - NS_BOTTOM - sellBtnH / 2 - 8;
      // = 320 + 315 - 44 - 16 - 8 = 567

      return {
        actualSellY: sellText ? sellText.y : null,
        expectedSellY,
        panelY,
        panelH,
        panelBottom: panelY + panelH / 2,
        exactMatch: sellText ? sellText.y === expectedSellY : false,
      };
    });

    expect(result.expectedSellY).toBe(567);
    expect(result.exactMatch).toBe(true);
  });

  test('sell 버튼 배경(Rectangle/Image)과 sell 텍스트가 동일한 Y 좌표를 사용한다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const container = overlay._container;
      const allTexts = container.list.filter(c => c.type === 'Text');
      const sellText = allTexts.find(t => t.text.includes('Sell'));

      // Sell 버튼 배경 찾기: sellText 직전의 interactive 요소
      const sellTextIdx = container.list.indexOf(sellText);
      let sellBtnBg = null;
      for (let i = sellTextIdx - 1; i >= 0; i--) {
        const obj = container.list[i];
        if ((obj.type === 'Rectangle' || obj.type === 'Image') && obj.input) {
          sellBtnBg = obj;
          break;
        }
      }

      return {
        sellTextY: sellText ? sellText.y : null,
        sellBtnBgY: sellBtnBg ? sellBtnBg.y : null,
        yMatch: sellText && sellBtnBg ? sellText.y === sellBtnBg.y : false,
      };
    });

    expect(result.yMatch).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// 다양한 T1 타워 타입에서 일관된 sellY
// ══════════════════════════════════════════════════════════════════

test.describe('다양한 타워 타입에서 일관된 Sell Y', () => {

  test('서로 다른 T1 타워 타입에서 Sell Y가 동일하다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.goldManager.gold = 99999;
      if (gs.hud) gs.hud.updateGold(99999);
    });

    // 유효한 T1 타워 타입만 사용
    const towerTypes = ['archer', 'mage', 'ice'];
    const sellYValues = [];

    for (const type of towerTypes) {
      const placed = await placeTowerViaEval(page, type);
      if (!placed.success) continue;

      const towerIdx = await page.evaluate(() => {
        return window.__game.scene.getScene('GameScene').towers.length - 1;
      });

      await selectTowerInGame(page, towerIdx);

      const sellY = await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        const overlay = gs.towerPanel.towerInfoOverlay;
        if (!overlay._container) return null;
        const allTexts = overlay._container.list.filter(c => c.type === 'Text');
        const sellText = allTexts.find(t => t.text.includes('Sell'));
        return sellText ? sellText.y : null;
      });

      if (sellY !== null) {
        sellYValues.push({ type, sellY });
      }

      await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        gs.towerPanel.towerInfoOverlay._forceClose();
      });
      await page.waitForTimeout(200);
    }

    // 모든 Sell Y가 동일해야 한다
    expect(sellYValues.length).toBeGreaterThanOrEqual(2);
    const firstY = sellYValues[0].sellY;
    for (const { type, sellY } of sellYValues) {
      expect(sellY).toBe(firstY);
    }

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// codex 모드에서 panelH 계산 안전성
// ══════════════════════════════════════════════════════════════════

test.describe('codex 모드에서 panelH 계산 안전성', () => {

  test('codex 모드에서 actionH=0으로 패널이 정상 렌더링된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterMergeCodex(page);
    await openCodexOverlay(page, 1, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const container = overlay._container;
      const textCount = container.list.filter(c => c.type === 'Text').length;

      return {
        isOpen: overlay.isOpen(),
        textCount,
        hasContent: textCount > 0,
      };
    });

    expect(result.isOpen).toBe(true);
    expect(result.hasContent).toBe(true);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 드릴다운 시 Sell 버튼 표시/숨김
// ══════════════════════════════════════════════════════════════════

test.describe('드릴다운 시 Sell 버튼 동작', () => {

  test('드릴다운 상태에서는 Sell 버튼이 표시되지 않는다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const drilled = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      const currentEntry = overlay._buildEntryFromTower(gs.towers[0]);
      const usedIn = overlay._findUsedInRecipes(currentEntry.id);
      if (usedIn.length > 0) {
        overlay._history.push(currentEntry);
        overlay._render(usedIn[0].resultEntry);
        return true;
      }
      return false;
    });

    if (drilled) {
      await page.waitForTimeout(300);

      const result = await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        const overlay = gs.towerPanel.towerInfoOverlay;
        if (!overlay._container) return { error: 'no container' };

        const allTexts = overlay._container.list.filter(c => c.type === 'Text');
        return {
          hasSell: allTexts.some(t => t.text.includes('Sell')),
          hasEnhance: allTexts.some(t => t.text.includes('\u2b06')),
          historyLen: overlay._history.length,
        };
      });

      expect(result.hasSell).toBe(false);
      expect(result.hasEnhance).toBe(false);
      expect(result.historyLen).toBeGreaterThan(0);
    }
  });

  test('드릴다운 후 뒤로가기하면 Sell 버튼이 패널 하단 고정 위치에 복원된다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const drilled = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      const currentEntry = overlay._buildEntryFromTower(gs.towers[0]);
      const usedIn = overlay._findUsedInRecipes(currentEntry.id);
      if (usedIn.length > 0) {
        overlay._history.push(currentEntry);
        overlay._render(usedIn[0].resultEntry);
        return true;
      }
      return false;
    });

    if (drilled) {
      await page.waitForTimeout(200);

      // 뒤로가기
      await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        gs.towerPanel.towerInfoOverlay._handleBack();
      });
      await page.waitForTimeout(300);

      const result = await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        const overlay = gs.towerPanel.towerInfoOverlay;
        if (!overlay._container) return { error: 'no container' };

        const allTexts = overlay._container.list.filter(c => c.type === 'Text');
        const sellText = allTexts.find(t => t.text.includes('Sell'));

        const GAME_HEIGHT = 640;
        const panelY = GAME_HEIGHT / 2;
        const panelH = 540 + 90;
        const NS_BOTTOM = 44;
        const sellBtnH = 32;
        const expectedSellY = panelY + panelH / 2 - NS_BOTTOM - sellBtnH / 2 - 8;

        return {
          hasSell: !!sellText,
          sellY: sellText ? sellText.y : null,
          expectedSellY,
          sellYCorrect: sellText ? Math.abs(sellText.y - expectedSellY) < 1 : false,
        };
      });

      expect(result.hasSell).toBe(true);
      expect(result.sellYCorrect).toBe(true);
    }
  });
});


// ══════════════════════════════════════════════════════════════════
// Sell 버튼 패널 경계 검증
// ══════════════════════════════════════════════════════════════════

test.describe('Sell 버튼 패널 경계 검증', () => {

  test('Sell 버튼이 패널의 NineSlice 경계 안에 위치한다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const allTexts = overlay._container.list.filter(c => c.type === 'Text');
      const sellText = allTexts.find(t => t.text.includes('Sell'));
      if (!sellText) return { error: 'no sell text' };

      const GAME_HEIGHT = 640;
      const panelY = GAME_HEIGHT / 2;
      const panelH = 540 + 90;
      const panelTop = panelY - panelH / 2;
      const panelBottom = panelY + panelH / 2;
      const NS_BOTTOM = 44;
      const NS_TOP = 48;
      const sellBtnH = 32;

      const sellBtnTop = sellText.y - sellBtnH / 2;
      const sellBtnBottom = sellText.y + sellBtnH / 2;

      return {
        sellY: sellText.y,
        panelTop,
        panelBottom,
        sellBtnTop,
        sellBtnBottom,
        innerTop: panelTop + NS_TOP,
        innerBottom: panelBottom - NS_BOTTOM,
        isWithinPanel: sellBtnTop > panelTop && sellBtnBottom < panelBottom,
      };
    });

    expect(result.isWithinPanel).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// 콘솔 에러 검증
// ══════════════════════════════════════════════════════════════════

test.describe('콘솔 에러 검증', () => {

  test('타워 오버레이 열기/닫기 5회 반복 시 콘솔 에러가 없다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);

    for (let i = 0; i < 5; i++) {
      await selectTowerInGame(page, 0);
      await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        gs.towerPanel.towerInfoOverlay._forceClose();
      });
      await page.waitForTimeout(200);
    }

    expect(errors).toEqual([]);
  });

  test('강화 레벨 0/1/5/10 각각에서 오버레이에서 콘솔 에러가 없다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);

    for (const level of [0, 1, 5, 10]) {
      await page.evaluate((lv) => {
        const gs = window.__game.scene.getScene('GameScene');
        const tower = gs.towers[0];
        tower.enhanceLevel = lv;
      }, level);

      await selectTowerInGame(page, 0);
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        gs.towerPanel.towerInfoOverlay._forceClose();
      });
      await page.waitForTimeout(200);
    }

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 시각적 검증 (스크린샷)
// ══════════════════════════════════════════════════════════════════

test.describe('시각적 검증: Sell 버튼 위치', () => {

  test('T1 타워 (기본, 강화 불가) - Sell만 하단 고정', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/sell-reposition-t1-default.png'
    });
  });

  test('T1 타워 (강화 가능 오버라이드) - Enhance + Sell 하단 고정', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await forceEnhanceable(page, 0);
    await selectTowerInGame(page, 0);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/sell-reposition-t1-enhanceable.png'
    });
  });

  test('T1 타워 (최대 강화) - 최대강화 텍스트 + Sell 하단 고정', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 10;
    });

    await selectTowerInGame(page, 0);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/sell-reposition-t1-maxenhance.png'
    });
  });

  test('codex 모드 - Sell 없음 확인', async ({ page }) => {
    await enterMergeCodex(page);
    await openCodexOverlay(page, 1, 0);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/sell-reposition-codex-no-sell.png'
    });
  });

  test('드릴다운 상태 - Sell 숨김 확인', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      const currentEntry = overlay._buildEntryFromTower(gs.towers[0]);
      const usedIn = overlay._findUsedInRecipes(currentEntry.id);
      if (usedIn.length > 0) {
        overlay._history.push(currentEntry);
        overlay._render(usedIn[0].resultEntry);
      }
    });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/sell-reposition-drilldown-hidden.png'
    });
  });
});
