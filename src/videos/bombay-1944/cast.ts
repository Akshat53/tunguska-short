// Bombay 1944 cast as lit flat sprites in the 3D world. The pool / actor / effect machinery is copied from the Roopkund
// cast (no shared module state between films); the PEOPLE are the visual kit's v2 characters (src/engine/kit: expressive
// faces with blinks and saccades, idle life, gestures, props, period costume, walk / run cycles), drawn into the same
// 600 x 1000 card (soles at y 975). Firemen are heroes: stern / determined / neutral only, never comic, never falling.
// Cards, effects and blobs live on the NOINK layer (the cards carry their own ink).
import * as THREE from "three";
import { Pen, fxShadow, fxContact, fxBurst, fxPuff, fxSplash } from "../tunguska/toon";
import { fxSparkle, fxBlast, fxPuffCloud, fxWaveRing } from "../tunguska/art";
import { rng } from "../tunguska/paint";
import { NOINK } from "../tunguska/ink";
import { cardShade, blobMaterial, CARD_K } from "../tunguska/cardshade";
import { KPen } from "../../engine/kit/core";
import { drawPerson, star, type Person, type Pose } from "../../engine/kit/people";
import { firefighter, dockWorker, citizen1944, cityWoman, child, elder } from "../../engine/kit/wardrobe";
import { personAnchors } from "../../engine/kit/crowd";
import * as KFX from "../../engine/kit/fx";
import { ship as kShip, crane as kCrane, cargo as kCargo, colonial as kColonial, skyline as kSkyline, gasLamp as kLamp, godown as kGodown } from "../../engine/kit/dock";
import type { Card } from "../../engine/kit/stage";
import {
  fxGoldBar, fxSmoke, fxFire, fxSpray, fxHoseSplash, fxFireEngine, fxHandcart, fxLaundry, fxBird, fxGarland, fxWreath, fxHelmet, fxSkyline, fxHaze, fxDebris, fxGoldCrate,
} from "./art";
import {
  FPS, SHOTS, V3, Light, smooth, clamp01, easeOut, glide, HATCH, HATCH_C, SHIP, FIREMEN, BRIGADE_C, BLAST, BLAST1, BLAST2, fireAt, CT, MM, DR,
  BAR_STREET, BAR_DUSK, RESIDENT, COLUMN, OFFICER, WORKER, BARS_MUD, runX, WATER,
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

const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1440, 2400, 2.4] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : d < 40 ? [240, 400, 0.4] : [150, 250, 0.25];
const tmp = new THREE.Vector3();
let SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
let LNAME: Light = "day";
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---- kit people ----
/** firefighter of 1944 (brass helmet, navy tunic), varied faces by seed */
const FF = (s: number) => firefighter(s);
/** present-day firefighter at the memorial: navy shirt and trousers, peaked cap, belt with brass buttons */
const officerToday = (s: number): Person => {
  const b = citizen1944(s);
  return { ...b, height: 1.0, girth: 1.0, look: { top: "shirt", topCol: "#26344c", bottom: "trousers", bottomCol: "#1e2a3a", hat: "cap", hatCol: "#1e2a3a", hatTrim: "#d6a542",
    feet: "boots", hair: "short", facial: "moustache", extras: ["belt", "brass_buttons"] } };
};
/** 2011 dredger crew: hi-vis jacket, cap */
const crew2011 = (s: number): Person => {
  const b = dockWorker(s);
  return { ...b, look: { ...b.look, top: "jacket", topCol: "#f2c418", trimCol: "#e8e4dc", bottom: "trousers", bottomCol: "#2a3a4a", bottomPat: undefined, hat: "cap", hatCol: "#f6f0e0", feet: "boots" } };
};
/** 1944 clerk with a ledger, and a police constable in khaki */
const CLERK = (s: number): Person => { const b = citizen1944(s); return { ...b, look: { ...b.look, top: "shirt", topCol: "#f3f1ea", bottom: "trousers", bottomCol: "#3a4448", hat: "gandhi", hatCol: "#f8f6ee", extras: [] } }; };
const POLICE = (s: number): Person => { const b = citizen1944(s); return { ...b, look: { ...b.look, top: "shirt", topCol: "#b8a374", topPat: undefined, bottom: "shorts", bottomCol: "#a8946a", hat: "pagri", hatCol: "#c8323a", hatTrim: "#f2b632", feet: "boots", facial: "moustache", extras: ["belt", "brass_buttons"] } }; };
const CITIZENS = (s: number): Person => [citizen1944, cityWoman, dockWorker, elder, citizen1944, cityWoman][s % 6](100 + s);

type KOpt = { scale?: number; dir?: [number, number]; shadow?: boolean };
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
  const key = `K|${i}|${P.seed}|${fkey(p2)}`;
  out.places.push({ key, x, y, z, scale: sc, mirror, draw: (p) => { drawPerson(new KPen(p.g), P, p2); }, size: [w, h, k] });
  if (o.shadow !== false) blob(out, x, y, z, sc);
  return { pose: p2, mirror };
};
/** world position of a kit person's nozzle tip (people.ts anchors) for a camera-facing card at pos */
const nozzleTip = (cam: CamInfo, P: Person, pose: Pose, pos: V3, mirror: boolean, sc = 1): V3 | null => {
  const A = personAnchors(P, pose, [0, 0, 0], { scale: sc });
  const g = A.glows.find((x) => x.col === "nozzle");
  if (!g) return null;
  const dx = g.pos[0] * (mirror ? -1 : 1), yaw = Math.atan2(cam.pos.x - pos[0], cam.pos.z - pos[2]);
  return [pos[0] + Math.cos(yaw) * dx, pos[1] + g.pos[1], pos[2] - Math.sin(yaw) * dx];
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
const scr = (cam: CamInfo, p: V3, frac: number) => frac * 2 * cam.pos.distanceTo(tmp.set(...p)) * Math.tan((cam.fov * Math.PI) / 360) * (9 / 16);

// ---------------- effect helpers (all frame-pure) ----------------
const sparkle = (out: Stage, f: number, f0: number, n: number, P: V3, w: number, glow = 1.4) => {
  if (f < f0 || f >= f0 + n) return;
  const u = q((f - f0) / n, 24);
  out.fx.push({ key: `sparkle|${u}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, u), x: P[0], y: P[1], z: P[2], w, h: w, glow });
};
/** a rising column of smoke puffs from `base`: n puffs cycling with period `life` s, rising `H` m, growing s0 -> s1 m */
type SmokeOpt = { n?: number; life?: number; H?: number; s0?: number; s1?: number; tone?: number; warm?: number; drift?: [number, number]; spread?: number; alpha?: number; seed?: number; glowK?: number };
/** a rising smoke column from `base` (the kit's toon puffs, lit warm from below by `warm`): n puffs alive, rising H m over `life` s */
let CAM: CamInfo;
const smoke = (out: Stage, t: number, base: V3, o: SmokeOpt = {}) => {
  const n = o.n ?? 10, life = o.life ?? 6, H = o.H ?? 20, s1 = o.s1 ?? 12, A = o.alpha ?? 0.92;
  const cards = KFX.smoke(t, base, { rate: n / life, life, rise: H / life, wind: (o.drift?.[0] ?? 0.3) * H / life, size: s1 / 1.5, dark: o.tone ?? 0.5, fire: o.warm ?? 0, seed: o.seed ?? 1, spread: (o.spread ?? 1) * (o.s0 ?? 3) });
  for (const c of cards) c.opacity = (c.opacity ?? 1) * A;
  kitFx(out, CAM, cards, AMB);
};
/** a fire card standing at P (base), w metres wide (kit fireCard, no logs) */
const fire = (out: Stage, t: number, P: V3, w: number, seed: number, glow = 1.5, s = 1) => {
  const tq = q(t, 12), ss = q(s, 4);
  out.fx.push({ key: `fire|${seed % 6}|${tq}|${ss}`, cw: 300, ch: 350, draw: (p) => { p.g.scale(0.5, 0.5); fxFire(p, tq, seed % 6, ss); }, x: P[0], y: P[1] + w * (350 / 300) * 0.45, z: P[2], w, h: w * 350 / 300, glow });
};
/** floating embers around P */
const embers = (out: Stage, t: number, P: V3, R: number, n: number, seed: number) => {
  kitFx(out, CAM, KFX.embers(t, P, { rate: n / 2.6, spread: R, rise: 0.5 + R * 0.3, seed, size: 0.12 }));
};
let AMB = 1;
const birds = (out: Stage, t: number, C: V3, R: number, n: number, seed: number, size = 0.9) => {
  for (let i = 0; i < n; i++) {
    const r = rng(seed * 17 + i), a = t * (0.12 + 0.1 * r()) * (r() > 0.5 ? 1 : -1) + r() * 6.28, rr = R * (0.5 + 0.5 * r());
    const ph = q(((t * (0.9 + 0.5 * r())) + r()) % 1, 8);
    out.fx.push({ key: `bird|${ph}`, cw: 200, ch: 120, draw: (p) => fxBird(p, ph), x: C[0] + Math.cos(a) * rr, y: C[1] + (r() - 0.5) * R * 0.3, z: C[2] + Math.sin(a) * rr * 0.6, w: size, h: size * 0.6 });
  }
};
/** a gold bar flying on a frame-pure arc: starts at `s` frames (of the clock tau) from P0, falls with gravity, spins */
type Bar = { s: number; p0: V3; v: V3; spin: number; a0: number; land?: number };
const barAt = (b: Bar, tau: number): { P: V3; a: number; landed: boolean } | null => {
  const dt = (tau - b.s) / FPS;
  if (dt < 0) return null;
  const end = b.land ?? -1e9;
  const g = 9.8 * 0.55;
  const tl = (() => { if (end < -1e8) return 1e9; const A = 0.5 * g, B = -b.v[1], C = end - b.p0[1]; const disc = B * B - 4 * A * C; return disc < 0 ? 1e9 : (-B + Math.sqrt(disc)) / (2 * A); })();
  const tt = Math.min(dt, tl);
  const P: V3 = [b.p0[0] + b.v[0] * tt, b.p0[1] + b.v[1] * tt - 0.5 * g * tt * tt, b.p0[2] + b.v[2] * tt];
  return { P, a: dt < tl ? b.a0 + b.spin * tt : 0.15, landed: dt >= tl };
};
const goldCard = (out: Stage, P: V3, a: number, glint: number, w: number, glow = 1.15, flat = false, rot = 0) => {
  const gq = q(glint, 6), aq = q(a % (Math.PI * 2), 16);
  out.fx.push({ key: `gold|${aq}|${gq}`, cw: 400, ch: 260, draw: (p) => fxGoldBar(p, aq, gq), x: P[0], y: P[1], z: P[2], w, h: w * 0.65, glow, flat, rot });
};
/** the hook's gold rain (shots 1 and 18 share the clock tau = f for shot 1, f - 1960 for shot 18, so the loop is seamless) */
const RAIN: Bar[] = (() => {
  const r = rng(1944), out: Bar[] = [];
  const starts = [-70, -34, -8, 6, 16, 27, 38, 49, 58, 70, 82, 95, 104];
  starts.forEach((s, i) => {
    const near = i % 3 === 1;
    out.push({ s, p0: CT(-8 + r() * 14, 25 + r() * 6, near ? 3 + r() * 4 : 7 + r() * 12), v: [(r() - 0.5) * 1.4, -1 - r() * 1.5, (r() - 0.5) * 0.8], spin: (r() - 0.5) * 7, a0: r() * 6 });
  });
  out.push({ s: 18, p0: CT(8.6, 28, 9.6), v: [-0.2, -1.2, 0], spin: 3, a0: 1, land: 13.05 }); // lands on the north roof (puff)
  return out;
})();
/** the kit's tumbling gold rain over the roofs (clock tau: frames; same clock across the loop) */
const kitRain = (out: Stage, tau: number) => {
  kitFx(out, CAM, KFX.goldRain(tau / FPS, CT(0.5, 14.5, 6), [14, 9], { n: 46, t0: -2.2, dur: 6.5, groundY: -50, seed: 44, scale: 2.6, g: 3.0 }), 1);
  kitFx(out, CAM, KFX.goldRain(tau / FPS, CT(-1.5, 13.5, 0.5), [6, 3], { n: 14, t0: -1.6, dur: 5.5, groundY: -50, seed: 45, scale: 1.6, g: 2.6 }), 1);
};
const goldRain = (out: Stage, tau: number, f: number, onlyBefore = Infinity) => {
  kitRain(out, tau);
  RAIN.forEach((b, i) => {
    if (b.s > onlyBefore) return;
    const st = barAt(b, tau);
    if (!st || st.P[1] < 6) return;
    const glint = Math.max(0, Math.sin((tau / FPS) * 5 + i * 1.7)) ** 6;
    goldCard(out, st.P, st.a, glint, i % 3 === 1 ? 0.62 : 0.9, 1.2);
    if (glint > 0.3) kitFx(out, CAM, [{ key: "glint", draw: (p: KPen) => star(p, 32, 32, 30, "#ffffff"), dw: 64, dh: 64, w: 0.9 * glint, pos: [st.P[0], st.P[1] + 0.1, st.P[2]], centre: true, face: "camera", lit: false, add: true, glow: 2.5 } as Card]);
    if (st.landed) { const age = (tau - b.s) / FPS - 2.1; void age; }
  });
  void f;
};

/** neighbours on a terrace across the street looking up at the gold (shots 1 and 18: same poses, so the loop matches) */
const neighbours = (cam: CamInfo, out: Stage, t: number) => {
  kp(cam, out, 101, citizen1944(41), ...CT(9.6, 12.98, 12.2), { t, expr: "awe", look: [0, -0.6], headTilt: -8, arms: ["point", "hang"] });
  kp(cam, out, 102, cityWoman(42), ...CT(11.2, 12.98, 12.6), { t, expr: "surprised", look: [0, -0.6], headTilt: -6, arms: ["cup", "hang"] });
  kp(cam, out, 103, child(43), ...CT(10.4, 12.98, 13.0), { t, expr: "awe", look: [0, -0.8], headTilt: -10, arms: ["raise", "hang"] });
};
// ---------------- harbour dressing ----------------
/** a kit prop standing on its drawn base line at pos (fixed facing +z unless yaw given) */
const standee = (key: string, draw: (p: KPen) => unknown, dw: number, dh: number, baseY: number, w: number, pos: V3, extra: Partial<Card> = {}): Card => {
  const h = (w * dh) / dw;
  return { key, draw, dw, dh, w, pos: [pos[0], pos[1] - ((dh - baseY) / dh) * h, pos[2]], face: "fixed", yaw: 0, maxPx: 2048, ...extra };
};
/** the kit's riveted steamer as the Fort Stikine broadside (shots 3 and 6): waterline on the harbour water, alongside the quay */
export const SHIP_CARD = { x: -2, z: -3.2, w: 80 };
const shipCard = (burning: boolean): Card => standee(`kship|${burning ? 1 : 0}`, (p) => kShip(p, 4, burning), 4200, 1500, 1300, SHIP_CARD.w, [SHIP_CARD.x, WATER, SHIP_CARD.z], { maxPx: 2048 });
const dockDressing = (out: Stage, cam: CamInfo, burning: boolean) => {
  kitFx(out, cam, [
    shipCard(burning),
    standee("kcraneA", (p) => kCrane(p, 1, 58), 1400, 2800, 2780, 10, [-30, 0, 3.6]),
    standee("kcraneB", (p) => kCrane(p, 2, 48, "#c9783a"), 1400, 2800, 2780, 10, [16, 0, 3.6]),
    standee("kskyline", (p) => kSkyline(p, 3, burning ? "#8a7a6a" : "#93aeb0"), 5000, 900, 900, 420, [0, WATER, -300], { lit: false }),
    standee("kcolA", (p) => kColonial(p, 1, 0), 2400, 1700, 1690, 46, [-50, WATER, -120]),
    standee("kcolB", (p) => kColonial(p, 2, 0), 2400, 1700, 1690, 42, [40, WATER, -135]),
    standee("kgodown", (p) => kGodown(p, 1), 2000, 1100, 1090, 30, [0, WATER, -100]),
    ...[[-24, 9.5, 0], [-12, 12.5, 1], [8, 8.2, 2], [22, 13.5, 3], [30, 7.0, 4]].map(([x, z, k]) => standee(`kcargo${k}`, (p) => kCargo(p, k), 900, 700, 690, 3.4, [x, 0, z])),
    ...[-20, 0, 20].map((x, i) => standee(`klamp${i}`, (p) => kLamp(p, i), 200, 1100, 1090, 0.75, [x, 0, 16])),
  ], AMB);
};
const DOCKERS: { P: V3; s: number; pose: Pose; dir?: [number, number] }[] = [
  { P: [12, 0, 6.5], s: 21, pose: { expr: "neutral", arms: ["carry", "carry"], hold: [null, "bundle"] } },
  { P: [14.2, 0, 8.4], s: 22, pose: { expr: "smile", arms: ["hips", "hang"], talk: [[0.4, 1.6], [3.0, 4.2]] } },
  { P: [15.6, 0, 7.6], s: 23, pose: { expr: "neutral", turn: -0.4, arms: ["fold", "fold"] } },
  { P: [6.5, 0, 12.5], s: 24, pose: { expr: "neutral", arms: ["hold", "hang"], hold: ["bucket", null] } },
  { P: [20.5, 0, 11.5], s: 25, pose: { expr: "neutral", turn: 0.3, arms: ["hang", "point"] } },
  { P: [3.5, 0, 9.0], s: 26, pose: { expr: "neutral", arms: ["carry", "carry"], hold: [null, "bundle"] } },
  { P: [24, 0, 16], s: 27, pose: { expr: "neutral", arms: ["hang", "hang"] } },
  { P: [-2.5, 0, 14], s: 28, pose: { expr: "neutral", turn: 0.4, arms: ["hips", "hips"] } },
  { P: [9.5, 0, 17.5], s: 29, pose: { expr: "neutral", turn: -0.3, arms: ["hang", "hold"], hold: [null, "letter"] } },
];
const ENGINES: { P: V3; yaw: number }[] = [{ P: [-3.5, 0, 10.5], yaw: Math.PI / 2 }, { P: [-19, 0, 11.5], yaw: -Math.PI / 2 }];
const engines = (out: Stage) => {
  for (const e of ENGINES) out.fx.push({ key: "engine", cw: 1000, ch: 500, draw: fxFireEngine, x: e.P[0], y: 1.25, z: e.P[2], w: 5.2, h: 2.6, yaw: e.yaw });
};
/** a hose jet from a nozzle tip toward a target on the hull (kit waterJet, stops at the hull side) + a splash crown */
const hoseStream = (out: Stage, t: number, A: V3, B: V3, seed: number) => {
  const dx = B[0] - A[0], dz = B[2] - A[2], L = Math.hypot(dx, dz) || 1;
  const cards = KFX.waterJet(t, A, [dx / L, dz / L], { speed: 10.5, pitch: 0.8, seed: 8 + seed, len: 1.1, stopZ: SHIP.z1 + 0.25 });
  kitFx(out, CAM, cards, AMB);
  const end = cards.filter((c) => c.key === "stream").pop();
  if (!end) return;
  const tq = q(t * 2 % 1, 12);
  out.fx.push({ key: `hsplash|${tq}`, cw: 400, ch: 300, draw: (p) => fxHoseSplash(p, tq), x: end.pos[0], y: end.pos[1], z: end.pos[2] + 0.2, w: 1.4, h: 1.05, soft: true, opacity: 0.85 });
};
/** No. 2 hold fire: smoke (amount k) out of the hatch and flames on the coaming */
const holdFire = (out: Stage, t: number, k: number, big = false) => {
  if (k <= 0) return;
  smoke(out, t, [HATCH_C[0], SHIP.deck + 1, HATCH_C[2]], { n: big ? 18 : 10, life: big ? 7 : 5, H: big ? 60 : 14 + 30 * k, s0: 2.5, s1: big ? 26 : 6 + 12 * k, tone: 0.45 + 0.35 * k, drift: [0.35, 0.1], seed: 3, alpha: 0.5 + 0.45 * k });
  const nf = k > 0.5 ? 4 : 2;
  for (let i = 0; i < nf; i++) { fire(out, t, [HATCH.x0 + 1 + i * 1.6, SHIP.deck + 0.9, HATCH.z1 + 0.1 - (i % 2) * 4.8], 1.4 + 1.6 * k, i + 1, 1.6, 0.6 + 0.5 * k); }
  if (big) for (let i = 0; i < 3; i++) fire(out, t, [HATCH.x0 - 4 + i * 6, SHIP.deck + 0.2, -8 + (i - 1) * 3], 3.2, i + 3, 1.6, 1.0);
  embers(out, t, [HATCH_C[0], SHIP.deck + 2, HATCH_C[2]], 6, 10 + Math.round(10 * k), 7);
};
/** a burning ship's big smoke column (shots 6-7) */
const shipColumn = (out: Stage, t: number) => {
  smoke(out, t, [HATCH_C[0] - 2, SHIP.deck + 4, HATCH_C[2]], { n: 22, life: 9, H: 110, s0: 8, s1: 46, tone: 0.72, drift: [0.28, 0.05], seed: 11, alpha: 0.95 });
};
/** floating debris after the blasts: planks and bales on the water */
const flotsam = (out: Stage, t: number, n: number, seed: number) => {
  for (let i = 0; i < n; i++) {
    const r = rng(seed + i), x = -40 + r() * 70 + Math.sin(t * 0.2 + i) * 0.5, z = -4 - r() * 30;
    out.fx.push({ key: `plank|${i % 2}`, cw: 256, ch: 64, draw: (p) => { const g = p.g; g.fillStyle = i % 2 ? "#6a4a2a" : "#e6dcbc"; g.fillRect(4, 8, 248, 48); g.strokeStyle = "#10222b"; g.lineWidth = 6; g.strokeRect(4, 8, 248, 48); }, x, y: WATER + 0.06, z, w: 1.6 + r() * 1.4, h: 0.4, flat: true, rot: r() * 3 });
  }
};

// ---------------- the stage ----------------
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], glow: 0 };
  const s = SHOTS[id - 1], t = f / FPS;
  LNAME = s.light; CAM = cam; AMB = s.light === "dusk" ? 0.8 : s.light === "golden" ? 0.95 : 1;
  SUN = cam.sun.clone().normalize();
  switch (s.scene) {
    case "city": {
      // laundry lines across the street, crows over the roofs, the far smoke column (right of frame in the hook)
      for (let i = 0; i < 4; i++) {
        const x = -20 + i * 11, sway = q(0.5 + 0.5 * Math.sin(t * 1.3 + i), 6);
        const L = CT(x, 7.2 + (i % 2) * 3.2, 0);
        out.fx.push({ key: `laundry|${i}|${sway}`, cw: 800, ch: 300, draw: (p) => fxLaundry(p, i, sway), x: L[0], y: L[1], z: L[2], w: 8.4, h: 3.15, yaw: 0 });
      }
      birds(out, t, CT(4, 26, 14), 10, 5, 3);
      if (id === 1 || id === 18) smoke(out, t, CT(-60, 6, 140), { n: 16, life: 10, H: 120, s0: 14, s1: 46, tone: 0.55, warm: 0.4, drift: [0.15, 0], seed: 21, alpha: 0.9 });
      break;
    }
    case "harbour": {
      if (id <= 8) birds(out, t, [6, 26, -10], 22, 6, 9, 1.1);
      out.fx.push({ key: "skylineFar", cw: 2048, ch: 512, draw: (p) => fxSkyline(p, 5, "#8a9ca4"), x: 0, y: 36, z: -640, w: 900, h: 225, yaw: 0 });
      break;
    }
  }
  switch (id) {
    case 1: {
      goldRain(out, f, f);
      // the bar that lands on the north roof: a tile-dust puff
      const lb = RAIN[RAIN.length - 1], st = barAt(lb, f);
      if (st?.landed) {
        const u = clamp01((f - lb.s) / FPS - 2.0);
        const tl = q(clamp01(((f - lb.s) / FPS - (st ? 0 : 0)) / 1), 1);
        void tl;
        const k = q(clamp01(u * 1.2), 12);
        if (k < 1) out.fx.push({ key: `puff|${k}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, k), x: st.P[0], y: st.P[1] + 0.3, z: st.P[2], w: 2.4, h: 2.4, soft: true });
      }
      // neighbours on a terrace across the street, looking up at the gold
      neighbours(cam, out, t);
      break;
    }
    case 2: {
      // the bar on the cobbles (flat, glinting), people in the street looking up: wonder, then worry on "कीमती कुछ खोया"
      goldCard(out, BAR_STREET, 0, Math.max(0, Math.sin(t * 3.2)) ** 8, 0.42, 1.15, true, 0.5);
      sparkle(out, f, 118, 22, [BAR_STREET[0] + 0.05, BAR_STREET[1] + 0.12, BAR_STREET[2]], 0.5, 1.5);
      sparkle(out, f, 176, 22, [BAR_STREET[0] - 0.05, BAR_STREET[1] + 0.1, BAR_STREET[2]], 0.4, 1.4);
      const ex = f < 190 ? "awe" : "worried";
      kp(cam, out, 1, citizen1944(7), ...RESIDENT, { t, expr: ex, look: [0, -0.7], headTilt: -10, arms: ["hang", "hang"] });
      kp(cam, out, 2, cityWoman(8), ...CT(6.4, 0, 2.6), { t, expr: f < 190 ? "surprised" : "worried", look: [-0.3, -0.6], headTilt: -8, turn: -0.2, arms: ["cup", "hold"], hold: [null, null] });
      kp(cam, out, 3, child(9), ...CT(5.6, 0, 3.0), { t, expr: "awe", look: [0, -0.8], headTilt: -12, arms: ["point", "hang"] });
      kp(cam, out, 4, dockWorker(10), ...CT(2.8, 0, 3.4), { t, expr: f < 190 ? "awe" : "sad", look: [0.2, -0.5], headTilt: -6, turn: 0.3, arms: ["hang", "hold"], hold: [null, "bundle"] });
      kp(cam, out, 5, elder(11), ...CT(8.0, 0, 0.4), { t, expr: "worried", look: [0, -0.5], headTilt: -6, turn: -0.3, arms: ["fold", "fold"] });
      kp(cam, out, 6, citizen1944(12), ...CT(10.5, 0, 2.8), { t, expr: "surprised", look: [0, -0.7], turn: 0.2, arms: ["shield", "hang"] });
      kp(cam, out, 7, cityWoman(13), ...CT(12.5, 0, -1.4), { t, expr: "awe", look: [0.3, -0.6], turn: -0.3, arms: ["hang", "hang"] });
      out.fx.push({ key: "cart|1", cw: 600, ch: 400, draw: (p) => fxHandcart(p, 1), x: CT(-1.6, 0, 3.0)[0], y: 1.0, z: 3.0, w: 3.0, h: 2.0, yaw: 0.2 });
      smoke(out, t, CT(-6, 3, -2), { n: 6, life: 9, H: 6, s0: 4, s1: 8, tone: 0.4, warm: 0.4, drift: [1.2, 0], seed: 41, alpha: 0.35 });
      break;
    }
    case 3: {
      // the ordinary afternoon: dock workers, a clerk, bales going aboard; thin funnel smoke
      dockDressing(out, cam, false);
      DOCKERS.forEach((d, i) => kp(cam, out, 20 + i, dockWorker(d.s), d.P[0] - 12, 0, d.P[2] * 0.8 + 2, { t, ...d.pose }));
      // porters carrying bales along the quay to the gangway (side view walk cycles), a crane hook overhead
      for (let i = 0; i < 6; i++) {
        const r = rng(700 + i), x = 14 - 1.1 * (f - 242) / FPS - i * 3.1 + r(), z = 3.2 + (i % 3) * 1.1;
        kp(cam, out, 130 + i, dockWorker(140 + i), x, 0, z, { t, view: "side", gait: "walk", phase: q(((f - 242) / FPS * 1.0 + r()) % 1, 24), turn: 0.5, expr: i % 2 ? "neutral" : "smile", arms: ["swing", "carry"], hold: [null, "bundle"], talk: i === 2 ? [[9, 10.5]] : undefined }, { dir: [-1, 0] });
      }
      kp(cam, out, 30, citizen1944(31), 3.5, 0, 11.5, { t, expr: "neutral", turn: -0.2, arms: ["hold", "hang"], hold: ["letter", null] });
      for (let i = 0; i < 3; i++) { const x = -14 + i * 9, z = 12 + (i % 2) * 3; out.fx.push({ key: `cart|${i}`, cw: 600, ch: 400, draw: (p) => fxHandcart(p, i), x, y: 1.0, z, w: 3.0, h: 2.0, yaw: 0.3 }); }
      break;
    }
    case 4: {
      sparkle(out, f, 512, 26, [HATCH_C[0] + 1.6, HATCH.cargo + 0.75, HATCH_C[2] + 0.9], 0.9, 1.6);
      sparkle(out, f, 524, 22, [HATCH_C[0] + 2.4, HATCH.cargo + 0.75, HATCH_C[2] - 0.6], 0.7, 1.5);
      break;
    }
    case 5: {
      holdFire(out, t, fireAt(f));
      kp(cam, out, 40, dockWorker(44), HATCH.x0 - 2.5, SHIP.deck, -3.6, { t, expr: f < 590 ? "surprised" : "scared", turn: 0.4, arms: ["point", "hang"] }, { scale: 1 });
      break;
    }
    case 6: case 7: {
      const k = fireAt(f);
      if (id === 6) {
        dockDressing(out, cam, true);
        for (let i = 0; i < 5; i++) fire(out, t, [-22 + i * 4.2, 5.4 + (i % 2) * 0.6, -2.9], 3.2 + (i % 2), i + 2, 1.6, 1.0);
        smoke(out, t, [-14, 7, -4], { n: 16, life: 8, H: 60, s0: 5, s1: 26, tone: 0.6, warm: 0.7, drift: [0.3, 0], seed: 12, alpha: 0.95 });
        embers(out, t, [-14, 6, -2.5], 10, 30, 13);
      } else { holdFire(out, t, k, true); shipColumn(out, t); }
      engines(out);
      // the three firemen bracing on the hose (side view facing the ship), two more feeding the line behind them
      const dir: [number, number] = [0, -1];
      const crews: { P: V3; i: number; nz: boolean; target: V3 }[] = [
        { P: FIREMEN[0], i: 0, nz: true, target: [FIREMEN[0][0] - 9, SHIP.deck + 0.8, SHIP.z1] },
        { P: FIREMEN[1], i: 1, nz: false, target: [0, 0, 0] }, { P: FIREMEN[2], i: 2, nz: false, target: [0, 0, 0] },
        { P: [-5.2, 0, 1.6], i: 3, nz: true, target: [-5.2 - 9, SHIP.deck + 1.6, SHIP.z1] },
        { P: [-16.0, 0, 1.6], i: 5, nz: true, target: [-16 - 8, SHIP.deck + 1.2, SHIP.z1] },
      ];
      for (const c of crews) {
        const ex = c.i === 2 && f < 650 ? "worried" : "stern";
        const pose: Pose = { t, view: "side", turn: 0.35, expr: ex, arms: ["hose", "hose"], hold: [null, c.nz ? "nozzle" : null], lean: 8, idle: 0.6 };
        const P = FF(60 + c.i), r = kp(cam, out, 50 + c.i, P, ...c.P, pose, { dir });
        const tip = c.nz ? nozzleTip(cam, P, r.pose, c.P, r.mirror) : null;
        if (tip) hoseStream(out, t + c.i * 0.3, tip, c.target, c.i);
      }
      kp(cam, out, 54, FF(64), -5.6, 0, 5.4, { t, expr: "shout", turn: 0.4, arms: ["point", "hang"], talk: [[0.2, 1.2], [2.0, 2.8]] });
      // onlookers kept back behind the godown line
      for (let i = 0; i < 6; i++) kp(cam, out, 70 + i, CITIZENS(i), 6 + i * 1.4, 0, 18 + (i % 2) * 1.2, { t, expr: i % 2 ? "worried" : "scared", turn: -0.3, arms: i % 3 ? ["hang", "hang"] : ["cover", "hang"] });
      break;
    }
    case 8: {
      // first blast (fireball + rays + ring over the water + rising cloud), the second on "दूसरा"
      for (const [f0, big, seed] of [[BLAST1, 1, 3], [BLAST2, 0.7, 9]] as [number, number, number][]) {
        const e = (f - f0) / FPS;
        if (e < 0) continue;
        const W = 70 * big;
        if (e < 1.4) { const u = q(clamp01(e / 1.4), 24); out.fx.push({ key: `blast|${u}`, cw: 1000, ch: 1000, draw: (p) => fxBlast(p, u), x: BLAST[0], y: BLAST[1] + 4, z: BLAST[2], w: W * (0.5 + 0.7 * u), h: W * (0.5 + 0.7 * u), glow: 1.5 * (1 - 0.3 * u) }); }
        if (e < 0.6) { const u = q(e / 0.6, 12); out.fx.push({ key: `burst|${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#fff3b0", 14, 60, 240), x: BLAST[0], y: BLAST[1] + 6, z: BLAST[2] + 6, w: W * 1.6, h: W * 1.6, glow: 1.6 }); }
        const k = q(easeOut(clamp01(e / 3.2)), 30), dark = q(clamp01(e / 2.6), 10);
        if (e > 0.25) out.fx.push({ key: `puffc|${k}|${dark}`, cw: 800, ch: 800, draw: (p) => fxPuffCloud(p, k, dark), x: BLAST[0], y: SHIP.deck - 2 + 0.5 * 110 * big * k, z: BLAST[2], w: 110 * big, h: 110 * big });
        if (e < 2.4) { const R = 8 + 70 * easeOut(e / 2.4); out.fx.push({ key: "wavering", cw: 1024, ch: 1024, draw: fxWaveRing, x: BLAST[0], y: WATER + 0.12, z: BLAST[2], w: R * 2 / 0.977, h: R * 2 / 0.977, flat: true, soft: true, opacity: 0.85 * (1 - e / 2.4) }); }
        if (e < 2.2) { const u = q(e / 2.2, 24); out.fx.push({ key: `debris|${seed}|${u}`, cw: 800, ch: 800, draw: (p) => fxDebris(p, u, seed), x: BLAST[0], y: BLAST[1] + 10, z: BLAST[2] + 2, w: 80 * big, h: 80 * big }); }
        if (e < 1.2) { const u = q(e / 1.2, 12); out.fx.push({ key: `splash|${u}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, u), x: BLAST[0] + 10, y: WATER + 8, z: BLAST[2] - 12, w: 40 * big, h: 40 * big }); }
      }
      if (f < BLAST1) { holdFire(out, t, 1, true); shipColumn(out, t); }
      else smoke(out, t, [BLAST[0], 2, BLAST[2]], { n: 14, life: 8, H: 70, s0: 14, s1: 40, tone: 0.75, warm: 0.3, seed: 31, alpha: 0.85 });
      if (f >= BLAST1) for (let i = 0; i < 6; i++) fire(out, t, [-36 + i * 13, 0.2, 18 + (i % 2) * 8], 7, i, 1.6, 1.1);
      break;
    }
    case 9: {
      // fire on the roofs, smoke rolling over the street; people move away down the street (toward the lens)
      const roofs: V3[] = [CT(16, 13.6, 9), CT(25, 15.2, 9.5), CT(8, 12.2, -9), CT(32, 13, -9.5), CT(40, 16, 10)];
      roofs.forEach((P, i) => { fire(out, t, P, 5 + (i % 2) * 2, i, 1.6, 1.1); smoke(out, t, [P[0], P[1] + 3, P[2]], { n: 7, life: 6, H: 30, s0: 4, s1: 16, tone: 0.65, warm: 0.5, drift: [0.2, 0], seed: 50 + i, alpha: 0.9 }); embers(out, t, P, 5, 8, 60 + i); });
      for (let i = 0; i < 7; i++) {
        const r = rng(300 + i), x = -3 + i * 2.2 - 1.25 * (f - 870) / FPS, z = -2.6 + r() * 5.2, ph = q(((f - 870) / FPS * 1.25 / 1.15 + r()) % 1, 24);
        const P = i === 0 ? citizen1944(7) : CITIZENS(i + 2);
        const look = i % 3 === 0;
        kp(cam, out, 10 + i, P, CT(x, 0, z)[0], 0, z, { t, view: "side", gait: "walk", phase: ph, turn: look ? 0.9 : 0.4, expr: look ? "worried" : "sad", arms: i % 2 ? ["swing", "carry"] : ["swing", "swing"], hold: [null, i % 2 ? "bundle" : null] }, { dir: [-1, 0] });
      }
      break;
    }
    case 10: {
      // the empty quay: hoses lie where the men stood (geometry), smoke drifts, the water carries wreckage
      smoke(out, t, [-14, 0, -12], { n: 12, life: 10, H: 30, s0: 8, s1: 22, tone: 0.7, warm: 0.15, drift: [0.4, 0], seed: 71, alpha: 0.7 });
      // what is left of the ship: a burning wreck line low on the water, smoke rolling over the basin
      for (let i = 0; i < 5; i++) fire(out, t, [-30 + i * 9, WATER + 0.2, -9 - (i % 2) * 4], 4 + (i % 2) * 2, i, 1.5, 0.9);
      smoke(out, t, [-20, 0, -10], { n: 14, life: 9, H: 40, s0: 8, s1: 24, tone: 0.75, warm: 0.5, drift: [0.3, 0], seed: 72, alpha: 0.85 });
      embers(out, t, [-14, 1, -6], 10, 20, 73);
      flotsam(out, t, 14, 900);
      break;
    }
    case 11: {
      goldCard(out, BAR_DUSK, 0, Math.max(0, Math.sin(t * 2.6 + 1)) ** 8, 0.42, 1.2, true, -0.35);
      sparkle(out, f, 1003, 22, [BAR_DUSK[0], BAR_DUSK[1] + 0.12, BAR_DUSK[2]], 0.45, 1.6);
      smoke(out, t, CT(-4, 0.5, 2.5), { n: 10, life: 9, H: 8, s0: 4, s1: 9, tone: 0.55, warm: 0.3, drift: [0.6, 0], seed: 81, alpha: 0.5 });
      embers(out, t, CT(-12, 0.6, -0.5), 4, 8, 83);
      // "उसका ज़्यादातर हिस्सा बाद में मिल गया": the recovery on the street, a crate filling with bars, a clerk with the ledger
      const C0 = CT(-9.6, 0, 0.4);
      const gl = Math.max(0, Math.sin(t * 3)) ** 8;
      out.fx.push({ key: `gcrate|${q(gl, 6)}`, cw: 600, ch: 450, draw: (p) => fxGoldCrate(p, q(gl, 6)), x: C0[0], y: 0.62, z: C0[2], w: 1.6, h: 1.2 });
      kp(cam, out, 110, CLERK(111), ...CT(-8.1, 0, 0.0), { t, expr: "neutral", turn: -0.35, look: [-0.4, 0.3], headTilt: 6, arms: ["hold", "hang"], hold: ["letter", null], talk: [[34.6, 35.6]] });
      kp(cam, out, 111, POLICE(112), ...CT(-11.2, 0, -0.4), { t, expr: "stern", turn: 0.35, arms: ["hips", "point"], talk: [[35.0, 36.2]] });
      kp(cam, out, 112, dockWorker(113), ...CT(-10.4, 0, 1.6), { t, expr: "neutral", turn: 0.2, look: [0.2, 0.5], arms: ["carry", "hold"], hold: [null, "gold"] });
      kp(cam, out, 113, dockWorker(114), ...CT(-12.4, 0, 1.5), { t, view: "side", gait: "walk", phase: q((t * 1.1) % 1, 24), turn: 0.6, expr: "neutral", arms: ["swing", "hold"], hold: [null, "gold"] }, { dir: [1, 0] });
      kp(cam, out, 114, POLICE(115), ...CT(-7.0, 0, 2.6), { t, expr: "neutral", turn: -0.4, arms: ["hang", "hang"] });
      kp(cam, out, 115, CITIZENS(4), ...CT(-5.2, 0, 3.2), { t, expr: "worried", turn: -0.5, arms: ["fold", "fold"] });
      break;
    }
    case 12: case 13: {
      // 2011: the dredger crew lean over the hopper; a glint in the mud on "छोटी", one lifts a small bar, surprised
      const lean = f >= 1150 ? 12 : 6;
      const up = f >= 1212;
      const ex = f < 1200 ? "neutral" : f < 1235 ? "surprised" : "happy";
      kp(cam, out, 90, crew2011(91), ...WORKER, { t, expr: ex, turn: 0, look: [0, up ? -0.2 : 0.5], headTilt: up ? -4 : lean, lean: up ? 0 : lean, arms: up ? ["hang", "raise"] : ["hang", "reach"], hold: [null, up ? "gold" : null] });
      kp(cam, out, 91, crew2011(92), ...DR(0.4, 0.75, -3.9), { t, expr: f < 1212 ? "neutral" : "surprised", turn: -0.3, look: [-0.5, 0.2], headTilt: 8, lean: 8, arms: ["hips", "hang"], talk: [[40.5, 41.4]] });
      kp(cam, out, 92, crew2011(93), ...DR(7.4, 0.75, -3.4), { t, expr: "neutral", turn: -0.4, arms: ["fold", "fold"] });
      if (up) kitFx(out, cam, [{ key: "glint", draw: (p: KPen) => star(p, 32, 32, 30, "#ffffff"), dw: 64, dh: 64, w: 0.5 * (0.6 + 0.4 * Math.sin(t * 6)), pos: [WORKER[0] + 0.35, 2.75, WORKER[2] + 0.1], centre: true, face: "camera", lit: false, add: true, glow: 2.4 } as Card]);
      for (let i = 0; i < 2; i++) goldCard(out, [BARS_MUD[0] + i * 0.3, BARS_MUD[1], BARS_MUD[2] + i * 0.12], 0, Math.max(0, Math.sin(t * 3 + i * 2)) ** 8, 0.22, 1.2, true, 0.3 + i * 0.8);
      sparkle(out, f, 1205, 24, [BARS_MUD[0] + 0.1, BARS_MUD[1] + 0.08, BARS_MUD[2]], 0.35, 1.6);
      sparkle(out, f, 1252, 24, [BARS_MUD[0] + 0.2, BARS_MUD[1] + 0.06, BARS_MUD[2] + 0.1], 0.25, 1.6);
      birds(out, t, DR(0, 14, -10), 12, 4, 13, 0.8);
      break;
    }
    case 14: {
      // the brigade stands: three in front, ranks behind in the smoke (stern / neutral, at attention)
      const front: V3[] = [[BRIGADE_C[0] - 1.25, 0, BRIGADE_C[2]], [BRIGADE_C[0], 0, BRIGADE_C[2] + 0.2], [BRIGADE_C[0] + 1.25, 0, BRIGADE_C[2]]];
      front.forEach((P, i) => kp(cam, out, 50 + i, FF(60 + i), ...P, { t, expr: i === 0 ? "stern" : "neutral", arms: ["hang", "hang"], idle: 0.4 }));
      for (let row = 0; row < 3; row++) for (let j = 0; j < 7 + row; j++) {
        const x = BRIGADE_C[0] + (j - (6 + row) / 2) * 1.15 + (row % 2) * 0.3, z = BRIGADE_C[2] - 1.6 - row * 1.5;
        kp(cam, out, 200 + row * 10 + j, FF(80 + row * 10 + j), x, 0, z, { t, expr: "neutral", arms: ["hang", "hang"], idle: 0.3 });
      }
      smoke(out, t, [-10, 0, -10], { n: 10, life: 12, H: 18, s0: 8, s1: 18, tone: 0.65, drift: [0.3, 0], seed: 141, alpha: 0.65 });
      break;
    }
    case 15: {
      // they ran toward the fire (screen right) while everyone else ran away (screen left)
      for (let i = 0; i < 5; i++) {
        const x = runX(f) - i * 1.45, z = 3.4 + (i % 2) * 0.6, ph = q(((f - 1415) / FPS * 1.6 + i * 0.23) % 1, 24);
        kp(cam, out, 50 + i, FF(60 + i), x, 0, z, { t, view: "side", gait: "run", phase: ph, turn: 0.3, expr: "determined", arms: ["swing", "swing"], hold: [null, i === 1 ? "nozzle" : null], lean: 8 }, { dir: [1, 0] });
      }
      for (let i = 0; i < 6; i++) {
        const r = rng(500 + i), x = runX(1415) + 18 - 1.6 * (f - 1415) / FPS - i * 2.1 + r(), z = 1.0 + (i % 2) * 0.8, ph = q(((f - 1415) / FPS * 1.4 + r()) % 1, 24);
        kp(cam, out, 120 + i, CITIZENS(i + 1), x, 0, z, { t, view: "side", gait: "walk", phase: ph, turn: 0.7, expr: i % 2 ? "scared" : "worried", arms: ["swing", i % 3 ? "swing" : "carry"], hold: [null, i % 3 ? null : "bundle"] }, { dir: [-1, 0] });
      }
      for (let i = 0; i < 4; i++) { const P: V3 = [runX(1527) + 8 + i * 7, 0, -1.5 - (i % 2) * 6]; fire(out, t, P, 6, i, 1.6, 1.1); smoke(out, t, [P[0], 3, P[2]], { n: 6, life: 6, H: 26, s0: 4, s1: 14, tone: 0.7, warm: 0.4, seed: 151 + i }); }
      embers(out, t, [runX(f) + 6, 1, 2], 6, 12, 157);
      break;
    }
    case 16: case 17: {
      // Byculla HQ courtyard: the saluting firefighter, two more at attention, helmets on the plinth, garlands, a wreath
      const sal = f >= 1540;
      kp(cam, out, 160, officerToday(161), ...OFFICER, { t, expr: "neutral", turn: -0.35, look: [-0.6, -0.1], arms: sal ? ["hang", "cup"] : ["hang", "hang"], idle: 0.3 });
      kp(cam, out, 161, officerToday(162), ...MM(-2.6, 0, 3.0), { t, expr: "neutral", turn: 0.3, arms: ["hang", "hang"], idle: 0.3 });
      kp(cam, out, 162, officerToday(163), ...MM(4.4, 0, 2.2), { t, expr: "neutral", turn: -0.4, arms: ["hang", "hang"], idle: 0.3 });
      for (let i = 0; i < 9; i++) { const x = -1.6 + i * 0.4; out.fx.push({ key: `helmet|${i % 3}`, cw: 400, ch: 300, draw: (p) => fxHelmet(p, i % 3), x: MM(x, 0, 0)[0], y: 0.8 + 0.135, z: MM(0, 0, 1.6)[2], w: 0.36, h: 0.27 }); }
      out.fx.push({ key: "wreath", cw: 500, ch: 700, draw: fxWreath, x: MM(-1.0, 0, 2.6)[0], y: 0.75, z: MM(0, 0, 2.6)[2], w: 1.07, h: 1.5 });
      for (let i = 0; i < 2; i++) out.fx.push({ key: `garland|${i}`, cw: 600, ch: 300, draw: (p) => fxGarland(p, i), x: MM(i ? 0.42 : -0.42, 0, 0)[0], y: 2.2, z: MM(0, 0, 0.93)[2], w: 0.75, h: 0.37 });
      birds(out, t, MM(0, 16, -6), 14, 5, 17, 0.9);
      // a few people of today with flowers at the courtyard gate
      kp(cam, out, 170, cityWoman(171), ...MM(-6.5, 0, 6.5), { t, expr: "sad", turn: 0.3, arms: ["hold", "hang"], hold: ["bundle", null] });
      kp(cam, out, 171, citizen1944(172), ...MM(-7.6, 0, 7.4), { t, expr: "neutral", turn: 0.35, arms: ["fold", "fold"] });
      kp(cam, out, 172, child(173), ...MM(-5.8, 0, 7.2), { t, expr: "neutral", turn: 0.2, arms: ["hang", "hang"] });
      break;
    }
    case 18: {
      goldRain(out, f - 1960, f);
      for (let i = 0; i < 6; i++) sparkle(out, f, 1800 + i * 19, 26, CT(-2 + i * 2.2, 19 + (i % 3) * 2.5, 6 + (i % 2) * 6), 0.6, 1.5);
      neighbours(cam, out, t);
      break;
    }
  }
  void glide; void scr; void fxHaze; void COLUMN;
  return out;
};
