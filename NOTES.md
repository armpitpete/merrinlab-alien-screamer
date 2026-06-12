# MerrinLab Alien Screamer Notes

## Sync Effect design decision

The panel keeps the original label:

```text
Sync Effect
```

The browser implementation should now treat this as:

```text
LFO-edge-driven Sync Bite
```

## Reason for the change

The original Alien Screamer circuit uses the LFO square-wave edges to disturb the VCO comparator bias and reset the VCO ramp generator. That is the authentic hardware behaviour.

A direct browser version was attempted using a resettable ramp `AudioWorklet`. It did not produce a reliable useful result in the current synth:

- some versions had no audible effect
- longer reset clamps sounded muddy
- shorter reset clamps disappeared
- duplicate reset paths could sound doubled
- previous node-reset attempts risked stopping the audio

Because this project is a playable browser synth and faceplate instrument, not a full circuit simulation, Sync Effect should be implemented as a stable musical approximation instead of a fragile exact ramp-reset model.

## New intended behaviour

When Sync Effect is off:

- normal VCO sound
- normal LFO modulation
- normal output level

When Sync Effect is on:

- detect leading and trailing edges of the LFO square wave
- use those edges to trigger a short aggressive bite
- briefly increase the harsher character of the voice
- make the timing clearly follow LFO Frequency
- avoid muddy gating
- avoid doubled sound
- do not recreate oscillator nodes
- do not break normal audio

## Internal name

Use this internal concept name:

```text
syncBite
```

Do not describe the browser version as a true VCO ramp reset unless the audio engine is later rebuilt successfully around a proven stable resettable oscillator.

## Future rule

Do not keep chasing exact ramp-reset authenticity inside the current browser engine unless it is done as a separate contained audio-engine experiment with an easy rollback path.

For the current playable version, prioritise:

1. stable sound
2. clear audible Sync Effect
3. LFO-timed bite character
4. no faceplate changes
5. no sequencer connection work during this fix
