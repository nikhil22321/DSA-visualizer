import { buildAdjacency, edgeKey } from "@/modules/graphs/graphUtils";

const baseStats = () => ({ nodesVisited: 0, edgesExplored: 0 });

const createRecorder = () => {
  const steps = [];
  const stats = baseStats();
  const visited = new Set();

  const record = ({ description, activeNodes = [], activeEdges = [], line = 0, internalState = {} }) => {
    steps.push({
      description,
      activeNodes,
      activeEdges,
      visitedNodes: [...visited],
      line,
      internalState,
      stats: { ...stats },
    });
  };

  return { steps, stats, visited, record };
};

const pseudocodeMap = {
  bfs: [
    "queue = [start]",
    "while queue not empty",
    "  node = dequeue()",
    "  visit node",
    "  enqueue unvisited neighbors",
  ],
  dfs: [
    "stack = [start]",
    "while stack not empty",
    "  node = pop()",
    "  if unvisited: visit",
    "  push neighbors",
  ],
  dijkstra: [
    "dist[start] = 0",
    "select min-distance unvisited node",
    "relax outgoing edges",
    "update predecessor",
    "repeat until done",
  ],
  topo: [
    "compute indegree of each node",
    "enqueue all indegree 0 nodes",
    "pop queue and append to order",
    "decrease indegree of neighbors",
    "if queue empty before all nodes => cycle",
  ],
  cycle: [
    "traverse graph",
    "track visited/parent or recursion stack",
    "if back-edge found => cycle",
  ],
  prim: [
    "start from source node",
    "pick minimum edge crossing cut",
    "add edge and new node to MST",
    "repeat until all nodes included",
  ],
  kruskal: [
    "sort edges by weight",
    "iterate edges in sorted order",
    "if edge connects different components",
    "union components and add edge",
  ],
};

const applyTraversalResult = (steps, stats, result, algorithm) => ({
  steps,
  stats,
  result,
  pseudocode: pseudocodeMap[algorithm] || [],
});

const bfs = ({ graph, startNode, directed }) => {
  const adjacency = buildAdjacency({ ...graph, directed });
  const { steps, stats, visited, record } = createRecorder();
  const queue = [startNode];
  const order = [];

  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;

    visited.add(current);
    order.push(current);
    stats.nodesVisited += 1;
    record({ description: `Visit node ${current}`, activeNodes: [current], line: 4 });

    adjacency[current]?.forEach((neighbor) => {
      stats.edgesExplored += 1;
      record({
        description: `Explore edge ${current} → ${neighbor.to}`,
        activeNodes: [current, neighbor.to],
        activeEdges: [neighbor.id],
        line: 5,
      });
      if (!visited.has(neighbor.to)) queue.push(neighbor.to);
    });
  }

  return applyTraversalResult(steps, stats, { order }, "bfs");
};

const dfs = ({ graph, startNode, directed }) => {
  const adjacency = buildAdjacency({ ...graph, directed });
  const { steps, stats, visited, record } = createRecorder();
  const stack = [startNode];
  const order = [];

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current)) continue;

    visited.add(current);
    order.push(current);
    stats.nodesVisited += 1;
    record({ description: `Visit node ${current}`, activeNodes: [current], line: 4 });

    [...(adjacency[current] || [])].reverse().forEach((neighbor) => {
      stats.edgesExplored += 1;
      record({
        description: `Explore edge ${current} → ${neighbor.to}`,
        activeNodes: [current, neighbor.to],
        activeEdges: [neighbor.id],
        line: 5,
      });
      if (!visited.has(neighbor.to)) stack.push(neighbor.to);
    });
  }

  return applyTraversalResult(steps, stats, { order }, "dfs");
};

const dijkstra = ({ graph, startNode, targetNode, directed }) => {
  const adjacency = buildAdjacency({ ...graph, directed });
  const { steps, stats, visited, record } = createRecorder();
  const distances = {};
  const prev = {};
  graph.nodes.forEach((node) => {
    distances[node.id] = Number.POSITIVE_INFINITY;
  });
  distances[startNode] = 0;

  const pq = [{ node: startNode, dist: 0 }];
  while (pq.length) {
    pq.sort((a, b) => a.dist - b.dist);
    const current = pq.shift();
    if (!current || visited.has(current.node)) continue;

    visited.add(current.node);
    stats.nodesVisited += 1;
    record({
      description: `Pick node ${current.node} with distance ${current.dist}`,
      activeNodes: [current.node],
      line: 2,
      internalState: { distances: { ...distances } },
    });

    adjacency[current.node]?.forEach((neighbor) => {
      stats.edgesExplored += 1;
      const candidate = distances[current.node] + neighbor.weight;
      record({
        description: `Relax edge ${current.node} → ${neighbor.to}`,
        activeNodes: [current.node, neighbor.to],
        activeEdges: [neighbor.id],
        line: 3,
      });
      if (candidate < distances[neighbor.to]) {
        distances[neighbor.to] = candidate;
        prev[neighbor.to] = current.node;
        pq.push({ node: neighbor.to, dist: candidate });
        record({
          description: `Update distance of ${neighbor.to} to ${candidate}`,
          activeNodes: [neighbor.to],
          line: 4,
          internalState: { distances: { ...distances }, prev: { ...prev } },
        });
      }
    });
  }

  const target = targetNode || graph.nodes[graph.nodes.length - 1]?.id;
  const path = [];
  let cursor = target;
  while (cursor) {
    path.push(cursor);
    cursor = prev[cursor];
  }
  path.reverse();

  return applyTraversalResult(steps, stats, { distances, path }, "dijkstra");
};

const topologicalSort = ({ graph, directed }) => {
  if (!directed) {
    return {
      steps: [],
      stats: baseStats(),
      result: { error: "Topological sort is only valid for directed graphs." },
      pseudocode: pseudocodeMap.topo,
    };
  }

  const adjacency = buildAdjacency({ ...graph, directed: true });
  const { steps, stats, visited, record } = createRecorder();
  const indegree = {};
  graph.nodes.forEach((node) => {
    indegree[node.id] = 0;
  });
  graph.edges.forEach((edge) => {
    indegree[edge.target] += 1;
  });

  const queue = Object.keys(indegree).filter((id) => indegree[id] === 0);
  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    visited.add(node);
    stats.nodesVisited += 1;
    record({ description: `Output node ${node}`, activeNodes: [node], line: 3 });

    adjacency[node]?.forEach((neighbor) => {
      stats.edgesExplored += 1;
      indegree[neighbor.to] -= 1;
      record({
        description: `Decrease indegree of ${neighbor.to}`,
        activeNodes: [node, neighbor.to],
        activeEdges: [neighbor.id],
        line: 4,
      });
      if (indegree[neighbor.to] === 0) queue.push(neighbor.to);
    });
  }

  const hasCycle = order.length !== graph.nodes.length;
  return applyTraversalResult(steps, stats, { order, hasCycle }, "topo");
};

const cycleDetection = ({ graph, directed }) => {
  const { steps, stats, record } = createRecorder();
  let hasCycle = false;

  if (directed) {
    const adjacency = buildAdjacency({ ...graph, directed: true });
    const visited = new Set();
    const recStack = new Set();

    const dfsCheck = (node) => {
      visited.add(node);
      recStack.add(node);
      stats.nodesVisited += 1;
      record({ description: `Visit ${node}`, activeNodes: [node], line: 1 });

      for (const neighbor of adjacency[node] || []) {
        stats.edgesExplored += 1;
        record({ description: `Traverse ${node} → ${neighbor.to}`, activeEdges: [neighbor.id], activeNodes: [node, neighbor.to], line: 2 });
        if (!visited.has(neighbor.to) && dfsCheck(neighbor.to)) return true;
        if (recStack.has(neighbor.to)) return true;
      }
      recStack.delete(node);
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id) && dfsCheck(node.id)) {
        hasCycle = true;
        break;
      }
    }
  } else {
    const parent = {};
    graph.nodes.forEach((n) => {
      parent[n.id] = n.id;
    });
    const find = (x) => {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    };
    const union = (a, b) => {
      const pa = find(a);
      const pb = find(b);
      if (pa === pb) return false;
      parent[pb] = pa;
      return true;
    };

    for (const edge of graph.edges) {
      stats.edgesExplored += 1;
      record({ description: `Inspect edge ${edge.source}-${edge.target}`, activeEdges: [edge.id], line: 2 });
      if (!union(edge.source, edge.target)) {
        hasCycle = true;
        break;
      }
    }
  }

  record({ description: hasCycle ? "Cycle detected" : "No cycle found", line: 3 });
  return applyTraversalResult(steps, stats, { hasCycle }, "cycle");
};

const prim = ({ graph, startNode, directed }) => {
  if (directed) {
    return {
      steps: [],
      stats: baseStats(),
      result: { error: "Prim MST requires undirected graph." },
      pseudocode: pseudocodeMap.prim,
    };
  }

  const adjacency = buildAdjacency({ ...graph, directed: false });
  const { steps, stats, visited, record } = createRecorder();
  const mstEdges = [];
  let totalWeight = 0;

  visited.add(startNode);
  stats.nodesVisited += 1;
  const frontier = [...(adjacency[startNode] || [])].map((edge) => ({ ...edge, from: startNode }));

  while (frontier.length && visited.size < graph.nodes.length) {
    frontier.sort((a, b) => a.weight - b.weight);
    const edge = frontier.shift();
    if (!edge || visited.has(edge.to)) continue;

    visited.add(edge.to);
    stats.nodesVisited += 1;
    stats.edgesExplored += 1;
    mstEdges.push({ source: edge.from, target: edge.to, weight: edge.weight });
    totalWeight += edge.weight;
    record({
      description: `Add edge ${edge.from}-${edge.to} (${edge.weight}) to MST`,
      activeNodes: [edge.from, edge.to],
      activeEdges: [edge.id || edgeKey(edge.from, edge.to, false)],
      line: 3,
    });

    (adjacency[edge.to] || []).forEach((next) => {
      if (!visited.has(next.to)) frontier.push({ ...next, from: edge.to });
    });
  }

  return applyTraversalResult(steps, stats, { mstEdges, totalWeight }, "prim");
};

const kruskal = ({ graph, directed }) => {
  if (directed) {
    return {
      steps: [],
      stats: baseStats(),
      result: { error: "Kruskal MST requires undirected graph." },
      pseudocode: pseudocodeMap.kruskal,
    };
  }

  const { steps, stats, record } = createRecorder();
  const parent = {};
  graph.nodes.forEach((node) => {
    parent[node.id] = node.id;
  });
  const find = (x) => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a, b) => {
    const pa = find(a);
    const pb = find(b);
    if (pa === pb) return false;
    parent[pb] = pa;
    return true;
  };

  const edges = [...graph.edges].sort((a, b) => a.weight - b.weight);
  const mstEdges = [];
  let totalWeight = 0;

  edges.forEach((edge) => {
    stats.edgesExplored += 1;
    record({ description: `Consider edge ${edge.source}-${edge.target} (${edge.weight})`, activeEdges: [edge.id], line: 2 });
    if (union(edge.source, edge.target)) {
      mstEdges.push({ source: edge.source, target: edge.target, weight: edge.weight });
      totalWeight += edge.weight;
      record({ description: `Add edge ${edge.source}-${edge.target}`, activeEdges: [edge.id], line: 4 });
    }
  });

  return applyTraversalResult(steps, stats, { mstEdges, totalWeight }, "kruskal");
};

const handlers = {
  bfs,
  dfs,
  dijkstra,
  topo: topologicalSort,
  cycle: cycleDetection,
  prim,
  kruskal,
};

export const graphAlgorithmOptions = [
  { value: "bfs", label: "BFS" },
  { value: "dfs", label: "DFS" },
  { value: "dijkstra", label: "Dijkstra" },
  { value: "topo", label: "Topological Sort" },
  { value: "cycle", label: "Cycle Detection" },
  { value: "prim", label: "Prim MST" },
  { value: "kruskal", label: "Kruskal MST" },
];

export const runGraphAlgorithmSession = ({ graph, algorithm, startNode, targetNode, directed }) => {
  const runner = handlers[algorithm] || handlers.bfs;
  return runner({ graph, startNode, targetNode, directed });
};
