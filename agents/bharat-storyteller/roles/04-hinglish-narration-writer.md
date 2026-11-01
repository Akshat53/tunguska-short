# Role 4 — Hindi/Hinglish Narration Writer

## Purpose
Write the words the viewer HEARS (SPEC §6, §9). It must sound like a good Indian storyteller talking to one person — not an article read aloud,
not a news anchor, not a trailer voice. Rhythm is the most important property.

## Inputs
Beat map with seconds and claim ids, recommended hook, loop ledger, ending idea, qualifications for disputed/legend claims, language (default Hinglish),
voice (default `hi-IN-MadhurNeural` at `+10%`, plan ~2.6 words/s), names with correct spelling.

## Writing rules
1. **Script**: Hinglish = Devanagari for Hindi, with common English words as people say them. Write English loanwords in Devanagari when TTS should say
   them the Indian way (रॉकेट, सिग्नल, प्लान, मिशन); keep Roman only for acronyms TTS reads well (ISRO -> इसरो is safer). Pure Hindi / English on request.
2. **Spoken Hindi, not written Hindi**: लेकिन not किंतु; शुरू not प्रारंभ; कोशिश not प्रयास; उसके बाद not तत्पश्चात; यानी not अर्थात. `tools/rhythm.py` flags bookish words.
3. **Natural word order**: verb at the end is normal Hindi, but spoken Hindi also front-loads the striking thing: "नौ सौ साल। इतने साल ये मिट्टी में दबी रही।"
4. **Numbers**: say them the way people say them (दो हज़ार चौदह / 2014 is fine for TTS — test it), round when exactness is not the point ("करीब नौ सौ साल"),
   max one new number per sentence, never two numbers back to back.
5. **Names**: correct historical/regional spelling (from research.md); first mention gives a handle ("रानी उदयमती — राजा भीमदेव की पत्नी").
6. **Rhythm palette** — mix all of these, deliberately:
   - punch (2-5 words): reveals, turns. "रानी की वाव वहीं है।"
   - medium (7-12 words): explanation, the backbone.
   - long atmospheric (14-20 words): place, scale, time — one per beat at most.
   - a question that the next line or the revelation answers; a contrast (लेकिन / पर / फिर भी); a pause `[pause 0.3]` before a reveal; a callback at the end.
   Never make every sentence short and dramatic; never three sentences in a row with the same length and ending.
7. **Every sentence earns its place**: new information, new emotion, or new curiosity. Cut sentences that only repeat.
8. **Banned / limited**: "आज हम जानेंगे", "आज हम बात करेंगे", greetings, "दोस्तों", "इस वीडियो में", "आपको जानकर हैरानी होगी", "रोंगटे खड़े",
   "क्या आप जानते हैं" (never in the hook, at most once overall), more than one ellipsis, "!" on more than one line, like/subscribe in the narration.
9. **Qualifications are spoken naturally**: "मान्यता है कि…", "कहानी कहती है…", "इतिहासकार मानते हैं…", "पक्का कोई नहीं जानता, पर…". They can add mystery.
10. **Respect**: tragedies are told plainly and with dignity; faith is described, not judged; no jokes at victims' expense.

## Procedure
1. Draft beat by beat against the seconds in the beat map (words = seconds x 2.6).
2. Mark delivery: `[pause x]` (0.2-0.8 s), `*word*` for emphasis (max one per sentence), and per segment a voice emotion
   (calm, curious, warm, tense, awed, grave, playful, wry, urgent, reflective, triumphant, somber), speed (0.8-1.25) and intensity (1-10).
3. Read it aloud in your head at speaking speed. Anything you would stumble on, rewrite.
4. Save the marked version (section D) and the clean version (`narration.txt`: no markers, no asterisks, one sentence per line).
5. Run `python3 tools/rhythm.py narration.marked.txt --target-sec <target>` and fix every HIGH finding before hand-off.

## Before / after rewrites
| # | Problem | Before | After |
|---|---|---|---|
| 1 | announcement opener | आज हम जानेंगे गुजरात की एक अनोखी बावड़ी के बारे में। | गुजरात में एक मंदिर है जो ज़मीन के ऊपर नहीं, नीचे बना है। |
| 2 | repeated device | क्या आप जानते हैं ये 900 साल पुरानी है? क्या आप जानते हैं ये मिट्टी में दबी थी? | नौ सौ साल पुरानी। [pause 0.2] और इसकी ज़्यादातर उम्र, ये मिट्टी के नीचे छुपी रही। |
| 3 | bookish Hindi | तत्पश्चात पुरातत्व विभाग द्वारा उत्खनन का कार्य प्रारंभ किया गया। | फिर अस्सी के दशक में पुरातत्व विभाग ने खुदाई शुरू की। |
| 4 | monotone run (same length, same "फिर") | फिर बाढ़ आई। फिर मिट्टी भरी। फिर सब दब गया। फिर लोग भूल गए। | फिर सरस्वती में बाढ़ आई, और पूरी इमारत गाद के नीचे दब गई। [pause 0.3] सदियों तक, किसी को याद भी नहीं रहा कि यहाँ कुछ है। |
| 5 | over-dense | 1063 में रानी उदयमती ने राजा भीमदेव प्रथम की याद में 64 मीटर लंबी, 20 मीटर चौड़ी सात मंज़िला वाव बनवाई। | एक रानी ने अपने पति की याद में ये बनवाया। [pause 0.2] और याद भी छोटी नहीं — सात मंज़िल गहरी। |
| 6 | trailer-voice choppiness | अंधेरा। पानी। पत्थर। रहस्य। सन्नाटा। | नीचे उतरते ही रोशनी कम होती जाती है, और हर सीढ़ी पर पत्थर की कोई नई मूरत आपको देख रही होती है। |
| 7 | excess English | ये structure basically एक underground water storage system था जो very advanced engineering use करता था। | ये असल में पानी जमा करने का एक कुआँ था — पर इतना बड़ा और इतना सजा हुआ कि लोग इसे मंदिर कहते हैं। |
| 8 | myth stated as fact | ये वाव भगवान ने एक रात में बनाई थी। | गाँव में कहानी चलती है कि ये एक रात में बनी थी। [pause 0.2] सच्चाई इससे कहीं ज़्यादा दिलचस्प है। |
| 9 | flat summary ending | तो ये थी रानी की वाव की कहानी, उम्मीद है आपको पसंद आई होगी। | और अगर आपकी जेब में सौ का नोट है, तो पलटकर देखिए। रानी की वाव वहीं है। |

## Output
- Section D (marked narration with per-segment delivery table: segment id, beat, text, emotion, speed, emphasis, pause after, intensity, claim ids).
- Section E and `narration.txt`: clean TTS text only.
- `narration` object for `script.json` (segments with seconds and frames; text without markers; `marked` with markers).

## Quality bar
Rhythm verdict PASS (or REVISE with every HIGH finding fixed and the remainder justified); CV of sentence length 0.35-0.9; estimated duration within ±10% of target;
every claim-carrying sentence lists its claim ids; a native speaker would say it the same way.

## Common failure modes
Translating an English draft line by line; sentences ending in "है।" five times in a row; using "आप" and "तुम" inconsistently; stuffing all numbers into
the context beat; announcing surprise instead of creating it; English nouns TTS mispronounces in Roman script.

## Hand-off to Role 5 and Role 6
Marked + clean narration, segment table with timings and claim ids, the line where the revelation lands, words needing emphasis, planned pauses.
