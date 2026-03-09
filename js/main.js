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
    pixelArt: true,
    antialias: false,
  },
};

/** @type {Phaser.Game} 게임 인스턴스 */
const game = new Phaser.Game(config);

// Playwright 테스트에서 게임 인스턴스에 접근할 수 있도록 전역에 노출
window.__game = game;

// ── Android 뒤로가기 내비게이션 ──────────────────────────────────
// 1. Capacitor @capacitor/app 플러그인의 backButton 이벤트 (네이티브 환경)
// 2. ESC 키 keydown 이벤트 (웹 환경 폴백 + 데스크톱 테스트)
// 두 경로 모두 동일한 handleBackNavigation() 함수를 호출한다.

/**
 * 뒤로가기 핵심 로직. 현재 활성 씬을 조회하여 씬별 뒤로가기 동작을 수행한다.
 * Capacitor backButton 리스너와 ESC keydown 핸들러 양쪽에서 호출된다.
 */
function handleBackNavigation() {
  // 현재 활성 씬 조회 (getScenes(true)는 isActive인 씬만 반환)
  const scenes = game.scene.getScenes(true);
  if (!scenes || scenes.length === 0) return;

  const scene = scenes[0];
  const key = scene.sys.settings.key;

  // BootScene은 뒤로가기 무시
  if (key === 'BootScene') return;

  // ── 오버레이 우선 처리 ──
  // TowerInfoOverlay 또는 일시정지 오버레이가 열려 있으면
  // 씬 네비게이션 대신 오버레이를 닫는다.

  // MergeCodexScene: towerInfoOverlay 열림 확인
  if (key === 'MergeCodexScene') {
    if (scene.towerInfoOverlay && scene.towerInfoOverlay.isOpen()) {
      scene.towerInfoOverlay.handleBack();
      return;
    }
  }

  // GameScene: TowerInfoOverlay 또는 일시정지 오버레이 열림 확인
  if (key === 'GameScene') {
    // TowerInfoOverlay가 우선 (depth 100 > pauseOverlay depth 50)
    if (scene.towerPanel && scene.towerPanel.isOverlayOpen()) {
      scene.towerPanel.towerInfoOverlay.handleBack();
      return;
    }
    // 일시정지 오버레이가 열려 있으면 재개
    if (scene.isPaused && scene.pauseOverlay) {
      scene._resumeGame();
      return;
    }
  }

  switch (key) {
    case 'MenuScene':
      // 종료 확인 다이얼로그 표시 (이미 열려 있으면 무시)
      if (!window.__isExitDialogOpen) {
        scene._openExitDialog();
      }
      break;

    case 'WorldSelectScene':
      // MenuScene으로 페이드아웃 전환
      scene.cameras.main.fadeOut(200, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        scene.scene.start('MenuScene');
      });
      break;

    case 'LevelSelectScene':
      // WorldSelectScene으로 페이드아웃 전환
      scene.cameras.main.fadeOut(200, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        scene.scene.start('WorldSelectScene');
      });
      break;

    case 'EndlessMapSelectScene':
      // MenuScene으로 페이드아웃 전환
      scene.cameras.main.fadeOut(200, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        scene.scene.start('MenuScene');
      });
      break;

    case 'CollectionScene':
      // MenuScene으로 즉시 전환 (기존 패턴: 페이드아웃 없이 scene.start)
      scene.scene.start('MenuScene');
      break;

    case 'MergeCodexScene':
      // 호출 씬에 따라 복귀 (기존 _goBack() 로직과 동일)
      if (scene.fromScene === 'GameScene') {
        scene.scene.stop('MergeCodexScene');
        scene.scene.wake('GameScene');
      } else {
        scene.scene.start('CollectionScene');
      }
      break;

    case 'StatsScene':
      // MenuScene으로 즉시 전환 (기존 패턴: 페이드아웃 없이 scene.start)
      scene.scene.start('MenuScene');
      break;

    case 'GameScene':
      // 게임 중이면 일시정지, 이미 정지/게임오버 상태면 무시
      if (!scene.isPaused && !scene.isGameOver) {
        scene._pauseGame();
      }
      break;

    case 'MapClearScene':
      // WorldSelectScene으로 페이드아웃 전환
      scene.cameras.main.fadeOut(200, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        scene.scene.start('WorldSelectScene');
      });
      break;

    case 'GameOverScene':
      // MenuScene으로 페이드아웃 전환
      scene.cameras.main.fadeOut(200, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        scene.scene.start('MenuScene');
      });
      break;

    default:
      // 정의되지 않은 씬에서는 무시
      break;
  }
}

// ── Capacitor @capacitor/app backButton 리스너 (네이티브 환경) ──
// 기본 동작(앱 종료/홈 이동)을 차단하고 게임 내 뒤로가기로 대체한다.
// 웹 환경에서는 import가 실패하므로 catch로 무시한다.
try {
  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', () => {
      handleBackNavigation();
    });
  }).catch(() => {
    // 웹 환경: @capacitor/app 미설치 또는 로드 실패 — ESC 키 폴백 사용
  });
} catch {
  // 정적 import 실패 시 무시
}

/**
 * ESC 키 핸들러 (웹 환경 폴백 + 데스크톱 테스트용).
 * @param {KeyboardEvent} e - 키보드 이벤트
 */
function handleBackButton(e) {
  if (e.key !== 'Escape' && e.keyCode !== 27) return;
  e.preventDefault();
  handleBackNavigation();
}

document.addEventListener('keydown', handleBackButton);
