export const divisionMaze = (grid) => {
  const steps = [{ type: "mazeStart" }];

  for (let r = 0; r < grid.length; r++) {
    if (r % 4 === 0) {
      for (let c = 0; c < grid[0].length; c++) {
        steps.push({ type: "wall", row: r, col: c });
      }
    }
  }

  steps.push({ type: "mazeEnd" });
  return steps;
};