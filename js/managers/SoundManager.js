/**
 * @fileoverview SoundManager - Web Audio API based procedural SFX + BGM manager.
 * All sounds are synthesized at runtime using OscillatorNode + GainNode.
 * No external audio files are used.
 *
 * SFX: fire, hit, kill, kill_boss, boss_appear, base_hit, wave_clear, game_over
 * BGM: menu, battle, boss (note sequencer loop via setInterval)
 *
 * Depends only on Web Audio API. No Phaser dependency.
 */

/** @const {string} localStorage key for sound settings */
const SOUND_SAVE_KEY = 'fantasy-td-sound';

/** @const {number} Max concurrent sfx_hit instances */
const MAX_HIT_CONCURRENT = 3;

/** @const {number} Max concurrent sfx_kill instances */
const MAX_KILL_CONCURRENT = 2;

/**
 * Tower-specific fire SFX parameters.
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

/**
 * BGM menu note sequence (C minor pentatonic arpeggio).
 * Each entry: { freq: Hz, beats: number }
 * BPM 60 => 1 beat = 1.0s
 */
const BGM_MENU_NOTES = [
  { freq: 130.81, beats: 1 },   // C3
  { freq: 155.56, beats: 1 },   // Eb3
  { freq: 196.00, beats: 2 },   // G3 (long)
  { freq: 233.08, beats: 1 },   // Bb3
  { freq: 261.63, beats: 1 },   // C4
  { freq: 233.08, beats: 1 },   // Bb3
  { freq: 196.00, beats: 1 },   // G3
];
const BGM_MENU_BPM = 60;

/**
 * BGM battle melody notes (D minor).
 * BPM 120 => 1 beat = 0.5s
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
const BGM_BATTLE_BASS = [
  { freq: 146.83, beats: 4 },  // D3
  { freq: 220.00, beats: 4 },  // A3 (corrected from A2 to A3)
  { freq: 174.61, beats: 4 },  // F3
  { freq: 220.00, beats: 4 },  // A3
];
const BGM_BATTLE_BPM = 120;

/**
 * BGM boss lead notes (B minor pentatonic).
 * BPM 160 => 1 beat = 0.375s
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
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx = null;

    /** @type {GainNode|null} */
    this._masterGain = null;

    /** @type {GainNode|null} */
    this._sfxGain = null;

    /** @type {GainNode|null} */
    this._bgmGain = null;

    /** @type {number} SFX volume 0.0~1.0 */
    this.sfxVolume = 0.8;

    /** @type {number} BGM volume 0.0~1.0 */
    this.bgmVolume = 0.5;

    /** @type {boolean} Global mute flag */
    this.muted = false;

    /** @type {string|null} Currently playing BGM id */
    this._currentBgmId = null;

    /** @type {number|null} BGM scheduler interval ID */
    this._bgmIntervalId = null;

    /** @type {number} Current note index in BGM sequence */
    this._bgmNoteIndex = 0;

    /** @type {number} Next note scheduled time (AudioContext time) */
    this._bgmNextNoteTime = 0;

    /** @type {OscillatorNode[]} Active BGM oscillator nodes for cleanup */
    this._bgmActiveNodes = [];

    /** @type {number} BGM bass note index */
    this._bgmBassIndex = 0;

    /** @type {number} BGM bass next note time */
    this._bgmBassNextTime = 0;

    /** @type {number} Active sfx_hit count */
    this._hitCount = 0;

    /** @type {number} Active sfx_kill count */
    this._killCount = 0;

    // Load saved settings
    this._loadSettings();
  }

  /**
   * Ensure AudioContext is created and resumed.
   * Must be called within a user gesture handler.
   * @returns {AudioContext|null}
   * @private
   */
  _ensureContext() {
    try {
      if (!this._ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this._ctx = new AudioCtx();

        // Build gain node tree
        this._masterGain = this._ctx.createGain();
        this._masterGain.connect(this._ctx.destination);

        this._sfxGain = this._ctx.createGain();
        this._sfxGain.connect(this._masterGain);

        this._bgmGain = this._ctx.createGain();
        this._bgmGain.connect(this._masterGain);

        this._applyVolumes();
      }

      if (this._ctx.state === 'suspended') {
        this._ctx.resume();
      }

      return this._ctx;
    } catch (e) {
      return null;
    }
  }

  /**
   * Apply current volume/mute settings to gain nodes.
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

  // ── SFX ──────────────────────────────────────────────────────────

  /**
   * Play a sound effect by ID.
   * @param {string} id - SFX identifier (e.g. 'sfx_fire', 'sfx_hit')
   * @param {object} [opts] - Options (towerType for sfx_fire, bossRound for sfx_wave_clear, hpRatio for sfx_base_hit)
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
      // Silently ignore audio errors
    }
  }

  /**
   * Play tower fire SFX with tower-type-specific sound.
   * @param {AudioContext} ctx
   * @param {string} towerType
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
   * Play enemy hit SFX (concurrency limited to 3).
   * @param {AudioContext} ctx
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
   * Play enemy kill SFX (concurrency limited to 2).
   * @param {AudioContext} ctx
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
   * Play boss kill SFX (3-layer simultaneous).
   * @param {AudioContext} ctx
   * @private
   */
  _playSfxKillBoss(ctx) {
    const t = ctx.currentTime;

    // Layer 1: sine 500->100 Hz, 0.8s
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

    // Layer 2: square 250->50 Hz, 0.8s
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

    // Layer 3: sawtooth 1000->200 Hz, 0.5s
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
   * Play boss appear SFX (2-layer warning tone).
   * @param {AudioContext} ctx
   * @private
   */
  _playSfxBossAppear(ctx) {
    const t = ctx.currentTime;

    // Layer 1 (bass): sawtooth 80->60 Hz, 1.5s
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

    // Layer 2 (warning): sine 200->150 Hz, 1.0s
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
   * Play base hit SFX (siren).
   * @param {AudioContext} ctx
   * @param {number} [hpRatio=1] - Current HP ratio (0-1) for volume adjustment
   * @private
   */
  _playSfxBaseHit(ctx, hpRatio = 1) {
    const t = ctx.currentTime;
    const dur = 0.4;
    const vol = hpRatio != null && hpRatio <= 0.25 ? Math.min(0.5, 0.4 * 1.2) : 0.4;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.2);
    osc.frequency.linearRampToValueAtTime(440, t + dur);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.start(t);
    osc.stop(t + dur);
  }

  /**
   * Play wave clear SFX (ascending 3-note fanfare).
   * @param {AudioContext} ctx
   * @param {boolean} bossRound - If true, play 1 octave higher
   * @private
   */
  _playSfxWaveClear(ctx, bossRound) {
    const t = ctx.currentTime;
    const mult = bossRound ? 2 : 1;

    // Note 1: C5 (523 Hz)
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

    // Note 2: E5 (659 Hz)
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

    // Note 3: G5 (784 Hz)
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
   * Play game over SFX (descending 2-note dirge).
   * @param {AudioContext} ctx
   * @private
   */
  _playSfxGameOver(ctx) {
    const t = ctx.currentTime;

    // Note 1: sawtooth 300->200 Hz, 0.5s
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

    // Note 2: sawtooth 200->100 Hz, 0.6s (starts at t+0.4)
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

  // ── BGM ──────────────────────────────────────────────────────────

  /**
   * Start playing a BGM track.
   * @param {string} id - BGM identifier ('menu', 'battle', 'boss')
   */
  playBgm(id) {
    const ctx = this._ensureContext();
    if (!ctx) return;

    // Stop current BGM immediately
    if (this._currentBgmId) {
      this.stopBgm(false);
    }

    this._currentBgmId = id;
    this._bgmNoteIndex = 0;
    this._bgmBassIndex = 0;
    this._bgmNextNoteTime = ctx.currentTime + 0.1;
    this._bgmBassNextTime = ctx.currentTime + 0.1;

    // Start scheduler loop (100ms interval)
    this._bgmIntervalId = setInterval(() => {
      this._scheduleBgmNotes();
    }, 100);
  }

  /**
   * Stop current BGM.
   * @param {boolean} [fadeOut=false] - Whether to fade out (1s) or stop immediately
   */
  stopBgm(fadeOut = false) {
    if (this._bgmIntervalId !== null) {
      clearInterval(this._bgmIntervalId);
      this._bgmIntervalId = null;
    }

    // Stop all active BGM nodes
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
        // Node may already be stopped
      }
    }
    this._bgmActiveNodes = [];
    this._currentBgmId = null;
  }

  /**
   * Schedule upcoming BGM notes (lookahead scheduling pattern).
   * Called every 100ms by setInterval.
   * @private
   */
  _scheduleBgmNotes() {
    if (!this._ctx || !this._currentBgmId) return;

    const lookahead = 0.15; // seconds ahead to schedule
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

    // Cleanup finished nodes
    this._bgmActiveNodes = this._bgmActiveNodes.filter(n => {
      try {
        // Keep nodes that haven't ended yet
        return n._endTime > now;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Schedule menu BGM notes.
   * @param {number} now - Current AudioContext time
   * @param {number} lookahead - Lookahead window in seconds
   * @private
   */
  _scheduleMenuNotes(now, lookahead) {
    const beatDur = 60 / BGM_MENU_BPM; // 1.0s per beat
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
   * Schedule battle BGM notes (melody + bass).
   * @param {number} now - Current AudioContext time
   * @param {number} lookahead - Lookahead window in seconds
   * @private
   */
  _scheduleBattleNotes(now, lookahead) {
    const beatDur = 60 / BGM_BATTLE_BPM; // 0.5s per beat

    // Melody
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

    // Bass
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
   * Schedule boss BGM notes (lead + pulse bass).
   * @param {number} now - Current AudioContext time
   * @param {number} lookahead - Lookahead window in seconds
   * @private
   */
  _scheduleBossNotes(now, lookahead) {
    const beatDur = 60 / BGM_BOSS_BPM; // 0.375s per beat

    // Lead
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

    // Pulse bass: B2 (123.47) 0.5 beat on, 0.5 beat off
    const bassBeatDur = 0.5 * beatDur;
    while (this._bgmBassNextTime < now + lookahead) {
      this._playBgmNote(
        123.47, this._bgmBassNextTime, bassBeatDur,
        'square', 0.18, 0.4
      );
      this._bgmBassNextTime += bassBeatDur * 2; // on + off
      this._bgmBassIndex++;
    }
  }

  /**
   * Play a single BGM note using OscillatorNode + GainNode.
   * @param {number} freq - Frequency in Hz
   * @param {number} startTime - AudioContext start time
   * @param {number} duration - Note duration in seconds
   * @param {OscillatorType} waveform - Oscillator waveform type
   * @param {number} noteGain - Note gain value
   * @param {number} bgmLevelGain - BGM level gain (unused, kept for API consistency)
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

      // Envelope: attack -> sustain -> release
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

      // Track for cleanup
      osc._endTime = startTime + duration + 0.05;
      osc._gainNode = gain;
      this._bgmActiveNodes.push(osc);
    } catch (e) {
      // Silently ignore
    }
  }

  // ── Volume Controls ──────────────────────────────────────────────

  /**
   * Set SFX volume.
   * @param {number} v - Volume 0.0~1.0
   */
  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this._sfxGain && this._ctx) {
      this._sfxGain.gain.setValueAtTime(this.sfxVolume, this._ctx.currentTime);
    }
    this._saveSettings();
  }

  /**
   * Set BGM volume.
   * @param {number} v - Volume 0.0~1.0
   */
  setBgmVolume(v) {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this._bgmGain && this._ctx) {
      this._bgmGain.gain.setValueAtTime(this.bgmVolume, this._ctx.currentTime);
    }
    this._saveSettings();
  }

  /**
   * Set global mute state.
   * @param {boolean} muted
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

  // ── Persistence ──────────────────────────────────────────────────

  /**
   * Save sound settings to localStorage.
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
      // localStorage may be unavailable
    }
  }

  /**
   * Load sound settings from localStorage.
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
      // Use defaults
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────

  /**
   * Destroy the SoundManager and release all resources.
   */
  destroy() {
    this.stopBgm(false);
    if (this._ctx) {
      try {
        this._ctx.close();
      } catch (e) {
        // Ignore
      }
      this._ctx = null;
    }
    this._masterGain = null;
    this._sfxGain = null;
    this._bgmGain = null;
  }
}
