// Visual kit: set dressing for the 1944 Bombay docks. Canvas drawings with ink outlines and form shading (bottom-centre
// = where each stands; design sizes per function): a riveted cargo steamer (side view, hatches, derricks, funnel,
// lifeboats), a dockside crane, crates / cotton bales / drums, a bollard with a mooring rope, Bombay-colonial stone
// buildings with arcades, a Gothic clock tower (hands at 4:06), a godown shed, a gas lamp, the distant skyline, and the
// painted quay ground (stone setts, rail tracks, the quay edge). No text or real logos anywhere.
import { KPen, P2, INK, TAU, hash, mix, shade, tint, rgba, ellPts, rrect, curve, lerp, rngK } from "./core";

/** cargo steamer, side view facing left: 4200 x 1500, waterline at y 1300 (the card base 1500 = 200 units below water) */
export const ship = (p: KPen, seed: number, smokeHold = false) => {
  const r = rngK(seed), g = p.g, wl = 1300;
  p.ow = 9;
  // hull: raked bow on the left, counter stern on the right, sheer line rising to both ends
  const sheer = (x: number) => 900 - 90 * ((x - 2100) / 1900) ** 2;
  const hull: P2[] = [[180, sheer(200) - 40]];
  for (let x = 300; x <= 3950; x += 150) hull.push([x, sheer(x)]);
  hull.push([4050, sheer(4000) - 30], [4000, 1150], [3900, 1420], [500, 1440], [260, 1200]);
  p.poly(hull, p.lin(0, 850, 0, 1440, [[0, "#2c3a42"], [0.6, "#24313a"], [1, "#1a242b"]]), 0);
  p.clip(hull, () => {
    g.fillStyle = "#a8322e"; g.fillRect(0, wl - 40, 4200, 400);                               // red boot-topping
    g.fillStyle = "#e9e2cc"; g.fillRect(0, sheer(2100) - 6, 4200, 26);                          // white sheer stripe
    for (let x = 400; x < 3900; x += 70) for (let y = 960; y < wl - 50; y += 90) p.dot(x + (y % 180 ? 35 : 0), y, 3.5, rgba("#0c1418", 0.6)); // rivets
    for (let x = 500; x < 3900; x += 420) p.stroke([[x, sheer(x) + 20], [x - 20, 1430]], 3, rgba("#0c1418", 0.5)); // plate seams
    for (let x = 560; x < 3800; x += 260) { p.ell(x, 1010, 18, 18, "#3d4f58", 4); p.ell(x - 3, 1007, 8, 8, rgba("#cfe8f0", 0.6), 0); } // portholes
    g.fillStyle = rgba("#7a5030", 0.45); for (let i = 0; i < 30; i++) g.fillRect(400 + r() * 3400, 980 + r() * 250, 6 + r() * 10, 30 + r() * 80); // rust streaks
    g.fillStyle = p.lin(0, 850, 0, 980, [[0, rgba("#ffffff", 0.12)], [1, rgba("#ffffff", 0)]]); g.fillRect(0, 850, 4200, 130);
  });
  p.poly(hull, null);
  p.stroke([[300, sheer(300) - 30], [4000, sheer(4000) - 40]], 0, INK);
  // anchor at the bow
  p.poly([[330, 980], [370, 980], [380, 1060], [320, 1060]], "#1a2228", 4); p.stroke(curve([350, 1060], [320, 1090], [300, 1070]), 6);
  // railings along the deck
  for (let x = 260; x < 3980; x += 40) p.stroke([[x, sheer(x) - 5], [x, sheer(x) - 55]], 3, "#e9e2cc");
  p.stroke(Array.from({ length: 40 }, (_, i) => { const x = 260 + i * 95; return [x, sheer(x) - 55] as P2; }), 4, "#e9e2cc");
  // forecastle + poop
  p.poly([[260, sheer(260) - 120], [800, sheer(800) - 100], [800, sheer(800)], [240, sheer(240)]], "#e9e2cc");
  p.poly([[3500, sheer(3500) - 110], [4020, sheer(4020) - 130], [4030, sheer(4030)], [3500, sheer(3500)]], "#e9e2cc");
  // hatches with tarpaulins + wooden coamings; hold 2 may smoke
  const hatches = [1050, 1550, 2700, 3200];
  hatches.forEach((x, i) => {
    p.poly([[x - 170, sheer(x) - 20], [x + 170, sheer(x) - 20], [x + 160, sheer(x) - 110], [x - 160, sheer(x) - 110]], "#6a7a4a");
    p.stroke([[x - 160, sheer(x) - 70], [x + 160, sheer(x) - 70]], 3, rgba(INK, 0.5));
    if (smokeHold && i === 0) p.poly(rrect(x - 90, sheer(x) - 125, x + 90, sheer(x) - 100, 6), "#2a1a12");
  });
  // midship superstructure: bridge with windows, wheelhouse, funnel
  const sx0 = 1850, sx1 = 2450, deck = sheer(2150);
  p.poly(rrect(sx0, deck - 260, sx1, deck, 10), p.lin(sx0, 0, sx1, 0, [[0, "#f3eedc"], [1, "#cfc8b0"]]));
  for (let i = 0; i < 9; i++) p.poly(rrect(sx0 + 30 + i * 62, deck - 220, sx0 + 70 + i * 62, deck - 180, 4), "#2f4a52", 3);
  p.poly(rrect(sx0 + 80, deck - 420, sx1 - 120, deck - 260, 10), "#f3eedc");
  for (let i = 0; i < 6; i++) p.poly(rrect(sx0 + 110 + i * 62, deck - 390, sx0 + 150 + i * 62, deck - 340, 4), "#2f4a52", 3);
  p.poly(rrect(sx0 + 40, deck - 440, sx1 - 80, deck - 415, 6), "#e9e2cc");
  // lifeboats on davits
  for (const x of [sx0 + 60, sx1 - 160]) { p.poly(ellPts(x + 50, deck - 280, 90, 30, 0, 180, 0, 12), "#f3eedc"); p.stroke(curve([x - 20, deck - 260], [x - 30, deck - 330], [x + 10, deck - 330]), 6); }
  // funnel (black top, sea-green band)
  const fx = 2250;
  const funnel: P2[] = [[fx - 110, deck - 420], [fx + 110, deck - 420], [fx + 140, deck - 780], [fx - 70, deck - 780]];
  p.poly(funnel, p.lin(fx - 110, 0, fx + 140, 0, [[0, "#d8c27a"], [1, "#9a8448"]]));
  p.clip(funnel, () => { g.fillStyle = "#1a1e22"; g.fillRect(fx - 200, deck - 800, 400, 120); g.fillStyle = "#2f8f83"; g.fillRect(fx - 200, deck - 640, 400, 50); });
  p.poly(funnel, null);
  // masts + derricks (cargo booms) + rigging
  for (const mx of [1300, 2950]) {
    p.band([[mx, sheer(mx)], [mx, sheer(mx) - 760]], "#c9b48a", 22, 5);
    p.band([[mx - 60, sheer(mx) - 520], [mx + 60, sheer(mx) - 520]], "#c9b48a", 14, 4);
    for (const s of [-1, 1]) { p.band([[mx, sheer(mx) - 40], [mx + s * 520, sheer(mx) - 520]], "#8a7a5a", 14, 4); p.stroke([[mx, sheer(mx) - 700], [mx + s * 520, sheer(mx) - 520]], 3); p.stroke([[mx + s * 520, sheer(mx) - 520], [mx + s * 520, sheer(mx) - 260]], 3); }
    p.stroke([[mx, sheer(mx) - 760], [mx - 700, sheer(mx - 700)]], 2.5, rgba(INK, 0.8)); p.stroke([[mx, sheer(mx) - 760], [mx + 700, sheer(mx + 700)]], 2.5, rgba(INK, 0.8));
  }
  p.stroke([[1300, sheer(1300) - 760], [2950, sheer(2950) - 760]], 2.5, rgba(INK, 0.8));
  // flag at the stern (plain colours, no real ensign)
  p.stroke([[4000, sheer(4000) - 130], [4000, sheer(4000) - 330]], 5);
  p.poly([[4000, sheer(4000) - 330], [4130, sheer(4000) - 310], [4120, sheer(4000) - 250], [4000, sheer(4000) - 260]], "#2f5f66", 4);
};

/** dockside crane (portal on rails, cab, lattice jib): 1400 x 2800, base 2780; jib angle in degrees above horizontal */
export const crane = (p: KPen, seed: number, jib = 55, col = "#d9a441") => {
  const g = p.g; p.ow = 7;
  const lattice = (a: P2, b: P2, w: number, c: string) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2;
    const A1: P2 = [a[0] + nx, a[1] + ny], A2: P2 = [a[0] - nx, a[1] - ny], B1: P2 = [b[0] + nx, b[1] + ny], B2: P2 = [b[0] - nx, b[1] - ny];
    const n = Math.max(3, Math.round(l / (w * 1.1)));
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; p.stroke([[lerp(A1[0], B1[0], t0), lerp(A1[1], B1[1], t0)], [lerp(A2[0], B2[0], t1), lerp(A2[1], B2[1], t1)]], w * 0.09, shade(c, 0.85)); }
    p.band([A1, B1], c, w * 0.16, 3); p.band([A2, B2], c, w * 0.16, 3);
  };
  // portal legs on rails
  lattice([300, 2760], [620, 1500], 110, col); lattice([1100, 2760], [780, 1500], 110, col);
  p.band([[230, 2760], [1170, 2760]], "#5a5a5a", 26, 4);
  p.poly(rrect(520, 1420, 880, 1520, 10), shade(col, 0.9));
  // rotating cab with windows
  p.poly(rrect(500, 1160, 900, 1430, 14), p.lin(500, 0, 900, 0, [[0, tint(col, 0.15)], [1, shade(col, 0.78)]]));
  for (let i = 0; i < 3; i++) p.poly(rrect(530 + i * 115, 1200, 620 + i * 115, 1290, 6), "#2f4a52", 4);
  p.poly(rrect(860, 1240, 960, 1400, 8), "#3a3a3a"); // counterweight
  // jib from the cab up
  const a = (jib * Math.PI) / 180, J0: P2 = [560, 1300], J1: P2 = [J0[0] - Math.cos(a) * 1250, J0[1] - Math.sin(a) * 1250];
  lattice(J0, J1, 90, col);
  p.stroke([[820, 1160], [760, 900], J1], 4);
  p.band([[760, 900], [760, 1160]], col, 18, 4);
  // hook block hanging from the jib tip
  const hy = J1[1] + 650;
  p.stroke([[J1[0] - 6, J1[1]], [J1[0] - 6, hy]], 4); p.stroke([[J1[0] + 6, J1[1]], [J1[0] + 6, hy]], 4);
  p.poly(rrect(J1[0] - 30, hy, J1[0] + 30, hy + 70, 8), "#e8443a"); p.stroke(curve([J1[0], hy + 70], [J1[0] + 30, hy + 120], [J1[0], hy + 130]), 10);
  void g; void seed;
};

/** stack of wooden crates / bales / drums: 900 x 700, base 690; kind by seed */
export const cargo = (p: KPen, seed: number) => {
  const r = rngK(seed); p.ow = 6;
  const crate = (x: number, y: number, w: number, h: number, c: string) => {
    p.poly(rrect(x, y, x + w, y + h, 6), p.lin(x, 0, x + w, 0, [[0, tint(c, 0.1)], [1, shade(c, 0.8)]]));
    p.clip(rrect(x, y, x + w, y + h, 6), () => { for (let k = 1; k < 4; k++) p.stroke([[x, y + (h * k) / 4], [x + w, y + (h * k) / 4]], 2, rgba(INK, 0.35)); });
    p.band([[x + 10, y + 10], [x + w - 10, y + h - 10]], shade(c, 0.85), 12, 3); p.band([[x + w - 10, y + 10], [x + 10, y + h - 10]], shade(c, 0.85), 12, 3);
    p.poly(rrect(x, y, x + w, y + h, 6), null);
    p.poly(rrect(x + w * 0.3, y + h * 0.35, x + w * 0.7, y + h * 0.65, 4), rgba("#10222b", 0.18), 0);
  };
  const bale = (x: number, y: number, w: number, h: number) => {
    p.poly(rrect(x, y, x + w, y + h, 30), p.lin(x, y, x + w, y + h, [[0, "#f3ecd8"], [1, "#c9bfa6"]]));
    for (let k = 1; k < 4; k++) p.band([[x + (w * k) / 4, y + 4], [x + (w * k) / 4, y + h - 4]], "#5a4a3a", 6, 2);
  };
  const drum = (x: number, y: number, c: string) => { p.poly(rrect(x, y, x + 150, y + 220, 14), p.lin(x, 0, x + 150, 0, [[0, tint(c, 0.2)], [1, shade(c, 0.7)]])); for (const k of [70, 150]) p.stroke([[x, y + k], [x + 150, y + k]], 5, rgba(INK, 0.6)); p.ell(x + 75, y + 8, 75, 14, shade(c, 0.85)); };
  const kind = seed % 3;
  if (kind === 0) { crate(60, 380, 340, 310, "#b08050"); crate(420, 420, 300, 270, "#c49a62"); crate(170, 110, 300, 270, "#a87448"); }
  else if (kind === 1) { bale(40, 430, 400, 260); bale(460, 430, 400, 260); bale(200, 180, 420, 250); }
  else { drum(80, 470, "#2f8f83"); drum(250, 470, "#c8323a"); drum(420, 470, "#2f8f83"); crate(600, 420, 260, 270, "#b08050"); drum(330, 250, "#3a4a52"); }
  void r;
};

/** cast-iron bollard with a mooring rope: 400 x 360, base 350 */
export const bollard = (p: KPen, seed: number) => {
  p.ow = 6;
  p.poly([[110, 350], [120, 170], [280, 170], [290, 350]], p.lin(110, 0, 290, 0, [[0, "#4a5a62"], [1, "#1e2a30"]]));
  p.ell(200, 170, 110, 34, "#3a4a52"); p.ell(200, 160, 90, 22, "#56666e");
  p.band(curve([0, 330], [120, 220], [200, 230], 8), "#c9b48a", 22, 4);
  for (let i = 0; i < 6; i++) p.stroke([[30 + i * 30, 300 - i * 14], [40 + i * 30, 318 - i * 14]], 3, rgba(INK, 0.5));
  p.band(curve([200, 230], [300, 250], [400, 330], 8), "#c9b48a", 22, 4);
  void seed;
};

/** Bombay-colonial stone building: 2400 x 1700, base 1690. Arcade on the ground floor, shuttered windows, cornice,
 *  balustrade, small corner domes (variant by seed). night = lit windows */
export const colonial = (p: KPen, seed: number, night = 0) => {
  const r = rngK(seed), g = p.g; p.ow = 8;
  const stone = ["#e2cfa8", "#d9c49a", "#e8d8b4"][seed % 3], trimC = shade(stone, 0.8);
  const x0 = 100, x1 = 2300, top = 380, base = 1690;
  p.poly([[x0, top], [x1, top], [x1, base], [x0, base]], p.lin(0, top, 0, base, [[0, tint(stone, 0.06)], [1, shade(stone, 0.85)]]), 0);
  p.clip([[x0, top], [x1, top], [x1, base], [x0, base]], () => {
    for (let y = top; y < base; y += 48) p.stroke([[x0, y], [x1, y]], 2, rgba(INK, 0.15));
    for (let i = 0; i < 40; i++) { g.fillStyle = rgba("#7a6a4a", 0.12); g.fillRect(x0 + r() * 2200, top + r() * 1300, 30 + r() * 80, 20 + r() * 40); }
  });
  p.poly([[x0, top], [x1, top], [x1, base], [x0, base]], null);
  // ground-floor arcade (pointed arches), deep shadow inside
  const n = 7, aw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + aw * (i + 0.5), w = aw * 0.36, y0 = base, y1 = base - 360;
    const arch: P2[] = [[cx - w, y0], [cx - w, y1], ...curve([cx - w, y1], [cx - w * 0.2, y1 - w * 1.0], [cx, y1 - w * 1.25], 6).slice(1), ...curve([cx, y1 - w * 1.25], [cx + w * 0.2, y1 - w * 1.0], [cx + w, y1], 6).slice(1), [cx + w, y0]];
    p.poly(arch, night ? p.rad(cx, y0 - 120, 260, [[0, mix("#3a2a20", "#ffbf6a", night * 0.8)], [1, "#1e1a18"]]) : p.lin(0, y1 - w, 0, y0, [[0, "#3a3430"], [1, "#5a5048"]]));
    p.stroke(arch.slice(1, -1).map(([x, y]) => [x + (x - cx) * 0.12, y - 14] as P2), 10, trimC);
  }
  p.band([[x0, base - 520], [x1, base - 520]], trimC, 30, 4);
  // two upper floors of tall shuttered windows with hood mouldings
  for (let fl = 0; fl < 2; fl++) for (let i = 0; i < n; i++) {
    const cx = x0 + aw * (i + 0.5), y = base - 640 - fl * 340, w = aw * 0.2, h = 220;
    const lit = night > 0 && hash(i + fl * 10, seed) < 0.45;
    p.poly(rrect(cx - w, y - h, cx + w, y, 8), lit ? p.rad(cx, y - h / 2, h, [[0, "#ffe2a0"], [1, "#e88a2c"]]) : "#2f4a52");
    for (const s of [-1, 1]) { const sh: P2[] = [[cx + s * w, y - h], [cx + s * (w + 44), y - h + 6], [cx + s * (w + 44), y - 6], [cx + s * w, y]]; p.poly(sh, "#2f8f83", 5); for (let k = 1; k < 7; k++) p.stroke([[cx + s * w, y - h + k * 31], [cx + s * (w + 44), y - h + k * 31 + 3]], 2, rgba(INK, 0.4)); }
    p.stroke(curve([cx - w - 20, y - h - 10], [cx, y - h - 60], [cx + w + 20, y - h - 10]), 12, trimC);
    p.band([[cx - w - 20, y + 10], [cx + w + 20, y + 10]], trimC, 14, 3);
  }
  // cornice, balustrade, corner domes
  p.band([[x0 - 40, top], [x1 + 40, top]], trimC, 40, 5);
  p.poly(rrect(x0, top - 120, x1, top - 20, 4), tint(stone, 0.05));
  for (let x = x0 + 30; x < x1; x += 46) p.poly(rrect(x, top - 105, x + 22, top - 30, 9), trimC, 3);
  p.band([[x0 - 20, top - 125], [x1 + 20, top - 125]], trimC, 22, 4);
  for (const cx of [x0 + 120, x1 - 120]) {
    p.poly(rrect(cx - 110, top - 380, cx + 110, top - 120, 6), stone);
    p.poly([[cx - 130, top - 380], ...curve([cx - 130, top - 380], [cx, top - 640], [cx + 130, top - 380], 14).slice(1)], "#b08a5a");
    p.stroke([[cx, top - 560], [cx, top - 640]], 8);
    p.ell(cx, top - 250, 40, 70, "#2f4a52", 5);
  }
};

/** Gothic clock tower (hands at 4:06): 900 x 3200, base 3180 */
export const clockTower = (p: KPen, seed: number, glow = 0) => {
  p.ow = 8;
  const stone = "#e0c89a", trimC = "#b89a68";
  const shaft: P2[] = [[220, 3180], [220, 1100], [680, 1100], [680, 3180]];
  p.poly(shaft, p.lin(220, 0, 680, 0, [[0, tint(stone, 0.08)], [1, shade(stone, 0.75)]]));
  p.clip(shaft, () => { for (let y = 1100; y < 3180; y += 60) p.stroke([[220, y], [680, y]], 2, rgba(INK, 0.15)); for (let k = 0; k < 4; k++) p.band([[220, 1500 + k * 420], [680, 1500 + k * 420]], trimC, 24, 3); });
  p.poly(shaft, null);
  for (let k = 0; k < 4; k++) p.poly(rrect(400, 1650 + k * 420, 500, 1820 + k * 420, 40), "#2f4a52", 5);
  // clock stage
  p.poly(rrect(180, 700, 720, 1120, 10), tint(stone, 0.05));
  p.ell(450, 900, 180, 180, glow ? p.rad(450, 900, 180, [[0, "#fff6d8"], [1, "#f2d69a"]]) : "#f6f0de", 9);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; p.stroke([[450 + Math.cos(a) * 150, 900 + Math.sin(a) * 150], [450 + Math.cos(a) * 168, 900 + Math.sin(a) * 168]], i % 3 ? 5 : 10); }
  const hA = ((4 + 6 / 60) / 12) * TAU - Math.PI / 2, mA = (6 / 60) * TAU - Math.PI / 2;
  p.stroke([[450, 900], [450 + Math.cos(hA) * 95, 900 + Math.sin(hA) * 95]], 14); p.stroke([[450, 900], [450 + Math.cos(mA) * 140, 900 + Math.sin(mA) * 140]], 8); p.dot(450, 900, 14);
  // pinnacles + spire
  for (const x of [200, 700]) { p.poly([[x - 40, 720], [x, 520], [x + 40, 720]], trimC); }
  p.poly([[230, 720], [450, 120], [670, 720]], p.lin(230, 0, 670, 0, [[0, "#c9a870"], [1, "#8a6a40"]]));
  p.clip([[230, 720], [450, 120], [670, 720]], () => { for (let y = 200; y < 720; y += 45) p.stroke([[200, y], [700, y]], 3, rgba(INK, 0.3)); });
  p.poly([[230, 720], [450, 120], [670, 720]], null);
  p.stroke([[450, 120], [450, 30]], 8); p.dot(450, 40, 14, "#d6a542");
  void seed;
};

/** godown / warehouse shed with a corrugated roof and a big door: 2000 x 1100, base 1090 */
export const godown = (p: KPen, seed: number) => {
  p.ow = 8;
  const c = ["#b9a88a", "#a89878", "#c4b494"][seed % 3];
  p.poly([[100, 1090], [100, 420], [1900, 420], [1900, 1090]], p.lin(0, 420, 0, 1090, [[0, c], [1, shade(c, 0.8)]]));
  p.poly([[40, 440], [1000, 160], [1960, 440]], "#8a9a9a");
  p.clip([[40, 440], [1000, 160], [1960, 440]], () => { for (let x = 40; x < 1960; x += 34) p.stroke([[x, 160], [x, 440]], 6, rgba(INK, 0.25)); });
  p.poly([[40, 440], [1000, 160], [1960, 440]], null);
  p.poly(rrect(700, 640, 1300, 1090, 6), "#3a3430");
  p.clip(rrect(700, 640, 1300, 1090, 6), () => { for (let i = 0; i < 6; i++) p.poly(rrect(720 + i * 95, 680 + (i % 2) * 30, 800 + i * 95, 1090, 6), "#b08050", 3); });
  for (const x of [300, 1600]) p.poly(rrect(x - 90, 560, x + 90, 700, 6), "#2f4a52");
  p.band([[100, 620], [1900, 620]], shade(c, 0.7), 14, 3);
  void seed;
};

/** gas lamp post: 200 x 1100, base 1090; light at (100, 230) */
export const gasLamp = (p: KPen, seed: number) => {
  p.ow = 6;
  p.band([[100, 1090], [100, 320]], "#2a3a40", 22, 4);
  p.poly(rrect(70, 1000, 130, 1090, 8), "#2a3a40");
  p.poly([[60, 320], [140, 320], [160, 200], [40, 200]], p.rad(100, 260, 90, [[0, "#fff6d0"], [1, "#f2c46a"]]));
  p.poly([[30, 200], [170, 200], [100, 140]], "#2a3a40");
  void seed;
};

/** distant city skyline (towers, domes, chimneys): 5000 x 900, base 900 */
export const skyline = (p: KPen, seed: number, col = "#8fa7a8") => {
  const r = rngK(seed);
  const pts: P2[] = [[0, 900]];
  let x = 0;
  while (x < 5000) {
    const w = 120 + r() * 240, h = 200 + r() * 380, kind = r();
    pts.push([x, 900 - h]);
    if (kind < 0.15) { for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; pts.push([x + w / 2 + Math.cos(a) * w / 2, 900 - h + Math.sin(a) * w * 0.5]); } }
    else if (kind < 0.25) { pts.push([x + w / 2 - 20, 900 - h], [x + w / 2, 900 - h - 260], [x + w / 2 + 20, 900 - h]); }
    else if (kind < 0.35) { pts.push([x + w * 0.7, 900 - h], [x + w * 0.7, 900 - h - 200], [x + w * 0.8, 900 - h - 200], [x + w * 0.8, 900 - h]); }
    pts.push([x + w, 900 - h]);
    x += w;
  }
  pts.push([5000, 900]);
  p.poly(pts, p.lin(0, 300, 0, 900, [[0, tint(col, 0.1)], [1, col]]), 0);
};

/** painted quay (stone setts, two rail tracks along x, the quay edge at the far z end): 2048 canvas */
export const quayGround = (g: CanvasRenderingContext2D, seed: number) => {
  const r = rngK(seed), S = 2048;
  g.fillStyle = "#a89c86"; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) for (let x = (y / 32) % 2 ? 0 : 24; x < S; x += 48) { g.fillStyle = rgba(r() < 0.5 ? "#9a8e78" : "#b8ac96", 0.9); g.fillRect(x + 2, y + 2, 44, 28); }
  for (const ty of [S * 0.42, S * 0.62]) {
    for (let x = 0; x < S; x += 40) { g.fillStyle = "#6a5a48"; g.fillRect(x, ty - 30, 22, 140); }
    g.fillStyle = "#5a6064"; g.fillRect(0, ty - 10, S, 12); g.fillRect(0, ty + 80, S, 12);
    g.fillStyle = rgba("#ffffff", 0.35); g.fillRect(0, ty - 10, S, 3); g.fillRect(0, ty + 80, S, 3);
  }
  for (let i = 0; i < 200; i++) { g.fillStyle = rgba("#4a4038", 0.2); g.beginPath(); g.ellipse(r() * S, r() * S, 20 + r() * 60, 8 + r() * 20, 0, 0, TAU); g.fill(); }
  g.fillStyle = "#d8ccb0"; g.fillRect(0, 0, S, 40); g.fillStyle = "#6a6050"; g.fillRect(0, 40, S, 12); // quay edge coping
};
