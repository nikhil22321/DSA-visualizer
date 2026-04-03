import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightLeft, Link2, Plus, RotateCcw, Search, Shuffle, Trash2 } from "lucide-react";

import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { executeLinkedListSession, getLinkedListOperationLabel, getLinkedListPseudocode, prepareLinkedListSession, createLinkedListInitialStep } from "@/modules/linkedList/linkedListVisualizer";
import { DEFAULT_OUTPUT_TEXT, DEFAULT_STATUS_TEXT, LINKED_LIST_TYPES, formatListValues, parseMergeValues } from "@/modules/linkedList/linkedListUtils";
import { highlightedPseudocode } from "@/helpers/pseudocodeHighlighter";
import { recentStepMessages } from "@/helpers/stepTracker";
import { useAppStore } from "@/store/useAppStore";

const nodeToneClasses = {
  default: "border-primary/40 bg-primary/10 text-slate-100 shadow-[0_0_0_1px_rgba(96,165,250,0.14)]",
  info: "border-sky-400/50 bg-sky-400/10 text-sky-50",
  warning: "border-amber-400/60 bg-amber-400/12 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.18)]",
  success: "border-emerald-400/55 bg-emerald-400/12 text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.18)]",
  danger: "border-red-400/60 bg-red-500/10 text-red-50 shadow-[0_0_24px_rgba(248,113,113,0.22)]",
};

const pointerToneClasses = {
  head: "bg-white text-slate-950",
  tail: "bg-white text-slate-950",
  curr: "bg-amber-300 text-slate-950",
  prev: "bg-cyan-300 text-slate-950",
  slow: "bg-emerald-300 text-slate-950",
  fast: "bg-fuchsia-300 text-slate-950",
};

const RIGHT_ARROW = "\u2192";
const LEFT_ARROW = "\u2190";
const CYCLE_ARROW = "\u21ba";
const KEYBOARD_SHORTCUTS = [
  "Alt+1 Singly",
  "Alt+2 Doubly",
  "Alt+Shift+H Insert head",
  "Alt+Shift+T Insert tail",
  "Alt+Shift+P Insert position",
  "Alt+Shift+Q Delete head",
  "Alt+Shift+W Delete tail",
  "Alt+Shift+E Delete by value",
  "Alt+Shift+S Search",
  "Alt+Shift+V Traverse",
  "Alt+Shift+R Reverse",
  "Alt+Shift+M Middle",
  "Alt+Shift+C Detect cycle",
  "Alt+Shift+L Toggle cycle link",
  "Alt+Shift+G Random list",
  "Alt+Shift+X Reset",
  "Space Play/Pause",
  "Arrow keys Step timeline",
];

const formatExecutionTime = (ms = 0) => `${(ms / 1000).toFixed(2)}s`;
const sanitizeDisplayText = (value = "") =>
  String(value)
    .replaceAll("\u00e2\u2020\u2019", RIGHT_ARROW)
    .replaceAll("\u00e2\u2020\u0090", LEFT_ARROW)
    .replaceAll("\u00e2\u2020\u00ba", CYCLE_ARROW)
    .replaceAll("\u00c3\u00a2\u00e2\u201a\u00ac\u00a0\u00e2\u20ac\u2122", RIGHT_ARROW)
    .replaceAll("\u00c3\u00a2\u00e2\u201a\u00ac\u00a0\u00c2\u0090", LEFT_ARROW)
    .replaceAll("\u00c3\u00a2\u00e2\u201a\u00ac\u00a0\u00c2\u00ba", CYCLE_ARROW);

const getPointerLabels = (pointers, nodeId) =>
  Object.entries(pointers || {})
    .filter(([, target]) => target === nodeId)
    .map(([label]) => label);

const getNodeTone = (step, nodeId, isAuxiliary = false) => {
  if (!isAuxiliary && step.deletedIds?.includes(nodeId)) return "danger";
  if (step.foundIds?.includes(nodeId)) return "success";
  if ((isAuxiliary ? step.auxiliaryActiveIds : step.activeIds)?.includes(nodeId)) return step.statusTone === "danger" ? "danger" : step.statusTone === "success" ? "success" : "warning";
  if (!isAuxiliary && step.visitedIds?.includes(nodeId)) return "success";
  return "default";
};

const ArrowLink = ({ direction = "forward" }) => {
  if (direction === "none") {
    return <motion.div layout className="h-px w-12 border-t border-dashed border-white/25" />;
  }

  if (direction === "double") {
    return (
      <motion.div layout initial={{ opacity: 0, scaleX: 0.2 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0, scaleX: 0.2 }} className="flex items-center gap-1 text-white/80">
        <span className="text-sm">←</span>
        <div className="h-[2px] w-10 rounded-full bg-white/70" />
        <span className="text-sm">→</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scaleX: 0.2 }}
      animate={{ opacity: 1, scaleX: direction === "backward" ? -1 : 1 }}
      exit={{ opacity: 0, scaleX: 0.2 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className="origin-center"
    >
      <div className="flex items-center text-white/90">
        <div className="h-[2px] w-10 rounded-full bg-current" />
        <div className="h-0 w-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-current" />
      </div>
    </motion.div>
  );
};

const PointerBadges = ({ labels }) =>
  labels.length ? (
    <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-1">
      {labels.map((label) => (
        <span key={label} className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${pointerToneClasses[label] || "bg-white/80 text-slate-950"}`}>
          {label}
        </span>
      ))}
    </div>
  ) : null;

const LinkedListNode = ({ node, listType, tone, pointerLabels, entered }) => {
  const segments = listType === "doubly" ? ["prev", node.value, "next"] : [node.value, "next"];

  return (
    <motion.div
      layout
      initial={entered ? { opacity: 0, y: -46, scale: 0.92 } : false}
      animate={{ opacity: 1, y: 0, scale: tone === "warning" ? 1.05 : 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.84 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative pt-10"
    >
      <PointerBadges labels={pointerLabels} />
      <div className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 ${nodeToneClasses[tone]}`}>
        <div className={`grid ${listType === "doubly" ? "grid-cols-3" : "grid-cols-2"}`}>
          {segments.map((segment, index) => (
            <div key={`${node.id}-${segment}-${index}`} className={`min-w-[78px] px-4 py-3 text-center ${index > 0 ? "border-l border-white/10" : ""}`}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{typeof segment === "number" ? "value" : segment}</p>
              <p className="mt-2 font-code text-lg font-semibold">{segment}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const LinkedListLane = ({ title, nodes, step, isAuxiliary = false }) => {
  if (!nodes.length) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">{title}</p>
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-3 px-1 py-3">
          <AnimatePresence initial={false}>
            {nodes.map((node, index) => {
              const tone = getNodeTone(step, node.id, isAuxiliary);
              const pointerLabels = isAuxiliary ? [] : getPointerLabels(step.pointers, node.id);
              const direction = isAuxiliary ? "forward" : step.arrowDirections?.[index] || (step.listType === "doubly" ? "double" : "forward");
              return (
                <motion.div key={node.id} layout className="flex items-center gap-3">
                  <LinkedListNode node={node} listType={step.listType} tone={tone} pointerLabels={pointerLabels} entered={step.enteredIds?.includes(node.id)} />
                  {index < nodes.length - 1 && <ArrowLink direction={direction} />}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const LinkedListStage = ({ step }) => (
  <div className="space-y-5 rounded-3xl border border-border/70 bg-background/80 p-5 visual-grid">
    {step.floatingNode ? (
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Incoming Node</p>
        <div className="flex justify-center">
          <LinkedListNode node={step.floatingNode} listType={step.listType} tone="warning" pointerLabels={[]} entered />
        </div>
      </div>
    ) : null}
    <LinkedListLane title="Primary List" nodes={step.nodes} step={step} />
    {step.auxiliaryNodes?.length ? <LinkedListLane title="Secondary Sorted List" nodes={step.auxiliaryNodes} step={step} isAuxiliary /> : null}
    {step.mergedPreview?.length ? (
      <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-code text-sm text-emerald-100">
        Merged Preview: {step.mergedPreview.join(" → ")}
      </p>
    ) : null}
    {step.cycleTargetIndex !== null && step.cycleTargetIndex !== undefined && step.nodes.length > 1 ? (
      <p className="rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100">
        Cycle link active: tail reconnects to index {step.cycleTargetIndex} ({step.nodes[step.cycleTargetIndex]?.value ?? "?"})
      </p>
    ) : null}
    {!step.nodes.length && !step.floatingNode ? <p className="rounded-2xl border border-border/60 bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">The linked list is empty. Insert a value to begin the visualization.</p> : null}
  </div>
);

export default function LinkedListPage() {
  const [listType, setListType] = useState("singly");
  const [valueInput, setValueInput] = useState("10");
  const [positionInput, setPositionInput] = useState("1");
  const [mergeInput, setMergeInput] = useState("15, 25, 35");
  const [cycleInput, setCycleInput] = useState("");
  const [nodes, setNodes] = useState([]);
  const [cycleTargetIndex, setCycleTargetIndex] = useState(null);
  const [steps, setSteps] = useState(() => [createLinkedListInitialStep({ listType: "singly", nodes: [], operationCount: 0 })]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [operationTotal, setOperationTotal] = useState(0);
  const [runtimeStats, setRuntimeStats] = useState({ nodesTraversed: 0, executionTimeMs: 0 });
  const [latestResult, setLatestResult] = useState({
    title: "Output",
    value: DEFAULT_OUTPUT_TEXT,
    outputText: DEFAULT_OUTPUT_TEXT,
    statusText: DEFAULT_STATUS_TEXT,
    executionTimeMs: 0,
  });

  const idRef = useRef(0);
  const pauseRef = useRef(false);
  const abortRef = useRef(false);
  const valueInputRef = useRef(null);
  const positionInputRef = useRef(null);
  const mergeInputRef = useRef(null);
  const cycleInputRef = useRef(null);
  const shortcutStateRef = useRef({});

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();

  const currentStep = steps[stepIndex] || steps[0];
  const pseudocodeLines = useMemo(
    () => highlightedPseudocode(getLinkedListPseudocode(currentStep?.operation), currentStep?.line),
    [currentStep],
  );
  const stepMessages = useMemo(() => recentStepMessages(steps, stepIndex, 8), [steps, stepIndex]);
  const displayedStats = {
    nodesTraversed: currentStep?.stats?.nodesTraversed ?? runtimeStats.nodesTraversed,
    operationCount: currentStep?.stats?.operationCount ?? operationTotal,
    executionTimeMs: isRunning ? runtimeStats.executionTimeMs : latestResult.executionTimeMs || 0,
    listSize: currentStep?.nodes?.length ?? nodes.length,
  };
  const activeResult = currentStep?.result || latestResult;

  const createId = () => {
    idRef.current += 1;
    return `ll-node-${idRef.current}`;
  };

  const requireNumericValue = () => {
    const numericValue = Number(valueInput);
    if (!Number.isFinite(numericValue)) {
      toast.error("Enter a numeric value first.");
      return null;
    }
    return numericValue;
  };

  const focusValueInput = () => valueInputRef.current?.focus();

  const runPlayback = async ({ stepsToPlay = steps, startIndex = 0 } = {}) => {
    if (!stepsToPlay.length) return;
    const trimmedSteps = stepsToPlay.slice(startIndex);
    abortRef.current = false;
    pauseRef.current = false;
    setIsRunning(true);
    setIsPaused(false);
    setRuntimeStats((previous) => ({ ...previous, executionTimeMs: 0 }));

    const result = await executeLinkedListSession({
      steps: trimmedSteps,
      onStep: (step, index, elapsedMs) => {
        setStepIndex(startIndex + index);
        setRuntimeStats({
          nodesTraversed: step.stats.nodesTraversed,
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
    setRuntimeStats((previous) => ({ ...previous, executionTimeMs: result.elapsed }));
  };

  const commitIdleState = (nextNodes, nextCycleTarget, nextOperationTotal, nextResult) => {
    const idleStep = createLinkedListInitialStep({
      listType,
      nodes: nextNodes,
      cycleTargetIndex: nextCycleTarget,
      operationCount: nextOperationTotal,
      executionTimeMs: nextResult.executionTimeMs || 0,
    });
    idleStep.outputText = nextResult.outputText || DEFAULT_OUTPUT_TEXT;
    idleStep.statusText = nextResult.statusText || DEFAULT_STATUS_TEXT;
    setSteps([idleStep]);
    setStepIndex(0);
  };

  const handleOperation = async (operation) => {
    if (isRunning) return;

    const numericValue = ["insertHead", "insertTail", "insertPosition", "deleteValue", "search"].includes(operation)
      ? requireNumericValue()
      : 0;
    if (["insertHead", "insertTail", "insertPosition", "deleteValue", "search"].includes(operation) && numericValue === null) {
      return;
    }

    const mergeValues = parseMergeValues(mergeInput);
    if (operation === "mergeSorted" && !mergeValues.length && !nodes.length) {
      toast.error("Provide at least one sorted value in the secondary merge list.");
      return;
    }

    const session = prepareLinkedListSession({
      listType,
      nodes,
      operation,
      value: numericValue ?? 0,
      position: Number(positionInput),
      cycleTargetIndex,
      mergeValues,
      operationCount: operationTotal + 1,
      createId,
    });

    setSteps(session.steps);
    setStepIndex(0);
    setLatestResult(session.result);
    setRuntimeStats({ nodesTraversed: 0, executionTimeMs: 0 });
    await runPlayback({ stepsToPlay: session.steps, startIndex: 0 });
    if (abortRef.current) return;

    setNodes(session.nextNodes);
    setCycleTargetIndex(session.nextCycleTargetIndex);
    setOperationTotal(session.result.operationCount);
    setLatestResult(session.result);
    focusValueInput();
    toast.success(getLinkedListOperationLabel(operation));
  };

  const handleToggleCycle = () => {
    if (isRunning) return;
    if (cycleTargetIndex !== null && cycleTargetIndex !== undefined) {
      setCycleTargetIndex(null);
      const nextResult = {
        ...latestResult,
        title: "Cycle Link",
        value: "Cycle link removed",
        outputText: `Traversal: ${formatListValues(nodes)}`,
        statusText: "Removed the cycle link from the list",
      };
      setLatestResult(nextResult);
      commitIdleState(nodes, null, operationTotal, nextResult);
      focusValueInput();
      toast.success("Cycle link removed.");
      return;
    }

    const targetIndex = Number(cycleInput);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= nodes.length || nodes.length < 2) {
      toast.error("Enter a valid cycle target index inside the current list.");
      return;
    }

    setCycleTargetIndex(targetIndex);
    const nextResult = {
      ...latestResult,
      title: "Cycle Link",
      value: `Tail now reconnects to index ${targetIndex}`,
      outputText: `Traversal: ${formatListValues(nodes, targetIndex)}`,
      statusText: `Cycle link created from tail to index ${targetIndex}`,
    };
    setLatestResult(nextResult);
    commitIdleState(nodes, targetIndex, operationTotal, nextResult);
    focusValueInput();
    toast.success(`Cycle link created at index ${targetIndex}.`);
  };

  const handleRandomList = () => {
    if (isRunning) return;
    const randomLength = Math.floor(Math.random() * 5) + 4;
    const nextNodes = Array.from({ length: randomLength }, () => createId()).map((id) => ({
      id,
      value: Math.floor(Math.random() * 90) + 10,
    }));
    const nextResult = {
      ...latestResult,
      title: "Random Linked List",
      value: `Generated ${randomLength} random nodes`,
      outputText: `Traversal: ${formatListValues(nextNodes)}`,
      statusText: `Generated a random ${listType} linked list with ${randomLength} nodes`,
      executionTimeMs: 0,
    };

    setNodes(nextNodes);
    setCycleTargetIndex(null);
    setLatestResult(nextResult);
    commitIdleState(nextNodes, null, operationTotal, nextResult);
    focusValueInput();
    toast.success("Random linked list generated.");
  };

  const handlePlayToggle = async () => {
    if (isRunning) {
      pauseRef.current = !pauseRef.current;
      setIsPaused(pauseRef.current);
      return;
    }

    await runPlayback({ stepsToPlay: steps, startIndex: stepIndex >= steps.length - 1 ? 0 : stepIndex });
  };

  const jumpToStep = (target) => {
    if (isRunning) return;
    const bounded = Math.max(0, Math.min(target, Math.max(steps.length - 1, 0)));
    setStepIndex(bounded);
  };

  const handleListTypeChange = (nextType) => {
    if (nextType === listType || isRunning) return;
    abortRef.current = true;
    pauseRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setListType(nextType);
    const idleStep = createLinkedListInitialStep({
      listType: nextType,
      nodes,
      cycleTargetIndex,
      operationCount: operationTotal,
      executionTimeMs: latestResult.executionTimeMs || 0,
    });
    idleStep.outputText = latestResult.outputText || DEFAULT_OUTPUT_TEXT;
    idleStep.statusText = latestResult.statusText || DEFAULT_STATUS_TEXT;
    setSteps([idleStep]);
    setStepIndex(0);
    focusValueInput();
  };

  shortcutStateRef.current = {
    handleOperation,
    handlePlayToggle,
    handleRandomList,
    handleToggleCycle,
    handleListTypeChange,
    jumpToStep,
    stepIndex,
  };

  useEffect(() => {
    if (!shortcutsEnabled) return undefined;

    const onKeyDown = (event) => {
      const shortcutState = shortcutStateRef.current;
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);

      if (!isTypingTarget) {
        if (event.code === "Space") {
          event.preventDefault();
          shortcutState.handlePlayToggle?.();
          return;
        }

        if (event.code === "ArrowRight") {
          event.preventDefault();
          shortcutState.jumpToStep?.((shortcutState.stepIndex ?? 0) + 1);
          return;
        }

        if (event.code === "ArrowLeft") {
          event.preventDefault();
          shortcutState.jumpToStep?.((shortcutState.stepIndex ?? 0) - 1);
          return;
        }
      }

      if (event.altKey && !event.shiftKey) {
        if (event.code === "Digit1") {
          event.preventDefault();
          shortcutState.handleListTypeChange?.("singly");
          return;
        }

        if (event.code === "Digit2") {
          event.preventDefault();
          shortcutState.handleListTypeChange?.("doubly");
          return;
        }
      }

      if (!event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey) {
        return;
      }

      event.preventDefault();

      switch (event.code) {
        case "KeyH":
          shortcutState.handleOperation?.("insertHead");
          break;
        case "KeyT":
          shortcutState.handleOperation?.("insertTail");
          break;
        case "KeyP":
          shortcutState.handleOperation?.("insertPosition");
          break;
        case "KeyQ":
          shortcutState.handleOperation?.("deleteHead");
          break;
        case "KeyW":
          shortcutState.handleOperation?.("deleteTail");
          break;
        case "KeyE":
          shortcutState.handleOperation?.("deleteValue");
          break;
        case "KeyS":
          shortcutState.handleOperation?.("search");
          break;
        case "KeyV":
          shortcutState.handleOperation?.("traverse");
          break;
        case "KeyR":
          shortcutState.handleOperation?.("reverse");
          break;
        case "KeyM":
          shortcutState.handleOperation?.("findMiddle");
          break;
        case "KeyC":
          shortcutState.handleOperation?.("detectCycle");
          break;
        case "KeyL":
          shortcutState.handleToggleCycle?.();
          break;
        case "KeyG":
          shortcutState.handleRandomList?.();
          break;
        case "KeyX":
          shortcutState.handleOperation?.("reset");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcutsEnabled]);

  return (
    <PageMotionWrapper testId="linked-list-page">
      <Card className="border-border/70 bg-card/70" data-testid="linked-list-header-card">
        <CardHeader className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-heading text-3xl">Linked List Visualizer</CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Build singly or doubly linked lists, animate every pointer update, and inspect traversal, reverse, middle-node, cycle, and merge behavior step by step.
              </p>
            </div>
            <StepGuideDrawer
              algorithm={`${listType} linked list`}
              currentStep={stepIndex}
              action={currentStep?.description || "Ready"}
              complexity="Insert/Delete/Search: O(n), Head operations: O(1)"
              internalState={currentStep?.internalState}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="space-y-2 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">List Type</p>
              <div className="flex flex-wrap gap-2">
                {LINKED_LIST_TYPES.map((option) => (
                  <Button key={option.value} type="button" variant={listType === option.value ? "default" : "outline"} className="rounded-full" onClick={() => handleListTypeChange(option.value)} disabled={isRunning}>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Value</p>
              <Input
                ref={valueInputRef}
                value={valueInput}
                onChange={(event) => setValueInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  if (event.shiftKey) handleOperation("insertHead");
                  else handleOperation("insertTail");
                }}
                placeholder="e.g. 42"
                data-testid="linked-list-value-input"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Position</p>
              <Input
                ref={positionInputRef}
                value={positionInput}
                onChange={(event) => setPositionInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  handleOperation("insertPosition");
                }}
                placeholder="Insert position"
                data-testid="linked-list-position-input"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Cycle Target</p>
              <Input
                ref={cycleInputRef}
                value={cycleInput}
                onChange={(event) => setCycleInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  handleToggleCycle();
                }}
                placeholder={`Tail ${RIGHT_ARROW} index`}
                data-testid="linked-list-cycle-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Secondary Sorted List</p>
              <Input
                ref={mergeInputRef}
                value={mergeInput}
                onChange={(event) => setMergeInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  handleOperation("mergeSorted");
                }}
                placeholder="e.g. 15, 25, 35"
                data-testid="linked-list-merge-input"
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="button" variant="secondary" className="rounded-full" onClick={handleRandomList} disabled={isRunning}>
                <Shuffle className="h-4 w-4" /> Random List
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={handleToggleCycle} disabled={isRunning}>
                <Link2 className="h-4 w-4" /> {cycleTargetIndex === null || cycleTargetIndex === undefined ? "Create Cycle" : "Break Cycle"}
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("reset")} disabled={isRunning}>
                <RotateCcw className="h-4 w-4" /> Reset List
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Insert</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="rounded-full" onClick={() => handleOperation("insertHead")} disabled={isRunning}><Plus className="h-4 w-4" /> Insert Head</Button>
                <Button type="button" variant="secondary" className="rounded-full" onClick={() => handleOperation("insertTail")} disabled={isRunning}>Insert Tail</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("insertPosition")} disabled={isRunning}>Insert Position</Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Delete</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("deleteHead")} disabled={isRunning}><Trash2 className="h-4 w-4" /> Delete Head</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("deleteTail")} disabled={isRunning}>Delete Tail</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("deleteValue")} disabled={isRunning}>Delete by Value</Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Algorithms</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("traverse")} disabled={isRunning}>Traverse</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("search")} disabled={isRunning}><Search className="h-4 w-4" /> Search</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("reverse")} disabled={isRunning}><ArrowRightLeft className="h-4 w-4" /> Reverse</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("findMiddle")} disabled={isRunning}>Find Middle</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("detectCycle")} disabled={isRunning}>Detect Cycle</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOperation("mergeSorted")} disabled={isRunning}>Merge Sorted Lists</Button>
              </div>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Insert-position uses the numeric position input. Cycle detection uses the optional tail-link index above, and merge uses the current list plus the secondary sorted list input. Keyboard-first flow: `Enter` in value inserts at tail, `Shift+Enter` inserts at head, and the shortcut guide below covers the rest.
          </p>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70">
            <CardHeader className="space-y-3">
              <CardTitle className="font-heading text-xl">{currentStep?.description || "Ready"}</CardTitle>
              <AnimatePresence mode="wait">
                <motion.p key={`${stepIndex}-${currentStep?.statusText}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-sm text-muted-foreground">
                  {sanitizeDisplayText(currentStep?.statusText)}
                </motion.p>
              </AnimatePresence>
            </CardHeader>
            <CardContent className="space-y-4">
              <LinkedListStage step={currentStep} />
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

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Step Tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stepMessages.length ? (
                stepMessages.map((item) => (
                <p key={item.id} className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm">
                    {sanitizeDisplayText(item.message)}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No steps yet. Start with an insert or traversal operation.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Output Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{activeResult.title || "Output"}</p>
                <p className="mt-2 font-medium">{sanitizeDisplayText(activeResult.value || DEFAULT_OUTPUT_TEXT)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Traversal / Result</p>
                <p className="mt-2 font-code text-xs leading-relaxed">{sanitizeDisplayText(currentStep?.outputText || latestResult.outputText || DEFAULT_OUTPUT_TEXT)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cycle State</p>
                <p className="mt-2">{cycleTargetIndex === null || cycleTargetIndex === undefined ? "No manual cycle link" : `Tail reconnects to index ${cycleTargetIndex}`}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Nodes Traversed</p>
                <p className="mt-2 font-code text-2xl font-semibold">{displayedStats.nodesTraversed}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Operations Count</p>
                <p className="mt-2 font-code text-2xl font-semibold">{displayedStats.operationCount}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Execution Time</p>
                <p className="mt-2 font-code text-2xl font-semibold">{formatExecutionTime(displayedStats.executionTimeMs)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">List Size</p>
                <p className="mt-2 font-code text-2xl font-semibold">{displayedStats.listSize}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Pseudocode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 rounded-2xl border border-border/60 bg-background/70 p-3 font-code text-xs">
              {pseudocodeLines.length ? (
                pseudocodeLines.map((line) => (
                  <p key={line.lineNumber} className={`rounded px-2 py-1 ${line.active ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>
                    {line.lineNumber}. {line.text}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground">Run an operation to highlight linked list pseudocode.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="font-heading text-base">Keyboard Controls</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 text-sm">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <p key={shortcut} className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                  {shortcut}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageMotionWrapper>
  );
}
