import { prepareGraphSession } from "@/modules/graphs/graphVisualizer";
import { prepareLinkedListSession } from "@/modules/linkedList/linkedListVisualizer";
import { prepareSortingSession } from "@/modules/sorting/sortingVisualizer";
import { prepareStackQueueSession } from "@/modules/stackQueue/stackQueueVisualizer";
import { buildAlgorithmSession, treeMutations } from "@/modules/trees/treeVisualizer";
import { runMazeGenerator } from "@/utils/mazeAlgorithms";
import { runPathfinding } from "@/utils/pathfindingAlgorithms";

const createIdFactory = (prefix) => {
  let index = 0;
  return () => `${prefix}-${++index}`;
};

describe("feature logic smoke tests", () => {
  test("sorting prepares a successful quick sort session", () => {
    const session = prepareSortingSession([5, 1, 4, 2, 3], "quick");

    expect(session.result).toEqual([1, 2, 3, 4, 5]);
    expect(session.steps.length).toBeGreaterThan(0);
    expect(session.steps.at(-1).description).toBe("Array Sorted Successfully");
  });

  test("graph sessions cover BFS and Dijkstra path output", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [
        { id: "A-B", source: "A", target: "B", weight: 1 },
        { id: "B-C", source: "B", target: "C", weight: 2 },
        { id: "A-C", source: "A", target: "C", weight: 5 },
      ],
    };

    const bfs = prepareGraphSession({
      graph,
      algorithm: "bfs",
      startNode: "A",
      directed: false,
    });
    const dijkstra = prepareGraphSession({
      graph,
      algorithm: "dijkstra",
      startNode: "A",
      targetNode: "C",
      directed: false,
    });

    expect(bfs.result.order).toEqual(["A", "B", "C"]);
    expect(dijkstra.result.path).toEqual(["A", "B", "C"]);
    expect(dijkstra.result.distances.C).toBe(3);
  });

  test("linked list sessions support insert and reverse flows", () => {
    const createId = createIdFactory("ll");

    const inserted = prepareLinkedListSession({
      listType: "singly",
      nodes: [],
      operation: "insertTail",
      value: 10,
      position: 0,
      cycleTargetIndex: null,
      mergeValues: [],
      operationCount: 1,
      createId,
    });

    const reversed = prepareLinkedListSession({
      listType: "singly",
      nodes: [
        { id: "a", value: 10 },
        { id: "b", value: 20 },
        { id: "c", value: 30 },
      ],
      operation: "reverse",
      value: 0,
      position: 0,
      cycleTargetIndex: null,
      mergeValues: [],
      operationCount: 2,
      createId,
    });

    expect(inserted.nextNodes.map((node) => node.value)).toEqual([10]);
    expect(inserted.result.outputText).toContain("10");
    expect(reversed.nextNodes.map((node) => node.value)).toEqual([30, 20, 10]);
  });

  test("stack and queue sessions keep the correct front/top semantics", () => {
    const createId = createIdFactory("sq");

    const pushed = prepareStackQueueSession({
      mode: "stack",
      items: [],
      operation: "push",
      value: 7,
      operationCount: 1,
      createId,
    });

    const enqueued = prepareStackQueueSession({
      mode: "queue",
      items: [],
      operation: "enqueue",
      value: 9,
      operationCount: 1,
      createId,
    });

    expect(pushed.nextItems.map((item) => item.value)).toEqual([7]);
    expect(pushed.result.value).toBe("Top Element: 7");
    expect(enqueued.nextItems.map((item) => item.value)).toEqual([9]);
    expect(enqueued.result.value).toBe("Front Element: 9");
  });

  test("tree sessions support BST operations and inorder traversal", () => {
    let root = null;
    [5, 3, 7, 1, 4].forEach((value) => {
      root = treeMutations.insertBstValue(root, value).root;
    });

    const session = buildAlgorithmSession({
      root,
      algorithmKey: "inorder",
      params: { treeType: "bst" },
      selectedNodeId: null,
    });

    expect(session.result).toBe("1 -> 3 -> 4 -> 5 -> 7");
    expect(session.summary.totalNodes).toBe(5);
  });

  test("pathfinding builds a valid path on an open grid", () => {
    const run = runPathfinding({
      algorithm: "astar",
      grid: {
        rows: 5,
        cols: 5,
        start: { row: 1, col: 1 },
        end: { row: 3, col: 3 },
        walls: [],
      },
    });

    const finalStep = run.steps.at(-1);

    expect(run.pathFound).toBe(true);
    expect(finalStep.path[0]).toBe("1-1");
    expect(finalStep.path.at(-1)).toBe("3-3");
    expect(run.steps.length).toBeGreaterThan(0);
  });

  test("maze generator supports distinct algorithms including Kruskal", () => {
    const algorithms = ["backtracking", "prim", "kruskal", "division"];

    algorithms.forEach((algorithm) => {
      const run = runMazeGenerator({
        rows: 11,
        cols: 11,
        algorithm,
        seed: 42,
      });

      expect(run.finalGrid).toHaveLength(11);
      expect(run.finalGrid[0]).toHaveLength(11);
      expect(run.finalGrid[1][1]).toBe(1);
      expect(run.finalGrid[9][9]).toBe(1);
      expect(run.steps.length).toBeGreaterThan(0);
    });

    const kruskal = runMazeGenerator({
      rows: 11,
      cols: 11,
      algorithm: "kruskal",
      seed: 42,
    });

    expect(kruskal.steps.at(-1).action).toBe("Kruskal maze complete");
  });
});
