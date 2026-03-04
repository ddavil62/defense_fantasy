/**
 * @fileoverview TowerPanel - 하단 타워 조작 패널.
 * 랜덤 뽑기 버튼, 합성(드래그&드롭) 기능, 배속 토글을 제공한다.
 * 타워 상세 정보 모달은 TowerInfoOverlay로 위임한다.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, PANEL_Y, PANEL_HEIGHT, COLORS, VISUALS,
  TOWER_STATS, TOWER_SHAPE_SIZE, GOLD_TEXT_CSS,
  SPEED_NORMAL, SPEED_FAST, SPEED_TURBO, LONG_PRESS_MS,
  BTN_PRIMARY, BTN_DANGER, BTN_SELL, BTN_META,
  isMergeable, getMergeResult, MERGE_RECIPES, MERGED_TOWER_STATS,
  pixelToGrid, GRID_COLS, GRID_ROWS, HUD_HEIGHT,
  MERGE_COST,
  calcDrawCost,
  ADMOB_REWARDED_TOWER_ID,
  AD_DRAW_LIMIT_PER_GAME,
} from '../config.js';
import { t } from '../i18n.js';
import { TowerInfoOverlay } from './TowerInfoOverlay.js';

/**
 * 게임 하단 타워 패널 UI 클래스.
 * 타워 배치 선택, 합성 드래그&드롭, 게임 속도 조절 등
 * 핵심 조작 인터페이스를 담당한다.
 * 배치된 타워 상세 정보 모달은 TowerInfoOverlay로 위임한다.
 */
export class TowerPanel {
  /**
   * TowerPanel 인스턴스를 생성한다.
   * @param {Phaser.Scene} scene - 패널이 표시될 게임 씬
   * @param {object} callbacks - 이벤트 콜백 모음
   * @param {Function} callbacks.onTowerSelect - 타워 타입 선택 시 호출
   * @param {Function} callbacks.onMerge - 합성 드래그 성공 시 호출 (towerA, towerB)
   * @param {Function} callbacks.onEnhance - 강화 버튼 클릭 시 호출
   * @param {Function} callbacks.onSpeedToggle - 배속 버튼 클릭 시 호출
   * @param {Function} callbacks.onDeselect - 선택 해제 시 호출
   * @param {string[]} [callbacks.unlockedTowers] - 잠금 해제된 타워 타입 키 배열
   */
  constructor(scene, callbacks) {
    /** @type {Phaser.Scene} 패널이 속한 게임 씬 */
    this.scene = scene;

    /** @type {object} 이벤트 콜백 집합 */
    this.callbacks = callbacks;

    /** @type {string[]} 잠금 해제된 타워 타입 목록 */
    this.unlockedTowers = callbacks.unlockedTowers || [];

    /** @type {number} 현재 보유 골드 (합성 미리보기 비용 표시용) */
    this._currentGold = 0;

    /** @type {string|null} 현재 배치 모드로 선택된 타워 타입 */
    this.selectedTowerType = null;

    /** @type {object|null} 현재 선택된 배치 완료 타워 인스턴스 */
    this.selectedTower = null;

    /** @type {number} 현재 게임 배속 (1x/2x/3x) */
    this.gameSpeed = SPEED_NORMAL;

    /** @type {Phaser.GameObjects.Container} 패널 전체를 감싸는 메인 컨테이너 */
    this.container = scene.add.container(0, 0).setDepth(30);

    /** @type {object[]} 타워 선택 버튼 데이터 배열 (레거시, 빈 배열) */
    this.towerButtons = [];

    // ── 뽑기 시스템 상태 ──
    /** @type {number} 게임 세션 내 뽑기 성공 횟수 */
    this.drawCount = 0;

    /** @type {Phaser.GameObjects.Image|Phaser.GameObjects.Rectangle|null} 뽑기 버튼 배경 오브젝트 */
    this._drawButton = null;

    /** @type {Phaser.GameObjects.Text|null} 뽑기 비용 텍스트 오브젝트 */
    this._drawCostText = null;

    /** @type {Phaser.GameObjects.Text|null} 뽑기 라벨 텍스트 오브젝트 */
    this._drawLabelText = null;

    /** @type {string|null} 뽑기로 선택된 타워 타입 (배치 성공 전까지 보유) */
    this._pendingDrawType = null;

    // ── 광고 보상 타워 뽑기 상태 ──
    /** @type {Phaser.GameObjects.Image|Phaser.GameObjects.Rectangle|null} 무료뽑기 버튼 배경 */
    this._adDrawButton = null;

    /** @type {Phaser.GameObjects.Text|null} 무료뽑기 라벨 텍스트 */
    this._adDrawLabelText = null;

    /** @type {Phaser.GameObjects.Text|null} 무료뽑기 서브라벨 텍스트 */
    this._adDrawSublabelText = null;

    /** @type {Phaser.GameObjects.Container|null} 광고 보상 타워 선택 모달 컨테이너 */
    this._adModalContainer = null;

    /** @type {object|null} 광고 보상으로 선택된 타워 정보 { type, tier, mergeId?, mergeData? } */
    this._pendingAdTower = null;

    /** @type {number} 현재 판(게임)에서 광고 보상 뽑기를 사용한 횟수 */
    this._adDrawUsedCount = 0;

    /** @type {TowerInfoOverlay} 타워 상세 정보 오버레이 */
    this.towerInfoOverlay = new TowerInfoOverlay(scene, {
      mode: 'game',
      onEnhance: (tower) => {
        if (this.callbacks.onEnhance) {
          this.callbacks.onEnhance(tower);
        }
      },
      onSell: (tower) => {
        if (this.callbacks.onSell) {
          this.callbacks.onSell(tower);
        }
      },
    });

    // ── 드래그 & 드롭 상태 ──
    /** @type {boolean} 현재 드래그 진행 중 여부 */
    this._isDragging = false;

    /** @type {object|null} 드래그 중인 타워 인스턴스 */
    this._dragTower = null;

    /** @type {Phaser.GameObjects.Graphics|null} 포인터를 따라다니는 고스트 그래픽 */
    this._dragGhost = null;

    // ── 합성 미리보기 상태 ──
    /** @type {{ tower: object, graphics: Phaser.GameObjects.Graphics, tween: Phaser.Tweens.Tween, result: object }[]} 합성 가능 타워 하이라이트 목록 */
    this._mergeHighlights = [];

    /** @type {Phaser.GameObjects.Container|null} 합성 결과 미리보기 버블 */
    this._mergePreviewBubble = null;

    /** @type {object|null} 현재 호버 중인 합성 대상 타워 */
    this._hoveredMergeTarget = null;

    this._create();
  }

  // ── 패널 UI 생성 ────────────────────────────────────────────

  /**
   * 패널의 배경, 뽑기 버튼, 배속 버튼을 생성한다.
   * @private
   */
  _create() {
    // 패널 배경 (이미지 또는 사각형 폴백)
    if (this.scene.textures.exists('tower_panel_bg')) {
      const panelBg = this.scene.add.image(
        GAME_WIDTH / 2, PANEL_Y + PANEL_HEIGHT / 2, 'tower_panel_bg'
      );
      this.container.add(panelBg);
    } else {
      const panelBg = this.scene.add.rectangle(
        GAME_WIDTH / 2, PANEL_Y + PANEL_HEIGHT / 2,
        GAME_WIDTH, PANEL_HEIGHT,
        COLORS.UI_PANEL
      ).setAlpha(0.9);
      this.container.add(panelBg);

      // 상단 구분선 (이미지 패널 사용 시 불필요)
      const divider = this.scene.add.rectangle(
        GAME_WIDTH / 2, PANEL_Y + 1,
        GAME_WIDTH, 2,
        COLORS.BUTTON_ACTIVE
      ).setAlpha(0.5);
      this.container.add(divider);
    }

    // 뽑기 버튼 (기존 2행 5열 타워 버튼 대체)
    this._createDrawButton();

    // 광고 보상 타워 뽑기 버튼
    this._createAdDrawButton();

    // 배속 토글 버튼
    this._createSpeedButton();
  }

  // ── 뽑기 버튼 ────────────────────────────────────────────────

  /**
   * 뽑기 버튼을 패널 좌측에 생성한다.
   * 기존 2행 5열 타워 버튼을 단일 뽑기 버튼으로 대체한다.
   * @private
   */
  _createDrawButton() {
    const x = 95;
    const y = PANEL_Y + 42;
    const btnW = 150;
    const btnH = 44;

    // 뽑기 버튼 배경 (이미지 또는 사각형 폴백)
    if (this.scene.textures.exists('slot_action_normal')) {
      this._drawButton = this.scene.add.image(x, y, 'slot_action_normal')
        .setDisplaySize(btnW, btnH)
        .setInteractive({ useHandCursor: true });
    } else {
      this._drawButton = this.scene.add.rectangle(x, y, btnW, btnH, 0x1a1a2e)
        .setStrokeStyle(2, BTN_PRIMARY)
        .setInteractive({ useHandCursor: true });
    }
    this.container.add(this._drawButton);

    // 뽑기 라벨 텍스트 (상단)
    this._drawLabelText = this.scene.add.text(x, y - 8, t('draw.button'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this._drawLabelText);

    // 뽑기 비용 텍스트 (하단, 금색)
    const initialCost = calcDrawCost(0);
    this._drawCostText = this.scene.add.text(x, y + 10, `${initialCost}G`, {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: GOLD_TEXT_CSS,
    }).setOrigin(0.5);
    this.container.add(this._drawCostText);

    // 포인터 이벤트: 짧은 탭 / 롱프레스 구분
    this._drawButton.on('pointerdown', () => {
      this._startLongPress('draw', x, y);
    });
    this._drawButton.on('pointerup', () => {
      this._endLongPressForDraw();
    });
    this._drawButton.on('pointerout', () => {
      this._cancelLongPress();
    });
  }

  /**
   * 뽑기 버튼 pointerup 핸들러.
   * 롱프레스 미발동 시 뽑기 실행, 롱프레스 발동 시 풀 팝업 표시.
   * @private
   */
  _endLongPressForDraw() {
    if (this._lpTimer) { this._lpTimer.remove(); this._lpTimer = null; }
    if (!this._lpFired) {
      this._onDrawButtonClick();
    }
    // 롱프레스 발동 시 _showDrawPool()이 이미 호출됨
  }

  /**
   * 뽑기 버튼 클릭(짧은 탭) 처리.
   * 해금된 T1 타워 풀에서 균등 확률로 1종을 랜덤 선택하고 배치 모드로 진입한다.
   * 골드 차감은 배치 확정 시 GameScene에서 처리한다.
   * @private
   */
  _onDrawButtonClick() {
    const cost = calcDrawCost(this.drawCount);

    // 골드 부족 시 무시
    if (this._currentGold < cost) return;

    // 해금된 T1 타워 풀 구성
    const pool = Object.keys(TOWER_STATS).filter(type => {
      const stats = TOWER_STATS[type];
      // T1 타워만 (tier가 없거나 1인 타워)
      if (stats.tier && stats.tier > 1) return false;
      // 잠금 해제 체크
      if (stats.locked && !this.unlockedTowers.includes(type)) return false;
      return true;
    });

    if (pool.length === 0) return;

    // 균등 확률 랜덤 선택
    const type = pool[Math.floor(Math.random() * pool.length)];
    this._pendingDrawType = type;

    // 기존 배치 모드와 동일하게 타워 선택 콜백 호출
    this.selectedTower = null;
    this.selectedTowerType = type;
    this._hideInfo();

    if (this.callbacks.onTowerSelect) {
      this.callbacks.onTowerSelect(type);
    }
  }

  /**
   * 뽑기 성공(배치 확정) 시 호출. 뽑기 횟수를 증가시키고 비용 텍스트를 갱신한다.
   */
  incrementDrawCount() {
    this.drawCount++;
    this._pendingDrawType = null;
    if (this._drawCostText) {
      this._drawCostText.setText(`${calcDrawCost(this.drawCount)}G`);
    }
  }

  /**
   * 뽑기 취소(배치 취소) 시 호출. 뽑기 대기 상태를 초기화한다.
   */
  cancelDraw() {
    this._pendingDrawType = null;
    this._pendingAdTower = null;
  }

  // ── 광고 보상 타워 뽑기 ──────────────────────────────────────

  /**
   * "무료뽑기" 버튼을 뽑기 버튼 오른쪽에 생성한다.
   * 광고 시청(또는 adFree 시 즉시) 후 T1(90%)/T2(10%) 확률로 타워 3개를 모달로 제시한다.
   * @private
   */
  _createAdDrawButton() {
    const x = 265;
    const y = PANEL_Y + 42;
    const btnW = 150;
    const btnH = 44;

    // 무료뽑기 버튼 배경 (이미지 또는 사각형 폴백)
    if (this.scene.textures.exists('slot_action_normal')) {
      this._adDrawButton = this.scene.add.image(x, y, 'slot_action_normal')
        .setDisplaySize(btnW, btnH)
        .setInteractive({ useHandCursor: true });
    } else {
      this._adDrawButton = this.scene.add.rectangle(x, y, btnW, btnH, 0x1a1a2e)
        .setStrokeStyle(2, BTN_META)
        .setInteractive({ useHandCursor: true });
    }
    this.container.add(this._adDrawButton);

    // 무료뽑기 라벨 텍스트 (상단) — adFree 여부 무관하게 동일 키 사용
    const labelKey = 'draw.ad.button';
    this._adDrawLabelText = this.scene.add.text(x, y - 8, t(labelKey), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this._adDrawLabelText);

    // 무료뽑기 서브라벨 텍스트 (하단, 연보라) — 잔여 횟수 표시
    const remaining = AD_DRAW_LIMIT_PER_GAME - this._adDrawUsedCount;
    const sublabelStr = `${t('draw.ad.sublabel')} (${remaining}/${AD_DRAW_LIMIT_PER_GAME})`;
    this._adDrawSublabelText = this.scene.add.text(x, y + 10, sublabelStr, {
      fontSize: '10px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#9b59b6',
    }).setOrigin(0.5);
    this.container.add(this._adDrawSublabelText);

    // 이미 판당 제한 소진 시 버튼 비활성화
    if (remaining <= 0) {
      this._disableAdDrawButton();
    }

    // 포인터 이벤트
    this._adDrawButton.on('pointerdown', () => {
      this._onAdDrawButtonClick();
    });
  }

  /**
   * 무료뽑기 버튼 클릭 핸들러.
   * AdManager가 busy 상태이면 무시하고, 아니면 보상형 광고를 표시한다.
   * 광고 시청 완료 시 타워 선택 모달을 열고, 실패 시 에러 텍스트를 표시한다.
   * @private
   */
  async _onAdDrawButtonClick() {
    const adManager = this.scene.registry.get('adManager');
    if (!adManager) return;

    // 판당 제한 초과 시 무시
    if (this._adDrawUsedCount >= AD_DRAW_LIMIT_PER_GAME) return;

    // 광고 진행 중이면 무시
    if (adManager.isBusy) return;

    try {
      const result = await adManager.showRewarded(ADMOB_REWARDED_TOWER_ID);
      // 씬이 파괴된 경우 안전하게 종료
      if (!this.scene || !this.scene.scene.isActive()) return;

      if (result && result.rewarded) {
        // 판당 카운터 증가 및 서브라벨 갱신
        this._adDrawUsedCount++;
        this._updateAdDrawSublabel();

        // 광고 시청 성공: 타워 3개를 뽑아 모달 표시
        const towers = this._pickAdRewardTowers();
        this._showAdRewardModal(towers);
      } else {
        // 광고 실패/취소: 에러 텍스트 표시
        this._showAdFailedToast();
      }
    } catch (e) {
      // 예외 발생 시 에러 토스트
      if (this.scene && this.scene.scene.isActive()) {
        this._showAdFailedToast();
      }
    }
  }

  /**
   * 광고 실패 시 화면 상단에 에러 토스트를 표시한다.
   * 1.5초간 위로 떠오르며 페이드아웃된다.
   * @private
   */
  _showAdFailedToast() {
    const msg = t('draw.ad.failed');
    const toastText = this.scene.add.text(
      GAME_WIDTH / 2, PANEL_Y - 20,
      msg,
      {
        fontSize: '14px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ff4757',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(70);

    this.scene.tweens.add({
      targets: toastText,
      y: toastText.y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => { toastText.destroy(); },
    });
  }

  /**
   * 광고 보상 타워 3개를 확률 기반으로 뽑는다.
   * 각 슬롯 독립적으로 T1(90%) / T2(10%) 확률을 적용한다.
   * T1은 잠금 해제된 풀에서, T2는 전체 T2 풀에서 균등 추출한다.
   * @returns {Array<{ type: string, tier: number, color: number, displayName: string, mergeData?: object }>}
   * @private
   */
  _pickAdRewardTowers() {
    // T1 풀: 해금된 기본 타워
    const t1Pool = Object.keys(TOWER_STATS).filter(type => {
      const stats = TOWER_STATS[type];
      if (stats.tier && stats.tier > 1) return false;
      if (stats.locked && !this.unlockedTowers.includes(type)) return false;
      return true;
    });

    // T2 풀: MERGE_RECIPES에서 tier === 2인 전체 항목 (중복 id 제거)
    const t2Set = new Set();
    const t2Pool = [];
    for (const [, recipe] of Object.entries(MERGE_RECIPES)) {
      if (recipe.tier === 2 && !t2Set.has(recipe.id)) {
        t2Set.add(recipe.id);
        t2Pool.push(recipe);
      }
    }

    return Array.from({ length: 3 }, () => {
      const roll = Math.random();
      if (roll < 0.10 && t2Pool.length > 0) {
        // 10% 확률로 T2 균등 랜덤
        const recipe = t2Pool[Math.floor(Math.random() * t2Pool.length)];
        return {
          type: recipe.id,
          tier: 2,
          color: recipe.color,
          displayName: t(`tower.${recipe.id}.name`) || recipe.displayName,
          mergeData: recipe,
        };
      } else if (t1Pool.length > 0) {
        // 90% 확률로 T1 균등 랜덤
        const type = t1Pool[Math.floor(Math.random() * t1Pool.length)];
        return {
          type,
          tier: 1,
          color: TOWER_STATS[type].color,
          displayName: t(`tower.${type}.name`),
          mergeData: null,
        };
      } else if (t2Pool.length > 0) {
        // T1 풀이 비어있는 방어 코드: T2만 사용
        const recipe = t2Pool[Math.floor(Math.random() * t2Pool.length)];
        return {
          type: recipe.id,
          tier: 2,
          color: recipe.color,
          displayName: t(`tower.${recipe.id}.name`) || recipe.displayName,
          mergeData: recipe,
        };
      }
      // 양쪽 풀 모두 비어있는 극단적 케이스 (발생 불가)
      return null;
    }).filter(Boolean);
  }

  /**
   * 광고 보상 타워 선택 모달을 표시한다.
   * 어두운 오버레이 위에 타워 카드 3개와 취소 버튼을 렌더링한다.
   * @param {Array<{ type: string, tier: number, color: number, displayName: string, mergeData?: object }>} towers - 선택 가능한 타워 3개
   * @private
   */
  _showAdRewardModal(towers) {
    // 이미 모달이 열려있으면 닫기
    this._hideAdRewardModal();

    const container = this.scene.add.container(0, 0).setDepth(61);
    this._adModalContainer = container;

    // 어두운 오버레이 배경
    const overlay = this.scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000
    ).setAlpha(0.6).setInteractive().setDepth(60);
    // 오버레이 클릭 시 아무 동작 안 함 (모달 뒤 입력 차단)
    container.add(overlay);

    // 타이틀 텍스트
    const titleY = GAME_HEIGHT / 2 - 110;
    const titleText = this.scene.add.text(GAME_WIDTH / 2, titleY, t('draw.ad.modal.title'), {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    // 카드 위치 계산: 3개 카드, 너비 90px, 간격 10px
    const cardW = 90;
    const cardH = 130;
    const cardGap = 10;
    const totalW = 3 * cardW + 2 * cardGap; // 290px
    const startX = (GAME_WIDTH - totalW) / 2; // 35
    const cardCenterY = GAME_HEIGHT / 2;
    const cardCenters = [
      startX + cardW / 2,          // 80
      startX + cardW + cardGap + cardW / 2,    // 180
      startX + 2 * (cardW + cardGap) + cardW / 2, // 280
    ];

    // 카드 렌더링
    for (let i = 0; i < towers.length; i++) {
      const towerData = towers[i];
      const cx = cardCenters[i];
      const cy = cardCenterY;
      const isT2 = towerData.tier >= 2;

      // 카드 배경
      const borderColor = isT2 ? 0xffd700 : towerData.color;
      const cardBg = this.scene.add.rectangle(cx, cy, cardW, cardH, 0x0a0e1a, 0.95)
        .setStrokeStyle(2, borderColor);
      container.add(cardBg);

      // T2 강조: 상단 별 표시
      if (isT2) {
        const starText = this.scene.add.text(cx, cy - cardH / 2 + 12, '\u2605', {
          fontSize: '16px',
          color: '#ffd700',
        }).setOrigin(0.5);
        container.add(starText);
      }

      // 타워 아이콘 (색상 원으로 미니 렌더)
      const iconY = cy - 28;
      const iconTexKey = `tower_${towerData.type}`;
      if (this.scene.textures.exists(iconTexKey)) {
        const iconImg = this.scene.add.image(cx, iconY, iconTexKey)
          .setDisplaySize(36, 36);
        container.add(iconImg);
      } else {
        const iconGfx = this.scene.add.graphics();
        iconGfx.fillStyle(towerData.color, 1);
        iconGfx.fillCircle(cx, iconY, 14);
        container.add(iconGfx);
      }

      // 타워 이름
      const colorCSS = '#' + towerData.color.toString(16).padStart(6, '0');
      const nameText = this.scene.add.text(cx, cy + 8, towerData.displayName, {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: cardW - 8 },
        align: 'center',
      }).setOrigin(0.5);
      container.add(nameText);

      // 티어 뱃지
      const badgeLabel = isT2 ? t('draw.ad.badge.t2') : t('draw.ad.badge.t1');
      const badgeColor = isT2 ? '#ffd700' : '#aaaaaa';
      const badgeText = this.scene.add.text(cx, cy + 26, badgeLabel, {
        fontSize: '10px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: badgeColor,
      }).setOrigin(0.5);
      container.add(badgeText);

      // "선택" 버튼
      const selectBtnY = cy + cardH / 2 - 16;
      const selectBg = this.scene.add.rectangle(cx, selectBtnY, 60, 22, BTN_PRIMARY)
        .setInteractive({ useHandCursor: true });
      container.add(selectBg);

      const selectText = this.scene.add.text(cx, selectBtnY, t('draw.ad.modal.select'), {
        fontSize: '11px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(selectText);

      // 선택 버튼 클릭 핸들러
      selectBg.on('pointerdown', () => {
        this._onAdTowerSelected(towerData);
      });
    }

    // 취소 버튼
    const cancelY = cardCenterY + cardH / 2 + 30;
    const cancelText = this.scene.add.text(GAME_WIDTH / 2, cancelY, t('draw.ad.modal.cancel'), {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ff4757',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    container.add(cancelText);

    cancelText.on('pointerdown', () => {
      this._hideAdRewardModal();
    });
  }

  /**
   * 광고 보상 모달에서 타워를 선택했을 때 호출한다.
   * 모달을 닫고 선택된 타워를 배치 모드로 진입시킨다.
   * T1 타워는 기존 onTowerSelect 콜백을 사용하고,
   * T2 타워는 _pendingAdTower에 mergeData를 저장하여 GameScene에서 처리한다.
   * @param {object} towerData - 선택된 타워 데이터 { type, tier, mergeData, ... }
   * @private
   */
  _onAdTowerSelected(towerData) {
    this._hideAdRewardModal();

    this.selectedTower = null;
    this._hideInfo();

    if (towerData.tier >= 2 && towerData.mergeData) {
      // T2 합성 타워: mergeData를 포함하여 pendingAdTower에 저장
      // 배치 시 GameScene이 base 타워를 생성한 후 applyMergeResult 적용
      this._pendingAdTower = {
        type: towerData.type,
        tier: towerData.tier,
        mergeData: towerData.mergeData,
      };
      // T2 타워의 경우 레시피 키에서 첫 번째 재료 타입을 base로 사용
      const baseType = this._getBaseTypeForMerge(towerData.mergeData.id);
      this._pendingDrawType = baseType;
      this.selectedTowerType = baseType;

      if (this.callbacks.onTowerSelect) {
        this.callbacks.onTowerSelect(baseType);
      }
    } else {
      // T1 기본 타워: 기존 뽑기와 동일하게 처리 (골드 무료)
      this._pendingAdTower = {
        type: towerData.type,
        tier: 1,
        mergeData: null,
      };
      this._pendingDrawType = towerData.type;
      this.selectedTowerType = towerData.type;

      if (this.callbacks.onTowerSelect) {
        this.callbacks.onTowerSelect(towerData.type);
      }
    }
  }

  /**
   * T2 합성 타워 ID로부터 기본 재료 타워 타입을 추출한다.
   * MERGE_RECIPES에서 해당 id의 레시피를 찾아 첫 번째 재료를 반환한다.
   * @param {string} mergeId - 합성 결과 ID (e.g. 'rapid_archer')
   * @returns {string} 기본 타워 타입 키 (e.g. 'archer')
   * @private
   */
  _getBaseTypeForMerge(mergeId) {
    for (const [key, recipe] of Object.entries(MERGE_RECIPES)) {
      if (recipe.id === mergeId) {
        // 레시피 키 형식: 'typeA+typeB'
        return key.split('+')[0];
      }
    }
    // 폴백: 첫 번째 T1 타워
    const firstT1 = Object.keys(TOWER_STATS).find(type => {
      const stats = TOWER_STATS[type];
      return !stats.tier || stats.tier === 1;
    });
    return firstT1 || 'archer';
  }

  /**
   * 광고 보상 타워 선택 모달을 파괴하고 숨긴다.
   * @private
   */
  _hideAdRewardModal() {
    if (this._adModalContainer) {
      this._adModalContainer.destroy();
      this._adModalContainer = null;
    }
  }

  /**
   * 무료뽑기 버튼의 서브라벨을 잔여 횟수로 갱신한다.
   * 제한 소진 시 버튼을 비활성화한다.
   * @private
   */
  _updateAdDrawSublabel() {
    const remaining = AD_DRAW_LIMIT_PER_GAME - this._adDrawUsedCount;
    if (this._adDrawSublabelText) {
      const sublabelStr = `${t('draw.ad.sublabel')} (${remaining}/${AD_DRAW_LIMIT_PER_GAME})`;
      this._adDrawSublabelText.setText(sublabelStr);
    }
    if (remaining <= 0) {
      this._disableAdDrawButton();
    }
  }

  /**
   * 무료뽑기 버튼을 비활성화한다 (판당 제한 소진 시).
   * 버튼을 반투명하게 만들고 인터랙티브를 해제한다.
   * @private
   */
  _disableAdDrawButton() {
    if (this._adDrawButton) {
      this._adDrawButton.disableInteractive();
      this._adDrawButton.setAlpha(0.4);
    }
    if (this._adDrawLabelText) {
      this._adDrawLabelText.setAlpha(0.4);
    }
    if (this._adDrawSublabelText) {
      this._adDrawSublabelText.setAlpha(0.4);
    }
  }

  /**
   * 뽑기 풀 팝업을 표시한다.
   * 현재 해금된 타워 목록과 각 확률을 팝업으로 표시한다.
   * @private
   */
  _showDrawPool() {
    this._hideDescription();

    // 해금된 T1 타워 풀 구성
    const pool = Object.keys(TOWER_STATS).filter(type => {
      const stats = TOWER_STATS[type];
      if (stats.tier && stats.tier > 1) return false;
      if (stats.locked && !this.unlockedTowers.includes(type)) return false;
      return true;
    });

    const prob = pool.length > 0 ? Math.round(100 / pool.length) : 0;

    const popupW = 320;
    const lineHeight = 16;
    const headerH = 40;
    const popupH = headerH + pool.length * lineHeight + 20;
    const popupX = GAME_WIDTH / 2;
    const popupY = PANEL_Y - popupH / 2 - 8;

    // 컨테이너로 묶어서 일괄 정리를 용이하게 함
    this._descContainer = this.scene.add.container(0, 0).setDepth(50);

    // 배경 + 테두리
    const bg = this.scene.add.rectangle(popupX, popupY, popupW, popupH, 0x0a0e1a, 0.92)
      .setStrokeStyle(2, BTN_PRIMARY);
    this._descContainer.add(bg);

    // 타이틀
    const titleText = this.scene.add.text(popupX, popupY - popupH / 2 + 14, t('draw.pool.title'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this._descContainer.add(titleText);

    // 확률 표시
    const probText = this.scene.add.text(popupX, popupY - popupH / 2 + 30,
      t('draw.pool.prob').replace('{count}', prob), {
        fontSize: '10px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#a0a0a0',
      }).setOrigin(0.5);
    this._descContainer.add(probText);

    // 타워 목록
    const startY = popupY - popupH / 2 + headerH + 10;
    for (let i = 0; i < pool.length; i++) {
      const type = pool[i];
      const color = TOWER_STATS[type].color;
      const colorCSS = '#' + color.toString(16).padStart(6, '0');
      const name = t(`tower.${type}.name`);

      const nameText = this.scene.add.text(popupX, startY + i * lineHeight, name, {
        fontSize: '11px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: colorCSS,
      }).setOrigin(0.5);
      this._descContainer.add(nameText);
    }

    // 다음 프레임에 닫기 핸들러 등록
    this.scene.time.delayedCall(50, () => {
      this._descCloseHandler = this.scene.input.once('pointerdown', () => {
        this._hideDescription();
      });
    });
  }

  // ── 타워 아이콘 그리기 ──────────────────────────────────────

  /**
   * 잠금된 타워 버튼에 자물쇠 아이콘을 그린다.
   * 사각형 몸체 + 반원 고리 + 열쇠구멍으로 구성된다.
   * (뽑기 풀 표시 등에서 재사용 가능성 고려하여 유지)
   * @param {Phaser.GameObjects.Graphics} g - 그래픽 오브젝트
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @private
   */
  _drawLockIcon(g, x, y) {
    g.clear();
    // 자물쇠 몸체 (사각형)
    g.fillStyle(COLORS.LOCK_ICON, 0.8);
    g.fillRect(x - 7, y - 2, 14, 10);
    // 자물쇠 고리 (반원)
    g.lineStyle(2, COLORS.LOCK_ICON, 0.8);
    g.beginPath();
    g.arc(x, y - 2, 5, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0), false);
    g.strokePath();
    // 열쇠구멍
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(x, y + 2, 2);
  }

  // ── 배속 토글 버튼 ─────────────────────────────────────────

  /**
   * 게임 배속 토글 버튼을 생성한다.
   * 1x -> 2x -> 3x -> 1x 순환으로 동작하며,
   * 배속 변경 시 시각적 하이라이트와 onSpeedToggle 콜백을 처리한다.
   * @private
   */
  _createSpeedButton() {
    const btnSize = VISUALS.ACTION_BUTTON_SIZE;
    const x = 40;
    const y = PANEL_Y + 80;

    if (this.scene.textures.exists('slot_action_normal')) {
      this.speedBg = this.scene.add.image(x, y, 'slot_action_normal')
        .setInteractive({ useHandCursor: true });
    } else {
      this.speedBg = this.scene.add.rectangle(x, y, btnSize, btnSize, BTN_SELL)
        .setStrokeStyle(1, 0x636e72)
        .setInteractive({ useHandCursor: true });
    }
    this.container.add(this.speedBg);

    // 배속 텍스트 뒤의 원형 하이라이트 (1x 초과일 때 표시)
    this.speedCircle = this.scene.add.graphics();
    this.container.add(this.speedCircle);
    /** @type {number} 배속 버튼 중심 X */
    this._speedX = x;
    /** @type {number} 배속 버튼 중심 Y */
    this._speedY = y;

    // 배속 아이콘 이미지 또는 텍스트 폴백
    if (this.scene.textures.exists('icon_speed_x1')) {
      this.speedIcon = this.scene.add.image(x, y, 'icon_speed_x1')
        .setDisplaySize(20, 20);
      this.container.add(this.speedIcon);
      this.speedText = null;
    } else {
      this.speedIcon = null;
      this.speedText = this.scene.add.text(x, y, 'x1', {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.container.add(this.speedText);
    }

    this.speedBg.on('pointerdown', () => {
      // 3단계 배속 순환: 1x -> 2x -> 3x -> 1x
      if (this.gameSpeed === SPEED_NORMAL) {
        this.gameSpeed = SPEED_FAST;
      } else if (this.gameSpeed === SPEED_FAST) {
        this.gameSpeed = SPEED_TURBO;
      } else {
        this.gameSpeed = SPEED_NORMAL;
      }

      // 배속 아이콘 또는 텍스트 갱신
      if (this.speedIcon) {
        // 이미지 모드: 배속에 맞는 텍스처로 교체
        const texKey = this.gameSpeed === SPEED_NORMAL ? 'icon_speed_x1'
          : this.gameSpeed === SPEED_FAST ? 'icon_speed_x2' : 'icon_speed_x3';
        this.speedIcon.setTexture(texKey);
      } else {
        // 텍스트 폴백 모드
        const label = this.gameSpeed === SPEED_NORMAL ? 'x1'
          : this.gameSpeed === SPEED_FAST ? 'x2' : 'x3';
        // 배속별 텍스트 색상: 1x=흰색, 2x=노란색, 3x=빨간색
        const color = this.gameSpeed === SPEED_NORMAL ? '#ffffff'
          : this.gameSpeed === SPEED_FAST ? '#fdcb6e' : '#e94560';
        this.speedText.setText(label);
        this.speedText.setColor(color);
      }
      this._updateSpeedHighlight();
      if (this.callbacks.onSpeedToggle) {
        this.callbacks.onSpeedToggle(this.gameSpeed);
      }
    });
  }

  /**
   * 배속 버튼의 원형 하이라이트를 갱신한다.
   * 1x 초과일 때 텍스트 뒤에 배속 단계에 맞는 색상의 원을 표시한다.
   * @private
   */
  _updateSpeedHighlight() {
    if (!this.speedCircle) return;
    this.speedCircle.clear();
    if (this.gameSpeed !== SPEED_NORMAL) {
      // 2x=파란계열(BTN_PRIMARY), 3x=빨간계열(BTN_DANGER)
      const highlightColor = this.gameSpeed === SPEED_FAST ? BTN_PRIMARY : BTN_DANGER;
      this.speedCircle.fillStyle(highlightColor, 0.4);
      this.speedCircle.fillCircle(this._speedX, this._speedY, 14);
    }
  }

  // ── 긴 누르기 & 설명 팝업 ──────────────────────────────────

  /**
   * 타워 버튼에 대한 긴 누르기 타이머를 시작한다.
   * LONG_PRESS_MS 이후 설명 팝업이 표시된다.
   * @param {string} type - 타워 타입 키
   * @param {number} x - 버튼 중심 X 좌표
   * @param {number} y - 버튼 중심 Y 좌표
   * @private
   */
  _startLongPress(type, x, y) {
    this._cancelLongPress();
    this._lpType = type;
    this._lpFired = false;
    this._lpTimer = this.scene.time.delayedCall(LONG_PRESS_MS, () => {
      this._lpFired = true;
      // 뽑기 버튼 롱프레스 시 뽑기 풀 표시, 타워 버튼은 설명 팝업 표시
      if (type === 'draw') {
        this._showDrawPool();
      } else {
        this._showDescription(type);
      }
    });
  }

  // _endLongPress(type) - 제거됨: 뽑기 시스템에서 _endLongPressForDraw()로 대체

  /**
   * 포인터가 버튼 영역을 벗어났을 때 긴 누르기를 취소한다.
   * @private
   */
  _cancelLongPress() {
    if (this._lpTimer) { this._lpTimer.remove(); this._lpTimer = null; }
  }

  /**
   * 타워 설명 팝업을 패널 위에 표시한다.
   * 타워 이름, 플레이버 텍스트, 기본 스탯, 비용/잠금 정보를 보여준다.
   * @param {string} type - 타워 타입 키
   * @private
   */
  _showDescription(type) {
    this._hideDescription();

    const towerDef = TOWER_STATS[type];
    const stats = towerDef.levels[1];
    const color = towerDef.color;

    const popupW = 320;
    const popupH = 130;
    const popupX = GAME_WIDTH / 2;
    const popupY = PANEL_Y - popupH / 2 - 8;
    const colorCSS = '#' + color.toString(16).padStart(6, '0');

    // 컨테이너로 묶어서 일괄 정리를 용이하게 함
    this._descContainer = this.scene.add.container(0, 0).setDepth(50);

    // 배경 + 테두리
    const bg = this.scene.add.rectangle(popupX, popupY, popupW, popupH, 0x0a0e1a, 0.92)
      .setStrokeStyle(2, color);
    this._descContainer.add(bg);

    // 타워 이름
    const nameText = this.scene.add.text(popupX, popupY - 36, t(`tower.${type}.name`), {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: colorCSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this._descContainer.add(nameText);

    // 타워 플레이버 텍스트
    const flavorText = this.scene.add.text(popupX, popupY - 18, t(`tower.${type}.flavor`), {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#a0a0a0',
    }).setOrigin(0.5);
    this._descContainer.add(flavorText);

    // 타워 특징 설명 텍스트
    const descText2 = this.scene.add.text(popupX, popupY - 2, t(`tower.${type}.desc`), {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#d0d0d0',
    }).setOrigin(0.5);
    this._descContainer.add(descText2);

    // 스탯 한 줄 요약 (특수 효과 포함)
    const special = stats.slowAmount ? `Slow ${stats.slowAmount * 100}%`
      : stats.splashRadius ? `Splash ${stats.splashRadius}px`
      : stats.chainCount ? `Chain ${stats.chainCount}`
      : stats.burnDamage ? `Burn ${stats.burnDamage}/s`
      : stats.pushbackDistance ? `Push ${stats.pushbackDistance}px`
      : stats.attackType === 'piercing_beam' ? 'Piercing'
      : '-';
    const statLine = `${t('ui.damage')} ${stats.damage}  |  ${t('ui.range')} ${stats.range}  |  ${t('ui.speed')} ${stats.fireRate}s  |  ${t('ui.special')} ${special}`;
    const statText = this.scene.add.text(popupX, popupY + 20, statLine, {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#e0e0e0',
    }).setOrigin(0.5);
    this._descContainer.add(statText);

    // 비용 또는 잠금 해제 조건 표시
    const isLocked = TOWER_STATS[type].locked && !this.unlockedTowers.includes(type);
    const unlockWorld = TOWER_STATS[type].unlockWorld;
    const worldName = unlockWorld ? t(`world.${unlockWorld}.name`) : '';
    const costStr = isLocked ? `\uD83D\uDD12 ${worldName}` : `${stats.cost}G`;
    const costText = this.scene.add.text(popupX, popupY + 42, costStr, {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);
    this._descContainer.add(costText);

    // 다음 프레임에 닫기 핸들러 등록 (즉시 등록하면 현재 탭으로 바로 닫힘)
    this.scene.time.delayedCall(50, () => {
      this._descCloseHandler = this.scene.input.once('pointerdown', () => {
        this._hideDescription();
      });
    });
  }

  /**
   * 설명 팝업을 파괴하고 숨긴다.
   * @private
   */
  _hideDescription() {
    if (this._descContainer) {
      this._descContainer.destroy();
      this._descContainer = null;
    }
  }

  // ── 타워 선택 로직 ─────────────────────────────────────────

  // _onTowerButtonClick(type) - 제거됨: 뽑기 시스템에서 _onDrawButtonClick()으로 대체

  /**
   * 뽑기 시스템에서는 개별 타워 버튼이 없으므로 no-op.
   * clearSelection() 등에서 호출되는 인터페이스를 유지한다.
   * @private
   */
  _updateButtonHighlights() {
    // 뽑기 시스템: 개별 타워 버튼 하이라이트 불필요
  }

  /**
   * 현재 보유 골드에 따라 타워 버튼의 구매 가능 여부를 시각적으로 갱신한다.
   * 골드가 부족하면 버튼을 반투명 + 빨간 비용 텍스트로 표시한다.
   * @param {number} gold - 현재 보유 골드
   */
  updateAffordability(gold) {
    this._currentGold = gold;

    // 뽑기 버튼 활성화/비활성화
    if (this._drawButton) {
      const cost = calcDrawCost(this.drawCount);
      if (gold >= cost) {
        this._drawButton.setAlpha(1);
        if (this._drawLabelText) this._drawLabelText.setAlpha(1);
        if (this._drawCostText) {
          this._drawCostText.setAlpha(1);
          this._drawCostText.setColor(GOLD_TEXT_CSS);
        }
      } else {
        this._drawButton.setAlpha(0.5);
        if (this._drawLabelText) this._drawLabelText.setAlpha(0.5);
        if (this._drawCostText) {
          this._drawCostText.setAlpha(0.5);
          this._drawCostText.setColor('#ff4757');
        }
      }
    }
  }

  // ── 타워 정보 표시 ─────────────────────────────────────────

  /**
   * 배치된 타워의 상세 정보 오버레이를 연다.
   * TowerInfoOverlay에 타워 인스턴스를 전달하여 스탯, 트리, 강화/판매 UI를 표시한다.
   * @param {object} tower - 배치된 타워 인스턴스
   */
  showTowerInfo(tower) {
    this.selectedTower = tower;
    this.selectedTowerType = null;
    this._updateButtonHighlights();
    this._hideInfo();

    // 타워 상세 오버레이 열기
    this.towerInfoOverlay.open(tower);
  }

  // ── 합성 파트너 강조 ──────────────────────────────────────────

  /**
   * 맵 위에서 파트너 타입에 해당하는 타워들을 금색 원으로 깜빡여 강조한다.
   * 3회 반복 후 자동으로 제거된다.
   * @param {string} partnerType - 강조할 타워 타입 또는 mergeId
   * @private
   */
  _flashMergeTargets(partnerType) {
    const getTowers = this.callbacks.getTowers;
    if (!getTowers) return;

    const towers = getTowers();
    for (const t of towers) {
      const tId = t.mergeId || t.type;
      if (tId === partnerType) {
        const g = this.scene.add.graphics().setDepth(40);
        g.fillStyle(0xffd700, 1);
        g.fillCircle(t.x, t.y, 20);
        this.scene.tweens.add({
          targets: g,
          alpha: { from: 1, to: 0 },
          duration: 300,
          yoyo: true,
          repeat: 2,
          onComplete: () => { g.destroy(); },
        });
      }
    }
  }

  // ── 합성 하이라이트 ─────────────────────────────────────────

  /**
   * 드래그 시작 시 합성 가능한 모든 타워에 하이라이트를 표시한다.
   * merge_rune 이미지가 있으면 회전 마법진 스프라이트를, 없으면 기존 금색 원+펄스 tween을 사용한다.
   * @param {object} dragTower - 드래그 중인 타워 인스턴스
   * @private
   */
  _startMergeHighlights(dragTower) {
    this._clearMergeHighlights();

    const getTowers = this.callbacks.getTowers;
    if (!getTowers) return;

    const selfId = dragTower.mergeId || dragTower.type;
    const towers = getTowers();
    const useMergeRune = this.scene.textures.exists('merge_rune');

    for (const target of towers) {
      if (target === dragTower) continue;
      if (!isMergeable(target)) continue;

      const targetId = target.mergeId || target.type;
      const result = getMergeResult(selfId, targetId);
      if (!result) continue;

      if (useMergeRune) {
        // 마법진 이미지 + 회전 tween
        const sprite = this.scene.add.image(target.x, target.y, 'merge_rune')
          .setDisplaySize(48, 48)
          .setDepth(40);

        const tween = this.scene.tweens.add({
          targets: sprite,
          angle: 360,
          duration: 1000,
          repeat: -1,
        });

        this._mergeHighlights.push({ tower: target, graphics: null, sprite, tween, result });
      } else {
        // 폴백: 기존 Graphics strokeCircle + alpha 펄스
        const g = this.scene.add.graphics().setDepth(40);
        g.lineStyle(3, 0xffd700, 1);
        g.strokeCircle(target.x, target.y, 22);

        const tween = this.scene.tweens.add({
          targets: g,
          alpha: { from: 1.0, to: 0.5 },
          duration: 600,
          yoyo: true,
          repeat: -1,
        });

        this._mergeHighlights.push({ tower: target, graphics: g, sprite: null, tween, result });
      }
    }
  }

  /**
   * 타워 위에 합성 결과 미리보기 버블을 표시한다.
   * 이미 동일 타워에 버블이 표시 중이면 중복 생성하지 않는다.
   * @param {object} tower - 대상 타워 인스턴스
   * @param {object} result - 합성 레시피 결과 { id, tier, color, ... }
   * @private
   */
  _showMergePreviewBubble(tower, result) {
    if (this._hoveredMergeTarget === tower) return;
    this._hideMergePreviewBubble();
    this._hoveredMergeTarget = tower;

    const resultName = t(`tower.${result.id}.name`) || result.displayName;
    const colorCSS = '#' + result.color.toString(16).padStart(6, '0');
    // HUD 영역과 겹치지 않도록 Y 좌표 하한 제한
    const by = Math.max(HUD_HEIGHT + 20, tower.y - 44);

    const container = this.scene.add.container(tower.x, by).setDepth(41);

    // 합성 비용 산출 (밸런스 오버홀)
    const mergeCost = MERGE_COST[result.tier] || 0;
    const canAfford = this._currentGold >= mergeCost;
    // 비용 포함 시 버블 높이를 늘림
    const bubbleH = mergeCost > 0 ? 44 : 32;

    // 버블 배경
    const bg = this.scene.add.rectangle(0, 0, 100, bubbleH, 0x0a0e1a, 0.9)
      .setStrokeStyle(2, result.color);
    container.add(bg);

    // 결과 타워 이름
    const nameY = mergeCost > 0 ? -11 : -5;
    const nameText = this.scene.add.text(0, nameY, `\u2192 ${resultName}`, {
      fontSize: '10px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: colorCSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(nameText);

    // 결과 타워 티어
    const tierText = this.scene.add.text(0, nameY + 13, `(T${result.tier})`, {
      fontSize: '9px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(tierText);

    // 합성 비용 표시 (밸런스 오버홀)
    if (mergeCost > 0) {
      const costLabel = t('merge.cost').replace('{cost}', mergeCost);
      const costColor = canAfford ? GOLD_TEXT_CSS : '#ff4757'; // 부족 시 빨간색
      const costText = this.scene.add.text(0, nameY + 26, costLabel, {
        fontSize: '9px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: costColor,
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(costText);
    }

    this._mergePreviewBubble = container;
  }

  /**
   * 합성 결과 미리보기 버블을 파괴하고 숨긴다.
   * @private
   */
  _hideMergePreviewBubble() {
    if (this._mergePreviewBubble) {
      this._mergePreviewBubble.destroy();
      this._mergePreviewBubble = null;
    }
    this._hoveredMergeTarget = null;
  }

  /**
   * 모든 합성 하이라이트 (그래픽/스프라이트 + 트윈)를 정리한다.
   * @private
   */
  _clearMergeHighlights() {
    for (const h of this._mergeHighlights) {
      h.tween.stop();
      if (h.graphics) h.graphics.destroy();
      if (h.sprite) h.sprite.destroy();
    }
    this._mergeHighlights = [];
  }

  // ── 합성 드래그 & 드롭 ─────────────────────────────────────

  /**
   * 타워 합성을 위한 드래그를 시작한다.
   * GameScene에서 맵 위 타워를 pointerdown할 때 호출된다.
   * 강화된 타워(enhanceLevel > 0)는 드래그할 수 없다.
   * @param {object} tower - 드래그할 타워 인스턴스
   * @param {Phaser.Input.Pointer} pointer - 드래그를 시작한 포인터
   */
  startDrag(tower, pointer) {
    // 강화된 타워는 합성 드래그 불가
    if (tower.enhanceLevel > 0) return;

    this._isDragging = true;
    this._dragTower = tower;

    // 원본 타워를 일시적으로 숨김
    tower.graphics.setAlpha(0);

    // 포인터를 따라다니는 고스트 그래픽 생성
    this._dragGhost = this.scene.add.graphics().setDepth(50);
    this._drawDragGhost(pointer.x, pointer.y, tower);

    // 합성 가능 타워 하이라이트 표시
    this._startMergeHighlights(tower);

    // 빈 셀 하이라이트 표시 (이동 가능 위치 안내)
    if (this.callbacks.onDragStart) {
      this.callbacks.onDragStart();
    }
  }

  /**
   * 드래그 고스트의 위치를 포인터에 맞춰 갱신한다.
   * 합성 가능 타워 위에 호버 시 미리보기 버블을 표시한다.
   * @param {Phaser.Input.Pointer} pointer - 현재 포인터 위치
   */
  updateDrag(pointer) {
    if (!this._isDragging || !this._dragGhost) return;
    this._dragGhost.clear();
    this._drawDragGhost(pointer.x, pointer.y, this._dragTower);

    // 합성 가능 타워 위에 호버 시 결과 미리보기 버블 표시
    const { col, row } = pixelToGrid(pointer.x, pointer.y);
    const hovered = this._mergeHighlights.find(
      h => h.tower.col === col && h.tower.row === row
    );
    if (hovered) {
      this._showMergePreviewBubble(hovered.tower, hovered.result);
    } else {
      this._hideMergePreviewBubble();
    }
  }

  /**
   * 드래그를 종료하고 합성/이동을 시도하거나 취소한다.
   * 합성 가능한 타워 위에 드롭하면 onMerge 콜백을 호출하고,
   * 빈 배치 가능 셀이면 onMove 콜백으로 타워를 이동하며,
   * 그 외 경우 원본 타워를 복원한다.
   * @param {Phaser.Input.Pointer} pointer - 드롭 시점의 포인터
   * @param {Function} getTowerAt - 그리드 좌표(col, row)로 타워를 찾는 함수
   * @param {Function} [isBuildable] - 그리드 좌표(col, row)가 빈 배치 가능 셀인지 확인하는 함수
   */
  endDrag(pointer, getTowerAt, isBuildable) {
    if (!this._isDragging) return;

    const towerA = this._dragTower;

    // 고스트 그래픽 정리
    if (this._dragGhost) {
      this._dragGhost.destroy();
      this._dragGhost = null;
    }

    this._isDragging = false;
    this._dragTower = null;

    // 합성 하이라이트 및 미리보기 버블 정리
    this._clearMergeHighlights();
    this._hideMergePreviewBubble();

    // 드래그 종료 콜백 (빈 셀 하이라이트 제거)
    if (this.callbacks.onDragEnd) {
      this.callbacks.onDragEnd();
    }

    // 드롭 위치에 유효한 타워가 있는지 확인
    const grid = pixelToGrid(pointer.x, pointer.y);
    const { col, row } = grid;

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      const towerB = getTowerAt(col, row);

      if (towerB && towerB !== towerA) {
        // 대상 타워가 합성 불가(강화됨)인 경우 흔들기 피드백
        if (!isMergeable(towerB)) {
          towerA.graphics.setAlpha(1);
          this._playShakeTween(towerB);
          return;
        }

        // 합성 레시피 확인
        const idA = towerA.mergeId || towerA.type;
        const idB = towerB.mergeId || towerB.type;
        const result = getMergeResult(idA, idB);

        if (result) {
          // 합성 성공 -> 콜백 호출
          if (this.callbacks.onMerge) {
            this.callbacks.onMerge(towerA, towerB);
          }
          return;
        } else {
          // 레시피 없음 -> 대상 타워 흔들기 피드백
          towerA.graphics.setAlpha(1);
          this._playShakeTween(towerB);
          return;
        }
      } else if (!towerB && isBuildable && isBuildable(col, row)) {
        // 빈 배치 가능 셀 -> 타워 이동 (비용 무료)
        if (this.callbacks.onMove) {
          this.callbacks.onMove(towerA, col, row);
        }
        return;
      }
    }

    // 유효한 대상 없음 또는 배치 불가 셀 -> 원본 타워 복원
    towerA.graphics.setAlpha(1);
  }

  /**
   * 포인터 위치에 반투명 고스트 원을 그린다.
   * 합성 타워도 올바른 색상을 사용하도록 tower._getColor()를 우선 참조한다.
   * @param {number} x - 포인터 X 좌표
   * @param {number} y - 포인터 Y 좌표
   * @param {object} tower - 타워 인스턴스 (색상 참조용)
   * @private
   */
  _drawDragGhost(x, y, tower) {
    const color = tower._getColor ? tower._getColor() : TOWER_STATS[tower.type || tower].color;
    this._dragGhost.fillStyle(color, 0.5);
    this._dragGhost.fillCircle(x, y, 14);
    this._dragGhost.lineStyle(2, 0xffffff, 0.5);
    this._dragGhost.strokeCircle(x, y, 14);
  }

  /**
   * 타워에 좌우 흔들기 트윈을 재생한다 (합성 실패 피드백).
   * 80ms 주기로 3회 반복 후 원래 위치로 복원한다.
   * @param {object} tower - 흔들릴 타워 인스턴스
   * @private
   */
  _playShakeTween(tower) {
    if (!tower.graphics || !tower.graphics.active) return;
    this.scene.tweens.add({
      targets: tower.graphics,
      x: { from: -4, to: 4 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (tower.graphics && tower.graphics.active) {
          tower.graphics.setPosition(0, 0);
        }
      },
    });
  }

  /**
   * 현재 드래그가 진행 중인지 확인한다.
   * @returns {boolean} 드래그 진행 중이면 true
   */
  isDragging() {
    return this._isDragging;
  }

  /**
   * 타워 정보 오버레이가 열려있는지 반환한다.
   * GameScene에서 오버레이 열린 동안 게임 입력을 차단하는 데 사용한다.
   * @returns {boolean}
   */
  isOverlayOpen() {
    return this.towerInfoOverlay && this.towerInfoOverlay.isOpen();
  }

  // ── 정보 패널 관리 ─────────────────────────────────────────

  /**
   * 타워 정보 오버레이를 닫는다.
   * @private
   */
  _hideInfo() {
    this.towerInfoOverlay.close();
  }

  /**
   * 모든 선택 상태(타워 타입 선택, 배치 타워 선택)를 초기화하고 정보를 숨긴다.
   */
  clearSelection() {
    this.selectedTowerType = null;
    this.selectedTower = null;
    this._updateButtonHighlights();
    this._hideInfo();

    if (this.callbacks.onDeselect) {
      this.callbacks.onDeselect();
    }
  }

  // ── 상태 조회 ──────────────────────────────────────────────

  /**
   * 현재 배치 모드로 선택된 타워 타입을 반환한다.
   * @returns {string|null} 선택된 타워 타입 키, 없으면 null
   */
  getSelectedTowerType() {
    return this.selectedTowerType;
  }

  /**
   * 현재 게임 배속 설정 값을 반환한다.
   * @returns {number} 배속 값 (SPEED_NORMAL, SPEED_FAST, SPEED_TURBO)
   */
  getGameSpeed() {
    return this.gameSpeed;
  }

  // ── 정리 ────────────────────────────────────────────────────

  /**
   * 패널의 모든 요소를 정리하고 메모리를 해제한다.
   * 설명 팝업, 긴 누르기 타이머, 정보 오버레이, 드래그 고스트,
   * 합성 하이라이트, 미리보기 버블, 메인 컨테이너를 모두 파괴한다.
   */
  destroy() {
    this._hideDescription();
    this._hideAdRewardModal();
    this._cancelLongPress();
    this._hideInfo();
    this.towerInfoOverlay.destroy();
    if (this._dragGhost) {
      this._dragGhost.destroy();
      this._dragGhost = null;
    }
    this._isDragging = false;
    this._dragTower = null;
    this._clearMergeHighlights();
    this._hideMergePreviewBubble();
    // 아이콘 이미지 오브젝트 정리
    if (this.speedIcon) { this.speedIcon.destroy(); this.speedIcon = null; }
    if (this.container) {
      this.container.destroy();
    }
  }
}
