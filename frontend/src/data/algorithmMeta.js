export const sortingMeta = {
  bubble: {
    label: "Bubble Sort",
    time: "O(n²)",
    space: "O(1)",
    code: `for i in 0..n-1:\n  for j in 0..n-i-2:\n    if arr[j] > arr[j+1]:\n      swap(arr[j], arr[j+1])`,
    note: "Simple and visual; ideal for teaching comparisons and swaps.",
  },
  selection: {
    label: "Selection Sort",
    time: "O(n²)",
    space: "O(1)",
    code: `for i in 0..n-1:\n  minIndex = i\n  for j in i+1..n-1:\n    if arr[j] < arr[minIndex]: minIndex = j\n  swap(arr[i], arr[minIndex])`,
    note: "Low swap count compared to bubble sort.",
  },
  insertion: {
    label: "Insertion Sort",
    time: "O(n²), best O(n)",
    space: "O(1)",
    code: `for i in 1..n-1:\n  key = arr[i]\n  j = i-1\n  while j>=0 and arr[j] > key:\n    arr[j+1] = arr[j]\n    j--\n  arr[j+1] = key`,
    note: "Great for nearly sorted arrays and interview warmups.",
  },
  merge: {
    label: "Merge Sort",
    time: "O(n log n)",
    space: "O(n)",
    code: `mergeSort(arr):\n  split left/right\n  mergeSort(left), mergeSort(right)\n  merge(left, right)`,
    note: "Stable and reliable across input distributions.",
  },
  quick: {
    label: "Quick Sort",
    time: "Avg O(n log n), worst O(n²)",
    space: "O(log n)",
    code: `quickSort(low, high):\n  p = partition(low, high)\n  quickSort(low, p-1)\n  quickSort(p+1, high)`,
    note: "Often fastest in practice due to cache-friendly partitioning.",
  },
  heap: {
    label: "Heap Sort",
    time: "O(n log n)",
    space: "O(1)",
    code: `buildMaxHeap(arr)\nfor end in n-1..1:\n  swap(arr[0], arr[end])\n  heapify(0, end)`,
    note: "In-place with strong worst-case guarantees.",
  },
  counting: {
    label: "Counting Sort",
    time: "O(n + k)",
    space: "O(k)",
    code: `count[value]++\nprefix sums\nplace values into output`,
    note: "Excellent for bounded integer domains.",
  },
  radix: {
    label: "Radix Sort",
    time: "O(d(n + k))",
    space: "O(n + k)",
    code: `for each digit place:\n  stable counting sort by digit`,
    note: "Powerful for fixed-width integers.",
  },
  shell: {
    label: "Shell Sort",
    time: "~O(n^1.3 to n²)",
    space: "O(1)",
    code: `gap = n/2\nwhile gap > 0:\n  gapped insertion sort\n  gap /= 2`,
    note: "Faster than insertion in many medium-size cases.",
  },
};

export const graphMeta = {
  bfs: { label: "BFS", time: "O(V+E)", space: "O(V)" },
  dfs: { label: "DFS", time: "O(V+E)", space: "O(V)" },
  dijkstra: { label: "Dijkstra", time: "O((V+E)logV)", space: "O(V)" },
  bellman: { label: "Bellman-Ford", time: "O(VE)", space: "O(V)" },
  prim: { label: "Prim MST", time: "O(E log V)", space: "O(V)" },
  kruskal: { label: "Kruskal MST", time: "O(E log E)", space: "O(V)" },
  topo: { label: "Topological Sort", time: "O(V+E)", space: "O(V)" },
  cycle: { label: "Cycle Detection", time: "O(V+E)", space: "O(V)" },
  bipartite: { label: "Bipartite Check", time: "O(V+E)", space: "O(V)" },
  components: { label: "Connected Components", time: "O(V+E)", space: "O(V)" },
  unionfind: { label: "Union-Find", time: "~O(α(n))", space: "O(V)" },
};

export const pathfindingMeta = {
  astar: { label: "A*", time: "O(E)", space: "O(V)" },
  dijkstra: { label: "Dijkstra", time: "O(E log V)", space: "O(V)" },
  bfs: { label: "BFS", time: "O(V+E)", space: "O(V)" },
  dfs: { label: "DFS", time: "O(V+E)", space: "O(V)" },
  greedy: { label: "Greedy Best-First", time: "O(E)", space: "O(V)" },
};

export const mazeMeta = {
  backtracking: {
    label: "Recursive Backtracking",
    time: "O(rows*cols)",
    space: "O(rows*cols)",
  },
  prim: {
    label: "Prim Maze",
    time: "O(E log E)",
    space: "O(E)",
  },
  kruskal: {
    label: "Kruskal Maze",
    time: "O(E log E)",
    space: "O(E)",
  },
  division: {
    label: "Recursive Division",
    time: "O(rows*cols log(rows*cols))",
    space: "O(rows*cols)",
  },
};
