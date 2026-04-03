import { useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { getTreeCanvasData } from "@/modules/trees/treeVisualizer";

const getNodePalette = (nodeId, displayStep) => {
  if (displayStep.deletedNodeIds?.includes(nodeId)) {
    return {
      fill: "#ef4444",
      stroke: "#fecaca",
      text: "#fff7f7",
      glow: "drop-shadow(0 0 18px rgba(239, 68, 68, 0.42))",
    };
  }

  if (displayStep.currentNodeId === nodeId) {
    return {
      fill: "#facc15",
      stroke: "#fef08a",
      text: "#111827",
      glow: "drop-shadow(0 0 22px rgba(250, 204, 21, 0.48))",
    };
  }

  if (displayStep.resultNodeIds?.includes(nodeId)) {
    return {
      fill: "#22c55e",
      stroke: "#bbf7d0",
      text: "#052e16",
      glow: "drop-shadow(0 0 18px rgba(34, 197, 94, 0.4))",
    };
  }

  if (displayStep.visitedNodeIds?.includes(nodeId)) {
    return {
      fill: "#34d399",
      stroke: "#d1fae5",
      text: "#064e3b",
      glow: "drop-shadow(0 0 16px rgba(52, 211, 153, 0.32))",
    };
  }

  if (displayStep.selectedNodeId === nodeId) {
    return {
      fill: "#38bdf8",
      stroke: "#bae6fd",
      text: "#082f49",
      glow: "drop-shadow(0 0 18px rgba(56, 189, 248, 0.34))",
    };
  }

  return {
    fill: "#2563eb",
    stroke: "#bfdbfe",
    text: "#eff6ff",
    glow: "drop-shadow(0 0 14px rgba(37, 99, 235, 0.28))",
  };
};

const legendItems = [
  { label: "Default", swatch: "bg-blue-600 ring-blue-200/60" },
  { label: "Selected", swatch: "bg-sky-400 ring-sky-100/70" },
  { label: "Current", swatch: "bg-yellow-400 ring-yellow-100/80" },
  { label: "Visited", swatch: "bg-emerald-400 ring-emerald-100/70" },
  { label: "Deleted", swatch: "bg-red-500 ring-red-100/70" },
];

export const InteractiveTreeStage = ({
  root,
  displayStep,
  treeType,
  onSelectNode,
  onClearSelection,
  onStageKeyDown,
  onAddLeft,
  onAddRight,
  onDeleteNode,
}) => {
  const { nodes, edges } = getTreeCanvasData(root);
  const selectedNode = nodes.find((node) => node.id === displayStep.selectedNodeId);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.9))] p-4 shadow-[0_22px_60px_rgba(2,132,199,0.12)] transition-all ${
        isKeyboardFocused ? "border-cyan-300/70 ring-2 ring-cyan-300/40" : "border-cyan-400/15"
      }`}
      onClick={() => onClearSelection?.()}
      onKeyDown={onStageKeyDown}
      onFocus={() => setIsKeyboardFocused(true)}
      onBlur={() => setIsKeyboardFocused(false)}
      tabIndex={0}
      role="region"
      aria-label="Tree visualization canvas. Use arrow keys to move selection and keyboard shortcuts to operate the tree."
      data-testid="tree-visualization-region"
    >
      <div
        className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(125,211,252,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.08)_1px,transparent_1px)] [background-size:36px_36px]"
        aria-hidden
      />
      <div className="relative z-10 mb-4 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
        {legendItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/65 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-200"
          >
            <span className={`h-2.5 w-2.5 rounded-full ring-2 ${item.swatch}`} />
            {item.label}
          </div>
        ))}
      </div>
      <div className="relative z-10 mb-4 flex flex-wrap gap-2 rounded-2xl border border-cyan-400/20 bg-slate-950/55 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
        <span className="text-cyan-100">Keyboard</span>
        <span>Arrows move</span>
        <span>[ / ] cycle</span>
        <span>Enter run</span>
        <span>Esc clear</span>
        {treeType === "binary" ? <span>L / R add child</span> : <span>I insert BST</span>}
        <span>Del remove</span>
        <span>G random</span>
      </div>
      <svg
        viewBox="0 0 1200 520"
        className="relative z-10 h-[460px] w-full"
        data-testid="tree-visualization-canvas"
      >
        {edges.map((edge) => (
          <motion.line
            key={`${edge.from}-${edge.to}`}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            stroke="rgba(125, 211, 252, 0.58)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          />
        ))}
        {nodes.map((node) => {
          const palette = getNodePalette(node.id, displayStep);

          return (
            <motion.g
              key={node.id}
              animate={{ x: node.x, y: node.y, scale: displayStep.currentNodeId === node.id ? 1.1 : 1 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="cursor-pointer"
              style={{ filter: palette.glow }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectNode(node.id);
              }}
              data-testid={`tree-node-${node.id}`}
            >
              <circle cx="0" cy="0" r="32" fill="rgba(15, 23, 42, 0.48)" />
              <circle
                cx="0"
                cy="0"
                r="28"
                strokeWidth="3"
                fill={palette.fill}
                stroke={palette.stroke}
              />
              <text
                x="0"
                y="6"
                textAnchor="middle"
                className="font-code text-[15px] font-semibold"
                fill={palette.text}
              >
                {node.value}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {selectedNode && treeType === "binary" ? (
        <div
          className="absolute z-20 w-48 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl"
          style={{
            left: `${Math.min(78, Math.max(2, (selectedNode.x / 1200) * 100))}%`,
            top: `${Math.min(74, Math.max(8, (selectedNode.y / 520) * 100))}%`,
          }}
          onClick={(event) => event.stopPropagation()}
          data-testid="tree-node-action-popover"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Selected</p>
          <p className="mt-1 text-sm font-semibold">Node {selectedNode.value}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={onAddLeft}>
              Add Left
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onAddRight}>
              Add Right
            </Button>
          </div>
          <Button type="button" size="sm" variant="destructive" className="mt-2 w-full" onClick={onDeleteNode}>
            Delete Node
          </Button>
        </div>
      ) : null}
    </div>
  );
};
