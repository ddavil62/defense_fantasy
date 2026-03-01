/**
 * @fileoverview 엔드리스 맵 선택 씬(EndlessMapSelectScene).
 * 캠페인 전체 클리어 후 해금되는 엔드리스 모드에서 플레이할 맵을 선택한다.
 * 월드별 탭(5탭) + 클래식 탭(1탭)으로 총 6탭 구성.
 * 다크 판타지 테마: 골드 강조색, 0x0d0d1a 배경.
 */

import { GAME_WIDTH, GAME_HEIGHT, COLORS, BTN_PRIMARY, BTN_BACK } from '../config.js';
import { t } from '../i18n.js';
import { WORLDS } from '../data/worlds.js';
import { getMapById, CLASSIC_MAP } from '../data/maps.js';

// ── 탭 정의 (클래식 + 월드 5개) ────────────────────────────────
const TABS = [
  { id: 'classic', label: 'CLASSIC' },
  { id: 'forest', label: 'F' },
  { id: 'desert', label: 'D' },
  { id: 'tundra', label: 'T' },
  { id: 'volcano', label: 'V' },
  { id: 'shadow', label: 'S' },
];

// ── 탭별 강조색 ────────────────────────────────────────────────
const TAB_ACCENT = {
  classic: 0xffd700,
  forest: 0x2ecc71,
  desert: 0xe67e22,
  tundra: 0x74b9ff,
  volcano: 0xe17055,
  shadow: 0x9b59b6,
};

/**
 * 엔드리스 맵 선택 화면 씬.
 * 월드별 탭으로 캠페인 맵 + 클래식 맵을 표시하고,
 * 선택된 맵으로 GameScene을 endless 모드로 시작한다.
 * @extends Phaser.Scene
 */
export class EndlessMapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndlessMapSelectScene' });
  }

  /**
   * 엔드리스 맵 선택 UI를 생성한다.
   * 헤더(뒤로가기 + 타이틀) + 탭 바 + 맵 카드 목록을 배치한다.
   */
  create() {
    const centerX = GAME_WIDTH / 2;

    // ── 배경 ──
    this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // ── 씬 진입 페이드인 ──
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // ── 헤더 (Y 0~50) ──
    this.add.rectangle(centerX, 25, GAME_WIDTH, 50, 0x0a0820);
    this.add.rectangle(centerX, 50, GAME_WIDTH, 1, 0xffd700).setAlpha(0.4);

    // 뒤로가기 버튼 (좌측)
    const backText = this.add.text(30, 25, t('ui.back'), {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#1a9c7e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backText.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });

    // 타이틀 (중앙)
    this.add.text(centerX, 25, t('ui.endlessMapSelect'), {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── 탭 바 (Y 55~85) ──
    /** @type {string} 현재 선택된 탭 ID */
    this._activeTab = 'classic';

    /** @type {Phaser.GameObjects.GameObject[]} 맵 카드 오브젝트 (탭 전환 시 삭제) */
    this._cardObjects = [];

    this._createTabBar(centerX);
    this._renderCards(centerX);
  }

  // ── 탭 바 생성 ──────────────────────────────────────────────────

  /**
   * 6개 탭 버튼을 상단에 가로 배치한다.
   * @param {number} centerX - 화면 가로 중앙 좌표
   * @private
   */
  _createTabBar(centerX) {
    const tabY = 72;
    const tabW = 50;
    const tabH = 26;
    const totalW = TABS.length * tabW + (TABS.length - 1) * 4;
    const startX = centerX - totalW / 2 + tabW / 2;

    /** @type {{ bg: Phaser.GameObjects.Rectangle, label: Phaser.GameObjects.Text }[]} 탭 UI 참조 */
    this._tabElements = [];

    TABS.forEach((tab, i) => {
      const tx = startX + i * (tabW + 4);
      const isActive = tab.id === this._activeTab;
      const accent = TAB_ACCENT[tab.id] || 0xffd700;

      const bg = this.add.rectangle(tx, tabY, tabW, tabH, isActive ? accent : 0x1a1a2e)
        .setStrokeStyle(1, accent)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(tx, tabY, tab.label, {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: isActive ? '#1a1a2e' : '#b2bec3',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this._tabElements.push({ bg, label });

      bg.on('pointerdown', () => {
        if (this._activeTab === tab.id) return;
        this._activeTab = tab.id;
        this._updateTabStyles();
        this._renderCards(centerX);
      });
    });
  }

  // ── 탭 스타일 갱신 ──────────────────────────────────────────────

  /**
   * 활성 탭에 맞춰 모든 탭의 배경/텍스트 색상을 갱신한다.
   * @private
   */
  _updateTabStyles() {
    TABS.forEach((tab, i) => {
      const el = this._tabElements[i];
      const isActive = tab.id === this._activeTab;
      const accent = TAB_ACCENT[tab.id] || 0xffd700;

      el.bg.setFillStyle(isActive ? accent : 0x1a1a2e);
      el.label.setColor(isActive ? '#1a1a2e' : '#b2bec3');
    });
  }

  // ── 맵 카드 렌더링 ─────────────────────────────────────────────

  /**
   * 현재 활성 탭에 해당하는 맵 카드를 렌더링한다.
   * 이전 카드는 모두 제거 후 새로 그린다.
   * @param {number} centerX - 화면 가로 중앙 좌표
   * @private
   */
  _renderCards(centerX) {
    // 기존 카드 오브젝트 삭제
    this._cardObjects.forEach(obj => obj.destroy());
    this._cardObjects = [];

    if (this._activeTab === 'classic') {
      this._renderClassicCard(centerX);
    } else {
      this._renderWorldCards(centerX, this._activeTab);
    }
  }

  // ── 클래식 맵 카드 ──────────────────────────────────────────────

  /**
   * 클래식 맵 단일 카드를 표시한다.
   * 클래식 맵은 엔드리스 전용 기본 맵이다.
   * @param {number} centerX - 화면 가로 중앙 좌표
   * @private
   */
  _renderClassicCard(centerX) {
    const cardW = 320;
    const cardH = 86;
    const cardY = 130;
    const cardLeft = centerX - cardW / 2 + 14;
    const cardRight = centerX + cardW / 2 - 14;

    // 카드 배경
    const cardBg = this.add.rectangle(centerX, cardY, cardW, cardH, 0x0a0820)
      .setStrokeStyle(2, 0xffd700);
    this._cardObjects.push(cardBg);

    // 카드 좌측: 맵 이름
    const nameText = this.add.text(cardLeft, cardY - cardH / 2 + 14, t('ui.classicMap'), {
      fontSize: '16px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0, 0);
    this._cardObjects.push(nameText);

    // 카드 좌측 하단: 설명
    const descText = this.add.text(cardLeft, cardY - cardH / 2 + 40, t('ui.classicMapDesc'), {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0, 0);
    this._cardObjects.push(descText);

    // 카드 우측: 웨이브 표시 (무한)
    const waveText = this.add.text(cardRight, cardY - cardH / 2 + 14, 'Wave: \u221E', {
      fontSize: '11px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(1, 0);
    this._cardObjects.push(waveText);

    // START 버튼
    const btnW = 80;
    const btnH = 26;
    const btnX = cardRight - btnW / 2;
    const btnY = cardY + cardH / 2 - btnH / 2 - 4;

    const startBg = this.add.rectangle(btnX, btnY, btnW, btnH, BTN_PRIMARY)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0xffd700);
    this._cardObjects.push(startBg);

    const startLabel = this.add.text(btnX, btnY, t('ui.start'), {
      fontSize: '13px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this._cardObjects.push(startLabel);

    startBg.on('pointerdown', () => {
      this._startEndlessGame(CLASSIC_MAP);
    });
    startBg.on('pointerover', () => startBg.setFillStyle(0xd4b440));
    startBg.on('pointerout', () => startBg.setFillStyle(BTN_PRIMARY));
  }

  // ── 월드별 맵 카드 ──────────────────────────────────────────────

  /**
   * 월드에 속한 6개 맵을 카드 목록으로 표시한다.
   * @param {number} centerX - 화면 가로 중앙 좌표
   * @param {string} worldId - 월드 ID
   * @private
   */
  _renderWorldCards(centerX, worldId) {
    const world = WORLDS.find(w => w.id === worldId);
    if (!world) return;

    const cardW = 320;
    const cardH = 76;
    const gap = 5;
    const startY = 100;

    world.mapIds.forEach((mapId, index) => {
      const mapData = getMapById(mapId);
      if (!mapData) return;

      const cardY = startY + index * (cardH + gap) + cardH / 2;
      const cardLeft = centerX - cardW / 2 + 14;
      const cardRight = centerX + cardW / 2 - 14;

      // 카드 배경
      const accent = TAB_ACCENT[worldId] || 0xffd700;
      const cardBg = this.add.rectangle(centerX, cardY, cardW, cardH, 0x0a0820)
        .setStrokeStyle(2, accent);
      this._cardObjects.push(cardBg);

      // 좌측 상단: 맵 번호
      const numText = this.add.text(cardLeft, cardY - cardH / 2 + 8, `${index + 1}`, {
        fontSize: '20px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0, 0);
      this._cardObjects.push(numText);

      // 좌측 중단: 맵 이름
      const nameText = this.add.text(cardLeft, cardY - cardH / 2 + 34, t(mapData.meta.nameKey), {
        fontSize: '13px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0, 0);
      this._cardObjects.push(nameText);

      // 좌측 하단: 맵 설명
      const descText = this.add.text(cardLeft, cardY - cardH / 2 + 52, t(mapData.meta.descKey), {
        fontSize: '10px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0, 0);
      this._cardObjects.push(descText);

      // 우측 상단: 웨이브 수
      const totalW = isFinite(mapData.totalWaves) ? mapData.totalWaves : '\u221E';
      const waveLabel = this.add.text(cardRight, cardY - cardH / 2 + 8, `Wave: ${totalW}`, {
        fontSize: '11px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#b2bec3',
      }).setOrigin(1, 0);
      this._cardObjects.push(waveLabel);

      // START 버튼
      const btnW = 70;
      const btnH = 24;
      const btnX = cardRight - btnW / 2;
      const btnY = cardY + cardH / 2 - btnH / 2 - 4;

      const startBg = this.add.rectangle(btnX, btnY, btnW, btnH, BTN_PRIMARY)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0xffd700);
      this._cardObjects.push(startBg);

      const startLabel = this.add.text(btnX, btnY, t('ui.start'), {
        fontSize: '12px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#1a1a2e',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this._cardObjects.push(startLabel);

      startBg.on('pointerdown', () => {
        this._startEndlessGame(mapData);
      });
      startBg.on('pointerover', () => startBg.setFillStyle(0xd4b440));
      startBg.on('pointerout', () => startBg.setFillStyle(BTN_PRIMARY));
    });
  }

  // ── 게임 시작 (엔드리스 모드) ───────────────────────────────────

  /**
   * 선택된 맵으로 GameScene을 endless 모드로 시작한다.
   * fadeOut 후 씬 전환 처리.
   * @param {import('../data/maps.js').MapData} mapData - 선택된 맵 데이터
   * @private
   */
  _startEndlessGame(mapData) {
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const sm = this.registry.get('soundManager');
      if (sm) sm.stopBgm(false);
      this.scene.start('GameScene', {
        mapData: mapData,
        gameMode: 'endless',
      });
    });
  }
}
