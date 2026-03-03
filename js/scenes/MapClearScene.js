/**
 * @fileoverview 맵 클리어 결과 씬(MapClearScene).
 * 캠페인 모드에서 모든 웨이브를 클리어했을 때 표시된다.
 * 별점(1~3성) 애니메이션, 다이아몬드 보상, NEXT MAP / WORLD MAP 버튼을 제공한다.
 * Phase 3: clearBoostActive 플래그 또는 사후 광고 시청으로 보상 2배 적용.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, VISUALS,
  calcStarRating, CAMPAIGN_DIAMOND_REWARDS,
  BTN_PRIMARY, BTN_BACK, BTN_DANGER, BTN_META, BTN_SELL,
  SAVE_KEY, migrateSaveData, TOWER_UNLOCK_MAP, TOWER_STATS,
  AD_CLEAR_BOOST_MULTIPLIER,
  AD_LIMIT_CLEAR_BOOST,
  ADMOB_REWARDED_CLEAR_BOOST_ID,
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
   * @param {boolean} [data.clearBoostActive=false] - 광고 클리어 보상 2배 활성 여부
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

    /** @type {boolean} 광고 클리어 보상 2배 활성 여부 */
    this.clearBoostActive = data.clearBoostActive || false;
  }

  /**
   * 맵 클리어 UI를 생성한다.
   * 별점 계산 -> 보상 계산 -> 세이브 저장(즉시 또는 광고 후 지연) ->
   * 애니메이션 -> 보상 표시 -> 버튼 배치
   */
  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // 별점 계산
    const stars = calcStarRating(this.currentHP, this.maxHP);

    // ── 보상 계산 (세이브는 아직 저장하지 않음 - 광고 시청 가능성 대기) ──
    const saveData = this._loadSave();
    const mapId = this.mapData.id;
    const prevStars = saveData.worldProgress[mapId]?.stars || 0;

    // 기본 차액 보상
    const baseDiamond = Math.max(0,
      (CAMPAIGN_DIAMOND_REWARDS[stars] || 0) - (CAMPAIGN_DIAMOND_REWARDS[prevStars] || 0));

    // 부스트 배율 적용
    const boostMultiplier = this.clearBoostActive ? AD_CLEAR_BOOST_MULTIPLIER : 1;

    /** @type {number} 최종 다이아몬드 보상 (부스트 포함) */
    this._earnedDiamond = baseDiamond * boostMultiplier;

    /** @type {number} 부스트 없는 기본 다이아몬드 보상 */
    this._baseDiamond = baseDiamond;

    /** @type {number} 별점 */
    this._stars = stars;

    /** @type {number} 이전 별점 */
    this._prevStars = prevStars;

    /** @type {boolean} 세이브 저장 완료 여부 */
    this._saved = false;

    // worldProgress 갱신 (최고 별점 유지)
    saveData.worldProgress[mapId] = {
      cleared: true,
      stars: Math.max(prevStars, stars),
    };

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

    // 세이브 데이터 참조 보관 (광고 시청 후 다이아몬드 갱신에 사용)
    this._saveData = saveData;

    // clearBoost가 이미 활성화되었거나 광고 한도가 이미 도달한 경우 즉시 세이브
    // 그렇지 않으면 광고 시청 가능성이 있으므로 세이브를 지연
    const adManager = this.registry.get('adManager');
    const adLimitReached = adManager ? adManager.isAdLimitReached('clearBoost') : true;

    if (this.clearBoostActive || baseDiamond <= 0 || adLimitReached) {
      // 즉시 세이브: 부스트가 이미 적용되었거나, 보상이 없거나, 광고 한도 초과
      this._applyDiamondAndSave(saveData, this._earnedDiamond);
    }

    // ── 어두운 오버레이 ──
    this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.85);

    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // ── 결과 패널 (이미지 또는 폴백 사각형) ──
    const panelW = 280;
    const panelH = 400;
    if (this.textures.exists('panel_result')) {
      this.add.image(centerX, centerY, 'panel_result');
    } else {
      this.add.rectangle(centerX, centerY, panelW, panelH, 0x0a0820)
        .setStrokeStyle(2, 0xffd700);
    }

    // ── MAP CLEAR 타이틀 (골드 글로우) ──
    this.add.text(centerX, centerY - 160, t('ui.mapClear'), {
      fontSize: '26px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
      shadow: {
        offsetX: 0, offsetY: 0,
        color: '#ffd700', blur: 16, fill: true,
      },
    }).setOrigin(0.5);

    // 구분선
    this.add.rectangle(centerX, centerY - 135, panelW - 40, 1, 0xffd700)
      .setAlpha(0.4);

    // ── 별점 표시 (순차 애니메이션) ──
    const starY = centerY - 100;
    const starSpacing = 50;
    const starStartX = centerX - starSpacing;

    for (let i = 0; i < 3; i++) {
      const x = starStartX + i * starSpacing;
      const filled = i < stars;

      // 별점: 이미지 아이콘 또는 유니코드 폴백
      const iconKey = filled ? 'icon_star_filled' : 'icon_star_empty';
      const starObj = this.textures.exists(iconKey)
        ? this.add.image(x, starY, iconKey).setDisplaySize(30, 30)
        : this.add.text(x, starY, '\u2605', {
            fontSize: '36px',
            fontFamily: 'Galmuri11, Arial, sans-serif',
            color: filled ? '#ffd700' : '#333340',
            fontStyle: 'bold',
          }).setOrigin(0.5);
      const starText = starObj;
      starText.setOrigin(0.5).setAlpha(0).setScale(0.3);

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
      t('mapclear.waves').replace('{waves}', this.wavesCleared).replace('{kills}', this.kills), {
        fontSize: '14px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#b2bec3',
      }).setOrigin(0.5);

    // HP 잔량
    const hpPercent = Math.round((this.currentHP / this.maxHP) * 100);
    this.add.text(centerX, infoY + 22,
      t('mapclear.hp').replace('{current}', this.currentHP).replace('{max}', this.maxHP).replace('{pct}', hpPercent), {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: hpPercent >= 80 ? '#ffd700' : hpPercent >= 40 ? '#fdcb6e' : '#ff4757',
      }).setOrigin(0.5);

    // ── 다이아몬드 보상 ──
    const diamondY = centerY + 5;
    if (this._earnedDiamond > 0) {
      // 차액 보상이 있는 경우 표시 (부스트 포함)
      /** @type {Phaser.GameObjects.Text} 다이아몬드 보상 텍스트 참조 (광고 후 갱신용) */
      const diamondStr = this.clearBoostActive
        ? t('mapclear.diamondBoosted').replace('{amount}', this._earnedDiamond)
        : t('mapclear.diamondEarned').replace('{amount}', this._earnedDiamond);
      this._diamondText = this.add.text(centerX, diamondY,
        diamondStr, {
          fontSize: '18px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: COLORS.DIAMOND_CSS,
          fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0);

      // 별점 애니메이션 이후에 페이드인
      this.tweens.add({
        targets: this._diamondText,
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
          fontFamily: 'Galmuri11, Arial, sans-serif',
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
        `\uD83D\uDD13 ${towerName} ${t('ui.towerUnlocked')}`, {
          fontSize: '16px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
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
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: stars === 3 ? '#ffd700' : stars === 2 ? '#fdcb6e' : '#b2bec3',
    }).setOrigin(0.5);

    // ── "보상 2배" 광고 버튼 (clearBoost 미적용 + 보상 있음 + 한도 미초과 시 표시) ──
    const hasAdButton = !this.clearBoostActive && baseDiamond > 0 && !adLimitReached;
    if (hasAdButton) {
      this._createClearBoostButton(centerX, centerY + 62);
    }

    // ── NEXT MAP 버튼 (대형 160x44로 표준화) ──
    // 광고 버튼이 있으면 아래로 밀어서 겹침 방지
    const nextY = hasAdButton ? centerY + 98 : centerY + 75;
    const nextMapId = getNextMapId(this.mapData.id);
    const nextBg = this._createImageButton(
      centerX, nextY, 'btn_large_primary', 160, 44, BTN_PRIMARY, 0xffd700
    );

    // 다음 맵이 있으면 NEXT MAP, 없으면 월드 클리어 텍스트
    const nextLabel = nextMapId ? t('ui.nextMap') : t('ui.worldComplete');
    this.add.text(centerX, nextY, nextLabel, {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    nextBg.on('pointerdown', () => {
      // 광고 진행 중이면 씬 전환 차단
      const adManager = this.registry.get('adManager');
      if (adManager?.isBusy) return;
      // 씬 전환 전에 아직 세이브하지 않았으면 저장
      this._ensureSaved();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (nextMapId) {
          this.scene.start('GameScene', {
            mapData: getMapById(nextMapId),
            gameMode: this.gameMode,
          });
        } else {
          this.scene.start('WorldSelectScene');
        }
      });
    });

    // ── RETRY 버튼 (중형 160x36) ──
    const retryY = nextY + 42;
    const retryBg = this._createImageButton(
      centerX, retryY, 'btn_medium_back', 160, 36, BTN_BACK, 0x1a9c7e
    );

    this.add.text(centerX, retryY, t('mapclear.retry'), {
      fontSize: '15px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    retryBg.on('pointerdown', () => {
      // 광고 진행 중이면 씬 전환 차단
      const adManager = this.registry.get('adManager');
      if (adManager?.isBusy) return;
      this._ensureSaved();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', {
          mapData: this.mapData,
          gameMode: this.gameMode,
        });
      });
    });

    // ── WORLD MAP 버튼 (중형 160x36) ──
    const worldY = retryY + 38;
    const worldBg = this._createImageButton(
      centerX, worldY, 'btn_medium_danger', 160, 36, BTN_DANGER, 0x636e72
    );

    this.add.text(centerX, worldY, t('ui.worldMap'), {
      fontSize: '15px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    worldBg.on('pointerdown', () => {
      // 광고 진행 중이면 씬 전환 차단
      const adManager = this.registry.get('adManager');
      if (adManager?.isBusy) return;
      this._ensureSaved();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('WorldSelectScene');
      });
    });
  }

  // ── 보상 2배 광고 버튼 ──────────────────────────────────────

  /**
   * "보상 2배" 보상형 광고 버튼을 생성한다.
   * clearBoostActive가 아직 false이고 보상이 있을 때만 표시된다.
   * 광고 완료 후 보상을 재계산하고 화면을 갱신한 뒤 버튼을 숨긴다.
   * @param {number} x - 버튼 중심 X
   * @param {number} y - 버튼 중심 Y
   * @private
   */
  _createClearBoostButton(x, y) {
    /** @type {import('../managers/AdManager.js').AdManager|null} */
    const adManager = this.registry.get('adManager');

    // 소형 버튼 (퍼플 메타 스타일)
    const btnBg = this.add.rectangle(x, y, 120, 22, BTN_META)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, COLORS.DIAMOND);

    const label = this.add.text(x, y, t('ui.ad.clearBoost'), {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    /** @type {boolean} 버튼 처리 중 여부 (중복 탭 방지) */
    let isProcessing = false;

    btnBg.on('pointerdown', async () => {
      if (isProcessing) return;
      if (!adManager) return;
      if (adManager.isAdLimitReached('clearBoost')) return;

      isProcessing = true;
      label.setText(t('ui.ad.loading'));

      const result = await adManager.showRewarded(ADMOB_REWARDED_CLEAR_BOOST_ID);

      // 씬 전환 후 콜백 진입 방지
      if (!this.scene.isActive('MapClearScene')) return;

      if (result.rewarded) {
        adManager.incrementDailyAdCount('clearBoost');
        this.clearBoostActive = true;

        // 보상 재계산: 기본 보상에 2배 적용
        this._earnedDiamond = this._baseDiamond * AD_CLEAR_BOOST_MULTIPLIER;

        // 다이아몬드 텍스트 갱신
        if (this._diamondText) {
          this._diamondText.setText(t('mapclear.diamondBoosted').replace('{amount}', this._earnedDiamond));
        }

        // 세이브 처리 (재계산된 보상으로 저장)
        this._applyDiamondAndSave(this._saveData, this._earnedDiamond);

        // 버튼 숨김
        btnBg.setVisible(false);
        btnBg.disableInteractive();
        label.setVisible(false);
      } else {
        // 광고 실패: 텍스트 복원
        label.setText(t('ui.ad.clearBoost'));
        isProcessing = false;
      }
    });
  }

  // ── 다이아몬드 지급 및 세이브 ──────────────────────────────────

  /**
   * 다이아몬드를 세이브 데이터에 지급하고 저장한다.
   * @param {object} saveData - 세이브 데이터 객체
   * @param {number} diamond - 지급할 다이아몬드 수량
   * @private
   */
  _applyDiamondAndSave(saveData, diamond) {
    if (this._saved) return;

    saveData.diamond += diamond;
    saveData.totalDiamondEarned += diamond;

    this._saveToDB(saveData);
    this.registry.set('saveData', saveData);
    this._saved = true;
  }

  /**
   * 씬 전환 전 세이브가 완료되지 않았으면 현재 보상으로 저장한다.
   * 광고를 시청하지 않고 바로 버튼을 누른 경우에 대한 안전장치.
   * @private
   */
  _ensureSaved() {
    if (!this._saved) {
      this._applyDiamondAndSave(this._saveData, this._earnedDiamond);
    }
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
