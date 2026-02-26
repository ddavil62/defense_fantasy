/**
 * @fileoverview StatsScene - Statistics display scene.
 * Shows cumulative game stats, kill breakdowns, tower performance, and recent game history.
 *
 * Phase 6: New scene.
 * Phase 7: UI redesign - section headers with color bars, enlarged bar charts,
 *          2-column overview grid, card-style recent games, CollectionScene-style TopBar.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, VISUALS,
  BTN_PRIMARY, BTN_PRIMARY_CSS,
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

    // ── Header (fixed, not scrollable) - CollectionScene style TopBar ──
    this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH, 48, COLORS.HUD_BG).setDepth(49);

    y = 24;
    const backBg = this.add.rectangle(38, y, 60, 28, 0x000000, 0)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);

    this.add.text(38, y, '< BACK', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(50);

    backBg.on('pointerdown', () => this.scene.start('MenuScene'));

    this.add.text(180, y, 'STATISTICS', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // ── Scrollable content starts here ──
    y = 60;

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
   * Draw overview stats section with 2-column grid layout.
   * @param {object} stats
   * @param {number} startY
   * @returns {number} Next Y position
   * @private
   */
  _drawOverview(stats, startY) {
    let y = startY;

    this._addSectionTitle('OVERVIEW', y);
    y += 28;

    const items = [
      { label: 'Total Games', value: `${stats.totalGamesPlayed || 0}` },
      { label: 'Best Round', value: `R${stats.bestRound || 0}` },
      { label: 'Total Kills', value: this._formatNumber(stats.totalKills || 0) },
      { label: 'Boss Kills', value: `${stats.totalBossKills || 0}` },
      { label: 'Towers Placed', value: this._formatNumber(stats.totalTowersPlaced || 0) },
      { label: 'Gold Earned', value: this._formatNumber(stats.totalGoldEarned || 0) },
      { label: 'Waves Cleared', value: this._formatNumber(stats.totalWavesCleared || 0) },
    ];

    for (const item of items) {
      // Left: label
      this.scrollContainer.add(
        this.add.text(28, y, item.label, {
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          color: '#8a8a9a',
        })
      );
      // Right: value (gold-highlighted)
      this.scrollContainer.add(
        this.add.text(GAME_WIDTH - 28, y, item.value, {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          color: BTN_PRIMARY_CSS,
          fontStyle: 'bold',
        }).setOrigin(1, 0)
      );
      y += 22;
    }

    y += 10;
    return y;
  }

  /**
   * Draw enemy kill breakdown section with enlarged bars and dots.
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
    y += 28;

    // Sort by kill count descending
    const entries = Object.entries(killsByType)
      .sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      this.scrollContainer.add(
        this.add.text(28, y, 'No kills yet', {
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

        // Color dot (enlarged to 8px diameter = radius 4)
        g.fillStyle(color, 1);
        g.fillCircle(32, y + 8, 4);

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

        // Bar (height increased 4 → 8px)
        g.fillStyle(color, 0.3);
        g.fillRect(44, y + 18, barWidth, 8);

        y += 34;
      }
    }

    y += 10;
    return y;
  }

  /**
   * Draw tower performance section with enlarged bars and dots.
   * @param {object} stats
   * @param {number} startY
   * @returns {number} Next Y position
   * @private
   */
  _drawTowerPerformance(stats, startY) {
    let y = startY;
    const killsByTower = stats.killsByTowerType || {};

    this._addSectionTitle('TOWER PERFORMANCE', y);
    y += 28;

    const entries = Object.entries(killsByTower)
      .sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      this.scrollContainer.add(
        this.add.text(28, y, 'No tower data yet', {
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

        // Color dot (enlarged to 8px diameter = radius 4)
        g.fillStyle(color, 1);
        g.fillCircle(32, y + 8, 4);

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

        // Bar (height increased 4 → 8px)
        g.fillStyle(color, 0.3);
        g.fillRect(44, y + 18, barWidth, 8);

        y += 34;
      }
    }

    y += 10;
    return y;
  }

  /**
   * Draw recent games history section with card-style background.
   * @param {object} stats
   * @param {number} startY
   * @returns {number} Next Y position
   * @private
   */
  _drawRecentGames(stats, startY) {
    let y = startY;
    const history = stats.gameHistory || [];

    this._addSectionTitle('RECENT GAMES', y);
    y += 28;

    if (history.length === 0) {
      this.scrollContainer.add(
        this.add.text(28, y, 'No games played yet', {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#636e72',
        })
      );
      y += 22;
    } else {
      const cardG = this.add.graphics();
      this.scrollContainer.add(cardG);

      // Show most recent first
      const recent = [...history].reverse().slice(0, 10);
      for (const game of recent) {
        const cardH = 32;
        const cardW = GAME_WIDTH - 40;
        const cardX = 20;

        // Card background rectangle
        cardG.fillStyle(COLORS.UI_PANEL, 0.6);
        cardG.fillRoundedRect(cardX, y, cardW, cardH, 4);
        cardG.lineStyle(1, BTN_PRIMARY, 0.2);
        cardG.strokeRoundedRect(cardX, y, cardW, cardH, 4);

        // Game number
        this.scrollContainer.add(
          this.add.text(cardX + 8, y + 8, `#${game.gameNumber}`, {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: BTN_PRIMARY_CSS,
            fontStyle: 'bold',
          })
        );

        // Round + kills
        const info = `R${game.round}  ${game.kills} kills`;
        const extra = game.bossKills > 0 ? `  Boss: ${game.bossKills}` : '';
        this.scrollContainer.add(
          this.add.text(cardX + 55, y + 8, info + extra, {
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif',
            color: '#dfe6e9',
          })
        );

        y += cardH + 4;
      }
    }

    y += 30;
    return y;
  }

  /**
   * Add a section title with left color bar (BTN_PRIMARY 4px width).
   * @param {string} title
   * @param {number} y
   * @private
   */
  _addSectionTitle(title, y) {
    const g = this.add.graphics();
    this.scrollContainer.add(g);

    // Left color bar: 4px wide, 16px tall, BTN_PRIMARY gold
    g.fillStyle(BTN_PRIMARY, 1);
    g.fillRect(16, y + 2, 4, 16);

    const text = this.add.text(28, y + 2, title, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
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
    let h = 60; // header
    h += 28 + 7 * 22 + 10; // overview
    h += 28 + Object.keys(stats.killsByEnemyType || {}).length * 34 + 10;
    h += 28 + Object.keys(stats.killsByTowerType || {}).length * 34 + 10;
    h += 28 + Math.min(10, (stats.gameHistory || []).length) * 36 + 30;
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
