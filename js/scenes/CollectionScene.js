/**
 * @fileoverview CollectionScene - Tower meta-upgrade collection mode.
 * Two-tab layout: (1) Meta Upgrades, (2) Merge Codex (T1~T5 tower catalogue).
 * Provides detail overlay views for purchasing permanent upgrades with Diamond currency,
 * and displays discovered/undiscovered merge towers with recipe hints.
 */

import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, SAVE_KEY,
  TOWER_STATS, META_UPGRADE_TREE, UTILITY_UPGRADES,
  MERGE_RECIPES, MERGED_TOWER_STATS,
} from '../config.js';
import { t } from '../i18n.js';

/** @const {string[]} Tower type order for the card grid */
const TOWER_ORDER = [
  'archer', 'mage', 'ice', 'lightning',
  'flame', 'rock', 'poison', 'wind',
  'light', 'dragon',
];

/** @const {string[]} Utility upgrade keys in display order */
const UTILITY_ORDER = ['baseHp', 'goldBoost', 'waveBonus'];

// ── Meta Upgrade Tab Constants ──────────────────────────────────
/** @const {number} Tower card width */
const CARD_W = 76;
/** @const {number} Tower card height */
const CARD_H = 90;
/** @const {number} Card grid gap */
const CARD_GAP = 8;
/** @const {number} Grid columns */
const META_GRID_COLS = 4;
/** @const {number} Grid start X */
const META_GRID_X = 16;
/** @const {number} Grid start Y (below tab bar) */
const META_GRID_Y = 96;

/** @const {number} Utility card width */
const UTIL_W = 104;
/** @const {number} Utility card height */
const UTIL_H = 80;

// ── Tab Bar Constants ───────────────────────────────────────────
const TAB_Y = 48;
const TAB_H = 36;
const TAB_W = 165;

// ── Codex Tab Constants ─────────────────────────────────────────
const SUBTAB_Y = 88;
const SUBTAB_H = 28;
const SUBTAB_W = 64;
const SUBTAB_GAP = 4;
const PROGRESS_Y = 122;
const CODEX_GRID_Y = 142;
const CODEX_CARD_W = 62;
const CODEX_CARD_H = 74;
const CODEX_COLS = 5;
const CODEX_CARD_GAP = 6;
const CODEX_GRID_X = (GAME_WIDTH - (CODEX_COLS * CODEX_CARD_W + (CODEX_COLS - 1) * CODEX_CARD_GAP)) / 2;

export class CollectionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CollectionScene' });
  }

  /**
   * Initialize scene state.
   */
  init() {
    /** @type {object} Current save data reference */
    this.saveData = null;

    /** @type {Phaser.GameObjects.Text|null} Diamond display text */
    this.diamondText = null;

    /** @type {Phaser.GameObjects.Container|null} Active overlay container */
    this.overlay = null;

    /** @type {'meta'|'codex'} Currently active main tab */
    this.activeTab = 'meta';

    /** @type {number} Currently active codex sub-tab tier (1~5) */
    this.codexTier = 1;

    /** @type {Phaser.GameObjects.Container|null} Tab content container */
    this.tabContent = null;

    /** @type {Phaser.GameObjects.Container|null} Codex scrollable container */
    this.codexScrollContainer = null;

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
  }

  /**
   * Create the collection UI.
   */
  create() {
    this.saveData = this.registry.get('saveData') || {};

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.BACKGROUND);

    this._createTopBar();
    this._createTabBar();
    this._buildTierData();
    this._showTab(this.activeTab);
  }

  // ── Top Bar ──────────────────────────────────────────────────

  /**
   * Create the top navigation bar with BACK button, title, and Diamond display.
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
      this.scene.start('MenuScene');
    });

    // Title
    this.add.text(180, 24, 'COLLECTION', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Diamond display
    const diamond = this.saveData.diamond || 0;
    this.diamondText = this.add.text(352, 24, `\u25C6 ${diamond}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: COLORS.DIAMOND_CSS,
    }).setOrigin(1, 0.5);
  }

  /**
   * Refresh the Diamond display text.
   * @private
   */
  _refreshDiamondDisplay() {
    if (this.diamondText) {
      this.diamondText.setText(`\u25C6 ${this.saveData.diamond || 0}`);
    }
  }

  // ── Tab Bar ──────────────────────────────────────────────────

  /**
   * Create the main tab bar with "Meta Upgrade" and "Merge Codex" tabs.
   * @private
   */
  _createTabBar() {
    this._tabBarContainer = this.add.container(0, 0).setDepth(10);
    this._renderTabBar();
  }

  /**
   * Render tab bar buttons reflecting current active tab.
   * @private
   */
  _renderTabBar() {
    if (this._tabBarContainer) this._tabBarContainer.removeAll(true);

    const tabCenterY = TAB_Y + TAB_H / 2;
    const leftX = GAME_WIDTH / 2 - TAB_W / 2 - 2;
    const rightX = GAME_WIDTH / 2 + TAB_W / 2 + 2;

    // Meta Upgrade tab
    const metaActive = this.activeTab === 'meta';
    const metaBg = this.add.rectangle(leftX, tabCenterY, TAB_W, TAB_H,
      metaActive ? COLORS.UI_PANEL : COLORS.BACKGROUND);
    this._tabBarContainer.add(metaBg);

    if (metaActive) {
      const accentLine = this.add.rectangle(leftX, TAB_Y + TAB_H - 1, TAB_W, 2, COLORS.DIAMOND);
      this._tabBarContainer.add(accentLine);
    }

    const metaText = this.add.text(leftX, tabCenterY, t('collection.tab.meta'), {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: metaActive ? '#ffffff' : '#636e72',
      fontStyle: metaActive ? 'bold' : 'normal',
    }).setOrigin(0.5);
    this._tabBarContainer.add(metaText);

    metaBg.setInteractive({ useHandCursor: true });
    metaBg.on('pointerdown', () => {
      if (this.activeTab !== 'meta') {
        this.activeTab = 'meta';
        this._renderTabBar();
        this._showTab('meta');
      }
    });

    // Codex tab
    const codexActive = this.activeTab === 'codex';
    const codexBg = this.add.rectangle(rightX, tabCenterY, TAB_W, TAB_H,
      codexActive ? COLORS.UI_PANEL : COLORS.BACKGROUND);
    this._tabBarContainer.add(codexBg);

    if (codexActive) {
      const accentLine = this.add.rectangle(rightX, TAB_Y + TAB_H - 1, TAB_W, 2, COLORS.DIAMOND);
      this._tabBarContainer.add(accentLine);
    }

    const codexText = this.add.text(rightX, tabCenterY, t('collection.tab.codex'), {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: codexActive ? '#ffffff' : '#636e72',
      fontStyle: codexActive ? 'bold' : 'normal',
    }).setOrigin(0.5);
    this._tabBarContainer.add(codexText);

    codexBg.setInteractive({ useHandCursor: true });
    codexBg.on('pointerdown', () => {
      if (this.activeTab !== 'codex') {
        this.activeTab = 'codex';
        this._renderTabBar();
        this._showTab('codex');
      }
    });
  }

  /**
   * Switch tab content.
   * @param {'meta'|'codex'} tab
   * @private
   */
  _showTab(tab) {
    if (this.tabContent) {
      this.tabContent.destroy();
      this.tabContent = null;
    }
    this.codexScrollContainer = null;
    this._cleanupCodexDrag();

    this.tabContent = this.add.container(0, 0).setDepth(5);

    if (tab === 'meta') {
      this._buildMetaTab();
    } else {
      this._buildCodexTab();
    }
  }

  // ══════════════════════════════════════════════════════════════
  // TAB 1: META UPGRADES
  // ══════════════════════════════════════════════════════════════

  /**
   * Build the meta upgrade tab content.
   * @private
   */
  _buildMetaTab() {
    this._createTowerCards();
    this._createUtilitySection();
  }

  // ── Tower Cards ──────────────────────────────────────────────

  /**
   * Create the tower card grid (4-4-2 layout).
   * @private
   */
  _createTowerCards() {
    for (let i = 0; i < TOWER_ORDER.length; i++) {
      const type = TOWER_ORDER[i];
      const col = i % META_GRID_COLS;
      const row = Math.floor(i / META_GRID_COLS);
      const x = META_GRID_X + col * (CARD_W + CARD_GAP);
      const y = META_GRID_Y + row * (CARD_H + CARD_GAP);
      this._createTowerCard(type, x, y);
    }
  }

  /**
   * Create a single tower card.
   * @param {string} type - Tower type key
   * @param {number} x - Top-left X position
   * @param {number} y - Top-left Y position
   * @private
   */
  _createTowerCard(type, x, y) {
    const stats = TOWER_STATS[type];
    const unlockedTowers = this.saveData.unlockedTowers || [];
    const isUnlocked = !stats.locked || unlockedTowers.includes(type);

    const cx = x + CARD_W / 2;
    const cy = y + CARD_H / 2;

    if (!isUnlocked) {
      // Locked tower card
      const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, COLORS.BACKGROUND)
        .setAlpha(0.6)
        .setStrokeStyle(2, 0x636e72)
        .setInteractive({ useHandCursor: true });
      this.tabContent.add(bg);

      // Lock icon
      const lockG = this.add.graphics();
      lockG.fillStyle(0x636e72, 0.8);
      lockG.fillRect(cx - 7, y + 20 - 2, 14, 10);
      lockG.lineStyle(2, 0x636e72, 0.8);
      lockG.beginPath();
      lockG.arc(cx, y + 20 - 2, 5, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0), false);
      lockG.strokePath();
      lockG.fillStyle(COLORS.BACKGROUND, 1);
      lockG.fillCircle(cx, y + 20 + 2, 2);
      this.tabContent.add(lockG);

      // Name
      const nameText = this.add.text(cx, y + 52, stats.displayName, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      this.tabContent.add(nameText);

      // Cost
      const unlockCost = stats.unlockCost || 0;
      const costText = this.add.text(cx, y + 68, `\u25C6${unlockCost}`, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: COLORS.DIAMOND_CSS,
      }).setOrigin(0.5);
      this.tabContent.add(costText);

      bg.on('pointerdown', () => {
        this._showTowerUnlockPopup(type);
      });
    } else {
      // Normal / unlocked tower card
      const borderColor = stats.color;
      const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, COLORS.UI_PANEL)
        .setStrokeStyle(2, borderColor)
        .setInteractive({ useHandCursor: true });
      this.tabContent.add(bg);

      // Tower icon (scaled 0.6x)
      const iconG = this.add.graphics();
      this._drawTowerIcon(iconG, type, cx, y + 20, 0.6);
      this.tabContent.add(iconG);

      // Name
      const nameText = this.add.text(cx, y + 52, stats.displayName, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.tabContent.add(nameText);

      // Current meta tier
      const maxTier = this._getMaxMetaTier(type);
      const tierStr = maxTier > 0 ? `Lv.${maxTier}` : 'Lv.0';
      const tierText = this.add.text(cx, y + 68, tierStr, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
      }).setOrigin(0.5);
      this.tabContent.add(tierText);

      bg.on('pointerdown', () => {
        this._showTowerDetailView(type);
      });
    }
  }

  /**
   * Get the highest completed meta tier for a tower type.
   * @param {string} type - Tower type key
   * @returns {number} Highest tier (0-3)
   * @private
   */
  _getMaxMetaTier(type) {
    const upgrades = this.saveData.towerUpgrades?.[type];
    if (!upgrades) return 0;
    if (upgrades.tier3) return 3;
    if (upgrades.tier2) return 2;
    if (upgrades.tier1) return 1;
    return 0;
  }

  /**
   * Draw a scaled tower icon on a graphics object.
   * @param {Phaser.GameObjects.Graphics} g - Graphics object
   * @param {string} type - Tower type
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} scale - Scale factor
   * @private
   */
  _drawTowerIcon(g, type, x, y, scale) {
    const color = TOWER_STATS[type].color;
    g.clear();

    switch (type) {
      case 'archer': {
        const s = 14 * scale;
        g.fillStyle(color, 1);
        g.fillTriangle(x, y - s / 2, x - s / 2, y + s / 2, x + s / 2, y + s / 2);
        break;
      }
      case 'mage':
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 8 * scale);
        break;
      case 'ice': {
        const sz = 6 * scale;
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
        const w = 5 * scale;
        const h = 10 * scale;
        g.lineStyle(2 * scale, color, 1);
        g.lineBetween(x - w, y - h, x + w, y - h * 0.2);
        g.lineBetween(x + w, y - h * 0.2, x - w, y + h * 0.2);
        g.lineBetween(x - w, y + h * 0.2, x + w, y + h);
        break;
      }
      case 'flame': {
        g.fillStyle(color, 1);
        g.fillCircle(x, y + 2 * scale, 7 * scale);
        g.fillStyle(0xfdcb6e, 0.9);
        const offsets = [-4, 0, 4];
        for (const ox of offsets) {
          g.fillTriangle(
            x + ox * scale, y - 8 * scale,
            x + (ox - 2) * scale, y - 3 * scale,
            x + (ox + 2) * scale, y - 3 * scale
          );
        }
        break;
      }
      case 'rock': {
        const r = 8 * scale;
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
        const r = 7 * scale;
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
        g.slice(x, y, 8 * scale, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
        g.fillPath();
        g.lineStyle(1.5 * scale, color, 0.7);
        for (let i = 0; i < 3; i++) {
          g.lineBetween(
            x + (-4 + i * 4) * scale, y + 2 * scale,
            x + (-2 + i * 4) * scale, y + 7 * scale
          );
        }
        break;
      }
      case 'light': {
        const r = 7 * scale;
        const points = [];
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillStyle(color, 1);
        g.fillPoints(points, true);
        break;
      }
      case 'dragon': {
        const r = 10 * scale;
        g.fillStyle(color, 1);
        g.fillCircle(x, y, r);
        g.lineStyle(2 * scale, 0xffd700, 1);
        g.strokeCircle(x, y, r);
        g.lineStyle(2 * scale, color, 0.8);
        g.lineBetween(x - 8 * scale, y - 6 * scale, x + 8 * scale, y + 6 * scale);
        g.lineBetween(x + 8 * scale, y - 6 * scale, x - 8 * scale, y + 6 * scale);
        break;
      }
    }
  }

  // ── Utility Section ──────────────────────────────────────────

  /**
   * Create the utility upgrade card section with header and cards.
   * @private
   */
  _createUtilitySection() {
    // Section header (adjusted for tab bar offset)
    const headerY = 390;
    const headerText = this.add.text(GAME_WIDTH / 2, headerY, '── UTILITY ──', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#636e72',
    }).setOrigin(0.5);
    this.tabContent.add(headerText);

    // Left/right decorative lines
    const lineL = this.add.rectangle(60, headerY, 80, 1, 0x636e72).setAlpha(0.3);
    const lineR = this.add.rectangle(300, headerY, 80, 1, 0x636e72).setAlpha(0.3);
    this.tabContent.add(lineL);
    this.tabContent.add(lineR);

    // Utility cards
    const utilStartX = 16;
    const utilY = 410;
    for (let i = 0; i < UTILITY_ORDER.length; i++) {
      const key = UTILITY_ORDER[i];
      const x = utilStartX + i * (UTIL_W + CARD_GAP);
      this._createUtilityCard(key, x, utilY);
    }
  }

  /**
   * Create a single utility upgrade card.
   * @param {string} key - Utility upgrade key
   * @param {number} x - Top-left X position
   * @param {number} y - Top-left Y position
   * @private
   */
  _createUtilityCard(key, x, y) {
    const util = UTILITY_UPGRADES[key];
    const tier = this.saveData.utilityUpgrades?.[key] || 0;
    const maxTier = util.tiers.length;

    const cx = x + UTIL_W / 2;
    const cy = y + UTIL_H / 2;

    const borderColor = tier > 0 ? 0xffd700 : 0x636e72;
    const bg = this.add.rectangle(cx, cy, UTIL_W, UTIL_H, COLORS.UI_PANEL)
      .setStrokeStyle(1, borderColor)
      .setInteractive({ useHandCursor: true });
    this.tabContent.add(bg);

    // Icon + name
    const iconG = this.add.graphics();
    this._drawUtilityIcon(iconG, key, x + 18, y + 16);
    this.tabContent.add(iconG);

    const nameText = this.add.text(x + 32, y + 16, util.name, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    this.tabContent.add(nameText);

    // Tier display
    const tierText = this.add.text(cx, y + 40, `Tier ${tier}/${maxTier}`, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
    }).setOrigin(0.5);
    this.tabContent.add(tierText);

    // Current effect text
    let effectStr = '';
    if (tier === 0) {
      effectStr = key === 'baseHp' ? 'HP: 20' : key === 'goldBoost' ? '250G' : '1.0x';
    } else {
      effectStr = util.tiers[tier - 1].desc;
    }
    const effectText = this.add.text(cx, y + 56, effectStr, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.tabContent.add(effectText);

    bg.on('pointerdown', () => {
      this._showUtilityDetailView(key);
    });
  }

  /**
   * Draw a utility icon on a graphics object.
   * @param {Phaser.GameObjects.Graphics} g - Graphics object
   * @param {string} key - Utility key
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @private
   */
  _drawUtilityIcon(g, key, x, y) {
    const util = UTILITY_UPGRADES[key];
    const color = util.iconColor;

    switch (util.icon) {
      case 'heart': {
        g.fillStyle(color, 1);
        g.fillCircle(x - 3, y - 2, 4);
        g.fillCircle(x + 3, y - 2, 4);
        g.fillTriangle(x - 7, y - 1, x + 7, y - 1, x, y + 6);
        break;
      }
      case 'coin': {
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 6);
        g.fillStyle(0x1a1a2e, 1);
        g.fillCircle(x, y, 3);
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 1.5);
        break;
      }
      case 'star': {
        g.fillStyle(color, 1);
        const points = [];
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 2 / 10) * i - Math.PI / 2;
          const r = i % 2 === 0 ? 7 : 3;
          points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
        }
        g.fillPoints(points, true);
        break;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // TAB 2: MERGE CODEX
  // ══════════════════════════════════════════════════════════════

  /**
   * Build tier data from TOWER_STATS, MERGE_RECIPES, MERGED_TOWER_STATS.
   * Creates a cache of { tier -> [{ id, displayName, color, attackType, recipeKey, tier, discovered }] }
   * @private
   */
  _buildTierData() {
    if (this._tierDataCache) return;

    const discovered = new Set(this.saveData.discoveredMerges || []);
    const data = { 1: [], 2: [], 3: [], 4: [], 5: [] };

    // T1: base 10 towers, always discovered
    // Use i18n key for display name to ensure language consistency with T2+ (BUG-3 fix).
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
        discovered: true,
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
        discovered: discovered.has(recipe.id),
      });
    }

    // Sort each tier alphabetically by id for consistent order
    for (let t = 2; t <= 5; t++) {
      data[t].sort((a, b) => a.id.localeCompare(b.id));
    }

    this._tierDataCache = data;
  }

  /**
   * Build the codex tab content with sub-tabs.
   * @private
   */
  _buildCodexTab() {
    this._buildCodexSubTabs();
    this._buildCodexContent();
  }

  /**
   * Build sub-tab bar for codex (T1~T5).
   * @private
   */
  _buildCodexSubTabs() {
    // Remove old sub-tab elements if any
    if (this._subTabContainer) {
      this._subTabContainer.destroy();
    }
    this._subTabContainer = this.add.container(0, 0).setDepth(8);
    this.tabContent.add(this._subTabContainer);

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
        if (this.codexTier !== tier) {
          this.codexTier = tier;
          this.codexScrollY = 0;
          // Rebuild sub-tabs and content
          this._buildCodexSubTabs();
          this._buildCodexContent();
        }
      });
    }
  }

  /**
   * Build the codex grid content for the current sub-tab tier.
   * @private
   */
  _buildCodexContent() {
    // Remove old content
    if (this._codexContentContainer) {
      this._codexContentContainer.destroy();
    }
    this._cleanupCodexDrag();

    const tierData = this._tierDataCache[this.codexTier] || [];
    const discoveredCount = tierData.filter(d => d.discovered).length;
    const totalCount = tierData.length;

    // Progress text
    this._codexContentContainer = this.add.container(0, 0).setDepth(6);
    this.tabContent.add(this._codexContentContainer);

    const progressStr = t('collection.codex.progress')
      .replace('{tier}', `T${this.codexTier}`)
      .replace('{count}', String(discoveredCount))
      .replace('{total}', String(totalCount));

    const progressText = this.add.text(GAME_WIDTH / 2, PROGRESS_Y + 8, progressStr, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this._codexContentContainer.add(progressText);

    // Scroll mask & container
    // Track maskShape as instance variable and add to container to prevent
    // memory leak on sub-tab switching (BUG-2 fix).
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
   * Create a single codex card.
   * @param {object} entry - Tier data entry
   * @param {number} x - Top-left X
   * @param {number} y - Top-left Y
   * @private
   */
  _createCodexCard(entry, x, y) {
    const cx = x + CODEX_CARD_W / 2;
    const cy = y + CODEX_CARD_H / 2;

    if (entry.discovered) {
      // Discovered card
      const borderColor = this._getTierBorderColor(entry.tier);
      const bg = this.add.rectangle(cx, cy, CODEX_CARD_W, CODEX_CARD_H, COLORS.UI_PANEL)
        .setStrokeStyle(2, borderColor)
        .setInteractive({ useHandCursor: true });
      this.codexScrollContainer.add(bg);

      // Color circle
      const circleG = this.add.graphics();
      circleG.fillStyle(entry.color, 1);
      circleG.fillCircle(cx, y + 18, 10);
      this.codexScrollContainer.add(circleG);

      // Tower name (truncated)
      const displayName = entry.displayName.length > 6
        ? entry.displayName.substring(0, 5) + '..'
        : entry.displayName;
      const nameText = this.add.text(cx, y + 38, displayName, {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.codexScrollContainer.add(nameText);

      // attackType badge
      const badgeStr = this._getAttackTypeBadge(entry.attackType);
      const badgeText = this.add.text(cx, y + 54, badgeStr, {
        fontSize: '8px',
        fontFamily: 'Arial, sans-serif',
        color: '#81ecec',
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

      bg.on('pointerdown', () => {
        if (!this.codexDragMoved) {
          this._showCodexCardOverlay(entry);
        }
      });
    } else {
      // Undiscovered card
      const bg = this.add.rectangle(cx, cy, CODEX_CARD_W, CODEX_CARD_H, 0x0d1117)
        .setStrokeStyle(1, 0x636e72)
        .setInteractive({ useHandCursor: true });
      this.codexScrollContainer.add(bg);

      // "???" text
      const unknownText = this.add.text(cx, y + 22, t('collection.codex.unknown'), {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      this.codexScrollContainer.add(unknownText);

      // Tier indicator
      const tierBadge = this.add.text(cx, y + 50, `T${entry.tier}`, {
        fontSize: '8px',
        fontFamily: 'Arial, sans-serif',
        color: '#636e72',
      }).setOrigin(0.5);
      this.codexScrollContainer.add(tierBadge);

      bg.on('pointerdown', () => {
        if (!this.codexDragMoved) {
          this._showCodexCardOverlay(entry);
        }
      });
    }
  }

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
   * Show an overlay with info for a codex card.
   * @param {object} entry - The tier data entry
   * @private
   */
  _showCodexCardOverlay(entry) {
    // T4~T5 undiscovered: no reaction
    if (!entry.discovered && entry.tier >= 4) return;

    if (this.overlay) this.overlay.destroy();
    this.overlay = this.add.container(0, 0).setDepth(50);

    // Backdrop
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.7)
      .setInteractive();
    this.overlay.add(backdrop);
    backdrop.on('pointerdown', () => this._closeOverlay());

    // Panel
    const panelW = 280;
    const panelH = entry.tier === 1 ? 200 : 180;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    const borderColor = entry.discovered ? this._getTierBorderColor(entry.tier) : 0x636e72;
    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, borderColor);
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
      // T1: basic info
      const nameText = this.add.text(panelX, panelTop + 40, entry.displayName, {
        fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.overlay.add(nameText);

      // Color circle
      const circleG = this.add.graphics();
      circleG.fillStyle(entry.color, 1);
      circleG.fillCircle(panelX, panelTop + 70, 14);
      this.overlay.add(circleG);

      // Attack type
      const atkText = this.add.text(panelX, panelTop + 95, `Type: ${this._getAttackTypeBadge(entry.attackType)}`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
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

    } else if (entry.tier <= 3) {
      // T2~T3: recipe hint
      const parts = entry.recipeKey ? entry.recipeKey.split('+') : ['?', '?'];
      const matA = this._getDisplayNameById(parts[0]);
      const matB = this._getDisplayNameById(parts[1]);

      if (entry.discovered) {
        // "matA + matB -> resultName"
        const nameText = this.add.text(panelX, panelTop + 40, entry.displayName, {
          fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.overlay.add(nameText);

        const recipeStr = `${matA} + ${matB}`;
        const recipeText = this.add.text(panelX, panelTop + 65, recipeStr, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#81ecec',
        }).setOrigin(0.5);
        this.overlay.add(recipeText);

        const arrowText = this.add.text(panelX, panelTop + 85, `\u2192 ${entry.displayName}`, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
        }).setOrigin(0.5);
        this.overlay.add(arrowText);

        // Attack type
        const atkText = this.add.text(panelX, panelTop + 110, `Type: ${this._getAttackTypeBadge(entry.attackType)}`, {
          fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
        }).setOrigin(0.5);
        this.overlay.add(atkText);

        const tierBadge = this.add.text(panelX, panelTop + 135, `Tier ${entry.tier}`, {
          fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
        }).setOrigin(0.5);
        this.overlay.add(tierBadge);
      } else {
        // "matA + matB -> ???"
        const recipeStr = `${matA} + ${matB}`;
        const recipeText = this.add.text(panelX, panelTop + 45, recipeStr, {
          fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#81ecec',
        }).setOrigin(0.5);
        this.overlay.add(recipeText);

        const arrowText = this.add.text(panelX, panelTop + 70, `\u2192 ${t('collection.codex.unknown')}`, {
          fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#636e72',
        }).setOrigin(0.5);
        this.overlay.add(arrowText);

        const tierBadge = this.add.text(panelX, panelTop + 100, `Tier ${entry.tier}`, {
          fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#636e72',
        }).setOrigin(0.5);
        this.overlay.add(tierBadge);
      }

    } else {
      // T4~T5 discovered: recipe hidden
      const nameText = this.add.text(panelX, panelTop + 40, entry.displayName, {
        fontSize: '16px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.overlay.add(nameText);

      const tierBadge = this.add.text(panelX, panelTop + 65, `Tier ${entry.tier}`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#ffd700',
      }).setOrigin(0.5);
      this.overlay.add(tierBadge);

      const secretText = this.add.text(panelX, panelTop + 95, t('collection.codex.recipeHidden'), {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#636e72',
      }).setOrigin(0.5);
      this.overlay.add(secretText);

      // Attack type
      const atkText = this.add.text(panelX, panelTop + 120, `Type: ${this._getAttackTypeBadge(entry.attackType)}`, {
        fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#b2bec3',
      }).setOrigin(0.5);
      this.overlay.add(atkText);
    }
  }

  /**
   * Get display name for a tower/merge ID.
   * Looks up TOWER_STATS first, then MERGE_RECIPES values.
   * @param {string} id
   * @returns {string}
   * @private
   */
  _getDisplayNameById(id) {
    // Check base towers - use i18n key for language consistency (BUG-3/BUG-4 fix).
    if (TOWER_STATS[id]) return t(`tower.${id}.name`) || TOWER_STATS[id].displayName;

    // Check merged towers (search by recipe id)
    for (const recipe of Object.values(MERGE_RECIPES)) {
      if (recipe.id === id) return recipe.displayName;
    }

    return id;
  }

  // ── Codex Drag Scroll ────────────────────────────────────────

  /**
   * Set up pointer-based drag scroll for the codex grid.
   * @private
   */
  _setupCodexDrag() {
    // Use global scene input events instead of a drag zone rectangle
    // to avoid blocking card pointerdown events (BUG-1 fix).
    this.input.on('pointerdown', this._onCodexPointerDown, this);
    this.input.on('pointermove', this._onCodexPointerMove, this);
    this.input.on('pointerup', this._onCodexPointerUp, this);
  }

  /**
   * Handle pointer down for codex scroll (global scene event).
   * Only activates drag if within the codex grid area and codex tab is active.
   * @param {Phaser.Input.Pointer} pointer
   * @private
   */
  _onCodexPointerDown(pointer) {
    if (this.activeTab !== 'codex') return;
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

  // ══════════════════════════════════════════════════════════════
  // OVERLAYS (Meta Upgrade Detail, Utility Detail, Tower Unlock)
  // ══════════════════════════════════════════════════════════════

  // ── Tower Detail View (Overlay) ──────────────────────────────

  /**
   * Show the tower meta-upgrade detail overlay.
   * @param {string} type - Tower type key
   * @private
   */
  _showTowerDetailView(type) {
    if (this.overlay) this.overlay.destroy();

    const stats = TOWER_STATS[type];
    const treeData = META_UPGRADE_TREE[type];
    const upgrades = this.saveData.towerUpgrades?.[type] || {};

    this.overlay = this.add.container(0, 0).setDepth(50);

    // Dark backdrop
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.7)
      .setInteractive();
    this.overlay.add(backdrop);

    // Panel
    const panelW = 320;
    const panelH = 520;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, stats.color);
    this.overlay.add(panelBg);

    // Close button [X]
    const closeX = panelX + panelW / 2 - 20;
    const closeY = panelTop + 15;
    const closeBg = this.add.circle(closeX, closeY, 12, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(closeBg);

    const closeText = this.add.text(closeX, closeY, 'X', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(closeText);

    closeBg.on('pointerdown', () => {
      this._closeOverlay();
      this._rebuildScene();
    });

    // Tower icon (1.5x scale)
    const iconG = this.add.graphics();
    this._drawTowerIcon(iconG, type, panelX - 60, panelTop + 45, 1.5);
    this.overlay.add(iconG);

    // Tower name
    const nameText = this.add.text(panelX, panelTop + 38, stats.displayName, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(nameText);

    // Current in-game branch info
    const maxTier = this._getMaxMetaTier(type);
    const branchStr = maxTier > 0 ? `Meta Tier ${maxTier}` : 'No meta upgrades';
    const branchText = this.add.text(panelX, panelTop + 60, branchStr, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.overlay.add(branchText);

    // Divider
    const divider = this.add.rectangle(panelX, panelTop + 80, panelW - 40, 1, 0x636e72)
      .setAlpha(0.3);
    this.overlay.add(divider);

    // Tier sections
    const tierStartY = panelTop + 95;
    const tierHeight = 85;

    for (let tier = 1; tier <= 3; tier++) {
      const tierY = tierStartY + (tier - 1) * tierHeight;
      const tierKey = `tier${tier}`;
      const tierData = treeData[tierKey];
      const choice = upgrades[tierKey] || null;
      const prevTierDone = tier === 1 || (upgrades[`tier${tier - 1}`] !== undefined && upgrades[`tier${tier - 1}`] !== null);

      // Tier label
      const tierLabel = this.add.text(panelX - panelW / 2 + 25, tierY, `Tier ${tier}`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
      });
      this.overlay.add(tierLabel);

      // Option A button
      this._createUpgradeOptionBtn(
        panelX, tierY + 25, panelW - 40, 25,
        'A', tierData.a, choice, 'a', prevTierDone, type, tierKey
      );

      // Option B button
      this._createUpgradeOptionBtn(
        panelX, tierY + 54, panelW - 40, 25,
        'B', tierData.b, choice, 'b', prevTierDone, type, tierKey
      );
    }

    // Current total bonuses summary
    const summaryY = tierStartY + 3 * tierHeight + 10;
    const summaryHeader = this.add.text(panelX, summaryY, '── Current Bonuses ──', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.overlay.add(summaryHeader);

    const bonusSummary = this._calcBonusSummary(type, upgrades);
    const summaryText = this.add.text(panelX, summaryY + 20, bonusSummary, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
      align: 'center',
    }).setOrigin(0.5);
    this.overlay.add(summaryText);
  }

  /**
   * Create an upgrade option button (A or B) for a tier.
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} w - Button width
   * @param {number} h - Button height
   * @param {string} label - 'A' or 'B'
   * @param {object} optionData - { name, desc, cost, effects }
   * @param {string|null} currentChoice - Currently selected choice for this tier
   * @param {string} optionKey - 'a' or 'b'
   * @param {boolean} prevTierDone - Whether previous tier is completed
   * @param {string} towerType - Tower type key
   * @param {string} tierKey - 'tier1', 'tier2', or 'tier3'
   * @private
   */
  _createUpgradeOptionBtn(x, y, w, h, label, optionData, currentChoice, optionKey, prevTierDone, towerType, tierKey) {
    const diamond = this.saveData.diamond || 0;
    const isSelected = currentChoice === optionKey;
    const isOtherSelected = currentChoice !== null && currentChoice !== optionKey;
    const isLocked = !prevTierDone;
    const canAfford = diamond >= optionData.cost;
    const canBuy = !isSelected && !isOtherSelected && !isLocked && canAfford;

    // Determine button style
    let bgColor = COLORS.BACKGROUND;
    let borderColor = 0x636e72;
    let borderWidth = 1;
    let textColor = '#636e72';
    let costColor = '#636e72';

    if (isSelected) {
      bgColor = TOWER_STATS[towerType].color;
      borderColor = TOWER_STATS[towerType].color;
      borderWidth = 2;
      textColor = '#ffd700';
      costColor = '#ffd700';
    } else if (isOtherSelected) {
      bgColor = COLORS.BACKGROUND;
      borderColor = 0x636e72;
      borderWidth = 1;
      textColor = '#636e72';
    } else if (isLocked) {
      bgColor = COLORS.WALL;
      borderColor = 0x636e72;
      borderWidth = 1;
      textColor = '#636e72';
    } else if (canAfford) {
      borderColor = COLORS.DIAMOND;
      borderWidth = 2;
      textColor = '#ffffff';
      costColor = COLORS.DIAMOND_CSS;
    }

    // Button background
    const bg = this.add.rectangle(x, y, w, h, bgColor, isSelected ? 0.3 : 1)
      .setStrokeStyle(borderWidth, borderColor);
    this.overlay.add(bg);

    if (canBuy) {
      bg.setInteractive({ useHandCursor: true });
    }

    // Badge [A] or [B]
    const badgeColor = optionKey === 'a' ? COLORS.DIAMOND : COLORS.BUTTON_ACTIVE;
    const badge = this.add.circle(x - w / 2 + 14, y, 9, badgeColor);
    this.overlay.add(badge);

    const badgeText = this.add.text(x - w / 2 + 14, y, label, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(badgeText);

    // Effect description
    let descStr = optionData.desc;
    if (isSelected) descStr = '\u2713 ' + descStr;
    if (isLocked) descStr = '\uD83D\uDD12 ' + descStr;

    const descText = this.add.text(x - 10, y, descStr, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: textColor,
    }).setOrigin(0.5);
    this.overlay.add(descText);

    // Cost display
    const costStr = isSelected ? '' : `\u25C6 ${optionData.cost}`;
    const costText = this.add.text(x + w / 2 - 30, y, costStr, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: costColor,
    }).setOrigin(0.5);
    this.overlay.add(costText);

    // Click handler
    if (canBuy) {
      bg.on('pointerdown', () => {
        this._purchaseTowerUpgrade(towerType, tierKey, optionKey, optionData.cost);
      });
    }
  }

  /**
   * Purchase a tower meta upgrade.
   * @param {string} towerType - Tower type key
   * @param {string} tierKey - 'tier1', 'tier2', or 'tier3'
   * @param {string} choice - 'a' or 'b'
   * @param {number} cost - Diamond cost
   * @private
   */
  _purchaseTowerUpgrade(towerType, tierKey, choice, cost) {
    if ((this.saveData.diamond || 0) < cost) return;

    this.saveData.diamond -= cost;

    if (!this.saveData.towerUpgrades) this.saveData.towerUpgrades = {};
    if (!this.saveData.towerUpgrades[towerType]) {
      this.saveData.towerUpgrades[towerType] = { tier1: null, tier2: null, tier3: null };
    }
    this.saveData.towerUpgrades[towerType][tierKey] = choice;

    this._saveToDB(this.saveData);
    this._refreshDiamondDisplay();

    // Refresh the detail view
    this._showTowerDetailView(towerType);
  }

  /**
   * Calculate a text summary of all bonus effects for a tower.
   * @param {string} type - Tower type key
   * @param {object} upgrades - { tier1: 'a'|'b'|null, tier2: ..., tier3: ... }
   * @returns {string} Formatted bonus summary
   * @private
   */
  _calcBonusSummary(type, upgrades) {
    const treeData = META_UPGRADE_TREE[type];
    const bonuses = {};

    for (let tier = 1; tier <= 3; tier++) {
      const choice = upgrades[`tier${tier}`];
      if (!choice) continue;
      const tierData = treeData[`tier${tier}`][choice];
      if (!tierData || !tierData.effects) continue;

      for (const effect of tierData.effects) {
        if (!bonuses[effect.stat]) {
          bonuses[effect.stat] = { multiply: 1, add: 0 };
        }
        if (effect.type === 'multiply') {
          bonuses[effect.stat].multiply *= effect.value;
        } else if (effect.type === 'add') {
          bonuses[effect.stat].add += effect.value;
        }
      }
    }

    if (Object.keys(bonuses).length === 0) {
      return 'No bonuses yet';
    }

    const lines = [];
    for (const [stat, val] of Object.entries(bonuses)) {
      const parts = [];
      if (val.multiply !== 1) {
        const pct = Math.round((val.multiply - 1) * 100);
        // fireRate multiply < 1 means faster
        if (stat === 'fireRate') {
          const speedPct = Math.round((1 - val.multiply) * 100);
          parts.push(`+${speedPct}% speed`);
        } else {
          parts.push(`${pct >= 0 ? '+' : ''}${pct}%`);
        }
      }
      if (val.add !== 0) {
        parts.push(`+${val.add}`);
      }
      lines.push(`${stat}: ${parts.join(', ')}`);
    }
    return lines.join('  |  ');
  }

  // ── Utility Detail View (Overlay) ────────────────────────────

  /**
   * Show the utility upgrade detail overlay.
   * @param {string} key - Utility key ('baseHp', 'goldBoost', 'waveBonus')
   * @private
   */
  _showUtilityDetailView(key) {
    if (this.overlay) this.overlay.destroy();

    const util = UTILITY_UPGRADES[key];
    const currentTier = this.saveData.utilityUpgrades?.[key] || 0;

    this.overlay = this.add.container(0, 0).setDepth(50);

    // Dark backdrop
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.7)
      .setInteractive();
    this.overlay.add(backdrop);

    // Panel
    const panelW = 300;
    const panelH = 350;
    const panelX = GAME_WIDTH / 2;
    const panelY = GAME_HEIGHT / 2;
    const panelTop = panelY - panelH / 2;

    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, COLORS.UI_PANEL)
      .setStrokeStyle(2, 0x636e72);
    this.overlay.add(panelBg);

    // Close button [X]
    const closeX = panelX + panelW / 2 - 20;
    const closeY = panelTop + 15;
    const closeBg = this.add.circle(closeX, closeY, 12, COLORS.BUTTON_ACTIVE)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(closeBg);

    const closeText = this.add.text(closeX, closeY, 'X', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(closeText);

    closeBg.on('pointerdown', () => {
      this._closeOverlay();
      this._rebuildScene();
    });

    // Icon + name
    const iconG = this.add.graphics();
    this._drawUtilityIcon(iconG, key, panelX - 50, panelTop + 50);
    this.overlay.add(iconG);

    const nameText = this.add.text(panelX - 30, panelTop + 45, util.name, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.overlay.add(nameText);

    // Current status
    let currentDesc = '';
    if (currentTier === 0) {
      currentDesc = key === 'baseHp' ? 'HP 20' : key === 'goldBoost' ? '250G' : '1.0x';
    } else {
      currentDesc = util.tiers[currentTier - 1].desc;
    }
    const statusText = this.add.text(panelX, panelTop + 75, `Current: ${currentDesc} (Tier ${currentTier}/${util.tiers.length})`, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.overlay.add(statusText);

    // Divider
    const divider = this.add.rectangle(panelX, panelTop + 95, panelW - 40, 1, 0x636e72)
      .setAlpha(0.3);
    this.overlay.add(divider);

    // Tier buttons
    const tierStartY = panelTop + 115;
    const diamond = this.saveData.diamond || 0;

    for (let i = 0; i < util.tiers.length; i++) {
      const tier = i + 1;
      const tierData = util.tiers[i];
      const btnY = tierStartY + i * 55;

      const isCompleted = tier <= currentTier;
      const isNext = tier === currentTier + 1;
      const isLocked = tier > currentTier + 1;
      const canAfford = diamond >= tierData.cost;
      const canBuy = isNext && canAfford;

      // Button style
      let bgColor = COLORS.BACKGROUND;
      let borderColor = 0x636e72;
      let borderWidth = 1;
      let textColor = '#636e72';

      if (isCompleted) {
        bgColor = util.iconColor;
        borderColor = util.iconColor;
        borderWidth = 2;
        textColor = '#ffd700';
      } else if (isNext && canAfford) {
        borderColor = COLORS.DIAMOND;
        borderWidth = 2;
        textColor = '#ffffff';
      } else if (isLocked) {
        bgColor = COLORS.WALL;
        textColor = '#636e72';
      }

      const bg = this.add.rectangle(panelX, btnY, panelW - 40, 40, bgColor, isCompleted ? 0.3 : 1)
        .setStrokeStyle(borderWidth, borderColor);
      this.overlay.add(bg);

      if (canBuy) {
        bg.setInteractive({ useHandCursor: true });
      }

      // Tier label
      const labelPrefix = isCompleted ? '\u2713 ' : isLocked ? '\uD83D\uDD12 ' : '';
      const tierLabel = this.add.text(panelX - panelW / 2 + 40, btnY, `${labelPrefix}Tier ${tier}`, {
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        color: textColor,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.overlay.add(tierLabel);

      // Effect text
      const effectText = this.add.text(panelX + 10, btnY, tierData.desc, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: textColor,
      }).setOrigin(0, 0.5);
      this.overlay.add(effectText);

      // Cost
      const costColor = isCompleted ? '#ffd700' : canAfford ? COLORS.DIAMOND_CSS : '#ff4757';
      const costStr = isCompleted ? '' : `\u25C6 ${tierData.cost}`;
      const costText = this.add.text(panelX + panelW / 2 - 30, btnY, costStr, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: costColor,
      }).setOrigin(1, 0.5);
      this.overlay.add(costText);

      // Click handler
      if (canBuy) {
        bg.on('pointerdown', () => {
          this._purchaseUtilityUpgrade(key, tier, tierData.cost);
        });
      }
    }
  }

  /**
   * Purchase a utility upgrade tier.
   * @param {string} key - Utility key
   * @param {number} tier - Tier being purchased (1-3)
   * @param {number} cost - Diamond cost
   * @private
   */
  _purchaseUtilityUpgrade(key, tier, cost) {
    if ((this.saveData.diamond || 0) < cost) return;

    this.saveData.diamond -= cost;

    if (!this.saveData.utilityUpgrades) {
      this.saveData.utilityUpgrades = { baseHp: 0, goldBoost: 0, waveBonus: 0 };
    }
    this.saveData.utilityUpgrades[key] = tier;

    this._saveToDB(this.saveData);
    this._refreshDiamondDisplay();

    // Refresh the detail view
    this._showUtilityDetailView(key);
  }

  // ── Tower Unlock Popup ──────────────────────────────────────

  /**
   * Show the tower unlock confirmation popup.
   * @param {string} type - Tower type key
   * @private
   */
  _showTowerUnlockPopup(type) {
    if (this.overlay) this.overlay.destroy();

    const stats = TOWER_STATS[type];
    const unlockCost = stats.unlockCost || 0;
    const diamond = this.saveData.diamond || 0;
    const canAfford = diamond >= unlockCost;

    this.overlay = this.add.container(0, 0).setDepth(50);

    // Dark backdrop
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.7)
      .setInteractive();
    this.overlay.add(backdrop);

    // Popup panel
    const popW = 260;
    const popH = 180;
    const popX = GAME_WIDTH / 2;
    const popY = GAME_HEIGHT / 2;

    const popBg = this.add.rectangle(popX, popY, popW, popH, COLORS.UI_PANEL)
      .setStrokeStyle(2, stats.color);
    this.overlay.add(popBg);

    // Tower icon
    const iconG = this.add.graphics();
    this._drawTowerIcon(iconG, type, popX - 50, popY - 55, 1.2);
    this.overlay.add(iconG);

    // Title
    const titleText = this.add.text(popX + 10, popY - 55, `${stats.displayName} Tower`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.overlay.add(titleText);

    // Description
    const descText = this.add.text(popX, popY - 25, `Unlock ${stats.displayName} Tower?`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.overlay.add(descText);

    // Cost
    const costColor = canAfford ? COLORS.DIAMOND_CSS : '#ff4757';
    const costText = this.add.text(popX, popY + 0, `Cost: \u25C6 ${unlockCost}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: costColor,
    }).setOrigin(0.5);
    this.overlay.add(costText);

    // Unlock button
    const unlockBtnColor = canAfford ? COLORS.BUTTON_ACTIVE : 0x636e72;
    const unlockBg = this.add.rectangle(popX - 55, popY + 45, 100, 36, unlockBtnColor)
      .setStrokeStyle(1, canAfford ? 0xffffff : 0x636e72);
    this.overlay.add(unlockBg);

    const unlockText = this.add.text(popX - 55, popY + 45, `Unlock \u25C6${unlockCost}`, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: canAfford ? '#ffffff' : '#636e72',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(unlockText);

    if (canAfford) {
      unlockBg.setInteractive({ useHandCursor: true });
      unlockBg.on('pointerdown', () => {
        this._unlockTower(type);
      });
    }

    // Cancel button
    const cancelBg = this.add.rectangle(popX + 55, popY + 45, 80, 36, COLORS.BACKGROUND)
      .setStrokeStyle(1, 0x636e72)
      .setInteractive({ useHandCursor: true });
    this.overlay.add(cancelBg);

    const cancelText = this.add.text(popX + 55, popY + 45, 'Cancel', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#b2bec3',
    }).setOrigin(0.5);
    this.overlay.add(cancelText);

    cancelBg.on('pointerdown', () => {
      this._closeOverlay();
    });
  }

  /**
   * Unlock a tower, deducting Diamond and updating save data.
   * @param {string} type - Tower type key to unlock
   * @private
   */
  _unlockTower(type) {
    const unlockCost = TOWER_STATS[type].unlockCost || 0;
    if ((this.saveData.diamond || 0) < unlockCost) return;

    this.saveData.diamond -= unlockCost;

    // Add to unlockedTowers array
    if (!this.saveData.unlockedTowers) this.saveData.unlockedTowers = [];
    if (!this.saveData.unlockedTowers.includes(type)) {
      this.saveData.unlockedTowers.push(type);
    }

    this._saveToDB(this.saveData);
    this._closeOverlay();
    this._rebuildScene();
  }

  // ── Common Helpers ───────────────────────────────────────────

  /**
   * Close the current overlay.
   * @private
   */
  _closeOverlay() {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  /**
   * Rebuild the entire scene to reflect updated data.
   * @private
   */
  _rebuildScene() {
    this.scene.restart();
  }

  /**
   * Save data to localStorage and sync registry.
   * @param {object} saveData - Save data
   * @private
   */
  _saveToDB(saveData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      // Ignore errors
    }
    this.registry.set('saveData', saveData);
  }
}
