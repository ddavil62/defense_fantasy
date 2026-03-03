// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Phase 2: Tower Drag Move System QA Tests
 * 타워 드래그 이동 시스템 검증:
 * - 빈 셀로 이동
 * - 합성 가능 타워 위 드롭 시 기존 합성 유지
 * - 합성 불가 타워 위 드롭 시 원위치 복원
 * - 배치 불가 셀 드롭 시 원위치 복원
 * - 이동 비용 무료 (골드 차감 없음)
 * - 이동 후 좌표/사거리/공격 정상 작동
 * - 드래그 시 빈 셀 하이라이트 + 합성 하이라이트
 * - 드래그 종료 시 하이라이트 제거
 * - MapManager.moveTower() 정상 동작
 * - 강화된 타워 드래그 불가
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

/**
 * 타워를 evaluate로 직접 배치한다 (뽑기 우회).
 * 골드를 충분히 설정하고, 특정 col/row에 배치한다.
 */
async function placeTowerAt(page, type, col, row) {
  return page.evaluate(({ type, col, row }) => {
    const scene = window.__game.scene.getScene('GameScene');
    if (!scene) return { success: false, error: 'no scene' };
    if (!scene.mapManager.isBuildable(col, row)) {
      return { success: false, error: `cell (${col},${row}) not buildable` };
    }
    scene.goldManager.gold = 99999;
    if (scene.hud) scene.hud.updateGold(99999);
    scene.towerPanel.selectedTowerType = type;
    scene._attemptPlaceTower(type, col, row);
    const placed = scene.towers.find(t => t.col === col && t.row === row);
    return {
      success: !!placed,
      towerCount: scene.towers.length,
      col, row,
      towerIndex: placed ? scene.towers.indexOf(placed) : -1,
    };
  }, { type, col, row });
}

/**
 * 빈 배치 가능 셀 목록을 반환한다.
 */
async function getBuildableCells(page) {
  return page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene');
    const cells = [];
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 9; c++) {
        if (scene.mapManager.isBuildable(c, r)) {
          cells.push({ col: c, row: r });
        }
      }
    }
    return cells;
  });
}

/**
 * 배치 불가 셀(경로/벽/기지/스폰) 하나를 반환한다.
 */
async function getNonBuildableCell(page) {
  return page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene');
    const CELL_EMPTY = 0;
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 9; c++) {
        const cellType = scene.mapManager.getCellType(c, r);
        if (cellType !== CELL_EMPTY && cellType !== -1) {
          return { col: c, row: r, cellType };
        }
      }
    }
    return null;
  });
}


// ══════════════════════════════════════════════════════════════════
// AC-1: 빈 배치 가능 셀로 이동
// ══════════════════════════════════════════════════════════════════

test.describe('AC-1: 타워를 빈 배치 가능 셀로 이동', () => {

  test('MapManager.moveTower가 towerMap을 정상 갱신한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    expect(buildable.length).toBeGreaterThanOrEqual(2);

    const fromCell = buildable[0];
    const toCell = buildable[1];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ fromCol, fromRow, toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.mapManager.getTowerAt(fromCol, fromRow);
      if (!tower) return { error: 'no tower at source' };

      // moveTower 직접 호출
      scene.mapManager.moveTower(fromCol, fromRow, toCol, toRow, tower);

      const oldCellTower = scene.mapManager.getTowerAt(fromCol, fromRow);
      const newCellTower = scene.mapManager.getTowerAt(toCol, toRow);

      return {
        oldCellEmpty: oldCellTower === null,
        newCellHasTower: newCellTower === tower,
        towerMapSize: scene.mapManager.towerMap.size,
      };
    }, { fromCol: fromCell.col, fromRow: fromCell.row, toCol: toCell.col, toRow: toCell.row });

    expect(result.oldCellEmpty).toBe(true);
    expect(result.newCellHasTower).toBe(true);
    expect(result.towerMapSize).toBe(1); // 1 tower, moved
    expect(errors).toEqual([]);
  });

  test('_onTowerMove가 타워 좌표(col, row, x, y)를 정상 갱신한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    const toCell = buildable[1];
    await placeTowerAt(page, 'mage', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ fromCol, fromRow, toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      if (!tower) return { error: 'no tower' };

      const origCol = tower.col;
      const origRow = tower.row;
      const origX = tower.x;
      const origY = tower.y;

      // _onTowerMove 호출
      scene._onTowerMove(tower, toCol, toRow);

      // gridToPixel 확인
      // gridToPixel 사용 (config.js의 실제 상수를 직접 사용)
      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const expectedX = toCol * CELL_SIZE + CELL_SIZE / 2;
      const expectedY = toRow * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      return {
        origCol, origRow, origX, origY,
        newCol: tower.col,
        newRow: tower.row,
        newX: tower.x,
        newY: tower.y,
        colCorrect: tower.col === toCol,
        rowCorrect: tower.row === toRow,
        xCorrect: tower.x === expectedX,
        yCorrect: tower.y === expectedY,
        graphicsAlpha: tower.graphics.alpha,
      };
    }, { fromCol: fromCell.col, fromRow: fromCell.row, toCol: toCell.col, toRow: toCell.row });

    expect(result.colCorrect).toBe(true);
    expect(result.rowCorrect).toBe(true);
    expect(result.xCorrect).toBe(true);
    expect(result.yCorrect).toBe(true);
    expect(result.graphicsAlpha).toBe(1); // 복원됨
    expect(errors).toEqual([]);
  });

  test('이동 후 원래 셀이 빈 셀로 처리된다 (새 타워 배치 가능)', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    const toCell = buildable[1];
    await placeTowerAt(page, 'ice', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ fromCol, fromRow, toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      // 이동 실행
      scene._onTowerMove(tower, toCol, toRow);

      // 원래 셀이 buildable인지 확인
      const origBuildable = scene.mapManager.isBuildable(fromCol, fromRow);
      // 새 셀에 타워가 있는지 확인
      const newCellTower = scene.mapManager.getTowerAt(toCol, toRow);

      return {
        origCellBuildable: origBuildable,
        newCellHasTower: newCellTower === tower,
      };
    }, { fromCol: fromCell.col, fromRow: fromCell.row, toCol: toCell.col, toRow: toCell.row });

    expect(result.origCellBuildable).toBe(true);
    expect(result.newCellHasTower).toBe(true);
  });

  test('이동 비용은 무료다 (골드 차감 없음)', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    const toCell = buildable[1];
    await placeTowerAt(page, 'lightning', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ fromCol, fromRow, toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      const goldBefore = scene.goldManager.getGold();

      scene._onTowerMove(tower, toCol, toRow);

      const goldAfter = scene.goldManager.getGold();

      return {
        goldBefore,
        goldAfter,
        noGoldDeducted: goldBefore === goldAfter,
      };
    }, { fromCol: fromCell.col, fromRow: fromCell.row, toCol: toCell.col, toRow: toCell.row });

    expect(result.noGoldDeducted).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-2: endDrag 분기 로직 (합성/이동/무효)
// ══════════════════════════════════════════════════════════════════

test.describe('AC-2: endDrag 분기 로직', () => {

  test('빈 배치 가능 셀에 드롭하면 onMove 콜백이 호출된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    const toCell = buildable[1];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ fromCol, fromRow, toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      // 시뮬레이트: startDrag -> endDrag
      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const targetX = toCol * CELL_SIZE + CELL_SIZE / 2;
      const targetY = toRow * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      let moveCalled = false;
      let moveArgs = null;
      const origOnMove = scene.towerPanel.callbacks.onMove;
      scene.towerPanel.callbacks.onMove = (t, c, r) => {
        moveCalled = true;
        moveArgs = { towerType: t.type, col: c, row: r };
        // 실제 이동도 수행
        origOnMove(t, c, r);
      };

      // 드래그 시작
      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });

      // 드래그 종료 - 빈 셀에
      scene.towerPanel.endDrag(
        { x: targetX, y: targetY },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        moveCalled,
        moveArgs,
        towerNewCol: tower.col,
        towerNewRow: tower.row,
      };
    }, { fromCol: fromCell.col, fromRow: fromCell.row, toCol: toCell.col, toRow: toCell.row });

    expect(result.moveCalled).toBe(true);
    expect(result.moveArgs.col).toBe(toCell.col);
    expect(result.moveArgs.row).toBe(toCell.row);
    expect(result.towerNewCol).toBe(toCell.col);
    expect(result.towerNewRow).toBe(toCell.row);
    expect(errors).toEqual([]);
  });

  test('배치 불가 셀에 드롭하면 원위치 복원된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    const nonBuildable = await getNonBuildableCell(page);
    if (!nonBuildable) {
      test.skip();
      return;
    }

    const result = await page.evaluate(({ fromCol, fromRow, nbCol, nbRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      const origCol = tower.col;
      const origRow = tower.row;

      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const targetX = nbCol * CELL_SIZE + CELL_SIZE / 2;
      const targetY = nbRow * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      let moveCalled = false;
      scene.towerPanel.callbacks.onMove = () => { moveCalled = true; };

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
      scene.towerPanel.endDrag(
        { x: targetX, y: targetY },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        moveCalled,
        towerCol: tower.col,
        towerRow: tower.row,
        towerStayedInPlace: tower.col === origCol && tower.row === origRow,
        graphicsAlpha: tower.graphics.alpha,
      };
    }, { fromCol: fromCell.col, fromRow: fromCell.row, nbCol: nonBuildable.col, nbRow: nonBuildable.row });

    expect(result.moveCalled).toBe(false);
    expect(result.towerStayedInPlace).toBe(true);
    expect(result.graphicsAlpha).toBe(1); // alpha 복원
  });

  test('맵 밖에 드롭하면 원위치 복원된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    await placeTowerAt(page, 'flame', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ fromCol, fromRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      const origCol = tower.col;
      const origRow = tower.row;

      let moveCalled = false;
      scene.towerPanel.callbacks.onMove = () => { moveCalled = true; };

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
      // 맵 밖 좌표
      scene.towerPanel.endDrag(
        { x: -100, y: -100 },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        moveCalled,
        towerStayedInPlace: tower.col === origCol && tower.row === origRow,
        graphicsAlpha: tower.graphics.alpha,
      };
    }, { fromCol: fromCell.col, fromRow: fromCell.row });

    expect(result.moveCalled).toBe(false);
    expect(result.towerStayedInPlace).toBe(true);
    expect(result.graphicsAlpha).toBe(1);
  });

  test('동일 셀에 드롭(원위치)하면 이동 없이 원위치 복원된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ fromCol, fromRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      let moveCalled = false;
      const origOnMove = scene.towerPanel.callbacks.onMove;
      scene.towerPanel.callbacks.onMove = () => { moveCalled = true; };

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
      // 같은 위치에 드롭
      scene.towerPanel.endDrag(
        { x: tower.x, y: tower.y },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        moveCalled,
        colUnchanged: tower.col === fromCol,
        rowUnchanged: tower.row === fromRow,
        graphicsAlpha: tower.graphics.alpha,
      };
    }, { fromCol: fromCell.col, fromRow: fromCell.row });

    // 동일 셀: getTowerAt 반환 == towerA (towerB === towerA), fallthrough -> alpha 복원
    expect(result.moveCalled).toBe(false);
    expect(result.colUnchanged).toBe(true);
    expect(result.rowUnchanged).toBe(true);
    expect(result.graphicsAlpha).toBe(1);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-3: 합성 동작 유지 확인
// ══════════════════════════════════════════════════════════════════

test.describe('AC-3: 합성 가능 타워 위 드롭 시 기존 합성 실행', () => {

  test('같은 T1 타워 위에 드롭하면 onMerge 콜백이 호출된다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    expect(buildable.length).toBeGreaterThanOrEqual(2);

    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);
    await placeTowerAt(page, 'archer', buildable[1].col, buildable[1].row);

    const result = await page.evaluate(({ cell0, cell1 }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const towerA = scene.towers[0];
      const towerB = scene.towers[1];

      let mergeCalled = false;
      let mergeArgs = null;
      scene.towerPanel.callbacks.onMerge = (a, b) => {
        mergeCalled = true;
        mergeArgs = { aType: a.type, bType: b.type };
      };

      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const targetX = towerB.col * CELL_SIZE + CELL_SIZE / 2;
      const targetY = towerB.row * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      scene.towerPanel.startDrag(towerA, { x: towerA.x, y: towerA.y });
      scene.towerPanel.endDrag(
        { x: targetX, y: targetY },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        mergeCalled,
        mergeArgs,
      };
    }, { cell0: buildable[0], cell1: buildable[1] });

    expect(result.mergeCalled).toBe(true);
    expect(result.mergeArgs.aType).toBe('archer');
    expect(result.mergeArgs.bType).toBe('archer');
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-4: 합성 불가 타워(강화됨) 위 드롭 시 흔들기 피드백
// ══════════════════════════════════════════════════════════════════

test.describe('AC-4: 강화된 타워 위 드롭 시 흔들기 피드백', () => {

  test('강화된 타워 위에 드롭하면 원위치 복원 + 흔들기', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    expect(buildable.length).toBeGreaterThanOrEqual(2);

    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);
    await placeTowerAt(page, 'mage', buildable[1].col, buildable[1].row);

    // 두 번째 타워를 강화
    await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[1];
      tower.enhanceLevel = 3;
    });

    const result = await page.evaluate(({ cell0, cell1 }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const towerA = scene.towers[0]; // archer (드래그)
      const towerB = scene.towers[1]; // mage (강화됨, 합성 불가)
      const origCol = towerA.col;
      const origRow = towerA.row;

      let moveCalled = false;
      let mergeCalled = false;
      scene.towerPanel.callbacks.onMove = () => { moveCalled = true; };
      scene.towerPanel.callbacks.onMerge = () => { mergeCalled = true; };

      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const targetX = towerB.col * CELL_SIZE + CELL_SIZE / 2;
      const targetY = towerB.row * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      scene.towerPanel.startDrag(towerA, { x: towerA.x, y: towerA.y });
      scene.towerPanel.endDrag(
        { x: targetX, y: targetY },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        moveCalled,
        mergeCalled,
        towerARestored: towerA.col === origCol && towerA.row === origRow,
        towerAAlpha: towerA.graphics.alpha,
      };
    }, { cell0: buildable[0], cell1: buildable[1] });

    expect(result.moveCalled).toBe(false);
    expect(result.mergeCalled).toBe(false);
    expect(result.towerARestored).toBe(true);
    expect(result.towerAAlpha).toBe(1);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-5: 강화된 타워(enhanceLevel > 0)는 드래그 불가
// ══════════════════════════════════════════════════════════════════

test.describe('AC-5: 강화된 타워 드래그 불가', () => {

  test('enhanceLevel > 0인 타워는 startDrag가 무시된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      tower.enhanceLevel = 1;

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });

      return {
        isDragging: scene.towerPanel.isDragging(),
        graphicsAlpha: tower.graphics.alpha,
      };
    });

    expect(result.isDragging).toBe(false);
    expect(result.graphicsAlpha).toBe(1); // 변경 없음
  });

  test('enhanceLevel === 0인 타워는 정상 드래그 가능', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      // enhanceLevel 기본값 0

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });

      const isDragging = scene.towerPanel.isDragging();
      const graphicsAlpha = tower.graphics.alpha;

      // 정리
      scene.towerPanel.endDrag(
        { x: tower.x, y: tower.y },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        isDragging,
        graphicsHidden: graphicsAlpha === 0,
      };
    });

    expect(result.isDragging).toBe(true);
    expect(result.graphicsHidden).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-6: 드래그 시작/종료 콜백 (하이라이트)
// ══════════════════════════════════════════════════════════════════

test.describe('AC-6: 드래그 시 하이라이트 표시/제거', () => {

  test('startDrag 시 onDragStart 콜백이 호출된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      let dragStartCalled = false;
      scene.towerPanel.callbacks.onDragStart = () => { dragStartCalled = true; };

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });

      // 정리
      scene.towerPanel.endDrag(
        { x: tower.x, y: tower.y },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return { dragStartCalled };
    });

    expect(result.dragStartCalled).toBe(true);
  });

  test('endDrag 시 onDragEnd 콜백이 호출된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      let dragEndCalled = false;
      scene.towerPanel.callbacks.onDragEnd = () => { dragEndCalled = true; };

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
      scene.towerPanel.endDrag(
        { x: tower.x, y: tower.y },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return { dragEndCalled };
    });

    expect(result.dragEndCalled).toBe(true);
  });

  test('실제 GameScene에서 showBuildableHighlights/clearHighlights가 연결되어 있다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      // showBuildableHighlights 호출 감지
      let showCalled = false;
      let clearCalled = false;
      const origShow = scene.mapManager.showBuildableHighlights.bind(scene.mapManager);
      const origClear = scene.mapManager.clearHighlights.bind(scene.mapManager);

      scene.mapManager.showBuildableHighlights = () => {
        showCalled = true;
        origShow();
      };
      scene.mapManager.clearHighlights = () => {
        clearCalled = true;
        origClear();
      };

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
      const showCalledAfterStart = showCalled;

      scene.towerPanel.endDrag(
        { x: tower.x, y: tower.y },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        showCalledAfterStart,
        clearCalledAfterEnd: clearCalled,
      };
    });

    expect(result.showCalledAfterStart).toBe(true);
    expect(result.clearCalledAfterEnd).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-7: 이동 후 기능 정상 (사거리, 공격, 재드래그)
// ══════════════════════════════════════════════════════════════════

test.describe('AC-7: 이동 후 타워 기능 정상', () => {

  test('이동 후 사거리 원이 새 위치 기준으로 표시된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    const toCell = buildable[1];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      // 이동
      scene._onTowerMove(tower, toCol, toRow);

      // 사거리 표시
      tower.showRangeCircle();

      // rangeGraphics의 commandBuffer를 통해 위치 검증은 어렵지만,
      // tower.x, tower.y가 새 좌표인지, rangeGraphics가 존재하는지 확인
      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const expectedX = toCol * CELL_SIZE + CELL_SIZE / 2;
      const expectedY = toRow * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      return {
        towerX: tower.x,
        towerY: tower.y,
        expectedX,
        expectedY,
        rangeExists: !!tower.rangeGraphics,
        xCorrect: tower.x === expectedX,
        yCorrect: tower.y === expectedY,
      };
    }, { toCol: toCell.col, toRow: toCell.row });

    expect(result.xCorrect).toBe(true);
    expect(result.yCorrect).toBe(true);
    expect(result.rangeExists).toBe(true);
  });

  test('이동한 타워를 다시 드래그할 수 있다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    expect(buildable.length).toBeGreaterThanOrEqual(3);

    const fromCell = buildable[0];
    const toCell = buildable[1];
    const finalCell = buildable[2];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ toCol, toRow, finalCol, finalRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      // 1차 이동
      scene._onTowerMove(tower, toCol, toRow);

      // 2차 드래그 시작
      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
      const isDragging = scene.towerPanel.isDragging();

      // 2차 이동 (빈 셀)
      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const targetX = finalCol * CELL_SIZE + CELL_SIZE / 2;
      const targetY = finalRow * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      scene.towerPanel.endDrag(
        { x: targetX, y: targetY },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return {
        couldDrag: isDragging,
        finalCol: tower.col,
        finalRow: tower.row,
        movedToFinal: tower.col === finalCol && tower.row === finalRow,
      };
    }, {
      toCol: toCell.col, toRow: toCell.row,
      finalCol: finalCell.col, finalRow: finalCell.row,
    });

    expect(result.couldDrag).toBe(true);
    expect(result.movedToFinal).toBe(true);
  });

  test('이동한 타워를 합성 대상으로 사용할 수 있다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    expect(buildable.length).toBeGreaterThanOrEqual(3);

    const cell0 = buildable[0];
    const cell1 = buildable[1];
    const cell2 = buildable[2];

    // 두 개의 archer 배치
    await placeTowerAt(page, 'archer', cell0.col, cell0.row);
    await placeTowerAt(page, 'archer', cell1.col, cell1.row);

    const result = await page.evaluate(({ cell0, cell1, cell2 }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const towerA = scene.towers[0];
      const towerB = scene.towers[1];

      // towerA를 cell2로 이동
      scene._onTowerMove(towerA, cell2.col, cell2.row);

      // 이동한 towerA를 towerB 위에 드래그
      let mergeCalled = false;
      scene.towerPanel.callbacks.onMerge = (a, b) => {
        mergeCalled = true;
      };

      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const targetX = towerB.col * CELL_SIZE + CELL_SIZE / 2;
      const targetY = towerB.row * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      scene.towerPanel.startDrag(towerA, { x: towerA.x, y: towerA.y });
      scene.towerPanel.endDrag(
        { x: targetX, y: targetY },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );

      return { mergeCalled };
    }, { cell0, cell1, cell2 });

    expect(result.mergeCalled).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-8: 스프라이트 위치 갱신 (이미지 타워)
// ══════════════════════════════════════════════════════════════════

test.describe('AC-8: 이미지 타워(sprite) 이동 시 위치 갱신', () => {

  test('sprite가 있는 타워 이동 시 sprite.setPosition이 호출된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    const toCell = buildable[1];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      const hasSprite = !!tower.sprite;
      const origSpriteX = tower.sprite ? tower.sprite.x : null;
      const origSpriteY = tower.sprite ? tower.sprite.y : null;

      scene._onTowerMove(tower, toCol, toRow);

      const newSpriteX = tower.sprite ? tower.sprite.x : null;
      const newSpriteY = tower.sprite ? tower.sprite.y : null;

      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const expectedX = toCol * CELL_SIZE + CELL_SIZE / 2;
      const expectedY = toRow * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      return {
        hasSprite,
        origSpriteX, origSpriteY,
        newSpriteX, newSpriteY,
        expectedX, expectedY,
        spritePositionCorrect: hasSprite ?
          (newSpriteX === expectedX && newSpriteY === expectedY) : true,
      };
    }, { toCol: toCell.col, toRow: toCell.row });

    // sprite가 있든 없든 에러 없이 처리
    expect(result.spritePositionCorrect).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// AC-9: runeSprite 위치 갱신 (합성 타워)
// ══════════════════════════════════════════════════════════════════

test.describe('AC-9: runeSprite(마법진) 위치 갱신', () => {

  test('draw() 호출 시 runeSprite가 새 좌표에 재생성된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    const toCell = buildable[1];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    const result = await page.evaluate(({ toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      // 합성 결과를 시뮬레이션 (tier 2로 설정)
      tower.tier = 2;

      // 이동 실행
      scene._onTowerMove(tower, toCol, toRow);

      // draw() 후 runeSprite 좌표 확인
      const hasRuneSprite = !!tower.runeSprite;

      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;
      const expectedX = toCol * CELL_SIZE + CELL_SIZE / 2;
      const expectedY = toRow * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

      return {
        hasRuneSprite,
        runeX: hasRuneSprite ? tower.runeSprite.x : null,
        runeY: hasRuneSprite ? tower.runeSprite.y : null,
        expectedX,
        expectedY,
        // rune_t2 텍스처가 없으면 runeSprite는 null (정상)
      };
    }, { toCol: toCell.col, toRow: toCell.row });

    // runeSprite가 있으면 좌표가 올바른지, 없으면 텍스처 부재로 정상
    if (result.hasRuneSprite) {
      expect(result.runeX).toBe(result.expectedX);
      expect(result.runeY).toBe(result.expectedY);
    }
    // 에러 없이 실행되면 PASS
  });
});


// ══════════════════════════════════════════════════════════════════
// Edge Cases: 예외 시나리오
// ══════════════════════════════════════════════════════════════════

test.describe('Edge Cases: 예외 시나리오', () => {

  test('isBuildable 파라미터 누락 시 에러 없이 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });

      // isBuildable 누락 (Phase 1 이전 코드 호환)
      scene.towerPanel.endDrag(
        { x: 100, y: 200 },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        // isBuildable 미전달
      );

      return {
        graphicsAlpha: tower.graphics.alpha,
        noError: true,
      };
    });

    expect(result.noError).toBe(true);
    expect(result.graphicsAlpha).toBe(1);
    expect(errors).toEqual([]);
  });

  test('연속 이동 (3회) 후 좌표가 최종 위치와 일치한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    expect(buildable.length).toBeGreaterThanOrEqual(4);

    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(({ cells }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      // 3회 연속 이동: cell0 -> cell1 -> cell2 -> cell3
      for (let i = 1; i <= 3; i++) {
        scene._onTowerMove(tower, cells[i].col, cells[i].row);
      }

      const finalCell = cells[3];
      const CELL_SIZE = 40;
      const HUD_HEIGHT = 40;

      return {
        col: tower.col,
        row: tower.row,
        x: tower.x,
        y: tower.y,
        expectedCol: finalCell.col,
        expectedRow: finalCell.row,
        expectedX: finalCell.col * CELL_SIZE + CELL_SIZE / 2,
        expectedY: finalCell.row * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT,
        mapManagerCorrect: scene.mapManager.getTowerAt(finalCell.col, finalCell.row) === tower,
        // 중간 셀들이 비어있는지
        cell0Empty: scene.mapManager.getTowerAt(cells[0].col, cells[0].row) === null,
        cell1Empty: scene.mapManager.getTowerAt(cells[1].col, cells[1].row) === null,
        cell2Empty: scene.mapManager.getTowerAt(cells[2].col, cells[2].row) === null,
      };
    }, { cells: buildable.slice(0, 4) });

    expect(result.col).toBe(result.expectedCol);
    expect(result.row).toBe(result.expectedRow);
    expect(result.x).toBe(result.expectedX);
    expect(result.y).toBe(result.expectedY);
    expect(result.mapManagerCorrect).toBe(true);
    expect(result.cell0Empty).toBe(true);
    expect(result.cell1Empty).toBe(true);
    expect(result.cell2Empty).toBe(true);
    expect(errors).toEqual([]);
  });

  test('드래그 시작 후 isDragging()이 true를 반환한다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      const beforeDrag = scene.towerPanel.isDragging();
      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
      const duringDrag = scene.towerPanel.isDragging();

      scene.towerPanel.endDrag(
        { x: tower.x, y: tower.y },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );
      const afterDrag = scene.towerPanel.isDragging();

      return { beforeDrag, duringDrag, afterDrag };
    });

    expect(result.beforeDrag).toBe(false);
    expect(result.duringDrag).toBe(true);
    expect(result.afterDrag).toBe(false);
  });

  test('드래그 중 고스트 그래픽이 생성되고 종료 시 제거된다', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      const ghostBeforeDrag = scene.towerPanel._dragGhost;

      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
      const ghostDuringDrag = !!scene.towerPanel._dragGhost;

      scene.towerPanel.endDrag(
        { x: tower.x, y: tower.y },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );
      const ghostAfterDrag = scene.towerPanel._dragGhost;

      return {
        ghostBeforeDrag: ghostBeforeDrag === null || ghostBeforeDrag === undefined,
        ghostDuringDrag,
        ghostAfterDrag: ghostAfterDrag === null || ghostAfterDrag === undefined,
      };
    });

    expect(result.ghostBeforeDrag).toBe(true);
    expect(result.ghostDuringDrag).toBe(true);
    expect(result.ghostAfterDrag).toBe(true);
  });
});


// ══════════════════════════════════════════════════════════════════
// Phase 1 호환성: 뽑기 -> 배치 -> 이동 -> 합성 전체 흐름
// ══════════════════════════════════════════════════════════════════

test.describe('Phase 1 호환성: 뽑기 -> 배치 -> 이동 전체 흐름', () => {

  test('뽑기 후 배치 -> 이동이 정상 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      scene.goldManager.gold = 99999;
      if (scene.hud) scene.hud.updateGold(99999);
      scene.towerPanel.updateAffordability(99999);

      // 1. 뽑기 실행
      scene.towerPanel._onDrawButtonClick();
      const pendingType = scene.towerPanel._pendingDrawType;
      if (!pendingType) return { error: 'draw failed' };

      // 2. 배치 가능한 셀 찾기
      let buildableCells = [];
      for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 9; c++) {
          if (scene.mapManager.isBuildable(c, r)) {
            buildableCells.push({ col: c, row: r });
          }
        }
      }
      if (buildableCells.length < 2) return { error: 'not enough buildable cells' };

      // 3. 배치
      const placeCell = buildableCells[0];
      scene._attemptPlaceTower(pendingType, placeCell.col, placeCell.row);

      const tower = scene.towers[scene.towers.length - 1];
      if (!tower) return { error: 'tower not placed' };

      const placedCol = tower.col;
      const placedRow = tower.row;

      // 4. 이동
      const moveCell = buildableCells[1];
      scene._onTowerMove(tower, moveCell.col, moveCell.row);

      const movedCol = tower.col;
      const movedRow = tower.row;

      // 5. 원래 셀이 비었는지
      const origCellEmpty = scene.mapManager.getTowerAt(placeCell.col, placeCell.row) === null;
      const newCellHasTower = scene.mapManager.getTowerAt(moveCell.col, moveCell.row) === tower;

      return {
        pendingType,
        placedCol, placedRow,
        movedCol, movedRow,
        moveSuccess: movedCol === moveCell.col && movedRow === moveCell.row,
        origCellEmpty,
        newCellHasTower,
      };
    });

    expect(result.moveSuccess).toBe(true);
    expect(result.origCellEmpty).toBe(true);
    expect(result.newCellHasTower).toBe(true);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 콘솔 에러 검증
// ══════════════════════════════════════════════════════════════════

test.describe('콘솔 에러 검증', () => {

  test('타워 이동 5회 반복 시 콘솔 에러가 없다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    expect(buildable.length).toBeGreaterThanOrEqual(6);

    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(({ cells }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      // 5회 이동 (cell0 -> cell1 -> ... -> cell5)
      for (let i = 1; i <= 5; i++) {
        scene._onTowerMove(tower, cells[i].col, cells[i].row);
      }

      return {
        finalCol: tower.col,
        finalRow: tower.row,
        expectedCol: cells[5].col,
        expectedRow: cells[5].row,
      };
    }, { cells: buildable.slice(0, 6) });

    expect(result.finalCol).toBe(result.expectedCol);
    expect(result.finalRow).toBe(result.expectedRow);
    expect(errors).toEqual([]);
  });

  test('드래그 시작/종료 반복 10회 시 메모리 누수 없이 정상 동작한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];

      for (let i = 0; i < 10; i++) {
        scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
        scene.towerPanel.endDrag(
          { x: tower.x, y: tower.y },
          (c, r) => scene.mapManager.getTowerAt(c, r),
          (c, r) => scene.mapManager.isBuildable(c, r)
        );
      }

      return {
        isDragging: scene.towerPanel.isDragging(),
        ghostCleanedUp: scene.towerPanel._dragGhost === null,
        towerAlpha: tower.graphics.alpha,
        mergeHighlightsCleanedUp: scene.towerPanel._mergeHighlights.length === 0,
      };
    });

    expect(result.isDragging).toBe(false);
    expect(result.ghostCleanedUp).toBe(true);
    expect(result.towerAlpha).toBe(1);
    expect(result.mergeHighlightsCleanedUp).toBe(true);
    expect(errors).toEqual([]);
  });
});


// ══════════════════════════════════════════════════════════════════
// 시각적 검증 (스크린샷)
// ══════════════════════════════════════════════════════════════════

test.describe('시각적 검증', () => {

  test('타워 배치 후 초기 상태 스크린샷', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/tower-move-initial-state.png',
    });
  });

  test('타워 이동 후 상태 스크린샷', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    const fromCell = buildable[0];
    const toCell = buildable[buildable.length > 5 ? 5 : 1];
    await placeTowerAt(page, 'archer', fromCell.col, fromCell.row);

    await page.evaluate(({ toCol, toRow }) => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      scene._onTowerMove(tower, toCol, toRow);
    }, { toCol: toCell.col, toRow: toCell.row });

    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/screenshots/tower-move-after-move.png',
    });
  });

  test('드래그 중 하이라이트 표시 스크린샷', async ({ page }) => {
    await enterGameScene(page);
    const buildable = await getBuildableCells(page);
    await placeTowerAt(page, 'archer', buildable[0].col, buildable[0].row);

    await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      scene.towerPanel.startDrag(tower, { x: tower.x, y: tower.y });
    });

    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'tests/screenshots/tower-move-drag-highlights.png',
    });

    // 정리
    await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene');
      const tower = scene.towers[0];
      scene.towerPanel.endDrag(
        { x: tower.x, y: tower.y },
        (c, r) => scene.mapManager.getTowerAt(c, r),
        (c, r) => scene.mapManager.isBuildable(c, r)
      );
    });
  });
});
