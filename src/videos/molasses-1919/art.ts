// Molasses 1919 art: painted textures for the North End set (red-brick tenement bays with sash windows, shop fronts with
// awnings, cobbles, granite kerb, tar roofs, the riveted steel tank in grey / leaking / brown, the glossy molasses surface
// and its highlight map, office panelling and floor boards) and flat ink effect cards (molasses splash and drips, planks,
// barrels, the flat cap on the flood, the kid's tin can, a thermometer, a thickening blob, a balance-scale jar, a paint
// brush, a paint bucket, an engineering plan with a seal, the seal ring, an El train car, a far Boston skyline with masts).
// No readable text anywhere. Everything is seeded (rng / index), never random, and a pure function of its arguments.
import { Pen } from "../tunguska/toon";
import { ctex, rng } from "../tunguska/paint";
import { KPen, PAL, rgba, shade, tint, mix, ellPts, rrect, TAU, type P2 } from "../../engine/kit/core";
import { star } from "../../engine/kit/people";

const K = (p: Pen, ow = 7) => new KPen(p.g, PAL.ink, ow);
const INKC = "#10222b";
const blot = (g: CanvasRenderingContext2D, x: number, y: number, rr: number, col: string) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
};
/** molasses colours: deep amber-brown body, warm mid, glossy amber highlight */
export const MOL = { deep: "#2a1306", body: "#4a220b", mid: "#7a3a12", warm: "#a8561a", hi: "#e7a24a", gloss: "#fff0c8" };

// ---------------- textures ----------------
const BRICKS = ["#9a4a32", "#a8583a", "#8a3e2c", "#b0603e", "#93503a", "#7e3a2a"];
const TRIMS = ["#2f5f4a", "#1f3a4a", "#5a3a2a", "#2a4a5a", "#6a2a2a", "#3a4a3a"];
const bricks = (g: CanvasRenderingContext2D, r: () => number, base: string, w = 512, h = 512) => {
  g.fillStyle = shade(base, 0.62); g.fillRect(0, 0, w, h);
  for (let y = 0, row = 0; y < h; y += 16, row++) for (let x = -(row % 2) * 18; x < w; x += 36) {
    g.fillStyle = mix(base, r() > 0.5 ? "#e8b48c" : "#4a1e14", 0.18 * r()); g.fillRect(x + 1.5, y + 1.5, 33, 13);
  }
  for (let i = 0; i < 10; i++) blot(g, r() * w, r() * h, 50 + r() * 80, r() > 0.5 ? "rgba(255,230,200,0.10)" : "rgba(40,20,10,0.14)");
};
/** one tenement bay (3.2 m x 3.2 m, one floor): brick, a tall sash window with a stone lintel and sill, a cornice band */
export const brickBay = (k: number) => ctex("mlBrick" + k, 512, 512, (g, r) => {
  const base = BRICKS[k % BRICKS.length], trim = TRIMS[(k * 5 + 1) % TRIMS.length];
  bricks(g, r, base);
  g.fillStyle = "#d9cfb8"; g.fillRect(0, 488, 512, 24); g.fillStyle = INKC; g.fillRect(0, 486, 512, 4);
  const pair = k % 3 === 2;
  const wins: [number, number][] = pair ? [[96, 236], [276, 416]] : [[166, 346]];
  for (const [x0, x1] of wins) {
    const y0 = 130, y1 = 420, lit = r() < 0.25;
    g.fillStyle = "#e6dcc4"; g.fillRect(x0 - 18, y0 - 34, x1 - x0 + 36, 30); g.strokeStyle = INKC; g.lineWidth = 5; g.strokeRect(x0 - 18, y0 - 34, x1 - x0 + 36, 30);
    g.fillStyle = trim; g.fillRect(x0 - 8, y0 - 4, x1 - x0 + 16, y1 - y0 + 8);
    const glass = lit ? "#f6d79a" : "#2c3e48";
    for (const [a, b] of [[y0 + 6, (y0 + y1) / 2 - 4], [(y0 + y1) / 2 + 4, y1 - 6]]) {
      g.fillStyle = glass; g.fillRect(x0 + 6, a, x1 - x0 - 12, b - a);
      g.fillStyle = trim; g.fillRect((x0 + x1) / 2 - 3, a, 6, b - a);
      if (!lit) { g.fillStyle = "rgba(190,220,235,0.35)"; g.beginPath(); g.moveTo(x0 + 14, b - 10); g.lineTo(x0 + 40, a + 8); g.lineTo(x0 + 56, a + 8); g.lineTo(x0 + 30, b - 10); g.fill(); }
    }
    if (r() < 0.5) { g.fillStyle = mix("#f2ead8", "#c8a070", r() * 0.5); g.fillRect(x0 + 6, y0 + 6, x1 - x0 - 12, 40 + r() * 50); } // a half-drawn blind
    g.strokeStyle = INKC; g.lineWidth = 6; g.strokeRect(x0 - 8, y0 - 4, x1 - x0 + 16, y1 - y0 + 8);
    g.fillStyle = "#d9cfb8"; g.fillRect(x0 - 16, y1 + 4, x1 - x0 + 32, 18); g.lineWidth = 4; g.strokeRect(x0 - 16, y1 + 4, x1 - x0 + 32, 18);
  }
  // a fire-escape hint on some bays: railings + slats
  if (k % 4 === 1) {
    g.fillStyle = "#1e2428"; g.fillRect(40, 440, 432, 8); for (let x = 44; x < 470; x += 22) g.fillRect(x, 400, 4, 44); g.fillRect(40, 398, 432, 5);
  }
  for (let i = 0; i < 5; i++) { const x = r() * 512; g.fillStyle = "rgba(40,24,16,0.12)"; g.fillRect(x, 430, 8 + r() * 10, 80); }
});
/** ground-floor shop / saloon bay (3.2 x 3.2 m): wooden shop front, big window with goods, awning stub, a door */
export const shopBay = (k: number) => ctex("mlShop" + k, 512, 512, (g, r) => {
  bricks(g, r, BRICKS[(k + 2) % BRICKS.length]);
  const wood = ["#2f5f4a", "#6a2a2a", "#1f3a4a", "#5a4a2a"][k % 4];
  g.fillStyle = wood; g.fillRect(30, 150, 452, 362);
  g.fillStyle = "#2a2622"; g.fillRect(56, 190, 250, 230);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) { g.fillStyle = [PAL.sun, "#c8823a", "#f2ead8", "#8a3a2a", "#3f7a5a"][(i * 6 + j + k) % 5]; g.fillRect(70 + j * 38, 300 + i * 38, 26, 28); }
  g.fillStyle = "rgba(200,225,235,0.3)"; g.beginPath(); g.moveTo(70, 400); g.lineTo(130, 200); g.lineTo(170, 200); g.lineTo(110, 400); g.fill();
  g.fillStyle = shade(wood, 0.6); g.fillRect(340, 190, 110, 322); g.fillStyle = "#3a5a6a"; g.fillRect(356, 210, 78, 110);
  g.fillStyle = PAL.brass; g.beginPath(); g.arc(426, 380, 7, 0, TAU); g.fill();
  g.strokeStyle = INKC; g.lineWidth = 6; g.strokeRect(56, 190, 250, 230); g.strokeRect(340, 190, 110, 322); g.strokeRect(30, 150, 452, 362);
  const ac = ["#2f6f5a", "#a03a2a", "#c8823a", "#2f4f6a"][k % 4];
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f2ead8" : ac; g.fillRect(20 + i * 59, 90, 59, 56); }
  g.strokeRect(20, 90, 472, 56);
  g.fillStyle = "#e6dcc4"; g.fillRect(40, 156, 432, 26); g.strokeRect(40, 156, 432, 26); // blank sign board (no text)
});
/** street cobbles (granite setts) with a worn centre, 3 m tile */
export const cobbleTex = () => ctex("mlCobble", 1024, 1024, (g, r) => {
  g.fillStyle = "#6f6a62"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0, row = 0; y < 1024; y += 40, row++) for (let x = -(row % 2) * 30; x < 1024; x += 60) {
    g.fillStyle = mix("#9a948a", r() > 0.5 ? "#c4bcae" : "#5a5650", 0.35 * r());
    g.beginPath(); g.ellipse(x + 30, y + 20, 27, 17, 0, 0, TAU); g.fill();
  }
  for (let i = 0; i < 10; i++) blot(g, r() * 1024, r() * 1024, 80, "rgba(30,28,26,0.18)");
});
/** sidewalk slabs (granite / brick paving), 4 m tile */
export const walkTex = () => ctex("mlWalk", 1024, 1024, (g, r) => {
  g.fillStyle = "#8a8378"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0, row = 0; y < 1024; y += 128, row++) for (let x = -(row % 2) * 64; x < 1024; x += 128) { g.fillStyle = mix("#aaa293", r() > 0.5 ? "#cfc7b6" : "#6f685e", 0.3 * r()); g.fillRect(x + 4, y + 4, 120, 120); }
  for (let i = 0; i < 10; i++) blot(g, r() * 1024, r() * 1024, 60, "rgba(30,28,26,0.16)");
});
/** flat tar roof / parapet stone */
export const roofTex = (k: number) => ctex("mlRoof" + k, 256, 256, (g, r) => {
  g.fillStyle = ["#4a4642", "#5a524a", "#3e3a38"][k % 3]; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) blot(g, r() * 256, r() * 256, 40, "rgba(0,0,0,0.2)");
});
/** plain colour with faint vertical lines (planks, panels) */
export const plainTex = (key: string, col: string, lines = "rgba(0,0,0,0.12)", step = 64) => ctex("mlPlain" + key, 256, 256, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  g.fillStyle = lines; for (let x = 0; x < 256; x += step) g.fillRect(x, 0, 4, 256);
});
/** riveted steel plate courses of the tank: kind 0 grey (1915), 1 grey with brown leak streaks, 2 painted brown (1919).
 *  One tile = 8 m around x 3 m high (one plate course); seams + rivet rows; u wraps around the tank */
export const tankTex = (kind: number) => ctex("mlTank" + kind, 1024, 384, (g, r) => {
  const base = kind === 2 ? "#4e2c18" : "#8e9696";
  g.fillStyle = base; g.fillRect(0, 0, 1024, 384);
  for (let i = 0; i < 4; i++) { const x = i * 256; g.fillStyle = mix(base, r() > 0.5 ? "#ffffff" : "#000000", 0.05 + 0.05 * r()); g.fillRect(x + 6, 10, 244, 364); }
  // vertical sheen bands (cylinder shading hint, very soft)
  for (let i = 0; i < 6; i++) blot(g, r() * 1024, 190, 160, kind === 2 ? "rgba(60,25,10,0.18)" : "rgba(40,50,55,0.15)");
  g.fillStyle = shade(base, 0.55);
  g.fillRect(0, 0, 1024, 7); g.fillRect(0, 377, 1024, 7);
  for (let x = 0; x < 1024; x += 256) g.fillRect(x, 0, 6, 384);
  const riv = tint(base, 0.35), rivD = shade(base, 0.5);
  for (const y of [18, 366]) for (let x = 8; x < 1024; x += 16) { g.fillStyle = rivD; g.beginPath(); g.arc(x + 1, y + 1, 4, 0, TAU); g.fill(); g.fillStyle = riv; g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill(); }
  for (let x = 0; x < 1024; x += 256) for (const dx of [-10, 14]) for (let y = 30; y < 360; y += 18) { g.fillStyle = rivD; g.beginPath(); g.arc(x + dx + 1, y + 1, 4, 0, TAU); g.fill(); g.fillStyle = riv; g.beginPath(); g.arc(x + dx, y, 3.5, 0, TAU); g.fill(); }
  if (kind === 1) {
    // brown molasses streaks running down from the seams and rivet rows
    for (let i = 0; i < 26; i++) {
      const x = (Math.floor(r() * 4) * 256 + (r() < 0.6 ? (r() - 0.5) * 30 : r() * 256)) % 1024, y0 = r() < 0.5 ? 14 : r() * 200, L = 60 + r() * 300, w = 4 + r() * 9;
      const gr = g.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, "rgba(90,40,12,0.95)"); gr.addColorStop(0.8, "rgba(110,52,16,0.75)"); gr.addColorStop(1, "rgba(110,52,16,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y0); g.lineTo(x + w / 2, y0); g.lineTo(x + w * 0.3, y0 + L); g.lineTo(x - w * 0.3, y0 + L); g.fill();
      g.fillStyle = "rgba(70,30,10,0.95)"; g.beginPath(); g.ellipse(x, y0 + L * 0.85, w * 0.45, w * 0.7, 0, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,210,150,0.35)"; g.fillRect(x - w * 0.25, y0 + 4, Math.max(1.5, w * 0.18), L * 0.6);
    }
  }
});
/** the molasses surface albedo (512 x 512; v runs down the flow): deep amber-brown, soft long flow bands, a few dark folds */
export const molTex = () => ctex("mlMol4", 512, 512, (g, r) => {
  g.fillStyle = "#a4561c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14; i++) {
    const x = r() * 512, a = 3 + r() * 6, w = 14 + r() * 40;
    g.strokeStyle = r() > 0.5 ? rgba("#c06a24", 0.35) : rgba("#5a2408", 0.3); g.lineWidth = w; g.lineCap = "round";
    g.beginPath(); for (let y = -20; y <= 532; y += 16) { const xx = x + a * Math.sin((y / 512) * TAU + i); if (y < 0) g.moveTo(xx, y); else g.lineTo(xx, y); } g.stroke();
  }
  for (let i = 0; i < 6; i++) blot(g, r() * 512, r() * 512, 80 + r() * 60, "rgba(30,12,4,0.22)");
});
/** gloss map for the molasses (emissive): black with long soft highlight streaks along the flow (the "wet syrup" shine) */
export const molGloss = () => ctex("mlGloss2", 512, 512, (g, r) => {
  g.fillStyle = "#000000"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 11; i++) {
    const x = r() * 512, y0 = r() * 380, L = 80 + r() * 260, w = 3 + r() * 8;
    const gr = g.createLinearGradient(0, y0, 0, y0 + L); gr.addColorStop(0, "rgba(255,200,130,0)"); gr.addColorStop(0.5, `rgba(255,${200 + Math.floor(r() * 40)},150,${(0.5 + 0.45 * r()).toFixed(2)})`); gr.addColorStop(1, "rgba(255,200,130,0)");
    g.strokeStyle = gr; g.lineWidth = w; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x - 6 + r() * 12, y0 + L / 2, x + (r() - 0.5) * 14, y0 + L); g.stroke();
  }
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,236,200,${(0.5 + 0.5 * r()).toFixed(2)})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 1.5 + r() * 2.5, 2 + r() * 5, 0, 0, TAU); g.fill(); }
});
/** office: dark wood wainscot under a cream plaster wall, picture rail */
export const officeWall = () => ctex("mlOffice", 512, 512, (g, r) => {
  g.fillStyle = "#e3d6b6"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) blot(g, r() * 512, r() * 300, 80, "rgba(120,90,50,0.08)");
  g.fillStyle = "#5a3a22"; g.fillRect(0, 300, 512, 212);
  for (let x = 0; x < 512; x += 128) { g.fillStyle = "#6e4a2c"; g.fillRect(x + 14, 322, 100, 170); g.strokeStyle = INKC; g.lineWidth = 4; g.strokeRect(x + 14, 322, 100, 170); }
  g.fillStyle = "#3a2414"; g.fillRect(0, 292, 512, 12); g.fillRect(0, 60, 512, 8);
});
export const floorTex = () => ctex("mlFloor", 512, 512, (g, r) => {
  g.fillStyle = "#7a5232"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) { g.fillStyle = mix("#8a6040", r() > 0.5 ? "#a87a50" : "#5a3a22", 0.4 * r()); g.fillRect(0, y + 2, 512, 28); g.fillStyle = "rgba(20,12,6,0.5)"; g.fillRect(r() * 512, y, 3, 32); }
});
/** explainer backdrop: soft teal / frosty gradient with a faint grid of dots */
export const backdropTex = (cold: number) => ctex("mlBack" + cold, 512, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, cold ? "#cfe6ee" : "#2f8f83"); gr.addColorStop(1, cold ? "#7fb2c4" : "#1f5f66");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = cold ? "rgba(255,255,255,0.35)" : "rgba(255,244,220,0.12)";
  for (let y = 16; y < 512; y += 32) for (let x = 16; x < 512; x += 32) { g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill(); }
});

// ---------------- effect cards ----------------
/** a thick molasses splash crown (600 x 400, base y 380), t 0..1: heavy blobs rising and falling back, glossy */
export const fxMolSplash = (p: Pen, t: number, seed: number) => {
  const k = K(p, 7), r = rng(seed + 11), up = Math.sin(Math.min(1, t) * Math.PI);
  const pts: P2[] = [];
  for (let i = 0; i <= 12; i++) { const h = (i % 2 ? 210 : 110) * up * (0.6 + 0.4 * r()); pts.push([40 + (520 * i) / 12, 380 - h]); }
  if (up > 0.03) {
    k.poly([...pts, [560, 390], [40, 390]], k.lin(0, 140, 0, 390, [[0, MOL.warm], [0.5, MOL.mid], [1, MOL.body]]));
    for (let i = 1; i < 12; i += 2) k.stroke([[pts[i][0] - 6, pts[i][1] + 16], [pts[i][0] - 2, pts[i][1] + 60 * up]], 6, rgba(MOL.gloss, 0.7));
  }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * (0.15 + 0.7 * r()), sp = 160 + 200 * r(), x = 300 + Math.cos(a) * sp * t * 1.4, y = 360 + Math.sin(a) * sp * t * 1.6 + 420 * t * t, rr = 12 + 16 * r();
    if (t > 0.05 && y < 392) { k.ell(x, y, rr, rr * 1.2, MOL.mid, 5); k.dot(x - rr * 0.35, y - rr * 0.4, rr * 0.25, rgba(MOL.gloss, 0.85)); }
  }
};
/** a broken wooden plank tumbling (320 x 110) */
export const fxPlank = (p: Pen, seed: number) => {
  const k = K(p, 7), c = seed % 2 ? "#a8744a" : "#8a6a4a";
  k.poly([[14, 34], [290, 28], [306, 52], [296, 80], [20, 78]], c);
  k.stroke([[40, 48], [150, 46], [270, 52]], 4, shade(c, 0.6)); k.stroke([[60, 64], [200, 66], [284, 62]], 4, shade(c, 0.6));
  k.dot(36, 56, 5, INKC); k.dot(270, 54, 5, INKC);
  k.poly([[150, 78], [190, 80], [180, 96], [160, 90]], rgba(MOL.mid, 0.95), 4); // a drip of syrup on it
};
/** a wooden barrel with iron hoops (300 x 360) */
export const fxBarrel = (p: Pen, seed: number) => {
  const k = K(p, 8), c = seed % 2 ? "#9a6a3a" : "#7a5230";
  const body: P2[] = [[70, 30], [230, 30], [262, 180], [230, 330], [70, 330], [38, 180]];
  k.poly(body, k.lin(40, 0, 260, 0, [[0, shade(c, 0.75)], [0.4, tint(c, 0.15)], [1, shade(c, 0.6)]]));
  for (const y of [70, 290]) k.band([[52, y], [248, y]], "#3a3a3a", 14, 3);
  for (const x of [110, 150, 190]) k.stroke([[x, 34], [x + (x - 150) * 0.15, 180], [x, 326]], 3, shade(c, 0.55));
};
/** a man's flat cap lying on the molasses surface, seen from above at a slant (400 x 260) */
export const fxCap = (p: Pen) => {
  const k = K(p, 7);
  k.ell(200, 150, 190, 90, rgba(MOL.deep, 0.0), 0);
  k.ell(205, 168, 175, 70, rgba(MOL.deep, 0.55), 0);             // wake ring in the syrup
  k.poly(ellPts(190, 130, 140, 78, 0, 360, -0.08, 36), k.lin(60, 0, 330, 0, [[0, "#5a5a52"], [0.5, "#7a786c"], [1, "#4a4a44"]]));
  k.poly([[300, 120], [370, 140], [360, 172], [290, 160]], "#3e3e38");    // the peak
  k.pattern(ellPts(190, 130, 130, 70, 0, 360, -0.08, 36), "checks", "rgba(30,30,28,0.35)", 1.2);
  k.stroke([[110, 110], [250, 100]], 4, "rgba(20,20,20,0.5)");
  k.ell(190, 128, 12, 7, "#3e3e38", 3);
  k.stroke([[80, 190], [140, 200], [230, 198]], 6, rgba(MOL.gloss, 0.6));
};
/** the kid's small tin can (200 x 240, base y 230), fill 0..1 of brown syrup visible at the rim */
export const fxCan = (p: Pen, fill: number) => {
  const k = K(p, 7);
  k.poly([[40, 60], [160, 60], [160, 220], [40, 220]], k.lin(40, 0, 160, 0, [[0, "#8a9494"], [0.35, "#d8e0e0"], [1, "#6a7474"]]));
  for (const y of [100, 140, 180]) k.stroke([[42, y], [158, y]], 3, "rgba(30,40,40,0.4)");
  k.ell(100, 60, 60, 16, fill > 0.05 ? MOL.mid : "#4a5454", 6);
  if (fill > 0.05) k.dot(84, 56, 5, rgba(MOL.gloss, 0.8));
  k.ell(100, 220, 60, 12, null, 6);
  k.stroke([[40, 70], [10, 30], [100, 10], [190, 30], [160, 70]], 5, INKC); // wire handle
};
/** a single falling molasses drop (80 x 140) and a drip hanging from a seam (len 0..1) */
export const fxDrop = (p: Pen) => { const k = K(p, 5); k.poly([[40, 10], [62, 80], [56, 120], [24, 120], [18, 80]], MOL.mid); k.dot(32, 84, 6, rgba(MOL.gloss, 0.85)); };
export const fxDrip = (p: Pen, len: number) => {
  const k = K(p, 5), L = 30 + 200 * len;
  k.poly([[30, 0], [50, 0], [46, L * 0.8], [58, L], [40, L + 22], [22, L], [34, L * 0.8]], MOL.mid);
  k.stroke([[37, 6], [37, L * 0.75]], 3, rgba(MOL.gloss, 0.7));
};
/** a big mercury thermometer with a scale (no numbers): level 0..1, frost 0..1 (300 x 1000) */
export const fxThermo = (p: Pen, level: number, frost: number) => {
  const k = K(p, 9);
  k.poly(rrect(70, 30, 230, 860, 70), "#f2ead8");
  for (let i = 0; i < 15; i++) { const y = 120 + i * 46; k.stroke([[86, y], [i % 2 ? 120 : 140, y]], 6, INKC); }
  k.poly(rrect(130, 80, 170, 860, 20), "#ffffff", 6);
  const top = 820 - 700 * level;
  k.poly(rrect(136, top, 164, 880, 12), "#d8323a", 0);
  k.ell(150, 900, 72, 72, "#d8323a"); k.dot(128, 878, 14, "rgba(255,255,255,0.6)");
  k.stroke([[140, top + 10], [140, 860]], 5, "rgba(255,200,200,0.7)");
  if (frost > 0.02) for (let i = 0; i < 9; i++) {
    const x = 70 + (i % 3) * 80 + 20, y = 60 + Math.floor(i / 3) * 280 + (i % 2) * 90, s = 24 * frost;
    for (let a = 0; a < 3; a++) { const an = (a * Math.PI) / 3; k.stroke([[x - Math.cos(an) * s, y - Math.sin(an) * s], [x + Math.cos(an) * s, y + Math.sin(an) * s]], 4, rgba("#ffffff", 0.9 * frost)); }
  }
};
/** a spoon / ledge with a molasses blob: flow 1 = long runny strand, 0 = stiff glossy lump (600 x 700) */
export const fxBlob = (p: Pen, flow: number, t: number) => {
  const k = K(p, 8);
  k.poly([[520, 160], [548, 160], [548, 680], [520, 680]], "#8fa2a8");            // the stand
  k.poly(rrect(440, 676, 590, 700, 8), "#6f8288");
  k.poly([[40, 120], [560, 120], [560, 160], [40, 160]], "#c9d8dc");             // a steel ledge
  k.poly([[40, 160], [560, 160], [540, 180], [60, 180]], "#8fa2a8");
  const L = 40 + 420 * flow, wob = 6 * Math.sin(t * 3) * flow, cx = 300;
  const lump = ellPts(cx, 150, 150, 60 + 40 * (1 - flow), 0, 180, 0, 20);
  const strand: P2[] = [[cx + 60, 180], [cx + 26 + wob, 180 + L * 0.6], [cx + 34 + wob, 180 + L], [cx + 8 + wob, 200 + L + 30 * flow], [cx - 22 + wob, 180 + L], [cx - 16 + wob, 180 + L * 0.6], [cx - 60, 180]];
  k.poly([...lump.map(([x, y]) => [x, y] as P2), ...strand.reverse()], k.lin(0, 100, 0, 250 + L, [[0, MOL.warm], [0.4, MOL.mid], [1, MOL.body]]));
  k.stroke([[cx - 90, 170], [cx - 30, 196 - 20 * (1 - flow)]], 9, rgba(MOL.gloss, 0.75));
  k.stroke([[cx - 6 + wob, 220], [cx - 4 + wob, 160 + L * 0.8]], 6, rgba(MOL.gloss, 0.55 * flow));
  if (flow < 0.6) { k.dot(cx - 50, 170, 10, rgba("#ffffff", 0.9)); star(k, cx + 70, 140, 26 * (1 - flow), "#ffffff"); }
};
/** a glass jar (300 x 420, base y 410) of water (kind 0) or molasses (kind 1), lid, gloss */
export const fxJar = (p: Pen, kind: number) => {
  const k = K(p, 8), liquid = kind ? k.lin(0, 120, 0, 410, [[0, MOL.warm], [0.25, MOL.mid], [1, MOL.deep]]) : k.lin(0, 120, 0, 410, [[0, "#cfeefa"], [1, "#6fbfe0"]]);
  const glass: P2[] = [[60, 70], [240, 70], [262, 120], [262, 380], [240, 410], [60, 410], [38, 380], [38, 120]];
  k.poly(glass, "rgba(220,240,245,0.55)");
  k.poly([[44, 140], [256, 140], [256, 380], [236, 402], [64, 402], [44, 380]], liquid, 0);
  k.ell(150, 140, 106, 14, kind ? MOL.warm : "#e6f8ff", 4);
  k.poly(glass, null);
  k.poly(rrect(50, 36, 250, 76, 10), kind ? "#c8823a" : "#2f8f83");
  k.stroke([[70, 160], [70, 360]], 12, "rgba(255,255,255,0.55)"); k.stroke([[94, 170], [94, 260]], 6, "rgba(255,255,255,0.4)");
};
/** a paper tag on a little stand (420 x 200, base y 195) with a one-word label (the explainer's only text) */
export const fxTag = (p: Pen, text: string, col: string) => {
  const k = K(p, 7);
  k.poly(rrect(14, 14, 406, 150, 22), "#fff4dc");
  k.poly(rrect(14, 14, 60, 150, 22), col, 0);
  k.poly(rrect(14, 14, 406, 150, 22), null);
  k.poly([[180, 150], [240, 150], [250, 195], [170, 195]], "#3a2a1e");
  const g = p.g; g.fillStyle = INKC; g.textAlign = "center"; g.textBaseline = "middle";
  let fs = 74; g.font = `800 ${fs}px 'Baloo 2', sans-serif`;
  while (g.measureText(text).width > 320 && fs > 30) { fs -= 4; g.font = `800 ${fs}px 'Baloo 2', sans-serif`; }
  g.fillText(text, 232, 88);
};
/** a house-painter's wide brush, held at the handle end (220 x 120): bristles loaded with brown */
export const fxBrush = (p: Pen) => {
  const k = K(p, 6);
  k.poly(rrect(10, 46, 110, 74, 12), "#b07a44");
  k.poly([[110, 36], [140, 36], [140, 84], [110, 84]], "#a8acae");
  k.poly([[140, 30], [208, 24], [212, 96], [140, 90]], "#6b3a1e");
  k.stroke([[150, 40], [204, 36]], 4, rgba(MOL.gloss, 0.5));
};
/** a paint bucket full of brown paint (260 x 260, base y 250) */
export const fxBucket = (p: Pen) => {
  const k = K(p, 7);
  k.poly([[50, 80], [210, 80], [196, 250], [64, 250]], k.lin(50, 0, 210, 0, [[0, "#7a8484"], [0.4, "#c8d0d0"], [1, "#5a6464"]]));
  k.ell(130, 80, 80, 20, "#6b3a1e", 6);
  k.poly([[150, 80], [170, 80], [166, 160], [154, 160]], "#6b3a1e", 4);
  k.stroke([[50, 86], [20, 30], [130, 6], [240, 30], [210, 86]], 5, INKC);
};
/** an engineering plan (blueprint, 1000 x 700): tank elevation, dimension lines, a title block with blank lines; seal 0..1 */
export const fxPlan = (p: Pen, seal: number, modern = false, sig = 1) => {
  const k = K(p, 6), bg = modern ? "#f4f2ea" : "#2a5a8a", ln = modern ? "#2a4a6a" : "#e8f2ff";
  k.poly([[10, 10], [990, 10], [990, 690], [10, 690]], bg);
  const g = p.g; g.strokeStyle = rgba(ln, 0.22); g.lineWidth = 1.5;
  for (let x = 30; x < 990; x += 40) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 680); g.stroke(); }
  for (let y = 30; y < 690; y += 40) { g.beginPath(); g.moveTo(20, y); g.lineTo(980, y); g.stroke(); }
  k.ow = 0;
  k.stroke([[160, 560], [160, 200], [520, 200], [520, 560], [160, 560]], 6, ln);
  for (let y = 250; y < 560; y += 50) k.stroke([[160, y], [520, y]], 3, rgba(ln, 0.8));
  k.stroke(ellPts(340, 200, 180, 30, 180, 360, 0, 20), 5, ln);
  k.stroke([[120, 200], [120, 560]], 3, ln); k.stroke([[110, 200], [130, 200]], 3, ln); k.stroke([[110, 560], [130, 560]], 3, ln);
  k.stroke([[160, 600], [520, 600]], 3, ln); k.stroke([[160, 590], [160, 610]], 3, ln); k.stroke([[520, 590], [520, 610]], 3, ln);
  k.stroke([[600, 470], [960, 470], [960, 660], [600, 660], [600, 470]], 5, ln);
  for (let i = 0; i < 4; i++) k.stroke([[620, 510 + i * 38], [i === 3 ? 760 : 880 - i * 40, 510 + i * 38]], 4, rgba(ln, 0.75));
  k.stroke([[600, 120], [940, 120]], 4, rgba(ln, 0.6)); k.stroke([[600, 170], [880, 170]], 4, rgba(ln, 0.6)); k.stroke([[600, 220], [910, 220]], 4, rgba(ln, 0.6));
  k.ow = 6;
  if (sig > 0.01) { // a handwritten signature scribble on the title block's last line (ink)
    const pts: P2[] = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([630 + 230 * u, 616 - 18 * Math.sin(u * 19) * (0.6 + 0.4 * Math.sin(u * 5)) - 10 * u]); }
    k.stroke(pts.slice(0, Math.max(2, Math.round(41 * sig))), 6, modern ? "#1f3a8a" : "#10222b");
  }
  if (seal > 0.01) fxSealDraw(k, 860, 590, 70, seal, modern);
};
const fxSealDraw = (k: KPen, x: number, y: number, R: number, a: number, modern: boolean) => {
  const col = modern ? "#c8323a" : "#d8323a";
  k.g.globalAlpha = Math.min(1, a);
  k.ell(x, y, R, R, null, 0);
  k.stroke(ellPts(x, y, R, R, 0, 360, 0, 40), 9, col);
  k.stroke(ellPts(x, y, R * 0.72, R * 0.72, 0, 360, 0, 40), 4, col);
  for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU; k.stroke([[x + Math.cos(an) * R * 0.78, y + Math.sin(an) * R * 0.78], [x + Math.cos(an) * R * 0.9, y + Math.sin(an) * R * 0.9]], 4, col); }
  star(k, x, y, R * 0.45, col);
  k.g.globalAlpha = 1;
};
/** an expanding ink ring (500 x 500), u 0..1 */
export const fxRingOut = (p: Pen, u: number) => {
  const k = K(p, 0), R = 60 + 180 * u;
  k.stroke(ellPts(250, 250, R, R, 0, 360, 0, 48), 18 * (1 - u) + 2, rgba("#fff4dc", 1 - u));
};
/** an elevated-railway car of 1919 seen from the side (1200 x 360, base y 350): wooden body, windows, trucks */
export const fxTrain = (p: Pen, seed: number) => {
  const k = K(p, 8), body = seed % 2 ? "#4a6a3a" : "#6a3a2a";
  k.poly(rrect(30, 60, 1170, 290, 18), body);
  k.poly([[20, 60], [1180, 60], [1150, 30], [50, 30]], shade(body, 0.7));
  for (let i = 0; i < 12; i++) { const x = 80 + i * 88; k.poly(rrect(x, 100, x + 64, 180, 8), i % 4 === 1 ? "#f6d79a" : "#a8c8d8", 5); }
  k.stroke([[30, 230], [1170, 230]], 6, shade(body, 0.6));
  for (const x of [200, 1000]) { k.poly(rrect(x - 110, 290, x + 110, 320, 8), "#2a2a2a"); for (const dx of [-60, 60]) k.ell(x + dx, 325, 26, 26, "#3a3a3a", 6); }
};
/** far Boston harbour skyline of 1919 (2048 x 512): roofs, church steeples, the Custom House tower, ship masts with rigging */
export const fxSkyline = (p: Pen, seed: number, col: string) => {
  const r = rng(seed), g = p.g;
  g.fillStyle = col;
  let x = 0;
  while (x < 2048) {
    const w = 50 + r() * 120, h = 60 + r() * 140;
    g.fillRect(x, 512 - h, w, h);
    if (r() < 0.35) { g.beginPath(); g.moveTo(x - 4, 512 - h); g.lineTo(x + w / 2, 512 - h - 30 - r() * 20); g.lineTo(x + w + 4, 512 - h); g.fill(); }
    if (r() < 0.08) { const sx = x + w * 0.5; g.fillRect(sx - 10, 512 - h - 80, 20, 80); g.beginPath(); g.moveTo(sx - 12, 512 - h - 80); g.lineTo(sx, 512 - h - 190); g.lineTo(sx + 12, 512 - h - 80); g.fill(); }
    x += w + r() * 8;
  }
  const tx = 700 + r() * 500; // the Custom House tower (generic)
  g.fillRect(tx, 90, 80, 422); g.fillRect(tx - 12, 150, 104, 16); g.beginPath(); g.moveTo(tx - 6, 90); g.lineTo(tx + 40, 20); g.lineTo(tx + 86, 90); g.fill();
  g.fillStyle = mix(col, "#fff3c4", 0.35); g.beginPath(); g.arc(tx + 40, 120, 18, 0, TAU); g.fill();
  g.strokeStyle = shade(col, 0.8); g.fillStyle = shade(col, 0.85); g.lineWidth = 5;
  for (let i = 0; i < 7; i++) { const mx = 120 + i * 270 + r() * 60, mh = 220 + r() * 120; g.fillRect(mx, 512 - mh, 6, mh); g.lineWidth = 2; g.beginPath(); g.moveTo(mx + 3, 512 - mh); g.lineTo(mx - 70, 470); g.moveTo(mx + 3, 512 - mh); g.lineTo(mx + 80, 470); g.stroke(); g.fillRect(mx - 40, 512 - mh * 0.7, 86, 5); }
};
/** cartoon strain ticks + a crack (300 x 300, t seconds) for the tank seam */
export const fxCrack = (p: Pen, u: number) => {
  const k = K(p, 0), r = rng(7);
  const pts: P2[] = [[150, 0]];
  for (let i = 1; i <= 10; i++) pts.push([150 + (r() - 0.5) * 50, i * 30]);
  const n = Math.max(2, Math.round(11 * u));
  k.stroke(pts.slice(0, n), 12, INKC); k.stroke(pts.slice(0, n), 5, MOL.mid);
};
/** a broken torn steel plate lying flat (500 x 300) */
export const fxPlate = (p: Pen, seed: number) => {
  const k = K(p, 8), r = rng(seed);
  const pts: P2[] = [[30, 60], [470, 30], [460, 140 + r() * 40], [420, 200], [480, 260], [40, 270], [70, 160]];
  k.poly(pts, k.lin(30, 0, 470, 0, [[0, "#5a301a"], [0.5, "#7a4426"], [1, "#4a2814"]]));
  for (let x = 60; x < 460; x += 30) k.dot(x, 70 - (x - 60) * 0.07, 5, "#3a2010");
};
/** a modern hard-wearing drawing tube / rolled plans (300 x 120) */
export const fxRoll = (p: Pen) => {
  const k = K(p, 6);
  k.poly(rrect(20, 30, 280, 90, 30), "#f4f2ea"); k.ell(270, 60, 18, 30, "#d8dce0", 5);
  k.stroke([[60, 30], [60, 90]], 4, "#2a4a6a");
};
/** a hand (sleeve from the top) gripping the stamp (300 x 640, base y 630) */
export const fxStampHand = (p: Pen) => {
  const k = K(p, 8);
  k.g.save(); k.g.translate(20, 280); fxStamp(p); k.g.restore();
  k.poly([[60, 0], [220, 0], [210, 250], [80, 250]], "#2a2e34");                 // dark sleeve
  k.poly(rrect(70, 230, 220, 280, 14), "#f2ead8");                               // white cuff
  k.poly([[78, 270], [222, 270], [236, 330], [214, 380], [90, 384], [66, 330]], "#e8b98f"); // fist
  for (const x of [110, 145, 180]) k.stroke([[x, 330], [x + 6, 378]], 5, "#b07a54");
  k.poly([[200, 290], [246, 300], [244, 340], [214, 344]], "#e8b98f");          // thumb
};
/** a hand-tinted rubber stamp seen in profile (260 x 360, base y 350): turned wooden knob + handle, block, red pad */
export const fxStamp = (p: Pen) => {
  const k = K(p, 8);
  k.ell(130, 60, 56, 46, "#8a5a32");
  k.poly([[106, 90], [154, 90], [150, 230], [110, 230]], k.lin(106, 0, 154, 0, [[0, "#7a4a2a"], [0.4, "#b07a44"], [1, "#6a3a22"]]));
  k.poly(rrect(36, 230, 224, 300, 10), "#5a3a22");
  k.poly(rrect(44, 300, 216, 340, 6), "#c8323a");
};
/** a gaslamp-era Boston street lamp (200 x 1100, base y 1090) */
export const fxLamp = (p: Pen) => {
  const k = K(p, 7);
  k.poly([[84, 1090], [116, 1090], [110, 300], [90, 300]], "#22303a");
  k.poly(rrect(66, 1040, 134, 1090, 6), "#22303a");
  k.poly([[60, 300], [140, 300], [124, 200], [76, 200]], "#f6e3a8");
  k.poly([[50, 200], [150, 200], [100, 150]], "#22303a");
  k.stroke([[76, 200], [70, 300]], 4, INKC); k.stroke([[124, 200], [130, 300]], 4, INKC);
};
/** a seagull gliding (200 x 120), wing phase 0..1 */
export const fxGull = (p: Pen, ph: number) => {
  const k = K(p, 5), w = 34 * Math.sin(ph * TAU);
  k.poly([[100, 60], [24, 48 - w], [60, 66], [100, 70], [140, 66], [176, 48 - w]], "#f4f2ea", 5);
  k.ell(100, 64, 16, 9, "#f4f2ea", 4); k.dot(114, 62, 4, "#e8a03a");
};
/** a horse-free delivery handcart with crates (600 x 400, wheel on y 380) */
export const fxHandcart = (p: Pen, seed: number) => {
  const k = K(p, 8), r = rng(seed + 9);
  for (let i = 0; i < 3; i++) k.poly(rrect(110 + i * 110, 120 - (i % 2) * 30, 200 + i * 110, 230, 6), mix("#c8a06a", "#8a6a44", r()), 6);
  k.poly([[60, 230], [520, 230], [500, 290], [80, 290]], "#7a5230");
  k.band([[500, 260], [590, 230]], "#5a3a22", 14, 4);
  k.ell(300, 320, 62, 62, "#5a3a22", 8); k.ell(300, 320, 14, 14, "#2a1a10", 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; k.stroke([[300, 320], [300 + Math.cos(a) * 56, 320 + Math.sin(a) * 56]], 5, "#2a1a10"); }
};
/** a lit window glow square (128 x 128) for dusk */
export const fxWinGlow = (p: Pen) => { const g = p.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,214,140,0.9)"); gr.addColorStop(1, "rgba(255,180,90,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); };
void tint;
