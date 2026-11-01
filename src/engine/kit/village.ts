// Visual kit: set dressing for a north-Indian village at night (1857). Each prop is a canvas drawing in its own design
// units (documented per function, bottom-centre = where it stands) with ink outlines, form shading and texture detail:
// mud huts with thatch, chulha and tandoor (fire drawn separately by fx.ts), hurricane lantern on a post, charpai,
// bullock cart with a resting bullock, peepal tree with sacred threads and a lamp, a well with pulley, haystack, clay
// pots, distant tree-line and village silhouettes, and the painted dirt ground with paths. Seeds vary each copy.
import { KPen, P2, PAL, INK, TAU, hash, mix, shade, tint, rgba, ellPts, rrect, curve, lerp, rngK } from "./core";
import { flame } from "./people";

const MUD = ["#c98a55", "#b97a48", "#d39a62", "#bf8650"], THATCH = ["#d9b05a", "#c9a04c", "#e0bc68"];

/** mud hut: 1000 x 820 design, base at y 800. glow = lit doorway/window (0..1) */
export const hut = (p: KPen, seed: number, glow = 1) => {
  const r = rngK(seed), mud = MUD[seed % 4], th = THATCH[seed % 3], g = p.g;
  p.ow = 7;
  const x0 = 150 + r() * 30, x1 = 850 - r() * 30, top = 420 + r() * 30, base = 800;
  // walls: slightly irregular, plastered, with a darker plinth
  const wall: P2[] = [[x0, top], [x1, top], [x1 + 6, base], [x0 - 6, base]];
  p.poly(wall, p.lin(x0, 0, x1, 0, [[0, tint(mud, 0.08)], [0.6, mud], [1, shade(mud, 0.78)]]), 0);
  p.clip(wall, () => {
    g.fillStyle = shade(mud, 0.72); g.fillRect(0, base - 70, 1000, 80);                         // plinth
    g.fillStyle = rgba("#f6ecd2", 0.85); g.fillRect(0, base - 76, 1000, 7);                       // lime line
    for (let i = 0; i < 40; i++) { g.fillStyle = rgba(shade(mud, 0.6), 0.25); g.beginPath(); g.ellipse(x0 + r() * (x1 - x0), top + r() * (base - top), 6 + r() * 18, 3 + r() * 6, r(), 0, TAU); g.fill(); }
    for (let i = 0; i < 6; i++) { const x = x0 + r() * (x1 - x0), y = top + 60 + r() * 200; p.stroke([[x, y], [x + 10, y + 18], [x + 4, y + 34]], 2.5, rgba(INK, 0.35)); } // cracks
    // eave shadow
    g.fillStyle = p.lin(0, top, 0, top + 90, [[0, rgba("#10222b", 0.55)], [1, rgba("#10222b", 0)]]); g.fillRect(0, top, 1000, 90);
    // mandana: white chalk triangles + dots around the door
    const dx = 500 + (r() - 0.5) * 120;
    for (let i = 0; i < 7; i++) { const x = dx - 150 + i * 50; p.poly([[x, base - 92], [x + 18, base - 120], [x + 36, base - 92]], null, 0); p.stroke([[x, base - 92], [x + 18, base - 120], [x + 36, base - 92]], 3, "#f6ecd2"); p.dot(x + 18, base - 104, 3, "#f6ecd2"); }
  });
  p.poly(wall, null);
  // doorway with warm interior glow
  const dx = 500 + (hash(seed, 9) - 0.5) * 120, dw = 75, dh = 230;
  const door: P2[] = [[dx - dw, base], [dx - dw, base - dh + 40], ...ellPts(dx, base - dh + 40, dw, 40, 180, 360, 0, 12).slice(1, -1), [dx + dw, base - dh + 40], [dx + dw, base]];
  p.poly(door, glow > 0 ? p.rad(dx, base - 60, 220, [[0, mix("#3a2418", "#ffcf7a", glow)], [0.45, mix("#2a1a12", "#e8843a", glow)], [1, "#24160f"]]) : "#1f1612");
  p.stroke(door.slice(0, -1), 14, "#6a4228"); p.poly(door, null, 6);
  if (glow > 0) { // a seated silhouette's shadow / pot inside for depth
    p.ell(dx + 30, base - 40, 26, 30, rgba("#24160f", 0.55), 0);
    p.ell(dx - 34, base - 22, 22, 18, rgba("#5a2e18", 0.8), 0);
  }
  // small window
  const wx = dx > 500 ? x0 + 110 : x1 - 140;
  p.poly(rrect(wx - 34, top + 120, wx + 34, top + 190, 6), glow > 0 ? mix("#2a1a12", "#ffc46a", glow * 0.85) : "#1f1612");
  for (const k of [-12, 12]) p.stroke([[wx + k, top + 122], [wx + k, top + 188]], 5, "#5a3a22");
  p.poly(rrect(wx - 34, top + 120, wx + 34, top + 190, 6), null, 5);
  // thatched roof: overhanging, straw strands, ridge bundle, tie ropes
  const ov = 90 + r() * 40, rt = 120 + r() * 50, peak = rt + (top - rt) * 0.1;
  const roof: P2[] = [[x0 - ov, top + 30], ...curve([x0 - ov, top + 30], [500, rt - 60], [x1 + ov, top + 30], 24).slice(1), [x1 + ov - 20, top + 54], [x0 - ov + 20, top + 54]];
  p.poly(roof, p.lin(0, rt, 0, top + 60, [[0, tint(th, 0.12)], [0.7, th], [1, shade(th, 0.7)]]), 0);
  p.clip(roof, () => {
    for (let i = 0; i < 260; i++) { const x = x0 - ov + r() * (x1 - x0 + 2 * ov), y = rt - 40 + r() * (top - rt + 100); const l = 30 + r() * 50; p.stroke([[x, y], [x + (x - 500) * 0.05, y + l]], 2 + r() * 2, rgba(r() < 0.5 ? shade(th, 0.62) : tint(th, 0.35), 0.55)); }
    for (let k = 1; k < 4; k++) { const y = rt + (top - rt) * k * 0.28; p.stroke(curve([x0 - ov, y + 60], [500, y - 20], [x1 + ov, y + 60]), 4, rgba(shade(th, 0.5), 0.5)); }
  });
  // ragged fringe along the eave
  const fr: P2[] = [];
  for (let i = 0; i <= 40; i++) { const x = lerp(x0 - ov + 20, x1 + ov - 20, i / 40); fr.push([x, top + 54 + (i % 2 ? 14 + r() * 10 : 0)]); }
  p.poly([[x0 - ov + 20, top + 40], ...fr, [x1 + ov - 20, top + 40]], shade(th, 0.82), 0);
  p.poly(roof, null);
  p.band(curve([500 - 150, peak - 18], [500, rt - 44], [500 + 150, peak - 18], 10), shade(th, 0.75), 26, 4);
  for (const x of [x0 + 40, 500, x1 - 40]) p.stroke([[x, rt + (x === 500 ? -40 : 30)], [x + (x - 500) * 0.06, top + 50]], 3, rgba("#5a3a22", 0.8));
  void PAL; void peak;
};

/** peepal tree: 1600 x 1800, base at y 1760. A stone platform (chabutra), buttress roots, sacred threads, a clay lamp. */
export const peepal = (p: KPen, seed: number) => {
  const r = rngK(seed), g = p.g, cx = 800, base = 1760;
  p.ow = 9;
  // platform
  p.poly([[cx - 430, base - 110], [cx + 430, base - 110], [cx + 470, base], [cx - 470, base]], p.lin(0, base - 110, 0, base, [[0, "#d8cdb4"], [1, "#a89a80"]]));
  for (let i = 0; i < 8; i++) p.stroke([[cx - 430 + i * 110, base - 110], [cx - 450 + i * 118, base]], 3, rgba(INK, 0.35));
  p.poly([[cx - 450, base - 125], [cx + 450, base - 125], [cx + 430, base - 105], [cx - 430, base - 105]], "#e6dcc4");
  // trunk with roots
  const trunk: P2[] = [[cx - 120, base - 120], [cx - 170, base - 140], [cx - 90, base - 300], [cx - 80, base - 650], [cx - 140, base - 900], [cx - 40, base - 880], [cx + 10, base - 700],
    [cx + 60, base - 920], [cx + 150, base - 950], [cx + 80, base - 640], [cx + 95, base - 300], [cx + 200, base - 135], [cx + 120, base - 118]];
  p.poly(trunk, p.lin(cx - 150, 0, cx + 150, 0, [[0, "#8a6a4c"], [0.5, "#6e5038"], [1, "#4a3424"]]), 0);
  p.clip(trunk, () => { for (let i = 0; i < 26; i++) { const x = cx - 120 + r() * 240, y = base - 900 + r() * 760; p.stroke(curve([x, y], [x + 14 * (r() - 0.5), y + 60], [x + 8 * (r() - 0.5), y + 130]), 4, rgba("#2e1f16", 0.45)); } });
  p.poly(trunk, null);
  // sacred threads (red + yellow) wound round the trunk, a few hanging
  for (let k = 0; k < 7; k++) { const y = base - 430 + k * 16; p.stroke(curve([cx - 92, y], [cx, y + 14], [cx + 94, y]), 5, k % 2 ? "#e8443a" : "#f2c14e"); }
  p.stroke([[cx + 60, base - 420], [cx + 72, base - 340]], 4, "#e8443a");
  // clay diya on the platform
  p.ell(cx + 220, base - 128, 26, 10, "#a0522d", 4); flame(p, cx + 220, base - 136, 16, 0, seed);
  // canopy: clusters of heart-shaped leaves in three tones
  const clusters: [number, number, number][] = [];
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI, d = 0.35 + 0.65 * Math.sqrt(r()); clusters.push([cx + Math.cos(a) * 680 * d * (r() < 0.5 ? -1 : 1), base - 1050 - Math.sin(a) * 600 * d + 120, 120 + r() * 90]); }
  clusters.sort((a, b) => a[1] - b[1]);
  // branches into the canopy
  for (const [x, y] of clusters.filter((_, i) => i % 3 === 0)) p.band(curve([cx + (x - cx) * 0.1, base - 880], [lerp(cx, x, 0.5), lerp(base - 900, y, 0.7)], [x, y + 40], 8), "#5e4430", 14, 4);
  const leaf = (x: number, y: number, s: number, a: number, col: string) => {
    const pts: P2[] = [];
    for (let i = 0; i <= 16; i++) { const t = (i / 16) * TAU, hx = 16 * Math.sin(t) ** 3, hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); pts.push([hx, hy * 1.2]); }
    // tip stretched (peepal leaves have a long drip tip)
    const out = pts.map(([hx, hy]) => { const yy = hy > 12 ? hy + (hy - 12) * 1.6 : hy; const c = Math.cos(a), s2 = Math.sin(a); return [x + (hx * c - yy * s2) * s, y + (hx * s2 + yy * c) * s] as P2; });
    p.poly(out, col, 2.2);
  };
  const tones = ["#2f6f4f", "#3f8a5a", "#5aa36a", "#2a5f48"];
  for (const [x, y, R] of clusters) {
    p.ell(x, y, R * 1.05, R * 0.82, "#24503c", 0);
    for (let j = 0; j < 34; j++) { const a = r() * TAU, d = Math.sqrt(r()) * R; const yy = y + Math.sin(a) * d * 0.8; leaf(x + Math.cos(a) * d, yy, 1.5 + r() * 0.6, r() * TAU, tones[(yy < y ? 1 : 0) + (r() < 0.4 ? 2 : 0) % 4]); }
  }
  void g; void PAL;
};

/** stone well: 700 x 760, base at y 740: brick-and-stone ring, two posts, a crossbar, a pulley, rope and bucket */
export const well = (p: KPen, seed: number) => {
  const r = rngK(seed), g = p.g;
  p.ow = 6;
  const ring: P2[] = [[110, 470], [590, 470], [600, 740], [100, 740]];
  p.poly(ring, p.lin(100, 0, 600, 0, [[0, "#e2d6bd"], [0.6, "#c9b99c"], [1, "#9a8a70"]]), 0);
  p.clip(ring, () => { for (let row = 0; row < 7; row++) for (let i = 0; i < 8; i++) { const y = 480 + row * 38, x = 100 + i * 66 + (row % 2) * 33; g.strokeStyle = rgba(INK, 0.35); g.lineWidth = 3; g.strokeRect(x, y, 66, 38); if (r() < 0.25) { g.fillStyle = rgba("#7a6a50", 0.25); g.fillRect(x + 3, y + 3, 60, 32); } } });
  p.poly(ring, null);
  p.ell(350, 470, 250, 50, "#d8ccb2"); p.ell(350, 474, 205, 36, "#16262c");
  p.ell(350, 482, 160, 22, rgba("#3f7f8a", 0.5), 0); // water glint far below
  for (const x of [140, 560]) p.poly(rrect(x - 18, 160, x + 18, 480, 6), p.lin(x - 18, 0, x + 18, 0, [[0, "#9a7048"], [1, "#6a4a30"]]));
  p.poly(rrect(110, 150, 590, 184, 8), "#8a6040");
  p.ell(350, 200, 40, 40, "#7a5838"); p.dot(350, 200, 10, INK);
  p.stroke([[350, 240], [350, 520]], 5, "#c9a870");
  p.poly([[320, 520], [380, 520], [372, 576], [328, 576]], "#a0a8a8"); p.ell(350, 520, 30, 8, "#7a8888", 4);
};

/** charpai (rope cot) in 3/4 view: 900 x 420, base at y 400; optional folded quilt */
export const charpai = (p: KPen, seed: number, quilt = true) => {
  p.ow = 6;
  const A: P2 = [120, 210], B: P2 = [700, 160], C: P2 = [800, 300], D: P2 = [220, 360];
  for (const [x, y] of [A, B, C, D]) p.poly(rrect(x - 13, y - 10, x + 13, y + 110 - (y < 250 ? 40 : 0), 6), "#7a5232");
  const frame = [A, B, C, D];
  p.poly(frame, "#c9a870");
  p.clip(frame, () => { for (let i = -20; i < 40; i++) { p.stroke([[100 + i * 26, 140], [100 + i * 26 + 260, 400]], 4, rgba("#8a6a40", 0.8)); p.stroke([[100 + i * 26, 400], [100 + i * 26 + 260, 140]], 4, rgba("#e6d0a0", 0.8)); } });
  p.poly(frame, null);
  for (const [a, b] of [[A, B], [B, C], [C, D], [D, A]] as [P2, P2][]) p.band([a, b], "#9a6a40", 16, 4);
  if (quilt) { const q: P2[] = [[560, 200], [700, 180], [740, 250], [600, 272]]; p.poly(q, "#c8323a"); p.pattern(q, "checks", "#f2b632", 0.9, 20); p.poly(q, null); }
  void seed;
};

/** chulha (clay stove) with a pot: 500 x 360, base at y 340; the fire mouth is at (250, 300) for a flame card */
export const chulha = (p: KPen, seed: number) => {
  p.ow = 6;
  const body: P2[] = [[60, 340], [70, 210], [430, 210], [440, 340]];
  p.poly(body, p.lin(60, 0, 440, 0, [[0, "#c88a5a"], [1, "#8a5434"]]));
  p.poly([[175, 340], [180, 260], ...ellPts(250, 262, 70, 40, 180, 360, 0, 10).slice(1, -1), [320, 260], [325, 340]], p.rad(250, 320, 120, [[0, "#ffe9a0"], [0.4, "#ff9a3c"], [1, "#5a2410"]]));
  // pot
  p.ell(250, 160, 140, 80, p.rad(200, 130, 170, [[0, "#6a6e70"], [1, "#2a2e30"]]));
  p.ell(250, 92, 80, 18, "#1e2224");
  p.stroke(ellPts(200, 130, 60, 30, 200, 260, 0, 6), 5, rgba("#ffffff", 0.35));
  void seed;
};

/** tandoor (clay oven, half sunk): 360 x 300, base 290; mouth glow on top */
export const tandoor = (p: KPen, seed: number) => {
  p.ow = 6;
  p.poly([[40, 290], [70, 90], [290, 90], [320, 290]], p.lin(40, 0, 320, 0, [[0, "#d9a070"], [1, "#9a6038"]]));
  p.ell(180, 90, 112, 26, "#7a4428"); p.ell(180, 92, 80, 16, p.rad(180, 92, 80, [[0, "#ffe9a0"], [0.5, "#ff8a2c"], [1, "#6a2810"]]), 0);
  for (let i = 0; i < 4; i++) p.stroke([[60 + i * 8, 140 + i * 40], [300 - i * 8, 140 + i * 40]], 3, rgba(INK, 0.25));
  void seed;
};

/** hurricane lantern hanging from a bamboo post: 300 x 1100, base 1080; flame at (210, 330) */
export const lanternPost = (p: KPen, seed: number) => {
  p.ow = 6;
  p.band([[110, 1080], [116, 200]], "#a88550", 22, 5);
  p.band([[110, 220], [230, 220]], "#a88550", 16, 4);
  for (let i = 1; i < 6; i++) p.stroke([[100, 220 + i * 150], [124, 220 + i * 150]], 5, rgba(INK, 0.6));
  const x = 210, y = 250;
  p.stroke([[x, 222], [x, y]], 4);
  p.poly(rrect(x - 36, y, x + 36, y + 22, 6), "#3d4a4a");
  p.ell(x, y + 80, 34, 52, p.rad(x, y + 85, 55, [[0, "#fffbe0"], [0.35, "#ffd36a"], [1, "#e88a2c"]]));
  for (const s of [-1, 1]) p.stroke([[x + s * 34, y + 22], [x + s * 40, y + 135]], 6, "#3d4a4a");
  p.poly(rrect(x - 46, y + 128, x + 46, y + 152, 6), "#4a5656");
  void seed;
};

/** bullock cart with a resting zebu: 1700 x 900, base 880 */
export const bullockCart = (p: KPen, seed: number) => {
  const r = rngK(seed); p.ow = 7;
  // zebu (resting, side view, facing left), white-grey, painted horns
  const bx = 430, by = 860;
  p.poly([[bx - 300, by - 120], [bx - 250, by - 330], [bx + 220, by - 340], [bx + 290, by - 140], [bx + 260, by], [bx - 280, by]], p.lin(0, by - 340, 0, by, [[0, "#eceae2"], [1, "#b9b6ac"]]));
  p.ell(bx + 100, by - 360, 80, 50, "#e2dfd6"); // hump
  p.poly([[bx - 250, by - 300], [bx - 420, by - 330], [bx - 470, by - 230], [bx - 400, by - 180], [bx - 280, by - 190]], "#e6e3da"); // head + neck
  p.ell(bx - 445, by - 210, 40, 30, "#c9b6a8"); p.dot(bx - 455, by - 210, 6);
  p.dot(bx - 400, by - 290, 9); p.dot(bx - 403, by - 293, 3, "#ffffff");
  for (const s of [-1, 1]) p.band(curve([bx - 350 + s * 20, by - 330], [bx - 350 + s * 40, by - 400], [bx - 330 + s * 60, by - 430], 6), s < 0 ? "#2f8f83" : "#e8643a", 16, 4);
  p.poly([[bx - 380, by - 260], [bx - 330, by - 200], [bx - 300, by - 120], [bx - 360, by - 160]], "#f6ecd2", 4); // dewlap
  p.band([[bx - 300, by - 240], [bx - 260, by - 140]], "#c8323a", 14, 3);
  for (let i = 0; i < 4; i++) p.dot(bx - 300 + i * 12, by - 220 + i * 25, 8, PAL.gold);
  p.stroke(curve([bx + 280, by - 260], [bx + 330, by - 160], [bx + 300, by - 60]), 8);
  // cart: bed, sides, yoke pole, big spoked wheel
  const cx = 1180;
  p.band([[cx - 520, by - 260], [cx + 360, by - 300]], "#8a6040", 30, 5);
  p.poly([[cx - 260, by - 470], [cx + 380, by - 500], [cx + 400, by - 300], [cx - 260, by - 270]], "#b08050");
  p.clip([[cx - 260, by - 470], [cx + 380, by - 500], [cx + 400, by - 300], [cx - 260, by - 270]], () => { for (let i = 0; i < 9; i++) p.stroke([[cx - 260 + i * 80, by - 520], [cx - 260 + i * 80, by - 260]], 6, rgba("#5a3a22", 0.6)); });
  p.poly([[cx - 260, by - 470], [cx + 380, by - 500], [cx + 400, by - 300], [cx - 260, by - 270]], null);
  // hay load
  p.poly([[cx - 250, by - 470], ...curve([cx - 250, by - 470], [cx + 60, by - 700], [cx + 380, by - 500], 12).slice(1)], "#d9b05a");
  for (let i = 0; i < 40; i++) { const x = cx - 220 + r() * 560, y = by - 620 + r() * 140; p.stroke([[x, y], [x + 30, y + 10]], 3, rgba("#9a7a30", 0.6)); }
  const wx = cx + 80, wy = by - 260, R = 250;
  p.ell(wx, wy, R, R, null, 30); p.ell(wx, wy, R, R, null, 0);
  p.g.lineWidth = 22; p.g.strokeStyle = "#8a6040"; p.g.beginPath(); p.g.arc(wx, wy, R, 0, TAU); p.g.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; p.band([[wx, wy], [wx + Math.cos(a) * R, wy + Math.sin(a) * R]], "#a07850", 10, 3); }
  p.ell(wx, wy, 40, 40, "#6a4a30");
};

/** haystack: 600 x 520, base 500 */
export const haystack = (p: KPen, seed: number) => {
  const r = rngK(seed); p.ow = 6;
  const pts: P2[] = [[40, 500], ...curve([40, 500], [300, -80], [560, 500], 20).slice(1)];
  p.poly(pts, p.lin(0, 60, 600, 500, [[0, "#ecc770"], [1, "#a8822e"]]));
  p.clip(pts, () => { for (let i = 0; i < 150; i++) { const x = 40 + r() * 520, y = 80 + r() * 420; p.stroke([[x, y], [x + (x - 300) * 0.08, y + 30 + r() * 30]], 2.5, rgba(r() < 0.5 ? "#8a6a20" : "#fff0b0", 0.55)); } });
  p.poly(pts, null);
  p.stroke([[290, 30], [300, -20]], 8, "#8a6040");
};

/** a group of clay pots (matkas): 500 x 300, base 290 */
export const pots = (p: KPen, seed: number) => {
  p.ow = 5;
  const r = rngK(seed);
  for (const [x, s] of [[130, 1], [300, 1.2], [420, 0.8]] as [number, number][]) {
    const y = 290 - 80 * s;
    p.ell(x, y, 80 * s, 80 * s, p.rad(x - 25 * s, y - 25 * s, 100 * s, [[0, "#e0a070"], [1, "#8a4a28"]]));
    p.ell(x, y - 78 * s, 30 * s, 10 * s, "#6a3a20");
    p.band([[x - 70 * s, y - 20 * s], [x + 70 * s, y - 20 * s]], r() < 0.5 ? "#f6ecd2" : "#c8323a", 5 * s, 0);
  }
};

/** far tree-line silhouette strip: 4000 x 600, base 600 (night: flat dark teal with a lighter top edge) */
export const treeline = (p: KPen, seed: number, col = "#1c3a3e") => {
  const r = rngK(seed), pts: P2[] = [[0, 600]];
  for (let x = 0; x <= 4000; x += 40) pts.push([x, 330 - 160 * Math.abs(Math.sin(x * 0.004 + seed)) - 110 * r() * (r() < 0.3 ? 1 : 0.4)]);
  pts.push([4000, 600]);
  p.poly(pts, p.lin(0, 150, 0, 600, [[0, mix(col, "#5f8f86", 0.25)], [1, col]]), 0);
  // a few palms / round trees poking out
  for (let i = 0; i < 9; i++) { const x = 200 + r() * 3600, h = 250 + r() * 200; p.stroke([[x, 400], [x + 10, 400 - h]], 10, col); for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; p.stroke(curve([x + 10, 400 - h], [x + 10 + Math.cos(a) * 70, 400 - h + Math.sin(a) * 50], [x + 10 + Math.cos(a) * 130, 400 - h + 40]), 10, col); } }
};
/** a distant village silhouette with tiny lit windows: 3000 x 500, base 500 */
export const farVillage = (p: KPen, seed: number, col = "#203f44") => {
  const r = rngK(seed);
  for (let i = 0; i < 14; i++) {
    const x = 100 + i * 200 + r() * 80, w = 120 + r() * 60, h = 90 + r() * 60;
    p.poly([[x - w, 500], [x - w, 500 - h], [x, 500 - h - 70], [x + w, 500 - h], [x + w, 500]], col, 0);
    if (r() < 0.6) p.poly(rrect(x - 12, 500 - h * 0.6, x + 12, 500 - h * 0.6 + 20, 3), "#ffb24a", 0);
  }
};

/** painted village ground (dirt, a worn path along x, grass tufts, pebbles): returns a draw fn for a 2048 canvas */
export const villageGround = (g: CanvasRenderingContext2D, seed: number) => {
  const r = rngK(seed), S = 2048;
  g.fillStyle = "#8a6a48"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2500; i++) { g.fillStyle = rgba(r() < 0.5 ? "#6e5236" : "#a07e58", 0.25); g.beginPath(); g.ellipse(r() * S, r() * S, 8 + r() * 40, 4 + r() * 16, r() * 3, 0, TAU); g.fill(); }
  // paths: a main lane along x and a branch toward z
  g.strokeStyle = rgba("#c8a77a", 0.7); g.lineCap = "round";
  g.lineWidth = 230; g.beginPath(); g.moveTo(0, S * 0.56); g.bezierCurveTo(S * 0.3, S * 0.5, S * 0.6, S * 0.62, S, S * 0.54); g.stroke();
  g.lineWidth = 140; g.beginPath(); g.moveTo(S * 0.52, S * 0.58); g.bezierCurveTo(S * 0.5, S * 0.4, S * 0.58, S * 0.2, S * 0.55, 0); g.stroke();
  for (let i = 0; i < 300; i++) { g.strokeStyle = rgba("#7a5a3a", 0.35); g.lineWidth = 3; const x = r() * S, y = S * 0.5 + (r() - 0.5) * 260; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y + (r() - 0.5) * 6); g.stroke(); } // cart ruts
  for (let i = 0; i < 900; i++) { const x = r() * S, y = r() * S; if (Math.abs(y - S * 0.56) < 160) continue; g.strokeStyle = rgba(r() < 0.5 ? "#5f7a3a" : "#7a8a44", 0.6); g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (k - 1.5) * 3, y - 6 - r() * 5); g.stroke(); } }
  for (let i = 0; i < 500; i++) { g.fillStyle = rgba(r() < 0.5 ? "#b9a88a" : "#5a4430", 0.55); g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 2.2, 0, TAU); g.fill(); }
};
