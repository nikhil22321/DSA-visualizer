import { useState } from "react";
import { Bot, LoaderCircle, Sparkles } from "lucide-react";

import { askTutor } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/sonner";

export const AITutorDrawer = ({ algorithm, currentStep, action, complexity, internalState }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [response, setResponse] = useState("Ask for an explanation to see reasoning for this step.");
  const mode = useAppStore((state) => state.mode);

  const explainStep = async () => {
    try {
      setLoading(true);
      const tutorResponse = await askTutor({
        algorithm,
        current_step: currentStep,
        explanation_context: action,
        complexity,
        internal_state: internalState || {},
        mode,
        session_id: sessionId,
      });
      setSessionId(tutorResponse.session_id);
      setResponse(tutorResponse.explanation);
      toast.success("AI tutor updated with current algorithm step.");
    } catch (error) {
      toast.error("Unable to fetch AI explanation right now.");
      setResponse("Could not fetch explanation. Try again on next step.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          className="rounded-full"
          variant="outline"
          data-testid="ai-tutor-open-button"
        >
          <Bot className="h-4 w-4" /> AI Tutor
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full border-l border-border/70 bg-card/95 sm:max-w-xl" data-testid="ai-tutor-drawer">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2" data-testid="ai-tutor-title">
            <Sparkles className="h-4 w-4 text-primary" /> AI Algorithm Tutor
          </SheetTitle>
          <SheetDescription data-testid="ai-tutor-description">
            Real-time explanation based on algorithm state, step history, and complexity.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4" data-testid="ai-tutor-content">
          <div className="rounded-xl border border-border/70 bg-background/80 p-4 text-sm" data-testid="ai-tutor-current-state">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Current Context</p>
            <p className="mt-2"><strong>Algorithm:</strong> {algorithm}</p>
            <p><strong>Step:</strong> {currentStep}</p>
            <p><strong>Action:</strong> {action}</p>
            <p><strong>Mode:</strong> {mode}</p>
          </div>

          <Button
            type="button"
            onClick={explainStep}
            disabled={loading}
            className="w-full rounded-full"
            data-testid="ai-tutor-explain-step-button"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Explain Step
          </Button>

          <div className="rounded-xl border border-border/70 bg-background/80 p-4" data-testid="ai-tutor-response-panel">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Tutor Response</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" data-testid="ai-tutor-response-text">
              {response}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
