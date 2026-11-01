// usage: node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale] [propsJSON]
// Bundles once into $TEMP, renders jpeg stills with SwiftShader (CPU), deletes the bundle afterwards.
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const [prefix, frames, scale = "0.5", props = "{}"] = process.argv.slice(2);
const chromiumOptions = process.env.GL ? { gl: process.env.GL } : { gl: "angle" }; // GL=swangle for CPU-only boxes
const inputProps = JSON.parse(props);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
try {
  const composition = await selectComposition({ serveUrl, id: "TunguskaShort", chromiumOptions, inputProps });
  const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
  fs.mkdirSync(path.dirname(prefix), { recursive: true });
  for (const f of frames.split(",").map(Number)) {
    const t0 = Date.now();
    await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${String(f).padStart(4, "0")}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
      chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog, inputProps });
    console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
  }
} finally {
  fs.rmSync(serveUrl.replace(/^file:\/\//, ""), { recursive: true, force: true });
  for (const d of fs.readdirSync(process.env.TEMP || "/tmp")) if (d.startsWith("remotion-webpack-bundle-")) fs.rmSync(path.join(process.env.TEMP || "/tmp", d), { recursive: true, force: true });
}
