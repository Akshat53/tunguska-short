// KitShowcase scenes: six short demos of the visual kit (src/engine/kit). Each scene = a camera (pure function of the
// local frame), a lighting + grade preset, an optional ground / water, and the list of cards for that frame.
import * as THREE from "three";
import { KPen, hash, smooth, lerp, PAL, curve } from "../../engine/kit/core";
import { Pose, Person } from "../../engine/kit/people";
import { chowkidar, britishOfficer, firefighter, dockWorker, villageWoman, villager, elder } from "../../engine/kit/wardrobe";
import { makeCrowd, crowdCards, personCard, personAnchors, Member } from "../../engine/kit/crowd";
import { hut, peepal, well, charpai, chulha, lanternPost, bullockCart, haystack, pots, treeline, farVillage, villageGround } from "../../engine/kit/village";
import { ship, crane, cargo, bollard, colonial, clockTower, godown, gasLamp, skyline, quayGround } from "../../engine/kit/dock";
import { embers, sparks, fireflies, smoke, goldRain, debris, waterJet, shaft, fireCard, glowCard, moonCard, blastCard, dust } from "../../engine/kit/fx";
import { NIGHT, BOMBAY_DAY, DOCK_FIRE, GRADE_NIGHT, GRADE_HAZE, GRADE_FIRE, KitGrade } from "../../engine/kit/looks";
import { KitStage, Card, Lighting, V3, paintTex, FireLight } from "../../engine/kit/stage";

export const FPS = 30;
export type Cam = { pos: V3; look: V3; fov: number };
export type Scene = { id: string; len: number; cam: (f: number) => Cam; light: (t: number) => Lighting; grade: KitGrade; build: (st: KitStage, f: number, t: number, cam: Cam) => Card[] };

/** a prop drawing standing on the ground: design (dw x dh) with its base line at baseY; w metres wide */
const standee = (key: string, draw: (p: KPen) => unknown, dw: number, dh: number, baseY: number, w: number, pos: V3, extra: Partial<Card> = {}): Card => {
  const h = (w * dh) / dw;
  return { key, draw, dw, dh, w, pos: [pos[0], pos[1] - ((dh - baseY) / dh) * h, pos[2]], face: "fixed", yaw: 0, maxPx: 2048, ...extra };
};
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------------- 1. village at night: crowd round a fire, huts, peepal, well, lanterns, fireflies ----------------
const VFIRE: V3 = [0.2, 0, -1.0];
const villageCrowd = makeCrowd({
  n: 13, centre: [0.1, 0, -3.0], size: [5.6, 2.4], seed: 11, minGap: 0.8, focus: VFIRE,
  mix: [["villager", 5], ["villageWoman", 3], ["elder", 1.5], ["child", 1.5], ["chowkidar", 0.6]],
  gestures: [["hang", 5], ["fold", 1.5], ["hips", 1], ["carry", 1], ["point", 0.4], ["beckon", 0.4]],
  exprs: ["neutral", "smile", "worried", "neutral", "awe"], props: [["chapati", 1], ["lantern", 0.6], ["lathi", 0.5], ["pot", 0.3]], talkers: 4,
});
const villageFires = (): FireLight[] => [
  { pos: [VFIRE[0], 0.7, VFIRE[2]], col: "#ff9a3c", power: 0.85, radius: 3.0, seed: 1 },
  { pos: [-2.4, 2.0, -2.5], col: "#ffc46a", power: 0.35, radius: 1.6, seed: 2 },
  { pos: [3.0, 2.0, -4.5], col: "#ffc46a", power: 0.35, radius: 1.6, seed: 3 },
  { pos: [-1.2, 1.0, -12], col: "#ffb24a", power: 0.4, radius: 2.5, seed: 4 },
];
let vgTex: THREE.Texture | null = null;
const villageSet = (st: KitStage, t: number): Card[] => {
  st.ground("village", [90, 90], [0, 0, -20], () => (vgTex ??= paintTex(2048, 2048, (g) => villageGround(g, 3))), [0.5, 0.58, 0.64]);
  const c: Card[] = [
    moonCard([-22, 52, -150], 13),
    standee("treeline", (p) => treeline(p, 2), 4000, 600, 600, 150, [0, 0, -60], { lit: true, tintMul: [0.7, 0.8, 0.85] }),
    standee("farvillage", (p) => farVillage(p, 5), 3000, 500, 500, 50, [5, 0, -38], { tintMul: [0.8, 0.85, 0.9] }),
    standee("hutA", (p) => hut(p, 1, 1), 1000, 820, 800, 6.2, [-3.6, 0, -8.5]),
    standee("hutB", (p) => hut(p, 2, 0.8), 1000, 820, 800, 6.6, [7.5, 0, -15]),
    standee("hutC", (p) => hut(p, 3, 1), 1000, 820, 800, 6.0, [2.2, 0, -14]),
    standee("hutD", (p) => hut(p, 4, 0.6), 1000, 820, 800, 6, [-9, 0, -18]),
    standee("peepal", (p) => peepal(p, 7), 1600, 1800, 1760, 12, [5.2, 0, -8.5]),
    standee("well", (p) => well(p, 2), 700, 760, 740, 2.0, [-2.3, 0, 1.6]),
    standee("charpai", (p) => charpai(p, 3), 900, 420, 400, 2.2, [2.5, 0, 1.2]),
    standee("lanternA", (p) => lanternPost(p, 1), 300, 1100, 1080, 0.75, [-2.6, 0, -2.5]),
    standee("lanternB", (p) => lanternPost(p, 2), 300, 1100, 1080, 0.75, [2.8, 0, -4.5]),
    standee("haystack", (p) => haystack(p, 4), 600, 520, 500, 3.0, [-6.5, 0, -6]),
    standee("cart", (p) => bullockCart(p, 5), 1700, 900, 880, 5.6, [-7, 0, -12]),
    standee("pots", (p) => pots(p, 6), 500, 300, 290, 1.2, [-1.6, 0, -7.6]),
    standee("chulha", (p) => chulha(p, 1), 500, 360, 340, 1.0, [1.2, 0, -7.6]),
    fireCard("chulha", t + 0.4, [1.2, 0.0, -7.55], 0.4, { logs: false, seed: 4, glow: 1.5 }),
    fireCard("bon", t, [VFIRE[0], 0, VFIRE[2]], 1.5),
    glowCard("bonpool", [VFIRE[0], 0.03, VFIRE[2]], 7, "#ff8a3c", 0.55, true),
    glowCard("bonhalo", [VFIRE[0], 0.9, VFIRE[2] + 0.1], 3.2, "#ff9a3c", 0.5),
    glowCard("lampA", [-2.45, 2.0, -2.45], 0.9, "#ffc46a", 0.7), glowCard("lampB", [2.95, 2.0, -4.45], 0.9, "#ffc46a", 0.7),
    ...embers(t, [VFIRE[0], 0.8, VFIRE[2]], { rate: 16, seed: 3 }),
    ...fireflies(t, [3, 1.0, -6], [6, 4, 6], 26, 4), ...fireflies(t, [-3, 0.6, -4], [5, 2.5, 5], 16, 5),
  ];
  return c;
};

// ---------------- scenes ----------------
const runner = chowkidar(21), runner2 = chowkidar(37);
const officer = britishOfficer(31, true), official = britishOfficer(32, false), messenger = chowkidar(33);
const ffs = [firefighter(41), firefighter(42), firefighter(43)];

const dockCrowd = makeCrowd({ n: 14, centre: [0.5, 0, -1.5], size: [8, 7], seed: 51, minGap: 1.0, mix: [["dockWorker", 6], ["citizen", 2], ["cityWoman", 1]],
  gestures: [["hang", 4], ["carry", 1], ["hips", 1], ["point", 1], ["shield", 0.5]], exprs: ["neutral", "worried", "surprised", "neutral"], props: [["bundle", 1], ["bucket", 1]], talkers: 3, focus: [0, 0, -12] });
const goldCrowd = makeCrowd({ n: 9, centre: [0, 0, -1.6], size: [6, 3], seed: 61, minGap: 1.0, mix: [["dockWorker", 4], ["citizen", 2], ["cityWoman", 1], ["firefighter", 1]],
  gestures: [["reach", 2], ["shield", 1.5], ["raise", 1], ["cover", 1], ["hang", 1]], exprs: ["surprised", "awe", "scared", "surprised"] });

let qTex: THREE.Texture | null = null;
const SHIP_Z = -32, SHIP_W = 62, SHIP_X = 2;
/** world position of a point of the ship drawing (design x, y) */
const shipAt = (dx: number, dy: number, dz = 0.4): V3 => { const h = (SHIP_W * 1500) / 4200; return [SHIP_X + (dx / 4200 - 0.5) * SHIP_W, ((1300 - dy) / 1500) * h, SHIP_Z + dz]; };
const dockSet = (st: KitStage, t: number, burning: number): Card[] => {
  st.ground("quay", [90, 50], [0, 0, 1], () => (qTex ??= paintTex(2048, 2048, (g) => quayGround(g, 2))), burning ? [0.82, 0.7, 0.62] : [1, 0.98, 0.92], 0);
  st.setWater([0, 0, -124], [500, 200]);
  return [
    standee("skyline", (p) => skyline(p, 3, burning ? "#8a6a5a" : "#93aeb0"), 5000, 900, 900, 300, [0, 0, -230], { lit: false }),
    standee("colonialA", (p) => colonial(p, 1, 0), 2400, 1700, 1690, 42, [-34, 0, -95], { reflect: true }),
    standee("colonialB", (p) => colonial(p, 2, 0), 2400, 1700, 1690, 38, [30, 0, -105], { reflect: true }),
    standee("clock", (p) => clockTower(p, 1), 900, 3200, 3180, 11, [10, 0, -88], { reflect: true }),
    standee("godown", (p) => godown(p, 1), 2000, 1100, 1090, 26, [-8, 0, -70], { reflect: true }),
    standee("ship", (p) => ship(p, 4, burning > 0), 4200, 1500, 1300, SHIP_W, [SHIP_X, 0, SHIP_Z], { reflect: true, maxPx: 2048 }),
    standee("craneA", (p) => crane(p, 1, 58), 1400, 2800, 2780, 9, [-7, 0, -22]),
    standee("craneB", (p) => crane(p, 2, 48, "#c9783a"), 1400, 2800, 2780, 9, [11, 0, -22.5]),
    standee("cargo0", (p) => cargo(p, 0), 900, 700, 690, 3.4, [-4.2, 0, -12]),
    standee("cargo1", (p) => cargo(p, 1), 900, 700, 690, 3.6, [5.5, 0, -9]),
    standee("cargo2", (p) => cargo(p, 2), 900, 700, 690, 3.0, [-6.5, 0, -4]),
    standee("cargo3", (p) => cargo(p, 3), 900, 700, 690, 3.4, [2.5, 0, -17]),
    standee("bollard", (p) => bollard(p, 1), 400, 360, 350, 1.0, [1.5, 0, -23.2]),
    standee("bollard2", (p) => bollard(p, 2), 400, 360, 350, 1.0, [-4, 0, -23.2]),
    standee("lamp", (p) => gasLamp(p, 1), 200, 1100, 1090, 1.0, [6.5, 0, -2.5]),
  ];
};

export const SCENES: Scene[] = [
  {
    id: "village", len: 120, grade: GRADE_NIGHT, light: () => NIGHT(villageFires()),
    cam: (f) => { const k = smooth(f / 120); return { pos: lerp3([0.5, 2.1, 10.5], [0.1, 1.8, 7.8], k), look: lerp3([0, 2.6, -4], [0, 2.4, -4], k), fov: 42 }; },
    build: (st, f, t, cam) => { st.showStars(true); return [...villageSet(st, t), ...crowdCards(villageCrowd, t, cam.pos, 16)]; },
  },
  {
    id: "runner", len: 90, grade: GRADE_NIGHT,
    light: (t) => NIGHT([{ pos: [1.2 + 4.2 * t + 0.4, 2.3, 0.1], col: "#ff9a3c", power: 0.8, radius: 2.2, seed: 5 }, ...[-6, 6, 18].map((x, i) => ({ pos: [x, 1.0, -9] as V3, col: "#ffb24a", power: 0.4, radius: 2.5, seed: 6 + i }))]),
    cam: (f) => { const x = 1.2 + 4.2 * (f / FPS); return { pos: [x + 0.6, 1.35, 6.2], look: [x + 0.9, 1.2, 0], fov: 38 }; },
    build: (st, f, t) => {
      st.showStars(true);
      st.ground("village", [90, 90], [10, 0, -20], () => (vgTex ??= paintTex(2048, 2048, (g) => villageGround(g, 3))), [0.5, 0.58, 0.64]);
      const x = 1.2 + 4.2 * t, c: Card[] = [moonCard([40, 30, -150], 12),
        standee("treeline", (p) => treeline(p, 2), 4000, 600, 600, 150, [10, 0, -60], { tintMul: [0.7, 0.8, 0.85] }),
        standee("farvillage", (p) => farVillage(p, 5), 3000, 500, 500, 50, [10, 0, -34], { tintMul: [0.8, 0.85, 0.9] })];
      for (let i = 0; i < 7; i++) c.push(standee("hut" + (i % 4), (p) => hut(p, 1 + (i % 4), i % 2 ? 1 : 0.7), 1000, 820, 800, 6 + (i % 3) * 0.6, [-12 + i * 7.5, 0, -9 - (i % 2) * 2.5]));
      c.push(standee("peepal", (p) => peepal(p, 7), 1600, 1800, 1760, 12, [9, 0, -16]), standee("haystack", (p) => haystack(p, 4), 600, 520, 500, 2.6, [4, 0, -4]),
        standee("lanternA", (p) => lanternPost(p, 1), 300, 1100, 1080, 0.75, [13, 0, -2.5]), standee("well", (p) => well(p, 2), 700, 760, 740, 2.2, [-3, 0, -4]),
        standee("cart", (p) => bullockCart(p, 5), 1700, 900, 880, 5.4, [20, 0, -5]));
      // the runner: side view, run cycle, chapatis wrapped in cloth + a torch in the far hand
      const pose: Pose = { view: "side", gait: "run", phase: (t * 1.5) % 1, turn: 0.45, expr: "determined", arms: ["hold", "carry"], hold: ["torch", "chapatis"], t, talk: [[1.6, 2.6]] };
      c.push(personCard("runner", runner, pose, [x, 0, 0.2], { rim: true }));
      for (const g of personAnchors(runner, pose, [x, 0, 0.2]).glows) c.push(glowCard("torch", g.pos, 0.9, "#ff9a3c", 0.6), ...embers(t, g.pos, { rate: 12, rise: 0.5, spread: 0.12, seed: 9, size: 0.045 }));
      // the next watchman waiting at the edge of his village, lantern raised
      c.push(personCard("waiting", runner2, { expr: "smile", turn: -0.35, arms: ["hold", "wave"], hold: ["lantern", null], t }, [15.5, 0, -0.6], { rim: true }));
      for (const g of personAnchors(runner2, { expr: "smile", turn: -0.35, arms: ["hold", "wave"], hold: ["lantern", null], t }, [15.5, 0, -0.6]).glows) c.push(glowCard("lampW", g.pos, 1.0, "#ffc46a", 0.7));
      c.push(...fireflies(t, [x + 2, 0.5, -3], [14, 2.5, 6], 30, 7), ...dust(t, [x + 1, 0.6, 0.2], [8, 0.6, 2], 0, 2));
      // foreground grass tufts racing past (parallax)
      for (let i = 0; i < 14; i++) c.push(standee("tuft" + (i % 3), (p) => tuft(p, i % 3), 300, 200, 195, 0.55, [-4 + i * 2.6 + hash(i, 3), 0, 2.6 + hash(i, 4) * 0.8], { tintMul: [0.75, 0.85, 0.9] }));
      return c;
    },
  },
  {
    id: "officer", len: 90, grade: GRADE_NIGHT,
    light: () => NIGHT([{ pos: [-1.3, 1.3, 0.6], col: "#ffc46a", power: 1.0, radius: 1.8, seed: 8 }]),
    cam: (f) => { const k = smooth(f / 90); return { pos: lerp3([0.2, 1.7, 4.8], [0.1, 1.68, 3.9], k), look: [0.1, 1.75, 0], fov: 36 }; },
    build: (st, f, t) => {
      st.showStars(true);
      st.ground("village", [90, 90], [0, 0, -20], () => (vgTex ??= paintTex(2048, 2048, (g) => villageGround(g, 3))), [0.5, 0.58, 0.64]);
      const surprised = f >= 22, talk: [number, number][] = [[1.6, 2.9]];
      const c: Card[] = [
        standee("bungalow", (p) => colonial(p, 3, 1), 2400, 1700, 1690, 24, [-2, 0, -15]),
        standee("treeline", (p) => treeline(p, 2), 4000, 600, 600, 150, [0, 0, -60], { tintMul: [0.7, 0.8, 0.85] }),
        standee("lanternA", (p) => lanternPost(p, 1), 300, 1100, 1080, 0.75, [-1.55, 0, 0.4]),
        glowCard("lampO", [-1.35, 1.3, 0.45], 1.5, "#ffc46a", 1.0),
        personCard("officer", officer, { expr: surprised ? (t > 1.6 ? "stern" : "surprised") : "neutral", turn: -0.15, arms: ["carry", surprised ? "point" : "hang"], hold: ["chapati", null], t, talk, headTilt: surprised && t < 1.6 ? -4 : 0 }, [0.25, 0, 0], { rim: true }),
        personCard("official", official, { expr: "worried", turn: -0.35, arms: ["fold", "fold"], t: t + 3 }, [0.95, 0, -1.6], { rim: true }),
        personCard("messenger", messenger, { expr: "neutral", turn: 0.35, arms: ["hold", "hang"], hold: ["lathi", null], t: t + 7 }, [-0.75, 0, -1.4], { rim: true }),
        ...fireflies(t, [0, 0.8, -3], [8, 2, 4], 14, 9),
      ];
      return c;
    },
  },
  {
    id: "dock", len: 120, grade: GRADE_HAZE, light: () => BOMBAY_DAY(),
    cam: (f) => { const k = smooth(f / 120); return { pos: lerp3([2.0, 4.2, 14], [1.0, 3.8, 11.5], k), look: lerp3([0, 7.5, -30], [-1, 7.2, -30], k), fov: 46 }; },
    build: (st, f, t, cam) => {
      st.showStars(false);
      return [...dockSet(st, t, 0), ...smoke(t + 6, shipAt(1050, 760, 0.6), { rate: 2.2, life: 9, rise: 1.6, wind: 0.6, size: 4, dark: 0.35, seed: 4 }),
        ...crowdCards(dockCrowd, t, cam.pos, 16), ...dust(t, [0, 2, 2], [14, 4, 6], 30, 5, "#fff6e0")];
    },
  },
  {
    id: "firefighters", len: 90, grade: GRADE_FIRE,
    light: () => DOCK_FIRE([{ pos: shipAt(1300, 700, 3), col: "#ff8a3c", power: 1.4, radius: 14, seed: 11 }, { pos: [0, 3, -6], col: "#ff9a3c", power: 0.6, radius: 8, seed: 12 }]),
    cam: (f) => { const k = smooth(f / 90); return { pos: lerp3([2.4, 1.9, 6.4], [2.0, 1.9, 5.4], k), look: lerp3([-3.2, 4.2, -20], [-3.6, 4.6, -20], k), fov: 46 }; },
    build: (st, f, t, cam) => {
      st.showStars(false);
      const c: Card[] = [...dockSet(st, t, 1)];
      for (const [dx, s2] of [[850, 9], [1150, 7], [1450, 10], [1750, 6]] as [number, number][]) { const P = shipAt(dx, 900, 0.8); c.push(fireCard("ship" + dx, t + dx * 0.001, P, s2, { logs: false, seed: dx, glow: 2.1 }), ...embers(t, [P[0], P[1] + 3, P[2] + 0.2], { rate: 9, spread: 4, rise: 3, seed: dx, size: 0.22 })); }
      c.push(...smoke(t + 8, shipAt(1200, 700, 1), { rate: 3.5, life: 9, rise: 2.4, wind: 0.9, size: 12, dark: 0.72, fire: 0.85, seed: 7, spread: 16 }));
      c.push(shaft("a", [-4, 26, -18], 6, 26, 0.3, 0.3), shaft("b", [6, 26, -16], 4, 24, 0.18, 0.22));
      ffs.forEach((P, i) => {
        const x = 0.5 + i * 0.95, z = 0.6 - i * 1.3;
        const pose: Pose = { expr: i === 0 ? "shout" : "determined", turn: -0.3, arms: ["hose", "hose"], hold: [null, "nozzle"], t: t + i * 2.3, talk: i === 0 ? [[0.5, 1.7]] : undefined };
        c.push(personCard("ff" + i, P, pose, [x, 0, z], { rim: true, flip: true }));
        // the jet leaves the nozzle tip (from the drawing's anchors) and arcs left / back toward the burning deck
        const tip = personAnchors(P, pose, [x, 0, z], { flip: true }).glows.find((g) => g.col === "nozzle");
        if (tip) {
          // aim along the view ray through the nozzle, swung ~14 deg left: the stream reads as leaving the nozzle and arcing up-left onto the fire
          const rx = tip.pos[0] - cam.pos[0], rz = tip.pos[2] - cam.pos[2], l = Math.hypot(rx, rz), a = Math.atan2(rz / l, rx / l) - 0.25;
          c.push(...waterJet(t + i * 0.37, tip.pos, [Math.cos(a), Math.sin(a)], { speed: 18, pitch: 0.62, seed: 50 + i, len: 2.0, stopZ: SHIP_Z + 0.6 }));
        }
      });
      c.push(...sparks(t, shipAt(1300, 860, 1), { rate: 30, speed: 6, seed: 13 }));
      return c;
    },
  },
  {
    id: "gold", len: 120, grade: GRADE_FIRE,
    light: (t) => DOCK_FIRE([{ pos: shipAt(1300, 800, 2), col: "#ffb24a", power: t < 0.8 ? 2.5 * (1 - t / 0.8) + 1.2 : 1.2, radius: 30, seed: 15 }]),
    cam: (f) => { const k = smooth(f / 120); return { pos: lerp3([0.4, 1.3, 7.6], [0.1, 1.1, 6.4], k), look: lerp3([0, 2.4, 0], [0, 2.8, 0], k), fov: 44 }; },
    build: (st, f, t, cam) => {
      st.showStars(false);
      const c: Card[] = [...dockSet(st, t, 1)];
      const B = shipAt(1300, 800, 2);
      if (t < 1.4) c.push(blastCard(B, 60, t / 1.4));
      c.push(...smoke(t + 10, B, { rate: 4, life: 9, rise: 3.5, wind: 0.4, size: 16, dark: 0.75, fire: 0.6, seed: 17, spread: 22 }));
      c.push(...debris(t, [0, 4, -6], { t0: 0.1, n: 26, speed: 7, seed: 3 }), ...sparks(t, [0, 5, -8], { t0: 0.05, n: 60, speed: 8, seed: 4 }));
      c.push(...goldRain(t, [0.2, -1, 1.2], [4.5, 2.5], { n: 46, t0: -0.8, dur: 4.6, groundY: 0, seed: 6, scale: 1.2, g: 1.4 }));
      c.push(...crowdCards(goldCrowd, t, cam.pos, 14), ...embers(t, [0, 3, -2], { rate: 14, spread: 10, rise: 0.4, seed: 21, size: 0.09 }));
      return c;
    },
  },
];
export const TOTAL = SCENES.reduce((a, s) => a + s.len, 0);
export const sceneAt = (f: number) => { let a = 0; for (const s of SCENES) { if (f < a + s.len) return { s, lf: f - a }; a += s.len; } const s = SCENES[SCENES.length - 1]; return { s, lf: s.len - 1 }; };

/** a small grass tuft for foreground parallax: 300 x 200, base 195 */
const tuft = (p: KPen, k: number) => {
  p.ow = 4;
  for (let i = 0; i < 11; i++) { const x = 50 + i * 20 + hash(i, k) * 10, h = 60 + hash(i, k + 3) * 90, lean = (hash(i, k + 5) - 0.5) * 90; p.poly([[x - 7, 195], ...curve([x - 7, 195], [x + lean * 0.4, 195 - h * 0.6], [x + lean, 195 - h], 6).slice(1), ...curve([x + lean, 195 - h], [x + lean * 0.4 + 6, 195 - h * 0.55], [x + 7, 195], 6).slice(1)], i % 2 ? "#3f6f4a" : "#5a8a52"); }
};
void PAL; void villager; void villageWoman; void elder; void dockWorker; void (null as unknown as Person); void (null as unknown as Member);
