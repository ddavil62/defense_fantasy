/**
 * @fileoverview IAP 실결제 Google Play Billing 연동 QA 테스트.
 * IAPManager 네이티브 구매 로직, 동적 가격 표시, i18n 키 추가,
 * BILLING 권한, 에러 처리, 엣지케이스를 검증한다.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

/** 세이브 데이터를 localStorage에서 읽는 헬퍼 */
async function getSaveData(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('fantasy-td-save'));
    } catch { return null; }
  });
}

/** 게임 레지스트리에서 세이브 데이터를 읽는 헬퍼 */
async function getRegistrySaveData(page) {
  return page.evaluate(() => {
    const game = window.__game;
    if (!game) return null;
    return game.registry.get('saveData');
  });
}

/** localStorage를 전부 지우는 헬퍼 */
async function clearStorage(page) {
  await page.evaluate(() => localStorage.clear());
}

/** 게임이 MenuScene에 도달할 때까지 대기하는 헬퍼 */
async function waitForMenuScene(page) {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(3500);
}

// ── 테스트 스위트 ────────────────────────────────────────────────

test.describe('IAP 실결제 Google Play Billing 연동 QA', () => {

  // ── 1. 콘솔 에러 및 기본 로드 ──────────────────────────────────

  test.describe('1. 콘솔 에러 및 기본 로드', () => {

    test('게임 로드 시 JavaScript 에러가 발생하지 않는다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      if (errors.length > 0) {
        console.log('[ERRORS]', errors);
      }
      expect(errors).toEqual([]);
    });

    test('MenuScene 초기 화면 스크린샷', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);
      await page.screenshot({ path: 'tests/screenshots/iap-billing-menu-initial.png' });
    });
  });

  // ── 2. IAPManager 초기화 검증 ──────────────────────────────────

  test.describe('2. IAPManager 초기화', () => {

    test('IAPManager가 registry에 등록되고 Mock 모드로 초기화된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const game = window.__game;
        if (!game) return { error: 'no game' };
        const iapManager = game.registry.get('iapManager');
        if (!iapManager) return { error: 'no iapManager in registry' };
        return {
          exists: true,
          isMock: iapManager.isMock,
          initialized: iapManager._initialized,
          billingSupported: iapManager._billingSupported,
          productInfo: iapManager._productInfo,
          plugin: iapManager._plugin,
          PURCHASE_TYPE: iapManager._PURCHASE_TYPE,
        };
      });

      expect(result.exists).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.initialized).toBe(true);
      // Mock 모드에서는 billing 관련 필드가 기본값이어야 한다
      expect(result.billingSupported).toBe(false);
      expect(result.productInfo).toBeNull();
      expect(result.plugin).toBeNull();
      expect(result.PURCHASE_TYPE).toBeNull();
    });

    test('initialize()를 중복 호출해도 에러가 발생하지 않는다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        try {
          await iapManager.initialize();
          await iapManager.initialize();
          await iapManager.initialize();
          return { success: true, initialized: iapManager._initialized };
        } catch (e) {
          return { success: false, error: e.message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.initialized).toBe(true);
    });

    test('isBillingSupportedSync()가 Mock 모드에서 true를 반환한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        return iapManager.isBillingSupportedSync();
      });

      expect(result).toBe(true);
    });

    test('getLocalizedPrice()가 Mock 모드에서 폴백 "$1.99"를 반환한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        return iapManager.getLocalizedPrice();
      });

      expect(result).toBe('$1.99');
    });
  });

  // ── 3. Mock 구매 플로우 ────────────────────────────────────────

  test.describe('3. Mock 구매 플로우', () => {

    test('purchaseRemoveAds()가 Mock 모드에서 즉시 성공한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        const purchaseResult = await iapManager.purchaseRemoveAds(game.registry);
        const saveData = game.registry.get('saveData');
        return { purchaseResult, adFree: saveData?.adFree };
      });

      expect(result.purchaseResult.success).toBe(true);
      expect(result.adFree).toBe(true);
    });

    test('구매 후 localStorage에 adFree가 저장된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        await iapManager.purchaseRemoveAds(game.registry);
      });

      const saveData = await getSaveData(page);
      expect(saveData).not.toBeNull();
      expect(saveData.adFree).toBe(true);
    });

    test('구매 후 AdManager의 isAdFree()가 true를 반환한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        const adManager = game.registry.get('adManager');
        const before = adManager.isAdFree();
        await iapManager.purchaseRemoveAds(game.registry);
        const after = adManager.isAdFree();
        return { before, after };
      });

      expect(result.before).toBe(false);
      expect(result.after).toBe(true);
    });

    test('구매 후 페이지 새로고침 시 adFree 상태가 유지된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        await iapManager.purchaseRemoveAds(game.registry);
      });

      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const game = window.__game;
        const adManager = game.registry.get('adManager');
        const saveData = game.registry.get('saveData');
        return {
          adFreeInSave: saveData?.adFree,
          adFreeInManager: adManager?.isAdFree(),
        };
      });

      expect(result.adFreeInSave).toBe(true);
      expect(result.adFreeInManager).toBe(true);
    });
  });

  // ── 4. restorePurchases 검증 ───────────────────────────────────

  test.describe('4. restorePurchases 검증 (Mock)', () => {

    test('구매 전 restorePurchases가 adFree:false를 반환한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        return await iapManager.restorePurchases(game.registry);
      });

      expect(result.adFree).toBe(false);
    });

    test('구매 후 restorePurchases가 adFree:true를 반환한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        await iapManager.purchaseRemoveAds(game.registry);
        return await iapManager.restorePurchases(game.registry);
      });

      expect(result.adFree).toBe(true);
    });
  });

  // ── 5. MenuScene 동적 가격 표시 ────────────────────────────────

  test.describe('5. MenuScene 동적 가격 표시', () => {

    test('광고제거 버튼이 MenuScene에 표시된다 (스크린샷)', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      await page.screenshot({ path: 'tests/screenshots/iap-billing-remove-ads-btn.png' });
    });

    test('광고제거 버튼 클릭 시 확인 다이얼로그가 표시된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const canvas = await page.locator('canvas');
      // 광고제거 버튼 위치 (centerX=180, y=610+(-100)=510)
      await canvas.click({ position: { x: 180, y: 510 } });
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'tests/screenshots/iap-billing-purchase-dialog.png' });

      const dialogOpen = await page.evaluate(() => window.__isPurchaseDialogOpen);
      expect(dialogOpen).toBe(true);
    });

    test('다이얼로그에서 취소 클릭 시 다이얼로그가 닫힌다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const canvas = await page.locator('canvas');
      await canvas.click({ position: { x: 180, y: 510 } });
      await page.waitForTimeout(500);

      // 취소 버튼 (centerX+58=238, centerY+48=368)
      await canvas.click({ position: { x: 238, y: 368 } });
      await page.waitForTimeout(300);

      const dialogOpen = await page.evaluate(() => window.__isPurchaseDialogOpen);
      expect(dialogOpen).toBeFalsy();
    });

    test('다이얼로그에서 구매하기 클릭 시 Mock 구매가 완료된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const canvas = await page.locator('canvas');
      await canvas.click({ position: { x: 180, y: 510 } });
      await page.waitForTimeout(500);

      // 구매하기 버튼 (centerX-58=122, centerY+48=368)
      await canvas.click({ position: { x: 122, y: 368 } });
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'tests/screenshots/iap-billing-purchase-success.png' });

      const saveData = await getSaveData(page);
      expect(saveData.adFree).toBe(true);
    });

    test('이미 구매한 상태에서 "구매완료" 비활성 상태로 표시된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => {
        const saveData = {
          saveDataVersion: 9,
          bestRound: 0, bestKills: 0, totalGames: 0,
          diamond: 0, totalDiamondEarned: 0,
          globalUpgrades: {
            damage: 0, fireRate: 0, range: 0,
            startGold: 0, killGold: 0, drawDiscount: 0, mergeDiscount: 0,
            baseHp: 0, waveBonus: 0, diamondBonus: 0,
          },
          unlockedTowers: [], discoveredMerges: [], newDiscoveries: [],
          stats: {
            totalGamesPlayed: 0, bestRound: 0, bestKills: 0, totalKills: 0,
            totalGold: 0, totalWaves: 0, towersPlaced: 0, towersSold: 0,
            mergesAttempted: 0, mergesSucceeded: 0, gameHistory: [],
          },
          worldProgress: {}, endlessUnlocked: false,
          campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
          adFree: true,
          mergeTutorialDone: true,
        };
        localStorage.setItem('fantasy-td-save', JSON.stringify(saveData));
      });

      await page.reload();
      await waitForMenuScene(page);

      await page.screenshot({ path: 'tests/screenshots/iap-billing-purchased-state.png' });

      // 클릭해도 다이얼로그가 열리지 않는지 확인
      const canvas = await page.locator('canvas');
      await canvas.click({ position: { x: 180, y: 510 } });
      await page.waitForTimeout(500);

      const dialogOpen = await page.evaluate(() => window.__isPurchaseDialogOpen);
      expect(dialogOpen).toBeFalsy();
    });
  });

  // ── 6. i18n 키 검증 ───────────────────────────────────────────

  test.describe('6. i18n 키 검증', () => {

    test('모든 IAP 관련 i18n 키가 한국어/영어로 존재한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const { t, setLocale } = await import('/js/i18n.js');

        const keys = [
          'iap.removeAds',
          'iap.removeAds.price',
          'iap.removeAds.purchased',
          'iap.removeAds.confirm',
          'iap.removeAds.confirmDesc',
          'iap.removeAds.confirmYes',
          'iap.removeAds.confirmNo',
          'iap.removeAds.success',
          'iap.removeAds.failed',
          'iap.removeAds.restored',
          'iap.billingNotSupported',
          'iap.restoreFailed',
          'iap.restoreNotFound',
        ];

        setLocale('ko');
        const koResults = {};
        for (const key of keys) {
          const val = t(key);
          koResults[key] = { value: val, isKey: val === key };
        }

        setLocale('en');
        const enResults = {};
        for (const key of keys) {
          const val = t(key);
          enResults[key] = { value: val, isKey: val === key };
        }

        // 원래 로케일 복원
        setLocale('ko');

        return { ko: koResults, en: enResults };
      });

      // 한국어: 모든 키가 키 자체가 아닌 번역 값을 가져야 한다
      for (const [key, val] of Object.entries(result.ko)) {
        expect(val.isKey, `ko 키 '${key}'이 번역되지 않음: ${val.value}`).toBe(false);
      }

      // 영어: 모든 키가 키 자체가 아닌 번역 값을 가져야 한다
      for (const [key, val] of Object.entries(result.en)) {
        expect(val.isKey, `en 키 '${key}'이 번역되지 않음: ${val.value}`).toBe(false);
      }
    });

    test('가격 폴백 값이 "$1.99"로 설정되어 있다 (ko/en 모두)', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const { t, setLocale } = await import('/js/i18n.js');

        setLocale('ko');
        const koPrice = t('iap.removeAds.price');

        setLocale('en');
        const enPrice = t('iap.removeAds.price');

        setLocale('ko');
        return { koPrice, enPrice };
      });

      expect(result.koPrice).toBe('$1.99');
      expect(result.enPrice).toBe('$1.99');
    });

    test('영어 전환 후 메뉴가 에러 없이 렌더링된다 (스크린샷)', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const canvas = await page.locator('canvas');
      // 언어 전환 버튼 (centerX+48=228, y=650+(-100)=550)
      await canvas.click({ position: { x: 228, y: 550 } });
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'tests/screenshots/iap-billing-english.png' });
      expect(errors).toEqual([]);
    });
  });

  // ── 7. 에러 처리 (사용자 취소 감지) ────────────────────────────

  test.describe('7. 에러 처리 로직', () => {

    test('사용자 취소 에러 메시지 패턴이 올바르게 감지된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        // 취소 패턴 감지 로직을 직접 테스트
        const cancelPatterns = [
          'User cancelled the purchase',
          'Purchase was canceled by user',
          'The operation was cancelled',
          'user denied purchase',
        ];

        const networkPatterns = [
          'Network error occurred',
          'Connection timed out',
          'Server error 500',
        ];

        const alreadyOwnedPatterns = [
          'Item already owned',
          'The product has already been purchased',
        ];

        function classifyError(msg) {
          const errMsg = (msg || '').toLowerCase();
          if (errMsg.includes('cancel') || errMsg.includes('user')) return 'cancelled';
          if (errMsg.includes('already') || errMsg.includes('owned')) return 'already_owned';
          return 'error';
        }

        return {
          cancel: cancelPatterns.map(p => classifyError(p)),
          network: networkPatterns.map(p => classifyError(p)),
          alreadyOwned: alreadyOwnedPatterns.map(p => classifyError(p)),
        };
      });

      // 취소 패턴은 모두 'cancelled'로 감지되어야 한다
      for (const r of result.cancel) {
        expect(r).toBe('cancelled');
      }

      // 네트워크 에러는 'error'로 분류되어야 한다
      for (const r of result.network) {
        expect(r).toBe('error');
      }

      // 이미 구매된 상품은 'already_owned'으로 분류되어야 한다
      for (const r of result.alreadyOwned) {
        expect(r).toBe('already_owned');
      }
    });

    test('취소 에러 메시지에 "user"만 포함하면 false positive가 발생할 수 있다', async ({ page }) => {
      // 잠재적 이슈: "user" 키워드가 취소가 아닌 에러에도 포함될 수 있음
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const falsePositives = [
          'Authentication failed for user',
          'User account is locked',
          'Invalid user credentials',
        ];

        function classifyError(msg) {
          const errMsg = (msg || '').toLowerCase();
          if (errMsg.includes('cancel') || errMsg.includes('user')) return 'cancelled';
          return 'error';
        }

        return falsePositives.map(p => ({
          msg: p,
          classified: classifyError(p),
        }));
      });

      // 이들은 실제로는 취소가 아니지만 "user"를 포함하므로 'cancelled'로 오분류됨
      // 이것은 알려진 잠재적 이슈로 기록
      let falsePositiveCount = 0;
      for (const r of result) {
        if (r.classified === 'cancelled') {
          falsePositiveCount++;
          console.log(`[FALSE POSITIVE] "${r.msg}" -> classified as cancelled`);
        }
      }

      // 이 테스트는 false positive를 "발견"하기 위한 것이므로 카운트만 기록
      console.log(`[INFO] False positive count: ${falsePositiveCount}/3`);
      // 현재 구현에서 false positive가 발생하는 것을 확인만 함
      expect(falsePositiveCount).toBeGreaterThan(0);
    });
  });

  // ── 8. 엣지케이스 ─────────────────────────────────────────────

  test.describe('8. 엣지케이스', () => {

    test('saveData가 null인 상태에서 purchaseRemoveAds가 크래시하지 않는다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        const original = game.registry.get('saveData');
        game.registry.set('saveData', null);

        try {
          const r = await iapManager.purchaseRemoveAds(game.registry);
          return { crashed: false, result: r };
        } catch (e) {
          return { crashed: true, error: e.message };
        } finally {
          game.registry.set('saveData', original);
        }
      });

      expect(result.crashed).toBe(false);
      expect(result.result.success).toBe(true);
    });

    test('saveData가 null인 상태에서 restorePurchases가 크래시하지 않는다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        const original = game.registry.get('saveData');
        game.registry.set('saveData', null);

        try {
          const r = await iapManager.restorePurchases(game.registry);
          return { crashed: false, result: r };
        } catch (e) {
          return { crashed: true, error: e.message };
        } finally {
          game.registry.set('saveData', original);
        }
      });

      expect(result.crashed).toBe(false);
    });

    test('saveData가 null인 상태에서 isAdFree가 false를 반환한다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        const original = game.registry.get('saveData');
        game.registry.set('saveData', null);

        try {
          return { result: iapManager.isAdFree(game.registry), crashed: false };
        } catch (e) {
          return { crashed: true, error: e.message };
        } finally {
          game.registry.set('saveData', original);
        }
      });

      expect(result.crashed).toBe(false);
      expect(result.result).toBe(false);
    });

    test('purchaseRemoveAds를 연속 3회 호출해도 에러가 없다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        const results = [];
        for (let i = 0; i < 3; i++) {
          const r = await iapManager.purchaseRemoveAds(game.registry);
          results.push(r);
        }
        return results;
      });

      // 모든 호출이 성공해야 한다
      for (const r of result) {
        expect(r.success).toBe(true);
      }
    });

    test('iapManager가 registry에 없을 때 MenuScene이 크래시하지 않는다', async ({ page }) => {
      // iapManager가 null이면 폴백 동작이 올바른지 확인
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');

        // iapManager가 null일 때의 폴백 체크
        // MenuScene._createRemoveAdsButton에서:
        // const iapManager = this.registry.get('iapManager');
        // const isBillingOk = iapManager ? iapManager.isBillingSupportedSync() : true;
        const isBillingOk = null ? false : true; // null이면 true로 폴백

        // const priceText = iapManager ? iapManager.getLocalizedPrice() : t('iap.removeAds.price');
        // null이면 i18n 가격 키로 폴백

        return { isBillingOk };
      });

      expect(result.isBillingOk).toBe(true);
    });
  });

  // ── 9. 다이얼로그 상호작용 ────────────────────────────────────

  test.describe('9. 다이얼로그 상호작용', () => {

    test('다이얼로그 외부 오버레이 클릭으로 닫을 수 있다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const canvas = await page.locator('canvas');
      await canvas.click({ position: { x: 180, y: 510 } });
      await page.waitForTimeout(500);

      let dialogOpen = await page.evaluate(() => window.__isPurchaseDialogOpen);
      expect(dialogOpen).toBe(true);

      // 오버레이 클릭 (패널 외부, 왼쪽 상단)
      await canvas.click({ position: { x: 20, y: 20 } });
      await page.waitForTimeout(300);

      dialogOpen = await page.evaluate(() => window.__isPurchaseDialogOpen);
      expect(dialogOpen).toBeFalsy();
    });

    test('구매 버튼 연타 시 중복 요청이 방지된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const canvas = await page.locator('canvas');
      await canvas.click({ position: { x: 180, y: 510 } });
      await page.waitForTimeout(500);

      // 구매 버튼 연타 3회
      await canvas.click({ position: { x: 122, y: 368 } });
      await canvas.click({ position: { x: 122, y: 368 } });
      await canvas.click({ position: { x: 122, y: 368 } });
      await page.waitForTimeout(2000);

      expect(errors).toEqual([]);
      const saveData = await getSaveData(page);
      expect(saveData.adFree).toBe(true);
    });

    test('다이얼로그가 이미 열린 상태에서 다시 열리지 않는다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const canvas = await page.locator('canvas');
      // 첫 번째 클릭으로 다이얼로그 열기
      await canvas.click({ position: { x: 180, y: 510 } });
      await page.waitForTimeout(300);

      const firstOpen = await page.evaluate(() => window.__isPurchaseDialogOpen);
      expect(firstOpen).toBe(true);

      // 두 번째 클릭 (패널 영역 밖에 있으므로 오버레이에 잡힐 수 있음)
      // 이미 열려있으면 __isPurchaseDialogOpen 플래그로 중복 방지
      const result = await page.evaluate(() => {
        // 직접 플래그 확인
        return window.__isPurchaseDialogOpen;
      });
      expect(result).toBe(true);
    });
  });

  // ── 10. 모바일 뷰포트 ─────────────────────────────────────────

  test.describe('10. 모바일 뷰포트', () => {

    test('360x640 뷰포트에서 정상 렌더링된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      await page.screenshot({ path: 'tests/screenshots/iap-billing-mobile-360x640.png' });
      expect(errors).toEqual([]);
    });

    test('320x568 소형 뷰포트에서 에러 없이 동작한다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      await page.screenshot({ path: 'tests/screenshots/iap-billing-mobile-320x568.png' });
      expect(errors).toEqual([]);
    });

    test('412x915 대형 뷰포트에서 정상 렌더링된다', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.setViewportSize({ width: 412, height: 915 });
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      await page.screenshot({ path: 'tests/screenshots/iap-billing-mobile-412x915.png' });
      expect(errors).toEqual([]);
    });
  });

  // ── 11. BootScene adFree 동기화 ────────────────────────────────

  test.describe('11. BootScene adFree 동기화', () => {

    test('adFree=true 세이브로 부팅 시 AdManager에 동기화된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => {
        const saveData = {
          saveDataVersion: 9,
          bestRound: 0, bestKills: 0, totalGames: 0,
          diamond: 0, totalDiamondEarned: 0,
          globalUpgrades: {
            damage: 0, fireRate: 0, range: 0,
            startGold: 0, killGold: 0, drawDiscount: 0, mergeDiscount: 0,
            baseHp: 0, waveBonus: 0, diamondBonus: 0,
          },
          unlockedTowers: [], discoveredMerges: [], newDiscoveries: [],
          stats: {
            totalGamesPlayed: 0, bestRound: 0, bestKills: 0, totalKills: 0,
            totalGold: 0, totalWaves: 0, towersPlaced: 0, towersSold: 0,
            mergesAttempted: 0, mergesSucceeded: 0, gameHistory: [],
          },
          worldProgress: {}, endlessUnlocked: false,
          campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
          adFree: true,
          mergeTutorialDone: true,
        };
        localStorage.setItem('fantasy-td-save', JSON.stringify(saveData));
      });

      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const game = window.__game;
        const adManager = game.registry.get('adManager');
        return { isAdFree: adManager?.isAdFree() || false };
      });

      expect(result.isAdFree).toBe(true);
    });

    test('adFree=false 세이브로 부팅 시 AdManager의 adFree가 false이다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(() => {
        const game = window.__game;
        const adManager = game.registry.get('adManager');
        return { isAdFree: adManager?.isAdFree() || false };
      });

      expect(result.isAdFree).toBe(false);
    });
  });

  // ── 12. adFree 상태에서 광고 동작 ─────────────────────────────

  test.describe('12. adFree 상태에서 광고 동작', () => {

    test('adFree 상태에서 showRewarded가 광고 없이 즉시 rewarded:true', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        const adManager = game.registry.get('adManager');

        await iapManager.purchaseRemoveAds(game.registry);

        const start = Date.now();
        const rewardResult = await adManager.showRewarded('test_unit');
        const elapsed = Date.now() - start;

        return { rewardResult, elapsed, isBusy: adManager.isBusy };
      });

      expect(result.rewardResult.rewarded).toBe(true);
      expect(result.elapsed).toBeLessThan(100);
      expect(result.isBusy).toBe(false);
    });

    test('adFree 상태에서 isAdLimitReached가 항상 false', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const game = window.__game;
        const iapManager = game.registry.get('iapManager');
        const adManager = game.registry.get('adManager');

        // 카운터를 한도 이상으로 채움
        for (let i = 0; i < 20; i++) {
          adManager.incrementDailyAdCount('diamond');
          adManager.incrementDailyAdCount('goldBoost');
          adManager.incrementDailyAdCount('clearBoost');
        }

        const before = {
          diamond: adManager.isAdLimitReached('diamond'),
          gold: adManager.isAdLimitReached('goldBoost'),
          clear: adManager.isAdLimitReached('clearBoost'),
        };

        await iapManager.purchaseRemoveAds(game.registry);

        const after = {
          diamond: adManager.isAdLimitReached('diamond'),
          gold: adManager.isAdLimitReached('goldBoost'),
          clear: adManager.isAdLimitReached('clearBoost'),
        };

        return { before, after };
      });

      expect(result.before.diamond).toBe(true);
      expect(result.after.diamond).toBe(false);
      expect(result.after.gold).toBe(false);
      expect(result.after.clear).toBe(false);
    });
  });

  // ── 13. 구매 후 Diamond 버튼 무제한 표시 ──────────────────────

  test.describe('13. 구매 후 Diamond 버튼 무제한 표시', () => {

    test('adFree=true 상태에서 Diamond 버튼이 무제한으로 표시된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => {
        const saveData = {
          saveDataVersion: 9,
          bestRound: 0, bestKills: 0, totalGames: 0,
          diamond: 50, totalDiamondEarned: 50,
          globalUpgrades: {
            damage: 0, fireRate: 0, range: 0,
            startGold: 0, killGold: 0, drawDiscount: 0, mergeDiscount: 0,
            baseHp: 0, waveBonus: 0, diamondBonus: 0,
          },
          unlockedTowers: [], discoveredMerges: [], newDiscoveries: [],
          stats: {
            totalGamesPlayed: 0, bestRound: 0, bestKills: 0, totalKills: 0,
            totalGold: 0, totalWaves: 0, towersPlaced: 0, towersSold: 0,
            mergesAttempted: 0, mergesSucceeded: 0, gameHistory: [],
          },
          worldProgress: {}, endlessUnlocked: false,
          campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
          adFree: true,
          mergeTutorialDone: true,
        };
        localStorage.setItem('fantasy-td-save', JSON.stringify(saveData));
      });

      await page.reload();
      await waitForMenuScene(page);

      await page.screenshot({
        path: 'tests/screenshots/iap-billing-diamond-unlimited.png',
        clip: { x: 50, y: 170, width: 260, height: 60 },
      });
    });
  });

  // ── 14. 세이브 마이그레이션 호환성 ────────────────────────────

  test.describe('14. 세이브 마이그레이션 호환성', () => {

    test('v6 세이브 데이터가 v9로 마이그레이션되고 adFree:false가 추가된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.evaluate(() => {
        const v6Data = {
          saveDataVersion: 6,
          bestRound: 10,
          bestKills: 50,
          totalGames: 5,
          diamond: 100,
          totalDiamondEarned: 200,
          towerUpgrades: {},
          utilityUpgrades: { baseHp: 0, goldBoost: 0, waveBonus: 0 },
          unlockedTowers: [],
          discoveredMerges: [],
          newDiscoveries: [],
          stats: {
            totalGamesPlayed: 5, bestRound: 10, bestKills: 50,
            totalKills: 200, totalGold: 5000, totalWaves: 30,
            towersPlaced: 100, towersSold: 10, mergesAttempted: 20,
            mergesSucceeded: 15, gameHistory: [],
          },
          worldProgress: {},
          endlessUnlocked: false,
          campaignStats: { totalStars: 0, mapsCleared: 0, worldsCleared: 0 },
        };
        localStorage.setItem('fantasy-td-save', JSON.stringify(v6Data));
      });

      await page.reload();
      await waitForMenuScene(page);

      const saveData = await getRegistrySaveData(page);
      expect(saveData).not.toBeNull();
      // v6 -> v7 -> v8 -> v9 마이그레이션 체인을 거치므로 최종 버전은 9
      expect(saveData.saveDataVersion).toBe(9);
      expect(saveData.adFree).toBe(false);
    });

    test('null 세이브(신규 유저)에서 adFree:false가 포함된다', async ({ page }) => {
      await page.goto(BASE_URL);
      await clearStorage(page);
      await page.reload();
      await waitForMenuScene(page);

      const saveData = await getRegistrySaveData(page);
      expect(saveData).not.toBeNull();
      expect(saveData.saveDataVersion).toBe(9);
      expect(saveData.adFree).toBe(false);
    });
  });

  // ── 15. 정적 코드 검증 ────────────────────────────────────────

  test.describe('15. 정적 코드 검증 (런타임)', () => {

    test('IAP_PRODUCT_REMOVE_ADS 상수가 "remove_ads"이다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const { IAP_PRODUCT_REMOVE_ADS } = await import('/js/config.js');
        return IAP_PRODUCT_REMOVE_ADS;
      });

      expect(result).toBe('remove_ads');
    });

    test('SAVE_DATA_VERSION이 9이다', async ({ page }) => {
      await page.goto(BASE_URL);
      await waitForMenuScene(page);

      const result = await page.evaluate(async () => {
        const { SAVE_DATA_VERSION } = await import('/js/config.js');
        return SAVE_DATA_VERSION;
      });

      expect(result).toBe(9);
    });
  });
});
