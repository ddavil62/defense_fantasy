/**
 * @fileoverview AdManager - Google AdMob 광고 관리자.
 * @capacitor-community/admob 플러그인을 래핑하여 전면 광고/보상형 광고를 관리한다.
 * 웹(브라우저/Playwright) 환경에서는 Mock 모드로 동작하여 오류 없이 실행된다.
 * 일일 광고 시청 제한 카운터를 localStorage에 별도 키로 관리한다.
 */

import {
  ADMOB_INTERSTITIAL_ID,
  AD_DAILY_LIMIT_KEY,
  AD_LIMIT_DIAMOND,
  AD_LIMIT_GOLD_BOOST,
  AD_LIMIT_CLEAR_BOOST,
} from '../config.js';

// ── 일일 제한 매핑 ──────────────────────────────────────────────
/**
 * 광고 유형별 일일 제한 횟수 매핑.
 * @const {Object<string, number>}
 */
const AD_LIMITS = {
  diamond: AD_LIMIT_DIAMOND,
  goldBoost: AD_LIMIT_GOLD_BOOST,
  clearBoost: AD_LIMIT_CLEAR_BOOST,
};

// ── AdManager 클래스 ────────────────────────────────────────────

/**
 * AdMob 광고 생명주기 관리자.
 * 네이티브(Capacitor) 환경에서는 실제 AdMob 플러그인을 호출하고,
 * 웹 환경에서는 Mock 모드로 즉시 resolve한다.
 */
export class AdManager {
  /**
   * AdManager 인스턴스를 생성한다.
   * Capacitor 네이티브 플랫폼 여부를 감지하여 Mock 모드를 결정한다.
   */
  constructor() {
    /** @type {boolean} Mock 모드 여부 (웹 환경이면 true) */
    this.isMock = true;

    /** @type {object|null} AdMob 플러그인 참조 */
    this._admob = null;

    /** @type {boolean} 광고 표시 진행 중 여부 (씬 네비게이션 차단용) */
    this.isBusy = false;

    /** @type {boolean} 초기화 완료 여부 */
    this._initialized = false;

    /** @type {object} 일일 광고 카운터 데이터 */
    this._dailyLimits = this._loadDailyLimits();

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
   * AdMob 플러그인을 초기화한다.
   * Mock 모드에서는 즉시 resolve한다.
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;

    if (this.isMock) {
      console.log('[AdManager] Mock 모드로 초기화 (웹 환경)');
      this._initialized = true;
      return;
    }

    try {
      // 동적 import로 @capacitor-community/admob 플러그인 로드
      const { AdMob } = await import('@capacitor-community/admob');
      this._admob = AdMob;

      await this._admob.initialize({
        // GDPR/UMP는 이번 페이즈에서 미구현
        initializeForTesting: true,
      });

      this._initialized = true;
      console.log('[AdManager] AdMob 초기화 완료');
    } catch (e) {
      // 초기화 실패 시 Mock 모드로 폴백
      console.warn('[AdManager] AdMob 초기화 실패, Mock 모드로 폴백:', e.message);
      this.isMock = true;
      this._initialized = true;
    }
  }

  // ── 전면 광고 ──────────────────────────────────────────────────

  /**
   * 전면 광고를 준비하고 표시한다.
   * Mock 모드에서는 즉시 resolve한다.
   * 실패 시에도 reject하지 않고 정상 resolve한다.
   * @returns {Promise<void>}
   */
  async showInterstitial() {
    // 광고 표시 시작: 씬 전환 버튼 차단
    this.isBusy = true;
    if (this.isMock) {
      console.log('[AdManager] Mock: 전면 광고 스킵');
      this.isBusy = false;
      return;
    }

    try {
      await this._admob.prepareInterstitial({
        adId: ADMOB_INTERSTITIAL_ID,
      });
      await this._admob.showInterstitial();
      console.log('[AdManager] 전면 광고 표시 완료');
    } catch (e) {
      // 전면 광고 실패 시 무시하고 진행
      console.warn('[AdManager] 전면 광고 표시 실패:', e.message);
    } finally {
      // 성공/실패 무관하게 플래그 복원
      this.isBusy = false;
    }
  }

  // ── 보상형 광고 ────────────────────────────────────────────────

  /**
   * 보상형 광고를 준비하고 표시한다.
   * Mock 모드에서는 즉시 `{ rewarded: true }` resolve한다.
   * 실패 시 reject하지 않고 `{ rewarded: false, error }` resolve한다.
   * @param {string} adUnitId - 보상형 광고 단위 ID
   * @returns {Promise<{rewarded: boolean, error?: string}>} 보상 결과
   */
  async showRewarded(adUnitId) {
    // 광고 표시 시작: 씬 전환 버튼 차단
    this.isBusy = true;
    if (this.isMock) {
      console.log('[AdManager] Mock: 보상형 광고 스킵 (rewarded: true)');
      this.isBusy = false;
      return { rewarded: true };
    }

    try {
      await this._admob.prepareRewardVideoAd({
        adId: adUnitId,
      });
      const result = await this._admob.showRewardVideoAd();
      console.log('[AdManager] 보상형 광고 표시 완료:', result);
      return { rewarded: true };
    } catch (e) {
      console.warn('[AdManager] 보상형 광고 표시 실패:', e.message);
      return { rewarded: false, error: e.message };
    } finally {
      // 성공/실패 무관하게 플래그 복원
      this.isBusy = false;
    }
  }

  // ── 일일 제한 관리 ────────────────────────────────────────────

  /**
   * 오늘 해당 광고 유형의 사용 횟수를 반환한다.
   * @param {string} adType - 광고 유형 ('diamond' | 'goldBoost' | 'clearBoost')
   * @returns {number} 오늘 사용 횟수
   */
  getDailyAdCount(adType) {
    this._ensureTodayData();
    return this._dailyLimits.counts[adType] || 0;
  }

  /**
   * 해당 광고 유형의 사용 횟수를 1 증가시키고 저장한다.
   * @param {string} adType - 광고 유형 ('diamond' | 'goldBoost' | 'clearBoost')
   */
  incrementDailyAdCount(adType) {
    this._ensureTodayData();
    if (!this._dailyLimits.counts[adType]) {
      this._dailyLimits.counts[adType] = 0;
    }
    this._dailyLimits.counts[adType] += 1;
    this._saveDailyLimits();
  }

  /**
   * 해당 광고 유형의 일일 제한에 도달했는지 확인한다.
   * @param {string} adType - 광고 유형 ('diamond' | 'goldBoost' | 'clearBoost')
   * @returns {boolean} 제한 도달 시 true
   */
  isAdLimitReached(adType) {
    const limit = AD_LIMITS[adType];
    if (limit === undefined) return false;
    return this.getDailyAdCount(adType) >= limit;
  }

  /**
   * 해당 광고 유형의 오늘 남은 시청 횟수를 반환한다.
   * @param {string} adType - 광고 유형 ('diamond' | 'goldBoost' | 'clearBoost')
   * @returns {number} 남은 횟수
   */
  getRemainingAdCount(adType) {
    const limit = AD_LIMITS[adType];
    if (limit === undefined) return 0;
    return Math.max(0, limit - this.getDailyAdCount(adType));
  }

  // ── 내부 헬퍼 ──────────────────────────────────────────────────

  /**
   * 오늘 날짜를 'YYYY-MM-DD' 형식 문자열로 반환한다.
   * @returns {string} 날짜 문자열
   * @private
   */
  _getToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * 오늘 날짜가 저장된 날짜와 다르면 카운터를 초기화한다.
   * @private
   */
  _ensureTodayData() {
    const today = this._getToday();
    if (this._dailyLimits.date !== today) {
      this._dailyLimits = { date: today, counts: {} };
      this._saveDailyLimits();
    }
  }

  /**
   * localStorage에서 일일 제한 데이터를 로드한다.
   * @returns {object} 일일 제한 데이터 ({ date: string, counts: object })
   * @private
   */
  _loadDailyLimits() {
    try {
      const raw = localStorage.getItem(AD_DAILY_LIMIT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.date && data.counts) {
          return data;
        }
      }
    } catch {
      // 파싱 실패 시 기본값 반환
    }
    return { date: this._getToday(), counts: {} };
  }

  /**
   * 일일 제한 데이터를 localStorage에 저장한다.
   * @private
   */
  _saveDailyLimits() {
    try {
      localStorage.setItem(AD_DAILY_LIMIT_KEY, JSON.stringify(this._dailyLimits));
    } catch {
      // localStorage 저장 실패 시 무시 (용량 초과 등)
    }
  }
}
