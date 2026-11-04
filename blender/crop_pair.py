# Crop several renders of the SAME camera to their union alpha bbox (+ margin), so layered sprites stay aligned
# (e.g. lifeboat_far.png + lifeboat_near.png with people drawn between them). Also converts <first>.pts.json (raw render
# pixels) into <first>.json in cropped pixels.  usage: .venv/bin/python blender/crop_pair.py a.png b.png [...]
import json, os, sys
from PIL import Image
fs = sys.argv[1:]; m = 8
ims = [Image.open(f).convert("RGBA") for f in fs]
bb = [im.getchannel("A").getbbox() for im in ims]
x0 = max(0, min(b[0] for b in bb) - m); y0 = max(0, min(b[1] for b in bb) - m)
x1 = min(ims[0].width, max(b[2] for b in bb) + m); y1 = min(ims[0].height, max(b[3] for b in bb) + m)
for f, im in zip(fs, ims): im.crop((x0, y0, x1, y1)).save(f); print(f, (x1 - x0, y1 - y0))
pj = fs[0][:-4] + ".pts.json"
if os.path.exists(pj):
    d = json.load(open(pj)); out = {"w": x1 - x0, "h": y1 - y0}
    for k, v in d.items():
        out[k] = [round(v[0] - x0, 1), round(v[1] - y0, 1)] if isinstance(v, list) else v
    json.dump(out, open(fs[0][:-4].replace("_far", "") + "_pair.json", "w")); os.remove(pj); print(out)
