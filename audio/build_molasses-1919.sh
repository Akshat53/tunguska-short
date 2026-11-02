#!/bin/bash
# usage: bash audio/build_molasses-1919.sh  -> Molasses 1919 (English) score + cues + voice -> loudness normalise -> report, into out/molasses-1919/audio/
# Same pipeline as audio/build.sh, pointed at the Molasses 1919 storyboard, cue sheet and the final voice (env vars read by cues/score/report).
set -e; cd "$(dirname "$0")/.."
export STORY=molasses-1919 CUES_FILE="$PWD/audio/cues.molasses-1919.json" AUDIO_OUT="$PWD/out/molasses-1919/audio"
export VOICE_WAV=stories/molasses-1919/en/voice.wav WORDS_JSON=stories/molasses-1919/en/words.json OLD_WORDS=stories/molasses-1919/en/words.json
mkdir -p "$AUDIO_OUT"
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
