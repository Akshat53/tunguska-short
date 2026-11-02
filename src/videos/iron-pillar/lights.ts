// Light presets for the Iron Pillar card stage: ambient card multiplier, gradient sky, fog. Fires (furnace, cannon flash,
// lab lamp) are added per set in world.ts. Palette: sea-green / teal / cream / sunflower; no purple anywhere.
import type { Lighting } from "../../engine/kit/stage";
import type { Light } from "./story";

export const LIGHTING: Record<Light, Omit<Lighting, "fires">> = {
  day: { ambient: [1.02, 1.0, 0.95], skyStops: ["#f2efe0", "#c6e2e6", "#86c0d8", "#4f9ac8"], skyEl: [0, 8, 24, 60], fog: "#e2e8dc", fogNear: 50, fogFar: 320 },
  golden: { ambient: [1.06, 0.92, 0.76], skyStops: ["#ffd98a", "#f6b46a", "#9cc0b4", "#3f8a92"], skyEl: [0, 7, 22, 60], fog: "#f0cf9a", fogNear: 45, fogFar: 300 },
  dusk: { ambient: [0.62, 0.66, 0.74], skyStops: ["#f0a868", "#b89a7a", "#4f7a80", "#1f4a58"], skyEl: [0, 8, 24, 60], fog: "#6a7a78", fogNear: 25, fogFar: 160 },
  night: { ambient: [0.36, 0.44, 0.52], skyStops: ["#2a4a52", "#1d3a44", "#15303a", "#0e2430"], skyEl: [0, 9, 26, 70], fog: "#1d3a40", fogNear: 10, fogFar: 40 },
  macro: { ambient: [1.0, 1.0, 1.0], skyStops: ["#1f5a62", "#18484f", "#123a42", "#0d2c34"], skyEl: [-20, 0, 20, 60], fog: "#16444c", fogNear: 30, fogFar: 80 },
  rain: { ambient: [0.66, 0.74, 0.8], skyStops: ["#8a9a98", "#6a8486", "#4a6a72", "#2f4f5a"], skyEl: [0, 8, 24, 60], fog: "#7a8c8c", fogNear: 12, fogFar: 70 },
  lab: { ambient: [1.0, 1.0, 0.98], skyStops: ["#e6efe8", "#cfe3e0", "#b2d4d2", "#8fc0c2"], skyEl: [0, 8, 24, 60], fog: "#dfe8e2", fogNear: 20, fogFar: 80 },
};
/** shared Tunguska grade per light (fire / night use the kit grades, chosen in IronPillar.tsx) */
export const GRADE_OF: Record<Light, "day" | "golden" | "dusk" | "space"> = { day: "day", golden: "golden", dusk: "dusk", night: "dusk", macro: "day", lab: "day", rain: "dusk" };
