import {
  countNodes,
  findNodeByValue,
  getTreeHeight,
  isBstStructure,
} from "@/modules/trees/treeUtils";

const createStep = (payload) => ({
  currentNodeId: null,
  visitedNodeIds: [],
  resultNodeIds: [],
  deletedNodeIds: [],
  output: "",
  line: 1,
  ...payload,
});

const traversalPseudocode = {
  inorder: [
    "if node is null: return",
    "traverse(node.left)",
    "visit(node)",
    "traverse(node.right)",
  ],
  preorder: [
    "if node is null: return",
    "visit(node)",
    "traverse(node.left)",
    "traverse(node.right)",
  ],
  postorder: [
    "if node is null: return",
    "traverse(node.left)",
    "traverse(node.right)",
    "visit(node)",
  ],
  levelOrder: [
    "enqueue(root)",
    "while queue is not empty",
    "dequeue current node",
    "visit(current)",
    "enqueue children",
  ],
};

export const treeAlgorithmInfo = {
  inorder: { label: "Inorder Traversal", pseudocode: traversalPseudocode.inorder, requires: 0 },
  preorder: { label: "Preorder Traversal", pseudocode: traversalPseudocode.preorder, requires: 0 },
  postorder: { label: "Postorder Traversal", pseudocode: traversalPseudocode.postorder, requires: 0 },
  levelOrder: { label: "Level Order Traversal", pseudocode: traversalPseudocode.levelOrder, requires: 0 },
  search: {
    label: "Search Node",
    requires: 1,
    pseudocode: [
      "start from root",
      "visit current node",
      "if value matches: return found",
      "move to the next candidate node",
    ],
  },
  height: {
    label: "Find Height",
    requires: 0,
    pseudocode: [
      "if node is null: return 0",
      "leftHeight = height(node.left)",
      "rightHeight = height(node.right)",
      "return 1 + max(leftHeight, rightHeight)",
    ],
  },
  count: {
    label: "Count Nodes",
    requires: 0,
    pseudocode: [
      "if node is null: return 0",
      "count left subtree",
      "count right subtree",
      "return left + right + 1",
    ],
  },
  min: {
    label: "Find Minimum",
    requires: 0,
    pseudocode: [
      "initialize minimum as infinity",
      "visit every node",
      "if node.value is smaller: update minimum",
      "return minimum",
    ],
  },
  max: {
    label: "Find Maximum",
    requires: 0,
    pseudocode: [
      "initialize maximum as -infinity",
      "visit every node",
      "if node.value is larger: update maximum",
      "return maximum",
    ],
  },
  isBst: {
    label: "Check if BST",
    requires: 0,
    pseudocode: [
      "validate node inside (min, max)",
      "recurse left with updated max",
      "recurse right with updated min",
      "all nodes valid => tree is BST",
    ],
  },
  lca: {
    label: "Lowest Common Ancestor",
    requires: 2,
    pseudocode: [
      "find path from root to value A",
      "find path from root to value B",
      "compare both paths from the root",
      "last shared node is the LCA",
    ],
  },
  diameter: {
    label: "Diameter of Tree",
    requires: 0,
    pseudocode: [
      "compute left subtree height",
      "compute right subtree height",
      "update best diameter with left + right",
      "return 1 + max(leftHeight, rightHeight)",
    ],
  },
};

const buildTraversal = (root, key) => {
  const steps = [];
  const order = [];
  const visited = [];

  const visit = (node, line) => {
    if (!node) return;
    visited.push(node.id);
    order.push(node.value);
    steps.push(createStep({
      description: `Visit node ${node.value}`,
      currentNodeId: node.id,
      visitedNodeIds: [...visited],
      resultNodeIds: [node.id],
      output: order.join(" -> "),
      line,
    }));
  };

  const dfs = (node) => {
    if (!node) return;
    if (key === "preorder") visit(node, 2);
    dfs(node.left);
    if (key === "inorder") visit(node, 3);
    dfs(node.right);
    if (key === "postorder") visit(node, 4);
  };

  if (key === "levelOrder") {
    const queue = root ? [root] : [];
    while (queue.length) {
      const current = queue.shift();
      visited.push(current.id);
      order.push(current.value);
      steps.push(createStep({
        description: `Visit node ${current.value} in queue order`,
        currentNodeId: current.id,
        visitedNodeIds: [...visited],
        resultNodeIds: [current.id],
        output: order.join(" -> "),
        line: 4,
      }));
      if (current.left) queue.push(current.left);
      if (current.right) queue.push(current.right);
    }
  } else {
    dfs(root);
  }

  return {
    steps,
    result: order.length ? order.join(" -> ") : "(empty)",
  };
};

const buildSearch = (root, target, treeType) => {
  const steps = [];
  const visited = [];

  if (treeType === "bst") {
    let current = root;
    while (current) {
      visited.push(current.id);
      steps.push(createStep({
        description: `Inspect node ${current.value}`,
        currentNodeId: current.id,
        visitedNodeIds: [...visited],
        line: current.value === target ? 3 : 2,
      }));
      if (current.value === target) {
        return { steps, result: `Found ${target}` };
      }
      current = target < current.value ? current.left : current.right;
    }
  } else {
    const queue = root ? [root] : [];
    while (queue.length) {
      const current = queue.shift();
      visited.push(current.id);
      steps.push(createStep({
        description: `Visit node ${current.value}`,
        currentNodeId: current.id,
        visitedNodeIds: [...visited],
        line: current.value === target ? 3 : 2,
      }));
      if (current.value === target) {
        return { steps, result: `Found ${target}` };
      }
      if (current.left) queue.push(current.left);
      if (current.right) queue.push(current.right);
    }
  }

  return { steps, result: `${target} not found` };
};

const collectEveryNode = (root, visitor) => {
  if (!root) return;
  visitor(root);
  collectEveryNode(root.left, visitor);
  collectEveryNode(root.right, visitor);
};

const buildScalarWalk = (root, label, selector, line = 3) => {
  const steps = [];
  const visited = [];
  let best = null;

  collectEveryNode(root, (node) => {
    visited.push(node.id);
    best = best === null ? node.value : selector(best, node.value);
    steps.push(createStep({
      description: `${label}: inspect ${node.value}`,
      currentNodeId: node.id,
      visitedNodeIds: [...visited],
      resultNodeIds: [node.id],
      output: `${best}`,
      line,
    }));
  });

  return { steps, result: best === null ? "(empty)" : `${best}` };
};

const buildHeight = (root) => {
  const steps = [];
  const visited = [];

  const walk = (node) => {
    if (!node) return 0;
    const leftHeight = walk(node.left);
    const rightHeight = walk(node.right);
    visited.push(node.id);
    const height = 1 + Math.max(leftHeight, rightHeight);
    steps.push(createStep({
      description: `Height at node ${node.value} is ${height}`,
      currentNodeId: node.id,
      visitedNodeIds: [...visited],
      resultNodeIds: [node.id],
      output: `${height}`,
      line: 4,
    }));
    return height;
  };

  return { steps, result: `${walk(root)}` };
};

const buildCount = (root) => {
  const steps = [];
  const visited = [];

  const walk = (node) => {
    if (!node) return 0;
    const leftCount = walk(node.left);
    const rightCount = walk(node.right);
    visited.push(node.id);
    const total = leftCount + rightCount + 1;
    steps.push(createStep({
      description: `Count at node ${node.value} is ${total}`,
      currentNodeId: node.id,
      visitedNodeIds: [...visited],
      resultNodeIds: [node.id],
      output: `${total}`,
      line: 4,
    }));
    return total;
  };

  return { steps, result: `${walk(root)}` };
};

const buildIsBst = (root) => {
  const steps = [];
  const visited = [];

  const walk = (node, min, max) => {
    if (!node) return true;
    visited.push(node.id);
    const valid = node.value > min && node.value < max;
    steps.push(createStep({
      description: `Check ${node.value} inside (${min}, ${max})`,
      currentNodeId: node.id,
      visitedNodeIds: [...visited],
      resultNodeIds: valid ? [node.id] : [],
      output: valid ? "Valid so far" : "BST violation",
      line: 1,
    }));
    if (!valid) return false;
    return walk(node.left, min, node.value) && walk(node.right, node.value, max);
  };

  const valid = walk(root, -Infinity, Infinity);
  return { steps, result: valid ? "Yes, this is a BST" : "No, this is not a BST" };
};

const buildLca = (root, firstValue, secondValue) => {
  const steps = [];
  const visited = [];

  const pathTo = (node, target, path = []) => {
    if (!node) return null;
    visited.push(node.id);
    steps.push(createStep({
      description: `Search path to ${target} at node ${node.value}`,
      currentNodeId: node.id,
      visitedNodeIds: [...visited],
      line: 1,
    }));

    const nextPath = [...path, node];
    if (node.value === target) return nextPath;
    return pathTo(node.left, target, nextPath) || pathTo(node.right, target, nextPath);
  };

  const firstPath = pathTo(root, firstValue);
  const secondPath = pathTo(root, secondValue);

  if (!firstPath || !secondPath) {
    return { steps, result: "LCA not available because one or both values are missing." };
  }

  let lca = null;
  for (let index = 0; index < Math.min(firstPath.length, secondPath.length); index += 1) {
    if (firstPath[index].id !== secondPath[index].id) break;
    lca = firstPath[index];
    steps.push(createStep({
      description: `Common ancestor candidate: ${lca.value}`,
      currentNodeId: lca.id,
      visitedNodeIds: [...visited],
      resultNodeIds: [lca.id],
      output: `${lca.value}`,
      line: 4,
    }));
  }

  return { steps, result: lca ? `LCA = ${lca.value}` : "No common ancestor found" };
};

const buildDiameter = (root) => {
  const steps = [];
  const visited = [];
  let best = 0;

  const walk = (node) => {
    if (!node) return 0;
    const left = walk(node.left);
    const right = walk(node.right);
    visited.push(node.id);
    best = Math.max(best, left + right);
    steps.push(createStep({
      description: `Diameter through ${node.value} is ${left + right}`,
      currentNodeId: node.id,
      visitedNodeIds: [...visited],
      resultNodeIds: [node.id],
      output: `${best}`,
      line: 3,
    }));
    return 1 + Math.max(left, right);
  };

  walk(root);
  return { steps, result: `${best}` };
};

export const getTreeAlgorithmOptions = () =>
  Object.entries(treeAlgorithmInfo).map(([value, info]) => ({
    value,
    label: info.label,
    requires: info.requires,
  }));

export const runTreeAlgorithm = (root, algorithmKey, options = {}) => {
  const start = performance.now();
  let execution = { steps: [], result: "(empty)" };

  if (!root) {
    execution = {
      steps: [createStep({ description: "Tree is empty.", output: "(empty)", line: 1 })],
      result: "(empty)",
    };
  } else {
    switch (algorithmKey) {
      case "inorder":
      case "preorder":
      case "postorder":
      case "levelOrder":
        execution = buildTraversal(root, algorithmKey);
        break;
      case "search":
        execution = buildSearch(root, options.primaryValue, options.treeType);
        break;
      case "height":
        execution = buildHeight(root);
        break;
      case "count":
        execution = buildCount(root);
        break;
      case "min":
        execution = buildScalarWalk(root, "Minimum", Math.min);
        break;
      case "max":
        execution = buildScalarWalk(root, "Maximum", Math.max);
        break;
      case "isBst":
        execution = buildIsBst(root);
        break;
      case "lca":
        execution = buildLca(root, options.primaryValue, options.secondaryValue);
        break;
      case "diameter":
        execution = buildDiameter(root);
        break;
      default:
        execution = { steps: [createStep({ description: "Unknown algorithm.", output: "" })], result: "" };
    }
  }

  return {
    ...execution,
    executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
    totalNodes: countNodes(root),
    height: getTreeHeight(root),
    isBst: isBstStructure(root),
    matchedNodeId: options.primaryValue != null ? findNodeByValue(root, options.primaryValue)?.id ?? null : null,
  };
};
