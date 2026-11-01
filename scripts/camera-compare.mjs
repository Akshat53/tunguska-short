// usage: node --no-warnings scripts/camera-compare.mjs      Compares the default camera with the camera-director upgrade (camera-upgrade.overlay.json)
// on every shot listed in the overlay's "check": 9:16 composition of the named subjects + smoothness (same hitch metric as camera-metrics.mjs).
// Spawns itself once per variant (the variant is chosen at import time by env STORY_CAMERA). Writes out/camera/compare.json and prints stills frames.
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { spawnSync } from "node:child_process";
import { build } from "esbuild";
const self = new URL(import.meta.url).pathname, root = path.resolve(path.dirname(self), "..");
const A = process.argv.slice(2), vi = A.indexOf("--variant");
if (vi >= 0) {   // child: measure one variant
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cam-cmp-")), story = path.join(tmp, "story.mjs"), cam = path.join(tmp, "cam.mjs");
  await build({ entryPoints: [path.join(root, "src/videos/tunguska/story.ts")], bundle: true, format: "esm", platform: "node", outfile: story, logLevel: "error" });
  await build({ entryPoints: [path.join(root, "src/engine/camera/index.ts")], bundle: true, format: "esm", platform: "node", outfile: cam, logLevel: "error" });
  const S = await import(story), C = await import(cam), { metrics } = await import(new URL("./camera-metrics.mjs", import.meta.url).href);
  const check = JSON.parse(fs.readFileSync(path.join(root, "src/videos/tunguska/camera-upgrade.overlay.json"), "utf8")).check, rows = [];
  for (const [id, subjects] of Object.entries(check)) {
    const sh = S.SHOTS[id - 1], frames = []; let safe = 0, n = 0, fillSum = 0, yEye = 0, behind = 0;
    for (let f = sh.a; f < sh.b; f++) {
      const c = S.camAt(+id, f); frames.push([f, +id, null, c, 0, 0, null, 0]);
      const pts = subjects.map((s) => S.DIRECTOR_SUBJECTS[s]), p = C.mean3(pts.map((x) => x.at(f))), h = Math.max(...pts.map((x) => x.height ?? 1.7));
      const a = C.project(c, p), b = C.project(c, [p[0], p[1] - h, p[2]]); n++; if (a.depth <= 0) behind++; if (C.inSafe(a)) safe++; fillSum += Math.abs(a.y - b.y) / 2; yEye += (1 - a.y) / 2;
    }
    const m = metrics({ shots: [{ id: +id, a: sh.a, b: sh.b }], frames })[0], clr = Math.min(...frames.map((x) => C.clearance(x[3].pos, S.DIRECTOR_OBSTACLES, 0)));
    rows.push({ shot: +id, subjects, frames: n, safePct: +(100 * safe / n).toFixed(1), behind, fill: +(fillSum / n).toFixed(3), eyeFromTop: +(yEye / n).toFixed(3), hitch: m.hitch, speedMax: m.speedMax, accelMax: m.accelMax, minClearance: +clr.toFixed(2), fov: [+Math.min(...frames.map((x) => x[3].fov)).toFixed(1), +Math.max(...frames.map((x) => x[3].fov)).toFixed(1)], rollMax: +Math.max(...frames.map((x) => Math.abs(x[3].roll))).toFixed(4) });
  }
  fs.writeFileSync(A[A.indexOf("--out") + 1], JSON.stringify(rows)); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0);
}
const run = (variant, out) => { const r = spawnSync("node", ["--no-warnings", self, "--variant", variant || "default", "--out", out], { env: { ...process.env, STORY_CAMERA: variant }, encoding: "utf8" }); if (r.status) { console.error(r.stderr || r.stdout); process.exit(1); } return JSON.parse(fs.readFileSync(out, "utf8")); };
fs.mkdirSync(path.join(root, "out/camera"), { recursive: true });
const o = run("", path.join(root, "out/camera/default.json")), u = run("upgraded", path.join(root, "out/camera/upgraded.json"));
console.log("shot subjects              | variant  safe9:16  fill  eyeFromTop  hitch  speedMax  minClear  fov        roll");
for (let i = 0; i < o.length; i++) for (const [lab, r] of [["default ", o[i]], ["upgraded", u[i]]])
  console.log(`${String(r.shot).padStart(4)} ${r.subjects.join("+").padEnd(21)}| ${lab} ${String(r.safePct).padStart(7)}% ${String(r.fill).padStart(6)} ${String(r.eyeFromTop).padStart(10)} ${String(r.hitch).padStart(6)} ${String(r.speedMax).padStart(8)} ${String(r.minClearance).padStart(8)}  ${r.fov.join("-").padEnd(9)} ${r.rollMax}`);
fs.writeFileSync(path.join(root, "out/camera/compare.json"), JSON.stringify({ default: o, upgraded: u }, null, 1));
