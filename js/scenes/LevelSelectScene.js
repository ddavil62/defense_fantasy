/**
 * @fileoverview 레벨(맵) 선택 씬(LevelSelectScene).
 * 선택된 월드의 6개 맵을 카드 목록으로 표시하고,
 * 해금된 맵의 START 버튼을 탭하면 GameScene으로 이동한다.
 */

import { GAME_WIDTH, GAME_HEIGHT, COLORS, BTN_PRIMARY } from '../config.js';
import { t } from '../i18n.js';
import { getWorldById } from '../data/worlds.js';
import { getMapById } from '../data/maps.js';

/**
 * 레벨 선택 화면 씬.
 * 월드 내 6개 맵의 해금 상태, 별점, 난이도를 카드로 표시한다.
 * @extends Phaser.Scene
 */
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  /**
   * WorldSelectScene에서 전달된 월드 ID를 수신한다.
   * @param {object} data - 전달 데이터
   * @param {string} data.worldId - 선택된 월드 ID
   */
  init(data) {
    /** @type {string} 현재 월드 ID */
    this.worldId = data.worldId;

    /** @type {object} 세이브 데이터 캐싱 (진행 상태 조회용) */
    this._saveData = this.registry.get('saveData') || {};
  }

  /**
   * 레벨 선택 UI를 생성한다.
   * 헤더(뒤로가기 + 월드 이름) + 6개 맵 카드를 배치한다.
   */
  create() {
    const centerX = GAME_WIDTH / 2;
    const world = getWorldById(this.worldId);
    if (!world) {
      // 월드를 찾지 못하면 WorldSelectScene으로 복귀
      this.scene.start('WorldSelectScene');
      return;
    }

    // ── 배경 ──
    this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // ── 헤더 (Y 0~50) ──
    this.add.rectangle(centerX, 25, GAME_WIDTH, 50, 0x0a0820);
    this.add.rectangle(centerX, 50, GAME_WIDTH, 1, 0xffd700).setAlpha(0.4);

    // 뒤로가기 버튼 (좌측)
    const backText = this.add.text(30, 25, t('ui.back'), {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#1a9c7e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backText.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WorldSelectScene');
      });
    });

    // 월드 이름 (중앙)
    this.add.text(centerX, 25, t(world.nameKey), {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── 6개 맵 카드 (Y 58~, 각 90px 높이, 간격 5px) ──
    const cardW = 320;
    const cardH = 86;
    const gap = 5;
    const startY = 58;

    world.mapIds.forEach((mapId, index) => {
      const mapData = getMapById(mapId);
      if (!mapData) return;

      const unlocked = this._isMapUnlocked(index);
      const stars = this._getMapStars(mapId);
      const cardY = startY + index * (cardH + gap + 4) + cardH / 2;
      const cardLeft = centerX - cardW / 2 + 14;
      const cardRight = centerX + cardW / 2 - 14;

      // 카드 배경 (이미지 또는 폴백 사각형)
      const cardBg = this.textures.exists('panel_level_card')
        ? this.add.image(centerX, cardY, 'panel_level_card')
        : this.add.rectangle(centerX, cardY, cardW, cardH, 0x0a0820);

      if (unlocked) {
        // ── 해금 카드 ──
        // Image에는 setStrokeStyle이 없으므로 Rectangle 폴백에만 적용
        if (cardBg instanceof Phaser.GameObjects.Rectangle) {
          cardBg.setStrokeStyle(2, BTN_PRIMARY);
        }

        // 좌측 상단: 맵 번호
        this.add.text(cardLeft, cardY - cardH / 2 + 10, `${index + 1}`, {
          fontSize: '22px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffd700',
          fontStyle: 'bold',
        }).setOrigin(0, 0);

        // 좌측 중단: 맵 이름
        this.add.text(cardLeft, cardY - cardH / 2 + 38, t(mapData.meta.nameKey), {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
        }).setOrigin(0, 0);

        // 좌측 하단: 맵 설명
        this.add.text(cardLeft, cardY - cardH / 2 + 58, t(mapData.meta.descKey), {
          fontSize: '11px',
          fontFamily: 'Arial, sans-serif',
          color: '#636e72',
        }).setOrigin(0, 0);

        // 우측 상단: 별점 표시 (이미지 아이콘 또는 유니코드 폴백)
        const hasStarIcons = this.textures.exists('icon_star_filled') && this.textures.exists('icon_star_empty');
        if (hasStarIcons) {
          for (let si = 0; si < 3; si++) {
            const starKey = si < stars ? 'icon_star_filled' : 'icon_star_empty';
            this.add.image(cardRight - (2 - si) * 16 - 8, cardY - cardH / 2 + 18, starKey)
              .setDisplaySize(14, 14);
          }
        } else {
          let starDisplay = '';
          for (let si = 0; si < 3; si++) {
            starDisplay += si < stars ? '\u2605' : '\u2606';
          }
          this.add.text(cardRight, cardY - cardH / 2 + 10, starDisplay, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: stars > 0 ? '#ffd700' : '#333340',
          }).setOrigin(1, 0);
        }

        // 우측 중단: 웨이브 수
        const totalW = isFinite(mapData.totalWaves) ? mapData.totalWaves : '?';
        this.add.text(cardRight, cardY - cardH / 2 + 32, `Wave: ${totalW}`, {
          fontSize: '11px',
          fontFamily: 'Arial, sans-serif',
          color: '#b2bec3',
        }).setOrigin(1, 0);

        // 우측 중하단: 난이도 점 (difficulty 수만큼 채워진 원, 최대 3개)
        const diffGfx = this.add.graphics();
        const dotStartX = cardRight - 30;
        const dotY = cardY - cardH / 2 + 50;
        for (let d = 0; d < 3; d++) {
          if (d < mapData.meta.difficulty) {
            diffGfx.fillStyle(0xffd700, 1);
          } else {
            diffGfx.fillStyle(0x333340, 1);
          }
          diffGfx.fillCircle(dotStartX + d * 12, dotY, 4);
        }

        // 하단 우측: START 버튼 (소형 80x26)
        const btnW = 80;
        const btnH = 26;
        const btnX = cardRight - btnW / 2;
        const btnY = cardY + cardH / 2 - btnH / 2 - 4;

        const startBg = this._createImageButton(
          btnX, btnY, 'btn_small_primary', btnW, btnH, BTN_PRIMARY, 0xffd700
        );

        this.add.text(btnX, btnY, t('ui.start'), {
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          color: '#1a1a2e',
          fontStyle: 'bold',
        }).setOrigin(0.5);

        startBg.on('pointerdown', () => {
          this.cameras.main.fadeOut(200, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            const sm = this.registry.get('soundManager');
            if (sm) sm.stopBgm(false);
            this.scene.start('GameScene', {
              mapData: mapData,
              gameMode: 'campaign',
            });
          });
        });
      } else {
        // ── 잠금 카드 ──
        // Image에는 setStrokeStyle이 없으므로 Rectangle 폴백에만 적용
        if (cardBg instanceof Phaser.GameObjects.Rectangle) {
          cardBg.setStrokeStyle(1, 0x4a4a5a);
        }

        // 기본 카드 정보 표시 (흐릿하게)
        this.add.text(cardLeft, cardY - cardH / 2 + 10, `${index + 1}`, {
          fontSize: '22px',
          fontFamily: 'Arial, sans-serif',
          color: '#333340',
          fontStyle: 'bold',
        }).setOrigin(0, 0);

        this.add.text(cardLeft, cardY - cardH / 2 + 38, t(mapData.meta.nameKey), {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          color: '#333340',
        }).setOrigin(0, 0);

        // 반투명 검정 오버레이
        this.add.rectangle(centerX, cardY, cardW, cardH, 0x000000).setAlpha(0.55);

        // 카드 중앙: 잠금 아이콘 (이미지 또는 유니코드 폴백)
        if (this.textures.exists('icon_lock')) {
          this.add.image(centerX, cardY, 'icon_lock').setDisplaySize(20, 20);
        } else {
          this.add.text(centerX, cardY, '\uD83D\uDD12', {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: '#636e72',
          }).setOrigin(0.5);
        }
      }
    });
  }

  // ── 이미지 버튼 생성 헬퍼 ────────────────────────────────────

  /**
   * 이미지 에셋이 존재하면 이미지 버튼을, 없으면 기존 rectangle 폴백을 생성한다.
   * @param {number} x - 중심 X
   * @param {number} y - 중심 Y
   * @param {string} textureBase - 텍스처 기본 키
   * @param {number} w - 폴백 너비
   * @param {number} h - 폴백 높이
   * @param {number} fillColor - 폴백 채우기 색상
   * @param {number} strokeColor - 폴백 테두리 색상
   * @returns {Phaser.GameObjects.Image|Phaser.GameObjects.Rectangle}
   * @private
   */
  _createImageButton(x, y, textureBase, w, h, fillColor, strokeColor) {
    const normalKey = `${textureBase}_normal`;
    const pressedKey = `${textureBase}_pressed`;

    if (this.textures.exists(normalKey)) {
      const btn = this.add.image(x, y, normalKey)
        .setInteractive({ useHandCursor: true });
      if (this.textures.exists(pressedKey)) {
        btn.on('pointerdown', () => btn.setTexture(pressedKey));
        btn.on('pointerup', () => btn.setTexture(normalKey));
        btn.on('pointerout', () => btn.setTexture(normalKey));
      }
      return btn;
    }

    return this.add.rectangle(x, y, w, h, fillColor)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, strokeColor);
  }

  // ── 진행 데이터 조회 (세이브 기반) ────────────────────────────

  /**
   * 맵 해금 여부를 세이브 데이터 기반으로 판정한다.
   * 첫 번째 맵(index 0)은 항상 해금, 이후 맵은 이전 맵의 stars >= 1 필요.
   * @param {number} mapIndex - 월드 내 맵 인덱스 (0~5)
   * @returns {boolean} 해금 여부
   * @private
   */
  _isMapUnlocked(mapIndex) {
    if (mapIndex === 0) return true;

    const world = getWorldById(this.worldId);
    if (!world) return false;

    const prevMapId = world.mapIds[mapIndex - 1];
    const prevMapEntry = this._saveData.worldProgress?.[prevMapId];
    return (prevMapEntry?.stars || 0) >= 1;
  }

  /**
   * 맵의 획득 별점을 세이브 데이터에서 조회한다.
   * @param {string} mapId - 맵 ID
   * @returns {number} 별점 (0~3)
   * @private
   */
  _getMapStars(mapId) {
    return this._saveData.worldProgress?.[mapId]?.stars || 0;
  }
}
