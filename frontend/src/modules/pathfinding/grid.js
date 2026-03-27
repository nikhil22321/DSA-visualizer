export const createNode = (row, col, start, end) => ({
  row,
  col,
  isStart: row === start.row && col === start.col,
  isEnd: row === end.row && col === end.col,
  isWall: false,
  isVisited: false,
  isPath: false,
  distance: Infinity,
  previousNode: null,
});

export const createGrid = (rows = 20, cols = 40) => {
  const start = { row: 10, col: 5 };
  const end = { row: 10, col: 30 };

  const grid = [];

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(createNode(r, c, start, end));
    }
    grid.push(row);
  }

  return { grid, start, end };
};

export const resetGridState = (grid) => {
  return grid.map((row) =>
    row.map((node) => ({
      ...node,
      isVisited: false,
      isPath: false,
      distance: Infinity,
      previousNode: null,
    }))
  );
};