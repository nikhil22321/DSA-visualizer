import { runStepAnimation, sleep } from "@/helpers/animation";
import { graphAlgorithmOptions, runGraphAlgorithmSession } from "@/modules/graphs/graphAlgorithms";

export const getGraphAlgorithmOptions = () => graphAlgorithmOptions;

export const prepareGraphSession = (config) => runGraphAlgorithmSession(config);

export const executeGraphSession = async (config) => runStepAnimation(config);

export const animatePathSequence = async ({ path = [], setPathIndex, getDelay, abortRef }) => {
  for (let idx = 0; idx < path.length; idx += 1) {
    if (abortRef.current) return;
    setPathIndex(idx);
    // eslint-disable-next-line no-await-in-loop
    await sleep(Math.max(40, Math.floor(getDelay() / 2)));
  }
};
