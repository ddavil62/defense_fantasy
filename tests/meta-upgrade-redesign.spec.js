/**
 * @fileoverview 메타 업그레이드 시스템 재설계 QA 테스트.
 * config.js 헬퍼 함수, 세이브 마이그레이션, CollectionScene UI,
 * GameScene/TowerPanel/GameOverScene/MapClearScene 연동을 검증한다.
 */
import { test, expect } from '@playwright/test';

const SAVE_KEY = 'fantasy-td-save';

// 기본 세이브 데이터 (v9, globalUpgrades 모두 0)
function makeBaseSave(overrides = {}) {
  return {
    saveDataVersion: 9,
    bestRound: 0,
    bestKills: 0,
    totalGames: 0,
    diamond: 100,
    totalDiamondEarned: 100,
    globalUpgrades: {
      damage: 0, fireRate: 0, range: 0,
      startGold: 0, killGold: 0, drawDiscount: 0, mergeDiscount: 0,
      baseHp: 0, waveBonus: 0, diamondBonus: 0,
    },
    unlockedTowers: [],
    discoveredMerges: [],
    newDiscoveries: [],
    stats: {
      totalGamesPlayed: 0, totalKills: 0, totalBossKills: 0,
      totalTowersPlaced: 0, totalGoldEarned: 0, totalDamageDealt: 0,
      totalWavesCleared: 0, killsByEnemyType: {}, killsByTowerType: {},
      bestRound: 0, bestKills: 0, gameHistory: [],
    },
    worldProgress: {},
    endlessUnlocked: false,
    campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
    adFree: false,
    mergeTutorialDone: true,
    ...overrides,
  };
}

// v8 세이브 데이터 (마이그레이션 전)
function makeV8Save(overrides = {}) {
  return {
    saveDataVersion: 8,
    bestRound: 10,
    bestKills: 50,
    totalGames: 5,
    diamond: 20,
    totalDiamondEarned: 50,
    towerUpgrades: {
      archer: { damage: 2, fireRate: 1, range: 0 },
      mage: { damage: 1, fireRate: 0, range: 0 },
    },
    utilityUpgrades: { baseHp: 2, goldBoost: 1, waveBonus: 0 },
    unlockedTowers: [],
    discoveredMerges: [],
    newDiscoveries: [],
    stats: {
      totalGamesPlayed: 5, totalKills: 50, totalBossKills: 0,
      totalTowersPlaced: 0, totalGoldEarned: 0, totalDamageDealt: 0,
      totalWavesCleared: 0, killsByEnemyType: {}, killsByTowerType: {},
      bestRound: 10, bestKills: 50, gameHistory: [],
    },
    worldProgress: {},
    endlessUnlocked: false,
    campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
    adFree: false,
    mergeTutorialDone: true,
    ...overrides,
  };
}

test.describe('메타 업그레이드 재설계 - config.js 헬퍼 함수 검증', () => {
  test('GLOBAL_META 구조와 10개 항목 존재 확인', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const result = await page.evaluate(() => {
      // config.js는 ES Module이므로 동적으로 import
      return import('/js/config.js').then(mod => {
        const GM = mod.GLOBAL_META;
        const keys = Object.keys(GM.upgrades);
        return {
          maxLevel: GM.MAX_LEVEL,
          bonusPerLevel: GM.BONUS_PER_LEVEL,
          baseCost: GM.BASE_COST,
          costStep: GM.COST_STEP,
          upgradeKeys: keys,
          rangeMaxLevel: GM.upgrades.range?.maxLevel,
          categories: keys.map(k => GM.upgrades[k].category),
        };
      });
    });

    expect(result.maxLevel).toBe(10);
    expect(result.bonusPerLevel).toBe(0.10);
    expect(result.baseCost).toBe(5);
    expect(result.costStep).toBe(3);
    expect(result.upgradeKeys).toHaveLength(10);
    expect(result.upgradeKeys).toEqual([
      'damage', 'fireRate', 'range',
      'startGold', 'killGold', 'drawDiscount', 'mergeDiscount',
      'baseHp', 'waveBonus', 'diamondBonus',
    ]);
    expect(result.rangeMaxLevel).toBe(5);
    expect(result.categories).toContain('combat');
    expect(result.categories).toContain('economy');
    expect(result.categories).toContain('survival');
    expect(result.categories).toContain('growth');
  });

  test('calcGlobalUpgradeCost 공식 검증 (5 + currentLevel * 3)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const costs = await page.evaluate(() => {
      return import('/js/config.js').then(mod => {
        return Array.from({ length: 11 }, (_, i) => mod.calcGlobalUpgradeCost(i));
      });
    });

    expect(costs[0]).toBe(5);   // Lv0->1
    expect(costs[1]).toBe(8);   // Lv1->2
    expect(costs[2]).toBe(11);  // Lv2->3
    expect(costs[3]).toBe(14);  // Lv3->4
    expect(costs[4]).toBe(17);  // Lv4->5
    expect(costs[5]).toBe(20);  // Lv5->6
    expect(costs[9]).toBe(32);  // Lv9->10
    // 합계 검증 (0~9)
    const sum = costs.slice(0, 10).reduce((a, b) => a + b, 0);
    expect(sum).toBe(185);
  });

  test('10개 헬퍼 함수 정확성 검증', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const result = await page.evaluate(() => {
      return import('/js/config.js').then(mod => {
        const upgLv5 = {
          damage: 5, fireRate: 5, range: 5,
          startGold: 5, killGold: 5, drawDiscount: 5, mergeDiscount: 5,
          baseHp: 5, waveBonus: 5, diamondBonus: 5,
        };
        const upgLv0 = {
          damage: 0, fireRate: 0, range: 0,
          startGold: 0, killGold: 0, drawDiscount: 0, mergeDiscount: 0,
          baseHp: 0, waveBonus: 0, diamondBonus: 0,
        };
        return {
          // Lv0 (기본값)
          damageLv0: mod.getGlobalDamageMult(upgLv0),
          fireRateLv0: mod.getGlobalFireRateMult(upgLv0),
          rangeLv0: mod.getGlobalRangeMult(upgLv0),
          startGoldLv0: mod.getGlobalStartGold(upgLv0),
          killGoldLv0: mod.getGlobalKillGoldMult(upgLv0),
          drawDiscountLv0: mod.getGlobalDrawDiscountMult(upgLv0),
          mergeDiscountLv0: mod.getGlobalMergeDiscountMult(upgLv0),
          baseHpLv0: mod.getGlobalBaseHP(upgLv0),
          waveBonusLv0: mod.getGlobalWaveBonusMult(upgLv0),
          diamondBonusLv0: mod.getGlobalDiamondBonusMult(upgLv0),
          // Lv5
          damageLv5: mod.getGlobalDamageMult(upgLv5),
          fireRateLv5: mod.getGlobalFireRateMult(upgLv5),
          rangeLv5: mod.getGlobalRangeMult(upgLv5),
          startGoldLv5: mod.getGlobalStartGold(upgLv5),
          killGoldLv5: mod.getGlobalKillGoldMult(upgLv5),
          drawDiscountLv5: mod.getGlobalDrawDiscountMult(upgLv5),
          mergeDiscountLv5: mod.getGlobalMergeDiscountMult(upgLv5),
          baseHpLv5: mod.getGlobalBaseHP(upgLv5),
          waveBonusLv5: mod.getGlobalWaveBonusMult(upgLv5),
          diamondBonusLv5: mod.getGlobalDiamondBonusMult(upgLv5),
          // null/undefined safety
          damageNull: mod.getGlobalDamageMult(null),
          damageUndefined: mod.getGlobalDamageMult(undefined),
          baseHpEmpty: mod.getGlobalBaseHP({}),
          INITIAL_GOLD: mod.INITIAL_GOLD,
          BASE_HP: mod.BASE_HP,
        };
      });
    });

    // Lv0 = 기본값 (배율 1.0, 기본 수치)
    expect(result.damageLv0).toBe(1.0);
    expect(result.fireRateLv0).toBe(1.0);
    expect(result.rangeLv0).toBe(1.0);
    expect(result.startGoldLv0).toBe(result.INITIAL_GOLD);
    expect(result.killGoldLv0).toBe(1.0);
    expect(result.drawDiscountLv0).toBe(1.0);
    expect(result.mergeDiscountLv0).toBe(1.0);
    expect(result.baseHpLv0).toBe(result.BASE_HP);
    expect(result.waveBonusLv0).toBe(1.0);
    expect(result.diamondBonusLv0).toBe(1.0);

    // Lv5 수치 검증
    expect(result.damageLv5).toBeCloseTo(Math.pow(1.1, 5), 5);
    expect(result.fireRateLv5).toBeCloseTo(Math.pow(0.9, 5), 5);
    expect(result.rangeLv5).toBeCloseTo(Math.pow(1.1, 5), 5);
    expect(result.startGoldLv5).toBe(result.INITIAL_GOLD + 100); // 160 + 20*5
    expect(result.killGoldLv5).toBeCloseTo(Math.pow(1.1, 5), 5);
    expect(result.drawDiscountLv5).toBeCloseTo(Math.pow(0.95, 5), 5);
    expect(result.mergeDiscountLv5).toBeCloseTo(Math.pow(0.95, 5), 5);
    expect(result.baseHpLv5).toBe(result.BASE_HP + 15); // 20 + 3*5
    expect(result.waveBonusLv5).toBeCloseTo(Math.pow(1.1, 5), 5);
    expect(result.diamondBonusLv5).toBeCloseTo(Math.pow(1.1, 5), 5);

    // null/undefined safety
    expect(result.damageNull).toBe(1.0);
    expect(result.damageUndefined).toBe(1.0);
    expect(result.baseHpEmpty).toBe(result.BASE_HP);
  });

  test('기존 META_UPGRADE_CONFIG, UTILITY_UPGRADES가 삭제되었는지 확인', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const result = await page.evaluate(() => {
      return import('/js/config.js').then(mod => ({
        hasMetaUpgradeConfig: 'META_UPGRADE_CONFIG' in mod,
        hasUtilityUpgrades: 'UTILITY_UPGRADES' in mod,
        hasCalcMetaUpgradeCost: 'calcMetaUpgradeCost' in mod,
        hasGetMetaBaseHP: 'getMetaBaseHP' in mod,
        hasGetMetaMaxBaseHP: 'getMetaMaxBaseHP' in mod,
        hasGetMetaInitialGold: 'getMetaInitialGold' in mod,
        hasGetMetaWaveBonusMultiplier: 'getMetaWaveBonusMultiplier' in mod,
      }));
    });

    expect(result.hasMetaUpgradeConfig).toBe(false);
    expect(result.hasUtilityUpgrades).toBe(false);
    expect(result.hasCalcMetaUpgradeCost).toBe(false);
    expect(result.hasGetMetaBaseHP).toBe(false);
    expect(result.hasGetMetaMaxBaseHP).toBe(false);
    expect(result.hasGetMetaInitialGold).toBe(false);
    expect(result.hasGetMetaWaveBonusMultiplier).toBe(false);
  });

  test('SAVE_DATA_VERSION = 9 확인', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const version = await page.evaluate(() => {
      return import('/js/config.js').then(mod => mod.SAVE_DATA_VERSION);
    });
    expect(version).toBe(9);
  });
});

test.describe('세이브 마이그레이션 v8->v9', () => {
  test('towerUpgrades + utilityUpgrades 환불 금액이 정확하다', async ({ page }) => {
    // v8 세이브 설정: archer damage:2, fireRate:1, mage damage:1
    // archer damage 2: 5 + 8 = 13
    // archer fireRate 1: 5
    // mage damage 1: 5
    // tower total: 23
    // utility baseHp:2 -> 8+15=23, goldBoost:1 -> 8, waveBonus:0 -> 0
    // utility total: 31
    // grand total refund: 23 + 31 = 54
    const v8Save = makeV8Save({ diamond: 20 });

    await page.goto('/');
    await page.evaluate((save) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(save));
    }, v8Save);

    // 새로고침하여 마이그레이션 실행
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    // 잠시 대기 후 세이브 데이터 확인
    await page.waitForTimeout(2000);

    // BootScene은 마이그레이션 결과를 Phaser registry에만 저장하고
    // localStorage에는 즉시 쓰지 않으므로 registry에서 읽는다.
    const result = await page.evaluate(() => {
      const save = window.__game.registry.get('saveData');
      return {
        version: save?.saveDataVersion,
        diamond: save?.diamond,
        hasTowerUpgrades: save ? 'towerUpgrades' in save : null,
        hasUtilityUpgrades: save ? 'utilityUpgrades' in save : null,
        globalUpgrades: save?.globalUpgrades,
        refundAmount: save?._metaRefundAmount,
      };
    });

    expect(result.version).toBe(9);
    expect(result.diamond).toBe(20 + 54); // 원래 20 + 환불 54
    expect(result.hasTowerUpgrades).toBe(false);
    expect(result.hasUtilityUpgrades).toBe(false);
    expect(result.globalUpgrades).toEqual({
      damage: 0, fireRate: 0, range: 0,
      startGold: 0, killGold: 0, drawDiscount: 0, mergeDiscount: 0,
      baseHp: 0, waveBonus: 0, diamondBonus: 0,
    });
  });

  test('빈 v8 세이브 (업그레이드 없음) 마이그레이션 - 환불 0', async ({ page }) => {
    const v8Save = makeV8Save({
      diamond: 50,
      towerUpgrades: {},
      utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
    });

    await page.goto('/');
    await page.evaluate((save) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(save));
    }, v8Save);

    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const save = window.__game.registry.get('saveData');
      return { diamond: save?.diamond, version: save?.saveDataVersion };
    });

    expect(result.version).toBe(9);
    expect(result.diamond).toBe(50); // 환불 없음
  });

  test('defaultSaveData에 globalUpgrades 포함 확인', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const result = await page.evaluate(() => {
      return import('/js/config.js').then(mod => {
        const fresh = mod.migrateSaveData(null);
        return {
          hasGlobalUpgrades: 'globalUpgrades' in fresh,
          keys: Object.keys(fresh.globalUpgrades),
          allZero: Object.values(fresh.globalUpgrades).every(v => v === 0),
        };
      });
    });

    expect(result.hasGlobalUpgrades).toBe(true);
    expect(result.keys).toHaveLength(10);
    expect(result.allZero).toBe(true);
  });
});

test.describe('CollectionScene UI 검증', () => {
  test.beforeEach(async ({ page }) => {
    const save = makeBaseSave({ diamond: 200 });
    await page.goto('/');
    await page.evaluate((s) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(s));
    }, save);
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('CollectionScene 진입 및 렌더링 + 스크린샷', async ({ page }) => {
    // MenuScene에서 CollectionScene으로 이동
    await page.evaluate(() => {
      const game = window.__game;
      game.scene.start('CollectionScene');
    });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/collection-meta-tab.png' });

    // 씬이 활성 상태인지 확인
    const isActive = await page.evaluate(() => {
      return window.__game.scene.isActive('CollectionScene');
    });
    expect(isActive).toBe(true);
  });

  test('강화 버튼 클릭 시 다이아 차감 및 레벨 증가', async ({ page }) => {
    await page.evaluate(() => {
      window.__game.scene.start('CollectionScene');
    });
    await page.waitForTimeout(1500);

    // 강화 전 상태
    const before = await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('fantasy-td-save') || '{}');
      return { diamond: save.diamond, damageLevel: save.globalUpgrades?.damage || 0 };
    });

    expect(before.diamond).toBe(200);
    expect(before.damageLevel).toBe(0);

    // 강화 버튼 클릭 (Phaser canvas 내부이므로 좌표로 클릭)
    // btnX = GAME_WIDTH - PADDING_X - 38 = 360 - 12 - 38 = 310
    // cy = LIST_START_Y(92) + CATEGORY_H(28) + ITEM_H/2(28) = 148
    // btn y = cy + 8 = 156
    await page.click('canvas', { position: { x: 310, y: 156 } });
    await page.waitForTimeout(500);

    const after = await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('fantasy-td-save') || '{}');
      return { diamond: save.diamond, damageLevel: save.globalUpgrades?.damage || 0 };
    });

    expect(after.damageLevel).toBe(1);
    expect(after.diamond).toBe(200 - 5); // 비용 5 차감

    await page.screenshot({ path: 'tests/screenshots/collection-after-upgrade.png' });
  });

  test('다이아 부족 시 강화 불가', async ({ page }) => {
    // 다이아 0으로 재설정
    await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('fantasy-td-save') || '{}');
      save.diamond = 0;
      localStorage.setItem('fantasy-td-save', JSON.stringify(save));
    });
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      window.__game.scene.start('CollectionScene');
    });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/collection-no-diamond.png' });

    // 강화 버튼 클릭 시도
    await page.click('canvas', { position: { x: 310, y: 156 } });
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('fantasy-td-save') || '{}');
      return { diamond: save.diamond, damageLevel: save.globalUpgrades?.damage || 0 };
    });

    expect(result.diamond).toBe(0);
    expect(result.damageLevel).toBe(0); // 변화 없음
  });

  test('MAX 레벨 도달 시 강화 불가', async ({ page }) => {
    // range를 maxLevel(5)로 설정
    await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('fantasy-td-save') || '{}');
      save.globalUpgrades.range = 5;
      save.diamond = 100;
      localStorage.setItem('fantasy-td-save', JSON.stringify(save));
    });
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      window.__game.scene.start('CollectionScene');
    });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/collection-max-level.png' });

    const beforeDiamond = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('fantasy-td-save') || '{}').diamond;
    });

    // range 항목 위치: 92(start) + 28(catHeader) + 56*2 + 4*2 + 28(half) = 268, btn=276
    await page.click('canvas', { position: { x: 310, y: 276 } });
    await page.waitForTimeout(500);

    const afterDiamond = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('fantasy-td-save') || '{}').diamond;
    });

    expect(afterDiamond).toBe(beforeDiamond); // 변화 없음
  });
});

test.describe('콘솔 에러 및 예외 감시', () => {
  test('CollectionScene 진입 시 콘솔 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const save = makeBaseSave({ diamond: 50 });
    await page.goto('/');
    await page.evaluate((s) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(s));
    }, save);
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(1000);

    // CollectionScene 진입
    await page.evaluate(() => {
      window.__game.scene.start('CollectionScene');
    });
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('v8 마이그레이션 후 CollectionScene 진입 시 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const v8Save = makeV8Save();
    await page.goto('/');
    await page.evaluate((s) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(s));
    }, v8Save);
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // CollectionScene 진입
    await page.evaluate(() => {
      window.__game.scene.start('CollectionScene');
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'tests/screenshots/collection-after-migration.png' });

    expect(errors).toEqual([]);
  });

  test('게임 부팅 시 콘솔 에러 없음 (v9 세이브)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const save = makeBaseSave();
    await page.goto('/');
    await page.evaluate((s) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(s));
    }, save);
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(3000);

    expect(errors).toEqual([]);
  });

  test('신규 유저 (세이브 없음) 부팅 시 에러 없음', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('fantasy-td-save');
    });
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(3000);

    expect(errors).toEqual([]);
  });
});

test.describe('i18n 키 완전성 검증', () => {
  test('10개 업그레이드 이름/설명 키 + 카테고리 키 + UI 키 (ko + en) 존재', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const result = await page.evaluate(() => {
      return import('/js/i18n.js').then(mod => {
        const keys = [
          'damage', 'fireRate', 'range', 'startGold', 'killGold',
          'drawDiscount', 'mergeDiscount', 'baseHp', 'waveBonus', 'diamondBonus',
        ];
        const nameResults = {};
        const descResults = {};
        for (const key of keys) {
          nameResults[key] = mod.t(`meta.upgrade.${key}`);
          descResults[key] = mod.t(`meta.desc.${key}`);
        }

        const catResults = {};
        for (const cat of ['combat', 'economy', 'survival', 'growth']) {
          catResults[cat] = mod.t(`meta.category.${cat}`);
        }

        const uiResults = {
          level: mod.t('meta.level'),
          bonusPercent: mod.t('meta.bonus.percent'),
          bonusFlat: mod.t('meta.bonus.flat'),
          bonusDiscount: mod.t('meta.bonus.discount'),
          max: mod.t('meta.max'),
          upgradeButton: mod.t('meta.upgrade.button'),
          refundToast: mod.t('meta.refund.toast'),
        };

        return { nameResults, descResults, catResults, uiResults };
      });
    });

    // 이름 키 검증
    const nameKeys = Object.keys(result.nameResults);
    expect(nameKeys).toHaveLength(10);
    for (const key of nameKeys) {
      expect(result.nameResults[key]).toBeTruthy();
      expect(result.nameResults[key]).not.toBe(`meta.upgrade.${key}`);
    }

    // 설명 키 검증
    for (const key of nameKeys) {
      expect(result.descResults[key]).toBeTruthy();
      expect(result.descResults[key]).not.toBe(`meta.desc.${key}`);
    }

    // 카테고리 키 검증
    expect(Object.keys(result.catResults)).toHaveLength(4);
    for (const cat of ['combat', 'economy', 'survival', 'growth']) {
      expect(result.catResults[cat]).toBeTruthy();
    }

    // UI 키 검증
    expect(result.uiResults.level).toContain('{cur}');
    expect(result.uiResults.bonusPercent).toContain('{pct}');
    expect(result.uiResults.bonusFlat).toContain('{val}');
    expect(result.uiResults.bonusDiscount).toContain('{pct}');
    expect(result.uiResults.max).toBeTruthy();
    expect(result.uiResults.upgradeButton).toBeTruthy();
    expect(result.uiResults.refundToast).toContain('{amount}');
  });
});

test.describe('엣지케이스 및 예외 시나리오', () => {
  test('globalUpgrades가 undefined/null일 때 헬퍼가 안전하게 동작', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const result = await page.evaluate(() => {
      return import('/js/config.js').then(mod => ({
        dmg_null: mod.getGlobalDamageMult(null),
        dmg_undef: mod.getGlobalDamageMult(undefined),
        dmg_empty: mod.getGlobalDamageMult({}),
        fr_null: mod.getGlobalFireRateMult(null),
        rng_null: mod.getGlobalRangeMult(null),
        sg_null: mod.getGlobalStartGold(null),
        kg_null: mod.getGlobalKillGoldMult(null),
        dd_null: mod.getGlobalDrawDiscountMult(null),
        md_null: mod.getGlobalMergeDiscountMult(null),
        bh_null: mod.getGlobalBaseHP(null),
        wb_null: mod.getGlobalWaveBonusMult(null),
        db_null: mod.getGlobalDiamondBonusMult(null),
      }));
    });

    expect(result.dmg_null).toBe(1.0);
    expect(result.dmg_undef).toBe(1.0);
    expect(result.dmg_empty).toBe(1.0);
    expect(result.fr_null).toBe(1.0);
    expect(result.rng_null).toBe(1.0);
    expect(result.kg_null).toBe(1.0);
    expect(result.dd_null).toBe(1.0);
    expect(result.md_null).toBe(1.0);
    expect(result.wb_null).toBe(1.0);
    expect(result.db_null).toBe(1.0);
  });

  test('연속 강화 클릭 (빠른 연타) 시 정상 처리', async ({ page }) => {
    const save = makeBaseSave({ diamond: 500 });
    await page.goto('/');
    await page.evaluate((s) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(s));
    }, save);
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      window.__game.scene.start('CollectionScene');
    });
    await page.waitForTimeout(1500);

    // 빠르게 5번 연타 (damage 강화 버튼)
    for (let i = 0; i < 5; i++) {
      await page.click('canvas', { position: { x: 310, y: 156 } });
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('fantasy-td-save') || '{}');
      return {
        diamond: save.diamond,
        damageLevel: save.globalUpgrades?.damage || 0,
      };
    });

    // 5회 강화 비용: 5+8+11+14+17 = 55
    expect(result.damageLevel).toBe(5);
    expect(result.diamond).toBe(500 - 55);
  });

  test('마이그레이션: towerUpgrades에 이상한 데이터가 있어도 안전', async ({ page }) => {
    const weirdSave = makeV8Save({
      diamond: 10,
      towerUpgrades: {
        archer: { damage: 0, fireRate: null, range: undefined },
        nonexistent: 'garbage',
        mage: null,
      },
      utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
    });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.evaluate((s) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(s));
    }, weirdSave);
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const save = window.__game.registry.get('saveData');
      return {
        version: save?.saveDataVersion,
        diamond: save?.diamond,
        hasGlobalUpgrades: !!save?.globalUpgrades,
      };
    });

    expect(result.version).toBe(9);
    expect(result.diamond).toBe(10);
    expect(result.hasGlobalUpgrades).toBe(true);
    expect(errors).toEqual([]);
  });

  test('모바일 뷰포트(375x667)에서 CollectionScene 렌더링', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const save = makeBaseSave({ diamond: 100 });
    await page.goto('/');
    await page.evaluate((s) => {
      localStorage.setItem('fantasy-td-save', JSON.stringify(s));
    }, save);
    await page.reload();
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      window.__game.scene.start('CollectionScene');
    });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/screenshots/collection-mobile-viewport.png' });

    const isActive = await page.evaluate(() => {
      return window.__game.scene.isActive('CollectionScene');
    });
    expect(isActive).toBe(true);
  });
});

test.describe('크로스 참조: 기존 시스템 잔재 확인', () => {
  test('config.js에서 GLOBAL_META 관련 export가 모두 정상', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__game?.scene?.scenes?.length > 0, { timeout: 10000 });

    const result = await page.evaluate(() => {
      return import('/js/config.js').then(mod => ({
        hasGlobalMeta: 'GLOBAL_META' in mod,
        hasCalcGlobalUpgradeCost: typeof mod.calcGlobalUpgradeCost === 'function',
        hasGetGlobalDamageMult: typeof mod.getGlobalDamageMult === 'function',
        hasGetGlobalFireRateMult: typeof mod.getGlobalFireRateMult === 'function',
        hasGetGlobalRangeMult: typeof mod.getGlobalRangeMult === 'function',
        hasGetGlobalStartGold: typeof mod.getGlobalStartGold === 'function',
        hasGetGlobalKillGoldMult: typeof mod.getGlobalKillGoldMult === 'function',
        hasGetGlobalDrawDiscountMult: typeof mod.getGlobalDrawDiscountMult === 'function',
        hasGetGlobalMergeDiscountMult: typeof mod.getGlobalMergeDiscountMult === 'function',
        hasGetGlobalBaseHP: typeof mod.getGlobalBaseHP === 'function',
        hasGetGlobalWaveBonusMult: typeof mod.getGlobalWaveBonusMult === 'function',
        hasGetGlobalDiamondBonusMult: typeof mod.getGlobalDiamondBonusMult === 'function',
      }));
    });

    expect(result.hasGlobalMeta).toBe(true);
    expect(result.hasCalcGlobalUpgradeCost).toBe(true);
    expect(result.hasGetGlobalDamageMult).toBe(true);
    expect(result.hasGetGlobalFireRateMult).toBe(true);
    expect(result.hasGetGlobalRangeMult).toBe(true);
    expect(result.hasGetGlobalStartGold).toBe(true);
    expect(result.hasGetGlobalKillGoldMult).toBe(true);
    expect(result.hasGetGlobalDrawDiscountMult).toBe(true);
    expect(result.hasGetGlobalMergeDiscountMult).toBe(true);
    expect(result.hasGetGlobalBaseHP).toBe(true);
    expect(result.hasGetGlobalWaveBonusMult).toBe(true);
    expect(result.hasGetGlobalDiamondBonusMult).toBe(true);
  });
});
