import { useEffect, useMemo, useState } from "react";
import { Play, Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react";

import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { InteractiveTreeStage } from "@/components/visuals/InteractiveTreeStage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { highlightedPseudocode } from "@/helpers/pseudocodeHighlighter";
import { usePlayback } from "@/hooks/usePlayback";
import {
  buildAlgorithmSession,
  createIdleTreeStep,
  getTreeAlgorithmMeta,
  treeMutations,
  treeTypeOptions,
} from "@/modules/trees/treeVisualizer";
import { getTreeAlgorithmOptions } from "@/modules/trees/treeAlgorithms";
import {
  findNodeById,
  findNodeByValue,
  flattenTree,
  isValidNodeValue,
  isValidTreeSize,
} from "@/modules/trees/treeUtils";
import { useAppStore } from "@/store/useAppStore";

const DEFAULT_OUTPUT = "Build a tree, choose an algorithm, and press Start.";

const buildSummary = (stats = {}) => ({
  nodesVisited: stats.nodesVisited ?? 0,
  executionTimeMs: stats.executionTimeMs ?? 0,
  totalNodes: stats.totalNodes ?? 0,
  treeHeight: stats.treeHeight ?? 0,
});

export default function TreeModulePage() {
  const [treeType, setTreeType] = useState("binary");
  const [treeRoot, setTreeRoot] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [primaryValueInput, setPrimaryValueInput] = useState("");
  const [secondaryValueInput, setSecondaryValueInput] = useState("");
  const [randomCountInput, setRandomCountInput] = useState("7");
  const [algorithmKey, setAlgorithmKey] = useState("inorder");
  const [steps, setSteps] = useState([
    createIdleTreeStep({ root: null, description: "Tree ready.", output: DEFAULT_OUTPUT }),
  ]);
  const [outputText, setOutputText] = useState(DEFAULT_OUTPUT);
  const [summary, setSummary] = useState(buildSummary());
  const [pendingAutoPlay, setPendingAutoPlay] = useState(false);

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();
  const playback = usePlayback({ steps, speed: globalSpeed, shortcutsEnabled });
  const { currentStep, maxStep, jumpToStep, isPlaying, setIsPlaying } = playback;

  const algorithmOptions = useMemo(() => getTreeAlgorithmOptions(), []);
  const algorithmMeta = useMemo(() => getTreeAlgorithmMeta(algorithmKey), [algorithmKey]);
  const displayStep = steps[currentStep] || steps[0];
  const selectedNode = useMemo(() => findNodeById(treeRoot, selectedNodeId), [treeRoot, selectedNodeId]);
  const orderedNodes = useMemo(() => flattenTree(treeRoot).nodes, [treeRoot]);
  const selectedNodeIndex = useMemo(
    () => orderedNodes.findIndex((node) => node.id === selectedNodeId),
    [orderedNodes, selectedNodeId],
  );

  const recentSteps = useMemo(() => {
    const start = Math.max(0, currentStep - 3);
    const end = Math.min(steps.length, currentStep + 4);
    return steps.slice(start, end).map((step, index) => ({
      ...step,
      absoluteIndex: start + index,
    }));
  }, [currentStep, steps]);

  const pseudocodeLines = useMemo(
    () => highlightedPseudocode(algorithmMeta.pseudocode, displayStep.line),
    [algorithmMeta.pseudocode, displayStep.line],
  );

  const setIdleState = ({ root, description, output = outputText, selectedId = selectedNodeId, deletedNodeIds = [] }) => {
    const step = createIdleTreeStep({
      root,
      description,
      output,
      selectedNodeId: selectedId,
      deletedNodeIds,
      executionTimeMs: 0,
    });
    setSteps([step]);
    setOutputText(output);
    setSummary(buildSummary(step.stats));
    jumpToStep(0);
  };

  const playMutationSequence = ({ previewStep, finalStep, output, root, summaryStats, selectedId = null }) => {
    setTreeRoot(root);
    setSelectedNodeId(selectedId);
    setSteps([previewStep, finalStep]);
    setOutputText(output);
    setSummary(buildSummary(summaryStats ?? finalStep.stats));
    setPendingAutoPlay(true);
  };

  useEffect(() => {
    if (pendingAutoPlay && steps.length > 1) {
      jumpToStep(0);
      setIsPlaying(true);
      setPendingAutoPlay(false);
    }
  }, [jumpToStep, pendingAutoPlay, setIsPlaying, steps.length]);

  const handleSelectNode = (nodeId) => {
    if (isPlaying) return;
    setSelectedNodeId(nodeId);
    setIdleState({
      root: treeRoot,
      description: `Selected node ${findNodeById(treeRoot, nodeId)?.value ?? ""}`.trim(),
      output: outputText,
      selectedId: nodeId,
    });
  };

  const handleClearSelection = () => {
    if (isPlaying || !selectedNodeId) return;
    setSelectedNodeId(null);
    setIdleState({
      root: treeRoot,
      description: "Selection cleared.",
      output: outputText,
      selectedId: null,
    });
  };

  const parsePrimaryValue = () => {
    const parsed = isValidNodeValue(primaryValueInput);
    if (parsed === null) {
      toast.error("Enter a valid numeric value.");
      return null;
    }
    return parsed;
  };

  const parseSecondaryValue = () => {
    const parsed = isValidNodeValue(secondaryValueInput);
    if (parsed === null) {
      toast.error("Enter the second numeric value.");
      return null;
    }
    return parsed;
  };

  const parseRandomCount = () => {
    const parsed = isValidTreeSize(randomCountInput, 7);
    if (parsed === null) {
      toast.error("Enter a valid random tree size between 1 and 25.");
      return null;
    }
    return parsed;
  };

  const handleAddRoot = () => {
    const value = parsePrimaryValue();
    if (value === null) return;
    const result = treeMutations.addManualRoot(treeRoot, value);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setTreeRoot(result.root);
    setSelectedNodeId(result.root?.id ?? null);
    setIdleState({
      root: result.root,
      description: `Root node ${value} created.`,
      output: `Root = ${value}`,
      selectedId: result.root?.id ?? null,
    });
  };

  const handleAddChild = (side) => {
    if (!selectedNodeId) {
      toast.error("Select a node first.");
      return;
    }
    const value = parsePrimaryValue();
    if (value === null) return;
    const result = treeMutations.addManualChild(treeRoot, selectedNodeId, side, value);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setTreeRoot(result.root);
    setSelectedNodeId(result.createdId ?? selectedNodeId);
    setIdleState({
      root: result.root,
      description: `${side === "left" ? "Left" : "Right"} child ${value} added.`,
      output: `Attached ${value} as the ${side} child of ${selectedNode?.value ?? "selected node"}.`,
      selectedId: result.createdId ?? selectedNodeId,
    });
  };

  const handleDeleteManual = () => {
    if (!selectedNodeId) {
      toast.error("Select a node to delete.");
      return;
    }
    const currentNode = findNodeById(treeRoot, selectedNodeId);
    const result = treeMutations.deleteNodeById(treeRoot, selectedNodeId);
    const finalOutput = result.deletedIds.length ? `Deleted ${result.deletedIds.length} node(s).` : "Nothing was deleted.";
    if (!currentNode || !result.deletedIds.length) {
      setTreeRoot(result.root);
      setSelectedNodeId(null);
      setIdleState({
        root: result.root,
        description: "Selected node deleted.",
        output: finalOutput,
        selectedId: null,
        deletedNodeIds: result.deletedIds,
      });
      return;
    }

    playMutationSequence({
      previewStep: createIdleTreeStep({
        root: treeRoot,
        description: `Mark node ${currentNode.value} for deletion.`,
        output: finalOutput,
        selectedNodeId: currentNode.id,
        currentNodeId: currentNode.id,
        deletedNodeIds: [currentNode.id],
      }),
      finalStep: createIdleTreeStep({
        root: result.root,
        description: "Selected node deleted.",
        output: finalOutput,
      }),
      output: finalOutput,
      root: result.root,
      selectedId: null,
    });
  };

  const handleBstInsert = () => {
    const value = parsePrimaryValue();
    if (value === null) return;
    const result = treeMutations.insertBstValue(treeRoot, value);
    if (result.duplicate) {
      toast.error("Duplicate values are not inserted in BST mode.");
      return;
    }
    setTreeRoot(result.root);
    setSelectedNodeId(result.insertedId);
    setIdleState({
      root: result.root,
      description: `Inserted ${value} using BST rules.`,
      output: `BST inserted ${value}.`,
      selectedId: result.insertedId,
    });
  };

  const handleBstDelete = () => {
    const targetValue = selectedNode?.value ?? parsePrimaryValue();
    if (targetValue === null) return;
    const targetNode = selectedNode ?? findNodeByValue(treeRoot, targetValue);
    const result = treeMutations.deleteBstValue(treeRoot, targetValue);
    const finalOutput = result.deletedIds.length ? `Deleted value ${targetValue}.` : `${targetValue} was not found.`;
    if (!targetNode || !result.deletedIds.length) {
      setTreeRoot(result.root);
      setSelectedNodeId(null);
      setIdleState({
        root: result.root,
        description: `Deleted ${targetValue} from BST.`,
        output: finalOutput,
        selectedId: null,
        deletedNodeIds: result.deletedIds,
      });
      return;
    }

    playMutationSequence({
      previewStep: createIdleTreeStep({
        root: treeRoot,
        description: `Mark node ${targetNode.value} for BST deletion.`,
        output: finalOutput,
        selectedNodeId: targetNode.id,
        currentNodeId: targetNode.id,
        deletedNodeIds: [targetNode.id],
      }),
      finalStep: createIdleTreeStep({
        root: result.root,
        description: `Deleted ${targetValue} from BST.`,
        output: finalOutput,
      }),
      output: finalOutput,
      root: result.root,
      selectedId: null,
    });
  };

  const handleGenerateRandomTree = () => {
    const nodeCount = parseRandomCount();
    if (nodeCount === null) return;

    const result = treeMutations.generateRandomTree(treeType, nodeCount);
    const nextSelectedId = result.root?.id ?? null;
    const label = treeType === "bst" ? "random BST" : "random binary tree";
    const valuesText = result.values.join(", ");

    setTreeRoot(result.root);
    setSelectedNodeId(nextSelectedId);
    setIdleState({
      root: result.root,
      description: `Generated a ${label} with ${nodeCount} node${nodeCount === 1 ? "" : "s"}.`,
      output: `${label.toUpperCase()}: ${valuesText}`,
      selectedId: nextSelectedId,
    });
  };

  const handleStartAlgorithm = () => {
    if (!treeRoot) {
      toast.error("Build a tree before running an algorithm.");
      return;
    }

    let primaryValue = null;
    let secondaryValue = null;
    if (algorithmMeta.requires >= 1) {
      primaryValue = parsePrimaryValue();
      if (primaryValue === null) return;
    }
    if (algorithmMeta.requires >= 2) {
      secondaryValue = parseSecondaryValue();
      if (secondaryValue === null) return;
    }

    const session = buildAlgorithmSession({
      root: treeRoot,
      algorithmKey,
      selectedNodeId,
      params: {
        treeType,
        primaryValue,
        secondaryValue,
      },
    });

    setSteps(session.steps);
    setOutputText(session.result);
    setSummary({
      nodesVisited: session.steps.at(-1)?.stats.nodesVisited ?? 0,
      executionTimeMs: session.summary.executionTimeMs,
      totalNodes: session.summary.totalNodes,
      treeHeight: session.summary.height,
    });
    setPendingAutoPlay(true);
  };

  const handleResetTree = () => {
    setTreeRoot(null);
    setSelectedNodeId(null);
    setOutputText(DEFAULT_OUTPUT);
    setSummary(buildSummary());
    setSteps([createIdleTreeStep({ root: null, description: "Tree reset.", output: DEFAULT_OUTPUT })]);
    setPrimaryValueInput("");
    setSecondaryValueInput("");
    setRandomCountInput("7");
    toast.success("Tree reset.");
  };

  const handleTreeStageKeyDown = (event) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) || event.altKey || event.metaKey || event.ctrlKey) {
      return;
    }

    const currentNode = selectedNodeId ? findNodeById(treeRoot, selectedNodeId) : null;
    const selectRoot = () => {
      if (!treeRoot?.id) return;
      handleSelectNode(treeRoot.id);
    };
    const selectPreviousNode = () => {
      if (!orderedNodes.length) return;
      if (selectedNodeIndex <= 0) {
        selectRoot();
        return;
      }
      handleSelectNode(orderedNodes[selectedNodeIndex - 1].id);
    };
    const selectNextNode = () => {
      if (!orderedNodes.length) return;
      if (selectedNodeIndex < 0) {
        selectRoot();
        return;
      }
      if (selectedNodeIndex < orderedNodes.length - 1) {
        handleSelectNode(orderedNodes[selectedNodeIndex + 1].id);
      }
    };

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        if (!currentNode) {
          selectRoot();
          return;
        }
        if (currentNode.left) {
          handleSelectNode(currentNode.left.id);
          return;
        }
        selectPreviousNode();
        return;
      case "ArrowRight":
        event.preventDefault();
        if (!currentNode) {
          selectRoot();
          return;
        }
        if (currentNode.right) {
          handleSelectNode(currentNode.right.id);
          return;
        }
        selectNextNode();
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!currentNode) {
          selectRoot();
          return;
        }
        if (currentNode.parent) {
          handleSelectNode(currentNode.parent);
        } else {
          selectRoot();
        }
        return;
      case "ArrowDown":
        event.preventDefault();
        if (!currentNode) {
          selectRoot();
          return;
        }
        if (currentNode.left || currentNode.right) {
          handleSelectNode(currentNode.left?.id ?? currentNode.right?.id);
          return;
        }
        selectNextNode();
        return;
      case "[":
        event.preventDefault();
        selectPreviousNode();
        return;
      case "]":
        event.preventDefault();
        selectNextNode();
        return;
      case "Escape":
        event.preventDefault();
        handleClearSelection();
        return;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        if (isPlaying) return;
        if (treeType === "binary") {
          handleDeleteManual();
        } else {
          handleBstDelete();
        }
        return;
      case "l":
      case "L":
        if (treeType !== "binary" || isPlaying) return;
        event.preventDefault();
        handleAddChild("left");
        return;
      case "r":
      case "R":
        if (treeType !== "binary" || isPlaying) return;
        event.preventDefault();
        handleAddChild("right");
        return;
      case "i":
      case "I":
        if (treeType !== "bst" || isPlaying) return;
        event.preventDefault();
        handleBstInsert();
        return;
      case "g":
      case "G":
        if (isPlaying) return;
        event.preventDefault();
        handleGenerateRandomTree();
        return;
      case "s":
      case "S":
        event.preventDefault();
        handleStartAlgorithm();
        return;
      case "Enter":
        event.preventDefault();
        if (!treeRoot) {
          if (treeType === "binary") {
            handleAddRoot();
          } else {
            handleBstInsert();
          }
          return;
        }
        handleStartAlgorithm();
        return;
      case "Home":
        event.preventDefault();
        selectRoot();
        return;
      default:
    }
  };

  const selectedTreeType = treeTypeOptions.find((option) => option.value === treeType)?.label ?? "Tree";
  const outputDisplay = displayStep.output || outputText;

  return (
    <PageMotionWrapper testId="tree-module-page">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-3">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Tree Visualizer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Tree Type</p>
                <Select value={treeType} onValueChange={setTreeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {treeTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Primary Value</p>
                <Input value={primaryValueInput} onChange={(event) => setPrimaryValueInput(event.target.value)} placeholder="Enter node value" />
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Random Tree Size</p>
                <Input value={randomCountInput} onChange={(event) => setRandomCountInput(event.target.value)} placeholder="Default 7 nodes" />
              </div>

              {algorithmMeta.requires >= 2 ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Secondary Value</p>
                  <Input value={secondaryValueInput} onChange={(event) => setSecondaryValueInput(event.target.value)} placeholder="Enter second value" />
                </div>
              ) : null}

              {treeType === "binary" ? (
                <div className="space-y-2 rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Manual Builder</p>
                  <Button type="button" className="w-full rounded-full" onClick={handleAddRoot} disabled={Boolean(treeRoot)}>
                    <Plus className="h-4 w-4" /> Add Root Node
                  </Button>
                  <Button type="button" variant="secondary" className="w-full rounded-full" onClick={() => handleAddChild("left")} disabled={!selectedNodeId}>
                    Add Left Child
                  </Button>
                  <Button type="button" variant="secondary" className="w-full rounded-full" onClick={() => handleAddChild("right")} disabled={!selectedNodeId}>
                    Add Right Child
                  </Button>
                  <Button type="button" variant="destructive" className="w-full rounded-full" onClick={handleDeleteManual} disabled={!selectedNodeId}>
                    <Trash2 className="h-4 w-4" /> Delete Node
                  </Button>
                  <Button type="button" variant="outline" className="w-full rounded-full" onClick={handleGenerateRandomTree}>
                    <Shuffle className="h-4 w-4" /> Random Tree
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">BST Controls</p>
                  <Button type="button" className="w-full rounded-full" onClick={handleBstInsert}>
                    <Plus className="h-4 w-4" /> Insert Node
                  </Button>
                  <Button type="button" variant="destructive" className="w-full rounded-full" onClick={handleBstDelete} disabled={!treeRoot}>
                    <Trash2 className="h-4 w-4" /> Delete Node
                  </Button>
                  <Button type="button" variant="outline" className="w-full rounded-full" onClick={handleGenerateRandomTree}>
                    <Shuffle className="h-4 w-4" /> Random BST
                  </Button>
                </div>
              )}

              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Selected Node</p>
                <p className="mt-2 text-sm font-medium">{selectedNode ? selectedNode.value : "No node selected"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click a node, or tab into the tree canvas and use the keyboard controls.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Keyboard Shortcuts</p>
                <div className="mt-3 space-y-2 text-xs text-slate-300">
                  <p><strong>Arrows:</strong> move between parent and child nodes</p>
                  <p><strong>[ / ]:</strong> jump to previous or next node</p>
                  <p><strong>Enter:</strong> add root or run the current algorithm</p>
                  <p><strong>G:</strong> generate a random tree</p>
                  <p><strong>Esc:</strong> clear current selection</p>
                  <p><strong>Del:</strong> delete selected node or BST value</p>
                  <p><strong>L / R:</strong> add left or right child in Binary Tree mode</p>
                  <p><strong>I:</strong> insert value in BST mode</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Algorithm Runner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={algorithmKey} onValueChange={setAlgorithmKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithmOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" className="w-full rounded-full" onClick={handleStartAlgorithm}>
                <Play className="h-4 w-4" /> Start
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-full" onClick={handleResetTree}>
                <RotateCcw className="h-4 w-4" /> Reset Tree
              </Button>
              <StepGuideDrawer
                algorithm={algorithmMeta.label}
                currentStep={currentStep}
                action={displayStep.description}
                complexity={`${selectedTreeType} mode`}
                internalState={{
                  currentNodeId: displayStep.currentNodeId,
                  visitedNodeIds: displayStep.visitedNodeIds,
                  output: displayStep.output,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-6">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-xl">{displayStep.description}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InteractiveTreeStage
                root={displayStep.treeRoot}
                displayStep={displayStep}
                treeType={treeType}
                onSelectNode={handleSelectNode}
                onClearSelection={handleClearSelection}
                onStageKeyDown={handleTreeStageKeyDown}
                onAddLeft={() => handleAddChild("left")}
                onAddRight={() => handleAddChild("right")}
                onDeleteNode={handleDeleteManual}
              />
              <ControlCluster
                isPlaying={isPlaying}
                onPlayToggle={() => setIsPlaying((previous) => !previous)}
                onStepForward={playback.stepForward}
                onStepBack={playback.stepBack}
                onReset={playback.reset}
                speed={globalSpeed}
                onSpeedChange={setGlobalSpeed}
              />
              <TimelineSlider currentStep={currentStep} maxStep={maxStep} totalSteps={steps.length} onChange={jumpToStep} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-3">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Output</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-2xl border border-border/70 bg-background/70 p-3 font-code text-sm leading-relaxed">
                {outputDisplay}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Nodes Visited</p>
                <p className="mt-2 font-code text-xl font-semibold">{displayStep.stats.nodesVisited ?? summary.nodesVisited}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Execution Time</p>
                <p className="mt-2 font-code text-xl font-semibold">{summary.executionTimeMs}ms</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total Nodes</p>
                <p className="mt-2 font-code text-xl font-semibold">{summary.totalNodes}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tree Height</p>
                <p className="mt-2 font-code text-xl font-semibold">{summary.treeHeight}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Step Tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentSteps.map((step) => {
                const stepNumber = step.absoluteIndex + 1;
                const isCurrent = step.absoluteIndex === currentStep;
                const isComplete = step.absoluteIndex < currentStep;
                const isUpcoming = step.absoluteIndex > currentStep;
                const cardClassName = isCurrent
                  ? "border-yellow-300/60 bg-yellow-400/15 text-yellow-50 shadow-[0_8px_28px_rgba(250,204,21,0.16)]"
                  : isComplete
                    ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-50"
                    : "border-slate-700/80 bg-slate-900/75 text-slate-300";
                const badgeClassName = isCurrent
                  ? "border-yellow-300/50 bg-yellow-300/20 text-yellow-100"
                  : isComplete
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
                    : "border-slate-600/70 bg-slate-800/80 text-slate-300";
                const statusLabel = isCurrent ? "Current" : isComplete ? "Done" : "Next";

                return (
                  <div key={`${step.description}-${stepNumber}`} className={`rounded-xl border px-3 py-2 text-sm transition-colors ${cardClassName}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{`Step ${stepNumber}: ${step.description}`}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${badgeClassName}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Pseudocode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 rounded-2xl border border-border/70 bg-background/70 p-3 font-code text-xs">
              {pseudocodeLines.map((line) => (
                <p
                  key={line.lineNumber}
                  className={`rounded px-2 py-1 ${line.active ? "bg-yellow-500/20 text-yellow-200" : "text-muted-foreground"}`}
                >
                  {line.lineNumber}. {line.text}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageMotionWrapper>
  );
}
