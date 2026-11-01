// Timeline of "Roopkund" (Hindi): shots timed to the final voice (stories/roopkund/hi/words.json, frame = round(start * 30)),
// camera grammar of the house style (slow symmetric push-ins, smootherstep glides, cuts for big reframes, 7-frame kicks).
// World units are metres. The lake set sits at the origin; trail, lab and globe are separate little sets far away.
// Everything here is a pure function of the frame number.
import storyboard from "./storyboard.json";
import { assertValid, type Storyboard } from "../../engine/storyboard/schema";
import { buildPreset, checkPreset, type Obstacle, type Subject } from "../../engine/camera";

export const FPS = 30;
const SB = storyboard as unknown as Storyboard;
export const TOTAL = SB.totalFrames;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// ---------------- places ----------------
/** the tarn: an ellipse RX x RZ around the origin, ~5000 m up in a snow bowl */
export const LAKE_RX = 36, LAKE_RZ = 26;
/** the two groups of remains on different shores (shot 10 marks them: A = the older, larger group; B = the later one) */
export const CLUSTER_A: V3 = [-14, 0, 26.6];
export const CLUSTER_B: V3 = [21, 0, -24.2];
/** the trekker stands on the south shore, looking north over the ice */
export const TREK: V3 = [-6.5, 0, 31.5];
export const SET_TRAIL: V3 = [3000, 0, 0];
export const SET_LAB: V3 = [-3000, 0, 0];
export const SET_GLOBE: V3 = [0, 6000, 0];
export const GLOBE_R = 60;
/** places on the globe (degrees): Roopkund, and the eastern Mediterranean (Crete / southern Greece) */
export const ROOPKUND_LL: [number, number] = [30.26, 79.73];
export const MED_LL: [number, number] = [36.2, 24.0];
/** the legend procession: walkers along +x on the trail, 0.85 m/s, stop when the hail starts */
export const WALK_V = 0.85, WALK_STOP = 600, WALK_GAP = 1.5;
export const walkX = (f: number) => -2.2 + WALK_V * (Math.min(f, WALK_STOP) - 432) / FPS;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "dusk" | "space";
export type Scene = "lake" | "trail" | "lab" | "globe";
export type ShotDef = { id: number; a: number; b: number; light: Light; scene: Scene; fog?: [number, number] };
export const SHOTS: ShotDef[] = SB.shots.map((x) => ({ id: x.id, a: x.a, b: x.b, light: x.light, scene: x.scene as unknown as Scene, ...(x.fog ? { fog: x.fog } : {}) }));
export const XFADE: Record<number, number> = Object.fromEntries(SB.shots.filter((x) => x.xfade).map((x) => [x.id, x.xfade!]));
export const FLASH_AT = SB.events.flashAt;
export const FLASHES: [number, number][] = SB.events.flashes;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
/** storm amount 0..1 (darker sky, grey clouds, dimmer sun): the legend darkens on "देवी नंदा नाराज़", and the "one storm" lake shot */
export const stormAt = (id: number, f: number) => (id === 4 ? smooth((f - 520) / 70) : id === 6 ? 1 : 0);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
/** push-in factor since f0 (subject grows ~rate per frame) */
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const TR = (x: number, y: number, z: number): V3 => add(SET_TRAIL, [x, y, z]);
const LB = (x: number, y: number, z: number): V3 => add(SET_LAB, [x, y, z]);
const GL = (x: number, y: number, z: number): V3 => add(SET_GLOBE, [x, y, z]);

// ---- framings ----
// 1 HOOK: aerial descent over the frozen tarn; cut on "सैकड़ों" to the shore where the pale remains lie
const S1a = (f: number) => dolly([44, 86, 118], [0, 0, 6], pushK(f, 0, 0.0024), { fov: 44 });
const S1b = (f: number) => dolly([-11.2, 3.6, 32.2], [-14.2, 0.1, 26.0], pushK(f, 149, 0.0022), { fov: 40, roll: 0.015 });
// 2 SETTING: across the lake to the ridge: how high and far this is
const S2a = (f: number) => dolly([6, 13, 92], [0, 34, -260], pushK(f, 216, 0.0012), { fov: 46 });
// 3 the trekker alone at the shore, from above ("ये लोग कौन थे?")
const S3a = (f: number) => dolly([-4.4, 3.4, 36.6], [-6.4, 1.2, 30.8], pushK(f, 338, 0.0018), { fov: 40 });
// 4 LEGEND: tracking the procession along a snowy ridge trail (profile), the storm comes in
const S4a = (f: number) => { const cx = walkX(f) - WALK_GAP * 1.5; return { pos: TR(cx + 0.5, 1.45, 11.5), look: TR(cx - 0.2, 2.3, 0), fov: 42 } as Shot; };
// 5 lab: the skull screens; dolly in on the scientist, then a close look at the big screen (carbon date)
const S5a = (f: number) => dolly(LB(0.75, 1.95, 7.6), LB(0.55, 1.9, -1.0), pushK(f, 670, 0.0016), { fov: 40 });
const S5b = (f: number) => dolly(LB(0.15, 2.75, 3.4), LB(0, 2.72, -2.85), pushK(f, 834, 0.0015), { fov: 40 });
// 6 "एक तूफ़ान, एक हादसा": the lake from low on the shore, a heavy sky
const S6a = (f: number) => dolly([12, 1.6, 36], [-2, 5, -8], pushK(f, 943, 0.0018), { fov: 46, roll: -0.02 });
// 7 lab again: slow orbit around the seated scientist, DNA on the screens
const S7a = (f: number): Shot => {
  const a = -0.42 + 0.7 * glide((f - 1015) / 117), c = LB(-0.9, 1.05, 0.8);
  return { pos: [c[0] + Math.sin(a) * 4.6, c[1] + 0.85, c[2] + Math.cos(a) * 4.6], look: [c[0] + 0.2, c[1] + 0.55, c[2] - 0.6], fov: 40 };
};
// 8 globe: South Asia toward the lens, slow push
const S8a = (f: number) => dolly(GL(-30, 66, 236), GL(4, 26, 40), pushK(f, 1132, 0.0016), { fov: 40 });
// 9 the turn: pull back so the Mediterranean comes into view with the Himalaya
const S9a = (f: number): Shot => {
  const u = glide((f - 1262) / 150);
  return { pos: lerp3(GL(-26, 62, 222), GL(-8, 52, 330), u), look: lerp3(GL(4, 26, 40), GL(0, 22, 12), u), fov: 40 };
};
// 10 the lake in golden light, crane up: two groups of remains on different shores
const S10a = (f: number): Shot => {
  const u = glide((f - 1453) / 263);
  return { pos: lerp3([-34, 9, 62], [-26, 74, 92], u), look: lerp3([2, 1, 4], [3, 0, 0], u), fov: 46 - 2 * u };
};
// 11 over the trekker's shoulder (profile at frame left): the frozen lake at dusk
const S11a = (f: number) => dolly([-7.6, 1.7, 36.6], [0.5, 1.0, 12.5], pushK(f, 1716, 0.00004), { fov: 40 });
// 12 CALLBACK: the lake from above, rising slowly away; one glint on the ice
const S12a = (f: number): Shot => {
  const u = glide((f - 1956) / 159);
  return { pos: lerp3([34, 70, 96], [52, 128, 168], u), look: [0, 0, 4], fov: 44 };
};

/** camera functions by name: storyboard.json refers to these */
const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S1b, S2a, S3a, S4a, S5a, S5b, S6a, S7a, S8a, S9a, S10a, S11a, S12a };
// ---- camera director: subjects and obstacles (QA projects these) ----
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const procession = (f: number): V3 => TR(walkX(f) - WALK_GAP * 1.5, 1.0, 0);
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  lake: { at: () => [0, 0.5, 0], height: 1 },
  ridge: { at: () => [0, 60, -300], height: 80 },
  trekker: { at: () => eye(TREK, 1.5), height: 1.7 },
  remainsA: { at: () => eye(CLUSTER_A, 0.1), height: 1 },
  procession: { at: (f: number) => procession(f), height: 1.7 },
  scientist: { at: () => LB(1.15, 1.45, 0.9), height: 1.7 },
  scientistSit: { at: () => LB(-0.9, 1.1, 0.8), height: 1.3 },
  screens: { at: () => LB(0, 2.72, -2.85), height: 1.3 },
  globe: { at: () => SET_GLOBE, height: 120 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [{ kind: "cyl", x: TREK[0], z: TREK[2], r: 0.45, h: 1.9 }];
const DIRECTOR_CTX = { subjects: DIRECTOR_SUBJECTS, obstacles: DIRECTOR_OBSTACLES, groundY: 0 };
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset, scenes: ["lake", "trail", "lab", "globe"] });
const CAMS: Record<number, Key[]> = Object.fromEntries(SB.shots.map((x) => [x.id, x.camera.map((k, i) => {
  const next = x.camera[i + 1]?.f ?? x.b;
  const s = k.preset ? ((cam) => (f: number): Shot => cam(f))(buildPreset(k.preset, { f0: k.f, dur: next - k.f, ...(k.params ?? {}) }, DIRECTOR_CTX)) : CAM_FN[k.fn!];
  return { f: k.f, ...(k.dur ? { dur: k.dur } : {}), ...(k.cut ? { cut: true } : {}), s };
})]));

export const HITS = SB.events.hits;
const KICKS: [number, number][] = SB.events.kicks.map(([f, g]) => [f / FPS, g] as [number, number]);
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** depth of field: off in this film (house rule: lens blur stays off); kept for the QA tools' interface */
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });
