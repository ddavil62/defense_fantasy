/**
 * @fileoverview GoldManager - Manages gold economy (earning, spending, balance).
 */

import { INITIAL_GOLD } from '../config.js';

export class GoldManager {
  /**
   * @param {number} [startingGold] - Initial gold amount (defaults to INITIAL_GOLD)
   */
  constructor(startingGold = INITIAL_GOLD) {
    /** @type {number} Current gold balance */
    this.gold = startingGold;
  }

  /**
   * Check if the player can afford a given amount.
   * @param {number} amount - Cost to check
   * @returns {boolean} True if affordable
   */
  canAfford(amount) {
    return this.gold >= amount;
  }

  /**
   * Spend gold. Fails if insufficient.
   * @param {number} amount - Amount to spend
   * @returns {boolean} True if successful
   */
  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.gold -= amount;
    return true;
  }

  /**
   * Earn gold.
   * @param {number} amount - Amount to add
   */
  earn(amount) {
    this.gold += amount;
  }

  /**
   * Get current gold balance.
   * @returns {number}
   */
  getGold() {
    return this.gold;
  }
}
