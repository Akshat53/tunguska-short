> **Start here: [`docs/MAKE_A_VIDEO.md`](docs/MAKE_A_VIDEO.md)** — setup on any Mac and the full step-by-step pipeline (script → voice → picture → sound → thumbnail → draft → QA → final → upload). Videos so far: Tunguska (English) and Roopkund (Hindi). The text below is the original Tunguska README.

# Tunguska — 60 s vertical cartoon short

A 60-second (69.3 s) vertical cartoon story short about the **1908 Tunguska event**, built with the
`cartoon-3d-short` pipeline: **2D flat characters with thick ink outlines inside a colorful 3D
world**, Remotion + three.js, rendered locally (no AI video generator).

- Format: 1080x1920 @ 30 fps, `TunguskaShort` composition, 2078 frames
- Story + sourced facts: [`SCRIPT.md`](SCRIPT.md)
- Audio: **final mix is done** — `audio/out/mix.wav` (voice + music + SFX, −14 LUFS)
- Status: picture render pending (intended for Apple Silicon — see below)

## Requirements (macOS)

| Need | Install | Notes |
|---|---|---|
| Node 20+ | `brew install node` or nvm | tested on Node 26, Remotion 4.0.537 |
| ffmpeg | `brew install ffmpeg` | mux + loudness checks |
| Python 3 | preinstalled / brew | only for audio rebuild + QA sheets: `pip install numpy scipy pillow` |
| Disk | ~5 GB | node_modules + renders |

## Render (on a Mac — recommended)

```bash
git clone <this repo> && cd tunguska-short
npm install

# NOTE: see HANDOFF.md - render defaults are now GL=angle, CONC=6 (~0.07 s/frame measured), lens blur off.
# 1) Picture (1080x1920) — see the GPU note below first!
node scripts/render.mjs out/picture.mp4 all 1 '{"post":{"dpr":1}}'

# 2) Mux with the final audio mix (prints duration + LUFS)
bash scripts/mux.sh out/picture.mp4 out/tunguska-1080x1920.mp4
```


written for a CPU-only Linux box (~7 s/frame). **On a Mac, delete that `chromiumOptions` override**
(or pass the default GL) to use the GPU — expect ~0.1–0.5 s/frame, i.e. a few minutes for the whole
video. Also raise render concurrency: `CONC=4 node scripts/render.mjs ...` (up to `CONC=8` on
M-series; each worker is a Chrome tab).

**4K:** `node scripts/render.mjs out/picture4k.mp4 all 2 '{"post":{"dpr":1}}'` then mux the same way.

**Preview in Remotion Studio:** `npm run studio` → opens the `TunguskaShort` composition.

## Quick QA

```bash
# spot-check stills (frames 60, 1040, 1428 at full scale)
node scripts/stills.mjs out/s 60,1040,1428 1

# contact sheet of frames (needs pillow)
python3 scripts/sheet.py out/sheet.jpg out/s_*.jpg

# duration / loudness of a finished file
ffprobe -v error -show_entries format=duration -of csv=p=0 out/tunguska-1080x1920.mp4
ffmpeg -hide_banner -i out/tunguska-1080x1920.mp4 -map 0:a:0 -af loudnorm=print_format=json -f null - 2>&1 | grep input_i
```

Per-shot check frames from the build are in `output/checks/` (one gate frame per shot).

## Render props (`inputProps.post`)

`{"post": {ink, lens, pre, bloom, grade, msaa, inkDebug, dpr}}` — all default `true`/`0` except
`dpr` (device-pixel-ratio override). For fast drafts: `{"post":{"dpr":0.5,"bloom":false,"grade":false}}`
(scale 0.5 halves both dimensions).

## Audio (already final — rebuild only if you change the story)

```bash
python3 audio/score.py        # music + SFX stems -> audio/out/mix_pre.wav
bash audio/finalize.sh        # two-pass loudnorm to -14 LUFS -> audio/out/mix.wav
bash scripts/mux.sh out/picture.mp4 out/final.mp4
```

Voice regeneration (only if narration changes) — `voice/narration.txt` → `voice/voice.wav` +
`voice/words.json` (word timings that drive shot cuts):

```bash
python3 -m venv .venv && .venv/bin/pip install edge-tts
.venv/bin/python make_voice.py "+32%"
```

## Pipeline / structure

```
SCRIPT.md                  story + verified facts + beat map
voice/                     narration text, voice.wav (69.26 s), words.json (word timings)
src/videos/tunguska/
  story.ts                 per-frame timeline (camera, poses) driven by word timings
  world.ts / cast.ts       3D world (taiga, blast) and 2D character rigs
  toon/ink/shade/paint/    the "2D-in-3D ink" look: toon shading, outlines, color grade
  grade/lensblur/lights    post chain
  Tunguska.tsx             composition
scripts/render.mjs         one bundle + one sequential render (usage in file header)
scripts/mux.sh             picture + mix.wav -> final MP4 (AAC 48 kHz, +faststart)
audio/                     synthesizer (pure-python DSP: score, instruments, SFX) + loudnorm
```

The visual style follows the `cartoon-3d-short` skill's rules: saturated gradient skies (no dark
voids), constant-screen-size sprites, slow symmetric push-ins, 7-frame impact kicks, no in-scene
text.

## Build notes

- Built by an autonomous Claude Code (Opus) worker, orchestrated by Hermes; the CPU box rendered at
  ~7 s/frame (SwiftShader) which is why the final render is intended for a Mac.
- Gates recorded in `output/checks/` + `BRIEF.md` (build brief) + `REDIRECT.md` (render plan).
