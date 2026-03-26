import { shouldHideBarLabels } from "@/modules/sorting/sortingUtils";

const pointerTags = (pointers, index, pivotIndex) => {
  const tags = [];
  if (pointers?.i === index) tags.push("i");
  if (pointers?.j === index) tags.push("j");
  if (pivotIndex === index) tags.push("pivot");
  return tags;
};

const colorClassForBar = ({ step, index, sortedSet, waveIndex }) => {
  const { type, indices = [], pivotIndex } = step || {};
  if (sortedSet.has(index) || waveIndex >= index) return "bg-green-500";
  if (pivotIndex === index || type === "pivot") return "bg-purple-500";
  if (type === "swap" && indices.includes(index)) return "bg-red-500";
  if (type === "compare" && indices.includes(index)) return "bg-yellow-400";
  return "bg-blue-500";
};

export const SortingBars = ({ step, waveIndex = -1, testId }) => {
  const values = step?.array || [];
  const maxValue = Math.max(...values, 1);
  const hideLabels = shouldHideBarLabels(values.length);
  const sortedSet = new Set(step?.sorted || []);
  const [a, b] = step?.indices || [];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-3" data-testid={testId || "sorting-bars-canvas"}>
      <div className="visual-grid absolute inset-0 opacity-70" aria-hidden />
      <div className="relative z-10 flex h-[360px] items-end gap-1 overflow-hidden" data-testid="sorting-bars-wrapper">
        {values.map((value, index) => {
          const height = Math.max(8, (value / maxValue) * 100);
          const tags = pointerTags(step?.pointers, index, step?.pivotIndex);
          const className = colorClassForBar({ step, index, sortedSet, waveIndex });

          let transform = "translateX(0px)";
          if (step?.type === "swap" && Number.isInteger(a) && Number.isInteger(b)) {
            const dist = Math.abs(a - b) * 12;
            if (index === a) transform = `translateX(${a < b ? dist : -dist}px)`;
            if (index === b) transform = `translateX(${a < b ? -dist : dist}px)`;
          }
          if (step?.type === "compare" && step?.indices?.includes(index)) {
            transform = "scale(1.05)";
          }

          return (
            <div key={`${index}-${value}`} className="flex h-full min-w-[7px] flex-1 flex-col items-center justify-end" data-testid={`sorting-bar-column-${index}`}>
              <div className="mb-1 flex h-6 items-end gap-1 text-[10px] font-semibold" data-testid={`sorting-pointer-slot-${index}`}>
                {tags.map((tag) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded bg-primary/15 px-1 py-0.5 text-[9px] uppercase text-primary"
                    data-testid={`sorting-pointer-${tag}-${index}`}
                  >
                    ↑ {tag}
                  </span>
                ))}
              </div>
              <div
                style={{
                  height: `${height}%`,
                  transform,
                  transition: "height 0.3s ease, transform 0.24s ease-in-out, background-color 0.2s ease",
                }}
                className={`${className} w-full rounded-t-md shadow-[0_0_10px_rgba(59,130,246,0.2)] hover:brightness-110`}
                data-testid={`sorting-bar-${index}`}
                title={`Index ${index}: ${value}`}
              />
              {!hideLabels && (
                <span className="mt-1 font-code text-[10px] text-muted-foreground" data-testid={`sorting-bar-label-${index}`}>
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
