/**
 * @fileoverview 부팅 씬(BootScene).
 * localStorage에서 저장 데이터를 로드하고 SoundManager를 초기화한 뒤 MenuScene으로 전환한다.
 */

import { SAVE_KEY, migrateSaveData } from '../config.js';
import { SoundManager } from '../managers/SoundManager.js';

/**
 * 게임 최초 진입 시 실행되는 부팅 씬.
 * 에셋 로드(프로토타입에서는 없음), 세이브 데이터 복원, 사운드 매니저 초기화를 담당한다.
 * @extends Phaser.Scene
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * 에셋을 사전 로드한다.
   * 현재 프로토타입 단계에서는 도형(shape)만 사용하므로 로드할 외부 에셋이 없다.
   */
  preload() {
    // 프로토타입 단계에서는 외부 에셋 없음
  }

  /**
   * 저장 데이터를 로드하고, SoundManager를 초기화한 뒤, MenuScene으로 전환한다.
   * - localStorage에서 세이브 데이터를 읽어 마이그레이션 후 레지스트리에 저장
   * - SoundManager 싱글턴을 레지스트리에 등록
   */
  create() {
    let saveData = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        saveData = JSON.parse(raw);
      }
    } catch (e) {
      // localStorage 접근 불가 또는 데이터 손상 시 초기 상태로 시작
      saveData = null;
    }

    // 세이브 데이터 스키마를 최신 버전으로 마이그레이션
    saveData = migrateSaveData(saveData);
    this.registry.set('saveData', saveData);

    // SoundManager 싱글턴 초기화 (이미 존재하면 건너뜀)
    if (!this.registry.get('soundManager')) {
      this.registry.set('soundManager', new SoundManager());
    }

    this.scene.start('MenuScene');
  }
}
