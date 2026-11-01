// Visual kit: effects as frame-pure particle systems that return stage Cards. A particle i of an emitter is born at
// (i + jitter) / rate seconds and lives `life` seconds; its whole path is a closed-form function of its age and its own
// hash, so any frame renders alone (no simulation state, no randomness). Includes: embers, sparks, dust motes, fireflies,
// smoke puffs / columns (toon puffs lit from below by fire), falling gold bars with glints, tumbling debris, water jets,
// light shafts, a bonfire / fire card, and a big explosion flash. Sprites are tiny cached canvases.
import { KPen, P2, PAL, INK, TAU, clamp, hash, noise1, fbm1, mix, shade, tint, rgba, ellPts, q } from "./core";
import { goldBar, star, flame } from "./people";
import type { Card, V3 } from "./stage";

type Emit = { rate: number; life: number; seed: number; t: number; max?: number };
/** live particle indices + ages for an emitter at time t */
export const live = ({ rate, life, seed, t, max = 400 }: Emit): { i: number; age: number; u: number }[] => {
  const out: { i: number; age: number; u: number }[] = [];
  const i1 = Math.floor(t * rate), i0 = Math.max(Math.floor((t - life) * rate) - 1, i1 - max);
  for (let i = i0; i <= i1; i++) {
    const born = (i + hash(i, seed) * 0.9) / rate, age = t - born;
    if (age >= 0 && age < life) out.push({ i, age, u: age / life });
  }
  return out;
};

// ---------------- sprites ----------------
const dotSprite = (col: string) => (p: KPen) => { p.glow(32, 32, 32, col, 1); p.dot(32, 32, 7, tint(col, 0.6)); };
const emberSprite = (p: KPen) => { p.glow(32, 32, 30, PAL.ember, 0.9); p.ell(32, 32, 7, 11, "#ffe2a0", 0); };
const fireflySprite = (p: KPen) => { p.glow(32, 32, 32, "#d8ff8a", 0.9); p.dot(32, 32, 6, "#f6ffd0"); };
/** toon smoke puff: 3 tones + ink rim; `warm` tints the underside orange (fire light) */
export const puffSprite = (k: number, dark: number, warm: number) => (p: KPen) => {
  const base = mix("#d8d4cc", "#3a3a3e", dark), lo = mix(shade(base, 0.72), PAL.fire, warm * 0.6), hi = tint(base, 0.18);
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + hash(k, i) * 0.6; lobes.push([128 + Math.cos(a) * 52, 128 + Math.sin(a) * 40, 46 + hash(k, i + 9) * 22]); }
  lobes.push([128, 128, 74]);
  p.ow = 5;
  for (const [x, y, r] of lobes) p.ell(x, y, r, r * 0.92, null, 10);
  for (const [x, y, r] of lobes) p.ell(x, y, r, r * 0.92, p.lin(0, y - r, 0, y + r, [[0, hi], [0.55, base], [1, lo]]), 0);
  for (const [x, y, r] of lobes.slice(0, 4)) p.stroke(ellPts(x, y, r * 0.72, r * 0.62, 200, 260, 0, 8), r * 0.09, rgba("#ffffff", 0.16));
};
const debrisSprite = (k: number) => (p: KPen) => {
  const pts: P2[] = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; pts.push([32 + Math.cos(a) * (14 + hash(k, i) * 14), 32 + Math.sin(a) * (14 + hash(k, i + 7) * 14)]); }
  p.ow = 4; p.poly(pts, k % 3 === 0 ? "#6a4a32" : k % 3 === 1 ? "#4a4a4e" : "#8a6a48");
};
const dropSprite = (p: KPen) => { p.ell(32, 32, 16, 28, rgba("#e8fbff", 0.95), 4); p.ell(27, 22, 5, 9, "#ffffff", 0); };
const beamSprite = (p: KPen) => {
  const gr = p.lin(0, 0, 0, 512, [[0, rgba("#fff3d0", 0.0)], [0.15, rgba("#fff3d0", 0.55)], [1, rgba("#fff3d0", 0)]]);
  p.g.fillStyle = gr; p.g.beginPath(); p.g.moveTo(100, 0); p.g.lineTo(156, 0); p.g.lineTo(256, 512); p.g.lineTo(0, 512); p.g.closePath(); p.g.fill();
  const side = p.lin(0, 0, 256, 0, [[0, rgba("#000000", 1)], [0.3, rgba("#000000", 0)], [0.7, rgba("#000000", 0)], [1, rgba("#000000", 1)]]);
  p.g.globalCompositeOperation = "destination-out"; p.g.fillStyle = side; p.g.fillRect(0, 0, 256, 512); p.g.globalCompositeOperation = "source-over";
};

const C = (key: string, draw: (p: KPen) => unknown, pos: V3, w: number, extra: Partial<Card> = {}): Card =>
  ({ key, draw, dw: 64, dh: 64, w, pos, centre: true, face: "camera", lit: false, add: true, fog: false, maxPx: 64, ...extra });

// ---------------- emitters ----------------
/** embers rising from a fire: swirl, cool from yellow to red, fade */
export const embers = (t: number, at: V3, o: { rate?: number; spread?: number; rise?: number; seed?: number; size?: number } = {}): Card[] => {
  const { rate = 14, spread = 0.6, rise = 1.6, seed = 1, size = 0.07 } = o;
  return live({ rate, life: 2.6, seed, t }).map(({ i, age, u }) => {
    const h = (k: number) => hash(i, seed * 10 + k);
    const x = at[0] + (h(1) - 0.5) * spread + 0.4 * noise1(age * 1.3 + h(2) * 9, seed) * u;
    const z = at[2] + (h(3) - 0.5) * spread * 0.6;
    const y = at[1] + rise * age * (0.7 + 0.6 * h(4)) - 0.08 * age * age;
    return C("ember", emberSprite, [x, y, z], size * (1 - 0.5 * u) * (0.6 + 0.8 * h(5)), { glow: 2.2 * (1 - u) ** 1.3 + 0.1, opacity: 1 - u });
  });
};
/** short bright sparks with gravity (a burst at t0, or continuous with rate) */
export const sparks = (t: number, at: V3, o: { t0?: number; n?: number; speed?: number; seed?: number; rate?: number } = {}): Card[] => {
  const { t0 = 0, n = 40, speed = 4, seed = 2, rate } = o;
  const list = rate ? live({ rate, life: 0.9, seed, t }) : Array.from({ length: n }, (_, i) => ({ i, age: t - t0 - hash(i, seed) * 0.08, u: 0 })).filter((x) => x.age >= 0 && x.age < 1.1).map((x) => ({ ...x, u: x.age / 1.1 }));
  return list.map(({ i, age, u }) => {
    const a = hash(i, seed + 1) * TAU, el = 0.2 + hash(i, seed + 2) * 1.2, v = speed * (0.4 + 0.6 * hash(i, seed + 3));
    const x = at[0] + Math.cos(a) * Math.cos(el) * v * age, z = at[2] + Math.sin(a) * Math.cos(el) * v * age * 0.6, y = at[1] + Math.sin(el) * v * age - 4.9 * age * age;
    return C("spark", dotSprite("#ffd36a"), [x, Math.max(0.02, y), z], 0.06 * (1 - u * 0.6), { glow: 3 * (1 - u) + 0.2 });
  });
};
/** slow dust motes in a volume (moonlight / sun-shaft dust) */
export const dust = (t: number, centre: V3, size: V3, n = 40, seed = 3, col = "#fff2d0"): Card[] => Array.from({ length: n }, (_, i) => {
  const h = (k: number) => hash(i, seed * 10 + k);
  const x = centre[0] + (h(1) - 0.5) * size[0] + 0.3 * noise1(t * 0.3 + h(4) * 20, seed), y = centre[1] + (((h(2) + t * 0.02 * (0.5 + h(5))) % 1) - 0.5) * size[1], z = centre[2] + (h(3) - 0.5) * size[2];
  return C("dust" + col, dotSprite(col), [x, y, z], 0.035 + 0.03 * h(6), { glow: 0.7 + 0.4 * Math.sin(t * 2 + h(7) * 9), opacity: 0.7 });
});
/** fireflies: wander on smooth noise paths, blink on their own rhythm */
export const fireflies = (t: number, centre: V3, size: V3, n = 30, seed = 4): Card[] => {
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    const h = (k: number) => hash(i, seed * 10 + k);
    const blink = Math.max(0, Math.sin(TAU * (t * (0.35 + 0.3 * h(8)) + h(9)))) ** 3;
    if (blink < 0.05) continue;
    const x = centre[0] + (h(1) - 0.5) * size[0] + 1.2 * fbm1(t * 0.25 + h(4) * 50, seed + i);
    const y = centre[1] + h(2) * size[1] + 0.4 * fbm1(t * 0.3 + h(5) * 50, seed + i + 100);
    const z = centre[2] + (h(3) - 0.5) * size[2] + 1.0 * fbm1(t * 0.2 + h(6) * 50, seed + i + 200);
    out.push(C("firefly", fireflySprite, [x, y, z], 0.12, { glow: 0.6 + 2.0 * blink, opacity: blink }));
  }
  return out;
};
/** smoke column: toon puffs rise, drift with the wind, grow, darken and fade; lit warm from below if `fire` */
export const smoke = (t: number, at: V3, o: { rate?: number; life?: number; rise?: number; wind?: number; size?: number; dark?: number; fire?: number; seed?: number; spread?: number } = {}): Card[] => {
  const { rate = 3, life = 7, rise = 1.4, wind = 0.5, size = 2.2, dark = 0.45, fire = 0, seed = 5, spread = 1 } = o;
  return live({ rate, life, seed, t }).map(({ i, age, u }) => {
    const h = (k: number) => hash(i, seed * 10 + k);
    const x = at[0] + (h(1) - 0.5) * spread + wind * age + 0.6 * noise1(age * 0.5 + h(2) * 9, seed);
    const y = at[1] + rise * age * (0.8 + 0.4 * h(3)), z = at[2] + (h(4) - 0.5) * spread * 0.6 - age * 0.15;
    const k = i % 4, warm = q(clamp(fire * (1 - u * 1.5)), 4), dk = q(clamp(dark * (0.7 + 0.6 * u)), 4);
    return { key: `puff${k}|${dk}|${warm}`, draw: puffSprite(k, dk, warm), dw: 256, dh: 256, w: size * (0.5 + 1.1 * u) * (0.8 + 0.4 * h(5)), pos: [x, y, z],
      centre: true, face: "camera", rot: (h(6) - 0.5) * 0.8 + age * 0.1 * (h(7) - 0.5), soft: true, opacity: clamp(Math.min(u * 6, (1 - u) * 1.6)), lit: true, maxPx: 384, order: 2 } as Card;
  });
};
/** gold bars falling from the sky, tumbling, with periodic glints (each bar lands and stops at groundY) */
export const goldRain = (t: number, centre: V3, size: [number, number], o: { n?: number; t0?: number; dur?: number; groundY?: number; seed?: number; scale?: number; g?: number } = {}): Card[] => {
  const { n = 26, t0 = 0, dur = 3, groundY = 0, seed = 6, scale = 1, g = 4.9 } = o;
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    const h = (k: number) => hash(i, seed * 10 + k);
    const tb = t0 + h(1) * dur, age = t - tb; if (age < 0) continue;
    const y0 = centre[1] + 6 + h(2) * 4, vy = -2 - h(3) * 2, y = Math.max(groundY + 0.05, y0 + vy * age - g * age * age);
    const landed = y <= groundY + 0.06, tl = landed ? (() => { const a = -g, b = vy, c = y0 - groundY - 0.05; return (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a); })() : age;
    const x = centre[0] + (h(4) - 0.5) * size[0] + (h(5) - 0.5) * 1.5 * Math.min(age, tl), z = centre[2] + (h(6) - 0.5) * size[1];
    const spin = landed ? h(7) * 0.4 - 0.2 : (h(8) - 0.5) * 9 * age + h(9) * 6;
    const gl = Math.max(0, Math.sin(TAU * (t * (0.8 + h(10)) + h(11)))) ** 12;
    const gq = q(gl, 4);
    out.push({ key: `gold|${gq}`, draw: (p: KPen) => goldBar(p, 64, 40, 100, 0, gq), dw: 128, dh: 80, w: 0.34 * scale, pos: [x, y, z], centre: true, face: "camera", rot: spin, lit: true, glow: 1.15 + 0.6 * gl, maxPx: 160 });
    if (gl > 0.3) out.push(C("glint", (p) => star(p, 32, 32, 30, "#ffffff"), [x, y + 0.03, z + 0.05], 0.35 * gl * scale, { glow: 2.5 }));
  }
  return out;
};
/** tumbling debris thrown from a point at t0 */
export const debris = (t: number, at: V3, o: { t0?: number; n?: number; speed?: number; seed?: number } = {}): Card[] => {
  const { t0 = 0, n = 30, speed = 9, seed = 7 } = o;
  const age = t - t0; if (age < 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const h = (k: number) => hash(i, seed * 10 + k);
    const a = h(1) * TAU, el = 0.5 + h(2) * 1.0, v = speed * (0.4 + 0.6 * h(3));
    const x = at[0] + Math.cos(a) * Math.cos(el) * v * age, z = at[2] + Math.sin(a) * Math.cos(el) * v * age * 0.5;
    const y = Math.max(0.05, at[1] + Math.sin(el) * v * age - 4.9 * age * age);
    return { key: `debris${i % 6}`, draw: debrisSprite(i % 6), dw: 64, dh: 64, w: 0.18 + 0.3 * h(4), pos: [x, y, z], centre: true, face: "camera", rot: age * (h(5) - 0.5) * 14, lit: true, maxPx: 96 } as Card;
  });
};
/** a water jet from a nozzle: a continuous stream (overlapping streak sprites along the ballistic path, wobbling) plus
 *  spray droplets that peel off and fall (dir = horizontal unit [x, z], pitch = launch angle) */
export const waterJet = (t: number, from: V3, dir: [number, number], o: { speed?: number; pitch?: number; seed?: number; rate?: number; len?: number; stopZ?: number } = {}): Card[] => {
  const { speed = 9, pitch = 0.5, seed = 8, rate = 60, len = 1.0, stopZ = -Infinity } = o;
  const out: Card[] = [];
  const at = (s: number, wob: number): [V3, number] => {
    const pp = pitch + wob, x = from[0] + dir[0] * speed * Math.cos(pp) * s, z = from[2] + dir[1] * speed * Math.cos(pp) * s, y = from[1] + speed * Math.sin(pp) * s - 4.9 * s * s;
    const vy = speed * Math.sin(pp) - 9.8 * s, vh = speed * Math.cos(pp) * dir[0];
    return [[x, y, z], Math.atan2(vy, vh) - Math.PI / 2];
  };
  const N = 60;
  for (let k = 0; k < N; k++) {
    const s = (k / N) * len, wob = 0.025 * noise1(t * 3 - k * 0.3, seed) * (s / len);
    const [P, rot] = at(s, wob);
    if (P[1] < 0 || P[2] < stopZ) break;
    out.push(C("stream", streamSprite, P, 0.2 + 0.55 * (s / len) ** 1.5, { add: false, soft: true, opacity: 0.9 - 0.4 * (s / len), lit: true, glow: 1.15, fog: true, maxPx: 96, rot }));
  }
  for (const { i, age, u } of live({ rate, life: 1.4, seed, t })) {
    const h = (k: number) => hash(i, seed * 10 + k);
    const s0 = (0.55 + 0.45 * h(1)) * len, [P0] = at(s0, 0), sp = 1.5 + 2 * h(2), a = h(3) * TAU;
    if (P0[2] < stopZ || P0[1] < 0) continue;
    const x = P0[0] + Math.cos(a) * sp * age * 0.5, z = P0[2] + Math.sin(a) * sp * age * 0.3, y = P0[1] + sp * 0.4 * age - 4.9 * age * age;
    if (y < 0 || z < stopZ) continue;
    out.push(C("drop", dropSprite, [x, y, z], (0.05 + 0.07 * h(4)) * (1 + 3 * s0 / len), { add: false, soft: true, opacity: 0.9 - 0.6 * u, lit: true, glow: 1.15, fog: true, maxPx: 64 }));
  }
  return out;
};
const streamSprite = (p: KPen) => { p.ell(32, 32, 20, 31, rgba("#dff6ff", 0.85), 0); p.ell(32, 32, 10, 30, rgba("#ffffff", 0.9), 0); };
/** a god-ray / light shaft card (additive), from `top` angled by rot */
export const shaft = (key: string, top: V3, w: number, len: number, rot: number, strength: number): Card =>
  ({ key: "shaft" + key, draw: beamSprite, dw: 256, dh: 512, w, pos: [top[0], top[1] - len / 2, top[2]], centre: true, face: "yaw", rot, add: true, lit: false, glow: strength, fog: false, maxPx: 512 });
/** a bonfire / chulha fire card: logs + layered flames, redrawn at 15 fps steps (t quantised) */
export const fireCard = (key: string, t: number, pos: V3, w: number, o: { logs?: boolean; seed?: number; glow?: number } = {}): Card => {
  const tq = Math.round(t * 15) / 15, { logs = true, seed = 9, glow = 1.6 } = o;
  return { key: `fire|${key}|${tq}`, dw: 400, dh: 500, w, pos, face: "yaw", lit: false, glow, maxPx: 512, order: 1.5, draw: (p: KPen) => {
    p.ow = 6;
    if (logs) { p.band([[90, 470], [310, 430]], "#5a3a22", 34, 5); p.band([[110, 430], [320, 475]], "#6a4428", 34, 5); for (const x of [120, 300]) p.ell(x, 450, 16, 16, "#c9a070", 4); }
    flame(p, 200, 440, 120, tq, seed);
    flame(p, 140, 445, 60, tq + 0.3, seed + 1);
    flame(p, 265, 445, 70, tq + 0.6, seed + 2);
  } };
};
/** a soft additive glow disc (lamp halo, lantern, fire pool on the ground when flat) */
export const glowCard = (key: string, pos: V3, w: number, col: string, strength: number, flat = false): Card =>
  ({ key: "glow" + key + col, draw: (p: KPen) => p.glow(64, 64, 64, col, 0.9), dw: 128, dh: 128, w, pos, centre: true, face: flat ? "flat" : "camera", add: true, lit: false, glow: strength, fog: false, maxPx: 128 });
/** the moon: a cratered disc with a halo */
export const moonCard = (pos: V3, w: number): Card => ({ key: "moon", dw: 256, dh: 256, w, pos, centre: true, face: "camera", lit: false, glow: 1.7, fog: false, maxPx: 256, order: 0, draw: (p: KPen) => {
  p.glow(128, 128, 128, "#d8efe4", 0.55);
  p.ell(128, 128, 62, 62, p.rad(115, 115, 70, [[0, "#ffffff"], [1, "#d6e8de"]]), 0);
  for (const [x, y, r] of [[110, 110, 12], [150, 140, 9], [120, 155, 7], [146, 104, 6]]) p.ell(x, y, r, r, rgba("#a8c4b8", 0.6), 0);
} });
/** explosion flash: a big expanding fireball card with a ring (t from 0) */
export const blastCard = (pos: V3, w: number, u: number): Card => {
  const uq = q(clamp(u), 20);
  return { key: `blast|${uq}`, dw: 512, dh: 512, w: w * (0.4 + 0.8 * uq), pos, centre: true, face: "camera", lit: false, glow: 2.6 * (1 - uq) + 0.6, add: false, soft: true, opacity: clamp(1.4 - uq * 1.3), fog: false, maxPx: 768, order: 2.5, draw: (p: KPen) => {
    p.ow = 10;
    const lobes = 12;
    const pts: P2[] = []; for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU, r = 200 * (1 + 0.12 * Math.sin(a * lobes + 1.3)); pts.push([256 + Math.cos(a) * r, 256 + Math.sin(a) * r]); }
    p.poly(pts, p.rad(256, 256, 230, [[0, "#ffffff"], [0.3, "#fff1a8"], [0.6, PAL.fire], [1, PAL.ember]]));
    p.ell(256, 256, 120, 120, rgba("#ffffff", 0.7), 0);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; p.stroke([[256 + Math.cos(a) * 215, 256 + Math.sin(a) * 215], [256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250]], 8, "#fff1a8"); }
  } };
};
void ellPts; void INK; void flame;
