/**
 * @fileoverview MapManager - 맵 그리드 데이터, 렌더링, 좌표 변환을 관리한다.
 * 타일맵 렌더링, 타워 배치 가능 여부 판정, 건설 가능 셀 하이라이트,
 * 타워 배치/제거 추적, 적 이동 경로 제공을 담당한다.
 */

import {
  MAP_GRID, PATH_WAYPOINTS, CELL_SIZE, GRID_COLS, GRID_ROWS,
  HUD_HEIGHT, COLORS,
  CELL_EMPTY, CELL_PATH, CELL_BASE, CELL_SPAWN, CELL_WALL,
  gridToPixel, pixelToGrid,
} from '../config.js';

export class MapManager {
  /**
   * MapManager를 생성한다.
   * @param {Phaser.Scene} scene - 게임 씬
   */
  constructor(scene) {
    /** @type {Phaser.Scene} 게임 씬 참조 */
    this.scene = scene;

    /** @type {number[][]} 그리드 데이터 사본 (타워 배치 추적용, 변경 가능) */
    this.grid = MAP_GRID.map(row => [...row]);

    /** @type {Map<string, object>} "col,row" 키로 타워 배치를 추적하는 맵 */
    this.towerMap = new Map();

    /** @type {Phaser.GameObjects.Graphics} 맵 그래픽 레이어 */
    this.graphics = null;

    /** @type {Phaser.GameObjects.Graphics} 하이라이트 오버레이 그래픽 */
    this.highlightGraphics = null;

    /** @type {{ x: number, y: number }[]} 적 이동용 픽셀 웨이포인트 경로 */
    this.pixelPath = PATH_WAYPOINTS.map(wp => gridToPixel(wp.col, wp.row));
  }

  // ── 맵 렌더링 ──────────────────────────────────────────────────

  /**
   * 그래픽 프리미티브를 사용하여 타일맵 그리드를 렌더링한다.
   * 셀 타입별로 다른 색상과 테두리 스타일을 적용한다.
   */
  renderMap() {
    this.graphics = this.scene.add.graphics();
    this.highlightGraphics = this.scene.add.graphics();
    this.highlightGraphics.setDepth(5);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cellType = this.grid[row][col];
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE + HUD_HEIGHT;

        // 셀 타입별 배경색 결정
        let fillColor;
        switch (cellType) {
          case CELL_EMPTY:
            fillColor = 0x1a1a2e;   // 어두운 남색 (빈 타일)
            break;
          case CELL_PATH:
            fillColor = 0x1e1e38;   // 짙은 남색 (경로)
            break;
          case CELL_BASE:
            fillColor = 0x2a1a00;   // 어두운 금색 (기지)
            break;
          case CELL_SPAWN:
            fillColor = 0x1a0000;   // 어두운 빨강 (스폰)
            break;
          case CELL_WALL:
            fillColor = 0x080810;   // 거의 검정 (벽)
            break;
          default:
            fillColor = 0x1a1a2e;
        }

        // 셀 채우기
        this.graphics.fillStyle(fillColor, 1);
        this.graphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // 셀 타입별 테두리/시각 처리
        switch (cellType) {
          case CELL_EMPTY:
            // 빈 타일에 미세한 격자선 (석재 바닥 느낌)
            this.graphics.lineStyle(1, 0x252535, 0.4);
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
    const spawnPos = gridToPixel(4, 0);
    this.scene.add.text(spawnPos.x, spawnPos.y, '\u2193', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#8b1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // 기지 인디케이터 - 방패 기호 + 금색 테두리
    const basePos = gridToPixel(5, 11);
    this.scene.add.text(basePos.x, basePos.y, '\u26E8', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
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
    return MAP_GRID[row][col];
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
