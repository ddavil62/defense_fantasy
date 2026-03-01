/**
 * @fileoverview 메인 메뉴 씬(MenuScene).
 * 게임 타이틀, 최고 기록, 다이아몬드 보유량을 표시하고
 * CAMPAIGN / ENDLESS(잠금) / COLLECTION / STATISTICS 버튼과 음소거 토글을 제공한다.
 *
 * 다크 판타지 테마: 골드 룬 라인, 별자리 장식, 타이틀 글로우,
 * 시맨틱 버튼 컬러, 퍼플 다이아몬드 표시.
 */

import { GAME_WIDTH, GAME_HEIGHT, COLORS, BTN_PRIMARY, BTN_META, BTN_BACK, BTN_SELL, BTN_META_CSS, BTN_BACK_CSS, BTN_SELL_CSS } from '../config.js';
import { CLASSIC_MAP } from '../data/maps.js';
import { t } from '../i18n.js';

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

    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(400, 0, 0, 0);

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

    // ── 레이아웃 오프셋 (콘텐츠 상단 여백 조정) ──
    const offsetY = -100;

    // ── 타이틀 텍스트 (골드 + 그림자 글로우) ──
    this.add.text(centerX, 190 + offsetY, 'Fantasy\nTower Defense', {
      fontSize: '28px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
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
    this.add.text(centerX, 280 + offsetY, `\u25C6 ${diamond}`, {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
      align: 'center',
    }).setOrigin(0.5);

    // ── 최고 기록 표시 ──
    if (saveData && saveData.bestRound > 0) {
      this.add.text(centerX, 315 + offsetY, `Best: Round ${saveData.bestRound}`, {
        fontSize: '18px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
        align: 'center',
      }).setOrigin(0.5);

      this.add.text(centerX, 338 + offsetY, `Kills: ${saveData.bestKills} | Games: ${saveData.totalGames}`, {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#b2bec3',
        align: 'center',
      }).setOrigin(0.5);
    }

    // ── CAMPAIGN 버튼 (골드 프라이머리, 대형 160x44) ──
    const campaignBg = this._createImageButton(
      centerX, 380 + offsetY, 'btn_large_primary',
      160, 44, BTN_PRIMARY, 0xffd700
    );

    this.add.text(centerX, 380 + offsetY, t('ui.campaign'), {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    campaignBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WorldSelectScene');
      });
    });

    // ── ENDLESS 버튼 (캠페인 전체 클리어 시 해금) ──
    const endlessUnlocked = this._isEndlessUnlocked(saveData);

    if (endlessUnlocked) {
      // 활성 상태: 골드 프라이머리 버튼 (대형 160x44로 표준화)
      const endlessBg = this._createImageButton(
        centerX, 435 + offsetY, 'btn_large_primary',
        160, 44, BTN_PRIMARY, 0xffd700
      );

      this.add.text(centerX, 435 + offsetY, t('ui.endless'), {
        fontSize: '15px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#1a1a2e',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      endlessBg.on('pointerdown', () => {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('EndlessMapSelectScene');
        });
      });
    } else {
      // 비활성 상태: 회색 잠금 버튼 (대형 disabled)
      this._createImageButton(
        centerX, 435 + offsetY, 'btn_large_disabled',
        160, 44, BTN_SELL, 0x636e72, true
      );

      this.add.text(centerX, 435 + offsetY, t('ui.endless'), {
        fontSize: '15px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // ENDLESS 하단 잠금 안내 텍스트
      this.add.text(centerX, 460 + offsetY, t('ui.endlessLocked'), {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
    }

    // ── COLLECTION 버튼 (퍼플 메타, 대형 160x44로 표준화) ──
    const collBg = this._createImageButton(
      centerX, 492 + offsetY, 'btn_large_meta',
      160, 44, BTN_META, COLORS.DIAMOND
    );

    this.add.text(centerX, 492 + offsetY, 'COLLECTION', {
      fontSize: '15px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: BTN_META_CSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    collBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('CollectionScene');
      });
    });

    // ── STATISTICS 버튼 (틸 백, 대형 160x44로 표준화) ──
    const statsBg = this._createImageButton(
      centerX, 544 + offsetY, 'btn_large_back',
      160, 44, BTN_BACK, 0x1a9c7e
    );

    this.add.text(centerX, 544 + offsetY, 'STATISTICS', {
      fontSize: '15px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    statsBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('StatsScene');
      });
    });

    // ── 음소거 토글 버튼 (소형 80x26, 활성: back 틸, 비활성: disabled 그레이) ──
    /** @type {import('../managers/SoundManager.js').SoundManager|null} */
    const sm = this.registry.get('soundManager');
    if (sm) {
      const isMuted = sm.muted;
      const muteTexKey = isMuted ? 'btn_small_disabled' : 'btn_small_back_normal';
      const muteBg = this._createImageButton(
        centerX, 596 + offsetY, isMuted ? 'btn_small_disabled' : 'btn_small_back',
        80, 26, isMuted ? BTN_SELL : BTN_BACK, isMuted ? 0x636e72 : 0x1a9c7e,
        false
      );

      const muteLabel = this.add.text(centerX, 596 + offsetY,
        isMuted ? '\u266A OFF' : '\u266A ON',
        {
          fontSize: '13px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: isMuted ? BTN_SELL_CSS : BTN_BACK_CSS,
          fontStyle: 'bold',
        }
      ).setOrigin(0.5);

      muteBg.on('pointerdown', () => {
        sm.setMuted(!sm.muted);
        const m = sm.muted;
        muteLabel.setText(m ? '\u266A OFF' : '\u266A ON');
        muteLabel.setColor(m ? BTN_SELL_CSS : BTN_BACK_CSS);
        // 음소거 상태에 따라 텍스처 전환
        if (this.textures.exists('btn_small_disabled') && this.textures.exists('btn_small_back_normal')) {
          muteBg.setTexture(m ? 'btn_small_disabled' : 'btn_small_back_normal');
        } else {
          muteBg.setFillStyle(m ? BTN_SELL : BTN_BACK);
          muteBg.setStrokeStyle(1, m ? 0x636e72 : 0x1a9c7e);
        }
      });

      // 메뉴 BGM 재생
      sm.playBgm('menu');
    }
  }

  // ── 이미지 버튼 생성 헬퍼 ────────────────────────────────────

  /**
   * 이미지 에셋이 존재하면 이미지 버튼을, 없으면 기존 rectangle 폴백을 생성한다.
   * pressed 상태의 텍스처 전환(pointerdown/up/out)도 자동 처리한다.
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @param {string} textureBase - 텍스처 기본 키 (e.g. 'btn_large_primary')
   * @param {number} w - 폴백 사각형 너비
   * @param {number} h - 폴백 사각형 높이
   * @param {number} fillColor - 폴백 사각형 채우기 색상
   * @param {number} strokeColor - 폴백 사각형 테두리 색상
   * @param {boolean} [isDisabled=false] - 비활성 버튼 여부 (인터랙티브 비설정)
   * @returns {Phaser.GameObjects.Image|Phaser.GameObjects.Rectangle} 생성된 버튼
   * @private
   */
  _createImageButton(x, y, textureBase, w, h, fillColor, strokeColor, isDisabled = false) {
    // disabled 텍스처는 '_normal'이 아닌 단일 키
    const isDisabledTexture = textureBase.endsWith('_disabled');
    const normalKey = isDisabledTexture ? textureBase : `${textureBase}_normal`;
    const pressedKey = isDisabledTexture ? textureBase : `${textureBase}_pressed`;

    if (this.textures.exists(normalKey)) {
      const btn = this.add.image(x, y, normalKey);
      if (!isDisabled) {
        btn.setInteractive({ useHandCursor: true });
        // pressed 상태 텍스처 전환
        if (this.textures.exists(pressedKey) && !isDisabledTexture) {
          btn.on('pointerdown', () => btn.setTexture(pressedKey));
          btn.on('pointerup', () => btn.setTexture(normalKey));
          btn.on('pointerout', () => btn.setTexture(normalKey));
        }
      }
      return btn;
    }

    // 이미지 폴백: 기존 rectangle 방식
    const rect = this.add.rectangle(x, y, w, h, fillColor)
      .setStrokeStyle(2, strokeColor);
    if (!isDisabled) {
      rect.setInteractive({ useHandCursor: true });
    }
    return rect;
  }

  // ── 엔드리스 해금 판정 ────────────────────────────────────────

  /**
   * 엔드리스 모드 해금 여부를 판정한다.
   * 세이브 데이터의 endlessUnlocked 플래그를 직접 확인한다.
   * (MapClearScene에서 30개 맵 전부 클리어 시 endlessUnlocked = true로 저장)
   * @param {object|null} saveData - 세이브 데이터
   * @returns {boolean} 해금 여부
   * @private
   */
  _isEndlessUnlocked(saveData) {
    return saveData?.endlessUnlocked === true;
  }
}
