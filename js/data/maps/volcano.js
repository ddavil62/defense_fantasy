/**
 * @fileoverview 화산(Volcano) 월드 맵 데이터.
 * 6개 맵을 정의하며, 난이도가 점진적으로 증가한다.
 * 모든 맵은 9x12 그리드, 가장자리 행에 SPAWN/BASE를 배치한다.
 */

import { THEME_VOLCANO } from '../worlds.js';
import { registerMap } from '../maps.js';

// 셀 타입 약어 (가독성용)
const E = 0; // CELL_EMPTY (타워 설치 가능)
const P = 1; // CELL_PATH  (적 이동 경로)
const B = 2; // CELL_BASE  (기지)
const S = 3; // CELL_SPAWN (적 출현)
const W = 4; // CELL_WALL  (설치/이동 불가)

// ── 맵 1: 용암 회랑 (S자 다중 턴, 입문용) ──────────────────────

/** @type {import('../maps.js').MapData} */
export const V4_M1 = {
  id: 'v4_m1',
  worldId: 'volcano',
  meta: { nameKey: 'map.v4_m1.name', descKey: 'map.v4_m1.desc', difficulty: 2 },
  grid: [
    [W, W, W, W, S, W, W, W, W],
    [E, E, E, E, P, E, E, E, E],
    [E, P, P, P, P, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, E, P, P, E, E, E],
    [W, W, W, W, B, W, W, W, W],
  ],
  waypoints: [
    { col: 4, row: 0 },
    { col: 4, row: 1 },
    { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 }, { col: 1, row: 4 },
    { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 },
    { col: 6, row: 5 }, { col: 6, row: 6 },
    { col: 5, row: 6 }, { col: 4, row: 6 }, { col: 3, row: 6 }, { col: 2, row: 6 },
    { col: 2, row: 7 }, { col: 2, row: 8 },
    { col: 3, row: 8 }, { col: 4, row: 8 }, { col: 5, row: 8 },
    { col: 5, row: 9 }, { col: 5, row: 10 },
    { col: 4, row: 10 },
    { col: 4, row: 11 },
  ],
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 4, row: 11 },
  totalWaves: 16,
  waveOverrides: null,
  theme: THEME_VOLCANO,
};

// ── 맵 2: 화산재 길 (계단+벽) ────────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const V4_M2 = {
  id: 'v4_m2',
  worldId: 'volcano',
  meta: { nameKey: 'map.v4_m2.name', descKey: 'map.v4_m2.desc', difficulty: 2 },
  grid: [
    [W, W, S, W, W, W, W, W, W],
    [E, E, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, W, W, P, P, P, P, P, E],
    [E, W, W, P, E, E, E, E, E],
    [E, W, W, P, E, E, E, E, E],
    [E, W, W, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [W, W, W, W, W, W, W, B, W],
  ],
  waypoints: [
    { col: 2, row: 0 },
    { col: 2, row: 1 }, { col: 3, row: 1 }, { col: 4, row: 1 }, { col: 5, row: 1 }, { col: 6, row: 1 }, { col: 7, row: 1 },
    { col: 7, row: 2 }, { col: 7, row: 3 },
    { col: 7, row: 4 }, { col: 6, row: 4 }, { col: 5, row: 4 }, { col: 4, row: 4 }, { col: 3, row: 4 },
    { col: 3, row: 5 }, { col: 3, row: 6 },
    { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }, { col: 6, row: 7 }, { col: 7, row: 7 },
    { col: 7, row: 8 }, { col: 7, row: 9 }, { col: 7, row: 10 },
    { col: 7, row: 11 },
  ],
  spawnPos: { col: 2, row: 0 },
  basePos: { col: 7, row: 11 },
  totalWaves: 17,
  waveOverrides: null,
  theme: THEME_VOLCANO,
};

// ── 맵 3: 분화구 우회 (중앙 분화구 W블록, 외곽 경로) ────────────

/** @type {import('../maps.js').MapData} */
export const V4_M3 = {
  id: 'v4_m3',
  worldId: 'volcano',
  meta: { nameKey: 'map.v4_m3.name', descKey: 'map.v4_m3.desc', difficulty: 3 },
  grid: [
    [W, W, W, W, W, W, W, S, W],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, W, W, W, E, E, E],
    [E, P, E, W, W, W, E, E, E],
    [E, P, E, W, W, W, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [W, W, W, W, W, W, W, B, W],
  ],
  waypoints: [
    { col: 7, row: 0 },
    { col: 7, row: 1 }, { col: 7, row: 2 },
    { col: 7, row: 3 }, { col: 6, row: 3 }, { col: 5, row: 3 }, { col: 4, row: 3 }, { col: 3, row: 3 }, { col: 2, row: 3 }, { col: 1, row: 3 },
    { col: 1, row: 4 }, { col: 1, row: 5 }, { col: 1, row: 6 }, { col: 1, row: 7 },
    { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }, { col: 6, row: 7 }, { col: 7, row: 7 },
    { col: 7, row: 8 }, { col: 7, row: 9 }, { col: 7, row: 10 },
    { col: 7, row: 11 },
  ],
  spawnPos: { col: 7, row: 0 },
  basePos: { col: 7, row: 11 },
  totalWaves: 18,
  waveOverrides: null,
  theme: THEME_VOLCANO,
};

// ── 맵 4: 마그마 계곡 (지그재그+좌우벽) ─────────────────────────

/** @type {import('../maps.js').MapData} */
export const V4_M4 = {
  id: 'v4_m4',
  worldId: 'volcano',
  meta: { nameKey: 'map.v4_m4.name', descKey: 'map.v4_m4.desc', difficulty: 2 },
  grid: [
    [W, S, W, W, W, W, W, W, W],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [W, E, E, E, E, E, E, P, W],
    [W, P, P, P, P, P, P, P, W],
    [W, P, E, E, E, E, E, E, W],
    [W, P, P, P, P, P, P, P, W],
    [W, E, E, E, E, E, E, P, W],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [W, W, W, W, W, W, W, B, W],
  ],
  waypoints: [
    { col: 1, row: 0 },
    { col: 1, row: 1 },
    { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }, { col: 6, row: 2 }, { col: 7, row: 2 },
    { col: 7, row: 3 }, { col: 7, row: 4 },
    { col: 7, row: 5 }, { col: 6, row: 5 }, { col: 5, row: 5 }, { col: 4, row: 5 }, { col: 3, row: 5 }, { col: 2, row: 5 }, { col: 1, row: 5 },
    { col: 1, row: 6 },
    { col: 1, row: 7 }, { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }, { col: 6, row: 7 }, { col: 7, row: 7 },
    { col: 7, row: 8 }, { col: 7, row: 9 }, { col: 7, row: 10 },
    { col: 7, row: 11 },
  ],
  spawnPos: { col: 1, row: 0 },
  basePos: { col: 7, row: 11 },
  totalWaves: 15,
  waveOverrides: null,
  theme: THEME_VOLCANO,
};

// ── 맵 5: 용암 폭포 (좁은 통로 S자, 좌우벽) ────────────────────

/** @type {import('../maps.js').MapData} */
export const V4_M5 = {
  id: 'v4_m5',
  worldId: 'volcano',
  meta: { nameKey: 'map.v4_m5.name', descKey: 'map.v4_m5.desc', difficulty: 3 },
  grid: [
    [W, W, W, W, S, W, W, W, W],
    [W, E, E, E, P, E, E, E, W],
    [W, E, P, P, P, E, E, E, W],
    [W, E, P, E, E, E, E, E, W],
    [W, E, P, P, P, P, P, E, W],
    [W, E, E, E, E, E, P, E, W],
    [W, E, E, E, E, E, P, E, W],
    [W, E, P, P, P, P, P, E, W],
    [W, E, P, E, E, E, E, E, W],
    [W, E, P, P, P, E, E, E, W],
    [W, E, E, E, P, E, E, E, W],
    [W, W, W, W, B, W, W, W, W],
  ],
  waypoints: [
    { col: 4, row: 0 },
    { col: 4, row: 1 },
    { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 },
    { col: 2, row: 3 },
    { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 },
    { col: 6, row: 5 }, { col: 6, row: 6 },
    { col: 6, row: 7 }, { col: 5, row: 7 }, { col: 4, row: 7 }, { col: 3, row: 7 }, { col: 2, row: 7 },
    { col: 2, row: 8 },
    { col: 2, row: 9 }, { col: 3, row: 9 }, { col: 4, row: 9 },
    { col: 4, row: 10 },
    { col: 4, row: 11 },
  ],
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 4, row: 11 },
  totalWaves: 19,
  waveOverrides: null,
  theme: THEME_VOLCANO,
};

// ── 맵 6: 화산의 심장 (V자+회귀) ────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const V4_M6 = {
  id: 'v4_m6',
  worldId: 'volcano',
  meta: { nameKey: 'map.v4_m6.name', descKey: 'map.v4_m6.desc', difficulty: 3 },
  grid: [
    [W, W, W, W, S, W, W, W, W],
    [E, E, E, E, P, E, E, E, E],
    [E, P, P, P, P, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, P, P, P, E, E, E],
    [E, E, E, P, E, E, E, E, E],
    [E, E, P, P, E, E, E, E, E],
    [E, E, P, E, E, E, E, E, E],
    [W, W, B, W, W, W, W, W, W],
  ],
  waypoints: [
    { col: 4, row: 0 },
    { col: 4, row: 1 },
    { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 },
    { col: 1, row: 4 }, { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 },
    { col: 5, row: 5 }, { col: 5, row: 6 },
    { col: 5, row: 7 }, { col: 4, row: 7 }, { col: 3, row: 7 },
    { col: 3, row: 8 },
    { col: 3, row: 9 }, { col: 2, row: 9 },
    { col: 2, row: 10 },
    { col: 2, row: 11 },
  ],
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 2, row: 11 },
  totalWaves: 20,
  waveOverrides: null,
  theme: THEME_VOLCANO,
};

// ── 모든 화산 맵 레지스트리 등록 ────────────────────────────────

/** @type {import('../maps.js').MapData[]} 화산 월드 전체 맵 목록 */
export const VOLCANO_MAPS = [V4_M1, V4_M2, V4_M3, V4_M4, V4_M5, V4_M6];

// 맵 레지스트리에 일괄 등록
VOLCANO_MAPS.forEach(m => registerMap(m));
