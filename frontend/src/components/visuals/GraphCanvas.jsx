import { useRef, useState } from "react";

export const GraphCanvas = ({
  nodes,
  edges,
  directed,
  weighted,
  step,
  startNode,
  targetNode,
  deleteMode,
  edgeMode,
  pendingEdgeSource,
  onCanvasAddNode,
  onNodeMove,
  onNodeClick,
  onNodeDelete,
  onEdgeDelete,
}) => {
  const svgRef = useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const draggingRef = useRef(null);
  const dragMovedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const visited = new Set(step?.visitedNodes || []);
  const activeNodes = new Set(step?.activeNodes || []);
  const activeEdges = new Set(step?.activeEdges || []);

  const getSvgPoint = (event) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1000;
    const y = ((event.clientY - rect.top) / rect.height) * 560;
    return { x, y };
  };

  const handleCanvasClick = (event) => {
    if (event.target.tagName !== "svg") return;
    const point = getSvgPoint(event);
    onCanvasAddNode(point);
  };

  const handleMouseMove = (event) => {
    if (!draggingRef.current) return;
    const point = getSvgPoint(event);
    const dx = Math.abs(point.x - dragStartRef.current.x);
    const dy = Math.abs(point.y - dragStartRef.current.y);
    if (dx > 2 || dy > 2) dragMovedRef.current = true;
    onNodeMove(draggingRef.current, point);
  };

  return (
    <div className="relative rounded-2xl border border-border/60 bg-background/70 p-4" data-testid="graph-canvas-root">
      <div className="visual-grid absolute inset-0 opacity-70" aria-hidden />
      <svg
        ref={svgRef}
        viewBox="0 0 1000 560"
        className="relative z-10 h-[440px] w-full cursor-crosshair"
        data-testid="graph-canvas-svg"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={() => {
          setDraggingNodeId(null);
          draggingRef.current = null;
        }}
        onMouseLeave={() => {
          setDraggingNodeId(null);
          draggingRef.current = null;
        }}
      >
        <defs>
          <marker id="graph-arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto-start-reverse">
            <path d="M0,0 L12,6 L0,12 z" fill="hsl(var(--muted-foreground))" />
          </marker>
          <marker id="graph-arrow-active" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto-start-reverse">
            <path d="M0,0 L12,6 L0,12 z" fill="hsl(var(--chart-4))" />
          </marker>
        </defs>

        {edges.map((edge) => {
          const source = nodes.find((node) => node.id === edge.source);
          const target = nodes.find((node) => node.id === edge.target);
          if (!source || !target) return null;

          const isActive = activeEdges.has(edge.id);
          const stroke = isActive ? "hsl(var(--chart-4))" : "hsl(var(--muted-foreground))";
          return (
            <g
              key={edge.id}
              data-testid={`graph-edge-${edge.id}`}
              onContextMenu={(event) => {
                event.preventDefault();
                onEdgeDelete(edge.id);
              }}
            >
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={stroke}
                strokeWidth={isActive ? 4 : 2.2}
                markerEnd={directed ? `url(#${isActive ? "graph-arrow-active" : "graph-arrow"})` : undefined}
                strokeDasharray={isActive ? "8 5" : undefined}
                className={isActive ? "animate-[graphFlow_0.9s_linear_infinite]" : ""}
                style={{ transition: "all 0.3s ease" }}
              />
              {weighted && (
                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2 - 8}
                  textAnchor="middle"
                  className="fill-foreground text-xs font-semibold"
                  data-testid={`graph-edge-weight-${edge.id}`}
                >
                  {edge.weight}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((node) => {
          const isVisited = visited.has(node.id);
          const isActive = activeNodes.has(node.id);
          const isStart = startNode === node.id;
          const isTarget = targetNode === node.id;
          const isPending = pendingEdgeSource === node.id;

          const fill = isVisited ? "#22c55e" : isActive ? "#facc15" : "#3b82f6";
          return (
            <g
              key={node.id}
              data-testid={`graph-node-${node.id}`}
              onClick={(event) => {
                event.stopPropagation();
                if (dragMovedRef.current) {
                  dragMovedRef.current = false;
                  return;
                }
                onNodeClick(node.id);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onNodeDelete(node.id);
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
                const point = getSvgPoint(event);
                dragStartRef.current = point;
                dragMovedRef.current = false;
                setDraggingNodeId(node.id);
                draggingRef.current = node.id;
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isActive || isVisited ? 28 : 24}
                fill={fill}
                stroke={deleteMode ? "#ef4444" : isPending ? "#a855f7" : isStart ? "#06b6d4" : isTarget ? "#f97316" : "#0f172a"}
                strokeWidth={isStart || isTarget || isPending ? 4 : 2}
                style={{
                  transition: "all 0.3s ease",
                  filter: isActive || isVisited ? "drop-shadow(0 0 12px rgba(250,204,21,0.55))" : "none",
                  transformOrigin: `${node.x}px ${node.y}px`,
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
              />
              <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-primary-foreground text-sm font-bold" style={{ pointerEvents: "none" }}>
                {node.id}
              </text>
              {isStart && (
                <text x={node.x} y={node.y - 34} textAnchor="middle" className="fill-cyan-400 text-xs font-semibold" data-testid={`graph-start-tag-${node.id}`} style={{ pointerEvents: "none" }}>
                  START
                </text>
              )}
              {isTarget && (
                <text x={node.x} y={node.y + 38} textAnchor="middle" className="fill-orange-400 text-xs font-semibold" data-testid={`graph-target-tag-${node.id}`} style={{ pointerEvents: "none" }}>
                  TARGET
                </text>
              )}
              {edgeMode && isPending && (
                <text x={node.x} y={node.y - 18} textAnchor="middle" className="fill-purple-400 text-[11px]" style={{ pointerEvents: "none" }}>
                  edge source
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
