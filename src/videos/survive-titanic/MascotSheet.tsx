// "MascotSheet": the 2D design sheet of the "Could YOU Survive?" mascot (src/engine/kit/mascot.ts): signature look in front,
// 3/4 and profile; the five key expressions; the Ep 1 Titanic outfit standing, in the water, and reaching. Frame-pure.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { KPen } from "../../engine/kit/core";
import { drawMascot, SIGNATURE, TITANIC_1912, type MascotPose, type Outfit } from "../../engine/kit/mascot";
import { KIT_FONT, useKitFont } from "../../engine/kit/captions";

export const MASCOT_SHEET_FRAMES = 90;
type Cell = { O: Outfit; pose: MascotPose; x: number; y: number; k: number; label: string; crop?: number };
const CELLS = (t: number): Cell[] => [
  { O: SIGNATURE, pose: { t, mood: "happy", arms: ["hang", "wave"] }, x: 30, y: 70, k: 0.5, label: "front" },
  { O: SIGNATURE, pose: { t, mood: "neutral", turn: 0.45, arms: ["hang", "point"] }, x: 370, y: 70, k: 0.5, label: "3/4" },
  { O: SIGNATURE, pose: { t, mood: "determined", turn: 1, arms: ["hang", "fist"] }, x: 710, y: 70, k: 0.5, label: "side" },
  { O: SIGNATURE, pose: { t, mood: "shock", arms: ["hug", "hug"] }, x: 0, y: 640, k: 0.36, label: "shocked", crop: 560 },
  { O: SIGNATURE, pose: { t, mood: "shiver", shiver: 1, cold: 1, wet: 1, arms: ["hug", "hug"] }, x: 216, y: 640, k: 0.36, label: "shivering", crop: 560 },
  { O: SIGNATURE, pose: { t, mood: "determined", arms: ["fist", "fist"] }, x: 432, y: 640, k: 0.36, label: "determined", crop: 560 },
  { O: SIGNATURE, pose: { t, mood: "relief", arms: ["cheer", "cheer"] }, x: 648, y: 640, k: 0.36, label: "relieved", crop: 560 },
  { O: SIGNATURE, pose: { t, mood: "gasp", cold: 0.6, arms: ["splash", "splash"] }, x: 864, y: 640, k: 0.36, label: "gasping", crop: 560 },
  { O: TITANIC_1912, pose: { t, mood: "worried", turn: -0.2, arms: ["hang", "cling"] }, x: 30, y: 1050, k: 0.5, label: "Ep 1: 1912 + cork life jacket" },
  { O: TITANIC_1912, pose: { t, mood: "gasp", shiver: 0.8, wet: 1, cold: 1, water: 640, arms: ["splash", "splash"] }, x: 370, y: 1050, k: 0.5, label: "in the water" },
  { O: TITANIC_1912, pose: { t, mood: "determined", turn: 0.5, wet: 1, cold: 0.6, water: 660, arms: ["paddle", "reach"] }, x: 710, y: 1050, k: 0.5, label: "reaching for a boat" },
];
export const MascotSheet: React.FC = () => {
  const f = useCurrentFrame();
  const ready = useKitFont();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!ready) return;
    const cv = ref.current!, g = cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, "#f6ecd2"); bg.addColorStop(1, "#cfe3d6");
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
    g.fillStyle = "#10222B"; g.font = `800 46px ${KIT_FONT}`; g.textAlign = "center"; g.fillText("COULD YOU SURVIVE? · the mascot", 540, 52);
    for (const c of CELLS(f / 30)) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (c.pose.water !== undefined) { g.fillStyle = "#173f46"; g.fillRect(c.x, c.y + c.pose.water * c.k, 600 * c.k, (1000 - c.pose.water) * c.k - 20); }
      else { g.fillStyle = "rgba(16,34,43,0.12)"; g.beginPath(); g.ellipse(c.x + 300 * c.k, c.y + 975 * c.k, 120 * c.k, 20 * c.k, 0, 0, Math.PI * 2); g.fill(); }
      g.save();
      if (c.crop) { g.beginPath(); g.rect(c.x, c.y, 600 * c.k, c.crop * c.k + 30); g.clip(); }
      g.setTransform(c.k, 0, 0, c.k, c.x, c.y);
      drawMascot(new KPen(g), c.O, c.pose);
      g.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#10222B"; g.font = `700 26px ${KIT_FONT}`; g.textAlign = "center";
      g.fillText(c.label, c.x + 300 * c.k, c.y + (c.crop ? c.crop * c.k + 62 : 1000 * c.k + 20));
    }
  }, [f, ready]);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
