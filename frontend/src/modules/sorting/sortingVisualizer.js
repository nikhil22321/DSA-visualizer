import { runStepAnimation, sleep } from "@/helpers/animation";
import { runSortingAlgorithm, sortingAlgorithmInfo } from "@/modules/sorting/sortingAlgorithms";

export const getSortingAlgorithms = () =>
  Object.entries(sortingAlgorithmInfo).map(([value, info]) => ({ value, label: info.label }));

export const getSortingInfo = (algorithm) => sortingAlgorithmInfo[algorithm] || sortingAlgorithmInfo.bubble;

export const prepareSortingSession = (array, algorithm) => runSortingAlgorithm(array, algorithm);

export const playSortedWave = async ({ length, setWaveIndex, getDelay, abortRef }) => {
  for (let index = 0; index < length; index += 1) {
    if (abortRef.current) return;
    setWaveIndex(index);
    // eslint-disable-next-line no-await-in-loop
    await sleep(Math.max(20, Math.floor(getDelay() / 2)));
  }
};

export const executeSortingSession = async (config) => runStepAnimation(config);
