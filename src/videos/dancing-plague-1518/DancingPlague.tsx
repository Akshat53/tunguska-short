// "The Dancing Plague of 1518" (English, Inkfall global): Strasbourg, July 1518, built on the visual kit's card stage
// (src/engine/kit): every person, prop and set piece is an ink-outlined canvas card standing in a 3D world (parallax from
// real positions), lit by a day / golden / dusk ambient plus candles and lamps. Post chain as in the other films:
// InkPass (own pass) -> [lens blur: off] -> bloom (emissive only) -> NEUTRAL tone mapping -> colour grade. No film grain.
// The picture timeline is authored directly on the final voice (no time warp). Frame 0 is the crowd already dancing.
// No burned-in captions (owner's choice for the English channel).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass } from "../tunguska/ink";
import { GradeEffect, GRADES, type GradeParams } from "../tunguska/grade";
import { GRADE_HAZE } from "../../engine/kit/looks";
import { TOTAL, FLASHES, SHOTS, layersAt } from "./story";
import { GRADE_OF } from "./lights";

export const DANCING_PLAGUE_FRAMES = TOTAL;

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
  const { camera, scene, gl } = useThree();
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
  (camera as THREE.PerspectiveCamera).layers.enableAll();
  world.update(id, f, camera as THREE.PerspectiveCamera, scene, gl.domElement.height);
  const light = SHOTS[id - 1].light, tag = fx.grade as unknown as { _dp?: string };
  if (tag._dp !== light) { fx.grade.set(light === "day" ? (GRADE_HAZE as unknown as GradeParams) : GRADES[GRADE_OF[light]]); tag._dp = light; }
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
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
      camera={{ fov: 40, near: 0.1, far: 3000 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** warm overlay on "curse" (peak, then a 10-frame fall) */
const flashAt = (f: number) => {
  let a = 0;
  for (const [f0, pk] of FLASHES) if (f >= f0 && f < f0 + 10) a = Math.max(a, pk * (1 - (f - f0) / 10) ** 1.6);
  return a;
};

export const DancingPlagueShort: React.FC = () => {
  const f = useCurrentFrame();
  const flash = flashAt(f);
  return (
    <AbsoluteFill style={{ background: "#86c0e4" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#fff2d8", opacity: flash }} />}
    </AbsoluteFill>
  );
};
