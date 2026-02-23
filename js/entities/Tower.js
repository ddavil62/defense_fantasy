/**
 * @fileoverview Tower - Represents a defensive tower placed on the grid.
 * Handles drawing, attack cooldown, targeting (First priority), upgrades with A/B branching,
 * and attack type dispatching (single, splash, chain, aoe_instant, piercing_beam, dot_single).
 */

import {
  TOWER_STATS, MAX_TOWER_LEVEL, SELL_RATIO, COLORS, VISUALS,
  TOWER_SHAPE_SIZE, LV3_SHAPE_SCALE, gridToPixel,
  MAX_ENHANCE_LEVEL, ENHANCE_STAT_BONUS, calcEnhanceCost,
} from '../config.js';

export class Tower {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {string} type - Tower type ('archer', 'mage', 'ice', 'lightning', etc.)
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   */
  constructor(scene, type, col, row) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {string} */
    this.type = type;

    /** @type {number} */
    this.level = 1;

    /** @type {string|null} Branch selection ('a' or 'b'), null at Lv.1 */
    this.branch = null;

    /** @type {string|null} Lv.3 sub-branch selection ('a' or 'b'), null at Lv.1/2 */
    this.branch3 = null;

    /** @type {number} Grid column */
    this.col = col;

    /** @type {number} Grid row */
    this.row = row;

    // Pixel position
    const pos = gridToPixel(col, row);
    /** @type {number} */
    this.x = pos.x;
    /** @type {number} */
    this.y = pos.y;

    /** @type {object} Current level stats */
    this.stats = { ...TOWER_STATS[type].levels[1] };

    /** @type {number} Cooldown timer in seconds */
    this.cooldownTimer = 0;

    /** @type {number} Enhancement level (0 = none, max 10) */
    this.enhanceLevel = 0;

    /** @type {number} Total gold invested in enhancements */
    this.enhanceInvested = 0;

    /** @type {number} Total gold invested (for sell calculation) */
    this.totalInvested = this.stats.cost;

    // Graphics
    /** @type {Phaser.GameObjects.Graphics} Tower shape */
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);

    /** @type {Phaser.GameObjects.Graphics|null} Range circle (shown on select) */
    this.rangeGraphics = null;

    this.draw();
  }

  /**
   * Draw the tower shape based on type and level.
   */
  draw() {
    this.graphics.clear();
    const color = TOWER_STATS[this.type].color;

    // Lv.3 shape scale multiplier
    const sizeScale = this.level >= 3 ? LV3_SHAPE_SCALE : 1.0;

    switch (this.type) {
      case 'archer':
        this._drawArcher(color, sizeScale);
        break;
      case 'mage':
        this._drawMage(color, sizeScale);
        break;
      case 'ice':
        this._drawIce(color, sizeScale);
        break;
      case 'lightning':
        this._drawLightning(color, sizeScale);
        break;
      case 'flame':
        this._drawFlame(color, sizeScale);
        break;
      case 'rock':
        this._drawRock(color, sizeScale);
        break;
      case 'poison':
        this._drawPoison(color, sizeScale);
        break;
      case 'wind':
        this._drawWind(color, sizeScale);
        break;
      case 'light':
        this._drawLight(color, sizeScale);
        break;
      case 'dragon':
        this._drawDragon(color, sizeScale);
        break;
    }

    // Lv.2 indicator: branch-specific border
    if (this.level >= 2) {
      this._drawLv2Border();
    }

    // Lv.3 indicator: gold outer border
    if (this.level >= 3) {
      this._drawLv3Border();
    }

    // Enhancement glow indicator
    if (this.enhanceLevel > 0) {
      this._drawEnhanceGlow();
    }
  }

  /**
   * Draw Lv.2 border indicator based on tower type and branch.
   * @private
   */
  _drawLv2Border() {
    const borderColor = this._getBranchBorderColor();
    this.graphics.lineStyle(2, borderColor, 0.8);

    switch (this.type) {
      case 'archer': {
        const s = this.branch === 'b' ? 32 : TOWER_SHAPE_SIZE.archer;
        this.graphics.strokeTriangle(
          this.x, this.y - s / 2,
          this.x - s / 2, this.y + s / 2,
          this.x + s / 2, this.y + s / 2
        );
        break;
      }
      case 'mage':
        this.graphics.strokeCircle(this.x, this.y, TOWER_SHAPE_SIZE.mage);
        break;
      case 'ice': {
        const sz = (this.branch === 'b' ? 24 : TOWER_SHAPE_SIZE.ice) / 2;
        this.graphics.strokePoints([
          { x: this.x, y: this.y - sz },
          { x: this.x + sz, y: this.y },
          { x: this.x, y: this.y + sz },
          { x: this.x - sz, y: this.y },
        ], true);
        // A branch: internal crystal lines
        if (this.branch === 'a') {
          this.graphics.lineStyle(1, 0xffffff, 0.5);
          this.graphics.lineBetween(this.x, this.y - 4, this.x, this.y + 4);
          this.graphics.lineBetween(this.x - 4, this.y, this.x + 4, this.y);
        }
        break;
      }
      case 'lightning': {
        const h = TOWER_SHAPE_SIZE.lightning;
        const w = h * 0.5;
        this.graphics.strokeRect(this.x - w / 2 - 2, this.y - h / 2 - 2, w + 4, h + 4);
        break;
      }
      case 'flame':
        this.graphics.strokeCircle(this.x, this.y, TOWER_SHAPE_SIZE.flame + 3);
        break;
      case 'rock': {
        const r = TOWER_SHAPE_SIZE.rock / 2 + 2;
        this._strokeHexagon(this.x, this.y, r);
        break;
      }
      case 'poison': {
        const r = (this.branch === 'b' ? 26 : TOWER_SHAPE_SIZE.poison) / 2 + 2;
        this._strokePentagon(this.x, this.y, r);
        break;
      }
      case 'wind':
        this.graphics.strokeCircle(this.x, this.y - 2, 16);
        break;
      case 'light':
        this._strokeOctagon(this.x, this.y, TOWER_SHAPE_SIZE.light / 2 + 2);
        break;
      case 'dragon':
        this.graphics.lineStyle(2, 0xffd700, 0.9);
        this.graphics.strokeCircle(this.x, this.y, 22);
        break;
    }
  }

  /**
   * Draw Lv.3 border indicator (gold outer border for Lv.3 distinction).
   * @private
   */
  _drawLv3Border() {
    this.graphics.lineStyle(3, 0xffd700, 0.6);
    const scale = LV3_SHAPE_SCALE;

    switch (this.type) {
      case 'archer': {
        const s = TOWER_SHAPE_SIZE.archer * scale + 6;
        this.graphics.strokeTriangle(
          this.x, this.y - s / 2,
          this.x - s / 2, this.y + s / 2,
          this.x + s / 2, this.y + s / 2
        );
        break;
      }
      case 'mage':
        this.graphics.strokeCircle(this.x, this.y, TOWER_SHAPE_SIZE.mage * scale + 4);
        break;
      case 'ice': {
        const sz = (TOWER_SHAPE_SIZE.ice * scale) / 2 + 4;
        this.graphics.strokePoints([
          { x: this.x, y: this.y - sz },
          { x: this.x + sz, y: this.y },
          { x: this.x, y: this.y + sz },
          { x: this.x - sz, y: this.y },
        ], true);
        break;
      }
      case 'lightning': {
        const h = TOWER_SHAPE_SIZE.lightning * scale;
        const w = h * 0.5;
        this.graphics.strokeRect(this.x - w / 2 - 4, this.y - h / 2 - 4, w + 8, h + 8);
        break;
      }
      case 'flame':
        this.graphics.strokeCircle(this.x, this.y, TOWER_SHAPE_SIZE.flame * scale + 5);
        break;
      case 'rock': {
        const r = (TOWER_SHAPE_SIZE.rock * scale) / 2 + 4;
        this._strokeHexagon(this.x, this.y, r);
        break;
      }
      case 'poison': {
        const r = (TOWER_SHAPE_SIZE.poison * scale) / 2 + 4;
        this._strokePentagon(this.x, this.y, r);
        break;
      }
      case 'wind':
        this.graphics.strokeCircle(this.x, this.y - 2, 12 * scale + 5);
        break;
      case 'light':
        this._strokeOctagon(this.x, this.y, (TOWER_SHAPE_SIZE.light * scale) / 2 + 4);
        break;
      case 'dragon':
        this.graphics.strokeCircle(this.x, this.y, 16 * scale + 5);
        break;
    }
  }

  /**
   * Get the border color for the current branch.
   * @returns {number} Hex color
   * @private
   */
  _getBranchBorderColor() {
    const colorMap = {
      archer:    { a: 0xe17055, b: 0xffffff },
      mage:     { a: 0xe17055, b: 0x74b9ff },
      ice:      { a: 0xffffff, b: 0x74b9ff },
      lightning: { a: 0xe17055, b: 0x6c5ce7 },
      flame:    { a: 0xe17055, b: 0xd63031 },
      rock:     { a: 0xd63031, b: 0xe17055 },
      poison:   { a: 0x2d8a4e, b: 0xfdcb6e },
      wind:     { a: 0xffffff, b: 0xfdcb6e },
      light:    { a: 0xfdcb6e, b: 0xe17055 },
      dragon:   { a: 0xffd700, b: 0xffd700 },
    };
    const entry = colorMap[this.type];
    return entry ? entry[this.branch] || 0xffffff : 0xffffff;
  }

  // ── Tower Shape Drawing ───────────────────────────────────────

  /**
   * Draw archer tower (upward triangle).
   * @param {number} color - Fill color
   * @param {number} sizeScale - Size multiplier (1.0 for Lv.1/2, LV3_SHAPE_SCALE for Lv.3)
   * @private
   */
  _drawArcher(color, sizeScale = 1.0) {
    const s = TOWER_SHAPE_SIZE.archer * sizeScale;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillTriangle(
      this.x, this.y - s / 2,
      this.x - s / 2, this.y + s / 2,
      this.x + s / 2, this.y + s / 2
    );
  }

  /**
   * Draw mage tower (circle).
   * @param {number} color - Fill color
   * @private
   */
  _drawMage(color, sizeScale = 1.0) {
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(this.x, this.y, TOWER_SHAPE_SIZE.mage * sizeScale);
  }

  /**
   * Draw ice tower (diamond/rotated square).
   * @param {number} color - Fill color
   * @private
   */
  _drawIce(color, sizeScale = 1.0) {
    const sz = (TOWER_SHAPE_SIZE.ice * sizeScale) / 2;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillPoints([
      { x: this.x, y: this.y - sz },
      { x: this.x + sz, y: this.y },
      { x: this.x, y: this.y + sz },
      { x: this.x - sz, y: this.y },
    ], true);
  }

  /**
   * Draw lightning tower (zigzag bolt symbol).
   * @param {number} color - Fill color
   * @private
   */
  _drawLightning(color, sizeScale = 1.0) {
    const h = TOWER_SHAPE_SIZE.lightning * sizeScale;
    const halfH = h / 2;
    const w = h * 0.35;
    this.graphics.lineStyle(3, color, 1);
    // N-shaped zigzag bolt
    this.graphics.lineBetween(this.x - w / 2, this.y - halfH, this.x + w / 2, this.y - halfH * 0.3);
    this.graphics.lineBetween(this.x + w / 2, this.y - halfH * 0.3, this.x - w / 2, this.y + halfH * 0.3);
    this.graphics.lineBetween(this.x - w / 2, this.y + halfH * 0.3, this.x + w / 2, this.y + halfH);
  }

  /**
   * Draw flame tower (circle with 3 small triangles on top).
   * @param {number} color - Fill color
   * @private
   */
  _drawFlame(color, sizeScale = 1.0) {
    const r = TOWER_SHAPE_SIZE.flame * sizeScale;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(this.x, this.y, r);

    // 3 flame triangles above
    this.graphics.fillStyle(0xfdcb6e, 0.9);
    const flameScale = sizeScale;
    const offsets = [-6 * flameScale, 0, 6 * flameScale];
    for (const ox of offsets) {
      const tx = this.x + ox;
      const ty = this.y - r - 2;
      this.graphics.fillTriangle(
        tx, ty - 6 * flameScale,
        tx - 3 * flameScale, ty + 2,
        tx + 3 * flameScale, ty + 2
      );
    }
  }

  /**
   * Draw rock tower (hexagon).
   * @param {number} color - Fill color
   * @private
   */
  _drawRock(color, sizeScale = 1.0) {
    const r = (TOWER_SHAPE_SIZE.rock * sizeScale) / 2;
    this.graphics.fillStyle(color, 1);
    this._fillHexagon(this.x, this.y, r);
  }

  /**
   * Fill a hexagon centered at (cx, cy) with given radius.
   * @private
   */
  _fillHexagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.fillPoints(points, true);
  }

  /**
   * Stroke a hexagon centered at (cx, cy) with given radius.
   * @private
   */
  _strokeHexagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.strokePoints(points, true);
  }

  /**
   * Draw poison tower (pentagon).
   * @param {number} color - Fill color
   * @private
   */
  _drawPoison(color, sizeScale = 1.0) {
    const r = (TOWER_SHAPE_SIZE.poison * sizeScale) / 2;
    this.graphics.fillStyle(color, 1);
    this._fillPentagon(this.x, this.y, r);
  }

  /**
   * Fill a pentagon centered at (cx, cy) with given radius.
   * @private
   */
  _fillPentagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.fillPoints(points, true);
  }

  /**
   * Stroke a pentagon.
   * @private
   */
  _strokePentagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.strokePoints(points, true);
  }

  /**
   * Draw wind tower (half circle + 3 curved lines).
   * @param {number} color - Fill color
   * @private
   */
  _drawWind(color, sizeScale = 1.0) {
    this.graphics.fillStyle(color, 1);
    // Half circle (top half)
    this.graphics.slice(this.x, this.y, 12 * sizeScale, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    this.graphics.fillPath();

    // 3 curved wind lines
    this.graphics.lineStyle(2, color, 0.7);
    for (let i = 0; i < 3; i++) {
      const offsetX = (-6 + i * 6) * sizeScale;
      const startY = this.y + 2;
      this.graphics.lineBetween(
        this.x + offsetX, startY,
        this.x + offsetX + 3 * sizeScale, startY + (6 + i * 2) * sizeScale
      );
    }
  }

  /**
   * Draw light tower (octagon).
   * @param {number} color - Fill color
   * @private
   */
  _drawLight(color, sizeScale = 1.0) {
    const r = (TOWER_SHAPE_SIZE.light * sizeScale) / 2;
    this.graphics.fillStyle(color, 1);
    this._fillOctagon(this.x, this.y, r);
  }

  /**
   * Fill an octagon centered at (cx, cy) with given radius.
   * @private
   */
  _fillOctagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.fillPoints(points, true);
  }

  /**
   * Stroke an octagon.
   * @private
   */
  _strokeOctagon(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    this.graphics.strokePoints(points, true);
  }

  /**
   * Draw dragon tower (circle + X-shaped wings).
   * @param {number} color - Fill color
   * @private
   */
  _drawDragon(color, sizeScale = 1.0) {
    const r = 16 * sizeScale;
    // Main body
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(this.x, this.y, r);

    // Gold border
    this.graphics.lineStyle(2, 0xffd700, 1);
    this.graphics.strokeCircle(this.x, this.y, r);

    // X-shaped wings
    this.graphics.lineStyle(3, color, 0.8);
    const wx = 14 * sizeScale;
    const wy = 10 * sizeScale;
    this.graphics.lineBetween(this.x - wx, this.y - wy, this.x + wx, this.y + wy);
    this.graphics.lineBetween(this.x + wx, this.y - wy, this.x - wx, this.y + wy);
  }

  // ── Enhancement (Lv.3+ Gold Sink) ────────────────────────────

  /**
   * Draw a golden glow ring to indicate enhancement level.
   * Glow intensity scales with enhancement level.
   * @private
   */
  _drawEnhanceGlow() {
    const alpha = 0.2 + (this.enhanceLevel / MAX_ENHANCE_LEVEL) * 0.5;
    const glowRadius = 22 + this.enhanceLevel * 0.5;
    this.graphics.lineStyle(1.5, 0xffd700, alpha);
    this.graphics.strokeCircle(this.x, this.y, glowRadius);
  }

  /**
   * Enhance this tower (Lv.3 only). Applies compound stat bonuses.
   * damage × 1.05, range × 1.025, fireRate × 0.975 (min 0.3s)
   * @returns {boolean} True if enhancement succeeded
   */
  enhance() {
    if (!this.canEnhance()) return false;

    this.enhanceLevel++;
    const cost = calcEnhanceCost(this.enhanceLevel);
    this.enhanceInvested += cost;
    this.totalInvested += cost;

    // Apply compound bonuses
    this.stats.damage = Math.round(this.stats.damage * (1 + ENHANCE_STAT_BONUS));
    this.stats.range = Math.round(this.stats.range * (1 + ENHANCE_STAT_BONUS * 0.5));
    this.stats.fireRate = Math.max(0.3, this.stats.fireRate * (1 - ENHANCE_STAT_BONUS * 0.5));

    this.draw();
    return true;
  }

  /**
   * Get the cost for the next enhancement level.
   * @returns {number|null} Cost or null if max
   */
  getEnhanceCost() {
    if (!this.canEnhance()) return null;
    return calcEnhanceCost(this.enhanceLevel + 1);
  }

  /**
   * Check if tower can be enhanced.
   * @returns {boolean}
   */
  canEnhance() {
    return this.level >= 3 && this.enhanceLevel < MAX_ENHANCE_LEVEL;
  }

  // ── Attack Logic ──────────────────────────────────────────────

  /**
   * Update tower attack logic.
   * @param {number} delta - Frame delta in seconds (game-speed adjusted)
   * @param {Enemy[]} enemies - Array of active enemies
   * @param {Function} createProjectile - Callback to create a projectile
   * @param {Function} [applyAoeInstant] - Callback for instant AoE attacks
   * @param {Function} [applyChain] - Callback for chain lightning attacks
   * @param {Function} [applyBeam] - Callback for piercing beam attacks
   */
  update(delta, enemies, createProjectile, applyAoeInstant, applyChain, applyBeam) {
    // Update cooldown
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
      return;
    }

    // Find target (First priority - highest path progress within range)
    const target = this._findTarget(enemies);
    if (!target) return;

    // Fire
    this.cooldownTimer = this.stats.fireRate;
    const attackType = this.stats.attackType || 'single';

    switch (attackType) {
      case 'single':
      case 'splash':
      case 'dot_single':
        createProjectile(this, target);
        break;
      case 'dot_splash':
      case 'aoe_instant':
        if (applyAoeInstant) applyAoeInstant(this, target, enemies);
        break;
      case 'chain':
        if (applyChain) applyChain(this, target, enemies);
        break;
      case 'piercing_beam':
        if (applyBeam) applyBeam(this, target, enemies);
        break;
    }
  }

  /**
   * Find the best target within range using First targeting (highest path progress).
   * @param {Enemy[]} enemies - Active enemy list
   * @returns {Enemy|null} Best target or null
   * @private
   */
  _findTarget(enemies) {
    let bestTarget = null;
    let bestProgress = -1;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedBase) continue;

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.stats.range && enemy.pathProgress > bestProgress) {
        bestProgress = enemy.pathProgress;
        bestTarget = enemy;
      }
    }

    return bestTarget;
  }

  // ── Upgrade / Sell ────────────────────────────────────────────

  /**
   * Upgrade the tower to the next level with a selected branch.
   * Lv.1 → Lv.2: branch = 'a' or 'b' → key = '2a' or '2b'
   * Lv.2 → Lv.3: branch = 'a' or 'b' → key = '3' + this.branch + branch
   * @param {string} branch - Branch selection ('a' or 'b')
   * @returns {boolean} True if upgrade succeeded
   */
  upgrade(branch) {
    if (this.level >= MAX_TOWER_LEVEL) return false;

    if (this.level === 1) {
      // Lv.1 → Lv.2
      this.level = 2;
      this.branch = branch;
      const key = `2${branch}`;
      this.stats = { ...TOWER_STATS[this.type].levels[key] };
      this.totalInvested += this.stats.cost;
      this.draw();
      return true;
    }

    if (this.level === 2) {
      // Lv.2 → Lv.3
      const key = `3${this.branch}${branch}`;
      this.level = 3;
      this.branch3 = branch;
      this.stats = { ...TOWER_STATS[this.type].levels[key] };
      this.totalInvested += this.stats.cost;
      this.draw();
      return true;
    }

    return false;
  }

  /**
   * Get the sell price (60% of total invested).
   * @returns {number} Gold refund amount
   */
  getSellPrice() {
    return Math.floor(this.totalInvested * SELL_RATIO);
  }

  /**
   * Get the upgrade cost for a given branch.
   * @param {string} branch - Branch ('a' or 'b')
   * @returns {number|null} Cost or null if max level
   */
  getUpgradeCost(branch) {
    if (this.level >= MAX_TOWER_LEVEL) return null;

    if (this.level === 1) {
      return TOWER_STATS[this.type].levels[`2${branch}`].cost;
    }

    if (this.level === 2) {
      const key = `3${this.branch}${branch}`;
      return TOWER_STATS[this.type].levels[key].cost;
    }

    return null;
  }

  /**
   * Check if tower can be upgraded.
   * @returns {boolean}
   */
  canUpgrade() {
    return this.level < MAX_TOWER_LEVEL;
  }

  /**
   * Show the range circle around this tower.
   */
  showRangeCircle() {
    this.hideRangeCircle();
    this.rangeGraphics = this.scene.add.graphics();
    this.rangeGraphics.setDepth(8);
    this.rangeGraphics.fillStyle(COLORS.RANGE_FILL, VISUALS.RANGE_FILL_ALPHA);
    this.rangeGraphics.fillCircle(this.x, this.y, this.stats.range);
    this.rangeGraphics.lineStyle(VISUALS.RANGE_LINE_WIDTH, COLORS.RANGE_FILL, VISUALS.RANGE_STROKE_ALPHA);
    this.rangeGraphics.strokeCircle(this.x, this.y, this.stats.range);
  }

  /**
   * Hide the range circle.
   */
  hideRangeCircle() {
    if (this.rangeGraphics) {
      this.rangeGraphics.destroy();
      this.rangeGraphics = null;
    }
  }

  /**
   * Get display info for the UI panel.
   * @returns {object} Tower info object
   */
  getInfo() {
    let levelKey;
    if (this.level === 1) {
      levelKey = 1;
    } else if (this.level === 2) {
      levelKey = `2${this.branch}`;
    } else if (this.level === 3) {
      levelKey = `3${this.branch}${this.branch3}`;
    }

    const stats = TOWER_STATS[this.type].levels[levelKey];

    return {
      name: TOWER_STATS[this.type].displayName,
      type: this.type,
      level: this.level,
      branch: this.branch || null,
      branch3: this.branch3 || null,
      branchName: stats.branchName || null,
      damage: this.stats.damage,
      fireRate: this.stats.fireRate,
      range: this.stats.range,
      sellPrice: this.getSellPrice(),
      canUpgrade: this.canUpgrade(),
      // Enhancement
      enhanceLevel: this.enhanceLevel,
      canEnhance: this.canEnhance(),
      enhanceCost: this.getEnhanceCost(),
      // Lv.1 → 2 buttons
      upgradeACost: this.level === 1 ? TOWER_STATS[this.type].levels['2a'].cost : null,
      upgradeBCost: this.level === 1 ? TOWER_STATS[this.type].levels['2b'].cost : null,
      upgradeAName: this.level === 1 ? TOWER_STATS[this.type].levels['2a'].branchName : null,
      upgradeBName: this.level === 1 ? TOWER_STATS[this.type].levels['2b'].branchName : null,
      // Lv.2 → 3 buttons
      upgrade3ACost: this.level === 2 ? TOWER_STATS[this.type].levels[`3${this.branch}a`].cost : null,
      upgrade3BCost: this.level === 2 ? TOWER_STATS[this.type].levels[`3${this.branch}b`].cost : null,
      upgrade3AName: this.level === 2 ? TOWER_STATS[this.type].levels[`3${this.branch}a`].branchName : null,
      upgrade3BName: this.level === 2 ? TOWER_STATS[this.type].levels[`3${this.branch}b`].branchName : null,
      // Branch descriptions
      upgradeADesc: this.level === 1 ? TOWER_STATS[this.type].levels['2a'].branchDesc : null,
      upgradeBDesc: this.level === 1 ? TOWER_STATS[this.type].levels['2b'].branchDesc : null,
      upgrade3ADesc: this.level === 2 ? TOWER_STATS[this.type].levels[`3${this.branch}a`].branchDesc : null,
      upgrade3BDesc: this.level === 2 ? TOWER_STATS[this.type].levels[`3${this.branch}b`].branchDesc : null,
    };
  }

  /**
   * Remove all graphics and clean up.
   */
  destroy() {
    this.hideRangeCircle();
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
