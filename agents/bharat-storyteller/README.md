# BHARAT STORYTELLER

A script-writing agent for Indian-topic YouTube Shorts (Hinglish by default) made for this repo's procedural cartoon engine.
One coordinated agent works through eight roles — researcher, story architect, hook specialist, Hinglish narration writer, cinematic director,
rhythm/retention analyst, fact checker, senior editor — and delivers a research-backed script, a TTS-ready narration file, an engine-feasible storyboard,
audio direction, and a validated `script.json`.

## Layout
| Path | Purpose |
|---|---|
| `SPEC.md` | owner's specification (source of requirements) |
| `AGENT.md` | main agent instructions: phases, outputs, stopping + honesty rules |
| `roles/01..08-*.md` | role prompts (each can be improved on its own) |
| `schemas/*.schema.json` | JSON Schema (draft-07) for story, claim, narration, shot, audio cue, transition, quality report, and the whole package |
| `schemas/ENGINE_CAPABILITIES.md` | exactly what the engine can render today + future-development list |
| `QUALITY_CHECKLIST.md` | senior-editor checklist with pass criteria |
| `tools/validate.mjs` | dependency-free schema validator + semantic checks (timeline tiling, frame math, claim references, speaking time) |
| `tools/rhythm.py` | rhythm analyser with rewrite suggestions (stdlib Python) |
| `tools/test_tools.sh` | tests for both tools (fixtures in `tools/fixtures/`) |
| `docs/AUDIT.md` | repo audit (conventions, research tools, gaps) |
| `docs/USAGE.md` | how to run the agent and the tools, add a topic |
| `examples/topic-requests/` | input format examples |
| `examples/<slug>/` | one folder per produced script |

## Quick start
```bash
# in Claude Code, from the repo root
> Use the bharat-storyteller agent on agents/bharat-storyteller/examples/topic-requests/03-geography-mystery.md

# tools
bash agents/bharat-storyteller/tools/test_tools.sh
python3 agents/bharat-storyteller/tools/rhythm.py path/to/narration.marked.txt --target-sec 58 --voice-rate +10%
node agents/bharat-storyteller/tools/validate.mjs path/to/script.json --narration-file path/to/narration.txt
```
Details: `docs/USAGE.md`. Engine limits: `schemas/ENGINE_CAPABILITIES.md`.

## Status
Framework, schemas, tools and tests are in place. Demonstration scripts (SPEC §16: one historical, one mystery/location, one science/engineering subject)
go in `examples/<slug>/` and are produced by running the agent.
