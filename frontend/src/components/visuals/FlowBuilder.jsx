import { useMemo } from "react";
import { Background, Controls, ReactFlow } from "@xyflow/react";

const initialNodes = [
  { id: "1", data: { label: "Start" }, position: { x: 30, y: 90 } },
  { id: "2", data: { label: "Loop (i < n)" }, position: { x: 220, y: 30 } },
  { id: "3", data: { label: "Compare a[i], a[i+1]" }, position: { x: 220, y: 150 } },
  { id: "4", data: { label: "Swap" }, position: { x: 430, y: 150 } },
  { id: "5", data: { label: "Update Pointer" }, position: { x: 620, y: 90 } },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
  { id: "e3-4", source: "3", target: "4", animated: true },
  { id: "e4-5", source: "4", target: "5" },
];

export const FlowBuilder = () => {
  const nodes = useMemo(() => initialNodes, []);
  const edges = useMemo(() => initialEdges, []);

  return (
    <div className="h-[280px] overflow-hidden rounded-2xl border border-border/70 bg-background/80" data-testid="flow-builder-root">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }} data-testid="flow-builder-canvas">
        <Background gap={18} size={1} color="hsl(var(--border))" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};
