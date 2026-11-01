// "Bombay 1944" (Hindi): gold from the sky and the 66 firemen, in the flat-characters-in-a-3D-toon-world style with the
// visual kit's people and effects. Same look engine and post chain as Tunguska / Roopkund: InkPass (own pass) -> [lens blur:
// off] -> bloom (emissive only) -> NEUTRAL tone mapping -> colour grade (kit haze / fire grades). No film grain.
// The picture timeline is authored directly on the final voice (no time warp).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "../tunguska/ink";
import { GradeEffect, GRADES, type GradeParams } from "../tunguska/grade";
import { GRADE_HAZE, GRADE_FIRE } from "../../engine/kit/looks";
import { TOTAL, FLASH_AT, FLASHES, SHOTS, layersAt, shotAt } from "./story";
import { Captions, useKitFont, type Pop, type Place, type Word } from "../../engine/kit/captions";
import words from "../../../stories/bombay-1944/hi/words.json";
import narration from "./narration";

export const BOMBAY_FRAMES = TOTAL;
/** per-shot grade: hazy harbour day, fire grade for the burning / blast / city-fire shots */
const FIRE_SHOTS = new Set([5, 6, 7, 8, 9, 15]);
const gradeOf = (id: number): [string, GradeParams] => {
  const l = SHOTS[id - 1].light;
  if (FIRE_SHOTS.has(id)) return ["fire", GRADE_FIRE as unknown as GradeParams];
  return l === "day" ? ["haze", GRADE_HAZE as unknown as GradeParams] : [l, GRADES[l]];
};

type PostToggles = { ink: boolean; bloom: boolean; grade: boolean; msaa: number; inkDebug: number };
const toggles = (): PostToggles => ({ ink: true, bloom: true, grade: true, msaa: 0, inkDebug: 0, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.45, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, 1),
  }), [camera, scene]);
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
  world.update(id, f, camera as THREE.PerspectiveCamera, scene);
  noInkFallback(world.root);
  { const [k, g] = gradeOf(id), tag = fx.grade as unknown as { _g?: string }; if (tag._g !== k) { fx.grade.set(g); tag._g = k; } }
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
      camera={{ fov: 40, near: 0.2, far: 4000 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** white overlay: the first blast (4 f) + the second blast (peak, then a 10-frame fall) */
const flashAt = (f: number) => {
  let a = f >= FLASH_AT && f < FLASH_AT + 4 ? [0.85, 0.6, 0.35, 0.15][f - FLASH_AT] : 0;
  for (const [f0, pk] of FLASHES) if (f >= f0 && f < f0 + 10) a = Math.max(a, pk * (1 - (f - f0) / 10) ** 1.6);
  return a;
};

/** burned-in captions (kit captions.tsx): lower-middle band, moved to the top where faces sit low in the frame */
const CAP_TOP = new Set([2, 6, 11, 12, 14, 15, 16, 17]);
const capPlace = (f: number): Place => (CAP_TOP.has(shotAt(f).id) ? "top" : "bottom");
const POPS: Pop[] = [
  { f: 247, text: "14 अप्रैल 1944", dur: 80, place: "top" },
  { f: 331, text: "विक्टोरिया डॉक", dur: 60, place: "top" },
  { f: 1340, text: "66 जवान", dur: 70, place: "top" },
  { f: 1619, text: "फ़ायर सर्विस डे", dur: 70, place: "top" },
];
const capsOn = () => (getInputProps() as { captions?: boolean }).captions !== false;

export const Bombay1944Short: React.FC = () => {
  const f = useCurrentFrame();
  const flash = flashAt(f);
  const ready = useKitFont();
  return (
    <AbsoluteFill style={{ background: "#f0b98e" }}>
      {ready && layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#fffaf0", opacity: flash }} />}
      {ready && capsOn() && <Captions words={words as Word[]} text={narration} place={capPlace} pops={POPS} />}
    </AbsoluteFill>
  );
};
