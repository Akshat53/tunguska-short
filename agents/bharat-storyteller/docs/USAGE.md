# Using BHARAT STORYTELLER

## 1. Invoke the agent
**Claude Code (recommended).** The subagent is defined in `.claude/agents/bharat-storyteller.md`. From the repo root:
```
> Use the bharat-storyteller agent to write a script for agents/bharat-storyteller/examples/topic-requests/01-history.md
```
or give the request inline ("bharat-storyteller: Hinglish Short, 55 s, on the Konark Sun Temple wheels as sundials, audience 18-30").
The agent normalises the request into `examples/<slug>/request.md`, then runs the 13 phases in `AGENT.md`.

**Without the subagent** (any Claude session): "Read agents/bharat-storyteller/AGENT.md and follow it for this topic request: …".

**Web research.** WebSearch/WebFetch are needed for verified research. In some sessions they are deferred tools: the agent loads them with
`ToolSearch` (`select:WebSearch,WebFetch`). If they cannot be loaded, the run continues in `offline-unverified` mode (all claims unverified and qualified,
researchReliability <= 4) — re-run with web access before publishing.

## 2. Topic request format
A Markdown file with a fenced YAML-like header (see `examples/topic-requests/`):
```
topic:        Rani ki Vav, Patan
category:     temples-monuments          # SPEC §2 categories (story.schema.json enum)
language:     hinglish                   # hinglish | hindi | english
duration:     55                         # target seconds (45-65 normal; 30-75 hard)
audience:     Indian Shorts viewers 18-35, curious, not specialists
voice:        hi-IN-MadhurNeural +10%
tone:         awed, warm
constraints:  - respectful of ... ; - avoid ...
must_avoid:   viral claims to treat with suspicion
angle_hint:   optional
```
Then free text: why this topic, anything the owner already knows, sources to start from.

## 3. Outputs
`agents/bharat-storyteller/examples/<slug>/`: `request.md`, `research.md`, `research.json`, `names.txt`, `narration.marked.txt`, `narration.txt`,
`rhythm.before.txt`, `rhythm.txt`, `rhythm.json`, `script.md` (sections A-K), `script.json`.
To produce the video afterwards (owner's pipeline, `NEW_STORY.md`): copy `narration.txt` to `stories/<slug>/hi/narration.txt`, build the world/cast listed in
section F + `futureDevelopment`, turn `script.json` shots into `src/videos/<slug>/storyboard.json` and cues into a cues file, then `./make.sh <slug> hi voice beats`.

## 4. Tools
### Rhythm analyser
```
python3 agents/bharat-storyteller/tools/rhythm.py FILE [--wps 2.6] [--voice-rate +10%] [--lang hinglish|hindi|english]
        [--target-sec 58] [--words-json voice/words.json] [--names "अशोक,पाटलिपुत्र"] [--names-file names.txt]
        [--allow-length] [--strict] [--json]
```
Input: narration text; sentence ends `। ? ! . …`; `[pause 0.4]` markers; `*word*` emphasis; blank line = beat break; `#` comment lines.
Output: duration, words/s, sentence lengths (mean/std/CV/histogram), pauses, ellipses, questions (unanswered), density per sentence, hook check (first 3 s),
intensity curve per 5 s, Devanagari/Roman mix, a per-sentence table, and FINDINGS with rewrite suggestions.
Exit codes: 0 PASS/REVISE, 1 hard failure (duration outside 30-75 s without `--allow-length`; banned opener in the hook; rate > 3.4 words/s),
2 REVISE with `--strict`, 3 usage error. Use `--words-json` with real TTS timings whenever available — estimates are only estimates.

### Validator
```
node agents/bharat-storyteller/tools/validate.mjs FILE [--schema script-package|claim|narration|shot|story|audio-cue|transition|quality-report|path]
        [--narration-file narration.txt] [--json] [--quiet]
```
Schema checks (draft-07 subset) plus, for packages: shots tile `0..totalFrames` (no gap/overlap), seconds↔frames (`round(sec*30)`), unique ids,
camera keys inside shots with the preset's required params and declared subjects, character modes valid for the view, narration inside the duration,
emphasis words present, claim references exist and are usable, speaking time vs word count (ratio 0.8-1.25), xfade/flash consistency with `events`,
cue/beat references, quality honesty (no `pass` with a score < 7). Exit 1 on any error; warnings are printed but do not fail.

### Tests
`bash agents/bharat-storyteller/tools/test_tools.sh` — valid package passes; 20 injected faults fail with the right message; rhythm analyser flags the
monotonous fixture and passes the varied one; hard-failure exits are checked.

## 5. Add a topic
1. Copy the closest file in `examples/topic-requests/` to a new file, edit the header and notes.
2. Invoke the agent with it. One topic per run.
3. Review `script.md` section K (scores, weaknesses) and the future-development list before committing to production.

## 6. Improve a role
Edit only that role's file in `roles/`; keep the Inputs/Output contract so neighbouring roles still fit. If the engine gains features, update
`schemas/ENGINE_CAPABILITIES.md` and the enums in `schemas/shot.schema.json` / `audio-cue.schema.json`, then run the tests.
