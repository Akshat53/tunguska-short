// Roopkund light presets: day / golden / space reuse the Tunguska values; "dusk" is re-tuned to a teal-blue high-altitude
// evening (peach horizon -> sea-green -> deep teal), because the Tunguska dusk is violet and the owner dislikes purple.
// The snow world is bright: day/golden lit multipliers are a touch lower so white snow does not clip.
import { LIGHTS as TL, LOOK as TK, type LightPreset, type WorldLook, type LightName } from "../tunguska/lights";

export type { LightPreset, WorldLook, LightName };
export const LIGHTS: Record<LightName, LightPreset> = {
  day: { ...TL.day, lit: [1.38, 1.34, 1.24], shade: [0.34, 0.4, 0.52], lift: [0.06, 0.09, 0.14], hor: "#bcd9ea", fog: "#b9d4e6", fogNear: 150, fogFar: 2600, sky: "#dcecff", ground: "#9fb4c4" },
  golden: { ...TL.golden, lit: [1.34, 1.16, 1.0], shade: [0.26, 0.31, 0.42], lift: [0.05, 0.08, 0.13], charTint: [1.0, 0.86, 0.72], fog: "#f3e4d8", fogNear: 150, fogFar: 2600 },
  dusk: {
    az: 50, el: 22,
    lit: [1.3, 1.12, 0.98], shade: [0.2, 0.3, 0.4], lift: [0.04, 0.08, 0.12], lambert: 0.35, sideK: 0.84, term: 0.18,
    charTint: [1.0, 0.92, 0.88], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.84, 0.92, 0.96],
    blob: [0.58, 0.66, 0.7], actorShadow: false,
    top: "#173f5f", hor: "#f3c99a", skyCurve: [0.0, 0.5, 0.6], fog: "#8fb8bc", fogNear: 150, fogFar: 2600, sunDisc: "#000000",
    sunCol: "#ffe2c4", sunI: 2.4, sky: "#a8d4d0", ground: "#4f6f78", hemiI: 0.5,
    bias: -0.00025, normalBias: 0.015,
  },
  space: { ...TL.space, shade: [0.34, 0.38, 0.42], lift: [0.06, 0.09, 0.1] },
};
export const LOOK: Record<LightName, WorldLook> = {
  day: { ...TK.day, sky: { c: ["#b9d4e6", "#7fb6e4", "#4f95da", "#2f74c8", "#1f56a8"], e: [0, 3, 9, 20, 45] } },
  golden: TK.golden,
  dusk: {
    sky: { c: ["#f3c99a", "#cfd9b4", "#7fbfb6", "#3f8a98", "#173f5f"], e: [0, 4, 11, 24, 55] },
    water: TK.dusk.water,
    cloud: { lit: "#ffe0c4", mid: "#a9cfc8", shade: "#5f8d98" },
    bounce: [0.0, 0.02, 0.03],
    sat: 1.06,
  },
  space: TK.space,
};
/** storm palette: the sky stops and cloud colours the storm amount blends toward (grey-teal, never black) */
export const STORM_SKY = ["#8fa6aa", "#6f8c94", "#4f6e7a", "#365664", "#21404e"];
export const STORM_CLOUD = { lit: "#c6d0d2", mid: "#93a4aa", shade: "#5e7078" };
