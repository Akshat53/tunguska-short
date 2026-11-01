# Soundtrack of "Tunguska": an original quiet score + synthesized SFX + the narration, mixed to the picture.
# Picture constants mirror src/videos/tunguska/story.ts (frames at 30 fps). Rules:
#   - one chord per story beat (the chord changes only where the beat/scene changes)
#   - percussion ONLY at the four hits under the falling ring (HITS)
#   - voice unchanged and on top; music ducked under speech; SFX below the voice
# Usage: python score.py  ->  audio/out/{music,sfx,voice48,mix_pre}.wav (48 kHz stereo, exact picture length)
import json, os
import numpy as np
from scipy import signal
from dsp import SR, ns, tt, rng, lp, hp, bp, dbg, place, fades, write_wav, read_wav, make_ir, convolve_st, integrated, colored, phase, widen, pan
import instruments as I
import sfx_gen as X
from synth import st2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.environ.get("AUDIO_OUT", os.path.join(HERE, "out"))
os.makedirs(OUT, exist_ok=True)
FPS, TOTAL = 30, 2078            # TOTAL = length of the picture timeline the cues below were authored on
STORY = os.environ.get("STORY", "tunguska")   # which src/videos/<story>/ the storyboard + warp come from (default: Tunguska, unchanged)
VOICE_WAV = os.path.join(ROOT, os.environ.get("VOICE_WAV", os.path.join("voice", "voice.wav")))
WORDS_JSON = os.path.join(ROOT, os.environ.get("WORDS_JSON", os.path.join("voice", "words.json")))
WARP = json.load(open(os.path.join(ROOT, "src", "videos", STORY, "warp.json")))
_A = WARP["anchors"]             # [[newFrame, oldFrame], ...]: the picture/voice time warp (scripts/warp.py)
DUR = WARP["outFrames"] / FPS    # output length = current voice length
N = ns(DUR)
def F(f):
    """story frame (old timeline) -> seconds on the output timeline"""
    for k in range(len(_A) - 1):
        if f <= _A[k + 1][1] or k == len(_A) - 2:
            (n0, o0), (n1, o1) = _A[k], _A[k + 1]
            return (n0 + (f - o0) * (n1 - n0) / (o1 - o0)) / FPS

# music + SFX design lives in audio/cues.json (cues.py plays it); beats get their frame ranges from storyboard SHOT ids
import cues as C
SB = json.load(open(os.path.join(ROOT, "src", "videos", STORY, "storyboard.json")))
CFG = C.load()
BEATS = C.beats(CFG, SB)
CH, BASS = CFG["music"]["chords"], CFG["music"]["bass"]
LEVEL = {b["name"]: b["level"] for b in CFG["music"]["beats"]}
HITS = SB["events"]["hits"]  # single source: the storyboard
if STORY == "tunguska": assert HITS == [772, 791, 835, 866], HITS
ARP_STEP = CFG["music"].get("arp_step", 0.3)      # plucked arpeggio step (s); Tunguska 0.3 (100 bpm eighths)
ARP_LEVEL = CFG["music"].get("arp_level", 1.0)


def music():
    r = rng(1908)
    out = np.zeros((2, N))
    for name, a, b, ch in BEATS:
        t0, d = F(a), (F(b) - F(a))
        lv = LEVEL[name]
        notes = CH[ch]
        # warm pad on the chord (slow attack, overlaps into the next beat by its release)
        place(out, I.pad([I.m2f(m) for m in notes[:4]], d, 0.32 * lv, r, att=0.5, rel=0.8, warm=1100), t0)
        place(out, I.pad([I.m2f(BASS[ch])], d, 0.30 * lv, r, att=0.4, rel=0.8, warm=400), t0)
        # plucked arpeggio, 100 bpm eighths (0.3 s), over the same chord: the pulse of the beat
        step = ARP_STEP
        k = 0
        tm = t0 + 0.05
        while tm < t0 + d - 0.2:
            m = notes[[0, 2, 1, 3, 2, 4, 3, 2][k % 8]] + 12
            place(out, pan(I.pluck(I.m2f(m), 0.22 * lv * ARP_LEVEL, r, dur=0.9, bright=0.35), 0.3 * np.sin(k)), tm)
            tm += step
            k += 1
        # a soft glockenspiel bell on the downbeat of each beat
        place(out, pan(I.glock(I.m2f(notes[-1] + 12), 0.25 * lv, r), 0.2), t0 + 0.02)
    # the four hits: timpani + clash, nothing else is percussion
    for h in HITS:
        place(out, I.timpani(I.m2f(38), 0.9, r), F(h) - 0.004)
        place(out, widen(I.cymbal(0.45, r, dur=1.8), r, 9, 0.6), F(h))
    ir = make_ir(1.6, 3, hf=0.6)
    wet = convolve_st(out, ir)[:, :N]
    return 0.8 * out + 0.25 * wet


SHEET = []


def sfx():
    out, sheet = C.run(CFG, F, N)
    SHEET[:] = sheet
    return out


def voice48():
    v, sr = read_wav(VOICE_WAV)
    v = v.mean(0)
    v = signal.resample_poly(v, 160, 147) if sr == 44100 else v
    y = np.zeros(N)
    y[: min(N, len(v))] = v[:N]
    return np.stack([y, y])


def speech_mask(words, pre=0.08, post=0.15):
    m = np.zeros(N)
    for w in words:
        a, b = ns(max(0, w["start"] - pre)), ns(min(DUR, w["end"] + post))
        m[a:b] = 1
    k = np.ones(ns(0.12)) / ns(0.12)
    return np.clip(np.convolve(m, k, "same"), 0, 1)


def main():
    words = json.load(open(WORDS_JSON))
    v = voice48()
    m = music()
    s = sfx()
    lv = integrated(v)
    # music bed ~13 dB under the voice, ducked a further 4 dB while words are spoken; SFX ~6 dB under the voice
    m *= dbg(lv - 10.5 - integrated(m))
    duck = 1 - (1 - dbg(-4)) * speech_mask(words)
    m *= duck[None, :]
    s_l = integrated(s)
    s *= dbg(lv - 8 - s_l)
    mix = v + m + s
    pk = np.abs(mix).max()
    if pk > 0.98:
        mix *= 0.98 / pk
    mf = CFG.get("master", {})                       # optional master fades (seconds); 0 = off
    if mf.get("fade_in"): mix[:, : ns(mf["fade_in"])] *= np.linspace(0, 1, ns(mf["fade_in"]))
    if mf.get("fade_out"): mix[:, -ns(mf["fade_out"]):] *= np.linspace(1, 0, ns(mf["fade_out"]))
    json.dump({"pre_scale_peak": float(pk), "scaled_db": float(20 * np.log10(0.98 / pk)) if pk > 0.98 else 0.0}, open(os.path.join(OUT, "audio_stats.json"), "w"))
    for name, x in [("music", m), ("sfx", s), ("voice48", v), ("mix_pre", mix)]:
        write_wav(os.path.join(OUT, f"{name}.wav"), x)
    print("LUFS voice %.1f music %.1f sfx %.1f mix %.1f  len %.3f s" % (integrated(v), integrated(m), integrated(s), integrated(mix), mix.shape[1] / SR))


if __name__ == "__main__":
    main()
