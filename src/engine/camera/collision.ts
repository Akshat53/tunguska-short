// Keep the camera out of scene geometry. Pure and deterministic (position in, position out).
// Each obstacle is a signed distance field (sdf < 0 inside). The camera is pushed along the surface normal by a SMOOTH displacement
// d(sdf) that starts easing in `soft` metres before contact (C1: no kink in the camera path where it meets an obstacle),
// then the ground is applied last so a push-out can never leave the camera underground.
import { V3, sub, len, add, mul } from "./math";
export type Obstacle =
  | { kind: "sphere"; c: V3; r: number }                        // globe, tent, rock
  | { kind: "cyl"; x: number; z: number; r: number; h: number }  // vertical cylinder standing on the ground: tree trunk, pole
  | { kind: "box"; min: V3; max: V3 };                           // office walls, desks
/** C1 smooth version of max(0, x): 0 for x <= -k, x for x >= k, quadratic in between */
export const softPos = (x: number, k: number) => (x <= -k ? 0 : x >= k ? x : ((x + k) * (x + k)) / (4 * k));
/** smooth maximum of a and b (used for the ground) */
export const smax = (a: number, b: number, k = 0.15) => b + softPos(a - b, k);
/** signed distance to the obstacle and the outward unit normal at p */
const sdf = (p: V3, o: Obstacle): { d: number; n: V3 } => {
  if (o.kind === "sphere") { const v = sub(p, o.c), l = len(v); return { d: l - o.r, n: l < 1e-9 ? [0, 1, 0] : [v[0] / l, v[1] / l, v[2] / l] }; }
  if (o.kind === "cyl") {
    const dx = p[0] - o.x, dz = p[2] - o.z, l = Math.hypot(dx, dz), radial = l - o.r, above = p[1] - o.h;
    if (above > 0 && radial < 0) return { d: above, n: [0, 1, 0] };                                         // over the top: lift
    if (above > 0) { const q = Math.hypot(radial, above); return { d: q, n: [(dx / (l || 1)) * radial / q, above / q, (dz / (l || 1)) * radial / q] }; }
    return { d: radial, n: l < 1e-9 ? [1, 0, 0] : [dx / l, 0, dz / l] };
  }
  const q: V3 = [Math.max(o.min[0] - p[0], 0, p[0] - o.max[0]), Math.max(o.min[1] - p[1], 0, p[1] - o.max[1]), Math.max(o.min[2] - p[2], 0, p[2] - o.max[2])], out = len(q);
  if (out > 0) { const n: V3 = [(p[0] < o.min[0] ? -1 : p[0] > o.max[0] ? 1 : 0) * (q[0] / out), (p[1] < o.min[1] ? -1 : p[1] > o.max[1] ? 1 : 0) * (q[1] / out), (p[2] < o.min[2] ? -1 : p[2] > o.max[2] ? 1 : 0) * (q[2] / out)]; return { d: out, n }; }
  let best = 0, bd = Infinity, sgn = 1;                                                                     // inside: nearest face, but never out through the floor
  for (let a = 0; a < 3; a++) { const dl = p[a] - o.min[a], dh = o.max[a] - p[a]; if (dl < bd && !(a === 1 && o.min[1] <= 0)) { bd = dl; best = a; sgn = -1; } if (dh < bd) { bd = dh; best = a; sgn = 1; } }
  const n: V3 = [0, 0, 0]; n[best] = sgn; return { d: -bd, n };
};
/** smallest distance from the camera to any obstacle surface (negative = inside) or to the ground */
export const clearance = (p: V3, obs: Obstacle[], groundY = 0): number => obs.reduce((c, o) => Math.min(c, sdf(p, o).d), p[1] - groundY);
/** push direction: the surface normal plus a consistent horizontal sideways bias (always the same hand), so a camera heading straight at an
 *  obstacle is steered around it gradually instead of stalling and then flipping sides; the push is lengthened so the clearance guarantee holds */
const BIAS = 0.5;
const steer = (n: V3): { dir: V3; gain: number } => {
  const tx = n[2], tz = -n[0], tl = Math.hypot(tx, tz);
  if (tl < 1e-6) return { dir: n, gain: 1 };                                      // normal is vertical: nothing to steer around
  const d: V3 = [n[0] + (BIAS * tx) / tl, n[1], n[2] + (BIAS * tz) / tl], l = len(d), dir: V3 = [d[0] / l, d[1] / l, d[2] / l];
  return { dir, gain: 1 / Math.max(dir[0] * n[0] + dir[1] * n[1] + dir[2] * n[2], 0.5) };
};
export const avoid = (pos: V3, obs: Obstacle[], groundY = 0, margin = 0.6): V3 => {
  let p: V3 = [pos[0], pos[1], pos[2]];
  const k = Math.max(margin * 1.5, 1e-3);                                         // ease-in zone (m): wider = gentler bend of the path around an obstacle
  for (let pass = 0; pass < 3; pass++) for (const o of obs) {
    const { d, n } = sdf(p, o), push = softPos(margin - d, k);
    if (push > 0) { const { dir, gain } = steer(n); p = add(p, mul(dir, push * gain)); }
  }
  return [p[0], smax(p[1], groundY + margin, k), p[2]];
};

/** authoring check on the PLANNED (obstacle-free) camera path: collision avoidance is a safety net, a path that goes through an obstacle should be redesigned.
 *  Returns the smallest clearance, the first frame index with clearance < 0 (inside geometry) and whether the path is blocked. */
export const pathReport = (positions: V3[], obs: Obstacle[], groundY = 0, margin = 0.6) => {
  let min = Infinity, minAt = 0, firstInside = -1, firstNear = -1;
  positions.forEach((p, i) => { const c = clearance(p, obs, groundY); if (c < min) { min = c; minAt = i; } if (c < 0 && firstInside < 0) firstInside = i; if (c < margin && firstNear < 0) firstNear = i; });
  return { minClearance: min, minAt, blocked: firstInside >= 0, firstInside, tight: firstNear >= 0 };
};
