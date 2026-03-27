export const primMaze = (grid) => {
  const steps = [{ type: "mazeStart" }];

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (Math.random() < 0.4) {
        steps.push({ type: "wall", row: r, col: c });
      }
    }
  }

  steps.push({ type: "mazeEnd" });
  return steps;
};