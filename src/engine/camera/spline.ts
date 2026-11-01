// Centripetal Catmull-Rom paths with arc-length parameterisation (constant-speed travel, no cusps or self-loops).
import { V3, add, sub, mul, len, lerp3, clamp01 } from "./math";

/** one centripetal Catmull-Rom segment between p1 and p2 (Barry-Goldman), t in [0,1] */
const seg = (p0: V3, p1: V3, p2: V3, p3: V3, t: number): V3 => {
  const d = (a: V3, b: V3) => Math.max(Math.pow(len(sub(b, a)), 0.5), 1e-4);
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), tt = t1 + (t2 - t1) * t;
  const L = (a: V3, b: V3, ta: number, tb: number, x: number) => lerp3(a, b, (x - ta) / (tb - ta));
  const A1 = L(p0, p1, t0, t1, tt), A2 = L(p1, p2, t1, t2, tt), A3 = L(p2, p3, t2, t3, tt);
  const B1 = L(A1, A2, t0, t2, tt), B2 = L(A2, A3, t1, t3, tt);
  return L(B1, B2, t1, t2, tt);
};

export type Path = { at: (s: number) => V3; tangent: (s: number) => V3; length: number; t: (s: number) => number };
/** Build a path through `pts` (>= 2 points). `at(s)` and `tangent(s)` take s in [0,1] = fraction of ARC LENGTH. */
export const makePath = (pts: V3[], samplesPerSegment = 48): Path => {
  if (pts.length < 2) throw new Error("path needs at least 2 points");
  const ext: V3[] = [sub(mul(pts[0], 2), pts[1]), ...pts, sub(mul(pts[pts.length - 1], 2), pts[pts.length - 2])];   // mirror end points
  const nseg = pts.length - 1, eval_ = (g: number): V3 => { const k = Math.min(nseg - 1, Math.floor(g)), u = g - k; return seg(ext[k], ext[k + 1], ext[k + 2], ext[k + 3], u); };
  const N = nseg * samplesPerSegment, cum = [0]; let prev = eval_(0);
  for (let i = 1; i <= N; i++) { const p = eval_((i / N) * nseg); cum.push(cum[i - 1] + len(sub(p, prev))); prev = p; }
  const total = cum[N];
  const gOf = (s: number) => {                        // arc-length fraction -> spline parameter (inverse of the cumulative table, linear inside a tiny cell)
    const target = clamp01(s) * total; let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= target) lo = m; else hi = m; }
    const f = (target - cum[lo]) / Math.max(cum[hi] - cum[lo], 1e-12); return ((lo + f) / N) * nseg;
  };
  const at = (s: number) => eval_(gOf(s));
  const tangent = (s: number): V3 => { const e = 1e-3, a = at(Math.max(0, s - e)), b = at(Math.min(1, s + e)), d = sub(b, a), l = len(d) || 1; return mul(d, 1 / l); };
  return { at, tangent, length: total, t: gOf };
};
export const sumPts = (pts: V3[]) => pts.reduce((s, p) => add(s, p), [0, 0, 0] as V3);
