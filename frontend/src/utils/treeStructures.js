const node = (value) => ({ value, left: null, right: null, height: 1 });

export const clone = (obj) => JSON.parse(JSON.stringify(obj));

export const bstInsert = (root, value) => {
  if (!root) return node(value);
  if (value < root.value) root.left = bstInsert(root.left, value);
  if (value > root.value) root.right = bstInsert(root.right, value);
  return root;
};

export const bstSearch = (root, value) => {
  if (!root) return false;
  if (root.value === value) return true;
  if (value < root.value) return bstSearch(root.left, value);
  return bstSearch(root.right, value);
};

const minNode = (root) => {
  let current = root;
  while (current?.left) current = current.left;
  return current;
};

export const bstDelete = (root, value) => {
  if (!root) return null;
  if (value < root.value) {
    root.left = bstDelete(root.left, value);
  } else if (value > root.value) {
    root.right = bstDelete(root.right, value);
  } else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    const successor = minNode(root.right);
    root.value = successor.value;
    root.right = bstDelete(root.right, successor.value);
  }
  return root;
};

export const binaryInsertLevel = (root, value) => {
  const newNode = node(value);
  if (!root) return newNode;
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    if (!current.left) {
      current.left = newNode;
      return root;
    }
    if (!current.right) {
      current.right = newNode;
      return root;
    }
    queue.push(current.left);
    queue.push(current.right);
  }
  return root;
};

const h = (n) => n?.height || 0;
const upd = (n) => {
  if (!n) return;
  n.height = Math.max(h(n.left), h(n.right)) + 1;
};
const bf = (n) => (n ? h(n.left) - h(n.right) : 0);

const rightRotate = (y) => {
  const x = y.left;
  const t2 = x.right;
  x.right = y;
  y.left = t2;
  upd(y);
  upd(x);
  return x;
};

const leftRotate = (x) => {
  const y = x.right;
  const t2 = y.left;
  y.left = x;
  x.right = t2;
  upd(x);
  upd(y);
  return y;
};

export const avlInsert = (root, value) => {
  if (!root) return node(value);
  if (value < root.value) root.left = avlInsert(root.left, value);
  else if (value > root.value) root.right = avlInsert(root.right, value);
  else return root;

  upd(root);
  const balance = bf(root);

  if (balance > 1 && value < root.left.value) return rightRotate(root);
  if (balance < -1 && value > root.right.value) return leftRotate(root);
  if (balance > 1 && value > root.left.value) {
    root.left = leftRotate(root.left);
    return rightRotate(root);
  }
  if (balance < -1 && value < root.right.value) {
    root.right = rightRotate(root.right);
    return leftRotate(root);
  }
  return root;
};

export const avlDelete = (root, value) => {
  if (!root) return root;
  if (value < root.value) root.left = avlDelete(root.left, value);
  else if (value > root.value) root.right = avlDelete(root.right, value);
  else {
    if (!root.left || !root.right) {
      root = root.left || root.right;
    } else {
      const successor = minNode(root.right);
      root.value = successor.value;
      root.right = avlDelete(root.right, successor.value);
    }
  }
  if (!root) return root;

  upd(root);
  const balance = bf(root);
  if (balance > 1 && bf(root.left) >= 0) return rightRotate(root);
  if (balance > 1 && bf(root.left) < 0) {
    root.left = leftRotate(root.left);
    return rightRotate(root);
  }
  if (balance < -1 && bf(root.right) <= 0) return leftRotate(root);
  if (balance < -1 && bf(root.right) > 0) {
    root.right = rightRotate(root.right);
    return leftRotate(root);
  }
  return root;
};

export const traversals = (root) => {
  const inorder = [];
  const preorder = [];
  const postorder = [];
  const levelorder = [];

  const dfs = (n) => {
    if (!n) return;
    preorder.push(n.value);
    dfs(n.left);
    inorder.push(n.value);
    dfs(n.right);
    postorder.push(n.value);
  };
  dfs(root);

  const q = root ? [root] : [];
  while (q.length) {
    const cur = q.shift();
    levelorder.push(cur.value);
    if (cur.left) q.push(cur.left);
    if (cur.right) q.push(cur.right);
  }

  return { inorder, preorder, postorder, levelorder };
};

export const treeToLayout = (root) => {
  if (!root) return { nodes: [], edges: [] };
  const nodes = [];
  const edges = [];

  const assign = (n, depth, xMin, xMax, parentId = null) => {
    if (!n) return;
    const id = `${n.value}-${depth}-${xMin}-${xMax}`;
    const x = (xMin + xMax) / 2;
    const y = 70 + depth * 82;
    nodes.push({ id, value: n.value, x, y, depth, height: n.height || 1 });
    if (parentId) {
      edges.push({ from: parentId, to: id });
    }
    assign(n.left, depth + 1, xMin, x - 20, id);
    assign(n.right, depth + 1, x + 20, xMax, id);
  };

  assign(root, 0, 40, 960);
  return { nodes, edges };
};

export const createTrie = () => ({ children: {}, end: false });

export const trieInsert = (root, word) => {
  let cur = root;
  for (const ch of word.toLowerCase()) {
    if (!cur.children[ch]) cur.children[ch] = createTrie();
    cur = cur.children[ch];
  }
  cur.end = true;
  return root;
};

export const trieSearch = (root, word) => {
  let cur = root;
  for (const ch of word.toLowerCase()) {
    if (!cur.children[ch]) return false;
    cur = cur.children[ch];
  }
  return !!cur.end;
};

export const trieDelete = (root, word) => {
  const remove = (nodeRef, idx) => {
    if (idx === word.length) {
      if (!nodeRef.end) return false;
      nodeRef.end = false;
      return Object.keys(nodeRef.children).length === 0;
    }
    const ch = word[idx];
    if (!nodeRef.children[ch]) return false;
    const shouldDelete = remove(nodeRef.children[ch], idx + 1);
    if (shouldDelete) delete nodeRef.children[ch];
    return !nodeRef.end && Object.keys(nodeRef.children).length === 0;
  };
  remove(root, 0);
  return root;
};

export const trieWords = (root) => {
  const output = [];
  const walk = (n, prefix) => {
    if (n.end) output.push(prefix);
    Object.keys(n.children).forEach((ch) => walk(n.children[ch], `${prefix}${ch}`));
  };
  walk(root, "");
  return output;
};

export const buildSegmentTree = (arr) => {
  const n = arr.length;
  const tree = Array(4 * n).fill(0);
  const build = (idx, left, right) => {
    if (left === right) {
      tree[idx] = arr[left];
      return;
    }
    const mid = Math.floor((left + right) / 2);
    build(idx * 2, left, mid);
    build(idx * 2 + 1, mid + 1, right);
    tree[idx] = tree[idx * 2] + tree[idx * 2 + 1];
  };
  if (n) build(1, 0, n - 1);
  return tree;
};

export const segmentQuery = (arr, tree, ql, qr) => {
  const n = arr.length;
  const query = (idx, left, right) => {
    if (qr < left || right < ql) return 0;
    if (ql <= left && right <= qr) return tree[idx];
    const mid = Math.floor((left + right) / 2);
    return query(idx * 2, left, mid) + query(idx * 2 + 1, mid + 1, right);
  };
  if (!n) return 0;
  return query(1, 0, n - 1);
};

export const segmentUpdate = (arr, tree, index, value) => {
  const n = arr.length;
  if (!n) return { arr, tree };
  const nextArr = [...arr];
  nextArr[index] = value;
  const nextTree = [...tree];

  const update = (idx, left, right) => {
    if (left === right) {
      nextTree[idx] = value;
      return;
    }
    const mid = Math.floor((left + right) / 2);
    if (index <= mid) update(idx * 2, left, mid);
    else update(idx * 2 + 1, mid + 1, right);
    nextTree[idx] = nextTree[idx * 2] + nextTree[idx * 2 + 1];
  };
  update(1, 0, n - 1);
  return { arr: nextArr, tree: nextTree };
};
