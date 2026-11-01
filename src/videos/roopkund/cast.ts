// Roopkund cast as lit flat sprites in the 3D world (pool / actor / effect machinery copied from the Tunguska cast so the two
// films never share module state), plus the Roopkund stage: the trekker, the legend procession (Garhwali-style plain
// outfits: topi, pagri, dupatta), the geneticist, and every effect card (remains, mist, hail, storm, marks, arrows, sparkles).
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "../tunguska/toon";
import { fxArrow, fxSparkle, fxGust } from "../tunguska/art";
import { fxBone, fxSkull, fxMist, fxHail, fxHailBall, fxRingMark, fxPennant, fxTimeline, fxStormCloud } from "./art";
import { FPS, SHOTS, V3, Light, smooth, clamp01, easeOut, TREK, CLUSTER_A, CLUSTER_B, SET_TRAIL, SET_LAB, LAKE_RX, LAKE_RZ, walkX, WALK_GAP, WALK_STOP, stormAt } from "./story";
import { rng } from "../tunguska/paint";
import { NOINK } from "../tunguska/ink";
import { cardShade, blobMaterial, CARD_K } from "../tunguska/cardshade";

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
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = (this.mesh.material === this.soft) ? 2 : 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; glow?: number; opacity?: number; tilt?: number };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun: THREE.Vector3; fov: number; up: THREE.Vector3; fwd: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const tmp = new THREE.Vector3();
let SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
let LNAME: Light = "day";
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return { key, x, y, z, scale, mirror, draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)), size: [w, h, k] };
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
/** width in metres that covers `frac` of the frame width at the distance of p (constant screen size) */
const scr = (cam: CamInfo, p: V3, frac: number) => frac * 2 * cam.pos.distanceTo(tmp.set(...p)) * Math.tan((cam.fov * Math.PI) / 360) * (9 / 16);

// ---------------- the Roopkund cast ----------------
/** present-day trekker: sunflower down jacket, teal trousers, knit beanie */
export const TREKKER: Outfit = { jacket: "#f2b632", pants: "#1f5f66", boots: "#5a3b2a", hat: "beanie", cap: "#2f8f83", sash: "#e8443a", buttons: "#f6efe0", skin: "#c99067", belt: null };
/** legend walkers: plain Garhwali-style dress (no specific community costume): wool topi, pagri, dupatta; cream / teal / mustard */
const PILGRIMS: Outfit[] = [
  { jacket: "#efe4c8", pants: "#e6dcc0", boots: "#6a4a32", hat: "topi", cap: "#3a4a52", sash: "#f2c14e", skin: "#b9805a", moustache: "#2a201a" },
  { jacket: "#2f8f83", pants: "#3b3f52", boots: "#6a4a32", hat: "dupatta", cap: "#e8443a", sash: "#f2c14e", skin: "#c99067", dress: "#d9a441" },
  { jacket: "#7a5a44", pants: "#efe4c8", boots: "#6a4a32", hat: "pagri", cap: "#f2b632", sash: "#e8443a", skin: "#a8724a", build: "stout", moustache: "#2a201a" },
  { jacket: "#efe4c8", pants: "#e6dcc0", boots: "#6a4a32", hat: "topi", cap: "#2f5f66", sash: "#e8443a", skin: "#c99067" },
];
/** the geneticist: white lab coat over teal, dark hair */
const SCIENTIST: Outfit = { jacket: "#f4f1e8", pants: "#1f5f66", boots: "#3a2a22", hat: "hair", hair: "#1e1714", skin: "#b9805a", buttons: "#2f8f83" };

const exprAt = (t: number, cues: [number, Expr][], def: Expr): Expr => { let e = def; for (const [ts, x] of cues) if (t >= ts - LEAD) e = x; return e; };
const frontGuy = (cam: CamInfo, out: Stage, i: number, o: Outfit, x: number, y: number, z: number, fo: FrontOpts, scale = 1, shadow = true) => {
  const { t = 0, ...rest } = fo as FrontOpts & { t?: number };
  out.places.push(person(cam, { i, o, okey: `p${i}${o.hat ?? "x"}` }, x, y, z, { side: false, mirror: false }, { blink: lidAt(t, i), ...rest }, {}, scale));
  if (shadow) blob(out, x, y, z, scale);
};

// ---- remains: seeded bones + skulls lying flat around each group's centre ----
type Bit = { x: number; z: number; rot: number; skull: boolean; k: number; s: number };
const scatter = (c: V3, n: number, R: number, seed: number): Bit[] => {
  const r = rng(seed), out: Bit[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = R * Math.sqrt(r());
    let x = c[0] + Math.cos(a) * d * 1.3, z = c[2] + Math.sin(a) * d * 0.8;
    // never on the ice: push outward past the shore line
    const e = (x / LAKE_RX) ** 2 + (z / LAKE_RZ) ** 2;
    if (e < 1.03) { const k = Math.sqrt(1.03 / e); x *= k; z *= k; }
    out.push({ x, z, rot: r() * Math.PI * 2, skull: i % 3 === 0, k: i, s: 0.85 + 0.35 * r() });
  }
  return out;
};
const REMAINS_A = scatter(CLUSTER_A, 30, 3.6, 11), REMAINS_B = scatter(CLUSTER_B, 24, 3.4, 23);
/** a few remains right by the trekker's spot, so skulls and bones read clearly in the close lake shots (3, 11) */
const REMAINS_C = scatter([-5.6, 0, 29.6], 7, 1.1, 31);
const remains = (cam: CamInfo, out: Stage, bits: Bit[]) => {
  for (const b of bits) {
    if (cam.pos.distanceTo(tmp.set(b.x, 0, b.z)) > 260) continue;
    if (b.skull) out.fx.push({ key: `skull|${b.k % 5}`, cw: 200, ch: 220, draw: (p) => fxSkull(p, b.k % 5), x: b.x, y: 0.2, z: b.z, w: 0.75 * b.s, h: 0.82 * b.s, flat: true, rot: b.rot });
    else out.fx.push({ key: `bone|${b.k % 3}`, cw: 256, ch: 96, draw: (p) => fxBone(p, b.k % 3), x: b.x, y: 0.19, z: b.z, w: 1.1 * b.s, h: 0.41 * b.s, flat: true, rot: b.rot });
  }
};
/** mist wisps drifting over the ice (frame-pure: position = base + speed x time, wrapped) */
const mist = (cam: CamInfo, out: Stage, t: number, n = 7, alpha = 0.7) => {
  for (let i = 0; i < n; i++) {
    const r = rng(500 + i), x0 = (r() - 0.5) * 60, z = (r() - 0.5) * 34, w = 14 + r() * 10;
    const x = ((x0 + 0.6 * t + 30 + 60 * 10) % 60) - 30;
    const fade = Math.min(1, (30 - Math.abs(x)) / 6);
    out.fx.push({ key: `mist|${i % 3}`, cw: 512, ch: 160, draw: (p) => fxMist(p, i % 3), x, y: 1.2 + r() * 2.5, z, w, h: w * 0.31, soft: true, opacity: alpha * clamp01(fade) });
  }
};
const sparkle = (out: Stage, f: number, f0: number, n: number, P: V3, w: number, glow = 1.4) => {
  if (f < f0 || f >= f0 + n) return;
  const u = q((f - f0) / n, 24);
  out.fx.push({ key: `sparkle|${u}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, u), x: P[0], y: P[1], z: P[2], w, h: w, glow });
};
/** a card held at a fixed distance in front of the lens (screen-space overlay that still gets the post chain) */
const onLens = (cam: CamInfo, d: number, sx: number, sy: number): V3 => [
  cam.pos.x + cam.fwd.x * d + cam.right.x * sx + cam.up.x * sy,
  cam.pos.y + cam.fwd.y * d + cam.right.y * sx + cam.up.y * sy,
  cam.pos.z + cam.fwd.z * d + cam.right.z * sx + cam.up.z * sy,
];

/** everything with a face (and every effect card) in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS;
  LNAME = s.light;
  SUN = cam.sun.clone().normalize();
  const [lx, , lz] = SET_LAB, [tx0, , tz0] = SET_TRAIL;
  switch (s.scene) {
    case "lake": {
      remains(cam, out, REMAINS_A); remains(cam, out, REMAINS_B); remains(cam, out, REMAINS_C);
      if (id !== 2) mist(cam, out, t, 7, s.light === "golden" ? 0.45 : 0.7);
      break;
    }
  }
  switch (id) {
    case 3: {
      // the trekker alone at the shore; looks up on "कौन"
      frontGuy(cam, out, 1, TREKKER, TREK[0], 0, TREK[2], { mode: "stand", expr: exprAt(t, [[397 / FPS, "nervous"]], "neutral"), look: f >= 395 ? -1 : 0, headTilt: f >= 395 ? -4 : 0, t } as FrontOpts);
      break;
    }
    case 4: {
      // the procession walks the ridge trail (profile); the hail stops them: they turn to the lens, flinch on "बरसे"
      const stop = f >= WALK_STOP;
      PILGRIMS.forEach((o, i) => {
        const x = tx0 + walkX(f) - i * WALK_GAP, z = tz0 + (i % 2 ? 0.35 : -0.2), ph = ((f - 432) / FPS * 0.95 + i * 0.27) % 1;
        if (!stop) {
          const view = viewOf(cam, x, z, 1, 0);
          const so: SideOpts = { mode: "march", phase: q(ph, 24), expr: i === 2 && f > 540 ? "nervous" : "neutral", stomp: 0.4, stride: 0.55 * view.fs };
          out.places.push(person(cam, { i: 20 + i, o, okey: `pil${i}` }, x, 0, z, view, { mode: "stroll", phase: q(ph, 24) }, so, o.build === "stout" ? 1.02 : 0.97));
          blob(out, x, 0, z);
        } else {
          const flinch = f >= 643 && f < 661 ? 1 - (f - 643) / 18 : 0;
          const ex = exprAt(t, [[600 / FPS, "nervous"], [643 / FPS, "shock"]], "nervous");
          frontGuy(cam, out, 20 + i, o, x, 0, z, { mode: "stand", expr: ex, look: i % 2 ? 1 : -1, headTilt: -5, tilt: (i % 2 ? 7 : -7) * flinch, t } as FrontOpts, o.build === "stout" ? 1.02 : 0.97);
        }
        if (i === 0) { // the pennant over the first walker
          const pw = 0.62, ph2 = 1.86;
          out.fx.push({ key: `pennant|${q((t * 2) % 1, 8)}`, cw: 200, ch: 600, draw: (p) => fxPennant(p, q((t * 2) % 1, 8)), x: x + 0.3 + pw * (0.5 - 40 / 200), y: 0.75 + ph2 / 2, z: z - 0.05, w: pw, h: ph2 });
        }
      });
      // storm: dark cloud cards roll in low over the ridge behind them
      const st = stormAt(4, f);
      if (st > 0.02) for (let i = 0; i < 6; i++) {
        const cx = tx0 + walkX(f) - 30 + i * 13 + 6 * (1 - st), cy = 26 + (i % 2) * 7 - 6 * st, w = 26 + (i % 3) * 6;
        out.fx.push({ key: `storm|${i % 3}`, cw: 600, ch: 300, draw: (p) => fxStormCloud(p, i % 3), x: cx, y: cy, z: tz0 - 60 - (i % 3) * 12, w, h: w / 2, soft: true, opacity: clamp01(st * 1.3) });
      }
      // gust lines on "आसमान", then the hail sheet in front of the lens from ~"लोहे"
      if (f >= 580 && f < 612) { const u = q((f - 580) / 32, 16), P = onLens(cam, 6, -0.2 + 0.9 * u, 0.6); out.fx.push({ key: `gust|${u}`, cw: 600, ch: 300, draw: (p) => fxGust(p, u), x: P[0], y: P[1], z: P[2], w: 1.1, h: 0.55 }); }
      if (f >= 604) {
        const h = 2 * 4 * Math.tan((cam.fov * Math.PI) / 360), w = h * 9 / 16, k = smooth((f - 604) / 14);
        for (const layer of [0, 1]) {
          const u = q((f * (layer ? 0.085 : 0.06)) % 1, 30), P = onLens(cam, layer ? 3.2 : 4.0, 0, 0), sc = layer ? 3.2 / 4 : 1;
          out.fx.push({ key: `hail|${layer}|${u}`, cw: 540, ch: 960, draw: (p) => fxHail(p, u, layer), x: P[0], y: P[1], z: P[2], w: w * sc * 1.04, h: h * sc * 1.04, soft: true, opacity: k * (layer ? 1 : 0.85) });
        }
      }
      break;
    }
    case 5: {
      // the geneticist beside the big screen: points at the crown on "कुछ खोपड़ियों"; an arrow comes down on "ऊपर चोटें";
      // cricket-ball hailstones drop onto the drawing on "ओले"; a dating marker slides back to its place on "करीब आठ सौ पचास"
      frontGuy(cam, out, 5, SCIENTIST, lx + 1.15, 0, lz + 0.9, { mode: "stand", expr: exprAt(t, [[703 / FPS, "stern"], [766 / FPS, "neutral"]], "neutral"), look: -1,
        wave: f >= 700 && f < 790 ? q(0.3 + 0.08 * Math.sin(t * 3), 10) : undefined, t } as FrontOpts, 1, true);
      if (f >= 726 && f < 800) {
        const k = easeOut((f - 726) / 16), y = 4.6 - 1.0 * k;
        out.fx.push({ key: "arrowDown", cw: 300, ch: 600, draw: (p) => fxArrow(p, "#ff7a4a"), x: lx + 0.11, y, z: lz - 2.6, w: 0.28, h: 0.56, glow: 1.05 });
      }
      for (let i = 0; i < 3; i++) {
        const f0 = 776 + i * 9, u = (f - f0) / 14;
        if (u > 0 && u < 1.8) {
          const y = 4.4 - 1.5 * Math.min(1, u) ** 2 + (u > 1 ? 0.25 * Math.sin((u - 1) * Math.PI * 1.25) : 0);
          out.fx.push({ key: "hailball", cw: 128, ch: 128, draw: fxHailBall, x: lx - 0.35 + i * 0.32, y, z: lz - 2.55, w: 0.16, h: 0.16 });
        }
      }
      if (f >= 856) {
        const u = q(smooth((f - 870) / 40), 30);
        out.fx.push({ key: `timeline|${u}`, cw: 900, ch: 200, draw: (p) => fxTimeline(p, u), x: lx, y: 1.95, z: lz - 2.5, w: 1.7, h: 0.38 });
      }
      break;
    }
    case 7: {
      // seated at the desk, DNA on the screens; a sparkle on "डीएनए"
      frontGuy(cam, out, 5, SCIENTIST, lx - 0.9, 0.12, lz + 0.8, { mode: "sit", expr: exprAt(t, [[1092 / FPS, "smile_closed"]], "neutral"), look: f > 1100 ? 1 : 0, t } as FrontOpts, 1, false);
      sparkle(out, f, 1092, 24, [lx + 0.2, 3.25, lz - 2.6], 0.5, 1.5);
      break;
    }
    case 10: {
      // "कम से कम दो हादसे": a ring around each group of remains (yellow = the older group, coral = the later one)
      for (const [c, f0, col] of [[CLUSTER_A, 1595, "#ffc93c"], [CLUSTER_B, 1608, "#ff7a4a"]] as [V3, number, string][]) {
        if (f < f0) continue;
        const u = q(easeOut((f - f0) / 18), 20);
        out.fx.push({ key: `ring|${col}|${u}`, cw: 512, ch: 512, draw: (p) => fxRingMark(p, col, u), x: c[0], y: 0.24, z: c[2], w: 16, h: 16, flat: true, soft: true, glow: 1.2 });
      }
      break;
    }
    case 11: {
      // the trekker in profile at the left of the frame, looking out over the lake
      const view = { side: true, mirror: false };
      out.places.push(person(cam, { i: 1, o: TREKKER, okey: "trek" }, TREK[0], 0, TREK[2], view, {}, { mode: "stand", expr: exprAt(t, [[1872 / FPS, "neutral"]], "neutral"), blink: lidAt(t, 1) }, 1));
      blob(out, TREK[0], 0, TREK[2]);
      break;
    }
    case 12: {
      sparkle(out, f, 2058, 26, [2, 0.6, 2], scr(cam, [2, 0.6, 2], 0.14), 2.0);
      break;
    }
  }
  return out;
};
