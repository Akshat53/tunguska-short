#!/bin/bash
# usage: bash audio/build_laughter-epidemic-1962.sh  -> Laughter Epidemic 1962 (English) score + cues + voice -> loudness normalise
# -> report, into out/laughter-epidemic-1962/audio/. Same pipeline as audio/build.sh, pointed at this story.
set -e; cd "$(dirname "$0")/.."
export STORY=laughter-epidemic-1962 CUES_FILE="$PWD/audio/cues.laughter-epidemic-1962.json" AUDIO_OUT="$PWD/out/laughter-epidemic-1962/audio"
export VOICE_WAV=stories/laughter-epidemic-1962/en/voice.wav WORDS_JSON=stories/laughter-epidemic-1962/en/words.json OLD_WORDS=stories/laughter-epidemic-1962/en/words.json
mkdir -p "$AUDIO_OUT"
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
