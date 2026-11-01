// usage: node --no-warnings scripts/validate-storyboard.mjs [storyboard.json] [--selftest]
// Validates a storyboard (structure, frame ranges, overlaps/gaps, crossfades, camera/dof keys, missing camera functions)
// and checks it against the files it depends on (narration timing, audio, brand cards). Exit code 1 on any error.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { build } from "esbuild";
const root = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2), selftest = args.includes("--selftest");
const file = args.find((a) => !a.startsWith("--")) ?? path.join(root, "src/videos/tunguska/storyboard.json");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sb-val-")), out = path.join(tmp, "schema.mjs");
const camOut = path.join(tmp, "camera.mjs");
await build({ entryPoints: [path.join(root, "src/engine/storyboard/schema.ts")], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
await build({ entryPoints: [path.join(root, "src/engine/camera/index.ts")], bundle: true, format: "esm", platform: "node", outfile: camOut, logLevel: "error" });
const { validateStoryboard } = await import(out), { checkPreset } = await import(camOut); fs.rmSync(tmp, { recursive: true, force: true });
const dir = path.dirname(file), storySrc = fs.existsSync(path.join(dir, "story.ts")) ? fs.readFileSync(path.join(dir, "story.ts"), "utf8") : "";
const camFns = [...storySrc.matchAll(/^const (S\d+[a-z]*) = /gm)].map((m) => m[1]);
const ctxFor = (sb) => {
  const ctx = { camFns: camFns.length ? camFns : undefined, presetCheck: checkPreset, subjects: sb.cameraSubjects, ...(sb.scenes ? { scenes: sb.scenes } : {}) };
  const w = path.join(root, sb.words ?? "voice/v1/words.json");   // optional per-story narration (storyboard "words"); default: the Tunguska timeline's   // the narration the picture timeline was authored on
  if (fs.existsSync(w)) { const words = JSON.parse(fs.readFileSync(w, "utf8")); ctx.voiceFrames = Math.round((words.at(-1).end + 0.5) * sb.fps); ctx.wordFrames = words.map((x) => Math.round(x.start * sb.fps)); }
  return ctx;
};
const run = (sb) => validateStoryboard(sb, ctxFor(sb));
const show = (issues) => { for (const i of issues) console.log(`${i.level === "error" ? "ERROR" : "warn "} [${i.where}] ${i.msg}`); };
if (selftest) {
  const base = JSON.parse(fs.readFileSync(file, "utf8")), clone = () => JSON.parse(JSON.stringify(base));
  const cases = {
    "overlap": (s) => { s.shots[3].a -= 10; }, "gap": (s) => { s.shots[5].a += 7; s.shots[5].camera[0].f += 7; },
    "unknown camera fn": (s) => { s.shots[1].camera[0].fn = "S99z"; }, "xfade longer than shot": (s) => { s.shots[11].xfade = 5000; },
    "bad light": (s) => { s.shots[0].light = "neon"; }, "camera key outside shot": (s) => { s.shots[2].camera[1].f = 999; },
    "camera not starting at shot start": (s) => { s.shots[4].camera[0].f += 3; }, "last shot short": (s) => { s.shots.at(-1).b -= 1; },
    "camera key with both fn and preset": (s) => { s.shots[1].camera[0].preset = "dollyIn"; s.shots[1].camera[0].params = { subject: "camp", fillFrom: 0.3, fillTo: 0.5 }; },
    "unknown camera preset": (s) => { delete s.shots[1].camera[0].fn; s.shots[1].camera[0].preset = "barrelRoll"; },
    "preset with unknown subject": (s) => { delete s.shots[1].camera[0].fn; s.shots[1].camera[0].preset = "closeUp"; s.shots[1].camera[0].params = { subject: "ghost" }; },
    "preset missing required param": (s) => { delete s.shots[1].camera[0].fn; s.shots[1].camera[0].preset = "dollyIn"; s.shots[1].camera[0].params = { subject: "camp" }; },
    "dof key outside shot": (s) => { s.shots[0].dof[0].f = 500; }, "bad flash peak": (s) => { s.events.flashes[0][1] = 2; },
  };
  let missed = 0;
  console.log("clean storyboard errors:", run(base).filter((i) => i.level === "error").length);
  for (const [name, mutate] of Object.entries(cases)) {
    const s = clone(); mutate(s); const errs = run(s).filter((i) => i.level === "error");
    console.log(`${errs.length ? "caught " : "MISSED "} ${name}${errs.length ? "  ->  " + errs[0].msg : ""}`); if (!errs.length) missed++;
  }
  process.exit(missed || run(base).some((i) => i.level === "error") ? 1 : 0);
}
const sb = JSON.parse(fs.readFileSync(file, "utf8")), issues = run(sb);
const need = ["voice/words.json", "voice/voice.wav", "audio/out/mix.wav", "brand/card-intro.png", "brand/card-outro.png", "src/videos/tunguska/warp.json"];
for (const f of need) if (!fs.existsSync(path.join(root, f))) issues.push({ level: "error", where: "assets", msg: `missing file ${f}` });
show(issues);
const errors = issues.filter((i) => i.level === "error").length;
console.log(`${sb.shots.length} shots, ${sb.totalFrames} frames: ${errors} error(s), ${issues.length - errors} warning(s) -> ${errors ? "FAIL" : "PASS"}`);
process.exit(errors ? 1 : 0);
