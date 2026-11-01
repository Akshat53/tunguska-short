// Visual upgrade kit: shared core. Seeded hashing / smooth noise (frame-pure: no random-number or clock calls), colour helpers,
// the house palette, and KPen: a small canvas pen with a configurable ink colour (the kit's ink is #10222B, deep teal-black)
// so nothing in src/videos/tunguska/toon.ts has to change. Everything here is a pure function of its arguments.
export type P2 = [number, number];
export const TAU = Math.PI * 2;
export const rad = (d: number) => (d * Math.PI) / 180;
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (x: number) => { const u = clamp(x); return u * u * (3 - 2 * u); };
export const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** round to 1/n (keeps canvas cache keys finite) */
export const q = (v: number, n = 60) => Math.round(v * n) / n;

// ---------------- deterministic randomness ----------------
/** hash of (i, s) -> [0, 1) */
export const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7 + 0.5) * 43758.5453; return v - Math.floor(v); };
/** seeded generator (same numbers for the same seed on every worker) */
export const rngK = (seed: number) => { let n = 0; return () => hash(seed * 7.13 + 0.37, ++n * 1.618); };
/** smooth 1-D value noise in [-1, 1] (cubic between hashed lattice points) */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return (lerp(hash(i, seed), hash(i + 1, seed), u)) * 2 - 1;
};
/** layered noise (two octaves) in about [-1, 1] */
export const fbm1 = (x: number, seed = 0) => 0.65 * noise1(x, seed) + 0.35 * noise1(x * 2.13 + 7.7, seed + 3);
export const pick = <T,>(arr: readonly T[], r: number): T => arr[Math.floor(r * arr.length) % arr.length];

// ---------------- palette ----------------
export const INK = "#10222b";
export const PAL = {
  ink: INK, cream: "#f6ecd2", paper: "#fbf4e2", sea: "#2f8f83", teal: "#1f5f66", deepTeal: "#173f46", mint: "#9fd8c4",
  sun: "#f2b632", mustard: "#d9a441", coral: "#e8643a", red: "#c8323a", fire: "#ff9a3c", fireHot: "#ffd36a", ember: "#ff6a2a",
  night: "#0f2a33", moon: "#e9f2e6", brass: "#d6a542", gold: "#f5c542", khaki: "#b8a374", indigo: "#2a4f7a",
};
/** natural skin tones, light to deep (no caricature: all pleasant, warm) */
export const SKINS = ["#f3d2b3", "#e8b98f", "#d9a27a", "#c78c62", "#b0754e", "#93603e", "#7a4e33"];

// ---------------- colour helpers ----------------
const hx = (c: string) => parseInt(c.slice(1), 16);
const h2 = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
export const mix = (a: string, b: string, t: number) => {
  const A = hx(a), B = hx(b);
  const ch = (s: number) => h2(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
export const shade = (c: string, k: number) => { const n = hx(c); return `#${h2(((n >> 16) & 255) * k)}${h2(((n >> 8) & 255) * k)}${h2((n & 255) * k)}`; };
export const tint = (c: string, k: number) => mix(c, "#ffffff", k);
export const rgba = (c: string, a: number) => { const n = hx(c); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`; };
/** colour as 0..1 floats (sRGB) */
export const rgb01 = (c: string): [number, number, number] => { const n = hx(c); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// ---------------- geometry ----------------
export const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 40): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};
export const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P2[] => {
  const pts: P2[] = [];
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};
/** quadratic curve a -> (through near k) -> b as a polyline */
export const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};
export const rot2 = (p: P2, a: number, c: P2 = [0, 0]): P2 => {
  const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * k - y * s, c[1] + x * s + y * k];
};
/** a closed "limb" outline: a tapered tube along a polyline (widths w0 -> w1), with round ends */
export const tube = (pts: P2[], w0: number, w1: number): P2[] => {
  const L: P2[] = [], R: P2[] = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const w = lerp(w0, w1, i / Math.max(1, n - 1)) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const cap = (c: P2, d: P2, w: number, flip: number): P2[] => {
    const a0 = Math.atan2(d[1], d[0]), out: P2[] = [];
    for (let k = 1; k < 8; k++) { const a = a0 + flip * (Math.PI / 2 - (Math.PI * k) / 8); out.push([c[0] + Math.cos(a) * w, c[1] + Math.sin(a) * w]); }
    return out;
  };
  const e = pts[n - 1], e0 = pts[n - 2] ?? pts[0], s = pts[0], s1 = pts[1] ?? pts[0];
  return [...L, ...cap(e, [e[0] - e0[0], e[1] - e0[1]], w1 / 2, 1), ...R.reverse(), ...cap(s, [s[0] - s1[0], s[1] - s1[1]], w0 / 2, 1)];
};

// ---------------- pen ----------------
export class KPen {
  g: CanvasRenderingContext2D;
  ink: string;
  ow: number;
  constructor(g: CanvasRenderingContext2D, ink = INK, ow = 7) { this.g = g; this.ink = ink; this.ow = ow; }
  path(pts: P2[], close = true) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    if (close) g.closePath();
  }
  /** fill (colour, gradient or null) + ink outline (0 = none) */
  poly(pts: P2[], fill: string | CanvasGradient | CanvasPattern | null, ol: number = this.ow) {
    const g = this.g;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (ol > 0) { g.lineWidth = ol; g.strokeStyle = this.ink; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | CanvasGradient | null, ol: number = this.ow, rot = 0) {
    const g = this.g;
    g.beginPath(); g.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rad(rot), 0, TAU);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (ol > 0) { g.lineWidth = ol; g.strokeStyle = this.ink; g.stroke(); }
  }
  dot(cx: number, cy: number, r: number, fill: string = this.ink) { const g = this.g; g.beginPath(); g.arc(cx, cy, Math.max(0.01, r), 0, TAU); g.fillStyle = fill; g.fill(); }
  stroke(pts: P2[], w: number, col: string = this.ink, cap: CanvasLineCap = "round") {
    const g = this.g;
    g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = col; g.lineWidth = w; g.stroke();
  }
  /** a stroke with an ink rim (rope, straps, sticks) */
  band(pts: P2[], col: string, w: number, rim = 3, cap: CanvasLineCap = "round") {
    this.stroke(pts, w + 2 * rim, this.ink, cap); this.stroke(pts, w, col, cap);
  }
  /** draw with a closed shape as the clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** linear gradient across a shape between two points */
  lin(x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
    const gr = this.g.createLinearGradient(x0, y0, x1, y1);
    for (const [t, c] of stops) gr.addColorStop(clamp(t), c);
    return gr;
  }
  rad(x: number, y: number, r: number, stops: [number, string][], x0 = x, y0 = y, r0 = 0) {
    const gr = this.g.createRadialGradient(x0, y0, r0, x, y, Math.max(0.01, r));
    for (const [t, c] of stops) gr.addColorStop(clamp(t), c);
    return gr;
  }
  /** soft glow disc (no ink) */
  glow(x: number, y: number, r: number, col: string, a = 1) {
    this.g.fillStyle = this.rad(x, y, r, [[0, rgba(col, a)], [0.35, rgba(col, a * 0.55)], [1, rgba(col, 0)]]);
    this.g.beginPath(); this.g.arc(x, y, r, 0, TAU); this.g.fill();
  }
  /** tapered stroke (thick at a): brows, folds, moustaches */
  taper(a: P2, b: P2, wa: number, wb: number, col: string = this.ink) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    this.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
      [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
    this.dot(a[0], a[1], wa / 2, col); this.dot(b[0], b[1], wb / 2, col);
  }
  /** fill a shape with stripes / checks / dots / an embroidered border (clipped to the shape) */
  pattern(pts: P2[], kind: Pattern | undefined, col: string, scale = 1, angle = 0) {
    if (!kind || kind === "plain") return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
    this.clip(pts, () => {
      const g = this.g;
      g.save(); g.translate(cx, cy); g.rotate(rad(angle));
      const s = 14 * scale;
      if (kind === "stripes" || kind === "checks") {
        g.fillStyle = col;
        for (let x = -R; x < R; x += 2 * s) g.fillRect(x, -R, s * 0.55, 2 * R);
        if (kind === "checks") { g.globalAlpha = 0.6; for (let y = -R; y < R; y += 2 * s) g.fillRect(-R, y, 2 * R, s * 0.55); g.globalAlpha = 1; }
      } else if (kind === "pinstripe") {
        g.fillStyle = col; for (let x = -R; x < R; x += s) g.fillRect(x, -R, 1.6 * scale, 2 * R);
      } else if (kind === "dots" || kind === "buti") {
        let row = 0;
        for (let y = -R; y < R; y += 1.6 * s, row++) for (let x = -R + (row % 2) * 0.8 * s; x < R; x += 1.6 * s) {
          if (kind === "dots") { g.fillStyle = col; g.beginPath(); g.arc(x, y, 2.4 * scale, 0, TAU); g.fill(); }
          else { // tiny four-petal butis (block-print motif)
            g.fillStyle = col;
            for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + Math.cos(k * Math.PI / 2) * 3 * scale, y + Math.sin(k * Math.PI / 2) * 3 * scale, 2.6 * scale, 1.6 * scale, k * Math.PI / 2, 0, TAU); g.fill(); }
          }
        }
      }
      g.restore();
    });
  }
}
export type Pattern = "plain" | "stripes" | "checks" | "pinstripe" | "dots" | "buti";

/** an embroidered trim along a polyline: a coloured band with a zig-zag / dot stitch on top */
export const trim = (p: KPen, pts: P2[], col: string, w: number, stitch = "#fff3c4") => {
  p.band(pts, col, w, 2);
  // walk the line and put small diamonds along it
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let d = (w * 1.2 - acc); d < l; d += w * 1.2) {
      const t = d / l, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, r = w * 0.28;
      p.poly([[x, y - r], [x + r, y], [x, y + r], [x - r, y]], stitch, 0);
    }
    acc = (acc + l) % (w * 1.2);
  }
};
