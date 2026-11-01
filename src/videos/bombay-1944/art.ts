// Bombay 1944 art: painted textures for the sets (chawl facades with shuttered windows, shop fronts, basalt godowns with
// arched doors, the freighter's riveted hull, deck planks, quay granite, cobbles, Mangalore roof tiles, harbour water,
// dredger mud, the memorial's stone, the brigade HQ's brick-and-arch front, container colours) and flat ink effect cards
// (gold bars, smoke puffs, fire, hose spray, a 1940s fire engine, a handcart, laundry lines, kites/crows, marigold
// garlands, a wreath, brass helmets, a far skyline). Gold / fire / helmets reuse the visual kit's drawing (goldBar, flame).
// No text anywhere. Everything is seeded (rng / index), never random, and a pure function of its arguments.
import { Pen } from "../tunguska/toon";
import { ctex, rng } from "../tunguska/paint";
import { KPen, PAL, rgba, shade, tint, mix, ellPts, rrect, hash, TAU, type P2 } from "../../engine/kit/core";
import { goldBar, flame, star } from "../../engine/kit/people";

const K = (p: Pen, ow = 7) => new KPen(p.g, PAL.ink, ow);
const U = (r: () => number, a: number, b: number) => a + (b - a) * r();
const blot = (g: CanvasRenderingContext2D, x: number, y: number, rr: number, col: string) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
};
const INKC = "#10222b";

// ---------------- textures ----------------
export const CHAWL_WALLS = ["#ead9b0", "#e9c98a", "#cfe0cf", "#e8b48c", "#d9d2bd", "#f0dfb8", "#bcd6d0"];
const SHUTTERS = ["#2f8f83", "#1f5f66", "#7a4a2a", "#3a6a8a", "#a0522d", "#2f6f5a"];
/** one chawl bay (3.2 m x 3.2 m, one floor): lime-washed wall, a tall shuttered window with a fanlight, floor band, stains */
export const chawlBay = (k: number) => ctex("bmChawl" + k, 512, 512, (g, r) => {
  const wall = CHAWL_WALLS[k % CHAWL_WALLS.length], sh = SHUTTERS[(k * 3 + 1) % SHUTTERS.length];
  g.fillStyle = wall; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14; i++) blot(g, r() * 512, r() * 512, 40 + r() * 90, r() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(110,80,50,0.10)");
  for (let i = 0; i < 6; i++) { const x = r() * 512; g.fillStyle = "rgba(90,70,50,0.10)"; g.fillRect(x, 300 + r() * 60, 6 + r() * 10, 160 + r() * 60); } // rain streaks
  // floor band + cornice line at the bottom (floor slab)
  g.fillStyle = shade(wall, 0.82); g.fillRect(0, 470, 512, 42); g.fillStyle = INKC; g.fillRect(0, 466, 512, 5); g.fillRect(0, 508, 512, 4);
  // window: arched fanlight, two shutter leaves (louvres), a dark interior gap, a stone sill
  const x0 = 156, x1 = 356, y0 = 120, y1 = 420;
  g.fillStyle = "#1c2a2e"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.beginPath(); g.ellipse((x0 + x1) / 2, y0, (x1 - x0) / 2, 60, 0, Math.PI, 0); g.fillStyle = "#f6e7b8"; g.fill(); g.lineWidth = 7; g.strokeStyle = INKC; g.stroke();
  for (let i = 0; i < 5; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 5; g.beginPath(); g.moveTo((x0 + x1) / 2, y0); g.lineTo((x0 + x1) / 2 + Math.cos(a) * 100, y0 + Math.sin(a) * 60); g.lineWidth = 4; g.stroke(); }
  const open = r() < 0.5 ? 1 : 0;
  for (const [a, b] of [[x0, (x0 + x1) / 2 - (open ? 40 : 0)], [(x0 + x1) / 2 + (open ? 40 : 0), x1]] as [number, number][]) {
    g.fillStyle = sh; g.fillRect(a, y0, b - a, y1 - y0);
    g.fillStyle = shade(sh, 0.75); for (let y = y0 + 14; y < y1 - 6; y += 18) g.fillRect(a + 8, y, b - a - 16, 7);
    g.lineWidth = 6; g.strokeStyle = INKC; g.strokeRect(a, y0, b - a, y1 - y0);
  }
  g.fillStyle = "#d8cbb0"; g.fillRect(x0 - 22, y1, x1 - x0 + 44, 22); g.lineWidth = 5; g.strokeRect(x0 - 22, y1, x1 - x0 + 44, 22);
  // pilaster edges
  g.fillStyle = shade(wall, 0.9); g.fillRect(0, 0, 26, 470); g.fillRect(486, 0, 26, 470);
  g.fillStyle = rgba(INKC, 0.5); g.fillRect(24, 0, 3, 470); g.fillRect(486, 0, 3, 470);
});
/** ground-floor shop front bay (3.2 x 3.2 m): rolled-up shutter, a striped awning stub, a dark shop interior with shelves */
export const shopBay = (k: number) => ctex("bmShop" + k, 512, 512, (g, r) => {
  const wall = shade(CHAWL_WALLS[k % CHAWL_WALLS.length], 0.9);
  g.fillStyle = wall; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#2a2622"; g.fillRect(60, 140, 392, 372);
  for (let i = 0; i < 4; i++) { g.fillStyle = "#6a4a2a"; g.fillRect(70, 200 + i * 70, 372, 10); for (let j = 0; j < 9; j++) { g.fillStyle = [PAL.sun, PAL.coral, PAL.sea, "#f6ecd2", PAL.red][(i * 9 + j + k) % 5]; g.fillRect(80 + j * 40, 170 + i * 70, 26, 30); } }
  g.fillStyle = "#8a8f8f"; g.fillRect(60, 130, 392, 22); for (let x = 60; x < 452; x += 14) { g.fillStyle = "rgba(20,30,30,0.35)"; g.fillRect(x, 130, 3, 22); }
  const ac = [PAL.red, PAL.sea, PAL.sun, PAL.coral][k % 4];
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f6ecd2" : ac; g.fillRect(40 + i * 54, 60, 54, 60); }
  g.lineWidth = 6; g.strokeStyle = INKC; g.strokeRect(40, 60, 432, 60); g.strokeRect(60, 130, 392, 382);
  for (let i = 0; i < 10; i++) blot(g, r() * 512, r() * 140, 40, "rgba(90,70,50,0.12)");
});
/** basalt godown (warehouse) bay, 6 x 6 m: dressed grey-ochre stone courses, a tall arched cargo door, a high window */
export const godownBay = (k: number) => ctex("bmGodown" + k, 512, 512, (g, r) => {
  const base = ["#b9ab8c", "#a99d84", "#c2b394"][k % 3];
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0, row = 0; y < 512; y += 32, row++) for (let x = -(row % 2) * 40; x < 512; x += 80) {
    g.fillStyle = mix(base, r() > 0.5 ? "#ffffff" : "#5a4a3a", 0.08 + 0.1 * r()); g.fillRect(x + 2, y + 2, 76, 28);
  }
  for (let i = 0; i < 12; i++) blot(g, r() * 512, 300 + r() * 212, 60, "rgba(60,50,40,0.18)");
  const dx = 256, w = 200, y0 = 190;
  g.fillStyle = "#3a3026"; g.beginPath(); g.moveTo(dx - w / 2, 512); g.lineTo(dx - w / 2, y0); g.ellipse(dx, y0, w / 2, 70, 0, Math.PI, 0); g.lineTo(dx + w / 2, 512); g.closePath(); g.fill();
  const leaf = k % 2 ? "#7a4a2a" : "#2f5f66";
  g.fillStyle = leaf; g.fillRect(dx - w / 2 + 8, y0 + 10, w / 2 - 14, 502 - y0); if (k % 3) g.fillRect(dx + 6, y0 + 10, w / 2 - 14, 502 - y0);
  g.strokeStyle = shade(leaf, 0.7); g.lineWidth = 6; for (let y = y0 + 40; y < 512; y += 46) { g.beginPath(); g.moveTo(dx - w / 2 + 8, y); g.lineTo(dx + w / 2 - 8, y); g.stroke(); }
  g.lineWidth = 9; g.strokeStyle = INKC; g.beginPath(); g.moveTo(dx - w / 2, 512); g.lineTo(dx - w / 2, y0); g.ellipse(dx, y0, w / 2, 70, 0, Math.PI, 0); g.lineTo(dx + w / 2, 512); g.stroke();
  g.fillStyle = "#e6dcc4"; for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.save(); g.translate(dx + Math.cos(a) * (w / 2 + 14), y0 + Math.sin(a) * 84); g.rotate(a + Math.PI / 2); g.fillRect(-12, -14, 24, 28); g.strokeStyle = INKC; g.lineWidth = 3; g.strokeRect(-12, -14, 24, 28); g.restore(); }
  g.fillStyle = "#24302e"; g.fillRect(40, 40, 60, 80); g.fillRect(412, 40, 60, 80); g.lineWidth = 6; g.strokeStyle = INKC; g.strokeRect(40, 40, 60, 80); g.strokeRect(412, 40, 60, 80);
  for (const x of [40, 412]) for (let i = 1; i < 4; i++) { g.fillStyle = "#6a7a74"; g.fillRect(x + i * 15, 40, 3, 80); }
});
/** the freighter's hull side: u along the ship (8 m per tile), v = keel (v 0) .. deck (v 1): red boot-topping under the
 *  waterline, a white line, war-grey plating with rivet seams, rust streaks under the scuppers */
export const hullTex = () => ctex("bmHull", 1024, 512, (g, r) => {
  // canvas y 0 = deck (v 1), y 512 = keel (v 0); waterline at (5 - WATER)/9 of the height from the deck = 0.69
  const wl = Math.round(512 * (5 + 1.2) / 9);
  g.fillStyle = "#5d6970"; g.fillRect(0, 0, 1024, wl);
  g.fillStyle = "#9a3a2e"; g.fillRect(0, wl, 1024, 512 - wl);
  g.fillStyle = "#f2efe6"; g.fillRect(0, wl - 10, 1024, 10);
  for (let y = 40; y < wl - 20; y += 58) { g.fillStyle = "rgba(20,30,36,0.45)"; g.fillRect(0, y, 1024, 3); for (let x = 6; x < 1024; x += 18) { g.fillStyle = "rgba(220,230,232,0.35)"; g.fillRect(x, y + 6, 3, 3); } }
  for (let x = 0; x < 1024; x += 128) { g.fillStyle = "rgba(20,30,36,0.4)"; g.fillRect(x, 0, 3, wl - 10); }
  for (let i = 0; i < 10; i++) { const x = r() * 1024; const gr = g.createLinearGradient(0, 16, 0, 16 + 140 + r() * 80); gr.addColorStop(0, "rgba(150,80,40,0.5)"); gr.addColorStop(1, "rgba(150,80,40,0)"); g.fillStyle = gr; g.fillRect(x, 16, 8 + r() * 10, 220); }
  for (let i = 0; i < 18; i++) blot(g, r() * 1024, r() * wl, 60, r() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(20,30,30,0.1)");
  g.fillStyle = "#3d474c"; g.fillRect(0, 0, 1024, 12); g.fillStyle = INKC; g.fillRect(0, 12, 1024, 3);
  for (let x = 30; x < 1024; x += 240) { g.fillStyle = "#2a3236"; g.beginPath(); g.arc(x, 60, 9, 0, TAU); g.fill(); g.fillStyle = "#b8c4c8"; g.beginPath(); g.arc(x - 2, 58, 3, 0, TAU); g.fill(); } // portholes / scuppers
});
export const deckTex = () => ctex("bmDeck", 512, 512, (g, r) => {
  g.fillStyle = "#b99a6e"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    g.fillStyle = mix("#b99a6e", r() > 0.5 ? "#f6ecd2" : "#6a4a2a", 0.15 * r()); g.fillRect(0, y + 2, 512, 28);
    g.fillStyle = "#3a2a1e"; g.fillRect(0, y, 512, 3);
    for (let x = (y / 32) % 2 ? 80 : 200; x < 512; x += 260) g.fillRect(x, y, 3, 32);
  }
  for (let i = 0; i < 8; i++) blot(g, r() * 512, r() * 512, 70, "rgba(60,40,30,0.15)");
});
/** quay granite setts, 4 m tile: big grey-ochre blocks with dark joints, oil stains, a few rail-track hints are geometry */
export const quayTex = () => ctex("bmQuay", 1024, 1024, (g, r) => {
  g.fillStyle = "#8f877a"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0, row = 0; y < 1024; y += 64, row++) for (let x = -(row % 2) * 64; x < 1024; x += 128) {
    g.fillStyle = mix("#a69d8c", r() > 0.5 ? "#c9bfae" : "#6f675c", 0.3 * r()); g.fillRect(x + 3, y + 3, 122, 58);
  }
  for (let i = 0; i < 14; i++) blot(g, r() * 1024, r() * 1024, 50 + r() * 70, "rgba(40,36,30,0.22)");
});
/** street cobbles (setts) with a worn centre, 3 m tile */
export const cobbleTex = () => ctex("bmCobble", 1024, 1024, (g, r) => {
  g.fillStyle = "#7d6f5c"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0, row = 0; y < 1024; y += 40, row++) for (let x = -(row % 2) * 30; x < 1024; x += 60) {
    g.fillStyle = mix("#a8957a", r() > 0.5 ? "#cdb898" : "#6a5a48", 0.3 * r());
    g.beginPath(); g.ellipse(x + 30, y + 20, 27, 17, 0, 0, TAU); g.fill();
  }
  for (let i = 0; i < 10; i++) blot(g, r() * 1024, r() * 1024, 80, "rgba(40,36,30,0.18)");
});
/** Mangalore tiles: terracotta rows with shadowed laps, moss and soot */
export const roofTex = (k: number) => ctex("bmRoof" + k, 512, 512, (g, r) => {
  const base = ["#b8562e", "#c46a3a", "#a84a2a"][k % 3];
  g.fillStyle = shade(base, 0.7); g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) for (let x = 0; x < 512; x += 40) {
    const c = mix(base, r() > 0.5 ? "#f2b680" : "#5a2a1a", 0.25 * r());
    g.fillStyle = c; g.beginPath(); g.moveTo(x + 2, y + 4); g.lineTo(x + 38, y + 4); g.lineTo(x + 36, y + 28); g.quadraticCurveTo(x + 20, y + 34, x + 4, y + 28); g.closePath(); g.fill();
    g.fillStyle = rgba("#ffffff", 0.18); g.fillRect(x + 8, y + 6, 6, 18);
  }
  for (let i = 0; i < 10; i++) blot(g, r() * 512, r() * 512, 50, r() > 0.5 ? "rgba(60,80,40,0.25)" : "rgba(30,20,20,0.25)");
});
/** harbour water: base colour comes from the material colour; this paints ripple crests + darker troughs (tiles 12 m) */
export const waterTex = () => ctex("bmWater", 1024, 1024, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26; i++) blot(g, r() * 1024, r() * 1024, 120 + r() * 160, "rgba(60,90,100,0.18)");
  for (let i = 0; i < 110; i++) {
    const x = r() * 1024, y = r() * 1024, w = 30 + r() * 70;
    g.strokeStyle = r() > 0.35 ? "rgba(255,255,255,0.9)" : "rgba(40,70,80,0.5)"; g.lineWidth = 3 + r() * 3; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 6, x + w, y); g.stroke();
  }
});
export const mudTex = () => ctex("bmMud", 512, 512, (g, r) => {
  g.fillStyle = "#5a4636"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) blot(g, r() * 512, r() * 512, 20 + r() * 60, r() > 0.5 ? "rgba(140,110,80,0.4)" : "rgba(30,24,20,0.35)");
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(200,220,220,0.5)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 10, 2 + r() * 3, 0, 0, TAU); g.fill(); } // wet sheen
  for (let i = 0; i < 30; i++) { g.fillStyle = r() > 0.5 ? "#8a8070" : "#3a3026"; g.beginPath(); g.arc(r() * 512, r() * 512, 3 + r() * 6, 0, TAU); g.fill(); } // pebbles, shells
});
/** pale memorial stone (sandstone ashlar), 2 m tile */
export const memStoneTex = () => ctex("bmMemStone", 512, 512, (g, r) => {
  g.fillStyle = "#e4d6bc"; g.fillRect(0, 0, 512, 512);
  for (let y = 0, row = 0; y < 512; y += 64, row++) for (let x = -(row % 2) * 64; x < 512; x += 128) { g.fillStyle = mix("#e9dcc4", r() > 0.5 ? "#fff6e4" : "#b8a88c", 0.25 * r()); g.fillRect(x + 2, y + 2, 124, 60); }
  for (let i = 0; i < 8; i++) blot(g, r() * 512, r() * 512, 60, "rgba(120,100,80,0.12)");
});
/** brigade HQ front bay (4 x 4 m): red brick with a white stone arch, louvred door, keystone */
export const hqBay = (k: number) => ctex("bmHQ" + k, 512, 512, (g, r) => {
  g.fillStyle = "#e6c9a8"; g.fillRect(0, 0, 512, 512);
  for (let y = 0, row = 0; y < 512; y += 20, row++) for (let x = -(row % 2) * 30; x < 512; x += 60) { g.fillStyle = mix("#b8482e", r() > 0.5 ? "#d86a46" : "#7a2a1e", 0.3 * r()); g.fillRect(x + 2, y + 2, 56, 16); }
  const dx = 256, w = 220, y0 = 220;
  g.fillStyle = "#f2eadb"; g.beginPath(); g.moveTo(dx - w / 2 - 26, 512); g.lineTo(dx - w / 2 - 26, y0); g.ellipse(dx, y0, w / 2 + 26, 96, 0, Math.PI, 0); g.lineTo(dx + w / 2 + 26, 512); g.closePath(); g.fill();
  g.fillStyle = k % 2 ? "#c8323a" : "#2a3a3e"; g.beginPath(); g.moveTo(dx - w / 2, 512); g.lineTo(dx - w / 2, y0); g.ellipse(dx, y0, w / 2, 70, 0, Math.PI, 0); g.lineTo(dx + w / 2, 512); g.closePath(); g.fill();
  if (k % 2) { g.fillStyle = "#a02a30"; for (let y = y0 + 20; y < 512; y += 40) g.fillRect(dx - w / 2 + 6, y, w - 12, 8); }
  g.lineWidth = 8; g.strokeStyle = INKC; g.beginPath(); g.moveTo(dx - w / 2, 512); g.lineTo(dx - w / 2, y0); g.ellipse(dx, y0, w / 2, 70, 0, Math.PI, 0); g.lineTo(dx + w / 2, 512); g.stroke();
  g.fillStyle = "#f2eadb"; g.fillRect(dx - 18, y0 - 100, 36, 40); g.strokeRect(dx - 18, y0 - 100, 36, 40);
  g.fillStyle = "#f2eadb"; g.fillRect(0, 0, 512, 26); g.fillStyle = INKC; g.fillRect(0, 26, 512, 4);
});
export const plainTex = (key: string, col: string, lines = "rgba(0,0,0,0.12)", step = 64) => ctex("bmPlain" + key, 256, 256, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  g.fillStyle = lines; for (let x = 0; x < 256; x += step) g.fillRect(x, 0, 4, 256);
});
/** corrugated container side (u along, ribs vertical) */
export const containerTex = (col: string) => ctex("bmCont" + col, 256, 256, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) { g.fillStyle = rgba("#000000", 0.18); g.fillRect(x, 0, 5, 256); g.fillStyle = rgba("#ffffff", 0.12); g.fillRect(x + 7, 0, 3, 256); }
  g.fillStyle = rgba("#000000", 0.35); g.fillRect(0, 0, 256, 8); g.fillRect(0, 248, 256, 8);
});
/** cotton bale (cream hessian with iron straps) and munition crate (teal boards, no markings) textures */
export const baleTex = () => ctex("bmBale", 256, 256, (g, r) => {
  g.fillStyle = "#efe4c8"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() > 0.5 ? "rgba(180,160,120,0.35)" : "rgba(255,255,255,0.4)"; g.fillRect(r() * 256, r() * 256, 3, 3); }
  g.fillStyle = "#5a5450"; for (const y of [56, 128, 200]) g.fillRect(0, y, 256, 10);
});
export const crateTex = (col: string) => ctex("bmCrate" + col, 256, 256, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 42) { g.fillStyle = mix(col, r() > 0.5 ? "#ffffff" : "#000000", 0.1); g.fillRect(4, y + 3, 248, 36); g.fillStyle = rgba(INKC, 0.6); g.fillRect(0, y, 256, 4); }
  g.fillStyle = shade(col, 0.7); g.fillRect(0, 0, 22, 256); g.fillRect(234, 0, 22, 256);
  g.strokeStyle = shade(col, 0.6); g.lineWidth = 12; g.beginPath(); g.moveTo(22, 10); g.lineTo(234, 246); g.stroke();
});

// ---------------- effect cards ----------------
/** a gold ingot card (400 x 260 design), seeded tilt a (rad), glint 0..1 */
export const fxGoldBar = (p: Pen, a: number, glint: number) => { const k = K(p, 9); goldBar(k, 200, 150, 260, a, glint); };
/** a cartoon smoke puff cluster (512 x 512): ink-outlined billows, lit top, sooty base; tone 0 light grey .. 1 dark soot */
export const fxSmoke = (p: Pen, seed: number, tone: number, warm = 0) => {
  const k = K(p, 8), r = rng(seed * 13 + 5);
  const base = mix(mix("#c9c6bd", "#4a4848", tone), "#c98a5a", warm * 0.5), lit = mix(base, warm > 0 ? "#ffd3a0" : "#f6f1e6", 0.45), dk = mix(base, "#1e1e22", 0.35);
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + r() * 0.5, d = 70 + r() * 70; blobs.push([256 + Math.cos(a) * d, 270 + Math.sin(a) * d * 0.75, 80 + r() * 50]); }
  blobs.push([256, 260, 130]);
  for (const [x, y, rr] of blobs) k.ell(x, y, rr, rr * 0.92, base, 8);
  for (const [x, y, rr] of blobs) k.ell(x, y, rr - 4, rr * 0.92 - 4, base, 0);
  for (const [x, y, rr] of blobs) k.ell(x - rr * 0.18, y - rr * 0.28, rr * 0.55, rr * 0.42, lit, 0);
  for (const [x, y, rr] of blobs.slice(0, 4)) k.ell(x + rr * 0.1, y + rr * 0.4, rr * 0.6, rr * 0.25, dk, 0);
};
/** a fire card (600 x 700 design, base at y 650): a cluster of kit flames, frame-pure flicker from t; s = size 0.5..1.2 */
export const fxFire = (p: Pen, t: number, seed: number, s = 1) => {
  const k = K(p, 7), r = rng(seed * 7 + 3);
  k.glow(300, 520, 300 * s, PAL.fire, 0.35);
  const n = 5;
  for (let i = 0; i < n; i++) { const x = 300 + (i - (n - 1) / 2) * 70 * s + (r() - 0.5) * 30, h = (80 + r() * 70) * s * (i === 2 ? 1.35 : 1); flame(k, x, 640, h, t + i * 0.37, seed * 10 + i); }
};
/** a water-spray droplet blob (128 x 128) */
export const fxSpray = (p: Pen, seed: number) => {
  const k = K(p, 5), r = rng(seed + 50);
  for (let i = 0; i < 5; i++) { const x = 64 + (r() - 0.5) * 70, y = 64 + (r() - 0.5) * 70, rr = 10 + r() * 16; k.ell(x, y, rr, rr * 0.9, i % 2 ? "#e8f6f8" : "#bfe4ec", 4); }
};
/** a white splash crown where the hose hits the hull (400 x 300, t 0..1 cycles) */
export const fxHoseSplash = (p: Pen, t: number) => {
  const k = K(p, 6);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.15 + 0.7 * (i / 8)), L = 90 + 50 * Math.sin(t * TAU + i * 1.7);
    const x = 200 + Math.cos(a) * L * 1.4, y = 250 - Math.sin(a) * L;
    k.poly([[200 - 12, 250], [x, y], [200 + 12, 250]], i % 2 ? "#ffffff" : "#d8f0f4", 5);
  }
  k.ell(200, 252, 90, 24, "#eaf8fa", 6);
};
/** a 1940s fire engine in profile facing screen-right (1000 x 500 design, wheels on y 470): red body, brass radiator,
 *  bell, a wheeled ladder, hose reels, crew bench */
export const fxFireEngine = (p: Pen) => {
  const k = K(p, 9), R = "#c8323a", RD = shade(R, 0.72);
  k.poly(rrect(60, 250, 820, 420, 16), k.lin(0, 250, 0, 420, [[0, tint(R, 0.12)], [1, RD]]));       // body
  k.poly([[760, 250], [940, 250], [960, 300], [960, 420], [760, 420]], R);                           // bonnet
  k.poly(rrect(900, 260, 975, 410, 10), k.lin(900, 0, 975, 0, [[0, tint(PAL.brass, 0.4)], [1, shade(PAL.brass, 0.7)]])); // radiator
  for (let y = 275; y < 400; y += 14) k.stroke([[910, y], [965, y]], 3, rgba(INKC, 0.5));
  k.poly(rrect(640, 150, 780, 260, 12), "#d8e4e4");                                                // windscreen
  k.poly(rrect(650, 160, 770, 250, 8), "#7fb6c4", 5);
  k.poly(rrect(60, 200, 600, 252, 8), RD);                                                         // crew bench / locker tops
  for (let i = 0; i < 3; i++) { const x = 140 + i * 160; k.ell(x, 320, 52, 52, "#e2d6b0", 7); k.ell(x, 320, 22, 22, shade(PAL.brass, 0.8), 5); } // hose reels
  k.band([[40, 150], [880, 108]], "#b08a4a", 18, 4); k.band([[40, 190], [880, 148]], "#b08a4a", 18, 4);                  // ladder rails
  for (let i = 0; i < 18; i++) { const x = 70 + i * 46; k.stroke([[x, 150 - i * 2.3], [x, 190 - i * 2.3]], 7, "#8a6a3a"); }
  k.ell(720, 130, 26, 30, k.lin(694, 0, 746, 0, [[0, tint(PAL.brass, 0.5)], [1, shade(PAL.brass, 0.6)]]), 7);                   // bell
  k.band([[60, 350], [960, 350]], tint(PAL.brass, 0.1), 8, 3);
  for (const x of [220, 800]) { k.ell(x, 430, 70, 70, "#1e2224", 9); k.ell(x, 430, 34, 34, "#c8323a", 6); k.dot(x, 430, 10, tint(PAL.brass, 0.3)); }
  k.poly(rrect(940, 300, 990, 330, 8), "#fff3c4", 5);                                              // lamp
};
/** a wooden handcart loaded with sacks (600 x 400, wheel on y 380) */
export const fxHandcart = (p: Pen, seed: number) => {
  const k = K(p, 8), r = rng(seed + 9);
  for (let i = 0; i < 4; i++) k.ell(170 + i * 85 + r() * 10, 190 - (i % 2) * 18, 70, 46, mix("#e6d4a8", "#c9b080", r()), 7);
  k.poly([[60, 230], [520, 230], [500, 290], [80, 290]], "#9a6a3a");
  k.band([[500, 260], [590, 230]], "#7a4a2a", 14, 4);
  k.ell(300, 320, 62, 62, "#7a4a2a", 8); k.ell(300, 320, 14, 14, "#3a2a1e", 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; k.stroke([[300, 320], [300 + Math.cos(a) * 56, 320 + Math.sin(a) * 56]], 5, "#3a2a1e"); }
};
/** a laundry line strung between balconies (800 x 300): saris and shirts, seeded colours; sway 0..1 */
export const fxLaundry = (p: Pen, seed: number, sway: number) => {
  const k = K(p, 6), r = rng(seed + 31);
  const sag = (x: number) => 60 + 70 * Math.sin((x / 800) * Math.PI);
  k.stroke(Array.from({ length: 17 }, (_, i) => [i * 50, sag(i * 50)] as P2), 4, INKC);
  let x = 40;
  while (x < 740) {
    const w = 60 + r() * 90, col = [PAL.coral, PAL.sea, PAL.sun, "#f6ecd2", PAL.red, "#9fd8c4", "#e8643a"][Math.floor(r() * 7)], y = sag(x + w / 2), dx = (sway - 0.5) * 18;
    k.poly([[x, y - 4], [x + w, sag(x + w) - 4], [x + w + dx, y + 120 + r() * 60], [x + dx, y + 110 + r() * 60]], col, 5);
    if (r() < 0.5) k.pattern([[x, y], [x + w, y], [x + w, y + 110], [x, y + 110]], "stripes", tint(col, 0.4), 1.2);
    x += w + 20 + r() * 30;
  }
};
/** a crow / kite gliding (200 x 120), wing phase 0..1 */
export const fxBird = (p: Pen, ph: number) => {
  const k = K(p, 5), w = 40 * Math.sin(ph * TAU);
  k.poly([[100, 60], [30, 50 - w], [60, 66], [100, 70], [140, 66], [170, 50 - w]], "#2a2a30", 5);
  k.ell(100, 64, 16, 10, "#2a2a30", 4);
};
/** a marigold garland draped in a loop (600 x 300) */
export const fxGarland = (p: Pen, seed: number) => {
  const k = K(p, 4), r = rng(seed + 3);
  for (let i = 0; i <= 40; i++) { const t = i / 40, x = 40 + t * 520, y = 40 + 200 * Math.sin(t * Math.PI); k.ell(x, y, 17, 17, i % 3 ? PAL.sun : "#e8643a", 4); if (r() < 0.3) k.dot(x - 4, y - 4, 4, "#fff1b0"); }
};
/** a wreath of marigolds and leaves on a small stand (500 x 700, base y 690) */
export const fxWreath = (p: Pen) => {
  const k = K(p, 7);
  k.band([[160, 690], [250, 380]], "#6a4a2a", 14, 4); k.band([[340, 690], [250, 380]], "#6a4a2a", 14, 4);
  for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU; k.ell(250 + Math.cos(a) * 150, 300 + Math.sin(a) * 150, 34, 30, i % 2 ? "#2f7a4a" : "#3f9a5a", 5); }
  for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU + 0.08; k.ell(250 + Math.cos(a) * 128, 300 + Math.sin(a) * 128, 24, 24, i % 3 ? PAL.sun : "#e8643a", 4); }
  k.poly([[220, 440], [280, 440], [300, 560], [250, 520], [200, 560]], "#f6ecd2", 5);
};
/** a 1940s brass fireman's helmet resting on a step, seen from the front-side (400 x 300, base y 280) */
export const fxHelmet = (p: Pen, seed: number) => {
  const k = K(p, 8), b = PAL.brass;
  k.poly([[40, 270], [360, 270], [330, 230], [70, 230]], shade(b, 0.7));                           // neck guard / brim
  const dome = ellPts(200, 230, 130, 150, 180, 360, 0, 30);
  k.poly(dome, k.lin(70, 0, 330, 0, [[0, tint(b, 0.5)], [0.45, b], [1, shade(b, 0.6)]]));
  k.band([[90, 150], [200, 70], [310, 150]], tint(b, 0.25), 12, 4);                                  // comb
  k.ell(200, 186, 34, 30, tint(b, 0.35), 6); k.dot(200, 186, 10, shade(b, 0.6));                     // badge
  k.stroke([[110, 220], [290, 220]], 6, shade(b, 0.55));
  star(k, 150 + 30 * hash(seed, 2), 130, 34, "#ffffff");
};
/** far skyline silhouette of 1940s Bombay (2048 x 512): domes, a clock tower, chawl roofs, palms; tone for depth */
export const fxSkyline = (p: Pen, seed: number, col: string) => {
  const k = K(p, 0), r = rng(seed);
  const g = p.g; g.fillStyle = col;
  let x = 0;
  while (x < 2048) {
    const w = 60 + r() * 140, h = 90 + r() * 170;
    g.fillRect(x, 512 - h, w, h);
    if (r() < 0.5) { g.beginPath(); g.moveTo(x - 6, 512 - h); g.lineTo(x + w / 2, 512 - h - 40 - r() * 30); g.lineTo(x + w + 6, 512 - h); g.fill(); }
    if (r() < 0.12) { g.beginPath(); g.ellipse(x + w / 2, 512 - h, w * 0.32, w * 0.36, 0, Math.PI, 0); g.fill(); g.fillRect(x + w / 2 - 3, 512 - h - w * 0.36 - 30, 6, 30); }
    if (r() < 0.1) { const px = x + w * r(); g.fillRect(px, 512 - h - 120, 6, 120); for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(px + 3, 512 - h - 120, 40, 10, (i / 5) * Math.PI, 0, TAU); g.fill(); } }
    x += w + r() * 10;
  }
  const tx = 600 + r() * 800; // clock tower (Rajabai-like, generic)
  g.fillRect(tx, 120, 70, 392); g.fillRect(tx - 10, 200, 90, 14); g.beginPath(); g.moveTo(tx - 6, 120); g.lineTo(tx + 35, 30); g.lineTo(tx + 76, 120); g.fill();
  g.fillStyle = mix(col, "#fff3c4", 0.35); g.beginPath(); g.arc(tx + 35, 160, 20, 0, TAU); g.fill();
  void k;
};
/** a low smoke-haze band (1024 x 256) for depth between sets */
export const fxHaze = (p: Pen, col: string) => {
  const g = p.g, gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.55, rgba(col, 0.75)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
};
/** the debris-and-gold spray of a blast: dark shards with a few glinting gold specks (800 x 800, t 0..1) */
export const fxDebris = (p: Pen, t: number, seed: number) => {
  const k = K(p, 5), r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU, d = (120 + r() * 260) * (0.3 + 0.7 * t), x = 400 + Math.cos(a) * d, y = 400 + Math.sin(a) * d * 0.8 + 140 * t * t;
    if (i % 5 === 0) goldBar(k, x, y, 30, a, 0.6 * (1 - t));
    else k.poly([[x - 10, y - 4], [x + 8, y - 8], [x + 12, y + 6], [x - 6, y + 8]], i % 2 ? "#3a3236" : "#5a4a40", 4);
  }
};
/** an open wooden crate half full of recovered gold bars, a ledger on the lid (600 x 450, base y 440) */
export const fxGoldCrate = (p: Pen, glint: number) => {
  const k = K(p, 8);
  k.poly([[60, 170], [540, 170], [520, 440], [80, 440]], crateG(k, 60, 540));
  for (let y = 230; y < 440; y += 60) k.stroke([[70, y], [530, y]], 5, rgba(INKC, 0.55));
  k.poly([[40, 140], [560, 140], [540, 190], [60, 190]], "#9a6a3a");
  for (let i = 0; i < 7; i++) goldBar(k, 120 + i * 60, 130 - (i % 2) * 18, 90, (i % 3 - 1) * 0.15, i === 3 ? glint : 0);
  for (let i = 0; i < 4; i++) goldBar(k, 160 + i * 85, 95, 90, (i % 2 ? 0.1 : -0.1), 0);
};
const crateG = (k: KPen, x0: number, x1: number) => k.lin(x0, 0, x1, 0, [[0, "#c9955a"], [1, "#8a5a32"]]);
