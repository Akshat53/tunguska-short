// The whole Molasses 1919 world as one three.js scene: gradient sky + clouds, one harbour water plane, and three sets:
//  street    Commercial Street, North End, 1919 (stylised): cobbles, granite kerbs, brick tenements with sash windows, shop
//            fronts with awnings and fire escapes, the elevated railway (steel posts + box girders + rails) over the street,
//            the yard at the end with the 50-ft riveted molasses tank (grey 1915 / leaking / painted brown / torn open), a
//            brick firehouse, a freight shed, the harbour quay; the molasses WAVE (a frame-pure parametric mesh: glossy
//            dark-amber front with a curling lip, lumpy crest, the flood sheet behind it) and the flood sheet after it.
//  explainer a teal / frosty room: a table and a 3D balance scale (the beam tips on "heavier").
//  office    a 1919 hearing room / drafting office: panelled walls, a tall window, a long table with paper stacks, a bench,
//            a drafting desk with a tilted board.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { Batch, V, lam, boxGeo, quad, tri } from "../tunguska/build";
import { cloudHD, rng } from "../tunguska/paint";
import { TONE, CHAR, untone } from "../tunguska/shade";
import { NOINK } from "../tunguska/ink";
import { fbm1 } from "../../engine/kit/core";
import { LIGHTS, LOOK, WATER_COL, type LightPreset } from "./lights";
import { brickBay, shopBay, cobbleTex, walkTex, roofTex, plainTex, tankTex, molTex, molGloss, officeWall, floorTex, backdropTex } from "./art";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, camAt, WATER, TANK, HOUSE_Z, WALK_Z, EL_Z, EL_Y, STREET_END, SET_EXP, SET_OFF, LADDER,
  waveX, waveGrow, floodY, hookTau, wipeAt, WIPE_FROM, scaleTilt, clamp01, smooth,
} from "./story";

const RAD = Math.PI / 180;
const discTex = () => {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
/** per-shot sun override (degrees, camera-relative) */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = {
  1: { az: 150, el: 30 }, 16: { az: 150, el: 30 }, 5: { az: 150, el: 30 }, 2: { az: 140, el: 28 }, 3: { az: 150, el: 30 }, 4: { az: 160, el: 35 }, 9: { az: 150, el: 30 }, 10: { az: 150, el: 30 },
  11: { az: 150, el: 30 }, 12: { az: 120, el: 16 }, 15: { az: 130, el: 10 }, 8: { az: 140, el: 20 },
};
const T = (t: THREE.Texture, rx = 1, ry = 1) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
const M4 = (p: THREE.Vector3, s: THREE.Vector3, q = new THREE.Quaternion()) => new THREE.Matrix4().compose(p, q, s);
const cyl = (b: Batch, m: THREE.Material, x: number, y0: number, z: number, r: number, h: number, seg = 12, r2 = r) => {
  const g = new THREE.CylinderGeometry(r2, r, h, seg); g.translate(0, h / 2, 0); b.add(g, m, M4(V(x, y0, z), V(1, 1, 1)));
};
const pole = (b: Batch, m: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, r: number, seg = 8) => {
  const d = c.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0);
  b.add(g, m, M4(a, V(1, 1, 1), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())));
};

// ---------------- the wave profile (local: dx forward of the front line, y up) ----------------
// from the flood sheet behind, up the back, over the crest, the curling lip, back under it, down the bulging face to the toe
const PROF: [number, number][] = [
  [-16, 0], [-11, 0.2], [-7.5, 0.42], [-5, 0.62], [-3.2, 0.78], [-1.6, 0.9], [0, 0.98], [1.6, 1.0], [3.0, 0.96], [4.1, 0.86], [4.7, 0.72], [4.6, 0.6],
  [4.0, 0.53], [3.2, 0.52], [2.4, 0.56], [1.5, 0.52], [0.9, 0.42], [0.7, 0.3], [0.9, 0.18], [1.6, 0.08], [2.8, 0.025], [4.2, 0]];
const crSub = (P: [number, number][], n: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as [number, number]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
};
const PROF_S = crSub(PROF, 3);
const LIP_J = PROF_S.findIndex(([dx, h]) => dx > 4.5 && h < 0.66);
const NZ = 72, HW = 26;
const CREST = 6.4; // crest height above the ground (m): "taller than a bus"

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
  private street = new THREE.Group(); private exp = new THREE.Group(); private office = new THREE.Group();
  private tanks: Record<string, THREE.Mesh> = {};
  private tankRoof!: THREE.Mesh; private wipe!: THREE.Mesh; private wipeKey = ""; private ladder = new THREE.Group();
  private wave!: THREE.Mesh; private waveGeo!: THREE.BufferGeometry; private waveMaps: THREE.Texture[] = [];
  private flood!: THREE.Mesh; private floodMaps: THREE.Texture[] = [];
  private beam = new THREE.Group(); private pans: THREE.Group[] = []; private scaleParts: THREE.Object3D[] = []; private scaleBase = new THREE.Group();
  private backTeal!: THREE.Mesh; private backCold!: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
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
    this.waterMap = T(plainTex("water", "#ffffff", "rgba(40,70,80,0.18)", 48), 16000 / 12, 16000 / 12);
    const wg = new THREE.PlaneGeometry(16000, 16000, 96, 96); wg.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wg, lam("mlWater", () => ({ map: this.waterMap, color: "#3a7f92" })));
    this.water.position.y = WATER; this.water.receiveShadow = true; R.add(this.water);

    this.buildStreet(); this.buildTank(); this.buildWave(); this.buildExplainer(); this.buildOffice();
    R.add(this.street, this.exp, this.office);
  }

  // ---------------- street ----------------
  private buildStreet() {
    const b = new Batch(), r = rng(1919);
    const cob = lam("mlCobbleG", () => ({ map: T(cobbleTex(), 1, 1) }));
    b.add(boxGeo(V(-220, -3, -40), V(112, 0, 220), 3), cob);
    const walk = lam("mlWalkM", () => ({ map: T(walkTex(), 1, 1) })), kerb = lam("mlKerb", () => ({ color: "#b7b0a2" }));
    for (const s of [1, -1]) {
      const z0 = s > 0 ? WALK_Z : -HOUSE_Z, z1 = s > 0 ? HOUSE_Z : -WALK_Z;
      b.add(boxGeo(V(-140, 0, z0), V(STREET_END, 0.16, z1), 4), walk);
      b.add(boxGeo(V(-140, 0, s > 0 ? WALK_Z : -WALK_Z - 0.12), V(STREET_END, 0.18, s > 0 ? WALK_Z + 0.12 : -WALK_Z)), kerb);
    }
    const brick = [0, 1, 2, 3, 4, 5].map((k) => lam("mlBrick" + k, () => ({ map: brickBay(k) })));
    const shop = [0, 1, 2, 3].map((k) => lam("mlShop" + k, () => ({ map: shopBay(k) })));
    const tar = [0, 1, 2].map((k) => lam("mlRoof" + k, () => ({ map: roofTex(k) })));
    const stone = lam("mlCornice", () => ({ color: "#d9cfb8" })), iron = lam("mlIron", () => ({ color: "#20282c" }));
    /** a tenement block x0..x1, from the street face zs back to zb, `fl` floors of 3.2 m, a cornice, a flat parapet roof */
    const block = (x0: number, x1: number, zs: number, zb: number, fl: number, k: number, shopFloor = true) => {
      const z0 = Math.min(zs, zb), z1 = Math.max(zs, zb), H = 3.2, face = zs > zb ? 1 : -1;
      b.add(boxGeo(V(x0, 0, z0), V(x1, H, z1), 3.2), shopFloor ? shop[k % 4] : brick[k % 6]);
      b.add(boxGeo(V(x0, H, z0), V(x1, H * fl, z1), 3.2), brick[(k * 7 + 3) % 6]);
      const top = H * fl;
      b.add(boxGeo(V(x0 - 0.1, top - 0.1, z0 - 0.1), V(x1 + 0.1, top + 0.45, z1 + 0.1)), stone);           // cornice band
      b.add(boxGeo(V(x0 - 0.05, top + 0.45, z0), V(x1 + 0.05, top + 1.0, z1)), brick[(k * 3 + 1) % 6]);   // parapet
      b.add(boxGeo(V(x0 + 0.3, top + 0.2, z0 + 0.3), V(x1 - 0.3, top + 0.5, z1 - 0.3)), tar[k % 3]);
      if (r() < 0.6) { const cx = x0 + 1 + r() * (x1 - x0 - 2); b.add(boxGeo(V(cx, top + 1.0, z0 + 2), V(cx + 0.7, top + 2.4, z0 + 2.8)), brick[k % 6]); } // chimney
      b.add(boxGeo(V(x0, H - 0.25, zs - 0.0 + (face > 0 ? 0 : -0.15)), V(x1, H, zs + (face > 0 ? 0.15 : 0))), stone);           // shop cornice
      // fire escape on some blocks: landings + rails + ladders on the street face
      if (k % 3 === 1 && fl >= 4) for (let f = 1; f < fl; f++) {
        const y = H * f + 0.1, zA = zs, zB = zs + face * 1.1, xa = x0 + 0.8, xb = x1 - 0.8;
        b.add(boxGeo(V(xa, y, Math.min(zA, zB)), V(xb, y + 0.08, Math.max(zA, zB))), iron);
        b.add(boxGeo(V(xa, y + 0.95, Math.min(zB, zB - face * 0.05)), V(xb, y + 1.02, Math.max(zB, zB - face * 0.05))), iron);
        for (let x = xa; x <= xb; x += 0.5) b.add(boxGeo(V(x, y, Math.min(zB, zB - face * 0.04)), V(x + 0.04, y + 1.0, Math.max(zB, zB - face * 0.04))), iron);
        pole(b, iron, V(xa + 0.6, y + 0.05, zs + face * 0.6), V(xa + 1.8, y - 3.1, zs + face * 0.6), 0.04, 4);
      }
    };
    // the two street rows (north z > 0 faces -z, south z < 0 faces +z): narrow 3-6 bay blocks, 3-5 floors
    let x = -140, k = 0;
    while (x < STREET_END - 2) { const w = Math.min(STREET_END - x, 6.4 + Math.floor(r() * 3) * 3.2); block(x, x + w, HOUSE_Z, HOUSE_Z + 12, 3 + Math.floor(r() * 3), k++, true); x += w; }
    x = -140;
    while (x < STREET_END - 2) { const w = Math.min(STREET_END - x, 6.4 + Math.floor(r() * 3) * 3.2); block(x, x + w, -HOUSE_Z, -HOUSE_Z - 12, 3 + Math.floor(r() * 3), k++, true); x += w; }
    // rows behind (aerial + rooftop depth)
    for (let row = 0; row < 3; row++) for (let i = 0; i < 18; i++) {
      const s = row % 2 ? -1 : 1, z = s * (22 + Math.floor(row / 2) * 16) , x0 = -130 + i * 9.6 + r() * 1.5, w = 8 + r() * 1.4;
      if (x0 > 30) continue;
      block(x0, x0 + w, z, z + s * 11, 3 + Math.floor(r() * 3), k++, r() < 0.5);
    }
    // the yard at the end of the street: a brick firehouse (north), a wooden freight shed (south), granite quay edges
    block(STREET_END + 4, STREET_END + 20, 14, 26, 3, 5, false);
    const shed = lam("mlShed", () => ({ map: T(plainTex("shed", "#8a6a4a", "rgba(40,24,10,0.35)", 32), 1, 1) }));
    b.add(boxGeo(V(STREET_END + 2, 0, -34), V(STREET_END + 26, 4.6, -24), 4), shed);
    { const g = new THREE.CylinderGeometry(6.2, 6.2, 24, 3, 1); g.rotateZ(Math.PI / 2); g.scale(1, 0.32, 1); b.add(g, tar[1], M4(V(STREET_END + 14, 4.6, -29), V(1, 1, 1))); }
    const quay = lam("mlQuay", () => ({ color: "#9a9284" }));
    b.add(boxGeo(V(112, -3, -40), V(113, 0.2, 220)), quay);
    b.add(boxGeo(V(-220, -3, -41), V(113, 0.2, -40)), quay);
    // the elevated railway along the street and on over the yard: posts, two box girders, cross ties, rails
    const elM = lam("mlEl", () => ({ color: "#3e4a4c" })), elD = lam("mlElD", () => ({ color: "#2a3234" }));
    const EZ = [-EL_Z - 1.8, -EL_Z + 1.8]; // two girder lines over the south half of the street
    for (let x = -140; x <= 100; x += 12) for (const z of EZ) {
      b.add(boxGeo(V(x - 0.22, 0, z - 0.22), V(x + 0.22, EL_Y, z + 0.22)), elM);
      b.add(boxGeo(V(x - 0.4, 0, z - 0.4), V(x + 0.4, 0.5, z + 0.4)), elD);
      pole(b, elM, V(x - 1.6, EL_Y - 0.1, z), V(x, EL_Y - 1.8, z), 0.08, 4); pole(b, elM, V(x + 1.6, EL_Y - 0.1, z), V(x, EL_Y - 1.8, z), 0.08, 4);
    }
    for (const z of EZ) { b.add(boxGeo(V(-140, EL_Y, z - 0.3), V(100, EL_Y + 1.0, z + 0.3)), elM); b.add(boxGeo(V(-140, EL_Y + 0.15, z - 0.36), V(100, EL_Y + 0.25, z + 0.36)), elD); }
    for (let x = -140; x <= 100; x += 2.5) b.add(boxGeo(V(x, EL_Y + 1.0, EZ[0] - 0.5), V(x + 0.25, EL_Y + 1.16, EZ[1] + 0.5)), elD);
    for (const z of [-EL_Z - 0.75, -EL_Z + 0.75]) b.add(boxGeo(V(-140, EL_Y + 1.16, z - 0.06), V(100, EL_Y + 1.28, z + 0.06)), iron);
    for (let x = -140; x <= 100; x += 12) b.add(boxGeo(V(x - 0.18, EL_Y - 0.3, EZ[0]), V(x + 0.18, EL_Y, EZ[1])), elM);
    // street lamps (posts with lanterns), telegraph poles with wires on the north side, a few crates + barrels by the shops
    const lampM = lam("mlLamp", () => ({ color: "#1f2a2e" })), glassM = lam("mlLampGlass", () => ({ color: "#fff1c4", emissive: new THREE.Color("#5a4a2a") }));
    for (let x = -130; x <= 34; x += 15) for (const z of [-WALK_Z - 0.5, WALK_Z + 0.5]) { cyl(b, lampM, x + (z > 0 ? 7 : 0), 0, z, 0.08, 3.6, 8); b.add(boxGeo(V(x + (z > 0 ? 7 : 0) - 0.2, 3.6, z - 0.2), V(x + (z > 0 ? 7 : 0) + 0.2, 4.1, z + 0.2)), glassM); b.add(boxGeo(V(x + (z > 0 ? 7 : 0) - 0.26, 4.1, z - 0.26), V(x + (z > 0 ? 7 : 0) + 0.26, 4.22, z + 0.26)), lampM); }
    const poleM = lam("mlPole", () => ({ color: "#5a4636" })), wireM = lam("mlWire", () => ({ color: "#1e2224" }));
    for (let x = -130; x <= 34; x += 14) { cyl(b, poleM, x, 0, WALK_Z + 1.0, 0.11, 10.5, 8); b.add(boxGeo(V(x - 0.9, 9.9, WALK_Z + 0.9), V(x + 0.9, 10.05, WALK_Z + 1.1)), poleM); }
    for (let x = -130; x < 34; x += 14) for (const dx of [-0.7, 0, 0.7]) pole(b, wireM, V(x + dx, 10.1, WALK_Z + 1.0), V(x + 14 + dx, 10.1, WALK_Z + 1.0), 0.015, 3);
    const wood = lam("mlCrate", () => ({ color: "#9a7448" })), barrel = lam("mlBarrel", () => ({ color: "#7a5230" }));
    for (let i = 0; i < 26; i++) {
      const xx = -120 + r() * 150, s = r() < 0.5 ? 1 : -1, z = s * (WALK_Z + 0.6 + r() * 0.8);
      if (xx > -22 && xx < 12) continue; // keep the hook street clear for the runners and the wave
      if (r() < 0.5) b.add(boxGeo(V(xx, 0.16, z - 0.35), V(xx + 0.7, 0.86, z + 0.35)), wood); else cyl(b, barrel, xx, 0.16, z, 0.3, 0.9, 10, 0.26);
    }
    // the harbour beyond the yard: a pier and a few moored schooners (hull + masts)
    const hullM = lam("mlHull", () => ({ color: "#2f3a40" })), mastM = lam("mlMast", () => ({ color: "#6a4a2a" }));
    for (const [hx, hz, L] of [[150, -10, 30], [170, 30, 26], [140, 70, 34], [60, -70, 28]] as [number, number, number][]) {
      if (hx > 120) b.add(boxGeo(V(hx - 4, WATER - 1, hz - L / 2), V(hx + 4, 2.4, hz + L / 2)), hullM); else b.add(boxGeo(V(hx - L / 2, WATER - 1, hz - 4), V(hx + L / 2, 2.4, hz + 4)), hullM);
      for (const d of [-0.25, 0.2]) cyl(b, mastM, hx + (hx > 120 ? 0 : d * L), 2.4, hz + (hx > 120 ? d * L : 0), 0.18, 22, 6, 0.12);
    }
    b.build(this.street);
  }

  // ---------------- the tank (four looks), its roof, the paint wipe, the ladder ----------------
  private buildTank() {
    const { x, z, R, H } = TANK;
    const mk = (key: string, kind: number) => {
      const m = lam("mlTankM" + key, () => ({ map: T(tankTex(kind), 10, 5), side: THREE.DoubleSide }));
      return m;
    };
    const geo = new THREE.CylinderGeometry(R, R, H, 96, 5, true); geo.translate(0, H / 2, 0);
    for (const [key, kind] of [["grey", 0], ["leak", 1], ["brown", 2]] as [string, number][]) {
      const m = new THREE.Mesh(geo, mk(key, kind)); m.position.set(x, 0, z); m.castShadow = true; m.receiveShadow = true;
      this.tanks[key] = m; this.street.add(m);
    }
    // torn: the shell with a gap facing the street, ragged top near the tear
    const gap = 1.7, tg = new THREE.CylinderGeometry(R, R, H, 96, 8, true, -Math.PI / 2 + gap / 2, Math.PI * 2 - gap); tg.translate(0, H / 2, 0);
    const p = tg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vz = p.getZ(i), vy = p.getY(i), a = Math.atan2(vx, vz);
      let d = Math.abs(((a + Math.PI / 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); // angular distance from the gap centre (-pi/2)
      d = Math.max(0, d - gap / 2);
      const cap = H * (0.25 + 0.75 * smooth(d / 1.2)) + 0.6 * Math.sin(a * 23);
      if (vy > cap) p.setY(i, cap);
    }
    tg.computeVertexNormals();
    const torn = new THREE.Mesh(tg, mk("brown", 2)); torn.position.set(x, 0, z); torn.castShadow = true; this.tanks.torn = torn; this.street.add(torn);
    // the shallow conical roof + a rim + a catwalk rail
    const rg = new THREE.ConeGeometry(R + 0.3, 2.2, 96, 1, true); rg.translate(0, H + 1.1, 0);
    this.tankRoof = new THREE.Mesh(rg, lam("mlTankRoof", () => ({ color: "#5d6466", side: THREE.DoubleSide }))); this.tankRoof.position.set(x, 0, z); this.street.add(this.tankRoof);
    // the paint wipe overlay (rebuilt when the angle changes)
    this.wipe = new THREE.Mesh(new THREE.BufferGeometry(), mk("brown", 2)); this.wipe.position.set(x, 0, z); this.street.add(this.wipe);
    // the ladder leaning on the wall in shot 11
    const lb = new Batch(), lw = lam("mlLadder", () => ({ color: "#b48a54" }));
    const foot = LADDER.x - 1.7;
    for (const dz of [-0.28, 0.28]) pole(lb, lw, V(foot, 0, LADDER.z + dz), V(LADDER.x, LADDER.top, LADDER.z + dz), 0.05, 6);
    for (let i = 1; i < 20; i++) { const u = i / 20; lb.add(boxGeo(V(foot + (LADDER.x - foot) * u - 0.04, LADDER.top * u, LADDER.z - 0.28), V(foot + (LADDER.x - foot) * u + 0.04, LADDER.top * u + 0.05, LADDER.z + 0.28)), lw); }
    lb.build(this.ladder); this.street.add(this.ladder);
  }
  private setWipe(a1: number) {
    const key = (Math.round(a1 * 400) / 400).toFixed(4);
    if (key === this.wipeKey) return;
    this.wipeKey = key;
    const g = new THREE.CylinderGeometry(TANK.R + 0.05, TANK.R + 0.05, TANK.H, 48, 1, true, WIPE_FROM, Math.max(0.001, a1 - WIPE_FROM)); g.translate(0, TANK.H / 2, 0);
    // keep the texture scale of the full tank: u spans thetaLength / 2pi of the 10 repeats
    const uv = g.attributes.uv, k = (a1 - WIPE_FROM) / (Math.PI * 2);
    for (let i = 0; i < uv.count; i++) uv.setX(i, (WIPE_FROM / (Math.PI * 2)) + uv.getX(i) * k);
    this.wipe.geometry.dispose(); this.wipe.geometry = g;
  }

  // ---------------- the wave + flood sheet ----------------
  private buildWave() {
    const ns = PROF_S.length;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(NZ * ns * 3), 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(NZ * ns * 2), 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(NZ * ns * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < NZ - 1; i++) for (let j = 0; j < ns - 1; j++) { const a = i * ns + j, b2 = a + ns; idx.push(a, b2, a + 1, b2, b2 + 1, a + 1); }
    g.setIndex(idx);
    this.waveGeo = g;
    const map = T(molTex(), 1, 1), gloss = T(molGloss(), 1, 1);
    this.waveMaps = [map, gloss];
    // glossy syrup: a real Phong specular from the sun + painted gloss streaks (emissive), warm vertex shading for the thick body
    const mat = new THREE.MeshPhongMaterial({ map, emissiveMap: gloss, emissive: new THREE.Color(1.0, 0.72, 0.42), vertexColors: true, side: THREE.DoubleSide,
      specular: new THREE.Color("#ffdcaa"), shininess: 38 });
    this.wave = new THREE.Mesh(g, mat); this.wave.frustumCulled = false; this.wave.castShadow = true; this.wave.receiveShadow = true;
    this.street.add(this.wave);
    const fm = T(molTex(), 1, 1), fg = T(molGloss(), 1, 1);
    this.floodMaps = [fm, fg];
    const fgeo = new THREE.PlaneGeometry(1, 1, 8, 8); fgeo.rotateX(-Math.PI / 2);
    this.flood = new THREE.Mesh(fgeo, new THREE.MeshPhongMaterial({ map: fm, emissiveMap: fg, emissive: new THREE.Color(0.85, 0.6, 0.36), specular: new THREE.Color("#ffdcaa"), shininess: 30, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    this.flood.receiveShadow = true; this.street.add(this.flood);
  }
  private poseWave(id: number, f: number) {
    const X = waveX(id, f);
    this.wave.visible = X !== null;
    const fy = floodY(id);
    this.flood.visible = fy > -5;
    const t = id === 5 ? f / FPS : hookTau(id, f);
    if (this.flood.visible) {
      const x0 = X !== null ? X + 9 : -160, x1 = 112, z0 = -40, z1 = 60;
      this.flood.position.set((x0 + x1) / 2, fy, (z0 + z1) / 2); this.flood.scale.set(x1 - x0, 1, z1 - z0);
      for (const m of this.floodMaps) { m.repeat.set((x1 - x0) / 7, (z1 - z0) / 7); m.offset.set(-(x1 - x0) / 7 + ((t * 0.05) % 1), 0); }
    }
    if (X === null) return;
    const grow = waveGrow(id, f), ns = PROF_S.length;
    const pos = this.waveGeo.attributes.position as THREE.BufferAttribute, uv = this.waveGeo.attributes.uv as THREE.BufferAttribute, col = this.waveGeo.attributes.color as THREE.BufferAttribute;
    const D = fy;
    for (let i = 0; i < NZ; i++) {
      const z = -HW + (2 * HW * i) / (NZ - 1);
      const sH = (1 + 0.2 * fbm1(z * 0.21 + t * 0.55, 3)) * (0.92 + 0.08 * Math.cos((z / HW) * Math.PI * 0.5)) * grow;
      const off = 1.4 * fbm1(z * 0.11 - t * 0.35, 5) + 0.6 * Math.cos((z / 9) * Math.PI * 0.5) * (Math.abs(z) < 9 ? 1 : 0);
      const roll = 0.18 * Math.sin(t * 2.4 + z * 0.7);
      let arc = 0;
      for (let j = 0; j < ns; j++) {
        const [dx0, h] = PROF_S[j];
        const curl = h > 0.45 && dx0 > 2.0 && j > 8 ? roll * (h - 0.4) * 2 : 0;
        const dx = dx0 + off + curl;
        const y = (dx0 < 0 ? D * (1 - h) : 0) + h * (CREST * sH);
        const yy = dx0 < -0.5 ? Math.max(y, D) : y;
        const k = i * ns + j;
        pos.setXYZ(k, X - dx, Math.max(0.02, yy), z);
        if (j) { const [pdx, ph] = PROF_S[j - 1]; arc += Math.hypot(dx0 - pdx, (h - ph) * CREST); }
        uv.setXY(k, z / 5 + 0.15 * Math.sin(t + j * 0.3), arc / 4 - t * 0.5);
        // warm glossy amber on the crest and the lip, deep brown on the face and toe
        const under = j > LIP_J && h < 0.6 && h > 0.36; // the shadowed underside of the lip (the curl cavity)
        // thick syrup: a hot amber crest, a darker body, a near-black curl underside and toe
        const lit = under ? 0.3 : j > LIP_J ? 0.5 + 0.45 * h : h > 0.94 ? 1.9 : 0.7 + 0.9 * h * h;
        col.setXYZ(k, lit * 1.25, lit * 0.92, lit * 0.62);
      }
    }
    pos.needsUpdate = true; uv.needsUpdate = true; col.needsUpdate = true;
    this.waveGeo.computeVertexNormals();
    void this.waveMaps;
  }

  // ---------------- explainer room ----------------
  private buildExplainer() {
    const b = new Batch(), C = (x: number, y: number, z: number) => V(SET_EXP[0] + x, y, SET_EXP[2] + z);
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t = 0) => boxGeo(C(x0, y0, z0), C(x1, y1, z1), t);
    b.add(box(-8, -0.2, -6, 8, 0, 8, 2), lam("mlExpFloor", () => ({ color: "#2a6f6a" })));
    b.add(box(-2.4, 0, -1.0, 2.4, 0.62, 1.0), lam("mlExpTable", () => ({ map: T(plainTex("expT", "#2a6f6a", "rgba(10,40,40,0.35)", 64), 6, 1) })));
    b.add(box(-2.5, 0.62, -1.1, 2.5, 0.7, 1.1), lam("mlExpTableTop", () => ({ color: "#e6b85a" })));
    // the balance scale: a base, a post, the pivot; the beam + pans are a separate posed group
    const brass = lam("mlBrass", () => ({ color: "#d6a542" })), dark = lam("mlScaleDark", () => ({ color: "#3a2a1e" }));
    b.build(this.exp);
    const sb = new Batch();
    sb.add(box(-0.32, 0.7, -0.2, 0.32, 0.8, 0.2), dark);
    cyl(sb, brass, SET_EXP[0], 0.8, SET_EXP[2], 0.035, 0.95, 10);
    sb.build(this.scaleBase); this.exp.add(this.scaleBase);
    const tb = new Batch();
    tb.add(boxGeo(V(-0.6, -0.025, -0.03), V(0.6, 0.025, 0.03)), brass);
    { const g = new THREE.SphereGeometry(0.07, 12, 8); tb.add(g, brass); }
    tb.build(this.beam);
    this.beam.position.set(SET_EXP[0], 1.75, SET_EXP[2]);
    this.exp.add(this.beam);
    for (let i = 0; i < 2; i++) {
      const pg = new THREE.Group(), pb = new Batch();
      for (const [dx, dz] of [[-0.15, 0.08], [0.15, 0.08], [0, -0.15]]) pole(pb, dark, V(0, 0, 0), V(dx, -0.62, dz), 0.006, 4);
      const g = new THREE.CylinderGeometry(0.21, 0.17, 0.04, 24); g.translate(0, -0.64, 0); pb.add(g, brass);
      pb.build(pg); this.pans.push(pg); this.exp.add(pg);
    }
    this.scaleParts = [this.scaleBase, this.beam, ...this.pans];
    // the backdrop walls (teal for the weight, frosty for the cold)
    const wg = new THREE.PlaneGeometry(24, 12);
    this.backTeal = new THREE.Mesh(wg, lam("mlBackTeal", () => ({ map: backdropTex(0) }))); this.backTeal.position.copy(C(0, 5, -4)); this.exp.add(this.backTeal);
    this.backCold = new THREE.Mesh(wg, lam("mlBackCold", () => ({ map: backdropTex(1) }))); this.backCold.position.copy(C(0, 5, -3.98)); this.exp.add(this.backCold);
    for (const s of [-1, 1]) { const m = new THREE.Mesh(wg, lam("mlBackSide", () => ({ color: "#1f5f66" }))); m.position.copy(C(s * 9, 5, 2)); m.rotation.y = -s * Math.PI / 2; this.exp.add(m); }
  }
  poseScale(f: number) {
    const a = scaleTilt(f);
    this.beam.rotation.set(0, 0, -a);
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1, x = SET_EXP[0] + s * 0.57 * Math.cos(a), y = 1.75 - s * 0.57 * Math.sin(a);
      this.pans[i].position.set(x, y, SET_EXP[2]);
    }
  }
  panTop(i: number): [number, number, number] { const p = this.pans[i].position; return [p.x, p.y - 0.615, p.z]; }

  // ---------------- office ----------------
  private buildOffice() {
    const b = new Batch(), C = (x: number, y: number, z: number) => V(SET_OFF[0] + x, y, SET_OFF[2] + z);
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, t = 0) => boxGeo(C(x0, y0, z0), C(x1, y1, z1), t);
    b.add(box(-12, -0.2, -6, 12, 0, 12, 4), lam("mlFloor", () => ({ map: T(floorTex(), 1, 1) })));
    const wall = lam("mlOfficeWall", () => ({ map: T(officeWall(), 1, 1) }));
    b.add(box(-12, 0, -4.2, 12, 5, -4, 4), wall);
    b.add(box(-12.2, 0, -4, -12, 5, 12, 4), wall); b.add(box(12, 0, -4, 12.2, 5, 12, 4), wall);
    b.add(box(-12, 5, -4.2, 12, 5.2, 12), lam("mlCeil", () => ({ color: "#efe6d0" })));
    // tall windows in the back wall (bright panes + dark mullions)
    const pane = lam("mlPane", () => ({ color: "#dff1fa", emissive: new THREE.Color("#a8c8d8") })), frame = lam("mlFrame", () => ({ color: "#3a2414" }));
    for (const x of [-6.5, -1.5, 3.5, 7.6]) {
      b.add(box(x - 1.0, 1.2, -4.0, x + 1.0, 4.3, -3.95), pane);
      b.add(box(x - 1.1, 1.1, -3.95, x + 1.1, 1.2, -3.85), frame); b.add(box(x - 1.1, 4.3, -3.95, x + 1.1, 4.4, -3.85), frame);
      b.add(box(x - 0.05, 1.2, -3.95, x + 0.05, 4.3, -3.88), frame); b.add(box(x - 1.0, 2.7, -3.95, x + 1.0, 2.78, -3.88), frame);
      for (const s of [-1, 1]) b.add(box(x + s * 1.1 - 0.05, 1.1, -3.95, x + s * 1.1 + 0.05, 4.4, -3.85), frame);
    }
    // the hearing table: long, dark wood, green baize top, paper stacks, ink stand, a bell
    const woodD = lam("mlWoodD", () => ({ color: "#4a2c18" })), baize = lam("mlBaize", () => ({ color: "#2f5f4a" })), paper = lam("mlPaper", () => ({ color: "#f4efe0" }));
    b.add(box(-3.4, 0, -1.6, 3.4, 0.82, -0.8), woodD); b.add(box(-3.5, 0.82, -1.7, 3.5, 0.9, -0.7), baize);
    const r = rng(13);
    for (let i = 0; i < 9; i++) { const x = -3.1 + i * 0.75 + r() * 0.2, h = 0.04 + r() * 0.22; b.add(box(x, 0.9, -1.45 + r() * 0.3, x + 0.32, 0.9 + h, -1.0 + r() * 0.2), paper); }
    cyl(b, lam("mlBrassO", () => ({ color: "#d6a542" })), SET_OFF[0] + 0.4, 0.9, SET_OFF[2] - 1.0, 0.07, 0.1, 10);
    // a flag-free wall clock, bookshelves, a bench for the public
    { const g = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 24); g.rotateX(Math.PI / 2); b.add(g, lam("mlClockFace", () => ({ color: "#f6ecd2" })), M4(C(0, 3.9, -3.9), V(1, 1, 1))); }
    for (const x of [-10.5, 9.0]) { b.add(box(x, 0, -3.9, x + 2.2, 3.6, -3.3), woodD); for (let s = 0; s < 5; s++) for (let j = 0; j < 9; j++) b.add(box(x + 0.1 + j * 0.23, 0.2 + s * 0.7, -3.85, x + 0.28 + j * 0.23, 0.72 + s * 0.7 - (j % 3) * 0.05, -3.4), lam("mlBook" + ((s + j) % 4), () => ({ color: ["#8a3a2a", "#2f5f4a", "#c8a06a", "#2a4a6a"][(s + j) % 4] }))); }
    b.add(box(-4.2, 0, 2.6, 4.2, 0.48, 3.1), woodD); b.add(box(-4.2, 0.48, 3.0, 4.2, 1.1, 3.12), woodD);
    // the drafting desk (right): legs, a tilted board; the plan + stamp are cards
    b.add(box(4.0, 0, -0.5, 6.0, 0.9, 0.8), woodD);
    { const g = boxGeo(V(-1.1, -0.03, -0.75), V(1.1, 0.03, 0.75)); b.add(g, lam("mlBoard", () => ({ color: "#c8a06a" })), M4(C(5.0, 0.92, 0.15), V(1, 1, 1), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), 0.0))); }
    b.add(box(3.6, 0, -0.2, 3.95, 1.8, 0.1), woodD); // a lamp post of the desk
    b.add(box(3.4, 1.8, -0.3, 4.2, 1.95, 0.3), lam("mlLampShade", () => ({ color: "#2f5f4a" })));
    b.build(this.office);
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
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.12; cam.far = 4000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- which set ----
    this.street.visible = s.scene === "street";
    this.exp.visible = s.scene === "explainer";
    this.office.visible = s.scene === "office";
    this.water.visible = s.scene === "street";
    (this.water.material as THREE.MeshLambertMaterial).color.set(WATER_COL[s.light]);
    this.waterMap.offset.set((f * 0.00031) % 1, (f * 0.00017) % 1);
    // ---- the tank: 1915 grey (9), leaking (10, 11), painted brown (1919), torn after the burst ----
    const torn = id === 8 || id === 12 || (id === 5 && f >= BURST_F) || id === 1 || id === 16;
    const look = id === 9 ? "grey" : id === 10 || id === 11 ? "leak" : torn ? "torn" : "brown";
    for (const k of Object.keys(this.tanks)) this.tanks[k].visible = k === look;
    this.tankRoof.visible = !torn;
    this.wipe.visible = id === 11 && f >= 905;
    if (this.wipe.visible) this.setWipe(wipeAt(f));
    this.ladder.visible = id === 11;
    if (s.scene === "street") this.poseWave(id, f); else { this.wave.visible = false; this.flood.visible = false; }
    if (s.scene === "explainer") { this.poseScale(f); this.backCold.visible = id === 7; this.backTeal.visible = id !== 7; this.scaleParts.forEach((o) => (o.visible = id === 6)); }
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
    this.sunDisc.visible = s.light === "golden" && s.scene === "street";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 3000); this.sunDisc.scale.setScalar(2 * 3000 * Math.tan(1.7 * RAD)); }
    const maps = (this.cloudMaps[s.light] ??= [0, 1, 2, 3].map((k) => cloudHD(k, LOOK[s.light].cloud)));
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = (i / 12) * Math.PI * 2 + 0.3 + t * 0.004, d = 1900 + (i % 3) * 400, w = 700 + (i % 4) * 160;
      m.visible = s.scene === "street";
      m.position.set(cam.position.x + Math.cos(a) * d, cam.position.y * 0.5 + 300 + (i % 4) * 140, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = maps[i % 4];
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), upv = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1), fwd = V(0, 0, 0);
    cam.getWorldDirection(fwd);
    const st = stage(id, f, { pos: cam.position, right, up: upv, fov: c.fov, sun: sunDir, fwd }, { panTop: (i: number) => this.panTop(i) });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5 * sc2))) continue;
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
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(Math.abs(p.w), p.h)))) continue;
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
    void clamp01; void quad; void tri;
    return focus;
  }
}
const BURST_F = 325;
