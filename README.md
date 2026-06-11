# MerrinLab Alien Screamer

Standalone browser synth / faceplate instrument for the MFOS-inspired MerrinLab line.

This project is its own repo. It is not part of the Ultimate synth repo, the 16-step sequencer repo, or the VCV Rack repo.

## What it is

A small lo-fi browser instrument based on the uploaded Alien Screamer material:

- ramp-style VCO voice
- LFO rate, depth, and shape controls
- sync-bite switch
- scream/drive control
- level control
- 16:9 faceplate-style layout
- standard patch points for the MerrinLab browser synth family

This is not a circuit simulation. It is a playable browser synth and design preview.

## Connection rule

The synth connects to the other MerrinLab/MFOS browser instruments through the shared `merrinlab.patch.v0.1` browser message protocol.

Audio is local to the page. Control messages can be shared between open MerrinLab synth pages in the same browser using `BroadcastChannel`.

Current patch points:

| Point | Direction | Message type | Use |
|---|---:|---|---|
| Pitch CV In | Input | `pitch-cv` | External pitch/control modulation |
| Gate In | Input | `gate` | Opens/closes the voice when Drone is off |
| Sync In | Input | `clock` / future `sync` | Timing/reset-style behaviour |
| Clock In | Input | `clock` | Receives pulses from sequencers |
| LFO Out | Output | `module-state.outputs.lfo` | Can modulate other modules later |
| Audio Out | Output | `module-state.outputs.audioLevel` | Metadata only in v0.1 |

## Related repos

- `armpitpete/merrinlab-ultimate-synth`
- `armpitpete/merrinlab-16-step-sequencer`
- `armpitpete/merrinlab-vcv`

## Local use

Open `index.html` in a browser.

For a local static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Create the GitHub repo

Preferred repo name:

```text
merrinlab-alien-screamer
```

From inside this folder:

```bash
git init
git branch -M main
git add .
git commit -m "Create Alien Screamer standalone synth"
gh repo create armpitpete/merrinlab-alien-screamer --public --source=. --remote=origin --push
```

If GitHub CLI is not available:

```bash
git remote add origin https://github.com/armpitpete/merrinlab-alien-screamer.git
git push -u origin main
```

## GitHub Pages

After pushing, enable Pages:

- Settings
- Pages
- Deploy from a branch
- Branch: `main`
- Folder: `/root`

Expected public URL:

```text
https://armpitpete.github.io/merrinlab-alien-screamer/
```

## Development rule

Keep this repo small:

- no unrelated MFOS modules
- no copied website archive assets
- no fake working controls
- each new behaviour should be added behind one small issue
