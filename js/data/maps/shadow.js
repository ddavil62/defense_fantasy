/**
 * @fileoverview 그림자(Shadow) 월드 맵 데이터.
 * 6개 맵을 정의하며, 난이도가 점진적으로 증가한다.
 * 모든 맵은 9x12 그리드, 가장자리 행에 SPAWN/BASE를 배치한다.
 */

import { THEME_SHADOW } from '../worlds.js';
import { registerMap } from '../maps.js';

// 셀 타입 약어 (가독성용)
const E = 0; // CELL_EMPTY (타워 설치 가능)
const P = 1; // CELL_PATH  (적 이동 경로)
const B = 2; // CELL_BASE  (기지)
const S = 3; // CELL_SPAWN (적 출현)
const W = 4; // CELL_WALL  (설치/이동 불가)

// ── 맵 1: 그림자 회랑 (지그재그 6턴, 우상→좌하) ────────────────

/** @type {import('../maps.js').MapData} */
export const S5_M1 = {
  id: 's5_m1',
  worldId: 'shadow',
  meta: { nameKey: 'map.s5_m1.name', descKey: 'map.s5_m1.desc', difficulty: 3 },
  grid: [
    [W, W, W, W, W, W, W, S, W],
    [E, E, E, P, P, P, P, P, E],
    [E, E, E, P, E, E, E, E, E],
    [E, E, E, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, E, E, E, E],
    [E, E, E, E, P, E, E, E, E],
    [E, P, P, P, P, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [W, B, W, W, W, W, W, W, W],
  ],
  waypoints: [
    { col: 7, row: 0 },
    { col: 7, row: 1 },
    { col: 6, row: 1 }, { col: 5, row: 1 }, { col: 4, row: 1 }, { col: 3, row: 1 },
    { col: 3, row: 2 }, { col: 3, row: 3 },
    { col: 4, row: 3 }, { col: 5, row: 3 }, { col: 6, row: 3 }, { col: 7, row: 3 },
    { col: 7, row: 4 }, { col: 7, row: 5 },
    { col: 6, row: 5 }, { col: 5, row: 5 }, { col: 4, row: 5 }, { col: 3, row: 5 }, { col: 2, row: 5 }, { col: 1, row: 5 },
    { col: 1, row: 6 }, { col: 1, row: 7 },
    { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 },
    { col: 4, row: 8 }, { col: 4, row: 9 },
    { col: 3, row: 9 }, { col: 2, row: 9 }, { col: 1, row: 9 },
    { col: 1, row: 10 },
    { col: 1, row: 11 },
  ],
  spawnPos: { col: 7, row: 0 },
  basePos: { col: 1, row: 11 },
  totalWaves: 20,
  waveOverrides: null,
  theme: THEME_SHADOW,
};

// ── 맵 2: 암흑 통로 (Z자 3단) ────────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const S5_M2 = {
  id: 's5_m2',
  worldId: 'shadow',
  meta: { nameKey: 'map.s5_m2.name', descKey: 'map.s5_m2.desc', difficulty: 3 },
  grid: [
    [W, W, S, W, W, W, W, W, W],
    [E, E, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [W, W, W, W, W, W, W, B, W],
  ],
  waypoints: [
    { col: 2, row: 0 },
    { col: 2, row: 1 }, { col: 3, row: 1 }, { col: 4, row: 1 }, { col: 5, row: 1 }, { col: 6, row: 1 }, { col: 7, row: 1 },
    { col: 7, row: 2 }, { col: 7, row: 3 },
    { col: 7, row: 4 }, { col: 6, row: 4 }, { col: 5, row: 4 }, { col: 4, row: 4 }, { col: 3, row: 4 }, { col: 2, row: 4 }, { col: 1, row: 4 },
    { col: 1, row: 5 }, { col: 1, row: 6 },
    { col: 1, row: 7 }, { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }, { col: 6, row: 7 }, { col: 7, row: 7 },
    { col: 7, row: 8 }, { col: 7, row: 9 }, { col: 7, row: 10 },
    { col: 7, row: 11 },
  ],
  spawnPos: { col: 2, row: 0 },
  basePos: { col: 7, row: 11 },
  totalWaves: 23,
  waveOverrides: null,
  theme: THEME_SHADOW,
};

// ── 맵 3: 어둠의 미로 (꺾임 7회 경로) ──────────────────────────

/** @type {import('../maps.js').MapData} */
export const S5_M3 = {
  id: 's5_m3',
  worldId: 'shadow',
  meta: { nameKey: 'map.s5_m3.name', descKey: 'map.s5_m3.desc', difficulty: 3 },
  grid: [
    [W, W, W, W, W, W, W, S, W],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, P, P, P, P, P, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [W, W, W, W, W, W, B, W, W],
  ],
  waypoints: [
    { col: 7, row: 0 },
    { col: 7, row: 1 },
    { col: 7, row: 2 }, { col: 6, row: 2 }, { col: 5, row: 2 }, { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 },
    { col: 1, row: 4 }, { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 },
    { col: 5, row: 5 }, { col: 5, row: 6 },
    { col: 5, row: 7 }, { col: 4, row: 7 }, { col: 3, row: 7 }, { col: 2, row: 7 }, { col: 1, row: 7 },
    { col: 1, row: 8 },
    { col: 1, row: 9 }, { col: 2, row: 9 }, { col: 3, row: 9 }, { col: 4, row: 9 }, { col: 5, row: 9 }, { col: 6, row: 9 },
    { col: 6, row: 10 },
    { col: 6, row: 11 },
  ],
  spawnPos: { col: 7, row: 0 },
  basePos: { col: 6, row: 11 },
  totalWaves: 22,
  waveOverrides: null,
  theme: THEME_SHADOW,
};

// ── 맵 4: 망각의 길 (5단 Z자) ────────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const S5_M4 = {
  id: 's5_m4',
  worldId: 'shadow',
  meta: { nameKey: 'map.s5_m4.name', descKey: 'map.s5_m4.desc', difficulty: 3 },
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
  totalWaves: 19,
  waveOverrides: null,
  theme: THEME_SHADOW,
};

// ── 맵 5: 심연의 나선 (사각 회랑) ───────────────────────────────

/** @type {import('../maps.js').MapData} */
export const S5_M5 = {
  id: 's5_m5',
  worldId: 'shadow',
  meta: { nameKey: 'map.s5_m5.name', descKey: 'map.s5_m5.desc', difficulty: 3 },
  grid: [
    [S, W, W, W, W, W, W, W, W],
    [P, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [W, W, W, W, W, B, W, W, W],
  ],
  waypoints: [
    { col: 0, row: 0 },
    { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 }, { col: 4, row: 1 }, { col: 5, row: 1 }, { col: 6, row: 1 }, { col: 7, row: 1 },
    { col: 7, row: 2 }, { col: 7, row: 3 },
    { col: 7, row: 4 }, { col: 6, row: 4 }, { col: 5, row: 4 }, { col: 4, row: 4 }, { col: 3, row: 4 }, { col: 2, row: 4 }, { col: 1, row: 4 },
    { col: 1, row: 5 }, { col: 1, row: 6 },
    { col: 1, row: 7 }, { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 },
    { col: 5, row: 8 }, { col: 5, row: 9 }, { col: 5, row: 10 },
    { col: 5, row: 11 },
  ],
  spawnPos: { col: 0, row: 0 },
  basePos: { col: 5, row: 11 },
  totalWaves: 25,
  waveOverrides: null,
  theme: THEME_SHADOW,
};

// ── 맵 6: 그림자의 심장 (6단 S자, 최장 경로) ───────────────────

/** @type {import('../maps.js').MapData} */
export const S5_M6 = {
  id: 's5_m6',
  worldId: 'shadow',
  meta: { nameKey: 'map.s5_m6.name', descKey: 'map.s5_m6.desc', difficulty: 3 },
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
  totalWaves: 18,
  waveOverrides: null,
  theme: THEME_SHADOW,
};

// ── 모든 그림자 맵 레지스트리 등록 ──────────────────────────────

/** @type {import('../maps.js').MapData[]} 그림자 월드 전체 맵 목록 */
export const SHADOW_MAPS = [S5_M1, S5_M2, S5_M3, S5_M4, S5_M5, S5_M6];

// 맵 레지스트리에 일괄 등록
SHADOW_MAPS.forEach(m => registerMap(m));
