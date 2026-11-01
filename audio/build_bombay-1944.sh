#!/bin/bash
# usage: bash audio/build_bombay-1944.sh  -> Bombay 1944 (Hindi) score + cues + voice -> loudness normalise -> report, into out/bombay-1944/audio/
# Same pipeline as audio/build.sh, pointed at the Bombay 1944 storyboard, cue sheet and the final voice (env vars read by cues/score/report).
set -e; cd "$(dirname "$0")/.."
export STORY=bombay-1944 CUES_FILE="$PWD/audio/cues.bombay-1944.json" AUDIO_OUT="$PWD/out/bombay-1944/audio"
export VOICE_WAV=stories/bombay-1944/hi/voice.wav WORDS_JSON=stories/bombay-1944/hi/words.json OLD_WORDS=stories/bombay-1944/hi/words.json
mkdir -p "$AUDIO_OUT"
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
