/**
 * @fileoverview 월드 선택 씬(WorldSelectScene).
 * 5개 월드 패널을 세로 목록으로 표시하고, 해금된 월드를 탭하면
 * LevelSelectScene으로 이동한다. 다크 판타지 테마.
 */

import { GAME_WIDTH, GAME_HEIGHT, COLORS, BTN_BACK } from '../config.js';
import { t } from '../i18n.js';
import { WORLDS } from '../data/worlds.js';

// ── 월드별 테마 강조색 (해금 패널 stroke 색상) ──────────────────
const WORLD_ACCENT = {
  forest: 0x2ecc71,
  desert: 0xe67e22,
  tundra: 0x74b9ff,
  volcano: 0xe17055,
  shadow: 0x9b59b6,
};

/**
 * 월드 선택 화면 씬.
 * 5개 월드 패널을 표시하고, 해금/잠금 상태에 따라 스타일을 분기한다.
 * @extends Phaser.Scene
 */
export class WorldSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldSelectScene' });
  }

  /**
   * 월드 선택 UI를 생성한다.
   * 헤더(뒤로가기 + 타이틀) + 5개 월드 패널을 배치한다.
   */
  create() {
    const centerX = GAME_WIDTH / 2;

    // ── 배경 ──
    this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // ── 헤더 (Y 0~50) ──
    this.add.rectangle(centerX, 25, GAME_WIDTH, 50, 0x0a0820);
    // 하단 골드 구분선
    this.add.rectangle(centerX, 50, GAME_WIDTH, 1, 0xffd700).setAlpha(0.4);

    // 뒤로가기 버튼 (좌측)
    const backText = this.add.text(30, 25, t('ui.back'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#1a9c7e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backText.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });

    // 타이틀 (중앙)
    this.add.text(centerX, 25, t('ui.worldSelect'), {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── 5개 월드 패널 (Y 58~, 각 88px 높이, 간격 10px) ──
    const panelW = 320;
    const panelH = 88;
    const gap = 10;
    const startY = 58;

    WORLDS.forEach((world, index) => {
      const progress = this._getWorldProgress(world.id);
      const panelY = startY + index * (panelH + gap) + panelH / 2;
      const accent = WORLD_ACCENT[world.id] || 0xffd700;

      // 패널 배경 (이미지 또는 월드 테마 색상 폴백)
      const bg = this.textures.exists('panel_world_card')
        ? this.add.image(centerX, panelY, 'panel_world_card')
        : this.add.rectangle(centerX, panelY, panelW, panelH, world.theme.bg);

      if (progress.unlocked) {
        // ── 해금 패널 ──
        // Image에는 setStrokeStyle이 없으므로 Rectangle 폴백에만 적용
        if (bg instanceof Phaser.GameObjects.Rectangle) {
          bg.setStrokeStyle(2, accent);
        }
        bg.setInteractive({ useHandCursor: true });

        // 호버 효과
        bg.on('pointerover', () => bg.setAlpha(0.85));
        bg.on('pointerout', () => bg.setAlpha(1));

        // 탭 시 LevelSelectScene 이동 (페이드아웃 후)
        bg.on('pointerdown', () => {
          this.cameras.main.fadeOut(200, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('LevelSelectScene', { worldId: world.id });
          });
        });

        // 좌측 상단: 월드 번호 + 이름 (골드)
        const panelLeft = centerX - panelW / 2 + 14;
        const panelRight = centerX + panelW / 2 - 14;

        this.add.text(panelLeft, panelY - panelH / 2 + 14, `${world.order}. ${t(world.nameKey)}`, {
          fontSize: '16px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#ffd700',
          fontStyle: 'bold',
        }).setOrigin(0, 0);

        // 좌측 하단: 설명 텍스트
        this.add.text(panelLeft, panelY - panelH / 2 + 56, t(world.descKey), {
          fontSize: '12px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#b2bec3',
        }).setOrigin(0, 0.5);

        // 우측 상단: 별점 진행도
        const starsText = t('ui.starsProgress')
          .replace('{current}', String(progress.stars))
          .replace('{max}', String(progress.maxStars));
        this.add.text(panelRight, panelY - panelH / 2 + 14, `\u2605 ${starsText}`, {
          fontSize: '12px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#ffd700',
        }).setOrigin(1, 0);
      } else {
        // ── 잠금 패널 ──
        // Image에는 setStrokeStyle이 없으므로 Rectangle 폴백에만 적용
        if (bg instanceof Phaser.GameObjects.Rectangle) {
          bg.setStrokeStyle(1, 0x4a4a5a);
        }
        bg.setAlpha(0.5);

        const panelLeft = centerX - panelW / 2 + 14;
        const panelRight = centerX + panelW / 2 - 14;

        // 좌측 상단: 월드 번호 + 이름 (회색)
        this.add.text(panelLeft, panelY - panelH / 2 + 14, `${world.order}. ${t(world.nameKey)}`, {
          fontSize: '16px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#636e72',
          fontStyle: 'bold',
        }).setOrigin(0, 0);

        // 좌측 하단: 설명 텍스트
        this.add.text(panelLeft, panelY - panelH / 2 + 56, t(world.descKey), {
          fontSize: '12px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#636e72',
        }).setOrigin(0, 0.5);

        // 우측 상단: 별점 진행도 (회색)
        const starsText = t('ui.starsProgress')
          .replace('{current}', String(progress.stars))
          .replace('{max}', String(progress.maxStars));
        this.add.text(panelRight, panelY - panelH / 2 + 14, `\u2605 ${starsText}`, {
          fontSize: '12px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#636e72',
        }).setOrigin(1, 0);

        // 우측 중앙: 잠금 아이콘 (이미지 또는 유니코드 폴백)
        if (this.textures.exists('icon_lock')) {
          this.add.image(panelRight - 10, panelY - panelH / 2 + 35, 'icon_lock')
            .setDisplaySize(20, 20);
        } else {
          this.add.text(panelRight, panelY - panelH / 2 + 35, '\uD83D\uDD12', {
            fontSize: '20px',
            fontFamily: 'Galmuri11, Arial, sans-serif',
            color: '#636e72',
          }).setOrigin(1, 0.5);
        }

        // 우측 하단: 별 N개 필요 문구
        const reqText = t('ui.starsRequired').replace('{n}', String(world.requiredStars));
        this.add.text(panelRight, panelY - panelH / 2 + 56, reqText, {
          fontSize: '11px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#636e72',
        }).setOrigin(1, 0.5);
      }
    });
  }

  // ── 진행 데이터 조회 (세이브 기반) ────────────────────────────

  /**
   * 월드 진행 상태를 세이브 데이터 기반으로 조회한다.
   * @param {string} worldId - 월드 ID
   * @returns {{ unlocked: boolean, stars: number, maxStars: number }} 진행 상태
   * @private
   */
  _getWorldProgress(worldId) {
    const saveData = this.registry.get('saveData');
    const world = WORLDS.find(w => w.id === worldId);

    if (!world) {
      return { unlocked: false, stars: 0, maxStars: 18 };
    }

    // forest(requiredStars=0)는 항상 해금, 나머지는 누적 별점 조건 판정
    const unlocked = world.requiredStars === 0
      || (saveData?.campaignStats?.totalStars || 0) >= world.requiredStars;

    const stars = _calcWorldStars(world, saveData?.worldProgress || {});

    return {
      unlocked,
      stars,
      maxStars: world.mapIds.length * 3,
    };
  }
}

/**
 * 월드 내 전체 맵의 획득 별점을 합산한다.
 * @param {import('../data/worlds.js').WorldData} world - 월드 데이터
 * @param {Object<string, {cleared: boolean, stars: number}>} worldProgress - 맵별 진행 상태
 * @returns {number} 별점 합산
 * @private
 */
function _calcWorldStars(world, worldProgress) {
  let total = 0;
  for (const mapId of world.mapIds) {
    total += worldProgress[mapId]?.stars || 0;
  }
  return total;
}
