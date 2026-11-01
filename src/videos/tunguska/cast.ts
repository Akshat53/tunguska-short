// Our cast as lit flat sprites in the 3D world (pool / actor / effect machinery from the bridge short), plus the
// Tunguska stage: two Evenki herders and their reindeer, the 1927 expedition, the sky-watchers, and every effect
// card (fireball, bow shock, airburst, dust ring, needles, straw + hand, arrows, gusts, the last shooting star).
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { reindeer, fxFireball, fxBowShock, fxBlast, fxPuffCloud, fxWaveRing, fxDust, fxNeedles, fxStraw, fxHand, fxArrow, fxGust, fxShootingStar, fxSparkle } from "./art";
import {
  FPS, SHOTS, V3, Light, smooth, clamp01, easeOut, rockAt, DIR, BURST, waveR, arrive, H1, H2, DEER, CAMP, SET_STRAW, SET_TREE, SET_OFFICE,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

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
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
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
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "deer"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; glow?: number; opacity?: number; yaw?: number };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3; fov: number; up: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: Light = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<Light, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], dusk: [0.26, 0.24, 0.4], space: [0.3, 0.3, 0.4] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- the Tunguska cast ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const RU = 2.5 / 700; // reindeer card: 700 design units = 2.5 m, hooves at y = 580
export const DEER_GEO = (() => { const g = new THREE.PlaneGeometry(700 * RU, 600 * RU); g.translate(0, (580 - 300) * RU, 0); return g; })();

export const HERDER1: Outfit = { jacket: "#b8743e", pants: "#5a3b2a", boots: "#8a5a3a", hat: "hood", cap: "#7a4a2e", sash: "#c8323a", buttons: "#f2e6c8", skin: "#e8b98e", moustache: "#3a2a22", build: "stout" };
export const HERDER2: Outfit = { jacket: "#d39a52", pants: "#4a3a40", boots: "#7a4a2e", hat: "hood", cap: "#a0603a", sash: "#2f6fa8", buttons: "#f2e6c8", skin: "#f0c49a" };
const SCIENTIST: Outfit = { jacket: "#6a7a4a", pants: "#4a4a3a", boots: "#3a2a22", hat: "cap", cap: "#8a6a4a", moustache: "#5a4030", skin: "#f5d0b0", belt: "#c9b48a" };
const WATCHERS: Outfit[] = [
  { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#5a3b2a", skin: "#f5c9a0" },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#2a201a", skin: "#c99067" },
  { jacket: "#5d9a6a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#c9a05a", skin: "#ffe2c2" },
  { jacket: "#e08a3c", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a22", skin: "#ecd0b6" },
];

const deerTier = (d: number): [number, number, number] => (d < 5 ? [1400, 1200, 2] : d < 12 ? [700, 600, 1] : [350, 300, 0.5]);
/** a reindeer card at (x, z), facing +x (face = 1) or -x on screen; graze 0..1, walk phase, roll for tumbling */
const deer = (cam: CamInfo, out: Stage, i: number, x: number, y: number, z: number, face: number, graze: number, phase = 0, roll = 0, t = 0) => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1, z));
  const [w, h, k] = deerTier(d);
  const mirror = face * cam.right.x < 0; // the drawing faces +x on the canvas; face = world x direction
  const light = light2D(cam, mirror), blink = lidAt(t, i + 300) > 0.6;
  const o = { phase: q(phase, 24), graze: q(graze, 20), light, coat: ["#8d6446", "#a07a56", "#7a5a44", "#b0906a"][i % 4], blink };
  out.places.push({ key: `deer|${fkey(o)}`, x, y, z, mirror, roll, geo: "deer", draw: (p) => reindeer(p, o), size: [w, h, k] });
  if (!roll) blob(out, x, y, z, 1.5, 0.9);
};
/** width in metres that covers `frac` of the frame width at the distance of p (sprite rule: constant screen size) */
const scr = (cam: CamInfo, p: V3, frac: number) => {
  const d = cam.pos.distanceTo(tmp.set(...p));
  return frac * 2 * d * Math.tan((cam.fov * Math.PI) / 360) * (9 / 16);
};
/** screen-space angle of a world direction at p (for streak cards that must point along their travel) */
const screenAngle = (cam: CamInfo, dir: V3) => Math.atan2(dir[0] * cam.up.x + dir[1] * cam.up.y + dir[2] * cam.up.z, dir[0] * cam.right.x + dir[1] * cam.right.y + dir[2] * cam.right.z);

const fireball = (cam: CamInfo, out: Stage, e: number, frac: number, crack = 0, t = 0) => {
  if (e >= 0 || e < -12) return;
  const P = rockAt(e), w = scr(cam, P, frac), rot = screenAngle(cam, DIR);
  // the card's rock sits at (780, 200) of 1000 x 400: shift the card back along the travel so the rock is at P
  const off = (780 - 500) / 1000 * w;
  const cx = P[0] - (cam.right.x * Math.cos(rot) + cam.up.x * Math.sin(rot)) * off, cy = P[1] - (cam.right.y * Math.cos(rot) + cam.up.y * Math.sin(rot)) * off,
    cz = P[2] - (cam.right.z * Math.cos(rot) + cam.up.z * Math.sin(rot)) * off;
  const fl = q((t * 3) % 1, 8), ck = q(crack, 10);
  out.fx.push({ key: `fireball|${ck}|${fl}`, cw: 1000, ch: 400, draw: (p) => fxFireball(p, ck, fl), x: cx, y: cy, z: cz, w, h: w * 0.4, rot, glow: 1.12 });
};
const blast = (cam: CamInfo, out: Stage, e: number, at: V3, frac: number) => {
  if (e < 0) return;
  if (e < 0.9) {
    const u = q(e / 0.9, 30), w = scr(cam, at, frac) * (0.6 + 0.6 * u);
    out.fx.push({ key: `blast|${u}`, cw: 1000, ch: 1000, draw: (p) => fxBlast(p, u), x: at[0], y: at[1], z: at[2], w, h: w, glow: 1.35 * (1 - 0.25 * u) });
  }
  if (e > 0.5 && e < 30) {
    const k = q(Math.min(1, 0.55 + (e - 0.5) * 0.25), 30), dark = q(clamp01((e - 0.6) / 3), 20), w = scr(cam, at, frac) * 1.1;
    out.fx.push({ key: `puff|${k}|${dark}`, cw: 800, ch: 800, draw: (p) => fxPuffCloud(p, k, dark), x: at[0], y: at[1] + 0.12 * w * k, z: at[2], w, h: w, glow: 1.0, soft: false });
  }
};
/** the ground ring of the blast wave + dust billows riding its front (only on the near part of the ring) */
const waveRing = (cam: CamInfo, out: Stage, e: number, maxR = 520, dust = 18) => {
  const R = waveR(e);
  if (R <= 1 || R > maxR) return;
  out.fx.push({ key: "wavering", cw: 1024, ch: 1024, draw: fxWaveRing, x: 0, y: 0.6, z: 0, w: R * 2 / 0.977, h: R * 2 / 0.977, flat: true, soft: true, opacity: 0.85 });
  for (let i = 0; i < dust; i++) {
    const a = (i / dust) * Math.PI * 2 + 0.13, x = R * Math.sin(a), z = R * Math.cos(a), s = 12 + R * 0.06;
    const u = q(((e * 1.7 + i * 0.37) % 1), 12);
    out.fx.push({ key: `dust|${u}|${i % 3}`, cw: 400, ch: 300, draw: (p) => fxDust(p, u, i % 3), x, y: s * 0.32, z, w: s, h: s * 0.75, soft: false });
  }
};
const needles = (out: Stage, t: number, pts: V3[], k: number, size = 0.9) =>
  pts.forEach(([x, y, z], i) => {
    if (k <= 0 || k >= 1) return;
    const a = i * 2.4, r = 2 + 9 * k, u = q((t * 2 + i * 0.3) % 1, 6);
    out.fx.push({ key: `needles|${u}`, cw: 120, ch: 120, draw: (p) => fxNeedles(p, u), x: x + r * Math.cos(a), y: y + 3 * Math.sin(k * Math.PI) - 6 * k * k, z: z + r * Math.sin(a), w: size, h: size, rot: a + t * 4 });
  });

const exprAt = (t: number, cues: [number, Expr][], def: Expr): Expr => { let e = def; for (const [ts, x] of cues) if (t >= ts - LEAD) e = x; return e; };
const herder = (cam: CamInfo, out: Stage, i: number, o: Outfit, x: number, y: number, z: number, fo: FrontOpts, scale = 1, shadow = true) => {
  const { t = 0, ...rest } = fo as FrontOpts & { t?: number }; // t only drives the blinks (never part of the canvas key)
  out.places.push(person(cam, { i, o, okey: `h${i}${o.hat ?? "x"}` }, x, y, z, { side: false, mirror: false }, { blink: lidAt(t, i), ...rest }, {}, scale));
  if (shadow) blob(out, x, y, z, scale);
};

/** everything with a face (and every effect card) in shot `id` at frame f */
export const stage = (id: number, f: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], t = f / FPS, e = s.e(f);
  LNAME = s.light;
  findSun(cam, SUN);
  const camp = (who: "both" | "h1", ex1: Expr, ex2: Expr, extra1: Partial<FrontOpts> = {}, extra2: Partial<FrontOpts> = {}) => {
    herder(cam, out, 1, extra1.prop === "hatHeld" ? { ...HERDER1, hat: null } : HERDER1, H1[0], 0, H1[2], { mode: "stand", expr: ex1, facing: 1, ...extra1, t } as FrontOpts);
    if (who === "both") herder(cam, out, 2, HERDER2, H2[0], 0, H2[2], { mode: "stand", expr: ex2, facing: -1, ...extra2, t } as FrontOpts, 0.94);
  };
  const herd = (graze = true) => DEER.forEach(([x, z, ph, face], i) => deer(cam, out, i, x, 0, z, face, graze ? 0.5 + 0.5 * Math.sin(t * 0.9 + ph * 6) : 0, 0, 0, t));

  switch (id) {
    case 1: {
      fireball(cam, out, e, 0.32, 0, t);
      blast(cam, out, e, BURST, 0.42);
      waveRing(cam, out, e, 520, 22);
      break;
    }
    case 3: {
      camp("both", exprAt(t, [[8.4, "smile_closed"]], "smile"), exprAt(t, [[8.0, "grin"]], "smile_closed"));
      herd();
      break;
    }
    case 4: {
      // "Then a light brighter than the sun" -> shock, looking up; "gunfire" -> flinch
      const flinch = f >= 362 && f < 380 ? (1 - (f - 362) / 18) : 0;
      camp("both", exprAt(t, [[310 / FPS, "shock"], [364 / FPS, "pained"], [384 / FPS, "shock"]], "neutral"), exprAt(t, [[312 / FPS, "shock"], [366 / FPS, "nervous"]], "smile"),
        { look: 1, tilt: -6 * flinch, headTilt: -4 }, { look: 1, tilt: 7 * flinch, headTilt: -3 });
      DEER.forEach(([x, z, ph, face], i) => deer(cam, out, i, x, 0, z, face, f > 312 ? 0 : 0.6, 0, 0, t));
      fireball(cam, out, e, 0.16, 0, t);
      break;
    }
    case 5: case 6: {
      const crack = id === 6 ? clamp01((f - 645) / 18) : 0;
      fireball(cam, out, e, id === 5 ? (f < 478 ? 0.75 : 0.9) : 1.0, crack, t);
      if (id === 6) {
        const sq = q(smooth((f - 552) / 90), 20), P = rockAt(e), w = scr(cam, P, 0.6);
        const rot = screenAngle(cam, DIR), ox = 0.25 * w; // cap sits just ahead of the rock along the travel
        out.fx.push({ key: `bow|${sq}`, cw: 600, ch: 600, draw: (p) => fxBowShock(p, sq), x: P[0] + (cam.right.x * Math.cos(rot) + cam.up.x * Math.sin(rot)) * ox,
          y: P[1] + (cam.right.y * Math.cos(rot) + cam.up.y * Math.sin(rot)) * ox, z: P[2] + (cam.right.z * Math.cos(rot) + cam.up.z * Math.sin(rot)) * ox, w, h: w, rot, glow: 1.15 });
      }
      break;
    }
    case 7: {
      fireball(cam, out, e, 0.2, 1, t);
      blast(cam, out, e, BURST, 0.55);
      waveRing(cam, out, e, 520, 24);
      break;
    }
    case 8: {
      blast(cam, out, e, BURST, 0.3);
      waveRing(cam, out, e, 540, 26);
      break;
    }
    case 9: {
      // dust + needles riding the front where it crosses the lens's ray
      const R = waveR(e);
      for (let i = -3; i <= 3; i++) {
        const a = -0.9 + i * 0.05, u = q((t * 1.6 + i * 0.3) % 1, 10), sz = 9;
        out.fx.push({ key: `dust|${u}|${(i + 3) % 3}`, cw: 400, ch: 300, draw: (p) => fxDust(p, u, (i + 3) % 3), x: R * Math.sin(a), y: 2.6, z: R * Math.cos(a), w: sz, h: sz * 0.75 });
      }
      break;
    }
    case 10: {
      const u = e - arrive(318);
      const fly = clamp01(u / 1.2), away: V3 = [CAMP[0] / 318, 0, CAMP[2] / 318];
      const pose = (k: number, i: number): [number, number, number, number] => {
        const s2 = Math.max(0, u - 0.05 * i), d = 7 * easeOut(s2 / 1.1), y = Math.max(0, 4.2 * Math.sin(Math.min(1, s2 / 1.1) * Math.PI));
        return [d * away[0], y, d * away[2], k * s2 * 3.2];
      };
      const ex: Expr = u > 0 ? "shock" : "nervous";
      [[H1, HERDER1, 1, 1], [H2, HERDER2, 2, 0.94]].forEach(([P, o, i, sc]) => {
        const [dx, dy, dz, rr] = pose(i === 1 ? 1 : -1, i as number);
        const pp = P as V3;
        herder(cam, out, i as number, (u > 0.15 ? { ...(o as Outfit), hat: null } : (o as Outfit)), pp[0] + dx, dy, pp[2] + dz, { mode: u > 0 ? "fall" : "stand", expr: ex, tilt: (rr * 180) / Math.PI * 0.4, t } as FrontOpts, sc as number, dy < 0.3);
        if (u > 0.15) { // the fur hats fly off on their own
          const k = clamp01((u - 0.15) / 1.2);
          out.fx.push({ key: `hat${i}`, cw: 200, ch: 200, draw: (p) => { p.ell(100, 120, 70, 58, (o as Outfit).cap!, 9, 180, 360); p.band([[26, 124], [174, 124]], "#f4ecdc", 22, 7, "round"); p.ell(100, 50, 15, 15, "#d8343a", 7); },
            x: pp[0] + dx * 1.3 + (i === 1 ? -1 : 1), y: 2.2 + 3.5 * Math.sin(k * Math.PI), z: pp[2] + dz * 1.3, w: 0.5, h: 0.5, rot: k * 9 });
        }
      });
      DEER.forEach(([x, z, , face], i) => {
        const s2 = Math.max(0, u - 0.08 * i), d = 4 * easeOut(s2 / 1.2);
        deer(cam, out, i, x + d * away[0], 0.4 * Math.sin(Math.min(1, s2) * Math.PI), z + d * away[2], face, 0, 0, u > 0 ? -face * Math.min(1.6, s2 * 2.5) : 0, t);
      });
      if (u > 0) for (let i = 0; i < 8; i++) {
        const a = i * 0.8, r = 4 + 6 * clamp01(u), uu = q((u * 1.4 + i * 0.13) % 1, 10);
        out.fx.push({ key: `dust|${uu}|${i % 3}`, cw: 400, ch: 300, draw: (p) => fxDust(p, uu, i % 3), x: CAMP[0] - 8 + r * Math.cos(a), y: 1.4, z: CAMP[2] - 8 + r * Math.sin(a) * 0.5, w: 6, h: 4.5 });
      }
      needles(out, t, [[CAMP[0] - 6, 6, CAMP[2] - 10], [CAMP[0] + 4, 7, CAMP[2] - 14], [CAMP[0] - 14, 5, CAMP[2] - 6]], clamp01(u / 1.4), 1.0);
      break;
    }
    case 12: {
      // the hidden one: behind the big pole from the lens, peeks out on "Stripped bare" and smiles on "standing"
      if (f >= 1150) {
        const peek = smooth((f - 1170) / 10) * 0.45 - smooth((f - 1188) / 6) * 0.15 + smooth((f - 1196) / 8) * 0.12;
        const ex = exprAt(t, [[1196 / FPS, "smile"]], "nervous");
        // pole at (-9.5, 9.5); the lens looks along (-6, -13): hide 0.9 m behind it on that ray, slide out to screen-left
        const bx = -9.5 - 0.42, bz = 9.5 - 0.9;
        herder(cam, out, 2, HERDER2, bx - cam.right.x * peek * 1.2, 0, bz - cam.right.z * peek * 1.2, { mode: "stand", expr: ex, look: -1, t } as FrontOpts, 0.94);
      }
      break;
    }
    case 13: {
      blast(cam, out, e, BURST, 0.5);
      if (e > 0) {
        const k = clamp01(e / 1.1);
        for (const [x, z] of [[-8, 4], [6, -3], [0, 9]]) {
          const y = 34 - 20 * easeOut(k), sz = 9;
          out.fx.push({ key: "arrow", cw: 300, ch: 600, draw: (p) => fxArrow(p), x, y, z, w: sz * 0.5, h: sz, glow: 1.05 });
        }
        needles(out, t, [[4, 9, 3], [-6, 11, -4], [2, 12, -8], [-3, 8, 8], [9, 10, -2]], clamp01(e / 1.5), 1.1);
      }
      break;
    }
    case 14: {
      // straw on a stump: hand presses from the top (holds), then from the side (folds on "sideways")
      const [sx, sy, sz] = SET_STRAW, top = 1.36;
      const press = smooth((f - 1318) / 8) - smooth((f - 1346) / 8), side = smooth((f - 1360) / 8), fold = smooth((f - 1368) / 7);
      const squash = q(press * 0.8, 10);
      out.fx.push({ key: `straw|${squash}|${q(fold, 14)}`, cw: 300, ch: 1000, draw: (p) => fxStraw(p, squash, q(fold, 14)), x: sx, y: sy + 0.86 + 0.5 - 0.96 * 0.5 + 0.02, z: sz, w: 0.15, h: 0.5 });
      if (press > 0.01 && f < 1356) out.fx.push({ key: "hand", cw: 400, ch: 300, draw: (p) => fxHand(p), x: sx, y: sy + top + 0.1 + 0.25 * (1 - press) - 0.03 * squash, z: sz, w: 0.36, h: 0.27, rot: -Math.PI / 2 });
      if (side > 0.01) out.fx.push({ key: "hand", cw: 400, ch: 300, draw: (p) => fxHand(p), x: sx - 0.33 - 0.25 * (1 - side) + 0.12 * fold, y: sy + 1.16 - 0.02 * fold, z: sz + 0.01, w: 0.36, h: 0.27 });
      break;
    }
    case 15: {
      const u = clamp01((f - 1414) / 12);
      if (f > 1408 && f < 1440) out.fx.push({ key: `gust|${q(u, 10)}`, cw: 600, ch: 300, draw: (p) => fxGust(p, q(u, 10)), x: SET_TREE[0] - 6 + 3 * u, y: 6.5, z: SET_TREE[2] + 0.5, w: 6, h: 3 });
      break;
    }
    case 16: {
      blast(cam, out, e, BURST, 0.25);
      waveRing(cam, out, e, 520, 20);
      const R = waveR(e);
      if (f >= 1470 && f < 1531 && R > 40) for (let i = 0; i < 8; i++) { // outward arrows on the ring: sideways push
        const a = (i / 8) * Math.PI * 2 + 0.2, rr = Math.min(R, 470) - 30;
        out.fx.push({ key: "arrowO", cw: 300, ch: 600, draw: (p) => fxArrow(p, "#ff6a3a"), x: rr * Math.sin(a), y: 2, z: rr * Math.cos(a), w: 22, h: 44, flat: true, rot: -a + Math.PI });
      }
      if (f >= 1536) for (const [x, z] of [[-14, 6], [10, -6], [2, 14]]) { // middle: straight down
        const k = q(((f - 1536) / 20) % 1, 20), y = 40 - 18 * k;
        out.fx.push({ key: "arrow", cw: 300, ch: 600, draw: (p) => fxArrow(p, "#ff6a3a"), x, y, z, w: 7, h: 14, glow: 1.05 });
      }
      break;
    }
    case 17: {
      const ex = exprAt(t, [[1599 / FPS, "nervous"], [1631 / FPS, "stern"], [1648 / FPS, "nervous"]], "neutral");
      herder(cam, out, 1, HERDER1, 2.0, 0, 4.2, { mode: "stand", expr: ex, look: f < 1631 ? -1 : f < 1648 ? 1 : 0, facing: 1, t } as FrontOpts);
      break;
    }
    case 18: {
      // 1927: Kulik's expedition, guided by an Evenki herder, plods in toward ground zero
      const u = (f - 1665) / FPS, dir: V3 = [0.62, 0, -0.78], ph = (u * 0.9) % 1;
      const base: V3 = [-131.5, 0, 160.5];
      const walk = (k: number): V3 => [base[0] + dir[0] * (0.8 * u - k), 0, base[2] + dir[2] * (0.8 * u - k)];
      const [ax, , az] = walk(0), [bx, , bz] = walk(2.0), [dx, , dz] = walk(4.4);
      const view = viewOf(cam, ax, az, dir[0], dir[2]);
      const so: SideOpts = { mode: "march", phase: q(ph, 24), expr: "dazed", stomp: 0.5, stride: 0.6 * view.fs };
      out.places.push(person(cam, { i: 5, o: SCIENTIST, okey: "sci" }, ax, 0, az, view, { mode: "stroll", phase: q(ph, 24), expr: "dazed" }, so));
      blob(out, ax, 0, az);
      const so2: SideOpts = { mode: "march", phase: q((ph + 0.3) % 1, 24), expr: "smile", stomp: 0.5, stride: 0.6 * view.fs };
      out.places.push(person(cam, { i: 2, o: HERDER2, okey: "h2w" }, bx, 0, bz, view, { mode: "stroll", phase: q((ph + 0.3) % 1, 24), expr: "smile" }, so2, 0.94));
      blob(out, bx, 0, bz, 0.94);
      deer(cam, out, 1, dx, 0, dz, (dir[0] * cam.right.x + dir[2] * cam.right.z > 0 ? 1 : -1) * Math.sign(cam.right.x || 1), 0, (u * 0.8) % 1, 0, t);
      break;
    }
    case 19: {
      // sky-watchers at their desks (office set): four sit facing the screens, one spots the hidden asteroid and points
      const [ox, , oz] = SET_OFFICE;
      [[-6.6, 0], [-2.6, 1], [1.4, 2], [5.0, 3]].forEach(([dx, k], i) => {
        const spot = i === 2 && f >= 1856;
        const ex: Expr = spot ? exprAt(t, [[1856 / FPS, "shock"], [1872 / FPS, "grin"]], "neutral") : (["neutral", "smile", "neutral", "smile_closed"] as Expr[])[i];
        herder(cam, out, 10 + i, WATCHERS[k], ox + dx, 0.12, oz + 1.1, { mode: "sit", expr: ex, look: spot ? -1 : 0, wave: spot ? q(Math.sin(t * 6) * 0.3, 10) : undefined, t } as FrontOpts, 1, false);
      });
      if (f >= 1866 && f < 1890) {
        const u = q((f - 1866) / 24, 24);
        out.fx.push({ key: `sparkle|${u}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, u), x: ox + 3.0 + 0.32, y: 1.62, z: oz - 0.3, w: 0.5, h: 0.5, glow: 1.6 });
      }
      break;
    }
    case 20: {
      const doff = f >= 1984 ? "hatHeld" : null;
      camp("both", exprAt(t, [[1984 / FPS, "smile_closed"], [2040 / FPS, "grin"]], "smile"), exprAt(t, [[2044 / FPS, "grin"]], "smile"),
        { prop: doff, look: f > 2030 ? 1 : 0 }, { wave: f >= 2048 ? q(Math.sin(t * 9), 10) : undefined, look: f > 2030 ? 1 : 0 });
      herd();
      // "It will not always be this lucky": a little shooting star, and the final spark burst where it dies
      if (f >= 2026 && f < 2050) {
        const u = (f - 2026) / 24, P: V3 = [-30 + 60 * u, 150 - 22 * u, 40 - 30 * u], w = scr(cam, P, 0.22);
        out.fx.push({ key: "sstar", cw: 600, ch: 200, draw: fxShootingStar, x: P[0], y: P[1], z: P[2], w, h: w / 3, rot: screenAngle(cam, [60, -22, -30]), glow: 2.2 });
      }
      if (f >= 2047) {
        const u = q(Math.min(1, (f - 2047) / 26), 26), P: V3 = [30, 128, 10], w = scr(cam, P, 0.3);
        out.fx.push({ key: `fburst|${u}`, cw: 400, ch: 400, draw: (p) => fxSparkle(p, u), x: P[0], y: P[1], z: P[2], w, h: w, glow: 2.0 });
      }
      break;
    }
  }
  return out;
};
