# How to make a video (start here on any machine)

This repo makes ~60–75 s vertical (1080×1920) cartoon Shorts: flat 2D ink-outlined characters in a 3D world,
Remotion + three.js, rendered locally. Two channels use it:

| Channel | Language | YouTube | Instagram | Brand files |
|---|---|---|---|---|
| **Inkfall** (global) | English | [@inkfallshorts](https://www.youtube.com/@inkfallshorts) | [@theinkfallstudio](https://www.instagram.com/theinkfallstudio) | `brand/inkfall-logo.png`, `banner-global-v2.png`, `endcard-global.png`, `watermark-global.png` |
| **Inkfall India** | Hindi | not created yet (suggested `@inkfallindia`) | — | `brand/inkfall-india-logo.png`, `banner-india.png`, `endcard-india.png`, `watermark-india.png` |

Finished videos: **Tunguska** (English, `src/videos/tunguska/`) and **Roopkund** (Hindi, `src/videos/roopkund/`).
Copy Roopkund when making a new video: it is the cleanest example of the full pipeline, built on real voice timings with no time warp.

Rules that must not be broken: see `CLAUDE.md` (HARD RULES): no film grain, never merge ink with DOF, animation is a
pure function of the frame, lens blur off, render with `GL=angle CONC=6`, never commit API keys, look at frames before calling a video done.

---

## 0. Setup on a new Mac (about 10 min)

```bash
git clone https://github.com/Akshat53/tunguska-short.git && cd tunguska-short
brew install node ffmpeg                 # Node 20+; tested on Node 23–24
npm install
python3 -m venv .venv && .venv/bin/pip install edge-tts numpy scipy pillow
npx -y @elevenlabs/cli@latest onboard init   # only if using ElevenLabs voices: signs you in and writes the key to .env.local (gitignored)
npm test                                 # must end with ALL TESTS PASSED
node scripts/bench.mjs 500-539           # optional: confirms GPU rendering (~0.03–0.1 s/frame; >1 s/frame means software GL, fix before rendering)
```
Google Chrome must be installed for `scripts/export_brand.sh` (thumbnails, logos).

---

## 1. Pipeline overview

| Step | What | Tool / command | Output |
|---|---|---|---|
| 1 | Research + script | Bharat Storyteller agent (`agents/bharat-storyteller/`) | `examples/<slug>/script.md`, `script.json`, `narration.txt` |
| 2 | Voice | `scripts/make_voice_el.mjs` (ElevenLabs) or `make_voice.py` (free Microsoft voices) | `stories/<slug>/hi/voice.wav`, `words.json` |
| 3 | Picture code | copy `src/videos/roopkund/` → `src/videos/<slug>/`, register in `src/Root.tsx` | storyboard + sets + characters |
| 4 | Sound | copy `audio/cues.roopkund.json` + `audio/build_roopkund.sh` | `out/<slug>/audio/mix.wav` |
| 5 | Thumbnail + end card | copy `brand/src/roopkund-thumb.html`, `bash scripts/export_brand.sh` | `brand/<slug>-thumb.png` |
| 6 | Draft (half size) → QA → look at frames | `render.mjs`, `finish.sh`, `qa.sh`, `visual_qa.py` | `out/<slug>/…-draft-half.mp4` |
| 7 | Final (full size) → QA | same at scale 1 | `out/<slug>/…-final.mp4` |
| 8 | Upload | by hand (owner) | title/description from `script.md` section J |

---

## 2. Step by step (Roopkund commands as the worked example)

### Step 1: Script
Ask Claude: *"Read agents/bharat-storyteller/AGENT.md and follow it for this topic: <topic>, Hindi, ~60 s"*.
It researches on the web, writes `agents/bharat-storyteller/examples/<slug>/` (research, narration, shot list, publishing text) and must pass:
```bash
node agents/bharat-storyteller/tools/validate.mjs agents/bharat-storyteller/examples/<slug>/script.json --narration-file agents/bharat-storyteller/examples/<slug>/narration.txt
python3 agents/bharat-storyteller/tools/rhythm.py agents/bharat-storyteller/examples/<slug>/narration.txt --voice-rate +10% --names-file agents/bharat-storyteller/examples/<slug>/names.txt
```
Ready scripts not yet produced as videos: **Saraighat** (battle, needs boats/costume sets) and **Iron Pillar** (Delhi; needs courtyard, forge and macro sets).
Note: the rhythm tool estimates ~2.9 words/s, but real Hindi voices run ~2.5 words/s, so real audio is ~15–25% longer than the estimate. Aim the script at ~55 s.

### Step 2: Voice
Owner-approved Hindi voice: **ElevenLabs "Jessica"** (`cgSgspJ2msm6clMCkdW9`, model `eleven_v4`). It is smooth with no long gaps.
The free ElevenLabs plan cannot use library voices (the native Indian voices such as Anjali or Tarini) through the API; those need the Creator plan or $5 of credits.
```bash
mkdir -p stories/<slug>/hi && cp agents/bharat-storyteller/examples/<slug>/narration.txt stories/<slug>/hi/
node --env-file=.env.local scripts/make_voice_el.mjs stories/<slug>/hi cgSgspJ2msm6clMCkdW9 eleven_v4 0.6 0.75
.venv/bin/python scripts/tighten_pauses.py stories/<slug>/hi        # caps pauses (0.35 s at sentence ends); safe to re-run
```
Free alternative: `.venv/bin/python make_voice.py stories/<slug>/hi hi-IN-MadhurNeural +10%` (owner did not like these voices), then the same `tighten_pauses.py`.
Listen before building: `afplay stories/<slug>/hi/voice.mp3`. `words.json` timings drive every shot, so never change the voice after building the picture.

### Step 3: Picture
Copy `src/videos/roopkund/` (and read `docs/STORYBOARD.md`, `docs/CAMERA.md`). Then:
- `storyboard.json`: the shots, with frames = `round(word.start * 30)` from `words.json`.
- `world.ts`: the sets.
- `cast.ts`: the characters (hat types live in `src/videos/tunguska/toon.ts`).
- `story.ts`: the cameras.
- Register the composition in `src/Root.tsx`.
- For richer visuals (detailed characters with expressive faces and gestures, period costume, crowds, village-night and 1944-dock
  sets, particles, firelight), use the opt-in kit in `src/engine/kit/`: see `docs/VISUAL_KIT.md` and the `KitShowcase` composition.

`npm test` must stay green (Tunguska snapshot IDENTICAL). Check stills quickly while you build:
```bash
COMP=RoopkundShort GL=angle node scripts/stills.mjs out/chk/r 0,600,1200 0.5
```
Known pitfall: flat things sitting a few cm over a huge ground plane (lakes, rivers) flicker or vanish in high or wide shots because of depth precision.
Fix it with `polygonOffset` on their material, or by subdividing the ground (both are already done in Tunguska and Roopkund).

### Step 4: Sound
```bash
bash audio/build_roopkund.sh       # cues -> score -> voice mix -> -14 LUFS -> report (out/roopkund/audio/)
```
For a new story, copy it and `audio/cues.roopkund.json`, then change the paths and cues (`docs/AUDIO.md`).

### Step 5: Thumbnail and end card
Copy `brand/src/roopkund-thumb.html` to `brand/src/<slug>-thumb.html`, edit the text and drawing, then run:
```bash
bash scripts/export_brand.sh <slug>-thumb
```
- The thumbnail becomes the video's first frame (held still for 1 s), so it can be chosen as the Shorts cover.
- End cards are ready made: `brand/endcard-india.png` (Hindi channel) and `brand/endcard-global.png` (Inkfall).
- Keep text out of the bottom ~25%, because the Shorts buttons and caption cover it.
- Editable brand sources: `brand/src/*.html` (the old Claude design canvas was deleted).

### Step 6: Draft, QA, look
```bash
COMP=RoopkundShort GL=angle CONC=6 node scripts/render.mjs out/roopkund/picture-half.mp4 all 0.5 '{"post":{"dpr":1}}'
SIZE=540x960 INTRO_STATIC=1 AUDIO_OUT=out/roopkund/audio INTRO_CARD=brand/roopkund-thumb.png OUTRO_CARD=brand/endcard-india.png \
  bash scripts/finish.sh out/roopkund/picture-half.mp4 out/roopkund/roopkund-hi-draft-half.mp4 1.0 3
bash scripts/qa.sh out/roopkund/roopkund-hi-draft-half.mp4 out/roopkund/qa        # size, duration, loudness, contact sheet
node --no-warnings scripts/qa-story-data.mjs --config scripts/qa.config.roopkund.json --out out/roopkund/qa/qa-story.json
.venv/bin/python scripts/visual_qa.py out/roopkund/roopkund-hi-draft-half.mp4 --story out/roopkund/qa/qa-story.json \
  --audio-report out/roopkund/audio/audio_report.json --out out/roopkund/qa     # must be 0 errors
```
New format (opt-in, owner-approved first for Molasses 1919): no intro card, so frame 0 is the hook already moving; the thumbnail is
held still for 0.4 s just before a short 1.5 s end card (pick that frame as the Shorts cover). Old videos keep the default layout:
```bash
SIZE=540x960 NO_INTRO=1 PRE_OUTRO_CARD=brand/molasses-1919-thumb.png PRE_OUTRO_S=0.4 AUDIO_OUT=out/molasses-1919/audio OUTRO_CARD=brand/endcard-global.png \
  bash scripts/finish.sh out/molasses-1919/picture-half.mp4 out/molasses-1919/molasses-1919-en-draft-half.mp4 0 1.5
```
(set `"bookends": {"intro": 0, "outro": 57}` in the story's `scripts/qa.config.<slug>.json` = (0.4 + 1.5) s x 30.)
Captions (optional, recommended for Hindi Shorts): render `<Captions>` from `src/engine/kit/captions.tsx` in the composition, driven by `words.json` (see `docs/VISUAL_KIT.md`, example `src/videos/chapati-1857/Chapati.tsx`); place them per shot so they never cover faces.
Then **open the contact sheet and frames and look**: subjects in frame, nothing washed out, the story's key objects readable.
Send the draft to the owner before the final.

### Step 7: Final
Run the same commands with scale `1`, without `SIZE=`, and with `-final` names. A full render takes about 30–60 s with `GL=angle CONC=6`.
Roopkund final: `out/roopkund/roopkund-hi-final.mp4` (74.5 s, −14.3 LUFS, visual QA 0 errors).
`out/` is gitignored, so re-render on a new machine.

### Step 8: Upload
Claude can upload with `scripts/yt_upload.mjs` after the owner confirms (skill: `.claude/skills/youtube-upload/SKILL.md`;
one-time sign-in per channel, secrets in `~/.config/inkfall/`, never in the repo). Or upload by hand:
- Title, description, hashtags and pinned comment: section **J** of the story's `script.md`. Add `#Shorts`.
- Cover: in the YouTube app, pick the first frame (the thumbnail).
- Audience: "Not made for kids".
- The same file works as an Instagram Reel.

One-time channel setup (Studio → Customization → Branding):
- Profile picture: the logo.
- Banner: `banner-*.png`. The text sits inside the 1235×338 area that shows on every device.
- Video watermark: `watermark-*.png`, set to "Entire video".

---

## 3. Where things are
| Path | What |
|---|---|
| `CLAUDE.md` | hard rules (read first) |
| `HANDOFF.md` | history, measured settings, decisions, status |
| `docs/STORYBOARD.md`, `CAMERA.md`, `AUDIO.md`, `VISUAL_QA.md`, `PRODUCTION.md` | engine docs |
| `agents/bharat-storyteller/` | script-writing agent (Hindi/Hinglish Indian topics) + validator + rhythm tool |
| `src/videos/<slug>/` | one folder per video |
| `stories/<slug>/hi/` | final voice + word timings |
| `audio/` | sound pipeline (cues, score, mix, reports) |
| `brand/` | logos, banners, thumbnails, end cards, watermarks (`brand/src/*.html` = editable sources) |
| `out/` | renders (gitignored) |
