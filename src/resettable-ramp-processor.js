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
    ];
  }

  constructor() {
    super();
    this.phase = 0;
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

    for (let i = 0; i < channel.length; i += 1) {
      if (this.resetRequested) {
        this.phase = 0;
        this.resetRequested = false;
      }

      const frequency = frequencyValues.length > 1 ? frequencyValues[i] : frequencyValues[0];
      const safeFrequency = Math.max(0.01, Math.min(20000, frequency));

      channel[i] = this.phase * 2 - 1;
      this.phase += safeFrequency / sampleRate;

      if (this.phase >= 1) {
        this.phase -= Math.floor(this.phase);
      }
    }

    return true;
  }
}

registerProcessor("resettable-ramp-processor", ResettableRampProcessor);
