# Storyboard config (roadmap step 1) — how to use

`src/videos/<story>/storyboard.json` is the single source of truth for the timeline. Schema + validator: `src/engine/storyboard/schema.ts`.
`story.ts` loads it at import time and **throws on any error** (deterministic: same JSON in, same timeline out).

## Shot fields
| field | meaning |
|---|---|
| `id`, `a`, `b` | 1..N in order; frame range `[a, b)`; shots must tile the timeline with no gap/overlap, ending at `totalFrames` |
| `light`, `scene` | lighting preset (`day/golden/dusk/space`), 3D set (`taiga/straw/tree/office/globe`) |
| `clock` | event clock: `none`, `after`, or `rel` with `at` (frame of the event), optional `arrive` (blast-wave arrival radius) and `scale` |
| `camera[]` | keys `{f, fn, dur?, cut?}`; `fn` names a camera function in `story.ts` (`CAM_FN`); first key must sit at `a` |
| `dof[]` | depth-of-field keys `{f, cInf, dur?, focus?: [x,y,z]}` inside the shot |
| `xfade` | crossfade frames into this shot (not for shot 1) |
| `fog`, `year`, `note` | optional |
Global `events`: `flashAt`, `flashes [[frame, peak]]`, `hits [frames]`, `kicks [[frame, gain]]` (the audio score reads `hits` from here).

## Commands
- `npm test` — tsc, storyboard validation, 10 injected-fault self-test, timeline-vs-snapshot (about 15 s, no rendering).
- `node --no-warnings scripts/validate-storyboard.mjs [file]` — validate (exit 1 on error). Reports overlaps, gaps, unknown camera functions, bad xfades, keys outside a shot, missing files, narration length vs timeline.
- `node --no-warnings scripts/story-snapshot.mjs out.json` + `python3 scripts/snapshot-diff.py old.json new.json` — per-frame regression fingerprint (shot, layers, camera, clock, DOF, kicks). Update `tests/fixtures/tunguska-story.snapshot.json` only when a timeline change is intended.
- `./make.sh <slug> <lang>` now starts with a `check` stage.

## Verified for the migration
Old hard-coded `story.ts` vs config-driven: all 2098 frames identical in the snapshot, and the full 1080x1920 render is bit-identical (md5 of every decoded frame matches).

## New story
Copy `storyboard.json`, edit shots/events, add camera functions to `story.ts` and register them in `CAM_FN`, run `npm test`.
Not yet in the config (future steps): character ids/animation states, environment presets, effects, transitions beyond `xfade`, sfx/narration cues.
