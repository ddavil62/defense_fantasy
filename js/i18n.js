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
    // UI 공통
    'ui.damage': '공격력',
    'ui.range': '사거리',
    'ui.speed': '공속',
    'ui.special': '특수',
    // 강화 시스템
    'ui.enhance': '강화 +{level} ({cost}G)',
    'ui.maxEnhance': '최대 강화',
    // HP 회복
    'ui.hpRecover': '+HP ({cost}G)',
    'ui.hpRecoverFull': 'HP 최대',
    // 소모품 능력
    'ui.slowAll': '전체 슬로우',
    'ui.goldRain': '황금비',
    'ui.lightning': '번개 일격',
    'ui.cooldown': '쿨다운 {sec}초',
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
    'ui.damage': 'ATK',
    'ui.range': 'RNG',
    'ui.speed': 'SPD',
    'ui.special': 'Special',
    // Enhancement system
    'ui.enhance': 'Enhance +{level} ({cost}G)',
    'ui.maxEnhance': 'MAX Enhanced',
    // HP recovery
    'ui.hpRecover': '+HP ({cost}G)',
    'ui.hpRecoverFull': 'HP Full',
    // Consumable abilities
    'ui.slowAll': 'Slow All',
    'ui.goldRain': 'Gold Rain',
    'ui.lightning': 'Lightning Strike',
    'ui.cooldown': 'CD {sec}s',
  },
};
