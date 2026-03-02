/**
 * @fileoverview TowerInfoOverlay - 타워 상세 정보 오버레이 공용 컴포넌트.
 * 인게임(game 모드)과 합성도감(codex 모드) 양쪽에서 사용되며,
 * 타워 스탯, Y자 합성 트리, 상위 조합 목록, 드릴다운 탐색을 제공한다.
 * game 모드에서는 강화/판매 버튼이 추가된다.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, CELL_SIZE,
  TOWER_STATS, MERGE_RECIPES, MERGED_TOWER_STATS,
  ATTACK_TYPE_COLORS_CSS, BTN_PRIMARY, BTN_DANGER,
  MAX_ENHANCE_LEVEL,
} from '../config.js';
import { t } from '../i18n.js';

// ── 레이아웃 상수 ──────────────────────────────────────────────

/** @const {number} 오버레이 패널 너비 (px) — 게임 너비(360) 대비 75% */
const PANEL_W = 270;

/** @const {number} NineSlice 상단 슬라이스 (루비 장식 포함) */
const NS_TOP = 48;
/** @const {number} NineSlice 하단 슬라이스 (눈 장식 포함) */
const NS_BOTTOM = 44;
/** @const {number} NineSlice 좌측 슬라이스 (골드 기둥) */
const NS_LEFT = 24;
/** @const {number} NineSlice 우측 슬라이스 (골드 기둥) */
const NS_RIGHT = 24;

/** @const {number} T1 패널 텍스트 요소 간 최소 여백 (px) */
const T1_CONTENT_GAP = 8;
/** @const {number} T1 패널 섹션 간 여백 (공격 배지 위 등) (px) */
const T1_SECTION_GAP = 16;

/**
 * 타워 상세 정보 오버레이 클래스.
 * 'game' 모드와 'codex' 모드를 지원하며,
 * 공통 레이아웃(스탯, 트리, 상위 조합)에 모드별 추가 기능을 제공한다.
 */
export class TowerInfoOverlay {
  /**
   * TowerInfoOverlay 인스턴스를 생성한다.
   * @param {Phaser.Scene} scene - 오버레이가 표시될 Phaser 씬
   * @param {object} options - 설정 옵션
   * @param {'game'|'codex'} options.mode - 동작 모드
   * @param {Function} [options.onEnhance] - 강화 버튼 클릭 콜백 (game 모드)
   * @param {Function} [options.onSell] - 판매 버튼 클릭 콜백 (game 모드)
   * @param {Function} [options.applyMetaUpgrades] - 메타 업그레이드 적용 함수(id, stats)
   */
  constructor(scene, options) {
    /** @type {Phaser.Scene} 소속 씬 */
    this.scene = scene;

    /** @type {'game'|'codex'} 동작 모드 */
    this.mode = options.mode || 'game';

    /** @type {Function|null} 강화 콜백 (game 모드 전용) */
    this._onEnhance = options.onEnhance || null;

    /** @type {Function|null} 판매 콜백 (game 모드 전용) */
    this._onSell = options.onSell || null;

    /** @type {Function|null} 메타 업그레이드 적용 함수 */
    this._applyMetaUpgrades = options.applyMetaUpgrades || null;

    /** @type {Phaser.GameObjects.Container|null} 현재 활성 오버레이 컨테이너 */
    this._container = null;

    /** @type {object[]} 드릴다운 히스토리 스택 */
    this._history = [];

    /** @type {number} 오버레이가 마지막으로 닫힌 시각 (ms, 재오픈 방지용) */
    this._closedAt = 0;

    /** @type {object|null} 원래(depth=0) Tower 인스턴스 (game 모드) */
    this._sourceTower = null;

    /** @type {Phaser.GameObjects.Text|null} 상위 조합 스크롤 힌트 */
    this._usedInScrollHint = null;

    /** @type {Function|null} 상위 조합 드래그 스크롤 pointermove 리스너 참조 */
    this._scrollMoveHandler = null;

    /** @type {Function|null} 상위 조합 드래그 스크롤 pointerup 리스너 참조 */
    this._scrollUpHandler = null;

    /** @type {boolean} 현재 보기가 강화된 원본 타워인지 여부 (baseH 동적 계산용) */
    this._isSourceWithEnhance = false;
  }

  // ── 공개 API ──────────────────────────────────────────────────

  /**
   * 오버레이를 연다.
   * game 모드에서는 Tower 인스턴스를, codex 모드에서는 entry 객체를 받는다.
   * 히스토리를 초기화하고 새 탐색을 시작한다.
   * @param {object} towerOrEntry - Tower 인스턴스(game) 또는 entry 객체(codex)
   */
  open(towerOrEntry) {
    this._history = [];

    if (this.mode === 'game') {
      // Tower 인스턴스를 저장하고 entry 객체로 변환
      this._sourceTower = towerOrEntry;
      const entry = this._buildEntryFromTower(towerOrEntry);
      this._render(entry);
    } else {
      this._sourceTower = null;
      this._render(towerOrEntry);
    }
  }

  /**
   * 오버레이를 닫는다 (뒤로가기 기반).
   * 히스토리가 남아있으면 이전 항목으로 되돌아간다.
   */
  close() {
    this._forceClose();
  }

  /**
   * 뒤로가기를 외부에서 트리거한다.
   * 히스토리가 있으면 이전 항목으로, 없으면 오버레이를 닫는다.
   * ESC 키 핸들러 등 외부에서 _handleBack()을 호출할 때 사용한다.
   */
  handleBack() {
    this._handleBack();
  }

  /**
   * 오버레이가 현재 열려 있는지 확인한다.
   * @returns {boolean} 열려 있으면 true
   */
  isOpen() {
    return this._container !== null;
  }

  /**
   * 오버레이가 마지막으로 닫힌 시각을 반환한다.
   * 재오픈 방지 쿨다운 판정에 사용된다.
   * @returns {number} 닫힌 시각 (ms)
   */
  getClosedAt() {
    return this._closedAt;
  }

  /**
   * 모든 Phaser 오브젝트를 정리하고 메모리를 해제한다.
   */
  destroy() {
    this._forceClose();
  }

  // ── 내부 렌더링 ──────────────────────────────────────────────

  /**
   * 오버레이 전체를 렌더링(또는 재렌더링)한다.
   * 기존 컨테이너를 파괴한 뒤, 배경막/패널/헤더/콘텐츠를 새로 구성한다.
   * @param {object} entry - 표시할 타워 entry 객체
   * @private
   */
  _render(entry) {
    this._removeScrollListeners();
    if (this._container) this._container.destroy();
    this._usedInScrollHint = null;

    const depth = this.mode === 'game' ? 100 : 50;
    this._container = this.scene.add.container(0, 0).setDepth(depth);

    // ── 배경막 (어둡고 거의 불투명) ──
    const backdrop = this.scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0x050510
    ).setAlpha(0.96).setInteractive();
    this._container.add(backdrop);
    backdrop.on('pointerdown', () => this._handleBack());

    // 상위 조합 목록 계산
    const usedInList = this._findUsedInRecipes(entry.id);
    const panelX = GAME_WIDTH / 2;

    // 강화 레벨 여부 플래그 (하위 렌더링에서 참조)
    this._isSourceWithEnhance = this.mode === 'game'
      && this._history.length === 0
      && this._sourceTower
      && (this._sourceTower.getInfo().enhanceLevel > 0);

    const isSourceView = this.mode === 'game' && this._history.length === 0;

    // ── 넉넉한 고정 패널 높이 ──
    // 화면(640px)의 대부분을 차지하여 상위 조합 영역 오버플로를 방지한다.
    // game 모드 액션 버튼이 있으면 추가 공간 확보.
    const actionH = (isSourceView && this._sourceTower) ? 90 : 0;
    const panelH = 540 + actionH;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    // ── 패널 배경 (이미지 또는 사각형 폴백) ──
    let panelBg;
    if (this.scene.textures.exists('panel_info_overlay')) {
      panelBg = this.scene.add.nineslice(
        panelX, panelY,
        'panel_info_overlay',
        null,
        PANEL_W, panelH,
        NS_LEFT, NS_RIGHT, NS_TOP, NS_BOTTOM
      ).setInteractive();
    } else {
      panelBg = this.scene.add.rectangle(panelX, panelY, PANEL_W, panelH, COLORS.UI_PANEL)
        .setStrokeStyle(2, BTN_PRIMARY)
        .setInteractive();
    }
    this._container.add(panelBg);

    // ── 헤더 영역 (뒤로 버튼 + 닫기 버튼) ──
    this._renderHeader(panelX, panelTop);

    // ── 콘텐츠 영역 (티어에 따라 분기) ──
    let contentBottomY;
    if (entry.tier === 1) {
      contentBottomY = this._renderT1Panel(entry, panelX, panelTop, usedInList);
    } else {
      contentBottomY = this._renderTreePanel(entry, panelX, panelTop, usedInList);
    }

    // ── game 모드 액션 버튼 (원래 타워 보기 중에만 표시) ──
    if (isSourceView && this._sourceTower) {
      this._renderActionButtons(panelX, contentBottomY);
    }
  }

  /**
   * 헤더 영역(뒤로 버튼, 닫기 버튼)을 렌더링한다.
   * @param {number} panelX - 패널 중심 X 좌표
   * @param {number} panelTop - 패널 상단 Y 좌표
   * @private
   */
  _renderHeader(panelX, panelTop) {
    // 뒤로 버튼 (드릴다운 중에만 표시)
    if (this._history.length > 0) {
      const backBg = this.scene.add.rectangle(
        panelX - PANEL_W / 2 + 40, panelTop + 15, 60, 24, 0x000000, 0
      ).setStrokeStyle(1, 0x636e72)
        .setInteractive({ useHandCursor: true });
      this._container.add(backBg);

      const backLabel = this.scene.add.text(
        panelX - PANEL_W / 2 + 40, panelTop + 15, '< \ub4a4\ub85c', {
          fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffffff',
        }
      ).setOrigin(0.5);
      this._container.add(backLabel);

      backBg.on('pointerdown', () => this._handleBack());
    }

    // 닫기 (X) 버튼
    const closeX = panelX + PANEL_W / 2 - 20;
    const closeY = panelTop + 15;
    const closeBg = this.scene.add.circle(closeX, closeY, 12, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true });
    this._container.add(closeBg);

    const closeText = this.scene.add.text(closeX, closeY, 'X', {
      fontSize: '14px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._container.add(closeText);

    closeBg.on('pointerdown', () => this._forceClose());
  }

  // ── T1 스탯 패널 ─────────────────────────────────────────────

  /**
   * T1 타워의 스탯 패널을 렌더링한다.
   * 타워 이름, 색상 원, 공격 유형, 기본 스탯을 표시한다.
   * @param {object} entry - T1 entry 객체
   * @param {number} panelX - 패널 중심 X
   * @param {number} panelTop - 패널 상단 Y
   * @param {Array} usedInList - 상위 조합 레시피 목록
   * @returns {number} 콘텐츠 하단 Y 좌표
   * @private
   */
  _renderT1Panel(entry, panelX, panelTop, usedInList) {
    // 타워 이름
    const nameText = this.scene.add.text(panelX, panelTop + 40, entry.displayName, {
      fontSize: '16px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._container.add(nameText);

    // 타워 아이콘 (이미지 우선, 폴백 시 색상 원) + 티어 배지
    const towerTexKey = `tower_${entry.id}`;
    if (this.scene.textures.exists(towerTexKey)) {
      const iconImg = this.scene.add.image(panelX - 30, panelTop + 65, towerTexKey)
        .setDisplaySize(28, 28);
      this._container.add(iconImg);
    } else {
      const circleG = this.scene.add.graphics();
      circleG.fillStyle(entry.color, 1);
      circleG.fillCircle(panelX - 30, panelTop + 65, 14);
      this._container.add(circleG);
    }

    const tierBadge = this.scene.add.text(panelX + 5, panelTop + 65, 'T1', {
      fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0, 0.5);
    this._container.add(tierBadge);

    // ── 동적 Y 누산 시작 (이름+원 아래) ──
    let curY = panelTop + 84;

    // 플레이버 텍스트 (분위기) — setOrigin(0.5, 0)으로 상단 기준 배치
    const flavorKey = `tower.${entry.id}.flavor`;
    const flavorStr = t(flavorKey);
    if (flavorStr !== flavorKey) {
      const flavorText = this.scene.add.text(panelX, curY, flavorStr, {
        fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#a0a0a0', fontStyle: 'italic',
        wordWrap: { width: 260 }, align: 'center',
      }).setOrigin(0.5, 0);
      this._container.add(flavorText);
      curY += flavorText.height + T1_CONTENT_GAP;
    }

    // 특징 설명 텍스트 — setOrigin(0.5, 0)으로 상단 기준 배치
    const descKey = `tower.${entry.id}.desc`;
    const descStr = t(descKey);
    if (descStr !== descKey) {
      const descText = this.scene.add.text(panelX, curY, descStr, {
        fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#d0d0d0',
        wordWrap: { width: 260 }, align: 'center',
      }).setOrigin(0.5, 0);
      this._container.add(descText);
      curY += descText.height + T1_SECTION_GAP;
    }

    // 공격 유형 배지
    const atkColor = ATTACK_TYPE_COLORS_CSS[entry.attackType] || '#b2bec3';
    const atkText = this.scene.add.text(panelX, curY,
      this._getAttackTypeBadge(entry.attackType), {
        fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: atkColor,
      }).setOrigin(0.5, 0);
    this._container.add(atkText);
    curY += atkText.height + T1_CONTENT_GAP;

    // 기본 스탯 (메타 업그레이드 보너스 반영)
    const lv1 = TOWER_STATS[entry.id]?.levels?.[1];
    if (lv1) {
      const stats = { damage: lv1.damage, fireRate: lv1.fireRate, range: lv1.range };
      // game 모드 원래 타워 보기 중이면 Tower 인스턴스의 실시간 스탯 사용
      if (this.mode === 'game' && this._history.length === 0 && this._sourceTower) {
        stats.damage = this._sourceTower.stats.damage;
        stats.fireRate = this._sourceTower.stats.fireRate;
        stats.range = this._sourceTower.stats.range;
      } else if (this._applyMetaUpgrades) {
        this._applyMetaUpgrades(entry.id, stats);
      }
      const rangeInTiles = (stats.range / CELL_SIZE).toFixed(1);
      const statsStr = `DMG: ${stats.damage}  |  SPD: ${stats.fireRate}s  |  RNG: ${rangeInTiles}`;
      const statsText = this.scene.add.text(panelX, curY, statsStr, {
        fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#b2bec3',
      }).setOrigin(0.5, 0);
      this._container.add(statsText);
      curY += statsText.height + T1_CONTENT_GAP;
    }

    // game 모드 원래 타워에서 강화 레벨 표시
    if (this.mode === 'game' && this._history.length === 0 && this._sourceTower) {
      const info = this._sourceTower.getInfo();
      if (info.enhanceLevel > 0) {
        const enhText = this.scene.add.text(panelX, curY,
          `+${info.enhanceLevel}`, {
            fontSize: '10px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffd700',
          }).setOrigin(0.5, 0);
        this._container.add(enhText);
        curY += enhText.height + T1_CONTENT_GAP;
      }
    }

    // 상위 조합 섹션 — curY 누산 기반으로 enhanceOffset 분기 불필요
    if (usedInList.length > 0) {
      this._renderUsedInSection(entry, usedInList, panelX, curY);
      return curY + 100; // usedIn viewH = 100
    }

    return curY;
  }

  // ── T2+ 합성 트리 패널 ──────────────────────────────────────

  /**
   * T2+ 항목의 합성 트리 노드 패널을 렌더링한다.
   * 결과 노드(상단)와 두 재료 노드(하단 좌/우)를 Y자 연결선으로 표시한다.
   * @param {object} entry - T2+ entry 객체
   * @param {number} panelX - 패널 중심 X
   * @param {number} panelTop - 패널 상단 Y
   * @param {Array} usedInList - 상위 조합 레시피 목록
   * @returns {number} 콘텐츠 하단 Y 좌표
   * @private
   */
  _renderTreePanel(entry, panelX, panelTop, usedInList) {
    // 레시피 키에서 두 재료를 추출
    const parts = entry.recipeKey ? entry.recipeKey.split('+') : [];
    const matAEntry = parts[0] ? this._buildEntryFromConfig(parts[0]) : null;
    const matBEntry = parts[1] ? this._buildEntryFromConfig(parts[1]) : null;

    // ── 결과 노드 (상단 중앙) ──
    const resultY = panelTop + 90;
    const resultR = 28;

    // 결과 타워 아이콘 (이미지 우선, 폴백 시 색상 원)
    const resultTexKey = `tower_${entry.id}`;
    if (this.scene.textures.exists(resultTexKey)) {
      const resultImg = this.scene.add.image(panelX, resultY, resultTexKey)
        .setDisplaySize(resultR * 2, resultR * 2);
      this._container.add(resultImg);
    } else {
      const resultCircle = this.scene.add.graphics();
      resultCircle.fillStyle(entry.color, 1);
      resultCircle.fillCircle(panelX, resultY, resultR);
      resultCircle.lineStyle(2, BTN_PRIMARY, 1);
      resultCircle.strokeCircle(panelX, resultY, resultR);
      this._container.add(resultCircle);
    }

    // ── 동적 Y 누산 시작 (결과 원 아래) ──
    const resultName = this.scene.add.text(panelX, panelTop + 128, entry.displayName, {
      fontSize: '12px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this._container.add(resultName);

    let treeNextY = panelTop + 128 + resultName.height + 4;

    // 결과 타워 특징 설명 — setOrigin(0.5, 0)으로 상단 기준 배치
    const treeDescKey = `tower.${entry.id}.desc`;
    const treeDescStr = t(treeDescKey);
    if (treeDescStr !== treeDescKey) {
      const treeDescText = this.scene.add.text(panelX, treeNextY, treeDescStr, {
        fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#a0a0a0',
        wordWrap: { width: 260 }, align: 'center',
      }).setOrigin(0.5, 0);
      this._container.add(treeDescText);
      treeNextY += treeDescText.height + 4;
    }

    const resultTier = this.scene.add.text(panelX, treeNextY, `T${entry.tier}`, {
      fontSize: '10px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0.5, 0);
    this._container.add(resultTier);
    treeNextY += resultTier.height + 8;

    // ── Y자 연결선 (treeNextY 기준 상대 오프셋) ──
    const connectorStartY = treeNextY;
    const forkY = treeNextY + 20;
    const matY = forkY + 35;
    const matR = 20;
    const matOffsetX = 55;
    const matAX = panelX - matOffsetX;
    const matBX = panelX + matOffsetX;

    const lines = this.scene.add.graphics();
    this._renderConnectorLines(lines,
      { x: panelX, y: connectorStartY }, forkY,
      { x: matAX, y: matY }, { x: matBX, y: matY }
    );
    this._container.add(lines);

    // ── 재료 노드 (좌/우) ──
    if (matAEntry) this._renderMaterialNode(matAEntry, matAX, matY, matR, matY, entry);
    if (matBEntry) this._renderMaterialNode(matBEntry, matBX, matY, matR, matY, entry);

    // ── 트리 아래 스탯 표시 (matY + matR 기준 상대 오프셋) ──
    let nextY = matY + matR + 40;
    const mergedStats = MERGED_TOWER_STATS[entry.id];
    if (mergedStats) {
      const divider = this.scene.add.graphics();
      divider.lineStyle(1, 0x636e72, 0.5);
      divider.lineBetween(panelX - PANEL_W / 2 + 20, nextY, panelX + PANEL_W / 2 - 20, nextY);
      this._container.add(divider);
      nextY += 14;

      // game 모드 원래 타워 보기 중이면 실시간 스탯 사용
      let dmg = mergedStats.damage;
      let spd = mergedStats.fireRate;
      let rng = mergedStats.range;
      if (this.mode === 'game' && this._history.length === 0 && this._sourceTower) {
        dmg = this._sourceTower.stats.damage;
        spd = this._sourceTower.stats.fireRate;
        rng = this._sourceTower.stats.range;
      }
      const rangeInTiles = (rng / CELL_SIZE).toFixed(1);
      const statsStr = `DMG: ${dmg}  |  SPD: ${spd}s  |  RNG: ${rangeInTiles}`;
      const statsText = this.scene.add.text(panelX, nextY, statsStr, {
        fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#b2bec3',
      }).setOrigin(0.5);
      this._container.add(statsText);
      nextY += 16;
    }

    // game 모드 원래 타워에서 강화 레벨 표시
    if (this.mode === 'game' && this._history.length === 0 && this._sourceTower) {
      const info = this._sourceTower.getInfo();
      if (info.enhanceLevel > 0) {
        const enhText = this.scene.add.text(panelX, nextY,
          `+${info.enhanceLevel}`, {
            fontSize: '10px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffd700',
          }).setOrigin(0.5);
        this._container.add(enhText);
        nextY += 16;
      }
    }

    // ── 상위 조합 섹션 ──
    if (usedInList.length > 0) {
      this._renderUsedInSection(entry, usedInList, panelX, nextY);
      return nextY + 100; // usedIn viewH = 100
    }

    return nextY;
  }

  /**
   * 재료 노드 하나를 렌더링한다 (색상 원 + 이름 + 티어 배지).
   * 클릭 시 해당 재료 타워의 상세 정보로 드릴다운한다.
   * @param {object} matEntry - 재료 타워의 entry 객체
   * @param {number} cx - 노드 중심 X 좌표
   * @param {number} cy - 노드 중심 Y 좌표
   * @param {number} r - 원 반지름
   * @param {number} matBaseY - 재료 노드 중심 Y (이름/배지 상대 오프셋 기준)
   * @param {object} currentEntry - 현재 결과 항목 (히스토리 push용)
   * @private
   */
  _renderMaterialNode(matEntry, cx, cy, r, matBaseY, currentEntry) {
    // 재료 타워 아이콘 (이미지 우선, 폴백 시 색상 원)
    const matTexKey = `tower_${matEntry.id}`;
    if (this.scene.textures.exists(matTexKey)) {
      const matImg = this.scene.add.image(cx, cy, matTexKey)
        .setDisplaySize(r * 2, r * 2);
      this._container.add(matImg);
    } else {
      const circle = this.scene.add.graphics();
      circle.fillStyle(matEntry.color, 1);
      circle.fillCircle(cx, cy, r);
      const borderColor = matEntry.tier >= 2 ? BTN_PRIMARY : 0x636e72;
      circle.lineStyle(2, borderColor, 1);
      circle.strokeCircle(cx, cy, r);
      this._container.add(circle);
    }

    // 재료 이름 (6자 초과 시 말줄임) — 원 하단 기준 상대 오프셋
    const displayName = matEntry.displayName.length > 6
      ? matEntry.displayName.substring(0, 5) + '..'
      : matEntry.displayName;
    const nameText = this.scene.add.text(cx, matBaseY + r + 8, displayName, {
      fontSize: '10px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    this._container.add(nameText);

    const tierBadge = this.scene.add.text(cx, matBaseY + r + 22, `T${matEntry.tier}`, {
      fontSize: '9px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0.5);
    this._container.add(tierBadge);

    // 투명 히트 영역 (노드 영역을 덮는 클릭 가능 사각형)
    const hitArea = this.scene.add.rectangle(cx, cy + 10, r * 2 + 10, 70, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this._container.add(hitArea);

    hitArea.on('pointerdown', () => {
      // 현재 항목을 히스토리에 저장하고 재료 타워로 드릴다운
      this._history.push(currentEntry);
      this._render(matEntry);
    });
  }

  /**
   * Y자 연결선을 렌더링한다.
   * 결과 노드에서 분기점까지의 수직선, 분기점에서 양쪽 재료로의 수평/수직선을 그린다.
   * @param {Phaser.GameObjects.Graphics} graphics - 그리기 대상
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

  // ── 상위 조합 섹션 ──────────────────────────────────────────

  /**
   * 스크롤 가능한 "상위 조합" 목록 섹션을 렌더링한다.
   * 이 타워가 재료로 사용되는 상위 합성 결과를 나열하며,
   * 각 항목 클릭 시 해당 타워로 드릴다운한다.
   * @param {object} currentEntry - 현재 표시 중인 entry (히스토리 push용)
   * @param {Array} usedInList - _findUsedInRecipes의 결과
   * @param {number} panelX - 패널 중심 X
   * @param {number} startY - 섹션 시작 Y 좌표
   * @private
   */
  _renderUsedInSection(currentEntry, usedInList, panelX, startY) {
    const viewH = 100;
    const rowH = 22;
    const headerH = 18;
    let y = startY + 6;

    // 구분선
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x636e72, 0.5);
    divider.lineBetween(panelX - PANEL_W / 2 + 20, y, panelX + PANEL_W / 2 - 20, y);
    this._container.add(divider);
    y += 8;

    // 섹션 헤더 (스크롤 영역 바깥 고정)
    const header = this.scene.add.text(panelX, y, t('codex.usedIn') || '\uc0c1\uc704 \uc870\ud569', {
      fontSize: '10px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#636e72',
    }).setOrigin(0.5);
    this._container.add(header);
    y += headerH;

    // 스크롤 뷰포트 영역
    const scrollTopY = y;
    const scrollH = viewH - headerH - 14;
    const contentH = usedInList.length * rowH;
    const maxScroll = Math.max(0, contentH - scrollH);

    // 스크롤 가능 컨테이너
    const scrollContainer = this.scene.add.container(0, 0);
    this._container.add(scrollContainer);

    // 상위 조합 항목 텍스트 참조 배열 (호버 효과용)
    const itemTexts = [];

    // 스크롤 컨테이너 내부에 항목 구성
    for (let i = 0; i < usedInList.length; i++) {
      const { resultEntry } = usedInList[i];
      const itemY = scrollTopY + i * rowH + rowH / 2;
      const label = `T${resultEntry.tier} ${resultEntry.displayName}`;
      const itemText = this.scene.add.text(panelX, itemY, label, {
        fontSize: '11px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#dfe6e9',
      }).setOrigin(0.5);
      scrollContainer.add(itemText);
      itemTexts.push({ text: itemText, entry: resultEntry, baseY: itemY });
    }

    // 스크롤 영역 클리핑 마스크
    const maskShape = this.scene.add.rectangle(
      panelX, scrollTopY + scrollH / 2,
      PANEL_W - 10, scrollH, 0x000000
    ).setVisible(false);
    this._container.add(maskShape);
    scrollContainer.setMask(maskShape.createGeometryMask());

    // 스크롤 힌트 (콘텐츠가 넘칠 때만 하단 화살표 표시)
    if (maxScroll > 0) {
      const hint = this.scene.add.text(
        panelX + PANEL_W / 2 - 28, scrollTopY + scrollH - 2, '\u25bc', {
          fontSize: '9px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#636e72',
        }
      ).setOrigin(0.5);
      this._container.add(hint);
      this._usedInScrollHint = hint;
    }

    // 드래그 스크롤 + 클릭 드릴다운 통합 처리
    let scrollY = 0;
    let dragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;
    let didDrag = false; // 드래그 여부 (클릭과 구분)

    // 스크롤 영역을 덮는 투명 드래그 존 (스크롤 + 클릭 모두 처리)
    const dragZone = this.scene.add.rectangle(
      panelX, scrollTopY + scrollH / 2,
      PANEL_W - 10, scrollH, 0x000000, 0
    ).setInteractive({ useHandCursor: true });
    this._container.add(dragZone);

    dragZone.on('pointerdown', (pointer) => {
      dragging = true;
      didDrag = false;
      dragStartY = pointer.y;
      dragStartScroll = scrollY;
    });

    // 리스너 참조를 인스턴스에 저장하여 정리 시 제거 가능하게 함
    this._scrollMoveHandler = (pointer) => {
      if (!dragging) return;
      const dy = pointer.y - dragStartY;
      // 이동 거리가 5px 초과하면 드래그로 판정
      if (Math.abs(dy) > 5) didDrag = true;
      scrollY = Phaser.Math.Clamp(dragStartScroll - dy, 0, maxScroll);
      scrollContainer.y = -scrollY;
      // 스크롤 힌트 가시성 갱신
      if (this._usedInScrollHint) {
        this._usedInScrollHint.setVisible(scrollY < maxScroll - 5);
      }
    };
    this._scrollUpHandler = (pointer) => {
      if (!dragging) return;
      dragging = false;
      // 드래그 없이 짧은 클릭이면 해당 위치의 항목으로 드릴다운
      if (!didDrag) {
        const clickY = pointer.y + scrollY; // 스크롤 오프셋 보정
        for (const item of itemTexts) {
          if (Math.abs(clickY - item.baseY) <= rowH / 2) {
            this._history.push(currentEntry);
            this._render(item.entry);
            return;
          }
        }
      }
    };

    // 호버 효과: 포인터 위치에 따라 항목 색상 변경
    dragZone.on('pointermove', (pointer) => {
      if (dragging) return;
      const hoverY = pointer.y + scrollY;
      for (const item of itemTexts) {
        item.text.setColor(Math.abs(hoverY - item.baseY) <= rowH / 2 ? '#ffd700' : '#dfe6e9');
      }
    });
    dragZone.on('pointerout', () => {
      for (const item of itemTexts) item.text.setColor('#dfe6e9');
    });

    this.scene.input.on('pointermove', this._scrollMoveHandler);
    this.scene.input.on('pointerup', this._scrollUpHandler);
  }

  // ── game 모드 액션 버튼 ──────────────────────────────────────

  /**
   * 강화/판매 버튼을 패널 하단에 렌더링한다 (game 모드 전용).
   * 드릴다운 중(원래 타워가 아닌 다른 타워를 보고 있을 때)에는 호출되지 않는다.
   * @param {number} panelX - 패널 중심 X
   * @param {number} buttonsTopY - 버튼 영역 시작 Y 좌표
   * @private
   */
  _renderActionButtons(panelX, buttonsTopY) {
    const tower = this._sourceTower;
    if (!tower) return;

    const info = tower.getInfo();
    let curY = buttonsTopY + 10;

    // ── 강화 버튼 (오버레이 전용 크기 유지: 200x32) ──
    if (info.canEnhance && info.enhanceLevel < MAX_ENHANCE_LEVEL) {
      const enhBtnW = 200;
      const enhBtnH = 32;
      let enhBtn;
      if (this.scene.textures.exists('btn_medium_primary_normal')) {
        enhBtn = this.scene.add.image(panelX, curY, 'btn_medium_primary_normal')
          .setInteractive({ useHandCursor: true });
        enhBtn.on('pointerdown', () => enhBtn.setTexture('btn_medium_primary_pressed'));
        enhBtn.on('pointerup', () => enhBtn.setTexture('btn_medium_primary_normal'));
        enhBtn.on('pointerout', () => enhBtn.setTexture('btn_medium_primary_normal'));
      } else {
        enhBtn = this.scene.add.rectangle(panelX, curY, enhBtnW, enhBtnH, BTN_PRIMARY)
          .setStrokeStyle(1, 0xffd700)
          .setInteractive({ useHandCursor: true });
      }
      this._container.add(enhBtn);

      const enhLabel = t('ui.enhance')
        .replace('{level}', info.enhanceLevel + 1)
        .replace('{cost}', info.enhanceCost);
      const enhText = this.scene.add.text(panelX, curY, `\u2b06 ${enhLabel}`, {
        fontSize: '12px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this._container.add(enhText);

      enhBtn.on('pointerdown', () => {
        if (this._onEnhance) {
          this._onEnhance(tower);
        }
      });

      curY += enhBtnH + 8;
    }

    // 최대 강화 레벨 도달 시 텍스트 표시
    if (!info.canEnhance && info.enhanceLevel >= MAX_ENHANCE_LEVEL) {
      const maxText = this.scene.add.text(panelX, curY, `\u2b50 ${t('ui.maxEnhance')}`, {
        fontSize: '12px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffd700', fontStyle: 'bold',
      }).setOrigin(0.5);
      this._container.add(maxText);
      curY += 24;
    }

    // ── 판매 버튼 (오버레이 전용 크기 유지: 200x32) ──
    const sellBtnW = 200;
    const sellBtnH = 32;
    let sellBtn;
    if (this.scene.textures.exists('btn_medium_danger_normal')) {
      sellBtn = this.scene.add.image(panelX, curY, 'btn_medium_danger_normal')
        .setInteractive({ useHandCursor: true });
      sellBtn.on('pointerdown', () => sellBtn.setTexture('btn_medium_danger_pressed'));
      sellBtn.on('pointerup', () => sellBtn.setTexture('btn_medium_danger_normal'));
      sellBtn.on('pointerout', () => sellBtn.setTexture('btn_medium_danger_normal'));
    } else {
      sellBtn = this.scene.add.rectangle(panelX, curY, sellBtnW, sellBtnH, BTN_DANGER)
        .setStrokeStyle(1, 0x636e72)
        .setInteractive({ useHandCursor: true });
    }
    this._container.add(sellBtn);

    const sellText = this.scene.add.text(panelX, curY, `Sell ${info.sellPrice}G`, {
      fontSize: '12px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._container.add(sellText);

    sellBtn.on('pointerdown', () => {
      if (this._onSell) {
        this._onSell(tower);
      }
      this._forceClose();
    });
  }

  // ── 내비게이션 ──────────────────────────────────────────────

  /**
   * 뒤로가기를 처리한다.
   * 히스토리에 이전 항목이 있으면 되돌아가고, 없으면 오버레이를 닫는다.
   * @private
   */
  _handleBack() {
    if (this._history.length > 0) {
      const prevEntry = this._history.pop();
      this._render(prevEntry);
    } else {
      this._forceClose();
    }
  }

  /**
   * 히스토리를 무시하고 오버레이를 즉시 완전히 닫는다.
   * 닫힌 시각을 기록하여 즉시 재오픈을 방지한다.
   * @private
   */
  _forceClose() {
    this._removeScrollListeners();
    if (this._container) {
      this._container.destroy();
      this._container = null;
      this._history = [];
      this._closedAt = Date.now();
      this._sourceTower = null;
      this._usedInScrollHint = null;
      this._isSourceWithEnhance = false;
    }
  }

  /**
   * 상위 조합 드래그 스크롤용 scene.input 리스너를 제거한다.
   * _render() 재호출이나 _forceClose() 시 기존 리스너 누적을 방지한다.
   * @private
   */
  _removeScrollListeners() {
    if (this._scrollMoveHandler) {
      this.scene.input.off('pointermove', this._scrollMoveHandler);
      this._scrollMoveHandler = null;
    }
    if (this._scrollUpHandler) {
      this.scene.input.off('pointerup', this._scrollUpHandler);
      this._scrollUpHandler = null;
    }
  }

  // ── entry 객체 생성 헬퍼 ──────────────────────────────────────

  /**
   * Tower 인스턴스에서 오버레이용 entry 객체를 생성한다 (game 모드).
   * @param {object} tower - Tower 인스턴스
   * @returns {object} entry 객체
   * @private
   */
  _buildEntryFromTower(tower) {
    const info = tower.getInfo();

    if (tower.mergeId) {
      // 합성 타워: MERGE_RECIPES에서 recipeKey 검색
      let recipeKey = null;
      for (const [key, recipe] of Object.entries(MERGE_RECIPES)) {
        if (recipe.id === tower.mergeId) {
          recipeKey = key;
          break;
        }
      }
      const recipe = recipeKey ? MERGE_RECIPES[recipeKey] : null;
      return {
        id: tower.mergeId,
        displayName: info.displayName,
        color: recipe ? recipe.color : TOWER_STATS[tower.type].color,
        tier: tower.tier,
        attackType: tower.stats.attackType || 'single',
        recipeKey,
      };
    }

    // 기본(T1) 타워
    const lv1 = TOWER_STATS[tower.type].levels[1];
    return {
      id: tower.type,
      displayName: info.displayName,
      color: TOWER_STATS[tower.type].color,
      tier: 1,
      attackType: lv1.attackType,
      recipeKey: null,
    };
  }

  /**
   * config 데이터(TOWER_STATS / MERGE_RECIPES)에서 entry 객체를 생성한다.
   * 드릴다운 시 재료/상위 조합 타워의 entry를 만드는 데 사용된다.
   * @param {string} id - 타워 id (T1 타입 또는 합성 타워 id)
   * @returns {object|null} entry 객체, 찾지 못하면 null
   * @private
   */
  _buildEntryFromConfig(id) {
    // T1 타워 확인
    if (TOWER_STATS[id]) {
      const stats = TOWER_STATS[id];
      const lv1 = stats.levels[1];
      return {
        id,
        displayName: t(`tower.${id}.name`) || stats.displayName,
        color: stats.color,
        tier: 1,
        attackType: lv1.attackType,
        recipeKey: null,
      };
    }

    // T2+ 합성 타워: MERGE_RECIPES에서 검색
    for (const [recipeKey, recipe] of Object.entries(MERGE_RECIPES)) {
      if (recipe.id === id) {
        const mergedStats = MERGED_TOWER_STATS[id];
        return {
          id,
          displayName: recipe.displayName,
          color: recipe.color,
          tier: recipe.tier,
          attackType: mergedStats ? mergedStats.attackType : 'unknown',
          recipeKey,
        };
      }
    }

    return null;
  }

  /**
   * 주어진 타워가 재료로 사용되는 모든 합성 레시피를 찾는다.
   * @param {string} towerId - 타워 id
   * @returns {Array<{resultEntry: object, recipeKey: string}>} 결과 항목과 레시피 키 쌍 배열
   * @private
   */
  _findUsedInRecipes(towerId) {
    const results = [];
    for (const [recipeKey, recipe] of Object.entries(MERGE_RECIPES)) {
      const parts = recipeKey.split('+');
      if (parts.includes(towerId)) {
        const resultEntry = this._buildEntryFromConfig(recipe.id);
        if (resultEntry) results.push({ resultEntry, recipeKey });
      }
    }
    // 티어 오름차순, 같은 티어 내에서는 이름 알파벳순으로 정렬
    results.sort((a, b) =>
      a.resultEntry.tier - b.resultEntry.tier ||
      a.resultEntry.displayName.localeCompare(b.resultEntry.displayName)
    );
    return results;
  }

  // ── 헬퍼 ────────────────────────────────────────────────────

  /**
   * 공격 유형 키를 짧은 배지 문자열로 변환한다.
   * @param {string} attackType - 공격 유형 키
   * @returns {string} 표시용 배지 문자열
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
