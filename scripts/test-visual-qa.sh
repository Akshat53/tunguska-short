#!/bin/bash
# Self-test of the visual QA (scripts/visual_qa.py): injects known faults into copies of a short REAL excerpt and checks that the
# matching check reports each one (right category, frame within tolerance, and NOT already reported on the clean excerpt).
# Also asserts the clean excerpt has no error-severity findings. Report-only: writes only under $OUT; never edits sources or renders.
# usage: bash scripts/test-visual-qa.sh [video=out/tunguska-final3.mp4] [out=out/qa-selftest]
# One line per case: caught / MISSED. Exit 1 on any miss.
set -u
cd "$(dirname "$0")/.."
PY=.venv/bin/python
V="${1:-out/tunguska-final3.mp4}"; OUT="${2:-out/qa-selftest}"
START=750; N=480            # excerpt = video frames 750..1229 (16 s): end of the rock chase, the burst, the falling ring, tents, globe, crossfade into shot 12
mkdir -p "$OUT"
node --no-warnings scripts/qa-story-data.mjs --out "$OUT/qa-story.json" >/dev/null || { echo "qa-story-data failed"; exit 1; }
SS=$($PY -c "print(f'{$START/30:.4f}')")
ffmpeg -v error -y -ss "$SS" -i "$V" -frames:v $N -t "$($PY -c "print($N/30)")" -vf scale=540:960:flags=area -c:v libx264 -preset veryfast -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 "$OUT/clean.mp4" || exit 1
qa() { $PY scripts/visual_qa.py "$1" --story "$OUT/qa-story.json" --offset $START --excerpt --quiet --max-shots 12 --out "$2" >/dev/null 2>"$2.err"; }
# frame alignment guard: the excerpt must start exactly at video frame START (else every frame-based assertion is meaningless)
$PY - "$V" "$OUT/clean.mp4" $START <<'EOF' || exit 1
import subprocess, sys, numpy as np
def fr(v, n, cnt):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-vf", f"select=between(n\\,{n}\\,{n + cnt - 1}),scale=90:160:flags=area", "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 160, 90).astype(float)
full, ex = fr(sys.argv[1], int(sys.argv[3]) - 2, 5), fr(sys.argv[2], 0, 1)[0]
d = [np.abs(f - ex).mean() for f in full]
best = int(np.argmin(d)) - 2
print(f"alignment: excerpt frame 0 = video frame {int(sys.argv[3]) + best} (diffs {[round(x, 1) for x in d]})")
sys.exit(0 if best == 0 else 1)
EOF
qa "$OUT/clean.mp4" "$OUT/clean"
FAILS=0
check() {   # check <case> <category> <lo> <hi> <tol>
  $PY - "$OUT/$1/visual_qa.json" "$OUT/clean/visual_qa.json" "$2" "$3" "$4" "$5" "$1" <<'EOF'
import json, sys
r, c = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
cat, lo, hi, tol, name = sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), sys.argv[7]
def hits(rep):
    return [f for f in rep["findings"] if f["category"] == cat and f["severity"] in ("warn", "error")
            and f["span"][0] <= hi + tol and f["span"][1] - 1 >= lo - tol]
h, h0 = hits(r), hits(c)
new = [f for f in h if not any(g["frame"] == f["frame"] and g["message"] == f["message"] for g in h0)]
if new:
    f = max(new, key=lambda f: f["severity"] == "error")
    print(f"caught  {name:10s} -> {cat} {f['severity']} at frame {f['frame']} (fault {lo}-{hi}): {f['message'][:110]}"); sys.exit(0)
print(f"MISSED  {name:10s} -> no new {cat} warn/error near frames {lo}-{hi} (+/-{tol}); overall {r['overall']}, categories {r['categories']}"); sys.exit(1)
EOF
}
run_case() {   # run_case <name> <fault> <category> <lo> <hi> <tol>
  $PY scripts/qa_inject.py "$OUT/clean.mp4" "$OUT/$1.mp4" "$2" --story "$OUT/qa-story.json" --offset $START || { echo "MISSED  $1 (injection failed)"; FAILS=$((FAILS+1)); return; }
  qa "$OUT/$1.mp4" "$OUT/$1"
  check "$1" "$3" "$4" "$5" "$6" || FAILS=$((FAILS+1))
}
# excerpt frame = video frame - 750. Shots in the excerpt: 7: 35-125 (burst, flash at 38), 8: 126-218, 9: 219-295, 10: 296-351, 11: 352-433, 12: 434-
run_case black    black:70:71        transition 70 71 1
run_case white    white:190:191      transition 190 191 1
run_case freeze   freeze:365:400     duplicate 365 400 2
run_case blur     blur:80:99         blur 80 99 2
run_case bright   bright:260:279     lighting 260 279 2
run_case flat     flat:130:189       empty 130 189 2
run_case judder   judder:232:246     duplicate 232 246 2
run_case pop      pop:320            pose_jump 320 320 1      # fast shot (tents flying): only the motion-normalised score can see it
run_case pop2     pop:390            pose_jump 390 390 1      # calm shot (slow globe push)
run_case subjblur subjblur:85:104:burst dof 85 104 2
run_case ashift   ashift:6           audio_sync 0 $N 0
run_case aclip    aclip:24           audio_level 0 $N 0
# the clean excerpt must not produce any error-severity finding
$PY - "$OUT/clean/visual_qa.json" <<'EOF' || FAILS=$((FAILS+1))
import json, sys
r = json.load(open(sys.argv[1])); e = [f for f in r["findings"] if f["severity"] == "error"]
w = [f for f in r["findings"] if f["severity"] == "warn"]
if e:
    print(f"MISSED  clean      -> {len(e)} error finding(s) on the CLEAN excerpt: " + "; ".join(f"{f['category']}@{f['frame']}: {f['message'][:80]}" for f in e)); sys.exit(1)
print(f"caught  clean      -> no error findings on the clean excerpt ({len(w)} warn: " + ", ".join(sorted({f['category'] for f in w})) + ")")
EOF
echo "self-test: $FAILS miss(es)"
exit $([ $FAILS -eq 0 ] && echo 0 || echo 1)
