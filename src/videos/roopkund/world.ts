// The whole Roopkund world as one three.js scene: gradient sky + clouds (+ stars at dusk / in space), the snow bowl with
// the frozen tarn, shore gravel, boulders and a ring of snow peaks (the remains are effect cards, cast.ts); the legend's
// ridge trail; the genetics lab (desk, nine monitors, a big wall screen); and the globe (reused Tunguska globe map) with
// glow dots for the two groups and a route arc Mediterranean -> Himalaya.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo } from "../tunguska/build";
import { ctex, cloudHD, rng } from "../tunguska/paint";
import { globeTex } from "../tunguska/art";
import { TONE, CHAR, untone } from "../tunguska/shade";
import { NOINK } from "../tunguska/ink";
import { LIGHTS, LOOK, STORM_SKY, STORM_CLOUD, type LightPreset } from "./lights";
import { snowTex, rockTex, peakTex, iceTex, labScreenTex, boardTex } from "./art";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, V3, camAt, smooth, clamp01, easeOut, glide, stormAt, LAKE_RX, LAKE_RZ, SET_TRAIL, SET_LAB, SET_GLOBE, GLOBE_R,
  ROOPKUND_LL, MED_LL,
} from "./story";

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** per-shot sun override (degrees, camera-relative) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 3: { az: 70, el: 40 }, 4: { az: 115, el: 22 }, 10: { az: -70, el: 20 }, 11: { az: 40, el: 18 } };
const RAD = Math.PI / 180;
/** unit vector of (lat, lon) in the globe's local frame (same convention as the Tunguska globe) */
const llVec = (lat: number, lon: number) => { const la = lat * RAD, ph = (lon + 180) * RAD; return V(-Math.cos(ph) * Math.cos(la), Math.sin(la), Math.sin(ph) * Math.cos(la)).normalize(); };

type Peak = { x: number; z: number; h: number; r: number; yaw: number; k: number };
const makePeaks = (cx: number, cz: number, seed: number, rings: [number, number, number, number, number][]): Peak[] => {
  const r = rng(seed), out: Peak[] = [];
  for (const [n, d0, d1, h0, h1] of rings) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3, d = d0 + r() * (d1 - d0), h = h0 + r() * (h1 - h0);
    out.push({ x: cx + Math.cos(a) * d * 1.15, z: cz + Math.sin(a) * d, h, r: h * (0.5 + 0.3 * r()), yaw: r() * 6, k: i % 3 });
  }
  return out;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#cfe0ea", 60, 900);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<string, THREE.Texture[]> = {};
  private clouds: THREE.Mesh[] = [];
  private stars: THREE.Points;
  private lakeSet = new THREE.Group(); private trailSet = new THREE.Group(); private lab = new THREE.Group();
  private globeSet = new THREE.Group(); private globe = new THREE.Group();
  private ground: THREE.Mesh;
  private screens: { m: THREE.Mesh; skull: THREE.Texture; dna: THREE.Texture }[] = [];
  private dotsSA: THREE.Mesh[] = []; private dotsMed: THREE.Mesh[] = []; private dotsMedHome: THREE.Mesh[] = [];
  private marker: THREE.Mesh; private medGlow: THREE.Mesh; private hiGlow: THREE.Mesh;
  private arc: THREE.Mesh; private arcHead: THREE.Mesh; private arcCount = 0;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    // ---- sky (5 stops by elevation), sun disc, clouds, stars ----
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
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(3500, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c7c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.frustumCulled = false;
      this.clouds.push(m); R.add(m);
    }
    const sp: number[] = [], sr = rng(42);
    for (let i = 0; i < 900; i++) { const a = sr() * Math.PI * 2, el = 0.05 + Math.asin(sr()) * 1.0; sp.push(Math.cos(a) * Math.cos(el) * 3300, Math.sin(el) * 3300, Math.sin(a) * Math.cos(el) * 3300); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: new THREE.Color(1.6, 1.55, 1.3), size: 3.2, sizeAttenuation: false, fog: false, depthWrite: false }));
    this.stars.layers.set(NOINK); this.stars.frustumCulled = false; R.add(this.stars);

    // ---- one snow ground under the lake and trail sets ----
    const tex = (t: THREE.Texture, n: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(n, n); c.needsUpdate = true; return c; };
    // subdivided: one 16 km quad gave depth-interpolation errors that hid the lake on some frames (QA pose_jump, shot 10)
    const gG = new THREE.PlaneGeometry(16000, 16000, 64, 64); gG.rotateX(-Math.PI / 2);
    this.ground = new THREE.Mesh(gG, lam("rkSnowGround", () => ({ map: tex(snowTex(), 900) })));
    this.ground.receiveShadow = true; R.add(this.ground);
    const snowM = lam("rkSnowMound", () => ({ map: tex(snowTex(), 24) }));
    const rockM = lam("rkRock", () => ({ map: tex(rockTex(), 1) }));
    const peakMs = [0, 1, 2].map((k) => lam("rkPeak" + k, () => ({ map: peakTex(k) })));
    const addPeaks = (b: Batch, peaks: Peak[]) => {
      for (const p of peaks) {
        const g = new THREE.ConeGeometry(1, 1, 7, 1, false); g.translate(0, 0.5, 0);
        b.add(g, peakMs[p.k], new THREE.Matrix4().compose(V(p.x, -2, p.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), p.yaw), V(p.r, p.h, p.r * 0.85)));
      }
    };

    // ---- lake set: the tarn, shore gravel ring, boulders, snow mounds of the bowl, peaks ----
    R.add(this.lakeSet);
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2), lam("rkIce", () => ({ map: iceTex(), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })));
    lake.scale.set(LAKE_RX, 1, LAKE_RZ); lake.position.y = 0.16; lake.receiveShadow = true; this.lakeSet.add(lake);
    const shore = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 96, 1).rotateX(-Math.PI / 2), lam("rkShore", () => ({ color: "#6f8790", polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })));
    shore.scale.set(LAKE_RX, 1, LAKE_RZ); shore.position.y = 0.11; shore.receiveShadow = true; this.lakeSet.add(shore);
    const lb = new Batch(), r = rng(5000);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = 1.12 + r() * (i < 40 ? 0.35 : 1.6), s = i < 40 ? 0.35 + r() * 0.8 : 0.8 + r() * 2.4;
      const x = Math.cos(a) * LAKE_RX * d, z = Math.sin(a) * LAKE_RZ * d;
      if (Math.hypot(x + 6.5, z - 31.5) < 2.4) continue; // keep the trekker's spot clear
      if (Math.hypot(x + 14, z - 26.6) < 3.2 || Math.hypot(x - 21, z + 24.2) < 3.2) continue; // and the two groups of remains
      const g = new THREE.DodecahedronGeometry(1, 0);
      lb.add(g, rockM, new THREE.Matrix4().compose(V(x, s * 0.25, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r() * 6, r())), V(s * 1.3, s * 0.7, s)));
    }
    for (let i = 0; i < 10; i++) { // bowl: low snow mounds ringing the lake
      const a = (i / 10) * Math.PI * 2 + r() * 0.2, d = 2.8 + r() * 1.2, w = 16 + r() * 16;
      const g = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      lb.add(g, snowM, new THREE.Matrix4().compose(V(Math.cos(a) * LAKE_RX * d, -1, Math.sin(a) * LAKE_RZ * d * 1.3), new THREE.Quaternion(), V(w, 3 + r() * 5, w * 0.8)));
    }
    addPeaks(lb, makePeaks(0, -40, 77, [[12, 230, 330, 70, 140], [16, 480, 760, 160, 320], [12, 1100, 1500, 380, 620]]));
    lb.build(this.lakeSet);

    // ---- trail set: a trodden path along a ridge, rocks, cornice drop behind, peaks ----
    R.add(this.trailSet);
    const tb = new Batch(), T = (x: number, y: number, z: number) => V(SET_TRAIL[0] + x, SET_TRAIL[1] + y, SET_TRAIL[2] + z);
    tb.add(boxGeo(T(-80, -0.4, -1.1), T(80, 0.06, 1.3), 4), lam("rkPath", () => ({ color: "#c9d3d6" })));
    const r2 = rng(6000);
    for (let i = 0; i < 60; i++) {
      const x = -70 + r2() * 140, side = r2() < 0.5 ? -1 : 1, z = side * (1.8 + r2() * 5), s = 0.3 + r2() * 1.1;
      if (z > 0) continue; // nothing between the lens and the walkers
      tb.add(new THREE.DodecahedronGeometry(1, 0), rockM, new THREE.Matrix4().compose(T(x, s * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r2(), r2() * 6, r2())), V(s * 1.4, s * 0.8, s)));
    }
    for (let i = 0; i < 10; i++) { // snow ridges behind the path
      const x = -90 + i * 20 + r2() * 8, w = 14 + r2() * 10;
      tb.add(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), snowM, new THREE.Matrix4().compose(T(x, -2, -60 - r2() * 20), new THREE.Quaternion(), V(w * 1.6, 7 + r2() * 5, 12)));
    }
    addPeaks(tb, makePeaks(SET_TRAIL[0], SET_TRAIL[2] - 760, 91, [[14, 160, 420, 110, 240], [12, 700, 1100, 300, 520]]).filter((p) => p.z < SET_TRAIL[2] - 260));
    tb.build(this.trailSet);

    // ---- lab: floor, back wall, desk, nine monitors, a big wall screen, a board, sample trays ----
    const ob = new Batch(), O = (x: number, y: number, z: number) => V(SET_LAB[0] + x, SET_LAB[1] + y, SET_LAB[2] + z);
    const wallM = lam("rkLabWall", () => ({ color: "#d9eee8" })), floorM = lam("rkLabFloor", () => ({ color: "#2f6f74" })), trimM = lam("rkLabTrim", () => ({ color: "#1f5f66" }));
    ob.add(boxGeo(O(-14, -0.2, -3.2), O(14, 0, 9)), floorM);
    ob.add(boxGeo(O(-14, 0, -3.3), O(14, 6.5, -3.0)), wallM);
    ob.add(boxGeo(O(-14, 0, -3.0), O(14, 0.35, -2.9)), trimM);
    ob.add(boxGeo(O(-14, 4.3, -3.0), O(14, 4.42, -2.92)), trimM);
    ob.add(boxGeo(O(-9.6, 0.72, -1.1), O(9.6, 0.8, 0.25)), lam("rkDesk", () => ({ color: "#f2c14e" })));
    for (const x of [-9.4, -3.2, 3.2, 9.4]) ob.add(boxGeo(O(x - 0.06, 0, -1.0), O(x + 0.06, 0.72, 0.15)), lam("rkDeskLeg", () => ({ color: "#1f5f66" })));
    ob.add(boxGeo(O(-1.2, 2.0, -3.0), O(1.2, 3.46, -2.92)), lam("rkBezel", () => ({ color: "#173f46" })));
    for (const [x, c] of [[-4.6, "#ff7a4a"], [-4.1, "#f2c14e"], [4.4, "#7fe8d0"], [4.9, "#f6edd6"]] as const) // sample trays + vials
      ob.add(boxGeo(O(x - 0.2, 0.8, -0.1), O(x + 0.2, 0.86, 0.2)), lam("rkTray" + c, () => ({ color: c })));
    for (let i = 0; i < 9; i++) {
      const x = -8 + i * 2;
      ob.add(boxGeo(O(x - 0.72, 0.95, -0.75), O(x + 0.72, 1.85, -0.6)), lam("rkMonitor", () => ({ color: "#173f46" })));
      ob.add(boxGeo(O(x - 0.08, 0.8, -0.72), O(x + 0.08, 0.95, -0.62)), lam("rkMonitor", () => ({ color: "#173f46" })));
      const skull = labScreenTex(i, "skull"), dna = labScreenTex(i, "dna");
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.78), new THREE.MeshBasicMaterial({ map: skull, color: new THREE.Color(1.2, 1.2, 1.2), toneMapped: true }));
      s.position.copy(O(x, 1.4, -0.595)); this.lab.add(s); this.screens.push({ m: s, skull, dna });
    }
    { // the big wall screen
      const skull = labScreenTex(0, "skull", true), dna = labScreenTex(0, "dna", true);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.32), new THREE.MeshBasicMaterial({ map: skull, color: new THREE.Color(1.2, 1.2, 1.2), toneMapped: true }));
      s.position.copy(O(0, 2.73, -2.9)); this.lab.add(s); this.screens.push({ m: s, skull, dna });
    }
    ob.build(this.lab, false);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ map: boardTex() }));
    board.position.copy(O(-5.5, 2.9, -2.9)); this.lab.add(board);
    const board2 = board.clone(); board2.position.copy(O(5.5, 2.9, -2.9)); this.lab.add(board2);
    this.lab.traverse((o) => { o.receiveShadow = false; o.castShadow = false; });
    R.add(this.lab);

    // ---- globe (reused Tunguska map): the midpoint of the two places turned toward +z, north up ----
    const gm = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 64, 32), lam("rkGlobe", () => ({ map: globeTex() })));
    this.globe.add(gm);
    const lonM = (ROOPKUND_LL[1] + MED_LL[1]) / 2 + 8, latM = 30;
    this.globe.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), (latM - 18) * RAD).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), (-90 - lonM) * RAD)));
    this.globe.position.set(...SET_GLOBE);
    this.globeSet.add(this.globe);
    const dotGeo = new THREE.SphereGeometry(1, 16, 10);
    const yellow = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.75, 0.45) }), coral = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 0.95, 0.55) });
    const at = (lat: number, lon: number, lift = 1.004) => llVec(lat, lon).multiplyScalar(GLOBE_R * lift);
    const rd = rng(1919);
    for (let i = 0; i < 23; i++) { // the South Asian group (23 of 38): spread over South Asia
      const m = new THREE.Mesh(dotGeo, yellow); m.position.copy(at(12 + rd() * 20, 70 + rd() * 20)); this.dotsSA.push(m); this.globe.add(m);
    }
    for (let i = 0; i < 14; i++) { // the 14 of eastern-Mediterranean ancestry: first found at the lake, then their home glows
      const a = (i / 14) * Math.PI * 2, d = 1.2 + 1.2 * rd();
      const m = new THREE.Mesh(dotGeo, coral); m.position.copy(at(ROOPKUND_LL[0] + 0.5 + Math.sin(a) * d, ROOPKUND_LL[1] + 2.5 + Math.cos(a) * d * 1.3)); this.dotsMed.push(m); this.globe.add(m);
      const h = new THREE.Mesh(dotGeo, coral); h.position.copy(at(MED_LL[0] + (rd() - 0.5) * 6, MED_LL[1] + (rd() - 0.5) * 9)); this.dotsMedHome.push(h); this.globe.add(h);
    }
    const ringGeo = new THREE.TorusGeometry(1, 0.12, 6, 48);
    this.marker = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.8) }));
    this.marker.position.copy(at(...ROOPKUND_LL, 1.006)); this.marker.quaternion.setFromUnitVectors(V(0, 0, 1), llVec(...ROOPKUND_LL)); this.globe.add(this.marker);
    const glowM = (c: THREE.Color) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, depthWrite: false });
    this.hiGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), glowM(new THREE.Color(1.6, 1.3, 0.4)));
    this.hiGlow.position.copy(at(...ROOPKUND_LL, 1.008)); this.hiGlow.quaternion.setFromUnitVectors(V(0, 0, 1), llVec(...ROOPKUND_LL)); this.hiGlow.layers.set(NOINK); this.globe.add(this.hiGlow);
    this.medGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), glowM(new THREE.Color(1.7, 0.7, 0.45)));
    this.medGlow.position.copy(at(...MED_LL, 1.008)); this.medGlow.quaternion.setFromUnitVectors(V(0, 0, 1), llVec(...MED_LL)); this.medGlow.layers.set(NOINK); this.globe.add(this.medGlow);
    // route arc: great circle from the Mediterranean to Roopkund, lifted off the surface; grows with drawRange
    const A = llVec(...MED_LL), B = llVec(...ROOPKUND_LL), om = A.angleTo(B), pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const s = i / 48, p = A.clone().multiplyScalar(Math.sin((1 - s) * om) / Math.sin(om)).add(B.clone().multiplyScalar(Math.sin(s * om) / Math.sin(om)));
      pts.push(p.normalize().multiplyScalar(GLOBE_R * (1.01 + 0.16 * Math.sin(Math.PI * s))));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 96, 0.9, 8, false);
    this.arcCount = tube.index!.count;
    this.arc = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 0.95, 0.55) }));
    this.arc.frustumCulled = false; this.globe.add(this.arc);
    this.arcHead = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.5, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 0.95, 0.55) }));
    const tip = curve.getPoint(1), tan = curve.getTangent(1);
    this.arcHead.position.copy(tip).addScaledVector(tan, -1.2); this.arcHead.quaternion.setFromUnitVectors(V(0, 1, 0), tan);
    this.globe.add(this.arcHead);
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
    const az = (SUN_SHOT[id]?.az ?? L.az) * RAD, el = (SUN_SHOT[id]?.el ?? L.el) * RAD;
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light], storm = stormAt(id, f);
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 4000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- which set ----
    this.lakeSet.visible = s.scene === "lake";
    this.trailSet.visible = s.scene === "trail";
    this.ground.visible = s.scene === "lake" || s.scene === "trail";
    this.lab.visible = s.scene === "lab";
    this.globeSet.visible = s.scene === "globe";
    // ---- light rig (the storm dims the sun and greys the key) ----
    const sunDir = this.shotSun(id, s, L);
    const dim = 1 - 0.45 * storm;
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI * dim;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 9, 14, 160);
    this.sun.position.copy(focus).addScaledVector(sunDir, 400); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 900; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    const grey = (v: [number, number, number], k: number) => { const m = (v[0] + v[1] + v[2]) / 3; return v.map((x) => (x + (m * 1.02 - x) * k) * (1 - 0.3 * k)) as [number, number, number]; };
    TONE.uLitCol.value.set(...grey(L.lit, storm)); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...grey(L.charTint, storm * 0.6)); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds, stars ----
    const su = this.skyMat.uniforms, tmpC = new THREE.Color(), tmpS = new THREE.Color();
    K.sky.c.forEach((h, i) => { untone(h, su["c" + i].value); if (storm > 0) su["c" + i].value.lerp(untone(STORM_SKY[i], tmpS), storm); });
    const ee = K.sky.e.map((deg) => deg * RAD);
    su.e.value.set(ee[1], ee[2], ee[3], ee[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    if (storm > 0) this.fog.color.lerp(untone("#8fa3a8", tmpC), storm);
    const [fn, ff] = s.fog ?? [L.fogNear, L.fogFar];
    this.fog.near = fn; this.fog.far = ff * (1 - 0.4 * storm);
    scene.fog = s.scene === "globe" || s.scene === "lab" ? null : this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden" && storm < 0.3;
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 3000); this.sunDisc.scale.setScalar(2 * 3000 * Math.tan(1.7 * RAD)); }
    const cloudy = s.light !== "space" && s.scene !== "lab";
    const pal = storm > 0.5 ? "storm" : s.light;
    const maps = (this.cloudMaps[pal] ??= [0, 1, 2, 3].map((k) => cloudHD(k, pal === "storm" ? STORM_CLOUD : LOOK[s.light].cloud)));
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = (i / 12) * Math.PI * 2 + 0.3 + t * 0.004, d = 1900 + (i % 3) * 400, w = (700 + (i % 4) * 160) * (1 + 0.4 * storm);
      m.visible = cloudy;
      m.position.set(cam.position.x + Math.cos(a) * d, cam.position.y * 0.5 + 380 - 200 * storm + (i % 4) * 160, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = maps[i % 4];
    }
    this.stars.visible = (s.light === "dusk" && s.scene === "lake" && storm < 0.5) || s.light === "space";
    this.stars.position.copy(cam.position);
    // ---- lab screens: skull drawings in shot 5, DNA in shot 7 ----
    if (s.scene === "lab") for (const sc2 of this.screens) (sc2.m.material as THREE.MeshBasicMaterial).map = id === 7 ? sc2.dna : sc2.skull;
    // ---- globe: dots, glows, the route arc ----
    if (s.scene === "globe") {
      const pop = (m: THREE.Mesh, f0: number, size: number) => { const k = clamp01((f - f0) / 8); const sz = k <= 0 ? 0.001 : size * (k < 1 ? 1 + 0.5 * Math.sin(k * Math.PI) : 1); m.scale.setScalar(sz); m.visible = k > 0; };
      this.dotsSA.forEach((m, i) => pop(m, 1146 + i * 2.6, 0.9));
      this.dotsMed.forEach((m, i) => (id === 9 ? pop(m, 1272 + i * 2.4, 1.0) : (m.visible = false)));
      this.dotsMedHome.forEach((m, i) => (id === 9 ? pop(m, 1402 + i * 1.5, 0.95) : (m.visible = false)));
      const pulse = 1 + 0.12 * Math.sin(t * 5);
      this.marker.scale.setScalar(3.2 * pulse); this.marker.visible = true;
      this.hiGlow.scale.setScalar(5.5 + 1.2 * smooth((f - 1160) / 30)); (this.hiGlow.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.2 * smooth((f - 1160) / 30);
      const mg = id === 9 ? smooth((f - 1398) / 18) : 0;
      this.medGlow.visible = mg > 0.01; this.medGlow.scale.setScalar(2 + 6.5 * mg); (this.medGlow.material as THREE.MeshBasicMaterial).opacity = 0.55 * mg;
      const grow = id === 9 ? glide((f - 1408) / 40) : 0;
      this.arc.visible = grow > 0.005; this.arc.geometry.setDrawRange(0, Math.floor((this.arcCount / 6) * grow) * 6);
      this.arcHead.visible = grow > 0.97;
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), upv = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1), fwd = V(0, 0, 0);
    cam.getWorldDirection(fwd);
    const st = stage(id, f, { pos: cam.position, right, up: upv, fov: c.fov, sun: sunDir, fwd });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
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
    void easeOut;
    return focus;
  }
}
