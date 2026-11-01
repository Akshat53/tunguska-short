// "KitShowcase": six short scenes demonstrating the opt-in visual upgrade kit (src/engine/kit, docs/VISUAL_KIT.md).
// Same post chain order as the films (HARD RULE 2): InkPass -> [no lens blur] -> Bloom -> Neutral tone map -> Grade.
// No film grain. Every frame is a pure function of the frame number.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass } from "../tunguska/ink";
import { GradeEffect, GRADES } from "../tunguska/grade";
import { KitStage, KIT_NOINK } from "../../engine/kit/stage";
import { SCENES, TOTAL, FPS, sceneAt } from "./scenes";

export const KIT_SHOWCASE_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.65 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene, gl } = useThree();
  const stage = useMemo(() => new KitStage(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera), bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, 1),
  }), [camera, scene]);
  useEffect(() => () => { try { (fx.ink as unknown as { dispose?: () => void }).dispose?.(); } catch { /* cleanup must not kill the render */ } }, [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={0}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const { s, lf } = sceneAt(f), t = lf / FPS;
  const c = s.cam(lf), cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.1; cam.far = 3000;
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(KIT_NOINK);
  stage.hideGrounds();
  const L = s.light(t);
  const cards = s.build(stage, lf, t, c);
  stage.frame(cards, L, cam, t, gl.domElement.height, scene);
  const tag = fx.grade as unknown as { _scene?: string };
  if (tag._scene !== s.id) { fx.grade.set(s.grade); tag._scene = s.id; }
  return (<><primitive object={stage.root} dispose={null} />{post}</>);
};

export const KitShowcase: React.FC = () => (
  <AbsoluteFill style={{ background: "#0f2a33" }}>
    <ThreeCanvas width={1080} height={1920} gl={{ antialias: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: true }} camera={{ fov: 40, near: 0.1, far: 3000 }}>
      <Inner />
    </ThreeCanvas>
  </AbsoluteFill>
);
void SCENES;
