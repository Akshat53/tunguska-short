# बिस्तर से नदी तक: सराईघाट 1671 — script package

## A Overview
| field | value |
|---|---|
| topic | Battle of Saraighat (1671): Lachit Borphukan and the Ahom boats vs the Mughal fleet on the Brahmaputra at Guwahati |
| category | battles-rulers |
| title | बिस्तर से नदी तक: सराईघाट 1671 |
| angle | a sick commander won a river war by choosing where to fight: the one stretch where the Brahmaputra is only about a kilometre wide |
| structure | one-decision (no earlier example scripts in examples/, so no repetition to avoid) |
| central question | how did small Ahom boats beat a bigger, cannon-armed Mughal fleet? |
| audience | Indian Shorts viewers 16-35; most outside Assam know only the name |
| language / voice | Hinglish (Devanagari), hi-IN-MadhurNeural +10% |
| duration | target 62 s; estimated speech 62.9 s at 2.86 wps (rhythm.py, +10%); video 66.3 s = 1989 frames |
| core emotion | defiance turning into quiet pride |
| takeaway | choosing the battlefield can matter more than the size of the army |
| tone | stirring but factual |
| research mode | web-verified (secondary sources; no Buranji read directly) |

### Angles scored (Role 2)
| # | angle | structure | cur | orig | emo | vis | rel | aud | narr | total |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **The river chose the winner: a sick commander fights where the Brahmaputra is ~1 km wide** | one-decision | 8 | 7 | 8 | 8 | 7 | 8 | 8 | **54** |
| 2 | Forgotten hero: the general India's best cadets are named after | forgotten-hero | 7 | 6 | 7 | 5 | 8 | 8 | 6 | 47 |
| 3 | Myth vs evidence: did Lachit behead his uncle? | myth-vs-evidence | 8 | 7 | 6 | 4 | 5 | 7 | 5 | 42 |
| 4 | Rise and fall: Alaboi (10,000 dead) to Saraighat in two years | rise-and-fall | 6 | 6 | 8 | 6 | 7 | 6 | 7 | 46 |
| 5 | Small vs big: boats as the whole story (naval engineering) | impossible-engineering | 6 | 6 | 5 | 8 | 6 | 6 | 6 | 43 |

Winner: 1 (reliability 7). Angle 3 failed the reliability bar (only a negative, one-source finding), so the legend is used as a one-line honest aside instead.

**Beat map.** 0-3.7 hook (C01,C06) · 4-15 context: year, army, commander, Alaboi stakes (C01-C04) · 15.6-27 escalation: big boats, wavering, Lachit goes out (C05-C07) ·
27.5-34 revelation: "his real weapon was the river", ~1 km (C08) · 34-43 explanation + peak: boats trapped, encircled, admiral killed, fleet breaks (C05,C09,C10) ·
43-54 payoff: retreat, death a year later, the uncle legend has no old written evidence (C11-C13) · 54-65 ending: NDA medal, callback to the bed (C15,C07).

**Loop ledger.** L1 "the commander is in bed — how does this battle go?" opened 0 s, answered 22 s (he goes out) and 42 s (fleet breaks), closed in the callback 60 s.
L2 "how do small boats beat cannon boats?" opened implicitly at 15.6 s, closed 30-40 s. L3 "the famous uncle story?" opened 48.8 s, closed 51.6 s.

**Cut list.** Ram Singh / Aurangzeb names in narration (kept in description) — density; troop/boat numbers — conflicting; the exact day — unknown; poppy seeds — unsourced;
the bridge of boats as a separate line — too technical for 60 s (folded into "आगे-पीछे से घेर लिया"); Lachit forbidding pursuit after Alaboi — single source, time.

## B Hooks
| id | technique | hook | score | claims | critique |
|---|---|---|---|---|---|
| H1 | contradiction | फ़ैसले की लड़ाई सिर पर थी, और सेनापति बिस्तर पर। | 8 | C01, C06 | Concrete, true, a visible contradiction (war vs sickbed); pays off in the last line. Slightly abstract on 'which battle'. |
| H2 | question | एक किलोमीटर चौड़ी नदी ने मुग़ल बेड़े को कैसे हराया? | 7 | C08, C01 | Clear loop, but gives away the revelation (the river) in second one. |
| H3 | surprising-fact | एनडीए का बेस्ट कैडेट मेडल, एक बीमार सेनापति के नाम पर है। | 6 | C15, C06 | True and surprising, but spends the ending; weak first image. |
| H4 | dramatic-situation | बड़ी मुग़ल नावें सामने थीं, और अहोम सैनिक पीछे हट रहे थे। | 7 | C05, C06 | Strong action image; 11 words; no hero in it yet. |
| H5 | mystery | लचित ने अपने मामा का सिर काटा था? सबूत कुछ और कहते हैं। | 5 | C13 | Clicky but leads with an unproven gory legend and promises a debunk the sources cannot fully deliver; risky. |

**Recommended: H1** — H1 is the only option that is fully true, visual in the first frame (a commander on a cot), does not spend the revelation, and sets up the closing callback ('जो बिस्तर से उठकर नदी में उतरा था'). rhythm.py hook check: 10 words, contrast, no banned opener (7/10).

## C Research report
Full notes: `research.md`; claims with URLs and quotes: `research.json` (22 claims). Summary:

| id | claim | category | confidence | usable | sources |
|---|---|---|---|---|---|
| C01 | The Battle of Saraighat was a mainly naval battle fought in 1671 (mid-March per Wikipedia; exact day unknown) on the Brahmaputra at Guwahati, and the Ahoms won. | fact | high | yes | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page); [Live History India](https://livehistoryindia.com/story/people/lachit-borphukan) (page); [Kamrup district administration (Govt of Assam)](https://kamrup.assam.gov.in/about-us/battle-alaboi-and-saraighat) (page) |
| C02 | Aurangzeb sent Raja Ram Singh of Amber (Amer) to invade Assam; he was appointed on 19 December 1667 and commanded the Mughal army at Saraighat. | fact | high | yes | [Kamrup district administration (Govt of Assam)](https://kamrup.assam.gov.in/about-us/battle-alaboi-and-saraighat) (page); [Live History India](https://livehistoryindia.com/story/people/lachit-borphukan) (page) |
| C03 | Lachit Borphukan (Barphukan) was the Ahom commander at Saraighat; born 24 November 1622. | fact | high | yes | [Wikipedia](https://en.wikipedia.org/wiki/Lachit_Borphukan) (page); [EastMojo](https://eastmojo.com/assam/2022/11/23/some-facts-you-must-know-about-lachit-borphukan-on-his-400th-birth-anniversary/) (page) |
| C04 | At the Battle of Alaboi (about 5 August 1669) the Ahoms suffered a major defeat; about 10,000 Ahom soldiers were killed. | fact | high | yes | [Kamrup district administration (Govt of Assam)](https://kamrup.assam.gov.in/about-us/battle-alaboi-and-saraighat) (page); [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page) |
| C05 | At Saraighat the Mughals had large boats, some carrying cannons (Wikipedia: up to sixteen), while the Ahoms used smaller boats. | fact | medium | yes | [Kamrup district administration (Govt of Assam)](https://kamrup.assam.gov.in/about-us/battle-alaboi-and-saraighat) (page); [The Sentinel (Assam) editorial](https://sentinelassam.com/editorial/lachit-barphukan-the-man-fort-against-the-mughals-624865) (page); [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page) |
| C06 | Facing the large Mughal boats, Ahom soldiers wavered and began to fall back; Lachit (and the Ahom admiral) were seriously ill, which demoralised the troops. | fact | medium | yes | [The Sentinel (Assam) editorial](https://sentinelassam.com/editorial/lachit-barphukan-the-man-fort-against-the-mughals-624865) (page); [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page) |
| C07 | Though ill, Lachit is said to have risen from his sickbed and taken to the river in a boat himself, and the wavering Ahom boats rallied. | disputed | medium | yes | [Live History India](https://livehistoryindia.com/story/people/lachit-borphukan) (page); [The Sentinel (Assam) editorial](https://sentinelassam.com/editorial/lachit-barphukan-the-man-fort-against-the-mughals-624865) (page); [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page) |
| C08 | The Brahmaputra at Saraighat is at its narrowest about 1 km wide, a stretch suited to naval defence. | fact | medium | yes | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page); [eSamskriti](https://esamskriti.com/a/Assam/LACHIT-BORPHUKAN-Memorial.aspx) (snippet) |
| C09 | The Ahoms used small boats and an improvised bridge of boats to attack the Mughal fleet from the front and the rear at once. | fact | medium | yes | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page); [Kamrup district administration (Govt of Assam)](https://kamrup.assam.gov.in/about-us/battle-alaboi-and-saraighat) (page) |
| C10 | The Mughal admiral Munnawar Khan was killed at Saraighat and the Mughal fleet was thrown into disarray (accounts differ on whether by a gunshot or an arrow). | fact | high | yes | [Live History India](https://livehistoryindia.com/story/people/lachit-borphukan) (page); [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page); [Wikipedia](https://en.wikipedia.org/wiki/Munnawar_Khan) (page) |
| C11 | After Saraighat the Mughals withdrew; they were pursued to the Manas river, the Ahom western boundary, and Ram Singh returned in disgrace. | fact | medium | yes | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page); [Live History India](https://livehistoryindia.com/story/people/lachit-borphukan) (page) |
| C12 | Lachit Borphukan died about a year after Saraighat, in April 1672, at Kaliabor. | fact | high | yes | [Wikipedia](https://en.wikipedia.org/wiki/Lachit_Borphukan) (page); [Live History India](https://livehistoryindia.com/story/people/lachit-borphukan) (page) |
| C13 | There is no historical document for the popular story that Lachit executed his maternal uncle; it survives as tradition (with the saying 'my uncle is not greater than my country'). | disputed | medium | yes | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page); [VIF India](https://vifindia.org/category-articles/21262) (snippet) |
| C14 | Lachit beheaded his maternal uncle for failing to finish a rampart overnight at Amingaon. | legend | low | NOT USED | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page) |
| C15 | Since 1999 the National Defence Academy has awarded a 'Lachit Borphukan Gold Medal' to its best passing-out cadet each course (instituted under Army chief Gen. V.P. Malik). | fact | high | yes | [EastMojo](https://eastmojo.com/assam/2022/11/23/some-facts-you-must-know-about-lachit-borphukan-on-his-400th-birth-anniversary/) (page); [Live History India](https://livehistoryindia.com/story/people/lachit-borphukan) (page); [Assam Tribune](https://assamtribune.com/avinash-ligang-lauded-for-making-ne-proud) (snippet) |
| C16 | Lachit Divas is observed in Assam on 24 November, his birth anniversary. | fact | high | yes | [Wikipedia](https://en.wikipedia.org/wiki/Lachit_Borphukan) (page); [EastMojo](https://eastmojo.com/assam/2022/11/23/some-facts-you-must-know-about-lachit-borphukan-on-his-400th-birth-anniversary/) (page) |
| C17 | Exact Mughal troop and boat numbers at Saraighat (e.g. infobox: 30,000-35,000+ infantry, 18,000 cavalry, 40 ships; viral 'lakhs'). | disputed | low | NOT USED | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page) |
| C18 | Ram Singh sent Lachit a bag of poppy seeds to show his army was as countless as the seeds. | legend | unverified | NOT USED | — |
| C19 | The Mughal commander at Saraighat was Mir Jumla. | fact | low | DEBUNKED | [Kamrup district administration (Govt of Assam)](https://kamrup.assam.gov.in/about-us/battle-alaboi-and-saraighat) (page) |
| C20 | Saraighat was fought in 1672 (Jorhat district administration page). | disputed | low | NOT USED | — |
| C21 | Ahom positions around the narrows included Itakhuli fort (where Lachit lay ill), Kamakhya hills and Aswakranta. | fact | medium | yes | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page); [Live History India](https://livehistoryindia.com/story/people/lachit-borphukan) (page) |
| C22 | Lachit lamented: 'It is a tragedy that my country is facing this dire catastrophe during my Phukanship.' | disputed | low | NOT USED | [Wikipedia](https://en.wikipedia.org/wiki/Battle_of_Saraighat) (page) |

Key dates: Alaboi ~5 Aug 1669; Saraighat (mid-)March 1671; Lachit d. April 1672 (Kaliabor); NDA medal since 1999. Locations: Saraighat narrows at Guwahati
between Kamakhya and Itakhuli; Manas river (Ahom western boundary). Disputed: Lachit's personal boat sortie (said-to), Munnawar Khan's death weapon,
the NDA medal criterion, battle day/year. NOT USED: uncle beheading as fact, poppy seeds, troop/fleet numbers, Mir Jumla (debunked), 1672 date.

## D Narration (marked) and delivery
| seg | beat | sec | text (marked) | emotion | speed | emphasis | pause after | intensity | claims |
|---|---|---|---|---|---|---|---|---|---|
| N01 | hook | 0.2-3.7 | फ़ैसले की लड़ाई सिर पर थी, और सेनापति *बिस्तर* पर। [pause 0.4] | tense | 1.0 | बिस्तर | 0.4 | 6 | C01, C06 |
| N02 | context | 4.1-15.29 | सोलह सौ इकहत्तर, और गुवाहाटी के पास मुग़ल फ़ौज डटी थी। सामने थे अहोम सेनापति, लचित बोरफुकन। दो साल पहले, अलाबोई की हार में, अहोम करीब *दस हज़ार* सैनिक गँवा चुके थे। [pause 0.3] | grave | 1.0 | दस हज़ार | 0.3 | 4 | C01, C02, C03, C04 |
| N03 | escalation | 15.59-27.24 | अब तोपों से लदी बड़ी मुग़ल नावें ब्रह्मपुत्र में बढ़ रही थीं। उन्हें देखकर अहोम सैनिक पीछे हटने लगे। कहते हैं, तब बीमार लचित खुद नाव लेकर आगे निकला, और लौटती नावें फिर मुड़ आईं। [pause 0.3] | urgent | 1.05 | खुद | 0.3 | 7 | C05, C06, C07 |
| N04 | revelation | 27.54-33.8 | पर लचित का असली हथियार *नदी* थी। सराईघाट पर ब्रह्मपुत्र सिकुड़कर करीब *एक किलोमीटर* रह जाती है। [pause 0.3] | awed | 0.95 | नदी, एक किलोमीटर | 0.3 | 8 | C08, C21 |
| N05 | explanation | 34.1-42.76 | इतनी तंग नदी में बड़ी नावें फँस गईं। छोटी अहोम नावों ने उन्हें आगे-पीछे से घेर लिया। मुग़ल एडमिरल मुनव्वर ख़ान मारा गया। बेड़ा *बिखर* गया। [pause 0.4] | tense | 1.05 | बिखर | 0.4 | 9 | C05, C09, C10 |
| N06 | payoff | 43.16-53.99 | मुग़ल फ़ौज पीछे हटी, मानस नदी तक। जीत के करीब एक साल बाद, लचित नहीं रहे। और मामा का सिर काटने वाली मशहूर कहानी? उसका कोई पुराना लिखित सबूत नहीं मिलता। [pause 0.3] | reflective | 1.0 | सबूत | 0.3 | 5 | C11, C12, C13 |
| N07 | ending | 54.29-64.97 | पर आज भी, एनडीए के बेस्ट कैडेट को उसी के नाम का गोल्ड मेडल मिलता है। उस सेनापति के नाम का, जो *बिस्तर* से उठकर नदी में उतरा था। | warm | 0.95 | बिस्तर | 0.0 | 6 | C15, C07 |

Delivery notes: N01: quiet, close to the mic; land on बिस्तर · N02: plain, factual; slight weight on the loss · N03: pick up pace; 'कहते हैं' said naturally, not hedged · N04: slow down; let नदी sit · N05: clipped; peak energy on बिखर · N06: quiet for the death line; a small wry lift on the question · N07: warm, unhurried; last line slower

## E Clean narration (TTS-ready, = narration.txt)
```
फ़ैसले की लड़ाई सिर पर थी, और सेनापति बिस्तर पर।
सोलह सौ इकहत्तर, और गुवाहाटी के पास मुग़ल फ़ौज डटी थी।
सामने थे अहोम सेनापति, लचित बोरफुकन।
दो साल पहले, अलाबोई की हार में, अहोम करीब दस हज़ार सैनिक गँवा चुके थे।
अब तोपों से लदी बड़ी मुग़ल नावें ब्रह्मपुत्र में बढ़ रही थीं।
उन्हें देखकर अहोम सैनिक पीछे हटने लगे।
कहते हैं, तब बीमार लचित खुद नाव लेकर आगे निकला, और लौटती नावें फिर मुड़ आईं।
पर लचित का असली हथियार नदी थी।
सराईघाट पर ब्रह्मपुत्र सिकुड़कर करीब एक किलोमीटर रह जाती है।
इतनी तंग नदी में बड़ी नावें फँस गईं।
छोटी अहोम नावों ने उन्हें आगे-पीछे से घेर लिया।
मुग़ल एडमिरल मुनव्वर ख़ान मारा गया।
बेड़ा बिखर गया।
मुग़ल फ़ौज पीछे हटी, मानस नदी तक।
जीत के करीब एक साल बाद, लचित नहीं रहे।
और मामा का सिर काटने वाली मशहूर कहानी?
उसका कोई पुराना लिखित सबूत नहीं मिलता।
पर आज भी, एनडीए के बेस्ट कैडेट को उसी के नाम का गोल्ड मेडल मिलता है।
उस सेनापति के नाम का, जो बिस्तर से उठकर नदी में उतरा था।
```

## F Storyboard
### World (build cost: 3 new scenes, 5 cards with stand-in hats, boat kit, cot + medal props; 0 new effect drawings)
- **scene `river`** (new): Brahmaputra narrows at Saraighat: wide water ribbon pinched by two low hills (Kamakhya side / Itakhuli fort side), sandbanks, simple boat geometry. Components: gradient sky + painted clouds, ground plane grass/grassHD on banks, waterNear/waterFar river ribbon, boxGeo/cone hills, Batch-instanced boats (new geometry), smoke wisps.
- **scene `fort`** (new): Itakhuli hill gatehouse: earthen rampart, timber-roofed gate opening onto the river, a low cot. Components: boxGeo rampart with stoneHD/brick, planksHD timber roof + posts, cot from boxes + bed texture, river ribbon visible through the opening.
- **scene `parade`** (new): modern parade ground: flat cobble/stone ground, a plain flagpole without a flag, distant building block. Components: ground plane cobbleHD, cylinder pole, facadeHD box building, gradient sky.
- **cast `lachit`** (adult, hat `hair`): Lachit Borphukan, Ahom commander, around 49 in 1671; stylised, no attempt at a portrait. Outfit {"jacket": "#F2E8CF", "pants": "#F2E8CF", "sash": "#2A9D8F", "skin": "#C68A5A", "hair": "#10222B", "moustache": "#10222B"}. A revered regional hero: dignified poses only, no gags; sickness shown by sitting + pained face, not comic sweat.
- **cast `soldier1`** (adult, hat `hair`): Ahom soldier-rower. Outfit {"jacket": "#2E8B57", "pants": "#F2E8CF", "skin": "#B9784E", "hair": "#10222B"}. 
- **cast `soldier2`** (stout, hat `hair`): second Ahom soldier-rower. Outfit {"jacket": "#E9C46A", "pants": "#F2E8CF", "skin": "#A86B43", "hair": "#10222B"}. 
- **cast `admiral`** (stout, hat `hair`): Munnawar Khan, Mughal admiral; stylised, not a portrait. Outfit {"jacket": "#264653", "pants": "#F2E8CF", "sash": "#E9C46A", "skin": "#C68A5A", "hair": "#10222B", "moustache": "#10222B"}. Enemy commander shown with dignity; no mockery, death off-frame.
- **cast `cadet`** (adult, hat `cap`): NDA cadet today (generic, not a real person). Outfit {"jacket": "#F2E8CF", "pants": "#264653", "cap": "#264653", "skin": "#B9784E", "belt": "#10222B", "buttons": "#E9C46A"}. 
- **subjects**: `lachit` 1.65 m, `soldier1` 1.6 m, `admiral` 1.6 m, `cadet` 1.7 m, `mughalFleet` 6 m, `narrows` 30 m, `cot` 0.6 m

### Shots
**Shot 1** · 0.0-4.03 s · frames 0-121 · hero
- narration (N01): फ़ैसले की लड़ाई सिर पर थी, और सेनापति बिस्तर पर।
- environment: `fort`, 1669-1672 Assam — Itakhuli gatehouse interior-edge: a low cot under a timber roof, the river glinting beyond the opening · lighting `dusk`
- characters: lachit front/sit/pained (on the cot, screen left) · actions: — · expressions: lachit stern@60 on 'बिस्तर'
- camera: angle high, movement push-in: f0 highAngle {"subject": "lachit", "fill": 0.45, "push": 0.04, "ease": "smooth"} · target `lachit`
- foreground: timber post of the gatehouse · background: river and far bank through the opening, violet-blue sky · effects: — · transition: open
- SFX: fever-hum · music: beat `hook`, single drone, duck
- intention: a sick man at the moment he is needed most: pity + question · future dev: F01, F03, F04

**Shot 2** · 4.03-7.87 s · frames 121-236 · key
- narration (N02): सोलह सौ इकहत्तर, और गुवाहाटी के पास मुग़ल फ़ौज डटी थी।
- environment: `river`, 1669-1672 Assam — the Brahmaputra near Guwahati; Mughal camp tents and big boats lined on the far bank · lighting `day`
- characters: none · actions: — · expressions: —
- camera: angle aerial, movement aerial-descent: f121 aerial {"subject": "mughalFleet", "ease": "smooth"} · target `mughalFleet`
- foreground: river surface · background: low green hills, tents as simple cones, many big boats · effects: smoke@131-235 · transition: cut
- SFX: river-bed, river-breeze · music: beat `context`, low strings, duck
- intention: scale: the threat is large and already here · future dev: F02, F03

**Shot 3** · 7.87-9.97 s · frames 236-299 · key
- narration (N02): सामने थे अहोम सेनापति, लचित बोरफुकन।
- environment: `fort`, 1669-1672 Assam — rampart above the river; Lachit standing at the gate, soldiers flanking · lighting `golden`
- characters: lachit front/stand/stern; soldier1 front/stand/neutral (left) · actions: — · expressions: —
- camera: angle low, movement push-in: f236 lowAngle {"subject": "lachit", "ease": "smooth"} · target `lachit`
- foreground: rampart edge · background: warm sky over the river · effects: — · transition: cut
- SFX: — · music: beat `context`, low strings, duck
- intention: introduce the man with weight: low angle, steady · future dev: F01, F03

**Shot 4** · 9.97-15.53 s · frames 299-466 · support
- narration (N02): दो साल पहले, अलाबोई की हार में, अहोम करीब दस हज़ार सैनिक गँवा चुके थे।
- environment: `river`, 1669-1672 Assam — an empty riverbank at evening, smoke drifting over the plain: the memory of Alaboi · lighting `golden`
- characters: soldier1 front/stand/pained (alone on the bank, small in frame) · actions: soldier1 hatOff@319 (head bowed for the dead) · expressions: —
- camera: angle high, movement pull-out: f299 dollyOut {"subject": "soldier1", "fillFrom": 0.4, "fillTo": 0.15, "ease": "smooth"} · target `soldier1`
- foreground: reeds (simple cones) · background: long bank, smoke wisps · effects: smoke@299-465 · transition: xfade 12f
- SFX: — · music: beat `context`, low strings, quieter, duck
- intention: grief, stakes: they have already lost once · future dev: F01 · note: No bodies, no gore: loss shown as one man alone with his head bowed.

**Shot 5** · 15.53-19.5 s · frames 466-585 · key
- narration (N03): अब तोपों से लदी बड़ी मुग़ल नावें ब्रह्मपुत्र में बढ़ रही थीं।
- environment: `river`, 1669-1672 Assam — big Mughal boats with cannon barrels advancing upriver in a line · lighting `day`
- characters: none · actions: — · expressions: —
- camera: angle eye-level, movement tracking: f466 tracking {"subject": "mughalFleet", "path": [[-40, 3, 30], [-10, 3, 24]], "ease": "cruise"} · target `mughalFleet`
- foreground: water · background: far bank hills · effects: splash@486-516 · transition: cut
- SFX: fleet-rumble · music: beat `escalation`, pulse, drum hits, duck
- intention: dread: the big boats keep coming · future dev: F02

**Shot 6** · 19.5-21.83 s · frames 585-655 · support
- narration (N03): उन्हें देखकर अहोम सैनिक पीछे हटने लगे।
- environment: `river`, 1669-1672 Assam — a small Ahom boat turning back; soldier looks over his shoulder at the big boats · lighting `day`
- characters: soldier1 side/march/nervous (in a small boat, moving left); soldier2 side/march/shock (behind) · actions: soldier1 move@590-654 (boat slides left (retreat), pure f(frame)) · expressions: —
- camera: angle over-shoulder, movement handheld: f585 overShoulder {"subject": "mughalFleet", "shoulder": "soldier1", "handheld": 0.6, "seed": 7} · target `mughalFleet`
- foreground: soldier's shoulder · background: the Mughal fleet looming · effects: creak@595-625 · transition: cut
- SFX: — · music: beat `escalation`, pulse, duck
- intention: the moment it almost falls apart · future dev: F01, F02

**Shot 7** · 21.83-27.47 s · frames 655-824 · key
- narration (N03): कहते हैं, तब बीमार लचित खुद नाव लेकर आगे निकला, और लौटती नावें फिर मुड़ आईं।
- environment: `river`, 1669-1672 Assam — Lachit standing in a small boat, pushing forward against the current; other small boats turning back toward him · lighting `day`
- characters: lachit front/stand/stern (bow of a small boat); soldier1 front/stand/relief_open (second boat, behind) · actions: lachit point@700 (points forward at the fleet); lachit move@660-823 (boat advances, pure f(frame)) · expressions: soldier1 relief_open@774 on 'मुड़'
- camera: angle low, movement push-in: f655 lowAngle {"subject": "lachit", "fill": 0.55, "handheld": 0.4, "seed": 3} · target `lachit`
- foreground: bow of the boat and spray · background: big boats far behind him · effects: kick@700 gain 0.6; gust@700-730 · transition: cut
- SFX: boat-surge · music: beat `escalation`, drums, duck
- intention: defiance: the sick man moves first · future dev: F01, F02

**Shot 8** · 27.47-30.07 s · frames 824-902 · key
- narration (N04): पर लचित का असली हथियार नदी थी।
- environment: `river`, 1669-1672 Assam — close on Lachit, eyes turning from the fleet to the water · lighting `day`
- characters: lachit front/stand/neutral · actions: — · expressions: lachit smile_closed@854 on 'नदी'
- camera: angle eye-level, movement push-in: f824 closeUp {"subject": "lachit", "push": 0.05, "ease": "smooth"} · target `lachit`
- foreground: — · background: river surface behind him · effects: — · transition: cut
- SFX: — · music: beat `reveal`, music drops out to one note, duck
- intention: the turn: he knows something the enemy doesn't · future dev: F01

**Shot 9** · 30.07-34.03 s · frames 902-1021 · hero
- narration (N04): सराईघाट पर ब्रह्मपुत्र सिकुड़कर करीब एक किलोमीटर रह जाती है।
- environment: `river`, 1669-1672 Assam — the river from high above, pinched between Kamakhya-like hills on one side and Itakhuli fort hill on the other · lighting `day`
- characters: none · actions: — · expressions: —
- camera: angle aerial, movement crane: f902 crane {"subject": "narrows", "fillFrom": 0.5, "fillTo": 0.12, "elFrom": 10, "elTo": 55, "ease": "smooth"} · target `narrows`
- foreground: — · background: two hills squeezing the water; tiny boats · effects: flash@902 peak 0.8; sparkle@942-992 · transition: flash peak 0.8
- SFX: narrows-glock · music: beat `reveal`, F major opens, duck
- intention: revelation: the geography is the weapon · future dev: F03

**Shot 10** · 34.03-36.7 s · frames 1021-1101 · key
- narration (N05): इतनी तंग नदी में बड़ी नावें फँस गईं।
- environment: `river`, 1669-1672 Assam — big Mughal boats bunched in the narrow channel, bows almost touching · lighting `day`
- characters: none · actions: — · expressions: —
- camera: angle high, movement push-in: f1021 highAngle {"subject": "mughalFleet", "fill": 0.55} · target `mughalFleet`
- foreground: — · background: hills close on both sides · effects: creak@1036-1081 · transition: cut
- SFX: hull-crack · music: beat `battle`, full drums, duck
- intention: claustrophobia: power that cannot turn · future dev: F02

**Shot 11** · 36.7-39.7 s · frames 1101-1191 · key
- narration (N05): छोटी अहोम नावों ने उन्हें आगे-पीछे से घेर लिया।
- environment: `river`, 1669-1672 Assam — small Ahom boats sweep in from both ends and close the ring around the big boats · lighting `day`
- characters: none · actions: — · expressions: —
- camera: angle aerial, movement orbit: f1101 orbit {"subject": "mughalFleet", "fill": 0.35, "az0": -30, "sweep": 90, "el": 35} · target `mughalFleet`
- foreground: — · background: small boats moving on two arcs (pure f(frame)) · effects: gust@1111-1161 · transition: cut
- SFX: encircle-whoosh · music: beat `battle`, full drums, duck
- intention: the trap closes: small beats big · future dev: F02

**Shot 12** · 39.7-43.1 s · frames 1191-1293 · hero
- narration (N05): मुग़ल एडमिरल मुनव्वर ख़ान मारा गया। बेड़ा बिखर गया।
- environment: `river`, 1669-1672 Assam — the Mughal admiral's boat; he falls back out of frame; then the fleet drifting apart · lighting `day`
- characters: admiral front/stand/shock (on the big boat's deck) · actions: admiral fall@1216-1236 (falls backward out of frame; no blood) · expressions: admiral shock@1211 on 'मारा'
- camera: angle eye-level, movement pull-out: f1191 closeUp {"subject": "admiral", "fill": 0.5}; f1253 establishingWide {"subject": "mughalFleet"} cut · target `mughalFleet`
- foreground: deck rail · background: boats turning away from each other · effects: puff@1216-1236; kick@1216 gain 1.0; dust@1253-1292 · transition: cut
- SFX: admiral-boom · music: beat `battle`, peak, then the drums break, duck
- intention: the peak: the head of the fleet is gone, the body breaks up · future dev: F01, F02 · note: Respect: death shown as a fall out of frame + puff, nothing graphic.

**Shot 13** · 43.1-45.53 s · frames 1293-1366 · support
- narration (N06): मुग़ल फ़ौज पीछे हटी, मानस नदी तक।
- environment: `river`, 1669-1672 Assam — big boats shrinking downstream into a golden haze; the narrows empty · lighting `golden`
- characters: none · actions: — · expressions: —
- camera: angle eye-level, movement pull-out: f1293 dollyOut {"subject": "narrows", "fillFrom": 0.3, "fillTo": 0.1, "ease": "smooth"} · target `narrows`
- foreground: water · background: fleet going small toward the horizon · effects: — · transition: xfade 12f
- SFX: evening-breeze · music: beat `after`, warm pad, duck
- intention: relief, space · future dev: F02, F03

**Shot 14** · 45.53-54.23 s · frames 1366-1627 · key
- narration (N06): जीत के करीब एक साल बाद, लचित नहीं रहे। और मामा का सिर काटने वाली मशहूर कहानी? उसका कोई पुराना लिखित सबूत नहीं मिलता।
- environment: `fort`, 1669-1672 Assam — the gatehouse again: the cot is empty, a lamp-warm key light · lighting `dusk`
- characters: none · actions: — · expressions: —
- camera: angle high, movement push-in: f1366 highAngle {"subject": "cot", "fill": 0.4, "push": 0.05, "ease": "smooth"}; f1460 orbit {"subject": "cot", "fill": 0.35, "az0": -20, "sweep": 30} cut · target `cot`
- foreground: timber post (same as shot 1) · background: river beyond the opening · effects: — · transition: xfade 15f
- SFX: — · music: beat `after`, warm pad, duck
- intention: absence; then an honest aside about the legend · future dev: F03, F04 · note: Same framing as shot 1 with the man gone: the first half of the callback.

**Shot 15** · 54.23-60.1 s · frames 1627-1803 · key
- narration (N07): पर आज भी, एनडीए के बेस्ट कैडेट को उसी के नाम का गोल्ड मेडल मिलता है।
- environment: `parade`, today — a modern parade ground; one cadet standing at attention, a small gold glint at his chest · lighting `day`
- characters: cadet front/stand/smile_closed · actions: — · expressions: —
- camera: angle low, movement push-in: f1627 lowAngle {"subject": "cadet", "fill": 0.5} · target `cadet`
- foreground: parade ground edge · background: clear blue sky, a plain flagpole without a flag · effects: sparkle@1667-1717 · transition: xfade 12f
- SFX: medal-notes · music: beat `today`, F major swell, duck
- intention: pride, continuity: the name is alive · future dev: F05

**Shot 16** · 60.1-66.3 s · frames 1803-1989 · hero
- narration (N07): उस सेनापति के नाम का, जो बिस्तर से उठकर नदी में उतरा था।
- environment: `river`, 1669-1672 Assam — Lachit standing in a small boat on the golden river, framed like shot 1 but now upright · lighting `golden`
- characters: lachit front/stand/smile_closed · actions: — · expressions: —
- camera: angle low, movement crane: f1803 lowAngle {"subject": "lachit", "fill": 0.5}; f1893 crane {"subject": "narrows", "fillFrom": 0.4, "fillTo": 0.12, "elFrom": 10, "elTo": 40} dur 60 · target `lachit`
- foreground: bow of the boat · background: golden sky over the narrows · effects: — · transition: cut
- SFX: — · music: beat `today`, fade
- intention: callback: from the bed to the river; quiet image to end on · future dev: F01, F02

### Future development (must be built before rendering)
- **F01 Indian costume kit: Ahom headgear (cheleng/turban-style), Mughal turban, dhoti/chadar** — need: hats available are western (hood, cap, shako...); 'hair' is used as a stand-in; shots [1, 3, 4, 6, 7, 8, 12, 16]; suggestion: ENGINE_CAPABILITIES §11.1: add pagdi/turban hats + dhoti in toon.ts; workaround now: hat 'hair' + cream/teal outfits + sash
- **F02 Boat kit: small Ahom war-boats and large Mughal cannon boats, moving along the river as pure f(frame)** — need: no boat geometry exists; characters must stand in boats; shots [2, 5, 6, 7, 10, 11, 12, 13, 16]; suggestion: world.ts helper: boxGeo hull + cone bow, instanced; cannon as short cylinders; positions keyed on frames; workaround now: none — needed before render
- **F03 River narrows + hill fort sets (Saraighat / Itakhuli)** — need: all existing sets are Siberian; shots [1, 2, 3, 9, 13, 14]; suggestion: ENGINE_CAPABILITIES §11.5 Indian set kit: ghat/river + fort wall + hills; workaround now: none
- **F04 Cot / sickbed prop** — need: hook and callback hinge on a cot; shots [1, 14]; suggestion: boxes + 'bed' paint texture; workaround now: character in 'sit' mode on a box
- **F05 Medal prop on a cadet's chest** — need: a small gold disc on the jacket; shots [15]; suggestion: toon.ts outfit flag 'medal' (circle + ribbon); workaround now: sparkle card at chest height + 'buttons' in gold
- **F06 Indian percussion timbre (dhol-like) for battle hits** — need: score drums are generic; shots [5, 6, 7, 10, 11, 12]; suggestion: ENGINE_CAPABILITIES §11.9 membrane timbre; workaround now: default percussion via events.hits

## G Audio direction
| seg | voice | music | ambient | SFX | intensity |
|---|---|---|---|---|---|
| N01 | tense, x1.0 | single low drone, Dm | river wind through the gatehouse | fever-hum | 6 |
| N02 | grave, x1.0 | low strings, Gm | broad river, breeze | river-bed, river-breeze | 4 |
| N03 | urgent, x1.05 | pulse rises, drum hits, Dm | water slap, oars | fleet-rumble, boat-surge | 7 |
| N04 | awed, x0.95 | music drops to a single high note, then F major opens | wide river air | narrows-glock | 8 |
| N05 | tense, x1.05 | full drums, peak, F to C | water, timber strain | hull-crack, encircle-whoosh, admiral-boom | 9 |
| N06 | reflective, x1.0 | drums stop; warm Bb pad | evening breeze | evening-breeze | 5 |
| N07 | warm, x0.95 | F major, gentle swell then fade | breeze | medal-notes | 6 |

**Music beats:** `hook` shots 1-1 Dm level 0.6 (single drone, sparse) · `context` shots 2-4 Gm level 0.75 (low strings, grave) · `escalation` shots 5-7 Dm level 1.0 (pulse + drum hits rising) · `reveal` shots 8-9 F level 0.9 (drop to one note, then open major) · `battle` shots 10-12 C level 1.2 (full drums, peak) · `after` shots 13-14 Bb level 0.7 (warm pad, no drums) · `today` shots 15-16 F level 0.85 (gentle swell, fade)

**Events:** flashAt 902 (narrows reveal), flashes [[902, 0.8]], hits [700, 1216], kicks [[700, 0.6], [1216, 1.0]]. Master fade in 0.0 s / out 0.8 s.

| cue | frame | gen | args | span | intent |
|---|---|---|---|---|---|
| fever-hum | 0 | hum | {"hz": 55, "tone": 0.3, "noise": 0.2} | [0, 121] | low sick-room drone under the hook |
| river-bed | 121 | water | {"close": 0.3} | [121, 1293] | the river is a character: water bed under all river shots |
| river-breeze | 121 | breeze | {"level": 0.4, "bright": 0.4} | [121, 466] | open-air width for context |
| fleet-rumble | 471 | rumble | {"dur": 3.5, "gain": 0.5, "lo": 40, "hi": 180, "decay": 1.2} |  | weight of the big boats |
| boat-surge | 700 | whoosh | {"dur": 0.8, "peak": 0.5} |  | Lachit's boat lunges forward (with kick) |
| narrows-glock | 904 | glock | {"midi": 79, "level": 0.5} |  | the reveal of the narrows |
| hull-crack | 1041 | wood_crack | {} |  | big hulls grinding in the narrow channel |
| encircle-whoosh | 1111 | whoosh | {"dur": 1.2, "peak": 0.6, "width": 0.8} |  | small boats sweep in from both ends |
| admiral-boom | 1216 | boom | {"dur": 1.6, "f0": 60, "big": 0.7} |  | the admiral falls; paired with kick + hit |
| evening-breeze | 1293 | breeze | {"level": 0.3, "bright": 0.2} | [1293, 1627] | quiet after the battle |
| medal-notes | 1667 | notes | {"midi": [72, 76, 79], "level": 0.4, "spacing": 0.12} |  | medal glint |

All generators exist (ENGINE_CAPABILITIES §8). Music ducks under every line except the final image (shot 16, duck off so the swell can carry the fade).

## H Retention report
- **Hook (0-3.7 s):** contradiction "फ़ैसले की लड़ाई सिर पर थी, और सेनापति बिस्तर पर" over a high-angle shot of a man on a cot. Specific, true, no answer given.
- **Context exit risk (4-15 s):** three names/numbers in 11 s (1671, Guwahati, Lachit, Alaboi, 10,000). New promise by 10 s: the Alaboi loss raises the stakes. Risk: DENSE flags; mitigated by one name per shot (shots 2-4).
- **Escalation (15.6-27 s):** new image every ~4 s: fleet advances, soldiers retreat, Lachit goes out (kick + whoosh at ~23 s).
- **Revelation:** 27.5-34 s ("पर लचित का असली हथियार नदी थी ... करीब एक किलोमीटर"), 42-52 % of runtime, flash + crane-out; physical peak at 42.7 s ("बेड़ा बिखर गया", 66 %).
- **Peaks:** 23 s (boat surge), 30 s (narrows reveal), 41-43 s (admiral falls, fleet breaks).
- **Drop-off risks + fixes:** (1) 4-15 s name stack -> one name per shot, Alaboi shown as a single bowed figure. (2) 43-54 s after the peak -> the uncle-legend question re-opens curiosity for 3 s. (3) 54-65 s ending is the longest line pair -> slower voice + medal sparkle + callback image.
- **Payoff / ending:** callback to the hook word बिस्तर: "उस सेनापति के नाम का, जो बिस्तर से उठकर नदी में उतरा था" over the inverted composition (low angle, standing in a boat). Rewatch trigger: the opening cot.
- **Rhythm before:** RHYTHM REPORT — verdict FAIL / duration 76.4 s (estimate) | 212 words | 2.86 words/s (speech-only 2.86) | 20 sentences / to hit the target duration the voice needs 3.8 words/s
- **Rhythm after:** RHYTHM REPORT — verdict PASS / duration 64.9 s (estimate) | 180 words | 2.86 words/s (speech-only 2.86) | 19 sentences / to hit the target duration the voice needs 3.0 words/s
- Rewrite list applied: S3 (4 names) -> names cut; S20 (29 words) -> split into two sentences; NO_BEAT 36-51 s -> pauses after the 1 km line and the fleet-breaks line; FRONT_LOADED -> "सोलह सौ इकहत्तर" merged into a longer line. Remaining MEDIUM DENSE x3 justified: each name is said once and has its own shot.

## I Fact-check report
Research mode web-verified (secondary sources; see research.md limits). Every spoken statement mapped:

| statement | where | claims | confidence | qualification used | verdict |
|---|---|---|---|---|---|
| फ़ैसले की लड़ाई ... सेनापति बिस्तर पर | N01/H1 | C01, C06 | high/medium | 'decisive' = the final battle per sources | OK |
| सोलह सौ इकहत्तर, गुवाहाटी के पास मुग़ल फ़ौज | N02 | C01, C02 | high | year only | OK |
| अहोम सेनापति, लचित बोरफुकन | N02 | C03 | high |  | OK |
| दो साल पहले, अलाबोई ... करीब दस हज़ार | N02 | C04 | high | करीब | OK |
| तोपों से लदी बड़ी मुग़ल नावें | N03 | C05 | medium | no cannon count | reworded (count removed) |
| अहोम सैनिक पीछे हटने लगे | N03 | C06 | medium |  | OK |
| कहते हैं, बीमार लचित खुद नाव लेकर ... नावें मुड़ आईं | N03 | C07 | medium (disputed) | कहते हैं | reworded (qualified) |
| सराईघाट पर ब्रह्मपुत्र ... करीब एक किलोमीटर | N04 | C08 | medium | करीब | OK |
| बड़ी नावें फँस गईं; आगे-पीछे से घेर लिया | N05 | C05, C09 | medium | narrative compression of 'outmanoeuvred' | OK |
| मुनव्वर ख़ान मारा गया; बेड़ा बिखर गया | N05 | C10 | high | weapon not stated | OK |
| मुग़ल फ़ौज पीछे हटी, मानस नदी तक | N06 | C11 | medium |  | OK |
| जीत के करीब एक साल बाद, लचित नहीं रहे | N06 | C12 | high | करीब; no cause | OK |
| मामा वाली कहानी — कोई पुराना लिखित सबूत नहीं | N06 | C13 (C14 not asserted) | medium | 'no old written evidence', not 'false' | OK |
| एनडीए के बेस्ट कैडेट को उसी के नाम का गोल्ड मेडल | N07/H3 | C15 | high | बेस्ट कैडेट | OK |
| जो बिस्तर से उठकर नदी में उतरा था | N07 | C07 | medium | already qualified with कहते हैं in N03 | OK (callback) |
| titles: '1 किलोमीटर की नदी', 'बीमार सेनापति', 'मुग़ल बेड़ा बिखर गया', NDA medal | J | C08, C06, C10, C15 | medium-high |  | OK |
| description: Ram Singh of Amber; narrowest part; legend/numbers withheld | J | C02, C08, C13, C17 | high/medium |  | OK |
| pinned comment: Lachit Divas 24 Nov | J | C16 | high |  | OK |
| visuals: costumes are stylised stand-ins (hat 'hair'), not period-accurate dress | F | — | — | flagged F01 | OK (flagged) |

Unsupported statements: 0. Debunked items present: 0 (C19 Mir Jumla absent; C14, C17, C18, C20, C22 absent). Re-verified this session by opening the page:
C01, C02, C04, C05, C06, C07, C08 (Wikipedia only), C10, C12, C15. Snippet-only support: C08 (eSamskriti), C13 (VIF), C15 nuance (Assam Tribune).
Research reliability: 7/10 — consistent secondary sources incl. a Govt of Assam page, but no primary chronicle read.

## J Publishing
1. बिस्तर से उठा सेनापति, और मुग़ल बेड़ा बिखर गया
2. 1 किलोमीटर की नदी ने कैसे जिताई सराईघाट की लड़ाई
3. Lachit Borphukan: बीमार सेनापति की सबसे बड़ी जीत
4. सराईघाट 1671: छोटी नावें, बड़ा बेड़ा
5. NDA का Lachit Borphukan मेडल किसके नाम पर है?

- Thumbnail: Lachit on a cot in the gatehouse, the river and big boats visible through the opening, dusk — text **बीमार सेनापति?**
- Thumbnail: Aerial of the narrows: two hills squeezing the river, tiny boats ringing big ones — text **1 KM की नदी**
- Thumbnail: Low angle of Lachit standing in a small boat, golden sky — text **सराईघाट 1671**

**Description:**
1671, गुवाहाटी: सराईघाट की लड़ाई, जहाँ अहोम सेनापति लचित बोरफुकन ने बीमारी के बावजूद मुग़ल बेड़े (कमान: आमेर के राम सिंह) को ब्रह्मपुत्र के सबसे तंग हिस्से में हराया। मामा वाली कहानी और सेना की संख्याएँ हमने जानबूझकर नहीं बताईं — उनके पक्के सबूत नहीं मिले।
Sources: Govt of Assam (Kamrup district) page on Alaboi & Saraighat; Live History India; The Sentinel (Assam); EastMojo; Wikipedia (Battle of Saraighat, Lachit Borphukan) and the histories it cites (S.K. Bhuyan 1947; J.N. Sarkar 1992).

**Hashtags:** #Saraighat #LachitBorphukan #Assam #AhomKingdom #IndianHistory #Brahmaputra #Shorts

**Pinned comment:** 24 नवंबर को असम में लचित दिवस मनाया जाता है। आपने लचित बोरफुकन का नाम पहली बार कहाँ सुना था — स्कूल में, या कहीं और?

## K Quality report (EDITOR PASS 3)
**12 questions.** Hook strong? Yes — 10-word contradiction, visual, true (7/10 by tool; 8 by editor because of the callback). Angle original? Mostly — "the river chose the
winner" beats a chronological retelling, but "small boats beat big boats" is the familiar framing. Story builds? Yes: stakes (Alaboi) -> wavering -> sortie -> geography -> peak.
Conversational? Yes; 0 % Roman, spoken forms (नहीं रहे, आगे-पीछे). Rhythmic? PASS, CV 0.37 (low end of healthy). Boring parts? 4-15 s name stack is the weakest. Unnecessary
sentences? None left after round 1 cuts; the uncle aside is the most cuttable. Facts supported? Yes, all mapped (I). Revelation satisfying? Yes, the 1 km fact is concrete and visual.
Visuals varied? 10 presets (highAngle, aerial, lowAngle, dollyOut, tracking, overShoulder, closeUp, crane, orbit, establishingWide), wide/close alternate. Ending memorable?
Yes, callback on बिस्तर. Producible? Not yet: depends on F01-F04 (new sets, boats, costumes).

**Three weakest moments + fixes.** (1) 4-15 s: three proper names + two numbers -> applied: names removed from S3, one name per shot. (2) 45-48 s death line was clinical ->
applied: "लचित नहीं रहे". (3) 48-54 s uncle aside cools the emotion before the ending -> kept (the request asks to address the legend honestly); the alternative is to cut it and
end at ~59 s. **Best moment:** 27.5-34 s, "पर लचित का असली हथियार नदी थी" + crane-out of the narrows.

| score | value | reason |
|---|---|---|
| hook | 8 | true, visual contradiction with a callback; does not name the battle for 4 s |
| originality | 7 | geography-as-weapon angle; still a familiar small-vs-big shape |
| researchReliability | 7 | consistent secondary sources incl. Govt of Assam; no primary chronicle read |
| rhythm | 7 | PASS, CV 0.37, 3 MEDIUM density flags justified |
| hinglishNaturalness | 7 | spoken Hindi throughout; a little formal in S2 ('डटी थी') |
| emotion | 7 | sickbed -> defiance -> loss -> pride arc |
| retention | 7 | new image every ~4 s; 4-15 s is the risk |
| visualStorytelling | 7 | 10 presets, callback composition, reveal on a flash + crane |
| pacing | 7 | 65 s of speech is at the top of the window |
| productionFeasibility | 5 | 3 new sets + boat kit + costume kit unbuilt (F01-F04) |
| ending | 8 | callback on बिस्तर over the inverted composition |

**Weaknesses:**
- [high] production: Three new sets, a boat kit (small/large boats moving as f(frame)), Indian costume/headgear and a cot prop are all unbuilt; nothing here renders today without F01-F05.
- [medium] research: Several battle details rest on Wikipedia + one secondary page (1 km width, Manas pursuit, front-and-rear attack); no Buranji or Bhuyan/Sarkar page was read directly.
- [medium] narration: The myth-check aside (S16-S17) slightly breaks the emotional line just before the ending; kept because the request asked to treat the uncle legend explicitly.
- [low] rhythm: Estimated 64.9 s is at the top of the 45-65 s window; three MEDIUM DENSE flags (names/numbers in S2-S4) kept because each name is needed once.
- [low] hook: Hook does not say which battle or where until 4 s in.

**Verdict: revise** — Verdict revise only because productionFeasibility is 5 (nothing in the Indian set/boat/costume kit exists yet); the script itself meets the bar on every other item.

**Revision log:**
- round 1: Cut 212 -> 179 words: dropped Ram Singh/Aurangzeb names from S3, merged the boat-rally lines, shortened the NDA ending into two sentences. — rhythm hard failures: 76.4 s estimate and 3.8 wps needed (rhythm.before.txt)
- round 1: Added 'कहते हैं' to the sickbed-to-boat line; removed cannon count and all troop numbers; kept uncle story only as 'no old written evidence'. — fact check: C07 disputed, C05 count single-source, C17 numbers conflict
- round 2: 'पर असली चाल जगह की थी' -> 'पर लचित का असली हथियार नदी थी'; split the encirclement sentence; merged the year into the Guwahati line. — editor: stronger revelation line, peak moved to 66% (S13), FRONT_LOADED cleared
- round 3: 'करीब एक साल बाद, लचित की मौत हो गई' -> 'जीत के करीब एक साल बाद, लचित नहीं रहे'. — editor: flat clinical death line; respectful spoken form

Validation: `node tools/validate.mjs script.json --narration-file narration.txt` -> exit 0, 0 errors, 0 warnings. `rhythm.py` final -> PASS, exit 0.
