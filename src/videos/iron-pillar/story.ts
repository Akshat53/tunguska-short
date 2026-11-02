// Timeline of "दिल्ली का लौह स्तंभ" (Hindi, Iron Pillar): shots timed to the final voice (stories/iron-pillar/hi/words.json,
// frame = round(start * 30)), house camera grammar (slow push-ins, smootherstep glides, cuts for big reframes, 7-frame kicks).
// Every set is built at the origin (court / forge / macro / lab); only the current shot's set is posed (world.ts).
// World units are metres. Everything here is a pure function of the frame number.
import storyboard from "./storyboard.json";
import { assertValid, type Storyboard } from "../../engine/storyboard/schema";
import { checkPreset, type Obstacle, type Subject } from "../../engine/camera";

export const FPS = 30;
const SB = storyboard as unknown as Storyboard;
export const TOTAL = SB.totalFrames;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ---------------- places (metres) ----------------
/** court: the pillar at the origin, about 6.7 m above the paving (shaft + bell capital) */
export const PILLAR: V3 = [0, 0, 0];
export const PH = 6.7;
/** the cannon dent ~4 m up; the polished band at ~1.0-1.7 m */
export const DENT_Y = 4.0;
export const BAND: [number, number] = [1.0, 1.75];
/** the girl looking up (shot 2), the magic-watchers (7), the hugger (14), the cannon (5) */
export const GIRL: V3 = [0.95, 0, 2.4];
/** the guide (shot 2) and the boy at the new fence (shot 15) */
export const GUIDE_AT: V3 = [-0.7, 0, 2.9];
export const KID15: V3 = [0.4, 0, 2.3];
export const WATCH: V3 = [-0.95, 0, 2.15];
export const HUGGER: V3 = [-0.36, 0, 0.06];
export const CANNON: V3 = [-6.5, 0, 6.5];
export const MUZZLE: V3 = [-5.55, 1.15, 5.55];
/** cannon: fired on 'तोप', the ball strikes the pillar on 'दागा' */
export const FIRE_F = 352, IMPACT_F = 378;
/** hammer strikes in the forge (shot 4) */
export const STRIKES = [258, 267, 286, 301, 320];
/** macro: rust grows from 'नहीं' (543), the layer forms from 'फिर' (664) */
export const RUST_F = 548, LAYER_F = 668, SHIELD_F = 742;
/** fence rises on 'जाली' (1264); the band goes brown by 'भूरी' (1366) */
export const FENCE_F = 1262, BROWN_F0 = 1296, BROWN_F1 = 1372;
/** forge: smith + anvil at the origin, furnace to screen-left */
export const ANVIL: V3 = [0, 0, 0];
export const SMITH: V3 = [0.95, 0, -0.35];
export const HOLDER: V3 = [-0.95, 0, -0.3];
export const FURNACE: V3 = [-2.6, 0, -1.6];
/** lab */
export const SCI: V3 = [0.25, 0, -0.6];

// ---------------- story state ----------------
/** cannon dent visibility 0..1 */
export const dentAt = (f: number) => (f < IMPACT_F ? 0 : 1);
/** band shine 1 (polished) .. 0 (dark brown) */
export const shineAt = (id: number, f: number) => (id < 14 ? 0.0 : id === 14 ? 1 : id === 15 ? 1 - smooth((f - BROWN_F0) / (BROWN_F1 - BROWN_F0)) : 0);
/** the fence: 0 (none) .. 1 (up) */
export const fenceAt = (id: number, f: number) => (id < 15 ? (id === 16 ? 1 : 0) : id === 15 ? easeOut((f - FENCE_F) / 14) : 1);

// ---------------- shots ----------------
export type Light = "day" | "golden" | "dusk" | "night" | "macro" | "lab" | "rain";
export type Scene = "court" | "forge" | "macro" | "lab";
export type ShotDef = { id: number; a: number; b: number; light: Light; scene: Scene };
export const SHOTS: ShotDef[] = SB.shots.map((x) => ({ id: x.id, a: x.a, b: x.b, light: x.light as unknown as Light, scene: x.scene as unknown as Scene }));
export const XFADE: Record<number, number> = Object.fromEntries(SB.shots.filter((x) => x.xfade).map((x) => [x.id, x.xfade!]));
export const FLASH_AT = SB.events.flashAt;
export const FLASHES: [number, number][] = SB.events.flashes;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: lerp3(a.pos, b.pos, k), look: lerp3(a.look, b.look, k), fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const span = (f: number, a: number, b: number) => smooth((f - a) / (b - a));
const glideS = (f: number, a: number, b: number) => glide((f - a) / (b - a));

// ---- framings ----
// 1 HOOK: low angle up the pillar, the Minar behind; slow push in (shot 16 ends close to this framing: the loop)
// 1 HOOK: low beside the girl at the fence, the pillar towering, crowd around; slow push (shot 16 lands exactly here: the loop)
const P1: V3 = [2.3, 1.0, 6.0], L1: V3 = [0.15, 2.25, -1], P1b: V3 = [2.1, 1.05, 5.3];
const S1a = (f: number): Shot => ({ pos: lerp3(P1, P1b, span(f, 0, 116)), look: L1, fov: 56 });
// 2 the guide leans in ("the truth is stranger"), the pillar behind him
const S2a = (f: number): Shot => ({ pos: lerp3([-0.6, 1.62, 5.4], [-0.6, 1.62, 5.0], span(f, 116, 172)), look: [-0.3, 1.7, 1.2], fov: 42 });
// 3 crane over the courtyard: visitors, the arches, the pillar
const S3a = (f: number): Shot => { const u = glideS(f, 172, 243); return { pos: lerp3([6.5, 2.0, 12.5], [7.5, 5.2, 14.5], u), look: lerp3([0, 2.6, -1], [0, 3.6, -3], u), fov: 44 }; };
// 4 forge: three-quarter on the anvil, the hammer smith and the tong holder
const S4a = (f: number): Shot => ({ pos: lerp3([0.25, 1.5, 5.0], [0.15, 1.4, 4.4], span(f, 243, 328)), look: [-0.15, 1.0, -0.5], fov: 48 });
// 5 behind the cannon: it fires at the pillar
const S5a = (f: number): Shot => ({ pos: lerp3([-9.6, 1.7, 11.2], [-9.2, 1.75, 10.6], span(f, 328, 399)), look: [-2.2, 2.7, 1.0], fov: 44 });
// 6 the dent close, then tilt down / pull back: the pillar stands
const S6a = (f: number): Shot => { const u = glideS(f, 418, 470), d = 0.25 * span(f, 399, 420); return { pos: lerp3([0.25, DENT_Y - 0.05, 1.7 - d], [0.6, 2.3, 7.4], u), look: lerp3([0, DENT_Y, 0], [0, 3.3, 0], u), fov: 40 }; };
// 7 two visitors marvel at 'magic iron', sparkles around the shaft
const S7a = (f: number): Shot => ({ pos: lerp3([0.9, 1.3, 7.6], [0.7, 1.35, 7.0], span(f, 475, 543)), look: [-0.4, 1.95, 0], fov: 42 });
// 8 / 9 / 11 macro: the cut-away of the iron surface (the card stage's macro set, 4 m wide)
// 8 storm: the young pillar in the rain, rust blooming fast (medium, slow push up the shaft)
const S8a = (f: number): Shot => ({ pos: lerp3([0.5, 1.4, 4.2], [0.35, 1.9, 3.3], span(f, 543, 664)), look: lerp3([0, 2.2, 0], [0, 2.8, 0], span(f, 543, 664)), fov: 46 });
const S9a = (f: number): Shot => ({ pos: lerp3([0.35, 0.3, 2.7], [0.1, 0.28, 2.3], span(f, 664, 788)), look: [0, 0.05, 0], fov: 42 });
const S11a = (f: number): Shot => ({ pos: lerp3([-0.3, 0.15, 2.4], [0.2, 0.2, 2.1], span(f, 858, 950)), look: [0, 0.0, 0], fov: 42 });
// 10 lab: the scientist at the microscope, the pillar poster behind
const S10a = (f: number): Shot => ({ pos: lerp3([1.0, 1.55, 3.7], [0.8, 1.52, 3.2], span(f, 788, 858)), look: [-0.1, 1.3, -0.6], fov: 42 });
// 12 forge again: the furnace, bellows, the lime basket pushed away
const S12a = (f: number): Shot => ({ pos: lerp3([-0.9, 1.5, 4.9], [-1.3, 1.4, 4.3], span(f, 950, 1086)), look: [-1.9, 0.9, -0.8], fov: 44 });
// 13 'सबूत?': close on the scientist turning to us
const S13a = (f: number): Shot => ({ pos: lerp3([0.35, 1.62, 1.55], [0.32, 1.62, 1.4], span(f, 1086, 1117)), look: [0.25, 1.52, -0.6], fov: 40 });
// 14 the hug for luck: medium, eye level; the shiny band
const S14a = (f: number): Shot => ({ pos: lerp3([0.9, 1.4, 4.4], [0.6, 1.4, 3.7], span(f, 1117, 1257)), look: [-0.2, 1.45, 0], fov: 42 });
// 15 the fence rises; the band dulls (time-lapse light)
const S15a = (f: number): Shot => ({ pos: lerp3([1.6, 1.5, 5.6], [1.4, 1.45, 4.8], span(f, 1257, 1398)), look: [0, 1.4, 0], fov: 50 });
// 16 ending: golden, rising pull back to the hook's framing
// 16 ending: crane up and out over the whole Qutb complex, then glide down onto the hook's framing (the loop)
const S16a = (f: number): Shot => {
  const u1 = glideS(f, 1398, 1478), u2 = glideS(f, 1478, TOTAL - 4);
  const wideP: V3 = [9, 24, 34], wideL: V3 = [-2, 6, -30];
  const p1 = lerp3([2.4, 1.6, 6.6], wideP, u1), l1 = lerp3([0, 3.2, 0], wideL, u1);
  return { pos: lerp3(p1, P1, u2), look: lerp3(l1, L1, u2), fov: 50 + 6 * u2 };
};

const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S2a, S3a, S4a, S5a, S6a, S7a, S8a, S9a, S10a, S11a, S12a, S13a, S14a, S15a, S16a };

// ---- camera director: subjects and obstacles (QA projects these) ----
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  pillar: { at: () => [0, 3.2, 0], height: PH },
  dent: { at: () => [0, DENT_Y, 0], height: 0.4 },
  girl: { at: () => eye(GIRL, 0.8), height: 1.3 },
  guide: { at: () => eye(GUIDE_AT, 1.0), height: 1.75 },
  smith: { at: () => eye(SMITH, 1.0), height: 1.7 },
  cannon: { at: () => [CANNON[0], 0.9, CANNON[2]], height: 1.6 },
  macro: { at: () => [0, 0.1, 0], height: 1.4 },
  scientist: { at: () => eye(SCI, 1.0), height: 1.7 },
  hugger: { at: () => eye(HUGGER, 1.0), height: 1.7 },
  fence: { at: () => [0, 0.6, 0], height: 1.2 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [];
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset,
  scenes: ["court", "forge", "macro", "lab"], lights: ["day", "golden", "dusk", "night", "macro", "lab", "rain"] });
const CAMS: Record<number, Key[]> = Object.fromEntries(SB.shots.map((x) => [x.id, x.camera.map((k) => (
  { f: k.f, ...(k.dur ? { dur: k.dur } : {}), ...(k.cut ? { cut: true } : {}), s: CAM_FN[k.fn!] }))]));

export const HITS = SB.events.hits;
const KICKS: [number, number][] = SB.events.kicks.map(([f, g]) => [f / FPS, g] as [number, number]);
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** depth of field: off in this film (house rule: lens blur stays off); kept for the QA tools' interface */
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });
