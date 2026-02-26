/**
 * @fileoverview 메인 메뉴 씬(MenuScene).
 * 게임 타이틀, 최고 기록, 다이아몬드 보유량을 표시하고
 * GAME START / COLLECTION / STATISTICS 버튼과 음소거 토글을 제공한다.
 *
 * 다크 판타지 테마: 골드 룬 라인, 별자리 장식, 타이틀 글로우,
 * 시맨틱 버튼 컬러, 퍼플 다이아몬드 표시.
 */

import { GAME_WIDTH, GAME_HEIGHT, COLORS, BTN_PRIMARY, BTN_META, BTN_BACK, BTN_SELL, BTN_META_CSS, BTN_BACK_CSS, BTN_SELL_CSS } from '../config.js';

/**
 * 타이틀 화면 씬.
 * 게임 시작, 컬렉션, 통계 진입, BGM 재생 및 음소거 토글을 담당한다.
 * @extends Phaser.Scene
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  /**
   * 메뉴 UI 요소를 생성한다.
   * 배경, 별자리 장식, 타이틀, 다이아몬드/기록 표시, 버튼, 음소거 토글 순서로 배치한다.
   */
  create() {
    const centerX = GAME_WIDTH / 2;

    // ── 배경 ──
    this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // ── 별자리 장식: 랜덤 위치에 흰색 점(별) 30~40개 ──
    const starGfx = this.add.graphics();
    const starCount = 30 + Math.floor(Math.random() * 11);
    for (let i = 0; i < starCount; i++) {
      const sx = Math.random() * GAME_WIDTH;
      const sy = Math.random() * GAME_HEIGHT;
      const sa = 0.2 + Math.random() * 0.3;   // 투명도 0.2~0.5
      const sr = 0.5 + Math.random() * 1.0;   // 반지름 0.5~1.5px
      starGfx.fillStyle(0xffffff, sa);
      starGfx.fillCircle(sx, sy, sr);
    }

    // ── 상/하단 장식용 골드 룬 라인 (alpha 0.6) ──
    this.add.rectangle(centerX, 30, GAME_WIDTH - 40, 2, 0xc0a030).setAlpha(0.6);
    this.add.rectangle(centerX, GAME_HEIGHT - 30, GAME_WIDTH - 40, 2, 0xc0a030).setAlpha(0.6);

    // ── 타이틀 텍스트 (골드 + 그림자 글로우) ──
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

    // ── 다이아몬드 보유량 (퍼플) ──
    const saveData = this.registry.get('saveData');
    const diamond = saveData?.diamond || 0;
    this.add.text(centerX, 280, `\u25C6 ${diamond}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
      align: 'center',
    }).setOrigin(0.5);

    // ── 최고 기록 표시 ──
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

    // ── GAME START 버튼 (골드 프라이머리, 대비를 위해 어두운 텍스트) ──
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
      // 게임 시작 전 메뉴 BGM 정지
      const sm = this.registry.get('soundManager');
      if (sm) {
        sm.stopBgm(false);
      }
      this.scene.start('GameScene');
    });

    startBg.on('pointerover', () => startBg.setFillStyle(0xd4b440));
    startBg.on('pointerout', () => startBg.setFillStyle(BTN_PRIMARY));

    // ── COLLECTION 버튼 (퍼플 메타) ──
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

    // ── STATISTICS 버튼 (틸 백) ──
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

    // ── 음소거 토글 버튼 (활성: BTN_BACK 틸, 비활성: BTN_SELL 그레이) ──
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

      // 메뉴 BGM 재생
      sm.playBgm('menu');
    }
  }
}
