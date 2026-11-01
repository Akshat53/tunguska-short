#!/bin/bash
# usage: ./make.sh <slug> <lang> [stage ...]      stages: check voice beats render mux   (default: all)
# Reads stories/<slug>/story.json. Output: out/<slug>-<lang>.mp4
# env: SCALE=1 (0.5 = fast draft), CONC=6, PROPS='{"post":{"dpr":1}}'
set -e
SLUG=${1:?slug}; LANG_=${2:?lang}; shift 2
STAGES=${*:-check voice beats render mux}
cfg() { python3 -c "import json,sys;c=json.load(open('stories/$SLUG/story.json'));l=c['languages']['$LANG_'];print({'comp':c['composition'],**l}['$1'])"; }
COMP=$(cfg comp); VOICE=$(cfg voice); RATE=$(cfg rate); DIR=$(cfg dir)
[ "$DIR" = "." ] && VDIR=voice || VDIR="stories/$SLUG/$DIR"
AUDIO=$(cfg audio)
[ "$DIR" = "." ] || AUDIO="stories/$SLUG/$DIR/mix.wav"
SCALE=${SCALE:-1}; export CONC=${CONC:-6}; export COMP
PROPS=${PROPS:-'{"post":{"dpr":1}}'}
mkdir -p out
for s in $STAGES; do case $s in
  check)  npx tsc --noEmit && node --no-warnings scripts/validate-storyboard.mjs "stories/$SLUG/storyboard.json" 2>/dev/null || node --no-warnings scripts/validate-storyboard.mjs ;;
  voice)  [ -f "$VDIR/voice.wav" ] && [ -z "$REVOICE" ] && echo "voice: exists ($VDIR) - REVOICE=1 to redo" || \
          { [ -d .venv ] || python3 -m venv .venv; .venv/bin/pip -q install edge-tts; .venv/bin/python make_voice.py "$VDIR" "$VOICE" "$RATE"; } ;;
  beats)  python3 scripts/beats.py "$VDIR/words.json" ;;
  render) node scripts/render.mjs "out/$SLUG-$LANG_.picture.mp4" all "$SCALE" "$PROPS" ;;
  mux)    bash scripts/mux.sh "out/$SLUG-$LANG_.picture.mp4" "out/$SLUG-$LANG_.mp4" "$AUDIO" ;;
  *) echo "unknown stage $s"; exit 1 ;;
esac; done
