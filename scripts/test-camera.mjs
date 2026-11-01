// usage: node --no-warnings scripts/test-camera.mjs     Unit + property tests for src/engine/camera (no rendering). Exit 1 on any failure.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { build } from "esbuild";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cam-test-")), out = path.join(tmp, "cam.mjs");
await build({ entryPoints: [new URL("../src/engine/camera/index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
const C = await import(out); fs.rmSync(tmp, { recursive: true, force: true });
let fails = 0; const t = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " - " + detail : ""}`); if (!ok) fails++; };
const near = (a, b, e) => Math.abs(a - b) <= e;
const sub = C.sub, len = C.len;

// ---- easing ----
{ const p = (u) => C.profile(u, 0.3, 0.3), N = 400; let mono = true, prev = -1; for (let i = 0; i <= N; i++) { const v = p(i / N); if (v < prev - 1e-12) mono = false; prev = v; }
  t("profile: starts at 0, ends at 1, monotone", near(p(0), 0, 1e-12) && near(p(1), 1, 1e-9) && mono);
  const vel = (u) => (p(u + 1e-4) - p(u - 1e-4)) / 2e-4; t("profile: zero velocity at both ends, continuous cruise", near(vel(1e-3), 0, 0.01) && near(vel(1 - 1e-3), 0, 0.01) && near(vel(0.45), vel(0.55), 1e-3), `cruise speed ${vel(0.5).toFixed(3)}`);
  let acc = 0, a0 = 1; for (let i = 1; i < N - 1; i++) { const u = i / N, a = (p(u + 1 / N) - 2 * p(u) + p(u - 1 / N)) * N * N; if (i > 1) acc = Math.max(acc, Math.abs(a - a0) / N); a0 = a; }
  t("profile: acceleration has no jumps (max change per step small)", acc < 0.6, `max step ${acc.toFixed(3)}`); }

// ---- spline ----
{ const pts = [[0, 0, 0], [10, 2, 0], [14, 6, 8], [30, 6, 10]], P = C.makePath(pts);
  t("spline: starts and ends on the end points", len(sub(P.at(0), pts[0])) < 1e-9 && len(sub(P.at(1), pts[3])) < 1e-6);
  const knots = [1, 2].map((k) => { const g = k; /* spline parameter of control point k */ return len(sub(P.at(P.t ? 0 : 0), pts[0])); });
  let minD = Infinity; for (const k of [1, 2]) { for (let i = 0; i <= 2000; i++) minD = Math.min(minD, len(sub(P.at(i / 2000), pts[k]))); } t("spline: passes through interior control points", minD < 0.05, `closest approach ${minD.toFixed(4)} m`);
  let spd = []; for (let i = 0; i < 300; i++) spd.push(len(sub(P.at((i + 1) / 300), P.at(i / 300)))); const m = spd.reduce((a, b) => a + b) / spd.length;
  t("spline: constant speed along arc length (+/-3%)", Math.max(...spd) / m < 1.03 && Math.min(...spd) / m > 0.97, `spread ${(Math.min(...spd) / m).toFixed(3)}..${(Math.max(...spd) / m).toFixed(3)}`);
  let maxTurn = 0; for (let i = 1; i < 600; i++) { const a = P.tangent((i - 1) / 600), b = P.tangent(i / 600); maxTurn = Math.max(maxTurn, Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))); }
  t("spline: tangent is continuous (no corners, max turn per step < 3 deg)", maxTurn < 0.0524, `${(maxTurn * 57.3).toFixed(2)} deg`); }

// ---- framing ----
{ const fov = 40, h = 1.7, fill = 0.5, d = C.distanceForHeight(h, fov, fill), eye = [0, 1.6, 0], pos = C.add(eye, [0, 0, d]);
  const look = C.lookForEyeLine(eye, C.visibleHeight(d, fov), 0.38), cam = { pos, look, fov };
  const top = C.project(cam, [0, 1.6 + 0.1, 0]), feet = C.project(cam, [0, 1.6 + 0.1 - h, 0]), eyeN = C.project(cam, eye);
  t("framing: a 1.7 m subject fills 50% of the frame height (+/-3%)", near((top.y - feet.y) / 2, fill, 0.03), `${(((top.y - feet.y) / 2) * 100).toFixed(1)}%`);
  t("framing: eye line sits at 38% from the top", near((1 - eyeN.y) / 2, 0.38, 0.01), `${(((1 - eyeN.y) / 2) * 100).toFixed(1)}%`);
  const grp = [[-3, 1.6, 0], [2.5, 1.6, 4], [0, 1.6, -2]], c = C.mean3(grp), gd = C.groupDistance(grp, c, 40), gcam = { pos: C.add(c, [0, 0, gd]), look: c, fov: 40 };
  t("framing: group fits the 9:16 safe area", grp.every((p) => C.inSafe(C.project(gcam, p))), `distance ${gd.toFixed(1)} m`); }

// ---- collision ----
{ const obs = [{ kind: "sphere", c: [0, 1, 0], r: 2 }, { kind: "cyl", x: 10, z: 0, r: 0.5, h: 20 }, { kind: "box", min: [20, 0, -2], max: [24, 3, 2] }];
  const inS = C.avoid([0.2, 1.1, 0.1], obs, 0, 0.5), onG = C.avoid([5, -3, 5], obs, 0, 0.5), inC = C.avoid([10.1, 4, 0.1], obs, 0, 0.5), inB = C.avoid([22, 1.5, 0.2], obs, 0, 0.5);
  t("collision: camera inside a sphere is pushed out with margin", C.clearance(inS, obs, 0) >= 0.499, `clearance ${C.clearance(inS, obs, 0).toFixed(3)}`);
  t("collision: camera below the ground is lifted", onG[1] >= 0.5, `y ${onG[1].toFixed(3)}`);
  t("collision: camera inside a tree trunk is pushed out", C.clearance(inC, obs, 0) >= 0.499 && Math.hypot(inC[0] - 10, inC[2]) >= 0.999);
  t("collision: camera inside a box leaves through the nearest face", C.clearance(inB, obs, 0) >= 0.499, `clearance ${C.clearance(inB, obs, 0).toFixed(3)}`);
  let cont = true, maxStep = 0, prev = C.avoid([-5, 1, 1.5], obs, 0, 0.5); for (let i = 1; i <= 400; i++) { const q = C.avoid([-5 + i * 0.025, 1, 1.5], obs, 0, 0.5), st = len(sub(q, prev)); maxStep = Math.max(maxStep, st); if (st > 0.06) cont = false; prev = q; }
  t("collision: a camera path grazing a sphere slides around it (no jumps, 2.5 cm steps stay < 6 cm)", cont, `max step ${maxStep.toFixed(3)} m`);
  const clr = []; for (let i = 0; i <= 400; i++) clr.push(C.clearance(C.avoid([-5 + i * 0.025, 1, 1.5], obs, 0, 0.5), obs, 0)); t("collision: clearance never drops below the margin along the sweep", Math.min(...clr) >= 0.49, `min ${Math.min(...clr).toFixed(3)} m`); }

// ---- tracking filter ----
{ const jit = (f) => [0.05 * f + 0.4 * Math.sin(f * 2.1) + 0.3 * Math.sin(f * 5.3), 1.6, 0], jerk = (g) => { let m = 0; for (let f = 20; f < 80; f++) m = Math.max(m, len(sub(sub(g(f + 1), g(f)), sub(g(f), g(f - 1))))); return m; };
  const raw = jerk(jit), sm = jerk((f) => C.smoothed(jit, f, 6));
  t("tracking: filter removes target jitter (>= 5x lower acceleration spikes)", raw / sm >= 5, `${raw.toFixed(3)} -> ${sm.toFixed(3)} (x${(raw / sm).toFixed(1)})`);
  t("tracking: filter is deterministic and keeps a steady subject unchanged", len(sub(C.smoothed(() => [1, 2, 3], 50, 6), [1, 2, 3])) < 1e-12 && C.smoothed(jit, 33, 6)[0] === C.smoothed(jit, 33, 6)[0]); }

// ---- presets ----
const ctx = { subjects: { a: { at: () => [0, 1.6, 0], height: 1.7 }, b: { at: (f) => [2.2 + 0.015 * f, 1.5, 0.6 + 0.008 * f], height: 1.6 }, grp: { at: () => [1, 1.5, 0] } },
  obstacles: [{ kind: "sphere", c: [4, 1.2, 7], r: 1.2 }, { kind: "cyl", x: -3, z: 6, r: 0.6, h: 25 }], groundY: 0 };
const base = { f0: 100, dur: 90 }, cases = {
  establishingWide: { subject: "a" }, aerial: { subject: "a" }, closeUp: { subject: "a", handheld: 1 }, extremeCloseUp: { subject: "a" }, lowAngle: { subject: "a" }, highAngle: { subject: "a" },
  dollyIn: { subject: "b", fillFrom: 0.3, fillTo: 0.55 }, dollyOut: { subject: "a", fillFrom: 0.6, fillTo: 0.25 }, orbit: { subject: "b", sweep: 120, fill: 0.5 },
  crane: { subject: "a", swing: 30 }, tracking: { subject: "b", path: [[-12, 3, 12], [-4, 2.5, 10], [4, 2, 12], [12, 3, 9]], ease: "cruise" }, overShoulder: { subject: "a", shoulder: "b" },
  dollyInGroup: { preset: "dollyIn", subject: ["a", "b"], fillFrom: 0.5, fillTo: 0.8 } };
const hitch = (frames) => { const v = []; for (let i = 1; i < frames.length; i++) v.push(sub(frames[i].pos, frames[i - 1].pos)); const a = []; for (let i = 1; i < v.length; i++) a.push(sub(v[i], v[i - 1])); let jm = 0; for (let i = 1; i < a.length; i++) jm = Math.max(jm, len(sub(a[i], a[i - 1]))); return jm / Math.max(1e-6, ...v.map(len)); };
for (const [key, prm] of Object.entries(cases)) {
  const name = prm.preset ?? key, params = { ...base, ...prm }; delete params.preset;
  const cam = C.buildPreset(name, params, ctx), fr = Array.from({ length: base.dur + 1 }, (_, i) => cam(base.f0 + i));
  const free = C.buildPreset(name, params, { ...ctx, obstacles: [] }), frFree = Array.from({ length: base.dur + 1 }, (_, i) => free(base.f0 + i));   // same shot with no obstacles in the scene
  const finite = fr.every((s) => [...s.pos, ...s.look, s.fov, s.roll].every(Number.isFinite)), again = cam(150), shuffled = (cam(180), cam(150));
  const det = JSON.stringify(again) === JSON.stringify(shuffled);
  const first = names(params.subject)[0], safe = fr.filter((s, i) => C.inSafe(C.project(s, ctx.subjects[first].at(base.f0 + i)))).length / fr.length;
  const clear = Math.min(...fr.map((s) => C.clearance(s.pos, ctx.obstacles, 0))), hFree = hitch(frFree), hObs = hitch(fr), fovOK = fr.every((s) => s.fov >= 18 && s.fov <= 70), rollMax = Math.max(...fr.map((s) => Math.abs(s.roll)));
  const peak = Math.max(...frFree.slice(1).map((s, i) => len(sub(s.pos, frFree[i].pos)))), step = Math.max(...fr.slice(1).map((s, i) => len(sub(s.pos, fr[i].pos))));   // no teleports: collision may add at most 0.25 m of movement per frame (or 2.5x the free path's step)
  const noTeleport = step <= Math.max(2.5 * peak, 0.25);
  const rep = C.pathReport(frFree.map((s) => s.pos), ctx.obstacles, 0, 0.6);
  const common = `deterministic=${finite && det}, subject in 9:16 safe area ${(safe * 100).toFixed(0)}%, hitch ${hFree.toFixed(3)}, fov ${Math.min(...fr.map((s) => s.fov)).toFixed(0)}-${Math.max(...fr.map((s) => s.fov)).toFixed(0)}, roll <= ${rollMax.toFixed(4)} rad`;
  if (rep.blocked) {   // the planned path goes THROUGH an obstacle: avoidance must still keep clearance and stay finite, and the authoring check must have flagged it
    t(`preset ${key} (planned path crosses an obstacle: flagged for the author at frame ${base.f0 + rep.firstInside})`, finite && det && clear >= 0.59 && fovOK && hFree <= 0.08, `${common}, avoided with min clearance ${clear.toFixed(2)} m`);
  } else {
    t(`preset ${key}`, finite && det && safe >= 0.98 && clear >= 0.59 && hFree <= 0.08 && hObs <= 0.25 && noTeleport && fovOK && rollMax < 0.02,
      `${common}, with obstacles hitch ${hObs.toFixed(3)}, biggest frame step ${(step * 100).toFixed(1)} cm (free ${(peak * 100).toFixed(1)} cm), min clearance ${clear.toFixed(2)} m`);
  }
}
function names(s) { return [].concat(s); }
{ let thrown = ""; try { C.buildPreset("dollyIn", { ...base, subject: "ghost", fillFrom: 0.3, fillTo: 0.5 }, ctx); } catch (e) { thrown = e.message; } t("preset: unknown subject is rejected with a clear message", /unknown subject/.test(thrown), thrown.slice(0, 70));
  t("pathReport: flags a path through an obstacle and passes a clear one", C.pathReport([[4.3, 1.5, 7.3]], [{ kind: "sphere", c: [4, 1.2, 7], r: 1.2 }]).blocked && !C.pathReport([[0, 1.5, 0]], [{ kind: "sphere", c: [4, 1.2, 7], r: 1.2 }]).blocked);
  t("preset: schema check catches missing params / unknown preset", C.checkPreset("dollyIn", { subject: "a" }).length > 0 && C.checkPreset("barrelRoll", {}).length === 1); }
console.log(fails ? `\n${fails} camera test(s) FAILED` : "\ncamera tests passed"); process.exit(fails ? 1 : 0);
