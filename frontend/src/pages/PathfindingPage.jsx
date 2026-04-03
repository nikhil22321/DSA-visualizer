import { useMemo, useRef, useState } from "react";
import { Download, RefreshCcw, Save } from "lucide-react";

import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
import { CodePanel } from "@/components/common/CodePanel";
import { ComplexityBadge } from "@/components/common/ComplexityBadge";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { GridBoard } from "@/components/visuals/GridBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { usePlayback } from "@/hooks/usePlayback";
import { saveRun } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { exportSnapshot } from "@/utils/exporters";
import { createGrid, pathfindingAlgorithmOptions, runPathfinding } from "@/utils/pathfindingAlgorithms";
import { pathfindingMeta } from "@/data/algorithmMeta";

const pathCode = {
  astar: `f(n) = g(n) + h(n)\nopen = priority queue\nwhile open:\n  node = pop lowest f\n  relax neighbors with heuristic`,
  dijkstra: `dist[start] = 0\nwhile queue:\n  u = min-distance unvisited\n  relax all neighbors`,
  bfs: `queue = [start]\nvisited = {start}\nwhile queue:\n  cell = queue.pop(0)\n  push neighbors`,
  dfs: `stack = [start]\nwhile stack:\n  cell = stack.pop()\n  push unvisited neighbors`,
  greedy: `priority = heuristic only\nexpand nearest to target first`,
};

export default function PathfindingPage() {
  const [algorithm, setAlgorithm] = useState("astar");
  const [rows, setRows] = useState(18);
  const [cols, setCols] = useState(32);
  const [density, setDensity] = useState(22);
  const visualRef = useRef(null);

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();

  const [grid, setGrid] = useState(() => createGrid({ rows: 18, cols: 32, density: 0.22 }));

  const regenerateGrid = () => {
    setGrid(createGrid({ rows, cols, density: density / 100 }));
    toast.success("Grid regenerated.");
  };

  const toggleWall = (row, col) => {
    const key = `${row}-${col}`;
    if (`${grid.start.row}-${grid.start.col}` === key || `${grid.end.row}-${grid.end.col}` === key) {
      return;
    }
    const walls = new Set(grid.walls);
    if (walls.has(key)) {
      walls.delete(key);
    } else {
      walls.add(key);
    }
    setGrid((prev) => ({ ...prev, walls: [...walls] }));
  };

  const run = useMemo(() => runPathfinding({ grid, algorithm }), [grid, algorithm]);
  const playback = usePlayback({ steps: run.steps, speed: globalSpeed, shortcutsEnabled });
  const step = run.steps[playback.currentStep] || run.steps[0] || { action: "Ready", internalState: {} };
  const meta = pathfindingMeta[algorithm] || pathfindingMeta.astar;

  const savePathRun = async () => {
    try {
      await saveRun({
        module: "pathfinding",
        algorithm,
        title: `${meta.label} run`,
        dataset_config: grid,
        steps: run.steps,
        stats: run.stats,
        complexity: { time: meta.time, space: meta.space },
        tags: ["pathfinding", algorithm],
      });
      toast.success("Pathfinding run saved.");
    } catch {
      toast.error("Unable to save run.");
    }
  };

  return (
    <PageMotionWrapper testId="pathfinding-page">
      <Card className="border-border/70 bg-card/70" data-testid="pathfinding-header-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="pathfinding-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="pathfinding-page-title">
                Pathfinding Visualizer
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="pathfinding-page-subtitle">
                Interactive grid simulation for A*, Dijkstra, BFS, DFS and Greedy Best First Search.
              </p>
            </div>
            <div className="flex gap-2" data-testid="pathfinding-header-actions">
              <Button type="button" variant="outline" onClick={regenerateGrid} data-testid="pathfinding-regenerate-grid-button">
                <RefreshCcw className="h-4 w-4" /> New Grid
              </Button>
              <Button type="button" variant="outline" onClick={savePathRun} data-testid="pathfinding-save-run-button">
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => visualRef.current && exportSnapshot(visualRef.current, "pathfinding-grid.png")}
                data-testid="pathfinding-export-png-button"
              >
                <Download className="h-4 w-4" /> PNG
              </Button>
            <StepGuideDrawer
                algorithm={meta.label}
                currentStep={playback.currentStep}
                action={step.action}
                complexity={`${meta.time}, ${meta.space}`}
                internalState={step.internalState}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5" data-testid="pathfinding-config-grid">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Algorithm</p>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger data-testid="pathfinding-algorithm-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pathfindingAlgorithmOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`pathfinding-algorithm-option-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Rows</p>
              <Input
                type="number"
                min={10}
                max={30}
                value={rows}
                onChange={(event) => setRows(Math.max(10, Math.min(30, Number(event.target.value || 10))))}
                data-testid="pathfinding-rows-input"
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Columns</p>
              <Input
                type="number"
                min={14}
                max={48}
                value={cols}
                onChange={(event) => setCols(Math.max(14, Math.min(48, Number(event.target.value || 14))))}
                data-testid="pathfinding-cols-input"
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Wall Density %</p>
              <Input
                type="number"
                min={5}
                max={45}
                value={density}
                onChange={(event) => setDensity(Math.max(5, Math.min(45, Number(event.target.value || 5))))}
                data-testid="pathfinding-density-input"
              />
            </div>
            <Button type="button" className="mt-6 rounded-full" onClick={regenerateGrid} data-testid="pathfinding-apply-grid-settings-button">
              Apply Grid Settings
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="pathfinding-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="pathfinding-canvas-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="pathfinding-current-action">
                {step.action}
              </CardTitle>
              <ComplexityBadge time={meta.time} space={meta.space} />
            </CardHeader>
            <CardContent className="space-y-4" ref={visualRef}>
              <GridBoard
                rows={grid.rows}
                cols={grid.cols}
                walls={grid.walls}
                start={grid.start}
                end={grid.end}
                step={step}
                onCellClick={toggleWall}
                testId="pathfinding-grid-board"
              />
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
        </div>

        <div className="space-y-4 lg:col-span-4">
          <StatsGrid stats={run.stats} />

          <Card className="border-border/70 bg-card/70" data-testid="pathfinding-debugger-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="pathfinding-debugger-title">
                Debugger State
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-56 overflow-auto rounded-xl border border-border/60 bg-background/70 p-3 font-code text-xs" data-testid="pathfinding-debugger-json">
                {JSON.stringify(step.internalState || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <CodePanel title={`${meta.label} Logic`} code={pathCode[algorithm] || pathCode.astar} />
        </div>
      </section>
    </PageMotionWrapper>
  );
}
