/**
 * @fileoverview 게임 오버 씬(GameOverScene).
 * 게임 결과(라운드, 킬 수), 다이아몬드 보상을 표시하고,
 * 기록을 localStorage에 저장한 뒤 RETRY / MENU 버튼을 제공한다.
 *
 * 다크 패널 + 골드 테두리, GAME OVER 글로우, 골드 강조 수치,
 * 시맨틱 버튼 컬러 적용.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, VISUALS, SAVE_KEY,
  calcDiamondReward, migrateSaveData,
  BTN_PRIMARY, BTN_BACK, BTN_DANGER, BTN_PRIMARY_CSS, BTN_DANGER_CSS,
} from '../config.js';

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

    // ── 결과 패널 (어두운 보라+검정 배경, 골드 테두리) ──
    const isCampaign = this.gameMode === 'campaign';
    const panelW = 280;
    const panelH = isCampaign ? 420 : 380;
    this.add.rectangle(centerX, centerY, panelW, panelH, 0x0a0820)
      .setStrokeStyle(2, BTN_PRIMARY);

    // ── GAME OVER 타이틀 (다크 레드 + 그림자 글로우) ──
    this.add.text(centerX, centerY - 165, 'GAME OVER', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
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
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(1, 0.5);

    this.add.text(centerX - 34, centerY - 115, `${this.round}`, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // ── 킬 수 (골드 강조) ──
    this.add.text(centerX - 40, centerY - 88, 'Kills:', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(1, 0.5);

    this.add.text(centerX - 34, centerY - 88, `${this.kills}`, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 최고 기록
    this.add.text(centerX, centerY - 60, `Best: Round ${saveData.bestRound}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);

    // ── NEW BEST 표시 (골드 글로우 + 깜빡임 트윈) ──
    if (isNewBest) {
      const newBestText = this.add.text(centerX, centerY - 38, 'NEW BEST!', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
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
        fontFamily: 'Arial, sans-serif',
        color: '#b2bec3',
      }).setOrigin(0.5);

    // 최다 킬 타워 표시
    const topTower = this._getTopKiller(gs.killsByTower || {});
    if (topTower) {
      this.add.text(centerX, statsY + 18,
        `Top Tower: ${topTower.name} (${topTower.kills} kills)`, {
          fontSize: '11px',
          fontFamily: 'Arial, sans-serif',
          color: '#636e72',
        }).setOrigin(0.5);
    }

    // ── 다이아몬드 표시 (퍼플 강조) ──
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
      // 5라운드 미만 도달 시 다이아몬드 미지급 안내
      this.add.text(centerX, diamondY, 'R5+ for Diamond', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
    }

    // ── RETRY 버튼 (BTN_PRIMARY 골드) ──
    const retryY = centerY + 75;
    const restartBg = this.add.rectangle(centerX, retryY, 160, 40, BTN_PRIMARY)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff);

    this.add.text(centerX, retryY, 'RETRY', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    restartBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', {
          mapData: this.mapData,
          gameMode: this.gameMode,
        });
      });
    });

    restartBg.on('pointerover', () => restartBg.setFillStyle(0xd4b440));
    restartBg.on('pointerout', () => restartBg.setFillStyle(BTN_PRIMARY));

    if (isCampaign) {
      // ── WORLD MAP 버튼 (BTN_BACK 틸, 캠페인 모드 전용) ──
      const worldMapY = retryY + 50;
      const worldMapBg = this.add.rectangle(centerX, worldMapY, 160, 36, BTN_BACK)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x1a9c7e);

      this.add.text(centerX, worldMapY, 'WORLD MAP', {
        fontSize: '15px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      worldMapBg.on('pointerdown', () => {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('WorldSelectScene');
        });
      });

      worldMapBg.on('pointerover', () => worldMapBg.setFillStyle(0x1f7d6e));
      worldMapBg.on('pointerout', () => worldMapBg.setFillStyle(BTN_BACK));

      // ── MENU 버튼 (BTN_DANGER 레드, 작게) ──
      const menuY = worldMapY + 44;
      const menuBg = this.add.rectangle(centerX, menuY, 160, 30, BTN_DANGER)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x636e72);

      this.add.text(centerX, menuY, 'MENU', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      menuBg.on('pointerdown', () => {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MenuScene');
        });
      });

      menuBg.on('pointerover', () => menuBg.setFillStyle(0xa52040));
      menuBg.on('pointerout', () => menuBg.setFillStyle(BTN_DANGER));
    } else {
      // ── MENU 버튼 (BTN_DANGER 레드, 엔드리스 모드) ──
      const menuY = retryY + 50;
      const menuBg = this.add.rectangle(centerX, menuY, 160, 36, BTN_DANGER)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x636e72);

      this.add.text(centerX, menuY, 'MENU', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      menuBg.on('pointerdown', () => {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('MenuScene');
        });
      });

      menuBg.on('pointerover', () => menuBg.setFillStyle(0xa52040));
      menuBg.on('pointerout', () => menuBg.setFillStyle(BTN_DANGER));
    }
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
