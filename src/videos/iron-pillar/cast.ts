// The cast of "दिल्ली का लौह स्तंभ" (Iron Pillar), all drawn with the visual kit (people.ts + wardrobe.ts + face.ts) as cards on
// the kit card stage: today's visitors at the Qutb complex (families, a guide, children), Gupta-era smiths (hammer man, tong
// holder, bellows boy), and a modern metallurgist in the lab. Respectful everyday clothing, natural skin tones, no caricature.
import type { Card, V3 } from "../../engine/kit/stage";
import { drawPerson, type Person, type Pose, type Anchors } from "../../engine/kit/people";
import { villager, child, citizen1944, cityWoman, elder } from "../../engine/kit/wardrobe";
import type { KPen } from "../../engine/kit/core";

// ---------------- the people ----------------
const modernMan = (seed: number, top: string, bottom: string, o: Partial<Person["look"]> = {}): Person => {
  const c = citizen1944(seed);
  return { ...c, look: { ...c.look, top: "shirt", topCol: top, topPat: undefined, bottom: "trousers", bottomCol: bottom, hat: "none", feet: "shoes", ...o } };
};
const modernGirl = (seed: number, top: string, bottom: string): Person => {
  const c = child(seed);
  return { ...c, build: "girl", look: { ...c.look, top: "kurta_short", topCol: top, topPat: "dots", topPatCol: "#fff6dc", bottom: "pyjama", bottomCol: bottom, hair: "braid", feet: "chappal", sleeves: "short", borderCol: undefined } };
};
const modernBoy = (seed: number, top: string): Person => {
  const c = child(seed);
  return { ...c, build: "boy", look: { ...c.look, top: "shirt", topCol: top, topPat: "checks", topPatCol: "#ffffff", bottom: "shorts", bottomCol: "#2f5f66", hair: "curly", feet: "shoes", sleeves: "short", borderCol: undefined } };
};
const kurtaWoman = (seed: number, top: string, bottom: string): Person => {
  const w = cityWoman(seed);
  return { ...w, look: { ...w.look, top: "kurta", topCol: top, topPat: "buti", topPatCol: "#fff1c4", bottom: "pyjama", bottomCol: bottom, hat: "none", hair: "braid", trimCol: "#f2b632", shawl: undefined } };
};
export const GIRL_P = modernGirl(12, "#f2b632", "#2f8f83");
export const DAD = modernMan(31, "#9fd8c4", "#3a4448", { facial: "moustache" });
export const SON = modernBoy(44, "#e8643a");
export const GUIDE: Person = (() => { const m = modernMan(52, "#f6ecd2", "#6a6a5a", { facial: "beard" }); return { ...m, look: { ...m.look, hat: "cap", hatCol: "#1f5f66" } }; })();
export const HUGGER_P: Person = modernMan(63, "#e9dfc4", "#5a4a3a", { facial: "moustache", extras: ["rolled_sleeves"] });
export const VISITORS: Person[] = [
  cityWoman(3), modernMan(7, "#c9d8cf", "#3a4448"), kurtaWoman(9, "#e8643a", "#f6ecd2"), modernBoy(11, "#2f8f83"), elder(14),
  modernMan(15, "#f3f1ea", "#8a7a5a", { facial: "beard" }), cityWoman(17), modernGirl(19, "#9fd8c4", "#c8323a"), kurtaWoman(21, "#2f8f83", "#efe8d4"),
  modernMan(23, "#f2b632", "#3a4448"), cityWoman(25), modernBoy(27, "#f2b632"), modernMan(29, "#dfe6e2", "#1f2a3a", { hat: "gandhi", hatCol: "#f8f6ee" }),
];
/** Gupta-era smiths: bare-armed vests, dhoti, headcloth */
const smith = (seed: number, cloth: string, facial: "beard" | "moustache" | "handlebar"): Person => {
  const v = villager(seed, false);
  return { ...v, skin: ["#b0754e", "#93603e", "#c78c62"][seed % 3], girth: 1.1, look: { ...v.look, top: "banian", topCol: "#efe6cf", bottom: "dhoti", bottomCol: "#efe8d4", borderCol: "#c8323a", hat: "headcloth", hatCol: cloth, hatPat: undefined, shawl: undefined, vestCol: undefined, trimCol: undefined, facial, feet: "bare", extras: [] } };
};
export const HAMMER = smith(70, "#e8643a", "beard");
export const TONGS = smith(72, "#2f8f83", "moustache");
export const MASTER = smith(77, "#f2b632", "handlebar");
export const BELLOWS_BOY: Person = (() => { const c = child(81); return { ...c, build: "boy", look: { ...c.look, top: "banian", topCol: "#efe6cf", topPat: undefined, bottom: "dhoti", bottomCol: "#efe8d4", hat: "headcloth", hatCol: "#d9a441", feet: "bare", hair: "short" } }; })();
/** the metallurgist (lab coat = a white jacket), and a colleague */
export const SCIENTIST: Person = (() => { const w = cityWoman(40); return { ...w, look: { ...w.look, top: "jacket", topCol: "#f7f7f2", topPat: undefined, bottom: "trousers", bottomCol: "#2a4a4c", hat: "none", hair: "bun", feet: "shoes", bottomPat: undefined, borderCol: undefined, extras: ["bindi"] } }; })();
export const COLLEAGUE = modernMan(84, "#2f8f83", "#3a4448", { facial: "none", hair: "parted" });

// ---------------- cards ----------------
/** card metres: 600 x 1000 design units = 1.296 m x 2.16 m; soles at y 975 */
export const CARD_W = 1.296, CARD_H = 2.16, SOLE = (25 / 1000) * 2.16;
const q = (v: number) => Math.round(v * 120) / 120;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
export type PersonOpts = { flip?: boolean; scale?: number; tint?: [number, number, number]; rim?: boolean; maxPx?: number; extra?: (p: KPen, A: Anchors) => void; extraKey?: string; opacity?: number; order?: number };
export const personCard = (name: string, P: Person, pose: Pose, at: V3, o: PersonOpts = {}): Card => {
  const s = o.scale ?? 1;
  return {
    key: `P|${name}|${fkey(pose)}|${o.extraKey ?? ""}`,
    draw: (p) => { const A = drawPerson(p, P, pose); o.extra?.(p, A); },
    dw: 600, dh: 1000, w: CARD_W * s, pos: [at[0], at[1] - SOLE * s, at[2]],
    flip: o.flip, rim: o.rim ?? true, tintMul: o.tint, maxPx: o.maxPx, opacity: o.opacity, order: o.order,
  };
};
/** a prop card standing on the ground: design (dw x dh) with its base at design y = base, world width w */
export const propCard = (key: string, draw: (p: KPen) => unknown, dw: number, dh: number, base: number, w: number, at: V3, o: Partial<Card> = {}): Card => {
  const h = (w * dh) / dw;
  return { key, draw, dw, dh, w, pos: [at[0], at[1] - ((dh - base) / dh) * h, at[2]], ...o };
};
/** a smith's hammer in the hand: head up (raised) or down on the iron */
export const hammerIn = (up: number) => (p: KPen, A: Anchors) => {
  const h = A.hands[0]; if (!h) return;
  const a = -Math.PI / 2 - (1 - up) * 2.3, L = 150, hx = h[0] + Math.cos(a) * L, hy = h[1] + Math.sin(a) * L;
  p.band([[h[0] - Math.cos(a) * 20, h[1] - Math.sin(a) * 20], [hx, hy]], "#8a6238", 16, 4);
  p.g.save(); p.g.translate(hx, hy); p.g.rotate(a);
  p.poly([[-22, -46], [22, -46], [26, 46], [-26, 46]], "#3a3a3e", 6); p.stroke([[-18, -40], [-18, 40]], 4, "rgba(255,255,255,0.35)");
  p.g.restore();
};
/** tongs held toward the anvil (screen-right) */
export const tongsIn = (p: KPen, A: Anchors) => {
  const [a, b] = A.hands; if (!a || !b) return;
  const m: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  p.band([[m[0], m[1]], [m[0] + 260, m[1] + 60]], "#2a2a2e", 12, 3);
  p.band([[m[0], m[1] + 14], [m[0] + 260, m[1] + 74]], "#2a2a2e", 12, 3);
};
/** a clipboard / notebook */
export const clipboard = (p: KPen, A: Anchors) => {
  const h = A.hands[0]; if (!h) return;
  p.poly([[h[0] - 60, h[1] - 90], [h[0] + 60, h[1] - 90], [h[0] + 60, h[1] + 60], [h[0] - 60, h[1] + 60]], "#f6f1e2", 5);
  for (let i = 0; i < 5; i++) p.stroke([[h[0] - 40, h[1] - 60 + i * 22], [h[0] + 40 - (i % 2) * 20, h[1] - 60 + i * 22]], 4, "rgba(16,34,43,0.4)");
};
