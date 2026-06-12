/* Alien Screamer browser audio engine.
   This is not a circuit simulation. It is a playable browser instrument that keeps
   the main Alien Screamer behaviour: ramp voice, LFO modulation, sync reset, lo-fi gain.
*/
(function () {
  class AlienScreamerEngine {
    constructor() {
      this.context = null;
      this.oscillator = null;
      this.drive = null;
      this.filter = null;
      this.output = null;
      this.analyser = null;
      this.running = false;
      this.lastGate = 1;
      this.currentFrequency = 220;
    }

    async start() {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        this.output = this.context.createGain();
        this.output.gain.value = 0;
        this.drive = this.context.createWaveShaper();
        this.filter = this.context.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.value = 4200;
        this.filter.Q.value = 0.6;
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 2048;
        this.output.connect(this.analyser);
        this.analyser.connect(this.context.destination);
      }

      if (this.context.state === "suspended") await this.context.resume();
      if (!this.oscillator) this.createOscillator(this.currentFrequency);
      this.running = true;
    }

    createOscillator(frequency = this.currentFrequency) {
      const oscillator = this.context.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.value = clampFrequency(frequency);
      oscillator.connect(this.drive);
      oscillator.start();
      this.oscillator = oscillator;
      this.currentFrequency = clampFrequency(frequency);
    }

    resetRamp(frequency = this.currentFrequency) {
      if (!this.context || !this.drive || !this.running) return;
      const oldOscillator = this.oscillator;
      const now = this.context.currentTime;
      const safeFrequency = clampFrequency(frequency);
      const newOscillator = this.context.createOscillator();

      newOscillator.type = "sawtooth";
      newOscillator.frequency.value = safeFrequency;
      newOscillator.connect(this.drive);
      newOscillator.start(now);
      this.oscillator = newOscillator;
      this.currentFrequency = safeFrequency;

      if (oldOscillator) {
        try {
          oldOscillator.stop(now);
          oldOscillator.disconnect();
        } catch (error) {
          // Old oscillators may already be stopped/disconnected during rapid sync pulses.
        }
      }
    }

    stop() {
      if (!this.context || !this.output) return;
      this.output.gain.setTargetAtTime(0, this.context.currentTime, 0.012);
      this.running = false;
    }

    panic() {
      this.stop();
    }

    update({ frequency, level, scream, gate }) {
      if (!this.context || !this.oscillator) return;
      const now = this.context.currentTime;
      const safeFrequency = clampFrequency(frequency);
      const safeLevel = Math.max(0, Math.min(0.8, level));
      const gateLevel = gate ? 1 : 0;

      this.currentFrequency = safeFrequency;
      this.oscillator.frequency.setTargetAtTime(safeFrequency, now, 0.008);
      this.output.gain.setTargetAtTime(this.running ? safeLevel * gateLevel : 0, now, 0.018);
      this.drive.curve = makeDriveCurve(scream);
      this.filter.frequency.setTargetAtTime(1600 + (1 - scream) * 5000, now, 0.03);
      this.lastGate = gateLevel;
    }

    getAnalyser() {
      return this.analyser;
    }
  }

  function clampFrequency(frequency) {
    return Math.max(1, Math.min(20000, frequency));
  }

  function makeDriveCurve(amount) {
    const samples = 256;
    const curve = new Float32Array(samples);
    const k = 8 + amount * 90;
    for (let i = 0; i < samples; i += 1) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  window.AlienScreamerEngine = AlienScreamerEngine;
})();
