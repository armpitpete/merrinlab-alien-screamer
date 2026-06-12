class ResettableRampProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "frequency",
        defaultValue: 220,
        minValue: 100,
        maxValue: 22000,
        automationRate: "a-rate",
      },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
  }

  process(_inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];
    const frequencyValues = parameters.frequency;

    for (let i = 0; i < channel.length; i += 1) {
      const frequency = frequencyValues.length > 1 ? frequencyValues[i] : frequencyValues[0];
      const safeFrequency = Math.max(100, Math.min(22000, frequency));

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
