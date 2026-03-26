import { Slider } from "@/components/ui/slider";

export const TimelineSlider = ({ currentStep, maxStep, onChange }) => (
  <div className="rounded-2xl border border-border/70 bg-card/70 p-4" data-testid="timeline-slider-panel">
    <div className="mb-3 flex items-center justify-between" data-testid="timeline-label-row">
      <p className="text-xs uppercase tracking-widest text-muted-foreground" data-testid="timeline-title">
        Step History Timeline
      </p>
      <p className="font-code text-xs" data-testid="timeline-step-counter">
        {currentStep} / {maxStep}
      </p>
    </div>
    <Slider
      value={[currentStep]}
      max={Math.max(maxStep, 1)}
      min={0}
      step={1}
      onValueChange={(value) => onChange(value[0] || 0)}
      data-testid="timeline-slider-input"
    />
  </div>
);
