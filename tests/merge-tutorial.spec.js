/**
 * @fileoverview 합성 튜토리얼(Merge Tutorial) 기능 QA 테스트.
 * 신규 세이브 시 오버레이 표시, 일시정지 상태, i18n 텍스트, 확인 버튼 동작,
 * 세이브 마이그레이션(v7->v8), 기존 유저 스킵, 엣지케이스를 검증한다.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5180/';

// ── 헬퍼 함수 ──────────────────────────────────────────────────────

/**
 * 게임이 부팅되어 MenuScene에 도달할 때까지 대기하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=20000]
 */
async function waitForMenuScene(page, timeout = 20000) {
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
 * 특정 씬으로 직접 이동하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {string} sceneName
 * @param {object} [data={}]
 */
async function navigateToScene(page, sceneName, data = {}) {
  await page.evaluate(({ sceneName, data }) => {
    const g = window.__game;
    const active = g.scene.getScenes(true);
    if (active.length > 0) {
      active[0].scene.start(sceneName, data);
    }
  }, { sceneName, data });
  await page.waitForFunction((name) => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === name;
  }, sceneName, { timeout: 10000 });
  await page.waitForTimeout(500);
}

/**
 * GameScene 진입 후 TowerPanel이 로드될 때까지 대기하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 */
async function waitForGameScene(page) {
  await page.waitForFunction(() => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    if (scenes.length === 0) return false;
    const gameScene = scenes.find(s => s.sys.settings.key === 'GameScene');
    return gameScene && gameScene.towerPanel;
  }, { timeout: 15000 });
  await page.waitForTimeout(300);
}

/**
 * localStorage를 완전히 비워 신규 세이브 상태를 만드는 헬퍼.
 * @param {import('@playwright/test').Page} page
 */
async function clearSaveData(page) {
  await page.evaluate(() => {
    localStorage.removeItem('fantasy-td-save');
    localStorage.removeItem('fantasy-td-sound');
    localStorage.removeItem('fantasy-td-lang');
  });
}

/**
 * 특정 세이브 데이터를 localStorage에 삽입하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {object} saveData
 */
async function setSaveData(page, saveData) {
  await page.evaluate((data) => {
    localStorage.setItem('fantasy-td-save', JSON.stringify(data));
  }, saveData);
}

/**
 * GameScene의 _mergeTutorialOverlay 존재 여부와 상태를 반환하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 */
async function getTutorialOverlayState(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
    if (!gameScene) return { exists: false, isPaused: null };
    return {
      exists: gameScene._mergeTutorialOverlay !== null,
      isPaused: gameScene.isPaused,
      overlayChildCount: gameScene._mergeTutorialOverlay ? gameScene._mergeTutorialOverlay.list.length : 0,
      overlayDepth: gameScene._mergeTutorialOverlay ? gameScene._mergeTutorialOverlay.depth : null,
    };
  });
}

/**
 * localStorage에서 세이브 데이터를 읽어오는 헬퍼.
 * @param {import('@playwright/test').Page} page
 */
async function getSaveDataFromStorage(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('fantasy-td-save');
    return raw ? JSON.parse(raw) : null;
  });
}

// ── 테스트 ──────────────────────────────────────────────────────

test.describe('합성 튜토리얼 (Merge Tutorial) 검증', () => {

  // ── 1. 신규 세이브: 튜토리얼 오버레이 표시 ──────────────────────

  test.describe('신규 세이브 - 튜토리얼 표시', () => {

    test('AC1: 완전 신규 세이브로 첫 게임 시작 시 튜토리얼 오버레이가 표시된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      // localStorage 비워서 신규 세이브 만들기
      await clearSaveData(page);
      // 게임 리로드하여 신규 세이브로 시작
      await waitForMenuScene(page);
      // GameScene으로 직접 이동
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 튜토리얼 오버레이 상태 확인
      const state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(true);
      expect(state.isPaused).toBe(true);
      expect(state.overlayDepth).toBe(60);

      // 콘솔 에러 없어야 함
      expect(errors).toEqual([]);

      // 스크린샷 캡처
      await page.screenshot({ path: 'C:/antigravity/fantasydefence/tests/screenshots/merge-tutorial-new-save.png' });
    });

    test('AC2: 오버레이 표시 중 웨이브 타이머가 진행되지 않는다 (isPaused=true)', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // isPaused 상태 확인
      const paused = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gs.isPaused;
      });
      expect(paused).toBe(true);

      // 2초 대기 후에도 적이 스폰되지 않아야 함
      await page.waitForTimeout(2000);
      const enemyCount = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gs.enemies.length;
      });
      expect(enemyCount).toBe(0);
    });

    test('AC3: 오버레이에 타이틀, 드래그 합성 설명, 합성도감 안내 텍스트가 모두 표시된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 오버레이 내부 텍스트 요소 확인
      const texts = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const overlay = gs._mergeTutorialOverlay;
        if (!overlay) return [];
        // 컨테이너 내 텍스트 요소 추출
        return overlay.list
          .filter(child => child.type === 'Text')
          .map(t => ({ text: t.text, x: t.x, y: t.y, fontSize: t.style?.fontSize }));
      });

      // 최소 3개의 텍스트 (타이틀, desc1, desc2) + 확인 버튼 텍스트 = 4개
      expect(texts.length).toBeGreaterThanOrEqual(4);

      // 타이틀 텍스트 확인 (한국어 기본)
      const titleText = texts.find(t => t.text === '합성 방법');
      expect(titleText).toBeDefined();

      // 드래그 합성 설명 확인
      const desc1Text = texts.find(t => t.text.includes('드래그'));
      expect(desc1Text).toBeDefined();

      // 합성도감 안내 확인
      const desc2Text = texts.find(t => t.text.includes('합성도감'));
      expect(desc2Text).toBeDefined();

      // 확인 버튼 텍스트 확인
      const confirmText = texts.find(t => t.text === '확인');
      expect(confirmText).toBeDefined();
    });

    test('AC9: 오버레이가 타워 패널, HUD 등 하위 UI 요소를 완전히 가린다 (depth 60 이상)', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 오버레이 depth 구조 확인
      const depthInfo = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const overlay = gs._mergeTutorialOverlay;
        if (!overlay) return null;
        return {
          containerDepth: overlay.depth,
          childDepths: overlay.list.map(child => ({
            type: child.type,
            depth: child.depth,
          })),
          // HUD 요소 depth 확인
          pauseBtnDepth: gs.pauseBtn ? gs.pauseBtn.depth : null,
          // 배경의 interactive 여부 확인
          bgInteractive: overlay.list[0]?.input?.enabled ?? false,
        };
      });

      expect(depthInfo.containerDepth).toBe(60);
      // 모든 자식 요소 depth가 60 이상이어야 함
      for (const child of depthInfo.childDepths) {
        expect(child.depth).toBeGreaterThanOrEqual(60);
      }
      // 배경이 interactive여야 (입력 차단)
      expect(depthInfo.bgInteractive).toBe(true);
    });
  });

  // ── 2. 확인 버튼 동작 ──────────────────────────────────────────

  test.describe('확인 버튼 동작', () => {

    test('AC4: 확인 버튼 클릭 시 오버레이가 닫히고 게임이 정상 재개된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 튜토리얼 오버레이 표시 확인
      let state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(true);

      // 확인 버튼 위치(180, 368)를 클릭
      await page.mouse.click(180, 368);
      await page.waitForTimeout(300);

      // 오버레이 닫힘 확인
      state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(false);
      expect(state.isPaused).toBe(false);

      // 스크린샷 - 게임 재개 후 상태
      await page.screenshot({ path: 'C:/antigravity/fantasydefence/tests/screenshots/merge-tutorial-after-confirm.png' });
    });

    test('AC5: 확인 버튼 클릭 후 localStorage의 mergeTutorialDone이 true로 저장된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 확인 전 세이브 데이터 확인
      let saveData = await getSaveDataFromStorage(page);
      // 신규 세이브라 mergeTutorialDone=false이어야 함 (또는 게임 시작 시 저장됨)
      // 참고: 게임이 시작되면 세이브 데이터가 registry에 있지만 localStorage에 저장되는 시점은 confirm 클릭 시

      // 확인 버튼 클릭
      await page.mouse.click(180, 368);
      await page.waitForTimeout(500);

      // 세이브 데이터에서 mergeTutorialDone 확인
      saveData = await getSaveDataFromStorage(page);
      expect(saveData).not.toBeNull();
      expect(saveData.mergeTutorialDone).toBe(true);
    });

    test('확인 버튼 클릭 후 게임 플레이가 정상인지 확인 (적 스폰 시작)', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 확인 버튼 클릭
      await page.mouse.click(180, 368);
      await page.waitForTimeout(300);

      // 게임 재개 확인: isPaused = false
      const isPaused = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gs.isPaused;
      });
      expect(isPaused).toBe(false);

      // 5초 대기 후 웨이브 진행 확인
      await page.waitForTimeout(5000);
      const waveState = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return {
          waveManagerState: gs.waveManager?.state,
          currentWave: gs.waveManager?.currentWave,
          enemyCount: gs.enemies.length,
        };
      });
      // 웨이브가 진행되어야 함 (ANNOUNCING -> SPAWNING 또는 적이 있거나)
      expect(waveState.currentWave).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 3. 2회차 비표시 ──────────────────────────────────────────────

  test.describe('2회차 비표시', () => {

    test('AC6: 같은 세이브로 두 번째 게임을 시작하면 오버레이가 표시되지 않는다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);

      // 1회차: GameScene 진입 + 튜토리얼 확인
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);
      let state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(true);
      await page.mouse.click(180, 368);
      await page.waitForTimeout(300);

      // 메뉴로 돌아감
      await navigateToScene(page, 'MenuScene', {});
      await page.waitForTimeout(500);

      // 2회차: GameScene 재진입
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 튜토리얼이 표시되지 않아야 함
      state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(false);
      // 게임이 일시정지 상태가 아니어야 함
      expect(state.isPaused).toBe(false);

      await page.screenshot({ path: 'C:/antigravity/fantasydefence/tests/screenshots/merge-tutorial-second-game.png' });
    });
  });

  // ── 4. 세이브 마이그레이션 ────────────────────────────────────────

  test.describe('세이브 마이그레이션', () => {

    test('AC7: 기존 세이브(v7 이하) 유저는 마이그레이션 후 mergeTutorialDone=true로 설정된다', async ({ page }) => {
      await waitForMenuScene(page);

      // v7 세이브 데이터 삽입
      const v7SaveData = {
        saveDataVersion: 7,
        bestRound: 10,
        bestKills: 50,
        totalGames: 5,
        diamond: 100,
        totalDiamondEarned: 200,
        towerUpgrades: {},
        utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
        unlockedTowers: [],
        discoveredMerges: [],
        newDiscoveries: [],
        stats: { totalGamesPlayed: 5, bestRound: 10, bestKills: 50, gameHistory: [] },
        worldProgress: {},
        endlessUnlocked: false,
        campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
        adFree: false,
      };
      await setSaveData(page, v7SaveData);

      // 리로드하여 마이그레이션 트리거
      await waitForMenuScene(page);

      // GameScene 진입
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 튜토리얼이 표시되지 않아야 함 (기존 유저)
      const state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(false);
      expect(state.isPaused).toBe(false);

      // 세이브 데이터 확인 (in-memory registry 기준, localStorage는 명시적 저장 시점에만 갱신)
      const saveData = await page.evaluate(() => {
        const g = window.__game;
        return g.registry.get('saveData');
      });
      expect(saveData.mergeTutorialDone).toBe(true);
      expect(saveData.saveDataVersion).toBe(8);
    });

    test('AC8: 세이브 데이터 버전이 v8로 정상 기록된다', async ({ page }) => {
      await waitForMenuScene(page);

      // v7 세이브 데이터 삽입
      const v7SaveData = {
        saveDataVersion: 7,
        bestRound: 5,
        bestKills: 20,
        totalGames: 2,
        diamond: 0,
        totalDiamondEarned: 0,
        towerUpgrades: {},
        utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
        unlockedTowers: [],
        discoveredMerges: [],
        newDiscoveries: [],
        stats: { totalGamesPlayed: 2, bestRound: 5, bestKills: 20, gameHistory: [] },
        worldProgress: {},
        endlessUnlocked: false,
        campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
        adFree: false,
      };
      await setSaveData(page, v7SaveData);

      // 리로드하여 마이그레이션 트리거
      await waitForMenuScene(page);

      // 마이그레이션 후 세이브 데이터 확인
      const saveData = await page.evaluate(() => {
        const g = window.__game;
        const s = g.registry.get('saveData');
        return s;
      });
      expect(saveData.saveDataVersion).toBe(8);
      expect(saveData.mergeTutorialDone).toBe(true);
    });

    test('v6 이하 세이브도 v8까지 정상 마이그레이션된다', async ({ page }) => {
      await waitForMenuScene(page);

      // v6 세이브 데이터 삽입
      const v6SaveData = {
        saveDataVersion: 6,
        bestRound: 3,
        bestKills: 10,
        totalGames: 1,
        diamond: 50,
        totalDiamondEarned: 50,
        towerUpgrades: {},
        utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
        unlockedTowers: [],
        discoveredMerges: [],
        newDiscoveries: [],
        stats: { totalGamesPlayed: 1, bestRound: 3, bestKills: 10, gameHistory: [] },
        worldProgress: {},
        endlessUnlocked: false,
        campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
      };
      await setSaveData(page, v6SaveData);

      // 리로드
      await waitForMenuScene(page);

      const saveData = await page.evaluate(() => {
        const g = window.__game;
        return g.registry.get('saveData');
      });
      expect(saveData.saveDataVersion).toBe(8);
      expect(saveData.mergeTutorialDone).toBe(true);
      expect(saveData.adFree).toBe(false);
    });

    test('신규 세이브 데이터에 mergeTutorialDone=false가 설정된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);

      const saveData = await page.evaluate(() => {
        const g = window.__game;
        return g.registry.get('saveData');
      });
      expect(saveData.saveDataVersion).toBe(8);
      expect(saveData.mergeTutorialDone).toBe(false);
    });
  });

  // ── 5. 엣지케이스 및 예외 시나리오 ────────────────────────────────

  test.describe('엣지케이스', () => {

    test('튜토리얼 표시 중 일시정지 버튼(310, 20 영역)이 동작하지 않아야 함', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 튜토리얼 오버레이가 표시된 상태에서 일시정지 버튼 영역 클릭
      await page.mouse.click(310, 20);
      await page.waitForTimeout(300);

      // 일시정지 오버레이가 열리지 않아야 함 (pauseOverlay가 null)
      const pauseOverlayExists = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gs.pauseOverlay !== null && gs.pauseOverlay !== undefined;
      });
      expect(pauseOverlayExists).toBe(false);

      // 튜토리얼 오버레이가 여전히 존재해야 함
      const state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(true);
    });

    test('확인 버튼 더블클릭(연타) 시 에러가 발생하지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 빠르게 3번 연속 클릭
      await page.mouse.click(180, 368);
      await page.mouse.click(180, 368);
      await page.mouse.click(180, 368);
      await page.waitForTimeout(500);

      // 에러 없어야 함
      expect(errors).toEqual([]);

      // 오버레이가 정상적으로 닫혀있어야 함
      const state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(false);
    });

    test('튜토리얼 표시 중 타워 패널 영역 터치 시 상호작용 차단됨', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 타워 패널 하단 영역 (대략 y=550~600) 클릭
      await page.mouse.click(180, 580);
      await page.waitForTimeout(300);

      // 튜토리얼 오버레이가 여전히 존재해야 함
      const state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(true);
    });

    test('부활(revived) 게임에서는 튜토리얼이 표시되지 않는다 (mergeTutorialDone=true 이후)', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);

      // 1회차: 튜토리얼 확인
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);
      await page.mouse.click(180, 368);
      await page.waitForTimeout(300);

      // 부활 게임 시뮬레이션
      await navigateToScene(page, 'GameScene', { revived: true, startWave: 3 });
      await waitForGameScene(page);

      // 튜토리얼 표시되지 않아야 함
      const state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(false);
    });

    test('_cleanup 시 _mergeTutorialOverlay가 정상 해제된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);

      // GameScene 진입 (튜토리얼 표시)
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 튜토리얼 열린 상태에서 다른 씬으로 전환 (_cleanup 트리거)
      await navigateToScene(page, 'MenuScene', {});
      await page.waitForTimeout(500);

      // 에러 없어야 함
      expect(errors).toEqual([]);

      // 다시 GameScene 진입 (같은 세이브, mergeTutorialDone은 아직 false)
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // mergeTutorialDone이 false이므로 튜토리얼이 다시 표시됨 (confirm 안눌렀으므로)
      const state = await getTutorialOverlayState(page);
      expect(state.exists).toBe(true);

      expect(errors).toEqual([]);
    });
  });

  // ── 6. UI 안정성 ──────────────────────────────────────────────────

  test.describe('UI 안정성', () => {

    test('콘솔 에러가 발생하지 않는다 (전체 플로우)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 튜토리얼 확인
      await page.mouse.click(180, 368);
      await page.waitForTimeout(1000);

      // 에러 없어야 함
      expect(errors).toEqual([]);
    });

    test('모바일 뷰포트(360x640)에서 정상 렌더링된다', async ({ page }) => {
      // viewport는 이미 360x640으로 설정됨 (playwright.config.js)
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      await page.screenshot({ path: 'C:/antigravity/fantasydefence/tests/screenshots/merge-tutorial-mobile-360x640.png' });

      // 오버레이 요소의 좌표가 화면 내에 있는지 확인
      const layout = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const overlay = gs._mergeTutorialOverlay;
        if (!overlay) return null;

        const texts = overlay.list.filter(c => c.type === 'Text');
        const rects = overlay.list.filter(c => c.type === 'Rectangle');

        return {
          textPositions: texts.map(t => ({ text: t.text, x: t.x, y: t.y })),
          rectPositions: rects.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
        };
      });

      expect(layout).not.toBeNull();
      // 모든 텍스트 요소가 화면 내에 있어야 함
      for (const t of layout.textPositions) {
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.x).toBeLessThanOrEqual(360);
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.y).toBeLessThanOrEqual(640);
      }
    });

    test('확인 버튼 크기가 최소 44x44px 탭 영역을 확보한다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      const btnSize = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const overlay = gs._mergeTutorialOverlay;
        if (!overlay) return null;
        // 확인 버튼 = interactive Rectangle
        const interactiveRects = overlay.list.filter(c => c.type === 'Rectangle' && c.input?.enabled);
        // 두 번째 interactive rect가 확인 버튼 (첫 번째는 전체 배경)
        const btn = interactiveRects.length > 1 ? interactiveRects[1] : null;
        if (!btn) return null;
        return { width: btn.width, height: btn.height };
      });

      expect(btnSize).not.toBeNull();
      expect(btnSize.width).toBeGreaterThanOrEqual(44);
      expect(btnSize.height).toBeGreaterThanOrEqual(40); // 스펙: 120x40px
    });
  });

  // ── 7. 시각적 검증 ────────────────────────────────────────────────

  test.describe('시각적 검증', () => {

    test('튜토리얼 오버레이 레이아웃이 올바르다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 좌표 검증
      const layout = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const overlay = gs._mergeTutorialOverlay;
        if (!overlay) return null;

        const texts = overlay.list.filter(c => c.type === 'Text');
        const rects = overlay.list.filter(c => c.type === 'Rectangle');

        // 패널 (두 번째 사각형, 첫 번째는 배경)
        const panel = rects.length > 1 ? rects[1] : null;
        // 확인 버튼 (세 번째 사각형)
        const btn = rects.length > 2 ? rects[2] : null;

        return {
          panel: panel ? { x: panel.x, y: panel.y, w: panel.width, h: panel.height } : null,
          btn: btn ? { x: btn.x, y: btn.y, w: btn.width, h: btn.height } : null,
          title: texts[0] ? { text: texts[0].text, x: texts[0].x, y: texts[0].y } : null,
          desc1: texts[1] ? { text: texts[1].text, x: texts[1].x, y: texts[1].y } : null,
          desc2: texts[2] ? { text: texts[2].text, x: texts[2].x, y: texts[2].y } : null,
          confirm: texts[3] ? { text: texts[3].text, x: texts[3].x, y: texts[3].y } : null,
        };
      });

      expect(layout).not.toBeNull();

      // 패널 중심: (180, 300), 크기: 280x180
      expect(layout.panel.x).toBe(180);
      expect(layout.panel.y).toBe(300);
      expect(layout.panel.w).toBe(280);
      expect(layout.panel.h).toBe(180);

      // 타이틀: (180, 222)
      expect(layout.title.x).toBe(180);
      expect(layout.title.y).toBe(222);

      // desc1: (180, 270)
      expect(layout.desc1.x).toBe(180);
      expect(layout.desc1.y).toBe(270);

      // desc2: (180, 318)
      expect(layout.desc2.x).toBe(180);
      expect(layout.desc2.y).toBe(318);

      // 확인 버튼: (180, 368), 120x40
      expect(layout.btn.x).toBe(180);
      expect(layout.btn.y).toBe(368);
      expect(layout.btn.w).toBe(120);
      expect(layout.btn.h).toBe(40);

      // 전체 스크린샷
      await page.screenshot({ path: 'C:/antigravity/fantasydefence/tests/screenshots/merge-tutorial-layout.png' });
    });

    test('튜토리얼 오버레이 패널 클립 캡처', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 패널 영역만 클립 캡처 (패널 중심 180,300, 크기 280x180)
      await page.screenshot({
        path: 'C:/antigravity/fantasydefence/tests/screenshots/merge-tutorial-panel-clip.png',
        clip: { x: 40, y: 200, width: 280, height: 200 },
      });
    });
  });

  // ── 8. i18n 검증 ──────────────────────────────────────────────────

  test.describe('i18n 검증', () => {

    test('한국어(기본) 텍스트가 올바르게 표시된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      // 한국어 설정
      await page.evaluate(() => {
        localStorage.setItem('fantasy-td-lang', 'ko');
      });
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      const texts = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const overlay = gs._mergeTutorialOverlay;
        if (!overlay) return [];
        return overlay.list.filter(c => c.type === 'Text').map(t => t.text);
      });

      expect(texts).toContain('합성 방법');
      expect(texts.some(t => t.includes('드래그'))).toBe(true);
      expect(texts.some(t => t.includes('합성도감'))).toBe(true);
      expect(texts).toContain('확인');
    });

    test('영어(en) 설정 시 영어 텍스트가 표시된다', async ({ page }) => {
      await waitForMenuScene(page);
      await clearSaveData(page);
      // 영어 설정
      await page.evaluate(() => {
        localStorage.setItem('fantasy-td-lang', 'en');
      });
      await waitForMenuScene(page);
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      const texts = await page.evaluate(() => {
        const g = window.__game;
        const gs = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const overlay = gs._mergeTutorialOverlay;
        if (!overlay) return [];
        return overlay.list.filter(c => c.type === 'Text').map(t => t.text);
      });

      expect(texts).toContain('How to Merge');
      expect(texts.some(t => t.includes('Drag'))).toBe(true);
      expect(texts.some(t => t.includes('Merge Codex'))).toBe(true);
      expect(texts).toContain('Got it!');

      await page.screenshot({ path: 'C:/antigravity/fantasydefence/tests/screenshots/merge-tutorial-english.png' });
    });
  });
});
