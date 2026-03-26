import { pathfindingMeta } from "@/data/algorithmMeta";

const pointKey = (r, c) => `${r}-${c}`;

export const pathfindingAlgorithmOptions = Object.keys(pathfindingMeta).map((key) => ({
  value: key,
  label: pathfindingMeta[key].label,
}));

export const createGrid = ({ rows = 18, cols = 32, density = 0.22 }) => {
  const start = { row: 1, col: 1 };
  const end = { row: rows - 2, col: cols - 2 };
  const walls = new Set();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const atBorder = row === 0 || col === 0 || row === rows - 1 || col === cols - 1;
      if (atBorder || Math.random() < density) {
        walls.add(pointKey(row, col));
      }
    }
  }
  walls.delete(pointKey(start.row, start.col));
  walls.delete(pointKey(end.row, end.col));

  return { rows, cols, start, end, walls: [...walls] };
};

const neighbors = (row, col, rows, cols) => {
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  return deltas
    .map(([dr, dc]) => ({ row: row + dr, col: col + dc }))
    .filter((p) => p.row >= 0 && p.row < rows && p.col >= 0 && p.col < cols);
};

const manhattan = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

const buildPath = (parent, endKey) => {
  const path = [];
  let cursor = endKey;
  while (cursor) {
    path.push(cursor);
    cursor = parent[cursor];
  }
  return path.reverse();
};

const makeStep = ({ action, current, frontier, visited, path, stats, internalState }) => ({
  action,
  current,
  frontier: [...frontier],
  visited: [...visited],
  path: [...path],
  stats: { ...stats },
  internalState: internalState || {},
});

export const runPathfinding = ({ grid, algorithm }) => {
  const walls = new Set(grid.walls);
  const startKey = pointKey(grid.start.row, grid.start.col);
  const endKey = pointKey(grid.end.row, grid.end.col);

  const dist = { [startKey]: 0 };
  const parent = {};
  const visited = new Set();
  const steps = [];
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0, frontierPeak: 1 };

  const open = [{ row: grid.start.row, col: grid.start.col, priority: 0 }];

  while (open.length) {
    if (algorithm === "dfs") {
      open.sort((a, b) => b.priority - a.priority);
    } else {
      open.sort((a, b) => a.priority - b.priority);
    }

    const current = open.shift();
    const currentKey = pointKey(current.row, current.col);
    if (visited.has(currentKey)) {
      continue;
    }
    visited.add(currentKey);
    stats.visitedNodes += 1;

    if (currentKey === endKey) {
      const finalPath = buildPath(parent, endKey);
      steps.push(
        makeStep({
          action: "Path found",
          current: currentKey,
          frontier: open.map((p) => pointKey(p.row, p.col)),
          visited,
          path: finalPath,
          stats,
          internalState: { distances: { ...dist } },
        }),
      );
      stats.executionSteps = steps.length;
      return { steps, stats, pathFound: true };
    }

    neighbors(current.row, current.col, grid.rows, grid.cols).forEach((next) => {
      const nextKey = pointKey(next.row, next.col);
      if (walls.has(nextKey) || visited.has(nextKey)) {
        return;
      }

      const tentative = (dist[currentKey] ?? Number.POSITIVE_INFINITY) + 1;
      if (tentative < (dist[nextKey] ?? Number.POSITIVE_INFINITY)) {
        dist[nextKey] = tentative;
        parent[nextKey] = currentKey;
      }
      stats.comparisons += 1;

      const heuristic = manhattan(next, grid.end);
      let priority = tentative;
      if (algorithm === "astar") {
        priority = tentative + heuristic;
      }
      if (algorithm === "greedy") {
        priority = heuristic;
      }
      if (algorithm === "bfs") {
        priority = open.length + tentative;
      }
      if (algorithm === "dfs") {
        priority = -(tentative + heuristic * 0.01);
      }

      open.push({ ...next, priority });
    });

    stats.frontierPeak = Math.max(stats.frontierPeak, open.length);
    steps.push(
      makeStep({
        action: `Expand ${currentKey}`,
        current: currentKey,
        frontier: open.map((p) => pointKey(p.row, p.col)),
        visited,
        path: [],
        stats,
        internalState: {
          distances: { ...dist },
          frontierPriority: [...open],
        },
      }),
    );
  }

  steps.push(
    makeStep({
      action: "No path exists for this map",
      current: null,
      frontier: [],
      visited,
      path: [],
      stats,
    }),
  );

  stats.executionSteps = steps.length;
  return { steps, stats, pathFound: false };
};
