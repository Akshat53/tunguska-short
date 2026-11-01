#!/usr/bin/env python3
"""Fault injector for the visual-QA self-test (scripts/test-visual-qa.sh). Writes a NEW faulty copy; never touches the input.

usage: qa_inject.py <in.mp4> <out.mp4> <fault> [--story qa-story.json --offset N]
faults (frame numbers are frames of <in.mp4>, inclusive):
  black:A:B     replace frames A..B with black            white:A:B   replace with white
  freeze:A:B    frames A..B all = frame A (frozen span)    blur:A:B    ffmpeg boxblur=8 on frames A..B
  bright:A:B    frames A..B brighter + warmer (x1.35, +red, -blue)
  flat:A:B      frames A..B one flat colour (empty frames) judder:A:B  every 2nd frame in A..B repeats the previous one
  pop:A         frame A shifted 6% of the width sideways (single-frame position pop)
  subjblur:A:B:NAME   box-blur ONLY inside subject NAME's projected box (needs --story/--offset)
  ashift:FRAMES delay the audio by FRAMES frames (length kept)   aclip:DB   audio gain +DB (clips)
"""
import json, subprocess, sys
import numpy as np
from scipy import ndimage

src, dst, fault = sys.argv[1], sys.argv[2], sys.argv[3]
story = json.load(open(sys.argv[sys.argv.index("--story") + 1])) if "--story" in sys.argv else None
offset = int(sys.argv[sys.argv.index("--offset") + 1]) if "--offset" in sys.argv else 0
kind, *args = fault.split(":")
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", src], capture_output=True, text=True).stdout)["streams"][0]
W, H, R = pr["width"], pr["height"], pr["r_frame_rate"]
enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]

if kind in ("ashift", "aclip", "blur"):   # pure ffmpeg filters
    if kind == "ashift":
        ms = int(round(float(args[0]) / eval(R) * 1000))
        cmd = ["-c:v", "copy", "-af", f"adelay={ms}:all=1,atrim=0:{float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout):.3f}", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
    elif kind == "aclip":
        cmd = ["-c:v", "copy", "-af", f"volume={args[0]}dB", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
    else:
        a, b = int(args[0]), int(args[1])
        cmd = ["-vf", f"boxblur=8:1:enable='between(n,{a},{b})'"] + enc
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src] + cmd + [dst])
    sys.exit(r.returncode)

dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
out = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", R, "-i", "-", "-i", src, "-map", "0:v", "-map", "1:a?"] + enc + [dst], stdin=subprocess.PIPE)
a = int(args[0]); b = int(args[1]) if len(args) > 1 and args[1].isdigit() else a
held = prev = None; i = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    F = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
    if a <= i <= b:
        if kind == "black": F[:] = 0
        elif kind == "white": F[:] = 255
        elif kind == "freeze":
            held = F.copy() if held is None else held; F = held
        elif kind == "bright":
            f = F.astype(np.float32) * 1.35; f[..., 0] += 25; f[..., 2] -= 25; F = np.clip(f, 0, 255).astype(np.uint8)
        elif kind == "flat": F[:] = (126, 170, 214)
        elif kind == "judder":
            if (i - a) % 2 == 1 and prev is not None: F = prev.copy()
        elif kind == "pop": F = np.roll(F, int(0.06 * W), axis=1)
        elif kind == "subjblur":
            s = (story["frameData"][i + offset].get("subjects") or {}).get(args[2])
            if s and s.get("bbox"):
                x0, y0, x1, y1 = s["bbox"]
                X0, X1 = max(0, int(x0 * W)), min(W, int(x1 * W)); Y0, Y1 = max(0, int(y0 * H)), min(H, int(y1 * H))
                if X1 - X0 > 8 and Y1 - Y0 > 8:
                    F[Y0:Y1, X0:X1] = ndimage.uniform_filter(F[Y0:Y1, X0:X1], size=(17, 17, 1))
    out.stdin.write(F.tobytes()); prev = F; i += 1
out.stdin.close(); out.wait(); dec.wait()
sys.exit(out.returncode)
