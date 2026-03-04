/**
 * @fileoverview Fantasy Tower Defense 게임 설정 상수 파일.
 * 밸런스 수치, 레이아웃 치수, 맵 데이터, 타워/적 스탯 등 모든 설정값을 여기에 집중 관리한다.
 * 이 파일 외부에 매직 넘버가 존재하면 안 된다.
 */

import { WORLDS } from './data/worlds.js';

// ── 레이아웃 ────────────────────────────────────────────────────
/** @const {number} 게임 논리 가로 크기 (px) */
export const GAME_WIDTH = 360;

/** @const {number} 게임 논리 세로 크기 (px) */
export const GAME_HEIGHT = 640;

/** @const {number} 그리드 셀 크기 (px) */
export const CELL_SIZE = 40;

/** @const {number} 그리드 열 수 */
export const GRID_COLS = 9;

/** @const {number} 그리드 행 수 */
export const GRID_ROWS = 12;

/** @const {number} 상단 HUD 영역 높이 (px) */
export const HUD_HEIGHT = 40;

/** @const {number} 하단 UI 패널 높이 (px) */
export const PANEL_HEIGHT = 120;

/** @const {number} 맵 영역 높이 (px) */
export const MAP_HEIGHT = 480;

/** @const {number} 패널 시작 Y 좌표 */
export const PANEL_Y = 520;

// ── 롱프레스 ────────────────────────────────────────────────────
/** @const {number} 롱프레스 판정 기준 시간 (ms) */
export const LONG_PRESS_MS = 400;

// ── 색상 ────────────────────────────────────────────────────────
export const COLORS = {
  BACKGROUND: 0x0d0d1a,
  HUD_BG: 0x12122a,
  EMPTY_TILE: 0x1a1a2e,
  PATH: 0x2a2a3e,
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
  UI_PANEL: 0x1a1040,
  BUTTON_ACTIVE: 0xc0a030,
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
  DIAMOND: 0x9b59b6,
  DIAMOND_CSS: '#9b59b6',
};

// ── 버튼 시맨틱 색상 ───────────────────────────────────────────
/** @const {number} 주요 액션 버튼 (골드) */
export const BTN_PRIMARY = 0xc0a030;
/** @const {number} 메타/컬렉션 버튼 (퍼플) */
export const BTN_META    = 0x6c3483;
/** @const {number} 뒤로가기/보조 버튼 (틸) */
export const BTN_BACK    = 0x1a6b5e;
/** @const {number} 비활성/판매 버튼 (그레이) */
export const BTN_SELL    = 0x4a4a5a;
/** @const {number} 위험/종료 버튼 (레드) */
export const BTN_DANGER  = 0x8b1a2e;
/** @const {string} 프라이머리 CSS 헥스값 */
export const BTN_PRIMARY_CSS  = '#c0a030';
/** @const {string} 메타 CSS 헥스값 */
export const BTN_META_CSS     = '#9b59b6';
/** @const {string} 백 CSS 헥스값 */
export const BTN_BACK_CSS     = '#1a9c7e';
/** @const {string} 판매 CSS 헥스값 */
export const BTN_SELL_CSS     = '#8a8a9a';
/** @const {string} 위험 CSS 헥스값 */
export const BTN_DANGER_CSS   = '#c0392b';

/** @const {string} 골드 텍스트 CSS 헥스 색상 */
export const GOLD_TEXT_CSS = '#ffd700';

/** @const {string} HP 위험 경고 텍스트 CSS 헥스 색상 */
export const HP_DANGER_CSS = '#ff4757';

// ── 도감 티어별 배경 색상 ───────────────────────────────────────
/** @const {Object<number, number>} 합성도감(MergeCodexScene)에서 각 티어의 배경 색상 */
export const CODEX_TIER_BG = {
  1: 0x1a1a2e,   // T1: basic dark
  2: 0x0d1a2e,   // T2: dark blue
  3: 0x1a1500,   // T3: dark gold-brown
  4: 0x130a2e,   // T4: deep purple
  5: 0x1a0a0a,   // T5: deep red (legendary)
};

// ── 공격 타입별 색상 ────────────────────────────────────────────
/** @const {Object<string, number>} 공격 타입별 색상 (hex) */
export const ATTACK_TYPE_COLORS = {
  single:        0xb2bec3,
  splash:        0xe17055,
  aoe_instant:   0xe17055,
  chain:         0xfdcb6e,
  piercing_beam: 0xffeaa7,
  dot_single:    0xa8e063,
};
/** @const {Object<string, string>} 공격 타입별 색상 (CSS hex) */
export const ATTACK_TYPE_COLORS_CSS = {
  single:        '#b2bec3',
  splash:        '#e17055',
  aoe_instant:   '#e17055',
  chain:         '#fdcb6e',
  piercing_beam: '#ffeaa7',
  dot_single:    '#a8e063',
};

// ── 셀 타입 ────────────────────────────────────────────────────
/** @const {number} 빈 셀 (타워 설치 가능) */
export const CELL_EMPTY = 0;
/** @const {number} 경로 셀 (적 이동 경로) */
export const CELL_PATH = 1;
/** @const {number} 기지 셀 (방어 대상) */
export const CELL_BASE = 2;
/** @const {number} 스폰 셀 (적 출현 지점) */
export const CELL_SPAWN = 3;
/** @const {number} 벽 셀 (설치/이동 불가) */
export const CELL_WALL = 4;

// ── 맵 그리드 (9열 x 12행) ──────────────────────────────────────
/**
 * 타일 맵을 나타내는 2차원 배열.
 * 0=빈칸, 1=경로, 2=기지, 3=스폰, 4=벽
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

// ── 경로 웨이포인트 (그리드 좌표) ───────────────────────────────
/**
 * 스폰에서 기지까지의 적 이동 경로 웨이포인트 (순서대로).
 * 각 항목은 그리드 좌표 { col, row } 형식이다.
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

// ── 경제 ────────────────────────────────────────────────────────
/** @const {number} 시작 골드량 (밸런스 오버홀: 250→200→160, 뽑기 시스템 도입에 따른 재조정) */
export const INITIAL_GOLD = 160;

// ── 뽑기 비용 ──────────────────────────────────────────────────
// 뽑기 횟수 -> 비용 예상표 (DRAW_BASE_COST=80, DRAW_COST_INCREMENT=20 기준)
// 0회: 80G, 5회: 180G, 10회: 280G, 20회: 480G, 30회: 680G
/** @const {number} 뽑기 기본 비용 */
export const DRAW_BASE_COST = 80;
/** @const {number} 뽑기 횟수당 비용 증가량 */
export const DRAW_COST_INCREMENT = 20;
/**
 * 현재 뽑기 횟수에 따른 뽑기 비용을 계산한다.
 * @param {number} drawCount - 현재 게임 세션 내 뽑기 성공 횟수
 * @returns {number} 뽑기 비용
 */
export function calcDrawCost(drawCount) {
  return DRAW_BASE_COST + DRAW_COST_INCREMENT * drawCount;
}

/** @const {number} 시작 기지 체력 */
export const BASE_HP = 20;

/** @const {number} 최대 기지 체력 */
export const MAX_BASE_HP = 20;

/** @const {number} 판매 환급 비율 (50%) — 밸런스 오버홀: 0.6→0.5 */
export const SELL_RATIO = 0.5;

/** @const {number} HP 위험 경고 임계값 */
export const HP_DANGER_THRESHOLD = 5;

/** @const {number} HP 깜빡임 간격 (ms) */
export const HP_BLINK_INTERVAL = 500;

/**
 * 합성 결과 티어별 골드 비용 (밸런스 오버홀).
 * T1+T1→T2: 30G, T2+X→T3: 80G, T3+X→T4: 150G, T4+T4→T5: 250G
 * @const {Object<number, number>}
 */
export const MERGE_COST = {
  2: 30,    // T1+T1→T2
  3: 80,    // T2+X→T3
  4: 150,   // T3+X→T4
  5: 250,   // T4+T4→T5
};

// (드래곤 타워 잠금은 TOWER_STATS[type].locked 필드로 관리)

// ── 타워 스탯 ───────────────────────────────────────────────────
/**
 * 타워 유형별 기본 스탯.
 * - levels: { 1: Lv.1 스탯 }
 * - locked: true = 해금 필요, false/undefined = 사용 가능
 * - unlockWorld: 해금 조건 월드 ID (locked=true일 때, 해당 월드 클리어로 해금)
 * - cost: 설치 비용 (Lv.1)
 * - sellPrice: floor(총 투자금 * 0.6)
 */
export const TOWER_STATS = {
  archer: {
    name: 'Archer',
    displayName: 'Archer',
    color: 0x00b894,
    locked: false,
    unlockCost: 0,
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
    },
  },
  mage: {
    name: 'Mage',
    displayName: 'Mage',
    color: 0x6c5ce7,
    locked: false,
    unlockCost: 0,
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
    },
  },
  ice: {
    name: 'Ice',
    displayName: 'Ice',
    color: 0x74b9ff,
    locked: false,
    unlockCost: 0,
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
    },
  },
  lightning: {
    name: 'Lightning',
    displayName: 'Lightning',
    color: 0xfdcb6e,
    locked: false,
    unlockCost: 0,
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
    },
  },
  flame: {
    name: 'Flame',
    displayName: 'Flame',
    color: 0xe17055,
    locked: false,
    unlockCost: 0,
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
    },
  },
  rock: {
    name: 'Rock',
    displayName: 'Rock',
    color: 0x636e72,
    locked: true,
    unlockWorld: 'forest',
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
    },
  },
  poison: {
    name: 'Poison',
    displayName: 'Poison',
    color: 0xa8e063,
    locked: true,
    unlockWorld: 'desert',
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
    },
  },
  wind: {
    name: 'Wind',
    displayName: 'Wind',
    color: 0x81ecec,
    locked: true,
    unlockWorld: 'tundra',
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
    },
  },
  light: {
    name: 'Light',
    displayName: 'Light',
    color: 0xffeaa7,
    locked: true,
    unlockWorld: 'volcano',
    levels: {
      1: {
        cost: 130,
        damage: 20,
        fireRate: 1.8,
        range: 600,
        attackType: 'piercing_beam',
        sellPrice: 78,
      },
    },
  },
  dragon: {
    name: 'Dragon',
    displayName: 'Dragon',
    color: 0xd63031,
    locked: true,
    unlockWorld: 'shadow',
    levels: {
      1: {
        cost: 250,
        damage: 60,
        fireRate: 2.5,
        range: 160,
        projectileSpeed: 200,
        attackType: 'splash',
        splashRadius: 80,
        sellPrice: 150,
      },
    },
  },
};

// ── 타워 해금 매핑 ──────────────────────────────────────────────
/**
 * 월드 ID → 해금 타워 타입 매핑.
 * 해당 월드의 모든 맵 클리어 시 대응하는 타워가 해금된다.
 * @type {Object<string, string>}
 */
export const TOWER_UNLOCK_MAP = {
  forest: 'rock',
  desert: 'poison',
  tundra: 'wind',
  volcano: 'light',
  shadow: 'dragon',
};

// ── 합성 시스템 ─────────────────────────────────────────────────
/**
 * 합성 레시피: 키 = typeA+typeB (알파벳순 정렬), 값 = 합성 결과.
 * 총 102개: T2 55개(동종 10 + 이종 45) + T3 30개(T2+T2 12 + T2+T1 18) + T4 12개 + T5 5개.
 * @type {Object<string, { id: string, tier: number, displayName: string, color: number }>}
 */
export const MERGE_RECIPES = {
  // ── 동종 합성 (10종) ──
  'archer+archer':       { id: 'rapid_archer',   tier: 2, displayName: '연속 사격수',   color: 0x00d6a4 },
  'mage+mage':           { id: 'overload_mage',  tier: 2, displayName: '과충전 술사',   color: 0x8b7cf7 },
  'ice+ice':             { id: 'zero_field',     tier: 2, displayName: '절대 영역',     color: 0x5fa8ff },
  'lightning+lightning':  { id: 'thunder_lord',   tier: 2, displayName: '뇌제',         color: 0xfdd835 },
  'flame+flame':         { id: 'inferno',        tier: 2, displayName: '업화',         color: 0xff5733 },
  'rock+rock':           { id: 'quake',          tier: 2, displayName: '지진파',       color: 0x808e93 },
  'poison+poison':       { id: 'plague',         tier: 2, displayName: '역병의 근원',   color: 0x7bc842 },
  'wind+wind':           { id: 'typhoon',        tier: 2, displayName: '대태풍',       color: 0x63d8d8 },
  'light+light':         { id: 'solar_burst',    tier: 2, displayName: '태양 폭발',    color: 0xffe066 },
  'dragon+dragon':       { id: 'ancient_dragon', tier: 2, displayName: '고대 용왕',    color: 0xb71c1c },

  // ── 이종 합성: 궁수 조합 (8종) ──
  'archer+mage':         { id: 'arcane_archer',  tier: 2, displayName: '마법 화살사',   color: 0x368bbd },
  'archer+ice':          { id: 'cryo_sniper',    tier: 2, displayName: '냉동 저격수',   color: 0x3ab8ca },
  'archer+lightning':    { id: 'shock_arrow',    tier: 2, displayName: '전격 화살',     color: 0x7ec281 },
  'archer+flame':        { id: 'fire_arrow',     tier: 2, displayName: '화염 화살',     color: 0x70c475 },
  'archer+rock':         { id: 'armor_pierce',   tier: 2, displayName: '철갑 화살',     color: 0x319483 },
  'archer+poison':       { id: 'venom_shot',     tier: 2, displayName: '독화살',       color: 0x54cc7b },
  'archer+wind':         { id: 'gale_arrow',     tier: 2, displayName: '폭풍 화살',     color: 0x40d2c0 },
  'archer+light':        { id: 'holy_arrow',     tier: 2, displayName: '신성 화살',     color: 0x7fd19e },

  // ── 이종 합성: 마법사 조합 (7종) ──
  'ice+mage':            { id: 'frost_mage',     tier: 2, displayName: '서리 술사',     color: 0x7080f3 },
  'lightning+mage':      { id: 'storm_mage',     tier: 2, displayName: '폭풍 마법사',   color: 0xb494aa },
  'flame+mage':          { id: 'pyromancer',     tier: 2, displayName: '화염 술사',     color: 0xa7666e },
  'mage+rock':           { id: 'gravity_mage',   tier: 2, displayName: '중력 마법사',   color: 0x6865ac },
  'mage+poison':         { id: 'toxic_mage',     tier: 2, displayName: '독기 술사',     color: 0x8a9e75 },
  'mage+wind':           { id: 'vacuum_mage',    tier: 2, displayName: '진공 마법사',   color: 0x76a4ea },
  'light+mage':          { id: 'radiant_mage',   tier: 2, displayName: '성광 마법사',   color: 0xb5a3c7 },

  // ── 이종 합성: 얼음 조합 (6종) ──
  'ice+lightning':       { id: 'thunder_frost',  tier: 2, displayName: '전격 빙결',     color: 0xb8d2b7 },
  'flame+ice':           { id: 'cryo_flame',     tier: 2, displayName: '냉열 교차',     color: 0xabc4aa },
  'ice+rock':            { id: 'glacier',        tier: 2, displayName: '빙산',         color: 0x6b9eb9 },
  'ice+poison':          { id: 'frost_venom',    tier: 2, displayName: '동상 독',       color: 0x8ecfb1 },
  'ice+wind':            { id: 'blizzard',       tier: 2, displayName: '빙풍',         color: 0x7bd4f6 },
  'ice+light':           { id: 'holy_ice',       tier: 2, displayName: '성빙',         color: 0xb9d2d3 },

  // ── 이종 합성: 번개 조합 (5종) ──
  'flame+lightning':     { id: 'thunder_fire',   tier: 2, displayName: '벼락불',       color: 0xf09e62 },
  'lightning+rock':      { id: 'thunder_strike', tier: 2, displayName: '천둥 강타',     color: 0xb09d70 },
  'lightning+poison':    { id: 'toxic_shock',    tier: 2, displayName: '독전기',       color: 0xd3d069 },
  'lightning+wind':      { id: 'storm_bolt',     tier: 2, displayName: '폭풍 전격',     color: 0xbfdbad },
  'light+lightning':     { id: 'holy_thunder',   tier: 2, displayName: '신성 번개',     color: 0xfde08b },

  // ── 이종 합성: 불꽃 조합 (4종) ──
  'flame+rock':          { id: 'magma_shot',     tier: 2, displayName: '용암탄',       color: 0xa26f64 },
  'flame+poison':        { id: 'venom_fire',     tier: 2, displayName: '맹독 화염',     color: 0xc4a85c },
  'flame+wind':          { id: 'fire_storm',     tier: 2, displayName: '화염 폭풍',     color: 0xb12e71 },
  'flame+light':         { id: 'solar_flame',    tier: 2, displayName: '태양광 화염',   color: 0xf0c57e },

  // ── 이종 합성: 바위 조합 (3종) ──
  'poison+rock':         { id: 'toxic_boulder',  tier: 2, displayName: '독암',         color: 0x86a76b },
  'rock+wind':           { id: 'stone_gale',     tier: 2, displayName: '바위 폭풍',     color: 0x72adaf },
  'light+rock':          { id: 'holy_stone',     tier: 2, displayName: '성광 바위',     color: 0xb1ac8d },

  // ── 이종 합성: 독 조합 (2종) ──
  'poison+wind':         { id: 'toxic_gale',     tier: 2, displayName: '독풍',         color: 0x94e6a6 },
  'light+poison':        { id: 'purge_venom',    tier: 2, displayName: '정화의 독',     color: 0xd3e285 },

  // ── 이종 합성: 바람 조합 (1종) ──
  'light+wind':          { id: 'radiant_gale',   tier: 2, displayName: '성광 폭풍',     color: 0xc0e7ca },

  // ── 이종 합성: 드래곤 조합 (9종) ──
  'archer+dragon':       { id: 'dragon_rider',   tier: 2, displayName: '용기병',       color: 0x6b9463 },
  'dragon+mage':         { id: 'dragon_mage',    tier: 2, displayName: '용마법사',     color: 0xa1468c },
  'dragon+ice':          { id: 'frost_dragon',   tier: 2, displayName: '빙룡',         color: 0xa37498 },
  'dragon+lightning':    { id: 'thunder_dragon', tier: 2, displayName: '뇌룡',         color: 0xe57e50 },
  'dragon+flame':        { id: 'inferno_dragon', tier: 2, displayName: '업화룡',       color: 0xdc5043 },
  'dragon+rock':         { id: 'stone_dragon',   tier: 2, displayName: '석룡',         color: 0x9c4f52 },
  'dragon+poison':       { id: 'venom_dragon',   tier: 2, displayName: '독룡',         color: 0xbf894a },
  'dragon+wind':         { id: 'storm_dragon',   tier: 2, displayName: '폭풍룡',       color: 0xab798e },
  'dragon+light':        { id: 'holy_dragon',    tier: 2, displayName: '성룡',         color: 0xea956c },

  // ══════════════════════════════════════════════════════════════════
  // T3 merges: T2+T2 combos (12)
  // ══════════════════════════════════════════════════════════════════
  'ancient_dragon+thunder_lord':  { id: 'thunder_wyrm_king',       tier: 3, displayName: '용뇌황제',       color: 0xffc312 },
  'ancient_dragon+plague':        { id: 'plague_wyrm',             tier: 3, displayName: '역병용신',       color: 0x8b5e3c },
  'ancient_dragon+solar_burst':   { id: 'cosmos_dragon',           tier: 3, displayName: '창세룡',         color: 0xff6b81 },
  'quake+stone_dragon':           { id: 'tectonic_dragon',         tier: 3, displayName: '지각파괴룡',     color: 0x6d4c41 },
  'stone_dragon+thunder_strike':  { id: 'adamantine_lightning',    tier: 3, displayName: '아다만 뇌격룡',   color: 0xc5a028 },
  'plague+venom_dragon':          { id: 'venom_sovereign',         tier: 3, displayName: '독황',           color: 0x5b8c3e },
  'frost_dragon+zero_field':      { id: 'absolute_frost_domain',   tier: 3, displayName: '절대빙령역',     color: 0x3d8bfd },
  'holy_dragon+solar_burst':      { id: 'celestial_judgment',      tier: 3, displayName: '천상심판',       color: 0xffd32a },
  'storm_mage+thunder_dragon':    { id: 'superconductor_mage',     tier: 3, displayName: '초전도뇌마',     color: 0xd4a017 },
  'inferno+pyromancer':           { id: 'grand_pyromancer',        tier: 3, displayName: '대화염마도사',   color: 0xff3838 },
  'storm_mage+thunder_lord':      { id: 'lightning_tempest',       tier: 3, displayName: '번개대폭풍',     color: 0xe4c613 },
  'inferno_dragon+quake':         { id: 'hellquake',               tier: 3, displayName: '지옥균열',       color: 0xc0392b },

  // ══════════════════════════════════════════════════════════════════
  // T3 merges: T2+T1 combos (18)
  // ══════════════════════════════════════════════════════════════════
  'ancient_dragon+dragon':        { id: 'primal_dragon_lord',      tier: 3, displayName: '원시용왕',       color: 0x8e1a1a },
  'flame+inferno_dragon':         { id: 'molten_hell',             tier: 3, displayName: '용화지옥',       color: 0xff4500 },
  'rock+stone_dragon':            { id: 'iron_dragon',             tier: 3, displayName: '철갑룡',         color: 0x7f8c8d },
  'frost_dragon+ice':             { id: 'eternal_blizzard',        tier: 3, displayName: '영구동설',       color: 0x4fc3f7 },
  'lightning+thunder_dragon':     { id: 'storm_deity',             tier: 3, displayName: '뇌신',           color: 0xf9ca24 },
  'poison+venom_dragon':          { id: 'great_poison_king',       tier: 3, displayName: '독제왕',         color: 0x6ab04c },
  'storm_dragon+wind':            { id: 'wind_dragon_king',        tier: 3, displayName: '풍신룡왕',       color: 0x7ec8e3 },
  'holy_dragon+light':            { id: 'divine_sun_ray',          tier: 3, displayName: '태양성룡포',     color: 0xffe082 },
  'dragon_mage+mage':             { id: 'arcane_dragon_sage',      tier: 3, displayName: '용마도사',       color: 0x9b59b6 },
  'archer+dragon_rider':          { id: 'sky_lancer',              tier: 3, displayName: '천룡창기',       color: 0x27ae60 },
  'plague+poison':                { id: 'death_miasma',            tier: 3, displayName: '사령역병',       color: 0x4a752c },
  'lightning+thunder_lord':       { id: 'thunderstorm_king',       tier: 3, displayName: '천뢰지배자',     color: 0xf1c40f },
  'light+solar_burst':            { id: 'solar_cannon',            tier: 3, displayName: '태양포',         color: 0xffab00 },
  'typhoon+wind':                 { id: 'great_typhoon',           tier: 3, displayName: '거대태풍신',     color: 0x00bcd4 },
  'quake+rock':                   { id: 'earth_shatterer',         tier: 3, displayName: '대지파괴자',     color: 0x5d4037 },
  'ice+zero_field':               { id: 'permafrost',              tier: 3, displayName: '만년설원',       color: 0x81d4fa },
  'holy_thunder+light':           { id: 'sacred_judgement_beam',   tier: 3, displayName: '신성심판광',     color: 0xfff176 },
  'mage+overload_mage':           { id: 'arcane_cannon',           tier: 3, displayName: '마법대포',       color: 0x7e57c2 },

  // ══════════════════════════════════════════════════════════════════
  // T4 merges (12): T3+T1, T3+T2, T3+T3 combos
  // ══════════════════════════════════════════════════════════════════
  'absolute_frost_domain+ice':              { id: 'glacial_epoch',         tier: 4, displayName: '빙하 시대',       color: 0x2196f3 },
  'archer+cosmos_dragon':                   { id: 'void_sniper',           tier: 4, displayName: '허공 저격자',     color: 0xe040fb },
  'celestial_judgment+cosmos_dragon':       { id: 'genesis_verdict',       tier: 4, displayName: '창세 심판',       color: 0xffab00 },
  'celestial_judgment+light':               { id: 'radiant_ruin',          tier: 4, displayName: '성광 붕괴',       color: 0xffd740 },
  'earth_shatterer+tectonic_dragon':        { id: 'world_breaker',         tier: 4, displayName: '세계 파괴자',     color: 0x4e342e },
  'flame+hellquake':                        { id: 'magma_core',            tier: 4, displayName: '마그마 핵',       color: 0xdd2c00 },
  'grand_pyromancer+solar_burst':           { id: 'solar_cremation',       tier: 4, displayName: '태양 소각로',     color: 0xff6d00 },
  'lightning_tempest+typhoon':              { id: 'maelstrom_herald',      tier: 4, displayName: '회오리 전령',     color: 0x00bfa5 },
  'plague_wyrm+venom_sovereign':            { id: 'pandemic_sovereign',    tier: 4, displayName: '역병 군주',       color: 0x558b2f },
  'poison+venom_sovereign':                 { id: 'apex_toxin',            tier: 4, displayName: '독점 지배자',     color: 0x76ff03 },
  'primal_dragon_lord+wind':                { id: 'annihilation_gale',     tier: 4, displayName: '소멸 폭풍신',     color: 0x7c4dff },
  'thunder_lord+thunder_wyrm_king':         { id: 'storm_dominion',        tier: 4, displayName: '폭풍 지배신',     color: 0xfbc02d },

  // ══════════════════════════════════════════════════════════════════
  // T5 merges (5): T4+T4 combos
  // ══════════════════════════════════════════════════════════════════
  'annihilation_gale+maelstrom_herald':     { id: 'void_maelstrom',        tier: 5, displayName: '공허 소용돌이',   color: 0x6200ea },
  'genesis_verdict+void_sniper':            { id: 'omega_herald',          tier: 5, displayName: '오메가 전령',     color: 0xd500f9 },
  'glacial_epoch+storm_dominion':           { id: 'absolute_dominion',     tier: 5, displayName: '절대 지배',       color: 0x304ffe },
  'magma_core+solar_cremation':             { id: 'star_forge',            tier: 5, displayName: '항성 용광로',     color: 0xff3d00 },
  'pandemic_sovereign+world_breaker':       { id: 'extinction_engine',     tier: 5, displayName: '소멸 기관',       color: 0x1b5e20 },
};

/**
 * 합성 타워 스탯. 합성 결과 ID를 키로 사용.
 * 총 102개 스탯 블록: T2 55개 + T3 30개 + T4 12개 + T5 5개.
 * @type {Object<string, object>}
 */
export const MERGED_TOWER_STATS = {
  // ══════════════════════════════════════════════════════════════════
  // Same-type merges (10)
  // ══════════════════════════════════════════════════════════════════
  rapid_archer: {
    damage: 12, fireRate: 0.4, range: 130,
    attackType: 'single',
    projectileSpeed: 350,
  },
  overload_mage: {
    damage: 60, fireRate: 3.5, range: 110,
    attackType: 'splash',
    splashRadius: 70,
    projectileSpeed: 200,
  },
  zero_field: {
    damage: 4, fireRate: 1.0, range: 130,
    attackType: 'aoe_instant',
    splashRadius: 90,
    slowAmount: 0.5, slowDuration: 3.0,
  },
  thunder_lord: {
    damage: 30, fireRate: 1.0, range: 130,
    attackType: 'chain',
    chainCount: 8, chainDecay: 0.85, chainRadius: 100,
  },
  inferno: {
    damage: 22, fireRate: 1.2, range: 110,
    attackType: 'aoe_instant',
    splashRadius: 65,
    burnDamage: 14, burnDuration: 4,
  },
  quake: {
    damage: 80, fireRate: 3.5, range: 90,
    attackType: 'splash',
    splashRadius: 50,
    slowAmount: 1.0, slowDuration: 0.5,
    projectileSpeed: 150,
  },
  plague: {
    damage: 4, fireRate: 1.8, range: 140,
    attackType: 'aoe_instant',
    splashRadius: 80,
    poisonDamage: 8, poisonDuration: 6,
    armorReduction: 0.2, armorReductionDuration: 6,
  },
  typhoon: {
    damage: 8, fireRate: 2.0, range: 130,
    attackType: 'aoe_instant',
    splashRadius: 70,
    pushbackDistance: 120, pushbackTargets: 6,
  },
  solar_burst: {
    damage: 70, fireRate: 2.2, range: 130,
    attackType: 'aoe_instant',
    splashRadius: 110,
  },
  ancient_dragon: {
    damage: 90, fireRate: 2.5, range: 180,
    attackType: 'splash',
    splashRadius: 100,
    burnDamage: 12, burnDuration: 4, poisonDamage: 10, poisonDuration: 6,
    projectileSpeed: 200,
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: archer combos (8)
  // ══════════════════════════════════════════════════════════════════
  arcane_archer: {
    damage: 18, fireRate: 1.0, range: 130,
    attackType: 'splash',
    splashRadius: 45,
    projectileSpeed: 280,
  },
  cryo_sniper: {
    damage: 15, fireRate: 1.2, range: 150,
    attackType: 'single',
    slowAmount: 1.0, slowDuration: 1.5,
    projectileSpeed: 300,
  },
  shock_arrow: {
    damage: 14, fireRate: 0.9, range: 130,
    attackType: 'chain',
    chainCount: 3, chainDecay: 0.8, chainRadius: 70,
  },
  fire_arrow: {
    damage: 12, fireRate: 0.9, range: 120,
    attackType: 'dot_single',
    burnDamage: 6, burnDuration: 4,
    projectileSpeed: 300,
  },
  armor_pierce: {
    damage: 40, fireRate: 1.4, range: 130,
    attackType: 'single',
    armorPiercing: true,
    projectileSpeed: 300,
  },
  venom_shot: {
    damage: 8, fireRate: 1.0, range: 130,
    attackType: 'dot_single',
    poisonDamage: 5, poisonDuration: 5,
    armorReduction: 0.2, armorReductionDuration: 5,
    projectileSpeed: 300,
  },
  gale_arrow: {
    damage: 10, fireRate: 1.0, range: 130,
    attackType: 'single',
    projectileSpeed: 400,
    pushbackDistance: 100,
  },
  holy_arrow: {
    damage: 22, fireRate: 1.4, range: 600,
    attackType: 'piercing_beam',
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: mage combos (7)
  // ══════════════════════════════════════════════════════════════════
  frost_mage: {
    damage: 28, fireRate: 2.0, range: 110,
    attackType: 'splash',
    splashRadius: 55,
    slowAmount: 0.35, slowDuration: 2.0,
    projectileSpeed: 200,
  },
  storm_mage: {
    damage: 35, fireRate: 1.8, range: 115,
    attackType: 'splash',
    splashRadius: 50,
    chainCount: 3, chainRadius: 60,
    projectileSpeed: 200,
  },
  pyromancer: {
    damage: 45, fireRate: 1.8, range: 110,
    attackType: 'splash',
    splashRadius: 55,
    burnDamage: 6, burnDuration: 3,
    projectileSpeed: 200,
  },
  gravity_mage: {
    damage: 40, fireRate: 2.5, range: 100,
    attackType: 'splash',
    splashRadius: 50,
    slowAmount: 1.0, slowDuration: 0.4,
    projectileSpeed: 200,
  },
  toxic_mage: {
    damage: 20, fireRate: 2.0, range: 120,
    attackType: 'aoe_instant',
    splashRadius: 65,
    poisonDamage: 5, poisonDuration: 5,
    armorReduction: 0.2, armorReductionDuration: 5,
  },
  vacuum_mage: {
    damage: 25, fireRate: 2.2, range: 110,
    attackType: 'splash',
    splashRadius: 55,
    pushbackDistance: 60,
    projectileSpeed: 200,
  },
  radiant_mage: {
    damage: 32, fireRate: 2.0, range: 115,
    attackType: 'splash',
    splashRadius: 60,
    burnDamage: 4, burnDuration: 2,
    projectileSpeed: 200,
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: ice combos (6)
  // ══════════════════════════════════════════════════════════════════
  thunder_frost: {
    damage: 12, fireRate: 1.4, range: 115,
    attackType: 'chain',
    chainCount: 4, chainDecay: 0.7, chainRadius: 70,
    slowAmount: 0.6, slowDuration: 1.5,
  },
  cryo_flame: {
    damage: 10, fireRate: 1.4, range: 110,
    attackType: 'dot_single',
    burnDamage: 5, burnDuration: 3,
    slowAmount: 0.3, slowDuration: 2.0,
    projectileSpeed: 220,
  },
  glacier: {
    damage: 35, fireRate: 2.8, range: 95,
    attackType: 'splash',
    splashRadius: 45,
    slowAmount: 1.0, slowDuration: 0.6,
    projectileSpeed: 180,
  },
  frost_venom: {
    damage: 6, fireRate: 1.8, range: 125,
    attackType: 'aoe_instant',
    splashRadius: 65,
    slowAmount: 0.4, slowDuration: 2.5,
    poisonDamage: 4, poisonDuration: 4,
  },
  blizzard: {
    damage: 5, fireRate: 2.0, range: 120,
    attackType: 'aoe_instant',
    splashRadius: 70,
    slowAmount: 0.45, slowDuration: 2.5,
    pushbackDistance: 50,
  },
  holy_ice: {
    damage: 16, fireRate: 1.6, range: 600,
    attackType: 'piercing_beam',
    slowAmount: 0.35, slowDuration: 2.0,
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: lightning combos (5)
  // ══════════════════════════════════════════════════════════════════
  thunder_fire: {
    damage: 22, fireRate: 1.2, range: 125,
    attackType: 'chain',
    chainCount: 5, chainDecay: 0.7, chainRadius: 80,
    burnDamage: 5, burnDuration: 3,
  },
  thunder_strike: {
    damage: 28, fireRate: 1.3, range: 125,
    attackType: 'chain',
    chainCount: 4, chainDecay: 0.7, chainRadius: 75,
    armorPiercing: true,
  },
  toxic_shock: {
    damage: 18, fireRate: 1.2, range: 120,
    attackType: 'chain',
    chainCount: 4, chainDecay: 0.7, chainRadius: 75,
    poisonDamage: 3, poisonDuration: 4, armorReduction: 0.15, armorReductionDuration: 4,
  },
  storm_bolt: {
    damage: 16, fireRate: 1.3, range: 130,
    attackType: 'chain',
    chainCount: 4, chainDecay: 0.7, chainRadius: 80,
    pushbackDistance: 70,
  },
  holy_thunder: {
    damage: 25, fireRate: 1.5, range: 130,
    attackType: 'chain',
    chainCount: 5, chainDecay: 0.7, chainRadius: 85,
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: flame combos (4)
  // ══════════════════════════════════════════════════════════════════
  magma_shot: {
    damage: 38, fireRate: 2.8, range: 95,
    attackType: 'splash',
    splashRadius: 40,
    burnDamage: 7, burnDuration: 3,
    projectileSpeed: 150,
  },
  venom_fire: {
    damage: 7, fireRate: 1.6, range: 110,
    attackType: 'dot_single',
    burnDamage: 7, burnDuration: 4,
    poisonDamage: 4, poisonDuration: 4,
    projectileSpeed: 200,
  },
  fire_storm: {
    damage: 7, fireRate: 1.8, range: 115,
    attackType: 'aoe_instant',
    splashRadius: 55,
    burnDamage: 6, burnDuration: 3,
    pushbackDistance: 45,
  },
  solar_flame: {
    damage: 20, fireRate: 1.6, range: 600,
    attackType: 'piercing_beam',
    burnDamage: 6, burnDuration: 3,
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: rock combos (3)
  // ══════════════════════════════════════════════════════════════════
  toxic_boulder: {
    damage: 25, fireRate: 2.5, range: 105,
    attackType: 'aoe_instant',
    splashRadius: 55,
    poisonDamage: 5, poisonDuration: 5,
    armorPiercing: true,
  },
  stone_gale: {
    damage: 45, fireRate: 3.0, range: 90,
    attackType: 'splash',
    splashRadius: 45,
    slowAmount: 1.0, slowDuration: 0.4,
    pushbackDistance: 60,
    projectileSpeed: 150,
  },
  holy_stone: {
    damage: 30, fireRate: 2.0, range: 600,
    attackType: 'piercing_beam',
    armorPiercing: true,
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: poison combos (2)
  // ══════════════════════════════════════════════════════════════════
  toxic_gale: {
    damage: 4, fireRate: 2.0, range: 130,
    attackType: 'aoe_instant',
    splashRadius: 75,
    poisonDamage: 4, poisonDuration: 5,
    armorReduction: 0.2, armorReductionDuration: 5,
    pushbackDistance: 40,
  },
  purge_venom: {
    damage: 16, fireRate: 1.8, range: 600,
    attackType: 'piercing_beam',
    poisonDamage: 4, poisonDuration: 4,
    armorReduction: 0.2, armorReductionDuration: 4,
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: wind combos (1)
  // ══════════════════════════════════════════════════════════════════
  radiant_gale: {
    damage: 18, fireRate: 1.8, range: 600,
    attackType: 'piercing_beam',
    pushbackDistance: 60,
  },

  // ══════════════════════════════════════════════════════════════════
  // Cross-type merges: dragon combos (9)
  // ══════════════════════════════════════════════════════════════════
  dragon_rider: {
    damage: 45, fireRate: 2.0, range: 165,
    attackType: 'splash',
    splashRadius: 75,
    burnDamage: 6, burnDuration: 3,
    projectileSpeed: 250,
  },
  dragon_mage: {
    damage: 55, fireRate: 2.5, range: 155,
    attackType: 'splash',
    splashRadius: 85,
    burnDamage: 8, burnDuration: 3,
    projectileSpeed: 200,
  },
  frost_dragon: {
    damage: 30, fireRate: 2.5, range: 160,
    attackType: 'aoe_instant',
    splashRadius: 85,
    slowAmount: 0.5, slowDuration: 2.5,
  },
  thunder_dragon: {
    damage: 40, fireRate: 2.0, range: 155,
    attackType: 'chain',
    chainCount: 5, chainDecay: 0.7, chainRadius: 90,
    burnDamage: 6, burnDuration: 3,
  },
  inferno_dragon: {
    damage: 52, fireRate: 2.5, range: 165,
    attackType: 'splash',
    splashRadius: 90,
    burnDamage: 14, burnDuration: 5,
    projectileSpeed: 200,
  },
  stone_dragon: {
    damage: 70, fireRate: 2.8, range: 155,
    attackType: 'splash',
    splashRadius: 80,
    armorPiercing: true,
    projectileSpeed: 200,
  },
  venom_dragon: {
    damage: 35, fireRate: 2.5, range: 165,
    attackType: 'aoe_instant',
    splashRadius: 90,
    poisonDamage: 12, poisonDuration: 6,
    maxPoisonStacks: 3,
  },
  storm_dragon: {
    damage: 48, fireRate: 2.5, range: 165,
    attackType: 'splash',
    splashRadius: 85,
    burnDamage: 8, burnDuration: 3,
    pushbackDistance: 60,
    projectileSpeed: 200,
  },
  holy_dragon: {
    damage: 60, fireRate: 2.2, range: 600,
    attackType: 'piercing_beam',
    burnDamage: 8, burnDuration: 3,
  },

  // ══════════════════════════════════════════════════════════════════
  // T3 merges: T2+T2 combos (12)
  // ══════════════════════════════════════════════════════════════════
  thunder_wyrm_king: {
    damage: 65, fireRate: 1.5, range: 190,
    attackType: 'chain',
    chainCount: 10, chainDecay: 0.85, chainRadius: 120,
    burnDamage: 20, burnDuration: 5, poisonDamage: 15, poisonDuration: 7,
  },
  plague_wyrm: {
    damage: 45, fireRate: 2.0, range: 200,
    attackType: 'aoe_instant',
    splashRadius: 130,
    burnDamage: 12, burnDuration: 4,
    poisonDamage: 20, poisonDuration: 8, armorReduction: 0.35, armorReductionDuration: 8,
  },
  cosmos_dragon: {
    damage: 100, fireRate: 2.5, range: 210,
    attackType: 'aoe_instant',
    splashRadius: 150,
    burnDamage: 15, burnDuration: 5, poisonDamage: 12, poisonDuration: 6,
  },
  tectonic_dragon: {
    damage: 130, fireRate: 3.5, range: 160,
    attackType: 'splash',
    splashRadius: 90,
    slowAmount: 1.0, slowDuration: 0.8, armorPiercing: true,
    projectileSpeed: 150,
  },
  adamantine_lightning: {
    damage: 60, fireRate: 1.5, range: 165,
    attackType: 'chain',
    chainCount: 7, chainDecay: 0.85, chainRadius: 100,
    armorPiercing: true,
  },
  venom_sovereign: {
    damage: 50, fireRate: 2.0, range: 195,
    attackType: 'aoe_instant',
    splashRadius: 120,
    poisonDamage: 25, poisonDuration: 9, maxPoisonStacks: 4,
    armorReduction: 0.5, armorReductionDuration: 9,
  },
  absolute_frost_domain: {
    damage: 18, fireRate: 1.5, range: 190,
    attackType: 'aoe_instant',
    splashRadius: 140,
    slowAmount: 0.75, slowDuration: 4.5,
  },
  celestial_judgment: {
    damage: 100, fireRate: 1.8, range: 600,
    attackType: 'piercing_beam',
    burnDamage: 15, burnDuration: 4,
  },
  superconductor_mage: {
    damage: 70, fireRate: 1.8, range: 175,
    attackType: 'chain',
    chainCount: 7, chainDecay: 0.8, chainRadius: 110,
    burnDamage: 10, burnDuration: 4,
  },
  grand_pyromancer: {
    damage: 30, fireRate: 1.5, range: 145,
    attackType: 'aoe_instant',
    splashRadius: 100,
    burnDamage: 28, burnDuration: 6,
  },
  lightning_tempest: {
    damage: 55, fireRate: 1.2, range: 165,
    attackType: 'chain',
    chainCount: 12, chainDecay: 0.9, chainRadius: 130,
  },
  hellquake: {
    damage: 115, fireRate: 3.0, range: 170,
    attackType: 'splash',
    splashRadius: 100,
    slowAmount: 1.0, slowDuration: 0.5, burnDamage: 18, burnDuration: 5,
    armorReduction: 0.15, armorReductionDuration: 5,
    projectileSpeed: 150,
  },

  // ══════════════════════════════════════════════════════════════════
  // T3 merges: T2+T1 combos (18)
  // ══════════════════════════════════════════════════════════════════
  primal_dragon_lord: {
    damage: 140, fireRate: 2.5, range: 200,
    attackType: 'splash',
    splashRadius: 120,
    burnDamage: 18, burnDuration: 6, poisonDamage: 15, poisonDuration: 7,
    projectileSpeed: 200,
  },
  molten_hell: {
    damage: 14, fireRate: 1.8, range: 155,
    attackType: 'aoe_instant',
    splashRadius: 110,
    burnDamage: 28, burnDuration: 7,
  },
  iron_dragon: {
    damage: 115, fireRate: 2.8, range: 170,
    attackType: 'splash',
    splashRadius: 100,
    armorPiercing: true,
    projectileSpeed: 200,
  },
  eternal_blizzard: {
    damage: 30, fireRate: 2.0, range: 185,
    attackType: 'aoe_instant',
    splashRadius: 130,
    slowAmount: 0.85, slowDuration: 4.0,
  },
  storm_deity: {
    damage: 75, fireRate: 1.8, range: 180,
    attackType: 'chain',
    chainCount: 8, chainDecay: 0.85, chainRadius: 120,
    burnDamage: 10, burnDuration: 4,
  },
  great_poison_king: {
    damage: 40, fireRate: 2.0, range: 190,
    attackType: 'aoe_instant',
    splashRadius: 130,
    poisonDamage: 22, poisonDuration: 8, maxPoisonStacks: 3,
    armorReduction: 0.5, armorReductionDuration: 8,
  },
  wind_dragon_king: {
    damage: 80, fireRate: 2.0, range: 190,
    attackType: 'splash',
    splashRadius: 115,
    burnDamage: 12, burnDuration: 4, pushbackDistance: 100,
    projectileSpeed: 250,
  },
  divine_sun_ray: {
    damage: 70, fireRate: 2.0, range: 600,
    attackType: 'piercing_beam',
    burnDamage: 14, burnDuration: 5,
  },
  arcane_dragon_sage: {
    damage: 95, fireRate: 2.5, range: 175,
    attackType: 'splash',
    splashRadius: 110,
    burnDamage: 14, burnDuration: 5,
    projectileSpeed: 200,
  },
  sky_lancer: {
    damage: 75, fireRate: 1.8, range: 190,
    attackType: 'splash',
    splashRadius: 100,
    burnDamage: 10, burnDuration: 4,
    projectileSpeed: 300,
  },
  death_miasma: {
    damage: 10, fireRate: 1.8, range: 170,
    attackType: 'aoe_instant',
    splashRadius: 120,
    poisonDamage: 16, poisonDuration: 8, armorReduction: 0.55, armorReductionDuration: 8,
  },
  thunderstorm_king: {
    damage: 50, fireRate: 1.0, range: 175,
    attackType: 'chain',
    chainCount: 12, chainDecay: 0.9, chainRadius: 140,
  },
  solar_cannon: {
    damage: 95, fireRate: 2.5, range: 170,
    attackType: 'aoe_instant',
    splashRadius: 140,
  },
  great_typhoon: {
    damage: 15, fireRate: 1.8, range: 180,
    attackType: 'aoe_instant',
    splashRadius: 110,
    pushbackDistance: 180, pushbackTargets: 10,
  },
  earth_shatterer: {
    damage: 145, fireRate: 3.2, range: 110,
    attackType: 'splash',
    splashRadius: 70,
    slowAmount: 1.0, slowDuration: 0.8,
    projectileSpeed: 150,
  },
  permafrost: {
    damage: 8, fireRate: 1.2, range: 175,
    attackType: 'aoe_instant',
    splashRadius: 130,
    slowAmount: 0.8, slowDuration: 4.0,
  },
  sacred_judgement_beam: {
    damage: 55, fireRate: 1.5, range: 160,
    attackType: 'chain',
    chainCount: 8, chainDecay: 0.85, chainRadius: 120,
  },
  arcane_cannon: {
    damage: 110, fireRate: 3.2, range: 135,
    attackType: 'splash',
    splashRadius: 100,
    projectileSpeed: 200,
  },

  // ══════════════════════════════════════════════════════════════════
  // T4 merges (12)
  // ══════════════════════════════════════════════════════════════════
  void_sniper: {
    damage: 220, fireRate: 1.0, range: 230,
    attackType: 'chain',
    chainCount: 12, chainDecay: 0.9, chainRadius: 140,
    burnDamage: 20, burnDuration: 6,
    poisonDamage: 15, poisonDuration: 8,
    projectileSpeed: 400,
  },
  annihilation_gale: {
    damage: 120, fireRate: 1.5, range: 240,
    attackType: 'aoe_instant',
    splashRadius: 180,
    burnDamage: 20, burnDuration: 7,
    pushbackDistance: 140, pushbackTargets: 12,
  },
  magma_core: {
    damage: 180, fireRate: 2.5, range: 200,
    attackType: 'aoe_instant',
    splashRadius: 130,
    burnDamage: 50, burnDuration: 8,
    armorReduction: 0.3, armorReductionDuration: 8,
  },
  glacial_epoch: {
    damage: 60, fireRate: 1.2, range: 230,
    attackType: 'aoe_instant',
    splashRadius: 180,
    slowAmount: 0.95, slowDuration: 6.0,
  },
  apex_toxin: {
    damage: 60, fireRate: 1.8, range: 240,
    attackType: 'aoe_instant',
    splashRadius: 160,
    poisonDamage: 40, poisonDuration: 12,
    maxPoisonStacks: 5,
    armorReduction: 0.8, armorReductionDuration: 12,
  },
  radiant_ruin: {
    damage: 160, fireRate: 1.8, range: 600,
    attackType: 'piercing_beam',
    burnDamage: 20, burnDuration: 6,
  },
  storm_dominion: {
    damage: 160, fireRate: 1.0, range: 220,
    attackType: 'chain',
    chainCount: 16, chainDecay: 0.9, chainRadius: 160,
    burnDamage: 35, burnDuration: 6,
    armorPiercing: true,
  },
  maelstrom_herald: {
    damage: 80, fireRate: 1.5, range: 220,
    attackType: 'aoe_instant',
    splashRadius: 140,
    pushbackDistance: 220, pushbackTargets: 14,
  },
  solar_cremation: {
    damage: 60, fireRate: 1.2, range: 200,
    attackType: 'aoe_instant',
    splashRadius: 180,
    burnDamage: 45, burnDuration: 8,
  },
  world_breaker: {
    damage: 160, fireRate: 3.0, range: 200,
    attackType: 'splash',
    splashRadius: 110,
    slowAmount: 1.0, slowDuration: 1.0,
    projectileSpeed: 150,
  },
  genesis_verdict: {
    damage: 200, fireRate: 2.0, range: 600,
    attackType: 'piercing_beam',
    burnDamage: 25, burnDuration: 7,
    poisonDamage: 20, poisonDuration: 8,
  },
  pandemic_sovereign: {
    damage: 60, fireRate: 1.8, range: 250,
    attackType: 'aoe_instant',
    splashRadius: 180,
    poisonDamage: 20, poisonDuration: 12,
    maxPoisonStacks: 6,
    armorReduction: 0.45, armorReductionDuration: 12,
    burnDamage: 20, burnDuration: 6,
  },

  // ══════════════════════════════════════════════════════════════════
  // T5 merges (5)
  // ══════════════════════════════════════════════════════════════════
  // ── T5 스탯 (밸런스 오버홀: DoT 대폭 너프, 체인/AoE 소폭 조정) ──
  omega_herald: {
    damage: 350, fireRate: 0.8, range: 600,
    attackType: 'chain',
    chainCount: 16, chainDecay: 0.92, chainRadius: 200,   // chainCount 20→16
    burnDamage: 25, burnDuration: 7,                       // 40→25, 10→7
    poisonDamage: 18, poisonDuration: 8,                   // 30→18, 12→8
    armorPiercing: true,
  },
  extinction_engine: {
    damage: 120, fireRate: 1.5, range: 280,
    attackType: 'aoe_instant',
    splashRadius: 220,
    poisonDamage: 18, poisonDuration: 8,                   // 30→18, 12→8
    maxPoisonStacks: 8,
    armorReduction: 0.4, armorReductionDuration: 12,
    burnDamage: 20, burnDuration: 6,                       // 35→20, 9→6
  },
  absolute_dominion: {
    damage: 250, fireRate: 0.8, range: 260,
    attackType: 'chain',
    chainCount: 14, chainDecay: 0.88, chainRadius: 180,   // chainCount 18→14, decay 0.92→0.88
    slowAmount: 0.9, slowDuration: 5.0,
    pushbackDistance: 180, pushbackTargets: 15,
  },
  star_forge: {
    damage: 120, fireRate: 0.8, range: 260,
    attackType: 'aoe_instant',
    splashRadius: 220,
    burnDamage: 50, burnDuration: 8,                       // 120→50, 12→8 (총 화상피해 1440→400)
    armorReduction: 0.3, armorReductionDuration: 12,
  },
  void_maelstrom: {
    damage: 150, fireRate: 1.2, range: 600,
    attackType: 'piercing_beam',
    burnDamage: 30, burnDuration: 7,                       // 50→30, 10→7
    poisonDamage: 25, poisonDuration: 8,                   // 40→25, 12→8
    pushbackDistance: 300,
    armorPiercing: true,
  },
};

/**
 * 두 타워 유형/합성 ID로 정규화된 합성 키를 생성한다.
 * 알파벳순으로 정렬 후 '+'로 결합한다.
 * @param {string} typeA - 타워 유형 또는 합성 ID
 * @param {string} typeB - 타워 유형 또는 합성 ID
 * @returns {string} 정렬된 합성 키 (예: 'archer+mage')
 */
export function getMergeKey(typeA, typeB) {
  return [typeA, typeB].sort().join('+');
}

/**
 * 두 타워 유형/합성 ID의 합성 레시피 결과를 조회한다.
 * @param {string} typeA - 타워 유형 또는 합성 ID
 * @param {string} typeB - 타워 유형 또는 합성 ID
 * @returns {object|null} 합성 결과 객체 또는 레시피 미존재 시 null
 */
export function getMergeResult(typeA, typeB) {
  const key = getMergeKey(typeA, typeB);
  return MERGE_RECIPES[key] || null;
}

/**
 * 타워가 합성 가능한지 확인한다 (강화 레벨이 0이어야 합성 가능).
 * @param {{ enhanceLevel: number }} tower - 타워 인스턴스
 * @returns {boolean} 합성 가능 여부
 */
export function isMergeable(tower) {
  return tower.enhanceLevel === 0;
}

/**
 * 특정 타워 유형 또는 합성 ID가 다른 레시피의 재료로 사용되는지 확인한다.
 * @param {string} id - 타워 유형 또는 합성 ID
 * @returns {boolean} 재료로 사용되는지 여부
 */
export function isUsedAsMergeIngredient(id) {
  for (const key of Object.keys(MERGE_RECIPES)) {
    const parts = key.split('+');
    if (parts.includes(id)) return true;
  }
  return false;
}

// ── 적 기본 스탯 ────────────────────────────────────────────────
/**
 * 적 유형별 기본 스탯.
 * hp: 체력, speed: 이동 속도, gold: 처치 보상, damage: 기지 피해,
 * color: 표시 색상, radius/size: 크기, shape: 도형, immunities: 면역 목록
 */
export const ENEMY_STATS = {
  normal: {
    hp: 39,
    speed: 60,
    gold: 10,
    damage: 1,
    color: 0xd63031,
    radius: 10,
    shape: 'circle',
    spriteBase: 'goblin',
  },
  fast: {
    hp: 26,
    speed: 120,
    gold: 6,
    damage: 1,
    color: 0xfdcb6e,
    radius: 8,
    size: 16,
    shape: 'triangle',
    spriteBase: 'warg',
  },
  tank: {
    hp: 157,
    speed: 35,
    gold: 30,
    damage: 3,
    color: 0xe17055,
    size: 18,
    shape: 'square',
    spriteBase: 'ogre',
  },
  boss: {
    hp: 656,
    speed: 30,
    gold: 200,
    damage: 10,
    color: 0xa29bfe,
    radius: 18,
    shape: 'boss_circle',
    immunities: ['pushback'],
    spriteBase: 'demon_lord',
  },
  swarm: {
    hp: 20,
    speed: 90,
    gold: 4,
    damage: 1,
    color: 0x55efc4,
    radius: 6,
    shape: 'circle',
    spriteBase: 'mini_slime',
  },
  splitter: {
    hp: 105,
    speed: 50,
    gold: 24,
    damage: 2,
    color: 0xfd79a8,
    radius: 13,
    shape: 'circle',
    splitCount: 3,
    spriteBase: 'slime',
  },
  armored: {
    hp: 131,
    speed: 45,
    gold: 40,
    damage: 2,
    resistance: 0.5,
    color: 0x2d3436,
    size: 20,
    shape: 'square',
    spriteBase: 'dark_knight',
  },
  boss_armored: {
    hp: 1967,
    speed: 25,
    gold: 300,
    damage: 15,
    resistance: 0.3,
    color: 0x2d3436,
    radius: 20,
    shape: 'boss_armored',
    immunities: ['pushback'],
    spriteBase: 'golem',
  },
};

// ── 적 스프라이트 키 생성 ────────────────────────────────────────
/**
 * 적 타입과 월드 ID를 조합하여 스프라이트 텍스처 키를 반환한다.
 * @param {string} enemyType - 적 타입 (normal, fast, tank 등)
 * @param {string} worldId - 월드 ID (forest, desert, tundra, volcano, shadow)
 * @returns {string|null} 스프라이트 키 (예: 'forest_goblin') 또는 null
 */
export function getEnemySpriteKey(enemyType, worldId) {
  const base = ENEMY_STATS[enemyType]?.spriteBase;
  if (!base || !worldId) return null;
  return `${worldId}_${base}`;
}

// ── 웨이브 정의 (R1~R20) ────────────────────────────────────────
/**
 * 라운드 1~20의 미리 정의된 웨이브 구성.
 * 각 항목: { enemies: [{type, count}], spawnInterval: 초 }
 * 적은 나열 순서대로 스폰된다.
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

// ── 스케일링 상수 (R21 이후) ─────────────────────────────────────
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

// ── 구간별 HP 스케일링 ──────────────────────────────────────────
/**
 * 라운드별 HP 스케일 값을 구간별 차등으로 계산한다.
 * 밸런스 오버홀: 후반 구간 증가율 대폭 강화 (T5 도배 방지)
 * R1~R20: 0.15/R (유지), R21~R35: 0.20/R, R36~R50: 0.30/R, R51+: 0.45/R
 * @param {number} round - 라운드 번호
 * @returns {number} HP 스케일 배율
 */
export function calcHpScale(round) {
  if (round <= 20) return 1 + (round - 1) * 0.15;         // R1~R20: 유지
  const baseR20 = 1 + 19 * 0.15;                          // = 3.85
  if (round <= 35) return baseR20 + (round - 20) * 0.20;  // R21~R35: 0.10→0.20
  const baseR35 = baseR20 + 15 * 0.20;                    // = 6.85
  if (round <= 50) return baseR35 + (round - 35) * 0.30;  // R36~R50: 0.13→0.30
  const baseR50 = baseR35 + 15 * 0.30;                    // = 11.35
  return baseR50 + (round - 50) * 0.45;                   // R51+: 0.15→0.45
}

/**
 * 라운드별 보스 HP 배율을 반환한다.
 * 밸런스 오버홀: 전 구간 대폭 상향 (보스가 단순 DPS 체크 역할 강화)
 * @param {number} round - 라운드 번호
 * @returns {number} 보스 HP 배율
 */
export function getBossHpMultiplier(round) {
  if (round <= 30) return 3.0;   // 2.0→3.0
  if (round <= 40) return 4.0;   // 2.2→4.0
  return 5.0;                     // 2.5→5.0
}

// ── 웨이브 흐름 ─────────────────────────────────────────────────
/** @const {number} 웨이브 시작 텍스트 표시 시간 (ms) */
export const WAVE_ANNOUNCE_DURATION = 1500;

/** @const {number} 웨이브 클리어 텍스트 표시 시간 (ms) */
export const WAVE_CLEAR_DURATION = 1500;

/** @const {number} 웨이브 간 대기 시간 (초) */
export const WAVE_BREAK_DURATION = 3.0;

// ── 보너스 골드 공식 ────────────────────────────────────────────
/**
 * 웨이브 클리어 보너스 골드를 계산한다.
 * 밸런스 오버홀: 라운드 계수 5→3, HP 보너스 최대 15→8 (경제 너프)
 * 공식: round * 3 + floor(currentHP / maxHP * 8)
 * @param {number} round - 현재 라운드 번호
 * @param {number} currentHP - 현재 기지 체력
 * @param {number} maxHP - 최대 기지 체력
 * @returns {number} 보너스 골드량
 */
export function calcWaveClearBonus(round, currentHP, maxHP) {
  return round * 3 + Math.floor(currentHP / maxHP * 8);
}

// ── 시각 효과 상수 ──────────────────────────────────────────────
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

// ── 투사체 크기 ─────────────────────────────────────────────────
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

// ── 타워 도형 크기 ──────────────────────────────────────────────
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

// ── localStorage 키 ─────────────────────────────────────────────
/** @const {string} 게임 세이브 데이터 localStorage 키 */
export const SAVE_KEY = 'fantasy-td-save';

/** @const {string} 사운드 설정 localStorage 키 */
export const SOUND_SAVE_KEY = 'fantasy-td-sound';

/** @const {string} 광고 일일 제한 카운터 localStorage 키 */
export const AD_DAILY_LIMIT_KEY = 'ftd_ad_daily_limit';

/** @const {string} 언어 설정 localStorage 키 */
export const LANG_SAVE_KEY = 'fantasy-td-lang';

// ── AdMob 광고 단위 ID ──────────────────────────────────────────
/** @const {string} 전면 광고 단위 ID (테스트용) */
export const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-9149509805250873/9251091751';
/** @const {string} 보상형 광고 - Diamond 지급 단위 ID (테스트용) */
export const ADMOB_REWARDED_DIAMOND_ID = 'ca-app-pub-9149509805250873/2494111716';
/** @const {string} 보상형 광고 - 부활 단위 ID (테스트용) */
export const ADMOB_REWARDED_REVIVE_ID = 'ca-app-pub-9149509805250873/8867948374';
/** @const {string} 보상형 광고 - Gold 2배 부스트 단위 ID (테스트용) */
export const ADMOB_REWARDED_GOLD_BOOST_ID = 'ca-app-pub-9149509805250873/9354674749';
/** @const {string} 보상형 광고 - 클리어 보상 2배 단위 ID (테스트용) */
export const ADMOB_REWARDED_CLEAR_BOOST_ID = 'ca-app-pub-9149509805250873/4751086889';
/** @const {string} 보상형 광고 - 타워 뽑기 단위 ID */
export const ADMOB_REWARDED_TOWER_ID = 'ca-app-pub-9149509805250873/7294764833';

// ── 광고 판당 제한 ──────────────────────────────────────────────
/** @const {number} 광고 보상 타워 뽑기 판당 제한 횟수 */
export const AD_DRAW_LIMIT_PER_GAME = 3;

// ── 광고 일일 제한 ──────────────────────────────────────────────
/** @const {number} Diamond 보상형 광고 일일 제한 횟수 */
export const AD_LIMIT_DIAMOND = 5;
/** @const {number} Gold 2배 부스트 광고 일일 제한 횟수 */
export const AD_LIMIT_GOLD_BOOST = 3;
/** @const {number} 클리어 보상 2배 광고 일일 제한 횟수 */
export const AD_LIMIT_CLEAR_BOOST = 3;

// ── 광고 보상 수치 ──────────────────────────────────────────────
/** @const {number} Diamond 보상형 광고 1회당 지급 수량 */
export const AD_REWARD_DIAMOND = 3;
/** @const {number} 부활 시 기지 HP 회복 비율 (maxBaseHP 대비) */
export const AD_REVIVE_HP_RATIO = 0.5;
/** @const {number} Gold 2배 부스트 배율 */
export const AD_GOLD_BOOST_MULTIPLIER = 2;
/** @const {number} 클리어 보상 2배 배율 */
export const AD_CLEAR_BOOST_MULTIPLIER = 2;

// ── IAP 상품 ID ────────────────────────────────────────────────
/** @const {string} 광고제거 인앱 구매 상품 ID (Google Play 상품 등록 시 사용) */
export const IAP_PRODUCT_REMOVE_ADS = 'remove_ads';

// ── 게임 속도 설정 ──────────────────────────────────────────────
export const SPEED_NORMAL = 1.0;
export const SPEED_FAST = 2.0;
export const SPEED_TURBO = 3.0;

// ── 좌표 변환 헬퍼 ──────────────────────────────────────────────
/**
 * 그리드 좌표를 픽셀 중심 좌표로 변환한다.
 * HUD 높이를 Y 오프셋으로 반영한다.
 * @param {number} col - 그리드 열 (0부터 시작)
 * @param {number} row - 그리드 행 (0부터 시작)
 * @returns {{ x: number, y: number }} 픽셀 중심 좌표
 */
export function gridToPixel(col, row) {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT,
  };
}

/**
 * 픽셀 좌표를 그리드 좌표로 변환한다.
 * HUD 높이를 Y 오프셋에서 차감한다.
 * @param {number} x - 픽셀 X 좌표
 * @param {number} y - 픽셀 Y 좌표
 * @returns {{ col: number, row: number }} 그리드 좌표
 */
export function pixelToGrid(x, y) {
  return {
    col: Math.floor(x / CELL_SIZE),
    row: Math.floor((y - HUD_HEIGHT) / CELL_SIZE),
  };
}

// ── 타워 강화 (골드 소비처) ──────────────────────────────────────
/** @const {number} 최대 강화 레벨 */
export const MAX_ENHANCE_LEVEL = 10;

/** @const {number} 첫 번째 강화 기본 비용 */
export const ENHANCE_BASE_COST = 200;

/** @const {number} 강화 레벨당 비용 증가분 */
export const ENHANCE_COST_INCREMENT = 100;

/** @const {number} 강화 레벨당 스탯 보너스 (5% 복리) */
export const ENHANCE_STAT_BONUS = 0.05;

/**
 * 특정 레벨의 강화 비용을 계산한다.
 * 공식: ENHANCE_BASE_COST + (level - 1) * ENHANCE_COST_INCREMENT
 * @param {number} level - 강화 레벨 (1부터 시작, 구매하려는 레벨)
 * @returns {number} 골드 비용
 */
export function calcEnhanceCost(level) {
  return ENHANCE_BASE_COST + (level - 1) * ENHANCE_COST_INCREMENT;
}

// ── HP 회복 (골드 소비처) ────────────────────────────────────────
/** @const {number} 첫 HP 회복 기본 비용 */
export const HP_RECOVER_BASE_COST = 100;

/** @const {number} 사용 횟수당 비용 증가분 */
export const HP_RECOVER_COST_INCREMENT = 50;

/** @const {number} 1회 사용당 HP 회복량 */
export const HP_RECOVER_AMOUNT = 5;

/**
 * 사용 횟수에 따른 HP 회복 비용을 계산한다.
 * 공식: HP_RECOVER_BASE_COST + useCount * HP_RECOVER_COST_INCREMENT
 * @param {number} useCount - 이미 사용한 횟수 (0부터 시작)
 * @returns {number} 골드 비용
 */
export function calcHpRecoverCost(useCount) {
  return HP_RECOVER_BASE_COST + useCount * HP_RECOVER_COST_INCREMENT;
}

// ── 소모품 능력 (골드 소비처) ────────────────────────────────────
/**
 * 소모품 능력 정의.
 * - baseCost: 최초 골드 비용
 * - costIncrement: 사용당 비용 증가분
 * - cooldown: 쿨다운 (초)
 * - duration: 효과 지속 시간 (초, 0 = 즉발)
 */
export const CONSUMABLE_ABILITIES = {
  slowAll: {
    baseCost: 300,
    costIncrement: 50,
    cooldown: 30,
    duration: 5,
    slowAmount: 0.5,
    color: 0x74b9ff,
    icon: 'icon_consumable_slow',
    iconFallback: 'S',
  },
  goldRain: {
    baseCost: 400,
    costIncrement: 75,
    cooldown: 45,
    duration: 10,
    color: 0xffd700,
    icon: 'icon_consumable_gold',
    iconFallback: '$',
  },
  lightning: {
    baseCost: 500,
    costIncrement: 100,
    cooldown: 60,
    duration: 0,
    damage: 100,
    color: 0xfdcb6e,
    icon: 'icon_consumable_lightning',
    iconFallback: 'Z',
  },
};

// ── Diamond Currency ───────────────────────────────────────────
/** Diamond reward formula: floor(round/5)*2 + floor(round/10)*3 */
export function calcDiamondReward(round) {
  return Math.floor(round / 5) * 2 + Math.floor(round / 10) * 3;
}

// ── 별점 시스템 (캠페인 모드) ─────────────────────────────────
/**
 * 맵 클리어 시 HP 잔량 비율에 따라 별점(1~3)을 계산한다.
 * @param {number} currentHP - 클리어 시점의 현재 HP
 * @param {number} maxHP - 최대 HP
 * @returns {number} 별점 (1, 2, 또는 3)
 */
export function calcStarRating(currentHP, maxHP) {
  if (maxHP <= 0) return 1;
  const ratio = currentHP / maxHP;
  if (ratio >= 0.8) return 3;
  if (ratio >= 0.4) return 2;
  return 1;
}

/** @const {number[]} 별점별 캠페인 다이아몬드 보상 (인덱스 = 별점) */
export const CAMPAIGN_DIAMOND_REWARDS = [0, 3, 5, 8];

// (타워 해금은 월드 클리어 기반, TOWER_UNLOCK_MAP 참조)

// ── 메타 업그레이드 설정 (타워별 능력치 선형 강화) ──────────────
/**
 * 타워별 메타 업그레이드 설정.
 * 각 타워의 damage/fireRate/range 3개 슬롯을 독립적으로 레벨업하는 선형 스택 시스템.
 * - BONUS_PER_LEVEL: 레벨당 보너스 비율 (+10%)
 * - BASE_COST: 레벨 1 구매 비용 (다이아몬드)
 * - COST_STEP: 레벨당 비용 증가분
 * - towers: 타워별 각 슬롯의 최대 레벨 (maxLevel)
 * @type {object}
 */
export const META_UPGRADE_CONFIG = {
  BONUS_PER_LEVEL: 0.10,  // 레벨당 보너스 비율 (+10%)
  BASE_COST: 5,            // 레벨 1 비용 (다이아몬드)
  COST_STEP: 3,            // 레벨당 비용 증가분
  towers: {
    archer:    { damage: 3, fireRate: 5, range: 3 },
    mage:      { damage: 5, fireRate: 3, range: 3 },
    ice:       { damage: 2, fireRate: 3, range: 5 },
    lightning: { damage: 5, fireRate: 3, range: 3 },
    flame:     { damage: 3, fireRate: 5, range: 3 },
    rock:      { damage: 5, fireRate: 2, range: 3 },
    poison:    { damage: 2, fireRate: 3, range: 5 },
    wind:      { damage: 3, fireRate: 5, range: 3 },
    light:     { damage: 5, fireRate: 3, range: 3 },
    dragon:    { damage: 5, fireRate: 2, range: 5 },
  },
};

/**
 * 메타 업그레이드 다음 레벨 구매 비용을 계산한다.
 * 비용 공식: baseCost + (nextLevel - 1) * step
 * 예: Lv1=5, Lv2=8, Lv3=11, Lv4=14, Lv5=17
 * @param {number} currentLevel - 현재 레벨 (0이면 미강화)
 * @returns {number} 다음 레벨 구매 비용 (다이아몬드)
 */
export function calcMetaUpgradeCost(currentLevel) {
  const nextLevel = currentLevel + 1;
  return META_UPGRADE_CONFIG.BASE_COST + (nextLevel - 1) * META_UPGRADE_CONFIG.COST_STEP;
}

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

/** @const {number} 현재 세이브 데이터 스키마 버전 */
export const SAVE_DATA_VERSION = 8;

/**
 * 세이브 데이터를 최신 스키마로 마이그레이션한다.
 * v1 → v2: towerUpgrades/dragonUnlocked 제거, unlockedTowers/discoveredMerges 추가.
 * v2 → v3: worldProgress/endlessUnlocked/campaignStats 추가.
 * 기존 필드(diamond, stats, totalDiamondEarned 등)는 100% 보존한다.
 * @param {object|null} saveData - 기존 세이브 데이터 (null이면 신규 생성)
 * @returns {object} 마이그레이션된 세이브 데이터
 */
export function migrateSaveData(saveData) {
  if (!saveData) {
    return {
      saveDataVersion: SAVE_DATA_VERSION,
      bestRound: 0,
      bestKills: 0,
      totalGames: 0,
      diamond: 0,
      totalDiamondEarned: 0,
      towerUpgrades: {},
      utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
      unlockedTowers: [],
      discoveredMerges: [],
      newDiscoveries: [],
      stats: createDefaultStats(),
      worldProgress: {},
      endlessUnlocked: false,
      campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
      adFree: false,
      mergeTutorialDone: false,
    };
  }

  // ── v1 → v2 migration ──
  if (!saveData.saveDataVersion || saveData.saveDataVersion < 2) {
    // Preserve diamond, stats, totalDiamondEarned
    const diamond = saveData.diamond || 0;
    const totalDiamondEarned = saveData.totalDiamondEarned || 0;
    const stats = saveData.stats || createDefaultStats();

    // Migrate dragonUnlocked → unlockedTowers array
    const unlockedTowers = [];
    if (saveData.dragonUnlocked) {
      unlockedTowers.push('dragon');
    }

    // Preserve utility upgrades and tower meta upgrades
    const utilityUpgrades = saveData.utilityUpgrades || { baseHp: 0, goldBoost: 0, waveBonus: 0 };
    const towerUpgrades = saveData.towerUpgrades || {};

    // Seed stats from existing top-level fields if needed
    if (!stats.totalGamesPlayed && saveData.totalGames) {
      stats.totalGamesPlayed = saveData.totalGames;
    }
    if (!stats.bestRound && saveData.bestRound) {
      stats.bestRound = saveData.bestRound;
    }
    if (!stats.bestKills && saveData.bestKills) {
      stats.bestKills = saveData.bestKills;
    }
    if (!stats.gameHistory) stats.gameHistory = [];

    // Build v2 save data (버전은 2로 설정, v2→v3 마이그레이션이 이후 실행됨)
    saveData = {
      saveDataVersion: 2,
      bestRound: saveData.bestRound || 0,
      bestKills: saveData.bestKills || 0,
      totalGames: saveData.totalGames || 0,
      diamond,
      totalDiamondEarned,
      towerUpgrades,
      utilityUpgrades,
      unlockedTowers,
      discoveredMerges: [],
      stats,
    };

    // v1→v2 마이그레이션 완료 후 v2→v3으로 계속 진행
  }

  // ── v2 → v3 마이그레이션 ──
  if (saveData.saveDataVersion < 3) {
    saveData.worldProgress = {};
    saveData.endlessUnlocked = false;
    saveData.campaignStats = { totalStars: 0, mapsCleared: 0, worldsCleared: 0 };
    saveData.saveDataVersion = 3;
  }

  // ── v3 → v4 마이그레이션: 타워 해금을 월드 클리어 기반으로 재계산 ──
  if (saveData.saveDataVersion < 4) {
    const newUnlocked = [];
    for (const [worldId, towerType] of Object.entries(TOWER_UNLOCK_MAP)) {
      const world = WORLDS.find(w => w.id === worldId);
      if (world && world.mapIds.every(id => saveData.worldProgress[id]?.cleared)) {
        newUnlocked.push(towerType);
      }
    }
    saveData.unlockedTowers = newUnlocked;
    saveData.saveDataVersion = 4;
  }

  // ── v4 → v5 마이그레이션: 메타 업그레이드 시스템 리디자인 (tier A/B → 슬롯별 레벨) ──
  if (saveData.saveDataVersion < 5) {
    // 기존 tier1/tier2/tier3 구조를 { damage: 0, fireRate: 0, range: 0 } 형식으로 리셋
    saveData.towerUpgrades = {};
    saveData.saveDataVersion = 5;
  }

  // ── v5 → v6 마이그레이션: 도감 발견 시스템 (discoveredMerges 활용, newDiscoveries 추가) ──
  if (saveData.saveDataVersion < 6) {
    if (!saveData.discoveredMerges) saveData.discoveredMerges = [];
    // 기존 유저 → T2 전체 발견 처리
    for (const [, recipe] of Object.entries(MERGE_RECIPES)) {
      if (recipe.tier === 2 && !saveData.discoveredMerges.includes(recipe.id)) {
        saveData.discoveredMerges.push(recipe.id);
      }
    }
    saveData.newDiscoveries = [];
    saveData.saveDataVersion = 6;
  }

  // ── v6 → v7 마이그레이션: 광고제거 인앱 구매 상태 필드 추가 ──
  if (saveData.saveDataVersion < 7) {
    if (saveData.adFree === undefined) saveData.adFree = false;
    saveData.saveDataVersion = 7;
  }

  // ── v7 → v8 마이그레이션: 합성 튜토리얼 완료 플래그 추가 ──
  if (saveData.saveDataVersion < 8) {
    // 기존 유저는 이미 게임을 해봤으므로 튜토리얼 생략
    if (saveData.mergeTutorialDone === undefined) saveData.mergeTutorialDone = true;
    saveData.saveDataVersion = 8;
  }

  // ── Ensure all v2 fields exist ──
  if (saveData.diamond === undefined) saveData.diamond = 0;
  if (saveData.totalDiamondEarned === undefined) saveData.totalDiamondEarned = 0;
  if (!saveData.towerUpgrades) saveData.towerUpgrades = {};
  if (!saveData.utilityUpgrades) {
    saveData.utilityUpgrades = { baseHp: 0, goldBoost: 0, waveBonus: 0 };
  }
  if (!saveData.unlockedTowers) saveData.unlockedTowers = [];
  if (!saveData.discoveredMerges) saveData.discoveredMerges = [];
  if (!saveData.newDiscoveries) saveData.newDiscoveries = [];

  if (!saveData.stats) {
    saveData.stats = createDefaultStats();
    saveData.stats.totalGamesPlayed = saveData.totalGames || 0;
    saveData.stats.bestRound = saveData.bestRound || 0;
    saveData.stats.bestKills = saveData.bestKills || 0;
  }
  if (!saveData.stats.gameHistory) saveData.stats.gameHistory = [];

  // ── Ensure all v3 fields exist ──
  if (!saveData.worldProgress) saveData.worldProgress = {};
  if (saveData.endlessUnlocked === undefined) saveData.endlessUnlocked = false;
  if (!saveData.campaignStats) saveData.campaignStats = { totalStars: 0, mapsCleared: 0, worldsCleared: 0 };

  // ── Ensure v7 fields exist ──
  if (saveData.adFree === undefined) saveData.adFree = false;

  // ── Ensure v8 fields exist ──
  if (saveData.mergeTutorialDone === undefined) saveData.mergeTutorialDone = false;

  return saveData;
}
