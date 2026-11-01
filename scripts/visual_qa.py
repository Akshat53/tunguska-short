#!/usr/bin/env python3
"""Automated visual QA for a finished vertical Short (REPORT-ONLY: never edits code, renders or audio).

usage: .venv/bin/python scripts/visual_qa.py <video.mp4> --story out/qa-story.json --out <dir>
                 [--audio-report audio/out/audio_report.json] [--offset N] [--excerpt] [--max-shots 40] [--quiet]

  --story     per-frame "what should be on screen" from scripts/qa-story-data.mjs (camera, subjects, planned cuts/flashes...)
  --offset N  the video is an excerpt: its frame i is frame i+N of the video the story data was made for (self-tests)
  --excerpt   integrated loudness is meaningless on an excerpt: report it as info only

Twelve checks (categories): clipping, visibility, composition, lighting, transition, pose_jump, blur, empty, dof,
audio_sync, audio_level, duplicate. Each finding: {category, severity info|warn|error, frame, timestamp, shot, message,
suggestedFix, screenshotPath, span, evidence}. Overall FAIL if any error. Detections that depend on approximate models
(subject boxes, obstacle shapes, composition taste) are capped at 'warn' and say why.
Outputs in <out>: visual_qa.json, visual_qa.md, screenshots/*.jpg (max 40), problem_sheet.jpg, perframe.npz.
Thresholds: the CFG block below (documented in docs/VISUAL_QA.md). Values are on 0..1 luma / 0..255 pixel scales as noted.
"""
import argparse, json, os, re, subprocess, sys
import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

# ============================== THRESHOLDS (one place; see docs/VISUAL_QA.md) ==============================
CFG = {
    "decode_w": 272, "decode_h": 480,          # analysis resolution (area-downscaled); bboxes are normalised so any input size works
    # (1) clipping
    "clearance_warn_m": 0.3,                   # camera closer than this to an obstacle surface (DIRECTOR_OBSTACLES) -> warn; < 0 (inside) -> error
    "edge_cut_frames": 30,                     # a required subject's box cut by the top/left/right frame edge for longer than this -> warn
    "edge_cut_tol": 0.02,                      # how far (frame fraction) the box may poke out before it counts as cut
    # (2) visibility
    "offscreen_warn_frames": 15,               # required subject's anchor off-screen / behind the lens: warn > 0.5 s, error > 1 s
    "offscreen_error_frames": 30,
    "unsafe_warn_frames": 30,                  # anchor outside the Shorts safe area (framing.SAFE) > 1 s -> warn
    # (3) composition (per shot, medians; taste -> warn only)
    "eye_y_default": [0.2, 0.6],               # eye line, fraction of frame height from the top
    "min_headroom": 0.02,                      # top of the subject box below the frame top by at least this
    "fill_default": [0.08, 0.95],              # subject group height / frame height
    # (4) lighting / colour jumps between consecutive frames (luma 0..1)
    "light_dl_warn": 0.06, "light_dl_error": 0.12,          # mean-luma step
    "light_dt_warn": 0.05, "light_dt_error": 0.09,          # temperature step (mean R - mean B, 0..1)
    "light_dc_warn": 0.05,                                  # chroma step (|d mean Cb| + |d mean Cr|)
    "light_rel": 4.0,                                       # ... and > this x the local median step (+0.01)
    "light_uniform": 0.75,                                  # ... and the same-sign change shows in >= 75% of a 4x4 grid (else: a large object entered = content, info)
    # (5) transitions
    "black_luma": 0.04, "white_luma": 0.93, "flat_std": 0.06,   # a black / white frame: mean luma below / above and luma std below flat_std
    "ghost_alpha": [0.15, 0.85], "ghost_resid": 0.5,            # blend of the frames either side, residual < 0.5 x the nearer neighbour
    "cut_luma_jump_warn": 0.30,                                 # brightness change across a planned cut (jarring) -> warn
    "xfade_len_factor": 2.5,                                    # measured blend longer than factor x planned (+3) -> warn
    # (6) pose / position jumps (mean abs diff, 0..255 scale, inside the subject box or the whole frame)
    "pop_abs_warn": 5.0, "pop_abs_error": 10.0,  # a single-frame spike: frame i differs from i-1 AND i+1 by at least this ...
    "pop_ratio_warn": 3.0, "pop_ratio_error": 5.0,  # ... while i-1 and i+1 are this many times more alike (+1)
    "pop_min_box_px": 400,                      # ignore subject boxes smaller than this many analysis pixels
    "pop_norm_warn": 2.5,                       # motion-normalised spike min(a,b) / (c/2 + 0.5) for fast shots (calibrated, thin margin: see docs)
    # (7) blur (Laplacian variance relative to the shot median of non-planned frames)
    "blur_ratio": 0.45, "blur_ratio_error": 0.30, "blur_min_frames": 3, "blur_error_frames": 8,
    # (8) empty frames
    "empty_edge": 0.01,                         # fraction of pixels with gradient > empty_grad (calibrated: see docs/VISUAL_QA.md)
    "empty_grad": 0.06,                         # luma gradient magnitude (0..1 per pixel, Sobel / 8)
    "empty_colour_std": 0.05,                   # RGB std over the frame (0..1)
    "empty_frames": 45,                         # span longer than 1.5 s -> error (warn if only nearly flat), info when the config marks it intended
    "empty_info_frames": 30,                    # spans of 1.0-1.5 s are reported as info (worth a look, below the threshold)
    # (9) depth of field (subject box sharpness / sharpness of a ring around it)
    "dof_min_ratio": 0.25,                      # DOF NOT expected: shot median below this -> warn (subject much softer than surroundings)
    "dof_expected_ratio": 1.0,                  # DOF expected: subject must be sharper than surroundings
    "dof_drop": 0.4, "dof_drop_frames": 3,      # per-frame ratio below dof_drop x shot median for this many frames -> warn
    "dof_min_box_frac": 0.01,                   # subject box must cover >= 1% of the frame
    # (10) audio sync
    "sync_tol_frames": 2.0,                     # |audio onset - picture event| beyond this -> error (clear onset) / warn (weak onset)
    "sync_search": [-8, 12],                    # search window around the event, frames
    "onset_clear_db": 10.0, "onset_min_db": 6.0,  # energy rise of a clear / any onset
    "onset_lambda": 1.5,                        # candidate score = rise (dB) - lambda * |delay| (frames)
    # (11) audio level
    "lufs_target": -14.0, "lufs_tol": 1.0,      # integrated loudness outside -> warn (platforms renormalise)
    "tp_warn": -1.0, "tp_error": 0.0,           # true peak dBTP
    "clip_level": 0.999, "clip_error_samples": 10,  # decoded samples at full scale
    # (12) duplicates
    "dup_mean": 0.05, "dup_max": 8,             # consecutive frames count as identical (0..255 scale; survives h264 re-encoding noise) ...
    "dup_rel_mean": 0.1, "dup_rel": 0.01,       # ... or diff < 0.1 AND < 1% of the local motion (a repeated frame inside a fast shot keeps more encoder noise)
    "frozen_warn_frames": 6, "frozen_error_frames": 15,   # identical-frame run in a moving shot
    "judder_window": 30, "judder_error_pairs": 3,          # isolated duplicate pairs inside a moving shot per window
    "lowmotion_ratio": 0.4, "lowmotion_min_median": 0.15, "lowmotion_per_window": 4,  # partial judder: periodic near-duplicates
    "max_screenshots": 40,
}
SEV = {"info": 0, "warn": 1, "error": 2}
CATS = ["clipping", "visibility", "composition", "lighting", "transition", "pose_jump", "blur", "empty", "dof", "audio_sync", "audio_level", "duplicate"]
FIX = {
    "clipping": "Move the camera key away from the obstacle (or use the camera director's collision margin) / reframe so the subject is not cut.",
    "visibility": "Re-aim or pull back the camera (story.ts camera fn / storyboard key) so the subject stays in the 9:16 safe area, or update qa.config if the exit is intended.",
    "composition": "Adjust distance / look point (framing.lookForEyeLine, distanceForHeight) toward eye line ~0.38 from the top and the intended fill.",
    "lighting": "Check grade/light presets and effect cards at this frame; if it is a deliberate flash or cut, add it to storyboard events or the QA config.",
    "transition": "Inspect the cut/crossfade frames; remove stray black/white frames, check XFADE length and layer alpha.",
    "pose_jump": "Inspect the frame before/after; look for an integer-frame effect, expression swap or a teleporting card at this frame.",
    "blur": "Check lens blur (must stay off unless DOF is intended), encoder settings (CRF) and that no blur pass leaks into this span.",
    "empty": "Add a subject / detail to the frame, shorten the shot, or mark the span intendedEmpty in the QA config if deliberate.",
    "dof": "Put the DOF focus point on the subject's face and lower cInf, or disable lens blur for the shot.",
    "audio_sync": "Move the SFX cue (audio/cues.json 'at'/'offset') so the onset lands on the picture event; re-run audio/build.sh.",
    "audio_level": "Re-run the loudness normalisation (audio/finalize.sh) / lower gain to keep true peak < -1 dBTP and no clipping.",
    "duplicate": "Check the time warp / frame rate conversion and integer-frame effects; a moving shot must change every frame.",
}

def run(*a, **k): return subprocess.run(a, capture_output=True, **k)

def probe(video):
    j = json.loads(run("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,nb_frames,sample_rate:format=duration", "-of", "json", video, text=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    num, den = v["r_frame_rate"].split("/")
    return {"w": int(v["width"]), "h": int(v["height"]), "fps": float(num) / float(den), "nb": int(v.get("nb_frames") or 0),
            "duration": float(j["format"]["duration"]), "audio": any(s["codec_type"] == "audio" for s in j["streams"])}

# ------------------------------------------------ decoding + per-frame features ------------------------------------------------
def box_px(b, W, H, pad=0.0):
    if not b: return None
    w, h = b[2] - b[0], b[3] - b[1]
    x0, y0, x1, y1 = b[0] - pad * w, b[1] - pad * h, b[2] + pad * w, b[3] + pad * h
    x0, x1 = int(max(0, min(W, x0 * W))), int(max(0, min(W, x1 * W)))
    y0, y1 = int(max(0, min(H, y0 * H))), int(max(0, min(H, y1 * H)))
    return (x0, y0, x1, y1) if x1 - x0 >= 4 and y1 - y0 >= 4 else None

def lapvar(L): return float(ndimage.laplace(L).var())

def analyse_frames(video, story, offset, W, H):
    fd = story["frameData"] if story else []
    sdat = lambda i: fd[i + offset] if 0 <= i + offset < len(fd) else None
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", video, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    fsz = W * H * 3
    keys = ["luma", "lstd", "temp", "cb", "cr", "sat", "diff", "dmax", "diff2", "sharp", "edge", "cstd"]
    X = {k: [] for k in keys}
    thumbs, subj = [], []   # subj[i] = {name: {...}}
    GL, GT = [], []         # 4x4 grid of luma / temperature means (lighting = whole-frame change, content = local change)
    prev = prev2 = None
    i = 0
    while True:
        buf = p.stdout.read(fsz)
        if len(buf) < fsz: break
        F = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        Fi = F.astype(np.int16)
        f = F.astype(np.float32) / 255
        L = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        X["luma"].append(float(L.mean())); X["lstd"].append(float(L.std()))
        r, g, b = f[..., 0].mean(), f[..., 1].mean(), f[..., 2].mean()
        X["temp"].append(float(r - b)); X["cb"].append(float(b - L.mean())); X["cr"].append(float(r - L.mean()))
        mx, mn = f.max(-1), f.min(-1)
        X["sat"].append(float(np.where(mx > 0.06, (mx - mn) / np.maximum(mx, 1e-6), 0).mean()))
        if prev is not None:
            ad = np.abs(Fi - prev).mean(-1)
            X["diff"].append(float(ad.mean())); X["dmax"].append(float(ad.max()))
        else:
            X["diff"].append(np.nan); X["dmax"].append(np.nan)
        X["diff2"].append(float(np.abs(Fi - prev2).mean()) if prev2 is not None else np.nan)
        X["sharp"].append(lapvar(L))
        GL.append(L.reshape(4, H // 4, 4, W // 4).mean((1, 3)).ravel()); GT.append((f[..., 0] - f[..., 2]).reshape(4, H // 4, 4, W // 4).mean((1, 3)).ravel())
        gx, gy = ndimage.sobel(L, 1), ndimage.sobel(L, 0)
        gm = np.hypot(gx, gy) / 8
        X["edge"].append(float((gm > CFG["empty_grad"]).mean())); X["cstd"].append(float(f.reshape(-1, 3).std(0).mean()))
        thumbs.append(np.asarray(Image.fromarray(F).resize((W // 4, H // 4), Image.BILINEAR)))
        # per-subject measures (box of THIS frame); the pop measure for frame i-1 is completed here using frames i-2, i-1, i
        sd = sdat(i); cur = {}
        for name, s in ((sd or {}).get("subjects") or {}).items():
            bp = box_px(s.get("bbox"), W, H)
            m = {"bp": bp}
            if bp:
                x0, y0, x1, y1 = bp
                m["area"] = (x1 - x0) * (y1 - y0)
                m["sharp"] = lapvar(L[y0:y1, x0:x1])
                rp = box_px(s["bbox"], W, H, pad=0.5)
                if rp:
                    ring = L[rp[1]:rp[3], rp[0]:rp[2]].copy(); lap = ndimage.laplace(ring)
                    mask = np.ones_like(ring, bool); mask[y0 - rp[1]:y1 - rp[1], x0 - rp[0]:x1 - rp[0]] = False
                    m["ring"] = float(lap[mask].var()) if mask.sum() > 50 else None
            cur[name] = m
        if prev2 is not None and i >= 2:   # finish pop measures for frame i-1 using ITS boxes
            for name, m in subj[i - 1].items():
                bp = m.get("bp")
                if bp and m.get("area", 0) >= CFG["pop_min_box_px"]:
                    x0, y0, x1, y1 = bp
                    a = np.abs(prev[y0:y1, x0:x1] - prev2[y0:y1, x0:x1]).mean()
                    bb = np.abs(Fi[y0:y1, x0:x1] - prev[y0:y1, x0:x1]).mean()
                    c = np.abs(Fi[y0:y1, x0:x1] - prev2[y0:y1, x0:x1]).mean()
                    m["pop"] = (float(a), float(bb), float(c))
        subj.append(cur)
        prev2, prev = prev, Fi
        i += 1
    p.wait()
    n = i
    X = {k: np.array(v, float) for k, v in X.items()}
    X["gridL"], X["gridT"] = np.array(GL), np.array(GT)
    return n, X, np.stack(thumbs) if thumbs else None, subj

# ------------------------------------------------ helpers ------------------------------------------------
def runs(mask):
    out, s = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and s is None: s = i
        if not m and s is not None: out.append((s, i)); s = None
    return out

def local_median(x, i, r=8):
    a, b = max(0, i - r), min(len(x), i + r + 1)
    w = np.concatenate([x[a:i], x[i + 1:b]]); w = w[~np.isnan(w)]
    return float(np.median(w)) if len(w) else 0.0

class Findings:
    def __init__(s, fps, shot_of): s.L, s.fps, s.shot_of = [], fps, shot_of
    def add(s, cat, sev, frame, msg, span=None, evidence=None, fix=None):
        frame = int(frame)
        s.L.append({"category": cat, "severity": sev, "frame": frame, "timestamp": round(frame / s.fps, 3), "shot": s.shot_of(frame),
                    "message": msg, "suggestedFix": fix or FIX[cat], "screenshotPath": None,
                    "span": [int(span[0]), int(span[1])] if span else [frame, frame + 1], "evidence": evidence or {}})

# ------------------------------------------------ main ------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--story"); ap.add_argument("--audio-report"); ap.add_argument("--out", required=True)
    ap.add_argument("--offset", type=int, default=0); ap.add_argument("--excerpt", action="store_true")
    ap.add_argument("--max-shots", type=int, default=CFG["max_screenshots"]); ap.add_argument("--quiet", action="store_true")
    A = ap.parse_args()
    os.makedirs(os.path.join(A.out, "screenshots"), exist_ok=True)
    for f in os.listdir(os.path.join(A.out, "screenshots")):
        if f.endswith(".jpg"): os.remove(os.path.join(A.out, "screenshots", f))   # only our own previous screenshots
    P = probe(A.video); fps = P["fps"]
    story = json.load(open(A.story)) if A.story else None
    off = A.offset
    W, H = CFG["decode_w"], CFG["decode_h"]
    n, X, T, SUB = analyse_frames(A.video, story, off, W, H)
    fd = story["frameData"] if story else []
    sdat = lambda i: fd[i + off] if 0 <= i + off < len(fd) else None
    def shot_of(i):
        s = sdat(i)
        return None if s is None else (s.get("shot") or s.get("bookend"))
    planned = [set((sdat(i) or {}).get("planned", [])) for i in range(n)]
    is_planned = lambda i, tags=("cut", "crossfade", "flash", "kick", "hit", "bookend"): 0 <= i < n and bool(planned[i] & set(tags))
    near_planned = lambda i, r=1, tags=("cut", "crossfade", "flash", "kick", "hit", "bookend"): any(is_planned(j, tags) for j in range(i - r, i + r + 1))
    bookend = lambda i: (sdat(i) or {}).get("bookend") is not None
    FN = Findings(fps, shot_of)
    shots = {}
    for i in range(n):
        s = shot_of(i)
        if s is not None: shots.setdefault(s, []).append(i)
    shotcfg = {s["id"]: s for s in (story or {}).get("shots", [])}
    events = [dict(e, frame=e["frame"] - off) for e in (story or {}).get("events", []) if 0 <= e["frame"] - off < n]
    # camera setups: a storyboard shot split at its planned in-shot cuts (camera keys with cut) -> baselines for blur / DOF
    bounds = sorted(int(e["frame"]) for e in events if e["kind"] in ("cut", "crossfade", "bookend-cut"))
    setups = {}
    for sid, idx in shots.items():
        for i in idx: setups.setdefault((sid, sum(b <= i for b in bounds)), []).append(i)

    # (1) CLIPPING -------------------------------------------------------------------------
    clr = np.array([np.nan if (sdat(i) or {}).get("clearance") is None else sdat(i)["clearance"] for i in range(n)])
    for a, b in runs(clr < 0):
        FN.add("clipping", "error", a + int(np.nanargmin(clr[a:b])), f"camera INSIDE an obstacle (min clearance {np.nanmin(clr[a:b]):.2f} m) for {b - a} frames",
               (a, b), {"minClearance_m": float(np.nanmin(clr[a:b]))})
    for a, b in runs((clr >= 0) & (clr < CFG["clearance_warn_m"])):
        FN.add("clipping", "warn", a, f"camera within {CFG['clearance_warn_m']} m of an obstacle (min {np.nanmin(clr[a:b]):.2f} m) for {b - a} frames; obstacle shapes are approximate",
               (a, b), {"minClearance_m": float(np.nanmin(clr[a:b]))})
    names = sorted({k for i in range(n) for k in ((sdat(i) or {}).get("subjects") or {})})
    tol = CFG["edge_cut_tol"]
    for nm in names:
        cut = np.zeros(n, bool)
        for i in range(n):
            s = ((sdat(i) or {}).get("subjects") or {}).get(nm)
            if not s or not s.get("required") or not s.get("bbox") or is_planned(i, ("crossfade", "bookend")): continue
            b = s["bbox"]; cx = (s["x"] + 1) / 2; cy = (1 - s["y"]) / 2
            if 0 <= cx <= 1 and 0 <= cy <= 1 and (b[0] < -tol or b[2] > 1 + tol or b[1] < -tol): cut[i] = True
        for a, b in runs(cut):
            if b - a > CFG["edge_cut_frames"]:
                FN.add("clipping", "warn", a, f"'{nm}' cut by the top/side frame edge for {b - a} frames ({(b - a) / fps:.1f} s); model box, verify on the screenshot", (a, b))

    # (2) VISIBILITY -----------------------------------------------------------------------
    for nm in names:
        off_, unsafe = np.zeros(n, bool), np.zeros(n, bool)
        for i in range(n):
            s = ((sdat(i) or {}).get("subjects") or {}).get(nm)
            if not s or not s.get("required") or is_planned(i, ("crossfade", "bookend", "flash")): continue
            on = s["depth"] > 0 and abs(s["x"]) <= 1 and abs(s["y"]) <= 1
            off_[i] = not on; unsafe[i] = on and not s["inSafe"]
        for a, b in runs(off_):
            if b - a > CFG["offscreen_warn_frames"]:
                sev = "error" if b - a > CFG["offscreen_error_frames"] else "warn"
                FN.add("visibility", sev, a, f"required subject '{nm}' is OFF-SCREEN for {b - a} frames ({(b - a) / fps:.1f} s)", (a, b))
        for a, b in runs(unsafe):
            if b - a > CFG["unsafe_warn_frames"]:
                FN.add("visibility", "warn", a, f"'{nm}' outside the Shorts safe area (UI/caption zones) for {b - a} frames ({(b - a) / fps:.1f} s)", (a, b))

    # (3) COMPOSITION ----------------------------------------------------------------------
    comp = (story or {}).get("composition", {})
    eye_rng = comp.get("eyeY", CFG["eye_y_default"]); min_head = comp.get("minHeadroom", CFG["min_headroom"])
    eyes = set(comp.get("eyeSubjects", ["herder1", "herder2", "gzHerder", "expedition"]))
    for sid, idx in shots.items():
        sc = shotcfg.get(sid, {}); fill_rng = (sc.get("framing") or {}).get("fill", CFG["fill_default"])   # null = not checked
        fills, eyeys, heads = [], [], []
        for i in idx:
            if is_planned(i, ("crossfade", "bookend", "flash")): continue
            S = [s for s in ((sdat(i) or {}).get("subjects") or {}).values() if s.get("required") and s.get("bbox")]
            if not S: continue
            y0 = min(s["bbox"][1] for s in S); y1 = max(s["bbox"][3] for s in S)
            fills.append(min(y1, 1) - max(y0, 0)); heads.append(y0)
            E = [(1 - s["y"]) / 2 for nm, s in (sdat(i)["subjects"]).items() if nm in eyes and s.get("required")]
            if E: eyeys.append(float(np.mean(E)))
        if len(fills) < 10: continue
        fm, hm = float(np.median(fills)), float(np.median(heads)); em = float(np.median(eyeys)) if eyeys else None
        mid = idx[len(idx) // 2]; ev = {"fill": round(fm, 3), "headroom": round(hm, 3), "eyeY": None if em is None else round(em, 3)}
        probs = []
        if fill_rng is not None and not fill_rng[0] <= fm <= fill_rng[1]: probs.append(f"subject fill {fm:.2f} of frame height outside the intended {fill_rng}")
        if em is not None and not eye_rng[0] <= em <= eye_rng[1]: probs.append(f"eye line at {em:.2f} from the top outside {eye_rng}")
        if hm < min_head: probs.append(f"headroom {hm:.3f} (top of subject {'cut' if hm < 0 else 'touches the frame top'})")
        if probs: FN.add("composition", "warn", mid, f"shot {sid}: " + "; ".join(probs) + " (median over the shot; taste-based -> warn)", (idx[0], idx[-1] + 1), ev)
        else: FN.add("composition", "info", mid, f"shot {sid}: fill {fm:.2f}, eye line {em if em is None else round(em, 2)}, headroom {hm:.2f} - within intent", (idx[0], idx[-1] + 1), ev)

    # (4) LIGHTING / COLOUR JUMPS ----------------------------------------------------------
    dl = np.abs(np.diff(X["luma"], prepend=np.nan)); dt = np.abs(np.diff(X["temp"], prepend=np.nan))
    dc = np.abs(np.diff(X["cb"], prepend=np.nan)) + np.abs(np.diff(X["cr"], prepend=np.nan))
    flag = np.zeros(n, bool); sevs = {}; unis = {}
    for i in range(1, n):
        if near_planned(i, 1): continue
        bl, bt = local_median(dl, i), local_median(dt, i)
        bigL = dl[i] > CFG["light_dl_warn"] and dl[i] > CFG["light_rel"] * bl + 0.01
        bigT = dt[i] > CFG["light_dt_warn"] and dt[i] > CFG["light_rel"] * bt + 0.01
        bigC = dc[i] > CFG["light_dc_warn"] and dc[i] > CFG["light_rel"] * local_median(dc, i) + 0.01
        if bigL or bigT or bigC:
            flag[i] = True
            gl, gt = X["gridL"][i] - X["gridL"][i - 1], X["gridT"][i] - X["gridT"][i - 1]
            sl, st = np.sign(X["luma"][i] - X["luma"][i - 1]), np.sign(X["temp"][i] - X["temp"][i - 1])
            uni = max(((np.sign(gl) == sl) & (np.abs(gl) >= 0.4 * dl[i])).mean() if bigL else 0, ((np.sign(gt) == st) & (np.abs(gt) >= 0.4 * dt[i])).mean() if (bigT or bigC) else 0)
            unis[i] = float(uni)
            sevs[i] = "info" if uni < CFG["light_uniform"] else ("error" if (dl[i] > CFG["light_dl_error"] or dt[i] > CFG["light_dt_error"]) else "warn")
    for a, b in runs(flag):
        i = a + int(np.argmax(dl[a:b] + dt[a:b])); sev = max((sevs[j] for j in range(a, b)), key=SEV.get)
        u = max(unis[j] for j in range(a, b))
        what = "whole-frame luma/colour jump" if sev != "info" else "local luma/colour change (a large object entering / leaving, not a whole-frame lighting change)"
        FN.add("lighting", sev, i, f"unplanned {what}: d-luma {dl[i]:+.3f}, d-temperature {dt[i]:.3f}, d-chroma {dc[i]:.3f} (luma {X['luma'][i - 1]:.2f}->{X['luma'][i]:.2f}), "
               f"{u * 100:.0f}% of the frame changes the same way; no cut/flash/crossfade planned here",
               (a, b), {"dLuma": round(float(dl[i]), 4), "dTemp": round(float(dt[i]), 4), "dChroma": round(float(dc[i]), 4), "uniform": round(u, 2)})

    # (5) TRANSITIONS ----------------------------------------------------------------------
    black = (X["luma"] < CFG["black_luma"]) & (X["lstd"] < CFG["flat_std"])
    white = (X["luma"] > CFG["white_luma"]) & (X["lstd"] < CFG["flat_std"])
    for kind, m in (("black", black), ("white", white)):
        mm = m.copy()
        if kind == "white": mm &= np.array([not is_planned(i, ("flash",)) for i in range(n)])
        for a, b in runs(mm):
            near_cut = any(abs(e["frame"] - a) <= 3 for e in events if e["kind"] in ("cut", "crossfade", "bookend-cut"))
            FN.add("transition", "error", a, f"unplanned {kind} frame(s): {b - a} frame(s) at {a}-{b - 1}" + (" next to a cut" if near_cut else " (not at any planned cut/flash)"), (a, b),
                   {"luma": round(float(X["luma"][a]), 3)})
    Tf = T.astype(np.float32) / 255 if T is not None else None
    def ghost_frames(k0, k1, A_, B_):
        out = []
        for k in range(max(1, k0), min(n - 1, k1)):
            if k in (A_, B_) or is_planned(k, ("flash",)): continue   # a planned white flash over a cut is not ghosting
            a_, b_, c_ = Tf[A_], Tf[B_], Tf[k]; d = (a_ - b_).ravel()
            if (d * d).sum() < 1e-6: continue
            al = float(np.clip(((c_ - b_).ravel() @ d) / (d @ d), 0, 1))
            res = np.abs(c_ - (al * a_ + (1 - al) * b_)).mean(); near = min(np.abs(c_ - a_).mean(), np.abs(c_ - b_).mean())
            if CFG["ghost_alpha"][0] <= al <= CFG["ghost_alpha"][1] and res < CFG["ghost_resid"] * near: out.append(k)
        return out
    for e in events:
        f = int(e["frame"])
        if e["kind"] in ("cut", "bookend-cut"):
            if f < 2 or f + 2 >= n: continue
            jump = abs(X["luma"][f] - X["luma"][f - 1])
            g = ghost_frames(f - 1, f + 2, f - 2, f + 2) if Tf is not None else []
            if g: FN.add("transition", "warn", g[0], f"ghosting on a hard cut at {f}: frame(s) {g} look like a blend of both shots", (f - 1, f + 2), {"ghostFrames": g})
            if jump > CFG["cut_luma_jump_warn"] and not near_planned(f, 2, ("flash",)):
                FN.add("transition", "warn", f, f"brightness jumps {jump:.2f} across the cut at {f} (luma {X['luma'][f - 1]:.2f}->{X['luma'][f]:.2f})", (f - 1, f + 1), {"dLuma": round(float(jump), 3)})
            else:
                FN.add("transition", "info", f, f"{e['kind']} at {f}: luma jump {jump:.2f}, no black/white/ghost frames", (f - 1, f + 1), {"dLuma": round(float(jump), 3)})
        elif e["kind"] == "crossfade" and Tf is not None:
            L_ = e.get("len", 8)
            a, b = f - L_ - 2, f + L_ + 2
            if a < 1 or b >= n - 1: continue
            g = ghost_frames(a + 1, b, a, b)
            if not g: FN.add("transition", "warn", f, f"planned {L_}-frame crossfade at {f}: no blended frames found (hard cut or pop?)", (a, b))
            elif len(g) > CFG["xfade_len_factor"] * L_ + 3: FN.add("transition", "warn", f, f"crossfade at {f} blends for {len(g)} frames (planned {L_})", (a, b), {"ghostFrames": g})
            else: FN.add("transition", "info", f, f"crossfade at {f}: {len(g)} blended frames (planned {L_} story frames)", (a, b), {"ghostFrames": g})

    # (6) POSE / POSITION JUMPS ------------------------------------------------------------
    def pop_check(i, a, b, c, label):
        mn = min(a, b)
        norm = mn / (c / 2 + 0.5)
        if mn > CFG["pop_abs_warn"] and not (mn > CFG["pop_ratio_warn"] * c + 1) and norm >= CFG["pop_norm_warn"]:
            FN.add("pose_jump", "warn", i, f"{label}: frame {i} deviates from BOTH neighbours ({a:.1f} / {b:.1f}) much more than the neighbours' own 2-frame motion implies ({c:.1f}); "
                   f"normalised spike {norm:.2f} in a fast shot -> warn", (i, i + 1), {"dPrev": round(a, 2), "dNext": round(b, 2), "dSkip": round(c, 2), "norm": round(norm, 2)})
            return True
        if mn > CFG["pop_abs_warn"] and mn > CFG["pop_ratio_warn"] * c + 1:
            sev = "error" if (mn > CFG["pop_abs_error"] and mn > CFG["pop_ratio_error"] * c + 1) else "warn"
            FN.add("pose_jump", sev, i, f"{label} spikes for ONE frame at {i}: differs from {i - 1} by {a:.1f} and from {i + 1} by {b:.1f}, while {i - 1} vs {i + 1} differ by {c:.1f} (0..255)",
                   (i, i + 1), {"dPrev": round(a, 2), "dNext": round(b, 2), "dSkip": round(c, 2)})
            return True
        return False
    for i in range(1, n - 1):
        if near_planned(i, 1): continue
        hit = False
        for nm, m in SUB[i].items():
            if "pop" in m: hit |= pop_check(i, *m["pop"], f"subject '{nm}' (box)")
        if not hit and not np.isnan(X["diff"][i]) and not np.isnan(X["diff2"][i + 1]):
            pop_check(i, X["diff"][i], X["diff"][i + 1], X["diff2"][i + 1], "whole frame")

    # (7) BLUR -----------------------------------------------------------------------------
    sh = X["sharp"]
    for (sid, seg), idx in setups.items():
        if isinstance(sid, str): continue    # bookend cards
        base = [i for i in idx if not near_planned(i, 1)]
        if len(base) < 5: continue
        med = float(np.median(sh[base]))
        if med <= 0: continue
        low = np.zeros(n, bool)
        for i in idx:
            if not near_planned(i, 1) and sh[i] < CFG["blur_ratio"] * med: low[i] = True
        for a, b in runs(low):
            if b - a < CFG["blur_min_frames"]: continue
            r = float(sh[a:b].min() / med)
            sev = "error" if (b - a >= CFG["blur_error_frames"] and r < CFG["blur_ratio_error"]) else "warn"
            FN.add("blur", sev, a + int(np.argmin(sh[a:b])), f"sharpness drops to {r:.2f}x the shot-{sid} (setup {idx[0]}-{idx[-1]}) median for {b - a} frames (Laplacian variance {sh[a:b].min():.5f} vs {med:.5f}); the engine has no motion blur",
                   (a, b), {"ratio": round(r, 3)})
        for nm in names:   # inside subject boxes (model boxes -> warn)
            vals = {i: SUB[i][nm]["sharp"] for i in idx if nm in SUB[i] and SUB[i][nm].get("sharp") is not None and SUB[i][nm].get("area", 0) >= CFG["pop_min_box_px"] and not near_planned(i, 1)}
            if len(vals) < 10: continue
            m2 = float(np.median(list(vals.values())))
            lowS = np.array([i in vals and vals[i] < CFG["blur_ratio"] * m2 for i in range(n)])
            for a, b in runs(lowS):
                if b - a >= CFG["blur_min_frames"]:
                    FN.add("blur", "warn", a, f"subject '{nm}' region sharpness below {CFG['blur_ratio']}x its shot median for {b - a} frames", (a, b))

    # (8) EMPTY / UNINTERESTING ------------------------------------------------------------
    empty = (X["edge"] < CFG["empty_edge"]) & (X["cstd"] < CFG["empty_colour_std"] * 2)
    flat = X["cstd"] < CFG["empty_colour_std"]
    empty_cand = empty | flat
    for a, b in runs(empty_cand & np.array([not bookend(i) for i in range(n)])):
        if b - a < CFG["empty_info_frames"]: continue
        if b - a < CFG["empty_frames"]:
            FN.add("empty", "info", (a + b) // 2, f"nearly empty for {b - a} frames ({(b - a) / fps:.1f} s, below the {CFG['empty_frames']}-frame threshold): edge density {np.median(X['edge'][a:b]):.4f}", (a, b)); continue
        intended = all((sdat(i) or {}).get("intendedEmpty") for i in range(a, b))
        sev = "info" if intended else ("error" if flat[a:b].mean() > 0.8 or (X["edge"][a:b] < CFG["empty_edge"] / 4).mean() > 0.8 else "warn")
        FN.add("empty", sev, (a + b) // 2, f"visually empty for {b - a} frames ({(b - a) / fps:.1f} s): edge density {np.median(X['edge'][a:b]):.4f}, colour std {np.median(X['cstd'][a:b]):.3f}"
               + (" - marked intended in the config" if intended else ""), (a, b), {"edge": round(float(np.median(X["edge"][a:b])), 5), "colourStd": round(float(np.median(X["cstd"][a:b])), 4)})

    # (9) DEPTH OF FIELD -------------------------------------------------------------------
    for (sid, seg), idx in setups.items():
        if isinstance(sid, str): continue
        for nm in names:
            q = {}
            for i in idx:
                m = SUB[i].get(nm)
                if not m or near_planned(i, 1) or not m.get("ring") or m.get("area", 0) < CFG["dof_min_box_frac"] * W * H: continue
                q[i] = m["sharp"] / max(m["ring"], 1e-9)
            if len(q) < 10: continue
            exp = any(((sdat(i) or {}).get("dof") or {}).get("expected") for i in q)
            med = float(np.median(list(q.values()))); mid = list(q)[len(q) // 2]
            if exp and med < CFG["dof_expected_ratio"]:
                FN.add("dof", "warn", mid, f"shot {sid}: DOF expected but '{nm}' is not sharper than its surroundings (ratio {med:.2f})", (idx[0], idx[-1] + 1), {"ratio": round(med, 3)})
            elif not exp and med < CFG["dof_min_ratio"]:
                FN.add("dof", "warn", mid, f"shot {sid}: DOF is OFF but '{nm}' is much softer than its surroundings (ratio {med:.2f}); flat cards can score low, verify", (idx[0], idx[-1] + 1), {"ratio": round(med, 3)})
            drop = np.array([i in q and q[i] < CFG["dof_drop"] * med for i in range(n)])
            for a, b in runs(drop):
                if b - a >= CFG["dof_drop_frames"]:
                    FN.add("dof", "warn", a, f"'{nm}' turns soft relative to its surroundings for {b - a} frames (ratio {min(q[j] for j in range(a, b)):.2f} vs shot median {med:.2f})"
                           + ("" if exp else "; DOF is not expected here (lens blur leak?)"), (a, b))

    # (10)+(11) AUDIO ----------------------------------------------------------------------
    audio = {}
    if P["audio"]:
        audio = audio_checks(A, FN, events, X, n, fps, is_planned)
    else:
        FN.add("audio_level", "error", 0, "no audio stream in the file")
    if A.audio_report and os.path.exists(A.audio_report):
        ar = json.load(open(A.audio_report)); audio["audio_report"] = {k: ar.get(k) for k in ("lufs", "true_peak_db", "sample_peak", "clipped_samples", "pass")}
        for c in ar.get("checks", []):
            if not c["ok"]:
                cat = "audio_sync" if c["name"].startswith("sync") else "audio_level"
                FN.add(cat, "warn" if c.get("warn") else "error", 0, f"audio_report.json (mix before encoding): {c['name']} - {c['detail']}")
        FN.add("audio_level", "info", 0, f"audio_report.json: mix {ar.get('lufs')} LUFS, {ar.get('true_peak_db')} dBTP, {ar.get('clipped_samples')} clipped samples, word-sync cues ok: "
               + ", ".join(f"{s['id']} {s['error_s']:+.3f}s" for s in ar.get("sync", [])))

    # (12) DUPLICATES ----------------------------------------------------------------------
    locm = np.array([local_median(X["diff"], i, 6) for i in range(n)])
    dup = ((X["diff"] < CFG["dup_mean"]) & (X["dmax"] <= CFG["dup_max"])) | ((X["diff"] < CFG["dup_rel_mean"]) & (X["diff"] < CFG["dup_rel"] * locm))
    moving = np.array([(sdat(i) or {}).get("motion", "moving") == "moving" and not bookend(i) for i in range(n)])
    dup_m = dup & moving
    in_frozen = np.zeros(n, bool)
    for a, b in runs(dup_m):
        L_ = b - a + 1   # b-a repeats = b-a+1 identical frames
        if L_ >= CFG["frozen_warn_frames"]:
            in_frozen[a:b] = True
            hold = all(((sdat(i) or {}).get("story") or 0) >= (story or {}).get("storyFrames", 1e9) - 1.001 for i in range(a, b)) if story else False
            sev = "error" if L_ >= CFG["frozen_error_frames"] else "warn"
            FN.add("duplicate", sev, a - 1, f"frozen picture: {L_} identical frames ({L_ / fps:.2f} s) in a shot expected to move" + (" (the time warp holds the LAST story frame here)" if hold else ""), (a - 1, b))
    iso = [i for i in range(n) if dup_m[i] and not in_frozen[i]]
    wnd = CFG["judder_window"]; done = set()
    for i in iso:
        if i in done: continue
        grp = [j for j in iso if i <= j < i + wnd]; done.update(grp)
        sev = "error" if len(grp) >= CFG["judder_error_pairs"] else "warn"
        FN.add("duplicate", sev, i, f"judder: {len(grp)} exact duplicate frame pair(s) within {wnd} frames of a moving shot (frames {grp[:10]})", (grp[0], grp[-1] + 1), {"pairs": grp})
    # partial judder: periodic near-duplicates (some layer updates on fewer frames than the camera)
    d = X["diff"]; low = np.zeros(n, bool)
    for i in range(1, n):
        if not moving[i] or dup[i] or near_planned(i, 1): continue
        md = local_median(d, i, 6)
        if md > CFG["lowmotion_min_median"] and d[i] < CFG["lowmotion_ratio"] * md: low[i] = True
    i = 0
    while i < n:
        w = np.where(low[i:i + wnd])[0]
        if len(w) >= CFG["lowmotion_per_window"]:
            a = i + int(w[0]); j = a
            while j < n and low[max(0, j - wnd):j + 1].sum() > 0 and (low[j:j + wnd].sum() >= 2): j += wnd
            js = [k for k in range(a, min(n, j)) if low[k]]
            FN.add("duplicate", "warn", a, f"partial judder: {len(js)} near-duplicate frames ({len(js) / max(1, (js[-1] - js[0] + 1)) * 100:.0f}% of frames {js[0]}-{js[-1]}) where motion drops below "
                   f"{CFG['lowmotion_ratio']}x the local level; something on screen updates on fewer frames than the camera (integer-frame effect under the time warp?)", (js[0], js[-1] + 1), {"frames": js[:40]})
            i = js[-1] + 1
        else: i += wnd

    # ------------------------------------------------ reports ------------------------------------------------
    F = sorted(FN.L, key=lambda f: (f["frame"], -SEV[f["severity"]]))
    screenshots(A, F, P, n)
    status = {c: ("FAIL" if any(f["category"] == c and f["severity"] == "error" for f in F) else ("WARN" if any(f["category"] == c and f["severity"] == "warn" for f in F) else "PASS")) for c in CATS}
    overall = "FAIL" if "FAIL" in status.values() else "PASS"
    np.savez(os.path.join(A.out, "perframe.npz"), **X)
    rep = {"video": A.video, "story": A.story, "offset": off, "frames": n, "fps": fps, "size": [P["w"], P["h"]], "overall": overall, "categories": status,
           "counts": {s: sum(f["severity"] == s for f in F) for s in SEV}, "thresholds": CFG, "audio": audio, "findings": F}
    json.dump(rep, open(os.path.join(A.out, "visual_qa.json"), "w"), indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    write_md(A, rep)
    if not A.quiet:
        print(f"VISUAL QA {overall}: {rep['counts']['error']} error, {rep['counts']['warn']} warn, {rep['counts']['info']} info  ({n} frames)")
        for c in CATS: print(f"  {c:12s} {status[c]}")
        for f in F:
            if f["severity"] != "info": print(f"  [{f['severity']:5s}] f{f['frame']:5d} {f['timestamp']:7.2f}s shot {f['shot']} {f['category']}: {f['message'][:150]}")
    return 1 if overall == "FAIL" else 0

# ------------------------------------------------ audio ------------------------------------------------
def audio_checks(A, FN, events, X, n, fps, is_planned):
    sr = 48000
    raw = run("ffmpeg", "-v", "error", "-i", A.video, "-map", "0:a:0", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-").stdout
    x = np.frombuffer(raw, np.float32)
    rawst = run("ffmpeg", "-v", "error", "-i", A.video, "-map", "0:a:0", "-f", "f32le", "-").stdout
    xs = np.frombuffer(rawst, np.float32)
    out = {}
    # (11) clipping + loudness
    clip = int((np.abs(xs) >= CFG["clip_level"]).sum()); peak = float(np.abs(xs).max()) if len(xs) else 0
    e = run("ffmpeg", "-hide_banner", "-nostats", "-i", A.video, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-", text=True).stderr
    tail = e[e.rfind("Summary:"):]
    gI = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", tail); gL = re.search(r"LRA:\s+(-?[\d.]+) LU", tail); gP = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", tail)
    I = float(gI.group(1)) if gI and gI.group(1) != "-inf" else None; TP = float(gP.group(1)) if gP and gP.group(1) != "-inf" else None
    out.update({"integrated_lufs": I, "lra": float(gL.group(1)) if gL else None, "true_peak_dbtp": TP, "sample_peak": round(peak, 4), "clipped_samples": clip})
    if clip >= CFG["clip_error_samples"]:
        FN.add("audio_level", "error", int(np.argmax(np.abs(xs)) // max(1, len(xs) // max(1, n))), f"{clip} decoded samples at full scale (>= {CFG['clip_level']}): audible clipping", None, {"clipped": clip})
    elif clip: FN.add("audio_level", "warn", 0, f"{clip} decoded samples at full scale", None, {"clipped": clip})
    if TP is not None:
        if TP > CFG["tp_error"]: FN.add("audio_level", "error", 0, f"true peak {TP:+.1f} dBTP (> {CFG['tp_error']}): will clip on playback/transcode")
        elif TP > CFG["tp_warn"]: FN.add("audio_level", "warn", 0, f"true peak {TP:+.1f} dBTP above {CFG['tp_warn']} dBTP (AAC encoding can add ~0.5 dB)")
    if I is not None:
        if abs(I - CFG["lufs_target"]) > CFG["lufs_tol"]:
            FN.add("audio_level", "info" if A.excerpt else "warn", 0, f"integrated loudness {I:.1f} LUFS vs target {CFG['lufs_target']} +/- {CFG['lufs_tol']}" + (" (excerpt: not meaningful)" if A.excerpt else ""))
        else: FN.add("audio_level", "info", 0, f"integrated loudness {I:.1f} LUFS, true peak {TP} dBTP, sample peak {peak:.3f}, {clip} clipped samples")
    # (10) sync. The final mix is dense (voice + music + SFX), so an onset in the mix cannot always be attributed to the cue. Method:
    #  - onset strength in 3 bands (<150 Hz booms/drums, 150-2000 Hz, >2 kHz cracks): rise of the 10 ms log energy over the minimum of the
    #    previous 5..50 ms; candidate onsets = contiguous runs with rise >= onset_min_db, onset time = first sample above half the run's peak;
    #  - per event: the candidate with the best score rise - onset_lambda * |delay| (strong AND near the picture event);
    #  - the whole-track offset = median delay over all events (a mux / bookend error shifts everything): > tolerance -> error;
    #  - a single event off by > tolerance -> error only if its onset is isolated (the mix was quiet before it), else warn (attribution uncertain).
    from scipy import signal
    hop = sr // 400; win = sr // 100
    if len(x) < win * 40: return out
    xd = x.astype(np.float64)
    bands = [signal.butter(4, 150, "low", fs=sr, output="sos"), signal.butter(4, [150, 2000], "band", fs=sr, output="sos"), signal.butter(4, 2000, "high", fs=sr, output="sos")]
    envs = [10 * np.log10(np.convolve(signal.sosfilt(sos, xd) ** 2, np.ones(win) / win, mode="same")[::hop] + 1e-10) for sos in bands]
    full = 10 * np.log10(np.convolve(xd ** 2, np.ones(win) / win, mode="same")[::hop] + 1e-10)
    rises = [e - ndimage.minimum_filter1d(np.concatenate([np.full(20, e[0]), e])[:-2], 18, origin=8)[:len(e)] for e in envs]   # vs min of ~5..50 ms before
    peaks = []   # (hop index of onset, rise dB): per band, peaks of the rise curve, onset = start of that attack (back to half the peak)
    for r_ in rises:
        pk, _ = signal.find_peaks(r_, height=CFG["onset_min_db"], distance=8, prominence=4)
        for k in pk:
            j = k
            while j > 0 and r_[j - 1] >= 0.5 * r_[k] and k - j < 40: j -= 1
            peaks.append((j, float(r_[k])))
    peaks.sort()
    P_on = np.array([q[0] for q in peaks]); P_r = np.array([q[1] for q in peaks])
    groups = {}
    for e in events:
        if e.get("audioExpected"): groups.setdefault(int(e["frame"]), []).append(e)
    rows = []
    for f, es in sorted(groups.items()):
        kinds = "+".join(sorted({e["kind"] for e in es}))
        fv = float(f)
        if any(e["kind"] == "flash" for e in es):   # measure the visible flash onset
            for k in range(max(1, f - 2), min(n, f + 4)):
                if X["luma"][k] - X["luma"][k - 1] > 0.08: fv = float(k); break
        t0 = fv / fps
        a = int((t0 + CFG["sync_search"][0] / fps) * 400); b = int((t0 + CFG["sync_search"][1] / fps) * 400)
        if a < 60 or b >= len(full): continue
        sel = (P_on >= a) & (P_on < b)
        cands = [{"t": k / 400, "rise": rr, "pre": float(np.median(full[max(0, k - 40):k - 4]))} for k, rr in zip(P_on[sel], P_r[sel])]
        if not cands:
            FN.add("audio_sync", "warn", f, f"{kinds} at {f}: no distinct audio onset within {CFG['sync_search']} frames (below {CFG['onset_min_db']} dB); masked by voice/music or missing SFX", None)
            rows.append({"frame": f, "kinds": kinds, "delayFrames": None}); continue
        top = max(c["rise"] for c in cands)
        c = max(cands, key=lambda c: c["rise"] - CFG["onset_lambda"] * abs(c["t"] - t0) * fps)   # strong AND near the event
        delay = (c["t"] - t0) * fps
        iso = c["pre"] < -30 and c["rise"] >= CFG["onset_clear_db"]
        rows.append({"frame": f, "kinds": kinds, "pictureFrame": fv, "audioOnsetS": round(c["t"], 4), "delayFrames": round(delay, 2), "riseDb": round(c["rise"], 1),
                     "preDb": round(c["pre"], 1), "isolated": iso, "candidates": [round((q["t"] - t0) * fps, 2) for q in cands]})
        ev = rows[-1]
        if abs(delay) > CFG["sync_tol_frames"]:
            FN.add("audio_sync", "error" if iso else "warn", f, f"{kinds} at {f}: nearest strong audio onset {delay:+.1f} frames {'late' if delay > 0 else 'early'} (tolerance {CFG['sync_tol_frames']}, rise {c['rise']:.1f} dB, "
                   + ("isolated onset" if iso else f"mix {c['pre']:.0f} dB before it: dense mix, attribution uncertain -> warn") + ")", None, ev)
        else: FN.add("audio_sync", "info", f, f"{kinds} at {f}: audio onset {delay:+.1f} frames (rise {c['rise']:.1f} dB{', isolated' if iso else ''})", None, ev)
    ds = [r_["delayFrames"] for r_ in rows if r_.get("delayFrames") is not None]
    if len(ds) >= 3:
        med = float(np.median(ds)); out["median_delay_frames"] = round(med, 2)
        if abs(med) > CFG["sync_tol_frames"]:
            FN.add("audio_sync", "error", int(rows[0]["frame"]), f"the WHOLE soundtrack is offset: median audio-onset delay {med:+.1f} frames over {len(ds)} impact events (tolerance {CFG['sync_tol_frames']}): audio {'late' if med > 0 else 'early'} vs picture",
                   None, {"medianDelayFrames": round(med, 2), "delays": ds}, fix="Check the mux: intro/outro card lengths (finish.sh), audio start offset, frame rate; re-run scripts/finish.sh.")
        else: FN.add("audio_sync", "info", 0, f"median audio-onset delay over {len(ds)} impact events: {med:+.2f} frames (tolerance {CFG['sync_tol_frames']})", None, {"delays": ds})
    out["sync"] = rows
    return out

# ------------------------------------------------ screenshots / sheet / markdown ------------------------------------------------
def screenshots(A, F, P, n):
    flagged = [f for f in F if f["severity"] != "info"]
    flagged.sort(key=lambda f: (-SEV[f["severity"]], f["frame"]))
    frames = []
    for f in flagged:
        if f["frame"] not in frames: frames.append(f["frame"])
        if len(frames) >= A.max_shots: break
    frames = sorted(x for x in frames if 0 <= x < n)
    if not frames: return
    d = os.path.join(A.out, "screenshots"); tmpd = os.path.join(d, "_tmp"); os.makedirs(tmpd, exist_ok=True)
    sel = "+".join(f"eq(n\\,{x})" for x in frames)
    r = run("ffmpeg", "-v", "error", "-y", "-i", A.video, "-vf", f"select={sel}", "-fps_mode", "passthrough", "-q:v", "3", os.path.join(tmpd, "s%03d.jpg"), text=True)
    if r.returncode: print("screenshot extraction failed:", r.stderr[-400:], file=sys.stderr)
    got = sorted(os.listdir(tmpd))
    sheet = []
    for k, fr in enumerate(frames):
        if k >= len(got): break
        fs = [f for f in F if f["frame"] == fr and f["severity"] != "info"]
        cats = "+".join(sorted({f["category"] for f in fs})); worst = max((f["severity"] for f in fs), key=SEV.get)
        name = f"f{fr:05d}_{cats.replace('+', '-')}.jpg"
        os.replace(os.path.join(tmpd, got[k]), os.path.join(d, name))
        for f in fs: f["screenshotPath"] = os.path.join("screenshots", name)
        sheet.append((os.path.join(d, name), fr, cats, worst))
    for x in os.listdir(tmpd): os.remove(os.path.join(tmpd, x))
    os.rmdir(tmpd)
    if not sheet: return
    cw, ch, cols, bd = 216, 384, 8, 8
    rows = (len(sheet) + cols - 1) // cols
    S = Image.new("RGB", (cols * (cw + 2 * bd), rows * (ch + 2 * bd)), (20, 20, 20)); dr = ImageDraw.Draw(S)
    for j, (p, fr, cats, worst) in enumerate(sheet):
        x, y = (j % cols) * (cw + 2 * bd), (j // cols) * (ch + 2 * bd)
        dr.rectangle([x, y, x + cw + 2 * bd - 1, y + ch + 2 * bd - 1], fill=(220, 30, 30) if worst == "error" else (245, 150, 20))
        S.paste(Image.open(p).resize((cw, ch)), (x + bd, y + bd))
        dr.rectangle([x + bd, y + bd, x + bd + cw, y + bd + 26], fill=(0, 0, 0))
        dr.text((x + bd + 3, y + bd + 2), f"f{fr} {worst}", fill=(255, 255, 0)); dr.text((x + bd + 3, y + bd + 13), cats[:34], fill=(255, 255, 255))
    S.save(os.path.join(A.out, "problem_sheet.jpg"), quality=85)

def write_md(A, rep):
    F = rep["findings"]; md = [f"# Visual QA report: `{os.path.basename(rep['video'])}`", "",
        f"**Overall: {rep['overall']}** - {rep['counts']['error']} error, {rep['counts']['warn']} warn, {rep['counts']['info']} info; {rep['frames']} frames at {rep['fps']:.0f} fps, {rep['size'][0]}x{rep['size'][1]}"
        + (f", excerpt offset {rep['offset']}" if rep["offset"] else ""), "",
        "Report-only: nothing was edited. FAIL = at least one error-severity finding. Model-based detections (subject boxes, obstacles, composition) are capped at warn.", "",
        "## Status per check", "| check | status | errors | warns |", "|---|---|---|---|"]
    for c in CATS: md.append(f"| {c} | {rep['categories'][c]} | {sum(f['category'] == c and f['severity'] == 'error' for f in F)} | {sum(f['category'] == c and f['severity'] == 'warn' for f in F)} |")
    md += ["", "Problem frames: `problem_sheet.jpg` (red border = error, orange = warn).", "", "## Findings (error / warn)",
           "| timestamp | frame | category | severity | shot | message | suggested correction | screenshot |", "|---|---|---|---|---|---|---|---|"]
    esc = lambda s: str(s).replace("|", "/").replace("\n", " ")
    for f in F:
        if f["severity"] == "info": continue
        md.append(f"| {f['timestamp']:.2f}s | {f['frame']} | {f['category']} | **{f['severity']}** | {f['shot']} | {esc(f['message'])} | {esc(f['suggestedFix'])} | "
                  + (f"[img]({f['screenshotPath']})" if f["screenshotPath"] else "-") + " |")
    md += ["", "## Info (measurements that passed)", "| frame | category | message |", "|---|---|---|"] + [f"| {f['frame']} | {f['category']} | {esc(f['message'])} |" for f in F if f["severity"] == "info"]
    open(os.path.join(A.out, "visual_qa.md"), "w").write("\n".join(md) + "\n")

if __name__ == "__main__":
    sys.exit(main())
