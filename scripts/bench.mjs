// usage: node scripts/bench.mjs [from-to=500-539]   -> times a short range for each GL backend / concurrency combo
// Use this before any full render to pick the fastest settings for this machine. Lens blur off (the shipped default).
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [from, to] = (process.argv[2] || "500-539").split("-").map(Number);
const comp = process.env.COMP || "TunguskaShort";
const inputProps = { post: { dpr: 1, lens: false } };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const configs = [["default", undefined, 4], ["angle", "angle", 4], ["angle-egl", "angle-egl", 4], ["angle", "angle", 6], ["angle", "angle", 8], ["swangle", "swangle", 4]];
for (const [label, gl, conc] of configs) {
  const chromiumOptions = gl ? { gl } : {};
  try {
    const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions, inputProps });
    const t0 = Date.now();
    await renderMedia({ composition, serveUrl, codec: "h264", crf: 18, outputLocation: `out/bench.mp4`, concurrency: conc, chromiumOptions, inputProps,
      frameRange: [from, to], imageFormat: "jpeg", jpegQuality: 90, timeoutInMilliseconds: 300000, muted: true, logLevel: "error" });
    const s = (Date.now() - t0) / 1000;
    console.log(`BENCH gl=${label} conc=${conc} ${(s / (to - from + 1)).toFixed(2)} s/frame (${s.toFixed(0)}s total)`);
  } catch (e) { console.log(`BENCH gl=${label} conc=${conc} FAILED ${String(e.message).slice(0, 120)}`); }
}
