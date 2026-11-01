# Event-driven sound cues. A story's sound design is DATA (audio/cues.json); this module plays it.
#   python3 audio/cues.py            -> validates audio/cues.json against the storyboard (no audio rendering)
# Cue: {id, at (story frame), offset (s), gen, args, span [fromFrame,toFrame] (-> args.dur), extra (s), post [[op, arg]...], word, sync}
# Post ops run IN ORDER on the generated array: ["gain", g] ["widen"] ["pan", p] ["st2"]  (widen draws from the shared rng). Envelopes such as decay/ramp are generator args, not post ops.
# Cues run in file order with ONE shared rng, so changing a cue only changes sounds that come after it (reproducible, no hidden state).
import json, os
import numpy as np
from dsp import ns, tt, rng, lp, phase, colored, place, widen, pan
import instruments as I
import sfx_gen as X
from synth import boom, crack, rumble, crackles, st2

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CUES_PATH = os.path.join(HERE, "cues.json")
STORYBOARD = os.path.join(ROOT, "src", "videos", "tunguska", "storyboard.json")


def load(path=None):
    return json.load(open(path or os.environ.get("CUES_FILE", CUES_PATH)))


def beats(cfg, sb):
    """music beats with their frame range derived from SHOT ids in the storyboard (no duplicated frame numbers)"""
    shots = {s["id"]: s for s in sb["shots"]}
    return [(b["name"], shots[b["shots"][0]]["a"], shots[b["shots"][1]]["b"], b["chord"]) for b in cfg["music"]["beats"]]


# ---- generators: (ctx, cue, dur) -> array | None ; "emitters" place sounds themselves and return None ----
def _kw(a, skip=()):
    return {k: v for k, v in a.items() if k not in skip}

def g_whoosh(c, q, d): return X.whoosh(d, c.r, **_kw(q["args"], ("dur",)))
def g_boom(c, q, d): a = q["args"]; return boom(c.r, d, a["f0"], a["big"])
def g_crack(c, q, d): return crack(c.r)
def g_wood_crack(c, q, d): return X.wood_crack(c.r)
def g_oof(c, q, d): return X.oof(c.r, q["args"].get("voice", "oof"))
def g_whoa(c, q, d): return X.whoa(c.r)
def g_squeak(c, q, d): return X.swing_squeak(c.r, q["args"]["pitch"])
def g_crackles(c, q, d): a = q["args"]; return crackles(d, c.r, a["density"], a["gain"])
def g_breeze(c, q, d): a = q["args"]; return X.breeze(d, c.r, a["level"], **({"bright": a["bright"]} if "bright" in a else {}))
def g_water(c, q, d): return st2(X.water_bed(d, c.r, close=q["args"]["close"]))
def g_birds(c, q, d): return st2(X.bird_chirps(d, c.r, density=q["args"]["density"]))
def g_rumble(c, q, d):
    a = q["args"]; y = rumble(d, c.r, **{k: a[k] for k in ("lo", "hi", "gain") if k in a})
    return y * np.exp(-tt(d) / a["decay"]) if "decay" in a else y
def g_roar(c, q, d):  # rumble with a 1.5 s ramp-in and a slow swell (the fireball chase)
    a = q["args"]; return rumble(d, c.r, a["lo"], a["hi"], a["gain"]) * np.minimum(1, tt(d) / a["ramp"]) * (a["floor"] + (1 - a["floor"]) * tt(d) / d)
def g_hum(c, q, d):   # office: 120 Hz hum + filtered noise
    a = q["args"]; return np.sin(phase(np.full(ns(d), a["hz"]))) * a["tone"] + lp(colored(ns(d), c.r, 1.0), 500) * a["noise"]
def g_glock(c, q, d): a = q["args"]; return I.glock(I.m2f(a["midi"]), a["level"], c.r)

def e_steps(c, q, d, t0):   # footsteps: one stroll_step every `period` s, panning left/right
    a = q["args"]
    for k in range(int(d / a["period"])):
        place(c.out, pan(X.stroll_step(c.r, a["pitch"]) * a["gain"], a["pan0"] + a["pan_step"] * (k % 2)), t0 + k * a["period"])
def e_clicks(c, q, d, t0):  # keyboard clicks at random (seeded) times and pans; draw order matches the original exactly
    a = q["args"]
    for _ in range(a["count"]):
        place(c.out, pan(X.clink(c.r, c.r.uniform(*a["freq"]), a["decay"], a["level"]) * a["gain"], c.r.uniform(*a["pan"])), t0 + c.r.uniform(0, a["window"]))
def e_notes(c, q, d, t0):   # a run of glockenspiel notes
    a = q["args"]
    for k, m in enumerate(a["midi"]):
        place(c.out, pan(I.glock(I.m2f(m), a["level"], c.r), a["pan0"] + a["pan_step"] * k), t0 + a["spacing"] * k)

GEN = {"whoosh": g_whoosh, "boom": g_boom, "crack": g_crack, "wood_crack": g_wood_crack, "oof": g_oof, "whoa": g_whoa, "squeak": g_squeak,
       "crackles": g_crackles, "breeze": g_breeze, "water": g_water, "birds": g_birds, "rumble": g_rumble, "roar": g_roar, "hum": g_hum, "glock": g_glock}
EMIT = {"steps": e_steps, "clicks": e_clicks, "notes": e_notes}


class Ctx:
    def __init__(self, r, out, F): self.r, self.out, self.F = r, out, F


def cue_time(q, F):
    return F(q["at"]) + q.get("offset", 0.0)

def cue_dur(q, F):
    if "span" in q: return (F(q["span"][1]) - F(q["span"][0])) + q.get("extra", 0.0)
    return q.get("args", {}).get("dur", 0.0)

def start_of(q, F):   # emitters may start at a different frame than the span (footsteps)
    return F(q.get("start", q["at"])) + q.get("offset", 0.0)


def run(cfg, F, N, seed=None):
    """render every cue in file order into a stereo array; returns (out, sheet) where sheet lists what was placed and when"""
    r = rng(cfg["seed"] if seed is None else seed); out = np.zeros((2, N)); c = Ctx(r, out, F); sheet = []
    for q in cfg["cues"]:
        d = cue_dur(q, F); t = cue_time(q, F)
        if q["gen"] in EMIT:
            EMIT[q["gen"]](c, q, d, start_of(q, F))
        else:
            y = GEN[q["gen"]](c, q, d)
            for op in q.get("post", []):
                name, arg = op[0], (op[1] if len(op) > 1 else None)
                if name == "gain": y = y * arg
                elif name == "widen": y = widen(y, r)
                elif name == "pan": y = pan(y, arg)
                elif name == "st2": y = st2(y)
                else: raise ValueError(f"cue {q['id']}: unknown post op {name}")
            place(out, y, t)
        sheet.append({"id": q["id"], "gen": q["gen"], "frame": q["at"], "t": t, "dur": d, "word": q.get("word"), "sync": q.get("sync", False)})
    return out, sheet


def validate(cfg, sb):
    errs = []
    ids = set()
    for q in cfg["cues"]:
        if q["id"] in ids: errs.append(f"duplicate cue id {q['id']}")
        ids.add(q["id"])
        if q["gen"] not in GEN and q["gen"] not in EMIT: errs.append(f"{q['id']}: unknown generator {q['gen']}")
        if not (0 <= q["at"] < sb["totalFrames"]): errs.append(f"{q['id']}: frame {q['at']} outside the timeline")
        if "span" in q and not (0 <= q["span"][0] < q["span"][1] <= sb["totalFrames"]): errs.append(f"{q['id']}: bad span {q['span']}")
        if q.get("sync") and ("word_index" not in q or "word_u" not in q): errs.append(f"{q['id']}: sync cue needs word_index and word_u")
        for op in q.get("post", []):
            if op[0] not in ("gain", "widen", "pan", "st2"): errs.append(f"{q['id']}: unknown post op {op[0]}")
    shots = {s["id"] for s in sb["shots"]}
    prev_end = 0
    for b in cfg["music"]["beats"]:
        a, z = b["shots"]
        if a not in shots or z not in shots or a > z: errs.append(f"beat {b['name']}: bad shot range {b['shots']}")
        if b["chord"] not in cfg["music"]["chords"]: errs.append(f"beat {b['name']}: unknown chord {b['chord']}")
    return errs


if __name__ == "__main__":
    cfg, sb = load(), json.load(open(STORYBOARD))
    e = validate(cfg, sb)
    print(f"{len(cfg['cues'])} cues, {len(cfg['music']['beats'])} music beats: " + ("OK" if not e else f"{len(e)} error(s)"))
    for x in e: print("  ERROR", x)
    raise SystemExit(1 if e else 0)


def sheet(cfg, F):
    """cue timing without rendering any audio (used by the reports)"""
    return [{"id": q["id"], "gen": q["gen"], "frame": q["at"], "t": cue_time(q, F), "dur": cue_dur(q, F), "word": q.get("word"), "sync": q.get("sync", False)} for q in cfg["cues"]]
