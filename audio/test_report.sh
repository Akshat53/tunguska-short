#!/bin/bash
# usage: bash audio/test_report.sh   Injects faults into a COPY of the cues; checks that cues.py / report.py catch them. Never touches audio/out.
set -u; cd "$(dirname "$0")/.."; FAILED=0
mutate() { d=out/audio-test-$1; mkdir -p $d; .venv/bin/python - "$2" "$d" <<'PY'
import json,sys; c=json.load(open("audio/cues.json")); exec(sys.argv[1]); json.dump(c,open(sys.argv[2]+"/cues.json","w"))
PY
}
validate_case() {  # name, mutation, expected error text (cues.py validation, no audio rendering)
  mutate "$1" "$2"; out=$(CUES_FILE=$PWD/out/audio-test-$1/cues.json .venv/bin/python audio/cues.py 2>&1); code=$?
  if [ $code -ne 0 ] && echo "$out" | grep -q "$3"; then echo "caught  $1  ->  $(echo "$out" | grep ERROR | head -1)"; else echo "MISSED  $1"; FAILED=1; fi
}
report_case() {    # name, mutation, expected text in report output, expected exit (1 = fail, 0 = pass with warning)
  mutate "$1" "$2"; d=$PWD/out/audio-test-$1
  (cd audio && AUDIO_OUT=$d CUES_FILE=$d/cues.json ../.venv/bin/python score.py >/dev/null 2>&1) && AUDIO_OUT=$d bash audio/finalize.sh >/dev/null 2>&1
  out=$(AUDIO_OUT=$d CUES_FILE=$d/cues.json .venv/bin/python audio/report.py 2>&1); code=$?
  if [ $code -eq $4 ] && echo "$out" | grep -q "$3"; then echo "caught  $1  ->  $(echo "$out" | grep "$3" | head -1 | cut -c1-120)"; else echo "MISSED  $1 (exit $code)"; FAILED=1; fi
}
validate_case "cue-outside-timeline" 'c["cues"][3]["at"]=5000' "outside the timeline"
validate_case "unknown-generator"    'c["cues"][3]["gen"]="laser"' "unknown generator laser"
validate_case "unknown-chord"        'c["music"]["beats"][0]["chord"]="Zm"' "unknown chord"
validate_case "sync-cue-no-word"     '[x for x in c["cues"] if x.get("sync")][0].pop("word_index")' "needs word_index and word_u"
report_case   "cue-20-frames-late"   'q=[x for x in c["cues"] if x["id"]=="burst-boom"][0]; q["at"]+=20' 'FAIL sync burst-boom on "exploding"' 1
report_case   "no-end-fade"          'c["master"]["fade_out"]=0.0' "WARN no click at the end" 0
[ $FAILED -eq 0 ] && echo "audio self-test passed" || { echo "audio self-test FAILED"; exit 1; }
