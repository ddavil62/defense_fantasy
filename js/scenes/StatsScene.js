/**
 * @fileoverview StatsScene - Statistics display scene.
 * Shows cumulative game stats, kill breakdowns, tower performance, and recent game history.
 *
 * Phase 6: New scene.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, VISUALS,
} from '../config.js';

/** @const {Object<string, number>} Enemy type display colors */
const ENEMY_COLORS = {
  normal: COLORS.ENEMY_NORMAL,
  fast: COLORS.ENEMY_FAST,
  tank: COLORS.ENEMY_TANK,
  boss: COLORS.ENEMY_BOSS,
  boss_armored: COLORS.ENEMY_BOSS,
  swarm: COLORS.ENEMY_SWARM,
  splitter: COLORS.ENEMY_SPLITTER,
  armored: COLORS.ENEMY_ARMORED,
};

/** @const {Object<string, number>} Tower type display colors */
const TOWER_COLORS = {
  archer: COLORS.ARCHER_TOWER,
  mage: COLORS.MAGE_TOWER,
  ice: COLORS.ICE_TOWER,
  lightning: COLORS.LIGHTNING_TOWER,
  flame: COLORS.FLAME_TOWER,
  rock: COLORS.ROCK_TOWER,
  poison: COLORS.POISON_TOWER,
  wind: COLORS.WIND_TOWER,
  light: COLORS.LIGHT_TOWER,
  dragon: COLORS.DRAGON_TOWER,
};

export class StatsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StatsScene' });
  }

  create() {
    const saveData = this.registry.get('saveData');
    const stats = saveData?.stats || {};

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // ── Scrollable content container ──
    this.scrollContainer = this.add.container(0, 0);

    let y = 0;

    // ── Header (fixed, not scrollable) ──
    // Opaque header background to occlude scrolling content
    this.add.rectangle(GAME_WIDTH / 2, 26, GAME_WIDTH, 52, COLORS.BACKGROUND).setDepth(49);

    y += 30;
    const backBg = this.add.rectangle(40, y, 60, 28, COLORS.UI_PANEL)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);
    const backText = this.add.text(40, y, '\u25C0 BACK', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    backBg.on('pointerdown', () => this.scene.start('MenuScene'));

    this.add.text(GAME_WIDTH / 2 + 10, y, 'STATISTICS', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // Header divider
    this.add.rectangle(GAME_WIDTH / 2, y + 20, GAME_WIDTH - 40, 1, COLORS.BUTTON_ACTIVE)
      .setAlpha(0.5).setDepth(50);

    // ── Scrollable content starts here ──
    y = 70;

    // ── Overview Section ──
    y = this._drawOverview(stats, y);

    // ── Kill Breakdown ──
    y = this._drawKillBreakdown(stats, y);

    // ── Tower Performance ──
    y = this._drawTowerPerformance(stats, y);

    // ── Recent Games ──
    y = this._drawRecentGames(stats, y);

    // ── Scroll setup ──
    const maxScroll = Math.max(0, y - GAME_HEIGHT + 40);
    this._setupScroll(maxScroll);
  }

  /**
   * Draw overview stats section.
   * @param {object} stats
   * @param {number} startY
   * @returns {number} Next Y position
   * @private
   */
  _drawOverview(stats, startY) {
    let y = startY;

    this._addSectionTitle('OVERVIEW', y);
    y += 25;

    const lines = [
      `Total Games: ${stats.totalGamesPlayed || 0}`,
      `Best Round: R${stats.bestRound || 0}`,
      `Total Kills: ${this._formatNumber(stats.totalKills || 0)}`,
      `Boss Kills: ${stats.totalBossKills || 0}`,
      `Towers Placed: ${this._formatNumber(stats.totalTowersPlaced || 0)}`,
      `Gold Earned: ${this._formatNumber(stats.totalGoldEarned || 0)}`,
      `Waves Cleared: ${this._formatNumber(stats.totalWavesCleared || 0)}`,
    ];

    for (const line of lines) {
      this.scrollContainer.add(
        this.add.text(24, y, line, {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          color: '#dfe6e9',
        })
      );
      y += 22;
    }

    y += 10;
    return y;
  }

  /**
   * Draw enemy kill breakdown section.
   * @param {object} stats
   * @param {number} startY
   * @returns {number} Next Y position
   * @private
   */
  _drawKillBreakdown(stats, startY) {
    let y = startY;
    const killsByType = stats.killsByEnemyType || {};
    const totalKills = stats.totalKills || 1;

    this._addSectionTitle('KILL BREAKDOWN', y);
    y += 25;

    // Sort by kill count descending
    const entries = Object.entries(killsByType)
      .sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      this.scrollContainer.add(
        this.add.text(24, y, 'No kills yet', {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#636e72',
        })
      );
      y += 22;
    } else {
      const g = this.add.graphics();
      this.scrollContainer.add(g);

      for (const [type, count] of entries) {
        const pct = Math.round((count / totalKills) * 100);
        const barWidth = Math.max(2, (count / totalKills) * 180);
        const color = ENEMY_COLORS[type] || 0xffffff;
        const label = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');

        // Color dot
        g.fillStyle(color, 1);
        g.fillCircle(32, y + 8, 5);

        // Name + count
        this.scrollContainer.add(
          this.add.text(44, y, `${label}`, {
            fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#dfe6e9',
          })
        );
        this.scrollContainer.add(
          this.add.text(GAME_WIDTH - 24, y, `${this._formatNumber(count)} (${pct}%)`, {
            fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
          }).setOrigin(1, 0)
        );

        // Bar
        g.fillStyle(color, 0.3);
        g.fillRect(44, y + 17, barWidth, 4);

        y += 28;
      }
    }

    y += 10;
    return y;
  }

  /**
   * Draw tower performance section.
   * @param {object} stats
   * @param {number} startY
   * @returns {number} Next Y position
   * @private
   */
  _drawTowerPerformance(stats, startY) {
    let y = startY;
    const killsByTower = stats.killsByTowerType || {};

    this._addSectionTitle('TOWER PERFORMANCE', y);
    y += 25;

    const entries = Object.entries(killsByTower)
      .sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      this.scrollContainer.add(
        this.add.text(24, y, 'No tower data yet', {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#636e72',
        })
      );
      y += 22;
    } else {
      const maxKills = entries[0][1] || 1;
      const g = this.add.graphics();
      this.scrollContainer.add(g);

      for (const [type, count] of entries) {
        const color = TOWER_COLORS[type] || 0xffffff;
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        const barWidth = Math.max(2, (count / maxKills) * 180);

        // Color dot
        g.fillStyle(color, 1);
        g.fillCircle(32, y + 8, 5);

        // Name
        this.scrollContainer.add(
          this.add.text(44, y, label, {
            fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#dfe6e9',
          })
        );

        // Kill count
        this.scrollContainer.add(
          this.add.text(GAME_WIDTH - 24, y, `${this._formatNumber(count)} kills`, {
            fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
          }).setOrigin(1, 0)
        );

        // Bar
        g.fillStyle(color, 0.3);
        g.fillRect(44, y + 17, barWidth, 4);

        y += 28;
      }
    }

    y += 10;
    return y;
  }

  /**
   * Draw recent games history section.
   * @param {object} stats
   * @param {number} startY
   * @returns {number} Next Y position
   * @private
   */
  _drawRecentGames(stats, startY) {
    let y = startY;
    const history = stats.gameHistory || [];

    this._addSectionTitle('RECENT GAMES', y);
    y += 25;

    if (history.length === 0) {
      this.scrollContainer.add(
        this.add.text(24, y, 'No games played yet', {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#636e72',
        })
      );
      y += 22;
    } else {
      // Show most recent first
      const recent = [...history].reverse().slice(0, 10);
      for (const game of recent) {
        const line = `#${game.gameNumber}  R${game.round}  ${game.kills} kills`;
        const extra = game.bossKills > 0 ? `  (Boss: ${game.bossKills})` : '';

        this.scrollContainer.add(
          this.add.text(24, y, line + extra, {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#dfe6e9',
          })
        );
        y += 20;
      }
    }

    y += 30;
    return y;
  }

  /**
   * Add a section title with divider.
   * @param {string} title
   * @param {number} y
   * @private
   */
  _addSectionTitle(title, y) {
    const divider = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 40, 1, 0x636e72)
      .setAlpha(0.4);
    this.scrollContainer.add(divider);

    const text = this.add.text(24, y + 4, title, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#636e72',
      fontStyle: 'bold',
    });
    this.scrollContainer.add(text);
  }

  /**
   * Calculate total content height.
   * @param {object} stats
   * @returns {number}
   * @private
   */
  _calculateContentHeight(stats) {
    let h = 70; // header
    h += 25 + 7 * 22 + 10; // overview
    h += 25 + Object.keys(stats.killsByEnemyType || {}).length * 28 + 10;
    h += 25 + Object.keys(stats.killsByTowerType || {}).length * 28 + 10;
    h += 25 + Math.min(10, (stats.gameHistory || []).length) * 20 + 30;
    return h;
  }

  /**
   * Setup scroll input handling.
   * @param {number} maxScroll
   * @private
   */
  _setupScroll(maxScroll) {
    if (maxScroll <= 0) return;

    let scrollY = 0;
    let isDragging = false;
    let lastPointerY = 0;

    this.input.on('pointerdown', (pointer) => {
      isDragging = true;
      lastPointerY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (!isDragging) return;
      const dy = pointer.y - lastPointerY;
      lastPointerY = pointer.y;
      scrollY = Math.max(-maxScroll, Math.min(0, scrollY + dy));
      this.scrollContainer.setY(scrollY);
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });

    // Mouse wheel support
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      scrollY = Math.max(-maxScroll, Math.min(0, scrollY - deltaY * 0.5));
      this.scrollContainer.setY(scrollY);
    });
  }

  /**
   * Format a number with commas.
   * @param {number} n
   * @returns {string}
   * @private
   */
  _formatNumber(n) {
    return n.toLocaleString();
  }
}
