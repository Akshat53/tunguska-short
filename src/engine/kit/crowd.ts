// Visual kit: crowds. makeCrowd() places N people from a weighted archetype mix in a region with per-person seeded
// variation (outfit via wardrobe.ts, height, pose, gesture, expression, timing offset, facing). crowdCards() turns the
// crowd into stage Cards for frame t (idle life, blinks, occasional talk and gestures are offset per person so nobody
// moves in sync). Cheap: one canvas card per visible person at a resolution matching its on-screen size; far people
// are drawn with idle off, so their cards are re-used frame to frame.
import { hash, pick } from "./core";
import { drawPerson, Person, Pose, Gesture, Expr, Prop, Anchors } from "./people";
import { KPen } from "./core";
import { make, Archetype } from "./wardrobe";
import type { Card, V3 } from "./stage";

export const PERSON_DW = 600, PERSON_DH = 1000, PERSON_M = 2.16; // card design size and its height in metres (toon.ts SU)
export type Member = { P: Person; pos: V3; flip: boolean; pose: Pose; tOff: number; scale: number };
export type CrowdOpts = {
  n: number; centre: V3; size: [number, number]; seed: number;
  mix: [Archetype, number][];
  /** look toward this point (people turn their head / body slightly toward it) */
  focus?: V3;
  gestures?: [Gesture, number][]; exprs?: Expr[]; props?: [Prop, number][];
  minGap?: number; talkers?: number;
};
const wpick = <T,>(arr: [T, number][], r: number): T => { const tot = arr.reduce((a, b) => a + b[1], 0); let x = r * tot; for (const [v, w] of arr) { x -= w; if (x <= 0) return v; } return arr[arr.length - 1][0]; };

export const makeCrowd = (o: CrowdOpts): Member[] => {
  const out: Member[] = [], gap = o.minGap ?? 0.75;
  for (let i = 0, tries = 0; out.length < o.n && tries < o.n * 30; tries++, i++) {
    const h = (k: number) => hash(i + o.seed * 101, k);
    const x = o.centre[0] + (h(1) - 0.5) * o.size[0], z = o.centre[2] + (h(2) - 0.5) * o.size[1];
    if (out.some((m) => Math.hypot(m.pos[0] - x, m.pos[2] - z) < gap)) continue;
    const a = wpick(o.mix, h(3)), P = make(a, Math.floor(h(4) * 100000));
    const g1 = o.gestures ? wpick(o.gestures, h(5)) : "hang", g2 = o.gestures && h(6) < 0.35 ? wpick(o.gestures, h(7)) : "hang";
    const fx = o.focus ? Math.sign(o.focus[0] - x) : h(8) < 0.5 ? -1 : 1;
    const turn = 0.15 + 0.3 * h(9);
    const prop = o.props && h(10) < 0.5 ? wpick(o.props, h(11)) : null;
    const pose: Pose = {
      turn: fx * turn, arms: [g1, g2], expr: o.exprs ? pick(o.exprs, h(12)) : "neutral",
      hold: prop ? [null, prop] : [null, null], look: "idle",
    };
    if (prop && (prop === "lantern" || prop === "torch" || prop === "lathi")) pose.arms = [g1, "hold"];
    out.push({ P, pos: [x, o.centre[1], z], flip: false, pose, tOff: h(13) * 20, scale: 1 });
  }
  // a few talkers: speak in short seeded bursts
  for (let k = 0; k < (o.talkers ?? 3) && k < out.length; k++) {
    const m = out[Math.floor(hash(k, o.seed + 7) * out.length)];
    m.pose.talk = Array.from({ length: 6 }, (_, j) => { const s = j * 3.2 + hash(j, k + o.seed) * 1.5; return [s, s + 0.8 + hash(j, k) * 1.2] as [number, number]; });
  }
  return out;
};
/** one person as a stage card standing at `pos` */
export const personCard = (key: string, P: Person, pose: Pose, pos: V3, o: { flip?: boolean; scale?: number; rim?: boolean; idle?: boolean } = {}): Card => {
  const pz: Pose = { ...pose, t: o.idle === false ? 0 : pose.t, idle: o.idle === false ? 0 : pose.idle };
  // a key that only changes when the drawing does: frozen people (idle off) are cached across frames
  const tk = o.idle === false && !pose.gait ? "still" : (pz.t ?? 0).toFixed(3);
  return { key: `p|${key}|${P.seed}|${tk}|${JSON.stringify(pose, (k, v) => (k === "t" ? undefined : v))}`, draw: (p) => drawPerson(p, P, pz), dw: PERSON_DW, dh: PERSON_DH,
    w: (PERSON_M * PERSON_DW) / PERSON_DH * (o.scale ?? 1), pos: [pos[0], pos[1] - 0.025 * PERSON_M * (o.scale ?? 1), pos[2]], flip: o.flip, rim: o.rim ?? true, maxPx: 1536 };
};
/** the crowd as cards at time t; people farther than `still` metres from the camera freeze their idle (cheap) */
export const crowdCards = (crowd: Member[], t: number, camPos: V3, still = 18): Card[] => crowd.map((m, i) => {
  const d = Math.hypot(m.pos[0] - camPos[0], m.pos[2] - camPos[2]);
  return personCard(`c${i}`, m.P, { ...m.pose, t: t + m.tOff }, m.pos, { flip: m.flip, scale: m.scale, idle: d < still });
});

let probe: CanvasRenderingContext2D | null = null;
/** where a person's lantern / torch flames, head and hands are in the world (draws once into a tiny probe canvas) */
export const personAnchors = (P: Person, pose: Pose, pos: V3, o: { flip?: boolean; scale?: number } = {}) => {
  if (!probe) { const cv = document.createElement("canvas"); cv.width = cv.height = 4; probe = cv.getContext("2d")!; }
  probe.setTransform(0.004, 0, 0, 0.004, 0, 0);
  const A: Anchors = drawPerson(new KPen(probe), P, pose);
  const k = (PERSON_M / PERSON_DH) * (o.scale ?? 1), fx = o.flip ? -1 : 1;
  const w = (x: number, y: number): V3 => [pos[0] + (x - 300) * k * fx, pos[1] + (975 - y) * k, pos[2] + 0.02];
  return { glows: A.glows.map((g) => ({ pos: w(g.x, g.y), r: g.r * k, col: g.col })), head: w(...A.head), hands: A.hands.map(([x, y]) => w(x, y)) };
};
