/**
 * @fileoverview GameScene - Core gameplay scene.
 * Manages the game loop: map rendering, tower placement, enemy spawning,
 * combat (including chain, beam, AoE instant attacks), wave progression,
 * splitter enemy spawning, and game over detection.
 *
 * Phase 5: Added SoundManager integration (SFX/BGM), boss appear sequence,
 * enhanced visual effects (chain glow, beam thickness, aoe ring particles),
 * pause overlay volume controls, HUD mute button.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, GRID_COLS, GRID_ROWS,
  HUD_HEIGHT, PANEL_Y, CELL_SIZE,
  TOWER_STATS, ENEMY_STATS,
  INITIAL_GOLD, BASE_HP, MAX_BASE_HP,
  VISUALS, COLORS,
  pixelToGrid,
  SPEED_NORMAL,
  META_UPGRADE_TREE,
  getMetaBaseHP, getMetaMaxBaseHP,
  getMetaInitialGold, getMetaWaveBonusMultiplier,
  calcHpRecoverCost, HP_RECOVER_AMOUNT,
  CONSUMABLE_ABILITIES,
} from '../config.js';

import { MapManager } from '../managers/MapManager.js';
import { WaveManager } from '../managers/WaveManager.js';
import { GoldManager } from '../managers/GoldManager.js';
import { ProjectilePool } from '../managers/ProjectilePool.js';
import { HUD } from '../ui/HUD.js';
import { TowerPanel } from '../ui/TowerPanel.js';
import { Tower } from '../entities/Tower.js';
import { Enemy } from '../entities/Enemy.js';
import { t } from '../i18n.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * Initialize scene state.
   */
  init() {
    /** @type {Tower[]} */
    this.towers = [];

    /** @type {Enemy[]} */
    this.enemies = [];

    /** @type {Projectile[]} */
    this.projectiles = [];

    /** @type {number} Current base HP (overridden in create with meta upgrades) */
    this.baseHP = BASE_HP;

    /** @type {number} Max base HP (overridden in create with meta upgrades) */
    this.maxBaseHP = MAX_BASE_HP;

    /** @type {number} Game speed multiplier */
    this.gameSpeed = SPEED_NORMAL;

    /** @type {boolean} Game over flag */
    this.isGameOver = false;

    /** @type {number} Total enemies killed */
    this.totalKills = 0;

    /** @type {Phaser.GameObjects.Graphics|null} Damage flash overlay */
    this.damageFlash = null;

    /** @type {object[]} Queue of enemies to spawn from splitter deaths */
    this._splitSpawnQueue = [];

    /** @type {boolean} Pause state flag */
    this.isPaused = false;

    /** @type {number} Saved game speed before pause */
    this.gameSpeed_saved = SPEED_NORMAL;

    /** @type {Phaser.GameObjects.Container|null} Pause overlay container */
    this.pauseOverlay = null;

    /** @type {boolean} Whether boss appear sequence has been triggered for current wave */
    this._bossAppearTriggered = false;

    /** @type {object} Per-game statistics for Phase 6 stats system */
    this.gameStats = {
      towersPlaced: 0,
      towersUpgraded: 0,
      towersSold: 0,
      goldEarned: 0,
      goldSpent: 0,
      damageDealt: 0,
      killsByType: {},
      killsByTower: {},
      bossesKilled: 0,
      baseDamageTaken: 0,
      wavesCleared: 0,
      peakGold: 0,
    };

    /** @type {Phaser.GameObjects.Graphics|null} Range preview for tower placement */
    this.rangePreviewGraphics = null;

    // ── Gold Sink State ──
    /** @type {number} HP recovery use count (affects cost scaling) */
    this.hpRecoverUseCount = 0;

    /** @type {object} Consumable ability state */
    this.consumableState = {
      slowAll: { useCount: 0, cooldownTimer: 0, active: false, remainingDuration: 0 },
      goldRain: { useCount: 0, cooldownTimer: 0, active: false, remainingDuration: 0 },
      lightning: { useCount: 0, cooldownTimer: 0, active: false, remainingDuration: 0 },
    };
  }

  /**
   * Create all game objects and initialize managers.
   */
  create() {
    // Register shutdown handler for cleanup
    this.events.on('shutdown', this._cleanup, this);

    // Load meta upgrades from save data
    const saveData = this.registry.get('saveData');
    /** @type {object} Tower meta upgrade choices */
    this.towerMetaUpgrades = saveData?.towerUpgrades || {};
    /** @type {object} Utility upgrade tiers */
    this.utilityUpgrades = saveData?.utilityUpgrades || {};
    /** @type {boolean} Whether dragon tower is unlocked */
    this.dragonUnlocked = saveData?.dragonUnlocked || false;

    // Phase 5: Get SoundManager reference
    /** @type {import('../managers/SoundManager.js').SoundManager|null} */
    this.soundManager = this.registry.get('soundManager') || null;

    // Apply utility upgrades
    const metaBaseHP = getMetaBaseHP(this.utilityUpgrades);
    const metaMaxHP = getMetaMaxBaseHP(this.utilityUpgrades);
    this.baseHP = metaBaseHP;
    this.maxBaseHP = metaMaxHP;

    const metaGold = getMetaInitialGold(this.utilityUpgrades);

    // Initialize managers
    this.mapManager = new MapManager(this);
    this.goldManager = new GoldManager(metaGold);
    this.waveManager = new WaveManager(this);

    // Phase 6: Projectile pool
    this.projectilePool = new ProjectilePool(this, 30);

    // Render map
    this.mapManager.renderMap();

    // Create HUD
    this.hud = new HUD(this);
    this.hud.updateGold(this.goldManager.getGold());
    this.hud.updateHP(this.baseHP, this.maxBaseHP);
    this.hud.updateWave(1);

    // Create Pause button and HUD mute button
    this._createPauseButton();

    // Create tower panel
    this.towerPanel = new TowerPanel(this, {
      onTowerSelect: (type) => this._onTowerTypeSelect(type),
      onUpgrade: (tower, branch) => this._onTowerUpgrade(tower, branch),
      onEnhance: (tower) => this._onTowerEnhance(tower),
      onSell: (tower) => this._onTowerSell(tower),
      onSpeedToggle: (speed) => this._onSpeedToggle(speed),
      onDeselect: () => this._onDeselect(),
      dragonUnlocked: this.dragonUnlocked,
    });
    this.towerPanel.updateAffordability(this.goldManager.getGold());

    // Create gold sink UI elements
    this._createHpRecoverButton();
    this._createConsumableButtons();

    // Damage flash overlay (initially invisible)
    this.damageFlash = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0xff0000
    ).setAlpha(0).setDepth(40);

    // Phase 6: Range preview graphics (reused single object)
    this.rangePreviewGraphics = this.add.graphics();
    this.rangePreviewGraphics.setDepth(5);

    // Input handling
    this.input.on('pointerdown', (pointer) => this._onPointerDown(pointer));
    this.input.on('pointermove', (pointer) => this._onPointerMove(pointer));

    // Phase 5: Start battle BGM
    if (this.soundManager) {
      this.soundManager.playBgm('battle');
    }

    // Start first wave
    this.waveManager.startFirstWave();
  }

  /**
   * Main game loop update.
   * @param {number} time - Total elapsed time in ms
   * @param {number} rawDelta - Frame delta in ms (not speed-adjusted)
   */
  update(time, rawDelta) {
    if (this.isPaused || this.isGameOver) return;

    // Phase 6: Cap delta to avoid huge jumps after tab switch
    const cappedRaw = Math.min(rawDelta, 100);
    const delta = (cappedRaw / 1000) * this.gameSpeed;

    // Update wave manager (spawning)
    this.waveManager.update(
      delta,
      this.enemies,
      (enemyData) => this._spawnEnemy(enemyData),
      (bonusGold) => this._onWaveClear(bonusGold),
      this.baseHP,
      this.maxBaseHP
    );

    // Update towers (targeting and firing)
    this._updateTowers(delta);

    // Update projectiles (movement and hit detection)
    this._updateProjectiles(delta);

    // Update enemies (movement, death/arrival cleanup, gold award)
    this._updateEnemies(delta);

    // Process split spawn queue (after enemy loop to avoid array mutation issues)
    this._processSplitSpawnQueue();

    // Update HUD
    this.hud.updateGold(this.goldManager.getGold());
    this.hud.updateHP(this.baseHP, this.maxBaseHP);
    this.hud.updateWave(this.waveManager.currentWave);
    this.hud.updateBlink(delta);

    // Phase 6: Update wave countdown + preview
    const breakTime = this.waveManager.getBreakTimeRemaining();
    const preview = breakTime > 0 ? this.waveManager.getNextWavePreview() : null;
    this.hud.updateCountdown(breakTime, preview);

    // Update consumable abilities (cooldowns, gold rain duration)
    this._updateConsumables(delta);

    // Update tower panel affordability
    this.towerPanel.updateAffordability(this.goldManager.getGold());

    // Check game over
    if (this.baseHP <= 0) {
      this._gameOver();
    }
  }

  // ── Input Handling ─────────────────────────────────────────────

  /**
   * Handle pointer down events on the game area.
   * @param {Phaser.Input.Pointer} pointer
   * @private
   */
  _onPointerDown(pointer) {
    if (this.isGameOver || this.isPaused) return;

    const { x, y } = pointer;

    // Ignore clicks on UI panel area
    if (y >= PANEL_Y) return;

    // Ignore clicks on HUD area
    if (y < HUD_HEIGHT) return;

    // Convert to grid coordinates
    const grid = pixelToGrid(x, y);
    const { col, row } = grid;

    // Validate grid bounds
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      this.towerPanel.clearSelection();
      return;
    }

    // Check if clicking on an existing tower
    const existingTower = this.mapManager.getTowerAt(col, row);
    if (existingTower) {
      this._selectPlacedTower(existingTower);
      return;
    }

    // If we have a tower type selected for placement
    const selectedType = this.towerPanel.getSelectedTowerType();
    if (selectedType) {
      this._attemptPlaceTower(selectedType, col, row);
      return;
    }

    // Clicking empty space with nothing selected
    this.towerPanel.clearSelection();
    this._deselectAllTowers();
  }

  /**
   * Handle tower type selection from panel.
   * @param {string} type - Tower type
   * @private
   */
  _onTowerTypeSelect(type) {
    this._deselectAllTowers();
    this.mapManager.showBuildableHighlights();
  }

  /**
   * Handle deselection from panel.
   * @private
   */
  _onDeselect() {
    this._deselectAllTowers();
    this.mapManager.clearHighlights();
  }

  /**
   * Select a placed tower to show its info.
   * @param {Tower} tower - The tower to select
   * @private
   */
  _selectPlacedTower(tower) {
    this._deselectAllTowers();
    tower.showRangeCircle();
    this.towerPanel.showTowerInfo(tower);
  }

  /**
   * Deselect all towers (hide range circles).
   * @private
   */
  _deselectAllTowers() {
    for (const tower of this.towers) {
      tower.hideRangeCircle();
    }
  }

  /**
   * Attempt to place a tower at the given grid position.
   * @param {string} type - Tower type
   * @param {number} col - Grid column
   * @param {number} row - Grid row
   * @private
   */
  _attemptPlaceTower(type, col, row) {
    if (!this.mapManager.isBuildable(col, row)) {
      this.mapManager.showInvalidPlacement(col, row);
      return;
    }

    const cost = TOWER_STATS[type].levels[1].cost;
    if (!this.goldManager.canAfford(cost)) {
      this.mapManager.showInvalidPlacement(col, row);
      return;
    }

    this.goldManager.spend(cost);
    this.gameStats.goldSpent += cost;
    const tower = new Tower(this, type, col, row);
    // Apply meta upgrades to tower stats
    this._applyMetaUpgradesToTower(tower);
    this.towers.push(tower);
    this.mapManager.placeTower(col, row, tower);
    this.gameStats.towersPlaced++;

    this.towerPanel.clearSelection();
    this.mapManager.clearHighlights();
    // Clear range preview on placement
    if (this.rangePreviewGraphics) this.rangePreviewGraphics.clear();
  }

  /**
   * Handle tower upgrade with branch selection.
   * @param {Tower} tower - Tower to upgrade
   * @param {string} branch - Branch selection ('a' or 'b')
   * @private
   */
  _onTowerUpgrade(tower, branch) {
    const upgradeCost = tower.getUpgradeCost(branch);
    if (upgradeCost === null) return;
    if (!this.goldManager.canAfford(upgradeCost)) return;

    this.goldManager.spend(upgradeCost);
    this.gameStats.goldSpent += upgradeCost;
    tower.upgrade(branch);
    this.gameStats.towersUpgraded++;

    // Re-apply meta upgrades after level-up (stats were reset)
    this._applyMetaUpgradesToTower(tower);

    // Refresh tower info panel
    this._selectPlacedTower(tower);
  }

  /**
   * Handle tower enhancement (Lv.3+ gold sink).
   * @param {Tower} tower - Tower to enhance
   * @private
   */
  _onTowerEnhance(tower) {
    const cost = tower.getEnhanceCost();
    if (cost === null) return;
    if (!this.goldManager.canAfford(cost)) return;

    this.goldManager.spend(cost);
    this.gameStats.goldSpent += cost;
    tower.enhance();

    // Re-apply meta upgrades are not needed since enhance() modifies stats directly

    // Refresh tower info panel
    this._selectPlacedTower(tower);
  }

  /**
   * Handle tower sell.
   * @param {Tower} tower - Tower to sell
   * @private
   */
  _onTowerSell(tower) {
    const sellPrice = tower.getSellPrice();
    this.goldManager.earn(sellPrice);
    this.gameStats.towersSold++;

    this.mapManager.removeTower(tower.col, tower.row);
    this.towers = this.towers.filter(t => t !== tower);
    tower.destroy();

    this.towerPanel.clearSelection();
    this.mapManager.clearHighlights();
  }

  /**
   * Handle speed toggle.
   * @param {number} speed - New speed multiplier
   * @private
   */
  _onSpeedToggle(speed) {
    this.gameSpeed = speed;
  }

  // ── Entity Updates ─────────────────────────────────────────────

  /**
   * Spawn an enemy based on wave data.
   * @param {object} enemyData - Enemy creation data
   * @private
   */
  _spawnEnemy(enemyData) {
    const path = this.mapManager.getPath();
    const enemy = new Enemy(this, enemyData.type, path, {
      hp: enemyData.hp,
      speed: enemyData.speed,
      gold: enemyData.gold,
      resistance: enemyData.resistance,
      damage: enemyData.damage,
    });

    // Set up splitter callback
    if (enemyData.type === 'splitter') {
      enemy.onSplit = (deadEnemy) => this._onSplitterDeath(deadEnemy);
    }

    this.enemies.push(enemy);

    // Phase 5: Boss appear sequence trigger
    if ((enemyData.type === 'boss' || enemyData.type === 'boss_armored') && !this._bossAppearTriggered) {
      this._bossAppearTriggered = true;
      this._playBossAppearSequence();
    }
  }

  /**
   * Spawn a child enemy at a specific position (for splitter death).
   * @param {object} enemyData - Enemy creation data
   * @param {number} x - Spawn X position
   * @param {number} y - Spawn Y position
   * @param {number} waypointIndex - Current waypoint index on path
   * @private
   */
  _spawnChildEnemy(enemyData, x, y, waypointIndex) {
    const path = this.mapManager.getPath();
    const enemy = new Enemy(this, enemyData.type, path, {
      hp: enemyData.hp,
      speed: enemyData.speed,
      gold: enemyData.gold,
    });

    // Place at parent's position
    enemy.x = x;
    enemy.y = y;
    enemy.waypointIndex = waypointIndex;

    // Calculate accurate pathProgress including sub-waypoint interpolation
    if (waypointIndex < path.length - 1) {
      const wp1 = path[waypointIndex];
      const wp2 = path[waypointIndex + 1];
      const segDx = wp2.x - wp1.x;
      const segDy = wp2.y - wp1.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
      const toDx = x - wp1.x;
      const toDy = y - wp1.y;
      const toLen = Math.sqrt(toDx * toDx + toDy * toDy);
      const fraction = segLen > 0 ? Math.min(1, toLen / segLen) : 0;
      enemy.pathProgress = (waypointIndex + fraction) / (path.length - 1);
    } else {
      enemy.pathProgress = waypointIndex / (path.length - 1);
    }

    this.enemies.push(enemy);
  }

  /**
   * Handle splitter enemy death by queuing child spawns.
   * @param {Enemy} deadEnemy - The dead splitter enemy
   * @private
   */
  _onSplitterDeath(deadEnemy) {
    const splitCount = ENEMY_STATS.splitter.splitCount || 3;
    for (let i = 0; i < splitCount; i++) {
      this._splitSpawnQueue.push({
        type: 'swarm',
        hp: ENEMY_STATS.swarm.hp,
        speed: ENEMY_STATS.swarm.speed,
        gold: 0, // Spawned swarms give no gold
        x: deadEnemy.x,
        y: deadEnemy.y,
        waypointIndex: deadEnemy.waypointIndex,
      });
    }
  }

  /**
   * Process queued split spawns (called after enemy update loop).
   * @private
   */
  _processSplitSpawnQueue() {
    for (const spawnData of this._splitSpawnQueue) {
      this._spawnChildEnemy(
        { type: spawnData.type, hp: spawnData.hp, speed: spawnData.speed, gold: spawnData.gold },
        spawnData.x,
        spawnData.y,
        spawnData.waypointIndex
      );
    }
    this._splitSpawnQueue = [];
  }

  /**
   * Update all enemies.
   * @param {number} delta - Frame delta in seconds (speed-adjusted)
   * @private
   */
  _updateEnemies(delta) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta);

      if (enemy.reachedBase) {
        this.baseHP -= enemy.damage;
        this.gameStats.baseDamageTaken += enemy.damage;
        if (this.baseHP < 0) this.baseHP = 0;

        this._playDamageFlash();

        // Phase 5: SFX base hit
        if (this.soundManager) {
          this.soundManager.playSfx('sfx_base_hit', {
            hpRatio: this.baseHP / this.maxBaseHP,
          });
        }

        enemy.destroy();
        this.enemies.splice(i, 1);
      } else if (!enemy.alive) {
        // Enemy killed - award gold (2x during Gold Rain)
        const goldMultiplier = this.consumableState.goldRain.active ? 2 : 1;
        const killGold = enemy.gold * goldMultiplier;
        this.goldManager.earn(killGold);
        this.gameStats.goldEarned += killGold;
        this.totalKills++;
        this.waveManager.totalKills++;

        // Phase 6: Track kills by type
        this.gameStats.killsByType[enemy.type] = (this.gameStats.killsByType[enemy.type] || 0) + 1;
        if (enemy.type === 'boss' || enemy.type === 'boss_armored') {
          this.gameStats.bossesKilled++;
        }

        // Phase 5: SFX kill / kill_boss
        if (this.soundManager) {
          if (enemy.type === 'boss' || enemy.type === 'boss_armored') {
            this.soundManager.playSfx('sfx_kill_boss');
          } else {
            this.soundManager.playSfx('sfx_kill');
          }
        }

        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  /**
   * Update all towers (attack logic).
   * @param {number} delta - Frame delta in seconds (speed-adjusted)
   * @private
   */
  _updateTowers(delta) {
    for (const tower of this.towers) {
      tower.update(
        delta,
        this.enemies,
        (towerRef, target) => this._createProjectile(towerRef, target),
        (towerRef, target, enemies) => this._applyAoeInstant(towerRef, target, enemies),
        (towerRef, target, enemies) => this._applyChain(towerRef, target, enemies),
        (towerRef, target, enemies) => this._applyBeam(towerRef, target, enemies)
      );
    }
  }

  /**
   * Create a projectile from a tower towards a target.
   * @param {Tower} tower - Firing tower
   * @param {Enemy} target - Target enemy
   * @private
   */
  _createProjectile(tower, target) {
    const extra = {
      attackType: tower.stats.attackType || 'single',
    };

    // Splash properties
    if (tower.stats.splashRadius) {
      extra.splashRadius = tower.stats.splashRadius;
    }

    // Slow properties
    if (tower.stats.slowAmount) {
      extra.slowAmount = tower.stats.slowAmount;
      extra.slowDuration = tower.stats.slowDuration;
    }

    // Burn DoT properties
    if (tower.stats.burnDamage) {
      extra.burnDamage = tower.stats.burnDamage;
      extra.burnDuration = tower.stats.burnDuration;
    }

    // Armor piercing
    if (tower.stats.armorPiercing) {
      extra.armorPiercing = true;
    }

    // Pushback
    if (tower.stats.pushbackDistance) {
      extra.pushbackDistance = tower.stats.pushbackDistance;
    }

    // Armor reduction (Phase 4)
    if (tower.stats.armorReduction) {
      extra.armorReduction = tower.stats.armorReduction;
      extra.armorReductionDuration = tower.stats.armorReductionDuration;
    }

    // Poison DoT (Phase 4)
    if (tower.stats.poisonDamage) {
      extra.poisonDamage = tower.stats.poisonDamage;
      extra.poisonDuration = tower.stats.poisonDuration;
      extra.maxPoisonStacks = tower.stats.maxPoisonStacks || 1;
    }

    // Phase 6: Use projectile pool instead of new Projectile()
    const projectile = this.projectilePool.acquire(
      tower.type,
      tower.x,
      tower.y,
      target,
      tower.stats.damage,
      tower.stats.projectileSpeed,
      extra
    );
    this.projectiles.push(projectile);

    // Phase 5: SFX fire
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_fire', { towerType: tower.type });
    }
  }

  /**
   * Apply instant AoE attack (ice 2b, flame 2b, poison, wind 2b, light 2b).
   * AoE is centered on the target enemy position to avoid dead zones
   * when range > splashRadius.
   * @param {Tower} tower - The attacking tower
   * @param {Enemy} triggerTarget - The enemy that triggered this attack
   * @param {Enemy[]} enemies - All active enemies
   * @private
   */
  _applyAoeInstant(tower, triggerTarget, enemies) {
    const splashRadius = tower.stats.splashRadius || tower.stats.range;
    const damage = tower.stats.damage;

    // Use the trigger target's position as the AoE center
    // This prevents dead zones when range > splashRadius
    const centerX = triggerTarget.x;
    const centerY = triggerTarget.y;

    // Find enemies within splash radius centered on target position
    let targets = [];
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedBase) continue;
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= splashRadius) {
        targets.push(enemy);
      }
    }

    // Wind 2b: limit to closest N targets
    if (tower.stats.pushbackTargets) {
      targets.sort((a, b) => {
        const dA = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2);
        const dB = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
        return dA - dB;
      });
      targets = targets.slice(0, tower.stats.pushbackTargets);
    }

    for (const enemy of targets) {
      const armorPiercing = tower.stats.armorPiercing || false;
      const wasAlive = enemy.alive;
      enemy.takeDamage(damage, armorPiercing);
      this.gameStats.damageDealt += damage;

      // Phase 6: Track AoE kills by tower
      if (wasAlive && !enemy.alive) {
        this.gameStats.killsByTower[tower.type] =
          (this.gameStats.killsByTower[tower.type] || 0) + 1;
      }

      // Apply slow if defined
      if (tower.stats.slowAmount && enemy.alive) {
        enemy.applySlow(tower.stats.slowAmount, tower.stats.slowDuration);
      }

      // Apply burn DoT if defined
      if (tower.stats.burnDamage && enemy.alive) {
        enemy.applyBurn(tower.stats.burnDamage, tower.stats.burnDuration);
      }

      // Apply poison if defined
      if (tower.stats.poisonDamage && enemy.alive) {
        const maxStacks = tower.stats.maxPoisonStacks || 1;
        enemy.applyPoison(tower.stats.poisonDamage, tower.stats.poisonDuration, maxStacks);
      }

      // Apply armor reduction if defined
      if (tower.stats.armorReduction && enemy.alive) {
        enemy.applyArmorReduction(tower.stats.armorReduction, tower.stats.armorReductionDuration);
      }

      // Apply pushback if defined
      if (tower.stats.pushbackDistance && enemy.alive) {
        enemy.pushBack(tower.stats.pushbackDistance);
      }
    }

    // Visual effect for AoE centered on target position
    this._playAoeEffect(centerX, centerY, splashRadius, tower.type);

    // Phase 5: SFX fire for AoE
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_fire', { towerType: tower.type });
    }
  }

  /**
   * Apply chain lightning attack.
   * @param {Tower} tower - The attacking tower
   * @param {Enemy} firstTarget - First target enemy
   * @param {Enemy[]} enemies - All active enemies
   * @private
   */
  _applyChain(tower, firstTarget, enemies) {
    const chainCount = tower.stats.chainCount || 4;
    const chainDecay = tower.stats.chainDecay || 0.7;
    const chainRadius = tower.stats.chainRadius || 80;
    let currentDamage = tower.stats.damage;
    const armorPiercing = tower.stats.armorPiercing || false;

    const hitEnemies = new Set();
    let currentTarget = firstTarget;
    const chainPoints = [{ x: tower.x, y: tower.y }];

    for (let i = 0; i < chainCount && currentTarget; i++) {
      hitEnemies.add(currentTarget);
      chainPoints.push({ x: currentTarget.x, y: currentTarget.y });

      const wasAlive = currentTarget.alive;
      currentTarget.takeDamage(currentDamage, armorPiercing);
      this.gameStats.damageDealt += currentDamage;

      // Phase 6: Track chain kills by tower
      if (wasAlive && !currentTarget.alive) {
        this.gameStats.killsByTower[tower.type] =
          (this.gameStats.killsByTower[tower.type] || 0) + 1;
      }

      // Apply slow for lightning 2b
      if (tower.stats.slowAmount && currentTarget.alive) {
        currentTarget.applySlow(tower.stats.slowAmount, tower.stats.slowDuration);
      }

      currentDamage *= chainDecay;

      // Find next closest enemy within chain radius
      let nextTarget = null;
      let minDist = Infinity;

      for (const enemy of enemies) {
        if (!enemy.alive || enemy.reachedBase || hitEnemies.has(enemy)) continue;
        const dx = enemy.x - currentTarget.x;
        const dy = enemy.y - currentTarget.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= chainRadius && dist < minDist) {
          minDist = dist;
          nextTarget = enemy;
        }
      }

      currentTarget = nextTarget;
    }

    // Visual: draw chain lines
    this._playChainEffect(chainPoints);

    // Phase 5: SFX fire for chain
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_fire', { towerType: tower.type });
    }
  }

  /**
   * Apply piercing beam attack (light tower).
   * @param {Tower} tower - The attacking tower
   * @param {Enemy} firstTarget - First target for beam direction
   * @param {Enemy[]} enemies - All active enemies
   * @private
   */
  _applyBeam(tower, firstTarget, enemies) {
    // Calculate beam direction
    const dx = firstTarget.x - tower.x;
    const dy = firstTarget.y - tower.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = dx / len;
    const ny = dy / len;

    // Beam extends to max range (600px, essentially map diagonal)
    const beamLength = tower.stats.range;
    const beamEndX = tower.x + nx * beamLength;
    const beamEndY = tower.y + ny * beamLength;
    const hitRadius = 10; // Enemy hit detection radius for beam

    const armorPiercing = tower.stats.armorPiercing || false;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reachedBase) continue;

      // Check distance from enemy to beam line segment
      const dist = this._pointToSegmentDist(
        enemy.x, enemy.y,
        tower.x, tower.y,
        beamEndX, beamEndY
      );

      if (dist <= hitRadius) {
        const wasAlive = enemy.alive;
        enemy.takeDamage(tower.stats.damage, armorPiercing);
        this.gameStats.damageDealt += tower.stats.damage;

        // Phase 6: Track beam kills by tower
        if (wasAlive && !enemy.alive) {
          this.gameStats.killsByTower[tower.type] =
            (this.gameStats.killsByTower[tower.type] || 0) + 1;
        }

        // Apply burn DoT for light 2a / 3aa / 3ab
        if (tower.stats.burnDamage && enemy.alive) {
          enemy.applyBurn(tower.stats.burnDamage, tower.stats.burnDuration);
        }

        // Apply armor reduction for light 3ab
        if (tower.stats.armorReduction && enemy.alive) {
          enemy.applyArmorReduction(tower.stats.armorReduction, tower.stats.armorReductionDuration);
        }
      }
    }

    // Visual: draw beam line
    this._playBeamEffect(tower.x, tower.y, beamEndX, beamEndY);

    // Phase 5: SFX fire for beam
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_fire', { towerType: tower.type });
    }
  }

  /**
   * Calculate distance from a point to a line segment.
   * @param {number} px - Point X
   * @param {number} py - Point Y
   * @param {number} ax - Segment start X
   * @param {number} ay - Segment start Y
   * @param {number} bx - Segment end X
   * @param {number} by - Segment end Y
   * @returns {number} Distance
   * @private
   */
  _pointToSegmentDist(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;

    if (abLenSq === 0) return Math.sqrt(apx * apx + apy * apy);

    let t = (apx * abx + apy * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = ax + t * abx;
    const closestY = ay + t * aby;
    const distX = px - closestX;
    const distY = py - closestY;

    return Math.sqrt(distX * distX + distY * distY);
  }

  /**
   * Update all projectiles.
   * @param {number} delta - Frame delta in seconds (speed-adjusted)
   * @private
   */
  _updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const result = proj.update(delta, this.enemies);

      if (result.hit || !proj.active) {
        // Phase 5: SFX hit on projectile impact
        if (result.hit && this.soundManager) {
          this.soundManager.playSfx('sfx_hit');
        }

        // Phase 6: Track damage and kills for projectile hits
        if (result.hit) {
          this.gameStats.damageDealt += proj.damage;
          if (result.kills && result.kills.length > 0) {
            this.gameStats.killsByTower[proj.towerType] =
              (this.gameStats.killsByTower[proj.towerType] || 0) + result.kills.length;
          }
        }

        // Phase 6: Release to pool instead of destroy
        this.projectilePool.release(proj);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ── Visual Effects ────────────────────────────────────────────

  /**
   * Play red damage flash on screen edges when enemy reaches base.
   * @private
   */
  _playDamageFlash() {
    if (!this.damageFlash) return;
    this.damageFlash.setAlpha(0.3);
    this.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: VISUALS.DAMAGE_FLASH_DURATION,
      ease: 'Power2',
    });
  }

  /**
   * Play AoE visual effect (expanding circle with Phase 5 particle ring).
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Max radius
   * @param {string} towerType - Tower type for color selection
   * @private
   */
  _playAoeEffect(x, y, radius, towerType) {
    const colorMap = {
      ice: COLORS.ICE_TOWER,
      flame: COLORS.BURN_TINT,
      poison: COLORS.POISON_TINT,
      wind: COLORS.PUSHBACK_COLOR,
      light: COLORS.BEAM_COLOR,
    };
    const effectColor = colorMap[towerType] || COLORS.EXPLOSION;
    const effectGraphics = this.add.graphics();
    effectGraphics.setDepth(19);

    let elapsed = 0;
    const duration = VISUALS.DEATH_EFFECT_DURATION;

    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const progress = elapsed / duration;
        const currentRadius = radius * progress;
        const alpha = 0.4 * (1 - progress);
        const rotation = (elapsed / 1000) * 1; // 1 rad/s

        effectGraphics.clear();

        // Original fill circle
        effectGraphics.fillStyle(effectColor, alpha);
        effectGraphics.fillCircle(x, y, currentRadius);

        // Phase 5: Ring stroke with decreasing thickness
        const strokeWidth = 2 * (1 - progress) + 1;
        effectGraphics.lineStyle(strokeWidth, effectColor, alpha * 0.8);
        effectGraphics.strokeCircle(x, y, currentRadius);

        // Phase 5: Inner ring at 50% radius
        const innerRadius = currentRadius * 0.5;
        effectGraphics.fillStyle(effectColor, alpha * 0.5);
        effectGraphics.fillCircle(x, y, innerRadius);
        effectGraphics.lineStyle(1, effectColor, alpha * 0.4);
        effectGraphics.strokeCircle(x, y, innerRadius);

        // Phase 5: 8 particle dots rotating along outer ring edge
        effectGraphics.fillStyle(0xffffff, alpha * 0.9);
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i + rotation;
          const px = x + Math.cos(angle) * currentRadius;
          const py = y + Math.sin(angle) * currentRadius;
          effectGraphics.fillCircle(px, py, 2);
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
   * Play chain lightning visual effect with Phase 5 glow points.
   * @param {{ x: number, y: number }[]} points - Chain points from tower to last target
   * @private
   */
  _playChainEffect(points) {
    if (points.length < 2) return;

    const effectGraphics = this.add.graphics();
    effectGraphics.setDepth(19);

    let elapsed = 0;
    const duration = 200;

    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const alpha = 1 - (elapsed / duration);

        effectGraphics.clear();

        // Phase 5: Thicker chain line (3px instead of 2px)
        effectGraphics.lineStyle(3, COLORS.CHAIN_COLOR, alpha);
        for (let i = 0; i < points.length - 1; i++) {
          effectGraphics.lineBetween(
            points[i].x, points[i].y,
            points[i + 1].x, points[i + 1].y
          );
        }

        // Phase 5: White inner line overlay
        effectGraphics.lineStyle(1, 0xffffff, alpha * 0.5);
        for (let i = 0; i < points.length - 1; i++) {
          effectGraphics.lineBetween(
            points[i].x, points[i].y,
            points[i + 1].x, points[i + 1].y
          );
        }

        // Phase 5: Glow points at each chain node (skip tower origin at index 0)
        for (let i = 1; i < points.length; i++) {
          const p = points[i];
          // Outer glow
          effectGraphics.fillStyle(COLORS.CHAIN_COLOR, alpha * 0.6);
          effectGraphics.fillCircle(p.x, p.y, 8);
          // Inner bright point
          effectGraphics.fillStyle(0xffffff, alpha * 0.9);
          effectGraphics.fillCircle(p.x, p.y, 4);
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
   * Play piercing beam visual effect with Phase 5 thickness variation and hit flash.
   * @param {number} startX - Beam start X
   * @param {number} startY - Beam start Y
   * @param {number} endX - Beam end X
   * @param {number} endY - Beam end Y
   * @private
   */
  _playBeamEffect(startX, startY, endX, endY) {
    const effectGraphics = this.add.graphics();
    effectGraphics.setDepth(19);

    let elapsed = 0;
    const duration = 250;

    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const alpha = 1 - (elapsed / duration);

        // Phase 5: Dynamic beam thickness
        let thickness;
        if (elapsed < 80) {
          thickness = 5;
        } else {
          thickness = 5 - (4 * (elapsed - 80) / (duration - 80));
          if (thickness < 1) thickness = 1;
        }

        effectGraphics.clear();

        // Main beam with dynamic thickness
        effectGraphics.lineStyle(thickness, COLORS.BEAM_COLOR, alpha);
        effectGraphics.lineBetween(startX, startY, endX, endY);

        // Inner bright line
        effectGraphics.lineStyle(1, 0xffffff, alpha * 0.8);
        effectGraphics.lineBetween(startX, startY, endX, endY);

        // Phase 5: Hit point flash at beam end
        const flashScale = Math.max(0, 1 - elapsed / duration);
        effectGraphics.fillStyle(0xffffff, Math.min(1, alpha * 1.2));
        effectGraphics.fillCircle(endX, endY, 8 * flashScale);
        effectGraphics.fillStyle(COLORS.BEAM_COLOR, alpha * 0.7);
        effectGraphics.fillCircle(endX, endY, 16 * flashScale);

        if (elapsed >= duration) {
          timer.remove();
          effectGraphics.destroy();
        }
      },
      loop: true,
    });
  }

  // ── Boss Appear Sequence (Phase 5) ────────────────────────────

  /**
   * Play boss wave entrance sequence: BGM switch, SFX, camera shake, warning text.
   * @private
   */
  _playBossAppearSequence() {
    // Switch BGM to boss
    if (this.soundManager) {
      this.soundManager.playBgm('boss');
      this.soundManager.playSfx('sfx_boss_appear');
    }

    // Camera shake (800ms, intensity 0.01)
    this.cameras.main.shake(800, 0.01, true);

    // Warning text
    this.time.delayedCall(100, () => {
      const warnText = this.add.text(
        GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60,
        '\u26A0 BOSS WAVE \u26A0',
        {
          fontSize: '26px',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold',
          color: '#ff4757',
          stroke: '#000000',
          strokeThickness: 5,
        }
      ).setOrigin(0.5).setDepth(55).setAlpha(0).setScale(0.5);

      // Pop-in animation
      this.tweens.add({
        targets: warnText,
        alpha: 1,
        scale: 1.0,
        duration: 200,
        ease: 'Back.Out',
      });

      // Blink effect
      const blinkTimer = this.time.addEvent({
        delay: 250,
        callback: () => {
          if (warnText && warnText.active) {
            warnText.alpha = warnText.alpha > 0.5 ? 0.2 : 1.0;
          }
        },
        loop: true,
      });

      // Fade out and destroy at t=2.0s
      this.time.delayedCall(1900, () => {
        blinkTimer.remove();
        if (warnText && warnText.active) {
          this.tweens.add({
            targets: warnText,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              if (warnText && warnText.active) {
                warnText.destroy();
              }
            },
          });
        }
      });
    });
  }

  // ── Wave Events ────────────────────────────────────────────────

  /**
   * Handle wave clear event.
   * @param {number} bonusGold - Bonus gold to award
   * @returns {number} Actual awarded gold
   * @private
   */
  _onWaveClear(bonusGold) {
    // Apply wave bonus multiplier from utility upgrades
    const multiplier = getMetaWaveBonusMultiplier(this.utilityUpgrades);
    const adjustedBonus = Math.floor(bonusGold * multiplier);
    this.goldManager.earn(adjustedBonus);
    this.gameStats.goldEarned += adjustedBonus;
    this.gameStats.wavesCleared++;
    // Track peak gold
    const currentGold = this.goldManager.getGold();
    if (currentGold > this.gameStats.peakGold) {
      this.gameStats.peakGold = currentGold;
    }

    // Phase 5: SFX wave clear
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_wave_clear', {
        bossRound: this.waveManager.isBossRound,
      });
    }

    // Phase 5: Boss round clear - switch BGM back to battle, reset flag
    if (this.waveManager.isBossRound) {
      if (this.soundManager) {
        this.soundManager.playBgm('battle');
      }
      this.waveManager.isBossRound = false;
    }
    this._bossAppearTriggered = false;

    return adjustedBonus;
  }

  // ── Game Over ──────────────────────────────────────────────────

  /**
   * Trigger game over sequence.
   * @private
   */
  _gameOver() {
    this.isGameOver = true;

    // Phase 5: SFX game over + stop BGM
    if (this.soundManager) {
      this.soundManager.playSfx('sfx_game_over');
      this.soundManager.stopBgm(true);
    }

    const finalRound = this.waveManager.currentWave;
    const finalKills = this.totalKills;

    this.waveManager.destroy();

    this.time.delayedCall(500, () => {
      this.scene.start('GameOverScene', {
        round: finalRound,
        kills: finalKills,
        gameStats: { ...this.gameStats },
      });
    });
  }

  /**
   * Apply permanent meta upgrades from save data to a tower's stats.
   * Called after tower placement and after in-game level upgrade.
   * @param {Tower} tower - Tower instance to apply bonuses to
   * @private
   */
  _applyMetaUpgradesToTower(tower) {
    const upgrades = this.towerMetaUpgrades[tower.type];
    if (!upgrades) return;

    for (let tier = 1; tier <= 3; tier++) {
      const choice = upgrades[`tier${tier}`];
      if (!choice) continue;

      const treeData = META_UPGRADE_TREE[tower.type];
      if (!treeData) continue;

      const bonus = treeData[`tier${tier}`][choice];
      if (!bonus || !bonus.effects) continue;

      for (const effect of bonus.effects) {
        if (tower.stats[effect.stat] === undefined) continue;

        if (effect.type === 'multiply') {
          tower.stats[effect.stat] *= effect.value;
          if (['damage', 'range', 'splashRadius', 'chainRadius',
               'pushbackDistance', 'chainCount'].includes(effect.stat)) {
            tower.stats[effect.stat] = Math.round(tower.stats[effect.stat]);
          }
        } else if (effect.type === 'add') {
          tower.stats[effect.stat] += effect.value;
        }
      }
    }

    // Store meta reference for potential future use
    tower._metaUpgrades = this.towerMetaUpgrades;
  }

  // ── Pause System ─────────────────────────────────────────────

  /**
   * Create the Pause button and HUD mute button.
   * @private
   */
  _createPauseButton() {
    // Pause button
    this.pauseBtn = this.add.rectangle(310, 20, 28, 24, 0x636e72)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .setDepth(25);

    this.pauseBtnText = this.add.text(310, 20, '||', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(25);

    this.pauseBtn.on('pointerdown', () => {
      if (!this.isPaused && !this.isGameOver) {
        this._pauseGame();
      }
    });

    // Phase 5: HUD mute button (next to pause button)
    const sm = this.soundManager;
    const isMuted = sm ? sm.muted : false;

    this.muteBtn = this.add.rectangle(278, 20, 24, 22, 0x636e72)
      .setStrokeStyle(2, isMuted ? 0xb2bec3 : 0x55efc4)
      .setInteractive({ useHandCursor: true })
      .setDepth(25);

    this.muteBtnText = this.add.text(278, 20, isMuted ? 'M' : '\u266A', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: isMuted ? '#b2bec3' : '#55efc4',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(25);

    this.muteBtn.on('pointerdown', () => {
      if (!sm) return;
      sm.setMuted(!sm.muted);
      this._updateMuteButton();
    });
  }

  /**
   * Update the HUD mute button visual state.
   * @private
   */
  _updateMuteButton() {
    const sm = this.soundManager;
    if (!sm || !this.muteBtn) return;
    const isMuted = sm.muted;
    this.muteBtn.setStrokeStyle(2, isMuted ? 0xb2bec3 : 0x55efc4);
    if (this.muteBtnText) {
      this.muteBtnText.setText(isMuted ? 'M' : '\u266A');
      this.muteBtnText.setColor(isMuted ? '#b2bec3' : '#55efc4');
    }
  }

  /**
   * Pause the game and show overlay.
   * @private
   */
  _pauseGame() {
    this.isPaused = true;
    this.gameSpeed_saved = this.gameSpeed;
    this._showPauseOverlay();
  }

  /**
   * Resume the game and hide overlay.
   * @private
   */
  _resumeGame() {
    this.isPaused = false;
    this.gameSpeed = this.gameSpeed_saved;
    this._hidePauseOverlay();
    // Update HUD mute button in case it changed
    this._updateMuteButton();
  }

  /**
   * Return to main menu from pause.
   * @private
   */
  _returnToMainMenu() {
    this.isPaused = false;
    this._hidePauseOverlay();

    // Phase 5: Stop current BGM before switching scenes
    if (this.soundManager) {
      this.soundManager.stopBgm(false);
    }

    this.scene.start('MenuScene');
  }

  /**
   * Show the pause overlay with Resume, Main Menu, and volume controls.
   * @private
   */
  _showPauseOverlay() {
    this.pauseOverlay = this.add.container(0, 0).setDepth(50);

    // Full screen semi-transparent background
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000
    ).setAlpha(0.7).setInteractive();
    this.pauseOverlay.add(overlay);

    // Panel (expanded for Phase 5 volume controls)
    const panel = this.add.rectangle(
      180, 300, 220, 220, 0x0f3460
    ).setDepth(51);
    this.pauseOverlay.add(panel);

    // "PAUSED" text
    const pausedText = this.add.text(180, 220, 'PAUSED', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(pausedText);

    // Resume button
    const resumeBtn = this.add.rectangle(
      180, 252, 180, 30, 0x00b894
    ).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(resumeBtn);

    const resumeText = this.add.text(180, 252, 'Resume', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(resumeText);

    resumeBtn.on('pointerdown', () => {
      this._resumeGame();
    });

    // Main Menu button
    const menuBtn = this.add.rectangle(
      180, 290, 180, 30, 0xe94560
    ).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(menuBtn);

    const menuText = this.add.text(180, 290, 'Main Menu', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(menuText);

    menuBtn.on('pointerdown', () => {
      this._returnToMainMenu();
    });

    // Phase 5: Volume controls
    const sm = this.soundManager;
    if (sm) {
      this._createVolumeControls(sm);
    }
  }

  /**
   * Create SFX/BGM volume controls in the pause overlay.
   * @param {import('../managers/SoundManager.js').SoundManager} sm - SoundManager instance
   * @private
   */
  _createVolumeControls(sm) {
    const baseY = 330;
    const labelStyle = {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    };
    const valueStyle = {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
    };

    // ── SFX row ──
    const sfxLabel = this.add.text(100, baseY, 'SFX', labelStyle).setOrigin(0, 0.5).setDepth(52);
    this.pauseOverlay.add(sfxLabel);

    const sfxValText = this.add.text(180, baseY, `${Math.round(sm.sfxVolume * 100)}%`, valueStyle)
      .setOrigin(0.5, 0.5).setDepth(52);
    this.pauseOverlay.add(sfxValText);

    const sfxDown = this.add.rectangle(150, baseY, 24, 20, 0x2d3436)
      .setStrokeStyle(1, 0x636e72).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(sfxDown);
    const sfxDownT = this.add.text(150, baseY, '-', labelStyle).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(sfxDownT);

    const sfxUp = this.add.rectangle(210, baseY, 24, 20, 0x2d3436)
      .setStrokeStyle(1, 0x636e72).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(sfxUp);
    const sfxUpT = this.add.text(210, baseY, '+', labelStyle).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(sfxUpT);

    sfxDown.on('pointerdown', () => {
      sm.setSfxVolume(sm.sfxVolume - 0.1);
      sfxValText.setText(`${Math.round(sm.sfxVolume * 100)}%`);
    });
    sfxUp.on('pointerdown', () => {
      sm.setSfxVolume(sm.sfxVolume + 0.1);
      sfxValText.setText(`${Math.round(sm.sfxVolume * 100)}%`);
    });

    // ── BGM row ──
    const bgmY = baseY + 30;
    const bgmLabel = this.add.text(100, bgmY, 'BGM', labelStyle).setOrigin(0, 0.5).setDepth(52);
    this.pauseOverlay.add(bgmLabel);

    const bgmValText = this.add.text(180, bgmY, `${Math.round(sm.bgmVolume * 100)}%`, valueStyle)
      .setOrigin(0.5, 0.5).setDepth(52);
    this.pauseOverlay.add(bgmValText);

    const bgmDown = this.add.rectangle(150, bgmY, 24, 20, 0x2d3436)
      .setStrokeStyle(1, 0x636e72).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(bgmDown);
    const bgmDownT = this.add.text(150, bgmY, '-', labelStyle).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(bgmDownT);

    const bgmUp = this.add.rectangle(210, bgmY, 24, 20, 0x2d3436)
      .setStrokeStyle(1, 0x636e72).setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(bgmUp);
    const bgmUpT = this.add.text(210, bgmY, '+', labelStyle).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(bgmUpT);

    bgmDown.on('pointerdown', () => {
      sm.setBgmVolume(sm.bgmVolume - 0.1);
      bgmValText.setText(`${Math.round(sm.bgmVolume * 100)}%`);
    });
    bgmUp.on('pointerdown', () => {
      sm.setBgmVolume(sm.bgmVolume + 0.1);
      bgmValText.setText(`${Math.round(sm.bgmVolume * 100)}%`);
    });

    // ── MUTE toggle ──
    const muteY = bgmY + 35;
    const muteBtn = this.add.rectangle(180, muteY, 100, 24, sm.muted ? 0x636e72 : 0x2d3436)
      .setStrokeStyle(1, sm.muted ? 0xe94560 : 0x636e72)
      .setInteractive({ useHandCursor: true }).setDepth(52);
    this.pauseOverlay.add(muteBtn);

    const muteTxt = this.add.text(180, muteY, sm.muted ? 'UNMUTE' : 'MUTE', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(52);
    this.pauseOverlay.add(muteTxt);

    muteBtn.on('pointerdown', () => {
      sm.setMuted(!sm.muted);
      muteTxt.setText(sm.muted ? 'UNMUTE' : 'MUTE');
      muteBtn.setFillStyle(sm.muted ? 0x636e72 : 0x2d3436);
      muteBtn.setStrokeStyle(1, sm.muted ? 0xe94560 : 0x636e72);
    });
  }

  /**
   * Hide and destroy the pause overlay.
   * @private
   */
  _hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
  }

  // ── Gold Sink: HP Recovery ─────────────────────────────────────

  /**
   * Create the HP recovery button in the bottom panel.
   * Positioned at the right side of row 2 (next to Speed button area).
   * @private
   */
  _createHpRecoverButton() {
    const x = GAME_WIDTH - 38;
    const y = PANEL_Y + 68;
    const btnSize = VISUALS.ACTION_BUTTON_SIZE;

    this.hpRecoverBg = this.add.rectangle(x, y, btnSize, btnSize, 0x00b894)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true })
      .setDepth(31);

    this.hpRecoverText = this.add.text(x, y, '+HP', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.hpRecoverCostText = this.add.text(x, y + 14, '', {
      fontSize: '7px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5).setDepth(31);

    this._updateHpRecoverButton();

    this.hpRecoverBg.on('pointerdown', () => {
      this._onHpRecover();
    });
  }

  /**
   * Update HP recover button display (cost, availability).
   * @private
   */
  _updateHpRecoverButton() {
    if (!this.hpRecoverBg) return;
    const cost = calcHpRecoverCost(this.hpRecoverUseCount);
    const isFull = this.baseHP >= this.maxBaseHP;

    if (isFull) {
      this.hpRecoverBg.setAlpha(0.4);
      this.hpRecoverCostText.setText(t('ui.hpRecoverFull'));
      this.hpRecoverCostText.setColor('#636e72');
    } else {
      const canAfford = this.goldManager.canAfford(cost);
      this.hpRecoverBg.setAlpha(canAfford ? 1 : 0.5);
      this.hpRecoverCostText.setText(`${cost}G`);
      this.hpRecoverCostText.setColor(canAfford ? '#ffd700' : '#ff4757');
    }
  }

  /**
   * Handle HP recovery button click.
   * @private
   */
  _onHpRecover() {
    if (this.isGameOver || this.isPaused) return;
    if (this.baseHP >= this.maxBaseHP) return;

    const cost = calcHpRecoverCost(this.hpRecoverUseCount);
    if (!this.goldManager.canAfford(cost)) return;

    this.goldManager.spend(cost);
    this.gameStats.goldSpent += cost;
    this.hpRecoverUseCount++;

    this.baseHP = Math.min(this.baseHP + HP_RECOVER_AMOUNT, this.maxBaseHP);

    // Visual feedback: green flash
    this._playAbilityFlash(0x00b894);
    this._updateHpRecoverButton();
  }

  // ── Gold Sink: Consumable Abilities ──────────────────────────

  /**
   * Create the 3 consumable ability buttons.
   * @private
   */
  _createConsumableButtons() {
    const keys = ['slowAll', 'goldRain', 'lightning'];
    const y = PANEL_Y + 68;  // Same row as HP recover button
    const btnSize = 24;
    const spacing = 26;
    // Position consumables left of HP recover button (x=322)
    const baseX = GAME_WIDTH - 38 - spacing * 3;

    /** @type {object} Button references for each ability */
    this.consumableButtons = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const def = CONSUMABLE_ABILITIES[key];
      const x = baseX + i * spacing;

      const bg = this.add.rectangle(x, y, btnSize, btnSize, def.color)
        .setStrokeStyle(1, 0x636e72)
        .setInteractive({ useHandCursor: true })
        .setDepth(31);

      const iconText = this.add.text(x, y - 2, def.icon, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(31);

      const costText = this.add.text(x, y + 10, '', {
        fontSize: '6px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
      }).setOrigin(0.5).setDepth(31);

      // Cooldown overlay text
      const cdText = this.add.text(x, y, '', {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(32).setAlpha(0);

      this.consumableButtons[key] = { bg, iconText, costText, cdText, x, y };

      bg.on('pointerdown', () => {
        this._useConsumable(key);
      });
    }

    this._updateConsumableButtons();
  }

  /**
   * Update consumable button displays (cost, cooldown).
   * @private
   */
  _updateConsumableButtons() {
    if (!this.consumableButtons) return;

    for (const key of Object.keys(this.consumableButtons)) {
      const btn = this.consumableButtons[key];
      const state = this.consumableState[key];
      const def = CONSUMABLE_ABILITIES[key];
      const cost = def.baseCost + state.useCount * def.costIncrement;
      const onCooldown = state.cooldownTimer > 0;

      if (onCooldown) {
        btn.bg.setAlpha(0.3);
        btn.iconText.setAlpha(0.3);
        btn.costText.setText('');
        btn.cdText.setText(`${Math.ceil(state.cooldownTimer)}`);
        btn.cdText.setAlpha(1);
      } else {
        const canAfford = this.goldManager.canAfford(cost);
        btn.bg.setAlpha(canAfford ? 1 : 0.5);
        btn.iconText.setAlpha(1);
        btn.costText.setText(`${cost}G`);
        btn.costText.setColor(canAfford ? '#ffd700' : '#ff4757');
        btn.cdText.setAlpha(0);
      }

      // Gold rain active indicator
      if (key === 'goldRain' && state.active) {
        btn.bg.setStrokeStyle(2, 0xffd700);
      } else if (key === 'slowAll' && state.active) {
        btn.bg.setStrokeStyle(2, 0x74b9ff);
      } else {
        btn.bg.setStrokeStyle(1, 0x636e72);
      }
    }
  }

  /**
   * Use a consumable ability.
   * @param {string} key - Ability key ('slowAll', 'goldRain', 'lightning')
   * @private
   */
  _useConsumable(key) {
    if (this.isGameOver || this.isPaused) return;

    const state = this.consumableState[key];
    const def = CONSUMABLE_ABILITIES[key];
    if (state.cooldownTimer > 0) return;

    const cost = def.baseCost + state.useCount * def.costIncrement;
    if (!this.goldManager.canAfford(cost)) return;

    // Prevent instant abilities from being wasted when no enemies exist
    // (goldRain is duration-based so it's still useful to pre-activate)
    if (key !== 'goldRain') {
      const hasAliveEnemies = this.enemies.some(e => e.alive && !e.reachedBase);
      if (!hasAliveEnemies) return;
    }

    this.goldManager.spend(cost);
    this.gameStats.goldSpent += cost;
    state.useCount++;
    state.cooldownTimer = def.cooldown;

    // Execute ability
    switch (key) {
      case 'slowAll':
        this._executeSlowAll();
        state.active = true;
        state.remainingDuration = def.duration;
        break;
      case 'goldRain':
        this._executeGoldRain();
        state.active = true;
        state.remainingDuration = def.duration;
        break;
      case 'lightning':
        this._executeLightningStrike();
        break;
    }

    this._updateConsumableButtons();
  }

  /**
   * Execute Slow All ability: 50% slow on all enemies for 5 seconds.
   * @private
   */
  _executeSlowAll() {
    const def = CONSUMABLE_ABILITIES.slowAll;
    for (const enemy of this.enemies) {
      if (enemy.alive && !enemy.reachedBase) {
        enemy.applySlow(def.slowAmount, def.duration);
      }
    }
    this._playAbilityFlash(0x74b9ff);
  }

  /**
   * Execute Gold Rain ability: 2x kill gold for 10 seconds.
   * @private
   */
  _executeGoldRain() {
    this._playAbilityFlash(0xffd700);
  }

  /**
   * Execute Lightning Strike ability: 100 damage to all enemies.
   * @private
   */
  _executeLightningStrike() {
    const def = CONSUMABLE_ABILITIES.lightning;
    for (const enemy of this.enemies) {
      if (enemy.alive && !enemy.reachedBase) {
        enemy.takeDamage(def.damage, false);
        this.gameStats.damageDealt += def.damage;
      }
    }
    // Camera shake
    this.cameras.main.shake(400, 0.008, true);
    this._playAbilityFlash(0xfdcb6e);
  }

  /**
   * Play a full-screen flash effect for ability use.
   * @param {number} color - Flash color (hex)
   * @private
   */
  _playAbilityFlash(color) {
    const flash = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      color
    ).setAlpha(0.25).setDepth(40);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Update consumable cooldowns and durations each frame.
   * @param {number} delta - Frame delta in seconds (speed-adjusted)
   * @private
   */
  _updateConsumables(delta) {
    for (const key of Object.keys(this.consumableState)) {
      const state = this.consumableState[key];

      // Update cooldown
      if (state.cooldownTimer > 0) {
        state.cooldownTimer = Math.max(0, state.cooldownTimer - delta);
      }

      // Update active duration
      if (state.active && state.remainingDuration > 0) {
        state.remainingDuration -= delta;
        if (state.remainingDuration <= 0) {
          state.active = false;
          state.remainingDuration = 0;
        }
      }
    }

    this._updateConsumableButtons();
    this._updateHpRecoverButton();
  }

  /**
   * Clean up custom resources on scene shutdown.
   * @private
   */
  _cleanup() {
    for (const tower of this.towers) tower.destroy();
    for (const enemy of this.enemies) enemy.destroy();

    // Phase 6: Destroy pool (handles all projectiles)
    if (this.projectilePool) this.projectilePool.destroy();

    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this._splitSpawnQueue = [];

    this._hidePauseOverlay();

    if (this.rangePreviewGraphics) {
      this.rangePreviewGraphics.destroy();
      this.rangePreviewGraphics = null;
    }

    // Destroy gold sink UI elements
    if (this.hpRecoverBg) { this.hpRecoverBg.destroy(); this.hpRecoverBg = null; }
    if (this.hpRecoverText) { this.hpRecoverText.destroy(); this.hpRecoverText = null; }
    if (this.hpRecoverCostText) { this.hpRecoverCostText.destroy(); this.hpRecoverCostText = null; }
    if (this.consumableButtons) {
      for (const key of Object.keys(this.consumableButtons)) {
        const btn = this.consumableButtons[key];
        if (btn.bg) btn.bg.destroy();
        if (btn.iconText) btn.iconText.destroy();
        if (btn.costText) btn.costText.destroy();
        if (btn.cdText) btn.cdText.destroy();
      }
      this.consumableButtons = null;
    }

    if (this.waveManager) this.waveManager.destroy();

    this.events.off('shutdown', this._cleanup, this);
  }

  /**
   * Handle pointer move for tower range preview.
   * @param {Phaser.Input.Pointer} pointer
   * @private
   */
  _onPointerMove(pointer) {
    if (!this.rangePreviewGraphics) return;
    this.rangePreviewGraphics.clear();

    if (this.isGameOver || this.isPaused) return;

    const selectedType = this.towerPanel.getSelectedTowerType();
    if (!selectedType) return;

    const { x, y } = pointer;
    if (y >= PANEL_Y || y < HUD_HEIGHT) return;

    const grid = pixelToGrid(x, y);
    const { col, row } = grid;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    const canBuild = this.mapManager.isBuildable(col, row);
    const towerData = TOWER_STATS[selectedType];
    if (!towerData) return;

    const range = towerData.levels[1].range;
    const centerX = col * CELL_SIZE + CELL_SIZE / 2;
    const centerY = row * CELL_SIZE + CELL_SIZE / 2 + HUD_HEIGHT;

    if (canBuild) {
      // Green range circle
      this.rangePreviewGraphics.fillStyle(COLORS.RANGE_FILL, 0.1);
      this.rangePreviewGraphics.fillCircle(centerX, centerY, range);
      this.rangePreviewGraphics.lineStyle(1, COLORS.BUILDABLE_HIGHLIGHT, 0.4);
      this.rangePreviewGraphics.strokeCircle(centerX, centerY, range);
    } else {
      // Red X marker
      this.rangePreviewGraphics.lineStyle(2, COLORS.INVALID_PLACEMENT, 0.6);
      this.rangePreviewGraphics.lineBetween(
        centerX - 8, centerY - 8, centerX + 8, centerY + 8
      );
      this.rangePreviewGraphics.lineBetween(
        centerX + 8, centerY - 8, centerX - 8, centerY + 8
      );
    }
  }
}
