/**
 * @fileoverview MapManager - Handles map grid data, rendering, and coordinate conversions.
 */

import {
  MAP_GRID, PATH_WAYPOINTS, CELL_SIZE, GRID_COLS, GRID_ROWS,
  HUD_HEIGHT, COLORS,
  CELL_EMPTY, CELL_PATH, CELL_BASE, CELL_SPAWN, CELL_WALL,
  gridToPixel, pixelToGrid,
} from '../config.js';

export class MapManager {
  /**
   * @param {Phaser.Scene} scene - The game scene
   */
  constructor(scene) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {number[][]} Grid data copy (mutable for tower tracking) */
    this.grid = MAP_GRID.map(row => [...row]);

    /** @type {Map<string, object>} Tower placement tracking by "col,row" key */
    this.towerMap = new Map();

    /** @type {Phaser.GameObjects.Graphics} Map graphics layer */
    this.graphics = null;

    /** @type {Phaser.GameObjects.Graphics} Highlight overlay graphics */
    this.highlightGraphics = null;

    /** @type {{ x: number, y: number }[]} Pixel waypoints for enemy path */
    this.pixelPath = PATH_WAYPOINTS.map(wp => gridToPixel(wp.col, wp.row));
  }

  /**
   * Render the tile map grid using graphics primitives.
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

        let fillColor;
        switch (cellType) {
          case CELL_EMPTY:
            fillColor = 0x1a1a2e;
            break;
          case CELL_PATH:
            fillColor = 0x1e1e38;
            break;
          case CELL_BASE:
            fillColor = 0x2a1a00;
            break;
          case CELL_SPAWN:
            fillColor = 0x1a0000;
            break;
          case CELL_WALL:
            fillColor = 0x080810;
            break;
          default:
            fillColor = 0x1a1a2e;
        }

        // Fill cell
        this.graphics.fillStyle(fillColor, 1);
        this.graphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Per-tile-type visual treatment
        switch (cellType) {
          case CELL_EMPTY:
            // Subtle grid lines for empty tiles (stone floor feel)
            this.graphics.lineStyle(1, 0x252535, 0.4);
            this.graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            break;

          case CELL_PATH:
            // No border lines for path tiles - connected path feel
            break;

          case CELL_BASE:
            // Gold border for base tile
            this.graphics.lineStyle(2, 0xffd700, 1);
            this.graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            break;

          case CELL_SPAWN:
            // Red warning border for spawn tile
            this.graphics.lineStyle(2, 0x8b1a2e, 1);
            this.graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            break;

          case CELL_WALL:
            // No special border for wall tiles
            break;

          default:
            this.graphics.lineStyle(1, 0x252535, 0.4);
            this.graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Draw spawn indicator - arrow pointing down
    const spawnPos = gridToPixel(4, 0);
    this.scene.add.text(spawnPos.x, spawnPos.y, '\u2193', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#8b1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    // Draw base indicator - shield symbol with gold border
    const basePos = gridToPixel(5, 11);
    this.scene.add.text(basePos.x, basePos.y, '\u26E8', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5).setDepth(2);
  }

  /**
   * Get the cell type at given grid coordinates.
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   * @returns {number} Cell type (0-4) or -1 if out of bounds
   */
  getCellType(col, row) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return -1;
    }
    return MAP_GRID[row][col];
  }

  /**
   * Check if a cell is buildable (empty tile with no tower placed).
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   * @returns {boolean} True if tower can be placed here
   */
  isBuildable(col, row) {
    if (this.getCellType(col, row) !== CELL_EMPTY) {
      return false;
    }
    return !this.towerMap.has(`${col},${row}`);
  }

  /**
   * Register a tower at the given grid position.
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   * @param {object} tower - Tower instance
   */
  placeTower(col, row, tower) {
    this.towerMap.set(`${col},${row}`, tower);
  }

  /**
   * Remove a tower from the given grid position.
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   */
  removeTower(col, row) {
    this.towerMap.delete(`${col},${row}`);
  }

  /**
   * Get the tower at a given grid position.
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   * @returns {object|null} Tower instance or null
   */
  getTowerAt(col, row) {
    return this.towerMap.get(`${col},${row}`) || null;
  }

  /**
   * Show buildable cell highlights on the map.
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
   * Clear all highlights from the map.
   */
  clearHighlights() {
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
    }
  }

  /**
   * Show invalid placement indicator at grid position.
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   */
  showInvalidPlacement(col, row) {
    const pos = gridToPixel(col, row);
    const g = this.scene.add.graphics();
    g.setDepth(10);
    g.lineStyle(3, COLORS.INVALID_PLACEMENT, 1);
    const s = CELL_SIZE * 0.3;
    g.lineBetween(pos.x - s, pos.y - s, pos.x + s, pos.y + s);
    g.lineBetween(pos.x + s, pos.y - s, pos.x - s, pos.y + s);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 500,
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Get the pixel waypoint path for enemy movement.
   * @returns {{ x: number, y: number }[]} Array of pixel coordinates
   */
  getPath() {
    return this.pixelPath;
  }

  /**
   * Convert pixel coordinates to grid coordinates (delegated from config).
   * @param {number} x - Pixel X
   * @param {number} y - Pixel Y
   * @returns {{ col: number, row: number }}
   */
  pixelToGrid(x, y) {
    return pixelToGrid(x, y);
  }

  /**
   * Convert grid coordinates to pixel center (delegated from config).
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   * @returns {{ x: number, y: number }}
   */
  gridToPixel(col, row) {
    return gridToPixel(col, row);
  }
}
