// Storyboard config: types + validator. Pure TypeScript (no imports, no I/O) so it runs in Remotion, in Node and in scripts.
// A storyboard is DATA: shots (frame ranges, light, scene, event clock, camera keys, depth of field, crossfade) and global events.
// Camera functions and physics stay in code and are referenced BY NAME (`camera[].fn`), so a storyboard can be validated
// (missing names are reported) without running any rendering code.
export type LightName = "day" | "golden" | "dusk" | "space";
export type SceneName = "taiga" | "straw" | "tree" | "office" | "globe";
export type V3 = [number, number, number];
export type ClockSpec =
  | { kind: "none" }                                             // event clock parked far in the past: nothing happens
  | { kind: "after" }                                            // aftermath: everything settled
  | { kind: "rel"; at: number; arrive?: number; scale?: number } // e = (f - at)/fps [* scale] [+ blast-wave arrival time at radius `arrive`]
/** one camera key: either `fn` (a hand-written camera function, by name) or `preset` (+ params) from the camera director (src/engine/camera) */
export type CameraKey = { f: number; fn?: string; preset?: string; params?: Record<string, unknown>; dur?: number; cut?: boolean };
export type DofKey = { f: number; cInf: number; dur?: number; focus?: V3 };
export type StoryShot = {
  id: number; a: number; b: number; light: LightName; scene: SceneName; clock: ClockSpec; camera: CameraKey[]; dof: DofKey[];
  fog?: [number, number]; year?: "1908" | "1927" | "now"; xfade?: number; note?: string;
};
export type StoryEvents = { flashAt: number; flashes: [number, number][]; hits: number[]; kicks: [number, number][] };
export type Storyboard = { version: 1; fps: number; totalFrames: number; events: StoryEvents; shots: StoryShot[]; cameraSubjects?: string[] };
export type Issue = { level: "error" | "warn"; where: string; msg: string };
export type ValidateCtx = {
  camFns?: string[];                         // names that exist in the code registry (missing-asset detection)
  subjects?: string[];                       // camera-director subjects that exist in code
  presetCheck?: (name: string, params: Record<string, unknown>, subjects?: string[]) => string[];   // camera-director preset validator
  scenes?: string[]; lights?: string[];      // allowed values (defaults below)
  voiceFrames?: number;                      // length of the narration in frames (timeline consistency)
  wordFrames?: number[];                     // start frame of every spoken word: used to check cue alignment (optional)
};
const LIGHTS = ["day", "golden", "dusk", "space"], SCENES = ["taiga", "straw", "tree", "office", "globe"];
const isInt = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x);

export function validateStoryboard(sb: Storyboard, ctx: ValidateCtx = {}): Issue[] {
  const out: Issue[] = [];
  const err = (where: string, msg: string) => out.push({ level: "error", where, msg });
  const warn = (where: string, msg: string) => out.push({ level: "warn", where, msg });
  if (sb.version !== 1) err("storyboard", `unsupported version ${sb.version}`);
  if (!(sb.fps > 0)) err("storyboard", "fps must be > 0");
  if (!isInt(sb.totalFrames) || sb.totalFrames <= 0) err("storyboard", "totalFrames must be a positive integer");
  if (!sb.shots?.length) { err("storyboard", "no shots"); return out; }
  const lights = ctx.lights ?? LIGHTS, scenes = ctx.scenes ?? SCENES;
  const ids = new Set<number>();
  sb.shots.forEach((s, i) => {
    const w = `shot ${s.id}`;
    if (ids.has(s.id)) err(w, "duplicate id"); ids.add(s.id);
    if (s.id !== i + 1) err(w, `ids must be 1..N in order (expected ${i + 1})`);
    if (!isInt(s.a) || !isInt(s.b)) { err(w, "a and b must be integers"); return; }
    if (s.b <= s.a) err(w, `empty or reversed range ${s.a}..${s.b}`);
    const prev = sb.shots[i - 1];
    if (i === 0 && s.a !== 0) err(w, `first shot must start at frame 0 (starts at ${s.a})`);
    if (prev && s.a < prev.b) err(w, `overlaps shot ${prev.id} (${s.a} < ${prev.b})`);
    if (prev && s.a > prev.b) err(w, `gap after shot ${prev.id}: frames ${prev.b}..${s.a} belong to no shot`);
    if (!lights.includes(s.light)) err(w, `unknown light "${s.light}"`);
    if (!scenes.includes(s.scene)) err(w, `unknown scene "${s.scene}"`);
    if (s.fog && !(s.fog[0] >= 0 && s.fog[1] > s.fog[0])) err(w, "fog must be [near, far] with 0 <= near < far");
    const c = s.clock;
    if (!c || !["none", "after", "rel"].includes(c.kind)) err(w, "clock.kind must be none | after | rel");
    else if (c.kind === "rel") {
      if (typeof c.at !== "number") err(w, "clock rel needs numeric `at`");
      if (c.arrive !== undefined && !(c.arrive >= 0)) err(w, "clock.arrive must be >= 0");
      if (c.scale !== undefined && !(c.scale > 0)) err(w, "clock.scale must be > 0");
    }
    if (!s.camera?.length) err(w, "needs at least one camera key");
    else {
      if (s.camera[0].f !== s.a) err(w, `first camera key must be at the shot start (${s.a}), is ${s.camera[0].f}`);
      s.camera.forEach((k, j) => {
        if (j && k.f <= s.camera[j - 1].f) err(w, `camera keys must be strictly ascending (key ${j} at ${k.f})`);
        if (k.f < s.a || k.f >= s.b) err(w, `camera key at ${k.f} is outside the shot ${s.a}..${s.b}`);
        if (k.dur !== undefined && !(k.dur > 0)) err(w, `camera key at ${k.f}: dur must be > 0`);
        if ((k.fn === undefined) === (k.preset === undefined)) err(w, `camera key at ${k.f}: give exactly one of fn or preset`);
        else if (k.fn !== undefined && ctx.camFns && !ctx.camFns.includes(k.fn)) err(w, `camera key at ${k.f}: unknown camera function "${k.fn}" (missing asset)`);
        else if (k.preset !== undefined) {
          if (!ctx.presetCheck) warn(w, `camera key at ${k.f}: preset "${k.preset}" not checked (no preset validator given)`);
          else for (const m of ctx.presetCheck(k.preset, k.params ?? {}, ctx.subjects)) err(w, `camera key at ${k.f}: ${m}`);
        }
      });
    }
    (s.dof ?? []).forEach((d, j) => {
      if (j && d.f <= s.dof[j - 1].f) err(w, `dof keys must be ascending (key ${j} at ${d.f})`);
      if (d.f < s.a || d.f >= s.b) err(w, `dof key at ${d.f} is outside the shot ${s.a}..${s.b}`);
      if (!(d.cInf >= 0)) err(w, `dof key at ${d.f}: cInf must be >= 0`);
      if (d.focus && d.focus.length !== 3) err(w, `dof key at ${d.f}: focus must be [x,y,z]`);
    });
    if (s.xfade !== undefined) {
      const len = s.b - s.a, plen = prev ? prev.b - prev.a : 0;
      if (!isInt(s.xfade) || s.xfade <= 0) err(w, "xfade must be a positive integer");
      else if (!prev) err(w, "the first shot cannot crossfade in");
      else if (s.xfade > Math.min(len, plen)) err(w, `xfade ${s.xfade} is longer than a neighbouring shot (${plen}/${len})`);
    }
  });
  if (sb.cameraSubjects && ctx.subjects) { for (const n of sb.cameraSubjects) if (!ctx.subjects.includes(n)) err("storyboard", `cameraSubjects lists "${n}" but no such subject exists in code`); for (const n of ctx.subjects) if (!sb.cameraSubjects.includes(n)) warn("storyboard", `subject "${n}" exists in code but is not listed in cameraSubjects`); }
  const last = sb.shots[sb.shots.length - 1];
  if (last && last.b !== sb.totalFrames) err("storyboard", `last shot ends at ${last.b}, totalFrames is ${sb.totalFrames}`);
  const ev = sb.events, inRange = (f: number) => isInt(f) && f >= 0 && f < sb.totalFrames;
  if (!inRange(ev.flashAt)) err("events", `flashAt ${ev.flashAt} outside the timeline`);
  ev.flashes.forEach(([f, pk]) => { if (!inRange(f) || !(pk > 0 && pk <= 1)) err("events", `bad flash [${f}, ${pk}]`); });
  ev.hits.forEach((f) => { if (!inRange(f)) err("events", `hit ${f} outside the timeline`); });
  ev.kicks.forEach(([f, g]) => { if (!inRange(f) || !(g > 0)) err("events", `bad kick [${f}, ${g}]`); });
  ev.hits.forEach((h) => { if (!ev.kicks.some(([f]) => f === h)) warn("events", `hit ${h} has no matching kick`); });
  if (ctx.voiceFrames !== undefined) {
    const d = ctx.voiceFrames - sb.totalFrames;
    if (Math.abs(d) > 45) warn("timeline", `narration is ${ctx.voiceFrames} frames, storyboard ${sb.totalFrames} (${d > 0 ? "+" : ""}${d}); needs a time warp`);
  }
  if (ctx.wordFrames) {
    for (const [f] of [...ev.flashes, ...ev.kicks]) {
      const gap = Math.min(...ctx.wordFrames.map((w) => Math.abs(w - f)));
      if (gap > 20) warn("events", `cue at frame ${f} is ${gap} frames from the nearest spoken word`);
    }
  }
  return out;
}
export const assertValid = (sb: Storyboard, ctx?: ValidateCtx) => {
  const errs = validateStoryboard(sb, ctx).filter((i) => i.level === "error");
  if (errs.length) throw new Error("Invalid storyboard:\n" + errs.map((e) => `  [${e.where}] ${e.msg}`).join("\n"));
};
