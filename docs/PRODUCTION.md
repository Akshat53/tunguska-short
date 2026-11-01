# Production render pipeline (roadmap step 2)

`node --no-warnings scripts/produce.mjs [options]` (or `npm run produce`, or `./make.sh <slug> <lang> produce`) builds a finished, validated video.

Stages: **preflight** (node/ffmpeg/deps, `tsc`, storyboard validation, required files, disk space) -> **preview stills** (8 sampled frames, brightness check)
-> **chunked render** (bundle once, N chunks, each retried up to 3x, finished chunks cached) -> **concat** (frame count must equal the composition)
-> **mux** (+ intro/outro cards via `scripts/finish.sh`) -> **validate** -> **contact sheet** -> **report**.

Options: `--out` `--scale` `--crf` `--conc` `--gl` `--chunks` `--props` `--audio` `--comp` `--no-bookends` `--tmp <dir>` `--work <dir>` `--stills N` `--intro S` `--outro S`.
Output: `<out>.mp4`, `<out>.sheet.jpg`, `<out>.report.md`, `<out>.report.json`. Exit code 0 only on SUCCESS; `SUCCESS` is printed only if every check passes.

Validation checks: h264, resolution (= composition x scale), frame rate, frame count, aac 48 kHz audio stream, duration = picture + bookends, narration mix length = picture length,
loudness -14 +/- 1.5 LUFS, true peak < -1 dBTP, no black frames, file size sane; warning (not failure) for a frozen picture longer than 1.5 s.

Caching: the fingerprint is a hash of everything under `src/`, `package.json` and the render settings. Same fingerprint -> finished chunks in `out/work/<fingerprint>/` are reused.
Any source or setting change gives a new fingerprint (nothing stale is ever reused). Old work folders are never deleted automatically.

Temp files: the bundle (about 37 MB) is created in the OS temp dir and **only that run's own folder** is removed afterwards. `render.mjs` and `stills.mjs` were changed the same way
(they used to delete every `remotion-webpack-bundle-*` folder in the shared temp dir). Leftover folders from killed runs can be removed by hand.

## Tested (2026-11-01, 1080x1920, 2215 frames, 4 chunks, this Mac)
| Test | Result |
|---|---|
| Clean full run | SUCCESS, 26 checks passed, about 100 s total (chunks 12-17 s each) |
| Rerun, nothing changed | all 4 chunks reused, about 63 s (mostly mux + validation) |
| Crash after 2 chunks (`PRODUCE_STOP_AFTER=2`), rerun | exit 99, then chunks 0-1 reused, SUCCESS |
| One chunk fails once (`PRODUCE_FAIL_CHUNK=1`) | retried, rendered on attempt 2, SUCCESS |
| Wrong audio file (0.8 s) | FAILED, exit 1, named the check ("mix 0.80s vs picture 73.83s"), no SUCCESS |
| Chunked vs single-pass picture | SSIM 0.9985 (not bit-identical: encoder restarts at chunk boundaries) |
While building it the pipeline also caught two bugs in its own checks and reported FAILED both times.

## Not covered yet
Shot-level preview renders (render a single shot by id), automatic re-render of only the shots whose config changed, and 1440x2560 as a named preset (use `--scale 1.3333`, untested).
