// env: COMP=<composition id> (default TunguskaShort), CONC=<workers>
// usage: node scripts/render.mjs <out.mp4> <from-to|all> [scale] [propsJSON]
// One bundle, one sequential render (concurrency 1, SwiftShader), bundle deleted afterwards.
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [out, range = "all", scale = "1", props = "{}"] = process.argv.slice(2);
const chromiumOptions = process.env.GL ? { gl: process.env.GL } : { gl: "angle" }; // GL=swangle for CPU-only boxes
const inputProps = JSON.parse(props);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
try {
  const composition = await selectComposition({ serveUrl, id: process.env.COMP || "TunguskaShort", chromiumOptions, inputProps });
  const frameRange = range === "all" ? null : range.split("-").map(Number);
  const t0 = Date.now(); let last = 0;
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), concurrency: Number(process.env.CONC || 1),
    chromiumOptions, inputProps, frameRange, imageFormat: "jpeg", jpegQuality: 92, timeoutInMilliseconds: 600000, muted: true,
    onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 10) { last = renderedFrames; console.log(`frames ${renderedFrames} ${((Date.now() - t0) / 1000 / renderedFrames).toFixed(2)} s/f`); } } });
  console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
} finally {
  // remove ONLY the bundle this run created (never glob the shared temp dir: another render may be using its own bundle)
  if (path.basename(serveUrl).startsWith("remotion-webpack-bundle-")) fs.rmSync(serveUrl, { recursive: true, force: true });
}
