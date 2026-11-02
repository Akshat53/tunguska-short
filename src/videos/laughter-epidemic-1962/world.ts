// The sets of "The Tanganyika Laughter Epidemic (1962)" on the kit card stage (src/engine/kit/stage.ts). Every set is built
// at the origin and only the current shot's cards are posed, so sets never see each other. update(id, f, camera) is a pure
// function of (id, f):
//  classroom  the girls face the camera at double desks; back wall with louvred windows, the Africa map, the 1962 calendar
//  front      the blackboard wall and the teacher's table; girls seen from behind on benches (over-the-shoulder)
//  school     the mission school block, banana trees, green hills and Lake Victoria; the yard; the road and the lorry
//  dorm       iron beds with mosquito nets, tin trunks, a wall clock, golden windows
//  clinic     bottle shelves, a lab table with test tubes and a microscope, doctors in white coats
//  village    round thatched houses and tin-roofed mud-brick houses among banana trees; independence flags and bunting
//  map        the map of the spread on a table: Kashasha -> Nshamba and beyond, glowing dots multiplying
//  calendar   a wall calendar flipping from January 1962 to February 1963
import * as THREE from "three";
import { KitStage, paintTex, type Card, type Lighting, type FireLight, type V3 } from "../../engine/kit/stage";
import { hash } from "../../engine/kit/core";
import type { Pose, Gesture } from "../../engine/kit/people";
import type { Expr } from "../../engine/kit/face";
import { dust } from "../../engine/kit/fx";
import {
  FPS, SHOTS, camAt, clamp01, smooth, hookT, isLoop, fitStart, rippleR, RIPPLE, add, type Light,
  CLASS_BACK, CLASS_SIDE, COLS, ROWS, GIRL_DX, SEAT_Y, DESK_W, DESK_DZ, HOOK_A, HOOK_B, TEACH_HOOK, TEACH_FRONT, THREE as THREE_GIRLS, STUDIER, HOLD,
  BOARD_Z, TEACH_BOARD, SCHOOL_Z, SCHOOL_W, MISTRESS_AT, ROAD_Z, LORRY_W, LORRY0, lorryX, OFFICIAL_AT, OFFICIAL2_AT,
  DORM_BACK, BEDS, BED_Z, FAINT, FRIEND_L, FRIEND_R, BEDGIRL, LAMP_T, TABLE_Z, DOC1_AT, DOC2_AT, PATIENT, PMOTHER,
  HOME, MOM, DAD, FLAG_AT, MAP_W, MAP_H, mapXZ, CAL_AT,
} from "./story";
import { LIGHTING } from "./lights";
import {
  schoolHouse, bananaTree, hillsFar, roundHut, tinHouse, suitcase, classWall, desk, girlBack, boardWall, teacherTable, bench,
  dormWall, trunk, wallClock, clinicWall, mapCard, MAP_PTS, flagPole, buntingTZ, earthPaint, grassPaint, floorPaint, tilePaint,
  glowDot, ring, dustPuff, calendar,
} from "./art";
import { lorry3d, labTable3d, LAB_DW, LAB_DH, LAB_BASE, bed3d, BED_DW, BED_DH, BED_BASE, BED_W } from "./props3d";
import {
  schoolgirl, villager, crowdPerson, HOOK_A as GA, HOOK_B as GB, TEACHER, TEACHER2, MISTRESS, OFFICIAL1, OFFICIAL2, DRIVER, DOC1, DOC2, NURSE,
  MOTHER_P, FATHER_P, HOMEGIRL, HOLDOUT, X, laughFit, panic, personCard, propCard, type Dressed,
} from "./cast";

type Built = { cards: Card[]; fires: FireLight[]; ground: (st: KitStage, amb: [number, number, number]) => void; amb?: [number, number, number]; fog?: [number, number] };
const fire = (pos: V3, seed: number, power = 0.8, radius = 2.2, col = "#ffad55"): FireLight => ({ pos, col, power, radius, seed });
const offset = (m: THREE.Mesh, k = 2) => { const mat = m.material as THREE.MeshBasicMaterial; mat.polygonOffset = true; mat.polygonOffsetFactor = k; mat.polygonOffsetUnits = k; };
const d2 = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const tq = (t: number) => Math.round(t * 15) / 15;

/** a person in a laughing fit: card + hop + tilt (k = intensity) */
const fitCard = (name: string, D: Dressed, t: number, seed: number, k: number, at: V3, seated = false, over: Partial<Pose> = {}): Card => {
  const L = laughFit(t, seed, k, seated);
  return personCard(name, D, { ...L.pose, ...over }, [at[0], at[1] + L.hop, at[2]], { rot: L.tilt });
};
/** calm, studying or watching poses for seated girls (arms on the desk / at the chin, never hanging) */
const calmSeat = (t: number, seed: number, look: [number, number] | "idle" = "idle", expr: Expr = "neutral"): Pose => {
  const A: [Gesture, Gesture][] = [["fold", "fold"], ["cup", "fold"], ["fold", "cup"], ["cover", "fold"]];
  return { t, expr, arms: A[Math.floor(hash(seed, 3) * A.length)], look, headTilt: 4 * Math.sin(t * 0.8 + seed) - 3, turn: 0.1 * Math.sin(seed) };
};

// ---------------- the classroom ----------------
type Seat = { at: V3; D: Dressed; seed: number; name: string };
const SEATS: Seat[] = (() => {
  const out: Seat[] = [];
  ROWS.forEach((z, ri) => COLS.forEach((x, ci) => [-1, 1].forEach((s) => {
    const at: V3 = [x + s * GIRL_DX, SEAT_Y, z], seed = 1000 + ri * 10 + ci * 2 + (s > 0 ? 1 : 0);
    const named = d2(at, HOOK_A) < 0.01 ? GA : d2(at, HOOK_B) < 0.01 ? GB : d2(at, HOLD) < 0.01 ? HOLDOUT : undefined;
    out.push({ at, D: named ?? schoolgirl(seed), seed, name: `g${ri}${ci}${s > 0 ? "r" : "l"}` });
  })));
  return out;
})();
const CLASS_STATIC: Card[] = (() => {
  const out: Card[] = [];
  out.push(propCard("cwall", (p) => classWall(p, 1), 3000, 1400, 1400, 12, [0, 0, CLASS_BACK], { face: "fixed" }));
  for (const sx of [-1, 1]) out.push(propCard(`cside${sx}`, (p) => classWall(p, sx > 0 ? 3 : 2), 3000, 1400, 1400, 12, [sx * CLASS_SIDE, 0, 1.0], { face: "fixed", yaw: -sx * Math.PI / 2 }));
  ROWS.forEach((z, ri) => COLS.forEach((x, ci) => out.push(propCard(`desk${ri}${ci}`, (p) => desk(p, ri * 3 + ci), 900, 420, 410, DESK_W, [x, 0, z + DESK_DZ], { face: "fixed" }))));
  return out;
})();
const classGround = (st: KitStage, amb: [number, number, number]) => offset(st.ground("cfloor", [40, 40], [0, 0, 0], () => paintTex(1024, 1024, floorPaint, [8, 8]), amb));

const classroom = (id: number, f: number, cam: THREE.PerspectiveCamera): Built => {
  const loop = isLoop(id, f), sid = loop ? 1 : id, t = sid === 1 ? hookT(id, f) : f / FPS;
  const out: Card[] = [...CLASS_STATIC];
  const cz = cam.position.z;
  for (const s of SEATS) {
    if (s.at[2] > cz - 0.6) continue;                                          // nobody behind / at the lens
    if (sid === 5 && f >= 340 && s.at[2] > -0.3 && Math.abs(s.at[0]) < 1.9) continue; // 5b: clear the rows in front of the three
    let k = 1, over: Partial<Pose> = {};
    const pair = d2(s.at, HOOK_A) < 0.01 || d2(s.at, HOOK_B) < 0.01;
    if (sid === 1 || sid === 3) k = pair ? 1.25 : 0.75 + 0.35 * hash(s.seed, 9);
    if (sid === 3 && d2(s.at, HOOK_A) > 0.01) k = 0.9;
    if (sid === 5) {
      const three = THREE_GIRLS.findIndex((p) => d2(p, s.at) < 0.01);
      if (three >= 0) { k = f < 296 + three * 6 ? 0 : smooth((f - 296 - three * 6) / 14) * (f >= 340 ? 1.25 : 1); }
      else {
        const looking = f > 304 + 6 * hash(s.seed, 4);
        out.push(personCard(s.name, s.D, calmSeat(t, s.seed, looking ? [s.at[0] > 0.6 ? -0.6 : 0.5, 0.2] : "idle", looking ? (hash(s.seed, 5) < 0.5 ? "surprised" : "worried") : "neutral"), s.at));
        continue;
      }
      if (k < 0.15) { out.push(personCard(s.name, s.D, calmSeat(t, s.seed), s.at)); continue; }
    }
    if (sid === 17) {
      if (d2(s.at, STUDIER) < 0.01) {
        if (f < 1255) { out.push(personCard(s.name, s.D, { t, expr: f < 1238 ? "worried" : "scared", arms: ["cover", "fold"], headTilt: -6 + 2 * Math.sin(t * 9) * smooth((f - 1238) / 15), look: [0.1, 0.55] }, s.at)); continue; }
        k = 0.4 + smooth((f - 1255) / 10) * 0.85;
      } else { out.push(personCard(s.name, s.D, calmSeat(t, s.seed, [0, 0.55], "worried"), s.at)); continue; }
    }
    if (sid === 21) {
      if (d2(s.at, HOLD) < 0.01) {
        const strain = smooth((f - 1490) / 40);
        out.push(personCard(s.name, s.D, { t, expr: f < 1513 ? "worried" : "scared", arms: f < 1513 ? ["cover", "cover"] : ["shield", "cover"], headTilt: -4 + 3 * strain * Math.sin(t * 11), turn: 0.15 * Math.sin(t * 0.9), look: f < 1500 ? [0.6 * Math.sin(t * 1.4), 0.1] : [0, 0], tears: 0.5 * strain }, [s.at[0], s.at[1] + 0.01 * strain * Math.abs(Math.sin(t * 13)), s.at[2]]));
        continue;
      }
      const f0 = fitStart(21, s.at);
      if (f < f0) { out.push(personCard(s.name, s.D, calmSeat(t, s.seed, [HOLD[0] > s.at[0] ? -0.5 : 0.5, 0.1], "surprised"), s.at)); continue; }
      k = smooth((f - f0) / 12) * (0.8 + 0.3 * hash(s.seed, 9));
      if (f - f0 < 14) out.push({ key: "rglow", draw: (p) => glowDot(p, "#5fe0c8", "#5fe0c8"), dw: 200, dh: 200, w: 1.2 * (1 - (f - f0) / 14), pos: [s.at[0], 0.03, s.at[2]], face: "flat", add: true, lit: false, glow: 1.1, maxPx: 128 });
    }
    out.push(fitCard(s.name, s.D, t, s.seed, k, s.at, true, over));
  }
  // the teachers
  if (sid === 1) out.push(personCard("teach", TEACHER, panic(t, 201), TEACH_HOOK));
  if (sid === 5) {
    const alarm = smooth((f - 300) / 10);
    out.push(personCard("teach2", TEACHER2, { t, turn: 0.55, arms: alarm > 0.5 ? ["shield", "cup"] : ["cover", "point"], expr: f < 300 ? "neutral" : f < 340 ? "surprised" : "scared", talk: f > 345 ? [[345 / FPS, 372 / FPS]] : undefined, lean: 4 * alarm },
      TEACH_FRONT, { extra: alarm > 0.5 ? undefined : X.chalk, extraKey: alarm > 0.5 ? "" : "c" }));
  }
  if (sid === 17 || sid === 21) out.push(personCard("teach", TEACHER, sid === 21 && f > 1500 ? panic(t, 201) : { t, expr: "stern", arms: ["hips", "point"], turn: -0.3, look: "idle" }, TEACH_HOOK));
  out.push(...dust(t, [0, 2.0, 0], [9, 2.5, 8], 26, 5, "#fff2c8"));
  return { cards: out, fires: [], amb: [0.98, 0.98, 0.96], ground: classGround };
};

// ---------------- the front (blackboard) ----------------
const FRONT_STATIC = (busy: boolean): Card[] => {
  const out: Card[] = [];
  out.push(propCard(`board${busy ? 1 : 0}`, (p) => boardWall(p, busy), 3000, 1400, 1400, 12, [0, 0, BOARD_Z], { face: "fixed", maxPx: 2048 }));
  for (const sx of [-1, 1]) out.push(propCard(`fside${sx}`, (p) => classWall(p, sx > 0 ? 5 : 4), 3000, 1400, 1400, 12, [sx * CLASS_SIDE, 0, 2.5], { face: "fixed", yaw: -sx * Math.PI / 2 }));
  out.push(propCard("ttable", teacherTable, 1100, 500, 490, 2.0, [1.25, 0, -1.9], { face: "fixed" }));
  for (const z of [0.4, 1.9]) COLS.forEach((x, ci) => {
    out.push(propCard(`fdesk${z}${ci}`, (p) => desk(p, ci + 5), 900, 420, 410, DESK_W, [x, 0, z], { face: "fixed" }));
    out.push(propCard(`fbench${z}${ci}`, bench, 1000, 400, 395, DESK_W, [x, 0, z + 0.62], { face: "fixed" }));
  });
  return out;
};
const FRONT_BUSY = FRONT_STATIC(true), FRONT_EMPTY = FRONT_STATIC(false);
const front = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [...(id === 16 ? FRONT_BUSY : FRONT_EMPTY)];
  if (id === 16) {
    // books piled on the desks, the girls seen from behind
    for (const z of [0.4, 1.9]) COLS.forEach((x, ci) => [-1, 1].forEach((s) => {
      if (z > 1 && ci === 1 && s < 0) return;                                // keep the near row clear of the lens (no cropped heads)
      const seed = 3000 + ci * 7 + (z > 1 ? 50 : 0) + (s > 0 ? 1 : 0), D = schoolgirl(seed).P;
      out.push(propCard(`gb${seed}`, (p) => girlBack(p, D.skin, D.hairCol, D.look.topCol, seed), 600, 800, 795, 0.62, [x + s * GIRL_DX, 0.4 + 0.012 * Math.sin(t * 1.2 + seed), z + 0.58], { face: "fixed" }));
    }));
    out.push(personCard("mist", MISTRESS, { t, expr: "stern", arms: ["hips", "point"], turn: -0.35, talk: [[1150 / FPS, 1215 / FPS]], look: [0.3, 0], headTilt: 3 * Math.sin(t * 2) }, TEACH_BOARD, { extra: X.chalk, extraKey: "c" }));
  }
  return { cards: out, fires: [], amb: [0.96, 0.97, 0.95], ground: classGround };
};

// ---------------- the school outside ----------------
const TREES: [number, number, number, number][] = [[-10.5, -7.5, 4.6, 2], [-13, -3, 4.2, 5], [10.5, -7, 4.8, 4], [12.5, -2.5, 4.0, 7], [-8.5, 5.5, 4.4, 8], [9.8, 6.8, 4.2, 10],
  [-15, -11, 5, 12], [15.5, -11.5, 5, 13], [-5.5, -12.5, 4.4, 14], [5.2, -13, 4.6, 16], [-18, 1, 4.6, 18], [18, 2.5, 4.8, 20], [-12.5, 9, 4.2, 22], [13.5, 10, 4.4, 24]];
const SCHOOL_STATIC: Card[] = (() => {
  const out: Card[] = [];
  out.push(propCard("hills", (p) => hillsFar(p, 3, true), 3000, 900, 890, 260, [0, 0, -130], { face: "fixed", maxPx: 2048, fog: false }));
  out.push(propCard("school", (p) => schoolHouse(p, 1), 2400, 900, 890, SCHOOL_W, [0, 0, SCHOOL_Z], { face: "fixed", maxPx: 2048 }));
  for (const [x, z, w, s] of TREES) out.push(propCard(`ban${s}`, (p) => bananaTree(p, s), 900, 1400, 1390, w, [x, 0, z]));
  return out;
})();
const YARD = (() => {
  const out: { at: V3; D: Dressed; seed: number }[] = [];
  for (let i = 0, n = 0; n < 72 && i < 2000; i++) {
    const at: V3 = [-7 + 14 * hash(i, 31), 0, -6 + 9.5 * hash(i, 32)];
    if (out.some((m) => d2(m.at, at) < 0.85)) continue;
    out.push({ at, D: crowdPerson(4000 + i, true), seed: 4000 + i }); n++;
  }
  return out;
})();
const schoolGround = (st: KitStage, amb: [number, number, number]) => {
  offset(st.ground("grass", [400, 400], [0, 0, -60], () => paintTex(1024, 1024, grassPaint, [90, 90]), amb), 3);
  offset(st.ground("yard", [44, 30], [0, 0, -1], () => paintTex(1024, 1024, earthPaint, [10, 7]), amb), 1);
};
const flagCard = (key: string, t: number, at: V3, w: number): Card => { const wq = Math.round(((t * 1.1) % 1) * 12) / 12; return propCard(`${key}${wq}`, (p) => flagPole(p, wq), 700, 1100, 1090, w, at, { face: "fixed" }); };

const school = (id: number, f: number, cam: THREE.PerspectiveCamera, light: Light): Built => {
  const t = f / FPS, out: Card[] = [...SCHOOL_STATIC], fires: FireLight[] = [];
  out.push(flagCard("sflag", t, [6.2, 0, -7.4], 2.4));
  if (id === 2) {
    out.push(personCard("mist", MISTRESS, { t, expr: "worried", arms: ["beckon", "point"], wave: (t * 1.4) % 1, turn: 0.3, talk: [[90 / FPS, 150 / FPS]], look: [0.4, 0.1] }, MISTRESS_AT));
    for (let k = 0; k < 7; k++) {
      const f0 = 60 + k * 11, u = (f - f0) / FPS;
      if (u < 0) continue;
      const x = -2.2 + 1.3 * u, z = -6.4 + 0.75 * k * 0.25 + 0.45 * u;
      if (x > 3.5) continue;
      const D = schoolgirl(500 + k), fit = k % 3 === 1, L = laughFit(t, 500 + k, 0.8);
      out.push(personCard(`out${k}`, D, { t, view: "side", gait: "walk", phase: (u * 1.6) % 1, turn: 0.45, arms: ["swing", "carry"], hold: [null, "bundle"], expr: fit ? L.pose.expr : "worried", talk: fit ? L.pose.talk : undefined, tears: fit ? 0.8 : 0, headTilt: fit ? L.pose.headTilt : -4 }, [x, 0, z]));
    }
    YARD.slice(0, 18).forEach((m, i) => { if (m.at[2] > -2.5) return; out.push(fitCard(`y${i}`, m.D, t, m.seed, 0.7 + 0.3 * hash(m.seed, 3), m.at)); });
  }
  if (id === 4) YARD.slice(0, 26).forEach((m, i) => out.push(personCard(`y${i}`, m.D, { t, expr: pickExpr(m.seed), arms: hash(m.seed, 5) < 0.5 ? ["hold", "swing"] : ["fold", "fold"], hold: ["bundle", null], turn: 0.4 * Math.sin(m.seed), talk: hash(m.seed, 6) < 0.3 ? [[t - 0.5, t + 0.5]] : undefined }, m.at)));
  if (id === 6) {
    YARD.forEach((m, i) => {
      const f0 = fitStart(6, m.at);
      if (f < f0) { out.push(personCard(`y${i}`, m.D, { t, expr: "surprised", arms: ["cover", "cup"], look: "idle", turn: 0.3 * Math.sin(m.seed) }, m.at)); return; }
      out.push(fitCard(`y${i}`, m.D, t, m.seed, smooth((f - f0) / 10), m.at));
      if (f - f0 < 14) out.push({ key: "rglow", draw: (p) => glowDot(p, "#5fe0c8", "#5fe0c8"), dw: 200, dh: 200, w: 1.5 * (1 - (f - f0) / 14), pos: [m.at[0], 0.04, m.at[2]], face: "flat", add: true, lit: false, glow: 1.2, maxPx: 128 });
    });
    const R = rippleR(6, f), rp = RIPPLE[6];
    if (R > 0 && R < 30) out.push({ key: "ring", draw: (p) => ring(p, "#5fe0c8"), dw: 512, dh: 512, w: (2 * R) / 0.9, pos: [rp.o[0], 0.05, rp.o[2]], face: "flat", add: true, lit: false, glow: 1.3 * (1 - clamp01((R - 8) / 8)), maxPx: 1024 });
  }
  if (id === 9 || id === 10) {
    // road wheels roll with the distance driven (r = 0.46 m), folded into one sixth of a turn (the wheel has 6-fold symmetry)
    const lx = lorryX(id, f), wheel = Math.round(((((lx - LORRY0[0]) / 0.46) % (Math.PI / 3)) * 20)) / 20;
    out.push(propCard(`lorry${wheel}`, (p) => lorry3d(p, wheel), 1400, 760, 750, LORRY_W, [lx, 0, ROAD_Z], { face: "fixed" }));
    out.push(personCard("driver", DRIVER, { t, expr: "worried", arms: ["hold", "cover"], turn: 0.4, look: [0.5, 0] }, [lx + 1.75, 0.55, ROAD_Z - 0.25], { scale: 0.85 }));
    // girls in the lorry bed (bed floor ~1.04 m)
    for (let k = 0; k < 6; k++) {
      const gx = lx - 2.0 + k * 0.52, seed = 600 + k, fit = k === 2 || (id === 10 && k === 4);
      if (id === 9 && k > Math.floor((f - 588) / 14)) continue;
      const D = schoolgirl(seed);
      if (fit) out.push(fitCard(`bed${k}`, D, t, seed, 1, [gx, 1.0, ROAD_Z - 0.35 - 0.12 * (k % 2)]));
      else out.push(personCard(`bed${k}`, D, { t, expr: k % 2 ? "sad" : "worried", arms: k % 2 ? ["cover", "cup"] : ["reach", "cover"], turn: 0.3 * Math.sin(k), look: fit ? "idle" : [-0.5, 0.1] }, [gx, 1.0, ROAD_Z - 0.35 - 0.12 * (k % 2)]));
    }
    if (id === 9) {
      out.push(personCard("off1", OFFICIAL1, { t, expr: "stern", arms: ["hold", "point"], turn: 0.35, talk: [[600 / FPS, 640 / FPS], [655 / FPS, 675 / FPS]], look: [0.5, 0] }, OFFICIAL_AT, { extra: X.clip, extraKey: "c" }));
      out.push(personCard("off2", OFFICIAL2, { t, expr: "worried", arms: ["fold", "fold"], turn: 0.2 }, OFFICIAL2_AT));
      out.push(personCard("mist", MISTRESS, { t, expr: "sad", arms: ["cover", "beckon"], wave: (t * 1.2) % 1, turn: 0.4 }, [-0.4, 0, 1.0]));
      for (let k = 0; k < 4; k++) {
        const u = clamp01((f - 600 - k * 16) / 40), x = -0.2 + 2.4 * u + k * 0.3, z = 2.0 - 0.3 * k;
        out.push(personCard(`walk${k}`, schoolgirl(620 + k), { t, view: "side", gait: u > 0 && u < 1 ? "walk" : "stand", phase: (u * 3) % 1, turn: 0.4, arms: ["swing", "carry"], hold: [null, "bundle"], expr: "worried" }, [x, 0, z]));
      }
      for (let k = 0; k < 4; k++) out.push(propCard(`case${k}`, (p) => suitcase(p, k), 300, 200, 195, 0.5, [LORRY0[0] - 2.6 + k * 0.55, 0, ROAD_Z + 0.9 + 0.2 * (k % 2)]));
      YARD.slice(0, 22).forEach((m, i) => { if (m.at[2] > -2 && m.at[0] < 4) return; out.push(personCard(`y${i}`, m.D, { t, expr: hash(m.seed, 4) < 0.5 ? "sad" : "worried", arms: ["cover", "cup"], turn: 0.3 * Math.sin(m.seed) }, m.at)); });
    }
    if (id === 10) {
      const v = lx - LORRY0[0];
      for (let n = 0; n < 7; n++) {
        const age = ((t * 3 + n / 7) % 1), x = lx - 2.9 - age * 1.6 - 0.2 * n;
        if (v < 0.2) continue;
        out.push({ key: `dust${n % 4}`, draw: (p) => dustPuff(p, n % 4), dw: 400, dh: 260, w: 1.2 + age * 2.4, pos: [x, 0, ROAD_Z + 0.35], soft: true, opacity: 0.75 * (1 - age) * clamp01(v / 1.5), face: "camera" });
      }
    }
  }
  if (light === "day" || light === "golden") out.push(...dust(t, [0, 2.5, 0], [24, 4, 18], 40, 4, "#fff2c8"));
  return { cards: out, fires, ground: schoolGround };
};
const pickExpr = (seed: number): Expr => (["neutral", "smile", "neutral", "happy"] as Expr[])[Math.floor(hash(seed, 7) * 4)];

// ---------------- the dormitory ----------------
const DORM_STATIC: Card[] = (() => {
  const out: Card[] = [];
  out.push(propCard("dwall", (p) => dormWall(p, 1), 3000, 1400, 1400, 10, [0, 0, DORM_BACK], { face: "fixed" }));
  for (const sx of [-1, 1]) out.push(propCard(`dside${sx}`, (p) => dormWall(p, sx > 0 ? 3 : 2), 3000, 1400, 1400, 10, [sx * 4.8, 0, 2.0], { face: "fixed", yaw: -sx * Math.PI / 2 }));
  BEDS.forEach((x, i) => out.push(propCard(`bed${i}`, (p) => bed3d(p, i === 0 || i === 3), BED_DW, BED_DH, BED_BASE, BED_W, [x, 0, BED_Z], { face: "fixed" })));
  [[-2.6, 0], [2.5, 2], [-0.3, 1]].forEach(([x, s]) => out.push(propCard(`trunk${s}`, (p) => trunk(p, s), 500, 300, 295, 0.8, [x, 0, BED_Z + 0.55], { face: "fixed" })));
  return out;
})();
const dorm = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [...DORM_STATIC], fires: FireLight[] = [];
  const hours = id === 8 ? 2 + clamp01((f - 497) / 70) * 5 : 2.3;
  const hq = Math.round(hours * 24) / 24;
  out.push({ key: `clock${hq}`, draw: (p) => wallClock(p, hq), dw: 300, dh: 300, w: 0.55, pos: [0.1, 2.45, DORM_BACK + 0.05], centre: true, face: "fixed" });
  // girls on the far beds, in fits
  out.push(fitCard("bg1", schoolgirl(701), t, 701, 0.9, [BEDS[0] + 0.2, -0.42, BED_Z + 0.35], true));
  out.push(fitCard("bg2", schoolgirl(702), t, 702, 0.8, [BEDS[3] - 0.3, -0.42, BED_Z + 0.35], true));
  if (id === 7) {
    const k = smooth((f - 468) / 22);
    const L = laughFit(t, 711, 1.1 * (1 - 0.6 * k));
    out.push(personCard("faint", schoolgirl(711), { ...L.pose, expr: k > 0.55 ? "sad" : L.pose.expr, arms: k > 0.3 ? ["reach", "reach"] : L.pose.arms, headTilt: -24 * k + (1 - k) * (L.pose.headTilt ?? 0), lean: 9 * k, tears: 0.9, talk: k > 0.55 ? undefined : L.pose.talk }, [FAINT[0], FAINT[1] - 0.45 * k + L.hop * (1 - k), FAINT[2]], { rot: 0.2 * k }));
    const fl = laughFit(t, 712, 0.7), fr = laughFit(t, 713, 0.6);
    out.push(personCard("frL", schoolgirl(712), { ...fl.pose, arms: k > 0.2 ? ["cover", "reach"] : fl.pose.arms, turn: 0.35, look: [0.6, 0.3] }, FRIEND_L));
    out.push(personCard("frR", schoolgirl(713), { ...fr.pose, expr: k > 0.4 ? "scared" : fr.pose.expr, arms: k > 0.2 ? ["reach", "shield"] : fr.pose.arms, turn: -0.35, look: [-0.6, 0.3] }, FRIEND_R));
  }
  if (id === 8) {
    if (f < 549) out.push(personCard("bedgirl", schoolgirl(721), { t, expr: f < 535 ? "sad" : "worried", arms: ["cover", "cup"], headTilt: -10 + 3 * Math.sin(t * 1.3), look: [0.1, 0.5], tears: 0.5 }, BEDGIRL));
    else out.push(fitCard("bedgirl", schoolgirl(721), t, 721, 0.5 + 0.75 * smooth((f - 549) / 12), BEDGIRL, true));
    out.push(personCard("lampT", TEACHER, { t, expr: f < 549 ? "worried" : "scared", arms: ["hold", "cover"], hold: ["lantern", null], turn: -0.4, look: [-0.6, 0.3] }, LAMP_T));
    fires.push(fire([LAMP_T[0] - 0.45, 1.0, LAMP_T[2] + 0.1], 31, 0.7, 2.6));
    out.push({ key: "lglow", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: 0.7, pos: [LAMP_T[0] - 0.42, 0.98, LAMP_T[2] + 0.12], centre: true, face: "camera", add: true, lit: false, glow: 1.1, maxPx: 128 });
  }
  out.push(...dust(t, [0, 1.8, -1], [8, 2.5, 4], 20, 6, "#fff2c8"));
  return { cards: out, fires, amb: id === 8 ? [0.84, 0.78, 0.7] : [0.96, 0.95, 0.92], ground: (st, amb) => offset(st.ground("dfloor", [30, 30], [0, 0, 0], () => paintTex(1024, 1024, floorPaint, [6, 6]), amb)) };
};

// ---------------- the clinic ----------------
const clinic = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [];
  out.push(propCard("clwall", (p) => clinicWall(p, 1), 3000, 1400, 1400, 10, [0, 0, -3.2], { face: "fixed" }));
  out.push(propCard("lab", labTable3d, LAB_DW, LAB_DH, LAB_BASE, 3.0, [0.2, 0, TABLE_Z], { face: "fixed" }));
  out.push(propCard("cbench", bench, 1000, 400, 395, 1.6, [-2.45, 0, PATIENT[2] + 0.35], { face: "fixed" }));
  const shake = f >= 845 ? Math.sin((f - 845) / FPS * Math.PI * 2 * 1.6) * smooth((f - 845) / 6) * (1 - smooth((f - 872) / 8)) : 0;
  // doctor 1: raises a test tube to the light ("Poison?"), then shakes his head
  out.push(personCard("doc1", DOC1, f < 837
    ? { t, expr: "determined", arms: ["cover", "raise"], look: [0.5, -0.7], headTilt: -6, turn: 0.2 }
    : { t, expr: "worried", arms: ["fold", "fold"], turn: 0.35 * shake + 0.15, headTilt: 4 * shake, look: [0.5, 0], talk: [[851 / FPS, 878 / FPS]] }, DOC1_AT, { extra: f < 837 ? X.tube(f < 808 ? "#ff8a5a" : "#9fe0d0") : X.steth, extraKey: f < 837 ? (f < 808 ? "t1" : "t2") : "s" }));
  // doctor 2: at the microscope ("Infection?"), then turns, palms up
  out.push(personCard("doc2", DOC2, f < 837
    ? { t, expr: f < 808 ? "stern" : "determined", arms: ["reach", "reach"], headTilt: f < 808 ? 4 : 12, look: [0, 0.8], turn: -0.15 }
    : { t, expr: "worried", arms: ["hips", "cup"], turn: -0.35 * shake - 0.2, headTilt: -4 * shake, look: [-0.5, 0] }, DOC2_AT, { extra: X.steth, extraKey: "s" }));
  out.push(personCard("nurse", NURSE, { t, expr: "worried", arms: ["cover", "reach"], turn: -0.4, look: [-0.6, 0.2] }, [2.4, 0, -2.4]));
  out.push(fitCard("patient", schoolgirl(731), t, 731, 0.9, PATIENT, true));
  out.push(personCard("pmom", MOTHER_P, { t, expr: "scared", arms: ["reach", "cover"], turn: 0.4, look: [0.6, 0.3] }, PMOTHER));
  void id;
  return { cards: out, fires: [], amb: [0.98, 1.0, 0.98], ground: (st, amb) => offset(st.ground("tile", [30, 30], [0, 0, 0], () => paintTex(1024, 1024, tilePaint, [12, 12]), amb)) };
};

// ---------------- the village ----------------
const VILLAGE_STATIC: Card[] = (() => {
  const out: Card[] = [];
  out.push(propCard("vhills", (p) => hillsFar(p, 9, false), 3000, 900, 890, 260, [0, 0, -130], { face: "fixed", maxPx: 2048, fog: false }));
  ([[-4.6, -5.5, 4.0, 1], [3.9, -6.6, 4.2, 2], [-8.8, -1.8, 3.8, 3], [8.8, -2.6, 4.0, 4], [-1.5, -12, 4.0, 5], [10.5, -11, 4.2, 6]] as [number, number, number, number][])
    .forEach(([x, z, w, s]) => out.push(propCard(`hut${s}`, (p) => roundHut(p, s), 800, 900, 880, w, [x, 0, z], { face: "fixed" })));
  ([[0.6, -9.2, 5.2, 1], [-7.2, -10.2, 5.0, 2], [7.4, -10.0, 5.0, 3]] as [number, number, number, number][])
    .forEach(([x, z, w, s]) => out.push(propCard(`tin${s}`, (p) => tinHouse(p, s), 1000, 800, 790, w, [x, 0, z], { face: "fixed" })));
  ([[-6.8, -7.5, 4.6, 31], [6.5, -8.2, 4.8, 32], [-11.5, -6, 4.4, 33], [12, -6.5, 4.6, 34], [-3.2, -15, 5, 35], [4.5, -15.5, 5, 36], [-12.5, 3.5, 4.6, 37], [12.8, 3.0, 4.4, 38], [-15.5, -12, 5, 39], [16, -13, 5, 40]] as [number, number, number, number][])
    .forEach(([x, z, w, s]) => out.push(propCard(`vban${s}`, (p) => bananaTree(p, s), 900, 1400, 1390, w, [x, 0, z])));
  return out;
})();
const VCROWD = (n: number, seed: number, box: [number, number, number, number], gap: number, avoid: V3[]) => {
  const out: { at: V3; D: Dressed; seed: number }[] = [];
  for (let i = 0; out.length < n && i < n * 40; i++) {
    const at: V3 = [box[0] + (box[1] - box[0]) * hash(i, seed), 0, box[2] + (box[3] - box[2]) * hash(i, seed + 1)];
    if ([...avoid, ...out.map((m) => m.at)].some((p) => d2(p, at) < gap)) continue;
    out.push({ at, D: crowdPerson(seed * 100 + i, false), seed: seed * 100 + i });
  }
  return out;
};
const VC14 = VCROWD(34, 41, [-6.5, 6.5, -5.5, 3.5], 1.25, [HOME, MOM, DAD]);
const VC15 = VCROWD(46, 43, [-6, 6, -3.6, 0.9], 0.95, [FLAG_AT]);
const VC19 = VCROWD(130, 47, [-8, 8, -6.5, 4.5], 0.8, []);
const villageGround = (st: KitStage, amb: [number, number, number]) => {
  offset(st.ground("vgrass", [400, 400], [0, 0, -60], () => paintTex(1024, 1024, grassPaint, [90, 90]), amb), 3);
  offset(st.ground("vyard", [40, 30], [0, 0, -2], () => paintTex(1024, 1024, earthPaint, [9, 7]), amb), 1);
};
const village = (id: number, f: number, cam: THREE.PerspectiveCamera): Built => {
  const t = f / FPS, out: Card[] = [...VILLAGE_STATIC], fires: FireLight[] = [];
  if (id === 13) {
    out.push(fitCard("homegirl", HOMEGIRL, t, 734, 1.15, HOME));
    out.push(personCard("mom", MOTHER_P, { t, expr: "scared", arms: ["reach", "cover"], turn: -0.45, look: [-0.7, 0.2], headTilt: 5, talk: [[905 / FPS, 945 / FPS]] }, MOM));
    out.push(personCard("dad", FATHER_P, { t, expr: "worried", arms: ["shield", "cover"], turn: 0.4, look: [0.6, 0.1] }, DAD));
    out.push(personCard("kid", villager(9105), { t, expr: "surprised", arms: ["cup", "cover"], turn: 0.3, look: [0.5, 0] }, [-1.5, 0, -2.9]));
    out.push(personCard("neigh", villager(9102), { t, expr: "worried", arms: ["cover", "cup"], turn: -0.3, look: [-0.5, 0] }, [1.6, 0, -3.0]));
  }
  if (id === 14) {
    const all = [{ at: HOME, D: HOMEGIRL, seed: 734 }, ...VC14];
    const start = all.map((m) => fitStart(14, m.at));
    all.forEach((m, i) => {
      const f0 = start[i];
      if (f < f0) out.push(personCard(`v${i}`, m.D, { t, expr: "worried", arms: ["cover", "cup"], turn: 0.4 * Math.sin(m.seed), look: "idle" }, m.at));
      else out.push(fitCard(`v${i}`, m.D, t, m.seed, i === 0 ? 1.1 : smooth((f - f0) / 10) * 0.95, m.at));
      // a glowing thread from the nearest person who caught it earlier
      if (i > 0 && f >= f0 - 12 && f < f0 + 6) {
        let par = 0, best = Infinity;
        all.forEach((q, j) => { if (start[j] < f0 - 2) { const d = d2(q.at, m.at); if (d < best) { best = d; par = j; } } });
        const a = all[par].at, u = clamp01((f - (f0 - 12)) / 12);
        for (let s = 0; s < 6; s++) {
          const v = u * (s + 1) / 6, p: V3 = [a[0] + (m.at[0] - a[0]) * v, 1.45 + 0.35 * Math.sin(v * Math.PI), a[2] + (m.at[2] - a[2]) * v];
          out.push({ key: "thr", draw: (pp) => glowDot(pp, "#5fe0c8", "#e8fff6"), dw: 200, dh: 200, w: 0.42, pos: p, centre: true, face: "camera", add: true, lit: false, glow: 1.3, maxPx: 128 });
        }
      }
    });
    for (const [i, x] of [-4.6, 3.9].entries()) {
      fires.push(fire([x + 0.9, 1.0, -5.0], 50 + i, 0.8, 3.2));
      out.push({ key: "vlamp", draw: (p) => glowDot(p, "#ffb050"), dw: 200, dh: 200, w: 0.8, pos: [x + 0.9, 1.0, -4.9], centre: true, face: "camera", add: true, lit: false, glow: 1.2, maxPx: 128 });
    }
  }
  if (id === 15) {
    out.push(flagCard("vflag", t, FLAG_AT, 3.4));
    for (const [i, z] of [-2.5, 0.8].entries()) out.push({ key: `bunt${i}`, draw: (p) => buntingTZ(p, i), dw: 2000, dh: 300, w: 16, pos: [0, 3.6 + 0.6 * i, z - 3], face: "fixed", maxPx: 1024 });
    VC15.forEach((m, i) => {
      const fl = hash(m.seed, 3) < 0.6, wq = Math.round(((t * 1.4 + hash(m.seed, 4)) % 1) * 8) / 8;
      const expr: Expr = (["happy", "shout", "smile", "happy"] as Expr[])[Math.floor(hash(m.seed, 5) * 4)];
      const hop = 0.06 * Math.abs(Math.sin(t * 4 + m.seed));
      out.push(personCard(`c${i}`, m.D, { t, expr, arms: fl ? ["swing", "raise"] : ["raise", "wave"], wave: (t * 1.8 + hash(m.seed, 6)) % 1, turn: 0.3 * Math.sin(m.seed), talk: expr === "shout" ? [[t - 1, t + 1]] : undefined, headTilt: 5 * Math.sin(t * 3 + m.seed) },
        [m.at[0], hop, m.at[2]], fl ? { extra: X.flag(wq), extraKey: `f${wq}` } : {}));
    });
  }
  if (id === 19) {
    VC19.forEach((m, i) => {
      const fit = hash(m.seed, 8) < 0.35;
      if (fit) out.push(fitCard(`k${i}`, m.D, t, m.seed, 0.6 + 0.4 * hash(m.seed, 9), m.at));
      else out.push(personCard(`k${i}`, m.D, { t, expr: hash(m.seed, 7) < 0.5 ? "worried" : "sad", arms: hash(m.seed, 6) < 0.5 ? ["cover", "cup"] : ["fold", "fold"], turn: 0.3 * Math.sin(m.seed), look: "idle" }, m.at));
    });
  }
  void cam;
  if (id !== 14) out.push(...dust(t, [0, 2.4, -1], [16, 4, 10], 30, 7, "#fff2c8"));
  return { cards: out, fires, ground: villageGround };
};

// ---------------- the map ----------------
const SCHOOL_DOTS: [number, number][] = (() => {
  const out: [number, number][] = [MAP_PTS.kashasha];
  for (let i = 0; out.length < 14 && i < 400; i++) {
    const x = 300 + 1150 * hash(i, 71), y = 650 + 1500 * hash(i, 72);
    if (x > 1450 && y < 1900) continue;                                  // the lake shore
    if (out.some(([a, b]) => Math.hypot(a - x, b - y) < 170)) continue;
    out.push([x, y]);
  }
  out.sort((a, b) => Math.hypot(a[0] - MAP_PTS.kashasha[0], a[1] - MAP_PTS.kashasha[1]) - Math.hypot(b[0] - MAP_PTS.kashasha[0], b[1] - MAP_PTS.kashasha[1]));
  return out;
})();
const VILLAGE_DOTS: [number, number][] = Array.from({ length: 34 }, (_, i) => [260 + 1200 * hash(i, 81), 620 + 1600 * hash(i, 82)] as [number, number]).filter(([x, y]) => !(x > 1450 && y < 1900));
const map = (id: number, f: number): Built => {
  const t = f / FPS, out: Card[] = [];
  out.push({ key: "map", draw: mapCard, dw: 2000, dh: 2400, w: MAP_W, pos: [0, 0.03, 0], face: "flat", maxPx: 2048, lit: true });
  const K = MAP_PTS.kashasha;
  SCHOOL_DOTS.forEach((d, i) => {
    const f0 = 726 + i * 3.4, age = f - f0;
    if (age < 0) return;
    const pos = mapXZ(d), pulse = 1 + 0.15 * Math.sin(t * 6 + i);
    out.push({ key: "sd", draw: (p) => glowDot(p, "#f2b632", "#fff2c0"), dw: 200, dh: 200, w: (i === 0 ? 0.95 : 0.7) * pulse * Math.min(1, age / 4), pos: [pos[0], 0.06, pos[2]], face: "flat", add: true, lit: false, glow: 1.35, maxPx: 128 });
    if (age < 16) out.push({ key: "sr", draw: (p) => ring(p, "#f2b632"), dw: 512, dh: 512, w: 0.3 + age * 0.09, pos: [pos[0], 0.05, pos[2]], face: "flat", add: true, lit: false, glow: 1.2 * (1 - age / 16), maxPx: 256 });
    // the spread: a bright pellet runs along the line from Kashasha
    if (i > 0 && age < 6) { const u = clamp01((age + 6) / 12), a = mapXZ(K); out.push({ key: "sp", draw: (p) => glowDot(p, "#ffe08a", "#ffffff"), dw: 200, dh: 200, w: 0.3, pos: [a[0] + (pos[0] - a[0]) * u, 0.07, a[2] + (pos[2] - a[2]) * u], face: "flat", add: true, lit: false, glow: 1.4, maxPx: 64 }); }
  });
  VILLAGE_DOTS.forEach((d, i) => {
    const f0 = 742 + i * 1.2, age = f - f0;
    if (age < 0) return;
    const pos = mapXZ(d);
    out.push({ key: "vd", draw: (p) => glowDot(p, "#e8643a", "#ffd8c0"), dw: 200, dh: 200, w: 0.36 * Math.min(1, age / 4), pos: [pos[0], 0.055, pos[2]], face: "flat", add: true, lit: false, glow: 1.25, maxPx: 64 });
  });
  void id; void MAP_H;
  return { cards: out, fires: [], amb: [1.0, 0.99, 0.95], ground: (st, amb) => offset(st.ground("mtable", [40, 40], [0, 0, 0], () => paintTex(1024, 1024, floorPaint, [6, 6]), amb)) };
};

// ---------------- the calendar ----------------
const cal = (id: number, f: number): Built => {
  const out: Card[] = [];
  out.push(propCard("calwall", (p) => classWall(p, 7), 3000, 1400, 1400, 12, [2.2, 0, CAL_AT[2] - 0.05], { face: "fixed" }));
  const x = clamp01((f - 1292) / 46) * 13, m = Math.min(12, Math.floor(x)), fl = x >= 13 ? 1 : smooth((x - Math.floor(x) - 0.55) / 0.45);
  const mq = Math.round(fl * 6) / 6;
  out.push({ key: `cal${m}|${mq}`, draw: (p) => calendar(p, m, mq), dw: 800, dh: 1000, w: 0.72, pos: CAL_AT, centre: true, face: "fixed", maxPx: 1024 });
  void id;
  return { cards: out, fires: [], amb: [0.98, 0.97, 0.94], ground: classGround };
};

export class World {
  stage = new KitStage();
  root = this.stage.root;
  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, pxH: number) {
    const s = SHOTS[id - 1], c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const b = s.scene === "classroom" ? classroom(id, f, cam) : s.scene === "front" ? front(id, f) : s.scene === "school" ? school(id, f, cam, s.light)
      : s.scene === "dorm" ? dorm(id, f) : s.scene === "clinic" ? clinic(id, f) : s.scene === "village" ? village(id, f, cam) : s.scene === "map" ? map(id, f) : cal(id, f);
    const base = LIGHTING[s.light];
    const amb = b.amb ?? base.ambient;
    const L: Lighting = { ...base, ambient: amb, fires: b.fires, ...(b.fog ? { fogNear: b.fog[0], fogFar: b.fog[1] } : {}) };
    this.stage.hideGrounds(); b.ground(this.stage, amb);
    this.stage.showStars(false);
    this.stage.frame(b.cards, L, cam, f / FPS, pxH, scene);
  }
}
void add; void TEACH_FRONT;
