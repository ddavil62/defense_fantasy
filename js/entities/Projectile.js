/**
 * @fileoverview Projectile - Represents a projectile fired from a tower towards an enemy.
 * Handles movement, hit detection, splash damage, slow application, DoT application,
 * armor piercing, and pushback effects.
 */

import {
  COLORS, PROJECTILE_SIZE, VISUALS,
} from '../config.js';

export class Projectile {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {string} towerType - Type of tower that fired
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position
   * @param {object} target - Target enemy
   * @param {number} damage - Damage amount
   * @param {number} speed - Projectile speed in px/s
   * @param {object} [extra] - Extra properties for special effects
   * @param {number} [extra.splashRadius] - Splash damage radius
   * @param {number} [extra.slowAmount] - Slow percentage (0-1)
   * @param {number} [extra.slowDuration] - Slow duration in seconds
   * @param {number} [extra.burnDamage] - Burn damage per second
   * @param {number} [extra.burnDuration] - Burn duration in seconds
   * @param {boolean} [extra.armorPiercing] - Ignores enemy resistance
   * @param {number} [extra.pushbackDistance] - Pushback distance in pixels
   * @param {string} [extra.attackType] - Attack type for hit processing
   */
  constructor(scene, towerType, startX, startY, target, damage, speed, extra = {}) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {string} */
    this.towerType = towerType;

    /** @type {number} */
    this.x = startX;

    /** @type {number} */
    this.y = startY;

    /** @type {object} */
    this.target = target;

    /** @type {number} */
    this.damage = damage;

    /** @type {number} */
    this.speed = speed;

    /** @type {number|null} Splash radius */
    this.splashRadius = extra.splashRadius || null;

    /** @type {number} Slow percentage */
    this.slowAmount = extra.slowAmount || 0;

    /** @type {number} Slow duration */
    this.slowDuration = extra.slowDuration || 0;

    /** @type {number} Burn damage per second */
    this.burnDamage = extra.burnDamage || 0;

    /** @type {number} Burn duration in seconds */
    this.burnDuration = extra.burnDuration || 0;

    /** @type {boolean} Armor piercing flag */
    this.armorPiercing = extra.armorPiercing || false;

    /** @type {number} Pushback distance in pixels */
    this.pushbackDistance = extra.pushbackDistance || 0;

    /** @type {number} Armor reduction amount (0-1) */
    this.armorReduction = extra.armorReduction || 0;

    /** @type {number} Armor reduction duration in seconds */
    this.armorReductionDuration = extra.armorReductionDuration || 0;

    /** @type {number} Poison damage per second */
    this.poisonDamage = extra.poisonDamage || 0;

    /** @type {number} Poison duration in seconds */
    this.poisonDuration = extra.poisonDuration || 0;

    /** @type {number} Max poison stacks */
    this.maxPoisonStacks = extra.maxPoisonStacks || 1;

    /** @type {string} Attack type for hit processing */
    this.attackType = extra.attackType || 'single';

    /** @type {boolean} Whether this projectile is still active */
    this.active = true;

    /** @type {number} Last known target X */
    this.targetX = target.x;

    /** @type {number} Last known target Y */
    this.targetY = target.y;

    // Graphics
    /** @type {Phaser.GameObjects.Graphics} */
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(18);

    this.draw();
  }

  /**
   * Draw the projectile shape based on tower type.
   */
  draw() {
    this.graphics.clear();
    const size = PROJECTILE_SIZE[this.towerType] || 3;

    switch (this.towerType) {
      case 'archer':
        this.graphics.fillStyle(COLORS.PROJECTILE_ARCHER, 1);
        this.graphics.fillCircle(this.x, this.y, size);
        break;

      case 'mage':
        this.graphics.fillStyle(COLORS.PROJECTILE_MAGE, 1);
        this.graphics.fillCircle(this.x, this.y, size);
        break;

      case 'ice': {
        const sz = size / 2;
        this.graphics.fillStyle(COLORS.PROJECTILE_ICE, 1);
        this.graphics.fillPoints([
          { x: this.x, y: this.y - sz },
          { x: this.x + sz, y: this.y },
          { x: this.x, y: this.y + sz },
          { x: this.x - sz, y: this.y },
        ], true);
        break;
      }

      case 'flame':
        this.graphics.fillStyle(COLORS.PROJECTILE_FLAME, 1);
        this.graphics.fillCircle(this.x, this.y, size);
        break;

      case 'rock':
        this.graphics.fillStyle(COLORS.PROJECTILE_ROCK, 1);
        this.graphics.fillRect(this.x - size / 2, this.y - size / 2, size, size);
        break;

      case 'wind':
        this.graphics.fillStyle(COLORS.PROJECTILE_WIND, 1);
        this.graphics.fillCircle(this.x, this.y, size);
        break;

      default:
        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillCircle(this.x, this.y, size || 3);
        break;
    }
  }

  /**
   * Update projectile position, check for hit.
   * @param {number} delta - Frame delta in seconds (game-speed adjusted)
   * @param {Enemy[]} enemies - All active enemies (for splash damage)
   * @returns {{ hit: boolean, enemy: object|null, killed: boolean, kills: object[] }} Hit result
   */
  update(delta, enemies) {
    if (!this.active) {
      return { hit: false, enemy: null, killed: false, kills: [] };
    }

    // If target is dead/removed, fly towards last known position
    if (this.target && this.target.alive && !this.target.reachedBase) {
      this.targetX = this.target.x;
      this.targetY = this.target.y;
    }

    // Move towards target position
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const moveAmount = this.speed * delta;
    const hitRadius = 8;

    if (dist <= hitRadius || moveAmount >= dist) {
      // Hit!
      this.active = false;
      this.x = this.targetX;
      this.y = this.targetY;

      return this._onHit(enemies);
    }

    // Move towards target
    const nx = dx / dist;
    const ny = dy / dist;
    this.x += nx * moveAmount;
    this.y += ny * moveAmount;

    this.draw();
    return { hit: false, enemy: null, killed: false, kills: [] };
  }

  /**
   * Handle projectile hit logic based on attack type.
   * @param {Enemy[]} enemies - All active enemies
   * @returns {{ hit: boolean, enemy: object|null, killed: boolean, kills: object[] }}
   * @private
   */
  _onHit(enemies) {
    const result = { hit: true, enemy: this.target, killed: false, kills: [] };

    switch (this.attackType) {
      case 'single':
        this._hitSingle(result);
        break;

      case 'splash':
        this._hitSplash(result, enemies);
        break;

      case 'dot_single':
        this._hitDotSingle(result);
        break;

      default:
        // Fallback: single target
        this._hitSingle(result);
        break;
    }

    return result;
  }

  /**
   * Single target hit with optional slow and pushback.
   * @param {object} result - Hit result to populate
   * @private
   */
  _hitSingle(result) {
    if (!this.target || !this.target.alive) return;

    const died = this.target.takeDamage(this.damage, this.armorPiercing);
    if (died) {
      result.killed = true;
      result.kills.push(this.target);
    } else {
      // Apply slow if defined
      if (this.slowAmount > 0) {
        this.target.applySlow(this.slowAmount, this.slowDuration);
      }
      // Apply pushback if defined
      if (this.pushbackDistance > 0) {
        this.target.pushBack(this.pushbackDistance);
      }
      // Apply armor reduction if defined (Phase 4)
      if (this.armorReduction > 0) {
        this.target.applyArmorReduction(this.armorReduction, this.armorReductionDuration);
      }
    }
  }

  /**
   * Splash hit: damage all enemies in radius, with optional slow.
   * @param {object} result - Hit result to populate
   * @param {Enemy[]} enemies - All active enemies
   * @private
   */
  _hitSplash(result, enemies) {
    this._playExplosionEffect();
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedBase) continue;
      const edx = enemy.x - this.x;
      const edy = enemy.y - this.y;
      const eDist = Math.sqrt(edx * edx + edy * edy);
      if (eDist <= this.splashRadius) {
        const died = enemy.takeDamage(this.damage, this.armorPiercing);
        if (died) {
          result.kills.push(enemy);
        } else {
          // Apply slow if defined
          if (this.slowAmount > 0) {
            enemy.applySlow(this.slowAmount, this.slowDuration);
          }
          // Apply burn DoT if defined
          if (this.burnDamage > 0) {
            enemy.applyBurn(this.burnDamage, this.burnDuration);
          }
          // Apply poison DoT if defined
          if (this.poisonDamage > 0) {
            enemy.applyPoison(this.poisonDamage, this.poisonDuration, this.maxPoisonStacks);
          }
          // Apply armor reduction if defined
          if (this.armorReduction > 0) {
            enemy.applyArmorReduction(this.armorReduction, this.armorReductionDuration);
          }
          // Apply pushback if defined
          if (this.pushbackDistance > 0) {
            enemy.pushBack(this.pushbackDistance);
          }
        }
      }
    }
    result.killed = result.kills.length > 0;
  }

  /**
   * DoT single hit: immediate damage + burn DoT.
   * @param {object} result - Hit result to populate
   * @private
   */
  _hitDotSingle(result) {
    if (!this.target || !this.target.alive) return;

    const died = this.target.takeDamage(this.damage, this.armorPiercing);
    if (died) {
      result.killed = true;
      result.kills.push(this.target);
    } else {
      // Apply burn DoT
      if (this.burnDamage > 0) {
        this.target.applyBurn(this.burnDamage, this.burnDuration);
      }
      // Apply poison DoT
      if (this.poisonDamage > 0) {
        this.target.applyPoison(this.poisonDamage, this.poisonDuration, this.maxPoisonStacks);
      }
      // Apply slow
      if (this.slowAmount > 0) {
        this.target.applySlow(this.slowAmount, this.slowDuration);
      }
      // Apply armor reduction if defined
      if (this.armorReduction > 0) {
        this.target.applyArmorReduction(this.armorReduction, this.armorReductionDuration);
      }
    }
  }

  /**
   * Play explosion visual effect for splash projectiles.
   * @private
   */
  _playExplosionEffect() {
    const effectGraphics = this.scene.add.graphics();
    effectGraphics.setDepth(19);

    let elapsed = 0;
    const duration = VISUALS.DEATH_EFFECT_DURATION;
    const maxRadius = this.splashRadius;
    const x = this.x;
    const y = this.y;

    // Phase 5: Radial particles (6-8)
    const particleCount = 6 + Math.floor(Math.random() * 3);
    const particles = Array.from({ length: particleCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 40;
      return {
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: 3 + Math.random() * 2,
      };
    });

    const timer = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const progress = elapsed / duration;
        const radius = maxRadius * progress;
        const alpha = 0.6 * (1 - progress);
        const dt = 16 / 1000;

        effectGraphics.clear();

        // Original expanding circle
        effectGraphics.fillStyle(COLORS.EXPLOSION, alpha);
        effectGraphics.fillCircle(x, y, radius);
        effectGraphics.lineStyle(2, COLORS.EXPLOSION, alpha * 0.5);
        effectGraphics.strokeCircle(x, y, radius);

        // Phase 5: Radial particle spray
        for (const p of particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt / 0.3; // 0.3s lifespan

          if (p.life > 0) {
            effectGraphics.fillStyle(COLORS.EXPLOSION, p.life * 0.8);
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
   * Reset projectile state for pool reuse.
   * @param {string} towerType
   * @param {number} startX
   * @param {number} startY
   * @param {object} target
   * @param {number} damage
   * @param {number} speed
   * @param {object} [extra]
   */
  reset(towerType, startX, startY, target, damage, speed, extra = {}) {
    this.towerType = towerType;
    this.x = startX;
    this.y = startY;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.splashRadius = extra.splashRadius || null;
    this.slowAmount = extra.slowAmount || 0;
    this.slowDuration = extra.slowDuration || 0;
    this.burnDamage = extra.burnDamage || 0;
    this.burnDuration = extra.burnDuration || 0;
    this.armorPiercing = extra.armorPiercing || false;
    this.pushbackDistance = extra.pushbackDistance || 0;
    this.armorReduction = extra.armorReduction || 0;
    this.armorReductionDuration = extra.armorReductionDuration || 0;
    this.poisonDamage = extra.poisonDamage || 0;
    this.poisonDuration = extra.poisonDuration || 0;
    this.maxPoisonStacks = extra.maxPoisonStacks || 1;
    this.attackType = extra.attackType || 'single';
    this.active = true;
    this.targetX = target.x;
    this.targetY = target.y;

    if (this.graphics) {
      this.graphics.setVisible(true);
    }
    this.draw();
  }

  /**
   * Deactivate for pool return (hides graphics, keeps object alive).
   */
  deactivate() {
    this.active = false;
    this.target = null;
    if (this.graphics) {
      this.graphics.clear();
      this.graphics.setVisible(false);
    }
  }

  /**
   * Remove all graphics and clean up.
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
