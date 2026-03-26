import { graphMeta } from "@/data/algorithmMeta";

const edgeId = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

const makeStep = ({ action, visited, current, frontier, distances, activeEdges, stats, internalState }) => ({
  action,
  visited: [...visited],
  current,
  frontier: [...frontier],
  distances: { ...distances },
  activeEdges: [...activeEdges],
  stats: { ...stats },
  internalState: internalState || {},
});

export const graphAlgorithmOptions = Object.keys(graphMeta).map((key) => ({
  value: key,
  label: graphMeta[key].label,
}));

export const generateGraph = ({ nodeCount = 8, density = 0.35 }) => {
  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / nodeCount;
    return {
      id: String(index),
      x: 50 + 42 * Math.cos(angle),
      y: 50 + 42 * Math.sin(angle),
    };
  });

  const edges = [];
  for (let i = 0; i < nodeCount; i += 1) {
    for (let j = i + 1; j < nodeCount; j += 1) {
      if (Math.random() < density) {
        edges.push({
          id: edgeId(i, j),
          source: String(i),
          target: String(j),
          weight: Math.floor(Math.random() * 9) + 1,
        });
      }
    }
  }

  if (!edges.length && nodeCount > 1) {
    edges.push({ id: edgeId(0, 1), source: "0", target: "1", weight: 1 });
  }

  const adjacency = {};
  nodes.forEach((node) => {
    adjacency[node.id] = [];
  });
  edges.forEach((edge) => {
    adjacency[edge.source].push({ to: edge.target, weight: edge.weight, id: edge.id });
    adjacency[edge.target].push({ to: edge.source, weight: edge.weight, id: edge.id });
  });

  return { nodes, edges, adjacency };
};

const bfs = (graph, start) => {
  const steps = [];
  const queue = [start];
  const visited = new Set([start]);
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };
  const distances = { [start]: 0 };

  while (queue.length) {
    const node = queue.shift();
    stats.visitedNodes += 1;
    const activeEdges = [];
    graph.adjacency[node].forEach((next) => {
      stats.comparisons += 1;
      if (!visited.has(next.to)) {
        visited.add(next.to);
        queue.push(next.to);
        distances[next.to] = (distances[node] || 0) + 1;
      }
      activeEdges.push(next.id);
    });
    steps.push(
      makeStep({
        action: `Visit node ${node}`,
        visited: [...visited],
        current: node,
        frontier: queue,
        distances,
        activeEdges,
        stats,
      }),
    );
  }

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const dfs = (graph, start) => {
  const steps = [];
  const stack = [start];
  const visited = new Set();
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };

  while (stack.length) {
    const node = stack.pop();
    if (visited.has(node)) {
      continue;
    }
    visited.add(node);
    stats.visitedNodes += 1;
    const activeEdges = [];
    const neighbors = [...graph.adjacency[node]].reverse();
    neighbors.forEach((next) => {
      stats.comparisons += 1;
      if (!visited.has(next.to)) {
        stack.push(next.to);
      }
      activeEdges.push(next.id);
    });

    steps.push(
      makeStep({
        action: `Depth-first visit ${node}`,
        visited: [...visited],
        current: node,
        frontier: stack,
        distances: {},
        activeEdges,
        stats,
      }),
    );
  }

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const dijkstra = (graph, start) => {
  const steps = [];
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };
  const distances = {};
  const visited = new Set();
  const pq = [];

  graph.nodes.forEach((n) => {
    distances[n.id] = Number.POSITIVE_INFINITY;
  });
  distances[start] = 0;
  pq.push({ node: start, distance: 0 });

  while (pq.length) {
    pq.sort((a, b) => a.distance - b.distance);
    const current = pq.shift();
    if (!current || visited.has(current.node)) {
      continue;
    }
    visited.add(current.node);
    stats.visitedNodes += 1;

    const activeEdges = [];
    graph.adjacency[current.node].forEach((next) => {
      stats.comparisons += 1;
      const candidate = current.distance + next.weight;
      if (candidate < distances[next.to]) {
        distances[next.to] = candidate;
        pq.push({ node: next.to, distance: candidate });
      }
      activeEdges.push(next.id);
    });

    steps.push(
      makeStep({
        action: `Relax neighbors from ${current.node}`,
        visited: [...visited],
        current: current.node,
        frontier: pq.map((x) => x.node),
        distances,
        activeEdges,
        stats,
        internalState: {
          priorityQueue: [...pq],
        },
      }),
    );
  }

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const prim = (graph, start) => {
  const steps = [];
  const visited = new Set([start]);
  const stats = { visitedNodes: 1, executionSteps: 0, comparisons: 0, swaps: 0 };
  const frontier = [...graph.adjacency[start]].map((edge) => ({ ...edge, from: start }));
  const mstEdges = [];

  while (frontier.length && visited.size < graph.nodes.length) {
    frontier.sort((a, b) => a.weight - b.weight);
    const edge = frontier.shift();
    if (!edge || visited.has(edge.to)) {
      continue;
    }
    visited.add(edge.to);
    mstEdges.push(edge.id);
    stats.visitedNodes += 1;

    graph.adjacency[edge.to].forEach((next) => {
      stats.comparisons += 1;
      if (!visited.has(next.to)) {
        frontier.push({ ...next, from: edge.to });
      }
    });

    steps.push(
      makeStep({
        action: `Add edge ${edge.id} to MST`,
        visited: [...visited],
        current: edge.to,
        frontier: frontier.map((x) => x.to),
        distances: {},
        activeEdges: mstEdges,
        stats,
      }),
    );
  }

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const kruskal = (graph) => {
  const steps = [];
  const parent = {};
  const rank = {};
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };

  graph.nodes.forEach((node) => {
    parent[node.id] = node.id;
    rank[node.id] = 0;
  });

  const find = (x) => {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  };

  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) {
      return false;
    }
    if (rank[rootA] < rank[rootB]) {
      parent[rootA] = rootB;
    } else if (rank[rootA] > rank[rootB]) {
      parent[rootB] = rootA;
    } else {
      parent[rootB] = rootA;
      rank[rootA] += 1;
    }
    return true;
  };

  const sortedEdges = [...graph.edges].sort((a, b) => a.weight - b.weight);
  const mstEdges = [];

  sortedEdges.forEach((edge) => {
    stats.comparisons += 1;
    const accepted = union(edge.source, edge.target);
    if (accepted) {
      mstEdges.push(edge.id);
      stats.swaps += 1;
    }
    steps.push(
      makeStep({
        action: `${accepted ? "Take" : "Skip"} edge ${edge.id}`,
        visited: Object.keys(parent),
        current: edge.source,
        frontier: sortedEdges.map((e) => e.id),
        distances: {},
        activeEdges: mstEdges,
        stats,
        internalState: { parent: { ...parent }, rank: { ...rank } },
      }),
    );
  });

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const bellmanFord = (graph, start) => {
  const steps = [];
  const dist = {};
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };
  graph.nodes.forEach((node) => {
    dist[node.id] = Number.POSITIVE_INFINITY;
  });
  dist[start] = 0;

  for (let i = 0; i < graph.nodes.length - 1; i += 1) {
    graph.edges.forEach((edge) => {
      const u = edge.source;
      const v = edge.target;
      const w = edge.weight;
      stats.comparisons += 1;
      if (dist[u] !== Number.POSITIVE_INFINITY && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        stats.swaps += 1;
      }
      if (dist[v] !== Number.POSITIVE_INFINITY && dist[v] + w < dist[u]) {
        dist[u] = dist[v] + w;
        stats.swaps += 1;
      }
      steps.push(
        makeStep({
          action: `Relax edge ${edge.id}`,
          visited: Object.keys(dist).filter((k) => dist[k] < Number.POSITIVE_INFINITY),
          current: u,
          frontier: [v],
          distances: dist,
          activeEdges: [edge.id],
          stats,
        }),
      );
    });
  }

  stats.executionSteps = steps.length;
  stats.visitedNodes = Object.values(dist).filter((d) => d < Number.POSITIVE_INFINITY).length;
  return { steps, stats };
};

const topo = (graph) => {
  const directedEdges = graph.edges.map((edge) => {
    const source = Number(edge.source) < Number(edge.target) ? edge.source : edge.target;
    const target = source === edge.source ? edge.target : edge.source;
    return { ...edge, source, target };
  });
  const indegree = {};
  const adjacency = {};
  graph.nodes.forEach((node) => {
    indegree[node.id] = 0;
    adjacency[node.id] = [];
  });
  directedEdges.forEach((edge) => {
    indegree[edge.target] += 1;
    adjacency[edge.source].push(edge);
  });
  const queue = Object.keys(indegree).filter((k) => indegree[k] === 0);
  const order = [];
  const steps = [];
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };

  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    stats.visitedNodes += 1;
    adjacency[node].forEach((edge) => {
      indegree[edge.target] -= 1;
      if (indegree[edge.target] === 0) queue.push(edge.target);
      stats.comparisons += 1;
    });
    steps.push(
      makeStep({
        action: `Topo output: ${order.join(" → ")}`,
        visited: order,
        current: node,
        frontier: queue,
        distances: indegree,
        activeEdges: adjacency[node].map((e) => e.id),
        stats,
      }),
    );
  }

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const cycleDetection = (graph) => {
  const parent = {};
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };
  const steps = [];
  graph.nodes.forEach((node) => {
    parent[node.id] = node.id;
  });
  const find = (x) => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const unite = (a, b) => {
    const pa = find(a);
    const pb = find(b);
    if (pa === pb) return false;
    parent[pb] = pa;
    return true;
  };

  for (const edge of graph.edges) {
    stats.comparisons += 1;
    const isTreeEdge = unite(edge.source, edge.target);
    steps.push(
      makeStep({
        action: isTreeEdge ? `No cycle at ${edge.id}` : `Cycle detected at ${edge.id}`,
        visited: Object.keys(parent),
        current: edge.source,
        frontier: [edge.target],
        distances: {},
        activeEdges: [edge.id],
        stats,
        internalState: { parent: { ...parent } },
      }),
    );
  }

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const connectedComponents = (graph) => {
  const steps = [];
  const visited = new Set();
  let component = 0;
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };

  graph.nodes.forEach((node) => {
    if (visited.has(node.id)) return;
    component += 1;
    const queue = [node.id];
    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      stats.visitedNodes += 1;
      graph.adjacency[current].forEach((next) => {
        stats.comparisons += 1;
        if (!visited.has(next.to)) queue.push(next.to);
      });
      steps.push(
        makeStep({
          action: `Component ${component}: include node ${current}`,
          visited: [...visited],
          current,
          frontier: queue,
          distances: {},
          activeEdges: graph.adjacency[current].map((x) => x.id),
          stats,
        }),
      );
    }
  });
  stats.executionSteps = steps.length;
  return { steps, stats };
};

const bipartiteCheck = (graph) => {
  const color = {};
  const steps = [];
  const stats = { visitedNodes: 0, executionSteps: 0, comparisons: 0, swaps: 0 };

  for (const node of graph.nodes) {
    if (color[node.id] !== undefined) continue;
    color[node.id] = 0;
    const queue = [node.id];
    while (queue.length) {
      const current = queue.shift();
      stats.visitedNodes += 1;
      for (const next of graph.adjacency[current]) {
        stats.comparisons += 1;
        if (color[next.to] === undefined) {
          color[next.to] = 1 - color[current];
          queue.push(next.to);
        }
      }
      steps.push(
        makeStep({
          action: `Color node ${current} as ${color[current]}`,
          visited: Object.keys(color),
          current,
          frontier: queue,
          distances: color,
          activeEdges: graph.adjacency[current].map((x) => x.id),
          stats,
        }),
      );
    }
  }

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const unionFindDemo = (graph) => {
  const parent = {};
  const steps = [];
  const stats = { visitedNodes: graph.nodes.length, executionSteps: 0, comparisons: 0, swaps: 0 };
  graph.nodes.forEach((n) => {
    parent[n.id] = n.id;
  });
  const find = (x) => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };

  graph.edges.forEach((edge) => {
    stats.comparisons += 1;
    const pa = find(edge.source);
    const pb = find(edge.target);
    if (pa !== pb) {
      parent[pb] = pa;
      stats.swaps += 1;
    }
    steps.push(
      makeStep({
        action: `Union(${edge.source}, ${edge.target})`,
        visited: Object.keys(parent),
        current: edge.source,
        frontier: [edge.target],
        distances: {},
        activeEdges: [edge.id],
        stats,
        internalState: { parent: { ...parent } },
      }),
    );
  });

  stats.executionSteps = steps.length;
  return { steps, stats };
};

const handlers = {
  bfs,
  dfs,
  dijkstra,
  bellman: bellmanFord,
  prim,
  kruskal,
  topo,
  cycle: cycleDetection,
  components: connectedComponents,
  bipartite: bipartiteCheck,
  unionfind: unionFindDemo,
};

export const runGraphAlgorithm = ({ graph, algorithm, startNode = "0" }) => {
  const runner = handlers[algorithm] || handlers.bfs;
  return runner(graph, startNode);
};
