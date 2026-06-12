const moduleId = "merrinlab-alien-screamer";
const engine = new window.AlienScreamerEngine();
const bus = new window.MerrinLabPatchBus(moduleId);

const VCO_MIN_HZ = 100;
const VCO_MAX_HZ = 22000;

const els = {
  pitch: document.getElementById("pitch"),
  fine: document.getElementById("fine"),
  rate: document.getElementById("rate"),
  depth: document.getElementById("depth"),
  scream: document.getElementById("scream"),
  level: document.getElementById("level"),
  sync: document.getElementById("sync"),
  drone: document.getElementById("drone"),
  startButton: document.getElementById("startButton"),
  panicButton: document.getElementById("panicButton"),
  busEnabled: document.getElementById("busEnabled"),
  powerLamp: document.getElementById("powerLamp"),
  panelPowerLed: document.getElementById("panelPowerLed"),
  lfoLed: document.getElementById("lfoLed"),
  syncIndicator: document.getElementById("syncIndicator"),
  engineStatus: document.getElementById("engineStatus"),
  busStatus: document.getElementById("busStatus"),
  pitchOut: document.getElementById("pitchOut"),
  fineOut: document.getElementById("fineOut"),
  rateOut: document.getElementById("rateOut"),
  depthOut: document.getElementById("depthOut"),
  screamOut: document.getElementById("screamOut"),
  levelOut: document.getElementById("levelOut"),
  freqReadout: document.getElementById("freqReadout"),
  lfoReadout: document.getElementById("lfoReadout"),
  gateReadout: document.getElementById("gateReadout"),
  scope: document.getElementById("scope"),
};

const external = {
  pitchCV: 0,
  gate: 1,
  clockPulse: 0,
  lastMessage: null,
};

const syncEdge = {
  lastSquare: null,
  lastPulseAt: 0,
};

function currentShape() {
  return document.querySelector('input[name="shape"]:checked')?.value || "square";
}

function pitchKnobToFrequency(knobValue) {
  const normal = Math.min(1, Math.max(0, knobValue / 10));
  return VCO_MIN_HZ * Math.pow(VCO_MAX_HZ / VCO_MIN_HZ, normal);
}

function getState() {
  return {
    pitch: pitchKnobToFrequency(Number(els.pitch.value)),
    pitchKnob: Number(els.pitch.value),
    fine: Number(els.fine.value),
    rate: Number(els.rate.value),
    depth: Number(els.depth.value),
    scream: Number(els.scream.value),
    level: Number(els.level.value),
    sync: els.sync.checked,
    drone: els.drone.checked,
    shape: currentShape(),
    busEnabled: els.busEnabled.checked,
  };
}

function centsToRatio(cents) {
  return Math.pow(2, cents / 1200);
}

function lfoValue(time, rate, shape) {
  const phase = (time * rate) % 1;

  if (shape === "smooth") return Math.sin(phase * Math.PI * 2);

  if (shape === "spike") {
    // Differentiated square wave modulation:
    // positive spike on the rising edge, negative spike on the falling edge,
    // with no DC offset between the edge events.
    const width = 0.06;

    if (phase < width) return 1 - phase / width;
    if (phase >= 0.5 && phase < 0.5 + width) return -1 + (phase - 0.5) / width;
    return 0;
  }

  return phase < 0.5 ? 1 : -1;
}

function sendParameterChange() {
  bus.send("parameter-change", getState());
}

function setInputValue(input, value) {
  const min = Number(input.min);
  const max = Number(input.max);
  const step = Number(input.step || 1);
  const clamped = Math.min(max, Math.max(min, value));
  const stepped = step > 0 ? Math.round(clamped / step) * step : clamped;
  input.value = String(Number(stepped.toFixed(4)));
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function valueFromPointer(event, zone, input) {
  const rect = zone.getBoundingClientRect();
  const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
  const normal = x / rect.width;
  const min = Number(input.min);
  const max = Number(input.max);
  return min + normal * (max - min);
}

function installRangeHotZones() {
  document.querySelectorAll("[data-range-control]").forEach((zone) => {
    const input = document.getElementById(zone.dataset.rangeControl);
    if (!input) return;

    const updateFromPointer = (event) => {
      event.preventDefault();
      setInputValue(input, valueFromPointer(event, zone, input));
    };

    zone.addEventListener("pointerdown", (event) => {
      updateFromPointer(event);
      zone.setPointerCapture?.(event.pointerId);
    });

    zone.addEventListener("pointermove", (event) => {
      if (event.buttons !== 1 && event.pressure === 0) return;
      updateFromPointer(event);
    });
  });
}

function installFaceplateToggles() {
  const syncArea = document.querySelector(".sync-area");
  syncArea?.addEventListener("click", (event) => {
    event.preventDefault();
    els.sync.checked = !els.sync.checked;
    els.sync.dispatchEvent(new Event("input", { bubbles: true }));
  });

  document.querySelectorAll('.wave-option input[name="shape"]').forEach((input) => {
    input.addEventListener("change", sendParameterChange);
  });
}

function formatHz(value) {
  if (value < 100) return `${value.toFixed(1)} Hz`;
  return `${Math.round(value)} Hz`;
}

function updateReadouts(state, frequency, lfo) {
  els.pitchOut.textContent = formatHz(state.pitch);
  els.fineOut.textContent = `${state.fine} ct`;
  els.rateOut.textContent = `${state.rate.toFixed(1)} Hz`;
  els.depthOut.textContent = `${Math.round(state.depth)} Hz`;
  els.screamOut.textContent = `${Math.round(state.scream * 100)}%`;
  els.levelOut.textContent = `${Math.round(state.level * 100)}%`;
  els.freqReadout.textContent = `VCO ${formatHz(frequency)}`;
  els.lfoReadout.textContent = `LFO ${lfo >= 0 ? "+" : ""}${lfo.toFixed(2)}`;
  els.gateReadout.textContent = external.gate ? "GATE OPEN" : "GATE CLOSED";
  els.syncIndicator?.classList.toggle("on", state.sync);

  document.querySelectorAll(".knob[data-for], .knob-indicator[data-indicator-for]").forEach((indicator) => {
    const id = indicator.dataset.for || indicator.dataset.indicatorFor;
    const input = document.getElementById(id);
    if (!input) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const normal = (value - min) / (max - min);
    // MFOS-style dial: 0 near lower-left, 5 near top, 10 near lower-right.
    const deg = 120 + normal * 300;
    indicator.style.setProperty("--turn", `${deg}deg`);
  });
}

function drawScope() {
  const canvas = els.scope;
  const ctx = canvas.getContext("2d");
  const analyser = engine.getAnalyser();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(216,245,90,0.92)";
  ctx.beginPath();

  if (!analyser) {
    for (let x = 0; x < canvas.width; x += 8) {
      const y = canvas.height / 2 + Math.sin(x * 0.04 + performance.now() * 0.003) * 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    return;
  }

  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  const slice = canvas.width / data.length;
  for (let i = 0; i < data.length; i += 1) {
    const x = i * slice;
    const y = (data[i] / 255) * canvas.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function sendSyncResetOnSquareEdge(state, phase) {
  const squareState = phase < 0.5 ? 1 : -1;

  if (!state.sync) {
    syncEdge.lastSquare = squareState;
    return false;
  }

  const edgeDetected = syncEdge.lastSquare !== null && squareState !== syncEdge.lastSquare;
  syncEdge.lastSquare = squareState;

  if (!edgeDetected) return false;

  const now = performance.now();
  if (now - syncEdge.lastPulseAt < 3) return false;

  engine.resetRamp();
  syncEdge.lastPulseAt = now;
  return true;
}

function tick() {
  const state = getState();
  const time = performance.now() / 1000;
  const phase = (time * state.rate) % 1;
  const lfo = lfoValue(time, state.rate, state.shape);
  const base = state.pitch * centsToRatio(state.fine);
  const modulation = lfo * state.depth;
  const pitchCV = external.pitchCV * 120;
  const syncResetSent = sendSyncResetOnSquareEdge(state, phase);
  const syncBite = !engine.usingResettableRamp && syncResetSent;
  const gate = state.drone ? 1 : external.gate;
  const frequency = Math.max(100, base + modulation + pitchCV);

  engine.update({ frequency, level: state.level, scream: state.scream, gate, syncBite });
  updateReadouts(state, frequency, lfo);
  drawScope();

  els.lfoLed?.classList.toggle("on", engine.running && phase < 0.5);

  bus.send("module-state", {
    outputs: { lfo, audioLevel: state.level, frequency },
    inputs: { pitchCV: external.pitchCV, gate: external.gate },
  });

  requestAnimationFrame(tick);
}

bus.on((message) => {
  external.lastMessage = message;
  els.busStatus.textContent = `BUS: ${message.source}`;
  const { type, payload } = message;

  if (type === "pitch-cv") external.pitchCV = Number(payload.value || 0);
  if (type === "gate") external.gate = payload.open ? 1 : 0;
  if (type === "clock") external.clockPulse += 1;
  if (type === "panic") {
    engine.panic();
    setEngineStatus(false);
  }
});

function setEngineStatus(on) {
  els.powerLamp.classList.toggle("on", on);
  els.panelPowerLed?.classList.toggle("on", on);
  els.engineStatus.textContent = on ? "ENGINE ON" : "ENGINE OFF";
  els.startButton.textContent = on ? "Stop audio" : "Start audio";
}

els.startButton.addEventListener("click", async () => {
  if (!engine.running) {
    await engine.start();
    setEngineStatus(true);
  } else {
    engine.stop();
    setEngineStatus(false);
  }
});

els.panicButton.addEventListener("click", () => {
  engine.panic();
  setEngineStatus(false);
  bus.send("panic", { reason: "local panic button" });
});

els.busEnabled.addEventListener("change", () => {
  bus.setEnabled(els.busEnabled.checked);
  els.busStatus.textContent = els.busEnabled.checked ? "PATCH BUS READY" : "PATCH BUS OFF";
});

document.querySelectorAll(".jack").forEach((jack) => {
  jack.addEventListener("click", () => {
    jack.classList.toggle("active");
    bus.send("patch-point-clicked", { jack: jack.dataset.jack, active: jack.classList.contains("active") });
  });
});

for (const input of document.querySelectorAll("input")) {
  input.addEventListener("input", () => bus.send("parameter-change", getState()));
}

installRangeHotZones();
installFaceplateToggles();
setEngineStatus(false);
tick();