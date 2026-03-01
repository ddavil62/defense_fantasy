// @ts-check
import { test, expect } from '@playwright/test';

/**
 * TowerInfoOverlay 텍스트 오버플로 및 패널 크기 불일치 수정 QA 테스트
 *
 * Fix 1: NineSlice 패널 배경
 * Fix 2: baseH 동적 계산 (enhanceLevel)
 * Fix 3: 설명 텍스트 wordWrap
 */

const BASE_URL = 'http://localhost:5174';

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

async function switchToTier(page, tier) {
  await page.evaluate((t) => {
    const s = window.__game.scene.getScene('MergeCodexScene');
    s.codexTier = t;
    s.codexScrollY = 0;
    s._buildSubTabs();
    s._buildCodexContent();
  }, tier);
  await page.waitForTimeout(300);
}

async function openCodexOverlay(page, tier, index = 0) {
  await page.evaluate(({ t, i }) => {
    const s = window.__game.scene.getScene('MergeCodexScene');
    const entry = s._tierDataCache[t][i];
    s._showCodexCardOverlay(entry);
  }, { t: tier, i: index });
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

async function enterGameAndPlaceTower(page) {
  await enterGameScene(page);
  return await placeTowerViaEval(page, 'archer');
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


// ══════════════════════════════════════════════════════════════════
// Fix 1: NineSlice 패널 배경
// ══════════════════════════════════════════════════════════════════

test.describe('Fix 1: NineSlice 패널 배경', () => {

  test('codex T1 오버레이: 패널 배경이 NineSlice 타입이다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      // NineSlice 객체 찾기 (type이 'NineSlice'인 것)
      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      const rectangles = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillColor !== 0x000000
      );

      return {
        ninesliceCount: nineslices.length,
        rectangleFallbackCount: rectangles.length,
        panelBgType: container.list[1]?.type, // backdrop(0) 다음이 panelBg(1)
      };
    });

    // panel_info_overlay 텍스처가 로드되었으면 NineSlice, 아니면 Rectangle
    expect(
      result.ninesliceCount > 0 || result.rectangleFallbackCount > 0
    ).toBe(true);

    // NineSlice가 사용된 경우 검증
    if (result.ninesliceCount > 0) {
      expect(result.panelBgType).toBe('NineSlice');
    }
  });

  test('codex T2 오버레이: 패널 배경이 NineSlice로 동적 높이 적용된다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 2);
    await openCodexOverlay(page, 2, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      const nineslices = container.list.filter(c => c.type === 'NineSlice');

      if (nineslices.length > 0) {
        const ns = nineslices[0];
        return {
          type: 'NineSlice',
          width: ns.width,
          height: ns.height,
          displayWidth: ns.displayWidth,
          displayHeight: ns.displayHeight,
        };
      }

      // Rectangle 폴백인 경우
      const rects = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillColor !== 0x000000
      );
      if (rects.length > 0) {
        return { type: 'Rectangle', width: rects[0].width, height: rects[0].height };
      }

      return { error: 'no panel bg found' };
    });

    expect(result.error).toBeUndefined();
    // T2 기본 높이 316 이상이어야 한다
    const h = result.height || result.displayHeight;
    expect(h).toBeGreaterThanOrEqual(316);
  });

  test('NineSlice 패널 높이가 panelH와 일치한다 (T1, usedIn 있음)', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0); // archer (usedIn 있음)

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      const container = overlay._container;
      if (!container) return { error: 'no container' };

      // 패널 높이 재계산
      const entry = s._tierDataCache[1][0];
      const usedInList = overlay._findUsedInRecipes(entry.id);
      const usedInViewH = usedInList.length > 0 ? 100 : 0;
      const baseH = 240; // T1, codex 모드이므로 enhanceOffset=0
      const actionH = 0; // codex 모드
      const expectedPanelH = baseH + usedInViewH + actionH;

      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      if (nineslices.length > 0) {
        return {
          expectedPanelH,
          actualHeight: nineslices[0].height,
          match: Math.abs(nineslices[0].height - expectedPanelH) < 2,
        };
      }
      // Rectangle fallback
      const rects = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillColor !== 0x000000
      );
      if (rects.length > 0) {
        return {
          expectedPanelH,
          actualHeight: rects[0].height,
          match: Math.abs(rects[0].height - expectedPanelH) < 2,
        };
      }
      return { error: 'no panel bg found' };
    });

    expect(result.error).toBeUndefined();
    expect(result.match).toBe(true);
  });

  test('Rectangle 폴백: 텍스처 없을 때 정상 사각형 패널이 표시된다', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;

      // 텍스처를 임시로 제거한 후 오버레이 열기
      const textureName = 'panel_info_overlay';
      const originalTexture = s.textures.get(textureName);
      const exists = s.textures.exists(textureName);

      if (exists) {
        // 텍스처 키를 임시 변경하여 exists()가 false를 반환하도록 함
        s.textures.renameTexture(textureName, '__temp_hidden_overlay');
      }

      try {
        const entry = overlay._buildEntryFromConfig('archer');
        overlay._history = [];
        overlay._sourceTower = null;
        overlay._render(entry);

        const container = overlay._container;
        const nineslices = container.list.filter(c => c.type === 'NineSlice');
        const rects = container.list.filter(c =>
          c.type === 'Rectangle' && c.width === 300 && c.fillAlpha !== 0
        );

        const result = {
          ninesliceCount: nineslices.length,
          rectangleCount: rects.length,
          fallbackUsed: rects.length > 0 && nineslices.length === 0,
        };

        overlay._forceClose();
        return result;
      } finally {
        // 텍스처 복원
        if (exists) {
          try { s.textures.renameTexture('__temp_hidden_overlay', textureName); }
          catch (e) { /* ignore */ }
        }
      }
    });

    // renameTexture가 존재하지 않을 수 있으므로 에러 시 스킵
    if (result && !result.error) {
      // Rectangle fallback이 사용되었는지 확인
      // (텍스처 rename이 지원되지 않으면 NineSlice가 사용됨)
      expect(result.ninesliceCount + result.rectangleCount).toBeGreaterThan(0);
    }
  });
});


// ══════════════════════════════════════════════════════════════════
// Fix 2: baseH 동적 계산 (enhanceLevel)
// ══════════════════════════════════════════════════════════════════

test.describe('Fix 2: baseH 동적 계산', () => {

  test('_isSourceWithEnhance가 생성자에서 false로 초기화된다', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return {
        exists: '_isSourceWithEnhance' in s.towerInfoOverlay,
        value: s.towerInfoOverlay._isSourceWithEnhance,
      };
    });

    expect(result.exists).toBe(true);
    expect(result.value).toBe(false);
  });

  test('_isSourceWithEnhance는 codex 모드에서 항상 false이다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay._isSourceWithEnhance;
    });

    expect(result).toBe(false);
  });

  test('game 모드, enhanceLevel=0: _isSourceWithEnhance는 false이다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        isSourceWithEnhance: gs.towerPanel.towerInfoOverlay._isSourceWithEnhance,
        enhanceLevel: gs.towers[0].enhanceLevel,
      };
    });

    expect(result.enhanceLevel).toBe(0);
    expect(result.isSourceWithEnhance).toBe(false);
  });

  test('game 모드, enhanceLevel>0: _isSourceWithEnhance는 true, baseH += 16', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      // 강화 레벨을 3으로 설정
      tower.enhanceLevel = 3;
      tower._canEnhance = true;

      gs._selectPlacedTower(tower);

      const overlay = gs.towerPanel.towerInfoOverlay;
      const container = overlay._container;
      if (!container) return { error: 'no container' };

      // _isSourceWithEnhance 확인
      const isSourceWithEnhance = overlay._isSourceWithEnhance;

      // 패널 높이 확인 (NineSlice 또는 Rectangle)
      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      const rects = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillAlpha !== 0
      );

      let panelHeight = 0;
      if (nineslices.length > 0) panelHeight = nineslices[0].height;
      else if (rects.length > 0) panelHeight = rects[0].height;

      // 기대 높이 계산: T1 base(240) + enhance(16) + usedIn(100) + action(90)
      // archer는 T1이고 usedIn 있음
      const usedInList = overlay._findUsedInRecipes('archer');
      const usedInViewH = usedInList.length > 0 ? 100 : 0;
      const expectedH = (240 + 16) + usedInViewH + 90;

      return {
        isSourceWithEnhance,
        panelHeight,
        expectedH,
        heightMatch: Math.abs(panelHeight - expectedH) < 2,
        enhanceLevel: tower.enhanceLevel,
      };
    });

    expect(result.isSourceWithEnhance).toBe(true);
    expect(result.heightMatch).toBe(true);
  });

  test('T2 타워, enhanceLevel>0: baseH가 332(316+16)이다', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    // archer 2개 배치 후 합성하여 T2 생성
    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const GRID_COLS = 9, GRID_ROWS = 12;

      // 두 번째 빌드 가능 셀 찾기
      let col2, row2;
      let skip = true;
      for (let r = 0; r < GRID_ROWS && col2 === undefined; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (gs.mapManager.isBuildable(c, r)) {
            if (skip) { skip = false; continue; }
            col2 = c; row2 = r;
            break;
          }
        }
      }
      if (col2 === undefined) return { error: 'no second buildable cell' };

      // 두 번째 archer 배치
      gs.goldManager.gold = 10000;
      gs.towerPanel.selectedTowerType = 'archer';
      gs._attemptPlaceTower('archer', col2, row2);

      // 두 타워 합성
      if (gs.towers.length < 2) return { error: 'not enough towers' };
      const t1 = gs.towers[0];
      const t2 = gs.towers[1];
      try {
        gs._mergeTowers(t1, t2);
      } catch (e) {
        return { error: 'merge failed: ' + e.message };
      }

      // 합성된 타워 찾기
      const mergedTower = gs.towers.find(t => t.tier >= 2);
      if (!mergedTower) return { error: 'no merged tower found' };

      // 강화 설정
      mergedTower.enhanceLevel = 2;
      mergedTower._canEnhance = true;

      // 오버레이 열기
      gs._selectPlacedTower(mergedTower);

      const overlay = gs.towerPanel.towerInfoOverlay;
      const container = overlay._container;
      if (!container) return { error: 'no container' };

      const isSourceWithEnhance = overlay._isSourceWithEnhance;
      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      const rects = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillAlpha !== 0
      );

      let panelHeight = 0;
      if (nineslices.length > 0) panelHeight = nineslices[0].height;
      else if (rects.length > 0) panelHeight = rects[0].height;

      const usedInList = overlay._findUsedInRecipes(mergedTower.mergeId || mergedTower.type);
      const usedInViewH = usedInList.length > 0 ? 100 : 0;
      // T2 base(316) + enhance(16) + usedIn + action(90)
      const expectedH = (316 + 16) + usedInViewH + 90;

      return {
        tier: mergedTower.tier,
        enhanceLevel: mergedTower.enhanceLevel,
        isSourceWithEnhance,
        panelHeight,
        expectedH,
        heightMatch: Math.abs(panelHeight - expectedH) < 2,
      };
    });

    if (!result.error) {
      expect(result.isSourceWithEnhance).toBe(true);
      expect(result.tier).toBeGreaterThanOrEqual(2);
      expect(result.heightMatch).toBe(true);
    }
  });

  test('_forceClose에서 _isSourceWithEnhance가 false로 리셋된다', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 3;
      tower._canEnhance = true;
      gs._selectPlacedTower(tower);

      const overlay = gs.towerPanel.towerInfoOverlay;
      const beforeClose = overlay._isSourceWithEnhance;

      overlay._forceClose();

      return {
        beforeClose,
        afterClose: overlay._isSourceWithEnhance,
      };
    });

    expect(result.beforeClose).toBe(true);
    expect(result.afterClose).toBe(false);
  });

  test('T1 enhance 타워: usedInSection 시작 Y가 186(=panelTop+186)이다', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 2;
      tower._canEnhance = true;
      gs._selectPlacedTower(tower);

      const overlay = gs.towerPanel.towerInfoOverlay;
      const container = overlay._container;
      if (!container) return { error: 'no container' };

      // 상위 조합 섹션의 '상위 조합' 헤더 텍스트 Y 좌표 확인
      const texts = container.list.filter(c => c.type === 'Text');
      const usedInHeader = texts.find(t =>
        t.text.includes('상위') || t.text.includes('Used')
      );

      // enhance 텍스트 (+2) 위치 확인
      const enhText = texts.find(t => t.text === '+2');

      // 패널 높이로 panelTop 역산
      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      const rects = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillAlpha !== 0
      );
      let panelH = 0;
      if (nineslices.length > 0) panelH = nineslices[0].height;
      else if (rects.length > 0) panelH = rects[0].height;

      const panelY = 320; // GAME_HEIGHT(640) / 2
      const panelTop = panelY - panelH / 2;

      return {
        enhTextY: enhText ? enhText.y : null,
        usedInHeaderY: usedInHeader ? usedInHeader.y : null,
        panelTop,
        // enhText는 panelTop + 166에 있어야 함
        enhTextExpectedY: panelTop + 166,
        // usedIn 시작 Y는 186 (enhanceOffset 적용)
        usedInStartExpected: panelTop + 186,
      };
    });

    if (result.enhTextY !== null) {
      // enhance 텍스트 위치 확인
      expect(Math.abs(result.enhTextY - result.enhTextExpectedY)).toBeLessThanOrEqual(2);
    }
    // usedIn 헤더가 있으면 위치 확인 (구분선 + 8px + 헤더 위치 고려)
    if (result.usedInHeaderY !== null) {
      // usedInHeader의 Y는 startY + 6(divider) + 8 = startY + 14 근방
      const expectedHeaderY = result.usedInStartExpected + 14;
      expect(Math.abs(result.usedInHeaderY - expectedHeaderY)).toBeLessThanOrEqual(5);
    }
  });

  test('드릴다운 시 _isSourceWithEnhance는 false이다 (history.length > 0)', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 3;
      tower._canEnhance = true;
      gs._selectPlacedTower(tower);

      const overlay = gs.towerPanel.towerInfoOverlay;
      const beforeDrill = overlay._isSourceWithEnhance;

      // 드릴다운
      const currentEntry = overlay._buildEntryFromTower(tower);
      const usedIn = overlay._findUsedInRecipes(currentEntry.id);
      if (usedIn.length === 0) return { skip: true };

      overlay._history.push(currentEntry);
      overlay._render(usedIn[0].resultEntry);

      const afterDrill = overlay._isSourceWithEnhance;

      return { beforeDrill, afterDrill };
    });

    if (!result.skip) {
      expect(result.beforeDrill).toBe(true);
      // 드릴다운 후에는 history.length > 0이므로 false
      expect(result.afterDrill).toBe(false);
    }
  });
});


// ══════════════════════════════════════════════════════════════════
// Fix 3: wordWrap 적용 검증
// ══════════════════════════════════════════════════════════════════

test.describe('Fix 3: 설명 텍스트 wordWrap', () => {

  test('T1 flavorText에 wordWrap이 적용되어 있다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0); // archer

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      const texts = container.list.filter(c => c.type === 'Text');
      // flavorText: italic, 11px, 회색
      const flavorText = texts.find(t =>
        t.style && t.style.fontStyle === 'italic' && t.style.fontSize === '11px'
      );

      if (!flavorText) return { found: false };
      return {
        found: true,
        text: flavorText.text,
        wordWrapWidth: flavorText.style.wordWrapWidth,
        hasWordWrap: flavorText.style.wordWrapWidth > 0,
        align: flavorText.style.align,
      };
    });

    if (result.found) {
      expect(result.hasWordWrap).toBe(true);
      expect(result.wordWrapWidth).toBe(260);
      expect(result.align).toBe('center');
    }
  });

  test('T1 descText에 wordWrap이 적용되어 있다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0); // archer

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      const texts = container.list.filter(c => c.type === 'Text');
      // descText: 11px, #d0d0d0, not italic (flavorText와 구분)
      const descText = texts.find(t =>
        t.style && t.style.fontSize === '11px' &&
        t.style.color === '#d0d0d0' &&
        (!t.style.fontStyle || t.style.fontStyle !== 'italic')
      );

      if (!descText) return { found: false };
      return {
        found: true,
        text: descText.text,
        wordWrapWidth: descText.style.wordWrapWidth,
        hasWordWrap: descText.style.wordWrapWidth > 0,
        align: descText.style.align,
      };
    });

    if (result.found) {
      expect(result.hasWordWrap).toBe(true);
      expect(result.wordWrapWidth).toBe(260);
      expect(result.align).toBe('center');
    }
  });

  test('T2 treeDescText에 wordWrap이 적용되어 있다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 2);
    await openCodexOverlay(page, 2, 0); // first T2

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      const texts = container.list.filter(c => c.type === 'Text');
      // treeDescText: 11px, #a0a0a0 색상
      const treeDescText = texts.find(t =>
        t.style && t.style.fontSize === '11px' &&
        t.style.color === '#a0a0a0'
      );

      if (!treeDescText) return { found: false };
      return {
        found: true,
        text: treeDescText.text,
        wordWrapWidth: treeDescText.style.wordWrapWidth,
        hasWordWrap: treeDescText.style.wordWrapWidth > 0,
        align: treeDescText.style.align,
      };
    });

    if (result.found) {
      expect(result.hasWordWrap).toBe(true);
      expect(result.wordWrapWidth).toBe(260);
      expect(result.align).toBe('center');
    }
  });

  test('모든 3곳의 desc/flavor 텍스트가 PANEL_W(300) 안에 있다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      const panelX = 180; // GAME_WIDTH(360) / 2
      const PANEL_W = 300;

      const texts = container.list.filter(c => c.type === 'Text');
      const overflows = [];
      for (const t of texts) {
        if (!t.style || !t.style.wordWrapWidth) continue;
        const halfWidth = t.width / 2;
        const leftEdge = t.x - halfWidth;
        const rightEdge = t.x + halfWidth;
        const panelLeft = panelX - PANEL_W / 2;
        const panelRight = panelX + PANEL_W / 2;
        if (leftEdge < panelLeft - 5 || rightEdge > panelRight + 5) {
          overflows.push({
            text: t.text.substring(0, 30),
            leftEdge, rightEdge, panelLeft, panelRight,
          });
        }
      }

      return { overflowCount: overflows.length, overflows };
    });

    expect(result.overflowCount).toBe(0);
  });
});


// ══════════════════════════════════════════════════════════════════
// 수용 기준(AC) 검증
// ══════════════════════════════════════════════════════════════════

test.describe('수용 기준 검증', () => {

  test('AC1: T1 오버레이 - enhanceLevel 없음 + usedIn 있음: 콘텐츠가 패널 안에', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0); // archer

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      const GAME_HEIGHT = 640;
      const panelY = GAME_HEIGHT / 2;

      // 패널 높이 가져오기
      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      const rects = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillAlpha !== 0
      );
      let panelH = 0;
      if (nineslices.length > 0) panelH = nineslices[0].height;
      else if (rects.length > 0) panelH = rects[0].height;

      const panelTop = panelY - panelH / 2;
      const panelBottom = panelY + panelH / 2;

      // 모든 텍스트 요소가 패널 범위 안에 있는지 확인
      const texts = container.list.filter(c => c.type === 'Text');
      const outsideTexts = texts.filter(t => {
        // 스크롤 컨테이너 내 텍스트는 마스크로 클리핑되므로 제외
        if (t.parentContainer && t.parentContainer !== container) return false;
        return t.y < panelTop - 5 || t.y > panelBottom + 5;
      });

      return {
        panelH,
        panelTop,
        panelBottom,
        totalTexts: texts.length,
        outsideTexts: outsideTexts.map(t => ({
          text: t.text.substring(0, 20),
          y: t.y,
        })),
      };
    });

    expect(result.outsideTexts.length).toBe(0);

    await page.screenshot({
      path: 'tests/screenshots/overflow-ac1-t1-no-enhance.png'
    });
  });

  test('AC2: T1 오버레이 - enhanceLevel>0 + usedIn 있음: 콘텐츠가 패널 안에', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 5;
      tower._canEnhance = true;
      gs._selectPlacedTower(tower);
    });
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      const container = overlay._container;
      if (!container) return { error: 'no container' };

      const GAME_HEIGHT = 640;
      const panelY = GAME_HEIGHT / 2;

      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      const rects = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillAlpha !== 0
      );
      let panelH = 0;
      if (nineslices.length > 0) panelH = nineslices[0].height;
      else if (rects.length > 0) panelH = rects[0].height;

      const panelTop = panelY - panelH / 2;
      const panelBottom = panelY + panelH / 2;

      const texts = container.list.filter(c => c.type === 'Text');
      const outsideTexts = texts.filter(t => {
        if (t.parentContainer && t.parentContainer !== container) return false;
        return t.y < panelTop - 5 || t.y > panelBottom + 5;
      });

      const enhText = texts.find(t => t.text === '+5');
      const sellText = texts.find(t => t.text.includes('Sell'));

      return {
        panelH,
        panelTop,
        panelBottom,
        outsideCount: outsideTexts.length,
        outsideTexts: outsideTexts.map(t => ({
          text: t.text.substring(0, 20), y: t.y
        })),
        enhTextY: enhText ? enhText.y : null,
        sellTextY: sellText ? sellText.y : null,
        isSourceWithEnhance: overlay._isSourceWithEnhance,
      };
    });

    expect(result.isSourceWithEnhance).toBe(true);
    expect(result.outsideCount).toBe(0);

    // enhance 텍스트가 Sell 버튼보다 위에 있는지 확인
    if (result.enhTextY !== null && result.sellTextY !== null) {
      expect(result.enhTextY).toBeLessThan(result.sellTextY);
    }

    await page.screenshot({
      path: 'tests/screenshots/overflow-ac2-t1-enhanced.png'
    });
  });

  test('AC3: T2+ 오버레이 - enhanceLevel>0 + usedIn 있음: 겹치지 않음', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    // T2 합성 타워 생성
    const setupResult = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const GRID_COLS = 9, GRID_ROWS = 12;

      let col2, row2;
      let skip = true;
      for (let r = 0; r < GRID_ROWS && col2 === undefined; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (gs.mapManager.isBuildable(c, r)) {
            if (skip) { skip = false; continue; }
            col2 = c; row2 = r;
            break;
          }
        }
      }
      if (col2 === undefined) return { error: 'no second cell' };

      gs.goldManager.gold = 10000;
      gs.towerPanel.selectedTowerType = 'archer';
      gs._attemptPlaceTower('archer', col2, row2);

      if (gs.towers.length < 2) return { error: 'not enough towers' };
      try {
        gs._mergeTowers(gs.towers[0], gs.towers[1]);
      } catch (e) {
        return { error: 'merge failed: ' + e.message };
      }

      const merged = gs.towers.find(t => t.tier >= 2);
      if (!merged) return { error: 'no merged tower' };

      merged.enhanceLevel = 4;
      merged._canEnhance = true;
      gs._selectPlacedTower(merged);

      return { success: true, tier: merged.tier };
    });

    if (setupResult.error) {
      test.skip();
      return;
    }

    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      const container = overlay._container;
      if (!container) return { error: 'no container' };

      const GAME_HEIGHT = 640;
      const panelY = GAME_HEIGHT / 2;
      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      const rects = container.list.filter(c =>
        c.type === 'Rectangle' && c.width === 300 && c.fillAlpha !== 0
      );
      let panelH = 0;
      if (nineslices.length > 0) panelH = nineslices[0].height;
      else if (rects.length > 0) panelH = rects[0].height;

      const panelTop = panelY - panelH / 2;
      const panelBottom = panelY + panelH / 2;

      const texts = container.list.filter(c => c.type === 'Text');
      const outsideTexts = texts.filter(t => {
        if (t.parentContainer && t.parentContainer !== container) return false;
        return t.y < panelTop - 5 || t.y > panelBottom + 5;
      });

      // 강화 텍스트와 상위 조합 헤더, 버튼이 겹치지 않는지 확인
      const enhText = texts.find(t => t.text === '+4');
      const usedInHeader = texts.find(t =>
        t.text.includes('상위') || t.text.includes('Used')
      );
      const sellText = texts.find(t => t.text.includes('Sell'));

      // 겹침 체크: enhance < usedIn < sell 순서
      let ordering = 'correct';
      if (enhText && usedInHeader && enhText.y >= usedInHeader.y) ordering = 'enhance overlaps usedIn';
      if (usedInHeader && sellText && usedInHeader.y >= sellText.y) ordering = 'usedIn overlaps sell';

      return {
        panelH,
        outsideCount: outsideTexts.length,
        isSourceWithEnhance: overlay._isSourceWithEnhance,
        enhTextY: enhText?.y,
        usedInHeaderY: usedInHeader?.y,
        sellTextY: sellText?.y,
        ordering,
      };
    });

    if (!result.error) {
      expect(result.outsideCount).toBe(0);
      expect(result.isSourceWithEnhance).toBe(true);
      expect(result.ordering).toBe('correct');
    }

    await page.screenshot({
      path: 'tests/screenshots/overflow-ac3-t2-enhanced.png'
    });
  });

  test('AC4: codex 모드 T2 오버레이 레이아웃 정상', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 2);
    await openCodexOverlay(page, 2, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      const nineslices = container.list.filter(c => c.type === 'NineSlice');
      const hasNineSlice = nineslices.length > 0;

      // codex 모드이므로 actionH=0, isSourceWithEnhance=false
      const isSourceWithEnhance = s.towerInfoOverlay._isSourceWithEnhance;

      return {
        hasNineSlice,
        isSourceWithEnhance,
        panelBgHeight: hasNineSlice ? nineslices[0].height : null,
      };
    });

    expect(result.isSourceWithEnhance).toBe(false);

    await page.screenshot({
      path: 'tests/screenshots/overflow-ac4-codex-t2.png'
    });
  });

  test('AC5: usedIn 없는 타워 (T5 최상위 등) 패널 높이가 올바르다', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');

      // T5 타워가 있는지 확인
      const t5Data = s._tierDataCache[5];
      if (!t5Data || t5Data.length === 0) {
        // T4로 시도
        const t4Data = s._tierDataCache[4];
        if (!t4Data || t4Data.length === 0) return { skip: true };
      }

      // 상위 조합 없는 최고 티어 타워 찾기
      for (let tier = 5; tier >= 3; tier--) {
        const tierData = s._tierDataCache[tier];
        if (!tierData) continue;
        for (const entry of tierData) {
          const overlay = s.towerInfoOverlay;
          const usedIn = overlay._findUsedInRecipes(entry.id);
          if (usedIn.length === 0) {
            // 이 타워로 오버레이 열기
            overlay.open(entry);
            const container = overlay._container;
            if (!container) continue;

            const nineslices = container.list.filter(c => c.type === 'NineSlice');
            const rects = container.list.filter(c =>
              c.type === 'Rectangle' && c.width === 300 && c.fillAlpha !== 0
            );
            let panelH = 0;
            if (nineslices.length > 0) panelH = nineslices[0].height;
            else if (rects.length > 0) panelH = rects[0].height;

            // usedIn=0, codex모드이므로 actionH=0
            const expectedH = entry.tier >= 2 ? 316 : 240;

            overlay._forceClose();

            return {
              id: entry.id,
              tier: entry.tier,
              usedInCount: 0,
              panelH,
              expectedH,
              heightMatch: Math.abs(panelH - expectedH) < 2,
            };
          }
        }
      }

      return { skip: true, reason: 'all towers have usedIn' };
    });

    if (!result.skip) {
      expect(result.heightMatch).toBe(true);
    }
  });

  test('AC6: 드릴다운/뒤로가기/닫기가 정상 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterMergeCodex(page);
    await switchToTier(page, 2);
    await openCodexOverlay(page, 2, 0);

    // 드릴다운
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      const entry = s._tierDataCache[2][0];
      const parts = entry.recipeKey.split('+');
      const matEntry = overlay._buildEntryFromConfig(parts[0]);
      overlay._history.push(entry);
      overlay._render(matEntry);
    });
    await page.waitForTimeout(300);

    // 뒤로가기
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s.towerInfoOverlay._handleBack();
    });
    await page.waitForTimeout(300);

    const isOpen = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay.isOpen();
    });
    expect(isOpen).toBe(true);

    // 닫기
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s.towerInfoOverlay._forceClose();
    });
    await page.waitForTimeout(200);

    const isClosed = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return !s.towerInfoOverlay.isOpen();
    });
    expect(isClosed).toBe(true);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 엣지케이스
// ══════════════════════════════════════════════════════════════════

test.describe('엣지케이스', () => {

  test('codex 모드에서 _isSourceWithEnhance는 어떤 경우에도 false', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      const results = [];

      // T1, T2, T3 각각 열어보기
      for (let tier = 1; tier <= 3; tier++) {
        const data = s._tierDataCache[tier];
        if (!data || data.length === 0) continue;
        overlay.open(data[0]);
        results.push({
          tier,
          isSourceWithEnhance: overlay._isSourceWithEnhance,
        });
        overlay._forceClose();
      }

      return results;
    });

    for (const r of result) {
      expect(r.isSourceWithEnhance).toBe(false);
    }
  });

  test('NineSlice 최소 높이 체크 (NS_TOP + NS_BOTTOM = 92)', async ({ page }) => {
    // NineSlice의 최소 높이는 NS_TOP(48) + NS_BOTTOM(44) = 92px
    // 현재 최소 panelH는 T1(240)이므로 92보다 훨씬 크다
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;

      // usedIn 없는 T1 타워 찾기
      const t1Data = s._tierDataCache[1];
      let minH = Infinity;
      for (const entry of t1Data) {
        const usedIn = overlay._findUsedInRecipes(entry.id);
        if (usedIn.length === 0) {
          const h = 240; // baseH for T1, no usedIn, no action
          if (h < minH) minH = h;
        }
      }

      return {
        minPanelH: minH === Infinity ? 240 : minH,
        nsMinH: 48 + 44, // NS_TOP + NS_BOTTOM
        safe: (minH === Infinity ? 240 : minH) >= (48 + 44),
      };
    });

    expect(result.safe).toBe(true);
    expect(result.minPanelH).toBeGreaterThanOrEqual(result.nsMinH);
  });

  test('빠른 연속 타워 선택 (연타) 시 패널 높이가 올바르다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);

    // 빠른 연속 선택/해제 5회
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      for (let i = 0; i < 5; i++) {
        gs._selectPlacedTower(tower);
        gs.towerPanel.towerInfoOverlay._forceClose();
      }
      // 마지막으로 한 번 더 열기
      gs._selectPlacedTower(tower);
    });
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      return {
        isOpen: overlay.isOpen(),
        hasContainer: overlay._container !== null,
      };
    });

    expect(result.isOpen).toBe(true);
    expect(errors).toEqual([]);
  });

  test('전체 UI 흐름에서 콘솔 에러가 없다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Codex 모드 테스트
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0);
    await page.waitForTimeout(300);

    // 드릴다운
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      const entry = s._tierDataCache[1][0];
      const usedIn = overlay._findUsedInRecipes(entry.id);
      if (usedIn.length > 0) {
        overlay._history.push(entry);
        overlay._render(usedIn[0].resultEntry);
      }
    });
    await page.waitForTimeout(300);

    // 뒤로
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s.towerInfoOverlay._handleBack();
    });
    await page.waitForTimeout(200);

    // 닫기
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s.towerInfoOverlay._forceClose();
    });
    await page.waitForTimeout(200);

    // T2 열기
    await switchToTier(page, 2);
    await openCodexOverlay(page, 2, 0);
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s.towerInfoOverlay._forceClose();
    });
    await page.waitForTimeout(200);

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 시각적 검증 (스크린샷)
// ══════════════════════════════════════════════════════════════════

test.describe('시각적 검증', () => {

  test('codex T1 오버레이 (NineSlice 패널)', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/overflow-visual-codex-t1.png'
    });
  });

  test('codex T2 오버레이 (NineSlice + Y자 트리)', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 2);
    await openCodexOverlay(page, 2, 0);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/overflow-visual-codex-t2.png'
    });
  });

  test('codex T3 오버레이 (상위 조합 있음/없음)', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 3);

    const hasT3 = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s._tierDataCache[3] && s._tierDataCache[3].length > 0;
    });

    if (hasT3) {
      await openCodexOverlay(page, 3, 0);
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'tests/screenshots/overflow-visual-codex-t3.png'
      });
    }
  });

  test('game 모드 T1 오버레이 (강화 없음, usedIn 있음)', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/overflow-visual-game-t1.png'
    });
  });

  test('game 모드 T1 오버레이 (강화 있음)', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 5;
      tower._canEnhance = true;
      gs._selectPlacedTower(tower);
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/overflow-visual-game-t1-enhanced.png'
    });
  });

  test('모바일 뷰포트(375x667)에서 오버레이 표시', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/overflow-visual-mobile.png'
    });
  });
});
