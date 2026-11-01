// Reusable shot presets. Each builds (f) => { pos, look, fov, roll }: a PURE function of the frame number, so Remotion can render any frame alone.
// Conventions: fov = vertical degrees; azimuth 0 = camera on the +z side of the subject (looking -z), 90 = +x side; elevation in degrees (+ above, - below);
// fill = fraction of the 9:16 frame HEIGHT the subject occupies; progress follows `ease` (smooth | cubic | cruise | linear) over `dur` frames starting at `f0`.
import { V3, add, sub, mul, len, norm, cross, lerp3, mean3, clamp, clamp01, dirFrom, noise1, rad } from "./math";
import { easeBy, EaseName, profile } from "./ease";
import { makePath } from "./spline";
import { distanceForHeight, visibleHeight, lookForEyeLine, groupDistance, ASPECT_9x16 } from "./framing";
import { smoothed } from "./tracking";
import { avoid, Obstacle } from "./collision";

export type CamShot = { pos: V3; look: V3; fov: number; roll: number };
export type Subject = { at: (f: number) => V3; height?: number };
export type DirectorCtx = { subjects: Record<string, Subject>; obstacles?: Obstacle[]; groundY?: number; aspect?: number };
export type Params = Record<string, any>;
type Preset = { doc: string; required: string[]; defaults: Params; build: (p: Params, ctx: DirectorCtx) => (f: number) => CamShot };

const COMMON: Params = { fov: 40, fovTo: null, ease: "smooth", accel: 0.3, decel: 0.3, roll: 0, handheld: 0, seed: 1, sigma: 4, eyeY: 0.38, margin: 0.6, az: 0, el: 0, size: null, fill: 0.5 };
const names = (p: Params): string[] => ([] as string[]).concat(p.subject);
const getSubject = (ctx: DirectorCtx, n: string) => { const s = ctx.subjects[n]; if (!s) throw new Error(`camera preset: unknown subject "${n}" (known: ${Object.keys(ctx.subjects).join(", ")})`); return s; };
const progress = (p: Params, f: number) => { const u = clamp01((f - p.f0) / Math.max(1, p.dur)); return p.ease === "cruise" ? profile(u, p.accel, p.decel) : easeBy(p.ease as EaseName, u); };
const fovAt = (p: Params, u: number) => (p.fovTo == null ? p.fov : p.fov + (p.fovTo - p.fov) * u);

/** target point (eye line) of the subject(s) at f, jitter-filtered */
const targetAt = (p: Params, ctx: DirectorCtx, f: number): V3 => {
  const subs = names(p).map((n) => getSubject(ctx, n));
  return smoothed((g) => mean3(subs.map((s) => s.at(g))), f, p.sigma);
};
/** world size to frame: explicit `size`, else the tallest subject, else 1.7 m */
const sizeOf = (p: Params, ctx: DirectorCtx) => p.size ?? Math.max(...names(p).map((n) => getSubject(ctx, n).height ?? 1.7));
/** camera distance for a given fill: a single subject by height, a group by bounding sphere (fill 1 = just fits) */
const distFor = (p: Params, ctx: DirectorCtx, f: number, fov: number, fill: number) => {
  const ns = names(p);
  if (ns.length === 1) return distanceForHeight(sizeOf(p, ctx), fov, fill);
  const pts = ns.map((n) => getSubject(ctx, n).at(f)), c = mean3(pts);
  return groupDistance(pts, c, fov, ctx.aspect ?? ASPECT_9x16, 0.1) / Math.max(fill, 1e-3);
};
/** final touches common to every preset: subtle handheld roll, collision avoidance */
const finish = (p: Params, ctx: DirectorCtx, f: number, pos: V3, look: V3, fov: number): CamShot => {
  let roll = p.roll, q = pos;
  if (p.handheld > 0) {
    roll += p.handheld * 0.004 * noise1(f * 0.045, p.seed);
    q = add(q, [p.handheld * 0.03 * noise1(f * 0.05, p.seed + 1), p.handheld * 0.02 * noise1(f * 0.05, p.seed + 2), p.handheld * 0.03 * noise1(f * 0.05, p.seed + 3)]);
  }
  return { pos: avoid(q, ctx.obstacles ?? [], ctx.groundY ?? 0, p.margin), look, fov, roll };
};
/** camera placed on a direction from the target at a distance, looking at the eye-line point */
const place = (p: Params, ctx: DirectorCtx, f: number, az: number, el: number, fill: number, fov: number): CamShot => {
  const T = targetAt(p, ctx, f), d = distFor(p, ctx, f, fov, fill), visH = visibleHeight(d, fov);
  return finish(p, ctx, f, add(T, mul(dirFrom(az, el), d)), lookForEyeLine(T, visH, p.eyeY), fov);
};
const fills = (p: Params) => [p.fillFrom ?? p.fill, p.fillTo ?? p.fill] as const;

const staticish = (extra: Params = {}, doc: string): Preset => ({ doc, required: ["subject", "f0", "dur"], defaults: { ...COMMON, push: 0, ...extra },
  build: (p, ctx) => (f) => { const u = progress(p, f), fov = fovAt(p, u); return place(p, ctx, f, p.az, p.el, p.fill * (1 + p.push * u), fov); } });
const dolly = (dir: 1 | -1, doc: string): Preset => ({ doc, required: ["subject", "f0", "dur", "fillFrom", "fillTo"], defaults: { ...COMMON },
  build: (p, ctx) => (f) => { const u = progress(p, f), [a, b] = fills(p), fov = fovAt(p, u), fill = Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * u); return place(p, ctx, f, p.az, p.el, fill, fov); } });

export const PRESETS: Record<string, Preset> = {
  establishingWide: staticish({ fill: 0.12, el: 12, push: 0.06, fov: 46, eyeY: 0.5 }, "far, slightly high, slow push; sets the place"),
  aerial: { doc: "high orbiting-descent over the subject", required: ["subject", "f0", "dur"], defaults: { ...COMMON, fill: 0.08, fillTo: 0.12, elFrom: 58, elTo: 42, swing: 25, fov: 46, eyeY: 0.5 },
    build: (p, ctx) => (f) => { const u = progress(p, f), el = p.elFrom + (p.elTo - p.elFrom) * u, fill = p.fill + (p.fillTo - p.fill) * u; return place(p, ctx, f, p.az + p.swing * u, el, fill, fovAt(p, u)); } },
  closeUp: staticish({ fill: 0.55, push: 0.04 }, "head and shoulders, eye line above centre"),
  extremeCloseUp: staticish({ fill: 0.9, size: 0.4, eyeY: 0.45, fov: 32, push: 0.03 }, "the face fills the frame"),
  lowAngle: staticish({ fill: 0.6, el: -16, push: 0.03 }, "camera below the subject, looking up: power"),
  highAngle: staticish({ fill: 0.5, el: 40, push: 0.03 }, "camera above, looking down: smallness"),
  dollyIn: dolly(1, "constant-rate push towards the subject (exponential in fill)"),
  dollyOut: dolly(-1, "pull away from the subject"),
  orbit: { doc: "circle the subject; az0 + sweep degrees", required: ["subject", "f0", "dur"], defaults: { ...COMMON, fill: 0.5, az0: 0, sweep: 90 },
    build: (p, ctx) => (f) => { const u = progress(p, f); return place(p, ctx, f, p.az0 + p.sweep * u, p.el, p.fill, fovAt(p, u)); } },
  crane: { doc: "rise and pull back (or the reverse) on a spline, keeping the subject framed", required: ["subject", "f0", "dur"],
    defaults: { ...COMMON, fillFrom: 0.5, fillTo: 0.1, elFrom: 5, elTo: 45, swing: 0, lookTo: null },
    build: (p, ctx) => {
      const f0 = p.f0, T0 = () => targetAt(p, ctx, f0), mk = (az: number, el: number, fill: number): V3 => add(T0(), mul(dirFrom(az, el), distFor(p, ctx, f0, p.fov, fill)));
      const a = mk(p.az, p.elFrom, p.fillFrom), b = mk(p.az + p.swing, p.elTo, p.fillTo), mid = add(lerp3(a, b, 0.5), [0, 0.12 * len(sub(b, a)), 0]);
      const path = makePath([a, mid, b]);
      return (f) => { const u = progress(p, f), T = targetAt(p, ctx, f), visH = visibleHeight(len(sub(path.at(u), T)), fovAt(p, u)); const look = lookForEyeLine(T, visH, p.eyeY); return finish(p, ctx, f, path.at(u), p.lookTo ? lerp3(look, p.lookTo as V3, u) : look, fovAt(p, u)); };   // lookTo: the look point glides from the subject to this world point (e.g. up at the sky)
    } },
  tracking: { doc: "travel along a spline path (world points) while looking at the subject", required: ["subject", "f0", "dur", "path"], defaults: { ...COMMON, eyeY: 0.5 },
    build: (p, ctx) => { const path = makePath(p.path as V3[]); return (f) => { const u = progress(p, f), T = targetAt(p, ctx, f); return finish(p, ctx, f, path.at(u), T, fovAt(p, u)); }; } },
  overShoulder: { doc: "behind a shoulder subject, looking at the target subject", required: ["subject", "shoulder", "f0", "dur"], defaults: { ...COMMON, back: 0.9, side: 0.45, up: 0.25, fill: 0.5 },
    build: (p, ctx) => (f) => {
      const S = getSubject(ctx, p.shoulder).at(f), T = targetAt(p, ctx, f), h = sub(S, T), dir = norm([h[0], 0, h[2]]), side = cross(dir, [0, 1, 0]);
      const pos = add(add(add(S, mul(dir, p.back)), mul(side, p.side)), [0, p.up, 0]), d = len(sub(pos, T));
      const fov = clamp((2 * Math.atan(sizeOf(p, ctx) / (Math.max(p.fill, 1e-3) * 2 * d)) * 180) / Math.PI, 18, 70);   // pick the lens that gives the requested fill
      return finish(p, ctx, f, pos, lookForEyeLine(T, visibleHeight(d, fov), p.eyeY), fov);
    } },
};
export const presetNames = () => Object.keys(PRESETS);

/** schema-level check used by the storyboard validator: unknown preset, missing required params, non-numeric values, unknown subjects */
export const checkPreset = (name: string, params: Params, subjectNames?: string[]): string[] => {
  const pr = PRESETS[name]; if (!pr) return [`unknown camera preset "${name}" (known: ${presetNames().join(", ")})`];
  const errs: string[] = [], p = params ?? {};
  for (const k of pr.required) if (p[k] === undefined && !["f0", "dur"].includes(k)) errs.push(`preset ${name}: missing param "${k}"`);
  for (const [k, v] of Object.entries(p)) { if (typeof v === "number" && !Number.isFinite(v)) errs.push(`preset ${name}: ${k} is not finite`); if (!(k in pr.defaults) && !pr.required.includes(k) && !["f0", "dur", "subject", "shoulder", "path", "lookTo"].includes(k)) errs.push(`preset ${name}: unknown param "${k}"`); }
  if (p.ease && !["smooth", "cubic", "cruise", "linear"].includes(p.ease)) errs.push(`preset ${name}: unknown ease "${p.ease}"`);
  if (subjectNames) for (const n of [...names(p), ...(p.shoulder ? [p.shoulder] : [])]) if (n && !subjectNames.includes(n)) errs.push(`preset ${name}: unknown subject "${n}"`);
  if (p.fill !== undefined && !(p.fill > 0 && p.fill <= 1.5)) errs.push(`preset ${name}: fill must be in (0, 1.5]`);
  if (name === "tracking" && (!Array.isArray(p.path) || p.path.length < 2)) errs.push("preset tracking: path needs at least 2 points");
  return errs;
};
export const buildPreset = (name: string, params: Params, ctx: DirectorCtx): ((f: number) => CamShot) => {
  const errs = checkPreset(name, params, Object.keys(ctx.subjects)); if (errs.length) throw new Error(errs.join("; "));
  const pr = PRESETS[name], p = { ...pr.defaults, ...params }; if (p.subject === undefined && name !== "tracking") throw new Error(`preset ${name}: needs a subject`);
  return pr.build(p, ctx);
};
void rad;
