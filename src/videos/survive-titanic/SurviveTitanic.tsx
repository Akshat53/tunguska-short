// "Could YOU Survive? Ep 1: The Titanic (1912)" (English, Inkfall global). Second person: the series mascot is "you", in the
// North Atlantic at 2:20 AM, 15 April 1912. Built on the visual kit's card stage (src/engine/kit): kit drawings and Blender
// props (public/props) as ink-outlined cards in a 3D night sea. Post chain as in the other films: InkPass (own pass) ->
// [lens blur: off] -> bloom (lights only) -> NEUTRAL tone mapping -> colour grade (night). No film grain, no captions.
// Overlays (not captions): the series badge (always on), ONE choice pill, and the cold-shock body timer (shots 3-4).
// Frame 0 is already the hook in motion; the last frame loops to frame 0.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass } from "../tunguska/ink";
import { GradeEffect, type GradeParams } from "../tunguska/grade";
import { GRADE_NIGHT } from "../../engine/kit/looks";
import { TOTAL, FLASHES, PILL, NEXT, TIMER, timerMinutes, layersAt } from "./story";
import { KIT_FONT, useKitFont } from "../../engine/kit/captions";
import { useKitAssets } from "../../engine/kit/assets";
import { PROP3D } from "./props3d";

export const SURVIVE_TITANIC_FRAMES = TOTAL;
const INK = "#10222B", SUN = "#F6B924", CREAM = "#FFF4DC", TEAL = "#1f9a94";

type PostToggles = { ink: boolean; bloom: boolean; grade: boolean; msaa: number; inkDebug: number };
const toggles = (): PostToggles => ({ ink: true, bloom: true, grade: true, msaa: 0, inkDebug: 0, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.7, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.65 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene, gl } = useThree();
  const world = useMemo(() => new World(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => {
    const grade = new GradeEffect(GRADE_NIGHT as unknown as GradeParams, 1);
    return { ink: new InkPass(scene, camera as THREE.PerspectiveCamera), bloom: makeBloom(), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade };
  }, [camera, scene]);
  useEffect(() => () => { try { (fx.ink as any)?.dispose?.(); } catch (e) { /* cleanup must not kill the render */ } }, [fx]);
  fx.ink.debug = on.inkDebug;
  const post = useMemo(() => (
    <EffectComposer multisampling={on.msaa}>
      {[
        on.ink ? <primitive key="ink" object={fx.ink} dispose={null} /> : null,
        on.bloom ? <primitive key="bloom" object={fx.bloom} dispose={null} /> : null,
        <primitive key="tone" object={fx.tone} dispose={null} />,
        on.grade ? <primitive key="grade" object={fx.grade} dispose={null} /> : null,
      ].filter((x): x is JSX.Element => !!x)}
    </EffectComposer>
  ), [fx, on]);
  (camera as THREE.PerspectiveCamera).layers.enableAll();
  world.update(id, f, camera as THREE.PerspectiveCamera, scene, gl.domElement.height);
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};

/** {"thumb": true}: no overlays (used to grab the thumbnail background) */
const thumbMode = () => !!(getInputProps() as { thumb?: boolean }).thumb;
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
      camera={{ fov: 40, near: 0.1, far: 3000 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** soft overlay on the wave hit */
const flashAt = (f: number) => {
  let a = 0;
  for (const [f0, pk] of FLASHES) if (f >= f0 && f < f0 + 10) a = Math.max(a, pk * (1 - (f - f0) / 10) ** 1.6);
  return a;
};
const pop = (age: number, dur: number) => {
  const inU = Math.min(1, Math.max(0, age / 7)), outU = Math.max(0, (age - (dur - 8)) / 8);
  return { s: (0.7 + 0.3 * (1 - (1 - inU) ** 3) + 0.06 * Math.sin(inU * Math.PI)) * (1 - 0.12 * outU), o: Math.min(1, inU * 1.6) * (1 - outU) };
};

/** the series badge: always on, top-left (series identity) */
const Badge: React.FC = () => (
  <div style={{ position: "absolute", left: 44, top: 104, display: "flex", alignItems: "center", fontFamily: KIT_FONT, fontWeight: 800, fontSize: 30, letterSpacing: 0.6,
    borderRadius: 999, border: `4px solid ${INK}`, boxShadow: `0 5px 0 ${INK}`, overflow: "hidden", lineHeight: 1 }}>
    <div style={{ background: SUN, color: INK, padding: "10px 14px 8px 18px", display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="10" fill={CREAM} stroke={INK} strokeWidth="3" /><path d="M13 3 V8 M13 18 V23 M3 13 H8 M18 13 H23" stroke={INK} strokeWidth="3" strokeLinecap="round" /><circle cx="13" cy="13" r="3.5" fill={TEAL} stroke={INK} strokeWidth="2" /></svg>
      COULD YOU SURVIVE?
    </div>
    <div style={{ background: TEAL, color: CREAM, padding: "10px 16px 8px 12px", borderLeft: `4px solid ${INK}` }}>EP 1</div>
  </div>
);

/** the series hook in the last 2 s: "NEXT · EP 2: POMPEII" under the badge (fades out in the last frames so the loop is clean) */
const NextTag: React.FC<{ f: number }> = ({ f }) => {
  const age = f - NEXT.a, dur = NEXT.b - NEXT.a;
  if (age < 0 || age >= dur) return null;
  const inU = Math.min(1, age / 8), outU = Math.max(0, (age - (dur - 7)) / 7), o = inU * (1 - outU);
  return (
    <div style={{ position: "absolute", left: 44, top: 182, opacity: o, transform: `translateX(${((1 - inU) * -30).toFixed(1)}px)`, display: "flex", alignItems: "center", gap: 10,
      fontFamily: KIT_FONT, fontWeight: 800, fontSize: 30, lineHeight: 1, color: CREAM, background: "rgba(8,22,32,0.82)", border: `4px solid ${INK}`, borderRadius: 999, padding: "10px 18px 8px 14px", boxShadow: `0 5px 0 ${INK}` }}>
      <span style={{ background: "#e8643a", color: CREAM, borderRadius: 999, padding: "4px 12px 2px", border: `3px solid ${INK}`, fontSize: 24 }}>NEXT</span>
      EP 2: POMPEII
    </div>
  );
};

/** the one choice pill (not a caption) */
const Pill: React.FC<{ f: number }> = ({ f }) => {
  const age = f - PILL.a, dur = PILL.b - PILL.a;
  if (age < 0 || age >= dur) return null;
  const { s, o } = pop(age, dur), ps = 64;
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1920 * 0.17, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: KIT_FONT, fontWeight: 800, fontSize: ps, lineHeight: 1.15, whiteSpace: "nowrap", color: INK, background: SUN,
        padding: `${ps * 0.14}px ${ps * 0.55}px ${ps * 0.08}px`, borderRadius: 999, border: `${ps * 0.09}px solid ${INK}`, boxShadow: `0 ${ps * 0.13}px 0 ${INK}`,
        display: "flex", alignItems: "center", gap: ps * 0.25,
        transform: `scale(${s.toFixed(4)}) rotate(${(-1.5 + 0.7 * Math.sin(age / 9)).toFixed(2)}deg)` }}>{PILL.text}
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: ps * 1.05, height: ps * 1.05, borderRadius: 999, background: CREAM, border: `${ps * 0.07}px solid ${INK}`, 
          transform: `translateY(${(4 * Math.sin(age / 4)).toFixed(2)}px)` }}>
          <svg width={ps * 0.6} height={ps * 0.6} viewBox="0 0 24 24"><path d="M12 3 V17 M5 11 L12 19 L19 11" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span></div>
    </div>
  );
};

/** the cold-shock body timer: an icon, a clock, a filling bar with two small labelled marks */
const BodyTimer: React.FC<{ f: number }> = ({ f }) => {
  const age = f - TIMER.a, dur = TIMER.b - TIMER.a;
  if (age < 0 || age >= dur) return null;
  const { o } = pop(age, dur), m = timerMinutes(f), u = Math.min(1, m / 10);
  const mm = Math.floor(m), ss = Math.floor((m - mm) * 60), clock = `${mm}:${String(ss).padStart(2, "0")}`;
  const W = 560, bx = 92, bw = W - bx - 26, shock = f < 330 ? 0.5 + 0.5 * Math.abs(Math.sin(f / 5)) : 0.35, arms = u > 0.985 ? 0.6 + 0.4 * Math.abs(Math.sin(f / 4)) : 0.35;
  const col = u < 0.5 ? TEAL : "#e8643a";
  return (
    <div style={{ position: "absolute", left: 44, top: 196, width: W, height: 132, opacity: o, transform: `translateY(${(1 - Math.min(1, age / 8)) * -12}px)` }}>
      <svg width={W} height={132} viewBox={`0 0 ${W} 132`} style={{ overflow: "visible" }}>
        <defs><linearGradient id="bt" x1="0" x2="1"><stop offset="0" stopColor={TEAL} /><stop offset="0.6" stopColor="#7fd0c4" /><stop offset="1" stopColor="#e8643a" /></linearGradient></defs>
        <rect x="2" y="2" width={W - 4} height="120" rx="26" fill="rgba(8,22,32,0.78)" stroke={INK} strokeWidth="4" />
        <rect x="6" y="6" width={W - 12} height="112" rx="22" fill="none" stroke="rgba(159,210,255,0.28)" strokeWidth="2" />
        {/* icon: a thermometer in a cold-blue disc */}
        <circle cx="50" cy="62" r="30" fill="#0f3a4a" stroke={CREAM} strokeWidth="3" />
        <rect x="45" y="36" width="10" height="34" rx="5" fill={CREAM} stroke={INK} strokeWidth="2.5" />
        <rect x="47.5" y={48 + 20 * u} width="5" height={22 - 20 * u} fill="#7fd0f0" />
        <circle cx="50" cy="76" r="9" fill="#7fd0f0" stroke={INK} strokeWidth="2.5" />
        <text x={bx} y="44" fontFamily={KIT_FONT} fontWeight={800} fontSize="34" fill={CREAM}>{clock}</text>
        <text x={bx + 92} y="43" fontFamily={KIT_FONT} fontWeight={700} fontSize="20" fill="rgba(255,244,220,0.7)">in −2 °C water</text>
        <rect x={bx} y="58" width={bw} height="18" rx="9" fill="rgba(255,244,220,0.14)" stroke={INK} strokeWidth="3" />
        <rect x={bx + 2} y="60" width={Math.max(14, (bw - 4) * u)} height="14" rx="7" fill="url(#bt)" />
        <circle cx={bx + 9} cy="67" r={9 + 3 * shock} fill={SUN} stroke={INK} strokeWidth="3" opacity={0.6 + 0.4 * shock} />
        <circle cx={bx + bw - 9} cy="67" r={9 + 3 * arms} fill={u > 0.985 ? "#e8643a" : "rgba(255,244,220,0.35)"} stroke={INK} strokeWidth="3" />
        <text x={bx} y="104" fontFamily={KIT_FONT} fontWeight={700} fontSize="20" fill={CREAM}>0:01 cold shock</text>
        <text x={bx + bw} y="104" textAnchor="end" fontFamily={KIT_FONT} fontWeight={700} fontSize="20" fill={u > 0.985 ? "#ffb08a" : "rgba(255,244,220,0.75)"}>10:00 arms stop</text>
      </svg>
      <div style={{ display: "none", color: col }} />
    </div>
  );
};

export const SurviveTitanicShort: React.FC = () => {
  const f = useCurrentFrame();
  const ready = useKitFont();
  const props = useKitAssets(PROP3D);
  const flash = flashAt(f);
  if (!ready || !props) return <AbsoluteFill style={{ background: "#040a14" }} />;
  return (
    <AbsoluteFill style={{ background: "#040a14" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#dff2f6", opacity: flash }} />}
      {!thumbMode() && <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Badge />
        <BodyTimer f={f} />
        <Pill f={f} />
        <NextTag f={f} />
      </AbsoluteFill>}
    </AbsoluteFill>
  );
};
