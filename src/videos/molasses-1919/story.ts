// Timeline of "The Great Molasses Flood, Boston 1919" (English, Inkfall): shots timed to the final voice
// (stories/molasses-1919/en/words.json, frame = round(start * 30)), house camera grammar (slow push-ins, smootherstep glides,
// cuts for big reframes, 7-frame kicks on the burst and the stamp). World units are metres.
// The North End street runs along x (houses at z = +-7), the tank stands at its +x end by the harbour; the explainer
// room and the office are separate little sets far away. Everything here is a pure function of the frame.
import storyboard from "./storyboard.json";
import { assertValid, type Storyboard } from "../../engine/storyboard/schema";
import { checkPreset, type Obstacle, type Subject } from "../../engine/camera";

export const FPS = 30;
const SB = storyboard as unknown as Storyboard;
export const TOTAL = SB.totalFrames;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places ----------------
/** street: facades at z = +-HOUSE_Z, sidewalks from |z| 5 to 7, the elevated railway on posts at z = +-EL_Z */
export const HOUSE_Z = 7, WALK_Z = 5, EL_Z = 4.6, EL_Y = 6.4, STREET_END = 40;
/** the tank: centre on the ground, radius, height (about 50 ft tall, 90 ft across) */
export const TANK = { x: 68, z: -4, R: 13, H: 15 };
export const WATER = -1.2;
export const SET_EXP: V3 = [0, 0, 3000];
export const SET_OFF: V3 = [3000, 0, 0];
export const EX = (x: number, y: number, z: number): V3 => add(SET_EXP, [x, y, z]);
export const OF = (x: number, y: number, z: number): V3 => add(SET_OFF, [x, y, z]);

// ---------------- the wave ----------------
/** the hook clock (shots 1 and 16 share it, so the last frame of 16 is the first frame of 1): seconds */
export const hookTau = (id: number, f: number) => (id === 16 ? (f - TOTAL) / FPS : f / FPS);
export const BURST = 325;
/** x of the wave front (it travels toward -x) per shot, or null when there is no wave */
export const waveX = (id: number, f: number): number | null => {
  if (id === 1 || id === 16) return -1 - 2.0 * hookTau(id, f);
  if (id === 5) return f < BURST ? null : TANK.x - TANK.R - 2 - 9.5 * (f - BURST) / FPS * (1 - 0.18 * clamp01((f - BURST) / 140));
  return null;
};
/** how far the wave has grown (0 just out of the tank .. 1 full height) */
export const waveGrow = (id: number, f: number) => (id === 5 ? 0.35 + 0.65 * easeOut((f - BURST) / 34) : 1);
/** the flood sheet level behind the wave / after it */
export const floodY = (id: number) => (id === 1 || id === 16 || id === 5 ? 1.7 : id === 8 ? 0.55 : id === 12 ? 0.75 : -9);
/** the two runners ahead of the wave in the hook (x, same clock as the wave: always ~5 m ahead of it) */
export const runnerX = (id: number, f: number, k: number) => -7.4 - 1.5 * hookTau(id, f) - k * 1.3;
export const RUNNER_Z = [2.0, 0.6];

// ---------------- story places ----------------
export const RESIDENT: V3 = [32, 0, 2.6];           // shot 3: the man who looks up at the tank
export const RESCUER = (f: number): V3 => [8 - 0.12 * Math.min(f - 666, 24) / FPS, 0.55 - 0.42, 1.3];
export const CAP: V3 = [7.05, 0.565, 2.15];
export const KID: V3 = [TANK.x - TANK.R - 1.15, 0, TANK.z + 0.9];
export const MANAGER: V3 = [49.6, 0, 1.0];
export const LADDER = { x: TANK.x - TANK.R - 0.15, z: TANK.z + 3.4, top: 6.6 };
export const PAINTER: V3 = [LADDER.x - 0.75, 2.55, LADDER.z];
export const DOORSTEP: V3 = [33.7, 0, 4.7];
/** paint wipe: angle (radians around the tank, 0 = +z) of the brown edge, grows on "Paint it brown" */
export const WIPE_FROM = -Math.PI / 2 - 0.9;
export const wipeAt = (f: number) => WIPE_FROM + (0.9 + 0.235) * (0.15 + 0.85 * smooth((f - 905) / 60)) + 0.04 * clamp01((f - 965) / 30);
/** the balance scale tips on "heavier" */
export const scaleTilt = (f: number) => (14 * Math.PI / 180) * (0.08 * Math.sin(f * 0.25) * (1 - clamp01((f - 500) / 10)) * clamp01((f - 470) / 10) + easeOut((f - 505) / 26) * 1.05 - 0.05 * smooth((f - 531) / 14));
/** thermometer level and blob flow in shot 7 */
export const thermoLevel = (f: number) => 0.72 - 0.58 * smooth((f - 584) / 50);
export const blobFlow = (f: number) => 1 - smooth((f - 600) / 44);
/** the stamp: height above the plan (m) and the seal (0..1) */
export const STAMP_AT = 1295;
export const stampY = (f: number) => (f < STAMP_AT ? 0.02 + 0.32 * (1 - easeOut((f - 1250) / 45)) ** 1.5 * (f < 1250 ? 1 : 1) : f < STAMP_AT + 6 ? 0.02 : 0.02 + 0.3 * easeOut((f - STAMP_AT - 6) / 20));
export const sealAt = (f: number) => (f < STAMP_AT ? 0 : clamp01((f - STAMP_AT) / 4));

// ---------------- shots ----------------
export type Light = "day" | "golden" | "dusk" | "space";
export type Scene = "street" | "explainer" | "office";
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

// ---- framings ----
// 1 HOOK: low in the street, the wave fills the far end and rolls at us; slow push. 16 ends exactly on this frame.
export const P1: V3 = [-14, 1.1, 3.0], L1: V3 = [8, 4.3, -2.6];
const S1a = (f: number) => dolly(P1, L1, pushK(f, 0, 0.0012), { fov: 56 });
// 1b the two runners close, the wave right behind them (the camera backs away with them)
const S1b = (f: number): Shot => { const x = runnerX(1, f, 0); return { pos: [x - 6.2, 1.25, 0.9], look: [x + 3.5, 2.6, -0.3], fov: 48 }; };
// 2 the calm street at noon, January 1919: eye level down the street, the brown tank at the end, the El overhead
const S2a = (f: number) => dolly([-15, 1.6, 3.6], [40, 7.5, -3.5], pushK(f, 130, 0.0011), { fov: 46 });
// 3 low angle on the resident looking up; the tank wall fills the background
const S3a = (f: number) => dolly(add(RESIDENT, [-3.6, 0.55, 1.6]), add(RESIDENT, [2.0, 2.3, -1.6]), pushK(f, 200, 0.0012), { fov: 46 });
// 4 the tank from below (dolly in): riveted courses, strain
const S4a = (f: number) => dolly([47.5, 0.9, 3.5], [TANK.x - TANK.R, 8.5, TANK.z + 1], 1 - 0.3 * glide((f - 286) / 39), { fov: 50 });
// 5 tracking ahead of the wave down the street (the camera backs away as fast as it comes)
const S5a = (f: number): Shot => {
  const x = waveX(5, Math.max(f, BURST)) ?? 0, u = glide((f - BURST) / 30);
  const w = x - 13 - 2 * u;
  return { pos: [w, 1.0 + 1.2 * (1 - u), 4.4], look: [x + 3, 4.0 - 0.6 * (1 - u), -2.0], fov: 54 };
};
// 6 explainer: the balance scale, close, slow push
const S6a = (f: number) => dolly(EX(0, 1.0, 3.9), EX(0, 1.2, 0), pushK(f, 464, 0.0012), { fov: 40 });
// 7 explainer, colder: thermometer + blob, slow pull out
const S7a = (f: number) => dolly(EX(0, 0.98, 2.9), EX(0, 1.15, -0.4), 1 + 0.1 * glide((f - 574) / 92), { fov: 42 });
// 8 high and quiet over the flooded street at dusk: the rescuer wading, the cap on the syrup in the foreground
const S8a = (f: number) => dolly([RESCUER(666)[0] - 3.2, 3.1, 4.6], [RESCUER(666)[0] + 0.2, 0.75, 1.3], pushK(f, 666, 0.0012), { fov: 46 });
// 9 the clean grey tank (1915), push in from the yard
const S9a = (f: number) => dolly([30, 2.2, 3.5], [TANK.x - 4, 8, TANK.z], 1 - 0.14 * glide((f - 743) / 60), { fov: 44 });
// 10 the kid with the can at the base of the leaking tank, close
const S10a = (f: number) => dolly(add(KID, [-3.1, 1.15, 1.9]), add(KID, [0.35, 1.05, -0.2]), pushK(f, 794, 0.0014), { fov: 42 });
// 11 low on the company man (top hat), then a wider low view up the wall: the painter on the ladder, brown covering the streaks
const S11a = (f: number) => dolly(add(MANAGER, [-2.2, 0.55, 3.0]), add(MANAGER, [0.5, 1.7, -0.6]), pushK(f, 863, 0.0014), { fov: 44 });
const S11b = (f: number): Shot => {
  const u = glide((f - 905) / 89);
  return { pos: lerp3([49.2, 1.6, 4.4], [48.4, 2.4, 5.2], u), look: lerp3([TANK.x - TANK.R, 3.3, TANK.z + 2.4], [TANK.x - TANK.R, 3.6, TANK.z + 2.0], u), fov: 48 };
};
// 12 aerial descent over the flooded block in low winter sun: the torn tank by the harbour
const S12a = (f: number): Shot => {
  const u = glide((f - 994) / 153);
  return { pos: lerp3([16, 66, 34], [22, 52, 28], u), look: lerp3([54, 0, -6], [52, 1, -6], u), fov: 50 };
};
// 13 the hearing room (wide, slow push), then the drafting desk close: the stamp lands on "sign"
const S13a = (f: number) => dolly(OF(0, 2.7, 6.0), OF(0, 1.15, -0.6), pushK(f, 1147, 0.0012), { fov: 48 });
const S13b = (f: number) => dolly(OF(5.35, 1.75, 1.55), OF(5.45, 1.0, 0.42), pushK(f, 1238, 0.0010), { fov: 42 });
// 14 today: the engineer at the same desk, low and close
const S14a = (f: number) => dolly(OF(4.6, 1.65, 3.0), OF(5.7, 1.3, -0.6), pushK(f, 1340, 0.0016), { fov: 44 });
// 15 the doorstep at golden hour: the resident in profile at frame left, the tank over the roofs of the yard
const S15a = (f: number) => dolly([29.5, 1.5, 7.5], [55, 5.2, -6], pushK(f, 1379, 0.0004), { fov: 52 });
// 16 LOOP: back on the hook, pulling back to land exactly on the first frame of shot 1
const S16a = (f: number) => dolly(P1, L1, 0.9 + 0.1 * glide((f - 1449) / (TOTAL - 1 - 1449)), { fov: 56 });

const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S1b, S2a, S3a, S4a, S5a, S6a, S7a, S8a, S9a, S10a, S11a, S11b, S12a, S13a, S13b, S14a, S15a, S16a };
// ---- camera director: subjects and obstacles (QA projects these) ----
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  wave: { at: (f: number) => { const id = shotAt(f).id; return [(waveX(id, f) ?? 0) - 0.5, 3.5, 0]; }, height: 7 },
  tank: { at: () => [TANK.x, 7.5, TANK.z], height: 15 },
  resident: { at: () => eye(RESIDENT, 1.0), height: 1.7 },
  runners: { at: (f: number) => { const id = shotAt(f).id; return [runnerX(id, f, 0.5), 1.0, 0]; }, height: 1.7 },
  scale: { at: () => EX(0, 0.9, 0), height: 1.0 },
  thermo: { at: () => EX(0.1, 1.1, -0.6), height: 1.2 },
  rescuer: { at: (f: number) => eye(RESCUER(f), 0.8), height: 1.4 },
  kid: { at: () => eye(KID, 0.7), height: 1.2 },
  painter: { at: () => eye(PAINTER, 1.0), height: 1.7 },
  manager: { at: () => eye(MANAGER, 1.0), height: 1.8 },
  northend: { at: () => [30, 4, -4], height: 20 },
  desk: { at: () => OF(0, 1.2, -1.2), height: 2 },
  stamp: { at: () => OF(5.0, 0.95, 0.15), height: 0.3 },
  engineer: { at: () => OF(5.0, 1.0, 0.0), height: 1.7 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [];
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset, scenes: ["street", "explainer", "office"] });
const CAMS: Record<number, Key[]> = Object.fromEntries(SB.shots.map((x) => [x.id, x.camera.map((k) => ({ f: k.f, ...(k.dur ? { dur: k.dur } : {}), ...(k.cut ? { cut: true } : {}), s: CAM_FN[k.fn!] }))]));

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
/** a small strain tremor while the tank groans (shot 4) */
const tremor = (f: number) => (f >= 292 && f < 325 ? 0.25 * Math.sin(f * 2.7) * clamp01((f - 292) / 20) : 0);
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f)) + (id === 4 ? tremor(f) : 0);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** depth of field: off in this film (house rule: lens blur stays off); kept for the QA tools' interface */
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });
