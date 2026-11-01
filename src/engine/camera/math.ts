// Small vector + noise helpers for the camera director. Pure functions of their inputs (no state, no randomness, no time).
export type V3 = [number, number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const clamp01 = (x: number) => clamp(x, 0, 1);
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const mean3 = (pts: V3[]): V3 => mul(pts.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / pts.length);
/** direction from azimuth/elevation (degrees): azimuth 0 = +z side of the subject, 90 = +x side; elevation 0 = level, + = above */
export const dirFrom = (azDeg: number, elDeg: number): V3 => { const a = rad(azDeg), e = rad(elDeg); return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)]; };

/** deterministic value hash in [0,1) of an integer lattice point + seed (same construction as the character blink hash) */
const hash = (i: number, seed: number) => { const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
/** smooth 1-D value noise in [-1,1]; continuous and C1, a pure function of (t, seed): safe for arbitrary frame seeking */
export const noise1 = (t: number, seed = 0) => {
  const i = Math.floor(t), u = t - i, s = u * u * (3 - 2 * u);
  return (hash(i, seed) * (1 - s) + hash(i + 1, seed) * s) * 2 - 1;
};
