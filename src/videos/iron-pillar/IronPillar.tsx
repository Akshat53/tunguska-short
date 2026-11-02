// "दिल्ली का लौह स्तंभ" (Hindi): the Iron Pillar of Delhi, built on the visual kit's card stage (src/engine/kit): every
// person, prop and set piece is an ink-outlined canvas card standing in a 3D world (parallax from real positions), lit by
// a moon/day ambient plus flickering fires. Post chain as in Tunguska/Roopkund: InkPass (own pass) -> [lens blur: off] ->
// bloom (emissive only) -> NEUTRAL tone mapping -> colour grade. No film grain. Timeline authored on the final voice.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass } from "../tunguska/ink";
import { GradeEffect, GRADES } from "../tunguska/grade";
import { GRADE_FIRE } from "../../engine/kit/looks";
import type { GradeParams } from "../tunguska/grade";
import { TOTAL, FLASH_AT, FLASHES, SHOTS, layersAt } from "./story";
import { GRADE_OF } from "./lights";
import { useKitFont } from "../../engine/kit/captions";

export const IRON_PILLAR_FRAMES = TOTAL;

type PostToggles = { ink: boolean; bloom: boolean; grade: boolean; msaa: number; inkDebug: number };
const toggles = (): PostToggles => ({ ink: true, bloom: true, grade: true, msaa: 0, inkDebug: 0, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
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
  world.update(id, f, camera as THREE.PerspectiveCamera, scene, gl.domElement.height, (getInputProps() as { thumbCam?: { pos: [number, number, number]; look: [number, number, number]; fov: number } }).thumbCam);
  const light = SHOTS[id - 1].light, tag = fx.grade as unknown as { _chap?: string };
  if (tag._chap !== light) { fx.grade.set(light === "night" ? (GRADE_FIRE as unknown as GradeParams) : GRADES[GRADE_OF[light]]); tag._chap = light; }
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

/** white overlay: the reveal ('नहीं।') flash (peak, then a 10-frame fall) */
const flashAt = (f: number) => {
  let a = 0;
  for (const [f0, pk] of FLASHES) if (f >= f0 && f < f0 + 10) a = Math.max(a, pk * (1 - (f - f0) / 10) ** 1.6);
  void FLASH_AT;
  return a;
};

// No burned-in captions (owner decision): the narration is heard only; facts that need a label are drawn into the scenes.

export const IronPillarShort: React.FC = () => {
  const f = useCurrentFrame();
  const flash = flashAt(f);
  const ready = useKitFont();
  return (
    <AbsoluteFill style={{ background: "#1f4a52" }}>
      {ready && layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#fff4e0", opacity: flash }} />}
    </AbsoluteFill>
  );
};
