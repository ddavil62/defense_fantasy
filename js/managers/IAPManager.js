/**
 * @fileoverview IAPManager - 인앱 구매(IAP) 관리자.
 * 광고제거 등 일회성 인앱 구매를 관리한다.
 * 웹(브라우저/Playwright) 환경에서는 Mock 모드로 즉시 성공 처리하고,
 * 네이티브(Capacitor) 환경에서는 @capgo/native-purchases 플러그인을 통해
 * Google Play Billing에 직접 연동한다.
 */

import { IAP_PRODUCT_REMOVE_ADS, SAVE_KEY } from '../config.js';

// ── IAPManager 클래스 ────────────────────────────────────────────

/**
 * 인앱 구매 생명주기 관리자.
 * 네이티브(Capacitor) 환경에서는 실제 스토어 플러그인을 호출하고,
 * 웹 환경에서는 Mock 모드로 즉시 resolve한다.
 */
export class IAPManager {
  /**
   * IAPManager 인스턴스를 생성한다.
   * Capacitor 네이티브 플랫폼 여부를 감지하여 Mock 모드를 결정한다.
   */
  constructor() {
    /** @type {boolean} Mock 모드 여부 (웹 환경이면 true) */
    this.isMock = true;

    /** @type {boolean} 초기화 완료 여부 */
    this._initialized = false;

    /** @type {boolean} 결제 지원 여부 (네이티브에서만 의미 있음) */
    this._billingSupported = false;

    /** @type {import('@capgo/native-purchases').Product|null} 캐싱된 상품 정보 */
    this._productInfo = null;

    /** @type {object|null} NativePurchases 플러그인 레퍼런스 */
    this._plugin = null;

    /** @type {object|null} PURCHASE_TYPE enum 레퍼런스 */
    this._PURCHASE_TYPE = null;

    // 플랫폼 감지: Capacitor 전역 객체가 있고 네이티브 플랫폼이면 실제 모드
    try {
      if (typeof window !== 'undefined' &&
          window.Capacitor &&
          window.Capacitor.isNativePlatform &&
          window.Capacitor.isNativePlatform()) {
        this.isMock = false;
      }
    } catch {
      // Capacitor 감지 실패 시 Mock 모드 유지
      this.isMock = true;
    }
  }

  // ── 초기화 ──────────────────────────────────────────────────────

  /**
   * IAP 플러그인을 초기화한다.
   * 네이티브 환경에서는 결제 지원 여부를 확인하고 상품 정보를 프리로드한다.
   * Mock 모드에서는 즉시 resolve한다.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;

    if (this.isMock) {
      console.log('[IAPManager] Mock 모드로 초기화 (웹 환경)');
      this._initialized = true;
      return;
    }

    try {
      // 네이티브: @capgo/native-purchases 플러그인 동적 import
      const module = await import('@capgo/native-purchases');
      this._plugin = module.NativePurchases;
      this._PURCHASE_TYPE = module.PURCHASE_TYPE;

      // 결제 지원 여부 확인
      const { isBillingSupported } = await this._plugin.isBillingSupported();
      this._billingSupported = isBillingSupported;
      console.log(`[IAPManager] 결제 지원 여부: ${isBillingSupported}`);

      if (isBillingSupported) {
        // 상품 정보 프리로드
        await this._loadProductInfo();
      }

      this._initialized = true;
      console.log('[IAPManager] IAP 초기화 완료');
    } catch (e) {
      // 초기화 실패 시 Mock 모드로 폴백
      console.warn('[IAPManager] IAP 초기화 실패, Mock 모드로 폴백:', e.message);
      this.isMock = true;
      this._initialized = true;
    }
  }

  // ── 상품 정보 로드 (내부) ──────────────────────────────────────

  /**
   * Google Play에서 상품 정보를 조회하여 캐싱한다.
   * 실패 시 _productInfo는 null로 유지되며 폴백 가격이 사용된다.
   * @returns {Promise<void>}
   * @private
   */
  async _loadProductInfo() {
    try {
      const { products } = await this._plugin.getProducts({
        productIdentifiers: [IAP_PRODUCT_REMOVE_ADS],
        productType: this._PURCHASE_TYPE.INAPP,
      });

      if (products && products.length > 0) {
        this._productInfo = products[0];
        console.log(`[IAPManager] 상품 정보 로드 완료: ${this._productInfo.priceString}`);
      } else {
        console.warn('[IAPManager] 상품을 찾을 수 없음:', IAP_PRODUCT_REMOVE_ADS);
      }
    } catch (e) {
      console.warn('[IAPManager] 상품 정보 로드 실패:', e.message);
    }
  }

  // ── 결제 지원 여부 확인 ────────────────────────────────────────

  /**
   * 현재 기기에서 결제가 지원되는지 확인한다.
   * 웹 Mock 모드에서는 항상 true를 반환한다.
   * @returns {boolean} 결제 지원 여부
   */
  isBillingSupportedSync() {
    if (this.isMock) return true;
    return this._billingSupported;
  }

  // ── 현지화 가격 조회 ──────────────────────────────────────────

  /**
   * 캐싱된 상품 정보에서 현지화된 가격 문자열을 반환한다.
   * 상품 정보가 없으면 폴백 가격("$1.99")을 반환한다.
   * @returns {string} 현지화된 가격 문자열 (예: "$1.99", "₩2,500", "¥300")
   */
  getLocalizedPrice() {
    if (this._productInfo && this._productInfo.priceString) {
      return this._productInfo.priceString;
    }
    // 폴백: i18n 가격 키 대신 하드코딩된 USD 폴백
    return '$1.99';
  }

  // ── 광고제거 상태 확인 ──────────────────────────────────────────

  /**
   * 세이브 데이터에서 광고제거 구매 상태를 확인한다.
   * @param {Phaser.Data.DataManager} registry - Phaser 레지스트리
   * @returns {boolean} 광고제거 구매 완료 여부
   */
  isAdFree(registry) {
    const saveData = registry.get('saveData');
    return saveData?.adFree === true;
  }

  // ── 광고제거 구매 실행 ──────────────────────────────────────────

  /**
   * 광고제거 인앱 구매를 실행한다.
   * Mock 모드에서는 즉시 성공을 반환한다.
   * 네이티브 환경에서는 Google Play Billing을 통해 실제 결제를 진행한다.
   * 성공 시 saveData.adFree = true를 설정하고 localStorage에 저장한다.
   * @param {Phaser.Data.DataManager} registry - Phaser 레지스트리
   * @returns {Promise<{success: boolean, error?: string}>} 구매 결과
   */
  async purchaseRemoveAds(registry) {
    if (this.isMock) {
      console.log('[IAPManager] Mock: 광고제거 구매 즉시 성공');
      this._applyAdFree(registry);
      return { success: true };
    }

    try {
      // 네이티브: Google Play Billing 구매 요청
      const transaction = await this._plugin.purchaseProduct({
        productIdentifier: IAP_PRODUCT_REMOVE_ADS,
        productType: this._PURCHASE_TYPE.INAPP,
        quantity: 1,
      });

      console.log('[IAPManager] 구매 성공, transactionId:', transaction.transactionId);
      this._applyAdFree(registry);
      return { success: true };
    } catch (e) {
      // 사용자 취소 여부 판별: 에러 메시지에 "cancel" 또는 "cancelled" 포함 시
      const errMsg = (e.message || '').toLowerCase();
      if (errMsg.includes('cancel') || errMsg.includes('user')) {
        console.log('[IAPManager] 사용자가 구매를 취소함');
        return { success: false, error: 'cancelled' };
      }

      // 이미 구매된 상품인 경우: 에러 메시지에 "already" 또는 "owned" 포함
      if (errMsg.includes('already') || errMsg.includes('owned')) {
        console.log('[IAPManager] 이미 구매된 상품, adFree 자동 적용');
        this._applyAdFree(registry);
        return { success: true };
      }

      console.warn('[IAPManager] 구매 실패:', e.message);
      return { success: false, error: e.message };
    }
  }

  // ── 구매 복원 ──────────────────────────────────────────────────

  /**
   * 이전 구매를 복원한다.
   * Mock 모드에서는 현재 세이브 데이터의 adFree 상태를 그대로 반환한다.
   * 네이티브 환경에서는 Google Play 구매 이력을 조회하여 remove_ads 존재 여부를 확인한다.
   * @param {Phaser.Data.DataManager} registry - Phaser 레지스트리
   * @returns {Promise<{adFree: boolean, error?: string}>} 복원 결과
   */
  async restorePurchases(registry) {
    const saveData = registry.get('saveData');

    if (this.isMock) {
      console.log('[IAPManager] Mock: 구매 복원 (현재 상태 유지)');
      return { adFree: saveData?.adFree || false };
    }

    try {
      // getPurchases()로 구매 이력 조회
      const { purchases } = await this._plugin.getPurchases({
        productType: this._PURCHASE_TYPE.INAPP,
      });

      // remove_ads 상품이 구매 이력에 존재하는지 확인
      const hasRemoveAds = purchases.some(
        (p) => p.productIdentifier === IAP_PRODUCT_REMOVE_ADS
      );

      if (hasRemoveAds) {
        console.log('[IAPManager] 구매 복원 성공: remove_ads 확인됨');
        this._applyAdFree(registry);
        return { adFree: true };
      }

      console.log('[IAPManager] 구매 복원: remove_ads 구매 이력 없음');
      return { adFree: false };
    } catch (e) {
      console.warn('[IAPManager] 구매 복원 실패:', e.message);
      return { adFree: saveData?.adFree || false, error: e.message };
    }
  }

  // ── 내부 헬퍼 ──────────────────────────────────────────────────

  /**
   * 광고제거 상태를 세이브 데이터에 적용하고 localStorage에 저장한다.
   * AdManager의 adFree 플래그도 함께 동기화한다.
   * @param {Phaser.Data.DataManager} registry - Phaser 레지스트리
   * @private
   */
  _applyAdFree(registry) {
    const saveData = registry.get('saveData');
    if (saveData) {
      saveData.adFree = true;
      registry.set('saveData', saveData);
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      } catch {
        // localStorage 저장 실패 시 무시
      }
    }

    // AdManager adFree 상태 동기화
    const adManager = registry.get('adManager');
    if (adManager && typeof adManager.setAdFree === 'function') {
      adManager.setAdFree(true);
    }
  }
}
