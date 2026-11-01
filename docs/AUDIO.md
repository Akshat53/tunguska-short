# Audio cue system (roadmap step 3)

Sound design is data: **`audio/cues.json`** (42 SFX cues + music beats/chords). `audio/cues.py` plays it, `audio/score.py` mixes it, `audio/report.py` checks it.
Build everything: `bash audio/build.sh` (or `npm run audio`) = validate cues -> score (music + SFX + voice) -> loudness normalise -> report. Exit 1 if the report fails.

## cues.json
- `cues[]` (played in file order with one seeded rng, so results are reproducible): `id`, `at` (story frame), `offset` (s), `gen` (generator), `args`, `span` [fromFrame,toFrame] (duration), `extra` (s),
  `post` (ordered ops: `gain`, `widen`, `pan`, `st2`), `note`, and for word-synchronised cues `sync: true` + `word`, `word_index`, `word_u` (where inside the word it was authored).
- Generators: whoosh, boom, crack, wood_crack, oof, whoa, squeak, crackles, breeze, water, birds, rumble, roar, hum, glock; emitters: steps, clicks, notes.
- `music`: chord tables and `beats[]`; a beat's frame range comes from **storyboard shot ids** (`shots: [first, last]`), so there are no duplicated frame numbers. Percussion hits come from `storyboard.json` `events.hits`.
- `master`: `fade_in` / `fade_out` seconds applied to the final mix only (Tunguska: 0.15 s out, so the join to the outro card has no click).
- Times go through the picture time warp (`warp.json`), so cues follow a re-paced voice automatically.

## Reports (audio/out/)
`cue_sheet.csv` (every cue: frame, time, nearest word, gap) | `sync_report.md` | `audio_report.json` | stems `music.wav`, `sfx.wav`, `voice48.wav`, `mix_pre.wav`, final `mix.wav`.
Checks: each word-synchronised cue within 0.12 s of its word; cue ids unique and inside the timeline; every stem and the mix exactly as long as the picture; no clipped samples;
mix not heavily attenuated by the safety scaler; -14 +/- 1 LUFS; true peak < -1 dBTP; no click at the start/end (warning); music keeps playing in every narration pause (never silent).

## Verified (2026-11-01)
- Refactor from hard-coded cues to `cues.json`: music, sfx and voice stems **bit-identical** (max abs diff 0); mix_pre differs only in the last 0.15 s (the new fade).
- `bash audio/test_report.sh` injects 6 faults into a copy of the cues and checks each is caught: cue outside timeline, unknown generator, unknown chord, sync cue without word position,
  a cue 20 frames late (flagged +0.669 s on its own word), missing end fade (warning). All caught.
- Findings: the raw mix peaks 1.8 dB over full scale before the safety scaler lowers it 1.9 dB (no clipping in the output, but little headroom);
  two sparkles that I had tagged to words were really visual cues (now untagged). The SFX stem is normalised to a fixed loudness, so one loud cue cannot clip the mix by itself.

## Not covered
Automatic placement of SFX from storyboard events (cues are still authored by hand), per-character footstep sounds tied to animation (needs the character state machine, step 7), dynamic music intensity from story progress beyond per-beat levels.
