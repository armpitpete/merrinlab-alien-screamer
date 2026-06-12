class ResettableRampProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "frequency",
        defaultValue: 220,
        minValue: 0.01,
        maxValue: 20000,
        automationRate: "a-rate",
      },
      {
        name: "lfoRate",
        defaultValue: 3.2,
        minValue: 0.01,
        maxValue: 200,
        automationRate: "a-rate",
      },
      {
        name: "syncEnabled",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "a-rate",
      },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.lfoPhase = 0;
    this.lastLfoSquare = 1;
    this.resetRequested = false;
    this.port.onmessage = (event) => {
      if (event.data?.type === "sync-reset") {
        this.resetRequested = true;
      }
    };
  }

  process(_inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];
    const frequencyValues = parameters.frequency;
    const lfoRateValues = parameters.lfoRate;
    const syncValues = parameters.syncEnabled;

    for (let i = 0; i < channel.length; i += 1) {
      const frequency = frequencyValues.length > 1 ? frequencyValues[i] : frequencyValues[0];
      const lfoRate = lfoRateValues.length > 1 ? lfoRateValues[i] : lfoRateValues[0];
      const syncEnabled = (syncValues.length > 1 ? syncValues[i] : syncValues[0]) >= 0.5;
      const safeFrequency = Math.max(0.01, Math.min(20000, frequency));
      const safeLfoRate = Math.max(0.01, Math.min(200, lfoRate));
      const lfoSquare = this.lfoPhase < 0.5 ? 1 : -1;
      const lfoEdge = lfoSquare !== this.lastLfoSquare;

      if (this.resetRequested || (syncEnabled && lfoEdge)) {
        this.phase = 0;
        this.resetRequested = false;
      }

      channel[i] = this.phase * 2 - 1;
      this.phase += safeFrequency / sampleRate;
      this.lfoPhase += safeLfoRate / sampleRate;

      if (this.phase >= 1) {
        this.phase -= Math.floor(this.phase);
      }

      if (this.lfoPhase >= 1) {
        this.lfoPhase -= Math.floor(this.lfoPhase);
      }

      this.lastLfoSquare = lfoSquare;
    }

    return true;
  }
}

registerProcessor("resettable-ramp-processor", ResettableRampProcessor);
