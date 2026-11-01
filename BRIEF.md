# BUILD BRIEF — "Tunguska" 60s cartoon short (cartoon-3d-short pipeline)

You are building ONE finished vertical cartoon story short end-to-end. Follow the skill at
`/home/ubuntu/.claude/skills/cartoon-3d-short/SKILL.md` — read it FIRST and execute its pipeline
(script -> voice -> shot plan -> world -> characters -> render -> audio -> final). Its templates and
references live in that same directory (`templates/`, `references/`).

## Already done (do NOT redo)
- Story + script: `/home/ubuntu/projects/tunguska-short/SCRIPT.md` (Tunguska 1908; facts sourced at top).
- Voice: `voice/voice.wav` (69.26 s, 44.1 kHz mono), `voice/words.json` (203 words with start/end timings),
  `voice/narration.txt`. Voice rule: steady calm narration. Do not regenerate.
- TOTAL = 2078 frames @ 30 fps (69.26 s). Keep final duration in 65–72 s.

## What to build
- Working dir: `/home/ubuntu/projects/tunguska-short` (git init; commit at each completed stage).
- Remotion + three.js project (follow skill stage 10 for the project layout). Use
  `templates/bridge/` as the proven starting point BUT rewrite story physics for Tunguska:
  taiga of thin pines, slow river, two Evenki herders with reindeer, fireball streaking through
  sky, mid-air flash, blast wave, falling-ring of trees, then the ground-zero trees still standing
  (stripped), aftermath calm. Three.js world posed per frame from `src/videos/tunguska/story.ts`.
- Story beats -> shots per SCRIPT.md beat map (HOOK/SETTING/ACTION/ESCALATION/SNAP/DEADPAN/
  EXPLANATION/CONSEQUENCE/CALLBACK). Timings derived from `voice/words.json`.

## Hard rules (from the skill — violating any = rework)
- LOOK: 2D flat characters inside a colorful 3D world; thick ink outlines; saturated fills;
  measured look values from `references/reports/` (light settings, outline px, DOF).
- Sprite-position rule: scene elements ~constant screen size — shrink world scale with push distance.
- Cam/bg: slow symmetric ease-in-out push-ins, cuts for big reframes, impacts = 7-frame kicks;
  background always full-bleed colorful (gradient sky). NO black voids.
- NO text/labels anywhere in the 3D scene. No copied story/characters/shots from references —
  style only (style bible in `references/` is your style reference).
- Colors from the reference sheets (`references/sheets/`).

## Audio
- Use `templates/audio/` (midi_synth.py, pad_drums.py, mix-voice-music.sh) to generate music + SFX.
- One chord change per scene change; percussion only at the 4 hits under the falling-ring (SNAP).
- Final mix: voice audible throughout, loudness ~-14 LUFS (verify with ffmpeg loudnorm print).

## Machine constraints (IMPORTANT)
- 4 CPU cores, 8 GB RAM, 43 GB free disk on /. Chromium renders on CPU.
- NEVER run parallel renders; one bundle/render at a time.
- export TEMP=/home/ubuntu/projects/tunguska-short/.tmp and TMPDIR the same before any npm/remotion
  work. Delete `remotion-webpack-bundle-*` in .tmp after EVERY render/bundle step (each copies ~1.3 GB).
  If `df -h /` drops below 25 GB free, clean .tmp before continuing.
- npm/npx available. Network available for npm installs only.

## Gates (prove each in CHECKS.md with measured numbers)
1. Every shot has a check frame (render at scale 0.5) — attach as output/checks/*.jpg.
2. Sprite-position + no-dark-void verified on check frames.
3. Audio: duration 65–72 s; loudness measured (ffmpeg); voice words audible (spot-check transcript).
4. Final QC (skill step 11): drive ~9 screens full, spot the hidden one, doff hat, final burst —
   all confirmed on frames of the final render.

## Deliverables (all in /home/ubuntu/projects/tunguska-short/output/)
- tunguska-1080x1920.mp4 (main), tunguska-2160x3840.mp4 (high-res)
- cover.jpg (1080x2088 crop of a striking still), preview.gif (500 px wide, ~2 s)
- SEND.md (what to say when sending), checks/*.jpg, CHECKS.md (all measured gates)

## Finish protocol
Print EXACTLY this marker block on the last line of stdout:
STAGE: done
DURATION: <s>
LOUDNESS: <LUFS>
FILES: <output/ files with sizes>
GIT: <git log --oneline>
If anything blocks completion, print `BLOCKED: <reason>` instead and keep partial work committed.
