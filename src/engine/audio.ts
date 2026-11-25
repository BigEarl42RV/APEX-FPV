/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
/**
 * Procedural Web Audio API synthesizer for realistic FPV brushless motor hum,
 * prop wash turbulence, wind rush, gate split chimes, and impact transients.
 */
class FpvAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private motorOscA: OscillatorNode | null = null;
  private motorOscB: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private muted = false;
  private initialized = false;

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.32;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Dual harmonic motor oscillators (blade pass fundamental + 2nd harmonic)
      const motorGain = ctx.createGain();
      motorGain.gain.value = 0;

      const motorFilter = ctx.createBiquadFilter();
      motorFilter.type = 'bandpass';
      motorFilter.frequency.value = 520;
      motorFilter.Q.value = 1.4;

      const oscA = ctx.createOscillator();
      oscA.type = 'sawtooth';
      oscA.frequency.value = 140;

      const oscB = ctx.createOscillator();
      oscB.type = 'triangle';
      oscB.frequency.value = 282;

      oscA.connect(motorFilter);
      oscB.connect(motorFilter);
      motorFilter.connect(motorGain);
      motorGain.connect(master);

      oscA.start();
      oscB.start();

      this.motorOscA = oscA;
      this.motorOscB = oscB;
      this.motorGain = motorGain;

      // White noise buffer for propwash & wind rush
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 400;
      windFilter.Q.value = 0.7;

      const windGain = ctx.createGain();
      windGain.gain.value = 0;

      noiseSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      noiseSource.start();

      this.windFilter = windFilter;
      this.windGain = windGain;
      this.initialized = true;
    } catch {
      // Audio unavailable
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.32, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateFlightSound(
    armed: boolean,
    throttle: number,
    speedMs: number,
    avgRpmNorm: number
  ): void {
    if (!this.initialized || !this.ctx || !this.motorOscA || !this.motorOscB || !this.motorGain || !this.windGain || !this.windFilter) {
      return;
    }
    const t = this.ctx.currentTime;
    if (!armed || this.muted) {
      this.motorGain.gain.setTargetAtTime(0, t, 0.06);
      this.windGain.gain.setTargetAtTime(0, t, 0.08);
      return;
    }

    const rpmFactor = Math.max(0.14, Math.min(1.25, avgRpmNorm));
    const baseFreq = 115 + rpmFactor * 365;
    this.motorOscA.frequency.setTargetAtTime(baseFreq, t, 0.03);
    this.motorOscB.frequency.setTargetAtTime(baseFreq * 2.02, t, 0.03);

    const mGain = 0.04 + throttle * 0.16 + rpmFactor * 0.06;
    this.motorGain.gain.setTargetAtTime(Math.min(0.28, mGain), t, 0.04);

    const speedNorm = Math.min(1, speedMs / 48);
    this.windFilter.frequency.setTargetAtTime(280 + speedNorm * 1400, t, 0.05);
    this.windGain.gain.setTargetAtTime(0.02 + speedNorm * 0.22, t, 0.05);
  }

  public playGatePass(isLapComplete: boolean): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const freqs = isLapComplete ? [587.33, 783.99, 1046.5, 1318.5] : [659.25, 987.77];

    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.055);
      gain.gain.setValueAtTime(0.001, t + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.24, t + idx * 0.055 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.24);
    });
  }

  public playCountdownBeep(go: boolean): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(go ? 987.77 : 493.88, t);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (go ? 0.3 : 0.14));
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + (go ? 0.32 : 0.16));
  }

  public playImpact(severity: number): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140 + severity * 60, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    gain.gain.setValueAtTime(Math.min(0.45, 0.14 + severity * 0.25), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playLaserPulse(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1240, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.13);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playHitConfirm(eliminated: boolean): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const freqs = eliminated ? [880, 1174.66, 1567.98] : [920, 1240];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.045);
      gain.gain.setValueAtTime(0.22, t + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.045 + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.045);
      osc.stop(t + idx * 0.045 + 0.18);
    });
  }

  public playShieldHit(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.22);
    gain.gain.setValueAtTime(0.26, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playTagTransfer(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 1046.5].forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.05);
      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.2);
    });
  }
}

export const fpvAudio = new FpvAudioEngine();
