import { useMemo, useRef, useState } from "react";
import { Download, RefreshCcw, Save } from "lucide-react";

import { AITutorDrawer } from "@/components/common/AITutorDrawer";
import { CodePanel } from "@/components/common/CodePanel";
import { ComplexityBadge } from "@/components/common/ComplexityBadge";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { GraphCanvas } from "@/components/visuals/GraphCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { usePlayback } from "@/hooks/usePlayback";
import { saveRun } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { exportSnapshot } from "@/utils/exporters";
import { generateGraph, graphAlgorithmOptions, runGraphAlgorithm } from "@/utils/graphAlgorithms";
import { graphMeta } from "@/data/algorithmMeta";

const graphCode = {
  bfs: `queue = [start]\nvisited = {start}\nwhile queue:\n  node = queue.pop(0)\n  for n in neighbors(node):\n    if n not in visited:\n      visited.add(n); queue.append(n)`,
  dfs: `stack = [start]\nvisited = set()\nwhile stack:\n  node = stack.pop()\n  if node not in visited:\n    visited.add(node)\n    stack.extend(neighbors(node))`,
  dijkstra: `dist[start] = 0\npriority_queue = [(0, start)]\nwhile pq:\n  d, node = heappop(pq)\n  for edge in adj[node]:\n    relax(edge)`,
};

export default function GraphPage() {
  const [algorithm, setAlgorithm] = useState("dijkstra");
  const [nodeCount, setNodeCount] = useState(9);
  const [density, setDensity] = useState(35);
  const [startNode, setStartNode] = useState("0");
  const [graphSeed, setGraphSeed] = useState(0);

  const visualRef = useRef(null);
  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();

  const graph = useMemo(
    () => generateGraph({ nodeCount, density: density / 100, seed: graphSeed }),
    [nodeCount, density, graphSeed],
  );

  const run = useMemo(
    () => runGraphAlgorithm({ graph, algorithm, startNode }),
    [graph, algorithm, startNode],
  );

  const playback = usePlayback({ steps: run.steps, speed: globalSpeed, shortcutsEnabled });
  const step = run.steps[playback.currentStep] || run.steps[0] || {
    action: "Run to see graph states",
    internalState: {},
    distances: {},
  };
  const meta = graphMeta[algorithm] || graphMeta.bfs;

  const regenerateGraph = () => {
    setGraphSeed((prev) => prev + 1);
    toast.success("Graph regenerated.");
  };

  const saveGraphRun = async () => {
    try {
      await saveRun({
        module: "graph",
        algorithm,
        title: `${meta.label} run`,
        dataset_config: { nodeCount, density, seed: graphSeed, graph },
        steps: run.steps,
        stats: run.stats,
        complexity: { time: meta.time, space: meta.space },
        tags: ["graph", algorithm],
      });
      toast.success("Graph run saved.");
    } catch {
      toast.error("Unable to save graph run.");
    }
  };

  return (
    <PageMotionWrapper testId="graph-page">
      <Card className="border-border/70 bg-card/70" data-testid="graph-header-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="graph-page-title-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="graph-page-title">Graph Visualizer</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="graph-page-subtitle">
                Traversal, shortest path, MST, cycle detection, components, and debugger watch windows.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" data-testid="graph-header-actions">
              <Button type="button" variant="outline" onClick={regenerateGraph} data-testid="graph-regenerate-button">
                <RefreshCcw className="h-4 w-4" /> New Graph
              </Button>
              <Button type="button" variant="outline" onClick={saveGraphRun} data-testid="graph-save-run-button">
                <Save className="h-4 w-4" /> Save Run
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => visualRef.current && exportSnapshot(visualRef.current, "graph-visual.png")}
                data-testid="graph-export-png-button"
              >
                <Download className="h-4 w-4" /> PNG
              </Button>
              <AITutorDrawer
                algorithm={meta.label}
                currentStep={playback.currentStep}
                action={step.action}
                complexity={`${meta.time}, ${meta.space}`}
                internalState={step.internalState}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="graph-config-controls">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Algorithm</p>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger data-testid="graph-algorithm-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {graphAlgorithmOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`graph-algorithm-option-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Node Count</p>
              <Input
                type="number"
                min={5}
                max={16}
                value={nodeCount}
                onChange={(event) => setNodeCount(Math.max(5, Math.min(16, Number(event.target.value || 5))))}
                data-testid="graph-node-count-input"
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Density %</p>
              <Input
                type="number"
                min={15}
                max={80}
                value={density}
                onChange={(event) => setDensity(Math.max(15, Math.min(80, Number(event.target.value || 15))))}
                data-testid="graph-density-input"
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Start Node</p>
              <Select value={startNode} onValueChange={setStartNode}>
                <SelectTrigger data-testid="graph-start-node-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {graph.nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id} data-testid={`graph-start-node-option-${node.id}`}>
                      Node {node.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="graph-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="graph-canvas-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="graph-current-step-title">{step.action}</CardTitle>
              <ComplexityBadge time={meta.time} space={meta.space} />
            </CardHeader>
            <CardContent className="space-y-4" ref={visualRef}>
              <GraphCanvas graph={graph} step={step} startNode={startNode} />
              <ControlCluster
                isPlaying={playback.isPlaying}
                onPlayToggle={() => playback.setIsPlaying((prev) => !prev)}
                onStepForward={playback.stepForward}
                onStepBack={playback.stepBack}
                onReset={playback.reset}
                speed={globalSpeed}
                onSpeedChange={setGlobalSpeed}
              />
              <TimelineSlider
                currentStep={playback.currentStep}
                maxStep={playback.maxStep}
                onChange={playback.jumpToStep}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="graph-debugger-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="graph-debugger-title">
                Execution Debugger Watch Window
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-background/70 p-3 text-xs" data-testid="graph-debugger-state-json">
                <p className="mb-2 uppercase tracking-widest text-muted-foreground">Internal State</p>
                <pre className="max-h-44 overflow-auto font-code">{JSON.stringify(step.internalState || {}, null, 2)}</pre>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-3 text-xs" data-testid="graph-debugger-distance-map">
                <p className="mb-2 uppercase tracking-widest text-muted-foreground">Distance / Label Map</p>
                <pre className="max-h-44 overflow-auto font-code">{JSON.stringify(step.distances || {}, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <StatsGrid stats={run.stats} />
          <CodePanel title={`${meta.label} Logic`} code={graphCode[algorithm] || graphCode.bfs} />
        </div>
      </section>
    </PageMotionWrapper>
  );
}
