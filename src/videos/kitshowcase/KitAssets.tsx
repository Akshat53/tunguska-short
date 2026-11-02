// "KitAssets": smoke test for Blender-rendered prop images (src/engine/kit/assets.ts) next to kit people.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { KPen } from "../../engine/kit/core";
import { drawAsset, useKitAssets } from "../../engine/kit/assets";
import { drawPerson } from "../../engine/kit/people";
import { make } from "../../engine/kit/wardrobe";

export const KIT_ASSETS_FRAMES = 30;
const PROPS = ["props/cannon.png"];
export const KitAssets: React.FC = () => {
  const f = useCurrentFrame(), ready = useKitAssets(PROPS), ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current; if (!c || !ready) return;
    const g = c.getContext("2d")!; g.fillStyle = "#e9e4d2"; g.fillRect(0, 0, 1080, 1920);
    g.fillStyle = "#cdbf9c"; g.fillRect(0, 1250, 1080, 670);
    const p = new KPen(g);
    drawAsset(p, "props/cannon.png", 560, 1300, 860);
    g.save(); g.translate(130, 760); g.scale(0.9, 0.9);
    drawPerson(p, make("officer", 9), { t: f / 30, expr: "shout", arms: ["point", "hang"], turn: 0.3 });
    g.restore();
  }, [f, ready]);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
