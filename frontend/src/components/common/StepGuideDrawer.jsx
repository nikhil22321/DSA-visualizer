import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, LoaderCircle } from "lucide-react";

import { getStepGuide } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner";

export const StepGuideDrawer = ({ algorithm, currentStep, action, complexity, internalState }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [response, setResponse] = useState("Open the guide to review why this step is happening.");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [lastExplainedSignature, setLastExplainedSignature] = useState(null);
  const mode = useAppStore((state) => state.mode);
  const stepSignature = useMemo(
    () => JSON.stringify({ algorithm, currentStep, action, complexity, internalState }),
    [action, algorithm, complexity, currentStep, internalState],
  );

  const explainStep = useCallback(async (userQuestion = "", signature = stepSignature) => {
    try {
      setLoading(true);
      const guideResponse = await getStepGuide({
        algorithm,
        current_step: currentStep + 1,
        explanation_context: action,
        complexity,
        internal_state: internalState || {},
        mode,
        session_id: sessionId,
        user_question: userQuestion || undefined,
      });
      setSessionId(guideResponse.session_id);
      setResponse(guideResponse.explanation);
      setSuggestedQuestions(guideResponse.suggested_questions || []);
      setFollowUpQuestion("");
      setLastExplainedSignature(signature);
      toast.success("Step guide updated for the current algorithm step.");
    } catch (error) {
      toast.error("Unable to load the step guide right now.");
      setResponse("Could not fetch explanation. Try again on next step.");
    } finally {
      setLoading(false);
    }
  }, [action, algorithm, complexity, currentStep, internalState, mode, sessionId, stepSignature]);

  useEffect(() => {
    setSessionId(null);
    setLastExplainedSignature(null);
    setSuggestedQuestions([]);
    setFollowUpQuestion("");
    setResponse("Open the guide to review why this step is happening.");
  }, [algorithm]);

  useEffect(() => {
    if (lastExplainedSignature && lastExplainedSignature !== stepSignature) {
      setSuggestedQuestions([]);
      setFollowUpQuestion("");
      setResponse("The visualization moved to a new step. Click explain to refresh the guide.");
    }
  }, [lastExplainedSignature, stepSignature]);

  useEffect(() => {
    if (!open || loading || lastExplainedSignature === stepSignature) {
      return;
    }
    explainStep("", stepSignature);
  }, [explainStep, lastExplainedSignature, loading, open, stepSignature]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          className="rounded-full"
          variant="outline"
          data-testid="step-guide-open-button"
        >
          <BookOpen className="h-4 w-4" /> Step Guide
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full border-l border-border/70 bg-card/95 sm:max-w-xl" data-testid="step-guide-drawer">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2" data-testid="step-guide-title">
            <BookOpen className="h-4 w-4 text-primary" /> Step Guide
          </SheetTitle>
          <SheetDescription data-testid="step-guide-description">
            On-demand explanation based on the current algorithm state, step history, and complexity.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4" data-testid="step-guide-content">
          <div className="rounded-xl border border-border/70 bg-background/80 p-4 text-sm" data-testid="step-guide-current-state">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Current Context</p>
            <p className="mt-2"><strong>Algorithm:</strong> {algorithm}</p>
            <p><strong>Step:</strong> {currentStep + 1}</p>
            <p><strong>Action:</strong> {action}</p>
            <p><strong>Mode:</strong> {mode}</p>
          </div>

          <Button
            type="button"
            onClick={() => explainStep()}
            disabled={loading}
            className="w-full rounded-full"
            data-testid="step-guide-explain-button"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            Explain Current Step
          </Button>

          <div className="rounded-xl border border-border/70 bg-background/80 p-4" data-testid="step-guide-response-panel">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Guide Response</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" data-testid="step-guide-response-text">
              {response}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/80 p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Need More Help?</p>
            <Textarea
              value={followUpQuestion}
              onChange={(event) => setFollowUpQuestion(event.target.value)}
              placeholder="Ask a follow-up question about this step..."
              className="min-h-[96px] resize-none"
              data-testid="step-guide-followup-input"
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full rounded-full"
              disabled={loading || !followUpQuestion.trim()}
              onClick={() => explainStep(followUpQuestion.trim())}
              data-testid="step-guide-followup-button"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              Ask Follow-up
            </Button>

            {suggestedQuestions.length > 0 ? (
              <div className="space-y-2" data-testid="step-guide-suggested-questions">
                {suggestedQuestions.map((question) => (
                  <Button
                    key={question}
                    type="button"
                    variant="outline"
                    className="w-full justify-start rounded-2xl text-left whitespace-normal h-auto py-3"
                    disabled={loading}
                    onClick={() => explainStep(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
