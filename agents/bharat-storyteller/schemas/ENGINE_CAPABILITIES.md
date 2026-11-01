# ENGINE CAPABILITIES — what a storyboard may ask for today

Source of truth, read on 2026-11-01: `src/engine/storyboard/schema.ts`, `src/engine/camera/presets.ts`, `src/videos/tunguska/{story,world,cast,toon,art,lights,grade,Tunguska}.ts(x)`,
`audio/cues.py`, `audio/cues.json`, `audio/sfx_gen.py`, `audio/score.py`. If the code changes, re-read it and update this file **and** the enums in
`shot.schema.json` / `audio-cue.schema.json`. The Cinematic Director may use ONLY what is listed here; anything else goes to `futureDevelopment`.

## 0. Hard facts about the engine
| Fact | Consequence for a script |
|---|---|
| Output 1080x1920 (9:16), **30 fps**, every timestamp maps to a frame `round(sec * 30)` | `startFrame/endFrame` in every shot and segment |
| Remotion + three.js; **every animation is a pure function of the frame number** (no randomness, timers, physics sims) | Only describe motion that can be written as `f(frame)`: eased moves, keyed poses, seeded variation. No "random crowd chaos", no simulated cloth/water/fire |
| Characters are **2D flat cards (billboards) with thick ink outlines**, standing in a 3D world, drawn on canvas each frame | No 3D turns of a body, no lip-sync, no fingers detail, no close hand acting. Front view or side view only |
| Ink pass outlines the 3D world; post chain order is fixed: **InkPass -> LensBlur (pre, main) -> Bloom -> ToneMapping -> Grade** | Never ask for DOF "merged" with ink or for stylised edge effects that replace ink |
| **Lens blur / DOF is OFF by default** (`lens:false` in `Tunguska.tsx`); characters looked soft with it on | Don't rely on bokeh. If truly needed: focus on the character's face, low `cInf`, flag for owner approval |
| **No film grain** (removed for good), no excessive bloom, no crushed shadows | Never request grain, VHS, noise or "gritty" filters |
| **No in-scene text / labels** (house look rule) | Dates, numbers and names are SPOKEN, not written in the scene. Captions, if ever, are outside the 3D scene (owner decision pending) |
| A **new story needs new world/cast/timeline code** (`NEW_STORY.md` B: copy `src/videos/tunguska/` -> `src/videos/<slug>/`, rewrite `world.ts`, `cast.ts`, `story.ts`, register a Composition) | Every new location and every new costume is development work. Keep the number of distinct sets small (2-4) and reuse them across shots |
| The timeline is data: `storyboard.json` (shots, camera keys, DOF keys, xfade, events) validated by `schema.ts` | Our `script.json` shots map 1:1 onto storyboard shots (see §9) |
| Look rules (HANDOFF §5.6): saturated gradient skies (never black voids), thick ink outlines, constant-screen-size sprites, slow symmetric push-ins, 7-frame impact kicks | Design shots in this grammar |
| Palette preference: sea-green / teal / cream / sunflower-yellow; ink `#10222B`; owner dislikes purple | Costume colours from this palette |

## 1. Shots (storyboard `shots[]`)
Each shot: integer `id` 1..N in order, frame range `[a, b)`; shots **tile the timeline** with no gap/overlap, first at 0, last ends at `totalFrames`.
Per shot: `light`, `scene`, `clock`, `camera[]`, `dof[]`, optional `xfade`, `fog [near, far]`, `year`, `note`.
Global `events`: `flashAt` (one 4-frame white flash, required, inside the timeline), `flashes [[frame, peak]]` (peak 0-1, 10-frame fall), `hits [frames]`
(percussion hits read by the audio score), `kicks [[frame, gain]]` (7-frame camera shake; every hit should have a kick).

## 2. Scenes (sets)
Existing scene ids (Tunguska only): `taiga` (pine forest of ~20k instanced trees, river, scorched/fresh ground, smoke wisps, tent/chum, big pole),
`straw` (stump insert set), `tree` (hero tree on a knoll), `office` (wall + wide window, desk, nine screens, star chart), `globe` (textured globe + pressure rings).
They are Siberian/Tunguska-specific. **For an Indian story a scene is `kind: new` (or `adapt`)** and is built from these reusable components:
- gradient sky with 5 elevation stops + painted clouds (+ stars at dusk / in space) — per light preset (`lights.ts LOOK`)
- ground plane with painted textures (`paint.ts`): `grass`, `cobble`, `stone`, `planks`, `water`, `bed`, `roof(col)`, `brick`, `facade(wall, shutter, door, timber, brick)`, HD variants (`stoneHD`, `cobbleHD`, `roofHD`, `grassHD`, `facadeHD`, `planksHD`, `beamHD`), `waterNear/waterFar`, `cloudHD`
- simple geometry helpers (`build.ts`: `Batch`, `boxGeo`, `lam` materials) — boxes, cylinders, cones; instanced repetition (as the forest)
- a river ribbon with water shading; smoke wisps; canvas-painted props (tent hide, pole bark, globe map, screens, chart)
- fog `[near, far]` per shot; `clock` drives event physics (none / after / rel)
A new Indian set (fort wall, ghat steps, stepwell terraces, temple shikhara, village huts, launch pad) = boxes/cylinders/cones + painted canvas textures + ink outline. Budget it.

## 3. Light presets (`lights.ts`, `grade.ts`) — exactly four
| id | look | use |
|---|---|---|
| `day` | blue sky, warm sun az 75 el 48, soft contact shadows | default, clarity, context |
| `golden` | low sun (el 7), orange-peach sky, real card shadows on the ground | nostalgia, endings, emotion |
| `dusk` | violet-blue evening, warm lamp key | interiors, mystery, night-ish (no true night) |
| `space` | teal backdrop (never black), bright key from screen left | space, maps, the globe, abstract explainer |
There is no `night`, `storm`, `rain`, `interior-lamp`, or per-shot custom colour. The sun is camera-relative and frozen per shot.

## 4. Camera (camera director presets, `src/engine/camera/presets.ts`)
A camera key: `{ f, preset, params, dur?, cut? }`. First key at the shot start; keys strictly ascending; from key to key the camera **glides** (smootherstep over `dur`, default 24 frames) unless `cut: true`.
Shots can also use hand-written camera functions (`fn`) registered in the story's `CAM_FN` — new code, so prefer presets.
Common params (all presets): `fov` (40, vertical deg), `fovTo`, `ease` (`smooth|cubic|cruise|linear`), `accel`/`decel` (0.3, cruise only), `roll`, `handheld` (0 = off; ~0.5-1 subtle),
`seed`, `sigma` (4, jitter filter), `eyeY` (0.38, where the eye line sits), `margin` (0.6, collision), `az` (0 = camera on +z side; 90 = +x side), `el` (deg), `size`, `fill` (fraction of the frame height the subject fills).

| preset | required | defaults / extra params | grammar |
|---|---|---|---|
| `establishingWide` | subject | fill .12, el 12, push .06, fov 46, eyeY .5 | far, slightly high, slow push; sets the place |
| `aerial` | subject | fill .08 -> fillTo .12, elFrom 58 -> elTo 42, swing 25, fov 46 | high orbiting descent |
| `closeUp` | subject | fill .55, push .04 | head and shoulders |
| `extremeCloseUp` | subject | fill .9, size .4, eyeY .45, fov 32, push .03 | face fills frame (a flat card: use sparingly) |
| `lowAngle` | subject | fill .6, el -16, push .03 | power, awe |
| `highAngle` | subject | fill .5, el 40, push .03 | smallness, vulnerability |
| `dollyIn` | subject, fillFrom, fillTo | exponential push | tension, realisation |
| `dollyOut` | subject, fillFrom, fillTo | pull away | isolation, scale reveal |
| `orbit` | subject | fill .5, az0 0, sweep 90 | circle; showcase a monument |
| `crane` | subject | fillFrom .5 -> fillTo .1, elFrom 5 -> elTo 45, swing 0 | rise and pull back on a spline (or reverse) |
| `tracking` | subject, path (>= 2 world points) | eyeY .5 | travel along a spline while looking at the subject |
| `overShoulder` | subject, shoulder | back .9, side .45, up .25, fill .5 | conversation / discovery POV |
Subjects are named points in the story code (`DIRECTOR_SUBJECTS`: `{at(f), height}`), e.g. `herder1`, `camp`, `burst`. A new story declares its own subjects
(characters' eye lines, monuments). Group framing: `subject` may be a list. Collision avoidance keeps the camera out of declared obstacles and above ground.
Impact **kick**: 7-frame decaying shake (`events.kicks`). Slow symmetric push-ins are the house style; hard cuts for big reframes.
Not available: rack-zoom/dolly-zoom as a preset (possible via `fov`->`fovTo` + dollyOut, test first), whip pans, split screen, picture-in-picture, POV head-bob, drone shake.

## 5. Characters (`toon.ts` + `cast.ts`) — what really exists
Flat cards drawn in a 600x1000 design space; lit by the scene's sun (painted crescent + thick outline on the shade side); contact shadow blob; blinks every 0.5-2.3 s
(seeded) plus a blink hiding every expression swap; expression/action changes land 0-3 frames before the word.
- **Views**: `front` (also 3/4 via `facing` -1|0|1) and `side` (profile, mirrored as needed). The engine picks side vs front from the walk direction relative to the camera.
- **Front modes** (`bodyFront`): `march`, `stroll`, `stand`, `sit`, `fall`. Options: `phase` (walk cycle 0-1), `look` (-1..1 eyes), `blink`, `lift` (knee lift), `prop`, `tilt` (body lean deg), `headTilt`, `wave` (raised arm: wave/point), `facing`.
- **Side modes** (`bodySide`): `march`, `stand`, `swing` (on a swing; `pose` = kick), `push` (pushing with hands to a target; `pose` 0-1). Options: `phase`, `stomp`, `stride`, `pose`.
- **Expressions (exactly 14)**: `neutral, stern, grin, laugh, whistle, nervous` (with sweat drop), `shock, relief, relief_open, dazed` (spiral eyes), `pained, smile, smile_closed, lick`.
  (no `angry`, `sad`, `crying`, `thinking`, `talking` — mouths do not move with speech)
- **Builds**: `adult`, `stout`, `kid`. **Head shapes**: 7 seeded variants.
- **Outfit fields**: `jacket, pants, boots, hat, belt, buttons, rifle, sash, sword, moustache, skin, head, cap, hair, dress, build`. Skin tones: any hex (four presets in `SKINS`).
- **Hats** (exactly these): `hood`, `cap`, `hair` (hair, no hat), `shako`, `shako_tall`, `tophat`, `bonnet`, or none. No turban, pagdi, topi, saree drape, crown, helmet — those are new drawing code (see §11).
- **Props**: `icecream`, `shako` (held), `hatHeld`, `hammer` (strike 0..1). Rifle and sword flags on the outfit.
- **Animals**: `reindeer` card only (`phase`, `graze`, `coat`, `look`, `blink`). Any other animal (tiger, elephant, cow, peacock) is new art.
- Drawing tiers by camera distance (canvas resolution), so a character can be seen from 1.5 m to ~40 m.
- Crowds: a handful of cards (Tunguska used up to ~6 people); the crowd engine is roadmap item 9 (not built).

## 6. Effect cards (`art.ts`, `toon.ts`) — unlit ink drawings on cards (no ink pass on them)
`fireball` (with crack/flicker), `bowShock` (squeeze), `blast` (t), `puffCloud` (mushroom/puff cloud), `waveRing` (ground shock ring), `dust` (t, seed), `needles` (pine needles),
`straw` (squash/fold), `hand` (pressing hand), `arrow` (direction arrow), `gust` (wind lines), `shootingStar`, `sparkle` (t), and from the older toolkit `note` (music note),
`burst` (rays), `splash`, `puff`, `stars` (dizzy stars), `creak` (strain lines), `ring`, `cloud`, `plank`, `drum`, `blob`, `smoke` (world wisps).
Screen-level: `flash` (white overlay; `events.flashAt` 4-frame flash or `events.flashes` with peak + 10-frame fall), `kick` (camera shake).
Cards can be hard cut-out, soft (see-through dust/mist), glowing (`glow`), or ground blobs. A NEW card drawing for a new story uses the same machinery but needs code (`newArt: true`).
Not available: particles/simulation, volumetric smoke or fire, real water simulation, text cards, maps with labels, photos/video footage.

## 7. Transitions
| type | engine | notes |
|---|---|---|
| `open` | first shot | the video starts on it |
| `cut` | default between shots | also `cut: true` on a camera key = hard cut inside a shot |
| `xfade` | `shot.xfade = N` frames (crossfade by stacking two canvases) | not on shot 1; N <= both neighbouring shot lengths; use at place/time changes |
| `flash` | cut under `events.flashAt` (4 frames) or `events.flashes [frame, peak]` | for impacts/reveals; at most 2-3 per video |
| `xfade-flash` | both | rare |
Camera glides between keys (`dur`) act as soft in-shot transitions. Not available: wipes, whip-pan, match-cut morph, iris, zoom-blur, page turn (roadmap item 6 "transition engine").

## 8. Audio (`audio/cues.py`, `audio/cues.json`, `audio/score.py`)
Sound design is data. A cue: `{id, at (frame), offset (s), gen, args, span [from,to] (-> duration), extra (s), post [[op, arg]], sync, word, word_index, word_u, note}`.
Generators (exactly these): `whoosh {dur, peak, f_lo, f_hi, width, tail}`, `boom {dur, f0, big}`, `crack`, `wood_crack`, `oof {voice}`, `whoa`, `squeak {pitch}`,
`crackles {dur, density, gain}`, `breeze {level, bright}` (span), `water {close}` (span), `birds {density}` (span), `rumble {dur, gain, lo, hi, decay}`,
`roar {lo, hi, gain, ramp, floor}`, `hum {hz, tone, noise}`, `glock {midi, level}`.
Emitters: `steps {period, pitch, gain, pan0, pan_step}` (footsteps), `clicks {count, freq, decay, level, gain, pan, window}` (keyboard), `notes {midi[], level, spacing, pan0, pan_step}` (glockenspiel run).
Post ops (validated): `gain`, `widen`, `pan`, `st2`. (`decay`/`ramp` are mentioned in a comment but rejected by `validate()`.)
`sfx_gen.py` contains more synths that are NOT wired as generators yet (creak, clink, rattle, boot, column_stomp, chain_groan, bolt_snap, timber_tear, bubbles, splash_big,
babble, hurrah, applause, crickets, flag_flutter, push_thump, hammer_hit, stroll_step): using one = a one-line `GEN` entry in `cues.py` (small dev task, list it).
Music: procedural score; `music.beats[]` = `{name, shots [first, last], chord, level}`; chords available: `Dm, F, Gm, A, Bb, C` (the table is data, more can be added);
percussion hits from `events.hits`. Mix: music ~13 dB under the voice and ducked a further 4 dB while words are spoken; SFX ~6 dB under the voice; -14 LUFS, true peak < -1 dBTP.
`master.fade_in/fade_out` seconds. Voice: edge-tts (`hi-IN-MadhurNeural`, `hi-IN-SwaraNeural`, start at `+10%`), or ElevenLabs (connected, not wired in). No licensed music, no recorded Foley, no Indian instruments (tabla, shehnai, sitar) yet.

## 9. How script.json maps onto the engine
| script.json | storyboard.json / cues.json |
|---|---|
| `shot.id/startFrame/endFrame` | `shot.id/a/b` |
| `shot.lighting` | `shot.light` |
| `shot.environment.scene/clock/fog/era` | `shot.scene/clock/fog/year` (scene ids are the new story's own) |
| `shot.cameraMovement.keys[]` | `shot.camera[]` (preset keys) |
| `shot.dof[]` | `shot.dof[]` (usually empty or `cInf: 0`) |
| `shot.transition` xfade frames | `shot.xfade` |
| flash transitions / `effects: flash` / `kick` | `events.flashAt`, `events.flashes`, `events.kicks` |
| characters/actions/expressions/effects | the story's `cast.ts stage()` code (hand-written per story: not data yet) |
| `audio.cues`, `audio.music.beats` | `audio/cues.json` (cues, music.beats) |
| `world.subjects` | `DIRECTOR_SUBJECTS` in `story.ts` |

## 10. Timing realities
- Picture frames are authored for the voice; a different voice/language needs retiming (`scripts/beats.py words.json` prints word -> frame; `scripts/warp_cues.py`).
- Hindi duration target 55-72 s for the pipeline (HANDOFF); the agent targets 45-65 s, hard window 30-75 s. Hindi TTS at +10%: plan ~2.6 words/s, then measure.
- Edge-tts may group Devanagari words differently in `words.json`: inspect before syncing cues to words.

## 11. Not supported yet (future development) — concrete suggestions
1. **Indian costume kit** in `toon.ts`: hats `pagdi`, `topi` (Gandhi cap), `turban`, `helmet`; `dupatta`/`saree` drape over `dress`; `dhoti`; beard. (Extend `Outfit.hat` + `hatOn()`.)
2. **More expressions**: `sad`, `angry`, `determined`, `thinking`, `talking` (2-3 mouth shapes keyed to words.json for rough lip flap).
3. **Gesture/pose library**: point-at-target, hands-joined (namaste), carry-object, kneel, run, climb, salute as front/side modes with a `pose` 0-1 parameter.
4. **Animal cards**: elephant, tiger, horse, cow, peacock, monkey (same approach as `reindeer` in `art.ts`).
5. **Indian set kit** (`world.ts` helpers): fort wall + bastion, temple shikhara/mandapa, stepwell terraces, ghat steps + river, village huts, palace arches, desert dunes, salt flat, launch pad + rocket.
6. **Data-driven characters**: character ids/animation states in `storyboard.json` (roadmap item 7 state machine) so shots stop needing hand-written `stage()` code.
7. **Transition engine** (roadmap 6): wipe, match-cut, iris, whip-pan, page-turn.
8. **Map card** without text: India outline + glowing dot + route line (useful for geography stories).
9. **Wire the unused synths** (`crickets`, `bubbles`, `splash_big`, `applause`, `hammer_hit`, `chain_groan`...) as `GEN` entries; add Indian timbres (tabla-like membrane, drone/tanpura pad, shehnai-like reed via `instruments.brass/fife`).
10. **Night light preset** (deep teal-blue, moon key, never black) and a **rain/storm** overlay card.
11. **Auto SFX placement** from storyboard events; music intensity curve from narration intensity.
12. **Captions outside the 3D scene** (owner decision) and a shot-level preview render by id.
