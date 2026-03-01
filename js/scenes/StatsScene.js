/**
 * @fileoverview 통계 씬(StatsScene).
 * 누적 게임 통계, 적 유형별 킬 분석, 타워 성능, 최근 게임 히스토리를 표시한다.
 *
 * 섹션 헤더에 컬러 바, 확대된 막대 차트, 2열 개요 그리드,
 * 카드 스타일 최근 게임, CollectionScene 스타일 탑바 적용.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, VISUALS,
  BTN_PRIMARY, BTN_PRIMARY_CSS,
} from '../config.js';

// ── 표시 색상 매핑 ──

/** @const {Object<string, number>} 적 유형별 표시 색상 */
const ENEMY_COLORS = {
  normal: COLORS.ENEMY_NORMAL,
  fast: COLORS.ENEMY_FAST,
  tank: COLORS.ENEMY_TANK,
  boss: COLORS.ENEMY_BOSS,
  boss_armored: COLORS.ENEMY_BOSS,
  swarm: COLORS.ENEMY_SWARM,
  splitter: COLORS.ENEMY_SPLITTER,
  armored: COLORS.ENEMY_ARMORED,
};

/** @const {Object<string, number>} 타워 유형별 표시 색상 */
const TOWER_COLORS = {
  archer: COLORS.ARCHER_TOWER,
  mage: COLORS.MAGE_TOWER,
  ice: COLORS.ICE_TOWER,
  lightning: COLORS.LIGHTNING_TOWER,
  flame: COLORS.FLAME_TOWER,
  rock: COLORS.ROCK_TOWER,
  poison: COLORS.POISON_TOWER,
  wind: COLORS.WIND_TOWER,
  light: COLORS.LIGHT_TOWER,
  dragon: COLORS.DRAGON_TOWER,
};

/**
 * 누적 통계를 시각적으로 표시하는 씬.
 * 스크롤 가능한 컨테이너 위에 개요, 킬 분석, 타워 성능, 최근 게임 섹션을 그린다.
 * @extends Phaser.Scene
 */
export class StatsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StatsScene' });
  }

  /**
   * 통계 UI를 생성한다.
   * 고정 헤더(탑바) 아래에 스크롤 가능한 4개 섹션을 순서대로 배치한다.
   */
  create() {
    const saveData = this.registry.get('saveData');
    const stats = saveData?.stats || {};

    // 배경
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // ── 스크롤 가능한 콘텐츠 컨테이너 ──
    this.scrollContainer = this.add.container(0, 0);

    let y = 0;

    // ── 고정 헤더 (CollectionScene 스타일 탑바) ──
    this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH, 48, COLORS.HUD_BG).setDepth(49);

    y = 24;
    const backBg = this.add.rectangle(38, y, 60, 28, 0x000000, 0)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);

    this.add.text(38, y, '< BACK', {
      fontSize: '14px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(50);

    backBg.on('pointerdown', () => this.scene.start('MenuScene'));

    this.add.text(180, y, 'STATISTICS', {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // ── 스크롤 콘텐츠 시작 ──
    y = 60;

    // ── 개요 섹션 ──
    y = this._drawOverview(stats, y);

    // ── 킬 분석 섹션 ──
    y = this._drawKillBreakdown(stats, y);

    // ── 타워 성능 섹션 ──
    y = this._drawTowerPerformance(stats, y);

    // ── 최근 게임 섹션 ──
    y = this._drawRecentGames(stats, y);

    // ── 스크롤 설정 ──
    // 콘텐츠가 화면을 넘어가면 드래그/휠로 스크롤 가능
    const maxScroll = Math.max(0, y - GAME_HEIGHT + 40);
    this._setupScroll(maxScroll);
  }

  /**
   * 개요 통계 섹션을 2열 그리드 레이아웃으로 그린다.
   * @param {object} stats - 누적 통계 객체
   * @param {number} startY - 시작 Y 좌표
   * @returns {number} 다음 섹션의 시작 Y 좌표
   * @private
   */
  _drawOverview(stats, startY) {
    let y = startY;

    this._addSectionTitle('OVERVIEW', y);
    y += 28;

    const items = [
      { label: 'Total Games', value: `${stats.totalGamesPlayed || 0}` },
      { label: 'Best Round', value: `R${stats.bestRound || 0}` },
      { label: 'Total Kills', value: this._formatNumber(stats.totalKills || 0) },
      { label: 'Boss Kills', value: `${stats.totalBossKills || 0}` },
      { label: 'Towers Placed', value: this._formatNumber(stats.totalTowersPlaced || 0) },
      { label: 'Gold Earned', value: this._formatNumber(stats.totalGoldEarned || 0) },
      { label: 'Waves Cleared', value: this._formatNumber(stats.totalWavesCleared || 0) },
    ];

    for (const item of items) {
      // 왼쪽: 라벨
      this.scrollContainer.add(
        this.add.text(28, y, item.label, {
          fontSize: '13px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: '#8a8a9a',
        })
      );
      // 오른쪽: 값 (골드 강조)
      this.scrollContainer.add(
        this.add.text(GAME_WIDTH - 28, y, item.value, {
          fontSize: '14px',
          fontFamily: 'Galmuri11, Arial, sans-serif',
          color: BTN_PRIMARY_CSS,
          fontStyle: 'bold',
        }).setOrigin(1, 0)
      );
      y += 22;
    }

    y += 10;
    return y;
  }

  /**
   * 적 유형별 킬 분석 섹션을 막대 차트와 함께 그린다.
   * 킬 수 내림차순으로 정렬하여 각 유형의 컬러 점, 이름, 수치, 비율 막대를 표시한다.
   * @param {object} stats - 누적 통계 객체
   * @param {number} startY - 시작 Y 좌표
   * @returns {number} 다음 섹션의 시작 Y 좌표
   * @private
   */
  _drawKillBreakdown(stats, startY) {
    let y = startY;
    const killsByType = stats.killsByEnemyType || {};
    const totalKills = stats.totalKills || 1; // 0으로 나누기 방지

    this._addSectionTitle('KILL BREAKDOWN', y);
    y += 28;

    // 킬 수 내림차순 정렬
    const entries = Object.entries(killsByType)
      .sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      this.scrollContainer.add(
        this.add.text(28, y, 'No kills yet', {
          fontSize: '13px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#636e72',
        })
      );
      y += 22;
    } else {
      const g = this.add.graphics();
      this.scrollContainer.add(g);

      for (const [type, count] of entries) {
        const pct = Math.round((count / totalKills) * 100);
        const barWidth = Math.max(2, (count / totalKills) * 180); // 최소 2px 막대
        const color = ENEMY_COLORS[type] || 0xffffff;
        const label = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');

        // 컬러 점 (지름 8px)
        g.fillStyle(color, 1);
        g.fillCircle(32, y + 8, 4);

        // 유형명 + 킬 수
        this.scrollContainer.add(
          this.add.text(44, y, `${label}`, {
            fontSize: '13px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#dfe6e9',
          })
        );
        this.scrollContainer.add(
          this.add.text(GAME_WIDTH - 24, y, `${this._formatNumber(count)} (${pct}%)`, {
            fontSize: '12px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#b2bec3',
          }).setOrigin(1, 0)
        );

        // 비율 막대 (높이 8px, 반투명)
        g.fillStyle(color, 0.3);
        g.fillRect(44, y + 18, barWidth, 8);

        y += 34;
      }
    }

    y += 10;
    return y;
  }

  /**
   * 타워 성능 섹션을 막대 차트와 함께 그린다.
   * 킬 수 내림차순으로 정렬하여 각 타워의 컬러 점, 이름, 수치, 비율 막대를 표시한다.
   * @param {object} stats - 누적 통계 객체
   * @param {number} startY - 시작 Y 좌표
   * @returns {number} 다음 섹션의 시작 Y 좌표
   * @private
   */
  _drawTowerPerformance(stats, startY) {
    let y = startY;
    const killsByTower = stats.killsByTowerType || {};

    this._addSectionTitle('TOWER PERFORMANCE', y);
    y += 28;

    const entries = Object.entries(killsByTower)
      .sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      this.scrollContainer.add(
        this.add.text(28, y, 'No tower data yet', {
          fontSize: '13px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#636e72',
        })
      );
      y += 22;
    } else {
      const maxKills = entries[0][1] || 1; // 최대 킬 수 기준으로 막대 너비 정규화
      const g = this.add.graphics();
      this.scrollContainer.add(g);

      for (const [type, count] of entries) {
        const color = TOWER_COLORS[type] || 0xffffff;
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        const barWidth = Math.max(2, (count / maxKills) * 180);

        // 컬러 점 (지름 8px)
        g.fillStyle(color, 1);
        g.fillCircle(32, y + 8, 4);

        // 타워명
        this.scrollContainer.add(
          this.add.text(44, y, label, {
            fontSize: '13px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#dfe6e9',
          })
        );

        // 킬 수
        this.scrollContainer.add(
          this.add.text(GAME_WIDTH - 24, y, `${this._formatNumber(count)} kills`, {
            fontSize: '12px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#b2bec3',
          }).setOrigin(1, 0)
        );

        // 비율 막대 (높이 8px, 반투명)
        g.fillStyle(color, 0.3);
        g.fillRect(44, y + 18, barWidth, 8);

        y += 34;
      }
    }

    y += 10;
    return y;
  }

  /**
   * 최근 게임 히스토리 섹션을 카드 스타일로 그린다.
   * 최신 게임을 먼저 표시하며, 최대 10건까지 렌더링한다.
   * @param {object} stats - 누적 통계 객체
   * @param {number} startY - 시작 Y 좌표
   * @returns {number} 다음 섹션의 시작 Y 좌표
   * @private
   */
  _drawRecentGames(stats, startY) {
    let y = startY;
    const history = stats.gameHistory || [];

    this._addSectionTitle('RECENT GAMES', y);
    y += 28;

    if (history.length === 0) {
      this.scrollContainer.add(
        this.add.text(28, y, 'No games played yet', {
          fontSize: '13px', fontFamily: 'Galmuri11, Arial, sans-serif', color: '#636e72',
        })
      );
      y += 22;
    } else {
      const cardG = this.add.graphics();
      this.scrollContainer.add(cardG);

      // 최신 게임부터 역순으로 최대 10건 표시
      const recent = [...history].reverse().slice(0, 10);
      for (const game of recent) {
        const cardH = 32;
        const cardW = GAME_WIDTH - 40;
        const cardX = 20;

        // 카드 배경 (둥근 사각형 + 골드 테두리)
        cardG.fillStyle(COLORS.UI_PANEL, 0.6);
        cardG.fillRoundedRect(cardX, y, cardW, cardH, 4);
        cardG.lineStyle(1, BTN_PRIMARY, 0.2);
        cardG.strokeRoundedRect(cardX, y, cardW, cardH, 4);

        // 게임 번호
        this.scrollContainer.add(
          this.add.text(cardX + 8, y + 8, `#${game.gameNumber}`, {
            fontSize: '12px',
            fontFamily: 'Galmuri11, Arial, sans-serif',
            color: BTN_PRIMARY_CSS,
            fontStyle: 'bold',
          })
        );

        // 라운드 + 킬 수 + 보스 킬
        const info = `R${game.round}  ${game.kills} kills`;
        const extra = game.bossKills > 0 ? `  Boss: ${game.bossKills}` : '';
        this.scrollContainer.add(
          this.add.text(cardX + 55, y + 8, info + extra, {
            fontSize: '12px',
            fontFamily: 'Galmuri11, Arial, sans-serif',
            color: '#dfe6e9',
          })
        );

        y += cardH + 4;
      }
    }

    y += 30;
    return y;
  }

  /**
   * 섹션 타이틀을 왼쪽 컬러 바(BTN_PRIMARY 골드, 4px 너비)와 함께 추가한다.
   * @param {string} title - 섹션 제목 텍스트
   * @param {number} y - Y 좌표
   * @private
   */
  _addSectionTitle(title, y) {
    const g = this.add.graphics();
    this.scrollContainer.add(g);

    // 왼쪽 컬러 바: 4px 너비, 16px 높이, 골드
    g.fillStyle(BTN_PRIMARY, 1);
    g.fillRect(16, y + 2, 4, 16);

    const text = this.add.text(28, y + 2, title, {
      fontSize: '12px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.scrollContainer.add(text);
  }

  /**
   * 전체 콘텐츠 높이를 계산한다.
   * @param {object} stats - 누적 통계 객체
   * @returns {number} 콘텐츠 총 높이 (px)
   * @private
   */
  _calculateContentHeight(stats) {
    let h = 60; // 헤더 영역
    h += 28 + 7 * 22 + 10; // 개요 섹션
    h += 28 + Object.keys(stats.killsByEnemyType || {}).length * 34 + 10; // 킬 분석
    h += 28 + Object.keys(stats.killsByTowerType || {}).length * 34 + 10; // 타워 성능
    h += 28 + Math.min(10, (stats.gameHistory || []).length) * 36 + 30; // 최근 게임
    return h;
  }

  /**
   * 스크롤 입력(드래그/마우스 휠)을 설정한다.
   * 콘텐츠가 화면보다 긴 경우에만 활성화된다.
   * @param {number} maxScroll - 최대 스크롤 거리 (px)
   * @private
   */
  _setupScroll(maxScroll) {
    if (maxScroll <= 0) return;

    let scrollY = 0;
    let isDragging = false;
    let lastPointerY = 0;

    this.input.on('pointerdown', (pointer) => {
      isDragging = true;
      lastPointerY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (!isDragging) return;
      const dy = pointer.y - lastPointerY;
      lastPointerY = pointer.y;
      // scrollY를 -maxScroll ~ 0 범위로 클램핑
      scrollY = Math.max(-maxScroll, Math.min(0, scrollY + dy));
      this.scrollContainer.setY(scrollY);
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });

    // 마우스 휠 스크롤 지원 (deltaY의 0.5배 속도)
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      scrollY = Math.max(-maxScroll, Math.min(0, scrollY - deltaY * 0.5));
      this.scrollContainer.setY(scrollY);
    });
  }

  /**
   * 숫자를 천 단위 콤마로 포맷한다.
   * @param {number} n - 포맷할 숫자
   * @returns {string} 콤마 포맷된 문자열
   * @private
   */
  _formatNumber(n) {
    return n.toLocaleString();
  }
}
