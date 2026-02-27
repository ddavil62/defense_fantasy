/**
 * @fileoverview TowerPanel - 하단 타워 선택 및 조작 패널.
 * 2행 5열 레이아웃의 타워 선택 버튼, 합성(드래그&드롭) 기능,
 * 판매 버튼, 배속 토글을 제공한다.
 * 타워 상세 정보 모달은 TowerInfoOverlay로 위임한다.
 */

import {
  GAME_WIDTH, PANEL_Y, PANEL_HEIGHT, COLORS, VISUALS,
  TOWER_STATS, TOWER_SHAPE_SIZE, GOLD_TEXT_CSS,
  SPEED_NORMAL, SPEED_FAST, SPEED_TURBO, LONG_PRESS_MS,
  BTN_PRIMARY, BTN_DANGER, BTN_SELL,
  isMergeable, getMergeResult, MERGE_RECIPES, pixelToGrid, GRID_COLS, GRID_ROWS, HUD_HEIGHT,
} from '../config.js';
import { t } from '../i18n.js';
import { TowerInfoOverlay } from './TowerInfoOverlay.js';

/**
 * 게임 하단 타워 패널 UI 클래스.
 * 타워 배치 선택, 합성 드래그&드롭, 판매, 게임 속도 조절 등
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
   * @param {Function} callbacks.onSell - 판매 버튼 클릭 시 호출
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

    /** @type {string|null} 현재 배치 모드로 선택된 타워 타입 */
    this.selectedTowerType = null;

    /** @type {object|null} 현재 선택된 배치 완료 타워 인스턴스 */
    this.selectedTower = null;

    /** @type {number} 현재 게임 배속 (1x/2x/3x) */
    this.gameSpeed = SPEED_NORMAL;

    /** @type {Phaser.GameObjects.Container} 패널 전체를 감싸는 메인 컨테이너 */
    this.container = scene.add.container(0, 0).setDepth(30);

    /** @type {object[]} 타워 선택 버튼 데이터 배열 */
    this.towerButtons = [];

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
   * 패널의 배경, 타워 버튼, 판매/배속 버튼을 생성한다.
   * @private
   */
  _create() {
    // 패널 배경
    const panelBg = this.scene.add.rectangle(
      GAME_WIDTH / 2, PANEL_Y + PANEL_HEIGHT / 2,
      GAME_WIDTH, PANEL_HEIGHT,
      COLORS.UI_PANEL
    ).setAlpha(0.9);
    this.container.add(panelBg);

    // 상단 구분선
    const divider = this.scene.add.rectangle(
      GAME_WIDTH / 2, PANEL_Y + 1,
      GAME_WIDTH, 2,
      COLORS.BUTTON_ACTIVE
    ).setAlpha(0.5);
    this.container.add(divider);

    // 타워 선택 버튼 (2행 x 5열)
    this._createTowerButtons();

    // 판매 버튼
    this._createSellButton();

    // 배속 토글 버튼
    this._createSpeedButton();
  }

  // ── 타워 선택 버튼 ──────────────────────────────────────────

  /**
   * 타워 선택 버튼을 2행 5열 레이아웃으로 생성한다.
   * 1행: archer, mage, ice, lightning, flame
   * 2행: rock, poison, wind, light, dragon (잠금 가능)
   * @private
   */
  _createTowerButtons() {
    const topRowTypes = ['archer', 'mage', 'ice', 'lightning', 'flame'];
    const bottomRowTypes = ['rock', 'poison', 'wind', 'light', 'dragon'];
    const btnSize = VISUALS.TOWER_BUTTON_SIZE;
    const spacing = VISUALS.BUTTON_SPACING;
    const startX = 8;
    const topRowY = PANEL_Y + 8;
    const bottomRowY = PANEL_Y + 56;

    // 상단 행 생성
    this._createButtonRow(topRowTypes, startX, topRowY, btnSize, spacing);

    // 하단 행 생성
    this._createButtonRow(bottomRowTypes, startX, bottomRowY, btnSize, spacing);
  }

  /**
   * 타워 버튼 한 행을 생성한다.
   * 각 버튼은 배경, 아이콘, 비용 텍스트로 구성되며,
   * 짧은 탭은 타워 선택, 긴 누르기는 설명 팝업을 트리거한다.
   * @param {string[]} types - 이 행에 배치할 타워 타입 배열
   * @param {number} startX - 시작 X 좌표
   * @param {number} rowY - 행의 Y 좌표
   * @param {number} btnSize - 버튼 크기 (px)
   * @param {number} spacing - 버튼 간 간격 (px)
   * @private
   */
  _createButtonRow(types, startX, rowY, btnSize, spacing) {
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const x = startX + i * (btnSize + spacing) + btnSize / 2;
      const y = rowY + btnSize / 2;
      const stats = TOWER_STATS[type];
      const cost = stats.levels[1].cost;
      const isLocked = TOWER_STATS[type].locked && !this.unlockedTowers.includes(type);

      // 버튼 배경 - 잠금 타워는 반투명 처리
      const bg = this.scene.add.rectangle(x, y, btnSize, btnSize, 0x1a1a2e)
        .setStrokeStyle(2, isLocked ? COLORS.LOCK_ICON : 0x636e72);
      // 잠금 타워도 긴 누르기(설명 보기)를 위해 인터랙티브 활성화
      bg.setInteractive({ useHandCursor: !isLocked });
      if (isLocked) {
        bg.setAlpha(0.4);
      }
      this.container.add(bg);

      // 타워 아이콘 (잠금 시 자물쇠 표시)
      const iconGraphics = this.scene.add.graphics();
      if (isLocked) {
        this._drawLockIcon(iconGraphics, x, y - 4);
      } else {
        this._drawTowerIcon(iconGraphics, type, x, y - 4);
      }
      this.container.add(iconGraphics);

      // 배치 비용 텍스트 (잠금 시 '????G' 표시)
      const costStr = isLocked ? '????G' : `${cost}G`;
      const costColor = isLocked ? '#636e72' : GOLD_TEXT_CSS;
      const costText = this.scene.add.text(x, y + 14, costStr, {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: costColor,
        align: 'center',
      }).setOrigin(0.5);
      this.container.add(costText);

      // 버튼 데이터 저장
      const btnData = {
        type,
        bg,
        costText,
        iconGraphics,
        cost,
        isLocked,
      };
      this.towerButtons.push(btnData);

      // 긴 누르기 / 짧은 탭 이벤트 핸들러
      bg.on('pointerdown', () => {
        this._startLongPress(type, x, y);
      });
      bg.on('pointerup', () => {
        this._endLongPress(type);
      });
      bg.on('pointerout', () => {
        this._cancelLongPress();
      });
    }
  }

  // ── 타워 아이콘 그리기 ──────────────────────────────────────

  /**
   * 타워 타입에 해당하는 아이콘을 그래픽 오브젝트에 그린다.
   * 각 타워별 고유 도형(삼각형, 원, 다이아몬드, 번개 등)을 사용한다.
   * @param {Phaser.GameObjects.Graphics} g - 그래픽 오브젝트
   * @param {string} type - 타워 타입 키
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @private
   */
  _drawTowerIcon(g, type, x, y) {
    const color = TOWER_STATS[type].color;
    g.clear();

    switch (type) {
      case 'archer': {
        // 삼각형 아이콘
        const s = 14;
        g.fillStyle(color, 1);
        g.fillTriangle(x, y - s / 2, x - s / 2, y + s / 2, x + s / 2, y + s / 2);
        break;
      }
      case 'mage':
        // 원형 아이콘
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 8);
        break;
      case 'ice': {
        // 마름모 아이콘
        const sz = 6;
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
        // 지그재그 번개 아이콘
        g.lineStyle(2, color, 1);
        const w = 5;
        const h = 10;
        g.lineBetween(x - w, y - h, x + w, y - h * 0.2);
        g.lineBetween(x + w, y - h * 0.2, x - w, y + h * 0.2);
        g.lineBetween(x - w, y + h * 0.2, x + w, y + h);
        break;
      }
      case 'flame': {
        // 불꽃 아이콘 - 원형 몸체 + 작은 삼각형 불꽃
        g.fillStyle(color, 1);
        g.fillCircle(x, y + 2, 7);
        g.fillStyle(0xfdcb6e, 0.9);
        const offsets = [-4, 0, 4];
        for (const ox of offsets) {
          g.fillTriangle(x + ox, y - 8, x + ox - 2, y - 3, x + ox + 2, y - 3);
        }
        break;
      }
      case 'rock': {
        // 육각형 아이콘
        const r = 8;
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
        // 오각형 아이콘
        const r = 7;
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
        // 반원 + 바람 줄기 아이콘
        g.fillStyle(color, 1);
        g.slice(x, y, 8, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
        g.fillPath();
        g.lineStyle(1.5, color, 0.7);
        for (let i = 0; i < 3; i++) {
          g.lineBetween(x - 4 + i * 4, y + 2, x - 2 + i * 4, y + 7);
        }
        break;
      }
      case 'light': {
        // 팔각형 아이콘
        const r = 7;
        const points = [];
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillStyle(color, 1);
        g.fillPoints(points, true);
        break;
      }
    }
  }

  /**
   * 잠금된 타워 버튼에 자물쇠 아이콘을 그린다.
   * 사각형 몸체 + 반원 고리 + 열쇠구멍으로 구성된다.
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

  // ── 판매 버튼 ──────────────────────────────────────────────

  /**
   * 타워 판매 버튼을 생성한다.
   * 타워가 선택되었을 때만 활성화되며, 클릭 시 onSell 콜백을 호출한다.
   * @private
   */
  _createSellButton() {
    const btnSize = VISUALS.ACTION_BUTTON_SIZE;
    const x = GAME_WIDTH - 75;
    const y = PANEL_Y + 28;

    this.sellBg = this.scene.add.rectangle(x, y, btnSize, btnSize, BTN_DANGER)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.5);
    this.container.add(this.sellBg);

    this.sellText = this.scene.add.text(x, y, 'S', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this.sellText);

    this.sellBg.on('pointerdown', () => {
      if (this.selectedTower && this.callbacks.onSell) {
        this.callbacks.onSell(this.selectedTower);
      }
    });
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
    const x = GAME_WIDTH - 38;
    const y = PANEL_Y + 28;

    this.speedBg = this.scene.add.rectangle(x, y, btnSize, btnSize, BTN_SELL)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.speedBg);

    // 배속 텍스트 뒤의 원형 하이라이트 (1x 초과일 때 표시)
    this.speedCircle = this.scene.add.graphics();
    this.container.add(this.speedCircle);
    /** @type {number} 배속 버튼 중심 X */
    this._speedX = x;
    /** @type {number} 배속 버튼 중심 Y */
    this._speedY = y;

    this.speedText = this.scene.add.text(x, y, 'x1', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this.speedText);

    this.speedBg.on('pointerdown', () => {
      // 3단계 배속 순환: 1x -> 2x -> 3x -> 1x
      if (this.gameSpeed === SPEED_NORMAL) {
        this.gameSpeed = SPEED_FAST;
      } else if (this.gameSpeed === SPEED_FAST) {
        this.gameSpeed = SPEED_TURBO;
      } else {
        this.gameSpeed = SPEED_NORMAL;
      }
      const label = this.gameSpeed === SPEED_NORMAL ? 'x1'
        : this.gameSpeed === SPEED_FAST ? 'x2' : 'x3';
      // 배속별 텍스트 색상: 1x=흰색, 2x=노란색, 3x=빨간색
      const color = this.gameSpeed === SPEED_NORMAL ? '#ffffff'
        : this.gameSpeed === SPEED_FAST ? '#fdcb6e' : '#e94560';
      this.speedText.setText(label);
      this.speedText.setColor(color);
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
      this._showDescription(type);
    });
  }

  /**
   * 포인터 업 시 긴 누르기를 종료한다.
   * 긴 누르기가 발동하지 않았으면 짧은 탭으로 처리하여 타워를 선택한다.
   * 잠금된 타워는 짧은 탭이 무시된다.
   * @param {string} type - 타워 타입 키
   * @private
   */
  _endLongPress(type) {
    if (this._lpTimer) { this._lpTimer.remove(); this._lpTimer = null; }
    if (!this._lpFired) {
      // 짧은 탭 -> 잠금되지 않은 타워만 선택 동작 수행
      const isLocked = TOWER_STATS[type].locked && !this.unlockedTowers.includes(type);
      if (!isLocked) {
        this._onTowerButtonClick(type);
      }
    }
    // 긴 누르기가 발동했으면 팝업이 열려 있으며, 다른 곳 탭 시 닫힘
  }

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
    const popupH = 110;
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
      fontFamily: 'Outfit, Arial, sans-serif',
      color: colorCSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this._descContainer.add(nameText);

    // 타워 플레이버 텍스트
    const flavorText = this.scene.add.text(popupX, popupY - 14, t(`tower.${type}.flavor`), {
      fontSize: '11px',
      fontFamily: 'Outfit, Arial, sans-serif',
      color: '#a0a0a0',
    }).setOrigin(0.5);
    this._descContainer.add(flavorText);

    // 스탯 한 줄 요약 (특수 효과 포함)
    const special = stats.slowAmount ? `Slow ${stats.slowAmount * 100}%`
      : stats.splashRadius ? `Splash ${stats.splashRadius}px`
      : stats.chainCount ? `Chain ${stats.chainCount}`
      : stats.burnDamage ? `Burn ${stats.burnDamage}/s`
      : stats.pushbackDistance ? `Push ${stats.pushbackDistance}px`
      : stats.attackType === 'piercing_beam' ? 'Piercing'
      : '-';
    const statLine = `${t('ui.damage')} ${stats.damage}  |  ${t('ui.range')} ${stats.range}  |  ${t('ui.speed')} ${stats.fireRate}s  |  ${t('ui.special')} ${special}`;
    const statText = this.scene.add.text(popupX, popupY + 10, statLine, {
      fontSize: '11px',
      fontFamily: 'Outfit, Arial, sans-serif',
      color: '#e0e0e0',
    }).setOrigin(0.5);
    this._descContainer.add(statText);

    // 비용 또는 잠금 해제 조건 표시
    const isLocked = TOWER_STATS[type].locked && !this.unlockedTowers.includes(type);
    const unlockWorld = TOWER_STATS[type].unlockWorld;
    const worldName = unlockWorld ? t(`world.${unlockWorld}.name`) : '';
    const costStr = isLocked ? `\uD83D\uDD12 ${worldName}` : `${stats.cost}G`;
    const costText = this.scene.add.text(popupX, popupY + 32, costStr, {
      fontSize: '13px',
      fontFamily: 'Outfit, Arial, sans-serif',
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

  /**
   * 타워 버튼 클릭을 처리한다.
   * 이미 선택된 타입을 다시 클릭하면 선택 해제, 아니면 해당 타입 선택.
   * @param {string} type - 타워 타입 키
   * @private
   */
  _onTowerButtonClick(type) {
    if (this.selectedTowerType === type) {
      // 같은 타입 재클릭 -> 선택 해제
      this.clearSelection();
      return;
    }

    // 새 타워 타입 선택
    this.selectedTower = null;
    this.selectedTowerType = type;
    this._updateButtonHighlights();
    this._hideInfo();

    if (this.callbacks.onTowerSelect) {
      this.callbacks.onTowerSelect(type);
    }
  }

  /**
   * 현재 선택 상태에 따라 버튼의 시각적 하이라이트를 갱신한다.
   * 선택된 타워 버튼은 파란 테두리, 나머지는 회색 테두리로 표시한다.
   * @private
   */
  _updateButtonHighlights() {
    for (const btn of this.towerButtons) {
      if (btn.isLocked) continue;
      if (btn.type === this.selectedTowerType) {
        btn.bg.setStrokeStyle(2, BTN_PRIMARY);
        btn.bg.setFillStyle(0x2a2a3e);
      } else {
        btn.bg.setStrokeStyle(2, 0x636e72);
        btn.bg.setFillStyle(0x1a1a2e);
      }
    }
  }

  /**
   * 현재 보유 골드에 따라 타워 버튼의 구매 가능 여부를 시각적으로 갱신한다.
   * 골드가 부족하면 버튼을 반투명 + 빨간 비용 텍스트로 표시한다.
   * @param {number} gold - 현재 보유 골드
   */
  updateAffordability(gold) {
    for (const btn of this.towerButtons) {
      if (btn.isLocked) continue;
      if (gold >= btn.cost) {
        btn.bg.setAlpha(1);
        btn.costText.setColor(GOLD_TEXT_CSS);
      } else {
        btn.bg.setAlpha(0.5);
        btn.costText.setColor('#ff4757');
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

    // 판매 버튼 활성화 (불투명도 복원)
    this.sellBg.setAlpha(1);

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
   * 드래그 시작 시 합성 가능한 모든 타워에 금색 원 하이라이트를 표시한다.
   * 하이라이트는 펄스 애니메이션으로 점멸한다.
   * @param {object} dragTower - 드래그 중인 타워 인스턴스
   * @private
   */
  _startMergeHighlights(dragTower) {
    this._clearMergeHighlights();

    const getTowers = this.callbacks.getTowers;
    if (!getTowers) return;

    const selfId = dragTower.mergeId || dragTower.type;
    const towers = getTowers();

    for (const target of towers) {
      if (target === dragTower) continue;
      if (!isMergeable(target)) continue;

      const targetId = target.mergeId || target.type;
      const result = getMergeResult(selfId, targetId);
      if (!result) continue;

      const g = this.scene.add.graphics().setDepth(40);
      g.lineStyle(3, 0xffd700, 1);
      g.strokeCircle(target.x, target.y, 22);

      // 펄스 애니메이션 (투명도 1.0 <-> 0.5, 무한 반복)
      const tween = this.scene.tweens.add({
        targets: g,
        alpha: { from: 1.0, to: 0.5 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });

      this._mergeHighlights.push({ tower: target, graphics: g, tween, result });
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
    const by = Math.max(HUD_HEIGHT + 20, tower.y - 34);

    const container = this.scene.add.container(tower.x, by).setDepth(41);

    // 버블 배경
    const bg = this.scene.add.rectangle(0, 0, 90, 32, 0x0a0e1a, 0.9)
      .setStrokeStyle(2, result.color);
    container.add(bg);

    // 결과 타워 이름
    const nameText = this.scene.add.text(0, -5, `\u2192 ${resultName}`, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: colorCSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(nameText);

    // 결과 타워 티어
    const tierText = this.scene.add.text(0, 8, `(T${result.tier})`, {
      fontSize: '9px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(tierText);

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
   * 모든 합성 하이라이트 (그래픽 + 트윈)를 정리한다.
   * @private
   */
  _clearMergeHighlights() {
    for (const h of this._mergeHighlights) {
      h.tween.stop();
      h.graphics.destroy();
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
   * 드래그를 종료하고 합성을 시도하거나 취소한다.
   * 유효한 합성 대상 위에 드롭하면 onMerge 콜백을 호출하고,
   * 대상이 없거나 레시피가 없으면 원본 타워를 복원한다.
   * @param {Phaser.Input.Pointer} pointer - 드롭 시점의 포인터
   * @param {Function} getTowerAt - 그리드 좌표(col, row)로 타워를 찾는 함수
   */
  endDrag(pointer, getTowerAt) {
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
      }
    }

    // 유효한 대상 없음 -> 원본 타워 복원
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
   * 타워 정보 오버레이를 닫고 판매 버튼을 비활성화한다.
   * @private
   */
  _hideInfo() {
    this.towerInfoOverlay.close();
    if (this.sellBg) {
      this.sellBg.setAlpha(0.5);
    }
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
    if (this.container) {
      this.container.destroy();
    }
  }
}
