# usage: python3 scripts/warp.py <old words.json> <new words.json> <out warp.json> [fps=30] [min_gap=0.35]
# Builds a smooth time warp between two readings of the SAME narration (different pace): anchors are placed at every
# pause >= min_gap (sentence/clause starts), plus start and end. Output: [[newFrame, oldFrame], ...] (piecewise linear).
# The picture timeline (written for the old voice) is then played through this warp, so no shot is retimed by hand.
import json, sys
old = json.load(open(sys.argv[1], encoding="utf-8")); new = json.load(open(sys.argv[2], encoding="utf-8"))
fps = int(sys.argv[4]) if len(sys.argv) > 4 else 30; gap = float(sys.argv[5]) if len(sys.argv) > 5 else 0.35
assert len(old) == len(new), f"word count differs: {len(old)} vs {len(new)} (same text required)"
pts = [[0, 0]]
for i in range(1, len(old)):
    if old[i]["start"] - old[i - 1]["end"] >= gap:
        pts.append([round(new[i]["start"] * fps, 2), round(old[i]["start"] * fps, 2)])
pts.append([round((new[-1]["end"] + 0.5) * fps, 2), round((old[-1]["end"] + 0.5) * fps, 2)])
out = {"anchors": pts, "outFrames": round(pts[-1][0]) + 15}
json.dump(out, open(sys.argv[3], "w")); 
ratios = [round((pts[k + 1][0] - pts[k][0]) / max(1e-6, pts[k + 1][1] - pts[k][1]), 3) for k in range(len(pts) - 1)]
print(f"{len(pts)} anchors, outFrames={out['outFrames']}, local stretch min/max = {min(ratios)}/{max(ratios)}")
