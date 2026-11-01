// Tunguska-only 2D art, drawn with the same Pen as the cast (plum ink, flat fills, painted crescents):
// reindeer, the fireball and its bow shock, the airburst, ground dust ring, stripped needles, straw + hand
// (the analogy), arrows, tent hide, globe map, starfield screens and the shooting star. No text anywhere.
import { Pen, INK, mix, shade } from "./toon";
import { ctex, rng } from "./paint";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const ellP = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 40): P2[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, c = Math.cos(rot), s = Math.sin(rot), x = rx * Math.cos(a), y = ry * Math.sin(a); return [cx + x * c - y * s, cy + x * s + y * c] as P2; });

// ---------------- reindeer: side view facing +x on a 700 x 600 card, hooves on y = 580 ----------------
/** phase 0..1 walk cycle (0 = standing), graze 0 (head up) .. 1 (head down), light = canvas angle of the sun */
export const reindeer = (p: Pen, o: { phase?: number; graze?: number; light?: number; coat?: string; blink?: boolean; look?: number }) => {
  const { phase = 0, graze = 0, light = rad(-120), coat = "#8d6446", blink = false } = o;
  const belly = "#e6d6b8", ruff = "#f3ece0", dark = shade(coat, 0.62), hoof = "#2d2228";
  const walk = phase > 0;
  const legs: [number, number][] = [[200, 0], [255, 0.5], [420, 0.5], [470, 0]];
  // far legs first (darker), then body, then near legs
  const leg = (x: number, ph: number, far: boolean) => {
    const sw = walk ? Math.sin(TAU * (phase + ph)) : 0, lift = walk ? Math.max(0, Math.cos(TAU * (phase + ph))) * 22 : 0;
    const top: P2 = [x, 380], knee: P2 = [x + 10 + sw * 18, 470 - lift * 0.4], foot: P2 = [x + sw * 34, 572 - lift];
    const col = far ? shade(coat, 0.55) : shade(coat, 0.8);
    p.stroke([top, knee, foot], 30, INK); p.stroke([top, knee, foot], 18, col);
    p.ell(foot[0] + 4, foot[1] + 2, 15, 9, hoof, 5);
  };
  leg(legs[1][0] + 14, legs[1][1], true); leg(legs[3][0] + 14, legs[3][1], true);
  // body
  const body = ellP(335, 330, 185, 92, 0.02, 48);
  p.gradFill(body, coat, dark, light, 0.25);
  p.clip(body, () => { p.ell(335, 420, 170, 50, belly, 0); });
  p.inkRing(body, 11, rad(90), 0.4);
  p.ell(160, 300, 26, 20, ruff, 6, 0, 360, -30); // tail
  // neck + head (lowered when grazing)
  const g = Math.max(0, Math.min(1, graze));
  const hx = 575 + 25 * g, hy = 175 + 330 * g, nx0 = 470, ny0 = 300;
  const neck: P2[] = [[nx0 - 30, ny0 - 50], [hx - 40, hy - 28 + 10 * g], [hx - 8, hy + 22], [nx0 + 30, ny0 + 60], [nx0 - 10, ny0 + 70]];
  p.poly(neck, coat, 10);
  const ruffP: P2[] = [[nx0 - 10, ny0 - 20], [nx0 + 50 + 30 * g, ny0 + 10 + 60 * g], [nx0 + 60 + 20 * g, ny0 + 60 + 40 * g], [nx0 + 20, ny0 + 95], [nx0 - 25, ny0 + 60]];
  p.poly(ruffP, ruff, 8);
  // antlers (behind the head): two branched beams, cream bone
  const ab: P2 = [hx - 18, hy - 26], bone = "#efe2c2";
  const beam = (dx: number, k: number) => {
    const s = 1 - 0.25 * k;
    const pts: P2[] = [ab, [ab[0] - 30 * s + dx, ab[1] - 70 * s], [ab[0] - 80 * s + dx, ab[1] - 120 * s], [ab[0] - 60 * s + dx, ab[1] - 175 * s]];
    p.line(pts, bone, 11 * s);
    p.line([[ab[0] - 32 * s + dx, ab[1] - 72 * s], [ab[0] + 10 * s + dx, ab[1] - 110 * s]], bone, 9 * s);
    p.line([[ab[0] - 70 * s + dx, ab[1] - 135 * s], [ab[0] - 110 * s + dx, ab[1] - 150 * s]], bone, 8 * s);
    p.line([[ab[0] - 5 + dx, ab[1] - 18], [ab[0] + 28 + dx, ab[1] - 40]], bone, 8 * s);
  };
  beam(18, 1); beam(0, 0);
  // head: a long soft wedge with a dark muzzle
  const head = ellP(hx + 12, hy, 62, 34, rad(18 + 40 * g), 40);
  p.gradFill(head, coat, dark, light, 0.3);
  p.inkRing(head, 9, rad(90), 0.35);
  const mu = rotate([[hx + 58, hy + 6]], rad(18 + 40 * g), [hx + 12, hy])[0];
  p.ell(mu[0], mu[1], 22, 17, "#3a2a2e", 5);
  p.ell(hx - 30, hy - 22, 20, 10, coat, 6, 0, 360, -40); // ear
  if (blink) p.stroke([[hx - 4, hy - 6], [hx + 12, hy - 6]], 6); else p.dot(hx + 4, hy - 6, 8);
  leg(legs[0][0], legs[0][1], false); leg(legs[2][0], legs[2][1], false);
};
const rotate = (pts: P2[], a: number, c: P2): P2[] => pts.map(([x, y]) => [c[0] + (x - c[0]) * Math.cos(a) - (y - c[1]) * Math.sin(a), c[1] + (x - c[0]) * Math.sin(a) + (y - c[1]) * Math.cos(a)]);

// ---------------- the fireball: 1000 x 400 card, the rock at (780, 200), trail streaming to -x ----------------
export const fxFireball = (p: Pen, crack = 0, flick = 0) => {
  const cx = 780, cy = 200;
  const tail = (len: number, w: number, col: string, ol: number) => {
    const pts: P2[] = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16, x = cx - len * t, y = cy + Math.sin(t * 9 + flick * 6) * 10 * t - w * (1 - t) ** 0.8; pts.push([x, y]); }
    for (let i = 16; i >= 0; i--) { const t = i / 16, x = cx - len * t, y = cy + Math.sin(t * 9 + flick * 6 + 1) * 10 * t + w * (1 - t) ** 0.8; pts.push([x, y]); }
    p.poly(pts, col, ol);
  };
  tail(760, 120, "#ff7a2a", 12);
  tail(640, 86, "#ffb23a", 0);
  tail(470, 58, "#ffe066", 0);
  tail(260, 36, "#fffbe8", 0);
  p.ell(cx + 6, cy, 92, 92, "#ffb23a", 10);
  p.ell(cx + 8, cy, 70, 70, "#ffe88a", 0);
  // rock: lumpy, dark, with a hot rim facing the travel direction
  const r = rng(7), lump: P2[] = [];
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, k = 46 + r() * 12; lump.push([cx + 14 + k * Math.cos(a), cy + k * 0.92 * Math.sin(a)]); }
  p.poly(lump, "#5e4a48", 9);
  p.clip(lump, () => { p.ell(cx + 52, cy - 6, 34, 52, "#ff9a4a", 0); p.ell(cx - 6, cy + 18, 16, 12, "#4a3a3a", 0); p.ell(cx + 20, cy - 22, 10, 8, "#4a3a3a", 0); });
  if (crack > 0) {
    const k = Math.min(1, crack);
    p.stroke([[cx + 40, cy - 40], [cx + 22, cy - 10 * k], [cx + 34, cy + 6], [cx + 12 + 10 * k, cy + 40 * k]], 7, "#fff6c0");
    p.stroke([[cx - 20, cy - 38 * k], [cx - 4, cy - 8], [cx - 26 * k, cy + 20]], 6, "#fff6c0");
  }
};
/** the squeezed air in front of the rock: a white bow-shock cap + speed lines, 600 x 600, the rock at (240, 300) */
export const fxBowShock = (p: Pen, squeeze: number) => {
  const k = 0.6 + 0.4 * squeeze, cx = 240, cy = 300;
  const cap: P2[] = [];
  for (let i = 0; i <= 24; i++) { const a = rad(-80 + (160 * i) / 24); cap.push([cx + 150 * k * Math.cos(a) + 10, cy + 230 * Math.sin(a)]); }
  for (let i = 24; i >= 0; i--) { const a = rad(-80 + (160 * i) / 24); cap.push([cx + (150 * k - 34 - 30 * squeeze) * Math.cos(a) + 10, cy + 200 * Math.sin(a)]); }
  p.poly(cap, "#f4fbff", 9);
  for (let i = 0; i < 7; i++) { const y = cy - 210 + i * 70, x0 = cx + 120 + (i % 2) * 40; p.stroke([[x0, y], [x0 + 140 + 60 * squeeze, y]], 9, "#ffffff"); }
};

/** the airburst: a white-hot core, yellow and orange shells, a ring of rays, on a 1000 x 1000 card; t 0..1 */
export const fxBlast = (p: Pen, t: number) => {
  const c = 500, e = 1 - (1 - Math.min(1, t)) ** 3;
  for (let i = 0; i < 16; i++) {
    const a = rad(i * 22.5 + 6 * (i % 2)), r0 = 120, r1 = 200 + 290 * e * (0.7 + 0.3 * (i % 2));
    p.poly([[c + r0 * Math.cos(a + 0.12), c + r0 * Math.sin(a + 0.12)], [c + r1 * Math.cos(a), c + r1 * Math.sin(a)], [c + r0 * Math.cos(a - 0.12), c + r0 * Math.sin(a - 0.12)]], "#fff3a0", 8);
  }
  const R = 150 + 230 * e;
  p.ell(c, c, R, R, "#ff8a2a", 12);
  p.ell(c, c, R * 0.78, R * 0.78, "#ffc84a", 0);
  p.ell(c, c, R * 0.55, R * 0.55, "#fff2a8", 0);
  p.ell(c, c, R * 0.32, R * 0.32, "#ffffff", 0);
};
/** smoke + fire cloud left after the flash (mushroom-ish puff), 800 x 800 card, k 0..1 grows, dark 0 hot .. 1 sooty */
export const fxPuffCloud = (p: Pen, k: number, dark: number) => {
  // a proper mushroom: wide skirt, tapering stem, billowing cap (orange fire cooling to cool grey smoke, never brown/mauve)
  const col = mix(mix("#ff8a2a", "#ffb04a", 0.2), "#8d97aa", Math.min(1, dark * 1.3)), lit = mix(col, "#ffe9b0", 0.5), shade = mix(col, "#4b5568", 0.35);
  const X = (x: number) => 400 + (x - 400) * k, Y = (y: number) => 520 + (y - 520) * k;
  p.ell(X(400), Y(655), 215 * k, 52 * k, shade, 10);                                          // ground skirt
  p.poly([[X(335), Y(650)], [X(365), Y(430)], [X(435), Y(430)], [X(465), Y(650)]], col, 10);  // stem
  const cap: [number, number, number][] = [[400, 330, 150], [265, 365, 112], [535, 365, 112], [320, 255, 112], [480, 255, 112], [400, 215, 105], [215, 410, 78], [585, 410, 78]];
  for (const [x, y, r] of cap) p.ell(X(x), Y(y), r * k, r * k * 0.88, col, 10);
  for (const [x, y, r] of cap.slice(3, 6)) p.ell(X(x - 22), Y(y - 24), r * k * 0.5, r * k * 0.4, lit, 0);   // lit crown
  p.ell(X(400), Y(430), 120 * k, 26 * k, shade, 0);                                           // shadow under the cap
};
/** flat ground dust ring for the blast wave (top-down), 1024 x 1024; drawn ring at radius .78-.98 */
export const fxWaveRing = (p: Pen) => {
  const g = p.g;
  for (let i = 0; i < 26; i++) {
    const r = 380 + i * 4.5, a = 0.05 + 0.6 * (i / 26) ** 1.5;
    g.beginPath(); g.arc(512, 512, r, 0, TAU); g.strokeStyle = `rgba(245,232,208,${a.toFixed(3)})`; g.lineWidth = 6; g.stroke();
  }
  g.beginPath(); g.arc(512, 512, 500, 0, TAU); g.strokeStyle = INK; g.lineWidth = 12; g.stroke();
  g.beginPath(); g.arc(512, 512, 486, 0, TAU); g.strokeStyle = "#fff8ea"; g.lineWidth = 14; g.stroke();
};
/** dust billow seen from the side (a wall puff on the wave front), 400 x 300, t 0..1 */
export const fxDust = (p: Pen, t: number, seed: number) => {
  const r = rng(seed + 3);
  for (let i = 0; i < 5; i++) {
    const x = 80 + i * 60 + r() * 20, y = 220 - r() * 60 - 30 * t, rr = (60 + r() * 30) * (0.7 + 0.5 * t);
    p.ell(x, y, rr, rr * 0.8, i % 2 ? "#f1e2c6" : "#e2cfae", 8);
  }
};
/** a pine needle tuft torn off (stripping), 120 x 120 */
export const fxNeedles = (p: Pen, k: number) => {
  for (let i = 0; i < 5; i++) { const a = rad(i * 36 + k * 90); p.stroke([[60, 60], [60 + 46 * Math.cos(a), 60 + 46 * Math.sin(a)]], 12, i % 2 ? "#3f8a4a" : "#5aa250"); }
  p.dot(60, 60, 9, "#6a4a32");
};

// ---------------- the analogy: straw + hand + arrow ----------------
/** a striped drinking straw, 300 x 1000 card, base at (150, 960). squash 0..1 (end-on press), fold 0..1 (sideways kink) */
export const fxStraw = (p: Pen, squash: number, fold: number) => {
  const L = 820 * (1 - 0.04 * squash), w = 46 * (1 + 0.06 * squash), base: P2 = [150, 960], kink = 0.5;
  const seg = (a: P2, ang: number, len: number, s0: number) => {
    const d: P2 = [Math.sin(ang), -Math.cos(ang)], n: P2 = [Math.cos(ang), Math.sin(ang)];
    const q = (t: number, side: number): P2 => [a[0] + d[0] * len * t + n[0] * side * w / 2, a[1] + d[1] * len * t + n[1] * side * w / 2];
    const outline: P2[] = [q(0, -1), q(1, -1), q(1, 1), q(0, 1)];
    p.poly(outline, "#fbf6ee", 0);
    p.clip(outline, () => { for (let i = -2; i < 14; i++) { const t0 = (i * 60 + s0) / len; p.poly([q(t0, -1.6), q(t0 + 0.035, -1.6), q(t0 + 0.075, 1.6), q(t0 + 0.04, 1.6)], "#e8403c", 0); } });
    p.poly(outline, null, 10);
    return [a[0] + d[0] * len, a[1] + d[1] * len] as P2;
  };
  const ang = rad(62) * fold;
  const mid = seg(base, -rad(4) * fold, L * kink, 0);
  const top = seg(mid, ang, L * (1 - kink), L * kink);
  p.ell(top[0], top[1], w / 2, 9, "#f4e6e6", 7, 0, 360, (ang * 180) / Math.PI);
  if (fold > 0.3) p.stroke([[mid[0] - 30, mid[1] + 10], [mid[0] - 10, mid[1] - 4], [mid[0] - 26, mid[1] - 22]], 6); // crease ticks
};
/** a cartoon hand (mitten + thumb + cuff), pushing toward +x, 400 x 300 card */
export const fxHand = (p: Pen, skin = "#f5c9a0", cuff = "#3f6fb5") => {
  p.poly([[0, 100], [120, 90], [130, 210], [0, 210]], cuff, 10);
  const palm: P2[] = [[120, 80], [270, 70], [330, 110], [338, 150], [320, 196], [250, 214], [120, 212]];
  p.poly(palm, skin, 10);
  p.stroke([[262, 120], [326, 128]], 7); p.stroke([[262, 160], [328, 162]], 7);
  p.poly([[170, 82], [215, 30], [250, 40], [232, 92]], skin, 9); // thumb
};
/** chunky flat arrow pointing +y (down) on a 300 x 600 card */
export const fxArrow = (p: Pen, col = "#ff6a3a") => {
  p.poly([[100, 20], [200, 20], [200, 360], [280, 360], [150, 580], [20, 360], [100, 360]], col, 14);
  p.poly([[118, 40], [140, 40], [140, 340], [118, 340]], mix(col, "#ffffff", 0.45), 0);
};
/** a wind gust: three curled speed lines, 600 x 300 */
export const fxGust = (p: Pen, t: number) => {
  for (let i = 0; i < 3; i++) {
    const y = 70 + i * 80, x0 = 30 + 50 * (i % 2) + 40 * t;
    p.stroke([[x0, y], [x0 + 380, y], [x0 + 450, y - 30], [x0 + 420, y - 64], [x0 + 386, y - 40]], 26, INK);
    p.stroke([[x0, y], [x0 + 380, y], [x0 + 450, y - 30], [x0 + 420, y - 64], [x0 + 386, y - 40]], 14, "#ffffff");
  }
};
/** the shooting star of the last line: small white-gold streak + 4-point sparkle, 600 x 200, head at (520, 100) */
export const fxShootingStar = (p: Pen) => {
  p.poly([[520, 100 - 22], [40, 100 - 3], [40, 100 + 3], [520, 100 + 22]], "#fff3b8", 8);
  p.poly([[520, 100 - 12], [200, 100 - 2], [200, 100 + 2], [520, 100 + 12]], "#ffffff", 0);
  p.ell(520, 100, 30, 30, "#ffffff", 8);
};
/** 4-point sparkle star, 400 x 400 */
export const fxSparkle = (p: Pen, t: number) => {
  const c = 200, k = Math.sin(Math.min(1, t) * Math.PI), R = 40 + 150 * k, r = 22 + 20 * k;
  const pts: P2[] = [];
  for (let i = 0; i < 8; i++) { const a = rad(i * 45 - 90), q = i % 2 ? r : R; pts.push([c + q * Math.cos(a), c + q * Math.sin(a)]); }
  p.poly(pts, "#fff6c8", 10);
  p.ell(c, c, r * 0.8, r * 0.8, "#ffffff", 0);
};

// ---------------- textures ----------------
/** chum (conical tent) hide: tan panels, stitched seams, a red band and a dark smoke-flap top. u around, v up */
export const tentTex = () => ctex("tentHide", 1024, 512, (g, r) => {
  g.fillStyle = "#c79a64"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#bd8e58" : "#d2a872"; g.fillRect(i * 128, 0, 128, 512); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,80,40,${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 512, 30 + r() * 60, 12 + r() * 20, 0, 0, TAU); g.fill(); }
  g.strokeStyle = "rgba(60,36,24,0.85)"; g.lineWidth = 4; g.setLineDash([10, 8]);
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = "#c8323a"; g.fillRect(0, 300, 1024, 34);
  g.fillStyle = "#2f6fa8"; for (let i = 0; i < 32; i++) { g.beginPath(); g.moveTo(i * 32 + 16, 304); g.lineTo(i * 32 + 28, 317); g.lineTo(i * 32 + 16, 330); g.lineTo(i * 32 + 4, 317); g.fill(); }
  g.fillStyle = "#7a5636"; g.fillRect(0, 0, 1024, 60);
});
/** bark on the stripped "telegraph pole" trees: grey-silver with dark splits */
export const poleTex = () => ctex("poleBark", 256, 512, (g, r) => {
  g.fillStyle = "#b9aea0"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(70,58,60,${0.2 + r() * 0.4})`; g.lineWidth = 2 + r() * 3; const x = r() * 256, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 30 + r() * 60); g.stroke(); }
  for (let i = 0; i < 8; i++) { g.fillStyle = "rgba(140,120,100,0.5)"; g.fillRect(0, r() * 512, 256, 6); }
});
/** taiga floor: moss green with lichen, berries and needle litter; burnt variant for the aftermath */
export const floorTex = (burnt: boolean) => ctex(burnt ? "floorBurnt" : "floorMoss", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = burnt ? "#8a8456" : "#5f9640"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const x = r() * S, y = r() * S, rr = 60 + r() * 200;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    const c = burnt ? (r() > 0.5 ? "120,112,80" : "150,140,96") : (r() > 0.5 ? "118,168,76" : "70,124,56");
    gr.addColorStop(0, `rgba(${c},0.55)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S;
    g.strokeStyle = burnt ? "rgba(90,80,64,0.5)" : (r() < 0.5 ? "rgba(160,206,96,0.5)" : "rgba(70,120,48,0.55)");
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 14, y - 8 - r() * 8); g.stroke();
  }
  for (let i = 0; i < (burnt ? 10 : 40); i++) { g.fillStyle = burnt ? "#6a5a50" : r() < 0.5 ? "#d8e6c8" : "#c8343a"; g.beginPath(); g.arc(r() * S, r() * S, 3 + r() * 3, 0, TAU); g.fill(); }
});
/** pine foliage: dark-to-mid greens in horizontal tiers with a lighter rim */
export const needleTex = (k: number) => ctex("pineNeedles" + k, 256, 256, (g, r) => {
  const base = ["#2f7a45", "#2a7040", "#36844a"][k % 3];
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 300; i++) { const x = r() * 256, y = r() * 256; g.strokeStyle = r() < 0.5 ? "rgba(90,170,90,0.45)" : "rgba(20,70,40,0.45)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 10); g.stroke(); }
  for (let y = 40; y < 256; y += 64) { g.fillStyle = "rgba(20,60,36,0.35)"; g.fillRect(0, y, 256, 10); }
});
/** stylised globe map (equirectangular): ocean blue, green / ochre continents, white caps */
export const globeTex = () => ctex("globeMap", 2048, 1024, (g) => {
  const W = 2048, H = 1024, X = (lon: number) => ((lon + 180) / 360) * W, Y = (lat: number) => ((90 - lat) / 180) * H;
  g.fillStyle = "#2f86d0"; g.fillRect(0, 0, W, H);
  const land = (pts: [number, number][], col: string) => {
    g.beginPath(); pts.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.closePath();
    g.fillStyle = col; g.fill(); g.strokeStyle = "#1d1426"; g.lineWidth = 7; g.lineJoin = "round"; g.stroke();
  };
  land([[-10, 36], [0, 44], [-5, 50], [10, 55], [25, 58], [28, 70], [60, 72], [100, 77], [140, 72], [180, 68], [170, 60], [160, 52], [140, 46], [130, 35], [122, 25], [108, 20], [104, 2], [95, 12], [80, 8], [72, 20], [58, 25], [45, 13], [35, 28], [28, 36], [15, 38]], "#6fae4a");
  land([[-17, 15], [-12, 30], [10, 36], [32, 31], [43, 12], [51, 11], [40, -10], [36, -25], [20, -35], [12, -18], [10, 4], [-8, 5]], "#d1a65a");
  land([[-165, 65], [-140, 70], [-95, 72], [-70, 65], [-55, 50], [-75, 40], [-81, 26], [-97, 18], [-87, 10], [-105, 22], [-118, 33], [-124, 46], [-150, 60]], "#7cb552");
  land([[-80, 10], [-62, 10], [-50, 0], [-35, -8], [-40, -22], [-55, -35], [-68, -55], [-74, -40], [-71, -18], [-81, -3]], "#5fa248");
  land([[114, -22], [130, -12], [143, -11], [153, -27], [146, -39], [130, -32], [115, -34]], "#d8a258");
  land([[-50, 60], [-20, 70], [-25, 82], [-60, 82], [-72, 76]], "#f4f8ff");
  g.fillStyle = "#f4f8ff"; g.fillRect(0, Y(-72), W, H - Y(-72));
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 3;
  for (let la = -60; la <= 60; la += 30) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke(); }
});
/** sky-survey monitor: deep blue star field (never black), a soft grid, optionally the hidden asteroid */
export const screenTex = (k: number, hidden: boolean) => ctex(`screen${k}${hidden ? "h" : ""}`, 512, 320, (g) => {
  const r = rng(k * 31 + 5);
  const gr = g.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, "#1f2f86"); gr.addColorStop(1, "#3a3a9a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "rgba(140,170,255,0.25)"; g.lineWidth = 2;
  for (let x = 64; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 320); g.stroke(); }
  for (let y = 64; y < 320; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.2 ? "#ffe9a8" : "#f2f4ff"; g.beginPath(); g.arc(r() * 512, r() * 320, 1.5 + r() * 2.5, 0, TAU); g.fill(); }
  if (hidden) {
    g.fillStyle = "#ff9a3a"; g.beginPath(); g.arc(352, 128, 9, 0, TAU); g.fill();
    g.strokeStyle = "#ffdf5a"; g.lineWidth = 5; g.beginPath(); g.arc(352, 128, 26, 0, TAU); g.stroke();
  }
});
/** a framed star chart on the office wall (no text) */
export const chartTex = () => ctex("starChart", 512, 384, (g) => {
  g.fillStyle = "#2b3a8c"; g.fillRect(0, 0, 512, 384);
  const r = rng(99);
  for (let i = 0; i < 60; i++) { g.fillStyle = "#f6f2ff"; g.beginPath(); g.arc(r() * 512, r() * 384, 1.5 + r() * 3, 0, TAU); g.fill(); }
  g.strokeStyle = "#ffd25a"; g.lineWidth = 4; g.beginPath(); g.ellipse(256, 192, 200, 120, -0.3, 0, TAU); g.stroke();
  g.fillStyle = "#ffd25a"; g.beginPath(); g.arc(256, 192, 16, 0, TAU); g.fill();
});
