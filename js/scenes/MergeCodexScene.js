/**
 * @fileoverview MergeCodexScene - Standalone merge codex (tower recipe catalogue).
 * Shows all T1~T5 towers with full recipe disclosure regardless of discovery status.
 * Accessible from both GameScene (pause overlay) and CollectionScene (codex tab).
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS,
  TOWER_STATS, MERGE_RECIPES, MERGED_TOWER_STATS,
  CODEX_TIER_BG, ATTACK_TYPE_COLORS_CSS, BTN_PRIMARY,
  META_UPGRADE_TREE,
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

    /** @type {object[]} Overlay drill-down history stack */
    this._overlayHistory = [];

    /** @type {object} Meta upgrade choices from save data */
    const saveData = JSON.parse(localStorage.getItem('fantasyDefenceSave') || '{}');
    this._towerMetaUpgrades = saveData.towerUpgrades || {};
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
   * T1 entries show a stat panel; T2+ entries show a node tree.
   * Resets drill-down history on each fresh open.
   * @param {object} entry - The tier data entry
   * @private
   */
  _showCodexCardOverlay(entry) {
    this._overlayHistory = [];
    this._renderOverlay(entry);
  }

  /**
   * Render (or re-render) the overlay for the given entry.
   * Destroys any existing overlay first, then delegates to T1 or tree panel.
   * @param {object} entry - The tier data entry to display
   * @private
   */
  _renderOverlay(entry) {
    if (this.overlay) this.overlay.destroy();
    this.overlay = this.add.container(0, 0).setDepth(50);

    // Backdrop (darker, near-opaque)
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050510)
      .setAlpha(0.96)
      .setInteractive();
    this.overlay.add(backdrop);
    backdrop.on('pointerdown', () => this._handleBack());

    // Compute "used in" recipes for this entry
    const usedInList = this._findUsedInRecipes(entry.id);

    // Panel dimensions — fixed with scrollable "used in" area
    const panelW = 300;
    const hasUsedIn = usedInList.length > 0;
    const usedInViewH = hasUsedIn ? 100 : 0;
    const baseH = entry.tier >= 2 ? 300 : 200;
    const panelH = baseH + usedInViewH;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, BTN_PRIMARY)
      .setInteractive();
    this.overlay.add(panelBg);

    // ── Header row (0~30px from panel top) ──
    if (this._overlayHistory.length > 0) {
      // Back button
      const backBg = this.add.rectangle(panelX - panelW / 2 + 40, panelTop + 15, 60, 24, 0x000000, 0)
        .setStrokeStyle(1, 0x636e72)
        .setInteractive({ useHandCursor: true });
      this.overlay.add(backBg);
      const backLabel = this.add.text(panelX - panelW / 2 + 40, panelTop + 15, '< \ub4a4\ub85c', {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
      }).setOrigin(0.5);
      this.overlay.add(backLabel);
      backBg.on('pointerdown', () => this._handleBack());
    }

    // Close (X) button
    const closeX = panelX + panelW / 2 - 20;
    const closeY = panelTop + 15;
    const closeBg = this.add.circle(closeX, closeY, 12, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(closeBg);
    const closeText = this.add.text(closeX, closeY, 'X', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(closeText);
    closeBg.on('pointerdown', () => this._forceCloseOverlay());

    // Delegate to tier-specific panel
    if (entry.tier === 1) {
      this._renderT1Panel(entry, panelX, panelTop, panelW, usedInList);
    } else {
      this._renderTreePanel(entry, panelX, panelTop, panelW, usedInList);
    }
  }

  /**
   * Render T1 stat panel inside the current overlay.
   * @param {object} entry - T1 tier data entry
   * @param {number} panelX - Panel center X
   * @param {number} panelTop - Panel top Y
   * @param {number} panelW - Panel width
   * @private
   */
  _renderT1Panel(entry, panelX, panelTop, panelW, usedInList) {
    // Tower name
    const nameText = this.add.text(panelX, panelTop + 40, entry.displayName, {
      fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(nameText);

    // Color circle + tier badge inline
    const circleG = this.add.graphics();
    circleG.fillStyle(entry.color, 1);
    circleG.fillCircle(panelX - 30, panelTop + 65, 14);
    this.overlay.add(circleG);

    const tierBadge = this.add.text(panelX + 5, panelTop + 65, 'T1', {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0, 0.5);
    this.overlay.add(tierBadge);

    // Attack type
    const atkColor = ATTACK_TYPE_COLORS_CSS[entry.attackType] || '#b2bec3';
    const atkText = this.add.text(panelX, panelTop + 90, this._getAttackTypeBadge(entry.attackType), {
      fontSize: '11px', fontFamily: 'Arial, sans-serif', color: atkColor,
    }).setOrigin(0.5);
    this.overlay.add(atkText);

    // Basic stats with meta upgrade bonuses applied
    const lv1 = TOWER_STATS[entry.id]?.levels?.[1];
    if (lv1) {
      const stats = { damage: lv1.damage, fireRate: lv1.fireRate, range: lv1.range };
      this._applyMetaUpgradesToStats(entry.id, stats);
      const statsStr = `DMG: ${stats.damage}  |  SPD: ${stats.fireRate}s  |  RNG: ${stats.range}`;
      const statsText = this.add.text(panelX, panelTop + 110, statsStr, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
      }).setOrigin(0.5);
      this.overlay.add(statsText);
    }

    // ── "Used in" section ──
    if (usedInList.length > 0) {
      this._renderUsedInSection(entry, usedInList, panelX, panelTop + 130, panelW);
    }
  }

  /**
   * Apply meta upgrade bonuses to a plain stats object.
   * Mirrors GameScene._applyMetaUpgradesToTower logic but works on plain objects.
   * @param {string} towerType - Tower type id (e.g. 'archer')
   * @param {object} stats - { damage, fireRate, range, ... } — mutated in place
   * @private
   */
  _applyMetaUpgradesToStats(towerType, stats) {
    const upgrades = this._towerMetaUpgrades[towerType];
    if (!upgrades) return;

    const treeData = META_UPGRADE_TREE[towerType];
    if (!treeData) return;

    for (let tier = 1; tier <= 3; tier++) {
      const choice = upgrades[`tier${tier}`];
      if (!choice) continue;

      const bonus = treeData[`tier${tier}`]?.[choice];
      if (!bonus?.effects) continue;

      for (const effect of bonus.effects) {
        if (stats[effect.stat] === undefined) continue;
        if (effect.type === 'multiply') {
          stats[effect.stat] *= effect.value;
          if (['damage', 'range', 'splashRadius', 'chainRadius',
               'pushbackDistance', 'chainCount'].includes(effect.stat)) {
            stats[effect.stat] = Math.round(stats[effect.stat]);
          }
        } else if (effect.type === 'add') {
          stats[effect.stat] += effect.value;
        }
      }
    }
  }

  /**
   * Find all MERGE_RECIPES where this tower is used as a material.
   * @param {string} towerId - Tower id (T1 type or merged tower id)
   * @returns {Array<{resultEntry: object, recipeKey: string}>}
   * @private
   */
  _findUsedInRecipes(towerId) {
    const results = [];
    for (const [recipeKey, recipe] of Object.entries(MERGE_RECIPES)) {
      const parts = recipeKey.split('+');
      if (parts.includes(towerId)) {
        const resultEntry = this._buildEntryById(recipe.id);
        if (resultEntry) results.push({ resultEntry, recipeKey });
      }
    }
    // Sort by tier then name
    results.sort((a, b) => a.resultEntry.tier - b.resultEntry.tier || a.resultEntry.displayName.localeCompare(b.resultEntry.displayName));
    return results;
  }

  /**
   * Render scrollable "used in" list section inside the overlay.
   * @param {object} currentEntry - Current entry (for history push)
   * @param {Array} usedInList - Result of _findUsedInRecipes
   * @param {number} panelX - Panel center X
   * @param {number} startY - Y to start rendering
   * @param {number} panelW - Panel width
   * @private
   */
  _renderUsedInSection(currentEntry, usedInList, panelX, startY, panelW) {
    const viewH = 100;
    const rowH = 22;
    const headerH = 18;
    let y = startY + 6;

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x636e72, 0.5);
    divider.lineBetween(panelX - panelW / 2 + 20, y, panelX + panelW / 2 - 20, y);
    this.overlay.add(divider);
    y += 8;

    // Section header (fixed, outside scroll)
    const header = this.add.text(panelX, y, t('codex.usedIn') || '상위 조합', {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#636e72',
    }).setOrigin(0.5);
    this.overlay.add(header);
    y += headerH;

    // Scroll viewport area
    const scrollTopY = y;
    const scrollH = viewH - headerH - 14;
    const contentH = usedInList.length * rowH;
    const maxScroll = Math.max(0, contentH - scrollH);

    // Scrollable container
    const scrollContainer = this.add.container(0, 0);
    this.overlay.add(scrollContainer);

    // Build items inside scrollContainer (positions relative to world)
    for (let i = 0; i < usedInList.length; i++) {
      const { resultEntry } = usedInList[i];
      const itemY = scrollTopY + i * rowH + rowH / 2;
      const label = `T${resultEntry.tier} ${resultEntry.displayName}`;
      const itemText = this.add.text(panelX, itemY, label, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#dfe6e9',
      }).setOrigin(0.5);
      scrollContainer.add(itemText);

      const hitArea = this.add.rectangle(panelX, itemY, panelW - 40, rowH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      scrollContainer.add(hitArea);

      hitArea.on('pointerover', () => itemText.setColor('#ffd700'));
      hitArea.on('pointerout', () => itemText.setColor('#dfe6e9'));
      hitArea.on('pointerdown', () => {
        if (!this._inputReady) return;
        this._overlayHistory.push(currentEntry);
        this._renderOverlay(resultEntry);
      });
    }

    // Mask to clip scroll area
    const maskShape = this.add.rectangle(panelX, scrollTopY + scrollH / 2, panelW - 10, scrollH, 0x000000)
      .setVisible(false);
    this.overlay.add(maskShape);
    scrollContainer.setMask(maskShape.createGeometryMask());

    // Scroll indicator (show only if content overflows)
    if (maxScroll > 0) {
      const hint = this.add.text(panelX + panelW / 2 - 28, scrollTopY + scrollH - 2, '▼', {
        fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#636e72',
      }).setOrigin(0.5);
      this.overlay.add(hint);
      this._usedInScrollHint = hint;
    }

    // Drag-to-scroll state
    let scrollY = 0;
    let dragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;

    // Invisible drag zone covering the scroll area
    const dragZone = this.add.rectangle(panelX, scrollTopY + scrollH / 2, panelW - 10, scrollH, 0x000000, 0)
      .setInteractive();
    this.overlay.add(dragZone);

    dragZone.on('pointerdown', (pointer) => {
      dragging = true;
      dragStartY = pointer.y;
      dragStartScroll = scrollY;
    });

    this.input.on('pointermove', (pointer) => {
      if (!dragging) return;
      const dy = pointer.y - dragStartY;
      scrollY = Phaser.Math.Clamp(dragStartScroll - dy, 0, maxScroll);
      scrollContainer.y = -scrollY;
      // Update scroll hint
      if (this._usedInScrollHint) {
        this._usedInScrollHint.setVisible(scrollY < maxScroll - 5);
      }
    });

    this.input.on('pointerup', () => { dragging = false; });
  }

  /**
   * Render the node tree panel for T2+ entries.
   * Shows result node (top) connected to two material nodes (bottom left/right).
   * @param {object} entry - T2+ tier data entry
   * @param {number} panelX - Panel center X
   * @param {number} panelTop - Panel top Y
   * @param {number} panelW - Panel width
   * @private
   */
  _renderTreePanel(entry, panelX, panelTop, panelW, usedInList) {
    const parts = entry.recipeKey ? entry.recipeKey.split('+') : [];
    const matAEntry = parts[0] ? this._buildEntryById(parts[0]) : null;
    const matBEntry = parts[1] ? this._buildEntryById(parts[1]) : null;

    // ── Result node (top center) ──
    const resultY = panelTop + 90;
    const resultR = 28;

    const resultCircle = this.add.graphics();
    resultCircle.fillStyle(entry.color, 1);
    resultCircle.fillCircle(panelX, resultY, resultR);
    resultCircle.lineStyle(2, BTN_PRIMARY, 1);
    resultCircle.strokeCircle(panelX, resultY, resultR);
    this.overlay.add(resultCircle);

    const resultName = this.add.text(panelX, panelTop + 128, entry.displayName, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(resultName);

    const resultTier = this.add.text(panelX, panelTop + 144, `T${entry.tier}`, {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0.5);
    this.overlay.add(resultTier);

    // ── Connector lines ──
    const forkY = panelTop + 175;
    const matY = panelTop + 210;
    const matR = 20;
    const matOffsetX = 55;
    const matAX = panelX - matOffsetX;
    const matBX = panelX + matOffsetX;

    const lines = this.add.graphics();
    this._renderConnectorLines(lines, { x: panelX, y: panelTop + 155 }, forkY, { x: matAX, y: matY }, { x: matBX, y: matY });
    this.overlay.add(lines);

    // ── Material nodes ──
    if (matAEntry) this._renderMaterialNode(matAEntry, matAX, matY, matR, panelTop, entry);
    if (matBEntry) this._renderMaterialNode(matBEntry, matBX, matY, matR, panelTop, entry);

    // ── Stats below tree ──
    let nextY = panelTop + 270;
    const mergedStats = MERGED_TOWER_STATS[entry.id];
    if (mergedStats) {
      const divider = this.add.graphics();
      divider.lineStyle(1, 0x636e72, 0.5);
      divider.lineBetween(panelX - panelW / 2 + 20, nextY, panelX + panelW / 2 - 20, nextY);
      this.overlay.add(divider);
      nextY += 14;

      const statsStr = `DMG: ${mergedStats.damage}  |  SPD: ${mergedStats.fireRate}s  |  RNG: ${mergedStats.range}`;
      const statsText = this.add.text(panelX, nextY, statsStr, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
      }).setOrigin(0.5);
      this.overlay.add(statsText);
      nextY += 16;
    }

    // ── "Used in" section ──
    if (usedInList.length > 0) {
      this._renderUsedInSection(entry, usedInList, panelX, nextY, panelW);
    }
  }

  /**
   * Render a single material node (circle + name + tier badge).
   * Clickable: T2+ drills down, T1 shows stat panel.
   * @param {object} matEntry - Material tier data entry
   * @param {number} cx - Node center X
   * @param {number} cy - Node center Y (circle)
   * @param {number} r - Circle radius
   * @param {number} panelTop - Panel top Y for text placement
   * @param {object} currentEntry - The current result entry (for history push)
   * @private
   */
  _renderMaterialNode(matEntry, cx, cy, r, panelTop, currentEntry) {
    const circle = this.add.graphics();
    circle.fillStyle(matEntry.color, 1);
    circle.fillCircle(cx, cy, r);
    // Clickable indicator: gold border for T2+, subtle border for T1
    const borderColor = matEntry.tier >= 2 ? BTN_PRIMARY : 0x636e72;
    circle.lineStyle(2, borderColor, 1);
    circle.strokeCircle(cx, cy, r);
    this.overlay.add(circle);

    // Truncate name for material nodes (smaller space)
    const displayName = matEntry.displayName.length > 6
      ? matEntry.displayName.substring(0, 5) + '..'
      : matEntry.displayName;
    const nameText = this.add.text(cx, panelTop + 238, displayName, {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    this.overlay.add(nameText);

    const tierBadge = this.add.text(cx, panelTop + 252, `T${matEntry.tier}`, {
      fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
    }).setOrigin(0.5);
    this.overlay.add(tierBadge);

    // Interactive hit area (invisible rectangle over the node area)
    const hitArea = this.add.rectangle(cx, cy + 10, r * 2 + 10, 70, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(hitArea);

    hitArea.on('pointerdown', () => {
      if (!this._inputReady) return;
      // Push current entry to history, then navigate to material
      this._overlayHistory.push(currentEntry);
      this._renderOverlay(matEntry);
    });
  }

  /**
   * Render Y-shaped connector lines from result node down to two material nodes.
   * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
   * @param {object} resultPos - { x, y } bottom of result node
   * @param {number} forkY - Y coordinate of the fork point
   * @param {object} matAPos - { x, y } top of material A node
   * @param {object} matBPos - { x, y } top of material B node
   * @private
   */
  _renderConnectorLines(graphics, resultPos, forkY, matAPos, matBPos) {
    graphics.lineStyle(2, 0x636e72, 0.8);

    // Vertical line from result down to fork point
    graphics.beginPath();
    graphics.moveTo(resultPos.x, resultPos.y);
    graphics.lineTo(resultPos.x, forkY);
    graphics.strokePath();

    // Horizontal line across at fork point
    graphics.beginPath();
    graphics.moveTo(matAPos.x, forkY);
    graphics.lineTo(matBPos.x, forkY);
    graphics.strokePath();

    // Vertical line down to material A
    graphics.beginPath();
    graphics.moveTo(matAPos.x, forkY);
    graphics.lineTo(matAPos.x, matAPos.y - 20);
    graphics.strokePath();

    // Vertical line down to material B
    graphics.beginPath();
    graphics.moveTo(matBPos.x, forkY);
    graphics.lineTo(matBPos.x, matBPos.y - 20);
    graphics.strokePath();
  }

  /**
   * Handle back navigation: pop history or close overlay.
   * @private
   */
  _handleBack() {
    if (this._overlayHistory.length > 0) {
      const prevEntry = this._overlayHistory.pop();
      this._renderOverlay(prevEntry);
    } else {
      this._forceCloseOverlay();
    }
  }

  /**
   * Force-close the overlay completely, ignoring history.
   * @private
   */
  _forceCloseOverlay() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
      this._overlayHistory = [];
      this._overlayClosedAt = Date.now();
    }
  }

  /**
   * Close the current overlay (respects history for back navigation).
   * @private
   */
  _closeOverlay() {
    this._handleBack();
  }

  /**
   * Build a tier data entry object by tower/merge ID.
   * Searches through _tierDataCache across all tiers.
   * @param {string} id - Tower or merged tower ID
   * @returns {object|null} The tier data entry, or null if not found
   * @private
   */
  _buildEntryById(id) {
    if (!this._tierDataCache) return null;
    for (let tier = 1; tier <= 5; tier++) {
      const entries = this._tierDataCache[tier];
      if (!entries) continue;
      for (const entry of entries) {
        if (entry.id === id) return entry;
      }
    }
    return null;
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

}
