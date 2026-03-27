export const randomMaze = (grid) => {
  const steps = [{ type: "mazeStart" }];

  for (let row of grid) {
    for (let node of row) {
      if (!node.isStart && !node.isEnd && Math.random() < 0.3) {
        steps.push({
          type: "wall",
          row: node.row,
          col: node.col,
        });
      }
    }
  }

  steps.push({ type: "mazeEnd" });

  return steps;
};