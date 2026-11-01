// The whole Tunguska world as one three.js scene: gradient sky + clouds (+ stars at dusk / in space), taiga floor,
// the slow river, ~20k thin pines (instanced; posed every frame from the event clock: standing, falling outward
// as the blast ring passes, or stripped to bare poles under the burst), the herders' chum, the big pole of the hidden
// herder, and four little sets: the straw stump, the hero tree, the sky-watchers' office, the globe.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo } from "./build";
import { ctex, waterNear, waterFar, cloudHD, rng } from "./paint";
import { tentTex, poleTex, floorTex, needleTex, globeTex, screenTex, chartTex } from "./art";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, DEER_GEO } from "./cast";
import {
  FPS, SHOTS, ShotDef, V3, camAt, smooth, clamp01, easeOut, fallK, stripK, arrive, R_POLE, R_FOREST, riverZ, RIVER_W, CAMP, TENT,
  SET_STRAW, SET_TREE, SET_OFFICE, SET_GLOBE, GLOBE_R,
} from "./story";

// ---------------- the forest ----------------
type Tree = { x: number; z: number; r: number; a: number; h: number; w: number; yaw: number; tilt: number; fringe: boolean };
const SPACING = 7.5, FRINGE = 15, R_FRINGE = 950;
const BIG_POLE: V3 = [-9.5, 0, 9.5];
const inRiver = (x: number, z: number, pad: number) => Math.abs(z - riverZ(x)) < RIVER_W / 2 + pad;
const makeTrees = (): Tree[] => {
  const r = rng(1908), out: Tree[] = [];
  const add = (x: number, z: number, fringe: boolean) => {
    const rr = Math.hypot(x, z);
    if (inRiver(x, z, 3)) return;
    if (Math.hypot(x - CAMP[0], z - CAMP[2]) < 24) return;
    if (Math.hypot(x - BIG_POLE[0], z - BIG_POLE[2]) < 2.6) return;
    if (rr < 6) return;
    if (Math.hypot(x + 128, z - 157) < 9) return; // the expedition's path (1927 shot)
    out.push({ x, z, r: rr, a: Math.atan2(x, z), h: 9 + r() * 6, w: 0.85 + r() * 0.35, yaw: r() * 6.28, tilt: (r() - 0.5) * 0.3, fringe });
  };
  for (let gx = -R_FOREST; gx <= R_FOREST; gx += SPACING) for (let gz = -R_FOREST; gz <= R_FOREST; gz += SPACING) {
    const x = gx + (r() - 0.5) * SPACING * 0.8, z = gz + (r() - 0.5) * SPACING * 0.8;
    if (Math.hypot(x, z) <= R_FOREST) add(x, z, false);
  }
  for (let gx = -R_FRINGE; gx <= R_FRINGE; gx += FRINGE) for (let gz = -R_FRINGE; gz <= R_FRINGE; gz += FRINGE) {
    const x = gx + (r() - 0.5) * FRINGE * 0.8, z = gz + (r() - 0.5) * FRINGE * 0.8, d = Math.hypot(x, z);
    if (d > R_FOREST + 4 && d <= R_FRINGE) add(x, z, true);
  }
  return out;
};
/** trunk: thin tapered 6-sided cylinder, base at 0, height 1 (scaled per tree) */
const trunkGeo = () => { const g = new THREE.CylinderGeometry(0.11, 0.22, 1, 6, 1, true); g.translate(0, 0.5, 0); return g; };
/** crown: three stacked cones from 30 % to 100 % of the height (scaled per tree), thin taiga pine */
const crownGeo = () => {
  const parts: THREE.BufferGeometry[] = [];
  for (const [y0, h, rad] of [[0.3, 0.36, 1.25], [0.5, 0.32, 1.0], [0.68, 0.32, 0.72]] as const) {
    const c = new THREE.ConeGeometry(rad, h, 7, 1, false); c.translate(0, y0 + h / 2, 0); parts.push(c.toNonIndexed());
  }
  const top = new THREE.ConeGeometry(0.42, 0.22, 7, 1, false); top.translate(0, 0.86, 0); parts.push(top.toNonIndexed());
  return mergeAll(parts);
};
/** snags: broken branch stubs on the stripped poles */
const snagGeo = () => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.BoxGeometry(0.06, 0.06, 0.55); b.translate(0, 0, 0.3); b.rotateX(-0.5); b.rotateY(i * 2.1); b.translate(0, 0.35 + i * 0.09, 0); parts.push(b.toNonIndexed());
  }
  return mergeAll(parts);
};
const mergeAll = (gs: THREE.BufferGeometry[]) => {
  const n = gs.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of gs) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array as Float32Array, o * 3); nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
};

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const smokeTex = () => ctex("smoke", 256, 256, (g) => {
  const p = new Pen(g);
  for (const [x, y, r, c] of [[90, 150, 60, "#8f8d96"], [150, 120, 70, "#a3a1aa"], [170, 165, 55, "#8f8d96"], [120, 100, 50, "#b4b2ba"]] as const) p.ell(x, y, r, r * 0.85, c, 0);
});
/** per-shot sun override (degrees, camera-relative) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 3: { az: 60, el: 40 }, 12: { az: -40, el: 14 }, 17: { az: -50, el: 16 }, 19: { az: 30, el: 35 }, 20: { az: 65, el: 38 } };

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.0);           // slow river along +x
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = []; private deers: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<string, THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private stars: THREE.Points;
  private trees = makeTrees();
  private grid = new Map<string, number[]>();
  private trunks: THREE.InstancedMesh; private crowns: THREE.InstancedMesh; private snags: THREE.InstancedMesh;
  private crownMat: THREE.MeshLambertMaterial; private trunkMat: THREE.MeshLambertMaterial;
  private taiga = new THREE.Group(); private groundOld: THREE.Mesh; private groundNew: THREE.Mesh;
  private tent = new THREE.Group();
  private smoke: { m: THREE.Mesh; mat: THREE.MeshLambertMaterial; base: V3; k: number }[] = [];
  private strawSet = new THREE.Group(); private treeSet = new THREE.Group(); private hero = new THREE.Group();
  private office = new THREE.Group(); private globeSet = new THREE.Group(); private globe: THREE.Mesh; private ring: THREE.Mesh; private ring2: THREE.Mesh;
  private sib = new THREE.Vector3();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private q = new THREE.Quaternion(); private q2 = new THREE.Quaternion(); private sc = new THREE.Vector3(); private p3 = new THREE.Vector3();

  constructor() {
    const R = this.root;
    // ---- sky (5 stops by elevation, tone-map inverted), sun disc, clouds, stars ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = Object.fromEntries((["day", "golden", "dusk", "space"] as const).map((l) => [l, [0, 1, 2, 3].map((k) => cloudHD(k, LOOK[l].cloud))]));
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.frustumCulled = false;
      this.clouds.push(m); R.add(m);
    }
    const sp: number[] = [], sr = rng(42);
    for (let i = 0; i < 900; i++) { const a = sr() * Math.PI * 2, el = 0.05 + Math.asin(sr()) * 1.0; sp.push(Math.cos(a) * Math.cos(el) * 8000, Math.sin(el) * 8000, Math.sin(a) * Math.cos(el) * 8000); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: new THREE.Color(1.6, 1.55, 1.3), size: 3.2, sizeAttenuation: false, fog: false, depthWrite: false }));
    this.stars.layers.set(NOINK); this.stars.frustumCulled = false; R.add(this.stars);

    // ---- taiga: ground (fresh / scorched), river, forest ----
    R.add(this.taiga);
    const tex = (t: THREE.Texture, n: number) => { const c = t.clone(); c.repeat.set(n, n); c.needsUpdate = true; return c; };
    const gG = new THREE.PlaneGeometry(14000, 14000); gG.rotateX(-Math.PI / 2);
    this.groundNew = new THREE.Mesh(gG, lam("floorMoss", () => ({ map: tex(floorTex(false), 2200) })));
    this.groundOld = new THREE.Mesh(gG, lam("floorBurnt", () => ({ map: tex(floorTex(true), 2200) })));
    for (const g of [this.groundNew, this.groundOld]) { g.receiveShadow = true; this.taiga.add(g); }
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "river1";
    // river: a strip along riverZ(x) plus dark-sand banks (slightly raised lips give the ink a line)
    const NX = 400, rp: number[] = [], ri: number[] = [], bp: number[] = [], bi: number[] = [];
    for (let i = 0; i <= NX; i++) {
      const x = -3000 + (6000 * i) / NX, z = riverZ(x), h = RIVER_W / 2;
      rp.push(x, 0.05, z - h, x, 0.05, z + h);
      bp.push(x, 0.12, z - h - 2.2, x, 0.12, z - h + 0.3, x, 0.12, z + h - 0.3, x, 0.12, z + h + 2.2);
      if (i < NX) { const a = i * 2; ri.push(a, a + 1, a + 3, a, a + 3, a + 2); const b = i * 4; bi.push(b, b + 1, b + 5, b, b + 5, b + 4, b + 2, b + 3, b + 7, b + 2, b + 7, b + 6); }
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
    // winding: make normals point up
    const rn = rg.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < rn.count; i++) rn.setXYZ(i, 0, 1, 0);
    const water = new THREE.Mesh(rg, waterM); water.receiveShadow = true; this.taiga.add(water);
    const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3)); bg.setIndex(bi);
    const bn = new Float32Array(bp.length); for (let i = 1; i < bn.length; i += 3) bn[i] = 1; bg.setAttribute("normal", new THREE.BufferAttribute(bn, 3));
    bg.setAttribute("uv", new THREE.Float32BufferAttribute(bp.flatMap((_, k) => (k % 3 === 0 ? [bp[k] / 4, bp[k + 2] / 4] : [])), 2));
    const bank = new THREE.Mesh(bg, lam("bankSand", () => ({ color: "#c9b083", side: THREE.DoubleSide }))); bank.receiveShadow = true; this.taiga.add(bank);

    const n = this.trees.length;
    this.trunkMat = lam("bark", () => ({ map: poleTex() }));
    this.crownMat = lam("needles", () => ({ map: needleTex(0) }));
    this.trunks = new THREE.InstancedMesh(trunkGeo(), this.trunkMat, n);
    this.crowns = new THREE.InstancedMesh(crownGeo(), this.crownMat, n);
    this.snags = new THREE.InstancedMesh(snagGeo(), this.trunkMat, n);
    const cols = ["#ffffff", "#e6f2dc", "#f4ffe8", "#d8ead0"].map((c) => new THREE.Color(c));
    this.trees.forEach((t, i) => {
      this.crowns.setColorAt(i, cols[i % 4]);
      const k = `${Math.floor(t.x / 20)},${Math.floor(t.z / 20)}`; const l = this.grid.get(k); if (l) l.push(i); else this.grid.set(k, [i]);
    });
    for (const im of [this.trunks, this.crowns, this.snags]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; this.taiga.add(im); }
    // the big old larch pole of the hidden herder (ground zero)
    const big = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 15, 9, 1, true).translate(0, 7.5, 0), lam("bigPole", () => ({ map: poleTex() })));
    big.position.set(...BIG_POLE); big.castShadow = true; big.receiveShadow = true; this.taiga.add(big);
    // smoke wisps over the scorched ground (aftermath)
    const smT = smokeTex();
    for (const [x, z] of [[-60, 40], [80, -30], [30, 90], [-110, -80], [140, 60]]) for (let k = 0; k < 4; k++) {
      const mat = new THREE.MeshLambertMaterial({ map: smT, transparent: true, depthWrite: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.layers.set(NOINK);
      this.smoke.push({ m, mat, base: [x, 0, z], k: k / 4 }); this.taiga.add(m);
    }
    // ---- the chum: hide cone on a pole frame, poles crossing out of the smoke hole ----
    const cone = new THREE.ConeGeometry(3.1, 5.4, 18, 1, true); cone.translate(0, 2.7, 0);
    const tm = lam("tent", () => ({ map: tentTex(), side: THREE.DoubleSide }));
    const tentMesh = new THREE.Mesh(cone, tm); tentMesh.castShadow = true; tentMesh.receiveShadow = true; this.tent.add(tentMesh);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.7), lam("tentDoor", () => ({ color: "#5a3a2a", side: THREE.DoubleSide })));
    door.position.set(0, 0.85, 2.6); door.rotation.x = -0.52; this.tent.add(door);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 7.6, 5), lam("poleWood", () => ({ color: "#8a5e3c" })));
      p.position.set(Math.cos(a) * 1.55, 3.7, Math.sin(a) * 1.55); p.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); p.castShadow = true; this.tent.add(p);
    }
    this.tent.position.set(...TENT); this.tent.rotation.y = 0.5; this.taiga.add(this.tent);
    // camp props: a fire ring of stones + a sledge
    const camp = new Batch();
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; camp.add(new THREE.DodecahedronGeometry(0.22, 0), lam("stone", () => ({ color: "#9a948c" })), new THREE.Matrix4().makeTranslation(CAMP[0] - 4 + Math.cos(a) * 0.8, 0.12, CAMP[2] - 2 + Math.sin(a) * 0.8)); }
    camp.add(boxGeo(V(-1.4, 0.25, -0.35), V(1.4, 0.38, 0.35)), lam("sledge", () => ({ color: "#a8724a" })), new THREE.Matrix4().makeTranslation(CAMP[0] + 12, 0, CAMP[2] - 4));
    for (const s of [-1, 1]) camp.add(boxGeo(V(-1.6, 0.02, -0.04), V(1.6, 0.25, 0.04)), lam("sledge", () => ({ color: "#a8724a" })), new THREE.Matrix4().makeTranslation(CAMP[0] + 12, 0, CAMP[2] - 4 + s * 0.3));
    camp.build(this.taiga);

    // ---- set: straw stump + hero tree (the analogy), ringed by a few pines ----
    const sb = new Batch();
    sb.add(new THREE.CylinderGeometry(0.42, 0.5, 0.86, 14).translate(0, 0.43, 0), lam("stump", () => ({ map: poleTex() })), new THREE.Matrix4().makeTranslation(...SET_STRAW));
    sb.add(new THREE.CylinderGeometry(0.43, 0.43, 0.02, 14).translate(0, 0.87, 0), lam("stumpTop", () => ({ color: "#e2c492" })), new THREE.Matrix4().makeTranslation(...SET_STRAW));
    const pr = rng(7);
    for (let i = 0; i < 70; i++) {
      const a = pr() * Math.PI * 2, d = 9 + pr() * 40, cx = SET_STRAW[0] + 50, cz = SET_STRAW[2];
      const x = cx + Math.cos(a) * d * 1.6, z = cz + Math.sin(a) * d - 10;
      if (Math.hypot(x - SET_STRAW[0], z - SET_STRAW[2]) < 7 || Math.hypot(x - SET_TREE[0], z - SET_TREE[2]) < 9) continue;
      const h = 9 + pr() * 6, m = new THREE.Matrix4().compose(V(x, 0, z), this.q.setFromAxisAngle(V(0, 1, 0), pr() * 6), V(1, h, 1));
      sb.add(trunkGeo(), this.trunkMat, m);
      sb.add(crownGeo(), this.crownMat, new THREE.Matrix4().compose(V(x, 0, z), this.q, V(0.95, h, 0.95)));
    }
    sb.build(this.strawSet);
    R.add(this.strawSet);
    const hb = new Batch();
    hb.add(trunkGeo(), this.trunkMat, new THREE.Matrix4().makeScale(1.4, 12, 1.4));
    hb.add(crownGeo(), this.crownMat, new THREE.Matrix4().makeScale(1.25, 12, 1.25));
    hb.build(this.hero);
    this.hero.position.set(...SET_TREE); this.treeSet.add(this.hero);
    const knoll = new THREE.Mesh(new THREE.SphereGeometry(6, 18, 8, 0, Math.PI * 2, 0, 0.5).translate(0, -5.3, 0), lam("knoll", () => ({ color: "#7cb552" })));
    knoll.position.set(...SET_TREE); knoll.receiveShadow = true; this.treeSet.add(knoll);
    R.add(this.treeSet);

    // ---- set: the sky-watchers' office (floor, back wall with a wide window, desk, nine screens, a star chart) ----
    const ob = new Batch(), O = (x: number, y: number, z: number) => V(SET_OFFICE[0] + x, SET_OFFICE[1] + y, SET_OFFICE[2] + z);
    const wallM = lam("officeWall", () => ({ color: "#e8d6b8" })), floorM = lam("officeFloor", () => ({ color: "#b0784e" })), trimM = lam("officeTrim", () => ({ color: "#5b6aa8" }));
    ob.add(boxGeo(O(-14, -0.2, -2.6), O(14, 0, 9)), floorM);
    ob.add(boxGeo(O(-14, 0, -2.9), O(14, 1.7, -2.6)), wallM);   // under the window
    ob.add(boxGeo(O(-14, 4.9, -2.9), O(14, 6.5, -2.6)), wallM); // over the window
    for (let x = -12; x <= 12; x += 4) ob.add(boxGeo(O(x - 0.12, 1.7, -2.9), O(x + 0.12, 4.9, -2.65)), trimM); // mullions
    ob.add(boxGeo(O(-14, 1.62, -2.95), O(14, 1.78, -2.4)), trimM); // sill
    ob.add(boxGeo(O(-9.6, 0.72, -1.1), O(9.6, 0.8, 0.25)), lam("desk", () => ({ color: "#c98f5a" })));
    for (const x of [-9.4, -3.2, 3.2, 9.4]) ob.add(boxGeo(O(x - 0.06, 0, -1.0), O(x + 0.06, 0.72, 0.15)), lam("desk", () => ({ color: "#c98f5a" })));
    const scrs: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const x = -8 + i * 2;
      ob.add(boxGeo(O(x - 0.72, 0.95, -0.75), O(x + 0.72, 1.85, -0.6)), lam("monitor", () => ({ color: "#3a3f58" })));
      ob.add(boxGeo(O(x - 0.08, 0.8, -0.72), O(x + 0.08, 0.95, -0.62)), lam("monitor", () => ({ color: "#3a3f58" })));
      const hidden = i === 7;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.78), new THREE.MeshBasicMaterial({ map: screenTex(i, hidden), color: new THREE.Color(1.25, 1.25, 1.3), toneMapped: true }));
      s.position.copy(O(x, 1.4, -0.595)); scrs.push(s); this.office.add(s);
    }
    ob.build(this.office, false);
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ map: chartTex() }));
    chart.position.copy(O(-12.2, 3.3, 8.5)); chart.rotation.y = Math.PI; this.office.add(chart);
    this.office.traverse((o) => { o.receiveShadow = false; o.castShadow = false; });
    R.add(this.office);

    // ---- set: the globe (Siberia turned toward the lens) and the pressure ring ----
    this.globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 64, 32), lam("globe", () => ({ map: globeTex() })));
    this.globe.position.set(...SET_GLOBE);
    const lat = THREE.MathUtils.degToRad(60.9), phi = THREE.MathUtils.degToRad(101.9 + 180);
    const sibLocal = V(-Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat)).normalize();
    this.globe.quaternion.setFromUnitVectors(sibLocal, V(0.35, 0.78, 0.52).normalize());
    this.globeSet.add(this.globe);
    const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.4), transparent: true, opacity: 0.95, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), ringM);
    this.ring2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.2, 1.6), transparent: true, opacity: 0.35, depthWrite: false }));
    for (const r of [this.ring, this.ring2]) { r.layers.set(NOINK); this.globeSet.add(r); }
    R.add(this.globeSet);
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private deerA(i: number) { while (this.deers.length <= i) this.deers.push(new Actor(this.root, DEER_GEO)); return this.deers[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** pose the forest at event time e; hide trees that would sit on the lens or block its central ray */
  private poseForest(e: number, cam: THREE.PerspectiveCamera, look: THREE.Vector3, scorched: number, year: string | undefined) {
    const hide = new Set<number>(), cp = cam.position, L = look.clone().sub(cp), len = L.length(); L.normalize();
    const cx = Math.floor(cp.x / 20), cz = Math.floor(cp.z / 20);
    const near: number[] = [];
    if (cp.y < 60) for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) near.push(...(this.grid.get(`${cx + i},${cz + j}`) ?? []));
    const seg = (t: Tree, k: number, s: number) => { // point s (0..1) along the trunk axis
      const ang = k * Math.PI / 2 * 0.98, hz = Math.sin(ang) * s * t.h, hy = Math.cos(ang) * s * t.h;
      return this.p3.set(t.x + Math.sin(t.a) * hz, hy, t.z + Math.cos(t.a) * hz);
    };
    for (const i of near) {
      const t = this.trees[i], k = t.fringe ? 0 : fallK(t.r, e);
      for (let s = 0; s <= 1.001; s += 0.2) {
        const p = seg(t, k, s), d = p.distanceTo(cp);
        if (d < 3.2) { hide.add(i); break; }
        const along = p.clone().sub(cp).dot(L);
        if (along > 0.3 && along < len * 0.92 && p.clone().sub(cp).addScaledVector(L, -along).length() < 1.1 + 0.02 * along) { hide.add(i); break; }
      }
    }
    const up = V(0, 1, 0), axis = new THREE.Vector3();
    const old = year === "1927";
    this.trees.forEach((t, i) => {
      const k = t.fringe ? 0 : fallK(t.r, e), strip = t.fringe ? 0 : stripK(t.r, e) * (t.r < R_POLE ? 1 : smooth((R_POLE + 25 - t.r) / 25));
      const gone = hide.has(i);
      axis.set(Math.cos(t.a), 0, -Math.sin(t.a)); // horizontal, perpendicular to the outward ray
      this.q.setFromAxisAngle(axis, k * Math.PI / 2 * 0.98 + (1 - k) * t.tilt * 0.08);
      this.q2.setFromAxisAngle(up, t.yaw);
      const qq = this.q.clone().multiply(this.q2);
      const s = gone ? 0 : 1;
      this.trunks.setMatrixAt(i, this.m4.compose(this.v.set(t.x, 0, t.z), qq, this.sc.set(s * t.w, s * t.h, s * t.w)));
      const crownGone = strip > 0.5 || (old && k > 0.5);
      const cs = gone || crownGone ? 0 : (1 - 0.6 * strip) * t.w;
      this.crowns.setMatrixAt(i, this.m4.compose(this.v.set(t.x, 0, t.z), qq, this.sc.set(cs, cs ? t.h * (1 - 0.3 * strip) : 0, cs)));
      const ss = gone || !(crownGone) ? 0 : 1;
      this.snags.setMatrixAt(i, this.m4.compose(this.v.set(t.x, 0, t.z), qq, this.sc.set(ss * t.w * 1.4, ss * t.h, ss * t.w * 1.4)));
    });
    for (const im of [this.trunks, this.crowns, this.snags]) im.instanceMatrix.needsUpdate = true;
    this.crownMat.color.setRGB(1, 1, 1).lerp(new THREE.Color(0.95, 0.62, 0.38), scorched);
    this.trunkMat.color.setRGB(1, 1, 1).lerp(new THREE.Color(0.82, 0.78, 0.78), old ? 1 : 0);
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], e = s.e(f), L = LIGHTS[s.light], K = LOOK[s.light];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.scene === "straw" ? 0.05 : 0.2; cam.far = 12000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- which set ----
    this.taiga.visible = s.scene === "taiga";
    this.strawSet.visible = s.scene === "straw" || s.scene === "tree";
    this.treeSet.visible = s.scene === "tree" || s.scene === "straw";
    this.office.visible = s.scene === "office";
    this.globeSet.visible = s.scene === "globe";
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 9, 14, 140);
    this.sun.position.copy(focus).addScaledVector(sunDir, 400); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 900; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds, stars ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const ee = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(ee[1], ee[2], ee[3], ee[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    const [fn, ff] = s.fog ?? [L.fogNear, L.fogFar];
    this.fog.near = fn; this.fog.far = ff;
    scene.fog = s.scene === "globe" ? null : this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 8000); this.sunDisc.scale.setScalar(2 * 8000 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    const cloudy = s.light !== "space";
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = (i / 12) * Math.PI * 2 + 0.3, d = 2600 + (i % 3) * 400, w = 900 + (i % 4) * 220;
      m.visible = cloudy && s.scene !== "office";
      m.position.set(cam.position.x + Math.cos(a) * d, 500 + (i % 4) * 220, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    // office: clouds seen through the window, placed behind the wall
    if (s.scene === "office") for (let i = 0; i < 4; i++) {
      const m = this.clouds[i]; m.visible = true;
      m.position.set(SET_OFFICE[0] - 30 + i * 22, 30 + (i % 2) * 12, SET_OFFICE[2] - 140); m.scale.set(60, 30, 1); m.lookAt(cam.position);
    }
    this.stars.visible = s.light === "dusk" || s.light === "space";
    this.stars.position.copy(cam.position);
    // ---- river ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    // ---- taiga state ----
    if (s.scene === "taiga") {
      const after = e > 5;
      this.groundOld.visible = after && s.year !== "1927" && id !== 20; this.groundNew.visible = !this.groundOld.visible;
      this.poseForest(e, cam, focus, after && s.light === "golden" ? 1 : 0, s.year);
      // the chum: thrown into the air in shot 10, pitched again everywhere else
      const u = id === 10 ? Math.max(0, e - arrive(318) - 0.1) : 0;
      const away = V(TENT[0], 0, TENT[2]).normalize();
      this.tent.position.set(TENT[0] + away.x * 16 * easeOut(u / 1.4), 9 * Math.sin(Math.min(1, u / 1.4) * Math.PI) * (u < 1.4 ? 1 : 0), TENT[2] + away.z * 16 * easeOut(u / 1.4));
      this.tent.rotation.set(-1.4 * clamp01(u / 1.2), 0.5 + u * 0.8, 0.5 * clamp01(u / 1.2));
      this.tent.visible = !(id === 10 && u > 1.45) && (id !== 12 && id !== 13 && id !== 17 && id !== 18) && !(id === 9);
      for (const sm of this.smoke) {
        sm.m.visible = after && s.light === "golden";
        const k = (t * 0.08 + sm.k) % 1, sz = 6 + k * 18;
        sm.m.position.set(sm.base[0] + k * 14, 3 + k * 30, sm.base[2] + k * 4); sm.m.scale.set(sz, sz, 1); sm.m.quaternion.copy(cam.quaternion);
        sm.mat.opacity = 0.5 * (1 - k) ** 1.2;
      }
    }
    if (s.scene === "tree" || s.scene === "straw") {
      const tip = id === 15 ? easeOut(clamp01((f - 1420) / 14)) : 0;
      this.hero.rotation.set(0, 0, -tip * 1.35);
    }
    if (s.scene === "globe") {
      // the pressure ring runs out from Siberia to the far side and back, twice ("Twice" lands on the second pass)
      const spin = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), (f - 968) * 0.0012);
      this.sib.copy(V(0.35, 0.78, 0.52).normalize()).applyQuaternion(spin);
      // ph 0..1: first lap out to the antipode and back; 1..2: second lap (faster, lands on "Twice")
      const ph = f < 1028 ? (f - 968) / 60 : 1 + Math.min(1, (f - 1028) / 34), th = 2 * Math.PI * (ph % 1) > Math.PI ? 2 * Math.PI - 2 * Math.PI * (ph % 1) : 2 * Math.PI * (ph % 1);
      for (const [r, k] of [[this.ring, 1.006], [this.ring2, 1.012]] as const) {
        r.position.copy(V(...SET_GLOBE)).addScaledVector(this.sib, GLOBE_R * Math.cos(th));
        const rr = GLOBE_R * Math.sin(th) * k;
        r.scale.set(Math.max(0.01, rr), Math.max(0.01, rr), GLOBE_R);
        r.quaternion.setFromUnitVectors(V(0, 0, 1), this.sib);
        r.visible = th > 0.02 && th < Math.PI - 0.02;
      }
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), upv = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1);
    const st = stage(id, f, { pos: cam.position, right, up: upv, fov: c.fov });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0, di = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = p.geo === "deer" ? this.deerA(di++) : this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (let i = di; i < this.deers.length; i++) this.deers[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const ef = this.fx(fi++);
      ef.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      ef.use(!!p.soft);
      ef.mesh.visible = true;
      ef.mesh.position.set(p.x, p.y, p.z);
      const g = p.glow ?? 1;
      ef.mat.color.setScalar(g); ef.soft.color.setScalar(g); ef.soft.opacity = p.opacity ?? 1;
      const fog = !p.glow;
      for (const m of [ef.mat, ef.soft]) if (m.fog !== fog) { m.fog = fog; m.needsUpdate = true; }
      if (p.flat) ef.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { ef.mesh.quaternion.copy(cam.quaternion); ef.mesh.rotateZ(p.rot ?? 0); }
      ef.mesh.scale.set(p.w, p.h, 1);
      fused.push(ef);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const ef of fused) ef.bind();
    return focus;
  }
}
