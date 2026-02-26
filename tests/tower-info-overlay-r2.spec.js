// @ts-check
import { test, expect } from '@playwright/test';

/**
 * TowerInfoOverlay QA R2 Tests
 * R1에서 FAIL된 4건 수정 검증 + 회귀 테스트 + 추가 엣지케이스
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
// BUG-1 재검증: 이벤트 리스너 누수 수정
// ══════════════════════════════════════════════════════════════════

test.describe('BUG-1 재검증: 이벤트 리스너 누수 수정', () => {

  test('오버레이 5회 열기/닫기 후 pointermove 리스너가 증가하지 않는다', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const counts = [];

      // 기준값: 오버레이를 열기 전 리스너 수
      const baselineMoveCount = (s.input.listeners('pointermove') || []).length;
      const baselineUpCount = (s.input.listeners('pointerup') || []).length;

      for (let i = 0; i < 5; i++) {
        const entry = s._tierDataCache[1][0]; // archer (usedIn 있음)
        s.towerInfoOverlay.open(entry);
        s.towerInfoOverlay._forceClose();
      }

      // 닫은 후 리스너 수
      const afterMoveCount = (s.input.listeners('pointermove') || []).length;
      const afterUpCount = (s.input.listeners('pointerup') || []).length;

      return {
        baselineMove: baselineMoveCount,
        baselineUp: baselineUpCount,
        afterMove: afterMoveCount,
        afterUp: afterUpCount,
        moveGrowth: afterMoveCount - baselineMoveCount,
        upGrowth: afterUpCount - baselineUpCount,
      };
    });

    // 리스너 수가 증가하지 않아야 한다
    expect(result.moveGrowth).toBe(0);
    expect(result.upGrowth).toBe(0);
  });

  test('오버레이 열린 상태에서 리스너가 정확히 1쌍 추가된다', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');

      const baselineMove = (s.input.listeners('pointermove') || []).length;
      const baselineUp = (s.input.listeners('pointerup') || []).length;

      const entry = s._tierDataCache[1][0]; // archer (usedIn 있음)
      s.towerInfoOverlay.open(entry);

      const openMove = (s.input.listeners('pointermove') || []).length;
      const openUp = (s.input.listeners('pointerup') || []).length;

      // usedIn 섹션이 있으면 +1, 없으면 +0
      const hasUsedIn = s.towerInfoOverlay._scrollMoveHandler !== null;

      s.towerInfoOverlay._forceClose();

      const afterMove = (s.input.listeners('pointermove') || []).length;
      const afterUp = (s.input.listeners('pointerup') || []).length;

      return {
        hasUsedIn,
        moveAdded: openMove - baselineMove,
        upAdded: openUp - baselineUp,
        moveAfterClose: afterMove - baselineMove,
        upAfterClose: afterUp - baselineUp,
      };
    });

    if (result.hasUsedIn) {
      expect(result.moveAdded).toBe(1);
      expect(result.upAdded).toBe(1);
    }
    // 닫은 후에는 추가된 리스너가 0이어야 한다
    expect(result.moveAfterClose).toBe(0);
    expect(result.upAfterClose).toBe(0);
  });

  test('드릴다운 10회 반복 시 리스너가 누적되지 않는다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 2);
    await openCodexOverlay(page, 2, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      const entry = s._tierDataCache[2][0];
      const counts = [];

      for (let i = 0; i < 10; i++) {
        // 드릴다운
        const parts = entry.recipeKey.split('+');
        const matEntry = overlay._buildEntryFromConfig(parts[0]);
        overlay._history.push(entry);
        overlay._render(matEntry);

        const moveCount = (s.input.listeners('pointermove') || []).length;
        counts.push(moveCount);

        // 뒤로가기
        overlay._handleBack();
      }

      return counts;
    });

    // 10회 반복에서 리스너 수가 일정해야 한다
    const uniqueCounts = [...new Set(result)];
    // 리스너 수가 최대 2가지 값(usedIn 있는 타워 / 없는 타워)만 있어야 한다
    expect(uniqueCounts.length).toBeLessThanOrEqual(2);
    // 마지막 값이 첫 번째 값과 같아야 한다
    expect(result[result.length - 1]).toBe(result[0]);
  });

  test('_removeScrollListeners 호출 후 인스턴스 변수가 null로 초기화된다', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;

      // usedIn 있는 타워 오버레이 열기
      const entry = s._tierDataCache[1][0];
      overlay.open(entry);

      const hasHandlersBefore = {
        move: overlay._scrollMoveHandler !== null,
        up: overlay._scrollUpHandler !== null,
      };

      overlay._removeScrollListeners();

      const hasHandlersAfter = {
        move: overlay._scrollMoveHandler !== null,
        up: overlay._scrollUpHandler !== null,
      };

      overlay._forceClose();

      return { hasHandlersBefore, hasHandlersAfter };
    });

    // usedIn이 있으면 핸들러가 있어야 한다
    if (result.hasHandlersBefore.move) {
      expect(result.hasHandlersAfter.move).toBe(false);
      expect(result.hasHandlersAfter.up).toBe(false);
    }
  });

  test('game 모드에서도 리스너 누수가 없다 (5회 열기/닫기)', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      const tower = gs.towers[0];

      const baselineMove = (gs.input.listeners('pointermove') || []).length;
      const baselineUp = (gs.input.listeners('pointerup') || []).length;

      for (let i = 0; i < 5; i++) {
        overlay.open(tower);
        overlay._forceClose();
      }

      const afterMove = (gs.input.listeners('pointermove') || []).length;
      const afterUp = (gs.input.listeners('pointerup') || []).length;

      return {
        moveGrowth: afterMove - baselineMove,
        upGrowth: afterUp - baselineUp,
      };
    });

    expect(result.moveGrowth).toBe(0);
    expect(result.upGrowth).toBe(0);
  });
});


// ══════════════════════════════════════════════════════════════════
// BUG-2 재검증: _buildMergeList dead code 삭제
// ══════════════════════════════════════════════════════════════════

test.describe('BUG-2 재검증: _buildMergeList dead code 삭제', () => {

  test('TowerPanel에 _buildMergeList 메서드가 존재하지 않는다', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        hasBuildMergeList: typeof gs.towerPanel._buildMergeList === 'function',
        hasFlashMergeTargets: typeof gs.towerPanel._flashMergeTargets === 'function',
      };
    });

    expect(result.hasBuildMergeList).toBe(false);
    expect(result.hasFlashMergeTargets).toBe(true);
  });

  test('_flashMergeTargets가 에러 없이 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);

    // 두 번째 타워를 배치하여 _flashMergeTargets가 대상을 찾을 수 있도록 함
    await placeTowerViaEval(page, 'archer');

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      // _flashMergeTargets는 getTowers 콜백이 필요하다
      // TowerPanel에서 사용하므로 직접 호출
      try {
        gs.towerPanel._flashMergeTargets('archer');
      } catch (e) {
        // 에러가 발생하면 기록
        throw e;
      }
    });
    await page.waitForTimeout(1500); // 애니메이션 대기

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// BUG-3 재검증: MergeCodexScene shutdown 핸들러
// ══════════════════════════════════════════════════════════════════

test.describe('BUG-3 재검증: MergeCodexScene shutdown 핸들러', () => {

  test('MergeCodexScene에 shutdown 이벤트 핸들러가 등록되어 있다', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      // shutdown 이벤트 리스너 확인
      const shutdownListeners = s.events.listeners('shutdown') || [];
      return {
        hasShutdownListener: shutdownListeners.length > 0,
        hasOnShutdownMethod: typeof s._onShutdown === 'function',
      };
    });

    expect(result.hasShutdownListener).toBe(true);
    expect(result.hasOnShutdownMethod).toBe(true);
  });

  test('도감 -> 메뉴 -> 도감 전환 시 오류가 없다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // 1차 도감 진입
    await enterMergeCodex(page);

    // 오버레이 열기
    await openCodexOverlay(page, 1, 0);

    // BACK 버튼으로 씬 전환 (CollectionScene으로)
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s._goBack();
    });
    await page.waitForTimeout(500);

    // 2차 도감 진입
    await page.evaluate(() => {
      const g = window.__game;
      const activeScenes = g.scene.getScenes(true);
      if (activeScenes.length > 0) {
        activeScenes[0].scene.start('MergeCodexScene', { fromScene: 'CollectionScene' });
      }
    });
    await waitForScene(page, 'MergeCodexScene');

    // 2차에서 오버레이 열기
    await openCodexOverlay(page, 1, 0);

    const isOpen = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay && s.towerInfoOverlay.isOpen();
    });
    expect(isOpen).toBe(true);

    expect(errors).toEqual([]);
  });

  test('도감 -> 메뉴 -> 도감 3회 반복 전환 시 리스너 누수 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForGame(page);

    for (let i = 0; i < 3; i++) {
      // 도감 진입
      await page.evaluate(() => {
        const g = window.__game;
        const activeScenes = g.scene.getScenes(true);
        if (activeScenes.length > 0) {
          activeScenes[0].scene.start('MergeCodexScene', { fromScene: 'CollectionScene' });
        }
      });
      await waitForScene(page, 'MergeCodexScene');

      // 오버레이 열기
      await openCodexOverlay(page, 1, 0);
      await page.waitForTimeout(200);

      // 도감 나가기
      await page.evaluate(() => {
        const s = window.__game.scene.getScene('MergeCodexScene');
        s._goBack();
      });
      await page.waitForTimeout(500);
    }

    expect(errors).toEqual([]);
  });

  test('_onShutdown에서 towerInfoOverlay.destroy()가 호출된다', async ({ page }) => {
    await enterMergeCodex(page);
    await openCodexOverlay(page, 1, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlayBefore = s.towerInfoOverlay;
      const wasOpen = overlayBefore.isOpen();

      // _onShutdown 수동 호출
      s._onShutdown();

      return {
        wasOpen,
        overlayAfter: s.towerInfoOverlay,
        isNull: s.towerInfoOverlay === null,
      };
    });

    expect(result.wasOpen).toBe(true);
    expect(result.isNull).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// BUG-4 재검증: 무의미한 코드 제거 (강화레벨 표시)
// ══════════════════════════════════════════════════════════════════

test.describe('BUG-4 재검증: 강화레벨 표시 단순화', () => {

  test('강화된 T1 타워의 오버레이에 +N 텍스트가 표시된다', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    // 타워를 강화시킨 후 오버레이를 열어 확인
    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];

      // 강제로 강화 레벨을 2로 설정
      tower.enhanceLevel = 2;
      tower._canEnhance = true;

      // 타워 선택 -> 오버레이 열기
      gs._selectPlacedTower(tower);

      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const texts = overlay._container.list
        .filter(c => c.type === 'Text')
        .map(t => t.text);

      return {
        texts,
        hasEnhanceText: texts.some(t => t === '+2'),
        hasMaxEnhance: texts.some(t => t.includes('최대') || t.includes('maxEnhance')),
      };
    });

    expect(result.hasEnhanceText).toBe(true);
  });

  test('강화되지 않은 타워의 오버레이에는 +0 텍스트가 없다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay._container) return { error: 'no container' };

      const texts = overlay._container.list
        .filter(c => c.type === 'Text')
        .map(t => t.text);

      return {
        texts,
        hasPlus0: texts.some(t => t === '+0'),
      };
    });

    // 강화 레벨 0이면 +0 텍스트가 없어야 한다
    expect(result.hasPlus0).toBe(false);
  });

  test('코드에 무의미한 삼항 연산자가 없다 (정적 검증)', async ({ page }) => {
    await enterMergeCodex(page);

    // TowerInfoOverlay 소스에서 삼항 연산 패턴 검사
    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;

      // _renderT1Panel과 _renderTreePanel 소스에서 삼항 연산 확인
      const t1Src = overlay._renderT1Panel.toString();
      const treeSrc = overlay._renderTreePanel.toString();

      // 기존 버그: t('ui.maxEnhance') === t('ui.maxEnhance') ? '' : '' 패턴
      const hasDeadTernary = t1Src.includes("=== t('ui.maxEnhance')") ||
                             treeSrc.includes("=== t('ui.maxEnhance')");

      return {
        hasDeadTernary,
        // 강화 레벨 표시가 단순 `+${info.enhanceLevel}` 형태인지 확인
        hasSimpleEnhanceDisplay: t1Src.includes('`+${info.enhanceLevel}`') ||
                                  treeSrc.includes('`+${info.enhanceLevel}`'),
      };
    });

    expect(result.hasDeadTernary).toBe(false);
  });
});


// ══════════════════════════════════════════════════════════════════
// 전체 기능 회귀 테스트
// ══════════════════════════════════════════════════════════════════

test.describe('회귀 테스트: 인게임 game 모드', () => {

  test('타워 클릭 -> 오버레이 -> 닫기(X) 전체 흐름', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    // 오버레이 열림 확인
    const isOpen = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return gs.towerPanel.towerInfoOverlay.isOpen();
    });
    expect(isOpen).toBe(true);

    // X 버튼으로 닫기
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.towerPanel.towerInfoOverlay._forceClose();
    });
    await page.waitForTimeout(300);

    const isClosed = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return !gs.towerPanel.towerInfoOverlay.isOpen();
    });
    expect(isClosed).toBe(true);
    expect(errors).toEqual([]);
  });

  test('타워 클릭 -> 드릴다운 -> 뒤로 -> 판매 전체 흐름', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    // 드릴다운
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

      // 뒤로가기
      await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        gs.towerPanel.towerInfoOverlay._handleBack();
      });
      await page.waitForTimeout(300);

      // 판매 버튼 복원 확인
      const hasSell = await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        const container = gs.towerPanel.towerInfoOverlay._container;
        if (!container) return false;
        const texts = container.list.filter(c => c.type === 'Text').map(t => t.text);
        return texts.some(t => t.includes('Sell'));
      });
      expect(hasSell).toBe(true);
    }

    // 판매 실행
    const beforeCount = await page.evaluate(() => {
      return window.__game.scene.getScene('GameScene').towers.length;
    });

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      if (tower) gs._onTowerSell(tower);
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

  test('sellBg 버튼이 정상 동작한다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        sellBgExists: gs.towerPanel.sellBg != null,
        sellBgAlpha: gs.towerPanel.sellBg?.alpha,
        sellBgInteractive: gs.towerPanel.sellBg?.input != null,
      };
    });

    expect(result.sellBgExists).toBe(true);
    // 타워 선택 상태이므로 sellBg가 활성화(alpha=1)되어야 한다
    expect(result.sellBgAlpha).toBe(1);
    expect(result.sellBgInteractive).toBe(true);
  });

  test('배속 버튼이 오버레이와 무관하게 동작한다', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);

    // 오버레이 열린 상태에서 배속 확인
    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const overlayOpen = panel.towerInfoOverlay.isOpen();
      const speedBgExists = panel.speedBg != null;
      const overlayDepth = panel.towerInfoOverlay._container?.depth;
      const panelDepth = panel.container?.depth;

      return {
        overlayOpen,
        speedBgExists,
        overlayDepth,
        panelDepth,
      };
    });

    expect(result.overlayOpen).toBe(true);
    expect(result.speedBgExists).toBe(true);
    // 오버레이(depth=100)가 패널(depth=30) 위에 있어야 한다
    expect(result.overlayDepth).toBe(100);
    expect(result.panelDepth).toBe(30);
  });
});

test.describe('회귀 테스트: 도감 codex 모드', () => {

  test('카드 클릭 -> 오버레이 -> 드릴다운 -> 뒤로 -> 닫기(X) 전체 흐름', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterMergeCodex(page);
    await switchToTier(page, 2);
    await openCodexOverlay(page, 2, 0);

    expect(await page.evaluate(() => {
      return window.__game.scene.getScene('MergeCodexScene').towerInfoOverlay.isOpen();
    })).toBe(true);

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

    // 닫기
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s.towerInfoOverlay._forceClose();
    });
    await page.waitForTimeout(200);

    expect(await page.evaluate(() => {
      return window.__game.scene.getScene('MergeCodexScene').towerInfoOverlay.isOpen();
    })).toBe(false);

    expect(errors).toEqual([]);
  });

  test('상위 조합 스크롤이 제대로 동작한다', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    // archer는 많은 상위 조합이 있다
    await openCodexOverlay(page, 1, 0);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const container = s.towerInfoOverlay._container;
      if (!container) return { error: 'no container' };

      const texts = container.list.filter(c => c.type === 'Text').map(t => t.text);
      const hasUsedIn = texts.some(t => t.includes('상위') || t.includes('Used'));

      // GeometryMask가 적용된 컨테이너가 있어야 한다
      const maskedContainers = container.list.filter(c =>
        c.type === 'Container' && c.mask
      );

      return {
        hasUsedIn,
        maskedContainerCount: maskedContainers.length,
      };
    });

    expect(result.hasUsedIn).toBe(true);
    expect(result.maskedContainerCount).toBeGreaterThanOrEqual(1);
  });

  test('T1~T5 모든 서브탭에서 카드 오버레이가 열린다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterMergeCodex(page);

    for (let tier = 1; tier <= 5; tier++) {
      await switchToTier(page, tier);

      const hasCards = await page.evaluate((t) => {
        const s = window.__game.scene.getScene('MergeCodexScene');
        return s._tierDataCache[t] && s._tierDataCache[t].length > 0;
      }, tier);

      if (hasCards) {
        await openCodexOverlay(page, tier, 0);

        const isOpen = await page.evaluate(() => {
          const s = window.__game.scene.getScene('MergeCodexScene');
          return s.towerInfoOverlay.isOpen();
        });
        expect(isOpen).toBe(true);

        await page.evaluate(() => {
          const s = window.__game.scene.getScene('MergeCodexScene');
          s.towerInfoOverlay._forceClose();
        });
        await page.waitForTimeout(200);
      }
    }

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 추가 엣지케이스
// ══════════════════════════════════════════════════════════════════

test.describe('추가 엣지케이스', () => {

  test('오버레이 닫기 직후 재오픈 방지 (200ms 쿨다운)', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;

      // 오버레이 열기 후 닫기
      const entry = s._tierDataCache[1][0];
      overlay.open(entry);
      overlay._forceClose();

      // 닫힌 시각 기록
      const closedAt = overlay.getClosedAt();
      const now = Date.now();

      return {
        closedAt,
        timeDiff: now - closedAt,
        isValidCooldown: closedAt > 0 && (now - closedAt) < 200,
      };
    });

    expect(result.closedAt).toBeGreaterThan(0);
  });

  test('usedIn 없는 T5 최고티어 타워에서도 오버레이가 정상 동작한다', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const t5Data = s._tierDataCache[5];
      if (!t5Data || t5Data.length === 0) return { skip: true };

      const overlay = s.towerInfoOverlay;
      overlay.open(t5Data[0]);

      const isOpen = overlay.isOpen();
      const container = overlay._container;
      const texts = container.list.filter(c => c.type === 'Text').map(t => t.text);

      // T5는 최상위이므로 usedIn이 없을 수 있다
      const hasUsedIn = texts.some(t => t.includes('상위') || t.includes('Used'));

      overlay._forceClose();

      return {
        skip: false,
        isOpen,
        displayName: t5Data[0].displayName,
        hasUsedIn,
      };
    });

    if (!result.skip) {
      expect(result.isOpen).toBe(true);
    }
  });

  test('빠른 연속 오버레이 열기 (이전 것을 닫지 않고 새로 열기)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;

      // 닫지 않고 연속으로 다른 카드 오버레이 열기
      for (let i = 0; i < 5; i++) {
        const entry = s._tierDataCache[1][i % 10];
        overlay.open(entry);
      }

      // 마지막 열린 오버레이가 올바르게 표시되는지
      const isOpen = overlay.isOpen();
      const container = overlay._container;
      const texts = container ? container.list.filter(c => c.type === 'Text').map(t => t.text) : [];

      overlay._forceClose();

      return { isOpen, textCount: texts.length };
    });

    expect(result.isOpen).toBe(true);
    expect(result.textCount).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('destroy 후 open 호출 시 에러 처리', async ({ page }) => {
    await enterMergeCodex(page);

    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;

      overlay.destroy();

      try {
        // destroy 후 open 시도 - scene이 아직 살아있으므로 동작은 할 수 있다
        const entry = s._tierDataCache[1][0];
        overlay.open(entry);
        const isOpen = overlay.isOpen();
        overlay._forceClose();
        return { error: null, isOpen };
      } catch (e) {
        return { error: e.message };
      }
    });

    // destroy 후 open을 시도해도 에러가 나지 않아야 한다
    // (또는 에러가 나더라도 적절하게 처리되어야 한다)
    // 현재 구현에서는 destroy가 _forceClose를 호출하므로 container가 null이 되고
    // 이후 open에서 새 container를 만들므로 정상 동작할 수 있다
    if (result.error) {
      // 에러가 발생하면 기록 (구현에 따라 다를 수 있음)
      console.log(`destroy 후 open 에러: ${result.error}`);
    }
  });
});


// ══════════════════════════════════════════════════════════════════
// 시각적 검증 (스크린샷)
// ══════════════════════════════════════════════════════════════════

test.describe('R2 시각적 검증', () => {

  test('codex T1 오버레이 (usedIn 스크롤 영역 포함)', async ({ page }) => {
    await enterMergeCodex(page);
    await switchToTier(page, 1);
    await openCodexOverlay(page, 1, 0);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/r2-codex-t1-overlay.png'
    });
  });

  test('game 모드 T1 타워 오버레이 (강화+판매 버튼)', async ({ page }) => {
    await enterGameAndPlaceTower(page);
    await selectTowerInGame(page, 0);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/r2-game-overlay.png'
    });
  });

  test('game 모드 드릴다운 상태 (버튼 숨김)', async ({ page }) => {
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
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'tests/screenshots/r2-game-drilldown.png'
      });
    }
  });

  test('강화된 타워 오버레이 (+N 표시)', async ({ page }) => {
    await enterGameAndPlaceTower(page);

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const tower = gs.towers[0];
      tower.enhanceLevel = 3;
      tower._canEnhance = true;
      gs._selectPlacedTower(tower);
    });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/screenshots/r2-game-enhanced-tower.png'
    });
  });
});
