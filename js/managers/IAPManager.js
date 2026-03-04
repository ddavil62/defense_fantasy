/**
 * @fileoverview IAPManager - 인앱 구매(IAP) 관리자.
 * 광고제거 등 일회성 인앱 구매를 관리한다.
 * 웹(브라우저/Playwright) 환경에서는 Mock 모드로 즉시 성공 처리하고,
 * 네이티브(Capacitor) 환경에서는 Google Play Billing 연동을 위한 인터페이스를 제공한다.
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
      // 네이티브 IAP 플러그인 초기화 (향후 Google Play Billing 연동)
      console.log('[IAPManager] 네이티브 IAP 초기화 시도');
      this._initialized = true;
      console.log('[IAPManager] IAP 초기화 완료');
    } catch (e) {
      // 초기화 실패 시 Mock 모드로 폴백
      console.warn('[IAPManager] IAP 초기화 실패, Mock 모드로 폴백:', e.message);
      this.isMock = true;
      this._initialized = true;
    }
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
      // 네이티브: Google Play Billing 호출 (향후 구현)
      // const result = await InAppPurchase.purchase(IAP_PRODUCT_REMOVE_ADS);
      console.log('[IAPManager] 네이티브: 광고제거 구매 요청 (플레이스홀더)');
      this._applyAdFree(registry);
      return { success: true };
    } catch (e) {
      console.warn('[IAPManager] 구매 실패:', e.message);
      return { success: false, error: e.message };
    }
  }

  // ── 구매 복원 ──────────────────────────────────────────────────

  /**
   * 이전 구매를 복원한다.
   * Mock 모드에서는 현재 세이브 데이터의 adFree 상태를 그대로 반환한다.
   * @param {Phaser.Data.DataManager} registry - Phaser 레지스트리
   * @returns {Promise<{adFree: boolean}>} 복원 결과
   */
  async restorePurchases(registry) {
    const saveData = registry.get('saveData');

    if (this.isMock) {
      console.log('[IAPManager] Mock: 구매 복원 (현재 상태 유지)');
      return { adFree: saveData?.adFree || false };
    }

    try {
      // 네이티브: Google Play 구매 이력 조회 (향후 구현)
      console.log('[IAPManager] 네이티브: 구매 복원 요청 (플레이스홀더)');
      return { adFree: saveData?.adFree || false };
    } catch (e) {
      console.warn('[IAPManager] 구매 복원 실패:', e.message);
      return { adFree: saveData?.adFree || false };
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
