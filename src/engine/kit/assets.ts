// Pre-rendered prop images (Blender -> toon PNG with ink outlines, see blender/README.md) drawn inside kit cards.
// Usage in a composition:  const ready = useKitAssets(["props/cannon.png"]);  (render nothing until ready)
// then in a card's draw:   drawAsset(p, "props/cannon.png", x, y, w)   (x, y = bottom-centre in design units)
// Loading is blocked with delayRender, so every frame (any worker, any order) sees the image: frame-pure.
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import type { KPen } from "./core";

const cache = new Map<string, HTMLImageElement>();

const load = (path: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const hit = cache.get(path);
    if (hit) return resolve(hit);
    const im = new Image();
    im.onload = () => { cache.set(path, im); resolve(im); };
    im.onerror = () => reject(new Error(`kit asset failed to load: ${path}`));
    im.src = staticFile(path);
  });

/** Preload images from public/; returns true once all are decoded (the render waits until then). */
export const useKitAssets = (paths: string[]) => {
  const key = paths.join("|");
  const [ready, setReady] = useState(() => paths.every((p) => cache.has(p)));
  useEffect(() => {
    if (ready) return;
    const h = delayRender(`kit assets: ${key}`);
    Promise.all(paths.map(load)).then(() => { setReady(true); continueRender(h); });
    // a load error leaves the handle open, so Remotion fails the render with the timeout message instead of drawing blanks
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return ready;
};

/** Draw a preloaded image with its bottom-centre at (x, y), width w (height keeps the aspect). Returns its height. */
export const drawAsset = (p: KPen, path: string, x: number, y: number, w: number, flip = false) => {
  const im = cache.get(path);
  if (!im) throw new Error(`kit asset not preloaded: ${path} (call useKitAssets first)`);
  const h = (w * im.naturalHeight) / im.naturalWidth;
  p.g.save();
  if (flip) { p.g.translate(x, 0); p.g.scale(-1, 1); p.g.translate(-x, 0); }
  p.g.drawImage(im, x - w / 2, y - h, w, h);
  p.g.restore();
  return h;
};
