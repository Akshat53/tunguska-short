# Trim a transparent PNG to its content + a small margin:  .venv/bin/python blender/crop.py in.png [out.png] [margin]
import sys
from PIL import Image
src = sys.argv[1]; dst = sys.argv[2] if len(sys.argv) > 2 else src; m = int(sys.argv[3]) if len(sys.argv) > 3 else 8
im = Image.open(src).convert("RGBA"); x0, y0, x1, y1 = im.getchannel("A").getbbox()
im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m))).save(dst)
print(dst, im.crop((x0, y0, x1, y1)).size)
