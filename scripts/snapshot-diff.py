# usage: python3 scripts/snapshot-diff.py before.json after.json   (semantic compare of two story-snapshot.mjs outputs; exit 1 on any difference)
import json, sys
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
bad = 0
for k in a:
    if k != "frames" and a[k] != b[k]: print("DIFF in", k); bad += 1
for x, y in zip(a["frames"], b["frames"]):
    if x != y: print("DIFF at frame", x[0]); bad += 1
    if bad > 5: break
if len(a["frames"]) != len(b["frames"]): print("frame count differs"); bad += 1
print("IDENTICAL" if not bad else f"{bad} difference(s)"); sys.exit(1 if bad else 0)
