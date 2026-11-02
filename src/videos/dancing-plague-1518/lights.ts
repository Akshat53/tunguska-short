// Light presets for the kit card stage (src/engine/kit/stage.ts): an ambient card multiplier, a gradient sky, fog.
// day = a hot clear July noon over Strasbourg; golden = low warm sun; dusk = teal evening with an amber horizon (never violet:
// the owner dislikes purple). Candles / lamps are added per set in world.ts. The grade per light maps to the house grades.
import type { Lighting } from "../../engine/kit/stage";
import type { Light } from "./story";

export const LIGHTING: Record<Light, Omit<Lighting, "fires">> = {
  day: { ambient: [1.04, 1.02, 0.96], skyStops: ["#eef3e6", "#bfe0ea", "#86c0e4", "#4f9ad8"], skyEl: [0, 8, 24, 60], fog: "#dfe8e2", fogNear: 60, fogFar: 320 },
  golden: { ambient: [1.06, 0.93, 0.78], skyStops: ["#ffd48e", "#f6b072", "#cf9a72", "#5f8a96"], skyEl: [0, 6, 20, 55], fog: "#ecc9a0", fogNear: 50, fogFar: 280 },
  dusk: { ambient: [0.66, 0.7, 0.78], skyStops: ["#f0a868", "#b89a78", "#4f7f86", "#1f4656"], skyEl: [0, 6, 20, 55], fog: "#6f8a88", fogNear: 40, fogFar: 220 },
};
/** shared post grade per light (Tunguska grades) */
export const GRADE_OF: Record<Light, "day" | "golden" | "dusk"> = { day: "day", golden: "golden", dusk: "dusk" };
