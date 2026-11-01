#!/bin/bash
# usage: bash audio/build_roopkund.sh  -> Roopkund (Hindi) score + cues + voice -> loudness normalise -> report, into out/roopkund/audio/
# Same pipeline as audio/build.sh, pointed at the Roopkund storyboard, cue sheet and the final voice (env vars read by cues/score/report).
set -e; cd "$(dirname "$0")/.."
export STORY=roopkund CUES_FILE="$PWD/audio/cues.roopkund.json" AUDIO_OUT="$PWD/out/roopkund/audio"
export VOICE_WAV=stories/roopkund/hi/voice.wav WORDS_JSON=stories/roopkund/hi/words.json OLD_WORDS=stories/roopkund/hi/words.json
mkdir -p "$AUDIO_OUT"
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
