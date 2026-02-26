/**
 * @fileoverview GoldManager - 골드 경제 시스템(획득, 소비, 잔액)을 관리한다.
 * 타워 구매, 업그레이드, 강화 등의 비용 지불과 적 처치, 웨이브 클리어 보너스 등의
 * 골드 획득을 단일 인터페이스로 처리한다.
 */

import { INITIAL_GOLD } from '../config.js';

export class GoldManager {
  /**
   * GoldManager를 생성한다.
   * @param {number} [startingGold] - 초기 골드 (기본값: INITIAL_GOLD)
   */
  constructor(startingGold = INITIAL_GOLD) {
    /** @type {number} 현재 골드 잔액 */
    this.gold = startingGold;
  }

  /**
   * 지정 금액을 지불할 수 있는지 확인한다.
   * @param {number} amount - 확인할 비용
   * @returns {boolean} 지불 가능 여부
   */
  canAfford(amount) {
    return this.gold >= amount;
  }

  /**
   * 골드를 소비한다. 잔액 부족 시 실패한다.
   * @param {number} amount - 소비할 양
   * @returns {boolean} 소비 성공 여부
   */
  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.gold -= amount;
    return true;
  }

  /**
   * 골드를 획득한다.
   * @param {number} amount - 획득할 양
   */
  earn(amount) {
    this.gold += amount;
  }

  /**
   * 현재 골드 잔액을 반환한다.
   * @returns {number} 현재 골드
   */
  getGold() {
    return this.gold;
  }
}
