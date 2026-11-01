// Light presets for the kit card stage (src/engine/kit/stage.ts): an ambient card multiplier, a gradient sky, fog.
// Fires (lamps, chulhas, torches) are added per set in world.ts and warm every card near them; the moon stays cool.
// "night" is a deep teal-blue moonlit night (never black, no purple); the grade per light maps to the shared Tunguska grades.
import type { Lighting } from "../../engine/kit/stage";
import type { Light } from "./story";

export const LIGHTING: Record<Light, Omit<Lighting, "fires">> = {
  night: { ambient: [0.6, 0.7, 0.92], skyStops: ["#3f6a80", "#26506a", "#173a55", "#0c2540"], skyEl: [0, 9, 26, 70], fog: "#2c5068", fogNear: 28, fogFar: 170 },
  dusk: { ambient: [0.48, 0.5, 0.66], skyStops: ["#e8a070", "#8a8a9a", "#3a5a78", "#1c3450"], skyEl: [0, 8, 24, 60], fog: "#4a5a6a", fogNear: 20, fogFar: 120 },
  day: { ambient: [1.02, 1.0, 0.95], skyStops: ["#e8f0f0", "#bcdcec", "#7fb6e4", "#4f95da"], skyEl: [0, 8, 24, 60], fog: "#d8e4e4", fogNear: 40, fogFar: 300 },
  golden: { ambient: [1.04, 0.9, 0.74], skyStops: ["#ffcf8a", "#f4a46a", "#c88a6a", "#4f6a80"], skyEl: [0, 6, 20, 55], fog: "#e8c49a", fogNear: 40, fogFar: 260 },
  map: { ambient: [1.0, 0.98, 0.95], skyStops: ["#2f6a7a", "#1f5060", "#173f4c", "#10303c"], skyEl: [0, 10, 30, 70], fog: "#244c58", fogNear: 400, fogFar: 900 },
};
/** shared post grade per light (Tunguska grades: day / golden / dusk / space) */
export const GRADE_OF: Record<Light, "day" | "golden" | "dusk" | "space"> = { night: "dusk", dusk: "dusk", day: "day", golden: "golden", map: "day" };
