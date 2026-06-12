/* Alien Screamer browser audio engine.
   This is not a circuit simulation. It is a playable browser instrument that keeps
   the main Alien Screamer behaviour: ramp voice, LFO modulation, sync bite, lo-fi gain.
*/
(function () {
  class AlienScreamerEngine {
    constructor() {
      this.context = null;
      this.source = null;
      this.drive = null;
      this.filter = null;
      this.output = null;
      this.analyser = null;
      this.running = false;
      this.lastGate = 1;
      this.usingResettableRamp = false;
      this.workletReady = false;
      this.syncBiteAmount = 0;
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
        this.drive.connect(this.filter);
        this.filter.connect(this.output);
        this.output.connect(this.analyser);
        this.analyser.connect(this.context.destination);
        await this.loadWorklet();
      }

      if (this.context.state === "suspended") await this.context.resume();
      if (!this.source) this.createSource();
      this.running = true;
    }

    async loadWorklet() {
      if (!this.context.audioWorklet) return;
      try {
        await this.context.audioWorklet.addModule("src/resettable-ramp-processor.js?v=sync-bite-1");
        this.workletReady = true;
      } catch (error) {
        console.warn("Resettable ramp AudioWorklet failed to load; falling back to OscillatorNode.", error);
        this.workletReady = false;
      }
    }

    createSource() {
      if (this.workletReady) {
        this.source = new AudioWorkletNode(this.context, "resettable-ramp-processor", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        this.source.connect(this.drive);
        this.usingResettableRamp = true;
        return;
      }

      this.source = this.context.createOscillator();
      this.source.type = "sawtooth";
      this.source.frequency.value = 220;
      this.source.connect(this.drive);
      this.source.start();
      this.usingResettableRamp = false;
    }

    resetRamp() {
      // Sync Effect is implemented as Sync Bite in this browser version.
      // The ramp-reset experiment was unreliable, so this method intentionally does nothing.
      return;
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
      if (!this.context || !this.source) return;
      const now = this.context.currentTime;
      const safeFrequency = Math.max(100, Math.min(22000, frequency));
      const safeLevel = Math.max(0, Math.min(0.8, level));
      const gateLevel = gate ? 1 : 0;

      if (syncBite) {
        this.syncBiteAmount = 1;
      } else {
        this.syncBiteAmount *= 0.68;
        if (this.syncBiteAmount < 0.015) this.syncBiteAmount = 0;
      }

      const bite = this.syncBiteAmount;
      const bittenFrequency = Math.min(22000, safeFrequency * (1 + bite * 0.18));
      const bittenScream = Math.max(0, Math.min(1, scream + bite * 0.42));
      const normalFilter = 1600 + (1 - scream) * 5000;
      const bittenFilter = Math.min(11500, normalFilter + bite * 5200);

      if (this.usingResettableRamp) {
        this.source.parameters.get("frequency").setTargetAtTime(bittenFrequency, now, 0.004);
        if (this.source.parameters.has("syncEnabled")) {
          this.source.parameters.get("syncEnabled").setValueAtTime(0, now);
        }
      } else {
        this.source.frequency.setTargetAtTime(bittenFrequency, now, 0.004);
      }

      this.output.gain.setTargetAtTime(this.running ? safeLevel * gateLevel : 0, now, 0.018);
      this.drive.curve = makeDriveCurve(bittenScream);
      this.filter.frequency.setTargetAtTime(bittenFilter, now, 0.012);
      this.filter.Q.setTargetAtTime(0.6 + bite * 3.2, now, 0.012);
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
