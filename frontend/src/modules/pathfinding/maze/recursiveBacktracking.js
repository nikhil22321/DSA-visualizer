export const recursiveBacktracking = (grid) => {
  const steps = [{ type: "mazeStart" }];

  for (let r = 0; r < grid.length; r += 2) {
    for (let c = 0; c < grid[0].length; c += 2) {
      steps.push({ type: "wall", row: r, col: c });
    }
  }

  steps.push({ type: "mazeEnd" });
  return steps;
};