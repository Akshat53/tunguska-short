// Subject tracking without jitter. The camera is a pure function of the frame number, so there is no state to filter recursively;
// instead the target is the Gaussian-weighted average of the subject over a window of frames around f (non-causal, deterministic).
import { V3 } from "./math";
export const smoothed = (at: (f: number) => V3, f: number, sigma = 6, taps = 2): V3 => {
  if (sigma <= 0) return at(f);
  const n = Math.max(1, Math.round(sigma * taps)), out: V3 = [0, 0, 0]; let wsum = 0;
  for (let k = -n; k <= n; k++) { const w = Math.exp(-(k * k) / (2 * sigma * sigma)), p = at(f + k); out[0] += p[0] * w; out[1] += p[1] * w; out[2] += p[2] * w; wsum += w; }
  return [out[0] / wsum, out[1] / wsum, out[2] / wsum];
};
