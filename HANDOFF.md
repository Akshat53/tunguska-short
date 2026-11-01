# HANDOFF — read this first (for the next Claude / next machine)

Owner goal: two YouTube channels from this pipeline — **Inkfall** (global, English) and an Indian channel (Hindi).
This repo = the 2D-ink-in-3D cartoon short engine (Remotion + three.js). Video #1 = Tunguska (English, done once).
Video #2 (next) = an **Indian topic with a Hindi voice** (owner will name the topic; suggest 3 if not).

## 0. Setup on a new Mac (5 min)
```bash
git clone https://github.com/Akshat53/tunguska-short.git && cd tunguska-short
brew install node ffmpeg && npm install
python3 -m venv .venv && .venv/bin/pip install edge-tts numpy scipy pillow
```

## 1. RENDER SETTINGS (measured on a 10-core Apple-silicon Mac, 40 frames, lens off)
| GL backend | workers | s/frame |
|---|---|---|
| default (software fallback) | 4 | 1.19 |
| **angle** | **6** | **0.07 (best)** |
| angle | 4 / 8 | 0.12 / 0.09 |
| angle-egl | 4 | FAILS (no WebGL context) |
| swangle (CPU) | 4 | 1.37 |
- `scripts/render.mjs` + `stills.mjs` now default to `gl: angle` (override `GL=swangle`). Use `CONC=6`.
- `angle` output was compared with software output on 2 frames (SSIM 0.94 / 0.99, visually identical).
  **Still verify a full angle render with `scripts/qa.sh` before publishing** — only 2 frames were compared.
- Benchmark any new machine first: `node scripts/bench.mjs 500-539`.
- Old full renders took ~50 min because Chrome silently fell back to software GL and RAM ran out. Don't repeat that.
- Close browsers/other apps while rendering (RAM pressure doubles frame time).

## 2. QUALITY DECISIONS ALREADY MADE
- **Lens blur (depth of field) is OFF by default** (`lens:false` in `Tunguska.tsx`). With it on, the characters
  themselves looked soft/blurred in the shots where they appear (owner complained). Don't re-enable without
  setting the focus point on the character's face and a low `cInf`.
- Crash fix: `fx.ink.dispose` threw at ~frame 1067 on cleanup; the cleanup is now guarded (try/optional-call). Root cause not found.
- Jitter: owner reported "some jitters" but gave no timestamps. Frame-diff analysis found 9 isolated one-frame jumps;
  the two biggest (f540, f1629) are an intentional 7-frame impact kick and a hard cut. **No real glitch found yet — ask the owner for timestamps** and inspect those frames.
- Always LOOK at frames (`scripts/qa.sh` makes a contact sheet) before telling the owner a video is good.

## 3. VIDEO #1 (Tunguska) STATUS — candidate to post: `out/tunguska-final2.mp4` (local, not in git; 77.6 s, -14.2 LUFS; owner has not yet watched/approved)
Voice: **en-US-BrianMultilingualNeural at +10%** (73.2 s, 203 words), polished (EQ/de-ess/compress/room; raw `voice/voice.raw.wav`; previous Christopher voice kept in `voice/christopher22/`, original +32% voice in `voice/v1/`).
Retiming: picture timeline is still authored for the OLD voice and played through a time warp. For a different voice use the **cue-anchored warp**
(`scripts/warp_cues.py story.ts old_words new_words src/videos/tunguska/warp.json` — anchors at shot cuts/flashes/kicks/hits; the pause-anchored `scripts/warp.py` is only good when the new voice has the same inner rhythm).
Visual fixes: lens blur off; mushroom cloud redrawn (`fxPuffCloud` in art.ts; the old lobed brown blob could be misread); globe backdrop teal (space look); golden sunset sky warmer with a wider gradient (no flat mauve when looking up).
Build chain: `python3 scripts/warp_cues.py ...` -> `CONC=6 node scripts/render.mjs out/picture.mp4 all 1 '{"post":{"dpr":1}}'` (~45 s) -> `.venv/bin/python audio/score.py && bash audio/finalize.sh` -> `scripts/finish.sh out/picture.mp4 out/final.mp4 0.8 3` (intro 0.8 s + outro 3 s cards) -> `scripts/qa.sh out/final.mp4`.
Open: jitter report unresolved (no timestamps; frame-diff spikes found were cuts/kicks); captions not added (owner decision); hook is still a quiet aerial (consider a cold-open teaser).

## 3b. ELEVENLABS
`npx @elevenlabs/cli onboard connect` was run on the owner's Mac: the key lives ONLY in `.env.local` (gitignored, never committed, never print it). On a new machine run `npx -y @elevenlabs/cli@latest onboard init` again.
Nothing is wired in yet; owner has not chosen between re-voicing Tunguska, the Hindi voice, or SDK-only. Never ask for a key in chat.

## 3c. ENGINE UPGRADE PLAN
See `docs/AUDIT_AND_ROADMAP.md` (architecture audit, measured bottlenecks, ordered roadmap with acceptance tests). **Nothing from the roadmap is implemented yet** — only the audit exists.
Known hazard: `render.mjs`/`stills.mjs` delete all `remotion-webpack-bundle-*` in the shared temp dir on exit (fix in roadmap item 2).

## 4. PIPELINE (new language / new story) — see NEW_STORY.md and `make.sh`
`./make.sh <slug> <lang> [voice beats render mux]`; config in `stories/<slug>/story.json`; `scripts/beats.py words.json` prints word→frame.
Frames in `story.ts` are HARD-CODED (not read from words.json) — a different voice/language needs manual retiming.
**Best optimization still open: make the timeline derive shot frames from words.json + named beats** so a new language retimes itself.

## 5. NEXT VIDEO: Indian topic, Hindi voice
1. Pick topic (ideas: Bhopal 1984, Kuldhara village, Nalanda library, Rann of Kutch, 1737 Calcutta cyclone, Kohinoor).
   Write `stories/<slug>/SCRIPT.md` like `SCRIPT.md`: **verified facts with sources first, list debunked claims you did NOT use**, ~200 words, beats HOOK/SETTING/ACTION/ESCALATION/SNAP/DEADPAN/EXPLANATION/CONSEQUENCE/CALLBACK, calm deadpan tone.
2. Hindi narration in Devanagari in `stories/<slug>/hi/narration.txt`. Voices: `hi-IN-MadhurNeural` (male), `hi-IN-SwaraNeural`. Rate: start at `+10%` (English used +32% which was too fast). Check Hindi word boundaries exist in `words.json` (edge-tts may group Devanagari words differently — inspect first).
3. `./make.sh <slug> hi voice beats` → duration must land 55–72 s → retime shots to the printed frame table.
4. New world/cast (copy `src/videos/tunguska/`), register a Composition in `src/Root.tsx`, adapt `audio/score.py` BEATS/HITS.
5. Draft at half scale first: `SCALE=0.5 ./make.sh <slug> hi render mux`; owner approves; then full.
6. Look rules: saturated gradient skies (no black voids), thick ink outlines, constant-screen-size sprites, slow symmetric push-ins, 7-frame impact kicks, NO in-scene text. Respectful treatment of real tragedies (e.g. Bhopal): factual, no jokes at victims' expense.

## 6. BRAND / CHANNELS
- Name **Inkfall** (global). Hindi channel name undecided (options: Inkfall Hindi, Inkfall Kahani, Dhamaka Kahani). Handles: `@inkfall` was TAKEN; try `@inkfallshorts`.
- Owner dislikes purple; wants **sea-green / teal / cream / sunflower-yellow** palette (ink outline `#10222B`). `brand/` has older purple SVG/PNGs (placeholders). Owner will make final logo/banner with Gemini (prompts were given in chat); then add wordmark + size for YouTube (avatar 800², banner 2048×1152, safe area 1235×338 centre).
- `brand/youtube-setup.md` = channel text, studio checklist, upload template. Set "not made for kids".

## 7. MAC/SHELL PITFALLS HIT
- zsh does not word-split `$var` → `for a in "x 1 2"; do set -- $a` breaks; use explicit calls or `${=a}`.
- Headless Chrome screenshots: use a **fresh `--user-data-dir` each run**; write to scratchpad then copy; `qlmanage` crops SVGs to a square.
- `pkill chrome-headless-shell` also kills your own background Chrome jobs.
- Don't `rm -rf` temp-dir globs (blocked as unsafe); a killed render leaves a ~1.3 GB `remotion-webpack-bundle-*` in the temp dir — delete that one folder by exact path.
- Tunguska's files predate the pipeline: voice in `voice/`, final mix `audio/out/mix.wav`.
