import { useMemo, useRef, useState } from "react";
import { Download, RefreshCcw, Save } from "lucide-react";

import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
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
import { mazeMeta } from "@/data/algorithmMeta";
import { exportSnapshot } from "@/utils/exporters";
import { mazeAlgorithmOptions, runMazeGenerator } from "@/utils/mazeAlgorithms";

const gridToWalls = (grid) => {
  const walls = [];
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      if (grid[row][col] === 0) {
        walls.push(`${row}-${col}`);
      }
    }
  }
  return walls;
};

export default function MazePage() {
  const [algorithm, setAlgorithm] = useState("backtracking");
  const [rows, setRows] = useState(21);
  const [cols, setCols] = useState(35);
  const [seed, setSeed] = useState(0);
  const visualRef = useRef(null);

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();
  const maze = useMemo(() => runMazeGenerator({ rows, cols, algorithm, seed }), [rows, cols, algorithm, seed]);
  const playback = usePlayback({ steps: maze.steps, speed: globalSpeed, shortcutsEnabled });

  const rawStep = maze.steps[playback.currentStep] || maze.steps[0] || {
    grid: Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0)),
    action: "Ready",
    stats: {},
  };
  const step = {
    ...rawStep,
    visited: [],
    frontier: [],
    path: [],
    internalState: { rows, cols, algorithm },
  };

  const meta = mazeMeta[algorithm] || mazeMeta.backtracking;

  const regenerateMaze = () => {
    setSeed((prev) => prev + 1);
    toast.success("Maze regenerated.");
  };

  const saveMazeRun = async () => {
    try {
      await saveRun({
        module: "maze",
        algorithm,
        title: `${meta.label} run`,
        dataset_config: { rows, cols, seed },
        steps: maze.steps,
        stats: maze.stats,
        complexity: { time: meta.time, space: meta.space },
        tags: ["maze", algorithm],
      });
      toast.success("Maze run saved.");
    } catch {
      toast.error("Unable to save maze run.");
    }
  };

  return (
    <PageMotionWrapper testId="maze-page">
      <Card className="border-border/70 bg-card/70" data-testid="maze-header-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="maze-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="maze-page-title">Maze Generator</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="maze-page-subtitle">
                Recursive Backtracking, Prim, Kruskal, and Division-based generation with timeline replay.
              </p>
            </div>
            <div className="flex gap-2" data-testid="maze-header-actions">
              <Button type="button" variant="outline" onClick={regenerateMaze} data-testid="maze-regenerate-button">
                <RefreshCcw className="h-4 w-4" /> Regenerate
              </Button>
              <Button type="button" variant="outline" onClick={saveMazeRun} data-testid="maze-save-run-button">
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => visualRef.current && exportSnapshot(visualRef.current, "maze-run.png")}
                data-testid="maze-export-png-button"
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

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="maze-config-controls">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Algorithm</p>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger data-testid="maze-algorithm-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mazeAlgorithmOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`maze-algorithm-option-${option.value}`}>
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
                min={15}
                max={41}
                step={2}
                value={rows}
                onChange={(event) => setRows(Math.max(15, Math.min(41, Number(event.target.value || 15))) | 1)}
                data-testid="maze-rows-input"
              />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Cols</p>
              <Input
                type="number"
                min={21}
                max={61}
                step={2}
                value={cols}
                onChange={(event) => setCols(Math.max(21, Math.min(61, Number(event.target.value || 21))) | 1)}
                data-testid="maze-cols-input"
              />
            </div>
            <Button type="button" className="mt-6 rounded-full" onClick={regenerateMaze} data-testid="maze-apply-settings-button">
              Apply Settings
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="maze-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="maze-canvas-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="maze-current-action">{step.action}</CardTitle>
              <ComplexityBadge time={meta.time} space={meta.space} />
            </CardHeader>
            <CardContent className="space-y-4" ref={visualRef}>
              <GridBoard
                rows={step.grid.length}
                cols={step.grid[0]?.length || 0}
                walls={gridToWalls(step.grid)}
                start={{ row: 1, col: 1 }}
                end={{ row: step.grid.length - 2, col: (step.grid[0]?.length || 2) - 2 }}
                step={step}
                testId="maze-grid-board"
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
          <StatsGrid stats={maze.stats} />
          <Card className="border-border/70 bg-card/70" data-testid="maze-explainer-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="maze-explainer-title">Generation Story</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p data-testid="maze-story-step">Step {playback.currentStep}: {step.action}</p>
              <p className="text-muted-foreground" data-testid="maze-story-text">
                Observe how walls open and corridors form. This progression is replayable via timeline slider and controls.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageMotionWrapper>
  );
}
