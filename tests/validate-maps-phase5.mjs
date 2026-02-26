/**
 * @fileoverview Phase 5 맵 데이터 무결성 검증 스크립트.
 * 실제 소스 코드의 맵 데이터를 인라인으로 복사하여 검증한다.
 * 30개 전체 맵에 대해 validateMapData(), 웨이포인트-셀 일치, 가장자리 행, totalWaves 범위,
 * 경로 다양성, waveOverrides=null 등을 검증한다.
 */

const GRID_COLS = 9;
const GRID_ROWS = 12;
const CELL_EMPTY = 0;
const CELL_PATH = 1;
const CELL_BASE = 2;
const CELL_SPAWN = 3;
const CELL_WALL = 4;

const E = 0, P = 1, B = 2, S = 3, W = 4;

// ── validateMapData (소스코드 maps.js:91 그대로 재현) ──
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
    errors.push(`totalWaves(${mapData.totalWaves})가 ${worldId} 범위 [${min}, ${max}]를 벗어납니다.`);
  }
  return errors;
}

// ── waveOverrides=null 확인 ──
function validateWaveOverridesNull(mapData) {
  if (mapData.waveOverrides !== null) {
    return [`waveOverrides가 null이 아닙니다: ${typeof mapData.waveOverrides}`];
  }
  return [];
}

// ── 경로 패턴 시그니처 (spawnPos + basePos + 경로 방향 전환 횟수) ──
function getPathSignature(mapData) {
  const { waypoints, spawnPos, basePos } = mapData;
  let turns = 0;
  for (let i = 2; i < waypoints.length; i++) {
    const p0 = waypoints[i - 2];
    const p1 = waypoints[i - 1];
    const p2 = waypoints[i];
    const d1c = p1.col - p0.col;
    const d1r = p1.row - p0.row;
    const d2c = p2.col - p1.col;
    const d2r = p2.row - p1.row;
    if (d1c !== d2c || d1r !== d2r) turns++;
  }
  return `spawn(${spawnPos.col},${spawnPos.row})->base(${basePos.col},${basePos.row}):turns=${turns}:wps=${waypoints.length}`;
}

// ===========================
// ACTUAL SOURCE CODE MAP DATA
// (직접 소스 파일에서 복사)
// ===========================

// Forest maps (기존 유지 확인용)
const F1_M1={id:'f1_m1',worldId:'forest',grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:4,row:3},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:8,waveOverrides:null};
const F1_M2={id:'f1_m2',worldId:'forest',grid:[[W,W,S,W,W,W,W,W,W],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:2,row:0},{col:2,row:1},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:2,row:6},{col:2,row:7},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:2,row:0},basePos:{col:6,row:11},totalWaves:9,waveOverrides:null};
const F1_M3={id:'f1_m3',worldId:'forest',grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:1,row:5},{col:2,row:5},{col:3,row:5},{col:4,row:5},{col:5,row:5},{col:6,row:5},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:3,row:8},{col:2,row:8},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:10,waveOverrides:null};
const F1_M4={id:'f1_m4',worldId:'forest',grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:2,row:8},{col:2,row:9},{col:3,row:9},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:10,waveOverrides:null};
const F1_M5={id:'f1_m5',worldId:'forest',grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:3,row:8},{col:2,row:8},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:1,row:0},basePos:{col:1,row:11},totalWaves:11,waveOverrides:null};
const F1_M6={id:'f1_m6',worldId:'forest',grid:[[W,W,W,W,S,W,W,W,W],[E,E,P,P,P,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,P,P,P,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:3,row:1},{col:2,row:1},{col:2,row:2},{col:2,row:3},{col:3,row:3},{col:4,row:3},{col:5,row:3},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:2,row:6},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:5,row:9},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:12,waveOverrides:null};

// Desert maps (d2_m1, d2_m2 기존 + d2_m3~d2_m6 재설계)
const D2_M1={id:'d2_m1',worldId:'desert',grid:[[S,P,P,P,E,E,E,E,W],[E,E,E,P,E,E,E,E,E],[E,E,E,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,E,P,P,P,E,E,E,E],[E,E,P,E,E,E,E,E,E],[W,W,B,W,W,W,W,W,W]],waypoints:[{col:0,row:0},{col:1,row:0},{col:2,row:0},{col:3,row:0},{col:3,row:1},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:5,row:3},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:4,row:8},{col:4,row:9},{col:3,row:9},{col:2,row:9},{col:2,row:10},{col:2,row:11}],spawnPos:{col:0,row:0},basePos:{col:2,row:11},totalWaves:10,waveOverrides:null};
const D2_M2={id:'d2_m2',worldId:'desert',grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:1,row:5},{col:2,row:5},{col:3,row:5},{col:4,row:5},{col:5,row:5},{col:6,row:5},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:11,waveOverrides:null};

// d2_m3~d2_m6: 재설계된 맵 (소스 desert.js에서 복사)
const D2_M3={id:'d2_m3',worldId:'desert',grid:[[W,W,S,W,W,W,W,W,W],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[W,W,B,W,W,W,W,W,W]],waypoints:[{col:2,row:0},{col:2,row:1},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:2,row:8},{col:2,row:9},{col:2,row:10},{col:2,row:11}],spawnPos:{col:2,row:0},basePos:{col:2,row:11},totalWaves:12,waveOverrides:null};
const D2_M4={id:'d2_m4',worldId:'desert',grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:7,row:7},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:13,waveOverrides:null};
const D2_M5={id:'d2_m5',worldId:'desert',grid:[[S,W,W,W,W,W,W,W,W],[P,E,E,E,E,E,E,E,E],[P,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:0,row:0},{col:0,row:1},{col:0,row:2},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:0,row:0},basePos:{col:7,row:11},totalWaves:14,waveOverrides:null};
const D2_M6={id:'d2_m6',worldId:'desert',grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,P,P,P,P,P,P,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,P,P,P,E,E,E],[E,E,E,P,E,E,E,E,E],[W,W,W,B,W,W,W,W,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:2,row:5},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:5,row:7},{col:5,row:8},{col:5,row:9},{col:4,row:9},{col:3,row:9},{col:3,row:10},{col:3,row:11}],spawnPos:{col:1,row:0},basePos:{col:3,row:11},totalWaves:15,waveOverrides:null};

// Tundra maps (t3_m1 기존 + t3_m2~t3_m6 재설계)
const T3_M1={id:'t3_m1',worldId:'tundra',grid:[[S,P,P,P,P,P,P,E,W],[E,E,E,E,E,E,P,E,E],[E,P,P,P,P,P,P,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,P,P,P,P,P,P,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,P,P,P],[E,E,E,E,E,E,E,E,P],[E,E,E,E,E,E,E,E,P],[W,W,W,W,W,W,W,W,B]],waypoints:[{col:0,row:0},{col:1,row:0},{col:2,row:0},{col:3,row:0},{col:4,row:0},{col:5,row:0},{col:6,row:0},{col:6,row:1},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:2,row:7},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:7,row:8},{col:8,row:8},{col:8,row:9},{col:8,row:10},{col:8,row:11}],spawnPos:{col:0,row:0},basePos:{col:8,row:11},totalWaves:12,waveOverrides:null};
const T3_M2={id:'t3_m2',worldId:'tundra',grid:[[W,W,W,S,W,W,W,W,W],[E,E,E,P,E,E,E,E,E],[E,E,E,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,E,E,E,E,P,E,W],[W,W,E,P,P,P,P,E,W],[W,W,E,P,E,E,E,E,W],[E,E,E,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:3,row:0},{col:3,row:1},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:6,row:3},{col:6,row:4},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:3,row:6},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:3,row:0},basePos:{col:6,row:11},totalWaves:13,waveOverrides:null};
const T3_M3={id:'t3_m3',worldId:'tundra',grid:[[W,W,W,W,W,W,S,W,W],[W,E,E,E,E,E,P,E,E],[W,P,P,P,P,P,P,E,E],[W,P,E,E,E,E,E,E,E],[W,P,P,P,P,P,P,E,E],[W,E,E,E,E,E,P,E,E],[W,E,E,E,E,E,P,E,E],[W,P,P,P,P,P,P,E,E],[W,P,E,E,E,E,E,E,E],[W,P,E,E,E,E,E,E,E],[W,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:6,row:0},{col:6,row:1},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:6,row:0},basePos:{col:1,row:11},totalWaves:14,waveOverrides:null};
const T3_M4={id:'t3_m4',worldId:'tundra',grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:3,row:8},{col:2,row:8},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:1,row:0},basePos:{col:1,row:11},totalWaves:15,waveOverrides:null};
const T3_M5={id:'t3_m5',worldId:'tundra',grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,P,P,P,P,E],[E,E,E,E,P,E,E,E,E],[E,W,W,W,P,E,E,E,E],[E,W,P,P,P,E,E,E,E],[E,W,P,E,E,E,E,E,E],[E,W,P,P,P,P,P,E,E],[E,W,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:4,row:3},{col:4,row:4},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:2,row:6},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:6,row:8},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:7,row:0},basePos:{col:6,row:11},totalWaves:16,waveOverrides:null};
const T3_M6={id:'t3_m6',worldId:'tundra',grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:4,row:0},basePos:{col:7,row:11},totalWaves:18,waveOverrides:null};

// Volcano maps (v4_m1 기존 + v4_m2~v4_m6 재설계)
const V4_M1={id:'v4_m1',worldId:'volcano',grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[E,E,P,P,P,P,P,E,E],[E,E,P,E,E,E,E,E,E],[E,E,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,P,P,E,E,E],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:2,row:7},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:5,row:9},{col:5,row:10},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:15,waveOverrides:null};
const V4_M2={id:'v4_m2',worldId:'volcano',grid:[[W,W,S,W,W,W,W,W,W],[E,E,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,W,W,P,P,P,P,P,E],[E,W,W,P,E,E,E,E,E],[E,W,W,P,E,E,E,E,E],[E,W,W,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:2,row:0},{col:2,row:1},{col:3,row:1},{col:4,row:1},{col:5,row:1},{col:6,row:1},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:3,row:5},{col:3,row:6},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:2,row:0},basePos:{col:7,row:11},totalWaves:16,waveOverrides:null};
const V4_M3={id:'v4_m3',worldId:'volcano',grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,W,W,W,E,E,E],[E,P,E,W,W,W,E,E,E],[E,P,E,W,W,W,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:6,row:3},{col:5,row:3},{col:4,row:3},{col:3,row:3},{col:2,row:3},{col:1,row:3},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:7,row:0},basePos:{col:7,row:11},totalWaves:17,waveOverrides:null};
const V4_M4={id:'v4_m4',worldId:'volcano',grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[W,E,E,E,E,E,E,P,W],[W,P,P,P,P,P,P,P,W],[W,P,E,E,E,E,E,E,W],[W,P,P,P,P,P,P,P,W],[W,E,E,E,E,E,E,P,W],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:1,row:0},basePos:{col:7,row:11},totalWaves:18,waveOverrides:null};
const V4_M5={id:'v4_m5',worldId:'volcano',grid:[[W,W,W,W,S,W,W,W,W],[W,E,E,E,P,E,E,E,W],[W,E,P,P,P,E,E,E,W],[W,E,P,E,E,E,E,E,W],[W,E,P,P,P,P,P,E,W],[W,E,E,E,E,E,P,E,W],[W,E,E,E,E,E,P,E,W],[W,E,P,P,P,P,P,E,W],[W,E,P,E,E,E,E,E,W],[W,E,P,P,P,E,E,E,W],[W,E,E,E,P,E,E,E,W],[W,W,W,W,B,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:2,row:3},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:6,row:5},{col:6,row:6},{col:6,row:7},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:2,row:8},{col:2,row:9},{col:3,row:9},{col:4,row:9},{col:4,row:10},{col:4,row:11}],spawnPos:{col:4,row:0},basePos:{col:4,row:11},totalWaves:19,waveOverrides:null};
const V4_M6={id:'v4_m6',worldId:'volcano',grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,P,P,P,E,E,E],[E,E,E,P,E,E,E,E,E],[E,E,P,P,E,E,E,E,E],[E,E,P,E,E,E,E,E,E],[W,W,B,W,W,W,W,W,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:5,row:5},{col:5,row:6},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:3,row:8},{col:3,row:9},{col:2,row:9},{col:2,row:10},{col:2,row:11}],spawnPos:{col:4,row:0},basePos:{col:2,row:11},totalWaves:20,waveOverrides:null};

// Shadow maps (s5_m1 기존 + s5_m2~s5_m6 재설계)
const S5_M1={id:'s5_m1',worldId:'shadow',grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,P,P,P,P,P,E],[E,E,E,P,E,E,E,E,E],[E,E,E,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:6,row:1},{col:5,row:1},{col:4,row:1},{col:3,row:1},{col:3,row:2},{col:3,row:3},{col:4,row:3},{col:5,row:3},{col:6,row:3},{col:7,row:3},{col:7,row:4},{col:7,row:5},{col:6,row:5},{col:5,row:5},{col:4,row:5},{col:3,row:5},{col:2,row:5},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:4,row:8},{col:4,row:9},{col:3,row:9},{col:2,row:9},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:7,row:0},basePos:{col:1,row:11},totalWaves:18,waveOverrides:null};
const S5_M2={id:'s5_m2',worldId:'shadow',grid:[[W,W,S,W,W,W,W,W,W],[E,E,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:2,row:0},{col:2,row:1},{col:3,row:1},{col:4,row:1},{col:5,row:1},{col:6,row:1},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:6,row:7},{col:7,row:7},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:2,row:0},basePos:{col:7,row:11},totalWaves:19,waveOverrides:null};
const S5_M3={id:'s5_m3',worldId:'shadow',grid:[[W,W,W,W,W,W,W,S,W],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,P,P,P,P,P,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,E,E],[E,E,E,E,E,E,P,E,E],[W,W,W,W,W,W,B,W,W]],waypoints:[{col:7,row:0},{col:7,row:1},{col:7,row:2},{col:6,row:2},{col:5,row:2},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:5,row:5},{col:5,row:6},{col:5,row:7},{col:4,row:7},{col:3,row:7},{col:2,row:7},{col:1,row:7},{col:1,row:8},{col:1,row:9},{col:2,row:9},{col:3,row:9},{col:4,row:9},{col:5,row:9},{col:6,row:9},{col:6,row:10},{col:6,row:11}],spawnPos:{col:7,row:0},basePos:{col:6,row:11},totalWaves:20,waveOverrides:null};
const S5_M4={id:'s5_m4',worldId:'shadow',grid:[[W,W,W,W,S,W,W,W,W],[E,E,E,E,P,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[W,W,W,W,W,W,W,B,W]],waypoints:[{col:4,row:0},{col:4,row:1},{col:4,row:2},{col:3,row:2},{col:2,row:2},{col:1,row:2},{col:1,row:3},{col:1,row:4},{col:2,row:4},{col:3,row:4},{col:4,row:4},{col:5,row:4},{col:6,row:4},{col:7,row:4},{col:7,row:5},{col:7,row:6},{col:6,row:6},{col:5,row:6},{col:4,row:6},{col:3,row:6},{col:2,row:6},{col:1,row:6},{col:1,row:7},{col:1,row:8},{col:2,row:8},{col:3,row:8},{col:4,row:8},{col:5,row:8},{col:6,row:8},{col:7,row:8},{col:7,row:9},{col:7,row:10},{col:7,row:11}],spawnPos:{col:4,row:0},basePos:{col:7,row:11},totalWaves:22,waveOverrides:null};
const S5_M5={id:'s5_m5',worldId:'shadow',grid:[[S,W,W,W,W,W,W,W,W],[P,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[E,E,E,E,E,P,E,E,E],[W,W,W,W,W,B,W,W,W]],waypoints:[{col:0,row:0},{col:0,row:1},{col:1,row:1},{col:2,row:1},{col:3,row:1},{col:4,row:1},{col:5,row:1},{col:6,row:1},{col:7,row:1},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:1,row:7},{col:2,row:7},{col:3,row:7},{col:4,row:7},{col:5,row:7},{col:5,row:8},{col:5,row:9},{col:5,row:10},{col:5,row:11}],spawnPos:{col:0,row:0},basePos:{col:5,row:11},totalWaves:23,waveOverrides:null};
const S5_M6={id:'s5_m6',worldId:'shadow',grid:[[W,S,W,W,W,W,W,W,W],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,P,P,P,P,P,P,E],[E,E,E,E,E,E,E,P,E],[E,P,P,P,P,P,P,P,E],[E,P,E,E,E,E,E,E,E],[E,P,E,E,E,E,E,E,E],[W,B,W,W,W,W,W,W,W]],waypoints:[{col:1,row:0},{col:1,row:1},{col:1,row:2},{col:2,row:2},{col:3,row:2},{col:4,row:2},{col:5,row:2},{col:6,row:2},{col:7,row:2},{col:7,row:3},{col:7,row:4},{col:6,row:4},{col:5,row:4},{col:4,row:4},{col:3,row:4},{col:2,row:4},{col:1,row:4},{col:1,row:5},{col:1,row:6},{col:2,row:6},{col:3,row:6},{col:4,row:6},{col:5,row:6},{col:6,row:6},{col:7,row:6},{col:7,row:7},{col:7,row:8},{col:6,row:8},{col:5,row:8},{col:4,row:8},{col:3,row:8},{col:2,row:8},{col:1,row:8},{col:1,row:9},{col:1,row:10},{col:1,row:11}],spawnPos:{col:1,row:0},basePos:{col:1,row:11},totalWaves:25,waveOverrides:null};

// ── 월드 정의 ──
const WORLDS = [
  { id: 'forest', maps: [F1_M1, F1_M2, F1_M3, F1_M4, F1_M5, F1_M6] },
  { id: 'desert', maps: [D2_M1, D2_M2, D2_M3, D2_M4, D2_M5, D2_M6] },
  { id: 'tundra', maps: [T3_M1, T3_M2, T3_M3, T3_M4, T3_M5, T3_M6] },
  { id: 'volcano', maps: [V4_M1, V4_M2, V4_M3, V4_M4, V4_M5, V4_M6] },
  { id: 'shadow', maps: [S5_M1, S5_M2, S5_M3, S5_M4, S5_M5, S5_M6] },
];

// ── 실행 ──
console.log('=== Phase 5 Map Data Validation (Source Code Maps) ===\n');

let totalMaps = 0;
let passedMaps = 0;
let failedMaps = 0;
const allErrors = [];

for (const world of WORLDS) {
  console.log(`--- World: ${world.id} ---`);

  const signatures = [];

  for (const map of world.maps) {
    totalMaps++;
    const result = validateMapData(map);
    const wpErrors = validateWaypointCellTypes(map);
    const edgeErrors = validateEdgePositions(map);
    const waveErrors = validateTotalWaves(map, world.id);
    const woErrors = validateWaveOverridesNull(map);
    const sig = getPathSignature(map);
    signatures.push({ id: map.id, sig });

    const allMapErrors = [...result.errors, ...wpErrors, ...edgeErrors, ...waveErrors, ...woErrors];

    if (allMapErrors.length === 0) {
      passedMaps++;
      console.log(`  PASS: ${map.id} (totalWaves=${map.totalWaves}, waypoints=${map.waypoints.length}, sig=${sig})`);
    } else {
      failedMaps++;
      console.log(`  FAIL: ${map.id}`);
      allMapErrors.forEach(e => console.log(`    - ${e}`));
      allErrors.push(...allMapErrors.map(e => `${map.id}: ${e}`));
    }
  }

  // 같은 월드 내 경로 다양성 확인
  const uniqueSigs = new Set(signatures.map(s => s.sig));
  if (uniqueSigs.size < signatures.length) {
    const msg = `월드 ${world.id}에서 중복 경로 시그니처 발견! (${uniqueSigs.size}/${signatures.length} unique)`;
    console.log(`  WARNING: ${msg}`);
    // 중복 상세 표시
    const sigMap = {};
    for (const s of signatures) {
      if (!sigMap[s.sig]) sigMap[s.sig] = [];
      sigMap[s.sig].push(s.id);
    }
    for (const [sig, ids] of Object.entries(sigMap)) {
      if (ids.length > 1) {
        console.log(`    Duplicate sig: ${sig} => [${ids.join(', ')}]`);
      }
    }
  } else {
    console.log(`  PATH DIVERSITY: OK (${uniqueSigs.size} unique signatures)`);
  }
}

console.log('\n=== Summary ===');
console.log(`Total maps: ${totalMaps}`);
console.log(`Passed: ${passedMaps}`);
console.log(`Failed: ${failedMaps}`);

if (allErrors.length > 0) {
  console.log(`\nERRORS:`);
  allErrors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
} else {
  console.log('\nAll validations PASSED!');
  process.exit(0);
}
