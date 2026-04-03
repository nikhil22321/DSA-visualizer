
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, Trash2 } from "lucide-react";

import { CodePanel } from "@/components/common/CodePanel";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { StatsGrid } from "@/components/common/StatsGrid";
import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { TreeStage } from "@/components/visuals/TreeStage";
import { usePlayback } from "@/hooks/usePlayback";
import { useAppStore } from "@/store/useAppStore";
import {
  avlDelete,
  avlInsert,
  binaryInsertLevel,
  bstDelete,
  bstInsert,
  buildSegmentTree,
  clone,
  createTrie,
  segmentQuery,
  segmentUpdate,
  treeToLayout,
  trieDelete,
  trieInsert,
  trieWords,
} from "@/utils/treeStructures";

const DEFAULT_SEGMENT_VALUES = [5, 1, 3, 7, 2, 6, 4, 8];
const EMPTY_TRAVERSAL_TEXT = "No traversal yet";

const treeOptions = [
  { value: "binary", label: "Binary Tree" },
  { value: "bst", label: "Binary Search Tree" },
  { value: "avl", label: "AVL Tree" },
  { value: "trie", label: "Trie" },
  { value: "segment", label: "Segment Tree" },
];

const treeCode = {
  binary: `insertLevel(root, value):\n  if root is empty: return new node\n  walk the tree with a queue\n  place value in the first open child slot`,
  bst: `insert(node, value):\n  if node is empty: return new node\n  if value < node.value: node.left = insert(node.left, value)\n  if value > node.value: node.right = insert(node.right, value)\n  return node`,
  avl: `insertAVL(node, value):\n  insert like a BST\n  update node.height\n  balance = height(left) - height(right)\n  rotate when |balance| > 1`,
  trie: `insert(word):\n  node = root\n  for each character:\n    create missing child\n    move into that child\n  mark the final node as end = true`,
  segment: `query(node, left, right):\n  if range is outside: return 0\n  if range is fully covered: return tree[node]\n  split around mid and combine left + right`,
};

const treeDescriptors = {
  binary: {
    label: "Binary Tree",
    summary: "Level-order insertion keeps the tree filled from left to right, making the queue order the important story.",
    complexity: "Insert O(n), Search O(n), Delete O(n)",
    inputHint: "Use numeric values. Insert walks breadth-first until it finds the first open child slot.",
  },
  bst: {
    label: "Binary Search Tree",
    summary: "Every comparison decides a direction. Smaller values go left, larger values go right, so every search is a guided walk.",
    complexity: "Average O(log n), Worst O(n)",
    inputHint: "Use numeric values. Each comparison narrows the path and keeps the structure ordered.",
  },
  avl: {
    label: "AVL Tree",
    summary: "AVL trees keep BST ordering while rebalancing after updates, so the key animation is path-following plus rotation recovery.",
    complexity: "Search/Insert/Delete O(log n)",
    inputHint: "Use numeric values. Watch for inserts or deletes that trigger rotations to restore balance.",
  },
  trie: {
    label: "Trie",
    summary: "Tries store words letter by letter. The meaningful iteration is the prefix journey, not a numeric comparison.",
    complexity: "Insert/Search/Delete O(k)",
    inputHint: "Use lowercase words. Each step advances one character deeper into the prefix tree.",
  },
  segment: {
    label: "Segment Tree",
    summary: "Segment trees precompute interval sums. Queries and updates show which ranges are skipped, split, or fully reused.",
    complexity: "Build O(n), Query O(log n), Update O(log n)",
    inputHint: "Enter comma-separated integers, then use the left/right inputs for a range or update index.",
  },
};

const cloneTreeNode = (root) => (root ? clone(root) : null);

const countTreeNodes = (root) => {
  if (!root) return 0;
  return 1 + countTreeNodes(root.left) + countTreeNodes(root.right);
};

const countLeaves = (root) => {
  if (!root) return 0;
  if (!root.left && !root.right) return 1;
  return countLeaves(root.left) + countLeaves(root.right);
};

const treeHeight = (root) => {
  if (!root) return 0;
  return 1 + Math.max(treeHeight(root.left), treeHeight(root.right));
};

const listNodesWithPaths = (root, path = "root", nodes = []) => {
  if (!root) return nodes;
  nodes.push({ path, value: root.value });
  listNodesWithPaths(root.left, `${path}-L`, nodes);
  listNodesWithPaths(root.right, `${path}-R`, nodes);
  return nodes;
};

const mapValueToPath = (root) => {
  const lookup = new Map();
  listNodesWithPaths(root).forEach((node) => {
    if (!lookup.has(node.value)) {
      lookup.set(node.value, node.path);
    }
  });
  return lookup;
};

const collectBstTrace = (root, value) => {
  const trace = [];
  let current = root;
  let path = "root";
  while (current) {
    trace.push({ path, value: current.value });
    if (current.value === value) break;
    if (value < current.value) {
      current = current.left;
      path = `${path}-L`;
    } else {
      current = current.right;
      path = `${path}-R`;
    }
  }
  return trace;
};

const collectBinarySearchTrace = (root, value) => {
  if (!root) return [];
  const trace = [];
  const queue = [{ node: root, path: "root" }];
  while (queue.length) {
    const current = queue.shift();
    trace.push({ path: current.path, value: current.node.value });
    if (current.node.value === value) break;
    if (current.node.left) queue.push({ node: current.node.left, path: `${current.path}-L` });
    if (current.node.right) queue.push({ node: current.node.right, path: `${current.path}-R` });
  }
  return trace;
};

const collectBinaryInsertTrace = (root) => {
  if (!root) return { visited: [], insertionPath: "root" };
  const queue = [{ node: root, path: "root" }];
  const visited = [];
  while (queue.length) {
    const current = queue.shift();
    visited.push({ path: current.path, value: current.node.value });
    if (!current.node.left) return { visited, insertionPath: `${current.path}-L` };
    if (!current.node.right) return { visited, insertionPath: `${current.path}-R` };
    queue.push({ node: current.node.left, path: `${current.path}-L` });
    queue.push({ node: current.node.right, path: `${current.path}-R` });
  }
  return { visited, insertionPath: "root" };
};

const collectTraversalTrace = (root, kind) => {
  const output = [];
  const dfs = (node, path) => {
    if (!node) return;
    if (kind === "preorder") output.push({ path, value: node.value });
    dfs(node.left, `${path}-L`);
    if (kind === "inorder") output.push({ path, value: node.value });
    dfs(node.right, `${path}-R`);
    if (kind === "postorder") output.push({ path, value: node.value });
  };

  if (kind === "levelorder") {
    const queue = root ? [{ node: root, path: "root" }] : [];
    while (queue.length) {
      const current = queue.shift();
      output.push({ path: current.path, value: current.node.value });
      if (current.node.left) queue.push({ node: current.node.left, path: `${current.path}-L` });
      if (current.node.right) queue.push({ node: current.node.right, path: `${current.path}-R` });
    }
    return output;
  }

  dfs(root, "root");
  return output;
};

const collectTrieTrace = (root, word) => {
  const trace = [];
  let current = root;
  let prefix = "";
  let complete = true;
  for (const character of word) {
    prefix += character;
    const next = current.children[character];
    trace.push({ character, prefix, exists: Boolean(next) });
    if (!next) {
      complete = false;
      break;
    }
    current = next;
  }
  return { trace, found: complete && !!current?.end && trace.length === word.length };
};

const rangeIndices = (left, right) => {
  const output = [];
  for (let index = left; index <= right; index += 1) output.push(index);
  return output;
};

const buildSegmentQueryTrace = (arr, tree, queryLeft, queryRight) => {
  const steps = [];
  const visit = (index, left, right) => {
    if (queryRight < left || right < queryLeft) {
      steps.push({ index, left, right, status: "skip", activeIndices: [] });
      return 0;
    }
    if (queryLeft <= left && right <= queryRight) {
      steps.push({ index, left, right, status: "take", subtotal: tree[index], activeIndices: rangeIndices(left, right) });
      return tree[index];
    }
    steps.push({ index, left, right, status: "split", activeIndices: rangeIndices(Math.max(left, queryLeft), Math.min(right, queryRight)) });
    const mid = Math.floor((left + right) / 2);
    return visit(index * 2, left, mid) + visit(index * 2 + 1, mid + 1, right);
  };
  const result = arr.length ? visit(1, 0, arr.length - 1) : 0;
  return { steps, result };
};

const buildSegmentUpdateTrace = (arr, index) => {
  const steps = [];
  const visit = (nodeIndex, left, right) => {
    steps.push({ index: nodeIndex, left, right, status: left === right ? "write" : "descend", activeIndices: [index] });
    if (left === right) return;
    const mid = Math.floor((left + right) / 2);
    if (index <= mid) visit(nodeIndex * 2, left, mid);
    else visit(nodeIndex * 2 + 1, mid + 1, right);
  };
  if (arr.length) visit(1, 0, arr.length - 1);
  return steps;
};

const binarySearch = (root, value) => collectBinarySearchTrace(root, value).at(-1)?.value === value;

const binaryDelete = (root, value) => {
  if (!root) return null;
  const queue = [{ node: root, path: "root", parent: null }];
  let target = null;
  let deepest = null;
  while (queue.length) {
    const current = queue.shift();
    if (current.node.value === value && !target) target = current;
    deepest = current;
    if (current.node.left) queue.push({ node: current.node.left, path: `${current.path}-L`, parent: current });
    if (current.node.right) queue.push({ node: current.node.right, path: `${current.path}-R`, parent: current });
  }
  if (!target) return root;
  if (!deepest || deepest.path === "root") return null;
  target.node.value = deepest.node.value;
  if (deepest.parent?.node.left === deepest.node) deepest.parent.node.left = null;
  if (deepest.parent?.node.right === deepest.node) deepest.parent.node.right = null;
  return root;
};

const stepStats = (snapshot, stepIndex) => {
  const state = snapshot.internalState || {};
  const visitedNodes = state.visitedNodes?.length || state.activePrefix?.length || state.activeSegmentNodes?.length || state.activeSegmentIndices?.length || 0;
  return {
    executionSteps: stepIndex + 1,
    comparisons: state.comparisons ?? Math.max(visitedNodes - 1, 0),
    swaps: state.writes ?? state.rotationNodes?.length ?? 0,
    visitedNodes,
    frontierPeak: state.frontierPeak ?? (snapshot.treeRoot ? treeHeight(snapshot.treeRoot) : 0),
  };
};

const hydrateSnapshots = (snapshots, baseIndex) => snapshots.map((snapshot, offset) => ({
  ...snapshot,
  stats: stepStats(snapshot, baseIndex + offset),
}));

const createInitialSession = (type) => {
  const descriptor = treeDescriptors[type];
  const baseTrie = createTrie();
  const baseTree = buildSegmentTree(DEFAULT_SEGMENT_VALUES);
  return {
    treeRoot: null,
    trieRoot: baseTrie,
    segmentArr: [...DEFAULT_SEGMENT_VALUES],
    segmentTree: baseTree,
    traversalText: EMPTY_TRAVERSAL_TEXT,
    history: hydrateSnapshots([
      {
        action: `${descriptor.label} ready`,
        narrative: descriptor.summary,
        treeRoot: null,
        trieRoot: baseTrie,
        segmentArr: [...DEFAULT_SEGMENT_VALUES],
        segmentTree: baseTree,
        traversalText: EMPTY_TRAVERSAL_TEXT,
        internalState: { mode: "idle", focusNodes: [], visitedNodes: [], activePrefix: [], activeSegmentNodes: [], activeSegmentIndices: [] },
      },
    ], 0),
  };
};

const uniqueList = (items) => Array.from(new Set(items.filter(Boolean)));

export default function TreePage() {
  const initialSession = useMemo(() => createInitialSession("bst"), []);
  const [treeType, setTreeType] = useState("bst");
  const [valueInput, setValueInput] = useState("50");
  const [wordInput, setWordInput] = useState("graph");
  const [segmentInput, setSegmentInput] = useState(DEFAULT_SEGMENT_VALUES.join(","));
  const [rangeLeft, setRangeLeft] = useState("0");
  const [rangeRight, setRangeRight] = useState("3");
  const [treeRoot, setTreeRoot] = useState(initialSession.treeRoot);
  const [trieRoot, setTrieRoot] = useState(initialSession.trieRoot);
  const [segmentArr, setSegmentArr] = useState(initialSession.segmentArr);
  const [segmentTree, setSegmentTree] = useState(initialSession.segmentTree);
  const [history, setHistory] = useState(initialSession.history);
  const [traversalText, setTraversalText] = useState(initialSession.traversalText);

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();
  const playback = usePlayback({ steps: history, speed: globalSpeed, shortcutsEnabled });
  const { jumpToStep } = playback;
  const treeDescriptor = treeDescriptors[treeType];
  const isNodeTree = ["binary", "bst", "avl"].includes(treeType);

  const buildSnapshot = ({
    action,
    narrative,
    treeRoot: nextTreeRoot = treeRoot,
    trieRoot: nextTrieRoot = trieRoot,
    segmentArr: nextSegmentArr = segmentArr,
    segmentTree: nextSegmentTree = segmentTree,
    traversalText: nextTraversalText = traversalText,
    internalState = {},
  }) => ({
    action,
    narrative,
    treeRoot: cloneTreeNode(nextTreeRoot),
    trieRoot: clone(nextTrieRoot),
    segmentArr: clone(nextSegmentArr),
    segmentTree: clone(nextSegmentTree),
    traversalText: nextTraversalText,
    internalState,
  });

  const appendSnapshots = (snapshots) => {
    setHistory((previous) => [...previous, ...hydrateSnapshots(snapshots, previous.length)]);
  };

  useEffect(() => {
    const session = createInitialSession(treeType);
    setTreeRoot(session.treeRoot);
    setTrieRoot(session.trieRoot);
    setSegmentArr(session.segmentArr);
    setSegmentTree(session.segmentTree);
    setTraversalText(session.traversalText);
    setHistory(session.history);
  }, [treeType]);

  useEffect(() => {
    if (history.length > 0) jumpToStep(history.length - 1);
  }, [history.length, jumpToStep]);

  const activeStep = history[playback.currentStep] || history.at(-1) || initialSession.history[0];
  const layout = useMemo(() => treeToLayout(activeStep.treeRoot), [activeStep.treeRoot]);
  const words = useMemo(() => trieWords(activeStep.trieRoot || createTrie()), [activeStep.trieRoot]);

  const structureMetrics = useMemo(() => {
    if (isNodeTree) {
      return [
        { label: "Nodes", value: countTreeNodes(activeStep.treeRoot) },
        { label: "Height", value: treeHeight(activeStep.treeRoot) },
        { label: "Leaves", value: countLeaves(activeStep.treeRoot) },
      ];
    }
    if (treeType === "trie") {
      return [
        { label: "Words", value: words.length },
        { label: "Prefix Depth", value: activeStep.internalState?.activePrefix?.length || 0 },
        { label: "Current Word", value: activeStep.internalState?.activeWord || "-" },
      ];
    }
    return [
      { label: "Array Length", value: activeStep.segmentArr.length },
      { label: "Tree Nodes", value: activeStep.segmentTree.filter((value, index) => index > 0 && value !== 0).length },
      { label: "Last Result", value: activeStep.internalState?.result ?? "-" },
    ];
  }, [activeStep, isNodeTree, treeType, words.length]);

  const recentIterations = useMemo(() => {
    const start = Math.max(0, playback.currentStep - 4);
    return history.slice(start, playback.currentStep + 1).reverse();
  }, [history, playback.currentStep]);

  const randomFill = () => {
    if (!isNodeTree) return;
    let nextRoot = null;
    const values = Array.from({ length: 8 }, () => Math.floor(Math.random() * 90) + 10);
    values.forEach((value) => {
      if (treeType === "binary") nextRoot = binaryInsertLevel(nextRoot, value);
      if (treeType === "bst") nextRoot = bstInsert(nextRoot, value);
      if (treeType === "avl") nextRoot = avlInsert(nextRoot, value);
    });
    setTreeRoot(nextRoot);
    setTraversalText(`Seeded values: ${values.join(" -> ")}`);
    appendSnapshots([
      buildSnapshot({
        action: "Generated random tree",
        treeRoot: nextRoot,
        traversalText: `Seeded values: ${values.join(" -> ")}`,
        narrative: `Inserted ${values.length} random values to create a fresh ${treeDescriptor.label.toLowerCase()} playground.`,
        internalState: {
          mode: "seed",
          newNodes: uniqueList(listNodesWithPaths(nextRoot).map((node) => node.path)),
          resultNodes: ["root"],
          comparisons: values.length,
          writes: values.length,
        },
      }),
    ]);
    toast.success("Random tree generated");
  };

  const applyInsert = () => {
    if (treeType === "trie") {
      const word = wordInput.trim().toLowerCase();
      if (!word) {
        toast.error("Enter a word first");
        return;
      }
      const { trace } = collectTrieTrace(trieRoot, word);
      const nextTrie = trieInsert(clone(trieRoot), word);
      setTrieRoot(nextTrie);
      const snapshots = trace.map((step, index) => buildSnapshot({
        action: `Process '${step.character}' in '${word}'`,
        trieRoot: nextTrie,
        narrative: step.exists ? `Prefix '${step.prefix}' already exists, so the insert reuses that branch.` : `Prefix '${step.prefix}' did not exist, so a new branch is created here.`,
        internalState: { mode: "insert", activeWord: word, activePrefix: step.prefix.split(""), comparisons: index + 1, writes: step.exists ? 0 : 1 },
      }));
      snapshots.push(buildSnapshot({
        action: `Inserted '${word}' in Trie`,
        trieRoot: nextTrie,
        narrative: `The word now ends on its own terminal node, so future searches can stop exactly at '${word}'.`,
        internalState: { mode: "insert", activeWord: word, activePrefix: word.split(""), found: true, comparisons: word.length, writes: 1 },
      }));
      appendSnapshots(snapshots);
      toast.success("Word inserted into Trie");
      return;
    }

    if (treeType === "segment") {
      const values = segmentInput.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item));
      if (!values.length) {
        toast.error("Enter valid comma-separated numbers");
        return;
      }
      const nextTree = buildSegmentTree(values);
      setSegmentArr(values);
      setSegmentTree(nextTree);
      setTraversalText(`Range-ready array: ${values.join(" -> ")}`);
      appendSnapshots([
        buildSnapshot({
          action: "Parsed input array",
          segmentArr: values,
          segmentTree: nextTree,
          traversalText: `Range-ready array: ${values.join(" -> ")}`,
          narrative: "The values are normalized first so the tree knows exactly which leaves it needs.",
          internalState: { mode: "build", activeSegmentIndices: values.map((_, index) => index), comparisons: values.length },
        }),
        buildSnapshot({
          action: "Segment tree rebuilt from input array",
          segmentArr: values,
          segmentTree: nextTree,
          traversalText: `Range-ready array: ${values.join(" -> ")}`,
          narrative: "Every internal node now caches the sum of its interval, which makes future range queries efficient.",
          internalState: { mode: "build", activeSegmentNodes: [1], resultSegmentNodes: [1], activeSegmentIndices: values.map((_, index) => index), comparisons: values.length, writes: values.length },
        }),
      ]);
      toast.success("Segment tree rebuilt");
      return;
    }

    const value = Number(valueInput);
    if (!Number.isFinite(value)) {
      toast.error("Enter a valid number");
      return;
    }

    let nextRoot = cloneTreeNode(treeRoot);
    let trace = [];
    let insertedPath = "root";
    let narrative = "";
    let rotationNodes = [];

    if (treeType === "binary") {
      const insertTrace = collectBinaryInsertTrace(treeRoot);
      trace = insertTrace.visited;
      insertedPath = insertTrace.insertionPath;
      nextRoot = binaryInsertLevel(nextRoot, value);
      narrative = trace.length
        ? `Binary trees insert by scanning level by level. After checking ${trace.length} existing node${trace.length === 1 ? "" : "s"}, the first open slot accepted ${value}.`
        : `The tree was empty, so ${value} became the root immediately.`;
    } else {
      trace = collectBstTrace(treeRoot, value);
      nextRoot = treeType === "bst" ? bstInsert(nextRoot, value) : avlInsert(nextRoot, value);
      insertedPath = collectBstTrace(nextRoot, value).at(-1)?.path || "root";
      if (treeType === "avl") {
        const beforePaths = mapValueToPath(treeRoot);
        const afterPaths = mapValueToPath(nextRoot);
        rotationNodes = uniqueList(Array.from(afterPaths.entries()).filter(([nodeValue, path]) => beforePaths.has(nodeValue) && beforePaths.get(nodeValue) !== path).map(([, path]) => path));
      }
      narrative = rotationNodes.length
        ? "The insert followed BST ordering first, then AVL rotations restored the height balance."
        : `Each comparison narrowed the path until ${value} found the first valid ordered position.`;
    }

    const snapshots = trace.map((step, index) => buildSnapshot({
      action: `Inspect node ${step.value}`,
      narrative: treeType === "binary"
        ? `Level-order insertion checks node ${step.value} before moving to the next breadth-first position.`
        : `${value < step.value ? `${value} is smaller than ${step.value}, so the walk goes left.` : `${value} is greater than ${step.value}, so the walk goes right.`}`,
      internalState: { mode: "insert", query: value, focusNodes: [step.path], visitedNodes: trace.slice(0, index + 1).map((item) => item.path), comparisons: index + 1 },
    }));

    snapshots.push(buildSnapshot({
      action: `Inserted ${value} in ${treeDescriptor.label}`,
      treeRoot: nextRoot,
      narrative,
      internalState: { mode: "insert", query: value, focusNodes: [insertedPath], resultNodes: [insertedPath], newNodes: [insertedPath], visitedNodes: trace.map((item) => item.path), rotationNodes, comparisons: trace.length, writes: 1 + rotationNodes.length },
    }));

    setTreeRoot(nextRoot);
    appendSnapshots(snapshots);
    toast.success(`Inserted ${value}`);
  };

  const applyDelete = () => {
    if (treeType === "trie") {
      const word = wordInput.trim().toLowerCase();
      if (!word) {
        toast.error("Enter a word first");
        return;
      }
      const { trace, found } = collectTrieTrace(trieRoot, word);
      const nextTrie = trieDelete(clone(trieRoot), word);
      setTrieRoot(nextTrie);
      const snapshots = trace.map((step, index) => buildSnapshot({
        action: `Review prefix '${step.prefix}'`,
        trieRoot,
        narrative: step.exists ? `Prefix '${step.prefix}' exists, so deletion can continue deeper.` : `The branch for '${step.prefix}' is missing, so nothing can be removed beyond this point.`,
        internalState: { mode: "delete", activeWord: word, activePrefix: step.prefix.split(""), found: step.exists, comparisons: index + 1 },
      }));
      snapshots.push(buildSnapshot({
        action: found ? `Deleted '${word}' from Trie` : `Could not delete '${word}'`,
        trieRoot: nextTrie,
        narrative: found ? `The terminal marker for '${word}' was cleared, and any empty suffix branches were pruned.` : `Deletion stopped because the full word path was not present as a complete stored word.`,
        internalState: { mode: "delete", activeWord: word, activePrefix: word.split(""), found, comparisons: Math.max(trace.length, 1), writes: found ? 1 : 0 },
      }));
      appendSnapshots(snapshots);
      toast.success(found ? "Word deleted" : "Word not found");
      return;
    }

    if (treeType === "segment") {
      const index = Number(rangeLeft);
      const value = Number(valueInput);
      if (!Number.isFinite(index) || !Number.isFinite(value) || index < 0 || index >= segmentArr.length) {
        toast.error("Provide a valid index and numeric value");
        return;
      }
      const trace = buildSegmentUpdateTrace(segmentArr, index);
      const updated = segmentUpdate(segmentArr, segmentTree, index, value);
      setSegmentArr(updated.arr);
      setSegmentTree(updated.tree);
      setTraversalText(`Updated index ${index} to ${value}`);
      const snapshots = trace.map((step, position) => buildSnapshot({
        action: step.status === "write" ? `Write leaf [${step.left}]` : `Descend into [${step.left}, ${step.right}]`,
        segmentArr,
        segmentTree,
        traversalText: `Updated index ${index} to ${value}`,
        narrative: step.status === "write" ? `The update reached the exact array slot, so the leaf value becomes ${value}.` : `Index ${index} lies inside interval [${step.left}, ${step.right}], so the update keeps descending.`,
        internalState: { mode: "update", activeSegmentNodes: [step.index], activeSegmentIndices: [index], comparisons: position + 1 },
      }));
      snapshots.push(buildSnapshot({
        action: `Updated index ${index} to ${value}`,
        segmentArr: updated.arr,
        segmentTree: updated.tree,
        traversalText: `Updated index ${index} to ${value}`,
        narrative: "Every node on the path back to the root now reflects the new interval sum.",
        internalState: { mode: "update", activeSegmentNodes: trace.map((step) => step.index), resultSegmentNodes: [1], activeSegmentIndices: [index], comparisons: trace.length, writes: trace.length },
      }));
      appendSnapshots(snapshots);
      toast.success("Segment tree updated");
      return;
    }

    const value = Number(valueInput);
    if (!Number.isFinite(value)) {
      toast.error("Enter a valid number");
      return;
    }
    const trace = treeType === "binary" ? collectBinarySearchTrace(treeRoot, value) : collectBstTrace(treeRoot, value);
    const found = trace.at(-1)?.value === value;
    let nextRoot = cloneTreeNode(treeRoot);
    let rotationNodes = [];
    if (found) {
      if (treeType === "binary") nextRoot = binaryDelete(nextRoot, value);
      if (treeType === "bst") nextRoot = bstDelete(nextRoot, value);
      if (treeType === "avl") nextRoot = avlDelete(nextRoot, value);
      if (treeType === "avl") {
        const beforePaths = mapValueToPath(treeRoot);
        const afterPaths = mapValueToPath(nextRoot);
        rotationNodes = uniqueList(Array.from(afterPaths.entries()).filter(([nodeValue, path]) => beforePaths.has(nodeValue) && beforePaths.get(nodeValue) !== path).map(([, path]) => path));
      }
    }
    const snapshots = trace.map((step, index) => buildSnapshot({
      action: `Inspect node ${step.value}`,
      narrative: treeType === "binary"
        ? "Deletion scans the tree breadth-first until it finds the target value."
        : value < step.value
          ? `${value} is smaller than ${step.value}, so deletion moves left.`
          : value > step.value
            ? `${value} is larger than ${step.value}, so deletion moves right.`
            : `${value} matches the current node, so the removal case can now be resolved.`,
      internalState: { mode: "delete", query: value, focusNodes: [step.path], visitedNodes: trace.slice(0, index + 1).map((item) => item.path), comparisons: index + 1 },
    }));
    snapshots.push(buildSnapshot({
      action: found ? `Deleted ${value} from ${treeDescriptor.label}` : `Search ended without ${value}`,
      treeRoot: found ? nextRoot : treeRoot,
      narrative: found
        ? rotationNodes.length ? "The target was removed and AVL rotations repaired the local imbalance." : "The target node was removed, and the remaining structure closed the gap."
        : `The walk ended at an empty path, so ${value} was never present to delete.`,
      internalState: { mode: "delete", query: value, visitedNodes: trace.map((item) => item.path), rotationNodes, comparisons: trace.length, writes: found ? 1 + rotationNodes.length : 0 },
    }));
    if (found) {
      setTreeRoot(nextRoot);
      toast.success(`Deleted ${value}`);
    } else {
      toast.info(`${value} was not present`);
    }
    appendSnapshots(snapshots);
  };

  const applySearch = () => {
    if (treeType === "trie") {
      const word = wordInput.trim().toLowerCase();
      if (!word) {
        toast.error("Enter a word first");
        return;
      }
      const { trace, found } = collectTrieTrace(trieRoot, word);
      const snapshots = trace.map((step, index) => buildSnapshot({
        action: `Read prefix '${step.prefix}'`,
        narrative: step.exists ? `The branch for '${step.character}' exists, so the search can continue.` : `There is no branch for '${step.character}', so the word cannot be stored.`,
        internalState: { mode: "search", activeWord: word, activePrefix: step.prefix.split(""), found: step.exists, comparisons: index + 1 },
      }));
      snapshots.push(buildSnapshot({
        action: `Search '${word}': ${found ? "Found" : "Not Found"}`,
        narrative: found ? `The final prefix node is marked as a complete word, so '${word}' is a successful hit.` : `The prefix path stopped early or never reached a terminal marker, so '${word}' is not stored.`,
        internalState: { mode: "search", activeWord: word, activePrefix: word.split(""), found, comparisons: Math.max(trace.length, 1) },
      }));
      appendSnapshots(snapshots);
      toast.success(found ? "Word found" : "Word not found");
      return;
    }

    if (treeType === "segment") {
      const left = Number(rangeLeft);
      const right = Number(rangeRight);
      if (left > right || left < 0 || right >= segmentArr.length) {
        toast.error("Invalid range");
        return;
      }
      const queryTrace = buildSegmentQueryTrace(segmentArr, segmentTree, left, right);
      const result = segmentQuery(segmentArr, segmentTree, left, right);
      setTraversalText(`Range sum [${left}, ${right}] = ${result}`);
      const snapshots = queryTrace.steps.map((step, index) => buildSnapshot({
        traversalText: `Range sum [${left}, ${right}] = ${result}`,
        action: `${step.status === "take" ? "Use" : step.status === "skip" ? "Skip" : "Split"} interval [${step.left}, ${step.right}]`,
        narrative: step.status === "take"
          ? `Interval [${step.left}, ${step.right}] is fully covered, so its stored sum can be reused directly.`
          : step.status === "skip"
            ? `Interval [${step.left}, ${step.right}] is outside the query range, so it contributes nothing.`
            : `Interval [${step.left}, ${step.right}] overlaps partially, so the query splits into its children.`,
        internalState: { mode: "query", left, right, result, activeSegmentNodes: [step.index], activeSegmentIndices: step.activeIndices, comparisons: index + 1 },
      }));
      snapshots.push(buildSnapshot({
        action: `Range Query [${left}, ${right}] = ${result}`,
        traversalText: `Range sum [${left}, ${right}] = ${result}`,
        narrative: "The query finished after combining fully covered ranges and skipping the untouched intervals.",
        internalState: { mode: "query", left, right, result, activeSegmentNodes: queryTrace.steps.map((step) => step.index), resultSegmentNodes: queryTrace.steps.filter((step) => step.status === "take").map((step) => step.index), activeSegmentIndices: rangeIndices(left, right), comparisons: queryTrace.steps.length },
      }));
      appendSnapshots(snapshots);
      toast.success(`Range sum = ${result}`);
      return;
    }

    const value = Number(valueInput);
    if (!Number.isFinite(value)) {
      toast.error("Enter a valid number");
      return;
    }
    const trace = treeType === "binary" ? collectBinarySearchTrace(treeRoot, value) : collectBstTrace(treeRoot, value);
    const found = treeType === "binary" ? binarySearch(treeRoot, value) : trace.at(-1)?.value === value;
    const snapshots = trace.map((step, index) => buildSnapshot({
      action: `Visit node ${step.value}`,
      narrative: treeType === "binary"
        ? `Binary tree search checks each node in breadth-first order until it either finds ${value} or runs out of candidates.`
        : value < step.value
          ? `${value} is smaller than ${step.value}, so the ordered search moves left.`
          : value > step.value
            ? `${value} is larger than ${step.value}, so the ordered search moves right.`
            : `${value} matches the current node, so the search is complete.`,
      internalState: { mode: "search", query: value, focusNodes: [step.path], visitedNodes: trace.slice(0, index + 1).map((item) => item.path), comparisons: index + 1 },
    }));
    snapshots.push(buildSnapshot({
      action: `Search ${value}: ${found ? "Found" : "Not Found"}`,
      narrative: found ? `${value} was found exactly where the search path converged.` : `The search exhausted its valid path, so ${value} does not exist in the current structure.`,
      internalState: { mode: "search", query: value, found, visitedNodes: trace.map((item) => item.path), resultNodes: found && trace.length ? [trace.at(-1).path] : [], comparisons: trace.length },
    }));
    appendSnapshots(snapshots);
    toast.success(found ? "Node found" : "Node not found");
  };

  const runTraversal = (kind) => {
    if (!isNodeTree) return;
    const order = collectTraversalTrace(treeRoot, kind);
    const snapshots = order.map((step, index) => {
      const partial = order.slice(0, index + 1).map((item) => item.value).join(" -> ");
      return buildSnapshot({
        action: `${kind} visit ${step.value}`,
        traversalText: partial || "(empty)",
        narrative: `Traversal ${kind} emits node ${step.value} as item ${index + 1}, extending the output sequence one step at a time.`,
        internalState: { mode: "traversal", traversal: kind, focusNodes: [step.path], resultNodes: [step.path], visitedNodes: order.slice(0, index + 1).map((item) => item.path), comparisons: index + 1 },
      });
    });
    const fullTraversal = order.length ? order.map((step) => step.value).join(" -> ") : "(empty)";
    setTraversalText(fullTraversal);
    appendSnapshots(snapshots.length ? snapshots : [buildSnapshot({ action: `${kind} traversal`, traversalText: "(empty)", narrative: "The tree is empty, so the traversal produces no output.", internalState: { mode: "traversal", traversal: kind } })]);
  };

  return (
    <PageMotionWrapper testId="tree-page">
      <Card className="border-border/70 bg-card/70" data-testid="tree-header-card">
        <CardHeader className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="tree-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="tree-page-title">Tree Visualizer</CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground" data-testid="tree-page-subtitle">
                Rich playback for Binary Tree, BST, AVL, Trie, and Segment Tree operations with animated focus states,
                narrated iterations, and on-demand explanations.
              </p>
            </div>
            <StepGuideDrawer algorithm={treeDescriptor.label} currentStep={playback.currentStep} action={activeStep.action} complexity={treeDescriptor.complexity} internalState={activeStep.internalState} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-testid="tree-config-controls">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Tree Type</p>
              <Select value={treeType} onValueChange={setTreeType}>
                <SelectTrigger data-testid="tree-type-select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {treeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`tree-type-option-${option.value}`}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Value Input</p>
              <Input value={valueInput} onChange={(event) => setValueInput(event.target.value)} placeholder="Numeric value" data-testid="tree-value-input" />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Trie Word</p>
              <Input value={wordInput} onChange={(event) => setWordInput(event.target.value)} placeholder="Word for Trie" data-testid="tree-word-input" />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Segment Array</p>
              <Input value={segmentInput} onChange={(event) => setSegmentInput(event.target.value)} placeholder="Segment array" data-testid="tree-segment-array-input" />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button type="button" className="rounded-full" onClick={randomFill} disabled={!isNodeTree} data-testid="tree-random-fill-button">Random Fill</Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{treeDescriptor.inputHint}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" data-testid="tree-operation-buttons">
            <Button type="button" onClick={applyInsert} className="rounded-full" data-testid="tree-insert-button"><Plus className="h-4 w-4" /> Insert / Build</Button>
            <Button type="button" variant="outline" onClick={applyDelete} className="rounded-full" data-testid="tree-delete-button"><Trash2 className="h-4 w-4" /> Delete / Update</Button>
            <Button type="button" variant="outline" onClick={applySearch} className="rounded-full" data-testid="tree-search-button"><Search className="h-4 w-4" /> Search / Query</Button>
            <Input value={rangeLeft} onChange={(event) => setRangeLeft(event.target.value)} className="h-9 w-20" data-testid="tree-range-left-input" />
            <Input value={rangeRight} onChange={(event) => setRangeRight(event.target.value)} className="h-9 w-20" data-testid="tree-range-right-input" />
          </div>

          <div className="flex flex-wrap gap-2" data-testid="tree-traversal-buttons">
            <Button type="button" variant="secondary" disabled={!isNodeTree} onClick={() => runTraversal("preorder")} data-testid="tree-preorder-button">Preorder</Button>
            <Button type="button" variant="secondary" disabled={!isNodeTree} onClick={() => runTraversal("inorder")} data-testid="tree-inorder-button">Inorder</Button>
            <Button type="button" variant="secondary" disabled={!isNodeTree} onClick={() => runTraversal("postorder")} data-testid="tree-postorder-button">Postorder</Button>
            <Button type="button" variant="secondary" disabled={!isNodeTree} onClick={() => runTraversal("levelorder")} data-testid="tree-levelorder-button">Level Order</Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="tree-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="tree-visual-card">
            <CardHeader className="space-y-3">
              <CardTitle className="font-heading text-xl" data-testid="tree-current-action">{activeStep.action}</CardTitle>
              <AnimatePresence mode="wait">
                <motion.p key={`${playback.currentStep}-${activeStep.action}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-sm leading-relaxed text-muted-foreground">
                  {activeStep.narrative}
                </motion.p>
              </AnimatePresence>
            </CardHeader>
            <CardContent className="space-y-4">
              <TreeStage treeType={treeType} activeStep={activeStep} layout={layout} words={words} />
              <ControlCluster
                isPlaying={playback.isPlaying}
                onPlayToggle={() => playback.setIsPlaying((previous) => !previous)}
                onStepForward={playback.stepForward}
                onStepBack={playback.stepBack}
                onReset={playback.reset}
                speed={globalSpeed}
                onSpeedChange={setGlobalSpeed}
              />
              <TimelineSlider currentStep={playback.currentStep} maxStep={playback.maxStep} onChange={jumpToStep} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <StatsGrid stats={activeStep.stats} />
          <Card className="border-border/70 bg-card/70">
            <CardHeader><CardTitle className="font-heading text-base">Step Insight</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {structureMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 font-code text-lg font-semibold">{metric.value}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-2xl border border-border/70 bg-background/70 p-3 text-sm leading-relaxed text-muted-foreground">{activeStep.narrative}</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/70">
            <CardHeader><CardTitle className="font-heading text-base">Iteration Feed</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentIterations.map((item, index) => (
                <div key={`${item.action}-${index}`} className="rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Step {playback.currentStep - index}</p>
                  <p className="mt-1 text-sm font-semibold">{item.action}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.narrative}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/70" data-testid="tree-traversal-card">
            <CardHeader><CardTitle className="font-heading text-base" data-testid="tree-traversal-title">Traversal / Query Result</CardTitle></CardHeader>
            <CardContent>
              <p className="rounded-xl border border-border/60 bg-background/70 p-3 font-code text-xs leading-relaxed" data-testid="tree-traversal-result">{activeStep.traversalText}</p>
            </CardContent>
          </Card>
          <CodePanel title={`${treeDescriptor.label} Reference`} code={treeCode[treeType] || treeCode.bst} />
        </div>
      </section>
    </PageMotionWrapper>
  );
}
