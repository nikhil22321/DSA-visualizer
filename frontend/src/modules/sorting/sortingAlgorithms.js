const createStep = ({
  arr,
  type,
  indices,
  pointers,
  line,
  description,
  pivotIndex = null,
  sorted = [],
  stats,
}) => ({
  type,
  indices,
  pointers,
  line,
  description,
  pivotIndex,
  sorted,
  array: [...arr],
  stats: { ...stats },
});

const createRecorder = (arr) => {
  const steps = [];
  const stats = { comparisons: 0, swaps: 0 };

  const record = (payload) => {
    steps.push(createStep({ arr, stats, ...payload }));
  };

  return { steps, stats, record };
};

const finalize = (arr, steps, stats) => {
  const sorted = Array.from({ length: arr.length }, (_, i) => i);
  steps.push(
    createStep({
      arr,
      type: "overwrite",
      indices: [],
      pointers: {},
      line: 0,
      description: "Array Sorted Successfully",
      sorted,
      stats,
    }),
  );
};

const bubbleSort = (input) => {
  const arr = [...input];
  const { steps, stats, record } = createRecorder(arr);

  for (let i = 0; i < arr.length; i += 1) {
    for (let j = 0; j < arr.length - i - 1; j += 1) {
      stats.comparisons += 1;
      record({
        type: "compare",
        indices: [j, j + 1],
        pointers: { i, j },
        line: 3,
        description: `Compare index ${j} and ${j + 1}`,
        sorted: Array.from({ length: i }, (_, idx) => arr.length - 1 - idx),
      });
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        stats.swaps += 1;
        record({
          type: "swap",
          indices: [j, j + 1],
          pointers: { i, j },
          line: 4,
          description: `Swap values ${arr[j + 1]} and ${arr[j]}`,
          sorted: Array.from({ length: i }, (_, idx) => arr.length - 1 - idx),
        });
      }
    }
  }

  finalize(arr, steps, stats);
  return { steps, result: arr, stats };
};

const selectionSort = (input) => {
  const arr = [...input];
  const { steps, stats, record } = createRecorder(arr);
  const sortedIndices = [];

  for (let i = 0; i < arr.length; i += 1) {
    let min = i;
    for (let j = i + 1; j < arr.length; j += 1) {
      stats.comparisons += 1;
      record({
        type: "compare",
        indices: [min, j],
        pointers: { i, j },
        line: 4,
        description: `Compare current min index ${min} with ${j}`,
        sorted: [...sortedIndices],
      });
      if (arr[j] < arr[min]) min = j;
    }
    if (min !== i) {
      [arr[i], arr[min]] = [arr[min], arr[i]];
      stats.swaps += 1;
      record({
        type: "swap",
        indices: [i, min],
        pointers: { i, j: min },
        line: 5,
        description: `Swap index ${i} with min index ${min}`,
        sorted: [...sortedIndices],
      });
    }
    sortedIndices.push(i);
  }

  finalize(arr, steps, stats);
  return { steps, result: arr, stats };
};

const insertionSort = (input) => {
  const arr = [...input];
  const { steps, stats, record } = createRecorder(arr);

  for (let i = 1; i < arr.length; i += 1) {
    const key = arr[i];
    let j = i - 1;

    while (j >= 0) {
      stats.comparisons += 1;
      record({
        type: "compare",
        indices: [j, i],
        pointers: { i, j },
        line: 4,
        description: `Compare key ${key} with ${arr[j]}`,
      });

      if (arr[j] > key) {
        arr[j + 1] = arr[j];
        record({
          type: "overwrite",
          indices: [j + 1],
          pointers: { i, j },
          line: 5,
          description: `Shift ${arr[j]} to index ${j + 1}`,
        });
        j -= 1;
      } else {
        break;
      }
    }
    arr[j + 1] = key;
    stats.swaps += 1;
    record({
      type: "overwrite",
      indices: [j + 1],
      pointers: { i, j: j + 1 },
          line: 6,
      description: `Insert key ${key} at index ${j + 1}`,
    });
  }

  finalize(arr, steps, stats);
  return { steps, result: arr, stats };
};

const mergeSort = (input) => {
  const arr = [...input];
  const { steps, stats, record } = createRecorder(arr);

  const merge = (left, mid, right) => {
    const temp = [];
    let i = left;
    let j = mid + 1;

    while (i <= mid && j <= right) {
      stats.comparisons += 1;
      record({
        type: "compare",
        indices: [i, j],
        pointers: { i, j },
        line: 5,
        description: `Compare left ${arr[i]} and right ${arr[j]}`,
      });
      if (arr[i] <= arr[j]) temp.push(arr[i++]);
      else temp.push(arr[j++]);
    }
    while (i <= mid) temp.push(arr[i++]);
    while (j <= right) temp.push(arr[j++]);

    temp.forEach((value, idx) => {
      arr[left + idx] = value;
      stats.swaps += 1;
      record({
        type: "overwrite",
        indices: [left + idx],
        pointers: { i: left, j: right },
        line: 5,
        description: `Write ${value} at index ${left + idx}`,
      });
    });
  };

  const sort = (left, right) => {
    if (left >= right) return;
    const mid = Math.floor((left + right) / 2);
    sort(left, mid);
    sort(mid + 1, right);
    merge(left, mid, right);
  };

  sort(0, arr.length - 1);
  finalize(arr, steps, stats);
  return { steps, result: arr, stats };
};

const quickSort = (input) => {
  const arr = [...input];
  const { steps, stats, record } = createRecorder(arr);

  const partition = (low, high) => {
    const pivot = arr[high];
    let i = low - 1;
    record({
      type: "pivot",
      indices: [high],
      pointers: { i: low, j: high },
      pivotIndex: high,
      line: 1,
      description: `Select pivot ${pivot} at index ${high}`,
    });

    for (let j = low; j < high; j += 1) {
      stats.comparisons += 1;
      record({
        type: "compare",
        indices: [j, high],
        pointers: { i, j },
        pivotIndex: high,
        line: 2,
        description: `Compare index ${j} with pivot`,
      });
      if (arr[j] < pivot) {
        i += 1;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        stats.swaps += 1;
        record({
          type: "swap",
          indices: [i, j],
          pointers: { i, j },
          pivotIndex: high,
          line: 2,
          description: `Swap ${arr[j]} and ${arr[i]}`,
        });
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    stats.swaps += 1;
    record({
      type: "swap",
      indices: [i + 1, high],
      pointers: { i: i + 1, j: high },
      pivotIndex: i + 1,
      line: 2,
      description: `Place pivot at index ${i + 1}`,
    });
    return i + 1;
  };

  const sort = (low, high) => {
    if (low < high) {
      const p = partition(low, high);
      sort(low, p - 1);
      sort(p + 1, high);
    }
  };
  sort(0, arr.length - 1);

  finalize(arr, steps, stats);
  return { steps, result: arr, stats };
};

const heapSort = (input) => {
  const arr = [...input];
  const { steps, stats, record } = createRecorder(arr);

  const heapify = (n, i) => {
    let largest = i;
    const left = i * 2 + 1;
    const right = i * 2 + 2;

    if (left < n) {
      stats.comparisons += 1;
      record({ type: "compare", indices: [left, largest], pointers: { i, j: left }, line: 4, description: "Compare left child" });
      if (arr[left] > arr[largest]) largest = left;
    }
    if (right < n) {
      stats.comparisons += 1;
      record({ type: "compare", indices: [right, largest], pointers: { i, j: right }, line: 4, description: "Compare right child" });
      if (arr[right] > arr[largest]) largest = right;
    }
    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      stats.swaps += 1;
      record({ type: "swap", indices: [i, largest], pointers: { i, j: largest }, line: 4, description: `Swap ${i} and ${largest}` });
      heapify(n, largest);
    }
  };

  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i -= 1) heapify(arr.length, i);
  for (let end = arr.length - 1; end > 0; end -= 1) {
    [arr[0], arr[end]] = [arr[end], arr[0]];
    stats.swaps += 1;
    record({ type: "swap", indices: [0, end], pointers: { i: 0, j: end }, line: 2, description: `Move max to index ${end}` });
    heapify(end, 0);
  }

  finalize(arr, steps, stats);
  return { steps, result: arr, stats };
};

const shellSort = (input) => {
  const arr = [...input];
  const { steps, stats, record } = createRecorder(arr);
  for (let gap = Math.floor(arr.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < arr.length; i += 1) {
      const temp = arr[i];
      let j = i;
      while (j >= gap && arr[j - gap] > temp) {
        stats.comparisons += 1;
        arr[j] = arr[j - gap];
        record({ type: "overwrite", indices: [j], pointers: { i, j }, line: 2, description: `Shift by gap ${gap}` });
        j -= gap;
      }
      arr[j] = temp;
      stats.swaps += 1;
      record({ type: "overwrite", indices: [j], pointers: { i, j }, line: 2, description: `Insert ${temp}` });
    }
  }
  finalize(arr, steps, stats);
  return { steps, result: arr, stats };
};

const countingSort = (input) => {
  const arr = [...input];
  const { steps, stats, record } = createRecorder(arr);
  const max = Math.max(...arr, 0);
  const count = Array(max + 1).fill(0);
  arr.forEach((value) => {
    count[value] += 1;
  });
  let idx = 0;
  count.forEach((freq, value) => {
    for (let i = 0; i < freq; i += 1) {
      arr[idx] = value;
      stats.swaps += 1;
      record({ type: "overwrite", indices: [idx], pointers: { i: idx }, line: 3, description: `Write ${value}` });
      idx += 1;
    }
  });
  finalize(arr, steps, stats);
  return { steps, result: arr, stats };
};

export const sortingAlgorithmInfo = {
  bubble: {
    label: "Bubble Sort",
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    pseudocode: [
      "for i = 0 to n-1",
      "  for j = 0 to n-i-2",
      "    if arr[j] > arr[j+1]",
      "      swap(arr[j], arr[j+1])",
    ],
    run: bubbleSort,
  },
  selection: {
    label: "Selection Sort",
    best: "O(n²)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    pseudocode: [
      "for i = 0 to n-1",
      "  min = i",
      "  for j = i+1 to n-1",
      "    if arr[j] < arr[min]: min = j",
      "  swap(arr[i], arr[min])",
    ],
    run: selectionSort,
  },
  insertion: {
    label: "Insertion Sort",
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    pseudocode: [
      "for i = 1 to n-1",
      "  key = arr[i]",
      "  j = i - 1",
      "  while j >= 0 and arr[j] > key",
      "    arr[j+1] = arr[j]",
      "  arr[j+1] = key",
    ],
    run: insertionSort,
  },
  merge: {
    label: "Merge Sort",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(n)",
    pseudocode: [
      "split array into halves",
      "sort left half",
      "sort right half",
      "merge left + right",
      "overwrite original range",
    ],
    run: mergeSort,
  },
  quick: {
    label: "Quick Sort",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n²)",
    space: "O(log n)",
    pseudocode: [
      "choose pivot",
      "partition elements around pivot",
      "recursively sort left partition",
      "recursively sort right partition",
    ],
    run: quickSort,
  },
  heap: {
    label: "Heap Sort",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(1)",
    pseudocode: [
      "build max heap",
      "swap root with last",
      "reduce heap size",
      "heapify root",
    ],
    run: heapSort,
  },
  shell: {
    label: "Shell Sort",
    best: "O(n log n)",
    average: "~O(n^1.3)",
    worst: "O(n²)",
    space: "O(1)",
    pseudocode: ["gap = n/2", "perform gapped insertion sort", "reduce gap", "repeat"],
    run: shellSort,
  },
  counting: {
    label: "Counting Sort",
    best: "O(n + k)",
    average: "O(n + k)",
    worst: "O(n + k)",
    space: "O(k)",
    pseudocode: ["count frequency", "accumulate", "write back sorted values"],
    run: countingSort,
  },
};

export const supportedSortingAlgorithms = ["bubble", "selection", "insertion", "merge", "quick", "heap", "shell", "counting"];

export const runSortingAlgorithm = (inputArray, algorithm) => {
  const selected = sortingAlgorithmInfo[algorithm] || sortingAlgorithmInfo.bubble;
  return selected.run(inputArray);
};
