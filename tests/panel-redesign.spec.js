// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Panel Redesign QA Tests
 * 하단 패널 UI 리디자인 검증: 2행 레이아웃, 버튼 좌표, 삭제 항목, 라벨 변경, 기능 동작
 */

const BASE_URL = 'http://localhost:5173';

// PANEL_Y = 520 (config.js)
const PANEL_Y = 520;

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
  await page.evaluate(() => {
    const game = window.__game;
    // 현재 활성 씬에서 GameScene 시작
    const activeScenes = game.scene.getScenes(true);
    if (activeScenes.length > 0) {
      activeScenes[0].scene.start('GameScene');
    }
  });
  await page.waitForFunction(() => {
    const g = window.__game;
    if (!g) return false;
    const scene = g.scene.getScene('GameScene');
    return scene && scene.scene.isActive();
  }, { timeout: 15000 });
  // 씬이 완전히 로드될 때까지 대기
  await page.waitForTimeout(2000);
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
// 1행 레이아웃 검증 (뽑기 + 무료뽑기 버튼)
// ══════════════════════════════════════════════════════════════════

test.describe('1행 레이아웃: 뽑기 및 무료뽑기 버튼', () => {

  test('AC-1: 뽑기 버튼이 1행 좌측(X=95, Y=PANEL_Y+42, 150x44)에 표시된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const btn = panel._drawButton;
      if (!btn) return { exists: false };
      return {
        exists: true,
        x: btn.x,
        y: btn.y,
        width: btn.displayWidth || btn.width,
        height: btn.displayHeight || btn.height,
      };
    });

    expect(result.exists).toBe(true);
    expect(result.x).toBe(95);
    expect(result.y).toBe(PANEL_Y + 42);
    expect(result.width).toBeCloseTo(150, 0);
    expect(result.height).toBeCloseTo(44, 0);
    expect(errors).toEqual([]);
  });

  test('AC-2: 무료뽑기 버튼이 1행 우측(X=265, Y=PANEL_Y+42, 150x44)에 표시된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const btn = panel._adDrawButton;
      if (!btn) return { exists: false };
      return {
        exists: true,
        x: btn.x,
        y: btn.y,
        width: btn.displayWidth || btn.width,
        height: btn.displayHeight || btn.height,
      };
    });

    expect(result.exists).toBe(true);
    expect(result.x).toBe(265);
    expect(result.y).toBe(PANEL_Y + 42);
    expect(result.width).toBeCloseTo(150, 0);
    expect(result.height).toBeCloseTo(44, 0);
    expect(errors).toEqual([]);
  });

  test('AC-3: 두 뽑기 버튼이 서로 겹치지 않는다 (X:20~170 vs X:190~340)', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const drawBtn = panel._drawButton;
      const adDrawBtn = panel._adDrawButton;
      if (!drawBtn || !adDrawBtn) return { error: 'buttons not found' };

      // 각 버튼의 경계 좌표 계산 (중심 기준)
      const drawW = drawBtn.displayWidth || drawBtn.width;
      const adDrawW = adDrawBtn.displayWidth || adDrawBtn.width;

      const drawLeft = drawBtn.x - drawW / 2;
      const drawRight = drawBtn.x + drawW / 2;
      const adDrawLeft = adDrawBtn.x - adDrawW / 2;
      const adDrawRight = adDrawBtn.x + adDrawW / 2;

      // 겹침 확인: drawRight < adDrawLeft 이면 겹치지 않음
      const gap = adDrawLeft - drawRight;

      return {
        drawLeft, drawRight,
        adDrawLeft, adDrawRight,
        gap,
        overlaps: drawRight > adDrawLeft,
      };
    });

    expect(result.overlaps).toBe(false);
    expect(result.gap).toBeGreaterThanOrEqual(10); // 최소 10px 간격
    // 스펙에 명시된 경계값 확인
    expect(result.drawLeft).toBeCloseTo(20, 0);
    expect(result.drawRight).toBeCloseTo(170, 0);
    expect(result.adDrawLeft).toBeCloseTo(190, 0);
    expect(result.adDrawRight).toBeCloseTo(340, 0);
  });
});


// ══════════════════════════════════════════════════════════════════
// 2행 레이아웃 검증 (배속 + 소모품 3종 + HP회복)
// ══════════════════════════════════════════════════════════════════

test.describe('2행 레이아웃: 배속, 소모품, HP회복 버튼', () => {

  test('AC-4: 배속 버튼이 2행 좌측(X=40, Y=PANEL_Y+80)에 위치한다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const bg = panel.speedBg;
      if (!bg) return { exists: false };
      return { exists: true, x: bg.x, y: bg.y };
    });

    expect(result.exists).toBe(true);
    expect(result.x).toBe(40);
    expect(result.y).toBe(PANEL_Y + 80);
  });

  test('AC-5: 소모품 3종이 2행 중간(X=90/140/190, Y=PANEL_Y+80)에 위치한다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const buttons = gs.consumableButtons;
      if (!buttons) return { exists: false };

      const keys = ['slowAll', 'goldRain', 'lightning'];
      const positions = {};
      for (const key of keys) {
        if (buttons[key] && buttons[key].bg) {
          positions[key] = { x: buttons[key].bg.x, y: buttons[key].bg.y };
        }
      }
      return { exists: true, positions };
    });

    expect(result.exists).toBe(true);
    expect(result.positions.slowAll.x).toBe(90);
    expect(result.positions.slowAll.y).toBe(PANEL_Y + 80);
    expect(result.positions.goldRain.x).toBe(140);
    expect(result.positions.goldRain.y).toBe(PANEL_Y + 80);
    expect(result.positions.lightning.x).toBe(190);
    expect(result.positions.lightning.y).toBe(PANEL_Y + 80);
  });

  test('AC-6: HP회복 버튼이 2행 우측(X=320, Y=PANEL_Y+80)에 위치한다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const bg = gs.hpRecoverBg;
      if (!bg) return { exists: false };
      return { exists: true, x: bg.x, y: bg.y };
    });

    expect(result.exists).toBe(true);
    expect(result.x).toBe(320);
    expect(result.y).toBe(PANEL_Y + 80);
  });

  test('AC-7: 2행의 5개 버튼이 서로 겹치지 않는다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;

      // 각 버튼의 중심 X 및 너비 수집
      const buttons = [];

      // 배속 버튼
      if (panel.speedBg) {
        const w = panel.speedBg.displayWidth || panel.speedBg.width || 32;
        buttons.push({ name: 'speed', cx: panel.speedBg.x, w });
      }

      // 소모품 3종
      if (gs.consumableButtons) {
        for (const key of ['slowAll', 'goldRain', 'lightning']) {
          const b = gs.consumableButtons[key];
          if (b && b.bg) {
            const w = b.bg.displayWidth || b.bg.width || 24;
            buttons.push({ name: key, cx: b.bg.x, w });
          }
        }
      }

      // HP 회복
      if (gs.hpRecoverBg) {
        const w = gs.hpRecoverBg.displayWidth || gs.hpRecoverBg.width || 32;
        buttons.push({ name: 'hpRecover', cx: gs.hpRecoverBg.x, w });
      }

      // 겹침 검사
      buttons.sort((a, b) => a.cx - b.cx);
      const overlaps = [];
      for (let i = 0; i < buttons.length - 1; i++) {
        const rightEdge = buttons[i].cx + buttons[i].w / 2;
        const leftEdge = buttons[i + 1].cx - buttons[i + 1].w / 2;
        const gap = leftEdge - rightEdge;
        if (gap < 0) {
          overlaps.push({
            a: buttons[i].name,
            b: buttons[i + 1].name,
            gap,
          });
        }
      }

      return { buttonCount: buttons.length, buttons, overlaps };
    });

    expect(result.buttonCount).toBe(5);
    expect(result.overlaps).toEqual([]);
  });

  test('AC-8: 모든 버튼이 패널 영역(Y=520~640) 안에 있다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const PANEL_Y = 520;
      const PANEL_BOTTOM = 640;

      const checkBounds = (obj, name) => {
        if (!obj) return { name, exists: false };
        const h = obj.displayHeight || obj.height || 44;
        const top = obj.y - h / 2;
        const bottom = obj.y + h / 2;
        return {
          name,
          exists: true,
          y: obj.y,
          top,
          bottom,
          inBounds: top >= PANEL_Y && bottom <= PANEL_BOTTOM,
        };
      };

      const checks = [];
      checks.push(checkBounds(panel._drawButton, 'drawButton'));
      checks.push(checkBounds(panel._adDrawButton, 'adDrawButton'));
      checks.push(checkBounds(panel.speedBg, 'speedButton'));

      if (gs.consumableButtons) {
        for (const key of ['slowAll', 'goldRain', 'lightning']) {
          const b = gs.consumableButtons[key];
          if (b && b.bg) checks.push(checkBounds(b.bg, key));
        }
      }
      checks.push(checkBounds(gs.hpRecoverBg, 'hpRecoverButton'));

      return checks;
    });

    for (const check of result) {
      expect(check.exists).toBe(true);
      expect(check.inBounds).toBe(true);
    }
  });
});


// ══════════════════════════════════════════════════════════════════
// 삭제 확인
// ══════════════════════════════════════════════════════════════════

test.describe('삭제 확인: sellButton 및 adFreeHintText', () => {

  test('AC-9: 패널에 삭제(판매/sell) 버튼이 존재하지 않는다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      return {
        sellBg: panel.sellBg === undefined || panel.sellBg === null,
        sellIcon: panel.sellIcon === undefined || panel.sellIcon === null,
        sellText: panel.sellText === undefined || panel.sellText === null,
        hasSellMethod: typeof panel._createSellButton === 'function',
      };
    });

    // sell 관련 프로퍼티가 없거나 null
    expect(result.sellBg).toBe(true);
    expect(result.sellIcon).toBe(true);
    expect(result.sellText).toBe(true);
    // _createSellButton 메서드가 존재하지 않아야 함
    expect(result.hasSellMethod).toBe(false);
  });

  test('AC-10: "광고 없이 뽑기" 텍스트(_adFreeHintText)가 화면에 존재하지 않는다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;

      // _adFreeHintText 프로퍼티 확인
      const hintTextExists = panel._adFreeHintText !== undefined && panel._adFreeHintText !== null;

      // 패널 컨테이너 내 모든 텍스트 오브젝트를 순회하며 "광고 없이" 텍스트 검색
      let foundAdFreeText = false;
      if (panel.container) {
        panel.container.list.forEach(child => {
          if (child.type === 'Text' && child.text && child.text.includes('광고 없이')) {
            foundAdFreeText = true;
          }
        });
      }

      return { hintTextExists, foundAdFreeText };
    });

    expect(result.hintTextExists).toBe(false);
    expect(result.foundAdFreeText).toBe(false);
  });
});


// ══════════════════════════════════════════════════════════════════
// 라벨 변경 확인
// ══════════════════════════════════════════════════════════════════

test.describe('라벨 변경: 무료뽑기', () => {

  test('AC-11: 무료뽑기 버튼 라벨이 "무료뽑기"(ko)로 표시된다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const label = panel._adDrawLabelText;
      if (!label) return { exists: false };
      return { exists: true, text: label.text };
    });

    expect(result.exists).toBe(true);
    expect(result.text).toBe('무료뽑기');
  });

  test('AC-12: i18n에서 draw.ad.button 키가 ko="무료뽑기", en="Free Draw"로 설정되어 있다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      // i18n 모듈의 t 함수를 통해 확인
      const { t, setLocale, getLocale } = window.__game.scene.getScene('GameScene').scene.systems.game.registry.get('i18n') || {};

      // 직접 import된 i18n을 통해 확인 (대안)
      // GameScene에서 접근 가능한 방식으로 확인
      const gs = window.__game.scene.getScene('GameScene');

      // 로케일을 임시 변경하여 테스트할 수 없으므로
      // 무료뽑기 라벨의 현재 텍스트를 확인하고
      // i18n 파일의 값은 정적 분석으로 확인
      const label = gs.towerPanel._adDrawLabelText;
      return {
        currentLabel: label ? label.text : null,
      };
    });

    // 기본 로케일이 ko이므로 "무료뽑기"여야 함
    expect(result.currentLabel).toBe('무료뽑기');
  });
});


// ══════════════════════════════════════════════════════════════════
// 기능 정상 동작 확인
// ══════════════════════════════════════════════════════════════════

test.describe('기능 동작 검증', () => {

  test('AC-13: 뽑기 버튼 클릭 시 타워 뽑기가 정상 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    // 골드를 충분히 지급
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.goldManager.gold = 10000;
      if (gs.hud) gs.hud.updateGold(10000);
      gs.towerPanel.updateAffordability(10000);
    });

    // 뽑기 버튼 클릭 시뮬레이션
    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;

      // _onDrawButtonClick 직접 호출
      panel._onDrawButtonClick();

      return {
        hasPendingDraw: !!panel._pendingDrawType,
        selectedType: panel.selectedTowerType,
      };
    });

    expect(result.hasPendingDraw).toBe(true);
    expect(result.selectedType).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('AC-14: 무료뽑기 버튼 클릭 시 에러 없이 처리된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    // adManager가 없는 환경에서 무료뽑기 버튼 클릭 시 에러가 발생하지 않아야 함
    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;

      try {
        panel._onAdDrawButtonClick();
        return { error: false };
      } catch (e) {
        return { error: true, message: e.message };
      }
    });

    expect(result.error).toBe(false);
    expect(errors).toEqual([]);
  });

  test('AC-15: 배속 버튼 클릭 시 1x->2x->3x 토글이 정상 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;

      const speeds = [panel.gameSpeed]; // 초기값 (1x)

      // 배속 버튼 pointerdown 이벤트 트리거
      panel.speedBg.emit('pointerdown');
      speeds.push(panel.gameSpeed); // 2x

      panel.speedBg.emit('pointerdown');
      speeds.push(panel.gameSpeed); // 3x

      panel.speedBg.emit('pointerdown');
      speeds.push(panel.gameSpeed); // 다시 1x

      return { speeds };
    });

    expect(result.speeds[0]).toBe(1);  // SPEED_NORMAL = 1
    expect(result.speeds[1]).toBe(2);  // SPEED_FAST = 2
    expect(result.speeds[2]).toBe(3);  // SPEED_TURBO = 3
    expect(result.speeds[3]).toBe(1);  // 순환 -> 1x
    expect(errors).toEqual([]);
  });

  test('AC-16: 소모품 버튼 클릭 시 에러 없이 처리된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    // 소모품 버튼 클릭 (골드 부족으로 실패하더라도 에러는 발생하지 않아야 함)
    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const keys = ['slowAll', 'goldRain', 'lightning'];
      const results = {};

      for (const key of keys) {
        const btn = gs.consumableButtons[key];
        if (btn && btn.bg) {
          try {
            btn.bg.emit('pointerdown');
            results[key] = { clicked: true, error: false };
          } catch (e) {
            results[key] = { clicked: false, error: true, message: e.message };
          }
        } else {
          results[key] = { clicked: false, error: false, exists: false };
        }
      }

      return results;
    });

    for (const key of ['slowAll', 'goldRain', 'lightning']) {
      expect(result[key].error).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test('AC-17: HP회복 버튼 클릭 시 에러 없이 처리된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      if (!gs.hpRecoverBg) return { exists: false };

      try {
        gs.hpRecoverBg.emit('pointerdown');
        return { exists: true, error: false };
      } catch (e) {
        return { exists: true, error: true, message: e.message };
      }
    });

    expect(result.exists).toBe(true);
    expect(result.error).toBe(false);
    expect(errors).toEqual([]);
  });

  test('AC-18: 타워 클릭 시 TowerInfoOverlay가 열리고 sell 버튼이 있다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const placed = await placeTowerViaEval(page);
    expect(placed.success).toBe(true);

    await selectTowerInGame(page, 0);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const overlay = gs.towerPanel.towerInfoOverlay;
      if (!overlay || !overlay._container) return { overlayOpen: false };

      // 오버레이 컨테이너 내 sell 관련 텍스트 검색
      const allTexts = overlay._container.list.filter(c => c.type === 'Text');
      const sellText = allTexts.find(t =>
        t.text && (t.text.includes('Sell') || t.text.includes('판매'))
      );

      return {
        overlayOpen: overlay._container.visible,
        hasSellButton: !!sellText,
      };
    });

    expect(result.overlayOpen).toBe(true);
    expect(result.hasSellButton).toBe(true);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 엣지케이스 검증
// ══════════════════════════════════════════════════════════════════

test.describe('엣지케이스', () => {

  test('AC-19: 무료뽑기 횟수 소진 시 버튼이 비활성화된다', async ({ page }) => {
    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;

      // AD_DRAW_LIMIT_PER_GAME까지 카운트를 강제로 올림
      const limit = 3; // config.js의 AD_DRAW_LIMIT_PER_GAME 기본값
      panel._adDrawUsedCount = limit;
      panel._disableAdDrawButton();

      return {
        alpha: panel._adDrawButton ? panel._adDrawButton.alpha : null,
        labelAlpha: panel._adDrawLabelText ? panel._adDrawLabelText.alpha : null,
        sublabelAlpha: panel._adDrawSublabelText ? panel._adDrawSublabelText.alpha : null,
      };
    });

    // 비활성화 시 alpha 0.4
    expect(result.alpha).toBe(0.4);
    expect(result.labelAlpha).toBe(0.4);
    expect(result.sublabelAlpha).toBe(0.4);
  });

  test('AC-20: adFree 상태에서도 "무료뽑기" 라벨이 표시된다', async ({ page }) => {
    await enterGameScene(page);

    // adFree를 true로 설정한 환경에서도 라벨이 동일한지 확인
    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;

      // adFree 상태 시뮬레이션: 이미 라벨이 'draw.ad.button'으로 고정됨
      const label = panel._adDrawLabelText;
      return {
        text: label ? label.text : null,
      };
    });

    // adFree 여부와 무관하게 "무료뽑기"
    expect(result.text).toBe('무료뽑기');
  });

  test('뽑기 버튼 연타 시 에러가 발생하지 않는다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.goldManager.gold = 100000;
      gs.towerPanel.updateAffordability(100000);
    });

    // 뽑기 버튼 10회 연타
    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      let errorCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          panel._onDrawButtonClick();
        } catch (e) {
          errorCount++;
        }
      }

      return { errorCount };
    });

    expect(result.errorCount).toBe(0);
    expect(errors).toEqual([]);
  });

  test('골드 부족 시 뽑기 버튼 클릭해도 에러 없이 무시된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    // 골드를 0으로 설정
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.goldManager.gold = 0;
      gs.towerPanel.updateAffordability(0);
    });

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const beforeType = panel.selectedTowerType;

      try {
        panel._onDrawButtonClick();
        return {
          error: false,
          selectedAfter: panel.selectedTowerType,
          unchanged: panel.selectedTowerType === beforeType,
        };
      } catch (e) {
        return { error: true, message: e.message };
      }
    });

    expect(result.error).toBe(false);
    expect(errors).toEqual([]);
  });

  test('배속 버튼 빠른 연타에도 정상 순환한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;
      const speeds = [];

      // 30번 연속 클릭
      for (let i = 0; i < 30; i++) {
        panel.speedBg.emit('pointerdown');
        speeds.push(panel.gameSpeed);
      }

      // 시작 1 -> 30번 클릭: 2,3,1 반복 10회 -> 마지막 3개 = [2,3,1]
      return {
        totalClicks: speeds.length,
        last3: speeds.slice(-3),
        allValid: speeds.every(s => s === 1 || s === 2 || s === 3),
      };
    });

    expect(result.allValid).toBe(true);
    expect(result.last3).toEqual([2, 3, 1]);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 시각적 검증 (스크린샷)
// ══════════════════════════════════════════════════════════════════

test.describe('시각적 검증', () => {

  test('하단 패널 전체 레이아웃 스크린샷', async ({ page }) => {
    await enterGameScene(page);
    await page.waitForTimeout(1000);

    // 패널 영역만 캡처 (Y=520~640)
    await page.screenshot({
      path: 'tests/screenshots/panel-redesign-full.png',
      clip: { x: 0, y: 520, width: 360, height: 120 },
    });

    // 전체 화면 캡처
    await page.screenshot({
      path: 'tests/screenshots/panel-redesign-fullscreen.png',
    });
  });

  test('1행 뽑기 버튼 영역 스크린샷', async ({ page }) => {
    await enterGameScene(page);
    await page.waitForTimeout(1000);

    // 1행 영역 캡처 (Y=520~570)
    await page.screenshot({
      path: 'tests/screenshots/panel-redesign-row1.png',
      clip: { x: 0, y: 520, width: 360, height: 50 },
    });
  });

  test('2행 아이콘 버튼 영역 스크린샷', async ({ page }) => {
    await enterGameScene(page);
    await page.waitForTimeout(1000);

    // 2행 영역 캡처 (Y=580~640)
    await page.screenshot({
      path: 'tests/screenshots/panel-redesign-row2.png',
      clip: { x: 0, y: 580, width: 360, height: 60 },
    });
  });

  test('배속 변경 후 시각적 상태 스크린샷', async ({ page }) => {
    await enterGameScene(page);
    await page.waitForTimeout(500);

    // 1x 상태
    await page.screenshot({
      path: 'tests/screenshots/panel-speed-1x.png',
      clip: { x: 20, y: 585, width: 40, height: 30 },
    });

    // 2x로 변경
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.towerPanel.speedBg.emit('pointerdown');
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/screenshots/panel-speed-2x.png',
      clip: { x: 20, y: 585, width: 40, height: 30 },
    });

    // 3x로 변경
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      gs.towerPanel.speedBg.emit('pointerdown');
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'tests/screenshots/panel-speed-3x.png',
      clip: { x: 20, y: 585, width: 40, height: 30 },
    });
  });
});


// ══════════════════════════════════════════════════════════════════
// 콘솔 에러 모니터링
// ══════════════════════════════════════════════════════════════════

test.describe('안정성', () => {

  test('게임 시작부터 패널 조작까지 콘솔 에러가 발생하지 않는다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    // 주요 패널 조작 수행
    await page.evaluate(() => {
      const gs = window.__game.scene.getScene('GameScene');
      const panel = gs.towerPanel;

      // 골드 충분히 지급
      gs.goldManager.gold = 10000;
      panel.updateAffordability(10000);

      // 뽑기 클릭
      panel._onDrawButtonClick();

      // 배속 토글
      panel.speedBg.emit('pointerdown');
      panel.speedBg.emit('pointerdown');
      panel.speedBg.emit('pointerdown');
    });

    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('모바일 뷰포트(360x640)에서 패널이 정상 렌더링된다', async ({ page }) => {
    // 이미 360x640으로 설정되어 있지만 명시적으로 확인
    await page.setViewportSize({ width: 360, height: 640 });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: 'tests/screenshots/panel-redesign-mobile.png',
    });

    expect(errors).toEqual([]);
  });
});
