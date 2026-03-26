import { mazeMeta } from "@/data/algorithmMeta";

export const mazeAlgorithmOptions = Object.keys(mazeMeta).map((key) => ({
  value: key,
  label: mazeMeta[key].label,
}));

const inBounds = (row, col, rows, cols) => row > 0 && col > 0 && row < rows - 1 && col < cols - 1;

const cloneGrid = (grid) => grid.map((row) => [...row]);

export const createMazeGrid = (rows = 21, cols = 35) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

const carve = (grid, row, col) => {
  grid[row][col] = 1;
};

const recordStep = (steps, grid, action, stats) => {
  steps.push({
    grid: cloneGrid(grid),
    action,
    stats: { ...stats },
  });
};

const backtrackingMaze = (rows, cols) => {
  const grid = createMazeGrid(rows, cols);
  const steps = [];
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };

  const stack = [[1, 1]];
  carve(grid, 1, 1);
  recordStep(steps, grid, "Initialize maze root", stats);

  const directions = [
    [0, 2],
    [0, -2],
    [2, 0],
    [-2, 0],
  ];

  while (stack.length) {
    const [row, col] = stack[stack.length - 1];
    stats.visitedNodes += 1;

    const options = directions
      .map(([dr, dc]) => ({
        nr: row + dr,
        nc: col + dc,
        wr: row + dr / 2,
        wc: col + dc / 2,
      }))
      .filter(({ nr, nc }) => inBounds(nr, nc, rows, cols) && grid[nr][nc] === 0);

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const next = options[Math.floor(Math.random() * options.length)];
    stats.comparisons += 1;
    carve(grid, next.wr, next.wc);
    carve(grid, next.nr, next.nc);
    stack.push([next.nr, next.nc]);
    stats.swaps += 1;

    if (steps.length % 2 === 0) {
      recordStep(steps, grid, `Carve corridor to ${next.nr},${next.nc}`, stats);
    }
  }

  grid[rows - 2][cols - 2] = 1;
  recordStep(steps, grid, "Maze generation complete", stats);
  stats.executionSteps = steps.length;
  return { steps, finalGrid: grid, stats };
};

const primMaze = (rows, cols) => {
  const grid = createMazeGrid(rows, cols);
  const steps = [];
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };
  const frontier = [];

  const addFrontier = (row, col) => {
    [
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0],
    ].forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (inBounds(nr, nc, rows, cols) && grid[nr][nc] === 0) {
        frontier.push([nr, nc, row, col]);
      }
    });
  };

  carve(grid, 1, 1);
  addFrontier(1, 1);
  recordStep(steps, grid, "Seed frontier", stats);

  while (frontier.length) {
    const idx = Math.floor(Math.random() * frontier.length);
    const [row, col, parentRow, parentCol] = frontier.splice(idx, 1)[0];
    stats.visitedNodes += 1;
    if (grid[row][col] === 1) {
      continue;
    }
    carve(grid, row, col);
    carve(grid, Math.floor((row + parentRow) / 2), Math.floor((col + parentCol) / 2));
    addFrontier(row, col);
    stats.swaps += 1;
    stats.comparisons += 1;

    if (steps.length % 3 === 0) {
      recordStep(steps, grid, `Add cell ${row},${col} from frontier`, stats);
    }
  }

  grid[rows - 2][cols - 2] = 1;
  recordStep(steps, grid, "Prim maze complete", stats);
  stats.executionSteps = steps.length;
  return { steps, finalGrid: grid, stats };
};

const divide = (grid, top, left, bottom, right, steps, stats) => {
  if (bottom - top < 2 || right - left < 2) {
    return;
  }

  const horizontal = bottom - top > right - left;
  if (horizontal) {
    const wallRow = top + 2 * Math.floor(Math.random() * ((bottom - top) / 2)) + 1;
    const passageCol = left + 2 * Math.floor(Math.random() * ((right - left + 1) / 2));
    for (let c = left; c <= right; c += 1) {
      if (c !== passageCol) grid[wallRow][c] = 0;
    }
    stats.swaps += 1;
    recordStep(steps, grid, `Horizontal split at row ${wallRow}`, stats);
    divide(grid, top, left, wallRow - 1, right, steps, stats);
    divide(grid, wallRow + 1, left, bottom, right, steps, stats);
  } else {
    const wallCol = left + 2 * Math.floor(Math.random() * ((right - left) / 2)) + 1;
    const passageRow = top + 2 * Math.floor(Math.random() * ((bottom - top + 1) / 2));
    for (let r = top; r <= bottom; r += 1) {
      if (r !== passageRow) grid[r][wallCol] = 0;
    }
    stats.swaps += 1;
    recordStep(steps, grid, `Vertical split at col ${wallCol}`, stats);
    divide(grid, top, left, bottom, wallCol - 1, steps, stats);
    divide(grid, top, wallCol + 1, bottom, right, steps, stats);
  }
};

const recursiveDivisionMaze = (rows, cols) => {
  const grid = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => (row % 2 === 1 && col % 2 === 1 ? 1 : 0)),
  );
  const steps = [];
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };
  recordStep(steps, grid, "Initialize recursive division board", stats);
  divide(grid, 1, 1, rows - 2, cols - 2, steps, stats);
  grid[1][1] = 1;
  grid[rows - 2][cols - 2] = 1;
  recordStep(steps, grid, "Division maze complete", stats);
  stats.executionSteps = steps.length;
  return { steps, finalGrid: grid, stats };
};

export const runMazeGenerator = ({ rows = 21, cols = 35, algorithm = "backtracking" }) => {
  if (algorithm === "prim") return primMaze(rows, cols);
  if (algorithm === "division") return recursiveDivisionMaze(rows, cols);
  if (algorithm === "kruskal") return primMaze(rows, cols);
  return backtrackingMaze(rows, cols);
};
