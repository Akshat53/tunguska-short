// Bombay 1944 light presets. day = clear hot April afternoon over the harbour (Tunguska day, a touch warmer and hazier);
// golden = smoke-hazed orange evening (the hook's "gold from the sky", the fire in the city, the memorial morning);
// dusk = smoke-dark teal evening with an ember-orange horizon (never violet: the owner dislikes purple).
import { LIGHTS as TL, LOOK as TK, type LightPreset, type WorldLook, type LightName } from "../tunguska/lights";

export type { LightPreset, WorldLook, LightName };
export const LIGHTS: Record<LightName, LightPreset> = {
  day: { ...TL.day, lit: [1.5, 1.42, 1.26], shade: [0.32, 0.34, 0.44], lift: [0.06, 0.08, 0.12], hor: "#cfe0ea", fog: "#d2dde2", fogNear: 120, fogFar: 1400, sky: "#dcecff", ground: "#b49a78" },
  golden: {
    ...TL.golden, az: 25, el: 12,
    lit: [1.46, 1.02, 0.66], shade: [0.34, 0.26, 0.24], lift: [0.08, 0.06, 0.05], charTint: [1.0, 0.86, 0.7], term: 0.12,
    fog: "#f0b98e", fogNear: 90, fogFar: 1200, sunCol: "#ffb76e", sunI: 4.4,
  },
  dusk: {
    az: 40, el: 16,
    lit: [1.2, 0.98, 0.84], shade: [0.24, 0.26, 0.3], lift: [0.06, 0.07, 0.08], lambert: 0.35, sideK: 0.84, term: 0.16,
    charTint: [1.0, 0.88, 0.8], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.84, 0.92, 0.96],
    blob: [0.58, 0.66, 0.7], actorShadow: false,
    top: "#1d3a4a", hor: "#e89a62", skyCurve: [0.0, 0.5, 0.6], fog: "#7e8f90", fogNear: 60, fogFar: 900, sunDisc: "#000000",
    sunCol: "#ffcf9e", sunI: 2.2, sky: "#9fc0c0", ground: "#4f5f62", hemiI: 0.5,
    bias: -0.00025, normalBias: 0.015,
  },
  space: TL.space,
};
export const LOOK: Record<LightName, WorldLook> = {
  day: { ...TK.day, sky: { c: ["#d6e2e6", "#b4d2ea", "#86b8e4", "#5a9ad8", "#3a78c4"], e: [0, 3, 9, 20, 45] } },
  golden: {
    ...TK.golden,
    sky: { c: ["#ffcf8a", "#f9b072", "#ef9058", "#cf7058", "#8e5560"], e: [0, 4, 12, 32, 80] },
    cloud: { lit: "#ffd6a8", mid: "#e9a07c", shade: "#9a7f86" },
  },
  dusk: {
    sky: { c: ["#e89a62", "#b9926e", "#6f8a86", "#3a5f6a", "#1d3a4a"], e: [0, 4, 11, 24, 55] },
    water: TK.dusk.water,
    cloud: { lit: "#f2b88e", mid: "#8fa2a0", shade: "#4f6670" },
    bounce: [0.02, 0.02, 0.02],
    sat: 1.04,
  },
  space: TK.space,
};
/** water colours per light (the harbour basin): base albedo of the painted water plane */
export const WATER_COL: Record<LightName, string> = { day: "#2f8f9a", golden: "#3f6f84", dusk: "#284e5a", space: "#2f8f9a" };
