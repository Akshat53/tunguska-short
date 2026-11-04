// The cast of "Could YOU Survive? Ep 1: The Titanic" on the kit card stage. "You" are the series mascot
// (src/engine/kit/mascot.ts, TITANIC_1912 outfit). The others are kit people (src/engine/kit/people.ts) in 1912 clothes:
// Charles Joughin, the portly chief baker (white baker's jacket and apron, cork life jacket, moustache); Fifth Officer
// Harold Lowe (navy officer's coat, brass buttons, peaked cap) holding the lantern up in Lifeboat 14; rowers and passengers
// in the boats (crew jerseys, overcoats, shawls, hats); far swimmers as small, dignified silhouettes in life jackets
// (heads and shoulders above the water, never graphic).
import type { Card, V3 } from "../../engine/kit/stage";
import { drawPerson, type Person, type Pose, type Anchors } from "../../engine/kit/people";
import { KPen, hash, pick, shade, tint, rgba, ellPts, TAU, type P2 } from "../../engine/kit/core";
import { drawAsset } from "../../engine/kit/assets";

const H = (seed: number, k: number) => hash(seed * 1.91 + 0.37, k);
const SKIN = ["#f3d2b3", "#e8b98f", "#d9a27a", "#c78c62", "#b0754e"];
const HAIRS = ["#2a1c14", "#3a2618", "#5a3a22", "#1b1411", "#7a5a3a", "#bdb8ae"];
const COATS = ["#2a3440", "#3a3a3e", "#4a3a2e", "#2f3a34", "#3e4652", "#5a4a3a"];

export type Dressed = { P: Person; vest?: boolean; apron?: boolean; bakerCap?: boolean };
const base = (seed: number, build: Person["build"], h0: number): Omit<Person, "look"> => ({
  build, seed, height: h0 + 0.08 * H(seed, 1), girth: 0.85 + 0.3 * H(seed, 2), skin: pick(SKIN, H(seed, 3)), hairCol: pick(HAIRS, H(seed, 4)), age: 0.5 * H(seed, 5),
});
/** a 1912 passenger or crewman / woman (overcoat or jersey, cap or hat), optionally with a cork life jacket */
export const passenger = (seed: number, vest = true): Dressed => {
  const fem = H(seed, 10) < 0.35;
  if (fem) {
    const b = base(seed, "woman", 0.9);
    return { vest, P: { ...b, look: { top: "blouse", topCol: pick(["#4a3a4a", "#3a4a52", "#5a3a32", "#2f3a34"], H(seed, 11)), sleeves: "long", bottom: "ghagra", bottomCol: pick(COATS, H(seed, 12)),
      shawl: H(seed, 13) < 0.6 ? pick(["#8a6a4a", "#5a6a6a", "#7a4a3a"], H(seed, 14)) : undefined, hat: H(seed, 15) < 0.5 ? "headcloth" : "none", hatCol: pick(["#3a3a3e", "#5a4a3a"], H(seed, 16)), hair: "bun", feet: "shoes", feetCol: "#1f1a16" } } };
  }
  const b = base(seed, "man", 0.94);
  return { vest, P: { ...b, look: { top: H(seed, 20) < 0.5 ? "jacket" : "shirt", topCol: pick(COATS, H(seed, 21)), bottom: "trousers", bottomCol: pick(COATS, H(seed, 22)),
    hat: H(seed, 23) < 0.45 ? "cap" : "none", hatCol: pick(["#2a2a2e", "#4a3a2e", "#3a4040"], H(seed, 24)), hair: "short", facial: pick(["none", "moustache", "none", "stubble", "beard"] as const, H(seed, 25)), feet: "boots", feetCol: "#1a1a1a" } } };
};
/** Charles Joughin, chief baker: portly, white baker's jacket, apron, moustache, cork life jacket */
export const JOUGHIN: Dressed = { vest: true, apron: true, bakerCap: true, P: { build: "man", seed: 1912, height: 0.98, girth: 1.45, skin: "#e8b98f", hairCol: "#5a3a24", age: 0.4,
  look: { top: "jacket", topCol: "#f4f2ea", trimCol: "#dcd8cc", bottom: "trousers", bottomCol: "#3a3a3e", hat: "none", hair: "short", facial: "moustache", feet: "boots", feetCol: "#1a1a1a", extras: [] } } };
/** Fifth Officer Harold Lowe: navy officer's coat with brass buttons, peaked cap */
export const LOWE: Dressed = { P: { build: "man", seed: 1914, height: 1.0, girth: 1.0, skin: "#e8b98f", hairCol: "#2a1c14", age: 0.25,
  look: { top: "officer_coat", topCol: "#1c2a3c", trimCol: "#d6a542", bottom: "trousers", bottomCol: "#1c2a3c", hat: "forage", hatCol: "#1c2a3c", hatTrim: "#d6a542", hair: "short", facial: "none", feet: "boots", feetCol: "#111", extras: ["brass_buttons"] } } };

// ---------------- overlays ----------------
const rigH = (P: Person) => { const fem = P.build === "woman" || P.build === "girl"; const T = (fem ? 720 : 770) * P.height; return { H: T / 4.7, T }; };
/** the cork life jacket over the chest (front view) */
export const lifeVest = (k: KPen, A: Anchors, P: Person) => {
  const { H: h } = rigH(P), [x, y] = A.head, top = y + 0.62 * h, w = 0.56 * h * (0.9 + 0.12 * P.girth);
  for (const s of [-1, 1]) {
    const pts: P2[] = [[x + s * 0.08 * h, top], [x + s * w, top + 0.06 * h], [x + s * w * 1.04, top + 1.05 * h], [x + s * 0.08 * h, top + 1.1 * h]];
    k.poly(pts, k.lin(x - w, 0, x + w, 0, [[0, "#f6efdc"], [0.6, "#ece3cc"], [1, "#cfc4a8"]]), k.ow * 0.8);
    for (let r = 1; r < 4; r++) k.stroke([[x + s * 0.1 * h, top + r * 0.27 * h], [x + s * w, top + r * 0.27 * h + 0.02 * h]], k.ow * 0.4, rgba("#10222b", 0.45));
  }
  k.stroke([[x - w * 0.8, top + 0.55 * h], [x + w * 0.8, top + 0.57 * h]], 0.05 * h, "#f8f3e6");
};
/** a short pleated white baker's cap on the head */
const bakerCap = (k: KPen, A: Anchors, P: Person) => {
  const { H: h } = rigH(P), [x, y] = A.head, w = 0.98 * h, top = y - 0.6 * h, band = y - 0.1 * h;
  const puff: P2[] = [[x - w * 0.5, band], ...ellPts(x, top + 0.12 * h, w * 0.62, 0.3 * h, 180, 360, 0, 16), [x + w * 0.5, band]];
  k.poly(puff, k.lin(x - w / 2, 0, x + w / 2, 0, [[0, "#ffffff"], [0.6, "#eeeee6"], [1, "#c9ccc4"]]), k.ow * 0.8);
  for (let i = -2; i <= 2; i++) k.stroke([[x + i * w * 0.16, band - 0.02 * h], [x + i * w * 0.2, top + 0.02 * h]], k.ow * 0.35, rgba("#10222b", 0.35));
  k.poly([[x - w * 0.52, band - 0.12 * h], [x + w * 0.52, band - 0.12 * h], [x + w * 0.5, band + 0.02 * h], [x - w * 0.5, band + 0.02 * h]], "#f6f6f0", k.ow * 0.8);
};
/** a baker's white apron bib with a tie */
const apron = (k: KPen, A: Anchors, P: Person) => {
  const { H: h } = rigH(P), [x, y] = A.head, top = y + 0.85 * h;
  k.poly([[x - 0.3 * h, top], [x + 0.3 * h, top], [x + 0.36 * h, top + 1.5 * h], [x - 0.36 * h, top + 1.5 * h]], "#fbfaf4", k.ow * 0.6);
  k.stroke([[x - 0.3 * h, top], [x - 0.42 * h, top - 0.32 * h]], 0.05 * h, "#fbfaf4");
  k.stroke([[x + 0.3 * h, top], [x + 0.42 * h, top - 0.32 * h]], 0.05 * h, "#fbfaf4");
  k.stroke([[x - 0.18 * h, top + 0.4 * h], [x + 0.18 * h, top + 0.42 * h]], k.ow * 0.35, rgba("#10222b", 0.3));
};
/** the Blender lantern in the raised (highest) hand */
export const lanternX = (k: KPen, A: Anchors, P: Person) => {
  const { H: h } = rigH(P), hd = A.hands.reduce<P2 | undefined>((m, q) => (!m || q[1] < m[1] ? q : m), undefined);
  if (hd) drawAsset(k, "props/lantern.png", hd[0], hd[1] + 0.95 * h, 0.42 * h);
};
/** a little pewter hip flask in the raised hand (the whisky legend) */
export const flaskX = (k: KPen, A: Anchors, P: Person) => {
  const { H: h } = rigH(P), hd = A.hands.reduce<P2 | undefined>((m, q) => (!m || q[1] < m[1] ? q : m), undefined);
  if (!hd) return;
  const [x, y] = hd, w = 0.15 * h, hh = 0.22 * h;
  k.poly([[x - w / 2, y - hh], [x + w / 2, y - hh], [x + w / 2 + 2, y + 0.02 * h], [x - w / 2 - 2, y + 0.02 * h]], k.lin(x - w / 2, 0, x + w / 2, 0, [[0, "#d9dfe0"], [0.5, "#a9b2b4"], [1, "#6f7a7c"]]), k.ow * 0.7);
  k.poly([[x - 0.04 * h, y - hh - 0.07 * h], [x + 0.04 * h, y - hh - 0.07 * h], [x + 0.04 * h, y - hh], [x - 0.04 * h, y - hh]], "#6f7a7c", k.ow * 0.5);
  k.stroke([[x - w * 0.3, y - hh * 0.8], [x - w * 0.3, y - hh * 0.2]], 0.03 * h, rgba("#ffffff", 0.7));
};

// ---------------- cards ----------------
/** card metres: 600 x 1000 design units = 1.296 m x 2.16 m; soles at y 975 */
export const CARD_W = 1.296, CARD_H = 2.16;
const q = (v: number) => Math.round(v * 120) / 120;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
type Extra = (k: KPen, A: Anchors, P: Person) => void;
/** design y of the waterline for a person floating chest-deep */
export const waterY = (P: Person) => { const { T, H: h } = rigH(P); return 975 - T + h * 1.0 + h * 0.27 + h * 0.55; };
/** draw a person cut at the waterline wl (design y): ripple rings behind/in front, foam collar */
export const drawWading = (p: KPen, D: Dressed, pose: Pose, wl: number, t: number, extra?: Extra, foam = 1) => {
  const g = p.g, cx = 300, seed = D.P.seed;
  const ring = (front: boolean) => {
    for (let k = 0; k < 2; k++) {
      const ph = ((t * 0.5 + k / 2 + hash(seed, 3)) % 1 + 1) % 1, rx = 120 + 200 * ph, ry = 16 + 24 * ph;
      p.stroke(ellPts(cx, wl + 3, rx, ry, front ? 10 : 190, front ? 170 : 350, 0, 20), 4 * (1 - 0.5 * ph), rgba("#cfeaf0", 0.6 * foam * (1 - ph) ** 1.4));
    }
  };
  ring(false);
  g.save(); g.beginPath(); g.rect(-50, -50, 700, wl + 52); g.clip();
  const A = drawPerson(p, D.P, pose);
  if (D.apron) apron(p, A, D.P);
  if (D.vest) lifeVest(p, A, D.P);
  if (D.bakerCap) bakerCap(p, A, D.P);
  extra?.(p, A, D.P);
  g.restore();
  ring(true);
  const fo: P2[] = []; for (let i = 0; i <= 16; i++) { const u = i / 16; fo.push([cx - 130 + 260 * u, wl + 6 * Math.sin(u * Math.PI) + 3 * Math.sin(t * 4 + u * 9 + seed)]); }
  p.stroke(fo, 8, rgba("#e8f6f8", 0.6 * foam)); p.stroke(fo, 2.5, rgba("#ffffff", 0.8 * foam));
  return A;
};
export type PersonOpts = { flip?: boolean; scale?: number; tint?: [number, number, number]; maxPx?: number; extra?: Extra; extraKey?: string; opacity?: number; rot?: number; foam?: number };
/** a person floating in the sea with the waterline at at[1] (cut at the chest) */
export const wadeCard = (name: string, D: Dressed, pose: Pose, at: V3, t: number, o: PersonOpts = {}): Card => {
  const s = o.scale ?? 1, wl = waterY(D.P), tq = Math.round(t * 10) / 10;
  return {
    key: `W|${name}|${fkey(pose)}|${o.extraKey ?? ""}|${tq}|${q(o.rot ?? 0)}`,
    draw: (p) => { drawWading(p, D, pose, wl, tq, o.extra, o.foam ?? 1); },
    dw: 600, dh: 1000, w: CARD_W * s, pos: [at[0], at[1] - ((1000 - wl) / 1000) * CARD_H * s, at[2]], rot: o.rot,
    flip: o.flip, tintMul: o.tint, maxPx: o.maxPx, opacity: o.opacity, order: 2,
  };
};
/** a prop card standing on the water / ground: design (dw x dh) with its base at design y = base, world width w */
export const propCard = (key: string, draw: (p: KPen) => unknown, dw: number, dh: number, base: number, w: number, at: V3, o: Partial<Card> = {}): Card => {
  const h = (w * dh) / dw;
  return { key, draw, dw, dh, w, pos: [at[0], at[1] - ((dh - base) / dh) * h, at[2]], ...o };
};
/** a calm treading-water pose for a kit person (hands at the surface, a little bob) */
export const treading = (t: number, seed: number, over: Partial<Pose> = {}): Pose => ({
  t, expr: "worried", arms: hash(seed, 3) < 0.5 ? ["cover", "cover"] : ["fold", "fold"], look: "idle", headTilt: 4 * Math.sin(t * 0.9 + seed), turn: 0.3 * Math.sin(seed * 1.7), ...over,
});
void shade; void tint; void TAU;
