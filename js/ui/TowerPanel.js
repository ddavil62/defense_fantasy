/**
 * @fileoverview TowerPanel - Bottom UI panel for tower selection (2-row 5-column layout),
 * info display with A/B branch upgrades, sell actions, and speed toggle.
 */

import {
  GAME_WIDTH, PANEL_Y, PANEL_HEIGHT, COLORS, VISUALS,
  TOWER_STATS, TOWER_SHAPE_SIZE, GOLD_TEXT_CSS, CELL_SIZE,
  SPEED_NORMAL, SPEED_FAST, SPEED_TURBO, LONG_PRESS_MS,
  MAX_ENHANCE_LEVEL,
  isMergeable, getMergeResult, MERGE_RECIPES, pixelToGrid, GRID_COLS, GRID_ROWS, HUD_HEIGHT,
} from '../config.js';
import { t } from '../i18n.js';

export class TowerPanel {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {object} callbacks - Event callbacks
   * @param {Function} callbacks.onTowerSelect - Called when a tower type is selected
   * @param {Function} callbacks.onMerge - Called when merge drag succeeds (towerA, towerB)
   * @param {Function} callbacks.onEnhance - Called when enhance button is pressed
   * @param {Function} callbacks.onSell - Called when sell button is pressed
   * @param {Function} callbacks.onSpeedToggle - Called when speed button is pressed
   * @param {Function} callbacks.onDeselect - Called when selection is cleared
   * @param {string[]} [callbacks.unlockedTowers] - Array of unlocked tower type keys
   */
  constructor(scene, callbacks) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** @type {object} */
    this.callbacks = callbacks;

    /** @type {string[]} Unlocked tower types */
    this.unlockedTowers = callbacks.unlockedTowers || [];

    /** @type {string|null} Currently selected tower type for placement */
    this.selectedTowerType = null;

    /** @type {object|null} Currently selected placed tower */
    this.selectedTower = null;

    /** @type {number} Current game speed */
    this.gameSpeed = SPEED_NORMAL;

    /** @type {Phaser.GameObjects.Container} Main container */
    this.container = scene.add.container(0, 0).setDepth(30);

    /** @type {object[]} Tower selection button data */
    this.towerButtons = [];

    /** @type {Phaser.GameObjects.Container|null} Tower info container */
    this.infoContainer = null;

    // ── Drag & Drop state ──
    /** @type {boolean} Whether a drag is in progress */
    this._isDragging = false;

    /** @type {object|null} Tower being dragged */
    this._dragTower = null;

    /** @type {Phaser.GameObjects.Graphics|null} Ghost graphic following pointer */
    this._dragGhost = null;

    // ── Merge preview state ──
    /** @type {{ tower: object, graphics: Phaser.GameObjects.Graphics, tween: Phaser.Tweens.Tween, result: object }[]} */
    this._mergeHighlights = [];

    /** @type {Phaser.GameObjects.Container|null} */
    this._mergePreviewBubble = null;

    /** @type {object|null} */
    this._hoveredMergeTarget = null;

    this._create();
  }

  /**
   * Create the panel UI elements.
   * @private
   */
  _create() {
    // Panel background
    const panelBg = this.scene.add.rectangle(
      GAME_WIDTH / 2, PANEL_Y + PANEL_HEIGHT / 2,
      GAME_WIDTH, PANEL_HEIGHT,
      COLORS.UI_PANEL
    ).setAlpha(0.9);
    this.container.add(panelBg);

    // Top divider line
    const divider = this.scene.add.rectangle(
      GAME_WIDTH / 2, PANEL_Y + 1,
      GAME_WIDTH, 2,
      COLORS.BUTTON_ACTIVE
    ).setAlpha(0.5);
    this.container.add(divider);

    // Tower selection buttons (2 rows x 5 columns)
    this._createTowerButtons();

    // Sell button
    this._createSellButton();

    // Speed toggle button
    this._createSpeedButton();
  }

  /**
   * Create tower selection buttons in 2-row, 5-column layout.
   * Row 1: archer, mage, ice, lightning, flame
   * Row 2: rock, poison, wind, light, dragon (locked)
   * @private
   */
  _createTowerButtons() {
    const topRowTypes = ['archer', 'mage', 'ice', 'lightning', 'flame'];
    const bottomRowTypes = ['rock', 'poison', 'wind', 'light', 'dragon'];
    const btnSize = VISUALS.TOWER_BUTTON_SIZE;
    const spacing = VISUALS.BUTTON_SPACING;
    const startX = 8;
    const topRowY = PANEL_Y + 8;
    const bottomRowY = PANEL_Y + 56;

    // Create top row
    this._createButtonRow(topRowTypes, startX, topRowY, btnSize, spacing);

    // Create bottom row
    this._createButtonRow(bottomRowTypes, startX, bottomRowY, btnSize, spacing);
  }

  /**
   * Create a row of tower buttons.
   * @param {string[]} types - Tower types for this row
   * @param {number} startX - Starting X position
   * @param {number} rowY - Y position for the row
   * @param {number} btnSize - Button size in pixels
   * @param {number} spacing - Spacing between buttons
   * @private
   */
  _createButtonRow(types, startX, rowY, btnSize, spacing) {
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const x = startX + i * (btnSize + spacing) + btnSize / 2;
      const y = rowY + btnSize / 2;
      const stats = TOWER_STATS[type];
      const cost = stats.levels[1].cost;
      const isLocked = TOWER_STATS[type].locked && !this.unlockedTowers.includes(type);

      // Button background
      const bg = this.scene.add.rectangle(x, y, btnSize, btnSize, 0x1a1a2e)
        .setStrokeStyle(2, isLocked ? COLORS.LOCK_ICON : 0x636e72);
      // All buttons interactive (locked too, for long-press description)
      bg.setInteractive({ useHandCursor: !isLocked });
      if (isLocked) {
        bg.setAlpha(0.4);
      }
      this.container.add(bg);

      // Tower icon
      const iconGraphics = this.scene.add.graphics();
      if (isLocked) {
        this._drawLockIcon(iconGraphics, x, y - 4);
      } else {
        this._drawTowerIcon(iconGraphics, type, x, y - 4);
      }
      this.container.add(iconGraphics);

      // Cost text
      const costStr = isLocked ? '????G' : `${cost}G`;
      const costColor = isLocked ? '#636e72' : GOLD_TEXT_CSS;
      const costText = this.scene.add.text(x, y + 14, costStr, {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: costColor,
        align: 'center',
      }).setOrigin(0.5);
      this.container.add(costText);

      // Store button data
      const btnData = {
        type,
        bg,
        costText,
        iconGraphics,
        cost,
        isLocked,
      };
      this.towerButtons.push(btnData);

      // Long-press / short-tap handlers
      bg.on('pointerdown', () => {
        this._startLongPress(type, x, y);
      });
      bg.on('pointerup', () => {
        this._endLongPress(type);
      });
      bg.on('pointerout', () => {
        this._cancelLongPress();
      });
    }
  }

  /**
   * Draw a tower icon on a graphics object.
   * @param {Phaser.GameObjects.Graphics} g - Graphics object
   * @param {string} type - Tower type
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @private
   */
  _drawTowerIcon(g, type, x, y) {
    const color = TOWER_STATS[type].color;
    g.clear();

    switch (type) {
      case 'archer': {
        const s = 14;
        g.fillStyle(color, 1);
        g.fillTriangle(x, y - s / 2, x - s / 2, y + s / 2, x + s / 2, y + s / 2);
        break;
      }
      case 'mage':
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 8);
        break;
      case 'ice': {
        const sz = 6;
        g.fillStyle(color, 1);
        g.fillPoints([
          { x: x, y: y - sz },
          { x: x + sz, y: y },
          { x: x, y: y + sz },
          { x: x - sz, y: y },
        ], true);
        break;
      }
      case 'lightning': {
        g.lineStyle(2, color, 1);
        const w = 5;
        const h = 10;
        g.lineBetween(x - w, y - h, x + w, y - h * 0.2);
        g.lineBetween(x + w, y - h * 0.2, x - w, y + h * 0.2);
        g.lineBetween(x - w, y + h * 0.2, x + w, y + h);
        break;
      }
      case 'flame': {
        g.fillStyle(color, 1);
        g.fillCircle(x, y + 2, 7);
        // Small flames
        g.fillStyle(0xfdcb6e, 0.9);
        const offsets = [-4, 0, 4];
        for (const ox of offsets) {
          g.fillTriangle(x + ox, y - 8, x + ox - 2, y - 3, x + ox + 2, y - 3);
        }
        break;
      }
      case 'rock': {
        const r = 8;
        const points = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillStyle(color, 1);
        g.fillPoints(points, true);
        break;
      }
      case 'poison': {
        const r = 7;
        const points = [];
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillStyle(color, 1);
        g.fillPoints(points, true);
        break;
      }
      case 'wind': {
        g.fillStyle(color, 1);
        g.slice(x, y, 8, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
        g.fillPath();
        g.lineStyle(1.5, color, 0.7);
        for (let i = 0; i < 3; i++) {
          g.lineBetween(x - 4 + i * 4, y + 2, x - 2 + i * 4, y + 7);
        }
        break;
      }
      case 'light': {
        const r = 7;
        const points = [];
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillStyle(color, 1);
        g.fillPoints(points, true);
        break;
      }
    }
  }

  /**
   * Draw a lock icon for the dragon tower button.
   * @param {Phaser.GameObjects.Graphics} g - Graphics object
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @private
   */
  _drawLockIcon(g, x, y) {
    g.clear();
    // Lock body (rectangle)
    g.fillStyle(COLORS.LOCK_ICON, 0.8);
    g.fillRect(x - 7, y - 2, 14, 10);
    // Lock arc (semicircle)
    g.lineStyle(2, COLORS.LOCK_ICON, 0.8);
    g.beginPath();
    g.arc(x, y - 2, 5, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0), false);
    g.strokePath();
    // Keyhole
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(x, y + 2, 2);
  }

  /**
   * Create the sell button.
   * @private
   */
  _createSellButton() {
    const btnSize = VISUALS.ACTION_BUTTON_SIZE;
    const x = GAME_WIDTH - 75;
    const y = PANEL_Y + 28;

    this.sellBg = this.scene.add.rectangle(x, y, btnSize, btnSize, 0xd63031)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.5);
    this.container.add(this.sellBg);

    this.sellText = this.scene.add.text(x, y, 'S', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this.sellText);

    this.sellBg.on('pointerdown', () => {
      if (this.selectedTower && this.callbacks.onSell) {
        this.callbacks.onSell(this.selectedTower);
      }
    });
  }

  /**
   * Create the speed toggle button.
   * @private
   */
  _createSpeedButton() {
    const btnSize = VISUALS.ACTION_BUTTON_SIZE;
    const x = GAME_WIDTH - 38;
    const y = PANEL_Y + 28;

    this.speedBg = this.scene.add.rectangle(x, y, btnSize, btnSize, 0x2d3436)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.speedBg);

    this.speedText = this.scene.add.text(x, y, 'x1', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this.speedText);

    this.speedBg.on('pointerdown', () => {
      // Phase 6: 3-speed cycle: 1x → 2x → 3x → 1x
      if (this.gameSpeed === SPEED_NORMAL) {
        this.gameSpeed = SPEED_FAST;
      } else if (this.gameSpeed === SPEED_FAST) {
        this.gameSpeed = SPEED_TURBO;
      } else {
        this.gameSpeed = SPEED_NORMAL;
      }
      const label = this.gameSpeed === SPEED_NORMAL ? 'x1'
        : this.gameSpeed === SPEED_FAST ? 'x2' : 'x3';
      const color = this.gameSpeed === SPEED_NORMAL ? '#ffffff'
        : this.gameSpeed === SPEED_FAST ? '#fdcb6e' : '#e94560';
      this.speedText.setText(label);
      this.speedText.setColor(color);
      this.speedBg.setFillStyle(
        this.gameSpeed === SPEED_NORMAL ? 0x2d3436 : COLORS.BUTTON_ACTIVE
      );
      if (this.callbacks.onSpeedToggle) {
        this.callbacks.onSpeedToggle(this.gameSpeed);
      }
    });
  }

  // ── Long-press & Description Popup ─────────────────────────────

  /**
   * Start long-press timer for a tower button.
   * @param {string} type - Tower type
   * @param {number} x - Button center X
   * @param {number} y - Button center Y
   * @private
   */
  _startLongPress(type, x, y) {
    this._cancelLongPress(); // cancel any existing timer
    this._lpType = type;
    this._lpFired = false;
    this._lpTimer = this.scene.time.delayedCall(LONG_PRESS_MS, () => {
      this._lpFired = true;
      this._showDescription(type);
    });
  }

  /**
   * End long-press on pointer up. If long-press didn't fire, treat as short tap.
   * @param {string} type - Tower type
   * @private
   */
  _endLongPress(type) {
    if (this._lpTimer) { this._lpTimer.remove(); this._lpTimer = null; }
    if (!this._lpFired) {
      // Short tap → existing tower select behaviour (skip for locked)
      const isLocked = TOWER_STATS[type].locked && !this.unlockedTowers.includes(type);
      if (!isLocked) {
        this._onTowerButtonClick(type);
      }
    }
    // If long-press fired, popup stays open until user taps elsewhere
  }

  /**
   * Cancel long-press when pointer leaves button.
   * @private
   */
  _cancelLongPress() {
    if (this._lpTimer) { this._lpTimer.remove(); this._lpTimer = null; }
  }

  /**
   * Show tower description popup above the panel.
   * @param {string} type - Tower type
   * @private
   */
  _showDescription(type) {
    this._hideDescription(); // remove existing popup

    const towerDef = TOWER_STATS[type];
    const stats = towerDef.levels[1];
    const color = towerDef.color;

    const popupW = 320;
    const popupH = 110;
    const popupX = GAME_WIDTH / 2;
    const popupY = PANEL_Y - popupH / 2 - 8;
    const colorCSS = '#' + color.toString(16).padStart(6, '0');

    // Container for easy cleanup
    this._descContainer = this.scene.add.container(0, 0).setDepth(50);

    // Background + border
    const bg = this.scene.add.rectangle(popupX, popupY, popupW, popupH, 0x0a0e1a, 0.92)
      .setStrokeStyle(2, color);
    this._descContainer.add(bg);

    // Tower name
    const nameText = this.scene.add.text(popupX, popupY - 36, t(`tower.${type}.name`), {
      fontSize: '18px',
      fontFamily: 'Outfit, Arial, sans-serif',
      color: colorCSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this._descContainer.add(nameText);

    // Flavor text
    const flavorText = this.scene.add.text(popupX, popupY - 14, t(`tower.${type}.flavor`), {
      fontSize: '11px',
      fontFamily: 'Outfit, Arial, sans-serif',
      color: '#a0a0a0',
    }).setOrigin(0.5);
    this._descContainer.add(flavorText);

    // Stat line
    const special = stats.slowAmount ? `Slow ${stats.slowAmount * 100}%`
      : stats.splashRadius ? `Splash ${stats.splashRadius}px`
      : stats.chainCount ? `Chain ${stats.chainCount}`
      : stats.burnDamage ? `Burn ${stats.burnDamage}/s`
      : stats.pushbackDistance ? `Push ${stats.pushbackDistance}px`
      : stats.attackType === 'piercing_beam' ? 'Piercing'
      : '-';
    const statLine = `${t('ui.damage')} ${stats.damage}  |  ${t('ui.range')} ${stats.range}  |  ${t('ui.speed')} ${stats.fireRate}s  |  ${t('ui.special')} ${special}`;
    const statText = this.scene.add.text(popupX, popupY + 10, statLine, {
      fontSize: '11px',
      fontFamily: 'Outfit, Arial, sans-serif',
      color: '#e0e0e0',
    }).setOrigin(0.5);
    this._descContainer.add(statText);

    // Cost
    const isLocked = TOWER_STATS[type].locked && !this.unlockedTowers.includes(type);
    const unlockCost = TOWER_STATS[type].unlockCost || 0;
    const costStr = isLocked ? `\uD83D\uDD12 ${unlockCost}\uD83D\uDC8E` : `${stats.cost}G`;
    const costText = this.scene.add.text(popupX, popupY + 32, costStr, {
      fontSize: '13px',
      fontFamily: 'Outfit, Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);
    this._descContainer.add(costText);

    // Close on any tap (next frame to avoid immediate close)
    this.scene.time.delayedCall(50, () => {
      this._descCloseHandler = this.scene.input.once('pointerdown', () => {
        this._hideDescription();
      });
    });
  }

  /**
   * Hide (destroy) the description popup.
   * @private
   */
  _hideDescription() {
    if (this._descContainer) {
      this._descContainer.destroy();
      this._descContainer = null;
    }
  }

  /**
   * Handle tower button click.
   * @param {string} type - Tower type
   * @private
   */
  _onTowerButtonClick(type) {
    if (this.selectedTowerType === type) {
      // Deselect
      this.clearSelection();
      return;
    }

    // Select this tower type
    this.selectedTower = null;
    this.selectedTowerType = type;
    this._updateButtonHighlights();
    this._hideInfo();

    if (this.callbacks.onTowerSelect) {
      this.callbacks.onTowerSelect(type);
    }
  }

  /**
   * Update button visual highlights based on selection state.
   * @private
   */
  _updateButtonHighlights() {
    for (const btn of this.towerButtons) {
      if (btn.isLocked) continue;
      if (btn.type === this.selectedTowerType) {
        btn.bg.setStrokeStyle(3, COLORS.BOSS_BORDER);
      } else {
        btn.bg.setStrokeStyle(2, 0x636e72);
      }
    }
  }

  /**
   * Update tower button affordability based on current gold.
   * @param {number} gold - Current gold amount
   */
  updateAffordability(gold) {
    for (const btn of this.towerButtons) {
      if (btn.isLocked) continue;
      if (gold >= btn.cost) {
        btn.bg.setAlpha(1);
        btn.costText.setColor(GOLD_TEXT_CSS);
      } else {
        btn.bg.setAlpha(0.5);
        btn.costText.setColor('#ff4757');
      }
    }
  }

  /**
   * Show tower info panel for a placed tower.
   * No A/B upgrade buttons — merge system replaces them.
   * @param {object} tower - Tower instance
   */
  showTowerInfo(tower) {
    this.selectedTower = tower;
    this.selectedTowerType = null;
    this._updateButtonHighlights();
    this._hideInfo();

    const info = tower.getInfo();
    const infoY = PANEL_Y + 80;

    this.infoContainer = this.scene.add.container(0, 0).setDepth(31);

    // Info background
    const infoBg = this.scene.add.rectangle(
      GAME_WIDTH / 2,
      infoY + 28,
      GAME_WIDTH,
      72,
      0x16213e
    ).setAlpha(0.92);
    this.infoContainer.add(infoBg);

    // Tower info text
    const rangeInTiles = (info.range / CELL_SIZE).toFixed(1);
    const tierStr = info.tier > 1 ? ` T${info.tier}` : '';
    const enhStr = info.enhanceLevel > 0 ? `+${info.enhanceLevel}` : '';
    const nameStr = `${info.name}${tierStr}${enhStr}`;
    const infoText = this.scene.add.text(
      10, infoY,
      `${nameStr}  ATK:${info.damage}  SPD:${info.fireRate}s  RNG:${rangeInTiles}`,
      {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      }
    );
    this.infoContainer.add(infoText);

    // Merge list and/or enhance button
    let nextY = infoY + 18;
    const hasRecipes = Object.keys(MERGE_RECIPES).length > 0;
    if (hasRecipes && info.isMergeable && info.enhanceLevel === 0) {
      const mergeListHeight = this._buildMergeList(tower, nextY);
      nextY += mergeListHeight;
    }
    if (info.canEnhance) {
      // Enhancement button
      const enhBtn = this.scene.add.rectangle(
        GAME_WIDTH / 2, nextY, 200, 20, 0x8854d0
      ).setInteractive({ useHandCursor: true });
      this.infoContainer.add(enhBtn);

      const enhLabel = t('ui.enhance').replace('{level}', info.enhanceLevel + 1).replace('{cost}', info.enhanceCost);
      const enhText = this.scene.add.text(GAME_WIDTH / 2, nextY,
        `\u2B06 ${enhLabel}`, {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.infoContainer.add(enhText);
      nextY += 18;

      enhBtn.on('pointerdown', () => {
        if (this.callbacks.onEnhance) {
          this.callbacks.onEnhance(tower);
        }
      });
    }
    if (!info.canEnhance && info.enhanceLevel >= MAX_ENHANCE_LEVEL) {
      // Max enhancement reached
      const maxText = this.scene.add.text(GAME_WIDTH / 2, nextY, `\u2B50 ${t('ui.maxEnhance')}`, {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.infoContainer.add(maxText);
    }

    // Sell button
    const sellY = nextY + 4;
    const sellBtn = this.scene.add.rectangle(
      GAME_WIDTH / 2, sellY, 120, 18, 0xd63031
    ).setInteractive({ useHandCursor: true });
    this.infoContainer.add(sellBtn);

    const sellText = this.scene.add.text(GAME_WIDTH / 2, sellY, `Sell ${info.sellPrice}G`, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.infoContainer.add(sellText);

    sellBtn.on('pointerdown', () => {
      if (this.callbacks.onSell) {
        this.callbacks.onSell(tower);
      }
    });

    // Update sell button state
    this.sellBg.setAlpha(1);
  }

  // ── Merge List (Feature A) ───────────────────────────────────────

  /**
   * Build merge recipe list for the selected tower and add to infoContainer.
   * @param {object} tower - Tower instance
   * @param {number} startY - Y position to start rendering
   * @returns {number} Total height used
   * @private
   */
  _buildMergeList(tower, startY) {
    const selfId = tower.mergeId || tower.type;

    // Collect matching recipes
    const matches = [];
    for (const [key, result] of Object.entries(MERGE_RECIPES)) {
      const parts = key.split('+');
      if (parts.includes(selfId)) {
        const partnerType = parts[0] === selfId ? parts[1] : parts[0];
        matches.push({ partnerType, result });
      }
    }

    if (matches.length === 0) return 0;

    // Dynamic MAX_SHOW calculation
    const available = (PANEL_Y + PANEL_HEIGHT) - startY - 30;
    const maxShow = Math.max(3, Math.min(5, Math.floor(available / 12)));

    let usedHeight = 0;

    // Section header
    const header = this.scene.add.text(10, startY, t('ui.mergeList.header'), {
      fontSize: '9px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    });
    this.infoContainer.add(header);
    usedHeight += 13;

    // Display items (up to maxShow)
    const showCount = Math.min(matches.length, maxShow);
    for (let i = 0; i < showCount; i++) {
      const { partnerType, result } = matches[i];
      const partnerName = t(`tower.${partnerType}.name`) || partnerType;
      const resultName = t(`tower.${result.id}.name`) || result.displayName;
      const colorCSS = '#' + result.color.toString(16).padStart(6, '0');
      const itemY = startY + usedHeight;

      const itemText = this.scene.add.text(10, itemY,
        `+${partnerName} \u2192 ${resultName}(T${result.tier})`, {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: colorCSS,
      }).setInteractive({ useHandCursor: true });

      // Tap to flash partner towers on map
      const pt = partnerType; // closure capture
      itemText.on('pointerdown', () => {
        this._flashMergeTargets(pt);
      });

      this.infoContainer.add(itemText);
      usedHeight += 12;
    }

    // Overflow text
    const overflow = matches.length - showCount;
    if (overflow > 0) {
      const moreText = this.scene.add.text(10, startY + usedHeight,
        t('ui.mergeList.more').replace('{n}', overflow), {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: '#636e72',
      });
      this.infoContainer.add(moreText);
      usedHeight += 12;
    }

    return usedHeight;
  }

  /**
   * Flash yellow circles on map towers matching the partner type.
   * @param {string} partnerType - Tower type/mergeId to highlight
   * @private
   */
  _flashMergeTargets(partnerType) {
    const getTowers = this.callbacks.getTowers;
    if (!getTowers) return;

    const towers = getTowers();
    for (const t of towers) {
      const tId = t.mergeId || t.type;
      if (tId === partnerType) {
        const g = this.scene.add.graphics().setDepth(40);
        g.fillStyle(0xffd700, 1);
        g.fillCircle(t.x, t.y, 20);
        this.scene.tweens.add({
          targets: g,
          alpha: { from: 1, to: 0 },
          duration: 300,
          yoyo: true,
          repeat: 2,
          onComplete: () => { g.destroy(); },
        });
      }
    }
  }

  // ── Merge Highlight (Feature B) ─────────────────────────────────

  /**
   * Start merge highlights on all compatible towers when drag begins.
   * @param {object} dragTower - Tower being dragged
   * @private
   */
  _startMergeHighlights(dragTower) {
    this._clearMergeHighlights();

    const getTowers = this.callbacks.getTowers;
    if (!getTowers) return;

    const selfId = dragTower.mergeId || dragTower.type;
    const towers = getTowers();

    for (const target of towers) {
      if (target === dragTower) continue;
      if (!isMergeable(target)) continue;

      const targetId = target.mergeId || target.type;
      const result = getMergeResult(selfId, targetId);
      if (!result) continue;

      const g = this.scene.add.graphics().setDepth(40);
      g.lineStyle(3, 0xffd700, 1);
      g.strokeCircle(target.x, target.y, 22);

      const tween = this.scene.tweens.add({
        targets: g,
        alpha: { from: 1.0, to: 0.5 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });

      this._mergeHighlights.push({ tower: target, graphics: g, tween, result });
    }
  }

  /**
   * Show merge result preview bubble above a tower.
   * @param {object} tower - Target tower
   * @param {object} result - Merge recipe result { id, tier, color, ... }
   * @private
   */
  _showMergePreviewBubble(tower, result) {
    if (this._hoveredMergeTarget === tower) return;
    this._hideMergePreviewBubble();
    this._hoveredMergeTarget = tower;

    const resultName = t(`tower.${result.id}.name`) || result.displayName;
    const colorCSS = '#' + result.color.toString(16).padStart(6, '0');
    const by = Math.max(HUD_HEIGHT + 20, tower.y - 34);

    const container = this.scene.add.container(tower.x, by).setDepth(41);

    // Background rectangle
    const bg = this.scene.add.rectangle(0, 0, 90, 32, 0x0a0e1a, 0.9)
      .setStrokeStyle(2, result.color);
    container.add(bg);

    // Result name text
    const nameText = this.scene.add.text(0, -5, `\u2192 ${resultName}`, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: colorCSS,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(nameText);

    // Tier text
    const tierText = this.scene.add.text(0, 8, `(T${result.tier})`, {
      fontSize: '9px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(tierText);

    this._mergePreviewBubble = container;
  }

  /**
   * Hide the merge preview bubble.
   * @private
   */
  _hideMergePreviewBubble() {
    if (this._mergePreviewBubble) {
      this._mergePreviewBubble.destroy();
      this._mergePreviewBubble = null;
    }
    this._hoveredMergeTarget = null;
  }

  /**
   * Clear all merge highlights.
   * @private
   */
  _clearMergeHighlights() {
    for (const h of this._mergeHighlights) {
      h.tween.stop();
      h.graphics.destroy();
    }
    this._mergeHighlights = [];
  }

  // ── Drag & Drop for Merge ────────────────────────────────────────

  /**
   * Start dragging a tower for merge.
   * Called from GameScene when pointerdown on a map tower.
   * @param {object} tower - Tower instance to drag
   * @param {Phaser.Input.Pointer} pointer - Pointer that started the drag
   */
  startDrag(tower, pointer) {
    // Enhanced towers cannot be dragged
    if (tower.enhanceLevel > 0) return;

    this._isDragging = true;
    this._dragTower = tower;

    // Hide original tower
    tower.graphics.setAlpha(0);

    // Create ghost graphic
    this._dragGhost = this.scene.add.graphics().setDepth(50);
    this._drawDragGhost(pointer.x, pointer.y, tower);

    // Feature B: highlight mergeable towers
    this._startMergeHighlights(tower);
  }

  /**
   * Update drag ghost position.
   * @param {Phaser.Input.Pointer} pointer - Current pointer
   */
  updateDrag(pointer) {
    if (!this._isDragging || !this._dragGhost) return;
    this._dragGhost.clear();
    this._drawDragGhost(pointer.x, pointer.y, this._dragTower);

    // Feature B: show merge preview bubble on hover
    const { col, row } = pixelToGrid(pointer.x, pointer.y);
    const hovered = this._mergeHighlights.find(
      h => h.tower.col === col && h.tower.row === row
    );
    if (hovered) {
      this._showMergePreviewBubble(hovered.tower, hovered.result);
    } else {
      this._hideMergePreviewBubble();
    }
  }

  /**
   * End drag — attempt merge or cancel.
   * @param {Phaser.Input.Pointer} pointer - Pointer at release
   * @param {Function} getTowerAt - Function(col, row) to find tower at grid position
   */
  endDrag(pointer, getTowerAt) {
    if (!this._isDragging) return;

    const towerA = this._dragTower;

    // Clean up ghost
    if (this._dragGhost) {
      this._dragGhost.destroy();
      this._dragGhost = null;
    }

    this._isDragging = false;
    this._dragTower = null;

    // Clean up merge highlights and preview bubble
    this._clearMergeHighlights();
    this._hideMergePreviewBubble();

    // Check if dropped on a valid tower
    const grid = pixelToGrid(pointer.x, pointer.y);
    const { col, row } = grid;

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      const towerB = getTowerAt(col, row);

      if (towerB && towerB !== towerA) {
        // Check if target is mergeable
        if (!isMergeable(towerB)) {
          // Target has enhancement — shake feedback
          towerA.graphics.setAlpha(1);
          this._playShakeTween(towerB);
          return;
        }

        // Check merge recipe
        const idA = towerA.mergeId || towerA.type;
        const idB = towerB.mergeId || towerB.type;
        const result = getMergeResult(idA, idB);

        if (result) {
          // Merge success — call callback
          if (this.callbacks.onMerge) {
            this.callbacks.onMerge(towerA, towerB);
          }
          return;
        } else {
          // No recipe — shake feedback on target
          towerA.graphics.setAlpha(1);
          this._playShakeTween(towerB);
          return;
        }
      }
    }

    // No valid target — restore original tower
    towerA.graphics.setAlpha(1);
  }

  /**
   * Draw a semi-transparent ghost at pointer position.
   * Uses the tower's _getColor() for merged tower support.
   * @param {number} x - Pointer X
   * @param {number} y - Pointer Y
   * @param {object} tower - Tower instance (used to get correct color)
   * @private
   */
  _drawDragGhost(x, y, tower) {
    const color = tower._getColor ? tower._getColor() : TOWER_STATS[tower.type || tower].color;
    this._dragGhost.fillStyle(color, 0.5);
    this._dragGhost.fillCircle(x, y, 14);
    this._dragGhost.lineStyle(2, 0xffffff, 0.5);
    this._dragGhost.strokeCircle(x, y, 14);
  }

  /**
   * Play a horizontal shake tween on a tower (merge fail feedback).
   * @param {object} tower - Tower to shake
   * @private
   */
  _playShakeTween(tower) {
    if (!tower.graphics || !tower.graphics.active) return;
    this.scene.tweens.add({
      targets: tower.graphics,
      x: { from: -4, to: 4 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (tower.graphics && tower.graphics.active) {
          tower.graphics.setPosition(0, 0);
        }
      },
    });
  }

  /**
   * Check if a drag is currently in progress.
   * @returns {boolean}
   */
  isDragging() {
    return this._isDragging;
  }

  /**
   * Hide the tower info panel.
   * @private
   */
  _hideInfo() {
    if (this.infoContainer) {
      this.infoContainer.destroy();
      this.infoContainer = null;
    }
    if (this.sellBg) {
      this.sellBg.setAlpha(0.5);
    }
  }

  /**
   * Clear all selections and hide info.
   */
  clearSelection() {
    this.selectedTowerType = null;
    this.selectedTower = null;
    this._updateButtonHighlights();
    this._hideInfo();

    if (this.callbacks.onDeselect) {
      this.callbacks.onDeselect();
    }
  }

  /**
   * Get the currently selected tower type for placement.
   * @returns {string|null}
   */
  getSelectedTowerType() {
    return this.selectedTowerType;
  }

  /**
   * Get the current game speed setting.
   * @returns {number}
   */
  getGameSpeed() {
    return this.gameSpeed;
  }

  /**
   * Clean up all panel elements.
   */
  destroy() {
    this._hideDescription();
    this._cancelLongPress();
    this._hideInfo();
    if (this._dragGhost) {
      this._dragGhost.destroy();
      this._dragGhost = null;
    }
    this._isDragging = false;
    this._dragTower = null;
    this._clearMergeHighlights();
    this._hideMergePreviewBubble();
    if (this.container) {
      this.container.destroy();
    }
  }
}
