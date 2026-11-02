// Canvas art for "दिल्ली का लौह स्तंभ" (Iron Pillar): every set piece is a KPen drawing (kit ink #10222B) turned into a card
// by world.ts. Design sizes and base lines are given per function (y grows downward; the base line is where it stands).
// Palette: sea-green / teal / cream / sunflower + sandstone and iron; no purple. All randomness is seeded (rngK / hash).
import { KPen, PAL, INK, TAU, hash, rngK, rgba, mix, shade, ellPts, rrect, curve, type P2 } from "../../engine/kit/core";

// ================= the pillar =================
/** full pillar design: 520 x 6900 units (1000 units = 1 m), ground line at y 6900 */
export const PIL_W = 520, PIL_H = 6900, PIL_SEG = 1150;
const CX = 260;
/** radius (design units) of the pillar outline at design height y */
const prof: [number, number][] = [ // [y, r] from the top
  [150, 150], [150, 205], [330, 205], [340, 175], [360, 240], [470, 240], [480, 175], [520, 190], [560, 165], [600, 200], [640, 170],
  [700, 160], [760, 185], [880, 215], [1000, 236], [1080, 240], [1100, 180], [1150, 168], [1170, 150], [6750, 205], [6790, 230], [6900, 236],
];
const pillarOutline = (): P2[] => {
  const L: P2[] = [], R: P2[] = [];
  for (const [y, r] of prof) { L.push([CX - r, y]); R.push([CX + r, y]); }
  return [[CX - 150, 150], ...L, ...R.reverse()];
};
const IRON = "#3e3a36";
export type PillarOpts = { dent: number; shine: number; glint?: number; rust?: number; hot?: number; wet?: number };
/** the whole pillar (call inside a clip/translate for one segment): dark forged iron with cylindrical shading */
export const pillarFull = (p: KPen, o: PillarOpts) => {
  const g = p.g, out = pillarOutline();
  p.ow = 9;
  const body = p.lin(CX - 245, 0, CX + 245, 0, [[0, "#1f1d1c"], [0.18, "#47413b"], [0.34, "#6e655a"], [0.42, "#5a524a"], [0.7, "#3a3532"], [1, "#191817"]]);
  p.poly(out, body, 0);
  p.clip(out, () => {
    const r = rngK(7);
    // warm brown patina mottling (the protective film is a dark brown-black skin)
    for (let i = 0; i < 520; i++) {
      const y = 160 + r() * 6700, x = CX - 230 + r() * 460, rr = 8 + r() * 40;
      g.fillStyle = rgba(r() < 0.55 ? "#6a4630" : "#2a2522", 0.18 + r() * 0.2); g.beginPath(); g.ellipse(x, y, rr * 1.4, rr, 0, 0, TAU); g.fill();
    }
    // faint forge-weld seams (lumps joined by hammering)
    for (let i = 0; i < 26; i++) { const y = 1300 + i * 210 + r() * 80; p.stroke([[CX - 210, y], [CX - 60, y + 14 - r() * 28], [CX + 90, y - 10 + r() * 20], [CX + 210, y + 8]], 3, rgba("#14110f", 0.35)); }
    // capital rings: highlight lines
    for (const y of [330, 360, 470, 520, 560, 600, 640, 700, 1080, 1100, 1150]) p.stroke([[CX - 250, y], [CX + 250, y]], 6, rgba(INK, 0.8));
    // the bell's petals (inverted lotus)
    for (let k = -4; k <= 4; k++) { const x = CX + k * 52; p.stroke([[x * 0.7 + CX * 0.3, 720], [x, 1075]], 4, rgba("#1a1715", 0.7)); }
    // ribbed amalaka
    for (let k = -6; k <= 6; k++) p.stroke([[CX + k * 36, 365], [CX + k * 36, 465]], 4, rgba("#1a1715", 0.6));
    // the Chandra inscription: rows of carved strokes (illegible on purpose: no text in the scene)
    for (let row = 0; row < 7; row++) {
      const y = 4380 + row * 62;
      for (let x = CX - 150; x < CX + 150; x += 22 + hash(row * 40 + x, 3) * 14) {
        const h = 26 + hash(x, row) * 18, k = hash(x + row, 9);
        p.stroke([[x, y], [x + 6, y + h * 0.5], [x + (k < 0.5 ? 14 : -2), y + h]], 4, rgba("#15120f", 0.75));
        if (k > 0.6) p.stroke([[x - 4, y + 2], [x + 14, y + 2]], 4, rgba("#15120f", 0.75));
      }
    }
    // later graffiti lines further down (shallow scratches)
    for (let i = 0; i < 4; i++) { const y = 3600 + i * 70; p.stroke([[CX - 90, y], [CX + 30 + i * 20, y + 4]], 3, rgba("#8a7a66", 0.35)); }
    // the polished band (hugged for luck): silver-bright when shine 1, dull brown when 0
    const s = Math.max(0, Math.min(1, o.shine));
    if (s > 0.02 || true) {
      const y0 = 5150, y1 = 5900, a = 0.15 + 0.85 * s;
      const band = p.lin(CX - 245, 0, CX + 245, 0, [[0, mix("#3a2418", "#55585a", s)], [0.3, mix("#6a4630", "#b4b8b2", s)], [0.38, mix("#7a5236", "#e8eae2", s)], [0.5, mix("#5a3a26", "#8e9490", s)], [1, mix("#2a1c14", "#3e4244", s)]]);
      g.save(); g.globalAlpha = a;
      g.fillStyle = band; g.beginPath(); g.moveTo(0, y0 + 60); for (let x = 0; x <= 520; x += 20) g.lineTo(x, y0 + 40 * Math.sin(x * 0.03)); g.lineTo(520, y1); for (let x = 520; x >= 0; x -= 20) g.lineTo(x, y1 - 50 * Math.sin(x * 0.025 + 1)); g.closePath(); g.fill();
      g.restore();
    }
    // the cannonball dent ~4 m up (y 2900): crater + cracks
    if (o.dent > 0) {
      const y = 2900, x = CX + 30;
      p.ell(x, y, 92, 70, p.rad(x - 15, y - 12, 100, [[0, "#141110"], [0.65, "#2e2824"], [1, "#6a5e52"]]), 5);
      p.ell(x + 10, y + 8, 60, 44, rgba("#0d0b0a", 0.7), 0);
      p.stroke(ellPts(x, y, 98, 76, 200, 330, 0, 12), 6, rgba("#9a8a76", 0.6));
      p.stroke(ellPts(x, y, 88, 66, 20, 160, 0, 12), 8, rgba("#c8b8a0", 0.75)); // lit lower lip of the crater
      if (o.hot && o.hot > 0) { p.glow(x + 8, y + 6, 150, "#ff8a2a", 0.9 * o.hot); p.ell(x + 10, y + 8, 50, 36, rgba("#ffd36a", 0.85 * o.hot), 0); }
      for (const [a, l] of [[0.3, 120], [1.9, 90], [2.8, 140], [4.2, 100], [5.3, 80]] as const) p.stroke([[x + Math.cos(a) * 85, y + Math.sin(a) * 65], [x + Math.cos(a + 0.15) * (85 + l * 0.6), y + Math.sin(a + 0.15) * (65 + l * 0.5)], [x + Math.cos(a - 0.1) * (85 + l), y + Math.sin(a - 0.1) * (65 + l * 0.8)]], 4, rgba("#0d0b0a", 0.85));
    }
    // fresh orange rust blooming fast (the first years): seeded blotches that appear with o.rust
    if (o.rust && o.rust > 0.01) {
      const rr = rngK(91);
      for (let i = 0; i < 260; i++) {
        const y = 1200 + rr() * 5600, x = CX - 220 + rr() * 440, s0 = rr();
        if (s0 > o.rust) continue;
        const k = Math.min(1, (o.rust - s0) * 4), rad = (14 + rr() * 50) * (0.5 + 0.5 * k);
        g.fillStyle = rgba(rr() < 0.5 ? "#e0702e" : "#b8501e", 0.55 + 0.35 * k); g.beginPath(); g.ellipse(x, y, rad * 1.3, rad, rr() * 3, 0, TAU); g.fill();
        if (k > 0.6) { g.fillStyle = rgba("#f39a4a", 0.5); g.beginPath(); g.ellipse(x - rad * 0.3, y - rad * 0.3, rad * 0.4, rad * 0.3, 0, 0, TAU); g.fill(); }
      }
    }
    // rain sheen: vertical wet streaks
    if (o.wet && o.wet > 0) for (let i = 0; i < 40; i++) { const x = CX - 200 + hash(i, 31) * 400, y = 300 + hash(i, 32) * 6000; p.stroke([[x, y], [x + 4, y + 260 + hash(i, 33) * 300]], 5, rgba("#dff6ff", 0.35 * o.wet)); }
    // a sun glint running down the highlight
    if (o.glint) { g.fillStyle = p.lin(CX - 110, 0, CX - 40, 0, [[0, rgba("#fff6d8", 0)], [0.5, rgba("#fff6d8", 0.35 * o.glint)], [1, rgba("#fff6d8", 0)]]); g.fillRect(CX - 110, 150, 70, 6750); }
  });
  p.poly(out, null, 9);
  // collar at the base (the pillar sits in a stone collar of the paving)
  p.poly([[CX - 260, 6900], [CX - 250, 6830], [CX + 250, 6830], [CX + 260, 6900]], "#b9a585", 6);
};
/** one segment k (0 = top) of the pillar, drawn on a 520 x (PIL_SEG + 8) card */
export const pillarSeg = (p: KPen, k: number, o: PillarOpts) => {
  p.g.save(); p.g.translate(0, -(k * PIL_SEG - 4)); pillarFull(p, o); p.g.restore();
};

// ================= the Qutb complex =================
/** Qutb Minar: 600 x 3000 (15 m x 75 m), base 3000; five fluted storeys, balconies, sandstone + marble bands */
export const minar = (p: KPen) => {
  const g = p.g; p.ow = 7;
  const st = [[3000, 2350, 290, 250], [2350, 1800, 245, 210], [1800, 1350, 205, 175], [1350, 950, 170, 150], [950, 560, 148, 128]] as const;
  st.forEach(([y0, y1, r0, r1], i) => {
    const pts: P2[] = [[300 - r0, y0], [300 - r1, y1], [300 + r1, y1], [300 + r0, y0]];
    const marble = i >= 3;
    p.poly(pts, p.lin(300 - r0, 0, 300 + r0, 0, [[0, marble ? "#c7b9a4" : "#8e4632"], [0.35, marble ? "#f3ecdc" : "#c9704e"], [0.6, marble ? "#e0d5c0" : "#b55e40"], [1, marble ? "#9a8c78" : "#6e3324"]]), 7);
    p.clip(pts, () => {
      const n = 12;
      for (let k = 1; k < n; k++) { const u = k / n, xa = 300 - r0 + 2 * r0 * u, xb = 300 - r1 + 2 * r1 * u; p.stroke([[xa, y0], [xb, y1]], 4, rgba(INK, 0.35)); if (k % 2) p.stroke([[xa + 8, y0], [xb + 7, y1]], 6, rgba("#ffe2c0", 0.18)); }
      // calligraphy bands (decorative dots/strokes only)
      for (const yy of [y0 - (y0 - y1) * 0.3, y0 - (y0 - y1) * 0.62]) {
        g.fillStyle = marble ? "#d8c09a" : "#e2a57c"; g.fillRect(0, yy - 26, 600, 52);
        for (let x = 0; x < 600; x += 16) p.stroke([[x, yy - 12], [x + 6, yy + 10]], 4, rgba("#5a2a1a", 0.5));
        p.stroke([[0, yy - 26], [600, yy - 26]], 4, rgba(INK, 0.5)); p.stroke([[0, yy + 26], [600, yy + 26]], 4, rgba(INK, 0.5));
      }
      if (i === 3 || i === 4) for (let yy = y0 - 60; yy > y1; yy -= 120) { g.fillStyle = "#b5604a"; g.fillRect(0, yy - 14, 600, 28); }
    });
    // balcony (corbelled) with a railing
    const by = y1, br = r1 + 48;
    p.poly([[300 - r1 - 4, by + 70], [300 - br, by + 10], [300 + br, by + 10], [300 + r1 + 4, by + 70]], marble ? "#d8ccb4" : "#9e5038", 6);
    for (let k = 0; k < 5; k++) p.stroke([[300 - r1 + k * 2, by + 70 - k * 12], [300 + r1 - k * 2, by + 70 - k * 12]], 3, rgba(INK, 0.4));
    p.poly(rrect(300 - br, by - 40, 300 + br, by + 12, 6), marble ? "#efe6d2" : "#c9704e", 6);
    for (let x = 300 - br + 24; x < 300 + br; x += 26) p.stroke([[x, by - 34], [x, by + 6]], 4, rgba(INK, 0.55));
  });
  // top: small railing drum
  p.poly(rrect(178, 470, 422, 560, 10), "#e9dfc9", 7);
  for (let x = 196; x < 420; x += 24) p.stroke([[x, 480], [x, 552]], 4, rgba(INK, 0.5));
  // windows / doorways
  for (const [y, w] of [[2650, 34], [2050, 30], [1560, 26], [1150, 22], [760, 20]] as const) p.poly([[300 - w, y + 60], [300 - w, y], [300, y - w * 1.1], [300 + w, y], [300 + w, y + 60]], "#2a1a16", 5);
};
/** the great arched screen of the mosque: 3400 x 1600 (34 m x 16 m), base 1600; openings are transparent */
export const archScreen = (p: KPen, seed = 1) => {
  const g = p.g, r = rngK(seed); p.ow = 9;
  const top: P2[] = [[0, 1600], [0, 520]];
  for (let x = 0; x <= 3400; x += 50) top.push([x, 300 + 160 * Math.abs(Math.sin(x * 0.0021 + 0.6)) + 70 * r() + (x > 1300 && x < 2100 ? -170 : 0)]);
  top.push([3400, 600], [3400, 1600]);
  p.poly(top, p.lin(0, 200, 0, 1600, [[0, "#d69a6a"], [0.5, "#c88458"], [1, "#a8683f"]]), 9);
  p.clip(top, () => {
    // ashlar courses
    for (let y = 340; y < 1600; y += 46) { p.stroke([[0, y], [3400, y]], 3, rgba("#6a3a22", 0.35)); for (let x = (y / 46) % 2 ? 0 : 60; x < 3400; x += 120) p.stroke([[x, y], [x, y + 46]], 2, rgba("#6a3a22", 0.25)); }
    // carved bands around the arches (decorative only)
    for (let i = 0; i < 260; i++) p.dot(r() * 3400, 380 + r() * 1100, 3 + r() * 4, rgba("#fbe0b8", 0.35));
  });
  // arch openings (pointed), cut out so the sky shows through, then outlined with carved frames
  const arch = (cx: number, w: number, top: number, base: number): P2[] => {
    const pts: P2[] = [[cx - w / 2, base], [cx - w / 2, top + w * 0.55]];
    for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([cx - w / 2 + (w / 2) * Math.sin((u * Math.PI) / 2), top + w * 0.55 - w * 0.55 * Math.sin((u * Math.PI) / 2) ** 0.7]); }
    for (let i = 24; i >= 0; i--) { const u = i / 24; pts.push([cx + w / 2 - (w / 2) * Math.sin((u * Math.PI) / 2), top + w * 0.55 - w * 0.55 * Math.sin((u * Math.PI) / 2) ** 0.7]); }
    pts.push([cx + w / 2, top + w * 0.55], [cx + w / 2, base]);
    return pts;
  };
  for (const [cx, w, t] of [[1700, 700, 300], [820, 420, 760], [2580, 420, 760], [300, 300, 980], [3100, 300, 980]] as const) {
    const pts = arch(cx, w, t, 1600), outer = arch(cx, w + 90, t - 60, 1600);
    p.poly(outer, "#e8b88a", 7);
    for (let k = 0; k < 18; k++) { const q = outer[Math.floor((k / 18) * outer.length)]; p.dot(q[0], q[1] + 20, 8, "#a8683f"); }
    g.save(); g.globalCompositeOperation = "destination-out"; p.poly(pts, "#000", 0); g.restore();
    p.poly(pts, null, 8);
  }
};
/** a colonnade of carved temple pillars under a flat stone roof: 1800 x 600 (18 m x 6 m), base 600 */
export const colonnade = (p: KPen, seed = 1) => {
  const g = p.g, r = rngK(seed); p.ow = 7;
  g.fillStyle = "#3b3a34"; g.fillRect(0, 140, 1800, 460);
  g.fillStyle = p.lin(0, 140, 0, 600, [[0, "rgba(16,34,43,0.6)"], [1, "rgba(16,34,43,0.1)"]]); g.fillRect(0, 140, 1800, 460);
  p.poly([[0, 150], [1800, 150], [1800, 60], [0, 60]], "#d9c7a6", 7);
  p.poly([[0, 60], [1800, 60], [1800, 20], [0, 20]], "#c4b08c", 6);
  for (let x = 0; x < 1800; x += 60) p.stroke([[x, 64], [x + 30, 146]], 3, rgba("#7a6a4e", 0.3));
  for (let x = 60; x < 1800; x += 150) {
    const w = 46 + r() * 4;
    p.poly(rrect(x - w, 150, x + w, 600, 4), p.lin(x - w, 0, x + w, 0, [[0, "#b8a482"], [0.4, "#efe2c6"], [1, "#a8946e"]]), 6);
    for (const y of [200, 300, 380, 470, 560]) { p.poly(rrect(x - w - 8, y - 14, x + w + 8, y + 14, 4), "#d9c7a6", 4); }
    for (const y of [250, 420]) { p.poly([[x, y - 26], [x + 24, y], [x, y + 26], [x - 24, y]], "#c9b48e", 3); p.dot(x, y, 6, "#8a6a4a"); }
    p.poly([[x - w - 24, 150], [x + w + 24, 150], [x + w, 186], [x - w, 186]], "#cdb894", 5);
  }
};
/** Alai Darwaza: 1200 x 1200 (12 m), base 1200 - red sandstone gate with marble bands and a white dome */
export const alai = (p: KPen) => {
  p.ow = 8;
  p.ell(600, 330, 320, 250, p.rad(520, 250, 340, [[0, "#ffffff"], [1, "#d8cdb8"]]), 8);
  p.poly(rrect(250, 330, 950, 1200, 4), p.lin(250, 0, 950, 0, [[0, "#9a4a34"], [0.4, "#c9704e"], [1, "#8a3e2c"]]), 8);
  for (const y of [420, 520]) p.poly(rrect(250, y, 950, y + 30, 0), "#f3ecdc", 4);
  const pts: P2[] = [[470, 1200], [470, 780], ...curve([470, 780], [600, 520], [730, 780], 14).slice(1), [730, 1200]];
  p.poly(pts, "#2a1a16", 7);
  p.stroke(pts.map(([x, y]) => [x + (x - 600) * 0.18, y - 30] as P2), 22, "#f3ecdc");
  p.poly(pts, null, 7);
  for (const s of [-1, 1]) for (const y of [700, 950]) p.poly(rrect(600 + s * 270 - 50, y, 600 + s * 270 + 50, y + 150, 30), "#3a2420", 5);
};
/** low rubble wall with grass: 3000 x 300, base 300 */
export const rubble = (p: KPen, seed: number) => {
  const r = rngK(seed); p.ow = 6;
  const pts: P2[] = [[0, 300]]; for (let x = 0; x <= 3000; x += 60) pts.push([x, 120 + 90 * r()]); pts.push([3000, 300]);
  p.poly(pts, p.lin(0, 100, 0, 300, [[0, "#c8a07a"], [1, "#9a7656"]]));
  for (let i = 0; i < 60; i++) p.ell(r() * 3000, 180 + r() * 100, 30 + r() * 30, 18 + r() * 10, rgba("#7a5a40", 0.4), 3);
  for (let i = 0; i < 40; i++) { const x = r() * 3000; p.poly([[x - 20, 300], [x, 220 - r() * 40], [x + 20, 300]], "#5f8f4a", 3); }
};
/** the iron grill fence (1997): one side, 3400 x 1300 (3.4 m x 1.3 m), base 1300; transparent between bars */
export const fenceSide = (p: KPen) => {
  p.ow = 5;
  const col = "#1f3a3c";
  for (let x = 40; x <= 3360; x += 110) {
    p.band([[x, 1300], [x, 120]], col, 16, 4);
    p.poly([[x - 22, 130], [x, 50], [x + 22, 130]], "#d6a542", 5);
  }
  for (const y of [200, 1180]) p.poly(rrect(20, y - 18, 3380, y + 18, 6), col, 5);
  for (let x = 95; x < 3360; x += 220) p.stroke(ellPts(x, 690, 55, 160, 0, 360, 0, 24), 10, col);
  for (const x of [20, 3380]) p.band([[x, 1300], [x, 80]], "#2a4a4c", 34, 5);
};
/** paving of the courtyard (texture) */
export const pavingPaint = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#cdb999"; g.fillRect(0, 0, 2048, 2048);
  const r = rngK(11);
  for (let y = 0; y < 2048; y += 64) for (let x = (y / 64) % 2 ? 0 : 48; x < 2048; x += 96 + Math.floor(r() * 40)) {
    g.fillStyle = mix("#d8c6a6", "#b9a383", r()); g.fillRect(x + 2, y + 2, 92, 60);
    g.strokeStyle = "rgba(16,34,43,0.22)"; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, 92, 60);
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = rgba("#5f8f4a", 0.35); g.fillRect(r() * 2048, r() * 2048, 6, 3); }
};
export const lawnPaint = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#8fb06a"; g.fillRect(0, 0, 1024, 1024);
  const r = rngK(5);
  for (let i = 0; i < 2500; i++) { g.fillStyle = rgba(r() < 0.5 ? "#6f9a52" : "#a9c47a", 0.5); g.fillRect(r() * 1024, r() * 1024, 4, 9); }
};
/** a flying kite / pigeon silhouette: 200 x 100 */
export const bird = (p: KPen, flap: number) => {
  const y = 50 + 26 * flap;
  p.stroke([[10, y], [60, 50 - 6 * flap], [100, 58], [140, 50 - 6 * flap], [190, y]], 12, "#2a3a3e");
};

// ================= the cannon =================
/** a field gun on a wooden carriage, side view, muzzle to the right: 1700 x 800, base 800; muzzle at (1640, 330) */
export const cannon = (p: KPen) => {
  p.ow = 8;
  // trail
  p.poly([[60, 760], [120, 700], [900, 420], [960, 480], [180, 790]], "#6a4428", 8);
  for (let x = 220; x < 880; x += 120) p.stroke([[x, 760 - (x - 120) * 0.42], [x + 40, 760 - (x - 80) * 0.42]], 4, rgba(INK, 0.4));
  // barrel (bronze, tapered, rings), tilted up a little
  const g = p.g; g.save(); g.translate(900, 420); g.rotate(-0.16);
  const bar: P2[] = [[-260, -95], [740, -55], [760, -70], [790, -70], [790, 70], [760, 70], [740, 55], [-260, 95]];
  p.poly(bar, p.lin(0, -95, 0, 95, [[0, "#6a4a1e"], [0.25, "#e2b35a"], [0.45, "#b8862e"], [1, "#4a3212"]]), 8);
  p.ell(-270, 0, 60, 98, "#8a6224", 7); p.ell(-340, 0, 40, 40, "#b8862e", 6);
  for (const x of [-120, 120, 420, 700]) p.stroke([[x, -88 + x * 0.04], [x, 88 - x * 0.04]], 12, rgba("#4a3212", 0.7));
  p.ell(790, 0, 18, 70, "#1a120a", 6);
  g.restore();
  // wheels
  for (const [x, rr] of [[880, 300]] as const) {
    p.ell(x, 800 - rr, rr, rr, null, 26); p.ell(x, 800 - rr, rr - 6, rr - 6, null, 0);
    p.g.lineWidth = 28; p.g.strokeStyle = "#7a5230"; p.g.beginPath(); p.g.arc(x, 800 - rr, rr - 14, 0, TAU); p.g.stroke();
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; p.band([[x, 800 - rr], [x + Math.cos(a) * (rr - 26), 800 - rr + Math.sin(a) * (rr - 26)]], "#8a6238", 16, 4); }
    p.ell(x, 800 - rr, 48, 48, "#4a3212", 7);
    p.ell(x, 800 - rr, rr, rr, null, 8);
  }
};
/** cannonball: 200 x 200 centred */
export const ball = (p: KPen) => { p.ell(100, 100, 80, 80, p.rad(75, 75, 90, [[0, "#8a8a84"], [0.4, "#3a3a38"], [1, "#151515"]]), 8); };

// ================= the forge (Gupta period) =================
/** back wall of the smithy: 4400 x 2400 (8.8 m x 4.8 m), base 2400; mud wall, thatch, hung tools, a night doorway */
export const forgeWall = (p: KPen) => {
  const g = p.g, r = rngK(21); p.ow = 9;
  g.fillStyle = p.lin(0, 0, 0, 2400, [[0, "#6a4a34"], [1, "#8a6444"]]); g.fillRect(0, 300, 4400, 2100);
  for (let i = 0; i < 400; i++) { g.fillStyle = rgba(r() < 0.5 ? "#5a3e2a" : "#9a7452", 0.35); g.beginPath(); g.ellipse(r() * 4400, 300 + r() * 2100, 20 + r() * 50, 10 + r() * 20, 0, 0, TAU); g.fill(); }
  // timber posts + beam
  for (const x of [200, 2200, 4200]) p.poly(rrect(x - 50, 300, x + 50, 2400, 6), p.lin(x - 50, 0, x + 50, 0, [[0, "#3a2616"], [0.4, "#6a4a2a"], [1, "#2e1e12"]]), 8);
  p.poly(rrect(0, 260, 4400, 360, 8), "#4a321e", 8);
  // thatch eave
  const th: P2[] = [[0, 0], [4400, 0], [4400, 220]]; for (let x = 4400; x >= 0; x -= 40) th.push([x, 260 + 30 * Math.sin(x * 0.05) + 20 * r()]); th.push([0, 240]);
  p.poly(th, p.lin(0, 0, 0, 280, [[0, "#8a6a2e"], [1, "#c8a050"]]), 8);
  for (let x = 0; x < 4400; x += 24) p.stroke([[x, 20], [x - 6, 250 + 20 * r()]], 3, rgba("#5a3e18", 0.5));
  // doorway to the night (village, stars)
  p.poly(rrect(2900, 900, 3600, 2400, 10), p.lin(0, 900, 0, 2400, [[0, "#173a48"], [1, "#24505a"]]), 9);
  for (let i = 0; i < 18; i++) p.dot(2930 + r() * 640, 930 + r() * 600, 3 + r() * 4, "#e8f2d8");
  p.poly([[2900, 2400], [2980, 2000], [3150, 2050], [3300, 1980], [3600, 2060], [3600, 2400]], "#1a3236", 0);
  // hung tools: tongs, hammers, a rack
  p.poly(rrect(600, 700, 1900, 740, 6), "#4a321e", 6);
  for (let k = 0; k < 6; k++) {
    const x = 700 + k * 200;
    if (k % 2) { p.band([[x, 740], [x - 20, 1180]], "#3a3a3c", 12, 3); p.band([[x, 740], [x + 22, 1180]], "#3a3a3c", 12, 3); }
    else { p.band([[x, 740], [x, 1120]], "#7a5230", 16, 4); p.poly(rrect(x - 50, 1100, x + 50, 1170, 8), "#3a3a3c", 6); }
  }
  // shelf with pots and ore baskets
  p.poly(rrect(300, 1500, 1500, 1540, 6), "#4a321e", 6);
  for (const [x, s] of [[420, 1], [620, 1.3], [820, 0.9], [1050, 1.1], [1300, 1]] as const) p.ell(x, 1500 - 60 * s, 70 * s, 62 * s, p.lin(x - 70, 0, x + 70, 0, [[0, "#8a4a2a"], [0.4, "#c8784a"], [1, "#6a3820"]]), 6);
};
/** clay shaft furnace with bellows mouth: 900 x 1500 (1.8 m x 3 m), base 1500; the glowing mouth at (450, 1250) */
export const furnace = (p: KPen, t: number) => {
  p.ow = 9;
  const pts: P2[] = [[60, 1500], [180, 300], [330, 120], [570, 120], [720, 300], [840, 1500]];
  p.poly(pts, p.lin(60, 0, 840, 0, [[0, "#6a3a22"], [0.35, "#b8704a"], [0.6, "#9a5a38"], [1, "#5a3020"]]), 9);
  p.clip(pts, () => { const r = rngK(4); for (let i = 0; i < 40; i++) p.stroke([[100 + r() * 700, 300 + r() * 1150], [140 + r() * 700, 320 + r() * 1150]], 4, rgba("#4a2414", 0.5)); for (let y = 450; y < 1450; y += 180) p.stroke([[80, y], [820, y + 20]], 5, rgba("#4a2414", 0.35)); });
  // top: smoke + glow
  p.ell(450, 125, 120, 30, "#2a1810", 7);
  p.glow(450, 120, 160, "#ff9a3c", 0.6 + 0.25 * Math.sin(t * 9));
  // mouth
  const m: P2[] = [[330, 1500], [330, 1260], ...curve([330, 1260], [450, 1120], [570, 1260], 12).slice(1), [570, 1500]];
  p.poly(m, p.rad(450, 1380, 200, [[0, "#fff4c0"], [0.35, "#ffc24a"], [0.7, "#ff7a2a"], [1, "#b8401a"]]), 8);
  p.glow(450, 1360, 300, "#ffb04a", 0.45);
  // tuyere pipes
  for (const s of [-1, 1]) p.band([[450 + s * 150, 1440], [450 + s * 380, 1470]], "#9a6a48", 40, 6);
};
/** bellows (two goatskin bags): 900 x 400, base 400; phase 0..1 pumps them alternately */
export const bellows = (p: KPen, ph: number) => {
  p.ow = 7;
  for (const [cx, k] of [[260, Math.sin(ph * TAU)], [640, -Math.sin(ph * TAU)]] as const) {
    const h = 150 + 50 * k;
    p.poly([[cx - 160, 390], ...curve([cx - 160, 390], [cx - 120, 390 - h * 1.6], [cx + 120, 390 - h * 0.7], 14).slice(1), [cx + 170, 360], [cx + 150, 395]], p.lin(cx - 160, 0, cx + 160, 0, [[0, "#6a4a2a"], [0.5, "#a07a4e"], [1, "#5a3a20"]]), 7);
    p.band([[cx - 140, 390 - h * 0.9], [cx - 60, 390 - h * 1.2]], "#d8c49a", 10, 3);
  }
};
/** stone anvil block with an iron face: 700 x 520, base 520 */
export const anvil = (p: KPen) => {
  p.ow = 8;
  p.poly([[120, 520], [160, 240], [540, 240], [580, 520]], p.lin(120, 0, 580, 0, [[0, "#5a5048"], [0.4, "#9a8e80"], [1, "#4a423c"]]), 8);
  p.poly([[60, 250], [100, 150], [620, 150], [660, 250]], p.lin(0, 150, 0, 250, [[0, "#6a6a6c"], [1, "#2a2a2c"]]), 8);
  p.stroke([[110, 160], [610, 160]], 6, rgba("#c8c8c0", 0.5));
};
/** a hot iron lump on the anvil (forge welding): 500 x 260, base 250; heat 0..1 */
export const bloom = (p: KPen, heat: number) => {
  p.ow = 7;
  p.glow(250, 160, 240, "#ffb04a", 0.5 * heat);
  const pts: P2[] = [[60, 250], [80, 150], [170, 90], [300, 95], [420, 140], [450, 250]];
  p.poly(pts, p.rad(250, 170, 220, [[0, mix("#5a4030", "#fff6c8", heat)], [0.4, mix("#4a3428", "#ffc85a", heat)], [1, mix("#2a2220", "#e8601a", heat)]]), 7);
  for (let i = 0; i < 5; i++) p.stroke([[110 + i * 60, 120 + (i % 2) * 20], [140 + i * 60, 240]], 4, rgba(INK, 0.35));
};
/** baskets: charcoal (k 0), iron ore (1), white lime (2): 500 x 360, base 360 */
export const basket = (p: KPen, k: number) => {
  p.ow = 7;
  const lump = k === 0 ? "#1f1f22" : k === 1 ? "#7a3a28" : "#f4f0e2", r = rngK(30 + k);
  for (let i = 0; i < 22; i++) p.ell(110 + r() * 280, 140 + r() * 70, 32 + r() * 18, 26 + r() * 10, mix(lump, k === 2 ? "#cfc8b4" : "#000000", r() * 0.35), 4);
  p.poly([[50, 160], [450, 160], [400, 360], [100, 360]], p.lin(50, 0, 450, 0, [[0, "#8a6a2e"], [0.4, "#d8b060"], [1, "#7a5a24"]]), 7);
  for (let y = 190; y < 350; y += 34) p.stroke([[60 + (y - 160) * 0.25, y], [440 - (y - 160) * 0.25, y]], 4, rgba("#5a3e18", 0.6));
};
/** packed-earth floor (texture) */
export const earthPaint = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#7a5a3e"; g.fillRect(0, 0, 1024, 1024);
  const r = rngK(9);
  for (let i = 0; i < 900; i++) { g.fillStyle = rgba(r() < 0.5 ? "#5a3e28" : "#9a7a58", 0.35); g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + r() * 18, 3 + r() * 8, 0, 0, TAU); g.fill(); }
  for (let i = 0; i < 160; i++) { g.fillStyle = rgba("#1a1412", 0.5); g.fillRect(r() * 1024, r() * 1024, 5, 4); }
};

// ================= macro: inside the metal =================
/** the cut-away iron block: 4000 x 1700 (4 m x 1.7 m), the surface line at y 420; grains, slag stringers */
export const SURF = 420;
export const metalBlock = (p: KPen) => {
  const g = p.g, r = rngK(44); p.ow = 8;
  const body: P2[] = [[0, 1700], [0, SURF], [4000, SURF], [4000, 1700]];
  p.poly(body, p.lin(0, SURF, 0, 1700, [[0, "#8a96a0"], [0.5, "#6a7882"], [1, "#4a5660"]]), 0);
  p.clip(body, () => {
    // grains (irregular polygons)
    for (let i = 0; i < 70; i++) {
      const cx = r() * 4000, cy = SURF + 30 + r() * 1300, rr = 90 + r() * 110, n = 6 + Math.floor(r() * 3), pts: P2[] = [];
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU + r() * 0.4; pts.push([cx + Math.cos(a) * rr * (0.8 + 0.3 * r()), cy + Math.sin(a) * rr * (0.7 + 0.3 * r())]); }
      p.poly(pts, mix("#7e8c96", "#a2acb2", r()), 3);
    }
    // slag stringers (dark, elongated)
    for (let i = 0; i < 26; i++) { const x = r() * 4000, y = SURF + 80 + r() * 1200, l = 120 + r() * 220; p.stroke([[x, y], [x + l * 0.5, y + 6], [x + l, y - 4]], 10 + r() * 8, "#2a3036"); }
    g.fillStyle = p.lin(0, SURF, 0, SURF + 260, [[0, "rgba(255,255,255,0.25)"], [1, "rgba(255,255,255,0)"]]); g.fillRect(0, SURF, 4000, 260);
  });
  p.stroke([[0, SURF], [4000, SURF]], 10);
};
/** rust bloom over the surface: 4000 x 900 card, its base at y 900 = the metal surface; k 0..1 grows the porous orange crust */
export const rustCrust = (p: KPen, k: number, calm: number) => {
  if (k <= 0.01) return;
  const r = rngK(55); p.ow = 6;
  for (let i = 0; i < 46; i++) {
    const x = (i + 0.5) * (4000 / 46) + (r() - 0.5) * 60, appear = r() * 0.6;
    const u = Math.max(0, Math.min(1, (k - appear) / 0.4)); if (u <= 0) continue;
    const h = (70 + r() * 150) * u * (1 - 0.5 * calm), w = 80 + r() * 60;
    const pts: P2[] = [[x - w, 900]]; for (let a = 0; a <= 12; a++) { const s = a / 12; pts.push([x - w + 2 * w * s, 900 - h * Math.sin(s * Math.PI) ** 0.6 * (0.85 + 0.25 * hash(i * 13 + a, 2))]); } pts.push([x + w, 900]);
    p.poly(pts, p.lin(0, 900 - h, 0, 900, [[0, "#f08a3a"], [0.5, "#c8582a"], [1, "#8a3a1e"]]), 6);
    for (let j = 0; j < 4; j++) p.ell(x - w * 0.5 + r() * w, 900 - h * (0.25 + 0.5 * r()), 12 + r() * 10, 9 + r() * 6, rgba("#4a1e10", 0.6), 0); // pores
  }
};
/** the protective film: thin, compact crystals hugging the surface (teal + sunflower), 4000 x 200 card, base 200; k 0..1 grows left to right */
export const film = (p: KPen, k: number, shimmer: number) => {
  if (k <= 0.01) return;
  const X = 4000 * Math.min(1, k * 1.05); p.ow = 4;
  const g = p.g;
  g.save(); g.beginPath(); g.rect(0, 0, X, 200); g.clip();
  for (let row = 0; row < 3; row++) for (let x = (row % 2) * 40; x < 4000; x += 80) {
    const y = 200 - 26 - row * 44, pts: P2[] = [];
    for (let a = 0; a < 6; a++) pts.push([x + 40 + Math.cos(a * Math.PI / 3) * 44, y + Math.sin(a * Math.PI / 3) * 24]);
    p.poly(pts, row === 0 ? "#1f6f6a" : row === 1 ? "#2f8f83" : "#5fb8a4", 4);
    if (hash(x, row) > 0.7) p.dot(x + 40, y, 7, PAL.sun);
  }
  if (shimmer > 0) { g.fillStyle = p.lin(X * shimmer - 400, 0, X * shimmer + 400, 0, [[0, "rgba(255,248,200,0)"], [0.5, "rgba(255,248,200,0.75)"], [1, "rgba(255,248,200,0)"]]); g.fillRect(0, 40, 4000, 160); }
  g.restore();
  p.stroke([[0, 200 - 132], [X, 200 - 132]], 6, rgba(INK, 0.8));
};
/** a phosphorus atom: 200 x 200, centred, a sunflower bead with a 'P' */
export const atomP = (p: KPen, font: string) => {
  p.glow(100, 100, 100, "#ffd36a", 0.8);
  p.ell(100, 100, 48, 48, p.rad(85, 85, 60, [[0, "#fff3b8"], [1, "#f2b632"]]), 7);
  p.g.fillStyle = INK; p.g.font = `800 64px ${font}`; p.g.textAlign = "center"; p.g.textBaseline = "middle"; p.g.fillText("P", 100, 104);
};
/** a raindrop: 120 x 180, centred */
export const drop = (p: KPen) => { p.poly([[60, 10], ...curve([60, 10], [130, 140], [60, 170], 10).slice(1), ...curve([60, 170], [-10, 140], [60, 10], 10).slice(1)], p.rad(48, 110, 70, [[0, "#e8fbff"], [1, "#6ac0d8"]]), 6); };
/** soft backdrop for the macro set: 4000 x 2600, base 2600 (bokeh rings, dark teal) */
export const macroBack = (p: KPen) => {
  const g = p.g, r = rngK(66);
  g.fillStyle = p.lin(0, 0, 0, 2600, [[0, "#0f3038"], [0.6, "#1d5a60"], [1, "#24686a"]]); g.fillRect(0, 0, 4000, 2600);
  for (let i = 0; i < 40; i++) { const x = r() * 4000, y = r() * 1800, rr = 40 + r() * 140; g.fillStyle = rgba(r() < 0.3 ? "#f2b632" : "#9fd8c4", 0.08 + r() * 0.1); g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
};

// ================= the lab =================
/** lab back wall: 3600 x 2400 (3.6 m x 2.4 m), base 2400; tiles, window, shelves, pillar poster + layer diagram */
export const labWall = (p: KPen) => {
  const g = p.g; p.ow = 7;
  g.fillStyle = "#dfeee8"; g.fillRect(0, 0, 3600, 2400);
  for (let y = 1500; y < 2400; y += 80) for (let x = 0; x < 3600; x += 80) { g.strokeStyle = "rgba(16,34,43,0.12)"; g.lineWidth = 2; g.strokeRect(x, y, 80, 80); }
  g.fillStyle = "#cfe3dc"; g.fillRect(0, 1500, 3600, 900);
  // window
  p.poly(rrect(2300, 250, 3350, 1250, 10), p.lin(0, 250, 0, 1250, [[0, "#a8d8e8"], [1, "#e8f4ea"]]), 9);
  p.poly([[2300, 1250], [2450, 1000], [2700, 1080], [2950, 900], [3350, 1050], [3350, 1250]], "#8fb06a", 0);
  p.stroke([[2825, 250], [2825, 1250]], 14); p.stroke([[2300, 750], [3350, 750]], 14);
  p.poly(rrect(2300, 250, 3350, 1250, 10), null, 9);
  // poster: the pillar
  p.poly(rrect(250, 300, 900, 1250, 8), "#fbf4e2", 7);
  g.fillStyle = "#c6e2e6"; g.fillRect(290, 340, 570, 860);
  p.poly([[560, 1180], [565, 520], [545, 480], [555, 440], [615, 440], [625, 480], [605, 520], [610, 1180]], "#3e3a36", 5);
  g.fillStyle = "#cdb999"; g.fillRect(290, 1180, 570, 20);
  // poster: the layers diagram (metal | film | air)
  p.poly(rrect(1000, 300, 1700, 1250, 8), "#fbf4e2", 7);
  g.fillStyle = "#7e8c96"; g.fillRect(1050, 900, 600, 300);
  g.fillStyle = "#2f8f83"; g.fillRect(1050, 840, 600, 60);
  g.fillStyle = "#f2b632"; for (let x = 1080; x < 1650; x += 70) { g.beginPath(); g.arc(x, 870, 12, 0, TAU); g.fill(); }
  for (let i = 0; i < 6; i++) { const x = 1100 + i * 95; p.poly([[x, 420], [x + 18, 470], [x, 490], [x - 18, 470]], "#6ac0d8", 4); p.stroke([[x, 520], [x + 20 - i * 6, 800]], 4, rgba("#6ac0d8", 0.8)); }
  // shelves with flasks
  p.poly(rrect(1850, 1350, 3500, 1390, 6), "#a87a4e", 6);
  for (const [x, c, s] of [[1950, "#9fd8c4", 1], [2150, "#f2b632", 0.8], [2350, "#e8643a", 0.9], [2600, "#2f8f83", 1.1], [2900, "#9fd8c4", 0.85], [3200, "#f6ecd2", 1]] as const) {
    p.poly([[x - 20 * s, 1350], [x - 20 * s, 1250 - 40 * s], [x - 60 * s, 1350]], null, 0);
    p.poly([[x - 70 * s, 1350], [x - 25 * s, 1230], [x - 25 * s, 1150 - 30 * s], [x + 25 * s, 1150 - 30 * s], [x + 25 * s, 1230], [x + 70 * s, 1350]], rgba("#e8f4f2", 0.9), 6);
    p.poly([[x - 60 * s, 1345], [x - 30 * s, 1270], [x + 30 * s, 1270], [x + 60 * s, 1345]], c, 0);
  }
};
/** lab bench: 2600 x 950 (2.6 m x 0.95 m), base 950; top at y 120 */
export const bench = (p: KPen) => {
  p.ow = 8;
  p.poly(rrect(0, 100, 2600, 170, 8), "#2a4a4c", 8);
  p.poly(rrect(40, 170, 2560, 950, 6), "#f2efe4", 8);
  for (const x of [80, 900, 1720]) { p.poly(rrect(x, 230, x + 800, 520, 8), "#e6e2d4", 6); p.poly(rrect(x + 350, 350, x + 450, 380, 10), "#b8b2a2", 4); p.poly(rrect(x, 580, x + 800, 900, 8), "#e6e2d4", 6); }
};
/** microscope: 500 x 700, base 700 */
export const microscope = (p: KPen) => {
  p.ow = 7;
  p.poly(rrect(60, 600, 440, 700, 20), "#e8ece8", 7);
  p.poly([[250, 620], [300, 300], [360, 320], [320, 630]], "#e8ece8", 7);
  p.poly(rrect(120, 470, 380, 510, 8), "#2a3a40", 6);
  p.poly([[140, 360], [280, 120], [330, 150], [200, 390]], "#2f8f83", 7);
  p.poly(rrect(250, 60, 340, 140, 10), "#2a3a40", 6);
  p.poly(rrect(130, 360, 200, 470, 8), "#c8cfcc", 6);
};
/** a laptop showing a rising-then-flat corrosion curve: 700 x 520, base 520 */
export const laptop = (p: KPen) => {
  p.ow = 7;
  p.poly([[20, 520], [80, 440], [620, 440], [680, 520]], "#9aa6a8", 7);
  p.poly(rrect(90, 40, 610, 440, 14), "#2a3a40", 7);
  p.poly(rrect(120, 70, 580, 410, 8), "#f6f8f0", 0);
  p.stroke([[150, 380], [560, 380]], 4, "#5a6a6e"); p.stroke([[150, 380], [150, 100]], 4, "#5a6a6e");
  p.stroke([[150, 380], [220, 230], [290, 180], [380, 168], [470, 162], [560, 160]], 8, "#e8643a");
  p.stroke([[150, 160], [560, 160]], 3, rgba("#2f8f83", 0.6));
};
export const labFloorPaint = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#b8cfc8"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) { g.fillStyle = (x + y) % 128 ? "#c4d8d0" : "#aac4bc"; g.fillRect(x, y, 64, 64); }
};
export const sparkle = (p: KPen) => {
  p.glow(64, 64, 64, "#fff3b8", 0.8);
  p.poly([[64, 6], [74, 54], [122, 64], [74, 74], [64, 122], [54, 74], [6, 64], [54, 54]], "#fff6c8", 4);
};
void shade;
/** the cannon seen from behind (3/4 rear): 1000 x 900, base 900; the barrel recedes to the muzzle at (520, 170) */
export const cannonRear = (p: KPen) => {
  p.ow = 8;
  // trail on the ground toward the viewer
  p.poly([[420, 900], [600, 900], [560, 560], [470, 560]], p.lin(420, 0, 600, 0, [[0, "#5a3a22"], [0.5, "#8a6238"], [1, "#4a2e1a"]]), 8);
  // wheels (seen at an angle: ellipses)
  for (const [cx, s] of [[150, -1], [870, 1]] as const) {
    p.ell(cx, 600, 120, 280, "#7a5230", 9); p.ell(cx, 600, 92, 245, null, 6);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; p.band([[cx, 600], [cx + Math.cos(a) * 90, 600 + Math.sin(a) * 240]], "#9a7046", 12, 3); }
    p.ell(cx, 600, 30, 50, "#3a2614", 6); void s;
  }
  // axle + cheeks
  p.band([[150, 600], [870, 600]], "#3a2a1a", 34, 6);
  p.poly([[300, 640], [380, 420], [460, 420], [440, 640]], "#6a4428", 7); p.poly([[580, 640], [560, 420], [640, 420], [720, 640]], "#6a4428", 7);
  // barrel: breech big and near, muzzle small and far (bronze)
  p.poly([[380, 520], [470, 190], [570, 190], [660, 520]], p.lin(380, 0, 660, 0, [[0, "#5a3e16"], [0.35, "#e2b35a"], [0.55, "#b8862e"], [1, "#4a3212"]]), 8);
  for (const y of [440, 330, 240]) { const w = 140 - (520 - y) * 0.28; p.stroke([[520 - w, y], [520 + w, y]], 10, "rgba(74,50,18,0.75)"); }
  p.ell(520, 525, 145, 70, p.rad(500, 510, 150, [[0, "#d8a84a"], [1, "#6a4a1e"]]), 8);
  p.ell(520, 560, 40, 34, "#b8862e", 6);
  p.ell(520, 190, 52, 18, "#1a120a", 6);
};

/** a label tag drawn into the macro scene: 700 x 180, centred; a cream pill with ink text and a pointer stub on the left */
export const tag = (p: KPen, text: string, col: string, font: string) => {
  p.ow = 6;
  p.poly(rrect(60, 30, 690, 150, 60), "#fff4dc", 7);
  p.ell(110, 90, 28, 28, col, 6);
  p.poly([[0, 90], [62, 70], [62, 110]], "#fff4dc", 0); p.stroke([[0, 90], [60, 72]], 6); p.stroke([[0, 90], [60, 108]], 6);
  p.g.fillStyle = INK; p.g.font = `800 92px ${font}`; p.g.textAlign = "left"; p.g.textBaseline = "middle"; p.g.fillText(text, 160, 98);
};
/** a water bead sitting on the film (round, shiny): 200 x 140, base 140 */
export const bead = (p: KPen) => {
  p.poly([[10, 140], ...curve([10, 140], [20, -20], [190, 140], 16).slice(1)].map(([x, y]) => [x, Math.max(y, 20)] as P2), p.rad(80, 70, 110, [[0, "#f2fdff"], [0.6, "#9fdcec"], [1, "#4aa8c4"]]), 6);
  p.ell(70, 70, 22, 14, "#ffffff", 0);
};
/** a rain streak: 40 x 400, centred */
export const streak = (p: KPen) => { p.stroke([[20, 10], [20, 390]], 10, rgba("#e8f6ff", 0.75)); };
