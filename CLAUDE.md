# CLAUDE.md
**Making a video? Follow `docs/MAKE_A_VIDEO.md`** (setup on a new machine, full pipeline with exact commands, Roopkund as the worked example).
Then read `HANDOFF.md` (state, measured render settings, decisions), then `NEW_STORY.md`.
Rules: never call a video "done" without viewing frames (`scripts/qa.sh`); render with `GL=angle CONC=6`; lens blur stays off;
confirm with the owner before any outward-facing action (upload, push to a channel).

## HARD RULES (owner-confirmed; do not break when upgrading the engine)
1. **No film grain.** The grain code in `lensblur.ts` stays OUT of the post chain: it inflated output size and degraded the video after compression.
2. **Never merge the ink pass with depth-of-field.** Chain order is fixed: InkPass -> LensBlur (pre, main) -> Bloom -> ToneMapping -> Grade. DOF processing overwrites the outlines.
3. **Every animation is a pure function of the frame number** (Remotion renders any frame independently, in parallel workers). No `Math.random`, `Date.now`, `performance.now`, `requestAnimationFrame`, timers or `useFrame`. Randomness = seeded hash of (index, seed). Currently 0 such calls in `src/`; keep it so.
4. Lens blur stays off by default (characters looked soft); no excessive bloom or crushed shadows.
5. Render with `GL=angle CONC=6`; run `npm test` after any change to story/storyboard code; look at frames before calling a video done.
6. Never print, commit or ask for API keys (ElevenLabs key lives only in `.env.local`).
