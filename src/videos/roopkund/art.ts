// Roopkund art: painted textures (snow, rock, peaks, the frozen tarn, lab screens) and flat ink effect cards (remains,
// hail, mist, storm, marks, the pennant, the dating bar). Remains are cartoon and respectful: clean cream bones and simple
// rounded skulls with soft teal sockets, never gore. No text anywhere. Everything is seeded (rng / index), never random.
import { Pen, INK, mix } from "../tunguska/toon";
import { ctex, rng } from "../tunguska/paint";

type P2 = [number, number];
const TAU = Math.PI * 2;
const BONE = "#f3e3bc", BONE_SH = "#d8c49a", SOCKET = "#1f4f56";

// ---------------- textures ----------------
/** wind-packed snow: cool white with blue hollows, a few drift ripples and sparkles */
export const snowTex = () => ctex("rkSnow", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#e4edf1"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 30; i++) {
    const x = r() * S, y = r() * S, rr = 80 + r() * 220, gr = g.createRadialGradient(x, y, 0, x, y, rr);
    const c = r() > 0.5 ? "196,216,230" : "236,244,248";
    gr.addColorStop(0, `rgba(${c},0.6)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S, w = 60 + r() * 120;
    g.strokeStyle = `rgba(150,182,204,${0.25 + r() * 0.2})`; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 8 - r() * 8, x + w, y); g.stroke();
  }
  for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(r() * S, r() * S, 1.5 + r() * 1.5, 0, TAU); g.fill(); }
});
/** slate rock with cracks and a little snow on the top faces */
export const rockTex = () => ctex("rkRock", 512, 512, (g, r) => {
  g.fillStyle = "#7d8e98"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? "rgba(96,112,124,0.5)" : "rgba(150,166,176,0.45)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 60, 14 + r() * 30, r() * 3, 0, TAU); g.fill(); }
  g.strokeStyle = "rgba(40,52,62,0.55)"; g.lineWidth = 3;
  for (let i = 0; i < 18; i++) { let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += 20 + r() * 30; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(236,244,248,0.85)"; g.beginPath(); g.ellipse(r() * 512, r() * 180, 30 + r() * 50, 8 + r() * 10, 0, 0, TAU); g.fill(); }
});
/** mountain cone: canvas top = summit. Snow cap with a jagged edge over slate rock with snow gullies */
export const peakTex = (k: number) => ctex("rkPeak" + k, 512, 512, (g) => {
  const r = rng(k * 17 + 3);
  g.fillStyle = "#4f6878"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) { const x = r() * 512; g.fillStyle = "rgba(60,82,96,0.6)"; g.fillRect(x, 0, 6 + r() * 20, 512); }
  const edge = 150 + 60 * r();
  g.fillStyle = "#eef4f7"; g.beginPath(); g.moveTo(0, 0); g.lineTo(512, 0);
  for (let x = 512; x >= 0; x -= 32) g.lineTo(x, edge + (r() - 0.3) * 70);
  g.closePath(); g.fill();
  for (let i = 0; i < 12; i++) { const x = r() * 512, y = edge - 20 + r() * 40, h = 60 + r() * 160; g.fillStyle = "rgba(238,244,247,0.9)"; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.lineTo(x + 2, y + h); g.closePath(); g.fill(); }
  g.fillStyle = "rgba(200,220,232,0.6)"; for (let x = 0; x < 512; x += 64) g.fillRect(x + 40, 0, 18, edge * 0.8);
});
/** the frozen tarn seen from above (CircleGeometry uv): sea-green water, cream ice plates with ink cracks, a pale rim */
export const iceTex = () => ctex("rkIce", 1024, 1024, (g, r) => {
  const C = 512;
  const gr = g.createRadialGradient(C, C, 40, C, C, 512);
  gr.addColorStop(0, "#1f6f78"); gr.addColorStop(0.6, "#2f8f8a"); gr.addColorStop(0.9, "#5fb8a8"); gr.addColorStop(1, "#bfe2da");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  // ice plates: polygons (seeded), mostly around the rim, open dark water toward the middle
  for (let i = 0; i < 46; i++) {
    const a = r() * TAU, d = 250 + r() * 250, x = C + Math.cos(a) * d, y = C + Math.sin(a) * d, rad = 40 + r() * 70;
    const pts: P2[] = [];
    for (let k = 0; k < 6; k++) { const b = (k / 6) * TAU + r() * 0.5; pts.push([x + Math.cos(b) * rad * (0.7 + 0.4 * r()), y + Math.sin(b) * rad * (0.7 + 0.4 * r())]); }
    g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
    g.fillStyle = r() < 0.5 ? "#e9f3f2" : "#d4ebe8"; g.fill();
    g.strokeStyle = "rgba(36,23,38,0.55)"; g.lineWidth = 4; g.stroke();
  }
  g.strokeStyle = "rgba(220,240,238,0.5)"; g.lineWidth = 3;
  for (let i = 0; i < 20; i++) { const a = r() * TAU, d = 60 + r() * 200; g.beginPath(); g.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 20 + r() * 40, 0, Math.PI * 0.8); g.stroke(); }
});
/** lab monitor: deep teal panel, soft grid, a skull outline (shot 5) or a DNA strand + dots (shot 7); no text */
export const labScreenTex = (k: number, kind: "skull" | "dna", big = false) => ctex(`rkScreen_${kind}_${k}_${big ? 1 : 0}`, big ? 1024 : 512, big ? 614 : 320, (g) => {
  const W = big ? 1024 : 512, H = big ? 614 : 320, r = rng(k * 13 + (kind === "dna" ? 101 : 7));
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0f4a52"); gr.addColorStop(1, "#14606a");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(140,230,215,0.18)"; g.lineWidth = 2;
  for (let x = W / 8; x < W; x += W / 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = H / 5; y < H; y += H / 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const s = H / 320;
  g.lineCap = "round"; g.lineJoin = "round";
  if (kind === "skull") {
    const cx = big ? W * 0.5 : W * (0.35 + 0.3 * r()), cy = H * 0.52, R = 92 * s * (big ? 0.95 : 0.8);
    g.strokeStyle = "#f6edd6"; g.lineWidth = 7 * s;
    // cranium + cheek + jaw outline (front view)
    g.beginPath(); g.ellipse(cx, cy - 0.2 * R, R, 0.92 * R, 0, Math.PI * 0.85, Math.PI * 2.15); g.stroke();
    g.beginPath(); g.moveTo(cx - 0.82 * R, cy + 0.25 * R); g.quadraticCurveTo(cx - 0.6 * R, cy + 0.95 * R, cx, cy + 1.0 * R); g.quadraticCurveTo(cx + 0.6 * R, cy + 0.95 * R, cx + 0.82 * R, cy + 0.25 * R); g.stroke();
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 0.36 * R, cy + 0.1 * R, 0.22 * R, 0.19 * R, 0, 0, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(cx, cy + 0.33 * R); g.lineTo(cx - 0.08 * R, cy + 0.5 * R); g.lineTo(cx + 0.08 * R, cy + 0.5 * R); g.closePath(); g.stroke();
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * 0.12 * R, cy + 0.72 * R); g.lineTo(cx + i * 0.12 * R, cy + 0.86 * R); g.stroke(); }
    // the mark on the crown: a sunflower star where the blow landed (from above)
    if (big || k % 2 === 0) {
      const mx = cx + (big ? 0.12 : 0.2) * R, my = cy - 1.05 * R;
      g.fillStyle = "#ffc93c"; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, q = i % 2 ? 0.1 * R : 0.24 * R; g.lineTo(mx + Math.cos(a) * q, my + Math.sin(a) * q); }
      g.closePath(); g.fill();
    }
    if (!big) for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(255,201,60,0.8)"; g.fillRect(W * 0.72, H * (0.2 + i * 0.16), W * (0.08 + 0.12 * r()), 10 * s); }
  } else {
    // double helix along x: two phase-shifted sine strands with rungs
    const y0 = H * (big ? 0.32 : 0.4), A = 40 * s;
    for (const [ph, col] of [[0, "#ffc93c"], [Math.PI, "#7fe8d0"]] as const) {
      g.strokeStyle = col; g.lineWidth = 7 * s; g.beginPath();
      for (let x = 20; x <= W - 20; x += 6) g.lineTo(x, y0 + A * Math.sin(x / (48 * s) + ph + k)); g.stroke();
    }
    g.strokeStyle = "rgba(246,237,214,0.7)"; g.lineWidth = 3 * s;
    for (let x = 32; x < W - 20; x += 26 * s) { g.beginPath(); g.moveTo(x, y0 + A * Math.sin(x / (48 * s) + k)); g.lineTo(x, y0 + A * Math.sin(x / (48 * s) + Math.PI + k)); g.stroke(); }
    if (big) { // 38 dots: one per skeleton (no numbers written)
      for (let i = 0; i < 38; i++) { const col = i % 19, row = Math.floor(i / 19); g.fillStyle = "#f6edd6"; g.beginPath(); g.arc(W * 0.1 + col * W * 0.0445, H * (0.66 + row * 0.13), 11, 0, TAU); g.fill(); }
    } else for (let i = 0; i < 12; i++) { g.fillStyle = r() < 0.3 ? "#ffc93c" : "#f6edd6"; g.fillRect(24 + i * 38, H * 0.72, 22, 22 + 40 * r()); }
  }
});
/** a blank cream board on the lab wall (where the Tunguska office had its star chart) */
export const boardTex = () => ctex("rkBoard", 512, 384, (g) => {
  g.fillStyle = "#f3ead2"; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = "#2f8f83"; g.lineWidth = 14; g.strokeRect(7, 7, 498, 370);
  g.strokeStyle = "rgba(47,143,131,0.5)"; g.lineWidth = 5;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(60, 110 + i * 70); g.lineTo(300 + i * 40, 110 + i * 70); g.stroke(); }
});

// ---------------- effect cards ----------------
/** one bone (long bone, side-on) on a 256 x 96 canvas */
export const fxBone = (p: Pen, k: number) => {
  const L = 60 + 10 * (k % 3), R = 196 - 10 * (k % 2);
  p.poly([[L, 38], [R, 40], [R, 58], [L, 56]], BONE, 0);
  for (const x of [L, R]) { p.ell(x - (x === L ? 6 : -6), 34, 18, 16, BONE, 10); p.ell(x - (x === L ? 6 : -6), 62, 18, 16, BONE, 10); }
  p.poly([[L, 38], [R, 40], [R, 58], [L, 56]], BONE, 0);
  p.stroke([[L + 4, 38], [R - 4, 40]], 9); p.stroke([[L + 4, 56], [R - 4, 58]], 9);
  p.stroke([[L + 20, 52], [R - 30, 53]], 3, BONE_SH);
};
/** a simple rounded cartoon skull (seen from above/front, calm, not scary) on a 200 x 220 canvas */
export const fxSkull = (p: Pen, k: number) => {
  const tilt = ((k % 5) - 2) * 6;
  p.ell(100, 92, 74, 70, BONE, 13, 0, 360, tilt);
  p.poly([[54, 120], [146, 120], [136, 176], [64, 176]], BONE, 13);
  p.ell(100, 112, 60, 40, BONE, 0, 0, 360, tilt);
  p.ell(72, 112, 17, 15, SOCKET, 4); p.ell(128, 112, 17, 15, SOCKET, 4);
  p.poly([[100, 134], [92, 150], [108, 150]], SOCKET, 3);
  for (let i = 0; i < 4; i++) p.stroke([[78 + i * 15, 160], [78 + i * 15, 174]], 4);
  p.arc(84, 60, 30, 22, 200, 280, 5, "#ffffff");
};
/** soft white mist wisp (see-through card) on a 512 x 160 canvas */
export const fxMist = (p: Pen, k: number) => {
  const g = p.g, r = rng(k * 7 + 1);
  g.save(); g.filter = "blur(14px)";
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(240,248,250,${0.35 + 0.2 * r()})`; g.beginPath(); g.ellipse(80 + i * 70 + r() * 20, 80 + (r() - 0.5) * 30, 70 + r() * 40, 18 + r() * 14, 0, 0, TAU); g.fill(); }
  g.restore();
};
/** hail sheet: pale ice pellets with short streaks, seeded on a tile; u (0..1) scrolls the tile downward (wraps seamlessly) */
export const fxHail = (p: Pen, u: number, layer: number) => {
  const g = p.g, W = 540, H = 960, r = rng(77 + layer * 5), n = layer ? 70 : 110, sz = layer ? 9 : 6;
  for (let i = 0; i < n; i++) {
    const x = r() * W, y0 = r() * H, y = (y0 + u * H) % H, len = (layer ? 38 : 26) + r() * 14;
    for (const yy of [y, y - H]) {
      g.strokeStyle = "rgba(235,246,250,0.55)"; g.lineWidth = sz * 0.7; g.lineCap = "round";
      g.beginPath(); g.moveTo(x - 4, yy - len); g.lineTo(x, yy); g.stroke();
      g.fillStyle = "#f4fbff"; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, yy, sz, 0, TAU); g.fill(); g.stroke();
    }
  }
};
/** a cricket-ball-sized hailstone: icy white ball with a darker core ring, 128 x 128 */
export const fxHailBall = (p: Pen) => {
  p.ell(64, 64, 46, 46, "#eef8fc", 7);
  p.ell(64, 64, 26, 26, "#cfe6ef", 0);
  p.arc(52, 50, 22, 18, 200, 290, 5, "#ffffff");
};
/** flat ring mark on the ground around a group of remains (multiply-free, soft see-through), 512 x 512 */
export const fxRingMark = (p: Pen, col: string, u: number) => {
  const g = p.g, rr = 150 + 80 * u;
  g.lineWidth = 34; g.strokeStyle = col; g.globalAlpha = 0.85 * (1 - 0.25 * u);
  g.beginPath(); g.arc(256, 256, rr, 0, TAU); g.stroke();
  g.lineWidth = 10; g.strokeStyle = mix(col, "#ffffff", 0.5);
  g.beginPath(); g.arc(256, 256, rr, 0, TAU); g.stroke();
  g.globalAlpha = 1;
};
/** the procession's pennant on a pole (Nanda Devi yatra style: plain cloth, no symbols), 200 x 600, pole foot at (40, 590) */
export const fxPennant = (p: Pen, t: number) => {
  p.stroke([[40, 590], [40, 30]], 14, INK); p.stroke([[40, 586], [40, 34]], 7, "#a8724a");
  const wv = (y: number, k: number) => 10 * Math.sin(t * 6 + k + y * 0.02);
  p.poly([[44, 40], [180, 70 + wv(70, 0)], [44, 150]], "#e8443a", 7);
  p.poly([[44, 150], [150, 175 + wv(175, 1)], [44, 230]], "#f2c14e", 7);
  p.ell(40, 26, 10, 10, "#f2c14e", 5);
};
/** a horizontal dating bar: ticks along a line and a marker that slides to its place (no numbers), 900 x 200 */
export const fxTimeline = (p: Pen, u: number) => {
  p.band([[60, 120], [840, 120]], "#f6edd6", 18, 6, "round");
  for (let i = 0; i <= 12; i++) p.stroke([[60 + i * 65, 96], [60 + i * 65, 144]], i % 4 ? 5 : 9);
  const x = 780 - (780 - 310) * u;
  p.poly([[x, 112], [x - 30, 52], [x + 30, 52]], "#ffc93c", 8);
  p.ell(x, 120, 20, 20, "#ffc93c", 7);
};
/** dark storm cloud card (soft), 600 x 300 */
export const fxStormCloud = (p: Pen, k: number) => {
  const g = p.g, r = rng(k * 11 + 2);
  g.save(); g.filter = "blur(3px)";
  for (let i = 0; i < 7; i++) { const x = 90 + i * 70 + r() * 20, y = 150 + (r() - 0.5) * 50, rr = 60 + r() * 50; g.fillStyle = i % 2 ? "#6f8590" : "#5a707c"; g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, 0, 0, TAU); g.fill(); }
  g.fillStyle = "#4c616e"; g.beginPath(); g.ellipse(300, 205, 250, 46, 0, 0, TAU); g.fill();
  g.restore();
};
