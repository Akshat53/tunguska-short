# Visual QA (roadmap step 5)

An automated, **report-only** quality check of a finished vertical Short. It never edits source code, renders or audio. It compares the decoded video with what the story says *should* be on screen (camera, subjects, planned cuts, flashes and kicks), and checks the audio.
Uncertain detections are reported as `warn` with the reason, never as `error`. Overall status is **FAIL if any finding has error severity**.

## Usage
```bash
node --no-warnings scripts/qa-story-data.mjs --out out/qa-final3/qa-story.json          # [--config scripts/qa.config.tunguska.json] [--no-bookends]
.venv/bin/python scripts/visual_qa.py out/tunguska-final3.mp4 --story out/qa-final3/qa-story.json \
    --audio-report audio/out/audio_report.json --out out/qa-final3                       # exit 1 on FAIL
bash scripts/test-visual-qa.sh                                                           # self-test with injected faults (about 70 s)
```
Outputs in `--out`: `visual_qa.json` (every finding plus the thresholds used), `visual_qa.md` (PASS/WARN/FAIL per check, a table of findings, info measurements),
`screenshots/f<frame>_<category>.jpg` (full-size frames, max 40, errors first), `problem_sheet.jpg` (only the problem frames; red border = error, orange = warn, label = frame and category), `perframe.npz` (raw per-frame series).
Runtime on the 77.6 s video: about 20 s.

### Pieces
| file | role |
|---|---|
| `scripts/qa-story-data.mjs` | Bundles `story.ts` and `src/engine/camera` with esbuild. Reads `storyboard.json`, `warp.json` and the QA config. Writes `qa-story.json` with, for every **output** frame: story frame (time warp plus the 24-frame intro offset), shot, crossfade layers, camera pos/look/fov/roll, each configured subject's NDC position, depth, safe-area flag and projected box (`framing.project`, 9:16), camera clearance to `DIRECTOR_OBSTACLES`, expected DOF, and planned-event flags (cut, crossfade, flash, kick, hit, bookend). Also writes the event list in output frames. |
| `scripts/qa.config.tunguska.json` | Per-story intent: subjects that must stay visible in each shot (optionally `from`/`to` story frames, `required:false`), expected framing (`fill`, `null` = not checked), `motion` (moving/static), `dofExpected`, `intendedEmpty` spans, subject box geometry (metres around the anchor, or `screenW` for fx cards drawn at a constant screen size), extra subjects (`rockAt`, `EXPED`), events with no sound on purpose. |
| `scripts/visual_qa.py` | The 12 checks. Decodes with ffmpeg rawvideo at 272x480 (area scaling). Thresholds are in the `CFG` block at the top of the file. |
| `scripts/qa_inject.py`, `scripts/test-visual-qa.sh` | Fault injector and self-test. |

Verified: event frames computed from the story data land exactly on the frame-difference spikes of the real video (flashes 112/215/392/788/1381, cuts 218/326/384/460/...). Projected subject boxes were overlaid on frames from every shot and match the drawn herders, reindeer, ground-zero herder, expedition, hero tree and fireball.

## The 12 checks
| # | category | what it measures | severity rules |
|---|---|---|---|
| 1 | clipping | camera clearance to obstacles (from the story); a required subject's box cut by the top or side frame edge for more than 30 frames (bottom crops are normal framing) | inside an obstacle: error. Closer than 0.3 m, or edge-cut: warn (model shapes) |
| 2 | visibility | required subject's anchor off-screen or behind the lens; outside the Shorts safe area (`framing.SAFE`) | off-screen > 1 s: error; 0.5-1 s: warn; outside the safe area > 1 s: warn |
| 3 | composition | per-shot medians: subject fill of frame height, eye line (from top), headroom | warn only (taste); info when within intent |
| 4 | lighting | frame-to-frame step of mean luma, temperature (R-B) and chroma, outside planned cuts/flashes/crossfades/kicks, and at least 4x the local median step. **Whole-frame test:** the same-sign change must show in at least 75% of a 4x4 grid | luma > 0.12 or temperature > 0.09: error; smaller: warn; local change (an object entering): info |
| 5 | transition | unplanned black/white frames anywhere; at each cut: ghost (blend) frames, brightness jump; at each crossfade: measured blend length | black/white frame: error; ghosting, a jump > 0.30, or a crossfade with no blend / too long: warn |
| 6 | pose_jump | one-frame spike inside each subject box (whole frame when there is none): frame i differs from i-1 **and** i+1 while i-1 and i+1 agree; skips planned events | min diff > 10 and > 5x the skip diff: error; > 5 and > 3x: warn; motion-normalised score >= 2.5 in fast shots: warn |
| 7 | blur | Laplacian variance per frame (and per subject box) relative to the median of its **camera setup** (shot split at in-shot cuts) | < 0.30x for >= 8 frames: error; < 0.45x for >= 3 frames: warn; subject boxes: warn |
| 8 | empty | edge density (gradient > 0.06) and RGB std | span > 1.5 s: error if flat, else warn; info if the config marks it intended or the span is 1.0-1.5 s |
| 9 | dof | subject-box sharpness / sharpness of a ring around it; shot median and per-frame drops | warn only (model boxes). DOF is OFF in the render (`dofEnabledInRender:false`), so no shot expects it |
| 10 | audio_sync | onsets in the final mix near each flash, kick and hit (3 bands: <150 Hz, 150-2000 Hz, >2 kHz; peak picking; candidate score = rise - 1.5 dB x \|delay\|). Flash events use the measured visible flash frame. Whole-track median offset across events. Failed checks from `audio_report.json` are included | median offset > 2 frames: error; a single event > 2 frames: error only if its onset is isolated (mix < -30 dB before it, rise >= 10 dB), else warn (dense mix, attribution uncertain) |
| 11 | audio_level | decoded samples at full scale, true peak and integrated loudness (ffmpeg ebur128) | >= 10 clipped samples or TP > 0 dBTP: error; TP > -1 dBTP or loudness outside -14 +/- 1 LUFS: warn (info for excerpts) |
| 12 | duplicate | identical consecutive frames (mean diff < 0.05 and max <= 8, or < 0.1 and < 1% of the local motion) in shots marked moving; frozen runs; isolated duplicate pairs (judder); periodic near-duplicates (partial judder) | frozen >= 15 frames or >= 3 pairs in 30 frames: error; frozen 6-14 frames, a single pair, or partial judder: warn |

### Threshold changes made while building (documented, not hidden)
- **Audio onset selection, rewritten twice.** The first version (strongest full-band rise) reported booms 6-8 frames early, because narration starts just before the boom. I confirmed on `audio/out/mix.wav` that the boom and crack cues are on time. Example: `action-crack` starts at exactly 14.571 s in the stem, which is about -0.9 frames against the picture kick. The detector had picked the voice resuming after a dip. The fix was multi-band peak picking, rise - lambda x distance scoring, a whole-track median for the error decision, and per-event errors only for isolated onsets. This makes per-event checks in dense passages **warn-only by design**.
- **Blur baseline per camera setup, not per storyboard shot.** Shot 12 has three setups. The first run flagged 12a (frames 1194-1237) at 0.19x the shot median. A full-size frame shows it is sharp, just low-detail ground compared with 12b/12c's poles. Side effect: a whole setup that is uniformly soft is not detected (see limitations).
- **Lighting whole-frame test.** The first run raised an error at frame 1009 (shot 9, temperature step 0.19). It is caused by huge falling tree trunks entering the frame, not by a lighting change. The 4x4-grid uniformity test now turns such local changes into info. The injected global brightness/colour jump still scores 100% uniform and an error.
- **Ghost test skips planned flash frames.** The hook-end white flash overlaps the cut at frame 218 and looked like a blend.
- **`empty_edge` 0.004 -> 0.01 (stricter).** Shot 13 (pink sky, one tree corner, frames 1337-1382) measures 0.0073 and a human would call it empty. The fireball-in-sky frames of shots 5/6 measure 0.017. This change produces a new real warning; it does not remove one.
- **Duplicate criterion.** The first version (mean < 0.02, max <= 6) missed re-encoded duplicates. Duplicates written by x264 measure a mean of 0.01-0.07 and a max of up to 13 in fast shots. The relative criterion was added. The lowest real non-duplicate in the video is 0.069 with local motion 0.3, so it is not a duplicate under either rule.
- **Motion-normalised pop score (warn tier).** The first self-test run **missed** a 6%-width one-frame shift at frame 320, in the tents shot where everything moves (about 10 per frame). The score `min(a,b) / (c/2 + 0.5)` is 2.74 for that injected pop. The highest unplanned real frame scores 2.18 (frame 984). Planned impact kicks score up to 3.8, because they are deliberate one-frame jolts and are excluded as planned. **The margin (2.18 vs 2.5) is thin and calibrated on one video.**
- Config: the hook-end flash (story 164) and the faint streak flash (312) are marked `noAudioExpected`. The cue sheet has no impact cue on either (only slow whooshes). Shots 5-7 have `fill: null`, because the fireball and burst are fx cards drawn at a constant fraction of the screen (`cast.ts scr()`), so their fill is not a framing choice.

## Self-test (`bash scripts/test-visual-qa.sh`, run 2026-11-01)
Excerpt: video frames 750-1229 (16 s) of `out/tunguska-final3.mp4`, scaled to 540x960 for speed. It contains the burst, the falling ring with 4 hits, the tents, the globe and the crossfade into shot 12. A frame-alignment guard checks that excerpt frame 0 equals video frame 750. Faults **replace** frames instead of inserting them, so the frame mapping to the story data stays valid. Each fault must produce a **new** warn/error of the right category within the tolerance that is not in the clean report.

| case | injected | result |
|---|---|---|
| black | 2 black frames at 70-71 | caught: transition **error** at 70 |
| white | 2 white frames at 190-191 | caught: transition **error** at 190 |
| freeze | frames 365-400 frozen | caught: duplicate **error** "36 identical frames" at 365 |
| blur | ffmpeg boxblur on 80-99 | caught: blur **error** at 81 (0.01x the setup median) |
| bright | x1.35 brightness, warmer, frames 260-279 | caught: lighting **error** at 260 (d-luma 0.22, 100% uniform) |
| flat | flat colour on 130-189 (2 s) | caught: empty **error** at 160 |
| judder | every 2nd frame repeated, 232-246 | caught: duplicate **error** (7 pairs) at 233 |
| pop (fast shot) | frame 320 shifted 6% of the width | caught: pose_jump **warn** (normalised score). **Missed by the first detector version** |
| pop2 (calm shot) | frame 390 shifted 6% of the width | caught: pose_jump **error** |
| subjblur | blur only inside the burst's box, 85-104 | caught: dof **warn** (the ratio drops to 0.05 of the shot median) |
| ashift | audio delayed 6 frames | caught: audio_sync **error**: isolated onsets +5.8 / +7.1 frames, whole-track median +4.8 (clean: -0.2) |
| aclip | audio +24 dB | caught: audio_level **error**: TP +22.2 dBTP, 103,704 clipped samples |
| clean | nothing | **no error findings** (3 warnings: a dense-mix sync warning at the tents kick, and the burst-glow blur/dof warning described below) |

## Real findings on `out/tunguska-final3.mp4` (report: `out/qa-final3/visual_qa.md`)
**Overall FAIL: 1 error, 13 warn.** Loudness -14.1 LUFS, true peak -1.5 dBTP, 0 clipped samples. Whole-track audio offset -0.5 frames over 10 impact events (in sync). Hard cuts are clean (no black/white/ghost frames). The six 8-frame crossfades measure 5-7 blended output frames. No pose jumps, no unplanned lighting jumps.

| frame | sev | check | finding (verified on the screenshot) |
|---|---|---|---|
| 646-739 | **error** | visibility | Shot 6 (escalation): the rock/fireball is off-screen to the right for 3.1 s. Only its bow-shock lines are visible. Real: the chase camera `S6a` leads the rock out of frame. |
| 359-383 | warn | visibility | Shot 3b: herder1 leaves the left edge for 0.8 s, and herder2 for 0.6 s. Matches docs/CAMERA.md (default camera: 62% in the safe area). |
| 513-577 | warn | duplicate | Shot 5: partial judder. 28% of frames are near-duplicates (every 3rd-4th frame), and all the motion is in the fireball card while the sky is static. The card animation appears to update on fewer frames than the output. Worth a look at full speed. |
| 1337-1382 | warn | empty | Shot 13 is about 1.5 s of almost flat pink sky with one tree corner (edge density 0.007). |
| 2104-2142 | warn | clipping | Shot 20a: herder1's box is cut by the left edge for 1.3 s. |
| 2226-2238 | warn | duplicate | The last ~13 picture frames before the outro card are frozen (7 + 6 identical frames). The time warp holds the last story frame (`toStory` clamps at TOTAL-1). |
| 803 | warn | blur + dof | Burst box: low detail for 15 frames right after the flash. **Likely false positive:** the box covers the smooth white glow of the blast card. |
| 112, 462, 1052, 1381 | warn | audio_sync | Dense-mix onsets 2-3.5 frames off. At 462 the cue was verified on time in the stem (the detector picked the voice); 1052 is the tents kick, where the `tents-flap` whoosh starts 2 story frames before the kick by design. |
Info only: local luma/colour changes in shot 9 (falling trees) and shot 7 (blast card); composition within intent for shots 3, 4, 15, 17, 18 and 20.

## Known false-positive risks
- Subject boxes are models: anchors from `DIRECTOR_SUBJECTS` with hand-sized boxes, and screen-size boxes for fx cards. Clipping, visibility, composition and DOF findings are only as good as the config. Off-screen findings are exact for the anchor point only.
- Smooth, glowing fx cards (flash, blast) score as "blurred" subjects.
- Dense audio (narration over SFX): per-event onset attribution is uncertain, so those findings are warn-only.
- Lighting: a large uniform object filling most of the frame in one frame (for example a close wall) passes the whole-frame test and is flagged.
- The pop warn tier has a thin margin (see above). Fast shots with real one-frame camera shake outside the planned `kicks` would be flagged.

## What is NOT covered
- A whole camera setup that is uniformly soft. The blur baseline is the setup itself, so it only catches drops *within* a setup. Lens-blur regressions that soften a complete shot need a reference render (SSIM against a known-good one) or absolute thresholds per scene.
- Characters intersecting each other or the set: only camera-vs-obstacle clipping is modelled (and the forest's instanced trees are not obstacles).
- Facial/pose correctness, expression timing, ink-outline breakage, text or caption legibility, colour-blind safety.
- Lip sync, and narration-to-picture sync beyond impact events (`audio_report.json` covers word-synchronised cues on the stems).
- Duplicate detection of near-static shots marked `moving` relies on encoder noise staying below the thresholds; the `static` motion setting downgrades them to nothing.
- Inserted (not replaced) frames are detected as transitions/duplicates, but the frame mapping to the story data shifts after them.
- No GPU or OpenCV: optical flow and true motion compensation are not used.
