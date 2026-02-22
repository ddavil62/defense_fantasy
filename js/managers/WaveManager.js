/**
 * @fileoverview WaveManager - Manages wave spawning, progression, and auto-scaling.
 * Handles R1-R20 predefined waves and R21+ procedural generation with new enemy types.
 */

import {
  WAVE_DEFINITIONS, ENEMY_STATS, SCALING,
  WAVE_ANNOUNCE_DURATION, WAVE_CLEAR_DURATION, WAVE_BREAK_DURATION,
  calcWaveClearBonus, GAME_WIDTH, GAME_HEIGHT,
} from '../config.js';

/** @enum {string} Wave state */
const WaveState = {
  IDLE: 'idle',
  ANNOUNCING: 'announcing',
  SPAWNING: 'spawning',
  WAITING: 'waiting',       // All spawned, waiting for enemies to die/reach base
  CLEAR: 'clear',           // Wave clear message showing
  BREAK: 'break',           // Inter-wave break
};

export class WaveManager {
  /**
   * @param {Phaser.Scene} scene - The game scene
   */
  constructor(scene) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {number} Current round number */
    this.currentWave = 0;

    /** @type {string} Current wave state */
    this.state = WaveState.IDLE;

    /** @type {number} Spawn timer in seconds */
    this.spawnTimer = 0;

    /** @type {number} State timer in seconds */
    this.stateTimer = 0;

    /** @type {object[]} Queue of enemies to spawn */
    this.enemyQueue = [];

    /** @type {number} Current spawn interval in seconds */
    this.spawnInterval = 0;

    /** @type {boolean} Whether boss delay is active */
    this.bossDelayActive = false;

    /** @type {number} Boss delay timer */
    this.bossDelayTimer = 0;

    /** @type {Phaser.GameObjects.Text|null} Announcement text */
    this.announceText = null;

    /** @type {number} Total enemies killed this game */
    this.totalKills = 0;
  }

  /**
   * Start the first wave (called when game begins).
   */
  startFirstWave() {
    this.currentWave = 1;
    this._announceWave();
  }

  /**
   * Announce the current wave with on-screen text.
   * @private
   */
  _announceWave() {
    this.state = WaveState.ANNOUNCING;
    this.stateTimer = WAVE_ANNOUNCE_DURATION / 1000;

    // Show wave announcement text
    if (this.announceText) {
      this.announceText.destroy();
    }
    this.announceText = this.scene.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40,
      `Wave ${this.currentWave}`,
      {
        fontSize: '32px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(50).setAlpha(0);

    // Fade in animation
    this.scene.tweens.add({
      targets: this.announceText,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
      yoyo: false,
    });
  }

  /**
   * Start spawning enemies for the current wave.
   * @private
   */
  _startSpawning() {
    this.state = WaveState.SPAWNING;
    this.spawnTimer = 0;

    const waveData = this._getWaveData(this.currentWave);
    this.enemyQueue = waveData.enemies;
    this.spawnInterval = waveData.spawnInterval;
    this.isBossRound = waveData.bossRound || false;
    this.bossDelayActive = false;
    this.bossDelayTimer = waveData.bossDelay || 0;

    // Remove announcement text
    if (this.announceText) {
      this.scene.tweens.add({
        targets: this.announceText,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          if (this.announceText) {
            this.announceText.destroy();
            this.announceText = null;
          }
        },
      });
    }
  }

  /**
   * Update wave manager each frame.
   * @param {number} delta - Frame delta in seconds (game-speed adjusted)
   * @param {object[]} activeEnemies - Currently alive enemies on the map
   * @param {Function} spawnEnemy - Callback to spawn an enemy
   * @param {Function} onWaveClear - Callback when wave is cleared; returns actual awarded gold
   * @param {number} currentHP - Current base HP for bonus calculation
   * @param {number} maxBaseHP - Maximum base HP (includes meta upgrades)
   */
  update(delta, activeEnemies, spawnEnemy, onWaveClear, currentHP, maxBaseHP) {
    switch (this.state) {
      case WaveState.IDLE:
        break;

      case WaveState.ANNOUNCING:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this._startSpawning();
        }
        break;

      case WaveState.SPAWNING:
        this._updateSpawning(delta, spawnEnemy);
        break;

      case WaveState.WAITING:
        if (activeEnemies.length === 0) {
          this._onWaveClear(onWaveClear, currentHP, maxBaseHP);
        }
        break;

      case WaveState.CLEAR:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = WaveState.BREAK;
          this.stateTimer = WAVE_BREAK_DURATION;
          if (this.announceText) {
            this.scene.tweens.add({
              targets: this.announceText,
              alpha: 0,
              duration: 300,
              onComplete: () => {
                if (this.announceText) {
                  this.announceText.destroy();
                  this.announceText = null;
                }
              },
            });
          }
        }
        break;

      case WaveState.BREAK:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.currentWave++;
          this._announceWave();
        }
        break;
    }
  }

  /**
   * Update spawning logic.
   * @param {number} delta - Frame delta
   * @param {Function} spawnEnemy - Callback to spawn an enemy
   * @private
   */
  _updateSpawning(delta, spawnEnemy) {
    if (this.enemyQueue.length === 0) {
      this.state = WaveState.WAITING;
      return;
    }

    // Handle boss delay
    if (this.bossDelayActive && this.bossDelayTimer > 0) {
      this.bossDelayTimer -= delta;
      if (this.bossDelayTimer <= 0) {
        this.bossDelayActive = false;
      }
      return;
    }

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      const enemyData = this.enemyQueue.shift();
      spawnEnemy(enemyData);

      // Boss types trigger delay after spawning
      if (this.isBossRound && (enemyData.type === 'boss' || enemyData.type === 'boss_armored')) {
        this.bossDelayActive = true;
        this.spawnTimer = 0;
      } else {
        this.spawnTimer = this.spawnInterval;
      }
    }
  }

  /**
   * Handle wave clear event.
   * @param {Function} onWaveClear - Callback with bonus gold; returns actual awarded amount
   * @param {number} currentHP - Current base HP
   * @param {number} maxBaseHP - Maximum base HP (includes meta upgrades)
   * @private
   */
  _onWaveClear(onWaveClear, currentHP, maxBaseHP) {
    this.state = WaveState.CLEAR;
    this.stateTimer = WAVE_CLEAR_DURATION / 1000;

    const bonusGold = calcWaveClearBonus(this.currentWave, currentHP, maxBaseHP);
    const awardedGold = onWaveClear(bonusGold) || bonusGold;

    if (this.announceText) {
      this.announceText.destroy();
    }
    this.announceText = this.scene.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40,
      `Wave ${this.currentWave} Clear!\n+${awardedGold}G Bonus`,
      {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
        lineSpacing: 6,
      }
    ).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.scene.tweens.add({
      targets: this.announceText,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  /**
   * Get wave data for a given round.
   * R1-R20 use predefined data, R21+ use auto-scaling.
   * @param {number} round - Round number
   * @returns {{ enemies: object[], spawnInterval: number, bossRound?: boolean, bossDelay?: number }}
   * @private
   */
  _getWaveData(round) {
    if (round >= 1 && round <= 20 && WAVE_DEFINITIONS[round]) {
      return this._expandWaveDefinition(round, WAVE_DEFINITIONS[round]);
    }
    return this._generateScaledWave(round);
  }

  /**
   * Expand a predefined wave definition into individual enemy objects.
   * @param {number} round - Round number
   * @param {object} def - Wave definition
   * @returns {object} Expanded wave data
   * @private
   */
  _expandWaveDefinition(round, def) {
    const enemies = [];
    for (const group of def.enemies) {
      const baseStats = ENEMY_STATS[group.type];
      for (let i = 0; i < group.count; i++) {
        enemies.push({
          type: group.type,
          hp: baseStats.hp,
          speed: baseStats.speed,
          gold: baseStats.gold,
        });
      }
    }
    return {
      enemies,
      spawnInterval: def.spawnInterval,
      bossRound: def.bossRound || false,
      bossDelay: def.bossDelay || 0,
    };
  }

  /**
   * Generate a scaled wave for R21+.
   * Includes swarm, splitter, and armored enemy types.
   * @param {number} round - Round number
   * @returns {object} Generated wave data
   * @private
   */
  _generateScaledWave(round) {
    const baseCount = SCALING.BASE_COUNT_ADD + Math.floor(round * SCALING.COUNT_PER_ROUND);
    const hpScale = 1 + (round - 1) * SCALING.HP_SCALE_PER_ROUND;
    const speedScale = 1 + (round - 1) * SCALING.SPEED_SCALE_PER_ROUND;
    const goldScale = 1 + (round - 1) * SCALING.GOLD_SCALE_PER_ROUND;
    const spawnInterval = Math.max(
      SCALING.MIN_SPAWN_INTERVAL,
      SCALING.SPAWN_INTERVAL_BASE - round * SCALING.SPAWN_INTERVAL_REDUCTION
    );

    const enemies = [];
    const isBossRound = (round % 10 === 0);

    if (isBossRound) {
      // Phase 5: Boss resistance scaling (R20+ gains +0.05 per 10 rounds, cap 0.5)
      const extraResistance = Math.min(
        0.5,
        Math.floor(Math.max(0, round - 20) / 10) * SCALING.BOSS_RESISTANCE_SCALE
      );

      if (round >= SCALING.ARMORED_CHANCE_START) {
        // Use armored boss for R20+
        enemies.push({
          type: 'boss_armored',
          hp: Math.floor(ENEMY_STATS.boss_armored.hp * hpScale * SCALING.BOSS_HP_MULTIPLIER),
          speed: ENEMY_STATS.boss_armored.speed * speedScale * SCALING.BOSS_SPEED_BONUS,
          gold: Math.floor(ENEMY_STATS.boss_armored.gold * goldScale * 1.5),
          resistance: Math.min(SCALING.RESISTANCE_CAP, ENEMY_STATS.boss_armored.resistance + extraResistance),
        });
      } else {
        enemies.push({
          type: 'boss',
          hp: Math.floor(ENEMY_STATS.boss.hp * hpScale * SCALING.BOSS_HP_MULTIPLIER),
          speed: ENEMY_STATS.boss.speed * speedScale * SCALING.BOSS_SPEED_BONUS,
          gold: Math.floor(ENEMY_STATS.boss.gold * goldScale * 1.5),
        });
      }
    }

    for (let i = 0; i < baseCount; i++) {
      const type = this._pickEnemyType(round);
      const baseStats = ENEMY_STATS[type];
      const entry = {
        type,
        hp: Math.floor(baseStats.hp * hpScale),
        speed: baseStats.speed * speedScale,
        gold: Math.floor(baseStats.gold * goldScale),
      };
      // Preserve resistance for armored enemies
      if (baseStats.resistance) {
        entry.resistance = baseStats.resistance;
      }
      enemies.push(entry);
    }

    return {
      enemies,
      spawnInterval,
      bossRound: isBossRound,
      bossDelay: isBossRound ? 3.0 : 0,
    };
  }

  /**
   * Pick a random enemy type based on round number and probability weights.
   * @param {number} round - Current round number
   * @returns {string} Enemy type
   * @private
   */
  _pickEnemyType(round) {
    const roll = Math.random();
    const hasSwarm = round >= SCALING.SWARM_CHANCE_START;
    const hasSplitter = round >= SCALING.SPLITTER_CHANCE_START;
    const hasArmored = round >= SCALING.ARMORED_CHANCE_START;

    const swarmChance = hasSwarm ? SCALING.SWARM_SPAWN_CHANCE : 0;
    const splitterChance = hasSplitter ? SCALING.SPLITTER_SPAWN_CHANCE : 0;
    const armoredChance = hasArmored ? SCALING.ARMORED_SPAWN_CHANCE : 0;
    const remaining = 1 - swarmChance - splitterChance - armoredChance;

    const normalChance = remaining * 0.50;
    const fastChance = remaining * 0.30;
    // tank = remaining * 0.20

    let cumulative = 0;
    cumulative += swarmChance;
    if (roll < cumulative) return 'swarm';

    cumulative += splitterChance;
    if (roll < cumulative) return 'splitter';

    cumulative += armoredChance;
    if (roll < cumulative) return 'armored';

    cumulative += normalChance;
    if (roll < cumulative) return 'normal';

    cumulative += fastChance;
    if (roll < cumulative) return 'fast';

    return 'tank';
  }

  /**
   * Check if currently in a wave (spawning or waiting for enemies).
   * @returns {boolean}
   */
  isWaveActive() {
    return this.state === WaveState.SPAWNING || this.state === WaveState.WAITING;
  }

  /**
   * Get remaining break time in seconds (for HUD countdown).
   * Returns 0 if not in BREAK state.
   * @returns {number}
   */
  getBreakTimeRemaining() {
    if (this.state === WaveState.BREAK) {
      return Math.max(0, this.stateTimer);
    }
    return 0;
  }

  /**
   * Get a preview of the next wave's enemy types.
   * Returns up to 4 unique enemy types with color info.
   * @returns {{ types: string[], isBoss: boolean }}
   */
  getNextWavePreview() {
    const nextRound = this.currentWave + 1;
    let waveData;
    if (nextRound >= 1 && nextRound <= 20 && WAVE_DEFINITIONS[nextRound]) {
      // Use predefined data
      const def = WAVE_DEFINITIONS[nextRound];
      const types = [...new Set(def.enemies.map(g => g.type))];
      return {
        types: types.slice(0, 4),
        isBoss: def.bossRound || false,
      };
    }
    // R21+: estimate from generation logic
    const isBoss = (nextRound % 10 === 0);
    const types = ['normal', 'fast', 'tank'];
    if (nextRound >= SCALING.SWARM_CHANCE_START) types.push('swarm');
    if (nextRound >= SCALING.SPLITTER_CHANCE_START) types.push('splitter');
    if (nextRound >= SCALING.ARMORED_CHANCE_START) types.push('armored');
    if (isBoss) types.unshift(nextRound >= 20 ? 'boss_armored' : 'boss');
    return {
      types: [...new Set(types)].slice(0, 4),
      isBoss,
    };
  }

  /**
   * Clean up resources.
   */
  destroy() {
    if (this.announceText) {
      this.announceText.destroy();
      this.announceText = null;
    }
  }
}
