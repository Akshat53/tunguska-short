// Blender-rendered props for the Laughter Epidemic (blender/props/*.py -> public/props/*.png, toon + ink, transparent).
// Each function draws into the same design box as the canvas prop it replaces (art.ts), so card sizes / positions stay.
// The images are static; anything that moves (the lorry's wheels) is transformed here from the frame-derived argument.
import type { KPen } from "../../engine/kit/core";
import { drawAsset } from "../../engine/kit/assets";
import LORRY from "../../../public/props/lorry.json";
import WHEEL from "../../../public/props/lorry_wheel.json";
import LAB from "../../../public/props/labtable.json";
import BEDN from "../../../public/props/bed_net.json";
import BED from "../../../public/props/bed.json";
import TUBE from "../../../public/props/tube_amber.json";

export const PROP3D = ["props/lorry.png", "props/lorry_wheel.png", "props/labtable.png", "props/bed_net.png", "props/bed.png",
  "props/tube_amber.png", "props/tube_mint.png"];

type XY = [number, number];
/** the lorry, side 3/4 view facing screen-right, in the old 1400 x 760 box (base y 750, card width 5.2 m).
 *  wheel = road-wheel rotation (rad, clockwise). The near wheels are drawn first, behind the body's wheel holes. */
export const lorry3d = (p: KPen, wheel: number) => {
  const U = 1400 / 5.2, s = U / LORRY.px_per_m, R = 0.46 * LORRY.px_per_m;
  const left = 700 - LORRY.origin[0] * s, top = 750 - LORRY.origin[1] * s;
  const D = (q: number[]): XY => [left + q[0] * s, top + q[1] * s];
  const wm = WHEEL.w / WHEEL.px_per_m, hm = WHEEL.h / WHEEL.px_per_m;
  // wheel-local metres -> design: x along the projected wheel's side axis, y along its (sheared) vertical axis
  const ex: XY = [((LORRY.rear_side[0] - LORRY.rear[0]) / R) * s * LORRY.px_per_m, ((LORRY.rear_side[1] - LORRY.rear[1]) / R) * s * LORRY.px_per_m];
  const ey: XY = [((LORRY.rear[0] - LORRY.rear_top[0]) / R) * s * LORRY.px_per_m, ((LORRY.rear[1] - LORRY.rear_top[1]) / R) * s * LORRY.px_per_m];
  for (const c of [LORRY.rear, LORRY.front]) {
    const [x, y] = D(c), g = p.g;
    g.save(); g.transform(ex[0], ex[1], ey[0], ey[1], x, y); g.rotate(wheel);
    drawAsset(p, "props/lorry_wheel.png", 0, hm / 2, wm);
    g.restore();
  }
  drawAsset(p, "props/lorry.png", left + (LORRY.w * s) / 2, top + LORRY.h * s, LORRY.w * s);
};

/** the clinic lab table, front view: card 1400 x 760, base y 750, width 3.0 m (taller than the old 640 box: the brass
 *  microscope stands above it). Table front-centre on the ground = (700, 750). */
export const LAB_DW = 1400, LAB_DH = 760, LAB_BASE = 750;
export const labTable3d = (p: KPen) => {
  const s = 1400 / 3.0 / LAB.px_per_m;
  drawAsset(p, "props/labtable.png", 700 + (LAB.w / 2 - LAB.origin[0]) * s, LAB_BASE + (LAB.h - LAB.origin[1]) * s, LAB.w * s);
};

/** an iron bed (3/4 view, head end left), with or without the knotted-up mosquito net: card 1300 x 1320, base 1310,
 *  width 2.0 * 1300 / 1200 m (the old bed's 600 units per metre). Image centred, lowest leg on the base line. */
export const BED_DW = 1300, BED_DH = 1320, BED_BASE = 1310, BED_W = (2.0 * 1300) / 1200;
export const bed3d = (p: KPen, net: boolean) => {
  const J = net ? BEDN : BED, s = 600 / J.px_per_m;
  drawAsset(p, net ? "props/bed_net.png" : "props/bed.png", BED_DW / 2, BED_BASE + 8 * s, J.w * s);
};

/** the test tube in a doctor's raised hand: same anchor as art.ts tubeAt (hand at x, y; tube from y - 0.54 h to y + 0.12 h) */
export const tubeAt3d = (p: KPen, x: number, y: number, h: number, liquid: string) => {
  const len = 0.66 * h;
  drawAsset(p, liquid === "#ff8a5a" ? "props/tube_amber.png" : "props/tube_mint.png", x, y + 0.12 * h, (len * TUBE.w) / TUBE.h);
};
