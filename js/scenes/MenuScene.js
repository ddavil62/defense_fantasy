/**
 * @fileoverview MenuScene - Title screen with game name, best record, Diamond display,
 * GAME START, COLLECTION, and STATISTICS buttons.
 *
 * Phase 5: Added menu BGM playback and mute toggle button.
 * Phase 6: Added STATISTICS button.
 * UI Redesign Phase 1: Dark fantasy theme - gold rune lines, constellation decoration,
 * gold title glow, semantic button colors, purple diamond display.
 */

import { GAME_WIDTH, GAME_HEIGHT, COLORS, BTN_PRIMARY, BTN_META, BTN_BACK, BTN_SELL, BTN_META_CSS, BTN_BACK_CSS, BTN_SELL_CSS } from '../config.js';

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

    // Constellation decoration: random white dots (stars)
    const starGfx = this.add.graphics();
    const starCount = 30 + Math.floor(Math.random() * 11); // 30~40
    for (let i = 0; i < starCount; i++) {
      const sx = Math.random() * GAME_WIDTH;
      const sy = Math.random() * GAME_HEIGHT;
      const sa = 0.2 + Math.random() * 0.3; // alpha 0.2~0.5
      const sr = 0.5 + Math.random() * 1.0; // radius 0.5~1.5
      starGfx.fillStyle(0xffffff, sa);
      starGfx.fillCircle(sx, sy, sr);
    }

    // Decorative top/bottom rune lines (gold, alpha 0.6)
    this.add.rectangle(centerX, 30, GAME_WIDTH - 40, 2, 0xc0a030).setAlpha(0.6);
    this.add.rectangle(centerX, GAME_HEIGHT - 30, GAME_WIDTH - 40, 2, 0xc0a030).setAlpha(0.6);

    // Title text with gold color and glow effect
    this.add.text(centerX, 190, 'Fantasy\nTower Defense', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      align: 'center',
      fontStyle: 'bold',
      lineSpacing: 8,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#c0a030',
        blur: 12,
        fill: true,
      },
    }).setOrigin(0.5);

    // Diamond display (purple)
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

    // GAME START button (gold primary, dark text for contrast)
    const startBg = this.add.rectangle(centerX, 400, 160, 44, BTN_PRIMARY)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffd700);

    this.add.text(centerX, 400, 'GAME START', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#1a1a2e',
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

    startBg.on('pointerover', () => startBg.setFillStyle(0xd4b440));
    startBg.on('pointerout', () => startBg.setFillStyle(BTN_PRIMARY));

    // COLLECTION button (purple meta)
    const collBg = this.add.rectangle(centerX, 458, 160, 40, BTN_META)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, COLORS.DIAMOND);

    this.add.text(centerX, 458, 'COLLECTION', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: BTN_META_CSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    collBg.on('pointerdown', () => {
      this.scene.start('CollectionScene');
    });

    collBg.on('pointerover', () => collBg.setFillStyle(0x7d3f96));
    collBg.on('pointerout', () => collBg.setFillStyle(BTN_META));

    // STATISTICS button (teal back)
    const statsBg = this.add.rectangle(centerX, 510, 160, 40, BTN_BACK)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x1a9c7e);

    this.add.text(centerX, 510, 'STATISTICS', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    statsBg.on('pointerdown', () => {
      this.scene.start('StatsScene');
    });

    statsBg.on('pointerover', () => statsBg.setFillStyle(0x1f7d6e));
    statsBg.on('pointerout', () => statsBg.setFillStyle(BTN_BACK));

    // Phase 5: Mute toggle button (unified style: active=BTN_BACK, inactive=BTN_SELL)
    /** @type {import('../managers/SoundManager.js').SoundManager|null} */
    const sm = this.registry.get('soundManager');
    if (sm) {
      const isMuted = sm.muted;
      const muteBg = this.add.rectangle(centerX, 562, 80, 28, isMuted ? BTN_SELL : BTN_BACK)
        .setStrokeStyle(1, isMuted ? 0x636e72 : 0x1a9c7e)
        .setInteractive({ useHandCursor: true });

      const muteLabel = this.add.text(centerX, 562,
        isMuted ? '\u266A OFF' : '\u266A ON',
        {
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          color: isMuted ? BTN_SELL_CSS : BTN_BACK_CSS,
          fontStyle: 'bold',
        }
      ).setOrigin(0.5);

      muteBg.on('pointerdown', () => {
        sm.setMuted(!sm.muted);
        const m = sm.muted;
        muteLabel.setText(m ? '\u266A OFF' : '\u266A ON');
        muteLabel.setColor(m ? BTN_SELL_CSS : BTN_BACK_CSS);
        muteBg.setFillStyle(m ? BTN_SELL : BTN_BACK);
        muteBg.setStrokeStyle(1, m ? 0x636e72 : 0x1a9c7e);
      });

      // Play menu BGM
      sm.playBgm('menu');
    }
  }
}
