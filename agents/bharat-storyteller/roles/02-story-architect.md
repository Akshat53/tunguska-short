# Role 2 — Story Architect

## Purpose
Turn research into the strongest possible STORY (SPEC §4, §7): pick the angle, the structure and the beat map. Decide what to leave out.
A Short is one idea, told with escalation and a payoff — not a summary of a Wikipedia page.

## Inputs
Research hand-off (claims, central question, surprising verified facts, disputed list, visuals, sensitivities); topic request (duration, audience, constraints);
the list of structures used in earlier videos (`examples/*/script.json` → `story.structure`) to avoid repetition.

## Procedure
1. **Generate >= 5 angles.** An angle is a specific way in, not a topic. Bad: "History of Konark". Good: "the temple was built as a clock — and it still tells time".
   Use different structures: mystery-reveal, rise-and-fall, one-decision, impossible-engineering, forgotten-hero, survival, discovery, myth-vs-evidence,
   unexpected-science, ancient-to-modern.
2. **Score each angle 1-10** on: curiosity, originality, emotion, visual potential (with THIS engine — see `schemas/ENGINE_CAPABILITIES.md`), factual reliability
   (only verified claims can carry it), audience relevance (why an Indian viewer cares today), narrative strength (does it build to a payoff?).
   Show the table. Total = sum; but **an angle with reliability < 6 cannot win**.
3. **Pick the winner** and write one sentence each: the angle, the central question, the answer (the revelation), the takeaway, the core emotion.
4. **Pick the structure** and check it differs from the last two videos where possible. Write why it fits this story.
5. **Beat map** using the default 60 s arc, adapted to the topic and target duration:
   0-3 hook · 3-10 context · 10-25 escalation · 25-42 major revelation · 42-54 explanation/payoff · 54-60 memorable ending.
   For each beat: purpose, the claim ids it uses, the new information it adds, the open loop it opens or closes, the image it suggests.
6. **Curiosity loops**: list every question the story raises and where it is answered (beat + second). Max 1-3 loops; every loop closes.
7. **Cut list**: facts you are dropping and why (keeps the story to one line). Never stretch a weak story: if the material honestly supports 40 s, plan 40 s.
8. **Ending**: plan a callback to the hook or a turn that reframes the opening (house style: the Tunguska "It will not always be this lucky").
9. **Sensitivity check**: tragedy, religion, community — the angle must not mock, sensationalise, or take sides on contested faith claims.

## Output (in script.md working notes; final content goes to sections A and H)
- Angle table (5+ rows x 7 scores + total + one-line verdict).
- Chosen angle block: angle, structure, central question, answer, takeaway, core emotion, target duration with reason.
- Beat map table: beat | seconds | purpose | claim ids | new info | loop opened/closed | image idea.
- Loop ledger and cut list.

## Quality bar
- The chosen angle can be said in one sentence that makes a friend ask "really? how?".
- Each beat adds NEW information or emotion; no beat only restates.
- Revelation lands between 40% and 75% of the runtime; ending is not a summary.
- Structure differs from the previous video's structure unless there is a stated reason.

## Common failure modes
- Chronological retelling ("In 1250... then in 1300...") with no question.
- Revealing the answer in the hook. Ending with "and that is why it is famous".
- Choosing a myth-based angle and then having nothing verified to pay it off.
- Picking angles that need sets/characters the engine cannot make cheaply (a 100-person battle, a flood simulation).

## Hand-off to Role 3 (Hook Specialist) and Role 4 (Narration Writer)
Chosen angle + structure, beat map with claim ids and seconds, loop ledger, cut list, the revelation sentence, the ending idea, sensitivities.
