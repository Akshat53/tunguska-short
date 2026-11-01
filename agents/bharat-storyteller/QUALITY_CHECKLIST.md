# Senior-editor quality checklist (SPEC §11)

Use on every draft. Each item: **check** -> **pass criterion** -> **how to verify**. Any FAIL in a "blocking" item means verdict `revise`.
Record evidence (quote the line / cite the second) next to each item in section K.

## 1. Hook (blocking)
- [ ] First sentence <= 12 words and lands within ~3 s. — `rhythm.py` hook line shows first-sentence words and the first 3 s of text.
- [ ] No banned opener (आज हम जानेंगे, नमस्कार, दोस्तों, इस वीडियो में, क्या आप जानते हैं, did you know…). — rhythm hard failure = FAIL.
- [ ] Opens inside the story with something specific (image, number, contradiction, moment) and does not reveal the answer.
- [ ] Every fact in it maps to a usable claim id. — `hooks.options[].claimIds`.
- [ ] Five hooks used >= 4 different techniques; the recommended one has a written reason.

## 2. Angle originality
- [ ] The angle is one sentence that makes a listener ask "really? how?" — not "the history of X".
- [ ] >= 5 angles were scored; the winner's factual reliability >= 6.
- [ ] Structure differs from the previous example video (or the reason is stated).

## 3. Story builds (blocking)
- [ ] New information at least every ~5 s (no beat only restates).
- [ ] Revelation sits at 40-75 % of the runtime. — `rhythm.py` peak second vs duration, beat map.
- [ ] Stakes or surprise escalate from context to revelation.
- [ ] Every question raised is answered (`rhythm.py` UNANSWERED_QUESTION = 0, confirmed by reading).

## 4. Conversational language
- [ ] Reads like a person talking: no bookish Hindi (`FORMAL` findings fixed or justified), no literal translation, consistent आप/तुम.
- [ ] Hinglish balance: Roman share <= 45 % (Hinglish) / <= 15 % (Hindi); English words are ones people actually use.
- [ ] Names spelled correctly in Devanagari; TTS-risky words rewritten.

## 5. Rhythm (blocking)
- [ ] `rhythm.py` verdict PASS, or REVISE with 0 HIGH findings and each MEDIUM justified.
- [ ] Sentence length CV 0.35-0.9; no MONOTONE_RUN; no run of 3+ identical openers; <= 1 ellipsis; '!' on at most one line.
- [ ] Longest stretch without a pause <= 14 s; no pause > 1.2 s unless a visual carries it.
- [ ] Rate <= 3.4 words/s (hard) and duration within ±10 % of target, 30-75 s (hard).

## 6. Boring parts
- [ ] Watched in your head at 1x, no stretch > 8 s without a new image or a new piece of information.
- [ ] Context beat (3-10 s) contains a new promise or tension, not just background.

## 7. Unnecessary sentences
- [ ] Each sentence adds information, emotion or curiosity; tried deleting each sentence — if the story still works, it is gone.
- [ ] No fillers (बहुत ही, वैसे तो, basically…), no announcing ("आपको जानकर हैरानी होगी").

## 8. Facts supported (blocking)
- [ ] Fact-check table covers 100 % of factual statements, including titles, thumbnail text and description.
- [ ] 0 unsupported statements; 0 debunked claims used; mythology/legend framed as tradition with the qualification spoken.
- [ ] Every URL was seen this session; `read` is honest; `high` claims have 2+ independent sources.
- [ ] Offline mode -> stated in A and I, researchReliability <= 4.

## 9. Revelation satisfying
- [ ] The answer is earned (set up earlier) and is more interesting than the viewer's guess.
- [ ] It is said simply, in one or two sentences, with a beat (pause/cut/flash) around it.

## 10. Visuals varied
- [ ] >= 5 different camera presets, no identical preset back to back without reason; size changes (wide/close) between consecutive shots.
- [ ] Every shot has an emotional intention and a visual importance; reveal shot is `hero`.
- [ ] No in-scene text; respectful depiction of the sacred and of victims.

## 11. Ending memorable
- [ ] Ends on a callback, reframe, or concrete image — not a summary, not "like/subscribe".
- [ ] The last line is short and sayable; the takeaway is felt, not explained.

## 12. Producible with the engine (blocking)
- [ ] `node tools/validate.mjs script.json --narration-file narration.txt` exits 0.
- [ ] Only ENGINE_CAPABILITIES features; everything else listed in `futureDevelopment` with a workaround.
- [ ] Build cost stated: number of new scenes (<= 4), new hats/props/animals, new effect drawings; DOF not relied upon.

## Scoring (section K, 1-10, honest)
hook · originality · researchReliability · rhythm · hinglishNaturalness · emotion · retention · visualStorytelling · pacing · productionFeasibility · ending.
`pass` requires every score >= 7, all blocking items checked, no unresolved high weakness. Mean >= 9.5 is almost certainly inflation — re-check.
