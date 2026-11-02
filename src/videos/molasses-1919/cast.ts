// Molasses 1919 cast as lit flat sprites in the 3D world. The pool / actor / effect machinery is copied from the Bombay 1944
// cast (no shared module state between films); the PEOPLE are the visual kit's v2 characters (expressive faces, blinks,
// idle life, gestures, props, walk / run cycles) re-dressed for Boston 1919 here (flat caps, waistcoats, long skirts and
// headscarves, police tunics, a top-hat company man, a present-day engineer). Hats the kit lacks (top hat) and hand props
// (paint brush, tin can, rolled plan) are drawn on top of the kit card at the kit's head / hand anchors.
// Respect: the disaster is never shown hitting anyone; loss is shown by absence (a cap on the syrup) and by rescuers.
// Cards, effects and blobs live on the NOINK layer (the cards carry their own ink).
import * as THREE from "three";
import { Pen, fxShadow, fxContact, fxCreak } from "../tunguska/toon";
import { fxSparkle } from "../tunguska/art";
import { rng } from "../tunguska/paint";
import { NOINK } from "../tunguska/ink";
import { cardShade, blobMaterial, CARD_K } from "../tunguska/cardshade";
import { KPen, SKINS, pick, hash, shade, rgba, ellPts, rrect, rad, type P2 } from "../../engine/kit/core";
import { drawPerson, star, type Person, type Pose, type Anchors } from "../../engine/kit/people";
import { personAnchors } from "../../engine/kit/crowd";
import * as KFX from "../../engine/kit/fx";
import type { Card } from "../../engine/kit/stage";
import {
  fxMolSplash, fxPlank, fxBarrel, fxCap, fxCan, fxDrop, fxDrip, fxThermo, fxBlob, fxJar, fxBrush, fxBucket, fxPlan, fxRingOut, fxTrain,
  fxSkyline, fxCrack, fxPlate, fxStamp, fxStampHand, fxTag, fxLamp, fxGull, fxHandcart, fxWinGlow, MOL,
} from "./art";
import {
  FPS, SHOTS, V3, Light, smooth, clamp01, easeOut, TANK, WATER, waveX, waveGrow, hookTau, runnerX, RUNNER_Z, RESIDENT, RESCUER, CAP, KID, MANAGER,
  PAINTER, LADDER, DOORSTEP, EX, OF, thermoLevel, blobFlow, stampY, sealAt, STAMP_AT, BURST, EL_Y, EL_Z, WALK_Z, floodY, TOTAL,
} from "./story";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    while (this.free.length > 96) this.free.shift()!.tex.dispose();
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; addm: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.addm = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.blob = blobMaterial(blank);
    for (const m of [this.mat, this.soft]) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; }
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean, add = false) { this.mesh.material = add ? this.addm : soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.addm.map = t; this.mesh.renderOrder = this.mesh.material === this.addm ? 3 : (this.mesh.material === this.soft) ? 2 : 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; add?: boolean; glow?: number; opacity?: number; yaw?: number };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3; fov: number; up: THREE.Vector3; fwd: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[]; glow: number };
export type WorldCtx = { panTop: (i: number) => V3 };

const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1440, 2400, 2.4] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : d < 40 ? [240, 400, 0.4] : [150, 250, 0.25];
const tmp = new THREE.Vector3();
let SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
let LNAME: Light = "day";
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- 1919 wardrobe (kit people re-dressed) ----------------
const H = (seed: number, k: number) => hash(seed * 1.91 + 0.23, k);
const base = (seed: number, build: Person["build"], skins = SKINS): Omit<Person, "look"> => ({
  build, seed, height: (build === "boy" || build === "girl" ? 0.95 : 0.93) + 0.12 * H(seed, 1), girth: 0.85 + 0.4 * H(seed, 2) ** 1.5,
  skin: pick(skins.slice(0, 5), H(seed, 3)), hairCol: pick(["#1b1411", "#2a1c14", "#4a2e1c", "#6a4a2a", "#1f1a17", "#8a5a30"], H(seed, 4)), age: H(seed, 5) * 0.6,
});
/** North End resident, 1919: shirt (often striped), dark waistcoat, wool trousers, flat cap, boots */
export const resident = (seed: number): Person => ({ ...base(seed, "man"), look: {
  top: "shirt", topCol: pick(["#f3f1ea", "#dfe6e2", "#e9dfc4", "#cfdbe0"], H(seed, 10)), topPat: H(seed, 11) < 0.45 ? "pinstripe" : undefined, topPatCol: "#7f8aa0",
  vestCol: pick(["#3a3430", "#2a3440", "#4a3a2a", "#3a4a3a", "#5a4a3a"], H(seed, 12)),
  bottom: "trousers", bottomCol: pick(["#3a3a36", "#4a443c", "#2e3438", "#5a5248"], H(seed, 13)),
  hat: "cap", hatCol: pick(["#5a564e", "#4a443c", "#6a5e4e", "#3a3e42", "#7a6a52"], H(seed, 14)), feet: "boots", hair: "short",
  facial: pick(["moustache", "none", "moustache", "stubble", "handlebar"] as const, H(seed, 15)), extras: H(seed, 16) < 0.5 ? ["rolled_sleeves"] : [],
} });
/** North End woman, 1919: long-sleeved blouse, long dark skirt, headscarf or hair in a bun, a shawl */
export const woman = (seed: number): Person => ({ ...base(seed, "woman"), look: {
  top: "blouse", topCol: pick(["#f2ead8", "#e8e0d0", "#d8e2e6", "#e6d4c0"], H(seed, 20)), sleeves: "long",
  bottom: "ghagra", bottomCol: pick(["#2a2e3a", "#3a2a2a", "#2f3a34", "#4a3a2e", "#1f2a3a"], H(seed, 21)),
  hat: H(seed, 22) < 0.55 ? "veil" : "none", hatCol: pick(["#3a3a40", "#5a3a2a", "#2f4a4a", "#6a5a4a"], H(seed, 23)), hair: "bun", feet: "boots",
  shawl: H(seed, 24) < 0.5 ? pick(["#5a3a2a", "#2f4a4a", "#4a4440"], H(seed, 25)) : undefined, extras: [],
} });
/** neighbourhood kid, 1919: shirt, knee breeches, cap, boots (girl: pinafore dress) */
export const kid = (seed: number, girl = false): Person => ({ ...base(seed, girl ? "girl" : "boy"), look: girl
  ? { top: "blouse", topCol: "#f2ead8", sleeves: "long", bottom: "ghagra", bottomCol: pick(["#3a5a6a", "#7a3a2a", "#4a5a3a"], H(seed, 30)), hair: "braid", feet: "boots", vestCol: "#c8b89a" }
  : { top: "shirt", topCol: pick(["#e9dfc4", "#cfdbe0", "#f3f1ea"], H(seed, 31)), bottom: "shorts", bottomCol: pick(["#4a443c", "#3a3e42", "#5a4a3a"], H(seed, 32)), hat: "cap", hatCol: pick(["#6a5e4e", "#4a443c", "#7a6a52"], H(seed, 33)), hair: "short", feet: "boots", extras: ["rolled_sleeves"] } });
/** Boston police, 1919: navy double-breasted tunic with brass buttons, belt, peaked cap */
export const police = (seed: number): Person => ({ ...base(seed, "man"), girth: 1.0 + 0.2 * H(seed, 2), look: {
  top: "fire_coat", topCol: "#1f2a44", bottom: "trousers", bottomCol: "#1c2438", hat: "forage", hatCol: "#1c2438", hatTrim: "#d6a542", feet: "boots", hair: "short",
  facial: pick(["moustache", "handlebar", "none"] as const, H(seed, 40)), extras: ["belt", "brass_buttons"],
} });
/** a navy sailor helping (the USS Nantucket's men waded in): white jumper, white cap */
export const sailor = (seed: number): Person => ({ ...base(seed, "man"), look: {
  top: "shirt", topCol: "#eef0f2", trimCol: "#1f2a44", bottom: "trousers", bottomCol: "#1f2a44", hat: "cap", hatCol: "#f4f4f2", feet: "boots", hair: "short", facial: "none", extras: [],
} });
/** a workman (painter): pale overalls-like shirt + trousers spotted with paint, cap */
export const workman = (seed: number): Person => ({ ...base(seed, "man"), look: {
  top: "shirt", topCol: "#e6e0d0", bottom: "trousers", bottomCol: "#c8c0ae", hat: "cap", hatCol: "#d8d0c0", feet: "boots", hair: "short",
  facial: pick(["moustache", "stubble"] as const, H(seed, 50)), extras: ["rolled_sleeves"],
} });
/** the company man (generic; not a portrait of anyone): black frock coat, grey waistcoat, striped trousers; top hat drawn on top */
export const companyMan = (seed: number): Person => ({ ...base(seed, "man", ["#f1d6c0", "#ecc9ad"]), girth: 1.3, height: 1.0, age: 0.65, hairCol: "#8a8478", look: {
  top: "jacket", topCol: "#1e2226", vestCol: "#6a6e72", bottom: "trousers", bottomCol: "#4a4e52", bottomPat: "pinstripe", bottomPatCol: "#8a8e92",
  hat: "none", feet: "shoes", hair: "parted", facial: "chops", extras: [],
} });
/** a 1919 official / auditor at the hearing: dark suit, waistcoat, older */
export const official = (seed: number): Person => ({ ...base(seed, "man"), age: 0.5 + 0.4 * H(seed, 60), hairCol: pick(["#bdb8ae", "#6a5a4a", "#d9d6cf"], H(seed, 61)), look: {
  top: "jacket", topCol: pick(["#2a2e34", "#3a342e", "#26303a"], H(seed, 62)), vestCol: "#4a4440", bottom: "trousers", bottomCol: "#2a2e34",
  hat: "none", feet: "shoes", hair: pick(["parted", "bald", "short"] as const, H(seed, 63)), facial: pick(["moustache", "chops", "beard", "none"] as const, H(seed, 64)), extras: [],
} });
/** a present-day engineer: light shirt, navy trousers (woman), lanyard-free, no text */
export const engineer = (seed: number): Person => ({ ...base(seed, "woman", SKINS), skin: SKINS[4], hairCol: "#1b1411", height: 1.0, look: {
  top: "shirt", topCol: "#cfe3f0", bottom: "trousers", bottomCol: "#26344c", hat: "none", feet: "shoes", hair: "bun", extras: ["rolled_sleeves"],
} });
const engineer2 = (seed: number): Person => ({ ...base(seed, "man"), skin: SKINS[1], look: {
  top: "shirt", topCol: "#f3f1ea", bottom: "trousers", bottomCol: "#3a4448", hat: "none", feet: "shoes", hair: "wavy", facial: "stubble", extras: [],
} });

// ---- overlays drawn on top of a kit card at its anchors ----
type Extra = (k: KPen, A: Anchors, P: Person, pose: Pose) => void;
const rigH = (P: Person) => { const kidb = P.build === "boy" || P.build === "girl", fem = P.build === "woman" || P.build === "girl"; const T = (kidb ? 500 : fem ? 720 : 770) * P.height; const Hh = T / (kidb ? 3.7 : 4.7); return { H: Hh, W: Hh * (fem ? 0.84 : 0.88) * (0.94 + 0.06 * P.girth) }; };
/** a silk top hat on the head anchor (front view) */
const topHat: Extra = (k, A, P, pose) => {
  const { H: h, W } = rigH(P), [x, y] = A.head, by = y - 0.27 * h;
  k.g.save(); k.g.translate(x, y + 0.45 * h); k.g.rotate(rad(pose.headTilt ?? 0)); k.g.translate(-x, -(y + 0.45 * h));
  k.poly(ellPts(x, by, 0.78 * W, 0.12 * h, 0, 360, 0, 28), "#1a1c20");
  k.poly([[x - 0.48 * W, by], [x - 0.52 * W, by - 0.95 * h], [x + 0.52 * W, by - 0.95 * h], [x + 0.48 * W, by]], k.lin(x - 0.5 * W, 0, x + 0.5 * W, 0, [[0, "#121418"], [0.35, "#3a3e46"], [1, "#0e1014"]]));
  k.ell(x, by - 0.95 * h, 0.52 * W, 0.08 * h, "#2a2e34");
  k.poly([[x - 0.5 * W, by - 0.22 * h], [x + 0.5 * W, by - 0.22 * h], [x + 0.49 * W, by - 0.06 * h], [x - 0.49 * W, by - 0.06 * h]], "#4a3a2e", k.ow * 0.6);
  k.g.restore();
};
/** a paint brush in the near / second hand */
const brushIn = (hi: number): Extra => (k, A) => { const hp = A.hands[hi]; if (!hp) return; k.g.save(); k.g.translate(hp[0], hp[1]); k.g.rotate(-0.9); k.g.translate(-30, -60); fxBrush(new Pen(k.g)); k.g.restore(); };
/** the kid's tin can in a hand (fill shows syrup) */
const canIn = (hi: number, fill: number): Extra => (k, A) => { const hp = A.hands[hi]; if (!hp) return; k.g.save(); k.g.translate(hp[0] - 50, hp[1] - 40); k.g.scale(0.5, 0.5); fxCan(new Pen(k.g), fill); k.g.restore(); };
/** a rolled plan under the arm / in the hand */
const planIn = (hi: number): Extra => (k, A) => { const hp = A.hands[hi]; if (!hp) return; k.g.save(); k.g.translate(hp[0] - 110, hp[1] - 40); k.g.scale(0.75, 0.75); k.poly(rrect(10, 30, 290, 90, 30), "#f4f2ea"); k.ell(285, 60, 16, 30, "#d8dce0", 5); k.stroke([[60, 32], [60, 88]], 4, "#2a4a6a"); k.g.restore(); };

type KOpt = { scale?: number; dir?: [number, number]; shadow?: boolean; extra?: Extra; tag?: string };
/** a kit person standing at (x, y, z). Front cards face the camera; side cards are profiles facing along `dir` (mirrored
 *  when that points screen-left). Keyed by every pose value so the canvas cache only redraws when something changes. */
const kp = (cam: CamInfo, out: Stage, i: number, P: Person, x: number, y: number, z: number, pose: Pose, o: KOpt = {}) => {
  const sc = o.scale ?? 1, d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / sc;
  const [w, h, k] = tier(d);
  const side = pose.view === "side";
  const dir = o.dir ?? [1, 0];
  const mirror = side && dir[0] * cam.right.x + dir[1] * cam.right.z < 0;
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1);
  const p2: Pose = { ...pose, light: q(Math.max(-1, Math.min(1, sx * 2)), 2) };
  if (d > 40) p2.idle = 0;
  const key = `K|${i}|${P.seed}|${o.tag ?? ""}|${fkey(p2)}`;
  const ex = o.extra;
  out.places.push({ key, x, y, z, scale: sc, mirror, draw: (p) => { const kp2 = new KPen(p.g); const A = drawPerson(kp2, P, p2); if (ex) ex(kp2, A, P, p2); }, size: [w, h, k] });
  if (o.shadow !== false) blob(out, x, y, z, sc);
  return { pose: p2, mirror };
};
/** adapter: visual-kit stage Cards (kit fx.ts emitters) -> this film's effect cards */
const kitFx = (out: Stage, cam: CamInfo, cards: Card[], amb = 1) => {
  for (const c of cards) {
    const h = (c.w * c.dh) / c.dw, sc = Math.min(1, (c.maxPx ?? 512) / Math.max(c.dw, c.dh));
    const cw = Math.max(8, Math.round(c.dw * sc)), ch = Math.max(8, Math.round(c.dh * sc));
    const x = c.pos[0], z = c.pos[2], y = c.centre || c.face === "flat" ? c.pos[1] : c.pos[1] + h / 2;
    const yaw = c.face === "fixed" ? (c.yaw ?? 0) : c.face === "yaw" ? Math.atan2(cam.pos.x - x, cam.pos.z - z) : undefined;
    out.fx.push({ key: "k|" + c.key, cw, ch, draw: (p) => { p.g.scale(cw / c.dw, ch / c.dh); c.draw(new KPen(p.g)); }, x, y, z, w: c.flip ? -c.w : c.w, h,
      flat: c.face === "flat", yaw, rot: c.rot, soft: !!(c.soft || c.add), add: !!c.add, glow: (c.glow ?? 1) * (c.lit === false ? 1 : amb), opacity: c.opacity });
  }
};

const CONTACT: Record<Light, [number, number, number]> = { day: [0.3, 0.36, 0.48], golden: [0.3, 0.26, 0.36], dusk: [0.26, 0.32, 0.42], space: [0.3, 0.3, 0.4] };
const TAIL: [number, number, number] = [0.5, 0.58, 0.72];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- effect helpers (all frame-pure) ----------------
let CAM: CamInfo;
let AMB = 1;
const sparkle = (out: Stage, f: number, f0: number, n: number, P: V3, w: number, glow = 1.4) => {
  if (f < f0 || f >= f0 + n) return;
  const u = q((f - f0) / n, 24);
  out.fx.push({ key: `sparkle|${u}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, u), x: P[0], y: P[1], z: P[2], w, h: w, glow });
};
const gulls = (out: Stage, t: number, C: V3, R: number, n: number, seed: number, size = 0.9) => {
  for (let i = 0; i < n; i++) {
    const r = rng(seed * 17 + i), a = t * (0.12 + 0.1 * r()) * (r() > 0.5 ? 1 : -1) + r() * 6.28, rr = R * (0.5 + 0.5 * r());
    const ph = q(((t * (0.9 + 0.5 * r())) + r()) % 1, 8);
    out.fx.push({ key: `gull|${ph}`, cw: 200, ch: 120, draw: (p) => fxGull(p, ph), x: C[0] + Math.cos(a) * rr, y: C[1] + (r() - 0.5) * R * 0.3, z: C[2] + Math.sin(a) * rr * 0.6, w: size, h: size * 0.6 });
  }
};
/** a standing prop card on its base line, facing +z (or the camera with yaw undefined + face "camera") */
const prop = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, P: V3, w: number, o: { yaw?: number; base?: number; glow?: number; rot?: number } = {}) => {
  const h = (w * ch) / cw, b = o.base ?? ch;
  out.fx.push({ key, cw, ch, draw, x: P[0], y: P[1] + h / 2 - ((ch - b) / ch) * h, z: P[2], w, h, yaw: o.yaw, glow: o.glow, rot: o.rot });
};
/** the far harbour skyline and gulls behind the yard */
const harbourBack = (out: Stage, t: number, light: Light) => {
  const col = light === "golden" ? "#c89a7a" : light === "dusk" ? "#4f6670" : "#9fb4bc";
  out.fx.push({ key: `skyline|${col}`, cw: 2048, ch: 512, draw: (p) => fxSkyline(p, 5, col), x: 420, y: 70, z: -60, w: 900, h: 225, yaw: -Math.PI / 2 });
  out.fx.push({ key: `skyline2|${col}`, cw: 2048, ch: 512, draw: (p) => fxSkyline(p, 9, col), x: 60, y: 60, z: -520, w: 900, h: 225, yaw: 0 });
  if (light !== "dusk") gulls(out, t, [70, 24, -10], 26, 6, 9, 1.1);
};

// ---- the wave dressing: splash crown along the front, tumbling planks + barrels on the crest, spray ----
const waveFx = (out: Stage, id: number, f: number, X: number) => {
  const t = id === 5 ? f / FPS : hookTau(id, f), g = waveGrow(id, f);
  for (let i = 0; i < 9; i++) {
    const z = -6.2 + i * 1.55, ph = ((t * 0.9 + i * 0.37) % 1 + 1) % 1, u = q(ph, 20);
    out.fx.push({ key: `msplash|${i % 3}|${u}`, cw: 600, ch: 400, draw: (p) => fxMolSplash(p, u, i % 3), x: X - 2.4, y: 0.75 * g, z, w: 2.6 * g, h: 1.75 * g });
  }
  // a ragged splash crown riding the crest (thick syrup thrown up and falling back)
  for (let i = 0; i < 11; i++) {
    const z = -6.5 + i * 1.3, ph = ((t * 0.7 + i * 0.29) % 1 + 1) % 1, u = q(ph, 20);
    out.fx.push({ key: `msplash|${(i + 1) % 3}|${u}`, cw: 600, ch: 400, draw: (p) => fxMolSplash(p, u, (i + 1) % 3), x: X - 0.6 - 0.4 * Math.sin(i), y: 6.3 * g + 0.5, z, w: 2.2 * g, h: 1.5 * g });
  }
  // debris riding the crest (planks, barrels), tumbling
  for (let i = 0; i < 7; i++) {
    const r = rng(40 + i), z = -5.5 + r() * 11, rot = (t * (1.2 + r()) + r() * 6) % (Math.PI * 2);
    const dx = -0.6 - r() * 1.6, y = (5.3 + r() * 1.1) * g;
    if (i % 3 === 2) out.fx.push({ key: `barrel|${i % 2}`, cw: 300, ch: 360, draw: (p) => fxBarrel(p, i), x: X - dx, y, z, w: 0.75, h: 0.9, rot: q(rot, 12) });
    else out.fx.push({ key: `plank|${i % 2}`, cw: 320, ch: 110, draw: (p) => fxPlank(p, i), x: X - dx, y, z, w: 2.0 + r(), h: 0.7, rot: q(rot, 12) });
  }
  // thick syrup drops thrown ahead of the front
  for (let i = 0; i < 14; i++) {
    const r = rng(90 + i), ph = ((t * (0.7 + 0.4 * r()) + r()) % 1 + 1) % 1, z = -6 + r() * 12;
    const x = X - 1.6 - 2.6 * ph, y = (6.0 + 1.2 * r()) * g * (1 - ph * ph) + 0.3;
    out.fx.push({ key: "drop", cw: 80, ch: 140, draw: fxDrop, x, y, z, w: 0.22 + 0.2 * r(), h: 0.38 + 0.3 * r(), rot: -0.4 });
  }
};
/** pedestrians on the sidewalks (side-view walks), seeded; the hook street is kept clear near x -22..12 */
const passers = (cam: CamInfo, out: Stage, t: number, n: number, x0: number, x1: number, seed: number, idBase: number) => {
  for (let i = 0; i < n; i++) {
    const r = rng(seed + i), dirx = r() < 0.5 ? 1 : -1, sp = 1.0 + 0.3 * r(), z = (r() < 0.5 ? 1 : -1) * (WALK_Z + 0.5 + r() * 0.9);
    const L = x1 - x0, x = x0 + ((((r() * L + dirx * sp * t) % L) + L) % L);
    const P = i % 4 === 1 ? woman(seed + i) : i % 7 === 3 ? police(seed + i) : resident(seed + i);
    kp(cam, out, idBase + i, P, x, 0.16, z, { t, view: "side", gait: "walk", phase: q((t * sp / 1.15 + r()) % 1, 24), turn: 0.4 + 0.3 * r(), expr: r() < 0.5 ? "neutral" : "smile",
      arms: i % 3 ? ["swing", "swing"] : ["swing", "carry"], hold: [null, i % 3 ? null : "bundle"], talk: i % 5 === 0 ? [[1, 2.2]] : undefined }, { dir: [dirx, 0] });
  }
};
/** a train of the El crossing over the street (shot 2) */
const elTrain = (out: Stage, f: number, f0: number) => {
  const x = -60 + 11 * (f - f0) / FPS;
  for (let i = 0; i < 3; i++) out.fx.push({ key: `train|${i % 2}`, cw: 1200, ch: 360, draw: (p) => fxTrain(p, i), x: x - i * 13.4, y: EL_Y + 1.3 + 1.9, z: -EL_Z, w: 13, h: 3.9, yaw: Math.PI / 2 * 0 });
};

// ---------------- the stage ----------------
export const stage = (id: number, f: number, cam: CamInfo, ctx: WorldCtx): Stage => {
  const out: Stage = { places: [], fx: [], glow: 0 };
  const s = SHOTS[id - 1], t = f / FPS;
  LNAME = s.light; CAM = cam; AMB = s.light === "dusk" ? 0.8 : s.light === "golden" ? 0.95 : 1;
  SUN = cam.sun.clone().normalize();
  if (s.scene === "street") harbourBack(out, t, s.light);
  switch (id) {
    case 1: case 16: {
      const X = waveX(id, f)!;
      waveFx(out, id, f, X);
      // everyone in the street flees toward us in panic (same hook clock in shots 1 and 16, so the loop matches): stepping run,
      // hands up / on heads, shocked faces, glancing back over the shoulder at the wave; a policeman in a doorway waves them on
      const tau = hookTau(id, f);
      const RUN: { k: number; z: number; P: Person; arms: [Pose["arms"], Pose["arms"]]; s: number }[] = [
        { k: 0, z: RUNNER_Z[0], P: resident(7), arms: [["swing", "raise"], ["shield", "swing"]], s: 0.2 },
        { k: 1, z: RUNNER_Z[1], P: woman(8), arms: [["shield", "swing"], ["shield", "shield"]], s: 1.7 },
        { k: 0.3, z: -0.2, P: resident(12), arms: [["raise", "raise"], ["swing", "raise"]], s: 3.1 },
        { k: 0.8, z: 3.0, P: woman(13), arms: [["cover", "swing"], ["swing", "cover"]], s: 4.4 },
        { k: -0.35, z: 1.2, P: resident(14), arms: [["swing", "swing"], ["raise", "swing"]], s: 5.6 },
        { k: 1.7, z: -0.4, P: resident(15), arms: [["swing", "shield"], ["raise", "swing"]], s: 6.9 },
      ];
      RUN.forEach((r, i) => {
        const glance = Math.sin(tau * 1.5 + r.s) > 0.45;            // looking back over the shoulder at the wave
        const side = i % 2 ? -1 : 1, ph = (((tau * 1.8 + r.s * 0.31) % 1) + 1) % 1;
        kp(cam, out, 1 + i, r.P, runnerX(id, f, r.k), 0, r.z, {
          t: tau + 10, gait: "run", phase: q(ph, 24), expr: glance ? "surprised" : "scared", arms: glance ? r.arms[1] : r.arms[0],
          turn: glance ? 0.6 * side : 0.12 * side, look: glance ? [0.95 * side, -0.25] : [0, 0], headTilt: glance ? -6 * side : 0, lean: 5 * side,
          talk: glance ? [[tau + 9, tau + 11]] : undefined,
        }, { tag: "r" });
      });
      kp(cam, out, 10, police(11), -13.2, 0.16, -WALK_Z - 1.3, { t: tau + 10, expr: "shout", turn: 0.35, arms: ["beckon", "hang"], talk: [[0, 9]], look: [0.4, 0] });
      // debris flung ahead of the front: planks and syrup drops in arcs over the runners' heads
      for (let i = 0; i < 6; i++) {
        const r = rng(60 + i), ph = (((tau * (0.55 + 0.25 * r()) + r()) % 1) + 1) % 1, z = -4 + r() * 8;
        const x = X - 1.5 - 6 * ph, y = 6.5 + 2.5 * Math.sin(ph * Math.PI) - 6 * ph * ph;
        if (y < 0.3) continue;
        if (i % 2) out.fx.push({ key: `plank|${i % 2}`, cw: 320, ch: 110, draw: (p) => fxPlank(p, i), x, y, z, w: 1.5 + r(), h: 0.52, rot: q((tau * 3 + i) % 6.28, 12) });
        else out.fx.push({ key: "drop", cw: 80, ch: 140, draw: fxDrop, x, y, z, w: 0.35, h: 0.6, rot: -0.5 });
      }
      // foreground: a lamp post, a tipped barrel and crates by the kerb
      prop(out, "lampH", 200, 1100, fxLamp, [-11.4, 0.16, WALK_Z + 0.4], 0.85, { base: 1090 });
      out.fx.push({ key: "barrel|1", cw: 300, ch: 360, draw: (p) => fxBarrel(p, 1), x: -12.6, y: 0.33, z: -0.6, w: 0.75, h: 0.9, rot: 1.45 });
      prop(out, "cartH", 600, 400, (p) => fxHandcart(p, 3), [-10.5, 0, -3.6], 2.6, { base: 385, yaw: 0.9 });
      break;
    }
    case 2: {
      // January 1919, noon: the street busy and ordinary; an El train crosses; a handcart; kids
      elTrain(out, f, 130);
      passers(cam, out, t, 12, -40, 34, 300, 20);
      kp(cam, out, 40, kid(41), -6, 0.16, -WALK_Z - 0.8, { t, expr: "laugh", turn: 0.2, arms: ["wave", "hang"] });
      kp(cam, out, 41, kid(42, true), -5.2, 0.16, -WALK_Z - 1.1, { t, expr: "happy", turn: -0.2, arms: ["hang", "point"] });
      kp(cam, out, 42, police(43), 12, 0.16, WALK_Z + 0.8, { t, expr: "neutral", turn: -0.2, arms: ["hips", "hang"] });
      prop(out, "cart", 600, 400, (p) => fxHandcart(p, 2), [4, 0, -2.6], 2.6, { base: 385 });
      kp(cam, out, 43, resident(44), 5.8, 0, -2.4, { t, view: "side", gait: "walk", phase: q((t * 0.9) % 1, 24), turn: 0.4, expr: "neutral", arms: ["carry", "carry"] }, { dir: [-1, 0] });
      for (let i = 0; i < 4; i++) prop(out, `lamp${i}`, 200, 1100, fxLamp, [-30 + i * 18, 0.16, (i % 2 ? 1 : -1) * (WALK_Z + 0.45)], 0.8, { base: 1090 });
      break;
    }
    case 3: {
      // the resident looks up at the tank: calm, then uneasy on "kill twenty-one people"
      const ex = f < 228 ? "neutral" : "worried";
      kp(cam, out, 1, resident(7), ...RESIDENT, { t, expr: ex, look: [0.35, -0.8], headTilt: -10, turn: 0.25, arms: f < 236 ? ["hang", "hang"] : ["hang", "cup"] });
      kp(cam, out, 2, woman(21), RESIDENT[0] + 4.5, 0, RESIDENT[2] - 3.2, { t, expr: "neutral", turn: -0.3, arms: ["hold", "hang"], hold: ["bundle", null], look: [0.3, -0.4] });
      kp(cam, out, 3, kid(22), RESIDENT[0] + 3.6, 0, RESIDENT[2] - 3.6, { t, expr: "awe", turn: -0.1, arms: ["point", "hang"], look: [0.3, -0.8], headTilt: -8 });
      break;
    }
    case 4: {
      // the seam strains: creak ticks, a crack that grows, rivets popping (sparkles) just before the burst
      const W = TANK.x - TANK.R - 0.2;
      if (f >= 292) { const u = q(clamp01((f - 296) / 26), 24); out.fx.push({ key: `crack|${u}`, cw: 300, ch: 300, draw: (p) => fxCrack(p, u), x: W, y: 6.5, z: TANK.z + 1.6, w: 3, h: 6, yaw: -Math.PI / 2 }); }
      for (let i = 0; i < 3; i++) if (f >= 290 + i * 9) { const tq = q(t * 3 + i, 8); out.fx.push({ key: `creak|${tq}`, cw: 300, ch: 300, draw: (p) => fxCreak(p, tq), x: W - 0.3, y: 4 + i * 2.6, z: TANK.z + 2.6 - i * 1.4, w: 1.6, h: 1.6 }); }
      for (let i = 0; i < 5; i++) sparkle(out, f, 300 + i * 4, 10, [W - 0.4, 5 + i * 1.3, TANK.z + 1.2 + (i % 2) * 0.8], 0.9, 1.6);
      break;
    }
    case 5: {
      const X = waveX(5, f);
      if (X !== null) waveFx(out, 5, f, X);
      // torn plates flung into the yard, the burst flash handled by the overlay
      for (let i = 0; i < 5; i++) { const r = rng(500 + i); out.fx.push({ key: `plate|${i % 3}`, cw: 500, ch: 300, draw: (p) => fxPlate(p, i % 3), x: TANK.x - TANK.R - 4 - r() * 10, y: 1.9 + i * 0.02, z: TANK.z - 6 + r() * 14, w: 4 + r() * 2, h: 2.4, flat: true, rot: r() * 3 }); }
      // a handcart tossed on the crest, the El shaking (kick), people safe on the El platform edge watching
      for (let i = 0; i < 3; i++) kp(cam, out, 30 + i, i % 2 ? woman(60 + i) : resident(60 + i), (X ?? 30) - 22 + i * 1.1, EL_Y + 1.25, -EL_Z + 1.4, { t, expr: "scared", turn: 0.3, arms: i === 1 ? ["cover", "hang"] : ["point", "hang"], look: [0.5, 0.3] }, { shadow: false });
      break;
    }
    case 6: {
      // the two jars on the pans: water (left) vs molasses (right); a falling-arrow hint on "heavier"
      for (let i = 0; i < 2; i++) { const P = ctx.panTop(i); prop(out, `jar|${i}`, 300, 420, (p) => fxJar(p, i), P, 0.3, { base: 410, yaw: 0 }); }
      prop(out, "tagW", 420, 200, (p) => fxTag(p, "WATER", "#6fbfe0"), EX(-0.36, 0.7, 0.75), 0.32, { base: 195, yaw: 0 });
      prop(out, "tagM", 420, 200, (p) => fxTag(p, "MOLASSES", "#7a3a12"), EX(0.36, 0.7, 0.75), 0.32, { base: 195, yaw: 0 });
      if (f >= 520) { const u = clamp01((f - 520) / 10); const P = ctx.panTop(1); out.fx.push({ key: "weight", cw: 160, ch: 200, draw: (p) => { const k = new KPen(p.g); k.poly([[50, 10], [110, 10], [110, 110], [150, 110], [80, 190], [10, 110], [50, 110]], "#f6b924", 9); }, x: P[0], y: P[1] + 0.62 - 0.1 * u, z: P[2] + 0.1, w: 0.16, h: 0.2, glow: 1.1 }); }
      kitFx(out, cam, KFX.dust(t, EX(0, 1.6, -1), [5, 2.5, 2], 24, 6, "#fff4dc"));
      break;
    }
    case 7: {
      const lv = thermoLevel(f), fr = q(clamp01((f - 590) / 50), 12), fl = q(blobFlow(f), 24), tq = q(t, 6);
      prop(out, `thermo|${q(lv, 40)}|${fr}`, 300, 1000, (p) => fxThermo(p, lv, fr), EX(-0.36, 0.7, -0.4), 0.34, { base: 980, yaw: 0 });
      prop(out, "tagC", 420, 200, (p) => fxTag(p, "COLD", "#6fbfe0"), EX(-0.3, 0.7, 0.75), 0.28, { base: 195, yaw: 0 });
      prop(out, "tagG", 420, 200, (p) => fxTag(p, f < 618 ? "RUNNY" : "LIKE GLUE", "#7a3a12"), EX(0.28, 0.7, 0.75), 0.32, { base: 195, yaw: 0 });
      prop(out, `mblob|${fl}|${tq}`, 600, 700, (p) => fxBlob(p, fl, tq), EX(0.24, 0.7, -0.4), 0.72, { base: 700, yaw: 0 });
      kitFx(out, cam, KFX.dust(t, EX(0, 1.8, -1), [5, 3, 2], 40, 7, "#ffffff"));
      break;
    }
    case 8: {
      // dusk, the flooded street: a rescuer wading slowly (legs under the syrup), two more with lanterns further on,
      // a single cap on the surface in the foreground. No one hurt is shown.
      const fy = floodY(8);
      const Rp = RESCUER(f);
      const reach = f >= 690;
      kp(cam, out, 1, police(71), ...Rp, { t, expr: reach ? "sad" : "stern", turn: -0.25, look: [-0.5, 0.8], headTilt: reach ? 12 : 4, lean: reach ? -6 : 0, arms: [reach ? "point" : "hang", "hold"], hold: [null, "lantern"] }, { shadow: false });
      kp(cam, out, 2, sailor(72), 15, fy - 0.5, -2.2, { t, expr: "worried", turn: -0.3, arms: ["hold", "reach"], hold: ["lantern", null] }, { shadow: false });
      kp(cam, out, 3, sailor(73), 17.5, fy - 0.5, 0.8, { t, expr: "stern", turn: -0.4, arms: ["hang", "point"] }, { shadow: false });
      kp(cam, out, 4, resident(74), 21, 0.16, WALK_Z + 0.9, { t, expr: "sad", turn: -0.3, arms: ["cover", "hang"] }, { shadow: false });
      kp(cam, out, 5, woman(75), 22.2, 0.16, WALK_Z + 1.2, { t, expr: "sad", turn: -0.2, arms: ["fold", "fold"] }, { shadow: false });
      out.fx.push({ key: "cap", cw: 400, ch: 260, draw: fxCap, x: CAP[0], y: fy + 0.02, z: CAP[2], w: 0.8, h: 0.52, flat: true, rot: 0.5 + 0.03 * Math.sin(t * 0.7) });
      for (let i = 0; i < 6; i++) { const r = rng(800 + i); out.fx.push({ key: `fplank|${i % 2}`, cw: 320, ch: 110, draw: (p) => fxPlank(p, i), x: 2 + r() * 22, y: fy + 0.03, z: -4 + r() * 8, w: 1.6 + r(), h: 0.5, flat: true, rot: r() * 3 + 0.05 * Math.sin(t * 0.5 + i) }); }
      // lantern glows + lit windows
      { const A = personAnchors(police(71), { t, arms: [reach ? "point" : "hang", "hold"], hold: [null, "lantern"], turn: -0.25 }, Rp); const yaw = Math.atan2(cam.pos.x - Rp[0], cam.pos.z - Rp[2]);
        for (const g of A.glows) { const dx = g.pos[0] - Rp[0]; kitFx(out, cam, [KFX.glowCard("lgR", [Rp[0] + Math.cos(yaw) * dx, g.pos[1], Rp[2] - Math.sin(yaw) * dx + 0.05], 1.6, "#ffc46a", 0.75)]); } }
      kitFx(out, cam, [KFX.glowCard("lg2", [15.35, fy + 0.6, -2.15], 1.0, "#ffc46a", 0.6), KFX.glowCard("lgPool", [Rp[0] + 0.3, fy + 0.03, Rp[2] + 0.4], 3.0, "#ffb860", 0.45, true)]);
      for (let i = 0; i < 10; i++) { const r = rng(870 + i); out.fx.push({ key: "winglow", cw: 128, ch: 128, draw: fxWinGlow, x: -10 + r() * 40, y: 4.5 + Math.floor(r() * 3) * 3.2, z: (r() < 0.5 ? 1 : -1) * 6.95, w: 2.2, h: 2.2, soft: true, add: true, glow: 1.0, opacity: 0.8 }); }
      break;
    }
    case 9: {
      // 1915: the new grey tank, a few workmen and passers-by
      passers(cam, out, t, 6, 20, 40, 900, 50);
      kp(cam, out, 60, workman(61), TANK.x - TANK.R - 4, 0, TANK.z + 4, { t, expr: "neutral", turn: 0.2, arms: ["hips", "hang"] });
      kp(cam, out, 61, workman(62), TANK.x - TANK.R - 6, 0, TANK.z + 2.5, { t, expr: "smile", turn: -0.2, arms: ["point", "hang"], talk: [[25, 26.2]] });
      break;
    }
    case 10: {
      // the kid holds a can under a drip at the seam and grins; a friend watches; drops fall closed-form into the can
      const fill = q(clamp01((f - 800) / 60), 6);
      const pose: Pose = { t, expr: f < 824 ? "smile" : "laugh", turn: 0.3, look: [0.4, -0.3], arms: ["hang", "hold"] };
      const r = kp(cam, out, 1, kid(81), ...KID, pose, { extra: canIn(1, fill), tag: `can${fill}` });
      kp(cam, out, 2, kid(82, true), KID[0] - 0.4, 0, KID[2] + 1.5, { t, expr: "happy", turn: 0.4, arms: ["cup", "hang"], look: [0.5, -0.2] });
      kp(cam, out, 3, resident(83), KID[0] - 5, 0, KID[2] + 3.5, { t, expr: "neutral", turn: 0.4, arms: ["hold", "hang"], hold: ["bundle", null] });
      // where the can is in the world (hand anchor of the card)
      const A = personAnchors(kid(81), r.pose, KID, { flip: r.mirror });
      const hp = A.hands[1] ?? [KID[0], 0.8, KID[2]];
      const yaw = Math.atan2(cam.pos.x - KID[0], cam.pos.z - KID[2]), dx = hp[0] - KID[0];
      const can: V3 = [KID[0] + Math.cos(yaw) * dx, hp[1] + 0.04, KID[2] - Math.sin(yaw) * dx];
      const top = 2.3;
      prop(out, "drip", 80, 260, (p) => fxDrip(p, 0.6), [can[0] + 0.15, top - 0.45, can[2] - 0.05], 0.12, { base: 0 });
      for (let i = 0; i < 3; i++) { const ph = ((t * 0.9 + i / 3) % 1), y = top - 0.5 - (top - 0.5 - can[1]) * ph * ph; out.fx.push({ key: "drop", cw: 80, ch: 140, draw: fxDrop, x: can[0] + 0.15, y, z: can[2] - 0.05, w: 0.07, h: 0.12 }); }
      break;
    }
    case 11: {
      // the company man (top hat, arms folded, a sly little smile), the painter on the ladder covering the streaks
      const close = f < 905;
      kp(cam, out, 1, companyMan(91), ...MANAGER, { t, expr: f < 880 ? "stern" : "sly", turn: close ? -0.15 : -0.3, arms: ["fold", "fold"], idle: 0.25, look: close ? [0.2, -0.4] : [0.5, -0.5], headTilt: close ? -4 : -6 }, { extra: topHat });
      kp(cam, out, 2, workman(92), ...PAINTER, { t, view: "side", turn: 0.25, expr: "neutral", arms: ["hang", "reach"], idle: 0.6 }, { dir: [1, 0], extra: brushIn(1), shadow: false });
      kp(cam, out, 3, workman(93), LADDER.x - 2.6, 0, LADDER.z + 0.7, { t, expr: "neutral", turn: 0.4, arms: ["reach", "hang"], look: [0.4, -0.6], headTilt: -8 });
      prop(out, "bucket", 260, 260, fxBucket, [LADDER.x - 2.0, 0, LADDER.z + 1.4], 0.45, { base: 250 });
      kp(cam, out, 4, resident(94), MANAGER[0] - 6, 0, MANAGER[2] + 3.5, { t, view: "side", gait: "walk", phase: q((t * 0.9) % 1, 24), turn: 0.6, expr: "neutral", arms: ["swing", "swing"] }, { dir: [-1, 0] });
      // brush strokes: a small spatter at the brush while painting
      if (!close && f < 980) { const u = q(((t * 2) % 1), 8); out.fx.push({ key: `spat|${u}`, cw: 300, ch: 300, draw: (p) => { const k = new KPen(p.g, "#10222b", 0); for (let i = 0; i < 6; i++) k.dot(150 + 90 * Math.cos(i + u * 6), 150 + 70 * Math.sin(i * 1.7 + u * 6), 10, MOL.mid); }, x: LADDER.x - 0.1, y: PAINTER[1] + 1.6, z: LADDER.z, w: 0.6, h: 0.6 }); }
      break;
    }
    case 12: {
      // aerial answer: tiny rescuers on the brown sheet, torn plates in the yard, gulls
      const fy = floodY(12);
      for (let i = 0; i < 9; i++) { const r = rng(1200 + i); kp(cam, out, 10 + i, i % 3 ? sailor(1210 + i) : police(1210 + i), 4 + r() * 40, fy - 0.45, -4 + r() * 8, { t, expr: "stern", turn: r() - 0.5, arms: ["hang", "reach"] }, { shadow: false }); }
      for (let i = 0; i < 7; i++) { const r = rng(1300 + i); out.fx.push({ key: `plate|${i % 3}`, cw: 500, ch: 300, draw: (p) => fxPlate(p, i % 3), x: TANK.x - TANK.R - 6 - r() * 18, y: fy + 0.05, z: TANK.z - 10 + r() * 20, w: 5 + r() * 3, h: 3, flat: true, rot: r() * 3 }); }
      for (let i = 0; i < 12; i++) { const r = rng(1400 + i); out.fx.push({ key: `fplank|${i % 2}`, cw: 320, ch: 110, draw: (p) => fxPlank(p, i), x: -20 + r() * 60, y: fy + 0.04, z: -5 + r() * 10, w: 2 + r(), h: 0.6, flat: true, rot: r() * 3 }); }
      gulls(out, t, [30, 22, -4], 20, 5, 13, 1.2);
      break;
    }
    case 13: {
      if (f < 1238) {
        // the hearing: three officials behind the table, the company man standing before them, the public on the bench
        const off: V3[] = [OF(-1.1, 0, -2.3), OF(0, 0.3, -2.5), OF(1.1, 0, -2.3)];
        off.forEach((P, i) => kp(cam, out, 1 + i, official(130 + i), ...P, { t, expr: i === 1 ? "stern" : "neutral", turn: i === 1 ? 0 : (i ? -0.2 : 0.2), arms: i === 1 ? ["hold", "point"] : ["fold", "fold"], hold: [i === 1 ? "letter" : null, null], talk: i === 1 ? [[38.3, 39.2], [39.6, 40.4]] : undefined }, { shadow: false }));
        kp(cam, out, 5, companyMan(91), ...OF(-0.72, 0, 1.3), { t, expr: f < 1175 ? "worried" : "sad", turn: 0.3, arms: ["hang", "hang"], idle: 0.3, look: [0.2, -0.5], headTilt: 8 }, { extra: topHat });
        kp(cam, out, 6, official(152), ...OF(0.78, 0, 1.2), { t, expr: f < 1199 ? "neutral" : "determined", turn: -0.3, arms: ["hold", "hang"], look: [-0.3, -0.3] }, { extra: planIn(0) });
        kp(cam, out, 7, police(153), ...OF(1.75, 0, -1.3), { t, expr: "neutral", turn: -0.3, arms: ["hang", "hang"], idle: 0.4 }, { shadow: false });
      } else {
        // the drafting desk: the plan; the stamp comes down on "sign"; the seal ring spreads
        const P = OF(5.0, 0.955, 0.15), seal = sealAt(f), sq = q(seal, 8), sig = q(clamp01((f - 1262) / 26), 10);
        out.fx.push({ key: `plan|${sq}|${sig}`, cw: 1000, ch: 700, draw: (p) => fxPlan(p, sq, false, sig), x: P[0], y: P[1], z: P[2], w: 1.6, h: 1.12, flat: true, rot: 0 });
        const SP: V3 = [P[0] + 0.576, P[1], P[2] + 0.384], sy = stampY(f);
        prop(out, "stampH", 300, 640, fxStampHand, [SP[0] - 0.02, SP[1] + sy, SP[2]], 0.17, { base: 630, yaw: Math.atan2(cam.pos.x - SP[0], cam.pos.z - SP[2]) });
        if (f >= STAMP_AT && f < STAMP_AT + 16) { const u = q((f - STAMP_AT) / 16, 16); out.fx.push({ key: `ring|${u}`, cw: 500, ch: 500, draw: (p) => fxRingOut(p, u), x: SP[0], y: SP[1] + 0.02, z: SP[2], w: 0.6, h: 0.6, flat: true, soft: true }); }
        if (f >= STAMP_AT) sparkle(out, f, STAMP_AT + 6, 20, [SP[0], SP[1] + 0.1, SP[2]], 0.3, 1.5);
        // the pen that signed (a fountain pen lying by the title block)
        out.fx.push({ key: "pen", cw: 300, ch: 60, draw: (p) => { const k = new KPen(p.g, "#10222b", 6); k.poly(rrect(10, 18, 230, 42, 12), "#1e2226"); k.poly([[230, 22], [290, 30], [230, 38]], "#d6a542"); }, x: P[0] + 0.25, y: P[1] + 0.012, z: P[2] + 0.5, w: 0.22, h: 0.045, flat: true, rot: 0.3 });
        // the engineer of 1919 leaning in at the desk, pen in hand (letter), approving
        kp(cam, out, 20, official(150), ...OF(5.9, 0, -0.75), { t, expr: f < STAMP_AT ? "neutral" : "smile", turn: -0.35, arms: ["hold", "hang"], hold: ["letter", null], look: [-0.4, 0.5], headTilt: 8, lean: -4 }, { shadow: false });
      }
      break;
    }
    case 14: {
      // today: an engineer smiles over a stamped plan on the same desk; a colleague with a rolled plan
      const P = OF(5.0, 0.955, 0.15);
      out.fx.push({ key: "planM", cw: 1000, ch: 700, draw: (p) => fxPlan(p, 1, true), x: P[0], y: P[1], z: P[2], w: 1.6, h: 1.12, flat: true, rot: 0 });
      kp(cam, out, 1, engineer(161), ...OF(5.2, 0, -0.75), { t, expr: "smile", turn: -0.15, arms: ["point", "hang"], look: [-0.2, 0.5], headTilt: 6, talk: [[44.6, 45.4]] }, { shadow: false });
      kp(cam, out, 2, engineer2(162), ...OF(6.6, 0, -0.95), { t, expr: "happy", turn: -0.35, arms: ["hold", "hang"] }, { shadow: false, extra: planIn(0) });
      sparkle(out, f, 1346, 22, [P[0] + 0.5, P[1] + 0.15, P[2] + 0.3], 0.3, 1.5);
      break;
    }
    case 15: {
      // golden hour, before: the resident on his doorstep in profile, looking at the tank; his family at the door
      kp(cam, out, 1, resident(7), ...DOORSTEP, { t, view: "side", turn: 0.35, expr: f < 1405 ? "neutral" : "worried", arms: ["hang", "hang"], look: [0.2, -0.5], headTilt: -6 }, { dir: [1, 0] });
      kp(cam, out, 2, woman(8), 35.3, 0.16, 5.6, { t, expr: "neutral", turn: -0.2, arms: ["hold", "hang"], hold: ["bundle", null] });
      kp(cam, out, 3, kid(9), 35.9, 0.16, 5.95, { t, expr: "smile", turn: -0.1, arms: ["wave", "hang"] });
      passers(cam, out, t, 5, 20, 40, 1500, 30);
      break;
    }
  }
  void smooth; void easeOut; void star; void shade; void rgba; void WATER; void EL_Z; void TOTAL; void fxRollUnused;
  return out;
};
const fxRollUnused = 0;
