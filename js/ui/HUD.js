/**
 * @fileoverview HUD - 게임 상단 정보 표시줄.
 * 웨이브 번호, 골드, 기지 HP를 표시하며, HP 위험 시 깜빡임 효과와
 * 웨이브 휴식 카운트다운 및 다음 웨이브 미리보기 점을 제공한다.
 */

import {
  GAME_WIDTH, HUD_HEIGHT, COLORS,
  HP_DANGER_THRESHOLD, HP_BLINK_INTERVAL,
  GOLD_TEXT_CSS, HP_DANGER_CSS, ENEMY_STATS,
  BTN_SELL,
} from '../config.js';
import { t } from '../i18n.js';

// ── 적 유형별 미리보기 색상 매핑 ──────────────────────────────

/** @const {Object<string, number>} 적 유형 키 -> 미리보기 점 색상 매핑 */
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

/**
 * 게임 상단 HUD 클래스.
 * 웨이브 번호, 골드 보유량, 기지 HP를 실시간으로 표시하고,
 * HP가 임계값 이하로 떨어지면 위험 깜빡임 효과를 재생한다.
 */
export class HUD {
  /**
   * HUD 인스턴스를 생성한다.
   * @param {Phaser.Scene} scene - HUD를 표시할 게임 씬
   */
  constructor(scene) {
    /** @type {Phaser.Scene} HUD가 속한 게임 씬 */
    this.scene = scene;

    /** @type {boolean} HP 깜빡임 현재 가시 상태 */
    this._hpBlinkVisible = true;

    /** @type {number} HP 깜빡임 누적 타이머 (ms) */
    this._hpBlinkTimer = 0;

    /** @type {number} 깜빡임 판정용 현재 HP */
    this._currentHP = 0;

    this._create();
  }

  // ── UI 요소 생성 ────────────────────────────────────────────

  /**
   * HUD의 시각적 요소(배경, 텍스트, 카운트다운, 프리뷰)를 생성한다.
   * @private
   */
  _create() {
    // 배경 바 - 이미지 에셋 또는 그라데이션 폴백
    if (this.scene.textures.exists('hud_bar_bg')) {
      this.bgImage = this.scene.add.image(GAME_WIDTH / 2, HUD_HEIGHT / 2, 'hud_bar_bg')
        .setDepth(30);
      this.bgGraphics = null;
    } else {
      this.bgGraphics = this.scene.add.graphics();
      this.bgGraphics.setDepth(30);
      const gradientSteps = 4;
      const stepH = HUD_HEIGHT / gradientSteps;
      for (let i = 0; i < gradientSteps; i++) {
        const alpha = 0.95 - (i * 0.12);
        this.bgGraphics.fillStyle(COLORS.HUD_BG, alpha);
        this.bgGraphics.fillRect(0, i * stepH, GAME_WIDTH, stepH);
      }
    }

    // 위험 상태 테두리 그래픽 (초기에는 숨김)
    this.dangerBorderGraphics = this.scene.add.graphics();
    this.dangerBorderGraphics.setDepth(32);
    this.dangerBorderGraphics.setAlpha(0);

    // 웨이브 아이콘 + 텍스트 (좌측, "Wave:" 접두사 생략하여 공간 절약)
    if (this.scene.textures.exists('icon_sword')) {
      this.waveIcon = this.scene.add.image(18, HUD_HEIGHT / 2, 'icon_sword')
        .setDisplaySize(14, 14).setDepth(31);
      this.waveText = this.scene.add.text(28, HUD_HEIGHT / 2, '1', {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0, 0.5).setDepth(31);
    } else {
      this.waveIcon = null;
      this.waveText = this.scene.add.text(10, HUD_HEIGHT / 2, '\u2694 1', {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0, 0.5).setDepth(31);
    }

    // 골드 아이콘 + 텍스트 (중앙)
    if (this.scene.textures.exists('icon_diamond')) {
      this.goldIcon = this.scene.add.image(103, HUD_HEIGHT / 2, 'icon_diamond')
        .setDisplaySize(14, 14).setDepth(31);
      this.goldText = this.scene.add.text(114, HUD_HEIGHT / 2, '200', {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: GOLD_TEXT_CSS,
      }).setOrigin(0, 0.5).setDepth(31);
    } else {
      this.goldIcon = null;
      this.goldText = this.scene.add.text(103, HUD_HEIGHT / 2, '\u25C6 200', {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: GOLD_TEXT_CSS,
      }).setOrigin(0, 0.5).setDepth(31);
    }

    // HP 아이콘 + 텍스트 (우측)
    if (this.scene.textures.exists('icon_heart')) {
      this.hpIcon = this.scene.add.image(175, HUD_HEIGHT / 2, 'icon_heart')
        .setDisplaySize(14, 14).setDepth(31);
      this.hpText = this.scene.add.text(186, HUD_HEIGHT / 2, '20', {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0, 0.5).setDepth(31);
    } else {
      this.hpIcon = null;
      this.hpText = this.scene.add.text(175, HUD_HEIGHT / 2, '\u2665 20', {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0, 0.5).setDepth(31);
    }

    // 카운트다운 텍스트 (웨이브 텍스트 아래, 휴식 시간에만 표시)
    this.countdownText = this.scene.add.text(10, HUD_HEIGHT + 4, '', {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0, 0).setDepth(31).setAlpha(0);

    // 다음 웨이브 미리보기 점 그래픽 (카운트다운 옆에 표시)
    this.previewGraphics = this.scene.add.graphics();
    this.previewGraphics.setDepth(31);
  }

  // ── 정보 갱신 메서드 ────────────────────────────────────────

  /**
   * 웨이브 번호 텍스트를 갱신한다.
   * total이 유한값이면 캠페인 모드 형식(X/Y), 아니면 엔드리스 형식(X)으로 표시한다.
   * 아이콘이 있으면 숫자만, 없으면 검 이모지(⚔) 접두사를 붙인다.
   * @param {number} round - 현재 라운드(웨이브) 번호
   * @param {number|null} [total=null] - 총 웨이브 수 (null 또는 Infinity면 엔드리스)
   */
  updateWave(round, total = null) {
    const prefix = this.waveIcon ? '' : '\u2694 ';
    if (total !== null && isFinite(total)) {
      this.waveText.setText(`${prefix}${round}/${total}`);
    } else {
      this.waveText.setText(`${prefix}${round}`);
    }
  }

  /**
   * 골드 표시 텍스트를 갱신한다.
   * @param {number} amount - 현재 보유 골드
   */
  updateGold(amount) {
    const prefix = this.goldIcon ? '' : '\u25C6 ';
    this.goldText.setText(`${prefix}${amount}`);
  }

  /**
   * HP 표시를 갱신하고, 위험 상태일 때 테두리 효과를 적용한다.
   * HP가 HP_DANGER_THRESHOLD 이하이면 빨간 테두리를 표시하고,
   * 그 이상이면 일반 상태로 복원한다.
   * @param {number} current - 현재 HP
   * @param {number} max - 최대 HP
   */
  updateHP(current, max) {
    this._currentHP = current;
    const prefix = this.hpIcon ? '' : '\u2665 ';
    this.hpText.setText(`${prefix}${current}`);

    if (current > HP_DANGER_THRESHOLD) {
      this.hpText.setColor('#ffffff');
      // HP가 안전 범위이면 위험 테두리 숨기기
      if (this.dangerBorderGraphics) {
        this.dangerBorderGraphics.setAlpha(0);
      }
    } else if (current > 0) {
      // HP가 낮을 때 위험 테두리 표시
      this._drawDangerBorder();
    }
  }

  /**
   * 타워 배치 카운트를 갱신한다 (현재 미사용, 인터페이스 유지용 no-op).
   * @param {number} _count - 현재 배치된 타워 수
   * @param {number} _max - 최대 배치 가능 타워 수
   */
  updateTowerCount(_count, _max) {
    // 상단 HUD 공간 부족으로 타워 카운트 표시 제거됨
  }

  /**
   * HUD에 빨간 발광 테두리를 그린다 (위험 상태 표시용).
   * @private
   */
  _drawDangerBorder() {
    if (!this.dangerBorderGraphics) return;
    this.dangerBorderGraphics.clear();
    // 2px 두께, 빨간색(#ff4757), 80% 불투명도의 테두리
    this.dangerBorderGraphics.lineStyle(2, 0xff4757, 0.8);
    this.dangerBorderGraphics.strokeRect(0, 0, GAME_WIDTH, HUD_HEIGHT);
    this.dangerBorderGraphics.setAlpha(1);
  }

  // ── 깜빡임 효과 ────────────────────────────────────────────

  /**
   * 낮은 HP 상태에서 텍스트와 테두리의 깜빡임 효과를 매 프레임 갱신한다.
   * HP_BLINK_INTERVAL마다 색상과 투명도를 토글한다.
   * @param {number} delta - 프레임 간 경과 시간 (초)
   */
  updateBlink(delta) {
    if (this._currentHP <= HP_DANGER_THRESHOLD && this._currentHP > 0) {
      this._hpBlinkTimer += delta * 1000;
      if (this._hpBlinkTimer >= HP_BLINK_INTERVAL) {
        this._hpBlinkTimer = 0;
        this._hpBlinkVisible = !this._hpBlinkVisible;
        this.hpText.setColor(this._hpBlinkVisible ? HP_DANGER_CSS : '#ffffff');
        // 위험 테두리 투명도를 펄스 효과로 토글 (1.0 <-> 0.4)
        if (this.dangerBorderGraphics) {
          this.dangerBorderGraphics.setAlpha(this._hpBlinkVisible ? 1 : 0.4);
        }
      }
    }
  }

  // ── 웨이브 카운트다운 & 미리보기 ────────────────────────────

  /**
   * 웨이브 사이 휴식 시간 카운트다운과 다음 웨이브 적 유형 미리보기를 갱신한다.
   * 휴식 시간이 아니면 카운트다운 텍스트를 숨긴다.
   * @param {number} breakTime - 남은 휴식 시간 (초, 0이면 휴식 아님)
   * @param {{ types: string[], isBoss: boolean }|null} preview - 다음 웨이브 미리보기 데이터
   */
  updateCountdown(breakTime, preview) {
    this.previewGraphics.clear();

    if (breakTime > 0 && preview) {
      const secs = Math.ceil(breakTime);
      this.countdownText.setText(`Next: ${secs}s`);
      this.countdownText.setAlpha(1);

      // 적 유형별 색상으로 미리보기 점 렌더링
      const startX = 70;
      const dotY = HUD_HEIGHT + 10;
      for (let i = 0; i < preview.types.length; i++) {
        const color = ENEMY_PREVIEW_COLORS[preview.types[i]] || 0xffffff;
        this.previewGraphics.fillStyle(color, 0.9);
        this.previewGraphics.fillCircle(startX + i * 14, dotY, 4);
      }

      // 보스 웨이브 표시 - 금색 원으로 강조
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

  // ── 정리 ────────────────────────────────────────────────────

  /**
   * HUD의 모든 게임 오브젝트를 파괴하여 메모리를 해제한다.
   */
  destroy() {
    if (this.bgGraphics) this.bgGraphics.destroy();
    if (this.bgImage) this.bgImage.destroy();
    if (this.dangerBorderGraphics) this.dangerBorderGraphics.destroy();
    if (this.waveIcon) this.waveIcon.destroy();
    if (this.waveText) this.waveText.destroy();
    if (this.goldIcon) this.goldIcon.destroy();
    if (this.goldText) this.goldText.destroy();
    if (this.hpIcon) this.hpIcon.destroy();
    if (this.hpText) this.hpText.destroy();
    if (this.countdownText) this.countdownText.destroy();
    if (this.previewGraphics) this.previewGraphics.destroy();
  }
}
