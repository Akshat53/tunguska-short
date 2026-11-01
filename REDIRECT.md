REDIRECT (owner decision — supersedes BRIEF.md deliverable order; the BRIEF's gates and quality rules still apply):

Measured render speed is ~7 s/frame at scale 1 on this 4-core box (~4 h for 2078 frames). The owner wants a
watchable video FAST. Do exactly this order:

1. If any old full-res render is still running, stop it (that work is abandoned).
2. FIRST deliver a complete DRAFT: render ALL 2078 frames at scale 0.5 (540x960), keep the ink/toon look,
   post chain may be light (bloom/grade off is acceptable for the draft). Single sequential render pass.
3. Mux with the final audio mix (voice + music + SFX, loudness ~-14 LUFS) ->
   /home/ubuntu/projects/tunguska-short/output/tunguska-draft-540x960.mp4
4. Verify with ffprobe (duration 65-72 s, audio stream present), then print EXACTLY:
   DRAFT: <path> <duration>s <loudness> LUFS
5. THEN resume the master: scale-1 render -> output/tunguska-1080x1920.mp4, continue the BRIEF deliverables
   (cover.jpg, preview.gif, SEND.md, CHECKS.md with all measured gates).
6. SKIP the 2160x3840 render (would take ~16 h on this box). Note the skip in CHECKS.md. (Overnight 4K is a
   separate decision the owner will make later.)

Between every render step: delete remotion-webpack-bundle-* from TEMP and check `df -h /` (keep >20 G free).
Keep the finish protocol from BRIEF.md (STAGE: done marker block) — plus the DRAFT marker from step 4 as soon
as the draft exists (do not wait until the end for it).
