#!/bin/bash
# usage: bash audio/build_iron-pillar.sh  -> Iron Pillar (Hindi) score + cues + voice -> loudness normalise -> report, into out/iron-pillar/audio/
# Same pipeline as audio/build.sh, pointed at the Iron Pillar storyboard, cue sheet and the final voice (env vars read by cues/score/report).
set -e; cd "$(dirname "$0")/.."
export STORY=iron-pillar CUES_FILE="$PWD/audio/cues.iron-pillar.json" AUDIO_OUT="$PWD/out/iron-pillar/audio"
export VOICE_WAV=stories/iron-pillar/hi/voice.wav WORDS_JSON=stories/iron-pillar/hi/words.json OLD_WORDS=stories/iron-pillar/hi/words.json
mkdir -p "$AUDIO_OUT"
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
