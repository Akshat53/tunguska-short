// The sets of "दिल्ली का लौह स्तंभ" (Iron Pillar) on the kit card stage (src/engine/kit/stage.ts). Every set is built at
// the origin and only the current shot's cards are posed, so sets never see each other. update(id, f, camera) is a pure
// function of (id, f):
//   court  the Qutb complex courtyard: the pillar (stacked segment cards so close-ups stay sharp), the 1997 grill, the great
//          arched screen, temple colonnades, Alai Darwaza, Qutb Minar, trees, rubble, kites in the sky, today's visitors;
//          the 18th-century cannon (dusk), the polished band and its browning.
//   forge  a Gupta-era smithy at night: clay shaft furnace + bellows, anvil, glowing iron bloom, hammer smith, tong holder,
//          master smith, bellows boy, baskets of charcoal / ore / lime, sparks and embers.
//   macro  inside the metal: a cut-away iron block, rust blooming fast, the thin compact film sealing it, phosphorus atoms,
//          raindrops bouncing off.
//   lab    a metallurgist's lab: bench, microscope, laptop curve, pillar poster and layer diagram.
import * as THREE from "three";
import { KitStage, paintTex, type Card, type Lighting, type FireLight, type V3 } from "../../engine/kit/stage";
import { hash, noise1 } from "../../engine/kit/core";
import { peepal, treeline } from "../../engine/kit/village";
import { smoke as kitSmoke, embers, sparks, dust as kitDust, glowCard, blastCard } from "../../engine/kit/fx";
import { KIT_FONT } from "../../engine/kit/captions";
import {
  FPS, SHOTS, camAt, smooth, easeOut, clamp01, PH, DENT_Y, GIRL, WATCH, HUGGER, GUIDE_AT, KID15, CANNON, MUZZLE, FIRE_F, IMPACT_F, STRIKES,
  RUST_F, LAYER_F, SHIELD_F, FENCE_F, ANVIL, SMITH, HOLDER, FURNACE, SCI, dentAt, shineAt, type Light,
} from "./story";
import { LIGHTING } from "./lights";
import {
  PIL_W, PIL_H, PIL_SEG, pillarSeg, minar, archScreen, colonnade, alai, rubble, fenceSide, pavingPaint, lawnPaint, bird, ball, cannonRear,
  forgeWall, furnace, bellows, anvil, bloom, basket, earthPaint, SURF, metalBlock, rustCrust, film, atomP, drop, macroBack,
  labWall, bench, microscope, laptop, labFloorPaint, sparkle, tag, bead, streak,
} from "./art";
import {
  GIRL_P, DAD, SON, GUIDE, HUGGER_P, VISITORS, HAMMER, TONGS, MASTER, BELLOWS_BOY, SCIENTIST, COLLEAGUE,
  personCard, propCard, hammerIn, tongsIn,
} from "./cast";

type Built = { cards: Card[]; fires: FireLight[]; fog?: [number, number]; ground: (st: KitStage) => void; ambient?: [number, number, number] };
const fire = (pos: V3, seed: number, power = 0.85, radius = 3.2, col = "#ffad55"): FireLight => ({ pos, col, power, radius, seed });
const qz = (v: number, n = 20) => Math.round(v * n) / n;
const offset = (m: THREE.Mesh, k = 2) => { const mm = m.material as THREE.MeshBasicMaterial; mm.polygonOffset = true; mm.polygonOffsetFactor = k; mm.polygonOffsetUnits = k; };

// ---------------- the court ----------------
/** fence state per shot: present day (1-3, 7, 16) up; 1997 (15) rising; the past (4-6, 14) none */
const RAIN_RUST_F = 556;
const fenceOf = (id: number, f: number) => (id === 15 ? easeOut((f - FENCE_F) / 14) : [1, 2, 3, 7, 16].includes(id) ? 1 : 0);
/** pillar as stacked segment cards (each sized for the screen, so close-ups stay sharp) */
const pillarCards = (o0: { dent: number; shine: number; glint: number; rust?: number; hot?: number; wet?: number }): Card[] => {
  const n = Math.ceil(PIL_H / PIL_SEG), w = PIL_W / 1000, out: Card[] = [];
  const o = { dent: o0.dent, shine: qz(o0.shine), glint: qz(o0.glint, 10), rust: qz(o0.rust ?? 0), hot: qz(o0.hot ?? 0, 10), wet: o0.wet ?? 0 };
  for (let k = 0; k < n; k++) {
    const yTop = (PIL_H - k * PIL_SEG) / 1000, hh = (PIL_SEG + 8) / 1000;
    out.push({ key: `pil${k}|${o.dent}|${o.shine}|${o.glint}|${o.rust}|${o.hot}|${o.wet}`, draw: (p) => pillarSeg(p, k, o), dw: PIL_W, dh: PIL_SEG + 8, w, pos: [0, yTop - hh + 0.004, 0], face: "yaw", order: 1 });
  }
  return out;
};
const FENCE_R = 1.7;
const fenceCards = (k: number): Card[] => {
  if (k <= 0) return [];
  const y = -(1 - k) * 1.35, w = FENCE_R * 2;
  return ([[0, FENCE_R, 0], [0, -FENCE_R, 0], [-FENCE_R, 0, Math.PI / 2], [FENCE_R, 0, Math.PI / 2]] as const).map(([x, z, yaw], i) =>
    ({ key: "fence", draw: fenceSide, dw: 3400, dh: 1300, w, pos: [x, y, z] as V3, face: "fixed" as const, yaw, order: 1 + i * 0 }));
};
const courtStatic = (): Card[] => {
  const out: Card[] = [];
  out.push(propCard("minar", minar, 600, 3000, 3000, 15, [9, 0, -66], { face: "fixed" }));
  out.push(propCard("screen", (p) => archScreen(p, 1), 3400, 1600, 1600, 34, [0, 0, -13.5], { face: "fixed" }));
  out.push(propCard("screen2", (p) => archScreen(p, 2), 3400, 1600, 1600, 26, [-26, 0, -22], { face: "fixed", yaw: 0.35 }));
  out.push(propCard("colL", (p) => colonnade(p, 1), 1800, 600, 600, 18, [-12.5, 0, -2], { face: "fixed", yaw: Math.PI / 2 }));
  out.push(propCard("colR", (p) => colonnade(p, 2), 1800, 600, 600, 18, [12.5, 0, -2], { face: "fixed", yaw: -Math.PI / 2 }));
  out.push(propCard("colB", (p) => colonnade(p, 3), 1800, 600, 600, 18, [0, 0, 26], { face: "fixed", yaw: Math.PI }));
  out.push(propCard("alai", alai, 1200, 1200, 1200, 13, [24, 0, -34], { face: "fixed", yaw: -0.5 }));
  for (const [x, z, s, w] of [[-21, -28, 4, 12], [21, -24, 5, 13], [9, -42, 6, 11], [-12, -48, 7, 10], [30, -8, 8, 12], [-30, 4, 9, 12]] as const) out.push(propCard(`tree${s}`, (p) => peepal(p, s), 1600, 1800, 1760, w, [x, 0, z]));
  out.push(propCard("rub1", (p) => rubble(p, 1), 3000, 300, 300, 30, [8, 0, -26], { face: "fixed", maxPx: 192 }));
  out.push(propCard("rub2", (p) => rubble(p, 2), 3000, 300, 300, 30, [-14, 0, -38], { face: "fixed", maxPx: 192 }));
  out.push(propCard("tline", (p) => treeline(p, 4, "#4f7a62"), 4000, 600, 600, 220, [0, 0, -140], { face: "fixed", maxPx: 384 }));
  return out;
};
const COURT_STATIC = courtStatic();
/** visitors around the fence: [x, z, index into VISITORS, turn] */
const SPOTS: [number, number, number, number][] = [
  [-2.6, 2.4, 0, 0.3], [2.6, 2.9, 1, -0.3], [-4.2, -1.0, 2, 0.45], [4.0, -0.6, 3, -0.4], [-2.2, -3.6, 4, 0.3], [2.0, -4.0, 5, -0.25],
  [5.8, 2.6, 6, -0.4], [-6.2, 3.2, 7, 0.4], [-3.8, 5.4, 8, 0.2], [6.6, -3.2, 9, -0.3], [-7.4, -2.6, 10, 0.4], [0.3, -5.6, 11, 0], [4.8, 6.0, 12, -0.2],
];
const EXPRS = ["smile", "awe", "happy", "surprised", "neutral", "laugh", "smile", "awe", "happy", "neutral", "smile", "awe", "surprised"] as const;
const ARMS: [string, string][] = [["hips", "point"], ["fold", "fold"], ["cover", "hips"], ["wave", "hips"], ["fold", "fold"], ["hips", "cup"], ["hold", "hips"], ["point", "hips"], ["hips", "hold"], ["hips", "hips"], ["fold", "fold"], ["cover", "point"], ["hips", "wave"]];
const visitorCards = (t: number, cam: THREE.PerspectiveCamera, skip: number[] = []): Card[] => {
  const out: Card[] = [];
  SPOTS.forEach(([x, z, i, turn], k) => {
    if (skip.includes(k)) return;
    // never stand between the lens and the pillar: drop people inside a 1.4 m corridor to it
    const cx = cam.position.x, cz = cam.position.z, L = Math.hypot(cx, cz), u = (x * cx + z * cz) / (L * L);
    if (u > 0 && u < 1) { const px = cx * u, pz = cz * u; if (Math.hypot(x - px, z - pz) < 1.4) return; }
    if (Math.hypot(x - cx, z - cz) < 2.2) return;
    const near = Math.hypot(x - cx, z - cz) < 14;
    out.push(personCard(`v${k}`, VISITORS[i], { t: near ? t + k * 1.7 : 0, expr: EXPRS[k], turn, arms: ARMS[k] as never, look: [-turn * 0.6, -0.35], headTilt: -4, idle: near ? 1 : 0 }, [x, 0, z], { rim: false }));
  });
  return out;
};
const birds = (t: number, out: Card[], n = 5) => {
  for (let i = 0; i < n; i++) {
    const a = t * (0.12 + 0.05 * hash(i, 2)) + hash(i, 1) * 6.28, R = 10 + 8 * hash(i, 3);
    const flap = Math.sin(t * (5 + 2 * hash(i, 4)) + i) * 0.5 + 0.5;
    out.push({ key: `bird${Math.round(flap * 4)}`, draw: (p) => bird(p, Math.round(flap * 4) / 4), dw: 200, dh: 100, w: 0.9, pos: [-3 + Math.cos(a) * R, 22 + 5 * hash(i, 5) + Math.sin(t + i), -24 + Math.sin(a) * R], centre: true, face: "camera", maxPx: 128, fog: false });
  }
};
const court = (id: number, f: number, cam: THREE.PerspectiveCamera): Built => {
  const t = f / FPS, out: Card[] = [...COURT_STATIC], fires: FireLight[] = [];
  const glint = id === 1 || id === 16 ? 0.6 + 0.4 * Math.sin(t * 0.8) : id === 15 ? Math.max(0, Math.sin(((f - 1257) / 141) * Math.PI * 3)) : id === 8 ? 0 : 0.3;
  const hot = id === 6 ? 1 - smooth((f - 399) / 70) : id === 5 && f >= IMPACT_F ? 1 : 0;
  const rust = id === 8 ? easeOut((f - RAIN_RUST_F) / 95) : 0;
  out.push(...pillarCards({ dent: id >= 5 && id <= 6 ? dentAt(f) : id === 8 ? 0 : 1, shine: shineAt(id, f), glint, rust, hot, wet: id === 8 ? 1 : 0 }));
  out.push(...fenceCards(fenceOf(id, f)));
  birds(t, out, id === 5 || id === 6 ? 2 : id === 8 ? 0 : 6);
  let ambient: [number, number, number] | undefined;
  if (id === 1 || id === 16) {
    // the hook / loop: the girl at the fence reaching up in awe, her brother waving, dad pointing, the crowd around
    out.push(personCard("girl", GIRL_P, { t, expr: "awe", turn: -0.2, arms: ["reach", "cover"], look: [-0.25, -1], headTilt: -10 }, GIRL));
    out.push(personCard("son1", SON, { t, expr: "laugh", turn: -0.3, arms: ["hips", "wave"], look: [-0.4, -0.7] }, [1.75, 0, 2.05], { scale: 0.98 }));
    out.push(personCard("dad1", DAD, { t, expr: "smile", turn: -0.35, arms: ["hips", "point"], look: [-0.4, -0.6], headTilt: -6 }, [2.6, 0, 1.2]));
    out.push(...visitorCards(t, cam, [1]));
  }
  if (id === 3) out.push(...visitorCards(t, cam));
  if (id === 2) {
    out.push(personCard("guide2", GUIDE, { t, expr: "sly", turn: 0.3, arms: ["hips", "beckon"], look: [0.35, 0.1], headTilt: 5, talk: [[3.9, 5.6]] }, GUIDE_AT));
    out.push(personCard("girl2", GIRL_P, { t, expr: "awe", turn: -0.2, arms: ["reach", "cover"], look: [-0.25, -1], headTilt: -10 }, GIRL));
    out.push(...visitorCards(t, cam, [0, 1, 6]));
  }
  if (id === 7) {
    out.push(personCard("dad7", DAD, { t, expr: "awe", turn: 0.35, arms: ["hips", "cup"], look: [0.4, -0.6], headTilt: -6 }, WATCH));
    out.push(personCard("son7", SON, { t, expr: "laugh", turn: 0.25, arms: ["point", "hips"], look: [0.5, -0.5] }, [WATCH[0] + 0.8, 0, WATCH[2] + 0.45], { flip: true }));
    out.push(personCard("guide7", GUIDE, { t, expr: "sly", turn: -0.3, arms: ["fold", "fold"], look: [-0.4, -0.2] }, [2.5, 0, 2.3], { flip: false }));
    out.push(...visitorCards(t, cam, [0, 1, 6, 7]));
    // sparkles around the shaft ("magic?")
    for (let i = 0; i < 18; i++) {
      const a = t * 1.3 + i * 0.9, y = 0.8 + ((i * 0.43 + t * 0.35) % 1) * 5.2, tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 2.1);
      out.push({ key: "spk", draw: sparkle, dw: 128, dh: 128, w: 0.26 * (0.6 + 0.6 * tw), pos: [Math.cos(a) * 0.45, y, Math.sin(a) * 0.45 + 0.1], centre: true, face: "camera", add: true, lit: false, glow: 1.4 * tw + 0.2, fog: false, maxPx: 128 });
    }
  }
  if (id === 8) {
    // the storm: rain streaks, a lightning flash on 'नहीं', the young pillar rusting fast
    for (let i = 0; i < 70; i++) {
      const per = 0.5 + 0.2 * hash(i, 1), ph = (t / per + hash(i, 2)) % 1;
      out.push({ key: "streak", draw: streak, dw: 40, dh: 400, w: 0.03, pos: [-2.5 + 5 * hash(i, 3), 6 - 6.5 * ph, -1.5 + 4 * hash(i, 4)], centre: true, face: "camera", rot: 0.12, lit: false, glow: 1.0, opacity: 0.8, maxPx: 128, order: 2.2 });
    }
    for (let i = 0; i < 10; i++) { const per = 0.6, ph = (t / per + hash(i, 6)) % 1; if (ph > 0.5) continue; const x = -1.5 + 3 * hash(i, 7), z = -0.5 + 2.5 * hash(i, 8); out.push({ key: "splash", draw: (p) => p.ell(100, 60, 90, 40, null, 6), dw: 200, dh: 120, w: 0.2 + 0.5 * ph, pos: [x, 0.01, z], face: "flat", lit: false, opacity: 0.6 * (1 - ph * 2), maxPx: 128 }); }
    const lf = (f - 543) / 6;
    ambient = lf >= 0 && lf < 1.5 ? [1.6 - 0.6 * lf, 1.65 - 0.6 * lf, 1.8 - 0.6 * lf] : undefined;
  }
  if (id === 5 || id === 6) {
    // 18th century, dusk: the cannon fires at the pillar
    if (id === 5) out.push(propCard("cannonR", cannonRear, 1000, 900, 900, 2.0, CANNON, { face: "yaw" }));
    const fa = (f - FIRE_F) / FPS;
    if (id === 5 && f >= FIRE_F && f < FIRE_F + 12) {
      const u = (f - FIRE_F) / 12;
      out.push(blastCard([MUZZLE[0] + 0.25, MUZZLE[1] + 0.15, MUZZLE[2] - 0.25], 1.6, u));
      fires.push(fire(MUZZLE, 3, 3.2 * (1 - u), 6, "#ffb04a"));
    }
    if (id === 5 && fa >= 0) out.push(...kitSmoke(fa, [MUZZLE[0], MUZZLE[1] + 0.2, MUZZLE[2]], { rate: 4, life: 2.0, rise: 0.4, wind: -0.6, size: 0.8, dark: 0.15, seed: 4, spread: 0.3 }).filter((c, i) => i < 8 && fa < 2.2));
    if (f >= FIRE_F && f < IMPACT_F) {
      const tgt: V3 = [0.18, DENT_Y, 0.25];
      for (let k = 0; k < 5; k++) {
        const u = Math.max(0, (f - k * 1.5 - FIRE_F) / (IMPACT_F - FIRE_F));
        const pos: V3 = [MUZZLE[0] + (tgt[0] - MUZZLE[0]) * u, MUZZLE[1] + (tgt[1] - MUZZLE[1]) * u + 0.6 * Math.sin(u * Math.PI), MUZZLE[2] + (tgt[2] - MUZZLE[2]) * u];
        out.push(k ? glowCard(`trail${k}`, pos, 0.5 - k * 0.07, "#ffd36a", 1.2 - k * 0.2) : { key: "ball", draw: ball, dw: 200, dh: 200, w: 0.3, pos, centre: true, face: "camera", maxPx: 256, order: 2.6 });
      }
    }
    const ia = (f - IMPACT_F) / FPS;
    if (ia >= 0) {
      out.push(...sparks(t, [0.15, DENT_Y, 0.3], { t0: IMPACT_F / FPS, n: 60, speed: 3.5, seed: 7 }));
      if (ia < 0.4) { out.push(blastCard([0.15, DENT_Y, 0.4], 1.4, ia / 0.4)); fires.push(fire([0.2, DENT_Y, 0.6], 5, 2.5 * (1 - ia / 0.4), 4, "#ffd36a")); }
      if (id === 6) out.push(glowCard("hot", [0.18, DENT_Y, 0.3], 0.3, "#ff8a2a", 1.0 * hot));
    }
  }
  if (id === 14 || id === 15) {
    if (id === 14) {
      // hugging the pillar for luck (before 1997); friends cheer
      out.push(personCard("hug", HUGGER_P, { t, view: "side", expr: "laugh", turn: 0.6, arms: ["carry", "carry"], headTilt: 4 }, [HUGGER[0], 0, 0.12], { order: 1.2 }));
      out.push(personCard("cheer1", SON, { t, expr: "laugh", turn: -0.2, arms: ["wave", "hips"] }, [1.35, 0, 1.0]));
      out.push(personCard("cheer2", VISITORS[2], { t, expr: "happy", turn: -0.3, arms: ["hips", "cover"] }, [2.1, 0, 0.2]));
      out.push(personCard("cheer3", VISITORS[6], { t, expr: "smile", turn: 0.3, arms: ["fold", "fold"] }, [-2.2, 0, 0.6]));
      out.push(personCard("queue", VISITORS[5], { t, expr: "smile", turn: 0.1, arms: ["hips", "point"] }, [-1.6, 0, -1.6]));
    } else {
      // 1997: the fence goes up; a boy reaches through, the hug is over; the band dulls over a year (time-lapse light)
      const up = f >= FENCE_F + 10;
      out.push(personCard("kid15", SON, { t, expr: up ? (f > 1330 ? "sad" : "surprised") : "happy", turn: 0.45, arms: up ? ["reach", "reach"] : ["wave", "hips"], look: [0.5, -0.2] }, KID15));
      out.push(personCard("look15", DAD, { t, expr: f > 1340 ? "worried" : "neutral", turn: 0.3, arms: ["hips", "cover"], look: [0.3, 0] }, [-2.4, 0, 1.9]));
      out.push(personCard("look15b", VISITORS[8], { t, expr: f > 1340 ? "surprised" : "smile", turn: -0.3, arms: ["fold", "fold"] }, [2.4, 0, 2.2]));
      const d = Math.sin(((f - 1257) / 141) * Math.PI * 3);
      ambient = [1.0 + 0.08 * d, 0.98 + 0.05 * d, 0.92 - 0.05 * d];
    }
  }
  return { cards: out, fires, ambient, ground: (st) => {
    offset(st.ground("paving", [60, 60], [0, 0, -6], () => paintTex(2048, 2048, pavingPaint, [3, 3]), [1, 1, 1]), 2);
    offset(st.ground("lawn", [600, 600], [0, -0.04, 0], () => paintTex(1024, 1024, lawnPaint, [40, 40]), [1, 1, 1]), 6);
  } };
};

// ---------------- the forge ----------------
/** hammer state 0 (on the iron) .. 1 (raised) around the strike frames */
const hammerUp = (f: number) => {
  let best = 1;
  for (const s of STRIKES) { const d = f - s; if (d >= -10 && d < 0) best = Math.min(best, 1 - smooth((d + 10) / 10)); else if (d >= 0 && d < 12) best = Math.min(best, smooth(d / 12)); }
  return best;
};
const forge = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [];
  out.push(propCard("fwall", forgeWall, 4400, 2400, 2400, 8.8, [0, 0, -3.2], { face: "fixed" }));
  out.push(propCard(`furn|${Math.round(t * 10)}`, (p) => furnace(p, Math.round(t * 10) / 10), 900, 1500, 1500, 1.8, FURNACE, { face: "fixed" }));
  const bph = (t * 0.9) % 1;
  out.push(propCard(`bell|${qz(bph)}`, (p) => bellows(p, qz(bph)), 900, 400, 400, 1.4, [FURNACE[0] + 0.9, 0, FURNACE[2] + 0.7]));
  out.push(personCard("boy", BELLOWS_BOY, { t, expr: "determined", turn: -0.3, arms: Math.sin(bph * 6.283) > 0 ? ["carry", "hang"] : ["hang", "carry"], look: [-0.5, 0.4] }, [FURNACE[0] + 1.6, 0, FURNACE[2] + 1.1], { scale: 0.95 }));
  out.push(propCard("anv", anvil, 700, 520, 520, 1.0, ANVIL));
  const heat = id === 4 ? 0.95 : 0.7;
  out.push(propCard(`bloom|${qz(heat)}`, (p) => bloom(p, heat), 500, 260, 250, 0.55, [0, 0.52, 0.06], { lit: false, glow: 1.2 }));
  out.push(propCard("bskC", (p) => basket(p, 0), 500, 360, 360, 0.6, [FURNACE[0] - 0.6, 0, FURNACE[2] + 1.4]));
  out.push(propCard("bskO", (p) => basket(p, 1), 500, 360, 360, 0.6, [FURNACE[0] + 0.1, 0, FURNACE[2] + 1.7]));
  const up = hammerUp(f);
  out.push(personCard("hammer", HAMMER, { t, expr: "determined", turn: -0.35, arms: [up > 0.5 ? "raise" : "carry", "hang"], look: [-0.6, 0.6], headTilt: 4 }, SMITH,
    { extra: hammerIn(up), extraKey: `h${qz(up, 10)}` }));
  out.push(personCard("tongs", TONGS, { t, expr: id === 4 ? "determined" : "neutral", turn: 0.35, arms: ["hold", "hold"], look: [0.6, 0.6] }, HOLDER, { extra: tongsIn, extraKey: "tg" }));
  const fires: FireLight[] = [fire([FURNACE[0], 0.6, FURNACE[2] + 0.4], 1, 1.6, 2.6, "#ff9a3c"), fire([0, 0.7, 0.2], 2, 0.9 * heat, 1.6, "#ffb04a")];
  out.push(...embers(t, [FURNACE[0], 2.95, FURNACE[2]], { rate: 10, spread: 0.4, rise: 1.0, size: 0.06 }));
  out.push(...kitSmoke(t, [FURNACE[0], 3.0, FURNACE[2]], { rate: 1.5, life: 5, rise: 0.5, wind: 0.2, size: 1.1, dark: 0.55, fire: 0.4, seed: 3, spread: 0.3 }));
  for (const s of STRIKES) if (f >= s && f < s + 30) out.push(...sparks(t, [0.05, 0.62, 0.15], { t0: s / FPS, n: 34, speed: 2.6, seed: s }));
  if (id === 12) {
    // the lime the old smiths never added: the master waves the basket away
    out.push(propCard("bskL", (p) => basket(p, 2), 500, 360, 360, 0.6, [-1.0, 0, 1.05]));
    out.push(personCard("master", MASTER, { t, expr: "stern", turn: 0.25, arms: ["wave", "hang"], look: [0.3, 0.5], talk: [[1000 / FPS, 1060 / FPS]] }, [-1.75, 0, 0.6]));
  } else out.push(personCard("master", MASTER, { t, expr: "neutral", turn: 0.3, arms: ["fold", "fold"], look: [0.5, 0.3] }, [-2.6, 0, -0.5], { scale: 0.98 }));
  return { cards: out, fires, ground: (st) => offset(st.ground("earth", [30, 30], [0, 0, 0], () => paintTex(1024, 1024, earthPaint, [4, 4]), [1, 1, 1])) };
};

// ---------------- macro ----------------
const MACRO_STATIC: Card[] = [
  { key: "mback", draw: macroBack, dw: 4000, dh: 2600, w: 18, pos: [0, -5, -7], face: "fixed", lit: false, fog: false, order: 0 },
  { key: "metal", draw: metalBlock, dw: 4000, dh: 1700, w: 4, pos: [0, -(1700 - SURF) / 1000, 0], face: "fixed" },
];
const tagCard = (key: string, text: string, col: string, pos: V3, k: number): Card =>
  ({ key: `tag|${key}`, draw: (p) => tag(p, text, col, KIT_FONT), dw: 700, dh: 180, w: 0.44, pos, centre: true, face: "camera", lit: false, opacity: k, maxPx: 384, order: 3 });
const macro = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [...MACRO_STATIC];
  const calm = id === 9 ? smooth((f - LAYER_F) / 70) : 1;
  const filmK = id === 9 ? smooth((f - LAYER_F - 6) / 60) : 1;
  const shim = id === 9 && f >= SHIELD_F && f < SHIELD_F + 40 ? (f - SHIELD_F) / 40 : 0;
  out.push({ key: `rust|1|${qz(calm)}`, draw: (p) => rustCrust(p, 1, qz(calm)), dw: 4000, dh: 900, w: 4, pos: [0, 0.07 * filmK, 0.02], face: "fixed" });
  out.push({ key: `film|${qz(filmK)}|${qz(shim)}`, draw: (p) => film(p, qz(filmK), qz(shim)), dw: 4000, dh: 200, w: 4, pos: [0, -0.002, 0.03], face: "fixed", glow: 1 + 0.5 * shim });
  if (shim > 0) out.push(glowCard("shield", [-0.7 + 1.4 * shim, 0.05, 0.1], 0.45, "#fff6c8", 1.1));
  // labels drawn into the scene (no captions): iron, rust, the thin film, phosphorus
  const tk = (f0: number) => smooth((f - f0) / 8);
  out.push(tagCard("loha", "लोहा", "#7e8c96", [0.15, -0.42, 0.25], id === 9 ? tk(668) : 1));
  if (id === 9) out.push(tagCard("jang", "जंग", "#c8582a", [0.15, 0.36, 0.25], tk(672)));
  out.push(tagCard("parat", "पतली परत", "#2f8f83", [0.15, id === 9 ? 0.16 : 0.2, 0.26], id === 9 ? tk(735) : 1));
  if (id === 11) out.push(tagCard("phos", "फ़ॉस्फ़रस", "#f2b632", [0.15, -0.16, 0.25], tk(866)));
  // phosphorus atoms rise toward the surface (shot 11) and sit in the film
  if (id === 11) {
    for (let i = 0; i < 14; i++) {
      const x = -0.6 + 1.2 * hash(i, 1), y0 = -0.25 - 0.7 * hash(i, 2), t0 = 858 / FPS + 0.15 * i * hash(i, 3);
      const u = smooth((t - t0) / 1.4), y = y0 + (0.035 - y0) * u + 0.01 * Math.sin(t * 4 + i);
      out.push({ key: "atomP", draw: (p) => atomP(p, KIT_FONT), dw: 200, dh: 200, w: 0.12, pos: [x + 0.03 * noise1(t + i, i), y, 0.06], centre: true, face: "camera", lit: false, glow: 1.15, maxPx: 256, order: 2 });
    }
  }
  // raindrops fall, hit, bounce and bead off the film (they never soak in once the film is there)
  for (let i = 0; i < 6; i++) {
    const period = 1.4 + 0.5 * hash(i, 5), n = Math.floor(t / period + hash(i, 6)), ph = (t / period + hash(i, 6)) % 1, x = -0.5 + hash(i * 7 + n, 7) * 1.0;
    const fall = 0.5;
    let y: number, sx = x;
    if (ph < fall) y = 1.2 - 1.1 * (ph / fall) ** 2;
    else { const b = (ph - fall) / (1 - fall); if (b > 0.6) continue; y = 0.1 + 0.3 * Math.sin(Math.min(1, b * 1.7) * Math.PI); sx = x + 0.35 * b * (hash(i, 8) < 0.5 ? -1 : 1); }
    out.push({ key: "drop", draw: drop, dw: 120, dh: 180, w: 0.07, pos: [sx, y, 0.12], centre: true, face: "camera", lit: false, glow: 1.05, maxPx: 128, order: 2 });
  }
  if (filmK > 0.8) for (let i = 0; i < 4; i++) {
    const x = -0.55 + ((hash(i, 11) + t * (0.05 + 0.04 * hash(i, 12))) % 1.1);
    out.push({ key: "bead", draw: bead, dw: 200, dh: 140, w: 0.08 + 0.03 * hash(i, 13), pos: [x, 0.066, 0.1], face: "camera", lit: false, glow: 1.05, maxPx: 128, order: 2 });
  }
  out.push(...kitDust(t, [0, 0.4, 0.5], [1.4, 1.0, 0.6], 18, 5, "#cfeee6"));
  return { cards: out, fires: [], ground: () => {} };
};

// ---------------- lab ----------------
const lab = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [];
  out.push(propCard("lwall", labWall, 3600, 2400, 2400, 4.2, [0, 0, -1.7], { face: "fixed" }));
  out.push(propCard("bench", bench, 2600, 950, 950, 2.6, [0, 0, -1.1], { face: "fixed" }));
  const top = 0.95 * (1 - 100 / 950);
  out.push(propCard("micro", microscope, 500, 700, 700, 0.32, [0.85, top, -1.0], { face: "fixed" }));
  out.push(propCard("lap", laptop, 700, 520, 520, 0.45, [-0.75, top, -1.05], { face: "fixed" }));
  const proof = id === 13;
  out.push(personCard("sci", SCIENTIST, proof
    ? { t, expr: "happy", turn: 0.15, arms: ["hips", "point"], look: [0, 0], headTilt: 6 }
    : { t, expr: "happy", turn: -0.25, arms: ["point", "hold"], hold: [null, null], look: [-0.6, -0.1] }, SCI,
    { extra: proof ? undefined : (p, A) => { const h = A.hands[1]; if (!h) return; p.ell(h[0], h[1] - 30, 34, 26, "#3e3a36", 5); p.dot(h[0] - 10, h[1] - 36, 6, "#f2b632"); p.dot(h[0] + 12, h[1] - 26, 5, "#f2b632"); }, extraKey: proof ? "" : "chip" }));
  if (!proof) out.push(personCard("coll", COLLEAGUE, { t, expr: "awe", turn: 0.3, arms: ["hips", "hold"], look: [0.5, 0.3] }, [-0.75, 0, -0.85],
    { extra: (p, A) => { const h = A.hands[1]; if (!h) return; p.poly([[h[0] - 26, h[1] - 90], [h[0] + 26, h[1] - 90], [h[0] + 30, h[1] + 10], [h[0] - 30, h[1] + 10]], "rgba(232,244,242,0.9)", 5); p.ell(h[0], h[1] - 30, 18, 14, "#3e3a36", 4); p.dot(h[0] - 5, h[1] - 33, 4, "#f2b632"); }, extraKey: "jar" }));
  return { cards: out, fires: [fire([0.6, 2.2, 0.2], 6, 0.25, 3, "#fff2d8")], ground: (st) => offset(st.ground("labfloor", [12, 12], [0, 0, 0], () => paintTex(512, 512, labFloorPaint, [8, 8]), [1, 1, 1])) };
};

// ---------------- the world ----------------
export class World {
  stage = new KitStage();
  root = this.stage.root;
  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, pxH: number, thumb?: { pos: V3; look: V3; fov: number }) {
    const s = SHOTS[id - 1], c = thumb ? { ...thumb, roll: 0 } : camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const b = s.scene === "court" ? court(id, f, cam) : s.scene === "forge" ? forge(id, f) : s.scene === "macro" ? macro(id, f) : lab(id, f);
    const base = LIGHTING[s.light as Light];
    const L: Lighting = { ...base, fires: b.fires, ...(b.ambient ? { ambient: b.ambient } : {}), ...(b.fog ? { fogNear: b.fog[0], fogFar: b.fog[1] } : {}) };
    this.stage.hideGrounds(); b.ground(this.stage);
    this.stage.showStars(s.light === "night", 0.6);
    this.stage.frame(b.cards, L, cam, f / FPS, pxH, scene);
  }
}
void clamp01; void HUGGER;
