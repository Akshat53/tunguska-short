import React from "react";
import { Composition } from "remotion";
import { TunguskaShort, TUNGUSKA_FRAMES } from "./videos/tunguska/Tunguska";
import { RoopkundShort, ROOPKUND_FRAMES } from "./videos/roopkund/Roopkund";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="TunguskaShort" component={TunguskaShort} durationInFrames={TUNGUSKA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="RoopkundShort" component={RoopkundShort} durationInFrames={ROOPKUND_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
