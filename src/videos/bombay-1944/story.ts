// Timeline of "Bombay 1944" (Hindi): shots timed to the final voice (stories/bombay-1944/hi/words.json, frame = round(start * 30)),
// house camera grammar (slow push-ins, smootherstep glides, cuts for big reframes, 7-frame kicks on the two blasts).
// World units are metres. The harbour (Victoria Dock + the Fort Stikine) sits at the origin; the city street, the Byculla
// memorial courtyard and the 2011 dredger are separate little sets far away. Everything here is a pure function of the frame.
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
/** harbour: water surface y = WATER, quay top y = 0 for z >= 0; the ship lies alongside, bow to +x */
export const WATER = -1.2;
export const SHIP = { x0: -38, x1: 38, z0: -14, z1: -2, deck: 5, keel: -4 };
/** the open No. 2 hatch (fire starts here) */
export const HATCH = { x0: -18, x1: -11, z0: -10.5, z1: -5.5, cargo: 2.6 };
export const HATCH_C: V3 = [(HATCH.x0 + HATCH.x1) / 2, SHIP.deck, (HATCH.z0 + HATCH.z1) / 2];
/** the three firemen with the hose (shot 6) on the quay edge, and where the brigade stands in shot 14 */
export const FIREMEN: V3[] = [[-10.4, 0, 1.4], [-10.7, 0, 2.5], [-10.4, 0, 3.6]];
export const BRIGADE_C: V3 = [-9.9, 0, 3.4];
/** the blast centre (between the hold and the bridge, a few metres over the deck) */
export const BLAST: V3 = [-10, 8, -8];
export const SET_CITY: V3 = [3000, 0, 0];
export const SET_MEM: V3 = [-3000, 0, 0];
export const SET_DREDGE: V3 = [0, 0, 3000];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const CT = (x: number, y: number, z: number): V3 => add(SET_CITY, [x, y, z]);
export const MM = (x: number, y: number, z: number): V3 => add(SET_MEM, [x, y, z]);
export const DR = (x: number, y: number, z: number): V3 => add(SET_DREDGE, [x, y, z]);
/** city: a street along x (z in [-4, 4]); the bar that lands on the cobbles; the resident; the roof fires */
export const BAR_STREET: V3 = CT(1.4, 0.035, 1.2);
export const BAR_DUSK: V3 = CT(-14, 0.035, -1.2);
export const RESIDENT: V3 = CT(4.6, 0, 1.6);
export const CITY_FIRE: V3 = CT(16, 14, 9);
/** memorial: the column at the courtyard centre, the saluting firefighter beside it */
export const COLUMN: V3 = MM(0, 0, 0);
export const OFFICER: V3 = MM(2.3, 0, 2.9);
/** dredger: barge centre, the hopper mud, the worker on the far rim, the two small bars */
export const HOPPER = { x0: -7, x1: 5, z0: -3.2, z1: 3.2, mud: 0.35 };
export const WORKER: V3 = DR(-1.4, 0.75, -3.9);
export const BARS_MUD: V3 = DR(-1.2, 0.37, -1.6);

// ---------------- story state ----------------
/** fire in the hold 0..1: starts on "आग लगी", grows through the firefighting */
export const fireAt = (f: number) => (f < 560 ? 0 : f < 616 ? 0.25 + 0.35 * smooth((f - 560) / 56) : Math.min(1, 0.6 + 0.4 * smooth((f - 616) / 90)));
export const BLAST1 = 766, BLAST2 = 848;
/** the ship is there for shots 3-8 (gone after the blasts) */
export const shipVisible = (id: number) => id >= 3 && id <= 8;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "dusk" | "space";
export type Scene = "city" | "harbour" | "memorial" | "dredge";
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
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ---- framings ----
// 1 HOOK: low angle from a roof edge over the tiled rooftops into the smoke-orange sky, gold falling; slow push
const P1: V3 = CT(-3.0, 14.4, -9.4), L1: V3 = CT(3.0, 17.6, 16);
const S1a = (f: number) => dolly(P1, L1, pushK(f, 0, 0.0016), { fov: 46 });
// 2 high angle on the street: the bar on the cobbles in the foreground, the resident and neighbours looking up
const S2a = (f: number) => dolly(CT(-2.6, 2.0, 1.0), CT(5, 0.7, 1.9), pushK(f, 112, 0.0014), { fov: 46 });
// 3 Victoria Dock wide from the quay: the freighter alongside, cranes, godowns, dock workers
const S3a = (f: number) => dolly([12, 12.0, 24.6], [-4, 3.5, -3], pushK(f, 242, 0.0010), { fov: 54 });
// 4 down into the open hatch (dolly in): cotton bales, munition crates, small gold crates
const S4a = (f: number) => dolly([HATCH_C[0] + 4.2, 13.6, HATCH_C[2] + 6.8], [HATCH_C[0] - 0.3, HATCH.cargo, HATCH_C[2]], 1 - 0.32 * glide((f - 412) / 138), { fov: 42 });
// 5 low on the deck by the rail: smoke curls out of the hatch
const S5a = (f: number) => dolly([HATCH_C[0] + 4.2, SHIP.deck + 3.6, -2.9], [HATCH_C[0] - 0.6, SHIP.deck + 1.2, HATCH_C[2] - 0.5], pushK(f, 550, 0.0016), { fov: 50 });
// 6 tracking profile along the quay: the three firemen with the hose, the burning ship behind
const S6a = (f: number): Shot => {
  const u = glide((f - 616) / 88);
  return { pos: lerp3([-1.0, 1.7, 9.5], [-2.6, 1.7, 9.2], u), look: lerp3([-11, 4.2, -1.5], [-12, 4.4, -1.8], u), fov: 48 };
};
// 6b closer: the nozzle man and his crew in profile, the jet arcing up onto the burning deck
const S6b = (f: number) => dolly([-6.0, 1.7, 4.8], [-11.4, 2.2, 1.4], pushK(f, 662, 0.0016), { fov: 46 });
// 7 high and wide: the ship smoking, tiny firemen and engines on the quay; a held breath
const S7a = (f: number) => dolly([30, 34, 46], [-8, 4, -6], pushK(f, 704, 0.0008), { fov: 42 });
// 8 from across the basin (south quay): first blast, pull out; a cut on "दूसरा"
const S8a = (f: number): Shot => {
  const u = glide((f - 756) / 82);
  return { pos: lerp3([26, 2.4, -150], [32, 3.0, -170], u), look: lerp3([-6, 22, -8], [-6, 30, -8], u), fov: 52 };
};
const S8b = (f: number) => dolly([-40, 2.6, -165], [-8, 30, -8], pushK(f, 838, -0.0012), { fov: 54 });
// 9 the fire reaches the city: crane from the street up over the burning roofs
const S9a = (f: number): Shot => {
  const u = glide((f - 870) / 76);
  const v = glide((f - 870) / 76) ** 2;
  return { pos: lerp3(CT(-12, 1.7, -1.2), CT(-20, 15, 0.5), v), look: lerp3(CT(4, 4.5, 1.4), CT(12, 9, 2), v), fov: 46 };
};
// 10 the empty quay after: high and static, the hose on the stones, smoke over the dark water
const S10a = (f: number) => dolly([-3.5, 5.2, 11.5], [-12, 1.2, -8], pushK(f, 946, 0.0008), { fov: 46 });
// 11 one bar on the cobbles in the dusk smoke (close, eye level near the ground)
// 11b the recovery: a crate filling with bars on the street, a clerk with the ledger, constables
const S11b = (f: number) => dolly(CT(-13.2, 1.8, -4.6), CT(-9.3, 1.1, 0.8), pushK(f, 1030, 0.0014), { fov: 46 });
const S11a = (f: number) => dolly(add(BAR_DUSK, [-0.85, 0.38, -0.55]), add(BAR_DUSK, [0.2, 0.06, 0.1]), pushK(f, 994, 0.0016), { fov: 40 });
// 12 2011: the dredger in the harbour (push), cut to the worker leaning over the hopper
const S12a = (f: number) => dolly(DR(1.8, 2.7, 3.6), DR(-1.0, 1.25, -3.2), pushK(f, 1102, 0.0016), { fov: 48 });
const S12b = (f: number) => dolly(DR(-0.2, 2.0, 0.6), add(WORKER, [0, 1.25, 0]), pushK(f, 1184, 0.0014), { fov: 40 });
// 13 two small bars on the wet mud (extreme close, high)
const S13a = (f: number) => dolly(add(BARS_MUD, [0.25, 0.85, 0.75]), add(BARS_MUD, [0, 0, 0]), pushK(f, 1246, 0.0012), { fov: 40 });
// 14 REVEAL: dusk quay, the three firemen facing us, the brigade in ranks behind; slow pull back
const S14a = (f: number): Shot => {
  const u = glide((f - 1290) / 125);
  return { pos: lerp3([BRIGADE_C[0] + 0.3, 1.62, 8.4], [BRIGADE_C[0] + 0.6, 2.4, 15.5], u), look: lerp3([BRIGADE_C[0], 1.45, 2.6], [BRIGADE_C[0], 1.6, 1.2], u), fov: 40 };
};
// 15 tracking: the firemen run toward the fire (screen right) while people walk away (screen left)
export const RUN_V = 3.2, RUN_X0 = -16;
export const runX = (f: number) => RUN_X0 + RUN_V * (f - 1415) / FPS;
const S15a = (f: number): Shot => {
  const x = runX(f) - 1.5 * (1 - glide((f - 1415) / 60)) + 0.6;
  return { pos: [x - 0.8, 1.45, 9.6], look: [x + 0.9, 1.6, 2.0], fov: 46 };
};
// 16 Byculla courtyard: crane down from high to a low angle on the column, the firefighter saluting
const S16a = (f: number): Shot => {
  const u = glide((f - 1527) / 147);
  return { pos: lerp3(MM(7.0, 8.5, 12.5), MM(3.9, 1.05, 6.8), u), look: lerp3(MM(0.8, 2.6, 0.6), MM(0.7, 4.4, 0.4), u), fov: 50 };
};
// 17 slow orbit around the column and the firefighter
const S17a = (f: number): Shot => {
  const a = 0.5 - 0.7 * glide((f - 1674) / 118), c = MM(0.9, 0, 1.1), R = 8.0;
  return { pos: [c[0] + Math.sin(a) * R, 1.6, c[2] + Math.cos(a) * R], look: [c[0], 3.4, c[2]], fov: 48 };
};
// 18 LOOP: shot 1's rooftops, pulling back to land exactly on the first frame of shot 1
const S18a = (f: number) => dolly(P1, L1, 0.955 + 0.045 * glide((f - 1792) / 168), { fov: 46 });

const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S2a, S3a, S4a, S5a, S6a, S6b, S7a, S8a, S8b, S9a, S10a, S11a, S11b, S12a, S12b, S13a, S14a, S15a, S16a, S17a, S18a };
// ---- camera director: subjects and obstacles (QA projects these) ----
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const runnerAt = (f: number): V3 => [runX(f), 1.0, 3.6];
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  rooftops: { at: () => CT(3, 16, 8), height: 6 },
  goldBar: { at: (f: number) => (f < 600 ? BAR_STREET : f < 1240 ? BAR_DUSK : BARS_MUD), height: 0.2 },
  resident: { at: () => eye(RESIDENT, 1.0), height: 1.7 },
  ship: { at: () => [0, 6, -8], height: 12 },
  hold: { at: () => [HATCH_C[0], HATCH.cargo + 0.6, HATCH_C[2]], height: 3 },
  firemen: { at: (f: number) => (f >= 1415 && f < 1527 ? runnerAt(f) : eye(FIREMEN[1], 1.0)), height: 1.7 },
  blast: { at: () => [BLAST[0], 24, BLAST[2]], height: 60 },
  cityFire: { at: () => CITY_FIRE, height: 15 },
  dredger: { at: () => DR(-1, 1.2, 0), height: 4 },
  worker: { at: () => eye(WORKER, 1.0), height: 1.7 },
  column: { at: () => eye(COLUMN, 4.5), height: 9 },
  officer: { at: () => eye(OFFICER, 1.0), height: 1.7 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [];
const DIRECTOR_CTX = { subjects: DIRECTOR_SUBJECTS, obstacles: DIRECTOR_OBSTACLES, groundY: 0 };
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset, scenes: ["city", "harbour", "memorial", "dredge"] });
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
