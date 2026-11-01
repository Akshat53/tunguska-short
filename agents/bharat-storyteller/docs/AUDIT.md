# Repo audit for BHARAT STORYTELLER (2026-11-01)

Scope: what exists that the script-writing agent must fit into. Read-only audit; nothing outside `agents/bharat-storyteller/` and `.claude/agents/` was changed.

## Structure (relevant parts)
| Path | What it is |
|---|---|
| `src/videos/tunguska/` | the only story: `world.ts` (3D set), `cast.ts` (characters/effects per shot, hand-written `stage()`), `toon.ts` (character drawing), `art.ts` (effect cards), `story.ts` (timeline loader, camera functions, subjects), `storyboard.json` (timeline data), `lights.ts`, `grade.ts`, `ink.ts`, `lensblur.ts`, `Tunguska.tsx` (post chain) |
| `src/engine/storyboard/schema.ts` | storyboard types + validator (shots tile timeline, camera keys, DOF, xfade, events) |
| `src/engine/camera/` | camera-director presets (12), splines, framing, collision |
| `audio/` | data-driven SFX (`cues.json`, `cues.py`), synths (`sfx_gen.py`, `synth.py`, `instruments.py`), mix (`score.py`), reports |
| `scripts/` | render/produce/QA/beats/warp tools; `validate-storyboard.mjs` |
| `stories/<slug>/story.json` | per-story pipeline config (voice, rate, dirs) — only `tunguska` exists |
| `SCRIPT.md` | the Tunguska script: verified facts with sources first, debunked claims listed as NOT USED, beats HOOK..CALLBACK — the house-style reference |
| `NEW_STORY.md`, `HANDOFF.md`, `docs/*.md` | pipeline + decisions (lens off, no grain, ink/DOF order, pure-frame animation, no in-scene text) |

## Conventions found
- Frames at 30 fps, 1080x1920; shots `[a, b)` tile the timeline; integer shot ids 1..N.
- Data over code where possible (storyboard.json, cues.json) with validators that exit 1 and name the problem; tests are bash scripts with injected faults (`audio/test_report.sh`, `scripts/test.sh`).
- Scripts: facts + sources first, debunked list, ~200 words, calm deadpan tone, one steady voice, "jokes are real facts".
- Next video planned: Indian topic, Hindi voice (`hi-IN-MadhurNeural` / `hi-IN-SwaraNeural`, start at `+10%`), narration in Devanagari at `stories/<slug>/hi/narration.txt`.

## Agent / skill conventions
- No `.claude/` directory existed in the repo (no project agents, skills, commands or settings). Created `.claude/agents/bharat-storyteller.md` (a Claude Code subagent) — the only file outside `agents/`.
- `agents/bharat-storyteller/SPEC.md` (owner spec) was the only existing agent file. No duplicate script-writing tooling exists; `scripts/beats.py` (word -> frame) and `validate-storyboard.mjs` are complementary and are referenced, not copied.
- `node_modules` contains `ajv`, but the agent's validator is dependency-free (`tools/validate.mjs`) so it runs anywhere with Node.

## Research tools
- **WebSearch** and **WebFetch** exist in Claude Code but are *deferred* tools in this environment: they must be loaded before use (in an interactive Claude Code session they are normally available directly; in an SDK/agent session load them with `ToolSearch` query `select:WebSearch,WebFetch`). A `web-fetch` helper agent type is also available for reading pages.
- No MCP research server (Scholar, news, ASI database) is connected. Connected MCP servers are unrelated (Docs, Gmail, Calendar, Drive, Vercel, design tools).
- Rule enforced by the agent and by `validate.mjs`: if web research is unavailable the run is `researchMode: "offline-unverified"`, every claim is `confidence: "unverified"`, `sources: []`, used only with an explicit qualification — **never invent a source or URL**. `read: "page"` only when the page was actually fetched and read; `"snippet"` when only a search snippet was seen.

## Runtimes
Node v23.11.0, Python 3.13.3 (stdlib is enough for the tools); `.venv` has numpy/scipy (not needed by the agent tools). Do not read `.env.local` (ElevenLabs key).

## Gaps that affect scripts (details in `schemas/ENGINE_CAPABILITIES.md` §11)
No Indian sets, costumes, animals or extra expressions yet; characters/effects per shot are still hand-written code; transitions are cut/xfade/flash only; 14 expressions; 4 light presets.
Every new story therefore carries a world/cast build cost that the storyboard must keep small.
