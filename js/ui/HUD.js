/**
 * @fileoverview HUD - Top bar displaying wave number, gold, and base HP.
 * Includes HP danger blinking effect and wave countdown display.
 *
 * Phase 6: Added wave break countdown and next wave preview dots.
 */

import {
  GAME_WIDTH, HUD_HEIGHT, COLORS,
  HP_DANGER_THRESHOLD, HP_BLINK_INTERVAL,
  GOLD_TEXT_CSS, HP_DANGER_CSS, ENEMY_STATS,
  BTN_SELL,
} from '../config.js';

/** @const {Object<string, number>} Enemy type to color mapping for preview dots */
const ENEMY_PREVIEW_COLORS = {
  normal: COLORS.ENEMY_NORMAL,
  fast: COLORS.ENEMY_FAST,
  tank: COLORS.ENEMY_TANK,
  boss: COLORS.ENEMY_BOSS,
  boss_armored: COLORS.ENEMY_BOSS,
  swarm: COLORS.ENEMY_SWARM,
  splitter: COLORS.ENEMY_SPLITTER,
  armored: COLORS.ENEMY_ARMORED,
};

export class HUD {
  /**
   * @param {Phaser.Scene} scene - The game scene
   */
  constructor(scene) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {boolean} HP blink state */
    this._hpBlinkVisible = true;

    /** @type {number} HP blink timer */
    this._hpBlinkTimer = 0;

    /** @type {number} Current HP for blink check */
    this._currentHP = 0;

    this._create();
  }

  /**
   * Create HUD visual elements.
   * @private
   */
  _create() {
    // Background bar - gradient effect (dark at top, fading toward map)
    this.bgGraphics = this.scene.add.graphics();
    this.bgGraphics.setDepth(30);
    const gradientSteps = 4;
    const stepH = HUD_HEIGHT / gradientSteps;
    for (let i = 0; i < gradientSteps; i++) {
      // Top is opaque, bottom fades
      const alpha = 0.95 - (i * 0.12);
      this.bgGraphics.fillStyle(COLORS.HUD_BG, alpha);
      this.bgGraphics.fillRect(0, i * stepH, GAME_WIDTH, stepH);
    }

    // HUD danger border graphics (initially hidden)
    this.dangerBorderGraphics = this.scene.add.graphics();
    this.dangerBorderGraphics.setDepth(32);
    this.dangerBorderGraphics.setAlpha(0);

    // Wave text (left) - with sword icon
    this.waveText = this.scene.add.text(10, HUD_HEIGHT / 2, '\u2694 Wave: 1', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0, 0.5).setDepth(31);

    // Gold text (center) - with diamond icon
    this.goldText = this.scene.add.text(150, HUD_HEIGHT / 2, '\u25C6 200', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: GOLD_TEXT_CSS,
    }).setOrigin(0.5, 0.5).setDepth(31);

    // HP text (right) - with heart icon
    this.hpText = this.scene.add.text(235, HUD_HEIGHT / 2, '\u2665 20', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0, 0.5).setDepth(31);

    // Phase 6: Countdown text (below wave text, only shown during break)
    this.countdownText = this.scene.add.text(10, HUD_HEIGHT + 4, '', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0, 0).setDepth(31).setAlpha(0);

    // Phase 6: Preview dots graphics (next to countdown)
    this.previewGraphics = this.scene.add.graphics();
    this.previewGraphics.setDepth(31);
  }

  /**
   * Update the wave display.
   * @param {number} round - Current round number
   */
  updateWave(round) {
    this.waveText.setText(`\u2694 Wave: ${round}`);
  }

  /**
   * Update the gold display.
   * @param {number} amount - Current gold amount
   */
  updateGold(amount) {
    this.goldText.setText(`\u25C6 ${amount}`);
  }

  /**
   * Update the HP display with danger blinking.
   * @param {number} current - Current HP
   * @param {number} max - Maximum HP
   */
  updateHP(current, max) {
    this._currentHP = current;
    this.hpText.setText(`\u2665 ${current}`);

    if (current > HP_DANGER_THRESHOLD) {
      this.hpText.setColor('#ffffff');
      // Hide danger border when HP is safe
      if (this.dangerBorderGraphics) {
        this.dangerBorderGraphics.setAlpha(0);
      }
    } else if (current > 0) {
      // Show danger border when HP is low
      this._drawDangerBorder();
    }
  }

  /**
   * Draw red glow border on HUD for danger state.
   * @private
   */
  _drawDangerBorder() {
    if (!this.dangerBorderGraphics) return;
    this.dangerBorderGraphics.clear();
    this.dangerBorderGraphics.lineStyle(2, 0xff4757, 0.8);
    this.dangerBorderGraphics.strokeRect(0, 0, GAME_WIDTH, HUD_HEIGHT);
    this.dangerBorderGraphics.setAlpha(1);
  }

  /**
   * Update blink effect for low HP.
   * @param {number} delta - Frame delta in seconds
   */
  updateBlink(delta) {
    if (this._currentHP <= HP_DANGER_THRESHOLD && this._currentHP > 0) {
      this._hpBlinkTimer += delta * 1000;
      if (this._hpBlinkTimer >= HP_BLINK_INTERVAL) {
        this._hpBlinkTimer = 0;
        this._hpBlinkVisible = !this._hpBlinkVisible;
        this.hpText.setColor(this._hpBlinkVisible ? HP_DANGER_CSS : '#ffffff');
        // Pulse danger border alpha
        if (this.dangerBorderGraphics) {
          this.dangerBorderGraphics.setAlpha(this._hpBlinkVisible ? 1 : 0.4);
        }
      }
    }
  }

  /**
   * Update wave break countdown and next wave preview.
   * @param {number} breakTime - Remaining break time in seconds (0 if not in break)
   * @param {{ types: string[], isBoss: boolean }|null} preview - Next wave preview data
   */
  updateCountdown(breakTime, preview) {
    this.previewGraphics.clear();

    if (breakTime > 0 && preview) {
      const secs = Math.ceil(breakTime);
      this.countdownText.setText(`Next: ${secs}s`);
      this.countdownText.setAlpha(1);

      // Draw preview dots (enemy type colors)
      const startX = 70;
      const dotY = HUD_HEIGHT + 10;
      for (let i = 0; i < preview.types.length; i++) {
        const color = ENEMY_PREVIEW_COLORS[preview.types[i]] || 0xffffff;
        this.previewGraphics.fillStyle(color, 0.9);
        this.previewGraphics.fillCircle(startX + i * 14, dotY, 4);
      }

      // Boss indicator
      if (preview.isBoss) {
        this.countdownText.setColor('#ffd700');
        this.previewGraphics.lineStyle(1, 0xffd700, 0.8);
        this.previewGraphics.strokeCircle(startX + preview.types.length * 14 + 6, dotY, 5);
        this.previewGraphics.fillStyle(0xffd700, 0.6);
        this.previewGraphics.fillCircle(startX + preview.types.length * 14 + 6, dotY, 2);
      } else {
        this.countdownText.setColor('#b2bec3');
      }
    } else {
      this.countdownText.setAlpha(0);
    }
  }

  /**
   * Clean up HUD elements.
   */
  destroy() {
    if (this.bgGraphics) this.bgGraphics.destroy();
    if (this.dangerBorderGraphics) this.dangerBorderGraphics.destroy();
    if (this.waveText) this.waveText.destroy();
    if (this.goldText) this.goldText.destroy();
    if (this.hpText) this.hpText.destroy();
    if (this.countdownText) this.countdownText.destroy();
    if (this.previewGraphics) this.previewGraphics.destroy();
  }
}
