// Canvas art for "The Tanganyika Laughter Epidemic (1962)": north-west Tanganyika (Kagera, near Bukoba on Lake Victoria)
// drawn with the visual kit pen (ink outlines, form shading, texture). Each prop documents its design size and base line
// (bottom-centre = where it stands). A whitewashed mission girls' school with a red corrugated-iron roof and a teal verandah,
// banana trees (the region's matoke groves), green hills and the lake; a classroom (back wall with louvred windows, wooden
// double desks, the blackboard wall), a dormitory (iron beds, mosquito nets, tin trunks, a wall clock), a dusty road and a
// 1950s lorry, round thatched houses and rectangular mud-brick houses with tin roofs, a small clinic (bottle shelves, test
// tubes, microscope), a map of the spread, and the new Tanganyika flag (green, a black band edged in gold) with bunting.
// Palette: sea-green / teal / cream / sunflower with warm earth reds; never purple. Everything is seeded (rngK / hash).
import { KPen, type P2, PAL, INK, TAU, hash, mix, shade, tint, rgba, rrect, curve, rngK, ellPts, lerp } from "../../engine/kit/core";
import { KIT_FONT } from "../../engine/kit/captions";

export const TZ = { green: "#1eb53a", black: "#1a1a1a", gold: "#fcd116" }; // Tanganyika flag 1961
const ROOF = ["#b5532f", "#a8482a", "#c4683a", "#9a4a2e"], MUD = ["#b86a3e", "#a95e36", "#c47a48", "#9e5a34"];
const THATCH = ["#c9a25a", "#b8914c", "#d4ae66"];
const LEAF = ["#3f8a4a", "#4d9a52", "#2f7a46", "#5aa85a"];

// ---------------- the school ----------------
/** the mission school block: 2400 x 900, base at y 890. Whitewashed walls, red tin roof, teal verandah posts, louvred windows,
 *  double doors (drawn open: dark), a small gable with a cross at one end, the bell on a post. */
export const schoolHouse = (p: KPen, seed: number) => {
  const r = rngK(seed), g = p.g; p.ow = 8;
  const base = 890, eave = 380, x0 = 120, x1 = 2280;
  // roof (corrugated, seen from the front: a band with vertical ridges)
  const roof: P2[] = [[x0 - 60, eave + 20], [x0 + 140, 170], [x1 - 140, 170], [x1 + 60, eave + 20]];
  p.poly(roof, p.lin(0, 170, 0, eave, [[0, tint(ROOF[seed % 4], 0.15)], [1, shade(ROOF[seed % 4], 0.8)]]), 0);
  p.clip(roof, () => { for (let x = x0 - 80; x < x1 + 80; x += 22) p.stroke([[x, 160], [x + (x - 1200) * 0.06, eave + 30]], 4, rgba(INK, 0.22)); for (let k = 0; k < 7; k++) { const x = x0 + r() * (x1 - x0); g.fillStyle = rgba("#7a3a1e", 0.25); g.fillRect(x, 180, 60 + r() * 80, eave - 160); } });
  p.poly(roof, null);
  // gable with a cross (mission) at the left end
  const gx = 360;
  p.poly([[gx - 170, eave + 10], [gx, 70], [gx + 170, eave + 10]], "#f3ecd8");
  p.stroke([[gx, 18], [gx, 92]], 10); p.stroke([[gx - 26, 42], [gx + 26, 42]], 10);
  p.ell(gx, 250, 36, 36, PAL.teal, 6);
  // walls
  const wall: P2[] = [[x0, eave], [x1, eave], [x1, base], [x0, base]];
  p.poly(wall, p.lin(0, eave, 0, base, [[0, "#f6efdc"], [1, "#e6dcc0"]]), 0);
  p.clip(wall, () => {
    g.fillStyle = "#b8643a"; g.fillRect(0, base - 90, 2400, 90);                       // red earth plinth
    g.fillStyle = p.lin(0, eave, 0, eave + 70, [[0, rgba(INK, 0.45)], [1, rgba(INK, 0)]]); g.fillRect(0, eave, 2400, 70);
    for (let k = 0; k < 30; k++) { g.fillStyle = rgba("#b8643a", 0.12); g.beginPath(); g.ellipse(x0 + r() * (x1 - x0), base - 100 - r() * 60, 30 + r() * 50, 10, 0, 0, TAU); g.fill(); }
  });
  p.poly(wall, null);
  // windows (teal louvres) and two double doors
  const doors = [820, 1600];
  for (let x = x0 + 120; x < x1 - 80; x += 190) {
    if (doors.some((d) => Math.abs(d - (x + 60)) < 140)) continue;
    p.poly(rrect(x, eave + 120, x + 120, eave + 330, 6), "#f6ecd2");
    for (let y = eave + 135; y < eave + 320; y += 22) p.band([[x + 10, y], [x + 110, y + 8]], PAL.sea, 12, 2, "butt");
    p.poly(rrect(x, eave + 120, x + 120, eave + 330, 6), null, 6);
  }
  for (const d of doors) {
    p.poly(rrect(d - 95, eave + 90, d + 95, base, 4), "#2a2018");
    p.poly(rrect(d - 95, eave + 90, d - 70, base, 3), PAL.teal, 5); p.poly(rrect(d + 70, eave + 90, d + 95, base, 3), PAL.teal, 5);
  }
  // verandah posts + a timber beam
  p.band([[x0 - 20, eave + 30], [x1 + 20, eave + 30]], "#5a3a26", 26, 4, "butt");
  for (let x = x0 + 40; x <= x1 - 40; x += 270) p.poly(rrect(x - 16, eave + 30, x + 16, base, 4), PAL.teal, 5);
  // a school bell on a post at the right
  p.poly(rrect(x1 - 120, eave - 40, x1 - 104, base, 3), "#5a3a26", 4);
  p.poly([[x1 - 150, eave - 20], [x1 - 74, eave - 20], [x1 - 84, eave + 50], [x1 - 140, eave + 50]], PAL.brass, 5);
};

/** a banana tree: 900 x 1400, base at y 1390. A clump of trunks, big split leaves arching, a hanging bunch + a dark red bud. */
export const bananaTree = (p: KPen, seed: number) => {
  const r = rngK(seed + 7); p.ow = 6;
  const lc = LEAF[seed % 4], base = 1390;
  const trunks = [[450, 1], [380 + r() * 20, 0.75], [530 - r() * 20, 0.6]] as [number, number][];
  for (const [x, k] of trunks) {
    const top = base - 760 * k;
    p.poly([[x - 34 * k, base], [x - 22 * k, top], [x + 22 * k, top], [x + 36 * k, base]], p.lin(x - 40, 0, x + 40, 0, [[0, "#8aa65a"], [0.6, "#6f8e4a"], [1, "#4e6a38"]]));
    for (let i = 0; i < 4; i++) p.stroke([[x - 20 * k, base - 120 * i - 60], [x + 20 * k, base - 120 * i - 100]], 3, rgba("#3a4a2a", 0.6));
  }
  // dry hanging leaves (brown) at the bottom
  for (const s of [-1, 1]) p.poly([[450, 980], [450 + s * 60, 1010], [450 + s * 120, 1260], [450 + s * 90, 1270]], "#a88a50", 4);
  // leaves: long blades fanning from the crown, split edges
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i / (N - 1) - 0.5) * 2.9 + (r() - 0.5) * 0.2, L = 330 + r() * 150, cx = 450, cy = 640 + r() * 40;
    const tip: P2 = [cx + Math.cos(a) * L, cy + Math.sin(a) * L * 0.7 + Math.abs(Math.cos(a)) * 160];
    const mid: P2 = [cx + Math.cos(a) * L * 0.55, cy + Math.sin(a) * L * 0.7 - 40];
    const nx = -Math.sin(a), ny = Math.cos(a), w = 70 + r() * 25;
    const col = mix(lc, i % 3 ? "#6ab86a" : "#2f6a3e", r() * 0.5);
    const leaf: P2[] = [[cx, cy], ...curve([cx + nx * w * 0.3, cy + ny * w * 0.3], [mid[0] + nx * w, mid[1] + ny * w], tip, 10), ...curve(tip, [mid[0] - nx * w * 0.8, mid[1] - ny * w * 0.8], [cx - nx * w * 0.2, cy - ny * w * 0.2], 10)];
    p.poly(leaf, col);
    p.stroke(curve([cx, cy], mid, tip, 10), 4, shade(col, 0.6));
    for (let k = 1; k < 6; k++) { const q = curve([cx, cy], mid, tip, 6)[k]; p.stroke([q, [q[0] + nx * w * 0.8, q[1] + ny * w * 0.8]], 2, rgba(INK, 0.25)); }
  }
  // the hanging bunch + bud
  if (seed % 2 === 0) {
    p.stroke(curve([470, 660], [560, 700], [560, 800]), 10, "#6f8e4a");
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) p.ell(530 + j * 18, 720 + k * 26, 13, 22, "#8ab44a", 3);
    p.ell(562, 860, 26, 46, "#8a2a2a", 4);
  }
};

/** far green hills with Lake Victoria in between: 3000 x 900, base at y 890 */
export const hillsFar = (p: KPen, seed: number, lake = true) => {
  const r = rngK(seed); p.ow = 0;
  if (lake) {
    p.poly([[0, 520], [3000, 470], [3000, 640], [0, 660]], p.lin(0, 470, 0, 660, [[0, "#9fd8d0"], [1, "#4fa8a8"]]), 0);
    for (let k = 0; k < 40; k++) { const x = r() * 3000, y = 500 + r() * 130; p.stroke([[x, y], [x + 30 + r() * 50, y]], 3, rgba("#ffffff", 0.6)); }
  }
  const layer = (y0: number, amp: number, col: string, n: number) => {
    const pts: P2[] = [[0, 900]];
    for (let i = 0; i <= n; i++) { const x = (i / n) * 3000; pts.push([x, y0 - amp * (0.5 + 0.5 * Math.sin(i * 1.3 + seed) * Math.cos(i * 0.7 + r()))]); }
    pts.push([3000, 900]);
    p.poly(pts, col, 0);
  };
  layer(lake ? 470 : 420, 160, "#7fb89a", 9);
  if (lake) p.poly([[0, 560], [3000, 520], [3000, 660], [0, 680]], p.lin(0, 520, 0, 680, [[0, "#8fd0cc"], [1, "#4f9ea4"]]), 0);
  layer(720, 170, "#4f9a6a", 12);
  layer(840, 120, "#3f8a5a", 16);
  // tiny far banana groves + roofs
  for (let k = 0; k < 70; k++) { const x = r() * 3000, y = 700 + r() * 170; p.g.fillStyle = rgba(r() < 0.5 ? "#2f6a46" : "#3a7a4e", 0.9); p.g.beginPath(); p.g.ellipse(x, y, 16 + r() * 20, 10 + r() * 8, 0, 0, TAU); p.g.fill(); }
  for (let k = 0; k < 9; k++) { const x = r() * 3000, y = 760 + r() * 100; p.poly([[x - 16, y], [x, y - 14], [x + 16, y]], "#c4683a", 0); }
};

// ---------------- village ----------------
/** a round house with a conical thatch: 800 x 900, base at y 880 */
export const roundHut = (p: KPen, seed: number) => {
  const r = rngK(seed), mud = MUD[seed % 4], th = THATCH[seed % 3]; p.ow = 7;
  const base = 880, top = 520, x0 = 170, x1 = 630;
  const wall: P2[] = [[x0, top], [x1, top], [x1, base - 10], ...ellPts(400, base - 10, (x1 - x0) / 2, 22, 0, 180, 0, 12).slice(1, -1), [x0, base - 10]];
  p.poly(wall, p.lin(x0, 0, x1, 0, [[0, shade(mud, 0.8)], [0.4, tint(mud, 0.1)], [1, shade(mud, 0.7)]]));
  p.clip(wall, () => { for (let k = 0; k < 30; k++) { p.g.fillStyle = rgba(shade(mud, 0.6), 0.25); p.g.beginPath(); p.g.ellipse(x0 + r() * (x1 - x0), top + r() * (base - top), 8 + r() * 16, 4 + r() * 6, 0, 0, TAU); p.g.fill(); } });
  const dx = 400 + (r() - 0.5) * 80;
  p.poly([[dx - 60, base - 4], [dx - 60, top + 120], ...ellPts(dx, top + 120, 60, 40, 180, 360, 0, 10).slice(1, -1), [dx + 60, top + 120], [dx + 60, base - 4]], "#2a1a12", 6);
  const roof: P2[] = [[x0 - 110, top + 60], [400, 40 + r() * 30], [x1 + 110, top + 60], ...ellPts(400, top + 60, (x1 - x0) / 2 + 110, 34, 0, 180, 0, 14).slice(1, -1)];
  p.poly(roof, p.lin(0, 40, 0, top + 80, [[0, tint(th, 0.15)], [1, shade(th, 0.72)]]), 0);
  p.clip(roof, () => { for (let k = 0; k < 220; k++) { const x = x0 - 110 + r() * (x1 - x0 + 220), y = 60 + r() * (top); p.stroke([[x, y], [x + (x - 400) * 0.08, y + 40]], 2 + r() * 2, rgba(r() < 0.5 ? shade(th, 0.6) : tint(th, 0.3), 0.6)); } });
  p.poly(roof, null);
  p.band([[392, 40], [408, 40]], shade(th, 0.6), 22, 3);
};
/** a rectangular mud-brick house with a corrugated tin roof: 1000 x 800, base at y 790 */
export const tinHouse = (p: KPen, seed: number) => {
  const r = rngK(seed + 3), mud = MUD[(seed + 1) % 4]; p.ow = 7;
  const base = 790, top = 380, x0 = 120, x1 = 880;
  p.poly([[x0, top], [x1, top], [x1, base], [x0, base]], p.lin(0, top, 0, base, [[0, tint(mud, 0.12)], [1, shade(mud, 0.85)]]));
  p.clip([[x0, top], [x1, top], [x1, base], [x0, base]], () => {
    p.g.fillStyle = rgba(seed % 2 ? "#f3ecd8" : "#cfe3d2", 0.85); p.g.fillRect(0, top + 40, 1000, base - top - 160);   // limewash band
    for (let y = top; y < base; y += 40) for (let x = x0 + ((y / 40) % 2) * 40; x < x1; x += 80) p.stroke([[x, y], [x + 78, y]], 2, rgba(INK, 0.12));
  });
  p.poly([[x0, top], [x1, top], [x1, base], [x0, base]], null);
  p.poly(rrect(430, top + 140, 560, base, 4), seed % 2 ? PAL.teal : "#8a3a2a", 6);
  p.poly(rrect(200, top + 140, 320, top + 260, 4), "#2a2018", 5); p.stroke([[260, top + 140], [260, top + 260]], 6, PAL.sea);
  p.poly(rrect(680, top + 140, 800, top + 260, 4), "#2a2018", 5); p.stroke([[740, top + 140], [740, top + 260]], 6, PAL.sea);
  const roof: P2[] = [[x0 - 60, top + 20], [x0 + 20, top - 160], [x1 - 20, top - 160], [x1 + 60, top + 20]];
  p.poly(roof, p.lin(0, top - 160, 0, top + 20, [[0, "#c9ced0"], [1, "#8a9496"]]));
  p.clip(roof, () => { for (let x = x0 - 60; x < x1 + 60; x += 20) p.stroke([[x, top - 170], [x, top + 30]], 3, rgba(INK, 0.2)); p.g.fillStyle = rgba("#b5532f", 0.35); p.g.fillRect(x0 + r() * 400, top - 160, 160, 180); });
  p.poly(roof, null);
};

/** a 1950s lorry, side view facing screen-right: 1400 x 760, base at y 750. wheel = rotation (rad). Girls ride in the bed. */
export const lorry = (p: KPen, wheel: number) => {
  p.ow = 8;
  const base = 750, wy = 650, wr = 95;
  // chassis + bed (wooden slats)
  p.poly(rrect(80, 470, 1000, 560, 6), "#3a2a20");
  p.poly(rrect(70, 250, 980, 480, 6), "#a8743e");
  for (let y = 280; y < 470; y += 48) p.stroke([[80, y], [970, y]], 4, rgba(INK, 0.35));
  for (const x of [70, 380, 680, 980]) p.poly(rrect(x - 12, 240, x + 12, 480, 3), "#5a3a26", 5);
  // cab + bonnet (sea-green)
  p.poly([[1000, 560], [1000, 230], [1150, 200], [1210, 330], [1360, 360], [1370, 560]], p.lin(1000, 0, 1370, 0, [[0, "#2f8f83"], [1, "#1f6f66"]]));
  p.poly([[1030, 250], [1140, 228], [1190, 330], [1030, 330]], "#bfe4e8", 6);
  p.stroke([[1210, 330], [1220, 560]], 4, rgba(INK, 0.5));
  for (let y = 400; y < 540; y += 26) p.stroke([[1340, y], [1368, y]], 5, PAL.cream);
  p.ell(1360, 380, 16, 20, "#fff2b0", 5);
  p.poly(rrect(1300, 540, 1385, 572, 6), "#9aa0a2", 5);
  // wheels
  for (const x of [270, 1170]) {
    p.ell(x, wy, wr + 20, 30, rgba(INK, 0.25), 0);
    p.ell(x, wy - 30, wr, wr, "#1f2224");
    p.ell(x, wy - 30, wr * 0.5, wr * 0.5, "#c9ced0", 6);
    for (let k = 0; k < 5; k++) { const a = wheel + (k * TAU) / 5; p.dot(x + Math.cos(a) * wr * 0.3, wy - 30 + Math.sin(a) * wr * 0.3, 7, INK); }
  }
  p.poly(ellPts(270, wy - 30, wr + 30, wr + 30, 180, 360, 0, 12), null, 8);
  p.poly(ellPts(1170, wy - 30, wr + 30, wr + 30, 180, 360, 0, 12), null, 8);
  void base;
};
/** a tin suitcase: 300 x 200, base at y 195 */
export const suitcase = (p: KPen, seed: number) => {
  const c = [PAL.teal, "#8a3a2a", PAL.mustard, "#3f6a4a"][seed % 4];
  p.poly(rrect(20, 60, 280, 195, 10), p.lin(0, 60, 0, 195, [[0, tint(c, 0.15)], [1, shade(c, 0.8)]]), 6);
  p.stroke([[20, 100], [280, 100]], 4, rgba(INK, 0.5)); p.poly(rrect(120, 30, 180, 62, 8), null, 6);
  p.dot(80, 120, 8, PAL.brass); p.dot(220, 120, 8, PAL.brass);
};

// ---------------- classroom ----------------
/** classroom back wall: 3000 x 1400, base at y 1400. Cream above a teal dado; three louvred windows with banana leaves and
 *  sun outside; a cupboard; a map of Africa; a wall calendar; a framed picture; a clock. */
export const classWall = (p: KPen, seed: number) => {
  const g = p.g, r = rngK(seed); p.ow = 8;
  p.poly([[0, 0], [3000, 0], [3000, 1400], [0, 1400]], p.lin(0, 0, 0, 1400, [[0, "#f3e9cf"], [1, "#e6d8b6"]]), 0);
  g.fillStyle = "#2f7f78"; g.fillRect(0, 900, 3000, 500); g.fillStyle = "#f2b632"; g.fillRect(0, 890, 3000, 18);
  for (let k = 0; k < 40; k++) { g.fillStyle = rgba("#b8a07a", 0.12); g.beginPath(); g.ellipse(r() * 3000, r() * 880, 40, 16, 0, 0, TAU); g.fill(); }
  for (const x of [320, 1260, 2460]) {
    p.poly(rrect(x - 190, 200, x + 190, 780, 6), p.lin(0, 200, 0, 780, [[0, "#bfe6f0"], [1, "#e8f4d8"]]));
    p.clip(rrect(x - 190, 200, x + 190, 780, 6), () => {
      for (let i = 0; i < 4; i++) { const cx = x - 160 + i * 110, cy = 420 + (i % 2) * 120; p.poly(ellPts(cx, cy, 120, 60, 0, 360, -20 + i * 15, 18), mix("#4d9a52", "#2f7a46", i % 2 ? 0.6 : 0), 4); }
      g.fillStyle = "#7fb89a"; g.fillRect(x - 190, 680, 380, 100);
    });
    p.poly(rrect(x - 190, 200, x + 190, 780, 6), null, 10);
    p.stroke([[x, 200], [x, 780]], 10, "#f6ecd2"); p.stroke([[x - 190, 490], [x + 190, 490]], 10, "#f6ecd2");
    // open teal shutters
    p.poly([[x - 190, 200], [x - 290, 220], [x - 290, 770], [x - 190, 780]], PAL.sea, 6);
    p.poly([[x + 190, 200], [x + 290, 220], [x + 290, 770], [x + 190, 780]], PAL.sea, 6);
    for (let y = 250; y < 760; y += 40) { p.stroke([[x - 280, y], [x - 200, y]], 4, rgba(INK, 0.4)); p.stroke([[x + 200, y], [x + 280, y]], 4, rgba(INK, 0.4)); }
  }
  // map of Africa poster
  p.poly(rrect(1680, 230, 2080, 720, 8), "#f6ecd2");
  p.poly([[1800, 290], [1940, 280], [2010, 380], [1990, 430], [2040, 470], [1990, 560], [1920, 680], [1880, 650], [1860, 520], [1790, 470], [1740, 390]], "#d9a441", 4);
  p.dot(1960, 470, 10, PAL.red);
  p.poly(rrect(1680, 230, 2080, 720, 8), null, 8);
  // calendar "1962"
  p.poly(rrect(820, 300, 1000, 520, 6), "#fbf4e2", 6); p.poly(rrect(820, 300, 1000, 360, 6), PAL.red, 6);
  g.fillStyle = INK; g.font = `800 44px ${KIT_FONT}`; g.textAlign = "center"; g.fillText("1962", 910, 345);
  for (let k = 0; k < 20; k++) p.dot(845 + (k % 5) * 32, 390 + Math.floor(k / 5) * 32, 6, rgba(INK, 0.6));
  // clock
  p.ell(2860, 300, 70, 70, "#fbf4e2", 8); p.stroke([[2860, 300], [2860, 250]], 7); p.stroke([[2860, 300], [2895, 312]], 7);
  // cupboard
  p.poly(rrect(2700, 520, 2960, 1400, 6), "#8a5a34"); p.stroke([[2830, 540], [2830, 1390]], 6); p.dot(2810, 960, 9, PAL.brass); p.dot(2850, 960, 9, PAL.brass);
  for (let k = 0; k < 4; k++) p.poly(rrect(2720 + k * 55, 430, 2760 + k * 55, 520, 4), [PAL.teal, PAL.red, PAL.mustard, "#3f6a4a"][k], 4);
  // a framed picture: the lake and a fishing boat
  p.poly(rrect(560, 300, 720, 420, 4), "#9fd8d0", 6); p.poly([[600, 380], [680, 380], [660, 398], [620, 398]], "#5a3a26", 3); p.stroke([[640, 380], [640, 330]], 3);
};

/** a wooden double desk, front view: 900 x 420, base at y 410 (top edge = the desk top). Books, slate, inkwell. */
export const desk = (p: KPen, seed: number) => {
  const r = rngK(seed + 11); p.ow = 7;
  p.poly([[20, 40], [880, 40], [870, 90], [30, 90]], "#a8743e");
  p.poly(rrect(40, 88, 860, 300, 4), p.lin(0, 88, 0, 300, [[0, "#8a5a34"], [1, "#6a4428"]]));
  for (let x = 60; x < 850; x += 70) p.stroke([[x, 100], [x, 290]], 2, rgba(INK, 0.15));
  for (const x of [60, 840]) p.poly(rrect(x - 16, 290, x + 16, 410, 3), "#5a3a26", 5);
  p.stroke([[60, 380], [840, 380]], 8, "#5a3a26");
  // things on the desk top
  const th = Math.floor(r() * 3);
  p.poly(rrect(120, 0, 290, 44, 4), [PAL.teal, PAL.red, PAL.mustard][th], 5);
  p.poly(rrect(560, 14, 760, 44, 3), "#f6ecd2", 5); p.stroke([[580, 28], [740, 28]], 3, rgba(INK, 0.4));
  p.ell(450, 44, 22, 10, "#1f2a2e", 4);
};
/** a girl seen from behind, seated on a bench (head, cropped hair or braids, uniform back): 600 x 800, base at y 795 */
export const girlBack = (p: KPen, skin: string, hair: string, uni: string, seed: number) => {
  p.ow = 7;
  p.poly([[110, 795], [90, 560], [80, 420], [170, 330], [430, 330], [520, 420], [510, 560], [490, 795]], p.lin(0, 330, 0, 795, [[0, tint(uni, 0.1)], [1, shade(uni, 0.8)]]));
  p.stroke([[300, 380], [300, 780]], 3, rgba(INK, 0.25));
  for (const s of [-1, 1]) p.poly([[300 + s * 215, 400], [300 + s * 250, 560], [300 + s * 215, 700], [300 + s * 180, 560]], shade(uni, 0.9), 6);
  p.poly([[230, 330], [300, 372], [370, 330], [360, 315], [240, 315]], "#f6ecd2", 6);
  p.poly(rrect(255, 250, 345, 330, 20), shade(skin, 0.9), 6);
  p.ell(300, 175, 118, 138, hair, 7);
  const r = rngK(seed);
  for (let k = 0; k < 40; k++) { const a = r() * TAU, rr = r() * 100; p.dot(300 + Math.cos(a) * rr, 175 + Math.sin(a) * rr * 1.15, 5 + r() * 4, rgba(tint(hair, 0.25), 0.5)); }
  if (seed % 2) for (let k = -2; k <= 2; k++) p.stroke([[300 + k * 40, 70], [300 + k * 46, 280]], 6, rgba(shade(hair, 0.6), 0.9));
  for (const s of [-1, 1]) p.ell(300 + s * 116, 190, 16, 30, shade(skin, 0.9), 5);
};

/** the front wall with the blackboard: 3000 x 1400, base at y 1400. tidy = no chalk (shot "never a joke") */
export const boardWall = (p: KPen, busy: boolean) => {
  const g = p.g; p.ow = 8;
  p.poly([[0, 0], [3000, 0], [3000, 1400], [0, 1400]], p.lin(0, 0, 0, 1400, [[0, "#f3e9cf"], [1, "#e6d8b6"]]), 0);
  g.fillStyle = "#2f7f78"; g.fillRect(0, 1200, 3000, 200); g.fillStyle = "#f2b632"; g.fillRect(0, 1190, 3000, 18);
  g.save(); g.translate(1500, 675); g.scale(0.76, 0.76); g.translate(-1500, -220);   // the board from ~0.95 m to ~2.9 m
  p.poly(rrect(500, 220, 2500, 860, 10), "#5a3a26");
  p.poly(rrect(530, 250, 2470, 830, 6), p.lin(0, 250, 0, 830, [[0, "#2f4a44"], [1, "#24403a"]]), 0);
  g.fillStyle = rgba("#ffffff", 0.06); for (let k = 0; k < 14; k++) { g.beginPath(); g.ellipse(600 + k * 140, 400 + (k % 3) * 120, 160, 50, 0.2, 0, TAU); g.fill(); }
  p.band([[520, 850], [2480, 850]], "#7a4a2a", 24, 4, "butt");
  g.fillStyle = "#f6f2e6"; g.textAlign = "left";
  if (busy) {
    g.font = `700 64px ${KIT_FONT}`;
    g.fillText("Tuesday 30 January 1962", 820, 340);
    g.fillText("Arithmetic:  347 × 26 =", 820, 450);
    g.fillText("   1 0 8 4 ÷ 12 =", 820, 545);
    g.fillText("English:  The river flows to the lake.", 820, 650);
    g.fillText("EXAMINATIONS", 820, 770);
    p.stroke([[820, 785], [1280, 785]], 6, "#f6f2e6");
  } else {
    g.globalAlpha = 0.25; g.font = `700 64px ${KIT_FONT}`; g.fillText("Tuesday 30 January 1962", 820, 340); g.globalAlpha = 1;
  }
  p.poly(rrect(1150, 860, 1290, 880, 4), "#f6f2e6", 3);
  // notice boards
  p.poly(rrect(2620, 300, 2900, 620, 6), "#c49a5a", 6);
  for (let k = 0; k < 4; k++) p.poly(rrect(2650 + (k % 2) * 120, 330 + Math.floor(k / 2) * 140, 2750 + (k % 2) * 120, 450 + Math.floor(k / 2) * 140, 3), "#fbf4e2", 4);
  p.poly(rrect(120, 300, 380, 640, 6), "#c49a5a", 6);
  for (let k = 0; k < 3; k++) p.poly(rrect(150, 330 + k * 100, 350, 410 + k * 100, 3), ["#fbf4e2", "#f2e0b0", "#e6f0dc"][k], 4);
  g.restore();
};
/** the teacher's table, front: 1100 x 500, base 490, with a register, a hand bell and a ruler */
export const teacherTable = (p: KPen) => {
  p.ow = 7;
  p.poly(rrect(30, 120, 1070, 170, 4), "#a8743e");
  p.poly(rrect(60, 170, 1040, 400, 4), "#7a4e2e");
  for (const x of [80, 1020]) p.poly(rrect(x - 18, 390, x + 18, 490, 3), "#5a3a26", 5);
  p.poly(rrect(160, 70, 460, 122, 4), PAL.teal, 5); p.poly(rrect(180, 40, 440, 72, 4), "#f6ecd2", 5);
  p.poly([[760, 120], [800, 50], [840, 120]], PAL.brass, 5); p.stroke([[800, 50], [800, 20]], 8, "#5a3a26");
  p.poly(rrect(520, 98, 700, 118, 3), "#d9a441", 4);
};

// ---------------- dormitory ----------------
/** dorm wall: 3000 x 1400, base 1400: limewash, two windows (golden light), a shelf of folded clothes */
export const dormWall = (p: KPen, seed: number) => {
  const g = p.g, r = rngK(seed); p.ow = 8;
  p.poly([[0, 0], [3000, 0], [3000, 1400], [0, 1400]], p.lin(0, 0, 0, 1400, [[0, "#f1e6c8"], [1, "#dccca6"]]), 0);
  g.fillStyle = "#c98a55"; g.fillRect(0, 1150, 3000, 250);
  for (let k = 0; k < 30; k++) { g.fillStyle = rgba("#a88a5a", 0.12); g.beginPath(); g.ellipse(r() * 3000, r() * 1100, 50, 20, 0, 0, TAU); g.fill(); }
  for (const x of [700, 2200]) {
    p.poly(rrect(x - 180, 260, x + 180, 760, 6), p.lin(0, 260, 0, 760, [[0, "#ffd48e"], [1, "#f6b072"]]));
    p.clip(rrect(x - 180, 260, x + 180, 760, 6), () => { g.fillStyle = "#4f8a5a"; g.beginPath(); g.ellipse(x - 60, 760, 220, 120, 0, 0, TAU); g.fill(); g.fillStyle = "#2f6a46"; g.beginPath(); g.ellipse(x + 120, 700, 120, 160, 0.3, 0, TAU); g.fill(); });
    p.poly(rrect(x - 180, 260, x + 180, 760, 6), null, 10);
    for (const k of [-60, 60]) p.stroke([[x + k, 262], [x + k, 758]], 8, "#5a3a26");
  }
  p.band([[1180, 420], [1720, 420]], "#7a4e2e", 22, 4, "butt");
  for (let k = 0; k < 6; k++) p.poly(rrect(1200 + k * 80, 330, 1250 + k * 80, 410, 4), [PAL.teal, "#f6ecd2", PAL.red, PAL.mustard, "#3f6a4a", "#f6ecd2"][k], 4);
};
/** an iron bed with a blanket, pillow and a tied-up mosquito net: 1200 x 1200, base at y 1190 (bed top at y ~ 860) */
export const bed = (p: KPen, seed: number, net = true) => {
  const r = rngK(seed + 5); p.ow = 7;
  const blanket = [PAL.teal, "#c4683a", PAL.sea, "#d9a441"][seed % 4];
  // net (tied up, hanging from a ring)
  if (net) {
    p.poly([[600, 300], [430, 760], [770, 760]], rgba("#f6f8f4", 0.35), 3);
    for (let k = 1; k < 6; k++) p.stroke([[600, 300], [430 + k * 57, 760]], 2, rgba(INK, 0.1));
    p.stroke([[600, 300], [600, 0]], 3, rgba(INK, 0.4));
  }
  // frame
  for (const x of [120, 1080]) p.band([[x, 1190], [x, 700]], "#2f4a4a", 18, 4);
  p.band([[120, 720], [1080, 720]], "#2f4a4a", 14, 4);
  p.poly(rrect(100, 860, 1100, 960, 10), "#f6ecd2");
  p.poly([[110, 880], [1090, 880], [1100, 1010], [100, 1010]], p.lin(0, 880, 0, 1010, [[0, tint(blanket, 0.12)], [1, shade(blanket, 0.8)]]));
  for (let x = 140; x < 1080; x += 90) p.stroke([[x, 890], [x, 1000]], 4, rgba("#f6ecd2", 0.5));
  p.ell(260, 850, 150, 46, "#fbf4e2", 6);
  p.band([[120, 1060], [1080, 1060]], "#2f4a4a", 10, 3);
  void r;
};
/** a tin trunk: 500 x 300, base 295 */
export const trunk = (p: KPen, seed: number) => {
  const c = [PAL.teal, "#8a3a2a", "#3f6a4a", PAL.mustard][seed % 4];
  p.poly(rrect(20, 60, 480, 295, 10), p.lin(0, 60, 0, 295, [[0, tint(c, 0.15)], [1, shade(c, 0.75)]]), 7);
  p.stroke([[20, 120], [480, 120]], 5, rgba(INK, 0.5)); p.poly(rrect(220, 105, 280, 150, 6), PAL.brass, 5);
};
/** a wall clock: 300 x 300, centred. h = hours (the hands sweep) */
export const wallClock = (p: KPen, h: number) => {
  p.ow = 8;
  p.ell(150, 150, 130, 130, "#7a4e2e"); p.ell(150, 150, 108, 108, "#fbf4e2", 6);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; p.stroke([[150 + Math.cos(a) * 92, 150 + Math.sin(a) * 92], [150 + Math.cos(a) * 102, 150 + Math.sin(a) * 102]], 6); }
  const ah = (h / 12) * TAU - Math.PI / 2, am = (h % 1) * TAU - Math.PI / 2;
  p.stroke([[150, 150], [150 + Math.cos(ah) * 55, 150 + Math.sin(ah) * 55]], 12);
  p.stroke([[150, 150], [150 + Math.cos(am) * 85, 150 + Math.sin(am) * 85]], 7, PAL.red);
  p.dot(150, 150, 12);
};

// ---------------- clinic ----------------
/** clinic wall: 3000 x 1400, base 1400: white tiles low, pale green above, bottle shelves, a window, a cabinet with a red cross */
export const clinicWall = (p: KPen, seed: number) => {
  const g = p.g, r = rngK(seed); p.ow = 8;
  p.poly([[0, 0], [3000, 0], [3000, 1400], [0, 1400]], p.lin(0, 0, 0, 1400, [[0, "#dcefe4"], [1, "#c6e0d4"]]), 0);
  g.fillStyle = "#f6f8f2"; g.fillRect(0, 880, 3000, 520);
  for (let y = 880; y < 1400; y += 70) p.stroke([[0, y], [3000, y]], 2, rgba(INK, 0.15));
  for (let x = 0; x < 3000; x += 70) p.stroke([[x, 880], [x, 1400]], 2, rgba(INK, 0.15));
  // shelves of bottles
  for (const [x0, x1] of [[200, 1200], [1900, 2850]] as [number, number][]) for (let s = 0; s < 3; s++) {
    const y = 380 + s * 190;
    p.poly(rrect(x0, y, x1, y + 20, 3), "#8a5a34", 5);
    for (let x = x0 + 30; x < x1 - 40; x += 70 + r() * 20) {
      const h = 70 + r() * 70, c = [PAL.teal, "#8a3a2a", "#d9a441", "#4fa8a8", "#f6ecd2", "#3f6a4a"][Math.floor(r() * 6)];
      p.poly(rrect(x, y - h, x + 44, y, 8), rgba(c, 0.85), 4); p.poly(rrect(x + 12, y - h - 18, x + 32, y - h + 2, 3), "#f6ecd2", 3);
      p.poly(rrect(x + 6, y - h * 0.6, x + 38, y - h * 0.3, 2), "#fbf4e2", 2);
    }
  }
  // window
  p.poly(rrect(1350, 260, 1750, 760, 6), p.lin(0, 260, 0, 760, [[0, "#bfe6f0"], [1, "#e8f4d8"]]));
  p.clip(rrect(1350, 260, 1750, 760, 6), () => { g.fillStyle = "#4d9a52"; g.beginPath(); g.ellipse(1450, 720, 200, 110, 0, 0, TAU); g.fill(); g.fillStyle = "#2f7a46"; g.beginPath(); g.ellipse(1680, 640, 120, 170, 0.4, 0, TAU); g.fill(); });
  p.poly(rrect(1350, 260, 1750, 760, 6), null, 10); p.stroke([[1550, 260], [1550, 760]], 10, "#f6ecd2");
  // cabinet with a red cross
  p.poly(rrect(1240, 880, 1440, 1400, 6), "#f6f8f2"); p.poly(rrect(1310, 940, 1370, 960, 2), PAL.red, 0); p.poly(rrect(1330, 920, 1350, 980, 2), PAL.red, 0);
};
/** the lab table: 1400 x 640, base 630: test-tube rack, flasks, a microscope, a notebook */
export const labTable = (p: KPen) => {
  p.ow = 7;
  p.poly(rrect(20, 300, 1380, 350, 4), "#f6f8f2"); p.poly(rrect(50, 350, 1350, 560, 4), "#c9ced0");
  for (const x of [70, 1330]) p.poly(rrect(x - 16, 550, x + 16, 630, 3), "#5a6a6e", 5);
  // rack + tubes
  p.poly(rrect(120, 220, 480, 300, 4), "#a8743e");
  const cols = ["#ff8a5a", "#9fe0d0", "#f2d35a", "#bfe6f0", "#ff8a5a", "#9fe0d0"];
  for (let k = 0; k < 6; k++) { const x = 150 + k * 55; p.poly(rrect(x, 90, x + 32, 260, 14), rgba("#ffffff", 0.7), 4); p.poly(rrect(x + 3, 180, x + 29, 258, 12), cols[k], 0); p.poly(rrect(x, 90, x + 32, 260, 14), null, 4); }
  // flasks
  p.poly([[560, 300], [530, 300], [580, 180], [580, 120], [620, 120], [620, 180], [670, 300]], rgba("#bfe6f0", 0.85));
  p.poly([[545, 300], [655, 300], [630, 240], [570, 240]], "#9fe0d0", 0);
  // microscope
  p.poly(rrect(820, 270, 1000, 300, 4), "#2a3a3e"); p.band([[930, 280], [960, 160], [900, 80]], "#2a3a3e", 30, 4);
  p.poly(rrect(860, 50, 910, 140, 8), "#4a5a5e", 5); p.poly(rrect(840, 190, 940, 210, 3), "#9aa0a2", 4);
  // notebook
  p.poly([[1080, 300], [1300, 300], [1280, 260], [1100, 260]], "#fbf4e2", 5); p.stroke([[1120, 280], [1260, 280]], 3, rgba(INK, 0.4));
};
/** a test tube in a hand (extra overlay) */
export const tubeAt = (p: KPen, x: number, y: number, h: number, liquid: string) => {
  p.poly(rrect(x - 0.06 * h, y - 0.5 * h, x + 0.06 * h, y + 0.1 * h, 0.06 * h), rgba("#ffffff", 0.75), 4);
  p.poly(rrect(x - 0.05 * h, y - 0.15 * h, x + 0.05 * h, y + 0.09 * h, 0.05 * h), liquid, 0);
  p.poly(rrect(x - 0.06 * h, y - 0.5 * h, x + 0.06 * h, y + 0.1 * h, 0.06 * h), null, 4);
};

// ---------------- the map ----------------
/** map of north-west Tanganyika: 2000 x 2400 flat card (top = north). Lake Victoria to the east, Bukoba on the shore,
 *  Kashasha inland to the south, Nshamba further south-west, the Uganda border to the north. Positions in MAP_PTS. */
export const MAP_PTS: Record<string, P2> = { kashasha: [1180, 1140], bukoba: [1430, 820], nshamba: [860, 1560], muleba: [1250, 1680], kamachumu: [1120, 1330] };
export const mapCard = (p: KPen) => {
  const g = p.g; p.ow = 8;
  p.poly([[0, 0], [2000, 0], [2000, 2400], [0, 2400]], "#ead8a8", 0);
  // paper texture + hills
  for (let k = 0; k < 140; k++) { g.fillStyle = rgba(k % 3 ? "#9cc48a" : "#c8b07a", 0.22); g.beginPath(); g.ellipse(hash(k, 1) * 2000, hash(k, 2) * 2400, 60 + hash(k, 3) * 120, 30 + hash(k, 4) * 60, hash(k, 5) * 3, 0, TAU); g.fill(); }
  // Lake Victoria
  const lake: P2[] = [[2000, 200], [1700, 300], [1560, 520], [1520, 780], [1580, 1000], [1500, 1300], [1560, 1560], [1500, 1800], [1620, 2050], [1780, 2200], [2000, 2250]];
  p.poly(lake, p.lin(1500, 0, 2000, 0, [[0, "#8fd0cc"], [1, "#3f8f9a"]]), 6);
  for (let k = 0; k < 30; k++) { const y = 260 + k * 66, x = 1700 + (k % 3) * 80; p.stroke([[x, y], [x + 60, y]], 4, rgba("#ffffff", 0.45)); }
  // islands
  for (const [x, y] of [[1700, 980], [1760, 1120], [1680, 1500]] as P2[]) p.ell(x, y, 40, 26, "#9cc48a", 5);
  // border with Uganda
  for (let x = 0; x < 1700; x += 60) p.stroke([[x, 260 + 10 * Math.sin(x / 90)], [x + 34, 260 + 10 * Math.sin((x + 34) / 90)]], 6, rgba(INK, 0.6));
  // roads (dashed red earth)
  const roads: P2[][] = [[MAP_PTS.bukoba, [1350, 980], MAP_PTS.kashasha], [MAP_PTS.kashasha, MAP_PTS.kamachumu, [1020, 1460], MAP_PTS.nshamba], [MAP_PTS.kamachumu, [1200, 1520], MAP_PTS.muleba], [MAP_PTS.bukoba, [1100, 700], [600, 600], [200, 520]], [MAP_PTS.nshamba, [600, 1800], [300, 2100]], [MAP_PTS.kashasha, [900, 1000], [500, 1100], [150, 1200]]];
  for (const rd of roads) p.stroke(rd, 10, "#b8643a");
  // labels
  g.fillStyle = INK; g.textAlign = "center";
  g.font = `800 92px ${KIT_FONT}`; g.fillText("TANGANYIKA", 620, 1900);
  g.font = `800 64px ${KIT_FONT}`; g.fillText("UGANDA", 700, 190);
  g.save(); g.translate(1820, 1300); g.rotate(-Math.PI / 2); g.fillStyle = "#1f5f66"; g.font = `800 72px ${KIT_FONT}`; g.fillText("LAKE VICTORIA", 0, 0); g.restore();
  g.fillStyle = INK; g.font = `700 60px ${KIT_FONT}`;
  const lab = (k: string, s: string, dx: number, dy: number) => { const [x, y] = MAP_PTS[k]; p.dot(x, y, 16, INK); g.fillText(s, x + dx, y + dy); };
  lab("bukoba", "Bukoba", -40, -40); lab("nshamba", "Nshamba", -10, 90); lab("muleba", "Muleba", 60, 90); lab("kamachumu", "Kamachumu", -230, 20);
  g.font = `800 70px ${KIT_FONT}`; lab("kashasha", "Kashasha", 0, -50);
  // a compass rose
  p.poly([[260, 2150], [290, 2240], [260, 2220], [230, 2240]], PAL.red, 4); g.font = `800 50px ${KIT_FONT}`; g.fillText("N", 260, 2120);
  p.poly(rrect(10, 10, 1990, 2390, 10), null, 14);
};

// ---------------- independence ----------------
/** the Tanganyika flag on a pole, waving: 700 x 1100, base at y 1090 (pole), w = wave phase */
export const flagPole = (p: KPen, w: number) => {
  p.ow = 6;
  p.band([[60, 1090], [60, 40]], "#c9ced0", 16, 4); p.dot(60, 34, 16, PAL.brass);
  const x0 = 70, x1 = 640, y0 = 60, y1 = 440, n = 12;
  const at = (u: number, v: number): P2 => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * v + 26 * u * Math.sin(u * 5 - w * TAU) ];
  const strip = (v0: number, v1: number, col: string) => {
    const pts: P2[] = [];
    for (let i = 0; i <= n; i++) pts.push(at(i / n, v0));
    for (let i = n; i >= 0; i--) pts.push(at(i / n, v1));
    p.poly(pts, col, 0);
  };
  strip(0, 0.4, TZ.green); strip(0.4, 0.44, TZ.gold); strip(0.44, 0.56, TZ.black); strip(0.56, 0.6, TZ.gold); strip(0.6, 1, TZ.green);
  const out: P2[] = []; for (let i = 0; i <= n; i++) out.push(at(i / n, 0)); for (let i = n; i >= 0; i--) out.push(at(i / n, 1));
  p.poly(out, null, 6);
  for (let i = 1; i < n; i += 2) { const a = at(i / n, 0), b = at(i / n, 1); p.stroke([a, b], 10, rgba(INK, 0.08 + 0.06 * Math.sin(i - w * 6))); }
};
/** a small hand flag (Tanganyika) for an extra overlay: drawn at hand (x, y), size h */
export const handFlag = (p: KPen, x: number, y: number, h: number, w: number) => {
  p.stroke([[x, y + 0.1 * h], [x, y - 1.0 * h]], 0.05 * h, "#7a4e2e");
  const x0 = x, x1 = x + 0.9 * h, y0 = y - 1.0 * h, y1 = y - 0.42 * h, n = 6;
  const at = (u: number, v: number): P2 => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * v + 0.06 * h * u * Math.sin(u * 5 - w * TAU)];
  const strip = (v0: number, v1: number, col: string) => { const pts: P2[] = []; for (let i = 0; i <= n; i++) pts.push(at(i / n, v0)); for (let i = n; i >= 0; i--) pts.push(at(i / n, v1)); p.poly(pts, col, 0); };
  strip(0, 0.4, TZ.green); strip(0.4, 0.45, TZ.gold); strip(0.45, 0.55, TZ.black); strip(0.55, 0.6, TZ.gold); strip(0.6, 1, TZ.green);
  const out: P2[] = []; for (let i = 0; i <= n; i++) out.push(at(i / n, 0)); for (let i = n; i >= 0; i--) out.push(at(i / n, 1));
  p.poly(out, null, 4);
};
/** green / gold / black bunting on a string: 2000 x 300 */
export const buntingTZ = (p: KPen, seed: number) => {
  p.ow = 5;
  const pts = curve([0, 40], [1000, 180], [2000, 40], 30);
  p.stroke(pts, 6, "#5a4030");
  const cols = [TZ.green, TZ.gold, TZ.black, TZ.green, "#f6ecd2", TZ.gold];
  for (let i = 1; i < 29; i += 1) { const [x, y] = pts[i]; p.poly([[x - 26, y], [x + 26, y + 4], [x, y + 90]], cols[(i + seed) % cols.length], 5); }
};

// ---------------- grounds, fx ----------------
export const earthPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(61);
  g.fillStyle = "#b8784a"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 900; k++) { g.fillStyle = rgba(r() < 0.5 ? "#a8683e" : "#cf9060", 0.35); g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 4 + r() * 18, 2 + r() * 8, r() * 3, 0, TAU); g.fill(); }
  for (let k = 0; k < 120; k++) { g.fillStyle = rgba("#6a9a4a", 0.5); g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 6 + r() * 10, 3, r() * 3, 0, TAU); g.fill(); }
};
export const grassPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(62);
  g.fillStyle = "#6aa85a"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 1400; k++) { g.strokeStyle = rgba(r() < 0.5 ? "#4f8a46" : "#8ac46a", 0.6); g.lineWidth = 2; const x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 10 - r() * 10); g.stroke(); }
};
export const floorPaint = (g: CanvasRenderingContext2D) => {
  const r = rngK(63);
  g.fillStyle = "#b5603a"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 200; k++) { g.fillStyle = rgba(r() < 0.5 ? "#a0522e" : "#c8784a", 0.3); g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + r() * 60, 8 + r() * 20, 0, 0, TAU); g.fill(); }
  for (let y = 0; y < 1024; y += 128) { g.strokeStyle = rgba(INK, 0.15); g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
};
export const tilePaint = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "#e8ece4"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 64) for (let x = 0; x < 1024; x += 64) { g.fillStyle = (x + y) % 128 ? "#dfe6dc" : "#eef2ea"; g.fillRect(x + 2, y + 2, 60, 60); }
};
export const glowDot = (p: KPen, col: string, core = "#fff8e0") => { p.glow(100, 100, 100, col, 0.9); p.ell(100, 100, 14, 14, core, 0); };
export const ring = (p: KPen, col: string) => {
  const g = p.g;
  g.fillStyle = p.rad(256, 256, 256, [[0, rgba(col, 0)], [0.78, rgba(col, 0)], [0.9, rgba(col, 0.85)], [0.96, rgba(col, 0.35)], [1, rgba(col, 0)]]);
  g.fillRect(0, 0, 512, 512);
};
export const dustPuff = (p: KPen, seed: number) => {
  const r = rngK(seed + 100);
  for (let i = 0; i < 7; i++) { const x = 90 + r() * 220, y = 200 - r() * 110, rr = 50 + r() * 60; p.g.fillStyle = p.rad(x, y, rr, [[0, rgba("#d8a878", 0.6)], [1, rgba("#d8a878", 0)]]); p.g.beginPath(); p.g.arc(x, y, rr, 0, TAU); p.g.fill(); }
};
/** a wall calendar (close-up prop): 800 x 1000, centred. month 0..13: Jan 1962 .. Feb 1963; page = 0..1 flip */
export const calendar = (p: KPen, month: number, flip: number) => {
  const g = p.g; p.ow = 10;
  const MON = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const page = (m: number, y0: number, sq: number) => {
    const yr = m >= 12 ? 1963 : 1962, mn = MON[m % 12];
    const top = 160 + y0, h = 760 * sq;
    p.poly(rrect(80, top, 720, top + h, 10), "#fbf4e2", 10);
    if (sq < 0.25) return;
    p.poly(rrect(80, top, 720, top + 170 * sq, 10), m >= 12 ? PAL.teal : PAL.red, 10);
    g.save(); g.translate(400, top); g.scale(1, sq);
    g.fillStyle = "#fbf4e2"; g.textAlign = "center"; g.font = `800 64px ${KIT_FONT}`; g.fillText(mn, 0, 80); g.font = `800 60px ${KIT_FONT}`; g.fillText(String(yr), 0, 150);
    g.fillStyle = INK; for (let k = 0; k < 30; k++) { const x = -260 + (k % 7) * 87, y = 240 + Math.floor(k / 7) * 100; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
    g.restore();
  };
  p.poly(rrect(60, 60, 740, 960, 12), "#7a4e2e", 10);
  p.dot(400, 100, 18, INK);
  page(Math.min(13, month + 1), 0, 1);
  page(month, 0, 1 - flip);
  void lerp; void PAL; void ellPts;
};
/** a wooden school bench (seen from either side): 1000 x 400, base at y 395 */
export const bench = (p: KPen) => {
  p.ow = 6;
  p.poly(rrect(20, 150, 980, 200, 4), "#8a5a34");
  p.poly(rrect(30, 40, 970, 90, 4), "#9a6a42");
  for (const x of [80, 920]) { p.poly(rrect(x - 16, 40, x + 16, 395, 3), "#5a3a26", 5); }
  p.stroke([[80, 330], [920, 330]], 8, "#5a3a26");
};
