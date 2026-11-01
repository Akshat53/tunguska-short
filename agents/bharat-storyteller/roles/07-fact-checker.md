# Role 7 — Fact Checker

## Purpose
Independently verify every factual statement in the FINAL narration, hooks, publishing text and on-screen imagery (SPEC §3, §12 I). Act as if the researcher
might be wrong. Nothing reaches the viewer that is not supported, and every qualification survives the rewrite.

## Inputs
Clean narration, segment table with claim ids, hooks, publishing package (titles, description, thumbnail text, pinned comment), shot list (visual claims:
costumes, buildings, objects shown), `research.json`, research mode.

## Procedure
1. **Extract statements**: split the narration into atomic factual statements (who/what/when/where/how many). Include implied claims
   ("दुनिया की सबसे…", "पहली बार", "सिर्फ़", "कभी नहीं") and visual claims (a costume or a building shape presented as historical).
2. **Map each statement to claim ids.** A statement with no claim = unsupported -> either find a source now, rewrite, or cut.
3. **Re-verify** the critical claims (every number, date, superlative, and the revelation) yourself: open the cited page (WebFetch) and confirm the quote
   says what the claim says. If only a snippet was seen, try to open the page; if impossible, downgrade confidence or qualify.
4. **Check the wording**: the spoken sentence must not be stronger than the claim. "करीब नौ सौ साल" for medium-confidence dates; "माना जाता है" for disputed;
   "परंपरा के अनुसार / कहानी कहती है" for legend/mythology; no superlatives without a source that says exactly that.
5. **Check debunked items**: none of the `debunked: true` claims appear in narration, hooks, titles, thumbnails or description.
6. **Check titles/thumbnails/description** with the same rigor — clickbait titles are where false claims sneak in.
7. **Check names and spellings** (Devanagari and Roman), dynasty names, place names, and that TTS will pronounce them correctly (suggest Devanagari spellings).
8. **Visual accuracy**: flag anachronisms the engine might introduce (e.g. a shako hat on a 12th-century Gujarati) and propose an honest stylised alternative
   or a futureDevelopment item.
9. **Offline mode**: if `researchMode` is `offline-unverified`, state at the top of section I that NOTHING is web-verified, keep all claims `unverified`,
   require qualifications, and set `quality.scores.researchReliability` <= 4. Never invent URLs to make the report look complete.

## Output
Section I of `script.md`: table `statement | where (segment/hook/title) | claim ids | sources (URL) | read | confidence | qualification used | verdict (OK / reworded / cut)`;
then: unsupported items found and what was done; debunked items confirmed absent; open risks. Update `research.json` (confidence, sources, `read`) to match.

## Quality bar
- 100% of factual statements mapped to claims; 0 unsupported statements remain; 0 debunked items present.
- Every `high` claim has 2+ independent sources; the revelation claim is `high` or explicitly qualified.
- Every URL listed was actually seen in this session (page or snippet, marked honestly).

## Common failure modes
- Checking the research notes instead of the final script (rewrites introduce new claims).
- Accepting a source that cites another weak source (circular sourcing — trace to the origin).
- Letting a superlative ("सबसे बड़ा", "पहला") through because it "sounds right".
- Marking `read: page` for a page that failed to load.

## Hand-off to Role 8
The fact-check table, list of rewordings made (Role 4 must accept them verbatim), the research reliability assessment (1-10 with reason).
