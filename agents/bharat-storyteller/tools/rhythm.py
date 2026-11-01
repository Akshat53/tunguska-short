#!/usr/bin/env python3
"""BHARAT STORYTELLER rhythm analyser (SPEC §10). Python 3 stdlib only.

Reads narration (Devanagari Hindi, Roman Hinglish, English or mixed). Sentence terminators: । ? ! . … (and "...").
Markers: [pause 0.4] (seconds; bare [pause] = 0.3), *word* = emphasis (stripped for counting), blank line = beat break
(implicit 0.25 s if no explicit pause), lines starting with # are comments.

  python3 rhythm.py narration.txt [--wps 2.6] [--voice-rate +10%] [--lang hinglish|hindi|english]
                    [--target-sec 58] [--words-json words.json] [--names "अशोक,पाटलिपुत्र"] [--names-file f]
                    [--allow-length] [--strict] [--json]

Exit codes: 0 = PASS or REVISE, 1 = hard failure (duration outside 30-75 s unless --allow-length, banned opener in the hook,
effective words/sec above 3.4), 2 = REVISE with --strict, 3 = usage error.
The tool never asks for uniform sentence lengths: it flags monotony (too-similar runs) and overload, and suggests rewrites.
"""
import argparse, json, math, re, statistics, sys, unicodedata
from collections import Counter

HARD_MIN, HARD_MAX, WPS_MAX = 30.0, 75.0, 3.4
DEV = re.compile(r"[ऀ-ॿ]")
ROM = re.compile(r"[A-Za-z]")
DIGITS = re.compile(r"[0-9०-९]")
ABBR = {"dr", "mr", "mrs", "ms", "st", "vs", "prof", "lt", "gen", "col", "capt", "no", "sh", "smt", "shri", "etc", "approx", "ca", "c", "km", "jr", "sr"}
PAUSE = re.compile(r"\[\s*(?:pause|विराम)\s*([0-9]*\.?[0-9]+)?\s*s?\s*\]", re.I)
WORDCH = re.compile(r"[\wऀ-ॣ०-ॿ]", re.U)

def norm(s):
    """normalise for phrase matching: drop nukta, chandrabindu -> anusvara, lowercase, collapse spaces"""
    s = unicodedata.normalize("NFC", s).replace("़", "").replace("ँ", "ं").lower()
    s = re.sub(r"[^\wऀ-ॣ०-ॿ ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

# ---------------------------------------------------------------- phrase lists
BANNED_OPENERS = ["आज हम जानेंगे", "आज हम बात करेंगे", "आज की वीडियो", "आज के वीडियो", "इस वीडियो में", "नमस्कार", "नमस्ते दोस्तों",
                  "हेलो दोस्तों", "हैलो दोस्तों", "तो दोस्तों", "दोस्तों", "क्या आप जानते हैं", "क्या आपको पता है",
                  "aaj hum janenge", "aaj hum jaanenge", "aaj hum baat karenge", "is video mein", "namaskar", "hello doston", "doston",
                  "kya aap jaante hain", "kya aap jante hain", "kya aapko pata hai", "hello guys", "hi guys", "welcome back",
                  "in this video", "today we will", "today we are going to", "did you know"]
REPEAT_LIMITED = {"क्या आप जानते हैं": 1, "kya aap jaante hain": 1, "kya aap jante hain": 1, "did you know": 1, "सोचिए": 2, "socho": 2, "imagine": 2}
FILLERS = {"बहुत ही": "keep 'बहुत' or replace with a concrete detail", "वैसे तो": "cut it", "असल में देखा जाए तो": "cut it; state the point",
           "आपको जानकर हैरानी होगी": "show the surprising fact instead of announcing it", "यकीन नहीं होगा": "let the fact do the work",
           "रोंगटे खड़े": "cliché: describe what happened", "चौंका देने वाला": "cliché: show the shock", "बेहद ही": "use 'बेहद'",
           "आइए जानते हैं": "cut the announcement; go straight to the story", "चलिए जानते हैं": "cut the announcement",
           "तो चलिए": "cut it", "वीडियो को लाइक": "move calls to action to the description/pinned comment",
           "basically": "cut it", "actually": "cut it unless it marks a real correction", "literally": "cut it",
           "you won't believe": "show, don't promise", "mind blowing": "cliché: give the number or image", "shocking": "show the shock",
           "like and subscribe": "move to the description", "subscribe": "move to the description/end card"}
FORMAL = {"अत्यंत": "बहुत", "तत्पश्चात": "उसके बाद", "किंतु": "लेकिन", "किन्तु": "लेकिन", "परंतु": "पर / लेकिन", "परन्तु": "पर / लेकिन",
          "अतः": "इसलिए", "यद्यपि": "हालांकि", "प्रारंभ": "शुरू", "आरंभ": "शुरू", "आरम्भ": "शुरू", "समाप्त": "खत्म",
          "उपरांत": "बाद", "निश्चित रूप से": "ज़रूर / पक्का", "इसके अतिरिक्त": "इसके अलावा", "संपूर्ण": "पूरा", "सम्पूर्ण": "पूरा",
          "प्रयास": "कोशिश", "वर्तमान में": "आज / अभी", "हेतु": "के लिए", "फलस्वरूप": "इसी वजह से", "एवं": "और", "तथा": "और",
          "अर्थात": "यानी", "उपस्थित": "मौजूद", "प्रतीत होता": "लगता", "विद्यमान": "मौजूद", "अवश्य": "ज़रूर", "कदापि": "कभी नहीं"}
CONTRAST = ["लेकिन", "पर", "मगर", "फिर भी", "जबकि", "बल्कि", "नहीं", "कभी नहीं", "सिर्फ", "सिर्फ़", "but", "yet", "never", "only", "lekin", "magar", "sirf", "nahi"]
INTENS = ["अचानक", "तभी", "उसी पल", "एक झटके", "सब कुछ", "हमेशा", "पहली बार", "आखिरी", "suddenly", "then", "everything", "achanak", "tabhi"]
CONJ = ["क्योंकि", "लेकिन", "जबकि", "और फिर", "और", "जो", "जिसे", "जिसने", "ताकि", "तो", "पर", "मगर", "because", "but", "and", "which", "while",
        "lekin", "aur", "kyunki", "jo"]
NUMWORDS = set("एक दो तीन चार पाँच पांच छह छः सात आठ नौ दस ग्यारह बारह पंद्रह बीस तीस चालीस पचास साठ सत्तर अस्सी नब्बे सौ हज़ार हजार लाख करोड़ अरब "
               "डेढ़ ढाई सवा साढ़े दर्जन सदी hundred thousand million billion lakh crore".split())
UNITS = set("किलोमीटर मीटर टन किलो फुट फीट साल वर्ष ईस्वी ईसा प्रतिशत डिग्री km kg bc ad bce ce percent %".split())
STOP = set("""है हैं था थे थी थीं की का के को में से पर और भी तो ही यह वह ये वो एक नहीं क्या कैसे क्यों कौन कब कहाँ कहां जो कि ने हो गया गई गए
रहा रही रहे कर करके लेकिन अब फिर बस सब इस उस इन उन आप हम मैं ना न मगर जब तब तक साथ लिए बाद पहले वाला वाली वाले हुआ हुई हुए होता होती होते
जा जाता जाती जाते दिया दी दे लगा लगी कुछ कोई किसी बहुत सा सी से वहाँ वहां यहाँ यहां ऐसा ऐसी ऐसे वैसा अपना अपनी अपने उसका उसकी उसके इसका इसकी इसके
the a an and or but of to in on at is was were are be been it its this that these those he she they we you i his her their our your with for from
by as so not no yes do did does had has have then there here what why how who when where which
hai hain tha thi the ki ka ke ko mein se par aur bhi to hi yeh woh ek nahi kya kaise kyun kaun kab kahan jo ne ho gaya""".split())
QWORDS = ["क्या", "क्यों", "कैसे", "कौन", "कब", "कहाँ", "कहां", "कितना", "कितने", "कितनी", "why", "how", "what", "who", "when", "where", "kyun", "kaise", "kya"]

# ---------------------------------------------------------------- parsing
def parse(text):
    """-> list of sentences {text, words, term, pause_after, para_break} and leading pause"""
    lines = [l for l in text.splitlines() if not l.lstrip().startswith("#")]
    body = "\n".join(lines).replace("...", "…")
    body = re.sub(r"\n\s*\n+", " ¶ ", body)          # beat break
    body = body.replace("\n", " ")
    tokens = re.split(r"(\[[^\]]*\]|¶)", body)
    sents, cur, lead = [], "", 0.0

    def flush(term=""):
        nonlocal cur
        t = cur.strip()
        cur = ""
        if t and WORDCH.search(t):
            sents.append({"text": t + (term if term else ""), "term": term or ".", "pause_after": 0.0, "para_break": False})
            return True
        return False

    for tok in tokens:
        if tok == "¶":
            flush()
            if sents: sents[-1]["para_break"] = True
            continue
        m = PAUSE.fullmatch(tok.strip()) if tok.startswith("[") else None
        if m:
            flush()
            sec = float(m.group(1)) if m.group(1) else 0.3
            if sents: sents[-1]["pause_after"] += sec
            else: lead += sec
            continue
        if tok.startswith("["):  # unknown bracket marker: ignore, never spoken
            continue
        i = 0
        while i < len(tok):
            ch = tok[i]
            prev_word = re.split(r"\s", (cur + "x")[:-1])[-1] if ch == "." else ""
            is_abbr = ch == "." and (prev_word.lower().strip("(\"'") in ABBR or re.fullmatch(r"[A-Z]", prev_word) is not None)
            if ch in "।?!…" or (ch == "." and not is_abbr and (i + 1 == len(tok) or tok[i + 1].isspace())):
                j = i
                while j + 1 < len(tok) and tok[j + 1] in "।?!.…\"'”’)":
                    j += 1
                run = tok[i:j + 1]
                term = "?" if "?" in run else "!" if "!" in run else "…" if "…" in run else "।" if "।" in run else "."
                if flush(run):
                    sents[-1]["term"] = term
                i = j + 1
                continue
            cur += ch
            i += 1
    flush()
    for s in sents:
        clean = s["text"].replace("*", "")
        s["clean"] = clean
        s["words"] = [w for w in clean.split() if WORDCH.search(w)]
        s["n"] = len(s["words"])
        s["ellipsis"] = clean.count("…")
        s["exclaim"] = clean.count("!")
        s["question"] = s["term"] == "?"
    return sents, lead

def strip_tok(w):
    return re.sub(r"^[^\wऀ-ॣ०-ॿ]+|[^\wऀ-ॣ०-ॿ]+$", "", w)

def script_of(w):
    d, r = len(DEV.findall(w)), len(ROM.findall(w))
    return "dev" if d > r else "rom" if r else ("num" if DIGITS.search(w) else "other")

# ---------------------------------------------------------------- analysis helpers
def entities(s, idx, seen, names):
    """new named entities / numbers in the sentence (heuristic): digits, number words (a run counts once), units with numbers,
    Roman capitalised words not at sentence start, and user-supplied names (--names)."""
    out, prev_num = [], False
    ws = [strip_tok(w) for w in s["words"]]
    joined = " " + norm(s["clean"]) + " "
    for nm in names:
        if (" " + norm(nm) + " ") in joined and norm(nm) not in seen:
            out.append(nm); seen.add(norm(nm))
    for k, w in enumerate(ws):
        if not w: continue
        lw = w.lower()
        isnum = bool(DIGITS.search(w)) or lw in NUMWORDS
        if isnum:
            if not prev_num and lw not in seen:
                out.append(w); seen.add(lw)
            prev_num = True
            continue
        prev_num = False
        if k > 0 and ROM.match(w[0]) and w[0].isupper() and len(w) > 1 and lw not in STOP and lw not in seen:
            out.append(w); seen.add(lw)
    return out

def content_words(s):
    return {norm(strip_tok(w)) for w in s["words"] if len(strip_tok(w)) >= 3 and norm(strip_tok(w)) not in STOP and norm(strip_tok(w)) not in [norm(q) for q in QWORDS]}

def has_phrase(text, ph):
    return (" " + norm(ph) + " ") in (" " + norm(text) + " ")

def opener(s, n=1):
    ws = [norm(strip_tok(w)) for w in s["words"][:n]]
    return " ".join(w for w in ws if w)

def intensity(s, names_hit):
    v = 3.0 + 2.0 * min(s["exclaim"], 1) + 1.0 * s["question"] + 0.5 * min(s["ellipsis"], 1)
    if s["n"] <= 3: v += 2.5
    elif s["n"] <= 6: v += 1.5
    elif s["n"] >= 18: v -= 1.0
    t = s["clean"]
    v += 1.0 * any(has_phrase(t, c) for c in CONTRAST) + 1.0 * any(has_phrase(t, c) for c in INTENS) + 0.5 * min(names_hit, 2)
    return max(1.0, min(10.0, v))

def spark(vals):
    bars = "▁▂▃▄▅▆▇█"
    return "".join(bars[min(7, max(0, int((v - 1) / 9 * 7.999)))] for v in vals)

def short(t, n=70):
    return t if len(t) <= n else t[: n - 1] + "…"

def split_hint(s):
    """propose a split point at a conjunction near the middle of a long sentence"""
    ws = s["words"]
    best = None
    for k in range(2, len(ws) - 2):
        w = norm(strip_tok(ws[k]))
        if w in [norm(c) for c in CONJ] or ws[k - 1].endswith(","):
            score = abs(k - len(ws) / 2)
            if best is None or score < best[0]: best = (score, k)
    if best is None: return None
    k = best[1]
    return " ".join(ws[:k]).rstrip(",") + "। / " + " ".join(ws[k:])

# ---------------------------------------------------------------- main analysis
def analyse(text, wps=2.6, rate=1.0, lang="hinglish", target=None, words_json=None, names=(), allow_length=False):
    sents, lead = parse(text)
    if not sents:
        raise ValueError("no sentences found")
    eff = wps * rate
    findings, hard = [], []
    def add(kind, sev, idx, problem, suggestion):
        findings.append({"type": kind, "severity": sev, "sentences": idx, "problem": problem, "suggestion": suggestion})

    # implicit pauses at beat breaks without explicit pauses
    for s in sents:
        s["pause"] = s["pause_after"] if s["pause_after"] > 0 else (0.25 if s["para_break"] else 0.0)
    total_words = sum(s["n"] for s in sents)
    # timing: either real TTS timings or estimate
    t = lead
    for s in sents:
        s["start"] = t; s["dur"] = s["n"] / eff; t += s["dur"]; s["end"] = t; t += s["pause"]
    duration = t - sents[-1]["pause"]
    source = "estimate"
    if words_json:
        ws = json.load(open(words_json, encoding="utf-8"))
        ws = ws.get("words", ws) if isinstance(ws, dict) else ws
        if ws:
            duration = float(ws[-1]["end"]); source = "words.json"
            k = 0
            for s in sents:   # align by word count (TTS word grouping may differ slightly)
                a = min(k, len(ws) - 1); b = min(k + s["n"] - 1, len(ws) - 1)
                s["start"], s["end"] = float(ws[a]["start"]), float(ws[b]["end"]); s["dur"] = s["end"] - s["start"]; k += s["n"]
    pauses = [s["pause"] for s in sents if s["pause"] > 0]
    pause_total = sum(pauses) + lead
    speech_time = max(duration - pause_total, 0.1)
    measured_wps = total_words / speech_time
    if target:
        need = total_words / max(target - pause_total, 0.1)
    else:
        need = None

    # ---- lengths
    lens = [s["n"] for s in sents]
    mean = statistics.mean(lens); sd = statistics.pstdev(lens) if len(lens) > 1 else 0.0
    cv = sd / mean if mean else 0.0
    bins = [("1-3", 1, 3), ("4-6", 4, 6), ("7-10", 7, 10), ("11-15", 11, 15), ("16-20", 16, 20), ("21+", 21, 10 ** 6)]
    hist = {name: sum(1 for x in lens if a <= x <= b) for name, a, b in bins}
    if cv < 0.3 and len(sents) >= 5:
        add("LOW_VARIATION", "high", list(range(1, len(sents) + 1)), f"sentence lengths barely vary (CV {cv:.2f}; mean {mean:.1f} words)",
            "mix registers: make the reveal a 2-4 word punch, let one atmospheric sentence run 14-20 words, keep explanations medium (8-12). Do not equalise.")
    shortfrac = sum(1 for x in lens if x <= 4) / len(lens)
    if shortfrac > 0.5 and len(sents) >= 6:
        add("CHOPPY", "medium", [i + 1 for i, x in enumerate(lens) if x <= 4], f"{shortfrac:.0%} of sentences are 4 words or fewer: every line sounds like a trailer",
            "merge pairs of short lines into medium explanatory sentences; keep short punches only for reveals and turns.")
    longfrac = sum(1 for x in lens if x >= 18) / len(lens)
    if longfrac > 0.35:
        add("HEAVY", "medium", [i + 1 for i, x in enumerate(lens) if x >= 18], f"{longfrac:.0%} of sentences are 18+ words: hard to follow by ear",
            "split at the conjunctions; give each fact its own sentence.")
    # monotone runs: >= 4 consecutive sentences within +-2 words of each other with the same terminator family
    i = 0
    while i < len(sents) - 3:
        j = i
        while j + 1 < len(sents) and abs(sents[j + 1]["n"] - sents[i]["n"]) <= 2 and abs(sents[j + 1]["n"] - sents[j]["n"]) <= 2 and sents[j + 1]["question"] == sents[i]["question"]:
            j += 1
        if j - i + 1 >= 4:
            idx = list(range(i + 1, j + 2))
            a, b = sents[i], sents[i + 1]
            add("MONOTONE_RUN", "high", idx, f"sentences {idx[0]}-{idx[-1]} are all {min(lens[i:j+1])}-{max(lens[i:j+1])} words with the same shape ({len(idx)} in a row)",
                f"break the pattern: merge S{idx[0]}+S{idx[1]} into one flowing sentence (\"{short(a['clean'].rstrip('।.!?'), 35)}, {short(b['clean'], 35)}\"), "
                f"or cut S{idx[-1]} to a 2-3 word beat, or turn one into a question that the next line answers.")
            i = j + 1
        else:
            i += 1
    # long sentences
    for k, s in enumerate(sents):
        if s["n"] > 22:
            h = split_hint(s)
            add("TOO_LONG", "medium", [k + 1], f"S{k+1} has {s['n']} words (~{s['n']/eff:.1f} s in one breath)",
                f"split it: \"{short(h, 110)}\"" if h else "split it into two sentences; one idea each.")

    # ---- openers and repeated structures
    ops = [opener(s) for s in sents]; ops2 = [opener(s, 2) for s in sents]
    k, in_run = 1, set()
    while k < len(sents):
        if ops[k] and ops[k] == ops[k - 1] and sents[k]["n"] > 2:
            j = k
            while j + 1 < len(sents) and ops[j + 1] == ops[k]: j += 1
            idx = list(range(k, j + 2)); in_run.update(idx)
            keep = "keep the first; " if len(idx) > 2 else ""
            add("REPEATED_OPENER", "high" if len(idx) >= 4 else "medium", idx, f"{len(idx)} sentences in a row start with \"{ops[k]}\" (S{idx[0]}-S{idx[-1]})",
                f"{keep}start S{idx[1]} with its subject or a time/place (\"{short(' '.join(sents[idx[1]-1]['words'][1:]), 40)}\"), or join two with a contrast/cause (लेकिन / इसलिए).")
            k = j + 1
        else:
            k += 1
    c2 = Counter(o for o in ops2 if o and len(o.split()) == 2)
    for o, n in c2.items():
        idx = [k + 1 for k, x in enumerate(ops2) if x == o]
        if n >= 3 and not set(idx) <= in_run:
            add("REPEATED_OPENER", "medium", idx, f"{n} sentences open with \"{o}\"", "vary the openers; keep the repetition only if it is a deliberate callback (max 2).")
    c1 = Counter(o for o in ops if o)
    for o, n in c1.items():
        idx = [k + 1 for k, x in enumerate(ops) if x == o]
        if n >= 4 and n / len(sents) > 0.2 and not set(idx) <= in_run:
            add("REPEATED_OPENER", "low", idx, f"{n} sentences open with \"{o}\" across the script", "rephrase two of them so the ear does not hear a template.")
    shape = [(min(s["n"] // 4, 4), s["term"]) for s in sents]
    k = 0
    while k < len(shape) - 2:
        if shape[k] == shape[k + 1] == shape[k + 2] and not any(f["type"] == "MONOTONE_RUN" and k + 1 in f["sentences"] for f in findings):
            add("REPEATED_STRUCTURE", "low", [k + 1, k + 2, k + 3], f"S{k+1}-S{k+3} have the same length band and ending",
                "change one: add a question, a contrast (लेकिन/पर), or a longer descriptive line.")
            k += 3
        else:
            k += 1
    # repeated trigrams
    grams = Counter()
    toks = [norm(strip_tok(w)) for s in sents for w in s["words"]]
    for a in range(len(toks) - 2):
        g = tuple(toks[a:a + 3])
        if sum(1 for w in g if w not in STOP) >= 2: grams[g] += 1
    for g, n in grams.items():
        if n >= 2:
            add("REPEATED_PHRASE", "low", [], f"phrase \"{' '.join(g)}\" occurs {n} times", "keep one; the second time use a fresher image (or make it an intentional callback at the end).")

    # ---- banned / filler / formal / ellipsis
    full = " ".join(s["clean"] for s in sents)
    banned_hit = []   # (phrase, sentence) already reported, so "दोस्तों" is not reported again inside "तो दोस्तों"
    for ph in sorted(BANNED_OPENERS, key=len, reverse=True):
        hits = [k + 1 for k, s in enumerate(sents) if has_phrase(s["clean"], ph) and not any(k + 1 == b and norm(ph) in norm(p) for p, b in banned_hit)]
        lim = REPEAT_LIMITED.get(ph, 0)
        banned_hit += [(ph, h) for h in hits]
        if len(hits) > lim:
            add("BANNED_PHRASE", "high", hits, f"\"{ph}\" used {len(hits)}x", "cut it: start inside the story (an image, a fact, a contradiction).")
    for ph, lim in REPEAT_LIMITED.items():
        if ph in BANNED_OPENERS: continue
        hits = [k + 1 for k, s in enumerate(sents) if has_phrase(s["clean"], ph)]
        if len(hits) > lim:
            add("REPEATED_DEVICE", "medium", hits, f"\"{ph}\" used {len(hits)}x", "use the device once at most.")
    for ph, sug in FILLERS.items():
        hits = [k + 1 for k, s in enumerate(sents) if has_phrase(s["clean"], ph)]
        if hits: add("FILLER", "medium", hits, f"filler \"{ph}\"", sug)
    if lang != "english":
        for w, rep in FORMAL.items():
            hits = [k + 1 for k, s in enumerate(sents) if has_phrase(s["clean"], w)]
            if hits: add("FORMAL", "low", hits, f"bookish \"{w}\"", f"spoken Hindi: \"{rep}\"")
    ell = sum(s["ellipsis"] for s in sents)
    if ell > max(2, round(duration / 25)):
        add("ELLIPSIS", "medium", [k + 1 for k, s in enumerate(sents) if s["ellipsis"]], f"{ell} ellipses: the narration drags and sounds fake-suspenseful",
            "keep at most one; replace the rest with a full stop, an em dash, or [pause 0.3].")
    exc = sum(1 for s in sents if s["exclaim"])
    if exc / len(sents) > 0.25:
        add("OVERDRAMATIC", "medium", [k + 1 for k, s in enumerate(sents) if s["exclaim"]], f"{exc} exclamations in {len(sents)} sentences",
            "a calm voice stating an extraordinary fact hits harder; keep '!' for one peak.")

    # ---- questions answered?
    qs = [k for k, s in enumerate(sents) if s["question"]]
    unanswered = []
    for k in qs:
        cw = content_words(sents[k])
        ans = [m for m in range(k + 1, len(sents)) if not sents[m]["question"] and (cw & content_words(sents[m]))]
        nxt = k + 1 < len(sents) and not sents[k + 1]["question"]
        if not ans and not nxt: unanswered.append(k + 1)
        sents[k]["answered_by"] = (ans[0] + 1) if ans else ((k + 2) if nxt else None)
    for k in unanswered:
        add("UNANSWERED_QUESTION", "high", [k], f"S{k} asks a question nothing later answers: \"{short(sents[k-1]['clean'])}\"",
            "answer it (ideally at the revelation) or turn it into a statement.")
    if len(qs) / len(sents) > 0.3:
        add("TOO_MANY_QUESTIONS", "medium", [k + 1 for k in qs], f"{len(qs)} of {len(sents)} sentences are questions",
            "keep 1-3 real curiosity questions; state the rest.")

    # ---- density
    seen, dens = set(), []
    for k, s in enumerate(sents):
        e = entities(s, k, seen, names)
        s["entities"] = e; dens.append(len(e))
        nums = sum(1 for w in e if DIGITS.search(w) or w.lower() in NUMWORDS)
        if len(e) >= 3 or nums >= 2:
            add("DENSE", "medium" if len(e) < 4 else "high", [k + 1], f"S{k+1} packs {len(e)} new names/numbers ({', '.join(e)})",
                "give each number its own beat, round or drop the least important one, or move a name to the visual.")

    # ---- pauses / beats
    gaps, run_start = [], sents[0]["start"]
    for k, s in enumerate(sents):
        if s["pause"] >= 0.25 or k == len(sents) - 1:
            gaps.append((run_start, s["end"], k + 1)); run_start = s["end"] + s["pause"]
    longest = max(gaps, key=lambda g: g[1] - g[0])
    if longest[1] - longest[0] > 14:
        a = next(k for k, s in enumerate(sents) if s["start"] >= longest[0] - 1e-6)
        mid = max(range(a, longest[2]), key=lambda m: intensity(sents[m], len(sents[m]["entities"])))
        add("NO_BEAT", "medium", list(range(a + 1, longest[2] + 1)), f"{longest[1]-longest[0]:.0f} s of continuous speech without a pause ({longest[0]:.1f}-{longest[1]:.1f} s)",
            f"add [pause 0.3] after S{mid+1} (the strongest line in the stretch) or a blank-line beat break.")
    for k, s in enumerate(sents):
        if s["pause"] > 1.2:
            add("DEAD_AIR", "medium", [k + 1], f"{s['pause']:.1f} s pause after S{k+1}", "Shorts drop off on silence: keep pauses under 1 s unless a visual carries it.")

    # ---- intensity curve
    inten = [intensity(s, len(s["entities"])) for s in sents]
    for s, v in zip(sents, inten): s["intensity"] = round(v, 1)
    buckets = []
    step = 5.0
    nb = max(1, math.ceil(duration / step))
    for b in range(nb):
        vs = [v for s, v in zip(sents, inten) if b * step <= (s["start"] + s["end"]) / 2 < (b + 1) * step]
        buckets.append(round(statistics.mean(vs), 1) if vs else (buckets[-1] if buckets else 3.0))
    peak_k = max(range(len(sents)), key=lambda k: (inten[k], k))
    peak_t = (sents[peak_k]["start"] + sents[peak_k]["end"]) / 2
    if statistics.pstdev(inten) < 0.8 and len(sents) >= 6:
        add("FLAT_INTENSITY", "medium", [], "dramatic intensity is flat from start to end", "build: calm context, rising escalation, one clear peak at the revelation, a quieter memorable ending.")
    if duration > 20 and peak_t / duration < 0.2:
        add("FRONT_LOADED", "low", [peak_k + 1], f"the most intense line is at {peak_t:.0f} s of {duration:.0f} s", "save the biggest reveal for 40-75% of the runtime; the hook can tease it.")

    # ---- hook (first 3 s of speech)
    hook_words, acc = [], 0.0
    for s in sents:
        for w in s["words"]:
            if acc >= 3.0: break
            hook_words.append(w); acc += 1 / eff
    hook_text = " ".join(hook_words)
    first = sents[0]
    hook_banned = [ph for ph in BANNED_OPENERS if norm(first["clean"]).startswith(norm(ph)) or has_phrase(hook_text, ph)]
    hscore, hnotes = 5, []
    if hook_banned: hscore -= 4; hnotes.append(f"banned opener \"{hook_banned[0]}\"")
    if first["n"] <= 12: hscore += 1; hnotes.append(f"first sentence {first['n']} words (good)")
    else: hscore -= 1; hnotes.append(f"first sentence {first['n']} words: the hook should land within ~3 s")
    if first["entities"] or DIGITS.search(first["clean"]): hscore += 1; hnotes.append("concrete name/number")
    if any(has_phrase(first["clean"], c) for c in CONTRAST): hscore += 1; hnotes.append("contrast/contradiction")
    if first["question"] and first.get("answered_by"): hscore += 1; hnotes.append(f"question answered at S{first['answered_by']}")
    if any(has_phrase(first["clean"], f) for f in FILLERS): hscore -= 2; hnotes.append("filler in the hook")
    hscore = max(1, min(10, hscore))
    if hook_banned:
        hard.append(f"banned opener in the hook: \"{hook_banned[0]}\"")
        add("HOOK", "high", [1], f"hook opens with \"{hook_banned[0]}\"", "open inside the story: the strangest true detail, a contradiction, or a dramatic moment.")
    elif first["n"] > 14:
        add("HOOK", "medium", [1], f"hook sentence is {first['n']} words", f"cut it to the first striking clause: \"{short(' '.join(first['words'][:10]))}…\"")

    # ---- Hinglish ratio
    sc = Counter(script_of(strip_tok(w)) for s in sents for w in s["words"] if strip_tok(w))
    dev, rom = sc.get("dev", 0), sc.get("rom", 0)
    ratio = {"devanagari": dev, "roman": rom, "numeric": sc.get("num", 0), "romanShare": round(rom / max(dev + rom, 1), 2)}
    if lang == "hinglish" and dev and rom / max(dev + rom, 1) > 0.45:
        add("TOO_MUCH_ENGLISH", "medium", [], f"{ratio['romanShare']:.0%} of words are Roman-script English", "keep everyday English words (plan, power, signal) but tell the story in Hindi.")
    if lang == "hindi" and rom / max(dev + rom, 1) > 0.15:
        add("TOO_MUCH_ENGLISH", "low", [], f"{ratio['romanShare']:.0%} Roman-script words in a pure-Hindi script", "write loanwords in Devanagari or replace them.")

    # ---- hard limits
    if not allow_length and not (HARD_MIN <= duration <= HARD_MAX):
        hard.append(f"duration {duration:.1f} s outside {HARD_MIN:.0f}-{HARD_MAX:.0f} s (use --allow-length to override)")
    if eff > WPS_MAX:
        hard.append(f"speaking rate {eff:.2f} words/s above {WPS_MAX} (too fast to follow)")
    if need is not None and need > WPS_MAX:
        hard.append(f"to fit {target:.0f} s the voice would need {need:.2f} words/s (> {WPS_MAX}): cut words")
    if source == "words.json" and measured_wps > WPS_MAX:
        hard.append(f"measured TTS rate {measured_wps:.2f} words/s above {WPS_MAX}")

    sev_order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: (sev_order[f["severity"]], f["sentences"][0] if f["sentences"] else 0))
    verdict = "FAIL" if hard else ("REVISE" if any(f["severity"] == "high" for f in findings) or sum(f["severity"] == "medium" for f in findings) >= 4 else "PASS")
    return {
        "verdict": verdict, "hardFailures": hard, "timingSource": source,
        "durationSec": round(duration, 2), "words": total_words, "wps": round(eff, 2), "measuredWps": round(measured_wps, 2),
        "requiredWpsForTarget": round(need, 2) if need else None,
        "sentences": len(sents),
        "lengths": {"values": lens, "mean": round(mean, 2), "std": round(sd, 2), "cv": round(cv, 2), "min": min(lens), "max": max(lens), "histogram": hist},
        "pauses": {"count": len(pauses) + (1 if lead else 0), "totalSec": round(pause_total, 2), "meanSec": round(statistics.mean(pauses), 2) if pauses else 0,
                    "longestRunWithoutPauseSec": round(longest[1] - longest[0], 1), "at": [round(s["end"], 2) for s in sents if s["pause"] > 0]},
        "ellipses": ell, "questions": {"count": len(qs), "unanswered": unanswered},
        "density": {"perSentence": dens, "mean": round(statistics.mean(dens), 2), "max": max(dens)},
        "hook": {"text": hook_text, "firstSentenceWords": first["n"], "score": hscore, "notes": hnotes, "banned": hook_banned},
        "intensity": {"perSentence": [round(v, 1) for v in inten], "per5s": buckets, "curve": spark(buckets), "peakSentence": peak_k + 1, "peakSec": round(peak_t, 1)},
        "hinglish": ratio,
        "findings": findings,
        "sentenceTable": [{"i": k + 1, "start": round(s["start"], 2), "words": s["n"], "intensity": s["intensity"], "entities": s["entities"], "text": s["clean"]} for k, s in enumerate(sents)],
    }

def report(r):
    L = []
    L.append(f"RHYTHM REPORT — verdict {r['verdict']}")
    L.append(f"duration {r['durationSec']:.1f} s ({r['timingSource']}) | {r['words']} words | {r['wps']} words/s (speech-only {r['measuredWps']}) | {r['sentences']} sentences")
    if r["requiredWpsForTarget"]: L.append(f"to hit the target duration the voice needs {r['requiredWpsForTarget']} words/s")
    l = r["lengths"]
    L.append(f"sentence length: mean {l['mean']} std {l['std']} CV {l['cv']} (healthy 0.35-0.9) min {l['min']} max {l['max']}")
    L.append("histogram: " + "  ".join(f"{k}:{'#' * v}{v}" for k, v in l["histogram"].items()))
    p = r["pauses"]
    L.append(f"pauses: {p['count']} totalling {p['totalSec']} s, mean {p['meanSec']} s; longest run without a pause {p['longestRunWithoutPauseSec']} s")
    L.append(f"ellipses {r['ellipses']} | questions {r['questions']['count']} (unanswered: {r['questions']['unanswered'] or 'none'}) | density mean {r['density']['mean']} max {r['density']['max']}")
    h = r["hook"]
    L.append(f"hook (first 3 s): \"{h['text']}\" -> {h['score']}/10 ({'; '.join(h['notes'])})")
    i = r["intensity"]
    L.append(f"intensity per 5 s: {i['curve']}  {i['per5s']}  peak S{i['peakSentence']} at {i['peakSec']} s")
    hg = r["hinglish"]
    L.append(f"script mix: Devanagari {hg['devanagari']} | Roman {hg['roman']} | numeric {hg['numeric']} | Roman share {hg['romanShare']:.0%}")
    L.append("")
    L.append("sentences:")
    for s in r["sentenceTable"]:
        L.append(f"  S{s['i']:<3}{s['start']:6.1f}s {s['words']:>3}w  int {s['intensity']:>4}  {short(s['text'], 80)}")
    L.append("")
    if r["hardFailures"]:
        L.append("HARD FAILURES:")
        L += [f"  ✗ {x}" for x in r["hardFailures"]]
    if r["findings"]:
        L.append("FINDINGS + REWRITE SUGGESTIONS:")
        for f in r["findings"]:
            where = ("S" + ",S".join(map(str, f["sentences"][:8])) + ("…" if len(f["sentences"]) > 8 else "")) if f["sentences"] else "-"
            L.append(f"  [{f['severity'].upper():6}] {f['type']:<20} {where}: {f['problem']}")
            L.append(f"           -> {f['suggestion']}")
    else:
        L.append("no findings.")
    return "\n".join(L)

def parse_rate(s):
    m = re.fullmatch(r"([+-]?\d+(?:\.\d+)?)%", s.strip())
    if not m: raise argparse.ArgumentTypeError("voice rate like +10% or -5%")
    return 1 + float(m.group(1)) / 100

def main(argv=None):
    ap = argparse.ArgumentParser(description="BHARAT STORYTELLER rhythm analyser")
    ap.add_argument("file")
    ap.add_argument("--wps", type=float, default=2.6, help="words/second of the voice at rate +0%% (default 2.6 for Hinglish TTS)")
    ap.add_argument("--voice-rate", type=parse_rate, default=1.0, help="TTS rate like +10%% (multiplies --wps)")
    ap.add_argument("--lang", choices=["hinglish", "hindi", "english"], default="hinglish")
    ap.add_argument("--target-sec", type=float)
    ap.add_argument("--words-json", help="real TTS word timings [{word,start,end}] (overrides the estimate)")
    ap.add_argument("--names", default="", help="comma-separated proper names (helps density detection in Devanagari)")
    ap.add_argument("--names-file")
    ap.add_argument("--allow-length", action="store_true")
    ap.add_argument("--strict", action="store_true", help="exit 2 when the verdict is REVISE")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    try:
        text = open(a.file, encoding="utf-8").read()
    except OSError as e:
        print(f"cannot read {a.file}: {e}", file=sys.stderr); return 3
    names = [n.strip() for n in a.names.split(",") if n.strip()]
    if a.names_file: names += [n.strip() for n in open(a.names_file, encoding="utf-8").read().replace(",", "\n").splitlines() if n.strip()]
    try:
        r = analyse(text, a.wps, a.voice_rate, a.lang, a.target_sec, a.words_json, names, a.allow_length)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr); return 3
    print(json.dumps(r, ensure_ascii=False, indent=2) if a.json else report(r))
    if r["verdict"] == "FAIL": return 1
    if a.strict and r["verdict"] == "REVISE": return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())
