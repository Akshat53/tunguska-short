// The set of "Could YOU Survive? Ep 1: The Titanic" on the kit card stage (src/engine/kit/stage.ts): the North Atlantic at
// 2:20 AM, 15 April 1912. A moonless, starry night (stars + a faint Milky Way), a flat icy sea (a transparent rippling water
// plane over an opaque abyss, so nothing below the surface shows), thin mist on the water, an iceberg on the horizon, the
// wreckage field (Blender deck chairs, wreckage, cork life jackets), far swimmers as small dignified silhouettes, and the
// mascot ("you") at the origin. Layers: foreground wreckage / mist, the mascot mid-ground, ships and boats behind.
// update(id, f, camera) is a pure function of (id, f).
import * as THREE from "three";
import { KitStage, paintTex, type Card, type Lighting, type FireLight, type V3 } from "../../engine/kit/stage";
import { hash } from "../../engine/kit/core";
import { mascotCard, breathPuffs, TITANIC_1912, MASCOT_W, MASCOT_H, type MascotPose } from "../../engine/kit/mascot";
import {
  FPS, SHOTS, camAt, clamp01, smooth, hookT, isLoop, sternSink, sternLights, swell,
  ME, STERN_AT, SHIP_AT, BOAT_AWAY0, BOAT14_0, BOAT14_1, BAKER, CHAIR,
} from "./story";
import { bubble, milkyWay, starField, brightStar, mistPuff, streak, glowDisc, iceberg, waveSheet, foamField, abyssPaint, wavelets } from "./art";
import { shipCards, sternCards, boatCard, floatCard, boatPoint, LANTERN_DESIGN, type Rider } from "./props3d";
import { passenger, JOUGHIN, LOWE, wadeCard, propCard, treading, flaskX } from "./cast";

export const LIGHT: Omit<Lighting, "fires"> = {
  ambient: [0.5, 0.6, 0.78], skyStops: ["#1e3c4e", "#10283a", "#081524", "#040a14"], skyEl: [0, 5, 20, 62],
  fog: "#0d1f2c", fogNear: 70, fogFar: 1300, water: { deep: "#03101a", shallow: "#0b2a3a", glint: "#2c5a6e" },
};
type Built = { cards: Card[]; fires: FireLight[] };
const WL = 640;                                         // the mascot's waterline (design y)
const COLD_RIM: FireLight = { pos: [-1.4, 2.2, -1.6], col: "#9fd2ff", power: 0.32, radius: 1.8, seed: 3 };

// ---------------- the mascot ----------------
/** the mascot card + its breath fog; mouth anchor estimated from the pose (same maths as drawMascot) */
const you = (t: number, pose: MascotPose, cam: THREE.PerspectiveCamera, at: V3 = ME, breath = 1): Card[] => {
  const bob = swell(at[0], at[2], t);
  const P: MascotPose = { t, water: WL, wet: 1, cold: 0.8, ...pose };
  const c = mascotCard("you", TITANIC_1912, P, [at[0], at[1] + bob, at[2]]);
  c.order = 2; c.rim = true;
  const turn = P.turn ?? 0, mx = 300 + turn * (6 + 0.32 * 286), my = 288 + 0.37 * 292;
  const a = Math.atan2(cam.position.x - at[0], cam.position.z - at[2]), r: [number, number] = [Math.cos(a), -Math.sin(a)];
  const lx = (mx / 600 - 0.5) * MASCOT_W, wy = at[1] + bob + ((WL - my) / 1000) * MASCOT_H;
  const mouth: V3 = [at[0] + r[0] * lx, wy, at[2] + r[1] * lx];
  const gasp = P.mood === "gasp" ? 1.4 : 1;
  return [c, ...breathPuffs(t, mouth, { per: P.mood === "gasp" ? 0.9 : 1.5, dir: 0.5 * Math.sign(turn || 1) * r[0], size: 0.2 * gasp, strength: 0.7 * breath })];
};
/** the hook (shots 1 and 11 after the loop cut): gasping, splashing, shivering, head turned toward the sinking stern */
const hookPose = (t: number): MascotPose => ({
  mood: "gasp", arms: ["splash", "splash"], shiver: 0.85, turn: 0.42 + 0.06 * Math.sin(t * 1.3), look: [0.55, -0.35], headTilt: -4, talk: 0.2 + 0.25 * Math.abs(Math.sin(t * 2.6)),
});

// ---------------- the sea around you ----------------
const SKY: Card[] = (() => {
  const out: Card[] = [];
  out.push({ key: "milky", draw: milkyWay, dw: 2048, dh: 1024, w: 2600, pos: [-120, 420, -1250], centre: true, face: "camera", add: true, lit: false, glow: 0.9, fog: false, maxPx: 2048 });
  for (const [x, y, z] of [[-900, 300, -900], [700, 380, -1050], [0, 700, -900]] as V3[]) out.push({ key: "sfield", draw: starField, dw: 1024, dh: 1024, w: 1400, pos: [x, y, z], centre: true, face: "camera", add: true, lit: false, glow: 1.0, fog: false, maxPx: 1024 });
  for (let i = 0; i < 9; i++) {
    const a = -1.6 + 2.6 * hash(i, 5), el = 0.18 + 0.7 * hash(i, 6), R = 1250;
    out.push({ key: "bstar", draw: brightStar, dw: 512, dh: 512, w: 26 + 18 * hash(i, 7), pos: [Math.sin(a) * R * Math.cos(el), R * Math.sin(el), -Math.cos(a) * R * Math.cos(el)], centre: true, face: "camera", add: true, lit: false, glow: 1.4, fog: false, maxPx: 256 });
  }
  out.push({ key: "berg", draw: iceberg, dw: 1200, dh: 500, w: 120, pos: [-320, -3, -1000], face: "fixed", tintMul: [0.55, 0.65, 0.82], maxPx: 1024 });
  out.push({ key: "berg2", draw: iceberg, dw: 1200, dh: 500, w: 60, pos: [420, -2, -1150], face: "fixed", flip: true, tintMul: [0.5, 0.6, 0.78], maxPx: 512 });
  return out;
})();
/** the wreckage field: deterministic positions within ~45 m (none on the camera paths) */
type Bit = { kind: "chair" | "debris" | "vest"; at: V3; w: number; rot: number; flip: boolean; seed: number };
const BITS: Bit[] = (() => {
  const out: Bit[] = [];
  for (let i = 0, n = 0; n < 34 && i < 600; i++) {
    const r = 2.2 + 44 * hash(i, 81) ** 1.4, a = 2 * Math.PI * hash(i, 82), at: V3 = [Math.sin(a) * r, 0, -Math.cos(a) * r * 0.9 - 1];
    if (at[2] > 1.2 && Math.abs(at[0]) < 4) continue;                        // keep the camera side clear
    if (out.some((b) => Math.hypot(b.at[0] - at[0], b.at[2] - at[2]) < 2.2)) continue;
    const k = hash(i, 83), kind = k < 0.35 ? "chair" : k < 0.75 ? "debris" : "vest";
    out.push({ kind, at, w: kind === "debris" ? 2.6 + 1.4 * hash(i, 84) : kind === "chair" ? 1.4 + 0.4 * hash(i, 84) : 0.9, rot: 0.25 * (hash(i, 85) - 0.5), flip: hash(i, 86) < 0.5, seed: i }); n++;
  }
  return out;
})();
/** other swimmers: small, distant, dignified (heads and shoulders, life jackets; some calling, waving) */
type Sw = { D: ReturnType<typeof passenger>; at: V3; seed: number };
const SWIM: Sw[] = (() => {
  const out: Sw[] = [];
  for (let i = 0, n = 0; n < 22 && i < 800; i++) {
    const r = 5.5 + 42 * hash(i, 91) ** 1.3, a = -1.9 + 3.8 * hash(i, 92), at: V3 = [Math.sin(a) * r, 0, -Math.cos(a) * r];
    if (out.some((s) => Math.hypot(s.at[0] - at[0], s.at[2] - at[2]) < 3)) continue;
    out.push({ D: passenger(3000 + i), at, seed: 3000 + i }); n++;
  }
  return out;
})();
const seaBits = (t: number, cam: THREE.PerspectiveCamera, o: { swim?: number; bits?: number; skip?: (p: V3) => boolean } = {}): Card[] => {
  const out: Card[] = [], cp = cam.position;
  const near = (p: V3, d: number) => Math.hypot(p[0] - cp.x, p[2] - cp.z) < d;
  BITS.slice(0, o.bits ?? BITS.length).forEach((b) => {
    if (near(b.at, 1.6) || o.skip?.(b.at)) return;
    const dr = 0.12 * Math.sin(t * 0.21 + b.seed), at: V3 = [b.at[0] + dr, swell(b.at[0], b.at[2], t), b.at[2] + 0.5 * dr];
    out.push(floatCard(`${b.kind}${b.seed}`, b.kind, b.w, at, Math.hypot(b.at[0] - cp.x, b.at[2] - cp.z) > 14 ? 0 : t, { rot: b.rot + 0.05 * Math.sin(t * 0.8 + b.seed), flip: b.flip, wl: b.kind === "vest" ? 0.6 : 0.7 }));
  });
  SWIM.slice(0, o.swim ?? SWIM.length).forEach((s, i) => {
    if (near(s.at, 5) || o.skip?.(s.at)) return;
    const far = Math.hypot(s.at[0] - cp.x, s.at[2] - cp.z) > 18, tt = far ? Math.floor(t * 2) / 2 : t;
    const call = hash(s.seed, 7) < 0.3;
    const pose = treading(tt, s.seed, { expr: call ? "shout" : hash(s.seed, 8) < 0.5 ? "scared" : "worried", arms: call ? ["hang", "wave"] : undefined, wave: (tt * 0.8 + hash(s.seed, 9)) % 1, talk: call ? [[tt - 1, tt + 1]] : undefined });
    out.push(wadeCard(`sw${i}`, s.D, pose, [s.at[0], swell(s.at[0], s.at[2], t), s.at[2]], tt, { tint: [0.55, 0.62, 0.76], foam: 0.7, maxPx: far ? 256 : 768 }));
  });
  return out;
};
/** thin mist on the water: soft drifting puffs in a band around a centre */
const mist = (t: number, c: V3, R: number, n: number, k = 1, seed = 1): Card[] => Array.from({ length: n }, (_, i) => {
  const a = 2 * Math.PI * hash(i, seed + 1), r = R * Math.sqrt(hash(i, seed + 2)), dx = 0.25 * t * (0.6 + 0.6 * hash(i, seed + 3));
  return { key: "mist", draw: mistPuff, dw: 512, dh: 160, w: 5 + 7 * hash(i, seed + 4), pos: [c[0] + Math.sin(a) * r + dx, 0.15 + 0.35 * hash(i, seed + 5), c[2] - Math.cos(a) * r] as V3, centre: true, face: "camera",
    soft: true, lit: false, opacity: k * (0.1 + 0.12 * hash(i, seed + 6)), tintMul: [0.62, 0.72, 0.82], maxPx: 256, order: 2 } as Card;
});
/** the surface glints around a point (flat, additive) */
const glints = (t: number, c: V3, w: number, k = 0.6): Card => ({ key: `wl${Math.round(t * 4) % 4}`, draw: wavelets, dw: 1024, dh: 1024, w, pos: [c[0] + 0.3 * Math.sin(t * 0.3), 0.012, c[2]], face: "flat", rot: (Math.round(t * 4) % 4) * 0.7, add: true, lit: false, glow: k, maxPx: 1024 });
/** a light's reflection on the water: a long flat streak from the light's foot toward the camera */
const reflection = (key: string, from: V3, cam: THREE.PerspectiveCamera, len: number, w: number, col: string, k: number, t: number): Card => {
  const dx = cam.position.x - from[0], dz = cam.position.z - from[2], L = Math.hypot(dx, dz) || 1, mid: V3 = [from[0] + (dx / L) * len / 2, 0.02, from[2] + (dz / L) * len / 2];
  return { key: `rf${key}${col}`, draw: streak(col), dw: 64, dh: 512, w, pos: mid, face: "flat", rot: Math.atan2(dx, dz), add: true, lit: false, glow: k * (0.85 + 0.15 * Math.sin(t * 7 + len)), maxPx: 512 };
};

// ---------------- the shots ----------------
const ROW = (t: number, k = 0.55) => (t * k) % 1;
const RIDERS_AWAY = (t: number): Rider[] => [
  { seat: "s1f", D: passenger(41), pose: { t, expr: "worried", arms: ["fold", "fold"], turn: 0.3, look: [0.5, 0] } },
  { seat: "s3f", D: passenger(47), pose: { t, expr: "sad", arms: ["cover", "fold"], turn: -0.2 } },
  { seat: "s2n", D: passenger(44, false), pose: { t, expr: "determined", arms: ["carry", "carry"], lean: 6 * Math.sin(2 * Math.PI * ROW(t)), turn: 0.4 }, row: ROW(t) },
  { seat: "s4n", D: passenger(52, false), pose: { t, expr: "determined", arms: ["carry", "carry"], lean: 6 * Math.sin(2 * Math.PI * ROW(t, 0.55) + 0.4), turn: 0.4 }, row: ROW(t) + 0.06 },
  { seat: "s0n", D: passenger(56, false), pose: { t, expr: "stern", arms: ["hold", "hang"], turn: -0.5, look: [-0.5, 0] } },
];
const RIDERS_14 = (t: number): Rider[] => [
  { seat: "s4n", D: LOWE, pose: { t, expr: "determined", arms: ["hang", "raise"], turn: -0.3, look: [-0.4, 0.1], talk: [[t - 0.4, t + 0.4]] }, lantern: true, stand: true, dx: 60 },
  { seat: "s3n", D: passenger(61, false), pose: { t, expr: "determined", arms: ["carry", "carry"], lean: 7 * Math.sin(2 * Math.PI * ROW(t, 0.6)), turn: -0.2 }, row: ROW(t, 0.6) },
  { seat: "s1n", D: passenger(63, false), pose: { t, expr: "determined", arms: ["carry", "carry"], lean: 7 * Math.sin(2 * Math.PI * ROW(t, 0.6) + 0.3), turn: -0.2 }, row: ROW(t, 0.6) + 0.05 },
  { seat: "s2f", D: passenger(65, false), pose: { t, expr: "worried", arms: ["cup", "hang"], turn: -0.4, look: [-0.5, 0] } },
  { seat: "s0f", D: passenger(67, false), pose: { t, expr: "stern", arms: ["hold", "hold"], turn: -0.2 } },
];

const sternSet = (t: number, cam: THREE.PerspectiveCamera, out: Card[]) => {
  const sink = sternSink(t), lit = sternLights(t);
  out.push(...sternCards(STERN_AT, sink, lit, t));
  if (lit > 0.05) for (const [dx, k] of [[-14, 0.8], [-4, 1], [6, 0.7]] as [number, number][]) out.push(reflection(`st${dx}`, [STERN_AT[0] + dx, 0, STERN_AT[2]], cam, 260, 9, "#ffcf7a", 1.3 * lit * k * (1 - sink), t));
  if (sink > 0.6) out.push({ key: "foam", draw: foamField, dw: 1024, dh: 1024, w: 140, pos: [STERN_AT[0], 0.05, STERN_AT[2] + 10], face: "flat", lit: false, tintMul: [0.5, 0.58, 0.7], opacity: smooth((sink - 0.6) / 0.3) * 0.8, soft: true, maxPx: 1024 });
};
/** Lifeboat 14 + Lowe's lantern (glow, warm light, reflection) */
const boat14 = (T: number, at: V3, cam: THREE.PerspectiveCamera, out: Card[], fires: FireLight[], refl = true) => {
  const bc = boatCard("b14", RIDERS_14(T), at, T, { tint: [0.66, 0.72, 0.86], wake: 0.6 });
  out.push(bc);
  const lant = boatPoint(bc, LANTERN_DESIGN, cam);
  out.push({ key: "lglow", draw: glowDisc("#ffc874"), dw: 256, dh: 256, w: 2.2 + 0.1 * Math.sin(T * 11), pos: lant, centre: true, face: "camera", add: true, lit: false, glow: 1.5, order: 4, maxPx: 256 });
  if (refl) out.push(reflection("lant", [lant[0], 0, lant[2]], cam, 9, 1.2, "#ffc874", 1.0, T));
  fires.push({ pos: lant, col: "#ffbd6a", power: 0.9, radius: 3.2, seed: 7 });
};

const shot = (id: number, f: number, cam: THREE.PerspectiveCamera): Built => {
  const loop = isLoop(id, f), sid = loop ? 1 : id, t = sid <= 2 ? hookT(id, f) : f / FPS, T = f / FPS;
  const out: Card[] = [...SKY], fires: FireLight[] = [COLD_RIM];
  if (sid === 1) {
    sternSet(t, cam, out);
    out.push(...you(t, hookPose(t), cam));
    out.push(floatCard("fgchair", "chair", 1.5, [-1.55, swell(-1.5, 0.6, t), 0.55], t, { rot: -0.12 + 0.05 * Math.sin(t * 0.9), wl: 0.66 }));
    out.push(floatCard("fgplank", "debris", 2.2, [1.7, swell(1.7, 1.0, t), 1.0], t, { rot: 0.1, flip: true, wl: 0.62 }));
    out.push(...seaBits(t, cam, { swim: 12 }), ...mist(t, [0, 0, -14], 12, 12, 0.7, 1));
  }
  if (sid === 2) {
    sternSet(t, cam, out);
    out.push(...you(T, { mood: f < 150 ? "awe" : "shock", arms: ["paddle", "paddle"], shiver: 0.8, turn: 0.55, look: [0.6, -0.5] }, cam, ME, 0.8));
    out.push(...seaBits(T, cam, { swim: 16 }), ...mist(T, [-2, 0, -30], 20, 10, 0.5, 2));
  }
  if (sid === 3) {
    const wu = f < 262 ? 0 : f < 282 ? smooth((f - 262) / 20) : 1 - smooth((f - 284) / 26);
    const under = f >= 276 && f < 292;
    const pose: MascotPose = f < 262 ? { mood: "gasp", arms: ["splash", "splash"], shiver: 0.7, turn: -0.15, talk: 0.4 + 0.4 * Math.abs(Math.sin(T * 3)) }
      : f < 300 ? { mood: "shock", arms: ["splash", "splash"], shiver: 0.4, turn: 0.1, bob: under ? 60 : 0 }
      : { mood: "gasp", arms: ["paddle", "splash"], shiver: 0.8, turn: -0.1, talk: 0.5 };
    out.push(...you(T, pose, cam, ME, f >= 262 && f < 300 ? 0 : 1));
    // under the wave: a burst of bubbles from your mouth (you gasped underwater)
    if (f >= 270 && f < 306) for (let i = 0; i < 26; i++) {
      const age = (f - 270 - 1.2 * i) / FPS; if (age < 0 || age > 0.9) continue;
      const x = 0.08 + 0.35 * (hash(i, 31) - 0.5) + 0.1 * Math.sin(age * 9 + i), y = 0.45 + 1.1 * age + 0.2 * hash(i, 32);
      out.push({ key: "bub", draw: bubble, dw: 128, dh: 128, w: 0.04 + 0.07 * hash(i, 33), pos: [x, y, 0.42], centre: true, face: "camera", lit: false, opacity: 0.9 * (1 - age / 0.9), tintMul: [0.8, 0.95, 1], order: 4, maxPx: 128 });
    }
    if (wu > 0.01) out.push(propCard(`wave${Math.round(wu * 12)}`, waveSheet(0.5 + 0.5 * wu), 1400, 700, 700, 2.8, [0.1, -1.05 + 0.95 * wu, 0.3], { face: "camera", order: 3, tintMul: [0.7, 0.8, 0.95], maxPx: 1536, opacity: 0.62 }));
    out.push(...seaBits(T, cam, { swim: 10 }), ...mist(T, [0, 0, -5], 12, 12, 0.8, 3));
  }
  if (sid === 4) {
    const k = clamp01((f - 344) / 56);
    out.push(...you(T, { mood: k < 0.5 ? "determined" : "worried", arms: k < 0.6 ? ["splash", "splash"] : ["paddle", "paddle"], shiver: 0.5 + 0.4 * k, cold: 0.8, turn: 0.25, headTilt: -3 - 4 * k }, cam));
    out.push(floatCard("fg4b", "vest", 0.6, [-0.55, swell(-0.6, 1.3, T), 1.5], T, { rot: -0.1, wl: 0.58 }));
    out.push(floatCard("chair4", "chair", 1.3, [CHAIR[0] + 0.3, swell(CHAIR[0], CHAIR[2], T) - 0.02, CHAIR[2] - 0.6], T, { rot: -0.08 + 0.04 * Math.sin(T), wl: 0.64 }));
    out.push(...seaBits(T, cam, { swim: 12, skip: (p) => Math.hypot(p[0] - CHAIR[0], p[2] - CHAIR[2]) < 2 }), ...mist(T, [0, 0, -8], 14, 12, 0.8, 4));
  }
  if (sid === 5) {
    out.push(...you(T, { mood: "shiver", arms: ["cling", "cling"], shiver: 1, cold: 1, turn: 0.05, headTilt: -4, look: [0, 0.6] }, cam));
    out.push(...seaBits(T, cam, { swim: 10 }));
  }
  if (sid === 6) {
    const tilt = -0.2 - 0.012 * (T - 15.2);
    out.push(...shipCards([SHIP_AT[0], -9, SHIP_AT[2]], tilt, 1, T));
    for (const [dx, kk] of [[-70, 0.7], [-30, 1], [10, 0.9]] as [number, number][]) out.push(reflection(`sh${dx}`, [SHIP_AT[0] + dx, 0, SHIP_AT[2]], cam, 300, 10, "#ffcf7a", 1.1 * kk, T));
    out.push(boatCard("far6", [], [SHIP_AT[0] + 40, 0, SHIP_AT[2] + 120], T, { scale: 1, tint: [0.5, 0.58, 0.72] }));
    out.push(...you(T, { mood: "worried", arms: ["paddle", "paddle"], shiver: 0.6, turn: -0.35, look: [-0.5, -0.55], headTilt: 6 }, cam));
    out.push(...seaBits(T, cam, { swim: 8, bits: 18 }), ...mist(T, [-2, 0, -20], 26, 14, 0.6, 5));
  }
  if (sid === 7) {
    const u = (f - 575) / FPS, at: V3 = [BOAT_AWAY0[0] - 0.35 * u, 0, BOAT_AWAY0[2] - 0.9 * u];
    out.push(boatCard("away", RIDERS_AWAY(T), at, T, { tint: [0.62, 0.7, 0.86], wake: 0.8 }));
    out.push(...you(T, { mood: "worried", arms: ["reach", "paddle"], shiver: 0.6, turn: -0.55, look: [-0.6, -0.1], talk: f > 610 && f < 640 ? 0.5 : 0 }, cam));
    out.push(...seaBits(T, cam, { swim: 10, skip: (p) => Math.hypot(p[0] - at[0], p[2] - at[2]) < 6 }), ...mist(T, [-2, 0, -14], 16, 14, 0.7, 6));
  }
  if (sid === 8) {
    const u = smooth((f - 678) / 110), at: V3 = [BOAT14_0[0] + (BOAT14_1[0] - BOAT14_0[0]) * u, 0, BOAT14_0[2] + (BOAT14_1[2] - BOAT14_0[2]) * u];
    boat14(T, at, cam, out, fires);
    out.push(...you(T, { mood: "awe", arms: ["paddle", "paddle"], shiver: 0.7, turn: 0.55, look: [0.6, -0.15] }, cam));
    out.push(...seaBits(T, cam, { swim: 8, skip: (p) => Math.hypot(p[0] - at[0], p[2] - at[2]) < 6 }), ...mist(T, [3, 0, -18], 16, 20, 1.0, 7));
  }
  if (sid === 9) {
    const u = smooth((f - 735) / 47), at: V3 = [-1.5 + 0.2 * u, 0, -3.6 + 0.6 * u];
    boat14(T, at, cam, out, fires, false);
    const relief = f > 750;
    out.push(...you(T, { mood: relief ? "relief" : "awe", arms: relief ? ["reach", "paddle"] : ["paddle", "paddle"], shiver: relief ? 0.35 : 0.7, turn: -0.3, look: [-0.4, -0.7] }, cam));
    out.push(...seaBits(T, cam, { swim: 10, skip: (p) => Math.hypot(p[0] - at[0], p[2] - at[2]) < 5 }));
  }
  if (sid >= 10 && sid <= 12) {
    const chat: [number, number][] = [[27.2, 28.3], [29.0, 29.9]];
    const bpose = sid === 11
      ? { t: T, expr: (f < 955 ? "sly" : "happy") as "sly" | "happy", arms: ["cover", "cup"] as ["cover", "cup"], turn: -0.25, look: [-0.3, -0.1] as [number, number], headTilt: 5 * Math.sin(T * 1.1), talk: [[31.3, 31.9]] as [number, number][] }
      : treading(T, 1912, { expr: "smile", arms: ["cover", "cover"], turn: -0.3, look: [-0.5, 0], talk: chat });
    out.push(wadeCard("baker", JOUGHIN, bpose, [BAKER[0], swell(BAKER[0], BAKER[2], T), BAKER[2]], T, { extra: sid === 11 ? flaskX : undefined, extraKey: sid === 11 ? "flask" : "", tint: [0.66, 0.74, 0.9], maxPx: 2048 }));
    const mp: MascotPose = sid === 10 ? { mood: f < 840 ? "awe" : "shock", arms: ["paddle", "paddle"], shiver: 0.7, turn: 0.45, look: [0.6, -0.1] }
      : sid === 11 ? { mood: "awe", arms: ["paddle", "paddle"], shiver: 0.6, turn: 0.5, look: [0.6, 0] }
      : { mood: "determined", arms: ["paddle", "paddle"], shiver: 0.8, turn: 0.25, look: [0.5, -0.05], headTilt: 4 * Math.sin(T * 5) * smooth((f - 1020) / 10) * (1 - smooth((f - 1050) / 10)) };
    out.push(...you(T, mp, cam));
    out.push(...seaBits(T, cam, { swim: 12, skip: (p) => Math.hypot(p[0] - BAKER[0], p[2] - BAKER[2]) < 3 }), ...mist(T, [0, 0, -7], 14, 14, 0.8, 8));
  }
  if (sid === 13) {
    const u = smooth((f - 1072) / 28);
    out.push(...you(T, { mood: f < 1100 ? "determined" : "happy", arms: f > 1128 ? ["paddle", "wave"] : ["paddle", "paddle"], shiver: 0.5 * (1 - u) + 0.2, turn: -0.5 * (1 - u), look: [0, -0.1], wave: (T * 1.5) % 1 } as MascotPose, cam));
    out.push(wadeCard("baker", JOUGHIN, treading(T, 1912, { expr: "smile", arms: ["cover", "wave"], wave: (T * 1.2) % 1, turn: -0.3 }), [BAKER[0] + 1.0, swell(BAKER[0], BAKER[2], T), BAKER[2] - 2.2], T, { tint: [0.6, 0.68, 0.84] }));
    out.push(...seaBits(T, cam, { swim: 12 }), ...mist(T, [0, 0, -7], 14, 14, 0.8, 9));
  }
  return { cards: out, fires };
};

export class World {
  stage = new KitStage();
  root = this.stage.root;
  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, pxH: number) {
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const b = shot(id, f, cam);
    const L: Lighting = { ...LIGHT, fires: b.fires };
    this.stage.hideGrounds();
    this.stage.ground("abyss", [4000, 4000], [0, 0, 0], () => paintTex(1024, 1024, abyssPaint, [40, 40]), [1, 1, 1], -0.35);
    this.stage.setWater([cam.position.x, 0, cam.position.z], [5000, 5000]);
    this.stage.showStars(true, 0.9);
    this.stage.frame(b.cards, L, cam, f / FPS, pxH, scene);
  }
}
void SHOTS; void MASCOT_H;
