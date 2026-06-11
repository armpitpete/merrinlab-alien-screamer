# Copilot instructions for MerrinLab Alien Screamer

Work in small, contained edits.

This repo is a standalone browser synth and faceplate preview. Do not merge it into the Ultimate synth, the 16-step sequencer, or the VCV Rack repo.

## Project rules

- Preserve the 16:9 faceplate-first layout unless an issue explicitly changes it.
- Keep controls visually consistent with the other MerrinLab browser synth previews.
- Do not copy MFOS website layout, images, or archive styling into the UI.
- Do not add frameworks unless there is a clear issue requiring one.
- Prefer plain HTML, CSS, and JavaScript.
- Keep audio local to the page.
- Use `src/merrinlab-patch-bus.js` for cross-page control messages.
- Do not claim the browser synth is an exact analogue circuit simulation.

## MerrinLab connection rule

The other MFOS browser synths should connect through the shared patch protocol, not through direct repo coupling.

Protocol name:

```text
merrinlab.patch.v0.1
```

Use these message types first:

- `module-state`
- `parameter-change`
- `pitch-cv`
- `gate`
- `clock`
- `panic`
- `patch-point-clicked`

## Reporting rule

After each change, report:

- files changed
- reason for each change
- whether the page still opens as a static site
- any risk to audio, layout, or patch-bus behaviour
