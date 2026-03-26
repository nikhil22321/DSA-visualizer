export const ComplexityBadge = ({ time, space }) => (
  <div className="flex flex-wrap gap-2" data-testid="complexity-badge-group">
    <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs" data-testid="complexity-time-badge">
      Time: {time}
    </span>
    <span className="rounded-full border border-chart-2/40 bg-chart-2/10 px-3 py-1 text-xs" data-testid="complexity-space-badge">
      Space: {space}
    </span>
  </div>
);
