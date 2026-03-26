import { useMemo, useRef, useState } from "react";
import {
  Download,
  Eraser,
  Link2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  StepBack,
  StepForward,
  Target,
  Trash2,
} from "lucide-react";

import { AITutorDrawer } from "@/components/common/AITutorDrawer";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { GraphCanvas } from "@/components/visuals/GraphCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { highlightedPseudocode } from "@/helpers/pseudocodeHighlighter";
import { recentStepMessages } from "@/helpers/stepTracker";
import { saveRun } from "@/lib/api";
import { executeGraphSession, getGraphAlgorithmOptions, prepareGraphSession, animatePathSequence } from "@/modules/graphs/graphVisualizer";
import { edgeKey, graphToOutputLines, nextNodeId, randomGraph } from "@/modules/graphs/graphUtils";
import { exportSnapshot } from "@/utils/exporters";

const initialStats = { nodesVisited: 0, edgesExplored: 0, executionTimeMs: 0 };

export default function GraphPage() {
  const [algorithm, setAlgorithm] = useState("bfs");
  const [directed, setDirected] = useState(false);
  const [weighted, setWeighted] = useState(true);
  const [edgeMode, setEdgeMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectTargetMode, setSelectTargetMode] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [startNode, setStartNode] = useState(null);
  const [targetNode, setTargetNode] = useState(null);
  const [pendingEdgeSource, setPendingEdgeSource] = useState(null);

  const [density, setDensity] = useState(35);
  const [randomNodeCount, setRandomNodeCount] = useState(8);
  const [speed, setSpeed] = useState(320);

  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState(initialStats);
  const [sessionResult, setSessionResult] = useState({});
  const [pseudocode, setPseudocode] = useState([]);
  const [pathIndex, setPathIndex] = useState(-1);

  const pauseRef = useRef(false);
  const abortRef = useRef(false);
  const visualRef = useRef(null);

  const algorithmOptions = useMemo(() => getGraphAlgorithmOptions(), []);
  const currentStep = steps[stepIndex] || {
    description: "Build graph and run algorithm",
    activeNodes: [],
    activeEdges: [],
    visitedNodes: [],
    line: 0,
    internalState: {},
  };

  const stepTrackerItems = useMemo(() => recentStepMessages(steps, stepIndex, 9), [steps, stepIndex]);
  const highlightedLines = useMemo(() => highlightedPseudocode(pseudocode, currentStep.line), [pseudocode, currentStep.line]);

  const pathNodes = useMemo(() => {
    if (!sessionResult.path || pathIndex < 0) return [];
    return sessionResult.path.slice(0, pathIndex + 1);
  }, [sessionResult.path, pathIndex]);

  const pathEdges = useMemo(() => {
    if (!sessionResult.path || pathIndex <= 0) return [];
    const ids = [];
    for (let i = 0; i < pathIndex; i += 1) {
      const src = sessionResult.path[i];
      const dst = sessionResult.path[i + 1];
      const id = edgeKey(src, dst, directed);
      ids.push(id);
    }
    return ids;
  }, [sessionResult.path, pathIndex, directed]);

  const mergedStep = {
    ...currentStep,
    activeNodes: Array.from(new Set([...(currentStep.activeNodes || []), ...pathNodes])),
    activeEdges: Array.from(new Set([...(currentStep.activeEdges || []), ...pathEdges])),
  };

  const clearRunState = () => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setSteps([]);
    setStepIndex(0);
    setStats(initialStats);
    setSessionResult({});
    setPseudocode([]);
    setPathIndex(-1);
  };

  const canRunAlgorithm = () => {
    if (!nodes.length || !edges.length) {
      toast.error("Create a graph with nodes and edges first.");
      return false;
    }
    if (!startNode) {
      toast.error("Select a start node by clicking a node.");
      return false;
    }
    if (algorithm === "topo" && !directed) {
      toast.error("Topological sort works only for directed graphs.");
      return false;
    }
    if (["prim", "kruskal"].includes(algorithm) && directed) {
      toast.error("MST algorithms require undirected graph.");
      return false;
    }
    return true;
  };

  const runStepSession = async (session) => {
    abortRef.current = false;
    pauseRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    setStepIndex(0);
    setPathIndex(-1);

    const result = await executeGraphSession({
      steps: session.steps,
      onStep: (step, index, elapsedMs) => {
        setStepIndex(index);
        setStats({
          nodesVisited: step.stats?.nodesVisited || 0,
          edgesExplored: step.stats?.edgesExplored || 0,
          executionTimeMs: elapsedMs,
        });
      },
      getDelay: () => speed,
      pauseRef,
      abortRef,
    });

    if (!result.completed || abortRef.current) {
      setIsRunning(false);
      return;
    }

    setStats((prev) => ({ ...prev, executionTimeMs: result.elapsed }));
    if (algorithm === "dijkstra" && session.result.path?.length) {
      await animatePathSequence({
        path: session.result.path,
        setPathIndex,
        getDelay: () => speed,
        abortRef,
      });
    }
    setIsRunning(false);
  };

  const startAlgorithm = async () => {
    if (!canRunAlgorithm()) return;
    const session = prepareGraphSession({
      graph: { nodes, edges },
      algorithm,
      startNode,
      targetNode,
      directed,
    });
    if (session.result?.error) {
      toast.error(session.result.error);
      return;
    }

    setSteps(session.steps);
    setSessionResult(session.result || {});
    setPseudocode(session.pseudocode || []);
    setStepIndex(0);
    await runStepSession(session);
  };

  const playbackRun = async () => {
    if (!steps.length || isRunning) return;
    await runStepSession({ steps, result: sessionResult });
  };

  const pauseRun = () => {
    if (!isRunning) return;
    pauseRef.current = true;
    setIsPaused(true);
  };

  const resumeRun = () => {
    pauseRef.current = false;
    setIsPaused(false);
  };

  const resetRun = () => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setStepIndex(0);
    setStats(initialStats);
    setPathIndex(-1);
  };

  const clearGraph = () => {
    clearRunState();
    setNodes([]);
    setEdges([]);
    setStartNode(null);
    setTargetNode(null);
    setPendingEdgeSource(null);
  };

  const randomizeGraph = () => {
    clearRunState();
    const generated = randomGraph({
      nodeCount: randomNodeCount,
      density: density / 100,
      directed,
      weighted,
    });
    setNodes(generated.nodes);
    setEdges(generated.edges);
    setStartNode(generated.nodes[0]?.id || null);
    setTargetNode(generated.nodes[generated.nodes.length - 1]?.id || null);
    toast.success("Random graph generated.");
  };

  const addNode = ({ x, y }) => {
    if (isRunning) return;
    const used = new Set(nodes.map((n) => n.id));
    let idx = 0;
    let id = nextNodeId(idx);
    while (used.has(id)) {
      idx += 1;
      id = nextNodeId(idx);
    }
    const nextNode = { id, x, y };
    setNodes((prev) => [...prev, nextNode]);
    if (!startNode) setStartNode(id);
  };

  const moveNode = (nodeId, point) => {
    setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, ...point } : node)));
  };

  const removeNode = (nodeId) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) => prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (startNode === nodeId) setStartNode(null);
    if (targetNode === nodeId) setTargetNode(null);
    if (pendingEdgeSource === nodeId) setPendingEdgeSource(null);
  };

  const removeEdge = (edgeId) => {
    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
  };

  const handleNodeClick = (nodeId) => {
    if (deleteMode) {
      removeNode(nodeId);
      return;
    }

    if (selectTargetMode) {
      setTargetNode(nodeId);
      setSelectTargetMode(false);
      return;
    }

    if (edgeMode) {
      if (!pendingEdgeSource) {
        setPendingEdgeSource(nodeId);
        return;
      }
      if (pendingEdgeSource === nodeId) {
        setPendingEdgeSource(null);
        return;
      }

      const id = edgeKey(pendingEdgeSource, nodeId, directed);
      const hasDuplicate = edges.some((edge) => edge.id === id);
      if (hasDuplicate) {
        toast.error("Duplicate edge prevented.");
        return;
      }

      let weight = 1;
      if (weighted) {
        const entered = window.prompt("Enter edge weight", "1");
        const parsed = Number(entered);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          toast.error("Invalid weight");
          return;
        }
        weight = parsed;
      }
      setEdges((prev) => [...prev, { id, source: pendingEdgeSource, target: nodeId, weight }]);
      setPendingEdgeSource(null);
      return;
    }

    setStartNode(nodeId);
  };

  const saveGraphRun = async () => {
    try {
      await saveRun({
        module: "graph",
        algorithm,
        title: `${algorithm.toUpperCase()} graph run`,
        dataset_config: { directed, weighted, nodes, edges, startNode, targetNode },
        steps,
        stats,
        complexity: { time: "varies", space: "varies" },
        tags: ["graph", algorithm],
      });
      toast.success("Graph run saved.");
    } catch {
      toast.error("Unable to save graph run.");
    }
  };

  const outputLines = useMemo(() => graphToOutputLines(sessionResult), [sessionResult]);

  return (
    <PageMotionWrapper testId="graph-page">
      <Card className="border-border/70 bg-card/70" data-testid="graph-header-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="graph-main-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="graph-page-title">Graph Visualizer</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="graph-page-subtitle">
                Build your own directed/undirected weighted graph and animate BFS, DFS, Dijkstra, Topological Sort, Cycle Detection, Prim, and Kruskal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" data-testid="graph-header-actions">
              <Button type="button" variant="outline" onClick={saveGraphRun} data-testid="graph-save-run-button">
                <Save className="h-4 w-4" /> Save Run
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => visualRef.current && exportSnapshot(visualRef.current, "graph-visualization.png")}
                data-testid="graph-export-png-button"
              >
                <Download className="h-4 w-4" /> Export PNG
              </Button>
              <AITutorDrawer
                algorithm={algorithm.toUpperCase()}
                currentStep={stepIndex}
                action={mergedStep.description}
                complexity="Graph algorithm execution"
                internalState={mergedStep.internalState}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4" data-testid="graph-config-grid">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Algorithm</p>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger data-testid="graph-algorithm-dropdown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithmOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`graph-algorithm-option-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2" data-testid="graph-directed-toggle-row">
              <span className="text-sm font-medium">Directed Graph</span>
              <Switch
                checked={directed}
                onCheckedChange={(v) => {
                  setDirected(v);
                  setPendingEdgeSource(null);
                  setEdges((prev) => {
                    const dedupe = new Set();
                    const next = [];
                    prev.forEach((edge) => {
                      const id = edgeKey(edge.source, edge.target, v);
                      if (dedupe.has(id)) return;
                      dedupe.add(id);
                      next.push({ ...edge, id });
                    });
                    return next;
                  });
                }}
                data-testid="graph-directed-toggle"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2" data-testid="graph-weighted-toggle-row">
              <span className="text-sm font-medium">Weighted Graph</span>
              <Switch checked={weighted} onCheckedChange={setWeighted} data-testid="graph-weighted-toggle" />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Speed</p>
              <input
                type="range"
                min="80"
                max="800"
                step="20"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full"
                data-testid="graph-speed-slider"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4" data-testid="graph-random-controls-grid">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Random Nodes</p>
              <Input type="number" min={4} max={20} value={randomNodeCount} onChange={(e) => setRandomNodeCount(Number(e.target.value || 8))} data-testid="graph-random-node-count-input" />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Density %</p>
              <Input type="number" min={10} max={90} value={density} onChange={(e) => setDensity(Number(e.target.value || 35))} data-testid="graph-density-input" />
            </div>
            <Button type="button" variant="secondary" className="mt-6" onClick={randomizeGraph} data-testid="graph-random-generate-button">
              <RefreshCw className="h-4 w-4" /> Random Graph
            </Button>
            <Button type="button" variant="outline" className="mt-6" onClick={clearGraph} data-testid="graph-clear-button">
              <Eraser className="h-4 w-4" /> Clear Graph
            </Button>
          </div>

          <div className="flex flex-wrap gap-2" data-testid="graph-mode-action-row">
            <Button type="button" variant={edgeMode ? "default" : "outline"} onClick={() => { setEdgeMode((p) => !p); setDeleteMode(false); }} data-testid="graph-edge-mode-button">
              <Link2 className="h-4 w-4" /> Edge Mode
            </Button>
            <Button type="button" variant={deleteMode ? "destructive" : "outline"} onClick={() => { setDeleteMode((p) => !p); setEdgeMode(false); setPendingEdgeSource(null); }} data-testid="graph-delete-mode-button">
              <Trash2 className="h-4 w-4" /> Delete Mode
            </Button>
            <Button type="button" variant={selectTargetMode ? "default" : "outline"} onClick={() => setSelectTargetMode((p) => !p)} data-testid="graph-target-mode-button">
              <Target className="h-4 w-4" /> Select Target
            </Button>

            <Button type="button" onClick={startAlgorithm} disabled={isRunning} data-testid="graph-start-button">
              <Play className="h-4 w-4" /> Start
            </Button>
            <Button type="button" variant="outline" onClick={pauseRun} disabled={!isRunning || isPaused} data-testid="graph-pause-button">
              <Pause className="h-4 w-4" /> Pause
            </Button>
            <Button type="button" variant="outline" onClick={resumeRun} disabled={!isRunning || !isPaused} data-testid="graph-resume-button">
              <Play className="h-4 w-4" /> Resume
            </Button>
            <Button type="button" variant="outline" onClick={playbackRun} disabled={isRunning || !steps.length} data-testid="graph-playback-button">
              <RefreshCw className="h-4 w-4" /> Playback
            </Button>
            <Button type="button" variant="ghost" onClick={resetRun} data-testid="graph-reset-button">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button type="button" variant="outline" onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))} disabled={isRunning || !steps.length} data-testid="graph-step-back-button">
              <StepBack className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={() => setStepIndex((prev) => Math.min(steps.length - 1, prev + 1))} disabled={isRunning || !steps.length} data-testid="graph-step-forward-button">
              <StepForward className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="graph-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="graph-visual-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="graph-current-step-title">{mergedStep.description}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" ref={visualRef}>
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                directed={directed}
                weighted={weighted}
                step={mergedStep}
                startNode={startNode}
                targetNode={targetNode}
                deleteMode={deleteMode}
                edgeMode={edgeMode}
                pendingEdgeSource={pendingEdgeSource}
                onCanvasAddNode={addNode}
                onNodeMove={moveNode}
                onNodeClick={handleNodeClick}
                onNodeDelete={removeNode}
                onEdgeDelete={removeEdge}
              />
              <TimelineSlider
                currentStep={stepIndex}
                maxStep={Math.max(steps.length - 1, 0)}
                onChange={(value) => setStepIndex(value)}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="graph-step-tracker-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="graph-step-tracker-title">Step Tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stepTrackerItems.length ? (
                stepTrackerItems.map((item) => (
                  <p key={item.id} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid={`graph-step-item-${item.id}`}>
                    {item.message}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="graph-step-empty">No steps yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="border-border/70 bg-card/70" data-testid="graph-stats-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="graph-stats-title">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2" data-testid="graph-stats-nodes">Nodes Visited: <strong>{stats.nodesVisited}</strong></p>
              <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2" data-testid="graph-stats-edges">Edges Explored: <strong>{stats.edgesExplored}</strong></p>
              <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2" data-testid="graph-stats-time">Execution Time: <strong>{(stats.executionTimeMs / 1000).toFixed(2)}s</strong></p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="graph-output-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="graph-output-title">Output</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {outputLines.map((line) => (
                <p key={line} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid={`graph-output-line-${line.replace(/[^a-zA-Z0-9]/g, "-")}`}>
                  {line}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="graph-pseudocode-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="graph-pseudocode-title">Pseudocode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 rounded-xl border border-border/60 bg-background/70 p-3 font-code text-xs">
              {highlightedLines.length ? highlightedLines.map((line) => (
                <p key={line.lineNumber} className={`rounded px-2 py-1 ${line.active ? "bg-primary/20 text-primary" : "text-muted-foreground"}`} data-testid={`graph-pseudocode-line-${line.lineNumber}`}>
                  {line.lineNumber}. {line.text}
                </p>
              )) : (
                <p className="text-muted-foreground" data-testid="graph-pseudocode-empty">Select and run an algorithm to view pseudocode.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageMotionWrapper>
  );
}
