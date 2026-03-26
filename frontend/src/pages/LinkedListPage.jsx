import { useEffect, useState } from "react";
import { Plus, Search, Shuffle, Trash2 } from "lucide-react";

import { AITutorDrawer } from "@/components/common/AITutorDrawer";
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

const listTypeOptions = [
  { value: "singly", label: "Singly Linked List" },
  { value: "doubly", label: "Doubly Linked List" },
  { value: "circular", label: "Circular Linked List" },
];

const listCode = `insertAtEnd(value):\n  newNode = Node(value)\n  if head is null: head = newNode\n  else: tail.next = newNode\n\nreverse():\n  prev = null\n  current = head\n  while current:\n    nxt = current.next\n    current.next = prev\n    prev = current\n    current = nxt`;

const withStats = (steps) => ({
  executionSteps: steps.length,
  comparisons: Math.max(0, steps.length - 1),
  swaps: 0,
  visitedNodes: steps.length,
  frontierPeak: 0,
});

const detectCycle = (values, circular) => circular && values.length > 1;

export default function LinkedListPage() {
  const [listType, setListType] = useState("singly");
  const [valueInput, setValueInput] = useState("12");
  const [indexInput, setIndexInput] = useState("0");
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [statusText, setStatusText] = useState("No operations yet");

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();
  const playback = usePlayback({ steps: history, speed: globalSpeed, shortcutsEnabled });

  const addHistory = (action, nextItems, extra = {}) => {
    const snap = {
      action,
      items: [...nextItems],
      statusText: extra.statusText || statusText,
      internalState: extra.internalState || {},
      stats: withStats([...history, {}]),
      hasCycle: detectCycle(nextItems, listType === "circular"),
    };
    setHistory((prev) => [...prev, snap]);
  };

  useEffect(() => {
    setItems([]);
    setStatusText("No operations yet");
    setHistory([
      {
        action: `${listType} list initialized`,
        items: [],
        statusText: "No operations yet",
        internalState: {},
        stats: withStats([{}]),
        hasCycle: false,
      },
    ]);
  }, [listType]);

  useEffect(() => {
    if (history.length > 0) playback.jumpToStep(history.length - 1);
  }, [history.length]);

  const step = history[playback.currentStep] || history[0] || {
    action: "Ready",
    items,
    statusText,
    internalState: {},
    stats: withStats(history),
    hasCycle: false,
  };

  const insertValue = () => {
    const value = Number(valueInput);
    const index = Number(indexInput);
    if (!Number.isFinite(value)) return;
    const next = [...items];
    if (Number.isFinite(index) && index >= 0 && index <= next.length) {
      next.splice(index, 0, value);
      setStatusText(`Inserted ${value} at index ${index}`);
      addHistory(`Inserted ${value} at index ${index}`, next, { internalState: { index, value } });
    } else {
      next.push(value);
      setStatusText(`Appended ${value}`);
      addHistory(`Appended ${value}`, next, { internalState: { value } });
    }
    setItems(next);
  };

  const deleteValue = () => {
    const value = Number(valueInput);
    const index = Number(indexInput);
    const next = [...items];
    if (Number.isFinite(index) && index >= 0 && index < next.length) {
      const removed = next.splice(index, 1);
      setStatusText(`Deleted index ${index} (${removed[0]})`);
      addHistory(`Deleted node at index ${index}`, next, { internalState: { index, removed: removed[0] } });
      setItems(next);
      return;
    }
    const pos = next.indexOf(value);
    if (pos >= 0) {
      next.splice(pos, 1);
      setStatusText(`Deleted value ${value}`);
      addHistory(`Deleted value ${value}`, next, { internalState: { value, index: pos } });
      setItems(next);
    } else {
      toast.error("Value not found");
    }
  };

  const searchValue = () => {
    const value = Number(valueInput);
    const index = items.indexOf(value);
    const message = index >= 0 ? `Found ${value} at index ${index}` : `${value} not found`;
    setStatusText(message);
    addHistory(`Search ${value}`, items, { statusText: message, internalState: { value, index } });
  };

  const reverseList = () => {
    const next = [...items].reverse();
    setItems(next);
    setStatusText("List reversed");
    addHistory("Reversed list", next);
  };

  const checkCycle = () => {
    const hasCycle = detectCycle(items, listType === "circular");
    const message = hasCycle ? "Cycle detected" : "No cycle detected";
    setStatusText(message);
    addHistory("Cycle Detection", items, { statusText: message, internalState: { hasCycle } });
  };

  const randomList = () => {
    const next = Array.from({ length: 8 }, () => Math.floor(Math.random() * 90) + 10);
    setItems(next);
    setStatusText("Random list generated");
    addHistory("Generated random list", next);
  };

  return (
    <PageMotionWrapper testId="linked-list-page">
      <Card className="border-border/70 bg-card/70" data-testid="linked-list-header-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="linked-list-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="linked-list-page-title">
                Linked List Visualizer
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="linked-list-page-subtitle">
                Singly, Doubly, Circular operations: insert/delete/search/reverse/cycle detection.
              </p>
            </div>
            <AITutorDrawer
              algorithm={`${listType} linked list`}
              currentStep={playback.currentStep}
              action={step.action}
              complexity="Mostly O(n) operations"
              internalState={step.internalState}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5" data-testid="linked-list-config-grid">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">List Type</p>
              <Select value={listType} onValueChange={setListType}>
                <SelectTrigger data-testid="linked-list-type-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {listTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`linked-list-type-option-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input value={valueInput} onChange={(e) => setValueInput(e.target.value)} className="mt-6" placeholder="Value" data-testid="linked-list-value-input" />
            <Input value={indexInput} onChange={(e) => setIndexInput(e.target.value)} className="mt-6" placeholder="Index" data-testid="linked-list-index-input" />
            <Button type="button" className="mt-6 rounded-full" onClick={insertValue} data-testid="linked-list-insert-button">
              <Plus className="h-4 w-4" /> Insert
            </Button>
            <Button type="button" variant="secondary" className="mt-6 rounded-full" onClick={randomList} data-testid="linked-list-random-button">
              <Shuffle className="h-4 w-4" /> Random
            </Button>
          </div>

          <div className="flex flex-wrap gap-2" data-testid="linked-list-operation-buttons">
            <Button type="button" variant="outline" onClick={deleteValue} data-testid="linked-list-delete-button">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <Button type="button" variant="outline" onClick={searchValue} data-testid="linked-list-search-button">
              <Search className="h-4 w-4" /> Search
            </Button>
            <Button type="button" variant="outline" onClick={reverseList} data-testid="linked-list-reverse-button">
              Reverse
            </Button>
            <Button type="button" variant="outline" onClick={checkCycle} data-testid="linked-list-cycle-button">
              Cycle Detection
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="linked-list-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="linked-list-visual-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="linked-list-current-action">
                {step.action}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/70 p-4" data-testid="linked-list-visual-strip">
                <div className="flex min-w-max items-center gap-3">
                  {step.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="linked-list-empty-text">List is empty</p>
                  ) : (
                    step.items.map((value, index) => (
                      <div key={`${value}-${index}`} className="flex items-center gap-2" data-testid={`linked-list-node-${index}`}>
                        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-code text-sm">{value}</div>
                        {index < step.items.length - 1 && (
                          <span className="text-lg" data-testid={`linked-list-arrow-${index}`}>
                            {listType === "doubly" ? "↔" : "→"}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                  {listType === "circular" && step.items.length > 1 && (
                    <span className="ml-4 rounded-full border px-3 py-1 text-xs" data-testid="linked-list-circular-indicator">
                      tail → head
                    </span>
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
          <Card className="border-border/70 bg-card/70" data-testid="linked-list-status-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="linked-list-status-title">Operation Result</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm" data-testid="linked-list-status-text">
                {step.statusText}
              </p>
              <p className="mt-2 text-xs text-muted-foreground" data-testid="linked-list-cycle-status">
                Cycle status: {step.hasCycle ? "Detected" : "Not detected"}
              </p>
            </CardContent>
          </Card>
          <CodePanel title="Linked List Core Logic" code={listCode} />
        </div>
      </section>
    </PageMotionWrapper>
  );
}
