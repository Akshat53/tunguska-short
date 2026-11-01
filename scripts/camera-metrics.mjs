// usage: node --no-warnings scripts/camera-metrics.mjs [snapshot.json] [--json out.json]
// Smoothness of every shot's camera from a story snapshot (scripts/story-snapshot.mjs). Per shot, over interior frames (cuts excluded):
//   speed  = |d pos| per frame, accel = |d speed vector|, jerk = |d accel vector|; "hitch" = worst jerk divided by the shot's PEAK speed (scale-free: how abrupt the worst change of acceleration is compared with how fast the camera gets) and the frame it happens on. Relative measure: use it to compare before/after, not as an absolute pass mark.
// Hard cuts (isolated one-frame speed spikes) are intentional and are skipped.
import fs from "node:fs";
const sub = (a, b) => a.map((v, i) => v - b[i]), len = (v) => Math.hypot(...v), med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
export const metrics = (snap) => snap.shots.map((sh) => {
  const fr = snap.frames.filter((f) => f[0] >= sh.a && f[0] < sh.b).map((f) => ({ f: f[0], p: f[3].pos, l: f[3].look, fov: f[3].fov, roll: f[3].roll }));
  const v = [], a = [], j = [], lv = [];
  for (let i = 1; i < fr.length; i++) { v.push(sub(fr[i].p, fr[i - 1].p)); lv.push(sub(fr[i].l, fr[i - 1].l)); }
  const speed = v.map(len), med0 = med(speed) || 1e-6;
  for (let i = 1; i < v.length; i++) a.push(sub(v[i], v[i - 1]));
  for (let i = 1; i < a.length; i++) j.push(sub(a[i], a[i - 1]));
  const cut = speed.map((x, i) => x > 6 * Math.max(speed[i - 1] ?? 0, speed[i + 1] ?? 0) && x > 0.3);      // isolated spike = hard cut
  const ok = (i) => !cut.slice(Math.max(0, i - 1), i + 3).some(Boolean);                                      // skip frames touching a cut
  const peak = Math.max(1e-6, ...speed.filter((_, i) => !cut[i]));
  let worst = { v: 0, f: fr[0]?.f ?? 0 };
  const jerk = [];
  j.forEach((x, i) => { if (ok(i)) { const jv = len(x); jerk.push(jv); if (jv > worst.v) worst = { v: jv, f: fr[i + 3]?.f ?? 0 }; } });
  const accel = a.map(len).filter((_, i) => ok(i));
  const fovRate = fr.slice(1).map((x, i) => Math.abs(x.fov - fr[i].fov)), rollRate = fr.slice(1).map((x, i) => Math.abs(x.roll - fr[i].roll));
  return { shot: sh.id, frames: fr.length, speedMed: +med0.toFixed(3), speedMax: +peak.toFixed(3), accelMax: +Math.max(0, ...accel).toFixed(4),
    hitch: +(worst.v / peak).toFixed(3), hitchFrame: worst.f, jerkMax: +worst.v.toFixed(4), fovRateMax: +Math.max(0, ...fovRate.filter((x) => x < 5)).toFixed(3), rollRateMax: +Math.max(0, ...rollRate).toFixed(4) };
});
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? new URL("../tests/fixtures/tunguska-story.snapshot.json", import.meta.url).pathname;
  const m = metrics(JSON.parse(fs.readFileSync(file, "utf8"))), out = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
  console.log("shot frames speedMed speedMax accelMax jerkMax  hitch @frame fovRate rollRate");
  for (const r of m) console.log(`${String(r.shot).padStart(4)} ${String(r.frames).padStart(6)} ${String(r.speedMed).padStart(8)} ${String(r.speedMax).padStart(8)} ${String(r.accelMax).padStart(8)} ${String(r.jerkMax).padStart(7)} ${String(r.hitch).padStart(6)} ${String(r.hitchFrame).padStart(6)} ${String(r.fovRateMax).padStart(7)} ${String(r.rollRateMax).padStart(8)}`);
  const w = [...m].sort((a, b) => b.hitch - a.hitch).slice(0, 5);
  console.log("largest hitches (shot, score, frame):", w.map((r) => `${r.shot} (${r.hitch} @${r.hitchFrame})`).join(", "));
  if (out) fs.writeFileSync(out, JSON.stringify(m, null, 1));
}
