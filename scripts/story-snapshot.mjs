// usage: node scripts/story-snapshot.mjs <out.json>
// Regression fingerprint of the story timeline: for EVERY frame it records the shot, crossfade layers, camera (pos/look/fov/roll),
// event clock, and depth-of-field. Run before and after a refactor of story.ts / the storyboard config; the files must be identical.
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os"; import path from "node:path";
import { build } from "esbuild";   // story.ts imports JSON + the storyboard schema: bundle it first (esbuild ships with Remotion)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "story-snap-")), bundled = path.join(tmp, "story.mjs");
await build({ entryPoints: [new URL("../src/videos/tunguska/story.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", outfile: bundled, logLevel: "error" });
const S = await import(bundled);
fs.rmSync(tmp, { recursive: true, force: true });
const out = { total: S.TOTAL, shots: S.SHOTS.map(({ e, ...r }) => r), xfade: S.XFADE, flashAt: S.FLASH_AT, flashes: S.FLASHES, hits: S.HITS, frames: [] };
for (let f = 0; f < S.TOTAL + 20; f++) {
  const sh = S.shotAt(f), d = S.dofAt(f);
  out.frames.push([f, sh.id, S.layersAt(f), S.camAt(sh.id, f), sh.e(f), d.cInf, d.focus ? d.focus(f) : null, S.kickAt ? S.kickAt(f / 30) : 0]);
}
const text = JSON.stringify(out);
fs.writeFileSync(process.argv[2], text);
console.log(`${out.frames.length} frames, sha256 ${crypto.createHash("sha256").update(text).digest("hex").slice(0, 16)}`);
