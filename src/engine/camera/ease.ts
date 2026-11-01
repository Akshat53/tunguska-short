// Cinematic easing. All functions map u in [0,1] -> progress in [0,1] and are pure.
import { clamp01 } from "./math";
export const smootherstep = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };   // same curve as story.ts `glide`
export const easeInOutCubic = (u: number) => { const x = clamp01(u); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOutCubic = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const easeInCubic = (u: number) => Math.pow(clamp01(u), 3);
/**
 * Acceleration / cruise / deceleration profile: velocity ramps up over the first `accel` of the move (smoothstep ramp),
 * cruises, then ramps down over the last `decel`. Position and velocity are continuous and acceleration is continuous
 * (zero at both ends), so a move starts and stops without a visible kick. `accel` + `decel` must be <= 1.
 */
export const profile = (u: number, accel = 0.3, decel = 0.3) => {
  const x = clamp01(u), vmax = 1 / (1 - (accel + decel) / 2);
  const ramp = (t: number) => t * t * t - (t * t * t * t) / 2;                    // integral of smoothstep(0..1) velocity ramp, ramp(1) = 1/2
  if (accel > 0 && x < accel) return vmax * accel * ramp(x / accel);
  if (decel > 0 && x > 1 - decel) return 1 - vmax * decel * ramp((1 - x) / decel);
  return vmax * accel * 0.5 + vmax * (x - accel);
};
export type EaseName = "smooth" | "cubic" | "cruise" | "linear";
export const easeBy = (name: EaseName, u: number) => name === "smooth" ? smootherstep(u) : name === "cubic" ? easeInOutCubic(u) : name === "cruise" ? profile(u, 0.3, 0.3) : clamp01(u);
