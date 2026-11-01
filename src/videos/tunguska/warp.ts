// Time warp between the picture timeline (authored for the old +32% voice, frames in story.ts) and the output timeline
// (the current voice). warp.json is built by scripts/warp.py from the two words.json files. Everything in story.ts / world.ts
// keeps running on the OLD frame number; only the clock is warped. Fractional old frames keep camera + physics continuous.
import { useCurrentFrame } from "remotion";
import warp from "./warp.json";
import { TOTAL } from "./story";

const A = warp.anchors as [number, number][]; // [newFrame, oldFrame]
export const OUT_FRAMES: number = warp.outFrames;

/** output frame -> (fractional) story frame */
export const toStory = (fNew: number): number => {
  if (fNew <= 0) return 0;
  let k = A.length - 2;
  for (let i = 0; i < A.length - 1; i++) if (fNew < A[i + 1][0]) { k = i; break; }
  const [n0, o0] = A[k], [n1, o1] = A[k + 1];
  return Math.min(TOTAL - 1, o0 + ((fNew - n0) * (o1 - o0)) / (n1 - n0)); // hold the last story frame
};
export const useStoryFrame = () => toStory(useCurrentFrame());
