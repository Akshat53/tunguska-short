// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export type LightName = "day" | "golden" | "dusk" | "space";
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#b0607a", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // dusk (ours): violet-blue evening for the sky-watchers' office, warm lamp key, blue shade
  dusk: {
    az: 55, el: 30,
    lit: [1.45, 1.22, 1.02], shade: [0.24, 0.24, 0.44], lift: [0.05, 0.05, 0.15], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.9, 0.86], charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.85, 0.84, 0.98],
    blob: [0.6, 0.58, 0.7], actorShadow: false,
    top: "#2f347f", hor: "#e59aa8", skyCurve: [0.0, 0.5, 0.6], fog: "#a585b8", fogNear: 40, fogFar: 420, sunDisc: "#000000",
    sunCol: "#ffe0c0", sunI: 2.6, sky: "#b0a8e0", ground: "#6a5a80", hemiI: 0.5,
    bias: -0.00025, normalBias: 0.015,
  },
  // space (ours): the globe shot; a bright key from screen left, deep blue-violet backdrop (never black)
  space: {
    az: 110, el: 25,
    lit: [1.6, 1.52, 1.4], shade: [0.26, 0.27, 0.46], lift: [0.05, 0.06, 0.16], lambert: 0.5, sideK: 0.9, term: 0.25,
    charTint: [1.0, 0.96, 0.95], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.9, 0.9, 1.0],
    blob: [0.6, 0.6, 0.7], actorShadow: false,
    top: "#145c70", hor: "#4fb8a8", skyCurve: [0.0, 0.5, 0.6], fog: "#4fb8a8", fogNear: 5000, fogFar: 9000, sunDisc: "#000000",
    sunCol: "#ffffff", sunI: 2.8, sky: "#c8f0e8", ground: "#2a6a70", hemiI: 0.5,
    bias: -0.0005, normalBias: 0.02,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#f2965f", "#e2766c", "#b85870"], e: [0, 4, 12, 35, 85] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  dusk: {
    sky: { c: ["#f0a8a8", "#d48aae", "#9a76b4", "#5c58a4", "#2f347f"], e: [0, 4, 10, 20, 45] },
    water: { near: "#2a3f84", mid: "#40549a", far: "#c98aa8", crest: "#e0a8c0", trough: "#1c2a60", glint: "#ffe0f0", shade: [0.45, 0.48, 0.75] },
    cloud: { lit: "#ffc8c0", mid: "#d898b8", shade: "#8a78b8" },
    bounce: [0.02, 0.01, 0.03],
    sat: 1.08,
  },
  space: {
    sky: { c: ["#6fd0c0", "#3fb5a8", "#2a9d8f", "#1e7f86", "#145c70"], e: [0, 5, 15, 35, 70] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.1,
  },
};
