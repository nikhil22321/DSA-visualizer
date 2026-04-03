import { useEffect, useState } from "react";
import { Plus, Search, Sigma, Trash2 } from "lucide-react";

import { StepGuideDrawer } from "@/components/common/StepGuideDrawer";
import { CodePanel } from "@/components/common/CodePanel";
import { ControlCluster } from "@/components/common/ControlCluster";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TimelineSlider } from "@/components/common/TimelineSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { usePlayback } from "@/hooks/usePlayback";
import { useAppStore } from "@/store/useAppStore";

const stackCode = `push(x): stack.append(x)\npop(): return stack.pop()\npeek(): return stack[-1]`;

const calcStats = (steps) => ({
  executionSteps: steps.length,
  comparisons: Math.max(0, steps.length - 1),
  swaps: 0,
  visitedNodes: steps.length,
  frontierPeak: 0,
});

const balancedParentheses = (s) => {
  const stack = [];
  const pairs = { ")": "(", "]": "[", "}": "{" };
  for (const ch of s) {
    if (["(", "[", "{"].includes(ch)) stack.push(ch);
    if ([")", "]", "}"].includes(ch)) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
};

const tokenizeInfix = (expr) => {
  const cleaned = expr.replace(/\s+/g, "");
  const tokens = cleaned.match(/\d+|[()+\-*/]/g);
  if (!tokens || tokens.join("") !== cleaned) {
    throw new Error("Invalid infix expression");
  }
  return tokens;
};

const infixToPostfix = (expr) => {
  const prec = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const out = [];
  const ops = [];
  const tokens = tokenizeInfix(expr);
  tokens.forEach((ch) => {
    if (/^\d+$/.test(ch)) out.push(ch);
    else if (ch === "(") ops.push(ch);
    else if (ch === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop());
      if (!ops.length) throw new Error("Mismatched parentheses");
      ops.pop();
    } else {
      if (!prec[ch]) throw new Error("Invalid operator");
      while (ops.length && prec[ops[ops.length - 1]] >= prec[ch]) out.push(ops.pop());
      ops.push(ch);
    }
  });
  while (ops.length) {
    const op = ops.pop();
    if (op === "(") throw new Error("Mismatched parentheses");
    out.push(op);
  }
  return out.join(" ");
};

const evalPostfix = (expr) => {
  const s = [];
  const tokens = expr.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) throw new Error("Empty postfix expression");

  tokens.forEach((token) => {
    if (/^-?\d+$/.test(token)) {
      s.push(Number(token));
      return;
    }

    if (!["+", "-", "*", "/"].includes(token)) {
      throw new Error(`Invalid token: ${token}`);
    }
    if (s.length < 2) {
      throw new Error("Invalid postfix expression: operand underflow");
    }

    const b = s.pop();
    const a = s.pop();
    if (token === "+") s.push(a + b);
    if (token === "-") s.push(a - b);
    if (token === "*") s.push(a * b);
    if (token === "/") {
      if (b === 0) throw new Error("Division by zero");
      s.push(Math.floor(a / b));
    }
  });

  if (s.length !== 1) {
    throw new Error("Invalid postfix expression: leftover operands");
  }
  return s.pop();
};

export default function StackPage() {
  const [valueInput, setValueInput] = useState("25");
  const [expressionInput, setExpressionInput] = useState("(1+2)*3");
  const [stack, setStack] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("Stack initialized");

  const { globalSpeed, setGlobalSpeed, shortcutsEnabled } = useAppStore();
  const playback = usePlayback({ steps: history, speed: globalSpeed, shortcutsEnabled });

  const pushStep = (action, nextStack, extra = {}) => {
    const step = {
      action,
      stack: [...nextStack],
      status: extra.status || status,
      internalState: extra.internalState || {},
      stats: calcStats([...history, {}]),
    };
    setHistory((prev) => [...prev, step]);
  };

  useEffect(() => {
    setHistory([
      {
        action: "Stack initialized",
        stack: [],
        status: "Stack initialized",
        internalState: {},
        stats: calcStats([{}]),
      },
    ]);
  }, []);

  useEffect(() => {
    if (history.length > 0) playback.jumpToStep(history.length - 1);
  }, [history.length]);

  const step = history[playback.currentStep] || history[0] || {
    action: "Ready",
    stack,
    status,
    internalState: {},
    stats: calcStats(history),
  };

  const pushValue = () => {
    const val = Number(valueInput);
    if (!Number.isFinite(val)) return;
    const next = [...stack, val];
    setStack(next);
    setStatus(`Pushed ${val}`);
    pushStep(`Push ${val}`, next, { internalState: { top: val } });
  };

  const popValue = () => {
    if (!stack.length) return;
    const next = [...stack];
    const popped = next.pop();
    setStack(next);
    setStatus(`Popped ${popped}`);
    pushStep(`Pop ${popped}`, next, { internalState: { popped } });
  };

  const peekValue = () => {
    const top = stack[stack.length - 1];
    const msg = top === undefined ? "Stack is empty" : `Top is ${top}`;
    setStatus(msg);
    pushStep("Peek", stack, { status: msg, internalState: { top } });
  };

  const runBalanced = () => {
    const ok = balancedParentheses(expressionInput);
    const msg = ok ? "Balanced parentheses: Valid" : "Balanced parentheses: Invalid";
    setStatus(msg);
    pushStep("Balanced Parentheses Check", stack, { status: msg, internalState: { expressionInput, ok } });
  };

  const runInfix = () => {
    try {
      const postfix = infixToPostfix(expressionInput);
      const msg = `Postfix: ${postfix}`;
      setStatus(msg);
      pushStep("Infix to Postfix", stack, { status: msg, internalState: { postfix } });
    } catch {
      toast.error("Invalid infix expression");
    }
  };

  const runPostfixEval = () => {
    try {
      const result = evalPostfix(expressionInput);
      const msg = `Postfix Evaluation Result: ${result}`;
      setStatus(msg);
      pushStep("Postfix Evaluation", stack, { status: msg, internalState: { result } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Invalid postfix expression";
      toast.error(msg);
      setStatus(msg);
      pushStep("Postfix Evaluation Error", stack, { status: msg, internalState: { expressionInput } });
    }
  };

  return (
    <PageMotionWrapper testId="stack-page">
      <Card className="border-border/70 bg-card/70" data-testid="stack-header-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="stack-header-row">
            <div>
              <CardTitle className="font-heading text-3xl" data-testid="stack-page-title">Stack Visualizer</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="stack-page-subtitle">
                Push/Pop/Peek + Balanced Parentheses + Infix to Postfix + Postfix Evaluation.
              </p>
            </div>
            <StepGuideDrawer
              algorithm="Stack Operations"
              currentStep={playback.currentStep}
              action={step.action}
              complexity="Push/Pop O(1), applications O(n)"
              internalState={step.internalState}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4" data-testid="stack-input-grid">
            <Input value={valueInput} onChange={(e) => setValueInput(e.target.value)} placeholder="Value" data-testid="stack-value-input" />
            <Button type="button" onClick={pushValue} className="rounded-full" data-testid="stack-push-button">
              <Plus className="h-4 w-4" /> Push
            </Button>
            <Button type="button" variant="outline" onClick={popValue} className="rounded-full" data-testid="stack-pop-button">
              <Trash2 className="h-4 w-4" /> Pop
            </Button>
            <Button type="button" variant="outline" onClick={peekValue} className="rounded-full" data-testid="stack-peek-button">
              <Search className="h-4 w-4" /> Peek
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4" data-testid="stack-application-grid">
            <Input
              value={expressionInput}
              onChange={(e) => setExpressionInput(e.target.value)}
              placeholder="Expression"
              data-testid="stack-expression-input"
            />
            <Button type="button" variant="secondary" onClick={runBalanced} data-testid="stack-balanced-button">
              Balanced Check
            </Button>
            <Button type="button" variant="secondary" onClick={runInfix} data-testid="stack-infix-postfix-button">
              Infix → Postfix
            </Button>
            <Button type="button" variant="secondary" onClick={runPostfixEval} data-testid="stack-postfix-eval-button">
              <Sigma className="h-4 w-4" /> Postfix Eval
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12" data-testid="stack-main-grid">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/70 bg-card/70" data-testid="stack-visual-card">
            <CardHeader>
              <CardTitle className="font-heading text-xl" data-testid="stack-current-action">{step.action}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-background/70 p-4" data-testid="stack-visual-column">
                <div className="mx-auto flex min-h-[320px] w-48 flex-col-reverse gap-2 rounded border border-primary/40 p-3">
                  {step.stack.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground" data-testid="stack-empty-text">empty</p>
                  ) : (
                    step.stack.map((item, idx) => (
                      <div key={`${item}-${idx}`} className="rounded border bg-primary/15 px-3 py-2 text-center font-code" data-testid={`stack-item-${idx}`}>
                        {item}
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
          <Card className="border-border/70 bg-card/70" data-testid="stack-status-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="stack-status-title">Application Output</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm" data-testid="stack-status-text">{step.status}</p>
            </CardContent>
          </Card>
          <CodePanel title="Stack Core Logic" code={stackCode} />
        </div>
      </section>
    </PageMotionWrapper>
  );
}
