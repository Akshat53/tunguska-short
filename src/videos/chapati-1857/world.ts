// The sets of "1857 chapati" on the kit card stage (src/engine/kit/stage.ts): every set is built at the origin and only the
// current shot's cards are posed, so sets never see each other. update(id, f, camera) is a pure function of (id, f):
// the village lane at night (huts, peepal, well, lanterns, chulha, villagers, fireflies, the runner), the plain of villages
// (4 -> 16 -> 64 glow dots), the map of north India, the Mathura office, the Delhi palace room, the Meerut parade ground,
// the archive. Lamps / chulhas / torches are FireLights: they warm every card near them and bake a rim on the people.
import * as THREE from "three";
import { KitStage, paintTex, type Card, type Lighting, type FireLight, type V3 } from "../../engine/kit/stage";
import { hash, noise1, rgba, type KPen } from "../../engine/kit/core";
import { hut, peepal, well, charpai, lanternPost, bullockCart, haystack, pots, treeline, farVillage } from "../../engine/kit/village";
import { drawChapati, type Pose } from "../../engine/kit/people";
import { smoke as kitSmoke, embers } from "../../engine/kit/fx";
import {
  FPS, SHOTS, camAt, clamp01, smooth, easeOut, runX1, runX2, runX18, RUN_V, OFF1, OFF2, STRANGER as STR, CHOW4, PEEPAL, POINTER, POINTER2,
  CHULHA, COOK as COOKP, CHOW11, LONER, HANDS, DESK_Y, MAGI, TEARER as TEARP, ROTIS, GEN_F, LL, mapXZ, INDORE_F, HAKIM as HAKP, RISE_F, HISTORIAN as HISTP, CROSS_X, type Light,
} from "./story";
import { LIGHTING } from "./lights";
import {
  moon, glowDot, dust, smoke, grassTuft, pool, villageGroundPaint, fieldPaint, VILLAGES, PLAIN, plainPaint, plainRoutes, mapCard, mapRoutes, type Route, MAP_CENTRE, MAP_W,
  MAP_DW, MAP_DH, officeWall, punkah, deskFront, deskTop, tableLantern, palaceWall, takht, lampStand, barracks, flagstaff, farFire, paradePaint, archiveWall, archiveTable,
  chulhaTava, tulsi, rotiBasket, laneArrow, roti, rotiHalf, musket, handsPass,
} from "./art";
import {
  CHOW, OFFICER1, OFFICER2, MAGISTRATE, TEARER, STRANGER, HAKIM, COOK, CLERK, PEON, HISTORIAN, ATTENDANT, sepoy, VILLAGERS, personCard, propCard, withMusket,
} from "./cast";

const FIRE = "#ffad55";
type Built = { cards: Card[]; fires: FireLight[]; fog?: [number, number]; ground: (st: KitStage) => void };
const fire = (pos: V3, seed: number, power = 0.85, radius = 3.2, col = FIRE): FireLight => ({ pos, col, power, radius, seed });

// ---------------- shared bits ----------------
/** run-cycle period so the feet do not slide (kit run: stride 1.55 H, duty 0.38; H = 770 * height / 4.7 design units) */
const runPeriod = (height: number) => (1.55 * ((770 * height) / 4.7) * 0.00216) / (0.38 * RUN_V);
const runnerPose = (t: number): Pose => ({ t, view: "side", gait: "run", phase: (((t / runPeriod(CHOW.height)) % 1) + 1) % 1, turn: 0.35, arms: ["swing", "carry"], hold: [null, "chapati"], expr: "determined" });
const rotiGlow = (p: KPen, A: { hands: [number, number][] }) => { const h = A.hands[A.hands.length - 1]; if (h) p.glow(h[0], h[1] - 30, 120, "#ffd36a", 0.45); };
/** dust kicked by the runner: a puff at each foot strike, fading over 0.8 s */
const runDust = (out: Card[], x0: (tt: number) => number, t: number, z: number, t0: number) => {
  const per = runPeriod(CHOW.height) / 2;
  for (let n = Math.floor((t - t0) / per); n >= 0 && n > Math.floor((t - t0) / per) - 4; n--) {
    const ts = t0 + n * per, age = t - ts;
    if (age < 0 || age > 0.8) continue;
    out.push({ key: `dust${n % 5}`, draw: (p) => dust(p, n % 5), dw: 400, dh: 260, w: 0.7 + age * 0.9, pos: [x0(ts) - 0.15 - age * 0.3, 0, z + 0.05], soft: true, opacity: 0.55 * (1 - age / 0.8), face: "camera" });
  }
};
const fireflies = (out: Card[], t: number, n: number, box: [number, number, number, number], seed = 1, cam?: THREE.PerspectiveCamera) => {
  for (let i = 0; i < n; i++) {
    const x = box[0] + (box[1] - box[0]) * hash(i, seed) + 1.2 * noise1(t * 0.25 + i, seed + i), z = box[2] + (box[3] - box[2]) * hash(i, seed + 1) + 0.8 * noise1(t * 0.2 + i * 3, seed + 7);
    const y = 0.5 + 1.8 * hash(i, seed + 2) + 0.35 * noise1(t * 0.4 + i * 5, seed + 9), blink = 0.5 + 0.5 * Math.sin(t * (2 + hash(i, 4) * 2) + i * 7);
    if (blink < 0.15) continue;
    if (cam && Math.hypot(cam.position.x - x, cam.position.y - y, cam.position.z - z) < 3) continue;
    out.push({ key: "ffly", draw: (p) => glowDot(p, "#d8ff7a", "#f6ffd0"), dw: 200, dh: 200, w: 0.14, pos: [x, y, z], centre: true, face: "camera", add: true, lit: false, glow: 1.2 * blink, maxPx: 64 });
  }
};
const moonCard = (out: Card[], cam: THREE.PerspectiveCamera, dir: V3 = [-0.28, 0.33, -1]) => {
  const l = Math.hypot(...dir), d = 900;
  out.push({ key: "moon", draw: moon, dw: 400, dh: 400, w: 120, pos: [cam.position.x + (dir[0] / l) * d, cam.position.y + (dir[1] / l) * d, cam.position.z + (dir[2] / l) * d], centre: true, face: "camera", lit: false, fog: false, glow: 1.15, order: -5 });
};

// ---------------- the village at night ----------------
type Lamp = { x: number; z: number };
const LAMPS: Lamp[] = [{ x: -12, z: -1.9 }, { x: 0.6, z: -1.9 }, { x: 11.6, z: -2.0 }, { x: -25, z: -2.0 }, { x: 20.5, z: -2.1 }, { x: -20.6, z: -3.7 }];
const HUTS: [number, number, number][] = [ // x, z, seed
  [-31, -8.6, 1], [-12.2, -9.2, 2], [-5.2, -8.4, 3], [2.6, -8.8, 4], [9.4, -9.0, 5], [16.4, -8.5, 6], [23.6, -8.9, 7], [30.6, -8.6, 8],
  [-27, -15, 9], [-18, -15.5, 10], [-8.5, -15.2, 11], [0.5, -15.6, 12], [12.5, -15, 13], [21, -15.4, 14], [29, -15, 15],
  [-25, 9.5, 16], [-11, 9.8, 17], [3, 9.4, 18], [17, 9.6, 19], [30, 9.5, 20],
];
const villageStatic = (): Card[] => {
  const out: Card[] = [];
  for (const [x, z, s] of HUTS) out.push(propCard(`hut${s}`, (p) => hut(p, s, 1), 1000, 820, 800, 6.4, [x, 0, z], { face: z > 0 ? "fixed" : "yaw", yaw: z > 0 ? Math.PI : 0 }));
  out.push(propCard("peepal", (p) => peepal(p, 3), 1600, 1800, 1760, 11, PEEPAL));
  out.push(propCard("well", (p) => well(p, 2), 700, 760, 740, 2.0, [-9, 0, -3.4]));
  out.push(propCard("charpai", (p) => charpai(p, 1, true), 900, 420, 400, 2.0, [-14.6, 0, -5.9]));
  out.push(propCard("cart", (p) => bullockCart(p, 2), 1700, 900, 880, 4.2, [26.5, 0, -6.0]));
  out.push(propCard("hay1", (p) => haystack(p, 1), 600, 520, 500, 2.4, [17.5, 0, -6.4]));
  out.push(propCard("hay2", (p) => haystack(p, 2), 600, 520, 500, 2.2, [-29.5, 0, -5.4]));
  out.push(propCard("pots1", (p) => pots(p, 1), 500, 300, 290, 0.9, [-1.9, 0, -6.4]));
  out.push(propCard("pots2", (p) => pots(p, 2), 500, 300, 290, 0.9, [9.9, 0, -5.7]));
  out.push(propCard("basketV", rotiBasket, 400, 220, 220, 0.45, [-2.7, 0, -4.0]));
  for (const L of LAMPS) out.push(propCard(`lpost${L.x}`, (p) => lanternPost(p, 1), 300, 1100, 1080, 0.78, [L.x, 0, L.z]));
  for (let i = 0; i < 4; i++) out.push(propCard(`far${i}`, (p) => farVillage(p, i + 3), 3000, 500, 500, 46, [-60 + i * 42, 0, -42 - 6 * (i % 2)], { face: "fixed" }));
  out.push(propCard("tline", (p) => treeline(p, 4), 4000, 600, 600, 170, [0, 0, -62], { face: "fixed" }));
  for (let i = 0; i < 46; i++) { const x = -42 + i * 1.9 + hash(i, 5) * 0.8, z = 2.3 + hash(i, 6) * 2.2; out.push(propCard(`tuft${i % 6}`, (p) => grassTuft(p, i % 6), 300, 200, 200, 0.5 + 0.3 * hash(i, 7), [x, 0, z], { maxPx: 192 })); }
  for (let i = 0; i < 26; i++) { const x = -40 + i * 3.1 + hash(i, 8), z = -3.3 - hash(i, 9) * 2.5; if (Math.abs(x + 3.4) < 2.5 || Math.abs(x - CROSS_X) < 1.5) continue; out.push(propCard(`tuftb${i % 6}`, (p) => grassTuft(p, i % 6), 300, 200, 200, 0.45, [x, 0, z], { maxPx: 128 })); }
  return out;
};
const VILLAGE_STATIC = villageStatic();
const lampFires = (): FireLight[] => LAMPS.map((L, i) => fire([L.x + 0.15, 2.0, L.z], 10 + i, 0.75, 3.0));
/** lamp flames + ground glow pools (cards) */
const lampCards = (out: Card[], t: number) => {
  for (const [i, L] of LAMPS.entries()) {
    const fl = 0.9 + 0.1 * noise1(t * 7 + i, i);
    out.push({ key: "lglow", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: 0.9 * fl, pos: [L.x + 0.17, 2.02, L.z + 0.02], centre: true, face: "camera", add: true, lit: false, glow: 1.1, maxPx: 128 });
    out.push({ key: "lpool", draw: (p) => pool(p, "#ffb050"), dw: 400, dh: 400, w: 4.2, pos: [L.x, 0.02, L.z + 0.3], face: "flat", add: true, lit: false, glow: 0.55 * fl, maxPx: 256 });
  }
};
/** the courtyard chulha: card, fire light, smoke */
const chulhaCards = (out: Card[], t: number, puff: number) => {
  out.push(propCard(`chulha|${Math.round(t * 30)}|${Math.round(puff * 10)}`, (p) => chulhaTava(p, t, puff), 600, 420, 420, 0.95, CHULHA, { face: "fixed", yaw: 0.15 }));
  out.push({ key: "cpool", draw: (p) => pool(p, "#ff9a3c"), dw: 400, dh: 400, w: 3.4, pos: [CHULHA[0], 0.02, CHULHA[2] + 0.4], face: "flat", add: true, lit: false, glow: 0.7, maxPx: 256 });
  out.push(...kitSmoke(t, [CHULHA[0] + 0.05, 0.75, CHULHA[2] - 0.1], { rate: 1.0, life: 4, rise: 0.6, wind: 0.25, size: 0.32, dark: 0.15, fire: 0.6, seed: 3, spread: 0.1 }));
  out.push(...embers(t, [CHULHA[0], 0.55, CHULHA[2] + 0.05], { rate: 6, spread: 0.25, rise: 0.7, size: 0.035 }));
  out.push(propCard(`tulsi|${Math.round(t * 15)}`, (p) => tulsi(p, t), 360, 620, 620, 0.55, [-5.0, 0, -4.7]));
};
/** villagers at their doors watching the night (idle life, blinks) */
const villagerCards = (out: Card[], t: number, f: number) => {
  const look = (x: number) => (f < 130 ? clamp01((runX1(f) - x) / 4) * 0.6 - 0.3 : 0);
  out.push(personCard("v-wl", VILLAGERS[5], { t, expr: "worried", turn: look(8.2), arms: ["hold", "hang"], hold: ["lantern", null] }, [8.2, 0, -6.4]));
  out.push(personCard("v-el", VILLAGERS[2], { t, expr: "worried", arms: ["fold", "fold"], turn: look(-15.6) }, [-15.6, 0, -5.4]));
  out.push(personCard("v-ch", VILLAGERS[3], { t, expr: "surprised", arms: ["hang", "point"], turn: look(-13.4) }, [-13.4, 0, -5.2]));
  out.push(personCard("v-m1", VILLAGERS[0], { t, expr: "neutral", arms: ["hold", "hips"], hold: ["lathi", null], turn: look(3) }, [3.0, 0, -6.1]));
  out.push(personCard("v-m2", VILLAGERS[7], { t, expr: "worried", arms: ["cover", "hang"], turn: look(19) }, [19.0, 0, -6.0]));
  out.push(personCard("v-w2", VILLAGERS[6], { t, expr: "neutral", arms: ["hang", "hold"], hold: [null, "pot"] }, [-27.0, 0, -5.8]));
  out.push(personCard("v-ch2", VILLAGERS[4], { t, expr: "happy", arms: ["hang", "hang"], turn: look(9) }, [9.1, 0, -6.0], { scale: 1 }));
};
const villageGround = (st: KitStage) => {
  const m = st.ground("vlane", [80, 40], [0, 0, 0], () => paintTex(4096, 2048, villageGroundPaint), [0.78, 0.84, 1.0]);
  const mat = m.material as THREE.MeshBasicMaterial; mat.polygonOffset = true; mat.polygonOffsetFactor = 2; mat.polygonOffsetUnits = 2;
  const o = st.ground("vfield", [1400, 1400], [0, -0.06, 0], () => paintTex(1024, 1024, fieldPaint, [60, 60]), [0.5, 0.58, 0.72]);
  const om = o.material as THREE.MeshBasicMaterial; om.polygonOffset = true; om.polygonOffsetFactor = 6; om.polygonOffsetUnits = 6;
};

const village = (id: number, f: number, cam: THREE.PerspectiveCamera): Built => {
  const t = f / FPS, out: Card[] = [...VILLAGE_STATIC], fires = [...lampFires(), fire([CHULHA[0], 0.4, CHULHA[2]], 3, 1.0, 2.6)];
  moonCard(out, cam); lampCards(out, t); fireflies(out, t, 46, [-34, 30, -7, 3.5], 1, cam);
  chulhaCards(out, t, 0.5 + 0.5 * Math.sin(t * 2));
  out.push(personCard("cook", COOK, { t, expr: "smile", arms: ["reach", "hang"], turn: 0.2 }, COOKP));
  if (id !== 11) villagerCards(out, t, f);
  if (id === 1 || id === 18) {
    const x = id === 1 ? runX1(f) : runX18(f), t0 = id === 1 ? 0 : (1844 - 2085) / FPS, tt = id === 1 ? t : (f - 2085) / FPS;
    out.push(personCard("runner", CHOW, runnerPose(tt), [x, 0, 0], { extra: rotiGlow, extraKey: "g" }));
    runDust(out, (s) => -6 + RUN_V * s, tt, 0, t0);
  }
  if (id === 2) {
    const xr = runX2(f), turn = (k: number) => Math.max(-0.5, Math.min(0.5, (xr - k) / 4));
    out.push(personCard("runner2", CHOW, runnerPose(t), [xr, 0, 0.4], { extra: rotiGlow, extraKey: "g" }));
    runDust(out, (s) => runX2(s * FPS), t, 0.4, 130 / FPS);
    const examining = f >= 200;
    out.push(personCard("off1", OFFICER1, { t, expr: f < 200 ? "surprised" : f < 262 ? "sly" : "stern", turn: f < 200 ? turn(OFF1[0]) : 0.3,
      arms: examining ? ["cup", "hang"] : ["hold", "hang"], hold: [examining ? "chapati" : "lantern", null], look: examining && f < 262 ? [-0.6, -0.2] : [0.6, 0],
      headTilt: examining && f < 262 ? -8 : 0, talk: [[266 / FPS, 296 / FPS]] }, OFF1));
    out.push(personCard("off2", OFFICER2, { t, expr: f < 262 ? "stern" : "angry", turn: f < 230 ? turn(OFF2[0]) : -0.35, arms: ["hips", f > 200 && f < 262 ? "point" : f >= 262 ? "beckon" : "hang"],
      talk: [[205 / FPS, 260 / FPS]], look: f > 262 ? [-0.7, 0] : [0.5, 0], headTilt: f > 262 ? 6 : 0 }, OFF2));
    fires.push(fire([11.75, 2.0, -2.0], 21, 0.9, 3.0));
    if (!examining) { fires.push(fire([OFF1[0] - 0.3, 0.9, OFF1[2] + 0.1], 22, 0.7, 2.0)); out.push({ key: "olg", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: 0.6, pos: [OFF1[0] - 0.3, 0.9, OFF1[2] + 0.12], centre: true, face: "camera", add: true, lit: false, glow: 1.1, maxPx: 128 }); }
  }
  if (id === 4) {
    const given = f >= 474;
    out.push(personCard("stranger", STRANGER, { t, view: "side", turn: 0.25, expr: "sly", arms: ["hang", f >= 540 ? "point" : given ? "hang" : "reach"], hold: [null, given ? null : "chapati"] }, STR, { tint: [0.62, 0.62, 0.72], scale: 1.02 }));
    out.push(personCard("chow4", CHOW, { t, expr: f < 474 ? "surprised" : f < 520 ? "worried" : "determined", turn: -0.4, arms: given ? ["carry", "hold"] : ["reach", "hold"], hold: [given ? "chapati" : null, "lathi"], look: [-0.5, 0] }, CHOW4));
    fires.push(fire([-20.45, 2.0, -3.7], 31, 0.9, 3.2));
  }
  if (id === 10) {
    out.push(personCard("pointer", OFFICER1, { t, expr: f < 1088 ? "worried" : "angry", turn: f < 1088 ? 0.35 : 0.15, arms: ["hips", f >= 1088 ? "point" : "beckon"], talk: [[1092 / FPS, 1147 / FPS]], look: f < 1088 ? [0.7, 0] : [0.4, 0] }, POINTER));
    out.push(personCard("pointer2", OFFICER2, { t, expr: f < 1092 ? "sly" : "worried", turn: -0.3 + 0.12 * Math.sin(t * 5) * (f > 1110 ? 1 : 0), arms: ["cup", "hang"], hold: ["chapati", null],
      talk: [[1064 / FPS, 1088 / FPS]], look: f < 1092 ? [-0.6, -0.2] : [-0.6, 0], headTilt: f < 1092 ? -7 : 0 }, POINTER2));
    const k = clamp01((f - 1103) / 30);
    out.push({ key: `arrow${Math.round(k * 12)}`, draw: (p) => laneArrow(p, k), dw: 2000, dh: 300, w: 9, pos: [16.5, 0.04, 0.35], face: "flat", add: true, lit: false, glow: 1.2, maxPx: 1024 });
    const xr = 24 + RUN_V * 0.7 * (t - 1064 / FPS);
    out.push(personCard("runner10", CHOW, runnerPose(t), [xr, 0, 0], { extra: rotiGlow, extraKey: "g", maxPx: 384 }));
  }
  if (id === 11) {
    const glint = smooth((f - 1160) / 10) * (1 - smooth((f - 1205) / 18));
    out.push(personCard("chow11", CHOW, { t, expr: "smile", turn: -0.25, arms: ["carry", "hang"], hold: ["chapatis", null] }, CHOW11));
    for (let i = 0; i < 5; i++) if (glint > 0.02) {
      const a = i * 1.3 + t * 1.5, r = 0.25 + 0.1 * i;
      out.push({ key: "spark", draw: (p) => glowDot(p, "#fff3b0"), dw: 200, dh: 200, w: 0.16 * glint * (0.6 + 0.4 * Math.sin(t * 9 + i)), pos: [CHULHA[0] + Math.cos(a) * r, 0.75 + 0.12 * i, CHULHA[2] + 0.3 + Math.sin(a) * 0.1], centre: true, face: "camera", add: true, lit: false, glow: 1.5 });
    }
  }
  if (id === 16) out.push(personCard("loner", CHOW, { t, expr: "worried", turn: 0.1 * Math.sin(t * 0.8), arms: ["hold", "carry"], hold: ["lathi", "chapati"], look: [0.4 * Math.sin(t * 0.7), 0.1] }, LONER, { extra: rotiGlow, extraKey: "g" }));
  if (id === 17) {
    // close-up: a roti passed hand to hand in the lamp light
    const k = smooth((f - 1770) / 50);
    out.push({ key: `hands|${Math.round(k * 60)}`, draw: (p) => handsPass(p, k, t), dw: 1600, dh: 1000, w: 1.3, pos: [HANDS[0], HANDS[1], HANDS[2]], centre: true, face: "fixed", rim: false, maxPx: 2048 });
    out.push({ key: "hlg", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: 1.1, pos: [HANDS[0] - 0.55, HANDS[1] + 0.45, HANDS[2] - 0.9], centre: true, face: "camera", add: true, lit: false, glow: 1.1 });
    fires.push(fire([HANDS[0] - 0.5, HANDS[1] + 0.4, HANDS[2] - 0.4], 41, 0.55, 1.4));
  }
  return { cards: out, fires, ground: villageGround };
};

// ---------------- the plain of villages (shot 5) ----------------
const PLAIN_HUTS: Card[] = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * Math.PI * 2 + 0.3, r = 7 + 2 * hash(i, 3);
  return propCard(`phut${i}`, (p) => hut(p, i + 3, 1), 1000, 820, 800, 5.5, [Math.cos(a) * r, 0, Math.sin(a) * r - 1]);
});
const plain = (f: number, cam: THREE.PerspectiveCamera): Built => {
  const t = f / FPS, out: Card[] = [...PLAIN_HUTS];
  moonCard(out, cam, [-0.2, 0.25, -1]);
  out.push(propCard("plpost", (p) => lanternPost(p, 1), 300, 1100, 1080, 0.78, [1.2, 0, 3]));
  const k = Math.round(f) - 576;
  out.push({ key: `routes${k}`, draw: (p) => plainRoutes(p, f), dw: 2048, dh: 2048, w: PLAIN.x1 - PLAIN.x0, pos: [(PLAIN.x0 + PLAIN.x1) / 2, 0.08, (PLAIN.z0 + PLAIN.z1) / 2], face: "flat", add: true, lit: false, glow: 1.3, maxPx: 2048 });
  for (const v of VILLAGES) {
    const age = f - GEN_F[v.g];
    if (age < 0) continue;
    const d = Math.hypot(cam.position.x - v.x, cam.position.y, cam.position.z - v.z), pop = easeOut(age / 8) * (1 + 0.35 * Math.exp(-age / 5));
    const w = Math.max(2.5, d * 0.05) * pop * (v.g === 0 ? 1.3 : 1);
    out.push({ key: "vdot", draw: (p) => glowDot(p, "#ffb24a"), dw: 200, dh: 200, w, pos: [v.x, 2.5, v.z], centre: true, face: "camera", add: true, lit: false, glow: 1.5, fog: false, maxPx: 128 });
  }
  for (let i = 0; i < 5; i++) out.push(propCard(`pfar${i}`, (p) => farVillage(p, i + 7), 3000, 500, 500, 160, [-360 + i * 180, 0, -430], { face: "fixed" }));
  out.push(propCard("ptline", (p) => treeline(p, 9), 4000, 600, 600, 1100, [0, 0, -470], { face: "fixed" }));
  fireflies(out, t, 20, [-10, 10, -6, 6], 7, cam);
  return {
    cards: out, fires: [fire([1.35, 2.0, 3], 5, 0.8, 4)], fog: [300, 1400],
    ground: (st) => {
      const m = st.ground("plain", [PLAIN.x1 - PLAIN.x0, PLAIN.z1 - PLAIN.z0], [(PLAIN.x0 + PLAIN.x1) / 2, 0, (PLAIN.z0 + PLAIN.z1) / 2], () => paintTex(4096, 4096, plainPaint), [0.66, 0.74, 0.95]);
      const mm = m.material as THREE.MeshBasicMaterial; mm.polygonOffset = true; mm.polygonOffsetFactor = 2; mm.polygonOffsetUnits = 2;
      const o = st.ground("pfield", [4000, 4000], [0, -0.3, 0], () => paintTex(1024, 1024, fieldPaint, [120, 120]), [0.45, 0.52, 0.7]);
      const om = o.material as THREE.MeshBasicMaterial; om.polygonOffset = true; om.polygonOffsetFactor = 6; om.polygonOffsetUnits = 6;
    },
  };
};

// ---------------- the map (shots 6, 15) ----------------
const ROUTES6: [string, string, number][] = [
  ["mathura", "agra", 676], ["mathura", "delhi", 684], ["agra", "gwalior", 700], ["agra", "farrukhabad", 708], ["delhi", "meerut", 712], ["farrukhabad", "kanpur", 728],
  ["meerut", "bareilly", 732], ["kanpur", "lucknow", 748], ["gwalior", "jhansi", 744], ["kanpur", "allahabad", 760], ["jhansi", "saugor", 764], ["allahabad", "benares", 776], ["benares", "patna", 788],
];
const ROUTES15: [string, string, number][] = [
  ["indore", "saugor", 1568], ["indore", "gwalior", 1572], ["saugor", "jabalpur", 1590], ["gwalior", "agra", 1594], ["saugor", "jhansi", 1598], ["agra", "mathura", 1612],
  ["jhansi", "kanpur", 1616], ["agra", "farrukhabad", 1620], ["mathura", "delhi", 1628], ["kanpur", "lucknow", 1632],
];
const mapScene = (id: number, f: number): Built => {
  const out: Card[] = [];
  out.push({ key: "map", draw: mapCard, dw: MAP_DW, dh: MAP_DH, w: MAP_W, pos: [MAP_CENTRE[0], 0, MAP_CENTRE[1]], face: "flat", lit: true, maxPx: 2048 });
  const list = id === 6 ? ROUTES6 : ROUTES15, dur = 26;
  const routes: Route[] = list.map(([a, b, f0]) => ({ a: LL[a], b: LL[b], k: clamp01((f - f0) / dur) }));
  const key = routes.map((r) => Math.round(r.k * 30)).join(",");
  out.push({ key: `mroutes${id}|${key}`, draw: (p) => mapRoutes(p, routes), dw: MAP_DW, dh: MAP_DH, w: MAP_W, pos: [MAP_CENTRE[0], 0.12, MAP_CENTRE[1]], face: "flat", lit: true, maxPx: 2048 });
  const start = id === 6 ? "mathura" : "indore", sf = id === 6 ? 666 : INDORE_F;
  const [sx, sz] = mapXZ(...LL[start]), age = f - sf, pulse = 1 + 0.25 * Math.sin(age * 0.25);
  out.push({ key: "mdot", draw: (p) => { p.ell(100, 100, 80, 80, "#c8323a", 14); p.ell(100, 100, 30, 30, "#fff4dc", 0); }, dw: 200, dh: 200, w: 3.2 * easeOut(age / 10) * pulse, pos: [sx, 0.3, sz], face: "flat", lit: true });
  for (let i = 0; i < 3; i++) {
    const a = ((age + i * 16) % 48) / 48;
    out.push({ key: "ring", draw: (p) => { p.g.strokeStyle = "#c8323a"; p.g.lineWidth = 14; p.g.beginPath(); p.g.arc(200, 200, 180, 0, Math.PI * 2); p.g.stroke(); }, dw: 400, dh: 400, w: 4 + 18 * a, pos: [sx, 0.2, sz], face: "flat", soft: true, lit: true, opacity: 1 - a });
  }
  // little roti icons riding the route heads
  if (id === 15) { // cholera haze over the towns, thinning as the rotis arrive
    for (const [i, [, b, f0]] of ROUTES15.entries()) {
      const [x, z] = mapXZ(...LL[b]), k = 1 - smooth((f - f0 - 20) / 30);
      if (k <= 0.02) continue;
      out.push({ key: "haze", draw: (p) => dust(p, i % 5, "#9ab07a"), dw: 400, dh: 260, w: 9, pos: [x, 0.3, z], face: "camera", soft: true, lit: false, opacity: 0.55 * k * smooth((f - 1549) / 12) });
    }
  }
  return { cards: out, fires: [], ground: (st) => { st.ground("mapsea", [600, 600], [0, -0.2, 0], () => paintTex(256, 256, (g) => { g.fillStyle = "#7fae9f"; g.fillRect(0, 0, 256, 256); }), [0.9, 0.95, 1]); } };
};

// ---------------- the Mathura office ----------------
const officeGround = (st: KitStage) => {
  const m = st.ground("ofloor", [14, 10], [0, 0, 0], () => paintTex(1024, 1024, (g) => {
    g.fillStyle = "#8a5a3a"; g.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 64) { g.fillStyle = (y / 64) % 2 ? "#a8483a" : "#2f5f66"; g.fillRect(140, y, 744, 40); g.fillStyle = "#e9dcc4"; g.fillRect(140, y + 40, 744, 8); }
    g.strokeStyle = "#e2b45a"; g.lineWidth = 12; g.strokeRect(150, 0, 724, 1024);
  }), [1, 1, 1]);
  const mm = m.material as THREE.MeshBasicMaterial; mm.polygonOffset = true; mm.polygonOffsetFactor = 2; mm.polygonOffsetUnits = 2;
};
const office = (id: number, f: number): Built => {
  const t = f / FPS, dusk = id === 13, out: Card[] = [];
  out.push(propCard(`owall${dusk ? 0 : 1}`, (p) => officeWall(p, dusk ? 0 : 1), 4000, 2400, 2400, 8, [0, 0, -2.6], { face: "fixed" }));
  out.push(propCard("punkah", punkah, 2400, 500, 0, 2.4, [0, 3.35, -1.2], { face: "fixed", rot: 0.0, centre: false, pos: [0, 3.35 - 0.5, -1.2 + 0.08 * Math.sin(t * 2.2)] }));
  out.push(propCard("dfront", deskFront, 1900, 820, 820, 1.9, [0, 0, 0.45], { face: "fixed" }));
  out.push({ key: `dtop${dusk ? 1 : 0}`, draw: (p) => deskTop(p, dusk ? 1 : 0), dw: 1800, dh: 900, w: 1.8, pos: [0, DESK_Y + 0.004, 0], face: "flat" });
  out.push(propCard(`dlamp|${dusk ? Math.round(t * 30) : 0}`, (p) => tableLantern(p, t, dusk ? 1 : 0), 300, 520, 520, 0.26, [0.5, DESK_Y + 0.004, -0.3], { face: "fixed" }));
  const fires: FireLight[] = dusk ? [fire([0.5, DESK_Y + 0.25, -0.3], 8, 1.2, 1.6)] : [fire([1.4, 2.2, -2.2], 2, 0.25, 3, "#fff2d0")];
  if (dusk) out.push({ key: "dlg", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: 0.5, pos: [0.5, DESK_Y + 0.2, -0.28], centre: true, face: "camera", add: true, lit: false, glow: 1.2 });
  // rotis on the desk
  const torn = id === 7 || id === 8 ? 1 : 0;
  ROTIS.forEach((r, i) => {
    if (i === 3 && torn) return;
    const age = id === 3 ? f - r.f : 99, s = age < 0 ? 0 : easeOut(age / 6) * (1 + 0.25 * Math.exp(-age / 3));
    if (s <= 0.01) return;
    out.push({ key: `droti${i}`, draw: (p) => roti(p, 11 + i, 0), dw: 400, dh: 400, w: 0.26 * s, pos: [r.x, DESK_Y + 0.012 + i * 0.002, r.z], face: "flat", rot: i * 0.7 });
    if (id === 3 && age < 14) out.push({ key: "rpop", draw: (p) => glowDot(p, "#fff3b0"), dw: 200, dh: 200, w: 0.5 * (1 - age / 14), pos: [r.x, DESK_Y + 0.1, r.z], centre: true, face: "camera", add: true, lit: false, glow: 1.4 });
  });
  if (id === 3 || id === 13) {
    if (id === 3) out.push(personCard("magi", MAGISTRATE, { t, expr: f < 352 ? "stern" : f < 390 ? "surprised" : "awe", turn: 0.05, arms: f < 352 ? ["hips", "hang"] : ["cover", "hang"], lean: 0, look: f < 352 ? [0, 0] : [0.1, 0.32], headTilt: f > 382 ? 5 : 0, idle: 0.5 }, MAGI));
    if (id === 3) out.push(personCard("clerk", CLERK, { t, expr: "worried", turn: 0.35, arms: ["hold", "hang"], hold: ["letter", null] }, [-1.55, 0, -1.4]));
    out.push(personCard("peon", PEON, { t, expr: "neutral", turn: -0.3, arms: ["hold", "hang"], hold: ["lathi", null], idle: dusk ? 0.6 : 1 }, [1.75, 0, -1.7], dusk ? { tint: [0.8, 0.8, 0.9] } : {}));
  } else {
    // 7, 8: the official tears the roti open; the magistrate watches
    const tearK = smooth((f - 822) / 10), open = f >= 822;
    out.push(personCard("magi7", MAGISTRATE, { t, expr: open ? "surprised" : "stern", turn: 0.35, arms: ["fold", "fold"] }, [-0.8, 0, -1.15]));
    out.push(personCard("tearer", TEARER, { t, expr: id === 8 ? (f < 912 ? "surprised" : "worried") : open ? "surprised" : "determined", turn: -0.05, arms: ["carry", "carry"], look: id === 8 && f > 912 ? [0, 0] : [0, 0.6], headTilt: id === 8 && f > 912 ? -4 : 0 }, TEARP,
      { extraKey: `r${Math.round(tearK * 20)}`, extra: (p, A) => {
        const [a, b] = A.hands, cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2 - 20;
        if (!open) drawChapati(p, cx, cy - 10, 46, 42, 14);
        else { rotiHalf(p, cx - 6 - 30 * tearK, cy - 10 + 6 * tearK, 44, -1, 14); rotiHalf(p, cx + 6 + 30 * tearK, cy - 12 - 3 * tearK, 44, 1, 14); }
      } }));
    // crumbs falling after the tear
    for (let i = 0; i < 10 && f >= 822; i++) {
      const age = (f - 822) / FPS - hash(i, 3) * 0.3; if (age < 0 || age > 0.9) continue;
      out.push({ key: "crumb", draw: (p) => p.ell(50, 50, 40, 32, "#d9a860", 4), dw: 100, dh: 100, w: 0.018, pos: [TEARP[0] + (hash(i, 1) - 0.5) * 0.25, 1.3 - 4.9 * age * age, TEARP[2] + 0.25], centre: true, face: "camera", maxPx: 32 });
    }
  }
  return { cards: out, fires, ground: officeGround };
};

// ---------------- the Delhi palace room ----------------
const palace = (f: number): Built => {
  const t = f / FPS, out: Card[] = [];
  out.push(propCard("pwall", palaceWall, 4400, 2800, 2800, 8.8, [0, 0, -3.2], { face: "fixed" }));
  out.push(propCard("takht", takht, 2000, 520, 520, 2.0, [1.3, 0, -1.9], { face: "fixed" }));
  for (const [i, x, z] of [[0, -1.7, -1.1], [1, 1.9, -0.9], [2, -2.4, -2.6]] as const) out.push(propCard(`lamp${i}|${Math.round(t * 30)}`, (p) => lampStand(p, t, i), 220, 1100, 1100, 0.3, [x, 0, z]));
  const fires = [fire([-1.7, 1.42, -1.1], 1, 0.55, 2.0), fire([1.9, 1.42, -0.9], 2, 0.55, 2.0), fire([-2.4, 1.42, -2.6], 3, 0.5, 2.0)];
  const shrug = f >= 1023;
  out.push(personCard("hakim", HAKIM, { t, expr: shrug ? "worried" : "neutral", turn: 0.1 + 0.1 * Math.sin(t * 0.6), arms: ["hang", "carry"], hold: [null, "chapati"], ...(shrug ? { turn: 0.22 * Math.sin((f - 1023) * 0.35) * (1 - smooth((f - 1023) / 40)) } : {}), talk: [[1007 / FPS, 1063 / FPS]], headTilt: shrug ? 7 : 0 }, HAKP, { scale: 0.98 }));
  out.push(personCard("attend", ATTENDANT, { t, expr: "neutral", turn: 0.3, arms: ["fold", "fold"] }, [-1.15, 0, -2.2], { scale: 0.97 }));
  out.push(personCard("asker", OFFICER2, { t, view: "side", expr: "stern", turn: 0.2, arms: ["hang", "hang"] }, [1.25, 0, 0.75], { flip: true }));
  return { cards: out, fires, ground: (st) => {
    const m = st.ground("carpet", [12, 10], [0, 0, 0], () => paintTex(1024, 1024, (g) => {
      g.fillStyle = "#8a2a2a"; g.fillRect(0, 0, 1024, 1024); g.strokeStyle = "#e2b45a"; g.lineWidth = 18; g.strokeRect(120, 120, 784, 784); g.strokeStyle = "#1f5f66"; g.lineWidth = 30; g.strokeRect(170, 170, 684, 684);
      for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { g.fillStyle = (i + j) % 2 ? "#c8963a" : "#f3ecd8"; g.beginPath(); g.arc(230 + i * 52, 230 + j * 52, 8, 0, Math.PI * 2); g.fill(); }
    }), [1, 1, 1]);
    const mm = m.material as THREE.MeshBasicMaterial; mm.polygonOffset = true; mm.polygonOffsetFactor = 2; mm.polygonOffsetUnits = 2;
  } };
};

// ---------------- Meerut ----------------
const SEPOYS = Array.from({ length: 15 }, (_, i) => { const row = Math.floor(i / 5); return { P: sepoy(i), x: -4.2 + (i % 5) * 2.1 + (row % 2) * 1.05 + (hash(i, 2) - 0.5) * 0.2, z: -2.0 - row * 2.4, i }; });
const cantonment = (f: number): Built => {
  const t = f / FPS, out: Card[] = [], risen = f >= RISE_F, age = (f - RISE_F) / FPS;
  out.push(propCard("bar1", (p) => barracks(p, 1), 4000, 1100, 1100, 32, [0, 0, -30], { face: "fixed" }));
  out.push(propCard("bar2", (p) => barracks(p, 2), 4000, 1100, 1100, 26, [-30, 0, -14], { face: "fixed", yaw: 0.9 }));
  out.push(propCard("ctree1", (p) => peepal(p, 5), 1600, 1800, 1760, 10, [17, 0, -20]));
  out.push(propCard("ctree2", (p) => peepal(p, 6), 1600, 1800, 1760, 9, [-16, 0, -36]));
  out.push(propCard(`flag|${Math.round(t * 15)}`, (p) => flagstaff(p, t), 600, 2600, 2600, 2.3, [7, 0, -15]));
  for (let i = 0; i < 4; i++) out.push(propCard(`cfar${i}`, (p) => farVillage(p, i + 11, "#6a5a4a"), 3000, 500, 500, 50, [-75 + i * 50, 0, -70 - 8 * (i % 2)], { face: "fixed" }));
  out.push(propCard("ctree3", (p) => peepal(p, 7), 1600, 1800, 1760, 8, [-26, 0, -26]));
  const fires: FireLight[] = [];
  if (risen) {
    const k = smooth(age / 2.5);
    out.push(propCard(`ffire|${Math.round(t * 15)}`, (p) => farFire(p, t), 1200, 1600, 1600, 20 * (0.6 + 0.4 * k), [-4, 0, -36], { face: "fixed", glow: 1.1, opacity: k }));
    out.push(...kitSmoke(t - RISE_F / FPS, [-3, 8, -36], { rate: 2.5, life: 7, rise: 2.4, wind: 1.2, size: 7, dark: 0.55, fire: 0.5, seed: 8, spread: 4 }));
    out.push(...embers(t - RISE_F / FPS, [-4, 8, -34], { rate: 20, spread: 5, rise: 3, size: 0.25 }));
    out.push(propCard(`ffire2|${Math.round(t * 15)}`, (p) => farFire(p, t + 3), 1200, 1600, 1600, 12 * (0.5 + 0.5 * smooth((age - 1.2) / 2)), [14, 0, -50], { face: "fixed", glow: 1.1, opacity: smooth((age - 1.2) / 2) }));
    fires.push(fire([-4, 6, -32], 9, 1.4 * k, 16, "#ff8a3c"));
  }
  for (const s of SEPOYS) {
    const front = s.z > -3, run = risen && (s.i === 5 || s.i === 14) && age > 0.3, delay = hash(s.i, 7) * 0.25, up = risen && age > delay;
    if (run) {
      const dir = s.i === 5 ? -1 : 1, ra = age - 0.3;
      out.push(personCard(`sep${s.i}r`, s.P, { t, view: "side", gait: "run", phase: (ra / 0.62) % 1, turn: 0.3, expr: "shout", arms: ["swing", "raise"] }, [s.x + dir * 2.4 * ra, 0, s.z], { flip: dir < 0, extra: withMusket(true), extraKey: "mu" }));
      continue;
    }
    const pose: Pose = up
      ? { t, expr: s.i % 3 ? "shout" : "angry", turn: (hash(s.i, 3) - 0.5) * 0.5, arms: s.i % 2 ? ["raise", "hang"] : ["hang", "raise"], talk: [[RISE_F / FPS + delay, RISE_F / FPS + 3]] }
      : { t, expr: "stern", turn: 0, arms: ["hang", "hold"], idle: 0.4 };
    out.push(personCard(`sep${s.i}${up ? "u" : "s"}`, s.P, pose, [s.x, 0, s.z], { extra: (p, A) => { if (up) { const h = A.hands.reduce((a, b) => (b[1] < a[1] ? b : a)); musket(p, [h[0] - 30, h[1] + 20], -Math.PI / 2 - 0.3, 300); } else withMusket(false)(p, A); }, extraKey: up ? "mu" : "md" }));
    if (up && front && age < 1.2) out.push({ key: `cdust${s.i % 5}`, draw: (p) => dust(p, s.i % 5), dw: 400, dh: 260, w: 1.4 + age * 1.5, pos: [s.x, 0, s.z + 0.3], soft: true, opacity: 0.6 * (1 - age / 1.2), face: "camera" });
  }
  // the British adjutant, shocked (no weapons drawn, no gore)
  out.push(personCard("adj", OFFICER1, { t, expr: risen ? "surprised" : "stern", turn: 0.4, arms: risen ? ["shield", "hang"] : ["hips", "hang"] }, [-7.2, 0, -0.6]));
  if (risen) for (let i = 0; i < 6; i++) { const a2 = age - i * 0.15; if (a2 < 0) continue; out.push({ key: `bdust${i % 5}`, draw: (p) => dust(p, i % 5, "#d8b888"), dw: 400, dh: 260, w: 3 + a2 * 2, pos: [-6 + i * 2.4, 0, -6 - (i % 2)], soft: true, opacity: 0.45 * Math.max(0, 1 - a2 / 3), face: "camera" }); }
  return { cards: out, fires, ground: (st) => {
    const m = st.ground("parade", [80, 80], [0, 0, -20], () => paintTex(2048, 2048, paradePaint), [1, 1, 1]);
    const mm = m.material as THREE.MeshBasicMaterial; mm.polygonOffset = true; mm.polygonOffsetFactor = 2; mm.polygonOffsetUnits = 2;
    const o = st.ground("cfield", [1200, 1200], [0, -0.06, 0], () => paintTex(1024, 1024, fieldPaint, [50, 50]), [1.0, 0.92, 0.75]);
    const om = o.material as THREE.MeshBasicMaterial; om.polygonOffset = true; om.polygonOffsetFactor = 6; om.polygonOffsetUnits = 6;
  } };
};

// ---------------- the archive ----------------
const archive = (f: number): Built => {
  const t = f / FPS, out: Card[] = [], up = f >= 1503;
  out.push(propCard("awall", archiveWall, 4000, 2400, 2400, 8, [0, 0, -2.4], { face: "fixed" }));
  out.push(personCard("hist", HISTORIAN, { t, expr: up ? "neutral" : "neutral", turn: 0.2, arms: ["hold", "hang"], hold: ["letter", null], look: up ? [0.1, 0] : [0.3, 0.7], headTilt: up ? 0 : 8 }, HISTP));
  out.push(propCard(`atable|${Math.round(t * 30)}`, (p) => archiveTable(p, t), 1800, 1000, 1000, 1.9, [0.2, 0, -0.45], { face: "fixed" }));
  for (let i = 0; i < 6; i++) { const a = t * 0.15 + i; out.push({ key: "mote", draw: (p) => glowDot(p, "#fff0c8", "#fff8e8"), dw: 200, dh: 200, w: 0.05, pos: [-1.5 + i * 0.6 + 0.2 * Math.sin(a), 1.2 + 0.6 * ((a * 0.3 + hash(i, 1)) % 1), -1.2 + 0.3 * Math.cos(a)], centre: true, face: "camera", add: true, lit: false, glow: 0.8, maxPx: 32 }); }
  return { cards: out, fires: [fire([1.0, 1.15, -0.5], 4, 1.1, 2.0)], ground: (st) => {
    const m = st.ground("aboards", [12, 10], [0, 0, 0], () => paintTex(1024, 1024, (g) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#6a4628" : "#5e3e22"; g.fillRect(0, i * 64, 1024, 64); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(0, i * 64, 1024, 3); } }), [1, 1, 1]);
    const mm = m.material as THREE.MeshBasicMaterial; mm.polygonOffset = true; mm.polygonOffsetFactor = 2; mm.polygonOffsetUnits = 2;
  } };
};

// ---------------- the world ----------------
export class World {
  stage = new KitStage();
  root = this.stage.root;
  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, pxH: number) {
    const s = SHOTS[id - 1], c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const b = s.scene === "village" ? village(id, f, cam) : s.scene === "plain" ? plain(f, cam) : s.scene === "map" ? mapScene(id, f)
      : s.scene === "office" ? office(id, f) : s.scene === "palace" ? palace(f) : s.scene === "cantonment" ? cantonment(f) : archive(f);
    const base = LIGHTING[s.light as Light];
    const L: Lighting = { ...base, fires: b.fires, ...(b.fog ? { fogNear: b.fog[0], fogFar: b.fog[1] } : {}) };
    this.stage.hideGrounds(); b.ground(this.stage);
    this.stage.showStars(s.light === "night", 0.8);
    this.stage.frame(b.cards, L, cam, f / FPS, pxH, scene);
  }
}
void rgba;
