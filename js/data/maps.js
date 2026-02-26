/**
 * @fileoverview 맵 데이터 정의 및 유틸리티.
 * 기존 config.js에 하드코딩되었던 MAP_GRID/PATH_WAYPOINTS를 MapData 구조체로 추출하고,
 * 맵 조회(getMapById) 및 무결성 검증(validateMapData) 기능을 제공한다.
 */

import {
  MAP_GRID, PATH_WAYPOINTS,
  GRID_COLS, GRID_ROWS,
  CELL_EMPTY, CELL_PATH, CELL_BASE, CELL_SPAWN, CELL_WALL,
} from '../config.js';

// ── MapData 타입 정의 (JSDoc) ───────────────────────────────────

/**
 * @typedef {object} MapTheme
 * @property {number} emptyTile - 빈 타일 색상 (hex)
 * @property {number} path - 경로 타일 색상 (hex)
 * @property {number} bg - 배경 색상 (hex)
 */

/**
 * @typedef {object} MapData
 * @property {string} id - 맵 고유 식별자
 * @property {string} worldId - 소속 월드 ID
 * @property {{ nameKey: string, descKey: string, difficulty: number }} meta - 맵 메타 정보
 * @property {number[][]} grid - 9×12 셀 타입 배열
 * @property {{ col: number, row: number }[]} waypoints - 스폰→기지 웨이포인트
 * @property {{ col: number, row: number }} spawnPos - 스폰 위치 (그리드 좌표)
 * @property {{ col: number, row: number }} basePos - 기지 위치 (그리드 좌표)
 * @property {number} totalWaves - 총 웨이브 수 (Infinity = 엔드리스)
 * @property {object|null} waveOverrides - 커스텀 웨이브 정의 (null = 기본 WAVE_DEFINITIONS 사용)
 * @property {MapTheme|null} theme - 월드 테마 색상 (null = 기본 색상)
 */

// ── 클래식 맵 (기존 하드코딩 데이터 추출) ───────────────────────

/**
 * 기존 엔드리스 모드에서 사용하던 클래식 맵.
 * config.js의 MAP_GRID, PATH_WAYPOINTS를 그대로 참조한다.
 * @type {MapData}
 */
export const CLASSIC_MAP = {
  id: 'classic',
  worldId: 'classic',
  meta: {
    nameKey: 'map_classic',
    descKey: 'map_classic_desc',
    difficulty: 1,
  },
  grid: MAP_GRID,
  waypoints: PATH_WAYPOINTS,
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 5, row: 11 },
  totalWaves: Infinity,
  waveOverrides: null,
  theme: null,
};

// ── 맵 레지스트리 ───────────────────────────────────────────────

/** @type {Map<string, MapData>} 모든 맵을 ID로 조회하는 레지스트리 */
const mapRegistry = new Map();
mapRegistry.set(CLASSIC_MAP.id, CLASSIC_MAP);

/**
 * 맵 ID로 MapData를 조회한다.
 * @param {string} id - 맵 ID
 * @returns {MapData|null} 맵 데이터, 없으면 null
 */
export function getMapById(id) {
  return mapRegistry.get(id) || null;
}

/**
 * 맵 레지스트리에 새 맵을 등록한다.
 * @param {MapData} mapData - 등록할 맵 데이터
 */
export function registerMap(mapData) {
  mapRegistry.set(mapData.id, mapData);
}

// ── 맵 데이터 검증 ──────────────────────────────────────────────

/**
 * MapData의 무결성을 검증한다.
 * 그리드 크기, 셀 타입 범위, 스폰/기지 존재, 웨이포인트 연결성을 확인한다.
 * @param {MapData} mapData - 검증할 맵 데이터
 * @returns {{ valid: boolean, errors: string[] }} 검증 결과
 */
export function validateMapData(mapData) {
  const errors = [];

  // 필수 필드 확인
  if (!mapData.id) errors.push('id 필드가 없습니다.');
  if (!mapData.grid) errors.push('grid 필드가 없습니다.');
  if (!mapData.waypoints) errors.push('waypoints 필드가 없습니다.');
  if (!mapData.spawnPos) errors.push('spawnPos 필드가 없습니다.');
  if (!mapData.basePos) errors.push('basePos 필드가 없습니다.');

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const { grid, waypoints, spawnPos, basePos } = mapData;

  // 그리드 크기 확인
  if (grid.length !== GRID_ROWS) {
    errors.push(`그리드 행 수가 ${GRID_ROWS}이어야 하지만 ${grid.length}입니다.`);
  }
  for (let r = 0; r < grid.length; r++) {
    if (grid[r].length !== GRID_COLS) {
      errors.push(`행 ${r}의 열 수가 ${GRID_COLS}이어야 하지만 ${grid[r].length}입니다.`);
    }
  }

  // 셀 타입 유효 범위 확인 (0~4)
  const validCells = new Set([CELL_EMPTY, CELL_PATH, CELL_BASE, CELL_SPAWN, CELL_WALL]);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length || 0); c++) {
      if (!validCells.has(grid[r][c])) {
        errors.push(`grid[${r}][${c}]에 유효하지 않은 셀 타입 ${grid[r][c]}이 있습니다.`);
      }
    }
  }

  // 스폰 셀 확인
  if (grid[spawnPos.row]?.[spawnPos.col] !== CELL_SPAWN) {
    errors.push(`spawnPos(${spawnPos.col},${spawnPos.row})에 CELL_SPAWN이 없습니다.`);
  }

  // 기지 셀 확인
  if (grid[basePos.row]?.[basePos.col] !== CELL_BASE) {
    errors.push(`basePos(${basePos.col},${basePos.row})에 CELL_BASE가 없습니다.`);
  }

  // 웨이포인트 최소 개수
  if (waypoints.length < 2) {
    errors.push('웨이포인트가 최소 2개 필요합니다.');
  }

  // 웨이포인트 인접성 확인 (상하좌우만, 대각선 불가)
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const dc = Math.abs(curr.col - prev.col);
    const dr = Math.abs(curr.row - prev.row);
    if (dc + dr !== 1) {
      errors.push(`웨이포인트 ${i - 1}→${i} 간 인접하지 않습니다 (dc=${dc}, dr=${dr}).`);
    }
  }

  // 첫 웨이포인트가 스폰 위치와 일치하는지
  if (waypoints[0].col !== spawnPos.col || waypoints[0].row !== spawnPos.row) {
    errors.push('첫 웨이포인트가 spawnPos와 일치하지 않습니다.');
  }

  // 마지막 웨이포인트가 기지 위치와 일치하는지
  const last = waypoints[waypoints.length - 1];
  if (last.col !== basePos.col || last.row !== basePos.row) {
    errors.push('마지막 웨이포인트가 basePos와 일치하지 않습니다.');
  }

  return { valid: errors.length === 0, errors };
}
