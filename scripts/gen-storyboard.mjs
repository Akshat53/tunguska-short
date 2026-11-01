// One-off migration: reads the CURRENT story.ts (hard-coded) and writes src/videos/tunguska/storyboard.json.
// usage: node --no-warnings scripts/gen-storyboard.mjs     (kept for reference; the JSON is now the source of truth)
import fs from "node:fs";
const url = new URL("../src/videos/tunguska/story.ts", import.meta.url);
const S = await import(url.href); const src = fs.readFileSync(url, "utf8");
const clocks = { 1: { kind: "rel", at: 70 }, 2: { kind: "none" }, 3: { kind: "none" }, 4: { kind: "rel", at: 470 }, 5: { kind: "rel", at: 671 }, 6: { kind: "rel", at: 671 },
  7: { kind: "rel", at: 671 }, 8: { kind: "rel", at: 745 }, 9: { kind: "rel", at: 866, arrive: 232 }, 10: { kind: "rel", at: 921, arrive: 318 }, 11: { kind: "rel", at: 968 },
  12: { kind: "after" }, 13: { kind: "rel", at: 1262 }, 14: { kind: "none" }, 15: { kind: "none" }, 16: { kind: "rel", at: 1466, scale: 0.8 }, 17: { kind: "after" },
  18: { kind: "after" }, 19: { kind: "none" }, 20: { kind: "none" } };
const notes = {}; for (const m of src.matchAll(/^\s*\{ id: (\d+), a: [^\n]*?\},?\s*\/\/ (.+)$/gm)) notes[m[1]] = m[2].trim();
const cams = {}; const block = src.slice(src.indexOf("const CAMS"), src.indexOf("export const camAt"));
for (const m of block.matchAll(/^\s*(\d+): \[(.*)\],?$/gm)) {
  cams[m[1]] = [...m[2].matchAll(/\{([^}]*)\}/g)].map((e) => { const t = e[1], o = { f: +t.match(/f: (\d+)/)[1], fn: t.match(/s: (\w+)/)[1] };
    const d = t.match(/dur: (\d+)/); if (d) o.dur = +d[1]; if (/cut: true/.test(t)) o.cut = true; return o; });
}
const shots = S.SHOTS.map((s) => {
  const o = { id: s.id, a: s.a, b: s.b, light: s.light, scene: s.scene };
  if (s.fog) o.fog = s.fog; if (s.year) o.year = s.year; if (S.XFADE[s.id]) o.xfade = S.XFADE[s.id];
  o.clock = clocks[s.id]; o.camera = cams[s.id];
  o.dof = S.DOF.filter((d) => d.f >= s.a && d.f < s.b).map((d) => { const r = { f: d.f, cInf: d.cInf }; if (d.dur) r.dur = d.dur; if (d.focus) r.focus = d.focus(0); return r; });
  if (notes[s.id]) o.note = notes[s.id];
  return o;
});
const kicks = [[364, 0.8], [671, 1.4], ...S.HITS.map((h) => [h, 1.0]), [921, 1.2], [1031, 0.7], [1262, 0.8]];
const sb = { version: 1, fps: 30, totalFrames: S.TOTAL, events: { flashAt: S.FLASH_AT, flashes: S.FLASHES, hits: S.HITS, kicks }, shots };
fs.writeFileSync(new URL("../src/videos/tunguska/storyboard.json", import.meta.url), JSON.stringify(sb, null, 1));
const nd = S.DOF.length, got = shots.reduce((n, s) => n + s.dof.length, 0), nk = Object.values(cams).flat().length;
console.log(`shots ${shots.length}, dof ${got}/${nd}, camera keys ${nk}`);
