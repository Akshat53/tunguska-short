// Visual kit: burned-in Hindi captions (opt-in Remotion overlay). Devanagari is laid out by the browser (correct conjuncts
// and matras), in Baloo 2 (Google Fonts, loaded once; system Devanagari fonts as fallback). Driven by words.json
// ([{ word, start, end }], seconds): 3-5 word phrases split at punctuation (from the narration text) and pauses, the current
// word in sunflower on cream text with an ink outline (one line, max 4 words / ~70 % width, 80 px at 1080 wide), a subtle pop-in, placed in the Shorts safe zone (above the
// bottom 25 % of buttons, below the top 12 %), per-shot "top" / "bottom" so captions never cover faces. Optional keyword
// pops: a pill label at given frames ("1857", "मथुरा", "4 → 16 → 64" ...). Every value is a pure function of the frame.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";

export type Word = { word: string; start: number; end: number };
export type Place = "top" | "middle" | "bottom" | "hide";
export type Pop = { f: number; text: string; dur?: number; place?: "top" | "middle" | "bottom" };
export type Phrase = { i0: number; i1: number; a: number; b: number };
export const KIT_FONT = "'Baloo 2', 'Kohinoor Devanagari', 'Noto Sans Devanagari', 'Devanagari Sangam MN', sans-serif";
const C = { cream: "#FFF4DC", sun: "#F6B924", ink: "#10222B" };
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=block";

/** load Baloo 2 once (holds the render until the font is ready, or 10 s, then falls back to system fonts) */
let fontPromise: Promise<void> | null = null;
export const loadKitFont = (): Promise<void> => {
  if (fontPromise) return fontPromise;
  fontPromise = new Promise<void>((res) => {
    if (typeof document === "undefined") { res(); return; }
    if (!document.querySelector(`link[href="${FONT_CSS}"]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_CSS; document.head.appendChild(l);
    }
    const done = () => res();
    const timer = setTimeout(done, 10000);
    const tryLoad = (n: number) => {
      Promise.all([document.fonts.load(`800 64px "Baloo 2"`, "रोटी 1857"), document.fonts.load(`600 64px "Baloo 2"`, "रोटी")])
        .then((r) => { if (r[0].length || n > 40) { clearTimeout(timer); done(); } else setTimeout(() => tryLoad(n + 1), 100); })
        .catch(() => { clearTimeout(timer); done(); });
    };
    tryLoad(0);
  });
  return fontPromise;
};
/** hook: true once the kit font is ready (the frame is held with delayRender until then) */
export const useKitFont = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("kit font (Baloo 2)"));
  useEffect(() => { loadKitFont().then(() => { setReady(true); continueRender(handle); }); }, [handle]);
  return ready;
};

/** split words into phrases: break after punctuation in `text` (same tokens as words), at pauses > gap s, or at max words */
export const phrasesOf = (words: Word[], text?: string, o: { max?: number; min?: number; gap?: number; maxChars?: number } = {}): Phrase[] => {
  const max = o.max ?? 4, min = o.min ?? 2, gap = o.gap ?? 0.3, maxChars = o.maxChars ?? 22;
  const len = (a: number, b: number) => words.slice(a, b + 1).reduce((s, w) => s + w.word.length + 1, -1);
  const toks = text ? text.split(/\s+/).filter(Boolean) : [];
  const punct = (i: number) => toks.length === words.length && /[,।?!.:;]$/.test(toks[i]);
  const out: Phrase[] = [];
  let i0 = 0;
  for (let i = 0; i < words.length; i++) {
    const n = i - i0 + 1, last = i === words.length - 1;
    const pause = !last && words[i + 1].start - words[i].end > gap;
    const tooLong = !last && len(i0, i + 1) > maxChars; // one line only: the next word would not fit
    const brk = last || punct(i) || n >= max || tooLong || (pause && n >= min) || (n >= 3 && !last && words[i + 1].start - words[i].end > 0.12);
    if (brk) { out.push({ i0, i1: i, a: words[i0].start, b: words[i].end }); i0 = i + 1; }
  }
  return out;
};

export type CaptionProps = {
  words: Word[]; text?: string; fps?: number;
  /** frame offset: caption frame = composition frame - offset (e.g. an intro card before the picture) */
  offset?: number;
  /** where captions go at a frame (per shot); default bottom */
  place?: (f: number) => Place;
  pops?: Pop[];
  size?: number; width?: number; height?: number;
};

const outline = (w: number) => {
  const s: string[] = [];
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; s.push(`${(Math.cos(a) * w).toFixed(1)}px ${(Math.sin(a) * w).toFixed(1)}px 0 ${C.ink}`); }
  return s.join(", ") + `, 0px ${w * 1.6}px 0 ${C.ink}`;
};

export const Captions: React.FC<CaptionProps> = ({ words, text, fps = 30, offset = 0, place, pops = [], size: sizeIn, width = 1080, height = 1920 }) => {
  const size = sizeIn ?? 80 * (width / 1080);
  const f = useCurrentFrame() - offset;
  const t = f / fps;
  // one line: at most 4 words and about 70 % of the frame width (Baloo 2 Devanagari averages ~0.42 em per code unit)
  const phrases = React.useMemo(() => phrasesOf(words, text, { maxChars: Math.floor((width * 0.7) / (size * 0.42)) }), [words, text, width, size]);
  // the phrase on screen: from 2 frames before its first word until the next phrase starts (or 0.5 s after its end)
  let ph: Phrase | null = null;
  for (let k = 0; k < phrases.length; k++) {
    const p = phrases[k], next = phrases[k + 1];
    const a = p.a - 2 / fps, b = next ? Math.min(next.a - 2 / fps, p.b + 0.6) : p.b + 0.6;
    if (t >= a && t < b) { ph = p; break; }
  }
  const w0 = place ? place(f) : "bottom", where = w0 === "middle" ? "bottom" : w0; // one lower-third band; top only where it would cover a face
  const pop = (t0: number) => { const u = Math.max(0, Math.min(1, (t - t0) * fps / 5)); return 0.9 + 0.1 * (1 - (1 - u) ** 3) + 0.04 * Math.sin(Math.min(1, u) * Math.PI); };
  const stroke = outline(size * 0.0875);
  const box = (y: "top" | "bottom" | "middle"): React.CSSProperties => ({
    position: "absolute", left: width * 0.06, right: width * 0.06, display: "flex", justifyContent: "center", textAlign: "center",
    ...(y === "top" ? { top: height * 0.13 } : y === "middle" ? { top: height * 0.065 } : { bottom: height * 0.28 }),
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {ph && where !== "hide" && (
        <div style={box(where as "top" | "middle" | "bottom")}>
          <div style={{ fontFamily: KIT_FONT, fontWeight: 800, fontSize: size, lineHeight: 1.25, color: C.cream, textShadow: stroke,
            transform: `scale(${pop(ph.a - 2 / fps).toFixed(4)})`, transformOrigin: "50% 60%", whiteSpace: "nowrap" }}>
            {words.slice(ph.i0, ph.i1 + 1).map((w, k) => {
              const i = ph!.i0 + k, nx = words[i + 1];
              const on = t >= w.start - 1 / fps && t < (i < ph!.i1 && nx ? nx.start - 1 / fps : ph!.b + 0.6);
              return <span key={i} style={{ color: on ? C.sun : C.cream, display: "inline-block", marginRight: size * 0.22,
                transform: on ? "translateY(-3px) scale(1.06)" : "none" }}>{w.word}</span>;
            })}
          </div>
        </div>
      )}
      {pops.map((p, k) => {
        const dur = Math.min(p.dur ?? 45, 50), age = f - p.f; // pills: ~1.5 s at the top, then fade
        if (age < 0 || age >= dur) return null;
        const ps = 48 * (width / 1080), inU = Math.min(1, age / 6), outU = Math.max(0, (age - (dur - 10)) / 10), s = (0.6 + 0.4 * (1 - (1 - inU) ** 3) + 0.08 * Math.sin(inU * Math.PI)) * (1 - 0.15 * outU);
        return (
          <div key={k} style={{ ...box("middle"), opacity: 1 - outU }}>
            <div style={{ fontFamily: KIT_FONT, fontWeight: 800, fontSize: ps, lineHeight: 1.2, whiteSpace: "nowrap", color: C.ink, background: C.sun,
              padding: `${ps * 0.1}px ${ps * 0.5}px`, borderRadius: 999, border: `${ps * 0.1}px solid ${C.ink}`, boxShadow: `0 ${ps * 0.12}px 0 ${C.ink}`,
              transform: `scale(${s.toFixed(4)}) rotate(${(-2 + 2 * (k % 2)).toFixed(1)}deg)` }}>{p.text}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
