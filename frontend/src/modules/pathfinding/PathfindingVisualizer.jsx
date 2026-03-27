import { useEffect, useRef, useState } from "react";
import { createGrid, resetGridState } from "./grid";
import { bfs, dfs } from "./pathfindingAlgorithms";
import { randomMaze } from "./maze/randomMaze";
import { runStepAnimation } from "@/helpers/animation";

export default function PathfindingVisualizer() {
  const [{ grid, start, end }, setState] = useState(() =>
    createGrid(20, 40)
  );

  const [algorithm, setAlgorithm] = useState("bfs");
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  const setGrid = (newGrid) => {
    setState((prev) => ({ ...prev, grid: newGrid }));
  };

  const handleStep = (step) => {
    setGrid((prev) => {
      const newGrid = prev.map((row) => row.slice());

      if (step.type === "visit") {
        const node = newGrid[step.node.row][step.node.col];
        if (!node.isStart && !node.isEnd) node.isVisited = true;
      }

      if (step.type === "path") {
        const node = newGrid[step.node.row][step.node.col];
        if (!node.isStart && !node.isEnd) node.isPath = true;
      }

      if (step.type === "wall") {
        newGrid[step.row][step.col].isWall = true;
      }

      return newGrid;
    });
  };

  const runAlgorithm = async () => {
    const cleanGrid = resetGridState(grid);

    const { steps } =
      algorithm === "dfs"
        ? dfs(cleanGrid, start, end)
        : bfs(cleanGrid, start, end);

    await runStepAnimation({
      steps,
      onStep: handleStep,
      getDelay: () => 20,
      pauseRef,
      abortRef,
    });
  };

  const generateMaze = async () => {
    const steps = randomMaze(grid);

    await runStepAnimation({
      steps,
      onStep: handleStep,
      getDelay: () => 5,
      pauseRef,
      abortRef,
    });
  };

  return (
    <div>
      <button onClick={runAlgorithm}>Start</button>
      <button onClick={generateMaze}>Maze</button>

      <div className="grid grid-cols-40 gap-[2px] mt-4">
        {grid.map((row, r) =>
          row.map((node, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-5 h-5
                ${node.isStart ? "bg-green-500" : ""}
                ${node.isEnd ? "bg-red-500" : ""}
                ${node.isWall ? "bg-gray-700" : ""}
                ${node.isVisited ? "bg-blue-400" : ""}
                ${node.isPath ? "bg-yellow-400" : ""}
                ${!node.isVisited && !node.isWall ? "bg-neutral-900" : ""}
              `}
            />
          ))
        )}
      </div>
    </div>
  );
}