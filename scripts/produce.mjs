// Production render pipeline.   usage: node --no-warnings scripts/produce.mjs [options]
//   --comp TunguskaShort   --out out/tunguska-produced.mp4   --scale 1   --crf 16   --conc 6   --gl angle   --chunks 6
//   --props '{"post":{"dpr":1}}'   --audio audio/out/mix.wav   --no-bookends   --tmp <dir>   --work out/work   --stills 8
// Stages: preflight -> stills -> chunked render (cached, retried) -> concat -> mux -> validate -> contact sheet -> report.
// Prints SUCCESS only if every validation check passes; exit code 1 otherwise. Temp cleanup is limited to this run's own bundle folder.
// Test hooks: PRODUCE_FAIL_CHUNK=<n> fails chunk n once (proves retry); PRODUCE_STOP_AFTER=<n> exits after n chunks (proves resume).
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { bundle } from "@remotion/bundler"; import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf("--" + k); return i >= 0 && A[i + 1] && !A[i + 1].startsWith("--") ? A[i + 1] : d; };
const cfg = { comp: opt("comp", "TunguskaShort"), out: opt("out", "out/tunguska-produced.mp4"), scale: Number(opt("scale", "1")), crf: Number(opt("crf", "16")),
  conc: Number(opt("conc", "6")), gl: opt("gl", "angle"), chunks: Number(opt("chunks", "6")), props: JSON.parse(opt("props", '{"post":{"dpr":1}}')),
  audio: opt("audio", "audio/out/mix.wav"), bookends: !A.includes("--no-bookends"), work: opt("work", "out/work"), stills: Number(opt("stills", "8")),
  introS: Number(opt("intro", "0.8")), outroS: Number(opt("outro", "3")) };
if (opt("tmp")) { fs.mkdirSync(opt("tmp"), { recursive: true }); process.env.TMPDIR = opt("tmp"); }
const root = process.cwd(), T0 = Date.now(), log = (m) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0).padStart(4)}s] ${m}`);
let serveUrl = null, key = "-";
const report = { started: new Date().toISOString(), config: cfg, stages: {}, checks: [], chunks: [] };
const check = (name, ok, detail = "", level = "fail") => { report.checks.push({ name, ok, detail, level }); log(`${ok ? "PASS" : level === "warn" ? "warn" : "FAIL"}  ${name}${detail ? " - " + detail : ""}`); return ok; };
const sh = (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...o });
const probe = (f, entries, sel = []) => sh("ffprobe", ["-v", "error", ...sel, "-show_entries", entries, "-of", "json", f]);
const stage = (name, fn) => async () => { const t = Date.now(); const r = await fn(); report.stages[name] = Math.round((Date.now() - t) / 100) / 10; return r; };

// ---------- preflight ----------
await stage("preflight", async () => {
  log("preflight");
  check("node >= 20", Number(process.versions.node.split(".")[0]) >= 20, process.version);
  for (const b of ["ffmpeg", "ffprobe"]) check(`${b} installed`, sh(b, ["-version"]).status === 0);
  check("node_modules installed", fs.existsSync("node_modules/@remotion/renderer"));
  const tsc = sh("npx", ["tsc", "--noEmit"]); check("scene compiles (tsc)", tsc.status === 0, tsc.status ? (tsc.stdout || tsc.stderr).split("\n")[0] : "");
  const val = sh("node", ["--no-warnings", "scripts/validate-storyboard.mjs"]); check("storyboard valid", val.status === 0, val.stdout.trim().split("\n").pop());
  const need = [cfg.audio, "voice/words.json", "src/videos/tunguska/warp.json", ...(cfg.bookends ? ["brand/card-intro.png", "brand/card-outro.png", "scripts/finish.sh"] : [])];
  for (const f of need) check(`asset ${f}`, fs.existsSync(f));
  const st = fs.statfsSync(path.resolve(cfg.work.startsWith("/") ? cfg.work : ".")); const freeGb = (st.bavail * st.bsize) / 2 ** 30;
  check("disk space >= 5 GB", freeGb >= 5, `${freeGb.toFixed(0)} GB free`);
  if (report.checks.some((c) => !c.ok && c.level === "fail")) await finish();
})();

// ---------- source fingerprint (decides what can be reused) ----------
const hash = crypto.createHash("sha1");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of [...walk("src").sort(), "package.json"]) hash.update(f).update(fs.readFileSync(f));
hash.update(JSON.stringify({ s: cfg.scale, crf: cfg.crf, p: cfg.props, gl: cfg.gl, chunks: cfg.chunks, comp: cfg.comp }));
key = hash.digest("hex").slice(0, 10); const workDir = path.resolve(cfg.work, key); fs.mkdirSync(workDir, { recursive: true });
log(`source+settings fingerprint ${key} (unchanged runs reuse finished chunks in ${path.relative(root, workDir)})`);

// ---------- bundle (this run's own folder only) ----------
const chromiumOptions = { gl: cfg.gl };
serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: cfg.comp, chromiumOptions, inputProps: cfg.props });
const N = composition.durationInFrames; report.frames = N; report.fps = composition.fps;
log(`composition ${cfg.comp}: ${composition.width}x${composition.height} @ ${composition.fps} fps, ${N} frames`);

async function finish(fatal) {
  if (serveUrl && path.basename(serveUrl).startsWith("remotion-webpack-bundle-")) { try { fs.rmSync(serveUrl, { recursive: true, force: true }); } catch {} }   // only THIS run's bundle
  const failed = report.checks.filter((c) => !c.ok && c.level === "fail");
  report.finished = new Date().toISOString(); report.totalSeconds = Math.round((Date.now() - T0) / 100) / 10; report.success = !fatal && failed.length === 0;
  const outDir = path.dirname(path.resolve(cfg.out)); fs.mkdirSync(outDir, { recursive: true });
  const base = path.resolve(cfg.out).replace(/\.mp4$/, "");
  fs.writeFileSync(base + ".report.json", JSON.stringify(report, null, 1));
  const md = [`# Production report - ${path.basename(cfg.out)}`, `${report.success ? "**SUCCESS**" : "**FAILED**"} in ${report.totalSeconds}s (${report.finished})`, "",
    `Settings: scale ${cfg.scale}, crf ${cfg.crf}, gl ${cfg.gl}, conc ${cfg.conc}, ${cfg.chunks} chunks, fingerprint ${key}`, "", "## Stage times (s)", ...Object.entries(report.stages).map(([k, v]) => `- ${k}: ${v}`),
    "", "## Chunks", ...report.chunks.map((c) => `- ${c.name} frames ${c.a}-${c.b}: ${c.status}${c.seconds ? ` (${c.seconds}s)` : ""}${c.attempts > 1 ? `, ${c.attempts} attempts` : ""}`),
    "", "## Checks", ...report.checks.map((c) => `- ${c.ok ? "PASS" : c.level === "warn" ? "WARN" : "FAIL"} ${c.name}${c.detail ? ": " + c.detail : ""}`)].join("\n");
  fs.writeFileSync(base + ".report.md", md);
  console.log(report.success ? `\nSUCCESS  ${cfg.out}  (report: ${path.relative(root, base)}.report.md)` : `\nFAILED  ${failed.length} check(s) failed (report: ${path.relative(root, base)}.report.md)`);
  process.exit(report.success ? 0 : 1);
}

try {
  // ---------- preview stills ----------
  await stage("stills", async () => {
    const ys = []; const frames = Array.from({ length: cfg.stills }, (_, i) => Math.round(((i + 0.5) * N) / cfg.stills)); let bad = 0;
    for (const f of frames) {
      const file = path.join(workDir, `still-${String(f).padStart(5, "0")}.jpg`);
      await renderStill({ composition, serveUrl, frame: f, output: file, imageFormat: "jpeg", jpegQuality: 85, scale: Math.min(0.5, cfg.scale), chromiumOptions, inputProps: cfg.props });
      const m = sh("ffmpeg", ["-v", "error", "-i", file, "-vf", "scale=32:-1,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"], {});
      const y = Number((/YAVG=([\d.]+)/.exec(m.stdout) || [])[1] ?? "NaN"); ys.push(Math.round(y)); if (!(y > 6 && y < 250)) bad++;
    }
    check("preview stills are not black/white", bad === 0, `${frames.length} sampled, mean brightness ${ys.join("/")} of 255${bad ? `, ${bad} suspicious` : ""}`);
    if (bad) await finish(true);
  })();

  // ---------- chunked render with cache, retry and resume ----------
  await stage("render", async () => {
    const size = Math.ceil(N / cfg.chunks), list = [];
    for (let c = 0; c < cfg.chunks; c++) { const a = c * size, b = Math.min(N - 1, a + size - 1); if (a <= b) list.push({ name: `chunk-${String(c).padStart(2, "0")}`, a, b }); }
    let done = 0, failOnce = Number(process.env.PRODUCE_FAIL_CHUNK ?? -1);
    for (const [i, ch] of list.entries()) {
      const file = path.join(workDir, ch.name + ".mp4"), want = ch.b - ch.a + 1, rec = { ...ch, status: "", attempts: 0 }; report.chunks.push(rec);
      const frames = () => Number(JSON.parse(probe(file, "stream=nb_frames", ["-select_streams", "v:0"]).stdout || "{}").streams?.[0]?.nb_frames ?? -1);
      if (fs.existsSync(file) && frames() === want) { rec.status = "reused (cached)"; log(`${ch.name} reused`); done++; continue; }
      for (let attempt = 1; attempt <= 3; attempt++) {
        rec.attempts = attempt; const t = Date.now();
        try {
          if (i === failOnce && attempt === 1) throw new Error("injected failure (PRODUCE_FAIL_CHUNK)");
          await renderMedia({ composition, serveUrl, codec: "h264", crf: cfg.crf, outputLocation: file + ".part.mp4", scale: cfg.scale, concurrency: cfg.conc, chromiumOptions,
            inputProps: cfg.props, frameRange: [ch.a, ch.b], imageFormat: "jpeg", jpegQuality: 92, timeoutInMilliseconds: 300000, muted: true, logLevel: "error" });
          fs.renameSync(file + ".part.mp4", file);
          if (frames() !== want) throw new Error(`chunk has ${frames()} frames, expected ${want}`);
          rec.status = "rendered"; rec.seconds = Math.round((Date.now() - t) / 100) / 10; log(`${ch.name} frames ${ch.a}-${ch.b} rendered in ${rec.seconds}s${attempt > 1 ? ` (attempt ${attempt})` : ""}`); break;
        } catch (e) {
          log(`${ch.name} attempt ${attempt} failed: ${String(e.message).split("\n")[0]}`); fs.rmSync(file + ".part.mp4", { force: true }); fs.rmSync(file, { force: true });
          if (attempt === 3) { rec.status = "FAILED"; check(`render ${ch.name}`, false, String(e.message).split("\n")[0]); await finish(true); }
        }
      }
      done++; if (Number(process.env.PRODUCE_STOP_AFTER ?? 0) === done) { log(`simulated crash after ${done} chunks`); process.exit(99); }
    }
    check("all chunks rendered", report.chunks.every((c) => c.status && c.status !== "FAILED"), `${list.length} chunks`);
  })();

  // ---------- concat ----------
  const picture = path.join(workDir, "picture.mp4");
  await stage("concat", async () => {
    const lst = path.join(workDir, "list.txt"); fs.writeFileSync(lst, report.chunks.map((c) => `file '${path.join(workDir, c.name + ".mp4")}'`).join("\n"));
    const r = sh("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", picture]); check("chunks joined", r.status === 0, r.stderr.split("\n")[0]);
    const n = Number(JSON.parse(probe(picture, "stream=nb_frames", ["-select_streams", "v:0"]).stdout).streams[0].nb_frames);
    check("picture frame count", n === N, `${n} of ${N}`); if (n !== N) await finish(true);
  })();

  // ---------- mux (+ bookends) ----------
  const out = path.resolve(cfg.out); fs.mkdirSync(path.dirname(out), { recursive: true });
  await stage("mux", async () => {
    const r = cfg.bookends ? sh("bash", ["scripts/finish.sh", picture, out, String(cfg.introS), String(cfg.outroS)], { env: { ...process.env, CRF: String(cfg.crf) } })
      : sh("ffmpeg", ["-v", "error", "-y", "-i", picture, "-i", cfg.audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out]);
    check("audio + picture muxed", r.status === 0 && fs.existsSync(out), r.status ? (r.stderr || r.stdout).split("\n").slice(-2)[0] : "");
    if (r.status) await finish(true);
  })();

  // ---------- validate the final file ----------
  await stage("validate", async () => {
    const j = JSON.parse(probe(out, "stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate:format=duration").stdout);
    const v = j.streams.find((s) => s.codec_type === "video"), a = j.streams.find((s) => s.codec_type === "audio"), dur = Number(j.format.duration);
    const expW = Math.round(composition.width * cfg.scale), expH = Math.round(composition.height * cfg.scale);
    check("video codec h264", v?.codec_name === "h264", v?.codec_name); check("resolution", v && +v.width === expW && +v.height === expH, v ? `${v.width}x${v.height} (expected ${expW}x${expH})` : "no video");
    check("frame rate", v && eval(v.r_frame_rate) === composition.fps, v?.r_frame_rate);
    const bookF = cfg.bookends ? Math.round(cfg.introS * 30) + Math.round(cfg.outroS * 30) : 0;
    check("frame count", v && Math.abs(+v.nb_frames - (N + bookF)) <= 2, `${v?.nb_frames} (expected ${N + bookF})`);
    check("audio stream (aac, 48 kHz)", a?.codec_name === "aac" && +a.sample_rate === 48000, a ? `${a.codec_name} ${a.sample_rate}` : "missing");
    const aud = Number(JSON.parse(probe(cfg.audio, "format=duration").stdout).format.duration);
    const expDur = (N + bookF) / composition.fps; check("duration matches picture", Math.abs(dur - expDur) < 0.15, `${dur.toFixed(2)}s (expected ${expDur.toFixed(2)}s)`);
    check("narration mix as long as the picture", Math.abs(aud - N / composition.fps) < 0.1, `mix ${aud.toFixed(2)}s vs picture ${(N / composition.fps).toFixed(2)}s`);
    const ln = sh("ffmpeg", ["-hide_banner", "-i", out, "-map", "0:a:0", "-af", "loudnorm=print_format=json", "-f", "null", "-"]).stderr; const lj = JSON.parse(/\{[^{}]*\}/.exec(ln.slice(ln.lastIndexOf("{")))[0]);
    check("loudness -14 +/- 1.5 LUFS", Math.abs(+lj.input_i + 14) <= 1.5, `${(+lj.input_i).toFixed(1)} LUFS`); check("true peak below -1 dBTP", +lj.input_tp < -1, `${(+lj.input_tp).toFixed(1)} dBTP`);
    const bl = sh("ffmpeg", ["-hide_banner", "-i", out, "-vf", "blackdetect=d=0.1:pix_th=0.08", "-an", "-f", "null", "-"]).stderr; const blacks = [...bl.matchAll(/black_start:([\d.]+)/g)].map((m) => m[1]);
    check("no black frames", blacks.length === 0, blacks.length ? `black at ${blacks.slice(0, 5).join(", ")} s` : "");
    const fz = sh("ffmpeg", ["-hide_banner", "-i", out, "-vf", "freezedetect=n=-60dB:d=1.5", "-an", "-f", "null", "-"]).stderr; const freezes = [...fz.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => m[1]);
    check("no long frozen picture", freezes.length === 0, freezes.length ? `frozen from ${freezes.join(", ")} s` : "", "warn");
    check("file size sane (0.5-400 MB)", fs.statSync(out).size > 5e5 && fs.statSync(out).size < 4e8, `${(fs.statSync(out).size / 1e6).toFixed(0)} MB`);
    report.final = { path: path.relative(root, out), duration: dur, loudness: +lj.input_i, truePeak: +lj.input_tp, bytes: fs.statSync(out).size };
  })();

  // ---------- contact sheet ----------
  await stage("contact sheet", async () => {
    const sheet = out.replace(/\.mp4$/, ".sheet.jpg"), dur = report.final?.duration ?? 60;
    const r = sh("ffmpeg", ["-v", "error", "-y", "-i", out, "-vf", `fps=12/${dur.toFixed(2)},scale=216:-1,tile=12x1`, "-frames:v", "1", sheet]); check("contact sheet written", r.status === 0 && fs.existsSync(sheet), path.relative(root, sheet));
  })();
  await finish(false);
} catch (e) { check("pipeline error", false, String(e.stack || e).split("\n").slice(0, 2).join(" | ")); await finish(true); }
