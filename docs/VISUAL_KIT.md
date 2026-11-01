# Visual upgrade kit (`src/engine/kit/`)

An **opt-in** kit for richer, more detailed Shorts: appealing characters, period costume, crowds, set dressing for an
1857 north-Indian village at night and the 1944 Bombay docks, particle FX, firelight, and night/haze/fire looks.
Nothing in Tunguska or Roopkund imports it, so those renders stay bit-identical (checked with `npm test` and before/after
stills, see the end of this file). All kit code is frame-pure: randomness comes from `hash(i, seed)`, motion from `t = frame / 30`.
There are no random-number or clock calls.

Showcase: composition **`KitShowcase`** (6 scenes, 630 frames) and **`KitCast`** (a 2D character sheet), both in `src/Root.tsx`.
```bash
COMP=KitShowcase GL=angle node scripts/stills.mjs out/kit/s 80,170,270,380,480,570 0.5
COMP=KitCast GL=angle node scripts/stills.mjs out/kit/cast 40 0.5
```
Stills: `out/kit/s0080.jpg` village night + crowd + fire + fireflies, `s0170.jpg` chowkidar running with chapatis and a torch,
`s0270.jpg` British officer reacting to a chapati, `s0380.jpg` Bombay dock (ship, cranes, crowd), `s0480.jpg` firefighters
with hoses, smoke and fire, `s0570.jpg` gold bars falling with glints, `cast0040.jpg` every archetype, gesture and view.

## Modules
| File | What |
|---|---|
| `core.ts` | `hash`, `rngK`, `noise1`/`fbm1` (seeded smooth noise), `PAL` palette (sea-green/teal/cream/sunflower + fire; no purple), `SKINS`, colour helpers, `KPen` (canvas pen with the kit ink `#10222B`: `poly`, `ell`, `band`, `taper`, `glow`, `pattern` stripes/checks/pinstripe/dots/buti), `trim` (embroidered border), `tube` (limb outlines). |
| `face.ts` | `drawFace` (eyes with whites, irises and catch-lights, acting brows, nose, mouths, blush, age lines). Expressions `Expr`: neutral, smile, happy, laugh, surprised, scared, worried, stern, angry, determined, sad, shout, awe, sly. Schedules: `blinkAt(t, seed)` (seeded blinks, some doubled), `talkAt(t, talk, seed)` (mouth flap from speaking intervals `[[t0, t1], ...]`), `gazeAt` (saccades). |
| `people.ts` | `drawPerson(pen, person, pose)` on the same 600 x 1000 card as `toon.ts` (soles at y 975), so it also works with the films' `Pool`/`Actor`. Returns `Anchors` (lantern/torch flames, nozzle tip, head, hands, in card units). Also `drawChapati`, `goldBar`, `flame`, `star`. |
| `wardrobe.ts` | Seeded people: `villager`, `villageWoman`, `elder`, `child`, `chowkidar`, `britishOfficer(seed, scarlet)`, `firefighter`, `dockWorker`, `citizen1944`, `cityWoman`, plus `make(archetype, seed)`. |
| `crowd.ts` | `makeCrowd({ n, centre, size, seed, mix, gestures, exprs, props, focus, talkers })`, `crowdCards(crowd, t, camPos)`, `personCard(...)`, `personAnchors(...)` (world positions of flames / nozzle / hands for glow cards and jets). |
| `village.ts` | Canvas props: `hut`, `peepal`, `well`, `charpai`, `chulha`, `tandoor`, `lanternPost`, `bullockCart`, `haystack`, `pots`, `treeline`, `farVillage`, `villageGround` (ground paint). Design size + base line in each doc comment. |
| `dock.ts` | `ship` (riveted cargo steamer), `crane`, `cargo` (crates / bales / drums), `bollard`, `colonial` (arcaded stone building, lit windows at night), `clockTower` (hands at 4:06), `godown`, `gasLamp`, `skyline`, `quayGround`. |
| `fx.ts` | Particle emitters (closed-form, no simulation): `embers`, `sparks`, `dust`, `fireflies`, `smoke` (toon puffs, fire-lit undersides), `goldRain` (tumbling bars, glints, land and stop), `debris`, `waterJet` (stream + spray, `stopZ`), `shaft` (light shafts), `fireCard`, `glowCard`, `moonCard`, `blastCard`. |
| `stage.ts` | `KitStage`: a three.js card stage. Cards cached by key, resolution picked from on-screen size, lit by `ambient + every fire's flickering light / distance` (`flicker(t, seed)`), warm rim baked on the fire side (`rim: true`), gradient sky, stars, painted ground planes, a rippling water plane, mirrored wobbling reflections (`reflect: true`). Everything on the NOINK layer. |
| `looks.ts` | Lighting presets `NIGHT(fires)`, `BOMBAY_DAY()`, `DOCK_FIRE(fires)`; grades `GRADE_NIGHT`, `GRADE_HAZE`, `GRADE_FIRE` (pass to `GradeEffect.set`). |
| `captions.tsx` | Burned-in Hindi captions (Remotion overlay, opt-in): `<Captions words text place pops />` from `words.json`; `phrasesOf`, `useKitFont` / `loadKitFont` (Baloo 2), `KIT_FONT` (also for canvas text such as map labels). |

## Captions (`captions.tsx`)
Burned-in Hindi captions, rendered by the browser (correct Devanagari shaping), font Baloo 2 from Google Fonts (system Devanagari
fonts as fallback; `useKitFont()` holds the frame with `delayRender` until the font is ready, so render with network access).
```tsx
import { Captions, useKitFont, type Word } from "../../engine/kit/captions";
import words from "../../../stories/<slug>/hi/words.json";
const ready = useKitFont();   // gate canvas text (map labels) and the overlay on this
{ready && <Captions words={words as Word[]} text={narrationText} place={(f) => (shotAt(f).id === 3 ? "middle" : "bottom")}
  pops={[{ f: 189, text: "1857", dur: 75, place: "top" }]} />}
```
- Phrases of 3-5 words split at the narration's punctuation (`text`, same tokens as `words.json`) and at pauses; the current word is
  sunflower `#F6B924` on cream `#FFF4DC`, thick ink `#10222B` outline, small pop-in. `offset` shifts the timeline (e.g. an intro card).
- Safe zone: `bottom` sits above the bottom 25 % (Shorts buttons), `top` below the top 12 %, `middle` at 40 %; `hide` per frame.
  Choose per shot so captions never cover faces or the story's key object.
- `pops`: keyword pills ("1857", "मथुरा", "4 → 16 → 64", "मेरठ · 10 मई 1857") at a frame for `dur` frames.
- Opt-in: only films that render `<Captions>` change (Tunguska/Roopkund untouched; `npm test` IDENTICAL). First user: `src/videos/chapati-1857/Chapati.tsx`
  (input prop `{"captions": false}` turns them off).

## Characters
```ts
import { drawPerson } from "../../engine/kit/people";
import { chowkidar } from "../../engine/kit/wardrobe";
const P = chowkidar(7);
drawPerson(pen, P, {
  t,                                   // seconds: idle life (breathing, weight shift, head turns), blinks, talk
  view: "front", turn: 0.3,            // front/three-quarter (-0.6..0.6), or view: "side" (profile, facing right; mirror the card for left)
  gait: "run", phase: (t * 1.5) % 1,   // "stand" | "walk" | "run" (side view = full cycle; front = stepping)
  arms: ["hold", "carry"],             // [screen-left, screen-right] (side view: [far, near])
  hold: ["torch", "chapatis"],
  expr: "determined", talk: [[1.2, 2.4]], look: "idle", headTilt: -3,
});
```
- **Gestures**: hang, hips, wave, beckon, point, raise, reach, carry, hold, fold (arms crossed), cover (hand on chest), cup (hand raised beside the face), shield (hand on head), hose (both hands on a hose; draws the hose), swing (walking).
- **Props**: chapati, chapatis (cloth-wrapped stack), lantern, torch, lathi, gold, nozzle, bucket, letter, bundle, pot, whistle_up.
- **Costume** (`Look`): tops kurta, kurta_short, angrakha, vest, banian, shirt, blouse, officer_coat, fire_coat, jacket. Bottoms dhoti, pyjama,
  trousers, lungi, sari, ghagra, shorts. Hats pagri, pagri_tall, headcloth, gandhi, sola, fire_helmet, veil, cap, forage. Hair short, parted,
  bun, braid, bald, curly. Facial hair moustache, handlebar, beard, chops, stubble. Patterns on tops/bottoms/hats, `trimCol`/`borderCol`
  embroidered borders, `shawl` + `shawlTrim`, `vestCol` (sadri), `sash`. Extras: crossbelts, sash, epaulettes, medal, chapras (watchman's brass badge),
  bangles, bindi, nosering, earrings, belt, axe_belt, janeu, rolled_sleeves, gloves.
- **Bodies**: `build` man/woman/boy/girl, `height`, `girth`, `skin` (`SKINS`, 7 natural tones), `hairCol`, `age` (0..1, grey + lines).
- Respectful depiction: everyday period clothing, natural skin tones, no exaggerated features for any community.

## Scenes with the stage
See `src/videos/kitshowcase/scenes.ts` (each scene: camera, lighting, grade, cards) and `KitShowcase.tsx` (the post chain, same order as
the films: InkPass -> Bloom -> Neutral tone map -> Grade; no lens blur, no grain). Minimal pattern:
```ts
const stage = useMemo(() => new KitStage(), []);
stage.hideGrounds();
stage.ground("village", [90, 90], [0, 0, -20], () => paintTex(2048, 2048, (g) => villageGround(g, 3)), [0.5, 0.58, 0.64]);
const fires = [{ pos: [0, 0.7, -1], col: "#ff9a3c", power: 0.85, radius: 3, seed: 1 }];
const cards = [
  { key: "hut", draw: (p) => hut(p, 1, 1), dw: 1000, dh: 820, w: 6, pos: [-3, -0.15, -8], face: "fixed" },  // pos y = -(dh-base)/dh*h
  fireCard("bon", t, [0, 0, -1], 1.5), ...embers(t, [0, 0.8, -1]), ...fireflies(t, [3, 1, -6], [6, 4, 6]),
  ...crowdCards(crowd, t, cam.pos),
];
stage.frame(cards, NIGHT(fires), camera, t, gl.domElement.height, scene);
```
The `standee()` helper in `scenes.ts` places a prop by its drawn base line. Parallax depth = real z positions (tree-line /
skyline far back, fog fades them). Glows for held lanterns/torches come from `personAnchors(...)`.

Using kit people inside a Roopkund-style world instead: return `{ key, draw: (p) => drawPerson(new KPen(p.g), P, pose), ... }` from
`stage()` in cast.ts; the 600 x 1000 card and sole line match `toon.ts`.

## Cost
Stills at half size: about 0.5-1.2 s per frame. Static props are drawn once (cached by key). People near the camera redraw every frame;
people farther than `still` metres (crowdCards) freeze their idle and reuse the cached card.

## Limits
- Front/three-quarter and profile only (no back views); put crowds facing the camera.
- Walk/run cycles are side view; the front view "walk" is a stepping bob.
- Lighting is per card (one colour per card + a baked rim), not per pixel.
- Water reflections mirror cards about y = 0 (quay and water share y = 0).

## Identity proof (this change)
`npm test`: ALL TESTS PASSED, timeline IDENTICAL. Half-scale stills of TunguskaShort (frames 0, 300, 700, 1200, 1700) and
RoopkundShort (0, 600, 1200, 1700, 2100), rendered before and after: all 10 JPEGs have byte-identical MD5s.
