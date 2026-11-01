# Synthesis helpers for the Tunguska SFX (moved out of score.py unchanged; used by cues.py and score.py).
import numpy as np
from dsp import ns, tt, lp, hp, bp, fades, phase, colored
import sfx_gen as X


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


def st2(x):
    x = np.asarray(x, float)
    return np.stack([x, x]) if x.ndim == 1 else x
