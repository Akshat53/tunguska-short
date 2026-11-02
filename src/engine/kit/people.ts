// Visual kit: the "v2" cartoon people. Flat-2D ink-outlined characters on the same 600 x 1000 design card as toon.ts
// (soles at y = 975, so they drop into the existing Pool / Actor machinery), but with real proportions (~4.7 heads),
// appealing faces (face.ts), idle life (breathing, weight shift, small head turns, saccades, blinks), hand gestures,
// carried props, period costume (kurta, angrakha, dhoti, lungi, sari, ghagra, pagri, shawl, 1857 officer coat + sola topi,
// 1940s fire-brigade helmet + coat, dock-worker vest + headcloth), varied body types / heights / skin tones, and a walk /
// run cycle for side and three-quarter views. Every value is a pure function of (person, pose, t).
import { KPen, P2, Pattern, INK, PAL, TAU, clamp, lerp, lerp2, hash, noise1, mix, shade, tint, rgba, ellPts, rrect, curve, tube, trim, rad, rot2 } from "./core";
import { drawFace, Expr, blinkAt, talkAt, gazeAt, Talk } from "./face";

// ---------------- types ----------------
export type Build = "man" | "woman" | "boy" | "girl";
export type Top = "kurta" | "kurta_short" | "angrakha" | "vest" | "banian" | "shirt" | "blouse" | "officer_coat" | "fire_coat" | "jacket";
export type Bottom = "dhoti" | "pyjama" | "trousers" | "lungi" | "sari" | "ghagra" | "shorts";
export type Hat = "none" | "pagri" | "pagri_tall" | "headcloth" | "gandhi" | "sola" | "fire_helmet" | "veil" | "cap" | "forage";
export type Hair = "short" | "parted" | "bun" | "braid" | "bald" | "curly" | "wavy";
export type Facial = "none" | "moustache" | "handlebar" | "beard" | "chops" | "stubble";
export type Feet = "bare" | "jutti" | "boots" | "shoes" | "chappal";
export type Extra = "crossbelts" | "sash" | "epaulettes" | "medal" | "brass_buttons" | "chapras" | "bangles" | "bindi" | "nosering"
  | "earrings" | "belt" | "axe_belt" | "janeu" | "patka" | "whistle" | "rolled_sleeves" | "gloves";
export type Look = {
  top: Top; topCol: string; topPat?: Pattern; topPatCol?: string; trimCol?: string;
  bottom: Bottom; bottomCol: string; bottomPat?: Pattern; bottomPatCol?: string; borderCol?: string;
  vestCol?: string;                          // a sleeveless sadri / waistcoat over the top
  hat?: Hat; hatCol?: string; hatPat?: Pattern; hatPatCol?: string; hatTrim?: string;
  shawl?: string; shawlTrim?: string;
  sash?: string; feet?: Feet; feetCol?: string;
  hair?: Hair; facial?: Facial; extras?: Extra[];
  sleeves?: "long" | "short" | "none";
};
export type Person = { build: Build; height: number; girth: number; skin: string; hairCol: string; age: number; look: Look; seed: number };

export type Gesture = "hang" | "hips" | "wave" | "point" | "carry" | "raise" | "hold" | "cover" | "fold" | "hose" | "shield" | "reach" | "swing" | "beckon" | "cup";
export type Prop = "chapati" | "chapatis" | "lantern" | "lathi" | "torch" | "gold" | "nozzle" | "bucket" | "letter" | "bundle" | "pot" | "whistle_up" | null;
export type Pose = {
  t?: number;                      // seconds: drives idle life, blinks, talk
  view?: "front" | "side";         // side = profile facing screen-right (mirror the card for left)
  turn?: number;                   // front: -0.6..0.6 body/head turn; side: head turn toward camera 0 (profile) .. 1 (3/4)
  gait?: "stand" | "walk" | "run"; phase?: number; stride?: number;
  arms?: [Gesture, Gesture];       // front: [screen-left arm, screen-right arm]; side: [far, near]
  hold?: [Prop, Prop];
  expr?: Expr; talk?: Talk; look?: [number, number] | "idle";
  idle?: number;                   // 0 = frozen, 1 = full idle life
  lean?: number;                   // degrees forward (side) / sideways (front)
  headTilt?: number;               // degrees
  light?: number;                  // -1 key light from screen-left .. +1 from screen-right (form shading side)
  wave?: number;                   // 0..1 phase of a wave/beckon
};
/** points of interest returned in card units (lantern / torch flames for glow cards, the head for look-at, hands) */
export type Anchors = { glows: { x: number; y: number; r: number; col: string }[]; head: P2; hands: P2[] };

// ---------------- rig ----------------
type Rig = {
  H: number; W: number; u: number; T: number; crown: number; hc: number; chin: number; shY: number; sw: number;
  waistY: number; ww: number; hipY: number; hw: number; sole: number; ua: number; fa: number; fem: boolean; kid: boolean;
};
const rig = (P: Person): Rig => {
  const kid = P.build === "boy" || P.build === "girl", fem = P.build === "woman" || P.build === "girl";
  const T = (kid ? 500 : fem ? 720 : 770) * P.height;
  const H = T / (kid ? 3.7 : 4.7), W = H * (fem ? 0.84 : 0.88) * (0.94 + 0.06 * P.girth), u = W / 100, sole = 975;
  const crown = sole - T, hc = crown + H / 2, chin = crown + H, shY = chin + 0.27 * H;
  const g = P.girth;
  const sw = H * (kid ? 0.5 : fem ? 0.55 : 0.64) * (0.8 + 0.2 * g);
  const waistY = shY + (kid ? 0.85 : 1.0) * H, hipY = shY + (kid ? 1.15 : 1.38) * H;
  const ww = H * (fem ? 0.38 : 0.44) * (0.55 + 0.45 * g) * (kid ? 0.95 : 1), hw = H * (fem ? 0.52 : 0.46) * (0.65 + 0.35 * g);
  return { H, W, u, T, crown, hc, chin, shY, sw, waistY, ww, hipY, hw, sole, ua: 0.72 * H, fa: 0.66 * H, fem, kid };
};
/** two-bone IK: shoulder S, target hand Tg, lengths a, b; bend = +1 elbow to the right of S->T, -1 left */
const ik2 = (S: P2, Tg: P2, a: number, b: number, bend: number): [P2, P2] => {
  const dx = Tg[0] - S[0], dy = Tg[1] - S[1], d = clamp(Math.hypot(dx, dy), 1, a + b - 0.5);
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)), base = Math.atan2(dy, dx), k = base - bend * A;
  const E: P2 = [S[0] + a * Math.cos(k), S[1] + a * Math.sin(k)];
  const W: P2 = [S[0] + Math.cos(base) * d, S[1] + Math.sin(base) * d];
  return [E, W];
};
const centroidX = (pts: P2[]) => { let x0 = Infinity, x1 = -Infinity; for (const [x] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } return [x0, x1]; };
/** fill with a horizontal form gradient (lit side -> 0.82 shade) and a slight darkening toward the bottom */
const form = (p: KPen, pts: P2[], col: string, light: number, k = 0.8) => {
  const [x0, x1] = centroidX(pts);
  const gr = light < 0 ? p.lin(x0, 0, x1, 0, [[0, tint(col, 0.06)], [0.45, col], [1, shade(col, k)]])
    : p.lin(x1, 0, x0, 0, [[0, tint(col, 0.06)], [0.45, col], [1, shade(col, k)]]);
  p.poly(pts, gr, 0);
};
const fold = (p: KPen, pts: P2[], w: number) => p.stroke(pts, w, rgba(INK, 0.45));

// ---------------- heads ----------------
/** head contour: rounded crown, fuller cheeks, soft chin; turned heads push the jaw toward the facing side; profile gets a nose */
const headPts = (cx: number, cy: number, W: number, H: number, turn: number, kid: boolean): P2[] => {
  const pts: P2[] = [], sg = turn < 0 ? -1 : 1, at = Math.abs(turn);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU, c = Math.cos(a), s = Math.sin(a);
    const e = s < 0 ? 2 / 2.3 : 2 / (kid ? 2.3 : 2.05);
    let x = Math.sign(c) * Math.abs(c) ** e * W / 2, y = Math.sign(s) * Math.abs(s) ** e * H / 2;
    if (s > 0) x *= 1 - (kid ? 0.12 : 0.2) * s ** 3;                   // chin taper
    x += at * sg * 0.06 * W * Math.max(0, s);                          // jaw follows the turn
    if (at > 0.85 && c * sg > 0.2) {                                   // profile nose + brow
      const ny = (y / (H / 2) - 0.36) / 0.16;
      x += sg * 0.11 * W * Math.exp(-ny * ny) * Math.abs(c);
    }
    pts.push([cx + x, cy + y]);
  }
  return pts;
};
const hairBack = (p: KPen, P: Person, r: Rig, cx: number, turn: number, light: number) => {
  const h = P.look.hair ?? (r.fem ? "bun" : "short"), col = P.hairCol, { W, H, hc } = r;
  if (P.look.hat === "veil") return;
  if (h === "bun" || h === "braid" || h === "parted") {
    // hair mass behind the head, longer for women
    const back = turn * -0.22 * W;
    const pts = ellPts(cx + back, hc + 0.08 * H, 0.58 * W, 0.6 * H, 0, 360, 0, 36);
    form(p, pts, col, light, 0.7); p.poly(pts, null);
    if (h === "bun") { p.ell(cx + back - turn * 0.25 * W, hc - 0.38 * H, 0.22 * W, 0.18 * H, col); p.stroke(ellPts(cx + back - turn * 0.25 * W, hc - 0.38 * H, 0.14 * W, 0.1 * H, 200, 330, 0, 8), 1.6 * r.u, rgba("#ffffff", 0.25)); }
  }
};
const hairFront = (p: KPen, P: Person, r: Rig, cx: number, turn: number, light: number) => {
  const h = P.look.hair ?? (r.fem ? "bun" : "short"), col = P.hairCol, { W, H, hc, u } = r, hat = P.look.hat ?? "none";
  const covered = hat !== "none" && hat !== "cap" && hat !== "gandhi";
  const sg = turn < 0 ? -1 : 1, at = Math.abs(turn);
  const hp = headPts(cx, hc, W * 1.05, H * 1.04, turn, r.kid);
  const line = hc - (h === "bald" ? 0.05 : 0.17) * H;
  if (h === "bald") {
    // side fringe only
    for (const s of [-1, 1]) {
      if (at > 0.85 && s === sg) continue;
      const x = cx + s * 0.47 * W + turn * 0.1 * W;
      p.ell(x, hc - 0.02 * H, 0.08 * W, 0.16 * H, col, 0.7 * p.ow, s * 10);
    }
    return;
  }
  if (covered) {
    // sideburns peeking under the hat
    for (const s of [-1, 1]) {
      if (at > 0.5 && s === sg) continue;
      const x = cx + s * 0.44 * W + turn * 0.12 * W;
      p.poly([[x - 0.05 * W, hc - 0.2 * H], [x + 0.05 * W, hc - 0.2 * H], [x + 0.03 * W, hc + 0.05 * H], [x - 0.02 * W, hc + 0.02 * H]], col, 0);
    }
    return;
  }
  // hair cap: part of the head contour above the hairline, with a fringe edge
  const cap = hp.filter(([, y]) => y < line);
  if (cap.length < 3) return;
  const a = cap[cap.length - 1], b = cap[0];
  const fr: P2[] = [];
  const part = cx + (r.fem ? turn * 0.25 : -0.12 + turn * 0.3) * W;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, x = lerp(a[0], b[0], t);
    const dip = r.fem ? 0.1 * H * Math.abs(Math.sin(Math.PI * t)) * (Math.abs(x - part) / (0.5 * W)) : (h === "curly" ? 0.03 * H * Math.sin(t * 22) : 0.05 * H * Math.sin(Math.PI * t));
    fr.push([x, lerp(a[1], b[1], t) + dip - (r.fem ? 0.05 * H : 0)]);
  }
  const shape = [...cap, ...fr];
  form(p, shape, col, light, 0.72);
  // strands + shine
  p.clip(shape, () => {
    for (let i = -3; i <= 3; i++) p.stroke(curve([part + i * 2 * u, line - 0.32 * H], [part + i * 9 * u, line - 0.2 * H], [part + i * 16 * u, line + 0.02 * H]), 1.4 * u, rgba("#000000", 0.25));
    p.stroke(ellPts(cx - light * 0.18 * W, hc - 0.36 * H, 0.18 * W, 0.06 * H, 200, 320, 0, 8), 3 * u, rgba("#ffffff", 0.18));
  });
  p.poly(shape, null);
  if (h === "curly") for (let i = 0; i < 7; i++) { const t = i / 6, x = lerp(a[0], b[0], t); p.ell(x, line - 0.24 * H * Math.sin(Math.PI * t) - 0.02 * H, 0.08 * W, 0.07 * H, col); }
  if (r.fem && at < 0.85) p.stroke([[part, hc - 0.47 * H], [part, line - 0.04 * H]], 1.6 * u, rgba(INK, 0.6)); // centre parting
  if (h === "braid") { // braid over the near shoulder
    const s = turn >= 0 ? -1 : 1, x0 = cx + s * 0.4 * W, y0 = hc + 0.25 * H;
    for (let i = 0; i < 6; i++) p.ell(x0 + s * 0.02 * W * i, y0 + i * 0.13 * H, 0.08 * W, 0.08 * H, shade(col, i % 2 ? 0.9 : 1));
    p.ell(x0 + s * 0.12 * W, y0 + 0.8 * H, 0.04 * W, 0.05 * H, PAL.red, 0.6 * p.ow);
  }
};
const facialHair = (p: KPen, P: Person, r: Rig, cx: number, turn: number, under: boolean) => {
  const f = P.look.facial ?? "none", col = P.hairCol, { W, H, hc, u } = r;
  if (f === "none") return;
  const at = Math.abs(turn), sg = turn < 0 ? -1 : 1, prof = at > 0.85;
  const fx = prof ? cx + sg * 0.33 * W : cx + turn * 0.33 * W, my = hc + 0.29 * H;
  if (under && (f === "beard" || f === "chops" || f === "stubble")) {
    const hp = headPts(cx, hc, W * 1.02, H * 1.02, turn, false).filter(([, y]) => y > hc + (f === "chops" ? -0.05 : 0.02) * H);
    if (f === "stubble") { p.clip(hp.length > 2 ? hp : [], () => { for (let i = 0; i < 60; i++) p.dot(cx + (hash(i, P.seed) - 0.5) * W * 0.9, hc + 0.2 * H + hash(i, P.seed + 1) * 0.3 * H, 0.9 * u, rgba(col, 0.5)); }); }
    else if (f === "beard") {
      const inner: P2[] = []; for (let i = 0; i <= 8; i++) { const t = i / 8; inner.push([lerp(cx - 0.42 * W, cx + 0.42 * W, t) + turn * 0.25 * W * Math.sin(Math.PI * t), hc + 0.08 * H + 0.34 * H * Math.sin(Math.PI * t) ** 1.6]); }
      const shp = [...hp.map(([x, y]) => [x, y + 0.04 * H] as P2), ...inner];
      p.poly(shp, col, p.ow * 0.8);
    } else { // mutton chops: two side patches joined to the moustache
      for (const s of [-1, 1]) {
        if (prof && s !== -sg) continue;
        const x = cx + s * 0.4 * W + turn * 0.1 * W;
        p.poly([[x - s * 0.01 * W, hc - 0.08 * H], [x + s * 0.06 * W, hc - 0.08 * H], [x + s * 0.04 * W, hc + 0.26 * H], [x - s * 0.06 * W, hc + 0.3 * H], [x - s * 0.04 * W, hc + 0.12 * H]], col, 0);
      }
    }
  }
  if (!under && (f === "moustache" || f === "handlebar" || f === "chops" || f === "beard")) {
    for (const s of [-1, 1]) {
      if (prof && s === sg) continue;
      const k = prof ? 0.7 : 1 - 0.3 * at * (s === sg ? -1 : 1);
      const a: P2 = [fx + s * 1.5 * u, my - 0.03 * H], b: P2 = [fx + s * 15 * u * k, my + 0.02 * H];
      p.taper(a, b, 8 * u, 4 * u, col);
      if (f === "handlebar") p.stroke(curve(b, [b[0] + s * 6 * u, b[1] - 1 * u], [b[0] + s * 7 * u, b[1] - 7 * u], 6), 2.8 * u, col);
    }
  }
};
// ---------------- headwear ----------------
const hatDraw = (p: KPen, P: Person, r: Rig, cx: number, turn: number, light: number, front: boolean) => {
  const L = P.look, hat = L.hat ?? "none", { W, H, hc, u } = r, sg = turn < 0 ? -1 : 1, at = Math.abs(turn);
  const col = L.hatCol ?? PAL.sun;
  const crownY = hc - 0.5 * H;
  if (hat === "veil") {
    if (!front) { // back drape: behind head and shoulders
      const pts: P2[] = [[cx - 0.62 * W, hc - 0.2 * H], [cx - 0.5 * W, crownY - 0.08 * H], [cx + 0.5 * W, crownY - 0.08 * H], [cx + 0.62 * W, hc - 0.2 * H],
        [cx + 0.9 * W, r.shY + 0.6 * H], [cx - 0.9 * W, r.shY + 0.6 * H]];
      form(p, pts, col, light, 0.78); p.poly(pts, null);
    } else { // the frame around the face
      const pts: P2[] = [];
      for (let i = 0; i <= 20; i++) { const a = Math.PI + (i / 20) * Math.PI; pts.push([cx + turn * 0.08 * W + 0.62 * W * Math.cos(a), hc - 0.06 * H + 0.6 * H * Math.sin(a)]); }
      pts.push([cx + 0.66 * W, hc + 0.35 * H], [cx + 0.55 * W, r.shY + 0.2 * H], [cx + 0.5 * W, hc + 0.1 * H]);
      for (let i = 20; i >= 0; i--) { const a = Math.PI + (i / 20) * Math.PI; pts.push([cx + turn * 0.1 * W + 0.5 * W * Math.cos(a), hc - 0.02 * H + 0.49 * H * Math.sin(a)]); }
      pts.push([cx - 0.5 * W, hc + 0.1 * H], [cx - 0.55 * W, r.shY + 0.2 * H], [cx - 0.66 * W, hc + 0.35 * H]);
      form(p, pts, col, light, 0.8);
      p.pattern(pts, L.hatPat, L.hatPatCol ?? tint(col, 0.4), u / 1.4);
      p.poly(pts, null);
      if (L.hatTrim) { const tr: P2[] = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * 1.05 + (i / 16) * Math.PI * 0.9; tr.push([cx + turn * 0.1 * W + 0.53 * W * Math.cos(a), hc - 0.02 * H + 0.52 * H * Math.sin(a)]); } trim(p, tr, L.hatTrim, 4.5 * u); }
    }
    return;
  }
  if (!front) {
    if ((hat === "pagri" || hat === "pagri_tall") && Math.abs(turn) > 0.3) { // the tail of the turban behind the shoulder
      const s = turn > 0 ? -1 : 1;
      const pts: P2[] = [[cx + s * 0.35 * W, hc - 0.1 * H], [cx + s * 0.55 * W, hc + 0.2 * H], [cx + s * 0.62 * W, r.shY + 0.55 * H], [cx + s * 0.42 * W, r.shY + 0.5 * H], [cx + s * 0.38 * W, hc + 0.2 * H]];
      form(p, pts, shade(col, 0.92), light, 0.8); p.pattern(pts, L.hatPat, L.hatPatCol ?? tint(col, 0.45), u / 1.4, 30); p.poly(pts, null);
    }
    if (hat === "fire_helmet") { // the long neck guard of the helmet
      const pts = ellPts(cx - turn * 0.05 * W, hc - 0.18 * H, 0.66 * W, 0.24 * H, 0, 180, 0, 16);
      p.poly([...pts, [cx - 0.6 * W, hc - 0.2 * H]], shade(col, 0.8));
    }
    return;
  }
  const deg = 0;
  if (hat === "pagri" || hat === "pagri_tall") {
    // rounded wrapped turban: a dome from the brow line up, wraps crossing at the front, a tuck on top
    const tall = hat === "pagri_tall", by = hc - 0.2 * H, top = crownY - (tall ? 0.42 : 0.28) * H, wv = 0.62 * W;
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; pts.push([cx + turn * 0.06 * W + wv * Math.cos(a) * (1 - 0.1 * Math.sin(a) ** 4), by + (by - top) * Math.sin(a) * (1 + 0.06 * Math.cos(a * 3))]); }
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([cx + turn * 0.06 * W + wv * (1 - 2 * t), by + 0.05 * H * Math.sin(Math.PI * t)]); }
    form(p, pts, col, light, 0.76);
    p.pattern(pts, L.hatPat, L.hatPatCol ?? tint(col, 0.45), u / 1.3, 32);
    p.clip(pts, () => {
      const fxc = cx + turn * 0.3 * W;
      for (let k = 0; k < 5; k++) { // wraps: arcs that cross at the front centre
        const yy = by - (k + 0.6) * (by - top) / 5.6;
        p.stroke(curve([cx - wv * 1.1, yy + 0.1 * H], [fxc, yy - 0.04 * H * (k % 2 ? 1 : -1)], [cx + wv * 1.1, yy - 0.05 * H + 0.12 * H * (k % 2)]), 2.2 * u, rgba(INK, 0.55));
        p.stroke(curve([cx - wv * 1.1, yy + 0.06 * H], [fxc, yy - 0.08 * H], [cx + wv * 1.1, yy - 0.08 * H]), 3 * u, rgba("#ffffff", 0.12));
      }
    });
    p.poly(pts, null);
    if (L.hatTrim) trim(p, [[cx - wv * 0.96, by - 0.02 * H], [cx + turn * 0.06 * W, by + 0.04 * H], [cx + wv * 0.96, by - 0.02 * H]], L.hatTrim, 5 * u);
    // the front fold / kalgi tuck
    const kx = cx + turn * 0.3 * W, ky = top + 0.15 * H;
    p.poly([[kx - 0.1 * W, ky + 0.1 * H], [kx, ky - 0.05 * H], [kx + 0.12 * W, ky + 0.12 * H], [kx + 0.02 * W, ky + 0.2 * H]], shade(col, 0.88), 0.7 * p.ow);
    void deg; void at; void sg;
  } else if (hat === "headcloth") {
    // a rolled cloth tied around the head, knot at the side (dock workers, labourers)
    const by = hc - 0.22 * H, wv = 0.56 * W;
    const band: P2[] = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; band.push([cx - wv + 2 * wv * t, by - 0.08 * H * Math.sin(Math.PI * t) - 0.04 * H]); }
    for (let i = 16; i >= 0; i--) { const t = i / 16; band.push([cx - wv * 1.02 + 2 * wv * 1.02 * t, by + 0.1 * H - 0.06 * H * Math.sin(Math.PI * t)]); }
    const capPts: P2[] = [];
    for (let i = 0; i <= 18; i++) { const a = Math.PI + (i / 18) * Math.PI; capPts.push([cx + turn * 0.04 * W + wv * 0.98 * Math.cos(a), by + 0.02 * H + 0.36 * H * Math.sin(a)]); }
    form(p, capPts, shade(col, 0.95), light, 0.8); p.pattern(capPts, L.hatPat, L.hatPatCol ?? tint(col, 0.4), u / 1.4); p.poly(capPts, null);
    form(p, band, col, light, 0.78); p.poly(band, null);
    const s = turn > 0.1 ? -1 : 1, kx = cx + s * 0.5 * W, ky = by + 0.04 * H;
    p.ell(kx, ky, 0.09 * W, 0.07 * H, shade(col, 0.9));
    p.poly([[kx + s * 0.04 * W, ky], [kx + s * 0.2 * W, ky + 0.2 * H], [kx + s * 0.1 * W, ky + 0.22 * H]], shade(col, 0.85));
  } else if (hat === "gandhi") {
    const by = hc - 0.24 * H, wv = 0.5 * W;
    const pts: P2[] = [[cx - wv, by], [cx - wv * 0.9, by - 0.24 * H], [cx + wv * 0.9, by - 0.3 * H], [cx + wv, by - 0.02 * H]];
    form(p, pts, col, light, 0.85); p.poly(pts, null);
    p.stroke([[cx - wv * 0.95, by - 0.07 * H], [cx + wv * 0.95, by - 0.1 * H]], 1.6 * u, rgba(INK, 0.5));
  } else if (hat === "sola") {
    // 1850s pith helmet: a white/khaki dome, a folded puggaree band, a wide brim, a small top button
    const by = hc - 0.29 * H, wv = 0.6 * W, top = crownY - 0.3 * H;
    const brim = ellPts(cx + turn * 0.05 * W, by + 0.02 * H, 0.86 * W, 0.12 * H, 0, 360, 0, 32);
    p.poly(brim.filter(([, y]) => y < by + 0.02 * H).concat([[cx - 0.86 * W, by + 0.02 * H]]), shade(col, 0.8)); // back half of brim
    const dome: P2[] = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; dome.push([cx + turn * 0.04 * W + wv * Math.cos(a), by + (by - top) * Math.sin(a)]); }
    form(p, dome, col, light, 0.82);
    p.clip(dome, () => {
      for (let k = -2; k <= 2; k++) p.stroke(curve([cx + k * 0.14 * W, by], [cx + k * 0.09 * W + turn * 0.1 * W, top + 0.25 * H], [cx + turn * 0.06 * W, top]), 1.4 * u, rgba(INK, 0.3));
      p.g.fillStyle = L.hatTrim ?? shade(col, 0.88);
      p.g.fillRect(cx - wv, by - 0.17 * H, 2 * wv, 0.15 * H);
      for (let k = 0; k < 3; k++) p.stroke([[cx - wv, by - 0.06 * H - k * 0.045 * H], [cx + wv, by - 0.07 * H - k * 0.045 * H]], 1.2 * u, rgba(INK, 0.35));
    });
    p.poly(dome, null);
    const front = brim.filter(([, y]) => y >= by + 0.02 * H);
    p.poly([[cx - 0.86 * W, by + 0.02 * H], ...front.reverse(), [cx + 0.86 * W, by + 0.02 * H], [cx + wv, by + 0.02 * H], [cx - wv, by + 0.02 * H]], shade(col, 0.92));
    p.ell(cx + turn * 0.08 * W, top + 0.01 * H, 0.06 * W, 0.04 * H, shade(col, 0.85), 0.6 * p.ow);
  } else if (hat === "fire_helmet") {
    // 1940s brass fire-brigade helmet: polished dome, a raised comb, a badge, a short front peak
    const by = hc - 0.18 * H, wv = 0.6 * W, top = crownY - 0.24 * H, brass = col;
    const dome: P2[] = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; dome.push([cx + turn * 0.04 * W + wv * Math.cos(a), by + (by - top) * Math.sin(a)]); }
    p.poly(dome, p.lin(cx - wv, top, cx + wv, by, [[0, tint(brass, 0.35)], [0.35, brass], [0.75, shade(brass, 0.7)], [1, shade(brass, 0.85)]]));
    p.clip(dome, () => {
      p.stroke(ellPts(cx - 0.2 * W * (light || -1) * -1, top + 0.2 * H, 0.2 * W, 0.12 * H, 200, 300, 0, 10), 4 * u, rgba("#ffffff", 0.55));
      p.band([[cx - wv, by - 0.06 * H], [cx + wv, by - 0.06 * H]], shade(brass, 0.82), 0.05 * H, 1.2);
    });
    p.poly(dome, null);
    // a low rounded comb running front-to-back over the dome (seen end-on from the front)
    const cxx = cx + turn * 0.12 * W, cw = (0.09 + 0.12 * Math.abs(turn)) * W;
    const comb = ellPts(cxx, top + 0.04 * H, cw, 0.09 * H, 180, 360, 0, 14);
    p.poly(comb, p.lin(cxx - cw, 0, cxx + cw, 0, [[0, tint(brass, 0.35)], [0.5, brass], [1, shade(brass, 0.7)]]));
    p.stroke(ellPts(cxx - 0.02 * W, top + 0.03 * H, cw * 0.55, 0.05 * H, 200, 300, 0, 6), 2.2 * u, rgba("#ffffff", 0.6));
    // badge + front peak
    p.ell(cx + turn * 0.3 * W, by - 0.15 * H, 0.09 * W, 0.08 * H, tint(brass, 0.25), 0.6 * p.ow);
    p.dot(cx + turn * 0.3 * W, by - 0.15 * H, 0.035 * W, shade(brass, 0.6));
    p.poly(ellPts(cx + turn * 0.08 * W, by + 0.01 * H, 0.66 * W, 0.07 * H, 0, 180, 0, 16).concat([[cx - 0.62 * W, by]]), shade(brass, 0.75));
  } else if (hat === "cap" || hat === "forage") {
    const by = hc - 0.25 * H, wv = 0.52 * W;
    const dome: P2[] = [];
    for (let i = 0; i <= 20; i++) { const a = Math.PI + (i / 20) * Math.PI; dome.push([cx + wv * Math.cos(a), by + (hat === "forage" ? 0.22 : 0.3) * H * Math.sin(a)]); }
    form(p, dome, col, light, 0.8); p.poly(dome, null);
    if (hat === "forage") p.band([[cx - wv, by - 0.04 * H], [cx + wv, by - 0.04 * H]], L.hatTrim ?? PAL.red, 0.07 * H, 1.5);
    p.poly(ellPts(cx + turn * 0.25 * W, by + 0.02 * H, 0.38 * W, 0.08 * H, 0, 180, 0, 12), shade(col, 0.6));
  }
};

// ---------------- hands + props ----------------
type HandK = "open" | "fist" | "point" | "grip" | "wave";
const hand = (p: KPen, Wr: P2, dir: number, k: HandK, skin: string, r: Rig, side: number, gloves?: string) => {
  const { H } = r, col = gloves ?? skin, d: P2 = [Math.cos(dir), Math.sin(dir)], C: P2 = [Wr[0] + d[0] * 0.07 * H, Wr[1] + d[1] * 0.07 * H];
  const deg = (dir * 180) / Math.PI;
  if (k === "wave" || k === "open") {
    const n: P2 = [-d[1] * side, d[0] * side];
    if (k === "wave") for (let i = 0; i < 4; i++) {
      const a = dir + (i - 1.5) * 0.28, L = 0.12 * H * (i === 0 || i === 3 ? 0.85 : 1);
      const s: P2 = [C[0] + Math.cos(a) * 0.05 * H, C[1] + Math.sin(a) * 0.05 * H], e: P2 = [s[0] + Math.cos(a) * L, s[1] + Math.sin(a) * L];
      p.poly(tube([s, e], 0.055 * H, 0.045 * H), col, p.ow * 0.7);
    }
    p.ell(C[0], C[1], 0.1 * H, 0.085 * H, col, p.ow * 0.8, deg);
    p.ell(C[0] + n[0] * 0.08 * H - d[0] * 0.01 * H, C[1] + n[1] * 0.08 * H, 0.05 * H, 0.03 * H, col, p.ow * 0.7, deg + 40 * side);
    if (k === "open") p.stroke([[C[0] + d[0] * 0.02 * H, C[1] + d[1] * 0.02 * H], [C[0] + d[0] * 0.08 * H, C[1] + d[1] * 0.08 * H]], 0.012 * H, rgba(INK, 0.45));
  } else {
    p.ell(C[0], C[1], 0.085 * H, 0.078 * H, col, p.ow * 0.8, deg);
    for (let i = 0; i < 3; i++) { const a = dir + 0.5 + i * 0.35; p.stroke([[C[0] + Math.cos(a) * 0.05 * H, C[1] + Math.sin(a) * 0.05 * H], [C[0] + Math.cos(a) * 0.08 * H, C[1] + Math.sin(a) * 0.08 * H]], 0.01 * H, rgba(INK, 0.5)); }
    if (k === "point") p.poly(tube([[C[0] + d[0] * 0.05 * H, C[1] + d[1] * 0.05 * H], [C[0] + d[0] * 0.19 * H, C[1] + d[1] * 0.19 * H]], 0.05 * H, 0.042 * H), col, p.ow * 0.7);
  }
  return C;
};
/** chapati: a round flatbread with toasted spots (seeded so each one is different) */
export const drawChapati = (p: KPen, x: number, y: number, rx: number, ry: number, seed = 1, rot = 0) => {
  const pts = ellPts(x, y, rx, ry, 0, 360, rot, 36).map(([px, py], i) => [px + (hash(i, seed) - 0.5) * rx * 0.05, py + (hash(i, seed + 1) - 0.5) * ry * 0.05] as P2);
  p.poly(pts, p.rad(x, y, Math.max(rx, ry), [[0, "#f1d290"], [0.75, "#e6bb6c"], [1, "#c98f45"]]));
  p.clip(pts, () => {
    for (let i = 0; i < 9; i++) {
      const a = hash(i, seed + 3) * TAU, d = Math.sqrt(hash(i, seed + 4)) * 0.75;
      p.g.fillStyle = rgba("#7a4a1f", 0.35 + 0.35 * hash(i, seed + 5));
      p.g.beginPath(); p.g.ellipse(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, rx * (0.06 + 0.07 * hash(i, seed + 6)), ry * (0.05 + 0.05 * hash(i, seed + 7)), a, 0, TAU); p.g.fill();
    }
  });
  p.poly(pts, null, p.ow * 0.7);
};
const prop = (p: KPen, k: Prop, C: P2, dir: number, r: Rig, A: Anchors, seed: number, t: number) => {
  const { H, u } = r;
  if (!k) return;
  if (k === "chapati") drawChapati(p, C[0], C[1] - 0.12 * H, 0.26 * H, 0.24 * H, seed);
  else if (k === "chapatis") { // a small stack wrapped in a cloth
    for (let i = 3; i >= 0; i--) drawChapati(p, C[0], C[1] - 0.06 * H - i * 0.035 * H, 0.26 * H, 0.09 * H, seed + i);
    p.poly([[C[0] - 0.3 * H, C[1] - 0.02 * H], [C[0] + 0.3 * H, C[1] - 0.02 * H], [C[0] + 0.24 * H, C[1] + 0.1 * H], [C[0] - 0.24 * H, C[1] + 0.1 * H]], PAL.red);
    trim(p, [[C[0] - 0.28 * H, C[1] + 0.0 * H], [C[0] + 0.28 * H, C[1] + 0.0 * H]], PAL.sun, 0.035 * H);
  } else if (k === "lantern") { // hurricane lantern hanging from the hand
    const H = r.H * 1.45, x = C[0], y = C[1] + 0.04 * H;
    p.stroke(ellPts(x, y + 0.05 * H, 0.08 * H, 0.1 * H, 180, 360, 0, 10), 0.018 * H);
    p.poly(rrect(x - 0.1 * H, y + 0.05 * H, x + 0.1 * H, y + 0.1 * H, 0.02 * H), "#3d4a4a");
    const glass = ellPts(x, y + 0.24 * H, 0.1 * H, 0.15 * H, 0, 360, 0, 24);
    p.poly(glass, p.rad(x, y + 0.26 * H, 0.15 * H, [[0, "#fffbe0"], [0.3, "#ffd36a"], [1, "#e88a2c"]]));
    const fl = 0.04 * H * (1 + 0.15 * noise1(t * 9, seed));
    p.poly([[x, y + 0.27 * H - fl * 1.6], [x + fl * 0.5, y + 0.27 * H], [x, y + 0.3 * H], [x - fl * 0.5, y + 0.27 * H]], "#ffffff", 0);
    for (const s of [-1, 1]) p.stroke([[x + s * 0.1 * H, y + 0.1 * H], [x + s * 0.12 * H, y + 0.4 * H]], 0.02 * H, "#3d4a4a");
    p.poly(glass, null, p.ow * 0.6);
    p.poly(rrect(x - 0.13 * H, y + 0.38 * H, x + 0.13 * H, y + 0.45 * H, 0.02 * H), "#4a5656");
    A.glows.push({ x, y: y + 0.25 * H, r: 0.5 * H, col: PAL.fire });
  } else if (k === "torch") { // mashaal: a stick with an oil-soaked cloth head and a flame
    const top: P2 = [C[0] + Math.cos(dir - Math.PI / 2) * 0.05 * H, C[1] - 0.55 * H];
    p.band([[C[0], C[1] + 0.25 * H], top], "#7a4a2a", 0.05 * H, 2.5);
    p.poly(rrect(top[0] - 0.06 * H, top[1] - 0.04 * H, top[0] + 0.06 * H, top[1] + 0.1 * H, 0.03 * H), "#5a3a2a");
    flame(p, top[0], top[1] - 0.04 * H, 0.16 * H, t, seed);
    A.glows.push({ x: top[0], y: top[1] - 0.15 * H, r: 0.7 * H, col: PAL.fire });
  } else if (k === "lathi") { // a long bamboo staff, held near the top third
    const a: P2 = [C[0] + 0.02 * H, C[1] - 0.75 * H], b: P2 = [C[0] - 0.04 * H, r.sole - 0.02 * H];
    p.band([a, b], "#b08a4a", 0.045 * H, 2.5);
    for (let i = 1; i < 6; i++) { const m = lerp2(a, b, i / 6); p.stroke([[m[0] - 0.03 * H, m[1]], [m[0] + 0.03 * H, m[1]]], 0.012 * H); }
    p.band([lerp2(a, b, 0.0), lerp2(a, b, 0.05)], "#8a8f8f", 0.05 * H, 2);
  } else if (k === "gold") {
    goldBar(p, C[0], C[1] - 0.05 * H, 0.32 * H, 0, 0.6);
  } else if (k === "nozzle") { // brass branch-pipe of a fire hose
    const d: P2 = [Math.cos(dir), Math.sin(dir)];
    const a: P2 = [C[0] - d[0] * 0.55 * H, C[1] - d[1] * 0.55 * H], b: P2 = [C[0] + d[0] * 0.5 * H, C[1] + d[1] * 0.5 * H];
    p.poly(tube([a, lerp2(a, b, 0.45)], 0.15 * H, 0.13 * H), "#c9b48a");
    p.poly(tube([lerp2(a, b, 0.4), b], 0.13 * H, 0.06 * H), p.lin(C[0], C[1] - 0.08 * H, C[0], C[1] + 0.08 * H, [[0, tint(PAL.brass, 0.45)], [0.5, PAL.brass], [1, shade(PAL.brass, 0.65)]]));
    p.stroke([lerp2(a, b, 0.5), lerp2(a, b, 0.9)], 0.015 * H, rgba("#ffffff", 0.6));
    A.glows.push({ x: b[0], y: b[1], r: 0, col: "nozzle" });
  } else if (k === "bucket") {
    const x = C[0], y = C[1] + 0.05 * H;
    p.stroke(ellPts(x, y + 0.1 * H, 0.14 * H, 0.12 * H, 180, 360, 0, 10), 0.015 * H);
    p.poly([[x - 0.17 * H, y + 0.1 * H], [x + 0.17 * H, y + 0.1 * H], [x + 0.13 * H, y + 0.38 * H], [x - 0.13 * H, y + 0.38 * H]], p.lin(x - 0.17 * H, 0, x + 0.17 * H, 0, [[0, "#c9d2cf"], [1, "#7d8a88"]]));
    p.ell(x, y + 0.1 * H, 0.17 * H, 0.04 * H, "#5f9fa0", p.ow * 0.7);
  } else if (k === "letter") {
    p.poly([[C[0] - 0.12 * H, C[1] - 0.2 * H], [C[0] + 0.14 * H, C[1] - 0.22 * H], [C[0] + 0.16 * H, C[1] + 0.02 * H], [C[0] - 0.1 * H, C[1] + 0.04 * H]], PAL.paper);
    for (let i = 0; i < 4; i++) p.stroke([[C[0] - 0.07 * H, C[1] - 0.15 * H + i * 0.04 * H], [C[0] + 0.1 * H, C[1] - 0.16 * H + i * 0.04 * H]], 0.008 * H, rgba(INK, 0.5));
    p.dot(C[0] + 0.02 * H, C[1] + 0.01 * H, 0.035 * H, PAL.red);
  } else if (k === "bundle") {
    p.ell(C[0], C[1] + 0.1 * H, 0.22 * H, 0.17 * H, PAL.sea); p.pattern(ellPts(C[0], C[1] + 0.1 * H, 0.22 * H, 0.17 * H), "checks", tint(PAL.sea, 0.35), u / 1.3);
    p.ell(C[0], C[1] + 0.1 * H, 0.22 * H, 0.17 * H, null);
    p.poly([[C[0] - 0.05 * H, C[1] - 0.05 * H], [C[0] + 0.06 * H, C[1] - 0.06 * H], [C[0] + 0.02 * H, C[1] + 0.02 * H]], shade(PAL.sea, 0.85));
  } else if (k === "pot") {
    p.ell(C[0], C[1] - 0.1 * H, 0.2 * H, 0.18 * H, p.rad(C[0] - 0.05 * H, C[1] - 0.15 * H, 0.22 * H, [[0, "#e0a070"], [1, "#9a5a30"]]));
    p.ell(C[0], C[1] - 0.27 * H, 0.09 * H, 0.03 * H, "#6a3a20");
    p.band([[C[0] - 0.17 * H, C[1] - 0.1 * H], [C[0] + 0.17 * H, C[1] - 0.1 * H]], "#f2e6c8", 0.02 * H, 0);
  } else if (k === "whistle_up") {
    p.poly(rrect(C[0] - 0.02 * H, C[1] - 0.14 * H, C[0] + 0.04 * H, C[1] - 0.02 * H, 0.015 * H), tint(PAL.brass, 0.2));
  }
};
/** gold bar (trapezoid ingot) with a bevel and a glint; w = length, a = rotation (rad), glint 0..1 */
export const goldBar = (p: KPen, x: number, y: number, w: number, a: number, glint: number) => {
  const h = w * 0.36, top = w * 0.78;
  const R = (q2: P2): P2 => rot2([x + q2[0], y + q2[1]], a, [x, y]);
  const base = [[-w / 2, h / 2], [w / 2, h / 2], [top / 2, -h / 2], [-top / 2, -h / 2]].map((q2) => R(q2 as P2));
  const face = [[-top / 2, -h / 2], [top / 2, -h / 2], [top / 2 - w * 0.06, -h / 2 - h * 0.45], [-top / 2 + w * 0.06, -h / 2 - h * 0.45]].map((q2) => R(q2 as P2));
  p.poly(base, p.lin(base[3][0], base[3][1], base[1][0], base[1][1], [[0, "#ffe27a"], [0.5, "#f0b429"], [1, "#b97a12"]]), p.ow * 0.7);
  p.poly(face, p.lin(face[0][0], face[0][1], face[2][0], face[2][1], [[0, "#fff3b8"], [1, "#f7c948"]]), p.ow * 0.7);
  const c = R([w * 0.12, -h / 2 - h * 0.22]);
  if (glint > 0.02) star(p, c[0], c[1], w * 0.45 * glint, "#ffffff");
};
export const star = (p: KPen, x: number, y: number, r: number, col: string) => {
  const pts: P2[] = [];
  for (let k = 0; k < 8; k++) { const rr = k % 2 ? r * 0.16 : r, a = (k * Math.PI) / 4; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  p.glow(x, y, r * 0.7, "#fff6c8", 0.7);
  p.poly(pts, col, 0);
};
/** a cartoon flame (layered teardrops), flickering deterministically with t */
export const flame = (p: KPen, x: number, y: number, s: number, t: number, seed = 0) => {
  p.glow(x, y - s * 0.4, s * 1.6, PAL.fire, 0.45);
  const lay: [string, number][] = [[PAL.ember, 1], [PAL.fire, 0.75], [PAL.fireHot, 0.5], ["#fff7d6", 0.26]];
  lay.forEach(([c, k], i) => {
    const sw = noise1(t * 6 + i, seed + i) * 0.18, hh = s * k * (1.5 + 0.25 * noise1(t * 8 + i * 3, seed + 11));
    const pts: P2[] = [];
    for (let j = 0; j <= 16; j++) {
      const a = (j / 16) * TAU, cx2 = x + sw * s * (1 - Math.cos(a)) * 0.5;
      const rr = s * k * 0.55;
      const yy = Math.sin(a) > 0 ? y + Math.sin(a) * rr * 0.75 : y + Math.sin(a) * hh;
      const xx = cx2 + Math.cos(a) * rr * (Math.sin(a) > 0 ? 1 : 1 - 0.75 * (-Math.sin(a)) ** 1.5);
      pts.push([xx, yy]);
    }
    p.poly(pts, c, i === 0 ? p.ow * 0.6 : 0);
  });
};

// ---------------- shared drawing pieces ----------------
const footDraw = (p: KPen, P: Person, x: number, y: number, dir: number, r: Rig, near = true) => {
  const f = P.look.feet ?? "bare", { H } = r, s = dir;
  const col = f === "bare" ? P.skin : P.look.feetCol ?? (f === "boots" ? "#2a2a2e" : f === "jutti" ? "#b5482e" : "#5a3a2a");
  const c = near ? col : shade(col, 0.85);
  if (f === "jutti") {
    p.poly([[x - s * 0.08 * H, y - 0.07 * H], [x + s * 0.12 * H, y - 0.06 * H], [x + s * 0.26 * H, y - 0.08 * H], [x + s * 0.2 * H, y], [x - s * 0.1 * H, y]], c);
    p.stroke([[x, y - 0.05 * H], [x + s * 0.14 * H, y - 0.045 * H]], 0.012 * H, PAL.sun);
  } else if (f === "boots") {
    p.poly([[x - s * 0.1 * H, y - 0.2 * H], [x + s * 0.06 * H, y - 0.2 * H], [x + s * 0.08 * H, y - 0.08 * H], [x + s * 0.22 * H, y - 0.05 * H], [x + s * 0.22 * H, y], [x - s * 0.1 * H, y]], c);
    p.stroke([[x - s * 0.1 * H, y - 0.015 * H], [x + s * 0.22 * H, y - 0.015 * H]], 0.02 * H, "#141416");
  } else {
    const pts: P2[] = [[x - s * 0.08 * H, y - 0.06 * H], [x + s * 0.06 * H, y - 0.07 * H], [x + s * 0.2 * H, y - 0.03 * H], [x + s * 0.2 * H, y], [x - s * 0.09 * H, y]];
    p.poly(pts, c);
    if (f === "chappal") p.stroke([[x - s * 0.1 * H, y + 0.005 * H], [x + s * 0.22 * H, y + 0.005 * H]], 0.025 * H, "#6a4a32");
    if (f === "bare") for (let i = 0; i < 3; i++) p.stroke([[x + s * (0.14 + i * 0.022) * H, y - 0.03 * H], [x + s * (0.15 + i * 0.022) * H, y - 0.005 * H]], 0.008 * H, rgba(INK, 0.45));
  }
};

// ---------------- front view ----------------
const armTarget = (g: Gesture, side: number, S: P2, r: Rig, cx: number, t: number, wave: number, ph: number): { T: P2; bend: number; hk: HandK; dir?: number } => {
  const { H, hipY, shY, chin } = r;
  switch (g) {
    case "hips": return { T: [cx + side * r.hw * 1.0, hipY - 0.3 * H], bend: side, hk: "fist", dir: side > 0 ? Math.PI * 0.85 : Math.PI * 0.15 };
    case "wave": { const w = Math.sin(TAU * (wave || t * 1.6)); return { T: [S[0] + side * (0.42 + 0.14 * w) * H, shY - 0.95 * H], bend: -side, hk: "wave", dir: -Math.PI / 2 + side * 0.3 + 0.25 * w }; }
    case "beckon": { const w = Math.sin(TAU * (wave || t * 1.4)); return { T: [S[0] + side * 0.75 * H, shY + 0.15 * H - 0.12 * H * w], bend: -side, hk: "open", dir: -Math.PI / 2 + side * (0.9 + 0.4 * w) }; }
    case "point": return { T: [S[0] + side * 1.3 * H, shY - 0.18 * H], bend: -side, hk: "point", dir: side > 0 ? -0.14 : Math.PI + 0.14 };
    case "raise": return { T: [S[0] + side * 0.25 * H, shY - 1.25 * H], bend: -side, hk: "fist", dir: -Math.PI / 2 };
    case "carry": return { T: [cx + side * 0.18 * H, shY + 0.62 * H], bend: side, hk: "grip", dir: side > 0 ? Math.PI * 0.95 : 0.05 };
    case "hold": return { T: [S[0] + side * 0.42 * H, hipY - 0.1 * H], bend: -side, hk: "grip", dir: Math.PI / 2 };
    case "cover": return { T: [cx + side * 0.02 * H, shY + 0.32 * H], bend: side, hk: "open", dir: side > 0 ? Math.PI * 0.95 : 0.05 };
    case "cup": return { T: [S[0] + side * 0.32 * H, chin - 0.05 * H], bend: -side, hk: "open", dir: -Math.PI / 2 + side * 0.2 };
    case "fold": return { T: [cx - side * 0.3 * H, shY + 0.55 * H], bend: side, hk: "fist", dir: side > 0 ? Math.PI : 0 };
    case "shield": return { T: [cx + side * 0.42 * H, r.hc - 0.32 * H], bend: -side, hk: "open", dir: -Math.PI / 2 - side * 0.35 };
    case "hose": return side < 0 ? { T: [cx + 0.02 * H, shY + 0.62 * H], bend: -1, hk: "grip", dir: -0.35 } : { T: [cx + 0.42 * H, shY + 0.38 * H], bend: 1, hk: "grip", dir: -0.35 };
    case "reach": return { T: [S[0] + side * 0.9 * H, shY - 0.6 * H], bend: -side, hk: "open", dir: -Math.PI / 2 + side * 0.8 };
    default: { // hang (+ swing when walking)
      const sw = ph;
      return { T: [S[0] + side * 0.12 * H - sw * 0.15 * H * side * 0, hipY + 0.05 * H + Math.abs(sw) * -0.05 * H], bend: -side, hk: "open", dir: Math.PI / 2 - side * 0.12 + sw * 0.4 };
    }
  }
};

const upperGarment = (L: Look) => {
  const top = L.top;
  const long = top === "kurta" || top === "angrakha" || top === "officer_coat" || top === "fire_coat";
  return { long, sleeveless: top === "vest" || top === "banian" || L.sleeves === "none", short: L.sleeves === "short" || top === "blouse" };
};

export const drawPerson = (p: KPen, P: Person, pose: Pose = {}): Anchors => {
  return (pose.view ?? "front") === "side" ? drawSide(p, P, pose) : drawFront(p, P, pose);
};

const idleOf = (P: Person, pose: Pose) => {
  const t = pose.t ?? 0, k = pose.idle ?? 1, s = P.seed;
  return {
    t, k,
    breathe: k * Math.sin(TAU * (t / 3.6 + hash(s, 21))),
    shift: k * noise1(t * 0.22 + hash(s, 22) * 10, s + 22),
    hturn: k * 0.12 * noise1(t * 0.4 + hash(s, 23) * 10, s + 23),
    htilt: k * 3 * noise1(t * 0.33 + hash(s, 24) * 10, s + 24),
    blink: blinkAt(t, s),
    talk: talkAt(t, pose.talk, s),
  };
};

const drawFront = (p: KPen, P: Person, pose: Pose): Anchors => {
  const r = rig(P), L = P.look, I = idleOf(P, pose), { H, W, u } = r, light = pose.light ?? -1;
  const A: Anchors = { glows: [], head: [300, r.hc], hands: [] };
  p.ow = Math.max(3, 4.6 * u);
  const gait = pose.gait ?? "stand", ph = pose.phase ?? 0;
  const walkK = gait === "walk" ? 1 : gait === "run" ? 1.6 : 0;
  const bob = walkK ? -Math.abs(Math.sin(TAU * ph)) * 0.04 * H * walkK : I.breathe * 0.006 * H;
  const cx = 300 + I.shift * 0.06 * H + (pose.lean ?? 0) * 0.01 * H;
  const lift = (side: number) => walkK ? Math.max(0, Math.sin(TAU * (ph + (side > 0 ? 0.5 : 0)))) * 0.14 * H * walkK : 0;
  const turn = clamp((pose.turn ?? 0) + I.hturn, -0.95, 0.95), bt = clamp(pose.turn ?? 0, -0.6, 0.6);
  const hip = r.hipY + bob, sh = r.shY + bob - I.breathe * 0.008 * H, waist = r.waistY + bob;
  const fem = r.fem, gW = P.girth;
  const skirt = L.bottom === "sari" || L.bottom === "ghagra";
  const G = upperGarment(L);
  // ---- back layers: hair, veil drape, turban tail ----
  const headX = cx + (pose.lean ?? 0) * 0.02 * H, hc = r.hc + bob - I.breathe * 0.01 * H;
  const rH: Rig = { ...r, hc, shY: sh };
  hairBack(p, P, rH, headX, turn, light);
  hatDraw(p, P, rH, headX, turn, light, false);
  if (L.shawl) { // shawl back panel hanging behind the shoulders
    const pts: P2[] = [[cx - r.sw * 1.05, sh + 0.05 * H], [cx + r.sw * 1.05, sh + 0.05 * H], [cx + r.sw * 1.15, hip + 0.1 * H], [cx - r.sw * 1.15, hip + 0.1 * H]];
    form(p, pts, shade(L.shawl, 0.85), light); p.poly(pts, null);
  }
  // ---- legs + feet ----
  const legW = 0.2 * H * (0.75 + 0.25 * gW);
  const legs = [-1, 1].map((side) => {
    const hx = cx + side * 0.16 * H * (0.8 + 0.2 * gW), fx = 300 + side * 0.17 * H, fy = r.sole - lift(side);
    const K: P2 = [(hx + fx) / 2 + side * 0.02 * H, (hip + fy) / 2 - lift(side) * 0.3];
    return { side, Hp: [hx, hip - 0.05 * H] as P2, K, F: [fx, fy] as P2 };
  });
  const pantsCol = L.bottomCol;
  for (const l of legs) {
    const skinLeg = L.bottom === "dhoti" || L.bottom === "shorts" || L.bottom === "lungi" || skirt;
    const legPts = curve(l.Hp, l.K, [l.F[0], l.F[1] - 0.06 * H], 8);
    if (skinLeg) { p.poly(tube(legPts, legW * 0.9, legW * 0.62), P.skin); }
    else {
      const tp = tube(legPts, legW * (L.bottom === "pyjama" ? 1.25 : 1.1), legW * (L.bottom === "pyjama" ? 0.8 : 0.85));
      form(p, tp, pantsCol, light, 0.78); p.pattern(tp, L.bottomPat, L.bottomPatCol ?? tint(pantsCol, 0.3), u / 1.3);
      p.poly(tp, null);
      if (L.bottom === "trousers" && L.borderCol) p.stroke(curve([l.Hp[0] + l.side * legW * 0.5, l.Hp[1]], [l.K[0] + l.side * legW * 0.5, l.K[1]], [l.F[0] + l.side * legW * 0.4, l.F[1] - 0.08 * H]), 0.025 * H, L.borderCol);
      fold(p, [[l.K[0] - 0.05 * H, l.K[1] + 0.02 * H], [l.K[0] + 0.04 * H, l.K[1] - 0.01 * H]], 0.01 * H);
    }
    footDraw(p, P, l.F[0] - l.side * 0.02 * H, l.F[1], l.side, r);
  }
  // ---- lower garment over the legs ----
  if (L.bottom === "dhoti" || L.bottom === "lungi" || L.bottom === "shorts") {
    const hem = L.bottom === "lungi" ? r.sole - 0.22 * H : L.bottom === "shorts" ? (hip + r.sole) / 2 - 0.05 * H : r.sole - 0.6 * H;
    const wv = r.hw * 1.05, flare = L.bottom === "dhoti" ? 1.3 : L.bottom === "lungi" ? 1.12 : 1.15;
    const mid = L.bottom === "lungi" ? hem : hem - 0.3 * H;
    const pts: P2[] = [[cx - wv, waist + 0.05 * H], [cx + wv, waist + 0.05 * H], [cx + wv * flare, (hip + hem) / 2], [legs[1].K[0] + legW * 0.75, hem],
      [legs[1].K[0] - legW * 0.2, hem + 0.02 * H], [cx + 0.02 * H, mid], [legs[0].K[0] + legW * 0.2, hem + 0.02 * H], [legs[0].K[0] - legW * 0.75, hem], [cx - wv * flare, (hip + hem) / 2]];
    form(p, pts, L.bottomCol, light, 0.82);
    p.pattern(pts, L.bottomPat, L.bottomPatCol ?? shade(L.bottomCol, 0.85), u / 1.2);
    if (L.borderCol) p.clip(pts, () => { p.g.fillStyle = L.borderCol!; p.g.fillRect(cx - 2 * wv, hem - 0.07 * H, 4 * wv, 0.1 * H); });
    p.poly(pts, null);
    if (L.bottom === "dhoti") { // the front pleats (kachha) falling from the waist knot
      for (let i = -1; i <= 1; i++) fold(p, curve([cx + i * 0.04 * H, waist + 0.1 * H], [cx + i * 0.06 * H + 0.02 * H, (waist + mid) / 2], [cx + i * 0.09 * H, mid - 0.02 * H]), 0.012 * H);
      fold(p, curve([cx - wv * 0.8, waist + 0.15 * H], [cx - 0.2 * H, hip + 0.3 * H], [legs[0].K[0], hem - 0.05 * H]), 0.01 * H);
      fold(p, curve([cx + wv * 0.8, waist + 0.15 * H], [cx + 0.2 * H, hip + 0.3 * H], [legs[1].K[0], hem - 0.05 * H]), 0.01 * H);
    } else if (L.bottom === "lungi") fold(p, [[cx + wv * 0.4, waist + 0.06 * H], [cx + 0.05 * H, hem]], 0.012 * H);
  } else if (skirt) {
    const hem = r.sole - 0.1 * H, wv = r.hw * 1.05, fl = L.bottom === "ghagra" ? 1.9 : 1.45;
    const pts: P2[] = [[cx - wv, waist], [cx + wv, waist], [300 + wv * fl, hem], [300 - wv * fl, hem]];
    const hemC: P2[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12; hemC.push([300 + wv * fl * (1 - 2 * t), hem + 0.03 * H * Math.sin(t * Math.PI * 6)]); }
    const sk = [pts[0], pts[1], ...hemC];
    form(p, sk, L.bottomCol, light, 0.8);
    p.pattern(sk, L.bottomPat, L.bottomPatCol ?? tint(L.bottomCol, 0.4), u / 1.2);
    p.clip(sk, () => {
      for (let i = -3; i <= 3; i++) fold(p, [[cx + i * 0.05 * H, waist + 0.1 * H], [300 + i * 0.13 * H * fl, hem]], 0.009 * H);
      if (L.borderCol) { p.g.fillStyle = L.borderCol; p.g.fillRect(0, hem - 0.12 * H, 600, 0.2 * H); }
    });
    if (L.borderCol) trim(p, hemC.map(([x, y]) => [x, y - 0.13 * H] as P2), L.borderCol, 0.04 * H, PAL.gold);
    p.poly(sk, null);
  }
  // ---- torso ----
  const raised = (g: Gesture) => g === "wave" || g === "raise" || g === "reach" || g === "shield";
  const hemY = G.long ? (L.top === "kurta" || L.top === "angrakha" ? hip + 0.95 * H : hip + 0.42 * H) : L.top === "blouse" ? r.waistY - 0.25 * H + bob : hip + 0.08 * H;
  const flare = G.long ? (L.top === "officer_coat" || L.top === "fire_coat" ? 1.1 : 1.3) : 1.0;
  const nk = 0.13 * H, swk = r.sw;
  const torso: P2[] = [
    [cx - nk, sh - 0.12 * H], [cx + nk, sh - 0.12 * H],
    ...ellPts(cx + swk - 0.12 * H, sh + 0.05 * H, 0.14 * H, 0.15 * H, -90, 0, 0, 6).slice(1),
    [cx + swk * 0.93, sh + 0.45 * H], [cx + r.ww, waist], [cx + r.hw * (G.long ? 1.05 : 1.0), Math.min(hip, hemY)],
    ...(hemY > hip ? [[cx + r.hw * flare, hemY] as P2, [cx - r.hw * flare, hemY] as P2] : []),
    [cx - r.hw * (G.long ? 1.05 : 1.0), Math.min(hip, hemY)], [cx - r.ww, waist], [cx - swk * 0.93, sh + 0.45 * H],
    ...ellPts(cx - swk + 0.12 * H, sh + 0.05 * H, 0.14 * H, 0.15 * H, 180, 270, 0, 6).slice(0, -1),
  ];
  const topCol = L.top === "banian" ? (L.topCol ?? "#eef0ea") : L.topCol;
  const arms = pose.arms ?? ["hang", "hang"], holds = pose.hold ?? [null, null];
  const sleeveCol = L.top === "officer_coat" || L.top === "fire_coat" || L.top === "jacket" ? topCol : topCol;
  const skinArm = G.sleeveless;
  const overHead = (g: Gesture) => g === "cup";
  const drawArm = (side: number, ai: number) => {
    const g = arms[ai];
    const S: P2 = [cx + side * (swk - 0.1 * H), sh + 0.07 * H];
    const sw = walkK ? Math.sin(TAU * ph) * side * 0.6 * walkK : I.shift * 0.08 * side;
    const tg = armTarget(g, side, S, r, cx, I.t, pose.wave ?? 0, sw);
    if (g === "hang") { // relaxed arm: almost straight, angled a little away from the body, hand beside the thigh (no kinked elbow)
      const reach = (r.ua + r.fa) * 0.975, ang = Math.PI / 2 - side * (0.11 + 0.02 * Math.abs(sw)) + sw * 0.35;
      tg.T = [S[0] + Math.cos(ang) * reach, S[1] + Math.sin(ang) * reach]; tg.bend = side; tg.dir = ang - side * 0.08;
    }
    const [E, Wr] = ik2(S, tg.T, r.ua, r.fa, tg.bend);
    const line = [S, lerp2(S, E, 0.5), E, lerp2(E, Wr, 0.5), Wr];
    const sleeveLong = !G.sleeveless && !G.short && !(L.extras ?? []).includes("rolled_sleeves");
    if (skinArm) p.poly(tube(line, 0.21 * H, 0.13 * H), P.skin);
    else {
      if (!sleeveLong) p.poly(tube([lerp2(S, E, 0.4), E, lerp2(E, Wr, 0.5), Wr], 0.17 * H, 0.13 * H), P.skin);
      const up = G.short ? tube([S, lerp2(S, E, 0.6)], 0.23 * H, 0.21 * H)
        : (L.extras ?? []).includes("rolled_sleeves") ? tube([S, lerp2(S, E, 0.5), E, lerp2(E, Wr, 0.2)], 0.22 * H, 0.18 * H) : tube(line, 0.22 * H, 0.16 * H);
      form(p, up, sleeveCol, light, 0.8); p.pattern(up, L.topPat, L.topPatCol ?? tint(topCol, 0.35), u / 1.2); p.poly(up, null);
      if (sleeveLong) {
        const cuffC = L.top === "officer_coat" ? (L.trimCol ?? "#1f3a5a") : L.trimCol;
        if (cuffC) p.band([lerp2(E, Wr, 0.8), lerp2(E, Wr, 0.96)], cuffC, 0.16 * H, 1.5, "butt");
        fold(p, [[E[0] - 0.05 * H, E[1] - 0.02 * H], [E[0] + 0.03 * H, E[1] + 0.03 * H]], 0.009 * H);
        fold(p, [lerp2(S, E, 0.75), lerp2(S, E, 0.9)], 0.008 * H);
      }
    }
    if ((L.extras ?? []).includes("bangles")) for (let i = 0; i < 3; i++) p.band([lerp2(E, Wr, 0.82 + i * 0.05), lerp2(E, Wr, 0.83 + i * 0.05)], i % 2 ? PAL.red : PAL.gold, 0.15 * H, 0.8, "butt");
    const dir = tg.dir ?? Math.atan2(Wr[1] - E[1], Wr[0] - E[0]);
    const hold = holds[ai];
    const gl = (L.extras ?? []).includes("gloves") ? "#2a2622" : undefined;
    if (hold === "lantern" || hold === "bucket" || hold === "lathi" || hold === "torch" || hold === "nozzle") {
      const C = [Wr[0] + Math.cos(dir) * 0.07 * H, Wr[1] + Math.sin(dir) * 0.07 * H] as P2; prop(p, hold, C, dir, r, A, P.seed + ai, I.t); hand(p, Wr, dir, "grip", P.skin, r, side, gl); A.hands.push(C);
    } else { const C = hand(p, Wr, dir, hold ? "grip" : tg.hk, P.skin, r, side, gl); prop(p, hold, C, dir, r, A, P.seed + ai, I.t); A.hands.push(C); }
  };
  [-1, 1].forEach((side, ai) => { if (raised(arms[ai])) drawArm(side, ai); });
  // neck first (under the collar)
  const neck = tube([[headX, hc + 0.3 * H], [cx, sh - 0.02 * H]], 0.34 * W, 0.4 * W);
  p.poly(neck, shade(P.skin, 0.9));
  if (L.top === "blouse") { // midriff skin under a short blouse
    const mid: P2[] = [[cx - r.ww, hemY - 0.02 * H], [cx + r.ww, hemY - 0.02 * H], [cx + r.ww, waist + 0.02 * H], [cx - r.ww, waist + 0.02 * H]];
    p.poly(mid, P.skin, 0);
  }
  form(p, torso, topCol, light, 0.8);
  p.pattern(torso, L.topPat, L.topPatCol ?? tint(topCol, 0.35), u / 1.2);
  // garment detailing (clipped to the torso)
  p.clip(torso, () => {
    const pc = cx + bt * 0.25 * H;
    if (L.top === "banian") p.poly(ellPts(pc, sh - 0.1 * H, 0.2 * H, 0.32 * H, 0, 180, 0, 12), P.skin, p.ow * 0.7);
    if (L.top === "kurta" || L.top === "kurta_short") { // round neck + placket + buttons, side seams
      p.poly(ellPts(pc, sh - 0.12 * H, 0.15 * W, 0.09 * H, 0, 180, 0, 10), shade(P.skin, 0.9), p.ow * 0.6);
      p.stroke([[pc, sh - 0.04 * H], [pc, sh + 0.42 * H]], 0.012 * H, rgba(INK, 0.6));
      for (let i = 0; i < 3; i++) p.dot(pc + 0.03 * H, sh + 0.06 * H + i * 0.12 * H, 0.022 * H, L.trimCol ?? shade(topCol, 0.6));
      if (L.trimCol) trim(p, [[pc - 0.06 * H, sh - 0.08 * H], [pc - 0.06 * H, sh + 0.42 * H]], L.trimCol, 0.035 * H);
      fold(p, [[cx - r.ww * 0.7, waist - 0.1 * H], [cx - r.ww * 0.3, waist + 0.05 * H]], 0.01 * H);
      fold(p, [[cx + r.ww * 0.6, waist + 0.15 * H], [cx + r.hw * 0.9, hemY - 0.1 * H]], 0.01 * H);
      if (L.trimCol) trim(p, [[cx - r.hw * flare * 1.2, hemY - 0.04 * H], [cx + r.hw * flare * 1.2, hemY - 0.04 * H]], L.trimCol, 0.04 * H);
    }
    if (L.top === "angrakha") { // wrap front: a curved opening + ties
      p.stroke(curve([pc - 0.1 * H, sh - 0.1 * H], [pc + 0.2 * H, sh + 0.25 * H], [pc - 0.05 * H, waist]), 0.016 * H, rgba(INK, 0.75));
      for (const y of [sh + 0.22 * H, waist - 0.12 * H]) p.stroke([[pc + 0.1 * H, y], [pc + 0.2 * H, y + 0.08 * H]], 0.012 * H, L.trimCol ?? PAL.red);
      if (L.trimCol) trim(p, curve([pc - 0.12 * H, sh - 0.1 * H], [pc + 0.22 * H, sh + 0.26 * H], [pc - 0.07 * H, waist + 0.02 * H]), L.trimCol, 0.035 * H);
      p.g.fillStyle = shade(topCol, 0.88); p.g.fillRect(cx - 2 * r.hw, waist - 0.03 * H, 4 * r.hw, 0.08 * H);
      for (let i = -3; i <= 3; i++) fold(p, [[cx + i * 0.09 * H, waist + 0.1 * H], [cx + i * 0.14 * H, hemY]], 0.008 * H);
    }
    if (L.top === "shirt" || L.top === "jacket") { // collar points + buttons
      for (const s of [-1, 1]) p.poly([[pc, sh - 0.08 * H], [pc + s * 0.14 * H, sh - 0.12 * H], [pc + s * 0.1 * H, sh + 0.05 * H]], tint(topCol, 0.15), p.ow * 0.6);
      p.stroke([[pc, sh - 0.06 * H], [pc, hemY]], 0.01 * H, rgba(INK, 0.55));
      for (let i = 0; i < 4; i++) p.dot(pc + 0.025 * H, sh + 0.08 * H + i * 0.15 * H, 0.018 * H, "#f6f0e0");
      for (const s of [-1, 1]) p.poly(rrect(pc + s * 0.25 * H - 0.07 * H, sh + 0.12 * H, pc + s * 0.25 * H + 0.07 * H, sh + 0.26 * H, 0.02 * H), shade(topCol, 0.92), p.ow * 0.5);
    }
    if (L.top === "officer_coat") { // 1857 scarlet coat: dark-blue facings, gold buttons, collar, cuffs, skirts
      const fc = L.trimCol ?? "#1f3a5a";
      p.poly([[pc - 0.12 * H, sh - 0.12 * H], [pc + 0.12 * H, sh - 0.12 * H], [pc + 0.1 * H, sh - 0.02 * H], [pc - 0.1 * H, sh - 0.02 * H]], fc, p.ow * 0.6);
      p.g.fillStyle = fc; p.g.fillRect(pc - 0.07 * H, sh - 0.02 * H, 0.14 * H, waist - sh);
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { p.dot(pc + s * 0.045 * H, sh + 0.04 * H + i * 0.14 * H, 0.024 * H, INK); p.dot(pc + s * 0.045 * H, sh + 0.04 * H + i * 0.14 * H, 0.018 * H, PAL.gold); }
      p.stroke([[pc, waist + 0.04 * H], [pc, hemY]], 0.012 * H, rgba(INK, 0.6));
      for (const s of [-1, 1]) fold(p, [[cx + s * 0.2 * H, waist + 0.1 * H], [cx + s * 0.32 * H, hemY - 0.05 * H]], 0.01 * H);
    }
    if (L.top === "fire_coat") { // double-breasted fire-brigade tunic: two columns of brass buttons, high collar, belt
      p.poly([[pc - 0.13 * H, sh - 0.13 * H], [pc + 0.13 * H, sh - 0.13 * H], [pc + 0.12 * H, sh + 0.0 * H], [pc - 0.12 * H, sh + 0.0 * H]], shade(topCol, 0.8), p.ow * 0.6);
      p.stroke(curve([pc - 0.14 * H, sh + 0.02 * H], [pc + 0.04 * H, sh + 0.2 * H], [pc + 0.1 * H, hemY]), 0.012 * H, rgba(INK, 0.7));
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const x = pc + s * 0.12 * H, y = sh + 0.08 * H + i * 0.16 * H; p.dot(x, y, 0.026 * H, INK); p.dot(x, y, 0.02 * H, PAL.brass); p.dot(x - 0.006 * H, y - 0.006 * H, 0.007 * H, "#fff3c4"); }
      for (const s of [-1, 1]) fold(p, [[cx + s * 0.18 * H, waist + 0.12 * H], [cx + s * 0.3 * H, hemY - 0.05 * H]], 0.01 * H);
    }
    if (L.top === "vest") { // sleeveless working vest over a bare chest: open front
      p.poly([[pc - 0.08 * H, sh - 0.12 * H], [pc + 0.08 * H, sh - 0.12 * H], [pc + 0.05 * H, hemY], [pc - 0.05 * H, hemY]], P.skin, p.ow * 0.7);
      fold(p, [[pc - 0.02 * H, sh + 0.2 * H], [pc + 0.02 * H, sh + 0.24 * H]], 0.01 * H);
    }
    if (L.vestCol) { // sadri / waistcoat over the top
      for (const s of [-1, 1]) {
        const vp: P2[] = [[pc + s * 0.06 * H, sh - 0.1 * H], [cx + s * swk * 0.85, sh - 0.02 * H], [cx + s * swk * 0.82, sh + 0.42 * H], [cx + s * r.ww * 1.05, hip], [pc + s * 0.04 * H, hip + 0.05 * H]];
        form(p, vp, L.vestCol, light, 0.82); p.poly(vp, null, p.ow * 0.7);
      }
      for (let i = 0; i < 4; i++) p.dot(pc - 0.03 * H, sh + 0.08 * H + i * 0.12 * H, 0.02 * H, PAL.gold);
    }
    // waist sash / patka / belts
    const sash = L.sash;
    if (sash) {
      p.band([[cx - 2 * r.ww, waist], [cx + 2 * r.ww, waist + 0.02 * H]], sash, 0.12 * H, 1.5, "butt");
      p.pattern([[cx - 2 * r.ww, waist - 0.06 * H], [cx + 2 * r.ww, waist - 0.05 * H], [cx + 2 * r.ww, waist + 0.08 * H], [cx - 2 * r.ww, waist + 0.07 * H]], "stripes", tint(sash, 0.35), u / 1.6, 90);
    }
    const ex = L.extras ?? [];
    if (ex.includes("belt") || ex.includes("axe_belt")) {
      p.band([[cx - 2 * r.ww, waist + 0.02 * H], [cx + 2 * r.ww, waist + 0.02 * H]], "#2a2622", 0.08 * H, 1.5, "butt");
      p.poly(rrect(pc - 0.06 * H, waist - 0.03 * H, pc + 0.06 * H, waist + 0.07 * H, 0.015 * H), PAL.brass, p.ow * 0.6);
    }
    if (ex.includes("crossbelts")) for (const s of [-1, 1]) p.band([[cx - s * swk, sh - 0.02 * H], [cx + s * r.hw, hip]], "#f4f1e6", 0.07 * H, 1.5, "butt");
    if (ex.includes("chapras")) { // the watchman's brass badge on a cloth belt over the shoulder
      p.band([[cx - swk * 0.9, sh - 0.04 * H], [cx + r.hw * 0.95, hip - 0.02 * H]], L.trimCol ?? PAL.red, 0.08 * H, 1.5, "butt");
      const bx = lerp(cx - swk * 0.9, cx + r.hw * 0.95, 0.38), by = lerp(sh - 0.04 * H, hip, 0.38);
      p.ell(bx, by, 0.1 * H, 0.08 * H, p.lin(bx - 0.1 * H, by - 0.08 * H, bx + 0.1 * H, by + 0.08 * H, [[0, "#fff0a8"], [0.5, PAL.brass], [1, "#8a6420"]]), p.ow * 0.6);
      p.ell(bx, by, 0.055 * H, 0.04 * H, null, 0.012 * H);
    }
    if (ex.includes("janeu")) p.stroke([[cx - swk * 0.8, sh - 0.03 * H], [cx + r.ww * 0.9, hip - 0.1 * H]], 0.01 * H, "#f6f0dc");
  });
  p.poly(torso, null);
  if ((L.extras ?? []).includes("sash") && L.top === "officer_coat") { // crimson officer's sash knotted at the hip, tassels
    const s = 1, kx = cx + s * r.hw * 0.85, ky = waist + 0.08 * H;
    p.band([[cx - r.ww * 1.05, waist], [cx + r.ww * 1.05, waist]], "#b0283a", 0.11 * H, 1.5, "butt");
    p.poly([[kx - 0.04 * H, ky], [kx + 0.06 * H, ky], [kx + 0.09 * H, ky + 0.35 * H], [kx - 0.02 * H, ky + 0.33 * H]], "#b0283a");
    for (let i = 0; i < 4; i++) p.stroke([[kx + i * 0.025 * H - 0.01 * H, ky + 0.33 * H], [kx + i * 0.025 * H - 0.015 * H, ky + 0.42 * H]], 0.012 * H, "#d84a5a");
  }
  // shawl / stole: over both shoulders, ends hanging in front
  if (L.shawl) for (const s of [-1, 1]) {
    const pts: P2[] = [[cx + s * 0.1 * H, sh - 0.12 * H], [cx + s * (swk + 0.08 * H), sh - 0.02 * H], [cx + s * (swk * 0.95), hip + 0.25 * H], [cx + s * (swk * 0.55), hip + 0.28 * H], [cx + s * 0.16 * H, sh + 0.1 * H]];
    form(p, pts, L.shawl, light, 0.8);
    p.pattern(pts, "buti", tint(L.shawl, 0.3), u / 1.3);
    p.poly(pts, null);
    if (L.shawlTrim) trim(p, [[cx + s * (swk * 0.95), hip + 0.22 * H], [cx + s * (swk * 0.55), hip + 0.25 * H]], L.shawlTrim, 0.045 * H);
  }
  if (L.bottom === "sari") { // the pallu: across the chest, over the left shoulder
    const s = -1;
    const pts: P2[] = [[cx + r.hw * 0.95, waist + 0.08 * H], [cx + r.ww * 0.6, waist - 0.05 * H], [cx + s * swk * 0.6, sh - 0.1 * H], [cx + s * (swk + 0.06 * H), sh - 0.02 * H], [cx + s * (swk + 0.02 * H), sh + 0.4 * H], [cx - 0.1 * H, waist + 0.02 * H]];
    form(p, pts, L.bottomCol, light, 0.82); p.pattern(pts, L.bottomPat, L.bottomPatCol ?? tint(L.bottomCol, 0.4), u / 1.2); p.poly(pts, null);
    if (L.borderCol) trim(p, [[cx + r.hw * 0.95, waist + 0.08 * H], [cx + s * swk * 0.65, sh - 0.08 * H]], L.borderCol, 0.04 * H, PAL.gold);
    for (let i = 0; i < 3; i++) fold(p, [[cx + 0.1 * H - i * 0.08 * H, waist - 0.02 * H], [cx - 0.12 * H - i * 0.06 * H, sh + 0.2 * H]], 0.009 * H);
  }
  if ((L.extras ?? []).includes("epaulettes")) for (const s of [-1, 1]) {
    p.ell(cx + s * (swk - 0.06 * H), sh - 0.02 * H, 0.12 * H, 0.05 * H, PAL.gold, p.ow * 0.6);
    for (let i = 0; i < 6; i++) p.stroke([[cx + s * (swk - 0.15 * H + i * 0.035 * H), sh + 0.02 * H], [cx + s * (swk - 0.15 * H + i * 0.035 * H), sh + 0.08 * H]], 0.012 * H, PAL.gold);
  }
  if ((L.extras ?? []).includes("medal")) { p.poly(rrect(cx - 0.2 * H, sh + 0.12 * H, cx - 0.12 * H, sh + 0.18 * H, 0.01 * H), PAL.red, p.ow * 0.4); p.ell(cx - 0.16 * H, sh + 0.24 * H, 0.04 * H, 0.04 * H, PAL.gold, p.ow * 0.5); }
  // ---- arms ----
  if (arms[0] === "hose" && arms[1] === "hose") { // canvas hose: from the ground behind, up to the rear hand
    const c0: P2 = [cx - 0.9 * H, r.sole - 0.05 * H], c1: P2 = [cx - 0.1 * H, hip + 0.4 * H], c2: P2 = [cx - 0.05 * H, sh + 0.62 * H];
    p.poly(tube(curve(c0, c1, c2, 12), 0.15 * H, 0.15 * H), "#c9b48a");
    for (let i = 1; i < 6; i++) { const q2 = curve(c0, c1, c2, 12)[i * 2]; p.dot(q2[0], q2[1], 0.012 * H, rgba(INK, 0.4)); }
  }
  [-1, 1].forEach((side, ai) => { if (!overHead(arms[ai]) && !raised(arms[ai])) drawArm(side, ai); });
  // ---- head ----
  const tilt = (pose.headTilt ?? 0) + I.htilt;
  p.g.save();
  p.g.translate(headX, hc + 0.45 * H); p.g.rotate(rad(tilt)); p.g.translate(-headX, -(hc + 0.45 * H));
  drawHead(p, P, rH, headX, hc, turn, light, pose, I);
  p.g.restore();
  [-1, 1].forEach((side, ai) => { if (overHead(arms[ai]) && !raised(arms[ai])) drawArm(side, ai); });
  A.head = [headX, hc];
  void fem; void PAL;
  return A;
};

const drawHead = (p: KPen, P: Person, r: Rig, cx: number, hc: number, turn: number, light: number, pose: Pose, I: ReturnType<typeof idleOf>) => {
  const { W, H, u } = r, at = Math.abs(turn), sg = turn < 0 ? -1 : 1, L = P.look;
  // ears (behind the head contour)
  for (const s of [-1, 1]) {
    if (at > 0.4 && s === sg) continue;
    const ex = at > 0.4 ? cx - sg * (0.48 - 0.42 * clamp((at - 0.4) / 0.6)) * W : cx + s * 0.48 * W + turn * 0.12 * W;
    p.ell(ex, hc + 0.06 * H, 0.09 * W, 0.13 * H, shade(P.skin, 0.95), p.ow * 0.85);
    p.stroke(ellPts(ex, hc + 0.06 * H, 0.04 * W, 0.07 * H, s > 0 ? -80 : 100, s > 0 ? 80 : 260, 0, 6), 1.4 * u, rgba(INK, 0.5));
    if ((L.extras ?? []).includes("earrings")) { p.dot(ex, hc + 0.2 * H, 0.03 * W, PAL.gold); p.dot(ex, hc + 0.25 * H, 0.02 * W, PAL.gold); }
  }
  const hp = headPts(cx, hc, W, H, turn, r.kid);
  p.poly(hp, p.rad(cx + light * 0.18 * W, hc - 0.12 * H, 0.75 * W, [[0, tint(P.skin, 0.06)], [0.55, P.skin], [1, shade(P.skin, 0.86)]]), 0);
  // soft cheek-bone shading on the far side
  p.clip(hp, () => { p.g.fillStyle = rgba(shade(P.skin, 0.75), 0.35); p.g.beginPath(); p.g.ellipse(cx - light * 0.62 * W, hc + 0.1 * H, 0.3 * W, 0.6 * H, 0, 0, TAU); p.g.fill(); });
  p.poly(hp, null);
  const look = pose.look === "idle" || pose.look === undefined ? gazeAt(I.t, P.seed, 0.35 * I.k) : pose.look;
  const ex = L.extras ?? [];
  if (L.facial === "beard" || L.facial === "chops" || L.facial === "stubble") facialHair(p, { ...P, look: { ...L, facial: L.facial === "chops" ? "chops" : L.facial } }, r, cx, turn, true);
  drawFace(p, cx, hc, W, H, { expr: pose.expr, turn, blink: I.blink, look, talk: I.talk, skin: P.skin, brows: mix(P.hairCol, INK, 0.3), lashes: r.fem, age: P.age, light });
  if (ex.includes("bindi") && at < 0.85) p.dot(cx + turn * 0.3 * W, hc - 0.14 * H, 0.03 * W, PAL.red);
  if (ex.includes("nosering") && at < 0.85) p.stroke(ellPts(cx + turn * 0.37 * W + sg * 0.05 * W, hc + 0.27 * H, 0.035 * W, 0.04 * H, -40, 220, 0, 8), 1.4 * u, PAL.gold);
  facialHair(p, P, r, cx, turn, false);
  hairFront(p, P, r, cx, turn, light);
  hatDraw(p, P, r, cx, turn, light, true);
};

// ---------------- side view (walk / run / stand in profile, facing +x) ----------------
const drawSide = (p: KPen, P: Person, pose: Pose): Anchors => {
  const r = rig(P), L = P.look, I = idleOf(P, pose), { H, W, u } = r, light = pose.light ?? -1;
  const A: Anchors = { glows: [], head: [300, r.hc], hands: [] };
  p.ow = Math.max(3, 4.6 * u);
  const gait = pose.gait ?? "stand", ph = (((pose.phase ?? 0) % 1) + 1) % 1, run = gait === "run";
  const legLen = r.sole - r.hipY - 0.02 * H, l1 = legLen * 0.5, l2 = legLen * 0.5;
  const S = (run ? 1.55 : 0.95) * H * (pose.stride ?? 1);
  type LegS = { ank: P2; pitch: number; near: boolean };
  let hipY = r.hipY, lean = pose.lean ?? 0, nearFwd = 0;
  const legs: LegS[] = [];
  const ankY = r.sole - 0.03 * H;
  if (gait === "walk" || gait === "run") {
    const duty = run ? 0.38 : 0.6; // fraction of the cycle a foot is on the ground
    const foot = (c: number) => {
      if (c < duty) { const s = c / duty; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - duty) / (1 - duty);
      const x = -S / 2 + S * (s - Math.sin(TAU * s) / TAU);
      const h = (run ? 0.42 : 0.16) * H * Math.sin(Math.PI * s) ** (run ? 0.8 : 1) + (run ? 0.18 * H * Math.sin(Math.PI * Math.min(1, s * 1.6)) : 0);
      return { x: x - (run ? 0.18 * H * Math.sin(Math.PI * s) : 0), h, stance: false, s };
    };
    const nL = foot(ph), fL = foot((ph + 0.5) % 1);
    for (const [Lg, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + Lg.x, ankY - Lg.h], pitch: Lg.stance ? 0 : rad((run ? 55 : 30) * Math.sin(Math.PI * Lg.s) * (1 - 1.5 * Lg.s)), near });
    const st = nL.stance ? nL : fL.stance ? fL : null;
    if (st) hipY = ankY - Math.sqrt(Math.max(1, (legLen * 0.985) ** 2 - st.x * st.x)) + (run ? 0.03 * H : 0);
    else hipY = r.hipY - 0.06 * H; // flight phase of the run
    hipY += run ? 0.05 * H : 0;
    lean += run ? 12 : 3 + 1.5 * Math.cos(2 * TAU * ph);
    nearFwd = nL.x / (S / 2);
  } else {
    hipY = r.hipY + I.breathe * 0.004 * H;
    legs.push({ ank: [300 - 0.06 * H, ankY], pitch: 0, near: false }, { ank: [300 + 0.06 * H, ankY], pitch: 0, near: true });
  }
  const hip: P2 = [300, hipY];
  const kneeOf = (ank: P2) => {
    const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - a;
    return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)] as P2;
  };
  const skirt = L.bottom === "sari" || L.bottom === "ghagra" || L.bottom === "lungi";
  const skinLeg = L.bottom === "dhoti" || L.bottom === "shorts" || L.bottom === "lungi" || skirt;
  const legW = 0.21 * H * (0.75 + 0.25 * P.girth);
  const drawLeg = (Lg: LegS) => {
    const K = kneeOf(Lg.ank), dk = (c: string) => (Lg.near ? c : shade(c, 0.78));
    if (skinLeg) p.poly(tube([[hip[0], hip[1]], K, Lg.ank], legW * 0.9, legW * 0.6), dk(P.skin));
    else {
      const tp = tube([[hip[0], hip[1]], K, [Lg.ank[0], Lg.ank[1] - 0.04 * H]], legW * 1.15, legW * 0.85);
      form(p, tp, dk(L.bottomCol), light, 0.82); p.poly(tp, null);
      if (L.bottom === "trousers" && L.borderCol) p.stroke([[hip[0], hip[1]], K, Lg.ank], 0.02 * H, dk(L.borderCol));
    }
    if (L.bottom === "dhoti" || L.bottom === "shorts") { // cloth around the thigh down past the knee
      const end = L.bottom === "shorts" ? lerp2(hip, K, 0.9) : lerp2(K, Lg.ank, 0.22);
      const tp = tube([[hip[0], hip[1] - 0.05 * H], K, end], legW * 1.7, legW * 1.35);
      form(p, tp, dk(L.bottomCol), light, 0.84); p.pattern(tp, L.bottomPat, L.bottomPatCol ?? shade(L.bottomCol, 0.85), u / 1.2); p.poly(tp, null);
      fold(p, [lerp2(hip, K, 0.4), lerp2(K, end, 0.5)], 0.01 * H);
    }
    const c = Math.cos(Lg.pitch), s = Math.sin(Lg.pitch);
    p.g.save(); p.g.translate(Lg.ank[0], Lg.ank[1]); p.g.rotate(Lg.pitch); p.g.translate(-Lg.ank[0], -Lg.ank[1]);
    footDraw(p, P, Lg.ank[0], Lg.ank[1] + 0.03 * H, 1, r, Lg.near);
    p.g.restore();
    void c; void s;
  };
  // torso frame: rotate about the hip by lean
  const R = (q2: P2): P2 => rot2(q2, rad(lean), hip);
  const sh = hipY - (r.hipY - r.shY) - I.breathe * 0.006 * H;
  const S0 = R([300 + 0.02 * H, sh + 0.08 * H]);
  const aLen = r.ua, fLen = r.fa;
  const armSwing = (ang: number, bendE: number): [P2, P2, P2] => {
    const E: P2 = [S0[0] + Math.sin(ang) * aLen, S0[1] + Math.cos(ang) * aLen], a2 = ang + bendE;
    return [S0, E, [E[0] + Math.sin(a2) * fLen, E[1] + Math.cos(a2) * fLen]];
  };
  const swingA = run ? rad(55) : rad(28), bendE = run ? rad(95) : rad(18);
  const arms = pose.arms ?? ["swing", "swing"], holds = pose.hold ?? [null, null];
  const armPts = (g: Gesture, near: boolean): [P2, P2, P2] => {
    const k = near ? -1 : 1;
    if (g === "swing" || g === "hang") return armSwing((gait === "stand" ? 0.05 : swingA * nearFwd * k) + rad(lean) * -0.3, gait === "stand" ? rad(10) : bendE);
    if (g === "carry" || g === "hold") return armSwing(rad(lean) * -1 + (near ? rad(25) : rad(15)), rad(80));
    if (g === "point") return armSwing(rad(95), rad(5));
    if (g === "raise") return armSwing(rad(165), rad(10));
    if (g === "wave") return armSwing(rad(150), rad(30 + 25 * Math.sin(TAU * (pose.wave ?? I.t * 1.6))));
    if (g === "hose") return armSwing(near ? rad(65) : rad(75), near ? rad(30) : rad(15));
    if (g === "reach") return armSwing(rad(120), rad(10));
    if (g === "shield") return armSwing(rad(150), rad(110));
    return armSwing(0.05, rad(10));
  };
  const G = upperGarment(L);
  const topCol = L.top === "banian" ? (L.topCol ?? "#eef0ea") : L.topCol;
  const drawArm = (near: boolean) => {
    const g = arms[near ? 1 : 0], [Sa, E, Wr] = armPts(g, near), dk = (c: string) => (near ? c : shade(c, 0.78));
    const sleeveLong = !G.sleeveless && !G.short && !(L.extras ?? []).includes("rolled_sleeves");
    if (G.sleeveless) { p.poly(tube([Sa, E], 0.19 * H, 0.16 * H), dk(P.skin)); p.poly(tube([E, Wr], 0.16 * H, 0.13 * H), dk(P.skin)); }
    else {
      if (!sleeveLong) p.poly(tube([lerp2(Sa, E, 0.5), E, Wr], 0.17 * H, 0.13 * H), dk(P.skin));
      const up = tube(G.short ? [Sa, lerp2(Sa, E, 0.6)] : [Sa, E], 0.23 * H, 0.2 * H);
      form(p, up, dk(topCol), light, 0.82); p.poly(up, null);
      if (sleeveLong) {
        const fo = tube([E, Wr], 0.19 * H, 0.15 * H); form(p, fo, dk(topCol), light, 0.82); p.poly(fo, null);
        if (L.top === "officer_coat" || L.trimCol) p.band([lerp2(E, Wr, 0.82), lerp2(E, Wr, 0.97)], dk(L.trimCol ?? "#1f3a5a"), 0.15 * H, 1.5, "butt");
      }
    }
    const dir = Math.atan2(Wr[1] - E[1], Wr[0] - E[0]), hold = holds[near ? 1 : 0];
    const C: P2 = [Wr[0] + Math.cos(dir) * 0.07 * H, Wr[1] + Math.sin(dir) * 0.07 * H];
    const hk: HandK = hold ? "grip" : g === "point" ? "point" : g === "wave" ? "wave" : run ? "fist" : "open";
    if (hold === "chapati" || hold === "chapatis" || hold === "letter" || hold === "gold") { hand(p, Wr, dir, hk, dk(P.skin), r, 1); prop(p, hold, [C[0] + 0.02 * H, C[1]], dir, r, A, P.seed + (near ? 1 : 0), I.t); }
    else { prop(p, hold, C, dir, r, A, P.seed + (near ? 1 : 0), I.t); hand(p, Wr, dir, hk, dk(P.skin), r, 1); }
    A.hands.push(C);
  };
  // ---- back to front: far arm, far leg, torso + lower garment, near leg, near arm, head ----
  hairBackSide(p, P, r, R, sh, light);
  drawArm(false);
  drawLeg(legs[0]);
  if (skirt) {
    const lg = L.bottom === "lungi", hem = r.sole - (lg ? 0.3 : 0.08) * H, sw2 = Math.sin(TAU * ph) * (gait === "stand" ? 0 : 0.06 * H), fl = lg ? 0.3 : 0.42;
    const sk: P2[] = [R([300 - 0.26 * H, r.waistY - (r.hipY - hipY)]), R([300 + 0.26 * H, r.waistY - (r.hipY - hipY)]), [300 + fl * H + sw2 + (lg ? Math.max(0, legs[1].ank[0] - 300) * 0.6 : 0), hem], [300 - fl * H + sw2 + (lg ? Math.min(0, legs[0].ank[0] - 300) * 0.6 : 0), hem]];
    form(p, sk, L.bottomCol, light, 0.82); p.pattern(sk, L.bottomPat, L.bottomPatCol ?? tint(L.bottomCol, 0.4), u / 1.2);
    p.clip(sk, () => { for (let i = -2; i <= 2; i++) fold(p, [[300 + i * 0.06 * H, r.waistY], [300 + i * 0.13 * H + sw2, hem]], 0.009 * H); if (L.borderCol) { p.g.fillStyle = L.borderCol; p.g.fillRect(0, hem - 0.1 * H, 600, 0.2 * H); } });
    p.poly(sk, null);
  }
  const hemY = G.long ? (L.top === "kurta" || L.top === "angrakha" ? hipY + 0.9 * H : hipY + 0.5 * H) : L.top === "blouse" ? r.waistY - 0.25 * H : hipY + 0.1 * H;
  const dpt = 0.47 * H * (0.8 + 0.2 * P.girth), chestF = r.fem ? 0.06 * H : 0.03 * H;
  const tor: P2[] = [
    [300 - 0.08 * H, sh - 0.12 * H], [300 + 0.1 * H, sh - 0.1 * H], [300 + dpt * 0.9 + chestF, sh + 0.25 * H], [300 + dpt * 0.85, sh + 0.55 * H],
    [300 + dpt * (0.85 + 0.15 * (P.girth - 1)), r.waistY - (r.hipY - hipY)], [300 + dpt * 0.95, hipY],
    ...(hemY > hipY ? [[300 + dpt * 1.15, hemY] as P2, [300 - dpt * 1.1, hemY] as P2] : [[300 + dpt * 0.95, hemY] as P2, [300 - dpt * 0.95, hemY] as P2]),
    [300 - dpt * 0.95, hipY], [300 - dpt * 0.8, r.waistY - (r.hipY - hipY)], [300 - dpt * 0.95, sh + 0.2 * H], [300 - dpt * 0.6, sh - 0.06 * H],
  ].map(([x, y]) => [x, Math.min(y, hipY + (hemY - hipY))] as P2);
  // hems of long coats stay vertical-ish (don't rotate the skirt fully)
  const torR = tor.map((q2, i) => (i === 6 || i === 7) && G.long ? lerp2(R(q2), q2, 0.6) : R(q2));
  const neck = tube([R([300 + 0.03 * H, sh - 0.05 * H]), R([300 + 0.05 * H, sh - 0.3 * H])], 0.3 * W, 0.28 * W);
  p.poly(neck, shade(P.skin, 0.88));
  form(p, torR, topCol, light, 0.8);
  p.pattern(torR, L.topPat, L.topPatCol ?? tint(topCol, 0.35), u / 1.2);
  p.clip(torR, () => {
    if (L.top === "officer_coat" || L.top === "fire_coat") for (let i = 0; i < 5; i++) { const b = R([300 + dpt * 0.7, sh + 0.06 * H + i * 0.15 * H]); p.dot(b[0], b[1], 0.024 * H, INK); p.dot(b[0], b[1], 0.018 * H, L.top === "fire_coat" ? PAL.brass : PAL.gold); }
    if (L.top === "kurta" || L.top === "kurta_short") { const a = R([300 + dpt * 0.6, sh - 0.06 * H]), b = R([300 + dpt * 0.7, sh + 0.35 * H]); p.stroke([a, b], 0.012 * H, rgba(INK, 0.55)); }
    if (L.top === "banian" || L.top === "vest") p.poly([R([300 + 0.02 * H, sh - 0.14 * H]), R([300 + dpt * 1.2, sh - 0.12 * H]), R([300 + dpt * 1.2, sh + 0.22 * H])], P.skin, p.ow * 0.6);
    if (L.sash) { const a = R([300 - dpt * 1.5, r.waistY - (r.hipY - hipY)]), b = R([300 + dpt * 1.5, r.waistY - (r.hipY - hipY)]); p.band([a, b], L.sash, 0.11 * H, 1.5, "butt"); }
    const ex = L.extras ?? [];
    if (ex.includes("belt") || ex.includes("axe_belt")) { const a = R([300 - dpt * 1.5, r.waistY - (r.hipY - hipY) + 0.02 * H]), b = R([300 + dpt * 1.5, r.waistY - (r.hipY - hipY) + 0.02 * H]); p.band([a, b], "#2a2622", 0.08 * H, 1.5, "butt"); }
    if (ex.includes("chapras")) { const a = R([300 - dpt, sh]), b = R([300 + dpt, hipY]); p.band([a, b], L.trimCol ?? PAL.red, 0.08 * H, 1.5, "butt"); const c = lerp2(a, b, 0.42); p.ell(c[0], c[1], 0.06 * H, 0.07 * H, PAL.brass, p.ow * 0.6); }
    if (ex.includes("crossbelts")) { const a = R([300 - dpt, sh]), b = R([300 + dpt, hipY]); p.band([a, b], "#f4f1e6", 0.07 * H, 1.5, "butt"); }
    if (L.trimCol && G.long) { const a = R([300 - dpt * 1.5, hemY - 0.04 * H]), b = R([300 + dpt * 1.5, hemY - 0.04 * H]); trim(p, [lerp2(a, [a[0], hemY - 0.04 * H], 0.6), lerp2(b, [b[0], hemY - 0.04 * H], 0.6)], L.trimCol, 0.04 * H); }
    if (L.vestCol) p.poly([R([300 - dpt, sh - 0.1 * H]), R([300 + dpt * 0.6, sh - 0.1 * H]), R([300 + dpt * 0.9, hipY]), R([300 - dpt, hipY])], L.vestCol, p.ow * 0.6);
  });
  p.poly(torR, null);
  if (L.shawl) { const pts = [R([300 - dpt * 1.05, sh - 0.08 * H]), R([300 + dpt * 0.7, sh - 0.12 * H]), R([300 + dpt * 0.9, sh + 0.2 * H]), R([300 - dpt * 0.2, hipY + 0.1 * H]), R([300 - dpt * 1.15, hipY])]; form(p, pts, L.shawl, light, 0.8); p.pattern(pts, "buti", tint(L.shawl, 0.3), u / 1.3); p.poly(pts, null); }
  drawLeg(legs[1]);
  drawArm(true);
  // head
  const hc = R([300 + 0.08 * H, r.hc - (r.hipY - hipY)]);
  const turn = clamp(pose.turn ?? 0, 0, 1);
  const hturn = 1 - 0.55 * turn + I.hturn * 0.3;
  const rH: Rig = { ...r, hc: hc[1], shY: sh };
  p.g.save();
  const tilt = (pose.headTilt ?? 0) + I.htilt - lean * 0.4;
  p.g.translate(hc[0], hc[1] + 0.45 * H); p.g.rotate(rad(tilt)); p.g.translate(-hc[0], -(hc[1] + 0.45 * H));
  hairBack(p, P, rH, hc[0], hturn, light);
  hatDraw(p, P, rH, hc[0], hturn, light, false);
  drawHead(p, P, rH, hc[0], hc[1], clamp(hturn, -1, 1), light, pose, I);
  p.g.restore();
  A.head = hc;
  return A;
};
const hairBackSide = (p: KPen, P: Person, r: Rig, R: (q: P2) => P2, sh: number, light: number) => {
  const h = P.look.hair ?? (r.fem ? "bun" : "short");
  if (P.look.hat === "veil") { const pts = [R([300 - 0.4 * r.W, r.hc - 0.4 * r.H]), R([300 + 0.2 * r.W, r.hc - 0.55 * r.H]), R([300 + 0.1 * r.W, sh + 0.5 * r.H]), R([300 - 0.7 * r.W, sh + 0.7 * r.H])]; form(p, pts, shade(P.look.hatCol ?? PAL.sun, 0.88), light); p.poly(pts, null); return; }
  if (h === "braid") { const a = R([300 - 0.35 * r.W, r.hc + 0.1 * r.H]); for (let i = 0; i < 7; i++) p.ell(a[0] - 0.02 * r.W * i, a[1] + i * 0.13 * r.H, 0.08 * r.W, 0.08 * r.H, shade(P.hairCol, i % 2 ? 0.9 : 1)); }
};
// re-export the face helpers so callers need one import
export { blinkAt, talkAt, gazeAt };
export type { Expr, Talk };
