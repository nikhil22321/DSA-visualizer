export const stepMessageFromPayload = (step, index) => {
  if (!step) return "No active step";

  const prefix = `Step ${index + 1}:`;

  if (step.type === "stack-queue") {
    return step.message
      ? `${prefix} ${step.message.replace(/^Step\s+\d+:\s*/i, "")}`
      : `${prefix} ${step.description || "Processing structure step"}`;
  }

  // ---------------------------
  // 🔹 SORTING (existing)
  // ---------------------------
  if (step.type === "compare")
    return `${prefix} Compare index ${step.indices[0]} and ${step.indices[1]}`;

  if (step.type === "swap")
    return `${prefix} Swap index ${step.indices[0]} and ${step.indices[1]}`;

  if (step.type === "overwrite")
    return `${prefix} Overwrite index ${step.indices.join(", ")}`;

  if (step.type === "pivot")
    return `${prefix} Pivot at index ${step.indices[0]}`;

  // ---------------------------
  // 🔹 PATHFINDING (NEW)
  // ---------------------------
  if (step.type === "visit")
    return `${prefix} Visiting node (${step.node.row}, ${step.node.col})`;

  if (step.type === "enqueue")
    return `${prefix} Adding node (${step.node.row}, ${step.node.col}) to queue`;

  if (step.type === "dequeue")
    return `${prefix} Removing node (${step.node.row}, ${step.node.col}) from queue`;

  if (step.type === "path")
    return `${prefix} Path found through (${step.node.row}, ${step.node.col})`;

  if (step.type === "start")
    return `${prefix} Starting from (${step.node.row}, ${step.node.col})`;

  if (step.type === "end")
    return `${prefix} Reached destination (${step.node.row}, ${step.node.col})`;

  // ---------------------------
  // 🔹 MAZE GENERATION (NEW)
  // ---------------------------
  if (step.type === "wall")
    return `${prefix} Creating wall at (${step.row}, ${step.col})`;

  if (step.type === "removeWall")
    return `${prefix} Removing wall at (${step.row}, ${step.col})`;

  if (step.type === "mazeStart")
    return `${prefix} Maze generation started`;

  if (step.type === "mazeEnd")
    return `${prefix} Maze generation completed`;

  // ---------------------------
  // 🔹 FALLBACK
  // ---------------------------
  return `${prefix} ${step.description || "Processing"}`;
};

export const recentStepMessages = (steps, currentIndex, count = 8) => {
  const start = Math.max(0, currentIndex - count + 1);

  return steps.slice(start, currentIndex + 1).map((step, idx) => ({
    id: `${start + idx}-${step.type}`,
    message: stepMessageFromPayload(step, start + idx),
  }));
};
