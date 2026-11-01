// Visual kit: ready-made people for the two upcoming Hindi films, each a seeded variant (colours, patterns, body, skin,
// hair, facial hair) so a crowd never repeats. Respectful, everyday clothing of the period; no caricature.
//   1857 north-Indian village: villager (kurta/angrakha + dhoti, pagri or bare head, shawl at night), village woman
//   (ghagra-odhni or sari with a veil), elder, child, chowkidar (village watchman: pagri, angrakha, brass chapras badge,
//   lathi), British official / officer (scarlet coat or dark frock coat, sola topi).
//   1944 Bombay docks: dock worker (banian/vest + headcloth, lungi or shorts), fire-brigade man (brass helmet, navy
//   double-breasted tunic, belt, boots), clerk / citizen (shirt, trousers, Gandhi cap), city woman (sari).
import { Person, Look, Build } from "./people";
import { SKINS, PAL, hash, pick, mix } from "./core";

const H = (seed: number, k: number) => hash(seed * 1.37 + 0.11, k);
const body = (seed: number, build: Build, skins = SKINS.slice(1)): Omit<Person, "look"> => ({
  build, seed,
  height: (build === "boy" || build === "girl" ? 0.95 : 0.93) + 0.12 * H(seed, 1),
  girth: 0.85 + 0.4 * H(seed, 2) ** 1.5,
  skin: pick(skins, H(seed, 3)),
  hairCol: pick(["#1b1411", "#2a1c14", "#24170f", "#1f1a17"], H(seed, 4)),
  age: H(seed, 5) * 0.6,
});
// earthy, period-plausible cloth: whites, creams, indigo, madder red, turmeric, sea-green, sunflower (no purple)
const KURTA = ["#f3ecd8", "#e9dfc4", "#efe6cf", "#d8c9a4", "#c9d8cf", "#e4d4b0"];
const PAGRI = ["#f2b632", "#e8643a", "#c8323a", "#f6f0e0", "#2f8f83", "#e09a2c", "#d9a441"];
const DHOTI = ["#f6f1e2", "#efe8d4", "#f3edd9"];
const SHAWL = ["#7a3b2e", "#2f5f66", "#8a6a3a", "#5a4a3a", "#a0522d", "#3a5a4a"];
const GHAGRA = ["#c8323a", "#e8643a", "#2f8f83", "#d9a441", "#1f5f66", "#b5482e"];
const ODHNI = ["#f2b632", "#e8643a", "#f6e0a8", "#c8323a", "#9fd8c4"];

export const villager = (seed: number, night = true): Person => {
  const b = body(seed, "man");
  const turban = H(seed, 10) < 0.75, angrakha = H(seed, 11) < 0.3;
  const look: Look = {
    top: angrakha ? "angrakha" : "kurta", topCol: pick(KURTA, H(seed, 12)),
    trimCol: H(seed, 13) < 0.4 ? pick(["#c8323a", "#2f8f83", "#e09a2c"], H(seed, 14)) : undefined,
    bottom: "dhoti", bottomCol: pick(DHOTI, H(seed, 15)), borderCol: H(seed, 16) < 0.5 ? pick(["#c8323a", "#2f5f66", "#e09a2c"], H(seed, 17)) : undefined,
    hat: turban ? "pagri" : "none", hatCol: pick(PAGRI, H(seed, 18)), hatPat: H(seed, 19) < 0.35 ? "stripes" : undefined, hatPatCol: "#fff1c4",
    shawl: night && H(seed, 20) < 0.55 ? pick(SHAWL, H(seed, 21)) : undefined, shawlTrim: PAL.sun,
    feet: H(seed, 22) < 0.5 ? "bare" : "jutti", hair: "short",
    facial: pick(["moustache", "moustache", "beard", "none", "handlebar"] as const, H(seed, 23)),
    vestCol: H(seed, 24) < 0.2 ? pick(["#2f5f66", "#7a3b2e", "#3a4a2a"], H(seed, 25)) : undefined,
    extras: H(seed, 26) < 0.25 ? ["janeu"] : [],
  };
  return { ...b, look };
};
export const villageWoman = (seed: number): Person => {
  const b = body(seed, "woman");
  const sari = H(seed, 10) < 0.45;
  const look: Look = sari ? {
    top: "blouse", topCol: pick(["#c8323a", "#2f8f83", "#d9a441", "#1f5f66"], H(seed, 11)), sleeves: "short",
    bottom: "sari", bottomCol: pick(["#e8643a", "#2f8f83", "#f2b632", "#c8323a", "#e9dfc4"], H(seed, 12)), bottomPat: "buti",
    bottomPatCol: "#fff1c4", borderCol: pick(["#c8323a", "#1f5f66", "#f2b632"], H(seed, 13)),
    hat: "veil", hatCol: pick(ODHNI, H(seed, 14)), hatTrim: PAL.gold, hair: "bun", feet: "bare",
    extras: ["bangles", "earrings", ...(H(seed, 15) < 0.5 ? ["nosering" as const] : []), ...(H(seed, 16) < 0.6 ? ["bindi" as const] : [])],
  } : {
    top: "blouse", topCol: pick(["#2f8f83", "#c8323a", "#1f5f66", "#f2b632"], H(seed, 11)), sleeves: "long",
    bottom: "ghagra", bottomCol: pick(GHAGRA, H(seed, 12)), bottomPat: pick(["buti", "dots", "stripes"] as const, H(seed, 17)), bottomPatCol: "#fff1c4",
    borderCol: pick(["#f2b632", "#1f5f66", "#c8323a"], H(seed, 13)),
    hat: "veil", hatCol: pick(ODHNI, H(seed, 14)), hatPat: "dots", hatPatCol: "#fff6dc", hatTrim: "#c8323a", hair: "bun", feet: "bare",
    extras: ["bangles", "earrings", ...(H(seed, 16) < 0.6 ? ["bindi" as const] : [])],
  };
  return { ...b, look };
};
export const elder = (seed: number): Person => {
  const p = villager(seed + 500);
  return { ...p, age: 0.85, hairCol: pick(["#d9d6cf", "#bdb8ae", "#e8e4dc"], H(seed, 30)), girth: 0.85 + 0.15 * H(seed, 31), height: 0.9 + 0.05 * H(seed, 32),
    look: { ...p.look, hair: H(seed, 33) < 0.5 ? "bald" : "short", facial: "beard", shawl: pick(SHAWL, H(seed, 34)), hat: H(seed, 35) < 0.6 ? "pagri" : "none", hatCol: "#f6f0e0" } };
};
export const child = (seed: number): Person => {
  const girl = H(seed, 40) < 0.5, b = body(seed, girl ? "girl" : "boy");
  const look: Look = girl
    ? { top: "kurta_short", topCol: pick(["#f2b632", "#e8643a", "#9fd8c4", "#c8323a"], H(seed, 41)), topPat: "dots", topPatCol: "#fff6dc", bottom: "ghagra", bottomCol: pick(GHAGRA, H(seed, 42)), borderCol: PAL.sun, hair: "braid", feet: "bare", sleeves: "short" }
    : { top: "kurta_short", topCol: pick(KURTA, H(seed, 41)), bottom: "shorts", bottomCol: pick(["#2f5f66", "#7a5a44", "#d8c9a4"], H(seed, 42)), hair: "curly", feet: "bare", sleeves: "short" };
  return { ...b, look };
};
/** village watchman (chowkidar): pagri, angrakha with a red belt + brass chapras badge, lathi; the runner of the chapatis */
export const chowkidar = (seed: number): Person => {
  const b = body(seed, "man");
  return { ...b, height: 0.98 + 0.06 * H(seed, 1), girth: 0.9 + 0.15 * H(seed, 2), look: {
    top: "angrakha", topCol: pick(["#efe6cf", "#e4d4b0", "#f3ecd8"], H(seed, 50)), trimCol: "#c8323a",
    bottom: "dhoti", bottomCol: "#f3edd9", borderCol: "#c8323a",
    hat: "pagri", hatCol: pick(["#c8323a", "#e8643a", "#f2b632"], H(seed, 51)), hatPat: "stripes", hatPatCol: "#ffd36a", hatTrim: "#f6f0e0",
    sash: "#2f8f83", feet: "jutti", hair: "short", facial: pick(["handlebar", "moustache"] as const, H(seed, 52)),
    extras: ["chapras"],
  } };
};
/** a British official / officer of 1857 (respectful period dress): scarlet or dark-blue coat, sola topi, chops */
export const britishOfficer = (seed: number, scarlet = true): Person => {
  const b = body(seed, "man", ["#f1d6c0", "#ecc9ad", "#f4dcc8"]);
  return { ...b, hairCol: pick(["#6a4a2a", "#8a5a30", "#3a2a1a", "#a07040"], H(seed, 60)), look: {
    top: "officer_coat", topCol: scarlet ? "#b8232f" : "#26364f", trimCol: scarlet ? "#1f3a5a" : "#b8232f",
    bottom: "trousers", bottomCol: scarlet ? "#2b3448" : "#e9e4d6", borderCol: scarlet ? "#b8232f" : undefined,
    hat: "sola", hatCol: "#f1ece0", hatTrim: "#e2d8c0", feet: "boots", hair: "short",
    facial: pick(["chops", "moustache", "handlebar"] as const, H(seed, 61)),
    extras: ["epaulettes", "sash", ...(H(seed, 62) < 0.5 ? ["medal" as const] : [])],
  } };
};
/** 1944 Bombay Fire Brigade man: brass helmet, navy double-breasted tunic, belt with axe pouch, boots */
export const firefighter = (seed: number): Person => {
  const b = body(seed, "man");
  return { ...b, girth: 0.95 + 0.25 * H(seed, 2), look: {
    top: "fire_coat", topCol: pick(["#1f2f45", "#22344a", "#1c2a3c"], H(seed, 70)),
    bottom: "trousers", bottomCol: "#1c2838", hat: "fire_helmet", hatCol: "#e2a93a", feet: "boots", hair: "short",
    facial: pick(["moustache", "none", "moustache", "stubble"] as const, H(seed, 71)), extras: ["axe_belt"],
  } };
};
/** 1944 dock worker: banian or open vest, headcloth, lungi / shorts / rolled dhoti */
export const dockWorker = (seed: number): Person => {
  const b = body(seed, "man", SKINS.slice(2));
  const vest = H(seed, 80) < 0.4;
  return { ...b, girth: 0.9 + 0.35 * H(seed, 2), look: {
    top: vest ? "vest" : "banian", topCol: vest ? pick(["#2f5f66", "#7a5a44", "#3a4a3a"], H(seed, 81)) : pick(["#eef0ea", "#e6e2d4", "#dcd8c8"], H(seed, 82)),
    bottom: pick(["lungi", "shorts", "dhoti"] as const, H(seed, 83)), bottomCol: pick(["#2f8f83", "#1f5f66", "#d8c9a4", "#7a5a44", "#c8323a"], H(seed, 84)),
    bottomPat: H(seed, 85) < 0.5 ? "checks" : undefined, bottomPatCol: "#f6ecd2",
    hat: H(seed, 86) < 0.7 ? "headcloth" : "none", hatCol: pick(["#f2b632", "#e8643a", "#f6f0e0", "#c8323a", "#2f8f83"], H(seed, 87)),
    feet: H(seed, 88) < 0.6 ? "bare" : "chappal", hair: "short", facial: pick(["moustache", "none", "stubble", "moustache"] as const, H(seed, 89)),
  } };
};
/** 1944 Bombay citizen / clerk: shirt (or kurta), trousers or pyjama, Gandhi cap */
export const citizen1944 = (seed: number): Person => {
  const b = body(seed, "man");
  return { ...b, look: {
    top: H(seed, 90) < 0.6 ? "shirt" : "kurta", topCol: pick(["#f3f1ea", "#dfe6e2", "#e9dfc4", "#c9d8cf"], H(seed, 91)), topPat: H(seed, 92) < 0.3 ? "pinstripe" : undefined, topPatCol: "#7f9aa0",
    bottom: H(seed, 93) < 0.6 ? "trousers" : "pyjama", bottomCol: pick(["#6a6a5a", "#3a4448", "#f3efe4", "#8a7a5a"], H(seed, 94)),
    hat: H(seed, 95) < 0.55 ? "gandhi" : "none", hatCol: "#f8f6ee", feet: "shoes", hair: "short", facial: pick(["moustache", "none"] as const, H(seed, 96)),
    extras: H(seed, 97) < 0.5 ? ["rolled_sleeves"] : [],
  } };
};
export const cityWoman = (seed: number): Person => {
  const p = villageWoman(seed + 900);
  return { ...p, look: { ...p.look, top: "blouse", bottom: "sari", hat: H(seed, 98) < 0.3 ? "veil" : "none", hair: "bun", feet: "chappal",
    bottomCol: pick(["#2f8f83", "#e8643a", "#f2b632", "#1f5f66", "#d9a441"], H(seed, 99)), borderCol: pick(["#c8323a", "#f2b632", "#1f5f66"], H(seed, 100)), bottomPat: "buti", bottomPatCol: "#fff1c4" } };
};
export type Archetype = "villager" | "villageWoman" | "elder" | "child" | "chowkidar" | "officer" | "firefighter" | "dockWorker" | "citizen" | "cityWoman";
export const make = (a: Archetype, seed: number): Person => {
  switch (a) {
    case "villager": return villager(seed);
    case "villageWoman": return villageWoman(seed);
    case "elder": return elder(seed);
    case "child": return child(seed);
    case "chowkidar": return chowkidar(seed);
    case "officer": return britishOfficer(seed, hash(seed, 3) < 0.6);
    case "firefighter": return firefighter(seed);
    case "dockWorker": return dockWorker(seed);
    case "citizen": return citizen1944(seed);
    case "cityWoman": return cityWoman(seed);
  }
};
void mix;
