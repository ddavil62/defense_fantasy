/**
 * @fileoverview 숲(Forest) 월드 맵 데이터.
 * 6개 맵을 정의하며, 난이도가 점진적으로 증가한다.
 * 모든 맵은 9×12 그리드, 가장자리 행에 SPAWN/BASE를 배치한다.
 */

import { THEME_FOREST } from '../worlds.js';
import { registerMap } from '../maps.js';

// 셀 타입 약어 (가독성용)
const E = 0; // CELL_EMPTY (타워 설치 가능)
const P = 1; // CELL_PATH  (적 이동 경로)
const B = 2; // CELL_BASE  (기지)
const S = 3; // CELL_SPAWN (적 출현)
const W = 4; // CELL_WALL  (설치/이동 불가)

// ── 맵 1: 숲 입구 (직선+1턴, 입문용) ──────────────────────────

/** @type {import('../maps.js').MapData} */
export const F1_M1 = {
  id: 'f1_m1',
  worldId: 'forest',
  meta: { nameKey: 'map.f1_m1.name', descKey: 'map.f1_m1.desc', difficulty: 3 },
  grid: [
    [W, W, W, W, S, W, W, W, W],
    [E, E, E, E, P, E, E, E, E],
    [E, E, E, E, P, E, E, E, E],
    [E, E, E, E, P, E, E, E, E],
    [E, E, E, E, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, P, P, P, P, E],
    [E, E, E, E, P, E, E, E, E],
    [E, E, E, E, P, E, E, E, E],
    [W, W, W, W, B, W, W, W, W],
  ],
  waypoints: [
    { col: 4, row: 0 },
    { col: 4, row: 1 }, { col: 4, row: 2 }, { col: 4, row: 3 }, { col: 4, row: 4 },
    { col: 5, row: 4 }, { col: 6, row: 4 }, { col: 7, row: 4 },
    { col: 7, row: 5 }, { col: 7, row: 6 }, { col: 7, row: 7 }, { col: 7, row: 8 },
    { col: 6, row: 8 }, { col: 5, row: 8 }, { col: 4, row: 8 },
    { col: 4, row: 9 }, { col: 4, row: 10 },
    { col: 4, row: 11 },
  ],
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 4, row: 11 },
  totalWaves: 12,
  waveOverrides: null,
  theme: THEME_FOREST,
};

// ── 맵 2: 숲 오솔길 (S자 2턴) ─────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const F1_M2 = {
  id: 'f1_m2',
  worldId: 'forest',
  meta: { nameKey: 'map.f1_m2.name', descKey: 'map.f1_m2.desc', difficulty: 3 },
  grid: [
    [W, W, S, W, W, W, W, W, W],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [W, W, W, W, W, W, B, W, W],
  ],
  waypoints: [
    { col: 2, row: 0 },
    { col: 2, row: 1 },
    { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }, { col: 6, row: 2 },
    { col: 6, row: 3 }, { col: 6, row: 4 }, { col: 6, row: 5 },
    { col: 5, row: 5 }, { col: 4, row: 5 }, { col: 3, row: 5 }, { col: 2, row: 5 },
    { col: 2, row: 6 }, { col: 2, row: 7 }, { col: 2, row: 8 },
    { col: 3, row: 8 }, { col: 4, row: 8 }, { col: 5, row: 8 }, { col: 6, row: 8 },
    { col: 6, row: 9 }, { col: 6, row: 10 },
    { col: 6, row: 11 },
  ],
  spawnPos: { col: 2, row: 0 },
  basePos: { col: 6, row: 11 },
  totalWaves: 11,
  waveOverrides: null,
  theme: THEME_FOREST,
};

// ── 맵 3: 나무꾼의 길 (Z자 3턴) ───────────────────────────────

/** @type {import('../maps.js').MapData} */
export const F1_M3 = {
  id: 'f1_m3',
  worldId: 'forest',
  meta: { nameKey: 'map.f1_m3.name', descKey: 'map.f1_m3.desc', difficulty: 1 },
  grid: [
    [W, W, W, W, W, W, W, S, W],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [W, B, W, W, W, W, W, W, W],
  ],
  waypoints: [
    { col: 7, row: 0 },
    { col: 7, row: 1 }, { col: 7, row: 2 },
    { col: 6, row: 2 }, { col: 5, row: 2 }, { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 }, { col: 1, row: 4 }, { col: 1, row: 5 },
    { col: 2, row: 5 }, { col: 3, row: 5 }, { col: 4, row: 5 }, { col: 5, row: 5 }, { col: 6, row: 5 }, { col: 7, row: 5 },
    { col: 7, row: 6 }, { col: 7, row: 7 }, { col: 7, row: 8 },
    { col: 6, row: 8 }, { col: 5, row: 8 }, { col: 4, row: 8 }, { col: 3, row: 8 }, { col: 2, row: 8 }, { col: 1, row: 8 },
    { col: 1, row: 9 }, { col: 1, row: 10 },
    { col: 1, row: 11 },
  ],
  spawnPos: { col: 7, row: 0 },
  basePos: { col: 1, row: 11 },
  totalWaves: 9,
  waveOverrides: null,
  theme: THEME_FOREST,
};

// ── 맵 4: 깊은 숲 (다중 굴절) ─────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const F1_M4 = {
  id: 'f1_m4',
  worldId: 'forest',
  meta: { nameKey: 'map.f1_m4.name', descKey: 'map.f1_m4.desc', difficulty: 2 },
  grid: [
    [W, W, W, W, S, W, W, W, W],
    [E, E, E, E, P, E, E, E, E],
    [E, P, P, P, P, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, E, E, E, E],
    [E, E, E, E, P, E, E, E, E],
    [W, W, W, W, B, W, W, W, W],
  ],
  waypoints: [
    { col: 4, row: 0 },
    { col: 4, row: 1 },
    { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 }, { col: 1, row: 4 },
    { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 },
    { col: 6, row: 5 }, { col: 6, row: 6 }, { col: 6, row: 7 },
    { col: 5, row: 7 }, { col: 4, row: 7 }, { col: 3, row: 7 }, { col: 2, row: 7 },
    { col: 2, row: 8 }, { col: 2, row: 9 },
    { col: 3, row: 9 }, { col: 4, row: 9 },
    { col: 4, row: 10 },
    { col: 4, row: 11 },
  ],
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 4, row: 11 },
  totalWaves: 10,
  waveOverrides: null,
  theme: THEME_FOREST,
};

// ── 맵 5: 고대 수림 (4턴 대형 S자) ───────────────────────────

/** @type {import('../maps.js').MapData} */
export const F1_M5 = {
  id: 'f1_m5',
  worldId: 'forest',
  meta: { nameKey: 'map.f1_m5.name', descKey: 'map.f1_m5.desc', difficulty: 1 },
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
    { col: 1, row: 1 }, { col: 1, row: 2 },
    { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }, { col: 6, row: 2 }, { col: 7, row: 2 },
    { col: 7, row: 3 }, { col: 7, row: 4 },
    { col: 6, row: 4 }, { col: 5, row: 4 }, { col: 4, row: 4 }, { col: 3, row: 4 }, { col: 2, row: 4 }, { col: 1, row: 4 },
    { col: 1, row: 5 }, { col: 1, row: 6 },
    { col: 2, row: 6 }, { col: 3, row: 6 }, { col: 4, row: 6 }, { col: 5, row: 6 }, { col: 6, row: 6 }, { col: 7, row: 6 },
    { col: 7, row: 7 }, { col: 7, row: 8 },
    { col: 6, row: 8 }, { col: 5, row: 8 }, { col: 4, row: 8 }, { col: 3, row: 8 }, { col: 2, row: 8 }, { col: 1, row: 8 },
    { col: 1, row: 9 }, { col: 1, row: 10 },
    { col: 1, row: 11 },
  ],
  spawnPos: { col: 1, row: 0 },
  basePos: { col: 1, row: 11 },
  totalWaves: 8,
  waveOverrides: null,
  theme: THEME_FOREST,
};

// ── 맵 6: 숲의 심장 (보스맵, S자+분기) ────────────────────────

/** @type {import('../maps.js').MapData} */
export const F1_M6 = {
  id: 'f1_m6',
  worldId: 'forest',
  meta: { nameKey: 'map.f1_m6.name', descKey: 'map.f1_m6.desc', difficulty: 2 },
  grid: [
    [W, W, W, W, S, W, W, W, W],
    [E, E, P, P, P, E, E, E, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, P, P, P, E, E],
    [E, E, E, E, P, E, E, E, E],
    [W, W, W, W, B, W, W, W, W],
  ],
  waypoints: [
    { col: 4, row: 0 },
    { col: 4, row: 1 }, { col: 3, row: 1 }, { col: 2, row: 1 },
    { col: 2, row: 2 }, { col: 2, row: 3 },
    { col: 3, row: 3 }, { col: 4, row: 3 }, { col: 5, row: 3 }, { col: 6, row: 3 },
    { col: 6, row: 4 }, { col: 6, row: 5 },
    { col: 5, row: 5 }, { col: 4, row: 5 }, { col: 3, row: 5 }, { col: 2, row: 5 },
    { col: 2, row: 6 }, { col: 2, row: 7 },
    { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }, { col: 6, row: 7 },
    { col: 6, row: 8 }, { col: 6, row: 9 },
    { col: 5, row: 9 }, { col: 4, row: 9 },
    { col: 4, row: 10 },
    { col: 4, row: 11 },
  ],
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 4, row: 11 },
  totalWaves: 10,
  waveOverrides: null,
  theme: THEME_FOREST,
};

// ── 모든 숲 맵 레지스트리 등록 ──────────────────────────────────

/** @type {import('../maps.js').MapData[]} 숲 월드 전체 맵 목록 */
export const FOREST_MAPS = [F1_M1, F1_M2, F1_M3, F1_M4, F1_M5, F1_M6];

// 맵 레지스트리에 일괄 등록
FOREST_MAPS.forEach(m => registerMap(m));
