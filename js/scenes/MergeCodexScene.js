/**
 * @fileoverview MergeCodexScene - 합성 도감 (타워 레시피 카탈로그) 씬.
 * T1~T5 모든 타워를 발견 여부와 무관하게 전체 공개 형태로 표시한다.
 * GameScene(일시정지 오버레이)과 CollectionScene(도감 탭) 양쪽에서 접근 가능하다.
 * 카드 클릭 시 T1은 스탯 패널, T2+는 합성 트리 노드를 보여주며,
 * 재료 노드 클릭으로 드릴다운 탐색이 가능하다.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS,
  TOWER_STATS, MERGE_RECIPES, MERGED_TOWER_STATS,
  CODEX_TIER_BG, ATTACK_TYPE_COLORS_CSS, BTN_PRIMARY,
  META_UPGRADE_TREE,
} from '../config.js';
import { t } from '../i18n.js';

/** @const {string[]} T1 타워 표시 순서 */
const TOWER_ORDER = [
  'archer', 'mage', 'ice', 'lightning',
  'flame', 'rock', 'poison', 'wind',
  'light', 'dragon',
];

// ── 레이아웃 상수 ─────────────────────────────────────────────

/** @const {number} 서브탭 바 Y 좌표 */
const SUBTAB_Y = 48;
/** @const {number} 서브탭 버튼 높이 */
const SUBTAB_H = 28;
/** @const {number} 서브탭 버튼 너비 */
const SUBTAB_W = 64;
/** @const {number} 서브탭 간 간격 */
const SUBTAB_GAP = 4;
/** @const {number} 진행도 텍스트 Y 좌표 */
const PROGRESS_Y = 82;
/** @const {number} 도감 카드 그리드 시작 Y 좌표 */
const CODEX_GRID_Y = 104;
/** @const {number} 도감 카드 너비 */
const CODEX_CARD_W = 62;
/** @const {number} 도감 카드 높이 */
const CODEX_CARD_H = 74;
/** @const {number} 도감 그리드 열 수 */
const CODEX_COLS = 5;
/** @const {number} 도감 카드 간 간격 */
const CODEX_CARD_GAP = 6;
/** @const {number} 도감 그리드 시작 X 좌표 (가운데 정렬) */
const CODEX_GRID_X = (GAME_WIDTH - (CODEX_COLS * CODEX_CARD_W + (CODEX_COLS - 1) * CODEX_CARD_GAP)) / 2;

/**
 * 합성 도감 씬 클래스.
 * 전체 타워(T1~T5)의 레시피와 스탯을 카탈로그 형태로 열람할 수 있다.
 * 서브탭으로 티어별 필터링, 드래그 스크롤, 카드 클릭 시 상세 오버레이를 지원한다.
 * @extends Phaser.Scene
 */
export class MergeCodexScene extends Phaser.Scene {
  /**
   * MergeCodexScene 인스턴스를 생성한다.
   */
  constructor() {
    super({ key: 'MergeCodexScene' });
  }

  /**
   * 씬 초기 상태를 설정한다.
   * 이전 씬 정보, 스크롤 상태, 오버레이 히스토리 등을 초기화한다.
   * @param {object} data - 씬 전환 시 전달되는 데이터
   * @param {string} [data.fromScene='CollectionScene'] - 이 도감을 호출한 씬 이름
   */
  init(data) {
    /** @type {string} 이 도감을 호출한 씬 ('GameScene' 또는 'CollectionScene') */
    this.fromScene = data?.fromScene || 'CollectionScene';

    /** @type {number} 현재 활성 서브탭 티어 (1~5), 기본값 T2 */
    this.codexTier = 2;

    /** @type {number} 도감 스크롤 Y 오프셋 */
    this.codexScrollY = 0;

    /** @type {boolean} 사용자가 도감 스크롤 영역을 드래그 중인지 여부 */
    this.codexDragging = false;

    /** @type {number} 드래그 시작 시점의 포인터 Y 좌표 */
    this.codexDragStartY = 0;

    /** @type {number} 드래그 시작 시점의 스크롤 오프셋 */
    this.codexDragStartScroll = 0;

    /** @type {boolean} 드래그가 스크롤로 인정될 만큼 이동했는지 여부 (클릭과 구분) */
    this.codexDragMoved = false;

    /** @type {object|null} 사전 구축된 티어 데이터 캐시 */
    this._tierDataCache = null;

    /** @type {Phaser.GameObjects.Container|null} 스크롤 가능 카드 컨테이너 */
    this.codexScrollContainer = null;

    /** @type {Phaser.GameObjects.Container|null} 서브탭 바 컨테이너 */
    this._subTabContainer = null;

    /** @type {Phaser.GameObjects.Container|null} 도감 콘텐츠 컨테이너 */
    this._codexContentContainer = null;

    /** @type {Phaser.GameObjects.Rectangle|null} 스크롤 마스크용 사각형 */
    this._maskShape = null;

    /** @type {number} 스크롤 가능한 최대 오프셋 값 */
    this._codexMaxScroll = 0;

    /** @type {Phaser.GameObjects.Container|null} 현재 활성 오버레이 컨테이너 */
    this.overlay = null;

    /** @type {number} 오버레이가 마지막으로 닫힌 시각 (ms, 재오픈 방지용) */
    this._overlayClosedAt = 0;

    /** @type {object[]} 오버레이 드릴다운 히스토리 스택 */
    this._overlayHistory = [];

    // 세이브 데이터에서 메타 업그레이드 정보 로드
    /** @type {object} 타워별 메타 업그레이드 선택 정보 */
    const saveData = JSON.parse(localStorage.getItem('fantasyDefenceSave') || '{}');
    this._towerMetaUpgrades = saveData.towerUpgrades || {};
  }

  /**
   * 도감 UI를 생성한다.
   * 배경, 상단 바, 서브탭, 도감 그리드를 구성하고,
   * 이전 씬에서의 클릭 관통을 방지하기 위해 100ms 동안 입력을 차단한다.
   */
  create() {
    // 배경
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // 이전 씬에서의 클릭 관통 방지를 위해 입력을 잠시 차단
    this._inputReady = false;

    this._buildTierData();
    this._createTopBar();
    this._buildSubTabs();
    this._buildCodexContent();

    // 100ms 후 입력 허용
    this.time.delayedCall(100, () => { this._inputReady = true; });
  }

  // ── 상단 바 ─────────────────────────────────────────────────

  /**
   * 상단 내비게이션 바를 생성한다.
   * BACK 버튼(이전 씬 복귀)과 "합성 도감" 타이틀을 포함한다.
   * @private
   */
  _createTopBar() {
    // 배경
    this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH, 48, COLORS.HUD_BG);

    // BACK 버튼
    const backBg = this.add.rectangle(38, 24, 60, 28, 0x000000, 0)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true });

    this.add.text(38, 24, '< BACK', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    backBg.on('pointerdown', () => {
      this._goBack();
    });

    // 타이틀
    this.add.text(180, 24, t('codex.title'), {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  /**
   * 호출 씬에 따라 적절한 방식으로 뒤로 이동한다.
   * GameScene에서 왔으면 도감을 닫고 게임씬을 깨우고,
   * CollectionScene에서 왔으면 컬렉션 씬을 새로 시작한다.
   * @private
   */
  _goBack() {
    if (this.fromScene === 'GameScene') {
      this.scene.stop('MergeCodexScene');
      this.scene.wake('GameScene');
    } else {
      this.scene.start('CollectionScene');
    }
  }

  // ── 티어 데이터 구축 ────────────────────────────────────────

  /**
   * TOWER_STATS, MERGE_RECIPES, MERGED_TOWER_STATS로부터 티어별 데이터를 구축한다.
   * 모든 항목을 발견 상태로 처리한다 (전체 공개 모드).
   * 캐시가 이미 존재하면 재구축하지 않는다.
   * @private
   */
  _buildTierData() {
    if (this._tierDataCache) return;

    const data = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    // T1: 기본 10종 타워
    for (const type of TOWER_ORDER) {
      const stats = TOWER_STATS[type];
      const lv1 = stats.levels[1];
      data[1].push({
        id: type,
        displayName: t(`tower.${type}.name`) || stats.displayName,
        color: stats.color,
        attackType: lv1.attackType,
        recipeKey: null,
        tier: 1,
      });
    }

    // T2~T5: MERGE_RECIPES에서 합성 타워 수집
    for (const [recipeKey, recipe] of Object.entries(MERGE_RECIPES)) {
      const mergedStats = MERGED_TOWER_STATS[recipe.id];
      const tier = recipe.tier;
      if (tier < 2 || tier > 5) continue;

      data[tier].push({
        id: recipe.id,
        displayName: recipe.displayName,
        color: recipe.color,
        attackType: mergedStats ? mergedStats.attackType : 'unknown',
        recipeKey: recipeKey,
        tier: tier,
      });
    }

    // 각 티어를 id 알파벳순으로 정렬하여 일관된 표시 순서 보장
    for (let tierNum = 2; tierNum <= 5; tierNum++) {
      data[tierNum].sort((a, b) => a.id.localeCompare(b.id));
    }

    this._tierDataCache = data;
  }

  // ── 서브탭 바 (T1~T5) ──────────────────────────────────────

  /**
   * T1~T5 서브탭 바를 구축한다.
   * 활성 탭은 다이아몬드 색 테두리와 볼드 텍스트로 강조된다.
   * @private
   */
  _buildSubTabs() {
    if (this._subTabContainer) {
      this._subTabContainer.destroy();
    }
    this._subTabContainer = this.add.container(0, 0).setDepth(8);

    const totalW = 5 * SUBTAB_W + 4 * SUBTAB_GAP;
    const startX = (GAME_WIDTH - totalW) / 2 + SUBTAB_W / 2;
    const cy = SUBTAB_Y + SUBTAB_H / 2;

    for (let tier = 1; tier <= 5; tier++) {
      const x = startX + (tier - 1) * (SUBTAB_W + SUBTAB_GAP);
      const isActive = tier === this.codexTier;

      const bg = this.add.rectangle(x, cy, SUBTAB_W, SUBTAB_H,
        isActive ? COLORS.UI_PANEL : COLORS.BACKGROUND)
        .setStrokeStyle(1, isActive ? COLORS.DIAMOND : 0x636e72)
        .setInteractive({ useHandCursor: true });
      this._subTabContainer.add(bg);

      const label = this.add.text(x, cy, `T${tier}`, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: isActive ? '#ffffff' : '#636e72',
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      this._subTabContainer.add(label);

      bg.on('pointerdown', () => {
        if (!this._inputReady) return;
        if (this.codexTier !== tier) {
          this.codexTier = tier;
          this.codexScrollY = 0;
          this._buildSubTabs();
          this._buildCodexContent();
        }
      });
    }
  }

  // ── 도감 콘텐츠 ────────────────────────────────────────────

  /**
   * 현재 서브탭 티어에 맞는 도감 카드 그리드를 구축한다.
   * 스크롤 마스크, 카드 배치, 드래그 스크롤 설정을 포함한다.
   * @private
   */
  _buildCodexContent() {
    if (this._codexContentContainer) {
      this._codexContentContainer.destroy();
    }
    this._cleanupCodexDrag();

    const tierData = this._tierDataCache[this.codexTier] || [];
    const totalCount = tierData.length;

    // 콘텐츠 컨테이너
    this._codexContentContainer = this.add.container(0, 0).setDepth(6);

    // 진행도 텍스트 (예: "T2: 15")
    const progressStr = t('codex.progress')
      .replace('{n}', String(this.codexTier))
      .replace('{total}', String(totalCount));

    const progressText = this.add.text(GAME_WIDTH / 2, PROGRESS_Y + 8, progressStr, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this._codexContentContainer.add(progressText);

    // 스크롤 마스크 및 스크롤 컨테이너
    const scrollAreaH = GAME_HEIGHT - CODEX_GRID_Y;
    this._maskShape = this.add.rectangle(GAME_WIDTH / 2, CODEX_GRID_Y + scrollAreaH / 2,
      GAME_WIDTH, scrollAreaH, 0x000000).setVisible(false);
    this._codexContentContainer.add(this._maskShape);

    this.codexScrollContainer = this.add.container(0, 0);
    this._codexContentContainer.add(this.codexScrollContainer);

    const mask = this._maskShape.createGeometryMask();
    this.codexScrollContainer.setMask(mask);

    // 총 콘텐츠 높이 계산으로 최대 스크롤값 결정
    const rows = Math.ceil(tierData.length / CODEX_COLS);
    const totalContentH = rows * (CODEX_CARD_H + CODEX_CARD_GAP);
    this._codexMaxScroll = Math.max(0, totalContentH - scrollAreaH + 10);

    // 카드 생성
    for (let i = 0; i < tierData.length; i++) {
      const col = i % CODEX_COLS;
      const row = Math.floor(i / CODEX_COLS);
      const x = CODEX_GRID_X + col * (CODEX_CARD_W + CODEX_CARD_GAP);
      const y = CODEX_GRID_Y + row * (CODEX_CARD_H + CODEX_CARD_GAP);
      this._createCodexCard(tierData[i], x, y);
    }

    // 초기 스크롤 오프셋 적용
    this.codexScrollY = 0;
    this._applyCodexScroll();

    // 드래그 스크롤 설정
    this._setupCodexDrag();
  }

  /**
   * 개별 도감 카드를 생성한다.
   * 모든 카드는 발견 상태(전체 공개)로 표시된다.
   * 색상 원, 이름(6자 초과 시 말줄임), 공격 유형 배지, 티어 표시를 포함한다.
   * @param {object} entry - 티어 데이터 항목 { id, displayName, color, attackType, recipeKey, tier }
   * @param {number} x - 카드 좌상단 X 좌표
   * @param {number} y - 카드 좌상단 Y 좌표
   * @private
   */
  _createCodexCard(entry, x, y) {
    const cx = x + CODEX_CARD_W / 2;
    const cy = y + CODEX_CARD_H / 2;

    const borderColor = this._getTierBorderColor(entry.tier);
    const cardBgColor = CODEX_TIER_BG[entry.tier] || COLORS.UI_PANEL;
    const bg = this.add.rectangle(cx, cy, CODEX_CARD_W, CODEX_CARD_H, cardBgColor)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });
    this.codexScrollContainer.add(bg);

    // 타워 색상 원 (반지름 14)
    const circleG = this.add.graphics();
    circleG.fillStyle(entry.color, 1);
    circleG.fillCircle(cx, y + 20, 14);
    this.codexScrollContainer.add(circleG);

    // 타워 이름 (6자 초과 시 5자+'..' 로 말줄임)
    const displayName = entry.displayName.length > 6
      ? entry.displayName.substring(0, 5) + '..'
      : entry.displayName;
    const nameText = this.add.text(cx, y + 40, displayName, {
      fontSize: '9px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.codexScrollContainer.add(nameText);

    // 공격 유형 배지 (유형별 고유 색상 적용)
    const badgeStr = this._getAttackTypeBadge(entry.attackType);
    const badgeColor = ATTACK_TYPE_COLORS_CSS[entry.attackType] || '#81ecec';
    const badgeText = this.add.text(cx, y + 54, badgeStr, {
      fontSize: '8px',
      fontFamily: 'Arial, sans-serif',
      color: badgeColor,
      backgroundColor: '#0d1117',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5);
    this.codexScrollContainer.add(badgeText);

    // 티어 배지
    const tierBadge = this.add.text(cx, y + 67, `T${entry.tier}`, {
      fontSize: '8px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);
    this.codexScrollContainer.add(tierBadge);

    // pointerup 사용 - 드래그 스크롤과 탭 클릭을 구분하기 위함
    bg.on('pointerup', () => {
      if (!this._inputReady) return;
      // 드래그가 이동한 경우 클릭으로 취급하지 않음, 오버레이 닫기 직후 재오픈 방지 (200ms 쿨다운)
      if (!this.codexDragMoved && Date.now() - this._overlayClosedAt > 200) {
        this._showCodexCardOverlay(entry);
      }
    });
  }

  // ── 카드 오버레이 ──────────────────────────────────────────

  /**
   * 도감 카드 클릭 시 상세 오버레이를 표시한다.
   * T1은 스탯 패널, T2+는 합성 트리 노드를 보여준다.
   * 드릴다운 히스토리를 초기화하고 새로운 탐색을 시작한다.
   * @param {object} entry - 티어 데이터 항목
   * @private
   */
  _showCodexCardOverlay(entry) {
    this._overlayHistory = [];
    this._renderOverlay(entry);
  }

  /**
   * 주어진 항목에 대한 오버레이를 렌더링(또는 재렌더링)한다.
   * 기존 오버레이를 파괴한 뒤 T1 패널 또는 합성 트리 패널로 위임한다.
   * 히스토리가 있으면 "뒤로" 버튼을 표시한다.
   * @param {object} entry - 표시할 티어 데이터 항목
   * @private
   */
  _renderOverlay(entry) {
    if (this.overlay) this.overlay.destroy();
    this.overlay = this.add.container(0, 0).setDepth(50);

    // 배경막 (어둡고 거의 불투명)
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050510)
      .setAlpha(0.96)
      .setInteractive();
    this.overlay.add(backdrop);
    backdrop.on('pointerdown', () => this._handleBack());

    // 이 항목이 재료로 사용되는 상위 레시피 목록 계산
    const usedInList = this._findUsedInRecipes(entry.id);

    // 패널 크기 계산 - "상위 조합" 섹션이 있으면 높이 추가
    const panelW = 300;
    const hasUsedIn = usedInList.length > 0;
    const usedInViewH = hasUsedIn ? 100 : 0;
    const baseH = entry.tier >= 2 ? 300 : 200;
    const panelH = baseH + usedInViewH;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, BTN_PRIMARY)
      .setInteractive();
    this.overlay.add(panelBg);

    // ── 헤더 영역 (패널 상단 0~30px) ──
    if (this._overlayHistory.length > 0) {
      // 뒤로 버튼 (드릴다운 탐색 시 표시)
      const backBg = this.add.rectangle(panelX - panelW / 2 + 40, panelTop + 15, 60, 24, 0x000000, 0)
        .setStrokeStyle(1, 0x636e72)
        .setInteractive({ useHandCursor: true });
      this.overlay.add(backBg);
      const backLabel = this.add.text(panelX - panelW / 2 + 40, panelTop + 15, '< \ub4a4\ub85c', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
      }).setOrigin(0.5);
      this.overlay.add(backLabel);
      backBg.on('pointerdown', () => this._handleBack());
    }

    // 닫기 (X) 버튼
    const closeX = panelX + panelW / 2 - 20;
    const closeY = panelTop + 15;
    const closeBg = this.add.circle(closeX, closeY, 12, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(closeBg);
    const closeText = this.add.text(closeX, closeY, 'X', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(closeText);
    closeBg.on('pointerdown', () => this._forceCloseOverlay());

    // 티어에 따라 적절한 패널 렌더링
    if (entry.tier === 1) {
      this._renderT1Panel(entry, panelX, panelTop, panelW, usedInList);
    } else {
      this._renderTreePanel(entry, panelX, panelTop, panelW, usedInList);
    }
  }

  // ── T1 스탯 패널 ───────────────────────────────────────────

  /**
   * T1 타워의 스탯 패널을 현재 오버레이 내부에 렌더링한다.
   * 타워 이름, 색상 원, 공격 유형, 기본 스탯(메타 업그레이드 보너스 반영)을 표시한다.
   * @param {object} entry - T1 티어 데이터 항목
   * @param {number} panelX - 패널 중심 X 좌표
   * @param {number} panelTop - 패널 상단 Y 좌표
   * @param {number} panelW - 패널 너비
   * @param {Array} usedInList - 이 타워가 재료로 사용되는 레시피 목록
   * @private
   */
  _renderT1Panel(entry, panelX, panelTop, panelW, usedInList) {
    // 타워 이름
    const nameText = this.add.text(panelX, panelTop + 40, entry.displayName, {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(nameText);

    // 색상 원 + 티어 배지
    const circleG = this.add.graphics();
    circleG.fillStyle(entry.color, 1);
    circleG.fillCircle(panelX - 30, panelTop + 65, 14);
    this.overlay.add(circleG);

    const tierBadge = this.add.text(panelX + 5, panelTop + 65, 'T1', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0, 0.5);
    this.overlay.add(tierBadge);

    // 공격 유형 배지
    const atkColor = ATTACK_TYPE_COLORS_CSS[entry.attackType] || '#b2bec3';
    const atkText = this.add.text(panelX, panelTop + 90, this._getAttackTypeBadge(entry.attackType), {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: atkColor,
    }).setOrigin(0.5);
    this.overlay.add(atkText);

    // 기본 스탯 (메타 업그레이드 보너스가 적용된 값)
    const lv1 = TOWER_STATS[entry.id]?.levels?.[1];
    if (lv1) {
      const stats = { damage: lv1.damage, fireRate: lv1.fireRate, range: lv1.range };
      this._applyMetaUpgradesToStats(entry.id, stats);
      const statsStr = `DMG: ${stats.damage}  |  SPD: ${stats.fireRate}s  |  RNG: ${stats.range}`;
      const statsText = this.add.text(panelX, panelTop + 110, statsStr, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
      }).setOrigin(0.5);
      this.overlay.add(statsText);
    }

    // ── "상위 조합" 섹션 ──
    if (usedInList.length > 0) {
      this._renderUsedInSection(entry, usedInList, panelX, panelTop + 130, panelW);
    }
  }

  /**
   * 메타 업그레이드 보너스를 일반 스탯 객체에 적용한다.
   * GameScene._applyMetaUpgradesToTower의 로직을 미러링하되,
   * 타워 인스턴스 대신 일반 객체에서 동작한다.
   * @param {string} towerType - 타워 타입 id (예: 'archer')
   * @param {object} stats - { damage, fireRate, range, ... } - 직접 변경됨
   * @private
   */
  _applyMetaUpgradesToStats(towerType, stats) {
    const upgrades = this._towerMetaUpgrades[towerType];
    if (!upgrades) return;

    const treeData = META_UPGRADE_TREE[towerType];
    if (!treeData) return;

    for (let tier = 1; tier <= 3; tier++) {
      const choice = upgrades[`tier${tier}`];
      if (!choice) continue;

      const bonus = treeData[`tier${tier}`]?.[choice];
      if (!bonus?.effects) continue;

      for (const effect of bonus.effects) {
        if (stats[effect.stat] === undefined) continue;
        if (effect.type === 'multiply') {
          stats[effect.stat] *= effect.value;
          // 정수형 스탯은 반올림 처리
          if (['damage', 'range', 'splashRadius', 'chainRadius',
               'pushbackDistance', 'chainCount'].includes(effect.stat)) {
            stats[effect.stat] = Math.round(stats[effect.stat]);
          }
        } else if (effect.type === 'add') {
          stats[effect.stat] += effect.value;
        }
      }
    }
  }

  /**
   * 주어진 타워가 재료로 사용되는 모든 합성 레시피를 찾는다.
   * @param {string} towerId - 타워 id (T1 타입 또는 합성 타워 id)
   * @returns {Array<{resultEntry: object, recipeKey: string}>} 결과 항목과 레시피 키 쌍의 배열
   * @private
   */
  _findUsedInRecipes(towerId) {
    const results = [];
    for (const [recipeKey, recipe] of Object.entries(MERGE_RECIPES)) {
      const parts = recipeKey.split('+');
      if (parts.includes(towerId)) {
        const resultEntry = this._buildEntryById(recipe.id);
        if (resultEntry) results.push({ resultEntry, recipeKey });
      }
    }
    // 티어 오름차순, 같은 티어 내에서는 이름 알파벳순으로 정렬
    results.sort((a, b) => a.resultEntry.tier - b.resultEntry.tier || a.resultEntry.displayName.localeCompare(b.resultEntry.displayName));
    return results;
  }

  /**
   * 오버레이 내부에 스크롤 가능한 "상위 조합" 목록 섹션을 렌더링한다.
   * 이 타워가 재료로 사용되는 상위 합성 결과를 나열하며,
   * 각 항목 클릭 시 해당 타워의 상세 오버레이로 드릴다운한다.
   * @param {object} currentEntry - 현재 표시 중인 항목 (히스토리 push용)
   * @param {Array} usedInList - _findUsedInRecipes의 결과
   * @param {number} panelX - 패널 중심 X 좌표
   * @param {number} startY - 섹션 렌더링 시작 Y 좌표
   * @param {number} panelW - 패널 너비
   * @private
   */
  _renderUsedInSection(currentEntry, usedInList, panelX, startY, panelW) {
    const viewH = 100;
    const rowH = 22;
    const headerH = 18;
    let y = startY + 6;

    // 구분선
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x636e72, 0.5);
    divider.lineBetween(panelX - panelW / 2 + 20, y, panelX + panelW / 2 - 20, y);
    this.overlay.add(divider);
    y += 8;

    // 섹션 헤더 (스크롤 영역 바깥 고정)
    const header = this.add.text(panelX, y, t('codex.usedIn') || '상위 조합', {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#636e72',
    }).setOrigin(0.5);
    this.overlay.add(header);
    y += headerH;

    // 스크롤 뷰포트 영역
    const scrollTopY = y;
    const scrollH = viewH - headerH - 14;
    const contentH = usedInList.length * rowH;
    const maxScroll = Math.max(0, contentH - scrollH);

    // 스크롤 가능 컨테이너
    const scrollContainer = this.add.container(0, 0);
    this.overlay.add(scrollContainer);

    // 스크롤 컨테이너 내부에 항목 구성
    for (let i = 0; i < usedInList.length; i++) {
      const { resultEntry } = usedInList[i];
      const itemY = scrollTopY + i * rowH + rowH / 2;
      const label = `T${resultEntry.tier} ${resultEntry.displayName}`;
      const itemText = this.add.text(panelX, itemY, label, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#dfe6e9',
      }).setOrigin(0.5);
      scrollContainer.add(itemText);

      // 투명 히트 영역 (호버/클릭용)
      const hitArea = this.add.rectangle(panelX, itemY, panelW - 40, rowH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      scrollContainer.add(hitArea);

      hitArea.on('pointerover', () => itemText.setColor('#ffd700'));
      hitArea.on('pointerout', () => itemText.setColor('#dfe6e9'));
      hitArea.on('pointerdown', () => {
        if (!this._inputReady) return;
        // 현재 항목을 히스토리에 저장하고 클릭한 결과 타워로 드릴다운
        this._overlayHistory.push(currentEntry);
        this._renderOverlay(resultEntry);
      });
    }

    // 스크롤 영역 클리핑 마스크
    const maskShape = this.add.rectangle(panelX, scrollTopY + scrollH / 2, panelW - 10, scrollH, 0x000000)
      .setVisible(false);
    this.overlay.add(maskShape);
    scrollContainer.setMask(maskShape.createGeometryMask());

    // 스크롤 힌트 (콘텐츠가 넘칠 때만 하단 화살표 표시)
    if (maxScroll > 0) {
      const hint = this.add.text(panelX + panelW / 2 - 28, scrollTopY + scrollH - 2, '\u25BC', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#636e72',
      }).setOrigin(0.5);
      this.overlay.add(hint);
      this._usedInScrollHint = hint;
    }

    // 드래그 스크롤 상태
    let scrollY = 0;
    let dragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;

    // 스크롤 영역을 덮는 투명 드래그 존
    const dragZone = this.add.rectangle(panelX, scrollTopY + scrollH / 2, panelW - 10, scrollH, 0x000000, 0)
      .setInteractive();
    this.overlay.add(dragZone);

    dragZone.on('pointerdown', (pointer) => {
      dragging = true;
      dragStartY = pointer.y;
      dragStartScroll = scrollY;
    });

    this.input.on('pointermove', (pointer) => {
      if (!dragging) return;
      const dy = pointer.y - dragStartY;
      scrollY = Phaser.Math.Clamp(dragStartScroll - dy, 0, maxScroll);
      scrollContainer.y = -scrollY;
      // 스크롤 힌트 가시성 갱신 (끝까지 스크롤하면 숨김)
      if (this._usedInScrollHint) {
        this._usedInScrollHint.setVisible(scrollY < maxScroll - 5);
      }
    });

    this.input.on('pointerup', () => { dragging = false; });
  }

  // ── T2+ 합성 트리 패널 ─────────────────────────────────────

  /**
   * T2+ 항목의 합성 트리 노드 패널을 렌더링한다.
   * 결과 노드(상단)와 두 재료 노드(하단 좌/우)를 Y자 연결선으로 표시한다.
   * 재료 노드 클릭 시 해당 타워로 드릴다운할 수 있다.
   * @param {object} entry - T2+ 티어 데이터 항목
   * @param {number} panelX - 패널 중심 X 좌표
   * @param {number} panelTop - 패널 상단 Y 좌표
   * @param {number} panelW - 패널 너비
   * @param {Array} usedInList - 이 타워가 재료로 사용되는 레시피 목록
   * @private
   */
  _renderTreePanel(entry, panelX, panelTop, panelW, usedInList) {
    // 레시피 키에서 두 재료를 추출
    const parts = entry.recipeKey ? entry.recipeKey.split('+') : [];
    const matAEntry = parts[0] ? this._buildEntryById(parts[0]) : null;
    const matBEntry = parts[1] ? this._buildEntryById(parts[1]) : null;

    // ── 결과 노드 (상단 중앙) ──
    const resultY = panelTop + 90;
    const resultR = 28;

    const resultCircle = this.add.graphics();
    resultCircle.fillStyle(entry.color, 1);
    resultCircle.fillCircle(panelX, resultY, resultR);
    resultCircle.lineStyle(2, BTN_PRIMARY, 1);
    resultCircle.strokeCircle(panelX, resultY, resultR);
    this.overlay.add(resultCircle);

    const resultName = this.add.text(panelX, panelTop + 128, entry.displayName, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(resultName);

    const resultTier = this.add.text(panelX, panelTop + 144, `T${entry.tier}`, {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0.5);
    this.overlay.add(resultTier);

    // ── Y자 연결선 ──
    const forkY = panelTop + 175;
    const matY = panelTop + 210;
    const matR = 20;
    const matOffsetX = 55;
    const matAX = panelX - matOffsetX;
    const matBX = panelX + matOffsetX;

    const lines = this.add.graphics();
    this._renderConnectorLines(lines, { x: panelX, y: panelTop + 155 }, forkY, { x: matAX, y: matY }, { x: matBX, y: matY });
    this.overlay.add(lines);

    // ── 재료 노드 (좌/우) ──
    if (matAEntry) this._renderMaterialNode(matAEntry, matAX, matY, matR, panelTop, entry);
    if (matBEntry) this._renderMaterialNode(matBEntry, matBX, matY, matR, panelTop, entry);

    // ── 트리 아래 스탯 표시 ──
    let nextY = panelTop + 270;
    const mergedStats = MERGED_TOWER_STATS[entry.id];
    if (mergedStats) {
      const divider = this.add.graphics();
      divider.lineStyle(1, 0x636e72, 0.5);
      divider.lineBetween(panelX - panelW / 2 + 20, nextY, panelX + panelW / 2 - 20, nextY);
      this.overlay.add(divider);
      nextY += 14;

      const statsStr = `DMG: ${mergedStats.damage}  |  SPD: ${mergedStats.fireRate}s  |  RNG: ${mergedStats.range}`;
      const statsText = this.add.text(panelX, nextY, statsStr, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
      }).setOrigin(0.5);
      this.overlay.add(statsText);
      nextY += 16;
    }

    // ── "상위 조합" 섹션 ──
    if (usedInList.length > 0) {
      this._renderUsedInSection(entry, usedInList, panelX, nextY, panelW);
    }
  }

  /**
   * 재료 노드 하나를 렌더링한다 (색상 원 + 이름 + 티어 배지).
   * 클릭 시 해당 재료 타워의 상세 정보로 드릴다운한다.
   * T2+ 재료는 금색 테두리, T1 재료는 은색 테두리로 구분한다.
   * @param {object} matEntry - 재료 타워의 티어 데이터 항목
   * @param {number} cx - 노드 중심 X 좌표
   * @param {number} cy - 노드 중심 Y 좌표 (원 위치)
   * @param {number} r - 원 반지름
   * @param {number} panelTop - 패널 상단 Y 좌표 (텍스트 배치용)
   * @param {object} currentEntry - 현재 결과 항목 (히스토리 push용)
   * @private
   */
  _renderMaterialNode(matEntry, cx, cy, r, panelTop, currentEntry) {
    const circle = this.add.graphics();
    circle.fillStyle(matEntry.color, 1);
    circle.fillCircle(cx, cy, r);
    // T2+ 재료는 금색 테두리로 드릴다운 가능함을 시각적으로 표시
    const borderColor = matEntry.tier >= 2 ? BTN_PRIMARY : 0x636e72;
    circle.lineStyle(2, borderColor, 1);
    circle.strokeCircle(cx, cy, r);
    this.overlay.add(circle);

    // 재료 이름 (공간 절약을 위해 6자 초과 시 말줄임)
    const displayName = matEntry.displayName.length > 6
      ? matEntry.displayName.substring(0, 5) + '..'
      : matEntry.displayName;
    const nameText = this.add.text(cx, panelTop + 238, displayName, {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    this.overlay.add(nameText);

    const tierBadge = this.add.text(cx, panelTop + 252, `T${matEntry.tier}`, {
      fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0.5);
    this.overlay.add(tierBadge);

    // 투명 히트 영역 (노드 영역을 덮는 클릭 가능 사각형)
    const hitArea = this.add.rectangle(cx, cy + 10, r * 2 + 10, 70, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(hitArea);

    hitArea.on('pointerdown', () => {
      if (!this._inputReady) return;
      // 현재 항목을 히스토리에 저장하고 재료 타워로 드릴다운
      this._overlayHistory.push(currentEntry);
      this._renderOverlay(matEntry);
    });
  }

  /**
   * 결과 노드에서 두 재료 노드로 이어지는 Y자 연결선을 렌더링한다.
   * 수직선(결과 -> 분기점) + 수평선(좌재료 <-> 우재료) + 수직선 2개(분기점 -> 각 재료).
   * @param {Phaser.GameObjects.Graphics} graphics - 그리기 대상 그래픽 오브젝트
   * @param {object} resultPos - 결과 노드 하단 좌표 { x, y }
   * @param {number} forkY - 분기점 Y 좌표
   * @param {object} matAPos - 재료 A 노드 상단 좌표 { x, y }
   * @param {object} matBPos - 재료 B 노드 상단 좌표 { x, y }
   * @private
   */
  _renderConnectorLines(graphics, resultPos, forkY, matAPos, matBPos) {
    graphics.lineStyle(2, 0x636e72, 0.8);

    // 결과 노드에서 분기점까지 수직선
    graphics.beginPath();
    graphics.moveTo(resultPos.x, resultPos.y);
    graphics.lineTo(resultPos.x, forkY);
    graphics.strokePath();

    // 분기점에서의 수평선
    graphics.beginPath();
    graphics.moveTo(matAPos.x, forkY);
    graphics.lineTo(matBPos.x, forkY);
    graphics.strokePath();

    // 분기점에서 재료 A까지 수직선
    graphics.beginPath();
    graphics.moveTo(matAPos.x, forkY);
    graphics.lineTo(matAPos.x, matAPos.y - 20);
    graphics.strokePath();

    // 분기점에서 재료 B까지 수직선
    graphics.beginPath();
    graphics.moveTo(matBPos.x, forkY);
    graphics.lineTo(matBPos.x, matBPos.y - 20);
    graphics.strokePath();
  }

  // ── 오버레이 내비게이션 ─────────────────────────────────────

  /**
   * 뒤로가기를 처리한다.
   * 히스토리에 이전 항목이 있으면 되돌아가고, 없으면 오버레이를 닫는다.
   * @private
   */
  _handleBack() {
    if (this._overlayHistory.length > 0) {
      const prevEntry = this._overlayHistory.pop();
      this._renderOverlay(prevEntry);
    } else {
      this._forceCloseOverlay();
    }
  }

  /**
   * 히스토리를 무시하고 오버레이를 즉시 완전히 닫는다.
   * 닫힌 시각을 기록하여 즉시 재오픈을 방지한다.
   * @private
   */
  _forceCloseOverlay() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
      this._overlayHistory = [];
      this._overlayClosedAt = Date.now();
    }
  }

  /**
   * 오버레이를 닫는다 (히스토리 기반 뒤로가기 지원).
   * @private
   */
  _closeOverlay() {
    this._handleBack();
  }

  /**
   * 타워/합성 ID로 티어 데이터 항목을 조회한다.
   * 모든 티어(T1~T5)의 캐시를 순회하여 일치하는 항목을 반환한다.
   * @param {string} id - 타워 또는 합성 타워 ID
   * @returns {object|null} 일치하는 티어 데이터 항목, 없으면 null
   * @private
   */
  _buildEntryById(id) {
    if (!this._tierDataCache) return null;
    for (let tier = 1; tier <= 5; tier++) {
      const entries = this._tierDataCache[tier];
      if (!entries) continue;
      for (const entry of entries) {
        if (entry.id === id) return entry;
      }
    }
    return null;
  }

  // ── 드래그 스크롤 ──────────────────────────────────────────

  /**
   * 도감 그리드에 대한 포인터 기반 드래그 스크롤을 설정한다.
   * @private
   */
  _setupCodexDrag() {
    this.input.on('pointerdown', this._onCodexPointerDown, this);
    this.input.on('pointermove', this._onCodexPointerMove, this);
    this.input.on('pointerup', this._onCodexPointerUp, this);
  }

  /**
   * 도감 스크롤용 포인터 다운 이벤트를 처리한다.
   * 그리드 영역 위에서만 드래그를 시작한다.
   * @param {Phaser.Input.Pointer} pointer - 포인터 이벤트
   * @private
   */
  _onCodexPointerDown(pointer) {
    if (!this._inputReady) return;
    if (pointer.y < CODEX_GRID_Y) return;
    this.codexDragging = true;
    this.codexDragStartY = pointer.y;
    this.codexDragStartScroll = this.codexScrollY;
    this.codexDragMoved = false;
  }

  /**
   * 도감 스크롤용 포인터 이동 이벤트를 처리한다.
   * 5px 이상 이동하면 드래그로 인정하여 카드 클릭을 방지한다.
   * @param {Phaser.Input.Pointer} pointer - 포인터 이벤트
   * @private
   */
  _onCodexPointerMove(pointer) {
    if (!this.codexDragging) return;
    const dy = pointer.y - this.codexDragStartY;
    // 5px 이상 이동하면 스크롤로 판정 (탭 클릭과 구분)
    if (Math.abs(dy) > 5) {
      this.codexDragMoved = true;
    }
    this.codexScrollY = Phaser.Math.Clamp(
      this.codexDragStartScroll - dy,
      0, this._codexMaxScroll
    );
    this._applyCodexScroll();
  }

  /**
   * 도감 스크롤용 포인터 업 이벤트를 처리한다.
   * @private
   */
  _onCodexPointerUp() {
    this.codexDragging = false;
  }

  /**
   * 현재 스크롤 오프셋을 스크롤 컨테이너에 적용한다.
   * @private
   */
  _applyCodexScroll() {
    if (this.codexScrollContainer) {
      this.codexScrollContainer.y = -this.codexScrollY;
    }
  }

  /**
   * 드래그 스크롤 이벤트 리스너를 정리한다.
   * @private
   */
  _cleanupCodexDrag() {
    this.codexDragging = false;
    this.input.off('pointerdown', this._onCodexPointerDown, this);
    this.input.off('pointermove', this._onCodexPointerMove, this);
    this.input.off('pointerup', this._onCodexPointerUp, this);
  }

  // ── 헬퍼 메서드 ────────────────────────────────────────────

  /**
   * 티어에 해당하는 카드 테두리 색상을 반환한다.
   * T1~T2: 은색, T3: 금색, T4: 보라색, T5: 금색.
   * @param {number} tier - 티어 번호 (1~5)
   * @returns {number} 16진수 색상 값
   * @private
   */
  _getTierBorderColor(tier) {
    switch (tier) {
      case 1: return 0xb2bec3;
      case 2: return 0xb2bec3;
      case 3: return 0xffd700;
      case 4: return 0xa29bfe;
      case 5: return 0xffd700;
      default: return 0x636e72;
    }
  }

  /**
   * 공격 유형 키를 짧은 배지 문자열로 변환한다.
   * @param {string} attackType - 공격 유형 키 (예: 'single', 'splash')
   * @returns {string} 표시용 배지 문자열 (예: 'Single', 'Splash')
   * @private
   */
  _getAttackTypeBadge(attackType) {
    const map = {
      'single': 'Single',
      'splash': 'Splash',
      'aoe_instant': 'AoE',
      'chain': 'Chain',
      'piercing_beam': 'Beam',
      'dot_single': 'DoT',
    };
    return map[attackType] || attackType;
  }

}
