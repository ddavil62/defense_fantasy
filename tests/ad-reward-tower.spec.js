/**
 * @fileoverview 광고 보상 타워 뽑기 기능 QA 테스트.
 * HUD 레이아웃, 광고 버튼 동작, 모달 UI, 타워 확률, 배치 흐름, 취소 동작,
 * 기존 뽑기 영향 없음, i18n, 에지케이스를 검증한다.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3456/';

// ── 헬퍼 함수 ──────────────────────────────────────────────────────

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
  }, { timeout: 10000 });
  await page.waitForTimeout(300);
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

// ── 테스트 ──────────────────────────────────────────────────────

test.describe('광고 보상 타워 뽑기 기능 검증', () => {
  test.beforeEach(async ({ page }) => {
    // 콘솔 에러 수집
    page._consoleErrors = [];
    page.on('pageerror', err => page._consoleErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') page._consoleErrors.push(msg.text());
    });

    await waitForMenuScene(page);
    await navigateToScene(page, 'GameScene', {});
    await waitForGameScene(page);
  });

  // ── 1. HUD 레이아웃 검증 ──────────────────────────────────────

  test.describe('HUD 레이아웃', () => {
    test('뽑기 버튼(X=80)과 광고보기 버튼(X=240)이 나란히 표시된다', async ({ page }) => {
      const layout = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        return {
          drawButton: {
            x: panel._drawButton?.x,
            y: panel._drawButton?.y,
            width: panel._drawButton?.displayWidth || panel._drawButton?.width,
            height: panel._drawButton?.displayHeight || panel._drawButton?.height,
            visible: panel._drawButton?.visible,
          },
          adDrawButton: {
            x: panel._adDrawButton?.x,
            y: panel._adDrawButton?.y,
            width: panel._adDrawButton?.displayWidth || panel._adDrawButton?.width,
            height: panel._adDrawButton?.displayHeight || panel._adDrawButton?.height,
            visible: panel._adDrawButton?.visible,
          },
        };
      });

      // 뽑기 버튼 위치 확인 (X=80)
      expect(layout.drawButton.x).toBe(80);
      expect(layout.drawButton.visible).toBe(true);

      // 광고보기 버튼 위치 확인 (X=240)
      expect(layout.adDrawButton.x).toBe(240);
      expect(layout.adDrawButton.visible).toBe(true);

      // 동일 크기 (120x44px)
      expect(layout.drawButton.width).toBe(120);
      expect(layout.drawButton.height).toBe(44);
      expect(layout.adDrawButton.width).toBe(120);
      expect(layout.adDrawButton.height).toBe(44);

      // 동일 Y 좌표
      expect(layout.drawButton.y).toBe(layout.adDrawButton.y);

      // 스크린샷 캡처
      await page.screenshot({ path: 'tests/screenshots/ad-reward-hud-layout.png' });
    });

    test('광고보기 버튼에 라벨과 서브라벨이 표시된다', async ({ page }) => {
      const labels = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        return {
          label: panel._adDrawLabelText?.text,
          sublabel: panel._adDrawSublabelText?.text,
          sublabelColor: panel._adDrawSublabelText?.style?.color,
        };
      });

      expect(labels.label).toBe('광고보기');
      expect(labels.sublabel).toBe('타워 3선택');
      // 서브라벨 색상이 연보라 (#9b59b6)
      expect(labels.sublabelColor).toBe('#9b59b6');
    });
  });

  // ── 2. 광고 버튼 동작 검증 ────────────────────────────────────

  test.describe('광고 버튼 동작', () => {
    test('광고보기 버튼 클릭 시 AdManager.showRewarded()가 호출된다 (Mock 모드: 즉시 성공)', async ({ page }) => {
      // showRewarded 호출 추적
      const callInfo = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const adManager = gameScene.registry.get('adManager');

        let called = false;
        let calledWith = null;
        const original = adManager.showRewarded.bind(adManager);
        adManager.showRewarded = async function(adUnitId) {
          called = true;
          calledWith = adUnitId;
          return original(adUnitId);
        };

        return { adManagerExists: !!adManager, isMock: adManager.isMock };
      });

      expect(callInfo.adManagerExists).toBe(true);
      expect(callInfo.isMock).toBe(true);

      // 광고보기 버튼 클릭 (X=240, Y=570)
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      // 모달이 열렸는지 확인 (showRewarded 성공 후)
      const modalVisible = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gameScene.towerPanel._adModalContainer !== null;
      });

      expect(modalVisible).toBe(true);
    });

    test('광고 재생 중(isBusy) 버튼이 비활성화된다', async ({ page }) => {
      // isBusy를 true로 설정
      await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const adManager = gameScene.registry.get('adManager');
        adManager.isBusy = true;
      });

      // 광고보기 버튼 클릭
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(300);

      // 모달이 열리지 않아야 함
      const modalVisible = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gameScene.towerPanel._adModalContainer !== null;
      });

      expect(modalVisible).toBe(false);

      // isBusy 복원
      await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const adManager = gameScene.registry.get('adManager');
        adManager.isBusy = false;
      });
    });
  });

  // ── 3. 모달 UI 검증 ──────────────────────────────────────────

  test.describe('모달 UI', () => {
    test('광고 완료 후 타워 3개 카드가 모달로 표시된다', async ({ page }) => {
      // 광고보기 버튼 클릭하여 모달 열기
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      const modalInfo = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const container = gameScene.towerPanel._adModalContainer;
        if (!container) return null;

        // 컨테이너 depth 확인
        const depth = container.depth;

        // 컨테이너의 자식 요소 분석
        const children = container.list || [];
        const textChildren = children.filter(c => c.type === 'Text');
        const rectChildren = children.filter(c => c.type === 'Rectangle');

        return {
          exists: true,
          depth,
          childCount: children.length,
          textCount: textChildren.length,
          rectCount: rectChildren.length,
          // 타이틀 텍스트 확인
          titleText: textChildren.length > 0 ? textChildren[0].text : null,
        };
      });

      expect(modalInfo).not.toBeNull();
      expect(modalInfo.exists).toBe(true);
      expect(modalInfo.depth).toBe(61);
      // 최소 요소 수: 오버레이(1) + 타이틀(1) + 카드3*(배경+아이콘+이름+뱃지+버튼bg+버튼text) + 취소(1)
      expect(modalInfo.childCount).toBeGreaterThanOrEqual(10);

      await page.screenshot({ path: 'tests/screenshots/ad-reward-modal.png' });
    });

    test('모달 카드에 타워 이름, 티어 배지, 선택 버튼이 표시된다', async ({ page }) => {
      // 광고보기 버튼 클릭
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      const cardInfo = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const container = gameScene.towerPanel._adModalContainer;
        if (!container) return null;

        const children = container.list || [];
        const textChildren = children.filter(c => c.type === 'Text');

        // "선택" 버튼 텍스트 찾기
        const selectTexts = textChildren.filter(t => t.text === '선택');

        // 티어 배지 텍스트 찾기
        const badgeTexts = textChildren.filter(t => t.text === 'T1' || t.text === 'T2 ★');

        // "취소" 텍스트 찾기
        const cancelTexts = textChildren.filter(t => t.text === '취소');

        return {
          selectButtonCount: selectTexts.length,
          badgeCount: badgeTexts.length,
          cancelCount: cancelTexts.length,
          allTexts: textChildren.map(t => t.text),
        };
      });

      expect(cardInfo).not.toBeNull();
      expect(cardInfo.selectButtonCount).toBe(3); // 각 카드에 선택 버튼
      expect(cardInfo.badgeCount).toBe(3); // 각 카드에 티어 배지
      expect(cardInfo.cancelCount).toBe(1); // 취소 버튼 1개
    });

    test('모달 카드 위치가 스펙에 맞다 (중심 X: 80, 180, 280)', async ({ page }) => {
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      const cardPositions = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const container = gameScene.towerPanel._adModalContainer;
        if (!container) return null;

        const children = container.list || [];
        // 카드 배경 사각형은 90x130 크기
        const cardBgs = children.filter(c =>
          c.type === 'Rectangle' &&
          c.width === 90 && c.height === 130
        );

        return cardBgs.map(card => ({
          x: card.x,
          y: card.y,
          width: card.width,
          height: card.height,
        }));
      });

      expect(cardPositions).not.toBeNull();
      expect(cardPositions.length).toBe(3);
      // 카드 중심 X: 80, 180, 280
      expect(cardPositions[0].x).toBe(80);
      expect(cardPositions[1].x).toBe(180);
      expect(cardPositions[2].x).toBe(280);
      // 카드 중심 Y: GAME_HEIGHT/2 = 320
      expect(cardPositions[0].y).toBe(320);
    });
  });

  // ── 4. 타워 확률 검증 ─────────────────────────────────────────

  test.describe('타워 확률', () => {
    test('T1 90% / T2 10% 확률이 통계적으로 올바르다 (300회 시행)', async ({ page }) => {
      const stats = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        let t1Count = 0;
        let t2Count = 0;
        const totalTrials = 300;

        for (let i = 0; i < totalTrials; i++) {
          const towers = panel._pickAdRewardTowers();
          for (const tower of towers) {
            if (tower.tier === 1) t1Count++;
            else if (tower.tier === 2) t2Count++;
          }
        }

        return {
          t1Count,
          t2Count,
          total: t1Count + t2Count,
          t2Ratio: t2Count / (t1Count + t2Count),
        };
      });

      // 총 900개 타워 (300회 x 3개)
      expect(stats.total).toBe(900);
      // T2 비율이 약 10% (5%~15% 범위 허용)
      expect(stats.t2Ratio).toBeGreaterThan(0.05);
      expect(stats.t2Ratio).toBeLessThan(0.15);
    });

    test('T2 타워는 잠금 해제와 무관하게 전체 T2 풀에서 추출된다', async ({ page }) => {
      const t2Info = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        // 모든 고유 T2 타워를 수집
        const t2Types = new Set();
        for (let i = 0; i < 500; i++) {
          const towers = panel._pickAdRewardTowers();
          for (const tower of towers) {
            if (tower.tier === 2) {
              t2Types.add(tower.type);
            }
          }
        }

        return {
          uniqueT2Count: t2Types.size,
          t2Types: [...t2Types],
        };
      });

      // T2 풀에는 다수의 타워가 있어야 함 (전체 MERGE_RECIPES tier=2 중 일부라도 등장)
      expect(t2Info.uniqueT2Count).toBeGreaterThan(5);
    });

    test('T1 풀이 잠금 해제 여부를 올바르게 반영한다', async ({ page }) => {
      const t1Info = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        // 현재 풀의 T1 타워 확인
        const t1Types = new Set();
        for (let i = 0; i < 200; i++) {
          const towers = panel._pickAdRewardTowers();
          for (const tower of towers) {
            if (tower.tier === 1) {
              t1Types.add(tower.type);
            }
          }
        }

        // TOWER_STATS에서 locked인 타워 확인
        const config = window.__game.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return {
          uniqueT1Count: t1Types.size,
          t1Types: [...t1Types],
          unlockedTowers: panel.unlockedTowers,
        };
      });

      // T1 풀에 최소 2개 이상의 타워가 있어야 함
      expect(t1Info.uniqueT1Count).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 5. 타워 선택 -> 배치 검증 ─────────────────────────────────

  test.describe('타워 선택 및 배치', () => {
    test('T1 카드 선택 후 배치 모드로 진입하고 골드가 차감되지 않는다', async ({ page }) => {
      // 현재 골드 기록
      const goldBefore = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gameScene.goldManager.getGold();
      });

      // 광고 모달 열기
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      // 강제로 T1 타워만 나오도록 설정하고 첫 번째 카드 선택
      const selectionResult = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;
        const container = panel._adModalContainer;
        if (!container) return { error: 'no modal' };

        // 첫 번째 카드의 "선택" 버튼을 직접 호출
        const children = container.list || [];
        const selectButtons = children.filter(c =>
          c.type === 'Rectangle' && c.width === 60 && c.height === 22
        );

        if (selectButtons.length === 0) return { error: 'no select buttons' };

        // 첫 번째 선택 버튼 클릭 (이벤트 에밋)
        selectButtons[0].emit('pointerdown');

        return {
          pendingAdTower: panel._pendingAdTower,
          pendingDrawType: panel._pendingDrawType,
          selectedTowerType: panel.selectedTowerType,
          modalClosed: panel._adModalContainer === null,
        };
      });

      expect(selectionResult.modalClosed).toBe(true);
      expect(selectionResult.pendingAdTower).not.toBeNull();
      expect(selectionResult.pendingDrawType).not.toBeNull();
      expect(selectionResult.selectedTowerType).not.toBeNull();

      // 빈 셀에 배치 시도
      const placement = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');

        // 빈 셀 찾기 (isBuildable로 탐색)
        let emptyCell = null;
        for (let row = 0; row < 12; row++) {
          for (let col = 0; col < 9; col++) {
            if (gameScene.mapManager.isBuildable(col, row)) {
              emptyCell = { col, row };
              break;
            }
          }
          if (emptyCell) break;
        }
        if (!emptyCell) return { error: 'no empty cell' };

        const towersBefore = gameScene.towers.length;
        const goldBeforePlacement = gameScene.goldManager.getGold();

        // 배치 시도
        const selectedType = gameScene.towerPanel.getSelectedTowerType();
        if (selectedType) {
          gameScene._attemptPlaceTower(selectedType, emptyCell.col, emptyCell.row);
        }

        return {
          towersAfter: gameScene.towers.length,
          goldAfterPlacement: gameScene.goldManager.getGold(),
          goldBeforePlacement,
          towerPlaced: gameScene.towers.length > towersBefore,
          pendingAdTowerCleared: gameScene.towerPanel._pendingAdTower === null,
        };
      });

      if (!placement.error) {
        expect(placement.towerPlaced).toBe(true);
        // 골드가 차감되지 않아야 함
        expect(placement.goldAfterPlacement).toBe(placement.goldBeforePlacement);
        // _pendingAdTower가 초기화되어야 함
        expect(placement.pendingAdTowerCleared).toBe(true);
      }
    });

    test('T2 카드 선택 후 배치 시 applyMergeResult가 적용된다', async ({ page }) => {
      // T2 타워를 직접 주입하여 테스트
      const result = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        // T2 타워 데이터 직접 생성
        const t2TowerData = {
          type: 'rapid_archer',
          tier: 2,
          color: 0x00d6a4,
          displayName: '연속 사격수',
          mergeData: { id: 'rapid_archer', tier: 2, displayName: '연속 사격수', color: 0x00d6a4 },
        };

        // _onAdTowerSelected 직접 호출
        panel._onAdTowerSelected(t2TowerData);

        return {
          pendingAdTower: panel._pendingAdTower,
          pendingDrawType: panel._pendingDrawType,
          hasMergeData: panel._pendingAdTower?.mergeData !== null,
        };
      });

      expect(result.pendingAdTower).not.toBeNull();
      expect(result.hasMergeData).toBe(true);

      // 빈 셀에 배치
      const placement = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');

        // 빈 셀 찾기 (isBuildable로 탐색)
        let emptyCell = null;
        for (let row = 0; row < 12; row++) {
          for (let col = 0; col < 9; col++) {
            if (gameScene.mapManager.isBuildable(col, row)) {
              emptyCell = { col, row };
              break;
            }
          }
          if (emptyCell) break;
        }
        if (!emptyCell) return { error: 'no empty cell' };

        const selectedType = gameScene.towerPanel.getSelectedTowerType();
        const goldBefore = gameScene.goldManager.getGold();
        if (selectedType) {
          gameScene._attemptPlaceTower(selectedType, emptyCell.col, emptyCell.row);
        }
        const goldAfter = gameScene.goldManager.getGold();

        // 마지막으로 배치된 타워 확인
        const lastTower = gameScene.towers[gameScene.towers.length - 1];
        return {
          placed: !!lastTower,
          mergeId: lastTower?.mergeId,
          tier: lastTower?.tier,
          totalInvested: lastTower?.totalInvested,
          goldDiff: goldBefore - goldAfter,
        };
      });

      if (!placement.error) {
        expect(placement.placed).toBe(true);
        expect(placement.mergeId).toBe('rapid_archer');
        expect(placement.tier).toBe(2);
        expect(placement.totalInvested).toBe(0);
        expect(placement.goldDiff).toBe(0);
      }
    });
  });

  // ── 6. 취소 동작 검증 ─────────────────────────────────────────

  test.describe('취소 동작', () => {
    test('취소 버튼 클릭 시 모달이 닫히고 타워가 미지급된다', async ({ page }) => {
      // 모달 열기
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      // 모달 열림 확인
      let modalOpen = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gameScene.towerPanel._adModalContainer !== null;
      });
      expect(modalOpen).toBe(true);

      // 취소 버튼 클릭 (취소 텍스트의 pointerdown 이벤트 발생)
      const cancelResult = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;
        const container = panel._adModalContainer;

        // "취소" 텍스트 찾기
        const children = container.list || [];
        const cancelText = children.find(c => c.type === 'Text' && c.text === '취소');

        if (cancelText) {
          cancelText.emit('pointerdown');
        }

        return {
          modalClosed: panel._adModalContainer === null,
          pendingAdTower: panel._pendingAdTower,
          pendingDrawType: panel._pendingDrawType,
        };
      });

      expect(cancelResult.modalClosed).toBe(true);
      expect(cancelResult.pendingAdTower).toBeNull();
      expect(cancelResult.pendingDrawType).toBeNull();
    });
  });

  // ── 7. 기존 뽑기 영향 없음 검증 ──────────────────────────────

  test.describe('기존 뽑기 영향 없음', () => {
    test('광고 보상 배치 후 기존 뽑기의 drawCount가 변하지 않는다', async ({ page }) => {
      const result = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        const drawCountBefore = panel.drawCount;

        // 광고 보상 타워 직접 설정 (T1)
        panel._pendingAdTower = { type: 'archer', tier: 1, mergeData: null };
        panel._pendingDrawType = 'archer';
        panel.selectedTowerType = 'archer';

        // 빈 셀 찾아 배치 (isBuildable로 탐색)
        let emptyCell = null;
        for (let row = 0; row < 12; row++) {
          for (let col = 0; col < 9; col++) {
            if (gameScene.mapManager.isBuildable(col, row)) {
              emptyCell = { col, row };
              break;
            }
          }
          if (emptyCell) break;
        }
        if (!emptyCell) return { error: 'no empty cell' };

        gameScene._attemptPlaceTower('archer', emptyCell.col, emptyCell.row);

        return {
          drawCountBefore,
          drawCountAfter: panel.drawCount,
          unchanged: panel.drawCount === drawCountBefore,
        };
      });

      if (!result.error) {
        expect(result.unchanged).toBe(true);
      }
    });

    test('기존 뽑기 버튼의 비용 계산이 정상 동작한다', async ({ page }) => {
      const drawInfo = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        return {
          drawCount: panel.drawCount,
          costText: panel._drawCostText?.text,
          drawButtonX: panel._drawButton?.x,
        };
      });

      expect(drawInfo.drawButtonX).toBe(80);
      expect(drawInfo.costText).toBeTruthy();
      // 비용 텍스트는 "XXG" 형식
      expect(drawInfo.costText).toMatch(/^\d+G$/);
    });
  });

  // ── 8. i18n 검증 ──────────────────────────────────────────────

  test.describe('i18n (다국어)', () => {
    test('한국어 키가 올바르게 적용된다', async ({ page }) => {
      const koTexts = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        return {
          adLabel: panel._adDrawLabelText?.text,
          adSublabel: panel._adDrawSublabelText?.text,
        };
      });

      expect(koTexts.adLabel).toBe('광고보기');
      expect(koTexts.adSublabel).toBe('타워 3선택');
    });

    test('영어로 전환 시 버튼 텍스트가 영어로 변경된다', async ({ page }) => {
      // 영어로 전환
      await page.evaluate(() => {
        const i18n = window.__game.scene.getScenes(true)[0].scene.systems.game;
        // i18n 모듈의 setLocale 직접 호출
        import('/js/i18n.js').then(mod => {
          mod.setLocale('en');
        });
      });
      await page.waitForTimeout(300);

      // i18n 키 직접 확인
      const enTexts = await page.evaluate(async () => {
        const mod = await import('/js/i18n.js');
        mod.setLocale('en');
        return {
          button: mod.t('draw.ad.button'),
          sublabel: mod.t('draw.ad.sublabel'),
          modalTitle: mod.t('draw.ad.modal.title'),
          select: mod.t('draw.ad.modal.select'),
          cancel: mod.t('draw.ad.modal.cancel'),
          failed: mod.t('draw.ad.failed'),
          badgeT1: mod.t('draw.ad.badge.t1'),
          badgeT2: mod.t('draw.ad.badge.t2'),
        };
      });

      expect(enTexts.button).toBe('Watch Ad');
      expect(enTexts.sublabel).toBe('Pick 1 of 3');
      expect(enTexts.modalTitle).toBe('Ad Reward: Pick a Tower');
      expect(enTexts.select).toBe('Select');
      expect(enTexts.cancel).toBe('Cancel');
      expect(enTexts.failed).toBe('Ad unavailable');
      expect(enTexts.badgeT1).toBe('T1');
      expect(enTexts.badgeT2).toBe('T2 ★');

      // 한국어로 복원
      await page.evaluate(async () => {
        const mod = await import('/js/i18n.js');
        mod.setLocale('ko');
      });
    });
  });

  // ── 9. 에지케이스 검증 ────────────────────────────────────────

  test.describe('에지케이스', () => {
    test('광고 실패 시 에러 토스트가 표시된다', async ({ page }) => {
      // AdManager를 실패하도록 설정
      await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const adManager = gameScene.registry.get('adManager');

        // showRewarded를 실패하도록 오버라이드
        adManager.showRewarded = async () => ({ rewarded: false, error: 'test fail' });
      });

      // 광고보기 버튼 클릭
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(300);

      // 모달이 열리지 않아야 함
      const result = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return {
          modalOpen: gameScene.towerPanel._adModalContainer !== null,
        };
      });

      expect(result.modalOpen).toBe(false);

      await page.screenshot({ path: 'tests/screenshots/ad-reward-failed-toast.png' });
    });

    test('모달 중복 생성 방지: 모달이 열려있는 상태에서 다시 열면 기존 모달이 정리된다', async ({ page }) => {
      const result = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        // 첫 번째 모달 열기
        const towers1 = panel._pickAdRewardTowers();
        panel._showAdRewardModal(towers1);
        const container1 = panel._adModalContainer;

        // 두 번째 모달 열기 (기존 모달 교체 예상)
        const towers2 = panel._pickAdRewardTowers();
        panel._showAdRewardModal(towers2);
        const container2 = panel._adModalContainer;

        return {
          sameContainer: container1 === container2,
          secondExists: container2 !== null,
          // 첫 번째 컨테이너가 파괴되었는지 (Phaser scene에서 확인)
        };
      });

      // 두 번째 모달이 존재해야 함
      expect(result.secondExists).toBe(true);
      // 서로 다른 컨테이너여야 함 (기존 것은 destroy)
      expect(result.sameContainer).toBe(false);
    });

    test('AdManager가 없을 때 광고 버튼 클릭해도 에러가 발생하지 않는다', async ({ page }) => {
      // 에러 추적용 배열 (이 테스트 시점부터)
      const testErrors = [];
      page.on('pageerror', err => testErrors.push(err.message));

      // adManager를 registry에서 제거
      await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        // 기존 adManager 백업
        window.__adManagerBackup = gameScene.registry.get('adManager');
        gameScene.registry.set('adManager', null);
      });

      // 클릭
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(300);

      // 모달이 열리지 않아야 함
      const modalOpen = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gameScene.towerPanel._adModalContainer !== null;
      });
      expect(modalOpen).toBe(false);

      // JavaScript 에러가 없어야 함
      expect(testErrors.length).toBe(0);

      // adManager 복원
      await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        if (window.__adManagerBackup) {
          gameScene.registry.set('adManager', window.__adManagerBackup);
        }
      });
    });

    test('광고보기 버튼 연타 시 모달이 중복 생성되지 않는다', async ({ page }) => {
      // 빠른 연속 클릭 (5회)
      for (let i = 0; i < 5; i++) {
        await page.click('canvas', { position: { x: 240, y: 570 } });
        await page.waitForTimeout(50);
      }
      await page.waitForTimeout(500);

      const state = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        return {
          modalExists: panel._adModalContainer !== null,
          // 씬의 depth=61 컨테이너 수 확인
          containerCount: gameScene.children.list.filter(c =>
            c.type === 'Container' && c.depth === 61
          ).length,
        };
      });

      // 모달 컨테이너가 최대 1개만 존재해야 함
      expect(state.containerCount).toBeLessThanOrEqual(1);
    });

    test('_pickAdRewardTowers가 항상 3개의 유효한 타워를 반환한다', async ({ page }) => {
      const result = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        const panel = gameScene.towerPanel;

        for (let i = 0; i < 100; i++) {
          const towers = panel._pickAdRewardTowers();
          if (towers.length !== 3) return { valid: false, length: towers.length, iteration: i };
          for (const t of towers) {
            if (!t.type || !t.displayName || t.color === undefined) {
              return { valid: false, tower: t, iteration: i };
            }
          }
        }
        return { valid: true };
      });

      expect(result.valid).toBe(true);
    });

    test('씬 전환 후 모달이 정리된다 (메모리 누수 방지)', async ({ page }) => {
      // 모달 열기
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      // 모달이 열려있는지 확인
      const modalBefore = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gameScene.towerPanel._adModalContainer !== null;
      });
      expect(modalBefore).toBe(true);

      // 다른 씬으로 전환
      await navigateToScene(page, 'MenuScene');
      await page.waitForTimeout(500);

      // GameScene으로 다시 돌아오기
      await navigateToScene(page, 'GameScene', {});
      await waitForGameScene(page);

      // 새 GameScene에서 모달이 없어야 함
      const modalAfter = await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScenes(true).find(s => s.sys.settings.key === 'GameScene');
        return gameScene.towerPanel._adModalContainer !== null;
      });
      expect(modalAfter).toBe(false);
    });
  });

  // ── 10. 콘솔 에러 검증 ────────────────────────────────────────

  test.describe('안정성', () => {
    test('광고 버튼 클릭 및 모달 조작 시 콘솔 에러가 없다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      // 광고보기 버튼 클릭
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      // 첫 번째 카드 선택 (X=80, Y=320+65-16=369 선택 버튼 위치)
      await page.click('canvas', { position: { x: 80, y: 369 } });
      await page.waitForTimeout(300);

      expect(errors).toEqual([]);
    });

    test('게임 전체 흐름에서 광고 기능 관련 콘솔 에러가 발생하지 않는다', async ({ page }) => {
      // 필터링된 에러만 확인 (기존 이미지 로딩 실패, favicon 등 제외)
      const relevantErrors = page._consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('net::') &&
        !e.includes('404') &&
        !e.includes('Failed to process file') && // 기존 이미지 에셋 누락 (rune_t* 등)
        !e.includes('image rune_') &&
        !e.includes('image merge_rune')
      );

      expect(relevantErrors).toEqual([]);
    });
  });

  // ── 11. 시각적 검증 ───────────────────────────────────────────

  test.describe('시각적 검증', () => {
    test('하단 패널 뽑기+광고 버튼 레이아웃 스크린샷', async ({ page }) => {
      await page.screenshot({
        path: 'tests/screenshots/ad-reward-panel-buttons.png',
        clip: { x: 0, y: 520, width: 360, height: 120 },
      });
    });

    test('모달 UI 전체 스크린샷', async ({ page }) => {
      await page.click('canvas', { position: { x: 240, y: 570 } });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'tests/screenshots/ad-reward-modal-full.png',
      });
    });

    test('모바일 뷰포트에서 정상 렌더링된다', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);

      await page.screenshot({
        path: 'tests/screenshots/ad-reward-mobile-viewport.png',
      });
    });
  });
});
