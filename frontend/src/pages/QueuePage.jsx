import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search, Trash2 } from "lucide-react";

import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
import { CodePanel } from "@/components/common/CodePanel";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { usePlayback } from "@/hooks/usePlayback";
import { useAppStore } from "@/store/useAppStore";

const queueTypes = [
  { value: "queue", label: "Queue" },
  { value: "circular", label: "Circular Queue" },
  { value: "deque", label: "Deque" },
  { value: "priority", label: "Priority Queue" },
];

const queueCode = `enqueue(x): items.push(x)\ndequeue(): items.shift()\npeek(): items[0]\n\npriority enqueue(x,p):\n  push({x,p}) then sort by p`;

const stats = (steps) => ({
  executionSteps: steps.length,
  comparisons: Math.max(0, steps.length - 1),
  swaps: 0,
  visitedNodes: steps.length,
  frontierPeak: 0,
});

export default function QueuePage() {
  const [queueType, setQueueType] = useState("queue");
  const [valueInput, setValueInput] = useState("42");
  const [priorityInput, setPriorityInput] = useState("5");
  const [capacityInput, setCapacityInput] = useState("8");

  const [items, setItems] = useState([]);
  const [circular, setCircular] = useState({ buffer: Array(8).fill(null), front: 0, rear: -1, size: 0, capacity: 8 });
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("Queue initialized");

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();
  const playback = usePlayback({ steps: history, speed: globalSpeed, shortcutsEnabled });

  useEffect(() => {
    setItems([]);
    const cap = Math.max(4, Number(capacityInput) || 8);
    setCircular({ buffer: Array(cap).fill(null), front: 0, rear: -1, size: 0, capacity: cap });
    setStatus(`${queueType} initialized`);
    setHistory([
      {
        action: `${queueType} initialized`,
        queueType,
        items: [],
        circular: { buffer: Array(cap).fill(null), front: 0, rear: -1, size: 0, capacity: cap },
        status: `${queueType} initialized`,
        internalState: {},
        stats: stats([{}]),
      },
    ]);
  }, [queueType]);

  useEffect(() => {
    if (history.length > 0) playback.jumpToStep(history.length - 1);
  }, [history.length]);

  const addHistory = (action, nextItems, nextCircular, extra = {}) => {
    setHistory((prev) => [
      ...prev,
      {
        action,
        queueType,
        items: [...nextItems],
        circular: nextCircular,
        status: extra.status || status,
        internalState: extra.internalState || {},
        stats: stats([...prev, {}]),
      },
    ]);
  };

  const step = history[playback.currentStep] || history[0] || {
    action: "Ready",
    queueType,
    items,
    circular,
    status,
    internalState: {},
    stats: stats(history),
  };

  const displayItems = useMemo(() => {
    if (step.queueType !== "circular") return step.items;
    const result = [];
    for (let i = 0; i < step.circular.size; i += 1) {
      const idx = (step.circular.front + i) % step.circular.capacity;
      result.push(step.circular.buffer[idx]);
    }
    return result;
  }, [step]);

  const enqueueRear = () => {
    const value = Number(valueInput);
    if (!Number.isFinite(value)) return;
    if (queueType === "circular") {
      if (circular.size === circular.capacity) {
        toast.error("Circular queue is full");
        return;
      }
      const rear = (circular.rear + 1) % circular.capacity;
      const next = { ...circular, buffer: [...circular.buffer], rear, size: circular.size + 1 };
      next.buffer[rear] = value;
      setCircular(next);
      setStatus(`Enqueued ${value}`);
      addHistory(`Enqueue ${value}`, items, next, { internalState: { rear, front: next.front } });
      return;
    }

    let nextItems = [...items];
    if (queueType === "priority") {
      const priority = Number(priorityInput) || 0;
      nextItems.push({ value, priority });
      nextItems.sort((a, b) => b.priority - a.priority);
      setStatus(`Priority enqueue ${value} (p=${priority})`);
      addHistory(`Priority enqueue ${value}`, nextItems, circular, { internalState: { priority } });
    } else {
      nextItems.push(value);
      setStatus(`Enqueue ${value}`);
      addHistory(`Enqueue ${value}`, nextItems, circular);
    }
    setItems(nextItems);
  };

  const enqueueFront = () => {
    if (queueType !== "deque") {
      toast.error("Front enqueue is for Deque only");
      return;
    }
    const value = Number(valueInput);
    if (!Number.isFinite(value)) return;
    const next = [value, ...items];
    setItems(next);
    setStatus(`Enqueue front ${value}`);
    addHistory(`Enqueue front ${value}`, next, circular);
  };

  const dequeueFront = () => {
    if (queueType === "circular") {
      if (circular.size === 0) return;
      const removed = circular.buffer[circular.front];
      const next = { ...circular, buffer: [...circular.buffer], front: (circular.front + 1) % circular.capacity, size: circular.size - 1 };
      setCircular(next);
      setStatus(`Dequeue ${removed}`);
      addHistory(`Dequeue ${removed}`, items, next, { internalState: { removed } });
      return;
    }

    const next = [...items];
    const removed = next.shift();
    if (removed === undefined) return;
    setItems(next);
    setStatus(`Dequeue ${queueType === "priority" ? removed.value : removed}`);
    addHistory(`Dequeue`, next, circular);
  };

  const dequeueRear = () => {
    if (queueType !== "deque") {
      toast.error("Rear dequeue is for Deque only");
      return;
    }
    const next = [...items];
    const removed = next.pop();
    if (removed === undefined) return;
    setItems(next);
    setStatus(`Dequeue rear ${removed}`);
    addHistory(`Dequeue rear ${removed}`, next, circular);
  };

  const peekFront = () => {
    let frontValue;
    if (queueType === "circular") frontValue = circular.size ? circular.buffer[circular.front] : undefined;
    else frontValue = items[0];
    const msg = frontValue === undefined ? "Queue is empty" : `Front is ${typeof frontValue === "object" ? frontValue.value : frontValue}`;
    setStatus(msg);
    addHistory("Peek front", items, circular, { status: msg });
  };

  const reinitCircularCapacity = () => {
    const cap = Math.max(4, Number(capacityInput) || 8);
    const next = { buffer: Array(cap).fill(null), front: 0, rear: -1, size: 0, capacity: cap };
    setCircular(next);
    setItems([]);
    setStatus(`Circular queue reset (capacity ${cap})`);
    addHistory(`Reset circular capacity to ${cap}`, [], next);
  };

  return (
    <PageMotionWrapper testId="queue-page">
      <Card className="border-border/70 bg-card/70" data-testid="queue-header-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="queue-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="queue-page-title">Queue Visualizer</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="queue-page-subtitle">
                Queue, Circular Queue, Deque, Priority Queue with full operation controls.
              </p>
            </div>
            <StepGuideDrawer
              algorithm={`${queueType} queue`}
              currentStep={playback.currentStep}
              action={step.action}
              complexity="Queue operations: O(1) average"
              internalState={step.internalState}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-testid="queue-config-grid">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Queue Type</p>
              <Select value={queueType} onValueChange={setQueueType}>
                <SelectTrigger data-testid="queue-type-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {queueTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`queue-type-option-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input value={valueInput} onChange={(e) => setValueInput(e.target.value)} placeholder="Value" className="mt-6" data-testid="queue-value-input" />
            <Input value={priorityInput} onChange={(e) => setPriorityInput(e.target.value)} placeholder="Priority" className="mt-6" data-testid="queue-priority-input" />
            <Input value={capacityInput} onChange={(e) => setCapacityInput(e.target.value)} placeholder="Capacity" className="mt-6" data-testid="queue-capacity-input" />
            <Button type="button" className="mt-6 rounded-full" onClick={reinitCircularCapacity} data-testid="queue-reset-capacity-button">
              Reset Capacity
            </Button>
          </div>

          <div className="flex flex-wrap gap-2" data-testid="queue-operation-buttons">
            <Button type="button" onClick={enqueueRear} className="rounded-full" data-testid="queue-enqueue-rear-button">
              <ArrowDown className="h-4 w-4" /> Enqueue Rear
            </Button>
            <Button type="button" variant="outline" onClick={enqueueFront} data-testid="queue-enqueue-front-button">
              <ArrowUp className="h-4 w-4" /> Enqueue Front
            </Button>
            <Button type="button" variant="outline" onClick={dequeueFront} data-testid="queue-dequeue-front-button">
              <Trash2 className="h-4 w-4" /> Dequeue Front
            </Button>
            <Button type="button" variant="outline" onClick={dequeueRear} data-testid="queue-dequeue-rear-button">
              Dequeue Rear
            </Button>
            <Button type="button" variant="outline" onClick={peekFront} data-testid="queue-peek-front-button">
              <Search className="h-4 w-4" /> Peek Front
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="queue-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="queue-visual-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="queue-current-action">{step.action}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/70 p-4" data-testid="queue-visual-strip">
                <div className="flex min-w-max items-center gap-3">
                  {displayItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="queue-empty-text">Queue is empty</p>
                  ) : (
                    displayItems.map((item, idx) => (
                      <div key={`${JSON.stringify(item)}-${idx}`} className="flex items-center gap-2" data-testid={`queue-item-${idx}`}>
                        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-code text-sm">
                          {typeof item === "object" ? `${item.value} (p:${item.priority})` : item}
                        </div>
                        {idx < displayItems.length - 1 && <span>→</span>}
                      </div>
                    ))
                  )}
                </div>
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
              <TimelineSlider currentStep={playback.currentStep} maxStep={playback.maxStep} onChange={playback.jumpToStep} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <StatsGrid stats={step.stats} />
          <Card className="border-border/70 bg-card/70" data-testid="queue-status-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="queue-status-title">Operation Result</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm" data-testid="queue-status-text">{step.status}</p>
            </CardContent>
          </Card>
          <CodePanel title="Queue Core Logic" code={queueCode} />
        </div>
      </section>
    </PageMotionWrapper>
  );
}
