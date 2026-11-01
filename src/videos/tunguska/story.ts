// Timeline of "Tunguska": shots timed to the voice words (voice/words.json, frame = round(start * 30)), the event
// physics of the airburst (one event clock e in seconds, e = 0 at the flash), and the camera grammar of the bridge
// short: slow symmetric push-ins, smootherstep glides, cuts for big reframes, 7-frame flip kicks on impacts.
// World units are metres. Ground zero GZ is the origin; the burst hangs HB over it (cartoon scale: 5-10 km -> 140 m);
// the herders' camp sits by the river ~315 m out, inside the falling ring.
export const FPS = 30;
export const TOTAL = 2078;
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
export const TENT: V3 = [30, 0, 309];
export const H1: V3 = [38.6, 0, 314.6];      // older herder
export const H2: V3 = [42.6, 0, 313.8];      // younger herder
export const DEER: [number, number, number, number][] = [[47.8, 312.4, 0.0, 1], [51.5, 317.5, 0.35, -1], [45.5, 320.5, 0.7, 1], [34.5, 318.6, 0.2, -1]]; // x, z, graze phase, facing
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
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 166, light: "day", scene: "taiga", e: (f) => (f - 70) / FPS, fog: [300, 2600] },       // HOOK: the sky explodes
  { id: 2, a: 166, b: 240, light: "day", scene: "taiga", e: () => -1000, fog: [120, 900] },                 // SETTING: taiga, river
  { id: 3, a: 240, b: 303, light: "day", scene: "taiga", e: () => -1000 },                                  // herders + reindeer
  { id: 4, a: 303, b: 420, light: "day", scene: "taiga", e: (f) => (f - 470) / FPS, fog: [200, 2600] },    // ACTION: the light, the bang
  { id: 5, a: 420, b: 540, light: "day", scene: "taiga", e: (f) => (f - 671) / FPS, fog: [400, 5000] },    // the rock, 15 km/s
  { id: 6, a: 540, b: 668, light: "day", scene: "taiga", e: (f) => (f - 671) / FPS, fog: [400, 5000] },    // ESCALATION: air squeezes
  { id: 7, a: 668, b: 750, light: "day", scene: "taiga", e: (f) => (f - 671) / FPS, fog: [250, 2200] },    // the burst
  { id: 8, a: 750, b: 835, light: "day", scene: "taiga", e: (f) => (f - 745) / FPS, fog: [300, 1800] },    // SNAP: wave slams down
  { id: 9, a: 835, b: 915, light: "day", scene: "taiga", e: (f) => (f - 866) / FPS + arrive(232), fog: [120, 900] }, // knocked over like grass
  { id: 10, a: 915, b: 968, light: "day", scene: "taiga", e: (f) => (f - 921) / FPS + arrive(318) },      // tents into the air
  { id: 11, a: 968, b: 1062, light: "space", scene: "globe", e: (f) => (f - 968) / FPS },                  // circled the planet. Twice.
  { id: 12, a: 1062, b: 1228, light: "golden", scene: "taiga", e: () => AFTER, fog: [140, 1200] },        // DEADPAN: still standing
  { id: 13, a: 1228, b: 1298, light: "golden", scene: "taiga", e: (f) => (f - 1262) / FPS, fog: [140, 1600] }, // EXPLANATION: from above
  { id: 14, a: 1298, b: 1408, light: "day", scene: "straw", e: () => -1000 },                              // the straw
  { id: 15, a: 1408, b: 1452, light: "day", scene: "tree", e: () => -1000 },                               // so does a tree
  { id: 16, a: 1452, b: 1590, light: "day", scene: "taiga", e: (f) => (f - 1466) / FPS * 0.8, fog: [400, 2400] }, // outer sideways, middle pressed
  { id: 17, a: 1590, b: 1665, light: "golden", scene: "taiga", e: () => AFTER, fog: [140, 1200] },        // CONSEQUENCE: no crater, no rock
  { id: 18, a: 1665, b: 1760, light: "day", scene: "taiga", e: () => AFTER, year: "1927", fog: [140, 1200] }, // scientists, 20 years
  { id: 19, a: 1760, b: 1910, light: "dusk", scene: "office", e: () => -1000, year: "now" },              // Asteroid Day, NASA watching
  { id: 20, a: 1910, b: TOTAL, light: "day", scene: "taiga", e: () => -1000, fog: [200, 1500] },           // CALLBACK
];
/** crossfades (frames) at place / time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 12: 8, 14: 8, 17: 8, 18: 8, 19: 8, 20: 8 };
export const FLASH_AT = 164;
/** extra white flashes (frame, peak) on the airbursts: hook, the burst, the replay from below */
export const FLASHES: [number, number][] = [[70, 0.85], [671, 1.0], [1262, 0.7], [312, 0.35]];

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
const S3a = (f: number) => dolly([44.5, 1.75, 324.5], [41.6, 1.25, 314.2], pushK(f, 240, 0.0025), { fov: 40 });
const S3b = (f: number) => dolly([52.5, 1.6, 323.0], [48.5, 0.9, 315.0], pushK(f, 268, 0.0025), { fov: 40, roll: -0.03 });
// 4 ACTION: low behind the herders, looking up east where the light crosses; punch on "gunfire"
const S4a = (f: number) => dolly([36.2, 1.15, 320.6], [80, 22, 290], pushK(f, 303, 0.002), { fov: 46, roll: 0.02 });
const S4b = (f: number) => dolly([45.5, 1.7, 306.5], [40.8, 1.55, 314.2], pushK(f, 362, 0.002, 0.006, 30), { fov: 40, roll: -0.04 }); // faces, flinch
// 5 the rock (chase from the side): fixed screen size (sprite rule: card size ~ distance)
const S5a = (f: number) => chase(5, f, 150, 30, -18, 10, 40);
const S5b = (f: number) => chase(5, f, 105, 10, -10, 18, 38);
// 6 ESCALATION: closer chase, then near-frontal 3/4 for the squeeze
const S6a = (f: number) => chase(6, f, 80, -30, -6, 20, 38);
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
const S10a = (f: number) => dolly([52, 3.0, 330], [36, 3.2, 310], pushK(f, 915, 0.002), { fov: 46, roll: 0.03 });
// 11 globe: Siberia toward the lens, slow push; "Twice" punch
const G = (x: number, y: number, z: number): V3 => [SET_GLOBE[0] + x, SET_GLOBE[1] + y, SET_GLOBE[2] + z];
const S11a = (f: number) => dolly(G(70, 150, 160), G(0, 8, 0), pushK(f, 968, 0.0015), { fov: 40 });
const S11b = (f: number) => dolly(G(140, 120, 110), G(0, 8, 0), pushK(f, 1028, 0.0015, 0.006, 30), { fov: 40, roll: -0.04 });
// 12 DEADPAN: crane down over ground zero ("directly underneath?"), then low among the stripped poles
const S12a = (f: number) => dolly([60, 230, 120], [0, 0, 0], pushK(f, 1062, 0.002), { fov: 44 });
const S12b = (f: number) => dolly([18, 1.6, 34], [0, 7, 0], pushK(f, 1113, 0.0018), { fov: 46, roll: 0.03 });
const S12c = (f: number) => dolly([-3.5, 1.55, 22.5], [-9.5, 1.5, 9.5], pushK(f, 1163, 0.0025), { fov: 40, roll: -0.02 }); // the hidden one
// 13 force straight down: lens on the floor of ground zero looking up through the poles
const S13a = (f: number) => dolly([14, 1.4, 20], [0, 80, 0], pushK(f, 1228, 0.0025), { fov: 52 });
// 14 the straw (insert set): end-on press, then sideways
const SS = (x: number, y: number, z: number): V3 => [SET_STRAW[0] + x, SET_STRAW[1] + y, SET_STRAW[2] + z];
const S14a = (f: number) => dolly(SS(0.25, 1.15, 2.6), SS(0, 1.12, 0), pushK(f, 1298, 0.0018), { fov: 36 });
const S14b = (f: number) => dolly(SS(-0.3, 1.12, 2.3), SS(0, 1.08, 0), pushK(f, 1349, 0.0025), { fov: 36, roll: 0.03 });
// 15 so does a tree
const ST = (x: number, y: number, z: number): V3 => [SET_TREE[0] + x, SET_TREE[1] + y, SET_TREE[2] + z];
const S15a = (f: number) => dolly(ST(3, 3.4, 15), ST(0, 5.5, 0), pushK(f, 1408, 0.003), { fov: 44 });
// 16 diagram from above: outer ring sideways, then push to the middle
const S16a = (f: number) => dolly([60, 520, 160], [0, 0, 0], pushK(f, 1452, 0.0015), { fov: 50 });
const S16b = (f: number) => dolly([30, 120, 70], [0, 10, 0], pushK(f, 1531, 0.003), { fov: 46, roll: 0.02 });
// 17 no crater, no rock: the herder at ground zero
const S17a = (f: number) => dolly([7.5, 1.7, 14.5], [2.0, 1.3, 4.2], pushK(f, 1590, 0.0025), { fov: 42 });
const S17b = (f: number) => dolly([4.8, 1.55, 9.2], [2.0, 1.45, 4.2], pushK(f, 1629, 0.002, 0.006, 25), { fov: 38, roll: 0.035 });
// 18 1927: the expedition walks through the fallen forest
const S18a = (f: number) => { const u = (f - 1665) / 95; return { pos: [-118 + 6 * u, 2.2, 168 - 4 * u] as V3, look: [-130 + 9 * u, 1.3, 160 - 6 * u] as V3, fov: 42, roll: 0.02 }; };
// 19 the office: drive along nine screens, spot the hidden one
const SO = (x: number, y: number, z: number): V3 => [SET_OFFICE[0] + x, SET_OFFICE[1] + y, SET_OFFICE[2] + z];
const S19a = (f: number) => { const u = glide((f - 1760) / 96); return { pos: SO(-9 + 13.5 * u, 2.0, 5.2), look: SO(-7.5 + 13.5 * u, 1.3, 0), fov: 44, roll: -0.02 }; };
const S19b = (f: number) => dolly(SO(3.4, 1.55, 2.6), SO(3.0, 1.35, -0.4), pushK(f, 1856, 0.0025, 0.006, 30), { fov: 40 });
// 20 CALLBACK: herders at the rebuilt camp, the hat comes off, crane out over the empty taiga, the last spark
const S20a = (f: number) => dolly([45.5, 1.7, 325.5], [41.2, 1.35, 314.6], pushK(f, 1910, 0.002), { fov: 40 });
const CR: V3[] = [[70, 40, 380], [150, 150, 520]];
const S20b = (f: number): Shot => {
  const a = S20a(1996), s = glide((f - 1996) / 70), r = 1 - s, [C, B] = CR;
  return { pos: [0, 1, 2].map((i) => r * r * a.pos[i] + 2 * s * r * C[i] + s * s * B[i]) as V3,
    look: lerp3(a.look, [-40, 60, 120], s), fov: 40 + 6 * s, roll: 0 };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 92, dur: 40, s: S1b }],
  2: [{ f: 166, s: S2a }],
  3: [{ f: 240, s: S3a }, { f: 268, dur: 24, s: S3b }],
  4: [{ f: 303, s: S4a }, { f: 362, cut: true, s: S4b }],
  5: [{ f: 420, s: S5a }, { f: 478, dur: 30, s: S5b }],
  6: [{ f: 540, s: S6a }, { f: 618, dur: 26, s: S6b }],
  7: [{ f: 668, s: S7a }],
  8: [{ f: 750, s: S8a }, { f: 789, dur: 22, s: S8b }],
  9: [{ f: 835, s: S9a }],
  10: [{ f: 915, s: S10a }],
  11: [{ f: 968, s: S11a }, { f: 1018, dur: 26, s: S11b }],
  12: [{ f: 1062, s: S12a }, { f: 1113, cut: true, s: S12b }, { f: 1163, cut: true, s: S12c }],
  13: [{ f: 1228, s: S13a }],
  14: [{ f: 1298, s: S14a }, { f: 1349, dur: 22, s: S14b }],
  15: [{ f: 1408, s: S15a }],
  16: [{ f: 1452, s: S16a }, { f: 1531, cut: true, s: S16b }],
  17: [{ f: 1590, s: S17a }, { f: 1629, cut: true, s: S17b }],
  18: [{ f: 1665, s: S18a }],
  19: [{ f: 1760, s: S19a }, { f: 1856, dur: 26, s: S19b }],
  20: [{ f: 1910, s: S20a }, { f: 1996, cut: true, s: S20b }],
};

// impact kicks (s): bang, burst, the four falling-ring hits, the tents, "Twice"
export const HITS = [772, 791, 835, 866]; // the 4 percussion hits under the falling ring (frames)
const KICKS: [number, number][] = [[364 / FPS, 0.8], [671 / FPS, 1.4], ...HITS.map((h) => [h / FPS, 1.0] as [number, number]), [921 / FPS, 1.2], [1031 / FPS, 0.7], [1262 / FPS, 0.8]];
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
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },                                         // hook aerial: sharp
  { f: 240, cInf: 12, focus: () => [41, 1.6, 314.3] },       // herders MS: eyes
  { f: 303, cInf: 0 },                                       // looking up at the sky
  { f: 362, cInf: 12, focus: () => [40.8, 1.65, 314.2] },    // faces flinch
  { f: 420, cInf: 0 },                                       // chase, burst, aerials, drive
  { f: 915, cInf: 6 },                                       // camp blown over
  { f: 968, cInf: 0 },                                       // globe
  { f: 1163, cInf: 11, focus: () => [-9.5, 1.5, 9.5] },      // the hidden one
  { f: 1228, cInf: 0 },
  { f: 1298, cInf: 14 },                                     // straw insert: focus = look
  { f: 1408, cInf: 8 },                                      // hero tree
  { f: 1452, cInf: 0 },                                      // diagram
  { f: 1590, cInf: 11, focus: () => [2.0, 1.55, 4.2] },      // herder at ground zero
  { f: 1665, cInf: 7 },                                      // expedition: focus = look
  { f: 1760, cInf: 0 },                                      // office drive
  { f: 1856, dur: 26, cInf: 12 },                            // the hidden screen
  { f: 1910, cInf: 12, focus: () => [40.6, 1.6, 314.4] },    // callback MS
  { f: 1996, dur: 30, cInf: 0 },                             // crane out
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
