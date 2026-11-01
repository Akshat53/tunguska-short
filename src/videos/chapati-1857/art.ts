// Local set dressing + FX drawings for "1857 chapati" (things the visual kit does not have yet): the Mathura office, the
// Delhi palace room, the Meerut barracks, the archive, the map of north India with route overlays, the plain of villages,
// painted grounds, the moon, glow dots / fireflies, dust, smoke, grass tufts, a chulha with a tava, a tulsi chaura, a
// musket and torn roti halves. Each drawing works in its own design units (documented per function; bottom-centre =
// where it stands) with the kit's ink colour. Pure functions of their arguments (seeded hashes only).
import { KPen, P2, PAL, INK, TAU, hash, mix, shade, tint, rgba, ellPts, rrect, curve, rngK, lerp, noise1, tube } from "../../engine/kit/core";
import { KIT_FONT } from "../../engine/kit/captions";
import { drawChapati, flame } from "../../engine/kit/people";
import { GEN_F, LL, mapXZ, MAP_K } from "./story";

// ---------------- sky / FX ----------------
/** moon: 400 x 400, centre card */
export const moon = (p: KPen) => {
  p.glow(200, 200, 200, "#cfe6ff", 0.55);
  p.ell(200, 200, 74, 74, p.rad(185, 185, 80, [[0, "#fbfff4"], [1, "#d9e6e0"]]), 0);
  for (const [x, y, r] of [[180, 180, 14], [222, 206, 10], [196, 230, 8], [228, 172, 6]] as const) p.ell(x, y, r, r * 0.85, rgba("#b8c8c4", 0.6), 0);
};
/** soft glow dot: 200 x 200 centre card (additive) */
export const glowDot = (p: KPen, col: string, core = "#fff8e0") => {
  p.glow(100, 100, 100, col, 0.9);
  p.ell(100, 100, 16, 16, core, 0);
};
/** dust puff: 400 x 260, bottom-centre */
export const dust = (p: KPen, seed: number, col = "#c9a77a") => {
  const r = rngK(seed);
  for (let i = 0; i < 7; i++) {
    const x = 90 + r() * 220, y = 200 - r() * 110, rr = 50 + r() * 60;
    p.g.fillStyle = p.rad(x, y, rr, [[0, rgba(col, 0.55)], [1, rgba(col, 0)]]); p.g.beginPath(); p.g.arc(x, y, rr, 0, TAU); p.g.fill();
  }
};
/** smoke wisp: 400 x 700, bottom-centre; t drifts the curls */
export const smoke = (p: KPen, seed: number, t: number, col = "#9fb0b8", a = 0.45) => {
  for (let i = 0; i < 9; i++) {
    const k = i / 8, y = 660 - k * 600, x = 200 + 70 * noise1(k * 2.4 + t * 0.6, seed) + 40 * Math.sin(k * 5 + t * 0.8 + seed);
    const rr = 40 + k * 110;
    p.g.fillStyle = p.rad(x, y, rr, [[0, rgba(col, a * (1 - 0.7 * k))], [1, rgba(col, 0)]]); p.g.beginPath(); p.g.arc(x, y, rr, 0, TAU); p.g.fill();
  }
};
/** grass tuft: 300 x 200, bottom-centre */
export const grassTuft = (p: KPen, seed: number, col = "#3d5a3a") => {
  const r = rngK(seed);
  for (let i = 0; i < 14; i++) {
    const x = 60 + r() * 180, h = 80 + r() * 110, lean = (r() - 0.5) * 90;
    p.poly([[x - 7, 200], [x + lean, 200 - h], [x + 7, 200]], mix(col, "#7a8a4a", r() * 0.5), 2.5);
  }
};
/** ground lamp glow pool: 400 x 400 flat (additive) */
export const pool = (p: KPen, col: string) => { p.g.fillStyle = p.rad(200, 200, 200, [[0, rgba(col, 0.55)], [0.5, rgba(col, 0.18)], [1, rgba(col, 0)]]); p.g.fillRect(0, 0, 400, 400); };

// ---------------- grounds (paintTex draw fns) ----------------
/** the village lane ground: 4096 x 2048 px for x -40..40, z -20..20 (lane along z = 0, branch along x = 6) */
export const villageGroundPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(11), W = 4096, H = 2048, px = (x: number) => ((x + 40) / 80) * W, pz = (z: number) => ((z + 20) / 40) * H, M = W / 80;
  g.fillStyle = "#7a6446"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6000; i++) { g.fillStyle = rgba(r() < 0.5 ? "#5e4a32" : "#9a7e58", 0.22); g.beginPath(); g.ellipse(r() * W, r() * H, 8 + r() * 40, 4 + r() * 14, r() * 3, 0, TAU); g.fill(); }
  const lane = (pts: [number, number][], w: number) => {
    g.lineCap = "round"; g.lineJoin = "round";
    for (const [lw, c] of [[w * 1.25, "rgba(110,86,58,0.55)"], [w, "rgba(196,164,118,0.85)"], [w * 0.55, "rgba(214,186,140,0.6)"]] as const) {
      g.strokeStyle = c; g.lineWidth = lw * M; g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z)))); g.stroke();
    }
  };
  const main: [number, number][] = []; for (let x = -42; x <= 42; x += 1) main.push([x, 0.25 * Math.sin(x * 0.11)]);
  lane(main, 2.6);
  lane([[6, -21], [6.2, -8], [6, 0], [5.8, 10], [6.3, 21]], 1.8);
  lane([[-3.4, 0], [-3.4, -4]], 1.2);
  // cart ruts + footprints along the lane
  for (let i = 0; i < 900; i++) { const x = -40 + r() * 80, z = (r() < 0.5 ? -0.5 : 0.5) + (r() - 0.5) * 0.2; g.strokeStyle = rgba("#6a4e30", 0.35); g.lineWidth = 3; g.beginPath(); g.moveTo(px(x), pz(z)); g.lineTo(px(x + 0.6), pz(z + (r() - 0.5) * 0.05)); g.stroke(); }
  for (let i = 0; i < 500; i++) { const x = -40 + r() * 80, z = (r() - 0.5) * 1.6; g.fillStyle = rgba("#6a4e30", 0.3); g.beginPath(); g.ellipse(px(x), pz(z), 7, 4, 0, 0, TAU); g.fill(); }
  // grass + weeds off the lane, pebbles
  for (let i = 0; i < 4500; i++) { const x = -40 + r() * 80, z = -20 + r() * 40; if (Math.abs(z) < 1.9 || Math.abs(x - 6) < 1.4) continue; g.strokeStyle = rgba(r() < 0.5 ? "#4f6a34" : "#6f7f3c", 0.85); g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(px(x), pz(z)); g.lineTo(px(x) + (k - 1.5) * 6, pz(z) - 14 - r() * 12); g.stroke(); } }
  for (let i = 0; i < 1200; i++) { g.fillStyle = rgba("#d8c8a8", 0.75); g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 4, 0, TAU); g.fill(); }
  // swept courtyards (lipa: smoothed mud) in front of the huts
  for (const [x, z, rx, rz] of [[-3.5, -5, 3.2, 2.0], [-14, -6.5, 3.5, 2.2], [9, -6.8, 3.2, 2.1], [-26, -6, 3.2, 2.0], [19, -6.8, 3.0, 2.0]] as const) {
    g.fillStyle = rgba("#a98a62", 0.75); g.beginPath(); g.ellipse(px(x), pz(z), rx * M, rz * M, 0, 0, TAU); g.fill();
    g.strokeStyle = rgba("#f3e6c8", 0.6); g.lineWidth = 5; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(px(x), pz(z), (rx - 0.6 - k * 0.5) * M, (rz - 0.5 - k * 0.35) * M, 0, 0, TAU); g.stroke(); }
  }
};
/** big outer field: 1024 px tile (furrows + scrub), repeated */
export const fieldPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(5), S = 1024;
  g.fillStyle = "#6c6a40"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { g.fillStyle = rgba(r() < 0.5 ? "#7d6a44" : "#5a6a38", 0.5); g.fillRect(0, i * 26 + r() * 6, S, 10 + r() * 8); }
  for (let i = 0; i < 900; i++) { g.fillStyle = rgba(r() < 0.5 ? "#4a5a30" : "#8a7a4a", 0.4); g.beginPath(); g.arc(r() * S, r() * S, 3 + r() * 8, 0, TAU); g.fill(); }
};

// ---------------- the plain of villages (shot 5) ----------------
export type Vil = { x: number; z: number; g: number; parent: number; seed: number };
/** 1 + 4 + 16 + 64 villages in a fan toward -z (seeded); parent links make the chain */
export const VILLAGES: Vil[] = (() => {
  const out: Vil[] = [{ x: 0, z: 0, g: 0, parent: -1, seed: 1 }];
  const R = [0, 42, 100, 210], SPREAD = [0, 0.55, 0.62, 0.7];
  let prev = [0];
  for (let g = 1; g <= 3; g++) {
    const next: number[] = [], n = 4 ** g;
    for (let i = 0; i < n; i++) {
      const pa = prev[Math.floor(i / 4)], a = -SPREAD[g] + (2 * SPREAD[g] * (i + 0.5)) / n + (hash(i, g * 7) - 0.5) * 0.08;
      const rr = R[g] * (0.9 + 0.2 * hash(i, g * 13));
      out.push({ x: Math.sin(a) * rr * 1.25, z: -Math.cos(a) * rr, g, parent: pa, seed: 10 + g * 100 + i });
      next.push(out.length - 1);
    }
    prev = next;
  }
  return out;
})();
/** plain ground: 4096 px for x -350..350, z -400..300 */
export const PLAIN = { x0: -350, x1: 350, z0: -400, z1: 300 };
export const plainPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(21), S = 4096, px = (x: number) => ((x - PLAIN.x0) / (PLAIN.x1 - PLAIN.x0)) * S, pz = (z: number) => ((z - PLAIN.z0) / (PLAIN.z1 - PLAIN.z0)) * S;
  g.fillStyle = "#4e5a3a"; g.fillRect(0, 0, S, S);
  // field patchwork
  for (let i = 0; i < 700; i++) { const x = r() * S, y = r() * S, w = 40 + r() * 140, h = 30 + r() * 110; g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.6); g.fillStyle = rgba(["#5d6a3e", "#6e6a42", "#46583a", "#7a7448", "#5a4e36"][Math.floor(r() * 5)], 0.75); g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = rgba("#2e3a26", 0.35); g.lineWidth = 2; g.strokeRect(-w / 2, -h / 2, w, h); g.restore(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = rgba("#2f4630", 0.8); g.beginPath(); g.arc(r() * S, r() * S, 5 + r() * 9, 0, TAU); g.fill(); } // trees
  // a river
  g.strokeStyle = rgba("#3f6f7a", 0.9); g.lineWidth = 26; g.lineCap = "round"; g.beginPath(); g.moveTo(px(-350), pz(-330)); g.bezierCurveTo(px(-120), pz(-260), px(80), pz(-380), px(350), pz(-300)); g.stroke();
  g.strokeStyle = rgba("#7fb0b4", 0.5); g.lineWidth = 6; g.stroke();
  // paths between parent and child villages
  g.strokeStyle = rgba("#b89a6a", 0.85); g.lineWidth = 5;
  for (const v of VILLAGES) if (v.parent >= 0) { const pa = VILLAGES[v.parent]; g.beginPath(); g.moveTo(px(pa.x), pz(pa.z)); g.quadraticCurveTo(px((pa.x + v.x) / 2 + (hash(v.seed, 3) - 0.5) * 20), pz((pa.z + v.z) / 2), px(v.x), pz(v.z)); g.stroke(); }
  // village patches: a swept clearing + roofs
  for (const v of VILLAGES) {
    const rv = rngK(v.seed), cx = px(v.x), cy = pz(v.z), R = v.g === 0 ? 70 : 34;
    g.fillStyle = rgba("#9a7e58", 0.9); g.beginPath(); g.ellipse(cx, cy, R, R * 0.8, 0, 0, TAU); g.fill();
    for (let k = 0; k < 9; k++) { const a = rv() * TAU, d = rv() * R * 0.75, w = 8 + rv() * 8; g.fillStyle = ["#c9a04c", "#d9b05a", "#b98a40"][k % 3]; g.fillRect(cx + Math.cos(a) * d - w / 2, cy + Math.sin(a) * d - w / 2, w, w * 0.8); g.fillStyle = rgba("#10222b", 0.4); g.fillRect(cx + Math.cos(a) * d - w / 2, cy + Math.sin(a) * d + w * 0.3, w, 2.5); }
    for (let k = 0; k < 4; k++) { g.fillStyle = "#2f4630"; g.beginPath(); g.arc(cx + (rv() - 0.5) * R * 2.2, cy + (rv() - 0.5) * R * 1.8, 6 + rv() * 6, 0, TAU); g.fill(); }
  }
};
/** route lines that draw on as the chain grows: flat overlay in plain coordinates, 2048 px (additive) */
export const plainRoutes = (p: KPen, f: number) => {
  const S = 2048, px = (x: number) => ((x - PLAIN.x0) / (PLAIN.x1 - PLAIN.x0)) * S, pz = (z: number) => ((z - PLAIN.z0) / (PLAIN.z1 - PLAIN.z0)) * S;
  for (const v of VILLAGES) {
    if (v.parent < 0) continue;
    const k = Math.max(0, Math.min(1, (f - GEN_F[v.g] + 6) / 12));
    if (k <= 0) continue;
    const pa = VILLAGES[v.parent], a: P2 = [px(pa.x), pz(pa.z)], b: P2 = [px(v.x), pz(v.z)], m: P2 = [px((pa.x + v.x) / 2 + (hash(v.seed, 3) - 0.5) * 20), pz((pa.z + v.z) / 2)];
    const pts = curve(a, m, b, 16).slice(0, Math.max(2, Math.round(16 * k) + 1));
    p.stroke(pts, 9, rgba("#ffb24a", 0.35)); p.stroke(pts, 3.5, "#ffe6a8");
  }
};

// ---------------- map of north India (shots 6, 15) ----------------
/** design: 100 units per degree; lon 66..92, lat 6..37 -> 2600 x 3100; the card's centre is lon 79, lat 21.5 */
export const MAP_DW = 2600, MAP_DH = 3100;
const mx = (lon: number) => (lon - 66) * 100, my = (lat: number) => (37 - lat) * 100;
const INDIA: [number, number][] = [[68.2, 23.6], [68.8, 24.3], [70.5, 25.7], [70.0, 27.6], [71.9, 28.0], [73.4, 29.9], [74.6, 31.0], [74.5, 32.9], [74.0, 34.6], [76.0, 35.8],
  [77.8, 35.4], [78.9, 34.2], [78.7, 32.6], [79.9, 30.9], [80.9, 30.2], [81.6, 30.4], [83.4, 29.4], [85.2, 28.6], [86.6, 27.9], [88.1, 27.9], [88.6, 26.4], [89.8, 26.5],
  [92.0, 26.9], [92.0, 24.1], [91.3, 23.1], [89.6, 22.0], [88.8, 21.6], [86.9, 21.4], [86.6, 20.4], [85.2, 19.5], [84.1, 18.3], [82.3, 16.6], [81.2, 15.9],
  [80.2, 15.2], [80.3, 13.4], [79.9, 11.8], [79.8, 10.3], [78.9, 9.4], [78.2, 8.9], [77.5, 8.1], [76.6, 8.9], [76.2, 10.0], [75.7, 11.5], [74.7, 13.3], [74.1, 14.8],
  [73.4, 16.4], [72.9, 18.8], [72.8, 20.5], [72.6, 21.4], [72.6, 22.2], [70.9, 20.8], [69.5, 21.8], [69.1, 22.4], [70.4, 23.0], [68.2, 23.6]];
const RIVERS: [number, number][][] = [
  [[78.2, 30.8], [78.1, 29.9], [78.6, 29.0], [79.6, 27.9], [80.4, 26.9], [81.3, 25.9], [81.9, 25.4], [83.0, 25.3], [84.4, 25.6], [85.4, 25.5], [86.8, 25.2], [87.9, 24.4], [88.4, 22.6]], // Ganga
  [[77.6, 30.9], [77.3, 29.6], [77.2, 28.6], [77.5, 27.6], [78.0, 27.2], [79.0, 26.6], [80.3, 25.9], [81.9, 25.4]], // Yamuna
  [[73.0, 21.7], [74.6, 22.1], [76.2, 22.3], [77.7, 22.7], [79.1, 23.1], [80.6, 22.8], [81.7, 22.7]], // Narmada
  [[80.9, 29.9], [81.5, 28.1], [82.6, 26.9], [83.7, 25.9], [84.6, 25.7]], // Ghaghara
  [[76.0, 35.8], [74.6, 34.4], [72.8, 33.7], [71.5, 32.4], [70.8, 29.5], [69.3, 26.5], [68.2, 24.3]], // Indus
];
export const mapCard = (p: KPen) => {
  const g = p.g;
  g.fillStyle = p.lin(0, 0, MAP_DW, MAP_DH, [[0, "#d9bf88"], [0.5, "#e2c994"], [1, "#d4b47c"]]); g.fillRect(0, 0, MAP_DW, MAP_DH);
  const r = rngK(3);
  for (let i = 0; i < 260; i++) { g.fillStyle = rgba("#b8955a", 0.06 + r() * 0.06); g.beginPath(); g.arc(r() * MAP_DW, r() * MAP_DH, 20 + r() * 120, 0, TAU); g.fill(); }
  // sea with wave hatching
  g.fillStyle = "#5f9ea6"; g.fillRect(0, 0, MAP_DW, MAP_DH);
  for (let y = 40; y < MAP_DH; y += 70) for (let x = (y / 70) % 2 ? 40 : 90; x < MAP_DW; x += 120) p.stroke(curve([x, y], [x + 22, y - 10], [x + 44, y], 6), 4, rgba("#5f9a96", 0.45));
  const land = INDIA.map(([lo, la]) => [mx(lo), my(la)] as P2);
  // neighbouring lands as plain parchment around (north + west + east), India as the warm main shape
  p.poly([[0, 0], [MAP_DW, 0], [MAP_DW, my(26.6)], [mx(92), my(26.9)], [mx(88.6), my(26.4)], [mx(86.6), my(27.9)], [mx(83.4), my(29.4)], [mx(79.9), my(30.9)], [mx(76), my(35.8)], [mx(74), my(34.6)], [mx(70), my(27.6)], [mx(68.2), my(23.6)], [0, my(24.5)]], "#c9b088", 0);
  p.poly(land, p.rad(mx(79), my(24), 1400, [[0, "#f2d9a2"], [0.7, "#e8c888"], [1, "#d8b06e"]]), 16);
  p.clip(land, () => { for (let i = 0; i < 300; i++) { g.fillStyle = rgba("#c8a46a", 0.08); g.beginPath(); g.arc(r() * MAP_DW, r() * MAP_DH, 30 + r() * 90, 0, TAU); g.fill(); } });
  // Himalaya hachures along the north edge
  for (let i = 0; i < 46; i++) { const lo = 72.5 + i * 0.36, la = 34.4 - i * 0.16 + Math.sin(i * 1.7) * 0.4, x = mx(lo), y = my(la) - 20; p.poly([[x - 34, y + 30], [x, y - 34], [x + 34, y + 30]], i % 2 ? "#a88a5a" : "#977a4c", 5); p.poly([[x - 8, y - 22], [x, y - 34], [x + 8, y - 22]], "#fbf6ea", 0); }
  // Vindhya hills
  for (let i = 0; i < 18; i++) { const x = mx(74.5 + i * 0.45), y = my(23.9 + Math.sin(i) * 0.25); p.poly([[x - 22, y + 14], [x, y - 14], [x + 22, y + 14]], "#d8bf90", 3); }
  // rivers
  for (const rv of RIVERS) { const pts = rv.map(([lo, la]) => [mx(lo), my(la)] as P2); p.stroke(pts, 30, INK); p.stroke(pts, 20, "#2f86a8"); p.stroke(pts, 6, rgba("#bfe6ee", 0.8)); }
  // towns + Hindi labels for the places the story names
  for (const [lo, la] of Object.values(LL)) { p.ell(mx(lo), my(la), 24, 24, "#fff4dc", 8); p.dot(mx(lo), my(la), 10, INK); }
  for (const [name, txt, dx, dy, al] of MAP_LABELS) {
    const [lo, la] = LL[name], x = mx(lo) + dx, y = my(la) + dy;
    g.font = `800 92px ${KIT_FONT}`; g.textAlign = al; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = 22; g.strokeStyle = INK; g.strokeText(txt, x, y); g.fillStyle = "#fff4dc"; g.fillText(txt, x, y);
  }
  // compass rose + border
  const cx = 2250, cy = 2700;
  p.ell(cx, cy, 150, 150, rgba("#f6ecd2", 0.7), 5);
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, L = k % 2 ? 90 : 160; p.poly([[cx, cy], [cx + Math.cos(a + 0.25) * 34, cy + Math.sin(a + 0.25) * 34], [cx + Math.cos(a) * L, cy + Math.sin(a) * L], [cx + Math.cos(a - 0.25) * 34, cy + Math.sin(a - 0.25) * 34]], k === 6 ? PAL.red : k % 2 ? "#cbb487" : PAL.teal, 4); }
  g.lineWidth = 28; g.strokeStyle = "#7a3b2e"; g.strokeRect(14, 14, MAP_DW - 28, MAP_DH - 28);
  g.lineWidth = 6; g.strokeStyle = PAL.gold; g.strokeRect(46, 46, MAP_DW - 92, MAP_DH - 92);
};
/** route arcs on the map that draw on with progress k (0..1 per route), additive glow overlay in map design units */
export type Route = { a: [number, number]; b: [number, number]; k: number; col?: string };
const MAP_LABELS: [string, string, number, number, CanvasTextAlign][] = [
  ["delhi", "दिल्ली", -50, -10, "right"], ["meerut", "मेरठ", 50, -40, "left"], ["mathura", "मथुरा", -50, 30, "right"], ["indore", "इंदौर", 0, 85, "center"],
  ["kanpur", "कानपुर", 40, 60, "left"], ["lucknow", "लखनऊ", 50, -40, "left"],
];
export const mapRoutes = (p: KPen, routes: Route[]) => {
  for (const R of routes) {
    if (R.k <= 0) continue;
    const a: P2 = [mx(R.a[0]), my(R.a[1])], b: P2 = [mx(R.b[0]), my(R.b[1])], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m: P2 = [(a[0] + b[0]) / 2 + ((b[1] - a[1]) / d) * d * 0.18, (a[1] + b[1]) / 2 - ((b[0] - a[0]) / d) * d * 0.18];
    const all = curve(a, m, b, 30), n = Math.max(2, Math.round(30 * Math.min(1, R.k)) + 1), pts = all.slice(0, n);
    const col = R.col ?? "#d9480f";
    p.stroke(pts, 34, INK); p.stroke(pts, 22, col);
    for (let i = 3; i < pts.length - 1; i += 4) p.stroke([pts[i - 1], pts[i]], 8, "#ffe6a8");
    // a trail of rotis dropped along the way, a big one riding the head
    for (let i = 7; i < pts.length - 3; i += 7) drawChapati(p, pts[i][0], pts[i][1], 22, 20, i + 3);
    const e = pts[pts.length - 1], e0 = pts[pts.length - 2], ang = Math.atan2(e[1] - e0[1], e[0] - e0[0]);
    if (R.k < 1) { p.glow(e[0], e[1], 90, "#ffd36a", 0.8); drawChapati(p, e[0], e[1], 38, 35, 7); }
    else p.poly([[e[0] + Math.cos(ang) * 64, e[1] + Math.sin(ang) * 64], [e[0] + Math.cos(ang + 2.4) * 52, e[1] + Math.sin(ang + 2.4) * 52], [e[0] + Math.cos(ang - 2.4) * 52, e[1] + Math.sin(ang - 2.4) * 52]], col, 8);
  }
};
/** map position (world x, z) of a lon/lat on the flat map card centred at MAP_CENTRE */
export const MAP_CENTRE: [number, number] = mapXZ(79, 21.5);
export const MAP_W = (MAP_DW / 100) * MAP_K;

// ---------------- the Mathura office ----------------
/** back wall: 4000 x 2400 (8 m x 4.8 m), base at 2400 */
export const officeWall = (p: KPen, day: number) => {
  const g = p.g, wall = mix("#d8cfb6", "#e9e1c8", day);
  g.fillStyle = p.lin(0, 0, 0, 2400, [[0, shade(wall, 0.9)], [0.6, wall], [1, shade(wall, 0.85)]]); g.fillRect(0, 0, 4000, 2400);
  const r = rngK(4);
  for (let i = 0; i < 90; i++) { g.fillStyle = rgba("#a89a7a", 0.08); g.beginPath(); g.ellipse(r() * 4000, r() * 2400, 30 + r() * 120, 20 + r() * 60, r(), 0, TAU); g.fill(); }
  // dado + skirting
  g.fillStyle = mix("#7a5a3a", "#8a6a44", day); g.fillRect(0, 1700, 4000, 700);
  g.fillStyle = rgba(INK, 0.5); g.fillRect(0, 1690, 4000, 14); g.fillRect(0, 2330, 4000, 70);
  for (let x = 0; x < 4000; x += 400) { p.poly(rrect(x + 30, 1760, x + 370, 2290, 10), rgba("#5a3e26", 0.35), 4); }
  // window (right of centre) with shutters + sunlit outside
  const wx0 = 2500, wx1 = 3300, wy0 = 500, wy1 = 1560;
  p.poly([[wx0, wy0 + 200], ...ellPts((wx0 + wx1) / 2, wy0 + 200, (wx1 - wx0) / 2, 200, 180, 360, 0, 16).slice(1, -1), [wx1, wy0 + 200], [wx1, wy1], [wx0, wy1]],
    p.lin(0, wy0, 0, wy1, [[0, mix("#5a7a9a", "#bfe2f0", day)], [0.7, mix("#e0a070", "#f4f0d8", day)], [1, mix("#c08060", "#d8e8c0", day)]]), 10);
  p.clip([[wx0, wy0], [wx1, wy0], [wx1, wy1], [wx0, wy1]], () => {
    for (let i = 0; i < 6; i++) p.ell(wx0 + 120 + i * 130, wy1 - 260 + Math.sin(i * 2) * 40, 150, 120, mix("#2f4a3a", "#5f8a4a", day), 0);
    g.fillStyle = mix("#3a4a3a", "#9a8a5a", day); g.fillRect(wx0, wy1 - 120, wx1 - wx0, 120);
  });
  for (let k = 1; k < 4; k++) p.stroke([[wx0 + ((wx1 - wx0) * k) / 4, wy0 + 60], [wx0 + ((wx1 - wx0) * k) / 4, wy1]], 10, "#3a2a1a");
  p.stroke([[wx0, wy0 + 700], [wx1, wy0 + 700]], 10, "#3a2a1a");
  for (const [x0, x1] of [[wx0 - 300, wx0 - 10], [wx1 + 10, wx1 + 300]]) { p.poly(rrect(x0, wy0 + 120, x1, wy1, 10), "#2f6a5a", 8); for (let y = wy0 + 160; y < wy1 - 20; y += 34) p.stroke([[x0 + 20, y], [x1 - 20, y]], 5, rgba(INK, 0.45)); }
  p.poly(rrect(wx0 - 340, wy1, wx1 + 340, wy1 + 50, 6), "#e9e1c8", 6);
  // almirah with files (left)
  p.poly(rrect(250, 650, 1150, 2330, 12), "#6a4628", 9);
  for (let s = 0; s < 4; s++) {
    const y = 760 + s * 380; p.poly(rrect(300, y, 1100, y + 320, 6), "#3a2616", 5);
    for (let k = 0; k < 11; k++) { const x = 320 + k * 70 + r() * 6, h = 220 + r() * 80; p.poly(rrect(x, y + 320 - h, x + 60, y + 316, 4), ["#c8323a", "#e4d4b0", "#2f5f66", "#d9a441", "#7a3b2e"][Math.floor(r() * 5)], 4); if (r() < 0.5) p.stroke([[x, y + 320 - h * 0.5], [x + 60, y + 320 - h * 0.5]], 6, PAL.red); }
  }
  // framed district map + a wall clock
  p.poly(rrect(1450, 520, 2200, 1150, 8), "#5a3e26", 10);
  p.poly(rrect(1490, 560, 2160, 1110, 4), "#efe0b8", 4);
  p.stroke([[1520, 900], [1700, 820], [1850, 880], [2120, 760]], 10, "#6fb0bc");
  for (let k = 0; k < 9; k++) p.dot(1540 + r() * 580, 600 + r() * 480, 7, rgba(INK, 0.6));
  p.ell(1825, 330, 110, 110, "#f6ecd2", 10); p.ell(1825, 330, 128, 128, null, 10);
  p.stroke([[1825, 330], [1825, 255]], 10); p.stroke([[1825, 330], [1885, 360]], 8);
  // a peg with a sola topi + a coat
  p.stroke([[3650, 820], [3700, 840]], 12, "#3a2a1a");
  p.ell(3700, 850, 120, 70, "#f1ece0", 6); p.ell(3700, 900, 170, 30, "#e2d8c0", 6);
};
/** punkah (ceiling cloth fan): 2400 x 500, top-centre hangs from the beam */
export const punkah = (p: KPen) => {
  p.band([[200, 20], [2200, 20]], "#6a4628", 30, 5);
  for (const x of [400, 2000]) p.stroke([[x, 20], [x, 120]], 6);
  p.poly([[150, 120], [2250, 120], [2250, 380], [150, 380]], "#f3ecd8", 7);
  p.pattern([[150, 300], [2250, 300], [2250, 380], [150, 380]], "stripes", PAL.red, 1.2, 0);
  for (let x = 170; x < 2240; x += 30) p.stroke([[x, 380], [x + 4, 470]], 6, "#e9dfc4");
};
/** desk front: 1900 x 820 (1.9 m x 0.82 m), base at 820 */
export const deskFront = (p: KPen) => {
  p.poly(rrect(0, 0, 1900, 70, 8), "#5a3a22", 7);
  p.poly([[40, 70], [1860, 70], [1860, 820], [40, 820]], p.lin(0, 70, 0, 820, [[0, "#7a4e2c"], [1, "#4e3018"]]), 7);
  for (const [x0, x1] of [[90, 600], [1300, 1810]]) for (let k = 0; k < 3; k++) {
    const y = 110 + k * 230; p.poly(rrect(x0, y, x1, y + 200, 8), "#6a4426", 5); p.ell((x0 + x1) / 2, y + 100, 34, 14, PAL.brass, 4);
  }
  p.poly(rrect(650, 110, 1250, 330, 8), "#6a4426", 5); p.ell(950, 220, 34, 14, PAL.brass, 4);
  p.poly(rrect(680, 360, 1220, 820, 4), "#2e1c0e", 0);
};
/** desk top seen from above: 1800 x 900 (1.8 m x 0.9 m), flat card centred on the desk */
export const deskTop = (p: KPen, lamp: number) => {
  p.poly(rrect(0, 0, 1800, 900, 20), p.lin(0, 0, 1800, 900, [[0, "#7a4e2c"], [1, "#5a3a22"]]), 9);
  p.poly(rrect(90, 80, 1710, 820, 12), p.lin(0, 0, 0, 900, [[0, "#2f6a52"], [1, "#24543f"]]), 6);
  p.g.strokeStyle = rgba(PAL.gold, 0.7); p.g.lineWidth = 6; p.g.strokeRect(120, 110, 1560, 680);
  // papers, ledger, inkwell + quill, brass bell, a sealed letter
  p.poly([[160, 160], [560, 140], [580, 520], [180, 540]], "#f6ecd2", 5);
  for (let k = 0; k < 9; k++) p.stroke([[200, 200 + k * 34], [520, 186 + k * 34]], 4, rgba(INK, 0.35));
  p.poly(rrect(1240, 150, 1660, 470, 10), "#7a3b2e", 6); p.poly(rrect(1265, 175, 1450, 445, 6), "#f3ecd8", 4); p.poly(rrect(1455, 175, 1640, 445, 6), "#f3ecd8", 4);
  for (let k = 0; k < 7; k++) { p.stroke([[1285, 210 + k * 32], [1430, 210 + k * 32]], 3, rgba(INK, 0.35)); p.stroke([[1475, 210 + k * 32], [1620, 210 + k * 32]], 3, rgba(INK, 0.35)); }
  p.ell(300, 700, 60, 60, "#2a2e30", 6); p.ell(300, 700, 30, 30, "#10161a", 0);
  p.stroke(curve([300, 690], [420, 600], [560, 560], 8), 10, "#f3ecd8"); p.stroke(curve([330, 670], [440, 600], [540, 570], 8), 4, rgba(INK, 0.4));
  p.ell(1500, 680, 70, 70, p.rad(1480, 660, 80, [[0, "#ffe9a0"], [1, PAL.brass]]), 6); p.dot(1500, 680, 14, "#5a4a2a");
  p.poly([[1120, 600], [1380, 580], [1390, 760], [1130, 780]], "#efe2c0", 5); p.ell(1255, 680, 28, 28, PAL.red, 4);
  if (lamp > 0) p.glow(900, 450, 700, "#ffb050", 0.25 * lamp);
};
/** table lamp (hurricane lantern standing): 300 x 520, base at 520; flame at (150, 300) */
export const tableLantern = (p: KPen, t: number, lit: number) => {
  const x = 150;
  p.poly(rrect(60, 470, 240, 520, 8), "#3d4a4a", 6);
  p.ell(x, 330, 80, 120, lit > 0 ? p.rad(x, 330, 110, [[0, rgba("#fffbe0", 0.95)], [0.4, rgba("#ffd36a", 0.8)], [1, rgba("#e88a2c", 0.5)]]) : rgba("#e6eef0", 0.5), 6);
  for (const s of [-1, 1]) p.stroke([[x + s * 80, 220], [x + s * 86, 470]], 9, "#3d4a4a");
  p.poly(rrect(70, 190, 230, 230, 8), "#3d4a4a", 6); p.stroke(curve([80, 190], [150, 60], [220, 190], 10), 7);
  if (lit > 0) flame(p, x, 360, 26, t, 7);
};

// ---------------- the Delhi palace room ----------------
/** back wall: 4400 x 2800 (8.8 m x 5.6 m), base at 2800: cusped arches onto a night garden, jali, inlay */
export const palaceWall = (p: KPen) => {
  const g = p.g;
  g.fillStyle = p.lin(0, 0, 0, 2800, [[0, "#e9dcc4"], [1, "#d8c8a8"]]); g.fillRect(0, 0, 4400, 2800);
  const arch = (cx: number, w: number, top: number, base: number): P2[] => {
    const pts: P2[] = [[cx - w / 2, base], [cx - w / 2, top + w * 0.45]];
    const n = 7, rr = w / 2;
    for (let i = 0; i <= 60; i++) { const a = Math.PI + (i / 60) * Math.PI, lobe = 1 + 0.07 * Math.abs(Math.sin(n * (a - Math.PI) / 2 * 2)); pts.push([cx + Math.cos(a) * rr * lobe, top + w * 0.45 + Math.sin(a) * rr * 0.9 * lobe]); }
    pts.push([cx + w / 2, top + w * 0.45], [cx + w / 2, base]);
    return pts;
  };
  for (const [cx, w] of [[900, 900], [2200, 1100], [3500, 900]] as const) {
    const pts = arch(cx, w, 700 - (w - 900) * 0.4, 2560);
    p.poly(pts.map(([x, y]) => [cx + (x - cx) * 1.12, y - 40] as P2), "#c86a4a", 0);
    p.poly(pts, p.lin(0, 300, 0, 2560, [[0, "#173f5f"], [0.55, "#2f6a7a"], [0.8, "#3f5a4a"], [1, "#2a3a2a"]]), 10);
    p.clip(pts, () => {
      // a garden at night: cypresses, a dome, a fountain line
      p.poly([[cx - 300, 2000], ...ellPts(cx, 2000, 300, 300, 180, 360, 0, 20).slice(1, -1), [cx + 300, 2000], [cx + 300, 2560], [cx - 300, 2560]], "#e9e4d8", 0);
      p.poly([[cx - 18, 1700], [cx + 18, 1700], [cx, 1600]], PAL.gold, 0);
      for (const s of [-1, 1]) p.ell(cx + s * (w * 0.36), 2150, 70, 360, "#1f3a2e", 0);
      g.fillStyle = "#24402e"; g.fillRect(cx - w, 2380, 2 * w, 200);
      for (let i = 0; i < 18; i++) p.dot(cx - w / 2 + hash(i, cx) * w, 400 + hash(i, cx + 1) * 1000, 4 + 4 * hash(i, 3), "#fff8e0");
    });
    // pillars with inlay
    for (const s of [-1, 1]) {
      const x = cx + s * (w / 2 + 70);
      p.poly(rrect(x - 70, 700, x + 70, 2560, 10), "#f3ecdc", 7);
      for (let y = 800; y < 2500; y += 160) { p.poly([[x, y - 50], [x + 40, y], [x, y + 50], [x - 40, y]], "#c86a4a", 3); p.dot(x, y, 10, PAL.teal); }
    }
  }
  // jali screens between arches
  for (const x of [1550, 2850]) {
    p.poly(rrect(x - 120, 1200, x + 120, 2400, 10), "#e3d6bc", 6);
    p.clip(rrect(x - 110, 1210, x + 110, 2390, 8), () => { for (let y = 1220; y < 2400; y += 40) for (let xx = x - 110; xx < x + 110; xx += 40) p.ell(xx + ((y / 40) % 2) * 20, y, 13, 13, "#5a4a3a", 0); });
  }
  // cornice with floral inlay
  p.poly([[0, 120], [4400, 120], [4400, 260], [0, 260]], "#c86a4a", 6);
  for (let x = 60; x < 4400; x += 120) { for (let k = 0; k < 4; k++) p.ell(x + Math.cos(k * Math.PI / 2) * 22, 190 + Math.sin(k * Math.PI / 2) * 22, 16, 10, "#f6ecd2", 0, k * 90); p.dot(x, 190, 9, PAL.gold); }
  g.fillStyle = "#a4553a"; g.fillRect(0, 2560, 4400, 240);
};
/** takht (low platform) with a bolster and a carpet: 2000 x 520, base 520 */
export const takht = (p: KPen) => {
  p.poly(rrect(0, 260, 2000, 520, 12), "#6a4628", 7);
  for (let x = 40; x < 2000; x += 160) p.poly(rrect(x, 300, x + 120, 500, 6), "#7a5232", 3);
  p.poly(rrect(20, 160, 1980, 280, 16), "#c8323a", 7); p.pattern(rrect(20, 160, 1980, 280, 16), "buti", "#f2b632", 1.2);
  p.poly(rrect(60, 40, 600, 190, 70), "#2f8f83", 7); p.pattern(rrect(60, 40, 600, 190, 70), "stripes", "#f2b632", 0.9, 90);
};
/** brass lamp stand with a diya: 220 x 1100, base 1100; flame at (110, 120) */
export const lampStand = (p: KPen, t: number, seed: number) => {
  p.poly([[40, 1100], [180, 1100], [140, 1040], [80, 1040]], PAL.brass, 6);
  p.band([[110, 1040], [110, 180]], "#c8963a", 22, 5);
  for (const y of [400, 700]) p.ell(110, y, 50, 18, "#d6a542", 5);
  p.poly([[30, 160], [190, 160], [150, 200], [70, 200]], "#d6a542", 6);
  flame(p, 110, 150, 34, t, seed);
};

// ---------------- Meerut ----------------
/** barracks: 4000 x 1100 (40 m x 11 m: wide, low), base 1100: long white building, verandah arches, tiled roof */
export const barracks = (p: KPen, seed: number) => {
  const r = rngK(seed);
  p.poly([[0, 380], [4000, 380], [3900, 180], [100, 180]], p.lin(0, 180, 0, 380, [[0, "#b5482e"], [1, "#8a3624"]]), 8);
  for (let x = 110; x < 3900; x += 50) p.stroke([[x, 185], [x - 10 + (x - 2000) * 0.02, 378]], 3, rgba(INK, 0.35));
  p.poly([[60, 380], [3940, 380], [3940, 1100], [60, 1100]], p.lin(0, 380, 0, 1100, [[0, "#efe6d0"], [1, "#d8cdb0"]]), 8);
  for (let x = 160; x < 3900; x += 260) {
    const pts: P2[] = [[x, 1100], [x, 620], ...ellPts(x + 90, 620, 90, 110, 180, 360, 0, 12).slice(1, -1), [x + 180, 620], [x + 180, 1100]];
    p.poly(pts, "#5a4a3a", 5);
    if (r() < 0.5) p.poly(rrect(x + 50, 760, x + 130, 900, 6), "#ffb24a", 0);
  }
  p.poly([[60, 1040], [3940, 1040], [3940, 1100], [60, 1100]], "#b8a888", 5);
};
/** flagstaff with a plain pennant: 600 x 2600, base 2600; t waves the cloth */
export const flagstaff = (p: KPen, t: number) => {
  p.band([[100, 2600], [100, 60]], "#e9e1c8", 26, 6);
  p.ell(100, 50, 26, 26, PAL.gold, 5);
  const pts: P2[] = [[110, 100]];
  for (let i = 0; i <= 10; i++) pts.push([110 + i * 45, 100 + 30 * Math.sin(i * 0.7 - t * 4) * (i / 10)]);
  for (let i = 10; i >= 0; i--) pts.push([110 + i * 45, 380 - i * 8 + 30 * Math.sin(i * 0.7 - t * 4) * (i / 10)]);
  p.poly(pts, "#2f5f8a", 6);
};
/** a burning bungalow far away (fire glow + smoke column), 1200 x 1600, base 1600: no people */
export const farFire = (p: KPen, t: number) => {
  smokeColumn(p, t);
  p.poly([[250, 1600], [250, 1300], [600, 1120], [950, 1300], [950, 1600]], "#3a2a22", 6);
  for (let i = 0; i < 4; i++) flame(p, 360 + i * 160, 1290 + (i % 2) * 40, 70 + 20 * (i % 2), t, 30 + i);
};
const smokeColumn = (p: KPen, t: number) => {
  for (let i = 0; i < 12; i++) {
    const k = i / 11, y = 1250 - k * 1200, x = 600 + 160 * noise1(k * 3 + t * 0.4, 9) + k * 220, rr = 120 + k * 220;
    p.g.fillStyle = p.rad(x, y, rr, [[0, rgba(i < 3 ? "#5a3a2a" : "#3a3a40", 0.55 * (1 - 0.5 * k))], [1, rgba("#3a3a40", 0)]]); p.g.beginPath(); p.g.arc(x, y, rr, 0, TAU); p.g.fill();
  }
};
/** cantonment ground: 2048 px for 80 x 80 m: packed earth, drill lines, a few shrubs */
export const paradePaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(41), S = 2048;
  g.fillStyle = "#b99a6a"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 3000; i++) { g.fillStyle = rgba(r() < 0.5 ? "#a48458" : "#cdb084", 0.3); g.beginPath(); g.ellipse(r() * S, r() * S, 6 + r() * 30, 3 + r() * 10, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 900; i++) { g.strokeStyle = rgba("#8a6e48", 0.3); g.lineWidth = 3; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20, y + (r() - 0.5) * 4); g.stroke(); }
  for (let i = 0; i < 260; i++) { g.strokeStyle = rgba("#7a8a44", 0.8); g.lineWidth = 3; const x = r() * S, y = r() * S; if (y > S * 0.3 && y < S * 0.7 && x > S * 0.3 && x < S * 0.7) continue; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (k - 1.5) * 5, y - 10 - r() * 8); g.stroke(); } }
};
/** musket (Brown Bess / Enfield style) along a direction; drawn in the person's card units */
export const musket = (p: KPen, a: P2, ang: number, L: number) => {
  const d: P2 = [Math.cos(ang), Math.sin(ang)], q = (k: number): P2 => [a[0] + d[0] * L * k, a[1] + d[1] * L * k];
  const n: P2 = [-d[1], d[0]];
  const stock: P2[] = [q(-0.28), q(0.05), [q(0.05)[0] + n[0] * 14, q(0.05)[1] + n[1] * 14], [q(-0.28)[0] + n[0] * 30, q(-0.28)[1] + n[1] * 30]];
  p.poly(stock, "#7a4e2c", 5);
  p.band([q(0.0), q(0.78)], "#7a4e2c", 14, 4);
  p.band([q(0.0), q(1.0)], "#5a6266", 6, 3);
  p.band([q(1.0), q(1.22)], "#c8ccd0", 4, 2); // bayonet
  p.dot(q(0.12)[0], q(0.12)[1], 6, PAL.brass);
};

// ---------------- the archive ----------------
/** back wall of shelves: 4000 x 2400, base 2400 */
export const archiveWall = (p: KPen) => {
  const g = p.g, r = rngK(8);
  g.fillStyle = "#4a3422"; g.fillRect(0, 0, 4000, 2400);
  for (let s = 0; s < 6; s++) {
    const y = 140 + s * 370;
    g.fillStyle = "#2e1e12"; g.fillRect(60, y, 3880, 330);
    let x = 80;
    while (x < 3900) {
      const w = 40 + r() * 70, h = 200 + r() * 120;
      if (r() < 0.12) { // a stack of bundled papers lying flat
        for (let k = 0; k < 4; k++) p.poly(rrect(x, y + 330 - (k + 1) * 50, x + 220, y + 330 - k * 50 - 4, 4), mix("#efe2c0", "#d8c49c", r()), 3);
        p.stroke([[x + 110, y + 130], [x + 110, y + 330]], 6, PAL.red); x += 240; continue;
      }
      p.poly(rrect(x, y + 330 - h, x + w, y + 328, 4), ["#7a3b2e", "#2f5f66", "#8a6a3a", "#5a3a2a", "#3a4a3a", "#c8963a"][Math.floor(r() * 6)], 4);
      p.stroke([[x + 6, y + 330 - h * 0.8], [x + w - 6, y + 330 - h * 0.8]], 5, rgba(PAL.gold, 0.8));
      x += w + 6;
    }
    g.fillStyle = "#6a4a30"; g.fillRect(40, y + 330, 3920, 40);
  }
};
/** reading table (front view, top tilted toward camera): 1800 x 1000, base 1000; open book, papers, lamp, magnifier */
export const archiveTable = (p: KPen, t: number) => {
  p.poly([[0, 300], [1800, 300], [1700, 160], [100, 160]], "#6a4628", 7);
  p.poly(rrect(0, 300, 1800, 380, 6), "#4e3018", 6);
  for (const x of [80, 1640]) p.poly(rrect(x, 380, x + 80, 1000, 6), "#4e3018", 6);
  // papers
  for (let k = 0; k < 5; k++) { const x = 260 + k * 90, y = 190 + (k % 2) * 20; p.poly([[x, y + 100], [x + 260, y + 90], [x + 280, y], [x + 30, y + 10]], mix("#f3e6c8", "#e2cda2", k / 5), 4); }
  // open book
  p.poly([[800, 280], [1100, 270], [1120, 180], [830, 190]], "#f6ecd2", 5); p.poly([[1100, 270], [1400, 280], [1380, 190], [1120, 180]], "#f3e6c8", 5);
  for (let k = 0; k < 4; k++) { p.stroke([[850, 205 + k * 18], [1090, 198 + k * 18]], 3, rgba(INK, 0.4)); p.stroke([[1135, 198 + k * 18], [1370, 205 + k * 18]], 3, rgba(INK, 0.4)); }
  // magnifier
  p.band([[1480, 250], [1600, 200]], "#5a3a22", 16, 4); p.ell(1430, 270, 70, 40, rgba("#dff4f4", 0.6), 7);
  // little lantern
  p.g.save(); p.g.translate(1550, -60); p.g.scale(0.7, 0.7); tableLantern(p, t, 1); p.g.restore();
};

// ---------------- village extras ----------------
/** chulha with a tava and a roti puffing on it: 600 x 420, base 420; fire mouth at (300, 360) */
export const chulhaTava = (p: KPen, t: number, puff: number) => {
  p.ow = 6;
  p.poly([[80, 420], [100, 250], [500, 250], [520, 420]], p.lin(80, 0, 520, 0, [[0, "#c88a5a"], [1, "#8a5434"]]));
  const mouth: P2[] = [[220, 420], [225, 330], ...ellPts(300, 330, 75, 45, 180, 360, 0, 10).slice(1, -1), [375, 330], [380, 420]];
  p.poly(mouth, p.rad(300, 400, 140, [[0, "#ffe9a0"], [0.4, "#ff9a3c"], [1, "#5a2410"]]));
  flame(p, 300, 410, 40, t, 5);
  p.ell(300, 236, 210, 46, "#2a2e30"); p.ell(300, 228, 190, 34, "#3a4044", 0);
  p.g.save(); p.g.translate(300, 222 - 12 * puff); p.g.scale(1, 0.32 + 0.1 * puff); drawChapati(p, 0, 0, 130, 130, 4); p.g.restore();
};
/** tulsi chaura (sacred basil on a plinth) with a diya: 360 x 620, base 620; flame at (180, 340) */
export const tulsi = (p: KPen, t: number) => {
  p.poly(rrect(60, 360, 300, 620, 10), "#e9dcc4", 6);
  p.poly(rrect(40, 330, 320, 380, 8), "#c86a4a", 6);
  for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (hash(i, 2) - 0.5) * 2.2, L = 80 + hash(i, 3) * 160; p.stroke([[180, 330], [180 + Math.cos(a) * L * 0.6, 330 + Math.sin(a) * L]], 5, "#2f5a2a"); p.ell(180 + Math.cos(a) * L * 0.6, 330 + Math.sin(a) * L, 18, 12, "#4f8a3a", 3, a * 57); }
  p.poly([[150, 470], [210, 470], [200, 500], [160, 500]], "#b5482e", 4);
  flame(p, 180, 470, 16, t, 3);
};
/** a basket of rotis wrapped in red cloth: 400 x 220, base 220 */
export const rotiBasket = (p: KPen) => {
  p.poly([[40, 120], [360, 120], [320, 220], [80, 220]], "#c9a04c", 6);
  for (let k = 0; k < 6; k++) p.stroke([[60 + k * 55, 125], [90 + k * 45, 215]], 4, rgba(INK, 0.35));
  for (let i = 3; i >= 0; i--) drawChapati(p, 200, 110 - i * 14, 150, 40, 20 + i);
  p.poly([[40, 120], [130, 60], [180, 124]], PAL.red, 5);
};
/** dashed glowing arrow along the lane: 2000 x 300 flat, pointing +x; k = draw-on progress */
export const laneArrow = (p: KPen, k: number) => {
  const n = Math.floor(12 * k);
  for (let i = 0; i < n; i++) { const x = 60 + i * 140; p.poly(rrect(x, 130, x + 90, 170, 20), rgba("#ffcf6a", 0.9), 0); }
  if (k >= 1) p.poly([[1780, 60], [1960, 150], [1780, 240]], rgba("#ffcf6a", 0.95), 0);
};
/** the four rotis for the desk / map icons */
export const roti = (p: KPen, seed: number, glow = 0) => {
  if (glow > 0) p.glow(200, 200, 200, "#ffcf6a", 0.6 * glow);
  p.ow = 6; drawChapati(p, 200, 200, 150, 150, seed);
};
/** torn roti half (left or right) drawn at a point in another drawing's units; r = radius */
export const rotiHalf = (p: KPen, x: number, y: number, r: number, side: -1 | 1, seed: number) => {
  p.clip(side < 0 ? [[x - r * 1.2, y - r * 1.2], [x + r * 0.05, y - r * 1.2], [x - r * 0.12, y - r * 0.4], [x + r * 0.1, y + r * 0.2], [x - r * 0.08, y + r * 1.2], [x - r * 1.2, y + r * 1.2]]
    : [[x + r * 1.2, y - r * 1.2], [x + r * 0.05, y - r * 1.2], [x - r * 0.12, y - r * 0.4], [x + r * 0.1, y + r * 0.2], [x - r * 0.08, y + r * 1.2], [x + r * 1.2, y + r * 1.2]],
  () => drawChapati(p, x, y, r, r, seed));
  p.stroke([[x + r * 0.05 * side, y - r], [x - r * 0.12, y - r * 0.4], [x + r * 0.1, y + r * 0.2], [x - r * 0.08, y + r]], 3, "#e9d6a4");
};
void lerp; void tint;

/** close-up: two hands pass a roti in firelight. 1600 x 1000; k = 0 (offered from the left) .. 1 (taken by the right hand) */
export const handsPass = (p: KPen, k: number, t: number) => {
  const g = p.g, u = Math.max(0, Math.min(1, k)), ease = u * u * (3 - 2 * u);
  g.fillStyle = p.rad(800, 420, 900, [[0, "rgba(255,190,110,0.0)"], [1, "rgba(16,34,43,0.0)"]]); g.fillRect(0, 0, 1600, 1000);
  const skinL = "#b0754e", skinR = "#c78c62";
  const rx = 770 + 80 * ease, ry = 470 - 30 * Math.sin(Math.PI * u);
  // left: the giver's arm (cream angrakha sleeve with a red trim), palm up under the roti
  const lw: P2 = [rx - 120 + 20 * ease, ry + 120 + 30 * ease];
  p.poly(tube([[-60, 820], [200, 720], [lw[0] - 140, lw[1] + 20]], 230, 190), "#efe6cf", 9);
  p.band([[lw[0] - 150, lw[1] - 70], [lw[0] - 130, lw[1] + 110]], "#c8323a", 18, 4);
  p.poly(tube([[lw[0] - 140, lw[1] + 20], [lw[0], lw[1]]], 120, 110), skinL, 8);
  p.ell(lw[0] + 40, lw[1] - 4, 105, 52, skinL, 8, -8);
  for (let i = 0; i < 4; i++) p.poly(tube([[lw[0] + 90 + i * 6, lw[1] - 30 + i * 20], [lw[0] + 175 - i * 12, lw[1] - 46 + i * 22]], 34, 28), skinL, 6);
  p.poly(tube([[lw[0] + 10, lw[1] - 40], [lw[0] + 80, lw[1] - 90]], 40, 32), skinL, 6); // thumb over the edge
  // the roti
  p.glow(rx, ry, 260, "#ffd36a", 0.35);
  g.save(); g.translate(rx, ry); g.scale(1, 0.62); drawChapati(p, 0, 0, 230, 230, 5); g.restore();
  // right: the receiver's hand (dark shawl sleeve) closing on the far edge
  const rh: P2 = [rx + 210 - 30 * ease, ry - 10 + 10 * ease], reach = 1 - ease;
  p.poly(tube([[1680, 620], [1420 + 60 * reach, 560], [rh[0] + 110 + 140 * reach, rh[1] + 20]], 240, 180), "#3a4a5a", 9);
  p.pattern(tube([[1680, 620], [1420 + 60 * reach, 560], [rh[0] + 110 + 140 * reach, rh[1] + 20]], 240, 180), "buti", "#7f9aa0", 1.4);
  p.poly(tube([[rh[0] + 110 + 140 * reach, rh[1] + 20], [rh[0] + 20 + 140 * reach, rh[1]]], 120, 110), skinR, 8);
  const hx = rh[0] + 140 * reach;
  p.ell(hx, rh[1] - 6, 95, 60, skinR, 8, 10);
  for (let i = 0; i < 4; i++) p.poly(tube([[hx - 50, rh[1] - 40 + i * 24], [hx - 130 + i * 8 + 40 * reach, rh[1] - 30 + i * 30]], 34, 28), skinR, 6);
  p.poly(tube([[hx - 30, rh[1] + 40], [hx - 110 + 30 * reach, rh[1] + 70]], 40, 32), skinR, 6);
  void t;
};
