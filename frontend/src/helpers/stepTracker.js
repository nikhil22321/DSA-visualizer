export const stepMessageFromPayload = (step, index) => {
  if (!step) return "No active step";
  const prefix = `Step ${index + 1}:`;
  if (step.type === "compare") return `${prefix} Compare index ${step.indices[0]} and ${step.indices[1]}`;
  if (step.type === "swap") return `${prefix} Swap index ${step.indices[0]} and ${step.indices[1]}`;
  if (step.type === "overwrite") return `${prefix} Overwrite index ${step.indices.join(", ")}`;
  if (step.type === "pivot") return `${prefix} Pivot at index ${step.indices[0]}`;
  return `${prefix} ${step.description || "Processing"}`;
};

export const recentStepMessages = (steps, currentIndex, count = 8) => {
  const start = Math.max(0, currentIndex - count + 1);
  return steps.slice(start, currentIndex + 1).map((step, idx) => ({
    id: `${start + idx}-${step.type}`,
    message: stepMessageFromPayload(step, start + idx),
  }));
};
