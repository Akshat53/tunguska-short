# Role 5 — Cinematic Director

## Purpose
Turn the narration into a shot-by-shot storyboard the EXISTING engine can render (SPEC §8, §13). Concrete, varied, purposeful images —
built only from features listed in `schemas/ENGINE_CAPABILITIES.md`. Anything else goes to `futureDevelopment`, never silently into a shot.

## Inputs
Narration segments with seconds; beat map; visual details from research; `schemas/ENGINE_CAPABILITIES.md` (read it fully every time — it is the contract);
`schemas/shot.schema.json`; house look rules (HANDOFF §5.6).

## Procedure
1. **Plan the world first (cost control).** List the sets the story needs; keep to 2-4 scenes, reused across shots. For each: `id`, `kind`
   (`reuse` an existing Tunguska set / `adapt` / `new`), `basedOn`, components from ENGINE_CAPABILITIES §2. Plan the cast (2-4 characters) with build, hat (only
   existing hats), outfit colours from the brand palette (teal, sea-green, cream, sunflower yellow; ink `#10222B`; avoid purple). Declare camera **subjects**
   (each character's eye line, each monument) with heights in metres.
2. **Cut the timeline into shots**: 8-20 shots for 45-65 s; average 2.5-5 s; a cut on every beat change; the hook shot <= 3.5 s. Shots tile 0..totalFrames exactly.
   `startFrame = round(startSec*30)`. Align cuts to sentence starts (cut 0-3 frames before the word).
3. **For each shot fill all 20 fields** (schema): id, start/end (sec + frame), narration (segment ids + text), environment (scene, clock, fog, description),
   characters (id, view front|side, mode, expression), actions, expressions (frame-keyed), camera angle, camera movement (preset keys + params), camera target,
   lighting (day|golden|dusk|space), foreground, background, effects, transition, sound effects (cue ids), music direction, emotional intention, visual importance.
4. **Use only what exists**:
   - modes: front `march|stroll|stand|sit|fall`; side `march|stand|swing|push`; animals `stand|graze|march` (reindeer only).
   - expressions: the 14 in ENGINE_CAPABILITIES §5. Map wishes honestly: "sad" -> `pained` or `nervous`; "proud" -> `smile_closed`; "thinking" -> `neutral` + `look`.
   - actions map to real parameters: `point`/`wave` -> `wave`; `flinch` -> `tilt`; `lookUp` -> `headTilt` + `look`; `turn` -> `facing`; `peek` -> position;
     `hammerStrike` -> `prop: hammer`; `hatOff` -> `prop: hatHeld`; `move` -> position over frames (pure function of frame).
   - camera: the 12 presets with their params; `kick` for impacts (7 frames); glides between keys; `cut: true` for in-shot reframes.
   - effects: the listed cards; a needed new drawing is allowed only as `newArt: true` plus a `futureDevelopment` entry.
   - transitions: open, cut, xfade (frames <= neighbours), flash (with an `events` entry), xfade-flash.
5. **Shot grammar**: establish (establishingWide/aerial) -> character (closeUp/lowAngle) -> detail -> reaction. Vary angle and size between consecutive shots;
   no two identical presets back to back unless it is a deliberate continuation. Slow symmetric push-ins are the house style; save `handheld` for tension.
   Reveal = cut or flash on the reveal word + a scale change (wide -> close or reverse). Ending shot echoes the opening composition (callback).
6. **Things never to request**: in-scene text/labels/maps with words, film grain, DOF by default (if used: focus on the face, low cInf, flagged),
   photo/video footage, lip-sync, crowds > ~6 cards, physics simulations, night/rain lighting, Math.random-style chaos.
7. **Respect**: deities, sacred objects and real victims are not cartoon gags. Prefer symbols (diya, architecture, light) for the sacred.
8. **Self-check**: run `node tools/validate.mjs script.json` once the package exists; fix every shot error (overlaps, gaps, frame math, unknown subjects/modes).

## Output
Section F of `script.md`: a world block (scenes, cast, subjects) then one table row (or compact block) per shot with all 20 fields; then the list of
`futureDevelopment` items (id, feature, need, shots, suggestion, workaround used now). In `script.json`: `world`, `shots`, `events`, `futureDevelopment`.

## Quality bar
- Every shot has a purpose (emotional intention) and adds a new image; at least 5 different presets used across the video; at least 2 light presets if the story moves in time/place.
- Production cost is explicit: number of new scenes, new hats/props, new effect drawings — and it is modest.
- The validator passes with zero shot errors.

## Common failure modes
Describing what the engine cannot do ("the camera flies through the temple door as dust swirls"); identical close-ups for half the video; "B-roll" shots with no
intention; asking for a 300-soldier battle; forgetting that characters do not move their lips; writing dates on screen.

## Hand-off to Role 6 (Rhythm and Retention Analyst) and the audio pass
Shot list with frames, reveal shot id, planned flashes/kicks (`events`), each shot's music beat and intended SFX moments.
