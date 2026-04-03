import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RefreshCw, RotateCcw, StepBack, StepForward, Volume2 } from "lucide-react";

import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { SortingBars } from "@/components/visuals/SortingBars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { nextFrame } from "@/helpers/animation";
import { highlightedPseudocode } from "@/helpers/pseudocodeHighlighter";
import { initialStats, statsFromStep } from "@/helpers/statsTracker";
import { recentStepMessages } from "@/helpers/stepTracker";
import {
  executeSortingSession,
  getSortingAlgorithms,
  getSortingInfo,
  playSortedWave,
  prepareSortingSession,
} from "@/modules/sorting/sortingVisualizer";
import {
  formatExecutionTime,
  generateSortingArray,
  speedToDelay,
} from "@/modules/sorting/sortingUtils";

const createIdleSortingStep = (values, description = "Ready") => ({
  type: "overwrite",
  indices: [],
  pointers: {},
  line: 0,
  description,
  pivotIndex: null,
  sorted: [],
  array: values,
  stats: { comparisons: 0, swaps: 0 },
});

const getSessionTotals = (sessionSteps) => {
  const finalStep = sessionSteps[sessionSteps.length - 1];

  return {
    comparisons: finalStep?.stats?.comparisons || 0,
    swaps: finalStep?.stats?.swaps || 0,
  };
};

export default function SortingPage() {
  const [algorithm, setAlgorithm] = useState("quick");
  const [arraySize, setArraySize] = useState(16);
  const [speed, setSpeed] = useState(100);
  const [array, setArray] = useState(() => generateSortingArray(16));
  const [initialRunArray, setInitialRunArray] = useState([]);
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stats, setStats] = useState(initialStats);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [waveIndex, setWaveIndex] = useState(-1);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonAlgorithm, setComparisonAlgorithm] = useState("merge");
  const [comparisonSteps, setComparisonSteps] = useState([]);

  const pauseRef = useRef(false);
  const abortRef = useRef(false);
  const audioRef = useRef(null);
  const previousArraySizeRef = useRef(arraySize);

  const algorithms = useMemo(() => getSortingAlgorithms(), []);
  const algorithmInfo = useMemo(() => getSortingInfo(algorithm), [algorithm]);
  const comparisonInfo = useMemo(() => getSortingInfo(comparisonAlgorithm), [comparisonAlgorithm]);
  const primaryPreviewSession = useMemo(
    () => prepareSortingSession(array, algorithm),
    [array, algorithm],
  );
  const comparisonPreviewSession = useMemo(() => {
    if (!comparisonEnabled) return null;
    const source = initialRunArray.length ? initialRunArray : array;
    return prepareSortingSession(source, comparisonAlgorithm);
  }, [comparisonEnabled, comparisonAlgorithm, initialRunArray, array]);
  const idlePrimaryStep = useMemo(() => createIdleSortingStep(array), [array]);
  const idleComparisonStep = useMemo(
    () => createIdleSortingStep(initialRunArray.length ? initialRunArray : array, "Ready to compare"),
    [array, initialRunArray],
  );

  const activeSteps = useMemo(
    () => (steps.length ? steps : (primaryPreviewSession?.steps || [])),
    [steps, primaryPreviewSession],
  );
  const lastStepIndex = Math.max(activeSteps.length - 1, 0);
  const displayStepIndex = Math.min(stepIndex, lastStepIndex);
  const activeComparisonSteps = useMemo(
    () => (comparisonSteps.length ? comparisonSteps : (comparisonPreviewSession?.steps || [])),
    [comparisonSteps, comparisonPreviewSession],
  );
  const comparisonDisplayIndex = Math.min(displayStepIndex, Math.max(activeComparisonSteps.length - 1, 0));
  const currentStep = activeSteps[displayStepIndex] || idlePrimaryStep;
  const comparisonStep = activeComparisonSteps[comparisonDisplayIndex] || idleComparisonStep;
  const primaryTotals = useMemo(() => getSessionTotals(activeSteps), [activeSteps]);
  const comparisonTotals = useMemo(() => getSessionTotals(activeComparisonSteps), [activeComparisonSteps]);
  const primaryPseudocode = useMemo(
    () => highlightedPseudocode(algorithmInfo.pseudocode, currentStep.line),
    [algorithmInfo.pseudocode, currentStep.line],
  );
  const comparisonPseudocode = useMemo(
    () => highlightedPseudocode(comparisonInfo.pseudocode, comparisonStep.line),
    [comparisonInfo.pseudocode, comparisonStep.line],
  );
  const comparisonStepMessages = useMemo(
    () => recentStepMessages(activeComparisonSteps, comparisonDisplayIndex, 10),
    [activeComparisonSteps, comparisonDisplayIndex],
  );

  const stepMessages = useMemo(
    () => recentStepMessages(activeSteps, displayStepIndex, 10),
    [activeSteps, displayStepIndex],
  );
  const primaryDisplayStats = useMemo(
    () => ({
      comparisons: currentStep?.stats?.comparisons || 0,
      swaps: currentStep?.stats?.swaps || 0,
      executionTimeMs: steps.length && displayStepIndex >= lastStepIndex ? stats.executionTimeMs : 0,
    }),
    [currentStep, steps.length, displayStepIndex, lastStepIndex, stats.executionTimeMs],
  );
  const comparisonDisplayStats = useMemo(
    () => ({
      comparisons: comparisonStep?.stats?.comparisons || 0,
      swaps: comparisonStep?.stats?.swaps || 0,
    }),
    [comparisonStep],
  );

  const playTone = (step) => {
    if (!audioEnabled || !["compare", "swap"].includes(step.type)) return;
    if (!step.indices?.length) return;
    const val = step.array[step.indices[0]] || 40;
    const freq = 160 + val * 6;

    if (!audioRef.current) {
      audioRef.current = new window.AudioContext();
    }

    const ctx = audioRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = step.type === "swap" ? "square" : "sine";
    gain.gain.value = 0.02;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  };

  const resetState = (nextArray) => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    setWaveIndex(-1);
    setSteps([]);
    setStepIndex(0);
    setStats(initialStats);
    setArray(nextArray);
    setComparisonSteps([]);
  };

  const generateArray = () => {
    const next = generateSortingArray(arraySize);
    setInitialRunArray(next);
    resetState(next);
    toast.success("New random array generated.");
  };

  useEffect(() => {
    if (isRunning || previousArraySizeRef.current === arraySize) {
      previousArraySizeRef.current = arraySize;
      return;
    }

    previousArraySizeRef.current = arraySize;
    const next = generateSortingArray(arraySize);
    setArray(next);
    setInitialRunArray(next);
  }, [arraySize, isRunning]);

  useEffect(() => {
    if (!steps.length) {
      setStepIndex(0);
      setIsCompleted(false);
      setWaveIndex(-1);
      setStats(initialStats);
    }
  }, [algorithm, array, comparisonAlgorithm, comparisonEnabled, steps.length]);

  const runSessionSteps = async ({ primarySteps, sourceLength }) => {
    setStepIndex(0);
    const result = await executeSortingSession({
      steps: primarySteps,
      onStep: (step, index, elapsedMs) => {
        setStepIndex(index);
        setArray(step.array);
        setStats(statsFromStep(step, elapsedMs));
      },
      getDelay: () => speedToDelay(speed),
      pauseRef,
      abortRef,
      onTone: playTone,
    });

    if (!result.completed || abortRef.current) {
      setIsRunning(false);
      return false;
    }

    setStats((prev) => ({ ...prev, executionTimeMs: result.elapsed }));
    setIsCompleted(true);
    setIsRunning(false);
    await playSortedWave({
      length: sourceLength,
      setWaveIndex,
      getDelay: () => speedToDelay(speed),
      abortRef,
    });
    return true;
  };

  const startSorting = async () => {
    if (isRunning) return;

    const sourceArray = [...array];
    setInitialRunArray(sourceArray);
    const session = prepareSortingSession(sourceArray, algorithm);
    const compareSession = comparisonEnabled
      ? prepareSortingSession(sourceArray, comparisonAlgorithm)
      : null;

    abortRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);
    setIsCompleted(false);
    setWaveIndex(-1);
    setSteps(session.steps);
    setComparisonSteps(compareSession?.steps || []);
    setStats(initialStats);
    setIsRunning(true);

    await nextFrame();
    await runSessionSteps({
      primarySteps: session.steps,
      sourceLength: sourceArray.length,
    });
  };

  const playbackSorting = async () => {
    const sourceSteps = activeSteps;
    if (isRunning || !sourceSteps.length) return;

    if (!steps.length) {
      setInitialRunArray([...array]);
      setSteps(sourceSteps);
      if (comparisonEnabled && !comparisonSteps.length) {
        setComparisonSteps(activeComparisonSteps);
      }
    }

    abortRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);
    setIsCompleted(false);
    setWaveIndex(-1);
    setIsRunning(true);
    await runSessionSteps({
      primarySteps: sourceSteps,
      sourceLength: initialRunArray.length || array.length,
    });
  };

  const pauseSorting = () => {
    if (!isRunning) return;
    pauseRef.current = true;
    setIsPaused(true);
  };

  const resumeSorting = () => {
    pauseRef.current = false;
    setIsPaused(false);
  };

  const resetSorting = () => {
    const fallback = initialRunArray.length ? [...initialRunArray] : generateSortingArray(arraySize);
    resetState(fallback);
    toast.info("Sorting reset.");
  };

  const jumpToStep = (targetIndex) => {
    const sourceSteps = activeSteps;
    if (!sourceSteps.length) return;

    const boundedIndex = Math.max(0, Math.min(targetIndex, lastStepIndex));
    const targetStep = sourceSteps[boundedIndex];
    const shouldMarkComplete = boundedIndex === lastStepIndex;

    if (!steps.length) {
      setInitialRunArray([...array]);
      setSteps(sourceSteps);
      if (comparisonEnabled && !comparisonSteps.length) {
        setComparisonSteps(activeComparisonSteps);
      }
    }

    abortRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setWaveIndex(-1);
    setStepIndex(boundedIndex);
    setArray(targetStep.array);
    setStats({
      ...statsFromStep(targetStep, 0),
      executionTimeMs: shouldMarkComplete ? stats.executionTimeMs : 0,
    });
    setIsCompleted(shouldMarkComplete);
  };

  return (
    <PageMotionWrapper testId="sorting-page">
      <Card className="border-border/70 bg-card/70" data-testid="sorting-advanced-controls-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="sorting-advanced-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="sorting-advanced-title">
                Advanced Sorting Visualizer
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="sorting-advanced-subtitle">
                Smooth animated swaps, live pointers, pseudocode highlighting, step tracker, and real-time statistics.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-border px-3 py-2" data-testid="sorting-audio-toggle-panel">
              <Volume2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Audio</span>
              <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} data-testid="sorting-audio-toggle" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4" data-testid="sorting-advanced-control-grid">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Algorithm</p>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger data-testid="sorting-algorithm-dropdown">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`sorting-algorithm-option-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div data-testid="sorting-array-size-panel">
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Array Size: {arraySize}</p>
              <input
                type="range"
                min="10"
                max="100"
                value={arraySize}
                onChange={(event) => setArraySize(Number(event.target.value))}
                className="w-full"
                data-testid="sorting-array-size-slider"
              />
            </div>

            <div data-testid="sorting-speed-panel">
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Speed: {speed}</p>
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                className="w-full"
                data-testid="sorting-speed-slider"
              />
              <p className="mt-1 flex justify-between text-[11px] text-muted-foreground" data-testid="sorting-speed-labels">
                <span>Slow (500ms)</span>
                <span>Fast (50ms)</span>
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2" data-testid="sorting-comparison-toggle-panel">
              <span className="text-sm font-medium">Comparison Mode</span>
              <Switch checked={comparisonEnabled} onCheckedChange={setComparisonEnabled} data-testid="sorting-comparison-toggle" />
            </div>
          </div>

          {comparisonEnabled && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="sorting-comparison-config-grid">
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Comparison Algorithm</p>
                <Select value={comparisonAlgorithm} onValueChange={setComparisonAlgorithm}>
                  <SelectTrigger data-testid="sorting-comparison-algorithm-dropdown">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {algorithms.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`sorting-comparison-option-${option.value}`}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3" data-testid="sorting-comparison-summary">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Dual Algorithm View</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Primary</p>
                    <p className="mt-1 text-sm font-semibold">{algorithmInfo.label}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Live: C {primaryDisplayStats.comparisons} | S {primaryDisplayStats.swaps}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: C {primaryTotals.comparisons} | S {primaryTotals.swaps}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">Comparison</p>
                    <p className="mt-1 text-sm font-semibold">{comparisonInfo.label}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Live: C {comparisonDisplayStats.comparisons} | S {comparisonDisplayStats.swaps}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: C {comparisonTotals.comparisons} | S {comparisonTotals.swaps}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2" data-testid="sorting-main-action-buttons">
            <Button type="button" variant="secondary" onClick={generateArray} data-testid="sorting-generate-array-button">
              <RefreshCw className="h-4 w-4" /> Generate Array
            </Button>
            <Button type="button" onClick={startSorting} disabled={isRunning && !isPaused} data-testid="sorting-start-button">
              <Play className="h-4 w-4" /> Start
            </Button>
            <Button type="button" variant="outline" onClick={pauseSorting} disabled={!isRunning || isPaused} data-testid="sorting-pause-button">
              <Pause className="h-4 w-4" /> Pause
            </Button>
            <Button type="button" variant="outline" onClick={resumeSorting} disabled={!isRunning || !isPaused} data-testid="sorting-resume-button">
              <Play className="h-4 w-4" /> Resume
            </Button>
            <Button type="button" variant="ghost" onClick={resetSorting} data-testid="sorting-reset-button">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button type="button" variant="outline" onClick={playbackSorting} disabled={isRunning || !activeSteps.length} data-testid="sorting-playback-button">
              <RefreshCw className="h-4 w-4" /> Playback
            </Button>
            <Button type="button" variant="outline" onClick={() => jumpToStep(displayStepIndex - 1)} disabled={isRunning || !activeSteps.length} data-testid="sorting-step-back-button">
              <StepBack className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={() => jumpToStep(displayStepIndex + 1)} disabled={isRunning || !activeSteps.length} data-testid="sorting-step-forward-button">
              <StepForward className="h-4 w-4" />
            </Button>
            <StepGuideDrawer
              algorithm={algorithmInfo.label}
              currentStep={displayStepIndex}
              action={currentStep.description}
              complexity={`${algorithmInfo.average}, ${algorithmInfo.space}`}
              internalState={{ pointers: currentStep.pointers, indices: currentStep.indices }}
            />
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="sorting-advanced-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="sorting-visualization-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="sorting-active-step-title">
                {currentStep.description}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SortingBars step={currentStep} waveIndex={waveIndex} testId="sorting-advanced-bars" />
              <TimelineSlider
                currentStep={displayStepIndex}
                maxStep={lastStepIndex}
                onChange={jumpToStep}
              />
              {isCompleted && (
                <p className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-600" data-testid="sorting-success-message">
                  Array Sorted Successfully
                </p>
              )}
            </CardContent>
          </Card>

          {comparisonEnabled && (
            <Card className="border-border/70 bg-card/70" data-testid="sorting-comparison-visual-card">
              <CardHeader>
                <CardTitle className="font-heading text-base" data-testid="sorting-comparison-visual-title">
                  Comparison View: {comparisonInfo.label}
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="sorting-comparison-step-description">
                  {comparisonStep.description}
                </p>
              </CardHeader>
              <CardContent>
                <SortingBars step={comparisonStep} waveIndex={-1} testId="sorting-comparison-bars" />
              </CardContent>
            </Card>
          )}

          <Card className="border-border/70 bg-card/70" data-testid="sorting-step-tracker-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-step-tracker-title">Step Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`grid gap-4 ${comparisonEnabled ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}
                data-testid="sorting-step-tracker-list"
              >
                <div>
                  {comparisonEnabled && (
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-primary/80">Primary timeline</p>
                  )}
                  <div className="space-y-2">
                    {stepMessages.length ? (
                      stepMessages.map((item) => (
                        <p key={item.id} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm" data-testid={`sorting-step-message-${item.id}`}>
                          {item.message}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="sorting-step-empty">No steps yet. Start sorting.</p>
                    )}
                  </div>
                </div>

                {comparisonEnabled && (
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-600">Comparison timeline</p>
                    <div className="space-y-2">
                      {comparisonStepMessages.length ? (
                        comparisonStepMessages.map((item) => (
                          <p
                            key={item.id}
                            className="rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-sm"
                            data-testid={`sorting-comparison-step-message-${item.id}`}
                          >
                            {item.message}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground" data-testid="sorting-comparison-step-empty">
                          No comparison steps yet. Start sorting.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="border-border/70 bg-card/70" data-testid="sorting-stats-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-stats-title">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-3 ${comparisonEnabled ? "grid-cols-1" : "grid-cols-1"}`}>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3" data-testid="sorting-primary-stats-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Primary</p>
                  <p className="mt-1 text-sm font-semibold">{algorithmInfo.label}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-stats-comparisons">
                      Live Comparisons: <strong>{primaryDisplayStats.comparisons}</strong>
                    </p>
                    <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-stats-swaps">
                      Live Swaps: <strong>{primaryDisplayStats.swaps}</strong>
                    </p>
                    <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-stats-total-comparisons">
                      Total Comparisons: <strong>{primaryTotals.comparisons}</strong>
                    </p>
                    <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-stats-total-swaps">
                      Total Swaps: <strong>{primaryTotals.swaps}</strong>
                    </p>
                    <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-stats-time">
                      Execution Time: <strong>{formatExecutionTime(primaryDisplayStats.executionTimeMs)}</strong>
                    </p>
                  </div>
                </div>

                {comparisonEnabled && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3" data-testid="sorting-comparison-stats-card">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-600">Comparison</p>
                    <p className="mt-1 text-sm font-semibold">{comparisonInfo.label}</p>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-comparison-live-comparisons">
                        Live Comparisons: <strong>{comparisonDisplayStats.comparisons}</strong>
                      </p>
                      <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-comparison-live-swaps">
                        Live Swaps: <strong>{comparisonDisplayStats.swaps}</strong>
                      </p>
                      <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-comparison-total-comparisons">
                        Total Comparisons: <strong>{comparisonTotals.comparisons}</strong>
                      </p>
                      <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-comparison-total-swaps">
                        Total Swaps: <strong>{comparisonTotals.swaps}</strong>
                      </p>
                      <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-comparison-step-count">
                        Captured Steps: <strong>{activeComparisonSteps.length}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="sorting-pseudocode-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-pseudocode-title">Pseudocode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-3 ${comparisonEnabled ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
                <div className="space-y-1 rounded-xl border border-border/60 bg-background/70 p-3 font-code text-xs" data-testid="sorting-pseudocode-lines">
                  {comparisonEnabled && (
                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-primary/80">{algorithmInfo.label}</p>
                  )}
                  {primaryPseudocode.map((line) => (
                    <p
                      key={line.lineNumber}
                      className={`rounded px-2 py-1 ${line.active ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
                      data-testid={`sorting-pseudocode-line-${line.lineNumber}`}
                    >
                      {line.lineNumber}. {line.text}
                    </p>
                  ))}
                </div>

                {comparisonEnabled && (
                  <div className="space-y-1 rounded-xl border border-border/60 bg-background/70 p-3 font-code text-xs" data-testid="sorting-comparison-pseudocode-lines">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600">{comparisonInfo.label}</p>
                    {comparisonPseudocode.map((line) => (
                      <p
                        key={line.lineNumber}
                        className={`rounded px-2 py-1 ${line.active ? "bg-emerald-500/20 text-emerald-700" : "text-muted-foreground"}`}
                        data-testid={`sorting-comparison-pseudocode-line-${line.lineNumber}`}
                      >
                        {line.lineNumber}. {line.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="sorting-algorithm-info-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-algorithm-info-title">Algorithm Information</CardTitle>
            </CardHeader>
            <CardContent className={`grid gap-3 text-sm ${comparisonEnabled ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                {comparisonEnabled && (
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-primary/80">Primary</p>
                )}
                <p data-testid="sorting-info-name"><strong>Name:</strong> {algorithmInfo.label}</p>
                <p data-testid="sorting-info-best"><strong>Best Case:</strong> {algorithmInfo.best}</p>
                <p data-testid="sorting-info-average"><strong>Average Case:</strong> {algorithmInfo.average}</p>
                <p data-testid="sorting-info-worst"><strong>Worst Case:</strong> {algorithmInfo.worst}</p>
                <p data-testid="sorting-info-space"><strong>Space Complexity:</strong> {algorithmInfo.space}</p>
              </div>

              {comparisonEnabled && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-emerald-600">Comparison</p>
                  <p data-testid="sorting-comparison-info-name"><strong>Name:</strong> {comparisonInfo.label}</p>
                  <p data-testid="sorting-comparison-info-best"><strong>Best Case:</strong> {comparisonInfo.best}</p>
                  <p data-testid="sorting-comparison-info-average"><strong>Average Case:</strong> {comparisonInfo.average}</p>
                  <p data-testid="sorting-comparison-info-worst"><strong>Worst Case:</strong> {comparisonInfo.worst}</p>
                  <p data-testid="sorting-comparison-info-space"><strong>Space Complexity:</strong> {comparisonInfo.space}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageMotionWrapper>
  );
}
