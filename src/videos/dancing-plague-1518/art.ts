// Canvas art for "The Dancing Plague of 1518": Strasbourg set dressing drawn with the visual kit pen (ink outlines, form
// shading, texture detail). Each prop documents its design size and base line (bottom-centre = where it stands).
// Half-timbered gabled houses (Alsace), the cathedral with its single spire, the wooden dance stage with bunting, a stone
// fountain, market stalls, barrels, a hand cart, bunting strings; the archive (book shelves, desk, lecterns with the
// chronicle and the city records, candles); the famine field (dry furrows, dead tree, crows, the city far away);
// the chapel (stone wall, stained-glass window, St Vitus plinth, altar, candles). Palette: sea-green / teal / cream /
// sunflower with warm reds and browns; never purple. Grounds are paintTex draw functions. Everything is seeded (rngK).
import { KPen, type P2, PAL, INK, TAU, hash, mix, shade, tint, rgba, rrect, curve, rngK, ellPts } from "../../engine/kit/core";
import { flame } from "../../engine/kit/people";

export const PLASTER = ["#f3e6c4", "#efd58e", "#cfe3d2", "#f2c9a0", "#d8e6dc", "#f6ecd2", "#e9c46a", "#bfdcd0"];
export const SHUTTER = ["#1f5f66", "#2f8f83", "#c8323a", "#d9a441", "#173f46", "#3f7f6a"];
const TIMBER = "#4a2e1e", TILE = ["#b5532f", "#a8482a", "#c4683a", "#9a4a2e"];
const SERIF = "Georgia, 'Times New Roman', serif";

// ---------------- houses ----------------
/** a gabled half-timbered house front (Alsace): 1000 x 1800 design, base at y 1780. narrow: 0..1 squeezes the width */
export const halfTimber = (p: KPen, seed: number) => {
  const r = rngK(seed), g = p.g; p.ow = 8;
  const pl = PLASTER[seed % PLASTER.length], sh = SHUTTER[(seed * 3 + 1) % SHUTTER.length], tile = TILE[seed % TILE.length];
  const base = 1780, gf = 1400, f2 = 1020, f3 = 660, apex = 90 + r() * 70;
  const x0 = 110, x1 = 890, j = 22; // jetty overhang per floor
  // ground floor: sandstone
  const stone = mix("#d9b48a", "#c98f6a", r());
  p.poly([[x0 + j, gf], [x1 - j, gf], [x1 - j, base], [x0 + j, base]], p.lin(0, gf, 0, base, [[0, tint(stone, 0.08)], [1, shade(stone, 0.82)]]));
  p.clip([[x0 + j, gf], [x1 - j, gf], [x1 - j, base], [x0 + j, base]], () => {
    for (let y = gf + 40; y < base; y += 64) for (let x = x0 + j + ((y / 64) % 2) * 50; x < x1; x += 100) p.stroke([[x, y], [x + 92, y]], 3, rgba(INK, 0.18));
  });
  // arched door + shop window
  const dx = r() < 0.5 ? 300 : 700, ow2 = 1000 - dx;
  const door: P2[] = [[dx - 85, base], [dx - 85, base - 230], ...curve([dx - 85, base - 230], [dx, base - 330], [dx + 85, base - 230], 10).slice(1), [dx + 85, base]];
  p.poly(door, p.lin(dx - 85, 0, dx + 85, 0, [[0, shade(sh, 0.9)], [1, shade(sh, 0.65)]]));
  for (let k = -1; k <= 1; k++) p.stroke([[dx + k * 40, base - 10], [dx + k * 40, base - 250]], 4, rgba(INK, 0.4));
  p.dot(dx + 55, base - 140, 9, PAL.brass);
  p.poly(rrect(ow2 - 130, gf + 90, ow2 + 130, gf + 270, 12), p.lin(0, gf + 90, 0, gf + 270, [[0, "#2f4a52"], [1, "#1c3036"]]));
  for (let k = 1; k < 4; k++) p.stroke([[ow2 - 130 + k * 65, gf + 92], [ow2 - 130 + k * 65, gf + 268]], 4, TIMBER);
  p.poly([[ow2 - 160, gf + 70], [ow2 + 160, gf + 70], [ow2 + 185, gf + 120], [ow2 - 185, gf + 120]], r() < 0.5 ? PAL.sea : PAL.red, 5); // awning
  for (let k = 0; k < 6; k++) p.poly([[ow2 - 160 + k * 53, gf + 70], [ow2 - 133 + k * 53, gf + 70], [ow2 - 128 + k * 55, gf + 120], [ow2 - 158 + k * 55, gf + 120]], PAL.cream, 0);
  // upper floors: plaster + timber frame
  const floors: [number, number, number][] = [[f2, gf, j * 0.5], [f3, f2, 0]];
  for (const [top, bot, inset] of floors) {
    const a = x0 + inset, b = x1 - inset;
    p.poly([[a, top], [b, top], [b, bot], [a, bot]], p.lin(a, 0, b, 0, [[0, tint(pl, 0.1)], [0.7, pl], [1, shade(pl, 0.86)]]));
    p.clip([[a, top], [b, top], [b, bot], [a, bot]], () => {
      for (let i = 0; i < 26; i++) { g.fillStyle = rgba(shade(pl, 0.7), 0.12); g.beginPath(); g.ellipse(a + r() * (b - a), top + r() * (bot - top), 10 + r() * 30, 5 + r() * 12, r(), 0, TAU); g.fill(); }
    });
    const n = 4, step = (b - a) / n;
    // posts, sill + head beams, braces (alternating "/" "\" and St Andrew crosses under the windows)
    for (let k = 0; k <= n; k++) p.band([[a + k * step, top + 6], [a + k * step, bot - 6]], TIMBER, 16, 3, "butt");
    p.band([[a - 6, bot - 10], [b + 6, bot - 10]], TIMBER, 20, 3, "butt");
    p.band([[a - 6, top + 10], [b + 6, top + 10]], TIMBER, 18, 3, "butt");
    p.band([[a, top + (bot - top) * 0.72], [b, top + (bot - top) * 0.72]], TIMBER, 12, 3, "butt");
    for (let k = 0; k < n; k++) {
      const cx = a + (k + 0.5) * step, win = (k === 1 || k === 2) || (k === 0 && r() < 0.5);
      const wy0 = top + 70, wy1 = top + (bot - top) * 0.72 - 14;
      if (win) {
        // window with diamond panes, shutters, flower box
        const ww = step * 0.3;
        p.poly(rrect(cx - ww, wy0, cx + ww, wy1, 6), p.lin(0, wy0, 0, wy1, [[0, "#3c6a72"], [0.5, "#2a4f57"], [1, "#1f3a40"]]));
        p.clip(rrect(cx - ww, wy0, cx + ww, wy1, 6), () => {
          for (let d = -400; d < 400; d += 34) { p.stroke([[cx - ww + d, wy0], [cx - ww + d + 300, wy0 + 300]], 2.5, rgba("#d6a542", 0.7)); p.stroke([[cx + ww - d, wy0], [cx + ww - d - 300, wy0 + 300]], 2.5, rgba("#d6a542", 0.7)); }
          p.poly([[cx - ww, wy0], [cx - ww + 40, wy0], [cx - ww + 120, wy1], [cx - ww + 80, wy1]], rgba("#ffffff", 0.18), 0);
        });
        p.stroke([[cx, wy0], [cx, wy1]], 6, TIMBER);
        for (const s of [-1, 1]) {
          const sx = cx + s * ww;
          const shp: P2[] = [[sx, wy0], [sx + s * ww * 0.9, wy0 + 6], [sx + s * ww * 0.9, wy1 - 6], [sx, wy1]];
          p.poly(shp, sh, 5);
          for (let q = 1; q < 6; q++) p.stroke([[sx + s * 6, wy0 + q * (wy1 - wy0) / 6], [sx + s * (ww * 0.9 - 6), wy0 + q * (wy1 - wy0) / 6]], 3, rgba(INK, 0.35));
        }
        p.poly(rrect(cx - ww - 12, wy1 + 4, cx + ww + 12, wy1 + 34, 4), "#7a4a2a", 5);
        for (let q = 0; q < 7; q++) { const fx = cx - ww + q * (ww * 2) / 6; p.ell(fx, wy1 - 2, 14, 12, "#3f7f4a", 3); p.dot(fx + 3, wy1 - 8, 8, q % 2 ? PAL.red : PAL.sun); }
      } else {
        // a carved "Mann" brace pair
        p.band([[cx - step * 0.42, bot - 20], [cx, top + 24]], TIMBER, 13, 3);
        p.band([[cx + step * 0.42, bot - 20], [cx, top + 24]], TIMBER, 13, 3);
      }
      // St Andrew cross under the window line
      const y0 = top + (bot - top) * 0.72 + 6, y1 = bot - 16;
      p.band([[cx - step * 0.42, y0], [cx + step * 0.42, y1]], TIMBER, 10, 2.5);
      p.band([[cx + step * 0.42, y0], [cx - step * 0.42, y1]], TIMBER, 10, 2.5);
    }
  }
  // gable: plaster + timber, a small attic window and a hoist beam; tiled roof edges
  const gl: P2[] = [[x0 - 10, f3], [500, apex], [x1 + 10, f3]];
  p.poly(gl, p.lin(0, apex, 0, f3, [[0, shade(pl, 0.92)], [1, pl]]));
  p.clip(gl, () => {
    p.band([[300, f3], [300, 380]], TIMBER, 14, 3); p.band([[700, f3], [700, 380]], TIMBER, 14, 3);
    p.band([[200, f3 - 230], [800, f3 - 230]], TIMBER, 14, 3);
    p.band([[500, f3], [500, apex]], TIMBER, 14, 3);
    p.band([[300, f3 - 10], [500, f3 - 220]], TIMBER, 10, 2.5); p.band([[700, f3 - 10], [500, f3 - 220]], TIMBER, 10, 2.5);
  });
  p.poly(gl, null);
  p.poly(rrect(450, f3 - 380, 550, f3 - 270, 30), "#2a4f57", 6);
  p.stroke([[500, f3 - 380], [500, f3 - 270]], 4, TIMBER);
  p.band([[500, apex + 70], [500, apex + 30]], TIMBER, 12, 3);
  const roof = (s: number) => [[500, apex - 34], [500 + s * 450, f3 + 30], [500 + s * 425, f3 + 58], [500, apex + 10]] as P2[];
  for (const s of [-1, 1]) {
    p.poly(roof(s), p.lin(500, apex, 500 + s * 440, f3, [[0, tint(tile, 0.1)], [1, shade(tile, 0.8)]]), 7);
    for (let k = 1; k < 9; k++) { const u = k / 9; p.dot(500 + s * 440 * u, apex - 10 + (f3 + 40 - apex) * u, 9, shade(tile, 0.7)); }
  }
  p.ell(500, apex - 26, 18, 14, shade(tile, 0.75), 5);
  // jetty shadow lines
  g.fillStyle = p.lin(0, gf, 0, gf + 50, [[0, rgba(INK, 0.4)], [1, rgba(INK, 0)]]); g.fillRect(x0 + j, gf, x1 - x0 - 2 * j, 50);
};

/** Strasbourg cathedral (stylised): rose-sandstone west front with a single tall spire, 900 x 2400 design, base at y 2380 */
export const cathedral = (p: KPen) => {
  const g = p.g; p.ow = 9;
  const sand = "#d8977a", dk = "#b07258", lt = "#ecc0a0";
  const body: P2[] = [[120, 2380], [120, 1180], [780, 1180], [780, 2380]];
  p.poly(body, p.lin(120, 0, 780, 0, [[0, lt], [0.55, sand], [1, dk]]));
  p.clip(body, () => { for (let x = 150; x < 780; x += 36) p.stroke([[x, 1190], [x, 2380]], 3, rgba(INK, 0.16)); });
  // three portals
  for (const [cx, w] of [[450, 120], [250, 70], [650, 70]] as [number, number][]) {
    const pts: P2[] = [[cx - w, 2380], [cx - w, 2380 - w * 2.2], [cx, 2380 - w * 3.6], [cx + w, 2380 - w * 2.2], [cx + w, 2380]];
    p.poly(pts, "#5a3a30"); p.poly([[cx - w - 18, 2380 - w * 2.2], [cx, 2380 - w * 3.9], [cx + w + 18, 2380 - w * 2.2]], null);
  }
  // rose window
  p.ell(450, 1560, 150, 150, "#2f6a72");
  for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; p.stroke([[450, 1560], [450 + Math.cos(a) * 150, 1560 + Math.sin(a) * 150]], 5, lt); }
  p.ell(450, 1560, 60, 60, PAL.sun, 5); p.ell(450, 1560, 150, 150, null, 10);
  p.band([[110, 1180], [790, 1180]], dk, 24, 4);
  // the north tower + spire (offset left, as in Strasbourg)
  const tx = 300;
  p.poly([[tx - 150, 1180], [tx - 150, 700], [tx + 150, 700], [tx + 150, 1180]], p.lin(tx - 150, 0, tx + 150, 0, [[0, lt], [1, dk]]));
  for (let k = 0; k < 3; k++) p.poly([[tx - 100 + k * 75, 1100], [tx - 100 + k * 75, 820], [tx - 70 + k * 75, 780], [tx - 40 + k * 75, 820], [tx - 40 + k * 75, 1100]], "#4a3028", 5);
  p.poly([[tx - 110, 700], [tx - 70, 470], [tx + 70, 470], [tx + 110, 700]], sand);
  p.poly([[tx - 70, 470], [tx, 30], [tx + 70, 470]], p.lin(tx - 70, 0, tx + 70, 0, [[0, lt], [1, dk]]));
  for (let k = 0; k < 9; k++) { const y = 460 - k * 48, w = 70 * (1 - (460 - y) / 440); p.stroke([[tx - w, y], [tx + w, y]], 4, rgba(INK, 0.4)); }
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const y = 470 - k * 70, x = tx + s * 70 * (1 - (470 - y) / 440); p.stroke([[x, y], [x + s * 18, y - 30]], 5); }
  p.stroke([[tx, 40], [tx, -20]], 6); p.stroke([[tx - 14, 0], [tx + 14, 0]], 5);
  // the unfinished south side: a flat platform
  p.poly([[480, 1180], [480, 980], [780, 980], [780, 1180]], p.lin(480, 0, 780, 0, [[0, sand], [1, dk]]));
  p.band([[470, 980], [790, 980]], dk, 18, 4);
  g.fillStyle = rgba("#ffffff", 0); // no-op (keeps the pen state explicit)
};

// ---------------- square props ----------------
/** the wooden dance stage seen from the front: 1600 x 900 design, base at y 890; platform top at design y 601 (1.3 m at w 7.2 m) */
export const STAGE_TOP_Y = 601;
export const stageFront = (p: KPen) => {
  p.ow = 8;
  const wood = "#b98a58", top = STAGE_TOP_Y;
  // corner posts with a bunting rope
  for (const x of [70, 1530]) p.poly(rrect(x - 22, 40, x + 22, 890, 6), p.lin(x - 22, 0, x + 22, 0, [[0, tint(wood, 0.1)], [1, shade(wood, 0.7)]]));
  const rope = curve([70, 70], [800, 230], [1530, 70], 24);
  p.stroke(rope, 5, "#6a4a30");
  const cols = [PAL.sea, PAL.sun, PAL.cream, PAL.red, PAL.teal];
  for (let k = 1; k < 23; k++) { const [x, y] = rope[k]; p.poly([[x - 26, y], [x + 26, y + 2], [x, y + 60]], cols[k % cols.length], 4); }
  // front skirt: vertical planks over a trestle
  p.poly([[40, top], [1560, top], [1560, 890], [40, 890]], p.lin(0, top, 0, 890, [[0, tint(wood, 0.08)], [1, shade(wood, 0.72)]]));
  for (let x = 40; x < 1560; x += 64) p.stroke([[x, top + 20], [x, 885]], 3, rgba(INK, 0.35));
  for (let k = 0; k < 40; k++) p.dot(70 + hash(k, 3) * 1460, top + 40 + hash(k, 4) * 230, 5, rgba(INK, 0.35));
  p.band([[30, top], [1570, top]], shade(wood, 0.8), 26, 4);
  // a skirt of cloth swags (teal / sunflower)
  for (let k = 0; k < 8; k++) { const x0 = 40 + k * 190; p.poly([[x0, top + 14], ...curve([x0, top + 14], [x0 + 95, top + 150], [x0 + 190, top + 14], 10).slice(1)], k % 2 ? PAL.sun : PAL.sea, 5); }
  // steps at the left
  for (let s = 0; s < 4; s++) p.poly(rrect(-0 + s * 0, top + 72 * s, 120 - s * 20, top + 72 * (s + 1), 3), shade(wood, 0.9 - s * 0.05), 5);
};
/** the stage top (seen from above): 1600 x 580 planks, laid flat */
export const stageTop = (p: KPen) => {
  p.ow = 6;
  p.poly([[0, 0], [1600, 0], [1600, 580], [0, 580]], "#c49a66");
  for (let x = 0; x < 1600; x += 64) p.stroke([[x, 0], [x, 580]], 3, rgba(INK, 0.35));
  for (let k = 0; k < 60; k++) p.dot(hash(k, 9) * 1600, hash(k, 10) * 580, 4, rgba(INK, 0.3));
};
/** stone fountain: 800 x 1000 design, base at y 990 */
export const fountain = (p: KPen) => {
  p.ow = 8;
  const st = "#d9cdb4";
  p.poly([[60, 760], [740, 760], [700, 990], [100, 990]], p.lin(60, 0, 740, 0, [[0, tint(st, 0.1)], [1, shade(st, 0.75)]]));
  p.ell(400, 760, 340, 60, "#2f8f9a");
  p.ell(400, 760, 300, 46, p.lin(0, 714, 0, 806, [[0, "#9ad8d0"], [1, "#2f7f8a"]]), 0);
  p.poly(rrect(370, 330, 430, 760, 10), p.lin(370, 0, 430, 0, [[0, tint(st, 0.1)], [1, shade(st, 0.7)]]));
  p.ell(400, 470, 120, 26, st);
  p.poly([[360, 330], [440, 330], [430, 180], [370, 180]], "#c9b48a");
  p.ell(400, 160, 34, 34, "#c9b48a");
  for (const s of [-1, 1]) p.stroke(curve([400 + s * 100, 475], [400 + s * 220, 470], [400 + s * 260, 740], 12), 8, rgba("#cfeff0", 0.9));
  for (let x = 120; x < 700; x += 60) p.stroke([[x, 800], [x, 980]], 3, rgba(INK, 0.2));
};
/** market stall: 1000 x 900 design, base at y 890; full = goods (bread, apples, cabbages) or empty baskets */
export const stall = (p: KPen, seed: number, full = true) => {
  const r = rngK(seed); p.ow = 7;
  const aw = r() < 0.5 ? PAL.sea : PAL.sun, wood = "#9a6a42";
  for (const x of [120, 880]) p.poly(rrect(x - 14, 200, x + 14, 890, 4), wood);
  p.poly([[60, 200], [940, 200], [990, 330], [10, 330]], aw);
  for (let k = 0; k < 8; k++) p.poly([[60 + k * 110, 200], [115 + k * 110, 200], [ -6 + 10 + (k + 0.5) * 122.5, 330], [10 + k * 122.5, 330]], PAL.cream, 0);
  p.poly([[60, 200], [940, 200], [990, 330], [10, 330]], null);
  for (let k = 0; k < 9; k++) p.ell(10 + k * 122.5 + 61, 330, 61, 26, k % 2 ? aw : PAL.cream, 5);
  p.poly(rrect(80, 600, 920, 680, 6), shade(wood, 1.1));
  p.poly(rrect(100, 680, 900, 890, 4), p.lin(0, 680, 0, 890, [[0, wood], [1, shade(wood, 0.7)]]));
  for (let k = 0; k < 4; k++) {
    const cx = 200 + k * 200;
    p.poly([[cx - 80, 540], [cx + 80, 540], [cx + 66, 605], [cx - 66, 605]], "#c49a5a", 5);
    for (let q = 0; q < 6; q++) p.stroke([[cx - 76 + q * 30, 548], [cx - 62 + q * 26, 600]], 3, rgba(INK, 0.3));
    if (!full) continue;
    const kind = (seed + k) % 3;
    for (let q = 0; q < 5; q++) {
      const x = cx - 50 + q * 25, y = 530 - (q % 2) * 18;
      if (kind === 0) p.ell(x, y, 26, 18, "#d9a053", 4);
      else if (kind === 1) p.ell(x, y, 17, 17, q % 2 ? PAL.red : "#7fb04a", 4);
      else p.ell(x, y, 24, 22, "#8fc07a", 4);
    }
  }
};
/** a pair of barrels: 600 x 500 design, base at y 490 */
export const barrels = (p: KPen, seed: number) => {
  p.ow = 7;
  for (const [cx, w, h] of [[200, 150, 360], [430, 130, 300]] as [number, number, number][]) {
    const body: P2[] = [[cx - w * 0.85, 490], ...curve([cx - w * 0.85, 490], [cx - w * 1.08, 490 - h / 2], [cx - w * 0.85, 490 - h], 10).slice(1), [cx + w * 0.85, 490 - h], ...curve([cx + w * 0.85, 490 - h], [cx + w * 1.08, 490 - h / 2], [cx + w * 0.85, 490], 10).slice(1)];
    p.poly(body, p.lin(cx - w, 0, cx + w, 0, [[0, "#c4945a"], [0.5, "#a8743e"], [1, "#6a4426"]]));
    for (const y of [0.18, 0.5, 0.82]) p.band([[cx - w * (y === 0.5 ? 1.0 : 0.92), 490 - h * y], [cx + w * (y === 0.5 ? 1.0 : 0.92), 490 - h * y]], "#3a3a3e", 10, 3, "butt");
    p.ell(cx, 490 - h, w * 0.85, 24, "#b88a52", 6);
  }
  void seed;
};
/** a two-wheeled hand cart with sacks (or empty): 1100 x 650 design, base at y 640 */
export const cart = (p: KPen, sacks = true) => {
  p.ow = 7;
  const wood = "#9a6a42";
  p.band([[60, 360], [-0 + 300, 420]], wood, 22, 4);
  p.poly(rrect(250, 300, 1000, 470, 8), p.lin(0, 300, 0, 470, [[0, tint(wood, 0.1)], [1, shade(wood, 0.75)]]));
  for (let x = 300; x < 1000; x += 70) p.stroke([[x, 305], [x, 465]], 3, rgba(INK, 0.3));
  if (sacks) for (let k = 0; k < 3; k++) { const cx = 400 + k * 220; p.poly([[cx - 100, 310], [cx - 80, 170], [cx, 140], [cx + 80, 170], [cx + 100, 310]], "#d8c49a", 6); p.stroke([[cx - 30, 165], [cx + 30, 165]], 6, "#8a6a4a"); }
  p.ell(640, 520, 120, 120, null, 12); p.ell(640, 520, 120, 120, null, 6);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; p.stroke([[640, 520], [640 + Math.cos(a) * 112, 520 + Math.sin(a) * 112]], 9, "#6a4426"); }
  p.ell(640, 520, 116, 116, null, 14); p.ell(640, 520, 22, 22, "#4a3a2a", 5);
};
/** a bunting string between two houses: 2000 x 300 design, laid along the card */
export const bunting = (p: KPen, seed: number) => {
  p.ow = 5;
  const rope = curve([0, 30], [1000, 210], [2000, 30], 30);
  p.stroke(rope, 5, "#5a4030");
  const cols = [PAL.sea, PAL.sun, PAL.cream, PAL.red, PAL.teal, PAL.mint];
  for (let k = 1; k < 30; k++) { const [x, y] = rope[k]; p.poly([[x - 26, y], [x + 26, y + 2], [x + 2, y + 66]], cols[(k + seed) % cols.length], 4); }
};
/** a hanging inn sign on a bracket: 500 x 500 design, centre */
export const innSign = (p: KPen, seed: number) => {
  p.ow = 6;
  p.band([[40, 60], [460, 60]], "#2a2a2e", 10, 3);
  p.stroke([[60, 60], [130, 140]], 6); p.stroke([[440, 60], [370, 140]], 6);
  p.poly(rrect(110, 130, 390, 400, 18), seed % 2 ? PAL.sea : PAL.teal);
  p.poly(rrect(130, 150, 370, 380, 12), null, 4);
  if (seed % 2) { p.ell(250, 270, 70, 50, PAL.sun, 5); p.poly([[180, 250], [320, 250], [300, 330], [200, 330]], "#c49a5a", 5); }
  else { p.poly([[200, 330], [250, 190], [300, 330]], PAL.sun, 5); p.ell(250, 250, 20, 20, PAL.red, 4); }
};

// ---------------- grounds (paintTex draw fns) ----------------
/** cobbles: tileable 1024 x 1024 (repeat it) */
export const cobblePaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(51);
  g.fillStyle = "#8a7c66"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 42) for (let x = ((y / 42) % 2) * 26; x < 1024 + 52; x += 52) {
    const c = mix("#b9a888", "#d6c6a2", r()), w = 22 + r() * 4, h = 17 + r() * 3;
    g.fillStyle = c; g.beginPath(); g.ellipse(x, y + 21, w, h, 0, 0, TAU); g.fill();
    g.fillStyle = rgba("#ffffff", 0.12); g.beginPath(); g.ellipse(x - 5, y + 16, w * 0.55, h * 0.45, 0, 0, TAU); g.fill();
  }
};
/** the famine field: dry furrows, tileable 1024 x 1024 */
export const fieldPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(61);
  g.fillStyle = "#b8955e"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 32) { g.fillStyle = rgba("#7a5a34", 0.35); g.fillRect(0, y, 1024, 9); g.fillStyle = rgba("#e2c48a", 0.25); g.fillRect(0, y + 12, 1024, 6); }
  for (let k = 0; k < 900; k++) { const x = r() * 1024, y = r() * 1024; g.strokeStyle = rgba("#e8cf8a", 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 8 - r() * 8); g.stroke(); }
};
/** stone floor slabs: tileable 1024 x 1024 */
export const slabPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(71);
  g.fillStyle = "#5e6a66"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 128) for (let x = 0; x < 1024; x += 128) { g.fillStyle = mix("#8a948c", "#a7ae9e", r()); g.fillRect(x + 4, y + 4, 120, 120); }
};
/** wooden floor boards: tileable 1024 x 1024 */
export const boardPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(81);
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = mix("#7a5232", "#946640", r()); g.fillRect(x, 0, 64, 1024); g.fillStyle = rgba(INK, 0.4); g.fillRect(x, 0, 3, 1024); }
};

// ---------------- the archive ----------------
/** plaster wall with book shelves and a small window: 2400 x 1400 design, base at y 1400 */
export const archiveWall = (p: KPen) => {
  const g = p.g; p.ow = 8;
  p.poly([[0, 0], [2400, 0], [2400, 1400], [0, 1400]], p.lin(0, 0, 0, 1400, [[0, "#d8c8a4"], [1, "#b8a47e"]]), 0);
  for (let k = 0; k < 50; k++) { g.fillStyle = rgba("#7a6a4a", 0.1); g.beginPath(); g.ellipse(hash(k, 1) * 2400, hash(k, 2) * 1400, 40, 18, 0, 0, TAU); g.fill(); }
  // beams
  for (const x of [80, 1180, 2320]) p.poly(rrect(x - 30, 0, x + 30, 1400, 4), "#5a3a26");
  p.band([[0, 90], [2400, 90]], "#5a3a26", 50, 4, "butt");
  // shelves
  for (const [x0, x1] of [[150, 1100], [1260, 2250]] as [number, number][]) for (let s = 0; s < 4; s++) {
    const y = 360 + s * 230;
    p.poly(rrect(x0, y, x1, y + 22, 3), "#7a5232", 5);
    let x = x0 + 14;
    const r = rngK(x0 + s * 7);
    while (x < x1 - 40) {
      const w = 28 + r() * 34, h = 120 + r() * 70, c = [PAL.teal, "#8a3a2a", "#3f6a4a", "#a8743e", PAL.sea, "#6a4a30"][Math.floor(r() * 6)];
      if (r() < 0.12) { p.ell(x + 50, y - 30, 50, 30, "#efe2c0", 5); x += 110; continue; }
      p.poly(rrect(x, y - h, x + w, y, 4), c, 4); p.stroke([[x + 4, y - h + 20], [x + w - 4, y - h + 20]], 4, PAL.brass);
      x += w + 3;
    }
  }
};
/** the desk front: 1600 x 560 design, base at y 550 (top edge at y 0 = DESK_Y with w 2.8 -> h 0.98) */
export const deskFront = (p: KPen) => {
  p.ow = 8;
  p.poly(rrect(0, 0, 1600, 70, 6), "#8a5a34");
  p.poly(rrect(40, 70, 1560, 550, 4), p.lin(0, 70, 0, 550, [[0, "#7a4e2c"], [1, "#4a2e1a"]]));
  for (const x of [400, 800, 1200]) p.stroke([[x, 80], [x, 540]], 6, rgba(INK, 0.6));
  for (let k = 0; k < 4; k++) { const cx = 220 + k * 400; p.poly(rrect(cx - 120, 160, cx + 120, 420, 14), null, 5); p.ell(cx, 290, 22, 22, PAL.brass, 4); }
};
/** a book open on a slanted lectern: 800 x 760 design, base at y 750. kind 0 = the later chronicle, 1 = the city records */
export const lecternBook = (p: KPen, kind: 0 | 1) => {
  const g = p.g; p.ow = 7;
  p.poly([[300, 750], [330, 560], [470, 560], [500, 750]], "#6a4426");
  p.poly([[40, 560], [760, 560], [700, 120], [100, 120]], "#7a4e2c");
  const pg = (s: number): P2[] => s < 0 ? [[90, 520], [400, 545], [400, 150], [140, 140]] : [[400, 545], [710, 520], [660, 140], [400, 150]];
  for (const s of [-1, 1]) p.poly(pg(s), p.lin(s < 0 ? 90 : 400, 0, s < 0 ? 400 : 710, 0, s < 0 ? [[0, "#fbf1d6"], [1, "#e6d6ae"]] : [[0, "#e6d6ae"], [1, "#fbf1d6"]]));
  p.stroke([[400, 150], [400, 545]], 5, rgba(INK, 0.6));
  g.fillStyle = INK; g.textAlign = "center";
  if (kind === 0) {
    g.font = `bold 34px ${SERIF}`; g.fillText("CHRONICLE", 262, 205);
    g.font = `italic 22px ${SERIF}`; g.fillStyle = "#5a4030"; g.fillText("written years later", 262, 240);
    for (let k = 0; k < 7; k++) p.stroke([[150, 280 + k * 34], [370 - (k % 3) * 30, 280 + k * 34]], 4, rgba(INK, 0.45));
    g.fillStyle = PAL.red; g.font = `bold 92px ${SERIF}`; g.fillText("15", 545, 330);
    g.font = `bold 40px ${SERIF}`; g.fillText("a day?", 545, 390);
    for (let k = 0; k < 3; k++) p.stroke([[440, 440 + k * 30], [650 - k * 20, 440 + k * 30]], 4, rgba(INK, 0.4));
  } else {
    g.font = `bold 30px ${SERIF}`; g.fillText("CITY RECORDS", 262, 205);
    g.font = `bold 30px ${SERIF}`; g.fillText("1518", 262, 245);
    for (let k = 0; k < 7; k++) p.stroke([[150, 285 + k * 34], [370 - (k % 2) * 40, 285 + k * 34]], 4, rgba(INK, 0.45));
    g.fillStyle = INK; g.font = `bold 34px ${SERIF}`; g.fillText("Deaths:", 545, 270);
    g.fillStyle = "#1f5f66"; g.font = `bold 58px ${SERIF}`; g.fillText("none", 545, 345);
    g.font = `bold 30px ${SERIF}`; g.fillText("mentioned", 545, 390);
    for (let k = 0; k < 3; k++) p.stroke([[440, 440 + k * 30], [650 - k * 20, 440 + k * 30]], 4, rgba(INK, 0.4));
  }
  g.textAlign = "start";
  // ribbon bookmark + a quill in an inkpot on the side
  p.band([[400, 545], [420, 640]], PAL.red, 12, 3);
};
/** a candle in a brass holder: 200 x 600 design, base at y 590; t animates the flame */
export const candle = (p: KPen, t: number, seed: number) => {
  p.ow = 5;
  p.ell(100, 580, 80, 16, PAL.brass, 5);
  p.poly(rrect(80, 330, 120, 580, 6), p.lin(80, 0, 120, 0, [[0, "#fbf3dc"], [1, "#d8c8a0"]]));
  p.stroke([[100, 330], [100, 310]], 4);
  flame(p, 100, 300, 34, t, seed);
};

// ---------------- the famine field ----------------
/** a bare dead tree: 1200 x 1500 design, base at y 1490 */
export const deadTree = (p: KPen, seed: number) => {
  const r = rngK(seed); p.ow = 7;
  const bark = "#5a4434";
  const limb = (x: number, y: number, a: number, len: number, w: number, d: number) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    p.taper([x, y], [x2, y2], w, w * 0.6, INK); p.taper([x, y], [x2, y2], w - 6, w * 0.6 - 6, bark);
    if (d > 0) { limb(x2, y2, a - 0.35 - r() * 0.3, len * 0.72, w * 0.62, d - 1); limb(x2, y2, a + 0.3 + r() * 0.3, len * 0.68, w * 0.6, d - 1); }
  };
  limb(600, 1490, -Math.PI / 2 + 0.05, 520, 90, 4);
};
/** a crow: 200 x 140 design, centre; wing 0..1 flap */
export const crow = (p: KPen, wing: number) => {
  p.ow = 4;
  const w = Math.sin(wing * TAU);
  p.poly([[100, 70], [20, 70 - 50 * w], [60, 78]], "#1c2226");
  p.poly([[100, 70], [180, 70 - 50 * w], [140, 78]], "#1c2226");
  p.ell(100, 76, 28, 16, "#22292d");
  p.ell(126, 70, 12, 10, "#22292d"); p.poly([[136, 68], [154, 72], [136, 75]], "#d9a441", 2);
};
/** the city far away: walls, towers and the cathedral spire, 3000 x 900 design, base at y 890 */
export const cityFar = (p: KPen) => {
  p.ow = 6;
  const c = "#8aa6a0", d = "#6f8e8a";
  p.poly([[0, 890], [0, 700], [3000, 700], [3000, 890]], d, 0);
  for (let k = 0; k < 24; k++) { const x = 60 + k * 125, h = 120 + hash(k, 3) * 150; p.poly([[x, 700], [x, 700 - h], [x + 55, 700 - h - 70], [x + 110, 700 - h], [x + 110, 700]], k % 3 ? c : d, 4); }
  for (const x of [400, 1100, 2300]) { p.poly(rrect(x - 50, 420, x + 50, 720, 4), d, 5); p.poly([[x - 60, 420], [x, 330], [x + 60, 420]], "#a8584a", 5); }
  p.poly([[1580, 720], [1580, 380], [1700, 380], [1700, 720]], c, 5);
  p.poly([[1600, 380], [1640, 40], [1680, 380]], c, 5);
  p.poly([[0, 890], [0, 760], [3000, 760], [3000, 890]], "#9c8a62", 0);
  for (let x = 0; x < 3000; x += 40) p.poly(rrect(x, 735, x + 26, 765, 2), "#8a7a58", 0);
};

// ---------------- the chapel ----------------
/** the chapel's back wall: stone, a tall stained-glass window, two arches: 2600 x 2200 design, base at y 2200 */
export const chapelWall = (p: KPen) => {
  const g = p.g; p.ow = 9;
  p.poly([[0, 0], [2600, 0], [2600, 2200], [0, 2200]], p.lin(0, 0, 0, 2200, [[0, "#54625e"], [0.5, "#7a847a"], [1, "#8e9688"]]), 0);
  for (let y = 0; y < 2200; y += 90) for (let x = ((y / 90) % 2) * 80; x < 2600; x += 160) { g.strokeStyle = rgba(INK, 0.2); g.lineWidth = 3; g.strokeRect(x, y, 160, 90); }
  // tall window: teal, sea-green, sunflower, cream glass (no purple)
  const cx = 1300, w = 230, top = 300, bot = 1250;
  const win: P2[] = [[cx - w, bot], [cx - w, top + w], ...curve([cx - w, top + w], [cx - w, top], [cx, top - 120], 8).slice(1), ...curve([cx, top - 120], [cx + w, top], [cx + w, top + w], 8).slice(1), [cx + w, bot]];
  p.poly(win, "#1f4a50");
  p.clip(win, () => {
    const cols = ["#3fae9a", "#f2b632", "#9fd8c4", "#1f6f7a", "#f6ecd2", "#e8643a", "#2f8f83"];
    for (let y = top - 120; y < bot; y += 70) for (let x = cx - w; x < cx + w; x += 76) {
      g.fillStyle = cols[Math.floor(hash(x * 0.37 + y, 5) * cols.length)]; g.fillRect(x + 4, y + 4, 68, 62);
    }
    p.glow(cx, top + 300, 360, "#fff4c8", 0.5);
  });
  for (let x = cx - w + 76; x < cx + w; x += 76) p.stroke([[x, top - 60], [x, bot]], 7, "#2a3a3a");
  for (let y = top; y < bot; y += 70) p.stroke([[cx - w, y], [cx + w, y]], 6, "#2a3a3a");
  p.poly(win, null, 16);
  // side arches (dark niches)
  for (const ax of [420, 2180]) {
    const a: P2[] = [[ax - 170, 2200], [ax - 170, 1150], ...curve([ax - 170, 1150], [ax - 170, 900], [ax, 820], 8).slice(1), ...curve([ax, 820], [ax + 170, 900], [ax + 170, 1150], 8).slice(1), [ax + 170, 2200]];
    p.poly(a, p.lin(0, 820, 0, 2200, [[0, "#26302e"], [1, "#3a4440"]]));
  }
};
/** the plinth of the saint's statue with a carved name: 600 x 600 design, base at y 590 (top edge = PLINTH_H at w 1.27) */
export const plinth = (p: KPen) => {
  const g = p.g; p.ow = 8;
  p.poly(rrect(20, 0, 580, 60, 6), "#c9bea2");
  p.poly(rrect(60, 60, 540, 540, 4), p.lin(60, 0, 540, 0, [[0, "#d8ceb2"], [1, "#9a9078"]]));
  p.poly(rrect(20, 540, 580, 590, 6), "#b8ad90");
  g.fillStyle = INK; g.textAlign = "center"; g.font = `bold 52px ${SERIF}`; g.fillText("S. VITUS", 300, 320); g.textAlign = "start";
  p.stroke([[120, 360], [480, 360]], 5, rgba(INK, 0.5));
};
/** the altar with a white cloth and a gold trim: 1600 x 700 design, base at y 690 */
export const altar = (p: KPen) => {
  p.ow = 8;
  p.poly(rrect(60, 120, 1540, 690, 6), p.lin(0, 120, 0, 690, [[0, "#b8ad90"], [1, "#8a8270"]]));
  p.poly([[40, 100], [1560, 100], [1500, 420], [100, 420]], "#f6f0de");
  for (let x = 120; x < 1500; x += 90) p.poly([[x, 420], [x + 45, 470], [x + 90, 420]], "#f6f0de", 5);
  p.band([[60, 160], [1540, 160]], PAL.sun, 16, 3);
  p.poly(rrect(700, 220, 900, 360, 10), PAL.sea, 5);
  p.stroke([[800, 230], [800, 350]], 10, PAL.sun); p.stroke([[750, 270], [850, 270]], 10, PAL.sun);
};

/** a soft glow sprite (200 x 200) */
export const glowDot = (p: KPen, col: string, core = "#fff8e0") => { p.glow(100, 100, 100, col, 0.9); p.ell(100, 100, 14, 14, core, 0); };
/** a ripple ring laid flat: 512 x 512, ring thickness k (0..1) */
export const ring = (p: KPen, col: string) => {
  const g = p.g;
  g.fillStyle = p.rad(256, 256, 256, [[0, rgba(col, 0)], [0.78, rgba(col, 0)], [0.9, rgba(col, 0.85)], [0.96, rgba(col, 0.35)], [1, rgba(col, 0)]]);
  g.fillRect(0, 0, 512, 512);
};
/** a dust puff: 400 x 260, bottom-centre */
export const dustPuff = (p: KPen, seed: number) => {
  const r = rngK(seed + 100);
  for (let i = 0; i < 7; i++) { const x = 90 + r() * 220, y = 200 - r() * 110, rr = 50 + r() * 60; p.g.fillStyle = p.rad(x, y, rr, [[0, rgba("#d8c8a0", 0.6)], [1, rgba("#d8c8a0", 0)]]); p.g.beginPath(); p.g.arc(x, y, rr, 0, TAU); p.g.fill(); }
};
/** a sun-dust mote sprite */
export const mote = (p: KPen) => { p.glow(50, 50, 50, "#fff2c8", 0.8); };
void ellPts;
