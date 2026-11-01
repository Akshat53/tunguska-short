// Intelligent framing for vertical 9:16 (aspect = width / height = 0.5625). `fov` is the VERTICAL field of view in degrees (three.js convention).
import { V3, sub, dot, norm, cross, add, mul, len, rad } from "./math";
export const ASPECT_9x16 = 9 / 16;
export const visibleHeight = (dist: number, fovDeg: number) => 2 * dist * Math.tan(rad(fovDeg) / 2);
/** distance at which a subject `h` metres tall fills the fraction `fill` (0..1) of the frame height */
export const distanceForHeight = (h: number, fovDeg: number, fill: number) => h / (Math.max(fill, 1e-3) * 2 * Math.tan(rad(fovDeg) / 2));
/** look-at point that puts the subject's eye line at `eyeY` of the frame measured from the TOP (0.38 = just above centre: headroom + room for captions below) */
export const lookForEyeLine = (eye: V3, visH: number, eyeY = 0.38): V3 => [eye[0], eye[1] - (0.5 - eyeY) * visH, eye[2]];
/** distance so that every point (bounding sphere about `center`) fits the frame with a `margin`; in portrait the HORIZONTAL fov is the limit */
export const groupDistance = (pts: V3[], center: V3, fovDeg: number, aspect = ASPECT_9x16, margin = 0.1) => {
  const R = Math.max(0.01, ...pts.map((p) => len(sub(p, center)))), tv = Math.tan(rad(fovDeg) / 2), th = tv * aspect;
  return R / (Math.min(tv, th) * (1 - margin));
};
export type CamLike = { pos: V3; look: V3; fov: number };
/** project a world point to normalised device coordinates (x right, y up, both -1..1) for a camera that looks from pos to look with world-up; depth <= 0 means behind the lens */
export const project = (cam: CamLike, p: V3, aspect = ASPECT_9x16) => {
  const fwd = norm(sub(cam.look, cam.pos)), right = norm(cross(fwd, [0, 1, 0])), up = cross(right, fwd), l = sub(p, cam.pos);
  const z = dot(l, fwd), t = Math.tan(rad(cam.fov) / 2);
  return { x: dot(l, right) / (z * t * aspect), y: dot(l, up) / (z * t), depth: z };
};
/** Shorts keeps the top ~8% and bottom ~18% for UI/captions: the action must sit inside this NDC box */
export const SAFE = { x: 0.88, yTop: 0.84, yBottom: -0.64 };
export const inSafe = (n: { x: number; y: number; depth: number }, s = SAFE) => n.depth > 0 && Math.abs(n.x) <= s.x && n.y <= s.yTop && n.y >= s.yBottom;
export const offsetAlong = (a: V3, dir: V3, d: number): V3 => add(a, mul(norm(dir), d));
