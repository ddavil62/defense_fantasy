/**
 * @fileoverview Entry point for Fantasy Tower Defense.
 * Creates the Phaser.Game instance with all scene registrations.
 *
 * Phase 6: Import Phaser from npm (Vite bundling).
 */

import Phaser from 'phaser';

import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { CollectionScene } from './scenes/CollectionScene.js';
import { StatsScene } from './scenes/StatsScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

/** @type {Phaser.Types.Core.GameConfig} */
const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, CollectionScene, StatsScene],
  input: {
    activePointers: 1,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
};

const game = new Phaser.Game(config);

// Expose for Playwright test access
window.__game = game;
