#!/usr/bin/env bash
# Tests for validate.mjs and rhythm.py (no dependencies beyond node + python3 stdlib).
#   bash agents/bharat-storyteller/tools/test_tools.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
FX="$HERE/fixtures"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/bharat-tools.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
ok()  { echo "  PASS $1"; pass=$((pass+1)); }
bad() { echo "  FAIL $1"; echo "$2" | sed 's/^/       | /' | head -20; fail=$((fail+1)); }

# expect <name> <exit code> <grep pattern or ""> -- command...
expect() {
  local name="$1" code="$2" pat="$3"; shift 4
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  if [ "$rc" -ne "$code" ]; then bad "$name (exit $rc, wanted $code)" "$out"; return; fi
  if [ -n "$pat" ] && ! printf '%s' "$out" | grep -q -- "$pat"; then bad "$name (missing: $pat)" "$out"; return; fi
  ok "$name"
}
# mutate <out.json> <js expression on p>  : copy of the valid package with one fault injected
mutate() { node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));'"$2"';fs.writeFileSync(process.argv[2],JSON.stringify(p,null,1));' "$FX/valid-package.json" "$1"; }

V="node --no-warnings $HERE/validate.mjs"
echo "validate.mjs"
expect "valid package passes" 0 "OK" -- $V "$FX/valid-package.json" --narration-file "$FX/valid-narration.txt"
expect "help works" 0 "Usage" -- $V --help

mutate "$TMP/overlap.json" 'const s=p.shots[2]; s.startSec=9.5; s.startFrame=285;'
expect "overlapping shots fail" 1 "overlaps shot 2" -- $V "$TMP/overlap.json"

mutate "$TMP/gap.json" 'const s=p.shots[3]; s.startSec=19.5; s.startFrame=585; s.cameraMovement.keys[0].f=585;'
expect "gap between shots fails" 1 "gap after shot 3" -- $V "$TMP/gap.json"

mutate "$TMP/enum.json" 'p.shots[1].lighting="night";'
expect "bad lighting enum fails" 1 'is not one of \[day, golden, dusk, space\]' -- $V "$TMP/enum.json"

mutate "$TMP/expr.json" 'p.shots[1].expressions[0].expression="angry";'
expect "non-existent expression fails" 1 "angry" -- $V "$TMP/expr.json"

mutate "$TMP/preset.json" 'p.shots[0].cameraMovement.keys[0].preset="droneSpin";'
expect "unknown camera preset fails" 1 "droneSpin" -- $V "$TMP/preset.json"

mutate "$TMP/claim.json" 'p.narration.segments[2].claimIds=["C99"];'
expect "missing claim reference fails" 1 "references missing claim C99" -- $V "$TMP/claim.json"

mutate "$TMP/unusable.json" 'p.narration.segments[1].claimIds.push("C05");'
expect "unusable (legend) claim in narration fails" 1 "usableInScript=false" -- $V "$TMP/unusable.json"

mutate "$TMP/frames.json" 'p.shots[1].endFrame=301;'
expect "bad frame math fails" 1 "frame math" -- $V "$TMP/frames.json"

mutate "$TMP/total.json" 'p.story.totalFrames=1000;'
expect "totalFrames vs duration fails" 1 "totalFrames 1000" -- $V "$TMP/total.json"

mutate "$TMP/seg.json" 'const s=p.narration.segments[4]; s.endSec=31.0; s.endFrame=930;'
expect "narration outside duration fails" 1 "outside the video duration" -- $V "$TMP/seg.json"

mutate "$TMP/speak.json" 'const s=p.narration.segments[4]; s.text=(s.text+" ").repeat(3).trim(); p.narration.totalWords=72+30;'
expect "speaking time vs words fails" 1 "speaking time inconsistent" -- $V "$TMP/speak.json"

mutate "$TMP/dupid.json" 'p.shots[3].id=3;'
expect "duplicate shot id fails" 1 "duplicate shot id" -- $V "$TMP/dupid.json"

mutate "$TMP/subject.json" 'p.shots[1].cameraMovement.keys[0].params.subject="king";'
expect "unknown camera subject fails" 1 'unknown subject "king"' -- $V "$TMP/subject.json"

mutate "$TMP/mode.json" 'p.shots[1].characters[0].mode="swing";'
expect "mode not available for front view fails" 1 'mode "swing" does not exist' -- $V "$TMP/mode.json"

mutate "$TMP/inflate.json" 'p.quality.scores.rhythm=5;'
expect "pass verdict with a score < 7 fails" 1 "below 7" -- $V "$TMP/inflate.json"

mutate "$TMP/nosrc.json" 'p.claims[2].sources=[];'
expect "claim without sources but medium confidence fails" 1 "never fabricate" -- $V "$TMP/nosrc.json"

mutate "$TMP/flash.json" 'p.events.flashAt=200;'
expect "flash transition without flash event fails" 1 "no matching events.flashAt" -- $V "$TMP/flash.json"

printf '{ "broken": ' > "$TMP/broken.json"
expect "invalid JSON fails" 1 "invalid JSON" -- $V "$TMP/broken.json"

echo "different narration" > "$TMP/narr.txt"
expect "narration.txt mismatch fails" 1 "differs" -- $V "$FX/valid-package.json" --narration-file "$TMP/narr.txt"

node -e 'const p=require(process.argv[1]);require("fs").writeFileSync(process.argv[2],JSON.stringify(p.claims[0]))' "$FX/valid-package.json" "$TMP/claim1.json"
expect "single claim validates against claim schema" 0 "OK" -- $V "$TMP/claim1.json" --schema claim
node -e 'const p=require(process.argv[1]);const c=p.claims[0];c.confidence="certain";require("fs").writeFileSync(process.argv[2],JSON.stringify(c))' "$FX/valid-package.json" "$TMP/claim2.json"
expect "bad confidence enum fails (claim schema)" 1 "certain" -- $V "$TMP/claim2.json" --schema claim

R="python3 $HERE/rhythm.py"
echo "rhythm.py"
expect "varied narration passes" 0 "verdict PASS" -- $R "$FX/varied.txt"
out="$($R "$FX/varied.txt" --json)"
if printf '%s' "$out" | grep -q '"MONOTONE_RUN"'; then bad "varied narration has no monotone run" "$out"; else ok "varied narration has no monotone run"; fi
if printf '%s' "$out" | python3 -c 'import json,sys; r=json.load(sys.stdin); sys.exit(0 if r["pauses"]["count"]==3 and r["sentences"]==16 else 1)'; then ok "pause markers + sentence split parsed"; else bad "pause markers + sentence split parsed" "$out"; fi

expect "monotonous narration: banned hook is a hard failure" 1 "banned opener in the hook" -- $R "$FX/monotonous.txt" --allow-length
expect "monotonous narration: monotone run flagged" 1 "MONOTONE_RUN" -- $R "$FX/monotonous.txt" --allow-length
expect "monotonous narration: low variation flagged" 1 "LOW_VARIATION" -- $R "$FX/monotonous.txt" --allow-length
expect "monotonous narration: repeated opener with rewrite hint" 1 'start with "फिर"' -- $R "$FX/monotonous.txt" --allow-length
expect "monotonous narration: unanswered question flagged" 1 "UNANSWERED_QUESTION" -- $R "$FX/monotonous.txt" --allow-length

tail -n +4 "$FX/monotonous.txt" > "$TMP/mono-nohook.txt"
expect "monotone without banned hook: REVISE, exit 0" 0 "verdict REVISE" -- $R "$TMP/mono-nohook.txt" --allow-length
expect "monotone without banned hook: --strict exits 2" 2 "" -- $R "$TMP/mono-nohook.txt" --allow-length --strict

head -n 4 "$FX/varied.txt" > "$TMP/short.txt"
expect "too-short narration fails on duration" 1 "outside 30-75 s" -- $R "$TMP/short.txt"
expect "--allow-length overrides duration" 0 "" -- $R "$TMP/short.txt" --allow-length
expect "speaking rate above 3.4 fails" 1 "above 3.4" -- $R "$FX/varied.txt" --wps 3.2 --voice-rate +10%
expect "target duration needing > 3.4 wps fails" 1 "would need" -- $R "$FX/varied.txt" --target-sec 40
expect "names improve density detection" 0 "DENSE" -- $R "$FX/varied.txt" --names "रानी की वाव,उदयमती,भीमदेव,पाटन"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
