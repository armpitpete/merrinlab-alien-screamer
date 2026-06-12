/* Alien Screamer browser audio engine.
   This is not a circuit simulation. It is a playable browser instrument that keeps
   the main Alien Screamer behaviour: ramp voice, LFO modulation, sync bite, lo-fi gain.
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
      if (!this.oscillator) this.createOscillator();
      this.running = true;
    }

    createOscillator() {
      this.oscillator = this.context.createOscillator();
      this.oscillator.type = "sawtooth";
      this.oscillator.frequency.value = 220;
      this.oscillator.connect(this.drive);
      this.drive.connect(this.filter);
      this.filter.connect(this.output);
      this.oscillator.start();
    }

    stop() {
      if (!this.context || !this.output) return;
      this.output.gain.setTargetAtTime(0, this.context.currentTime, 0.012);
      this.running = false;
    }

    panic() {
      this.stop();
    }

    update({ frequency, level, scream, gate, syncBite }) {
      if (!this.context || !this.oscillator) return;
      const now = this.context.currentTime;
      const safeFrequency = Math.max(1, Math.min(20000, frequency));
      const safeLevel = Math.max(0, Math.min(0.8, level));
      const gateLevel = gate ? 1 : 0;
      const syncBoost = syncBite ? 1.08 : 1;

      this.oscillator.frequency.setTargetAtTime(safeFrequency * syncBoost, now, 0.008);
      this.output.gain.setTargetAtTime(this.running ? safeLevel * gateLevel : 0, now, 0.018);
      this.drive.curve = makeDriveCurve(scream);
      this.filter.frequency.setTargetAtTime(1600 + (1 - scream) * 5000, now, 0.03);
      this.lastGate = gateLevel;
    }

    getAnalyser() {
      return this.analyser;
    }
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
