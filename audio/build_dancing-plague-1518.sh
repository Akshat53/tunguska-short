#!/bin/bash
# usage: bash audio/build_dancing-plague-1518.sh  -> Dancing Plague 1518 (English) score + cues + voice + dance layer (tabor drum, fife,
# crowd) -> loudness normalise -> report, into out/dancing-plague-1518/audio/. Same pipeline as audio/build.sh, pointed at this story.
set -e; cd "$(dirname "$0")/.."
export STORY=dancing-plague-1518 CUES_FILE="$PWD/audio/cues.dancing-plague-1518.json" AUDIO_OUT="$PWD/out/dancing-plague-1518/audio"
export VOICE_WAV=stories/dancing-plague-1518/en/voice.wav WORDS_JSON=stories/dancing-plague-1518/en/words.json OLD_WORDS=stories/dancing-plague-1518/en/words.json
mkdir -p "$AUDIO_OUT"
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
(cd audio && ../.venv/bin/python dance_layer_dancing-plague-1518.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
