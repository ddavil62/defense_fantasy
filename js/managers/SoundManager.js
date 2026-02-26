/**
 * @fileoverview SoundManager - Web Audio API 기반 절차적 SFX + BGM 관리자.
 * 모든 사운드는 OscillatorNode + GainNode를 사용하여 런타임에 합성된다.
 * 외부 오디오 파일을 사용하지 않는다.
 *
 * SFX: fire, hit, kill, kill_boss, boss_appear, base_hit, wave_clear, game_over
 * BGM: menu, battle, boss (노트 시퀀서 루프, setInterval 사용)
 *
 * Web Audio API만 의존한다. Phaser 의존성 없음.
 */

/** @const {string} 사운드 설정 localStorage 키 */
const SOUND_SAVE_KEY = 'fantasy-td-sound';

/** @const {number} sfx_hit 최대 동시 재생 수 */
const MAX_HIT_CONCURRENT = 3;

/** @const {number} sfx_kill 최대 동시 재생 수 */
const MAX_KILL_CONCURRENT = 2;

/**
 * 타워 타입별 발사 SFX 파라미터.
 * @type {Object<string, {waveform: OscillatorType, freqStart: number, freqEnd: number, duration: number}>}
 */
const FIRE_PARAMS = {
  archer:    { waveform: 'square',   freqStart: 880,  freqEnd: 440,  duration: 0.08 },
  mage:      { waveform: 'sawtooth', freqStart: 660,  freqEnd: 220,  duration: 0.12 },
  ice:       { waveform: 'sine',     freqStart: 1200, freqEnd: 800,  duration: 0.10 },
  lightning: { waveform: 'square',   freqStart: 1000, freqEnd: 200,  duration: 0.06 },
  flame:     { waveform: 'sawtooth', freqStart: 400,  freqEnd: 150,  duration: 0.15 },
  rock:      { waveform: 'sine',     freqStart: 200,  freqEnd: 80,   duration: 0.20 },
  poison:    { waveform: 'sine',     freqStart: 500,  freqEnd: 300,  duration: 0.12 },
  wind:      { waveform: 'sine',     freqStart: 800,  freqEnd: 600,  duration: 0.10 },
  light:     { waveform: 'sine',     freqStart: 1500, freqEnd: 1000, duration: 0.08 },
  dragon:    { waveform: 'sawtooth', freqStart: 300,  freqEnd: 100,  duration: 0.18 },
};

// ── BGM 시퀀스 데이터 ─────────────────────────────────────────────

/**
 * 메뉴 BGM 노트 시퀀스 (C단조 펜타토닉 아르페지오).
 * 각 항목: { freq: Hz, beats: 박자 수 }
 * BPM 60 => 1박 = 1.0초
 */
const BGM_MENU_NOTES = [
  { freq: 130.81, beats: 1 },   // C3
  { freq: 155.56, beats: 1 },   // Eb3
  { freq: 196.00, beats: 2 },   // G3 (긴 음)
  { freq: 233.08, beats: 1 },   // Bb3
  { freq: 261.63, beats: 1 },   // C4
  { freq: 233.08, beats: 1 },   // Bb3
  { freq: 196.00, beats: 1 },   // G3
];
const BGM_MENU_BPM = 60;

/**
 * 전투 BGM 멜로디 노트 (D단조).
 * BPM 120 => 1박 = 0.5초
 */
const BGM_BATTLE_MELODY = [
  { freq: 293.66, beats: 0.5 },  // D4
  { freq: 349.23, beats: 0.5 },  // F4
  { freq: 440.00, beats: 1 },    // A4
  { freq: 392.00, beats: 0.5 },  // G4
  { freq: 349.23, beats: 0.5 },  // F4
  { freq: 293.66, beats: 1 },    // D4
  { freq: 329.63, beats: 0.5 },  // E4
  { freq: 349.23, beats: 0.5 },  // F4
  { freq: 440.00, beats: 0.5 },  // A4
  { freq: 523.25, beats: 0.5 },  // C5
  { freq: 440.00, beats: 1 },    // A4
  { freq: 392.00, beats: 0.5 },  // G4
  { freq: 349.23, beats: 0.5 },  // F4
  { freq: 293.66, beats: 0.5 },  // D4
  { freq: 261.63, beats: 0.5 },  // C4
  { freq: 293.66, beats: 1 },    // D4
];
/** 전투 BGM 베이스라인 노트 */
const BGM_BATTLE_BASS = [
  { freq: 146.83, beats: 4 },  // D3
  { freq: 220.00, beats: 4 },  // A3
  { freq: 174.61, beats: 4 },  // F3
  { freq: 220.00, beats: 4 },  // A3
];
const BGM_BATTLE_BPM = 120;

/**
 * 보스 BGM 리드 노트 (B단조 펜타토닉).
 * BPM 160 => 1박 = 0.375초
 */
const BGM_BOSS_LEAD = [
  { freq: 246.94, beats: 0.5 },   // B3
  { freq: 293.66, beats: 0.5 },   // D4
  { freq: 246.94, beats: 0.25 },  // B3
  { freq: 293.66, beats: 0.25 },  // D4
  { freq: 369.99, beats: 1 },     // F#4
  { freq: 329.63, beats: 0.5 },   // E4
  { freq: 293.66, beats: 0.5 },   // D4
  { freq: 246.94, beats: 0.5 },   // B3
  { freq: 220.00, beats: 0.5 },   // A3
  { freq: 246.94, beats: 0.25 },  // B3
  { freq: 220.00, beats: 0.25 },  // A3
  { freq: 196.00, beats: 1 },     // G3
  { freq: 184.99, beats: 0.5 },   // F#3
  { freq: 196.00, beats: 0.5 },   // G3
  { freq: 220.00, beats: 0.5 },   // A3
  { freq: 246.94, beats: 0.5 },   // B3
];
const BGM_BOSS_BPM = 160;

export class SoundManager {
  /**
   * SoundManager를 생성한다.
   * AudioContext는 사용자 제스처 시점에 지연 초기화된다.
   */
  constructor() {
    /** @type {AudioContext|null} Web Audio API 컨텍스트 */
    this._ctx = null;

    /** @type {GainNode|null} 마스터 게인 노드 (음소거 제어) */
    this._masterGain = null;

    /** @type {GainNode|null} SFX 게인 노드 */
    this._sfxGain = null;

    /** @type {GainNode|null} BGM 게인 노드 */
    this._bgmGain = null;

    /** @type {number} SFX 볼륨 (0.0~1.0) */
    this.sfxVolume = 0.8;

    /** @type {number} BGM 볼륨 (0.0~1.0) */
    this.bgmVolume = 0.5;

    /** @type {boolean} 전역 음소거 플래그 */
    this.muted = false;

    /** @type {string|null} 현재 재생 중인 BGM ID */
    this._currentBgmId = null;

    /** @type {number|null} BGM 스케줄러 setInterval ID */
    this._bgmIntervalId = null;

    /** @type {number} BGM 시퀀스의 현재 노트 인덱스 */
    this._bgmNoteIndex = 0;

    /** @type {number} 다음 노트 예약 시각 (AudioContext 시간 기준) */
    this._bgmNextNoteTime = 0;

    /** @type {OscillatorNode[]} 정리용 활성 BGM 오실레이터 노드 배열 */
    this._bgmActiveNodes = [];

    /** @type {number} BGM 베이스 노트 인덱스 */
    this._bgmBassIndex = 0;

    /** @type {number} BGM 베이스 다음 노트 시각 */
    this._bgmBassNextTime = 0;

    /** @type {number} 활성 sfx_hit 수 (동시 재생 제한용) */
    this._hitCount = 0;

    /** @type {number} 활성 sfx_kill 수 (동시 재생 제한용) */
    this._killCount = 0;

    // 저장된 설정 로드
    this._loadSettings();
  }

  // ── 오디오 컨텍스트 ────────────────────────────────────────────

  /**
   * AudioContext를 생성하고 resume한다.
   * 사용자 제스처 핸들러 내에서 호출해야 한다 (브라우저 자동재생 정책).
   * @returns {AudioContext|null} 생성된 컨텍스트, 또는 실패 시 null
   * @private
   */
  _ensureContext() {
    try {
      if (!this._ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this._ctx = new AudioCtx();

        // 게인 노드 트리 구축: SFX/BGM -> Master -> Destination
        this._masterGain = this._ctx.createGain();
        this._masterGain.connect(this._ctx.destination);

        this._sfxGain = this._ctx.createGain();
        this._sfxGain.connect(this._masterGain);

        this._bgmGain = this._ctx.createGain();
        this._bgmGain.connect(this._masterGain);

        this._applyVolumes();
      }

      // suspended 상태이면 resume (사용자 제스처 필요)
      if (this._ctx.state === 'suspended') {
        this._ctx.resume();
      }

      return this._ctx;
    } catch (e) {
      return null;
    }
  }

  /**
   * 현재 볼륨/음소거 설정을 게인 노드에 반영한다.
   * @private
   */
  _applyVolumes() {
    if (!this._masterGain) return;
    this._masterGain.gain.setValueAtTime(
      this.muted ? 0 : 1,
      this._ctx.currentTime
    );
    if (this._sfxGain) {
      this._sfxGain.gain.setValueAtTime(this.sfxVolume, this._ctx.currentTime);
    }
    if (this._bgmGain) {
      this._bgmGain.gain.setValueAtTime(this.bgmVolume, this._ctx.currentTime);
    }
  }

  // ── SFX ─────────────────────────────────────────────────────────

  /**
   * ID로 효과음을 재생한다.
   * @param {string} id - SFX 식별자 ('sfx_fire', 'sfx_hit', 'sfx_kill' 등)
   * @param {object} [opts] - 옵션 (sfx_fire: towerType, sfx_wave_clear: bossRound, sfx_base_hit: hpRatio)
   */
  playSfx(id, opts = {}) {
    const ctx = this._ensureContext();
    if (!ctx) return;

    try {
      switch (id) {
        case 'sfx_fire':
          this._playSfxFire(ctx, opts.towerType || 'archer');
          break;
        case 'sfx_hit':
          this._playSfxHit(ctx);
          break;
        case 'sfx_kill':
          this._playSfxKill(ctx);
          break;
        case 'sfx_kill_boss':
          this._playSfxKillBoss(ctx);
          break;
        case 'sfx_boss_appear':
          this._playSfxBossAppear(ctx);
          break;
        case 'sfx_base_hit':
          this._playSfxBaseHit(ctx, opts.hpRatio);
          break;
        case 'sfx_wave_clear':
          this._playSfxWaveClear(ctx, opts.bossRound || false);
          break;
        case 'sfx_game_over':
          this._playSfxGameOver(ctx);
          break;
      }
    } catch (e) {
      // 오디오 오류 무시
    }
  }

  /**
   * 타워 타입별 발사 SFX를 재생한다.
   * FIRE_PARAMS 테이블에서 파형, 시작/종료 주파수, 지속 시간을 참조한다.
   * @param {AudioContext} ctx - 오디오 컨텍스트
   * @param {string} towerType - 타워 타입
   * @private
   */
  _playSfxFire(ctx, towerType) {
    const params = FIRE_PARAMS[towerType] || FIRE_PARAMS.archer;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);

    osc.type = params.waveform;
    osc.frequency.setValueAtTime(params.freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(params.freqEnd, t + params.duration);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + params.duration);

    osc.start(t);
    osc.stop(t + params.duration);
  }

  /**
   * 적 명중 SFX를 재생한다 (동시 재생 최대 3개로 제한).
   * @param {AudioContext} ctx - 오디오 컨텍스트
   * @private
   */
  _playSfxHit(ctx) {
    if (this._hitCount >= MAX_HIT_CONCURRENT) return;
    this._hitCount++;

    const t = ctx.currentTime;
    const dur = 0.05;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + dur);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.001, t + dur);

    osc.start(t);
    osc.stop(t + dur);
    osc.onended = () => { this._hitCount--; };
  }

  /**
   * 적 처치 SFX를 재생한다 (동시 재생 최대 2개로 제한).
   * @param {AudioContext} ctx - 오디오 컨텍스트
   * @private
   */
  _playSfxKill(ctx) {
    if (this._killCount >= MAX_KILL_CONCURRENT) return;
    this._killCount++;

    const t = ctx.currentTime;
    const dur = 0.08;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + dur);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.001, t + dur);

    osc.start(t);
    osc.stop(t + dur);
    osc.onended = () => { this._killCount--; };
  }

  /**
   * 보스 처치 SFX를 재생한다 (3레이어 동시 재생).
   * sine + square + sawtooth 파형을 겹쳐 묵직한 효과를 만든다.
   * @param {AudioContext} ctx - 오디오 컨텍스트
   * @private
   */
  _playSfxKillBoss(ctx) {
    const t = ctx.currentTime;

    // 레이어 1: sine 500->100 Hz, 0.8초
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1);
    g1.connect(this._sfxGain);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(500, t);
    osc1.frequency.exponentialRampToValueAtTime(100, t + 0.8);
    g1.gain.setValueAtTime(0.4, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc1.start(t);
    osc1.stop(t + 0.8);

    // 레이어 2: square 250->50 Hz, 0.8초
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2);
    g2.connect(this._sfxGain);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(250, t);
    osc2.frequency.exponentialRampToValueAtTime(50, t + 0.8);
    g2.gain.setValueAtTime(0.2, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc2.start(t);
    osc2.stop(t + 0.8);

    // 레이어 3: sawtooth 1000->200 Hz, 0.5초
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.connect(g3);
    g3.connect(this._sfxGain);
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(1000, t);
    osc3.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    g3.gain.setValueAtTime(0.15, t);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc3.start(t);
    osc3.stop(t + 0.5);
  }

  /**
   * 보스 등장 SFX를 재생한다 (2레이어 경고음).
   * 저음 sawtooth + 중음 sine으로 위협적인 느낌을 만든다.
   * @param {AudioContext} ctx - 오디오 컨텍스트
   * @private
   */
  _playSfxBossAppear(ctx) {
    const t = ctx.currentTime;

    // 레이어 1 (저음): sawtooth 80->60 Hz, 1.5초
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1);
    g1.connect(this._sfxGain);
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, t);
    osc1.frequency.exponentialRampToValueAtTime(60, t + 1.5);
    g1.gain.setValueAtTime(0.5, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc1.start(t);
    osc1.stop(t + 1.5);

    // 레이어 2 (경고): sine 200->150 Hz, 1.0초
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2);
    g2.connect(this._sfxGain);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(200, t);
    osc2.frequency.exponentialRampToValueAtTime(150, t + 1.0);
    g2.gain.setValueAtTime(0.3, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    osc2.start(t);
    osc2.stop(t + 1.0);
  }

  /**
   * 기지 피격 SFX를 재생한다 (사이렌 효과).
   * HP 비율이 25% 이하이면 볼륨이 약간 상승한다.
   * @param {AudioContext} ctx - 오디오 컨텍스트
   * @param {number} [hpRatio=1] - 현재 HP 비율 (0~1, 볼륨 조절용)
   * @private
   */
  _playSfxBaseHit(ctx, hpRatio = 1) {
    const t = ctx.currentTime;
    const dur = 0.4;
    // HP 25% 이하이면 볼륨 1.2배 (최대 0.5)
    const vol = hpRatio != null && hpRatio <= 0.25 ? Math.min(0.5, 0.4 * 1.2) : 0.4;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);

    osc.type = 'sawtooth';
    // 440 -> 880 -> 440 Hz 사이렌 패턴
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.2);
    osc.frequency.linearRampToValueAtTime(440, t + dur);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.start(t);
    osc.stop(t + dur);
  }

  /**
   * 웨이브 클리어 SFX를 재생한다 (상승 3음 팡파레).
   * 보스 라운드이면 1옥타브 높게 재생한다.
   * @param {AudioContext} ctx - 오디오 컨텍스트
   * @param {boolean} bossRound - 보스 라운드 여부
   * @private
   */
  _playSfxWaveClear(ctx, bossRound) {
    const t = ctx.currentTime;
    const mult = bossRound ? 2 : 1; // 보스 라운드: 1옥타브 위

    // 음1: C5 (523 Hz)
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1);
    g1.connect(this._sfxGain);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523 * mult, t);
    g1.gain.setValueAtTime(0.4, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc1.start(t);
    osc1.stop(t + 0.15);

    // 음2: E5 (659 Hz), 0.12초 지연
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2);
    g2.connect(this._sfxGain);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659 * mult, t + 0.12);
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.setValueAtTime(0.4, t + 0.12);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.27);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.27);

    // 음3: G5 (784 Hz), 0.24초 지연
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.connect(g3);
    g3.connect(this._sfxGain);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(784 * mult, t + 0.24);
    g3.gain.setValueAtTime(0.001, t);
    g3.gain.setValueAtTime(0.5, t + 0.24);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.50);
    osc3.start(t + 0.24);
    osc3.stop(t + 0.50);
  }

  /**
   * 게임 오버 SFX를 재생한다 (하강 2음 장송곡).
   * @param {AudioContext} ctx - 오디오 컨텍스트
   * @private
   */
  _playSfxGameOver(ctx) {
    const t = ctx.currentTime;

    // 음1: sawtooth 300->200 Hz, 0.5초
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1);
    g1.connect(this._sfxGain);
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(300, t);
    osc1.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    g1.gain.setValueAtTime(0.4, t);
    g1.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    osc1.start(t);
    osc1.stop(t + 0.5);

    // 음2: sawtooth 200->100 Hz, 0.6초 (t+0.4부터 시작)
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2);
    g2.connect(this._sfxGain);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(200, t + 0.4);
    osc2.frequency.exponentialRampToValueAtTime(100, t + 1.0);
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.setValueAtTime(0.4, t + 0.4);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    osc2.start(t + 0.4);
    osc2.stop(t + 1.0);
  }

  // ── BGM ─────────────────────────────────────────────────────────

  /**
   * BGM 트랙을 시작한다. 기존 재생 중인 BGM은 즉시 중지한다.
   * @param {string} id - BGM 식별자 ('menu', 'battle', 'boss')
   */
  playBgm(id) {
    const ctx = this._ensureContext();
    if (!ctx) return;

    // 현재 BGM 즉시 중지
    if (this._currentBgmId) {
      this.stopBgm(false);
    }

    this._currentBgmId = id;
    this._bgmNoteIndex = 0;
    this._bgmBassIndex = 0;
    this._bgmNextNoteTime = ctx.currentTime + 0.1;
    this._bgmBassNextTime = ctx.currentTime + 0.1;

    // 스케줄러 루프 시작 (100ms 간격으로 노트 예약)
    this._bgmIntervalId = setInterval(() => {
      this._scheduleBgmNotes();
    }, 100);
  }

  /**
   * 현재 BGM을 중지한다.
   * @param {boolean} [fadeOut=false] - true이면 1초 페이드아웃, false이면 즉시 중지
   */
  stopBgm(fadeOut = false) {
    if (this._bgmIntervalId !== null) {
      clearInterval(this._bgmIntervalId);
      this._bgmIntervalId = null;
    }

    // 모든 활성 BGM 노드 정지
    for (const node of this._bgmActiveNodes) {
      try {
        if (fadeOut && node._gainNode) {
          const t = this._ctx.currentTime;
          node._gainNode.gain.setValueAtTime(node._gainNode.gain.value, t);
          node._gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
          node.stop(t + 1.0);
        } else {
          node.stop();
        }
      } catch (e) {
        // 이미 정지된 노드일 수 있음
      }
    }
    this._bgmActiveNodes = [];
    this._currentBgmId = null;
  }

  /**
   * 예정된 BGM 노트를 스케줄링한다 (룩어헤드 스케줄링 패턴).
   * setInterval에 의해 100ms마다 호출된다.
   * @private
   */
  _scheduleBgmNotes() {
    if (!this._ctx || !this._currentBgmId) return;

    const lookahead = 0.15; // 미리 예약할 시간 (초)
    const now = this._ctx.currentTime;

    switch (this._currentBgmId) {
      case 'menu':
        this._scheduleMenuNotes(now, lookahead);
        break;
      case 'battle':
        this._scheduleBattleNotes(now, lookahead);
        break;
      case 'boss':
        this._scheduleBossNotes(now, lookahead);
        break;
    }

    // 종료된 노드 정리
    this._bgmActiveNodes = this._bgmActiveNodes.filter(n => {
      try {
        return n._endTime > now;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * 메뉴 BGM 노트를 스케줄링한다.
   * C단조 펜타토닉 아르페지오를 sine 파형으로 반복한다.
   * @param {number} now - 현재 AudioContext 시간
   * @param {number} lookahead - 룩어헤드 윈도우 (초)
   * @private
   */
  _scheduleMenuNotes(now, lookahead) {
    const beatDur = 60 / BGM_MENU_BPM; // 1.0초/박
    const notes = BGM_MENU_NOTES;

    while (this._bgmNextNoteTime < now + lookahead) {
      const note = notes[this._bgmNoteIndex % notes.length];
      const noteDur = note.beats * beatDur;
      this._playBgmNote(
        note.freq, this._bgmNextNoteTime, noteDur,
        'sine', 0.15, 0.3
      );

      this._bgmNextNoteTime += noteDur;
      this._bgmNoteIndex++;
    }
  }

  /**
   * 전투 BGM 노트를 스케줄링한다 (멜로디 + 베이스라인).
   * D단조 멜로디를 square 파형, 베이스를 sine 파형으로 재생한다.
   * @param {number} now - 현재 AudioContext 시간
   * @param {number} lookahead - 룩어헤드 윈도우 (초)
   * @private
   */
  _scheduleBattleNotes(now, lookahead) {
    const beatDur = 60 / BGM_BATTLE_BPM; // 0.5초/박

    // 멜로디 스케줄링
    const melody = BGM_BATTLE_MELODY;
    while (this._bgmNextNoteTime < now + lookahead) {
      const note = melody[this._bgmNoteIndex % melody.length];
      const noteDur = note.beats * beatDur;
      this._playBgmNote(
        note.freq, this._bgmNextNoteTime, noteDur,
        'square', 0.2, 0.35
      );
      this._bgmNextNoteTime += noteDur;
      this._bgmNoteIndex++;
    }

    // 베이스라인 스케줄링
    const bass = BGM_BATTLE_BASS;
    while (this._bgmBassNextTime < now + lookahead) {
      const note = bass[this._bgmBassIndex % bass.length];
      const noteDur = note.beats * beatDur;
      this._playBgmNote(
        note.freq, this._bgmBassNextTime, noteDur,
        'sine', 0.15, 0.35
      );
      this._bgmBassNextTime += noteDur;
      this._bgmBassIndex++;
    }
  }

  /**
   * 보스 BGM 노트를 스케줄링한다 (리드 멜로디 + 펄스 베이스).
   * B단조 펜타토닉 리드를 sawtooth 파형, 펄스 베이스를 square 파형으로 재생한다.
   * @param {number} now - 현재 AudioContext 시간
   * @param {number} lookahead - 룩어헤드 윈도우 (초)
   * @private
   */
  _scheduleBossNotes(now, lookahead) {
    const beatDur = 60 / BGM_BOSS_BPM; // 0.375초/박

    // 리드 멜로디 스케줄링
    const lead = BGM_BOSS_LEAD;
    while (this._bgmNextNoteTime < now + lookahead) {
      const note = lead[this._bgmNoteIndex % lead.length];
      const noteDur = note.beats * beatDur;
      this._playBgmNote(
        note.freq, this._bgmNextNoteTime, noteDur,
        'sawtooth', 0.25, 0.4
      );
      this._bgmNextNoteTime += noteDur;
      this._bgmNoteIndex++;
    }

    // 펄스 베이스: B2 (123.47Hz), 0.5박 재생 + 0.5박 무음 반복
    const bassBeatDur = 0.5 * beatDur;
    while (this._bgmBassNextTime < now + lookahead) {
      this._playBgmNote(
        123.47, this._bgmBassNextTime, bassBeatDur,
        'square', 0.18, 0.4
      );
      this._bgmBassNextTime += bassBeatDur * 2; // 재생 + 무음
      this._bgmBassIndex++;
    }
  }

  /**
   * OscillatorNode + GainNode로 단일 BGM 노트를 재생한다.
   * ADSR 엔벨로프(attack -> sustain -> release)를 적용한다.
   * @param {number} freq - 주파수 (Hz)
   * @param {number} startTime - AudioContext 시작 시간
   * @param {number} duration - 노트 지속 시간 (초)
   * @param {OscillatorType} waveform - 오실레이터 파형 타입
   * @param {number} noteGain - 노트 게인 값
   * @param {number} bgmLevelGain - BGM 레벨 게인 (API 일관성용, 미사용)
   * @private
   */
  _playBgmNote(freq, startTime, duration, waveform, noteGain, bgmLevelGain) {
    if (!this._ctx || !this._bgmGain) return;

    try {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.connect(gain);
      gain.connect(this._bgmGain);

      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, startTime);

      // ADSR 엔벨로프: attack(0.02초) -> sustain -> release
      const attackTime = 0.02;
      const releaseTime = Math.min(0.1, duration * 0.3);
      const sustainEnd = startTime + duration - releaseTime;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(noteGain, startTime + attackTime);
      if (sustainEnd > startTime + attackTime) {
        gain.gain.setValueAtTime(noteGain, sustainEnd);
      }
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);

      // 정리 추적용 메타데이터
      osc._endTime = startTime + duration + 0.05;
      osc._gainNode = gain;
      this._bgmActiveNodes.push(osc);
    } catch (e) {
      // 오류 무시
    }
  }

  // ── 볼륨 제어 ──────────────────────────────────────────────────

  /**
   * SFX 볼륨을 설정한다.
   * @param {number} v - 볼륨 (0.0~1.0)
   */
  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this._sfxGain && this._ctx) {
      this._sfxGain.gain.setValueAtTime(this.sfxVolume, this._ctx.currentTime);
    }
    this._saveSettings();
  }

  /**
   * BGM 볼륨을 설정한다.
   * @param {number} v - 볼륨 (0.0~1.0)
   */
  setBgmVolume(v) {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this._bgmGain && this._ctx) {
      this._bgmGain.gain.setValueAtTime(this.bgmVolume, this._ctx.currentTime);
    }
    this._saveSettings();
  }

  /**
   * 전역 음소거 상태를 설정한다.
   * @param {boolean} muted - 음소거 여부
   */
  setMuted(muted) {
    this.muted = muted;
    if (this._masterGain && this._ctx) {
      this._masterGain.gain.setValueAtTime(
        this.muted ? 0 : 1,
        this._ctx.currentTime
      );
    }
    this._saveSettings();
  }

  // ── 설정 저장/로드 ─────────────────────────────────────────────

  /**
   * 사운드 설정을 localStorage에 저장한다.
   * @private
   */
  _saveSettings() {
    try {
      localStorage.setItem(SOUND_SAVE_KEY, JSON.stringify({
        sfxVolume: this.sfxVolume,
        bgmVolume: this.bgmVolume,
        muted: this.muted,
      }));
    } catch (e) {
      // localStorage 사용 불가 시 무시
    }
  }

  /**
   * localStorage에서 사운드 설정을 로드한다.
   * @private
   */
  _loadSettings() {
    try {
      const raw = localStorage.getItem(SOUND_SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.sfxVolume === 'number') this.sfxVolume = data.sfxVolume;
        if (typeof data.bgmVolume === 'number') this.bgmVolume = data.bgmVolume;
        if (typeof data.muted === 'boolean') this.muted = data.muted;
      }
    } catch (e) {
      // 기본값 사용
    }
  }

  // ── 정리 ───────────────────────────────────────────────────────

  /**
   * SoundManager를 파괴하고 모든 리소스를 해제한다.
   * AudioContext를 닫고 모든 BGM 노드를 정지한다.
   */
  destroy() {
    this.stopBgm(false);
    if (this._ctx) {
      try {
        this._ctx.close();
      } catch (e) {
        // 무시
      }
      this._ctx = null;
    }
    this._masterGain = null;
    this._sfxGain = null;
    this._bgmGain = null;
  }
}
