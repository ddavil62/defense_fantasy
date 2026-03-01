/**
 * @fileoverview CollectionScene - 타워 메타 업그레이드 컬렉션 씬.
 * 두 개의 탭으로 구성된다: (1) 메타 업그레이드 - 다이아몬드로 영구 업그레이드 구매,
 * (2) 합성 도감 - MergeCodexScene으로 이동하여 합성 레시피를 열람한다.
 * 타워 카드 그리드, 유틸리티 업그레이드, 잠금 해제 팝업, 상세 오버레이를 제공한다.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, SAVE_KEY,
  TOWER_STATS, META_UPGRADE_TREE, UTILITY_UPGRADES,
  BTN_PRIMARY, BTN_META, TOWER_UNLOCK_MAP,
} from '../config.js';
import { t } from '../i18n.js';

// ── 타워 카드 그리드 상수 ─────────────────────────────────────

/** @const {string[]} 타워 카드 표시 순서 */
const TOWER_ORDER = [
  'archer', 'mage', 'ice', 'lightning',
  'flame', 'rock', 'poison', 'wind',
  'light', 'dragon',
];

/** @const {string[]} 유틸리티 업그레이드 표시 순서 */
const UTILITY_ORDER = ['baseHp', 'goldBoost', 'waveBonus'];

/** @const {number} 타워 카드 너비 (px) */
const CARD_W = 76;
/** @const {number} 타워 카드 높이 (px) */
const CARD_H = 90;
/** @const {number} 카드 간 간격 (px) */
const CARD_GAP = 8;
/** @const {number} 그리드 열 수 */
const META_GRID_COLS = 4;
/** @const {number} 그리드 시작 X 좌표 */
const META_GRID_X = 16;
/** @const {number} 그리드 시작 Y 좌표 (탭 바 아래) */
const META_GRID_Y = 96;

/** @const {number} 유틸리티 카드 너비 (px) */
const UTIL_W = 104;
/** @const {number} 유틸리티 카드 높이 (px) */
const UTIL_H = 80;

// ── 탭 바 상수 ────────────────────────────────────────────────

/** @const {number} 탭 바 Y 좌표 */
const TAB_Y = 48;
/** @const {number} 탭 바 높이 */
const TAB_H = 36;
/** @const {number} 탭 버튼 너비 */
const TAB_W = 165;


/**
 * 컬렉션(메타 업그레이드) 씬 클래스.
 * 다이아몬드 재화를 사용하여 타워별 영구 강화와 유틸리티 업그레이드를 구매하는 화면이다.
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

    /** @type {Phaser.GameObjects.Container|null} 현재 활성 오버레이 컨테이너 */
    this.overlay = null;

    /** @type {'meta'|'codex'} 현재 활성 메인 탭 */
    this.activeTab = 'meta';

    /** @type {Phaser.GameObjects.Container|null} 탭 콘텐츠 컨테이너 */
    this.tabContent = null;
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
  }

  // ── 상단 바 ─────────────────────────────────────────────────

  /**
   * 상단 내비게이션 바를 생성한다.
   * BACK 버튼(MenuScene 복귀), COLLECTION 타이틀, 다이아몬드 보유량을 포함한다.
   * @private
   */
  _createTopBar() {
    // 배경
    this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH, 48, COLORS.HUD_BG);

    // BACK 버튼 - 메인 메뉴로 복귀
    const backBg = this.add.rectangle(38, 24, 60, 28, 0x000000, 0)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true });

    this.add.text(38, 24, '< BACK', {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    backBg.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // 타이틀
    this.add.text(180, 24, 'COLLECTION', {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 다이아몬드 보유량 표시
    const diamond = this.saveData.diamond || 0;
    this.diamondText = this.add.text(352, 24, `\u25C6 ${diamond}`, {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
    }).setOrigin(1, 0.5);
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
  // 탭 1: 메타 업그레이드
  // ══════════════════════════════════════════════════════════════

  /**
   * 메타 업그레이드 탭의 콘텐츠를 구성한다.
   * 타워 카드 그리드와 유틸리티 업그레이드 섹션으로 구성된다.
   * @private
   */
  _buildMetaTab() {
    this._createTowerCards();
    this._createUtilitySection();
  }

  // ── 타워 카드 그리드 ────────────────────────────────────────

  /**
   * 타워 카드 그리드를 4-4-2 레이아웃으로 생성한다.
   * 총 10종의 타워를 4열로 배치한다.
   * @private
   */
  _createTowerCards() {
    for (let i = 0; i < TOWER_ORDER.length; i++) {
      const type = TOWER_ORDER[i];
      const col = i % META_GRID_COLS;
      const row = Math.floor(i / META_GRID_COLS);
      const x = META_GRID_X + col * (CARD_W + CARD_GAP);
      const y = META_GRID_Y + row * (CARD_H + CARD_GAP);
      this._createTowerCard(type, x, y);
    }
  }

  /**
   * 개별 타워 카드를 생성한다.
   * 잠금된 타워는 자물쇠 아이콘과 해제 비용을 표시하고,
   * 잠금 해제된 타워는 아이콘, 이름, 현재 메타 티어를 표시한다.
   * @param {string} type - 타워 타입 키
   * @param {number} x - 카드 좌상단 X 좌표
   * @param {number} y - 카드 좌상단 Y 좌표
   * @private
   */
  _createTowerCard(type, x, y) {
    const stats = TOWER_STATS[type];
    const unlockedTowers = this.saveData.unlockedTowers || [];
    const isUnlocked = !stats.locked || unlockedTowers.includes(type);

    const cx = x + CARD_W / 2;
    const cy = y + CARD_H / 2;

    if (!isUnlocked) {
      // ── 잠금된 타워 카드 ──
      const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, COLORS.BACKGROUND)
        .setAlpha(0.6)
        .setStrokeStyle(2, 0x636e72)
        .setInteractive({ useHandCursor: true });
      this.tabContent.add(bg);

      // 자물쇠 아이콘
      const lockG = this.add.graphics();
      lockG.fillStyle(0x636e72, 0.8);
      lockG.fillRect(cx - 7, y + 20 - 2, 14, 10);
      lockG.lineStyle(2, 0x636e72, 0.8);
      lockG.beginPath();
      lockG.arc(cx, y + 20 - 2, 5, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0), false);
      lockG.strokePath();
      lockG.fillStyle(COLORS.BACKGROUND, 1);
      lockG.fillCircle(cx, y + 20 + 2, 2);
      this.tabContent.add(lockG);

      // 타워 이름
      const nameText = this.add.text(cx, y + 52, stats.displayName, {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      this.tabContent.add(nameText);

      // 해금 조건 (월드 클리어)
      const unlockWorld = stats.unlockWorld;
      const worldName = unlockWorld ? t(`world.${unlockWorld}.name`) : '';
      const condText = this.add.text(cx, y + 68, `${worldName}`, {
        fontSize: '10px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      this.tabContent.add(condText);

      bg.on('pointerdown', () => {
        this._showTowerUnlockPopup(type);
      });
    } else {
      // ── 잠금 해제된 타워 카드 ──
      const borderColor = stats.color;
      const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, COLORS.UI_PANEL)
        .setStrokeStyle(2, borderColor)
        .setInteractive({ useHandCursor: true });
      this.tabContent.add(bg);

      // 타워 아이콘 (0.6배 축소)
      const iconG = this.add.graphics();
      this._drawTowerIcon(iconG, type, cx, y + 20, 0.6);
      this.tabContent.add(iconG);

      // 타워 이름
      const nameText = this.add.text(cx, y + 52, stats.displayName, {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.tabContent.add(nameText);

      // 현재 메타 업그레이드 티어
      const maxTier = this._getMaxMetaTier(type);
      const tierStr = maxTier > 0 ? `Lv.${maxTier}` : 'Lv.0';
      const tierText = this.add.text(cx, y + 68, tierStr, {
        fontSize: '11px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
      }).setOrigin(0.5);
      this.tabContent.add(tierText);

      bg.on('pointerdown', () => {
        this._showTowerDetailView(type);
      });
    }
  }

  /**
   * 해당 타워의 최고 완료 메타 업그레이드 티어를 반환한다.
   * @param {string} type - 타워 타입 키
   * @returns {number} 최고 티어 (0~3)
   * @private
   */
  _getMaxMetaTier(type) {
    const upgrades = this.saveData.towerUpgrades?.[type];
    if (!upgrades) return 0;
    if (upgrades.tier3) return 3;
    if (upgrades.tier2) return 2;
    if (upgrades.tier1) return 1;
    return 0;
  }

  // ── 타워 아이콘 그리기 ──────────────────────────────────────

  /**
   * 타워 타입에 맞는 아이콘을 지정된 크기로 그래픽 오브젝트에 그린다.
   * 각 타워별 고유 도형을 scale 배율로 축소/확대하여 렌더링한다.
   * @param {Phaser.GameObjects.Graphics} g - 그래픽 오브젝트
   * @param {string} type - 타워 타입 키
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @param {number} scale - 크기 배율
   * @private
   */
  _drawTowerIcon(g, type, x, y, scale) {
    const color = TOWER_STATS[type].color;
    g.clear();

    switch (type) {
      case 'archer': {
        const s = 14 * scale;
        g.fillStyle(color, 1);
        g.fillTriangle(x, y - s / 2, x - s / 2, y + s / 2, x + s / 2, y + s / 2);
        break;
      }
      case 'mage':
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 8 * scale);
        break;
      case 'ice': {
        const sz = 6 * scale;
        g.fillStyle(color, 1);
        g.fillPoints([
          { x: x, y: y - sz },
          { x: x + sz, y: y },
          { x: x, y: y + sz },
          { x: x - sz, y: y },
        ], true);
        break;
      }
      case 'lightning': {
        const w = 5 * scale;
        const h = 10 * scale;
        g.lineStyle(2 * scale, color, 1);
        g.lineBetween(x - w, y - h, x + w, y - h * 0.2);
        g.lineBetween(x + w, y - h * 0.2, x - w, y + h * 0.2);
        g.lineBetween(x - w, y + h * 0.2, x + w, y + h);
        break;
      }
      case 'flame': {
        g.fillStyle(color, 1);
        g.fillCircle(x, y + 2 * scale, 7 * scale);
        g.fillStyle(0xfdcb6e, 0.9);
        const offsets = [-4, 0, 4];
        for (const ox of offsets) {
          g.fillTriangle(
            x + ox * scale, y - 8 * scale,
            x + (ox - 2) * scale, y - 3 * scale,
            x + (ox + 2) * scale, y - 3 * scale
          );
        }
        break;
      }
      case 'rock': {
        const r = 8 * scale;
        const points = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillStyle(color, 1);
        g.fillPoints(points, true);
        break;
      }
      case 'poison': {
        const r = 7 * scale;
        const points = [];
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillStyle(color, 1);
        g.fillPoints(points, true);
        break;
      }
      case 'wind': {
        g.fillStyle(color, 1);
        g.slice(x, y, 8 * scale, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
        g.fillPath();
        g.lineStyle(1.5 * scale, color, 0.7);
        for (let i = 0; i < 3; i++) {
          g.lineBetween(
            x + (-4 + i * 4) * scale, y + 2 * scale,
            x + (-2 + i * 4) * scale, y + 7 * scale
          );
        }
        break;
      }
      case 'light': {
        const r = 7 * scale;
        const points = [];
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillStyle(color, 1);
        g.fillPoints(points, true);
        break;
      }
      case 'dragon': {
        // 원형 몸체 + 금색 테두리 + X자 교차선
        const r = 10 * scale;
        g.fillStyle(color, 1);
        g.fillCircle(x, y, r);
        g.lineStyle(2 * scale, 0xffd700, 1);
        g.strokeCircle(x, y, r);
        g.lineStyle(2 * scale, color, 0.8);
        g.lineBetween(x - 8 * scale, y - 6 * scale, x + 8 * scale, y + 6 * scale);
        g.lineBetween(x + 8 * scale, y - 6 * scale, x - 8 * scale, y + 6 * scale);
        break;
      }
    }
  }

  // ── 유틸리티 업그레이드 섹션 ────────────────────────────────

  /**
   * 유틸리티 업그레이드 섹션(헤더 + 카드 3장)을 생성한다.
   * baseHp(기지 체력), goldBoost(초기 골드), waveBonus(웨이브 보너스) 3종을 표시한다.
   * @private
   */
  _createUtilitySection() {
    // 섹션 헤더
    const headerY = 390;
    const headerText = this.add.text(GAME_WIDTH / 2, headerY, '── UTILITY ──', {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#636e72',
    }).setOrigin(0.5);
    this.tabContent.add(headerText);

    // 좌우 장식 선
    const lineL = this.add.rectangle(60, headerY, 80, 1, 0x636e72).setAlpha(0.3);
    const lineR = this.add.rectangle(300, headerY, 80, 1, 0x636e72).setAlpha(0.3);
    this.tabContent.add(lineL);
    this.tabContent.add(lineR);

    // 유틸리티 카드 생성
    const utilStartX = 16;
    const utilY = 410;
    for (let i = 0; i < UTILITY_ORDER.length; i++) {
      const key = UTILITY_ORDER[i];
      const x = utilStartX + i * (UTIL_W + CARD_GAP);
      this._createUtilityCard(key, x, utilY);
    }
  }

  /**
   * 개별 유틸리티 업그레이드 카드를 생성한다.
   * 아이콘, 이름, 현재 티어, 현재 효과를 표시하며 클릭 시 상세 뷰를 연다.
   * @param {string} key - 유틸리티 업그레이드 키 ('baseHp' | 'goldBoost' | 'waveBonus')
   * @param {number} x - 카드 좌상단 X 좌표
   * @param {number} y - 카드 좌상단 Y 좌표
   * @private
   */
  _createUtilityCard(key, x, y) {
    const util = UTILITY_UPGRADES[key];
    const tier = this.saveData.utilityUpgrades?.[key] || 0;
    const maxTier = util.tiers.length;

    const cx = x + UTIL_W / 2;
    const cy = y + UTIL_H / 2;

    // 업그레이드가 있으면 금색, 없으면 회색 테두리
    const borderColor = tier > 0 ? 0xffd700 : 0x636e72;
    const bg = this.add.rectangle(cx, cy, UTIL_W, UTIL_H, COLORS.UI_PANEL)
      .setStrokeStyle(1, borderColor)
      .setInteractive({ useHandCursor: true });
    this.tabContent.add(bg);

    // 아이콘 (카드 상단 중앙)
    const iconG = this.add.graphics();
    this._drawUtilityIcon(iconG, key, cx, y + 18);
    this.tabContent.add(iconG);

    // 이름 (아이콘 아래 중앙 정렬)
    const nameText = this.add.text(cx, y + 34, util.name, {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);
    this.tabContent.add(nameText);

    // 현재 티어 표시
    const tierText = this.add.text(cx, y + 52, `Tier ${tier}/${maxTier}`, {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);
    this.tabContent.add(tierText);

    // 현재 효과 텍스트 (티어 0이면 기본값 표시)
    let effectStr = '';
    if (tier === 0) {
      effectStr = key === 'baseHp' ? 'HP: 20' : key === 'goldBoost' ? '250G' : '1.0x';
    } else {
      effectStr = util.tiers[tier - 1].desc;
    }
    const effectText = this.add.text(cx, y + 66, effectStr, {
      fontSize: '10px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.tabContent.add(effectText);

    bg.on('pointerdown', () => {
      this._showUtilityDetailView(key);
    });
  }

  /**
   * 유틸리티 아이콘을 그래픽 오브젝트에 그린다.
   * 하트(baseHp), 동전(goldBoost), 별(waveBonus) 아이콘을 지원한다.
   * @param {Phaser.GameObjects.Graphics} g - 그래픽 오브젝트
   * @param {string} key - 유틸리티 키
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @private
   */
  _drawUtilityIcon(g, key, x, y) {
    const util = UTILITY_UPGRADES[key];
    const color = util.iconColor;

    switch (util.icon) {
      case 'heart': {
        // 하트 아이콘: 원 2개 + 삼각형
        g.fillStyle(color, 1);
        g.fillCircle(x - 3, y - 2, 4);
        g.fillCircle(x + 3, y - 2, 4);
        g.fillTriangle(x - 7, y - 1, x + 7, y - 1, x, y + 6);
        break;
      }
      case 'coin': {
        // 동전 아이콘: 이중 원
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 6);
        g.fillStyle(0x1a1a2e, 1);
        g.fillCircle(x, y, 3);
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 1.5);
        break;
      }
      case 'star': {
        // 별 아이콘: 10개 꼭짓점 (외/내 반지름 교차)
        g.fillStyle(color, 1);
        const points = [];
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 2 / 10) * i - Math.PI / 2;
          const r = i % 2 === 0 ? 7 : 3;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillPoints(points, true);
        break;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 오버레이 (메타 업그레이드 상세, 유틸리티 상세, 타워 잠금 해제)
  // ══════════════════════════════════════════════════════════════

  // ── 타워 메타 업그레이드 상세 뷰 ───────────────────────────

  /**
   * 타워 메타 업그레이드 상세 오버레이를 표시한다.
   * 3개 티어 각각에 A/B 옵션 버튼, 현재 보너스 요약을 포함한다.
   * @param {string} type - 타워 타입 키
   * @private
   */
  _showTowerDetailView(type) {
    if (this.overlay) this.overlay.destroy();

    const stats = TOWER_STATS[type];
    const treeData = META_UPGRADE_TREE[type];
    const upgrades = this.saveData.towerUpgrades?.[type] || {};

    this.overlay = this.add.container(0, 0).setDepth(50);

    // 어두운 배경 막
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.7)
      .setInteractive();
    this.overlay.add(backdrop);

    // 오버레이 패널
    const panelW = 320;
    const panelH = 556;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, stats.color);
    this.overlay.add(panelBg);

    // 닫기 버튼 [X]
    const closeX = panelX + panelW / 2 - 20;
    const closeY = panelTop + 15;
    const closeBg = this.add.circle(closeX, closeY, 12, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(closeBg);

    const closeText = this.add.text(closeX, closeY, 'X', {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(closeText);

    closeBg.on('pointerdown', () => {
      this._closeOverlay();
      this._rebuildScene();
    });

    // 타워 아이콘 (1.5배 확대)
    const iconG = this.add.graphics();
    this._drawTowerIcon(iconG, type, panelX - 60, panelTop + 45, 1.5);
    this.overlay.add(iconG);

    // 타워 이름
    const nameText = this.add.text(panelX, panelTop + 38, stats.displayName, {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(nameText);

    // 현재 메타 티어 정보
    const maxTier = this._getMaxMetaTier(type);
    const branchStr = maxTier > 0 ? `Meta Tier ${maxTier}` : 'No meta upgrades';
    const branchText = this.add.text(panelX, panelTop + 60, branchStr, {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.overlay.add(branchText);

    // 플레이버 텍스트 (분위기)
    const flavorKey = `tower.${type}.flavor`;
    const flavorStr = t(flavorKey);
    if (flavorStr !== flavorKey) {
      const flavorText = this.add.text(panelX, panelTop + 80, flavorStr, {
        fontSize: '11px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#a0a0a0',
        fontStyle: 'italic',
      }).setOrigin(0.5);
      this.overlay.add(flavorText);
    }

    // 특징 설명 텍스트
    const descKey = `tower.${type}.desc`;
    const descStr = t(descKey);
    if (descStr !== descKey) {
      const descText = this.add.text(panelX, panelTop + 96, descStr, {
        fontSize: '11px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#d0d0d0',
      }).setOrigin(0.5);
      this.overlay.add(descText);
    }

    // 구분선
    const divider = this.add.rectangle(panelX, panelTop + 116, panelW - 40, 1, 0x636e72)
      .setAlpha(0.3);
    this.overlay.add(divider);

    // ── 티어별 A/B 옵션 섹션 (Tier 1~3) ──
    const tierStartY = panelTop + 131;
    const tierHeight = 85;

    for (let tier = 1; tier <= 3; tier++) {
      const tierY = tierStartY + (tier - 1) * tierHeight;
      const tierKey = `tier${tier}`;
      const tierData = treeData[tierKey];
      const choice = upgrades[tierKey] || null;
      // 이전 티어가 완료되어야 현재 티어 구매 가능
      const prevTierDone = tier === 1 || (upgrades[`tier${tier - 1}`] !== undefined && upgrades[`tier${tier - 1}`] !== null);

      // 티어 라벨
      const tierLabel = this.add.text(panelX - panelW / 2 + 25, tierY, `Tier ${tier}`, {
        fontSize: '14px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
      });
      this.overlay.add(tierLabel);

      // 옵션 A 버튼
      this._createUpgradeOptionBtn(
        panelX, tierY + 25, panelW - 40, 25,
        'A', tierData.a, choice, 'a', prevTierDone, type, tierKey
      );

      // 옵션 B 버튼
      this._createUpgradeOptionBtn(
        panelX, tierY + 54, panelW - 40, 25,
        'B', tierData.b, choice, 'b', prevTierDone, type, tierKey
      );
    }

    // ── 현재 보너스 요약 ──
    const summaryY = tierStartY + 3 * tierHeight + 10;
    const summaryHeader = this.add.text(panelX, summaryY, '── Current Bonuses ──', {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.overlay.add(summaryHeader);

    const bonusSummary = this._calcBonusSummary(type, upgrades);
    const summaryText = this.add.text(panelX, summaryY + 20, bonusSummary, {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
      align: 'center',
    }).setOrigin(0.5);
    this.overlay.add(summaryText);
  }

  /**
   * 티어 업그레이드 옵션(A 또는 B) 버튼을 생성한다.
   * 구매 가능 여부, 선택 상태, 잠금 상태에 따라 시각적 스타일이 달라진다.
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @param {number} w - 버튼 너비
   * @param {number} h - 버튼 높이
   * @param {string} label - 표시 라벨 ('A' 또는 'B')
   * @param {object} optionData - 옵션 데이터 { name, desc, cost, effects }
   * @param {string|null} currentChoice - 현재 티어에서 선택된 옵션 ('a'|'b'|null)
   * @param {string} optionKey - 옵션 식별자 ('a' 또는 'b')
   * @param {boolean} prevTierDone - 이전 티어 완료 여부
   * @param {string} towerType - 타워 타입 키
   * @param {string} tierKey - 티어 키 ('tier1', 'tier2', 'tier3')
   * @private
   */
  _createUpgradeOptionBtn(x, y, w, h, label, optionData, currentChoice, optionKey, prevTierDone, towerType, tierKey) {
    const diamond = this.saveData.diamond || 0;
    const isSelected = currentChoice === optionKey;
    const isOtherSelected = currentChoice !== null && currentChoice !== optionKey;
    const isLocked = !prevTierDone;
    const canAfford = diamond >= optionData.cost;
    const canBuy = !isSelected && !isOtherSelected && !isLocked && canAfford;

    // 상태별 버튼 스타일 결정
    let bgColor = COLORS.BACKGROUND;
    let borderColor = 0x636e72;
    let borderWidth = 1;
    let textColor = '#636e72';
    let costColor = '#636e72';

    if (isSelected) {
      // 이미 선택된 옵션: 타워 색상 배경 + 금색 텍스트
      bgColor = TOWER_STATS[towerType].color;
      borderColor = TOWER_STATS[towerType].color;
      borderWidth = 2;
      textColor = '#ffd700';
      costColor = '#ffd700';
    } else if (isOtherSelected) {
      // 다른 옵션이 선택됨: 비활성 회색
      bgColor = COLORS.BACKGROUND;
      borderColor = 0x636e72;
      borderWidth = 1;
      textColor = '#636e72';
    } else if (isLocked) {
      // 이전 티어 미완료: 잠금 상태
      bgColor = COLORS.WALL;
      borderColor = 0x636e72;
      borderWidth = 1;
      textColor = '#636e72';
    } else if (canAfford) {
      // 구매 가능: 다이아몬드 색 테두리 강조
      borderColor = COLORS.DIAMOND;
      borderWidth = 2;
      textColor = '#ffffff';
      costColor = COLORS.DIAMOND_CSS;
    }

    // 버튼 배경
    const bg = this.add.rectangle(x, y, w, h, bgColor, isSelected ? 0.3 : 1)
      .setStrokeStyle(borderWidth, borderColor);
    this.overlay.add(bg);

    if (canBuy) {
      bg.setInteractive({ useHandCursor: true });
    }

    // A/B 배지 (파란색/보라색 원)
    const badgeColor = optionKey === 'a' ? BTN_PRIMARY : BTN_META;
    const badge = this.add.circle(x - w / 2 + 14, y, 9, badgeColor);
    this.overlay.add(badge);

    const badgeText = this.add.text(x - w / 2 + 14, y, label, {
      fontSize: '10px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(badgeText);

    // 효과 설명 텍스트 (선택됨이면 체크 표시, 잠금이면 자물쇠)
    let descStr = optionData.desc;
    if (isSelected) descStr = '\u2713 ' + descStr;
    if (isLocked) descStr = '\uD83D\uDD12 ' + descStr;

    const descText = this.add.text(x - 10, y, descStr, {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: textColor,
    }).setOrigin(0.5);
    this.overlay.add(descText);

    // 비용 표시 (이미 구매한 경우 비용 숨김)
    const costStr = isSelected ? '' : `\u25C6 ${optionData.cost}`;
    const costText = this.add.text(x + w / 2 - 30, y, costStr, {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: costColor,
    }).setOrigin(0.5);
    this.overlay.add(costText);

    // 구매 클릭 핸들러
    if (canBuy) {
      bg.on('pointerdown', () => {
        this._purchaseTowerUpgrade(towerType, tierKey, optionKey, optionData.cost);
      });
    }
  }

  /**
   * 타워 메타 업그레이드를 구매한다.
   * 다이아몬드를 차감하고 세이브 데이터를 갱신한 뒤 상세 뷰를 새로고침한다.
   * @param {string} towerType - 타워 타입 키
   * @param {string} tierKey - 티어 키 ('tier1', 'tier2', 'tier3')
   * @param {string} choice - 선택 옵션 ('a' 또는 'b')
   * @param {number} cost - 다이아몬드 비용
   * @private
   */
  _purchaseTowerUpgrade(towerType, tierKey, choice, cost) {
    if ((this.saveData.diamond || 0) < cost) return;

    this.saveData.diamond -= cost;

    if (!this.saveData.towerUpgrades) this.saveData.towerUpgrades = {};
    if (!this.saveData.towerUpgrades[towerType]) {
      this.saveData.towerUpgrades[towerType] = { tier1: null, tier2: null, tier3: null };
    }
    this.saveData.towerUpgrades[towerType][tierKey] = choice;

    this._saveToDB(this.saveData);
    this._refreshDiamondDisplay();

    // 갱신된 정보로 상세 뷰 새로고침
    this._showTowerDetailView(towerType);
  }

  /**
   * 타워의 모든 메타 업그레이드 보너스 효과를 텍스트로 요약한다.
   * 곱연산과 덧셈을 각 스탯별로 누적하여 한 줄로 표시한다.
   * @param {string} type - 타워 타입 키
   * @param {object} upgrades - 업그레이드 상태 { tier1: 'a'|'b'|null, tier2: ..., tier3: ... }
   * @returns {string} 포맷된 보너스 요약 문자열
   * @private
   */
  _calcBonusSummary(type, upgrades) {
    const treeData = META_UPGRADE_TREE[type];
    const bonuses = {};

    for (let tier = 1; tier <= 3; tier++) {
      const choice = upgrades[`tier${tier}`];
      if (!choice) continue;
      const tierData = treeData[`tier${tier}`][choice];
      if (!tierData || !tierData.effects) continue;

      for (const effect of tierData.effects) {
        if (!bonuses[effect.stat]) {
          bonuses[effect.stat] = { multiply: 1, add: 0 };
        }
        if (effect.type === 'multiply') {
          bonuses[effect.stat].multiply *= effect.value;
        } else if (effect.type === 'add') {
          bonuses[effect.stat].add += effect.value;
        }
      }
    }

    if (Object.keys(bonuses).length === 0) {
      return 'No bonuses yet';
    }

    const lines = [];
    for (const [stat, val] of Object.entries(bonuses)) {
      const parts = [];
      if (val.multiply !== 1) {
        const pct = Math.round((val.multiply - 1) * 100);
        // fireRate의 곱연산이 1 미만이면 공격 속도 증가를 의미
        if (stat === 'fireRate') {
          const speedPct = Math.round((1 - val.multiply) * 100);
          parts.push(`+${speedPct}% speed`);
        } else {
          parts.push(`${pct >= 0 ? '+' : ''}${pct}%`);
        }
      }
      if (val.add !== 0) {
        parts.push(`+${val.add}`);
      }
      lines.push(`${stat}: ${parts.join(', ')}`);
    }
    return lines.join('  |  ');
  }

  // ── 유틸리티 업그레이드 상세 뷰 ────────────────────────────

  /**
   * 유틸리티 업그레이드 상세 오버레이를 표시한다.
   * 현재 상태, 각 티어 버튼, 비용을 포함한다.
   * @param {string} key - 유틸리티 키 ('baseHp' | 'goldBoost' | 'waveBonus')
   * @private
   */
  _showUtilityDetailView(key) {
    if (this.overlay) this.overlay.destroy();

    const util = UTILITY_UPGRADES[key];
    const currentTier = this.saveData.utilityUpgrades?.[key] || 0;

    this.overlay = this.add.container(0, 0).setDepth(50);

    // 어두운 배경 막
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.7)
      .setInteractive();
    this.overlay.add(backdrop);

    // 오버레이 패널
    const panelW = 300;
    const panelH = 350;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, 0x636e72);
    this.overlay.add(panelBg);

    // 닫기 버튼 [X]
    const closeX = panelX + panelW / 2 - 20;
    const closeY = panelTop + 15;
    const closeBg = this.add.circle(closeX, closeY, 12, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(closeBg);

    const closeText = this.add.text(closeX, closeY, 'X', {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(closeText);

    closeBg.on('pointerdown', () => {
      this._closeOverlay();
      this._rebuildScene();
    });

    // 아이콘 + 이름
    const iconG = this.add.graphics();
    this._drawUtilityIcon(iconG, key, panelX - 50, panelTop + 50);
    this.overlay.add(iconG);

    const nameText = this.add.text(panelX - 30, panelTop + 45, util.name, {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.overlay.add(nameText);

    // 현재 상태 텍스트
    let currentDesc = '';
    if (currentTier === 0) {
      currentDesc = key === 'baseHp' ? 'HP 20' : key === 'goldBoost' ? '250G' : '1.0x';
    } else {
      currentDesc = util.tiers[currentTier - 1].desc;
    }
    const statusText = this.add.text(panelX, panelTop + 75, `Current: ${currentDesc} (Tier ${currentTier}/${util.tiers.length})`, {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.overlay.add(statusText);

    // 구분선
    const divider = this.add.rectangle(panelX, panelTop + 95, panelW - 40, 1, 0x636e72)
      .setAlpha(0.3);
    this.overlay.add(divider);

    // ── 티어별 구매 버튼 ──
    const tierStartY = panelTop + 115;
    const diamond = this.saveData.diamond || 0;

    for (let i = 0; i < util.tiers.length; i++) {
      const tier = i + 1;
      const tierData = util.tiers[i];
      const btnY = tierStartY + i * 55;

      const isCompleted = tier <= currentTier;
      const isNext = tier === currentTier + 1;
      const isLocked = tier > currentTier + 1;
      const canAfford = diamond >= tierData.cost;
      const canBuy = isNext && canAfford;

      // 상태별 버튼 스타일 결정
      let bgColor = COLORS.BACKGROUND;
      let borderColor = 0x636e72;
      let borderWidth = 1;
      let textColor = '#636e72';

      if (isCompleted) {
        bgColor = util.iconColor;
        borderColor = util.iconColor;
        borderWidth = 2;
        textColor = '#ffd700';
      } else if (isNext && canAfford) {
        borderColor = COLORS.DIAMOND;
        borderWidth = 2;
        textColor = '#ffffff';
      } else if (isLocked) {
        bgColor = COLORS.WALL;
        textColor = '#636e72';
      }

      const bg = this.add.rectangle(panelX, btnY, panelW - 40, 40, bgColor, isCompleted ? 0.3 : 1)
        .setStrokeStyle(borderWidth, borderColor);
      this.overlay.add(bg);

      if (canBuy) {
        bg.setInteractive({ useHandCursor: true });
      }

      // 티어 라벨 (완료: 체크 표시, 잠금: 자물쇠)
      const labelPrefix = isCompleted ? '\u2713 ' : isLocked ? '\uD83D\uDD12 ' : '';
      const tierLabel = this.add.text(panelX - panelW / 2 + 40, btnY, `${labelPrefix}Tier ${tier}`, {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: textColor,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.overlay.add(tierLabel);

      // 효과 설명
      const effectText = this.add.text(panelX + 10, btnY, tierData.desc, {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: textColor,
      }).setOrigin(0, 0.5);
      this.overlay.add(effectText);

      // 비용 (완료된 티어는 비용 숨김)
      const costColor = isCompleted ? '#ffd700' : canAfford ? COLORS.DIAMOND_CSS : '#ff4757';
      const costStr = isCompleted ? '' : `\u25C6 ${tierData.cost}`;
      const costText = this.add.text(panelX + panelW / 2 - 30, btnY, costStr, {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: costColor,
      }).setOrigin(1, 0.5);
      this.overlay.add(costText);

      // 구매 클릭 핸들러
      if (canBuy) {
        bg.on('pointerdown', () => {
          this._purchaseUtilityUpgrade(key, tier, tierData.cost);
        });
      }
    }
  }

  /**
   * 유틸리티 업그레이드 티어를 구매한다.
   * 다이아몬드를 차감하고 세이브 데이터를 갱신한 뒤 상세 뷰를 새로고침한다.
   * @param {string} key - 유틸리티 키
   * @param {number} tier - 구매할 티어 (1~3)
   * @param {number} cost - 다이아몬드 비용
   * @private
   */
  _purchaseUtilityUpgrade(key, tier, cost) {
    if ((this.saveData.diamond || 0) < cost) return;

    this.saveData.diamond -= cost;

    if (!this.saveData.utilityUpgrades) {
      this.saveData.utilityUpgrades = { baseHp: 0, goldBoost: 0, waveBonus: 0 };
    }
    this.saveData.utilityUpgrades[key] = tier;

    this._saveToDB(this.saveData);
    this._refreshDiamondDisplay();

    // 갱신된 정보로 상세 뷰 새로고침
    this._showUtilityDetailView(key);
  }

  // ── 타워 잠금 해제 팝업 ────────────────────────────────────

  /**
   * 타워 잠금 해제 확인 팝업을 표시한다.
   * 잠금 해제 비용(다이아몬드)과 확인/취소 버튼을 포함한다.
   * @param {string} type - 타워 타입 키
   * @private
   */
  _showTowerUnlockPopup(type) {
    if (this.overlay) this.overlay.destroy();

    const stats = TOWER_STATS[type];
    const unlockWorld = stats.unlockWorld;
    const worldName = unlockWorld ? t(`world.${unlockWorld}.name`) : '';

    this.overlay = this.add.container(0, 0).setDepth(50);

    // 어두운 배경 막
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.7)
      .setInteractive();
    this.overlay.add(backdrop);

    // 팝업 패널
    const popW = 260;
    const popH = 160;
    const popX = GAME_WIDTH / 2;
    const popY = GAME_HEIGHT / 2;

    const popBg = this.add.rectangle(popX, popY, popW, popH, COLORS.UI_PANEL)
      .setStrokeStyle(2, stats.color);
    this.overlay.add(popBg);

    // 타워 아이콘
    const iconG = this.add.graphics();
    this._drawTowerIcon(iconG, type, popX - 50, popY - 45, 1.2);
    this.overlay.add(iconG);

    // 타이틀
    const titleText = this.add.text(popX + 10, popY - 45, `${stats.displayName} Tower`, {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.overlay.add(titleText);

    // 해금 조건 안내
    const condStr = t('ui.clearWorldToUnlock').replace('{world}', worldName);
    const descText = this.add.text(popX, popY - 5, condStr, {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#fdcb6e',
    }).setOrigin(0.5);
    this.overlay.add(descText);

    // 확인 버튼
    const okBg = this.add.rectangle(popX, popY + 45, 100, 36, COLORS.BUTTON_ACTIVE)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(okBg);

    const okText = this.add.text(popX, popY + 45, t('ui.confirm') || 'OK', {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(okText);

    okBg.on('pointerdown', () => {
      this._closeOverlay();
    });
  }

  /**
   * 타워를 잠금 해제한다 (마이그레이션 누락 복구용).
   * unlockedTowers 배열에 추가한 뒤 씬을 재구성한다.
   * @param {string} type - 잠금 해제할 타워 타입 키
   * @private
   */
  _unlockTower(type) {
    if (!this.saveData.unlockedTowers) this.saveData.unlockedTowers = [];
    if (!this.saveData.unlockedTowers.includes(type)) {
      this.saveData.unlockedTowers.push(type);
    }

    this._saveToDB(this.saveData);
    this._closeOverlay();
    this._rebuildScene();
  }

  // ── 공통 헬퍼 ──────────────────────────────────────────────

  /**
   * 현재 오버레이를 파괴하고 닫는다.
   * @private
   */
  _closeOverlay() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  /**
   * 씬 전체를 재시작하여 갱신된 데이터를 반영한다.
   * @private
   */
  _rebuildScene() {
    this.scene.restart();
  }

  /**
   * 세이브 데이터를 localStorage에 저장하고 레지스트리에 동기화한다.
   * @param {object} saveData - 저장할 세이브 데이터 객체
   * @private
   */
  _saveToDB(saveData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      // localStorage 쓰기 실패는 무시 (용량 초과 등)
    }
    this.registry.set('saveData', saveData);
  }
}
