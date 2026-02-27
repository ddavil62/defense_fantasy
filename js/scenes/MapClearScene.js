/**
 * @fileoverview 맵 클리어 결과 씬(MapClearScene).
 * 캠페인 모드에서 모든 웨이브를 클리어했을 때 표시된다.
 * 별점(1~3성) 애니메이션, 다이아몬드 보상, NEXT MAP / WORLD MAP 버튼을 제공한다.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, VISUALS,
  calcStarRating, CAMPAIGN_DIAMOND_REWARDS,
  BTN_PRIMARY, BTN_BACK, BTN_DANGER,
  SAVE_KEY, migrateSaveData, TOWER_UNLOCK_MAP, TOWER_STATS,
} from '../config.js';
import { t } from '../i18n.js';
import { getNextMapId, WORLDS } from '../data/worlds.js';
import { getMapById } from '../data/maps.js';

/**
 * 맵 클리어 결과를 표시하는 씬.
 * GameScene에서 mapClear 이벤트 발생 시 전환된다.
 * @extends Phaser.Scene
 */
export class MapClearScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapClearScene' });
  }

  /**
   * GameScene에서 전달된 클리어 데이터를 수신한다.
   * @param {object} data - 클리어 데이터
   * @param {number} data.currentHP - 클리어 시점 HP
   * @param {number} data.maxHP - 최대 HP
   * @param {number} data.wavesCleared - 클리어한 웨이브 수
   * @param {number} data.kills - 총 킬 수
   * @param {object} data.gameStats - 게임 통계
   * @param {import('../data/maps.js').MapData} data.mapData - 맵 데이터
   * @param {string} data.gameMode - 게임 모드
   */
  init(data) {
    /** @type {number} 클리어 시점 HP */
    this.currentHP = data.currentHP || 1;

    /** @type {number} 최대 HP */
    this.maxHP = data.maxHP || 20;

    /** @type {number} 클리어한 웨이브 수 */
    this.wavesCleared = data.wavesCleared || 0;

    /** @type {number} 총 킬 수 */
    this.kills = data.kills || 0;

    /** @type {object} 게임 통계 */
    this.gameStats = data.gameStats || {};

    /** @type {import('../data/maps.js').MapData} 맵 데이터 */
    this.mapData = data.mapData;

    /** @type {string} 게임 모드 */
    this.gameMode = data.gameMode || 'campaign';
  }

  /**
   * 맵 클리어 UI를 생성한다.
   * 별점 계산 → 애니메이션 → 보상 표시 → 버튼 배치
   */
  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // 별점 계산
    const stars = calcStarRating(this.currentHP, this.maxHP);

    // ── 세이브 처리: 진행 상태 갱신 + 다이아몬드 차액 보상 ──
    const saveData = this._loadSave();
    const mapId = this.mapData.id;
    const prevStars = saveData.worldProgress[mapId]?.stars || 0;

    // 차액 보상: 이전 별점보다 높을 때만 차이분 지급
    const earnedDiamond = Math.max(0,
      (CAMPAIGN_DIAMOND_REWARDS[stars] || 0) - (CAMPAIGN_DIAMOND_REWARDS[prevStars] || 0));

    // worldProgress 갱신 (최고 별점 유지)
    saveData.worldProgress[mapId] = {
      cleared: true,
      stars: Math.max(prevStars, stars),
    };

    // 다이아몬드 지급
    saveData.diamond += earnedDiamond;
    saveData.totalDiamondEarned += earnedDiamond;

    // campaignStats 갱신
    if (prevStars === 0) {
      saveData.campaignStats.mapsCleared++;
    }
    if (stars > prevStars) {
      saveData.campaignStats.totalStars += (stars - prevStars);
    }

    // 엔드리스 해금 체크: 30개 맵 전부 cleared === true
    const allMapIds = WORLDS.flatMap(w => w.mapIds);
    const clearedCount = allMapIds.filter(
      id => saveData.worldProgress[id]?.cleared === true
    ).length;
    if (clearedCount >= allMapIds.length) {
      saveData.endlessUnlocked = true;
    }

    // worldsCleared 갱신: 각 월드의 6개 mapIds 전부 cleared인 월드 수
    saveData.campaignStats.worldsCleared = WORLDS.filter(w =>
      w.mapIds.every(id => saveData.worldProgress[id]?.cleared === true)
    ).length;

    // 타워 해금 체크: 방금 클리어한 맵이 속한 월드가 전부 클리어되었는지 확인
    this._newlyUnlockedTower = null;
    const currentWorld = WORLDS.find(w => w.mapIds.includes(mapId));
    if (currentWorld) {
      const worldCleared = currentWorld.mapIds.every(
        id => saveData.worldProgress[id]?.cleared === true
      );
      const rewardTower = TOWER_UNLOCK_MAP[currentWorld.id];
      if (worldCleared && rewardTower && !saveData.unlockedTowers.includes(rewardTower)) {
        saveData.unlockedTowers.push(rewardTower);
        this._newlyUnlockedTower = rewardTower;
      }
    }

    // 세이브 저장 + 레지스트리 갱신
    this._saveToDB(saveData);
    this.registry.set('saveData', saveData);

    // ── 어두운 오버레이 ──
    this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.85);

    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // ── 결과 패널 ──
    const panelW = 280;
    const panelH = 400;
    this.add.rectangle(centerX, centerY, panelW, panelH, 0x0a0820)
      .setStrokeStyle(2, 0xffd700);

    // ── MAP CLEAR 타이틀 (골드 글로우) ──
    this.add.text(centerX, centerY - 175, t('ui.mapClear'), {
      fontSize: '26px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
      shadow: {
        offsetX: 0, offsetY: 0,
        color: '#ffd700', blur: 16, fill: true,
      },
    }).setOrigin(0.5);

    // 구분선
    this.add.rectangle(centerX, centerY - 148, panelW - 40, 1, 0xffd700)
      .setAlpha(0.4);

    // ── 별점 표시 (순차 애니메이션) ──
    const starY = centerY - 110;
    const starSpacing = 50;
    const starStartX = centerX - starSpacing;

    for (let i = 0; i < 3; i++) {
      const x = starStartX + i * starSpacing;
      const filled = i < stars;
      const starText = this.add.text(x, starY, '\u2605', {
        fontSize: '36px',
        fontFamily: 'Arial, sans-serif',
        color: filled ? '#ffd700' : '#333340',
        fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0).setScale(0.3);

      // 순차 팝업 애니메이션 (0.3초 간격)
      this.tweens.add({
        targets: starText,
        alpha: 1,
        scale: 1,
        duration: 400,
        delay: 300 + i * 300,
        ease: 'Back.easeOut',
      });

      // 채워진 별은 반짝임 효과 추가
      if (filled) {
        this.tweens.add({
          targets: starText,
          scale: { from: 1, to: 1.15 },
          duration: 600,
          delay: 300 + i * 300 + 400,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    // ── 웨이브/킬 수 ──
    const infoY = centerY - 55;
    this.add.text(centerX, infoY,
      `Waves: ${this.wavesCleared}  |  Kills: ${this.kills}`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#b2bec3',
      }).setOrigin(0.5);

    // HP 잔량
    const hpPercent = Math.round((this.currentHP / this.maxHP) * 100);
    this.add.text(centerX, infoY + 22,
      `HP: ${this.currentHP}/${this.maxHP} (${hpPercent}%)`, {
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        color: hpPercent >= 80 ? '#ffd700' : hpPercent >= 40 ? '#fdcb6e' : '#ff4757',
      }).setOrigin(0.5);

    // ── 다이아몬드 보상 ──
    const diamondY = centerY + 5;
    if (earnedDiamond > 0) {
      // 차액 보상이 있는 경우 표시
      const diamondText = this.add.text(centerX, diamondY,
        `\u25C6 +${earnedDiamond} Diamond`, {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: COLORS.DIAMOND_CSS,
          fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0);

      // 별점 애니메이션 이후에 페이드인
      this.tweens.add({
        targets: diamondText,
        alpha: 1,
        duration: 400,
        delay: 1400,
        ease: 'Power2',
      });
    } else if (prevStars > 0) {
      // 재클리어인데 차액이 없는 경우 "이미 최고 기록" 표시
      const alreadyText = this.add.text(centerX, diamondY,
        t('ui.alreadyBest'), {
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          color: '#636e72',
        }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: alreadyText,
        alpha: 1,
        duration: 400,
        delay: 1400,
        ease: 'Power2',
      });
    }

    // ── 타워 해금 알림 ──
    if (this._newlyUnlockedTower) {
      const towerName = t(`tower.${this._newlyUnlockedTower}.name`);
      const unlockLabel = this.add.text(centerX, diamondY + 28,
        `🔓 ${towerName} ${t('ui.towerUnlocked')}`, {
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          color: '#00b894',
          fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0).setScale(0.5);

      this.tweens.add({
        targets: unlockLabel,
        alpha: 1,
        scale: 1,
        duration: 500,
        delay: 1800,
        ease: 'Back.easeOut',
      });
    }

    // ── 별점 등급 텍스트 ──
    const ratingTexts = ['', t('ui.rating1'), t('ui.rating2'), t('ui.rating3')];
    this.add.text(centerX, centerY + 40, ratingTexts[stars] || '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: stars === 3 ? '#ffd700' : stars === 2 ? '#fdcb6e' : '#b2bec3',
    }).setOrigin(0.5);

    // ── NEXT MAP 버튼 ──
    const nextY = centerY + 85;
    const nextMapId = getNextMapId(this.mapData.id);
    const nextBg = this.add.rectangle(centerX, nextY, 160, 40, BTN_PRIMARY)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffd700);

    // 다음 맵이 있으면 NEXT MAP, 없으면 월드 클리어 텍스트
    const nextLabel = nextMapId ? t('ui.nextMap') : t('ui.worldComplete');
    this.add.text(centerX, nextY, nextLabel, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    nextBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (nextMapId) {
          // 같은 월드 내 다음 맵으로 이동
          this.scene.start('GameScene', {
            mapData: getMapById(nextMapId),
            gameMode: this.gameMode,
          });
        } else {
          // 월드 마지막 맵이면 WorldSelectScene으로 이동
          this.scene.start('WorldSelectScene');
        }
      });
    });
    nextBg.on('pointerover', () => nextBg.setFillStyle(0xd4b440));
    nextBg.on('pointerout', () => nextBg.setFillStyle(BTN_PRIMARY));

    // ── RETRY 버튼 ──
    const retryY = nextY + 48;
    const retryBg = this.add.rectangle(centerX, retryY, 160, 36, BTN_BACK)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x1a9c7e);

    this.add.text(centerX, retryY, 'RETRY', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    retryBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', {
          mapData: this.mapData,
          gameMode: this.gameMode,
        });
      });
    });
    retryBg.on('pointerover', () => retryBg.setFillStyle(0x1f7d6e));
    retryBg.on('pointerout', () => retryBg.setFillStyle(BTN_BACK));

    // ── WORLD MAP 버튼 ──
    const worldY = retryY + 44;
    const worldBg = this.add.rectangle(centerX, worldY, 160, 36, BTN_DANGER)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x636e72);

    this.add.text(centerX, worldY, t('ui.worldMap'), {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    worldBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WorldSelectScene');
      });
    });
    worldBg.on('pointerover', () => worldBg.setFillStyle(0xa52040));
    worldBg.on('pointerout', () => worldBg.setFillStyle(BTN_DANGER));
  }

  // ── 세이브 데이터 입출력 ─────────────────────────────────────────

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
