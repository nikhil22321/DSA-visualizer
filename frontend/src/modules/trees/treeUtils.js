let nextTreeNodeId = 1;

export const createTreeNode = (value, parent = null) => ({
  id: `tree-node-${nextTreeNodeId++}`,
  value,
  left: null,
  right: null,
  parent,
  x: 0,
  y: 0,
});

export const isValidNodeValue = (rawValue) => {
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const isValidTreeSize = (rawValue, fallback = 7) => {
  if (rawValue === "" || rawValue == null) return fallback;
  const numericValue = Number(rawValue);
  if (!Number.isInteger(numericValue) || numericValue <= 0) return null;
  return Math.min(numericValue, 25);
};

export const cloneTree = (root) => {
  if (!root) return null;
  return {
    ...root,
    left: cloneTree(root.left),
    right: cloneTree(root.right),
  };
};

export const relayoutTree = (root) => {
  if (!root) return null;
  const cloned = cloneTree(root);
  const totalNodes = countNodes(cloned);
  const treeHeight = getTreeHeight(cloned);
  let index = 0;
  const canvasWidth = 1040;
  const startX = 80;
  const startY = 72;
  const endX = startX + canvasWidth;
  const stepX = totalNodes <= 1 ? 0 : canvasWidth / (totalNodes - 1);
  const maxHeight = 360;
  const stepY = treeHeight <= 1 ? 0 : Math.min(118, maxHeight / (treeHeight - 1));

  const assign = (node, depth, parentId = null) => {
    if (!node) return;
    assign(node.left, depth + 1, node.id);
    node.parent = parentId;
    node.x = totalNodes <= 1 ? (startX + endX) / 2 : startX + index * stepX;
    node.y = startY + depth * stepY;
    index += 1;
    assign(node.right, depth + 1, node.id);
  };

  assign(cloned, 0);
  return cloned;
};

export const flattenTree = (root) => {
  if (!root) return { nodes: [], edges: [] };
  const nodes = [];
  const edges = [];

  const walk = (node) => {
    if (!node) return;
    nodes.push(node);
    if (node.left) {
      edges.push({
        from: node.id,
        to: node.left.id,
        x1: node.x,
        y1: node.y,
        x2: node.left.x,
        y2: node.left.y,
      });
      walk(node.left);
    }
    if (node.right) {
      edges.push({
        from: node.id,
        to: node.right.id,
        x1: node.x,
        y1: node.y,
        x2: node.right.x,
        y2: node.right.y,
      });
      walk(node.right);
    }
  };

  walk(root);
  return { nodes, edges };
};

export const findNodeById = (root, nodeId) => {
  if (!root) return null;
  if (root.id === nodeId) return root;
  return findNodeById(root.left, nodeId) || findNodeById(root.right, nodeId);
};

export const collectNodeIds = (root) => {
  const ids = [];
  const walk = (node) => {
    if (!node) return;
    ids.push(node.id);
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return ids;
};

export const countNodes = (root) => {
  if (!root) return 0;
  return 1 + countNodes(root.left) + countNodes(root.right);
};

export const getTreeHeight = (root) => {
  if (!root) return 0;
  return 1 + Math.max(getTreeHeight(root.left), getTreeHeight(root.right));
};

export const addManualRoot = (root, value) => {
  if (root) {
    return { root, error: "Root already exists." };
  }
  return { root: relayoutTree(createTreeNode(value)), error: null };
};

export const addManualChild = (root, parentId, side, value) => {
  if (!root) {
    return { root, error: "Create a root node first." };
  }

  const nextRoot = cloneTree(root);
  const parent = findNodeById(nextRoot, parentId);
  if (!parent) {
    return { root, error: "Selected node no longer exists." };
  }
  if (parent[side]) {
    return { root, error: `The ${side} child already exists.` };
  }

  parent[side] = createTreeNode(value, parent.id);
  return { root: relayoutTree(nextRoot), error: null, createdId: parent[side].id };
};

export const deleteNodeById = (root, nodeId) => {
  if (!root) return { root: null, deletedIds: [] };
  if (root.id === nodeId) {
    return { root: null, deletedIds: collectNodeIds(root) };
  }

  const nextRoot = cloneTree(root);
  let deletedIds = [];

  const remove = (node) => {
    if (!node) return false;
    if (node.left?.id === nodeId) {
      deletedIds = collectNodeIds(node.left);
      node.left = null;
      return true;
    }
    if (node.right?.id === nodeId) {
      deletedIds = collectNodeIds(node.right);
      node.right = null;
      return true;
    }
    return remove(node.left) || remove(node.right);
  };

  remove(nextRoot);
  return { root: relayoutTree(nextRoot), deletedIds };
};

export const insertBstValue = (root, value) => {
  if (!root) {
    const created = createTreeNode(value);
    return {
      root: relayoutTree(created),
      insertedId: created.id,
      visitedIds: [],
      duplicate: false,
    };
  }

  const nextRoot = cloneTree(root);
  let current = nextRoot;
  const visitedIds = [];

  while (current) {
    visitedIds.push(current.id);
    if (value === current.value) {
      return { root, insertedId: current.id, visitedIds, duplicate: true };
    }
    if (value < current.value) {
      if (!current.left) {
        current.left = createTreeNode(value, current.id);
        const laidOut = relayoutTree(nextRoot);
        return {
          root: laidOut,
          insertedId: findNodeByValue(laidOut, value)?.id || current.left.id,
          visitedIds,
          duplicate: false,
        };
      }
      current = current.left;
    } else {
      if (!current.right) {
        current.right = createTreeNode(value, current.id);
        const laidOut = relayoutTree(nextRoot);
        return {
          root: laidOut,
          insertedId: findNodeByValue(laidOut, value)?.id || current.right.id,
          visitedIds,
          duplicate: false,
        };
      }
      current = current.right;
    }
  }

  return { root, insertedId: null, visitedIds, duplicate: false };
};

export const deleteBstValue = (root, value) => {
  if (!root) return { root: null, deletedIds: [], visitedIds: [] };
  const nextRoot = cloneTree(root);
  const visitedIds = [];
  let deletedIds = [];

  const minNode = (node) => {
    let current = node;
    while (current?.left) current = current.left;
    return current;
  };

  const remove = (node, trackVisit = true) => {
    if (!node) return null;
    if (trackVisit) {
      visitedIds.push(node.id);
    }
    if (value < node.value) {
      node.left = remove(node.left, trackVisit);
      return node;
    }
    if (value > node.value) {
      node.right = remove(node.right, trackVisit);
      return node;
    }
    deletedIds = [node.id];
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    const successor = minNode(node.right);
    node.value = successor.value;
    const removeSuccessor = (branch) => {
      if (!branch) return null;
      if (branch.value === successor.value) {
        return branch.right;
      }
      branch.left = removeSuccessor(branch.left);
      return branch;
    };
    node.right = removeSuccessor(node.right);
    return node;
  };

  const updatedRoot = remove(nextRoot);
  return { root: relayoutTree(updatedRoot), deletedIds, visitedIds };
};

export const findNodeByValue = (root, value) => {
  if (!root) return null;
  if (root.value === value) return root;
  return findNodeByValue(root.left, value) || findNodeByValue(root.right, value);
};

export const isBstStructure = (root, min = -Infinity, max = Infinity) => {
  if (!root) return true;
  if (root.value <= min || root.value >= max) return false;
  return isBstStructure(root.left, min, root.value) && isBstStructure(root.right, root.value, max);
};

const buildRandomUniqueValues = (count, min = 1, max = 99) => {
  const values = new Set();
  while (values.size < count) {
    values.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return [...values];
};

export const generateRandomTree = (treeType, nodeCount = 7) => {
  if (!nodeCount || nodeCount <= 0) {
    return { root: null, values: [] };
  }

  const values = buildRandomUniqueValues(nodeCount);

  if (treeType === "bst") {
    let root = null;
    values.forEach((value) => {
      root = insertBstValue(root, value).root;
    });
    return { root, values };
  }

  const root = createTreeNode(values[0]);
  const availableParents = [root];

  for (let index = 1; index < values.length; index += 1) {
    const nextNode = createTreeNode(values[index]);
    let attached = false;

    while (!attached && availableParents.length) {
      const parentIndex = Math.floor(Math.random() * availableParents.length);
      const parent = availableParents[parentIndex];
      const sides = ["left", "right"].sort(() => Math.random() - 0.5);

      for (const side of sides) {
        if (!parent[side]) {
          parent[side] = nextNode;
          nextNode.parent = parent.id;
          availableParents.push(nextNode);
          if (parent.left && parent.right) {
            availableParents.splice(parentIndex, 1);
          }
          attached = true;
          break;
        }
      }

      if (!parent.left && !parent.right && !attached) {
        continue;
      }

      if (!attached && parent.left && parent.right) {
        availableParents.splice(parentIndex, 1);
      }
    }
  }

  return { root: relayoutTree(root), values };
};
