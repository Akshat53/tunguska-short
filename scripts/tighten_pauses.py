# usage: .venv/bin/python scripts/tighten_pauses.py <voice_dir> [cap_s=0.35] [comma_cap_s=0.22]
# Smooths a TTS narration: every silence between words longer than the cap is shortened to the cap (sentence ends, after
# "। ? !") or comma_cap (inside a sentence). Cuts are made in the middle of the silence with 15 ms fades, so no clicks.
# Reads <dir>/voice.wav + words.json; writes voice.wav / words.json in place, keeping the originals as voice.loose.wav /
# words.loose.json (re-running starts from the .loose files, so it is idempotent).
import json, os, sys, shutil, wave
import numpy as np

D = sys.argv[1]
CAP = float(sys.argv[2]) if len(sys.argv) > 2 else 0.35
CCAP = float(sys.argv[3]) if len(sys.argv) > 3 else 0.22
P = lambda n: os.path.join(D, n)
for a, b in (("voice.wav", "voice.loose.wav"), ("words.json", "words.loose.json")):
    if not os.path.exists(P(b)): shutil.copy(P(a), P(b))

with wave.open(P("voice.loose.wav")) as w:
    sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
assert ch == 1 and sw == 2, "expects 16-bit mono (make_voice.py output)"
words = json.load(open(P("words.loose.json"), encoding="utf-8"))
text = open(P("narration.txt"), encoding="utf-8").read()

# sentence-end flags: walk the narration text to find which words end with a full stop / ? / !
ends, pos = [], 0
for wd in words:
    k = text.find(wd["word"], pos)
    if k < 0: ends.append(False); continue
    pos = k + len(wd["word"])
    tail = text[pos:pos + 3]
    ends.append(any(c in tail[:2] for c in "।?!.\n"))

FADE = int(0.015 * sr)
ramp = np.linspace(1, 0, FADE, dtype=np.float32)
out, shift, cur, new_words = [], 0.0, 0, []
cuts = []  # (time in old timeline, seconds removed)
for i, wd in enumerate(words):
    if i + 1 < len(words):
        g0, g1 = wd["end"], words[i + 1]["start"]
        cap = CAP if ends[i] else CCAP
        if g1 - g0 > cap + 0.03:
            remove = (g1 - g0) - cap
            mid = (g0 + g1) / 2
            cuts.append((mid, remove))
cuts.sort()
# rebuild audio: keep [cur, mid - remove/2] then jump to mid + remove/2, fading across the joint
for mid, remove in cuts:
    a, b = int((mid - remove / 2) * sr), int((mid + remove / 2) * sr)
    seg = x[cur:a].copy()
    if len(seg) > FADE: seg[-FADE:] *= ramp
    out.append(seg)
    nxt = x[b:b + FADE].copy(); x[b:b + len(nxt)] = nxt * ramp[::-1][:len(nxt)]
    cur = b
out.append(x[cur:])
y = np.concatenate(out)

def remap(t):
    return t - sum(r for m, r in cuts if m < t)
for wd in words:
    new_words.append({**wd, "start": round(remap(wd["start"]), 3), "end": round(remap(wd["end"]), 3)})

with wave.open(P("voice.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes())
json.dump(new_words, open(P("words.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"tightened {len(cuts)} pauses, removed {sum(r for _, r in cuts):.1f}s: {len(x)/sr:.2f}s -> {len(y)/sr:.2f}s")
