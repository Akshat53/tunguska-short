// Visual kit: appealing cartoon faces. Big eyes with whites, irises and two catch-lights; eyelids that blink on a seeded
// schedule; eyebrows that act; mouths from a closed line to an open "talk" shape with teeth and tongue; a soft blush.
// The head turns from front (turn 0) through three-quarter to profile (|turn| = 1). All pure functions of the arguments.
import { KPen, P2, clamp, lerp, hash, noise1, mix, shade, rgba, ellPts, TAU, rot2 } from "./core";

export type Expr = "neutral" | "smile" | "happy" | "laugh" | "surprised" | "scared" | "worried" | "stern" | "angry"
  | "determined" | "sad" | "shout" | "awe" | "sly" | "hysteric" | "sob";
type FaceDef = {
  brow: [number, number];   // inner, outer raise in % of head height (+ = up)
  open: number;              // upper-lid opening 0..1.2 (1.2 = wide)
  squint: number;            // lower lid rise 0..1
  happyEyes?: boolean;       // closed ^ ^ eyes
  mouth: { curve: number; open: number; width: number; round?: number };
};
const FACES: Record<Expr, FaceDef> = {
  neutral: { brow: [0, 0], open: 0.88, squint: 0.05, mouth: { curve: 0.12, open: 0, width: 0.9 } },
  smile: { brow: [1, 1.5], open: 0.82, squint: 0.3, mouth: { curve: 0.75, open: 0, width: 1.05 } },
  happy: { brow: [2.5, 2], open: 0.8, squint: 0.38, mouth: { curve: 0.9, open: 0.5, width: 1.15 } },
  laugh: { brow: [3, 2.5], open: 0, squint: 0, happyEyes: true, mouth: { curve: 1, open: 0.8, width: 1.25 } },
  surprised: { brow: [6, 5.5], open: 1.18, squint: 0, mouth: { curve: 0, open: 0.55, width: 0.6, round: 1 } },
  scared: { brow: [6.5, 1], open: 1.12, squint: 0, mouth: { curve: -0.45, open: 0.4, width: 1.0 } },
  worried: { brow: [4.5, -0.5], open: 0.9, squint: 0.08, mouth: { curve: -0.35, open: 0, width: 0.85 } },
  stern: { brow: [-2.5, 1], open: 0.78, squint: 0.22, mouth: { curve: -0.25, open: 0, width: 0.9 } },
  angry: { brow: [-4.5, 1.5], open: 0.92, squint: 0.2, mouth: { curve: -0.6, open: 0.25, width: 1.0 } },
  determined: { brow: [-2.5, 0.5], open: 0.85, squint: 0.3, mouth: { curve: -0.05, open: 0, width: 0.95 } },
  sad: { brow: [4, -1.5], open: 0.62, squint: 0.1, mouth: { curve: -0.65, open: 0, width: 0.8 } },
  shout: { brow: [-3, 2], open: 1.05, squint: 0.1, mouth: { curve: -0.1, open: 0.95, width: 1.2 } },
  awe: { brow: [4.5, 4], open: 1.08, squint: 0, mouth: { curve: 0.2, open: 0.3, width: 0.7, round: 0.6 } },
  sly: { brow: [-1, 3], open: 0.6, squint: 0.35, mouth: { curve: 0.55, open: 0, width: 0.9 } },
  // laughing against one's will (Laughter Epidemic 1962): a wide laughing mouth under frightened, wide eyes / crying, squeezed eyes
  hysteric: { brow: [9, -1], open: 1.12, squint: 0, mouth: { curve: 0.45, open: 0.55, width: 1.15 } },
  sob: { brow: [5.5, -2], open: 0.5, squint: 0.32, mouth: { curve: 0.65, open: 0.5, width: 1.1 } },
};

// ---------------- schedules (frame-pure) ----------------
/** eyelid closure 0..1 at time t (s): a blink every ~2-5 s on a per-character seeded schedule, ~5 frames long;
 *  every 4th blink is a double blink. */
export const blinkAt = (t: number, seed: number) => {
  let s = -hash(seed, 1) * 3;
  for (let n = 0; n < 2000 && s <= t; n++) {
    const k = t - s;
    if (k < 0.17) return k < 0.05 ? k / 0.05 : 1 - (k - 0.05) / 0.12;
    if (n % 4 === 3 && k >= 0.25 && k < 0.42) { const j = k - 0.25; return j < 0.05 ? j / 0.05 : 1 - (j - 0.05) / 0.12; }
    s += 2.0 + 3.2 * hash(seed * 13 + n, 7);
  }
  return 0;
};
export type Talk = [number, number][];
/** mouth openness from a list of speaking intervals [t0, t1] (s): ~5.5 syllables/s, each syllable seeded open/round */
export const talkAt = (t: number, talk: Talk | undefined, seed = 0): { open: number; round: number } => {
  if (!talk) return { open: 0, round: 0 };
  for (const [a, b] of talk) {
    if (t < a || t >= b) continue;
    const rate = 5.5, x = (t - a) * rate, i = Math.floor(x), f = x - i;
    const amp = 0.25 + 0.65 * hash(i + seed * 31, 3), round = hash(i + seed * 17, 5) > 0.7 ? 1 : 0;
    const env = Math.min(1, (t - a) / 0.08, (b - t) / 0.08);
    return { open: amp * Math.sin(Math.PI * f) ** 0.7 * env, round };
  }
  return { open: 0, round: 0 };
};
/** a saccadic gaze: holds a direction, then jumps (frame-pure) */
export const gazeAt = (t: number, seed: number, amt = 0.35): [number, number] => {
  const k = Math.floor(t * 0.6 + hash(seed, 2)), r1 = hash(k, seed + 1), r2 = hash(k, seed + 2);
  return [(r1 * 2 - 1) * amt, (r2 * 2 - 1) * amt * 0.5];
};

// ---------------- drawing ----------------
export type FaceOpts = {
  expr?: Expr; turn?: number; blink?: number; look?: [number, number]; talk?: { open: number; round: number };
  skin: string; brows: string; lashes?: boolean; age?: number; blush?: boolean; light?: number;
  tears?: number; t?: number;              // tears 0..1: streaks down both cheeks + drops (t = seconds, drives the drops)
  eyeScale?: number;                       // opt-in (mascot.ts): bigger eyes; default 1 = unchanged
  noMouth?: boolean;                       // opt-in (mascot.ts): the caller draws its own mouth
  noNose?: boolean;                        // opt-in (mascot.ts): the caller draws its own nose
};
/** draws the features on an already-drawn head. (cx, cy) = head centre, W/H = head size. */
export const drawFace = (p: KPen, cx: number, cy: number, W: number, H: number, o: FaceOpts) => {
  const F = FACES[o.expr ?? "neutral"], turn = clamp(o.turn ?? 0, -1, 1), at = Math.abs(turn), sgn = turn < 0 ? -1 : 1;
  const u = W / 100, prof = at > 0.85;
  const fx = cx + turn * 0.3 * W;         // centre line of the face
  const ey = cy + 0.05 * H;
  const blink = clamp(o.blink ?? 0);
  const look = o.look ?? [0, 0];
  const talk = o.talk ?? { open: 0, round: 0 };
  // ---- blush ----
  if (o.blush !== false) for (const side of [-1, 1]) {
    if (prof && side !== sgn) continue;
    const bx = fx + side * (prof ? 0.02 : 0.27) * W * (1 - 0.35 * turn * side), by = cy + 0.22 * H;
    p.g.fillStyle = p.rad(bx, by, 11 * u, [[0, rgba("#ee6b5e", 0.3)], [1, rgba("#ee6b5e", 0)]]);
    p.g.beginPath(); p.g.ellipse(bx, by, 11 * u, 7 * u, 0, 0, TAU); p.g.fill();
  }
  // ---- eyes ----
  const es = o.eyeScale ?? 1, er = 10.5 * u * es, eh = 12.5 * u * es;
  const eyes: { x: number; k: number; side: number }[] = [];
  if (prof) eyes.push({ x: cx + sgn * 0.3 * W, k: 0.62, side: sgn });
  else for (const side of [-1, 1]) {
    const near = side === sgn ? 1 : -1, k = 1 - (near < 0 ? 0.42 : 0.05) * at;
    eyes.push({ x: fx + side * 0.215 * W * (1 - 0.3 * at * (near < 0 ? 1 : -0.2)), k, side });
  }
  const lid = clamp(F.open * (1 - blink), 0, 1.2);
  for (const e of eyes) {
    const rx = er * e.k, ry = eh * (F.open > 1 ? 1 + 0.15 * (F.open - 1) / 0.2 : 1);
    if (F.happyEyes || lid < 0.12) {
      // closed: happy arc (^) or a soft lid line (blink)
      if (F.happyEyes) p.stroke(ellPts(e.x, ey + 4 * u, rx, ry * 0.65, 200, 340, 0, 12), 3.4 * u);
      else p.stroke(ellPts(e.x, ey - 1 * u, rx, ry * 0.4, 15, 165, 0, 12), 3.2 * u);
      if (o.lashes) p.stroke([[e.x + e.side * rx * 0.95, ey], [e.x + e.side * rx * 1.25, ey - 3 * u]], 2.2 * u);
      continue;
    }
    const shape = ellPts(e.x, ey, rx, ry, 0, 360, 0, 32);
    p.clip(shape, () => {
      p.g.fillStyle = "#ffffff"; p.g.fillRect(e.x - rx, ey - ry, 2 * rx, 2 * ry);
      // iris + pupil + catch-lights
      const ix = e.x + (look[0] + (prof ? sgn * 0.35 : turn * 0.25)) * rx * 0.55, iy = ey + look[1] * ry * 0.4 + 0.08 * ry;
      const ir = 7.8 * u * es * Math.min(1, e.k + 0.25);
      p.g.fillStyle = p.rad(ix, iy, ir, [[0, "#6b4426"], [0.55, "#4a2c18"], [1, "#24140c"]]);
      p.g.beginPath(); p.g.ellipse(ix, iy, ir * Math.min(1, e.k + 0.1), ir, 0, 0, TAU); p.g.fill();
      p.dot(ix, iy, ir * 0.48, "#120a06");
      p.dot(ix - ir * 0.35, iy - ir * 0.4, ir * 0.3, "#ffffff");
      p.dot(ix + ir * 0.35, iy + ir * 0.35, ir * 0.13, "#ffffff");
      // upper lid (skin) coming down, lower lid (squint) coming up
      const top = ey - ry + 2 * ry * clamp(1 - lid, 0, 1) * 0.95;
      p.g.fillStyle = shade(o.skin, 0.94); p.g.fillRect(e.x - rx - 2, ey - ry - 2, 2 * rx + 4, top - (ey - ry) + 2);
      if (F.squint > 0) { const bot = ey + ry - 2 * ry * F.squint * 0.6; p.g.fillStyle = o.skin; p.g.beginPath(); p.g.ellipse(e.x, bot + ry * 0.9, rx * 1.3, ry * 0.9, 0, 0, TAU); p.g.fill(); }
      // soft top shadow inside the eye
      p.g.fillStyle = p.lin(0, top, 0, top + ry * 0.5, [[0, "rgba(40,60,70,0.28)"], [1, "rgba(40,60,70,0)"]]);
      p.g.fillRect(e.x - rx, top, 2 * rx, ry * 0.5);
    });
    // lid line: thick upper lash line, thin lower line
    const top = ey - ry + 2 * ry * clamp(1 - lid, 0, 1) * 0.95;
    let lidLine: P2[];
    if (lid >= 0.98) lidLine = ellPts(e.x, ey, rx * 1.05, ry * 1.02, 180, 360, 0, 14);
    else {
      const dy = top - ey, half = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)) * 1.05;
      lidLine = [];
      for (let i = 0; i <= 10; i++) { const s = (i / 10) * 2 - 1; lidLine.push([e.x + s * half, top + 0.1 * ry * (1 - s * s)]); }
    }
    p.stroke(lidLine, 3.6 * u);
    const lower = ellPts(e.x, ey, rx * 0.96, ry, 25, 155, 0, 10);
    p.stroke(F.squint > 0.2 ? lower.slice(2, 9).map(([x, y]) => [x, y - ry * F.squint * 0.9] as P2) : lower.slice(2, 9), 1.4 * u, mix(o.skin, "#10222b", 0.55));
    if (o.lashes) {
      const tip = lidLine[e.side > 0 ? lidLine.length - 1 : 0];
      p.taper(tip, [tip[0] + e.side * 4.5 * u, tip[1] - 3.5 * u], 2.6 * u, 0.8 * u);
    }
  }
  // ---- brows ----
  const by = ey - 0.2 * H;
  for (const e of eyes) {
    const bi = F.brow[0] * H / 100, bo = F.brow[1] * H / 100, w = 12 * u * e.k;
    const xi = e.x - e.side * w * 0.95, xo = e.x + e.side * w * 1.05;
    const inner: P2 = [xi, by - bi], outer: P2 = [xo, by - bo - 2 * u];
    p.taper(inner, [lerp(xi, xo, 0.55), by - (bi + bo) / 2 - 3.5 * u], 5.2 * u, 4.4 * u, o.brows);
    p.taper([lerp(xi, xo, 0.55), by - (bi + bo) / 2 - 3.5 * u], outer, 4.4 * u, 1.8 * u, o.brows);
  }
  // ---- tears (opt-in) ----
  if ((o.tears ?? 0) > 0) {
    const k = clamp(o.tears ?? 0), tt = o.t ?? 0;
    for (const e of eyes) {
      const x0 = e.x + e.side * er * e.k * 0.35, y0 = ey + eh * 0.75;
      const len = (0.22 + 0.16 * k) * H, wob = 1.5 * u * Math.sin(tt * 3 + e.side);
      const st: P2[] = [[x0, y0], [x0 + e.side * 2.5 * u + wob, y0 + len * 0.5], [x0 + e.side * 1.5 * u, y0 + len]];
      p.stroke(st, (4.2 + 2 * k) * u, rgba("#bfefff", 0.55 + 0.35 * k));
      p.stroke(st, 1.6 * u, rgba("#ffffff", 0.75));
      for (let d = 0; d < 2; d++) {
        const ph = (((tt * 1.3 + hash(d + (e.side > 0 ? 3 : 0), 11)) % 1) + 1) % 1, dy = y0 + len * (0.6 + 0.9 * ph * ph);
        if (ph > 0.8 || k < 0.4) continue;
        const dx = x0 + e.side * 2 * u, r0 = (3 + 1.5 * k) * u;
        p.poly([[dx, dy - 2.2 * r0], [dx + r0, dy], ...ellPts(dx, dy, r0, r0, 0, 180, 0, 8), [dx - r0, dy]], rgba("#bfefff", 0.95), 1.4 * u);
        p.dot(dx - r0 * 0.3, dy - r0 * 0.2, r0 * 0.3, "#ffffff");
      }
    }
  }
  // ---- nose ----
  const nyy = cy + 0.22 * H;
  if (o.noNose) { /* caller draws the nose */ } else if (prof) {
    // nose is part of the head contour (people.ts); add the nostril tick
    p.stroke([[cx + sgn * 0.47 * W, nyy + 1 * u], [cx + sgn * 0.43 * W, nyy + 2.5 * u]], 2.2 * u);
  } else {
    const nx = fx + turn * 0.07 * W;
    p.g.fillStyle = rgba(shade(o.skin, 0.7), 0.5);
    p.g.beginPath(); p.g.ellipse(nx - turn * 2 * u, nyy + 1 * u, 5 * u, 2.6 * u, 0, 0, TAU); p.g.fill();
    if (at > 0.2) p.stroke([[nx + sgn * 2 * u, nyy - 10 * u], [nx + sgn * 6 * u, nyy - 1 * u], [nx + sgn * 1 * u, nyy + 2.2 * u]], 2.4 * u);
    else p.stroke(ellPts(nx, nyy - 1 * u, 5 * u, 3.4 * u, 20, 160, 0, 8), 2.4 * u);
  }
  // ---- mouth ----
  if (o.noMouth) { void noise1; void rot2; return; }
  const M = F.mouth, open = Math.max(M.open, talk.open), round = Math.max(M.round ?? 0, talk.round * (talk.open > 0.1 ? 1 : 0));
  const mx = prof ? cx + sgn * 0.33 * W : fx + turn * 0.04 * W, my = cy + 0.34 * H;
  const mw = 12.5 * u * M.width * (1 - 0.3 * at) * (1 - 0.45 * round), c = M.curve * 5 * u;
  const lip = mix(o.skin, "#b5484a", 0.45);
  if (open < 0.08) {
    const pts: P2[] = [];
    for (let i = 0; i <= 10; i++) { const s = i / 10 * 2 - 1; pts.push([mx + s * mw, my - c * (1 - s * s) + c * 0.6]); }
    if (prof) p.stroke(pts.filter(([x]) => (x - mx) * sgn < 0.5 * mw), 3 * u);
    else p.stroke(pts, 3 * u);
    if (Math.abs(M.curve) > 0.4 && !prof) for (const s of [-1, 1]) {
      const x = mx + s * mw, y = my + c * 0.6;
      p.stroke([[x - s * 1 * u, y], [x + s * 2.5 * u, y - Math.sign(c) * 2.5 * u]], 2 * u);
    }
    // lower lip hint
    p.stroke(ellPts(mx, my + 5 * u + c * 0.3, mw * 0.35, 2 * u, 20, 160, 0, 6), 1.6 * u, rgba(shade(o.skin, 0.62), 0.8) as string);
  } else {
    const h = (4 + 13 * open) * u, top = my - c * 0.5 - h * 0.25;
    const pts: P2[] = [];
    for (let i = 0; i <= 14; i++) { const s = i / 14 * 2 - 1; pts.push([mx + s * mw, top - c * (1 - s * s) * 0.4 + c * 0.6 * s * s]); }
    for (let i = 14; i >= 0; i--) { const s = i / 14 * 2 - 1; pts.push([mx + s * mw * (1 - 0.1 * round), top + h * Math.sqrt(1 - s * s) * (round ? 1.1 : 1) - c * (s * s) * 0.2]); }
    const shapePts = prof ? pts.map(([x, y]) => [mx + (x - mx) * 0.55 + sgn * mw * 0.2, y] as P2) : pts;
    p.poly(shapePts, "#5a1d24", 0);
    p.clip(shapePts, () => {
      p.g.fillStyle = "#ffffff"; p.g.fillRect(mx - mw, top - 6 * u, 2 * mw, 5 * u + h * 0.12 + (round ? 0 : 3 * u));
      p.ell(mx + 2 * u, top + h * 0.95, mw * 0.55, h * 0.4, "#e56f73", 0);
    });
    p.poly(shapePts, null, 2.8 * u);
    void lip;
  }
  // ---- age lines ----
  if ((o.age ?? 0) > 0.5 && !prof) {
    for (const e of eyes) p.stroke([[e.x + e.side * er * 1.15, ey + 1 * u], [e.x + e.side * er * 1.5, ey + 3 * u]], 1.4 * u, rgba("#10222b", 0.5) as string);
    for (const s of [-1, 1]) p.stroke(ellPts(mx + s * mw * 1.25, my - 5 * u, 3 * u, 8 * u, s > 0 ? -60 : 240, s > 0 ? 60 : 300, 0, 6), 1.5 * u, rgba("#10222b", 0.4) as string);
  }
  void noise1; void rot2;
};
