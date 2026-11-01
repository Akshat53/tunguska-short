// The whole Bombay 1944 world as one three.js scene: gradient sky + clouds, one big harbour water plane, and four sets:
//  harbour  Victoria Dock: granite quay, bollards + mooring lines, rope coils, cargo stacks (cotton bales, crates, drums),
//           three dock cranes, basalt godowns with tiled roofs, a rail siding, lamp posts, the city behind (chawl blocks, a
//           clock tower, domes), two ships across the basin, the far shore, a south quay (the blast is seen from there);
//           the freighter Fort Stikine (extruded hull with the open No. 2 hatch, cargo in the hold, bridge, funnel, masts,
//           derricks, lifeboats, ventilators) and the fire hoses on the stones.
//  city     a street of chawls (shuttered windows, balconies with railings, shop fronts with awnings, Mangalore-tile roofs,
//           terraces), telegraph poles and wires, lamp posts, rows of roofs behind for the hook's rooftop vista.
//  memorial the Byculla fire-brigade HQ courtyard: a plain column on a stepped plinth, the brick-and-arch HQ front, trees,
//           a modern engine.
//  dredge   2011: a hopper barge with wet mud and a grab crane, container cranes and stacks, a modern skyline.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, quad, tri } from "../tunguska/build";
import { cloudHD, rng } from "../tunguska/paint";
import { TONE, CHAR, untone } from "../tunguska/shade";
import { NOINK } from "../tunguska/ink";
import { LIGHTS, LOOK, WATER_COL, type LightPreset } from "./lights";
import {
  chawlBay, shopBay, godownBay, hullTex, deckTex, quayTex, cobbleTex, roofTex, waterTex, mudTex, memStoneTex, hqBay, plainTex, containerTex, baleTex, crateTex,
} from "./art";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, V3, camAt, WATER, SHIP, HATCH, FIREMEN, SET_CITY, SET_MEM, SET_DREDGE, HOPPER, shipVisible,
} from "./story";

const RAD = Math.PI / 180;
const discTex = () => {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
/** per-shot sun override (degrees, camera-relative) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = {
  1: { az: 40, el: 10 }, 18: { az: 40, el: 10 }, 3: { az: 110, el: 40 }, 6: { az: 120, el: 35 }, 8: { az: -60, el: 30 }, 14: { az: 160, el: 14 }, 15: { az: 30, el: 10 }, 16: { az: 120, el: 18 },
};
const T = (t: THREE.Texture, rx = 1, ry = 1) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
const M4 = (p: THREE.Vector3, s: THREE.Vector3, q = new THREE.Quaternion()) => new THREE.Matrix4().compose(p, q, s);
const qY = (a: number) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
const qZ = (a: number) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), a);
/** a gabled roof prism over the box x0..x1 / z0..z1 at eave height y, ridge along x (or along z) */
const roofPrism = (b: Batch, x0: number, x1: number, z0: number, z1: number, y: number, h: number, roofM: THREE.Material, gableM: THREE.Material, alongX = true, ov = 0.5, tile = 3) => {
  if (alongX) {
    const zm = (z0 + z1) / 2, X0 = x0 - ov, X1 = x1 + ov, Z0 = z0 - ov, Z1 = z1 + ov, yo = y - ov * (h / ((z1 - z0) / 2));
    const L = Math.hypot((Z1 - Z0) / 2, h + (y - yo));
    b.add(quad(V(X0, yo, Z1), V(X1, yo, Z1), V(X1, y + h, zm), V(X0, y + h, zm), (X1 - X0) / tile, L / tile), roofM);
    b.add(quad(V(X1, yo, Z0), V(X0, yo, Z0), V(X0, y + h, zm), V(X1, y + h, zm), (X1 - X0) / tile, L / tile), roofM);
    b.add(tri(V(x0, y, z0), V(x0, y, z1), V(x0, y + h, zm)), gableM); b.add(tri(V(x1, y, z1), V(x1, y, z0), V(x1, y + h, zm)), gableM);
  } else {
    const xm = (x0 + x1) / 2, X0 = x0 - ov, X1 = x1 + ov, Z0 = z0 - ov, Z1 = z1 + ov, yo = y - ov * (h / ((x1 - x0) / 2));
    const L = Math.hypot((X1 - X0) / 2, h + (y - yo));
    b.add(quad(V(X0, yo, Z0), V(X0, yo, Z1), V(xm, y + h, Z1), V(xm, y + h, Z0), (Z1 - Z0) / tile, L / tile), roofM);
    b.add(quad(V(X1, yo, Z1), V(X1, yo, Z0), V(xm, y + h, Z0), V(xm, y + h, Z1), (Z1 - Z0) / tile, L / tile), roofM);
    b.add(tri(V(x1, y, z0), V(x0, y, z0), V(xm, y + h, z0)), gableM); b.add(tri(V(x0, y, z1), V(x1, y, z1), V(xm, y + h, z1)), gableM);
  }
};
const cyl = (b: Batch, m: THREE.Material, x: number, y0: number, z: number, r: number, h: number, seg = 12, r2 = r) => {
  const g = new THREE.CylinderGeometry(r2, r, h, seg); g.translate(0, h / 2, 0); b.add(g, m, M4(V(x, y0, z), V(1, 1, 1)));
};
/** a slanted pole (cylinder) between two points */
const pole = (b: Batch, m: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, r: number, seg = 8) => {
  const d = c.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
  b.add(g, m, M4(a, V(1, 1, 1), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())));
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
  private water: THREE.Mesh; private waterMap: THREE.Texture;
  private harbour = new THREE.Group(); private cranes = new THREE.Group(); private ship = new THREE.Group(); private hoses = new THREE.Group();
  private city = new THREE.Group(); private mem = new THREE.Group(); private dredge = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    // ---- sky (5 stops by elevation), sun disc, clouds ----
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
    this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.frustumCulled = false;
      this.clouds.push(m); R.add(m);
    }
    // ---- one water plane for every set (subdivided: depth precision in the high / wide shots) ----
    this.waterMap = T(waterTex(), 16000 / 12, 16000 / 12);
    const wg = new THREE.PlaneGeometry(16000, 16000, 96, 96); wg.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, lam("bmWater", () => ({ map: this.waterMap, color: "#2f8f9a" })));
    this.water.position.y = WATER; this.water.receiveShadow = true; R.add(this.water);

    this.buildHarbour(); this.buildShip(); this.buildHoses(); this.buildCity(); this.buildMemorial(); this.buildDredge();
    R.add(this.harbour, this.cranes, this.ship, this.hoses, this.city, this.mem, this.dredge);
  }

  // ---------------- harbour ----------------
  private buildHarbour() {
    const b = new Batch(), r = rng(1944);
    const quayM = lam("bmQuay", () => ({ map: T(quayTex(), 1, 1) }));
    // quay slab: top at y 0 from the edge (z 0) back to z 140; textured 4 m tiles (boxGeo tile)
    b.add(boxGeo(V(-260, -6, 0), V(260, 0, 140), 4), quayM);
    b.add(boxGeo(V(-260, -6, -260), V(260, 0, -146), 4), quayM);                  // south quay (blast vantage)
    const copingM = lam("bmCoping", () => ({ color: "#cfc6b4" }));
    b.add(boxGeo(V(-260, 0, 0), V(260, 0.14, 0.7)), copingM);
    b.add(boxGeo(V(-260, 0, -146.7), V(260, 0.14, -146)), copingM);
    const fenderM = lam("bmFender", () => ({ color: "#3a2a1e" }));
    for (let x = -60; x <= 60; x += 6) b.add(boxGeo(V(x - 0.3, -1.6, -0.25), V(x + 0.3, 0.05, 0)), fenderM);
    // bollards + rope coils (and mooring lines to the ship: built with the ship)
    const iron = lam("bmIron", () => ({ color: "#2a3236" })), rope = lam("bmRope", () => ({ color: "#c9b48a" }));
    for (let x = -100; x <= 100; x += 9) { if (x > -21 && x < -1) continue; cyl(b, iron, x, 0, 1.1, 0.28, 0.55, 12, 0.24); cyl(b, iron, x, 0.55, 1.1, 0.36, 0.14, 12, 0.36); }
    for (let x = -60; x <= 100; x += 40) cyl(b, iron, x, 0, -146.6 + 0.0 - 0.9 + 1.4, 0.32, 0.6, 12, 0.26);
    for (const x of [-97, -61, -34, 2, 29, 38, 74]) { const g = new THREE.TorusGeometry(0.42, 0.13, 6, 16); g.rotateX(Math.PI / 2); b.add(g, rope, M4(V(x, 0.13, 2.2), V(1, 1, 1))); b.add(g, rope, M4(V(x + 0.15, 0.36, 2.2), V(0.8, 1, 0.8))); }
    // rail siding behind the cargo stacks
    const railM = lam("bmRail", () => ({ color: "#4a4440" })), sleeperM = lam("bmSleeper", () => ({ color: "#5a4636" }));
    for (const z of [20.2, 21.6]) b.add(boxGeo(V(-200, 0, z - 0.06), V(200, 0.16, z + 0.06)), railM);
    for (let x = -200; x < 200; x += 0.9) b.add(boxGeo(V(x, 0, 19.6), V(x + 0.24, 0.07, 22.2)), sleeperM);
    // goods wagons on the siding
    const wagonM = [lam("bmWagon1", () => ({ color: "#7a3a2a" })), lam("bmWagon2", () => ({ color: "#5a4a3a" }))];
    for (let i = 0; i < 9; i++) { const x = -70 + i * 8.4; b.add(boxGeo(V(x, 0.7, 19.7), V(x + 7.6, 3.3, 22.1)), wagonM[i % 2]); b.add(boxGeo(V(x + 0.4, 3.3, 19.8), V(x + 7.2, 3.55, 22.0)), iron); for (const dx of [1.4, 6.2]) for (const z of [19.8, 22.0]) { const g = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 14); g.rotateX(Math.PI / 2); b.add(g, iron, M4(V(x + dx, 0.45, z), V(1, 1, 1))); } }
    // cargo stacks: cotton bales, crates, oil drums (kept off the firemen's quay strip x -24..2, z < 12)
    const bale = lam("bmBaleM", () => ({ map: baleTex() })), crateT = lam("bmCrateT", () => ({ map: crateTex("#2f8f83") })), crateB = lam("bmCrateB", () => ({ map: crateTex("#b08a4a") }));
    const drumM = lam("bmDrum", () => ({ color: "#3f6f84" })), drumR = lam("bmDrumR", () => ({ color: "#a0452e" }));
    const spots: [number, number][] = [];
    for (let i = 0; i < 46; i++) {
      const x = -90 + r() * 180, z = 5 + r() * 12;
      if (x > -26 && x < 4 && z < 14) continue;
      if (x > 0 && x < 22 && z > 10) continue; // keep the shot-3 lens clear
      if (Math.hypot(x - 34, z - 26) < 8 || Math.hypot(x - 30, z - 22) < 6) continue;
      if (spots.some(([a, c]) => Math.hypot(a - x, c - z) < 3.2)) continue;
      spots.push([x, z]);
      const kind = i % 4, h = 1 + Math.floor(r() * 3);
      for (let k = 0; k < h; k++) {
        const w = kind === 0 ? 1.3 : 1.1, d = kind === 0 ? 0.9 : 1.1, yy = k * (kind === 0 ? 0.85 : 1.05), jx = (r() - 0.5) * 0.2;
        if (kind === 3) { for (let j = 0; j < 4; j++) cyl(b, j % 3 ? drumM : drumR, x + (j % 2) * 0.7, 0, z + Math.floor(j / 2) * 0.7, 0.3, 0.9, 12); break; }
        b.add(boxGeo(V(x - w + jx, yy, z - d), V(x + w + jx, yy + (kind === 0 ? 0.85 : 1.05), z + d)), kind === 0 ? bale : kind === 1 ? crateT : crateB);
      }
    }
    { const b = new Batch();
    // dock cranes: portal legs on the quay, cab, counterweight, a jib reaching over the ship
      const craneM = lam("bmCrane", () => ({ color: "#3d5a62" })), cabM = lam("bmCab", () => ({ color: "#d9a441" }));
      for (const [cx, ang] of [[-30, 0.5], [22, -0.4], [46, 0.2]] as [number, number][]) {
        for (const dx of [-1.6, 1.6]) for (const z of [1.6, 6.4]) b.add(boxGeo(V(cx + dx - 0.25, 0, z - 0.25), V(cx + dx + 0.25, 8, z + 0.25)), craneM);
        b.add(boxGeo(V(cx - 2, 8, 1.2), V(cx + 2, 8.8, 6.8)), craneM);
        for (const z of [1.6, 6.4]) pole(b, craneM, V(cx - 1.6, 0.5, z), V(cx + 1.6, 7.8, z), 0.08);
        b.add(boxGeo(V(cx - 1.4, 8.8, 2.4), V(cx + 1.4, 11.4, 5.6)), cabM);
        b.add(boxGeo(V(cx - 1.2, 9.2, 5.6), V(cx + 1.2, 10.6, 7.6)), craneM);
        const a = V(cx, 11, 3.2), tip = V(cx + Math.sin(ang) * 6, 22, 3.2 - 16);
        pole(b, craneM, a, tip, 0.32, 6); pole(b, craneM, V(cx, 11.4, 4.4), tip, 0.06, 4);
        pole(b, rope, tip, V(tip.x, 9, tip.z), 0.035, 4);
        b.add(boxGeo(V(tip.x - 0.3, 8.4, tip.z - 0.3), V(tip.x + 0.3, 9, tip.z + 0.3)), iron);
      }
    b.build(this.cranes); }
    // godowns: basalt warehouses with tiled roofs, facing the quay
    const roofM = lam("bmGodownRoof", () => ({ map: roofTex(2) })), roofC = lam("bmGodownRoofC", () => ({ map: T(plainTex("corr", "#8a9496", "rgba(0,0,0,0.18)", 18), 1, 1) }));
    const blocks: [number, number][] = [[-120, -86], [-80, -46], [-40, -6], [0, 28], [34, 68], [74, 108]];
    blocks.forEach(([x0, x1], i) => {
      const h = 9 + (i % 3), wall = lam("bmGodown" + (i % 3), () => ({ map: godownBay(i % 3) }));
      b.add(boxGeo(V(x0, 0, 26), V(x1, h, 46), 6), wall);
      roofPrism(b, x0, x1, 26, 46, h, 4.5, i % 2 ? roofM : roofC, wall, true, 0.8, 3);
      b.add(boxGeo(V(x0 - 0.3, h - 0.5, 25.7), V(x1 + 0.3, h, 26)), copingM);
    });
    // lamp posts along the quay road
    const lampM = lam("bmLamp", () => ({ color: "#1f2a2e" })), glassM = lam("bmLampGlass", () => ({ color: "#fff1c4", emissive: new THREE.Color("#7a6a3a") }));
    for (let x = -96; x <= 96; x += 16) { cyl(b, lampM, x, 0, 24.2, 0.1, 4.6, 8); b.add(boxGeo(V(x - 0.25, 4.6, 23.95), V(x + 0.25, 5.2, 24.45)), glassM); b.add(boxGeo(V(x - 0.32, 5.2, 23.88), V(x + 0.32, 5.35, 24.52)), lampM); }
    // the city behind the godowns: chawl blocks, domes, a clock tower, palms (cheap boxes, painted bays)
    const bayMs = [0, 1, 2, 3, 4].map((k) => lam("bmBack" + k, () => ({ map: chawlBay(k + 1) })));
    const roofT = [0, 1].map((k) => lam("bmBackRoof" + k, () => ({ map: roofTex(k) })));
    for (let i = 0; i < 90; i++) {
      const x = -260 + r() * 520, z = 60 + r() * 220, w = 8 + r() * 16, d = 8 + r() * 12, h = 9.6 + Math.floor(r() * 4) * 3.2;
      b.add(boxGeo(V(x, 0, z), V(x + w, h, z + d), 3.2), bayMs[i % 5]);
      if (r() < 0.7) roofPrism(b, x, x + w, z, z + d, h, 2.5 + r() * 1.5, roofT[i % 2], bayMs[i % 5], w > d, 0.4, 3);
    }
    const stoneM = lam("bmTowerStone", () => ({ map: T(memStoneTex(), 1, 1) }));
    b.add(boxGeo(V(30, 0, 120), V(38, 46, 128), 2), stoneM);
    b.add(boxGeo(V(29, 46, 119), V(39, 48, 129), 2), stoneM);
    { const g = new THREE.ConeGeometry(5.5, 14, 4); g.rotateY(Math.PI / 4); g.translate(0, 7, 0); b.add(g, roofT[1], M4(V(34, 48, 124), V(1, 1, 1))); }
    const domeM = lam("bmDome", () => ({ color: "#d9cdb0" }));
    for (const [x, z, s] of [[-60, 140, 9], [90, 180, 12], [-150, 210, 8]] as [number, number, number][]) {
      b.add(boxGeo(V(x - s, 0, z - s), V(x + s, 16, z + s), 3.2), bayMs[2]);
      const g = new THREE.SphereGeometry(s * 0.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); b.add(g, domeM, M4(V(x, 16, z), V(1, 1.15, 1)));
    }
    // across the basin: the far shore (low green hills) and two moored ships
    const hillM = lam("bmHill", () => ({ color: "#6f8f6a" }));
    for (let i = 0; i < 9; i++) { const g = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); b.add(g, hillM, M4(V(-900 + i * 230 + r() * 60, WATER, -700 - r() * 120), V(160 + r() * 80, 30 + r() * 40, 70))); }
    const hullS = lam("bmHullS", () => ({ color: "#4f5a60" })), whiteM = lam("bmWhite", () => ({ color: "#ece6d8" })), blackM = lam("bmBlack", () => ({ color: "#22282c" }));
    for (const [x, z, L] of [[-70, -78, 44], [60, -88, 38], [150, -60, 30]] as [number, number, number][]) {
      b.add(boxGeo(V(x - L / 2, WATER - 2, z - 4), V(x + L / 2, 4, z + 4)), hullS);
      b.add(boxGeo(V(x - 5, 4, z - 3), V(x + 5, 8, z + 3)), whiteM);
      cyl(b, blackM, x + 1, 8, z, 1.1, 5, 12);
      cyl(b, blackM, x - L / 3, 4, z, 0.18, 14, 6); cyl(b, blackM, x + L / 3, 4, z, 0.18, 14, 6);
    }
    b.build(this.harbour);
  }

  // ---------------- the freighter ----------------
  private buildShip() {
    const S = this.ship, b = new Batch();
    // extruded hull (plan outline with the open No. 2 hatch as a hole), uvs: deck caps tiled, sides along the length
    const s = (z: number) => -z;
    const sh = new THREE.Shape();
    sh.moveTo(-34, s(-2)); sh.lineTo(24, s(-2)); sh.quadraticCurveTo(33, s(-2.6), 38.5, s(-8)); sh.quadraticCurveTo(33, s(-13.4), 24, s(-14));
    sh.lineTo(-34, s(-14)); sh.quadraticCurveTo(-39, s(-13), -39.5, s(-8)); sh.quadraticCurveTo(-39, s(-3), -34, s(-2));
    const hole = new THREE.Path();
    hole.moveTo(HATCH.x0, s(HATCH.z1)); hole.lineTo(HATCH.x0, s(HATCH.z0)); hole.lineTo(HATCH.x1, s(HATCH.z0)); hole.lineTo(HATCH.x1, s(HATCH.z1)); hole.lineTo(HATCH.x0, s(HATCH.z1));
    sh.holes.push(hole);
    const depth = SHIP.deck - SHIP.keel;
    const hg = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 10 });
    hg.rotateX(-Math.PI / 2); hg.translate(0, SHIP.keel, 0);
    const pos = hg.attributes.position, nor = hg.attributes.normal, uv = hg.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (Math.abs(nor.getY(i)) > 0.5) uv.setXY(i, x / 4, z / 4);
      else uv.setXY(i, (x + z * 0.3) / 8, (y - SHIP.keel) / depth);
    }
    uv.needsUpdate = true;
    const hullMat = lam("bmHullM", () => ({ map: T(hullTex(), 1, 1) })), deckMat = lam("bmDeckM", () => ({ map: T(deckTex(), 1, 1) }));
    const hull = new THREE.Mesh(hg, [deckMat, hullMat]); hull.castShadow = true; hull.receiveShadow = true; S.add(hull);
    const D = SHIP.deck;
    // hold: dark liner, cargo floor, stacked cotton bales, teal munition crates, small gold crates
    const holdM = lam("bmHold", () => ({ color: "#3a2e26" }));
    const { x0, x1, z0, z1, cargo } = HATCH, e = 0.04;
    b.add(boxGeo(V(x0 + e, -1, z0 + e), V(x1 - e, D, z0 + 0.1)), holdM); b.add(boxGeo(V(x0 + e, -1, z1 - 0.1), V(x1 - e, D, z1 - e)), holdM);
    b.add(boxGeo(V(x0 + e, -1, z0 + e), V(x0 + 0.1, D, z1 - e)), holdM); b.add(boxGeo(V(x1 - 0.1, -1, z0 + e), V(x1 - e, D, z1 - e)), holdM);
    b.add(boxGeo(V(x0, -1, z0), V(x1, cargo - 1.4, z1)), holdM);
    const bale = lam("bmBaleM", () => ({ map: baleTex() })), crateT = lam("bmCrateT", () => ({ map: crateTex("#2f8f83") })), gold = lam("bmGoldCrate", () => ({ map: crateTex("#d9a441") }));
    const rr = rng(77);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const bx = x0 + 0.3 + i * 1.12, bz = z0 + 0.3 + j * 1.2, top = cargo - 1.4 + (i < 3 ? 1.5 : 1.0) + (rr() < 0.3 ? 0.4 : 0);
      const m = i < 3 ? bale : (i === 4 && j === 1) || (i === 5 && j === 2) ? gold : crateT;
      if (m === gold) { b.add(boxGeo(V(bx, cargo - 1.4, bz), V(bx + 1.0, top - 0.5, bz + 1.05)), crateT); b.add(boxGeo(V(bx + 0.15, top - 0.5, bz + 0.15), V(bx + 0.85, top - 0.1, bz + 0.85)), m); }
      else b.add(boxGeo(V(bx, cargo - 1.4, bz), V(bx + 1.04, top, bz + 1.1)), m);
    }
    // hatch coamings (all hatches), closed hatches with tarpaulins
    const coam = lam("bmCoaming", () => ({ color: "#4f5a60" })), tarp = lam("bmTarp", () => ({ color: "#5f6f4a" }));
    const coaming = (a: number, c: number, za: number, zc: number, open: boolean) => {
      b.add(boxGeo(V(a - 0.3, D, za - 0.3), V(c + 0.3, D + 0.9, za)), coam); b.add(boxGeo(V(a - 0.3, D, zc), V(c + 0.3, D + 0.9, zc + 0.3)), coam);
      b.add(boxGeo(V(a - 0.3, D, za), V(a, D + 0.9, zc)), coam); b.add(boxGeo(V(c, D, za), V(c + 0.3, D + 0.9, zc)), coam);
      if (!open) b.add(boxGeo(V(a, D, za), V(c, D + 1.0, zc)), tarp);
    };
    coaming(x0, x1, z0, z1, true); coaming(-30, -24, -10.5, -5.5, false); coaming(14, 21, -10.5, -5.5, false); coaming(25, 30, -10, -6, false);
    // bulwarks (with gaps at the gangway), forecastle, poop
    const bulw = lam("bmBulwark", () => ({ color: "#5d6970" })), white = lam("bmWhite", () => ({ color: "#ece6d8" })), black = lam("bmBlack", () => ({ color: "#22282c" }));
    for (const z of [-2.3, -13.7]) { b.add(boxGeo(V(-34, D, z - 0.15), V(-6, D + 1.1, z + 0.15)), bulw); b.add(boxGeo(V(-2, D, z - 0.15), V(24, D + 1.1, z + 0.15)), bulw); }
    b.add(boxGeo(V(24, D, -12.2), V(32, D + 2.2, -3.8)), bulw); b.add(boxGeo(V(-37.5, D, -12.5), V(-30, D + 2.4, -3.5)), bulw);
    b.add(boxGeo(V(-37, D + 2.4, -12), V(-31, D + 4.2, -4)), white);
    // midship house: two decks, bridge with windows, funnel, lifeboats, ventilators
    const winM = lam("bmBridgeWin", () => ({ map: T(plainTex("win", "#ece6d8", "rgba(30,50,60,0.85)", 32), 1, 1) }));
    b.add(boxGeo(V(-5, D, -12.4), V(8, D + 3, -3.6), 2), winM);
    b.add(boxGeo(V(-3.6, D + 3, -11.6), V(6.4, D + 5.6, -4.4), 2), winM);
    b.add(boxGeo(V(-2.6, D + 5.6, -10.6), V(4.2, D + 7.4, -5.4), 1.2), winM);
    b.add(boxGeo(V(-4, D + 5.6, -12.2), V(6.8, D + 5.85, -3.8)), white);
    b.add(boxGeo(V(-3, D + 7.4, -11), V(4.6, D + 7.6, -5)), white);
    cyl(b, black, 1.4 - 4.2, D + 5.6, -8, 1.6, 6.5, 18); cyl(b, lam("bmFunnelBand", () => ({ color: "#c8323a" })), 1.4 - 4.2, D + 9.8, -8, 1.63, 0.9, 18);
    for (const z of [-13.2, -2.8]) { b.add(boxGeo(V(-2.5, D + 3.4, z - 0.6), V(3.5, D + 4.4, z + 0.6)), white); pole(b, black, V(-2, D + 3, z), V(-2, D + 5.2, z), 0.06); pole(b, black, V(3, D + 3, z), V(3, D + 5.2, z), 0.06); }
    for (const [vx, vz] of [[-8, -4.2], [-8, -11.8], [11, -4.2], [11, -11.8], [-20, -3.5]] as [number, number][]) { cyl(b, white, vx, D, vz, 0.32, 2.2, 10); const g = new THREE.SphereGeometry(0.5, 10, 6); b.add(g, white, M4(V(vx, D + 2.4, vz + 0.2), V(1, 1, 1.2))); b.add(new THREE.CircleGeometry(0.34, 10), black, M4(V(vx, D + 2.4, vz + 0.81), V(1, 1, 1))); }
    // masts + derricks + stays
    const mastM = lam("bmMast", () => ({ color: "#c9b48a" }));
    for (const mx of [-22, 18]) {
      cyl(b, mastM, mx, D, -8, 0.32, 19, 10, 0.18);
      b.add(boxGeo(V(mx - 0.2, D + 12, -10), V(mx + 0.2, D + 12.4, -6)), mastM);
      b.add(boxGeo(V(mx - 1.2, D, -9.2), V(mx + 1.2, D + 1.4, -6.8)), bulw);
      pole(b, mastM, V(mx, D + 1.6, -7.6), V(mx + (mx < 0 ? 5 : -4), D + 9, -7.6), 0.14);
      pole(b, mastM, V(mx, D + 1.6, -8.4), V(mx + (mx < 0 ? 4.4 : 4.6), D + 8.5, -8.6), 0.14);
      for (const z of [-2.6, -13.4]) pole(b, black, V(mx, D + 18, -8), V(mx - 3, D + 1, z), 0.035, 4);
      pole(b, black, V(mx, D + 18.5, -8), V(mx + (mx < 0 ? 18 : -14), D + 6, -8), 0.03, 4);
    }
    pole(b, black, V(-22, D + 18.5, -8), V(-37, D + 4.4, -8), 0.03, 4); pole(b, black, V(18, D + 18.5, -8), V(37, D + 2.5, -8), 0.03, 4);
    // mooring lines to the quay bollards
    const rope = lam("bmRope", () => ({ color: "#c9b48a" }));
    for (const [sx, bx] of [[-34, -37], [-28, -28], [22, 26], [32, 35]] as [number, number][]) pole(b, rope, V(sx, D + 0.9, -2.2), V(bx, 0.45, 1.1), 0.05, 5);
    // gangway
    pole(b, lam("bmGangway", () => ({ color: "#7a5a3a" })), V(-4, 0.3, 1.6), V(-4, D + 0.6, -2.4), 0.35, 4);
    b.build(S);
  }

  // ---------------- hoses on the quay (shots 6, 7, 10, 14) ----------------
  private buildHoses() {
    const m = lam("bmHose", () => ({ color: "#d8c49a" }));
    const lines: [number, number, number][][] = [
      [[-3.5, 0.5, 10.5], [-6, 0.12, 8], [-9.5, 0.12, 6.2], [-10.6, 0.12, 4.6], [FIREMEN[2][0], 0.8, FIREMEN[2][2]], [FIREMEN[1][0], 0.85, FIREMEN[1][2]], [FIREMEN[0][0] + 0.1, 0.9, FIREMEN[0][2]]],
      [[-1.5, 0.5, 10.5], [-3, 0.12, 8.5], [-4.6, 0.12, 4.4], [-5.2, 0.8, 1.6]],
      [[-19, 0.5, 11.5], [-17.5, 0.12, 8], [-16.4, 0.12, 4.5], [-16.0, 0.8, 1.6]],
      [[-9, 0.12, 5.8], [-11, 0.1, 3.8], [-12.5, 0.1, 1.8], [-9.6, 0.1, 1.4], [-7.4, 0.1, 2.3]],
    ];
    for (const L of lines) {
      const c = new THREE.CatmullRomCurve3(L.map(([x, y, z]) => V(x, y, z)));
      const g = new THREE.TubeGeometry(c, 48, 0.07, 8, false);
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; this.hoses.add(mesh);
    }
  }

  // ---------------- city street ----------------
  private buildCity() {
    const b = new Batch(), r = rng(1857), C = (x: number, y: number, z: number) => V(SET_CITY[0] + x, y, SET_CITY[2] + z);
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => boxGeo(C(x0, y0, z0), C(x1, y1, z1));
    const boxT = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t: number) => boxGeo(C(x0, y0, z0), C(x1, y1, z1), t);
    b.add(boxT(-400, -3, -400, 400, 0, 400, 3), lam("bmCobbleG", () => ({ map: T(cobbleTex(), 1, 1) })));
    const walk = lam("bmWalk", () => ({ map: T(quayTex(), 1, 1) })), kerb = lam("bmKerb", () => ({ color: "#bdb3a2" }));
    for (const [z0, z1] of [[3.8, 4.8], [-4.8, -3.8]]) { b.add(boxT(-120, 0, z0, 120, 0.16, z1, 4), walk); b.add(box(-120, 0, z1 > 0 ? z0 : z1 - 0.12, 120, 0.18, z1 > 0 ? z0 + 0.12 : z1), kerb); }
    const wallMs = [0, 1, 2, 3, 4, 5, 6].map((k) => lam("bmChawl" + k, () => ({ map: chawlBay(k) })));
    const shopMs = [0, 1, 2, 3].map((k) => lam("bmShop" + k, () => ({ map: shopBay(k) })));
    const roofMs = [0, 1, 2].map((k) => lam("bmRoof" + k, () => ({ map: roofTex(k) })));
    const wood = lam("bmWood", () => ({ color: "#6a4a2a" })), woodL = lam("bmWoodL", () => ({ color: "#8a6a44" })), slab = lam("bmSlab", () => ({ color: "#cfc4b0" }));
    const awnM = [0, 1, 2].map((k) => lam("bmAwn" + k, () => ({ map: T(plainTex("awn" + k, ["#c8323a", "#2f8f83", "#e09a2c"][k], "rgba(255,246,220,0.85)", 48), 1, 1) })));
    const iron = lam("bmIron", () => ({ color: "#2a3236" }));
    /** a chawl: ground floor shops, upper floors with a balcony on every floor facing the street (side +1: z grows away) */
    const chawl = (x0: number, x1: number, zs: number, zb: number, floors: number, k: number, flat: boolean) => {
      const H = 3.2, z0 = Math.min(zs, zb), z1 = Math.max(zs, zb), face = zs < zb ? -1 : 1; // face = direction of the street from the building
      b.add(boxT(x0, 0, z0, x1, H, z1, 3.2), shopMs[k % 4]);
      b.add(boxT(x0, H, z0, x1, H * floors, z1, 3.2), wallMs[k % 7]);
      const awn = awnM[k % 3], ze = zs;
      b.add(boxGeo(C(x0 + 0.2, H - 0.35, ze), C(x1 - 0.2, H - 0.15, ze + face * 1.3)), awn);
      for (let fl = 1; fl < floors; fl++) {
        const y = H * fl;
        b.add(boxGeo(C(x0 + 0.1, y - 0.08, Math.min(ze, ze + face * 1.05)), C(x1 - 0.1, y + 0.1, Math.max(ze, ze + face * 1.05))), slab);
        const zr = ze + face * 1.0;
        b.add(boxGeo(C(x0 + 0.1, y + 0.95, Math.min(zr, zr - face * 0.08)), C(x1 - 0.1, y + 1.05, Math.max(zr, zr - face * 0.08))), wood);
        b.add(boxGeo(C(x0 + 0.1, y + 0.1, Math.min(zr, zr - face * 0.06)), C(x1 - 0.1, y + 0.2, Math.max(zr, zr - face * 0.06))), wood);
        for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.24) b.add(boxGeo(C(x, y + 0.2, Math.min(zr, zr - face * 0.05)), C(x + 0.05, y + 0.95, Math.max(zr, zr - face * 0.05))), woodL);
        for (const x of [x0 + 0.15, x1 - 0.25]) b.add(boxGeo(C(x, y + 0.1, Math.min(zr, zr - face * 0.1)), C(x + 0.1, y + 2.9, Math.max(zr, zr - face * 0.1))), wood);
        b.add(boxGeo(C(x0, y + 2.9, Math.min(ze, ze + face * 1.15)), C(x1, y + 3.0, Math.max(ze, ze + face * 1.15))), roofMs[k % 3]);
      }
      const top = H * floors;
      if (flat) {
        b.add(box(x0 - 0.05, top, z0 - 0.05, x1 + 0.05, top + 0.18, z1 + 0.05), slab);
        for (const [a, c, d, e] of [[x0, z0, x1, z0 + 0.2], [x0, z1 - 0.2, x1, z1], [x0, z0, x0 + 0.2, z1], [x1 - 0.2, z0, x1, z1]]) b.add(box(a, top, c, d, top + 0.95, e), wallMs[k % 7]);
        if (r() < 0.6) { cyl(b, lam("bmTank", () => ({ color: "#4a5a5e" })), SET_CITY[0] + x0 + 1.4, top, SET_CITY[2] + (z0 + z1) / 2, 0.7, 1.4, 12); }
      } else roofPrism(b, SET_CITY[0] + x0, SET_CITY[0] + x1, SET_CITY[2] + z0, SET_CITY[2] + z1, top, 2.4 + r() * 0.8, roofMs[k % 3], wallMs[k % 7], true, 0.6, 2.4);
    };
    // the street: two rows of chawls; the hook camera stands on the terrace at x -8..2 of the south row
    const north: [number, number, number, boolean][] = [[-40, -30.4, 3, false], [-30.4, -20.8, 4, false], [-20.8, -14.4, 3, true], [-14.4, -4.8, 4, false], [-4.8, 1.6, 3, false], [1.6, 7.4, 4, false], [7.4, 13.8, 4, true], [13.8, 23.4, 4, false], [23.4, 29.8, 3, false], [29.8, 39.4, 4, false], [39.4, 49, 5, false], [49, 58.6, 4, false]];
    const south: [number, number, number, boolean][] = [[-40, -33.6, 4, false], [-33.6, -24, 3, false], [-24, -17.6, 4, false], [-17.6, -8, 3, false], [-8, 2, 4, true], [2, 8.4, 3, false], [8.4, 18, 4, false], [18, 24.4, 3, true], [24.4, 34, 4, false], [34, 43.6, 3, false], [43.6, 53.2, 4, false]];
    north.forEach(([a, c, fl, flat], i) => chawl(a, c, 4.8, 14.4, fl, i + 1, flat));
    south.forEach(([a, c, fl, flat], i) => chawl(a, c, -4.8, -14.4, fl, i + 4, flat));
    // rows of roofs behind (the rooftop vista of the hook) and further city
    for (let row = 0; row < 4; row++) for (let i = 0; i < 14; i++) {
      const z = 18 + row * 13 + r() * 3, x0 = -50 + i * 8.4 + r() * 2, w = 6 + r() * 3, fl = 3 + Math.floor(r() * 3), k = (row * 14 + i) % 7;
      b.add(boxT(x0, 0, z, x0 + w, fl * 3.2, z + 9, 3.2), wallMs[k]);
      if (r() < 0.75) roofPrism(b, SET_CITY[0] + x0, SET_CITY[0] + x0 + w, SET_CITY[2] + z, SET_CITY[2] + z + 9, fl * 3.2, 2.2 + r(), roofMs[k % 3], wallMs[k], r() < 0.5, 0.5, 2.4);
      else cyl(b, lam("bmTank", () => ({ color: "#4a5a5e" })), SET_CITY[0] + x0 + w / 2, fl * 3.2, SET_CITY[2] + z + 4, 0.8, 1.6, 12);
    }
    for (let i = 0; i < 40; i++) { const z = -60 - r() * 60, x0 = -60 + r() * 120, w = 7 + r() * 5, fl = 3 + Math.floor(r() * 3); b.add(boxT(x0, 0, z, x0 + w, fl * 3.2, z + 9, 3.2), wallMs[i % 7]); roofPrism(b, SET_CITY[0] + x0, SET_CITY[0] + x0 + w, SET_CITY[2] + z, SET_CITY[2] + z + 9, fl * 3.2, 2.4, roofMs[i % 3], wallMs[i % 7], true, 0.5, 2.4); }
    // a clock tower and a dome on the skyline of the hook
    const stoneM = lam("bmTowerStone", () => ({ map: T(memStoneTex(), 1, 1) }));
    b.add(boxT(-46, 0, 92, -39, 44, 99, 2), stoneM); b.add(boxT(-47, 44, 91, -38, 46, 100, 2), stoneM);
    { const g = new THREE.ConeGeometry(5, 12, 4); g.rotateY(Math.PI / 4); g.translate(0, 6, 0); b.add(g, roofMs[0], M4(C(-42.5, 46, 95.5), V(1, 1, 1))); }
    b.add(boxT(22, 0, 84, 38, 18, 100, 3.2), wallMs[2]);
    { const g = new THREE.SphereGeometry(6.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); b.add(g, lam("bmDome", () => ({ color: "#d9cdb0" })), M4(C(30, 18, 92), V(1, 1.2, 1))); }
    // street furniture: telegraph poles + wires, lamp posts
    const poleM = lam("bmPole", () => ({ color: "#5a4636" })), wireM = lam("bmWire", () => ({ color: "#1e2224" }));
    for (let x = -36; x <= 48; x += 12) { cyl(b, poleM, SET_CITY[0] + x, 0, SET_CITY[2] + 4.3, 0.12, 9, 8); b.add(box(x - 0.9, 8.4, 4.2, x + 0.9, 8.55, 4.4), poleM); }
    for (let x = -36; x < 48; x += 12) for (const dx of [-0.7, 0, 0.7]) pole(b, wireM, C(x + dx, 8.6, 4.3), C(x + 12 + dx, 8.6, 4.3), 0.015, 3);
    for (let x = -30; x <= 42; x += 18) { cyl(b, iron, SET_CITY[0] + x, 0, SET_CITY[2] - 4.3, 0.09, 4.2, 8); b.add(box(x - 0.22, 4.2, -4.52, x + 0.22, 4.75, -4.08), lam("bmLampGlass", () => ({ color: "#fff1c4", emissive: new THREE.Color("#7a6a3a") }))); }
    b.build(this.city);
  }

  // ---------------- Byculla memorial courtyard ----------------
  private buildMemorial() {
    const b = new Batch(), C = (x: number, y: number, z: number) => V(SET_MEM[0] + x, y, SET_MEM[2] + z);
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t = 0) => boxGeo(C(x0, y0, z0), C(x1, y1, z1), t);
    const stone = lam("bmMemStone", () => ({ map: T(memStoneTex(), 1, 1) })), paving = lam("bmPaving", () => ({ map: T(quayTex(), 1, 1) }));
    b.add(box(-300, -3, -300, 300, 0, 300, 4), paving);
    b.add(box(-2.2, 0, -2.2, 2.2, 0.4, 2.2, 2), stone); b.add(box(-1.8, 0.4, -1.8, 1.8, 0.8, 1.8, 2), stone); b.add(box(-1.4, 0.8, -1.4, 1.4, 1.2, 1.4, 2), stone);
    b.add(box(-0.9, 1.2, -0.9, 0.9, 2.7, 0.9, 2), stone); b.add(box(-1.0, 2.7, -1.0, 1.0, 2.95, 1.0, 2), stone);
    { const g = new THREE.CylinderGeometry(0.5, 0.62, 6.6, 24); g.translate(0, 3.3, 0); b.add(g, stone, M4(C(0, 2.95, 0), V(1, 1, 1))); }
    b.add(box(-0.78, 9.55, -0.78, 0.78, 9.85, 0.78, 2), stone);
    { const g = new THREE.SphereGeometry(0.45, 16, 10); b.add(g, stone, M4(C(0, 10.25, 0), V(1, 1.2, 1))); const c = new THREE.ConeGeometry(0.16, 0.6, 12); c.translate(0, 0.3, 0); b.add(c, stone, M4(C(0, 10.7, 0), V(1, 1, 1))); }
    // the HQ front behind the courtyard (brick + white arches, engine bays), a clock gable
    const hq = [0, 1].map((k) => lam("bmHQ" + k, () => ({ map: hqBay(k) })));
    for (let i = 0; i < 12; i++) b.add(box(-24 + i * 4, 0, -24, -20 + i * 4, 4, -14, 4), hq[i % 2]);
    b.add(box(-24, 4, -24, 24, 13, -14.4, 4), hq[0]);
    b.add(box(-25, 13, -24.5, 25, 13.6, -13.8), lam("bmCornice", () => ({ color: "#f2eadb" })));
    b.add(box(-4, 13.6, -22, 4, 18, -14.4, 4), hq[0]);
    roofPrism(b, SET_MEM[0] - 4.4, SET_MEM[0] + 4.4, SET_MEM[2] - 22, SET_MEM[2] - 14, 18, 3, lam("bmRoof0", () => ({ map: roofTex(0) })), hq[0], false, 0.4, 2.4);
    { const g = new THREE.CircleGeometry(1.4, 32); b.add(g, lam("bmClock", () => ({ color: "#f6ecd2" })), M4(C(0, 16, -14.35), V(1, 1, 1))); }
    // courtyard walls with railings, trees, a modern engine
    const wall = lam("bmCourtWall", () => ({ color: "#e6d8bc" })), iron = lam("bmIron", () => ({ color: "#2a3236" }));
    for (const x of [-20, 20]) { b.add(box(x - 0.4, 0, -14, x + 0.4, 1.0, 20), wall); for (let z = -13.6; z < 20; z += 0.5) b.add(box(x - 0.04, 1.0, z, x + 0.04, 2.1, z + 0.06), iron); }
    const trunk = lam("bmTrunk", () => ({ color: "#6a4a32" })), leaf = [lam("bmLeaf1", () => ({ color: "#3f7a4a" })), lam("bmLeaf2", () => ({ color: "#5a9a4a" })), lam("bmGulmohar", () => ({ color: "#e8643a" }))];
    const rt = rng(4);
    for (const [x, z, k] of [[-13, -9, 0], [13, -9, 2], [-15, 8, 1], [15, 10, 0], [-9, 16, 2]] as [number, number, number][]) {
      cyl(b, trunk, SET_MEM[0] + x, 0, SET_MEM[2] + z, 0.35, 4.5, 10, 0.25);
      for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(1, 1); b.add(g, leaf[i % 2 ? k : (k + 1) % 2], M4(C(x + (rt() - 0.5) * 3.4, 5.5 + rt() * 2.4, z + (rt() - 0.5) * 3.4), V(2 + rt(), 1.6 + rt() * 0.6, 2 + rt()))); }
    }
    const red = lam("bmEngineRed", () => ({ color: "#c8323a" })), glass = lam("bmEngineGlass", () => ({ color: "#7fb6c4" })), tyre = lam("bmBlack", () => ({ color: "#22282c" }));
    b.add(box(-14, 0.6, -12.5, -6, 3.2, -10), red); b.add(box(-6, 0.6, -12.5, -4, 2.8, -10), red); b.add(box(-5.9, 1.9, -12.3, -4.1, 2.7, -10.2), glass);
    b.add(box(-13.5, 3.2, -12.2, -6.5, 3.5, -10.3), lam("bmLadder", () => ({ color: "#c9cfd0" })));
    for (const x of [-12.5, -6.5]) for (const z of [-12.6, -9.9]) { const g = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16); g.rotateX(Math.PI / 2); b.add(g, tyre, M4(C(x, 0.55, z), V(1, 1, 1))); }
    b.build(this.mem);
  }

  // ---------------- 2011 dredger ----------------
  private buildDredge() {
    const b = new Batch(), C = (x: number, y: number, z: number) => V(SET_DREDGE[0] + x, y, SET_DREDGE[2] + z), r = rng(2011);
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t = 0) => boxGeo(C(x0, y0, z0), C(x1, y1, z1), t);
    const hullM = lam("bmBarge", () => ({ color: "#b8482e" })), deckM = lam("bmBargeDeck", () => ({ color: "#6f7a7c" })), rim = lam("bmRim", () => ({ color: "#f2c418" })), mud = lam("bmMudM", () => ({ map: T(mudTex(), 1, 1) }));
    const { x0, x1, z0, z1, mud: my } = HOPPER, D = 0.75;
    b.add(box(-12, -2.5, -5, x0, D, 5), hullM); b.add(box(x1, -2.5, -5, 12, D, 5), hullM);
    b.add(box(x0, -2.5, -5, x1, D, z0), hullM); b.add(box(x0, -2.5, z1, x1, D, 5), hullM);
    b.add(box(-12, D - 0.02, -5, x0, D, 5), deckM); b.add(box(x1, D - 0.02, -5, 12, D, 5), deckM);
    b.add(box(x0, -2.4, z0, x1, my, z1, 2), mud);
    for (const [a, c, d, e] of [[x0 - 0.2, z0 - 0.2, x1 + 0.2, z0], [x0 - 0.2, z1, x1 + 0.2, z1 + 0.2], [x0 - 0.2, z0, x0, z1], [x1, z0, x1 + 0.2, z1]]) b.add(box(a, D, c, d, D + 0.45, e), rim);
    // grab crane
    const crane = lam("bmGrab", () => ({ color: "#f2c418" })), dark = lam("bmBlack", () => ({ color: "#22282c" })), white = lam("bmWhite", () => ({ color: "#ece6d8" }));
    cyl(b, dark, SET_DREDGE[0] + 8.5, D, SET_DREDGE[2], 1.2, 0.8, 16);
    b.add(box(7, D + 0.8, -1.5, 10.4, D + 4, 1.5), crane); b.add(box(7.4, D + 2.4, 1.5, 9.4, D + 3.6, 1.6), lam("bmEngineGlass", () => ({ color: "#7fb6c4" })));
    pole(b, crane, C(8, D + 3.2, 0), C(-1, D + 11, 0), 0.32, 6);
    pole(b, dark, C(-1, D + 11, 0), C(-1, D + 3.5, 0), 0.04, 4);
    b.add(box(-1.8, D + 2.2, -0.8, -0.2, D + 3.5, 0.8), dark);
    b.add(box(-11, D, -4, -8, D + 3, -1), white); b.add(box(-10.6, D + 3, -3.6, -8.4, D + 4.6, -1.4), white);
    // harbour 2011: container gantry cranes, stacks, a container ship, modern towers
    const red = lam("bmGantryR", () => ({ color: "#c8323a" })), wht = lam("bmGantryW", () => ({ color: "#e6e2d8" }));
    for (let i = 0; i < 4; i++) {
      const x = -70 + i * 38, z = -70;
      for (const dx of [-6, 6]) for (const dz of [-6, 6]) b.add(box(x + dx - 0.6, 0, z + dz - 0.6, x + dx + 0.6, 34, z + dz + 0.6), i % 2 ? red : wht);
      b.add(box(x - 7, 34, z - 26, x + 7, 37, z + 8), i % 2 ? red : wht); b.add(box(x - 3, 30, z - 2, x + 3, 34, z + 3), wht);
    }
    b.add(box(-150, -4, -110, 150, 0, -74), lam("bmQuay2", () => ({ map: T(quayTex(), 1, 1) })));
    const ccol = ["#2f6f9a", "#c8323a", "#e09a2c", "#2f8f83", "#7a4a3a", "#d9d2bd"].map((c) => lam("bmCont" + c, () => ({ map: T(containerTex(c), 1, 1) })));
    for (let i = 0; i < 70; i++) { const x = -140 + (i % 14) * 20 + r() * 2, z = -104 + Math.floor(i / 14) * 5, h = 1 + Math.floor(r() * 4); for (let k = 0; k < h; k++) b.add(box(x, k * 2.6, z, x + 12, k * 2.6 + 2.6, z + 2.4, 2.6), ccol[(i + k) % 6]); }
    b.add(box(-100, WATER - 3, -66, 20, 7, -50), lam("bmCShip", () => ({ color: "#2a3a4a" })));
    for (let i = 0; i < 40; i++) b.add(box(-96 + (i % 10) * 9, 7, -64 + Math.floor(i / 10) * 3.4, -88 + (i % 10) * 9, 9.6, -61 + Math.floor(i / 10) * 3.4, 2.6), ccol[i % 6]);
    b.add(box(4, 7, -64, 16, 22, -52), white);
    const glassT = [0, 1, 2].map((k) => lam("bmTower" + k, () => ({ map: T(plainTex("tw" + k, ["#8fb0c0", "#a9b8bc", "#c9cfc8"][k], "rgba(30,50,60,0.35)", 24), 1, 1) })));
    for (let i = 0; i < 30; i++) { const x = -420 + r() * 840, z = -320 - r() * 200, w = 14 + r() * 20, h = 40 + r() * 120; b.add(box(x, 0, z, x + w, h, z + w, 8), glassT[i % 3]); }
    b.build(this.dredge);
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 4000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- which set ----
    this.harbour.visible = s.scene === "harbour";
    this.ship.visible = s.scene === "harbour" && shipVisible(id) && id !== 3 && id !== 6 && !(id === 8 && f >= 766);
    this.cranes.visible = s.scene === "harbour" && id !== 3 && id !== 6;
    this.hoses.visible = s.scene === "harbour" && (id === 6 || id === 7 || id === 10 || id === 14);
    this.city.visible = s.scene === "city";
    this.mem.visible = s.scene === "memorial";
    this.dredge.visible = s.scene === "dredge";
    this.water.visible = s.scene === "harbour" || s.scene === "dredge";
    (this.water.material as THREE.MeshLambertMaterial).color.set(WATER_COL[s.light]);
    this.waterMap.offset.set((f * 0.00031) % 1, (f * 0.00017) % 1);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 9, 14, 160);
    this.sun.position.copy(focus).addScaledVector(sunDir, 400); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 900; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => { untone(h, su["c" + i].value); });
    const ee = K.sky.e.map((deg) => deg * RAD);
    su.e.value.set(ee[1], ee[2], ee[3], ee[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    const [fn, ff] = s.fog ?? [L.fogNear, L.fogFar];
    this.fog.near = fn; this.fog.far = ff;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 3000); this.sunDisc.scale.setScalar(2 * 3000 * Math.tan(1.7 * RAD)); }
    const maps = (this.cloudMaps[s.light] ??= [0, 1, 2, 3].map((k) => cloudHD(k, LOOK[s.light].cloud)));
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = (i / 12) * Math.PI * 2 + 0.3 + t * 0.004, d = 1900 + (i % 3) * 400, w = 700 + (i % 4) * 160;
      m.visible = true;
      m.position.set(cam.position.x + Math.cos(a) * d, cam.position.y * 0.5 + 300 + (i % 4) * 140, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = maps[i % 4];
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
      ef.use(!!p.soft, !!p.add);
      ef.mesh.visible = true;
      ef.mesh.position.set(p.x, p.y, p.z);
      const g = p.glow ?? 1;
      ef.mat.color.setScalar(g); ef.soft.color.setScalar(g); ef.soft.opacity = p.opacity ?? 1; ef.addm.color.setScalar(g); ef.addm.opacity = p.opacity ?? 1;
      const fog = !p.glow || p.glow <= 1.2;
      for (const m of [ef.mat, ef.soft, ef.addm]) if (m.fog !== fog) { m.fog = fog; m.needsUpdate = true; }
      if (p.flat) ef.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else if (p.yaw !== undefined) ef.mesh.rotation.set(0, p.yaw, p.rot ?? 0);
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
void qY; void qZ; void SHIP;
