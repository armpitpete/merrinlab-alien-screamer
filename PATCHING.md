# MerrinLab Patch Bus v0.1

This protocol lets standalone browser synths share control information while staying as separate repositories.

## Transport

Primary:

```js
new BroadcastChannel("merrinlab-patch-bus")
```

Fallback:

```js
window.dispatchEvent(new CustomEvent("merrinlab-patch-bus", { detail: message }))
```

## Message shape

```js
{
  protocol: "merrinlab.patch.v0.1",
  source: "merrinlab-alien-screamer",
  type: "module-state",
  time: performance.now(),
  payload: {}
}
```

## Current message types

### `module-state`

Periodic status message from a module.

```js
{
  outputs: {
    lfo: 0.42,
    audioLevel: 0.18,
    frequency: 220
  },
  inputs: {
    pitchCV: 0,
    gate: 1
  }
}
```

### `parameter-change`

Sent when a local control changes.

### `pitch-cv`

External control value.

```js
{ value: 0.5 }
```

In Alien Screamer v0.1, each `1.0` adds about `120 Hz` to the browser voice.

### `gate`

```js
{ open: true }
```

Alien Screamer listens to gate only when Drone is off.

### `clock`

Timing pulse from a sequencer or clock module.

### `panic`

Mute request.

### `patch-point-clicked`

UI-only message for future patch routing.

## Important limitation

This does not send real audio between browser tabs. Browser-to-browser audio routing will need a later design using WebRTC, Web Audio graph hosting, or a shared host page.
