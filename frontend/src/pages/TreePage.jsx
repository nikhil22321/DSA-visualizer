import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { AITutorDrawer } from "@/components/common/AITutorDrawer";
import { CodePanel } from "@/components/common/CodePanel";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { usePlayback } from "@/hooks/usePlayback";
import { useAppStore } from "@/store/useAppStore";
import {
  avlDelete,
  avlInsert,
  binaryInsertLevel,
  bstDelete,
  bstInsert,
  bstSearch,
  buildSegmentTree,
  clone,
  createTrie,
  segmentQuery,
  segmentUpdate,
  traversals,
  treeToLayout,
  trieDelete,
  trieInsert,
  trieSearch,
  trieWords,
} from "@/utils/treeStructures";

const treeOptions = [
  { value: "binary", label: "Binary Tree" },
  { value: "bst", label: "Binary Search Tree" },
  { value: "avl", label: "AVL Tree" },
  { value: "trie", label: "Trie" },
  { value: "segment", label: "Segment Tree" },
];

const treeCode = {
  bst: `insert(node, value):\n  if not node: return new Node(value)\n  if value < node.value: node.left = insert(node.left, value)\n  if value > node.value: node.right = insert(node.right, value)\n  return node`,
  avl: `insert AVL:\n  BST insert\n  update height\n  balance factor = h(left)-h(right)\n  rotate if |bf| > 1`,
  trie: `insert(word):\n  for char in word:\n    if char not in node.children: create\n    node = node.children[char]\n  node.end = true`,
  segment: `build(node,l,r):\n  if l==r: tree[node]=arr[l]\n  else tree[node]=left+right\nquery range recursively`,
};

const statsFromHistory = (history) => ({
  executionSteps: history.length,
  comparisons: Math.max(0, history.length - 1),
  swaps: 0,
  visitedNodes: history.length,
  frontierPeak: 0,
});

const binarySearch = (root, value) => {
  const queue = root ? [root] : [];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.value === value) return true;
    if (cur.left) queue.push(cur.left);
    if (cur.right) queue.push(cur.right);
  }
  return false;
};

const binaryDelete = (root, value) => {
  if (!root) return null;
  const queue = [root];
  let target = null;
  let last = null;
  let parentOfLast = null;
  while (queue.length) {
    const cur = queue.shift();
    if (cur.value === value) target = cur;
    if (cur.left) {
      parentOfLast = cur;
      last = cur.left;
      queue.push(cur.left);
    }
    if (cur.right) {
      parentOfLast = cur;
      last = cur.right;
      queue.push(cur.right);
    }
  }
  if (!target) return root;
  if (!last) return null;
  target.value = last.value;
  if (parentOfLast?.left === last) parentOfLast.left = null;
  if (parentOfLast?.right === last) parentOfLast.right = null;
  return root;
};

export default function TreePage() {
  const [treeType, setTreeType] = useState("bst");
  const [valueInput, setValueInput] = useState("50");
  const [wordInput, setWordInput] = useState("graph");
  const [segmentInput, setSegmentInput] = useState("5,1,3,7,2,6,4,8");
  const [rangeLeft, setRangeLeft] = useState("0");
  const [rangeRight, setRangeRight] = useState("3");

  const [treeRoot, setTreeRoot] = useState(null);
  const [trieRoot, setTrieRoot] = useState(createTrie());
  const [segmentArr, setSegmentArr] = useState([5, 1, 3, 7, 2, 6, 4, 8]);
  const [segmentTree, setSegmentTree] = useState(buildSegmentTree([5, 1, 3, 7, 2, 6, 4, 8]));
  const [history, setHistory] = useState([]);
  const [traversalText, setTraversalText] = useState("No traversal yet");

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();
  const playback = usePlayback({ steps: history, speed: globalSpeed, shortcutsEnabled });

  const pushHistory = (action, payload = {}) => {
    const snapshot = {
      action,
      treeRoot: clone(payload.treeRoot ?? treeRoot),
      trieRoot: clone(payload.trieRoot ?? trieRoot),
      segmentArr: clone(payload.segmentArr ?? segmentArr),
      segmentTree: clone(payload.segmentTree ?? segmentTree),
      traversalText: payload.traversalText ?? traversalText,
      internalState: payload.internalState || {},
      stats: statsFromHistory([...history, {}]),
    };
    setHistory((prev) => [...prev, snapshot]);
  };

  useEffect(() => {
    setTreeRoot(null);
    setTrieRoot(createTrie());
    setSegmentArr([5, 1, 3, 7, 2, 6, 4, 8]);
    setSegmentTree(buildSegmentTree([5, 1, 3, 7, 2, 6, 4, 8]));
    setTraversalText("No traversal yet");
    setHistory([
      {
        action: `${treeType.toUpperCase()} initialized`,
        treeRoot: null,
        trieRoot: createTrie(),
        segmentArr: [5, 1, 3, 7, 2, 6, 4, 8],
        segmentTree: buildSegmentTree([5, 1, 3, 7, 2, 6, 4, 8]),
        traversalText: "No traversal yet",
        internalState: {},
        stats: statsFromHistory([{}]),
      },
    ]);
  }, [treeType]);

  useEffect(() => {
    if (history.length > 0) {
      playback.jumpToStep(history.length - 1);
    }
  }, [history.length]);

  const activeStep = history[playback.currentStep] || history[0] || {
    action: "Ready",
    treeRoot,
    trieRoot,
    segmentArr,
    segmentTree,
    stats: statsFromHistory(history),
    traversalText,
    internalState: {},
  };

  const layout = useMemo(() => treeToLayout(activeStep.treeRoot), [activeStep.treeRoot]);
  const words = useMemo(() => trieWords(activeStep.trieRoot || createTrie()), [activeStep.trieRoot]);

  const applyInsert = () => {
    if (treeType === "trie") {
      const word = wordInput.trim().toLowerCase();
      if (!word) return;
      const nextTrie = trieInsert(clone(trieRoot), word);
      setTrieRoot(nextTrie);
      pushHistory(`Inserted word '${word}' in Trie`, { trieRoot: nextTrie });
      toast.success("Word inserted into Trie");
      return;
    }
    if (treeType === "segment") {
      const values = segmentInput
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((n) => Number.isFinite(n));
      if (!values.length) {
        toast.error("Enter valid comma-separated numbers");
        return;
      }
      const tree = buildSegmentTree(values);
      setSegmentArr(values);
      setSegmentTree(tree);
      pushHistory("Segment tree rebuilt from input array", { segmentArr: values, segmentTree: tree });
      toast.success("Segment tree rebuilt");
      return;
    }

    const value = Number(valueInput);
    if (!Number.isFinite(value)) {
      toast.error("Enter a valid number");
      return;
    }
    let nextRoot = clone(treeRoot);
    if (treeType === "binary") nextRoot = binaryInsertLevel(nextRoot, value);
    if (treeType === "bst") nextRoot = bstInsert(nextRoot, value);
    if (treeType === "avl") nextRoot = avlInsert(nextRoot, value);
    setTreeRoot(nextRoot);
    pushHistory(`Inserted ${value} in ${treeType.toUpperCase()}`, { treeRoot: nextRoot });
    toast.success(`Inserted ${value}`);
  };

  const applyDelete = () => {
    if (treeType === "trie") {
      const word = wordInput.trim().toLowerCase();
      const nextTrie = trieDelete(clone(trieRoot), word);
      setTrieRoot(nextTrie);
      pushHistory(`Deleted word '${word}' from Trie`, { trieRoot: nextTrie });
      return;
    }
    if (treeType === "segment") {
      const index = Number(rangeLeft);
      const value = Number(valueInput);
      if (!Number.isFinite(index) || !Number.isFinite(value) || index < 0 || index >= segmentArr.length) {
        toast.error("Provide valid index and value");
        return;
      }
      const updated = segmentUpdate(segmentArr, segmentTree, index, value);
      setSegmentArr(updated.arr);
      setSegmentTree(updated.tree);
      pushHistory(`Updated index ${index} to ${value}`, {
        segmentArr: updated.arr,
        segmentTree: updated.tree,
      });
      return;
    }

    const value = Number(valueInput);
    if (!Number.isFinite(value)) return;
    let nextRoot = clone(treeRoot);
    if (treeType === "binary") nextRoot = binaryDelete(nextRoot, value);
    if (treeType === "bst") nextRoot = bstDelete(nextRoot, value);
    if (treeType === "avl") nextRoot = avlDelete(nextRoot, value);
    setTreeRoot(nextRoot);
    pushHistory(`Deleted ${value} from ${treeType.toUpperCase()}`, { treeRoot: nextRoot });
  };

  const applySearch = () => {
    if (treeType === "trie") {
      const word = wordInput.trim().toLowerCase();
      const found = trieSearch(trieRoot, word);
      pushHistory(`Search '${word}': ${found ? "Found" : "Not Found"}`, {
        internalState: { query: word, found },
      });
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
      const result = segmentQuery(segmentArr, segmentTree, left, right);
      pushHistory(`Range Query [${left}, ${right}] = ${result}`, {
        traversalText: `Range sum [${left}, ${right}] = ${result}`,
        internalState: { left, right, result },
      });
      return;
    }

    const value = Number(valueInput);
    if (!Number.isFinite(value)) return;
    const found = treeType === "binary" ? binarySearch(treeRoot, value) : bstSearch(treeRoot, value);
    pushHistory(`Search ${value}: ${found ? "Found" : "Not Found"}`, {
      internalState: { query: value, found },
    });
    toast.success(found ? "Node found" : "Node not found");
  };

  const runTraversal = (kind) => {
    if (!["binary", "bst", "avl"].includes(treeType)) return;
    const all = traversals(treeRoot);
    const result = (all[kind] || []).join(" → ");
    setTraversalText(result || "(empty)");
    pushHistory(`${kind} traversal`, { traversalText: result || "(empty)", internalState: { traversal: kind } });
  };

  const randomFill = () => {
    if (!["binary", "bst", "avl"].includes(treeType)) return;
    let next = null;
    Array.from({ length: 8 }, () => Math.floor(Math.random() * 90) + 10).forEach((v) => {
      if (treeType === "binary") next = binaryInsertLevel(next, v);
      if (treeType === "bst") next = bstInsert(next, v);
      if (treeType === "avl") next = avlInsert(next, v);
    });
    setTreeRoot(next);
    pushHistory("Generated random tree", { treeRoot: next });
  };

  return (
    <PageMotionWrapper testId="tree-page">
      <Card className="border-border/70 bg-card/70" data-testid="tree-header-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="tree-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="tree-page-title">
                Tree Visualizer
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="tree-page-subtitle">
                Binary Tree, BST, AVL, Trie, and Segment Tree with insert/delete/search/traversal flows.
              </p>
            </div>
            <AITutorDrawer
              algorithm={`${treeType.toUpperCase()} Tree`}
              currentStep={playback.currentStep}
              action={activeStep.action}
              complexity="Type-dependent tree operations"
              internalState={activeStep.internalState}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-testid="tree-config-controls">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Tree Type</p>
              <Select value={treeType} onValueChange={setTreeType}>
                <SelectTrigger data-testid="tree-type-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {treeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`tree-type-option-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              value={valueInput}
              onChange={(event) => setValueInput(event.target.value)}
              placeholder="Numeric value"
              className="mt-6"
              data-testid="tree-value-input"
            />
            <Input
              value={wordInput}
              onChange={(event) => setWordInput(event.target.value)}
              placeholder="Word for Trie"
              className="mt-6"
              data-testid="tree-word-input"
            />
            <Input
              value={segmentInput}
              onChange={(event) => setSegmentInput(event.target.value)}
              placeholder="Segment array"
              className="mt-6"
              data-testid="tree-segment-array-input"
            />
            <Button type="button" className="mt-6 rounded-full" onClick={randomFill} data-testid="tree-random-fill-button">
              Random Fill
            </Button>
          </div>

          <div className="flex flex-wrap gap-2" data-testid="tree-operation-buttons">
            <Button type="button" onClick={applyInsert} className="rounded-full" data-testid="tree-insert-button">
              <Plus className="h-4 w-4" /> Insert / Build
            </Button>
            <Button type="button" variant="outline" onClick={applyDelete} className="rounded-full" data-testid="tree-delete-button">
              <Trash2 className="h-4 w-4" /> Delete / Update
            </Button>
            <Button type="button" variant="outline" onClick={applySearch} className="rounded-full" data-testid="tree-search-button">
              <Search className="h-4 w-4" /> Search / Query
            </Button>

            <Input
              value={rangeLeft}
              onChange={(event) => setRangeLeft(event.target.value)}
              className="h-9 w-20"
              data-testid="tree-range-left-input"
            />
            <Input
              value={rangeRight}
              onChange={(event) => setRangeRight(event.target.value)}
              className="h-9 w-20"
              data-testid="tree-range-right-input"
            />
          </div>

          <div className="flex flex-wrap gap-2" data-testid="tree-traversal-buttons">
            <Button type="button" variant="secondary" onClick={() => runTraversal("preorder")} data-testid="tree-preorder-button">Preorder</Button>
            <Button type="button" variant="secondary" onClick={() => runTraversal("inorder")} data-testid="tree-inorder-button">Inorder</Button>
            <Button type="button" variant="secondary" onClick={() => runTraversal("postorder")} data-testid="tree-postorder-button">Postorder</Button>
            <Button type="button" variant="secondary" onClick={() => runTraversal("levelorder")} data-testid="tree-levelorder-button">Level Order</Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="tree-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="tree-visual-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="tree-current-action">
                {activeStep.action}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {treeType === "trie" ? (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4" data-testid="trie-visual-panel">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Trie Words</p>
                  <div className="mt-3 flex flex-wrap gap-2" data-testid="trie-words-list">
                    {words.length ? words.map((word) => (
                      <span key={word} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs" data-testid={`trie-word-${word}`}>
                        {word}
                      </span>
                    )) : <span className="text-sm text-muted-foreground">No words yet</span>}
                  </div>
                </div>
              ) : treeType === "segment" ? (
                <div className="space-y-4" data-testid="segment-visual-panel">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3" data-testid="segment-array-view">
                    <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Input Array</p>
                    <div className="flex flex-wrap gap-2">
                      {activeStep.segmentArr.map((v, i) => (
                        <span key={`${v}-${i}`} className="rounded border px-2 py-1 font-code text-xs" data-testid={`segment-array-value-${i}`}>
                          {i}:{v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-3" data-testid="segment-tree-view">
                    <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Segment Tree Array (1-indexed)</p>
                    <div className="max-h-44 overflow-auto font-code text-xs">
                      {activeStep.segmentTree
                        .map((v, i) => ({ i, v }))
                        .filter((x) => x.i > 0 && x.v !== 0)
                        .map((x) => (
                          <p key={x.i} data-testid={`segment-tree-node-${x.i}`}>[{x.i}] = {x.v}</p>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-3" data-testid="tree-svg-panel">
                  <svg viewBox="0 0 1000 500" className="h-[420px] w-full" data-testid="tree-svg-canvas">
                    {layout.edges.map((edge) => {
                      const from = layout.nodes.find((n) => n.id === edge.from);
                      const to = layout.nodes.find((n) => n.id === edge.to);
                      if (!from || !to) return null;
                      return (
                        <line
                          key={`${edge.from}-${edge.to}`}
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke="hsl(var(--border))"
                          strokeWidth="2"
                          data-testid={`tree-edge-${edge.from}-${edge.to}`}
                        />
                      );
                    })}
                    {layout.nodes.map((n) => (
                      <g key={n.id} data-testid={`tree-node-${n.value}-${n.depth}`}>
                        <circle cx={n.x} cy={n.y} r="22" fill="hsl(var(--primary))" />
                        <text x={n.x} y={n.y + 5} textAnchor="middle" className="fill-primary-foreground font-code text-sm">
                          {n.value}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              )}

              <ControlCluster
                isPlaying={playback.isPlaying}
                onPlayToggle={() => playback.setIsPlaying((prev) => !prev)}
                onStepForward={playback.stepForward}
                onStepBack={playback.stepBack}
                onReset={playback.reset}
                speed={globalSpeed}
                onSpeedChange={setGlobalSpeed}
              />
              <TimelineSlider currentStep={playback.currentStep} maxStep={playback.maxStep} onChange={playback.jumpToStep} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <StatsGrid stats={activeStep.stats} />
          <Card className="border-border/70 bg-card/70" data-testid="tree-traversal-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="tree-traversal-title">Traversal / Query Result</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-xl border border-border/60 bg-background/70 p-3 font-code text-xs" data-testid="tree-traversal-result">
                {activeStep.traversalText}
              </p>
            </CardContent>
          </Card>
          <CodePanel title={`${treeType.toUpperCase()} Reference`} code={treeCode[treeType] || treeCode.bst} />
        </div>
      </section>
    </PageMotionWrapper>
  );
}
