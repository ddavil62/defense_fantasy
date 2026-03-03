/**
 * @fileoverview MergeCodexScene BACK 버튼 버그 수정 QA 테스트.
 * Fix 1: 상단 바 depth 10 설정으로 BACK 버튼이 카드 이벤트보다 우선.
 * Fix 2: 스크롤 시 visible 영역 밖 카드의 interactive 비활성화.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3456/';

/**
 * 게임 부팅 후 MenuScene 도달까지 대기하는 헬퍼.
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
 * 현재 활성 씬 키를 반환.
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
 * MergeCodexScene으로 직접 이동하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {string} [fromScene='CollectionScene']
 */
async function navigateToCodexScene(page, fromScene = 'CollectionScene') {
  await page.evaluate(({ fromScene }) => {
    const g = window.__game;
    const active = g.scene.getScenes(true);
    if (active.length > 0) {
      active[0].scene.start('MergeCodexScene', { fromScene });
    }
  }, { fromScene });
  await page.waitForFunction(() => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === 'MergeCodexScene';
  }, { timeout: 5000 });
  // _inputReady=true 대기 (100ms) + 추가 렌더링 안정화
  await page.waitForTimeout(400);
}

/**
 * 게임 좌표를 캔버스 좌표로 변환하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {number} gameX - 게임 내 X 좌표
 * @param {number} gameY - 게임 내 Y 좌표
 * @returns {Promise<{x: number, y: number}>}
 */
async function gameToCanvasCoords(page, gameX, gameY) {
  return page.evaluate(({ gx, gy }) => {
    const g = window.__game;
    const canvas = g.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / 360;
    const scaleY = rect.height / 640;
    return {
      x: rect.left + gx * scaleX,
      y: rect.top + gy * scaleY,
    };
  }, { gx: gameX, gy: gameY });
}

/**
 * 도감 그리드를 지정 픽셀만큼 스크롤하는 헬퍼 (드래그 시뮬레이션).
 * @param {import('@playwright/test').Page} page
 * @param {number} scrollAmount - 양수 = 아래로 스크롤, 음수 = 위로 스크롤
 */
async function scrollCodexGrid(page, scrollAmount) {
  // 그리드 중앙에서 드래그 시작, 위로 드래그 = 아래로 스크롤
  const startY = 400;
  const endY = startY - scrollAmount;
  const startCoords = await gameToCanvasCoords(page, 180, startY);
  const endCoords = await gameToCanvasCoords(page, 180, endY);

  await page.mouse.move(startCoords.x, startCoords.y);
  await page.mouse.down();
  // 여러 단계로 이동 (Phaser가 pointermove 인식하도록)
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const intermediateX = startCoords.x + (endCoords.x - startCoords.x) * (i / steps);
    const intermediateY = startCoords.y + (endCoords.y - startCoords.y) * (i / steps);
    await page.mouse.move(intermediateX, intermediateY);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(200);
}

test.describe('MergeCodexScene BACK 버튼 버그 수정 검증', () => {

  // ── Fix 1: 상단 바 depth 검증 (코드 구조 검증) ──

  test.describe('Fix 1: 상단 바 depth 설정', () => {

    test('상단 바 요소의 depth가 10으로 설정되어 있다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // MergeCodexScene의 depth 구조를 직접 검사
      const depths = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScene('MergeCodexScene');
        if (!scene) return null;

        const allChildren = scene.children.list;
        const depthMap = {};
        for (const child of allChildren) {
          const d = child.depth;
          if (!depthMap[d]) depthMap[d] = [];
          depthMap[d].push(child.type || child.constructor.name);
        }
        return depthMap;
      });

      expect(depths).not.toBeNull();
      // depth 10에 요소가 있어야 함
      expect(depths['10']).toBeDefined();
      // depth 10에 최소 4개 요소 (배경, backBg, BACK 텍스트, 타이틀)
      expect(depths['10'].length).toBeGreaterThanOrEqual(4);

      await page.screenshot({ path: 'tests/screenshots/codex-depth-structure.png' });
      expect(errors).toEqual([]);
    });

    test('BACK 버튼 depth가 카드 컨테이너 depth보다 높다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      const depthCheck = await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScene('MergeCodexScene');
        if (!scene) return null;

        // 컨테이너 depth 확인
        const contentDepth = scene._codexContentContainer
          ? scene._codexContentContainer.depth : -1;
        const subTabDepth = scene._subTabContainer
          ? scene._subTabContainer.depth : -1;

        // depth 10 요소 존재 확인
        let hasDepth10 = false;
        for (const child of scene.children.list) {
          if (child.depth === 10) {
            hasDepth10 = true;
            break;
          }
        }

        return {
          contentDepth,
          subTabDepth,
          hasDepth10,
        };
      });

      expect(depthCheck).not.toBeNull();
      expect(depthCheck.contentDepth).toBe(6);
      expect(depthCheck.subTabDepth).toBe(8);
      expect(depthCheck.hasDepth10).toBe(true);
      // depth 계층: 상단바(10) > 서브탭(8) > 카드(6)
      expect(10).toBeGreaterThan(depthCheck.contentDepth);
      expect(10).toBeGreaterThan(depthCheck.subTabDepth);

      expect(errors).toEqual([]);
    });
  });

  // ── 수용 기준 1: 스크롤 없이 BACK 버튼 동작 ──

  test.describe('수용 기준: BACK 버튼 기본 동작', () => {

    test('AC1: 스크롤 없이 BACK 버튼 클릭 시 CollectionScene으로 돌아간다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page, 'CollectionScene');

      // BACK 버튼 위치: 게임 좌표 (38, 24)
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('CollectionScene');

      expect(errors).toEqual([]);
    });

    test('AC2: 스크롤 후 BACK 버튼 클릭 시 CollectionScene으로 돌아간다 (모달 재오픈 안됨)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page, 'CollectionScene');

      // 아래로 스크롤 (카드가 위로 올라감)
      await scrollCodexGrid(page, 200);

      await page.screenshot({ path: 'tests/screenshots/codex-after-scroll.png' });

      // BACK 버튼 클릭
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('CollectionScene');

      expect(errors).toEqual([]);
    });

    test('AC3: 카드 탭 -> 오버레이 닫기 -> 200ms 후 BACK 클릭 시 정상 동작', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page, 'CollectionScene');

      // 첫 번째 카드 위치: CODEX_GRID_X + CODEX_CARD_W/2, CODEX_GRID_Y + CODEX_CARD_H/2
      // CODEX_GRID_X = (360 - (5*62 + 4*6)) / 2 = (360 - 334) / 2 = 13
      // 첫 카드 중앙: (13 + 31, 104 + 37) = (44, 141)
      const cardPos = await gameToCanvasCoords(page, 44, 141);
      await page.mouse.click(cardPos.x, cardPos.y);
      await page.waitForTimeout(300);

      // 오버레이가 열렸는지 확인
      const overlayOpen = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene && scene.towerInfoOverlay && scene.towerInfoOverlay.isOpen();
      });
      expect(overlayOpen).toBe(true);

      await page.screenshot({ path: 'tests/screenshots/codex-overlay-open.png' });

      // X 버튼으로 닫기 (backdrop 클릭으로 닫기)
      // 오버레이의 backdrop은 전체 화면이므로 어디든 클릭하면 _handleBack이 호출됨
      // 패널 바깥 영역 클릭
      const closePos = await gameToCanvasCoords(page, 20, 20);
      await page.mouse.click(closePos.x, closePos.y);
      await page.waitForTimeout(300);

      // 오버레이가 닫혔는지 확인
      const overlayAfterClose = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene && scene.towerInfoOverlay && scene.towerInfoOverlay.isOpen();
      });
      expect(overlayAfterClose).toBe(false);

      // 200ms 이상 대기 후 BACK 클릭
      await page.waitForTimeout(300);

      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('CollectionScene');

      expect(errors).toEqual([]);
    });
  });

  // ── 수용 기준 4-7: 카드/서브탭/스크롤 기능 ──

  test.describe('수용 기준: 카드 및 서브탭 동작', () => {

    test('AC4: visible 영역 내 카드 탭 시 TowerInfoOverlay가 열린다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 스크롤 약간 후 visible 영역 내 카드 탭
      await scrollCodexGrid(page, 50);

      // 화면 중앙 부근 카드 클릭 (visible 영역 안)
      const cardPos = await gameToCanvasCoords(page, 180, 300);
      await page.mouse.click(cardPos.x, cardPos.y);
      await page.waitForTimeout(300);

      // 오버레이 열림 확인 - 카드가 없는 위치면 안 열릴 수 있으므로
      // 첫 번째 카드를 정확히 타겟팅
      const overlayOpen = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene && scene.towerInfoOverlay && scene.towerInfoOverlay.isOpen();
      });

      if (!overlayOpen) {
        // 좀 더 정확한 카드 위치로 재시도
        const firstCardPos = await gameToCanvasCoords(page, 44, 141);
        await page.mouse.click(firstCardPos.x, firstCardPos.y);
        await page.waitForTimeout(300);
      }

      const finalOverlay = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene && scene.towerInfoOverlay && scene.towerInfoOverlay.isOpen();
      });

      // 어느 하나의 카드를 누르면 오버레이가 열려야 함
      expect(finalOverlay).toBe(true);

      await page.screenshot({ path: 'tests/screenshots/codex-card-overlay.png' });
      expect(errors).toEqual([]);
    });

    test('AC6: 서브탭(T1~T5) 전환이 정상 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 기본 탭은 T2 (codexTier=2)
      let currentTier = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene.codexTier : -1;
      });
      expect(currentTier).toBe(2);

      // T1 탭 클릭: SUBTAB_W=64, SUBTAB_GAP=4, totalW=5*64+4*4=336
      // startX = (360-336)/2 + 64/2 = 12+32 = 44
      // T1 위치: (44, 48+14) = (44, 62)
      const t1Pos = await gameToCanvasCoords(page, 44, 62);
      await page.mouse.click(t1Pos.x, t1Pos.y);
      await page.waitForTimeout(300);

      currentTier = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene.codexTier : -1;
      });
      expect(currentTier).toBe(1);

      await page.screenshot({ path: 'tests/screenshots/codex-tab-t1.png' });

      // T5 탭 클릭: T5 위치 = startX + 4*(64+4) = 44 + 272 = 316
      const t5Pos = await gameToCanvasCoords(page, 316, 62);
      await page.mouse.click(t5Pos.x, t5Pos.y);
      await page.waitForTimeout(300);

      currentTier = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene.codexTier : -1;
      });
      expect(currentTier).toBe(5);

      await page.screenshot({ path: 'tests/screenshots/codex-tab-t5.png' });
      expect(errors).toEqual([]);
    });

    test('AC7: 드래그 스크롤이 정상 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 초기 스크롤 오프셋 확인
      let scrollY = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene.codexScrollY : -1;
      });
      expect(scrollY).toBe(0);

      // 아래로 스크롤
      await scrollCodexGrid(page, 150);

      scrollY = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene.codexScrollY : -1;
      });
      expect(scrollY).toBeGreaterThan(0);

      await page.screenshot({ path: 'tests/screenshots/codex-scroll-down.png' });
      expect(errors).toEqual([]);
    });
  });

  // ── Fix 2: 카드 interactive 토글 검증 ──

  test.describe('Fix 2: 카드 interactive 토글', () => {

    test('초기 상태에서 모든 visible 카드가 interactive이다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      const result = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (!scene || !scene._codexCardBgs) return null;

        let interactiveCount = 0;
        let disabledCount = 0;
        for (const { bg } of scene._codexCardBgs) {
          if (bg.input && bg.input.enabled) {
            interactiveCount++;
          } else {
            disabledCount++;
          }
        }
        return { total: scene._codexCardBgs.length, interactiveCount, disabledCount };
      });

      expect(result).not.toBeNull();
      expect(result.total).toBeGreaterThan(0);
      // 초기 상태에서는 모든 카드가 화면에 보이므로 대부분 interactive
      // (화면 밖 카드가 있으면 disabled)
      expect(result.interactiveCount).toBeGreaterThan(0);

      expect(errors).toEqual([]);
    });

    test('스크롤 후 visible 영역 밖 카드의 interactive가 비활성화된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 아래로 많이 스크롤하여 위쪽 카드가 화면 밖으로 나가도록
      await scrollCodexGrid(page, 300);

      const result = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (!scene || !scene._codexCardBgs) return null;

        const CODEX_GRID_Y = 104;
        const GAME_HEIGHT = 640;
        const CODEX_CARD_H = 74;

        let interactiveCount = 0;
        let disabledCount = 0;
        const details = [];

        for (const { bg, baseY } of scene._codexCardBgs) {
          const worldY = baseY - scene.codexScrollY;
          const cardBottomY = worldY + CODEX_CARD_H;
          const isVisible = cardBottomY > CODEX_GRID_Y && worldY < GAME_HEIGHT;
          const isInteractive = bg.input && bg.input.enabled;

          if (isInteractive) interactiveCount++;
          else disabledCount++;

          details.push({
            baseY,
            worldY: Math.round(worldY),
            isVisible,
            isInteractive,
            match: isVisible === isInteractive,
          });
        }

        return {
          scrollY: scene.codexScrollY,
          total: scene._codexCardBgs.length,
          interactiveCount,
          disabledCount,
          mismatchCount: details.filter(d => !d.match).length,
          details: details.slice(0, 5), // 처음 5개만 디버깅용
        };
      });

      expect(result).not.toBeNull();
      expect(result.scrollY).toBeGreaterThan(0);
      // visible/interactive 상태가 일치해야 함
      expect(result.mismatchCount).toBe(0);
      // 스크롤했으므로 일부 카드는 비활성화
      if (result.total > 5) {
        expect(result.disabledCount).toBeGreaterThan(0);
      }

      expect(errors).toEqual([]);
    });

    test('_codexCardBgs 배열이 서브탭 전환 시 재초기화된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // T2 탭의 카드 수 확인
      const t2Count = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene._codexCardBgs.length : -1;
      });

      // T1 탭으로 전환
      const t1Pos = await gameToCanvasCoords(page, 44, 62);
      await page.mouse.click(t1Pos.x, t1Pos.y);
      await page.waitForTimeout(300);

      // T1 탭의 카드 수 확인 (T1은 10종)
      const t1Count = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene._codexCardBgs.length : -1;
      });

      expect(t1Count).toBe(10);
      // T2와 T1의 카드 수가 다를 수 있음 (배열이 올바르게 재초기화됨)
      expect(t1Count).toBeGreaterThan(0);

      expect(errors).toEqual([]);
    });

    test('스크롤 경계 근처 카드(반만 보이는 카드)의 interactive 상태가 정확하다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 카드 높이의 절반만큼 스크롤 (첫 줄 카드가 반만 보이도록)
      // 첫 줄 카드 baseY = 104, 카드 높이 = 74
      // worldY = 104 - scrollY, cardBottomY = worldY + 74
      // 반만 보이려면: worldY < CODEX_GRID_Y < cardBottomY
      // 104 - scrollY < 104 < 104 - scrollY + 74
      // -scrollY < 0 이고 -scrollY + 74 > 0 -> scrollY > 0 이고 scrollY < 74
      // scrollY = 37이면 worldY = 67, cardBottom = 141, isVisible = 141 > 104 && 67 < 640 = true

      // evaluate로 직접 스크롤 오프셋 설정
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (scene) {
          scene.codexScrollY = 37;
          scene._applyCodexScroll();
        }
      });
      await page.waitForTimeout(100);

      const result = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (!scene || !scene._codexCardBgs) return null;

        const firstCard = scene._codexCardBgs[0];
        if (!firstCard) return null;

        const worldY = firstCard.baseY - scene.codexScrollY;
        const cardBottomY = worldY + 74;
        const isVisible = cardBottomY > 104 && worldY < 640;
        const isInteractive = firstCard.bg.input && firstCard.bg.input.enabled;

        return {
          baseY: firstCard.baseY,
          worldY,
          cardBottomY,
          isVisible,
          isInteractive,
          scrollY: scene.codexScrollY,
        };
      });

      expect(result).not.toBeNull();
      // worldY=67, cardBottom=141 -> isVisible=true
      expect(result.isVisible).toBe(true);
      expect(result.isInteractive).toBe(true);

      // 이제 카드가 완전히 벗어나도록 스크롤 (scrollY > 74+104-104 = 74)
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (scene) {
          scene.codexScrollY = 80;
          scene._applyCodexScroll();
        }
      });
      await page.waitForTimeout(100);

      const result2 = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (!scene || !scene._codexCardBgs) return null;

        const firstCard = scene._codexCardBgs[0];
        if (!firstCard) return null;

        const worldY = firstCard.baseY - scene.codexScrollY;
        const cardBottomY = worldY + 74;
        const isVisible = cardBottomY > 104 && worldY < 640;
        const isInteractive = firstCard.bg.input && firstCard.bg.input.enabled;

        return { worldY, cardBottomY, isVisible, isInteractive };
      });

      expect(result2).not.toBeNull();
      // worldY=104-80=24, cardBottom=24+74=98 -> isVisible = 98 > 104 = false
      expect(result2.isVisible).toBe(false);
      expect(result2.isInteractive).toBe(false);

      expect(errors).toEqual([]);
    });
  });

  // ── AC5: visible 영역 밖 카드 비반응 검증 ──

  test.describe('수용 기준: 보이지 않는 카드 비반응', () => {

    test('AC5: 상단 바 뒤에 숨은 카드를 탭해도 오버레이가 열리지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 첫 줄 카드가 상단 바 뒤로 완전히 들어가도록 스크롤
      // 첫 카드 baseY=104, 카드높이=74 -> cardBottom=178
      // scrollY=80이면 worldY=24, cardBottom=98 < 104 -> invisible
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (scene) {
          scene.codexScrollY = 80;
          scene._applyCodexScroll();
        }
      });
      await page.waitForTimeout(100);

      // 첫 카드가 interactive가 아닌지 확인
      const firstCardInteractive = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (!scene || !scene._codexCardBgs || !scene._codexCardBgs[0]) return null;
        const bg = scene._codexCardBgs[0].bg;
        return bg.input && bg.input.enabled;
      });
      expect(firstCardInteractive).toBe(false);

      // 첫 카드 위치를 탭 (상단 바 영역)
      // 첫 카드 원래 게임 좌표: (44, 141), 스크롤 후 worldY=24 -> 화면상 카드 중심 y=24+37=61
      const hiddenCardPos = await gameToCanvasCoords(page, 44, 61);
      await page.mouse.click(hiddenCardPos.x, hiddenCardPos.y);
      await page.waitForTimeout(300);

      // 오버레이가 열리지 않아야 함
      const overlayOpen = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene && scene.towerInfoOverlay && scene.towerInfoOverlay.isOpen();
      });
      expect(overlayOpen).toBe(false);

      expect(errors).toEqual([]);
    });
  });

  // ── 예외 및 엣지케이스 ──

  test.describe('예외 시나리오 검증', () => {

    test('BACK 버튼 빠른 연타 시 에러가 발생하지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // BACK 버튼 3회 빠른 연타
      const backPos = await gameToCanvasCoords(page, 38, 24);
      for (let i = 0; i < 3; i++) {
        await page.mouse.click(backPos.x, backPos.y);
        await page.waitForTimeout(50);
      }

      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });

    test('서브탭 전환 후 스크롤 -> BACK 클릭 시 정상 동작', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // T3 탭으로 전환: T3 위치 = startX + 2*(64+4) = 44 + 136 = 180
      const t3Pos = await gameToCanvasCoords(page, 180, 62);
      await page.mouse.click(t3Pos.x, t3Pos.y);
      await page.waitForTimeout(300);

      // 스크롤
      await scrollCodexGrid(page, 100);

      // BACK 클릭
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('CollectionScene');

      expect(errors).toEqual([]);
    });

    test('fromScene=GameScene일 때 BACK 시 GameScene으로 복귀한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      // 먼저 GameScene 시작
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

      // GameScene에서 MergeCodexScene으로 이동 (scene.sleep + scene.start)
      await page.evaluate(() => {
        const g = window.__game;
        const gameScene = g.scene.getScene('GameScene');
        if (gameScene) {
          gameScene.scene.sleep('GameScene');
          gameScene.scene.start('MergeCodexScene', { fromScene: 'GameScene' });
        }
      });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.some(s => s.sys.settings.key === 'MergeCodexScene');
      }, { timeout: 5000 });
      await page.waitForTimeout(400);

      // BACK 버튼 클릭
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      // GameScene으로 돌아가야 함 (scene.wake)
      const sceneKey = await page.evaluate(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        // GameScene이 활성 씬 목록에 있어야 함
        return scenes.some(s => s.sys.settings.key === 'GameScene');
      });
      expect(sceneKey).toBe(true);

      expect(errors).toEqual([]);
    });

    test('씬 재진입 시 _codexCardBgs가 올바르게 초기화된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      // 첫 번째 진입
      await navigateToCodexScene(page);
      const firstCount = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene._codexCardBgs.length : -1;
      });
      expect(firstCount).toBeGreaterThan(0);

      // BACK으로 나감
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      // 두 번째 진입
      await navigateToCodexScene(page);
      const secondCount = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene._codexCardBgs.length : -1;
      });

      // 같은 티어이므로 카드 수가 동일해야 함
      expect(secondCount).toBe(firstCount);
      // 이전 진입의 카드가 누적되지 않아야 함
      expect(secondCount).not.toBe(firstCount * 2);

      expect(errors).toEqual([]);
    });

    test('스크롤 최하단에서 BACK 클릭 시 정상 동작', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 최대치까지 스크롤
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (scene) {
          scene.codexScrollY = scene._codexMaxScroll;
          scene._applyCodexScroll();
        }
      });
      await page.waitForTimeout(200);

      await page.screenshot({ path: 'tests/screenshots/codex-max-scroll.png' });

      // BACK 클릭
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('CollectionScene');

      expect(errors).toEqual([]);
    });

    test('카드 수가 적어 스크롤이 필요 없는 탭(T5)에서도 정상 동작', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // T5 탭으로 전환 (카드 수가 적을 수 있음)
      const t5Pos = await gameToCanvasCoords(page, 316, 62);
      await page.mouse.click(t5Pos.x, t5Pos.y);
      await page.waitForTimeout(300);

      const maxScroll = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        return scene ? scene._codexMaxScroll : -1;
      });

      await page.screenshot({ path: 'tests/screenshots/codex-t5-tab.png' });

      // BACK 클릭
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('CollectionScene');

      expect(errors).toEqual([]);
    });

    test('_codexCardBgs가 빈 배열일 때 _applyCodexScroll이 에러 없이 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // _codexCardBgs를 빈 배열로 강제 설정 후 _applyCodexScroll 호출
      const result = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (!scene) return false;
        scene._codexCardBgs = [];
        try {
          scene._applyCodexScroll();
          return true;
        } catch (e) {
          return e.message;
        }
      });

      expect(result).toBe(true);
      expect(errors).toEqual([]);
    });

    test('_codexCardBgs가 null일 때 _applyCodexScroll이 에러 없이 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      const result = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (!scene) return false;
        scene._codexCardBgs = null;
        try {
          scene._applyCodexScroll();
          return true;
        } catch (e) {
          return e.message;
        }
      });

      // null 체크가 있으므로 (line 570: if (this._codexCardBgs))
      expect(result).toBe(true);
      expect(errors).toEqual([]);
    });
  });

  // ── UI 안정성 ──

  test.describe('UI 안정성', () => {

    test('MergeCodexScene 전체 흐름에서 콘솔 에러가 발생하지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 스크롤
      await scrollCodexGrid(page, 100);
      await page.waitForTimeout(200);

      // 서브탭 전환
      const t3Pos = await gameToCanvasCoords(page, 180, 62);
      await page.mouse.click(t3Pos.x, t3Pos.y);
      await page.waitForTimeout(300);

      // 카드 클릭 -> 오버레이
      const cardPos = await gameToCanvasCoords(page, 44, 141);
      await page.mouse.click(cardPos.x, cardPos.y);
      await page.waitForTimeout(300);

      // 오버레이 닫기
      const closePos = await gameToCanvasCoords(page, 20, 20);
      await page.mouse.click(closePos.x, closePos.y);
      await page.waitForTimeout(300);

      // BACK
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      expect(errors).toEqual([]);
    });

    test('MergeCodexScene 초기 렌더링이 올바르다', async ({ page }) => {
      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      await page.screenshot({ path: 'tests/screenshots/codex-initial-render.png' });

      // 씬이 활성 상태인지 확인
      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('MergeCodexScene');
    });

    test('모바일 뷰포트에서 MergeCodexScene이 정상 동작한다', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      await page.screenshot({ path: 'tests/screenshots/codex-mobile-viewport.png' });

      // BACK 클릭이 동작하는지
      const backPos = await gameToCanvasCoords(page, 38, 24);
      await page.mouse.click(backPos.x, backPos.y);
      await page.waitForTimeout(500);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('CollectionScene');

      expect(errors).toEqual([]);
    });
  });

  // ── 시각적 검증 ──

  test.describe('시각적 검증', () => {

    test('스크롤 전 UI 레이아웃 캡처', async ({ page }) => {
      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      await page.screenshot({ path: 'tests/screenshots/codex-layout-no-scroll.png' });
    });

    test('스크롤 후 UI 레이아웃 캡처 - 상단 바가 카드 위에 표시된다', async ({ page }) => {
      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // 아래로 스크롤하여 카드가 상단 바 뒤로 들어가도록
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MergeCodexScene');
        if (scene) {
          scene.codexScrollY = 60;
          scene._applyCodexScroll();
        }
      });
      await page.waitForTimeout(200);

      await page.screenshot({ path: 'tests/screenshots/codex-layout-scrolled.png' });
    });

    test('T1 탭 전체 카드 10종 표시 캡처', async ({ page }) => {
      await waitForMenuScene(page);
      await navigateToCodexScene(page);

      // T1 탭
      const t1Pos = await gameToCanvasCoords(page, 44, 62);
      await page.mouse.click(t1Pos.x, t1Pos.y);
      await page.waitForTimeout(300);

      await page.screenshot({ path: 'tests/screenshots/codex-t1-all-towers.png' });
    });
  });
});
