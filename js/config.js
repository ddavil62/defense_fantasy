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

// (Dragon tower lock is now managed via TOWER_STATS[type].locked field)

// ── Tower Stats ─────────────────────────────────────────────────
/**
 * Tower statistics indexed by type.
 * levels: { 1: Lv.1 stats }
 * locked: true = needs Diamond to unlock, false/undefined = available
 * unlockCost: Diamond cost to unlock (only when locked=true)
 * cost = installation cost (Lv.1).
 * sellPrice = floor(totalInvested * 0.6)
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
    locked: false,
    unlockCost: 0,
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
    locked: false,
    unlockCost: 0,
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
    locked: false,
    unlockCost: 0,
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
    locked: false,
    unlockCost: 0,
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
    unlockCost: 50,
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

// ── Merge System ─────────────────────────────────────────────────
/**
 * Merge recipes: key = typeA+typeB (alphabetically sorted), value = merge result.
 * 55 T2 recipes (10 same-type + 45 cross-type).
 * @type {Object<string, { id: string, tier: number, displayName: string, color: number }>}
 */
export const MERGE_RECIPES = {
  // ── Same-type merges (10) ──
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

  // ── Cross-type merges: archer combos (8) ──
  'archer+mage':         { id: 'arcane_archer',  tier: 2, displayName: '마법 화살사',   color: 0x368bbd },
  'archer+ice':          { id: 'cryo_sniper',    tier: 2, displayName: '냉동 저격수',   color: 0x3ab8ca },
  'archer+lightning':    { id: 'shock_arrow',    tier: 2, displayName: '전격 화살',     color: 0x7ec281 },
  'archer+flame':        { id: 'fire_arrow',     tier: 2, displayName: '화염 화살',     color: 0x70c475 },
  'archer+rock':         { id: 'armor_pierce',   tier: 2, displayName: '철갑 화살',     color: 0x319483 },
  'archer+poison':       { id: 'venom_shot',     tier: 2, displayName: '독화살',       color: 0x54cc7b },
  'archer+wind':         { id: 'gale_arrow',     tier: 2, displayName: '폭풍 화살',     color: 0x40d2c0 },
  'archer+light':        { id: 'holy_arrow',     tier: 2, displayName: '신성 화살',     color: 0x7fd19e },

  // ── Cross-type merges: mage combos (7) ──
  'ice+mage':            { id: 'frost_mage',     tier: 2, displayName: '서리 술사',     color: 0x7080f3 },
  'lightning+mage':      { id: 'storm_mage',     tier: 2, displayName: '폭풍 마법사',   color: 0xb494aa },
  'flame+mage':          { id: 'pyromancer',     tier: 2, displayName: '화염 술사',     color: 0xa7666e },
  'mage+rock':           { id: 'gravity_mage',   tier: 2, displayName: '중력 마법사',   color: 0x6865ac },
  'mage+poison':         { id: 'toxic_mage',     tier: 2, displayName: '독기 술사',     color: 0x8a9e75 },
  'mage+wind':           { id: 'vacuum_mage',    tier: 2, displayName: '진공 마법사',   color: 0x76a4ea },
  'light+mage':          { id: 'radiant_mage',   tier: 2, displayName: '성광 마법사',   color: 0xb5a3c7 },

  // ── Cross-type merges: ice combos (6) ──
  'ice+lightning':       { id: 'thunder_frost',  tier: 2, displayName: '전격 빙결',     color: 0xb8d2b7 },
  'flame+ice':           { id: 'cryo_flame',     tier: 2, displayName: '냉열 교차',     color: 0xabc4aa },
  'ice+rock':            { id: 'glacier',        tier: 2, displayName: '빙산',         color: 0x6b9eb9 },
  'ice+poison':          { id: 'frost_venom',    tier: 2, displayName: '동상 독',       color: 0x8ecfb1 },
  'ice+wind':            { id: 'blizzard',       tier: 2, displayName: '빙풍',         color: 0x7bd4f6 },
  'ice+light':           { id: 'holy_ice',       tier: 2, displayName: '성빙',         color: 0xb9d2d3 },

  // ── Cross-type merges: lightning combos (5) ──
  'flame+lightning':     { id: 'thunder_fire',   tier: 2, displayName: '벼락불',       color: 0xf09e62 },
  'lightning+rock':      { id: 'thunder_strike', tier: 2, displayName: '천둥 강타',     color: 0xb09d70 },
  'lightning+poison':    { id: 'toxic_shock',    tier: 2, displayName: '독전기',       color: 0xd3d069 },
  'lightning+wind':      { id: 'storm_bolt',     tier: 2, displayName: '폭풍 전격',     color: 0xbfdbad },
  'light+lightning':     { id: 'holy_thunder',   tier: 2, displayName: '신성 번개',     color: 0xfde08b },

  // ── Cross-type merges: flame combos (4) ──
  'flame+rock':          { id: 'magma_shot',     tier: 2, displayName: '용암탄',       color: 0xa26f64 },
  'flame+poison':        { id: 'venom_fire',     tier: 2, displayName: '맹독 화염',     color: 0xc4a85c },
  'flame+wind':          { id: 'fire_storm',     tier: 2, displayName: '화염 폭풍',     color: 0xb12e71 },
  'flame+light':         { id: 'solar_flame',    tier: 2, displayName: '태양광 화염',   color: 0xf0c57e },

  // ── Cross-type merges: rock combos (3) ──
  'poison+rock':         { id: 'toxic_boulder',  tier: 2, displayName: '독암',         color: 0x86a76b },
  'rock+wind':           { id: 'stone_gale',     tier: 2, displayName: '바위 폭풍',     color: 0x72adaf },
  'light+rock':          { id: 'holy_stone',     tier: 2, displayName: '성광 바위',     color: 0xb1ac8d },

  // ── Cross-type merges: poison combos (2) ──
  'poison+wind':         { id: 'toxic_gale',     tier: 2, displayName: '독풍',         color: 0x94e6a6 },
  'light+poison':        { id: 'purge_venom',    tier: 2, displayName: '정화의 독',     color: 0xd3e285 },

  // ── Cross-type merges: wind combos (1) ──
  'light+wind':          { id: 'radiant_gale',   tier: 2, displayName: '성광 폭풍',     color: 0xc0e7ca },

  // ── Cross-type merges: dragon combos (9) ──
  'archer+dragon':       { id: 'dragon_rider',   tier: 2, displayName: '용기병',       color: 0x6b9463 },
  'dragon+mage':         { id: 'dragon_mage',    tier: 2, displayName: '용마법사',     color: 0xa1468c },
  'dragon+ice':          { id: 'frost_dragon',   tier: 2, displayName: '빙룡',         color: 0xa37498 },
  'dragon+lightning':    { id: 'thunder_dragon', tier: 2, displayName: '뇌룡',         color: 0xe57e50 },
  'dragon+flame':        { id: 'inferno_dragon', tier: 2, displayName: '업화룡',       color: 0xdc5043 },
  'dragon+rock':         { id: 'stone_dragon',   tier: 2, displayName: '석룡',         color: 0x9c4f52 },
  'dragon+poison':       { id: 'venom_dragon',   tier: 2, displayName: '독룡',         color: 0xbf894a },
  'dragon+wind':         { id: 'storm_dragon',   tier: 2, displayName: '폭풍룡',       color: 0xab798e },
  'dragon+light':        { id: 'holy_dragon',    tier: 2, displayName: '성룡',         color: 0xea956c },
};

/**
 * Stats for merged towers, keyed by merge result ID.
 * 55 T2 stat blocks.
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
    damage: 6, fireRate: 1.2, range: 110,
    attackType: 'aoe_instant',
    splashRadius: 65,
    burnDamage: 10, burnDuration: 4,
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
    armorReduction: 0.5, armorReductionDuration: 6,
  },
  typhoon: {
    damage: 8, fireRate: 2.0, range: 130,
    attackType: 'aoe_instant',
    splashRadius: 70,
    pushbackDistance: 120, pushbackTargets: 6,
  },
  solar_burst: {
    damage: 55, fireRate: 2.5, range: 120,
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
    damage: 30, fireRate: 1.8, range: 110,
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
    damage: 40, fireRate: 2.2, range: 600,
    attackType: 'piercing_beam',
    burnDamage: 8, burnDuration: 3,
  },
};

/**
 * Get a canonical merge key from two tower type/merge IDs.
 * Sorts alphabetically and joins with '+'.
 * @param {string} typeA - Tower type or merge ID
 * @param {string} typeB - Tower type or merge ID
 * @returns {string} Sorted merge key (e.g. 'archer+mage')
 */
export function getMergeKey(typeA, typeB) {
  return [typeA, typeB].sort().join('+');
}

/**
 * Look up a merge recipe result for two tower type/merge IDs.
 * @param {string} typeA - Tower type or merge ID
 * @param {string} typeB - Tower type or merge ID
 * @returns {object|null} Merge recipe result or null if not found
 */
export function getMergeResult(typeA, typeB) {
  const key = getMergeKey(typeA, typeB);
  return MERGE_RECIPES[key] || null;
}

/**
 * Check if a tower is mergeable (enhanceLevel must be 0).
 * @param {{ enhanceLevel: number }} tower - Tower instance
 * @returns {boolean}
 */
export function isMergeable(tower) {
  return tower.enhanceLevel === 0;
}

/**
 * Check if a tower type or merge ID is used as a merge ingredient in any recipe.
 * @param {string} id - Tower type or merge ID
 * @returns {boolean}
 */
export function isUsedAsMergeIngredient(id) {
  for (const key of Object.keys(MERGE_RECIPES)) {
    const parts = key.split('+');
    if (parts.includes(id)) return true;
  }
  return false;
}

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

// (Dragon unlock cost is now in TOWER_STATS.dragon.unlockCost)

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

/** @const {number} Current save data schema version */
export const SAVE_DATA_VERSION = 2;

/**
 * Migrate save data to latest schema.
 * v1 → v2: Remove towerUpgrades, dragonUnlocked; add unlockedTowers, discoveredMerges.
 * Preserves diamond, stats, totalDiamondEarned.
 * @param {object|null} saveData - Existing save data (may be null or older format)
 * @returns {object} Migrated save data with all fields
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
      stats: createDefaultStats(),
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

    // Build v2 save data
    saveData = {
      saveDataVersion: SAVE_DATA_VERSION,
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

    return saveData;
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

  if (!saveData.stats) {
    saveData.stats = createDefaultStats();
    saveData.stats.totalGamesPlayed = saveData.totalGames || 0;
    saveData.stats.bestRound = saveData.bestRound || 0;
    saveData.stats.bestKills = saveData.bestKills || 0;
  }
  if (!saveData.stats.gameHistory) saveData.stats.gameHistory = [];

  return saveData;
}
