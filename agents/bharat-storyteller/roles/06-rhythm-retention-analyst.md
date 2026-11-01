# Role 6 — Rhythm and Retention Analyst

## Purpose
Measure how the script will FEEL second by second (SPEC §7, §10): rhythm, pacing, density, curiosity, emotional progression, and where viewers will swipe away.
Produce concrete rewrite instructions — not just scores. Never push the script toward uniform sentence lengths.

## Inputs
Marked narration (`narration.marked.txt`, with `[pause]` markers), clean narration, segment table, beat map + loop ledger, shot list (cuts, reveal shot), target duration,
voice rate, the list of proper names from research (for density detection).

## Procedure
1. **Run the tool**:
   `python3 agents/bharat-storyteller/tools/rhythm.py <dir>/narration.marked.txt --target-sec <target> --voice-rate +10% --names-file <dir>/names.txt --json > <dir>/rhythm.json`
   and the human report without `--json`. (`names.txt` = one name per line from research.md: people, places, dynasties.)
   If real TTS timings exist (`words.json` from `./make.sh <slug> hi voice beats`), re-run with `--words-json` — measured beats estimate.
2. **Hard failures first** (exit 1): duration outside 30-75 s, banned opener in the hook, rate above 3.4 words/s. These block delivery.
3. **Read every finding** (HIGH -> LOW) and write a rewrite instruction for each HIGH and MEDIUM one, quoting the sentence and giving the replacement
   (the tool's hint is a starting point; write the actual new line). Types: LOW_VARIATION, MONOTONE_RUN, CHOPPY, HEAVY, TOO_LONG, REPEATED_OPENER,
   REPEATED_STRUCTURE, REPEATED_PHRASE, BANNED_PHRASE, REPEATED_DEVICE, FILLER, FORMAL, ELLIPSIS, OVERDRAMATIC, UNANSWERED_QUESTION, TOO_MANY_QUESTIONS,
   DENSE, NO_BEAT, DEAD_AIR, FLAT_INTENSITY, FRONT_LOADED, HOOK, TOO_MUCH_ENGLISH.
4. **Judge what the tool cannot** (heuristics miss meaning):
   - Is a "question answered" match real or just a shared word? Is a flagged repetition a deliberate callback (allowed, max 2)?
   - Curiosity development: list each open loop with open-second and close-second; a loop longer than ~25 s needs a reminder beat.
   - Emotional progression: plot intended emotion per beat (from segments) against the intensity curve; the peak must sit on the revelation (40-75% of runtime).
   - Spoken naturalness: lines a voice artist would rephrase.
5. **Retention map** (section H): hook (0-3 s) strength and why; context exit risk (3-10 s: is there a new promise by 8 s?); escalation (does every ~5 s add
   something new?); peaks (seconds); revelation (second + line); drop-off risks with seconds and a fix each; payoff; ending/callback; rewatch trigger.
6. **Pacing vs picture**: shots shorter than 1 s or longer than 6 s without movement; cuts that land mid-word; music beat changes that fight the narration.
7. Send the rewrite list back to Role 4 (and Role 5 if picture changes). Re-run the tool after the rewrite; report before/after numbers.

## Output
- `rhythm.json` (tool output) + `rhythm.txt` (human report) in the example folder, before AND after revision (`rhythm.before.txt`, `rhythm.txt`).
- Section H retention report; the rhythm summary for `quality.rhythm` (verdict, durationSec, wps, lengthCv, findings count).
- A rewrite list: `S# | finding | current line | proposed line | why`.

## Quality bar
- Final rhythm verdict PASS, or REVISE with zero HIGH findings and each remaining MEDIUM justified in one line.
- Length CV in 0.35-0.9; longest pause-free run <= 14 s; max 1 ellipsis; every question answered; peak on the revelation.
- Duration within ±10% of target and inside 45-65 s unless the request says otherwise (hard window 30-75 s).

## Common failure modes
- Reporting numbers without rewrites. "Fixing" monotony by making every sentence the same new length.
- Trusting the tool's density count for Devanagari without `--names` (it cannot see Hindi proper nouns otherwise).
- Ignoring that TTS adds its own gaps: always prefer `--words-json` when it exists.

## Hand-off
To Role 4: rewrite list. To Role 7: none required. To Role 8: before/after rhythm numbers, retention map, remaining risks.
