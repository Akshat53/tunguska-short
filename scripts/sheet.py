# usage: python scripts/sheet.py out.jpg img1 img2 ...  (contact sheet, 6 per row, 270x480 cells, file label for review only)
import sys
from PIL import Image, ImageDraw
out, fs = sys.argv[1], sys.argv[2:]
W, H, C = 270, 480, 6
im = Image.new("RGB", (W * min(C, len(fs)), H * ((len(fs) + C - 1) // C)), "black")
d = ImageDraw.Draw(im)
for i, f in enumerate(fs):
    x, y = (i % C) * W, (i // C) * H
    im.paste(Image.open(f).convert("RGB").resize((W, H)), (x, y))
    d.rectangle([x, y, x + 60, y + 14], fill="black"); d.text((x + 2, y + 1), f.split("_")[-1].split(".")[0], fill="yellow")
im.save(out, quality=88)
