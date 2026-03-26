import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RefreshCw, RotateCcw, Volume2 } from "lucide-react";

import { AITutorDrawer } from "@/components/common/AITutorDrawer";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
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

export default function SortingPage() {
  const [algorithm, setAlgorithm] = useState("quick");
  const [arraySize, setArraySize] = useState(40);
  const [speed, setSpeed] = useState(55);
  const [array, setArray] = useState(() => generateSortingArray(40));
  const [initialRunArray, setInitialRunArray] = useState([]);
  const [steps, setSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stats, setStats] = useState(initialStats);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [waveIndex, setWaveIndex] = useState(-1);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const pauseRef = useRef(false);
  const abortRef = useRef(false);
  const audioRef = useRef(null);

  const algorithms = useMemo(() => getSortingAlgorithms(), []);
  const algorithmInfo = useMemo(() => getSortingInfo(algorithm), [algorithm]);

  const currentStep =
    steps[stepIndex] || {
      type: "overwrite",
      indices: [],
      pointers: {},
      line: 0,
      description: "Ready",
      pivotIndex: null,
      sorted: [],
      array,
      stats: { comparisons: 0, swaps: 0 },
    };

  const stepMessages = useMemo(
    () => recentStepMessages(steps, stepIndex, 10),
    [steps, stepIndex],
  );

  const pseudocode = useMemo(
    () => highlightedPseudocode(algorithmInfo.pseudocode, currentStep.line),
    [algorithmInfo.pseudocode, currentStep.line],
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
  };

  const generateArray = () => {
    const next = generateSortingArray(arraySize);
    setInitialRunArray(next);
    resetState(next);
    toast.success("New random array generated.");
  };

  useEffect(() => {
    if (!isRunning) {
      const next = generateSortingArray(arraySize);
      setArray(next);
      setInitialRunArray(next);
    }
  }, [arraySize]);

  const startSorting = async () => {
    if (isRunning) return;

    const sourceArray = [...array];
    setInitialRunArray(sourceArray);
    const session = prepareSortingSession(sourceArray, algorithm);

    abortRef.current = false;
    pauseRef.current = false;
    setIsPaused(false);
    setIsCompleted(false);
    setWaveIndex(-1);
    setSteps(session.steps);
    setStepIndex(0);
    setStats(initialStats);
    setIsRunning(true);

    await nextFrame();
    const result = await executeSortingSession({
      steps: session.steps,
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
      return;
    }

    setStats((prev) => ({ ...prev, executionTimeMs: result.elapsed }));
    setIsCompleted(true);
    await playSortedWave({
      length: sourceArray.length,
      setWaveIndex,
      getDelay: () => speedToDelay(speed),
      abortRef,
    });
    setIsRunning(false);
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3" data-testid="sorting-advanced-control-grid">
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
          </div>

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
            <AITutorDrawer
              algorithm={algorithmInfo.label}
              currentStep={stepIndex}
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
              {isCompleted && (
                <p className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-600" data-testid="sorting-success-message">
                  Array Sorted Successfully
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="sorting-step-tracker-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-step-tracker-title">Step Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2" data-testid="sorting-step-tracker-list">
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="border-border/70 bg-card/70" data-testid="sorting-stats-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-stats-title">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-stats-comparisons">
                  Comparisons: <strong>{stats.comparisons}</strong>
                </p>
                <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-stats-swaps">
                  Swaps: <strong>{stats.swaps}</strong>
                </p>
                <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm" data-testid="sorting-stats-time">
                  Execution Time: <strong>{formatExecutionTime(stats.executionTimeMs)}</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="sorting-pseudocode-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-pseudocode-title">Pseudocode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 rounded-xl border border-border/60 bg-background/70 p-3 font-code text-xs" data-testid="sorting-pseudocode-lines">
                {pseudocode.map((line) => (
                  <p
                    key={line.lineNumber}
                    className={`rounded px-2 py-1 ${line.active ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
                    data-testid={`sorting-pseudocode-line-${line.lineNumber}`}
                  >
                    {line.lineNumber}. {line.text}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="sorting-algorithm-info-panel">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="sorting-algorithm-info-title">Algorithm Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p data-testid="sorting-info-name"><strong>Name:</strong> {algorithmInfo.label}</p>
              <p data-testid="sorting-info-best"><strong>Best Case:</strong> {algorithmInfo.best}</p>
              <p data-testid="sorting-info-average"><strong>Average Case:</strong> {algorithmInfo.average}</p>
              <p data-testid="sorting-info-worst"><strong>Worst Case:</strong> {algorithmInfo.worst}</p>
              <p data-testid="sorting-info-space"><strong>Space Complexity:</strong> {algorithmInfo.space}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageMotionWrapper>
  );
}
