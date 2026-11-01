# जंग ने बचाया: दिल्ली का लौह स्तंभ — script package

## A. Overview
| field | value |
|---|---|
| topic | The Iron Pillar of Delhi (Mehrauli, c. 4th-5th c. CE, Chandra inscription) |
| category | engineering-architecture |
| title | जंग ने बचाया: दिल्ली का लौह स्तंभ |
| angle | the 'rustless' pillar does rust - and a thin phosphorus-made rust layer is exactly what protects it |
| structure | unexpected-science (myth stated in the hook, overturned at ~27 s = 42% of runtime) |
| central question | how has open-air iron survived about 1,600 years if it is not magic? |
| audience | Indian Shorts viewers 16-35, curious, not specialists |
| language / voice | Hinglish (in practice simple spoken Hindi, 0% Roman) / edge-tts hi-IN-MadhurNeural +10% |
| duration | target 62 s; estimated 64.9 s video (64.14 s speech incl. pauses, 172 words at 2.86 w/s) |
| core emotion | awe, then the pleasure of a clean explanation |
| takeaway | sometimes what looks like damage is the protection |
| tone | awed, curious |
| research mode | web-verified (two primary papers read in full) |
| variety note | first script in `examples/` (no earlier package to differ from); uses unexpected-science + reframe ending, awed/curious tone |

### Angle table (Role 2)
| # | angle | structure | cur | orig | emo | vis | rel | aud | narr | total | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | "Rustless" pillar does rust — the rust is its armour | unexpected-science | 9 | 8 | 7 | 7 | 9 | 9 | 9 | 58 | **winner** |
| 2 | The cannonball that couldn't break it | mystery-reveal | 8 | 7 | 6 | 9 | 6 | 7 | 6 | 49 | shooter unknowable; thin payoff |
| 3 | Hands kept it shiny — the 1997 fence and the brown band | discovery | 7 | 9 | 7 | 6 | 7 | 7 | 6 | 49 | used as the ending proof |
| 4 | The travelling pillar (who moved it to Delhi?) | mystery-reveal | 7 | 7 | 5 | 6 | 4 | 6 | 5 | 40 | reliability < 6: cannot win |
| 5 | Six tonnes forged by hand, 1,600 years ago | impossible-engineering | 6 | 4 | 6 | 7 | 8 | 7 | 5 | 43 | used as escalation |
| 6 | Ancient smelting vs modern blast furnace | ancient-to-modern | 6 | 6 | 4 | 5 | 8 | 6 | 5 | 40 | used as the payoff beat |

**Chosen:** angle 1. Central question: how has open-air iron survived ~1,600 years if it is not magic? Answer: it rusts; a thin phosphorus-made layer
became its shield. Takeaway: what looks like damage can be the protection. Emotion: awe -> satisfaction. Structure differs from the other topic templates'
suggested myth-vs-evidence by making the science the reveal and keeping the myth to one line.

### Beat map
| beat | sec | purpose | claims | new info | loop | image |
|---|---|---|---|---|---|---|
| hook | 0-8.5 | state the belief; place | C02 C12 C01 | "never rusts" (as belief) | opens L1: how? | lone pillar, Qutb Minar |
| context | 8.8-14.3 | who made it | C03 C04 | king Chandra / Chandragupta II | — | inscription band |
| escalation | 14.5-24.3 | toughness: forged by hand, survived a cannon | C06 C07 C08 C09 | six tonnes, cannon dent | raises L1 stakes | forge; cannon flash |
| revelation | 24.6-29.3 | "magic?" -> "no, it rusts" | C14 | it rusts | turns L1 | flash cut to macro |
| explanation | 29.6-42.7 | the layer | C14-C17 | fast first rust; phosphorus layer; wet/dry | closes L1; opens L2: where is P from? | macro film |
| payoff | 43-49.7 | origin of phosphorus | C16 C18 | no lime in old furnaces | closes L2 | forge again |
| ending | 50-64.6 | proof you could see + reframe | C19-C21 C15 | embrace, fence, band turns brown | callback to hook | band dims; golden wide |

**Loops:** L1 opened 0-4 s, turned at 27 s, closed 42 s. L2 opened 43 s, closed 49 s. All closed.
**Cut list:** Vishnu dhvaja / Vishnupada (C05: length), relocation story (C24: disputed), film thickness and P % (C22, C23: numbers vary),
"as deep as tall" myth (C25: second myth would blur the one-myth story), cannon attribution (C10, C11: no record).

## B. Hooks
| id | technique | hook | score | claims | critique |
|---|---|---|---|---|---|
| H1 | mystery | कहते हैं, सोलह सौ साल में इस खंभे को जंग नहीं लगी। | 8 | C02, C12 | States the famous belief as a belief; specific number; opens 'how?' without giving away the twist. Matches the first image (a lone iron pillar). |
| H2 | contradiction | इस खंभे को जंग लगती है, और इसीलिए ये बचा हुआ है। | 6 | C14, C15 | Strong idea but spends the revelation in second one; nothing left for 27 s. |
| H3 | dramatic-situation | किसी ने इस लोहे के खंभे पर तोप का गोला दागा। | 7 | C08, C09 | Great stop-power and image, but the story is about rust, not the cannon: hook-story mismatch. |
| H4 | question | सोलह सौ साल बारिश में खड़ा लोहा, अब तक गला क्यों नहीं? | 7 | C02 | Clear question, but assumes 'never corroded', which the script then has to walk back; slightly leading. |
| H5 | visual-curiosity | इस खंभे पर एक चमकती पट्टी थी, जो एक साल में भूरी पड़ गई। | 5 | C21 | Accurate and unusual, but needs context to make sense; weak for a cold open. |

**Recommended: H1** — Highest stop-power with full truth (framed as 'कहते हैं'), sets up the myth the story overturns at 27 s, and enables the reframe ending 'जंग ने इसे बचाया है'. Rhythm hook check: first sentence 12 words, score 8/10, no banned opener.

## C. Research report (summary of research.md)
- **Facts**: Qutb complex courtyard, Mehrauli (C01); about 1,600 years old (C02); eulogy of king Chandra (C03), generally identified as Chandragupta II (C04);
  roughly six tonnes, forge-welded from lumps (C06, C07); cannonball dent ~4 m up, no fracture, no record of the shooter (C08, C09).
- **Science**: corrosion fast at first (C14); thin compact film of misawite (delta-FeOOH) and crystalline iron hydrogen phosphate hydrate next to the metal,
  catalysed by phosphorus (C15); high phosphorus vs modern iron (C16); wet/dry cycles help (C17); phosphorus stayed because no lime was used (C18).
- **People**: back-to-pillar embrace for luck (C19); ASI cage 1997 (C20); the polished band went dark brown about a year later (C21).
- **Disputed**: Chandra's identity (qualified), original location/mover (not used), cannon shooter (not named), numeric P % and thickness (not used).
- **Debunked (NOT USED)**: "never rusts" (C13), "buried as deep as it is tall" (C25).
- **Key sources (all opened this session)**: Balasubramaniam, Corrosion Science 42 (2000) http://home.iitk.ac.in/~bala/journalpaper/journal/journalpaper_17.pdf ;
  Balasubramaniam, Prabhakar & Shankar, IJHS 44.1 (2009) https://insa.nic.in/writereaddata/UpLoadedFiles/IJHS/Vol44_1_3_RBalasubramaniam.pdf ;
  Down To Earth (2002) https://www.downtoearth.org.in/environment/iron-mask-15049 ; Live History India https://livehistoryindia.com/story/monuments/iron-pillar ;
  Onmanorama (2024) https://onmanorama.com/travel/outside-kerala/2024/03/15/iron-pillar-qutub-minar-no-rust-delhi.html ;
  The Indian Analyst (Fleet CII III) https://whatisindia.com/inscriptions/earlyguptakings/theguptainscriptions56.html ; Wikipedia (map to sources).
- **Confidence**: 27 claims — 15 high (2 of them the debunked myths C13, C25), 6 medium, 6 low (all NOT USED), 0 unverified; 19 usable; every claim used in narration is high or medium.

## D. Narration (marked) with delivery
| seg | beat | sec | text (marked) | emotion | speed | emphasis | pause after | intensity | claims |
|---|---|---|---|---|---|---|---|---|---|
| N01 | hook | 0.2-8.54 | कहते हैं, सोलह सौ साल में इस खंभे को *जंग* नहीं लगी। [pause 0.3] ये लोहे का खंभा क़ुतुब मीनार के आँगन में खड़ा है। | curious | 1.0 | जंग | 0.25 | 5 | C01, C02, C12 |
| N02 | context | 8.79-14.24 | इस पर राजा चंद्र की तारीफ़ खुदी है। [pause 0.2] माना जाता है, ये *चंद्रगुप्त द्वितीय* थे। | warm | 1.0 | चंद्रगुप्त द्वितीय | 0.25 | 4 | C03, C04 |
| N03 | escalation | 14.49-24.23 | करीब छह टन लोहा, जिसे लोहारों ने गरम टुकड़े पीट-पीटकर *जोड़कर* बनाया। [pause 0.3] फिर किसी ने इस पर तोप का गोला दागा। गड्ढा पड़ा, पर खंभा नहीं टूटा। | tense | 1.0 | जोड़कर | 0.25 | 7 | C06, C07, C08, C09 |
| N04 | revelation | 24.48-29.17 | तो क्या ये जादुई लोहा है? [pause 0.5] नहीं। जंग इसे भी *लगती* है। | awed | 1.0 | लगती | 0.25 | 9 | C14 |
| N05 | explanation | 29.42-42.51 | शुरू में तो तेज़ी से लगी। [pause 0.2] लेकिन इस लोहे में फ़ॉस्फ़रस ज़्यादा था, जिसकी वजह से सतह पर पतली, कसी हुई *परत* बनी। बारिश और धूप ने उसे और पक्का किया। [pause 0.3] वही परत इसकी ढाल है। | curious | 1.0 | परत | 0.25 | 7 | C14, C15, C16, C17 |
| N06 | payoff | 42.76-49.4 | फ़ॉस्फ़रस आया कहाँ से? पुराने लोहार भट्टी में चूना नहीं डालते थे, तो वो लोहे में ही *रह* गया। | warm | 1.0 | रह | 0.25 | 6 | C16, C18 |
| N07 | ending | 49.65-64.34 | लोग किस्मत के लिए इसे बाँहों में भरते थे, इसलिए वो हिस्सा चमकता था। [pause 0.3] फिर जाली लग गई। और करीब साल भर में, वो *चमक* भी भूरी पड़ गई। [pause 0.4] ये खंभा जंग से बचा नहीं। जंग ने इसे बचाया है। | reflective | 1.0 | चमक | 0.0 | 6 | C19, C20, C21, C15 |

Delivery notes: **N01** Easy, intimate; small lift on 'कहते हैं' (it is a belief, not a fact). **N02** Warm, informative; 'माना जाता है' clearly audible. **N03** Builds; short beat after 'दागा', then a firm 'पर खंभा नहीं टूटा'. **N04** Ask the question straight, hold the pause, 'नहीं' quiet and certain. **N05** Explain like to a friend; slow slightly on 'पतली, कसी हुई परत'. **N06** Light, almost amused question, then plain answer. **N07** Softer; the last two lines slower, with a pause between them.

Revelation line: N04 "नहीं। जंग इसे भी लगती है।" at 27.1 s (42% of runtime); mechanism lands 31.8-42.9 s.

## E. Clean narration (= narration.txt)
```
कहते हैं, सोलह सौ साल में इस खंभे को जंग नहीं लगी।
ये लोहे का खंभा क़ुतुब मीनार के आँगन में खड़ा है।
इस पर राजा चंद्र की तारीफ़ खुदी है।
माना जाता है, ये चंद्रगुप्त द्वितीय थे।
करीब छह टन लोहा, जिसे लोहारों ने गरम टुकड़े पीट-पीटकर जोड़कर बनाया।
फिर किसी ने इस पर तोप का गोला दागा।
गड्ढा पड़ा, पर खंभा नहीं टूटा।
तो क्या ये जादुई लोहा है?
नहीं।
जंग इसे भी लगती है।
शुरू में तो तेज़ी से लगी।
लेकिन इस लोहे में फ़ॉस्फ़रस ज़्यादा था, जिसकी वजह से सतह पर पतली, कसी हुई परत बनी।
बारिश और धूप ने उसे और पक्का किया।
वही परत इसकी ढाल है।
फ़ॉस्फ़रस आया कहाँ से?
पुराने लोहार भट्टी में चूना नहीं डालते थे, तो वो लोहे में ही रह गया।
लोग किस्मत के लिए इसे बाँहों में भरते थे, इसलिए वो हिस्सा चमकता था।
फिर जाली लग गई।
और करीब साल भर में, वो चमक भी भूरी पड़ गई।
ये खंभा जंग से बचा नहीं।
जंग ने इसे बचाया है।
```

## F. Storyboard
### World
- **scene `qutbCourtyard`** (new, based on none): Qutb complex courtyard: dark iron pillar (tapered cylinder + stacked-cylinder bell capital), stone flagstones, simplified ruined colonnade arches, Qutb Minar silhouette far back; era toggles: polished band (pre-1997), iron grill fence (1997+), cannon dent decal. Components: gradient sky (day/golden); stoneHD ground; cylinders/cones for pillar, capital and Qutb Minar; boxGeo arches with facadeHD stone texture; instanced thin boxes for the grill fence; canvas-painted iron texture with polished band and dent.
- **scene `forge`** (new, based on none): Ancient open-air smithy: clay furnace with warm glow, anvil, iron lumps, charcoal heap, half-made shaft on log rollers. Components: gradient sky (dusk/golden); grass + planks ground; cylinder/cone furnace with brick texture; boxGeo anvil and lumps; smoke wisps.
- **scene `ironMacro`** (new, based on none): Abstract explainer: one giant slice of the pillar surface seen side-on; grey metal body, orange rust bloom, a thin bright film shell whose opacity is keyed to frame. Components: space light teal backdrop; box/cylinder slice with layered lam materials; frame-keyed material colour/opacity (pure function of frame).
- **cast `visitor`** (human, adult, hat hair): present-day Indian visitor, stands for the viewer; outfit {"jacket": "#2a9d8f", "pants": "#efe6d2", "boots": "#5a3b2a", "skin": "#c68a5e", "hair": "#10222B"}. 
- **cast `smith`** (human, stout, hat hair): anonymous ancient ironsmith (no named historical person); outfit {"jacket": "#e9c46a", "pants": "#efe6d2", "boots": "#7a4a2a", "skin": "#a86b45", "moustache": "#10222B", "hair": "#10222B"}. generic craftsman shown with dignity; costume stylised until the Indian costume kit (dhoti) exists
- **subjects**: `pillar` 6 m, `inscription` 2 m, `crater` 4 m, `band` 1.5 m, `visitor` 1.7 m, `smith` 1.6 m, `furnace` 1.2 m, `surface` 2 m
- **build cost**: 3 new sets (courtyard, forge, macro), 0 new hats, 0 new animals, 0 required new effect drawings (inscription strokes and ball card are optional), 1 frame-keyed material helper. Light presets used: day, golden, dusk, space. Camera presets used: 12 of 12 except overShoulder.

### Shots
**Shot 1** | 0.00-4.60 s | frames 0-138 | segs N01
- narration: कहते हैं, सोलह सौ साल में इस खंभे को जंग नहीं लगी।
- environment: `qutbCourtyard` (present), clock none — stone courtyard at morning; the dark iron pillar centred; ruined colonnade arches behind; Qutb Minar tall in the background
- characters: none · actions: none · expressions: none
- camera angle: eye-level · movement: push-in — f0 establishingWide {"subject": "pillar", "fill": 0.3, "push": 0.08, "ease": "smooth"} · target: `pillar`
- lighting: day · foreground: edge of a carved stone column · background: Qutb Minar against a blue gradient sky
- effects: none · transition: open · SFX: amb-breeze, amb-birds
- music: beat `hook`, sparse, duck True · intention: curiosity: an ordinary-looking iron post in a famous place · importance: **hero**

**Shot 2** | 4.60-8.70 s | frames 138-261 | segs N01
- narration: ये लोहे का खंभा क़ुतुब मीनार के आँगन में खड़ा है।
- environment: `qutbCourtyard` (present), clock none — same courtyard; a visitor at the pillar's base looks up
- characters: visitor front/stand/neutral · actions: visitor lookUp@150 · expressions: visitor smile@216
- camera angle: low · movement: push-in — f138 lowAngle {"subject": "pillar", "fill": 0.75, "push": 0.03} · target: `pillar`
- lighting: day · foreground: visitor's shoulder, lower left · background: bell capital of the pillar against the sky
- effects: sparkle@210-246 (glint on the dark iron as 'जंग नहीं लगती' lands) · transition: cut · SFX: none
- music: beat `hook`, sparse, duck True · intention: scale and the myth stated: this iron looks untouched · importance: **key**

**Shot 3** | 8.70-14.40 s | frames 261-432 | segs N02
- narration: इस पर राजा चंद्र की तारीफ़ खुदी है। माना जाता है, ये चंद्रगुप्त द्वितीय थे।
- environment: `qutbCourtyard` (present), clock none — close on the inscription band of the shaft: carved rows rendered as abstract, illegible ink strokes (no readable text)
- characters: none · actions: none · expressions: none
- camera angle: eye-level · movement: push-in — f261 dollyIn {"subject": "inscription", "fillFrom": 0.35, "fillTo": 0.6, "ease": "smooth"} · target: `inscription`
- lighting: golden · foreground: none · background: soft courtyard arches
- effects: none · transition: cut · SFX: none
- music: beat `context`, warm, duck True · intention: respect: a king's praise carved into iron · importance: **support** · future: F02

**Shot 4** | 14.40-18.87 s | frames 432-566 | segs N03
- narration: करीब छह टन लोहा, जिसे लोहारों ने गरम टुकड़े पीट-पीटकर जोड़कर बनाया।
- environment: `forge` (c. 4th-5th century CE), clock none — ancient smithy at dusk: low clay furnace glowing, anvil, a row of iron lumps, smoke wisps; the half-made shaft lies on log rollers
- characters: smith front/stand/stern · actions: smith hammerStrike@450; smith hammerStrike@498 · expressions: smith smile_closed@522
- camera angle: eye-level · movement: static — f432 closeUp {"subject": "smith", "fill": 0.5, "push": 0.03} · target: `smith`
- lighting: dusk · foreground: glowing iron lump on the anvil · background: furnace glow and smoke
- effects: burst@450-458 (spark rays on the strike); kick@450; burst@498-506; kick@498; smoke@432-566 · transition: xfade 12f · SFX: forge-crackle, hammer-1, hammer-2
- music: beat `build`, pulse, duck True · intention: human effort: six tonnes made by hand · importance: **key** · future: F01, F03

**Shot 5** | 18.87-22.03 s | frames 566-661 | segs N03
- narration: फिर किसी ने इस पर तोप का गोला दागा।
- environment: `qutbCourtyard` (18th century (unnamed shooter)), clock none — courtyard, later era; camera looks along an unseen line of fire toward the pillar; a dark ball flies in
- characters: none · actions: none · expressions: none
- camera angle: high · movement: push-in — f566 highAngle {"subject": "pillar", "fill": 0.5, "el": 30, "push": 0.03}; f659 closeUp {"subject": "crater", "fill": 0.4} cut · target: `pillar`
- lighting: day · foreground: none · background: colonnade
- effects: blob@581-659 (cannonball as a dark ink blob on a short arc); flash@659; kick@659; puff@659-661 · transition: cut · SFX: cannon-whoosh, cannon-boom
- music: beat `impact`, hit, duck True · intention: shock: something tried to break it · importance: **hero** · future: F04

**Shot 6** | 22.03-24.37 s | frames 661-731 | segs N03
- narration: गड्ढा पड़ा, पर खंभा नहीं टूटा।
- environment: `qutbCourtyard` (present), clock none — the dent on the shaft about 4 m up, dust settling; then the whole pillar still standing
- characters: none · actions: none · expressions: none
- camera angle: low · movement: crane — f661 crane {"subject": "crater", "fillFrom": 0.6, "fillTo": 0.15, "elFrom": 0, "elTo": 20} · target: `crater`
- lighting: day · foreground: settling dust · background: sky
- effects: dust@661-709 · transition: cut · SFX: crater-rumble
- music: beat `impact`, hit, duck True · intention: defiance: dented, not broken · importance: **key**

**Shot 7** | 24.37-26.97 s | frames 731-809 | segs N04
- narration: तो क्या ये जादुई लोहा है?
- environment: `qutbCourtyard` (present), clock none — visitor close, pillar soft behind
- characters: visitor front/stand/neutral · actions: visitor lookUp@740 · expressions: visitor whistle@758
- camera angle: eye-level · movement: push-in — f731 closeUp {"subject": "visitor", "fill": 0.55, "push": 0.04} · target: `visitor`
- lighting: day · foreground: none · background: the pillar out of frame-centre
- effects: stars@767-809 (tiny wonder stars by the head) · transition: cut · SFX: none
- music: beat `impact`, suspend, duck True · intention: the viewer's own question, asked by a face · importance: **support**

**Shot 8** | 26.97-29.33 s | frames 809-880 | segs N04
- narration: नहीं। जंग इसे भी लगती है।
- environment: `ironMacro` (present), clock none — abstract macro world: a huge slice of the pillar's surface seen side-on; grey metal below, orange-brown rust bloom on top
- characters: none · actions: none · expressions: none
- camera angle: eye-level · movement: push-in — f809 dollyIn {"subject": "surface", "fillFrom": 0.3, "fillTo": 0.55, "ease": "cubic"} · target: `surface`
- lighting: space · foreground: none · background: teal backdrop
- effects: kick@809; blob@827-880 (rust-coloured blobs bloom on the metal) · transition: flash · SFX: reveal-glock
- music: beat `reveal`, reveal, duck True · intention: the twist: it rusts · importance: **hero** · future: F05

**Shot 9** | 29.33-31.63 s | frames 880-949 | segs N05
- narration: शुरू में तो तेज़ी से लगी।
- environment: `ironMacro` (present), clock none — rust blooming fast across the fresh surface
- characters: none · actions: none · expressions: none
- camera angle: high · movement: push-in — f880 highAngle {"subject": "surface", "fill": 0.5, "push": 0.04} · target: `surface`
- lighting: space · foreground: none · background: teal backdrop
- effects: dust@880-949 (rust-orange dust); creak@895-949 · transition: cut · SFX: rust-crackle
- music: beat `reveal`, reveal, duck True · intention: honesty: early corrosion was fast · importance: **support**

**Shot 10** | 31.63-37.57 s | frames 949-1127 | segs N05
- narration: लेकिन इस लोहे में फ़ॉस्फ़रस ज़्यादा था, जिसकी वजह से सतह पर पतली, कसी हुई परत बनी।
- environment: `ironMacro` (present), clock none — a thin bright film spreads as a skin over the metal; tiny glowing specks (phosphorus) at the boundary
- characters: none · actions: none · expressions: none
- camera angle: eye-level · movement: orbit — f949 orbit {"subject": "surface", "fill": 0.5, "az0": -30, "sweep": 60} · target: `surface`
- lighting: space · foreground: none · background: teal backdrop
- effects: sparkle@973-1039 (phosphorus specks); ring@1045-1127 (the thin layer drawn as a glowing outline hugging the metal) · transition: cut · SFX: layer-notes
- music: beat `layer`, bright, duck True · intention: wonder: chemistry building a skin · importance: **hero** · future: F05

**Shot 11** | 37.57-40.67 s | frames 1127-1220 | segs N05
- narration: बारिश और धूप ने उसे और पक्का किया।
- environment: `ironMacro` (present), clock none — a painted cloud passes over the slice, drops splash, then sun rays dry it
- characters: none · actions: none · expressions: none
- camera angle: aerial · movement: aerial-descent — f1127 aerial {"subject": "surface"} · target: `surface`
- lighting: space · foreground: cloud card · background: teal backdrop
- effects: cloud@1127-1175; splash@1142-1172; burst@1178-1220 (sun rays (drying)) · transition: cut · SFX: rain-water
- music: beat `layer`, bright, duck True · intention: the weather helps: wet, dry, stronger · importance: **support**

**Shot 12** | 40.67-42.67 s | frames 1220-1280 | segs N05
- narration: वही परत इसकी ढाल है।
- environment: `ironMacro` (present), clock none — pull back: the thin layer now wraps the whole slice like armour
- characters: none · actions: none · expressions: none
- camera angle: eye-level · movement: pull-out — f1220 dollyOut {"subject": "surface", "fillFrom": 0.6, "fillTo": 0.25} · target: `surface`
- lighting: space · foreground: none · background: teal backdrop
- effects: ring@1220-1280 · transition: cut · SFX: none
- music: beat `layer`, bright, duck True · intention: payoff of the reveal: the shield · importance: **key**

**Shot 13** | 42.67-49.57 s | frames 1280-1487 | segs N06
- narration: फ़ॉस्फ़रस आया कहाँ से? पुराने लोहार भट्टी में चूना नहीं डालते थे, तो वो लोहे में ही रह गया।
- environment: `forge` (c. 4th-5th century CE), clock none — the smithy again in warm light: furnace fed with charcoal only; no lime basket
- characters: smith side/push/neutral · actions: smith push@1289 · expressions: smith smile_closed@1370
- camera angle: profile · movement: tracking — f1280 tracking {"subject": "furnace", "path": [[-3, 1.2, 4], [1, 1.2, 4]]} · target: `furnace`
- lighting: golden · foreground: charcoal heap · background: furnace glow, smoke
- effects: smoke@1280-1487 · transition: xfade 12f · SFX: forge-crackle-2
- music: beat `origin`, warm, duck True · intention: the answer lies with the old smiths · importance: **key** · future: F01, F03

**Shot 14** | 49.57-54.73 s | frames 1487-1642 | segs N07
- narration: लोग किस्मत के लिए इसे बाँहों में भरते थे, इसलिए वो हिस्सा चमकता था।
- environment: `qutbCourtyard` (before 1997), clock none — golden afternoon, before 1997: visitor with back to the pillar, arms reaching around it; a bright polished band at hip height
- characters: visitor side/push/grin · actions: visitor push@1496 · expressions: visitor laugh@1547
- camera angle: eye-level · movement: orbit — f1487 orbit {"subject": ["visitor", "pillar"], "fill": 0.45, "az0": 20, "sweep": 40} · target: `visitor`
- lighting: golden · foreground: none · background: arches in warm light
- effects: sparkle@1559-1642 (shine on the polished band) · transition: xfade 10f · SFX: none
- music: beat `ending`, quiet, duck True · intention: warmth: people loved touching it · importance: **key** · future: F06

**Shot 15** | 54.73-56.13 s | frames 1642-1684 | segs N07
- narration: फिर जाली लग गई।
- environment: `qutbCourtyard` (1997), clock none — the iron grill fence now rings the pillar; visitor stands outside it
- characters: visitor front/stand/neutral · actions: none · expressions: none
- camera angle: high · movement: static — f1642 highAngle {"subject": "pillar", "fill": 0.45, "el": 35} · target: `pillar`
- lighting: day · foreground: fence bars · background: courtyard flagstones
- effects: none · transition: cut · SFX: fence-clink
- music: beat `ending`, quiet, duck True · intention: a small loss · importance: **bridge**

**Shot 16** | 56.13-60.40 s | frames 1684-1812 | segs N07
- narration: और करीब साल भर में, वो चमक भी भूरी पड़ गई।
- environment: `qutbCourtyard` (about a year later), clock none — close on the polished band: its shine dims frame by frame to a dark brown film (material colour keyed to frame)
- characters: none · actions: none · expressions: none
- camera angle: eye-level · movement: push-in — f1684 extremeCloseUp {"subject": "band", "push": 0.03} · target: `band`
- lighting: day · foreground: one fence bar, out of the way · background: none
- effects: sparkle@1684-1720 (last glint, then gone) · transition: cut · SFX: none
- music: beat `ending`, quiet, duck True · intention: proof you can see: the shine becomes the shield · importance: **key** · future: F05

**Shot 17** | 60.40-64.90 s | frames 1812-1947 | segs N07
- narration: ये खंभा जंग से बचा नहीं। जंग ने इसे बचाया है।
- environment: `qutbCourtyard` (present), clock none — echo of shot 1: same framing, now golden; the pillar, fenced, standing
- characters: none · actions: none · expressions: none
- camera angle: aerial · movement: crane — f1812 establishingWide {"subject": "pillar", "fill": 0.3, "push": 0.04}; f1878 crane {"subject": "pillar", "fillFrom": 0.3, "fillTo": 0.12, "elFrom": 12, "elTo": 40} · target: `pillar`
- lighting: golden · foreground: none · background: Qutb Minar, warm sky
- effects: none · transition: cut · SFX: end-glock
- music: beat `ending`, resolve, duck True · intention: reframe: rust saved it · importance: **hero**

### Events
`{"flashAt": 809, "flashes": [[659, 0.8]], "hits": [659, 809], "kicks": [[450, 0.25], [498, 0.25], [659, 1.0], [809, 0.4]]}` — flashAt = reveal cut (shot 8, 'नहीं'); flash + kick + boom on the cannon impact; small kicks on hammer strikes.

### Future development (must exist before rendering: F07, F01 set, F05; others have workarounds)
| id | feature | need | shots | suggestion | workaround now |
|---|---|---|---|---|---|
| F01 | Ancient Indian smith costume (dhoti, bare-chest/angavastram) and forge set | no dhoti/period clothing; no smithy set | 4, 13 | toon.ts costume kit item 1 (dhoti over pants, no jacket); forge set from boxGeo/cylinders + brick texture | plain sunflower tunic + cream pants, hat 'hair'; no anachronistic hats |
| F02 | Inscription band texture | carved rows on the shaft without legible text | 3 | canvas-paint 6-8 rows of abstract ink strokes on the pillar texture (no readable script) | plain darker band on the shaft |
| F03 | hammer_hit synth | metal-on-metal strike | 4 | wire sfx_gen.py hammer_hit as a GEN entry in audio/cues.py (one line) | 'crack' generator at gain 0.5 |
| F04 | Cannon / cannonball card | show the projectile | 5 | small ink 'ball' card with a motion trail (newArt) | existing 'blob' card on an eased arc; no cannon or gunners drawn |
| F05 | Frame-keyed surface materials | rust bloom, thin film shell, polished band dimming to brown | 8, 10, 12, 16 | lerp lam material colour/opacity as a pure function of frame in the new world code | static slice with 'blob', 'ring' and 'sparkle' cards over it |
| F06 | Back-to-pillar embrace pose | arms reaching behind around a column | 14 | gesture library item 3: 'embrace-back' front pose with pose 0-1 | side view 'push' with pose 0.35 (hands on the pillar) |
| F07 | Qutb courtyard set incl. Qutb Minar, arches and 1997 fence | core location of the story | 1, 2, 3, 5, 6, 7, 14, 15, 16, 17 | Indian set kit item 5: arches + tapered fluted tower + instanced fence; fence visible by era | none: must be built before rendering |
| F08 | Indian timbre (tanpura-like drone) | warmer Indian colour under hook and ending |  | audio item 9: drone pad via existing instruments | current procedural score chords |

## G. Audio direction
| seg | voice | music | ambient | SFX | intensity |
|---|---|---|---|---|---|
| N01 | curious, 1.0x, emphasis जंग | sparse low drone, single high note | open courtyard breeze, distant birds | — | 5 |
| N02 | warm, 1.0x, emphasis चंद्रगुप्त द्वितीय | warm pad | courtyard breeze | — | 4 |
| N03 | tense, 1.0x, emphasis जोड़कर | pulse enters, rising | forge crackle, then courtyard | forge-crackle, hammer-1, hammer-2, cannon-whoosh, cannon-boom, crater-rumble | 7 |
| N04 | awed, 1.0x, emphasis लगती | stop on 'नहीं', reveal chord | near silence | reveal-glock | 9 |
| N05 | curious, 1.0x, emphasis परत | bright arpeggio, steady | soft rain then dry wind | rust-crackle, layer-notes, rain-water | 7 |
| N06 | warm, 1.0x, emphasis रह | warm, lower | forge crackle | forge-crackle-2 | 6 |
| N07 | reflective, 1.0x, emphasis चमक | quiet, resolve on the last line | courtyard breeze | fence-clink, end-glock | 6 |

**Music beats**

| name | shots | chord | level | mood |
|---|---|---|---|---|
| hook | 1-2 | Dm | 0.5 | sparse, curious |
| context | 3-3 | F | 0.55 | warm |
| build | 4-4 | Gm | 0.65 | pulse |
| impact | 5-7 | A | 0.75 | hit, then suspend |
| reveal | 8-9 | Dm | 0.85 | reveal peak |
| layer | 10-12 | C | 0.75 | bright arpeggio |
| origin | 13-13 | F | 0.6 | warm |
| ending | 14-17 | Bb | 0.5 | quiet, resolving |

**Cues** (existing generators only)

| id | frame | gen | args | span | intent |
|---|---|---|---|---|---|
| amb-breeze | 0 | breeze | {"level": 0.25, "bright": 0.4} | [0, 432] | open-air courtyard |
| amb-birds | 0 | birds | {"density": 0.25} | [0, 261] | morning, a real place |
| forge-crackle | 432 | crackles | {"dur": 4.5, "density": 0.5, "gain": 0.45} |  | furnace fire |
| hammer-1 | 450 | crack | {} |  | hammer on hot iron (kick) |
| hammer-2 | 498 | crack | {} |  | second strike (kick) |
| cannon-whoosh | 581 | whoosh | {"dur": 2.6, "peak": 0.8, "f_lo": 180, "f_hi": 1800} |  | ball in flight |
| cannon-boom | 659 | boom | {"dur": 2.0, "f0": 48, "big": 1} |  | impact (flash + kick) |
| crater-rumble | 661 | rumble | {"dur": 1.8, "gain": 0.35, "lo": 30, "hi": 140, "decay": 1.0} |  | the iron rings and settles |
| reveal-glock | 809 | glock | {"midi": 76, "level": 0.6} |  | the twist lands on 'नहीं' |
| rust-crackle | 880 | crackles | {"dur": 2.3, "density": 0.3, "gain": 0.3} |  | fast early rusting |
| layer-notes | 1045 | notes | {"midi": [72, 76, 79], "level": 0.4, "spacing": 0.15} |  | the layer forms |
| rain-water | 1127 | water | {"close": 0.4} | [1127, 1175] | wetting |
| forge-crackle-2 | 1280 | crackles | {"dur": 6.9, "density": 0.4, "gain": 0.35} |  | back at the furnace |
| fence-clink | 1642 | clicks | {"count": 3, "freq": 2200, "decay": 0.06, "level": 0.35} |  | metal fence closing |
| end-glock | 1883 | glock | {"midi": 72, "level": 0.45} |  | resolve on the last line |

Master: fade in 0.0 s, fade out 0.6 s. Music peaks on the reveal (level 0.85), drops to 0.5 for the ending; engine ducks 4 dB under speech, all shots marked duck. Every flash/kick has a sound (impact boom, reveal glock, hammer cracks).

## H. Retention report
- **Hook (0-4.6 s)**: "कहते हैं, सोलह सौ साल में इस खंभे को जंग नहीं लगी।" — a belief nearly every Indian viewer has heard, stated as a belief; rhythm hook 8/10.
- **Context exit risk (8.7-14.5 s)**: inscription + Chandragupta II carries no tension; mitigated by golden close-up and by the "छह टन" escalation arriving at 14.5 s. Remaining risk (see K).
- **Escalation**: new info every 3-5 s: forge (14.5), cannon (19.0), "नहीं टूटा" (22.1).
- **Peaks**: cannon impact 22.0 s (flash/kick/boom); reveal 27.0 s (flash cut, glock, music peak); ending line 62.4 s.
- **Revelation**: 27.0 s / 64.9 s = 42% ("नहीं। जंग इसे भी लगती है।"); mechanism 31.8-42.9 s.
- **Loops**: L1 (how?) 0 -> 42.9 s, with the 24.5 s "जादुई?" reminder; L2 (phosphorus from where?) 43 -> 49.7 s.
- **Drop-off risks + fixes**: (1) 8.7-14.5 s context -> golden dolly-in, short sentences; (2) 31.8-37.8 s longest sentence (17 words) -> orbit + sparkle + notes cue carry it;
  (3) 49.9-55 s tonal shift to the embrace -> xfade + golden light + laugh expression.
- **Payoff / ending**: the visible proof (band turns brown) then the reframe "ये खंभा जंग से बचा नहीं। जंग ने इसे बचाया है।" — callback to the hook's "जंग नहीं लगी".
- **Rewatch trigger**: the hook line means the opposite on second viewing.
- **Rhythm numbers**: before = 88.1 s, 242 words, 22 sentences, CV 0.65, FAIL (duration), 8 findings (7 MEDIUM, 1 LOW); after = 64.14 s, 172 words,
  21 sentences, CV 0.49, verdict PASS, 0 findings, longest pause-free run 11.0 s, 2 questions both answered.

## I. Fact-check report
| statement | where | claims | key source | read | conf | qualification used | verdict |
|---|---|---|---|---|---|---|---|
| कहते हैं, सोलह सौ साल में इस खंभे को जंग नहीं लगी | N01/hook | C12, C02 | Onmanorama; CS 2000 | page | high | 'कहते हैं' (belief) | OK — belief, refuted at N04 |
| लोहे का खंभा क़ुतुब मीनार के आँगन में | N01 | C01 | IJHS 2009 | page | high | — | OK |
| राजा चंद्र की तारीफ़ खुदी है | N02 | C03 | Indian Analyst (Fleet) | page | high | — | OK |
| माना जाता है, ये चंद्रगुप्त द्वितीय थे | N02 | C04 | Wikipedia; IJHS 2009 | page | medium | 'माना जाता है' | OK |
| करीब छह टन लोहा | N03 | C06 | CS 2000; Wikipedia | page | high | 'करीब' | reworded (was 'छह टन') |
| लोहारों ने गरम टुकड़े पीट-पीटकर जोड़कर बनाया | N03 | C07 | IJHS 2009; CS 2000 | page | medium | — | OK |
| किसी ने इस पर तोप का गोला दागा | N03 | C08, C09 | IJHS 2009 | page | high | 'किसी ने' (no shooter named) | OK |
| गड्ढा पड़ा, पर खंभा नहीं टूटा | N03 | C08 | IJHS 2009 | page | high | — | OK |
| जंग इसे भी लगती है / शुरू में तेज़ी से लगी | N04/N05 | C14 | CS 2000; Wikipedia | page | high | no years stated | OK |
| फ़ॉस्फ़रस ज़्यादा था | N05 | C16 | IJHS 2009; DTE | page | high | no percentage | OK |
| सतह पर पतली, कसी हुई परत बनी … वही ढाल है | N05 | C15 | CS 2000 | page | high | no thickness | OK |
| बारिश और धूप ने उसे और पक्का किया | N05 | C17 | CS 2000 | page | medium | — | OK |
| पुराने लोहार भट्टी में चूना नहीं डालते थे, तो वो लोहे में रह गया | N06 | C18 | LHI; DTE | page | high | — | OK |
| लोग किस्मत के लिए इसे बाँहों में भरते थे, इसलिए वो हिस्सा चमकता था | N07 | C19, C21 | Onmanorama; CS 2000 | page | medium | 'किस्मत के लिए' | OK |
| फिर जाली लग गई | N07 | C20 | CS 2000; Onmanorama | page | high | — | OK |
| करीब साल भर में वो चमक भी भूरी पड़ गई | N07 | C21 | CS 2000 | page | medium | 'करीब' | OK |
| जंग ने इसे बचाया है | N07 | C15 | CS 2000 ('protective rust') | page | high | — | OK |
| titles: 'जंग लगती है, और वही उसे बचाती है'; '1600 साल का लोहा'; 'गला क्यों नहीं?' | J | C14, C15, C02 | CS 2000 | page | high | — | OK |
| thumbnail '1600 साल, फिर भी खड़ा' | J | C02 | CS 2000; IJHS 2009 | page | high | — | OK |
| description: Chandragupta II 'ज़्यादातर इतिहासकार मानते हैं'; shooter not on record | J | C04, C09 | Wikipedia; IJHS 2009 | page | medium/high | qualified | OK |
| visual: forge-welding smith, no dhoti; inscription as illegible strokes; no cannon crew | F | C07 | — | — | — | stylised | OK (no anachronistic hats) |

- Unsupported statements remaining: **0**. Debunked items present: **0** (C13, C25 absent from narration, titles, thumbnails, description, pinned comment).
- NOT USED by owner instruction and confirmed absent: Nadir Shah, Ghulam Qadir 1787, phosphorus %, "1/20 mm", journal citation on screen (citations appear only in the description's Sources line, each verified this session).
- Open risks: C21 rests on one first-hand source; the description cites papers by URL (opened this session) — not shown in-video.
- Research reliability assessment: 8/10 — two primary papers read in full; ASI's own monument page not reached.

## J. Publishing
**Titles**
1. Iron Pillar को जंग लगती है, और वही उसे बचाती है
2. 1600 साल का लोहा: जादू नहीं, केमिस्ट्री
3. क़ुतुब मीनार के पास का खंभा गला क्यों नहीं?
4. 'जंग-रहित' खंभे का असली राज़
5. जंग ने बचाया: दिल्ली का लौह स्तंभ

**Thumbnails**
- pillar low-angle against a blue sky, a thin glowing outline hugging the shaft — text: "जंग = ढाल?"
- split: rust bloom on the left, clean thin layer on the right (macro set) — text: "जादू नहीं"
- golden ending wide with Qutb Minar behind, fenced pillar — text: "1600 साल, फिर भी खड़ा"

**Description**

कहते हैं दिल्ली के लौह स्तंभ (महरौली, क़ुतुब परिसर) को जंग नहीं लगती। असल में लगती है: शुरू में तेज़ी से, फिर फ़ॉस्फ़रस की मदद से बनी एक पतली, कसी परत आगे की जंग को बहुत धीमा कर देती है। स्तंभ पर राजा चंद्र का लेख है, जिन्हें ज़्यादातर इतिहासकार चंद्रगुप्त द्वितीय मानते हैं। तोप का गोला किसने दागा, इसका कोई रिकॉर्ड नहीं है।
Sources: R. Balasubramaniam, Corrosion Science 42 (2000) 2103-2129 (http://home.iitk.ac.in/~bala/journalpaper/journal/journalpaper_17.pdf); Balasubramaniam, Prabhakar & Shankar, Indian Journal of History of Science 44.1 (2009) (https://insa.nic.in/writereaddata/UpLoadedFiles/IJHS/Vol44_1_3_RBalasubramaniam.pdf); Down To Earth, 'Iron mask' (2002) (https://www.downtoearth.org.in/environment/iron-mask-15049); Live History India (https://livehistoryindia.com/story/monuments/iron-pillar).

**Hashtags**: #IronPillar #Delhi #QutubMinar #Science #History #Shorts

**Pinned comment**: 1997 से पहले लोग इस खंभे को पीठ टिकाकर बाँहों में भरते थे। क्या आपने या आपके घर में किसी ने कभी ऐसा किया था?

## K. Quality report
### EDITOR PASS 1 (draft, 242 words)
Read as a viewer: strong idea, but 88 s — far too long; the inscription sentence (23 words) and the embrace sentence (24 words) were breathless; the hook
opened on a place, not on the strange thing. Weakest moments: (1) 8-20 s inscription + Vishnu dhvaja pile-up; (2) 43-56 s phosphate sentence of 23 words;
(3) 67-84 s 16 s without a pause. Fixes: cut 71 words, split the long lines, drop the dhvaja and the "no record" clause, keep "किसी ने".

### EDITOR PASS 2 (171 words)
Hook still began "क़ुतुब मीनार के पास एक लोहे का खंभा खड़ा है" — a location, not a curiosity. Rewrote to open with the belief (12 words). Duration 64.1 s speech.

### 12 questions
1. Hook strong? Yes — the belief most viewers hold, stated as belief (8/10 on the tool); first sentence 12 words.
2. Angle original? Mostly: "it rusts, and that protects it" is known to metallurgists but not to the general audience; the hand-polished band is rarely told.
3. Builds? Yes: belief -> who made it -> how tough -> "magic?" -> "no" -> how -> why -> proof -> reframe.
4. Conversational? Yes; no bookish words flagged; consistent impersonal narration. Not much English (0% Roman).
5. Rhythmic? PASS, CV 0.5, 0 findings; punch lines (नहीं।) mixed with 12-17 word explainers.
6. Boring parts? 8.7-14.5 s context is the weakest (kept short).
7. Unnecessary sentences? Tried removing the cannon pair: escalation collapses and "जादुई?" loses its set-up, so kept.
8. Facts supported? 100% mapped, 0 unsupported, owner cautions honoured.
9. Revelation satisfying? Yes, set up by "जादुई?"; said in five words with a flash.
10. Visuals varied? 11 presets, 4 light presets, 3 sets; reveal shot is hero.
11. Ending memorable? Two-line reframe that flips the hook.
12. Producible? Yes after F07/F01/F05 are built; validator 0 errors 0 warnings.

### Scores
| criterion | score | reason |
|---|---|---|
| hook | 8 | true, specific, widely-held belief; not a 9 because it is a familiar topic |
| originality | 7 | the 'it does rust' twist plus the 1997 band observation are fresh for this audience |
| researchReliability | 8 | two primary papers read in full; owner cautions applied; ASI page not reached |
| rhythm | 8 | PASS, CV 0.5, 0 findings; long explainer sentence carried by visuals |
| hinglishNaturalness | 7 | natural spoken Hindi; almost no English, so less 'Hinglish' than default |
| emotion | 7 | awe + small human warmth at the end; not deeply moving |
| retention | 7 | two loops, peaks at 22/27 s; context beat is a soft spot |
| visualStorytelling | 7 | 3 sets, macro explainer, flash reveal, callback composition |
| pacing | 7 | 17 shots avg 3.8 s; slight crowding at 55-60 s |
| productionFeasibility | 7 | 3 new sets, frame-keyed material, stand-in embrace pose |
| ending | 8 | reframe line flips the hook; short and sayable |

### Weaknesses
- [medium] duration: Estimated 64.1 s speech (~65.6 s with lead/tail) sits at the top of the 45-65 s window; real TTS may run longer - measure with words.json and trim the cannonball pair first if needed.
- [low] language: Roman/English share is 0%: it is simple spoken Hindi rather than Hinglish; fine for TTS but less 'Hinglish' than the default.
- [medium] production: Three new sets (courtyard, forge, macro) and frame-keyed materials must be built; the embrace pose is a stand-in.
- [low] research: The polished-band-to-brown observation (C21) rests on one first-hand source (Balasubramaniam 2000).
- [medium] retention: Context beat 8-14 s (inscription, Chandragupta II) is the most skippable stretch; it carries no tension of its own.

### Verdict: **pass** (rounds: 2; validator exit 0; rhythm PASS)

### Revision log
- round 1: Cut draft from 242 to 171 words (88 s -> 64 s): dropped Vishnu-dhvaja line, cannon 'no record' clause, charcoal detail, long embrace sentence. — hard failure: duration outside 30-75 s
- round 1: Split the fence line into 'फिर जाली लग गई।' + 'और करीब साल भर में, वो चमक भी भूरी पड़ गई।' — REPEATED_STRUCTURE S16-S18 and a 16 s no-pause stretch
- round 1: 'छह टन' -> 'करीब छह टन'; 'एक राजा, चंद्र,' -> 'राजा चंद्र' — fact check: weight estimates vary; density
- round 2: Hook reordered to lead with the belief: 'कहते हैं, सोलह सौ साल में इस खंभे को जंग नहीं लगी।' (12 words) — editor: old first sentence ('a pillar stands near Qutb Minar') had low stop-power; rhythm hook 7/10 -> 8/10
