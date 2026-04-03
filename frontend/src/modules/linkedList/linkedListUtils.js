export const LINKED_LIST_TYPES = [
  { value: "singly", label: "Singly Linked List" },
  { value: "doubly", label: "Doubly Linked List" },
];

export const DEFAULT_STATUS_TEXT = "Build a linked list and run an operation.";
export const DEFAULT_OUTPUT_TEXT = "Traversal: Empty list";

export const LINKED_LIST_PSEUDOCODE = {
  insertHead: [
    "create newNode(value)",
    "newNode.next = head",
    "if doubly and head exists: head.prev = newNode",
    "head = newNode",
    "if tail is null: tail = newNode",
  ],
  insertTail: [
    "create newNode(value)",
    "if head is null: head = tail = newNode",
    "else walk to tail",
    "tail.next = newNode",
    "if doubly: newNode.prev = tail",
    "tail = newNode",
  ],
  insertPosition: [
    "if position <= 0: insert at head",
    "walk to node before position",
    "create newNode(value)",
    "splice links around newNode",
    "if inserted at end: update tail",
  ],
  deleteHead: [
    "if head is null: stop",
    "mark head for deletion",
    "head = head.next",
    "if doubly and head exists: head.prev = null",
    "if list became empty: tail = null",
  ],
  deleteTail: [
    "if head is null: stop",
    "walk to tail",
    "disconnect tail",
    "tail = previous",
    "if list became empty: head = null",
  ],
  deleteValue: [
    "if head is null: stop",
    "walk until value matches",
    "mark matched node for deletion",
    "reconnect previous and next links",
    "update head or tail when needed",
  ],
  traverse: [
    "current = head",
    "while current exists",
    "visit current.value",
    "move current = current.next",
  ],
  search: [
    "current = head",
    "while current exists",
    "if current.value == target: return found",
    "move current = current.next",
    "return not found",
  ],
  reverse: [
    "prev = null",
    "current = head",
    "while current exists",
    "next = current.next",
    "current.next = prev",
    "if doubly: swap prev and next pointers",
    "prev = current",
    "current = next",
    "swap head and tail",
  ],
  findMiddle: [
    "slow = head, fast = head",
    "while fast and fast.next",
    "slow = slow.next",
    "fast = fast.next.next",
    "slow is the middle node",
  ],
  detectCycle: [
    "slow = head, fast = head",
    "while fast and fast.next",
    "slow = slow.next",
    "fast = fast.next.next",
    "if slow == fast: cycle found",
    "otherwise no cycle",
  ],
  mergeSorted: [
    "take two sorted lists",
    "compare current nodes from both lists",
    "append smaller value to merged output",
    "advance that list pointer",
    "append remaining nodes",
  ],
  reset: [
    "clear head and tail",
    "remove every node from the canvas",
    "reset output and statistics view",
  ],
};

export const cloneNodes = (nodes = []) => nodes.map((node) => ({ ...node }));

export const createNode = (id, value) => ({
  id,
  value,
});

export const parseMergeValues = (input) =>
  input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((value) => Number.isFinite(value));

export const formatListValues = (nodes = [], cycleTargetIndex = null) => {
  if (!nodes.length) return "Empty list";
  const values = nodes.map((node) => node.value).join(" → ");
  if (cycleTargetIndex === null || cycleTargetIndex === undefined || nodes.length < 2) {
    return values;
  }
  const target = nodes[cycleTargetIndex];
  return `${values} ↺ ${target?.value ?? "head"}`;
};

export const createLinearDirections = (listType, length) =>
  Array.from({ length: Math.max(length - 1, 0) }, () => (listType === "doubly" ? "double" : "forward"));

export const createReverseDirections = (length, processedCount, listType) => {
  if (listType === "doubly") {
    return createLinearDirections(listType, length);
  }

  return Array.from({ length: Math.max(length - 1, 0) }, (_, index) => {
    if (index < processedCount - 1) return "backward";
    if (index === processedCount - 1) return "none";
    return "forward";
  });
};

export const buildPointerTargets = (nodes = [], pointers = {}) => ({
  head: nodes[0]?.id ?? null,
  tail: nodes[nodes.length - 1]?.id ?? null,
  ...pointers,
});

export const createLinkedListStep = ({
  operation,
  description,
  line = 0,
  listType,
  nodes,
  activeIds = [],
  visitedIds = [],
  deletedIds = [],
  foundIds = [],
  pointers = {},
  floatingNode = null,
  auxiliaryNodes = [],
  auxiliaryActiveIds = [],
  mergedPreview = [],
  outputText = DEFAULT_OUTPUT_TEXT,
  statusText = DEFAULT_STATUS_TEXT,
  result = null,
  cycleTargetIndex = null,
  arrowDirections,
  nodesTraversed = 0,
  operationCount = 0,
  enteredIds = [],
  statusTone = "default",
}) => {
  const nextNodes = cloneNodes(nodes);
  const nextAuxiliaryNodes = cloneNodes(auxiliaryNodes);
  const resolvedPointers = buildPointerTargets(nextNodes, pointers);

  return {
    type: "linked-list",
    operation,
    description,
    line,
    listType,
    nodes: nextNodes,
    activeIds,
    visitedIds,
    deletedIds,
    foundIds,
    pointers: resolvedPointers,
    floatingNode,
    auxiliaryNodes: nextAuxiliaryNodes,
    auxiliaryActiveIds,
    mergedPreview,
    outputText,
    statusText,
    result,
    cycleTargetIndex,
    arrowDirections: arrowDirections || createLinearDirections(listType, nextNodes.length),
    enteredIds,
    statusTone,
    stats: {
      nodesTraversed,
      operationCount,
    },
    internalState: {
      pointers: resolvedPointers,
      activeIds,
      visitedIds,
      deletedIds,
      foundIds,
      cycleTargetIndex,
      mergedPreview,
    },
  };
};

export const createIdleLinkedListStep = ({
  listType,
  nodes,
  cycleTargetIndex = null,
  operationCount = 0,
  executionTimeMs = 0,
  statusText = DEFAULT_STATUS_TEXT,
  outputText = DEFAULT_OUTPUT_TEXT,
}) => {
  const step = createLinkedListStep({
    operation: "idle",
    description: "Ready for the next linked list operation",
    line: 0,
    listType,
    nodes,
    cycleTargetIndex,
    operationCount,
    outputText,
    statusText,
    result: {
      title: "Output",
      value: outputText,
    },
    nodesTraversed: 0,
    statusTone: "default",
    arrowDirections: createLinearDirections(listType, nodes.length),
    pointers: {
      head: nodes[0]?.id ?? null,
      tail: nodes[nodes.length - 1]?.id ?? null,
    },
  });
  step.stats.executionTimeMs = executionTimeMs;
  return step;
};
