import React from "react";
import { Composition } from "remotion";
import { TunguskaShort, TUNGUSKA_FRAMES } from "./videos/tunguska/Tunguska";
import { RoopkundShort, ROOPKUND_FRAMES } from "./videos/roopkund/Roopkund";
import { ChapatiShort, CHAPATI_FRAMES } from "./videos/chapati-1857/Chapati";
import { Bombay1944Short, BOMBAY_FRAMES } from "./videos/bombay-1944/Bombay1944";
import { MolassesShort, MOLASSES_FRAMES } from "./videos/molasses-1919/Molasses";
import { DancingPlagueShort, DANCING_PLAGUE_FRAMES } from "./videos/dancing-plague-1518/DancingPlague";
import { IronPillarShort, IRON_PILLAR_FRAMES } from "./videos/iron-pillar/IronPillar";
import { LaughterEpidemicShort, LAUGHTER_EPIDEMIC_FRAMES } from "./videos/laughter-epidemic-1962/LaughterEpidemic";
import { SurviveTitanicShort, SURVIVE_TITANIC_FRAMES } from "./videos/survive-titanic/SurviveTitanic";
import { MascotSheet, MASCOT_SHEET_FRAMES } from "./videos/survive-titanic/MascotSheet";
import { KitCast, KIT_CAST_FRAMES } from "./videos/kitshowcase/KitCast";
import { KitAssets, KIT_ASSETS_FRAMES } from "./videos/kitshowcase/KitAssets";
import { KitShowcase, KIT_SHOWCASE_FRAMES } from "./videos/kitshowcase/KitShowcase";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="TunguskaShort" component={TunguskaShort} durationInFrames={TUNGUSKA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="RoopkundShort" component={RoopkundShort} durationInFrames={ROOPKUND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ChapatiShort" component={ChapatiShort} durationInFrames={CHAPATI_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Bombay1944Short" component={Bombay1944Short} durationInFrames={BOMBAY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MolassesShort" component={MolassesShort} durationInFrames={MOLASSES_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="DancingPlagueShort" component={DancingPlagueShort} durationInFrames={DANCING_PLAGUE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="IronPillarShort" component={IronPillarShort} durationInFrames={IRON_PILLAR_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="LaughterEpidemicShort" component={LaughterEpidemicShort} durationInFrames={LAUGHTER_EPIDEMIC_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KitShowcase" component={KitShowcase} durationInFrames={KIT_SHOWCASE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KitAssets" component={KitAssets} durationInFrames={KIT_ASSETS_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SurviveTitanicShort" component={SurviveTitanicShort} durationInFrames={SURVIVE_TITANIC_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MascotSheet" component={MascotSheet} durationInFrames={MASCOT_SHEET_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KitCast" component={KitCast} durationInFrames={KIT_CAST_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
