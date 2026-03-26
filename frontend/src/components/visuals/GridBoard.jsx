const cellClass = ({ key, walls, visited, frontier, path, startKey, endKey }) => {
  if (key === startKey) return "bg-chart-2";
  if (key === endKey) return "bg-chart-5";
  if (path.has(key)) return "bg-yellow-400";
  if (frontier.has(key)) return "bg-chart-4/80";
  if (visited.has(key)) return "bg-chart-1/60";
  if (walls.has(key)) return "bg-muted-foreground/40";
  return "bg-card";
};

export const GridBoard = ({ rows, cols, walls, start, end, step, onCellClick, testId }) => {
  const wallSet = new Set(walls || []);
  const visited = new Set(step?.visited || []);
  const frontier = new Set(step?.frontier || []);
  const path = new Set(step?.path || []);
  const startKey = `${start.row}-${start.col}`;
  const endKey = `${end.row}-${end.col}`;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-3" data-testid={testId || "grid-board-root"}>
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        data-testid="grid-board-cells"
      >
        {Array.from({ length: rows * cols }, (_, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const key = `${row}-${col}`;
          const clickable = !!onCellClick;
          return (
            <button
              key={key}
              type="button"
              className={`${cellClass({
                key,
                walls: wallSet,
                visited,
                frontier,
                path,
                startKey,
                endKey,
              })} aspect-square rounded-[2px] border border-background/20 transition-colors duration-150`}
              onClick={() => clickable && onCellClick(row, col)}
              data-testid={`grid-cell-${row}-${col}`}
              aria-label={`Grid cell ${row}, ${col}`}
            />
          );
        })}
      </div>
    </div>
  );
};
