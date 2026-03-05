/**
 * @fileoverview CollectionScene - 글로벌 메타 업그레이드 컬렉션 씬.
 * 두 개의 탭으로 구성된다: (1) 메타 업그레이드 - 다이아몬드로 10개 글로벌 업그레이드 구매,
 * (2) 합성 도감 - MergeCodexScene으로 이동하여 합성 레시피를 열람한다.
 * 카테고리별(전투/경제/생존/성장) 스크롤 리스트로 업그레이드 항목을 제공한다.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, SAVE_KEY,
  GLOBAL_META, calcGlobalUpgradeCost,
  BTN_PRIMARY, BTN_META,
} from '../config.js';
import { t } from '../i18n.js';

// ── 레이아웃 상수 ─────────────────────────────────────────────

/** @const {number} 탭 바 Y 좌표 */
const TAB_Y = 48;
/** @const {number} 탭 바 높이 */
const TAB_H = 36;
/** @const {number} 탭 버튼 너비 */
const TAB_W = 165;

/** @const {number} 업그레이드 리스트 시작 Y (탭 바 아래) */
const LIST_START_Y = 92;
/** @const {number} 카테고리 헤더 높이 */
const CATEGORY_H = 28;
/** @const {number} 업그레이드 항목 높이 */
const ITEM_H = 56;
/** @const {number} 항목 간 간격 */
const ITEM_GAP = 4;
/** @const {number} 좌우 패딩 */
const PADDING_X = 12;
/** @const {number} 항목 너비 */
const ITEM_W = GAME_WIDTH - PADDING_X * 2;

/** @const {string[][]} 카테고리별 업그레이드 항목 표시 순서 */
const CATEGORY_ORDER = [
  { id: 'combat',   keys: ['damage', 'fireRate', 'range'] },
  { id: 'economy',  keys: ['startGold', 'killGold', 'drawDiscount', 'mergeDiscount'] },
  { id: 'survival', keys: ['baseHp', 'waveBonus'] },
  { id: 'growth',   keys: ['diamondBonus'] },
];

/**
 * 컬렉션(글로벌 메타 업그레이드) 씬 클래스.
 * 다이아몬드 재화를 사용하여 10개 글로벌 업그레이드를 구매하는 화면이다.
 * @extends Phaser.Scene
 */
export class CollectionScene extends Phaser.Scene {
  /**
   * CollectionScene 인스턴스를 생성한다.
   */
  constructor() {
    super({ key: 'CollectionScene' });
  }

  /**
   * 씬 초기 상태를 설정한다.
   * 매 씬 시작 시 호출되어 상태 변수를 초기화한다.
   */
  init() {
    /** @type {object} 현재 세이브 데이터 참조 */
    this.saveData = null;

    /** @type {Phaser.GameObjects.Text|null} 다이아몬드 보유량 텍스트 */
    this.diamondText = null;

    /** @type {'meta'|'codex'} 현재 활성 메인 탭 */
    this.activeTab = 'meta';

    /** @type {Phaser.GameObjects.Container|null} 탭 콘텐츠 컨테이너 */
    this.tabContent = null;

    /** @type {number} 스크롤 Y 오프셋 */
    this._scrollY = 0;

    /** @type {boolean} 드래그 스크롤 중 여부 */
    this._scrollDragging = false;

    /** @type {number} 드래그 시작 Y */
    this._scrollDragStartY = 0;

    /** @type {number} 드래그 시작 시점 스크롤 */
    this._scrollDragStartScroll = 0;

    /** @type {number} 최대 스크롤 오프셋 */
    this._maxScroll = 0;

    /** @type {Phaser.GameObjects.Container|null} 스크롤 가능 컨테이너 */
    this._scrollContainer = null;
  }

  /**
   * 컬렉션 UI를 생성한다.
   * 배경, 상단 바, 탭 바를 구성하고 기본 탭(메타 업그레이드)을 표시한다.
   */
  create() {
    this.saveData = this.registry.get('saveData') || {};

    // 배경
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    this._createTopBar();
    this._createTabBar();
    this._showTab(this.activeTab);

    // 마이그레이션 환불 토스트 표시
    if (this.saveData._metaRefundAmount) {
      const refund = this.saveData._metaRefundAmount;
      delete this.saveData._metaRefundAmount;
      this._save();
      this._showRefundToast(refund);
    }
  }

  // ── 상단 바 ─────────────────────────────────────────────────

  /**
   * 상단 내비게이션 바를 생성한다.
   * BACK 버튼(MenuScene 복귀), COLLECTION 타이틀, 다이아몬드 보유량을 포함한다.
   * @private
   */
  _createTopBar() {
    // 배경 (depth 10: 스크롤 컨텐츠 위에 표시)
    this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH, 48, COLORS.HUD_BG)
      .setDepth(10);

    // BACK 버튼 - 메인 메뉴로 복귀
    const backBg = this.add.rectangle(38, 24, 60, 28, 0x000000, 0)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);

    this.add.text(38, 24, t('ui.backNav'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);

    backBg.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // 타이틀
    this.add.text(180, 24, t('collection.title'), {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // 다이아몬드 보유량 표시
    const diamond = this.saveData.diamond || 0;
    this.diamondText = this.add.text(352, 24, `\u25C6 ${diamond}`, {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
    }).setOrigin(1, 0.5).setDepth(10);
  }

  /**
   * 다이아몬드 보유량 텍스트를 현재 세이브 데이터 기준으로 갱신한다.
   * @private
   */
  _refreshDiamondDisplay() {
    if (this.diamondText) {
      this.diamondText.setText(`\u25C6 ${this.saveData.diamond || 0}`);
    }
  }

  // ── 탭 바 ──────────────────────────────────────────────────

  /**
   * "메타 업그레이드"와 "합성 도감" 두 개의 메인 탭 바를 생성한다.
   * @private
   */
  _createTabBar() {
    this._tabBarContainer = this.add.container(0, 0).setDepth(10);
    this._renderTabBar();
  }

  /**
   * 현재 활성 탭 상태를 반영하여 탭 바 버튼을 (재)렌더링한다.
   * 활성 탭은 하단 강조선과 볼드 텍스트로 표시한다.
   * @private
   */
  _renderTabBar() {
    if (this._tabBarContainer) this._tabBarContainer.removeAll(true);

    const tabCenterY = TAB_Y + TAB_H / 2;
    const leftX = GAME_WIDTH / 2 - TAB_W / 2 - 2;
    const rightX = GAME_WIDTH / 2 + TAB_W / 2 + 2;

    // 메타 업그레이드 탭
    const metaActive = this.activeTab === 'meta';
    const metaBg = this.add.rectangle(leftX, tabCenterY, TAB_W, TAB_H,
      metaActive ? COLORS.UI_PANEL : COLORS.BACKGROUND);
    this._tabBarContainer.add(metaBg);

    if (metaActive) {
      const accentLine = this.add.rectangle(leftX, TAB_Y + TAB_H - 1, TAB_W, 2, COLORS.DIAMOND);
      this._tabBarContainer.add(accentLine);
    }

    const metaText = this.add.text(leftX, tabCenterY, t('collection.tab.meta'), {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: metaActive ? '#ffffff' : '#636e72',
      fontStyle: metaActive ? 'bold' : 'normal',
    }).setOrigin(0.5);
    this._tabBarContainer.add(metaText);

    metaBg.setInteractive({ useHandCursor: true });
    metaBg.on('pointerdown', () => {
      if (this.activeTab !== 'meta') {
        this.activeTab = 'meta';
        this._renderTabBar();
        this._showTab('meta');
      }
    });

    // 합성 도감 탭
    const codexActive = this.activeTab === 'codex';
    const codexBg = this.add.rectangle(rightX, tabCenterY, TAB_W, TAB_H,
      codexActive ? COLORS.UI_PANEL : COLORS.BACKGROUND);
    this._tabBarContainer.add(codexBg);

    if (codexActive) {
      const accentLine = this.add.rectangle(rightX, TAB_Y + TAB_H - 1, TAB_W, 2, COLORS.DIAMOND);
      this._tabBarContainer.add(accentLine);
    }

    const codexText = this.add.text(rightX, tabCenterY, t('collection.tab.codex'), {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: codexActive ? '#ffffff' : '#636e72',
      fontStyle: codexActive ? 'bold' : 'normal',
    }).setOrigin(0.5);
    this._tabBarContainer.add(codexText);

    // 합성 도감 탭에 신규 발견 빨간 점 표시
    const newDiscoveries = this.saveData.newDiscoveries || [];
    if (newDiscoveries.length > 0) {
      const redDot = this.add.graphics();
      redDot.fillStyle(0xff0000, 1);
      redDot.fillCircle(rightX + TAB_W / 2 - 8, tabCenterY - TAB_H / 2 + 8, 5);
      this._tabBarContainer.add(redDot);
    }

    codexBg.setInteractive({ useHandCursor: true });
    codexBg.on('pointerdown', () => {
      // 합성 도감은 별도 씬(MergeCodexScene)으로 전환
      this.scene.start('MergeCodexScene', { fromScene: 'CollectionScene' });
    });
  }

  /**
   * 탭 콘텐츠를 전환한다.
   * 기존 콘텐츠를 파괴하고 선택된 탭에 맞는 콘텐츠를 새로 구성한다.
   * @param {'meta'|'codex'} tab - 표시할 탭 식별자
   * @private
   */
  _showTab(tab) {
    this._cleanupScroll();
    if (this.tabContent) {
      this.tabContent.destroy();
      this.tabContent = null;
    }

    this.tabContent = this.add.container(0, 0).setDepth(5);

    if (tab === 'meta') {
      this._buildMetaTab();
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 탭 1: 글로벌 메타 업그레이드
  // ══════════════════════════════════════════════════════════════

  /**
   * 메타 업그레이드 탭의 콘텐츠를 구성한다.
   * 카테고리별 헤더 + 업그레이드 항목을 스크롤 가능한 리스트로 배치한다.
   * @private
   */
  _buildMetaTab() {
    // 스크롤 영역 마스크
    const scrollAreaH = GAME_HEIGHT - LIST_START_Y;
    const maskShape = this.add.rectangle(
      GAME_WIDTH / 2, LIST_START_Y + scrollAreaH / 2,
      GAME_WIDTH, scrollAreaH, 0x000000
    ).setVisible(false);
    this.tabContent.add(maskShape);

    this._scrollContainer = this.add.container(0, 0);
    this.tabContent.add(this._scrollContainer);

    const mask = maskShape.createGeometryMask();
    this._scrollContainer.setMask(mask);

    // 콘텐츠 배치
    let curY = LIST_START_Y;
    const globalUpgrades = this.saveData.globalUpgrades || {};

    for (const category of CATEGORY_ORDER) {
      // 카테고리 헤더
      curY = this._createCategoryHeader(category.id, curY);

      // 각 업그레이드 항목
      for (const key of category.keys) {
        this._createUpgradeItem(key, curY, globalUpgrades);
        curY += ITEM_H + ITEM_GAP;
      }

      // 카테고리 사이 여백
      curY += 4;
    }

    // 스크롤 범위 계산
    const totalContentH = curY - LIST_START_Y;
    this._maxScroll = Math.max(0, totalContentH - scrollAreaH + 10);
    this._scrollY = 0;

    // 드래그 스크롤 설정
    this._setupScroll();
  }

  /**
   * 카테고리 헤더를 생성한다.
   * @param {string} categoryId - 카테고리 ID (combat/economy/survival/growth)
   * @param {number} y - 시작 Y 좌표
   * @returns {number} 다음 항목 시작 Y 좌표
   * @private
   */
  _createCategoryHeader(categoryId, y) {
    const categoryName = t(`meta.category.${categoryId}`);
    const cfg = GLOBAL_META.upgrades;
    // 첫 번째 항목의 아이콘으로 카테고리 아이콘 결정
    const firstKey = CATEGORY_ORDER.find(c => c.id === categoryId)?.keys[0];
    const icon = firstKey ? cfg[firstKey].icon : '';

    // 구분선 + 카테고리 이름
    const lineY = y + CATEGORY_H / 2;

    const lineL = this.add.rectangle(40, lineY, 40, 1, 0x636e72).setAlpha(0.4);
    this._scrollContainer.add(lineL);

    const headerText = this.add.text(GAME_WIDTH / 2, lineY, `${icon} ${categoryName}`, {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this._scrollContainer.add(headerText);

    const lineR = this.add.rectangle(GAME_WIDTH - 40, lineY, 40, 1, 0x636e72).setAlpha(0.4);
    this._scrollContainer.add(lineR);

    return y + CATEGORY_H;
  }

  /**
   * 개별 업그레이드 항목을 생성한다.
   * 아이콘 + 이름 + 프로그레스 바 + 레벨 + 비용/강화 버튼으로 구성된다.
   * @param {string} key - 업그레이드 키
   * @param {number} y - 항목 시작 Y 좌표
   * @param {object} globalUpgrades - 현재 글로벌 업그레이드 레벨 맵
   * @private
   */
  _createUpgradeItem(key, y, globalUpgrades) {
    const cfg = GLOBAL_META.upgrades[key];
    if (!cfg) return;

    const currentLevel = globalUpgrades[key] || 0;
    const maxLevel = cfg.maxLevel || GLOBAL_META.MAX_LEVEL;
    const isMax = currentLevel >= maxLevel;
    const cost = isMax ? 0 : calcGlobalUpgradeCost(currentLevel);
    const canAfford = !isMax && (this.saveData.diamond || 0) >= cost;

    const cx = GAME_WIDTH / 2;
    const cy = y + ITEM_H / 2;

    // 카드 배경
    const colorCSS = '#' + cfg.color.toString(16).padStart(6, '0');
    const bg = this.add.rectangle(cx, cy, ITEM_W, ITEM_H, COLORS.UI_PANEL)
      .setStrokeStyle(1, isMax ? 0xffd700 : 0x333355);
    this._scrollContainer.add(bg);

    // 아이콘 (좌측)
    const iconX = PADDING_X + 22;
    const iconText = this.add.text(iconX, cy - 4, cfg.icon, {
      fontSize: '20px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
    }).setOrigin(0.5);
    this._scrollContainer.add(iconText);

    // 업그레이드 이름 (아이콘 우측)
    const nameX = PADDING_X + 46;
    const nameText = this.add.text(nameX, cy - 12, t(`meta.upgrade.${key}`), {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this._scrollContainer.add(nameText);

    // 현재 효과 수치
    const effectStr = this._getEffectString(key, currentLevel);
    const effectText = this.add.text(nameX, cy + 10, effectStr, {
      fontSize: '10px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: currentLevel > 0 ? colorCSS : '#636e72',
    }).setOrigin(0, 0.5);
    this._scrollContainer.add(effectText);

    // 프로그레스 바 (중앙)
    const barX = PADDING_X + 150;
    const barW = 80;
    const barH = 8;
    const barY = cy - 8;

    // 바 배경
    const barBg = this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x222233)
      .setStrokeStyle(1, 0x333355);
    this._scrollContainer.add(barBg);

    // 바 채우기
    const fillW = Math.max(1, (currentLevel / maxLevel) * barW);
    if (currentLevel > 0) {
      const barFill = this.add.rectangle(
        barX + fillW / 2, barY, fillW, barH - 2, cfg.color
      );
      this._scrollContainer.add(barFill);
    }

    // 레벨 텍스트 (바 우측)
    const levelStr = t('meta.level').replace('{cur}', currentLevel).replace('{max}', maxLevel);
    const levelText = this.add.text(barX + barW / 2, barY + 14, levelStr, {
      fontSize: '9px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: isMax ? '#ffd700' : '#b2bec3',
    }).setOrigin(0.5);
    this._scrollContainer.add(levelText);

    // 강화 버튼 또는 MAX 표시 (우측)
    const btnX = GAME_WIDTH - PADDING_X - 38;
    if (isMax) {
      const maxText = this.add.text(btnX, cy, t('meta.max'), {
        fontSize: '14px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this._scrollContainer.add(maxText);
    } else {
      // 비용 표시
      const costText = this.add.text(btnX, cy - 10, `\u25C6${cost}`, {
        fontSize: '10px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: canAfford ? COLORS.DIAMOND_CSS : '#ff4757',
      }).setOrigin(0.5);
      this._scrollContainer.add(costText);

      // 강화 버튼
      const btnBg = this.add.rectangle(btnX, cy + 8, 52, 20,
        canAfford ? BTN_META : 0x333355)
        .setStrokeStyle(1, canAfford ? COLORS.DIAMOND : 0x444466)
        .setInteractive({ useHandCursor: true });
      this._scrollContainer.add(btnBg);

      const btnLabel = this.add.text(btnX, cy + 8, t('meta.upgrade.button'), {
        fontSize: '10px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: canAfford ? '#ffffff' : '#636e72',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this._scrollContainer.add(btnLabel);

      btnBg.on('pointerdown', () => {
        this._onUpgradeClick(key);
      });
    }
  }

  /**
   * 현재 효과 문자열을 생성한다.
   * @param {string} key - 업그레이드 키
   * @param {number} level - 현재 레벨
   * @returns {string} 효과 설명 문자열
   * @private
   */
  _getEffectString(key, level) {
    if (level === 0) return t(`meta.desc.${key}`);

    switch (key) {
      case 'damage':
      case 'range':
      case 'killGold':
      case 'waveBonus':
      case 'diamondBonus': {
        const pct = Math.round((Math.pow(1.1, level) - 1) * 100);
        return t('meta.bonus.percent').replace('{pct}', pct);
      }
      case 'fireRate': {
        const pct = Math.round((1 - Math.pow(0.9, level)) * 100);
        return t('meta.bonus.percent').replace('{pct}', pct);
      }
      case 'startGold': {
        const val = 20 * level;
        return t('meta.bonus.flat').replace('{val}', val + 'G');
      }
      case 'baseHp': {
        const val = 3 * level;
        return t('meta.bonus.flat').replace('{val}', val + ' HP');
      }
      case 'drawDiscount':
      case 'mergeDiscount': {
        const pct = Math.round((1 - Math.pow(0.95, level)) * 100);
        return t('meta.bonus.discount').replace('{pct}', pct);
      }
      default:
        return '';
    }
  }

  /**
   * 업그레이드 강화 버튼 클릭 처리.
   * 다이아 차감 → 레벨 증가 → 세이브 → UI 갱신
   * @param {string} key - 업그레이드 키
   * @private
   */
  _onUpgradeClick(key) {
    const globalUpgrades = this.saveData.globalUpgrades || {};
    const currentLevel = globalUpgrades[key] || 0;
    const cfg = GLOBAL_META.upgrades[key];
    const maxLevel = cfg?.maxLevel || GLOBAL_META.MAX_LEVEL;

    if (currentLevel >= maxLevel) return;

    const cost = calcGlobalUpgradeCost(currentLevel);
    if ((this.saveData.diamond || 0) < cost) return;

    // 다이아 차감 및 레벨 증가
    this.saveData.diamond -= cost;
    if (!this.saveData.globalUpgrades) {
      this.saveData.globalUpgrades = {};
    }
    this.saveData.globalUpgrades[key] = currentLevel + 1;

    // 세이브 및 UI 갱신
    this._save();
    this._refreshDiamondDisplay();
    this._rebuildMetaContent();

    // 강화 효과음
    const soundManager = this.registry.get('soundManager');
    if (soundManager) {
      soundManager.playSfx('sfx_upgrade');
    }
  }

  /**
   * 메타 탭 콘텐츠를 완전히 재구축한다.
   * 스크롤 위치를 보존하면서 모든 항목을 새로 그린다.
   * @private
   */
  _rebuildMetaContent() {
    const savedScroll = this._scrollY;
    this._cleanupScroll();
    if (this.tabContent) {
      this.tabContent.destroy();
      this.tabContent = null;
    }
    this.tabContent = this.add.container(0, 0).setDepth(5);
    this._buildMetaTab();
    // 스크롤 위치 복원
    this._scrollY = Math.min(savedScroll, this._maxScroll);
    this._applyScroll();
  }

  // ── 드래그 스크롤 ──────────────────────────────────────────

  /**
   * 드래그 스크롤을 설정한다.
   * @private
   */
  _setupScroll() {
    this._scrollHandler_down = (pointer) => {
      if (pointer.y < LIST_START_Y) return;
      this._scrollDragging = true;
      this._scrollDragStartY = pointer.y;
      this._scrollDragStartScroll = this._scrollY;
    };

    this._scrollHandler_move = (pointer) => {
      if (!this._scrollDragging) return;
      const dy = pointer.y - this._scrollDragStartY;
      this._scrollY = Phaser.Math.Clamp(
        this._scrollDragStartScroll - dy,
        0, this._maxScroll
      );
      this._applyScroll();
    };

    this._scrollHandler_up = () => {
      this._scrollDragging = false;
    };

    this.input.on('pointerdown', this._scrollHandler_down);
    this.input.on('pointermove', this._scrollHandler_move);
    this.input.on('pointerup', this._scrollHandler_up);
  }

  /**
   * 현재 스크롤 오프셋을 컨테이너에 적용한다.
   * @private
   */
  _applyScroll() {
    if (this._scrollContainer) {
      this._scrollContainer.y = -this._scrollY;
    }
  }

  /**
   * 스크롤 이벤트 리스너를 정리한다.
   * @private
   */
  _cleanupScroll() {
    this._scrollDragging = false;
    if (this._scrollHandler_down) {
      this.input.off('pointerdown', this._scrollHandler_down);
      this._scrollHandler_down = null;
    }
    if (this._scrollHandler_move) {
      this.input.off('pointermove', this._scrollHandler_move);
      this._scrollHandler_move = null;
    }
    if (this._scrollHandler_up) {
      this.input.off('pointerup', this._scrollHandler_up);
      this._scrollHandler_up = null;
    }
  }

  // ── 세이브 ──────────────────────────────────────────────────

  /**
   * 세이브 데이터를 localStorage에 저장하고 레지스트리를 갱신한다.
   * @private
   */
  _save() {
    this.registry.set('saveData', this.saveData);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveData));
    } catch (e) {
      // localStorage 쓰기 실패 무시
    }
  }

  // ── 환불 토스트 ─────────────────────────────────────────────

  /**
   * 마이그레이션 환불 토스트를 표시한다.
   * @param {number} amount - 환불된 다이아 수량
   * @private
   */
  _showRefundToast(amount) {
    const msg = t('meta.refund.toast').replace('{amount}', amount);
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, msg, {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
      fontStyle: 'bold',
      backgroundColor: '#1a1a2e',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: GAME_HEIGHT - 120,
      duration: 1500,
      delay: 3000,
      onComplete: () => toast.destroy(),
    });
  }
}
