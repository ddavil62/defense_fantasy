/**
 * @fileoverview 게임 오버 씬(GameOverScene).
 * 게임 결과(라운드, 킬 수), 다이아몬드 보상을 표시하고,
 * 기록을 localStorage에 저장한 뒤 RETRY / MENU 버튼을 제공한다.
 * 광고 보고 부활 기능: 판당 1회, 이전에 부활하지 않은 경우에만 버튼 표시.
 *
 * 다크 패널 + 골드 테두리, GAME OVER 글로우, 골드 강조 수치,
 * 시맨틱 버튼 컬러 적용.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, VISUALS, SAVE_KEY,
  calcDiamondReward, migrateSaveData,
  BTN_PRIMARY, BTN_BACK, BTN_DANGER, BTN_PRIMARY_CSS, BTN_DANGER_CSS,
  ADMOB_REWARDED_REVIVE_ID, BTN_META,
} from '../config.js';
import { t } from '../i18n.js';

/** @const {number} 보관하는 최대 게임 히스토리 수 */
const MAX_HISTORY = 20;

/**
 * 게임 종료 후 결과를 표시하는 씬.
 * GameScene에서 전달받은 데이터(라운드, 킬, 게임 통계)를 기반으로
 * 기록 갱신, 다이아몬드 보상 계산, 누적 통계 업데이트를 수행한다.
 * @extends Phaser.Scene
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  /**
   * GameScene에서 전달된 데이터를 수신하여 인스턴스 변수에 저장한다.
   * @param {object} data - 게임 결과 데이터
   * @param {number} data.round - 도달한 라운드
   * @param {number} data.kills - 총 킬 수
   * @param {object} data.gameStats - 해당 판의 세부 통계
   * @param {import('../data/maps.js').MapData} [data.mapData] - 맵 데이터
   * @param {string} [data.gameMode] - 게임 모드
   * @param {boolean} [data.revived] - 이미 부활한 판인지 여부
   */
  init(data) {
    /** @type {number} 도달한 라운드 */
    this.round = data.round || 1;

    /** @type {number} 총 킬 수 */
    this.kills = data.kills || 0;

    /** @type {object} 해당 판 세부 통계 */
    this.gameStats = data.gameStats || {};

    /** @type {import('../data/maps.js').MapData|undefined} 맵 데이터 (RETRY 시 전달용) */
    this.mapData = data.mapData;

    /** @type {string|undefined} 게임 모드 (RETRY 시 전달용) */
    this.gameMode = data.gameMode;

    /** @type {boolean} 이미 부활한 판인지 여부 (true이면 부활 버튼 숨김) */
    this.revived = data.revived || false;
  }

  /**
   * 게임 오버 UI를 생성한다.
   * 세이브 데이터 로드 -> 기록 갱신 -> 다이아몬드 보상 -> 통계 업데이트 -> 저장 -> UI 렌더링
   */
  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // 어두운 오버레이
    this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(VISUALS.OVERLAY_ALPHA);

    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // ── 세이브 데이터 로드 및 기록 갱신 ──
    const saveData = this._loadSave();
    const isNewBest = this.round > saveData.bestRound;

    if (this.round > saveData.bestRound) {
      saveData.bestRound = this.round;
    }
    if (this.kills > saveData.bestKills) {
      saveData.bestKills = this.kills;
    }
    saveData.totalGames++;

    // ── 다이아몬드 보상 계산 ──
    const diamondEarned = calcDiamondReward(this.round);
    saveData.diamond = (saveData.diamond || 0) + diamondEarned;
    saveData.totalDiamondEarned = (saveData.totalDiamondEarned || 0) + diamondEarned;

    // 누적 통계 업데이트
    this._updateStats(saveData);

    this._saveToDB(saveData);

    // MenuScene에서 참조할 수 있도록 레지스트리 갱신
    this.registry.set('saveData', saveData);

    // ── 결과 패널 (이미지 또는 폴백 사각형) ──
    const isCampaign = this.gameMode === 'campaign';
    const canRevive = !this.revived;
    const panelW = 280;
    // 부활 버튼이 표시될 경우 패널 높이를 56px 확장
    const reviveExtra = canRevive ? 56 : 0;
    const panelH = (isCampaign ? 420 : 380) + reviveExtra;
    if (this.textures.exists('panel_result')) {
      this.add.image(centerX, centerY, 'panel_result');
    } else {
      this.add.rectangle(centerX, centerY, panelW, panelH, 0x0a0820)
        .setStrokeStyle(2, BTN_PRIMARY);
    }

    // ── GAME OVER 타이틀 (다크 레드 + 그림자 글로우) ──
    this.add.text(centerX, centerY - 165, 'GAME OVER', {
      fontSize: '28px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#c0392b',
      fontStyle: 'bold',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#c0392b',
        blur: 12,
        fill: true,
      },
    }).setOrigin(0.5);

    // 구분선 (골드 틴트)
    this.add.rectangle(centerX, centerY - 138, panelW - 40, 1, BTN_PRIMARY)
      .setAlpha(0.4);

    // ── 도달 라운드 (골드 강조) ──
    this.add.text(centerX - 40, centerY - 115, 'Round:', {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(1, 0.5);

    this.add.text(centerX - 34, centerY - 115, `${this.round}`, {
      fontSize: '22px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // ── 킬 수 (골드 강조) ──
    this.add.text(centerX - 40, centerY - 88, 'Kills:', {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(1, 0.5);

    this.add.text(centerX - 34, centerY - 88, `${this.kills}`, {
      fontSize: '20px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 최고 기록
    this.add.text(centerX, centerY - 60, `Best: Round ${saveData.bestRound}`, {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);

    // ── NEW BEST 표시 (골드 글로우 + 깜빡임 트윈) ──
    if (isNewBest) {
      const newBestText = this.add.text(centerX, centerY - 38, 'NEW BEST!', {
        fontSize: '18px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#ffd700',
          blur: 16,
          fill: true,
        },
      }).setOrigin(0.5);

      // 알파 0.3~1.0 반복으로 깜빡임 효과
      this.tweens.add({
        targets: newBestText,
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }

    // ── 게임 통계 요약 라인 ──
    const gs = this.gameStats;
    const statsY = centerY - 15;
    this.add.text(centerX, statsY,
      `Towers: ${gs.towersPlaced || 0}  |  Gold: ${gs.goldEarned || 0}`, {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#b2bec3',
      }).setOrigin(0.5);

    // 최다 킬 타워 표시
    const topTower = this._getTopKiller(gs.killsByTower || {});
    if (topTower) {
      this.add.text(centerX, statsY + 18,
        `Top Tower: ${topTower.name} (${topTower.kills} kills)`, {
          fontSize: '11px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#636e72',
        }).setOrigin(0.5);
    }

    // ── 다이아몬드 표시 (퍼플 강조) ──
    const diamondY = centerY + 20;
    if (diamondEarned > 0) {
      this.add.text(centerX, diamondY, `\u25C6 +${diamondEarned} Diamond`, {
        fontSize: '18px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: COLORS.DIAMOND_CSS,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(centerX, diamondY + 23, `(Total: \u25C6 ${saveData.diamond})`, {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
    } else {
      // 5라운드 미만 도달 시 다이아몬드 미지급 안내
      this.add.text(centerX, diamondY, 'R5+ for Diamond', {
        fontSize: '14px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
    }

    // ── 부활 버튼 (판당 1회, 이전에 부활하지 않은 경우에만 표시) ──
    // 부활 가능 시 버튼 영역만큼 아래로 밀어내기
    const hasReviveOption = !this.revived;
    const reviveOffset = hasReviveOption ? 28 : 0;

    if (hasReviveOption) {
      const reviveY = centerY + 58;
      this._createReviveButton(centerX, reviveY);
    }

    // ── RETRY 버튼 (대형 160x44로 표준화) ──
    const retryY = centerY + 75 + reviveOffset;
    const restartBg = this._createImageButton(
      centerX, retryY, 'btn_large_primary', 160, 44, BTN_PRIMARY, 0xffffff
    );

    this.add.text(centerX, retryY, 'RETRY', {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    restartBg.on('pointerdown', () => {
      // 광고 진행 중이면 씬 전환 차단
      const adManager = this.registry.get('adManager');
      if (adManager?.isBusy) return;
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', {
          mapData: this.mapData,
          gameMode: this.gameMode,
        });
      });
    });

    if (isCampaign) {
      // ── WORLD MAP 버튼 (중형 160x36, 캠페인 모드 전용) ──
      const worldMapY = retryY + 50;
      const worldMapBg = this._createImageButton(
        centerX, worldMapY, 'btn_medium_back', 160, 36, BTN_BACK, 0x1a9c7e
      );

      this.add.text(centerX, worldMapY, 'WORLD MAP', {
        fontSize: '15px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      worldMapBg.on('pointerdown', () => {
        // 광고 진행 중이면 씬 전환 차단
        const adManager = this.registry.get('adManager');
        if (adManager?.isBusy) return;
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('WorldSelectScene');
        });
      });

      // ── MENU 버튼 (중형 160x36으로 표준화) ──
      const menuY = worldMapY + 44;
      const menuBg = this._createImageButton(
        centerX, menuY, 'btn_medium_danger', 160, 36, BTN_DANGER, 0x636e72
      );

      this.add.text(centerX, menuY, 'MENU', {
        fontSize: '14px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      menuBg.on('pointerdown', () => {
        // 광고 진행 중이면 씬 전환 차단
        const adManager = this.registry.get('adManager');
        if (adManager?.isBusy) return;
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MenuScene');
        });
      });
    } else {
      // ── MENU 버튼 (중형 160x36, 엔드리스 모드) ──
      const menuY = retryY + 50;
      const menuBg = this._createImageButton(
        centerX, menuY, 'btn_medium_danger', 160, 36, BTN_DANGER, 0x636e72
      );

      this.add.text(centerX, menuY, 'MENU', {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      menuBg.on('pointerdown', () => {
        // 광고 진행 중이면 씬 전환 차단
        const adManager = this.registry.get('adManager');
        if (adManager?.isBusy) return;
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MenuScene');
        });
      });
    }
  }

  // ── 부활 버튼 ────────────────────────────────────────────────

  /**
   * "광고 보고 부활" 버튼을 생성한다.
   * 클릭 시 보상형 광고를 재생하고, 완료 시 GameScene을 현재 라운드에서 재개한다.
   * 광고 실패 시 안내 메시지를 표시하고 버튼을 재활성화한다.
   * @param {number} x - 버튼 중심 X
   * @param {number} y - 버튼 중심 Y
   * @private
   */
  _createReviveButton(x, y) {
    // 부활 버튼 (중형 160x36, 퍼플 메타 스타일)
    const reviveBg = this._createImageButton(
      x, y, 'btn_medium_meta', 160, 36, BTN_META, COLORS.DIAMOND
    );

    const reviveLabel = this.add.text(x, y, t('ui.ad.revive'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    /** @type {Phaser.GameObjects.Text|null} 광고 실패 안내 텍스트 */
    let failText = null;

    /** @type {boolean} 버튼 처리 중 여부 (중복 탭 방지) */
    let isProcessing = false;

    reviveBg.on('pointerdown', async () => {
      if (isProcessing) return;
      isProcessing = true;

      // 실패 메시지가 있으면 제거
      if (failText) {
        failText.destroy();
        failText = null;
      }

      // 로딩 상태 표시
      reviveLabel.setText(t('ui.ad.loading'));

      const adManager = this.registry.get('adManager');
      if (!adManager) {
        // AdManager가 없으면 바로 부활 처리 (Mock 동작과 동일)
        this._doRevive();
        return;
      }

      const result = await adManager.showRewarded(ADMOB_REWARDED_REVIVE_ID);

      // 씬 전환 후 콜백 진입 방지
      if (!this.scene.isActive('GameOverScene')) return;

      if (result.rewarded) {
        this._doRevive();
      } else {
        // 광고 실패: 안내 메시지 표시, 버튼 재활성화
        reviveLabel.setText(t('ui.ad.revive'));
        failText = this.add.text(x, y + 22, t('ui.ad.failed'), {
          fontSize: '11px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#e74c3c',
        }).setOrigin(0.5);
        isProcessing = false;
      }
    });
  }

  /**
   * 부활 처리: GameScene을 현재 라운드에서 재개한다.
   * revived: true 플래그와 startWave를 전달하여 GameScene에서
   * 기지 HP를 절반으로 설정하고 해당 웨이브부터 시작하게 한다.
   * @private
   */
  _doRevive() {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', {
        mapData: this.mapData,
        gameMode: this.gameMode,
        revived: true,
        startWave: this.round,
      });
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
      .setStrokeStyle(2, strokeColor);
  }

  /**
   * 이번 판의 통계를 누적 저장 데이터에 반영한다.
   * 킬 수, 보스 킬, 타워 배치 수, 골드 수입, 피해량, 웨이브 클리어 수를 합산하고
   * 적 유형별/타워 유형별 킬 수를 병합한다.
   * 게임 히스토리는 FIFO(선입선출) 방식으로 최대 MAX_HISTORY개까지 보관한다.
   * @param {object} saveData - 세이브 데이터 객체
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

    // 적 유형별 킬 수 병합
    for (const [type, count] of Object.entries(gs.killsByType || {})) {
      stats.killsByEnemyType[type] = (stats.killsByEnemyType[type] || 0) + count;
    }

    // 타워 유형별 킬 수 병합
    for (const [type, count] of Object.entries(gs.killsByTower || {})) {
      stats.killsByTowerType[type] = (stats.killsByTowerType[type] || 0) + count;
    }

    // 게임 히스토리 추가 (FIFO, 최대 20건)
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
   * 가장 많은 킬을 기록한 타워 유형을 찾는다.
   * @param {Object<string, number>} killsByTower - 타워 유형별 킬 수 맵
   * @returns {{ name: string, kills: number }|null} 최다 킬 타워 정보 또는 null
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
   * localStorage에서 세이브 데이터를 로드하고 마이그레이션한다.
   * @returns {object} 마이그레이션된 세이브 데이터
   * @private
   */
  _loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return migrateSaveData(JSON.parse(raw));
    } catch (e) {
      // localStorage 오류 시 무시
    }
    return migrateSaveData(null);
  }

  /**
   * 세이브 데이터를 localStorage에 저장한다.
   * @param {object} data - 저장할 세이브 데이터
   * @private
   */
  _saveToDB(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage 사용 불가 시 무시
    }
  }
}
