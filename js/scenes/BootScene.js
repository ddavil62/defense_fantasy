/**
 * @fileoverview BootScene - Initial setup scene.
 * Loads saved data from localStorage and transitions to MenuScene.
 *
 * Phase 5: Initializes SoundManager and registers in game registry.
 */

import { SAVE_KEY, migrateSaveData } from '../config.js';
import { SoundManager } from '../managers/SoundManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * Preload assets (prototype uses shapes only, no assets to load).
   */
  preload() {
    // No external assets to load in prototype phase
  }

  /**
   * Load saved data, initialize SoundManager, and transition to MenuScene.
   */
  create() {
    let saveData = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        saveData = JSON.parse(raw);
      }
    } catch (e) {
      // If localStorage is unavailable or corrupted, start fresh
      saveData = null;
    }

    saveData = migrateSaveData(saveData);
    this.registry.set('saveData', saveData);

    // Phase 5: Initialize SoundManager (singleton via registry)
    if (!this.registry.get('soundManager')) {
      this.registry.set('soundManager', new SoundManager());
    }

    this.scene.start('MenuScene');
  }
}
