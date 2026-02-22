/**
 * @fileoverview ProjectilePool - Object pool for Projectile instances.
 * Reuses Projectile objects and their Graphics to reduce GC pressure.
 *
 * Phase 6: Performance optimization.
 */

import { Projectile } from '../entities/Projectile.js';

export class ProjectilePool {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {number} [initialSize=30] - Pre-allocated pool size
   */
  constructor(scene, initialSize = 30) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {Projectile[]} Available (inactive) projectiles */
    this.pool = [];

    /** @type {Projectile[]} Currently active projectiles */
    this.active = [];

    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      const proj = this._createProjectile();
      proj.deactivate();
      this.pool.push(proj);
    }
  }

  /**
   * Acquire a projectile from the pool (or create a new one).
   * @param {string} towerType
   * @param {number} startX
   * @param {number} startY
   * @param {object} target
   * @param {number} damage
   * @param {number} speed
   * @param {object} [extra]
   * @returns {Projectile}
   */
  acquire(towerType, startX, startY, target, damage, speed, extra = {}) {
    let proj = this.pool.pop();
    if (!proj) {
      proj = this._createProjectile();
    }
    proj.reset(towerType, startX, startY, target, damage, speed, extra);
    this.active.push(proj);
    return proj;
  }

  /**
   * Release a projectile back to the pool.
   * @param {Projectile} proj
   */
  release(proj) {
    proj.deactivate();
    const idx = this.active.indexOf(proj);
    if (idx !== -1) {
      this.active.splice(idx, 1);
    }
    this.pool.push(proj);
  }

  /**
   * Release all active projectiles back to the pool.
   */
  releaseAll() {
    while (this.active.length > 0) {
      const proj = this.active.pop();
      proj.deactivate();
      this.pool.push(proj);
    }
  }

  /**
   * Get count of currently active projectiles.
   * @returns {number}
   */
  getActiveCount() {
    return this.active.length;
  }

  /**
   * Destroy all projectiles (pool + active). Call on scene shutdown.
   */
  destroy() {
    for (const proj of this.active) {
      proj.destroy();
    }
    for (const proj of this.pool) {
      proj.destroy();
    }
    this.active = [];
    this.pool = [];
  }

  /**
   * Create a new Projectile instance with a dummy target for pool storage.
   * @returns {Projectile}
   * @private
   */
  _createProjectile() {
    // Create with dummy values; reset() will set real values before use
    const dummyTarget = { x: 0, y: 0, alive: false, reachedBase: true };
    return new Projectile(this.scene, 'archer', -100, -100, dummyTarget, 0, 0);
  }
}
