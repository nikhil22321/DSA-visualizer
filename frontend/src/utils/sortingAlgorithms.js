import { sortingMeta } from "@/data/algorithmMeta";

const stepFactory = (array, action, stats, payload = {}) => ({
  array: [...array],
  action,
  stats: { ...stats },
  active: payload.active || [],
  swapped: payload.swapped || [],
  sorted: payload.sorted || [],
  internalState: payload.internalState || {},
});

export const createDataset = (size = 30, preset = "random") => {
  if (preset === "reverse") {
    return Array.from({ length: size }, (_, i) => size - i);
  }
  if (preset === "nearly") {
    const arr = Array.from({ length: size }, (_, i) => i + 1);
    for (let i = 0; i < Math.max(1, Math.floor(size * 0.1)); i += 1) {
      const a = Math.floor(Math.random() * size);
      const b = Math.floor(Math.random() * size);
      [arr[a], arr[b]] = [arr[b], arr[a]];
    }
    return arr;
  }
  if (preset === "few-unique") {
    return Array.from({ length: size }, () => [5, 9, 12, 18, 24][Math.floor(Math.random() * 5)]);
  }
  return Array.from({ length: size }, () => Math.floor(Math.random() * 95) + 5);
};

const bubbleSortSteps = (arr, steps, stats) => {
  const n = arr.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n - i - 1; j += 1) {
      stats.comparisons += 1;
      steps.push(stepFactory(arr, `Compare ${j} and ${j + 1}`, stats, { active: [j, j + 1] }));
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        stats.swaps += 1;
        steps.push(stepFactory(arr, `Swap ${j} and ${j + 1}`, stats, { swapped: [j, j + 1] }));
      }
    }
  }
};

const selectionSortSteps = (arr, steps, stats) => {
  const n = arr.length;
  for (let i = 0; i < n; i += 1) {
    let minIdx = i;
    for (let j = i + 1; j < n; j += 1) {
      stats.comparisons += 1;
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
      steps.push(stepFactory(arr, `Find minimum in unsorted region`, stats, { active: [i, j, minIdx] }));
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      stats.swaps += 1;
      steps.push(stepFactory(arr, `Place minimum at index ${i}`, stats, { swapped: [i, minIdx] }));
    }
  }
};

const insertionSortSteps = (arr, steps, stats) => {
  for (let i = 1; i < arr.length; i += 1) {
    const key = arr[i];
    let j = i - 1;
    steps.push(stepFactory(arr, `Pick key ${key}`, stats, { active: [i] }));
    while (j >= 0 && arr[j] > key) {
      stats.comparisons += 1;
      arr[j + 1] = arr[j];
      stats.swaps += 1;
      steps.push(stepFactory(arr, `Shift ${arr[j]} right`, stats, { active: [j, j + 1] }));
      j -= 1;
    }
    arr[j + 1] = key;
    steps.push(stepFactory(arr, `Insert key at ${j + 1}`, stats, { swapped: [j + 1] }));
  }
};

const mergeSortSteps = (arr, steps, stats) => {
  const merge = (left, mid, right) => {
    const temp = [];
    let i = left;
    let j = mid + 1;

    while (i <= mid && j <= right) {
      stats.comparisons += 1;
      if (arr[i] <= arr[j]) {
        temp.push(arr[i]);
        i += 1;
      } else {
        temp.push(arr[j]);
        j += 1;
      }
    }

    while (i <= mid) {
      temp.push(arr[i]);
      i += 1;
    }
    while (j <= right) {
      temp.push(arr[j]);
      j += 1;
    }

    for (let k = 0; k < temp.length; k += 1) {
      arr[left + k] = temp[k];
      stats.swaps += 1;
      steps.push(
        stepFactory(arr, `Write merged value at ${left + k}`, stats, {
          active: [left + k],
          internalState: { left, mid, right },
        }),
      );
    }
  };

  const sort = (left, right) => {
    if (left >= right) {
      return;
    }
    const mid = Math.floor((left + right) / 2);
    sort(left, mid);
    sort(mid + 1, right);
    merge(left, mid, right);
  };

  sort(0, arr.length - 1);
};

const quickSortSteps = (arr, steps, stats) => {
  const partition = (low, high) => {
    const pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j += 1) {
      stats.comparisons += 1;
      steps.push(stepFactory(arr, `Compare with pivot ${pivot}`, stats, { active: [j, high] }));
      if (arr[j] <= pivot) {
        i += 1;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        stats.swaps += 1;
        steps.push(stepFactory(arr, `Move ${arr[i]} to left of pivot`, stats, { swapped: [i, j] }));
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    stats.swaps += 1;
    steps.push(stepFactory(arr, `Place pivot at ${i + 1}`, stats, { swapped: [i + 1, high] }));
    return i + 1;
  };

  const sort = (low, high) => {
    if (low < high) {
      const pi = partition(low, high);
      sort(low, pi - 1);
      sort(pi + 1, high);
    }
  };
  sort(0, arr.length - 1);
};

const heapSortSteps = (arr, steps, stats) => {
  const heapify = (n, i) => {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < n) {
      stats.comparisons += 1;
      if (arr[left] > arr[largest]) largest = left;
    }
    if (right < n) {
      stats.comparisons += 1;
      if (arr[right] > arr[largest]) largest = right;
    }
    if (largest !== i) {
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      stats.swaps += 1;
      steps.push(stepFactory(arr, `Heapify swap ${i} and ${largest}`, stats, { swapped: [i, largest] }));
      heapify(n, largest);
    }
  };

  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i -= 1) {
    heapify(arr.length, i);
  }
  for (let end = arr.length - 1; end > 0; end -= 1) {
    [arr[0], arr[end]] = [arr[end], arr[0]];
    stats.swaps += 1;
    steps.push(stepFactory(arr, `Extract max to sorted zone`, stats, { swapped: [0, end] }));
    heapify(end, 0);
  }
};

const countingSortSteps = (arr, steps, stats) => {
  const max = Math.max(...arr);
  const count = Array.from({ length: max + 1 }, () => 0);
  arr.forEach((value) => {
    count[value] += 1;
  });
  let idx = 0;
  for (let value = 0; value <= max; value += 1) {
    while (count[value] > 0) {
      arr[idx] = value;
      idx += 1;
      count[value] -= 1;
      stats.swaps += 1;
      steps.push(stepFactory(arr, `Write value ${value}`, stats, { active: [idx - 1] }));
    }
  }
};

const radixSortSteps = (arr, steps, stats) => {
  const getMax = () => Math.max(...arr);
  const countingByDigit = (exp) => {
    const output = Array.from({ length: arr.length }, () => 0);
    const count = Array.from({ length: 10 }, () => 0);
    arr.forEach((num) => {
      const digit = Math.floor(num / exp) % 10;
      count[digit] += 1;
    });
    for (let i = 1; i < 10; i += 1) {
      count[i] += count[i - 1];
    }
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      const digit = Math.floor(arr[i] / exp) % 10;
      output[count[digit] - 1] = arr[i];
      count[digit] -= 1;
    }
    for (let i = 0; i < arr.length; i += 1) {
      arr[i] = output[i];
      stats.swaps += 1;
      steps.push(stepFactory(arr, `Radix pass exp=${exp}`, stats, { active: [i] }));
    }
  };

  for (let exp = 1; Math.floor(getMax() / exp) > 0; exp *= 10) {
    countingByDigit(exp);
  }
};

const shellSortSteps = (arr, steps, stats) => {
  for (let gap = Math.floor(arr.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
    for (let i = gap; i < arr.length; i += 1) {
      const temp = arr[i];
      let j = i;
      while (j >= gap && arr[j - gap] > temp) {
        stats.comparisons += 1;
        arr[j] = arr[j - gap];
        stats.swaps += 1;
        steps.push(stepFactory(arr, `Gap ${gap} shift`, stats, { active: [j, j - gap] }));
        j -= gap;
      }
      arr[j] = temp;
      steps.push(stepFactory(arr, `Gap ${gap} insert`, stats, { swapped: [j] }));
    }
  }
};

const sortImplementations = {
  bubble: bubbleSortSteps,
  selection: selectionSortSteps,
  insertion: insertionSortSteps,
  merge: mergeSortSteps,
  quick: quickSortSteps,
  heap: heapSortSteps,
  counting: countingSortSteps,
  radix: radixSortSteps,
  shell: shellSortSteps,
};

export const sortingAlgorithmOptions = Object.keys(sortingMeta).map((key) => ({
  value: key,
  label: sortingMeta[key].label,
}));

export const generateSortingRun = (initialArray, algorithm) => {
  const arr = [...initialArray];
  const steps = [];
  const stats = {
    comparisons: 0,
    swaps: 0,
    visitedNodes: 0,
    executionSteps: 0,
  };

  steps.push(stepFactory(arr, "Initial dataset", stats));
  const sorter = sortImplementations[algorithm] || sortImplementations.bubble;
  sorter(arr, steps, stats);
  steps.push(stepFactory(arr, "Sorting complete", stats, {
    sorted: Array.from({ length: arr.length }, (_, i) => i),
  }));

  stats.executionSteps = steps.length;
  return {
    steps,
    finalArray: arr,
    stats,
  };
};
