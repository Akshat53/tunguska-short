// The sets of "The Dancing Plague of 1518" on the kit card stage (src/engine/kit/stage.ts). Every set is built at the origin
// and only the current shot's cards are posed, so sets never see each other. update(id, f, camera) is a pure function of (id, f):
//  square   the Horse Market in Strasbourg: half-timbered gabled houses on three sides, the cathedral spire far beyond, the
//           wooden dance stage with bunting and musicians, a fountain, market stalls, barrels, a cart; a crowd of dancers
//           (seeded positions, seeded dances); the physician + councillors by the town hall; the teal ripple of shots 16-19.
//  lane     a narrow street of houses: the first dancer alone, her husband and neighbours in doorways; joiners stream in.
//  archive  a candlelit desk: the later chronicle ("15 a day?") and the city records ("Deaths: none mentioned").
//  field    the famine: dry furrows, a dead tree, crows, an empty cart, a thin family, the walled city far away.
//  chapel   stone wall, stained glass, the statue of St Vitus on a plinth, the altar and candles, frightened kneelers.
import * as THREE from "three";
import { KitStage, paintTex, type Card, type Lighting, type FireLight, type V3 } from "../../engine/kit/stage";
import { hash, noise1 } from "../../engine/kit/core";
import type { Pose, Gesture } from "../../engine/kit/people";
import { dust, shaft } from "../../engine/kit/fx";
import {
  FPS, SHOTS, camAt, clamp01, smooth, easeOut, hookT, rippleR, danceStart, RIPPLE, type Light,
  BACK_Z, SIDE_X, STAGE, TOWNHALL_X, DOCTOR, COUNCIL1, COUNCIL2, HERO1, HERO2, HERO3, FACE1, FACE2, FALLEN, FRIEND1, FRIEND2, TIRED, BYSTANDER, ROW,
  LANE_Z, WOMAN, HUSBAND, JOINERS, joinF, DESK_Y, BOOK1, BOOK2, SCRIBE, MOTHER, PLINTH_H, STATUE,
} from "./story";
import { LIGHTING } from "./lights";
import {
  halfTimber, cathedral, stageFront, stageTop, fountain, stall, barrels, cart, bunting, innSign, cobblePaint, fieldPaint, slabPaint, boardPaint,
  archiveWall, deskFront, lecternBook, candle, deadTree, crow, cityFar, chapelWall, plinth, altar, glowDot, ring, dustPuff,
} from "./art";
import {
  dancer, townsman, townswoman, youth, FIRST, HUSB, PHYSICIAN, COUNCIL_A, COUNCIL_B, DRUMMER, PIPER, HORNIST, CARPENTER, SCRIBE_P, PRIEST, MOTHER_P, CHILD_P,
  OLDMAN_P, VITUS, BYST, X, dance, sweatX, personCard, propCard, type Dressed,
} from "./cast";

type Built = { cards: Card[]; fires: FireLight[]; ground: (st: KitStage, amb: [number, number, number]) => void; amb?: [number, number, number]; fog?: [number, number] };
const fire = (pos: V3, seed: number, power = 0.8, radius = 2.2, col = "#ffad55"): FireLight => ({ pos, col, power, radius, seed });
const offset = (m: THREE.Mesh, k = 2) => { const mat = m.material as THREE.MeshBasicMaterial; mat.polygonOffset = true; mat.polygonOffsetFactor = k; mat.polygonOffsetUnits = k; };
const d2 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[2] - b[2]);

// ---------------- the square ----------------
const HOUSE_W = 6.6;
const squareStatic = (): Card[] => {
  const out: Card[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -26.4 + i * HOUSE_W, s = 11 + i, th = Math.abs(x - TOWNHALL_X) < 3.4;
    out.push(propCard(`hb${i}`, (p) => halfTimber(p, th ? 40 : s), 1000, 1800, 1780, th ? 7.6 : HOUSE_W + 0.1, [th ? TOWNHALL_X : x, 0, BACK_Z + (i % 2) * 0.25], { face: "fixed" }));
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    const z = -12.6 + i * HOUSE_W;
    out.push(propCard(`hs${sx}${i}`, (p) => halfTimber(p, 30 + i * 2 + (sx > 0 ? 1 : 0)), 1000, 1800, 1780, HOUSE_W + 0.1, [sx * (SIDE_X + (i % 2) * 0.25), 0, z], { face: "fixed", yaw: -sx * Math.PI / 2 }));
    if (i % 2 === 0) out.push({ key: `sign${sx}${i}`, draw: (p) => innSign(p, i + (sx > 0 ? 1 : 0)), dw: 500, dh: 500, w: 1.3, pos: [sx * (SIDE_X - 0.7), 3.3, z + 1.6], centre: true, face: "fixed", yaw: -sx * Math.PI / 2 });
  }
  out.push(propCard("cath", cathedral, 900, 2400, 2380, 34, [10, 0, -150], { face: "fixed", maxPx: 2048 }));
  out.push(propCard("stageF", stageFront, 1600, 900, 890, STAGE.w, [STAGE.x, 0, STAGE.z + STAGE.depth / 2], { face: "fixed" }));
  out.push({ key: "stageT", draw: stageTop, dw: 1600, dh: 580, w: STAGE.w, pos: [STAGE.x, STAGE.top, STAGE.z], face: "flat" });
  out.push(propCard("fount", fountain, 800, 1000, 990, 2.5, [8.2, 0, -4.2]));
  out.push(propCard("stallA", (p) => stall(p, 3), 1000, 900, 890, 3.3, [-12.3, 0, -9.6], { face: "fixed", yaw: 0.35 }));
  out.push(propCard("stallB", (p) => stall(p, 6), 1000, 900, 890, 3.3, [12.4, 0, -10.4], { face: "fixed", yaw: -0.35 }));
  out.push(propCard("barr", (p) => barrels(p, 1), 600, 500, 490, 1.7, [-13.3, 0, -4.0]));
  out.push(propCard("cart", (p) => cart(p, true), 1100, 650, 640, 2.7, [13.0, 0, 1.5], { face: "fixed", yaw: -0.5 }));
  out.push({ key: "bunt1", draw: (p) => bunting(p, 0), dw: 2000, dh: 300, w: 31, pos: [0, 6.6, -12.5], face: "fixed", maxPx: 1024 });
  out.push({ key: "bunt2", draw: (p) => bunting(p, 2), dw: 2000, dh: 300, w: 31, pos: [0, 7.4, -3.5], face: "fixed", maxPx: 1024 });
  return out;
};
const SQUARE_STATIC = squareStatic();

/** fixed "special" people of the square (they are excluded from the random crowd) */
const SPECIAL: V3[] = [HERO1, HERO2, HERO3, FACE1, FACE2, FALLEN, FRIEND1, FRIEND2, TIRED, BYSTANDER, ...ROW, RIPPLE[16].o];
type Member = { at: V3; D: Dressed; seed: number };
const crowdOf = (n: number, seed: number, box: [number, number, number, number], minGap: number, avoid: V3[]): Member[] => {
  const out: Member[] = [];
  for (let i = 0, tries = 0; out.length < n && tries < n * 30; tries++, i++) {
    const at: V3 = [box[0] + (box[1] - box[0]) * hash(i, seed), 0, box[2] + (box[3] - box[2]) * hash(i, seed + 1)];
    if (at[0] < -7.4 && at[2] < -9.4) continue;                                    // the physician's corner by the town hall
    if (Math.abs(at[0] - STAGE.x) < STAGE.w / 2 + 0.4 && at[2] < STAGE.z + STAGE.depth / 2 + 0.4) continue; // the stage
    if (d2(at, [8.2, 0, -4.2]) < 1.9 || d2(at, [13, 0, 1.5]) < 1.9 || d2(at, [-13.3, 0, -4]) < 1.4) continue;
    if ([...avoid, ...out.map((m) => m.at)].some((p) => d2(p, at) < minGap)) continue;
    const s = seed * 100 + i;
    out.push({ at, D: dancer(s), seed: s });
  }
  return out;
};
const CROWD = crowdOf(78, 7, [-12.6, 12.6, -12.4, 8.6], 1.25, SPECIAL);
const CROWD_MORE = crowdOf(46, 9, [-13.2, 13.2, -12.6, 10.5], 1.0, [...SPECIAL, ...CROWD.map((m) => m.at)]);
const SPECIALS: Member[] = [
  { at: HERO1, D: townswoman(501), seed: 501 }, { at: HERO2, D: townsman(502), seed: 502 }, { at: HERO3, D: townswoman(503), seed: 503 },
  { at: FACE1, D: townswoman(504), seed: 504 }, { at: FACE2, D: townsman(505), seed: 505 }, { at: TIRED, D: townsman(506), seed: 506 },
  ...ROW.map((at, i) => ({ at, D: i % 2 ? townsman(520 + i) : townswoman(520 + i), seed: 520 + i })),
  { at: RIPPLE[16].o, D: townswoman(530), seed: 530 },
];
/** the still pose of a person who has not caught the dance yet */
const stillPose = (t: number, seed: number, id: number): Pose => {
  const a = hash(seed, 31);
  const arms: [Gesture, Gesture][] = [["cover", "hang"], ["hang", "cup"], ["shield", "cover"], ["reach", "hang"], ["cup", "cup"], ["hang", "shield"]];
  return { t, expr: a < 0.5 ? "worried" : "surprised", arms: arms[Math.floor(hash(seed, 32) * arms.length)], headTilt: 8 * Math.sin(t * 2 + seed),
    turn: 0.4 * Math.sin(seed + t * 0.6), look: id === 16 ? [0, 0.4] : "idle" };
};
/** a dancer card (or the still pose before the ripple reaches them) */
/** shots where specific people are the subject: everyone else nearer the camera than them is left out (no cut-off foreground bodies) */
const HERO_SHOTS: Record<number, V3[]> = { 1: [HERO1, HERO2, HERO3], 3: [FACE1, FACE2], 10: [FALLEN], 13: [TIRED], 17: ROW, 18: [BYSTANDER], 19: [HERO1] };
const memberCard = (out: Card[], id: number, f: number, m: Member, energy: number, cam: THREE.PerspectiveCamera, name: string) => {
  const dc = Math.hypot(cam.position.x - m.at[0], cam.position.z - m.at[2]);
  const feetCam = cam.position.y < 0.8;
  if (dc < (feetCam ? 0.5 : 1.6) && cam.position.y < 3) return;
  const heroes = HERO_SHOTS[id], isHero = !!heroes && heroes.includes(m.at);
  if (heroes && !isHero && cam.position.y < 3 && !feetCam) {
    const near = Math.min(...heroes.map((h) => Math.hypot(cam.position.x - h[0], cam.position.z - h[2])));
    if (dc < near + 0.9) return;
  }
  const close = isHero && id !== 17;
  if ((id === 1 || id === 19) && m.at === HERO1) energy = 1.3;
  const t = id === 1 || id === 19 ? hookT(id, f) : f / FPS, f0 = danceStart(id, m.at);
  if (f < f0) { out.push(personCard(name, m.D, stillPose(t, m.seed, id), m.at)); return; }
  const e = energy * (f0 === -Infinity ? 1 : smooth((f - f0) / 12));
  const d = dance(t, m.seed, e, close);
  const tq = Math.round(t * 15) / 15, sweaty = d.sweat > 0.6 && (close || hash(m.seed, 12) < 0.45);
  out.push(personCard(name, m.D, d.pose, [m.at[0], d.hop, m.at[2]], { rot: d.tilt, flip: d.flip, ...(sweaty ? { extra: sweatX(tq, m.seed), extraKey: `sw${tq}` } : {}) }));
  if (f0 !== -Infinity && f - f0 < 14) out.push({ key: "rglow", draw: (p) => glowDot(p, "#5fe0c8", "#5fe0c8"), dw: 200, dh: 200, w: 1.5 * (1 - (f - f0) / 14), pos: [m.at[0], 0.03, m.at[2]], face: "flat", add: true, lit: false, glow: 1.2, maxPx: 128 });
};
const squareGround = (st: KitStage, amb: [number, number, number]) => {
  offset(st.ground("cobble", [160, 160], [0, 0, -20], () => paintTex(1024, 1024, cobblePaint, [48, 48]), amb));
};

const square = (id: number, f: number, cam: THREE.PerspectiveCamera, light: Light): Built => {
  const t = f / FPS, out: Card[] = [...SQUARE_STATIC], fires: FireLight[] = [];
  const energy = id === 10 ? 0.75 : id === 13 ? 0.7 : 1;
  const crowd = id === 9 || id === 16 || id === 17 || id === 18 ? [...CROWD, ...CROWD_MORE] : CROWD;
  crowd.forEach((m, i) => memberCard(out, id, f, m, energy, cam, `c${i}`));
  for (const [i, m] of SPECIALS.entries()) {
    if (id === 13 && m.at === TIRED) continue;
    memberCard(out, id, f, m, energy, cam, `s${i}`);
  }
  // the collapse group (shot 10) or three more dancers
  if (id === 10) {
    const k = smooth((f - 700) / 34);
    out.push(personCard("fallen", townsman(507), { t, expr: k > 0.5 ? "sad" : "worried", arms: ["hang", k > 0.4 ? "cover" : "raise"], headTilt: -14 * k, lean: 6 * k, idle: 0.5 }, [FALLEN[0], -0.62 * k, FALLEN[2]], { rot: 0.1 * k }));
    out.push(personCard("fr1", townswoman(508), { t, expr: "surprised", arms: ["reach", "hang"], turn: -0.45, look: [-0.7, 0.3], lean: -6 * k }, FRIEND1));
    out.push(personCard("fr2", townsman(509), { t, expr: "worried", arms: ["cover", "reach"], turn: 0.4, look: [0.7, 0.3] }, FRIEND2));
  } else for (const [i, at] of [FALLEN, FRIEND1, FRIEND2].entries()) memberCard(out, id, f, { at, D: dancer(507 + i), seed: 507 + i }, energy, cam, `fx${i}`);
  // shot 13: the exhausted dancer, barely moving
  if (id === 13) {
    const d = dance(t, 506, 0.45, true);
    out.push(personCard("tired", townsman(506), { ...d.pose, expr: Math.floor(t * 0.8) % 2 ? "worried" : "sad", headTilt: -8 + 4 * Math.sin(t * 2), look: [0.2, 0.5] }, [TIRED[0], d.hop, TIRED[2]], { rot: d.tilt }));
  }
  if (id === 1 || id === 19) { feetDust(out, hookT(id, f), HERO1, 501); feetDust(out, hookT(id, f), HERO2, 502); }
  if (id === 13) feetDust(out, t, TIRED, 506);
  // dancers on the stage with the musicians
  for (const [i, x] of [-2.75, -2.05, 2.05, 2.75].entries()) {
    const dd = dance(t, 900 + i, 1);
    out.push(personCard(`st${i}`, dancer(900 + i), dd.pose, [x, STAGE.top + dd.hop, STAGE.z + 0.75 - 0.2 * (i % 2)], { rot: dd.tilt, flip: dd.flip }));
  }
  // the bystander: arms folded, then a tapping foot and a sly look at us
  const tap = id === 18 ? smooth((f - 1400) / 12) : 0;
  out.push(personCard("byst", BYST, { t, expr: id === 18 ? (f < 1400 ? "worried" : "surprised") : "surprised", arms: tap > 0.5 ? ["cover", "swing"] : ["cover", "hang"], gait: tap > 0.5 ? "walk" : "stand",
    phase: ((t * 1.6) % 1), turn: id === 18 ? 0.12 : -0.3, look: id === 18 ? [0, 0] : "idle", headTilt: 6 * tap * Math.sin(t * 6) }, BYSTANDER));
  // the physician and two councillors at the town hall
  const doc: Pose = id === 7
    ? { t, expr: "determined", arms: ["raise", "raise"], headTilt: 8 * Math.sin(t * 4), talk: [[508 / FPS, 530 / FPS]], look: [0, 0.2], lean: 3 * Math.sin(t * 3) }
    : { t, expr: "stern", arms: ["hips", "point"], turn: id === 6 ? 0.15 : 0.3, talk: [[462 / FPS, 500 / FPS]], look: id === 6 ? [0, 0] : "idle" };
  out.push(personCard("doc", PHYSICIAN, doc, DOCTOR));
  if (id === 9) out.push(personCard("cA9", COUNCIL_A, { t, view: "side", turn: 0.3, expr: "worried", arms: ["fold", "fold"], headTilt: -4 }, [-9.08, 0, -13.59]));
  else out.push(personCard("cA", COUNCIL_A, { t, expr: id === 7 ? "surprised" : "stern", arms: ["fold", "fold"], turn: 0.4, look: [0.6, 0] }, COUNCIL1));
  out.push(personCard("cB", COUNCIL_B, { t, expr: "worried", arms: ["cover", "hang"], turn: -0.4, look: [-0.6, 0] }, COUNCIL2));
  // musicians on the stage + the carpenter
  const top = STAGE.top, mz = STAGE.z - 0.45;
  out.push(personCard("drum", DRUMMER, { t, expr: "angry", arms: ["hold", "hold"], gait: "walk", phase: (t * 2.2) % 1, headTilt: 12 * Math.sin(t * 8), lean: 6 * Math.sin(t * 4.4), talk: [[-100, 1000]] }, [-1.1, top + 0.06 * Math.abs(Math.sin(t * 7)), mz + 0.15], { extra: X.drum(t), extraKey: `${Math.round(t * 30)}` }));
  out.push(personCard("pipe", PIPER, { t, expr: "worried", arms: ["cup", "cup"], headTilt: -5 + 4 * Math.sin(t * 5), lean: 4 * Math.sin(t * 4) }, [0, top, mz - 0.35], { extra: X.pipe, extraKey: "p" }));
  out.push(personCard("horn", HORNIST, { t, expr: "surprised", arms: ["cup", "reach"], headTilt: -8, lean: 3 * Math.sin(t * 4.5) }, [1.1, top, mz + 0.1], { extra: X.horn, extraKey: "h" }));
  if (id === 8 || id === 2) {
    const sw = Math.abs(Math.sin(t * 7));
    out.push(personCard("carp", CARPENTER, { t, expr: "determined", arms: ["hang", "raise"], turn: 0.35 }, [-4.3, 0, STAGE.z + 1.7], { extra: X.hammer(sw), extraKey: `${Math.round(sw * 12)}` }));
  }
  // the ripple (16, 17, 19)
  const R = rippleR(id, f), rp = RIPPLE[id];
  if (rp && R > 0 && R < 30) {
    const fade = 1 - clamp01((R - 16) / 12);
    out.push({ key: "ring", draw: (p) => ring(p, "#5fe0c8"), dw: 512, dh: 512, w: (2 * R) / 0.9, pos: [rp.o[0], 0.04, rp.o[2]], face: "flat", add: true, lit: false, glow: 1.4 * fade, maxPx: 1024 });
    out.push({ key: "ring2", draw: (p) => ring(p, "#f2e6a0"), dw: 512, dh: 512, w: (2 * Math.max(0.1, R - 1.2)) / 0.9, pos: [rp.o[0], 0.05, rp.o[2]], face: "flat", add: true, lit: false, glow: 0.7 * fade, maxPx: 1024 });
  }
  // sun motes by day, a few warm lamps at dusk
  if (light === "day" || light === "golden") out.push(...dust(t, [0, 2.5, 0], [24, 4, 18], 50, 4, "#fff2c8"));
  if (light === "dusk") for (const [i, x] of [-9, -3, 4, 10].entries()) {
    fires.push(fire([x, 3.2, BACK_Z + 0.6], 20 + i, 0.9, 4));
    out.push({ key: "lamp", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: 0.9, pos: [x, 3.2, BACK_Z + 0.7], centre: true, face: "camera", add: true, lit: false, glow: 1.2, maxPx: 128 });
  }
  void easeOut; void youth;
  return { cards: out, fires, ground: squareGround };
};

/** dust kicked up at the feet on every stamp (frame-pure: one puff per beat, fading over 0.5 s) */
const feetDust = (out: Card[], t: number, at: V3, seed: number) => {
  const per = 0.3 + 0.14 * hash(seed, 1);
  for (let n = 0; n < 3; n++) {
    const t0 = (Math.floor(t / per) - n) * per, age = t - t0;
    if (age < 0 || age > 0.5) continue;
    out.push({ key: `fd${(Math.floor(t0 / per) % 4 + 4) % 4}`, draw: (p) => dustPuff(p, Math.floor(t0 / per)), dw: 400, dh: 260, w: 0.6 + age * 1.2, pos: [at[0] + 0.25 * Math.sin(t0 * 7), 0, at[2] + 0.1], soft: true, opacity: 0.6 * (1 - age / 0.5), face: "camera" });
  }
};

// ---------------- the lane ----------------
const LANE_STATIC: Card[] = (() => {
  const out: Card[] = [];
  for (let i = 0; i < 8; i++) out.push(propCard(`hl${i}`, (p) => halfTimber(p, 60 + i), 1000, 1800, 1780, 6.1, [-21 + i * 6, 0, -LANE_Z - (i % 2) * 0.3], { face: "fixed" }));
  out.push(propCard("lbarr", (p) => barrels(p, 2), 600, 500, 490, 1.5, [4.4, 0, -3.2]));
  out.push({ key: "lsign", draw: (p) => innSign(p, 3), dw: 500, dh: 500, w: 1.1, pos: [-6.2, 3.2, -3.5], centre: true, face: "fixed" });
  out.push({ key: "lbunt", draw: (p) => bunting(p, 4), dw: 2000, dh: 300, w: 24, pos: [0, 6.2, -3.0], face: "fixed", maxPx: 1024 });
  return out;
})();
const WATCHERS: { at: V3; D: Dressed; pose: Partial<Pose> }[] = [
  { at: [1.5, 0, -3.4], D: townswoman(71), pose: { expr: "surprised", arms: ["cover", "cup"], turn: -0.35 } },
  { at: [3.4, 0, -3.5], D: townsman(72), pose: { expr: "surprised", arms: ["cover", "hang"], turn: -0.4 } },
  { at: [-3.2, 0, -3.3], D: youth(73), pose: { expr: "awe", arms: ["hang", "point"], turn: 0.4 } },
  { at: [-4.9, 0, -3.5], D: townswoman(74), pose: { expr: "worried", arms: ["cup", "hang"], turn: 0.4 } },
];
const lane = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [...LANE_STATIC];
  const d = dance(t, 301, 1.3, id === 4 && f < 335);
  const tq = Math.round(t * 15) / 15;
  out.push(personCard("first", FIRST, d.pose, [WOMAN[0], d.hop, WOMAN[2]], { rot: d.tilt, flip: d.flip, extra: sweatX(tq, 301), extraKey: `sw${tq}` }));
  if (id === 4) feetDust(out, t, WOMAN, 301);
  out.push(personCard("husb", HUSB, { t, expr: "worried", arms: ["cover", "beckon"], turn: 0.3, talk: id === 4 ? [[300 / FPS, 330 / FPS]] : undefined, look: [0.5, 0] }, HUSBAND));
  WATCHERS.forEach((w, i) => out.push(personCard(`w${i}`, w.D, { t, ...w.pose }, w.at)));
  if (id === 5) for (let k = 0; k < JOINERS; k++) {
    const side = k % 2 ? 1 : -1, tx = side * (0.7 + Math.floor(k / 2) * 0.27 + 0.25 * hash(k, 3)), tz = -2.4 + 4.0 * hash(k, 4);
    const x0 = side * 7, arrive = joinF(k), walkS = (Math.abs(x0 - tx) / 2.2) * FPS, f0 = arrive - walkS;
    if (f < f0) continue;
    const D = dancer(800 + k);
    if (f < arrive) {
      const u = (f - f0) / walkS, x = x0 + (tx - x0) * u, z = tz;
      out.push(personCard(`j${k}`, D, { t, view: "side", gait: "walk", phase: ((Math.abs(x - x0) / 1.25) % 1), turn: 0.4, arms: ["swing", "swing"], expr: hash(k, 5) < 0.5 ? "worried" : "surprised" }, [x, 0, z], { flip: side > 0 }));
    } else {
      const dd = dance(t, 800 + k, smooth((f - arrive) / 10));
      out.push(personCard(`j${k}`, D, dd.pose, [tx, dd.hop, tz], { rot: dd.tilt, flip: dd.flip }));
    }
  }
  out.push(...dust(t, [0, 2.4, 0], [16, 4, 8], 30, 6, "#fff2c8"));
  return { cards: out, fires: [], ground: (st, amb) => offset(st.ground("lcobble", [120, 60], [0, 0, 0], () => paintTex(1024, 1024, cobblePaint, [36, 18]), amb)) };
};

// ---------------- the archive ----------------
const archive = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [];
  out.push(propCard("awall", archiveWall, 2400, 1400, 1400, 7.2, [0, 0, -1.7], { face: "fixed" }));
  out.push(propCard("desk", deskFront, 1600, 560, 550, 2.5, [0, 0, 0.42], { face: "fixed" }));
  out.push({ key: "dtop", draw: (p) => { p.poly([[0, 0], [1600, 0], [1600, 600], [0, 600]], "#8a5a34", 0); for (let x = 0; x < 1600; x += 100) p.stroke([[x, 0], [x, 600]], 3, "rgba(16,34,43,0.25)"); }, dw: 1600, dh: 600, w: 2.5, pos: [0, DESK_Y, -0.05], face: "flat" });
  out.push(propCard("book1", (p) => lecternBook(p, 0), 800, 760, 750, 0.95, BOOK1, { face: "fixed", yaw: 0.12, maxPx: 2048 }));
  out.push(propCard("book2", (p) => lecternBook(p, 1), 800, 760, 750, 0.95, BOOK2, { face: "fixed", yaw: -0.12, maxPx: 2048 }));
  out.push(personCard("scribe", SCRIBE_P, { t, expr: id === 11 ? "worried" : "surprised", arms: id === 11 ? ["point", "hang"] : ["hips", "point"], turn: id === 11 ? -0.3 : 0.3, look: id === 11 ? [-0.6, 0.3] : [0.6, 0.3], talk: [] }, SCRIBE));
  const C: V3[] = [[-1.42, DESK_Y, -0.22], [1.42, DESK_Y, -0.25], [0.02, DESK_Y, -0.38]];
  const fires: FireLight[] = [];
  C.forEach((c, i) => {
    const tq = Math.round(t * 15) / 15;
    out.push(propCard(`cand${i}|${tq}`, (p) => candle(p, tq, i), 200, 600, 590, 0.13, c, { face: "camera", lit: false }));
    out.push({ key: "cglow", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: 0.5, pos: [c[0], c[1] + 0.19, c[2] + 0.02], centre: true, face: "camera", add: true, lit: false, glow: 1.1, maxPx: 128 });
    fires.push(fire([c[0], c[1] + 0.2, c[2]], 40 + i, 0.9, 1.3));
  });
  return { cards: out, fires, amb: [0.5, 0.52, 0.56], ground: (st, amb) => offset(st.ground("boards", [30, 30], [0, 0, 0], () => paintTex(1024, 1024, boardPaint, [8, 8]), amb)) };
};

// ---------------- the famine field ----------------
const field = (f: number): Built => {
  const t = f / FPS, out: Card[] = [];
  out.push(propCard("city", cityFar, 3000, 900, 890, 95, [12, 0, -120], { face: "fixed", maxPx: 2048 }));
  out.push(propCard("tree", (p) => deadTree(p, 5), 1200, 1500, 1490, 6.5, [-4.6, 0, -6.5], { face: "fixed" }));
  out.push(propCard("tree2", (p) => deadTree(p, 9), 1200, 1500, 1490, 4, [9, 0, -16], { face: "fixed" }));
  out.push(propCard("ecart", (p) => cart(p, false), 1100, 650, 640, 2.4, [3.8, 0, -3.8], { face: "fixed", yaw: -0.3 }));
  out.push(propCard("stallE", (p) => stall(p, 4, false), 1000, 900, 890, 2.9, [-2.6, 0, -3.9], { face: "fixed", yaw: 0.25 }));
  out.push(personCard("mother", MOTHER_P, { t, expr: "sad", arms: ["hang", "reach"], turn: 0.15, look: [0.3, 0.2], headTilt: -5 }, MOTHER, { extra: X.bowl, extraKey: "b" }));
  out.push(personCard("child", CHILD_P, { t, expr: "worried", arms: ["reach", "hang"], turn: -0.3, look: [-0.6, -0.6] }, [MOTHER[0] + 0.85, 0, MOTHER[2] + 0.3]));
  out.push(personCard("old", OLDMAN_P, { t, expr: "sad", arms: ["hold", "hang"], hold: ["lathi", null], turn: 0.25, headTilt: -6 }, [MOTHER[0] - 1.25, 0, MOTHER[2] - 0.7]));
  for (let i = 0; i < 7; i++) {
    const x = -14 + ((t * (2.2 + hash(i, 2)) + hash(i, 1) * 30) % 30), y = 6 + 3 * hash(i, 3) + 0.4 * noise1(t + i, 4), z = -8 - 6 * hash(i, 5);
    const w = (t * 3 + hash(i, 6)) % 1;
    out.push({ key: `crow${Math.round(w * 8)}`, draw: (p) => crow(p, Math.round(w * 8) / 8), dw: 200, dh: 140, w: 0.7, pos: [x, y, z], centre: true, face: "camera" });
  }
  for (const [i, b] of [[-5.6, 4.2], [-3.6, 3.6]].entries()) out.push({ key: "crowS", draw: (p) => crow(p, 0.25), dw: 200, dh: 140, w: 0.55, pos: [b[0], b[1], -6.4], centre: true, face: "fixed", flip: i === 1 });
  out.push(...dust(t, [0, 2, -2], [14, 3, 8], 30, 8, "#ffe0a0"));
  return { cards: out, fires: [], ground: (st, amb) => offset(st.ground("field", [400, 400], [0, 0, -60], () => paintTex(1024, 1024, fieldPaint, [80, 80]), amb)) };
};

// ---------------- the chapel ----------------
const chapel = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [], fires: FireLight[] = [];
  out.push(propCard("cwall", chapelWall, 2600, 2200, 2200, 9.4, [0, 0, -4.4], { face: "fixed" }));
  out.push(propCard("altar", altar, 1600, 700, 690, 3.6, [0, 0, -3.85], { face: "fixed" }));
  out.push(propCard("plinth", plinth, 600, 600, 590, 1.27, [0, 0, -3.1], { face: "fixed" }));
  out.push(personCard("vitus", VITUS, { t: 0, idle: 0, expr: "stern", arms: ["raise", "hang"], look: [0, 0.1] }, STATUE, { tint: [0.95, 0.9, 0.84], rim: false }));
  out.push(shaft("win", [0.3, 6.4, -4.2], 2.2, 7, -0.3, 0.55));
  const flare = id === 15 ? 1 + 1.4 * Math.exp(-Math.max(0, f - 1144) / 8) * (f >= 1144 ? 1 : 0) : 1;
  const C: V3[] = [[-1.35, 1.33, -3.8], [-1.05, 1.33, -3.8], [1.05, 1.33, -3.8], [1.35, 1.33, -3.8], [-2.4, 0, -2.6], [2.4, 0, -2.6]];
  C.forEach((c, i) => {
    const tq = Math.round(t * 15) / 15, big = c[1] === 0;
    out.push(propCard(`cc${i}|${tq}`, (p) => candle(p, tq, i + 3), 200, 600, 590, big ? 0.32 : 0.14, c, { face: "camera", lit: false }));
    const fy = c[1] + (big ? 0.48 : 0.2);
    out.push({ key: "chg", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: (big ? 0.9 : 0.55) * flare, pos: [c[0], fy, c[2] + 0.03], centre: true, face: "camera", add: true, lit: false, glow: 1.1, maxPx: 128 });
    fires.push(fire([c[0], fy, c[2] + 0.2], 60 + i, 0.75 * flare, 2.0));
  });
  const KN: { at: V3; D: Dressed; pose: Partial<Pose> }[] = [
    { at: [-0.75, -0.55, -0.3], D: townswoman(91), pose: { expr: "worried", arms: ["cup", "cover"], turn: 0.2, look: [0.3, -0.5] } },
    { at: [0.8, -0.55, -0.15], D: townsman(92), pose: { expr: "worried", arms: ["cover", "cup"], turn: -0.2, look: [-0.3, -0.5] } },
    { at: [-0.95, -0.55, -1.5], D: townswoman(93), pose: { expr: "surprised", arms: ["cover", "cover"], turn: 0.1, look: [0, -0.6] } },
    { at: [1.05, -0.55, -1.3], D: youth(94, true), pose: { expr: "worried", arms: ["cup", "hang"], turn: -0.4, look: [-0.5, -0.4] } },
  ];
  KN.forEach((k, i) => out.push(personCard(`kn${i}`, k.D, { t, ...k.pose, expr: f >= 1144 && id === 15 ? "surprised" : k.pose.expr }, k.at)));
  out.push(personCard("priest", PRIEST, { t, expr: "stern", arms: ["hold", "raise"], hold: ["letter", null], turn: -0.35, talk: [[1080 / FPS, 1140 / FPS]] }, [2.1, 0, -2.4]));
  out.push(...dust(t, [0.3, 3, -3], [3, 5, 2], 26, 9, "#fff2c8"));
  return { cards: out, fires, amb: [0.42, 0.47, 0.5], ground: (st, amb) => offset(st.ground("slab", [30, 30], [0, 0, 0], () => paintTex(1024, 1024, slabPaint, [10, 10]), amb)) };
};

export class World {
  stage = new KitStage();
  root = this.stage.root;
  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, pxH: number) {
    const s = SHOTS[id - 1], c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const b = s.scene === "square" ? square(id, f, cam, s.light) : s.scene === "lane" ? lane(id, f) : s.scene === "archive" ? archive(id, f)
      : s.scene === "field" ? field(f) : chapel(id, f);
    const base = LIGHTING[s.light];
    const amb = b.amb ?? base.ambient;
    const L: Lighting = { ...base, ambient: amb, fires: b.fires, ...(b.fog ? { fogNear: b.fog[0], fogFar: b.fog[1] } : {}) };
    this.stage.hideGrounds(); b.ground(this.stage, amb);
    this.stage.showStars(false);
    this.stage.frame(b.cards, L, cam, f / FPS, pxH, scene);
  }
}
void easeOut; void PLINTH_H;
