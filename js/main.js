/**
 * @fileoverview Fantasy Tower Defense 게임의 진입점(Entry Point).
 * Phaser.Game 인스턴스를 생성하고 모든 씬(Scene)을 등록한다.
 */

import Phaser from 'phaser';

import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { WorldSelectScene } from './scenes/WorldSelectScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { MapClearScene } from './scenes/MapClearScene.js';
import { CollectionScene } from './scenes/CollectionScene.js';
import { StatsScene } from './scenes/StatsScene.js';
import { MergeCodexScene } from './scenes/MergeCodexScene.js';
import { EndlessMapSelectScene } from './scenes/EndlessMapSelectScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

// 월드별 맵 데이터 일괄 로드 (사이드 이펙트 import: registerMap 호출로 레지스트리 등록)
import './data/maps/forest.js';
import './data/maps/desert.js';
import './data/maps/tundra.js';
import './data/maps/volcano.js';
import './data/maps/shadow.js';

/**
 * Phaser 게임 설정 객체.
 * - type: AUTO(WebGL 우선, Canvas 폴백)
 * - scale: FIT 모드로 화면 중앙 정렬
 * - scene: 등록 순서대로 첫 번째 씬(BootScene)이 자동 시작됨
 * @type {Phaser.Types.Core.GameConfig}
 */
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
  scene: [BootScene, MenuScene, WorldSelectScene, LevelSelectScene, GameScene, GameOverScene, MapClearScene, CollectionScene, StatsScene, MergeCodexScene, EndlessMapSelectScene],
  input: {
    activePointers: 1, // 모바일 싱글 터치만 허용
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
};

/** @type {Phaser.Game} 게임 인스턴스 */
const game = new Phaser.Game(config);

// Playwright 테스트에서 게임 인스턴스에 접근할 수 있도록 전역에 노출
window.__game = game;
