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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
FPS, TOTAL = 30, 2078
DUR = TOTAL / FPS
N = ns(DUR)
F = lambda f: f / FPS

# story beats (frames) and their chord: one chord per scene
BEATS = [("hook", 0, 166, "Dm"), ("setting", 166, 303, "F"), ("action", 303, 540, "Gm"), ("escalation", 540, 750, "A"),
         ("snap", 750, 1062, "Dm"), ("deadpan", 1062, 1228, "Bb"), ("explanation", 1228, 1590, "F"),
         ("consequence", 1590, 1910, "C"), ("callback", 1910, TOTAL, "Dm")]
CH = {"Dm": [50, 57, 62, 65, 69], "F": [53, 57, 60, 65, 69], "Gm": [55, 58, 62, 67, 70], "A": [57, 61, 64, 69, 73],
      "Bb": [58, 62, 65, 70, 74], "C": [48, 55, 60, 64, 67]}
BASS = {"Dm": 38, "F": 41, "Gm": 43, "A": 45, "Bb": 46, "C": 36}
LEVEL = {"hook": 0.9, "setting": 0.75, "action": 0.85, "escalation": 1.0, "snap": 1.15, "deadpan": 0.6, "explanation": 0.7,
         "consequence": 0.75, "callback": 0.85}
HITS = [772, 791, 835, 866]


def music():
    r = rng(1908)
    out = np.zeros((2, N))
    for name, a, b, ch in BEATS:
        t0, d = F(a), F(b - a)
        lv = LEVEL[name]
        notes = CH[ch]
        # warm pad on the chord (slow attack, overlaps into the next beat by its release)
        place(out, I.pad([I.m2f(m) for m in notes[:4]], d, 0.32 * lv, r, att=0.5, rel=0.8, warm=1100), t0)
        place(out, I.pad([I.m2f(BASS[ch])], d, 0.30 * lv, r, att=0.4, rel=0.8, warm=400), t0)
        # plucked arpeggio, 100 bpm eighths (0.3 s), over the same chord: the pulse of the beat
        step = 0.3
        k = 0
        tm = t0 + 0.05
        while tm < t0 + d - 0.2:
            m = notes[[0, 2, 1, 3, 2, 4, 3, 2][k % 8]] + 12
            place(out, pan(I.pluck(I.m2f(m), 0.22 * lv, r, dur=0.9, bright=0.35), 0.3 * np.sin(k)), tm)
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


def boom(r, dur=3.5, f0=48, big=1.0):
    t = tt(dur)
    y = np.exp(-t / (0.9 * big)) * np.sin(phase(f0 * (1 + 0.8 * np.exp(-t / 0.08)))) * 1.6
    y += lp(r.standard_normal(len(t)), 260, 2) * np.exp(-t / (1.1 * big)) * 2.2
    y += bp(r.standard_normal(len(t)), 300, 3000, 1) * np.exp(-t / 0.12) * 0.8
    return fades(y * (1 - np.exp(-t / 0.003)), 0.0005, 0.3)


def crack(r):
    t = tt(1.6)
    y = hp(r.standard_normal(len(t)), 900, 2) * np.exp(-t / 0.012) * 2.0
    y += np.exp(-t / 0.4) * lp(r.standard_normal(len(t)), 180, 2) * 1.8
    for d, g in [(0.35, 0.4), (0.7, 0.22)]:  # far echoes off the taiga
        k = ns(d)
        y[k:] += g * lp(y[: len(y) - k], 1500)
    return y


def rumble(dur, r, lo=40, hi=220, gain=1.0):
    n = ns(dur)
    return lp(hp(colored(n, r, 1.6), lo), hi, 2) * gain


def crackles(dur, r, density, gain=1.0):
    n = ns(dur)
    y = np.zeros(n)
    tm = 0.0
    while tm < dur:
        k = X.modal(0.05, [(r.uniform(700, 2400), 1, 0.006), (r.uniform(2500, 6000), 0.5, 0.003)], r)
        X._place_mono(y, k * r.uniform(0.2, 1.0), tm)
        tm += r.exponential(1.0 / density)
    return y * gain


def sfx():
    r = rng(7)
    out = np.zeros((2, N))
    env_bed = lambda a, b, x, g=1.0: place(out, x * g, F(a))
    # HOOK: fireball whoosh into the burst, boom, long rumble
    place(out, widen(X.whoosh(2.4, r, peak=2.2, f_lo=200, f_hi=1800, width=1.0, tail=0.3) * 0.9, r), F(70) - 2.3)
    place(out, widen(boom(r, 4.0, 46, 1.2) * 0.9, r), F(70))
    place(out, widen(rumble(3.0, r, gain=0.7) * np.exp(-tt(3.0) / 1.5), r), F(80))
    place(out, widen(X.whoosh(0.5, r, peak=0.35, f_lo=800, f_hi=4000) * 0.25, r), F(158))
    # SETTING / camp: breeze, river, birds
    env_bed(166, 303, X.breeze(F(303 - 166) + 0.5, r, 0.12))
    place(out, st2(X.water_bed(F(303 - 166), r, close=0.4)) * 0.25, F(166))
    place(out, st2(X.bird_chirps(F(303 - 166), r, density=0.4)) * 0.18, F(170))
    # ACTION: rising light shimmer, the bang, fireball roar through the chase
    place(out, widen(X.whoosh(1.2, r, peak=1.0, f_lo=1500, f_hi=6000, width=0.6) * 0.25, r), F(312) - 0.9)
    place(out, widen(crack(r) * 0.85, r), F(364))
    roar_d = F(668 - 420)
    roar = rumble(roar_d, r, 60, 900, 0.9) * np.minimum(1, tt(roar_d) / 1.5) * (0.6 + 0.4 * tt(roar_d) / roar_d)
    place(out, widen(roar, r), F(420))
    place(out, widen(crackles(0.6, r, 40, 0.7), r), F(645))
    # the burst
    place(out, widen(boom(r, 4.5, 40, 1.5) * 1.1, r), F(671))
    # SNAP: blast wave roar, the falling forest crackling
    place(out, widen(X.whoosh(3.0, r, peak=0.5, f_lo=120, f_hi=900, width=1.2, tail=1.2) * 0.9, r), F(752))
    place(out, widen(crackles(F(915 - 770), r, 60, 0.45), r), F(770))
    sweep = crackles(F(915 - 835), r, 90, 0.5)
    place(out, pan(sweep, -0.5), F(835))
    place(out, widen(X.wood_crack(r) * 0.25, r), F(867))
    # tents into the air: flap whoosh, oofs
    place(out, widen(X.whoosh(1.0, r, peak=0.25, f_lo=300, f_hi=2500) * 0.6, r), F(919))
    place(out, pan(X.oof(r, "oof") * 0.5, -0.3), F(925))
    place(out, pan(X.whoa(r) * 0.4, 0.3), F(928))
    # globe: two passes of the pressure wave
    for a, d in [(970, 1.9), (1028, 1.1)]:
        place(out, widen(X.whoosh(d, r, peak=d * 0.5, f_lo=200, f_hi=1500, width=1.0, tail=0.4) * 0.45, r), F(a))
    # DEADPAN: quiet wind + embers
    place(out, X.breeze(F(1228 - 1062) + 0.3, r, 0.1, bright=600), F(1062))
    place(out, widen(crackles(F(1228 - 1062), r, 4, 0.12), r), F(1062))
    # from above: the replay boom (smaller)
    place(out, widen(boom(r, 2.5, 52, 0.8) * 0.6, r), F(1262))
    place(out, widen(crackles(1.2, r, 30, 0.3), r), F(1266))
    # straw: press squeak, the fold crinkle
    place(out, pan(X.swing_squeak(r, 0.6), 0.1) * 0.3, F(1320))
    place(out, pan(crackles(0.18, r, 80, 0.6), -0.1), F(1368))
    # tree: gust and fall
    place(out, widen(X.whoosh(0.9, r, peak=0.3, f_lo=300, f_hi=2000) * 0.5, r), F(1410))
    place(out, widen(X.wood_crack(r) * 0.3, r), F(1436))
    # diagram: ring whoosh
    place(out, widen(X.whoosh(2.0, r, peak=0.6, f_lo=200, f_hi=1200, width=1.0, tail=0.8) * 0.35, r), F(1466))
    place(out, X.breeze(F(1665 - 1590), r, 0.1, bright=600), F(1590))
    # 1927 expedition: footsteps
    for k in range(int(F(1760 - 1665) / 0.56)):
        place(out, pan(X.stroll_step(r, 0.6) * 0.35, -0.2 + 0.4 * (k % 2)), F(1668) + k * 0.56)
    place(out, X.breeze(F(1760 - 1665), r, 0.08), F(1665))
    # office: hum, keyboard clicks, the spotted sparkle
    hum = (np.sin(phase(np.full(ns(F(1910 - 1760)), 120.0))) * 0.02 + lp(colored(ns(F(1910 - 1760)), r, 1.0), 500) * 0.05)
    place(out, hum, F(1760))
    for k in range(18):
        place(out, pan(X.clink(r, r.uniform(2500, 4000), 0.04, 0.4) * 0.12, r.uniform(-0.6, 0.6)), F(1765) + r.uniform(0, 3.0))
    place(out, pan(I.glock(I.m2f(93), 0.5, r), 0.2), F(1866))
    place(out, pan(I.glock(I.m2f(98), 0.35, r), 0.2), F(1870))
    # CALLBACK: breeze, birds, hat whoosh, shooting star shimmer, final burst
    place(out, X.breeze(F(TOTAL - 1910) + 0.2, r, 0.12), F(1910))
    place(out, st2(X.bird_chirps(F(TOTAL - 1910), r, density=0.3)) * 0.15, F(1915))
    place(out, widen(X.whoosh(0.5, r, peak=0.2, f_lo=600, f_hi=3000) * 0.3, r), F(1982))
    place(out, widen(X.whoosh(0.9, r, peak=0.75, f_lo=2500, f_hi=9000, width=0.5) * 0.3, r), F(2026))
    for k, m in enumerate([86, 90, 93, 98, 102]):
        place(out, pan(I.glock(I.m2f(m), 0.45, r), -0.4 + 0.2 * k), F(2047) + 0.05 * k)
    return out


def st2(x):
    x = np.asarray(x, float)
    return np.stack([x, x]) if x.ndim == 1 else x


def voice48():
    v, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
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
    words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
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
    for name, x in [("music", m), ("sfx", s), ("voice48", v), ("mix_pre", mix)]:
        write_wav(os.path.join(OUT, f"{name}.wav"), x)
    print("LUFS voice %.1f music %.1f sfx %.1f mix %.1f  len %.3f s" % (integrated(v), integrated(m), integrated(s), integrated(mix), mix.shape[1] / SR))


if __name__ == "__main__":
    main()
