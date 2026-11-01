#!/usr/bin/env node
// BHARAT STORYTELLER — dependency-free JSON Schema (draft-07 subset) validator + semantic checks for script packages.
// Usage:
//   node agents/bharat-storyteller/tools/validate.mjs <file.json> [--schema <name|path>] [--narration-file narration.txt] [--json] [--quiet]
// Default schema: script-package (semantic checks run only for it). Exit 0 = valid, 1 = errors, 2 = usage problem.
// Supported keywords: type, required, enum, const, pattern, minimum, maximum, exclusiveMinimum, exclusiveMaximum, minLength,
// maxLength, items (schema or tuple), minItems, maxItems, properties, additionalProperties (bool|schema), oneOf, anyOf, allOf,
// $ref ("#/definitions/x", "other.schema.json", "other.schema.json#/definitions/x"; resolved inside the schemas dir).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.resolve(HERE, "..", "schemas");
const FPS = 30;

// ---------------------------------------------------------------- schema validation
const cache = new Map();
function loadSchema(file) {
  const abs = path.resolve(file);
  if (!cache.has(abs)) cache.set(abs, JSON.parse(fs.readFileSync(abs, "utf8")));
  return cache.get(abs);
}
function resolvePointer(doc, ptr) {
  if (!ptr || ptr === "#" || ptr === "") return doc;
  return ptr.replace(/^#\/?/, "").split("/").reduce((o, k) => {
    const key = k.replace(/~1/g, "/").replace(/~0/g, "~");
    if (o == null || !(key in o)) throw new Error(`bad $ref pointer ${ptr}`);
    return o[key];
  }, doc);
}
const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const isType = (v, t) => (t === "integer" ? Number.isInteger(v) : t === "number" ? typeof v === "number" && Number.isFinite(v) : typeOf(v) === t);
const show = (v) => { const s = JSON.stringify(v); return s && s.length > 60 ? s.slice(0, 57) + "..." : s; };
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** validate `v` against `s`; `file` is the schema file `s` belongs to (for relative $ref); returns list of errors */
function check(v, s, file, at, errs) {
  if (s === true || s === undefined) return errs;
  if (s === false) { errs.push(`${at}: not allowed`); return errs; }
  if (s.$ref) {
    const [f, ptr] = s.$ref.split("#");
    const target = f ? path.resolve(path.dirname(file), f) : file;
    if (f && !path.resolve(target).startsWith(SCHEMA_DIR) && !fs.existsSync(target)) { errs.push(`${at}: unresolvable $ref ${s.$ref}`); return errs; }
    return check(v, resolvePointer(loadSchema(target), ptr ? "#" + ptr : "#"), target, at, errs);
  }
  if (s.type) {
    const ts = [].concat(s.type);
    if (!ts.some((t) => isType(v, t))) { errs.push(`${at}: expected ${ts.join("|")}, got ${typeOf(v)} ${show(v)}`); return errs; }
  }
  if ("const" in s && !deepEq(v, s.const)) errs.push(`${at}: must equal ${show(s.const)}, got ${show(v)}`);
  if (s.enum && !s.enum.some((e) => deepEq(e, v))) errs.push(`${at}: ${show(v)} is not one of [${s.enum.join(", ")}]`);
  if (typeof v === "string") {
    if (s.minLength !== undefined && [...v].length < s.minLength) errs.push(`${at}: string shorter than ${s.minLength}`);
    if (s.maxLength !== undefined && [...v].length > s.maxLength) errs.push(`${at}: string longer than ${s.maxLength}`);
    if (s.pattern && !new RegExp(s.pattern, "u").test(v)) errs.push(`${at}: ${show(v)} does not match pattern ${s.pattern}`);
  }
  if (typeof v === "number") {
    if (s.minimum !== undefined && v < s.minimum) errs.push(`${at}: ${v} < minimum ${s.minimum}`);
    if (s.maximum !== undefined && v > s.maximum) errs.push(`${at}: ${v} > maximum ${s.maximum}`);
    if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum) errs.push(`${at}: ${v} must be > ${s.exclusiveMinimum}`);
    if (s.exclusiveMaximum !== undefined && v >= s.exclusiveMaximum) errs.push(`${at}: ${v} must be < ${s.exclusiveMaximum}`);
  }
  if (Array.isArray(v)) {
    if (s.minItems !== undefined && v.length < s.minItems) errs.push(`${at}: needs at least ${s.minItems} items, has ${v.length}`);
    if (s.maxItems !== undefined && v.length > s.maxItems) errs.push(`${at}: allows at most ${s.maxItems} items, has ${v.length}`);
    if (Array.isArray(s.items)) v.forEach((x, i) => { if (i < s.items.length) check(x, s.items[i], file, `${at}[${i}]`, errs); });
    else if (s.items) v.forEach((x, i) => check(x, s.items, file, `${at}[${i}]`, errs));
  }
  if (typeOf(v) === "object") {
    for (const r of s.required ?? []) if (!(r in v)) errs.push(`${at}: missing required property "${r}"`);
    for (const [k, x] of Object.entries(v)) {
      if (s.properties && k in s.properties) check(x, s.properties[k], file, `${at}.${k}`, errs);
      else if (s.additionalProperties === false) errs.push(`${at}: unknown property "${k}"`);
      else if (typeof s.additionalProperties === "object") check(x, s.additionalProperties, file, `${at}.${k}`, errs);
    }
  }
  if (s.allOf) for (const sub of s.allOf) check(v, sub, file, at, errs);
  if (s.anyOf && !s.anyOf.some((sub) => check(v, sub, file, at, []).length === 0)) errs.push(`${at}: does not match any allowed form (anyOf)`);
  if (s.oneOf) {
    const n = s.oneOf.filter((sub) => check(v, sub, file, at, []).length === 0).length;
    if (n !== 1) errs.push(`${at}: must match exactly one form (oneOf), matches ${n}`);
  }
  return errs;
}

// ---------------------------------------------------------------- semantic checks (script package)
/** words as rhythm.py counts them: whitespace tokens that contain a letter or digit (Devanagari or Roman) */
export const countWords = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w.replace(/[ऀ-ःऺ-ॏॢॣ]/g, "a"))).length;
const fr = (sec) => Math.round(sec * FPS);

const PRESET_REQUIRED = { tracking: ["subject", "path"], overShoulder: ["subject", "shoulder"], dollyIn: ["subject", "fillFrom", "fillTo"], dollyOut: ["subject", "fillFrom", "fillTo"] };
const FRONT_MODES = ["march", "stroll", "stand", "sit", "fall"], SIDE_MODES = ["march", "stand", "swing", "push"], ANIMAL_MODES = ["stand", "graze", "march"];

export function semantic(p, opts = {}) {
  const E = [], W = [];
  const err = (w, m) => E.push(`[${w}] ${m}`), warn = (w, m) => W.push(`[${w}] ${m}`);
  const st = p.story ?? {}, total = st.totalFrames, dur = st.durationSec;
  if (fr(dur) !== total) err("story", `frame math: totalFrames ${total} != round(durationSec ${dur} * 30) = ${fr(dur)}`);

  // ids and lookups
  const claims = new Map(); for (const c of p.claims ?? []) { if (claims.has(c.id)) err(`claim ${c.id}`, "duplicate claim id"); claims.set(c.id, c); }
  for (const c of p.claims ?? []) {
    if (c.usableInScript && c.sources.length === 0 && c.confidence !== "unverified") err(`claim ${c.id}`, `confidence "${c.confidence}" with no sources: add a real source or mark it unverified (never fabricate)`);
    if (c.usableInScript && c.confidence === "unverified" && !c.qualification.trim()) err(`claim ${c.id}`, "unverified claim used in the script needs an explicit qualification");
    if (c.usableInScript && (c.category === "legend" || c.category === "mythology") && !c.qualification.trim()) err(`claim ${c.id}`, `${c.category} used in the script must be qualified as tradition/legend, not stated as fact`);
    if (c.usableInScript && c.debunked) err(`claim ${c.id}`, "debunked claim marked usable");
    if (c.confidence === "high" && c.sources.length < 2) warn(`claim ${c.id}`, "high confidence with fewer than 2 sources (cross-check)");
  }
  const segs = p.narration?.segments ?? [];
  const segIds = new Map(); segs.forEach((s) => { if (segIds.has(s.id)) err(`segment ${s.id}`, "duplicate segment id"); segIds.set(s.id, s); });
  const cues = new Map(); for (const q of p.audio?.cues ?? []) { if (cues.has(q.id)) err(`cue ${q.id}`, "duplicate cue id"); cues.set(q.id, q); }
  const scenes = new Set((p.world?.scenes ?? []).map((s) => s.id));
  const cast = new Map((p.world?.cast ?? []).map((c) => [c.id, c]));
  const subjects = new Set((p.world?.subjects ?? []).map((s) => s.name));
  for (const s of p.world?.subjects ?? []) if (s.castId && !cast.has(s.castId)) err(`subject ${s.name}`, `castId "${s.castId}" is not in world.cast`);
  const beats = new Set((p.audio?.music?.beats ?? []).map((b) => b.name));
  const fut = new Set(); for (const f of p.futureDevelopment ?? []) { if (fut.has(f.id)) err(`future ${f.id}`, "duplicate id"); fut.add(f.id); }

  // hooks
  const hk = p.hooks ?? { options: [] };
  const hids = hk.options.map((h) => h.id);
  if (new Set(hids).size !== hids.length) err("hooks", "duplicate hook ids");
  if (new Set(hk.options.map((h) => h.technique)).size < 4) warn("hooks", "hooks should use different techniques (fewer than 4 distinct)");
  if (!hids.includes(hk.recommended)) err("hooks", `recommended hook "${hk.recommended}" is not among the options`);
  for (const h of hk.options) for (const c of h.claimIds ?? []) if (!claims.has(c)) err(`hook ${h.id}`, `references missing claim ${c}`);

  // narration segments
  const wps = p.narration?.wps ?? 2.6;
  let words = 0, speak = 0, est = 0;
  segs.forEach((s, i) => {
    const w = `segment ${s.id}`;
    if (s.endSec <= s.startSec) err(w, `empty or reversed time ${s.startSec}..${s.endSec}`);
    if (s.startFrame !== fr(s.startSec) || s.endFrame !== fr(s.endSec)) err(w, `frame math: frames ${s.startFrame}..${s.endFrame} != round(sec*30) ${fr(s.startSec)}..${fr(s.endSec)}`);
    if (s.startSec < 0 || s.endSec > dur + 1e-9) err(w, `outside the video duration 0..${dur} s (${s.startSec}..${s.endSec})`);
    const prev = segs[i - 1];
    if (prev && s.startSec < prev.endSec - 1e-9) err(w, `overlaps segment ${prev.id} (${s.startSec} < ${prev.endSec})`);
    if (prev) { const gap = s.startSec - prev.endSec; if (Math.abs(gap - prev.pauseAfterSec) > 0.35) warn(w, `gap after ${prev.id} is ${gap.toFixed(2)} s but pauseAfterSec says ${prev.pauseAfterSec}`); }
    for (const e of s.emphasis) if (!s.text.includes(e)) err(w, `emphasis word "${e}" does not occur in the text`);
    for (const c of s.claimIds) {
      if (!claims.has(c)) err(w, `references missing claim ${c}`);
      else if (!claims.get(c).usableInScript) err(w, `uses claim ${c}, which is marked usableInScript=false`);
    }
    for (const x of s.sfx ?? []) if (!cues.has(x)) err(w, `sfx "${x}" is not an audio cue id`);
    const n = countWords(s.text), sec = s.endSec - s.startSec, e = n / (wps * s.speed);
    words += n; speak += sec; est += e;
    const r = sec / Math.max(e, 0.1);
    if (r < 0.6 || r > 1.7) warn(w, `${n} words in ${sec.toFixed(2)} s (expected ~${e.toFixed(2)} s at ${wps} wps x speed ${s.speed}); retime`);
  });
  if (p.narration) {
    if (p.narration.totalWords !== words) err("narration", `totalWords ${p.narration.totalWords} but the segments contain ${words} words`);
    if (Math.abs(p.narration.estimatedSpeechSec - words / wps) > Math.max(1, 0.05 * words / wps)) err("narration", `estimatedSpeechSec ${p.narration.estimatedSpeechSec} != words/wps = ${(words / wps).toFixed(1)}`);
    const ratio = speak / Math.max(est, 0.1);
    if (ratio < 0.8 || ratio > 1.25) err("narration", `speaking time inconsistent: segments span ${speak.toFixed(1)} s of speech but ${words} words need ~${est.toFixed(1)} s (ratio ${ratio.toFixed(2)}, allowed 0.80-1.25)`);
    const last = segs[segs.length - 1];
    if (last && dur - last.endSec > 4) warn("narration", `speech ends ${(dur - last.endSec).toFixed(1)} s before the video ends`);
    if (segs[0] && segs[0].startSec > 0.6) warn("narration", `first word at ${segs[0].startSec} s: the hook should start within 0.6 s`);
    if (segs[0] && segs[0].beat !== "hook") warn("narration", "first segment is not the hook");
  }
  if (opts.narrationFile) {
    const norm = (t) => t.replace(/\s+/g, " ").trim();
    const file = norm(fs.readFileSync(opts.narrationFile, "utf8")), joined = norm(segs.map((s) => s.text).join(" "));
    if (file !== joined) err("narration.txt", "clean narration file differs from the concatenated segment texts");
    if (/\[|\]|\*/.test(file)) err("narration.txt", "contains [markers] or *emphasis*: narration.txt must be clean TTS text");
  }

  // shots
  const shots = p.shots ?? [];
  const shotIds = new Set();
  shots.forEach((s, i) => {
    const w = `shot ${s.id}`;
    if (shotIds.has(s.id)) err(w, "duplicate shot id"); shotIds.add(s.id);
    if (s.id !== i + 1) err(w, `ids must be 1..N in order (expected ${i + 1})`);
    if (s.startFrame !== fr(s.startSec) || s.endFrame !== fr(s.endSec)) err(w, `frame math: frames ${s.startFrame}..${s.endFrame} != round(sec*30) ${fr(s.startSec)}..${fr(s.endSec)}`);
    if (s.endFrame <= s.startFrame) err(w, `empty or reversed range ${s.startFrame}..${s.endFrame}`);
    if (s.endFrame - s.startFrame < 15) warn(w, `only ${s.endFrame - s.startFrame} frames long (< 0.5 s)`);
    const prev = shots[i - 1];
    if (i === 0 && s.startFrame !== 0) err(w, `first shot must start at frame 0 (starts at ${s.startFrame})`);
    if (prev && s.startFrame < prev.endFrame) err(w, `overlaps shot ${prev.id} (${s.startFrame} < ${prev.endFrame})`);
    if (prev && s.startFrame > prev.endFrame) err(w, `gap after shot ${prev.id}: frames ${prev.endFrame}..${s.startFrame} belong to no shot`);
    const inShot = (f) => f >= s.startFrame && f < s.endFrame;
    if (!scenes.has(s.environment.scene)) err(w, `scene "${s.environment.scene}" is not declared in world.scenes`);
    if (s.environment.clock.kind === "rel" && typeof s.environment.clock.at !== "number") err(w, "clock rel needs `at`");
    for (const id of s.narration.segmentIds) if (!segIds.has(id)) err(w, `narration references missing segment ${id}`);
    // characters / actions / expressions
    const here = new Map();
    for (const c of s.characters) {
      here.set(c.id, c);
      const cc = cast.get(c.id);
      if (!cc) { err(w, `character "${c.id}" is not in world.cast`); continue; }
      const ok = cc.kind === "animal" ? ANIMAL_MODES : c.view === "side" ? SIDE_MODES : FRONT_MODES;
      if (!ok.includes(c.mode)) err(w, `character "${c.id}": mode "${c.mode}" does not exist for ${cc.kind === "animal" ? "animals" : c.view + " view"} (allowed: ${ok.join(", ")})`);
    }
    for (const a of s.actions) {
      if (!here.has(a.characterId)) err(w, `action for "${a.characterId}" who is not in this shot`);
      if (!inShot(a.atFrame)) err(w, `action at frame ${a.atFrame} is outside the shot ${s.startFrame}..${s.endFrame}`);
      if (a.untilFrame !== undefined && (a.untilFrame <= a.atFrame || a.untilFrame > s.endFrame)) err(w, `action until ${a.untilFrame} is invalid`);
    }
    for (const x of s.expressions) {
      if (!here.has(x.characterId)) err(w, `expression for "${x.characterId}" who is not in this shot`);
      if (!inShot(x.atFrame)) err(w, `expression at frame ${x.atFrame} is outside the shot ${s.startFrame}..${s.endFrame}`);
    }
    // camera
    const keys = s.cameraMovement.keys;
    if (keys[0] && keys[0].f !== s.startFrame) err(w, `first camera key must be at the shot start (${s.startFrame}), is ${keys[0].f}`);
    keys.forEach((k, j) => {
      if (j && k.f <= keys[j - 1].f) err(w, `camera keys must be strictly ascending (key ${j} at ${k.f})`);
      if (!inShot(k.f)) err(w, `camera key at ${k.f} is outside the shot ${s.startFrame}..${s.endFrame}`);
      for (const r of PRESET_REQUIRED[k.preset] ?? ["subject"]) if (k.params[r] === undefined) err(w, `camera key at ${k.f}: preset ${k.preset} needs param "${r}"`);
      for (const n of [...[].concat(k.params.subject ?? []), ...(k.params.shoulder ? [k.params.shoulder] : [])]) if (!subjects.has(n)) err(w, `camera key at ${k.f}: unknown subject "${n}" (declare it in world.subjects)`);
    });
    if (!subjects.has(s.cameraTarget)) err(w, `cameraTarget "${s.cameraTarget}" is not in world.subjects`);
    // effects, dof
    for (const x of s.effects) {
      if (!inShot(x.atFrame)) err(w, `effect ${x.fx} at ${x.atFrame} is outside the shot`);
      if (x.untilFrame !== undefined && (x.untilFrame <= x.atFrame || x.untilFrame > s.endFrame)) err(w, `effect ${x.fx}: untilFrame ${x.untilFrame} invalid`);
      if (x.fx === "kick" && !(p.events?.kicks ?? []).some(([f]) => f === x.atFrame)) err(w, `kick at ${x.atFrame} is not in events.kicks`);
      if (x.fx === "flash" && !(p.events?.flashes ?? []).some(([f]) => f === x.atFrame) && p.events?.flashAt !== x.atFrame) err(w, `flash at ${x.atFrame} is not in events.flashes/flashAt`);
    }
    for (const d of s.dof ?? []) {
      if (!inShot(d.f)) err(w, `dof key at ${d.f} is outside the shot`);
      if (d.cInf > 0) warn(w, "depth of field requested: lens is OFF by default; needs focus on the face, low cInf and owner approval");
    }
    // transition
    const t = s.transition;
    if (i === 0 && t.type !== "open") err(w, `first shot transition must be "open", is "${t.type}"`);
    if (i > 0 && t.type === "open") err(w, `"open" is only for the first shot`);
    if (t.type.includes("xfade")) {
      if (t.frames === undefined) err(w, "xfade needs `frames`");
      else if (prev && t.frames > Math.min(s.endFrame - s.startFrame, prev.endFrame - prev.startFrame)) err(w, `xfade ${t.frames} is longer than a neighbouring shot`);
    }
    if (t.type.includes("flash")) {
      if (t.flashPeak === undefined) err(w, "flash needs `flashPeak`");
      const ev = p.events ?? { flashes: [] };
      if (ev.flashAt !== s.startFrame && !ev.flashes.some(([f]) => Math.abs(f - s.startFrame) <= 2)) err(w, `flash transition at ${s.startFrame} has no matching events.flashAt / events.flashes entry`);
    }
    for (const x of s.soundEffects) if (!cues.has(x)) err(w, `sound effect "${x}" is not an audio cue id`);
    if (!beats.has(s.musicDirection.beat)) err(w, `music beat "${s.musicDirection.beat}" is not in audio.music.beats`);
    for (const f of s.futureDevelopmentIds ?? []) if (!fut.has(f)) err(w, `futureDevelopment id ${f} not declared`);
  });
  const last = shots[shots.length - 1];
  if (last && last.endFrame !== total) err("shots", `last shot ends at ${last.endFrame}, totalFrames is ${total} (shots must tile the whole duration)`);
  // every segment should be heard in some shot
  const covered = new Set(shots.flatMap((s) => s.narration.segmentIds));
  for (const id of segIds.keys()) if (!covered.has(id)) warn(`segment ${id}`, "not referenced by any shot");

  // events
  const ev = p.events, inT = (f) => Number.isInteger(f) && f >= 0 && f < total;
  if (ev) {
    if (!inT(ev.flashAt)) err("events", `flashAt ${ev.flashAt} outside the timeline`);
    for (const [f, pk] of ev.flashes) if (!inT(f) || !(pk > 0 && pk <= 1)) err("events", `bad flash [${f}, ${pk}]`);
    for (const f of ev.hits) if (!inT(f)) err("events", `hit ${f} outside the timeline`);
    for (const [f, g] of ev.kicks) if (!inT(f) || !(g > 0)) err("events", `bad kick [${f}, ${g}]`);
  }
  // audio
  for (const q of p.audio?.cues ?? []) {
    const w = `cue ${q.id}`;
    if (!inT(q.at)) err(w, `frame ${q.at} outside the timeline 0..${total}`);
    if (q.span && !(q.span[0] >= 0 && q.span[0] < q.span[1] && q.span[1] <= total)) err(w, `bad span ${JSON.stringify(q.span)}`);
    if (q.segmentId && !segIds.has(q.segmentId)) err(w, `segmentId ${q.segmentId} does not exist`);
    if (q.shotId && !shotIds.has(q.shotId)) err(w, `shotId ${q.shotId} does not exist`);
    if (q.sync && !q.word) err(w, "sync cue needs `word`");
  }
  const bn = new Set();
  for (const b of p.audio?.music?.beats ?? []) {
    if (bn.has(b.name)) err(`beat ${b.name}`, "duplicate beat name"); bn.add(b.name);
    const [a, z] = b.shots;
    if (!shotIds.has(a) || !shotIds.has(z) || a > z) err(`beat ${b.name}`, `bad shot range ${JSON.stringify(b.shots)}`);
  }

  // quality honesty
  const qr = p.quality;
  if (qr) {
    const sc = Object.values(qr.scores ?? {});
    const mean = sc.reduce((a, b) => a + b, 0) / Math.max(sc.length, 1);
    if (qr.verdict === "pass" && sc.some((x) => x < 7)) err("quality", "verdict pass but at least one score is below 7");
    if (qr.verdict === "pass" && (qr.weaknesses ?? []).some((x) => x.severity === "high" && !x.resolved)) err("quality", "verdict pass with an unresolved high-severity weakness");
    if (qr.verdict === "pass" && qr.rhythm?.verdict === "FAIL") err("quality", "verdict pass but the rhythm analyser verdict is FAIL");
    if (mean >= 9.5) warn("quality", `mean score ${mean.toFixed(1)}: check for score inflation`);
    if (qr.rhythm && Math.abs(qr.rhythm.durationSec - dur) > 6) warn("quality", `rhythm duration ${qr.rhythm.durationSec} s vs story ${dur} s`);
  }
  return { errors: E, warnings: W };
}

// ---------------------------------------------------------------- CLI
function main(argv) {
  const args = { file: null, schema: "script-package", narr: null, json: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--schema") args.schema = argv[++i];
    else if (a === "--narration-file") args.narr = argv[++i];
    else if (a === "--json") args.json = true;
    else if (a === "--quiet") args.quiet = true;
    else if (a === "-h" || a === "--help") { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 8).join("\n")); return 0; }
    else if (!args.file) args.file = a;
    else { console.error(`unexpected argument ${a}`); return 2; }
  }
  if (!args.file) { console.error("usage: validate.mjs <file.json> [--schema name|path] [--narration-file narration.txt] [--json]"); return 2; }
  const schemaFile = fs.existsSync(args.schema) ? path.resolve(args.schema) : path.join(SCHEMA_DIR, args.schema.replace(/(\.schema)?\.json$/, "") + ".schema.json");
  if (!fs.existsSync(schemaFile)) { console.error(`schema not found: ${schemaFile}`); return 2; }
  let data;
  try { data = JSON.parse(fs.readFileSync(args.file, "utf8")); }
  catch (e) { const out = { file: args.file, valid: false, errors: [`invalid JSON: ${e.message}`], warnings: [] }; args.json ? console.log(JSON.stringify(out, null, 2)) : console.log(`FAIL ${args.file}\n  ERROR ${out.errors[0]}`); return 1; }
  const errors = check(data, loadSchema(schemaFile), schemaFile, "$", []).map((e) => `[schema] ${e}`);
  let warnings = [];
  if (path.basename(schemaFile) === "script-package.schema.json" && errors.length === 0) {
    const r = semantic(data, { narrationFile: args.narr });
    errors.push(...r.errors); warnings = r.warnings;
  } else if (path.basename(schemaFile) === "script-package.schema.json") {
    warnings.push("[semantic] skipped: fix schema errors first");
  }
  const valid = errors.length === 0;
  if (args.json) console.log(JSON.stringify({ file: args.file, schema: path.basename(schemaFile), valid, errors, warnings }, null, 2));
  else {
    console.log(`${valid ? "OK" : "FAIL"} ${args.file} (${path.basename(schemaFile)}): ${errors.length} error(s), ${warnings.length} warning(s)`);
    for (const e of errors) console.log("  ERROR " + e);
    if (!args.quiet) for (const w of warnings) console.log("  WARN  " + w);
  }
  return valid ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
