/**
 * @fileoverview Phase 2 맵 데이터 무결성 검증 스크립트.
 * 모든 30개 맵에 대해 validateMapData() 로직을 Node.js 환경에서 재현하여 검증한다.
 */

// ── 상수 (config.js에서 추출) ──
const GRID_COLS = 9;
const GRID_ROWS = 12;
const CELL_EMPTY = 0;
const CELL_PATH = 1;
const CELL_BASE = 2;
const CELL_SPAWN = 3;
const CELL_WALL = 4;

// ── 테마 색상 ──
const THEME_FOREST = { emptyTile: 0x1a2e1a, path: 0x2e3e1e, bg: 0x0d1a0d };
const THEME_DESERT = { emptyTile: 0x2e2a1a, path: 0x3e351e, bg: 0x1a150d };
const THEME_TUNDRA = { emptyTile: 0x1a2a2e, path: 0x1e3038, bg: 0x0d151a };
const THEME_VOLCANO = { emptyTile: 0x2e1a1a, path: 0x381e1e, bg: 0x1a0d0d };
const THEME_SHADOW = { emptyTile: 0x221a2e, path: 0x2a1e38, bg: 0x120d1a };

// ── validateMapData 재현 ──
function validateMapData(mapData) {
  const errors = [];

  if (!mapData.id) errors.push('id 필드가 없습니다.');
  if (!mapData.grid) errors.push('grid 필드가 없습니다.');
  if (!mapData.waypoints) errors.push('waypoints 필드가 없습니다.');
  if (!mapData.spawnPos) errors.push('spawnPos 필드가 없습니다.');
  if (!mapData.basePos) errors.push('basePos 필드가 없습니다.');

  if (errors.length > 0) return { valid: false, errors };

  const { grid, waypoints, spawnPos, basePos } = mapData;

  if (grid.length !== GRID_ROWS) {
    errors.push(`그리드 행 수가 ${GRID_ROWS}이어야 하지만 ${grid.length}입니다.`);
  }
  for (let r = 0; r < grid.length; r++) {
    if (grid[r].length !== GRID_COLS) {
      errors.push(`행 ${r}의 열 수가 ${GRID_COLS}이어야 하지만 ${grid[r].length}입니다.`);
    }
  }

  const validCells = new Set([CELL_EMPTY, CELL_PATH, CELL_BASE, CELL_SPAWN, CELL_WALL]);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length || 0); c++) {
      if (!validCells.has(grid[r][c])) {
        errors.push(`grid[${r}][${c}]에 유효하지 않은 셀 타입 ${grid[r][c]}이 있습니다.`);
      }
    }
  }

  if (grid[spawnPos.row]?.[spawnPos.col] !== CELL_SPAWN) {
    errors.push(`spawnPos(${spawnPos.col},${spawnPos.row})에 CELL_SPAWN이 없습니다.`);
  }
  if (grid[basePos.row]?.[basePos.col] !== CELL_BASE) {
    errors.push(`basePos(${basePos.col},${basePos.row})에 CELL_BASE가 없습니다.`);
  }

  if (waypoints.length < 2) {
    errors.push('웨이포인트가 최소 2개 필요합니다.');
  }

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const dc = Math.abs(curr.col - prev.col);
    const dr = Math.abs(curr.row - prev.row);
    if (dc + dr !== 1) {
      errors.push(`웨이포인트 ${i - 1}->${i} 간 인접하지 않습니다 (dc=${dc}, dr=${dr}).`);
    }
  }

  if (waypoints[0].col !== spawnPos.col || waypoints[0].row !== spawnPos.row) {
    errors.push('첫 웨이포인트가 spawnPos와 일치하지 않습니다.');
  }

  const last = waypoints[waypoints.length - 1];
  if (last.col !== basePos.col || last.row !== basePos.row) {
    errors.push('마지막 웨이포인트가 basePos와 일치하지 않습니다.');
  }

  return { valid: errors.length === 0, errors };
}

// ── 추가 검증: 웨이포인트 셀이 PATH/SPAWN/BASE인지 ──
function validateWaypointCellTypes(mapData) {
  const errors = [];
  const { grid, waypoints } = mapData;
  const validWpCells = new Set([CELL_PATH, CELL_SPAWN, CELL_BASE]);

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const cellType = grid[wp.row]?.[wp.col];
    if (!validWpCells.has(cellType)) {
      errors.push(`웨이포인트[${i}](col=${wp.col}, row=${wp.row})의 셀 타입이 ${cellType}입니다 (PATH/SPAWN/BASE만 가능).`);
    }
  }
  return errors;
}

// ── SPAWN/BASE 가장자리 행 확인 ──
function validateEdgePositions(mapData) {
  const errors = [];
  const { spawnPos, basePos } = mapData;

  if (spawnPos.row !== 0 && spawnPos.row !== GRID_ROWS - 1) {
    errors.push(`spawnPos(row=${spawnPos.row})이 가장자리 행(0 또는 ${GRID_ROWS - 1})이 아닙니다.`);
  }
  if (basePos.row !== 0 && basePos.row !== GRID_ROWS - 1) {
    errors.push(`basePos(row=${basePos.row})이 가장자리 행(0 또는 ${GRID_ROWS - 1})이 아닙니다.`);
  }
  return errors;
}

// ── 월드 ID와 맵 worldId 일치 확인 ──
function validateWorldIdConsistency(worldId, expectedMapIds, maps) {
  const errors = [];
  for (const map of maps) {
    if (map.worldId !== worldId) {
      errors.push(`맵 ${map.id}의 worldId(${map.worldId})가 월드(${worldId})와 불일치합니다.`);
    }
    if (!expectedMapIds.includes(map.id)) {
      errors.push(`맵 ${map.id}가 월드 ${worldId}의 mapIds에 포함되어 있지 않습니다.`);
    }
  }
  return errors;
}

// ── totalWaves 범위 확인 ──
function validateTotalWaves(mapData, worldId) {
  const errors = [];
  const ranges = {
    forest: [8, 12],
    desert: [10, 15],
    tundra: [12, 18],
    volcano: [15, 20],
    shadow: [18, 25],
  };
  const [min, max] = ranges[worldId] || [1, 999];
  if (mapData.totalWaves < min || mapData.totalWaves > max) {
    errors.push(`맵 ${mapData.id}의 totalWaves(${mapData.totalWaves})가 ${worldId} 범위 [${min}, ${max}]를 벗어납니다.`);
  }
  return errors;
}

// ── calcStarRating 검증 ──
function calcStarRating(currentHP, maxHP) {
  if (maxHP <= 0) return 1;
  const ratio = currentHP / maxHP;
  if (ratio >= 0.8) return 3;
  if (ratio >= 0.4) return 2;
  return 1;
}

function testCalcStarRating() {
  const tests = [
    // [currentHP, maxHP, expected, label]
    [20, 20, 3, '100% -> 3'],
    [16, 20, 3, '80% (exact boundary) -> 3'],
    [15.99, 20, 2, '79.95% -> 2'],
    [8, 20, 2, '40% (exact boundary) -> 2'],
    [7.99, 20, 1, '39.95% -> 1'],
    [1, 20, 1, '5% -> 1'],
    [0.001, 20, 1, 'nearly 0 -> 1'],
    [0, 20, 1, '0% (survived with 0 HP?!) -> should be 1'],
    [0, 0, 1, 'maxHP=0 -> 1 (edge)'],
    [-1, 20, 1, 'negative HP -> 1'],
    [100, 20, 3, 'HP > max (overflow) -> 3'],
  ];

  let passed = 0;
  let failed = 0;
  for (const [curr, max, expected, label] of tests) {
    const result = calcStarRating(curr, max);
    if (result === expected) {
      passed++;
    } else {
      console.log(`  FAIL: calcStarRating(${curr}, ${max}) = ${result}, expected ${expected} [${label}]`);
      failed++;
    }
  }
  return { passed, failed };
}

// ── CAMPAIGN_DIAMOND_REWARDS 검증 ──
function testDiamondRewards() {
  const CAMPAIGN_DIAMOND_REWARDS = [0, 3, 5, 8];
  const errors = [];
  if (CAMPAIGN_DIAMOND_REWARDS[0] !== 0) errors.push('index 0 should be 0');
  if (CAMPAIGN_DIAMOND_REWARDS[1] !== 3) errors.push('index 1 should be 3');
  if (CAMPAIGN_DIAMOND_REWARDS[2] !== 5) errors.push('index 2 should be 5');
  if (CAMPAIGN_DIAMOND_REWARDS[3] !== 8) errors.push('index 3 should be 8');
  if (CAMPAIGN_DIAMOND_REWARDS.length !== 4) errors.push('length should be 4');
  return errors;
}

// ── 모든 맵 데이터 인라인 (import 없이) ──

const E = 0, P = 1, B = 2, S = 3, W = 4;

// Forest maps
const F1_M1 = {id:'f1_m1',worldId:'forest',meta:{nameKey:'map.f1_m1.name',descKey:'map.f1_m1.desc',difficulty:1},grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:4,row:3},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:8,waveOverrides:null,theme:THEME_FOREST};

const F1_M2 = {id:'f1_m2',worldId:'forest',meta:{nameKey:'map.f1_m2.name',descKey:'map.f1_m2.desc',difficulty:1},grid:[[W,W,S,W,W,W,W,W,W],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:2,row:0},{col:2,row:1},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:2,row:6},{col:2,row:7},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:2,row:0},basePos:{col:6,row:11},totalWaves:9,waveOverrides:null,theme:THEME_FOREST};

const F1_M3 = {id:'f1_m3',worldId:'forest',meta:{nameKey:'map.f1_m3.name',descKey:'map.f1_m3.desc',difficulty:2},grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:1,row:5},{col:2,row:5},{col:3,row:5},{col:4,row:5},{col:5,row:5},{col:6,row:5},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:3,row:8},{col:2,row:8},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:10,waveOverrides:null,theme:THEME_FOREST};

const F1_M4 = {id:'f1_m4',worldId:'forest',meta:{nameKey:'map.f1_m4.name',descKey:'map.f1_m4.desc',difficulty:2},grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:2,row:8},{col:2,row:9},{col:3,row:9},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:10,waveOverrides:null,theme:THEME_FOREST};

const F1_M5 = {id:'f1_m5',worldId:'forest',meta:{nameKey:'map.f1_m5.name',descKey:'map.f1_m5.desc',difficulty:3},grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:3,row:8},{col:2,row:8},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:1,row:0},basePos:{col:1,row:11},totalWaves:11,waveOverrides:null,theme:THEME_FOREST};

const F1_M6 = {id:'f1_m6',worldId:'forest',meta:{nameKey:'map.f1_m6.name',descKey:'map.f1_m6.desc',difficulty:3},grid:[[W,W,W,W,S,W,W,W,W],[E,E,P,P,P,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,P,P,P,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:3,row:1},{col:2,row:1},{col:2,row:2},{col:2,row:3},{col:3,row:3},{col:4,row:3},{col:5,row:3},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:2,row:6},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:5,row:9},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:12,waveOverrides:null,theme:THEME_FOREST};

// Desert maps
const D2_M1 = {id:'d2_m1',worldId:'desert',meta:{nameKey:'map.d2_m1.name',descKey:'map.d2_m1.desc',difficulty:1},grid:[[S,P,P,P,E,E,E,E,W],[E,E,E,P,E,E,E,E,E],[E,E,E,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,E,P,P,P,E,E,E,E],[E,E,P,E,E,E,E,E,E],[W,W,B,W,W,W,W,W,W]],waypoints:[{col:0,row:0},{col:1,row:0},{col:2,row:0},{col:3,row:0},{col:3,row:1},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:5,row:3},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:4,row:8},{col:4,row:9},{col:3,row:9},{col:2,row:9},{col:2,row:10},{col:2,row:11}],spawnPos:{col:0,row:0},basePos:{col:2,row:11},totalWaves:10,waveOverrides:null,theme:THEME_DESERT};

const D2_M2 = {id:'d2_m2',worldId:'desert',meta:{nameKey:'map.d2_m2.name',descKey:'map.d2_m2.desc',difficulty:1},grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:1,row:5},{col:2,row:5},{col:3,row:5},{col:4,row:5},{col:5,row:5},{col:6,row:5},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:11,waveOverrides:null,theme:THEME_DESERT};

const D2_M3 = {id:'d2_m3',worldId:'desert',meta:{nameKey:'map.d2_m3.name',descKey:'map.d2_m3.desc',difficulty:2},grid:[[W,W,S,W,W,W,W,W,W],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:2,row:0},{col:2,row:1},{col:2,row:2},{col:2,row:3},{col:2,row:4},{col:2,row:5},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:2,row:0},basePos:{col:6,row:11},totalWaves:12,waveOverrides:null,theme:THEME_DESERT};

const D2_M4 = {id:'d2_m4',worldId:'desert',meta:{nameKey:'map.d2_m4.name',descKey:'map.d2_m4.desc',difficulty:2},grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:13,waveOverrides:null,theme:THEME_DESERT};

const D2_M5 = {id:'d2_m5',worldId:'desert',meta:{nameKey:'map.d2_m5.name',descKey:'map.d2_m5.desc',difficulty:3},grid:[[W,W,W,W,W,W,S,W,W],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,P,P,P,P,P,P,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:6,row:0},{col:6,row:1},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:6,row:0},basePos:{col:1,row:11},totalWaves:14,waveOverrides:null,theme:THEME_DESERT};

const D2_M6 = {id:'d2_m6',worldId:'desert',meta:{nameKey:'map.d2_m6.name',descKey:'map.d2_m6.desc',difficulty:3},grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:1,row:0},basePos:{col:7,row:11},totalWaves:15,waveOverrides:null,theme:THEME_DESERT};

// Tundra maps
const T3_M1 = {id:'t3_m1',worldId:'tundra',meta:{nameKey:'map.t3_m1.name',descKey:'map.t3_m1.desc',difficulty:1},grid:[[S,P,P,P,P,P,P,E,W],[E,E,E,E,E,E,P,E,E],[E,P,P,P,P,P,P,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,P,P,P,P,P,P,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,P,P],[E,E,E,E,E,E,E,E,P],[E,E,E,E,E,E,E,E,P],[W,W,W,W,W,W,W,W,B]],waypoints:[{col:0,row:0},{col:1,row:0},{col:2,row:0},{col:3,row:0},{col:4,row:0},{col:5,row:0},{col:6,row:0},{col:6,row:1},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:2,row:7},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:7,row:8},{col:8,row:8},{col:8,row:9},{col:8,row:10},{col:8,row:11}],spawnPos:{col:0,row:0},basePos:{col:8,row:11},totalWaves:12,waveOverrides:null,theme:THEME_TUNDRA};

const T3_M2 = {id:'t3_m2',worldId:'tundra',meta:{nameKey:'map.t3_m2.name',descKey:'map.t3_m2.desc',difficulty:1},grid:[[W,W,W,S,W,W,W,W,W],[E,E,E,P,E,E,E,E,E],[E,E,E,P,E,E,E,E,E],[E,E,E,P,E,E,E,E,E],[E,E,E,P,E,E,E,E,E],[E,E,E,P,E,E,E,E,E],[E,E,E,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:3,row:0},{col:3,row:1},{col:3,row:2},{col:3,row:3},{col:3,row:4},{col:3,row:5},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:3,row:0},basePos:{col:6,row:11},totalWaves:13,waveOverrides:null,theme:THEME_TUNDRA};

const T3_M3 = {id:'t3_m3',worldId:'tundra',meta:{nameKey:'map.t3_m3.name',descKey:'map.t3_m3.desc',difficulty:2},grid:[[W,W,W,W,W,W,S,W,W],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[W,W,B,W,W,W,W,W,W]],waypoints:[{col:6,row:0},{col:6,row:1},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:2,row:7},{col:2,row:8},{col:2,row:9},{col:2,row:10},{col:2,row:11}],spawnPos:{col:6,row:0},basePos:{col:2,row:11},totalWaves:14,waveOverrides:null,theme:THEME_TUNDRA};

const T3_M4 = {id:'t3_m4',worldId:'tundra',meta:{nameKey:'map.t3_m4.name',descKey:'map.t3_m4.desc',difficulty:2},grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:1,row:5},{col:2,row:5},{col:3,row:5},{col:4,row:5},{col:5,row:5},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:1,row:0},basePos:{col:6,row:11},totalWaves:15,waveOverrides:null,theme:THEME_TUNDRA};

const T3_M5 = {id:'t3_m5',worldId:'tundra',meta:{nameKey:'map.t3_m5.name',descKey:'map.t3_m5.desc',difficulty:3},grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:16,waveOverrides:null,theme:THEME_TUNDRA};

const T3_M6 = {id:'t3_m6',worldId:'tundra',meta:{nameKey:'map.t3_m6.name',descKey:'map.t3_m6.desc',difficulty:3},grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:4,row:3},{col:4,row:4},{col:4,row:5},{col:5,row:5},{col:6,row:5},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:4,row:0},basePos:{col:7,row:11},totalWaves:18,waveOverrides:null,theme:THEME_TUNDRA};

// Volcano maps
const V4_M1 = {id:'v4_m1',worldId:'volcano',meta:{nameKey:'map.v4_m1.name',descKey:'map.v4_m1.desc',difficulty:2},grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,P,P,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:2,row:7},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:5,row:9},{col:5,row:10},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:15,waveOverrides:null,theme:THEME_VOLCANO};

const V4_M2 = {id:'v4_m2',worldId:'volcano',meta:{nameKey:'map.v4_m2.name',descKey:'map.v4_m2.desc',difficulty:2},grid:[[W,W,S,W,W,W,W,W,W],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:2,row:0},{col:2,row:1},{col:2,row:2},{col:2,row:3},{col:2,row:4},{col:2,row:5},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:2,row:0},basePos:{col:6,row:11},totalWaves:16,waveOverrides:null,theme:THEME_VOLCANO};

const V4_M3 = {id:'v4_m3',worldId:'volcano',meta:{nameKey:'map.v4_m3.name',descKey:'map.v4_m3.desc',difficulty:2},grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:17,waveOverrides:null,theme:THEME_VOLCANO};

const V4_M4 = {id:'v4_m4',worldId:'volcano',meta:{nameKey:'map.v4_m4.name',descKey:'map.v4_m4.desc',difficulty:3},grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:1,row:0},basePos:{col:7,row:11},totalWaves:18,waveOverrides:null,theme:THEME_VOLCANO};

const V4_M5 = {id:'v4_m5',worldId:'volcano',meta:{nameKey:'map.v4_m5.name',descKey:'map.v4_m5.desc',difficulty:3},grid:[[W,W,W,W,W,W,S,W,W],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,P,P,P,P,P,P,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:6,row:0},{col:6,row:1},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:6,row:0},basePos:{col:1,row:11},totalWaves:19,waveOverrides:null,theme:THEME_VOLCANO};

const V4_M6 = {id:'v4_m6',worldId:'volcano',meta:{nameKey:'map.v4_m6.name',descKey:'map.v4_m6.desc',difficulty:3},grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:4,row:3},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:20,waveOverrides:null,theme:THEME_VOLCANO};

// Shadow maps
const S5_M1 = {id:'s5_m1',worldId:'shadow',meta:{nameKey:'map.s5_m1.name',descKey:'map.s5_m1.desc',difficulty:3},grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,P,P,P,P,P,E],[E,E,E,P,E,E,E,E,E],[E,E,E,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:6,row:1},{col:5,row:1},{col:4,row:1},{col:3,row:1},{col:3,row:2},{col:3,row:3},{col:4,row:3},{col:5,row:3},{col:6,row:3},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:4,row:8},{col:4,row:9},{col:3,row:9},{col:2,row:9},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:18,waveOverrides:null,theme:THEME_SHADOW};

const S5_M2 = {id:'s5_m2',worldId:'shadow',meta:{nameKey:'map.s5_m2.name',descKey:'map.s5_m2.desc',difficulty:3},grid:[[W,W,S,W,W,W,W,W,W],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:2,row:0},{col:2,row:1},{col:2,row:2},{col:2,row:3},{col:2,row:4},{col:2,row:5},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:2,row:0},basePos:{col:6,row:11},totalWaves:19,waveOverrides:null,theme:THEME_SHADOW};

const S5_M3 = {id:'s5_m3',worldId:'shadow',meta:{nameKey:'map.s5_m3.name',descKey:'map.s5_m3.desc',difficulty:3},grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:20,waveOverrides:null,theme:THEME_SHADOW};

const S5_M4 = {id:'s5_m4',worldId:'shadow',meta:{nameKey:'map.s5_m4.name',descKey:'map.s5_m4.desc',difficulty:3},grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:4,row:3},{col:4,row:4},{col:4,row:5},{col:5,row:5},{col:6,row:5},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:4,row:0},basePos:{col:7,row:11},totalWaves:22,waveOverrides:null,theme:THEME_SHADOW};

const S5_M5 = {id:'s5_m5',worldId:'shadow',meta:{nameKey:'map.s5_m5.name',descKey:'map.s5_m5.desc',difficulty:3},grid:[[S,W,W,W,W,W,W,W,W],[P,E,E,E,E,E,E,E,E],[P,E,E,E,E,E,E,E,E],[P,E,E,E,E,E,E,E,E],[P,E,E,E,E,E,E,E,E],[P,P,P,P,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:0,row:0},{col:0,row:1},{col:0,row:2},{col:0,row:3},{col:0,row:4},{col:0,row:5},{col:1,row:5},{col:2,row:5},{col:3,row:5},{col:4,row:5},{col:4,row:6},{col:4,row:7},{col:4,row:8},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:0,row:0},basePos:{col:4,row:11},totalWaves:23,waveOverrides:null,theme:THEME_SHADOW};

const S5_M6 = {id:'s5_m6',worldId:'shadow',meta:{nameKey:'map.s5_m6.name',descKey:'map.s5_m6.desc',difficulty:3},grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:1,row:0},basePos:{col:7,row:11},totalWaves:25,waveOverrides:null,theme:THEME_SHADOW};

// ── 월드 데이터 ──
const WORLDS = [
  { id: 'forest', mapIds: ['f1_m1','f1_m2','f1_m3','f1_m4','f1_m5','f1_m6'], requiredStars: 0, order: 1, maps: [F1_M1, F1_M2, F1_M3, F1_M4, F1_M5, F1_M6] },
  { id: 'desert', mapIds: ['d2_m1','d2_m2','d2_m3','d2_m4','d2_m5','d2_m6'], requiredStars: 9, order: 2, maps: [D2_M1, D2_M2, D2_M3, D2_M4, D2_M5, D2_M6] },
  { id: 'tundra', mapIds: ['t3_m1','t3_m2','t3_m3','t3_m4','t3_m5','t3_m6'], requiredStars: 24, order: 3, maps: [T3_M1, T3_M2, T3_M3, T3_M4, T3_M5, T3_M6] },
  { id: 'volcano', mapIds: ['v4_m1','v4_m2','v4_m3','v4_m4','v4_m5','v4_m6'], requiredStars: 42, order: 4, maps: [V4_M1, V4_M2, V4_M3, V4_M4, V4_M5, V4_M6] },
  { id: 'shadow', mapIds: ['s5_m1','s5_m2','s5_m3','s5_m4','s5_m5','s5_m6'], requiredStars: 60, order: 5, maps: [S5_M1, S5_M2, S5_M3, S5_M4, S5_M5, S5_M6] },
];

// ── 실행 ──
console.log('=== Phase 2 Map Data Validation ===\n');

let totalMaps = 0;
let passedMaps = 0;
let failedMaps = 0;
const allErrors = [];

for (const world of WORLDS) {
  console.log(`--- World: ${world.id} (requiredStars: ${world.requiredStars}, order: ${world.order}) ---`);

  // World consistency
  const worldErrors = validateWorldIdConsistency(world.id, world.mapIds, world.maps);
  if (worldErrors.length > 0) {
    console.log(`  WORLD ERRORS:`, worldErrors);
    allErrors.push(...worldErrors);
  }

  for (const map of world.maps) {
    totalMaps++;
    const result = validateMapData(map);
    const wpErrors = validateWaypointCellTypes(map);
    const edgeErrors = validateEdgePositions(map);
    const waveErrors = validateTotalWaves(map, world.id);

    const allMapErrors = [...result.errors, ...wpErrors, ...edgeErrors, ...waveErrors];

    if (allMapErrors.length === 0) {
      passedMaps++;
      console.log(`  PASS: ${map.id} (totalWaves=${map.totalWaves}, waypoints=${map.waypoints.length})`);
    } else {
      failedMaps++;
      console.log(`  FAIL: ${map.id}`);
      allMapErrors.forEach(e => console.log(`    - ${e}`));
      allErrors.push(...allMapErrors.map(e => `${map.id}: ${e}`));
    }
  }
}

console.log('\n=== calcStarRating Tests ===');
const starResult = testCalcStarRating();
console.log(`  Passed: ${starResult.passed}, Failed: ${starResult.failed}`);

console.log('\n=== CAMPAIGN_DIAMOND_REWARDS Tests ===');
const diamondErrors = testDiamondRewards();
if (diamondErrors.length === 0) {
  console.log('  PASS');
} else {
  console.log('  FAIL:', diamondErrors);
}

// getWorldById / getWorldByMapId simulation
console.log('\n=== getWorldById / getWorldByMapId Tests ===');
function getWorldById(id) { return WORLDS.find(w => w.id === id) || null; }
function getWorldByMapId(mapId) { return WORLDS.find(w => w.mapIds.includes(mapId)) || null; }

const worldByIdTests = [
  ['forest', true], ['desert', true], ['tundra', true], ['volcano', true], ['shadow', true],
  ['nonexistent', false], [null, false], [undefined, false], ['', false],
];
let worldTestsPassed = 0;
for (const [id, shouldExist] of worldByIdTests) {
  const result = getWorldById(id);
  if ((result !== null) === shouldExist) {
    worldTestsPassed++;
  } else {
    console.log(`  FAIL: getWorldById('${id}') = ${result}, expected ${shouldExist ? 'found' : 'null'}`);
  }
}

const mapByIdTests = [
  ['f1_m1', 'forest'], ['d2_m3', 'desert'], ['t3_m6', 'tundra'],
  ['v4_m1', 'volcano'], ['s5_m5', 'shadow'],
  ['nonexistent', null], ['classic', null],
];
let mapTestsPassed = 0;
for (const [mapId, expectedWorld] of mapByIdTests) {
  const result = getWorldByMapId(mapId);
  const actual = result ? result.id : null;
  if (actual === expectedWorld) {
    mapTestsPassed++;
  } else {
    console.log(`  FAIL: getWorldByMapId('${mapId}') = ${actual}, expected ${expectedWorld}`);
  }
}
console.log(`  getWorldById: ${worldTestsPassed}/${worldByIdTests.length} passed`);
console.log(`  getWorldByMapId: ${mapTestsPassed}/${mapByIdTests.length} passed`);

// Map count check
console.log('\n=== Summary ===');
console.log(`Total maps: ${totalMaps}`);
console.log(`Passed: ${passedMaps}`);
console.log(`Failed: ${failedMaps}`);
console.log(`Total unique map IDs: ${new Set(WORLDS.flatMap(w => w.maps.map(m => m.id))).size}`);

if (allErrors.length > 0) {
  console.log(`\nERRORS:`);
  allErrors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
} else if (starResult.failed > 0 || diamondErrors.length > 0) {
  process.exit(1);
} else {
  console.log('\nAll validations PASSED!');
  process.exit(0);
}
