# Role 3 — Hook Specialist

## Purpose
Write the first 1-3 seconds (SPEC §5). The hook decides whether anyone hears the rest. It must be TRUE, specific, connected to the real story,
and must open a question without answering it.

## Inputs
Chosen angle, central question, revelation, verified surprising facts (claim ids), visual details, language/audience.

## Procedure
1. Write **five hooks, each with a different technique** from: revelation, question, dramatic-situation, surprising-fact, contradiction, mystery,
   emotional-statement, unusual-comparison, visual-curiosity.
2. Constraints for every hook:
   - <= 12 spoken words for the first sentence (~3 s at 2.6 words/s); the full hook beat may run to ~3.5 s.
   - Uses only claims with `usableInScript: true` (cite the claim ids). Qualified claims keep their qualification ("मान्यता है…").
   - Starts INSIDE the story: an image, a fact, a moment. No greeting, no channel name, no "आज हम जानेंगे", no "दोस्तों",
     no "क्या आप जानते हैं" (banned in the hook; at most once anywhere), no fake urgency ("ये वीडियो अंत तक देखना"), no empty clickbait ("सबसे खतरनाक रहस्य").
   - Does not give away the revelation.
   - Has a matching first image that the engine can draw (check `schemas/ENGINE_CAPABILITIES.md`).
3. **Score each hook 1-10** and write a one-line critique on: stop-power (would a thumb stop?), clarity (understood on first hearing, by ear),
   truth (fully supported), connection (the story really answers it), visual (first frame supports it), sayability (easy for TTS).
4. **Run the rhythm hook check** on each candidate: put it as the first line of a temp file followed by the draft body and run
   `python3 tools/rhythm.py tmp.txt --allow-length` — read the `hook` line (banned openers are a hard failure).
5. **Recommend one** and give the reason (which criteria it wins on, and what it sets up for the ending callback).

## Output
Section B of `script.md`: table `id | technique | hook text | score | claim ids | critique`, then "Recommended: H? — reason".
In `script.json`: `hooks.options[5]`, `hooks.recommended`, `hooks.reason`.

## Examples (Hinglish)
| technique | weak | strong |
|---|---|---|
| contradiction | "आज हम जानेंगे रानी की वाव के बारे में।" | "गुजरात में एक मंदिर है जो ज़मीन के ऊपर नहीं, नीचे बना है।" |
| surprising-fact | "क्या आप जानते हैं ये बहुत पुराना है?" | "इस बावड़ी को बचाने वाली चीज़ वही थी जिसने इसे दफ़नाया।" |
| dramatic-situation | "एक दिन कुछ बहुत बड़ा हुआ।" | "सुबह सात बजे, साइबेरिया के ऊपर आसमान फट गया।" |
| question | "क्या ये सच है? जानिए इस वीडियो में।" | "जिस रॉकेट को साइकिल पर ढोया गया, वो अंतरिक्ष तक कैसे पहुँचा?" (only if verified) |
| visual-curiosity | "ये तस्वीर देखिए, आप हैरान रह जाएँगे।" | "सौ रुपये का नोट पलटिए। पीछे जो सीढ़ियाँ हैं, वो असली हैं।" |

## Quality bar
- Recommended hook scores >= 8 on stop-power and truth; first sentence <= 12 words; rhythm hook check has no banned opener.
- The five hooks are genuinely different (not one sentence reworded five times).

## Common failure modes
- Hooks that are true but generic ("भारत का एक अनोखा मंदिर"). Hooks that are specific but false or inflated ("दुनिया का सबसे…" without a source).
- Question hooks the story never answers. Hooks that need on-screen text to make sense (no in-scene text in this engine).
- Spending the hook on context (dates, dynasty names) instead of the strange thing.

## Hand-off to Role 4
The recommended hook text (exact words), its claim ids, the promise it makes (what the viewer now expects), and the planned callback for the ending.
