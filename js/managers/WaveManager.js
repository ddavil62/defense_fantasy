/**
 * @fileoverview WaveManager - 웨이브 스폰, 진행, 자동 스케일링을 관리한다.
 * R1~R20 사전 정의 웨이브와 R21+ 절차적 생성(새로운 적 타입 포함)을 처리한다.
 */

import {
  WAVE_DEFINITIONS, ENEMY_STATS, SCALING,
  WAVE_ANNOUNCE_DURATION, WAVE_CLEAR_DURATION, WAVE_BREAK_DURATION,
  calcWaveClearBonus, calcHpScale, getBossHpMultiplier,
  GAME_WIDTH, GAME_HEIGHT,
} from '../config.js';

/**
 * 웨이브 상태 열거형.
 * @enum {string}
 */
const WaveState = {
  IDLE: 'idle',             // 대기 (게임 시작 전)
  ANNOUNCING: 'announcing', // 웨이브 알림 표시 중
  SPAWNING: 'spawning',     // 적 스폰 중
  WAITING: 'waiting',       // 모든 적 스폰 완료, 적 제거/도달 대기
  CLEAR: 'clear',           // 웨이브 클리어 메시지 표시 중
  BREAK: 'break',           // 웨이브 간 휴식 시간
  MAP_CLEAR: 'map_clear',   // 모든 웨이브 클리어 (캠페인 맵 완료)
};

export class WaveManager {
  /**
   * WaveManager를 생성한다.
   * @param {Phaser.Scene} scene - 게임 씬
   * @param {object} [options={}] - 옵션
   * @param {number} [options.totalWaves=Infinity] - 총 웨이브 수 (Infinity = 엔드리스)
   * @param {object|null} [options.waveOverrides=null] - 커스텀 웨이브 정의 (라운드 번호 키)
   */
  constructor(scene, options = {}) {
    /** @type {Phaser.Scene} 게임 씬 참조 */
    this.scene = scene;

    /** @type {number} 총 웨이브 수 (Infinity = 엔드리스 모드) */
    this.totalWaves = options.totalWaves ?? Infinity;

    /** @type {object|null} 커스텀 웨이브 정의 (null이면 기본 WAVE_DEFINITIONS 사용) */
    this.waveOverrides = options.waveOverrides || null;

    /** @type {number} 현재 라운드 번호 */
    this.currentWave = 0;

    /** @type {string} 현재 웨이브 상태 */
    this.state = WaveState.IDLE;

    /** @type {number} 스폰 타이머 (초 단위) */
    this.spawnTimer = 0;

    /** @type {number} 상태 타이머 (초 단위, 알림/클리어/휴식 시간 관리) */
    this.stateTimer = 0;

    /** @type {object[]} 스폰 대기 중인 적 큐 */
    this.enemyQueue = [];

    /** @type {number} 현재 스폰 간격 (초) */
    this.spawnInterval = 0;

    /** @type {boolean} 보스 딜레이 활성 여부 */
    this.bossDelayActive = false;

    /** @type {number} 보스 딜레이 타이머 (초) */
    this.bossDelayTimer = 0;

    /** @type {Phaser.GameObjects.Text|null} 알림 텍스트 객체 */
    this.announceText = null;

    /** @type {number} 이번 게임에서의 총 처치 수 */
    this.totalKills = 0;
  }

  // ── 웨이브 시작 ────────────────────────────────────────────────

  /**
   * 첫 웨이브를 시작한다 (게임 시작 시 호출).
   */
  startFirstWave() {
    this.currentWave = 1;
    this._announceWave();
  }

  /**
   * 현재 웨이브를 화면에 알린다.
   * @private
   */
  _announceWave() {
    this.state = WaveState.ANNOUNCING;
    // ms를 초로 변환
    this.stateTimer = WAVE_ANNOUNCE_DURATION / 1000;

    // 웨이브 알림 텍스트 표시
    if (this.announceText) {
      this.announceText.destroy();
    }
    this.announceText = this.scene.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40,
      `Wave ${this.currentWave}`,
      {
        fontSize: '32px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(50).setAlpha(0);

    // 페이드인 애니메이션
    this.scene.tweens.add({
      targets: this.announceText,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
      yoyo: false,
    });
  }

  /**
   * 현재 웨이브의 적 스폰을 시작한다.
   * 웨이브 데이터를 로드하고 알림 텍스트를 페이드아웃한다.
   * @private
   */
  _startSpawning() {
    this.state = WaveState.SPAWNING;
    this.spawnTimer = 0;

    const waveData = this._getWaveData(this.currentWave);
    this.enemyQueue = waveData.enemies;
    this.spawnInterval = waveData.spawnInterval;
    this.isBossRound = waveData.bossRound || false;
    this.bossDelayActive = false;
    this.bossDelayTimer = waveData.bossDelay || 0;

    // 알림 텍스트 페이드아웃
    if (this.announceText) {
      this.scene.tweens.add({
        targets: this.announceText,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          if (this.announceText) {
            this.announceText.destroy();
            this.announceText = null;
          }
        },
      });
    }
  }

  // ── 프레임 업데이트 ────────────────────────────────────────────

  /**
   * 매 프레임 웨이브 매니저를 갱신한다.
   * 상태 머신 패턴으로 IDLE -> ANNOUNCING -> SPAWNING -> WAITING -> CLEAR -> BREAK 순으로 진행한다.
   * @param {number} delta - 프레임 델타 (초 단위, 게임 속도 적용 후)
   * @param {object[]} activeEnemies - 현재 맵에 살아있는 적 배열
   * @param {Function} spawnEnemy - 적 스폰 콜백
   * @param {Function} onWaveClear - 웨이브 클리어 콜백 (보너스 골드 전달, 실제 지급량 반환)
   * @param {number} currentHP - 현재 기지 HP (보너스 계산용)
   * @param {number} maxBaseHP - 최대 기지 HP (메타 업그레이드 포함)
   */
  update(delta, activeEnemies, spawnEnemy, onWaveClear, currentHP, maxBaseHP) {
    switch (this.state) {
      case WaveState.IDLE:
        break;

      case WaveState.ANNOUNCING:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this._startSpawning();
        }
        break;

      case WaveState.SPAWNING:
        this._updateSpawning(delta, spawnEnemy);
        break;

      case WaveState.WAITING:
        // 모든 적이 제거되면 웨이브 클리어 처리
        if (activeEnemies.length === 0) {
          this._onWaveClear(onWaveClear, currentHP, maxBaseHP);
        }
        break;

      case WaveState.CLEAR:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = WaveState.BREAK;
          this.stateTimer = WAVE_BREAK_DURATION;
          // 클리어 텍스트 페이드아웃
          if (this.announceText) {
            this.scene.tweens.add({
              targets: this.announceText,
              alpha: 0,
              duration: 300,
              onComplete: () => {
                if (this.announceText) {
                  this.announceText.destroy();
                  this.announceText = null;
                }
              },
            });
          }
        }
        break;

      case WaveState.MAP_CLEAR:
        // 맵 클리어 상태: 더 이상 웨이브를 진행하지 않음 (씬에서 전환 처리)
        break;

      case WaveState.BREAK:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.currentWave++;
          this._announceWave();
        }
        break;
    }
  }

  /**
   * 스폰 로직을 갱신한다.
   * 큐에서 적을 꺼내 스폰하고, 보스 타입은 스폰 후 딜레이를 적용한다.
   * @param {number} delta - 프레임 델타 (초)
   * @param {Function} spawnEnemy - 적 스폰 콜백
   * @private
   */
  _updateSpawning(delta, spawnEnemy) {
    if (this.enemyQueue.length === 0) {
      this.state = WaveState.WAITING;
      return;
    }

    // 보스 딜레이 처리: 보스 스폰 후 일정 시간 대기
    if (this.bossDelayActive && this.bossDelayTimer > 0) {
      this.bossDelayTimer -= delta;
      if (this.bossDelayTimer <= 0) {
        this.bossDelayActive = false;
      }
      return;
    }

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      const enemyData = this.enemyQueue.shift();
      spawnEnemy(enemyData);

      // 보스 타입 스폰 후 딜레이 트리거
      if (this.isBossRound && (enemyData.type === 'boss' || enemyData.type === 'boss_armored')) {
        this.bossDelayActive = true;
        this.spawnTimer = 0;
      } else {
        this.spawnTimer = this.spawnInterval;
      }
    }
  }

  // ── 웨이브 클리어 ──────────────────────────────────────────────

  /**
   * 웨이브 클리어 이벤트를 처리한다.
   * 보너스 골드를 계산하고 클리어 메시지를 표시한다.
   * @param {Function} onWaveClear - 보너스 골드 콜백 (실제 지급량 반환)
   * @param {number} currentHP - 현재 기지 HP
   * @param {number} maxBaseHP - 최대 기지 HP (메타 업그레이드 포함)
   * @private
   */
  _onWaveClear(onWaveClear, currentHP, maxBaseHP) {
    const bonusGold = calcWaveClearBonus(this.currentWave, currentHP, maxBaseHP);
    const awardedGold = onWaveClear(bonusGold) || bonusGold;

    // 마지막 웨이브인지 확인 (캠페인 모드: totalWaves가 유한값)
    const isMapClear = isFinite(this.totalWaves) && this.currentWave >= this.totalWaves;

    this.state = isMapClear ? WaveState.MAP_CLEAR : WaveState.CLEAR;
    this.stateTimer = WAVE_CLEAR_DURATION / 1000;

    if (this.announceText) {
      this.announceText.destroy();
    }
    this.announceText = this.scene.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40,
      `Wave ${this.currentWave} Clear!\n+${awardedGold}G Bonus`,
      {
        fontSize: '24px',
        fontFamily: 'Galmuri11, Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
        lineSpacing: 6,
      }
    ).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.scene.tweens.add({
      targets: this.announceText,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    // 맵 클리어 이벤트 발행 (캠페인 모드에서 사용)
    if (isMapClear) {
      this.scene.events.emit('mapClear', {
        currentHP,
        maxBaseHP,
        wavesCleared: this.currentWave,
      });
    }
  }

  // ── 웨이브 데이터 생성 ─────────────────────────────────────────

  /**
   * 특정 라운드의 웨이브 데이터를 반환한다.
   * R1~R20은 사전 정의 데이터, R21+는 자동 스케일링으로 생성한다.
   * @param {number} round - 라운드 번호
   * @returns {{ enemies: object[], spawnInterval: number, bossRound?: boolean, bossDelay?: number }} 웨이브 데이터
   * @private
   */
  _getWaveData(round) {
    // 커스텀 웨이브 정의가 있으면 우선 사용 (캠페인 맵별 웨이브)
    if (this.waveOverrides && this.waveOverrides[round]) {
      return this._expandWaveDefinition(round, this.waveOverrides[round]);
    }
    if (round >= 1 && round <= 20 && WAVE_DEFINITIONS[round]) {
      return this._expandWaveDefinition(round, WAVE_DEFINITIONS[round]);
    }
    return this._generateScaledWave(round);
  }

  /**
   * 사전 정의된 웨이브 정의를 개별 적 객체로 확장한다.
   * @param {number} round - 라운드 번호
   * @param {object} def - 웨이브 정의 (enemies 그룹 배열, spawnInterval 등)
   * @returns {object} 확장된 웨이브 데이터
   * @private
   */
  _expandWaveDefinition(round, def) {
    const enemies = [];
    for (const group of def.enemies) {
      const baseStats = ENEMY_STATS[group.type];
      for (let i = 0; i < group.count; i++) {
        enemies.push({
          type: group.type,
          hp: baseStats.hp,
          speed: baseStats.speed,
          gold: baseStats.gold,
        });
      }
    }
    return {
      enemies,
      spawnInterval: def.spawnInterval,
      bossRound: def.bossRound || false,
      bossDelay: def.bossDelay || 0,
    };
  }

  /**
   * R21+ 스케일링 웨이브를 생성한다.
   * swarm, splitter, armored 등 새로운 적 타입이 라운드에 따라 등장한다.
   * @param {number} round - 라운드 번호
   * @returns {object} 생성된 웨이브 데이터
   * @private
   */
  _generateScaledWave(round) {
    const baseCount = SCALING.BASE_COUNT_ADD + Math.floor(round * SCALING.COUNT_PER_ROUND);
    const hpScale = calcHpScale(round);
    const speedScale = 1 + (round - 1) * SCALING.SPEED_SCALE_PER_ROUND;
    const goldScale = 1 + (round - 1) * SCALING.GOLD_SCALE_PER_ROUND;
    const spawnInterval = Math.max(
      SCALING.MIN_SPAWN_INTERVAL,
      SCALING.SPAWN_INTERVAL_BASE - round * SCALING.SPAWN_INTERVAL_REDUCTION
    );

    const enemies = [];
    const isBossRound = (round % 10 === 0); // 10라운드마다 보스 등장

    if (isBossRound) {
      // 보스 방어력 스케일링: R20 이후 10라운드마다 +0.05, 최대 0.5
      const extraResistance = Math.min(
        0.5,
        Math.floor(Math.max(0, round - 20) / 10) * SCALING.BOSS_RESISTANCE_SCALE
      );

      if (round >= SCALING.ARMORED_CHANCE_START) {
        // R20+: 장갑 보스 사용
        enemies.push({
          type: 'boss_armored',
          hp: Math.floor(ENEMY_STATS.boss_armored.hp * hpScale * getBossHpMultiplier(round)),
          speed: ENEMY_STATS.boss_armored.speed * speedScale * SCALING.BOSS_SPEED_BONUS,
          gold: Math.floor(ENEMY_STATS.boss_armored.gold * goldScale * 1.5),
          resistance: Math.min(SCALING.RESISTANCE_CAP, ENEMY_STATS.boss_armored.resistance + extraResistance),
        });
      } else {
        enemies.push({
          type: 'boss',
          hp: Math.floor(ENEMY_STATS.boss.hp * hpScale * getBossHpMultiplier(round)),
          speed: ENEMY_STATS.boss.speed * speedScale * SCALING.BOSS_SPEED_BONUS,
          gold: Math.floor(ENEMY_STATS.boss.gold * goldScale * 1.5),
        });
      }
    }

    // 일반 적 생성 (라운드별 확률 기반 타입 선택)
    for (let i = 0; i < baseCount; i++) {
      const type = this._pickEnemyType(round);
      const baseStats = ENEMY_STATS[type];
      const entry = {
        type,
        hp: Math.floor(baseStats.hp * hpScale),
        speed: baseStats.speed * speedScale,
        gold: Math.floor(baseStats.gold * goldScale),
      };
      // 장갑 적의 방어력 보존
      if (baseStats.resistance) {
        entry.resistance = baseStats.resistance;
      }
      enemies.push(entry);
    }

    return {
      enemies,
      spawnInterval,
      bossRound: isBossRound,
      bossDelay: isBossRound ? 3.0 : 0, // 보스 라운드: 3초 딜레이
    };
  }

  /**
   * 라운드 번호와 확률 가중치에 따라 랜덤 적 타입을 선택한다.
   * 라운드가 높아질수록 swarm, splitter, armored가 등장한다.
   * @param {number} round - 현재 라운드 번호
   * @returns {string} 적 타입
   * @private
   */
  _pickEnemyType(round) {
    const roll = Math.random();
    const hasSwarm = round >= SCALING.SWARM_CHANCE_START;
    const hasSplitter = round >= SCALING.SPLITTER_CHANCE_START;
    const hasArmored = round >= SCALING.ARMORED_CHANCE_START;

    // 특수 적 타입의 등장 확률 계산
    const swarmChance = hasSwarm ? SCALING.SWARM_SPAWN_CHANCE : 0;
    const splitterChance = hasSplitter ? SCALING.SPLITTER_SPAWN_CHANCE : 0;
    const armoredChance = hasArmored ? SCALING.ARMORED_SPAWN_CHANCE : 0;
    const remaining = 1 - swarmChance - splitterChance - armoredChance;

    // 기본 적 타입 확률 분배: normal 50%, fast 30%, tank 20%
    const normalChance = remaining * 0.50;
    const fastChance = remaining * 0.30;
    // tank = remaining * 0.20 (나머지)

    // 누적 확률로 타입 결정
    let cumulative = 0;
    cumulative += swarmChance;
    if (roll < cumulative) return 'swarm';

    cumulative += splitterChance;
    if (roll < cumulative) return 'splitter';

    cumulative += armoredChance;
    if (roll < cumulative) return 'armored';

    cumulative += normalChance;
    if (roll < cumulative) return 'normal';

    cumulative += fastChance;
    if (roll < cumulative) return 'fast';

    return 'tank';
  }

  // ── 상태 조회 ──────────────────────────────────────────────────

  /**
   * 현재 웨이브 진행 중인지 확인한다 (스폰 중이거나 적 제거 대기 중).
   * @returns {boolean} 웨이브 활성 여부
   */
  isWaveActive() {
    return this.state === WaveState.SPAWNING || this.state === WaveState.WAITING;
  }

  /**
   * 맵의 모든 웨이브가 클리어되었는지 확인한다 (캠페인 모드 전용).
   * @returns {boolean} 맵 클리어 여부
   */
  isMapCleared() {
    return this.state === WaveState.MAP_CLEAR;
  }

  /**
   * 웨이브 간 휴식 시간의 남은 시간을 반환한다 (HUD 카운트다운용).
   * BREAK 상태가 아니면 0을 반환한다.
   * @returns {number} 남은 휴식 시간 (초)
   */
  getBreakTimeRemaining() {
    if (this.state === WaveState.BREAK) {
      return Math.max(0, this.stateTimer);
    }
    return 0;
  }

  /**
   * 다음 웨이브의 적 타입 미리보기를 반환한다.
   * 최대 4개의 고유 적 타입과 보스 여부 정보를 포함한다.
   * @returns {{ types: string[], isBoss: boolean }} 다음 웨이브 미리보기
   */
  getNextWavePreview() {
    const nextRound = this.currentWave + 1;
    let waveData;
    if (nextRound >= 1 && nextRound <= 20 && WAVE_DEFINITIONS[nextRound]) {
      // 사전 정의 데이터 사용
      const def = WAVE_DEFINITIONS[nextRound];
      const types = [...new Set(def.enemies.map(g => g.type))];
      return {
        types: types.slice(0, 4),
        isBoss: def.bossRound || false,
      };
    }
    // R21+: 생성 로직 기반 추정
    const isBoss = (nextRound % 10 === 0);
    const types = ['normal', 'fast', 'tank'];
    if (nextRound >= SCALING.SWARM_CHANCE_START) types.push('swarm');
    if (nextRound >= SCALING.SPLITTER_CHANCE_START) types.push('splitter');
    if (nextRound >= SCALING.ARMORED_CHANCE_START) types.push('armored');
    if (isBoss) types.unshift(nextRound >= 20 ? 'boss_armored' : 'boss');
    return {
      types: [...new Set(types)].slice(0, 4),
      isBoss,
    };
  }

  // ── 정리 ───────────────────────────────────────────────────────

  /**
   * 리소스를 정리한다.
   */
  destroy() {
    if (this.announceText) {
      this.announceText.destroy();
      this.announceText = null;
    }
  }
}
