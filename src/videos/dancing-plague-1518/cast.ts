// The cast of "The Dancing Plague of 1518", drawn with the visual kit (src/engine/kit: people.ts + face.ts) as cards on the
// kit card stage, re-dressed for Strasbourg 1518: linen shirts under coloured doublets and hose, flat bonnets (drawn here on
// top of the kit card), women in long skirts with laced bodices and white coifs/veils, a physician in a long black gown and
// red cap, councillors in fur-trimmed robes with chains, musicians (tabor drum, pipe, horn drawn at the hand anchors),
// a carpenter, a scribe, a priest, a famine family. Respect: the dancers are frightened, exhausted people, never a joke.
// dance(t, seed) is the frame-pure dance: beat, steps, arm figures, sway, hops (seeded per dancer).
import type { Card, V3 } from "../../engine/kit/stage";
import { drawPerson, type Person, type Pose, type Anchors, type Gesture } from "../../engine/kit/people";
import { KPen, SKINS, hash, pick, rad, rrect, ellPts, shade, PAL, type P2 } from "../../engine/kit/core";
import type { Expr } from "../../engine/kit/face";

const H = (seed: number, k: number) => hash(seed * 1.91 + 0.23, k);
const HAIR = ["#1b1411", "#2a1c14", "#4a2e1c", "#6a4a2a", "#8a5a30", "#3a2418"];
const base = (seed: number, build: Person["build"]): Omit<Person, "look"> => ({
  build, seed, height: (build === "boy" || build === "girl" ? 0.92 : 0.93) + 0.12 * H(seed, 1), girth: 0.82 + 0.35 * H(seed, 2) ** 1.5,
  skin: pick(SKINS.slice(0, 4), H(seed, 3)), hairCol: pick(HAIR, H(seed, 4)), age: H(seed, 5) * 0.55,
});
const DOUBLET = ["#1f5f66", "#2f8f83", "#b5532f", "#d9a441", "#3f6a4a", "#8a3a2a", "#173f46", "#c4683a"];
const HOSE = ["#5a3a26", "#3a4a3a", "#2a3a40", "#7a4a2a", "#8a6a4a", "#1f4a50", "#a8482a"];
const SKIRT = ["#1f5f66", "#a8482a", "#2f8f83", "#d9a441", "#5a3a26", "#3f6a4a", "#c8323a", "#173f46"];
const BODICE = ["#c8323a", "#1f5f66", "#d9a441", "#2f8f83", "#5a3a26", "#173f46"];
const LINEN = ["#f6ecd2", "#efe4c8", "#f3f0e6", "#e9dcc0"];

// ---------------- people ----------------
export type Dressed = { P: Person; bonnet?: string; feather?: string };
/** townsman 1518: linen shirt, coloured doublet (as a waistcoat over it), hose, flat bonnet or bare head */
export const townsman = (seed: number): Dressed => {
  const P: Person = { ...base(seed, "man"), look: {
    top: "shirt", topCol: pick(LINEN, H(seed, 10)), vestCol: pick(DOUBLET, H(seed, 11)),
    bottom: "trousers", bottomCol: pick(HOSE, H(seed, 12)), bottomPat: H(seed, 13) < 0.2 ? "stripes" : undefined, bottomPatCol: shade(pick(HOSE, H(seed, 12)), 0.7),
    hat: "none", feet: "shoes", feetCol: "#3a2a1e", hair: pick(["short", "curly", "wavy", "short"] as const, H(seed, 14)),
    facial: pick(["beard", "none", "stubble", "moustache", "beard", "none"] as const, H(seed, 15)), sash: H(seed, 16) < 0.5 ? pick(["#d9a441", "#c8323a", "#2f8f83"], H(seed, 17)) : undefined,
    extras: H(seed, 18) < 0.4 ? ["rolled_sleeves"] : [],
  } };
  const b = H(seed, 19);
  return { P, bonnet: b < 0.65 ? pick(["#1f2a2e", "#5a3a26", "#c8323a", "#1f5f66", "#2a2a2e"], H(seed, 20)) : undefined, feather: b < 0.2 ? pick([PAL.cream, PAL.sun], H(seed, 21)) : undefined };
};
/** townswoman 1518: linen blouse, laced bodice (vest), long skirt, white coif / veil or a coloured headcloth */
export const townswoman = (seed: number): Dressed => {
  const v = H(seed, 22);
  return { P: { ...base(seed, "woman"), look: {
    top: "kurta_short", topCol: pick(LINEN, H(seed, 20)), sleeves: "long", vestCol: pick(BODICE, H(seed, 23)),
    bottom: "ghagra", bottomCol: pick(SKIRT, H(seed, 21)), bottomPat: H(seed, 24) < 0.25 ? "stripes" : undefined, bottomPatCol: shade(pick(SKIRT, H(seed, 21)), 0.75),
    borderCol: H(seed, 25) < 0.5 ? pick(["#d9a441", "#f6ecd2", "#1f5f66"], H(seed, 26)) : undefined,
    hat: v < 0.55 ? "veil" : v < 0.85 ? "headcloth" : "none", hatCol: v < 0.55 ? pick(["#f6f2e6", "#f3ecd8"], H(seed, 27)) : pick(["#2f8f83", "#d9a441", "#c8323a", "#f6ecd2"], H(seed, 27)),
    hair: pick(["bun", "braid"] as const, H(seed, 28)), feet: "shoes", feetCol: "#3a2a1e", extras: [],
  } } };
};
export const youth = (seed: number, girl = false): Dressed => girl
  ? { P: { ...base(seed, "girl"), look: { top: "kurta_short", topCol: pick(LINEN, H(seed, 30)), sleeves: "long", vestCol: pick(BODICE, H(seed, 31)), bottom: "ghagra", bottomCol: pick(SKIRT, H(seed, 32)), hair: "braid", feet: "shoes", feetCol: "#3a2a1e", hat: "none" } } }
  : { P: { ...base(seed, "boy"), look: { top: "shirt", topCol: pick(LINEN, H(seed, 33)), vestCol: pick(DOUBLET, H(seed, 34)), bottom: "trousers", bottomCol: pick(HOSE, H(seed, 35)), hair: "curly", feet: "shoes", feetCol: "#3a2a1e", hat: "none" } }, bonnet: H(seed, 36) < 0.5 ? "#5a3a26" : undefined };
/** a dancer of either sex, by seed */
export const dancer = (seed: number): Dressed => { const k = H(seed, 40); return k < 0.48 ? townswoman(seed) : k < 0.93 ? townsman(seed) : youth(seed, k < 0.965); };

/** the woman who started it (later accounts call her Frau Troffea): sea-green skirt, sunflower bodice, white coif */
export const FIRST: Dressed = (() => { const w = townswoman(301); return { P: { ...w.P, height: 1.0, skin: SKINS[1], hairCol: "#6a4a2a", age: 0.2, look: { ...w.P.look, bottomCol: "#2f8f83", bottomPat: undefined, vestCol: "#d9a441", hat: "veil", hatCol: "#f6f2e6", borderCol: "#f6ecd2" } } }; })();
export const HUSB: Dressed = (() => { const m = townsman(302); return { ...m, P: { ...m.P, age: 0.3, look: { ...m.P.look, vestCol: "#1f5f66", facial: "beard" } }, bonnet: "#2a2a2e" }; })();
/** the physician: long black gown (fur-edged), red cap, grey beard */
export const PHYSICIAN: Dressed = (() => { const b = base(303, "man"); return { P: { ...b, height: 1.02, girth: 1.15, age: 0.7, hairCol: "#cfcac0", skin: SKINS[0], look: {
  top: "angrakha", topCol: "#1c2428", trimCol: "#8a6a4a", bottom: "pyjama", bottomCol: "#1c2428", hat: "none", feet: "shoes", feetCol: "#1a1a1a", hair: "short", facial: "beard", extras: [],
  shawl: "#2a3438", shawlTrim: "#a8845a" } }, bonnet: "#b5322a" }; })();
/** councillors: fur-trimmed robes, a gold chain */
export const councillor = (seed: number, col: string): Dressed => { const b = base(seed, "man"); return { P: { ...b, girth: 1.25, age: 0.55 + 0.3 * H(seed, 50), look: {
  top: "jacket", topCol: col, trimCol: "#d9a441", bottom: "trousers", bottomCol: "#2a2a2e", shawl: shade(col, 0.6), shawlTrim: "#c8a878", hat: "none", feet: "shoes", feetCol: "#1a1a1a",
  hair: pick(["bald", "short", "parted"] as const, H(seed, 51)), facial: pick(["beard", "chops", "moustache"] as const, H(seed, 52)), extras: ["medal"] } }, bonnet: "#1f2226" }; };
export const COUNCIL_A = councillor(311, "#1f5f66");
export const COUNCIL_B = councillor(312, "#8a3a2a");
/** musicians */
export const DRUMMER: Dressed = (() => { const m = townsman(321); return { ...m, P: { ...m.P, look: { ...m.P.look, vestCol: "#c8323a", sash: "#d9a441", facial: "moustache" } }, bonnet: "#1f5f66", feather: PAL.sun }; })();
export const PIPER: Dressed = (() => { const m = townsman(322); return { ...m, P: { ...m.P, age: 0.15, look: { ...m.P.look, vestCol: "#d9a441", bottomCol: "#1f5f66", facial: "none" } }, bonnet: "#c8323a", feather: PAL.cream }; })();
export const HORNIST: Dressed = (() => { const m = townsman(323); return { ...m, P: { ...m.P, girth: 1.2, look: { ...m.P.look, vestCol: "#2f8f83", bottomCol: "#7a4a2a", facial: "beard" } }, bonnet: "#2a2a2e" }; })();
export const CARPENTER: Dressed = (() => { const m = townsman(324); return { P: { ...m.P, look: { ...m.P.look, vestCol: "#8a6a4a", extras: ["rolled_sleeves"], facial: "stubble" } } }; })();
/** the clerk in the archive, the priest, the famine family */
export const SCRIBE_P: Dressed = (() => { const m = townsman(331); return { ...m, P: { ...m.P, age: 0.6, hairCol: "#bdb8ae", look: { ...m.P.look, top: "angrakha", topCol: "#1f4a50", trimCol: "#d9a441", vestCol: undefined, facial: "beard", hair: "bald" } }, bonnet: undefined }; })();
export const PRIEST: Dressed = (() => { const b = base(332, "man"); return { P: { ...b, age: 0.6, hairCol: "#8a8478", look: { top: "angrakha", topCol: "#1c2226", trimCol: "#f6f0de", bottom: "pyjama", bottomCol: "#1c2226", hat: "none", feet: "shoes", feetCol: "#111", hair: "bald", facial: "none", shawl: "#f6f0de", shawlTrim: "#d9a441", extras: [] } } }; })();
export const MOTHER_P: Dressed = (() => { const w = townswoman(341); return { P: { ...w.P, girth: 0.8, look: { ...w.P.look, top: "kurta_short", topCol: "#d8ccb0", vestCol: "#6a5a44", bottomCol: "#5a5a48", bottomPat: undefined, borderCol: undefined, hat: "headcloth", hatCol: "#b8ac90" } } }; })();
export const CHILD_P: Dressed = (() => { const k = youth(342, true); return { P: { ...k.P, girth: 0.75, look: { ...k.P.look, topCol: "#d8ccb0", vestCol: "#7a6a54", bottomCol: "#6a5e4a" } } }; })();
export const OLDMAN_P: Dressed = (() => { const m = townsman(343); return { P: { ...m.P, age: 0.95, girth: 0.78, hairCol: "#e2ded4", look: { ...m.P.look, vestCol: "#5a4a3a", bottomCol: "#5a5040", facial: "beard", sash: undefined } }, bonnet: "#4a3e30" }; })();
/** the statue of St Vitus: a youth in a painted-wood palette (teal cloak, sunflower tunic), on a plinth */
export const VITUS: Dressed = (() => { const b = base(351, "man"); return { P: { ...b, height: 0.95, skin: "#e8cfa8", hairCol: "#6a4a2a", age: 0, look: {
  top: "kurta", topCol: "#d9a441", trimCol: "#f6ecd2", bottom: "trousers", bottomCol: "#2f8f83", hat: "none", feet: "shoes", feetCol: "#5a3a26", hair: "curly", facial: "none",
  shawl: "#1f5f66", shawlTrim: "#d9a441", extras: [] } } }; })();
/** the bystander of shot 18 */
export const BYST: Dressed = (() => { const m = townsman(361); return { ...m, P: { ...m.P, age: 0.12, skin: SKINS[2], hairCol: "#2a1c14", look: { ...m.P.look, vestCol: "#2f8f83", bottomCol: "#5a3a26", facial: "none", hair: "curly" } }, bonnet: "#c8323a", feather: PAL.sun }; })();

// ---------------- overlays at the kit anchors ----------------
type Extra = (k: KPen, A: Anchors, P: Person, pose: Pose) => void;
const rigH = (P: Person) => { const kid = P.build === "boy" || P.build === "girl", fem = P.build === "woman" || P.build === "girl"; const T = (kid ? 500 : fem ? 720 : 770) * P.height; const h = T / (kid ? 3.7 : 4.7); return { H: h, W: h * (fem ? 0.84 : 0.88) * (0.94 + 0.06 * P.girth) }; };
/** a 1500s flat bonnet (beret) tipped on the head, an optional feather */
const bonnetX = (col: string, feather?: string): Extra => (k, A, P, pose) => {
  const { H: h, W } = rigH(P), [x, y] = A.head, side = pose.view === "side";
  k.g.save(); k.g.translate(x, y + 0.45 * h); k.g.rotate(rad(pose.headTilt ?? 0)); k.g.translate(-x, -(y + 0.45 * h));
  const cx = x + (side ? -0.06 : 0.04) * W, cy = y - 0.36 * h;
  if (feather) k.poly([[cx + 0.25 * W, cy - 0.02 * h], ...ellPts(cx + 0.55 * W, cy - 0.3 * h, 0.12 * W, 0.34 * h, 200, 380, -35, 12)], feather, k.ow * 0.6);
  k.poly(ellPts(cx, cy, 0.66 * W, 0.17 * h, 0, 360, -6, 28), col);
  k.poly(ellPts(cx, cy - 0.04 * h, 0.44 * W, 0.15 * h, 180, 360, -6, 16), shade(col, 1.15), k.ow * 0.6);
  k.stroke([[cx - 0.56 * W, cy + 0.06 * h], [cx + 0.56 * W, cy - 0.02 * h]], 4, shade(col, 0.6));
  k.g.restore();
};
/** a pipe (fife) from the hands to the mouth */
const pipeX: Extra = (k, A, P) => {
  const { H: h } = rigH(P), [x, y] = A.head, m: P2 = [x + 0.05 * h, y + 0.3 * h], hd = A.hands[1] ?? A.hands[0];
  if (!hd) return;
  const dx = hd[0] - m[0], dy = hd[1] - m[1], l = Math.hypot(dx, dy) || 1, e: P2 = [m[0] + dx / l * (l + 0.35 * h), m[1] + dy / l * (l + 0.35 * h)];
  k.band([m, e], "#c49a5a", 0.07 * h, 3);
  for (let i = 1; i < 4; i++) k.dot(m[0] + dx / l * (l * 0.4 + i * 0.12 * h), m[1] + dy / l * (l * 0.4 + i * 0.12 * h), 0.018 * h, "#10222b");
};
/** a tabor drum at the hip (under the left hand) and a stick in the right */
const drumX = (t: number): Extra => (k, A, P) => {
  const { H: h, W } = rigH(P), hl = A.hands[0], hr = A.hands[1];
  if (!hl || !hr) return;
  const cx = (hl[0] + hr[0]) / 2, cy = Math.max(hl[1], hr[1]) + 0.32 * h;
  k.poly(rrect(cx - 0.55 * W, cy - 0.3 * h, cx + 0.55 * W, cy + 0.32 * h, 10), k.lin(cx - 0.55 * W, 0, cx + 0.55 * W, 0, [[0, "#d84a3a"], [0.5, "#c8323a"], [1, "#8a2a22"]]));
  for (let i = 0; i < 6; i++) { const a = cx - 0.5 * W + i * 0.2 * W; k.stroke([[a, cy - 0.28 * h], [a + 0.1 * W, cy + 0.3 * h]], 3, PAL.cream); }
  k.ell(cx, cy - 0.3 * h, 0.55 * W, 0.1 * h, "#f3e6c4");
  const hit = Math.abs(Math.sin(t * Math.PI * 4));
  k.band([hr, [hr[0] - 0.25 * W, hr[1] - 0.15 * h - 0.25 * h * hit]], "#7a4a2a", 0.05 * h, 2.5);
};
/** a straight horn (shawm-like) from the mouth, bell up and out */
const hornX: Extra = (k, A, P) => {
  const { H: h } = rigH(P), [x, y] = A.head, m: P2 = [x + 0.05 * h, y + 0.32 * h], e: P2 = [m[0] + 0.9 * h, m[1] - 0.55 * h];
  k.band([m, e], PAL.brass, 0.07 * h, 3);
  k.poly([[e[0] - 0.05 * h, e[1] + 0.09 * h], [e[0] + 0.2 * h, e[1] - 0.2 * h], [e[0] + 0.3 * h, e[1] - 0.05 * h], [e[0] + 0.07 * h, e[1] + 0.1 * h]], "#e6b84a");
};
/** a hammer in the near hand, swinging */
const hammerX = (sw: number): Extra => (k, A, P) => {
  const { H: h } = rigH(P), hd = A.hands[1] ?? A.hands[0];
  if (!hd) return;
  const a = -1.2 + 1.3 * sw, e: P2 = [hd[0] + Math.cos(a) * 0.5 * h, hd[1] + Math.sin(a) * 0.5 * h];
  k.band([hd, e], "#9a6a42", 0.05 * h, 2.5);
  k.poly([[e[0] - 0.12 * h, e[1] - 0.06 * h], [e[0] + 0.12 * h, e[1] - 0.06 * h], [e[0] + 0.12 * h, e[1] + 0.06 * h], [e[0] - 0.12 * h, e[1] + 0.06 * h]], "#5a6a6e");
};
/** an empty wooden bowl in a hand */
const bowlX: Extra = (k, A, P) => {
  const { H: h } = rigH(P), hd = A.hands[1] ?? A.hands[0];
  if (!hd) return;
  k.poly([...ellPts(hd[0], hd[1] - 0.05 * h, 0.22 * h, 0.14 * h, 0, 180, 0, 12)], "#9a6a42");
  k.ell(hd[0], hd[1] - 0.05 * h, 0.22 * h, 0.05 * h, "#5a3a26");
};
export const X = { pipe: pipeX, drum: drumX, horn: hornX, hammer: hammerX, bowl: bowlX };

// ---------------- the dance ----------------
const FIG: [Gesture, Gesture][] = [["raise", "raise"], ["raise", "reach"], ["wave", "raise"], ["reach", "raise"], ["raise", "wave"], ["reach", "reach"], ["swing", "raise"], ["raise", "swing"], ["wave", "wave"]];
/** close-up figures: arms out and up at the sides, never across the face */
const FIG_CLOSE: [Gesture, Gesture][] = [["reach", "reach"], ["reach", "raise"], ["raise", "reach"], ["swing", "reach"], ["reach", "swing"]];
/** a plague, not a party: frantic, strained, frightened, exhausted faces (no smiles) */
const MOOD: Expr[][] = [["worried", "surprised", "sad"], ["surprised", "worried", "angry"], ["sad", "worried", "surprised"], ["worried", "angry", "worried"]];
/** the dance of one person (seeded), at time t (s). energy 0..1 scales the sway/hop; close = arm figures that keep the face clear.
 *  Returns pose + card hop (m) + card tilt (rad). */
export type Dance = { pose: Pose; hop: number; tilt: number; flip: boolean; sweat: number };
/** the frantic dance of one person (seeded), at time t (s): fast bobbing, big leans, arm figures, and for "spinners" a turn
 *  front -> profile -> front -> mirrored profile on the beat (with a running-leg kick in profile). Mouths pant (talk), faces are
 *  strained / frightened. energy 0..1.3 scales everything; close = arm figures that keep the face clear (close-ups). */
export const dance = (t: number, seed: number, energy = 1, close = false): Dance => {
  const per = 0.3 + 0.14 * hash(seed, 1), b = t / per + hash(seed, 2) * 8, k = Math.floor(b * 0.5 + hash(seed, 3) * 3);
  const s = Math.sin(b * Math.PI * 2), c = Math.cos(b * Math.PI), e = energy;
  const mood: Expr[] = close ? ["surprised", "surprised", "worried"] : MOOD[Math.floor(hash(seed, 4) * MOOD.length)], expr = mood[Math.floor(hash(Math.floor(t / 1.7 + hash(seed, 5) * 5), seed) * mood.length)];
  const spinner = close ? e > 1.1 : hash(seed, 8) < 0.42 && e > 0.5, step = Math.floor(b * 0.5 + hash(seed, 9) * 4) % 4;
  const side = spinner && (step === 1 || step === 3);
  const figs: [Gesture, Gesture][] = close ? (e > 1.1 ? [["raise", "raise"], ["raise", "reach"], ["reach", "raise"]] : FIG_CLOSE) : FIG;
  const pose: Pose = side
    ? { t, view: "side", gait: "run", phase: ((b % 1) + 1) % 1, turn: 0.55, arms: hash(k, seed + 3) < 0.5 ? ["raise", "reach"] : ["swing", "raise"], expr, lean: 10 * e * s, headTilt: -12 * e }
    : {
      t, gait: "walk", phase: ((b % 1) + 1) % 1, arms: figs[Math.floor(hash(k, seed) * figs.length)], expr,
      lean: (close ? 9 : 21) * e * s, headTilt: (close ? 12 : 22) * e * Math.sin(b * Math.PI + hash(seed, 6) * 3), turn: (close ? 0.16 : 0.45) * Math.sin(b * Math.PI * 0.5 + hash(seed, 7) * 6), wave: (b * 2) % 1,
      look: close ? [0.3 * Math.sin(b * 0.9), 0.2] : "idle",
    };
  return { pose, hop: 0.24 * e * Math.abs(c), tilt: (side ? 0.06 : 0.15) * e * s, flip: side && step === 3, sweat: e };
};
/** sweat drops flung off the head (frame-pure arcs), drawn on top of a dancer card */
export const sweatX = (t: number, seed: number): Extra => (k, A, P) => {
  const { H: h } = rigH(P), [x, y] = A.head;
  for (let i = 0; i < 6; i++) {
    const u = ((t * 1.6 + hash(i, seed)) % 1 + 1) % 1, sd = i % 2 ? 1 : -1;
    const px = x + sd * (0.55 * h + 0.5 * h * u), py = y - 0.35 * h - 0.5 * h * u + 0.9 * h * u * u;
    if (u > 0.85) continue;
    k.poly([[px, py - 0.14 * h], [px + 0.07 * h, py], [px, py + 0.06 * h], [px - 0.07 * h, py]], "#a8e4f0", k.ow * 0.55);
  }
};

// ---------------- cards ----------------
/** card metres: 600 x 1000 design units = 1.296 m x 2.16 m; soles at y 975 */
export const CARD_W = 1.296, SOLE = (25 / 1000) * 2.16;
const q = (v: number) => Math.round(v * 120) / 120;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
export type PersonOpts = { flip?: boolean; scale?: number; tint?: [number, number, number]; rim?: boolean; maxPx?: number; extra?: Extra; extraKey?: string; opacity?: number; rot?: number };
export const personCard = (name: string, D: Dressed, pose: Pose, at: V3, o: PersonOpts = {}): Card => {
  const s = o.scale ?? 1, bon = D.bonnet ? bonnetX(D.bonnet, D.feather) : undefined, ex = o.extra;
  return {
    key: `P|${name}|${fkey(pose)}|${o.extraKey ?? ""}|${q(o.rot ?? 0)}`,
    draw: (p) => { const A = drawPerson(p, D.P, pose); if (bon) bon(p, A, D.P, pose); ex?.(p, A, D.P, pose); },
    dw: 600, dh: 1000, w: CARD_W * s, pos: [at[0], at[1] - SOLE * s, at[2]], rot: o.rot,
    flip: o.flip, rim: o.rim ?? true, tintMul: o.tint, maxPx: o.maxPx, opacity: o.opacity,
  };
};
/** a prop card standing on the ground: design (dw x dh) with its base at design y = base, world width w */
export const propCard = (key: string, draw: (p: KPen) => unknown, dw: number, dh: number, base: number, w: number, at: V3, o: Partial<Card> = {}): Card => {
  const h = (w * dh) / dw;
  return { key, draw, dw, dh, w, pos: [at[0], at[1] - ((dh - base) / dh) * h, at[2]], ...o };
};
