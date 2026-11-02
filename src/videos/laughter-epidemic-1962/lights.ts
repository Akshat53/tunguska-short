// Light presets for the kit card stage (src/engine/kit/stage.ts): an ambient card multiplier, a gradient sky, fog.
// day = a clear, humid morning by Lake Victoria; golden = low warm afternoon sun; dusk = teal evening with an amber horizon
// (never violet: the owner dislikes purple). Interiors override the ambient per set in world.ts.
import type { Lighting } from "../../engine/kit/stage";
import type { Light } from "./story";

export const LIGHTING: Record<Light, Omit<Lighting, "fires">> = {
  day: { ambient: [1.03, 1.02, 0.97], skyStops: ["#eef3e6", "#c6e6e2", "#8cc8e0", "#4f9ad0"], skyEl: [0, 8, 24, 60], fog: "#dfeae2", fogNear: 70, fogFar: 360 },
  golden: { ambient: [1.06, 0.95, 0.8], skyStops: ["#ffd48e", "#f6b072", "#cfa27a", "#5f8a96"], skyEl: [0, 6, 20, 55], fog: "#ecc9a0", fogNear: 60, fogFar: 320 },
  dusk: { ambient: [0.72, 0.75, 0.8], skyStops: ["#f0a868", "#c09e78", "#4f7f86", "#1f4656"], skyEl: [0, 6, 20, 55], fog: "#7a9088", fogNear: 50, fogFar: 260 },
};
/** shared post grade per light (Tunguska grades) */
export const GRADE_OF: Record<Light, "day" | "golden" | "dusk"> = { day: "day", golden: "golden", dusk: "dusk" };
