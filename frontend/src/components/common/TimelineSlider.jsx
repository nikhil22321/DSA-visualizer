import { Slider } from "@/components/ui/slider";

export const TimelineSlider = ({ currentStep, maxStep, onChange, totalSteps = maxStep + 1 }) => {
  const displayTotal = Math.max(totalSteps, 1);
  const displayCurrent = Math.min(currentStep + 1, displayTotal);

  return (
    <div
      className="rounded-2xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,145,178,0.18),rgba(15,23,42,0.84))] p-4 shadow-[0_16px_40px_rgba(8,145,178,0.14)]"
      data-testid="timeline-slider-panel"
    >
      <div className="mb-3 flex items-center justify-between gap-3" data-testid="timeline-label-row">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80" data-testid="timeline-title">
            Step History Timeline
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Scrub through the algorithm flow and inspect each state.
          </p>
        </div>
        <p
          className="rounded-full border border-cyan-300/30 bg-slate-950/50 px-3 py-1 font-code text-xs text-cyan-100"
          data-testid="timeline-step-counter"
        >
          Step {displayCurrent} of {displayTotal}
        </p>
      </div>
      <Slider
        value={[currentStep]}
        max={Math.max(maxStep, 1)}
        min={0}
        step={1}
        onValueChange={(value) => onChange(value[0] || 0)}
        trackClassName="h-2 bg-slate-800/90"
        rangeClassName="bg-gradient-to-r from-cyan-400 to-emerald-400"
        thumbClassName="h-5 w-5 border-cyan-200/70 bg-cyan-100 shadow-[0_0_0_4px_rgba(34,211,238,0.18)]"
        data-testid="timeline-slider-input"
      />
    </div>
  );
};
