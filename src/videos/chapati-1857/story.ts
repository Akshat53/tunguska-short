// Timeline of "1857 की रहस्यमयी रोटियाँ" (Hindi): shots timed to the final voice (stories/chapati-1857/hi/words.json,
// frame = round(start * 30)), house camera grammar (slow push-ins, smootherstep glides, cuts for big reframes, 7-frame kicks).
// Every set is built at the origin; only the current shot's set is posed (world.ts), so the sets never see each other.
// World units are metres. Everything here is a pure function of the frame number.
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

// ---------------- places (all metres) ----------------
/** village: the lane runs along x at z = 0; a branch lane crosses it along z at x = CROSS_X */
export const RUN_V = 2.2;
export const CROSS_X = 6;
/** the runner in shot 1 (and shot 18 ends exactly where shot 1 starts: the loop) */
export const runX1 = (f: number) => -6 + (RUN_V * f) / FPS;
export const runX18 = (f: number) => -6 + (RUN_V * (f - TOTAL)) / FPS;
export const runX2 = (f: number) => 7.5 + (RUN_V * (f - 130)) / FPS;
export const OFF1: V3 = [12.6, 0, -2.2];
export const OFF2: V3 = [14.2, 0, -2.9];
export const STRANGER: V3 = [-19.2, 0, -2.3];
export const CHOW4: V3 = [-17.85, 0, -2.6];
export const PEEPAL: V3 = [-21.5, 0, -8.5];
export const POINTER: V3 = [9.6, 0, -1.6];
export const POINTER2: V3 = [11.1, 0, -2.7];
export const CHULHA: V3 = [-3.4, 0, -4.4];
export const COOK: V3 = [-3.8, 0, -5.3];
export const CHOW11: V3 = [-2.45, 0, -4.95];
export const LONER: V3 = [CROSS_X, 0, 0.1];
export const CHOW17: V3 = [1.5, 0, 1.2];
/** shot 17 close-up: the hand-to-hand card, by the lamp post at x 0.6 */
export const HANDS: V3 = [1.2, 1.05, -0.9];
/** office (Mathura kutcheri): desk centred at the origin, top at y = DESK_Y */
export const DESK_Y = 0.8;
export const MAGI: V3 = [0.15, 0, -0.85];
export const TEARER: V3 = [0.25, 0, -0.8];
/** four rotis on the desk: positions (x, z on the desk top) and the frame each one appears */
export const ROTIS: { x: number; z: number; f: number }[] = [
  { x: -0.27, z: -0.02, f: 352 }, { x: 0.02, z: 0.1, f: 361 }, { x: 0.3, z: -0.04, f: 370 }, { x: 0.05, z: 0.32, f: 379 },
];
/** the plain of villages (shot 5): generation g of the chain lights at GEN_F[g] */
export const GEN_F = [576, 580, 597, 639];
/** the map: K metres per degree, centred near Kanpur */
export const MAP_K = 4;
export const mapXZ = (lon: number, lat: number): [number, number] => [(lon - 79) * MAP_K, -(lat - 25.5) * MAP_K];
export const LL = { mathura: [77.67, 27.49], delhi: [77.21, 28.65], meerut: [77.7, 28.98], agra: [78.0, 27.18], kanpur: [80.33, 26.45],
  lucknow: [80.95, 26.85], indore: [75.86, 22.72], allahabad: [81.85, 25.43], benares: [83.0, 25.32], patna: [85.14, 25.6], bareilly: [79.43, 28.37],
  gwalior: [78.18, 26.22], jhansi: [78.57, 25.45], saugor: [78.74, 23.84], jabalpur: [79.95, 23.18], farrukhabad: [79.58, 27.39] } as Record<string, [number, number]>;
export const INDORE_F = 1549;
/** palace: the hakim */
export const HAKIM: V3 = [0, 0, -0.6];
/** Meerut parade ground: ranks of sepoys around the origin facing +z; the rising on 'मेरठ' */
export const RISE_F = 1263;
/** archive */
export const HISTORIAN: V3 = [0.35, 0, -0.95];

// ---------------- shots ----------------
export type Light = "night" | "day" | "golden" | "dusk" | "map";
export type Scene = "village" | "plain" | "office" | "map" | "palace" | "cantonment" | "archive";
export type ShotDef = { id: number; a: number; b: number; light: Light; scene: Scene };
export const SHOTS: ShotDef[] = SB.shots.map((x) => ({ id: x.id, a: x.a, b: x.b, light: x.light as unknown as Light, scene: x.scene as unknown as Scene }));
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
  pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
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
const span = (f: number, a: number, b: number) => smooth((f - a) / (b - a));

// ---- framings ----
/** tracking profile on the runner: the hook, and the framing the loop lands on */
const track = (xr: number, k: number): Shot => ({ pos: [xr + 0.55, 1.42, 6.0 - 0.7 * k], look: [xr + 0.3, 1.12, 0], fov: 40 });
const S1a = (f: number) => track(runX1(f), span(f, 0, 130));
// 2 low angle on the two officers; the runner crosses the foreground
const S2a = (f: number): Shot => ({ pos: lerp3([13.5, 0.95, 4.7], [13.45, 1.0, 3.7], span(f, 130, 298)), look: [13.35, 1.72, -2.5], fov: 40 });
// 3 high angle on the desk: four rotis appear
const S3a = (f: number): Shot => ({ pos: lerp3([0, 2.75, 3.1], [0, 2.5, 2.5], span(f, 298, 415)), look: [0.05, 0.82, -0.3], fov: 42 });
// 4 over the stranger's shoulder onto the chowkidar under the peepal
const S4a = (f: number): Shot => ({ pos: lerp3([-20.1, 1.62, 1.55], [-20.0, 1.6, 1.05], span(f, 415, 576)), look: [-18.45, 1.38, -2.5], fov: 42 });
// 5 aerial crane over the plain of villages
const S5a = (f: number): Shot => { const u = glide((f - 576) / 92); return { pos: lerp3([0, 22, 40], [0, 300, 175], u), look: lerp3([0, 0, -30], [0, 0, -125], u), fov: 52 }; };
// 6 the map: north India, a slow pull out
const S6a = (f: number): Shot => { const u = span(f, 666, 801); return { pos: lerp3([0.5, 72, 30], [0.5, 78, 33], u), look: [0.5, 0, -1], fov: 52 }; };
// 7 eye level on the official tearing the roti
const S7a = (f: number): Shot => ({ pos: lerp3([0.15, 1.6, 2.7], [0.2, 1.58, 1.95], span(f, 801, 898)), look: [0.24, 1.32, -0.8], fov: 40 });
// 8 hard close on his face and the two halves
const S8a = (f: number): Shot => ({ pos: lerp3([0.25, 1.55, 0.75], [0.25, 1.56, 0.6], span(f, 898, 937)), look: [0.25, 1.48, -0.8], fov: 40 });
// 9 slow orbit on the hakim in the palace room
const S9a = (f: number): Shot => {
  const a = -0.38 + 0.62 * glide((f - 937) / 127), c: V3 = [HAKIM[0], 1.32, HAKIM[2]];
  return { pos: [c[0] + Math.sin(a) * 3.3, 1.55, c[2] + Math.cos(a) * 3.3], look: c, fov: 40 };
};
// 10 low angle on the officer pointing down the lane
const S10a = (f: number): Shot => ({ pos: lerp3([8.5, 0.85, 3.7], [8.75, 0.95, 2.9], span(f, 1064, 1149)), look: [10.1, 1.62, -1.8], fov: 40 });
// 11 push in on the chulha: rotis on the tava
const S11a = (f: number): Shot => ({ pos: lerp3([-3.1, 1.5, -0.6], [-3.15, 1.4, -1.25], span(f, 1149, 1226)), look: [-3.15, 0.95, -4.9], fov: 48 });
// 12 Meerut: wide on the parade ground -> cut on 'मेरठ' to low on the rising ranks -> crane up as it spreads
const S12a = (f: number): Shot => ({ pos: lerp3([-1.2, 3.0, 14.5], [-1.0, 2.8, 12.5], span(f, 1226, 1263)), look: [0, 2.2, -8], fov: 42 });
const S12b = (f: number): Shot => ({ pos: lerp3([0.6, 1.0, 6.0], [0.5, 1.05, 5.2], span(f, 1263, 1333)), look: [0, 1.25, -4], fov: 42 });
const S12c = (f: number): Shot => ({ pos: lerp3([0.4, 3.0, 9.0], [-1, 8.5, 15], span(f, 1333, 1399)), look: [-2, 4.0, -14], fov: 44 });
// 13 the desk again at lamp-light
const S13a = (f: number): Shot => ({ pos: lerp3([0.35, 1.95, 1.95], [0.25, 1.7, 1.45], span(f, 1399, 1460)), look: [0.2, 0.92, -0.15], fov: 42 });
// 14 the historian among the papers
const S14a = (f: number): Shot => ({ pos: lerp3([-0.75, 1.72, 2.6], [-0.5, 1.66, 1.95], span(f, 1460, 1549)), look: [0.2, 1.3, -0.8], fov: 40 });
// 15 map orbit around Indore
const S15a = (f: number): Shot => {
  const a = -0.12 + 0.24 * glide((f - 1549) / 92), cx = -1, cz = 5;
  return { pos: [cx + Math.sin(a) * 32, 74, cz + Math.cos(a) * 32], look: [cx, 0, cz], fov: 52 };
};
// 16 the lone chowkidar at the crossroads, high and pulling away
const S16a = (f: number): Shot => { const u = span(f, 1641, 1748); return { pos: lerp3([6.6, 3.2, 6.2], [7.6, 13, 19], u), look: lerp3([6, 0.95, 0], [6, 0.2, -2.5], u), fov: 40 }; };
// 17 close on the chowkidar holding up the roti
const S17a = (f: number): Shot => ({ pos: lerp3([1.25, 0.86, 1.0], [1.25, 0.9, 0.65], span(f, 1748, 1844)), look: [1.25, 1.12, -0.9], fov: 40 });
// 18 LOOP: from high over the lane down onto the tracking profile that shot 1 starts with (exactly at the last frame)
const S18a = (f: number): Shot => {
  const u = glide((f - 1844) / (TOTAL - 1844 - 6)), xr = runX18(f), tr = track(xr, 0);
  return { pos: lerp3([-27, 15, 21], tr.pos, u), look: lerp3([-21, 0.4, -3], tr.look, u), fov: 40 };
};

const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S2a, S3a, S4a, S5a, S6a, S7a, S8a, S9a, S10a, S11a, S12a, S12b, S12c, S13a, S14a, S15a, S16a, S17a, S18a };

// ---- camera director: subjects and obstacles (QA projects these) ----
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const runnerAt = (f: number): V3 => f >= 1844 ? [runX18(f), 1.0, 0] : f >= 130 && f < 298 ? [runX2(f), 1.0, 0.4] : [runX1(f), 1.0, 0];
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  runner: { at: (f: number) => runnerAt(f), height: 1.75 },
  officers: { at: () => eye(OFF1, 1.0), height: 1.8 },
  desk: { at: () => [0, DESK_Y, 0.1], height: 0.3 },
  handoff: { at: () => eye(CHOW4, 1.0), height: 1.75 },
  villages: { at: () => [0, 0, -60], height: 4 },
  map: { at: () => [5, 0, -2], height: 2 },
  tearer: { at: () => eye(TEARER, 1.0), height: 1.8 },
  hakim: { at: () => eye(HAKIM, 1.0), height: 1.75 },
  pointer: { at: () => eye(POINTER, 1.0), height: 1.8 },
  chulha: { at: () => [CHULHA[0], 0.35, CHULHA[2]], height: 0.6 },
  sepoys: { at: () => [0, 1.0, -4], height: 1.8 },
  historian: { at: () => eye(HISTORIAN, 1.0), height: 1.75 },
  indore: { at: () => { const [x, z] = mapXZ(...LL.indore); return [x, 0.5, z]; }, height: 2 },
  loner: { at: () => eye(LONER, 1.0), height: 1.75 },
  roti: { at: () => HANDS, height: 0.4 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [];
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset,
  scenes: ["village", "plain", "office", "map", "palace", "cantonment", "archive"], lights: ["night", "day", "golden", "dusk", "map"] });
const CAMS: Record<number, Key[]> = Object.fromEntries(SB.shots.map((x) => [x.id, x.camera.map((k) => (
  { f: k.f, ...(k.dur ? { dur: k.dur } : {}), ...(k.cut ? { cut: true } : {}), s: CAM_FN[k.fn!] }))]));

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
