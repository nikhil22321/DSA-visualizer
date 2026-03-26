import { motion } from "framer-motion";

export const SortingBars = ({ step, maxValue = 100, testId }) => {
  const values = step?.array || [];
  const active = new Set(step?.active || []);
  const swapped = new Set(step?.swapped || []);
  const sorted = new Set(step?.sorted || []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-3"
      data-testid={testId || "sorting-bars-canvas"}
    >
      <div className="visual-grid absolute inset-0 opacity-70" aria-hidden />
      <div className="relative z-10 flex h-[340px] items-end gap-1.5 overflow-hidden">
        {values.map((value, index) => {
          const height = Math.max(8, (value / maxValue) * 100);
          const className = sorted.has(index)
            ? "bg-emerald-500"
            : swapped.has(index)
              ? "bg-red-500"
              : active.has(index)
                ? "bg-yellow-500"
                : "bg-primary";
          return (
            <motion.div
              key={`${index}-${value}`}
              layout
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              style={{ height: `${height}%` }}
              className={`${className} min-w-[8px] flex-1 rounded-t-md shadow-sm`}
              data-testid={`sorting-bar-${index}`}
              title={`Index ${index}: ${value}`}
            />
          );
        })}
      </div>
    </div>
  );
};
