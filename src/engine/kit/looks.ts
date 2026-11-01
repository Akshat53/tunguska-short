// Visual kit: lighting + grade presets for kit scenes. Lighting = KitStage Lighting (card ambient, sky, fog, water);
// grades use the GradeParams shape of src/videos/tunguska/grade.ts (pass them to GradeEffect.set). Teal/sea-green
// shadows, warm firelight highlights; never purple (Cb+ is always paired with Cr- = teal, not violet).
import type { Lighting, FireLight } from "./stage";

export type KitGrade = { ky: number[]; sat: [number, number, number]; tintS: [number, number]; tintM: [number, number]; tintH: [number, number]; vig: [number, number] };

/** moonlit night: deep teal sky, cool sea-green ambient on cards, fog toward teal */
export const NIGHT = (fires: FireLight[] = []): Lighting => ({
  ambient: [0.5, 0.62, 0.72],
  skyStops: ["#2f5f66", "#1b4652", "#11303c", "#0a1f2a"], skyEl: [0, 6, 20, 60],
  fog: "#1f4650", fogNear: 14, fogFar: 85, fires,
});
/** 1944 Bombay afternoon: warm sea haze, soft sun */
export const BOMBAY_DAY = (fires: FireLight[] = []): Lighting => ({
  ambient: [1.0, 0.97, 0.9],
  skyStops: ["#f3dfb8", "#cfe0cf", "#8fc2c4", "#4f97ac"], skyEl: [0, 5, 18, 55],
  fog: "#ecdcbc", fogNear: 35, fogFar: 260, fires,
  water: { deep: "#2f6f74", shallow: "#5f9f9a", glint: "#f6f0d6" },
});
/** the dock fire: smoke-darkened amber sky, warm-orange ambient */
export const DOCK_FIRE = (fires: FireLight[] = []): Lighting => ({
  ambient: [0.78, 0.66, 0.58],
  skyStops: ["#e89a5a", "#a8705a", "#5a4a4c", "#2e3438"], skyEl: [0, 6, 20, 55],
  fog: "#b07a5a", fogNear: 20, fogFar: 160, fires,
  water: { deep: "#2a4a4c", shallow: "#6a5a48", glint: "#ffcf7a" },
});

/** night grade: lifted-teal blacks, gentle S, warm highlights (fire stays orange), stronger vignette */
export const GRADE_NIGHT: KitGrade = { ky: [0.02, 0.1, 0.25, 0.52, 0.8, 0.93, 1], sat: [0.95, 1.12, 1.1], tintS: [0.02, -0.025], tintM: [0.0, -0.006], tintH: [-0.02, 0.018], vig: [0.32, 0.36] };
export const GRADE_HAZE: KitGrade = { ky: [0.01, 0.1, 0.27, 0.57, 0.82, 0.94, 1], sat: [1.0, 1.08, 1.0], tintS: [0.012, -0.01], tintM: [0, 0], tintH: [-0.01, 0.008], vig: [0.18, 0.42] };
export const GRADE_FIRE: KitGrade = { ky: [0.02, 0.1, 0.26, 0.55, 0.82, 0.94, 1], sat: [0.95, 1.12, 1.15], tintS: [0.015, -0.015], tintM: [-0.006, 0.008], tintH: [-0.02, 0.02], vig: [0.3, 0.38] };
