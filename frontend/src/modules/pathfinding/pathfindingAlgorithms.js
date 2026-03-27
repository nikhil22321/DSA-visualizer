const getNeighbors = (node, grid) => {
  const neighbors = [];
  const { row, col } = node;

  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1]);

  return neighbors;
};

const getPath = (endNode) => {
  const path = [];
  let cur = endNode;

  while (cur) {
    path.unshift(cur);
    cur = cur.previousNode;
  }

  return path;
};

// ---------------- BFS ----------------
export const bfs = (grid, start, end) => {
  const queue = [start];
  const steps = [];
  const visited = [];

  let visitedCount = 0;

  start.isVisited = true;

  steps.push({ type: "start", node: start });

  while (queue.length) {
    const node = queue.shift();
    visited.push(node);
    visitedCount++;

    steps.push({
      type: "visit",
      node,
      stats: { visitedNodes: visitedCount },
    });

    if (node === end) {
      steps.push({ type: "end", node });
      break;
    }

    for (const neighbor of getNeighbors(node, grid)) {
      if (!neighbor.isVisited && !neighbor.isWall) {
        neighbor.isVisited = true;
        neighbor.previousNode = node;

        steps.push({ type: "enqueue", node: neighbor });

        queue.push(neighbor);
      }
    }
  }

  const path = getPath(end);

  path.forEach((node) => {
    steps.push({
      type: "path",
      node,
      stats: {
        visitedNodes: visitedCount,
        pathLength: path.length,
      },
    });
  });

  return {
    steps,
    result: {
      visitedNodes: visited,
      shortestPath: path,
    },
  };
};

// ---------------- DFS ----------------
export const dfs = (grid, start, end) => {
  const stack = [start];
  const steps = [];
  let visitedCount = 0;

  while (stack.length) {
    const node = stack.pop();

    if (node.isVisited || node.isWall) continue;

    node.isVisited = true;
    visitedCount++;

    steps.push({
      type: "visit",
      node,
      stats: { visitedNodes: visitedCount },
    });

    if (node === end) break;

    for (const neighbor of getNeighbors(node, grid)) {
      if (!neighbor.isVisited) {
        neighbor.previousNode = node;
        stack.push(neighbor);
      }
    }
  }

  const path = getPath(end);

  path.forEach((node) => {
    steps.push({ type: "path", node });
  });

  return { steps, result: { shortestPath: path } };
};