# Intro/outro sounds for the Inkfall bookend cards -> audio/out/{intro,outro}.wav (48 kHz stereo)
# usage: python audio/bookends.py [intro_s=1.6] [outro_s=3.0]
import os, sys
import numpy as np
from dsp import SR, ns, rng, place, write_wav, widen, pan, integrated, dbg, make_ir, convolve_st
import instruments as I
import sfx_gen as X
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
ID, OD = float(sys.argv[1]) if len(sys.argv) > 1 else 1.6, float(sys.argv[2]) if len(sys.argv) > 2 else 3.0
r = rng(2026)
def fit(x, level_lufs=-19):
    return x * dbg(level_lufs - integrated(x))
a = np.zeros((2, ns(ID)))
place(a, widen(X.whoosh(0.7, r, peak=0.45, f_lo=300, f_hi=3500, width=0.8, tail=0.1) * 0.5, r), 0.0)      # the drop falls in
for k, m in enumerate([79, 86]):                                                                           # landing sparkle, rising 5th
    place(a, pan(I.glock(I.m2f(m), 0.5, r), -0.2 + 0.4 * k), 0.62 + 0.14 * k)
write_wav(os.path.join(OUT, "intro.wav"), fit(a))
b = np.zeros((2, ns(OD)))
for k, m in enumerate([72, 76, 79, 84]):                                                                   # gentle rising chime
    place(b, pan(I.glock(I.m2f(m), 0.5, r), -0.3 + 0.2 * k), 0.15 + 0.22 * k)
place(b, widen(X.whoosh(0.6, r, peak=0.2, f_lo=500, f_hi=4000, width=0.6) * 0.25, r), 1.4)
write_wav(os.path.join(OUT, "outro.wav"), fit(b))
print("intro/outro audio written")
