#!/bin/bash
# usage: bash audio/build_chapati-1857.sh  -> 1857 chapati (Hindi) score + cues + voice -> loudness normalise -> report, into out/chapati-1857/audio/
# Same pipeline as audio/build.sh, pointed at the 1857 chapati storyboard, cue sheet and the final voice (env vars read by cues/score/report).
set -e; cd "$(dirname "$0")/.."
export STORY=chapati-1857 CUES_FILE="$PWD/audio/cues.chapati-1857.json" AUDIO_OUT="$PWD/out/chapati-1857/audio"
export VOICE_WAV=stories/chapati-1857/hi/voice.wav WORDS_JSON=stories/chapati-1857/hi/words.json OLD_WORDS=stories/chapati-1857/hi/words.json
mkdir -p "$AUDIO_OUT"
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
