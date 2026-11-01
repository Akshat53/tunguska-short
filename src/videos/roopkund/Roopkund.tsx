// "Roopkund" (Hindi): the skeleton lake, in the flat-characters-in-a-3D-toon-world style. Same look engine and post chain as
// Tunguska (shared modules in ../tunguska): InkPass (own pass) -> [lens blur: off] -> bloom (emissive only) -> NEUTRAL tone
// mapping -> colour grade. No film grain. The picture timeline is authored directly on the final voice (no time warp).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "../tunguska/ink";
import { GradeEffect, GRADES, gradeFor } from "../tunguska/grade";
import { TOTAL, FLASH_AT, FLASHES, SHOTS, layersAt } from "./story";

export const ROOPKUND_FRAMES = TOTAL;

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
  gradeFor(fx.grade, SHOTS[id - 1].light);
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

/** white overlay: the revelation flash (4 f) + the hail flash (peak, then a 10-frame fall) */
const flashAt = (f: number) => {
  let a = f >= FLASH_AT && f < FLASH_AT + 4 ? [0.85, 0.6, 0.35, 0.15][f - FLASH_AT] : 0;
  for (const [f0, pk] of FLASHES) if (f >= f0 && f < f0 + 10) a = Math.max(a, pk * (1 - (f - f0) / 10) ** 1.6);
  return a;
};

export const RoopkundShort: React.FC = () => {
  const f = useCurrentFrame();
  const flash = flashAt(f);
  return (
    <AbsoluteFill style={{ background: "#9cc4c4" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#fffaf0", opacity: flash }} />}
    </AbsoluteFill>
  );
};
