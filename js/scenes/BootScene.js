/**
 * @fileoverview 부팅 씬(BootScene).
 * localStorage에서 저장 데이터를 로드하고 SoundManager를 초기화한 뒤 MenuScene으로 전환한다.
 */

import { SAVE_KEY, migrateSaveData, MERGE_RECIPES } from '../config.js';
import { SoundManager } from '../managers/SoundManager.js';
import { AdManager } from '../managers/AdManager.js';

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
   * T1 기본 타워 10종의 스프라이트 이미지를 로드한다.
   */
  preload() {
    // T1 기본 타워 스프라이트 (128×128 PNG, 투명 배경)
    const towerTypes = [
      'archer', 'mage', 'ice', 'lightning', 'flame',
      'rock', 'poison', 'wind', 'light', 'dragon',
    ];
    for (const type of towerTypes) {
      const name = type.charAt(0).toUpperCase() + type.slice(1);
      this.load.image(`tower_${type}`, `assets/tower/${name}.png`);
    }

    // T2~T5 합성 타워 스프라이트 (128×128 PNG, 투명 배경)
    const mergeIds = new Set();
    for (const recipe of Object.values(MERGE_RECIPES)) {
      mergeIds.add(recipe.id);
    }
    for (const id of mergeIds) {
      this.load.image(`tower_${id}`, `assets/tower/${id}.png`);
    }

    // 타워 발판 마법진 (rune_t1~t5) 및 합성 하이라이트 마법진 (merge_rune)
    for (let tier = 1; tier <= 5; tier++) {
      this.load.image(`rune_t${tier}`, `assets/ui/rune_t${tier}.png`);
    }
    this.load.image('merge_rune', 'assets/ui/merge_rune.png');

    // ── UI 에셋 로드 ──

    // UI 버튼 (대형/중형/소형 × 색상 변형 × normal/pressed + disabled)
    const btnSizes = ['large', 'medium', 'small'];
    const btnColors = ['primary', 'meta', 'back', 'danger'];
    for (const size of btnSizes) {
      for (const color of btnColors) {
        // small은 primary, back만 존재
        if (size === 'small' && (color === 'meta' || color === 'danger')) continue;
        this.load.image(`btn_${size}_${color}_normal`, `assets/ui/buttons/btn_${size}_${color}_normal.png`);
        this.load.image(`btn_${size}_${color}_pressed`, `assets/ui/buttons/btn_${size}_${color}_pressed.png`);
      }
      this.load.image(`btn_${size}_disabled`, `assets/ui/buttons/btn_${size}_disabled.png`);
    }

    // UI 패널 (결과/일시정지/월드카드/레벨카드/타워정보)
    for (const name of ['panel_result', 'panel_pause', 'panel_world_card', 'panel_level_card', 'panel_info_overlay']) {
      this.load.image(name, `assets/ui/panels/${name}.png`);
    }

    // HUD 배경 및 타워 슬롯
    this.load.image('hud_bar_bg', 'assets/ui/hud/hud_bar_bg.png');
    this.load.image('tower_panel_bg', 'assets/ui/hud/tower_panel_bg.png');
    for (const state of ['normal', 'selected', 'locked']) {
      this.load.image(`tower_slot_${state}`, `assets/ui/hud/tower_slot_${state}.png`);
    }
    for (const state of ['normal', 'pressed']) {
      this.load.image(`slot_action_${state}`, `assets/ui/hud/slot_action_${state}.png`);
      this.load.image(`slot_mini_${state}`, `assets/ui/hud/slot_mini_${state}.png`);
    }

    // 장식 요소 (구분선, 코너)
    this.load.image('divider_gold', 'assets/ui/decorations/divider_gold.png');
    this.load.image('divider_header', 'assets/ui/decorations/divider_header.png');
    this.load.image('corner_deco', 'assets/ui/decorations/corner_deco.png');

    // 아이콘 (다이아/하트/검/별/자물쇠)
    for (const name of ['icon_diamond', 'icon_heart', 'icon_sword', 'icon_star_filled', 'icon_star_empty', 'icon_lock']) {
      this.load.image(name, `assets/ui/icons/${name}.png`);
    }

    // 소모품 능력 아이콘 (슬로우/골드/번개)
    for (const name of ['icon_consumable_slow', 'icon_consumable_gold', 'icon_consumable_lightning']) {
      this.load.image(name, `assets/ui/icons/${name}.png`);
    }

    // 게임 플레이 UI 버튼 아이콘 (판매/배속/일시정지/음소거)
    for (const name of [
      'icon_sell',
      'icon_speed_x1', 'icon_speed_x2', 'icon_speed_x3',
      'icon_pause',
      'icon_sound_on', 'icon_sound_off',
    ]) {
      this.load.image(name, `assets/ui/icons/${name}.png`);
    }
  }

  /**
   * 저장 데이터를 로드하고, SoundManager를 초기화한 뒤, MenuScene으로 전환한다.
   * - localStorage에서 세이브 데이터를 읽어 마이그레이션 후 레지스트리에 저장
   * - SoundManager 싱글턴을 레지스트리에 등록
   */
  async create() {
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

    // AdManager 초기화 (이미 존재하면 건너뜀)
    if (!this.registry.get('adManager')) {
      const adManager = new AdManager();
      await adManager.initialize();
      this.registry.set('adManager', adManager);
    }

    // 커스텀 폰트(Galmuri)가 완전히 로드된 후 MenuScene으로 전환
    // CSS @font-face로 선언된 폰트가 resolve될 때까지 대기하여 FOUT 방지
    await document.fonts.ready;

    this.scene.start('MenuScene');
  }
}
