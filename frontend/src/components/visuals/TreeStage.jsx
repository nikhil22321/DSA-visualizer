import { AnimatePresence, motion } from "framer-motion";

const NODE_STYLES = {
  default: {
    fill: "hsla(var(--primary), 0.14)",
    stroke: "hsl(var(--primary))",
    text: "hsl(var(--foreground))",
  },
  visited: {
    fill: "rgba(59, 130, 246, 0.16)",
    stroke: "rgb(59, 130, 246)",
    text: "rgb(29, 78, 216)",
  },
  focus: {
    fill: "rgba(251, 191, 36, 0.2)",
    stroke: "rgb(245, 158, 11)",
    text: "rgb(146, 64, 14)",
  },
  result: {
    fill: "rgba(34, 197, 94, 0.18)",
    stroke: "rgb(34, 197, 94)",
    text: "rgb(21, 128, 61)",
  },
  new: {
    fill: "rgba(168, 85, 247, 0.18)",
    stroke: "rgb(147, 51, 234)",
    text: "rgb(107, 33, 168)",
  },
  rotation: {
    fill: "rgba(244, 63, 94, 0.16)",
    stroke: "rgb(225, 29, 72)",
    text: "rgb(159, 18, 57)",
  },
};

const LEGEND_ITEMS = [
  { label: "Current focus", key: "focus" },
  { label: "Visited", key: "visited" },
  { label: "Result", key: "result" },
  { label: "New / changed", key: "new" },
];

const buildSegmentEntries = (arr, tree) => {
  if (!arr?.length || !tree?.length) return [];

  const output = [];
  const walk = (index, left, right, depth) => {
    if (index >= tree.length || left > right || tree[index] === 0) return;
    output.push({
      index,
      left,
      right,
      depth,
      value: tree[index],
      isLeaf: left === right,
    });
    if (left === right) return;
    const mid = Math.floor((left + right) / 2);
    walk(index * 2, left, mid, depth + 1);
    walk(index * 2 + 1, mid + 1, right, depth + 1);
  };

  walk(1, 0, arr.length - 1, 0);
  return output;
};

const getTreeNodeState = (nodeId, internalState) => {
  const resultNodes = new Set(internalState?.resultNodes || []);
  const focusNodes = new Set(internalState?.focusNodes || []);
  const newNodes = new Set(internalState?.newNodes || []);
  const rotationNodes = new Set(internalState?.rotationNodes || []);
  const visitedNodes = new Set(internalState?.visitedNodes || []);

  if (resultNodes.has(nodeId)) return "result";
  if (focusNodes.has(nodeId)) return "focus";
  if (newNodes.has(nodeId)) return "new";
  if (rotationNodes.has(nodeId)) return "rotation";
  if (visitedNodes.has(nodeId)) return "visited";
  return "default";
};

const edgeAccent = (edge, internalState) => {
  const hot = new Set([
    ...(internalState?.focusNodes || []),
    ...(internalState?.resultNodes || []),
    ...(internalState?.newNodes || []),
  ]);
  if (hot.has(edge.from) && hot.has(edge.to)) return "rgba(245, 158, 11, 0.85)";
  if (hot.has(edge.from) || hot.has(edge.to)) return "rgba(59, 130, 246, 0.75)";
  return "rgba(148, 163, 184, 0.45)";
};

const LegendPill = ({ itemKey, label }) => {
  const style = NODE_STYLES[itemKey];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: style.fill, border: `1px solid ${style.stroke}` }}
        aria-hidden
      />
      {label}
    </span>
  );
};

const TreeCanvas = ({ treeType, layout, internalState }) => (
  <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] p-4">
    <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden />
    <div className="relative z-10 mb-4 flex flex-wrap gap-2">
      {LEGEND_ITEMS.map((item) => (
        <LegendPill key={item.key} itemKey={item.key} label={item.label} />
      ))}
    </div>

    <svg viewBox="0 0 1000 500" className="relative z-10 h-[430px] w-full" data-testid="tree-svg-canvas">
      {layout.edges.map((edge) => {
        const from = layout.nodes.find((node) => node.id === edge.from);
        const to = layout.nodes.find((node) => node.id === edge.to);
        if (!from || !to) return null;
        return (
          <motion.line
            key={`${edge.from}-${edge.to}`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={edgeAccent(edge, internalState)}
            strokeWidth="3"
            strokeLinecap="round"
            data-testid={`tree-edge-${edge.from}-${edge.to}`}
          />
        );
      })}

      <AnimatePresence>
        {layout.nodes.map((node) => {
          const stateKey = getTreeNodeState(node.id, internalState);
          const style = NODE_STYLES[stateKey];
          const emphasized = stateKey !== "default";

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: emphasized ? 1.06 : 1, x: node.x, y: node.y }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              data-testid={`tree-node-${node.value}-${node.depth}`}
            >
              {emphasized ? (
                <motion.circle
                  cx="0"
                  cy="0"
                  r="34"
                  fill={style.fill}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.9, ease: "easeInOut" }}
                />
              ) : null}
              <motion.circle
                cx="0"
                cy="0"
                r="26"
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth="2.5"
              />
              <text x="0" y="5" textAnchor="middle" className="font-code text-[15px] font-semibold" fill={style.text}>
                {node.value}
              </text>
              {treeType === "avl" ? (
                <text x="0" y="42" textAnchor="middle" className="font-code text-[10px]" fill="hsl(var(--muted-foreground))">
                  h={node.height}
                </text>
              ) : null}
            </motion.g>
          );
        })}
      </AnimatePresence>
    </svg>
  </div>
);

const TrieCanvas = ({ activeStep, words }) => {
  const activePrefix = activeStep.internalState?.activePrefix || [];
  const word = activeStep.internalState?.activeWord || "";

  return (
    <div className="space-y-4 rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(15,23,42,0.02))] p-4" data-testid="trie-visual-panel">
      <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Active Prefix</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(word || "trie").split("").map((character, index) => {
            const active = index < activePrefix.length;
            return (
              <motion.span
                key={`${character}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, scale: active ? 1.06 : 1 }}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-4 font-code text-sm ${
                  active
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
                    : "border-border/70 bg-background/70 text-muted-foreground"
                }`}
              >
                {character}
              </motion.span>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Stored Words</p>
        <div className="mt-3 flex flex-wrap gap-2" data-testid="trie-words-list">
          {words.length ? (
            words.map((item) => {
              const highlighted = item === activeStep.internalState?.activeWord;
              const foundWord = activeStep.internalState?.found && highlighted;
              return (
                <motion.span
                  key={item}
                  layout
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: foundWord ? 1.06 : 1 }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    foundWord
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
                      : highlighted
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-700"
                        : "border-primary/30 bg-primary/10 text-foreground"
                  }`}
                  data-testid={`trie-word-${item}`}
                >
                  {item}
                </motion.span>
              );
            })
          ) : (
            <span className="text-sm text-muted-foreground">No words yet</span>
          )}
        </div>
      </div>
    </div>
  );
};

const SegmentCanvas = ({ activeStep }) => {
  const entries = buildSegmentEntries(activeStep.segmentArr, activeStep.segmentTree);
  const activeNodes = new Set(activeStep.internalState?.activeSegmentNodes || []);
  const activeIndices = new Set(activeStep.internalState?.activeSegmentIndices || []);
  const resultNodes = new Set(activeStep.internalState?.resultSegmentNodes || []);

  return (
    <div className="space-y-4 rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(59,130,246,0.08),rgba(15,23,42,0.02))] p-4" data-testid="segment-visual-panel">
      <div className="rounded-2xl border border-border/60 bg-background/80 p-4" data-testid="segment-array-view">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Input Array</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {activeStep.segmentArr.map((value, index) => {
            const active = activeIndices.has(index);
            return (
              <motion.span
                key={`${value}-${index}`}
                layout
                animate={{ scale: active ? 1.06 : 1 }}
                className={`rounded-2xl border px-3 py-2 font-code text-xs ${
                  active
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-700"
                    : "border-border/70 bg-background/70"
                }`}
                data-testid={`segment-array-value-${index}`}
              >
                {index}:{value}
              </motion.span>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/80 p-4" data-testid="segment-tree-view">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Segment Nodes</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => {
            const active = activeNodes.has(entry.index);
            const result = resultNodes.has(entry.index);
            return (
              <motion.div
                key={entry.index}
                layout
                animate={{ y: active ? -3 : 0, scale: result ? 1.02 : 1 }}
                className={`rounded-2xl border p-3 ${
                  result
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : active
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-border/70 bg-background/70"
                }`}
                data-testid={`segment-tree-node-${entry.index}`}
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  node [{entry.index}]
                </p>
                <p className="mt-2 font-code text-base font-semibold">{entry.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  range [{entry.left}, {entry.right}] {entry.isLeaf ? "leaf" : `depth ${entry.depth}`}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const TreeStage = ({ treeType, activeStep, layout, words }) => {
  if (treeType === "trie") {
    return <TrieCanvas activeStep={activeStep} words={words} />;
  }

  if (treeType === "segment") {
    return <SegmentCanvas activeStep={activeStep} />;
  }

  return <TreeCanvas treeType={treeType} layout={layout} internalState={activeStep.internalState || {}} />;
};
