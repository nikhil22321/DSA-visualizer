import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  FileVideo,
  Gauge,
  GitCompare,
  Link2,
  Save,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { BenchmarkChart } from "@/components/analytics/BenchmarkChart";
import { AITutorDrawer } from "@/components/common/AITutorDrawer";
import { CodePanel } from "@/components/common/CodePanel";
import { ComplexityBadge } from "@/components/common/ComplexityBadge";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { SortingBars } from "@/components/visuals/SortingBars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { usePlayback } from "@/hooks/usePlayback";
import { getRecommendation, getSharedRun, saveRun } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { createDataset, generateSortingRun, sortingAlgorithmOptions } from "@/utils/sortingAlgorithms";
import { exportGif, exportSnapshot, exportVideo } from "@/utils/exporters";
import { sortingMeta } from "@/data/algorithmMeta";

const presetOptions = [
  { value: "random", label: "Random" },
  { value: "nearly", label: "Nearly Sorted" },
  { value: "reverse", label: "Reverse Sorted" },
  { value: "few-unique", label: "Few Unique" },
];

const frameFromArray = (array) => {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const maxValue = Math.max(...array, 1);
  const barWidth = canvas.width / array.length;

  array.forEach((value, index) => {
    const barHeight = (value / maxValue) * 320;
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(index * barWidth + 1, canvas.height - barHeight - 40, Math.max(barWidth - 2, 2), barHeight);
  });

  ctx.fillStyle = "#9ca3af";
  ctx.font = "18px JetBrains Mono";
  ctx.fillText("AlgoViz Pro Sorting Replay", 20, 28);
  return canvas.toDataURL("image/png");
};

export default function SortingPage() {
  const [searchParams] = useSearchParams();
  const visualRef = useRef(null);

  const [algorithm, setAlgorithm] = useState("quick");
  const [leftAlgorithm, setLeftAlgorithm] = useState("quick");
  const [rightAlgorithm, setRightAlgorithm] = useState("merge");
  const [preset, setPreset] = useState("random");
  const [size, setSize] = useState(42);
  const [customInput, setCustomInput] = useState("");
  const [dataset, setDataset] = useState(() => createDataset(42, "random"));
  const [comparisonMode, setComparisonMode] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();

  const run = useMemo(() => generateSortingRun(dataset, algorithm), [dataset, algorithm]);
  const leftRun = useMemo(() => generateSortingRun(dataset, leftAlgorithm), [dataset, leftAlgorithm]);
  const rightRun = useMemo(() => generateSortingRun(dataset, rightAlgorithm), [dataset, rightAlgorithm]);

  const playback = usePlayback({ steps: run.steps, speed: globalSpeed, shortcutsEnabled: !comparisonMode && shortcutsEnabled });
  const compareSteps = useMemo(
    () => Array.from({ length: Math.max(leftRun.steps.length, rightRun.steps.length, 1) }, (_, i) => ({ i })),
    [leftRun.steps.length, rightRun.steps.length],
  );
  const comparePlayback = usePlayback({ steps: compareSteps, speed: globalSpeed, shortcutsEnabled: comparisonMode && shortcutsEnabled });

  const currentStep = comparisonMode
    ? comparePlayback.currentStep
    : playback.currentStep;

  const currentMainStep = run.steps[playback.currentStep] || run.steps[0];
  const leftStep = leftRun.steps[comparePlayback.currentStep] || leftRun.steps[leftRun.steps.length - 1] || { array: [] };
  const rightStep = rightRun.steps[comparePlayback.currentStep] || rightRun.steps[rightRun.steps.length - 1] || { array: [] };

  const activeMeta = sortingMeta[algorithm] || sortingMeta.bubble;
  const benchmarkData = useMemo(() => {
    const sizes = [20, 40, 80, 120];
    return sizes.map((n) => {
      const sample = createDataset(n, preset);
      const t1 = performance.now();
      const a = generateSortingRun(sample, leftAlgorithm);
      const t2 = performance.now();
      const b = generateSortingRun(sample, rightAlgorithm);
      const t3 = performance.now();
      return {
        size: n,
        leftOps: a.stats.comparisons + a.stats.swaps,
        rightOps: b.stats.comparisons + b.stats.swaps,
        leftMs: Number((t2 - t1).toFixed(2)),
        rightMs: Number((t3 - t2).toFixed(2)),
      };
    });
  }, [leftAlgorithm, rightAlgorithm, preset]);

  useEffect(() => {
    const token = searchParams.get("shared");
    if (!token) return;

    const loadSharedRun = async () => {
      try {
        setLoadingShare(true);
        const shared = await getSharedRun(token);
        if (shared.module !== "sorting") {
          toast.error("This shared run belongs to another module.");
          return;
        }
        if (Array.isArray(shared.dataset_config?.dataset) && shared.dataset_config.dataset.length > 3) {
          setDataset(shared.dataset_config.dataset);
          setSize(shared.dataset_config.dataset.length);
        }
        if (shared.algorithm) setAlgorithm(shared.algorithm);
        toast.success("Shared sorting run loaded.");
      } catch (error) {
        toast.error("Unable to load shared run.");
      } finally {
        setLoadingShare(false);
      }
    };
    loadSharedRun();
  }, [searchParams]);

  const regenerateDataset = () => {
    const next = createDataset(size, preset);
    setDataset(next);
    toast.success("Dataset regenerated.");
  };

  const applyCustomInput = () => {
    const numbers = customInput
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((value) => Number.isFinite(value));
    if (numbers.length < 5) {
      toast.error("Enter at least 5 comma-separated numbers.");
      return;
    }
    setDataset(numbers);
    setSize(numbers.length);
    toast.success("Custom dataset applied.");
  };

  const saveAndShareRun = async () => {
    try {
      const result = await saveRun({
        module: "sorting",
        algorithm,
        title: `${activeMeta.label} run`,
        dataset_config: { preset, size, dataset },
        steps: run.steps.slice(0, 500),
        stats: run.stats,
        complexity: { time: activeMeta.time, space: activeMeta.space },
        tags: ["sorting", preset],
      });
      const shareUrl = `${window.location.origin}/sorting?shared=${result.share_token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Run saved and share link copied.");
    } catch (error) {
      toast.error("Failed to save this run.");
    }
  };

  const createAnimationFrames = (steps) => {
    const stride = Math.max(Math.floor(steps.length / 60), 1);
    return steps.filter((_, idx) => idx % stride === 0).map((step) => frameFromArray(step.array || []));
  };

  const downloadSnapshot = async () => {
    if (!visualRef.current) return;
    await exportSnapshot(visualRef.current, "sorting-visualization.png");
    toast.success("PNG snapshot exported.");
  };

  const downloadGif = async () => {
    try {
      const frames = createAnimationFrames(run.steps);
      await exportGif(frames, "sorting-run.gif");
      toast.success("GIF exported.");
    } catch {
      toast.error("Unable to export GIF.");
    }
  };

  const downloadVideo = async () => {
    try {
      const frames = createAnimationFrames(run.steps);
      await exportVideo(frames, "sorting-run.mp4");
      toast.success("Video exported.");
    } catch {
      toast.error("Unable to export video.");
    }
  };

  const requestRecommendation = async () => {
    try {
      setLoadingRecommendation(true);
      const result = await getRecommendation({
        domain: "sorting",
        input_size: dataset.length,
        input_type: preset,
        memory_sensitive: false,
        stability_required: algorithm === "merge",
      });
      setRecommendation(result);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  return (
    <PageMotionWrapper testId="sorting-page">
      <Card className="border-border/70 bg-card/70" data-testid="sorting-controls-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="sorting-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="sorting-page-title">
                Sorting Visualizer
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="sorting-page-subtitle">
                Playback controls, timeline replay, side-by-side comparison, and performance benchmarking.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-border px-3 py-2" data-testid="sorting-comparison-switch">
              <GitCompare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Comparison Mode</span>
              <Switch
                checked={comparisonMode}
                onCheckedChange={setComparisonMode}
                data-testid="sorting-comparison-mode-toggle"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-testid="sorting-input-controls">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Algorithm</p>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger data-testid="sorting-algorithm-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortingAlgorithmOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`sorting-algorithm-option-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Dataset Preset</p>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger data-testid="sorting-preset-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`sorting-preset-option-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Array Size</p>
              <Input
                type="number"
                min={10}
                max={180}
                value={size}
                onChange={(event) => setSize(Math.max(10, Math.min(180, Number(event.target.value || 10))))}
                data-testid="sorting-array-size-input"
              />
            </div>

            <Button type="button" variant="secondary" className="mt-6 rounded-full" onClick={regenerateDataset} data-testid="sorting-regenerate-dataset-button">
              <WandSparkles className="h-4 w-4" /> Generate Dataset
            </Button>

            <Button
              type="button"
              variant="outline"
              className="mt-6 rounded-full"
              onClick={requestRecommendation}
              data-testid="sorting-recommendation-button"
              disabled={loadingRecommendation}
            >
              <Gauge className="h-4 w-4" /> {loadingRecommendation ? "Analyzing" : "Recommend"}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]" data-testid="sorting-custom-input-row">
            <Input
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              placeholder="Custom input, e.g. 45,23,89,12,64"
              data-testid="sorting-custom-input-field"
            />
            <Button type="button" variant="secondary" onClick={applyCustomInput} data-testid="sorting-custom-input-apply-button">
              Apply Custom Input
            </Button>
          </div>

          {recommendation && (
            <div className="rounded-xl border border-primary/50 bg-primary/10 p-3 text-sm" data-testid="sorting-recommendation-result">
              <p><strong>{recommendation.recommendation}</strong> — {recommendation.rationale}</p>
              <p className="mt-1 text-xs text-muted-foreground">Alternatives: {recommendation.alternatives.join(", ")}</p>
            </div>
          )}
          {loadingShare && (
            <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-sm" data-testid="sorting-shared-loading">
              Loading shared run...
            </div>
          )}
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="sorting-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="sorting-canvas-card">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-xl" data-testid="sorting-current-algorithm-title">
                    {comparisonMode ? "Algorithm Comparison Workspace" : activeMeta.label}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground" data-testid="sorting-current-step-action">
                    {comparisonMode
                      ? `Compare ${leftAlgorithm} vs ${rightAlgorithm}`
                      : currentMainStep?.action || "Ready"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2" data-testid="sorting-export-buttons">
                  <AITutorDrawer
                    algorithm={algorithm}
                    currentStep={playback.currentStep}
                    action={currentMainStep?.action || "No action"}
                    complexity={`${activeMeta.time}, ${activeMeta.space}`}
                    internalState={currentMainStep?.internalState}
                  />
                  <Button type="button" variant="outline" onClick={saveAndShareRun} data-testid="sorting-save-share-button">
                    <Save className="h-4 w-4" /> Save
                  </Button>
                  <Button type="button" variant="outline" onClick={downloadSnapshot} data-testid="sorting-export-png-button">
                    <Download className="h-4 w-4" /> PNG
                  </Button>
                  <Button type="button" variant="outline" onClick={downloadGif} data-testid="sorting-export-gif-button">
                    <Sparkles className="h-4 w-4" /> GIF
                  </Button>
                  <Button type="button" variant="outline" onClick={downloadVideo} data-testid="sorting-export-video-button">
                    <FileVideo className="h-4 w-4" /> MP4
                  </Button>
                </div>
              </div>

              <ComplexityBadge time={activeMeta.time} space={activeMeta.space} />
            </CardHeader>
            <CardContent className="space-y-4">
              {comparisonMode ? (
                <>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="sorting-comparison-canvases" ref={visualRef}>
                    <div>
                      <p className="mb-2 text-sm font-semibold" data-testid="sorting-left-algo-label">A: {sortingMeta[leftAlgorithm].label}</p>
                      <SortingBars step={leftStep} testId="sorting-left-bars" />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold" data-testid="sorting-right-algo-label">B: {sortingMeta[rightAlgorithm].label}</p>
                      <SortingBars step={rightStep} testId="sorting-right-bars" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="sorting-comparison-selectors">
                    <Select value={leftAlgorithm} onValueChange={setLeftAlgorithm}>
                      <SelectTrigger data-testid="sorting-left-algorithm-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortingAlgorithmOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={rightAlgorithm} onValueChange={setRightAlgorithm}>
                      <SelectTrigger data-testid="sorting-right-algorithm-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortingAlgorithmOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ControlCluster
                    isPlaying={comparePlayback.isPlaying}
                    onPlayToggle={() => comparePlayback.setIsPlaying((prev) => !prev)}
                    onStepForward={comparePlayback.stepForward}
                    onStepBack={comparePlayback.stepBack}
                    onReset={comparePlayback.reset}
                    speed={globalSpeed}
                    onSpeedChange={setGlobalSpeed}
                  />
                  <TimelineSlider
                    currentStep={comparePlayback.currentStep}
                    maxStep={comparePlayback.maxStep}
                    onChange={comparePlayback.jumpToStep}
                  />
                </>
              ) : (
                <>
                  <div ref={visualRef} data-testid="sorting-single-canvas-wrapper">
                    <SortingBars step={currentMainStep} testId="sorting-single-bars" />
                  </div>
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
                </>
              )}
            </CardContent>
          </Card>

          <BenchmarkChart data={benchmarkData} title="Benchmark Engine: Ops + Runtime Growth" />
        </div>

        <div className="space-y-4 lg:col-span-4">
          <StatsGrid stats={comparisonMode ? leftRun.stats : run.stats} />

          <Card className="border-border/70 bg-card/70" data-testid="sorting-explanation-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-explanation-title">
                Algorithm Story Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p data-testid="sorting-story-step">Step {currentStep}: {comparisonMode ? "Comparative progression" : currentMainStep?.action}</p>
              <p className="text-muted-foreground" data-testid="sorting-story-description">
                {activeMeta.note}
              </p>
              <div className="rounded-xl border border-border/70 bg-background/70 p-3 text-xs" data-testid="sorting-story-next-watch">
                <strong>Watch next:</strong> Observe how partitioning/merging choices affect operation count and stability.
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 p-3 text-xs" data-testid="sorting-shareability-note">
                <Link2 className="mr-2 inline h-3.5 w-3.5" />
                Save to generate shareable replay URL.
              </div>
            </CardContent>
          </Card>

          <CodePanel title={`${activeMeta.label} Pseudocode`} code={activeMeta.code} />
        </div>
      </section>
    </PageMotionWrapper>
  );
}
