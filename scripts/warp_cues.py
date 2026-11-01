# usage: python3 scripts/warp_cues.py <story.ts> <old words.json> <new words.json> <out warp.json> [fps=30]
# Cue-anchored time warp: every shot cut / camera cut / flash / kick / hit in story.ts becomes an anchor placed on the
# SAME word of the new reading (position inside the word preserved). Between cues motion is simply stretched, which is
# invisible because cues are cuts. Use this when the new voice's internal rhythm differs from the old one (e.g. another voice).
import json, re, sys
src = open(sys.argv[1]).read(); old = json.load(open(sys.argv[2], encoding="utf-8")); new = json.load(open(sys.argv[3], encoding="utf-8"))
fps = int(sys.argv[5]) if len(sys.argv) > 5 else 30
assert len(old) == len(new)
cues = set()
for pat in (r"\ba: (\d+)", r"\bf: (\d{2,4}), cut: true", r"\b(\d{2,4}) / FPS", r"FLASH_AT = (\d+)", r"\[(\d{2,4}), [0-9.]+\]"):  # shot starts, hard camera cuts, kicks, flashes
    cues |= {int(x) for x in re.findall(pat, src)}
m = re.search(r"HITS = \[([^\]]+)\]", src)
if m: cues |= {int(x) for x in m.group(1).split(",")}
cues = sorted(c for c in cues if 0 < c < 2078)
def to_new_frame(c):
    t = c / fps
    for i in range(len(old)):
        t1 = old[i + 1]["start"] if i + 1 < len(old) else old[i]["end"] + 1
        if t < t1 or i == len(old) - 1:
            t0 = old[i]["start"]; u = (t - t0) / max(1e-6, t1 - t0)
            n0 = new[i]["start"]; n1 = new[i + 1]["start"] if i + 1 < len(new) else new[i]["end"] + 1
            return (n0 + u * (n1 - n0)) * fps if t >= t0 else t * fps * (n0 / max(1e-6, t0))
pts = [[0.0, 0.0]]
for c in cues:
    n = to_new_frame(c)
    if n > pts[-1][0] + 4 and c > pts[-1][1] + 4: pts.append([round(n, 2), float(c)])   # keep monotone, drop sub-4-frame crowding
pts.append([round((new[-1]["end"] + 0.5) * fps, 2), round((old[-1]["end"] + 0.5) * fps, 2)])
out = {"anchors": pts, "outFrames": round(pts[-1][0]) + 15}
json.dump(out, open(sys.argv[4], "w"))
r = [(pts[k + 1][0] - pts[k][0]) / (pts[k + 1][1] - pts[k][1]) for k in range(len(pts) - 1)]
long_r = [(pts[k + 1][0] - pts[k][0]) / (pts[k + 1][1] - pts[k][1]) for k in range(len(pts) - 1) if pts[k + 1][1] - pts[k][1] >= 60]
print(f"{len(cues)} cues -> {len(pts)} anchors, outFrames={out['outFrames']}; stretch all {min(r):.2f}-{max(r):.2f}; for segments >=2 s: {min(long_r):.2f}-{max(long_r):.2f}")
