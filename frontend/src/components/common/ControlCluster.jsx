import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";

export const ControlCluster = ({
  isPlaying,
  onPlayToggle,
  onStepForward,
  onStepBack,
  onReset,
  speed,
  onSpeedChange,
  disabled = false,
}) => (
  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card/70 p-3" data-testid="global-control-cluster">
    <Button
      type="button"
      variant="default"
      className="rounded-full"
      onClick={onPlayToggle}
      data-testid="control-play-pause-button"
      disabled={disabled}
    >
      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {isPlaying ? "Pause" : "Play"}
    </Button>
    <Button
      type="button"
      variant="outline"
      className="rounded-full"
      onClick={onStepBack}
      data-testid="control-step-back-button"
      disabled={disabled}
    >
      <SkipBack className="h-4 w-4" /> Step Back
    </Button>
    <Button
      type="button"
      variant="outline"
      className="rounded-full"
      onClick={onStepForward}
      data-testid="control-step-forward-button"
      disabled={disabled}
    >
      <SkipForward className="h-4 w-4" /> Step Forward
    </Button>
    <Button
      type="button"
      variant="ghost"
      className="rounded-full"
      onClick={onReset}
      data-testid="control-reset-button"
      disabled={disabled}
    >
      <RotateCcw className="h-4 w-4" /> Reset
    </Button>

    <div className="ml-auto flex items-center gap-2" data-testid="control-speed-container">
      <label htmlFor="speed-input" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Speed
      </label>
      <input
        id="speed-input"
        type="range"
        min="120"
        max="1200"
        step="20"
        value={speed}
        onChange={(event) => onSpeedChange(Number(event.target.value))}
        data-testid="control-speed-range"
      />
      <span className="font-code text-xs" data-testid="control-speed-value">{speed}ms</span>
    </div>
  </div>
);
