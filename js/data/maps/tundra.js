/**
 * @fileoverview 설원(Tundra) 월드 맵 데이터.
 * 6개 맵을 정의하며, 난이도가 점진적으로 증가한다.
 * 모든 맵은 9x12 그리드, 가장자리 행에 SPAWN/BASE를 배치한다.
 */

import { THEME_TUNDRA } from '../worlds.js';
import { registerMap } from '../maps.js';

// 셀 타입 약어 (가독성용)
const E = 0; // CELL_EMPTY (타워 설치 가능)
const P = 1; // CELL_PATH  (적 이동 경로)
const B = 2; // CELL_BASE  (기지)
const S = 3; // CELL_SPAWN (적 출현)
const W = 4; // CELL_WALL  (설치/이동 불가)

// ── 맵 1: 얼어붙은 고갯길 (넓은 지그재그, 입문용) ──────────────

/** @type {import('../maps.js').MapData} */
export const T3_M1 = {
  id: 't3_m1',
  worldId: 'tundra',
  meta: { nameKey: 'map.t3_m1.name', descKey: 'map.t3_m1.desc', difficulty: 1 },
  grid: [
    [S, P, P, P, P, P, P, E, W],
    [E, E, E, E, E, E, P, E, E],
    [E, P, P, P, P, P, P, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, P, P, P, P, P, P, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, P, P, P, P],
    [E, E, E, E, E, E, E, E, P],
    [E, E, E, E, E, E, E, E, P],
    [W, W, W, W, W, W, W, W, B],
  ],
  waypoints: [
    { col: 0, row: 0 },
    { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
    { col: 4, row: 0 }, { col: 5, row: 0 }, { col: 6, row: 0 },
    { col: 6, row: 1 },
    { col: 6, row: 2 }, { col: 5, row: 2 }, { col: 4, row: 2 },
    { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 },
    { col: 1, row: 4 }, { col: 2, row: 4 }, { col: 3, row: 4 },
    { col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 }, { col: 7, row: 4 },
    { col: 7, row: 5 },
    { col: 7, row: 6 }, { col: 6, row: 6 }, { col: 5, row: 6 },
    { col: 4, row: 6 }, { col: 3, row: 6 }, { col: 2, row: 6 },
    { col: 2, row: 7 },
    { col: 2, row: 8 }, { col: 3, row: 8 }, { col: 4, row: 8 },
    { col: 5, row: 8 }, { col: 6, row: 8 }, { col: 7, row: 8 }, { col: 8, row: 8 },
    { col: 8, row: 9 },
    { col: 8, row: 10 },
    { col: 8, row: 11 },
  ],
  spawnPos: { col: 0, row: 0 },
  basePos: { col: 8, row: 11 },
  totalWaves: 12,
  waveOverrides: null,
  theme: THEME_TUNDRA,
};

// ── 맵 2: 빙하 통로 (U턴+중앙벽) ────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const T3_M2 = {
  id: 't3_m2',
  worldId: 'tundra',
  meta: { nameKey: 'map.t3_m2.name', descKey: 'map.t3_m2.desc', difficulty: 3 },
  grid: [
    [W, W, W, S, W, W, W, W, W],
    [E, E, E, P, E, E, E, E, E],
    [E, E, E, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [W, W, E, E, E, E, P, E, W],
    [W, W, E, P, P, P, P, E, W],
    [W, W, E, P, E, E, E, E, W],
    [E, E, E, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [W, W, W, W, W, W, B, W, W],
  ],
  waypoints: [
    { col: 3, row: 0 },
    { col: 3, row: 1 },
    { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }, { col: 6, row: 2 },
    { col: 6, row: 3 }, { col: 6, row: 4 },
    { col: 6, row: 5 }, { col: 5, row: 5 }, { col: 4, row: 5 }, { col: 3, row: 5 },
    { col: 3, row: 6 },
    { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }, { col: 6, row: 7 },
    { col: 6, row: 8 }, { col: 6, row: 9 }, { col: 6, row: 10 },
    { col: 6, row: 11 },
  ],
  spawnPos: { col: 3, row: 0 },
  basePos: { col: 6, row: 11 },
  totalWaves: 16,
  waveOverrides: null,
  theme: THEME_TUNDRA,
};

// ── 맵 3: 눈보라 언덕 (역S자+좌측벽) ────────────────────────────

/** @type {import('../maps.js').MapData} */
export const T3_M3 = {
  id: 't3_m3',
  worldId: 'tundra',
  meta: { nameKey: 'map.t3_m3.name', descKey: 'map.t3_m3.desc', difficulty: 2 },
  grid: [
    [W, W, W, W, W, W, S, W, W],
    [W, E, E, E, E, E, P, E, E],
    [W, P, P, P, P, P, P, E, E],
    [W, P, E, E, E, E, E, E, E],
    [W, P, P, P, P, P, P, E, E],
    [W, E, E, E, E, E, P, E, E],
    [W, E, E, E, E, E, P, E, E],
    [W, P, P, P, P, P, P, E, E],
    [W, P, E, E, E, E, E, E, E],
    [W, P, E, E, E, E, E, E, E],
    [W, P, E, E, E, E, E, E, E],
    [W, B, W, W, W, W, W, W, W],
  ],
  waypoints: [
    { col: 6, row: 0 },
    { col: 6, row: 1 },
    { col: 6, row: 2 }, { col: 5, row: 2 }, { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 },
    { col: 1, row: 4 }, { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 },
    { col: 6, row: 5 }, { col: 6, row: 6 },
    { col: 6, row: 7 }, { col: 5, row: 7 }, { col: 4, row: 7 }, { col: 3, row: 7 }, { col: 2, row: 7 }, { col: 1, row: 7 },
    { col: 1, row: 8 }, { col: 1, row: 9 }, { col: 1, row: 10 },
    { col: 1, row: 11 },
  ],
  spawnPos: { col: 6, row: 0 },
  basePos: { col: 1, row: 11 },
  totalWaves: 15,
  waveOverrides: null,
  theme: THEME_TUNDRA,
};

// ── 맵 4: 동토의 갈림길 (지그재그 4단) ──────────────────────────

/** @type {import('../maps.js').MapData} */
export const T3_M4 = {
  id: 't3_m4',
  worldId: 'tundra',
  meta: { nameKey: 'map.t3_m4.name', descKey: 'map.t3_m4.desc', difficulty: 1 },
  grid: [
    [W, S, W, W, W, W, W, W, W],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [W, B, W, W, W, W, W, W, W],
  ],
  waypoints: [
    { col: 1, row: 0 },
    { col: 1, row: 1 },
    { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }, { col: 6, row: 2 }, { col: 7, row: 2 },
    { col: 7, row: 3 },
    { col: 7, row: 4 }, { col: 6, row: 4 }, { col: 5, row: 4 }, { col: 4, row: 4 }, { col: 3, row: 4 }, { col: 2, row: 4 }, { col: 1, row: 4 },
    { col: 1, row: 5 },
    { col: 1, row: 6 }, { col: 2, row: 6 }, { col: 3, row: 6 }, { col: 4, row: 6 }, { col: 5, row: 6 }, { col: 6, row: 6 }, { col: 7, row: 6 },
    { col: 7, row: 7 },
    { col: 7, row: 8 }, { col: 6, row: 8 }, { col: 5, row: 8 }, { col: 4, row: 8 }, { col: 3, row: 8 }, { col: 2, row: 8 }, { col: 1, row: 8 },
    { col: 1, row: 9 }, { col: 1, row: 10 },
    { col: 1, row: 11 },
  ],
  spawnPos: { col: 1, row: 0 },
  basePos: { col: 1, row: 11 },
  totalWaves: 13,
  waveOverrides: null,
  theme: THEME_TUNDRA,
};

// ── 맵 5: 만년설 계곡 (사행천+벽) ───────────────────────────────

/** @type {import('../maps.js').MapData} */
export const T3_M5 = {
  id: 't3_m5',
  worldId: 'tundra',
  meta: { nameKey: 'map.t3_m5.name', descKey: 'map.t3_m5.desc', difficulty: 3 },
  grid: [
    [W, W, W, W, W, W, W, S, W],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, P, P, P, P, E],
    [E, E, E, E, P, E, E, E, E],
    [E, W, W, W, P, E, E, E, E],
    [E, W, P, P, P, E, E, E, E],
    [E, W, P, E, E, E, E, E, E],
    [E, W, P, P, P, P, P, E, E],
    [E, W, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [W, W, W, W, W, W, B, W, W],
  ],
  waypoints: [
    { col: 7, row: 0 },
    { col: 7, row: 1 },
    { col: 7, row: 2 }, { col: 6, row: 2 }, { col: 5, row: 2 }, { col: 4, row: 2 },
    { col: 4, row: 3 },
    { col: 4, row: 4 }, { col: 4, row: 5 }, { col: 3, row: 5 }, { col: 2, row: 5 },
    { col: 2, row: 6 },
    { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }, { col: 6, row: 7 },
    { col: 6, row: 8 }, { col: 6, row: 9 }, { col: 6, row: 10 },
    { col: 6, row: 11 },
  ],
  spawnPos: { col: 7, row: 0 },
  basePos: { col: 6, row: 11 },
  totalWaves: 18,
  waveOverrides: null,
  theme: THEME_TUNDRA,
};

// ── 맵 6: 설원의 심장 (5단 지그재그) ────────────────────────────

/** @type {import('../maps.js').MapData} */
export const T3_M6 = {
  id: 't3_m6',
  worldId: 'tundra',
  meta: { nameKey: 'map.t3_m6.name', descKey: 'map.t3_m6.desc', difficulty: 2 },
  grid: [
    [W, W, W, W, S, W, W, W, W],
    [E, E, E, E, P, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [W, W, W, W, W, W, W, B, W],
  ],
  waypoints: [
    { col: 4, row: 0 },
    { col: 4, row: 1 },
    { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 },
    { col: 1, row: 4 }, { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 }, { col: 7, row: 4 },
    { col: 7, row: 5 },
    { col: 7, row: 6 }, { col: 6, row: 6 }, { col: 5, row: 6 }, { col: 4, row: 6 }, { col: 3, row: 6 }, { col: 2, row: 6 }, { col: 1, row: 6 },
    { col: 1, row: 7 },
    { col: 1, row: 8 }, { col: 2, row: 8 }, { col: 3, row: 8 }, { col: 4, row: 8 }, { col: 5, row: 8 }, { col: 6, row: 8 }, { col: 7, row: 8 },
    { col: 7, row: 9 }, { col: 7, row: 10 },
    { col: 7, row: 11 },
  ],
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 7, row: 11 },
  totalWaves: 14,
  waveOverrides: null,
  theme: THEME_TUNDRA,
};

// ── 모든 설원 맵 레지스트리 등록 ────────────────────────────────

/** @type {import('../maps.js').MapData[]} 설원 월드 전체 맵 목록 */
export const TUNDRA_MAPS = [T3_M1, T3_M2, T3_M3, T3_M4, T3_M5, T3_M6];

// 맵 레지스트리에 일괄 등록
TUNDRA_MAPS.forEach(m => registerMap(m));
