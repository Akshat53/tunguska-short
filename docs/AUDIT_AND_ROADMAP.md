# Repository audit and upgrade roadmap (Phase 1 + 2)

Scope note: the brief names `claude-animated-shorts`, `src/videos/bridge/`, `Bridge.tsx`, `timeline.py`, `sfx.py`, `music.py`, `mix.py`,
`bridge-stills.mjs`, `sbs_sheet.py`. None exist here. This repo (`tunguska-short`) was started from that template; the equivalents are listed below.
Facts below were measured or read from the code on 2026-11-01. No source code was changed for this document.

## 1. Architecture (as built)

```
Root.tsx -> <Composition "TunguskaShort"> (1080x1920, 30 fps, OUT_FRAMES from warp.json)
 Tunguska.tsx  TunguskaShort: layersAt(f) -> up to 2 <ShotView> (one ThreeCanvas each) + white flash overlay
   Inner (per canvas): world.update(shotId, storyFrame, camera, scene) -> post chain
     InkPass (ink.ts, own pass) -> [LensBlur (lensblur.ts, OFF by default)] -> Bloom -> ToneMapping -> GradeEffect (grade.ts)
 warp.ts      output frame -> fractional story frame (time warp, warp.json built by scripts/warp*.py)
 story.ts     SHOTS (20), CAMS (34 per-shot camera fns, Key[] blended by run()/glide), DOF, kicks, FLASHES, XFADE, event physics
 world.ts     scene: sky, taiga (instanced trees), river, clouds, sets (straw, tree, office, globe), rings; build.ts, lights.ts, shade.ts
 cast.ts      billboard characters + fx cards (needs art.ts / toon.ts / paint.ts canvas painting, cardshade.ts)
Audio (python, offline): score.py (music + SFX cues placed through the time warp) + dsp/instruments/sfx_gen -> finalize.sh (loudnorm) -> mux
Scripts: render.mjs, stills.mjs, bench.mjs, make.sh, finish.sh, qa.sh, warp.py, warp_cues.py, beats.py, short_qa.py, sheet.py
Size: 4.4k lines TS (toon 925, paint 720, world 518, cast 494, ink 393, art 288, story 272, grade 180, lensblur 139, Tunguska 109, lights 98, build 86, cardshade 85, shade 77, warp 19)
```
Module dependencies are clean and acyclic: leaf modules (grade, ink, lensblur, lights, paint, shade, story, toon) import nothing local; `warp` imports `story`.

## 2. Existing systems and their limits
| System | State | Limits found |
|---|---|---|
| Timeline / shots | 20 shots in `SHOTS`, per-shot camera functions | **292 hard-coded frame literals in story.ts + 44 in cast/world**; the same cue frames are duplicated in `audio/score.py` (BEATS, HITS) so picture and sound can drift apart; changing voice/language needs the time warp |
| Camera | `Key[]` blended with `mixC` (linear position/look, quintic ease) + `pushK`, `chase`, kicks | no spline paths, no collision, no subject-tracking filter, no 9:16 framing helper, velocity is discontinuous where one key hands to the next (suspected source of reported "jitter"; not yet confirmed) |
| Transitions | `XFADE`: DOM opacity crossfade of two full canvases (6 transitions x 8 frames) + white flash | doubles GPU work during each crossfade; no match cuts, wipes, directional blur or focus pulls |
| DOF | `LensBlur`, per-shot `DOF` table | disabled by default after review: characters looked soft; focus point must be tied to the subject |
| Characters | billboard cards painted on canvas (toon.ts/paint.ts), expression swaps, blink schedule in frames | no head rotation, eye tracking, state machine or blending; discrete effects are integer-frame based (kick parity, flash table) |
| Crowd | none (2 herders + 4 reindeer) | would be new work |
| Environment | taiga generator + 4 small sets | single biome; no building/street/vegetation presets |
| Audio | event cues hand-placed in score.py; ducking -4 dB under speech; loudnorm -14 LUFS; stems written | no cue file, no cue sheet / sync report, no clipping check, no automatic fades |
| Tests | **none** (only `tsc --noEmit`) | regressions are caught only by eye |
| QA | `short_qa.py`, `qa.sh` (length, LUFS, streams, contact sheet) | no composition / pose-jump / sync / duplicate-frame checks |

## 3. Redundancy and hazards
- Overlapping QA/mux scripts: `short_qa.py` vs `qa.sh`; `mux.sh` vs `finish.sh`.
- Cue frames duplicated across `story.ts` and `audio/score.py`.
- **`scripts/render.mjs` and `stills.mjs` delete every `remotion-webpack-bundle-*` folder in the shared temp dir on exit.** That can remove another running render's bundle and conflicts with the "never auto-delete shared temp files" rule. Needs a per-run, own-folder cleanup.
- Unknown root cause: `fx.ink.dispose is not a function` at ~frame 1067 (guarded, not explained).
- Under the time warp, the 7-frame kick effects run at 1/(stretch) speed (kicks last ~7.5 frames).

## 4. Measured bottlenecks (this Mac, 10 cores)
| Finding | Number |
|---|---|
| Software-GL fallback vs `gl: angle` (40 frames, 1080x1920, lens off) | 1.19 s/frame -> 0.07-0.12 s/frame (about 10-17x) |
| `angle-egl` | fails ("Error creating WebGL context") |
| Concurrency under software GL | 4-6 workers hit RAM pressure (14-15 GB used, 31% system CPU) |
| LensBlur cost (software GL stills) | 8.3 s -> 5.4 s per still when off (~35%) |
| Full render, final settings | ~45 s |
| Remotion bundle per run | **37 MB** (earlier note of 1.3 GB was wrong); 10 leftover bundles = ~370 MB in temp |
| `out/` intermediates | 1.1 GB (not in git); `.git` 56 MB; `node_modules` 1.1 GB |
Not yet measured: memory per worker under `angle`, preview vs 2K output quality, per-shot render cost.

## 5. Roadmap (every item has a measurable acceptance test; none removes existing features)
| # | Subsystem | Acceptance criteria |
|---|---|---|
| 1 | **DONE (2026-11-01, see docs/STORYBOARD.md)** Storyboard config + validation (types, schema, shot presets, overlap/duration/missing-asset checks, `story.ts` kept as a compatible loader) | `tsc` passes; the config reproduces the current 20 shots; frame-for-frame identical render (SSIM ≥ 0.999 on 30 sample frames); validator catches an injected overlap |
| 2 | **Production render pipeline** (preflight, chunked render + resume, muxing, output validation, report; own-folder temp cleanup) | killed mid-run resumes without redoing finished chunks; script prints success only if all output checks pass; no deletion outside its own folder |
| 3 | **Audio cue system** (cue file per story, cue sheet, sync report, clip + fade check) | every cue lands within 1 frame of its word in the sync report; true peak < -1 dBTP; length = picture length exactly |
| 4 | **Camera director** (presets, Catmull-Rom paths, framing for 9:16, tracking filter, collision) | numeric: no velocity discontinuity above threshold in new shots; before/after stills; existing shots unchanged unless opted in |
| 5 | **Visual QA reports** (black/white/frozen/duplicate frames, pose jumps, composition, lighting jumps, audio sync/loudness) | report-only (never edits code); detects deliberately injected faults in a test video |
| 6 | **Transition engine** | each type renders with no black frame and no pop; preview composition of all types |
| 7 | **Character animation state machine** | deterministic by frame; test scene of expressions/transitions; proportions and ink style unchanged |
| 8 | Render optimization (remaining), lighting pipeline, environmental effects | each change benchmarked before/after (time, memory, bundle size, SSIM); lighting only behind a flag until approved |
| 9 | Crowd engine, environment generator | built when a story needs them; 50/100/250 benchmark |

## 6. Open decisions for the owner
1. Approve the order above (storyboard config first).
2. ElevenLabs: key is connected in `.env.local` (gitignored); choose re-voice Tunguska / Hindi voice / SDK only.
3. Whether captions may be added outside the 3D scene.
4. Reported jitter: need a timestamp; none of the frame-diff spikes found so far were glitches.
