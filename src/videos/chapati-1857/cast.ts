// The cast of "1857 chapati", all drawn with the visual kit (src/engine/kit: people.ts + wardrobe.ts + face.ts) as cards on
// the kit card stage: the chowkidar (runner), the hooded stranger, British officers and the Mathura magistrate, the Delhi
// court's hakim (white beard), Bengal Army sepoys (built here from kit parts + a local musket), villagers, a historian.
// Helpers turn a Person + Pose into a stage Card (600 x 1000 design card, soles at y 975) and place props.
import type { Card, V3 } from "../../engine/kit/stage";
import { drawPerson, type Person, type Pose, type Anchors } from "../../engine/kit/people";
import { chowkidar, britishOfficer, villager, villageWoman, elder, child, citizen1944 } from "../../engine/kit/wardrobe";
import type { KPen } from "../../engine/kit/core";
import { musket } from "./art";

// ---------------- the people ----------------
export const CHOW = chowkidar(7);
export const OFFICER1 = britishOfficer(9, true);
export const OFFICER2 = britishOfficer(12, true);
const mag = britishOfficer(21, false);
export const MAGISTRATE: Person = { ...mag, look: { ...mag.look, hat: "none", hair: "bald", facial: "chops", extras: ["brass_buttons"] } };
const tr = britishOfficer(33, true);
export const TEARER: Person = tr;
const st = villager(31);
export const STRANGER: Person = { ...st, look: { ...st.look, top: "kurta", topCol: "#4a4a54", trimCol: undefined, hat: "headcloth", hatCol: "#2e3038", shawl: "#26282e", shawlTrim: "#3a3c44", facial: "beard", bottomCol: "#8a8678", borderCol: undefined, vestCol: undefined } };
const hk = elder(4);
export const HAKIM: Person = { ...hk, height: 0.98, girth: 1.15, hairCol: "#ecebe6", look: { ...hk.look, top: "angrakha", topCol: "#f6f1e2", trimCol: "#2f8f83", hat: "pagri", hatCol: "#f6f0e0", hatTrim: "#d6a542", hair: "short", facial: "beard", shawl: "#2f5f66", shawlTrim: "#f2b632", bottom: "pyjama", bottomCol: "#efe8d4", feet: "jutti", vestCol: undefined, extras: [] } };
export const COOK = villageWoman(4);
export const CLERK: Person = (() => { const v = villager(44, false); return { ...v, look: { ...v.look, hat: "pagri", hatCol: "#f6f0e0", top: "angrakha", topCol: "#f3ecd8", shawl: undefined } }; })();
export const PEON = chowkidar(15);
export const HISTORIAN: Person = (() => { const c = citizen1944(5); return { ...c, look: { ...c.look, top: "shirt", topCol: "#e9e4d6", topPat: undefined, vestCol: "#3a4a5a", bottom: "trousers", bottomCol: "#4a4a44", hat: "none", hair: "curly", facial: "moustache", extras: ["rolled_sleeves"] } }; })();
export const ATTENDANT: Person = (() => { const v = villager(52, false); return { ...v, look: { ...v.look, hat: "pagri", hatCol: "#c8323a", top: "angrakha", topCol: "#f3ecd8", shawl: undefined } }; })();
export const sepoy = (seed: number): Person => {
  const v = villager(200 + seed, false);
  return { ...v, height: 0.98 + 0.06 * ((seed * 37) % 10) / 10, look: {
    top: "officer_coat", topCol: "#b8232f", trimCol: "#f2e6c8", bottom: "trousers", bottomCol: "#efe8d8",
    hat: "forage", hatCol: "#1f2a3a", hatTrim: "#f2e6c8", feet: "shoes", hair: "short", facial: seed % 3 ? "moustache" : "handlebar",
    extras: ["crossbelts", "brass_buttons"],
  } };
};
export const VILLAGERS = [villager(3), villager(16), elder(5), child(6), child(18), villageWoman(9), villageWoman(14), villager(22), elder(23)];

// ---------------- cards ----------------
/** card metres: 600 x 1000 design units = 1.296 m x 2.16 m; soles at y 975 */
export const CARD_W = 1.296, CARD_H = 2.16, SOLE = (25 / 1000) * 2.16;
const q = (v: number) => Math.round(v * 120) / 120;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
export type PersonOpts = { flip?: boolean; scale?: number; tint?: [number, number, number]; rim?: boolean; maxPx?: number; extra?: (p: KPen, A: Anchors) => void; extraKey?: string; opacity?: number };
export const personCard = (name: string, P: Person, pose: Pose, at: V3, o: PersonOpts = {}): Card => {
  const s = o.scale ?? 1;
  return {
    key: `P|${name}|${fkey(pose)}|${o.extraKey ?? ""}`,
    draw: (p) => { const A = drawPerson(p, P, pose); o.extra?.(p, A); },
    dw: 600, dh: 1000, w: CARD_W * s, pos: [at[0], at[1] - SOLE * s, at[2]],
    flip: o.flip, rim: o.rim ?? true, tintMul: o.tint, maxPx: o.maxPx, opacity: o.opacity,
  };
};
/** a prop card standing on the ground: design (dw x dh) with its base at design y = base, world width w */
export const propCard = (key: string, draw: (p: KPen) => unknown, dw: number, dh: number, base: number, w: number, at: V3, o: Partial<Card> = {}): Card => {
  const h = (w * dh) / dw;
  return { key, draw, dw, dh, w, pos: [at[0], at[1] - ((dh - base) / dh) * h, at[2]], ...o };
};
/** a musket held by a sepoy: at the near hand, vertical at the side (shoulder arms) or raised overhead */
export const withMusket = (raised: boolean) => (p: KPen, A: Anchors) => {
  const h = A.hands[A.hands.length - 1];
  if (!h) return;
  if (raised) musket(p, [h[0] - 40, h[1] + 10], -Math.PI / 2 - 0.35, 300);
  else musket(p, [h[0], h[1] + 120], -Math.PI / 2 + 0.05, 330);
};
