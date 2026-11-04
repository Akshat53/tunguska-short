// Blender-rendered props for "Could YOU Survive? Ep 1" (blender/props/*.py -> public/props/*.png, toon + ink, transparent):
// the RMS Titanic (intact + the stern section standing up), each with a *_lights pass drawn additively (same crop), the
// wooden lifeboat as far/near layers with kit people drawn between them, the deck chair, wreckage, the cork life jacket and
// the lantern. The images are static; anything that moves is transformed here from frame-derived arguments.
import type { Card, V3 } from "../../engine/kit/stage";
import type { KPen } from "../../engine/kit/core";
import { rgba, ellPts, hash, type P2 } from "../../engine/kit/core";
import { drawAsset } from "../../engine/kit/assets";
import { drawPerson, type Pose, type Anchors } from "../../engine/kit/people";
import SHIP from "../../../public/props/titanic.json";
import STERN from "../../../public/props/titanic_stern.json";
import BOAT from "../../../public/props/lifeboat_pair.json";
import { lifeVest, lanternX, type Dressed } from "./cast";

export const PROP3D = ["props/titanic.png", "props/titanic_lights.png", "props/titanic_stern.png", "props/titanic_stern_lights.png",
  "props/lifeboat_far.png", "props/lifeboat_near.png", "props/deckchair.png", "props/debris.png", "props/lifejacket.png", "props/lantern.png"];

// ---------------- the ship ----------------
/** metres per image pixel (model 1:10, px_per_m is per model unit) */
const SHIP_M = 10 / SHIP.px_per_m, STERN_M = 10 / STERN.px_per_m;
export const SHIP_W = SHIP.w * SHIP_M, SHIP_H = SHIP.h * SHIP_M, STERN_W = STERN.w * STERN_M, STERN_H = STERN.h * STERN_M;
/** the intact ship, waterline (mid) at at[1]; rot = card roll (negative = bow down); lights 0..1 */
export const shipCards = (at: V3, rot: number, lights: number, t: number): Card[] => {
  const h = SHIP_H, y = at[1] - ((SHIP.h - SHIP.mid_wl[1]) / SHIP.h) * h;
  const base: Card = { key: "ship", draw: (p) => drawAsset(p, "props/titanic.png", SHIP.w / 2, SHIP.h, SHIP.w), dw: SHIP.w, dh: SHIP.h, w: SHIP_W, pos: [at[0], y, at[2]], face: "fixed", rot, maxPx: 2048, tintMul: [0.62, 0.7, 0.86] };
  const out: Card[] = [base];
  if (lights > 0.01) out.push({ ...base, key: "shipL", draw: (p) => drawAsset(p, "props/titanic_lights.png", SHIP.w / 2, SHIP.h, SHIP.w), add: true, lit: false, glow: 2.6 * lights * (0.96 + 0.04 * Math.sin(t * 9)), order: 3, tintMul: undefined });
  return out;
};
/** the stern section standing up; sink 0..1 slides it under (and steepens it a little) */
export const sternCards = (at: V3, sink: number, lights: number, t: number): Card[] => {
  const h = STERN_H, y = at[1] - 0.42 * h - sink * 0.62 * h;
  const base: Card = { key: "stern", draw: (p) => drawAsset(p, "props/titanic_stern.png", STERN.w / 2, STERN.h, STERN.w), dw: STERN.w, dh: STERN.h, w: STERN_W, pos: [at[0], y, at[2]], face: "fixed", rot: -0.05 - 0.16 * sink, maxPx: 2048, tintMul: [0.6, 0.68, 0.84] };
  const out: Card[] = [base];
  if (lights > 0.01) out.push({ ...base, key: "sternL", draw: (p) => drawAsset(p, "props/titanic_stern_lights.png", STERN.w / 2, STERN.h, STERN.w), add: true, lit: false, glow: 2.8 * lights, order: 3, tintMul: undefined });
  void t;
  return out;
};

// ---------------- the lifeboat ----------------
export const BOAT_M = 1 / BOAT.px_per_m, BOAT_W = BOAT.w * BOAT_M;
type Seat = keyof typeof BOAT & `s${number}${"n" | "f"}`;
export type Rider = { seat: Seat; D: Dressed; pose: Pose; row?: number; lantern?: boolean; stand?: boolean; dx?: number };
/** design-unit scale of a kit person card inside the boat image (2.16 m card) */
const PK = (2.16 * BOAT.px_per_m) / 1000;
/** waterline in boat-image pixels: the line wl_stern -> wl_bow */
const wlAt = (x: number) => BOAT.wl_stern[1] + ((x - BOAT.wl_stern[0]) / (BOAT.wl_bow[0] - BOAT.wl_stern[0])) * (BOAT.wl_bow[1] - BOAT.wl_stern[1]);
const drawRider = (p: KPen, r: Rider) => {
  const [sx, sy] = BOAT[r.seat] as number[], g = p.g;
  const hip = r.stand ? 900 : 640, x = sx + (r.dx ?? 0);
  g.save(); g.translate(x - 300 * PK, sy - hip * PK); g.scale(PK, PK);
  const A: Anchors = drawPerson(p, r.D.P, r.pose);
  if (r.D.vest) lifeVest(p, A, r.D.P);
  if (r.lantern) lanternX(p, A, r.D.P);
  g.restore();
  return A.hands.map(([hx, hy]) => [x - 300 * PK + hx * PK, sy - hip * PK + hy * PK] as P2);
};
/** a lifeboat card: far layer, the riders (far seats first), near layer, near-side oars sweeping with row (phase 0..1); cut at the
 *  waterline with a foam line. at = bottom-centre on the water. */
export const boatCard = (key: string, riders: Rider[], at: V3, t: number, o: { flip?: boolean; row?: number; scale?: number; tint?: [number, number, number]; wake?: number } = {}): Card => {
  const s = o.scale ?? 1, w = BOAT_W * s, h = (w * BOAT.h) / BOAT.w, tq = Math.round(t * 15) / 15;
  const wlMid = wlAt(BOAT.w / 2), y = at[1] - ((BOAT.h - wlMid) / BOAT.h) * h;
  return {
    key: `B|${key}|${tq}|${riders.length}|${o.row ?? -1}`, dw: BOAT.w, dh: BOAT.h, w, pos: [at[0], y, at[2]], flip: o.flip, tintMul: o.tint, maxPx: 2048, order: 2,
    draw: (p) => {
      const g = p.g;
      g.save(); g.beginPath(); g.moveTo(-20, -400); g.lineTo(BOAT.w + 20, -400); g.lineTo(BOAT.w + 20, wlAt(BOAT.w + 20)); g.lineTo(-20, wlAt(-20)); g.closePath(); g.clip();
      drawAsset(p, "props/lifeboat_far.png", BOAT.w / 2, BOAT.h, BOAT.w);
      const handsOf = new Map<Rider, P2[]>();
      for (const r of [...riders].sort((a, b) => (a.seat.endsWith("f") ? 0 : 1) - (b.seat.endsWith("f") ? 0 : 1))) handsOf.set(r, drawRider(p, r));
      drawAsset(p, "props/lifeboat_near.png", BOAT.w / 2, BOAT.h, BOAT.w);
      g.restore();
      // near-side oars (from the rower's hands over the gunwale into the water), sweeping
      riders.forEach((r, i) => {
        if (r.row === undefined || !r.seat.endsWith("n")) return;
        const hs = handsOf.get(r) ?? [];
        const hd = hs.reduce<P2 | undefined>((m, q) => (!m || q[1] > m[1] ? q : m), undefined);
        if (!hd) return;
        const ph = Math.sin(2 * Math.PI * r.row), lockX = (BOAT[r.seat] as number[])[0] + 30, lockY = wlAt(lockX) - 95;
        const tip: P2 = [lockX + 40 + 180 * ph, wlAt(lockX) + 70 - 30 * Math.max(0, -ph)];
        p.band([hd, [lockX, lockY], tip], "#b8834a", 9, 3);
        p.poly([[tip[0] - 30, tip[1] - 6], [tip[0] + 30, tip[1] - 2], [tip[0] + 28, tip[1] + 14], [tip[0] - 30, tip[1] + 10]], "#a8743e", 3);
        if (ph < 0) for (let k = 0; k < 5; k++) p.dot(tip[0] + 40 * (hash(k, i) - 0.5), wlAt(tip[0]) - 10 * hash(k, i + 3), 4, "rgba(230,246,250,0.85)");
      });
      // waterline foam along the hull + a wake
      const fo: P2[] = []; for (let i = 0; i <= 30; i++) { const x = BOAT.wl_stern[0] + (BOAT.wl_bow[0] - BOAT.wl_stern[0]) * (i / 30); fo.push([x, wlAt(x) + 3 * Math.sin(tq * 5 + i)]); }
      p.stroke(fo, 10, "rgba(220,240,246,0.55)"); p.stroke(fo, 3, "rgba(255,255,255,0.85)");
      if (o.wake) for (let k = 0; k < 3; k++) { const u = ((tq * 0.6 + k / 3) % 1 + 1) % 1; p.stroke(ellPts(BOAT.wl_stern[0] - 60 * u, BOAT.wl_stern[1] + 10, 60 + 260 * u, 14 + 30 * u, 120, 260, 0, 14), 5 * (1 - u), rgba("#cfeaf0", 0.6 * (1 - u) * o.wake)); }
    },
  };
};
export const BOAT_PTS = BOAT;
/** Lowe's lantern in Lifeboat 14 (seat s4n, standing, dx 60, right arm raised): its centre in boat-image pixels */
export const LANTERN_DESIGN: P2 = [BOAT.s4n[0] + 60 + (432 - 300) * PK, BOAT.s4n[1] - 900 * PK + 300 * PK];
/** world position of a boat-image pixel on a boat card (yaw card facing the camera) */
export const boatPoint = (c: Card, d: P2, cam: { position: { x: number; z: number } }): V3 => {
  const h = (c.w * c.dh) / c.dw, a = Math.atan2(cam.position.x - c.pos[0], cam.position.z - c.pos[2]);
  const lx = (d[0] / c.dw - 0.5) * c.w * (c.flip ? -1 : 1);
  return [c.pos[0] + Math.cos(a) * lx, c.pos[1] + (1 - d[1] / c.dh) * h, c.pos[2] - Math.sin(a) * lx];
};

// ---------------- floating props ----------------
type Img = { path: string; w: number; h: number };
export const FLOAT: Record<string, Img> = {
  chair: { path: "props/deckchair.png", w: 1220, h: 1206 }, debris: { path: "props/debris.png", w: 1632, h: 811 }, vest: { path: "props/lifejacket.png", w: 1238, h: 988 },
};
/** a floating prop card: the image cut at a waterline `wl` (0..1 of its height from the top), foam at the cut, bobbing */
export const floatCard = (key: string, kind: keyof typeof FLOAT, w: number, at: V3, t: number, o: { wl?: number; rot?: number; flip?: boolean; tint?: [number, number, number]; yaw?: number; face?: Card["face"] } = {}): Card => {
  const I = FLOAT[kind], wl = (o.wl ?? 0.72) * I.h, h = (w * I.h) / I.w, tq = Math.round(t * 10) / 10;
  return {
    key: `F|${key}|${tq}`, dw: I.w, dh: I.h, w, pos: [at[0], at[1] - ((I.h - wl) / I.h) * h, at[2]], rot: o.rot, flip: o.flip, tintMul: o.tint ?? [0.66, 0.74, 0.9], order: 2, maxPx: 1536,
    face: o.face ?? "yaw", yaw: o.yaw,
    draw: (p) => {
      p.g.save(); p.g.beginPath(); p.g.rect(-10, -10, I.w + 20, wl + 10); p.g.clip(); drawAsset(p, I.path, I.w / 2, I.h, I.w); p.g.restore();
      const fo: P2[] = []; for (let i = 0; i <= 16; i++) { const u = i / 16; fo.push([I.w * (0.08 + 0.84 * u), wl + 6 * Math.sin(tq * 3 + u * 12)]); }
      p.stroke(fo, 14, "rgba(220,240,246,0.45)"); p.stroke(fo, 4, "rgba(255,255,255,0.75)");
    },
  };
};
void rgba;
