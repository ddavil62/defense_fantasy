/**
 * @fileoverview MenuScene - Title screen with game name, best record, Diamond display,
 * GAME START, COLLECTION, and STATISTICS buttons.
 *
 * Phase 5: Added menu BGM playback and mute toggle button.
 * Phase 6: Added STATISTICS button.
 */

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  /**
   * Create the menu UI elements.
   */
  create() {
    const centerX = GAME_WIDTH / 2;

    // Background
    this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // Decorative top/bottom bars
    this.add.rectangle(centerX, 30, GAME_WIDTH - 40, 2, COLORS.BUTTON_ACTIVE).setAlpha(0.5);
    this.add.rectangle(centerX, GAME_HEIGHT - 30, GAME_WIDTH - 40, 2, COLORS.BUTTON_ACTIVE).setAlpha(0.5);

    // Title text
    this.add.text(centerX, 190, 'Fantasy\nTower Defense', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Diamond display
    const saveData = this.registry.get('saveData');
    const diamond = saveData?.diamond || 0;
    this.add.text(centerX, 280, `\u25C6 ${diamond}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
      align: 'center',
    }).setOrigin(0.5);

    // Best record display
    if (saveData && saveData.bestRound > 0) {
      this.add.text(centerX, 315, `Best: Round ${saveData.bestRound}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
        align: 'center',
      }).setOrigin(0.5);

      this.add.text(centerX, 338, `Kills: ${saveData.bestKills} | Games: ${saveData.totalGames}`, {
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        color: '#b2bec3',
        align: 'center',
      }).setOrigin(0.5);
    }

    // GAME START button
    const startBg = this.add.rectangle(centerX, 400, 160, 44, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff);

    this.add.text(centerX, 400, 'GAME START', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    startBg.on('pointerdown', () => {
      // Phase 5: Stop menu BGM before starting game
      const sm = this.registry.get('soundManager');
      if (sm) {
        sm.stopBgm(false);
      }
      this.scene.start('GameScene');
    });

    startBg.on('pointerover', () => startBg.setFillStyle(0xff6b6b));
    startBg.on('pointerout', () => startBg.setFillStyle(COLORS.BUTTON_ACTIVE));

    // COLLECTION button
    const collBg = this.add.rectangle(centerX, 458, 160, 40, COLORS.UI_PANEL)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, COLORS.DIAMOND);

    this.add.text(centerX, 458, 'COLLECTION', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    collBg.on('pointerdown', () => {
      this.scene.start('CollectionScene');
    });

    collBg.on('pointerover', () => collBg.setStrokeStyle(3, COLORS.DIAMOND));
    collBg.on('pointerout', () => collBg.setStrokeStyle(2, COLORS.DIAMOND));

    // Phase 6: STATISTICS button
    const statsBg = this.add.rectangle(centerX, 510, 160, 40, COLORS.UI_PANEL)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x636e72);

    this.add.text(centerX, 510, 'STATISTICS', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    statsBg.on('pointerdown', () => {
      this.scene.start('StatsScene');
    });

    statsBg.on('pointerover', () => statsBg.setStrokeStyle(2, 0xb2bec3));
    statsBg.on('pointerout', () => statsBg.setStrokeStyle(1, 0x636e72));

    // Phase 5: Mute toggle button
    /** @type {import('../managers/SoundManager.js').SoundManager|null} */
    const sm = this.registry.get('soundManager');
    if (sm) {
      const isMuted = sm.muted;
      const muteBg = this.add.rectangle(centerX, 562, 80, 28, 0x2d3436)
        .setStrokeStyle(1, isMuted ? 0x636e72 : 0x00b894)
        .setInteractive({ useHandCursor: true });

      const muteLabel = this.add.text(centerX, 562,
        isMuted ? '\u266A OFF' : '\u266A ON',
        {
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          color: isMuted ? '#636e72' : '#00b894',
          fontStyle: 'bold',
        }
      ).setOrigin(0.5);

      muteBg.on('pointerdown', () => {
        sm.setMuted(!sm.muted);
        const m = sm.muted;
        muteLabel.setText(m ? '\u266A OFF' : '\u266A ON');
        muteLabel.setColor(m ? '#636e72' : '#00b894');
        muteBg.setStrokeStyle(1, m ? 0x636e72 : 0x00b894);
      });

      // Play menu BGM
      sm.playBgm('menu');
    }
  }
}
