/**
 * @fileoverview MergeCodexScene - Standalone merge codex (tower recipe catalogue).
 * Shows all T1~T5 towers with full recipe disclosure regardless of discovery status.
 * Accessible from both GameScene (pause overlay) and CollectionScene (codex tab).
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS,
  TOWER_STATS, MERGE_RECIPES, MERGED_TOWER_STATS,
  CODEX_TIER_BG, ATTACK_TYPE_COLORS_CSS, BTN_PRIMARY,
} from '../config.js';
import { t } from '../i18n.js';

/** @const {string[]} Tower type order for T1 listing */
const TOWER_ORDER = [
  'archer', 'mage', 'ice', 'lightning',
  'flame', 'rock', 'poison', 'wind',
  'light', 'dragon',
];

// ── Layout Constants ──────────────────────────────────────────
const SUBTAB_Y = 48;
const SUBTAB_H = 28;
const SUBTAB_W = 64;
const SUBTAB_GAP = 4;
const PROGRESS_Y = 82;
const CODEX_GRID_Y = 104;
const CODEX_CARD_W = 62;
const CODEX_CARD_H = 74;
const CODEX_COLS = 5;
const CODEX_CARD_GAP = 6;
const CODEX_GRID_X = (GAME_WIDTH - (CODEX_COLS * CODEX_CARD_W + (CODEX_COLS - 1) * CODEX_CARD_GAP)) / 2;

export class MergeCodexScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MergeCodexScene' });
  }

  /**
   * Initialize scene state.
   * @param {object} data - { fromScene: 'GameScene' | 'CollectionScene' }
   */
  init(data) {
    /** @type {string} Scene that launched this codex */
    this.fromScene = data?.fromScene || 'CollectionScene';

    /** @type {number} Currently active sub-tab tier (1~5), default T2 */
    this.codexTier = 2;

    /** @type {number} Codex scroll offset Y */
    this.codexScrollY = 0;

    /** @type {boolean} Whether user is dragging the codex scroll area */
    this.codexDragging = false;

    /** @type {number} Pointer Y at drag start */
    this.codexDragStartY = 0;

    /** @type {number} Scroll offset at drag start */
    this.codexDragStartScroll = 0;

    /** @type {boolean} Whether a drag has moved enough to count as scroll (vs click) */
    this.codexDragMoved = false;

    /** @type {object|null} Pre-built tier data cache */
    this._tierDataCache = null;

    /** @type {Phaser.GameObjects.Container|null} Scroll container */
    this.codexScrollContainer = null;

    /** @type {Phaser.GameObjects.Container|null} Sub-tab container */
    this._subTabContainer = null;

    /** @type {Phaser.GameObjects.Container|null} Content container */
    this._codexContentContainer = null;

    /** @type {Phaser.GameObjects.Rectangle|null} Mask shape */
    this._maskShape = null;

    /** @type {number} Max scroll value */
    this._codexMaxScroll = 0;

    /** @type {Phaser.GameObjects.Container|null} Active overlay container */
    this.overlay = null;

    /** @type {number} Timestamp when overlay was last closed */
    this._overlayClosedAt = 0;
  }

  /**
   * Create the codex UI.
   */
  create() {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    // Block input briefly to prevent click-through from the previous scene
    this._inputReady = false;

    this._buildTierData();
    this._createTopBar();
    this._buildSubTabs();
    this._buildCodexContent();

    this.time.delayedCall(100, () => { this._inputReady = true; });
  }

  // ── Top Bar ──────────────────────────────────────────────────

  /**
   * Create the top navigation bar with BACK button and title.
   * @private
   */
  _createTopBar() {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH, 48, COLORS.HUD_BG);

    // BACK button
    const backBg = this.add.rectangle(38, 24, 60, 28, 0x000000, 0)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true });

    this.add.text(38, 24, '< BACK', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    backBg.on('pointerdown', () => {
      this._goBack();
    });

    // Title
    this.add.text(180, 24, t('codex.title'), {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  /**
   * Navigate back to the originating scene.
   * @private
   */
  _goBack() {
    if (this.fromScene === 'GameScene') {
      this.scene.stop('MergeCodexScene');
      this.scene.wake('GameScene');
    } else {
      this.scene.start('CollectionScene');
    }
  }

  // ── Tier Data ────────────────────────────────────────────────

  /**
   * Build tier data from TOWER_STATS, MERGE_RECIPES, MERGED_TOWER_STATS.
   * All entries are treated as discovered (full disclosure).
   * @private
   */
  _buildTierData() {
    if (this._tierDataCache) return;

    const data = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    // T1: base 10 towers
    for (const type of TOWER_ORDER) {
      const stats = TOWER_STATS[type];
      const lv1 = stats.levels[1];
      data[1].push({
        id: type,
        displayName: t(`tower.${type}.name`) || stats.displayName,
        color: stats.color,
        attackType: lv1.attackType,
        recipeKey: null,
        tier: 1,
      });
    }

    // T2~T5: from MERGE_RECIPES
    for (const [recipeKey, recipe] of Object.entries(MERGE_RECIPES)) {
      const mergedStats = MERGED_TOWER_STATS[recipe.id];
      const tier = recipe.tier;
      if (tier < 2 || tier > 5) continue;

      data[tier].push({
        id: recipe.id,
        displayName: recipe.displayName,
        color: recipe.color,
        attackType: mergedStats ? mergedStats.attackType : 'unknown',
        recipeKey: recipeKey,
        tier: tier,
      });
    }

    // Sort each tier alphabetically by id for consistent order
    for (let tierNum = 2; tierNum <= 5; tierNum++) {
      data[tierNum].sort((a, b) => a.id.localeCompare(b.id));
    }

    this._tierDataCache = data;
  }

  // ── Sub-Tab Bar ──────────────────────────────────────────────

  /**
   * Build sub-tab bar for T1~T5.
   * @private
   */
  _buildSubTabs() {
    if (this._subTabContainer) {
      this._subTabContainer.destroy();
    }
    this._subTabContainer = this.add.container(0, 0).setDepth(8);

    const totalW = 5 * SUBTAB_W + 4 * SUBTAB_GAP;
    const startX = (GAME_WIDTH - totalW) / 2 + SUBTAB_W / 2;
    const cy = SUBTAB_Y + SUBTAB_H / 2;

    for (let tier = 1; tier <= 5; tier++) {
      const x = startX + (tier - 1) * (SUBTAB_W + SUBTAB_GAP);
      const isActive = tier === this.codexTier;

      const bg = this.add.rectangle(x, cy, SUBTAB_W, SUBTAB_H,
        isActive ? COLORS.UI_PANEL : COLORS.BACKGROUND)
        .setStrokeStyle(1, isActive ? COLORS.DIAMOND : 0x636e72)
        .setInteractive({ useHandCursor: true });
      this._subTabContainer.add(bg);

      const label = this.add.text(x, cy, `T${tier}`, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: isActive ? '#ffffff' : '#636e72',
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);
      this._subTabContainer.add(label);

      bg.on('pointerdown', () => {
        if (!this._inputReady) return;
        if (this.codexTier !== tier) {
          this.codexTier = tier;
          this.codexScrollY = 0;
          this._buildSubTabs();
          this._buildCodexContent();
        }
      });
    }
  }

  // ── Codex Content ────────────────────────────────────────────

  /**
   * Build the codex grid content for the current sub-tab tier.
   * @private
   */
  _buildCodexContent() {
    if (this._codexContentContainer) {
      this._codexContentContainer.destroy();
    }
    this._cleanupCodexDrag();

    const tierData = this._tierDataCache[this.codexTier] || [];
    const totalCount = tierData.length;

    // Content container
    this._codexContentContainer = this.add.container(0, 0).setDepth(6);

    // Progress text
    const progressStr = t('codex.progress')
      .replace('{n}', String(this.codexTier))
      .replace('{total}', String(totalCount));

    const progressText = this.add.text(GAME_WIDTH / 2, PROGRESS_Y + 8, progressStr, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this._codexContentContainer.add(progressText);

    // Scroll mask & container
    const scrollAreaH = GAME_HEIGHT - CODEX_GRID_Y;
    this._maskShape = this.add.rectangle(GAME_WIDTH / 2, CODEX_GRID_Y + scrollAreaH / 2,
      GAME_WIDTH, scrollAreaH, 0x000000).setVisible(false);
    this._codexContentContainer.add(this._maskShape);

    this.codexScrollContainer = this.add.container(0, 0);
    this._codexContentContainer.add(this.codexScrollContainer);

    const mask = this._maskShape.createGeometryMask();
    this.codexScrollContainer.setMask(mask);

    // Compute total content height
    const rows = Math.ceil(tierData.length / CODEX_COLS);
    const totalContentH = rows * (CODEX_CARD_H + CODEX_CARD_GAP);
    this._codexMaxScroll = Math.max(0, totalContentH - scrollAreaH + 10);

    // Build cards
    for (let i = 0; i < tierData.length; i++) {
      const col = i % CODEX_COLS;
      const row = Math.floor(i / CODEX_COLS);
      const x = CODEX_GRID_X + col * (CODEX_CARD_W + CODEX_CARD_GAP);
      const y = CODEX_GRID_Y + row * (CODEX_CARD_H + CODEX_CARD_GAP);
      this._createCodexCard(tierData[i], x, y);
    }

    // Apply initial scroll offset
    this.codexScrollY = 0;
    this._applyCodexScroll();

    // Setup drag-scroll
    this._setupCodexDrag();
  }

  /**
   * Create a single codex card. All cards are shown as discovered (full disclosure).
   * @param {object} entry - Tier data entry
   * @param {number} x - Top-left X
   * @param {number} y - Top-left Y
   * @private
   */
  _createCodexCard(entry, x, y) {
    const cx = x + CODEX_CARD_W / 2;
    const cy = y + CODEX_CARD_H / 2;

    const borderColor = this._getTierBorderColor(entry.tier);
    const cardBgColor = CODEX_TIER_BG[entry.tier] || COLORS.UI_PANEL;
    const bg = this.add.rectangle(cx, cy, CODEX_CARD_W, CODEX_CARD_H, cardBgColor)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });
    this.codexScrollContainer.add(bg);

    // Color circle (radius 14)
    const circleG = this.add.graphics();
    circleG.fillStyle(entry.color, 1);
    circleG.fillCircle(cx, y + 20, 14);
    this.codexScrollContainer.add(circleG);

    // Tower name (truncated)
    const displayName = entry.displayName.length > 6
      ? entry.displayName.substring(0, 5) + '..'
      : entry.displayName;
    const nameText = this.add.text(cx, y + 40, displayName, {
      fontSize: '9px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.codexScrollContainer.add(nameText);

    // attackType badge with type-specific colors
    const badgeStr = this._getAttackTypeBadge(entry.attackType);
    const badgeColor = ATTACK_TYPE_COLORS_CSS[entry.attackType] || '#81ecec';
    const badgeText = this.add.text(cx, y + 54, badgeStr, {
      fontSize: '8px',
      fontFamily: 'Arial, sans-serif',
      color: badgeColor,
      backgroundColor: '#0d1117',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5);
    this.codexScrollContainer.add(badgeText);

    // Tier indicator
    const tierBadge = this.add.text(cx, y + 67, `T${entry.tier}`, {
      fontSize: '8px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);
    this.codexScrollContainer.add(tierBadge);

    bg.on('pointerup', () => {
      if (!this._inputReady) return;
      if (!this.codexDragMoved && Date.now() - this._overlayClosedAt > 200) {
        this._showCodexCardOverlay(entry);
      }
    });
  }

  // ── Card Overlay ─────────────────────────────────────────────

  /**
   * Show an overlay with info for a codex card.
   * All tiers show full recipe information (no hidden recipes).
   * @param {object} entry - The tier data entry
   * @private
   */
  _showCodexCardOverlay(entry) {
    if (this.overlay) this.overlay.destroy();
    this.overlay = this.add.container(0, 0).setDepth(50);

    // Backdrop (darker, near-opaque)
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050510)
      .setAlpha(0.96)
      .setInteractive();
    this.overlay.add(backdrop);
    backdrop.on('pointerdown', () => this._closeOverlay());

    // Panel with gold border
    const panelW = 280;
    const panelH = 200;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, BTN_PRIMARY);
    this.overlay.add(panelBg);

    // Close button
    const closeX = panelX + panelW / 2 - 20;
    const closeY = panelTop + 15;
    const closeBg = this.add.circle(closeX, closeY, 12, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(closeBg);
    const closeText = this.add.text(closeX, closeY, 'X', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(closeText);
    closeBg.on('pointerdown', () => this._closeOverlay());

    if (entry.tier === 1) {
      // T1: basic info with stats
      const nameText = this.add.text(panelX, panelTop + 40, entry.displayName, {
        fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.overlay.add(nameText);

      // Color circle
      const circleG = this.add.graphics();
      circleG.fillStyle(entry.color, 1);
      circleG.fillCircle(panelX, panelTop + 70, 14);
      this.overlay.add(circleG);

      // Attack type (with type-specific color)
      const atkColor1 = ATTACK_TYPE_COLORS_CSS[entry.attackType] || '#b2bec3';
      const atkText = this.add.text(panelX, panelTop + 95, `Type: ${this._getAttackTypeBadge(entry.attackType)}`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: atkColor1,
      }).setOrigin(0.5);
      this.overlay.add(atkText);

      // Basic stats
      const lv1 = TOWER_STATS[entry.id]?.levels?.[1];
      if (lv1) {
        const statsStr = `DMG: ${lv1.damage}  |  SPD: ${lv1.fireRate}s  |  RNG: ${lv1.range}`;
        const statsText = this.add.text(panelX, panelTop + 120, statsStr, {
          fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
        }).setOrigin(0.5);
        this.overlay.add(statsText);
      }

      // Tier badge
      const tierBadge = this.add.text(panelX, panelTop + 145, 'Tier 1', {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
      }).setOrigin(0.5);
      this.overlay.add(tierBadge);

    } else {
      // T2~T5: full recipe disclosure
      const parts = entry.recipeKey ? entry.recipeKey.split('+') : ['?', '?'];
      const matA = this._getDisplayNameById(parts[0]);
      const matB = this._getDisplayNameById(parts[1]);

      // Tower name
      const nameText = this.add.text(panelX, panelTop + 40, entry.displayName, {
        fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.overlay.add(nameText);

      // Recipe
      const recipeStr = `${matA} + ${matB}`;
      const recipeText = this.add.text(panelX, panelTop + 65, recipeStr, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#81ecec',
      }).setOrigin(0.5);
      this.overlay.add(recipeText);

      const arrowText = this.add.text(panelX, panelTop + 85, `\u2192 ${entry.displayName}`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
      }).setOrigin(0.5);
      this.overlay.add(arrowText);

      // Attack type (with type-specific color)
      const atkColor2 = ATTACK_TYPE_COLORS_CSS[entry.attackType] || '#b2bec3';
      const atkText = this.add.text(panelX, panelTop + 110, `Type: ${this._getAttackTypeBadge(entry.attackType)}`, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: atkColor2,
      }).setOrigin(0.5);
      this.overlay.add(atkText);

      // Tier badge
      const tierBadge = this.add.text(panelX, panelTop + 135, `Tier ${entry.tier}`, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
      }).setOrigin(0.5);
      this.overlay.add(tierBadge);
    }
  }

  /**
   * Close the current overlay.
   * @private
   */
  _closeOverlay() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
      this._overlayClosedAt = Date.now();
    }
  }

  // ── Drag Scroll ──────────────────────────────────────────────

  /**
   * Set up pointer-based drag scroll for the codex grid.
   * @private
   */
  _setupCodexDrag() {
    this.input.on('pointerdown', this._onCodexPointerDown, this);
    this.input.on('pointermove', this._onCodexPointerMove, this);
    this.input.on('pointerup', this._onCodexPointerUp, this);
  }

  /**
   * Handle pointer down for codex scroll.
   * @param {Phaser.Input.Pointer} pointer
   * @private
   */
  _onCodexPointerDown(pointer) {
    if (!this._inputReady) return;
    if (pointer.y < CODEX_GRID_Y) return;
    this.codexDragging = true;
    this.codexDragStartY = pointer.y;
    this.codexDragStartScroll = this.codexScrollY;
    this.codexDragMoved = false;
  }

  /**
   * Handle pointer move for codex scroll.
   * @param {Phaser.Input.Pointer} pointer
   * @private
   */
  _onCodexPointerMove(pointer) {
    if (!this.codexDragging) return;
    const dy = pointer.y - this.codexDragStartY;
    if (Math.abs(dy) > 5) {
      this.codexDragMoved = true;
    }
    this.codexScrollY = Phaser.Math.Clamp(
      this.codexDragStartScroll - dy,
      0, this._codexMaxScroll
    );
    this._applyCodexScroll();
  }

  /**
   * Handle pointer up for codex scroll.
   * @private
   */
  _onCodexPointerUp() {
    this.codexDragging = false;
  }

  /**
   * Apply the current codex scroll offset to the scroll container.
   * @private
   */
  _applyCodexScroll() {
    if (this.codexScrollContainer) {
      this.codexScrollContainer.y = -this.codexScrollY;
    }
  }

  /**
   * Clean up drag scroll event listeners.
   * @private
   */
  _cleanupCodexDrag() {
    this.codexDragging = false;
    this.input.off('pointerdown', this._onCodexPointerDown, this);
    this.input.off('pointermove', this._onCodexPointerMove, this);
    this.input.off('pointerup', this._onCodexPointerUp, this);
  }

  // ── Helper Methods ───────────────────────────────────────────

  /**
   * Get the border color for a given tier.
   * @param {number} tier
   * @returns {number} Color hex
   * @private
   */
  _getTierBorderColor(tier) {
    switch (tier) {
      case 1: return 0xb2bec3;
      case 2: return 0xb2bec3;
      case 3: return 0xffd700;
      case 4: return 0xa29bfe;
      case 5: return 0xffd700;
      default: return 0x636e72;
    }
  }

  /**
   * Get a short badge string for an attack type.
   * @param {string} attackType
   * @returns {string}
   * @private
   */
  _getAttackTypeBadge(attackType) {
    const map = {
      'single': 'Single',
      'splash': 'Splash',
      'aoe_instant': 'AoE',
      'chain': 'Chain',
      'piercing_beam': 'Beam',
      'dot_single': 'DoT',
    };
    return map[attackType] || attackType;
  }

  /**
   * Get display name for a tower/merge ID.
   * Looks up TOWER_STATS first, then MERGE_RECIPES values.
   * @param {string} id
   * @returns {string}
   * @private
   */
  _getDisplayNameById(id) {
    // Check base towers - use i18n key for language consistency
    if (TOWER_STATS[id]) return t(`tower.${id}.name`) || TOWER_STATS[id].displayName;

    // Check merged towers (search by recipe id)
    for (const recipe of Object.values(MERGE_RECIPES)) {
      if (recipe.id === id) return recipe.displayName;
    }

    return id;
  }
}
