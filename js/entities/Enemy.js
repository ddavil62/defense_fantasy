/**
 * @fileoverview Enemy - Represents an enemy unit that follows the path towards the base.
 * Handles movement along waypoints, slow debuff, burn/poison DoT, armor resistance,
 * splitter death callback, HP bar rendering, and death effects.
 */

import {
  COLORS, VISUALS, ENEMY_STATS,
} from '../config.js';

/** @const {number} Boss visual radius (draw only, does not affect collision) */
const VISUAL_BOSS_RADIUS = 26;

/** @const {number} Boss armored visual radius (draw only, does not affect collision) */
const VISUAL_BOSS_ARMORED_RADIUS = 30;

export class Enemy {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {string} type - Enemy type ('normal','fast','tank','boss','swarm','splitter','armored','boss_armored')
   * @param {{ x: number, y: number }[]} path - Pixel waypoint path
   * @param {object} [overrides] - Optional stat overrides (for scaling)
   */
  constructor(scene, type, path, overrides = {}) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {string} */
    this.type = type;

    /** @type {{ x: number, y: number }[]} */
    this.path = path;

    /** @type {number} Current waypoint index */
    this.waypointIndex = 0;

    // Stats (with possible overrides for scaling)
    const baseStats = ENEMY_STATS[type];
    /** @type {number} */
    this.maxHp = overrides.hp || baseStats.hp;
    /** @type {number} */
    this.hp = this.maxHp;
    /** @type {number} */
    this.baseSpeed = overrides.speed || baseStats.speed;
    /** @type {number} */
    this.speed = this.baseSpeed;
    /** @type {number} Gold reward on kill */
    this.gold = overrides.gold != null ? overrides.gold : baseStats.gold;
    /** @type {number} Damage dealt to base on arrival */
    this.damage = overrides.damage || baseStats.damage;

    // Position
    /** @type {number} */
    this.x = path[0].x;
    /** @type {number} */
    this.y = path[0].y;

    // Slow debuff
    /** @type {number} Remaining slow duration in seconds */
    this.slowTimer = 0;
    /** @type {number} Slow percentage (0-1) */
    this.slowAmount = 0;

    // Burn DoT (flame/light towers)
    /** @type {number} Burn damage per second */
    this.burnDamage = 0;
    /** @type {number} Remaining burn duration in seconds */
    this.burnTimer = 0;

    // Poison DoT (poison tower)
    /** @type {number} Poison damage per second (per stack) */
    this.poisonDamage = 0;
    /** @type {number} Remaining poison duration in seconds */
    this.poisonTimer = 0;
    /** @type {number} Poison stacks (max 2) */
    this.poisonStacks = 0;

    // Armor reduction debuff (poison tower)
    /** @type {number} Armor reduction ratio (0.0-1.0) */
    this.armorReduction = 0;
    /** @type {number} Remaining armor reduction duration */
    this.armorReductionTimer = 0;

    // Resistance (armored enemies)
    /** @type {number} Damage resistance (0.0-1.0) */
    this.resistance = overrides.resistance != null ? overrides.resistance : (baseStats.resistance || 0);

    // Immunities (data-driven status effect immunity)
    /** @type {Set<string>} */
    this.immunities = new Set(baseStats.immunities || []);

    // Splitter callback
    /** @type {Function|null} Called when splitter dies */
    this.onSplit = null;

    // Pushback lock
    /** @type {boolean} True during pushback processing */
    this.isPushed = false;

    // State
    /** @type {boolean} */
    this.alive = true;
    /** @type {boolean} */
    this.reachedBase = false;

    // Path progress (for targeting priority: higher = closer to base)
    /** @type {number} */
    this.pathProgress = 0;

    // Graphics
    /** @type {Phaser.GameObjects.Graphics} */
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(15);

    /** @type {Phaser.GameObjects.Graphics} HP bar graphics */
    this.hpBarGraphics = scene.add.graphics();
    this.hpBarGraphics.setDepth(16);

    this.draw();
  }

  /**
   * Draw the enemy shape based on its type.
   */
  draw() {
    this.graphics.clear();

    switch (this.type) {
      case 'normal':
        this.graphics.fillStyle(COLORS.ENEMY_NORMAL, 1);
        this.graphics.fillCircle(this.x, this.y, ENEMY_STATS.normal.radius);
        break;

      case 'fast':
        this.graphics.fillStyle(COLORS.ENEMY_FAST, 1);
        this._drawTriangle(this.x, this.y, ENEMY_STATS.fast.size);
        break;

      case 'tank':
        this.graphics.fillStyle(COLORS.ENEMY_TANK, 1);
        this.graphics.fillRect(
          this.x - ENEMY_STATS.tank.size / 2,
          this.y - ENEMY_STATS.tank.size / 2,
          ENEMY_STATS.tank.size,
          ENEMY_STATS.tank.size
        );
        break;

      case 'boss':
        this.graphics.fillStyle(COLORS.ENEMY_BOSS, 1);
        this.graphics.fillCircle(this.x, this.y, VISUAL_BOSS_RADIUS);
        this.graphics.lineStyle(2, COLORS.BOSS_BORDER, 1);
        this.graphics.strokeCircle(this.x, this.y, VISUAL_BOSS_RADIUS);
        break;

      case 'swarm':
        this.graphics.fillStyle(COLORS.ENEMY_SWARM, 1);
        this.graphics.fillCircle(this.x, this.y, ENEMY_STATS.swarm.radius);
        break;

      case 'splitter':
        this.graphics.fillStyle(COLORS.ENEMY_SPLITTER, 1);
        this.graphics.fillCircle(this.x, this.y, ENEMY_STATS.splitter.radius);
        // White vertical line (split indicator)
        this.graphics.lineStyle(1, 0xffffff, 0.7);
        this.graphics.lineBetween(
          this.x, this.y - ENEMY_STATS.splitter.radius + 2,
          this.x, this.y + ENEMY_STATS.splitter.radius - 2
        );
        break;

      case 'armored': {
        const sz = ENEMY_STATS.armored.size;
        this.graphics.fillStyle(COLORS.ENEMY_ARMORED, 1);
        this.graphics.fillRect(this.x - sz / 2, this.y - sz / 2, sz, sz);
        // White border
        this.graphics.lineStyle(2, 0xffffff, 0.8);
        this.graphics.strokeRect(this.x - sz / 2, this.y - sz / 2, sz, sz);
        // Shield icon (internal X)
        this.graphics.lineStyle(1, 0xffffff, 0.5);
        const inner = sz * 0.3;
        this.graphics.lineBetween(this.x - inner, this.y - inner, this.x + inner, this.y + inner);
        this.graphics.lineBetween(this.x + inner, this.y - inner, this.x - inner, this.y + inner);
        break;
      }

      case 'boss_armored': {
        const r = VISUAL_BOSS_ARMORED_RADIUS;
        this.graphics.fillStyle(COLORS.ENEMY_ARMORED, 1);
        this.graphics.fillCircle(this.x, this.y, r);
        // Gold border
        this.graphics.lineStyle(3, COLORS.BOSS_BORDER, 1);
        this.graphics.strokeCircle(this.x, this.y, r);
        // White shield X
        this.graphics.lineStyle(2, 0xffffff, 0.6);
        const ir = r * 0.4;
        this.graphics.lineBetween(this.x - ir, this.y - ir, this.x + ir, this.y + ir);
        this.graphics.lineBetween(this.x + ir, this.y - ir, this.x - ir, this.y + ir);
        break;
      }
    }

    // Draw debuff indicators
    this._drawDebuffIndicators();

    this._drawHPBar();
  }

  /**
   * Draw visual indicators for active debuffs (slow, burn, poison).
   * @private
   */
  _drawDebuffIndicators() {
    const r = this._getRadius();

    // Slow indicator (blue tint)
    if (this.slowTimer > 0) {
      this.graphics.fillStyle(COLORS.ICE_TOWER, 0.3);
      this.graphics.fillCircle(this.x, this.y, r);
    }

    // Burn indicator (orange-red tint)
    if (this.burnTimer > 0) {
      this.graphics.fillStyle(COLORS.BURN_TINT, 0.25);
      this.graphics.fillCircle(this.x, this.y, r);
    }

    // Poison indicator (green tint)
    if (this.poisonTimer > 0) {
      this.graphics.fillStyle(COLORS.POISON_TINT, 0.25);
      this.graphics.fillCircle(this.x, this.y, r);
    }
  }

  /**
   * Draw a triangle centered at (x, y).
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} size - Triangle size
   * @private
   */
  _drawTriangle(cx, cy, size) {
    const half = size / 2;
    this.graphics.fillTriangle(
      cx, cy - half,
      cx - half, cy + half,
      cx + half, cy + half
    );
  }

  /**
   * Get the effective visual radius of this enemy.
   * @returns {number}
   * @private
   */
  _getRadius() {
    switch (this.type) {
      case 'normal': return ENEMY_STATS.normal.radius;
      case 'fast': return 8;
      case 'tank': return ENEMY_STATS.tank.size / 2;
      case 'boss': return VISUAL_BOSS_RADIUS;
      case 'swarm': return ENEMY_STATS.swarm.radius;
      case 'splitter': return ENEMY_STATS.splitter.radius;
      case 'armored': return ENEMY_STATS.armored.size / 2;
      case 'boss_armored': return VISUAL_BOSS_ARMORED_RADIUS;
      default: return 10;
    }
  }

  /**
   * Draw the HP bar above the enemy.
   * Hidden when HP is 100%.
   * @private
   */
  _drawHPBar() {
    this.hpBarGraphics.clear();

    // Hide HP bar if full HP
    if (this.hp >= this.maxHp) return;

    const ratio = this.hp / this.maxHp;
    const r = this._getRadius();
    const isBoss = this.type === 'boss' || this.type === 'boss_armored';

    // Boss types get wider + taller HP bars with gold border
    let barWidth, barHeight;
    if (this.type === 'boss_armored') {
      barWidth = VISUAL_BOSS_ARMORED_RADIUS * 2;
      barHeight = VISUALS.BOSS_ARMORED_HP_BAR_HEIGHT;
    } else if (this.type === 'boss') {
      barWidth = VISUAL_BOSS_RADIUS * 2;
      barHeight = VISUALS.BOSS_HP_BAR_HEIGHT;
    } else {
      barWidth = r * 2;
      barHeight = VISUALS.HP_BAR_HEIGHT;
    }

    const barX = this.x - barWidth / 2;
    const barY = this.y - r - VISUALS.HP_BAR_OFFSET_Y - barHeight;

    // Boss gold border
    if (isBoss) {
      this.hpBarGraphics.lineStyle(1, COLORS.BOSS_BORDER, 0.8);
      this.hpBarGraphics.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    }

    // Background
    this.hpBarGraphics.fillStyle(0x000000, 1);
    this.hpBarGraphics.fillRect(barX, barY, barWidth, barHeight);

    // Foreground (color based on ratio)
    let barColor;
    if (ratio > 0.5) {
      barColor = COLORS.HP_BAR_GREEN;
    } else if (ratio > 0.25) {
      barColor = COLORS.HP_BAR_YELLOW;
    } else {
      barColor = COLORS.HP_BAR_RED;
    }

    this.hpBarGraphics.fillStyle(barColor, 1);
    this.hpBarGraphics.fillRect(barX, barY, barWidth * ratio, barHeight);
  }

  /**
   * Update enemy position along the path and process DoT effects.
   * @param {number} delta - Frame delta in seconds (already scaled for game speed)
   */
  update(delta) {
    if (!this.alive || this.reachedBase) return;

    // ── DoT Processing ──────────────────────────────────────
    // Burn DoT (applies resistance to avoid bypassing armored enemy defense)
    if (this.burnTimer > 0) {
      this.burnTimer -= delta;
      let burnTick = this.burnDamage * delta;
      if (this.resistance > 0) {
        burnTick = Math.max(0.1, burnTick * (1 - this.resistance * (1 - this.armorReduction)));
      }
      this.hp -= burnTick;
      if (this.burnTimer <= 0) {
        this.burnDamage = 0;
        this.burnTimer = 0;
      }
      if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
        if (this.type === 'splitter' && this.onSplit) this.onSplit(this);
        this._playDeathEffect();
        return;
      }
    }

    // Poison DoT (applies resistance to avoid bypassing armored enemy defense)
    if (this.poisonTimer > 0) {
      this.poisonTimer -= delta;
      let poisonTick = this.poisonDamage * this.poisonStacks * delta;
      if (this.resistance > 0) {
        poisonTick = Math.max(0.1, poisonTick * (1 - this.resistance * (1 - this.armorReduction)));
      }
      this.hp -= poisonTick;
      if (this.poisonTimer <= 0) {
        this.poisonDamage = 0;
        this.poisonTimer = 0;
        this.poisonStacks = 0;
      }
      if (this.hp <= 0) {
        this.hp = 0;
        this.alive = false;
        if (this.type === 'splitter' && this.onSplit) this.onSplit(this);
        this._playDeathEffect();
        return;
      }
    }

    // Armor reduction timer
    if (this.armorReductionTimer > 0) {
      this.armorReductionTimer -= delta;
      if (this.armorReductionTimer <= 0) {
        this.armorReduction = 0;
      }
    }

    // ── Slow Processing ─────────────────────────────────────
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowTimer = 0;
        this.slowAmount = 0;
        this.speed = this.baseSpeed;
      } else {
        this.speed = this.baseSpeed * (1 - this.slowAmount);
      }
    }

    // ── Movement ────────────────────────────────────────────
    if (this.waypointIndex >= this.path.length - 1) {
      this.reachedBase = true;
      return;
    }

    const target = this.path[this.waypointIndex + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 0) {
      this.waypointIndex++;
      this.pathProgress = this.waypointIndex / (this.path.length - 1);
      return;
    }

    const moveAmount = this.speed * delta;

    if (moveAmount >= dist) {
      // Reached waypoint
      this.x = target.x;
      this.y = target.y;
      this.waypointIndex++;
      this.pathProgress = this.waypointIndex / (this.path.length - 1);

      // Check if reached base
      if (this.waypointIndex >= this.path.length - 1) {
        this.reachedBase = true;
      }
    } else {
      // Move towards waypoint
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * moveAmount;
      this.y += ny * moveAmount;

      // Calculate path progress with sub-waypoint interpolation
      const remainingDist = dist - moveAmount;
      const wp1 = this.path[this.waypointIndex];
      const wp2 = this.path[this.waypointIndex + 1];
      const segDx = wp2.x - wp1.x;
      const segDy = wp2.y - wp1.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
      const fractionCompleted = segLen > 0 ? 1 - (remainingDist / segLen) : 0;
      this.pathProgress = (this.waypointIndex + fractionCompleted) / (this.path.length - 1);
    }

    this.draw();
  }

  /**
   * Apply damage to this enemy with resistance calculation.
   * @param {number} amount - Damage amount
   * @param {boolean} [armorPiercing=false] - If true, ignores resistance
   * @returns {boolean} True if enemy died from this damage
   */
  takeDamage(amount, armorPiercing = false) {
    if (!this.alive) return false;

    let finalDamage = amount;
    if (this.resistance > 0 && !armorPiercing) {
      finalDamage = Math.max(1, Math.floor(amount * (1 - this.resistance * (1 - this.armorReduction))));
    }

    this.hp -= finalDamage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      if (this.type === 'splitter' && this.onSplit) this.onSplit(this);
      this._playDeathEffect();
      return true;
    }
    return false;
  }

  /**
   * Check if this enemy is immune to a given effect type.
   * @param {string} effectType - Effect key ('slow','burn','poison','armorReduction','pushback')
   * @returns {boolean}
   */
  isImmune(effectType) {
    return this.immunities.has(effectType);
  }

  /**
   * Apply slow debuff. Stronger slow overwrites weaker one.
   * @param {number} amount - Slow percentage (0-1, e.g., 0.3 = 30% slower)
   * @param {number} duration - Duration in seconds
   */
  applySlow(amount, duration) {
    if (this.isImmune('slow')) return;
    if (amount > this.slowAmount || this.slowTimer <= 0) {
      this.slowAmount = amount;
      this.slowTimer = duration;
      this.speed = this.baseSpeed * (1 - this.slowAmount);
    }
  }

  /**
   * Apply burn DoT. Stronger burn overwrites weaker one.
   * @param {number} damagePerSecond - Burn damage per second
   * @param {number} duration - Burn duration in seconds
   */
  applyBurn(damagePerSecond, duration) {
    if (this.isImmune('burn')) return;
    if (damagePerSecond > this.burnDamage || this.burnTimer <= 0) {
      this.burnDamage = damagePerSecond;
      this.burnTimer = duration;
    }
  }

  /**
   * Apply poison DoT with stacking support.
   * @param {number} damagePerSecond - Poison damage per second per stack
   * @param {number} duration - Poison duration in seconds
   * @param {number} [maxStacks=1] - Maximum allowed stacks
   */
  applyPoison(damagePerSecond, duration, maxStacks = 1) {
    if (this.isImmune('poison')) return;
    if (this.poisonTimer <= 0) {
      // Fresh poison
      this.poisonDamage = damagePerSecond;
      this.poisonTimer = duration;
      this.poisonStacks = 1;
    } else if (maxStacks > 1 && this.poisonStacks < maxStacks) {
      // Add stack
      this.poisonStacks++;
      this.poisonTimer = duration; // Refresh timer
      this.poisonDamage = damagePerSecond;
    } else {
      // Overwrite with stronger poison or refresh timer
      if (damagePerSecond >= this.poisonDamage) {
        this.poisonDamage = damagePerSecond;
        this.poisonTimer = duration;
      }
    }
  }

  /**
   * Apply armor reduction debuff.
   * @param {number} reductionRatio - Armor reduction (0.0-1.0)
   * @param {number} duration - Duration in seconds
   */
  applyArmorReduction(reductionRatio, duration) {
    if (this.isImmune('armorReduction')) return;
    if (reductionRatio > this.armorReduction || this.armorReductionTimer <= 0) {
      this.armorReduction = reductionRatio;
      this.armorReductionTimer = duration;
    }
  }

  /**
   * Push enemy back along the path by a given pixel distance.
   * @param {number} distance - Pushback distance in pixels
   */
  pushBack(distance) {
    if (this.isPushed || this.waypointIndex <= 0) return;
    if (this.isImmune('pushback')) return;
    this.isPushed = true;

    // Calculate how many waypoint segments to rewind
    let remaining = distance;
    let idx = this.waypointIndex;

    while (remaining > 0 && idx > 0) {
      const prev = this.path[idx - 1];
      const curr = this.path[idx];
      const segDx = curr.x - prev.x;
      const segDy = curr.y - prev.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);

      if (segLen <= remaining) {
        remaining -= segLen;
        idx--;
      } else {
        // Partial rewind within this segment
        const ratio = remaining / segLen;
        this.x = curr.x - segDx * ratio;
        this.y = curr.y - segDy * ratio;
        remaining = 0;
      }
    }

    if (remaining > 0) {
      // Reached start of path
      idx = 0;
    }

    this.waypointIndex = idx;
    if (remaining > 0 || idx === 0) {
      this.x = this.path[idx].x;
      this.y = this.path[idx].y;
    }
    this.pathProgress = this.waypointIndex / (this.path.length - 1);

    this.isPushed = false;
  }

  /**
   * Play death particle effect.
   * @private
   */
  _playDeathEffect() {
    const effectGraphics = this.scene.add.graphics();
    effectGraphics.setDepth(20);
    const baseStats = ENEMY_STATS[this.type];
    const color = baseStats ? baseStats.color : 0xffffff;
    const isBoss = this.type === 'boss' || this.type === 'boss_armored';

    // Create simple expanding ring effect
    let elapsed = 0;
    const duration = isBoss ? 500 : VISUALS.DEATH_EFFECT_DURATION;
    const maxRadius = this._getRadius() * 2;
    const deathX = this.x;
    const deathY = this.y;

    // Phase 5: More particles with random velocity vectors
    const particleCount = isBoss ? 12 : 8;
    const maxParticleSize = isBoss ? 5 : 3;
    const particles = Array.from({ length: particleCount }, () => ({
      x: deathX,
      y: deathY,
      vx: (Math.random() - 0.5) * 120,
      vy: (Math.random() - 0.5) * 120,
      life: 1.0,
      size: 1 + Math.random() * (maxParticleSize - 1),
    }));

    const timer = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const progress = elapsed / duration;
        const radius = maxRadius * progress;
        const alpha = 1 - progress;
        const dt = 16 / 1000;

        effectGraphics.clear();
        effectGraphics.lineStyle(2, color, alpha);
        effectGraphics.strokeCircle(deathX, deathY, radius);

        // Phase 5: Boss extra large ring
        if (isBoss) {
          const bossRingRadius = 60 * progress;
          effectGraphics.lineStyle(3, COLORS.BOSS_BORDER, alpha * 0.8);
          effectGraphics.strokeCircle(deathX, deathY, bossRingRadius);
        }

        // Phase 5: Enhanced particles with physics
        for (const p of particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt / (duration / 1000);

          if (p.life > 0) {
            effectGraphics.fillStyle(color, p.life * 0.8);
            effectGraphics.fillCircle(p.x, p.y, p.size * p.life);
          }
        }

        if (elapsed >= duration) {
          timer.remove();
          effectGraphics.destroy();
        }
      },
      loop: true,
    });
  }

  /**
   * Remove all graphics and clean up.
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    if (this.hpBarGraphics) {
      this.hpBarGraphics.destroy();
      this.hpBarGraphics = null;
    }
  }
}
