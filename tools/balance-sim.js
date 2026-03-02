/**
 * @fileoverview Fantasy TD 밸런스 시뮬레이션 스크립트 (합성 시스템 포함).
 * 10가지 전략(T1 baseline 2종 + 합성 전략 8종)으로 각 10회씩 총 100회
 * 플레이를 틱 기반으로 시뮬레이션하고, 전략별 승률/평균 라운드/잔여 HP 등을
 * 리포트한다. 순수 Node.js 전용, 외부 패키지 없이 동작한다.
 *
 * 사용법: node tools/balance-sim.js
 */

'use strict';

// ── 상수 ──────────────────────────────────────────────────────────

/** @const {number} 시뮬레이션 틱 간격 (초) */
const TICK = 0.05;

/** @const {number} 클리어 기준 라운드 */
const MAX_ROUND = 50;

/** @const {number} 전략당 시뮬레이션 반복 횟수 */
const RUNS_PER_STRATEGY = 100;

/** @const {number} 셀 크기 (px) */
const CELL_SIZE = 40;

/** @const {number} HUD 높이 (px) */
const HUD_HEIGHT = 40;

/** @const {number} 시작 골드 */
const STARTING_GOLD = 250;

/** @const {number} 기지 최대 HP */
const MAX_BASE_HP = 20;

/** @const {number} 판매 비율 */
const SELL_RATIO = 0.6;

/** @const {number} 강화 기본 비용 */
const ENHANCE_BASE_COST = 200;

/** @const {number} 강화 비용 증가분 */
const ENHANCE_COST_INCREMENT = 100;

/** @const {number} 강화 스탯 보너스 (5%) */
const ENHANCE_STAT_BONUS = 0.05;

// ── 구간별 HP 스케일링 ──────────────────────────────────────────

/**
 * 라운드별 HP 스케일 값을 구간별 차등으로 계산한다.
 * @param {number} round - 라운드 번호
 * @returns {number} HP 스케일 배율
 */
function calcHpScale(round) {
  if (round <= 20) return 1 + (round - 1) * 0.15;
  const baseR20 = 1 + 19 * 0.15;                          // 3.85
  if (round <= 35) return baseR20 + (round - 20) * 0.10;
  const baseR35 = baseR20 + 15 * 0.10;                    // 5.35
  if (round <= 50) return baseR35 + (round - 35) * 0.13;
  const baseR50 = baseR35 + 15 * 0.13;                    // 7.30
  return baseR50 + (round - 50) * 0.15;
}

/**
 * 라운드별 보스 HP 배율을 반환한다.
 * @param {number} round - 라운드 번호
 * @returns {number} 보스 HP 배율
 */
function getBossHpMultiplier(round) {
  if (round <= 30) return 2.0;
  if (round <= 40) return 2.2;
  return 2.5;
}

// ── 그리드 좌표 → 픽셀 변환 ──────────────────────────────────────

/**
 * 그리드 좌표를 픽셀 중심 좌표로 변환한다.
 * @param {number} col - 열 인덱스
 * @param {number} row - 행 인덱스
 * @returns {{x: number, y: number}} 픽셀 좌표
 */
function gridToPixel(col, row) {
  return { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + HUD_HEIGHT + CELL_SIZE / 2 };
}

// ── 맵 데이터 ─────────────────────────────────────────────────────

/** @const {number[][]} 맵 그리드 (0=빈셀, 1=경로, 2=기지, 3=스폰, 4=벽) */
const MAP_GRID = [
  [4,4,4,4,3,4,4,4,4], // row 0
  [0,0,0,0,1,0,0,0,0], // row 1
  [0,1,1,1,1,0,0,0,0], // row 2
  [0,1,0,0,0,0,0,0,0], // row 3
  [0,1,1,1,1,1,1,1,0], // row 4
  [0,0,0,0,0,0,0,1,0], // row 5
  [0,0,0,0,0,0,0,1,0], // row 6
  [0,1,1,1,1,1,1,1,0], // row 7
  [0,1,0,0,0,0,0,0,0], // row 8
  [0,1,1,1,1,1,0,0,0], // row 9
  [0,0,0,0,0,1,0,0,0], // row 10
  [4,4,4,4,4,2,4,4,4], // row 11
];

/** @const {number[][]} 경로 웨이포인트 (그리드 좌표 [col, row]) */
const PATH_WAYPOINTS = [
  [4,0],[4,1],[4,2],[3,2],[2,2],[1,2],[1,3],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],
  [7,5],[7,6],[7,7],[6,7],[5,7],[4,7],[3,7],[2,7],[1,7],[1,8],[1,9],[2,9],[3,9],[4,9],
  [5,9],[5,10],[5,11],
];

/** @const {{x:number,y:number}[]} 경로 웨이포인트 (픽셀 좌표) */
const PATH_PIXELS = PATH_WAYPOINTS.map(([c, r]) => gridToPixel(c, r));

// ── 타워 정의 ─────────────────────────────────────────────────────

/** @const {Object} T1 타워 10종 기본 스탯 */
const TOWERS = {
  archer:    { cost:50,  damage:10, fireRate:0.8, range:120, type:'single' },
  mage:      { cost:100, damage:25, fireRate:2.0, range:100, type:'splash', splashRadius:40 },
  ice:       { cost:75,  damage:8,  fireRate:1.5, range:100, type:'single', slowAmount:0.3, slowDuration:2.0 },
  lightning: { cost:120, damage:18, fireRate:1.2, range:120, type:'chain', chainCount:4, chainDecay:0.7 },
  flame:     { cost:90,  damage:5,  fireRate:1.5, range:100, type:'dot_single', burnDamage:4, burnDuration:3 },
  rock:      { cost:110, damage:45, fireRate:3.0, range:80,  type:'single' },
  poison:    { cost:95,  damage:3,  fireRate:2.0, range:120, type:'aoe', splashRadius:60, poisonDamage:3, poisonDuration:4, armorReduction:0.2 },
  wind:      { cost:80,  damage:5,  fireRate:2.5, range:120, type:'single', pushbackDistance:80 },
  light:     { cost:130, damage:20, fireRate:1.8, range:600, type:'piercing_beam' },
  dragon:    { cost:250, damage:60, fireRate:2.5, range:160, type:'splash', splashRadius:80 },
};

// ── 합성 타워 스탯 ───────────────────────────────────────────────

/** @const {Object} 합성 타워 스탯 (mergeId → 스탯) */
const MERGED_STATS = {
  // T2 동종 합성 (10종)
  rapid_archer: { damage:12, fireRate:0.4, range:130, type:'single' },
  overload_mage: { damage:60, fireRate:3.5, range:110, type:'splash', splashRadius:70 },
  zero_field: { damage:4, fireRate:1.0, range:130, type:'aoe', splashRadius:90, slowAmount:0.5, slowDuration:3.0 },
  thunder_lord: { damage:30, fireRate:1.0, range:130, type:'chain', chainCount:8, chainDecay:0.85 },
  inferno: { damage:22, fireRate:1.2, range:110, type:'aoe', splashRadius:65, burnDamage:14, burnDuration:4 },
  quake: { damage:80, fireRate:3.5, range:90, type:'splash', splashRadius:50, slowAmount:1.0, slowDuration:0.5 },
  plague: { damage:4, fireRate:1.8, range:140, type:'aoe', splashRadius:80, poisonDamage:8, poisonDuration:6, armorReduction:0.2 },
  typhoon: { damage:8, fireRate:2.0, range:130, type:'aoe', splashRadius:70, pushbackDistance:120 },
  solar_burst: { damage:70, fireRate:2.2, range:130, type:'aoe', splashRadius:110 },
  ancient_dragon: { damage:90, fireRate:2.5, range:180, type:'splash', splashRadius:100, burnDamage:12, burnDuration:4, poisonDamage:10, poisonDuration:6 },

  // T2 이종 합성 (주요 10종)
  arcane_archer: { damage:18, fireRate:1.0, range:130, type:'splash', splashRadius:45 },
  cryo_sniper: { damage:15, fireRate:1.2, range:150, type:'single', slowAmount:1.0, slowDuration:1.5 },
  shock_arrow: { damage:14, fireRate:0.9, range:130, type:'chain', chainCount:3, chainDecay:0.8 },
  fire_arrow: { damage:12, fireRate:0.9, range:120, type:'dot_single', burnDamage:6, burnDuration:4 },
  armor_pierce: { damage:40, fireRate:1.4, range:130, type:'single', armorPiercing:true },
  holy_arrow: { damage:22, fireRate:1.4, range:600, type:'piercing_beam' },
  frost_mage: { damage:28, fireRate:2.0, range:110, type:'splash', splashRadius:55, slowAmount:0.35, slowDuration:2.0 },
  thunder_fire: { damage:22, fireRate:1.2, range:125, type:'chain', chainCount:5, chainDecay:0.7, burnDamage:5, burnDuration:3 },
  dragon_rider: { damage:45, fireRate:2.0, range:165, type:'splash', splashRadius:75, burnDamage:6, burnDuration:3 },
  holy_dragon: { damage:60, fireRate:2.2, range:600, type:'piercing_beam', burnDamage:8, burnDuration:3 },
  // 레시피에 등록된 추가 이종 합성 (스탯 미제공분 — 기본값 사용)
  dragon_mage: { damage:50, fireRate:2.2, range:140, type:'splash', splashRadius:60 },
  frost_dragon: { damage:40, fireRate:2.0, range:160, type:'splash', splashRadius:70, slowAmount:0.4, slowDuration:2.5 },
  thunder_dragon: { damage:35, fireRate:1.5, range:150, type:'chain', chainCount:6, chainDecay:0.8 },
  inferno_dragon: { damage:45, fireRate:2.0, range:150, type:'splash', splashRadius:70, burnDamage:8, burnDuration:4 },
  stone_dragon: { damage:70, fireRate:2.8, range:150, type:'splash', splashRadius:60 },
  venom_dragon: { damage:35, fireRate:2.0, range:160, type:'aoe', splashRadius:80, poisonDamage:10, poisonDuration:6, armorReduction:0.4 },
  storm_dragon: { damage:30, fireRate:2.0, range:160, type:'aoe', splashRadius:70, pushbackDistance:100 },
  storm_mage: { damage:30, fireRate:1.8, range:120, type:'chain', chainCount:5, chainDecay:0.75 },
  thunder_strike: { damage:35, fireRate:1.5, range:120, type:'chain', chainCount:5, chainDecay:0.8 },
  holy_thunder: { damage:25, fireRate:1.3, range:600, type:'piercing_beam' },
  pyromancer: { damage:45, fireRate:1.8, range:110, type:'splash', splashRadius:55, burnDamage:6, burnDuration:3 },

  // T3 (주요 12종)
  thunder_wyrm_king: { damage:65, fireRate:1.5, range:190, type:'chain', chainCount:10, chainDecay:0.85, burnDamage:20, burnDuration:5, poisonDamage:15, poisonDuration:7 },
  plague_wyrm: { damage:45, fireRate:2.0, range:200, type:'aoe', splashRadius:130, burnDamage:12, burnDuration:4, poisonDamage:20, poisonDuration:8, armorReduction:0.35 },
  cosmos_dragon: { damage:100, fireRate:2.5, range:210, type:'aoe', splashRadius:150, burnDamage:15, burnDuration:5, poisonDamage:12, poisonDuration:6 },
  primal_dragon_lord: { damage:140, fireRate:2.5, range:200, type:'splash', splashRadius:120, burnDamage:18, burnDuration:6, poisonDamage:15, poisonDuration:7 },
  lightning_tempest: { damage:55, fireRate:1.2, range:165, type:'chain', chainCount:12, chainDecay:0.9 },
  celestial_judgment: { damage:100, fireRate:1.8, range:600, type:'piercing_beam', burnDamage:15, burnDuration:4 },
  hellquake: { damage:115, fireRate:3.0, range:170, type:'splash', splashRadius:100, slowAmount:1.0, slowDuration:0.5, burnDamage:18, burnDuration:5, armorReduction:0.15 },
  storm_deity: { damage:75, fireRate:1.8, range:180, type:'chain', chainCount:8, chainDecay:0.85, burnDamage:10, burnDuration:4 },
  venom_sovereign: { damage:50, fireRate:2.0, range:195, type:'aoe', splashRadius:120, poisonDamage:25, poisonDuration:9, armorReduction:0.5 },
  absolute_frost_domain: { damage:18, fireRate:1.5, range:190, type:'aoe', splashRadius:140, slowAmount:0.75, slowDuration:4.5 },
  thunderstorm_king: { damage:50, fireRate:1.0, range:175, type:'chain', chainCount:12, chainDecay:0.9 },
  solar_cannon: { damage:95, fireRate:2.5, range:170, type:'aoe', splashRadius:140 },
  // 레시피에 등록된 추가 T3 (스탯 미제공분)
  superconductor_mage: { damage:60, fireRate:1.5, range:150, type:'chain', chainCount:10, chainDecay:0.88 },
  grand_pyromancer: { damage:30, fireRate:1.5, range:145, type:'aoe', splashRadius:100, burnDamage:28, burnDuration:6 },
  tectonic_dragon: { damage:100, fireRate:2.8, range:170, type:'splash', splashRadius:90 },
  adamantine_lightning: { damage:60, fireRate:1.3, range:160, type:'chain', chainCount:8, chainDecay:0.85 },
  eternal_blizzard: { damage:25, fireRate:1.5, range:180, type:'aoe', splashRadius:120, slowAmount:0.6, slowDuration:4.0 },
  divine_sun_ray: { damage:60, fireRate:2.0, range:600, type:'piercing_beam', burnDamage:10, burnDuration:4 },
  earth_shatterer: { damage:145, fireRate:3.2, range:110, type:'splash', splashRadius:70, slowAmount:1.0, slowDuration:0.8 },

  // T4 (주요 8종)
  void_sniper: { damage:220, fireRate:1.0, range:230, type:'chain', chainCount:12, chainDecay:0.9, burnDamage:20, burnDuration:6, poisonDamage:15, poisonDuration:8, armorPiercing:true },
  storm_dominion: { damage:160, fireRate:1.0, range:220, type:'chain', chainCount:16, chainDecay:0.9, burnDamage:35, burnDuration:6, armorPiercing:true },
  glacial_epoch: { damage:60, fireRate:1.2, range:230, type:'aoe', splashRadius:180, slowAmount:0.95, slowDuration:6.0, armorReduction:0.25, armorReductionDuration:8 },
  magma_core: { damage:180, fireRate:2.5, range:200, type:'aoe', splashRadius:130, burnDamage:50, burnDuration:8, armorReduction:0.3 },
  annihilation_gale: { damage:120, fireRate:1.5, range:240, type:'aoe', splashRadius:180, burnDamage:20, burnDuration:7, pushbackDistance:140 },
  genesis_verdict: { damage:200, fireRate:2.0, range:600, type:'piercing_beam', burnDamage:25, burnDuration:7, poisonDamage:20, poisonDuration:8 },
  pandemic_sovereign: { damage:60, fireRate:1.8, range:250, type:'aoe', splashRadius:180, poisonDamage:20, poisonDuration:12, armorReduction:0.45, burnDamage:20, burnDuration:6 },
  world_breaker: { damage:160, fireRate:3.0, range:200, type:'splash', splashRadius:110, slowAmount:1.0, slowDuration:1.0 },
  // 레시피에 등록된 추가 T4 (스탯 미제공분)
  maelstrom_herald: { damage:80, fireRate:1.5, range:220, type:'aoe', splashRadius:140, pushbackDistance:220 },
  solar_cremation: { damage:120, fireRate:1.2, range:200, type:'aoe', splashRadius:180, burnDamage:60, burnDuration:8 },

  // T5 (5종 전부)
  omega_herald: { damage:350, fireRate:0.8, range:600, type:'chain', chainCount:20, chainDecay:0.92, burnDamage:40, burnDuration:10, poisonDamage:30, poisonDuration:12, armorPiercing:true },
  extinction_engine: { damage:120, fireRate:1.5, range:280, type:'aoe', splashRadius:220, poisonDamage:30, poisonDuration:12, armorReduction:0.4, burnDamage:35, burnDuration:9 },
  absolute_dominion: { damage:280, fireRate:0.8, range:260, type:'chain', chainCount:18, chainDecay:0.92, slowAmount:0.9, slowDuration:5.0, pushbackDistance:180, armorPiercing:true, burnDamage:30, burnDuration:8, poisonDamage:20, poisonDuration:10 },
  star_forge: { damage:150, fireRate:0.8, range:260, type:'aoe', splashRadius:220, burnDamage:180, burnDuration:12, armorReduction:0.4, poisonDamage:20, poisonDuration:10 },
  void_maelstrom: { damage:150, fireRate:1.2, range:600, type:'piercing_beam', burnDamage:50, burnDuration:10, poisonDamage:40, poisonDuration:12, pushbackDistance:300, armorPiercing:true },
};

// ── 합성 레시피 ──────────────────────────────────────────────────

/** @const {Object} 합성 레시피 (키 = 알파벳순 정렬 idA+idB) */
const MERGE_RECIPES = {
  // T1+T1 → T2 동종
  'archer+archer': { id:'rapid_archer', tier:2 },
  'mage+mage': { id:'overload_mage', tier:2 },
  'ice+ice': { id:'zero_field', tier:2 },
  'lightning+lightning': { id:'thunder_lord', tier:2 },
  'flame+flame': { id:'inferno', tier:2 },
  'rock+rock': { id:'quake', tier:2 },
  'poison+poison': { id:'plague', tier:2 },
  'wind+wind': { id:'typhoon', tier:2 },
  'light+light': { id:'solar_burst', tier:2 },
  'dragon+dragon': { id:'ancient_dragon', tier:2 },

  // T1+T1 → T2 이종 (주요)
  'archer+mage': { id:'arcane_archer', tier:2 },
  'archer+ice': { id:'cryo_sniper', tier:2 },
  'archer+lightning': { id:'shock_arrow', tier:2 },
  'archer+flame': { id:'fire_arrow', tier:2 },
  'archer+rock': { id:'armor_pierce', tier:2 },
  'archer+light': { id:'holy_arrow', tier:2 },
  'ice+mage': { id:'frost_mage', tier:2 },
  'flame+lightning': { id:'thunder_fire', tier:2 },
  'archer+dragon': { id:'dragon_rider', tier:2 },
  'dragon+light': { id:'holy_dragon', tier:2 },
  'dragon+mage': { id:'dragon_mage', tier:2 },
  'dragon+ice': { id:'frost_dragon', tier:2 },
  'dragon+lightning': { id:'thunder_dragon', tier:2 },
  'dragon+flame': { id:'inferno_dragon', tier:2 },
  'dragon+rock': { id:'stone_dragon', tier:2 },
  'dragon+poison': { id:'venom_dragon', tier:2 },
  'dragon+wind': { id:'storm_dragon', tier:2 },
  'lightning+mage': { id:'storm_mage', tier:2 },
  'lightning+rock': { id:'thunder_strike', tier:2 },
  'light+lightning': { id:'holy_thunder', tier:2 },
  'flame+mage': { id:'pyromancer', tier:2 },

  // T2+T2 → T3
  'ancient_dragon+thunder_lord': { id:'thunder_wyrm_king', tier:3 },
  'ancient_dragon+plague': { id:'plague_wyrm', tier:3 },
  'ancient_dragon+wind': { id:'cosmos_dragon', tier:3 },
  'storm_mage+thunder_dragon': { id:'superconductor_mage', tier:3 },
  'storm_mage+thunder_lord': { id:'lightning_tempest', tier:3 },
  'inferno+quake': { id:'grand_pyromancer', tier:3 },
  'inferno_dragon+quake': { id:'hellquake', tier:3 },
  'frost_dragon+plague': { id:'absolute_frost_domain', tier:3 },
  'holy_dragon+solar_burst': { id:'celestial_judgment', tier:3 },
  'plague+venom_dragon': { id:'venom_sovereign', tier:3 },
  'quake+stone_dragon': { id:'tectonic_dragon', tier:3 },
  'stone_dragon+thunder_strike': { id:'adamantine_lightning', tier:3 },

  // T2+T1 → T3
  'ancient_dragon+dragon': { id:'primal_dragon_lord', tier:3 },
  'lightning+thunder_dragon': { id:'storm_deity', tier:3 },
  'lightning+thunder_lord': { id:'thunderstorm_king', tier:3 },
  'light+solar_burst': { id:'solar_cannon', tier:3 },
  'frost_dragon+ice': { id:'eternal_blizzard', tier:3 },
  'holy_dragon+light': { id:'divine_sun_ray', tier:3 },
  'quake+rock': { id:'earth_shatterer', tier:3 },

  // T3+T3 → T4, T3+T2 → T4, T3+T1 → T4
  'absolute_frost_domain+ice': { id:'glacial_epoch', tier:4 },
  'archer+cosmos_dragon': { id:'void_sniper', tier:4 },
  'celestial_judgment+cosmos_dragon': { id:'genesis_verdict', tier:4 },
  'earth_shatterer+tectonic_dragon': { id:'world_breaker', tier:4 },
  'flame+hellquake': { id:'magma_core', tier:4 },
  'lightning_tempest+typhoon': { id:'maelstrom_herald', tier:4 },
  'plague_wyrm+venom_sovereign': { id:'pandemic_sovereign', tier:4 },
  'grand_pyromancer+solar_burst': { id:'solar_cremation', tier:4 },
  'thunder_lord+thunder_wyrm_king': { id:'storm_dominion', tier:4 },
  'primal_dragon_lord+wind': { id:'annihilation_gale', tier:4 },

  // T4+T4 → T5
  'annihilation_gale+maelstrom_herald': { id:'void_maelstrom', tier:5 },
  'genesis_verdict+void_sniper': { id:'omega_herald', tier:5 },
  'glacial_epoch+storm_dominion': { id:'absolute_dominion', tier:5 },
  'magma_core+solar_cremation': { id:'star_forge', tier:5 },
  'pandemic_sovereign+world_breaker': { id:'extinction_engine', tier:5 },
};

// ── 적 정의 ───────────────────────────────────────────────────────

/** @const {Object} 적 8종 기본 스탯 */
const ENEMIES = {
  normal:       { hp:30,   speed:60,  gold:5,   damage:1,  resistance:0 },
  fast:         { hp:20,   speed:120, gold:3,   damage:1,  resistance:0 },
  tank:         { hp:120,  speed:35,  gold:15,  damage:3,  resistance:0 },
  boss:         { hp:500,  speed:30,  gold:100, damage:10, resistance:0, immune:['pushback'] },
  swarm:        { hp:15,   speed:90,  gold:2,   damage:1,  resistance:0 },
  splitter:     { hp:80,   speed:50,  gold:12,  damage:2,  resistance:0 },
  armored:      { hp:100,  speed:45,  gold:20,  damage:2,  resistance:0.5 },
  boss_armored: { hp:1500, speed:25,  gold:150, damage:15, resistance:0.3, immune:['pushback'] },
};

// ── 웨이브 정의 ───────────────────────────────────────────────────

/** @const {Array} R1~R20 사전 정의 웨이브 */
const WAVE_DEFS = [
  null,
  { enemies: [{type:'normal',count:5}], interval:1.5 },
  { enemies: [{type:'normal',count:8}], interval:1.3 },
  { enemies: [{type:'normal',count:8},{type:'fast',count:3}], interval:1.2 },
  { enemies: [{type:'normal',count:6},{type:'fast',count:6}], interval:1.1 },
  { enemies: [{type:'normal',count:8},{type:'tank',count:2}], interval:1.2 },
  { enemies: [{type:'fast',count:12}], interval:0.8 },
  { enemies: [{type:'normal',count:10},{type:'tank',count:3}], interval:1.0 },
  { enemies: [{type:'normal',count:12},{type:'fast',count:5}], interval:0.9 },
  { enemies: [{type:'normal',count:10},{type:'fast',count:5},{type:'tank',count:3}], interval:0.9 },
  { enemies: [{type:'boss',count:1},{type:'normal',count:10}], interval:1.0, boss:true },
  { enemies: [{type:'normal',count:15},{type:'fast',count:8}], interval:0.8 },
  { enemies: [{type:'normal',count:12},{type:'tank',count:5}], interval:0.9 },
  { enemies: [{type:'fast',count:20},{type:'tank',count:3}], interval:0.7 },
  { enemies: [{type:'normal',count:15},{type:'fast',count:8},{type:'tank',count:4}], interval:0.8 },
  { enemies: [{type:'normal',count:10},{type:'fast',count:5},{type:'swarm',count:20}], interval:0.6 },
  { enemies: [{type:'swarm',count:30},{type:'tank',count:4}], interval:0.5 },
  { enemies: [{type:'normal',count:15},{type:'swarm',count:15},{type:'tank',count:4}], interval:0.65 },
  { enemies: [{type:'normal',count:10},{type:'splitter',count:5},{type:'tank',count:3}], interval:0.9 },
  { enemies: [{type:'swarm',count:20},{type:'splitter',count:5},{type:'fast',count:10}], interval:0.7 },
  { enemies: [{type:'boss_armored',count:1},{type:'tank',count:5},{type:'normal',count:15}], interval:1.0, boss:true },
];

// ── 유틸리티 ──────────────────────────────────────────────────────

/**
 * 두 점 사이의 유클리드 거리를 계산한다.
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 * @returns {number}
 */
function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * R21+ 동적 웨이브를 생성한다.
 * @param {number} round - 라운드 번호 (21 이상)
 * @returns {{enemies: Array, interval: number, boss: boolean}}
 */
function generateWave(round) {
  const baseCount = 8 + Math.floor(round * 1.2);
  const hpScale = calcHpScale(round);
  const speedScale = 1 + (round - 1) * 0.02;
  const goldScale = 1 + (round - 1) * 0.06;
  const interval = Math.max(0.4, 1.5 - round * 0.05);
  const isBoss = (round % 10 === 0);

  const enemies = [];

  if (isBoss) {
    // R20+ 보스는 장갑보스 사용
    enemies.push({
      type: 'boss_armored', count: 1,
      hpScale: hpScale * getBossHpMultiplier(round), speedScale, goldScale,
    });
  }

  // 특수적 확률 판정 (유닛별 Math.random 사용으로 매 시뮬 결과 변동)
  const totalUnits = isBoss ? baseCount - 1 : baseCount;
  const counts = { normal: 0, fast: 0, tank: 0, swarm: 0, splitter: 0, armored: 0 };

  for (let i = 0; i < totalUnits; i++) {
    const roll = Math.random();
    let assigned = false;

    // 특수적 확률 체크 (우선순위: armored → splitter → swarm)
    if (round >= 20 && !assigned) {
      if (roll < 0.12) { counts.armored++; assigned = true; }
    }
    if (round >= 18 && !assigned) {
      if (roll < 0.12 + 0.10) { counts.splitter++; assigned = true; }
    }
    if (round >= 15 && !assigned) {
      if (roll < 0.12 + 0.10 + 0.15) { counts.swarm++; assigned = true; }
    }

    // 나머지: normal 50%, fast 30%, tank 20% (상대 비율)
    if (!assigned) {
      const baseRoll = Math.random();
      if (baseRoll < 0.5) counts.normal++;
      else if (baseRoll < 0.8) counts.fast++;
      else counts.tank++;
    }
  }

  for (const [etype, cnt] of Object.entries(counts)) {
    if (cnt > 0) {
      enemies.push({ type: etype, count: cnt, hpScale, speedScale, goldScale });
    }
  }

  return { enemies, interval, boss: isBoss };
}

/**
 * 강화 비용을 계산한다.
 * @param {number} level - 현재 강화 레벨
 * @returns {number} 비용
 */
function enhanceCost(level) {
  return ENHANCE_BASE_COST + (level - 1) * ENHANCE_COST_INCREMENT;
}

// ── 배치 셀 점수 계산 ────────────────────────────────────────────

/** @type {{col:number,row:number}[]} 배치 가능한 빈 셀 목록 */
const BUILDABLE_CELLS = [];
for (let r = 0; r < MAP_GRID.length; r++) {
  for (let c = 0; c < MAP_GRID[r].length; c++) {
    if (MAP_GRID[r][c] === 0) {
      BUILDABLE_CELLS.push({ col: c, row: r });
    }
  }
}

/**
 * 각 빈 셀의 "경로 커버리지 점수"를 range 기준으로 계산한다.
 * 해당 range 내에 들어오는 경로 웨이포인트 수를 점수로 사용한다.
 * @param {number} range - 타워 사거리
 * @returns {{col:number,row:number,score:number}[]} 점수 내림차순 정렬
 */
function scoreCells(range) {
  return BUILDABLE_CELLS.map(cell => {
    const pos = gridToPixel(cell.col, cell.row);
    let score = 0;
    for (const wp of PATH_PIXELS) {
      if (dist(pos, wp) <= range) score++;
    }
    return { ...cell, score };
  }).sort((a, b) => b.score - a.score);
}

/** @type {Map<number, Array>} range별 셀 점수 캐시 */
const cellScoreCache = new Map();

/**
 * range에 대한 셀 점수를 캐시하여 반환한다.
 * @param {number} range
 * @returns {{col:number,row:number,score:number}[]}
 */
function getCellScores(range) {
  if (!cellScoreCache.has(range)) {
    cellScoreCache.set(range, scoreCells(range));
  }
  return cellScoreCache.get(range);
}

// ── 적 인스턴스 ──────────────────────────────────────────────────

/**
 * 적 인스턴스를 생성한다.
 * @param {string} type - 적 타입명
 * @param {number} [hpScale=1] - HP 스케일
 * @param {number} [speedScale=1] - 속도 스케일
 * @param {number} [goldScale=1] - 골드 스케일
 * @returns {Object} 적 인스턴스
 */
function createEnemy(type, hpScale = 1, speedScale = 1, goldScale = 1) {
  const base = ENEMIES[type];
  const hp = Math.round(base.hp * hpScale);
  return {
    type,
    hp,
    maxHp: hp,
    speed: base.speed * speedScale,
    baseSpeed: base.speed * speedScale,
    gold: Math.round(base.gold * goldScale),
    damage: base.damage,
    resistance: base.resistance,
    immune: base.immune ? [...base.immune] : [],
    // 경로 진행 상태
    waypointIndex: 0,
    x: PATH_PIXELS[0].x,
    y: PATH_PIXELS[0].y,
    alive: true,
    reachedBase: false,
    // 디버프 상태
    slowTimer: 0,
    slowAmount: 0,
    burnTimer: 0,
    burnDps: 0,
    poisonTimer: 0,
    poisonDps: 0,
    armorReduced: false,
    armorReduction: 0,
  };
}

// ── 타워 인스턴스 ────────────────────────────────────────────────

/**
 * 타워 인스턴스를 생성한다.
 * @param {string} towerType - T1 타워 타입명
 * @param {number} col - 배치 열
 * @param {number} row - 배치 행
 * @returns {Object} 타워 인스턴스
 */
function createTower(towerType, col, row) {
  const base = TOWERS[towerType];
  const pos = gridToPixel(col, row);
  return {
    type: towerType,
    attackType: base.type,
    col,
    row,
    x: pos.x,
    y: pos.y,
    damage: base.damage,
    fireRate: base.fireRate,
    range: base.range,
    cooldown: 0,
    totalCost: base.cost,
    enhanceLevel: 0,
    // 합성 관련 필드
    mergeId: null,
    tier: 1,
    // 전투 스탯
    splashRadius: base.splashRadius || 0,
    chainCount: base.chainCount || 0,
    chainDecay: base.chainDecay || 1,
    slowAmount: base.slowAmount || 0,
    slowDuration: base.slowDuration || 0,
    pushbackDistance: base.pushbackDistance || 0,
    burnDamage: base.burnDamage || 0,
    burnDuration: base.burnDuration || 0,
    poisonDamage: base.poisonDamage || 0,
    poisonDuration: base.poisonDuration || 0,
    armorReduction: base.armorReduction || 0,
    armorPiercing: base.armorPiercing || false,
  };
}

// ── 합성 로직 ────────────────────────────────────────────────────

/**
 * 타워의 합성 ID를 반환한다. 합성된 타워는 mergeId, 미합성은 type을 사용한다.
 * @param {Object} tower - 타워 인스턴스
 * @returns {string} 합성 레시피에서 사용할 ID
 */
function getTowerId(tower) {
  return tower.mergeId || tower.type;
}

/**
 * 타워 배열에서 합성 가능한 쌍을 찾아 합성을 수행한다.
 * 한 번에 하나의 합성만 실행하며, 성공 시 true를 반환한다.
 * @param {Object[]} towers - 타워 배열 (원본 변경)
 * @param {Set<string>} occupied - 점유된 셀 집합 (제거 시 업데이트)
 * @returns {boolean} 합성 성공 여부
 */
function tryMerge(towers, occupied) {
  for (let i = 0; i < towers.length; i++) {
    for (let j = i + 1; j < towers.length; j++) {
      // 합성 조건: 두 타워 모두 enhanceLevel === 0
      if (towers[i].enhanceLevel !== 0 || towers[j].enhanceLevel !== 0) continue;

      const idA = getTowerId(towers[i]);
      const idB = getTowerId(towers[j]);
      const key = [idA, idB].sort().join('+');
      const recipe = MERGE_RECIPES[key];

      if (recipe && MERGED_STATS[recipe.id]) {
        const stats = MERGED_STATS[recipe.id];

        // towers[i]를 합성 결과로 변환
        towers[i].mergeId = recipe.id;
        towers[i].tier = recipe.tier;
        towers[i].attackType = stats.type;
        towers[i].damage = stats.damage;
        towers[i].fireRate = stats.fireRate;
        towers[i].range = stats.range;
        towers[i].enhanceLevel = 0;
        towers[i].splashRadius = stats.splashRadius || 0;
        towers[i].chainCount = stats.chainCount || 0;
        towers[i].chainDecay = stats.chainDecay || 1;
        towers[i].slowAmount = stats.slowAmount || 0;
        towers[i].slowDuration = stats.slowDuration || 0;
        towers[i].pushbackDistance = stats.pushbackDistance || 0;
        towers[i].burnDamage = stats.burnDamage || 0;
        towers[i].burnDuration = stats.burnDuration || 0;
        towers[i].poisonDamage = stats.poisonDamage || 0;
        towers[i].poisonDuration = stats.poisonDuration || 0;
        towers[i].armorReduction = stats.armorReduction || 0;
        towers[i].armorPiercing = stats.armorPiercing || false;

        // towers[j] 제거 및 셀 해제
        occupied.delete(`${towers[j].col},${towers[j].row}`);
        towers.splice(j, 1);

        return true; // 한 번에 하나만 합성
      }
    }
  }
  return false;
}

/**
 * 특정 레시피 키에 대해 합성을 시도한다. 해당 쌍이 존재하면 합성한다.
 * @param {Object[]} towers - 타워 배열
 * @param {Set<string>} occupied - 점유 셀
 * @param {string} targetKey - 합성 레시피 키 (예: 'archer+archer')
 * @returns {boolean} 합성 성공 여부
 */
function tryMergeSpecific(towers, occupied, targetKey) {
  const recipe = MERGE_RECIPES[targetKey];
  if (!recipe || !MERGED_STATS[recipe.id]) return false;

  const [idA, idB] = targetKey.split('+');

  for (let i = 0; i < towers.length; i++) {
    if (towers[i].enhanceLevel !== 0) continue;
    const tiA = getTowerId(towers[i]);
    if (tiA !== idA && tiA !== idB) continue;

    const targetId = (tiA === idA) ? idB : idA;

    for (let j = 0; j < towers.length; j++) {
      if (i === j) continue;
      if (towers[j].enhanceLevel !== 0) continue;
      if (getTowerId(towers[j]) !== targetId) continue;

      // 동종 합성일 때 같은 ID가 맞는지 재확인
      if (idA === idB && tiA !== idA) continue;

      const stats = MERGED_STATS[recipe.id];
      const keepIdx = Math.min(i, j);
      const removeIdx = Math.max(i, j);

      towers[keepIdx].mergeId = recipe.id;
      towers[keepIdx].tier = recipe.tier;
      towers[keepIdx].attackType = stats.type;
      towers[keepIdx].damage = stats.damage;
      towers[keepIdx].fireRate = stats.fireRate;
      towers[keepIdx].range = stats.range;
      towers[keepIdx].enhanceLevel = 0;
      towers[keepIdx].splashRadius = stats.splashRadius || 0;
      towers[keepIdx].chainCount = stats.chainCount || 0;
      towers[keepIdx].chainDecay = stats.chainDecay || 1;
      towers[keepIdx].slowAmount = stats.slowAmount || 0;
      towers[keepIdx].slowDuration = stats.slowDuration || 0;
      towers[keepIdx].pushbackDistance = stats.pushbackDistance || 0;
      towers[keepIdx].burnDamage = stats.burnDamage || 0;
      towers[keepIdx].burnDuration = stats.burnDuration || 0;
      towers[keepIdx].poisonDamage = stats.poisonDamage || 0;
      towers[keepIdx].poisonDuration = stats.poisonDuration || 0;
      towers[keepIdx].armorReduction = stats.armorReduction || 0;
      towers[keepIdx].armorPiercing = stats.armorPiercing || false;

      occupied.delete(`${towers[removeIdx].col},${towers[removeIdx].row}`);
      towers.splice(removeIdx, 1);

      return true;
    }
  }
  return false;
}

// ── 시뮬레이션 엔진 ──────────────────────────────────────────────

/**
 * 한 게임을 시뮬레이션한다.
 * @param {Function} strategy - 전략 함수 (decidePurchase)
 * @returns {{round: number, hp: number, cleared: boolean}}
 */
function simulateGame(strategy) {
  let gold = STARTING_GOLD;
  let baseHp = MAX_BASE_HP;
  /** @type {Object[]} 배치된 타워 목록 */
  const towers = [];
  /** @type {Set<string>} 점유된 셀 (col,row 문자열) */
  const occupied = new Set();
  /** @type {number} 글로벌 강화 레벨 */
  let enhanceLevel = 1;

  for (let round = 1; round <= MAX_ROUND; round++) {
    // -- 웨이브 시작 전: 전략에 따라 타워 구매/강화/합성 --
    const purchaseResult = strategy({
      gold,
      towers,
      round,
      occupied,
      enhanceLevel,
    });

    // 구매/강화/합성 적용
    if (purchaseResult) {
      for (const action of purchaseResult) {
        if (action.action === 'buy') {
          const towerDef = TOWERS[action.towerType];
          if (gold >= towerDef.cost && !occupied.has(`${action.col},${action.row}`)) {
            gold -= towerDef.cost;
            towers.push(createTower(action.towerType, action.col, action.row));
            occupied.add(`${action.col},${action.row}`);
          }
        } else if (action.action === 'enhance') {
          const cost = enhanceCost(enhanceLevel);
          if (gold >= cost) {
            gold -= cost;
            enhanceLevel++;
          }
        } else if (action.action === 'merge') {
          // 전략이 직접 합성을 요청 (특정 키 또는 자동)
          if (action.key) {
            tryMergeSpecific(towers, occupied, action.key);
          } else {
            tryMerge(towers, occupied);
          }
        }
      }
    }

    // 강화 보너스를 타워에 적용 (매 라운드 재계산)
    for (const tower of towers) {
      // 합성 타워는 MERGED_STATS 기준, T1 타워는 TOWERS 기준
      const baseStats = tower.mergeId ? MERGED_STATS[tower.mergeId] : TOWERS[tower.type];
      const eLevel = enhanceLevel - 1; // 보너스 횟수 (레벨1 = 보너스 0회)
      tower.damage = baseStats.damage * Math.pow(1 + ENHANCE_STAT_BONUS, eLevel);
      tower.range = baseStats.range * Math.pow(1.025, eLevel);
      tower.fireRate = baseStats.fireRate * Math.pow(0.975, eLevel);
      if (tower.fireRate < 0.3) tower.fireRate = 0.3;
    }

    // -- 웨이브 실행 --
    const waveDef = round <= 20 ? WAVE_DEFS[round] : generateWave(round);

    // 스폰 큐 생성
    /** @type {{type: string, hpScale: number, speedScale: number, goldScale: number}[]} */
    const spawnQueue = [];
    for (const group of waveDef.enemies) {
      for (let i = 0; i < group.count; i++) {
        spawnQueue.push({
          type: group.type,
          hpScale: group.hpScale || 1,
          speedScale: group.speedScale || 1,
          goldScale: group.goldScale || 1,
        });
      }
    }

    /** @type {Object[]} 현재 웨이브의 활성 적 목록 */
    const activeEnemies = [];
    let spawnIndex = 0;
    let spawnTimer = 0;

    // 틱 루프
    let maxTicks = 120 / TICK; // 최대 120초 (안전장치)
    let tickCount = 0;

    while (tickCount < maxTicks) {
      tickCount++;

      // 1. 적 스폰
      if (spawnIndex < spawnQueue.length) {
        spawnTimer -= TICK;
        if (spawnTimer <= 0) {
          const sq = spawnQueue[spawnIndex];
          activeEnemies.push(createEnemy(sq.type, sq.hpScale, sq.speedScale, sq.goldScale));
          spawnIndex++;
          spawnTimer = waveDef.interval;
        }
      }

      // 2. 적 이동
      for (const enemy of activeEnemies) {
        if (!enemy.alive || enemy.reachedBase) continue;

        // 슬로우 적용
        let currentSpeed = enemy.baseSpeed;
        if (enemy.slowTimer > 0) {
          currentSpeed *= (1 - enemy.slowAmount);
          enemy.slowTimer -= TICK;
        }

        const moveDistance = currentSpeed * TICK;
        let remaining = moveDistance;

        while (remaining > 0 && enemy.waypointIndex < PATH_PIXELS.length) {
          const target = PATH_PIXELS[enemy.waypointIndex];
          const d = dist({ x: enemy.x, y: enemy.y }, target);
          if (d <= remaining) {
            enemy.x = target.x;
            enemy.y = target.y;
            remaining -= d;
            enemy.waypointIndex++;
          } else {
            // 부분 이동
            const ratio = remaining / d;
            enemy.x += (target.x - enemy.x) * ratio;
            enemy.y += (target.y - enemy.y) * ratio;
            remaining = 0;
          }
        }

        // 기지 도달 검사
        if (enemy.waypointIndex >= PATH_PIXELS.length) {
          enemy.reachedBase = true;
          enemy.alive = false;
          baseHp -= enemy.damage;
        }
      }

      // 3. 타워 공격
      for (const tower of towers) {
        tower.cooldown -= TICK;
        if (tower.cooldown > 0) continue;

        // 사거리 내 적 찾기
        const inRange = activeEnemies.filter(e =>
          e.alive && !e.reachedBase && dist({ x: tower.x, y: tower.y }, { x: e.x, y: e.y }) <= tower.range
        );

        if (inRange.length === 0) continue;

        // 가장 앞에 있는 적 (waypointIndex가 높은 적)
        inRange.sort((a, b) => b.waypointIndex - a.waypointIndex || dist({ x: a.x, y: a.y }, PATH_PIXELS[Math.min(a.waypointIndex, PATH_PIXELS.length - 1)]) - dist({ x: b.x, y: b.y }, PATH_PIXELS[Math.min(b.waypointIndex, PATH_PIXELS.length - 1)]));
        const target = inRange[0];

        tower.cooldown = tower.fireRate;

        // 타워의 방어 관통 여부
        const towerArmorPiercing = tower.armorPiercing || false;

        /**
         * 적에게 데미지를 적용한다.
         * @param {Object} enemy - 대상 적
         * @param {number} dmg - 원시 데미지
         * @param {boolean} [armorPiercing=false] - 방어 관통 여부
         */
        const applyDamage = (enemy, dmg, armorPiercing = false) => {
          const pierce = armorPiercing || towerArmorPiercing;
          let res = enemy.resistance;
          // 독 타워의 방어력 감소 효과 적용
          if (enemy.armorReduced) {
            res = Math.max(0, res - enemy.armorReduction);
          }
          const finalDmg = pierce ? Math.max(1, Math.floor(dmg)) : Math.max(1, Math.floor(dmg * (1 - res)));
          enemy.hp -= finalDmg;
          if (enemy.hp <= 0) {
            enemy.alive = false;
          }
        };

        /**
         * 슬로우 효과를 적용한다 (합성 타워의 슬로우 지원).
         * @param {Object} enemy - 대상 적
         */
        const applySlow = (enemy) => {
          if (tower.slowAmount && !enemy.immune?.includes('slow')) {
            enemy.slowTimer = tower.slowDuration;
            enemy.slowAmount = tower.slowAmount;
          }
        };

        /**
         * 넉백 효과를 적용한다 (합성 타워의 넉백 지원).
         * @param {Object} enemy - 대상 적
         */
        const applyPushback = (enemy) => {
          if (tower.pushbackDistance && !enemy.immune?.includes('pushback')) {
            let pushRemaining = tower.pushbackDistance;
            while (pushRemaining > 0 && enemy.waypointIndex > 1) {
              const prevWp = PATH_PIXELS[enemy.waypointIndex - 1];
              const d = dist({ x: enemy.x, y: enemy.y }, prevWp);
              if (d <= pushRemaining) {
                enemy.x = prevWp.x;
                enemy.y = prevWp.y;
                pushRemaining -= d;
                enemy.waypointIndex--;
              } else {
                const ratio = pushRemaining / d;
                enemy.x += (prevWp.x - enemy.x) * ratio;
                enemy.y += (prevWp.y - enemy.y) * ratio;
                pushRemaining = 0;
              }
            }
          }
        };

        /**
         * 화상 DoT를 적용한다 (합성 타워의 화상 지원).
         * @param {Object} enemy - 대상 적
         */
        const applyBurn = (enemy) => {
          if (tower.burnDamage) {
            enemy.burnDps = tower.burnDamage;
            enemy.burnTimer = tower.burnDuration;
          }
        };

        /**
         * 독 DoT + 방어력 감소를 적용한다 (합성 타워의 독 지원).
         * @param {Object} enemy - 대상 적
         */
        const applyPoison = (enemy) => {
          if (tower.poisonDamage) {
            enemy.poisonDps = tower.poisonDamage;
            enemy.poisonTimer = tower.poisonDuration;
          }
          if (tower.armorReduction) {
            enemy.armorReduced = true;
            enemy.armorReduction = tower.armorReduction;
          }
        };

        switch (tower.attackType) {
          case 'single':
            applyDamage(target, tower.damage);
            applySlow(target);
            applyPushback(target);
            applyBurn(target);
            applyPoison(target);
            break;

          case 'splash': {
            applyDamage(target, tower.damage);
            applySlow(target);
            applyPushback(target);
            applyBurn(target);
            applyPoison(target);
            // 스플래시 범위 내 추가 적에게 동일 데미지
            const splashR = tower.splashRadius;
            for (const e of activeEnemies) {
              if (e === target || !e.alive || e.reachedBase) continue;
              if (dist({ x: target.x, y: target.y }, { x: e.x, y: e.y }) <= splashR) {
                applyDamage(e, tower.damage);
                applyBurn(e);
                applyPoison(e);
              }
            }
            break;
          }

          case 'chain': {
            // 체인 라이트닝: 최대 chainCount만큼 점프
            let chainDmg = tower.damage;
            const hit = new Set();
            let current = target;
            for (let i = 0; i < tower.chainCount; i++) {
              if (!current || !current.alive) break;
              applyDamage(current, chainDmg);
              applyBurn(current);
              applyPoison(current);
              hit.add(current);
              // 연쇄 감쇠 가속: hit i의 데미지 = damage × decay^(i*(i+1)/2)
              chainDmg *= Math.pow(tower.chainDecay, i + 1);
              // 다음 점프 대상: 범위 내에서 아직 안 맞은 가장 가까운 적
              let nextTarget = null;
              let minDist = Infinity;
              for (const e of activeEnemies) {
                if (e.alive && !e.reachedBase && !hit.has(e)) {
                  const d = dist({ x: current.x, y: current.y }, { x: e.x, y: e.y });
                  if (d <= tower.range && d < minDist) {
                    minDist = d;
                    nextTarget = e;
                  }
                }
              }
              current = nextTarget;
            }
            break;
          }

          case 'dot_single':
            // 히트 데미지 + 화상 DoT
            applyDamage(target, tower.damage);
            applyBurn(target);
            applyPoison(target);
            break;

          case 'aoe': {
            // AOE: 범위 데미지 + 디버프 (독/슬로우/넉백/화상)
            applyDamage(target, tower.damage);
            const aoeR = tower.splashRadius;
            const affected = [target];
            for (const e of activeEnemies) {
              if (e === target || !e.alive || e.reachedBase) continue;
              if (dist({ x: target.x, y: target.y }, { x: e.x, y: e.y }) <= aoeR) {
                applyDamage(e, tower.damage);
                affected.push(e);
              }
            }
            for (const e of affected) {
              applyPoison(e);
              applySlow(e);
              applyPushback(e);
              applyBurn(e);
            }
            break;
          }

          case 'piercing_beam': {
            // 직선 관통 (타워→타겟 방향으로 range까지)
            const dx = target.x - tower.x;
            const dy = target.y - tower.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) break;
            const nx = dx / len;
            const ny = dy / len;

            for (const e of activeEnemies) {
              if (!e.alive || e.reachedBase) continue;
              // 적에서 빔 직선까지의 거리 계산
              const ex = e.x - tower.x;
              const ey = e.y - tower.y;
              const proj = ex * nx + ey * ny;
              if (proj < 0 || proj > tower.range) continue;
              const perpX = ex - proj * nx;
              const perpY = ey - proj * ny;
              const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
              if (perpDist <= 15) { // 빔 히트 판정 폭 (적 반지름 정도)
                applyDamage(e, tower.damage);
                applyBurn(e);
                applyPoison(e);
              }
            }
            break;
          }
        }
      }

      // 4. DoT 처리
      for (const enemy of activeEnemies) {
        if (!enemy.alive) continue;

        if (enemy.burnTimer > 0) {
          enemy.hp -= enemy.burnDps * TICK;
          enemy.burnTimer -= TICK;
          if (enemy.hp <= 0) enemy.alive = false;
        }

        if (enemy.poisonTimer > 0) {
          enemy.hp -= enemy.poisonDps * TICK;
          enemy.poisonTimer -= TICK;
          if (enemy.hp <= 0) enemy.alive = false;
        }
      }

      // 5. 죽은 적 골드 획득
      for (const enemy of activeEnemies) {
        if (!enemy.alive && !enemy.reachedBase && !enemy._goldCollected) {
          gold += enemy.gold;
          enemy._goldCollected = true;
        }
      }

      // 6. 기지 HP 체크
      if (baseHp <= 0) {
        return { round, hp: 0, cleared: false };
      }

      // 7. 웨이브 종료 체크: 모든 적이 죽었거나 기지에 도달
      const allDone = spawnIndex >= spawnQueue.length &&
        activeEnemies.every(e => !e.alive || e.reachedBase);
      if (allDone) break;
    }

    // 웨이브 클리어 보너스
    const clearBonus = round * 5 + Math.floor(baseHp / MAX_BASE_HP * 15);
    gold += clearBonus;
  }

  return { round: MAX_ROUND, hp: baseHp, cleared: true };
}

// ── 전략 정의 ─────────────────────────────────────────────────────

/**
 * 사용 가능한 최적 빈 셀을 찾는다 (해당 range 기준 경로 커버리지 최고).
 * @param {number} range - 타워 사거리
 * @param {Set<string>} occupied - 이미 점유된 셀
 * @returns {{col:number,row:number}|null}
 */
function findBestCell(range, occupied) {
  const scored = getCellScores(range);
  for (const cell of scored) {
    if (!occupied.has(`${cell.col},${cell.row}`)) {
      return { col: cell.col, row: cell.row };
    }
  }
  return null;
}

/**
 * 특정 T1 타워를 구매하는 액션을 생성한다.
 * @param {string} towerType - 타워 타입명
 * @param {Set<string>} occupied - 점유된 셀
 * @param {number} remainingGold - 잔여 골드
 * @returns {{action: Object, cost: number}|null} 액션 및 비용, 불가시 null
 */
function tryBuy(towerType, occupied, remainingGold) {
  const cost = TOWERS[towerType].cost;
  if (remainingGold < cost) return null;
  const cell = findBestCell(TOWERS[towerType].range, occupied);
  if (!cell) return null;
  return {
    action: { action: 'buy', towerType, ...cell },
    cost,
  };
}

/**
 * 타워 배열에서 특정 ID를 가진 미강화 타워 수를 센다.
 * @param {Object[]} towers - 타워 배열
 * @param {string} id - 찾을 ID (mergeId 또는 type)
 * @returns {number} 개수
 */
function countTowersById(towers, id) {
  return towers.filter(t => getTowerId(t) === id && t.enhanceLevel === 0).length;
}

/**
 * 범용 합성 전략 생성기. T5까지의 합성 경로와 재료 구매 순서를 정의하면
 * 자동으로 상위 합성 → 하위 합성 → 재료 구매 순으로 행동을 결정한다.
 * @param {Object} opts - 전략 옵션
 * @param {string[][]} opts.mergeChain - 상위→하위 순 합성 레시피 키 배열
 * @param {string[]} opts.buyOrder - T1 재료 구매 우선순위
 * @returns {Function} 전략 함수
 */
function makeMergeStrategy(opts) {
  const { mergeChain, buyOrder } = opts;
  return (state) => {
    const { towers, occupied, gold } = state;
    const actions = [];
    let remainingGold = gold;
    const occ = new Set(occupied);

    // 합성 시도: 상위 티어부터 (T5 → T4 → T3 → T2)
    for (const key of mergeChain) {
      const [idA, idB] = key.split('+');
      const countA = countTowersById(towers, idA);
      const countB = countTowersById(towers, idB);
      if (idA === idB) {
        // 동종 합성: 2개 이상이면 모두 합성
        const pairs = Math.floor(countA / 2);
        for (let p = 0; p < pairs; p++) {
          actions.push({ action: 'merge', key });
        }
      } else if (countA >= 1 && countB >= 1) {
        actions.push({ action: 'merge', key });
      }
    }

    // 재료 구매 (라운드 로빈: 각 타입 1개씩 순환하여 다양한 T2 확보)
    let bought = true;
    while (bought) {
      bought = false;
      for (const tType of buyOrder) {
        if (remainingGold >= TOWERS[tType].cost) {
          const result = tryBuy(tType, occ, remainingGold);
          if (!result) continue;
          actions.push(result.action);
          occ.add(`${result.action.col},${result.action.row}`);
          remainingGold -= result.cost;
          bought = true;
        }
      }
    }

    // 남은 골드로 아처 보조
    if (!buyOrder.includes('archer')) {
      while (remainingGold >= TOWERS.archer.cost) {
        const result = tryBuy('archer', occ, remainingGold);
        if (!result) break;
        actions.push(result.action);
        occ.add(`${result.action.col},${result.action.row}`);
        remainingGold -= result.cost;
      }
    }

    return actions;
  };
}

/** @type {{name: string, fn: Function, note: string}[]} 전략 목록 */
const STRATEGIES = [
  // ── 1. T5 Omega Herald ──
  // genesis_verdict + void_sniper → omega_herald
  // genesis_verdict = celestial_judgment + cosmos_dragon
  // void_sniper = archer + cosmos_dragon
  // cosmos_dragon = ancient_dragon + wind (레시피 변경)
  // celestial_judgment = holy_dragon + solar_burst
  // T1 재료: dragon*5, light*3, wind*2, archer*1
  {
    name: 'Omega Herald',
    note: 'T5 genesis_verdict+void_sniper (dragon/light/wind 계열)',
    fn: makeMergeStrategy({
      mergeChain: [
        'genesis_verdict+void_sniper',       // T5
        'celestial_judgment+cosmos_dragon',   // T4 genesis_verdict
        'archer+cosmos_dragon',              // T4 void_sniper
        'ancient_dragon+wind',               // T3 cosmos_dragon (변경)
        'holy_dragon+solar_burst',            // T3 celestial_judgment
        'dragon+dragon',                      // T2 ancient_dragon
        'light+light',                        // T2 solar_burst
        'dragon+light',                       // T2 holy_dragon
      ],
      buyOrder: ['dragon', 'light', 'wind', 'archer'],
    }),
  },

  // ── 2. T5 Absolute Dominion ──
  // glacial_epoch + storm_dominion → absolute_dominion
  // glacial_epoch = absolute_frost_domain + ice
  // storm_dominion = thunder_lord + thunder_wyrm_king
  // absolute_frost_domain = frost_dragon + plague (레시피 변경)
  // thunder_wyrm_king = ancient_dragon + thunder_lord
  // T1 재료: dragon*3, ice*2, poison*2, lightning*4
  {
    name: 'Absolute Dominion',
    note: 'T5 glacial_epoch+storm_dominion (dragon/ice/poison/lightning 계열)',
    fn: makeMergeStrategy({
      mergeChain: [
        'glacial_epoch+storm_dominion',       // T5
        'absolute_frost_domain+ice',          // T4 glacial_epoch
        'thunder_lord+thunder_wyrm_king',     // T4 storm_dominion
        'frost_dragon+plague',                // T3 absolute_frost_domain (변경)
        'ancient_dragon+thunder_lord',        // T3 thunder_wyrm_king
        'dragon+dragon',                      // T2 ancient_dragon
        'lightning+lightning',                 // T2 thunder_lord (x2)
        'dragon+ice',                         // T2 frost_dragon
        'poison+poison',                      // T2 plague (다수 확보)
      ],
      buyOrder: ['lightning', 'poison', 'dragon', 'ice'],
    }),
  },

  // ── 3. T5 Star Forge ──
  // magma_core + solar_cremation → star_forge
  // magma_core = flame + hellquake
  // solar_cremation = grand_pyromancer + solar_burst
  // hellquake = inferno_dragon + quake
  // grand_pyromancer = inferno + quake (레시피 변경)
  // T1 재료: flame*4, dragon*1, rock*4, light*2
  {
    name: 'Star Forge',
    note: 'T5 magma_core+solar_cremation (flame/rock/light 계열)',
    fn: makeMergeStrategy({
      mergeChain: [
        'magma_core+solar_cremation',         // T5
        'flame+hellquake',                    // T4 magma_core
        'grand_pyromancer+solar_burst',       // T4 solar_cremation
        'inferno_dragon+quake',               // T3 hellquake
        'inferno+quake',                      // T3 grand_pyromancer (변경)
        'dragon+flame',                       // T2 inferno_dragon
        'rock+rock',                          // T2 quake (x2)
        'flame+flame',                        // T2 inferno
        'light+light',                        // T2 solar_burst
        'poison+poison',                      // T2 plague (방감 보조)
      ],
      buyOrder: ['rock', 'poison', 'flame', 'light', 'dragon'],
    }),
  },

  // ── 4. T5 Void Maelstrom ──
  // annihilation_gale + maelstrom_herald → void_maelstrom
  // annihilation_gale = primal_dragon_lord + wind
  // maelstrom_herald = lightning_tempest + typhoon
  // primal_dragon_lord = ancient_dragon + dragon
  // lightning_tempest = storm_mage + thunder_lord
  // T1 재료: dragon*3, wind*3, lightning*3, mage*1
  {
    name: 'Void Maelstrom',
    note: 'T5 annihilation_gale+maelstrom_herald (dragon/wind/lightning 계열)',
    fn: makeMergeStrategy({
      mergeChain: [
        'annihilation_gale+maelstrom_herald', // T5
        'primal_dragon_lord+wind',            // T4 annihilation_gale
        'lightning_tempest+typhoon',          // T4 maelstrom_herald
        'ancient_dragon+dragon',              // T3 primal_dragon_lord
        'storm_mage+thunder_lord',            // T3 lightning_tempest
        'dragon+dragon',                      // T2 ancient_dragon
        'wind+wind',                          // T2 typhoon
        'lightning+mage',                     // T2 storm_mage
        'lightning+lightning',                 // T2 thunder_lord
      ],
      buyOrder: ['dragon', 'lightning', 'wind', 'mage'],
    }),
  },

  // ── 5. T5 Extinction Engine ──
  // pandemic_sovereign + world_breaker → extinction_engine
  // pandemic_sovereign = plague_wyrm + venom_sovereign
  // world_breaker = earth_shatterer + tectonic_dragon
  // plague_wyrm = ancient_dragon + plague
  // venom_sovereign = plague + venom_dragon
  // earth_shatterer = quake + rock
  // tectonic_dragon = quake + stone_dragon
  // T1 재료: dragon*3, poison*5, rock*5
  {
    name: 'Extinction Engine',
    note: 'T5 pandemic_sovereign+world_breaker (dragon/poison/rock 계열)',
    fn: makeMergeStrategy({
      mergeChain: [
        'pandemic_sovereign+world_breaker',   // T5
        'plague_wyrm+venom_sovereign',        // T4 pandemic_sovereign
        'earth_shatterer+tectonic_dragon',    // T4 world_breaker
        'ancient_dragon+plague',              // T3 plague_wyrm
        'plague+venom_dragon',                // T3 venom_sovereign
        'quake+rock',                         // T3 earth_shatterer
        'quake+stone_dragon',                 // T3 tectonic_dragon
        'dragon+dragon',                      // T2 ancient_dragon
        'poison+poison',                      // T2 plague (x2)
        'dragon+poison',                      // T2 venom_dragon
        'rock+rock',                          // T2 quake (x2)
        'dragon+rock',                        // T2 stone_dragon
      ],
      buyOrder: ['rock', 'poison', 'dragon'],
    }),
  },
];

// ── 메인 실행 ─────────────────────────────────────────────────────

/**
 * 시뮬레이션을 실행하고 결과를 출력한다.
 */
function main() {
  const startTime = Date.now();

  console.log('');
  console.log('='.repeat(70));
  console.log(` Fantasy TD 밸런스 시뮬레이션 리포트 (T5 전략 5종 × ${RUNS_PER_STRATEGY}회 = ${5 * RUNS_PER_STRATEGY}회)`);
  console.log('='.repeat(70));
  console.log('');

  /** @type {{name: string, note: string, results: Array}[]} */
  const allResults = [];

  for (const strategy of STRATEGIES) {
    const results = [];
    for (let i = 0; i < RUNS_PER_STRATEGY; i++) {
      const result = simulateGame(strategy.fn);
      results.push(result);
    }
    allResults.push({ name: strategy.name, note: strategy.note, results });
  }

  // -- 요약 테이블 --
  console.log('전략별 결과 요약');
  console.log('-'.repeat(70));
  console.log(
    pad('전략', 22) + '| ' +
    pad('승률', 7) + '| ' +
    pad('평균R', 7) + '| ' +
    pad('최대R', 7) + '| ' +
    pad('평균HP', 8) + '| ' +
    '비고'
  );
  console.log('-'.repeat(70));

  for (const { name, note, results } of allResults) {
    const wins = results.filter(r => r.cleared).length;
    const avgRound = (results.reduce((s, r) => s + r.round, 0) / results.length).toFixed(1);
    const maxRound = Math.max(...results.map(r => r.round));
    const avgHp = (results.reduce((s, r) => s + r.hp, 0) / results.length).toFixed(1);

    console.log(
      pad(name, 22) + '| ' +
      pad(`${wins}/${RUNS_PER_STRATEGY}`, 7) + '| ' +
      pad(`R${avgRound}`, 7) + '| ' +
      pad(`R${maxRound}`, 7) + '| ' +
      pad(avgHp, 8) + '| ' +
      note
    );
  }

  console.log('');

  // -- 전략별 사망 라운드 분포 --
  console.log('-- 전략별 사망 라운드 분포 --');
  for (const { name, results } of allResults) {
    const deaths = results.filter(r => !r.cleared).map(r => r.round);
    if (deaths.length === 0) {
      console.log(`[${name}] 전멸 없음 (100% 클리어)`);
      continue;
    }
    // 5라운드 구간별 사망 빈도
    const buckets = {};
    for (const r of deaths) {
      const bucket = Math.floor((r - 1) / 5) * 5 + 1;
      const key = `R${bucket}~R${bucket + 4}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    const dist = sorted.map(([k, v]) => `${k}:${v}`).join(', ');
    console.log(`[${name}] ${dist}`);
  }

  console.log('');

  // -- 밸런스 분석 --
  console.log('-- 밸런스 분석 --');
  const allRounds = allResults.flatMap(s => s.results.map(r => r.round));
  const overallAvg = (allRounds.reduce((s, r) => s + r, 0) / allRounds.length).toFixed(1);
  console.log(`- 전체 평균 도달 라운드: R${overallAvg}`);

  // 전략 랭킹 (승률 → 평균라운드 → 평균HP 순)
  const ranked = allResults.map(s => {
    const wins = s.results.filter(r => r.cleared).length;
    const avgR = s.results.reduce((sum, r) => sum + r.round, 0) / s.results.length;
    const avgHp = s.results.reduce((sum, r) => sum + r.hp, 0) / s.results.length;
    const minR = Math.min(...s.results.map(r => r.round));
    return { name: s.name, wins, avgR, avgHp, minR };
  }).sort((a, b) => b.wins - a.wins || b.avgR - a.avgR || b.avgHp - a.avgHp);

  console.log(`- 가장 효과적인 전략: ${ranked[0].name} (승률 ${ranked[0].wins}/${RUNS_PER_STRATEGY}, 평균 R${ranked[0].avgR.toFixed(1)})`);
  console.log(`- 가장 약한 전략: ${ranked[ranked.length - 1].name} (승률 ${ranked[ranked.length - 1].wins}/${RUNS_PER_STRATEGY}, 평균 R${ranked[ranked.length - 1].avgR.toFixed(1)})`);

  // 전체 사망 구간 분석
  const deathRounds = allResults.flatMap(s => s.results.filter(r => !r.cleared).map(r => r.round));
  if (deathRounds.length > 0) {
    const buckets = {};
    for (const r of deathRounds) {
      const bucket = Math.floor((r - 1) / 5) * 5 + 1;
      const key = `R${bucket}~R${bucket + 4}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    const hardest = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    console.log(`- 가장 어려운 구간: ${hardest[0][0]} (${hardest[0][1]}회 사망)`);
    if (hardest.length > 1) {
      console.log(`- 두 번째 어려운 구간: ${hardest[1][0]} (${hardest[1][1]}회 사망)`);
    }
  } else {
    console.log('- 모든 전략이 R50 클리어 달성 (난이도 상향 검토 필요)');
  }

  // 전체 클리어율
  const clearRate = allResults.reduce((s, st) => s + st.results.filter(r => r.cleared).length, 0) / (STRATEGIES.length * RUNS_PER_STRATEGY) * 100;
  console.log(`- 전체 클리어율: ${clearRate.toFixed(1)}%`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  console.log(`시뮬레이션 완료: ${elapsed}초 소요`);
}

/**
 * 문자열을 지정 너비로 패딩한다.
 * @param {string|number} str - 원본 문자열
 * @param {number} width - 목표 너비
 * @returns {string} 패딩된 문자열
 */
function pad(str, width) {
  const s = String(str);
  // 한글 등 2바이트 문자의 실제 표시 폭 계산
  let displayWidth = 0;
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    // CJK 범위 (대략적)
    if (code >= 0xAC00 && code <= 0xD7AF) displayWidth += 2; // 한글
    else if (code >= 0x3000 && code <= 0x9FFF) displayWidth += 2; // CJK
    else displayWidth += 1;
  }
  if (displayWidth >= width) return s;
  return s + ' '.repeat(width - displayWidth);
}

main();
