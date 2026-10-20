/**
 * Procedural Web Audio Engine for Tesla Roadster Game
 * Synthesizes electric motor whines, 62Hz suction downforce turbine resonance,
 * cold gas thruster hiss, and ground impact impulses entirely in real time.
 */

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private motor: { osc: OscillatorNode; gain: GainNode } | null = null;
  private hum: { osc: OscillatorNode; gain: GainNode } | null = null;
  private hiss: { gain: GainNode; filter: BiquadFilterNode } | null = null;

  public enabled: boolean = true;
  public volume: number = 0.5;

  public ensure(): void {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        this.ctx = ctx;

        this.master = ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(ctx.destination);

        // 2-second looped white noise buffer for thrusters & impacts
        const sampleRate = ctx.sampleRate;
        const bufferSize = 2 * sampleRate;
        this.noise = ctx.createBuffer(1, bufferSize, sampleRate);
        const noiseData = this.noise.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          noiseData[i] = Math.random() * 2 - 1;
        }

        // 1. Electric Powertrain Motor Whine (Sawtooth through 900Hz lowpass)
        const motorOsc = ctx.createOscillator();
        motorOsc.type = 'sawtooth';
        const motorFilter = ctx.createBiquadFilter();
        motorFilter.type = 'lowpass';
        motorFilter.frequency.value = 900;
        const motorGain = ctx.createGain();
        motorGain.gain.value = 0;
        motorOsc.connect(motorFilter).connect(motorGain).connect(this.master);
        motorOsc.start();
        this.motor = { osc: motorOsc, gain: motorGain };

        // 2. Electric Suction Fan Turbine Hum (62Hz pure sine wave)
        const humOsc = ctx.createOscillator();
        humOsc.type = 'sine';
        humOsc.frequency.value = 62;
        const humGain = ctx.createGain();
        humGain.gain.value = 0;
        humOsc.connect(humGain).connect(this.master);
        humOsc.start();
        this.hum = { osc: humOsc, gain: humGain };

        // 3. SpaceX Cold Gas Thrusters (Bandpass filtered white noise)
        const hissSource = ctx.createBufferSource();
        hissSource.buffer = this.noise;
        hissSource.loop = true;
        const hissFilter = ctx.createBiquadFilter();
        hissFilter.type = 'bandpass';
        hissFilter.frequency.value = 2400;
        hissFilter.Q.value = 0.6;
        const hissGain = ctx.createGain();
        hissGain.gain.value = 0;
        hissSource.connect(hissFilter).connect(hissGain).connect(this.master);
        hissSource.start();
        this.hiss = { gain: hissGain, filter: hissFilter };
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      this.ctx = null;
    }
  }

  public update(speed: number, driving: boolean, suction: boolean, thrusterLevel: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;

    const t = ctx.currentTime;
    this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, t, 0.05);

    // Motor pitch changes dynamically with ground speed
    if (this.motor) {
      const targetFreq = 70 + 26 * Math.abs(speed);
      this.motor.osc.frequency.setTargetAtTime(targetFreq, t, 0.08);
      const targetGain = driving ? 0.05 : Math.min(0.03, 0.004 * Math.abs(speed));
      this.motor.gain.gain.setTargetAtTime(targetGain, t, 0.1);
    }

    // Suction downforce hum
    if (this.hum) {
      this.hum.gain.gain.setTargetAtTime(suction ? 0.12 : 0, t, 0.06);
    }

    // Cold gas thruster hiss intensity and frequency shifting
    if (this.hiss) {
      this.hiss.gain.gain.setTargetAtTime(0.55 * thrusterLevel, t, 0.03);
      this.hiss.filter.frequency.setTargetAtTime(1800 + 1400 * thrusterLevel, t, 0.05);
    }
  }

  public hit(strength: number, isCrash: boolean = false): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise || !this.enabled) return;

    const t = ctx.currentTime;
    const hitSource = ctx.createBufferSource();
    hitSource.buffer = this.noise;

    const filter = ctx.createBiquadFilter();
    filter.type = isCrash ? 'bandpass' : 'lowpass';
    filter.frequency.value = isCrash ? 900 : 220;

    const gain = ctx.createGain();
    const peak = Math.min(1.0, 0.3 + 0.5 * strength);
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isCrash ? 0.9 : 0.4));

    hitSource.connect(filter).connect(gain).connect(this.master);
    hitSource.start(t, Math.random());
    hitSource.stop(t + 1.0);
  }

  public dispose(): void {
    try {
      this.ctx?.close();
    } catch {}
    this.ctx = null;
  }
}
