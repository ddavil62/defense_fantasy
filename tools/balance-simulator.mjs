/**
 * @fileoverview Fantasy TD 밸런스 시뮬레이터 (라운드 단위 추상 시뮬레이션).
 * 수치 변경 전후의 밸런스를 비교 분석하기 위한 도구.
 * 다양한 전략 시나리오로 시뮬레이션을 돌려 게임오버 라운드,
 * T5 첫 도달 라운드, 골드 커브 등을 분석한다.
 *
 * 사용법:
 *   node fantasydefence/tools/balance-simulator.mjs --scenarios all --rounds 60
 *   node fantasydefence/tools/balance-simulator.mjs --compare --rounds 80
 *   node fantasydefence/tools/balance-simulator.mjs --scenarios t5_rush_single --override '{"initialGold":300}'
 *
 * Phaser 의존성 없이 순수 Node.js로 동작한다.
 */

import { parseArgs } from 'node:util';

// ── 기본 수치 (현재 config.js 기준) ────────────────────────────────

/** @const {number} 셀 크기 (px) */
const CELL_SIZE = 40;

/** @const {number} 경로 웨이포인트 수 */
const WAYPOINT_COUNT = 31;

/** @const {number} 경로 총 거리 (px) — 대략 WAYPOINT_COUNT * CELL_SIZE */
const PATH_TOTAL_DISTANCE = WAYPOINT_COUNT * CELL_SIZE; // 1240px

/** @const {number} 기지 최대 HP */
const MAX_BASE_HP = 20;

/** @const {number} 배치 가능 슬롯 수 (밸런스 오버홀: 50→30) */
const MAX_SLOTS = 30;

// ── 메타 업그레이드 설정 (config.js의 META_UPGRADE_CONFIG 동기화) ──

/**
 * 타워별 메타 업그레이드 최대 레벨.
 * damage/fireRate/range 3개 슬롯, BONUS_PER_LEVEL = 0.10 (+10%/Lv).
 * @type {Object}
 */
const META_UPGRADE = {
  BONUS_PER_LEVEL: 0.10,
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
 * 메타 레벨 프리셋별 실제 적용 레벨을 계산한다.
 * @param {string} sourceType - T1 원본 타입
 * @param {'none'|'half'|'full'} metaLevel - 메타 프리셋
 * @returns {{damageLvl: number, fireRateLvl: number}} 적용할 레벨
 */
function getMetaLevels(sourceType, metaLevel) {
  if (metaLevel === 'none' || !META_UPGRADE.towers[sourceType]) {
    return { damageLvl: 0, fireRateLvl: 0 };
  }
  const cfg = META_UPGRADE.towers[sourceType];
  if (metaLevel === 'full') {
    return { damageLvl: cfg.damage, fireRateLvl: cfg.fireRate };
  }
  // half: 최대 레벨의 절반 (내림)
  return {
    damageLvl: Math.floor(cfg.damage / 2),
    fireRateLvl: Math.floor(cfg.fireRate / 2),
  };
}

/**
 * 메타 업그레이드에 의한 DPS 배율을 계산한다.
 * damage만 1.1^n으로 증가 (DoT 제외), fireRate는 0.9^m으로 감소.
 * @param {string} sourceType - T1 원본 타입
 * @param {'none'|'half'|'full'} metaLevel - 메타 프리셋
 * @returns {{damageMult: number, fireRateMult: number}} damage 배율과 fireRate 배율
 */
function getMetaMultipliers(sourceType, metaLevel) {
  const { damageLvl, fireRateLvl } = getMetaLevels(sourceType, metaLevel);
  const bonus = META_UPGRADE.BONUS_PER_LEVEL;
  return {
    damageMult: Math.pow(1 + bonus, damageLvl),         // 1.1^n
    fireRateMult: Math.pow(1 - bonus, fireRateLvl),     // 0.9^m (값이 작을수록 빠름)
  };
}

// ── 현재 밸런스 수치 세트 ──────────────────────────────────────────

/**
 * 현재 게임에 적용 중인 밸런스 수치.
 * 밸런스 오버홀 (2026-03-03) 적용 후 수치로 갱신됨.
 * @type {Object}
 */
const CURRENT_PARAMS = {
  /** HP 스케일링 구간별 증가율 */
  hpScale: {
    r1_r20: 0.15,
    r21_r35: 0.20,
    r36_r50: 0.30,
    r51_plus: 0.45,
  },
  /** 보스 HP 배율 (라운드 구간별) */
  bossHpMultiplier: {
    r_30: 3.0,
    r_40: 4.0,
    r_41_plus: 5.0,
  },
  /** 웨이브 클리어 보너스 */
  waveClearBonus: {
    roundMultiplier: 3,
    hpBonusMax: 8,
  },
  /** 시작 골드 */
  initialGold: 200,
  /** 판매 비율 */
  sellRatio: 0.5,
  /** 합성 골드 비용 (티어별) */
  mergeCost: { 2: 30, 3: 80, 4: 150, 5: 250 },
};

/**
 * 제안 밸런스 수치 (--compare 시 사용).
 * 밸런스 오버홀 확정 수치 (2026-03-03 적용).
 * @type {Object}
 */
const PROPOSED_PARAMS = {
  hpScale: {
    r1_r20: 0.15,
    r21_r35: 0.20,    // 0.10→0.20
    r36_r50: 0.30,    // 0.13→0.30
    r51_plus: 0.45,   // 0.15→0.45
  },
  bossHpMultiplier: {
    r_30: 3.0,         // 2.0→3.0
    r_40: 4.0,         // 2.2→4.0
    r_41_plus: 5.0,    // 2.5→5.0
  },
  waveClearBonus: {
    roundMultiplier: 3, // 5→3
    hpBonusMax: 8,      // 15→8
  },
  initialGold: 200,     // 250→200
  sellRatio: 0.5,       // 0.6→0.5
  /** @type {number} 최대 배치 타워 수 */
  maxTowerCount: 30,
  /** @type {Object<number, number>} 합성 골드 비용 */
  mergeCost: { 2: 30, 3: 80, 4: 150, 5: 250 },
};

// ── 적 기본 스탯 ──────────────────────────────────────────────────

/** @const {Object} 적 8종 기본 스탯 */
const ENEMY_STATS = {
  normal:       { hp: 30,   speed: 60,  gold: 5,   damage: 1,  resistance: 0 },
  fast:         { hp: 20,   speed: 120, gold: 3,   damage: 1,  resistance: 0 },
  tank:         { hp: 120,  speed: 35,  gold: 15,  damage: 3,  resistance: 0 },
  boss:         { hp: 500,  speed: 30,  gold: 100, damage: 10, resistance: 0 },
  swarm:        { hp: 15,   speed: 90,  gold: 2,   damage: 1,  resistance: 0 },
  splitter:     { hp: 80,   speed: 50,  gold: 12,  damage: 2,  resistance: 0 },
  armored:      { hp: 100,  speed: 45,  gold: 20,  damage: 2,  resistance: 0.5 },
  boss_armored: { hp: 1500, speed: 25,  gold: 150, damage: 15, resistance: 0.3 },
};

// ── T1 타워 스탯 ──────────────────────────────────────────────────

/** @const {Object} T1 타워 10종 기본 스탯 */
const TOWER_STATS = {
  archer:    { cost: 50,  damage: 10, fireRate: 0.8,  range: 120, attackType: 'single' },
  mage:      { cost: 100, damage: 25, fireRate: 2.0,  range: 100, attackType: 'splash',        splashRadius: 40 },
  ice:       { cost: 75,  damage: 8,  fireRate: 1.5,  range: 100, attackType: 'single',        slowAmount: 0.3 },
  lightning: { cost: 120, damage: 18, fireRate: 1.2,  range: 120, attackType: 'chain',         chainCount: 4, chainDecay: 0.7 },
  flame:     { cost: 90,  damage: 5,  fireRate: 1.5,  range: 100, attackType: 'dot_single',    burnDamage: 4, burnDuration: 3 },
  rock:      { cost: 110, damage: 45, fireRate: 3.0,  range: 80,  attackType: 'single' },
  poison:    { cost: 95,  damage: 3,  fireRate: 2.0,  range: 120, attackType: 'aoe_instant',   splashRadius: 60, poisonDamage: 3, poisonDuration: 4 },
  wind:      { cost: 80,  damage: 5,  fireRate: 2.5,  range: 120, attackType: 'single',        pushbackDistance: 80 },
  light:     { cost: 130, damage: 20, fireRate: 1.8,  range: 600, attackType: 'piercing_beam' },
  dragon:    { cost: 250, damage: 60, fireRate: 2.5,  range: 160, attackType: 'splash',        splashRadius: 80 },
};

// ── 합성 타워 스탯 (시뮬레이션에서 사용하는 주요 타워만) ────────────

/**
 * 합성 타워 스탯 (mergeId → {damage, fireRate, attackType, ...}).
 * balance-sim.js에서 추출한 전체 목록.
 * @type {Object}
 */
const MERGED_STATS = {
  // T2 동종
  rapid_archer:    { tier: 2, damage: 12, fireRate: 0.4,  attackType: 'single' },
  overload_mage:   { tier: 2, damage: 60, fireRate: 3.5,  attackType: 'splash', splashRadius: 70 },
  zero_field:      { tier: 2, damage: 4,  fireRate: 1.0,  attackType: 'aoe_instant', splashRadius: 90, slowAmount: 0.5 },
  thunder_lord:    { tier: 2, damage: 30, fireRate: 1.0,  attackType: 'chain', chainCount: 8, chainDecay: 0.85 },
  inferno:         { tier: 2, damage: 22, fireRate: 1.2,  attackType: 'aoe_instant', splashRadius: 65, burnDamage: 14, burnDuration: 4 },
  quake:           { tier: 2, damage: 80, fireRate: 3.5,  attackType: 'splash', splashRadius: 50 },
  plague:          { tier: 2, damage: 4,  fireRate: 1.8,  attackType: 'aoe_instant', splashRadius: 80, poisonDamage: 8, poisonDuration: 6 },
  typhoon:         { tier: 2, damage: 8,  fireRate: 2.0,  attackType: 'aoe_instant', splashRadius: 70 },
  solar_burst:     { tier: 2, damage: 70, fireRate: 2.2,  attackType: 'aoe_instant', splashRadius: 110 },
  ancient_dragon:  { tier: 2, damage: 90, fireRate: 2.5,  attackType: 'splash', splashRadius: 100, burnDamage: 12, burnDuration: 4, poisonDamage: 10, poisonDuration: 6 },

  // T2 이종 (주요)
  arcane_archer:   { tier: 2, damage: 18, fireRate: 1.0,  attackType: 'splash', splashRadius: 45 },
  cryo_sniper:     { tier: 2, damage: 15, fireRate: 1.2,  attackType: 'single', slowAmount: 1.0 },
  shock_arrow:     { tier: 2, damage: 14, fireRate: 0.9,  attackType: 'chain', chainCount: 3, chainDecay: 0.8 },
  fire_arrow:      { tier: 2, damage: 12, fireRate: 0.9,  attackType: 'dot_single', burnDamage: 6, burnDuration: 4 },
  armor_pierce:    { tier: 2, damage: 40, fireRate: 1.4,  attackType: 'single', armorPiercing: true },
  holy_arrow:      { tier: 2, damage: 22, fireRate: 1.4,  attackType: 'piercing_beam' },
  frost_mage:      { tier: 2, damage: 28, fireRate: 2.0,  attackType: 'splash', splashRadius: 55, slowAmount: 0.35 },
  thunder_fire:    { tier: 2, damage: 22, fireRate: 1.2,  attackType: 'chain', chainCount: 5, chainDecay: 0.7, burnDamage: 5, burnDuration: 3 },
  dragon_rider:    { tier: 2, damage: 45, fireRate: 2.0,  attackType: 'splash', splashRadius: 75, burnDamage: 6, burnDuration: 3 },
  holy_dragon:     { tier: 2, damage: 60, fireRate: 2.2,  attackType: 'piercing_beam', burnDamage: 8, burnDuration: 3 },
  dragon_mage:     { tier: 2, damage: 50, fireRate: 2.2,  attackType: 'splash', splashRadius: 60 },
  frost_dragon:    { tier: 2, damage: 40, fireRate: 2.0,  attackType: 'splash', splashRadius: 70, slowAmount: 0.4 },
  thunder_dragon:  { tier: 2, damage: 35, fireRate: 1.5,  attackType: 'chain', chainCount: 6, chainDecay: 0.8 },
  inferno_dragon:  { tier: 2, damage: 45, fireRate: 2.0,  attackType: 'splash', splashRadius: 70, burnDamage: 8, burnDuration: 4 },
  stone_dragon:    { tier: 2, damage: 70, fireRate: 2.8,  attackType: 'splash', splashRadius: 60 },
  venom_dragon:    { tier: 2, damage: 35, fireRate: 2.0,  attackType: 'aoe_instant', splashRadius: 80, poisonDamage: 10, poisonDuration: 6 },
  storm_dragon:    { tier: 2, damage: 30, fireRate: 2.0,  attackType: 'aoe_instant', splashRadius: 70 },
  storm_mage:      { tier: 2, damage: 35, fireRate: 1.8,  attackType: 'splash', splashRadius: 50 },
  thunder_strike:  { tier: 2, damage: 35, fireRate: 1.5,  attackType: 'chain', chainCount: 5, chainDecay: 0.8 },
  holy_thunder:    { tier: 2, damage: 25, fireRate: 1.3,  attackType: 'piercing_beam' },
  pyromancer:      { tier: 2, damage: 45, fireRate: 1.8,  attackType: 'splash', splashRadius: 55, burnDamage: 6, burnDuration: 3 },

  // T3
  thunder_wyrm_king:      { tier: 3, damage: 65,  fireRate: 1.5,  attackType: 'chain', chainCount: 10, chainDecay: 0.85, burnDamage: 20, burnDuration: 5, poisonDamage: 15, poisonDuration: 7 },
  plague_wyrm:            { tier: 3, damage: 45,  fireRate: 2.0,  attackType: 'aoe_instant', splashRadius: 130, burnDamage: 12, burnDuration: 4, poisonDamage: 20, poisonDuration: 8 },
  cosmos_dragon:          { tier: 3, damage: 100, fireRate: 2.5,  attackType: 'aoe_instant', splashRadius: 150, burnDamage: 15, burnDuration: 5, poisonDamage: 12, poisonDuration: 6 },
  primal_dragon_lord:     { tier: 3, damage: 140, fireRate: 2.5,  attackType: 'splash', splashRadius: 120, burnDamage: 18, burnDuration: 6, poisonDamage: 15, poisonDuration: 7 },
  lightning_tempest:      { tier: 3, damage: 55,  fireRate: 1.2,  attackType: 'chain', chainCount: 12, chainDecay: 0.9 },
  celestial_judgment:     { tier: 3, damage: 100, fireRate: 1.8,  attackType: 'piercing_beam', burnDamage: 15, burnDuration: 4 },
  hellquake:              { tier: 3, damage: 115, fireRate: 3.0,  attackType: 'splash', splashRadius: 100, burnDamage: 18, burnDuration: 5 },
  storm_deity:            { tier: 3, damage: 75,  fireRate: 1.8,  attackType: 'chain', chainCount: 8, chainDecay: 0.85, burnDamage: 10, burnDuration: 4 },
  venom_sovereign:        { tier: 3, damage: 50,  fireRate: 2.0,  attackType: 'aoe_instant', splashRadius: 120, poisonDamage: 25, poisonDuration: 9 },
  absolute_frost_domain:  { tier: 3, damage: 18,  fireRate: 1.5,  attackType: 'aoe_instant', splashRadius: 140, slowAmount: 0.75 },
  thunderstorm_king:      { tier: 3, damage: 50,  fireRate: 1.0,  attackType: 'chain', chainCount: 12, chainDecay: 0.9 },
  solar_cannon:           { tier: 3, damage: 95,  fireRate: 2.5,  attackType: 'aoe_instant', splashRadius: 140 },
  superconductor_mage:    { tier: 3, damage: 60,  fireRate: 1.5,  attackType: 'chain', chainCount: 10, chainDecay: 0.88 },
  grand_pyromancer:       { tier: 3, damage: 30,  fireRate: 1.5,  attackType: 'aoe_instant', splashRadius: 100, burnDamage: 28, burnDuration: 6 },
  tectonic_dragon:        { tier: 3, damage: 100, fireRate: 2.8,  attackType: 'splash', splashRadius: 90 },
  adamantine_lightning:   { tier: 3, damage: 60,  fireRate: 1.3,  attackType: 'chain', chainCount: 8, chainDecay: 0.85 },
  eternal_blizzard:       { tier: 3, damage: 25,  fireRate: 1.5,  attackType: 'aoe_instant', splashRadius: 120, slowAmount: 0.6 },
  divine_sun_ray:         { tier: 3, damage: 60,  fireRate: 2.0,  attackType: 'piercing_beam', burnDamage: 10, burnDuration: 4 },
  earth_shatterer:        { tier: 3, damage: 145, fireRate: 3.2,  attackType: 'splash', splashRadius: 70 },

  // T4
  void_sniper:           { tier: 4, damage: 220, fireRate: 1.0, attackType: 'chain', chainCount: 12, chainDecay: 0.9, burnDamage: 20, burnDuration: 6, poisonDamage: 15, poisonDuration: 8, armorPiercing: true },
  storm_dominion:        { tier: 4, damage: 160, fireRate: 1.0, attackType: 'chain', chainCount: 16, chainDecay: 0.9, burnDamage: 35, burnDuration: 6, armorPiercing: true },
  glacial_epoch:         { tier: 4, damage: 60,  fireRate: 1.2, attackType: 'aoe_instant', splashRadius: 180, slowAmount: 0.95 },
  magma_core:            { tier: 4, damage: 180, fireRate: 2.5, attackType: 'aoe_instant', splashRadius: 130, burnDamage: 50, burnDuration: 8 },
  annihilation_gale:     { tier: 4, damage: 120, fireRate: 1.5, attackType: 'aoe_instant', splashRadius: 180, burnDamage: 20, burnDuration: 7 },
  genesis_verdict:       { tier: 4, damage: 200, fireRate: 2.0, attackType: 'piercing_beam', burnDamage: 25, burnDuration: 7, poisonDamage: 20, poisonDuration: 8 },
  pandemic_sovereign:    { tier: 4, damage: 60,  fireRate: 1.8, attackType: 'aoe_instant', splashRadius: 180, poisonDamage: 20, poisonDuration: 12, burnDamage: 20, burnDuration: 6 },
  world_breaker:         { tier: 4, damage: 160, fireRate: 3.0, attackType: 'splash', splashRadius: 110 },
  maelstrom_herald:      { tier: 4, damage: 80,  fireRate: 1.5, attackType: 'aoe_instant', splashRadius: 140 },
  solar_cremation:       { tier: 4, damage: 120, fireRate: 1.2, attackType: 'aoe_instant', splashRadius: 180, burnDamage: 60, burnDuration: 8 },

  // T5 (밸런스 오버홀 후 — config.js 실제 값과 동기화)
  omega_herald:        { tier: 5, damage: 350, fireRate: 0.8, attackType: 'chain', chainCount: 16, chainDecay: 0.92, burnDamage: 25, burnDuration: 7, poisonDamage: 18, poisonDuration: 8, armorPiercing: true },
  extinction_engine:   { tier: 5, damage: 120, fireRate: 1.5, attackType: 'aoe_instant', splashRadius: 220, poisonDamage: 18, poisonDuration: 8, burnDamage: 20, burnDuration: 6 },
  absolute_dominion:   { tier: 5, damage: 250, fireRate: 0.8, attackType: 'chain', chainCount: 14, chainDecay: 0.88, slowAmount: 0.9 },
  star_forge:          { tier: 5, damage: 120, fireRate: 0.8, attackType: 'aoe_instant', splashRadius: 220, burnDamage: 50, burnDuration: 8 },
  void_maelstrom:      { tier: 5, damage: 150, fireRate: 1.2, attackType: 'piercing_beam', burnDamage: 30, burnDuration: 7, poisonDamage: 25, poisonDuration: 8, armorPiercing: true },
};

// ── 웨이브 정의 (R1~R20 사전 정의) ────────────────────────────────

/**
 * R1~R20 사전 정의 웨이브.
 * 인덱스 0은 null (1-based 접근).
 * @type {Array<null|{enemies: Array<{type: string, count: number}>}>}
 */
const WAVE_DEFS = [
  null,
  { enemies: [{ type: 'normal', count: 5 }] },                                                         // R1
  { enemies: [{ type: 'normal', count: 8 }] },                                                         // R2
  { enemies: [{ type: 'normal', count: 8 }, { type: 'fast', count: 3 }] },                             // R3
  { enemies: [{ type: 'normal', count: 10 }, { type: 'fast', count: 2 }] },                            // R4
  { enemies: [{ type: 'normal', count: 8 }, { type: 'tank', count: 2 }, { type: 'fast', count: 3 }] }, // R5
  { enemies: [{ type: 'fast', count: 10 }, { type: 'swarm', count: 5 }] },                             // R6
  { enemies: [{ type: 'normal', count: 10 }, { type: 'tank', count: 3 }, { type: 'fast', count: 4 }] },// R7
  { enemies: [{ type: 'armored', count: 3 }, { type: 'normal', count: 8 }, { type: 'fast', count: 5 }] }, // R8
  { enemies: [{ type: 'swarm', count: 15 }, { type: 'normal', count: 5 }, { type: 'fast', count: 5 }] }, // R9
  { enemies: [{ type: 'boss', count: 1 }, { type: 'normal', count: 10 }] },                            // R10
  { enemies: [{ type: 'normal', count: 12 }, { type: 'fast', count: 6 }, { type: 'tank', count: 3 }] },// R11
  { enemies: [{ type: 'fast', count: 8 }, { type: 'armored', count: 4 }, { type: 'swarm', count: 10 }] }, // R12
  { enemies: [{ type: 'normal', count: 10 }, { type: 'splitter', count: 3 }, { type: 'tank', count: 4 }] }, // R13
  { enemies: [{ type: 'armored', count: 5 }, { type: 'fast', count: 10 }, { type: 'normal', count: 8 }] }, // R14
  { enemies: [{ type: 'tank', count: 6 }, { type: 'armored', count: 4 }, { type: 'swarm', count: 15 }] }, // R15
  { enemies: [{ type: 'fast', count: 12 }, { type: 'splitter', count: 4 }, { type: 'normal', count: 10 }] }, // R16
  { enemies: [{ type: 'armored', count: 6 }, { type: 'tank', count: 5 }, { type: 'fast', count: 8 }] }, // R17
  { enemies: [{ type: 'swarm', count: 20 }, { type: 'splitter', count: 5 }, { type: 'normal', count: 8 }] }, // R18
  { enemies: [{ type: 'tank', count: 8 }, { type: 'armored', count: 6 }, { type: 'fast', count: 10 }, { type: 'normal', count: 10 }] }, // R19
  { enemies: [{ type: 'boss_armored', count: 1 }, { type: 'tank', count: 5 }, { type: 'normal', count: 15 }] }, // R20
];

// ── R21+ 스케일링 상수 ──────────────────────────────────────────────

/** @const {Object} R21+ 절차 생성 스케일링 파라미터 */
const SCALING = {
  BASE_COUNT_ADD: 8,
  COUNT_PER_ROUND: 1.2,
  HP_SCALE_PER_ROUND: 0.15,
  SPEED_SCALE_PER_ROUND: 0.02,
  GOLD_SCALE_PER_ROUND: 0.06,
};

// ── 핵심 공식 ──────────────────────────────────────────────────────

/**
 * 라운드별 HP 스케일 값을 구간별 차등으로 계산한다.
 * @param {number} round - 라운드 번호
 * @param {Object} params - 밸런스 파라미터
 * @returns {number} HP 스케일 배율
 */
function calcHpScale(round, params) {
  const hs = params.hpScale;
  if (round <= 20) return 1 + (round - 1) * hs.r1_r20;
  const baseR20 = 1 + 19 * hs.r1_r20;
  if (round <= 35) return baseR20 + (round - 20) * hs.r21_r35;
  const baseR35 = baseR20 + 15 * hs.r21_r35;
  if (round <= 50) return baseR35 + (round - 35) * hs.r36_r50;
  const baseR50 = baseR35 + 15 * hs.r36_r50;
  return baseR50 + (round - 50) * hs.r51_plus;
}

/**
 * 라운드별 보스 HP 배율을 반환한다.
 * @param {number} round - 라운드 번호
 * @param {Object} params - 밸런스 파라미터
 * @returns {number} 보스 HP 배율
 */
function getBossHpMultiplier(round, params) {
  const bm = params.bossHpMultiplier;
  if (round <= 30) return bm.r_30;
  if (round <= 40) return bm.r_40;
  return bm.r_41_plus;
}

/**
 * 웨이브 클리어 보너스 골드를 계산한다.
 * @param {number} round - 라운드 번호
 * @param {number} currentHp - 현재 기지 HP
 * @param {Object} params - 밸런스 파라미터
 * @returns {number} 보너스 골드
 */
function calcWaveClearBonus(round, currentHp, params) {
  const wc = params.waveClearBonus;
  return round * wc.roundMultiplier + Math.floor((currentHp / MAX_BASE_HP) * wc.hpBonusMax);
}

// ── DPS 계산 ──────────────────────────────────────────────────────

/**
 * 공격 타입별 멀티타겟 보정 배율.
 * @type {Object<string, number|Function>}
 */
const MULTI_TARGET_MULTIPLIER = {
  single: 1.0,
  splash: 2.0,
  aoe_instant: 2.5,
  piercing_beam: 3.0,
  dot_single: 1.0,  // DoT는 별도 계산
};

/**
 * 체인 공격의 총 데미지 배율을 계산한다 (제곱 감쇠 공식).
 * hit i의 데미지 배율 = decay^(i*(i+1)/2) (삼각수 지수)
 * @param {number} chainCount - 체인 횟수
 * @param {number} chainDecay - 감쇠율
 * @returns {number} 총 배율
 */
function chainMultiplier(chainCount, chainDecay) {
  let total = 0;
  let current = 1.0;
  for (let i = 0; i < chainCount; i++) {
    total += current;
    // 다음 타격: decay^((i+1)*(i+2)/2) = current × decay^(i+1)
    current *= Math.pow(chainDecay, i + 1);
  }
  return total;
}

/**
 * 타워의 유효 DPS를 계산한다 (멀티타겟, DoT, 메타 업그레이드 포함).
 * 메타 업그레이드는 damage에만 1.1^n 적용, fireRate에 0.9^m 적용.
 * DoT(burn/poison) 자체 데미지는 메타 미반영, fireRate 감소로 재적용 빈도만 증가.
 * @param {Object} stats - 타워 스탯 객체
 * @param {{damageMult: number, fireRateMult: number}} [meta] - 메타 배율
 * @returns {number} 유효 DPS
 */
function calcEffectiveDps(stats, meta) {
  // 메타 적용된 기본 스탯
  const dmgMult = meta ? meta.damageMult : 1;
  const frMult = meta ? meta.fireRateMult : 1;
  const effectiveDamage = stats.damage * dmgMult;
  const effectiveFireRate = stats.fireRate * frMult;

  const baseDps = effectiveDamage / effectiveFireRate;
  let multiplier = 1.0;

  switch (stats.attackType) {
    case 'chain':
      multiplier = chainMultiplier(stats.chainCount || 1, stats.chainDecay || 1);
      break;
    case 'splash':
      multiplier = MULTI_TARGET_MULTIPLIER.splash;
      break;
    case 'aoe_instant':
      multiplier = MULTI_TARGET_MULTIPLIER.aoe_instant;
      break;
    case 'piercing_beam':
      multiplier = MULTI_TARGET_MULTIPLIER.piercing_beam;
      break;
    default:
      multiplier = 1.0;
  }

  let dps = baseDps * multiplier;

  // DoT 추가 DPS (화상) — burnDamage 자체는 메타 미반영, fireRate만 영향
  if (stats.burnDamage && stats.burnDuration) {
    dps += (stats.burnDamage * stats.burnDuration) / effectiveFireRate;
  }

  // DoT 추가 DPS (독) — poisonDamage 자체는 메타 미반영, fireRate만 영향
  if (stats.poisonDamage && stats.poisonDuration) {
    dps += (stats.poisonDamage * stats.poisonDuration) / effectiveFireRate;
  }

  return dps;
}

// ── 웨이브 생성 ──────────────────────────────────────────────────

/**
 * R21+ 동적 웨이브를 생성한다.
 * @param {number} round - 라운드 번호 (21 이상)
 * @returns {{enemies: Array<{type: string, count: number}>}}
 */
function generateWave(round) {
  const baseCount = SCALING.BASE_COUNT_ADD + Math.floor(round * SCALING.COUNT_PER_ROUND);
  const isBoss = (round % 10 === 0);
  const enemies = [];

  if (isBoss) {
    enemies.push({ type: 'boss_armored', count: 1 });
  }

  // 잔여 적 수 배분 (결정론적: 랜덤 없이 비율 기반)
  const unitCount = isBoss ? baseCount - 1 : baseCount;

  // 라운드 높을수록 특수적 비율 증가
  const armoredRatio = round >= 20 ? 0.12 : 0;
  const splitterRatio = round >= 18 ? 0.10 : 0;
  const swarmRatio = round >= 15 ? 0.15 : 0;
  const specialTotal = armoredRatio + splitterRatio + swarmRatio;
  const normalRatio = (1 - specialTotal) * 0.5;
  const fastRatio = (1 - specialTotal) * 0.3;
  const tankRatio = (1 - specialTotal) * 0.2;

  const counts = {
    armored: Math.round(unitCount * armoredRatio),
    splitter: Math.round(unitCount * splitterRatio),
    swarm: Math.round(unitCount * swarmRatio),
    normal: Math.round(unitCount * normalRatio),
    fast: Math.round(unitCount * fastRatio),
    tank: Math.round(unitCount * tankRatio),
  };

  // 반올림 보정 (잔여를 normal에 추가)
  const totalAssigned = Object.values(counts).reduce((s, v) => s + v, 0);
  counts.normal += unitCount - totalAssigned;

  for (const [type, count] of Object.entries(counts)) {
    if (count > 0) enemies.push({ type, count });
  }

  return { enemies };
}

/**
 * 라운드의 웨이브 정의를 반환한다.
 * @param {number} round - 라운드 번호
 * @returns {{enemies: Array<{type: string, count: number}>}}
 */
function getWaveDef(round) {
  if (round <= 20 && WAVE_DEFS[round]) return WAVE_DEFS[round];
  return generateWave(round);
}

// ── 웨이브 적 HP/골드 합산 ────────────────────────────────────────

/**
 * 웨이브의 총 적 HP와 킬 골드를 계산한다.
 * @param {number} round - 라운드 번호
 * @param {Object} params - 밸런스 파라미터
 * @returns {{totalHp: number, totalGold: number, totalDamage: number, enemyCount: number}}
 */
function calcWaveStats(round, params) {
  const waveDef = getWaveDef(round);
  const hpScale = calcHpScale(round, params);

  let totalHp = 0;
  let totalGold = 0;
  let totalDamage = 0;
  let enemyCount = 0;

  for (const group of waveDef.enemies) {
    const base = ENEMY_STATS[group.type];
    const isBossType = group.type === 'boss' || group.type === 'boss_armored';

    let hp = base.hp * hpScale;
    if (isBossType) {
      hp *= getBossHpMultiplier(round, params);
    }

    // 방어력 적용: 실질 HP = hp / (1 - resistance) (방어 관통 없는 평균 타워 기준)
    const effectiveHp = base.resistance > 0 ? hp / (1 - base.resistance * 0.5) : hp;

    const goldScale = round > 20 ? 1 + (round - 1) * SCALING.GOLD_SCALE_PER_ROUND : 1;
    const gold = base.gold * goldScale;

    totalHp += effectiveHp * group.count;
    totalGold += gold * group.count;
    totalDamage += base.damage * group.count;
    enemyCount += group.count;
  }

  return {
    totalHp: Math.round(totalHp),
    totalGold: Math.round(totalGold),
    totalDamage,
    enemyCount,
  };
}

// ── 경로 통과 시간 ──────────────────────────────────────────────────

/**
 * 웨이브의 평균 경로 통과 시간을 계산한다.
 * 전체 적의 가중평균 속도를 사용해 경로 거리 / 속도를 구한다.
 * @param {number} round - 라운드 번호
 * @returns {number} 평균 통과 시간 (초)
 */
function calcAveragePassTime(round) {
  const waveDef = getWaveDef(round);
  let totalSpeed = 0;
  let count = 0;

  for (const group of waveDef.enemies) {
    const speedScale = round > 20 ? 1 + (round - 1) * SCALING.SPEED_SCALE_PER_ROUND : 1;
    totalSpeed += ENEMY_STATS[group.type].speed * speedScale * group.count;
    count += group.count;
  }

  const avgSpeed = totalSpeed / Math.max(count, 1);
  return PATH_TOTAL_DISTANCE / avgSpeed;
}

// ── AI 전략 ──────────────────────────────────────────────────────

/**
 * 타워 진영 상태를 표현하는 객체.
 * @typedef {Object} TowerState
 * @property {Array<{id: string, tier: number, cost: number}>} towers - 배치된 타워 목록
 * @property {number} totalDps - 총 유효 DPS
 * @property {number} towerCount - 배치된 타워 수
 * @property {number} maxTier - 최고 티어
 */

/**
 * 타워를 배치하고 DPS를 추적하는 진영 관리 클래스.
 * 메타 업그레이드 지원: 각 타워의 sourceType(원본 T1 타입)을 추적하여
 * 메타 보너스를 DPS에 반영한다.
 */
class TowerArmy {
  /**
   * @param {'none'|'half'|'full'} [metaLevel='none'] - 메타 업그레이드 프리셋
   */
  constructor(metaLevel = 'none') {
    /** @type {Array<{id: string, tier: number, cost: number, dps: number, sourceType: string}>} */
    this.towers = [];
    this.totalDps = 0;
    /** @type {'none'|'half'|'full'} 메타 업그레이드 프리셋 */
    this.metaLevel = metaLevel;
  }

  /**
   * T1 타워를 추가한다.
   * @param {string} type - 타워 타입명
   * @returns {number} 비용
   */
  addT1(type) {
    const stats = TOWER_STATS[type];
    const meta = getMetaMultipliers(type, this.metaLevel);
    const dps = calcEffectiveDps(stats, meta);
    this.towers.push({ id: type, tier: 1, cost: stats.cost, dps, sourceType: type });
    this.totalDps += dps;
    return stats.cost;
  }

  /**
   * 두 타워를 합성한다 (인덱스 기반). 첫 번째 타워가 합성 결과로 변환되고 두 번째는 제거.
   * 합성 결과는 첫 번째 타워(idxA)의 sourceType을 상속한다 (게임 로직과 동일).
   * @param {number} idxA - 첫 번째 타워 인덱스
   * @param {number} idxB - 두 번째 타워 인덱스
   * @param {string} mergeId - 합성 결과 ID
   * @returns {boolean} 합성 성공 여부
   */
  merge(idxA, idxB, mergeId) {
    const mergedStats = MERGED_STATS[mergeId];
    if (!mergedStats) return false;

    const oldDpsA = this.towers[idxA].dps;
    const oldDpsB = this.towers[idxB].dps;
    // 합성 결과 타워는 idxA의 sourceType 상속 → 메타 보너스 유지
    const inheritedSourceType = this.towers[idxA].sourceType;
    const meta = getMetaMultipliers(inheritedSourceType, this.metaLevel);
    const newDps = calcEffectiveDps(mergedStats, meta);

    this.towers[idxA] = {
      id: mergeId,
      tier: mergedStats.tier,
      cost: 0, // 합성 비용 = 0
      dps: newDps,
      sourceType: inheritedSourceType,
    };

    // 두 번째 타워 제거
    this.towers.splice(idxB, 1);
    this.totalDps = this.totalDps - oldDpsA - oldDpsB + newDps;
    return true;
  }

  /**
   * 특정 ID를 가진 타워의 인덱스 목록을 반환한다.
   * @param {string} id - 타워 ID
   * @returns {number[]} 인덱스 배열
   */
  findById(id) {
    const indices = [];
    for (let i = 0; i < this.towers.length; i++) {
      if (this.towers[i].id === id) indices.push(i);
    }
    return indices;
  }

  /**
   * 합성 가능한 쌍을 찾아 합성을 시도한다.
   * @param {string} idA - 첫 번째 재료 ID
   * @param {string} idB - 두 번째 재료 ID
   * @param {string} mergeId - 합성 결과 ID
   * @returns {boolean} 합성 성공 여부
   */
  tryMerge(idA, idB, mergeId) {
    if (idA === idB) {
      // 동종 합성: 같은 ID 2개 필요
      const indices = this.findById(idA);
      if (indices.length < 2) return false;
      return this.merge(indices[0], indices[1], mergeId);
    }
    // 이종 합성
    const indicesA = this.findById(idA);
    const indicesB = this.findById(idB);
    if (indicesA.length === 0 || indicesB.length === 0) return false;
    return this.merge(indicesA[0], indicesB[0], mergeId);
  }

  /** @returns {number} 배치된 타워 수 */
  get count() { return this.towers.length; }

  /** @returns {number} 최고 티어 */
  get maxTier() {
    return this.towers.reduce((m, t) => Math.max(m, t.tier), 0);
  }

  /**
   * 티어별 타워 수를 집계한다.
   * @returns {Object<number, number>} {tier: count}
   */
  tierCounts() {
    const counts = {};
    for (const t of this.towers) {
      counts[t.tier] = (counts[t.tier] || 0) + 1;
    }
    return counts;
  }

  /**
   * 타워 진영 요약 문자열을 반환한다.
   * @returns {string} 예: "T1x8 T2x2 T3x1"
   */
  summary() {
    const tc = this.tierCounts();
    return Object.entries(tc)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([tier, count]) => `T${tier}x${count}`)
      .join(' ');
  }
}

// ── 합성 레시피 (전략에서 사용하는 경로) ───────────────────────────

/**
 * @typedef {Object} MergeRecipe
 * @property {string} idA - 첫 번째 재료
 * @property {string} idB - 두 번째 재료
 * @property {string} result - 합성 결과
 */

/** 동종 합성 T1+T1 → T2 매핑 */
const SAME_MERGE = {
  archer: 'rapid_archer',
  mage: 'overload_mage',
  ice: 'zero_field',
  lightning: 'thunder_lord',
  flame: 'inferno',
  rock: 'quake',
  poison: 'plague',
  wind: 'typhoon',
  light: 'solar_burst',
  dragon: 'ancient_dragon',
};

// ── 빌드 오더 정의 (T5 경로별 구매+합성 시퀀스) ──────────────────

/**
 * 빌드 오더 단계.
 * @typedef {Object} BuildStep
 * @property {'buy'|'merge'} action - 행동 유형 (구매 / 합성)
 * @property {string} [type] - 구매할 T1 타워 타입 (action='buy' 시)
 * @property {string} [idA] - 합성 재료 A (action='merge' 시)
 * @property {string} [idB] - 합성 재료 B (action='merge' 시)
 * @property {string} [result] - 합성 결과 ID (action='merge' 시)
 */

/**
 * void_maelstrom (공허 소용돌이) 빌드 오더.
 * 필요 T1: 3 dragon + 3 lightning + 1 mage + 3 wind = 10개, 총 1310g
 * @type {BuildStep[]}
 */
const BUILD_ORDER_VOID_MAELSTROM = [
  // ancient_dragon = dragon + dragon
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'dragon' },
  { action: 'merge', idA: 'dragon', idB: 'dragon', result: 'ancient_dragon' },
  // primal_dragon_lord = ancient_dragon + dragon
  { action: 'buy', type: 'dragon' },
  { action: 'merge', idA: 'ancient_dragon', idB: 'dragon', result: 'primal_dragon_lord' },
  // annihilation_gale = primal_dragon_lord + wind
  { action: 'buy', type: 'wind' },
  { action: 'merge', idA: 'primal_dragon_lord', idB: 'wind', result: 'annihilation_gale' },
  // storm_mage = lightning + mage
  { action: 'buy', type: 'lightning' },
  { action: 'buy', type: 'mage' },
  { action: 'merge', idA: 'lightning', idB: 'mage', result: 'storm_mage' },
  // thunder_lord = lightning + lightning
  { action: 'buy', type: 'lightning' },
  { action: 'buy', type: 'lightning' },
  { action: 'merge', idA: 'lightning', idB: 'lightning', result: 'thunder_lord' },
  // lightning_tempest = storm_mage + thunder_lord
  { action: 'merge', idA: 'storm_mage', idB: 'thunder_lord', result: 'lightning_tempest' },
  // typhoon = wind + wind
  { action: 'buy', type: 'wind' },
  { action: 'buy', type: 'wind' },
  { action: 'merge', idA: 'wind', idB: 'wind', result: 'typhoon' },
  // maelstrom_herald = lightning_tempest + typhoon
  { action: 'merge', idA: 'lightning_tempest', idB: 'typhoon', result: 'maelstrom_herald' },
  // void_maelstrom = annihilation_gale + maelstrom_herald
  { action: 'merge', idA: 'annihilation_gale', idB: 'maelstrom_herald', result: 'void_maelstrom' },
];

/**
 * absolute_dominion (절대 지배) 빌드 오더.
 * 필요 T1: 3 dragon + 3 ice + 4 lightning = 10개, 총 1455g
 * @type {BuildStep[]}
 */
const BUILD_ORDER_ABSOLUTE_DOMINION = [
  // frost_dragon = dragon + ice
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'ice' },
  { action: 'merge', idA: 'dragon', idB: 'ice', result: 'frost_dragon' },
  // zero_field = ice + ice
  { action: 'buy', type: 'ice' },
  { action: 'buy', type: 'ice' },
  { action: 'merge', idA: 'ice', idB: 'ice', result: 'zero_field' },
  // absolute_frost_domain = frost_dragon + zero_field
  { action: 'merge', idA: 'frost_dragon', idB: 'zero_field', result: 'absolute_frost_domain' },
  // glacial_epoch = absolute_frost_domain + ice (추가 ice 필요 -- 정정: config에서 확인)
  // 실제: absolute_frost_domain + ice → glacial_epoch (T4)
  // 하지만 이미 ice 3개 사용. 빌드 트리 재확인:
  // glacial_epoch = absolute_frost_domain(T3) + ice(T1) → 추가 ice 1개 필요
  // 그러면 총 ice = 4개, dragon = 1 + 2(ancient) = 3, lightning = 4
  // 그런데 스펙에서 3 ice라고 했으므로 frost_dragon에 ice 1, zero_field에 ice 2 = 3개
  // 여기에 glacial_epoch에 ice 1 추가 = 총 ice 4개
  // 스펙의 "3 dragon + 3 ice + 4 lightning = 총 1455g"은 비용 검증:
  // 3*250 + 3*75 + 4*120 = 750 + 225 + 480 = 1455g -> ice 3개만으로 1455g
  // ice 4개면: 750 + 300 + 480 = 1530g != 1455g
  // 따라서 스펙의 합성 경로를 정확히 따라야 함
  // 스펙: glacial_epoch = absolute_frost_domain(T3) + ice(T1)
  // absolute_frost_domain = frost_dragon(T2) + zero_field(T2)
  // frost_dragon = dragon + ice (ice 1개)
  // zero_field = ice + ice (ice 2개)
  // 총 ice: 1 + 2 + 1(glacial_epoch) = 4개
  // 하지만 스펙에 3 ice라고 적혀있으나, 비용 1455g는 3 ice 기준 (225g)
  // 4 ice면 1530g. 스펙의 비용이 맞다면 경로가 다른 것.
  // config 확인: 'absolute_frost_domain+ice' → glacial_epoch 맞음
  // 경로 재계산: dragon 3 + ice 4 + lightning 4 = 750+300+480 = 1530g
  // 스펙 비용(1455g)과 불일치. 스펙의 비용이 오류이므로 실제 합성 트리 기반으로 구현.
  { action: 'buy', type: 'ice' },
  { action: 'merge', idA: 'absolute_frost_domain', idB: 'ice', result: 'glacial_epoch' },
  // ancient_dragon = dragon + dragon
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'dragon' },
  { action: 'merge', idA: 'dragon', idB: 'dragon', result: 'ancient_dragon' },
  // thunder_lord (1) = lightning + lightning
  { action: 'buy', type: 'lightning' },
  { action: 'buy', type: 'lightning' },
  { action: 'merge', idA: 'lightning', idB: 'lightning', result: 'thunder_lord' },
  // thunder_wyrm_king = ancient_dragon + thunder_lord
  { action: 'merge', idA: 'ancient_dragon', idB: 'thunder_lord', result: 'thunder_wyrm_king' },
  // thunder_lord (2) = lightning + lightning
  { action: 'buy', type: 'lightning' },
  { action: 'buy', type: 'lightning' },
  { action: 'merge', idA: 'lightning', idB: 'lightning', result: 'thunder_lord' },
  // storm_dominion = thunder_lord + thunder_wyrm_king
  { action: 'merge', idA: 'thunder_lord', idB: 'thunder_wyrm_king', result: 'storm_dominion' },
  // absolute_dominion = glacial_epoch + storm_dominion
  { action: 'merge', idA: 'glacial_epoch', idB: 'storm_dominion', result: 'absolute_dominion' },
];

/**
 * star_forge (항성 용광로) 빌드 오더.
 * 필요 T1: 5 flame + 1 dragon + 2 rock + 1 mage + 2 light = 11개, 총 1280g
 * @type {BuildStep[]}
 */
const BUILD_ORDER_STAR_FORGE = [
  // inferno_dragon = dragon + flame
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'flame' },
  { action: 'merge', idA: 'dragon', idB: 'flame', result: 'inferno_dragon' },
  // quake = rock + rock
  { action: 'buy', type: 'rock' },
  { action: 'buy', type: 'rock' },
  { action: 'merge', idA: 'rock', idB: 'rock', result: 'quake' },
  // hellquake = inferno_dragon + quake
  { action: 'merge', idA: 'inferno_dragon', idB: 'quake', result: 'hellquake' },
  // magma_core = flame + hellquake
  { action: 'buy', type: 'flame' },
  { action: 'merge', idA: 'flame', idB: 'hellquake', result: 'magma_core' },
  // inferno = flame + flame
  { action: 'buy', type: 'flame' },
  { action: 'buy', type: 'flame' },
  { action: 'merge', idA: 'flame', idB: 'flame', result: 'inferno' },
  // pyromancer = flame + mage
  { action: 'buy', type: 'flame' },
  { action: 'buy', type: 'mage' },
  { action: 'merge', idA: 'flame', idB: 'mage', result: 'pyromancer' },
  // grand_pyromancer = inferno + pyromancer
  { action: 'merge', idA: 'inferno', idB: 'pyromancer', result: 'grand_pyromancer' },
  // solar_burst = light + light
  { action: 'buy', type: 'light' },
  { action: 'buy', type: 'light' },
  { action: 'merge', idA: 'light', idB: 'light', result: 'solar_burst' },
  // solar_cremation = grand_pyromancer + solar_burst
  { action: 'merge', idA: 'grand_pyromancer', idB: 'solar_burst', result: 'solar_cremation' },
  // star_forge = magma_core + solar_cremation
  { action: 'merge', idA: 'magma_core', idB: 'solar_cremation', result: 'star_forge' },
];

/**
 * omega_herald (오메가 전령) 빌드 오더.
 * 필요 T1: 1 archer + 4 dragon + 7 light = 12개, 총 1960g
 * @type {BuildStep[]}
 */
const BUILD_ORDER_OMEGA_HERALD = [
  // holy_dragon = dragon + light
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'light' },
  { action: 'merge', idA: 'dragon', idB: 'light', result: 'holy_dragon' },
  // solar_burst (1) = light + light
  { action: 'buy', type: 'light' },
  { action: 'buy', type: 'light' },
  { action: 'merge', idA: 'light', idB: 'light', result: 'solar_burst' },
  // celestial_judgment = holy_dragon + solar_burst
  { action: 'merge', idA: 'holy_dragon', idB: 'solar_burst', result: 'celestial_judgment' },
  // ancient_dragon (1) = dragon + dragon
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'dragon' },
  { action: 'merge', idA: 'dragon', idB: 'dragon', result: 'ancient_dragon' },
  // solar_burst (2) = light + light
  { action: 'buy', type: 'light' },
  { action: 'buy', type: 'light' },
  { action: 'merge', idA: 'light', idB: 'light', result: 'solar_burst' },
  // cosmos_dragon (1) = ancient_dragon + solar_burst
  { action: 'merge', idA: 'ancient_dragon', idB: 'solar_burst', result: 'cosmos_dragon' },
  // genesis_verdict = celestial_judgment + cosmos_dragon
  { action: 'merge', idA: 'celestial_judgment', idB: 'cosmos_dragon', result: 'genesis_verdict' },
  // archer 1개 (void_sniper = archer + cosmos_dragon)
  { action: 'buy', type: 'archer' },
  // ancient_dragon (2) = dragon + dragon (dragon 이미 소진 → 추가 구매)
  // 스펙: 4 dragon이므로 이미 3개 사용, 1 dragon 남음 → 하지만 2개 더 필요
  // 실제: 총 dragon 필요 = 1(holy_dragon) + 2(ancient_dragon 1) + 2(ancient_dragon 2) = 5?
  // 스펙에서 4 dragon이라 했으나 검증:
  //   holy_dragon: 1 dragon + 1 light
  //   ancient_dragon(1): 2 dragon
  //   ancient_dragon(2): 2 dragon
  //   합계: 5 dragon → 스펙 불일치. 하지만 1960g = 1*50 + 4*250 + 7*130 = 50+1000+910 = 1960
  //   5 dragon이면: 50 + 1250 + 910 = 2210g. 스펙 비용(1960g)은 4 dragon 기준
  //   4 dragon이면 ancient_dragon(2)에 dragon 1개만 사용? 불가능.
  //   재검토: cosmos_dragon 2개 필요하지만, 두 번째는 void_sniper 경로:
  //     void_sniper = archer + cosmos_dragon
  //     cosmos_dragon = ancient_dragon + solar_burst
  //     ancient_dragon = dragon + dragon
  //   따라서 5 dragon + 1 archer + 7 light = 1250+50+910 = 2210g
  //   스펙의 비용과 불일치. 스펙에서 제시한 경로를 정확히 구현하되, 실제 비용은 다를 수 있음.
  { action: 'buy', type: 'dragon' },
  // 여기서 추가 dragon 필요 - 하지만 이미 4개 dragon 구매 계획
  // 빌드 오더 재구성: 실제 config 기반으로 정확히 구현
  // void_sniper = archer + cosmos_dragon 이므로 cosmos_dragon 2번째가 필요
  // cosmos_dragon = ancient_dragon + solar_burst
  // ancient_dragon = dragon + dragon (추가 2 dragon 필요)
  { action: 'buy', type: 'dragon' },
  { action: 'merge', idA: 'dragon', idB: 'dragon', result: 'ancient_dragon' },
  // solar_burst (3) = light + light
  { action: 'buy', type: 'light' },
  { action: 'buy', type: 'light' },
  { action: 'merge', idA: 'light', idB: 'light', result: 'solar_burst' },
  // cosmos_dragon (2) = ancient_dragon + solar_burst
  { action: 'merge', idA: 'ancient_dragon', idB: 'solar_burst', result: 'cosmos_dragon' },
  // void_sniper = archer + cosmos_dragon
  { action: 'merge', idA: 'archer', idB: 'cosmos_dragon', result: 'void_sniper' },
  // omega_herald = genesis_verdict + void_sniper
  { action: 'merge', idA: 'genesis_verdict', idB: 'void_sniper', result: 'omega_herald' },
];

/**
 * extinction_engine (소멸 기관) 빌드 오더.
 * 필요 T1: 3 dragon + 5 poison + 5 rock = 13개, 총 1775g
 * @type {BuildStep[]}
 */
const BUILD_ORDER_EXTINCTION_ENGINE = [
  // ancient_dragon = dragon + dragon
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'dragon' },
  { action: 'merge', idA: 'dragon', idB: 'dragon', result: 'ancient_dragon' },
  // plague = poison + poison
  { action: 'buy', type: 'poison' },
  { action: 'buy', type: 'poison' },
  { action: 'merge', idA: 'poison', idB: 'poison', result: 'plague' },
  // plague_wyrm = ancient_dragon + plague
  { action: 'merge', idA: 'ancient_dragon', idB: 'plague', result: 'plague_wyrm' },
  // plague (2) = poison + poison
  { action: 'buy', type: 'poison' },
  { action: 'buy', type: 'poison' },
  { action: 'merge', idA: 'poison', idB: 'poison', result: 'plague' },
  // venom_dragon = dragon + poison
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'poison' },
  { action: 'merge', idA: 'dragon', idB: 'poison', result: 'venom_dragon' },
  // venom_sovereign = plague + venom_dragon
  { action: 'merge', idA: 'plague', idB: 'venom_dragon', result: 'venom_sovereign' },
  // pandemic_sovereign = plague_wyrm + venom_sovereign
  { action: 'merge', idA: 'plague_wyrm', idB: 'venom_sovereign', result: 'pandemic_sovereign' },
  // quake (1) = rock + rock
  { action: 'buy', type: 'rock' },
  { action: 'buy', type: 'rock' },
  { action: 'merge', idA: 'rock', idB: 'rock', result: 'quake' },
  // earth_shatterer = quake + rock
  { action: 'buy', type: 'rock' },
  { action: 'merge', idA: 'quake', idB: 'rock', result: 'earth_shatterer' },
  // quake (2) = rock + rock
  { action: 'buy', type: 'rock' },
  { action: 'buy', type: 'rock' },
  { action: 'merge', idA: 'rock', idB: 'rock', result: 'quake' },
  // stone_dragon = dragon + rock (dragon 이미 3개 사용 → 추가 필요)
  // 스펙: 3 dragon이지만, plague_wyrm에 2, venom_dragon에 1 = 3개 소진
  // stone_dragon에 1 dragon 더 필요 → 스펙 불일치 가능
  // 실제 경로: stone_dragon = dragon + rock, tectonic_dragon = quake + stone_dragon
  // 추가 dragon 1개 + rock 1개 필요
  // 그러면 dragon 4 + poison 5 + rock 6 = 1000+475+660 = 2135g
  // 스펙(1775g)과 불일치. 스펙의 T1 수량을 정확히 재검증하면:
  //   pandemic_sovereign: dragon 2 + poison 4 + dragon 1 + poison 1 = dragon 3 + poison 5
  //   world_breaker: rock 2 + rock 1 + rock 2 + dragon 1 + rock 1 = dragon 1 + rock 6
  //   합계: dragon 4 + poison 5 + rock 6 → 스펙의 "3 dragon + 5 poison + 5 rock"은 오류
  // 실제 config 기반으로 구현 (dragon 4 + poison 5 + rock 6)
  { action: 'buy', type: 'dragon' },
  { action: 'buy', type: 'rock' },
  { action: 'merge', idA: 'dragon', idB: 'rock', result: 'stone_dragon' },
  // tectonic_dragon = quake + stone_dragon
  { action: 'merge', idA: 'quake', idB: 'stone_dragon', result: 'tectonic_dragon' },
  // world_breaker = earth_shatterer + tectonic_dragon
  { action: 'merge', idA: 'earth_shatterer', idB: 'tectonic_dragon', result: 'world_breaker' },
  // extinction_engine = pandemic_sovereign + world_breaker
  { action: 'merge', idA: 'pandemic_sovereign', idB: 'world_breaker', result: 'extinction_engine' },
];

// ── 빌드 오더 비용 계산 유틸 ─────────────────────────────────────

/**
 * 빌드 오더의 총 T1 구매 비용을 계산한다.
 * @param {BuildStep[]} buildOrder - 빌드 오더
 * @returns {number} 총 비용 (gold)
 */
function calcBuildOrderCost(buildOrder) {
  let total = 0;
  for (const step of buildOrder) {
    if (step.action === 'buy') {
      total += TOWER_STATS[step.type].cost;
    }
  }
  return total;
}

// ── 시나리오 전략 정의 ──────────────────────────────────────────────

/**
 * 전략 인터페이스: 매 라운드 시작 시 호출되어 타워 구매/합성 결정.
 * @callback StrategyFn
 * @param {Object} state - {gold, army, round, params}
 * @returns {number} 소비한 골드
 */

/** @const {string} 필러 타워 타입 (가장 저렴한 T1) */
const FILLER_TYPE = 'archer';
/** @const {number} 필러 타워 비용 */
const FILLER_COST = TOWER_STATS[FILLER_TYPE].cost;

/**
 * 슬롯이 부족할 때 가장 낮은 DPS의 필러 T1 타워를 판매한다.
 * 판매 시 골드를 sellRatio만큼 회수하고 슬롯 1개를 확보한다.
 * @param {TowerArmy} army - 타워 진영
 * @param {Object} params - 밸런스 파라미터 (sellRatio 포함)
 * @returns {number} 회수한 골드 (0이면 판매할 필러 없음)
 */
function sellLowestFiller(army, params) {
  // 필러 T1만 판매 대상 (tier 1 + FILLER_TYPE인 것)
  let lowestIdx = -1;
  let lowestDps = Infinity;

  for (let i = 0; i < army.towers.length; i++) {
    const t = army.towers[i];
    if (t.tier === 1 && t.id === FILLER_TYPE && t.dps < lowestDps) {
      lowestDps = t.dps;
      lowestIdx = i;
    }
  }

  if (lowestIdx === -1) return 0;

  const tower = army.towers[lowestIdx];
  const refund = Math.floor(tower.cost * params.sellRatio);
  army.totalDps -= tower.dps;
  army.towers.splice(lowestIdx, 1);
  return refund;
}

/**
 * T5 빌드 오더 기반 전략을 생성한다.
 * 매 라운드 시작 시:
 * 1. 빌드 오더의 다음 단계를 가능한 만큼 실행 (구매+합성)
 * 2. T5 완성 시 빌드 오더 리셋하여 다음 T5 제작 시작 (도배)
 * 3. 여유 골드로 필러 타워(archer) 배치
 * 4. 슬롯 부족 시 필러 판매로 슬롯 확보
 *
 * @param {string} name - 시나리오 이름
 * @param {string} description - 시나리오 설명
 * @param {BuildStep[]} buildOrder - 빌드 오더
 * @returns {{name: string, fn: StrategyFn, description: string}}
 */
function createBuildOrderStrategy(name, description, buildOrder) {
  return {
    name,
    description,
    fn: (state) => {
      const { army, params } = state;
      let gold = state.gold;
      let spent = 0;

      // 빌드 진행 상태를 army에 저장 (라운드 간 유지)
      if (army._buildIdx === undefined) {
        army._buildIdx = 0;
      }

      // 빌드 오더를 가능한 만큼 진행
      let progress = true;
      while (progress) {
        progress = false;

        // 현재 빌드 오더 위치
        const stepIdx = army._buildIdx % buildOrder.length;
        const step = buildOrder[stepIdx];

        if (step.action === 'buy') {
          const cost = TOWER_STATS[step.type].cost;
          // 슬롯 부족 시 필러 판매 시도
          while (army.count >= MAX_SLOTS) {
            const refund = sellLowestFiller(army, params);
            if (refund === 0) break; // 판매할 필러 없음
            gold += refund;
          }
          if (gold >= cost && army.count < MAX_SLOTS) {
            army.addT1(step.type);
            gold -= cost;
            spent += cost;
            army._buildIdx++;
            progress = true;
          }
        } else if (step.action === 'merge') {
          // 합성 비용 체크 (밸런스 오버홀: 티어별 골드 비용)
          const resultTier = MERGED_STATS[step.result] ? MERGED_STATS[step.result].tier : 0;
          const mCost = (params.mergeCost && params.mergeCost[resultTier]) || 0;
          if (mCost > 0 && gold < mCost) break; // 골드 부족 시 대기

          const ok = army.tryMerge(step.idA, step.idB, step.result);
          if (ok) {
            if (mCost > 0) {
              gold -= mCost;
              spent += mCost;
            }
            army._buildIdx++;
            progress = true;

            // T5 완성 시 빌드 오더 리셋 (다음 T5 제작)
            if (resultTier === 5) {
              army._buildIdx = 0;
            }
          }
        }
      }

      // 여유 골드로 필러 타워 배치 (DPS 보충)
      while (gold >= FILLER_COST && army.count < MAX_SLOTS) {
        army.addT1(FILLER_TYPE);
        gold -= FILLER_COST;
        spent += FILLER_COST;
      }

      return spent;
    },
  };
}

/**
 * balanced_t3_defense 전략: T3를 다양하게 만들며 방어.
 * T5를 목표로 하지 않고 T3 다수를 배치하는 전략.
 * 4종 T1(dragon, ice, lightning, flame)으로 다양한 T2→T3 합성을 수행.
 * @returns {{name: string, fn: StrategyFn, description: string}}
 */
function createBalancedT3Defense() {
  /**
   * T3 합성 경로 (순환적으로 반복).
   * 각 경로는 T1 구매 → T2 합성 → T3 합성의 빌드 오더 조각.
   */
  const t3Routes = [
    // thunder_wyrm_king = ancient_dragon(T2) + thunder_lord(T2)
    // ancient_dragon = dragon + dragon, thunder_lord = lightning + lightning
    [
      { action: 'buy', type: 'dragon' },
      { action: 'buy', type: 'dragon' },
      { action: 'merge', idA: 'dragon', idB: 'dragon', result: 'ancient_dragon' },
      { action: 'buy', type: 'lightning' },
      { action: 'buy', type: 'lightning' },
      { action: 'merge', idA: 'lightning', idB: 'lightning', result: 'thunder_lord' },
      { action: 'merge', idA: 'ancient_dragon', idB: 'thunder_lord', result: 'thunder_wyrm_king' },
    ],
    // absolute_frost_domain = frost_dragon(T2) + zero_field(T2)
    // frost_dragon = dragon + ice, zero_field = ice + ice
    [
      { action: 'buy', type: 'dragon' },
      { action: 'buy', type: 'ice' },
      { action: 'merge', idA: 'dragon', idB: 'ice', result: 'frost_dragon' },
      { action: 'buy', type: 'ice' },
      { action: 'buy', type: 'ice' },
      { action: 'merge', idA: 'ice', idB: 'ice', result: 'zero_field' },
      { action: 'merge', idA: 'frost_dragon', idB: 'zero_field', result: 'absolute_frost_domain' },
    ],
    // lightning_tempest = storm_mage(T2) + thunder_lord(T2)
    // storm_mage = lightning + mage, thunder_lord = lightning + lightning
    [
      { action: 'buy', type: 'lightning' },
      { action: 'buy', type: 'mage' },
      { action: 'merge', idA: 'lightning', idB: 'mage', result: 'storm_mage' },
      { action: 'buy', type: 'lightning' },
      { action: 'buy', type: 'lightning' },
      { action: 'merge', idA: 'lightning', idB: 'lightning', result: 'thunder_lord' },
      { action: 'merge', idA: 'storm_mage', idB: 'thunder_lord', result: 'lightning_tempest' },
    ],
    // hellquake = inferno_dragon(T2) + quake(T2)
    // inferno_dragon = dragon + flame, quake = rock + rock
    [
      { action: 'buy', type: 'dragon' },
      { action: 'buy', type: 'flame' },
      { action: 'merge', idA: 'dragon', idB: 'flame', result: 'inferno_dragon' },
      { action: 'buy', type: 'rock' },
      { action: 'buy', type: 'rock' },
      { action: 'merge', idA: 'rock', idB: 'rock', result: 'quake' },
      { action: 'merge', idA: 'inferno_dragon', idB: 'quake', result: 'hellquake' },
    ],
  ];

  return {
    name: 'balanced_t3_defense',
    description: 'T3 다양 배치 (thunder_wyrm_king, absolute_frost_domain, lightning_tempest, hellquake 순환)',
    fn: (state) => {
      const { army, params } = state;
      let gold = state.gold;
      let spent = 0;

      // 빌드 상태 초기화
      if (army._t3RouteIdx === undefined) {
        army._t3RouteIdx = 0;    // 현재 T3 경로 인덱스
        army._t3StepIdx = 0;     // 현재 경로 내 스텝 인덱스
      }

      // 현재 T3 경로의 빌드 오더를 가능한 만큼 진행
      let progress = true;
      while (progress) {
        progress = false;

        const route = t3Routes[army._t3RouteIdx % t3Routes.length];
        const step = route[army._t3StepIdx];

        if (!step) {
          // 현재 경로 완료 → 다음 경로로
          army._t3RouteIdx++;
          army._t3StepIdx = 0;
          progress = true;
          continue;
        }

        if (step.action === 'buy') {
          const cost = TOWER_STATS[step.type].cost;
          while (army.count >= MAX_SLOTS) {
            const refund = sellLowestFiller(army, params);
            if (refund === 0) break;
            gold += refund;
          }
          if (gold >= cost && army.count < MAX_SLOTS) {
            army.addT1(step.type);
            gold -= cost;
            spent += cost;
            army._t3StepIdx++;
            progress = true;
          }
        } else if (step.action === 'merge') {
          // 합성 비용 체크 (밸런스 오버홀)
          const rTier = MERGED_STATS[step.result] ? MERGED_STATS[step.result].tier : 0;
          const mCost = (params.mergeCost && params.mergeCost[rTier]) || 0;
          if (mCost > 0 && gold < mCost) break;

          const ok = army.tryMerge(step.idA, step.idB, step.result);
          if (ok) {
            if (mCost > 0) { gold -= mCost; spent += mCost; }
            army._t3StepIdx++;
            progress = true;
          }
        }
      }

      // 여유 골드로 필러 배치
      while (gold >= FILLER_COST && army.count < MAX_SLOTS) {
        army.addT1(FILLER_TYPE);
        gold -= FILLER_COST;
        spent += FILLER_COST;
      }

      return spent;
    },
  };
}

/**
 * economy_early_dragon 전략: dragon T1 초반 대량 구매 → T2 합성 후 경제적 플레이.
 * dragon은 T1 중 DPS가 가장 높아 초반 강력하며,
 * 동종 합성(ancient_dragon)으로 T2 전환 후 나머지 골드를 보존한다.
 * @returns {{name: string, fn: StrategyFn, description: string}}
 */
function createEconomyEarlyDragon() {
  return {
    name: 'economy_early_dragon',
    description: 'dragon T1 대량 구매 → ancient_dragon T2 합성 → 경제적 플레이',
    fn: (state) => {
      const { army, round, params } = state;
      let gold = state.gold;
      let spent = 0;

      // 동종 합성 먼저 실행
      while (army.tryMerge('dragon', 'dragon', 'ancient_dragon')) {}

      // 초반(R1~R15): dragon 공격적 구매
      // 중반(R16~): 필러(archer)로 보조, dragon은 여유 있을 때만
      if (round <= 15) {
        // dragon 구매 (비싸므로 여유 있을 때)
        while (gold >= TOWER_STATS.dragon.cost && army.count < MAX_SLOTS) {
          army.addT1('dragon');
          gold -= TOWER_STATS.dragon.cost;
          spent += TOWER_STATS.dragon.cost;
        }
        // 남은 골드로 필러
        while (gold >= FILLER_COST && army.count < MAX_SLOTS) {
          army.addT1(FILLER_TYPE);
          gold -= FILLER_COST;
          spent += FILLER_COST;
        }
      } else {
        // 중반 이후: 라운드당 제한적 구매 (경제 보존)
        const maxBuy = round < 25 ? 3 : 2;
        let bought = 0;

        // dragon 우선 (여유 있으면)
        while (bought < maxBuy && gold >= TOWER_STATS.dragon.cost && army.count < MAX_SLOTS) {
          army.addT1('dragon');
          gold -= TOWER_STATS.dragon.cost;
          spent += TOWER_STATS.dragon.cost;
          bought++;
        }

        // 나머지 필러로 채움
        while (bought < maxBuy && gold >= FILLER_COST && army.count < MAX_SLOTS) {
          army.addT1(FILLER_TYPE);
          gold -= FILLER_COST;
          spent += FILLER_COST;
          bought++;
        }

        // 합성 다시 시도 (구매 후 합성 가능할 수 있음)
        while (army.tryMerge('dragon', 'dragon', 'ancient_dragon')) {}
      }

      return spent;
    },
  };
}

/** @const {Object<string, Function>} 시나리오 생성자 매핑 */
const SCENARIO_BUILDERS = {
  t5_void_maelstrom_spam: () => createBuildOrderStrategy(
    't5_void_maelstrom_spam',
    'void_maelstrom(T5) 반복 생산 — 가장 저렴한 T5 도배',
    BUILD_ORDER_VOID_MAELSTROM
  ),
  t5_absolute_dominion_rush: () => createBuildOrderStrategy(
    't5_absolute_dominion_rush',
    'absolute_dominion(T5) 반복 생산 — CC+DPS 균형형 T5',
    BUILD_ORDER_ABSOLUTE_DOMINION
  ),
  t5_star_forge_rush: () => createBuildOrderStrategy(
    't5_star_forge_rush',
    'star_forge(T5) 반복 생산 — 화염 DoT 특화 T5',
    BUILD_ORDER_STAR_FORGE
  ),
  balanced_t3_defense: createBalancedT3Defense,
  economy_early_dragon: createEconomyEarlyDragon,
};

// ── 시뮬레이션 엔진 (라운드 단위 추상) ──────────────────────────────

/**
 * @typedef {Object} RoundSnapshot
 * @property {number} round - 라운드 번호
 * @property {number} baseHp - 기지 HP
 * @property {number} gold - 보유 골드
 * @property {number} goldCumulative - 누적 획득 골드
 * @property {string} towerSummary - 타워 진영 요약
 * @property {number} totalDps - 총 DPS
 * @property {number} maxTier - 최고 티어
 */

/**
 * @typedef {Object} SimResult
 * @property {string} scenario - 시나리오 이름
 * @property {number} gameOverRound - 게임오버 라운드 (0이면 생존)
 * @property {number} finalHp - 최종 기지 HP
 * @property {number} totalGold - 총 획득 골드
 * @property {RoundSnapshot[]} snapshots - 10라운드 단위 스냅샷
 * @property {number} maxTierReached - 달성한 최고 티어
 * @property {number} t5FirstRound - T5 첫 도달 라운드 (0이면 미도달)
 */

/**
 * 한 시나리오를 시뮬레이션한다.
 * @param {{name: string, fn: StrategyFn}} scenario - 시나리오 객체
 * @param {Object} params - 밸런스 파라미터
 * @param {number} maxRounds - 최대 라운드 수
 * @param {'none'|'half'|'full'} [metaLevel='none'] - 메타 업그레이드 프리셋
 * @returns {SimResult} 시뮬레이션 결과
 */
function simulate(scenario, params, maxRounds, metaLevel = 'none') {
  let gold = params.initialGold;
  let baseHp = MAX_BASE_HP;
  let goldCumulative = params.initialGold;
  const army = new TowerArmy(metaLevel);
  /** @type {RoundSnapshot[]} */
  const snapshots = [];
  let gameOverRound = 0;
  let t5FirstRound = 0;

  for (let round = 1; round <= maxRounds; round++) {
    // 1. 전략에 따라 타워 구매/합성
    const spent = scenario.fn({ gold, army, round, params });
    gold -= spent;

    // T5 도달 체크
    if (t5FirstRound === 0 && army.maxTier >= 5) {
      t5FirstRound = round;
    }

    // 2. 웨이브 적 목록 생성
    const waveStats = calcWaveStats(round, params);
    const passTime = calcAveragePassTime(round);

    // 3. 타워 총 데미지 = DPS * 경로 통과 시간
    const towerTotalDamage = army.totalDps * passTime;

    // 4. 적 돌파 비율 계산
    let leakRatio = 0;
    if (waveStats.totalHp > towerTotalDamage) {
      leakRatio = (waveStats.totalHp - towerTotalDamage) / waveStats.totalHp;
    }

    // 돌파한 적의 기지 피해
    const leakDamage = Math.ceil(waveStats.totalDamage * leakRatio);
    baseHp -= leakDamage;

    // 5. 골드 획득 (킬 골드: 살해 비율만큼 + 웨이브 클리어 보너스)
    const killRatio = 1 - leakRatio;
    const killGold = Math.round(waveStats.totalGold * killRatio);
    const clearBonus = leakRatio < 0.5 ? calcWaveClearBonus(round, Math.max(0, baseHp), params) : 0;
    gold += killGold + clearBonus;
    goldCumulative += killGold + clearBonus;

    // 10라운드 단위 스냅샷
    if (round % 10 === 0) {
      snapshots.push({
        round,
        baseHp: Math.max(0, baseHp),
        gold,
        goldCumulative,
        towerSummary: army.summary(),
        totalDps: Math.round(army.totalDps),
        maxTier: army.maxTier,
      });
    }

    // 6. 게임오버 체크
    if (baseHp <= 0) {
      gameOverRound = round;
      break;
    }
  }

  // 생존한 경우 최종 스냅샷 추가
  if (gameOverRound === 0 && maxRounds % 10 !== 0) {
    snapshots.push({
      round: maxRounds,
      baseHp: Math.max(0, baseHp),
      gold,
      goldCumulative,
      towerSummary: army.summary(),
      totalDps: Math.round(army.totalDps),
      maxTier: army.maxTier,
    });
  }

  return {
    scenario: scenario.name,
    gameOverRound,
    finalHp: Math.max(0, baseHp),
    totalGold: goldCumulative,
    snapshots,
    maxTierReached: army.maxTier,
    t5FirstRound,
  };
}

// ── 출력 포맷팅 ──────────────────────────────────────────────────

/**
 * 문자열을 지정 너비로 패딩한다 (한글 폭 보정 포함).
 * @param {string|number} str - 원본 문자열
 * @param {number} width - 목표 폭
 * @returns {string} 패딩된 문자열
 */
function pad(str, width) {
  const s = String(str);
  let displayWidth = 0;
  for (const ch of s) {
    displayWidth += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  }
  const padding = Math.max(0, width - displayWidth);
  return s + ' '.repeat(padding);
}

/**
 * 숫자에 천 단위 쉼표를 추가한다.
 * @param {number} n - 숫자
 * @returns {string}
 */
function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}

/**
 * 시뮬레이션 결과를 콘솔에 출력한다.
 * @param {SimResult} result - 시뮬레이션 결과
 * @param {string} [label=''] - 수치 세트 라벨
 */
function printResult(result, label = '') {
  const prefix = label ? `[${label}] ` : '';
  console.log(`${prefix}=== 시나리오: ${result.scenario} ===`);

  for (const snap of result.snapshots) {
    console.log(
      `  R${pad(snap.round, 3)}: 기지HP ${pad(snap.baseHp + '/' + MAX_BASE_HP, 7)}, ` +
      `골드 누적 ${pad(formatNumber(snap.goldCumulative), 8)}, ` +
      `DPS ${pad(formatNumber(snap.totalDps), 8)}, ` +
      `타워: ${snap.towerSummary}`
    );
  }

  if (result.gameOverRound > 0) {
    console.log(`  => 기지HP 0/${MAX_BASE_HP} -- GAME OVER at R${result.gameOverRound}`);
  } else {
    console.log(`  => 생존! 최종 HP ${result.finalHp}/${MAX_BASE_HP}, 최고 티어 T${result.maxTierReached}`);
  }

  if (result.t5FirstRound > 0) {
    console.log(`  => T5 첫 도달 라운드: R${result.t5FirstRound}`);
  }

  console.log('');
}

/**
 * 비교 모드: 두 수치 세트의 결과를 나란히 출력한다.
 * @param {SimResult} resultCurrent - 현재 수치 결과
 * @param {SimResult} resultProposed - 제안 수치 결과
 */
function printComparison(resultCurrent, resultProposed) {
  console.log(`=== 비교: ${resultCurrent.scenario} ===`);
  console.log('-'.repeat(60));

  const goC = resultCurrent.gameOverRound > 0
    ? `게임오버 R${resultCurrent.gameOverRound}`
    : `생존 (HP ${resultCurrent.finalHp})`;
  const goP = resultProposed.gameOverRound > 0
    ? `게임오버 R${resultProposed.gameOverRound}`
    : `생존 (HP ${resultProposed.finalHp})`;

  console.log(`  현재 수치: ${goC}`);
  console.log(`  제안 수치: ${goP}`);

  if (resultCurrent.gameOverRound > 0 && resultProposed.gameOverRound > 0) {
    const diff = resultProposed.gameOverRound - resultCurrent.gameOverRound;
    const sign = diff > 0 ? '+' : '';
    console.log(`  차이: ${sign}${diff} 라운드`);
  }

  console.log(`  현재 T5 도달: ${resultCurrent.t5FirstRound > 0 ? 'R' + resultCurrent.t5FirstRound : '미도달'}`);
  console.log(`  제안 T5 도달: ${resultProposed.t5FirstRound > 0 ? 'R' + resultProposed.t5FirstRound : '미도달'}`);
  console.log('');
}

// ── 요약 테이블 ──────────────────────────────────────────────────

/**
 * 여러 시나리오 결과를 요약 테이블로 출력한다.
 * @param {SimResult[]} results - 시뮬레이션 결과 배열
 * @param {string} [label=''] - 수치 세트 라벨
 */
function printSummaryTable(results, label = '') {
  console.log('');
  if (label) console.log(`[${label}]`);
  console.log('='.repeat(80));
  console.log(
    pad('시나리오', 32) + '| ' +
    pad('게임오버', 10) + '| ' +
    pad('최종HP', 8) + '| ' +
    pad('최고티어', 10) + '| ' +
    pad('T5 도달', 10) + '| ' +
    '총 골드'
  );
  console.log('-'.repeat(80));

  for (const r of results) {
    const go = r.gameOverRound > 0 ? `R${r.gameOverRound}` : '생존';
    const hp = `${r.finalHp}/${MAX_BASE_HP}`;
    const tier = `T${r.maxTierReached}`;
    const t5 = r.t5FirstRound > 0 ? `R${r.t5FirstRound}` : '-';

    console.log(
      pad(r.scenario, 32) + '| ' +
      pad(go, 10) + '| ' +
      pad(hp, 8) + '| ' +
      pad(tier, 10) + '| ' +
      pad(t5, 10) + '| ' +
      formatNumber(r.totalGold)
    );
  }

  console.log('='.repeat(80));
}

// ── 메인 실행 ──────────────────────────────────────────────────────

/**
 * CLI 인수를 파싱하고 시뮬레이션을 실행한다.
 */
function main() {
  const { values } = parseArgs({
    options: {
      scenarios: { type: 'string', default: 'all' },
      rounds: { type: 'string', default: '100' },
      compare: { type: 'boolean', default: false },
      override: { type: 'string', default: '' },
      meta: { type: 'string', default: 'none' },
      help: { type: 'boolean', default: false, short: 'h' },
    },
    strict: false,
  });

  if (values.help) {
    console.log(`
Fantasy TD 밸런스 시뮬레이터 (라운드 단위 추상 시뮬레이션)

사용법:
  node fantasydefence/tools/balance-simulator.mjs [옵션]

옵션:
  --scenarios <name|all>  실행할 시나리오 (기본: all)
                          가능한 값: ${Object.keys(SCENARIO_BUILDERS).join(', ')}, all
  --rounds <N>            최대 라운드 수 (기본: 100)
  --compare               현재 수치 vs 제안 수치 비교 모드
  --meta <none|half|full> 메타 업그레이드 프리셋 (기본: none)
                          none: 메타 미적용, half: 최대의 절반, full: 최대 레벨
  --override '<JSON>'     밸런스 파라미터 오버라이드 (JSON 문자열)
  -h, --help              도움말 표시

예시:
  node fantasydefence/tools/balance-simulator.mjs --scenarios all --rounds 60
  node fantasydefence/tools/balance-simulator.mjs --compare --rounds 80
  node fantasydefence/tools/balance-simulator.mjs --meta full --rounds 80
  node fantasydefence/tools/balance-simulator.mjs --override '{"initialGold":300}'
`);
    return;
  }

  const maxRounds = parseInt(values.rounds, 10) || 100;
  const isCompare = values.compare;
  const metaLevel = ['none', 'half', 'full'].includes(values.meta) ? values.meta : 'none';

  // 시나리오 선택
  let scenarioNames;
  if (values.scenarios === 'all') {
    scenarioNames = Object.keys(SCENARIO_BUILDERS);
  } else {
    scenarioNames = values.scenarios.split(',').map(s => s.trim());
  }

  // 파라미터 오버라이드 적용
  let currentParams = structuredClone(CURRENT_PARAMS);
  if (values.override) {
    try {
      const overrides = JSON.parse(values.override);
      currentParams = deepMerge(currentParams, overrides);
    } catch (e) {
      console.error(`[오류] --override JSON 파싱 실패: ${e.message}`);
      process.exit(1);
    }
  }

  const startTime = Date.now();

  console.log('');
  console.log('='.repeat(60));
  console.log(' Fantasy TD 밸런스 시뮬레이터');
  console.log(` 최대 라운드: ${maxRounds}, 시나리오: ${scenarioNames.join(', ')}`);
  console.log(` 메타 업그레이드: ${metaLevel}`);
  if (isCompare) console.log(' 모드: 현재 수치 vs 제안 수치 비교');
  console.log('='.repeat(60));
  console.log('');

  // 시나리오 생성
  const scenarios = [];
  for (const name of scenarioNames) {
    const builder = SCENARIO_BUILDERS[name];
    if (!builder) {
      console.error(`[오류] 알 수 없는 시나리오: ${name}`);
      console.error(`가능한 시나리오: ${Object.keys(SCENARIO_BUILDERS).join(', ')}`);
      process.exit(1);
    }
    scenarios.push(builder());
  }

  if (isCompare) {
    // 비교 모드
    const proposedParams = structuredClone(PROPOSED_PARAMS);

    const currentResults = scenarios.map(s => simulate(s, currentParams, maxRounds, metaLevel));
    // 비교 모드에서는 시나리오를 새로 생성해야 함 (TowerArmy 상태 초기화)
    const scenariosForProposed = scenarioNames.map(name => SCENARIO_BUILDERS[name]());
    const proposedResults = scenariosForProposed.map(s => simulate(s, proposedParams, maxRounds, metaLevel));

    // 개별 결과 출력
    for (let i = 0; i < scenarios.length; i++) {
      printResult(currentResults[i], '현재 수치');
      printResult(proposedResults[i], '제안 수치');
      printComparison(currentResults[i], proposedResults[i]);
    }

    // 요약 테이블
    printSummaryTable(currentResults, '현재 수치');
    printSummaryTable(proposedResults, '제안 수치');
  } else {
    // 일반 모드
    const results = scenarios.map(s => simulate(s, currentParams, maxRounds, metaLevel));

    // 개별 결과 출력
    for (const result of results) {
      printResult(result);
    }

    // 요약 테이블
    printSummaryTable(results);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  console.log(`시뮬레이션 완료: ${elapsed}초 소요`);
}

// ── 유틸리티 ──────────────────────────────────────────────────────

/**
 * 객체를 재귀적으로 깊은 병합한다.
 * @param {Object} target - 대상 객체
 * @param {Object} source - 소스 객체
 * @returns {Object} 병합된 객체
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ── 실행 ────────────────────────────────────────────────────────

main();
