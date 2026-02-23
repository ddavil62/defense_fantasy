/**
 * @fileoverview Game configuration constants for Fantasy Tower Defense.
 * All balance values, layout dimensions, map data, tower/enemy stats are centralized here.
 * No magic numbers should exist outside this file.
 */

// ── Layout ──────────────────────────────────────────────────────
/** @const {number} Game logical width in pixels */
export const GAME_WIDTH = 360;

/** @const {number} Game logical height in pixels */
export const GAME_HEIGHT = 640;

/** @const {number} Grid cell size in pixels */
export const CELL_SIZE = 40;

/** @const {number} Number of grid columns */
export const GRID_COLS = 9;

/** @const {number} Number of grid rows */
export const GRID_ROWS = 12;

/** @const {number} Top HUD height in pixels */
export const HUD_HEIGHT = 40;

/** @const {number} Bottom UI panel height in pixels */
export const PANEL_HEIGHT = 120;

/** @const {number} Map area height in pixels */
export const MAP_HEIGHT = 480;

/** @const {number} Panel Y start position */
export const PANEL_Y = 520;

// ── Long Press ──────────────────────────────────────────────────
/** @const {number} Long press threshold in milliseconds */
export const LONG_PRESS_MS = 400;

// ── Colors ──────────────────────────────────────────────────────
export const COLORS = {
  BACKGROUND: 0x1a1a2e,
  HUD_BG: 0x16213e,
  EMPTY_TILE: 0x2d3436,
  PATH: 0x636e72,
  PATH_BORDER: 0xb2bec3,
  BASE: 0xe17055,
  SPAWN: 0x00b894,
  WALL: 0x0d1117,
  ARCHER_TOWER: 0x00b894,
  MAGE_TOWER: 0x6c5ce7,
  ICE_TOWER: 0x74b9ff,
  LIGHTNING_TOWER: 0xfdcb6e,
  FLAME_TOWER: 0xe17055,
  ROCK_TOWER: 0x636e72,
  POISON_TOWER: 0xa8e063,
  WIND_TOWER: 0x81ecec,
  LIGHT_TOWER: 0xffeaa7,
  DRAGON_TOWER: 0xd63031,
  LOCK_ICON: 0x636e72,
  BURN_TINT: 0xff6348,
  POISON_TINT: 0x55efc4,
  CHAIN_COLOR: 0xfdcb6e,
  BEAM_COLOR: 0xffeaa7,
  PUSHBACK_COLOR: 0x81ecec,
  ENEMY_NORMAL: 0xd63031,
  ENEMY_FAST: 0xfdcb6e,
  ENEMY_TANK: 0xe17055,
  ENEMY_BOSS: 0xa29bfe,
  ENEMY_SWARM: 0x55efc4,
  ENEMY_SPLITTER: 0xfd79a8,
  ENEMY_ARMORED: 0x2d3436,
  BOSS_BORDER: 0xffd700,
  GOLD_TEXT: 0xffd700,
  HP_DANGER: 0xff4757,
  UI_PANEL: 0x0f3460,
  BUTTON_ACTIVE: 0xe94560,
  HP_BAR_GREEN: 0x00b894,
  HP_BAR_YELLOW: 0xfdcb6e,
  HP_BAR_RED: 0xd63031,
  PROJECTILE_ARCHER: 0xffffff,
  PROJECTILE_MAGE: 0x6c5ce7,
  PROJECTILE_ICE: 0x74b9ff,
  PROJECTILE_FLAME: 0xe17055,
  PROJECTILE_ROCK: 0x636e72,
  PROJECTILE_WIND: 0x81ecec,
  RANGE_FILL: 0xffffff,
  BUILDABLE_HIGHLIGHT: 0x00ff00,
  INVALID_PLACEMENT: 0xff0000,
  EXPLOSION: 0xff6348,
  DIAMOND: 0x00b8d4,
  DIAMOND_CSS: '#00b8d4',
};

/** @const {string} Gold text color as CSS hex */
export const GOLD_TEXT_CSS = '#ffd700';

/** @const {string} HP danger text color as CSS hex */
export const HP_DANGER_CSS = '#ff4757';

// ── Cell Types ──────────────────────────────────────────────────
export const CELL_EMPTY = 0;
export const CELL_PATH = 1;
export const CELL_BASE = 2;
export const CELL_SPAWN = 3;
export const CELL_WALL = 4;

// ── Map Grid (9 cols x 12 rows) ─────────────────────────────────
/**
 * 2D array representing the tile map.
 * 0=empty, 1=path, 2=base, 3=spawn, 4=wall
 */
export const MAP_GRID = [
  [4, 4, 4, 4, 3, 4, 4, 4, 4],  // row 0: spawn (col 4)
  [0, 0, 0, 0, 1, 0, 0, 0, 0],  // row 1
  [0, 1, 1, 1, 1, 0, 0, 0, 0],  // row 2: left turn
  [0, 1, 0, 0, 0, 0, 0, 0, 0],  // row 3
  [0, 1, 1, 1, 1, 1, 1, 1, 0],  // row 4: right turn (long horizontal)
  [0, 0, 0, 0, 0, 0, 0, 1, 0],  // row 5
  [0, 0, 0, 0, 0, 0, 0, 1, 0],  // row 6
  [0, 1, 1, 1, 1, 1, 1, 1, 0],  // row 7: left turn (long horizontal)
  [0, 1, 0, 0, 0, 0, 0, 0, 0],  // row 8
  [0, 1, 1, 1, 1, 1, 0, 0, 0],  // row 9: right turn
  [0, 0, 0, 0, 0, 1, 0, 0, 0],  // row 10
  [4, 4, 4, 4, 4, 2, 4, 4, 4],  // row 11: base (col 5)
];

// ── Path Waypoints (grid coordinates) ───────────────────────────
/**
 * Ordered waypoints for enemy path from spawn to base.
 * Each entry is { col, row } in grid coordinates.
 */
export const PATH_WAYPOINTS = [
  { col: 4, row: 0 },   // spawn
  { col: 4, row: 1 },
  { col: 4, row: 2 },
  { col: 3, row: 2 },
  { col: 2, row: 2 },
  { col: 1, row: 2 },
  { col: 1, row: 3 },
  { col: 1, row: 4 },
  { col: 2, row: 4 },
  { col: 3, row: 4 },
  { col: 4, row: 4 },
  { col: 5, row: 4 },
  { col: 6, row: 4 },
  { col: 7, row: 4 },
  { col: 7, row: 5 },
  { col: 7, row: 6 },
  { col: 7, row: 7 },
  { col: 6, row: 7 },
  { col: 5, row: 7 },
  { col: 4, row: 7 },
  { col: 3, row: 7 },
  { col: 2, row: 7 },
  { col: 1, row: 7 },
  { col: 1, row: 8 },
  { col: 1, row: 9 },
  { col: 2, row: 9 },
  { col: 3, row: 9 },
  { col: 4, row: 9 },
  { col: 5, row: 9 },
  { col: 5, row: 10 },
  { col: 5, row: 11 },  // base reached
];

// ── Economy ─────────────────────────────────────────────────────
/** @const {number} Starting gold amount */
export const INITIAL_GOLD = 250;

/** @const {number} Starting base hit points */
export const BASE_HP = 20;

/** @const {number} Maximum base hit points */
export const MAX_BASE_HP = 20;

/** @const {number} Sell refund ratio (60%) */
export const SELL_RATIO = 0.6;

/** @const {number} HP threshold for danger warning */
export const HP_DANGER_THRESHOLD = 5;

/** @const {number} HP blink interval in ms */
export const HP_BLINK_INTERVAL = 500;

// ── Dragon Tower Lock ───────────────────────────────────────────
/** @const {boolean} Whether dragon tower is locked (Phase 3 unlock) */
export const DRAGON_TOWER_LOCKED = true;

// ── Tower Stats ─────────────────────────────────────────────────
/**
 * Tower statistics indexed by type.
 * levels: {
 *   1: Lv.1 stats,
 *   '2a': Lv.2 branch A stats,
 *   '2b': Lv.2 branch B stats,
 *   '3aa': Lv.3 from 2A → A stats,   (Phase 4)
 *   '3ab': Lv.3 from 2A → B stats,   (Phase 4)
 *   '3ba': Lv.3 from 2B → A stats,   (Phase 4)
 *   '3bb': Lv.3 from 2B → B stats,   (Phase 4)
 * }
 * cost = installation cost (Lv.1) or upgrade cost (Lv.2/Lv.3).
 * sellPrice = floor(totalInvested * 0.6)
 *   where totalInvested = lv1.cost + lv2.cost + lv3.cost
 */
export const TOWER_STATS = {
  archer: {
    name: 'Archer',
    displayName: 'Archer',
    color: 0x00b894,
    levels: {
      1: {
        cost: 50,
        damage: 10,
        fireRate: 0.8,
        range: 120,
        projectileSpeed: 300,
        attackType: 'single',
        sellPrice: 30,
      },
      '2a': {
        cost: 60,
        damage: 16,
        fireRate: 0.7,
        range: 120,
        projectileSpeed: 280,
        attackType: 'splash',
        splashRadius: 30,
        branchName: '폭발 화살',
        branchDesc: '소형 범위 피해 추가',
        sellPrice: 66,
      },
      '2b': {
        cost: 70,
        damage: 25,
        fireRate: 1.4,
        range: 168,
        projectileSpeed: 400,
        attackType: 'single',
        branchName: '저격',
        branchDesc: '사거리+40%, 고대미지 단일',
        sellPrice: 72,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 200,
        damage: 24,
        fireRate: 0.5,
        range: 120,
        projectileSpeed: 280,
        attackType: 'splash',
        splashRadius: 55,
        branchName: '폭풍 화살우',
        branchDesc: '폭발 반경 1.83배 + 연사속도 30% 향상',
        sellPrice: 186,
      },
      '3ab': {
        cost: 180,
        damage: 20,
        fireRate: 0.7,
        range: 130,
        projectileSpeed: 280,
        attackType: 'splash',
        splashRadius: 45,
        slowAmount: 0.25,
        slowDuration: 1.5,
        branchName: '광역 저지',
        branchDesc: '폭발 시 주변 적 25% 슬로우 1.5초',
        sellPrice: 174,
      },
      '3ba': {
        cost: 220,
        damage: 38,
        fireRate: 1.0,
        range: 200,
        projectileSpeed: 500,
        attackType: 'single',
        branchName: '초고속 저격',
        branchDesc: '사거리+19%, 공격력+52%, 연사속도 향상',
        sellPrice: 204,
      },
      '3bb': {
        cost: 200,
        damage: 30,
        fireRate: 1.4,
        range: 190,
        projectileSpeed: 450,
        attackType: 'single',
        armorReduction: 0.25,
        armorReductionDuration: 4.0,
        branchName: '마킹 저격',
        branchDesc: '명중 적 방어력 25% 감소 4초 (아군 시너지)',
        sellPrice: 192,
      },
    },
  },
  mage: {
    name: 'Mage',
    displayName: 'Mage',
    color: 0x6c5ce7,
    levels: {
      1: {
        cost: 100,
        damage: 25,
        fireRate: 2.0,
        range: 100,
        projectileSpeed: 200,
        attackType: 'splash',
        splashRadius: 40,
        sellPrice: 60,
      },
      '2a': {
        cost: 110,
        damage: 45,
        fireRate: 2.0,
        range: 100,
        projectileSpeed: 200,
        attackType: 'splash',
        splashRadius: 60,
        branchName: '강화 폭발',
        branchDesc: '폭발 반경 1.5배 + 공격력 80% 증가',
        sellPrice: 126,
      },
      '2b': {
        cost: 90,
        damage: 28,
        fireRate: 1.2,
        range: 120,
        projectileSpeed: 240,
        attackType: 'splash',
        splashRadius: 40,
        slowAmount: 0.2,
        slowDuration: 1.0,
        branchName: '마나 폭풍',
        branchDesc: '공속 1.67배 + 약한 슬로우',
        sellPrice: 114,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 250,
        damage: 72,
        fireRate: 2.0,
        range: 110,
        projectileSpeed: 200,
        attackType: 'splash',
        splashRadius: 90,
        branchName: '대폭발',
        branchDesc: '폭발 반경 1.5배, 공격력+60%',
        sellPrice: 276,
      },
      '3ab': {
        cost: 220,
        damage: 55,
        fireRate: 2.0,
        range: 110,
        projectileSpeed: 200,
        attackType: 'splash',
        splashRadius: 70,
        slowAmount: 0.35,
        slowDuration: 2.0,
        branchName: '중력 붕괴',
        branchDesc: '폭발 시 35% 슬로우 2초 추가',
        sellPrice: 258,
      },
      '3ba': {
        cost: 240,
        damage: 45,
        fireRate: 0.8,
        range: 130,
        projectileSpeed: 280,
        attackType: 'splash',
        splashRadius: 50,
        slowAmount: 0.2,
        slowDuration: 1.0,
        branchName: '마나 격류',
        branchDesc: '공속 극한화(0.8s), 공격력+61%',
        sellPrice: 258,
      },
      '3bb': {
        cost: 200,
        damage: 35,
        fireRate: 1.2,
        range: 140,
        projectileSpeed: 260,
        attackType: 'splash',
        splashRadius: 55,
        slowAmount: 0.45,
        slowDuration: 2.5,
        branchName: '마법 폭풍',
        branchDesc: '슬로우 45%, 지속 2.5초로 강화된 광역 감속',
        sellPrice: 234,
      },
    },
  },
  ice: {
    name: 'Ice',
    displayName: 'Ice',
    color: 0x74b9ff,
    levels: {
      1: {
        cost: 75,
        damage: 8,
        fireRate: 1.5,
        range: 100,
        projectileSpeed: 250,
        attackType: 'single',
        slowAmount: 0.3,
        slowDuration: 2.0,
        sellPrice: 45,
      },
      '2a': {
        cost: 80,
        damage: 10,
        fireRate: 1.8,
        range: 100,
        projectileSpeed: 260,
        attackType: 'single',
        slowAmount: 1.0,
        slowDuration: 0.5,
        branchName: '빙결',
        branchDesc: '단일 대상 0.5초 완전 정지',
        sellPrice: 93,
      },
      '2b': {
        cost: 75,
        damage: 6,
        fireRate: 2.0,
        range: 120,
        attackType: 'aoe_instant',
        splashRadius: 60,
        slowAmount: 0.4,
        slowDuration: 2.5,
        branchName: '냉기 장판',
        branchDesc: '즉발 광역 슬로우',
        sellPrice: 90,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 200,
        damage: 15,
        fireRate: 1.2,
        range: 110,
        projectileSpeed: 280,
        attackType: 'single',
        slowAmount: 1.0,
        slowDuration: 1.2,
        branchName: '절대 빙결',
        branchDesc: '완전 정지 1.2초, 연사속도 33% 향상',
        sellPrice: 213,
      },
      '3ab': {
        cost: 180,
        damage: 12,
        fireRate: 1.8,
        range: 110,
        projectileSpeed: 270,
        attackType: 'single',
        slowAmount: 1.0,
        slowDuration: 0.8,
        armorReduction: 0.3,
        armorReductionDuration: 3.0,
        branchName: '파쇄 빙격',
        branchDesc: '정지 후 방어력 30% 감소 3초 (취약 부여)',
        sellPrice: 201,
      },
      '3ba': {
        cost: 210,
        damage: 10,
        fireRate: 1.6,
        range: 140,
        attackType: 'aoe_instant',
        splashRadius: 100,
        slowAmount: 0.55,
        slowDuration: 3.0,
        branchName: '냉기 폭풍',
        branchDesc: '범위 1.67배, 슬로우 55% 3초',
        sellPrice: 216,
      },
      '3bb': {
        cost: 190,
        damage: 8,
        fireRate: 1.8,
        range: 130,
        attackType: 'aoe_instant',
        splashRadius: 80,
        slowAmount: 0.45,
        slowDuration: 2.5,
        burnDamage: 3,
        burnDuration: 2,
        branchName: '빙하 영역',
        branchDesc: '광역 슬로우 + 동상 피해 도트 (복합 디버프)',
        sellPrice: 204,
      },
    },
  },
  lightning: {
    name: 'Lightning',
    displayName: 'Lightning',
    color: 0xfdcb6e,
    levels: {
      1: {
        cost: 120,
        damage: 18,
        fireRate: 1.2,
        range: 120,
        attackType: 'chain',
        chainCount: 4,
        chainDecay: 0.7,
        chainRadius: 80,
        sellPrice: 72,
      },
      '2a': {
        cost: 100,
        damage: 24,
        fireRate: 1.2,
        range: 120,
        attackType: 'chain',
        chainCount: 6,
        chainDecay: 0.8,
        chainRadius: 80,
        branchName: '연쇄 강화',
        branchDesc: '최대 6체인, 감쇄율 80%',
        sellPrice: 132,
      },
      '2b': {
        cost: 90,
        damage: 18,
        fireRate: 1.2,
        range: 140,
        attackType: 'chain',
        chainCount: 4,
        chainDecay: 0.7,
        chainRadius: 80,
        slowAmount: 0.5,
        slowDuration: 2.0,
        branchName: '마비',
        branchDesc: '피격 적 2초간 50% 감속',
        sellPrice: 126,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 280,
        damage: 38,
        fireRate: 1.0,
        range: 130,
        attackType: 'chain',
        chainCount: 8,
        chainDecay: 0.85,
        chainRadius: 90,
        branchName: '천둥신의 심판',
        branchDesc: '최대 8체인, 감쇄율 85%, 공격력+58%',
        sellPrice: 300,
      },
      '3ab': {
        cost: 240,
        damage: 28,
        fireRate: 1.2,
        range: 130,
        attackType: 'chain',
        chainCount: 6,
        chainDecay: 0.8,
        chainRadius: 90,
        slowAmount: 0.55,
        slowDuration: 2.5,
        branchName: '초전도 연쇄',
        branchDesc: '6체인 + 피격 적 55% 마비 2.5초',
        sellPrice: 276,
      },
      '3ba': {
        cost: 260,
        damage: 32,
        fireRate: 1.0,
        range: 150,
        attackType: 'chain',
        chainCount: 6,
        chainDecay: 0.75,
        chainRadius: 90,
        slowAmount: 0.5,
        slowDuration: 2.0,
        branchName: '방전 폭풍',
        branchDesc: '6체인, 공격력+78%, 마비 유지',
        sellPrice: 282,
      },
      '3bb': {
        cost: 220,
        damage: 20,
        fireRate: 1.2,
        range: 160,
        attackType: 'chain',
        chainCount: 5,
        chainDecay: 0.7,
        chainRadius: 100,
        slowAmount: 0.75,
        slowDuration: 3.0,
        branchName: '완전 마비',
        branchDesc: '5체인, 마비 75% × 3초 (거의 정지 수준)',
        sellPrice: 258,
      },
    },
  },
  flame: {
    name: 'Flame',
    displayName: 'Flame',
    color: 0xe17055,
    levels: {
      1: {
        cost: 90,
        damage: 5,
        fireRate: 1.5,
        range: 100,
        projectileSpeed: 200,
        attackType: 'dot_single',
        burnDamage: 4,
        burnDuration: 3,
        sellPrice: 54,
      },
      '2a': {
        cost: 85,
        damage: 8,
        fireRate: 1.5,
        range: 100,
        projectileSpeed: 200,
        attackType: 'dot_single',
        burnDamage: 8,
        burnDuration: 3,
        branchName: '맹화',
        branchDesc: '도트 피해 2배',
        sellPrice: 105,
      },
      '2b': {
        cost: 100,
        damage: 4,
        fireRate: 2.0,
        range: 120,
        attackType: 'aoe_instant',
        splashRadius: 50,
        burnDamage: 4,
        burnDuration: 3,
        branchName: '화염 폭풍',
        branchDesc: '범위 화상 도트',
        sellPrice: 114,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 230,
        damage: 14,
        fireRate: 1.3,
        range: 110,
        projectileSpeed: 220,
        attackType: 'dot_single',
        burnDamage: 16,
        burnDuration: 5,
        branchName: '지옥불',
        branchDesc: '화상 도트 2배(16/s), 지속 5초',
        sellPrice: 243,
      },
      '3ab': {
        cost: 200,
        damage: 10,
        fireRate: 1.5,
        range: 110,
        projectileSpeed: 210,
        attackType: 'dot_single',
        burnDamage: 12,
        burnDuration: 4,
        armorReduction: 0.2,
        armorReductionDuration: 4.0,
        branchName: '불사신의 저주',
        branchDesc: '화상 + 방어력 20% 감소 4초 (DoT 시너지)',
        sellPrice: 225,
      },
      '3ba': {
        cost: 250,
        damage: 8,
        fireRate: 1.6,
        range: 140,
        attackType: 'aoe_instant',
        splashRadius: 85,
        burnDamage: 8,
        burnDuration: 4,
        branchName: '대화염 폭풍',
        branchDesc: '범위 1.7배, 화상 2배, 지속 4초',
        sellPrice: 264,
      },
      '3bb': {
        cost: 210,
        damage: 6,
        fireRate: 1.8,
        range: 130,
        attackType: 'aoe_instant',
        splashRadius: 65,
        burnDamage: 6,
        burnDuration: 4,
        poisonDamage: 4,
        poisonDuration: 4,
        branchName: '용암 지대',
        branchDesc: '광역 화상+독 복합 도트 (피해 누적)',
        sellPrice: 240,
      },
    },
  },
  rock: {
    name: 'Rock',
    displayName: 'Rock',
    color: 0x636e72,
    levels: {
      1: {
        cost: 110,
        damage: 45,
        fireRate: 3.0,
        range: 80,
        projectileSpeed: 150,
        attackType: 'single',
        sellPrice: 66,
      },
      '2a': {
        cost: 100,
        damage: 70,
        fireRate: 3.0,
        range: 80,
        projectileSpeed: 150,
        attackType: 'single',
        armorPiercing: true,
        branchName: '분쇄',
        branchDesc: '방어형 저항 무시',
        sellPrice: 126,
      },
      '2b': {
        cost: 110,
        damage: 45,
        fireRate: 3.5,
        range: 100,
        projectileSpeed: 120,
        attackType: 'splash',
        splashRadius: 60,
        slowAmount: 1.0,
        slowDuration: 0.5,
        branchName: '낙석',
        branchDesc: '광역 0.5초 정지',
        sellPrice: 132,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 300,
        damage: 115,
        fireRate: 2.8,
        range: 90,
        projectileSpeed: 160,
        attackType: 'single',
        armorPiercing: true,
        branchName: '산사태',
        branchDesc: '방어 관통 유지, 공격력+64%, 연사 향상',
        sellPrice: 306,
      },
      '3ab': {
        cost: 270,
        damage: 85,
        fireRate: 3.0,
        range: 90,
        projectileSpeed: 150,
        attackType: 'splash',
        splashRadius: 40,
        armorPiercing: true,
        branchName: '분쇄 파편',
        branchDesc: '방어 관통 + 소형 광역(40px), 파편 도달 시',
        sellPrice: 288,
      },
      '3ba': {
        cost: 310,
        damage: 75,
        fireRate: 3.2,
        range: 120,
        projectileSpeed: 130,
        attackType: 'splash',
        splashRadius: 100,
        slowAmount: 1.0,
        slowDuration: 0.8,
        branchName: '거대 낙석',
        branchDesc: '광역 1.67배, 공격력+67%, 정지 0.8초',
        sellPrice: 318,
      },
      '3bb': {
        cost: 260,
        damage: 55,
        fireRate: 3.5,
        range: 110,
        projectileSpeed: 120,
        attackType: 'splash',
        splashRadius: 75,
        slowAmount: 1.0,
        slowDuration: 0.6,
        armorReduction: 0.3,
        armorReductionDuration: 3.0,
        branchName: '지진',
        branchDesc: '광역 정지 + 방어력 30% 감소 (후속 타워 시너지)',
        sellPrice: 288,
      },
    },
  },
  poison: {
    name: 'Poison',
    displayName: 'Poison',
    color: 0xa8e063,
    levels: {
      1: {
        cost: 95,
        damage: 3,
        fireRate: 2.0,
        range: 120,
        attackType: 'aoe_instant',
        splashRadius: 60,
        poisonDamage: 3,
        poisonDuration: 4,
        armorReduction: 0.2,
        armorReductionDuration: 4,
        sellPrice: 57,
      },
      '2a': {
        cost: 90,
        damage: 5,
        fireRate: 2.0,
        range: 120,
        attackType: 'aoe_instant',
        splashRadius: 60,
        poisonDamage: 6,
        poisonDuration: 4,
        armorReduction: 0.35,
        armorReductionDuration: 4,
        branchName: '맹독',
        branchDesc: '방어력 감소 35% + 도트 2배',
        sellPrice: 111,
      },
      '2b': {
        cost: 95,
        damage: 2,
        fireRate: 2.5,
        range: 140,
        attackType: 'aoe_instant',
        splashRadius: 100,
        poisonDamage: 3,
        poisonDuration: 4,
        armorReduction: 0.2,
        armorReductionDuration: 4,
        maxPoisonStacks: 2,
        branchName: '독 확산',
        branchDesc: '범위 2배, 독 2중첩',
        sellPrice: 114,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 230,
        damage: 8,
        fireRate: 1.8,
        range: 130,
        attackType: 'aoe_instant',
        splashRadius: 70,
        poisonDamage: 12,
        poisonDuration: 5,
        armorReduction: 0.5,
        armorReductionDuration: 5,
        branchName: '치명적 맹독',
        branchDesc: '독 도트 2배(12/s), 방어력 50% 감소 5초',
        sellPrice: 249,
      },
      '3ab': {
        cost: 200,
        damage: 6,
        fireRate: 2.0,
        range: 140,
        attackType: 'aoe_instant',
        splashRadius: 90,
        poisonDamage: 8,
        poisonDuration: 6,
        armorReduction: 0.35,
        armorReductionDuration: 4,
        maxPoisonStacks: 3,
        branchName: '역병의 안개',
        branchDesc: '독 3중첩 허용, 범위 확장, 지속 6초',
        sellPrice: 231,
      },
      '3ba': {
        cost: 260,
        damage: 5,
        fireRate: 2.0,
        range: 160,
        attackType: 'aoe_instant',
        splashRadius: 140,
        poisonDamage: 6,
        poisonDuration: 5,
        armorReduction: 0.3,
        armorReductionDuration: 4,
        maxPoisonStacks: 2,
        branchName: '독 폭풍',
        branchDesc: '범위 1.4배(140px), 독 강화, 초광역 오염',
        sellPrice: 270,
      },
      '3bb': {
        cost: 220,
        damage: 3,
        fireRate: 2.2,
        range: 150,
        attackType: 'aoe_instant',
        splashRadius: 110,
        poisonDamage: 5,
        poisonDuration: 5,
        armorReduction: 0.4,
        armorReductionDuration: 5,
        maxPoisonStacks: 2,
        burnDamage: 3,
        burnDuration: 3,
        branchName: '부패 영역',
        branchDesc: '독+화상 복합, 방어력 40% 감소 (복합 약화)',
        sellPrice: 246,
      },
    },
  },
  wind: {
    name: 'Wind',
    displayName: 'Wind',
    color: 0x81ecec,
    levels: {
      1: {
        cost: 80,
        damage: 5,
        fireRate: 2.5,
        range: 120,
        projectileSpeed: 350,
        attackType: 'single',
        pushbackDistance: 80,
        sellPrice: 48,
      },
      '2a': {
        cost: 75,
        damage: 5,
        fireRate: 2.5,
        range: 120,
        projectileSpeed: 350,
        attackType: 'single',
        pushbackDistance: 160,
        branchName: '회오리',
        branchDesc: '4타일 밀치기',
        sellPrice: 93,
      },
      '2b': {
        cost: 80,
        damage: 4,
        fireRate: 2.0,
        range: 120,
        attackType: 'aoe_instant',
        splashRadius: 60,
        pushbackDistance: 40,
        pushbackTargets: 3,
        branchName: '돌풍',
        branchDesc: '3개 동시 밀치기',
        sellPrice: 96,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 180,
        damage: 10,
        fireRate: 2.0,
        range: 130,
        projectileSpeed: 400,
        attackType: 'single',
        pushbackDistance: 280,
        branchName: '대태풍',
        branchDesc: '밀치기 7타일(280px), 공격력 2배',
        sellPrice: 201,
      },
      '3ab': {
        cost: 160,
        damage: 7,
        fireRate: 2.5,
        range: 130,
        projectileSpeed: 380,
        attackType: 'single',
        pushbackDistance: 200,
        slowAmount: 0.3,
        slowDuration: 2.0,
        branchName: '바람 감옥',
        branchDesc: '5타일 밀치기 + 30% 슬로우 2초',
        sellPrice: 189,
      },
      '3ba': {
        cost: 200,
        damage: 8,
        fireRate: 1.6,
        range: 140,
        attackType: 'aoe_instant',
        splashRadius: 80,
        pushbackDistance: 80,
        pushbackTargets: 5,
        branchName: '폭풍의 눈',
        branchDesc: '5개 동시 밀치기, 거리 2배, 공격력 2배',
        sellPrice: 216,
      },
      '3bb': {
        cost: 170,
        damage: 5,
        fireRate: 1.8,
        range: 135,
        attackType: 'aoe_instant',
        splashRadius: 75,
        pushbackDistance: 60,
        pushbackTargets: 4,
        slowAmount: 0.4,
        slowDuration: 2.0,
        branchName: '질풍 제어',
        branchDesc: '4개 밀치기 + 40% 슬로우 2초 (흐름 제어)',
        sellPrice: 198,
      },
    },
  },
  light: {
    name: 'Light',
    displayName: 'Light',
    color: 0xffeaa7,
    levels: {
      1: {
        cost: 130,
        damage: 20,
        fireRate: 1.8,
        range: 600,
        attackType: 'piercing_beam',
        sellPrice: 78,
      },
      '2a': {
        cost: 120,
        damage: 20,
        fireRate: 1.8,
        range: 600,
        attackType: 'piercing_beam',
        burnDamage: 3,
        burnDuration: 2,
        branchName: '레이저',
        branchDesc: '관통 + 도트 추가',
        sellPrice: 150,
      },
      '2b': {
        cost: 110,
        damage: 35,
        fireRate: 2.5,
        range: 100,
        attackType: 'aoe_instant',
        splashRadius: 80,
        branchName: '성광',
        branchDesc: '원형 광역 폭발',
        sellPrice: 144,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 300,
        damage: 35,
        fireRate: 1.4,
        range: 600,
        attackType: 'piercing_beam',
        burnDamage: 8,
        burnDuration: 3,
        branchName: '태양광 레이저',
        branchDesc: '빔 공격력+75%, 화상 도트 2.67배, 연사 향상',
        sellPrice: 330,
      },
      '3ab': {
        cost: 260,
        damage: 25,
        fireRate: 1.8,
        range: 600,
        attackType: 'piercing_beam',
        burnDamage: 5,
        burnDuration: 3,
        armorReduction: 0.25,
        armorReductionDuration: 3.0,
        branchName: '신성 레이저',
        branchDesc: '관통 빔 + 방어력 25% 감소 (라인 전체 약화)',
        sellPrice: 306,
      },
      '3ba': {
        cost: 280,
        damage: 58,
        fireRate: 2.2,
        range: 120,
        attackType: 'aoe_instant',
        splashRadius: 120,
        branchName: '성광 폭발',
        branchDesc: '반경 1.5배(120px), 공격력+66%',
        sellPrice: 312,
      },
      '3bb': {
        cost: 240,
        damage: 45,
        fireRate: 2.5,
        range: 110,
        attackType: 'aoe_instant',
        splashRadius: 95,
        slowAmount: 0.35,
        slowDuration: 2.0,
        burnDamage: 4,
        burnDuration: 2,
        branchName: '정화의 빛',
        branchDesc: '광역 폭발 + 슬로우 35% + 화상 (복합 제어)',
        sellPrice: 288,
      },
    },
  },
  dragon: {
    name: 'Dragon',
    displayName: 'Dragon',
    color: 0xd63031,
    locked: true,
    levels: {
      1: {
        cost: 250,
        damage: 60,
        fireRate: 2.5,
        range: 160,
        attackType: 'splash',
        splashRadius: 80,
        sellPrice: 150,
      },
      '2a': {
        cost: 200,
        damage: 60,
        fireRate: 2.5,
        range: 160,
        attackType: 'splash',
        splashRadius: 80,
        burnDamage: 8,
        burnDuration: 3,
        branchName: '화염 브레스',
        branchDesc: '범위 화상 도트',
        sellPrice: 270,
      },
      '2b': {
        cost: 180,
        damage: 40,
        fireRate: 3.0,
        range: 160,
        attackType: 'aoe_instant',
        splashRadius: 80,
        poisonDamage: 10,
        poisonDuration: 5,
        branchName: '독 브레스',
        branchDesc: '원형 광역 독 도트',
        sellPrice: 258,
      },
      // ─── Phase 4: Lv.3 ───
      '3aa': {
        cost: 350,
        damage: 100,
        fireRate: 2.2,
        range: 180,
        projectileSpeed: 220,
        attackType: 'splash',
        splashRadius: 120,
        burnDamage: 16,
        burnDuration: 4,
        branchName: '용왕 화염',
        branchDesc: '광역+50%(120px), 공격력+67%, 화상 2배',
        sellPrice: 480,
      },
      '3ab': {
        cost: 300,
        damage: 75,
        fireRate: 2.5,
        range: 170,
        projectileSpeed: 210,
        attackType: 'splash',
        splashRadius: 90,
        burnDamage: 10,
        burnDuration: 4,
        poisonDamage: 8,
        poisonDuration: 4,
        armorReduction: 0.3,
        armorReductionDuration: 4,
        branchName: '지옥 브레스',
        branchDesc: '화상+독+방어력 감소 3종 복합 디버프',
        sellPrice: 450,
      },
      '3ba': {
        cost: 330,
        damage: 65,
        fireRate: 2.5,
        range: 180,
        attackType: 'aoe_instant',
        splashRadius: 110,
        poisonDamage: 18,
        poisonDuration: 6,
        maxPoisonStacks: 3,
        branchName: '독용의 역병',
        branchDesc: '독 3중첩, 도트+80%, 지속 6초',
        sellPrice: 456,
      },
      '3bb': {
        cost: 280,
        damage: 50,
        fireRate: 2.8,
        range: 170,
        attackType: 'aoe_instant',
        splashRadius: 95,
        poisonDamage: 12,
        poisonDuration: 5,
        burnDamage: 6,
        burnDuration: 3,
        slowAmount: 0.35,
        slowDuration: 2.0,
        armorReduction: 0.25,
        armorReductionDuration: 3,
        branchName: '혼돈의 용',
        branchDesc: '독+화상+슬로우+방어감소 4종 복합 오염',
        sellPrice: 426,
      },
    },
  },
};

/** @const {number} Maximum tower level */
export const MAX_TOWER_LEVEL = 3;

/** @const {number} Lv.3 tower shape scale multiplier */
export const LV3_SHAPE_SCALE = 1.35;

// ── Enemy Base Stats ────────────────────────────────────────────
/**
 * Base enemy statistics by type.
 */
export const ENEMY_STATS = {
  normal: {
    hp: 30,
    speed: 60,
    gold: 5,
    damage: 1,
    color: 0xd63031,
    radius: 10,
    shape: 'circle',
  },
  fast: {
    hp: 20,
    speed: 120,
    gold: 3,
    damage: 1,
    color: 0xfdcb6e,
    radius: 8,
    size: 16,
    shape: 'triangle',
  },
  tank: {
    hp: 120,
    speed: 35,
    gold: 15,
    damage: 3,
    color: 0xe17055,
    size: 18,
    shape: 'square',
  },
  boss: {
    hp: 500,
    speed: 30,
    gold: 100,
    damage: 10,
    color: 0xa29bfe,
    radius: 18,
    shape: 'boss_circle',
    immunities: ['pushback'],
  },
  swarm: {
    hp: 15,
    speed: 90,
    gold: 2,
    damage: 1,
    color: 0x55efc4,
    radius: 6,
    shape: 'circle',
  },
  splitter: {
    hp: 80,
    speed: 50,
    gold: 12,
    damage: 2,
    color: 0xfd79a8,
    radius: 13,
    shape: 'circle',
    splitCount: 3,
  },
  armored: {
    hp: 100,
    speed: 45,
    gold: 20,
    damage: 2,
    resistance: 0.5,
    color: 0x2d3436,
    size: 20,
    shape: 'square',
  },
  boss_armored: {
    hp: 1500,
    speed: 25,
    gold: 150,
    damage: 15,
    resistance: 0.3,
    color: 0x2d3436,
    radius: 20,
    shape: 'boss_armored',
    immunities: ['pushback'],
  },
};

// ── Wave Definitions (R1~R20) ───────────────────────────────────
/**
 * Predefined wave compositions for rounds 1-20.
 * Each entry: { enemies: [{type, count}], spawnInterval: seconds }
 * Enemies spawn in order listed.
 */
export const WAVE_DEFINITIONS = [
  null, // index 0 unused (rounds are 1-based)
  // R1
  { enemies: [{ type: 'normal', count: 5 }], spawnInterval: 1.5 },
  // R2
  { enemies: [{ type: 'normal', count: 8 }], spawnInterval: 1.3 },
  // R3
  { enemies: [{ type: 'normal', count: 8 }, { type: 'fast', count: 3 }], spawnInterval: 1.2 },
  // R4
  { enemies: [{ type: 'normal', count: 6 }, { type: 'fast', count: 6 }], spawnInterval: 1.1 },
  // R5
  { enemies: [{ type: 'normal', count: 8 }, { type: 'tank', count: 2 }], spawnInterval: 1.2 },
  // R6
  { enemies: [{ type: 'fast', count: 12 }], spawnInterval: 0.8 },
  // R7
  { enemies: [{ type: 'normal', count: 10 }, { type: 'tank', count: 3 }], spawnInterval: 1.0 },
  // R8
  { enemies: [{ type: 'normal', count: 12 }, { type: 'fast', count: 5 }], spawnInterval: 0.9 },
  // R9
  { enemies: [{ type: 'normal', count: 10 }, { type: 'fast', count: 5 }, { type: 'tank', count: 3 }], spawnInterval: 0.9 },
  // R10 - Boss round
  { enemies: [{ type: 'boss', count: 1 }, { type: 'normal', count: 10 }], spawnInterval: 1.0, bossRound: true, bossDelay: 3.0 },
  // R11
  { enemies: [{ type: 'normal', count: 15 }, { type: 'fast', count: 8 }], spawnInterval: 0.8 },
  // R12
  { enemies: [{ type: 'normal', count: 12 }, { type: 'tank', count: 5 }], spawnInterval: 0.9 },
  // R13
  { enemies: [{ type: 'fast', count: 20 }, { type: 'tank', count: 3 }], spawnInterval: 0.7 },
  // R14
  { enemies: [{ type: 'normal', count: 15 }, { type: 'fast', count: 8 }, { type: 'tank', count: 4 }], spawnInterval: 0.8 },
  // R15 - Swarm first appearance
  { enemies: [{ type: 'normal', count: 10 }, { type: 'fast', count: 5 }, { type: 'swarm', count: 20 }], spawnInterval: 0.6 },
  // R16
  { enemies: [{ type: 'swarm', count: 30 }, { type: 'tank', count: 4 }], spawnInterval: 0.5 },
  // R17
  { enemies: [{ type: 'normal', count: 15 }, { type: 'swarm', count: 15 }, { type: 'tank', count: 4 }], spawnInterval: 0.65 },
  // R18 - Splitter first appearance
  { enemies: [{ type: 'normal', count: 10 }, { type: 'splitter', count: 5 }, { type: 'tank', count: 3 }], spawnInterval: 0.9 },
  // R19
  { enemies: [{ type: 'swarm', count: 20 }, { type: 'splitter', count: 5 }, { type: 'fast', count: 10 }], spawnInterval: 0.7 },
  // R20 - Armored boss round
  { enemies: [{ type: 'boss_armored', count: 1 }, { type: 'tank', count: 5 }, { type: 'normal', count: 15 }], spawnInterval: 1.0, bossRound: true, bossDelay: 5.0 },
];

// ── Scaling Constants (R21+) ────────────────────────────────────
export const SCALING = {
  BASE_COUNT_ADD: 8,
  COUNT_PER_ROUND: 1.2,
  HP_SCALE_PER_ROUND: 0.15,
  SPEED_SCALE_PER_ROUND: 0.02,
  GOLD_SCALE_PER_ROUND: 0.06,
  MIN_SPAWN_INTERVAL: 0.4,
  SPAWN_INTERVAL_BASE: 1.5,
  SPAWN_INTERVAL_REDUCTION: 0.05,
  BOSS_HP_MULTIPLIER: 2.5,
  BOSS_SPEED_BONUS: 1.2,
  BOSS_RESISTANCE_SCALE: 0.03,
  RESISTANCE_CAP: 0.55,
  NORMAL_CHANCE: 0.5,
  FAST_CHANCE: 0.8,  // 0.5~0.8 = fast, 0.8~1.0 = tank
  SWARM_CHANCE_START: 15,
  SPLITTER_CHANCE_START: 18,
  ARMORED_CHANCE_START: 20,
  SWARM_SPAWN_CHANCE: 0.15,
  SPLITTER_SPAWN_CHANCE: 0.10,
  ARMORED_SPAWN_CHANCE: 0.12,
};

// ── Wave Flow ───────────────────────────────────────────────────
/** @const {number} Duration to display wave start text (ms) */
export const WAVE_ANNOUNCE_DURATION = 1500;

/** @const {number} Duration to display wave clear text (ms) */
export const WAVE_CLEAR_DURATION = 1500;

/** @const {number} Delay between waves in seconds */
export const WAVE_BREAK_DURATION = 3.0;

// ── Bonus Gold Formula ──────────────────────────────────────────
/**
 * Calculate wave clear bonus gold.
 * @param {number} round - Current round number
 * @param {number} currentHP - Current base HP
 * @param {number} maxHP - Maximum base HP
 * @returns {number} Bonus gold amount
 */
export function calcWaveClearBonus(round, currentHP, maxHP) {
  return round * 4 + Math.floor(currentHP / maxHP * 15);
}

// ── Visual Constants ────────────────────────────────────────────
export const VISUALS = {
  RANGE_FILL_ALPHA: 0.15,
  RANGE_STROKE_ALPHA: 0.4,
  RANGE_LINE_WIDTH: 1,
  HP_BAR_HEIGHT: 3,
  HP_BAR_OFFSET_Y: 3,
  DEATH_EFFECT_DURATION: 300,
  DAMAGE_FLASH_DURATION: 200,
  INVALID_PLACEMENT_DURATION: 500,
  BUILDABLE_HIGHLIGHT_ALPHA: 0.25,
  OVERLAY_ALPHA: 0.7,
  FADE_DURATION: 500,
  TOWER_BUTTON_SIZE: 40,
  ACTION_BUTTON_SIZE: 32,
  BUTTON_SPACING: 4,
  BOSS_HP_BAR_HEIGHT: 6,
  BOSS_ARMORED_HP_BAR_HEIGHT: 8,
};

// ── Projectile Sizes ────────────────────────────────────────────
export const PROJECTILE_SIZE = {
  archer: 3,
  mage: 5,
  ice: 5,
  lightning: 0,
  flame: 4,
  rock: 6,
  poison: 0,
  wind: 4,
  light: 0,
  dragon: 8,
};

// ── Tower Shape Sizes ───────────────────────────────────────────
export const TOWER_SHAPE_SIZE = {
  archer: 28,
  mage: 14,  // radius
  ice: 20,
  lightning: 30,
  flame: 12,     // circle radius
  rock: 24,      // hexagon
  poison: 22,    // pentagon
  wind: 28,
  light: 22,     // octagon
  dragon: 40,
};

// ── localStorage Key ────────────────────────────────────────────
export const SAVE_KEY = 'fantasy-td-save';

/** @const {string} Sound settings localStorage key */
export const SOUND_SAVE_KEY = 'fantasy-td-sound';

// ── Speed Settings ──────────────────────────────────────────────
export const SPEED_NORMAL = 1.0;
export const SPEED_FAST = 2.0;
export const SPEED_TURBO = 3.0;

// ── Coordinate Helpers ──────────────────────────────────────────
/**
 * Convert grid coordinates to pixel center coordinates.
 * @param {number} col - Grid column (0-indexed)
 * @param {number} row - Grid row (0-indexed)
 * @returns {{ x: number, y: number }} Pixel center coordinates
 */
export function gridToPixel(col, row) {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT,
  };
}

/**
 * Convert pixel coordinates to grid coordinates.
 * @param {number} x - Pixel X coordinate
 * @param {number} y - Pixel Y coordinate
 * @returns {{ col: number, row: number }} Grid coordinates
 */
export function pixelToGrid(x, y) {
  return {
    col: Math.floor(x / CELL_SIZE),
    row: Math.floor((y - HUD_HEIGHT) / CELL_SIZE),
  };
}

// ── Tower Enhancement (Lv.3+ Gold Sink) ──────────────────────
/** @const {number} Maximum enhancement level for Lv.3 towers */
export const MAX_ENHANCE_LEVEL = 10;

/** @const {number} Base cost for first enhancement */
export const ENHANCE_BASE_COST = 200;

/** @const {number} Cost increment per enhancement level */
export const ENHANCE_COST_INCREMENT = 100;

/** @const {number} Stat bonus per enhancement level (5% compound) */
export const ENHANCE_STAT_BONUS = 0.05;

/**
 * Calculate enhancement cost for a given level.
 * @param {number} level - Enhancement level (1-based, the level being purchased)
 * @returns {number} Gold cost
 */
export function calcEnhanceCost(level) {
  return ENHANCE_BASE_COST + (level - 1) * ENHANCE_COST_INCREMENT;
}

// ── HP Recovery (Gold Sink) ──────────────────────────────────
/** @const {number} Base cost for first HP recovery */
export const HP_RECOVER_BASE_COST = 100;

/** @const {number} Cost increment per use */
export const HP_RECOVER_COST_INCREMENT = 50;

/** @const {number} HP recovered per use */
export const HP_RECOVER_AMOUNT = 5;

/**
 * Calculate HP recovery cost based on use count.
 * @param {number} useCount - Number of times already used (0-based)
 * @returns {number} Gold cost
 */
export function calcHpRecoverCost(useCount) {
  return HP_RECOVER_BASE_COST + useCount * HP_RECOVER_COST_INCREMENT;
}

// ── Consumable Abilities (Gold Sink) ─────────────────────────
/**
 * Consumable ability definitions.
 * baseCost: initial gold cost
 * costIncrement: cost increase per use
 * cooldown: cooldown in seconds
 * duration: effect duration in seconds (0 = instant)
 */
export const CONSUMABLE_ABILITIES = {
  slowAll: {
    baseCost: 300,
    costIncrement: 50,
    cooldown: 30,
    duration: 5,
    slowAmount: 0.5,
    color: 0x74b9ff,
    icon: 'S',
  },
  goldRain: {
    baseCost: 400,
    costIncrement: 75,
    cooldown: 45,
    duration: 10,
    color: 0xffd700,
    icon: '$',
  },
  lightning: {
    baseCost: 500,
    costIncrement: 100,
    cooldown: 60,
    duration: 0,
    damage: 100,
    color: 0xfdcb6e,
    icon: 'Z',
  },
};

// ── Diamond Currency ───────────────────────────────────────────
/** Diamond reward formula: floor(round/5)*2 + floor(round/10)*3 */
export function calcDiamondReward(round) {
  return Math.floor(round / 5) * 2 + Math.floor(round / 10) * 3;
}

/** @const {number} Diamond cost to unlock dragon tower */
export const DRAGON_UNLOCK_COST = 50;

// ── Meta Upgrade Tree (10 towers × 3 tiers × A/B) ─────────────
/**
 * Permanent meta-upgrade tree per tower type.
 * Each tier has 'a' and 'b' options with name, desc, cost, and effects.
 * @type {Object<string, object>}
 */
export const META_UPGRADE_TREE = {
  archer: {
    tier1: {
      a: { name: '예리한 화살촉', desc: '공격력 +10%', cost: 5,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.1 }] },
      b: { name: '넓은 시야', desc: '사거리 +10%', cost: 5,
           effects: [{ type: 'multiply', stat: 'range', value: 1.1 }] },
    },
    tier2: {
      a: { name: '빠른 사격', desc: '공격속도 +15%', cost: 12,
           effects: [{ type: 'multiply', stat: 'fireRate', value: 0.85 }] },
      b: { name: '관통의 힘', desc: '공격력 +15%', cost: 15,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.15 }] },
    },
    tier3: {
      a: { name: '명사수의 집중', desc: '공격력 +25%', cost: 25,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.25 }] },
      b: { name: '초원의 감시자', desc: '사거리 +20%, 공격속도 +10%', cost: 30,
           effects: [
             { type: 'multiply', stat: 'range', value: 1.2 },
             { type: 'multiply', stat: 'fireRate', value: 0.9 },
           ] },
    },
  },
  mage: {
    tier1: {
      a: { name: '마력 증폭', desc: '공격력 +10%', cost: 6,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.1 }] },
      b: { name: '확장된 폭발', desc: '폭발 반경 +15%', cost: 6,
           effects: [{ type: 'multiply', stat: 'splashRadius', value: 1.15 }] },
    },
    tier2: {
      a: { name: '비전 폭풍', desc: '공격력 +15%', cost: 15,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.15 }] },
      b: { name: '마나 효율', desc: '공격속도 +15%', cost: 14,
           effects: [{ type: 'multiply', stat: 'fireRate', value: 0.85 }] },
    },
    tier3: {
      a: { name: '파멸의 마법', desc: '공격력 +20%, 폭발 반경 +10%', cost: 30,
           effects: [
             { type: 'multiply', stat: 'damage', value: 1.2 },
             { type: 'multiply', stat: 'splashRadius', value: 1.1 },
           ] },
      b: { name: '마법의 메아리', desc: '공격속도 +20%, 사거리 +15%', cost: 28,
           effects: [
             { type: 'multiply', stat: 'fireRate', value: 0.8 },
             { type: 'multiply', stat: 'range', value: 1.15 },
           ] },
    },
  },
  ice: {
    tier1: {
      a: { name: '차가운 기운', desc: '슬로우 강도 +5%p', cost: 6,
           effects: [{ type: 'add', stat: 'slowAmount', value: 0.05 }] },
      b: { name: '서리의 사거리', desc: '사거리 +10%', cost: 5,
           effects: [{ type: 'multiply', stat: 'range', value: 1.1 }] },
    },
    tier2: {
      a: { name: '빙결 강화', desc: '슬로우 지속 +20%', cost: 14,
           effects: [{ type: 'multiply', stat: 'slowDuration', value: 1.2 }] },
      b: { name: '동토의 바람', desc: '공격속도 +15%', cost: 12,
           effects: [{ type: 'multiply', stat: 'fireRate', value: 0.85 }] },
    },
    tier3: {
      a: { name: '절대영도', desc: '슬로우 +10%p, 공격력 +20%', cost: 28,
           effects: [
             { type: 'add', stat: 'slowAmount', value: 0.1 },
             { type: 'multiply', stat: 'damage', value: 1.2 },
           ] },
      b: { name: '만년빙의 영역', desc: '사거리 +20%, 폭발 반경 +20%', cost: 30,
           effects: [
             { type: 'multiply', stat: 'range', value: 1.2 },
             { type: 'multiply', stat: 'splashRadius', value: 1.2 },
           ] },
    },
  },
  lightning: {
    tier1: {
      a: { name: '전압 강화', desc: '공격력 +10%', cost: 7,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.1 }] },
      b: { name: '전도체 확장', desc: '체인 반경 +15%', cost: 6,
           effects: [{ type: 'multiply', stat: 'chainRadius', value: 1.15 }] },
    },
    tier2: {
      a: { name: '고압 전류', desc: '공격력 +15%, 공격속도 +10%', cost: 16,
           effects: [
             { type: 'multiply', stat: 'damage', value: 1.15 },
             { type: 'multiply', stat: 'fireRate', value: 0.9 },
           ] },
      b: { name: '연쇄 반응', desc: '체인 감쇄 +5%p', cost: 14,
           effects: [{ type: 'add', stat: 'chainDecay', value: 0.05 }] },
    },
    tier3: {
      a: { name: '천둥의 심판', desc: '공격력 +25%', cost: 30,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.25 }] },
      b: { name: '번개 그물', desc: '체인 수 +1, 체인 반경 +20%', cost: 35,
           effects: [
             { type: 'add', stat: 'chainCount', value: 1 },
             { type: 'multiply', stat: 'chainRadius', value: 1.2 },
           ] },
    },
  },
  flame: {
    tier1: {
      a: { name: '고열 화염', desc: '화상 도트 +15%', cost: 6,
           effects: [{ type: 'multiply', stat: 'burnDamage', value: 1.15 }] },
      b: { name: '지속 연소', desc: '화상 지속 +20%', cost: 5,
           effects: [{ type: 'multiply', stat: 'burnDuration', value: 1.2 }] },
    },
    tier2: {
      a: { name: '업화', desc: '공격력 +15%, 화상 도트 +10%', cost: 15,
           effects: [
             { type: 'multiply', stat: 'damage', value: 1.15 },
             { type: 'multiply', stat: 'burnDamage', value: 1.1 },
           ] },
      b: { name: '확산 화염', desc: '사거리 +15%', cost: 13,
           effects: [{ type: 'multiply', stat: 'range', value: 1.15 }] },
    },
    tier3: {
      a: { name: '지옥불', desc: '화상 도트 +30%, 공격력 +15%', cost: 28,
           effects: [
             { type: 'multiply', stat: 'burnDamage', value: 1.3 },
             { type: 'multiply', stat: 'damage', value: 1.15 },
           ] },
      b: { name: '불의 장막', desc: '사거리 +20%, 공격속도 +15%', cost: 30,
           effects: [
             { type: 'multiply', stat: 'range', value: 1.2 },
             { type: 'multiply', stat: 'fireRate', value: 0.85 },
           ] },
    },
  },
  rock: {
    tier1: {
      a: { name: '강화 투석', desc: '공격력 +10%', cost: 7,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.1 }] },
      b: { name: '견고한 발사대', desc: '공격속도 +10%', cost: 6,
           effects: [{ type: 'multiply', stat: 'fireRate', value: 0.9 }] },
    },
    tier2: {
      a: { name: '거대 바위', desc: '공격력 +20%', cost: 16,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.2 }] },
      b: { name: '넓은 충격파', desc: '사거리 +15%', cost: 14,
           effects: [{ type: 'multiply', stat: 'range', value: 1.15 }] },
    },
    tier3: {
      a: { name: '산사태', desc: '공격력 +30%', cost: 32,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.3 }] },
      b: { name: '지진파', desc: '공격속도 +20%, 사거리 +15%', cost: 30,
           effects: [
             { type: 'multiply', stat: 'fireRate', value: 0.8 },
             { type: 'multiply', stat: 'range', value: 1.15 },
           ] },
    },
  },
  poison: {
    tier1: {
      a: { name: '맹독 농축', desc: '독 도트 +15%', cost: 6,
           effects: [{ type: 'multiply', stat: 'poisonDamage', value: 1.15 }] },
      b: { name: '독무 확산', desc: '폭발 반경 +10%', cost: 6,
           effects: [{ type: 'multiply', stat: 'splashRadius', value: 1.1 }] },
    },
    tier2: {
      a: { name: '부식성 독', desc: '방어력 감소 +5%p', cost: 15,
           effects: [{ type: 'add', stat: 'armorReduction', value: 0.05 }] },
      b: { name: '장기 오염', desc: '독 지속 +25%', cost: 13,
           effects: [{ type: 'multiply', stat: 'poisonDuration', value: 1.25 }] },
    },
    tier3: {
      a: { name: '치명적 역병', desc: '독 도트 +25%, 방어력 감소 +10%p', cost: 30,
           effects: [
             { type: 'multiply', stat: 'poisonDamage', value: 1.25 },
             { type: 'add', stat: 'armorReduction', value: 0.1 },
           ] },
      b: { name: '죽음의 안개', desc: '폭발 반경 +25%, 사거리 +15%', cost: 28,
           effects: [
             { type: 'multiply', stat: 'splashRadius', value: 1.25 },
             { type: 'multiply', stat: 'range', value: 1.15 },
           ] },
    },
  },
  wind: {
    tier1: {
      a: { name: '강풍', desc: '밀치기 +15%', cost: 5,
           effects: [{ type: 'multiply', stat: 'pushbackDistance', value: 1.15 }] },
      b: { name: '빠른 돌풍', desc: '공격속도 +10%', cost: 6,
           effects: [{ type: 'multiply', stat: 'fireRate', value: 0.9 }] },
    },
    tier2: {
      a: { name: '회오리 강화', desc: '밀치기 +20%', cost: 14,
           effects: [{ type: 'multiply', stat: 'pushbackDistance', value: 1.2 }] },
      b: { name: '바람의 감시', desc: '사거리 +15%', cost: 12,
           effects: [{ type: 'multiply', stat: 'range', value: 1.15 }] },
    },
    tier3: {
      a: { name: '태풍의 눈', desc: '밀치기 +25%, 공격력 +20%', cost: 28,
           effects: [
             { type: 'multiply', stat: 'pushbackDistance', value: 1.25 },
             { type: 'multiply', stat: 'damage', value: 1.2 },
           ] },
      b: { name: '광역 질풍', desc: '공격속도 +20%, 사거리 +15%', cost: 25,
           effects: [
             { type: 'multiply', stat: 'fireRate', value: 0.8 },
             { type: 'multiply', stat: 'range', value: 1.15 },
           ] },
    },
  },
  light: {
    tier1: {
      a: { name: '집중 광선', desc: '공격력 +10%', cost: 8,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.1 }] },
      b: { name: '광역 조명', desc: '폭발 반경/사거리 +10%', cost: 7,
           effects: [
             { type: 'multiply', stat: 'range', value: 1.1 },
             { type: 'multiply', stat: 'splashRadius', value: 1.1 },
           ] },
    },
    tier2: {
      a: { name: '고출력 레이저', desc: '공격력 +15%, 공격속도 +10%', cost: 18,
           effects: [
             { type: 'multiply', stat: 'damage', value: 1.15 },
             { type: 'multiply', stat: 'fireRate', value: 0.9 },
           ] },
      b: { name: '빛의 보호막', desc: '공격속도 +15%', cost: 15,
           effects: [{ type: 'multiply', stat: 'fireRate', value: 0.85 }] },
    },
    tier3: {
      a: { name: '태양의 분노', desc: '공격력 +30%', cost: 35,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.3 }] },
      b: { name: '빛의 축복', desc: '공격속도 +25%, 사거리 +10%', cost: 32,
           effects: [
             { type: 'multiply', stat: 'fireRate', value: 0.75 },
             { type: 'multiply', stat: 'range', value: 1.1 },
           ] },
    },
  },
  dragon: {
    tier1: {
      a: { name: '용의 화염', desc: '공격력 +10%', cost: 8,
           effects: [{ type: 'multiply', stat: 'damage', value: 1.1 }] },
      b: { name: '용의 날개', desc: '사거리 +10%', cost: 8,
           effects: [{ type: 'multiply', stat: 'range', value: 1.1 }] },
    },
    tier2: {
      a: { name: '고대의 불길', desc: '공격력 +15%, 화상 도트 +15%', cost: 18,
           effects: [
             { type: 'multiply', stat: 'damage', value: 1.15 },
             { type: 'multiply', stat: 'burnDamage', value: 1.15 },
           ] },
      b: { name: '용의 위엄', desc: '폭발 반경 +15%, 공격속도 +10%', cost: 16,
           effects: [
             { type: 'multiply', stat: 'splashRadius', value: 1.15 },
             { type: 'multiply', stat: 'fireRate', value: 0.9 },
           ] },
    },
    tier3: {
      a: { name: '용왕의 심판', desc: '공격력 +25%, 화상/독 도트 +20%', cost: 35,
           effects: [
             { type: 'multiply', stat: 'damage', value: 1.25 },
             { type: 'multiply', stat: 'burnDamage', value: 1.2 },
             { type: 'multiply', stat: 'poisonDamage', value: 1.2 },
           ] },
      b: { name: '드래곤 로드', desc: '사거리 +20%, 공격속도 +20%, 폭발 반경 +15%', cost: 35,
           effects: [
             { type: 'multiply', stat: 'range', value: 1.2 },
             { type: 'multiply', stat: 'fireRate', value: 0.8 },
             { type: 'multiply', stat: 'splashRadius', value: 1.15 },
           ] },
    },
  },
};

// ── Utility Upgrades ───────────────────────────────────────────
/**
 * Utility upgrade definitions (linear tier progression, no A/B branching).
 * @type {Object<string, object>}
 */
export const UTILITY_UPGRADES = {
  baseHp: {
    name: 'Base HP+',
    desc: '기지 시작 체력 증가',
    icon: 'heart',
    iconColor: 0xe94560,
    tiers: [
      { value: 22, cost: 8, desc: 'HP 22' },
      { value: 25, cost: 15, desc: 'HP 25' },
      { value: 30, cost: 30, desc: 'HP 30' },
    ],
  },
  goldBoost: {
    name: 'Gold Boost',
    desc: '시작 골드 증가',
    icon: 'coin',
    iconColor: 0xffd700,
    tiers: [
      { value: 275, cost: 8, desc: '275G' },
      { value: 300, cost: 15, desc: '300G' },
      { value: 350, cost: 30, desc: '350G' },
    ],
  },
  waveBonus: {
    name: 'Wave Bonus+',
    desc: '웨이브 클리어 보너스 배율 증가',
    icon: 'star',
    iconColor: 0xfdcb6e,
    tiers: [
      { value: 1.1, cost: 8, desc: '1.1x' },
      { value: 1.2, cost: 15, desc: '1.2x' },
      { value: 1.3, cost: 30, desc: '1.3x' },
    ],
  },
};

// ── Meta Upgrade Helper Functions ──────────────────────────────

/**
 * Get base HP considering utility upgrades.
 * @param {object} utilityUpgrades - { baseHp: number, ... }
 * @returns {number} Effective base HP
 */
export function getMetaBaseHP(utilityUpgrades) {
  const tier = utilityUpgrades?.baseHp || 0;
  if (tier === 0) return BASE_HP;
  return UTILITY_UPGRADES.baseHp.tiers[tier - 1].value;
}

/**
 * Get max base HP considering utility upgrades (same as base HP).
 * @param {object} utilityUpgrades - { baseHp: number, ... }
 * @returns {number} Effective max base HP
 */
export function getMetaMaxBaseHP(utilityUpgrades) {
  return getMetaBaseHP(utilityUpgrades);
}

/**
 * Get initial gold considering utility upgrades.
 * @param {object} utilityUpgrades - { goldBoost: number, ... }
 * @returns {number} Effective initial gold
 */
export function getMetaInitialGold(utilityUpgrades) {
  const tier = utilityUpgrades?.goldBoost || 0;
  if (tier === 0) return INITIAL_GOLD;
  return UTILITY_UPGRADES.goldBoost.tiers[tier - 1].value;
}

/**
 * Get wave bonus multiplier considering utility upgrades.
 * @param {object} utilityUpgrades - { waveBonus: number, ... }
 * @returns {number} Wave bonus multiplier
 */
export function getMetaWaveBonusMultiplier(utilityUpgrades) {
  const tier = utilityUpgrades?.waveBonus || 0;
  if (tier === 0) return 1.0;
  return UTILITY_UPGRADES.waveBonus.tiers[tier - 1].value;
}

// ── Save Data Migration ────────────────────────────────────────

/**
 * Create default stats object for save data.
 * @returns {object} Default stats
 */
function createDefaultStats() {
  return {
    totalGamesPlayed: 0,
    totalKills: 0,
    totalBossKills: 0,
    totalTowersPlaced: 0,
    totalGoldEarned: 0,
    totalDamageDealt: 0,
    totalWavesCleared: 0,
    killsByEnemyType: {},
    killsByTowerType: {},
    bestRound: 0,
    bestKills: 0,
    gameHistory: [],
  };
}

/**
 * Migrate save data to latest schema.
 * Adds missing fields with default values while preserving existing data.
 * @param {object|null} saveData - Existing save data (may be null or older format)
 * @returns {object} Migrated save data with all fields
 */
export function migrateSaveData(saveData) {
  if (!saveData) {
    return {
      bestRound: 0,
      bestKills: 0,
      totalGames: 0,
      diamond: 0,
      totalDiamondEarned: 0,
      towerUpgrades: {},
      utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
      dragonUnlocked: false,
      stats: createDefaultStats(),
    };
  }

  // Phase 3 field migration
  if (saveData.diamond === undefined) saveData.diamond = 0;
  if (saveData.totalDiamondEarned === undefined) saveData.totalDiamondEarned = 0;
  if (!saveData.towerUpgrades) saveData.towerUpgrades = {};
  if (!saveData.utilityUpgrades) {
    saveData.utilityUpgrades = { baseHp: 0, goldBoost: 0, waveBonus: 0 };
  }
  if (saveData.dragonUnlocked === undefined) saveData.dragonUnlocked = false;

  // Phase 6 field migration: stats
  if (!saveData.stats) {
    saveData.stats = createDefaultStats();
    // Seed from existing top-level fields
    saveData.stats.totalGamesPlayed = saveData.totalGames || 0;
    saveData.stats.bestRound = saveData.bestRound || 0;
    saveData.stats.bestKills = saveData.bestKills || 0;
  }
  if (!saveData.stats.gameHistory) saveData.stats.gameHistory = [];

  return saveData;
}
