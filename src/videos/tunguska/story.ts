// Timeline of "Tunguska": shots timed to the voice words (voice/words.json, frame = round(start * 30)), the event
// physics of the airburst (one event clock e in seconds, e = 0 at the flash), and the camera grammar of the bridge
// short: slow symmetric push-ins, smootherstep glides, cuts for big reframes, 7-frame flip kicks on impacts.
// World units are metres. Ground zero GZ is the origin; the burst hangs HB over it (cartoon scale: 5-10 km -> 140 m);
// the herders' camp sits by the river ~315 m out, inside the falling ring.
import storyboard from "./storyboard.json";
import { assertValid, type Storyboard, type ClockSpec } from "../../engine/storyboard/schema";
import { buildPreset, checkPreset, lerp3 as lerpV, type Obstacle, type Subject } from "../../engine/camera";
import cameraUpgrade from "./camera-upgrade.overlay.json";

export const FPS = 30;
/** which camera set to use: "" (default, hand-written) or "upgraded" (camera-director presets, camera-upgrade.overlay.json).
 *  Chosen with the Remotion input prop {"camera":"upgraded"} in the browser, or env STORY_CAMERA in node scripts. */
const cameraVariant = (): string => {
  try { const w = (globalThis as any).window; if (w?.remotion_inputProps) return JSON.parse(w.remotion_inputProps).camera ?? ""; } catch { /* no input props */ }
  try { return (globalThis as any).process?.env?.STORY_CAMERA ?? ""; } catch { return ""; }
};
const baseSB = storyboard as unknown as Storyboard;
const OVER = (cameraUpgrade as unknown as { shots: Record<string, Partial<Storyboard["shots"][number]>> }).shots;
const SB: Storyboard = cameraVariant() === "upgraded" ? { ...baseSB, shots: baseSB.shots.map((x) => (OVER[String(x.id)] ? { ...x, ...OVER[String(x.id)] } : x)) } : baseSB;
export const TOTAL = SB.totalFrames;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const easeIn = (u: number) => clamp01(u) ** 2;

// ---------------- places ----------------
export const HB = 140;                       // burst height over ground zero
export const BURST: V3 = [0, HB, 0];
export const R_POLE = 55;                    // inside this radius the trees stay standing, stripped bare
export const R_FOREST = 470;                 // falling forest out to here; a standing fringe beyond
export const riverZ = (x: number) => 286 + 22 * Math.sin(x / 110);  // river centre line (z of x)
export const RIVER_W = 22;
export const CAMP: V3 = [40, 0, 318];
export const TENT: V3 = [35.8, 0, 306.8];
export const H1: V3 = [40.0, 0, 314.6];      // older herder
export const H2: V3 = [41.35, 0, 314.15];    // younger herder
export const DEER: [number, number, number, number][] = [[43.4, 311.2, 0.0, -1], [38.2, 310.6, 0.35, 1], [46.0, 309.0, 0.7, -1], [33.8, 312.0, 0.2, 1]]; // x, z, graze phase, facing
export const STUMP: V3 = [0, 0, 0];          // straw insert lives in its own little set far away (see world.ts)
export const SET_STRAW: V3 = [2000, 0, 2000];
export const SET_TREE: V3 = [2100, 0, 2000];
export const SET_OFFICE: V3 = [-2000, 0, 2000];
export const SET_GLOBE: V3 = [0, 6000, 0];
export const GLOBE_R = 60;

// ---------------- the event: fireball, flash, blast wave ----------------
export const SPEED = 300;                                   // m/s along the path (cartoon)
const dn = Math.hypot(-0.9, -0.3, -0.32);
export const DIR: V3 = [-0.9 / dn, -0.3 / dn, -0.32 / dn];  // travel direction: from the east, descending
export const rockAt = (e: number): V3 => [BURST[0] + DIR[0] * SPEED * e, BURST[1] + DIR[1] * SPEED * e, BURST[2] + DIR[2] * SPEED * e];
export const WAVE_V = 220, WAVE_T0 = 0.3;                   // ground ring speed (m/s), delay before it touches down
export const waveR = (e: number) => Math.max(0, WAVE_V * (e - WAVE_T0));
export const arrive = (r: number) => WAVE_T0 + r / WAVE_V;
/** fall of a tree at radius r: 0 upright .. 1 flat on the ground (outward); quick tip with a small settle */
export const fallK = (r: number, e: number) => {
  if (r < R_POLE) return 0;
  const u = (e - arrive(r)) / 0.42;
  if (u <= 0) return 0;
  return u < 1 ? u * u * (1.15 - 0.15 * u) : 1;
};
/** branches gone: the pole trees lose them as the wave presses down; near the pole zone they go too */
export const stripK = (r: number, e: number) => (r < R_POLE + 25 ? smooth((e - arrive(Math.max(0, r - 10)) + 0.05) / 0.25) : 0);
export const AFTER = 10000; // event time for the aftermath shots (everything settled)

// ---------------- shots ----------------
export type Light = "day" | "golden" | "dusk" | "space";
export type Scene = "taiga" | "straw" | "tree" | "office" | "globe";
export type ShotDef = { id: number; a: number; b: number; light: Light; scene: Scene; e: (f: number) => number; fog?: [number, number]; year?: "1908" | "1927" | "now" };
/** event clock of a shot from its declarative spec (see engine/storyboard/schema.ts) */
const clockOf = (c: ClockSpec): ((f: number) => number) =>
  c.kind === "none" ? () => -1000 : c.kind === "after" ? () => AFTER
  : c.scale !== undefined ? ((k) => (f: number) => (f - c.at) / FPS * k)(c.scale) : c.arrive !== undefined ? ((r) => (f: number) => (f - c.at) / FPS + arrive(r))(c.arrive) : (f) => (f - c.at) / FPS;
/** the shots: data lives in storyboard.json (validated), only the event clocks are built here */
export const SHOTS: ShotDef[] = SB.shots.map((x) => ({ id: x.id, a: x.a, b: x.b, light: x.light, scene: x.scene, e: clockOf(x.clock),
  ...(x.fog ? { fog: x.fog } : {}), ...(x.year ? { year: x.year } : {}) }));
/** crossfades (frames) at place / time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = Object.fromEntries(SB.shots.filter((x) => x.xfade).map((x) => [x.id, x.xfade!]));
export const FLASH_AT = SB.events.flashAt;
/** extra white flashes (frame, peak) on the airbursts: hook, the burst, the replay from below */
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
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
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
/** push-in factor since f0 (subject grows ~rate per frame); `punch` raises it with 8 f soft edges for n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const eOf = (id: number, f: number) => SHOTS[id - 1].e(f);
// chase frame for the rock: side = horizontal normal of the path (screen-left of travel), up
const SIDE: V3 = (() => { const s: V3 = [DIR[2], 0, -DIR[0]], n = Math.hypot(...s); return [s[0] / n, 0, s[2] / n]; })();
const chase = (id: number, f: number, dist: number, back: number, up: number, lead: number, fov = 40): Shot => {
  const P = rockAt(eOf(id, f));
  return { pos: add(add(add(P, SIDE, dist), DIR, -back), [0, 1, 0], up), look: add(P, DIR, lead), fov };
};

// ---- framings ----
// 1 HOOK: high over the taiga, the fireball comes in from the right and bursts; pull back as the ring spreads
const S1a = (f: number) => dolly([330, 175, 470], [0, 70, 0], pushK(f, 0, 0.0018), { fov: 46 });
const S1b = (f: number) => dolly([380, 260, 560], [0, 20, 0], 1 / pushK(f, 92, 0.0016), { fov: 48, roll: 0.03 });
// 2 SETTING: low aerial glide along the river toward the camp
const S2a = (f: number) => { const u = (f - 166) / 74; const x = 260 - 150 * u; return { pos: [x, 34 - 6 * u, riverZ(x) + 40] as V3, look: [x - 70, 6, riverZ(x - 70) - 6] as V3, fov: 44 }; };
// 3 herders + reindeer MS (looking -z across the river toward the forest)
const S3a = (f: number) => dolly([41.6, 1.7, 321.6], [40.75, 1.15, 312.6], pushK(f, 240, 0.0025), { fov: 40 });
const S3b = (f: number) => dolly([44.2, 1.5, 318.4], [42.4, 1.0, 311.0], pushK(f, 268, 0.0025), { fov: 40, roll: -0.03 });
// 4 ACTION: low behind the herders, looking up east where the light crosses; punch on "gunfire"
const S4a = (f: number) => dolly([34.4, 1.15, 314.3], [60, 7.5, 314.3], pushK(f, 303, 0.002), { fov: 50, roll: 0.02 });
const S4b = (f: number) => dolly([36.2, 1.65, 314.3], [40.5, 1.55, 314.3], pushK(f, 362, 0.002, 0.006, 30), { fov: 40, roll: -0.04 }); // faces, flinch
// 5 the rock (chase from the side): fixed screen size (sprite rule: card size ~ distance)
const S5a = (f: number) => chase(5, f, 150, 30, -18, 10, 40);
const S5b = (f: number) => chase(5, f, 105, 10, -10, 18, 38);
// 6 ESCALATION: closer chase, then near-frontal 3/4 for the squeeze
const S6a = (f: number) => chase(6, f, 80, -30, -6, 6, 38); // lead 6 (was 20): keeps the rock ~4 deg inside frame (QA: off-screen right)
const S6b = (f: number) => chase(6, f, 62, -48, -8, 6, 36);
// 7 the burst, from far out (outside the forest) at tree-top height: the flash over the taiga
const S7a = (f: number) => dolly([280, 16, 620], [0, 110, 0], pushK(f, 668, 0.0015), { fov: 42 });
// 8 SNAP: high oblique over ground zero, the ring runs out under the lens
const S8a = (f: number) => dolly([210, 330, 300], [0, 0, 20], pushK(f, 750, 0.0018), { fov: 48, roll: -0.03 });
const S8b = (f: number) => dolly([150, 230, 240], [20, 0, 40], pushK(f, 789, 0.0025), { fov: 46, roll: 0.02 });
// 9 the drive: 2.5 m over the floor, sliding outward along a ray, looking across it: trees fall left -> right
const S9a = (f: number) => { const u = (f - 835) / 80, r = 205 + 50 * u, a = -0.9; const p: V3 = [r * Math.sin(a), 2.8, r * Math.cos(a)];
  const t: V3 = [Math.cos(a), 0, -Math.sin(a)]; return { pos: add(p, t, -26) as V3, look: add([p[0], 3.4, p[2]], t, 10) as V3, fov: 44, roll: 0.04 }; };
// 10 the camp: tents into the air
const S10a = (f: number) => dolly([46, 2.6, 331], [38.5, 2.6, 309], pushK(f, 915, 0.002), { fov: 46, roll: 0.03 });
// 11 globe: Siberia toward the lens, slow push; "Twice" punch
const G = (x: number, y: number, z: number): V3 => [SET_GLOBE[0] + x, SET_GLOBE[1] + y, SET_GLOBE[2] + z];
const S11a = (f: number) => dolly(G(95, 205, 215), G(0, 22, 0), pushK(f, 968, 0.0015), { fov: 40 });
const S11b = (f: number) => dolly(G(150, 190, 170), G(0, 22, 0), pushK(f, 1028, 0.0015, 0.006, 30), { fov: 40, roll: -0.04 });
// 12 DEADPAN: crane down over ground zero ("directly underneath?"), then low among the stripped poles
const S12a = (f: number) => dolly([60, 230, 120], [0, 0, 0], pushK(f, 1062, 0.002), { fov: 44 });
const S12b = (f: number) => dolly([18, 1.6, 34], [0, 7, 0], pushK(f, 1113, 0.0018), { fov: 46, roll: 0.03 });
const S12c = (f: number) => dolly([-3.5, 1.55, 22.5], [-9.5, 1.5, 9.5], pushK(f, 1163, 0.0025), { fov: 40, roll: -0.02 }); // the hidden one
// 13 force straight down: lens on the floor of ground zero looking up through the poles
const S13a = (f: number) => dolly([16, 1.4, 24], [0, 20, 0], pushK(f, 1228, 0.0025), { fov: 58 }); // look y 20 (was 34): poles fill the frame, not empty sky
// 14 the straw (insert set): end-on press, then sideways
const SS = (x: number, y: number, z: number): V3 => [SET_STRAW[0] + x, SET_STRAW[1] + y, SET_STRAW[2] + z];
const S14a = (f: number) => dolly(SS(0.3, 1.45, 3.0), SS(0, 1.3, 0), pushK(f, 1298, 0.0018), { fov: 36 });
const S14b = (f: number) => dolly(SS(-0.35, 1.35, 2.7), SS(-0.1, 1.25, 0), pushK(f, 1349, 0.0025), { fov: 36, roll: 0.03 });
// 15 so does a tree
const ST = (x: number, y: number, z: number): V3 => [SET_TREE[0] + x, SET_TREE[1] + y, SET_TREE[2] + z];
const S15a = (f: number) => dolly(ST(4, 3.0, 19), ST(3, 4.5, 0), pushK(f, 1408, 0.003), { fov: 50 });
// 16 diagram from above: outer ring sideways, then push to the middle
const S16a = (f: number) => dolly([60, 520, 160], [0, 0, 0], pushK(f, 1452, 0.0015), { fov: 50 });
const S16b = (f: number) => dolly([30, 120, 70], [0, 10, 0], pushK(f, 1531, 0.003), { fov: 46, roll: 0.02 });
// 17 no crater, no rock: the herder at ground zero
const S17a = (f: number) => dolly([7.5, 1.7, 14.5], [2.0, 1.3, 4.2], pushK(f, 1590, 0.0025), { fov: 42 });
const S17b = (f: number) => dolly([4.8, 1.55, 9.2], [2.0, 1.45, 4.2], pushK(f, 1629, 0.002, 0.006, 25), { fov: 38, roll: 0.035 });
// 18 1927: the expedition walks through the fallen forest
export const EXPED = (f: number): V3 => { const u = (f - 1665) / FPS; return [-131.5 + 0.62 * (0.8 * u - 2.0), 1.1, 160.5 - 0.78 * (0.8 * u - 2.0)]; };
const S18a = (f: number) => { const g = EXPED(f); return dolly([g[0] + 7.5, 2.0, g[2] + 6.0], g, pushK(f, 1665, 0.002), { fov: 42, roll: 0.02 }); };
// 19 the office: drive along nine screens, spot the hidden one
const SO = (x: number, y: number, z: number): V3 => [SET_OFFICE[0] + x, SET_OFFICE[1] + y, SET_OFFICE[2] + z];
const S19a = (f: number) => { const u = glide((f - 1760) / 96); return { pos: SO(-9 + 13.5 * u, 2.0, 5.2), look: SO(-7.5 + 13.5 * u, 1.3, 0), fov: 44, roll: -0.02 }; };
const S19b = (f: number) => dolly(SO(4.3, 2.25, 3.5), SO(5.9, 1.35, -0.6), pushK(f, 1856, 0.0025, 0.006, 30), { fov: 40 });
// 20 CALLBACK: herders at the rebuilt camp, the hat comes off, crane out over the empty taiga, the last spark
const S20a = (f: number) => dolly([41.4, 1.7, 321.2], [40.6, 1.3, 313.0], pushK(f, 1910, 0.0012), { fov: 40 }); // gentler push + look toward herder1 (QA: left edge cut)
const CR: V3[] = [[70, 40, 380], [150, 150, 520]];
const S20b = (f: number): Shot => {
  const a = S20a(1996), s = glide((f - 1996) / 92), r = 1 - s, [C, B] = CR;
  return { pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * C[i] + s * s * B[i]) as V3,
    look: lerp3(a.look, [-40, 60, 120], s), fov: 40 + 6 * s, roll: 0 };
};

/** camera functions by name: storyboard.json refers to these (validated: unknown names are reported) */
const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S1b, S2a, S3a, S3b, S4a, S4b, S5a, S5b, S6a, S6b, S7a, S8a, S8b, S9a, S10a, S11a, S11b, S12a, S12b, S12c, S13a, S14a, S14b, S15a, S16a, S16b, S17a, S17b, S18a, S19a, S19b, S20a, S20b };
// ---- camera director: subjects (what a preset can frame / look at) and obstacles (what the camera must not enter) ----
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  herder1: { at: () => eye(H1, 1.55), height: 1.7 }, herder2: { at: () => eye(H2, 1.45), height: 1.5 },
  deer: { at: () => [DEER[0][0], 1.1, DEER[0][1]], height: 1.6 }, camp: { at: () => [CAMP[0], 1.5, CAMP[2]], height: 3 },
  gzHerder: { at: () => [2.0, 1.45, 4.2], height: 1.6 }, heroTree: { at: () => ST(3, 4.5, 0), height: 9 }, burst: { at: () => BURST, height: 20 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [
  { kind: "sphere", c: [TENT[0], 1.2, TENT[2]], r: 1.6 }, { kind: "cyl", x: H1[0], z: H1[2], r: 0.45, h: 1.9 }, { kind: "cyl", x: H2[0], z: H2[2], r: 0.45, h: 1.7 },
  ...DEER.map(([x, z]) => ({ kind: "cyl", x, z, r: 0.6, h: 1.6 } as Obstacle)), { kind: "cyl", x: 2.0, z: 4.2, r: 0.45, h: 1.8 },
];
const DIRECTOR_CTX = { subjects: DIRECTOR_SUBJECTS, obstacles: DIRECTOR_OBSTACLES, groundY: 0 };
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset });
const CAMS: Record<number, Key[]> = Object.fromEntries(SB.shots.map((x) => [x.id, x.camera.map((k, i) => {
  const next = x.camera[i + 1]?.f ?? x.b;
  const s = k.preset ? ((cam) => (f: number): Shot => cam(f))(buildPreset(k.preset, { f0: k.f, dur: next - k.f, ...(k.params ?? {}) }, DIRECTOR_CTX)) : CAM_FN[k.fn!];
  return { f: k.f, ...(k.dur ? { dur: k.dur } : {}), ...(k.cut ? { cut: true } : {}), s };
})]));

// impact kicks (s): bang, burst, the four falling-ring hits, the tents, "Twice"
export const HITS = SB.events.hits; // the 4 percussion hits under the falling ring (frames)
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

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = SB.shots.flatMap((x) => x.dof.map((d) => ({ f: d.f, cInf: d.cInf, ...(d.dur ? { dur: d.dur } : {}), ...(d.focus ? { focus: () => d.focus! as V3 } : {}) })));
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  // rack focus: when a keyed transition (dur) goes from one focus point to another, the focus point glides instead of jumping
  const focus = d.dur && d.focus && p.focus && p !== d ? (g: number): V3 => lerpV(p.focus!(g), d.focus!(g), glide(k)) : d.focus;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus };
};
