export const nextNodeId = (count) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (count < chars.length) return chars[count];
  const first = Math.floor(count / chars.length) - 1;
  const second = count % chars.length;
  return `${chars[first]}${chars[second]}`;
};

export const edgeKey = (source, target, directed) =>
  directed ? `${source}->${target}` : [source, target].sort().join("--");

export const buildAdjacency = ({ nodes, edges, directed }) => {
  const adjacency = {};
  nodes.forEach((node) => {
    adjacency[node.id] = [];
  });

  edges.forEach((edge) => {
    adjacency[edge.source]?.push({ to: edge.target, weight: edge.weight, id: edge.id });
    if (!directed) {
      adjacency[edge.target]?.push({ to: edge.source, weight: edge.weight, id: edge.id });
    }
  });

  return adjacency;
};

const createRandom = (seed = Date.now()) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomGraph = ({
  nodeCount = 8,
  density = 0.35,
  directed = false,
  weighted = true,
  width = 1000,
  height = 560,
  seed = Date.now(),
}) => {
  const rand = createRandom(seed);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / nodeCount;
    return {
      id: nextNodeId(index),
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const seen = new Set();
  const edges = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue;
      if (!directed && j <= i) continue;
      if (rand() > density) continue;

      const source = nodes[i].id;
      const target = nodes[j].id;
      const key = edgeKey(source, target, directed);
      if (seen.has(key)) continue;
      seen.add(key);

      edges.push({
        id: key,
        source,
        target,
        weight: weighted ? Math.floor(rand() * 9) + 1 : 1,
      });
    }
  }

  return { nodes, edges };
};

export const graphToOutputLines = (result = {}) => {
  if (result.order?.length) {
    return [`Order: ${result.order.join(" → ")}`];
  }
  if (result.distances) {
    const distLines = Object.entries(result.distances).map(([node, value]) => `${node} → ${value}`);
    const lines = [`Distance:`].concat(distLines);
    if (result.path?.length) lines.push(`Shortest Path: ${result.path.join(" → ")}`);
    return lines;
  }
  if (result.mstEdges?.length) {
    const mstLines = result.mstEdges.map((e) => `(${e.source}-${e.target}, ${e.weight})`);
    return ["Edges:"].concat(mstLines).concat([`Total Weight: ${result.totalWeight}`]);
  }
  if (typeof result.hasCycle === "boolean") {
    return [`Cycle Detection: ${result.hasCycle ? "Cycle Found" : "No Cycle"}`];
  }
  return ["Run algorithm to see output"]; 
};
