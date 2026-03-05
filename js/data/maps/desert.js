/**
 * @fileoverview 사막(Desert) 월드 맵 데이터.
 * 6개 맵을 정의하며, 난이도가 점진적으로 증가한다.
 * 모든 맵은 9x12 그리드, 가장자리 행에 SPAWN/BASE를 배치한다.
 */

import { THEME_DESERT } from '../worlds.js';
import { registerMap } from '../maps.js';

// 셀 타입 약어 (가독성용)
const E = 0; // CELL_EMPTY (타워 설치 가능)
const P = 1; // CELL_PATH  (적 이동 경로)
const B = 2; // CELL_BASE  (기지)
const S = 3; // CELL_SPAWN (적 출현)
const W = 4; // CELL_WALL  (설치/이동 불가)

// ── 맵 1: 사막 관문 (계단식 하강, 입문용) ──────────────────────

/** @type {import('../maps.js').MapData} */
export const D2_M1 = {
  id: 'd2_m1',
  worldId: 'desert',
  meta: { nameKey: 'map.d2_m1.name', descKey: 'map.d2_m1.desc', difficulty: 2 },
  grid: [
    [S, P, P, P, E, E, E, E, W],
    [E, E, E, P, E, E, E, E, E],
    [E, E, E, P, P, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, E, E, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, P, P, P, P, E],
    [E, E, E, E, P, E, E, E, E],
    [E, E, P, P, P, E, E, E, E],
    [E, E, P, E, E, E, E, E, E],
    [W, W, B, W, W, W, W, W, W],
  ],
  waypoints: [
    { col: 0, row: 0 },
    { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
    { col: 3, row: 1 },
    { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 },
    { col: 5, row: 3 },
    { col: 5, row: 4 }, { col: 6, row: 4 }, { col: 7, row: 4 },
    { col: 7, row: 5 }, { col: 7, row: 6 }, { col: 7, row: 7 },
    { col: 6, row: 7 }, { col: 5, row: 7 }, { col: 4, row: 7 },
    { col: 4, row: 8 },
    { col: 4, row: 9 }, { col: 3, row: 9 }, { col: 2, row: 9 },
    { col: 2, row: 10 },
    { col: 2, row: 11 },
  ],
  spawnPos: { col: 0, row: 0 },
  basePos: { col: 2, row: 11 },
  totalWaves: 13,
  waveOverrides: null,
  theme: THEME_DESERT,
};

// ── 맵 2: 모래 회랑 (넓은 S자) ─────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const D2_M2 = {
  id: 'd2_m2',
  worldId: 'desert',
  meta: { nameKey: 'map.d2_m2.name', descKey: 'map.d2_m2.desc', difficulty: 3 },
  grid: [
    [W, W, W, W, S, W, W, W, W],
    [E, E, E, E, P, E, E, E, E],
    [E, P, P, P, P, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, P, P, P, P, E],
    [E, E, E, E, P, E, E, E, E],
    [E, E, E, E, P, E, E, E, E],
    [W, W, W, W, B, W, W, W, W],
  ],
  waypoints: [
    { col: 4, row: 0 },
    { col: 4, row: 1 },
    { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 }, { col: 1, row: 4 }, { col: 1, row: 5 },
    { col: 2, row: 5 }, { col: 3, row: 5 }, { col: 4, row: 5 }, { col: 5, row: 5 }, { col: 6, row: 5 }, { col: 7, row: 5 },
    { col: 7, row: 6 }, { col: 7, row: 7 }, { col: 7, row: 8 },
    { col: 6, row: 8 }, { col: 5, row: 8 }, { col: 4, row: 8 },
    { col: 4, row: 9 }, { col: 4, row: 10 },
    { col: 4, row: 11 },
  ],
  spawnPos: { col: 4, row: 0 },
  basePos: { col: 4, row: 11 },
  totalWaves: 14,
  waveOverrides: null,
  theme: THEME_DESERT,
};

// ── 맵 3: 사구 길목 (U턴 패턴) ──────────────────────────────────

/** @type {import('../maps.js').MapData} */
export const D2_M3 = {
  id: 'd2_m3',
  worldId: 'desert',
  meta: { nameKey: 'map.d2_m3.name', descKey: 'map.d2_m3.desc', difficulty: 3 },
  grid: [
    [W, W, S, W, W, W, W, W, W],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, E, E, E, E, P, E, E],
    [E, E, P, P, P, P, P, E, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, E, E, E, E, E, E],
    [W, W, B, W, W, W, W, W, W],
  ],
  waypoints: [
    { col: 2, row: 0 },
    { col: 2, row: 1 },
    { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }, { col: 6, row: 2 },
    { col: 6, row: 3 }, { col: 6, row: 4 }, { col: 6, row: 5 }, { col: 6, row: 6 }, { col: 6, row: 7 },
    { col: 5, row: 7 }, { col: 4, row: 7 }, { col: 3, row: 7 }, { col: 2, row: 7 },
    { col: 2, row: 8 }, { col: 2, row: 9 }, { col: 2, row: 10 },
    { col: 2, row: 11 },
  ],
  spawnPos: { col: 2, row: 0 },
  basePos: { col: 2, row: 11 },
  totalWaves: 15,
  waveOverrides: null,
  theme: THEME_DESERT,
};

// ── 맵 4: 오아시스 루트 (이중 S자) ──────────────────────────────

/** @type {import('../maps.js').MapData} */
export const D2_M4 = {
  id: 'd2_m4',
  worldId: 'desert',
  meta: { nameKey: 'map.d2_m4.name', descKey: 'map.d2_m4.desc', difficulty: 1 },
  grid: [
    [W, W, W, W, W, W, W, S, W],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [W, B, W, W, W, W, W, W, W],
  ],
  waypoints: [
    { col: 7, row: 0 },
    { col: 7, row: 1 },
    { col: 7, row: 2 }, { col: 6, row: 2 }, { col: 5, row: 2 }, { col: 4, row: 2 }, { col: 3, row: 2 }, { col: 2, row: 2 }, { col: 1, row: 2 },
    { col: 1, row: 3 },
    { col: 1, row: 4 }, { col: 2, row: 4 }, { col: 3, row: 4 }, { col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 }, { col: 7, row: 4 },
    { col: 7, row: 5 }, { col: 7, row: 6 },
    { col: 7, row: 7 }, { col: 6, row: 7 }, { col: 5, row: 7 }, { col: 4, row: 7 }, { col: 3, row: 7 }, { col: 2, row: 7 }, { col: 1, row: 7 },
    { col: 1, row: 8 }, { col: 1, row: 9 }, { col: 1, row: 10 },
    { col: 1, row: 11 },
  ],
  spawnPos: { col: 7, row: 0 },
  basePos: { col: 1, row: 11 },
  totalWaves: 11,
  waveOverrides: null,
  theme: THEME_DESERT,
};

// ── 맵 5: 모래폭풍 횡단 (Z자 3단) ──────────────────────────────

/** @type {import('../maps.js').MapData} */
export const D2_M5 = {
  id: 'd2_m5',
  worldId: 'desert',
  meta: { nameKey: 'map.d2_m5.name', descKey: 'map.d2_m5.desc', difficulty: 1 },
  grid: [
    [S, W, W, W, W, W, W, W, W],
    [P, E, E, E, E, E, E, E, E],
    [P, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, P, P, P, P, P, P, P, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, E, E, E, E, E, P, E],
    [W, W, W, W, W, W, W, B, W],
  ],
  waypoints: [
    { col: 0, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }, { col: 6, row: 2 }, { col: 7, row: 2 },
    { col: 7, row: 3 }, { col: 7, row: 4 },
    { col: 7, row: 5 }, { col: 6, row: 5 }, { col: 5, row: 5 }, { col: 4, row: 5 }, { col: 3, row: 5 }, { col: 2, row: 5 }, { col: 1, row: 5 },
    { col: 1, row: 6 }, { col: 1, row: 7 },
    { col: 1, row: 8 }, { col: 2, row: 8 }, { col: 3, row: 8 }, { col: 4, row: 8 }, { col: 5, row: 8 }, { col: 6, row: 8 }, { col: 7, row: 8 },
    { col: 7, row: 9 }, { col: 7, row: 10 },
    { col: 7, row: 11 },
  ],
  spawnPos: { col: 0, row: 0 },
  basePos: { col: 7, row: 11 },
  totalWaves: 10,
  waveOverrides: null,
  theme: THEME_DESERT,
};

// ── 맵 6: 사막의 심장 (수렴 경로, 꺾임 7회+) ──────────────────

/** @type {import('../maps.js').MapData} */
export const D2_M6 = {
  id: 'd2_m6',
  worldId: 'desert',
  meta: { nameKey: 'map.d2_m6.name', descKey: 'map.d2_m6.desc', difficulty: 2 },
  grid: [
    [W, S, W, W, W, W, W, W, W],
    [E, P, E, E, E, E, E, E, E],
    [E, P, P, P, P, P, P, P, E],
    [E, E, E, E, E, E, E, P, E],
    [E, E, P, P, P, P, P, P, E],
    [E, E, P, E, E, E, E, E, E],
    [E, E, P, P, P, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, E, E, P, E, E, E],
    [E, E, E, P, P, P, E, E, E],
    [E, E, E, P, E, E, E, E, E],
    [W, W, W, B, W, W, W, W, W],
  ],
  waypoints: [
    { col: 1, row: 0 },
    { col: 1, row: 1 },
    { col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }, { col: 5, row: 2 }, { col: 6, row: 2 }, { col: 7, row: 2 },
    { col: 7, row: 3 },
    { col: 7, row: 4 }, { col: 6, row: 4 }, { col: 5, row: 4 }, { col: 4, row: 4 }, { col: 3, row: 4 }, { col: 2, row: 4 },
    { col: 2, row: 5 },
    { col: 2, row: 6 }, { col: 3, row: 6 }, { col: 4, row: 6 }, { col: 5, row: 6 },
    { col: 5, row: 7 }, { col: 5, row: 8 },
    { col: 5, row: 9 }, { col: 4, row: 9 }, { col: 3, row: 9 },
    { col: 3, row: 10 },
    { col: 3, row: 11 },
  ],
  spawnPos: { col: 1, row: 0 },
  basePos: { col: 3, row: 11 },
  totalWaves: 12,
  waveOverrides: null,
  theme: THEME_DESERT,
};

// ── 모든 사막 맵 레지스트리 등록 ────────────────────────────────

/** @type {import('../maps.js').MapData[]} 사막 월드 전체 맵 목록 */
export const DESERT_MAPS = [D2_M1, D2_M2, D2_M3, D2_M4, D2_M5, D2_M6];

// 맵 레지스트리에 일괄 등록
DESERT_MAPS.forEach(m => registerMap(m));
