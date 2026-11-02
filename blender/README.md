# Blender props (detailed 3D models drawn as flat ink cartoons)

Characters stay 2D kit drawings. Blender is for detailed **props and set pieces** (cannons, ships, machines, furnaces,
vehicles, ruins) that look boxy when built from primitives in code. Each prop is a Python script, so any machine
rebuilds the same image: toon (3 flat colour bands) + ink outlines (Freestyle, #10222B) + transparent background.

Setup: `brew install --cask blender` (tested with Blender 5.2), plus the repo's `.venv` (Pillow) for cropping.

Make one prop:
```bash
bash blender/build.sh cannon          # -> public/props/cannon.png (rendered, then trimmed)
bash blender/build.sh                 # all props
```
New prop: copy `blender/props/cannon.py`, build the model from primitives / lathe profiles, give each part a
`lib.toon("name", "#hex")` material, set the camera in `lib.setup_render(...)`. Use the palette (sea-green, teal,
cream, sunflower, wood/bronze browns; no purple).

Use in a video (kit card stage or any canvas): see `src/engine/kit/assets.ts`.
```ts
const ready = useKitAssets(["props/cannon.png"]);           // in the composition; render nothing until ready
drawAsset(p, "props/cannon.png", x, yBottom, width);        // inside a card's draw(p)
```
The image is static, so animate it the usual way (card position / rotation / scale from the frame), never inside Blender.
Smoke test: `COMP=KitAssets GL=angle node scripts/stills.mjs out/chk/assets 0 0.5`.
