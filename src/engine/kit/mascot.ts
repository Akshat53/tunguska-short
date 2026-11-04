// Visual kit: the series mascot of "Could YOU Survive?" (Inkfall global): the viewer's stand-in ("you"). A friendly,
// slightly chibi character with a signature silhouette that reads at thumbnail size: a sunflower-yellow raincoat with the
// hood down (bunched behind the neck), a teal scarf whose fringed tail flies in the wind, a cream backpack, a big chestnut
// cowlick curl, freckles and slightly bigger eyes than other kit people. Each episode dresses it in period clothes WITH the
// signature items (outfit presets below: SIGNATURE, TITANIC_1912 = the raincoat over 1912 third-class clothes + a cork
// life jacket).
// Opt-in and additive: nothing else imports this file. Frame-pure: every motion comes from pose.t (seconds) and seeds.
// Card: the kit's 600 x 1000 design box, soles at y 975 (same as people.ts), so it works with the stage like personCard.
import { KPen, P2, TAU, clamp, lerp, lerp2, hash, mix, shade, tint, rgba, ellPts, curve, tube, rad, INK } from "./core";
import { drawFace, blinkAt, gazeAt, type Expr } from "./face";
import type { Card, V3 } from "./stage";

export type MascotMood = "neutral" | "shock" | "gasp" | "shiver" | "determined" | "relief" | "worried" | "awe" | "happy" | "sad";
export type MascotArm = "hang" | "hug" | "splash" | "paddle" | "reach" | "wave" | "fist" | "cheer" | "point" | "cling" | "chin";
export type Outfit = {
  coat: string; coatLining: string; scarf: string; scarfStripe: string; pack: string; packTrim: string;
  under: string; underPat?: "stripes" | "plain"; underPatCol?: string; vest?: string;   // what shows in the coat opening
  trousers: string; boots: string;
  lifejacket?: boolean;                                                                   // the 1912 cork-block life jacket
};
/** the signature look (every episode keeps coat + scarf + pack) */
export const SIGNATURE: Outfit = {
  coat: "#f6b924", coatLining: "#1f5f66", scarf: "#1f9a94", scarfStripe: "#f6ecd2", pack: "#f3e6c8", packTrim: "#c9a86a",
  under: "#f6ecd2", underPat: "stripes", underPatCol: "#2f8f83", trousers: "#2a3a48", boots: "#1f5f66",
};
/** Ep 1, the Titanic: the raincoat over a 1912 third-class collarless striped shirt and brown wool waistcoat, tweed trousers,
 *  work boots, and a white canvas cork life jacket over everything */
export const TITANIC_1912: Outfit = {
  ...SIGNATURE, under: "#ece3cf", underPat: "stripes", underPatCol: "#7a5a46", vest: "#6a4a34", trousers: "#5a4c3e", boots: "#3a2a20", lifejacket: true,
};
export type MascotPose = {
  t?: number;                    // seconds: idle life, blinks, shiver, scarf, drips
  turn?: number;                 // -1 (profile facing screen-left) .. 0 front .. 1 (profile facing screen-right)
  mood?: MascotMood;
  arms?: [MascotArm, MascotArm]; // [screen-left, screen-right]
  phase?: number;                // splash / paddle phase offset
  shiver?: number;               // 0..1 shake + teeth chatter
  wet?: number;                  // 0..1 wet hair shine + drips
  cold?: number;                 // 0..1 red nose, frost specks
  water?: number;                // design y of the waterline: below it is clipped, ripple rings + foam drawn around the body
  wind?: number;                 // -1..1 scarf tail direction/strength (default: streams away from the facing side)
  look?: [number, number];
  headTilt?: number;             // degrees
  talk?: number;                 // 0..1 extra mouth opening (gasping / shouting)
  bob?: number;                  // design-unit vertical offset (water bob)
};
export type MascotAnchors = { head: P2; mouth: P2; hands: P2[]; water?: number };

const SKIN = "#e2ad84", HAIR = "#7a4326", HAIR_HI = "#b8703e", BROW = "#4a2616";
const MOOD: Record<MascotMood, Expr> = {
  neutral: "neutral", shock: "scared", gasp: "surprised", shiver: "worried", determined: "determined", relief: "happy",
  worried: "worried", awe: "awe", happy: "smile", sad: "sad",
};

// ---------------- helpers ----------------
const ik2 = (S: P2, T: P2, a: number, b: number, bend: number): [P2, P2] => {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = clamp(Math.hypot(dx, dy), 1, a + b - 0.5);
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)), base = Math.atan2(dy, dx), k = base - bend * A;
  return [[S[0] + a * Math.cos(k), S[1] + a * Math.sin(k)], [S[0] + Math.cos(base) * d, S[1] + Math.sin(base) * d]];
};
/** horizontal form gradient (lit side screen-left) */
const form = (p: KPen, pts: P2[], col: string, k = 0.78) => {
  let x0 = Infinity, x1 = -Infinity; for (const [x] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  p.poly(pts, p.lin(x0, 0, x1, 0, [[0, tint(col, 0.1)], [0.42, col], [1, shade(col, k)]]), 0);
};
const fold = (p: KPen, pts: P2[], w: number, a = 0.4) => p.stroke(pts, w, rgba(INK, a));
const shine = (p: KPen, pts: P2[], w: number, a = 0.55) => p.stroke(pts, w, rgba("#ffffff", a));
/** a chibi head contour (round crown, full cheeks, small chin); profile gets a little nose */
const headPts = (cx: number, cy: number, W: number, H: number, turn: number): P2[] => {
  const pts: P2[] = [], sg = turn < 0 ? -1 : 1, at = Math.abs(turn);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU, c = Math.cos(a), s = Math.sin(a);
    const e = s < 0 ? 0.8 : 0.9;
    let x = Math.sign(c) * Math.abs(c) ** e * W / 2;
    const y = Math.sign(s) * Math.abs(s) ** e * H / 2;
    if (s > 0) x *= 1 - 0.14 * s ** 3;
    x += at * sg * 0.05 * W * Math.max(0, s);
    if (at > 0.85 && c * sg > 0.2) { const ny = (y / (H / 2) - 0.36) / 0.15; x += sg * 0.09 * W * Math.exp(-ny * ny) * Math.abs(c); }
    pts.push([cx + x, cy + y]);
  }
  return pts;
};

// ---------------- pieces ----------------
/** the cream backpack (behind the body): rolled top, flap, side pocket; off = horizontal offset (3/4 and profile) */
const backpack = (p: KPen, O: Outfit, cx: number, sh: number, off: number, at: number) => {
  const w = 200 * (1 - 0.35 * at), x = cx + off, top = sh - 22, bot = sh + 245;
  const body = [...ellPts(x, top + 40, w / 2, 42, 180, 360, 0, 12), [x + w / 2 + 6, bot - 30], ...ellPts(x, bot - 30, w / 2 + 6, 30, 0, 180, 0, 10)] as P2[];
  form(p, body, O.pack, 0.8); p.poly(body, null);
  // roll top + flap with a brass buckle
  p.poly(ellPts(x, top + 22, w / 2 - 10, 22, 0, 360, 0, 20), p.lin(x - w / 2, 0, x + w / 2, 0, [[0, tint(O.pack, 0.15)], [1, shade(O.pack, 0.8)]]));
  const flap: P2[] = [[x - w * 0.36, top + 38], [x + w * 0.36, top + 38], [x + w * 0.32, top + 125], ...ellPts(x, top + 125, w * 0.32, 22, 0, 180, 0, 8)];
  p.poly(flap, shade(O.pack, 0.9));
  p.stroke(flap.slice(2).map(([a, b]) => [a, b - 9] as P2), 2.2, rgba(O.packTrim, 0.9));
  p.poly([[x - 13, top + 128], [x + 13, top + 128], [x + 13, top + 152], [x - 13, top + 152]], "#d6a542", 3);
  if (at > 0.35) { const sx = x - Math.sign(off) * w * 0.48; p.poly(ellPts(sx, bot - 70, 30, 52, 0, 360, 0, 16), shade(O.pack, 0.86)); fold(p, [[sx - 22, bot - 92], [sx + 22, bot - 92]], 3); }
};
/** the bunched hood behind the neck (hood DOWN): a fat roll with the teal lining showing */
const hoodDown = (p: KPen, O: Outfit, cx: number, y: number, at: number, sg: number) => {
  const rx = 118 * (1 - 0.25 * at), x = cx - sg * at * 40;
  const roll = ellPts(x, y, rx, 48, 180, 360, 0, 20).concat(ellPts(x, y + 10, rx * 0.92, 30, 0, 180, 0, 14));
  form(p, roll, O.coat, 0.8); p.poly(roll, null);
  p.poly(ellPts(x, y - 2, rx * 0.72, 24, 180, 360, 0, 14).concat(ellPts(x, y + 4, rx * 0.62, 12, 0, 180, 0, 10)), O.coatLining, 3);
  for (const s of [-1, 1]) fold(p, curve([x + s * rx * 0.85, y - 18], [x + s * rx * 0.6, y - 40], [x + s * rx * 0.3, y - 44]), 3.2);
  shine(p, ellPts(x - rx * 0.25, y - 30, rx * 0.4, 12, 200, 290, 0, 8), 5, 0.45);
};
/** the raincoat torso: A-line, toggles, pockets, folds, wet-vinyl highlights; returns the hem y */
const coatTorso = (p: KPen, O: Outfit, cx: number, sh: number, sw: number, turn: number, t: number, wet: number) => {
  const at = Math.abs(turn), hem = sh + 330, flare = 1.16;
  const sway = 6 * Math.sin(t * 1.7);
  const pts: P2[] = [
    [cx - 46, sh - 34], [cx + 46, sh - 34],
    ...ellPts(cx + sw - 34, sh + 6, 34, 36, -90, 0, 0, 6).slice(1),
    [cx + sw * 0.94, sh + 110], [cx + sw * 0.9, sh + 175], [cx + sw * flare + sway, hem],
    ...Array.from({ length: 13 }, (_, i) => { const u = i / 12; return [cx + sw * flare * (1 - 2 * u) + sway * (1 - u), hem + 6 * Math.sin(u * Math.PI * 5 + t)] as P2; }),
    [cx - sw * 0.9, sh + 175], [cx - sw * 0.94, sh + 110],
    ...ellPts(cx - sw + 34, sh + 6, 34, 36, 180, 270, 0, 6).slice(0, -1),
  ];
  form(p, pts, O.coat, 0.74);
  const ox = cx + turn * sw * 0.45;                           // the front opening follows the turn
  p.clip(pts, () => {
    // under-layer in the V opening (shirt, waistcoat)
    const v: P2[] = [[ox - 44, sh - 40], [ox + 44, sh - 40], [ox + 6, sh + 150], [ox - 6, sh + 150]];
    p.poly(v, O.under, 0); p.pattern(v, O.underPat, O.underPatCol ?? shade(O.under, 0.7), 0.9);
    if (O.vest) { for (const s of [-1, 1]) p.poly([[ox + s * 44, sh - 8], [ox + s * 6, sh + 150], [ox + s * 30, sh + 150], [ox + s * 50, sh + 10]], O.vest, 2.5); p.dot(ox, sh + 100, 4, "#d6a542"); }
    // lapels of the coat (a darker fold-back)
    for (const s of [-1, 1]) { const l: P2[] = [[ox + s * 44, sh - 40], [ox + s * 84, sh - 20], [ox + s * 14, sh + 160], [ox + s * 4, sh + 150]]; p.poly(l, shade(O.coat, 0.9), 3); }
    // closure line + toggles
    p.stroke([[ox, sh + 150], [ox + sway * 0.3, hem + 10]], 3.4, rgba(INK, 0.75));
    for (let i = 0; i < 3; i++) {
      const y = sh + 185 + i * 52;
      p.band([[ox - 16, y], [ox + 16, y]], "#f6ecd2", 4, 2);
      p.poly(ellPts(ox, y, 15, 6, 0, 360, -12, 10), "#a8743e", 2.5);
    }
    // pockets with flaps
    for (const s of [-1, 1]) {
      if (at > 0.6 && s !== (turn < 0 ? -1 : 1)) continue;
      const px = cx + s * sw * 0.56 + turn * 20, py = sh + 238;
      p.poly([[px - 36, py], [px + 36, py], [px + 34, py + 56], [px - 34, py + 56]], shade(O.coat, 0.93), 2.6);
      p.poly([[px - 40, py - 6], [px + 40, py - 6], [px + 38, py + 18], [px - 38, py + 18]], tint(O.coat, 0.05), 3);
    }
    // folds and the hem seam
    fold(p, curve([cx - sw * 0.7, sh + 160], [cx - sw * 0.82, sh + 240], [cx - sw * 0.96, hem - 8]), 3.4);
    fold(p, curve([cx + sw * 0.62, sh + 165], [cx + sw * 0.8, sh + 250], [cx + sw * 0.98, hem - 8]), 3.4);
    fold(p, [[cx - sw * 1.1, hem - 26], [cx + sw * 1.1, hem - 26]], 2.2, 0.3);
    // wet vinyl highlights on the lit side
    shine(p, curve([cx - sw * 0.78, sh + 30], [cx - sw * 0.9, sh + 120], [cx - sw * 0.84, sh + 210]), 9, 0.35 + 0.35 * wet);
    shine(p, [[cx - sw * 0.5, sh + 270], [cx - sw * 0.6, sh + 310]], 6, 0.3 + 0.3 * wet);
    for (let i = 0; i < Math.round(8 * wet); i++) { const x = cx + sw * (hash(i, 91) * 1.8 - 0.9), y = sh + 40 + 260 * hash(i, 92); p.dot(x, y, 3 + 2 * hash(i, 93), rgba("#ffffff", 0.6)); }
  });
  p.poly(pts, null);
  void at;
  return hem;
};
/** the 1912 cork life jacket: off-white canvas, two front panels of cork blocks, shoulder pieces, white tapes */
const lifejacket = (p: KPen, cx: number, sh: number, sw: number, turn: number) => {
  const cv = "#efe6cf", ox = cx + turn * sw * 0.45;
  for (const s of [-1, 1]) {
    const x0 = ox + s * 12, x1 = ox + s * (sw * 0.98);
    const panel: P2[] = [[x0, sh - 6], [lerp(x0, x1, 0.55), sh - 30], [x1, sh + 8], [x1 + s * 4, sh + 210], [x0, sh + 214]];
    form(p, panel, cv, 0.82); p.poly(panel, null);
    p.clip(panel, () => {
      for (let r = 1; r < 4; r++) p.stroke([[x0 - 10 * s, sh + r * 54 - 6], [x1 + 10 * s, sh + r * 54 - 6]], 3.2, rgba(INK, 0.55));
      p.stroke([[lerp(x0, x1, 0.5), sh - 30], [lerp(x0, x1, 0.5), sh + 220]], 3, rgba(INK, 0.45));
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
        const bx = lerp(x0, x1, 0.25 + 0.5 * c), by = sh + 22 + r * 54;
        p.g.fillStyle = rgba("#c9b89a", 0.35); p.g.beginPath(); p.g.ellipse(bx + 6 * s, by + 10, 22, 12, 0, 0, TAU); p.g.fill();
        shine(p, [[bx - 18, by - 8], [bx + 4, by - 12]], 3, 0.6);
      }
    });
  }
  // the tapes tied across the chest
  p.band([[ox - sw * 0.6, sh + 120], [ox + sw * 0.6, sh + 124]], "#f8f3e6", 7, 2);
  p.band([[ox, sh + 122], [ox - 24, sh + 168]], "#f8f3e6", 6, 2); p.band([[ox, sh + 122], [ox + 20, sh + 172]], "#f8f3e6", 6, 2);
  p.poly(ellPts(ox, sh + 122, 10, 8, 0, 360, 0, 10), "#f8f3e6", 2.5);
};
/** scarf wrap at the neck (front of the hood, behind the chin) */
const scarfWrap = (p: KPen, O: Outfit, cx: number, y: number, at: number) => {
  const rx = 82 * (1 - 0.2 * at);
  const band = ellPts(cx, y - 6, rx, 22, 180, 360, 0, 16).concat(ellPts(cx, y + 18, rx * 1.04, 30, 0, 180, 0, 16));
  form(p, band, O.scarf, 0.75); p.poly(band, null);
  for (let i = -2; i <= 2; i++) fold(p, curve([cx + i * rx * 0.36, y - 18], [cx + i * rx * 0.4 + 6, y + 4], [cx + i * rx * 0.38, y + 40]), 2.6, 0.35);
  p.stroke(ellPts(cx, y + 6, rx * 0.95, 20, 10, 170, 0, 12), 5, rgba(O.scarfStripe, 0.85));
};
/** the knot and the flying, fringed tail. dir = -1/+1 side the tail streams to, k = wind 0 (hangs) .. 1 (streams) */
const scarfTail = (p: KPen, O: Outfit, K: P2, dir: number, k: number, t: number) => {
  const n = 10, L = 230, pts: P2[] = [];
  const ang0 = lerp(Math.PI / 2 - dir * 0.15, Math.PI / 2 - dir * (Math.PI / 2 - 0.18), k);   // hang (down) -> stream (sideways)
  for (let i = 0; i <= n; i++) {
    const u = i / n, wv = (10 + 24 * k) * u * Math.sin(t * (5 + 4 * k) - u * 4.2) + 6 * u * Math.sin(t * 2.1 + u * 2);
    const a = ang0 + 0.25 * u * k * Math.sin(t * 3.1 - u * 3);
    const x = K[0] + Math.cos(a) * L * u, y = K[1] + Math.sin(a) * L * u;
    pts.push([x - Math.sin(a) * wv, y + Math.cos(a) * wv]);
  }
  const sh = tube(pts, 40, 30);
  form(p, sh, O.scarf, 0.75); p.poly(sh, null);
  // two cream stripes near the end + fringe
  for (const s of [0.68, 0.8]) {
    const i = Math.floor(s * n), a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 17, ny = dx / l * 17;
    p.band([[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny]], O.scarfStripe, 7, 1.6, "butt");
  }
  const e = pts[n], d = pts[n - 1], dx = e[0] - d[0], dy = e[1] - d[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  for (let j = -3; j <= 3; j++) {
    const bx = e[0] - uy * j * 5, by = e[1] + ux * j * 5, w = 3 * Math.sin(t * 9 + j);
    p.stroke([[bx, by], [bx + ux * 20 - uy * w, by + uy * 20 + ux * w]], 4, shade(O.scarf, 0.8));
  }
  // the knot
  p.poly(ellPts(K[0], K[1], 26, 22, 0, 360, 0, 14), shade(O.scarf, 0.92));
  fold(p, [[K[0] - 12, K[1] - 6], [K[0] + 8, K[1] + 10]], 2.4);
};
/** hair behind the head */
const hairBack = (p: KPen, cx: number, hc: number, W: number, H: number, turn: number) => {
  const sg = turn < 0 ? -1 : 1, at = Math.abs(turn);
  const pts = ellPts(cx - sg * at * 0.1 * W, hc - 0.06 * H, W * 0.56, H * 0.56, 150, 390, 0, 24);
  pts.push([cx + W * 0.5, hc + 0.2 * H], [cx - W * 0.5, hc + 0.2 * H]);
  p.poly(pts, p.lin(cx - W / 2, 0, cx + W / 2, 0, [[0, tint(HAIR, 0.08)], [1, shade(HAIR, 0.75)]]));
};
/** tufty crown, a side-swept fringe of pointed locks, the big springy cowlick curl, wet shine, frost */
const hairFront = (p: KPen, cx: number, hc: number, W: number, H: number, turn: number, t: number, wet: number, cold: number) => {
  const sg = turn < 0 ? -1 : 1, at = Math.abs(turn), top = hc - H * 0.5, sh = turn * 0.14 * W;
  const hp: P2[] = [];
  // crown: a tufty outline (small bumps) from the right temple over the top to the left temple
  for (let i = 0; i <= 28; i++) {
    const a = rad(-8 - (i / 28) * 164), bump = 1 + 0.035 * Math.sin(i * 2.1 + 0.5) ** 2;
    hp.push([cx + sh * 0.4 + Math.cos(a) * W * 0.55 * bump, hc - 0.04 * H + Math.sin(a) * H * 0.57 * bump]);
  }
  // fringe: locks swept toward screen-left (pointed tips), from the left temple back to the right temple
  const locks = 5;
  for (let i = 0; i <= locks; i++) {
    const u = i / locks, x = lerp(cx - W * 0.53, cx + W * 0.54, u) + sh;
    const root = hc - 0.3 * H + 0.04 * H * Math.sin(u * Math.PI);
    if (i > 0) { const tipX = x - 0.11 * W, tipY = hc - (0.17 + 0.06 * hash(i, 41)) * H + (i === 2 ? 0.03 * H : 0); hp.push([tipX, tipY]); }
    hp.push([x, root]);
  }
  p.poly(hp, p.lin(cx - W / 2, top, cx + W / 2, top + H * 0.45, [[0, tint(HAIR, 0.14)], [0.5, HAIR], [1, shade(HAIR, 0.76)]]));
  for (let i = 1; i <= locks; i++) { const u = i / locks, x = lerp(cx - W * 0.53, cx + W * 0.54, u) + sh; fold(p, curve([x - 0.06 * W, hc - 0.22 * H], [x - 0.02 * W, hc - 0.32 * H], [x + 0.06 * W, top + 0.1 * H]), 3, 0.32); }
  // the cowlick: a thick tapered curl springing off the crown and curling forward (bounces; secondary motion)
  const bnc = 0.025 * W * Math.sin(t * 3.3) + 0.015 * W * Math.sin(t * 7.1);
  const bx = cx + sh * 0.6 + 0.02 * W, by = top + 0.05 * H, cl: P2[] = [];
  for (let i = 0; i <= 22; i++) {
    const u = i / 22, a = rad(200 - 400 * u), r = 0.2 * W * (1 - 0.55 * u);
    cl.push([bx + 0.1 * W + Math.cos(a) * r * 1.05 + bnc * u + (at > 0.85 ? -sg * 0.05 * W * u : 0), by - 0.15 * H + Math.sin(a) * r * 0.95 - 0.04 * H * u]);
  }
  const quiff = tube([[bx - 0.05 * W, by + 0.05 * H], [bx - 0.09 * W, by - 0.08 * H], ...cl], 0.15 * W, 0.03 * W);
  p.poly(quiff, p.lin(bx - 0.2 * W, by - 0.3 * H, bx + 0.2 * W, by, [[0, tint(HAIR, 0.18)], [1, shade(HAIR, 0.8)]]));
  p.stroke(cl.slice(2, 13), 0.028 * W, rgba(HAIR_HI, 0.85));
  // wet shine streaks + frost specks
  shine(p, ellPts(cx - 0.16 * W + sh * 0.3, hc - 0.3 * H, 0.24 * W, 0.1 * H, 200, 300, 0, 8), 0.03 * W, 0.35 + 0.45 * wet);
  shine(p, ellPts(cx + 0.18 * W + sh * 0.3, hc - 0.34 * H, 0.1 * W, 0.05 * H, 210, 290, 0, 6), 0.022 * W, 0.25 + 0.4 * wet);
  if (cold > 0.05) for (let i = 0; i < 14; i++) { const x = cx + (hash(i, 61) - 0.5) * W * 0.9, y = top + 0.04 * H + hash(i, 62) * 0.24 * H; p.dot(x, y, (2 + 2.5 * hash(i, 63)) * cold, rgba("#eaf6ff", 0.9)); }
};
type MouthK = "smile" | "grin" | "flat" | "frown" | "wavy" | "chatter" | "scream" | "o" | "small_o";
const MOUTH: Record<MascotMood, MouthK> = {
  neutral: "smile", shock: "scream", gasp: "o", shiver: "chatter", determined: "flat", relief: "grin", worried: "wavy", awe: "small_o", happy: "smile", sad: "frown",
};
/** the mascot's own mouth (clear at thumbnail size). k = extra opening 0..1, t drives chatter / gasps */
const mouth = (p: KPen, kind: MouthK, mx: number, my: number, W: number, turn: number, t: number, k: number) => {
  const at = Math.abs(turn), sg = turn < 0 ? -1 : 1, prof = at > 0.85, wx = (prof ? 0.5 : 1 - 0.3 * at) * 0.165 * W, lw = 0.013 * W;
  const cx = prof ? mx - sg * wx * 0.3 : mx;
  const inside = (pts: P2[], teethTop = true, tongue = true) => {
    p.poly(pts, "#5a1d24", 0);
    p.clip(pts, () => {
      let y0 = Infinity, y1 = -Infinity; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (teethTop) { p.g.fillStyle = "#ffffff"; p.g.fillRect(cx - 2 * wx, y0 - 2, 4 * wx, (y1 - y0) * 0.26 + 2); }
      if (tongue) p.ell(cx + 0.01 * W, y1, wx * 0.7, (y1 - y0) * 0.42, "#e56f73", 0);
    });
    p.poly(pts, null, lw * 1.1);
  };
  const line = (f: (s: number) => number) => { const pts: P2[] = []; for (let i = 0; i <= 12; i++) { const s = (i / 12) * 2 - 1; if (prof && s * sg > 0.4) continue; pts.push([cx + s * wx, my + f(s)]); } p.stroke(pts, lw); };
  switch (kind) {
    case "smile": line((s) => 0.022 * W * (1 - s * s) - 0.006 * W); if (!prof) for (const s of [-1, 1]) p.stroke([[cx + s * wx * 1.02, my - 0.01 * W], [cx + s * wx * 1.14, my - 0.022 * W]], lw * 0.7); break;
    case "flat": line((s) => 0.004 * W * s * s + 0.004 * W * s * sg); if (!prof) p.stroke([[cx - sg * wx, my], [cx - sg * wx * 1.15, my + 0.012 * W]], lw * 0.7); break;
    case "frown": line((s) => -0.02 * W * (1 - s * s) + 0.008 * W); break;
    case "wavy": line((s) => 0.01 * W * Math.sin(s * Math.PI * 1.5) + 0.004 * W); break;
    case "grin": { const pts: P2[] = []; for (let i = 0; i <= 12; i++) { const s = i / 12 * 2 - 1; pts.push([cx + s * wx * 1.15, my - 0.012 * W - 0.006 * W * s * s]); } for (let i = 12; i >= 0; i--) { const s = i / 12 * 2 - 1; pts.push([cx + s * wx * 1.1, my - 0.012 * W + (0.065 + 0.02 * k) * W * Math.sqrt(1 - s * s)]); } inside(prof ? pts.map(([x, y]) => [cx + (x - cx) * 0.5, y] as P2) : pts); break; }
    case "chatter": {
      const o = 0.012 * W + 0.02 * W * Math.abs(Math.sin(t * 14)) + 0.02 * W * k, w2 = wx * 0.95;
      const pts: P2[] = [[cx - w2, my - o * 0.5], [cx + w2, my - o * 0.5], [cx + w2 * 0.92, my + o * 0.5], [cx - w2 * 0.92, my + o * 0.5]];
      p.poly(pts, "#5a1d24", 0);
      p.poly([[cx - w2, my - o * 0.5 - 0.016 * W], [cx + w2, my - o * 0.5 - 0.016 * W], [cx + w2, my - o * 0.5 + 0.006 * W], [cx - w2, my - o * 0.5 + 0.006 * W]], "#ffffff", 0);
      p.poly([[cx - w2 * 0.92, my + o * 0.5 - 0.006 * W], [cx + w2 * 0.92, my + o * 0.5 - 0.006 * W], [cx + w2 * 0.92, my + o * 0.5 + 0.014 * W], [cx - w2 * 0.92, my + o * 0.5 + 0.014 * W]], "#ffffff", 0);
      const all: P2[] = [[cx - w2, my - o * 0.5 - 0.016 * W], [cx + w2, my - o * 0.5 - 0.016 * W], [cx + w2 * 0.92, my + o * 0.5 + 0.014 * W], [cx - w2 * 0.92, my + o * 0.5 + 0.014 * W]];
      for (let i = -2; i <= 2; i++) p.stroke([[cx + i * w2 * 0.38, my - o * 0.5 - 0.016 * W], [cx + i * w2 * 0.38, my - o * 0.5 + 0.006 * W]], lw * 0.45);
      for (let i = -2; i <= 2; i++) p.stroke([[cx + i * w2 * 0.36, my + o * 0.5 - 0.006 * W], [cx + i * w2 * 0.36, my + o * 0.5 + 0.014 * W]], lw * 0.45);
      p.poly(all, null, lw); break;
    }
    case "scream": { const h = (0.07 + 0.03 * k) * W; const pts: P2[] = [...ellPts(cx, my + h * 0.35, wx * 0.95, h * 0.6, 180, 360, 0, 12), ...ellPts(cx, my + h * 0.35, wx * 0.8, h * 0.7, 0, 180, 0, 12)]; inside(prof ? pts.map(([x, y]) => [cx + (x - cx) * 0.5, y] as P2) : pts); break; }
    case "o": { const h = (0.07 + 0.06 * k) * W, w = wx * (0.6 + 0.12 * k); const pts = ellPts(cx, my + h * 0.4, prof ? w * 0.6 : w, h * 0.62, 0, 360, 0, 20); inside(pts, false, true); break; }
    case "small_o": { const pts = ellPts(cx, my + 0.01 * W, wx * 0.32, 0.028 * W, 0, 360, 0, 14); inside(pts, false, false); break; }
  }
};

// ---------------- the mascot ----------------
/** Draw the mascot into a 600 x 1000 card (soles at y 975). Returns anchors (design units). */
export const drawMascot = (p: KPen, O: Outfit, pose: MascotPose = {}): MascotAnchors => {
  const t = pose.t ?? 0, turn = clamp(pose.turn ?? 0, -1, 1), at = Math.abs(turn), sg = turn < 0 ? -1 : 1;
  const shv = clamp(pose.shiver ?? 0), wet = clamp(pose.wet ?? 0), cold = clamp(pose.cold ?? 0), mood = pose.mood ?? "neutral";
  const breathe = Math.sin(TAU * t / 3.2);
  const jit = shv * (2.6 * Math.sin(t * 19) + 1.6 * Math.sin(t * 27 + 1));   // shiver: kept below ~5 Hz so it never aliases at 30 fps
  const bob = pose.bob ?? 0;
  const cx = 300 + jit, sh = 488 + bob + breathe * 2, sw = 118 * (1 - 0.3 * at);
  const hc = 288 + bob + breathe * 1.2, W = 286 * (1 - 0.06 * at), H = 292, headX = cx + turn * 6;
  const A: MascotAnchors = { head: [headX, hc], mouth: [headX + turn * 0.32 * W, hc + 0.36 * H], hands: [], water: pose.water };
  p.ow = 6;
  const water = pose.water;
  // ---- ripple rings behind the body (back half) ----
  const rings = (front: boolean) => {
    if (water === undefined) return;
    for (let k = 0; k < 3; k++) {
      const ph = ((t * 0.55 + k / 3) % 1 + 1) % 1, rx = 150 + 260 * ph, ry = 22 + 34 * ph, a = 0.75 * (1 - ph) ** 1.4;
      p.stroke(ellPts(cx, water + 4, rx, ry, front ? 10 : 190, front ? 170 : 350, 0, 24), 5 * (1 - 0.5 * ph), rgba("#cfeaf0", a));
    }
    if (front) {
      // foam collar hugging the body at the waterline
      const fo: P2[] = [];
      for (let i = 0; i <= 20; i++) { const u = i / 20, x = cx - 165 + 330 * u; fo.push([x, water + 8 * Math.sin(u * Math.PI) + 4 * Math.sin(t * 4 + u * 9)]); }
      p.stroke(fo, 10, rgba("#e8f6f8", 0.75));
      p.stroke(fo, 3, rgba("#ffffff", 0.9));
      for (let i = 0; i < 9; i++) { const x = cx - 150 + 300 * hash(i, 71), y = water + 6 + 14 * hash(i, 72) + 3 * Math.sin(t * 3 + i); p.dot(x, y, 2.5 + 3 * hash(i, 73), rgba("#ffffff", 0.75)); }
    }
  };
  rings(false);
  p.g.save();
  if (water !== undefined) { p.g.beginPath(); p.g.rect(-50, -50, 700, water + 50 + 2); p.g.clip(); }
  // ---- backpack (behind) ----
  backpack(p, O, cx, sh, -sg * at * 110, at);
  // ---- legs + boots ----
  for (const s of [-1, 1]) {
    const hx = cx + s * 46 * (1 - 0.3 * at), fxp = 300 + s * 52 * (1 - 0.4 * at) + turn * 8;
    const leg = tube(curve([hx, sh + 300], [hx + s * 4, sh + 390], [fxp, 905]), 64, 54);
    form(p, leg, s < 0 ? O.trousers : shade(O.trousers, 0.92), 0.78); p.poly(leg, null);
    fold(p, [[hx - 14, sh + 400], [hx + 12, sh + 392]], 2.6);
    const boot: P2[] = [[fxp - 32, 880], [fxp + 30, 880], [fxp + 34 + sg * at * 30, 948], [fxp + (36 + 30) * (at > 0.4 ? sg : 1) * 0.9, 975], [fxp - 38, 975]];
    p.poly(boot, p.lin(fxp - 40, 0, fxp + 40, 0, [[0, tint(O.boots, 0.12)], [1, shade(O.boots, 0.75)]]));
    p.stroke([[fxp - 38, 966], [fxp + 50, 966]], 6, shade(O.boots, 0.6));
    shine(p, [[fxp - 22, 892], [fxp - 24, 930]], 5, 0.5);
  }
  // ---- arms (far arm in profile goes behind the body) ----
  const arms = pose.arms ?? ["hang", "hang"], ph = pose.phase ?? 0;
  const drawArm = (side: number, g: MascotArm) => {
    const S: P2 = [cx + side * (sw - 22), sh + 22];
    const wave = Math.sin(TAU * (t * 1.6 + ph) + (side > 0 ? 0 : Math.PI));
    const wl = water ?? sh + 200;
    let T: P2, bend = side;
    switch (g) {
      case "hug": T = [cx - side * 52 + jit, sh + 92]; bend = side; break;
      case "splash": T = [S[0] + side * (150 + 26 * wave), Math.min(wl - 12, sh + 160) + 40 * wave]; bend = -side; break;
      case "paddle": T = [S[0] + side * (118 + 28 * Math.cos(TAU * (t * 0.8 + ph) + side)), Math.min(wl - 4, sh + 175) + 16 * Math.sin(TAU * (t * 0.8 + ph) + side)]; bend = side; break;
      case "reach": T = [S[0] + side * (165 + 8 * Math.sin(t * 2)), sh - 150 + 10 * Math.sin(t * 2.6)]; bend = -side; break;
      case "wave": T = [S[0] + side * (120 + 22 * wave), sh - 185]; bend = -side; break;
      case "fist": T = [cx + side * 46, sh + 70]; bend = side; break;
      case "cheer": T = [S[0] + side * (80 + 10 * wave), sh - 225 + 8 * wave]; bend = -side; break;
      case "point": T = [S[0] + side * 225, sh - 40]; bend = -side; break;
      case "cling": T = [cx + side * 70, sh + 46 + 4 * Math.sin(t * 2 + side)]; bend = side; break;
      case "chin": T = [cx + side * 26, hc + 0.44 * H]; bend = side; break;
      default: T = [S[0] + side * 30, sh + 222 + 3 * breathe]; bend = side;
    }
    const [E, Wr] = ik2(S, T, 122, 112, bend);
    const sl = tube([S, lerp2(S, E, 0.5), E, lerp2(E, Wr, 0.5), lerp2(E, Wr, 0.86)], 58, 46);
    form(p, sl, O.coat, 0.76); p.poly(sl, null);
    fold(p, [[E[0] - 14, E[1] - 6], [E[0] + 12, E[1] + 8]], 3);
    shine(p, [lerp2(S, E, 0.25), lerp2(S, E, 0.7)], 6, 0.3 + 0.3 * wet);
    const cuff = lerp2(E, Wr, 0.82), ang = Math.atan2(Wr[1] - E[1], Wr[0] - E[0]);
    p.poly(ellPts(cuff[0], cuff[1], 24, 12, 0, 360, (ang * 180) / Math.PI + 90, 12), shade(O.coat, 0.88), 3);
    // a round mitten-like hand with a thumb
    const hx = Wr[0] + Math.cos(ang) * 14, hy = Wr[1] + Math.sin(ang) * 14;
    p.ell(hx, hy, 25, 23, p.rad(hx - 6, hy - 6, 30, [[0, tint(SKIN, 0.1)], [1, shade(SKIN, 0.85)]]));
    const ta = ang - bend * 1.2;
    p.ell(hx + Math.cos(ta) * 20, hy + Math.sin(ta) * 20, 10, 9, SKIN, 4);
    if (cold > 0.3) p.dot(hx - 6, hy - 4, 5, rgba("#e88a8a", 0.5));
    if (cold > 0.6) for (let i = 0; i < 5; i++) p.dot(hx - 14 + 28 * hash(i, 101 + side), hy - 16 + 14 * hash(i, 103 + side), 2.2 + 1.6 * hash(i, 105), rgba("#eaf6ff", 0.9 * cold));   // frost on the knuckles
    A.hands.push([hx, hy]);
  };
  const farSide = at > 0.85 ? -sg : 0;
  if (farSide) drawArm(farSide, arms[farSide < 0 ? 0 : 1]);
  // ---- torso, life jacket, hood, scarf ----
  coatTorso(p, O, cx, sh, sw, turn, t, wet);
  if (O.lifejacket) lifejacket(p, cx, sh, sw, turn);
  hoodDown(p, O, cx, sh - 34, at, sg);
  scarfWrap(p, O, cx + turn * 8, sh - 40, at);
  // ---- head ----
  const tilt = (pose.headTilt ?? 0) + 2.5 * Math.sin(t * 0.7) + shv * 1.2 * Math.sin(t * 23);
  p.g.save();
  p.g.translate(headX, hc + 0.5 * H); p.g.rotate(rad(tilt)); p.g.translate(-headX, -(hc + 0.5 * H));
  hairBack(p, headX, hc, W, H, turn);
  for (const s of [-1, 1]) {                                     // ears
    if (at > 0.4 && s === sg) continue;
    const ex = at > 0.4 ? headX - sg * (0.47 - 0.4 * clamp((at - 0.4) / 0.6)) * W : headX + s * 0.49 * W + turn * 0.1 * W;
    p.ell(ex, hc + 0.08 * H, 0.085 * W, 0.12 * H, shade(SKIN, 0.95), 5);
    p.stroke(ellPts(ex, hc + 0.08 * H, 0.04 * W, 0.065 * H, s > 0 ? -80 : 100, s > 0 ? 80 : 260, 0, 6), 2.4, rgba(INK, 0.45));
    if (cold > 0.2) p.dot(ex, hc + 0.06 * H, 0.04 * W, rgba("#e86a6a", 0.35 * cold));
  }
  const hp = headPts(headX, hc, W, H, turn);
  p.poly(hp, p.rad(headX - 0.2 * W, hc - 0.14 * H, 0.8 * W, [[0, tint(SKIN, 0.08)], [0.55, SKIN], [1, shade(SKIN, 0.84)]]), 0);
  p.clip(hp, () => { p.g.fillStyle = rgba(shade(SKIN, 0.72), 0.3); p.g.beginPath(); p.g.ellipse(headX + 0.62 * W, hc + 0.12 * H, 0.32 * W, 0.62 * H, 0, 0, TAU); p.g.fill(); });
  p.poly(hp, null);
  // face (slightly bigger eyes: the features are drawn on a 12 % larger face box)
  const expr = MOOD[mood];
  const chat = shv * (0.12 + 0.16 * Math.abs(Math.sin(t * 14)));
  const gasp = mood === "gasp" ? 0.7 + 0.2 * Math.sin(t * 5) : 0;
  const talk = { open: Math.max(chat, gasp, pose.talk ?? 0), round: mood === "gasp" ? 1 : 0 };
  const look = pose.look ?? gazeAt(t, 77, 0.25);
  drawFace(p, headX, hc + 0.04 * H, W, H, { expr, turn: at > 0.85 ? turn : turn * 0.82, blink: blinkAt(t, 77), look, talk, skin: SKIN, brows: BROW, lashes: true, age: 0, light: -1, eyeScale: 1.2, noMouth: true, noNose: true });
  const fx = headX + turn * 0.3 * W;
  // a small button nose (front / 3/4); in profile the head contour carries the nose
  if (at <= 0.85) {
    const nx = fx + turn * 0.06 * W, ny = hc + 0.25 * H;
    p.g.fillStyle = rgba(shade(SKIN, 0.68), 0.55); p.g.beginPath(); p.g.ellipse(nx + 0.012 * W, ny + 0.012 * H, 0.04 * W, 0.022 * H, 0, 0, TAU); p.g.fill();
    p.ell(nx, ny, 0.038 * W, 0.028 * H, p.rad(nx - 0.01 * W, ny - 0.01 * H, 0.05 * W, [[0, tint(SKIN, 0.12)], [1, shade(SKIN, 0.9)]]), 0);
    p.stroke(ellPts(nx, ny, 0.04 * W, 0.03 * H, 20, 160, 0, 8), 0.009 * W, rgba(INK, 0.6));
    p.dot(nx - 0.012 * W, ny - 0.008 * H, 0.008 * W, rgba("#ffffff", 0.7));
  } else p.stroke([[headX + sg * 0.47 * W, hc + 0.27 * H], [headX + sg * 0.43 * W, hc + 0.285 * H]], 0.008 * W, INK);
  mouth(p, MOUTH[mood], at > 0.85 ? headX + sg * 0.36 * W : fx + turn * 0.04 * W, hc + 0.37 * H, W, turn, t, Math.max(talk.open, gasp));
  // freckles across the nose and cheeks
  if (at < 0.85) for (let i = 0; i < 9; i++) {
    const s = i < 4 ? -1 : i < 8 ? 1 : 0, k = i % 4;
    const x = headX + turn * 0.3 * W + s * (0.13 + 0.06 * (k % 2) + 0.03 * k) * W * (1 - 0.3 * turn * s), y = hc + 0.2 * H + (k > 1 ? 0.045 : 0) * H + 0.01 * H * hash(i, 5);
    p.dot(x, y, 3.6, rgba("#a0583a", 0.75));
  } else for (let i = 0; i < 4; i++) p.dot(headX + sg * (0.26 + 0.04 * i) * W, hc + 0.21 * H + 0.02 * H * (i % 2), 3.4, rgba("#a0583a", 0.75));
  // cold: a red nose tip and rosy cheeks
  if (cold > 0.05) {
    const nx = at > 0.85 ? headX + sg * 0.5 * W : headX + turn * 0.34 * W;
    p.g.fillStyle = p.rad(nx, hc + 0.26 * H, 18, [[0, rgba("#e8555a", 0.55 * cold)], [1, rgba("#e8555a", 0)]]); p.g.beginPath(); p.g.arc(nx, hc + 0.26 * H, 18, 0, TAU); p.g.fill();
  }
  hairFront(p, headX, hc, W, H, turn, t, wet, cold);
  // drips from the hair and chin (wet)
  if (wet > 0.05) for (let i = 0; i < 4; i++) {
    const per = 0.9 + 0.5 * hash(i, 81), u = ((t / per + hash(i, 82)) % 1 + 1) % 1;
    const x = headX + (hash(i, 83) - 0.5) * W * 0.9, y0 = i === 0 ? hc + 0.5 * H : hc - 0.05 * H + 0.1 * H * hash(i, 84), y = y0 + u * u * 120;
    if (u > 0.85) continue;
    p.poly([[x, y - 12], [x + 6, y], ...ellPts(x, y, 6, 6, 0, 180, 0, 8), [x - 6, y]], rgba("#cfefff", 0.9 * wet), 2.2);
  }
  p.g.restore();
  // scarf tail streams away from the facing side (or with the wind)
  const wind = pose.wind ?? (at > 0.15 ? -sg * 0.7 : 0.55);
  scarfTail(p, O, [cx + turn * 30 + 34, sh - 22], wind < 0 ? -1 : 1, Math.abs(wind), t);
  // ---- arms in front ----
  [-1, 1].forEach((side, ai) => { if (side !== farSide) drawArm(side, arms[ai]); });
  // splashes thrown up by splashing hands
  if (water !== undefined) arms.forEach((g, ai) => {
    if (g !== "splash" && g !== "paddle") return;
    const h = A.hands[A.hands.length - 2 + ai] ?? A.hands[ai]; if (!h) return;
    const k = g === "splash" ? 1 : 0.45;
    for (let i = 0; i < 6; i++) {
      const u = ((t * 2.2 + i / 6 + ai * 0.37) % 1 + 1) % 1, dx = (hash(i, ai + 5) - 0.5) * 90 * k, dy = -120 * k * u + 160 * k * u * u;
      if (u > 0.9) continue;
      p.dot(h[0] + dx * u * 2, water - 6 + dy, (6 - 4 * u) * (0.6 + 0.6 * hash(i, 9)), rgba("#e6f6fa", 0.85 * (1 - u)));
    }
  });
  p.g.restore();
  rings(true);
  return A;
};

// ---------------- stage helpers ----------------
/** card metres: the 600 x 1000 box is MASCOT_W wide, so the mascot stands ~1.7 m (soles at y 975) */
export const MASCOT_W = 1.2, MASCOT_H = (MASCOT_W * 1000) / 600, MASCOT_SOLE = (25 / 1000) * MASCOT_H;
const qk = (v: number) => Math.round(v * 120) / 120;
/** a stage card of the mascot standing at `at` (its soles) or, with pose.water, floating with the waterline at at[1] */
export const mascotCard = (name: string, O: Outfit, pose: MascotPose, at: V3, o: { scale?: number; flip?: boolean; rot?: number; tint?: [number, number, number]; maxPx?: number } = {}): Card => {
  const s = o.scale ?? 1, h = MASCOT_H * s;
  const y = pose.water !== undefined ? at[1] - ((1000 - pose.water) / 1000) * h : at[1] - MASCOT_SOLE * s;
  return {
    key: `M|${name}|${JSON.stringify(pose, (_k, v) => (typeof v === "number" ? qk(v) : v))}|${qk(o.rot ?? 0)}`,
    draw: (p) => { drawMascot(p, O, pose); },
    dw: 600, dh: 1000, w: MASCOT_W * s, pos: [at[0], y, at[2]], rot: o.rot, flip: o.flip, tintMul: o.tint, maxPx: o.maxPx ?? 2048,
  };
};
/** world position of a design-space anchor of a mascot card built with mascotCard (card faces the camera / yaw) */
export const mascotAnchorWorld = (c: Card, a: P2, right: [number, number] = [1, 0]): V3 => {
  const h = (c.w * c.dh) / c.dw, x = (a[0] / c.dw - 0.5) * c.w * (c.flip ? -1 : 1), y = c.pos[1] + (1 - a[1] / c.dh) * h;
  return [c.pos[0] + right[0] * x, y, c.pos[2] + right[1] * x];
};
/** breath fog: soft puffs leaving the mouth every `per` s, drifting up and out, fading (frame-pure) */
export const breathPuffs = (t: number, mouth: V3, o: { per?: number; seed?: number; dir?: number; size?: number; strength?: number } = {}): Card[] => {
  const per = o.per ?? 1.6, seed = o.seed ?? 1, dir = o.dir ?? 0.6, sz = o.size ?? 0.38, k = o.strength ?? 1;
  const out: Card[] = [];
  const n0 = Math.floor(t / per);
  for (let n = n0 - 2; n <= n0; n++) {
    const age = t - n * per - 0.15 * hash(n, seed);
    if (age < 0 || age > 2.2) continue;
    const u = age / 2.2;
    for (let j = 0; j < 3; j++) {
      const jx = (hash(n * 3 + j, seed + 1) - 0.5) * 0.12, jy = hash(n * 3 + j, seed + 2) * 0.08;
      out.push({
        key: "breath", draw: puff, dw: 256, dh: 256, w: sz * (0.5 + 1.5 * u) * (0.8 + 0.4 * hash(j, n)), centre: true, face: "camera",
        pos: [mouth[0] + dir * (0.1 + 0.32 * u) + jx, mouth[1] - 0.05 + 0.14 * u * u + jy * 0.5, mouth[2] + 0.06], lit: false, soft: true,
        opacity: k * 0.38 * Math.sin(Math.PI * Math.min(1, u * 1.4)) ** 1.2 * (1 - u), maxPx: 256, order: 4,
      });
    }
  }
  return out;
};
const puff = (p: KPen) => {
  const g = p.g;
  g.fillStyle = p.rad(128, 128, 120, [[0, "rgba(235,246,250,0.9)"], [0.45, "rgba(220,238,245,0.5)"], [1, "rgba(220,238,245,0)"]]);
  g.beginPath(); g.arc(128, 128, 120, 0, TAU); g.fill();
};
void mix;
