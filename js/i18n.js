/**
 * @fileoverview Internationalization (i18n) module for Fantasy Tower Defense.
 * All user-facing text must be defined here in both ko and en.
 * Use t(key) to retrieve the localized string for the current locale.
 */

// ── Current locale (default: ko) ────────────────────────────────
let _locale = 'ko';

/**
 * Set the active locale.
 * @param {'ko'|'en'} loc - Locale code
 */
export function setLocale(loc) { _locale = loc; }

/**
 * Get the current locale.
 * @returns {string}
 */
export function getLocale() { return _locale; }

/**
 * Get localized string by key. Falls back to ko, then returns the key itself.
 * @param {string} key - Flat dot-notation key (e.g. 'tower.archer.name')
 * @returns {string}
 */
export function t(key) { return STRINGS[_locale]?.[key] ?? STRINGS['ko'][key] ?? key; }

// ── String Table ─────────────────────────────────────────────────
const STRINGS = {
  ko: {
    // 타워 이름
    'tower.archer.name': '궁수',
    'tower.archer.flavor': '정확한 화살이 적의 급소를 꿰뚫는다.',
    'tower.mage.name': '마법사',
    'tower.mage.flavor': '마나를 응축한 폭발로 다수를 쓸어버린다.',
    'tower.ice.name': '얼음',
    'tower.ice.flavor': '냉기가 적의 발을 얼어붙게 만든다.',
    'tower.lightning.name': '번개',
    'tower.lightning.flavor': '연쇄 전류가 무리를 관통한다.',
    'tower.flame.name': '불꽃',
    'tower.flame.flavor': '꺼지지 않는 불꽃이 적을 태운다.',
    'tower.rock.name': '바위',
    'tower.rock.flavor': '묵직한 일격이 어떤 갑옷도 무시한다.',
    'tower.poison.name': '독안개',
    'tower.poison.flavor': '보이지 않는 독이 서서히 스며든다.',
    'tower.wind.name': '바람',
    'tower.wind.flavor': '강풍이 적을 출발점으로 밀어낸다.',
    'tower.light.name': '빛',
    'tower.light.flavor': '관통하는 빛줄기가 일직선을 소멸시킨다.',
    'tower.dragon.name': '드래곤',
    'tower.dragon.flavor': '고대 용의 브레스가 전장을 지배한다.',

    // ── T2 동종 조합 타워 (10종) ──
    'tower.rapid_archer.name': '연속 사격수',
    'tower.rapid_archer.desc': '동일 활을 겹쳐 연사력을 극대화한 궁수.',
    'tower.overload_mage.name': '과충전 술사',
    'tower.overload_mage.desc': '마력 과부하로 거대한 폭발 1발을 날린다.',
    'tower.zero_field.name': '절대 영역',
    'tower.zero_field.desc': '주변 전체를 슬로우 장판으로 뒤덮는다.',
    'tower.thunder_lord.name': '뇌제',
    'tower.thunder_lord.desc': '번개가 전도체처럼 8체인 연쇄한다.',
    'tower.inferno.name': '업화',
    'tower.inferno.desc': '광역 지속 화상 장판을 생성한다.',
    'tower.quake.name': '지진파',
    'tower.quake.desc': '초고 피해와 광역 정지를 동시에 준다.',
    'tower.plague.name': '역병의 근원',
    'tower.plague.desc': '독 3중첩과 방어력 50% 감소를 건다.',
    'tower.typhoon.name': '대태풍',
    'tower.typhoon.desc': '범위 내 모든 적을 동시에 밀어낸다.',
    'tower.solar_burst.name': '태양 폭발',
    'tower.solar_burst.desc': '극대 범위의 광역 폭발을 일으킨다.',
    'tower.ancient_dragon.name': '고대 용왕',
    'tower.ancient_dragon.desc': '전방위 화염+독 복합 브레스를 뿜는다.',

    // ── T2 이종 조합: archer 관련 (8종) ──
    'tower.arcane_archer.name': '마법 화살사',
    'tower.arcane_archer.desc': '폭발 화살로 광역 피해를 준다.',
    'tower.cryo_sniper.name': '냉동 저격수',
    'tower.cryo_sniper.desc': '명중 즉시 적을 완전 정지시킨다.',
    'tower.shock_arrow.name': '전격 화살',
    'tower.shock_arrow.desc': '화살 명중 후 주변으로 번개가 전파된다.',
    'tower.fire_arrow.name': '화염 화살',
    'tower.fire_arrow.desc': '화살에 지속 화상 도트를 부여한다.',
    'tower.armor_pierce.name': '철갑 화살',
    'tower.armor_pierce.desc': '방어를 관통하는 고피해 단일 타격.',
    'tower.venom_shot.name': '독화살',
    'tower.venom_shot.desc': '명중 적에게 독과 방어력 감소를 건다.',
    'tower.gale_arrow.name': '폭풍 화살',
    'tower.gale_arrow.desc': '빠른 화살이 적을 뒤로 밀쳐낸다.',
    'tower.holy_arrow.name': '신성 화살',
    'tower.holy_arrow.desc': '관통 빔으로 일직선 고피해를 준다.',

    // ── T2 이종 조합: mage 관련 (7종) ──
    'tower.frost_mage.name': '서리 술사',
    'tower.frost_mage.desc': '폭발 시 광역 슬로우를 건다.',
    'tower.storm_mage.name': '폭풍 마법사',
    'tower.storm_mage.desc': '번개와 광역 폭발을 연계한다.',
    'tower.pyromancer.name': '화염 술사',
    'tower.pyromancer.desc': '광역 폭발에 화상 도트를 추가한다.',
    'tower.gravity_mage.name': '중력 마법사',
    'tower.gravity_mage.desc': '폭발과 범위 정지를 동시에 건다.',
    'tower.toxic_mage.name': '독기 술사',
    'tower.toxic_mage.desc': '폭발과 광역 독무를 뿌린다.',
    'tower.vacuum_mage.name': '진공 마법사',
    'tower.vacuum_mage.desc': '폭발로 적을 밀쳐낸다.',
    'tower.radiant_mage.name': '성광 마법사',
    'tower.radiant_mage.desc': '폭발에 성광 화상을 부여한다.',

    // ── T2 이종 조합: ice 관련 (6종) ──
    'tower.thunder_frost.name': '전격 빙결',
    'tower.thunder_frost.desc': '정지와 번개 전파를 동시에 건다.',
    'tower.cryo_flame.name': '냉열 교차',
    'tower.cryo_flame.desc': '화상과 슬로우를 동시에 건다.',
    'tower.glacier.name': '빙산',
    'tower.glacier.desc': '범위 완전 정지와 고피해를 동시에 준다.',
    'tower.frost_venom.name': '동상 독',
    'tower.frost_venom.desc': '슬로우와 독 도트를 동시에 건다.',
    'tower.blizzard.name': '빙풍',
    'tower.blizzard.desc': '광역 슬로우와 밀쳐냄을 동시에 건다.',
    'tower.holy_ice.name': '성빙',
    'tower.holy_ice.desc': '관통 빔에 슬로우를 부여한다.',

    // ── T2 이종 조합: lightning 관련 (5종) ──
    'tower.thunder_fire.name': '벼락불',
    'tower.thunder_fire.desc': '번개 연쇄에 화상 도트를 추가한다.',
    'tower.thunder_strike.name': '천둥 강타',
    'tower.thunder_strike.desc': '번개와 방어 관통 고피해를 준다.',
    'tower.toxic_shock.name': '독전기',
    'tower.toxic_shock.desc': '번개 연쇄에 독 방어력 감소를 건다.',
    'tower.storm_bolt.name': '폭풍 전격',
    'tower.storm_bolt.desc': '번개와 밀쳐냄을 동시에 건다.',
    'tower.holy_thunder.name': '신성 번개',
    'tower.holy_thunder.desc': '번개 연쇄와 관통 빔의 하이브리드.',

    // ── T2 이종 조합: flame 관련 (4종) ──
    'tower.magma_shot.name': '용암탄',
    'tower.magma_shot.desc': '고피해 화상과 광역 충격을 준다.',
    'tower.venom_fire.name': '맹독 화염',
    'tower.venom_fire.desc': '화상과 독 복합 도트를 건다.',
    'tower.fire_storm.name': '화염 폭풍',
    'tower.fire_storm.desc': '광역 화상과 밀치기를 동시에 건다.',
    'tower.solar_flame.name': '태양광 화염',
    'tower.solar_flame.desc': '관통 빔에 화상을 부여한다.',

    // ── T2 이종 조합: rock 관련 (3종) ──
    'tower.toxic_boulder.name': '독암',
    'tower.toxic_boulder.desc': '방어 관통과 광역 독을 동시에 건다.',
    'tower.stone_gale.name': '바위 폭풍',
    'tower.stone_gale.desc': '고피해 광역에 밀치기와 정지를 건다.',
    'tower.holy_stone.name': '성광 바위',
    'tower.holy_stone.desc': '방어 관통 관통 빔을 발사한다.',

    // ── T2 이종 조합: poison 관련 (2종) ──
    'tower.toxic_gale.name': '독풍',
    'tower.toxic_gale.desc': '독과 밀치기로 지속 괴롭힌다.',
    'tower.purge_venom.name': '정화의 독',
    'tower.purge_venom.desc': '독과 방어력 감소, 관통 빔 복합.',

    // ── T2 이종 조합: wind 관련 (1종) ──
    'tower.radiant_gale.name': '성광 폭풍',
    'tower.radiant_gale.desc': '관통 빔에 밀치기를 부여한다.',

    // ── T2 이종 조합: dragon 관련 (9종) ──
    'tower.dragon_rider.name': '용기병',
    'tower.dragon_rider.desc': '화살과 광역 불꽃을 동시에 쏜다.',
    'tower.dragon_mage.name': '용마법사',
    'tower.dragon_mage.desc': '폭발과 용염의 복합 마법을 쓴다.',
    'tower.frost_dragon.name': '빙룡',
    'tower.frost_dragon.desc': '냉기 브레스로 광역 슬로우를 건다.',
    'tower.thunder_dragon.name': '뇌룡',
    'tower.thunder_dragon.desc': '번개와 광역 화염을 동시에 쓴다.',
    'tower.inferno_dragon.name': '업화룡',
    'tower.inferno_dragon.desc': '광역 화상과 용염을 동시에 뿜는다.',
    'tower.stone_dragon.name': '석룡',
    'tower.stone_dragon.desc': '방어 관통과 광역 공격을 동시에 한다.',
    'tower.venom_dragon.name': '독룡',
    'tower.venom_dragon.desc': '독 3중첩과 광역 독무를 뿌린다.',
    'tower.storm_dragon.name': '폭풍룡',
    'tower.storm_dragon.desc': '광역 밀치기와 화염을 동시에 쓴다.',
    'tower.holy_dragon.name': '성룡',
    'tower.holy_dragon.desc': '관통 빔과 광역 화염을 동시에 쓴다.',

    // UI 공통
    'ui.damage': '공격력',
    'ui.range': '사거리',
    'ui.speed': '공속',
    'ui.special': '특수',
    // 강화 시스템
    'ui.enhance': '강화 +{level} ({cost}G)',
    'ui.maxEnhance': '최대 강화',
    // 합성 시스템
    'ui.dragToMerge': '드래그하여 합성',
    // HP 회복
    'ui.hpRecover': '+HP ({cost}G)',
    'ui.hpRecoverFull': 'HP 최대',
    // 소모품 능력
    'ui.slowAll': '전체 슬로우',
    'ui.goldRain': '황금비',
    'ui.lightning': '번개 일격',
    'ui.cooldown': '쿨다운 {sec}초',
    // 분기 특화 태그
    'branch.tag.aoe': '범위형',
    'branch.tag.stun': '강감속',
    'branch.tag.slow': '감속형',
    'branch.tag.burn': '화상형',
    'branch.tag.poison': '독형',
    'branch.tag.pierce': '관통형',
    'branch.tag.debuff': '약화형',
    'branch.tag.push': '밀치기형',
    'branch.tag.chain': '연쇄형',
    'branch.tag.single': '단일형',
  },
  en: {
    'tower.archer.name': 'Archer',
    'tower.archer.flavor': 'Precise arrows pierce the enemy\'s weakness.',
    'tower.mage.name': 'Mage',
    'tower.mage.flavor': 'Condensed mana blasts sweep through crowds.',
    'tower.ice.name': 'Ice',
    'tower.ice.flavor': 'Bitter cold freezes enemies in their tracks.',
    'tower.lightning.name': 'Lightning',
    'tower.lightning.flavor': 'Chained bolts surge through the horde.',
    'tower.flame.name': 'Flame',
    'tower.flame.flavor': 'Undying fire burns all it touches.',
    'tower.rock.name': 'Rock',
    'tower.rock.flavor': 'A heavy strike that ignores any armor.',
    'tower.poison.name': 'Poison',
    'tower.poison.flavor': 'Invisible venom seeps in slowly.',
    'tower.wind.name': 'Wind',
    'tower.wind.flavor': 'Gales push enemies back to the start.',
    'tower.light.name': 'Light',
    'tower.light.flavor': 'A piercing beam annihilates all in its line.',
    'tower.dragon.name': 'Dragon',
    'tower.dragon.flavor': 'Ancient dragon breath dominates the battlefield.',

    // ── T2 same-type towers (10) ──
    'tower.rapid_archer.name': 'Rapid Archer',
    'tower.rapid_archer.desc': 'Doubled bows maximize fire rate.',
    'tower.overload_mage.name': 'Overload Mage',
    'tower.overload_mage.desc': 'Mana overload delivers a massive single explosion.',
    'tower.zero_field.name': 'Zero Field',
    'tower.zero_field.desc': 'Blankets the area in a slow field.',
    'tower.thunder_lord.name': 'Thunder Lord',
    'tower.thunder_lord.desc': 'Lightning arcs through 8 chains like a conductor.',
    'tower.inferno.name': 'Inferno',
    'tower.inferno.desc': 'Creates a lingering burn field over a wide area.',
    'tower.quake.name': 'Quake',
    'tower.quake.desc': 'Massive damage with area-wide stun.',
    'tower.plague.name': 'Plague Source',
    'tower.plague.desc': 'Triple poison stacks with 50% armor reduction.',
    'tower.typhoon.name': 'Typhoon',
    'tower.typhoon.desc': 'Pushes back all enemies in range simultaneously.',
    'tower.solar_burst.name': 'Solar Burst',
    'tower.solar_burst.desc': 'Enormous AoE explosion across a wide radius.',
    'tower.ancient_dragon.name': 'Ancient Dragon',
    'tower.ancient_dragon.desc': 'Full-spectrum fire+poison breath.',

    // ── T2 cross-type: archer (8) ──
    'tower.arcane_archer.name': 'Arcane Archer',
    'tower.arcane_archer.desc': 'Explosive arrows deal splash damage.',
    'tower.cryo_sniper.name': 'Cryo Sniper',
    'tower.cryo_sniper.desc': 'Freezes enemies on hit for 1.5s.',
    'tower.shock_arrow.name': 'Shock Arrow',
    'tower.shock_arrow.desc': 'Arrows chain lightning to nearby enemies.',
    'tower.fire_arrow.name': 'Fire Arrow',
    'tower.fire_arrow.desc': 'Arrows apply burn damage over time.',
    'tower.armor_pierce.name': 'Armor Piercer',
    'tower.armor_pierce.desc': 'Armor-ignoring high single-target damage.',
    'tower.venom_shot.name': 'Venom Shot',
    'tower.venom_shot.desc': 'Applies poison and armor reduction on hit.',
    'tower.gale_arrow.name': 'Gale Arrow',
    'tower.gale_arrow.desc': 'Fast arrows push enemies back.',
    'tower.holy_arrow.name': 'Holy Arrow',
    'tower.holy_arrow.desc': 'Piercing beam deals high line damage.',

    // ── T2 cross-type: mage (7) ──
    'tower.frost_mage.name': 'Frost Mage',
    'tower.frost_mage.desc': 'Explosions apply area slow.',
    'tower.storm_mage.name': 'Storm Mage',
    'tower.storm_mage.desc': 'Lightning and splash explosion combo.',
    'tower.pyromancer.name': 'Pyromancer',
    'tower.pyromancer.desc': 'Splash explosions with burn DoT.',
    'tower.gravity_mage.name': 'Gravity Mage',
    'tower.gravity_mage.desc': 'Explosions stun enemies in the blast.',
    'tower.toxic_mage.name': 'Toxic Mage',
    'tower.toxic_mage.desc': 'Explosions spread poisonous fog.',
    'tower.vacuum_mage.name': 'Vacuum Mage',
    'tower.vacuum_mage.desc': 'Explosions push enemies away.',
    'tower.radiant_mage.name': 'Radiant Mage',
    'tower.radiant_mage.desc': 'Explosions add radiant burn.',

    // ── T2 cross-type: ice (6) ──
    'tower.thunder_frost.name': 'Thunder Frost',
    'tower.thunder_frost.desc': 'Freeze and chain lightning combo.',
    'tower.cryo_flame.name': 'Cryo Flame',
    'tower.cryo_flame.desc': 'Burn and slow — opposing elements coexist.',
    'tower.glacier.name': 'Glacier',
    'tower.glacier.desc': 'Area freeze with high damage.',
    'tower.frost_venom.name': 'Frost Venom',
    'tower.frost_venom.desc': 'Slow and poison DoT simultaneously.',
    'tower.blizzard.name': 'Blizzard',
    'tower.blizzard.desc': 'Area slow with pushback.',
    'tower.holy_ice.name': 'Holy Ice',
    'tower.holy_ice.desc': 'Piercing beam with slow effect.',

    // ── T2 cross-type: lightning (5) ──
    'tower.thunder_fire.name': 'Thunder Fire',
    'tower.thunder_fire.desc': 'Chain lightning with burn DoT.',
    'tower.thunder_strike.name': 'Thunder Strike',
    'tower.thunder_strike.desc': 'Lightning with armor-piercing damage.',
    'tower.toxic_shock.name': 'Toxic Shock',
    'tower.toxic_shock.desc': 'Chain lightning with poison armor reduction.',
    'tower.storm_bolt.name': 'Storm Bolt',
    'tower.storm_bolt.desc': 'Lightning chains with pushback.',
    'tower.holy_thunder.name': 'Holy Thunder',
    'tower.holy_thunder.desc': 'Chain lightning and piercing beam hybrid.',

    // ── T2 cross-type: flame (4) ──
    'tower.magma_shot.name': 'Magma Shot',
    'tower.magma_shot.desc': 'High damage burn with splash impact.',
    'tower.venom_fire.name': 'Venom Fire',
    'tower.venom_fire.desc': 'Burn and poison combined DoT.',
    'tower.fire_storm.name': 'Fire Storm',
    'tower.fire_storm.desc': 'Area burn with pushback.',
    'tower.solar_flame.name': 'Solar Flame',
    'tower.solar_flame.desc': 'Piercing beam with burn effect.',

    // ── T2 cross-type: rock (3) ──
    'tower.toxic_boulder.name': 'Toxic Boulder',
    'tower.toxic_boulder.desc': 'Armor-piercing with area poison.',
    'tower.stone_gale.name': 'Stone Gale',
    'tower.stone_gale.desc': 'High damage splash with stun and push.',
    'tower.holy_stone.name': 'Holy Stone',
    'tower.holy_stone.desc': 'Armor-piercing beam attack.',

    // ── T2 cross-type: poison (2) ──
    'tower.toxic_gale.name': 'Toxic Gale',
    'tower.toxic_gale.desc': 'Poison with pushback harassment.',
    'tower.purge_venom.name': 'Purge Venom',
    'tower.purge_venom.desc': 'Poison beam with armor reduction.',

    // ── T2 cross-type: wind (1) ──
    'tower.radiant_gale.name': 'Radiant Gale',
    'tower.radiant_gale.desc': 'Piercing beam with pushback.',

    // ── T2 cross-type: dragon (9) ──
    'tower.dragon_rider.name': 'Dragon Rider',
    'tower.dragon_rider.desc': 'Arrows with area fire breath.',
    'tower.dragon_mage.name': 'Dragon Mage',
    'tower.dragon_mage.desc': 'Explosion and dragon fire combined.',
    'tower.frost_dragon.name': 'Frost Dragon',
    'tower.frost_dragon.desc': 'Frost breath with area slow.',
    'tower.thunder_dragon.name': 'Thunder Dragon',
    'tower.thunder_dragon.desc': 'Lightning and area fire breath.',
    'tower.inferno_dragon.name': 'Inferno Dragon',
    'tower.inferno_dragon.desc': 'Intense area burn with dragon flames.',
    'tower.stone_dragon.name': 'Stone Dragon',
    'tower.stone_dragon.desc': 'Armor-piercing area attacks.',
    'tower.venom_dragon.name': 'Venom Dragon',
    'tower.venom_dragon.desc': 'Triple poison stacks with area effect.',
    'tower.storm_dragon.name': 'Storm Dragon',
    'tower.storm_dragon.desc': 'Area pushback with fire breath.',
    'tower.holy_dragon.name': 'Holy Dragon',
    'tower.holy_dragon.desc': 'Piercing beam with area fire.',

    'ui.damage': 'ATK',
    'ui.range': 'RNG',
    'ui.speed': 'SPD',
    'ui.special': 'Special',
    // Enhancement system
    'ui.enhance': 'Enhance +{level} ({cost}G)',
    'ui.maxEnhance': 'MAX Enhanced',
    // Merge system
    'ui.dragToMerge': 'Drag to merge',
    // HP recovery
    'ui.hpRecover': '+HP ({cost}G)',
    'ui.hpRecoverFull': 'HP Full',
    // Consumable abilities
    'ui.slowAll': 'Slow All',
    'ui.goldRain': 'Gold Rain',
    'ui.lightning': 'Lightning Strike',
    'ui.cooldown': 'CD {sec}s',
    // Branch specialization tags
    'branch.tag.aoe': 'AOE',
    'branch.tag.stun': 'Stun',
    'branch.tag.slow': 'Slow',
    'branch.tag.burn': 'Burn',
    'branch.tag.poison': 'Poison',
    'branch.tag.pierce': 'Pierce',
    'branch.tag.debuff': 'Debuff',
    'branch.tag.push': 'Push',
    'branch.tag.chain': 'Chain',
    'branch.tag.single': 'Single',
  },
};
