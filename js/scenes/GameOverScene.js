/**
 * @fileoverview GameOverScene - Displays game results, Diamond reward, saves records, and offers restart/menu.
 *
 * Phase 6: Added gameStats saving to persistent stats, game history, and summary display.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, VISUALS, SAVE_KEY,
  calcDiamondReward, migrateSaveData,
} from '../config.js';

/** @const {number} Max game history entries to keep */
const MAX_HISTORY = 20;

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  /**
   * Receive data from GameScene.
   * @param {object} data - { round, kills, gameStats }
   */
  init(data) {
    /** @type {number} Round reached */
    this.round = data.round || 1;

    /** @type {number} Total kills */
    this.kills = data.kills || 0;

    /** @type {object} Per-game statistics */
    this.gameStats = data.gameStats || {};
  }

  /**
   * Create the game over UI.
   */
  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Dark overlay
    this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(VISUALS.OVERLAY_ALPHA);

    // Load and update save data
    const saveData = this._loadSave();
    const isNewBest = this.round > saveData.bestRound;

    if (this.round > saveData.bestRound) {
      saveData.bestRound = this.round;
    }
    if (this.kills > saveData.bestKills) {
      saveData.bestKills = this.kills;
    }
    saveData.totalGames++;

    // Diamond calculation
    const diamondEarned = calcDiamondReward(this.round);
    saveData.diamond = (saveData.diamond || 0) + diamondEarned;
    saveData.totalDiamondEarned = (saveData.totalDiamondEarned || 0) + diamondEarned;

    // Phase 6: Update persistent stats
    this._updateStats(saveData);

    this._saveToDB(saveData);

    // Update registry for MenuScene
    this.registry.set('saveData', saveData);

    // Result panel background (expanded for stats summary)
    const panelW = 280;
    const panelH = 380;
    this.add.rectangle(centerX, centerY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, COLORS.BUTTON_ACTIVE);

    // GAME OVER title
    this.add.text(centerX, centerY - 165, 'GAME OVER', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(centerX, centerY - 138, panelW - 40, 1, 0x636e72);

    // Round reached
    this.add.text(centerX, centerY - 115, `Round: ${this.round}`, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Kill count
    this.add.text(centerX, centerY - 88, `Kills: ${this.kills}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Best record
    this.add.text(centerX, centerY - 60, `Best: Round ${saveData.bestRound}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);

    // NEW BEST indicator
    if (isNewBest) {
      const newBestText = this.add.text(centerX, centerY - 38, 'NEW BEST!', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: newBestText,
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }

    // Phase 6: Stats summary line
    const gs = this.gameStats;
    const statsY = centerY - 15;
    this.add.text(centerX, statsY,
      `Towers: ${gs.towersPlaced || 0}  |  Gold: ${gs.goldEarned || 0}`, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#b2bec3',
      }).setOrigin(0.5);

    // Find top killer tower
    const topTower = this._getTopKiller(gs.killsByTower || {});
    if (topTower) {
      this.add.text(centerX, statsY + 18,
        `Top Tower: ${topTower.name} (${topTower.kills} kills)`, {
          fontSize: '11px',
          fontFamily: 'Arial, sans-serif',
          color: '#636e72',
        }).setOrigin(0.5);
    }

    // Diamond display
    const diamondY = centerY + 20;
    if (diamondEarned > 0) {
      this.add.text(centerX, diamondY, `\u25C6 +${diamondEarned} Diamond`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: COLORS.DIAMOND_CSS,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(centerX, diamondY + 23, `(Total: \u25C6 ${saveData.diamond})`, {
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
    } else {
      this.add.text(centerX, diamondY, 'R5+ for Diamond', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
    }

    // RETRY button
    const retryY = centerY + 75;
    const restartBg = this.add.rectangle(centerX, retryY, 160, 40, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff);

    this.add.text(centerX, retryY, 'RETRY', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    restartBg.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    restartBg.on('pointerover', () => restartBg.setFillStyle(0xff6b6b));
    restartBg.on('pointerout', () => restartBg.setFillStyle(COLORS.BUTTON_ACTIVE));

    // MENU button
    const menuY = retryY + 50;
    const menuBg = this.add.rectangle(centerX, menuY, 160, 36, COLORS.UI_PANEL)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x636e72);

    this.add.text(centerX, menuY, 'MENU', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    menuBg.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    menuBg.on('pointerover', () => menuBg.setStrokeStyle(2, 0xb2bec3));
    menuBg.on('pointerout', () => menuBg.setStrokeStyle(1, 0x636e72));
  }

  /**
   * Update persistent stats with this game's data.
   * @param {object} saveData
   * @private
   */
  _updateStats(saveData) {
    const stats = saveData.stats;
    const gs = this.gameStats;
    if (!stats) return;

    stats.totalGamesPlayed = saveData.totalGames;
    stats.totalKills += this.kills;
    stats.totalBossKills += gs.bossesKilled || 0;
    stats.totalTowersPlaced += gs.towersPlaced || 0;
    stats.totalGoldEarned += gs.goldEarned || 0;
    stats.totalDamageDealt += gs.damageDealt || 0;
    stats.totalWavesCleared += gs.wavesCleared || 0;
    stats.bestRound = saveData.bestRound;
    stats.bestKills = saveData.bestKills;

    // Merge kill counts by enemy type
    for (const [type, count] of Object.entries(gs.killsByType || {})) {
      stats.killsByEnemyType[type] = (stats.killsByEnemyType[type] || 0) + count;
    }

    // Merge kill counts by tower type
    for (const [type, count] of Object.entries(gs.killsByTower || {})) {
      stats.killsByTowerType[type] = (stats.killsByTowerType[type] || 0) + count;
    }

    // Add to game history (FIFO, max 20)
    stats.gameHistory.push({
      gameNumber: stats.totalGamesPlayed,
      round: this.round,
      kills: this.kills,
      bossKills: gs.bossesKilled || 0,
      towersPlaced: gs.towersPlaced || 0,
      goldEarned: gs.goldEarned || 0,
      timestamp: Date.now(),
    });
    while (stats.gameHistory.length > MAX_HISTORY) {
      stats.gameHistory.shift();
    }
  }

  /**
   * Get the tower type with most kills.
   * @param {Object<string, number>} killsByTower
   * @returns {{ name: string, kills: number }|null}
   * @private
   */
  _getTopKiller(killsByTower) {
    let best = null;
    for (const [type, kills] of Object.entries(killsByTower)) {
      if (!best || kills > best.kills) {
        best = { name: type.charAt(0).toUpperCase() + type.slice(1), kills };
      }
    }
    return best;
  }

  /**
   * Load save data from localStorage.
   * @returns {object} Save data
   * @private
   */
  _loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return migrateSaveData(JSON.parse(raw));
    } catch (e) {
      // Ignore errors
    }
    return migrateSaveData(null);
  }

  /**
   * Save data to localStorage.
   * @param {object} data - Save data
   * @private
   */
  _saveToDB(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // Ignore errors (localStorage unavailable)
    }
  }
}
