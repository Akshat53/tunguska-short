#!/bin/bash
# usage: bash audio/build_survive-titanic.sh  -> Could YOU Survive? Ep 1 Titanic (English) score + cues + voice -> loudness normalise
# -> report, into out/survive-titanic/audio/. Same pipeline as audio/build.sh, pointed at this story.
set -e; cd "$(dirname "$0")/.."
export STORY=survive-titanic CUES_FILE="$PWD/audio/cues.survive-titanic.json" AUDIO_OUT="$PWD/out/survive-titanic/audio"
export VOICE_WAV=stories/survive-titanic/en/voice.wav WORDS_JSON=stories/survive-titanic/en/words.json OLD_WORDS=stories/survive-titanic/en/words.json
mkdir -p "$AUDIO_OUT"
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
