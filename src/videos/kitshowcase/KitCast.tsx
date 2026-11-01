// "KitCast": a 2D character sheet of the visual kit (no three.js): every archetype in front, 3/4, side-walk and run poses,
// with gestures, props, expressions and talk. Frame-pure: idle life / blinks / walk phase all come from the frame.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { KPen, PAL } from "../../engine/kit/core";
import { drawPerson, Pose, Person } from "../../engine/kit/people";
import { make, Archetype } from "../../engine/kit/wardrobe";

export const KIT_CAST_FRAMES = 240;
type Cell = { a: Archetype; seed: number; pose: Pose };
const ROWS: Cell[][] = [
  [
    { a: "villager", seed: 3, pose: { expr: "smile", arms: ["hang", "hips"], talk: [[0.5, 2.5]] } },
    { a: "villageWoman", seed: 4, pose: { expr: "neutral", turn: -0.35, arms: ["hold", "hang"], hold: ["lantern", null] } },
    { a: "elder", seed: 5, pose: { expr: "worried", turn: 0.3, arms: ["fold", "fold"] } },
    { a: "child", seed: 6, pose: { expr: "happy", arms: ["wave", "hang"] } },
  ],
  [
    { a: "chowkidar", seed: 7, pose: { expr: "determined", arms: ["hold", "carry"], hold: ["lathi", "chapati"] } },
    { a: "chowkidar", seed: 8, pose: { view: "side", gait: "run", expr: "determined", arms: ["swing", "carry"], hold: [null, "chapatis"], turn: 0.4 } },
    { a: "officer", seed: 9, pose: { expr: "surprised", turn: 0.25, arms: ["hang", "cover"] } },
    { a: "officer", seed: 12, pose: { expr: "stern", turn: -0.3, arms: ["point", "hips"] } },
  ],
  [
    { a: "firefighter", seed: 10, pose: { expr: "shout", turn: 0.3, arms: ["hose", "hose"], hold: [null, "nozzle"] } },
    { a: "dockWorker", seed: 11, pose: { view: "side", gait: "walk", expr: "neutral", turn: 0.6 } },
    { a: "citizen", seed: 13, pose: { expr: "scared", arms: ["shield", "hang"], turn: -0.2 } },
    { a: "cityWoman", seed: 14, pose: { expr: "awe", arms: ["cup", "hang"] } },
  ],
];

export const KitCast: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current!, g = cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const bg = g.createLinearGradient(0, 0, 0, 1920);
    bg.addColorStop(0, "#f6ecd2"); bg.addColorStop(1, "#cfe3d6");
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
    const t = f / 30;
    ROWS.forEach((row, ri) => row.forEach((c, ci) => {
      const P: Person = make(c.a, c.seed);
      const k = 0.62, x = 10 + ci * 268, y = 20 + ri * 630;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(16,34,43,0.10)"; g.beginPath(); g.ellipse(x + 300 * k * 0.9, y + 975 * k, 120 * k, 22 * k, 0, 0, Math.PI * 2); g.fill();
      g.setTransform(k * 0.9, 0, 0, k, x, y);
      drawPerson(new KPen(g), P, { t, phase: (t * (c.pose.gait === "run" ? 1.5 : 1.0)) % 1, ...c.pose });
    }));
    void PAL;
  }, [f]);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
