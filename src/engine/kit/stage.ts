// Visual kit: a small three.js "card stage" for kit scenes. Everything with ink (people, props, buildings, ships, trees,
// particles) is a canvas card standing in the 3D world: parallax and depth come from real positions, the lighting is a
// per-card colour multiplier (moonlight / daylight ambient + every fire's flickering warm light by distance) plus a rim
// light baked into the canvas on the side facing the strongest fire. Cards are cached by key and re-drawn only when the
// key changes, at a resolution picked from their on-screen size. Also: gradient sky, stars, ground planes, a water plane
// with ripples, and mirrored, wobbling reflections. All on the NOINK layer (the cards carry their own ink).
// Everything is a pure function of what the caller passes for the frame (no clocks, no randomness).
import * as THREE from "three";
import { KPen, clamp, fbm1, hash, rgb01 } from "./core";

export const KIT_NOINK = 3; // same layer id as src/videos/tunguska/ink.ts NOINK
export type V3 = [number, number, number];
export type Face = "yaw" | "camera" | "fixed" | "flat";
export type Card = {
  key: string; draw: (p: KPen) => unknown;
  dw: number; dh: number;              // design units of the drawing (the canvas is scaled to fit)
  w: number;                           // world width (m); height = w * dh / dw
  pos: V3;                             // bottom-centre (or centre with centre: true)
  centre?: boolean; face?: Face; yaw?: number; rot?: number; flip?: boolean;
  lit?: boolean;                       // default true: ambient + fire light multiply the card
  glow?: number;                       // extra multiplier (> 1 blooms)
  add?: boolean; soft?: boolean; opacity?: number; fog?: boolean;
  rim?: boolean;                       // bake a warm rim from the nearest fire (people, default false)
  reflect?: boolean; maxPx?: number; order?: number; tintMul?: [number, number, number];
};
export type FireLight = { pos: V3; col: string; power: number; radius: number; seed: number };
export type Lighting = {
  ambient: [number, number, number];   // card multiplier far from any fire
  skyStops: string[]; skyEl: number[]; // gradient sky by elevation (deg)
  fog: string; fogNear: number; fogFar: number;
  fires: FireLight[];
  water?: { deep: string; shallow: string; glint: string };
};

/** deterministic fire flicker 0.75..1.15 */
export const flicker = (t: number, seed: number) => 0.95 + 0.12 * fbm1(t * 6.5, seed) + 0.06 * fbm1(t * 17.3, seed + 5);

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
const TIERS = [64, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048];
class CardPool {
  private live = new Map<string, Entry>(); private free: Entry[] = []; private used = new Set<string>();
  get(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    const k = `${w}x${h}|${key}`;
    this.used.add(k);
    let e = this.live.get(k);
    if (!e) {
      const i = this.free.findIndex((x) => x.w === w && x.h === h);
      if (i >= 0) e = this.free.splice(i, 1)[0];
      else {
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        e = { cv, tex, w, h };
      }
      const g = e.cv.getContext("2d")!;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
      draw(g);
      e.tex.needsUpdate = true;
      this.live.set(k, e);
    }
    return e.tex;
  }
  /** end of frame: recycle what was not used (keeps memory flat across a long render) */
  sweep() {
    for (const [k, e] of this.live) if (!this.used.has(k)) { this.live.delete(k); if (this.free.length < 64) this.free.push(e); else e.tex.dispose(); }
    this.used.clear();
  }
}

/** warm rim light baked into a drawn card: overlay-blend a band along the silhouette edge that faces `ang` (canvas radians) */
const rimLight = (g: CanvasRenderingContext2D, w: number, h: number, ang: number, col: string, k: number) => {
  if (k <= 0.02) return;
  const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
  const t = tmp.getContext("2d")!, d = Math.max(2, Math.round(h * 0.006));
  t.drawImage(g.canvas, 0, 0);
  t.globalCompositeOperation = "source-in"; t.fillStyle = col; t.fillRect(0, 0, w, h);
  t.globalCompositeOperation = "destination-out";
  t.drawImage(g.canvas, -Math.cos(ang) * d * 2.2, -Math.sin(ang) * d * 2.2);
  g.save(); g.globalCompositeOperation = "overlay"; g.globalAlpha = clamp(k); g.drawImage(tmp, 0, 0);
  g.globalCompositeOperation = "source-atop"; g.globalAlpha = clamp(k) * 0.35; g.drawImage(tmp, 0, 0); g.restore();
};

const CARD_GEO = new THREE.PlaneGeometry(1, 1);
const SKY_VS = "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SKY_FS = `uniform vec3 c0, c1, c2, c3; uniform vec4 e; varying vec3 vP;
  void main(){ float el = degrees(asin(clamp(normalize(vP).y, -1.0, 1.0)));
    vec3 c = mix(c0, c1, smoothstep(e.x, e.y, el)); c = mix(c, c2, smoothstep(e.y, e.z, el)); c = mix(c, c3, smoothstep(e.z, e.w, el));
    gl_FragColor = vec4(c, 1.0); }`;
const WATER_FS = `uniform vec3 deep, shallow, glint, fogC; uniform float t, fogN, fogF; varying vec3 vW; varying float vD;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    float band = sin(vW.z * 2.3 + sin(vW.x * 0.35 + t * 0.7) * 1.6 + t * 1.3) * 0.5 + 0.5;
    float band2 = sin(vW.z * 5.1 - vW.x * 0.6 + t * 2.1) * 0.5 + 0.5;
    vec2 cell = floor(vec2(vW.x * 0.8, vW.z * 3.0));
    float sp = step(0.93, h(cell + floor(t * 2.0))) * smoothstep(0.75, 1.0, band2);
    vec3 c = mix(deep, shallow, 0.35 + 0.35 * band);
    c = mix(c, glint, 0.55 * sp + 0.12 * smoothstep(0.8, 1.0, band) * smoothstep(0.7, 1.0, band2));
    float f = smoothstep(fogN, fogF, vD);
    gl_FragColor = vec4(mix(c, fogC, f), 0.62 + 0.25 * f);
  }`;
const WATER_VS = "varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }";
const REFL_FS = `uniform sampler2D map; uniform vec3 tintC; uniform float t, op; varying vec2 vUv;
  void main(){ vec2 uv = vUv; uv.x += sin(uv.y * 60.0 + t * 3.0) * 0.004 + sin(uv.y * 23.0 - t * 1.7) * 0.006;
    vec4 c = texture2D(map, uv); float fade = 1.0 - 0.85 * smoothstep(0.0, 1.0, uv.y);
    gl_FragColor = vec4(c.rgb * tintC, c.a * op * fade * (0.6 + 0.4 * step(0.5, fract(uv.y * 40.0 + t)))); }`;
const REFL_VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

type Slot = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; refl: THREE.Mesh; rmat: THREE.ShaderMaterial };

export class KitStage {
  root = new THREE.Group();
  private pool = new CardPool();
  private slots: Slot[] = [];
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private stars: THREE.Points;
  private grounds = new Map<string, THREE.Mesh>();
  private water: THREE.Mesh; private waterMat: THREE.ShaderMaterial;
  fog = new THREE.Fog("#000000", 10, 100);
  private tmp = new THREE.Vector3();

  constructor() {
    this.skyMat = new THREE.ShaderMaterial({ uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), this.skyMat);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.sky.layers.set(KIT_NOINK); this.root.add(this.sky);
    const sp: number[] = [];
    for (let i = 0; i < 700; i++) { const a = hash(i, 1) * Math.PI * 2, el = 0.08 + Math.asin(hash(i, 2)) * 1.1; sp.push(Math.cos(a) * Math.cos(el) * 1400, Math.sin(el) * 1400, Math.sin(a) * Math.cos(el) * 1400); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: new THREE.Color(1.5, 1.5, 1.35), size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false, transparent: true, opacity: 0.85 }));
    this.stars.frustumCulled = false; this.stars.layers.set(KIT_NOINK); this.root.add(this.stars);
    this.waterMat = new THREE.ShaderMaterial({ uniforms: { deep: { value: new THREE.Color() }, shallow: { value: new THREE.Color() }, glint: { value: new THREE.Color() }, fogC: { value: new THREE.Color() }, t: { value: 0 }, fogN: { value: 10 }, fogF: { value: 100 } },
      vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1).rotateX(-Math.PI / 2), this.waterMat);
    this.water.renderOrder = 1; this.water.layers.set(KIT_NOINK); this.water.visible = false; this.root.add(this.water);
  }

  /** a flat ground plane with a painted texture (made once per key) */
  ground(key: string, size: [number, number], centre: V3, make: () => THREE.Texture, tint: [number, number, number], y = 0) {
    let m = this.grounds.get(key);
    if (!m) {
      m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: make(), fog: true }));
      m.layers.set(KIT_NOINK); m.renderOrder = -5; this.grounds.set(key, m); this.root.add(m);
    }
    m.visible = true; m.scale.set(size[0], 1, size[1]); m.position.set(centre[0], y + centre[1], centre[2]);
    (m.material as THREE.MeshBasicMaterial).color.setRGB(...tint);
    return m;
  }

  private slot(i: number) {
    while (this.slots.length <= i) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, depthWrite: true });
      const mesh = new THREE.Mesh(CARD_GEO, mat); mesh.layers.set(KIT_NOINK); mesh.frustumCulled = false; mesh.rotation.order = "YXZ";
      const rmat = new THREE.ShaderMaterial({ uniforms: { map: { value: null }, tintC: { value: new THREE.Color() }, t: { value: 0 }, op: { value: 0.5 } }, vertexShader: REFL_VS, fragmentShader: REFL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const refl = new THREE.Mesh(CARD_GEO, rmat); refl.layers.set(KIT_NOINK); refl.frustumCulled = false; refl.renderOrder = 0.5; refl.rotation.order = "YXZ";
      this.root.add(mesh, refl);
      this.slots.push({ mesh, mat, refl, rmat });
    }
    return this.slots[i];
  }

  /** light multiplier at a world point: ambient + sum of fires (inverse-square-ish falloff, flicker) */
  lightAt(L: Lighting, p: V3, t: number): { col: [number, number, number]; rimAng: number; rimK: number; rimCol: string } {
    const c: [number, number, number] = [...L.ambient];
    let best = 0, rimAng = 0, rimCol = "#ffb060";
    for (const f of L.fires) {
      const dx = f.pos[0] - p[0], dy = f.pos[1] - p[1], dz = f.pos[2] - p[2], d = Math.hypot(dx, dy, dz);
      const k = (f.power * flicker(t, f.seed)) / (1 + (d / f.radius) ** 2);
      const fc = rgb01(f.col);
      for (let i = 0; i < 3; i++) c[i] += fc[i] * k;
      if (k > best) { best = k; rimAng = Math.atan2(-dy, dx); rimCol = f.col; }
    }
    return { col: c, rimAng, rimK: clamp(best * 1.6), rimCol };
  }

  /** pose every card for this frame (cam must have its matrices updated) */
  frame(cards: Card[], L: Lighting, cam: THREE.PerspectiveCamera, t: number, pxH: number, scene: THREE.Scene) {
    // sky + fog + water
    const u = this.skyMat.uniforms;
    for (let i = 0; i < 4; i++) (u["c" + i].value as THREE.Color).set(L.skyStops[i]);
    (u.e.value as THREE.Vector4).set(L.skyEl[0], L.skyEl[1], L.skyEl[2], L.skyEl[3]);
    this.sky.position.copy(cam.position); this.stars.position.copy(cam.position);
    this.fog.color.set(L.fog); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog; scene.background = null;
    this.water.visible = !!L.water;
    if (L.water) {
      const w = this.waterMat.uniforms;
      w.deep.value.set(L.water.deep); w.shallow.value.set(L.water.shallow); w.glint.value.set(L.water.glint); w.fogC.value.set(L.fog);
      w.t.value = t; w.fogN.value = L.fogNear; w.fogF.value = L.fogFar;
    }
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const tanH = Math.tan((cam.fov * Math.PI) / 360);
    let n = 0;
    for (const c of cards) {
      const h = (c.w * c.dh) / c.dw;
      const centre: V3 = c.centre ? c.pos : c.face === "flat" ? c.pos : [c.pos[0], c.pos[1] + h / 2, c.pos[2]];
      const rel = this.tmp.set(centre[0] - cam.position.x, centre[1] - cam.position.y, centre[2] - cam.position.z);
      const depth = rel.dot(fwd);
      const R = Math.max(c.w, h) * 0.75;
      if (depth < -R) continue;
      // on-screen size -> canvas resolution tier
      const dist = Math.max(0.3, rel.length());
      const px = (Math.max(h, c.w * 0.6) / (2 * dist * tanH)) * pxH * 1.25;
      const want = Math.min(c.maxPx ?? 2048, px);
      const tierH = TIERS.find((x) => x >= want) ?? 2048;
      const ch = tierH, cw = Math.max(16, Math.round((tierH * c.dw) / c.dh));
      const lit = c.lit !== false;
      const Lp = lit ? this.lightAt(L, c.face === "flat" ? c.pos : [c.pos[0], c.pos[1] + Math.min(h, 1.2), c.pos[2]], t) : null;
      // rim: angle in canvas space = projected direction to the fire on screen (x right, y down)
      let rimKey = "";
      let rimAng = 0;
      if (c.rim && Lp && Lp.rimK > 0.05) {
        const f = L.fires.reduce((a, b) => (this.dist2(b.pos, c.pos) < this.dist2(a.pos, c.pos) ? b : a));
        const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
        const sx = (f.pos[0] - c.pos[0]) * right.x + (f.pos[2] - c.pos[2]) * right.z, sy = -(f.pos[1] - (c.pos[1] + 1.0));
        rimAng = Math.round(Math.atan2(sy, sx * (c.flip ? -1 : 1)) / (Math.PI / 8)) * (Math.PI / 8);
        rimKey = `|rim${rimAng.toFixed(2)}${Math.round(Lp.rimK * 4)}`;
      }
      const tex = this.pool.get(c.key + rimKey, cw, ch, (g) => {
        g.setTransform(cw / c.dw, 0, 0, ch / c.dh, 0, 0);
        c.draw(new KPen(g));
        if (rimKey && Lp) { g.setTransform(1, 0, 0, 1, 0, 0); rimLight(g, cw, ch, rimAng, Lp.rimCol, Math.round(Lp.rimK * 4) / 4 * 0.9); }
      });
      const s = this.slot(n++);
      const m = s.mesh, mat = s.mat;
      if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
      const additive = !!c.add;
      if ((mat.blending === THREE.AdditiveBlending) !== additive || mat.depthWrite === (additive || !!c.soft)) {
        mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending; mat.depthWrite = !(additive || c.soft); mat.alphaTest = additive || c.soft ? 0 : 0.04; mat.needsUpdate = true;
      }
      const fog = c.fog !== false && !additive;
      if (mat.fog !== fog) { mat.fog = fog; mat.needsUpdate = true; }
      const gk = c.glow ?? 1, col = Lp ? Lp.col : [1, 1, 1], tm = c.tintMul ?? [1, 1, 1];
      mat.color.setRGB(col[0] * gk * tm[0], col[1] * gk * tm[1], col[2] * gk * tm[2]);
      mat.opacity = c.opacity ?? 1;
      m.visible = true; m.renderOrder = c.order ?? (additive ? 3 : c.soft ? 2 : 1);
      m.position.set(...centre);
      m.scale.set(c.flip ? -c.w : c.w, h, 1);
      const face = c.face ?? "yaw";
      if (face === "flat") m.rotation.set(-Math.PI / 2, 0, c.rot ?? 0, "XYZ");
      else if (face === "camera") { m.quaternion.copy(cam.quaternion); m.rotateZ(c.rot ?? 0); }
      else if (face === "fixed") m.rotation.set(0, c.yaw ?? 0, c.rot ?? 0, "YXZ");
      else m.rotation.set(0, Math.atan2(cam.position.x - centre[0], cam.position.z - centre[2]), c.rot ?? 0, "YXZ");
      // water reflection: mirror about y = 0
      if (c.reflect && L.water) {
        const r = s.refl, rm = s.rmat;
        rm.uniforms.map.value = tex; rm.uniforms.t.value = t; (rm.uniforms.tintC.value as THREE.Color).setRGB(col[0] * gk * 0.55, col[1] * gk * 0.62, col[2] * gk * 0.66);
        rm.uniforms.op.value = 0.7 * (c.opacity ?? 1);
        r.visible = true; r.position.set(centre[0], -centre[1], centre[2]); r.rotation.copy(m.rotation); r.scale.set(m.scale.x, -h, 1);
      } else s.refl.visible = false;
    }
    for (let i = n; i < this.slots.length; i++) { this.slots[i].mesh.visible = false; this.slots[i].refl.visible = false; }
    this.pool.sweep();
  }
  setWater(centre: V3, size: [number, number]) { this.water.position.set(centre[0], 0, centre[2]); this.water.scale.set(size[0], 1, size[1]); }
  hideGrounds() { for (const m of this.grounds.values()) m.visible = false; }
  showStars(on: boolean, opacity = 0.85) { this.stars.visible = on; (this.stars.material as THREE.PointsMaterial).opacity = opacity; }
  private dist2(a: V3, b: V3) { return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; }
}

/** canvas texture made once (ground paint etc.) */
export const paintTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
