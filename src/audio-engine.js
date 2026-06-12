/* Alien Screamer browser audio engine.
   This is not a circuit simulation. It is a playable browser instrument that keeps
   the main Alien Screamer behaviour: ramp voice, LFO modulation, sync reset, lo-fi gain.
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
        await this.context.audioWorklet.addModule("src/resettable-ramp-processor.js?v=sync-audio");
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
      if (!this.running || !this.usingResettableRamp || !this.source?.port) return;
      this.source.port.postMessage({ type: "sync-reset" });
    }

    stop() {
      if (!this.context || !this.output) return;
      this.output.gain.setTargetAtTime(0, this.context.currentTime, 0.012);
      this.running = false;
    }

    panic() {
      this.stop();
    }

    update({ frequency, level, scream, gate, syncBite, sync, lfoRate }) {
      if (!this.context || !this.source) return;
      const now = this.context.currentTime;
      const safeFrequency = Math.max(1, Math.min(20000, frequency));
      const safeLfoRate = Math.max(0.01, Math.min(200, lfoRate || 0.01));
      const safeLevel = Math.max(0, Math.min(0.8, level));
      const gateLevel = gate ? 1 : 0;

      if (this.usingResettableRamp) {
        this.source.parameters.get("frequency").setTargetAtTime(safeFrequency, now, 0.008);
        this.source.parameters.get("lfoRate").setTargetAtTime(safeLfoRate, now, 0.008);
        this.source.parameters.get("syncEnabled").setTargetAtTime(sync ? 1 : 0, now, 0.002);
      } else {
        const syncBoost = syncBite ? 1.08 : 1;
        this.source.frequency.setTargetAtTime(safeFrequency * syncBoost, now, 0.008);
      }

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
