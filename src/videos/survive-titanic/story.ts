// Timeline of "Could YOU Survive? Ep 1: The Titanic (1912)" (English, Inkfall): shots timed to the final voice
// (stories/survive-titanic/en/words.json, frame = round(start * 30)). One set: the North Atlantic at 2:20 AM, 15 April 1912,
// built around the mascot ("you") at the origin, floating with the waterline at y = 0. World units are metres. Everything is a
// pure function of the frame (eased camera keys, seeded hashes only).
import storyboard from "./storyboard.json";
import { assertValid, type Storyboard } from "../../engine/storyboard/schema";
import { checkPreset, type Obstacle, type Subject } from "../../engine/camera";

export const FPS = 30;
const SB = storyboard as unknown as Storyboard;
export const TOTAL = SB.totalFrames;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places (metres; the sea surface is y = 0, the mascot floats at the origin) ----------------
export const ME: V3 = [0, 0, 0];
/** the stern standing up, far away (shots 1 + the loop tail of 11) */
export const STERN_AT: V3 = [11, 0, -300];
/** the intact ship tilting bow-down (shot 5, "stay on the ship?") */
export const SHIP_AT: V3 = [-40, 0, -230];
/** the half-empty boat rowing away (6) and Lifeboat 14 coming back (7) */
export const BOAT_AWAY0: V3 = [-3.2, 0, -14];
export const BOAT14_0: V3 = [-6, 0, -45], BOAT14_1: V3 = [-1.4, 0, -13];
/** Charles Joughin, the chief baker, calm in the water (8, 9) */
export const BAKER: V3 = [1.25, 0, -1.1];
/** the deck chair you cling to when your arms quit (4) */
export const CHAIR: V3 = [0.72, 0, -0.22];

// ---------------- clocks ----------------
/** the hook clock: shots 1-2 and 13 (after its loop cut) share it, so the last frame of 11 is the frame before frame 0 */
export const LOOP_CUT = 1150;
export const isLoop = (id: number, f: number) => id === 13 && f >= LOOP_CUT;
export const hookT = (id: number, f: number) => (isLoop(id, f) ? (f - TOTAL) / FPS : f / FPS);
/** the stern: how far it has slid under (0..1) and the lights (0 = out) at hook time t (s) */
export const sternSink = (t: number) => smooth((t - 3.3) / 3.5);
export const sternLights = (t: number) => {
  if (t < 4.4) return 1 - 0.2 * (Math.sin(t * 13) > 0.85 ? 1 : 0) * smooth((t - 2.5) / 1.5);
  if (t > 5.1) return 0;
  return Math.floor(t * 9) % 2 ? 0.7 : 0.08;                 // the final flicker (the power failed just before the plunge)
};
/** the cold-shock body timer: minutes since you hit the water, shown 0 -> 10 across shots 3-4 */
export const TIMER = { a: 212, b: 457, fill0: 266, fill1: 430 };
export const timerMinutes = (f: number) => (f < TIMER.fill0 ? 1 / 60 + (f - TIMER.a) / FPS / 60 : 1 / 60 + (10 - 1 / 60) * smooth((f - TIMER.fill0) / (TIMER.fill1 - TIMER.fill0)));

// ---------------- shots ----------------
export type Light = "night";
export type Scene = "sea";
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
/** the EP 2 tag (series hook) in the last 2 s */
export const NEXT = { a: 1150, b: 1212 };
/** the one on-screen choice pill (not a caption): frames [a, b) */
export const PILL = { a: 463, b: 572, text: "Jump early… or stay?" };

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
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
/** eased progress through a shot (no linear starts/stops) */
const ease = (f: number, a: number, b: number) => glide((f - a) / (b - a));
const orbit = (c: V3, r: number, deg: number, y: number): V3 => [c[0] + r * Math.sin((deg * Math.PI) / 180), y, c[2] + r * Math.cos((deg * Math.PI) / 180)];

/** the swell: everything floating bobs on it (frame-pure) */
export const swell = (x: number, z: number, t: number) => 0.035 * Math.sin(t * 1.25 + x * 0.35 + z * 0.22) + 0.02 * Math.sin(t * 2.1 - x * 0.6 + z * 0.4);
const bobCam = (t: number, k = 1): V3 => [0.02 * k * Math.sin(t * 0.9), 0.03 * k * Math.sin(t * 1.25 + 0.4), 0];

// ---- framings ----
// 1 HOOK: low over the black water beside you; you gasp, the lit stern stands far behind. Slow push. 13 lands here.
export const P1: V3 = [0.55, 0.5, 3.4], L1: V3 = [-0.1, 1.16, -6];
const S1a = (f: number): Shot => { const t = f / FPS, u = clamp01((t + 3) / 7); return { pos: add(lerp3(P1, [0.5, 0.52, 3.05], u), bobCam(t)), look: L1, fov: 44 }; };
// 2 SPECTACLE: long lens on the stern standing out of the sea (lights on, then out, then it slides under); you small in front
const S2a = (f: number): Shot => { const u = ease(f, 90, 205); return { pos: add(lerp3([2.2, 0.32, 13.0], [2.0, 0.36, 12.0], u), bobCam(T(f), 0.4)), look: lerp3([-14, 30, -300], [-13, 26, -300], u), fov: 30 }; };
// 3 CLOSE: the gasp reflex, a wave washes over you; slow orbit
const S3a = (f: number): Shot => { const u = ease(f, 205, 344); return { pos: add(orbit([0, 0.7, 0], 1.75, -18 + 22 * u, 0.76 - 0.08 * u), bobCam(T(f), 0.7)), look: [0.02, 0.6, 0], fov: 40 }; };
// 4 LOW over the water: wreckage in the foreground, you splashing behind it; slow lateral slide
const S4a = (f: number): Shot => { const u = ease(f, 344, 400); return { pos: add(lerp3([1.05, 0.17, 2.9], [0.75, 0.19, 2.7], u), bobCam(T(f), 0.6)), look: [-0.1, 0.62, -2], fov: 44 }; };
// 5 MACRO: your trembling hands gripping your life jacket (the timer hits 10:00)
const S5a = (f: number): Shot => { const u = ease(f, 400, 457); return { pos: add(lerp3([0.1, 0.36, 1.25], [0.07, 0.34, 1.05], u), bobCam(T(f), 0.3)), look: [0.0, 0.27, 0], fov: 38 }; };
// 6 HIGH-ISH WIDE: the lit ship mid-sinking far off ("stay on the ship?"); you small in the foreground; slow push
const S6a = (f: number): Shot => { const u = ease(f, 457, 575); return { pos: add(lerp3([-0.5, 1.35, 3.7], [-0.42, 1.25, 3.1], u), bobCam(T(f), 0.6)), look: lerp3([-12, -12, -230], [-11, -10, -230], u), fov: 56 }; };
// 7 a half-empty lifeboat rows away; you reach after it
const S7a = (f: number): Shot => { const u = ease(f, 575, 678); return { pos: add(lerp3([-0.5, 0.95, 4.3], [-0.45, 0.9, 3.9], u), bobCam(T(f), 0.7)), look: lerp3([-1.2, 0.7, -12], [-1.4, 0.75, -12], u), fov: 50 }; };
// 8 Lifeboat 14 comes back out of the mist, a lantern held high at the bow
const S8a = (f: number): Shot => { const u = ease(f, 678, 735); return { pos: add(lerp3([-1.05, 0.8, 3.8], [-0.98, 0.78, 3.55], u), bobCam(T(f), 0.6)), look: lerp3([0.6, 1.2, -14], [0.55, 1.1, -13], u), fov: 50 }; };
// 9 HIGH ANGLE down on you among the wreckage, the lantern light falling on you
const S9a = (f: number): Shot => { const u = ease(f, 735, 782); return { pos: lerp3([1.2, 3.1, 2.7], [1.0, 2.8, 2.4], u), look: [-0.35, 0.3, -1.4], fov: 46 }; };
// 10 TWO-SHOT: the chief baker floats calmly beside you, chatting; slow lateral glide
const S10a = (f: number): Shot => { const u = ease(f, 782, 910); return { pos: add(lerp3([0.45, 0.88, 4.5], [0.8, 0.82, 4.0], u), bobCam(T(f), 0.6)), look: lerp3([0.58, 0.55, -0.55], [0.66, 0.55, -0.55], u), fov: 50 }; };
// 11 CLOSE on the baker: "Legend says whisky" (he raises a little flask, cheerfully); slow push
const S11a = (f: number): Shot => { const u = ease(f, 910, 1000); return { pos: add(lerp3(add(BAKER, [-0.5, 0.82, 1.9]), add(BAKER, [-0.38, 0.8, 1.55]), u), bobCam(T(f), 0.5)), look: add(BAKER, [0.05, 0.62, 0]), fov: 38 }; };
// 12 CLOSE on you: "Scientists doubt it helped" (sceptical)
const S12a = (f: number): Shot => { const u = ease(f, 1000, 1070); return { pos: add(orbit([0, 0.7, 0], 1.95, 14 - 10 * u, 0.74), bobCam(T(f), 0.5)), look: [0.08, 0.62, 0], fov: 40 }; };
// 13 the sign-off: you turn to camera and wave ("Follow"); then cut back to the hook on the hook clock (last frame = frame 0)
const S13a = (f: number): Shot => { const u = ease(f, 1070, 1150); return { pos: add(lerp3([0.25, 0.72, 2.6], [0.12, 0.7, 2.1], u), bobCam(T(f), 0.5)), look: [0.02, 0.66, 0], fov: 40 }; };
const S13b = (f: number) => S1a(f - TOTAL);

const CAM_FN: Record<string, (f: number) => Shot> = { S1a, S2a, S3a, S4a, S5a, S6a, S7a, S8a, S9a, S10a, S11a, S12a, S13a, S13b };

// ---- camera director: subjects and obstacles (QA projects these) ----
const eye = (p: V3, h: number): V3 => [p[0], p[1] + h, p[2]];
export const DIRECTOR_SUBJECTS: Record<string, Subject> = {
  you: { at: () => eye(ME, 0.6), height: 0.9 },
  sea: { at: () => [0, 0.3, -4], height: 1.0 },
  ship: { at: () => [SHIP_AT[0], 18, SHIP_AT[2]], height: 40 },
  boat: { at: (f) => [BOAT_AWAY0[0] - 0.012 * Math.max(0, f - 575), 0.6, BOAT_AWAY0[2] - 0.03 * Math.max(0, f - 575)], height: 1.5 },
  stern: { at: () => [STERN_AT[0], 30, STERN_AT[2]], height: 70 },
  hands: { at: () => [0, 0.2, 0.05], height: 0.3 },
  boat14: { at: (f) => { const u = smooth((f - 678) / 110); return [BOAT14_0[0] + (BOAT14_1[0] - BOAT14_0[0]) * u, 0.9, BOAT14_0[2] + (BOAT14_1[2] - BOAT14_0[2]) * u]; }, height: 2.0 },
  baker: { at: () => eye(BAKER, 0.6), height: 0.9 },
  pair: { at: () => [0.6, 0.6, -0.5], height: 1.0 },
};
export const DIRECTOR_OBSTACLES: Obstacle[] = [];
assertValid(SB, { camFns: Object.keys(CAM_FN), subjects: Object.keys(DIRECTOR_SUBJECTS), presetCheck: checkPreset, scenes: ["sea"], lights: ["night"] });
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
  const c = run(CAMS[id], f);
  const a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** depth of field: off (house rule: lens blur stays off); kept for the QA tools' interface */
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });
// the final narration text (stories/survive-titanic/en/narration.txt); kept for tooling (this film renders without captions)
export default "The Titanic's gone. You're in the water.\nTwo-twenty A.M. The sea's about minus two degrees.\nYour body gasps by itself. Under a wave, that's deadly.\nTen minutes, maybe less, and your arms stop working.\nWould you jump early, or stay on the ship? Comment below.\nLifeboats float nearby, many half empty. Only one comes back: Lifeboat fourteen.\nYet chief baker Charles Joughin said he lasted about two hours.\nHis secret? Legend says whisky. Scientists doubt it helped.\nEpisode two: Pompeii. Follow, so you don't miss it.";
