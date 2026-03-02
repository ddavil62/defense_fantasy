/**
 * @fileoverview AdMob 통합 Phase 1 QA 테스트.
 * AdManager Mock 모드 초기화, 전면 광고 스킵, GameOverScene 전환,
 * MapClearScene 전면 광고 미호출, 일일 제한 로직, 예외/엣지케이스를 검증한다.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3456/';

/**
 * 게임이 부팅되어 MenuScene에 도달할 때까지 대기하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=15000]
 */
async function waitForMenuScene(page, timeout = 15000) {
  await page.goto(BASE_URL, { waitUntil: 'load' });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout });
  await page.waitForFunction(() => {
    const g = window.__game;
    if (!g || !g.scene) return false;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === 'MenuScene';
  }, { timeout });
  await page.waitForTimeout(500);
}

/**
 * 현재 활성 씬의 키를 반환하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function getActiveSceneKey(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 ? scenes[0].sys.settings.key : 'NONE';
  });
}

/**
 * 특정 씬으로 직접 이동하는 헬퍼.
 * @param {import('@playwright/test').Page} page
 * @param {string} sceneName
 * @param {object} [data={}]
 */
async function navigateToScene(page, sceneName, data = {}) {
  await page.evaluate(({ sceneName, data }) => {
    const g = window.__game;
    const active = g.scene.getScenes(true);
    if (active.length > 0) {
      active[0].scene.start(sceneName, data);
    }
  }, { sceneName, data });
  await page.waitForFunction((name) => {
    const g = window.__game;
    const scenes = g.scene.getScenes(true);
    return scenes.length > 0 && scenes[0].sys.settings.key === name;
  }, sceneName, { timeout: 5000 });
  await page.waitForTimeout(300);
}


test.describe('AdMob 통합 Phase 1 검증', () => {

  // ========================================================================
  // 정상 동작 검증
  // ========================================================================
  test.describe('정상 동작', () => {

    test('BootScene에서 AdManager가 Mock 모드로 초기화되고 registry에 등록된다', async ({ page }) => {
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() === 'log') consoleLogs.push(msg.text());
      });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      // AdManager가 registry에 등록되어 있는지 확인
      const adManagerInfo = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        if (!adManager) return null;
        return {
          exists: true,
          isMock: adManager.isMock,
          initialized: adManager._initialized,
          hasAdmob: adManager._admob !== null,
        };
      });

      expect(adManagerInfo).not.toBeNull();
      expect(adManagerInfo.exists).toBe(true);
      expect(adManagerInfo.isMock).toBe(true);
      expect(adManagerInfo.initialized).toBe(true);
      expect(adManagerInfo.hasAdmob).toBe(false);

      // Mock 모드 초기화 로그 확인
      const mockInitLog = consoleLogs.find(l => l.includes('[AdManager] Mock'));
      expect(mockInitLog).toBeDefined();

      expect(errors).toEqual([]);
    });

    test('콘솔 에러 없이 게임이 로드된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('MenuScene');
      expect(errors).toEqual([]);

      await page.screenshot({ path: 'tests/screenshots/admob-p1-game-loaded.png' });
    });

    test('GameOverScene 직접 진입 시 정상 렌더링된다 (Mock: 전면 광고 스킵)', async ({ page }) => {
      const consoleLogs = [];
      page.on('console', msg => consoleLogs.push(msg.text()));
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      // GameOverScene으로 직접 이동 (게임오버 시뮬레이션)
      await navigateToScene(page, 'GameOverScene', {
        round: 5,
        kills: 20,
        gameStats: {
          towersPlaced: 3,
          towersSold: 1,
          towersUpgraded: 2,
          towersMerged: 0,
        },
        mapData: { id: 'f1_m1', worldId: 'forest', nameKey: 'map.f1_m1.name' },
        gameMode: 'campaign',
      });

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('GameOverScene');

      await page.screenshot({ path: 'tests/screenshots/admob-p1-gameover-scene.png' });
      expect(errors).toEqual([]);
    });

    test('MapClearScene 진입 시 전면 광고가 호출되지 않는다', async ({ page }) => {
      const consoleLogs = [];
      page.on('console', msg => consoleLogs.push(msg.text()));
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      // 로그 시작 지점 기록
      const logCountBefore = consoleLogs.length;

      // MapClearScene으로 이동
      await navigateToScene(page, 'MapClearScene', {
        currentHP: 15,
        maxHP: 20,
        wavesCleared: 5,
        kills: 30,
        gameStats: {
          towersPlaced: 5,
          towersSold: 1,
          towersUpgraded: 3,
          towersMerged: 0,
        },
        mapData: {
          id: 'f1_m1',
          waves: 5,
          difficulty: 1,
          nameKey: 'map.f1_m1.name',
          worldId: 'forest',
          totalWaves: 5,
        },
        gameMode: 'campaign',
      });

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('MapClearScene');

      // MapClearScene 진입 후 전면 광고 관련 로그가 없어야 한다
      const adLogs = consoleLogs.slice(logCountBefore)
        .filter(l => l.includes('[AdManager]') && l.includes('전면'));
      expect(adLogs).toEqual([]);

      await page.screenshot({ path: 'tests/screenshots/admob-p1-mapclear-no-ad.png' });
      expect(errors).toEqual([]);
    });

    test('GameScene._gameOver() 호출 시 Mock 전면 광고 스킵 후 GameOverScene으로 전환된다', async ({ page }) => {
      const consoleLogs = [];
      page.on('console', msg => consoleLogs.push(msg.text()));
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      // GameScene 시작 (endless 모드)
      await page.evaluate(() => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('GameScene', { gameMode: 'endless' });
        }
      });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
      }, { timeout: 15000 });
      await page.waitForTimeout(1500);

      // 기지 HP를 0으로 설정하여 게임오버 트리거
      const logCountBefore = consoleLogs.length;
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        if (scene && scene.sys.settings.key === 'GameScene') {
          scene.baseHP = 0;
        }
      });

      // GameOverScene으로 전환될 때까지 대기
      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameOverScene';
      }, { timeout: 10000 });
      await page.waitForTimeout(500);

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('GameOverScene');

      // Mock 전면 광고 스킵 로그 확인
      const adSkipLogs = consoleLogs.slice(logCountBefore)
        .filter(l => l.includes('[AdManager] Mock: 전면 광고 스킵'));
      expect(adSkipLogs.length).toBeGreaterThanOrEqual(1);

      await page.screenshot({ path: 'tests/screenshots/admob-p1-gameover-via-hp0.png' });
      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // AdManager 단위 로직 검증
  // ========================================================================
  test.describe('AdManager 단위 로직', () => {

    test('showInterstitial() Mock 모드에서 즉시 resolve한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        const start = performance.now();
        await adManager.showInterstitial();
        const elapsed = performance.now() - start;
        return { elapsed };
      });

      // Mock 모드에서는 거의 즉시 resolve되어야 한다 (100ms 이내)
      expect(result.elapsed).toBeLessThan(100);
      expect(errors).toEqual([]);
    });

    test('showRewarded() Mock 모드에서 { rewarded: true }를 반환한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        return await adManager.showRewarded('test-ad-unit-id');
      });

      expect(result).toEqual({ rewarded: true });
      expect(errors).toEqual([]);
    });

    test('일일 제한 카운터가 올바르게 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        const results = {};

        // 초기 상태 확인
        results.initialDiamondCount = adManager.getDailyAdCount('diamond');
        results.initialRemaining = adManager.getRemainingAdCount('diamond');
        results.initialLimitReached = adManager.isAdLimitReached('diamond');

        // 횟수 증가
        adManager.incrementDailyAdCount('diamond');
        results.afterOneCount = adManager.getDailyAdCount('diamond');
        results.afterOneRemaining = adManager.getRemainingAdCount('diamond');

        // 제한까지 증가 (diamond: 5회)
        for (let i = 0; i < 4; i++) {
          adManager.incrementDailyAdCount('diamond');
        }
        results.afterFiveCount = adManager.getDailyAdCount('diamond');
        results.afterFiveRemaining = adManager.getRemainingAdCount('diamond');
        results.afterFiveLimitReached = adManager.isAdLimitReached('diamond');

        // 제한 초과 증가 (6회째)
        adManager.incrementDailyAdCount('diamond');
        results.afterSixCount = adManager.getDailyAdCount('diamond');
        results.afterSixRemaining = adManager.getRemainingAdCount('diamond');

        return results;
      });

      expect(result.initialDiamondCount).toBe(0);
      expect(result.initialRemaining).toBe(5); // AD_LIMIT_DIAMOND = 5
      expect(result.initialLimitReached).toBe(false);
      expect(result.afterOneCount).toBe(1);
      expect(result.afterOneRemaining).toBe(4);
      expect(result.afterFiveCount).toBe(5);
      expect(result.afterFiveRemaining).toBe(0);
      expect(result.afterFiveLimitReached).toBe(true);
      expect(result.afterSixCount).toBe(6);
      expect(result.afterSixRemaining).toBe(0); // Math.max(0, ...) 으로 음수 방지

      expect(errors).toEqual([]);
    });

    test('goldBoost/clearBoost 일일 제한이 3회로 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        const results = {};

        // goldBoost 초기 상태
        results.goldBoostInitial = adManager.getRemainingAdCount('goldBoost');
        results.clearBoostInitial = adManager.getRemainingAdCount('clearBoost');

        // goldBoost 3회 소진
        for (let i = 0; i < 3; i++) adManager.incrementDailyAdCount('goldBoost');
        results.goldBoostAfter3 = adManager.isAdLimitReached('goldBoost');

        // clearBoost 3회 소진
        for (let i = 0; i < 3; i++) adManager.incrementDailyAdCount('clearBoost');
        results.clearBoostAfter3 = adManager.isAdLimitReached('clearBoost');

        return results;
      });

      expect(result.goldBoostInitial).toBe(3);
      expect(result.clearBoostInitial).toBe(3);
      expect(result.goldBoostAfter3).toBe(true);
      expect(result.clearBoostAfter3).toBe(true);

      expect(errors).toEqual([]);
    });

    test('날짜 변경 시 일일 카운터가 리셋된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');

        // 카운터 증가
        adManager.incrementDailyAdCount('diamond');
        adManager.incrementDailyAdCount('diamond');
        const countBefore = adManager.getDailyAdCount('diamond');

        // 날짜를 어제로 조작하여 리셋 테스트
        adManager._dailyLimits.date = '2020-01-01';
        const countAfterDateChange = adManager.getDailyAdCount('diamond');

        return { countBefore, countAfterDateChange };
      });

      expect(result.countBefore).toBeGreaterThan(0);
      expect(result.countAfterDateChange).toBe(0); // 날짜 다르면 리셋

      expect(errors).toEqual([]);
    });

    test('알 수 없는 adType에 대해 제한 없음으로 처리한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');

        return {
          limitReached: adManager.isAdLimitReached('unknownType'),
          remaining: adManager.getRemainingAdCount('unknownType'),
          count: adManager.getDailyAdCount('unknownType'),
        };
      });

      // 알 수 없는 타입: 제한 없음(false), 남은 횟수 0, 카운트 0
      expect(result.limitReached).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.count).toBe(0);

      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // 예외 및 엣지케이스
  // ========================================================================
  test.describe('예외 및 엣지케이스', () => {

    test('AdManager 초기화 실패 시 게임이 정상 진행된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      // adManager를 registry에서 제거 후 게임오버 시뮬레이션
      // AdManager 없이도 게임이 정상 동작하는지 검증
      const result = await page.evaluate(() => {
        const g = window.__game;
        // registry에서 adManager 제거
        g.registry.set('adManager', null);
        return g.registry.get('adManager');
      });
      expect(result).toBeNull();

      // GameScene 시작
      await page.evaluate(() => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('GameScene', { gameMode: 'endless' });
        }
      });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
      }, { timeout: 15000 });
      await page.waitForTimeout(1500);

      // 기지 HP를 0으로 설정하여 게임오버
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        if (scene && scene.sys.settings.key === 'GameScene') {
          scene.baseHP = 0;
        }
      });

      // adManager가 null이므로 기존 딜레이 방식으로 폴백하여 GameOverScene으로 전환
      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameOverScene';
      }, { timeout: 10000 });

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('GameOverScene');

      expect(errors).toEqual([]);
    });

    test('localStorage 접근 불가 시 일일 제한 로직이 에러 없이 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');

        // localStorage.setItem을 에러 던지도록 모킹
        const origSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = () => { throw new Error('QuotaExceededError'); };

        let incrementOk = false;
        try {
          adManager.incrementDailyAdCount('diamond');
          incrementOk = true;
        } catch {
          incrementOk = false;
        }

        // 복원
        localStorage.setItem = origSetItem;

        return { incrementOk };
      });

      // localStorage 저장 실패 시에도 에러 없이 진행해야 한다
      expect(result.incrementOk).toBe(true);
      expect(errors).toEqual([]);
    });

    test('localStorage의 일일 제한 데이터가 손상된 경우 기본값으로 복구한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        // localStorage에 손상된 데이터 삽입
        localStorage.setItem('ftd_ad_daily_limit', 'INVALID_JSON{{{');

        // 새 AdManager 생성하여 로드 시도
        const g = window.__game;
        const adManager = g.registry.get('adManager');

        // _loadDailyLimits를 직접 호출하여 확인
        const loaded = adManager._loadDailyLimits();

        return {
          hasDate: typeof loaded.date === 'string',
          hasCounts: typeof loaded.counts === 'object',
        };
      });

      // JSON 파싱 실패 시 기본값으로 폴백해야 한다
      expect(result.hasDate).toBe(true);
      expect(result.hasCounts).toBe(true);
      expect(errors).toEqual([]);
    });

    test('localStorage에 date만 있고 counts가 없는 불완전 데이터 처리', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        // date만 있고 counts 없는 데이터
        localStorage.setItem('ftd_ad_daily_limit', JSON.stringify({ date: '2026-03-02' }));

        const g = window.__game;
        const adManager = g.registry.get('adManager');
        const loaded = adManager._loadDailyLimits();

        return {
          hasDate: typeof loaded.date === 'string',
          hasCounts: typeof loaded.counts === 'object',
          isDefaultCounts: Object.keys(loaded.counts).length === 0,
        };
      });

      // counts가 없으면 기본값으로 대체해야 한다
      expect(result.hasDate).toBe(true);
      expect(result.hasCounts).toBe(true);

      expect(errors).toEqual([]);
    });

    test('showInterstitial() 연속 호출 시 에러 없이 처리된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');

        // 동시에 5회 호출
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(adManager.showInterstitial());
        }
        await Promise.all(promises);

        return { allResolved: true };
      });

      expect(result.allResolved).toBe(true);
      expect(errors).toEqual([]);
    });

    test('showRewarded() 연속 호출 시 에러 없이 모두 { rewarded: true } 반환', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');

        const results = [];
        for (let i = 0; i < 5; i++) {
          results.push(adManager.showRewarded('test-id'));
        }
        return await Promise.all(results);
      });

      expect(result).toHaveLength(5);
      for (const r of result) {
        expect(r.rewarded).toBe(true);
      }
      expect(errors).toEqual([]);
    });

    test('initialize() 중복 호출 시 2회째는 no-op이다', async ({ page }) => {
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() === 'log') consoleLogs.push(msg.text());
      });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const logCountBefore = consoleLogs.length;

      await page.evaluate(async () => {
        const g = window.__game;
        const adManager = g.registry.get('adManager');
        // 이미 초기화된 상태에서 다시 호출
        await adManager.initialize();
      });

      // 2회째 호출에서는 Mock 초기화 로그가 다시 출력되지 않아야 한다
      const newMockLogs = consoleLogs.slice(logCountBefore)
        .filter(l => l.includes('[AdManager] Mock'));
      expect(newMockLogs).toEqual([]);

      expect(errors).toEqual([]);
    });

    test('Capacitor 전역 객체 없이도 Mock 모드로 올바르게 판별된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        // 웹 환경에서는 window.Capacitor가 없거나,
        // 있어도 isNativePlatform()이 false를 반환해야 한다
        const hasCapacitor = typeof window.Capacitor !== 'undefined';
        const isNative = hasCapacitor &&
          typeof window.Capacitor.isNativePlatform === 'function' &&
          window.Capacitor.isNativePlatform();

        const g = window.__game;
        const adManager = g.registry.get('adManager');

        return {
          hasCapacitor,
          isNative,
          isMock: adManager.isMock,
        };
      });

      // 웹 환경에서 Capacitor 전역 객체 존재 여부와 무관하게 Mock 모드여야 한다
      expect(result.isNative).toBe(false);
      expect(result.isMock).toBe(true);

      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // config.js 상수 검증
  // ========================================================================
  test.describe('config.js 상수 정확성', () => {

    test('AdMob 관련 상수 값이 스펙과 일치한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        // ES 모듈을 동적으로 import하여 상수 확인
        // Vite dev server에서는 모듈을 직접 import할 수 있다
        try {
          const config = await import('/js/config.js');
          return {
            ADMOB_INTERSTITIAL_ID: config.ADMOB_INTERSTITIAL_ID,
            ADMOB_REWARDED_DIAMOND_ID: config.ADMOB_REWARDED_DIAMOND_ID,
            ADMOB_REWARDED_REVIVE_ID: config.ADMOB_REWARDED_REVIVE_ID,
            ADMOB_REWARDED_GOLD_BOOST_ID: config.ADMOB_REWARDED_GOLD_BOOST_ID,
            ADMOB_REWARDED_CLEAR_BOOST_ID: config.ADMOB_REWARDED_CLEAR_BOOST_ID,
            AD_LIMIT_DIAMOND: config.AD_LIMIT_DIAMOND,
            AD_LIMIT_GOLD_BOOST: config.AD_LIMIT_GOLD_BOOST,
            AD_LIMIT_CLEAR_BOOST: config.AD_LIMIT_CLEAR_BOOST,
            AD_REWARD_DIAMOND: config.AD_REWARD_DIAMOND,
            AD_REVIVE_HP_RATIO: config.AD_REVIVE_HP_RATIO,
            AD_GOLD_BOOST_MULTIPLIER: config.AD_GOLD_BOOST_MULTIPLIER,
            AD_CLEAR_BOOST_MULTIPLIER: config.AD_CLEAR_BOOST_MULTIPLIER,
            AD_DAILY_LIMIT_KEY: config.AD_DAILY_LIMIT_KEY,
          };
        } catch (e) {
          return { error: e.message };
        }
      });

      // 스펙에 명시된 값과 비교
      expect(result.ADMOB_INTERSTITIAL_ID).toBe('ca-app-pub-3940256099942544/1033173712');
      expect(result.ADMOB_REWARDED_DIAMOND_ID).toBe('ca-app-pub-3940256099942544/5224354917');
      expect(result.ADMOB_REWARDED_REVIVE_ID).toBe('ca-app-pub-3940256099942544/5224354917');
      expect(result.ADMOB_REWARDED_GOLD_BOOST_ID).toBe('ca-app-pub-3940256099942544/5224354917');
      expect(result.ADMOB_REWARDED_CLEAR_BOOST_ID).toBe('ca-app-pub-3940256099942544/5224354917');
      expect(result.AD_LIMIT_DIAMOND).toBe(5);
      expect(result.AD_LIMIT_GOLD_BOOST).toBe(3);
      expect(result.AD_LIMIT_CLEAR_BOOST).toBe(3);
      expect(result.AD_REWARD_DIAMOND).toBe(3);
      expect(result.AD_REVIVE_HP_RATIO).toBe(0.5);
      expect(result.AD_GOLD_BOOST_MULTIPLIER).toBe(2);
      expect(result.AD_CLEAR_BOOST_MULTIPLIER).toBe(2);
      expect(result.AD_DAILY_LIMIT_KEY).toBe('ftd_ad_daily_limit');

      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // UI 안정성
  // ========================================================================
  test.describe('UI 안정성', () => {

    test('게임 로드부터 GameOverScene까지 전체 흐름에서 콘솔 에러가 없다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      // GameScene 시작
      await page.evaluate(() => {
        const g = window.__game;
        const active = g.scene.getScenes(true);
        if (active.length > 0) {
          active[0].scene.start('GameScene', { gameMode: 'endless' });
        }
      });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameScene';
      }, { timeout: 15000 });
      await page.waitForTimeout(1500);

      // 게임오버
      await page.evaluate(() => {
        const g = window.__game;
        const scene = g.scene.getScenes(true)[0];
        if (scene && scene.sys.settings.key === 'GameScene') {
          scene.baseHP = 0;
        }
      });

      await page.waitForFunction(() => {
        const g = window.__game;
        const scenes = g.scene.getScenes(true);
        return scenes.length > 0 && scenes[0].sys.settings.key === 'GameOverScene';
      }, { timeout: 10000 });
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'tests/screenshots/admob-p1-full-flow.png' });
      expect(errors).toEqual([]);
    });

    test('모바일 뷰포트(375x667)에서 GameOverScene이 정상 렌더링된다', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      await navigateToScene(page, 'GameOverScene', {
        round: 3,
        kills: 10,
        gameStats: {
          towersPlaced: 2,
          towersSold: 0,
          towersUpgraded: 1,
          towersMerged: 0,
        },
        gameMode: 'endless',
      });

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('GameOverScene');

      await page.screenshot({ path: 'tests/screenshots/admob-p1-gameover-mobile.png' });
      expect(errors).toEqual([]);
    });

    test('소형 뷰포트(320x480)에서도 에러 없이 동작한다', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 480 });
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      await navigateToScene(page, 'GameOverScene', {
        round: 1,
        kills: 5,
        gameStats: {
          towersPlaced: 1,
          towersSold: 0,
          towersUpgraded: 0,
          towersMerged: 0,
        },
        gameMode: 'endless',
      });

      const sceneKey = await getActiveSceneKey(page);
      expect(sceneKey).toBe('GameOverScene');

      await page.screenshot({ path: 'tests/screenshots/admob-p1-gameover-small.png' });
      expect(errors).toEqual([]);
    });
  });

  // ========================================================================
  // 시각적 검증
  // ========================================================================
  test.describe('시각적 검증', () => {

    test('MenuScene 정상 렌더링 (AdManager 초기화 후)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'tests/screenshots/admob-p1-menu-after-init.png' });

      expect(errors).toEqual([]);
    });

    test('GameOverScene 결과 패널이 올바르게 표시된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await waitForMenuScene(page);

      await navigateToScene(page, 'GameOverScene', {
        round: 10,
        kills: 50,
        gameStats: {
          towersPlaced: 8,
          towersSold: 2,
          towersUpgraded: 5,
          towersMerged: 3,
        },
        mapData: { id: 'f1_m1', worldId: 'forest', nameKey: 'map.f1_m1.name' },
        gameMode: 'campaign',
      });

      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/screenshots/admob-p1-gameover-result-panel.png' });

      expect(errors).toEqual([]);
    });
  });
});
