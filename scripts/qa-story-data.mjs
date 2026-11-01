// usage: node --no-warnings scripts/qa-story-data.mjs [--config scripts/qa.config.tunguska.json] [--out out/qa-story.json] [--no-bookends]
// Builds the "what SHOULD be on screen" side of the visual QA (scripts/visual_qa.py). REPORT-ONLY: reads the story, writes one JSON.
// Bundles story.ts + src/engine/camera with esbuild (like camera-compare.mjs), reads storyboard.json, warp.json and the per-story QA config, and
// emits per OUTPUT frame: story frame, shot id, crossfade layers, camera (pos/look/fov/roll), every configured subject's NDC position / depth /
// projected bounding box (engine framing.project, 9:16), camera clearance to DIRECTOR_OBSTACLES, DOF (storyboard and whether the render has it on),
// planned-event flags (cut, crossfade, flash, kick, hit, bookend). Plus an event list in output frames (for audio sync) and the shot table.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { build } from "esbuild";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const A = process.argv.slice(2), arg = (k, d) => (A.indexOf(k) >= 0 ? A[A.indexOf(k) + 1] : d);
const cfgPath = path.resolve(root, arg("--config", "scripts/qa.config.tunguska.json")), outPath = path.resolve(root, arg("--out", "out/qa-story.json"));
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const rel = (p) => path.resolve(root, p);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-story-")), story = path.join(tmp, "story.mjs"), cam = path.join(tmp, "cam.mjs");
try {
  await build({ entryPoints: [rel(cfg.story)], bundle: true, format: "esm", platform: "node", outfile: story, logLevel: "error" });
  await build({ entryPoints: [rel(cfg.cameraEngine ?? "src/engine/camera/index.ts")], bundle: true, format: "esm", platform: "node", outfile: cam, logLevel: "error" });
} catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); throw e; }
const S = await import(story), C = await import(cam);
fs.rmSync(tmp, { recursive: true, force: true });   // only our own temp folder
const SB = JSON.parse(fs.readFileSync(rel(cfg.storyboard), "utf8"));
const W = JSON.parse(fs.readFileSync(rel(cfg.warp), "utf8"));
const FPS = SB.fps ?? 30;

// ---- time warp (same maths as src/videos/<story>/warp.ts, which imports remotion and cannot run in node) ----
const AN = W.anchors, TOTAL = S.TOTAL;
const toStory = (n) => {
  if (n <= 0) return 0;
  let k = AN.length - 2;
  for (let i = 0; i < AN.length - 1; i++) if (n < AN[i + 1][0]) { k = i; break; }
  const [n0, o0] = AN[k], [n1, o1] = AN[k + 1];
  return Math.min(TOTAL - 1, o0 + ((n - n0) * (o1 - o0)) / (n1 - n0));
};
const toOut = (o) => {   // inverse: story frame -> fractional output frame (piecewise linear, anchors are monotone)
  for (let i = 0; i < AN.length - 1; i++) { const [n0, o0] = AN[i], [n1, o1] = AN[i + 1]; if (o <= o1 || i === AN.length - 2) return n0 + ((o - o0) * (n1 - n0)) / (o1 - o0); }
  return AN[AN.length - 1][0];
};
const bookends = !A.includes("--no-bookends") && cfg.bookends ? cfg.bookends : { intro: 0, outro: 0 };
const INTRO = bookends.intro ?? 0, OUTRO = bookends.outro ?? 0, PIC = W.outFrames, N = INTRO + PIC + OUTRO;
const o2v = (o) => o + INTRO;   // picture output frame -> video frame

// ---- subjects: DIRECTOR_SUBJECTS + story-specific extras (functions exported by story.ts) ----
const geo = cfg.subjectGeometry ?? {};
const subjPoint = (name, sh, fs) => {
  const ex = cfg.extraSubjects?.[name];
  if (ex) { const fn = S[ex.fn]; if (!fn) throw new Error(`extra subject ${name}: story.ts does not export ${ex.fn}`); return ex.arg === "clock" ? fn(sh.e(fs)) : fn(fs); }
  const s = S.DIRECTOR_SUBJECTS[name]; if (!s) throw new Error(`unknown subject ${name} (DIRECTOR_SUBJECTS: ${Object.keys(S.DIRECTOR_SUBJECTS).join(", ")})`);
  return s.at(fs);
};
const projectBox = (c, p, g) => {
  if (g.screenW) {   // fx cards drawn at a constant fraction of the frame WIDTH (cast.ts scr()): the box is fixed on screen around the anchor
    const n = C.project(c, p); if (n.depth <= 0.05) return null;
    const cx = (n.x + 1) / 2, cy = (1 - n.y) / 2, hw = g.screenW / 2, hh = ((g.screenH ?? g.screenW) / 2) * (9 / 16);
    return [cx - hw, cy - hh, cx + hw, cy + hh].map((v) => +v.toFixed(4));
  }
  const fwd = C.norm(C.sub(c.look, c.pos)), right = C.norm(C.cross(fwd, [0, 1, 0]));
  const pts = [];
  for (const dy of [-g.below, g.above]) for (const s of [-1, 1]) pts.push([p[0] + right[0] * s * g.halfWidth, p[1] + dy, p[2] + right[2] * s * g.halfWidth]);
  const pr = pts.map((q) => C.project(c, q));
  if (pr.some((q) => q.depth <= 0.05)) return null;   // partly behind the lens: no meaningful box
  const xs = pr.map((q) => (q.x + 1) / 2), ys = pr.map((q) => (1 - q.y) / 2);   // image coords 0..1, y down
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => +v.toFixed(4));
};
const shotCfg = (id) => ({ subjects: [], motion: "moving", dofExpected: false, intendedEmpty: [], ...(cfg.shots?.[String(id)] ?? {}) });
const activeSubjects = (id, fs) => shotCfg(id).subjects.map((s) => (typeof s === "string" ? { name: s } : s))
  .filter((s) => (s.from === undefined || fs >= s.from) && (s.to === undefined || fs < s.to));

// ---- planned events (story frames) -> output video frames ----
const r1 = (x) => +x.toFixed(2);
const events = [];
// the first output frame whose (fractional) story frame reaches storyF: that is where a cut / flash / kick becomes visible
const firstV = (storyF) => Math.ceil(o2v(toOut(storyF)) - 1e-6);
const ev = (kind, storyF, extra = {}) => events.push({ kind, storyFrame: storyF, frame: firstV(storyF), frameExact: r1(o2v(toOut(storyF))), ...extra });
for (const s of SB.shots) {
  if (s.id > 1) ev(s.xfade ? "crossfade" : "cut", s.a, { shot: s.id, ...(s.xfade ? { len: s.xfade } : {}) });
  for (const k of s.camera) if (k.cut && k.f !== s.a) ev("cut", k.f, { shot: s.id, cameraKey: true });
}
ev("flash", SB.events.flashAt, { peak: 1, len: 4, hookEnd: true });
for (const [f, pk] of SB.events.flashes) ev("flash", f, { peak: pk, len: 10 });
for (const f of SB.events.hits) ev("hit", f);
for (const [f, g] of SB.events.kicks) ev("kick", f, { gain: g, len: 7 });
if (INTRO) events.push({ kind: "bookend-cut", frame: INTRO, storyFrame: null, note: "intro card -> picture" });
if (OUTRO) events.push({ kind: "bookend-cut", frame: INTRO + PIC, storyFrame: null, note: "picture -> outro card" });
const noAudio = new Set((cfg.audioSync?.noAudioExpected ?? []).map((x) => `${x[0]}@${x[1]}`));
for (const e of events) e.audioExpected = ["flash", "hit", "kick"].includes(e.kind) && !noAudio.has(`${e.kind}@${e.storyFrame}`);
events.sort((a, b) => a.frame - b.frame);

// per-frame planned flags (in video frames); the time warp stretches story frames by up to ~1.3x, so windows are widened by `pad`
const pad = cfg.plannedPad ?? 2;
const flags = Array.from({ length: N }, () => new Set());
const mark = (a, b, tag) => { for (let v = Math.max(0, Math.floor(a)); v <= Math.min(N - 1, Math.ceil(b)); v++) flags[v].add(tag); };
for (const e of events) {
  if (e.kind === "cut" || e.kind === "bookend-cut") mark(e.frame - 1, e.frame + 1, "cut");
  if (e.kind === "crossfade") mark(firstV(e.storyFrame - e.len / 2) - pad, firstV(e.storyFrame + e.len / 2) + pad, "crossfade");
  if (e.kind === "flash") mark(e.frame - 1, firstV(e.storyFrame + e.len) + pad, "flash");
  if (e.kind === "kick") mark(e.frame - 1, firstV(e.storyFrame + e.len) + pad, "kick");
  if (e.kind === "hit") mark(e.frame - 1, e.frame + pad, "hit");
}
for (let v = 0; v < INTRO; v++) flags[v].add("bookend");
for (let v = INTRO + PIC; v < N; v++) flags[v].add("bookend");
for (const [a, b] of cfg.bookendWhiteFadeIn ? [[0, cfg.bookendWhiteFadeIn]] : []) mark(a, b, "flash");

// ---- per frame ----
const frames = [];
for (let v = 0; v < N; v++) {
  const o = v - INTRO;
  if (o < 0 || o >= PIC) { frames.push({ v, bookend: o < 0 ? "intro" : "outro", planned: [...flags[v]] }); continue; }
  const fs = toStory(o), sh = S.shotAt(fs), c = S.camAt(sh.id, fs), layers = S.layersAt(fs), sc = shotCfg(sh.id), d = S.dofAt(fs);
  const subjects = {};
  for (const s of activeSubjects(sh.id, fs)) {
    const p = subjPoint(s.name, sh, fs), n = C.project(c, p), g = geo[s.name] ?? { below: 1, above: 1, halfWidth: 1 };
    subjects[s.name] = { x: r1(n.x * 100) / 100, y: r1(n.y * 100) / 100, depth: r1(n.depth), inSafe: C.inSafe(n), bbox: n.depth > 0 ? projectBox(c, p, g) : null, required: s.required !== false };
  }
  const obs = S.DIRECTOR_OBSTACLES ?? [];
  const clearance = obs.length ? obs.reduce((m, ob) => Math.min(m, C.clearance(c.pos, [ob], -1e9)), Infinity) : null;   // obstacles only (ground excluded)
  const inEmpty = sc.intendedEmpty.some(([a, b]) => fs >= a && fs < b) || (cfg.intendedEmpty ?? []).some(([a, b]) => fs >= a && fs < b);
  frames.push({
    v, o, story: +fs.toFixed(3), shot: sh.id, layers: layers.map((l) => [l.id, +l.alpha.toFixed(3)]),
    cam: { pos: c.pos.map(r1), look: c.look.map(r1), fov: r1(c.fov), roll: +c.roll.toFixed(4) },
    subjects, clearance: clearance === null ? null : r1(clearance), clearanceRequired: sc.clearance ?? cfg.minClearance ?? 0.3,
    dof: { cInf: r1(d.cInf), expected: !!sc.dofExpected && !!cfg.dofEnabledInRender }, motion: sc.motion, intendedEmpty: inEmpty,
    planned: [...flags[v]], kick: r1(S.kickAt ? S.kickAt(fs / FPS) : 0),
  });
}
const shots = SB.shots.map((s) => {
  const vs = frames.filter((f) => f.shot === s.id).map((f) => f.v);
  return { id: s.id, storyA: s.a, storyB: s.b, a: Math.min(...vs), b: Math.max(...vs) + 1, note: s.note ?? "", ...shotCfg(s.id) };
});
const out = {
  version: 1, generated: new Date().toISOString(), config: path.relative(root, cfgPath), fps: FPS, width: cfg.width ?? 1080, height: cfg.height ?? 1920,
  frames: N, intro: INTRO, outro: OUTRO, pictureFrames: PIC, storyFrames: TOTAL, dofEnabledInRender: !!cfg.dofEnabledInRender,
  safe: C.SAFE, shots, events, audioSync: cfg.audioSync ?? {}, composition: cfg.composition ?? {}, frameData: frames,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`qa-story: ${N} video frames (intro ${INTRO} + picture ${PIC} + outro ${OUTRO}), ${shots.length} shots, ${events.length} events -> ${path.relative(root, outPath)}`);
