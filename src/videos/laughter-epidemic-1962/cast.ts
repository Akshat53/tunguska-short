// The cast of "The Tanganyika Laughter Epidemic (1962)", drawn with the visual kit (src/engine/kit: people.ts + face.ts) as
// cards on the kit card stage. 1962 north-west Tanganyika: mission-school girls in sea-green uniform dresses with cream
// collars and cropped hair; teachers in kitenge-print dresses and head-wraps or a white shirt and tie-less collar; officials
// in shirts and slacks; doctors in white coats; villagers in kanzu robes and kofia caps, kanga/kitenge wraps and head-wraps.
// Respect: natural skin tones, no exaggerated features; the girls are frightened, exhausted people, never a joke. Their
// laughter is the symptom: wide frightened eyes or crying eyes, tears, hands at the chest or the face.
// laughFit(t, seed, k) is the frame-pure laughing fit (seeded per person).
import type { Card, V3 } from "../../engine/kit/stage";
import { drawPerson, type Person, type Pose, type Anchors, type Gesture } from "../../engine/kit/people";
import { KPen, SKINS, hash, pick, shade, PAL, type P2 } from "../../engine/kit/core";
import type { Expr } from "../../engine/kit/face";
import { handFlag } from "./art";
import { tubeAt3d } from "./props3d";

const H = (seed: number, k: number) => hash(seed * 1.73 + 0.41, k);
const DARK = SKINS.slice(4);                        // natural deep warm tones
const HAIR = ["#141010", "#1b1411", "#22160f", "#2a1c14"];
export const UNIFORM = "#2f8f83", COLLAR = "#f6ecd2";
const KITENGE = ["#d9a441", "#c4683a", "#1f5f66", "#2f8f83", "#c8323a", "#3f6a4a", "#e8643a"];
const PATS = ["dots", "buti", "stripes", "checks"] as const;

export type Dressed = { P: Person };
const base = (seed: number, build: Person["build"], h0: number, hk: number): Omit<Person, "look"> => ({
  build, seed, height: h0 + hk * H(seed, 1), girth: 0.78 + 0.3 * H(seed, 2) ** 1.5, skin: pick(DARK, H(seed, 3)), hairCol: pick(HAIR, H(seed, 4)), age: 0,
});

/** a schoolgirl (12-18): sea-green uniform dress (tunic over a matching skirt) with a cream collar trim, cropped hair or braids */
export const schoolgirl = (seed: number): Dressed => {
  const b = base(seed, "woman", 0.82, 0.12);
  return { P: { ...b, girth: 0.72 + 0.18 * H(seed, 2), look: {
    top: "kurta", topCol: UNIFORM, trimCol: shade(UNIFORM, 0.82), sleeves: "short", bottom: "ghagra", bottomCol: shade(UNIFORM, 0.92),
    hat: "none", hair: H(seed, 5) < 0.6 ? "bun" : "braid", feet: H(seed, 6) < 0.6 ? "shoes" : "bare", feetCol: "#1f1a16", extras: H(seed, 7) < 0.3 ? ["earrings"] : [],
  } } };
};
/** a woman teacher: kitenge-print dress and a matching head-wrap */
export const teacherW = (seed: number, col?: string): Dressed => {
  const b = base(seed, "woman", 0.98, 0.06), c = col ?? pick(KITENGE, H(seed, 10)), pat = pick(PATS, H(seed, 11));
  return { P: { ...b, age: 0.25 + 0.3 * H(seed, 12), look: {
    top: "blouse", topCol: c, topPat: pat, topPatCol: pick(["#f6ecd2", "#f2b632", "#10222b"], H(seed, 13)), sleeves: "short",
    bottom: "ghagra", bottomCol: c, bottomPat: pat, bottomPatCol: pick(["#f6ecd2", "#f2b632", "#10222b"], H(seed, 13)),
    hat: "headcloth", hatCol: shade(c, 0.9), hatPat: pat, hatPatCol: "#f6ecd2", hair: "bun", feet: "shoes", feetCol: "#3a2a1e", extras: ["earrings"],
  } } };
};
/** a man in a white shirt and dark slacks (teacher / official), optional jacket colour */
export const manShirt = (seed: number, jacket?: string, age = 0.3): Dressed => {
  const b = base(seed, "man", 0.96, 0.08);
  return { P: { ...b, age, look: {
    top: jacket ? "jacket" : "shirt", topCol: jacket ?? "#f3f0e6", trimCol: jacket ? shade(jacket, 0.7) : undefined, bottom: "trousers", bottomCol: pick(["#2a3a40", "#5a4a3a", "#3a3a3e"], H(seed, 20)),
    hat: "none", hair: "short", facial: pick(["none", "moustache", "none", "stubble"] as const, H(seed, 21)), feet: "shoes", feetCol: "#1a1a1a", extras: jacket ? [] : ["rolled_sleeves"],
  } } };
};
/** a doctor: white coat (jacket) over a shirt */
export const doctor = (seed: number, fem = false): Dressed => {
  if (fem) { const b = base(seed, "woman", 0.98, 0.05); return { P: { ...b, age: 0.3, look: { top: "kurta", topCol: "#f6f8f2", trimCol: "#dfe6dc", sleeves: "long", bottom: "ghagra", bottomCol: "#e8ece4", hat: "headcloth", hatCol: "#f6f8f2", hair: "bun", feet: "shoes", feetCol: "#1a1a1a", extras: [] } } }; }
  const b = base(seed, "man", 0.98, 0.06);
  return { P: { ...b, age: 0.45 + 0.3 * H(seed, 30), look: { top: "jacket", topCol: "#f6f8f2", trimCol: "#cfd8d0", bottom: "trousers", bottomCol: "#3a3a3e", hat: "none", hair: H(seed, 31) < 0.5 ? "short" : "bald", facial: pick(["moustache", "beard", "none"] as const, H(seed, 32)), feet: "shoes", feetCol: "#1a1a1a", extras: [] } } };
};
/** villagers: men in a white kanzu and kofia or a shirt; women in a kanga/kitenge wrap and head-wrap; children */
export const villager = (seed: number): Dressed => {
  const k = H(seed, 40);
  if (k < 0.45) {
    const b = base(seed, "woman", 0.94, 0.1), c = pick(KITENGE, H(seed, 41)), pat = pick(PATS, H(seed, 42));
    return { P: { ...b, age: 0.6 * H(seed, 43), look: { top: "blouse", topCol: pick(["#f6ecd2", c], H(seed, 44)), sleeves: "short", bottom: "ghagra", bottomCol: c, bottomPat: pat, bottomPatCol: pick(["#f6ecd2", "#f2b632", "#10222b"], H(seed, 45)),
      hat: "headcloth", hatCol: pick(KITENGE, H(seed, 46)), hair: "bun", feet: H(seed, 47) < 0.5 ? "bare" : "chappal", feetCol: "#3a2a1e", extras: H(seed, 48) < 0.4 ? ["earrings", "bangles"] : [] } } };
  }
  if (k < 0.85) {
    const b = base(seed, "man", 0.94, 0.1), kanzu = H(seed, 50) < 0.5;
    return { P: { ...b, age: 0.7 * H(seed, 51), hairCol: H(seed, 52) < 0.3 ? "#bdb8ae" : pick(HAIR, H(seed, 4)), look: kanzu
      ? { top: "kurta", topCol: "#f6f2e6", trimCol: "#e8dcc0", sleeves: "long", bottom: "pyjama", bottomCol: "#f0ead8", hat: H(seed, 53) < 0.6 ? "cap" : "none", hatCol: "#f6f2e6", hair: "short", facial: pick(["none", "beard", "moustache"] as const, H(seed, 54)), feet: "chappal", feetCol: "#3a2a1e", extras: [] }
      : { top: "shirt", topCol: pick(["#f6ecd2", "#cfe3d2", "#d9a441", "#bfdcd0"], H(seed, 55)), bottom: "trousers", bottomCol: pick(["#5a4a3a", "#3a4a40", "#7a6a4a"], H(seed, 56)), hat: "none", hair: "short", facial: pick(["none", "stubble", "moustache"] as const, H(seed, 54)), feet: H(seed, 57) < 0.5 ? "bare" : "chappal", feetCol: "#3a2a1e", extras: H(seed, 58) < 0.5 ? ["rolled_sleeves"] : [] } } };
  }
  const girl = H(seed, 60) < 0.5, b = base(seed, girl ? "girl" : "boy", 0.92, 0.12);
  return { P: { ...b, look: girl
    ? { top: "blouse", topCol: pick(KITENGE, H(seed, 61)), sleeves: "short", bottom: "ghagra", bottomCol: pick(KITENGE, H(seed, 62)), hat: "none", hair: "short", feet: "bare" }
    : { top: "shirt", topCol: pick(["#f6ecd2", "#d9a441", "#cfe3d2"], H(seed, 63)), bottom: "shorts", bottomCol: pick(["#5a4a3a", "#3a4a40"], H(seed, 64)), hat: "none", hair: "short", feet: "bare" } } };
};
/** a crowd member at the school or in a village (mostly schoolgirls at the school) */
export const crowdPerson = (seed: number, school: boolean): Dressed => (school ? (H(seed, 70) < 0.9 ? schoolgirl(seed) : teacherW(seed)) : H(seed, 70) < 0.22 ? schoolgirl(seed) : villager(seed));

// the named people
export const HOOK_A = schoolgirl(101), HOOK_B = schoolgirl(108);
export const TEACHER = teacherW(201, "#d9a441");
export const TEACHER2 = manShirt(202, undefined, 0.35);
export const MISTRESS = teacherW(203, "#1f5f66");
export const OFFICIAL1 = manShirt(211, "#8a9a8e", 0.5), OFFICIAL2 = manShirt(212, undefined, 0.3);
export const DRIVER = manShirt(213, undefined, 0.2);
export const DOC1 = doctor(221), DOC2 = doctor(222), NURSE = doctor(223, true);
export const MOTHER_P: Dressed = { P: { ...teacherW(232, "#c4683a").P, height: 0.96, age: 0.4 } };
export const FATHER_P: Dressed = { P: { ...manShirt(233, undefined, 0.5).P } };
export const HOMEGIRL = schoolgirl(234);
export const HOLDOUT = schoolgirl(240);       // the last girl, trying not to laugh

// ---------------- overlays at the kit anchors ----------------
type Extra = (k: KPen, A: Anchors, P: Person, pose: Pose) => void;
const rigH = (P: Person) => { const kid = P.build === "boy" || P.build === "girl", fem = P.build === "woman" || P.build === "girl"; const T = (kid ? 500 : fem ? 720 : 770) * P.height; const h = T / (kid ? 3.7 : 4.7); return { H: h, W: h * (fem ? 0.84 : 0.88) * (0.94 + 0.06 * P.girth) }; };
/** a stethoscope round the neck */
const stethX: Extra = (k, A, P) => {
  const { H: h } = rigH(P), [x, y] = A.head, ny = y + 0.75 * h;
  k.stroke([[x - 0.32 * h, ny], [x - 0.2 * h, ny + 0.55 * h], [x + 0.05 * h, ny + 0.7 * h]], 0.05 * h, "#2a3a3e");
  k.stroke([[x + 0.32 * h, ny], [x + 0.22 * h, ny + 0.45 * h]], 0.05 * h, "#2a3a3e");
  k.ell(x + 0.08 * h, ny + 0.72 * h, 0.08 * h, 0.08 * h, "#c9ced0", k.ow * 0.6);
};
/** a test tube held up in the raised (highest) hand, to the light */
const tubeX = (liquid: string): Extra => (k, A, P) => {
  const { H: h } = rigH(P), hd = A.hands.reduce<(typeof A.hands)[number] | undefined>((m, c) => (!m || c[1] < m[1] ? c : m), undefined);
  if (hd) tubeAt3d(k, hd[0], hd[1] - 0.05 * h, 1.25 * h, liquid);
};
/** a Tanganyika hand flag in the raised hand */
const flagX = (w: number): Extra => (k, A, P) => { const { H: h } = rigH(P); const hd = A.hands.reduce<P2 | undefined>((m, q) => (!m || q[1] < m[1] ? q : m), undefined); if (hd) handFlag(k, hd[0], hd[1], 0.75 * h, w); };
/** a piece of chalk in the pointing hand */
const chalkX: Extra = (k, A, P) => { const { H: h } = rigH(P), hd = A.hands[1] ?? A.hands[0]; if (hd) k.poly([[hd[0] - 0.03 * h, hd[1] - 0.1 * h], [hd[0] + 0.03 * h, hd[1] - 0.1 * h], [hd[0] + 0.03 * h, hd[1] + 0.02 * h], [hd[0] - 0.03 * h, hd[1] + 0.02 * h]], "#fbf4e2", k.ow * 0.4); };
/** a clipboard against the chest */
const clipX: Extra = (k, A, P) => { const { H: h } = rigH(P), hd = A.hands[0]; if (!hd) return; k.poly([[hd[0] - 0.25 * h, hd[1] - 0.45 * h], [hd[0] + 0.2 * h, hd[1] - 0.45 * h], [hd[0] + 0.2 * h, hd[1] + 0.15 * h], [hd[0] - 0.25 * h, hd[1] + 0.15 * h]], "#a8743e", k.ow * 0.6); k.poly([[hd[0] - 0.2 * h, hd[1] - 0.38 * h], [hd[0] + 0.15 * h, hd[1] - 0.38 * h], [hd[0] + 0.15 * h, hd[1] + 0.1 * h], [hd[0] - 0.2 * h, hd[1] + 0.1 * h]], "#fbf4e2", 0); };
export const X = { steth: stethX, tube: tubeX, flag: flagX, chalk: chalkX, clip: clipX };

// ---------------- the laughing fit ----------------
/** hands at the chest / at the face / on the head: never stiff at the sides */
/** (no "reach"/"cup" in the fits: they read as stiff outstretched arms in close shots) */
const LAUGH_ARMS: [Gesture, Gesture][] = [["cover", "shield"], ["shield", "cover"], ["cover", "cover"], ["shield", "shield"], ["cover", "fold"], ["fold", "cover"]];
const SEAT_ARMS: [Gesture, Gesture][] = [["cover", "cover"], ["shield", "cover"], ["cover", "shield"], ["cover", "fold"], ["fold", "cover"]];
export type Fit = { pose: Pose; hop: number; tilt: number };
/** a laughing fit at time t (s), intensity k (0 = calm, 1 = full fit, up to 1.3 for the close-ups). Laughing mouth that pulses
 *  ("ha-ha-ha" at ~5 syllables/s), frightened wide eyes alternating with crying eyes, tears, head shaking, shoulders bouncing,
 *  doubling over. seated = arm set for girls at desks. */
export const laughFit = (t: number, seed: number, k: number, seated = false): Fit => {
  const ph = hash(seed, 1) * 10, per = 1.3 + 1.1 * hash(seed, 2);
  const slot = Math.floor(t / per + ph);
  const arms = (seated ? SEAT_ARMS : LAUGH_ARMS)[Math.floor(hash(Math.floor(t / (2.4 + hash(seed, 3)) + ph), seed) * (seated ? SEAT_ARMS.length : LAUGH_ARMS.length))];
  if (k < 0.15) return { pose: { t, expr: hash(seed, 4) < 0.5 ? "worried" : "surprised", arms: seated ? ["cover", "cover"] : ["cover", "hips"], look: "idle" }, hop: 0, tilt: 0 };
  const expr: Expr = k < 0.45 ? (hash(slot, seed) < 0.5 ? "scared" : "hysteric") : hash(slot, seed + 1) < 0.45 ? "hysteric" : "sob";
  const shake = Math.sin(t * Math.PI * 2 * (4.6 + hash(seed, 5))), slow = Math.sin(t * Math.PI * 2 * (0.35 + 0.2 * hash(seed, 6)) + ph);
  return {
    pose: {
      t, expr, arms, talk: [[-1000, 1000]], tears: k > 0.4 ? Math.min(1, 0.3 + 0.7 * k) : 0,
      headTilt: (10 * slow + 3.5 * shake) * Math.min(1, k), lean: 7 * slow * Math.min(1, k), turn: 0.18 * Math.sin(t * 0.9 + ph),
      look: [0.35 * Math.sin(t * 0.7 + ph), -0.1 + 0.15 * Math.sin(t * 1.3 + ph)],
    },
    hop: 0.018 * Math.min(1.2, k) * Math.abs(shake), tilt: 0.035 * slow * Math.min(1, k),
  };
};
/** the teacher's panic: arms up / reaching, scared, calling out */
export const panic = (t: number, seed: number): Pose => {
  const s = Math.floor(t / 1.1 + hash(seed, 1) * 3);
  const A: [Gesture, Gesture][] = [["shield", "shield"], ["shield", "cover"], ["cup", "shield"], ["shield", "cup"]];
  return { t, expr: hash(s, seed) < 0.5 ? "scared" : "surprised", arms: A[Math.floor(hash(s, seed + 2) * A.length)], talk: [[0, 1000]], headTilt: 6 * Math.sin(t * 3 + seed), lean: 4 * Math.sin(t * 2.2), wave: (t * 1.5) % 1 };
};

// ---------------- cards ----------------
/** card metres: 600 x 1000 design units = 1.296 m x 2.16 m; soles at y 975 */
export const CARD_W = 1.296, SOLE = (25 / 1000) * 2.16;
const q = (v: number) => Math.round(v * 120) / 120;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
export type PersonOpts = { flip?: boolean; scale?: number; tint?: [number, number, number]; rim?: boolean; maxPx?: number; extra?: Extra; extraKey?: string; opacity?: number; rot?: number };
export const personCard = (name: string, D: Dressed, pose: Pose, at: V3, o: PersonOpts = {}): Card => {
  const s = o.scale ?? 1, ex = o.extra;
  return {
    key: `P|${name}|${fkey(pose)}|${o.extraKey ?? ""}|${q(o.rot ?? 0)}`,
    draw: (p) => { const A = drawPerson(p, D.P, pose); ex?.(p, A, D.P, pose); },
    dw: 600, dh: 1000, w: CARD_W * s, pos: [at[0], at[1] - SOLE * s, at[2]], rot: o.rot,
    flip: o.flip, rim: o.rim ?? false, tintMul: o.tint, maxPx: o.maxPx, opacity: o.opacity,
  };
};
/** a prop card standing on the ground: design (dw x dh) with its base at design y = base, world width w */
export const propCard = (key: string, draw: (p: KPen) => unknown, dw: number, dh: number, base: number, w: number, at: V3, o: Partial<Card> = {}): Card => {
  const h = (w * dh) / dw;
  return { key, draw, dw, dh, w, pos: [at[0], at[1] - ((dh - base) / dh) * h, at[2]], ...o };
};
void PAL;
