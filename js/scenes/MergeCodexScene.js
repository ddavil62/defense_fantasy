/**
 * @fileoverview MergeCodexScene - 합성 도감 (타워 레시피 카탈로그) 씬.
 * 타워 발견 여부에 따라 실루엣/공개 형태로 표시하며,
 * 미발견 T3+ 타워에 대해 재료 발견 상태 기반 힌트를 제공한다.
 * GameScene(일시정지 오버레이)과 CollectionScene(도감 탭) 양쪽에서 접근 가능하다.
 * 카드 클릭 시 TowerInfoOverlay를 통해 상세 정보를 표시한다.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS,
  TOWER_STATS, MERGE_RECIPES, MERGED_TOWER_STATS,
  CODEX_TIER_BG, ATTACK_TYPE_COLORS_CSS,
  META_UPGRADE_CONFIG, SAVE_KEY,
} from '../config.js';
import { t } from '../i18n.js';
import { TowerInfoOverlay } from '../ui/TowerInfoOverlay.js';

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
/** @const {number} 도감 카드 높이 — 발견/미발견 모두 동일 높이 적용 */
const CODEX_CARD_H = 88;
/** @const {number} 도감 그리드 열 수 */
const CODEX_COLS = 5;
/** @const {number} 도감 카드 간 간격 */
const CODEX_CARD_GAP = 6;
/** @const {number} 도감 그리드 시작 X 좌표 (가운데 정렬) */
const CODEX_GRID_X = (GAME_WIDTH - (CODEX_COLS * CODEX_CARD_W + (CODEX_COLS - 1) * CODEX_CARD_GAP)) / 2;

/**
 * 합성 도감 씬 클래스.
 * 발견된 타워는 컬러 아이콘+이름으로, 미발견 타워는 실루엣+???로 표시한다.
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
   * 이전 씬 정보, 스크롤 상태 등을 초기화한다.
   * @param {object} data - 씬 전환 시 전달되는 데이터
   * @param {string} [data.fromScene='CollectionScene'] - 이 도감을 호출한 씬 이름
   */
  init(data) {
    /** @type {string} 이 도감을 호출한 씬 ('GameScene' 또는 'CollectionScene') */
    this.fromScene = data?.fromScene || 'CollectionScene';

    /** @type {number} 현재 활성 서브탭 티어 (1~5), 기본값 T2 */
    this.codexTier = 1;

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

    // 세이브 데이터 로드
    /** @type {object} 세이브 데이터 참조 */
    this._saveData = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');

    /** @type {object} 타워별 메타 업그레이드 선택 정보 */
    this._towerMetaUpgrades = this._saveData.towerUpgrades || {};
  }

  /**
   * 도감 UI를 생성한다.
   * 배경, 상단 바, 서브탭, 도감 그리드, TowerInfoOverlay를 구성하고,
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

    // 타워 정보 오버레이 생성 (codex 모드)
    this.towerInfoOverlay = new TowerInfoOverlay(this, {
      mode: 'codex',
      applyMetaUpgrades: (id, stats) => this._applyMetaUpgradesToStats(id, stats),
    });

    // 100ms 후 입력 허용
    this.time.delayedCall(100, () => { this._inputReady = true; });

    // 씬 종료 시 오버레이 리소스 정리
    this.events.on('shutdown', this._onShutdown, this);
  }

  /**
   * 씬 shutdown 시 TowerInfoOverlay를 파괴하고 리소스를 정리한다.
   * @private
   */
  _onShutdown() {
    this._cleanupCodexDrag();
    if (this.towerInfoOverlay) {
      this.towerInfoOverlay.destroy();
      this.towerInfoOverlay = null;
    }
    this.events.off('shutdown', this._onShutdown, this);
  }

  // ── 발견 여부 판별 ──────────────────────────────────────────

  /**
   * 해당 타워가 발견되었는지 판별한다.
   * T1 타워는 항상 발견 상태이고, T2+ 타워는 saveData.discoveredMerges에 포함 여부로 판단한다.
   * @param {string} towerId - 타워 ID
   * @returns {boolean} 발견 여부
   * @private
   */
  _isTowerDiscovered(towerId) {
    // T1 타워는 항상 발견
    if (TOWER_STATS[towerId]) return true;
    const discovered = this._saveData.discoveredMerges || [];
    return discovered.includes(towerId);
  }

  // ── 상단 바 ─────────────────────────────────────────────────

  /**
   * 상단 내비게이션 바를 생성한다.
   * BACK 버튼(이전 씬 복귀)과 "합성 도감" 타이틀을 포함한다.
   * @private
   */
  _createTopBar() {
    // 배경 (depth 10: 카드 컨테이너 depth 6, 서브탭 depth 8 보다 위)
    this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH, 48, COLORS.HUD_BG)
      .setDepth(10);

    // BACK 버튼 (depth 10: 스크롤된 카드가 이벤트를 가로채지 못하도록)
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
      this._goBack();
    });

    // 타이틀
    this.add.text(180, 24, t('codex.title'), {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);
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
   * T3+ 미발견 타워 중 재료를 하나도 발견하지 못한 조합은 목록에서 제외한다.
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

      const discovered = this._isTowerDiscovered(recipe.id);



      data[tier].push({
        id: recipe.id,
        displayName: recipe.displayName,
        color: recipe.color,
        attackType: mergedStats ? mergedStats.attackType : 'unknown',
        recipeKey: recipeKey,
        tier: tier,
        discovered: discovered,
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
        fontFamily: 'Galmuri11, Arial, sans-serif',
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
   * 발견/미발견에 따라 다른 카드 형태를 사용하고, 진행률을 표시한다.
   * 스크롤 마스크, 카드 배치, 드래그 스크롤 설정을 포함한다.
   * @private
   */
  _buildCodexContent() {
    if (this._codexContentContainer) {
      this._codexContentContainer.destroy();
    }
    this._cleanupCodexDrag();

    const tierData = this._tierDataCache[this.codexTier] || [];

    // 전체 타워 수 (MERGE_RECIPES에서 해당 티어의 총 수)
    let totalForTier = 0;
    if (this.codexTier === 1) {
      totalForTier = TOWER_ORDER.length;
    } else {
      for (const [, recipe] of Object.entries(MERGE_RECIPES)) {
        if (recipe.tier === this.codexTier) totalForTier++;
      }
    }

    // 발견된 수 계산
    let discoveredCount = 0;
    if (this.codexTier === 1) {
      discoveredCount = totalForTier; // T1은 모두 발견
    } else {
      const discovered = this._saveData.discoveredMerges || [];
      for (const [, recipe] of Object.entries(MERGE_RECIPES)) {
        if (recipe.tier === this.codexTier && discovered.includes(recipe.id)) {
          discoveredCount++;
        }
      }
    }

    // 콘텐츠 컨테이너
    this._codexContentContainer = this.add.container(0, 0).setDepth(6);

    // 진행도 텍스트 (발견 수 / 전체 수)
    const progressStr = t('codex.progressDiscovery')
      .replace('{n}', String(this.codexTier))
      .replace('{discovered}', String(discoveredCount))
      .replace('{total}', String(totalForTier));

    const progressText = this.add.text(GAME_WIDTH / 2, PROGRESS_Y + 8, progressStr, {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
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

    // 카드 bg 참조 배열 초기화 (스크롤 시 interactive 토글에 사용)
    this._codexCardBgs = [];

    // 카드 생성 — 모든 카드 동일 높이 적용으로 균일 그리드 레이아웃 사용
    let currentRow = 0;
    let currentCol = 0;

    for (let i = 0; i < tierData.length; i++) {
      const entry = tierData[i];

      const x = CODEX_GRID_X + currentCol * (CODEX_CARD_W + CODEX_CARD_GAP);
      const y = CODEX_GRID_Y + currentRow * (CODEX_CARD_H + CODEX_CARD_GAP);

      this._createCodexCard(entry, x, y, CODEX_CARD_H);

      currentCol++;

      if (currentCol >= CODEX_COLS) {
        currentCol = 0;
        currentRow++;
      }
    }

    // 마지막 불완전 행 포함 총 행 수 계산
    const totalRows = currentCol > 0 ? currentRow + 1 : currentRow;

    // 총 콘텐츠 높이 계산으로 최대 스크롤값 결정
    const totalContentH = totalRows * (CODEX_CARD_H + CODEX_CARD_GAP) - CODEX_CARD_GAP;
    this._codexMaxScroll = Math.max(0, totalContentH - scrollAreaH + 10);

    // 초기 스크롤 오프셋 적용
    this.codexScrollY = 0;
    this._applyCodexScroll();

    // 드래그 스크롤 설정
    this._setupCodexDrag();
  }

  /**
   * 개별 도감 카드를 생성한다.
   * 발견된 카드는 컬러 아이콘+이름+배지, 미발견 카드는 실루엣+???로 표시한다.
   * @param {object} entry - 티어 데이터 항목 { id, displayName, color, attackType, recipeKey, tier, discovered }
   * @param {number} x - 카드 좌상단 X 좌표
   * @param {number} y - 카드 좌상단 Y 좌표
   * @param {number} cardH - 카드 높이 (CODEX_CARD_H 고정)
   * @private
   */
  _createCodexCard(entry, x, y, cardH) {
    const cx = x + CODEX_CARD_W / 2;
    const cy = y + cardH / 2;
    const discovered = entry.discovered !== false; // T1은 discovered 필드가 없으므로 기본 true

    const borderColor = discovered
      ? this._getTierBorderColor(entry.tier)
      : 0x444444;
    const cardBgColor = discovered
      ? (CODEX_TIER_BG[entry.tier] || COLORS.UI_PANEL)
      : 0x111118;

    const bg = this.add.rectangle(cx, cy, CODEX_CARD_W, cardH, cardBgColor)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });
    this.codexScrollContainer.add(bg);

    // 스크롤 시 visible 영역 밖 카드의 interactive 비활성화에 사용
    this._codexCardBgs.push({ bg, baseY: y, cardH });

    // 신규 발견 빨간 점 (newDiscoveries에 포함된 경우)
    const newDiscoveries = this._saveData.newDiscoveries || [];
    let redDot = null;
    if (discovered && newDiscoveries.includes(entry.id)) {
      redDot = this.add.graphics();
      redDot.fillStyle(0xff0000, 1);
      redDot.fillCircle(x + CODEX_CARD_W - 6, y + 6, 5);
      this.codexScrollContainer.add(redDot);
    }

    if (discovered) {
      // ── 발견된 타워: 컬러 아이콘 + 이름 + 배지 ──
      const codexTexKey = `tower_${entry.id}`;
      if (this.textures.exists(codexTexKey)) {
        const iconImg = this.add.image(cx, y + 20, codexTexKey)
          .setDisplaySize(32, 32);
        this.codexScrollContainer.add(iconImg);
      } else {
        const circleG = this.add.graphics();
        circleG.fillStyle(entry.color, 1);
        circleG.fillCircle(cx, y + 20, 14);
        this.codexScrollContainer.add(circleG);
      }

      // 타워 이름 (6자 초과 시 5자+'..' 로 말줄임)
      const displayName = entry.displayName.length > 6
        ? entry.displayName.substring(0, 5) + '..'
        : entry.displayName;
      const nameText = this.add.text(cx, y + 40, displayName, {
        fontSize: '9px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.codexScrollContainer.add(nameText);

      // 공격 유형 배지 (유형별 고유 색상 적용)
      const badgeStr = this._getAttackTypeBadge(entry.attackType);
      const badgeColor = ATTACK_TYPE_COLORS_CSS[entry.attackType] || '#81ecec';
      const badgeText = this.add.text(cx, y + 54, badgeStr, {
        fontSize: '8px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: badgeColor,
        backgroundColor: '#0d1117',
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5);
      this.codexScrollContainer.add(badgeText);

      // 티어 배지
      const tierBadge = this.add.text(cx, y + 67, `T${entry.tier}`, {
        fontSize: '8px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
      }).setOrigin(0.5);
      this.codexScrollContainer.add(tierBadge);

      // pointerup 사용 - 드래그 스크롤과 탭 클릭을 구분하기 위함
      bg.on('pointerup', () => {
        if (!this._inputReady) return;
        if (!this.codexDragMoved && Date.now() - this.towerInfoOverlay.getClosedAt() > 200) {
          // newDiscoveries에서 해당 mergeId 제거 + 빨간 점 제거
          this._clearNewDiscovery(entry.id, redDot);
          this._showCodexCardOverlay(entry);
        }
      });
    } else {
      // ── 미발견 타워: 실루엣 + ??? ──
      const circleG = this.add.graphics();
      circleG.fillStyle(0x222222, 1);
      circleG.fillCircle(cx, y + 20, 14);
      this.codexScrollContainer.add(circleG);

      // "?" 텍스트
      const qMark = this.add.text(cx, y + 20, '?', {
        fontSize: '16px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#444444',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.codexScrollContainer.add(qMark);

      // ??? 이름
      const nameText = this.add.text(cx, y + 40, t('discovery.undiscovered'), {
        fontSize: '9px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      this.codexScrollContainer.add(nameText);

      // 티어 배지
      const tierBadge = this.add.text(cx, y + 54, `T${entry.tier}`, {
        fontSize: '8px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      this.codexScrollContainer.add(tierBadge);

      // 힌트 텍스트 (재료 발견 상태에 따라 표시)
      if (entry.recipeKey) {
        const hintStr = this._buildHintString(entry.recipeKey);
        if (hintStr) {
          const hintText = this.add.text(cx, y + 68, hintStr, {
            fontSize: '7px',
            fontFamily: 'Galmuri11, Arial, sans-serif',
            color: '#555555',
            wordWrap: { width: CODEX_CARD_W - 4 },
            align: 'center',
          }).setOrigin(0.5, 0);
          this.codexScrollContainer.add(hintText);
        }
      }

      // 미발견 카드 클릭 시 토스트 표시
      bg.on('pointerup', () => {
        if (!this._inputReady) return;
        if (!this.codexDragMoved) {
          this._showUndiscoveredToast();
        }
      });
    }
  }

  /**
   * 재료 발견 상태에 따라 조합 힌트 문자열을 생성한다.
   * 재료 A/B 발견 상태별로 "재료A + ???", "??? + 재료B", "재료A + 재료B" 형태로 반환한다.
   * @param {string} recipeKey - 합성 레시피 키 (예: "archer+mage")
   * @returns {string|null} 힌트 문자열 (null이면 표시하지 않음)
   * @private
   */
  _buildHintString(recipeKey) {
    const parts = recipeKey.split('+');
    if (parts.length !== 2) return null;

    const matAId = parts[0];
    const matBId = parts[1];
    const matADiscovered = this._isTowerDiscovered(matAId);
    const matBDiscovered = this._isTowerDiscovered(matBId);

    const matAName = matADiscovered ? this._getTowerDisplayName(matAId) : t('discovery.hintUnknown');
    const matBName = matBDiscovered ? this._getTowerDisplayName(matBId) : t('discovery.hintUnknown');

    return `${matAName} + ${matBName}`;
  }

  /**
   * 타워 ID에서 표시 이름을 반환한다.
   * @param {string} towerId - 타워 ID
   * @returns {string} 표시 이름
   * @private
   */
  _getTowerDisplayName(towerId) {
    // T1 타워
    if (TOWER_STATS[towerId]) {
      return t(`tower.${towerId}.name`) || TOWER_STATS[towerId].displayName;
    }
    // T2+ 합성 타워
    for (const [, recipe] of Object.entries(MERGE_RECIPES)) {
      if (recipe.id === towerId) {
        return recipe.displayName;
      }
    }
    return towerId;
  }

  /**
   * newDiscoveries 배열에서 해당 mergeId를 제거하고 빨간 점을 삭제한다.
   * @param {string} mergeId - 타워 ID
   * @param {Phaser.GameObjects.Graphics|null} redDot - 빨간 점 그래픽 (없으면 null)
   * @private
   */
  _clearNewDiscovery(mergeId, redDot) {
    const newDiscoveries = this._saveData.newDiscoveries || [];
    const idx = newDiscoveries.indexOf(mergeId);
    if (idx !== -1) {
      newDiscoveries.splice(idx, 1);
      this._saveData.newDiscoveries = newDiscoveries;

      // 신규 발견 보상: 다이아몬드 1개 지급
      this._saveData.diamond = (this._saveData.diamond || 0) + 1;

      // registry 세이브 데이터도 동기화
      const registrySave = this.registry.get('saveData');
      if (registrySave) {
        registrySave.newDiscoveries = newDiscoveries;
        registrySave.diamond = this._saveData.diamond;
      }

      // localStorage에 저장
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this._saveData));
      } catch (e) {
        // localStorage 쓰기 실패 무시
      }

      // 빨간 점 제거
      if (redDot) {
        redDot.destroy();
      }

      // 다이아 보상 토스트 표시
      this._showDiamondRewardToast();
    }
  }

  /**
   * 신규 발견 다이아몬드 보상 토스트를 표시한다.
   * 화면 하단에서 위로 떠오르며 페이드아웃된다.
   * @private
   */
  _showDiamondRewardToast() {
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '\u25C6 +1', {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#9b59b6',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: toast,
      y: toast.y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => { toast.destroy(); },
    });
  }

  /**
   * 미발견 타워 클릭 시 "아직 발견하지 못한 타워입니다" 토스트를 표시한다.
   * @private
   */
  _showUndiscoveredToast() {
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, t('discovery.undiscoveredToast'), {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: GAME_HEIGHT - 80,
      duration: 1200,
      delay: 600,
      onComplete: () => toast.destroy(),
    });
  }

  // ── 카드 오버레이 ──────────────────────────────────────────

  /**
   * 도감 카드 클릭 시 TowerInfoOverlay를 통해 상세 정보를 표시한다.
   * @param {object} entry - 티어 데이터 항목
   * @private
   */
  _showCodexCardOverlay(entry) {
    this.towerInfoOverlay.open(entry);
  }

  // ── 메타 업그레이드 적용 ─────────────────────────────────────

  /**
   * 메타 업그레이드 보너스를 일반 스탯 객체에 적용한다.
   * GameScene._applyMetaUpgradesToTower의 로직을 미러링하되,
   * 타워 인스턴스 대신 일반 객체에서 동작한다.
   * damage/fireRate/range 3개 슬롯의 레벨에 따라 누적 곱연산으로 보너스를 적용한다.
   * @param {string} towerType - 타워 타입 id (예: 'archer')
   * @param {object} stats - { damage, fireRate, range, ... } - 직접 변경됨
   * @private
   */
  _applyMetaUpgradesToStats(towerType, stats) {
    const upgrades = this._towerMetaUpgrades[towerType];
    if (!upgrades) return;

    const { BONUS_PER_LEVEL } = META_UPGRADE_CONFIG;

    // 공격력 보너스: 1.1^n
    const damageLevel = upgrades.damage || 0;
    if (damageLevel > 0) {
      stats.damage *= Math.pow(1 + BONUS_PER_LEVEL, damageLevel);
      stats.damage = Math.round(stats.damage);
    }

    // 공격속도 보너스: 0.9^n
    const fireRateLevel = upgrades.fireRate || 0;
    if (fireRateLevel > 0) {
      stats.fireRate *= Math.pow(1 - BONUS_PER_LEVEL, fireRateLevel);
    }

    // 사거리 보너스: 1.1^n
    const rangeLevel = upgrades.range || 0;
    if (rangeLevel > 0) {
      stats.range *= Math.pow(1 + BONUS_PER_LEVEL, rangeLevel);
      stats.range = Math.round(stats.range);
    }
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
    // 오버레이가 열려 있으면 도감 그리드 드래그 차단
    if (this.towerInfoOverlay && this.towerInfoOverlay.isOpen()) return;
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

    // 스크롤 후 visible 영역 밖 카드의 interactive를 비활성화하여
    // 마스크 밖에서 포인터 이벤트를 가로채는 것을 방지
    if (this._codexCardBgs) {
      for (const { bg, baseY, cardH } of this._codexCardBgs) {
        const worldY = baseY - this.codexScrollY;
        const h = cardH || CODEX_CARD_H;
        const cardBottomY = worldY + h;
        const isVisible = cardBottomY > CODEX_GRID_Y && worldY < GAME_HEIGHT;
        if (isVisible) {
          bg.setInteractive({ useHandCursor: true });
        } else {
          bg.disableInteractive();
        }
      }
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
