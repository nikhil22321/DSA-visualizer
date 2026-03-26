export const GraphCanvas = ({ graph, step, startNode }) => {
  const visited = new Set(step?.visited || []);
  const frontier = new Set(step?.frontier || []);
  const activeEdges = new Set(step?.activeEdges || []);

  return (
    <div className="relative rounded-2xl border border-border/60 bg-background/70 p-4" data-testid="graph-canvas-root">
      <div className="visual-grid absolute inset-0 opacity-70" aria-hidden />
      <svg viewBox="0 0 100 100" className="relative z-10 h-[420px] w-full" data-testid="graph-canvas-svg">
        {graph.edges.map((edge) => {
          const source = graph.nodes.find((node) => node.id === edge.source);
          const target = graph.nodes.find((node) => node.id === edge.target);
          if (!source || !target) return null;
          return (
            <g key={edge.id} data-testid={`graph-edge-${edge.id}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={activeEdges.has(edge.id) ? "hsl(var(--chart-4))" : "hsl(var(--border))"}
                strokeWidth={activeEdges.has(edge.id) ? 1.4 : 0.7}
              />
              <text
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2}
                className="fill-foreground text-[3px]"
                data-testid={`graph-edge-weight-${edge.id}`}
              >
                {edge.weight}
              </text>
            </g>
          );
        })}

        {graph.nodes.map((node) => {
          const isVisited = visited.has(node.id);
          const isFrontier = frontier.has(node.id);
          const isStart = String(startNode) === String(node.id);
          return (
            <g key={node.id} data-testid={`graph-node-${node.id}`}>
              <circle
                cx={node.x}
                cy={node.y}
                r="4.3"
                stroke="hsl(var(--background))"
                strokeWidth="0.6"
                fill={
                  isStart
                    ? "hsl(var(--chart-2))"
                    : isVisited
                      ? "hsl(var(--chart-1))"
                      : isFrontier
                        ? "hsl(var(--chart-4))"
                        : "hsl(var(--muted))"
                }
              />
              <text x={node.x} y={node.y + 1.3} textAnchor="middle" className="fill-foreground text-[2.5px] font-semibold">
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
