import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Layers3, RotateCcw, Sparkles, Waves } from "lucide-react";

import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { highlightedPseudocode } from "@/helpers/pseudocodeHighlighter";
import { stepMessageFromPayload } from "@/helpers/stepTracker";
import {
  createStackQueueInitialStep,
  executeStackQueueSession,
  getStackQueuePseudocode,
  prepareStackQueueSession,
} from "@/modules/stackQueue/stackQueueVisualizer";
import {
  DEFAULT_STATUS_TEXT,
  STACK_QUEUE_MAX_CAPACITY,
  STACK_QUEUE_MODES,
  getInspectActionLabel,
  getModeMeta,
  getOperationLabel,
  getOutputText,
  getPrimaryActionLabel,
  getSecondaryActionLabel,
  getStatusFromMode,
} from "@/modules/stackQueue/stackQueueUtils";
import { useAppStore } from "@/store/useAppStore";

const toneClasses = {
  default:
    "border-sky-400/45 bg-[linear-gradient(180deg,rgba(59,130,246,0.3),rgba(15,23,42,0.92))] text-slate-100 shadow-[0_16px_36px_rgba(37,99,235,0.2)]",
  active:
    "border-amber-300/70 bg-[linear-gradient(180deg,rgba(245,158,11,0.45),rgba(113,63,18,0.92))] text-amber-50 shadow-[0_18px_44px_rgba(245,158,11,0.28)]",
  removed:
    "border-rose-400/70 bg-[linear-gradient(180deg,rgba(239,68,68,0.38),rgba(69,10,10,0.94))] text-rose-50 shadow-[0_18px_44px_rgba(239,68,68,0.26)]",
};

const toneGlow = {
  default: "hover:shadow-[0_22px_46px_rgba(59,130,246,0.28)]",
  active: "hover:shadow-[0_22px_46px_rgba(245,158,11,0.35)]",
  removed: "hover:shadow-[0_22px_46px_rgba(239,68,68,0.34)]",
};

const formatExecutionTime = (ms = 0) => `${(ms / 1000).toFixed(2)}s`;

const StatCard = ({ label, value, icon: Icon, accent = "text-sky-200" }) => (
  <div className="rounded-3xl border border-border/70 bg-background/75 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.22)]">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <Icon className={`h-4 w-4 ${accent}`} />
    </div>
    <p className="mt-3 font-code text-2xl font-semibold text-slate-100">{value}</p>
  </div>
);

const StructurePointer = ({ pointer }) => (
  <div
    className="absolute z-20 transition-all duration-300 ease-in-out"
    style={{
      transform: `translate(${pointer.x}px, ${pointer.y}px)`,
    }}
  >
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-full border border-white/25 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.18)]">
        {pointer.label}
      </div>
      <div className="h-6 w-px bg-white/75" />
      <div className="h-0 w-0 border-x-[6px] border-x-transparent border-t-[9px] border-t-white/90" />
    </div>
  </div>
);

const StructureBlock = ({ item }) => (
  <div
    className={`group absolute rounded-2xl border backdrop-blur-sm ${toneClasses[item.tone] || toneClasses.default} ${toneGlow[item.tone] || toneGlow.default}`}
    style={{
      width: 132,
      height: 58,
      opacity: item.opacity,
      zIndex: item.zIndex,
      transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale})`,
      transition:
        "transform 0.3s ease-in-out, opacity 0.3s ease-in-out, box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out, background 0.3s ease-in-out",
    }}
  >
    <div className="flex h-full items-center justify-center rounded-2xl px-4 text-center font-code text-xl font-semibold tracking-[0.08em]">
      [{` ${item.value} `}]
    </div>
  </div>
);

const StackQueueStage = ({ step }) => {
  const modeMeta = getModeMeta(step.mode);

  return (
    <div className="space-y-4 rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.5)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-sky-100/75">Visualization</p>
          <p className="mt-1 text-sm text-slate-300">
            {modeMeta.label} demonstrating {modeMeta.behavior} flow with animated pointers and step states.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
          Capacity {step.items.length}/{STACK_QUEUE_MAX_CAPACITY}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative mx-auto rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.64),rgba(15,23,42,0.98))]"
          style={{
            width: step.stage.width,
            minWidth: step.stage.width,
            height: step.stage.height,
          }}
        >
          <div
            className={`absolute inset-x-10 ${
              step.mode === "stack"
                ? "bottom-10 top-16 rounded-[1.4rem] border-2 border-dashed border-sky-300/20"
                : "left-8 right-8 top-[118px] h-[82px] rounded-[1.4rem] border-2 border-dashed border-sky-300/20"
            }`}
          />

          {step.pointers.map((pointer) => (
            <StructurePointer key={pointer.key} pointer={pointer} />
          ))}

          <AnimatePresence initial={false}>
            {step.visualItems.map((item) => (
              <motion.div key={item.id} layout>
                <StructureBlock item={item} />
              </motion.div>
            ))}
          </AnimatePresence>

          {!step.visualItems.length ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-300 shadow-[0_18px_48px_rgba(15,23,42,0.36)]">
                {step.mode === "stack"
                  ? "The stack is empty. Push a value to watch the top grow upward."
                  : "The queue is empty. Enqueue a value to watch FIFO behavior form left to right."}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const TrackerCard = ({ steps, stepIndex }) => {
  const start = Math.max(0, stepIndex - 5);
  const visibleSteps = steps.slice(start, stepIndex + 1).map((step, index) => {
    const absoluteIndex = start + index;
    return {
      id: `${step.operation}-${absoluteIndex}-${step.description}`,
      absoluteIndex,
      message: stepMessageFromPayload(step, absoluteIndex),
    };
  });

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader>
        <CardTitle className="font-heading text-base">Step Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleSteps.length ? (
          visibleSteps.map((item, index) => {
            const isCurrent = index === visibleSteps.length - 1;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border px-3 py-2 text-sm transition-colors ${
                  isCurrent
                    ? "border-amber-300/55 bg-amber-400/14 text-amber-50 shadow-[0_8px_28px_rgba(245,158,11,0.14)]"
                    : "border-border/60 bg-background/70 text-slate-300"
                }`}
              >
                {item.message}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">Run an operation to generate step-by-step guidance.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default function StackQueueModulePage({
  initialMode = "stack",
  pageTestId = "stack-queue-page",
}) {
  const [mode, setMode] = useState(initialMode);
  const [valueInput, setValueInput] = useState("10");
  const [items, setItems] = useState([]);
  const [steps, setSteps] = useState(() => [createStackQueueInitialStep({ mode: initialMode, items: [], operationCount: 0 })]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [operationTotal, setOperationTotal] = useState(0);
  const [runtimeStats, setRuntimeStats] = useState({ executionTimeMs: 0 });
  const [latestResult, setLatestResult] = useState({
    title: initialMode === "stack" ? "Stack" : "Queue",
    value: getOutputText(initialMode, []),
    outputText: getOutputText(initialMode, []),
    statusText: DEFAULT_STATUS_TEXT,
    executionTimeMs: 0,
    operationCount: 0,
    severity: "success",
  });

  const idRef = useRef(0);
  const inputRef = useRef(null);
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();
  const currentStep = steps[stepIndex] || steps[0];

  useEffect(() => {
    setMode(initialMode);
    setItems([]);
    setSteps([createStackQueueInitialStep({ mode: initialMode, items: [], operationCount: 0 })]);
    setStepIndex(0);
    setOperationTotal(0);
    setRuntimeStats({ executionTimeMs: 0 });
    setLatestResult({
      title: initialMode === "stack" ? "Stack" : "Queue",
      value: getOutputText(initialMode, []),
      outputText: getOutputText(initialMode, []),
      statusText: DEFAULT_STATUS_TEXT,
      executionTimeMs: 0,
      operationCount: 0,
      severity: "success",
    });
  }, [initialMode]);

  const pseudocodeLines = useMemo(
    () => highlightedPseudocode(getStackQueuePseudocode(currentStep?.operation), currentStep?.line),
    [currentStep],
  );

  const displayedStats = {
    operationCount: currentStep?.stats?.operationCount ?? operationTotal,
    elementsCount: currentStep?.stats?.elementsCount ?? items.length,
    executionTimeMs: isRunning ? runtimeStats.executionTimeMs : latestResult.executionTimeMs || 0,
  };

  const modeMeta = getModeMeta(mode);
  const primaryAction = mode === "stack" ? "push" : "enqueue";
  const secondaryAction = mode === "stack" ? "pop" : "dequeue";
  const inspectAction = mode === "stack" ? "peek" : "front";
  const activeResult = currentStep?.result || latestResult;
  const workingItems = currentStep?.items ?? items;
  const workingOperationCount = currentStep?.stats?.operationCount ?? operationTotal;

  const createId = useCallback(() => {
    idRef.current += 1;
    return `sq-item-${idRef.current}`;
  }, []);

  const focusValueInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const commitIdleStep = useCallback((nextMode, nextItems, nextOperationCount, nextResult) => {
    const idle = createStackQueueInitialStep({
      mode: nextMode,
      items: nextItems,
      operationCount: nextOperationCount,
      executionTimeMs: nextResult.executionTimeMs || 0,
      outputText: nextResult.outputText || getOutputText(nextMode, nextItems),
      statusText: nextResult.statusText || getStatusFromMode(nextMode, nextItems),
    });

    setSteps([idle]);
    setStepIndex(0);
  }, []);

  const runPlayback = useCallback(async (startIndex = 0, sequence = steps) => {
    if (!sequence.length) return;

    const trimmedSteps = sequence.slice(startIndex);
    abortRef.current = false;
    pauseRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    setRuntimeStats({ executionTimeMs: 0 });

    const result = await executeStackQueueSession({
      steps: trimmedSteps,
      onStep: (step, index, elapsedMs) => {
        setStepIndex(startIndex + index);
        setRuntimeStats({
          executionTimeMs: elapsedMs,
        });
      },
      getDelay: () => Math.max(globalSpeed, 120),
      pauseRef,
      abortRef,
    });

    setIsRunning(false);
    setIsPaused(false);
    if (!result.completed) return;
    setRuntimeStats({
      executionTimeMs: result.elapsed,
    });
  }, [globalSpeed, steps]);

  const handleModeChange = useCallback((nextMode) => {
    if (nextMode === mode) return;

    abortRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setMode(nextMode);
    setItems(workingItems);

    const nextResult = {
      title: nextMode === "stack" ? "Stack" : "Queue",
      value: getOutputText(nextMode, workingItems),
      outputText: getOutputText(nextMode, workingItems),
      statusText: `Switched to ${getModeMeta(nextMode).label}.`,
      executionTimeMs: latestResult.executionTimeMs || 0,
      operationCount: workingOperationCount,
      severity: "success",
    };

    setLatestResult(nextResult);
    commitIdleStep(nextMode, workingItems, workingOperationCount, nextResult);
    focusValueInput();
  }, [
    mode,
    workingItems,
    latestResult.executionTimeMs,
    workingOperationCount,
    commitIdleStep,
    focusValueInput,
  ]);

  const requireNumericValue = useCallback(() => {
    const numericValue = Number(valueInput);
    if (!Number.isFinite(numericValue)) {
      toast.error("Enter a numeric value first.");
      return null;
    }
    return numericValue;
  }, [valueInput]);

  const handleOperation = useCallback(async (operation) => {
    if (isRunning) return;

    const needsValue = operation === primaryAction;
    const numericValue = needsValue ? requireNumericValue() : 0;
    if (needsValue && numericValue === null) return;

    const session = prepareStackQueueSession({
      mode,
      items: workingItems,
      operation,
      value: numericValue ?? 0,
      operationCount: workingOperationCount + 1,
      createId,
    });

    setSteps(session.steps);
    setStepIndex(0);
    setLatestResult(session.result);
    setRuntimeStats({ executionTimeMs: 0 });

    await runPlayback(0, session.steps);
    if (abortRef.current) return;

    setItems(session.nextItems);
    setOperationTotal(session.result.operationCount);
    setLatestResult(session.result);

    if (session.result.severity === "danger") {
      toast.error(session.result.statusText);
      focusValueInput();
      return;
    }

    toast.success(session.operationLabel);
    focusValueInput();
  }, [
    isRunning,
    primaryAction,
    mode,
    workingItems,
    workingOperationCount,
    createId,
    runPlayback,
    focusValueInput,
    requireNumericValue,
  ]);

  const handlePlayToggle = useCallback(async () => {
    if (isRunning) {
      pauseRef.current = !pauseRef.current;
      setIsPaused(pauseRef.current);
      return;
    }

    await runPlayback(stepIndex >= steps.length - 1 ? 0 : stepIndex);
  }, [isRunning, runPlayback, stepIndex, steps.length]);

  const jumpToStep = useCallback((target) => {
    if (isRunning) return;
    const bounded = Math.max(0, Math.min(target, Math.max(steps.length - 1, 0)));
    setStepIndex(bounded);
  }, [isRunning, steps.length]);

  useEffect(() => {
    focusValueInput();
  }, [focusValueInput]);

  useEffect(() => {
    if (!shortcutsEnabled) {
      return undefined;
    }

    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName || "";
      const isEditable = ["INPUT", "TEXTAREA", "SELECT"].includes(tagName) || target?.isContentEditable;
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      if (isEditable) {
        if (target === inputRef.current && event.key === "Enter" && !hasModifier) {
          event.preventDefault();
          void handleOperation(primaryAction);
        }

        if (event.key === "Escape") {
          target.blur();
        }
        return;
      }

      if (hasModifier) return;

      if (event.code === "Space") {
        event.preventDefault();
        void handlePlayToggle();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        jumpToStep(stepIndex + 1);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        jumpToStep(stepIndex - 1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        jumpToStep(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        jumpToStep(Math.max(steps.length - 1, 0));
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        handleModeChange("stack");
        return;
      }

      if (event.key === "2") {
        event.preventDefault();
        handleModeChange("queue");
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "i") {
        event.preventDefault();
        focusValueInput();
        return;
      }

      if (key === "a") {
        event.preventDefault();
        void handleOperation(primaryAction);
        return;
      }

      if (key === "r") {
        event.preventDefault();
        void handleOperation(secondaryAction);
        return;
      }

      if (key === "e") {
        event.preventDefault();
        void handleOperation(inspectAction);
        return;
      }

      if (key === "x") {
        event.preventDefault();
        void handleOperation("reset");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    shortcutsEnabled,
    focusValueInput,
    handleModeChange,
    handleOperation,
    handlePlayToggle,
    jumpToStep,
    primaryAction,
    secondaryAction,
    inspectAction,
    stepIndex,
    steps.length,
  ]);

  return (
    <PageMotionWrapper testId={pageTestId}>
      <Card className="border-border/70 bg-card/70">
        <CardHeader className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-3xl">Stack & Queue Visualizer</CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Switch between Stack and Queue modes, perform core operations interactively, and follow every animated transition, pointer movement, and pseudocode step.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-full border border-border/70 bg-background/70 p-1">
                {STACK_QUEUE_MODES.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={mode === option.value ? "default" : "ghost"}
                    className="rounded-full"
                    onClick={() => handleModeChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <StepGuideDrawer
                algorithm={`${modeMeta.label} (${modeMeta.behavior})`}
                currentStep={stepIndex}
                action={currentStep?.description || "Ready"}
                complexity={mode === "stack" ? "Push/Pop/Peek: O(1)" : "Enqueue/Dequeue/Front: O(1)"}
                internalState={currentStep?.internalState}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Control Panel</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_repeat(4,auto)]">
                <Input
                  ref={inputRef}
                  value={valueInput}
                  onChange={(event) => setValueInput(event.target.value)}
                  placeholder="Enter value"
                  data-testid="stack-queue-value-input"
                />
                <Button type="button" className="rounded-full" onClick={() => handleOperation(primaryAction)} disabled={isRunning}>
                  {getPrimaryActionLabel(mode)}
                </Button>
                <Button type="button" variant="secondary" className="rounded-full" onClick={() => handleOperation(secondaryAction)} disabled={isRunning}>
                  {getSecondaryActionLabel(mode)}
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation(inspectAction)} disabled={isRunning}>
                  <Eye className="h-4 w-4" /> {getInspectActionLabel(mode)}
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("reset")} disabled={isRunning}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {[
                  "1 Stack",
                  "2 Queue",
                  "I Focus Input",
                  "Enter/A Add",
                  "R Remove",
                  "E Inspect",
                  "X Reset",
                  "Space Play/Pause",
                  "←/→ Timeline",
                ].map((shortcut) => (
                  <span
                    key={shortcut}
                    className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-muted-foreground"
                  >
                    {shortcut}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Behavior</p>
                <p className="mt-3 text-2xl font-semibold text-slate-100">{modeMeta.behavior}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {mode === "stack" ? "Last In, First Out" : "First In, First Out"}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current Mode</p>
                <p className="mt-3 text-2xl font-semibold text-slate-100">{modeMeta.label}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {mode === "stack" ? "Vertical, bottom to top" : "Horizontal, left to right"}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Capacity</p>
                <p className="mt-3 text-2xl font-semibold text-slate-100">{STACK_QUEUE_MAX_CAPACITY}</p>
                <p className="mt-2 text-sm text-slate-300">Overflow and underflow feedback included.</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="font-heading text-xl">{currentStep?.description || `${modeMeta.label} ready`}</CardTitle>
                <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                  {getOperationLabel(mode, currentStep?.operation)}
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${stepIndex}-${currentStep?.statusText}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm text-muted-foreground"
                >
                  {currentStep?.statusText}
                </motion.p>
              </AnimatePresence>
            </CardHeader>
            <CardContent className="space-y-4">
              <StackQueueStage step={currentStep} />
              <ControlCluster
                isPlaying={isRunning && !isPaused}
                onPlayToggle={handlePlayToggle}
                onStepForward={() => jumpToStep(stepIndex + 1)}
                onStepBack={() => jumpToStep(stepIndex - 1)}
                onReset={() => jumpToStep(0)}
                speed={globalSpeed}
                onSpeedChange={setGlobalSpeed}
                disabled={false}
              />
              <TimelineSlider currentStep={stepIndex} maxStep={Math.max(steps.length - 1, 0)} onChange={jumpToStep} />
            </CardContent>
          </Card>

          <TrackerCard steps={steps} stepIndex={stepIndex} />
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Output Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{activeResult.title || "Output"}</p>
                <p className="mt-3 font-medium text-slate-100">{activeResult.value}</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Behavior Summary</p>
                <p className="mt-3 text-slate-100">
                  {mode === "stack"
                    ? "Top pointer always tracks the newest value."
                    : "Front leaves first while Rear accepts new values."}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/75 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                <p className="mt-3 text-slate-100">{activeResult.statusText || DEFAULT_STATUS_TEXT}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Statistics Panel</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <StatCard label="Operations Count" value={displayedStats.operationCount} icon={Layers3} accent="text-sky-200" />
              <StatCard label="Elements Count" value={displayedStats.elementsCount} icon={Sparkles} accent="text-amber-200" />
              <StatCard label="Execution Time" value={formatExecutionTime(displayedStats.executionTimeMs)} icon={Waves} accent="text-emerald-200" />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Pseudocode Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 rounded-3xl border border-border/70 bg-background/75 p-3 font-code text-xs">
              {pseudocodeLines.length ? (
                pseudocodeLines.map((line) => (
                  <p
                    key={line.lineNumber}
                    className={`rounded-xl px-3 py-2 transition-colors ${
                      line.active
                        ? "bg-amber-400/15 text-amber-100 shadow-[0_10px_24px_rgba(245,158,11,0.12)]"
                        : "text-muted-foreground"
                    }`}
                  >
                    {line.lineNumber}. {line.text}
                  </p>
                ))
              ) : (
                <p className="px-3 py-2 text-muted-foreground">Run an operation to highlight the active pseudocode line.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageMotionWrapper>
  );
}
