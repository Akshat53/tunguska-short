# New story / new language checklist

Per-video cost is the *story code* (world, cast, timeline). The look engine (toon/ink/shade/paint/grade/lensblur/lights)
and the scripts are shared.

## A. New language of an existing story (e.g. Hindi Tunguska)
1. `stories/<slug>/<lang>/narration.txt` (translate; keep one sentence per beat)
2. add the language to `stories/<slug>/story.json` (`voice`, `rate`, `dir: "<lang>"`)
3. `./make.sh <slug> <lang> voice beats` -> voice + word timings + frame table
4. Retime the shot frames in the story's timeline to the printed table (frames are baked in `story.ts`)
5. Audio: copy/adapt the score; `python3 audio/score.py` + `bash audio/finalize.sh` -> `stories/<slug>/<lang>/mix.wav`
6. `SCALE=0.5 ./make.sh <slug> <lang> render mux` (draft), then full `./make.sh <slug> <lang> render mux`

## B. New story
1. Research + `SCRIPT.md` (facts with sources; list debunked claims you did NOT use)
2. Copy `src/videos/tunguska/` -> `src/videos/<slug>/`; rewrite `world.ts`, `cast.ts`, `story.ts`, `Tunguska.tsx`
3. Register a `<Composition>` in `src/Root.tsx`
4. `stories/<slug>/story.json` + narration, then follow A.3-A.6

Hindi voices: `hi-IN-MadhurNeural`, `hi-IN-SwaraNeural`. Hindi narration is Devanagari text; words.json is UTF-8.
