/**
 * @fileoverview ESC 키 오버레이 우선순위 처리 QA 테스트.
 * TowerInfoOverlay나 일시정지 오버레이가 열려 있을 때
 * ESC 키가 씬 전환 대신 오버레이를 우선 닫는지 검증한다.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3456/';

// ── Helpers ──────────────────────────────────────────────────────

/**
 * 게임이 부팅되어 MenuScene에 도달할 때까지 대기하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=15000]
 */
async function waitForMenuScene(page, timeout = 15000) {
  await page.goto(BASE_URL, { waitUntil: 'load' });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout });
  await page.waitForFunction(() => {
    const g = window.__game;
    if (!g || !g.scene) return false;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === 'MenuScene';
  }, { timeout });
  await page.waitForTimeout(500);
}

/**
 * 현재 활성 씬의 키를 반환하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function getActiveSceneKey(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 ? scenes[0].sys.settings.key : 'NONE';
  });
}

/**
 * MergeCodexScene으로 진입하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {string} [fromScene='CollectionScene']
 */
async function enterMergeCodex(page, fromScene = 'CollectionScene') {
  await page.evaluate((from) => {
    const g = window.__game;
    const active = g.scene.getScenes(true);
    if (active.length > 0) {
      active[0].scene.start('MergeCodexScene', { fromScene: from });
    }
  }, fromScene);
  await page.waitForFunction(() => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === 'MergeCodexScene';
  }, { timeout: 5000 });
  await page.waitForTimeout(500);
}

/**
 * MergeCodexScene에서 TowerInfoOverlay를 여는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {number} [tier=1]
 * @param {number} [index=0]
 */
async function openCodexOverlay(page, tier = 1, index = 0) {
  await page.evaluate(({ t, i }) => {
    const s = window.__game.scene.getScene('MergeCodexScene');
    // 티어 탭 전환
    s.codexTier = t;
    s.codexScrollY = 0;
    s._buildSubTabs();
    s._buildCodexContent();
  }, { t: tier, i: index });
  await page.waitForTimeout(300);

  await page.evaluate(({ t, i }) => {
    const s = window.__game.scene.getScene('MergeCodexScene');
    const entry = s._tierDataCache[t][i];
    s._showCodexCardOverlay(entry);
  }, { t: tier, i: index });
  await page.waitForTimeout(500);
}

/**
 * GameScene으로 진입하고 타워를 배치하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 */
async function enterGameScene(page) {
  await page.evaluate(() => {
    const g = window.__game;
    const active = g.scene.getScenes(true);
    if (active.length > 0) {
      active[0].scene.start('GameScene', { gameMode: 'endless' });
    }
  });
  await page.waitForFunction(() => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
  }, { timeout: 15000 });
  await page.waitForTimeout(1500);
}

/**
 * GameScene에 타워를 프로그래밍 방식으로 배치하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {string} [towerType='archer']
 */
async function placeTower(page, towerType = 'archer') {
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
    return { success: !!placed, col, row };
  }, towerType);
}

/**
 * GameScene에서 타워를 선택하여 오버레이를 여는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {number} [towerIndex=0]
 */
async function selectTowerInGame(page, towerIndex = 0) {
  await page.evaluate((idx) => {
    const gs = window.__game.scene.getScene('GameScene');
    if (gs && gs.towers && gs.towers[idx]) {
      gs._selectPlacedTower(gs.towers[idx]);
    }
  }, towerIndex);
  await page.waitForTimeout(500);
}


// ══════════════════════════════════════════════════════════════════
// 1. 코드 정적 분석 기반 기능 검증
// ══════════════════════════════════════════════════════════════════

test.describe('ESC 키 오버레이 우선순위 - 정적 분석 검증', () => {

  test('handleBack() 공개 메서드가 TowerInfoOverlay에 존재한다', async ({ page }) => {
    await waitForMenuScene(page);
    await enterMergeCodex(page);
    await openCodexOverlay(page, 1, 0);

    const hasHandleBack = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return typeof s.towerInfoOverlay.handleBack === 'function';
    });
    expect(hasHandleBack).toBe(true);
  });

  test('handleBack()이 _handleBack()을 호출한다', async ({ page }) => {
    await waitForMenuScene(page);
    await enterMergeCodex(page);
    await openCodexOverlay(page, 1, 0);

    // handleBack() 호출 시 히스토리가 없으면 닫혀야 한다 (_handleBack 동작)
    const result = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const beforeOpen = s.towerInfoOverlay.isOpen();
      s.towerInfoOverlay.handleBack();
      const afterOpen = s.towerInfoOverlay.isOpen();
      return { beforeOpen, afterOpen };
    });
    expect(result.beforeOpen).toBe(true);
    expect(result.afterOpen).toBe(false);
  });

  test('isOpen() 메서드가 정상 동작한다', async ({ page }) => {
    await waitForMenuScene(page);
    await enterMergeCodex(page);

    const beforeOpen = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay.isOpen();
    });
    expect(beforeOpen).toBe(false);

    await openCodexOverlay(page, 1, 0);

    const afterOpen = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay.isOpen();
    });
    expect(afterOpen).toBe(true);
  });

  test('TowerPanel.isOverlayOpen()이 정상 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);
    await placeTower(page);

    const before = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return gs.towerPanel.isOverlayOpen();
    });
    expect(before).toBe(false);

    await selectTowerInGame(page, 0);

    const after = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return gs.towerPanel.isOverlayOpen();
    });
    expect(after).toBe(true);

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 2. 수용 기준 검증 - MergeCodexScene
// ══════════════════════════════════════════════════════════════════

test.describe('MergeCodexScene - ESC 오버레이 우선 처리', () => {

  test('AC1: 오버레이 열림 -> ESC -> 오버레이 닫힘 (씬 전환 없음)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterMergeCodex(page, 'CollectionScene');
    await openCodexOverlay(page, 1, 0);

    // 오버레이 열림 확인
    const isOpen = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay.isOpen();
    });
    expect(isOpen).toBe(true);

    // ESC 키 입력
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 오버레이가 닫혔는지 확인
    const isOpenAfter = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay.isOpen();
    });
    expect(isOpenAfter).toBe(false);

    // 씬이 전환되지 않았는지 확인 (여전히 MergeCodexScene)
    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('MergeCodexScene');

    await page.screenshot({ path: 'tests/screenshots/esc-codex-overlay-closed.png' });
    expect(errors).toEqual([]);
  });

  test('AC2: 드릴다운 중(히스토리 2개) -> ESC -> 이전 타워로 돌아감', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterMergeCodex(page);
    // T2 오버레이 열기
    await openCodexOverlay(page, 2, 0);

    // 드릴다운 수행
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

    // 히스토리 길이 확인
    const histLenBefore = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay._history.length;
    });
    expect(histLenBefore).toBe(1);

    // ESC 키 입력
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 히스토리가 줄었는지 확인 (이전으로 돌아감)
    const histLenAfter = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay._history.length;
    });
    expect(histLenAfter).toBe(0);

    // 오버레이는 여전히 열려 있어야 함
    const isOpen = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay.isOpen();
    });
    expect(isOpen).toBe(true);

    // 씬 전환 없음
    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('MergeCodexScene');

    await page.screenshot({ path: 'tests/screenshots/esc-codex-drilldown-back.png' });
    expect(errors).toEqual([]);
  });

  test('AC3: 오버레이 닫힌 상태 -> ESC -> 기존 씬 전환 동작 유지', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterMergeCodex(page, 'CollectionScene');

    // 오버레이가 닫혀 있는 상태에서 ESC
    const isOpen = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay.isOpen();
    });
    expect(isOpen).toBe(false);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // CollectionScene으로 전환되어야 함
    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('CollectionScene');

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 3. 수용 기준 검증 - GameScene
// ══════════════════════════════════════════════════════════════════

test.describe('GameScene - ESC 오버레이 우선 처리', () => {

  test('AC4: 타워 오버레이 열림 -> ESC -> 오버레이 닫힘 (일시정지 안됨)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);
    await placeTower(page);
    await selectTowerInGame(page, 0);

    // 오버레이 열림 확인
    const isOpen = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return gs.towerPanel.isOverlayOpen();
    });
    expect(isOpen).toBe(true);

    // ESC 키 입력
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 오버레이가 닫혔는지 확인
    const afterState = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        overlayOpen: gs.towerPanel.isOverlayOpen(),
        isPaused: gs.isPaused,
      };
    });
    expect(afterState.overlayOpen).toBe(false);
    expect(afterState.isPaused).toBe(false); // 일시정지되지 않아야 함

    // 여전히 GameScene
    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('GameScene');

    await page.screenshot({ path: 'tests/screenshots/esc-game-overlay-closed.png' });
    expect(errors).toEqual([]);
  });

  test('AC5: 일시정지 상태(pauseOverlay 열림) -> ESC -> 게임 재개', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);

    // 일시정지
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const pauseState = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        isPaused: gs.isPaused,
        hasPauseOverlay: gs.pauseOverlay !== null,
      };
    });
    expect(pauseState.isPaused).toBe(true);
    expect(pauseState.hasPauseOverlay).toBe(true);

    await page.screenshot({ path: 'tests/screenshots/esc-game-paused.png' });

    // 두 번째 ESC -> 재개
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const afterState = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        isPaused: gs.isPaused,
        hasPauseOverlay: gs.pauseOverlay !== null,
      };
    });
    expect(afterState.isPaused).toBe(false);
    expect(afterState.hasPauseOverlay).toBe(false);

    await page.screenshot({ path: 'tests/screenshots/esc-game-resumed.png' });
    expect(errors).toEqual([]);
  });

  test('AC6: 오버레이 없는 게임 중 -> ESC -> _pauseGame() 동작 유지', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);

    // 오버레이도 없고 일시정지도 아닌 상태
    const before = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        isPaused: gs.isPaused,
        overlayOpen: gs.towerPanel ? gs.towerPanel.isOverlayOpen() : false,
      };
    });
    expect(before.isPaused).toBe(false);
    expect(before.overlayOpen).toBe(false);

    // ESC -> 일시정지
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const after = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return gs.isPaused;
    });
    expect(after).toBe(true);

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 4. 수용 기준 검증 - CollectionScene (변경 없음)
// ══════════════════════════════════════════════════════════════════

test.describe('CollectionScene - 기존 동작 유지', () => {

  test('AC7: CollectionScene -> ESC -> MenuScene 전환 (변경 없음)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);

    // CollectionScene으로 이동
    await page.evaluate(() => {
      const g = window.__game;
      const active = g.scene.getScenes(true);
      if (active.length > 0) {
        active[0].scene.start('CollectionScene');
      }
    });
    await page.waitForFunction(() => {
      const g = window.__game;
      const scenes = g.scene.getScenes(true);
      return scenes.length > 0 && scenes[0].sys.settings.key === 'CollectionScene';
    }, { timeout: 5000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('MenuScene');

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 5. 예외 시나리오 및 엣지케이스
// ══════════════════════════════════════════════════════════════════

test.describe('예외 시나리오', () => {

  test('EC1: MergeCodexScene 오버레이 열림 + ESC 빠른 연타 3회 -> 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterMergeCodex(page, 'CollectionScene');
    await openCodexOverlay(page, 1, 0);

    // ESC 3회 빠른 연타
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 에러 없어야 함
    expect(errors).toEqual([]);

    // 최종 상태: 첫 ESC로 오버레이 닫힘 -> 두 번째 ESC로 CollectionScene 전환
    // 세 번째 ESC는 CollectionScene에서 MenuScene으로 전환
    // 중요한 것은 에러가 없어야 한다는 것
  });

  test('EC2: GameScene 오버레이 + ESC 연타 -> 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);
    await placeTower(page);
    await selectTowerInGame(page, 0);

    // ESC 5회 빠른 연타
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(500);

    // 에러 없어야 함
    expect(errors).toEqual([]);
  });

  test('EC3: MergeCodexScene에서 towerInfoOverlay가 null일 때 ESC 안전 처리', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterMergeCodex(page, 'CollectionScene');

    // towerInfoOverlay를 강제로 null로 설정하고 ESC
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      s.towerInfoOverlay = null;
    });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // null 체크가 있으므로 에러 없이 기존 동작(씬 전환)이 실행되어야 함
    expect(errors).toEqual([]);
  });

  test('EC4: GameScene에서 towerPanel이 null일 때 ESC 안전 처리', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);

    // towerPanel을 강제로 null로 설정하고 ESC
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.towerPanel = null;
    });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // null 체크가 있으므로 에러 없이 _pauseGame()이 실행되어야 함
    expect(errors).toEqual([]);
  });

  test('EC5: 우선순위 테스트 - TowerInfoOverlay > pauseOverlay', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);
    await placeTower(page);

    // 일시정지 상태에서 타워 오버레이를 열기 (프로그래밍 방식)
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs._pauseGame();
    });
    await page.waitForTimeout(300);

    // 일시정지 상태에서 오버레이 열기 (비정상적이지만 가능한 상황)
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      if (gs.towers && gs.towers[0]) {
        gs.towerPanel.towerInfoOverlay.open(gs.towers[0]);
      }
    });
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        isPaused: gs.isPaused,
        overlayOpen: gs.towerPanel.isOverlayOpen(),
      };
    });
    expect(state.isPaused).toBe(true);
    expect(state.overlayOpen).toBe(true);

    // ESC -> TowerInfoOverlay가 먼저 닫혀야 함
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const afterFirst = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        isPaused: gs.isPaused,
        overlayOpen: gs.towerPanel.isOverlayOpen(),
      };
    });
    expect(afterFirst.overlayOpen).toBe(false); // 오버레이 닫힘
    expect(afterFirst.isPaused).toBe(true); // 아직 일시정지 유지

    // 두 번째 ESC -> pauseOverlay 닫힘 (재개)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const afterSecond = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        isPaused: gs.isPaused,
      };
    });
    expect(afterSecond.isPaused).toBe(false); // 재개됨

    await page.screenshot({ path: 'tests/screenshots/esc-priority-overlay-gt-pause.png' });
    expect(errors).toEqual([]);
  });

  test('EC6: 드릴다운 2단계 후 ESC 순차 처리', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterMergeCodex(page, 'CollectionScene');
    await openCodexOverlay(page, 2, 0);

    // 2단계 드릴다운
    const drillResult = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      const overlay = s.towerInfoOverlay;
      const entry = s._tierDataCache[2][0];
      const parts = entry.recipeKey.split('+');
      const mat1Entry = overlay._buildEntryFromConfig(parts[0]);
      overlay._history.push(entry);
      overlay._render(mat1Entry);
      // mat1이 T1이면 더 이상 드릴다운 불가, T2+면 가능
      return { tier: mat1Entry ? mat1Entry.tier : 0, histLen: overlay._history.length };
    });
    await page.waitForTimeout(300);

    // 첫 ESC: 이전 타워로 돌아감
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const afterFirst = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return {
        isOpen: s.towerInfoOverlay.isOpen(),
        histLen: s.towerInfoOverlay._history.length,
      };
    });
    expect(afterFirst.isOpen).toBe(true);
    expect(afterFirst.histLen).toBe(0);

    // 두 번째 ESC: 오버레이 닫힘
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const afterSecond = await page.evaluate(() => {
      const s = window.__game.scene.getScene('MergeCodexScene');
      return s.towerInfoOverlay.isOpen();
    });
    expect(afterSecond).toBe(false);

    // 씬은 여전히 MergeCodexScene (오버레이 닫힌 직후이므로)
    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('MergeCodexScene');

    expect(errors).toEqual([]);
  });

  test('EC7: GameScene 오버레이 닫기 후 즉시 ESC -> 일시정지 활성화', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);
    await placeTower(page);
    await selectTowerInGame(page, 0);

    // 첫 ESC: 오버레이 닫기
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const midState = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return {
        overlayOpen: gs.towerPanel.isOverlayOpen(),
        isPaused: gs.isPaused,
      };
    });
    expect(midState.overlayOpen).toBe(false);
    expect(midState.isPaused).toBe(false);

    // 두 번째 ESC: 일시정지
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const afterState = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return gs.isPaused;
    });
    expect(afterState).toBe(true);

    expect(errors).toEqual([]);
  });

  test('EC8: GameScene 일시정지 -> 재개 -> 일시정지 반복', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);

    // 3회 일시정지/재개 반복
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const paused = await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        return gs.isPaused;
      });
      expect(paused).toBe(true);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const resumed = await page.evaluate(() => {
        const gs = window.__game.scene.getScene('GameScene');
        return gs.isPaused;
      });
      expect(resumed).toBe(false);
    }

    expect(errors).toEqual([]);
  });

  test('EC9: MergeCodexScene fromScene=GameScene -> 오버레이 닫힌 상태 ESC -> wake GameScene', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);

    // GameScene에서 MergeCodexScene 열기 (일시정지 중)
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs._pauseGame();
      gs.scene.launch('MergeCodexScene', { fromScene: 'GameScene' });
      gs.scene.sleep('GameScene');
    });
    await page.waitForFunction(() => {
      const g = window.__game;
      const scenes = g.scene.getScenes(true);
      return scenes.length > 0 && scenes[0].sys.settings.key === 'MergeCodexScene';
    }, { timeout: 5000 });
    await page.waitForTimeout(500);

    // 오버레이 없이 ESC -> GameScene wake
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('GameScene');

    expect(errors).toEqual([]);
  });

  test('EC10: isGameOver 상태에서 ESC -> 일시정지 안됨', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await enterGameScene(page);

    // isGameOver를 true로 설정
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.isGameOver = true;
    });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 일시정지되지 않아야 함
    const isPaused = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      return gs.isPaused;
    });
    expect(isPaused).toBe(false);

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 6. 시각적 검증
// ══════════════════════════════════════════════════════════════════

test.describe('시각적 검증', () => {

  test('MergeCodexScene 오버레이가 열린 상태에서 스크린샷', async ({ page }) => {
    await waitForMenuScene(page);
    await enterMergeCodex(page);
    await openCodexOverlay(page, 1, 0);

    await page.screenshot({ path: 'tests/screenshots/esc-visual-codex-overlay-open.png' });

    // ESC로 닫기
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'tests/screenshots/esc-visual-codex-overlay-after-esc.png' });
  });

  test('GameScene 일시정지 -> ESC 재개 스크린샷', async ({ page }) => {
    await waitForMenuScene(page);
    await enterGameScene(page);

    // 일시정지
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/esc-visual-game-paused.png' });

    // ESC로 재개
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/esc-visual-game-resumed.png' });
  });
});


// ══════════════════════════════════════════════════════════════════
// 7. 회귀 테스트 - 기존 동작 보존 확인
// ══════════════════════════════════════════════════════════════════

test.describe('회귀 테스트 - 기존 ESC 동작 보존', () => {

  test('REG1: WorldSelectScene -> ESC -> MenuScene', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await page.evaluate(() => {
      const g = window.__game;
      const active = g.scene.getScenes(true);
      if (active.length > 0) {
        active[0].scene.start('WorldSelectScene');
      }
    });
    await page.waitForFunction(() => {
      const g = window.__game;
      const scenes = g.scene.getScenes(true);
      return scenes.length > 0 && scenes[0].sys.settings.key === 'WorldSelectScene';
    }, { timeout: 5000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('MenuScene');
    expect(errors).toEqual([]);
  });

  test('REG2: LevelSelectScene -> ESC -> WorldSelectScene', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await page.evaluate(() => {
      const g = window.__game;
      const active = g.scene.getScenes(true);
      if (active.length > 0) {
        active[0].scene.start('LevelSelectScene', { worldId: 'forest' });
      }
    });
    await page.waitForFunction(() => {
      const g = window.__game;
      const scenes = g.scene.getScenes(true);
      return scenes.length > 0 && scenes[0].sys.settings.key === 'LevelSelectScene';
    }, { timeout: 5000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('WorldSelectScene');
    expect(errors).toEqual([]);
  });

  test('REG3: StatsScene -> ESC -> MenuScene', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);
    await page.evaluate(() => {
      const g = window.__game;
      const active = g.scene.getScenes(true);
      if (active.length > 0) {
        active[0].scene.start('StatsScene');
      }
    });
    await page.waitForFunction(() => {
      const g = window.__game;
      const scenes = g.scene.getScenes(true);
      return scenes.length > 0 && scenes[0].sys.settings.key === 'StatsScene';
    }, { timeout: 5000 });
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('MenuScene');
    expect(errors).toEqual([]);
  });

  test('REG4: MenuScene -> ESC -> 종료 다이얼로그', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const isOpen = await page.evaluate(() => window.__isExitDialogOpen);
    expect(isOpen).toBe(true);

    const sceneKey = await getActiveSceneKey(page);
    expect(sceneKey).toBe('MenuScene');

    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 8. 콘솔 에러 통합 검증
// ══════════════════════════════════════════════════════════════════

test.describe('콘솔 에러 통합 검증', () => {

  test('전체 ESC 시나리오 흐름에서 JS 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await waitForMenuScene(page);

    // 1. MenuScene -> ESC (다이얼로그)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // 닫기 (오버레이 클릭)
    const overlayPos = await page.evaluate(() => {
      const g = window.__game;
      const canvas = g.canvas;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / 360;
      const scaleY = rect.height / 640;
      return { x: rect.left + 20 * scaleX, y: rect.top + 20 * scaleY };
    });
    await page.mouse.click(overlayPos.x, overlayPos.y);
    await page.waitForTimeout(300);

    // 2. CollectionScene -> ESC -> MenuScene
    await page.evaluate(() => {
      const g = window.__game;
      g.scene.getScenes(true)[0].scene.start('CollectionScene');
    });
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 3. MergeCodexScene + overlay -> ESC -> 오버레이 닫힘 -> ESC -> CollectionScene
    await enterMergeCodex(page, 'CollectionScene');
    await openCodexOverlay(page, 1, 0);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});
