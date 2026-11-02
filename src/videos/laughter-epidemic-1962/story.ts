// Timeline of "The Tanganyika Laughter Epidemic (1962)" (English, Inkfall): shots timed to the final voice
// (stories/laughter-epidemic-1962/en/words.json, frame = round(start * 30)), house camera grammar (slow push-ins, smootherstep
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
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places (metres) ----------------
/** classroom: girls face +z (the camera side). Back wall at z = CLASS_BACK, desks in COLS x ROWS, girls at desk x +- GIRL_DX,
 *  sunk SEAT_Y (seated behind the desk front card) */
export const CLASS_BACK = -5.0, CLASS_SIDE = 5.4;
export const COLS = [-2.5, 0, 2.5], ROWS = [-3.4, -2.0, -0.6, 0.8, 2.2], GIRL_DX = 0.3, SEAT_Y = -0.2, DESK_W = 1.25, DESK_DZ = 0.36;
/** the hook pair (front desk, centre column) and the panicking teacher in the right aisle */
export const HOOK_A: V3 = [-GIRL_DX, SEAT_Y, 2.2], HOOK_B: V3 = [GIRL_DX, SEAT_Y, 2.2];
export const TEACH_HOOK: V3 = [0.95, 0, -0.45];
/** shot 5: the teacher in front of the class (profile) and the three who start */
export const TEACH_FRONT: V3 = [-1.3, 0, 3.1];
export const THREE: V3[] = [[-GIRL_DX, SEAT_Y, -0.6], [GIRL_DX, SEAT_Y, -0.6], [GIRL_DX, SEAT_Y, -2.0]];
/** shot 17: the studying girl; shot 21: the hold-out */
export const STUDIER: V3 = [2.5 - GIRL_DX, SEAT_Y, 0.8];
export const HOLD: V3 = [-2.5 + GIRL_DX, SEAT_Y, 0.8];
/** the front (blackboard) set: board wall at z = BOARD_Z facing +z; teacher at the board; girls seen from behind */
export const BOARD_Z = -3.2;
export const TEACH_BOARD: V3 = [-0.9, 0, -2.4];
/** the school outside: the block at z = SCHOOL_Z (doors at x = DOOR_X), the yard in front, the road at z = ROAD_Z */
export const SCHOOL_Z = -8, SCHOOL_W = 16, DOOR_X = [-2.53, 2.67];
export const MISTRESS_AT: V3 = [-2.4, 0, -7.2];
export const ROAD_Z = 3.2;
export const LORRY_W = 5.2;
export const LORRY0: V3 = [3.0, 0, ROAD_Z];
/** lorry x at frame f (shot 10 pulls away; parked otherwise) */
export const lorryX = (id: number, f: number) => (id === 10 ? LORRY0[0] + 0.9 * Math.max(0, (f - 688) / FPS) ** 2 * 1.4 + 0.6 * Math.max(0, (f - 688) / FPS) : LORRY0[0]);
export const OFFICIAL_AT: V3 = [-1.6, 0, 2.2], OFFICIAL2_AT: V3 = [-2.5, 0, 1.6];
/** shot 6 ripple origin in the yard */
export const YARD_O: V3 = [0.3, 0, -1.5];
/** the dormitory: wall at z = DORM_BACK, beds along it at BEDS (x), the fainting girl + friends, the girl on her bed */
export const DORM_BACK = -3.0, BEDS = [-3.4, -1.1, 1.2, 3.5], BED_Z = -2.3;
export const FAINT: V3 = [0.05, 0, -0.4], FRIEND_L: V3 = [-0.62, 0, -0.55], FRIEND_R: V3 = [0.68, 0, -0.5];
export const BEDGIRL: V3 = [1.2, -0.42, -1.75];
export const LAMP_T: V3 = [2.05, 0, -1.4];
/** the clinic: wall at z = -3.2, the lab table front at z = TABLE_Z, the doctors behind it */
export const TABLE_Z = -1.2;
export const DOC1_AT: V3 = [-0.45, 0, -1.75], DOC2_AT: V3 = [0.55, 0, -1.85];
export const PATIENT: V3 = [-1.45, -0.42, -2.55], PMOTHER: V3 = [-2.05, 0, -2.75];
/** the village: home courtyard at the origin */
export const HOME: V3 = [0, 0, 0], MOM: V3 = [0.62, 0, -0.18], DAD: V3 = [-0.95, 0, -1.9];
export const FLAG_AT: V3 = [0.6, 0, -4.2];
/** the map: a flat card MAP_W wide (design 2000 x 2400, north = -z) lying at y = MAP_Y */
export const MAP_W = 8, MAP_H = 9.6, MAP_Y = 0.02;
export const mapXZ = (d: [number, number]): V3 => [(d[0] / 2000 - 0.5) * MAP_W, MAP_Y, (d[1] / 2400 - 0.5) * MAP_H];
/** the calendar close-up */
export const CAL_AT: V3 = [0, 1.55, -2.9];

// ---------------- clocks ----------------
/** the hook clock: shots 1 and 21 (after its loop cut) share it, so the last frame of 21 is the frame before frame 0 */
export const LOOP_CUT = 1545;
export const isLoop = (id: number, f: number) => id === 21 && f >= LOOP_CUT;
export const hookT = (id: number, f: number) => (isLoop(id, f) ? (f - TOTAL) / FPS : f / FPS);
/** the spreading fit: origin, start frame, speed (m/s) per shot */
export type Ripple = { o: V3; f0: number; v: number };
export const RIPPLE: Record<number, Ripple> = {
  6: { o: YARD_O, f0: 380, v: 3.4 },
  14: { o: HOME, f0: 966, v: 1.6 },
  21: { o: HOLD, f0: 1452, v: 2.2 },
};
/** frame at which a person at p catches the fit in shot id (-Infinity = already in it) */
export const fitStart = (id: number, p: V3) => {
  const r = RIPPLE[id];
  if (!r) return -Infinity;
  return r.f0 + (Math.hypot(p[0] - r.o[0], p[2] - r.o[2]) / r.v) * FPS;
};
export const rippleR = (id: number, f: number) => { const r = RIPPLE[id]; return r ? Math.max(0, (f - r.f0) / FPS) * r.v : Infinity; };

// ---------------- shots ----------------
export type Light = "day" | "golden" | "dusk";
export type Scene = "classroom" | "school" | "dorm" | "map" | "clinic" | "village" | "front" | "calendar";
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
/** the one on-screen debate pill (not a caption): frames [a, b) */
export const PILL = { a: 884, b: 952, text: "Poison… or the mind? 👇" };

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
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];

// ---- framings ----
// 1 HOOK: the laughing pair close at their desk, the panicking teacher behind right, the class in fits; slow push. 21 lands here.
export const P1: V3 = [0.04, 1.12, 5.0], L1: V3 = [0.08, 1.02, 0.2];
const S1a = (f: number) => dolly(P1, L1, pushK(f, -60, 0.0011), { fov: 46 });
// 2 low angle at the school doors: the headmistress sends the girls out with their suitcases
const S2a = (f: number) => dolly([-1.2, 0.45, -1.2], [-2.3, 2.05, -7.6], pushK(f, 87, 0.0018), { fov: 52 });
// 3 extreme close-up: one girl's face
const S3a = (f: number) => dolly(add(HOOK_A, [0.04, 1.12, 1.45]), add(HOOK_A, [0, 1.06, 0]), pushK(f, 159, 0.0016), { fov: 36 });
// 4 the establishing wide: a slow crane down over the banana trees to the school, the hills and the lake beyond
const S4a = (f: number): Shot => { const u = glide((f - 192) / 80); return { pos: lerp3([7.5, 7.8, 16], [5.5, 3.6, 12.5], u), look: lerp3([0, 3.2, -20], [0, 2.6, -12], u), fov: 50 }; };
// 5 over the teacher's shoulder (profile at the left edge) on the class; 5b closer on the three
const S5a = (f: number) => dolly([-2.3, 1.6, 6.6], [0.5, 1.0, -1.0], pushK(f, 272, 0.0012), { fov: 46 });
const S5b = (f: number) => dolly([0.15, 1.45, 1.75], [0.05, 0.98, -1.3], pushK(f, 340, 0.0016), { fov: 46 });
// 6 high wide over the yard, the fit rippling from girl to girl
const S6a = (f: number): Shot => { const u = glide((f - 377) / 63); return { pos: lerp3([2.5, 9.5, 10.5], [1.8, 8.2, 9.0], u), look: [0.3, 0, -2.0], fov: 52 }; };
// 7 the fainting girl held up by two friends, medium
const S7a = (f: number) => dolly(add(FAINT, [0.15, 1.35, 3.6]), add(FAINT, [0.05, 1.05, 0]), pushK(f, 440, 0.0016), { fov: 44 });
// 8 the girl on her bed, the teacher with the lamp, the clock; 8b close on her face as the fit comes back
const S8a = (f: number) => dolly([1.75, 1.45, 2.4], [1.45, 1.05, -2.0], pushK(f, 497, 0.0012), { fov: 46 });
const S8b = (f: number) => dolly(add(BEDGIRL, [0.1, 1.22, 1.4]), add(BEDGIRL, [0, 1.12, 0]), pushK(f, 547, 0.002), { fov: 38 });
// 9 officials with a clipboard, girls climbing onto the lorry
const S9a = (f: number): Shot => { const u = glide((f - 588) / 96); return { pos: lerp3([-4.6, 1.7, 9.0], [-3.6, 1.8, 8.4], u), look: lerp3([0.2, 1.5, 1.8], [0.9, 1.5, 2.0], u), fov: 48 }; };
// 10 the lorry pulls away down the road: a low static frame it drives across
const S10a = (f: number): Shot => { const x = lorryX(10, f); return { pos: [3.6 + 0.4 * (x - LORRY0[0]), 1.0, 11.5], look: [3.8 + 0.7 * (x - LORRY0[0]), 1.6, ROAD_Z], fov: 46 }; };
// 11 the map: high, tilted, pushing down onto Kashasha then easing back as the dots spread
const S11a = (f: number): Shot => { const u = glide((f - 719) / 65); const c = mapXZ([1150, 1300]); return { pos: lerp3(add(c, [0.4, 6.2, 4.8]), add(c, [0.3, 7.4, 5.4]), u), look: lerp3(add(c, [0, 0, -0.6]), add(c, [0, 0, -0.9]), u), fov: 46 }; };
// 12 the clinic: doctor with a test tube, the other at the microscope; 12b the two doctors closer
const S12a = (f: number) => dolly([-0.35, 1.45, 2.5], [-0.45, 1.2, -2.0], pushK(f, 784, 0.0014), { fov: 50 });
const S12b = (f: number) => dolly([0.05, 1.55, 1.6], [0.05, 1.42, -1.8], pushK(f, 837, 0.0015), { fov: 46 });
// 13 in the village: the girl in her mother's arms, the father worried, the huts behind
const S13a = (f: number) => dolly([0.55, 1.45, 3.2], [0.15, 1.15, -0.3], pushK(f, 880, 0.0016), { fov: 44 });
// 14 high over the village at dusk, the fit passed person to person (glowing threads)
const S14a = (f: number): Shot => { const u = glide((f - 954) / 105); return { pos: lerp3([-3.5, 7.0, 12.0], [-2.5, 8.6, 13.0], u), look: [0.3, 0.2, -1.0], fov: 50 }; };
// 15 low angle: the flag over the cheering crowd
const S15a = (f: number): Shot => { const u = glide((f - 1059) / 85); return { pos: lerp3([-1.4, 0.55, 4.4], [-0.6, 0.6, 3.9], u), look: lerp3([0.2, 2.4, -3.0], [0.4, 2.9, -3.6], u), fov: 54 }; };
// 16 over a girl's shoulder: the teacher at a blackboard full of work (pressure); slow push
const S16a = (f: number) => dolly([0.62, 1.48, 3.9], [-0.45, 1.6, -2.6], pushK(f, 1144, 0.0007), { fov: 48 });
// 17 close on the studying girl
const S17a = (f: number) => dolly(add(STUDIER, [-0.08, 1.12, 1.75]), add(STUDIER, [0, 1.0, 0]), pushK(f, 1223, 0.0016), { fov: 40 });
// 18 the calendar, close
const S18a = (f: number) => dolly(add(CAL_AT, [0.05, 0.05, 1.9]), add(CAL_AT, [0, 0, 0]), pushK(f, 1286, 0.002), { fov: 40 });
// 19 the crowd, wide and high
const S19a = (f: number): Shot => { const u = glide((f - 1347) / 50); return { pos: lerp3([4.0, 5.2, 12.5], [3.4, 5.6, 12.0], u), look: [0, 0.8, -1.5], fov: 50 }; };
// 20 the empty classroom: low, centred, slow push on the board
const S20a = (f: number) => dolly([0.1, 1.15, 5.3], [0.0, 1.5, -3.0], pushK(f, 1397, 0.0016), { fov: 50 });
// 21 the hold-out, close, the fits around her; then cut back to the hook on the hook clock (last frame = frame 0)
const S21a = (f: number) => dolly(add(HOLD, [0.25, 1.2, 1.9]), add(HOLD, [0.15, 1.0, 0]), pushK(f, 1447, 0.002), { fov: 44 });
const S21b = (f: number) => S1a(f - TOTAL);

const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S2a, S3a, S4a, S5a, S5b, S6a, S7a, S8a, S8b, S9a, S10a, S11a, S12a, S12b, S13a, S14a, S15a, S16a, S17a, S18a, S19a, S20a, S21a, S21b };

// ---- camera director: subjects and obstacles (QA projects these) ----
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  girls: { at: () => [0, 1.0, 0.8], height: 1.5 },
  hookA: { at: () => eye(HOOK_A, 1.0), height: 0.6 },
  teacher: { at: () => eye(TEACH_FRONT, 1.0), height: 1.8 },
  school: { at: () => [-2.4, 1.6, SCHOOL_Z + 0.6], height: 2.4 },
  yard: { at: () => [0.3, 0.8, -1.5], height: 1.5 },
  faint: { at: () => eye(FAINT, 0.9), height: 1.6 },
  bedgirl: { at: () => eye(BEDGIRL, 1.2), height: 1.0 },
  officials: { at: () => [0, 1.0, 2.4], height: 1.8 },
  lorry: { at: () => [LORRY0[0] + 3, 1.5, ROAD_Z], height: 2.5 },
  map: { at: () => mapXZ([1150, 1250]), height: 1.0 },
  doctors: { at: () => [0.1, 1.45, DOC1_AT[2]], height: 1.0 },
  home: { at: () => eye(HOME, 1.0), height: 1.6 },
  village: { at: () => [0, 0.8, -1], height: 1.5 },
  flag: { at: () => eye(FLAG_AT, 2.4), height: 2.5 },
  board: { at: () => [-0.5, 1.6, BOARD_Z], height: 1.6 },
  studier: { at: () => eye(STUDIER, 1.0), height: 0.6 },
  calendar: { at: () => CAL_AT, height: 0.8 },
  crowd: { at: () => [0, 0.9, -1.5], height: 1.6 },
  holdout: { at: () => eye(HOLD, 1.0), height: 0.6 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [];
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset,
  scenes: ["classroom", "school", "dorm", "map", "clinic", "village", "front", "calendar"], lights: ["day", "golden", "dusk"] });
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
/** a gentle hand-held sway in the classroom close shots (frame-pure; on the hook clock in 1 and 21 so 21 -> 1 matches) */
const sway = (id: number, f: number): V3 => {
  if (id !== 1 && id !== 3 && id !== 17 && id !== 21) return [0, 0, 0];
  const t = id === 1 || id === 21 ? hookT(id, f) : T(f);
  return [0.025 * Math.sin(t * 1.7), 0.02 * Math.sin(t * 2.3), 0];
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
