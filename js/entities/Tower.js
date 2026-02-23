/**
 * @fileoverview Tower - Represents a defensive tower placed on the grid.
 * Handles drawing, attack cooldown, targeting (First priority), upgrades with A/B branching,
 * and attack type dispatching (single, splash, chain, aoe_instant, piercing_beam, dot_single).
 */

import {
  TOWER_STATS, SELL_RATIO, COLORS, VISUALS,
  TOWER_SHAPE_SIZE, gridToPixel,
  MAX_ENHANCE_LEVEL, ENHANCE_STAT_BONUS, calcEnhanceCost,
  isMergeable, isUsedAsMergeIngredient, MERGED_TOWER_STATS,
  MERGE_RECIPES,
} from '../config.js';
import { t } from '../i18n.js';

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

    /** @type {string} Base tower type */
    this.type = type;

    /** @type {number} Merge tier (1=base, 2-5=merged) */
    this.tier = 1;

    /** @type {string|null} Merge result ID (null for base towers) */
    this.mergeId = null;

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

  /**
   * Get the display color for this tower.
   * Merged towers use the color from their MERGE_RECIPES entry; base towers use TOWER_STATS.
   * @returns {number} Hex color value
   * @private
   */
  _getColor() {
    if (this.mergeId) {
      // Direct lookup via cached id-to-color map
      if (!Tower._mergeColorMap) {
        Tower._mergeColorMap = {};
        for (const recipe of Object.values(MERGE_RECIPES)) {
          Tower._mergeColorMap[recipe.id] = recipe.color;
        }
      }
      const color = Tower._mergeColorMap[this.mergeId];
      if (color !== undefined) return color;
    }
    return TOWER_STATS[this.type].color;
  }

  draw() {
    this.graphics.clear();
    const color = this._getColor();

    const sizeScale = 1.0;

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

    // Tier border indicators
    if (this.tier >= 2) {
      this._drawTierBorder();
    }

    // Enhancement glow indicator
    if (this.enhanceLevel > 0) {
      this._drawEnhanceGlow();
    }
  }

  /**
   * Draw tier-based border indicator.
   * Tier 2 = silver, Tier 3 = gold, Tier 4 = purple, Tier 5 = rainbow.
   * @private
   */
  _drawTierBorder() {
    const tierColors = {
      2: { color: 0xb2bec3, alpha: 0.8, width: 2 },
      3: { color: 0xffd700, alpha: 0.7, width: 2.5 },
      4: { color: 0xa29bfe, alpha: 0.8, width: 3 },
    };

    const tierStyle = tierColors[this.tier];
    if (!tierStyle && this.tier < 5) return;

    // Tier 5: rainbow effect via cycling hue — simplified to a static purple-gold mix
    const borderColor = tierStyle ? tierStyle.color : 0xffd700;
    const borderAlpha = tierStyle ? tierStyle.alpha : 0.9;
    const borderWidth = tierStyle ? tierStyle.width : 3;

    this.graphics.lineStyle(borderWidth, borderColor, borderAlpha);
    this.graphics.strokeCircle(this.x, this.y, 20);
  }

  // ── Tower Shape Drawing ───────────────────────────────────────

  /**
   * Draw archer tower (upward triangle).
   * @param {number} color - Fill color
   * @param {number} sizeScale - Size multiplier
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
   * Enhancement requires enhanceLevel < MAX and the tower is NOT used as a merge ingredient.
   * @returns {boolean}
   */
  canEnhance() {
    const id = this.mergeId || this.type;
    return this.enhanceLevel < MAX_ENHANCE_LEVEL && !isUsedAsMergeIngredient(id);
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

  // ── Merge / Sell ─────────────────────────────────────────────

  /**
   * Apply a merge result to this tower, transforming it into the merged tower.
   * @param {object} mergeData - { id, tier, displayName, color } from MERGE_RECIPES
   */
  applyMergeResult(mergeData) {
    this.mergeId = mergeData.id;
    this.tier = mergeData.tier;

    // Load stats from MERGED_TOWER_STATS
    const mergedStats = MERGED_TOWER_STATS[mergeData.id];
    if (mergedStats) {
      this.stats = { ...mergedStats };
    }

    this.draw();
  }

  /**
   * Get the sell price (60% of total invested).
   * @returns {number} Gold refund amount
   */
  getSellPrice() {
    return Math.floor(this.totalInvested * SELL_RATIO);
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
    // Resolve display name: merged towers use i18n key, base towers use TOWER_STATS
    let name;
    if (this.mergeId) {
      name = t(`tower.${this.mergeId}.name`) || this.mergeId;
    } else {
      name = t(`tower.${this.type}.name`) || TOWER_STATS[this.type].displayName;
    }

    return {
      name,
      type: this.type,
      tier: this.tier,
      mergeId: this.mergeId,
      displayName: name,
      isMergeable: isMergeable(this),
      damage: this.stats.damage,
      fireRate: this.stats.fireRate,
      range: this.stats.range,
      sellPrice: this.getSellPrice(),
      // Enhancement
      enhanceLevel: this.enhanceLevel,
      canEnhance: this.canEnhance(),
      enhanceCost: this.getEnhanceCost(),
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
