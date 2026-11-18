import { WeaponId } from '../types/game';

export type MusicMood = 'menu' | 'combat' | 'boss' | 'silent';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private masterVol = 0.75;
  private musicVol = 0.55;
  private sfxVol = 0.85;

  private currentMood: MusicMood = 'silent';
  private musicTimer: number | null = null;
  private stepIndex = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVol;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.masterGain);

      // Create reusable 1.5s white noise buffer for explosions, thrusters, and gunfire
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 1.5);
      this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setVolumes(master: number, music: number, sfx: number): void {
    this.masterVol = master;
    this.musicVol = music;
    this.sfxVol = sfx;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(master, this.ctx.currentTime, 0.04);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(music, this.ctx.currentTime, 0.04);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.04);
    }
  }

  public setMusicMood(mood: MusicMood): void {
    if (this.currentMood === mood) return;
    this.currentMood = mood;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (mood === 'silent') return;

    const tempoMs = mood === 'boss' ? 160 : mood === 'combat' ? 210 : 380;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.musicVol <= 0.01) return;
      this.playMusicStep(mood, this.stepIndex++);
    }, tempoMs);
  }

  private playMusicStep(mood: MusicMood, step: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;

    // Dark sci-fi minor scale (D minor / Phrygian)
    const bassNotesMenu = [73.42, 73.42, 87.31, 65.41]; // D2, D2, F2, C2
    const bassNotesCombat = [73.42, 73.42, 77.78, 73.42, 87.31, 73.42, 65.41, 69.3];
    const arpCombat = [293.66, 349.23, 440.0, 311.13, 293.66, 523.25, 440.0, 349.23];

    if (mood === 'menu') {
      if (step % 4 === 0) {
        const freq = bassNotesMenu[Math.floor(step / 4) % bassNotesMenu.length];
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, now);
        filter.frequency.exponentialRampToValueAtTime(90, now + 1.3);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 1.5);
      }
      if (step % 2 === 0) {
        const note = arpCombat[step % arpCombat.length] * 0.5;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.7);
      }
      return;
    }

    // Combat or Boss driving synth pulse
    const bassFreq = bassNotesCombat[step % bassNotesCombat.length];
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = mood === 'boss' ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(bassFreq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(mood === 'boss' ? 420 : 280, now);
    filter.frequency.exponentialRampToValueAtTime(85, now + 0.18);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.2);

    // Kick on beat 0, 4
    if (step % 4 === 0) {
      const kick = ctx.createOscillator();
      const kGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(125, now);
      kick.frequency.exponentialRampToValueAtTime(34, now + 0.14);
      kGain.gain.setValueAtTime(0.22, now);
      kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      kick.connect(kGain);
      kGain.connect(this.musicGain);
      kick.start(now);
      kick.stop(now + 0.17);
    }

    // High-energy sci-fi arp
    if (mood === 'boss' || step % 2 === 1) {
      const arpFreq = arpCombat[(step * (mood === 'boss' ? 3 : 1)) % arpCombat.length];
      const aOsc = ctx.createOscillator();
      const aGain = ctx.createGain();
      aOsc.type = 'triangle';
      aOsc.frequency.setValueAtTime(arpFreq, now);
      aGain.gain.setValueAtTime(mood === 'boss' ? 0.065 : 0.04, now);
      aGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      aOsc.connect(aGain);
      aGain.connect(this.musicGain);
      aOsc.start(now);
      aOsc.stop(now + 0.16);
    }
  }

  public playMenuClick(pitch = 680): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.45, now + 0.06);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playWeaponFire(weapon: WeaponId): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;

    if (weapon === 'pulse') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(860 + Math.random() * 90, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.11);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (weapon === 'scatter') {
      // Heavy flak punch + filtered noise burst
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);

      if (this.noiseBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, now);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.28, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        src.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        src.start(now);
        src.stop(now + 0.24);
      }
    } else {
      // Valkyrie Rail Lance: high-voltage snap + downward sci-fi laser tail
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(1600, now);
      osc1.frequency.exponentialRampToValueAtTime(95, now + 0.34);
      osc2.frequency.setValueAtTime(2400, now);
      osc2.frequency.exponentialRampToValueAtTime(210, now + 0.26);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.37);
      osc2.stop(now + 0.37);
    }
  }

  public playReload(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [0, 0.22].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 0 ? 320 : 540, now + offset);
      osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 180 : 720, now + offset + 0.08);
      gain.gain.setValueAtTime(0.09, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });
  }

  public playEnemyShot(isBoss = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isBoss ? 360 : 540, now);
    osc.frequency.exponentialRampToValueAtTime(isBoss ? 75 : 130, now + 0.16);
    gain.gain.setValueAtTime(isBoss ? 0.16 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playHitMarker(isKill = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isKill ? 1280 : 960, now);
    osc.frequency.exponentialRampToValueAtTime(isKill ? 1760 : 620, now + 0.07);
    gain.gain.setValueAtTime(isKill ? 0.18 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playExplosion(scale = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const dur = 0.55 * Math.min(1.8, scale);

    // Sub boom
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + dur);
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + dur);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.32, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + dur + 0.02);
    }
  }

  public playGravityPulse(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.48);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playGravityLift(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.35);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      gain.gain.setValueAtTime(0.1, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.13);
    });
  }

  public playPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playMissionComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [392.0, 493.88, 587.33, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.16, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.46);
    });
  }

  public playRobotServo(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(110 + Math.random() * 40, now);
    osc.frequency.linearRampToValueAtTime(145, now + 0.08);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export const soundEngine = new SoundEngine();
