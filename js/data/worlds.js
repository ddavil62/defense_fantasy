/**
 * @fileoverview 월드 데이터 정의.
 * 5개 월드의 테마, 소속 맵, 해금 조건을 관리한다.
 */

// ── 월드 테마 색상 ──────────────────────────────────────────────

/** @typedef {import('./maps.js').MapTheme} MapTheme */

/**
 * @typedef {object} WorldData
 * @property {string} id - 월드 고유 식별자
 * @property {string} nameKey - i18n 이름 키
 * @property {string} descKey - i18n 설명 키
 * @property {MapTheme} theme - 월드 테마 색상
 * @property {string[]} mapIds - 소속 맵 ID 목록 (순서대로)
 * @property {number} requiredStars - 해금에 필요한 누적 별 수
 * @property {number} order - 월드 표시 순서
 */

// ── 월드 테마 정의 ──────────────────────────────────────────────

/** @type {MapTheme} 숲 테마 */
export const THEME_FOREST = {
  emptyTile: 0x1a2e1a,
  path: 0x2e3e1e,
  bg: 0x0d1a0d,
};

/** @type {MapTheme} 사막 테마 */
export const THEME_DESERT = {
  emptyTile: 0x2e2a1a,
  path: 0x3e351e,
  bg: 0x1a150d,
};

/** @type {MapTheme} 설원 테마 */
export const THEME_TUNDRA = {
  emptyTile: 0x1a2a2e,
  path: 0x1e3038,
  bg: 0x0d151a,
};

/** @type {MapTheme} 화산 테마 */
export const THEME_VOLCANO = {
  emptyTile: 0x2e1a1a,
  path: 0x381e1e,
  bg: 0x1a0d0d,
};

/** @type {MapTheme} 그림자 테마 */
export const THEME_SHADOW = {
  emptyTile: 0x221a2e,
  path: 0x2a1e38,
  bg: 0x120d1a,
};

// ── 월드 데이터 ─────────────────────────────────────────────────

/** @type {WorldData[]} 모든 월드 (순서대로) */
export const WORLDS = [
  {
    id: 'forest',
    nameKey: 'world.forest.name',
    descKey: 'world.forest.desc',
    theme: THEME_FOREST,
    mapIds: ['f1_m5', 'f1_m3', 'f1_m6', 'f1_m4', 'f1_m2', 'f1_m1'],
    requiredStars: 0,
    order: 1,
  },
  {
    id: 'desert',
    nameKey: 'world.desert.name',
    descKey: 'world.desert.desc',
    theme: THEME_DESERT,
    mapIds: ['d2_m5', 'd2_m4', 'd2_m6', 'd2_m1', 'd2_m2', 'd2_m3'],
    requiredStars: 9,
    order: 2,
  },
  {
    id: 'tundra',
    nameKey: 'world.tundra.name',
    descKey: 'world.tundra.desc',
    theme: THEME_TUNDRA,
    mapIds: ['t3_m1', 't3_m4', 't3_m6', 't3_m3', 't3_m2', 't3_m5'],
    requiredStars: 24,
    order: 3,
  },
  {
    id: 'volcano',
    nameKey: 'world.volcano.name',
    descKey: 'world.volcano.desc',
    theme: THEME_VOLCANO,
    mapIds: ['v4_m4', 'v4_m1', 'v4_m2', 'v4_m3', 'v4_m5', 'v4_m6'],
    requiredStars: 42,
    order: 4,
  },
  {
    id: 'shadow',
    nameKey: 'world.shadow.name',
    descKey: 'world.shadow.desc',
    theme: THEME_SHADOW,
    mapIds: ['s5_m6', 's5_m4', 's5_m1', 's5_m3', 's5_m2', 's5_m5'],
    requiredStars: 60,
    order: 5,
  },
];

/**
 * 월드 ID로 WorldData를 조회한다.
 * @param {string} id - 월드 ID
 * @returns {WorldData|null} 월드 데이터, 없으면 null
 */
export function getWorldById(id) {
  return WORLDS.find(w => w.id === id) || null;
}

/**
 * 맵 ID로 해당 맵이 속한 WorldData를 조회한다.
 * @param {string} mapId - 맵 ID
 * @returns {WorldData|null} 소속 월드, 없으면 null
 */
export function getWorldByMapId(mapId) {
  return WORLDS.find(w => w.mapIds.includes(mapId)) || null;
}

/**
 * 주어진 맵 ID의 같은 월드 내 다음 맵 ID를 반환한다.
 * 마지막 맵이거나 월드를 찾지 못하면 null을 반환한다.
 * @param {string} mapId - 현재 맵 ID
 * @returns {string|null} 다음 맵 ID 또는 null
 */
export function getNextMapId(mapId) {
  const world = getWorldByMapId(mapId);
  if (!world) return null;
  const idx = world.mapIds.indexOf(mapId);
  if (idx < 0 || idx >= world.mapIds.length - 1) return null;
  return world.mapIds[idx + 1];
}
