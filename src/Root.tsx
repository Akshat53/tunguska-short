import React from "react";
import { Composition } from "remotion";
import { TunguskaShort, TUNGUSKA_FRAMES } from "./videos/tunguska/Tunguska";
import { RoopkundShort, ROOPKUND_FRAMES } from "./videos/roopkund/Roopkund";
import { ChapatiShort, CHAPATI_FRAMES } from "./videos/chapati-1857/Chapati";
import { Bombay1944Short, BOMBAY_FRAMES } from "./videos/bombay-1944/Bombay1944";
import { KitCast, KIT_CAST_FRAMES } from "./videos/kitshowcase/KitCast";
import { KitShowcase, KIT_SHOWCASE_FRAMES } from "./videos/kitshowcase/KitShowcase";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="TunguskaShort" component={TunguskaShort} durationInFrames={TUNGUSKA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="RoopkundShort" component={RoopkundShort} durationInFrames={ROOPKUND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ChapatiShort" component={ChapatiShort} durationInFrames={CHAPATI_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Bombay1944Short" component={Bombay1944Short} durationInFrames={BOMBAY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KitShowcase" component={KitShowcase} durationInFrames={KIT_SHOWCASE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KitCast" component={KitCast} durationInFrames={KIT_CAST_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
