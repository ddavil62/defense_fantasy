/**
 * @fileoverview MapManager - 맵 그리드 데이터, 렌더링, 좌표 변환을 관리한다.
 * 타일맵 렌더링, 타워 배치 가능 여부 판정, 건설 가능 셀 하이라이트,
 * 타워 배치/제거 추적, 적 이동 경로 제공을 담당한다.
 */

import {
  CELL_SIZE, GRID_COLS, GRID_ROWS,
  HUD_HEIGHT, COLORS,
  CELL_EMPTY, CELL_PATH, CELL_BASE, CELL_SPAWN, CELL_WALL,
  gridToPixel, pixelToGrid,
} from '../config.js';

export class MapManager {
  /**
   * MapManager를 생성한다.
   * @param {Phaser.Scene} scene - 게임 씬
   * @param {import('../data/maps.js').MapData} mapData - 맵 데이터
   */
  constructor(scene, mapData) {
    /** @type {Phaser.Scene} 게임 씬 참조 */
    this.scene = scene;

    /** @type {import('../data/maps.js').MapData} 원본 맵 데이터 참조 */
    this.mapData = mapData;

    /** @type {number[][]} 그리드 데이터 사본 (타워 배치 추적용, 변경 가능) */
    this.grid = mapData.grid.map(row => [...row]);

    /** @type {Map<string, object>} "col,row" 키로 타워 배치를 추적하는 맵 */
    this.towerMap = new Map();

    /** @type {Phaser.GameObjects.Graphics} 맵 그래픽 레이어 */
    this.graphics = null;

    /** @type {Phaser.GameObjects.Graphics} 하이라이트 오버레이 그래픽 */
    this.highlightGraphics = null;

    /** @type {{ x: number, y: number }[]} 적 이동용 픽셀 웨이포인트 경로 */
    this.pixelPath = mapData.waypoints.map(wp => gridToPixel(wp.col, wp.row));
  }

  // ── 맵 렌더링 ──────────────────────────────────────────────────

  /**
   * 타일맵 그리드를 렌더링한다.
   * 월드 배경 이미지가 있으면 하단 레이어에 배치하고,
   * 그 위에 반투명 셀 오버레이를 그린다.
   */
  renderMap() {
    this.graphics = this.scene.add.graphics();
    this.highlightGraphics = this.scene.add.graphics();
    this.highlightGraphics.setDepth(5);

    // 월드 배경 이미지 렌더링 (텍스처가 존재하면)
    const worldId = this.scene.currentWorldId;
    const bgKey = worldId ? `bg_${worldId}` : null;
    const hasBgImage = bgKey && this.scene.textures.exists(bgKey);

    if (hasBgImage) {
      // 배경 이미지: HUD 아래 맵 영역에 배치 (depth -1, 모든 그리드 아래)
      const bgImage = this.scene.add.image(0, HUD_HEIGHT, bgKey);
      bgImage.setOrigin(0, 0);
      bgImage.setDisplaySize(GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
      bgImage.setDepth(-1);
    }

    // 테마가 있으면 테마 색상, 없으면 기본 색상 사용
    const theme = this.mapData.theme;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cellType = this.grid[row][col];
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE + HUD_HEIGHT;

        // 셀 타입별 배경색 및 투명도 결정
        // 배경 이미지가 있으면 빈 타일은 투명하게, 경로는 반투명 오버레이
        let fillColor;
        let fillAlpha = 1;

        switch (cellType) {
          case CELL_EMPTY:
            if (hasBgImage) {
              fillAlpha = 0;   // 배경 이미지가 보이도록 완전 투명
            } else {
              fillColor = theme?.emptyTile ?? 0x1a1a2e;
            }
            break;
          case CELL_PATH:
            fillColor = theme?.path ?? 0x1e1e38;
            fillAlpha = hasBgImage ? 0.35 : 1;   // 배경 이미지 위 반투명 경로
            break;
          case CELL_BASE:
            fillColor = 0x2a1a00;
            break;
          case CELL_SPAWN:
            fillColor = 0x1a0000;
            break;
          case CELL_WALL:
            fillColor = 0x080810;
            fillAlpha = hasBgImage ? 0.7 : 1;
            break;
          default:
            fillColor = 0x1a1a2e;
        }

        // 셀 채우기 (투명이 아닌 경우만)
        if (fillAlpha > 0) {
          this.graphics.fillStyle(fillColor, fillAlpha);
          this.graphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }

        // 셀 타입별 테두리/시각 처리
        switch (cellType) {
          case CELL_EMPTY:
            // 빈 타일에 미세한 격자선
            this.graphics.lineStyle(1, 0x252535, hasBgImage ? 0.2 : 0.4);
            this.graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            break;

          case CELL_PATH:
            // 경로 타일은 테두리 없음 (이어진 경로 느낌)
            break;

          case CELL_BASE:
            // 기지 타일에 금색 테두리
            this.graphics.lineStyle(2, 0xffd700, 1);
            this.graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            break;

          case CELL_SPAWN:
            // 스폰 타일에 빨간 경고 테두리
            this.graphics.lineStyle(2, 0x8b1a2e, 1);
            this.graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            break;

          case CELL_WALL:
            // 벽 타일은 특별한 테두리 없음
            break;

          default:
            this.graphics.lineStyle(1, 0x252535, 0.4);
            this.graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // 스폰 지점 인디케이터 - 아래 방향 화살표
    const spawnPos = gridToPixel(this.mapData.spawnPos.col, this.mapData.spawnPos.row);
    this.scene.add.text(spawnPos.x, spawnPos.y, '\u2193', {
      fontSize: '20px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#8b1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // 기지 인디케이터 - 방패 기호 + 금색 테두리
    const basePos = gridToPixel(this.mapData.basePos.col, this.mapData.basePos.row);
    this.scene.add.text(basePos.x, basePos.y, '\u26E8', {
      fontSize: '18px',
      fontFamily: 'Galmuri11, Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5).setDepth(2);
  }

  // ── 그리드 조회 ────────────────────────────────────────────────

  /**
   * 지정 그리드 좌표의 셀 타입을 반환한다.
   * @param {number} col - 그리드 열
   * @param {number} row - 그리드 행
   * @returns {number} 셀 타입 (0~4), 범위 밖이면 -1
   */
  getCellType(col, row) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return -1;
    }
    return this.grid[row][col];
  }

  /**
   * 해당 셀에 타워를 건설할 수 있는지 확인한다.
   * 빈 타일(CELL_EMPTY)이고 이미 타워가 없어야 건설 가능하다.
   * @param {number} col - 그리드 열
   * @param {number} row - 그리드 행
   * @returns {boolean} 건설 가능 여부
   */
  isBuildable(col, row) {
    if (this.getCellType(col, row) !== CELL_EMPTY) {
      return false;
    }
    return !this.towerMap.has(`${col},${row}`);
  }

  // ── 타워 배치 관리 ─────────────────────────────────────────────

  /**
   * 지정 그리드 위치에 타워를 등록한다.
   * @param {number} col - 그리드 열
   * @param {number} row - 그리드 행
   * @param {object} tower - 타워 인스턴스
   */
  placeTower(col, row, tower) {
    this.towerMap.set(`${col},${row}`, tower);
  }

  /**
   * 지정 그리드 위치에서 타워를 제거한다.
   * @param {number} col - 그리드 열
   * @param {number} row - 그리드 행
   */
  removeTower(col, row) {
    this.towerMap.delete(`${col},${row}`);
  }

  /**
   * 지정 그리드 위치의 타워를 반환한다.
   * @param {number} col - 그리드 열
   * @param {number} row - 그리드 행
   * @returns {object|null} 타워 인스턴스, 없으면 null
   */
  getTowerAt(col, row) {
    return this.towerMap.get(`${col},${row}`) || null;
  }

  /**
   * 타워를 기존 셀에서 새 셀로 이동시킨다.
   * 내부 towerMap에서 기존 위치를 제거하고 새 위치에 등록한다.
   * 타워 그래픽 좌표 갱신은 호출부(GameScene)에서 처리한다.
   * @param {number} fromCol - 기존 그리드 열
   * @param {number} fromRow - 기존 그리드 행
   * @param {number} toCol - 새 그리드 열
   * @param {number} toRow - 새 그리드 행
   * @param {object} tower - 이동할 타워 인스턴스
   */
  moveTower(fromCol, fromRow, toCol, toRow, tower) {
    this.towerMap.delete(`${fromCol},${fromRow}`);
    this.towerMap.set(`${toCol},${toRow}`, tower);
  }

  // ── 하이라이트 ─────────────────────────────────────────────────

  /**
   * 맵에서 건설 가능한 셀들을 하이라이트 표시한다.
   */
  showBuildableHighlights() {
    this.highlightGraphics.clear();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.isBuildable(col, row)) {
          const x = col * CELL_SIZE;
          const y = row * CELL_SIZE + HUD_HEIGHT;
          this.highlightGraphics.fillStyle(COLORS.BUILDABLE_HIGHLIGHT, 0.25);
          this.highlightGraphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }

  /**
   * 맵의 모든 하이라이트를 제거한다.
   */
  clearHighlights() {
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
    }
  }

  /**
   * 지정 그리드 위치에 건설 불가 인디케이터(X 표시)를 표시한다.
   * 0.5초간 페이드아웃된 후 자동 제거된다.
   * @param {number} col - 그리드 열
   * @param {number} row - 그리드 행
   */
  showInvalidPlacement(col, row) {
    const pos = gridToPixel(col, row);
    const g = this.scene.add.graphics();
    g.setDepth(10);
    g.lineStyle(3, COLORS.INVALID_PLACEMENT, 1);
    const s = CELL_SIZE * 0.3;
    // X 표시 그리기
    g.lineBetween(pos.x - s, pos.y - s, pos.x + s, pos.y + s);
    g.lineBetween(pos.x + s, pos.y - s, pos.x - s, pos.y + s);

    // 페이드아웃 후 자동 제거
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 500,
      onComplete: () => g.destroy(),
    });
  }

  // ── 좌표 변환 ──────────────────────────────────────────────────

  /**
   * 적 이동용 픽셀 웨이포인트 경로를 반환한다.
   * @returns {{ x: number, y: number }[]} 픽셀 좌표 배열
   */
  getPath() {
    return this.pixelPath;
  }

  /**
   * 픽셀 좌표를 그리드 좌표로 변환한다.
   * @param {number} x - 픽셀 X
   * @param {number} y - 픽셀 Y
   * @returns {{ col: number, row: number }} 그리드 좌표
   */
  pixelToGrid(x, y) {
    return pixelToGrid(x, y);
  }

  /**
   * 그리드 좌표를 셀 중앙 픽셀 좌표로 변환한다.
   * @param {number} col - 그리드 열
   * @param {number} row - 그리드 행
   * @returns {{ x: number, y: number }} 픽셀 좌표
   */
  gridToPixel(col, row) {
    return gridToPixel(col, row);
  }
}
