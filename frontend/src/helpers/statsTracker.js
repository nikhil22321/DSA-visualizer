// -----------------------------
// 🔹 INITIAL STATS (ALL MODULES)
// -----------------------------
export const initialStats = {
  // Sorting
  comparisons: 0,
  swaps: 0,

  // Pathfinding
  visitedNodes: 0,
  pathLength: 0,

  // Common
  executionTimeMs: 0,
};

// -----------------------------
// 🔹 GENERIC STATS FROM STEP
// -----------------------------
export const statsFromStep = (step, elapsedMs) => {
  return {
    // Sorting stats
    comparisons: step?.stats?.comparisons || 0,
    swaps: step?.stats?.swaps || 0,

    // Pathfinding stats
    visitedNodes: step?.stats?.visitedNodes || 0,
    pathLength: step?.stats?.pathLength || 0,

    // Time
    executionTimeMs: elapsedMs,
  };
};