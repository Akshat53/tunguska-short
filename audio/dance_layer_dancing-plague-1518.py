# Dancing Plague 1518: the dance layer, added to out/dancing-plague-1518/audio/mix_pre.wav after score.py and before finalize.sh.
# A tabor drum (low thump + snare tap), a fife tune in D dorian (the stage musicians) and distant crowd babble, all frame-timed on the
# picture (30 fps) and seeded, ~12-15 dB under the voice and ducked a further 5 dB while words are spoken. The drum pattern runs on one
# global grid that starts at frame 0, so the last frame of the loop flows into the first. Run from audio/ (build_dancing-plague-1518.sh).
import json, os
import numpy as np
from dsp import SR, ns, rng, dbg, place, read_wav, write_wav, integrated, pan, lp, hp
import instruments as I
import sfx_gen as X

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ["AUDIO_OUT"]
WORDS = json.load(open(os.path.join(ROOT, "stories/dancing-plague-1518/en/words.json")))
FPS, TOTAL = 30, 1560
BEAT = 60 / 132                      # 132 bpm
mix, _ = read_wav(os.path.join(OUT, "mix_pre.wav"))
v, _ = read_wav(os.path.join(OUT, "voice48.wav"))
N = mix.shape[1]
r = rng(1518)
F = lambda f: f / FPS

# where the dance is heard (frames) and how strong (0..1): it follows the picture
DANCE = [(0, 275, 1.0), (275, 391, 0.45), (391, 460, 0.8), (508, 694, 1.0), (694, 758, 0.35), (924, 974, 0.3),
         (1214, 1312, 0.75), (1312, 1430, 0.9), (1452, 1560, 1.0)]
FIFE = [(0, 275), (546, 694), (1452, 1560)]
CROWD = [(0, 275), (391, 460), (508, 694), (1240, 1430), (1452, 1560)]
def level(f, spans):
    for a, b, *k in spans:
        if a <= f < b: return k[0] if k else 1.0
    return 0.0

drum = np.zeros((2, N)); fife = np.zeros((2, N)); crowd = np.zeros((2, N))
# tabor: thump on 1 and 3, taps on 2 and 4, an off-beat tap every other bar
k = 0
while k * BEAT < N / SR:
    t = k * BEAT; f = t * FPS; g = level(f, DANCE)
    if g > 0:
        if k % 2 == 0: place(drum, pan(I.timpani(I.m2f(43), 0.55 * g, r, dur=0.5), -0.1), t)
        else: place(drum, pan(I.snare(0.45 * g, r, dur=0.2, tune=1.25, snappy=0.6), 0.15), t)
        if k % 8 in (3, 7): place(drum, pan(I.snare(0.3 * g, r, dur=0.15, tune=1.3, snappy=0.5), 0.2), t + BEAT / 2)
    k += 1
# fife: a short modal tune (D dorian), eighth/quarter notes on the same grid, repeated
TUNE = [(74, 1), (76, 0.5), (77, 0.5), (79, 1), (77, 0.5), (76, 0.5), (74, 1), (72, 1), (74, 0.5), (76, 0.5), (77, 1), (76, 1), (74, 2)]
TL = sum(d for _, d in TUNE)
k = 0.0
while k * BEAT < N / SR:
    for m, d in TUNE:
        t = k * BEAT; f = t * FPS
        if level(f, [(a, b) for a, b in FIFE]) > 0 and t + d * BEAT < N / SR:
            place(fife, pan(I.fife(I.m2f(m), d * BEAT * 0.9, 0.5, r), 0.25), t)
        k += d
# crowd: a few distant voices (babble), low-passed
for a, b in CROWD:
    d = F(b - a)
    for i in range(5):
        y = X.babble(d, r, 160 + 70 * i, 1.0 + 0.1 * i)
        place(crowd, pan(lp(y, 2500), -0.6 + 0.3 * i), F(a))

def mask(pre=0.08, post=0.15):
    m = np.zeros(N)
    for w in WORDS:
        m[ns(max(0, w["start"] - pre)):ns(w["end"] + post)] = 1
    kk = np.ones(ns(0.12)) / ns(0.12)
    return np.clip(np.convolve(m, kk, "same"), 0, 1)
lv = integrated(v)
duck = 1 - (1 - dbg(-5)) * mask()
for x, rel in [(drum, -12.5), (fife, -16.0), (crowd, -21.0)]:
    li = integrated(x)
    if np.isfinite(li): x *= dbg(lv + rel - li)
    x *= duck[None, :]
out = mix + drum + fife + crowd
pk = np.abs(out).max()
if pk > 0.98: out *= 0.98 / pk
write_wav(os.path.join(OUT, "mix_pre.wav"), out)
write_wav(os.path.join(OUT, "dance_layer.wav"), drum + fife + crowd)
print("dance layer: drum %.1f fife %.1f crowd %.1f LUFS (voice %.1f)" % (integrated(drum), integrated(fife), integrated(crowd), lv))
