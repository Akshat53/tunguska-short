// Canvas art for "Could YOU Survive? Ep 1: The Titanic": the Milky Way band, mist, light streaks on the water, an iceberg on
// the horizon, the foreground wave, foam where the ship went down, the dark sea floor paint. Ink #10222B, our night palette
// (deep blues, teal, cream; a warm sunflower / lantern accent), no purple. All deterministic (seeded hash).
import { KPen, hash, rgba, ellPts, TAU, type P2 } from "../../engine/kit/core";

/** the Milky Way: a soft diagonal band of haze + thousands of tiny stars + dark dust lanes (2048 x 1024) */
export const milkyWay = (p: KPen) => {
  const g = p.g;
  g.save(); g.translate(1024, 512); g.rotate(-0.42); g.translate(-1024, -512);
  for (let i = 0; i < 90; i++) {
    const x = 2048 * hash(i, 11), y = 512 + 150 * (hash(i, 12) - 0.5) * 2 * Math.sin((x / 2048) * Math.PI), r = 90 + 160 * hash(i, 13);
    g.fillStyle = p.rad(x, y, r, [[0, rgba(i % 5 ? "#9fc4d8" : "#e8e2c8", 0.07 + 0.05 * hash(i, 14))], [1, rgba("#9fc4d8", 0)]]);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 26; i++) {                                         // dust lanes
    const x = 2048 * hash(i, 21), y = 512 + 60 * (hash(i, 22) - 0.5), r = 40 + 70 * hash(i, 23);
    g.fillStyle = p.rad(x, y, r, [[0, "rgba(4,10,18,0.35)"], [1, "rgba(4,10,18,0)"]]); g.beginPath(); g.ellipse(x, y, r * 2.2, r * 0.5, 0, 0, TAU); g.fill();
  }
  for (let i = 0; i < 2600; i++) {
    const x = 2048 * hash(i, 31), spread = (hash(i, 32) - 0.5) * (hash(i, 33) < 0.7 ? 260 : 700), y = 512 + spread;
    const b = hash(i, 34), r = b > 0.985 ? 2.6 : b > 0.9 ? 1.6 : 0.9;
    g.fillStyle = rgba(b > 0.95 ? "#fff4dc" : "#dceaf2", 0.35 + 0.6 * b); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
};
/** a few bright named-ish stars with a soft cross glint (512 x 512) */
export const brightStar = (p: KPen) => {
  p.glow(256, 256, 120, "#dceaf2", 0.5);
  p.g.fillStyle = "rgba(255,255,255,0.95)"; p.g.beginPath(); p.g.arc(256, 256, 10, 0, TAU); p.g.fill();
  for (const [dx, dy] of [[1, 0], [0, 1]]) p.stroke([[256 - dx * 150, 256 - dy * 150], [256 + dx * 150, 256 + dy * 150]], 3, "rgba(220,234,242,0.5)");
};
/** a soft, long, low mist wisp (512 x 160) */
export const mistPuff = (p: KPen) => {
  const g = p.g;
  for (let k = 0; k < 7; k++) {
    const x = 256 + 300 * (hash(k, 1) - 0.5), y = 86 + 24 * (hash(k, 2) - 0.5), r = 60 + 50 * hash(k, 3);
    g.save(); g.translate(x, y); g.scale(2.6, 0.55);
    g.fillStyle = p.rad(0, 0, r, [[0, "rgba(190,214,226,0.42)"], [0.55, "rgba(170,198,214,0.16)"], [1, "rgba(170,198,214,0)"]]);
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
  }
};
/** a dense field of small stars (1024 x 1024), additive */
export const starField = (p: KPen) => {
  const g = p.g;
  for (let i = 0; i < 900; i++) {
    const x = 1024 * hash(i, 71), y = 1024 * hash(i, 72), b = hash(i, 73), r = b > 0.97 ? 2.2 : b > 0.8 ? 1.4 : 0.8;
    if (b > 0.97) { g.fillStyle = p.rad(x, y, 7, [[0, "rgba(220,234,242,0.5)"], [1, "rgba(220,234,242,0)"]]); g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
    g.fillStyle = rgba(b > 0.9 ? "#fff4dc" : "#dceaf2", 0.3 + 0.65 * b); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
};
/** a vertical shimmering light streak on the water under a light (64 x 512), additive */
export const streak = (col: string) => (p: KPen) => {
  const g = p.g;
  for (let i = 0; i < 14; i++) {
    const y = 20 + i * 34 + 8 * hash(i, 4), w = 30 * (1 - i / 16) * (0.6 + 0.4 * hash(i, 5)), a = 0.85 * (1 - i / 15);
    g.fillStyle = p.rad(32, y, w, [[0, rgba(col, a)], [1, rgba(col, 0)]]); g.beginPath(); g.ellipse(32, y, w, 6, 0, 0, TAU); g.fill();
  }
};
/** a soft round glow (256 x 256), additive */
export const glowDisc = (col: string) => (p: KPen) => p.glow(128, 128, 126, col, 0.9);
/** a low iceberg on the horizon, faintly lit (1200 x 500, base 470) */
export const iceberg = (p: KPen) => {
  const top: P2[] = [[60, 470], [180, 300], [260, 330], [360, 160], [430, 210], [520, 90], [600, 180], [700, 150], [820, 300], [920, 260], [1080, 400], [1140, 470]];
  p.poly(top, p.lin(0, 90, 0, 470, [[0, "#d6e6ee"], [0.6, "#9fb9c8"], [1, "#6f8a9a"]]));
  p.stroke([[520, 90], [470, 300], [500, 470]], 5, rgba("#10222b", 0.35));
  p.stroke([[360, 160], [330, 360]], 4, rgba("#10222b", 0.3)); p.stroke([[700, 150], [760, 380]], 4, rgba("#10222b", 0.3));
  p.stroke([[540, 110], [600, 185], [700, 160]], 6, "rgba(255,255,255,0.55)");
};
/** the foreground wave that slaps over you (1400 x 700, base 700): a curling dark-teal sheet with a foam crest, u = 0..1 rise */
export const waveSheet = (u: number) => (p: KPen) => {
  const crest: P2[] = [];
  for (let i = 0; i <= 28; i++) { const s = i / 28, x = 1400 * s; crest.push([x, 700 - (180 + 360 * u) * Math.sin(Math.PI * (0.1 + 0.85 * s)) ** 1.5 - 20 * Math.sin(s * 19)]); }
  const body: P2[] = [[0, 700], ...crest, [1400, 700]];
  p.poly(body, p.lin(0, 200, 0, 700, [[0, "#2c6a78"], [0.5, "#123848"], [1, "#071822"]]));
  p.stroke(crest, 26, "rgba(220,240,244,0.85)"); p.stroke(crest, 8, "#ffffff");
  for (let i = 0; i < 40; i++) {
    const c = crest[Math.floor(hash(i, 5) * 27)], r = 6 + 14 * hash(i, 6);
    p.ell(c[0] + 60 * (hash(i, 7) - 0.5), c[1] - 50 * hash(i, 8) * u, r, r, "rgba(235,248,250,0.9)", 0);
  }
  for (let i = 0; i < 6; i++) { const x = 120 + i * 220; p.stroke([[x, 700], [x + 50, 500 - 120 * u]], 6, "rgba(160,210,220,0.3)"); }
};
/** a flat ring of foam and churned water (where the ship went down), 1024 x 1024, flat on the sea */
export const foamField = (p: KPen) => {
  for (let i = 0; i < 160; i++) {
    const a = TAU * hash(i, 41), r = 200 + 300 * hash(i, 42), x = 512 + Math.cos(a) * r, y = 512 + Math.sin(a) * r, s = 10 + 40 * hash(i, 43);
    p.g.fillStyle = rgba("#dcecf0", 0.15 + 0.4 * hash(i, 44)); p.g.beginPath(); p.g.ellipse(x, y, s * 1.8, s, a, 0, TAU); p.g.fill();
  }
};
/** the abyss: an opaque, very dark ground under the transparent water plane (hides everything below the surface) */
export const abyssPaint = (g: CanvasRenderingContext2D) => {
  const W = g.canvas.width, H = g.canvas.height;
  g.fillStyle = "#040c12"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(20,52,66,${(0.08 + 0.12 * hash(i, 51)).toFixed(3)})`; g.beginPath(); g.ellipse(W * hash(i, 52), H * hash(i, 53), 30 + 80 * hash(i, 54), 6 + 10 * hash(i, 55), 0, 0, TAU); g.fill(); }
};
/** surface glints / wavelets as a flat additive card around the swimmers (1024 x 1024) */
export const wavelets = (p: KPen) => {
  for (let i = 0; i < 260; i++) {
    const x = 1024 * hash(i, 61), y = 1024 * hash(i, 62), w = 8 + 26 * hash(i, 63);
    p.stroke(ellPts(x, y, w, w * 0.25, 200, 340, 0, 8), 1.5 + 2 * hash(i, 64), rgba("#9fc4d8", 0.12 + 0.3 * hash(i, 65)));
  }
};
/** an air bubble (128 x 128) */
export const bubble = (p: KPen) => {
  p.ell(64, 64, 52, 52, p.rad(56, 52, 56, [[0, "rgba(255,255,255,0.15)"], [0.75, "rgba(180,226,240,0.35)"], [1, "rgba(220,244,250,0.9)"]]), 5);
  p.ell(46, 44, 14, 9, "rgba(255,255,255,0.9)", 0, -30);
};
