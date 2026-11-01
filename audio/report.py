# usage: ../.venv/bin/python audio/report.py [--tol 0.12]    (run after score.py + finalize.sh; build.sh does all three)
# Writes audio/out/cue_sheet.csv, sync_report.md, audio_report.json. Exit 1 if a check fails. Report-only: never edits audio.
import csv, json, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from dsp import read_wav
import score as S, cues as C
OUT = S.OUT; ROOT = S.ROOT
tol = float(sys.argv[sys.argv.index("--tol") + 1]) if "--tol" in sys.argv else 0.12
cfg, sb, F = S.CFG, S.SB, S.F
new = json.load(open(os.path.join(ROOT, "voice", "words.json"))); old = json.load(open(os.path.join(ROOT, "voice", "v1", "words.json")))
rows, checks = C.sheet(cfg, F), []
def check(name, ok, detail="", warn=False): checks.append({"name": name, "ok": bool(ok), "detail": detail, "warn": warn})

# ---- cue sheet + sync: where is each cue relative to the word it was authored on? ----
sync_rows = []
for q, r in zip(cfg["cues"], rows):
    t = r["t"]; r["out_frame"] = round(t * 30)
    j = int(np.argmin([abs(w["start"] - t) for w in new])); r["nearest_word"] = new[j]["word"]; r["gap_s"] = round(t - new[j]["start"], 3)
    if r["sync"]:
        oi = q["word_index"]                                                              # the word this cue was authored on (index into the original narration)
        u = q["word_u"]                                                                   # authored position inside that word, stored in the cue (so moving the cue is detected)
        n0 = new[oi]["start"]; n1 = new[oi + 1]["start"] if oi + 1 < len(new) else new[oi]["end"]
        want = n0 + u * (n1 - n0); err = t - want
        sync_rows.append({"id": q["id"], "word": new[oi]["word"], "expected_s": round(want, 3), "actual_s": round(t, 3), "error_s": round(err, 3), "ok": abs(err) <= tol})
for sr in sync_rows: check(f"sync {sr['id']} on \"{sr['word']}\"", sr["ok"], f"cue {sr['actual_s']}s vs word {sr['expected_s']}s ({sr['error_s']:+.3f} s, tolerance {tol})")
ev = sorted(rows, key=lambda r: r["t"])
check("cue ids unique and inside the timeline", len({r["id"] for r in rows}) == len(rows) and all(0 <= r["t"] < S.DUR for r in rows), f"{len(rows)} cues, timeline {S.DUR:.2f}s")
with open(os.path.join(OUT, "cue_sheet.csv"), "w", newline="") as f:
    w = csv.writer(f); w.writerow(["id", "generator", "story_frame", "time_s", "output_frame", "duration_s", "nearest_word", "gap_to_word_s", "sync_word"])
    for r in ev: w.writerow([r["id"], r["gen"], r["frame"], f"{r['t']:.3f}", r["out_frame"], f"{r['dur']:.2f}", r["nearest_word"], r["gap_s"], r["word"] or ""])

# ---- audio checks on the stems and the final mix ----
def load(n):
    x, sr = read_wav(os.path.join(OUT, n)); return x, sr
mix, sr = load("mix.wav"); pre, _ = load("mix_pre.wav")
dur = mix.shape[1] / sr; want = S.DUR
check("mix length = picture length", abs(dur - want) < 0.02, f"{dur:.3f}s vs {want:.3f}s ({round(dur*30)} vs {round(want*30)} frames)")
for n in ("music.wav", "sfx.wav", "voice48.wav", "mix_pre.wav"):
    x, _ = load(n); check(f"stem {n} length", abs(x.shape[1] / sr - want) < 0.02, f"{x.shape[1]/sr:.3f}s")
peak, pre_peak = float(np.abs(mix).max()), float(np.abs(pre).max())
clipped = int((np.abs(mix) >= 0.999).sum()); pre_clipped = int((np.abs(pre) >= 0.999).sum())
check("no clipped samples in the final mix", clipped == 0, f"{clipped} samples at full scale, sample peak {20*np.log10(max(peak,1e-9)):.1f} dBFS")
st = json.load(open(os.path.join(OUT, "audio_stats.json")))
check("mix did not need heavy attenuation to avoid clipping", st["scaled_db"] > -6, f"pre-scale peak {20*np.log10(max(st['pre_scale_peak'],1e-9)):.1f} dBFS, attenuated {st['scaled_db']:.1f} dB")
check("no clipping before loudness normalisation", pre_clipped == 0, f"{pre_clipped} samples, peak {20*np.log10(max(pre_peak,1e-9)):.1f} dBFS")
ln = subprocess.run(["ffmpeg", "-hide_banner", "-i", os.path.join(OUT, "mix.wav"), "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
lj = json.loads(ln[ln.rindex("{"): ln.index("}", ln.rindex("{")) + 1]); lufs, tp = float(lj["input_i"]), float(lj["input_tp"])
check("loudness -14 +/- 1 LUFS", abs(lufs + 14) <= 1, f"{lufs:.1f} LUFS"); check("true peak below -1 dBTP", tp < -1, f"{tp:.1f} dBTP")
head = np.abs(mix[:, :8]).max(); tail = np.abs(mix[:, -8:]).max()
check("no click at the start (first samples near zero)", head < 1e-3, f"{20*np.log10(max(head,1e-9)):.0f} dBFS", warn=True)
check("no click at the end (last samples near zero)", tail < 1e-3, f"{20*np.log10(max(tail,1e-9)):.0f} dBFS; fade_out is {cfg.get('master', {}).get('fade_out', 0)}s", warn=True)
voice, _ = load("voice48.wav"); words = new
gaps = [new[i + 1]["start"] - new[i]["end"] for i in range(len(new) - 1)]
mus, _ = load("music.wav"); i0, i1 = int(new[0]["start"] * sr), int(new[-1]["end"] * sr)
pauses = [(new[i]["end"], new[i + 1]["start"]) for i in range(len(new) - 1) if gaps[i] >= 0.35]
quiet = [round(float(20*np.log10(max(np.sqrt((mus[:, int(a*sr):int(b*sr)] ** 2).mean()), 1e-9))), 1) for a, b in pauses]
check("music bed keeps playing in narration pauses (never silent)", all(q > -60 for q in quiet), f"{len(pauses)} pauses >= 0.35 s, music level in them {min(quiet):.0f} to {max(quiet):.0f} dBFS" if quiet else "no pauses")
fail = [c for c in checks if not c["ok"] and not c["warn"]]
json.dump({"duration_s": dur, "lufs": lufs, "true_peak_db": tp, "sample_peak": peak, "clipped_samples": clipped, "cues": len(rows), "sync": sync_rows, "checks": checks, "pass": not fail},
          open(os.path.join(OUT, "audio_report.json"), "w"), indent=1)
md = ["# Audio sync + quality report", "", f"Result: **{'PASS' if not fail else 'FAIL'}**  -  {len(rows)} cues, {len(sync_rows)} synchronised to words, mix {dur:.2f}s, {lufs:.1f} LUFS, {tp:.1f} dBTP", "",
      "## Checks"] + [f"- {'PASS' if c['ok'] else ('WARN' if c['warn'] else 'FAIL')} {c['name']}: {c['detail']}" for c in checks] + ["", "## Word-synchronised cues", "| cue | word | cue time | word time | error |", "|---|---|---|---|---|"] + \
     [f"| {s['id']} | {s['word']} | {s['actual_s']} | {s['expected_s']} | {s['error_s']:+.3f} s |" for s in sync_rows] + ["", "Full list: `cue_sheet.csv`."]
open(os.path.join(OUT, "sync_report.md"), "w").write("\n".join(md))
for c in checks: print(("PASS " if c["ok"] else ("WARN " if c["warn"] else "FAIL ")) + c["name"] + (" - " + c["detail"] if c["detail"] else ""))
print("AUDIO REPORT:", "PASS" if not fail else f"FAIL ({len(fail)})"); sys.exit(1 if fail else 0)
