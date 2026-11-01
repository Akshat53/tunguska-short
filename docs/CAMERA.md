# Camera director (roadmap step 4)

`src/engine/camera/` is a reusable procedural camera toolkit. Everything is a pure function of the frame number (no state, no random, no time), so Remotion can render any frame alone.

## Modules
`math` (vectors, seeded smooth noise) | `ease` (smootherstep, cubic, **acceleration/cruise/deceleration profile**) | `spline` (centripetal Catmull-Rom, constant speed along arc length) |
`framing` (9:16: distance for a subject height, eye line at 38% from the top, group framing, projection, Shorts safe area) | `tracking` (Gaussian-window subject smoothing, deterministic) |
`collision` (sdf obstacles: sphere/cylinder/box, smooth push-out that eases in before contact, ground last, `pathReport` author warning) | `presets` (the 12 shot types) | `index`.

## Presets (all take `subject` = a name or a list of names for group framing, plus `f0`/`dur`, which the storyboard fills in)
establishingWide, aerial, closeUp, extremeCloseUp, lowAngle, highAngle, dollyIn, dollyOut, orbit, crane (supports `lookTo` and `fovTo`), tracking (world-point `path`), overShoulder.
Common params: `fov, fovTo, ease (smooth|cubic|cruise|linear), accel, decel, roll, handheld (subtle deterministic roll/sway), seed, sigma (tracking smoothing), eyeY, margin (collision), az, el, fill, size, push`.
Rack focus: `dofAt` glides the focus point between two keyed focus points when a DOF key has `dur` (no existing shot uses it; depth of field stays off by default).

## Using it from the storyboard
A camera key may be `{ "f": 240, "preset": "dollyIn", "params": { "subject": ["herder1","herder2"], "fillFrom": 0.5, "fillTo": 0.62 } }` instead of `{ "f", "fn" }`.
Subjects and obstacles are defined in `story.ts` (`DIRECTOR_SUBJECTS`, `DIRECTOR_OBSTACLES`) and listed in `storyboard.json` `cameraSubjects`. The validator checks presets, params and subjects.
The upgraded camera set (shots 2, 3, 15, 17, 20) lives in `camera-upgrade.overlay.json`; it is OFF by default. Render with the input prop `{"camera":"upgraded"}` or env `STORY_CAMERA=upgraded`.

## Findings (measured, not assumed)
- The existing hand-written camera paths are already smooth: every shot scores <= 0.046 on the hitch metric (`scripts/camera-metrics.mjs`), so the camera is NOT the source of the reported jitter.
  The value of the director is reuse, composition, safety and speed of authoring for new stories.
- Authoring check: a path that goes THROUGH an obstacle cannot be fixed by any push-out (the camera must pick a side); `pathReport` flags it. Found while testing (dolly through a sphere).
- The Tunguska forest has thousands of instanced trees that are not registered as obstacles yet (only the tent, herders, deer and the ground zero herder are).

## Before/after on the five upgraded shots (`node --no-warnings scripts/camera-compare.mjs`; stills in `out/camera/compare_sheet.jpg`)
| shot | measure | default | upgraded |
|---|---|---|---|
| 2 river approach | camp inside the 9:16 safe area | 0% | 100% |
| 3 herders | herders inside the safe area / hitch | 62% / 0.038 | 100% / 0.015 |
| 15 hero tree | eye line from top / hitch | 0.50 / 0 | 0.38 / 0.013 (orbit) |
| 17 ground zero | subject fill of frame height / eye line | 31% / 0.49 | 63% / 0.38 |
| 20 callback + crane | crane end position and sparkle in frame | (150,150,520) | (151,151,522), same sparkle position |
Shot 20's herders leave the frame on purpose during the crane-out in both versions (59% vs 58%).
A first version of the shot 20 crane lost the final shooting-star sparkle (the look point stayed on the herders) and ended 20 m short; fixed with `lookTo`, `fovTo` and the matched end point.

## Tests (`node --no-warnings scripts/test-camera.mjs`, part of `npm test`)
Easing (endpoints, monotone, zero end velocity, no acceleration jumps) | spline (end points, passes control points, +/-0.5% constant speed, tangent continuity) | framing (a 1.7 m subject fills 49% at fill 0.5, eye line 38%, group fits the safe area) |
collision (sphere/trunk/box/ground push-out, smooth slide, clearance >= margin) | tracking filter (127x lower acceleration spikes on a jittery subject) |
every preset: deterministic out of order, finite, subject inside the 9:16 safe area >= 98%, hitch <= 0.08 without obstacles, no teleport with obstacles, fov 18-70, roll < 0.02 rad | bad subjects/params rejected.
Bugs these tests found in my first version: box push-out could send the camera underground; hard push-out kinked the path (now C1 and eased in before contact); a group-framing clamp stopped the crane from pulling far enough.

## Not covered
Registering the instanced trees as obstacles, using presets across the whole film (only five shots are upgraded and the default is unchanged), a camera preview composition, and a visual regression against full renders of the upgraded set.
