export const initialStats = {
  comparisons: 0,
  swaps: 0,
  executionTimeMs: 0,
};

export const statsFromStep = (step, elapsedMs) => ({
  comparisons: step?.stats?.comparisons || 0,
  swaps: step?.stats?.swaps || 0,
  executionTimeMs: elapsedMs,
});
