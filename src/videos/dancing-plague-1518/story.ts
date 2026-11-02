// Timeline of "The Dancing Plague of 1518" (English, Inkfall): shots timed to the final voice
// (stories/dancing-plague-1518/en/words.json, frame = round(start * 30)), house camera grammar (slow push-ins, smootherstep
// glides, cuts for big reframes, 7-frame kicks). Every set is built at the origin; only the current shot's set is posed
// (world.ts), so the sets never see each other. World units are metres. Everything here is a pure function of the frame.
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

// ---------------- places (metres) ----------------
/** the square (Horse Market): back row of houses at z = BACK_Z, side rows at x = +-SIDE_X; the wooden stage; the town hall */
export const BACK_Z = -16, SIDE_X = 15.5;
export const STAGE = { x: 0, z: -9, w: 7.2, top: 1.3, depth: 2.6 };
export const TOWNHALL_X = -10.5;
export const DOCTOR: V3 = [-10.2, 0, -12.2];
export const COUNCIL1: V3 = [-11.7, 0, -12.9];
export const COUNCIL2: V3 = [-8.7, 0, -13.1];
/** hero dancers of the hook / the loop (shot 1 and 19 share their clock) */
export const HERO1: V3 = [-0.75, 0, 5.6];
export const HERO2: V3 = [0.45, 0, 4.85];
export const HERO3: V3 = [-2.6, 0, 3.7];
/** close faces (shot 3) */
export const FACE1: V3 = [-3.2, 0, 1.0];
export const FACE2: V3 = [-2.4, 0, 0.1];
/** the collapse (shot 10) */
export const FALLEN: V3 = [3.6, 0, 2.4];
export const FRIEND1: V3 = [4.3, 0, 1.95];
export const FRIEND2: V3 = [2.85, 0, 1.9];
/** shot 13: the exhausted dancer */
export const TIRED: V3 = [-4.6, 0, -1.2];
/** shot 18: the bystander at the edge of the crowd */
export const BYSTANDER: V3 = [6.2, 0, 7.0];
/** shot 17: the row of faces the ripple runs along */
export const ROW: V3[] = [[-4.4, 0, 2.2], [-3.1, 0, 1.75], [-1.8, 0, 1.4], [-0.5, 0, 1.05], [0.8, 0, 0.7], [2.1, 0, 0.35], [3.4, 0, 0.0]];
/** the lane (shots 4-5): street along x, houses at z = +-LANE_Z */
export const LANE_Z = 4.2;
export const WOMAN: V3 = [0, 0, 0];
export const HUSBAND: V3 = [-1.55, 0, -3.3];
/** the archive desk (shots 11-12): desk top height and the two books on lecterns */
export const DESK_Y = 0.86;
export const BOOK1: V3 = [-0.78, DESK_Y, -0.05];
export const BOOK2: V3 = [0.78, DESK_Y, -0.05];
export const SCRIBE: V3 = [0, 0, -0.75];
/** the famine field (shot 14) */
export const MOTHER: V3 = [0.45, 0, 0];
/** the chapel (shot 15): statue of St Vitus on a plinth */
export const PLINTH_H = 1.25;
export const STATUE: V3 = [0, PLINTH_H, -3.2];

// ---------------- clocks ----------------
/** the hook clock: shots 1 and 19 share it, so the last frame of 19 is the first frame of 1 (seconds) */
export const hookT = (id: number, f: number) => (id === 19 ? (f - TOTAL) / FPS : f / FPS);
/** the dance-spreading ripple: origin, start frame, speed (m/s) per shot; null = everyone already dancing */
export type Ripple = { o: V3; f0: number; v: number };
export const RIPPLE: Record<number, Ripple> = {
  16: { o: [0.4, 0, 0.6], f0: 1214, v: 2.6 },
  17: { o: [-5.8, 0, 2.6], f0: 1306, v: 2.2 },
  19: { o: HERO1, f0: 1436, v: 9 },
};
/** radius of the ripple at frame f (m), or Infinity when the shot has none */
export const rippleR = (id: number, f: number) => { const r = RIPPLE[id]; return r ? Math.max(0, (f - r.f0) / FPS) * r.v : Infinity; };
/** frame at which a person at p starts dancing in shot id (-Infinity = always dancing) */
export const danceStart = (id: number, p: V3) => {
  const r = RIPPLE[id];
  if (!r) return -Infinity;
  return r.f0 + (Math.hypot(p[0] - r.o[0], p[2] - r.o[2]) / r.v) * FPS;
};
/** the lane in shot 5: joiner k walks in from a side and starts dancing at JOIN_F(k) */
export const JOINERS = 22;
export const joinF = (k: number) => 395 + k * 2.6;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "dusk";
export type Scene = "square" | "lane" | "archive" | "field" | "chapel";
export type ShotDef = { id: number; a: number; b: number; light: Light; scene: Scene; fog?: [number, number] };
export const SHOTS: ShotDef[] = SB.shots.map((x) => ({ id: x.id, a: x.a, b: x.b, light: x.light as unknown as Light, scene: x.scene as unknown as Scene, ...(x.fog ? { fog: x.fog } : {}) }));
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
// 1 HOOK: low inside the crowd, the hero dancers close, the stage + houses + spire behind; slow push. 19 lands exactly here.
export const P1: V3 = [0.35, 1.45, 10.4], L1: V3 = [-0.1, 2.35, -6.0];
export const PC: V3 = [HERO1[0] + 0.35, 1.3, HERO1[2] + 2.75], LC: V3 = [HERO1[0] - 0.05, 1.42, HERO1[2]];
const S1a = (f: number) => dolly(PC, LC, pushK(f, 0, 0.0012), { fov: 48 });
// 1c the stamping feet on the cobbles, low and close
const S1c = (f: number): Shot => { const u = (f - 46) / 46; return { pos: [HERO2[0] + 0.25 - 0.35 * u, 0.55, HERO2[2] + 1.15], look: [HERO2[0] - 0.05, 0.3, HERO2[2] - 0.1], fov: 50 }; };
// 1d the whole square dancing, the stage and the spire behind
const S1d = (f: number) => dolly(P1, L1, pushK(f, 92, 0.0011), { fov: 52 });
// 1b two dancers close, low, a slow arc
// 2 high and wide over the square, the cathedral spire beyond the roofs
const S2a = (f: number): Shot => { const u = glide((f - 137) / 79); return { pos: lerp3([10, 9.5, 19], [6.5, 8.2, 16.5], u), look: [0, 6.5, -24], fov: 52 }; };
// 3 two faces, close, slow push
const S3a = (f: number) => dolly(add(FACE1, [0.4, 1.7, 4.0]), add(FACE1, [0.4, 1.5, -0.4]), pushK(f, 216, 0.0016), { fov: 40 });
// 4 the lane: the lone dancer, husband in the doorway behind; slow push
const S4a = (f: number) => dolly([-0.45, 1.35, 4.4], [-0.25, 1.15, -1.2], pushK(f, 275, 0.0011), { fov: 46 });
// 4b her feet: "for days"
const S4b = (f: number) => dolly([WOMAN[0] + 0.25, 0.55, WOMAN[2] + 1.2], [WOMAN[0], 0.32, WOMAN[2] - 0.1], pushK(f, 335, 0.001), { fov: 50 });
// 5 the lane wider and higher: people stream in from both ends
const S5a = (f: number): Shot => { const u = glide((f - 391) / 69); return { pos: lerp3([0, 1.6, 6.0], [0, 2.1, 7.6], u), look: [0, 1.1, -0.8], fov: 50 }; };
// 6 the physician, medium close; councillors beside him
const S6a = (f: number) => dolly(add(DOCTOR, [-0.15, 1.62, 3.6]), add(DOCTOR, [0.05, 1.5, 0]), pushK(f, 460, 0.0016), { fov: 40 });
// 7 low angle on the physician, arms up; dancers at the frame edges
const S7a = (f: number) => dolly(add(DOCTOR, [0.7, 0.75, 4.6]), add(DOCTOR, [0, 1.75, 0]), pushK(f, 508, 0.002), { fov: 48 });
// 8 the stage: a slow lateral glide past the musicians
const S8a = (f: number): Shot => { const u = glide((f - 546) / 50); return { pos: lerp3([-1.4, 2.5, -4.6], [0.9, 2.6, -4.9], u), look: lerp3([-0.3, 2.45, -9.2], [0.3, 2.45, -9.2], u), fov: 48 }; };
// 8b the drummer playing hard, close
const S8b = (f: number) => dolly([-0.7, 2.7, -7.95], [-1.1, 2.4, -9.3], pushK(f, 596, 0.0015), { fov: 44 });
// 9 crane up over the bigger crowd
// 9 over the shoulder of the authorities: a councillor in profile at the frame edge, the crowd beyond
const S9a = (f: number): Shot => { const u = glide((f - 634) / 60); return { pos: lerp3([-10.4, 1.8, -15.0], [-10.2, 2.0, -14.8], u), look: lerp3([-2, 1.55, -2], [-1.4, 1.5, -1.4], u), fov: 48 }; };
// 10 the collapse, close and low
const S10a = (f: number) => dolly(add(FALLEN, [0.1, 1.15, 3.9]), add(FALLEN, [0.1, 0.95, 0]), pushK(f, 694, 0.0016), { fov: 44 });
// 11 the chronicle book, push in; 12 glide to the city records
const S11a = (f: number) => dolly(add(BOOK1, [0.05, 0.72, 2.6]), add(BOOK1, [0, 0.38, 0]), pushK(f, 758, 0.0016), { fov: 40 });
const S12a = (f: number): Shot => { const u = glide((f - 847) / 32); return { pos: lerp3(add(BOOK1, [0.5, 0.72, 2.6]), add(BOOK2, [0, 0.7, 2.3 - 0.15 * clamp01((f - 879) / 45)]), u), look: lerp3(add(BOOK1, [0.5, 0.38, 0]), add(BOOK2, [0, 0.38, 0]), u), fov: 40 }; };
// 13 the exhausted dancer at dusk
const S13a = (f: number) => dolly(add(TIRED, [0.25, 1.72, 3.2]), add(TIRED, [0.1, 1.62, 0]), pushK(f, 924, 0.0028), { fov: 38 });
// 13b his worn-out feet, barely lifting
const S13b = (f: number) => dolly(add(TIRED, [0.25, 0.55, 1.15]), add(TIRED, [0, 0.3, -0.1]), pushK(f, 952, 0.001), { fov: 50 });
// 14 the famine field: slow push on the family, the city far behind
const S14a = (f: number) => dolly([1.0, 1.45, 4.6], [0.25, 1.3, -1.0], pushK(f, 974, 0.0014), { fov: 46 });
// 15 chapel: the kneelers before the statue; cut close and low on the statue on "curse"
const S15a = (f: number) => dolly([0.2, 1.25, 3.7], [0, 1.85, -2.6], pushK(f, 1072, 0.0012), { fov: 50 });
const S15b = (f: number) => dolly([0.2, 1.6, 1.1], [0, 2.55, -3.2], pushK(f, 1144, 0.0015), { fov: 40 });
// 16 high angle: the ripple spreads through a still crowd
const S16a = (f: number): Shot => { const u = glide((f - 1202) / 110); return { pos: lerp3([0.4, 12.5, 12.5], [0.4, 9.5, 11], u), look: [0.4, 0, -0.4], fov: 50 }; };
// 17 low along the row of faces as it passes
const S17a = (f: number): Shot => { const u = glide((f - 1312) / 66); return { pos: lerp3([-2.6, 1.6, 6.4], [0.6, 1.6, 5.6], u), look: lerp3([-2.0, 1.55, 1.6], [1.4, 1.55, 0.9], u), fov: 44 }; };
// 18 the bystander, close, looking at us
const S18a = (f: number) => dolly(add(BYSTANDER, [-0.3, 1.66, 3.0]), add(BYSTANDER, [0.05, 1.55, 0]), pushK(f, 1378, 0.002), { fov: 40 });
// 19 LOOP: one dancer close, then pull back to land exactly on the first frame of shot 1
const S19a = (f: number): Shot => {
  const u = glide((f - 1462) / 50);
  const near = dolly(add(HERO1, [0.25, 1.62, 2.3]), add(HERO1, [0.05, 1.55, 0]), 1, { fov: 42 });
  return { pos: lerp3(near.pos, P1, u), look: lerp3(near.look, L1, u), fov: 42 + (52 - 42) * u };
};
// 19b LOOP: cut back to the hook close-up on the hook clock, so the last frame is frame 0
const S19b = (f: number) => S1a(f - TOTAL);

const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S1c, S1d, S4b, S8b, S13b, S19b, S2a, S3a, S4a, S5a, S6a, S7a, S8a, S9a, S10a, S11a, S12a, S13a, S14a, S15a, S15b, S16a, S17a, S18a, S19a };

// ---- camera director: subjects and obstacles (QA projects these) ----
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  crowd: { at: () => [0, 1.0, -2], height: 2 },
  heroes: { at: () => eye(HERO1, 1.0), height: 1.75 },
  woman: { at: () => eye(WOMAN, 1.0), height: 1.7 },
  joiners: { at: () => [0, 1.0, -0.5], height: 1.8 },
  doctor: { at: () => eye(DOCTOR, 1.0), height: 1.8 },
  stage: { at: () => [STAGE.x, STAGE.top + 0.9, STAGE.z], height: 2 },
  collapse: { at: () => eye(FALLEN, 0.6), height: 1.4 },
  chronicle: { at: () => add(BOOK1, [0, 0.36, 0]), height: 0.5 },
  records: { at: () => add(BOOK2, [0, 0.36, 0]), height: 0.5 },
  family: { at: () => eye(MOTHER, 0.9), height: 1.7 },
  statue: { at: () => eye(STATUE, 0.9), height: 1.8 },
  ripple: { at: () => [0.4, 0.5, 0.6], height: 1 },
  row: { at: () => eye(ROW[3], 1.0), height: 1.75 },
  bystander: { at: () => eye(BYSTANDER, 1.0), height: 1.75 },
  feet: { at: () => [HERO2[0], 0.3, HERO2[2]], height: 0.6 },
  laneFeet: { at: () => [WOMAN[0], 0.3, WOMAN[2]], height: 0.6 },
  drummer: { at: () => [-1.1, 2.3, -9.3], height: 1.7 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [];
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset,
  scenes: ["square", "lane", "archive", "field", "chapel"], lights: ["day", "golden", "dusk"] });
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
/** a gentle hand-held sway in the crowd shots (frame-pure; zero on the loop frames so 19 -> 1 matches) */
const sway = (id: number, f: number): V3 => {
  if (id !== 1 && id !== 3 && id !== 13) return [0, 0, 0];
  const t = id === 1 ? f / FPS : T(f);
  return [0.03 * Math.sin(t * 1.7), 0.025 * Math.sin(t * 2.3), 0];
};
export const camAt = (id: number, f: number): Cam => {
  let c = run(CAMS[id], f);
  const s = sway(id, f);
  if (s[0] || s[1]) c = { ...c, pos: add(c.pos, s), look: add(c.look, s) };
  const a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** depth of field: off in this film (house rule: lens blur stays off); kept for the QA tools' interface */
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });
