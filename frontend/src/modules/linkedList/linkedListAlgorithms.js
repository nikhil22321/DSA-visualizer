import {
  DEFAULT_OUTPUT_TEXT,
  LINKED_LIST_PSEUDOCODE,
  cloneNodes,
  createLinkedListStep,
  createLinearDirections,
  createNode,
  createReverseDirections,
  formatListValues,
} from "@/modules/linkedList/linkedListUtils";

const DEFAULT_RESULT_TITLE = "Operation Result";

const buildTraversalResult = (nodes, cycleTargetIndex = null) => `Traversal: ${formatListValues(nodes, cycleTargetIndex)}`;

const ensurePosition = (position, length) => {
  if (!Number.isFinite(position)) return length;
  return Math.max(0, Math.min(position, length));
};

const normalizeSortedNodes = (nodes) => cloneNodes(nodes).sort((left, right) => left.value - right.value);

const createMergeNodes = (values, createId) => values.map((value) => createNode(createId(), value));

const findNodeIndexByValue = (nodes, value) => nodes.findIndex((node) => node.value === value);

const createSessionBuilder = ({
  listType,
  operation,
  operationCount,
  baseOutputText,
  baseStatusText,
  cycleTargetIndex,
}) => {
  const startedAt = performance.now();
  const steps = [];
  let nodesTraversed = 0;

  const addStep = ({
    description,
    line = 0,
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
    outputText = baseOutputText,
    statusText = baseStatusText,
    result = null,
    cycleTargetIndexOverride = cycleTargetIndex,
    arrowDirections,
    nodesTraversedDelta = 0,
    enteredIds = [],
    statusTone = "default",
  }) => {
    nodesTraversed += nodesTraversedDelta;

    steps.push(
      createLinkedListStep({
        operation,
        description,
        line,
        listType,
        nodes,
        activeIds,
        visitedIds,
        deletedIds,
        foundIds,
        pointers,
        floatingNode,
        auxiliaryNodes,
        auxiliaryActiveIds,
        mergedPreview,
        outputText,
        statusText,
        result,
        cycleTargetIndex: cycleTargetIndexOverride,
        arrowDirections,
        nodesTraversed,
        operationCount,
        enteredIds,
        statusTone,
      }),
    );
  };

  const finalize = ({
    nextNodes,
    nextCycleTargetIndex = cycleTargetIndex,
    outputText = baseOutputText,
    statusText = baseStatusText,
    resultTitle = DEFAULT_RESULT_TITLE,
    resultValue = outputText,
  }) => {
    const executionTimeMs = Math.max(Math.round(performance.now() - startedAt), steps.length * 180, 120);
    const finalizedSteps = steps.map((step) => ({
      ...step,
      stats: {
        ...step.stats,
        executionTimeMs,
      },
      outputText: step.outputText || outputText,
      statusText: step.statusText || statusText,
    }));

    return {
      steps: finalizedSteps,
      nextNodes: cloneNodes(nextNodes),
      nextCycleTargetIndex,
      operationLabel: operation,
      pseudocode: LINKED_LIST_PSEUDOCODE[operation] || [],
      result: {
        outputText,
        statusText,
        executionTimeMs,
        nodesTraversed,
        operationCount,
        title: resultTitle,
        value: resultValue,
      },
    };
  };

  return { addStep, finalize };
};

const createNoopSession = ({
  listType,
  operation,
  nodes,
  cycleTargetIndex = null,
  operationCount,
  message,
  resultValue = "No changes applied",
}) => {
  const outputText =
    formatListValues(nodes, cycleTargetIndex) === "Empty list"
      ? DEFAULT_OUTPUT_TEXT
      : buildTraversalResult(nodes, cycleTargetIndex);
  const builder = createSessionBuilder({
    listType,
    operation,
    operationCount,
    baseOutputText: outputText,
    baseStatusText: message,
    cycleTargetIndex,
  });

  builder.addStep({
    description: message,
    nodes,
    statusText: message,
    outputText,
    result: {
      title: DEFAULT_RESULT_TITLE,
      value: resultValue,
    },
    statusTone: "warning",
  });

  return builder.finalize({
    nextNodes: nodes,
    nextCycleTargetIndex: cycleTargetIndex,
    outputText,
    statusText: message,
    resultValue,
  });
};

const buildInsertHeadSession = ({
  listType,
  nodes,
  value,
  cycleTargetIndex,
  operationCount,
  createId,
}) => {
  const builder = createSessionBuilder({
    listType,
    operation: "insertHead",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: `Preparing to insert ${value} at the head`,
    cycleTargetIndex,
  });

  const newNode = createNode(createId(), value);
  const nextNodes = [newNode, ...cloneNodes(nodes)];

  builder.addStep({
    description: `Create node ${value} above the list`,
    line: 1,
    nodes,
    floatingNode: newNode,
    outputText: buildTraversalResult(nodes, cycleTargetIndex),
    statusText: `Node ${value} is ready to enter above the head`,
    result: {
      title: "Insert at Head",
      value: `Node ${value} appears above the list before connecting to head`,
    },
    statusTone: "warning",
  });

  builder.addStep({
    description: `Slide ${value} into the head position and shift the existing nodes`,
    line: 2,
    nodes: nextNodes,
    activeIds: [newNode.id],
    enteredIds: [newNode.id],
    outputText: buildTraversalResult(nextNodes),
    statusText: `Node ${value} slides into index 0`,
    result: {
      title: "Insert at Head",
      value: `Node ${value} is now the first element`,
    },
    arrowDirections: createLinearDirections(listType, nextNodes.length),
    statusTone: "info",
  });

  builder.addStep({
    description: `Reconnect head and update pointers around ${value}`,
    line: 4,
    nodes: nextNodes,
    activeIds: [newNode.id],
    pointers: {
      head: newNode.id,
      tail: nextNodes[nextNodes.length - 1]?.id ?? newNode.id,
    },
    outputText: buildTraversalResult(nextNodes),
    statusText: `Inserted ${value} at the head`,
    result: {
      title: "Insert at Head",
      value: buildTraversalResult(nextNodes),
    },
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes,
    outputText: buildTraversalResult(nextNodes),
    statusText: `Inserted ${value} at the head`,
    resultTitle: "Insert at Head",
    resultValue: buildTraversalResult(nextNodes),
  });
};

const buildInsertTailSession = ({
  listType,
  nodes,
  value,
  cycleTargetIndex,
  operationCount,
  createId,
}) => {
  if (!nodes.length) {
    return buildInsertHeadSession({
      listType,
      nodes,
      value,
      cycleTargetIndex,
      operationCount,
      createId,
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "insertTail",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: `Preparing to insert ${value} at the tail`,
    cycleTargetIndex,
  });

  const newNode = createNode(createId(), value);
  const visitedIds = [];
  const existingNodes = cloneNodes(nodes);

  existingNodes.forEach((node, index) => {
    visitedIds.push(node.id);
    builder.addStep({
      description: `Traverse node ${node.value} while walking toward the tail`,
      line: index === existingNodes.length - 1 ? 4 : 3,
      nodes: existingNodes,
      activeIds: [node.id],
      visitedIds,
      pointers: {
        curr: node.id,
      },
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: index === existingNodes.length - 1 ? `Tail ${node.value} located` : `Moving past ${node.value}`,
      result: {
        title: "Insert at Tail",
        value: `Current traversal focus: ${node.value}`,
      },
      nodesTraversedDelta: 1,
      statusTone: index === existingNodes.length - 1 ? "warning" : "default",
    });
  });

  builder.addStep({
    description: `Create node ${value} above the tail connection point`,
    line: 1,
    nodes: existingNodes,
    visitedIds,
    floatingNode: newNode,
    outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
    statusText: `Node ${value} is ready to join after the tail`,
    result: {
      title: "Insert at Tail",
      value: `Node ${value} appears above the tail before linking`,
    },
    statusTone: "warning",
  });

  const nextNodes = [...existingNodes, newNode];

  builder.addStep({
    description: `Attach ${value} after the tail and grow the arrow smoothly`,
    line: 4,
    nodes: nextNodes,
    activeIds: [newNode.id, existingNodes[existingNodes.length - 1].id],
    visitedIds,
    enteredIds: [newNode.id],
    pointers: {
      curr: newNode.id,
      tail: newNode.id,
    },
    outputText: buildTraversalResult(nextNodes),
    statusText: `Node ${value} becomes the new tail`,
    result: {
      title: "Insert at Tail",
      value: buildTraversalResult(nextNodes),
    },
    arrowDirections: createLinearDirections(listType, nextNodes.length),
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes,
    outputText: buildTraversalResult(nextNodes),
    statusText: `Inserted ${value} at the tail`,
    resultTitle: "Insert at Tail",
    resultValue: buildTraversalResult(nextNodes),
  });
};

const buildInsertPositionSession = ({
  listType,
  nodes,
  value,
  position,
  cycleTargetIndex,
  operationCount,
  createId,
}) => {
  const normalizedPosition = ensurePosition(position, nodes.length);

  if (normalizedPosition <= 0) {
    return buildInsertHeadSession({
      listType,
      nodes,
      value,
      cycleTargetIndex,
      operationCount,
      createId,
    });
  }

  if (normalizedPosition >= nodes.length) {
    return buildInsertTailSession({
      listType,
      nodes,
      value,
      cycleTargetIndex,
      operationCount,
      createId,
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "insertPosition",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: `Preparing to insert ${value} at position ${normalizedPosition}`,
    cycleTargetIndex,
  });

  const existingNodes = cloneNodes(nodes);
  const newNode = createNode(createId(), value);
  const visitedIds = [];

  for (let index = 0; index < normalizedPosition; index += 1) {
    const current = existingNodes[index];
    visitedIds.push(current.id);
    builder.addStep({
      description: `Traverse to index ${index} while finding the insertion point`,
      line: index === normalizedPosition - 1 ? 2 : 1,
      nodes: existingNodes,
      activeIds: [current.id],
      visitedIds,
      pointers: {
        curr: current.id,
      },
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: `Checking index ${index}`,
      result: {
        title: "Insert at Position",
        value: `Traversal reached node ${current.value}`,
      },
      nodesTraversedDelta: 1,
    });
  }

  builder.addStep({
    description: `Create node ${value} above position ${normalizedPosition}`,
    line: 3,
    nodes: existingNodes,
    visitedIds,
    floatingNode: newNode,
    outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
    statusText: `Node ${value} is ready above index ${normalizedPosition}`,
    result: {
      title: "Insert at Position",
      value: `Node ${value} floats above position ${normalizedPosition}`,
    },
    statusTone: "warning",
  });

  const nextNodes = cloneNodes(existingNodes);
  nextNodes.splice(normalizedPosition, 0, newNode);

  builder.addStep({
    description: `Slide ${value} into position ${normalizedPosition} and reconnect neighbors`,
    line: 4,
    nodes: nextNodes,
    activeIds: [newNode.id, nextNodes[normalizedPosition - 1].id, nextNodes[normalizedPosition + 1].id],
    visitedIds,
    enteredIds: [newNode.id],
    pointers: {
      curr: newNode.id,
    },
    outputText: buildTraversalResult(nextNodes),
    statusText: `Inserted ${value} at position ${normalizedPosition}`,
    result: {
      title: "Insert at Position",
      value: buildTraversalResult(nextNodes),
    },
    arrowDirections: createLinearDirections(listType, nextNodes.length),
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes,
    outputText: buildTraversalResult(nextNodes),
    statusText: `Inserted ${value} at position ${normalizedPosition}`,
    resultTitle: "Insert at Position",
    resultValue: buildTraversalResult(nextNodes),
  });
};

const buildDeleteHeadSession = ({
  listType,
  nodes,
  cycleTargetIndex,
  operationCount,
}) => {
  if (!nodes.length) {
    return createNoopSession({
      listType,
      operation: "deleteHead",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Delete head skipped because the list is empty",
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "deleteHead",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: `Preparing to delete the head node ${nodes[0].value}`,
    cycleTargetIndex,
  });

  const existingNodes = cloneNodes(nodes);
  const headNode = existingNodes[0];
  const nextNodes = existingNodes.slice(1);
  const nextCycleTargetIndex =
    cycleTargetIndex === null || cycleTargetIndex === undefined
      ? null
      : cycleTargetIndex === 0
        ? null
        : cycleTargetIndex - 1;

  builder.addStep({
    description: `Highlight head node ${headNode.value} for deletion`,
    line: 2,
    nodes: existingNodes,
    activeIds: [headNode.id],
    deletedIds: [headNode.id],
    pointers: {
      head: headNode.id,
      tail: existingNodes[existingNodes.length - 1]?.id ?? null,
    },
    outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
    statusText: `Head ${headNode.value} is marked in red`,
    result: {
      title: "Delete Head",
      value: `Node ${headNode.value} is leaving the list`,
    },
    statusTone: "danger",
  });

  builder.addStep({
    description: `Remove the head and shift the remaining nodes left`,
    line: 3,
    nodes: nextNodes,
    activeIds: nextNodes[0] ? [nextNodes[0].id] : [],
    pointers: {
      head: nextNodes[0]?.id ?? null,
      tail: nextNodes[nextNodes.length - 1]?.id ?? null,
    },
    outputText: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    statusText: nextNodes.length ? `Head moved to ${nextNodes[0].value}` : "The list is now empty",
    result: {
      title: "Delete Head",
      value: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    },
    cycleTargetIndexOverride: nextCycleTargetIndex,
    arrowDirections: createLinearDirections(listType, nextNodes.length),
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes,
    nextCycleTargetIndex,
    outputText: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    statusText: `Deleted head node ${headNode.value}`,
    resultTitle: "Delete Head",
    resultValue: buildTraversalResult(nextNodes, nextCycleTargetIndex),
  });
};

const buildDeleteTailSession = ({
  listType,
  nodes,
  cycleTargetIndex,
  operationCount,
}) => {
  if (!nodes.length) {
    return createNoopSession({
      listType,
      operation: "deleteTail",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Delete tail skipped because the list is empty",
    });
  }

  if (nodes.length === 1) {
    return buildDeleteHeadSession({
      listType,
      nodes,
      cycleTargetIndex,
      operationCount,
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "deleteTail",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: `Preparing to delete the tail node ${nodes[nodes.length - 1].value}`,
    cycleTargetIndex,
  });

  const existingNodes = cloneNodes(nodes);
  const visitedIds = [];

  existingNodes.forEach((node, index) => {
    visitedIds.push(node.id);
    builder.addStep({
      description: `Traverse toward the tail through node ${node.value}`,
      line: index === existingNodes.length - 1 ? 3 : 2,
      nodes: existingNodes,
      activeIds: [node.id],
      visitedIds,
      pointers: {
        curr: node.id,
      },
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: index === existingNodes.length - 1 ? `Tail ${node.value} found` : `Moving to the next node`,
      result: {
        title: "Delete Tail",
        value: `Current focus: ${node.value}`,
      },
      nodesTraversedDelta: 1,
      statusTone: index === existingNodes.length - 1 ? "warning" : "default",
    });
  });

  const tailNode = existingNodes[existingNodes.length - 1];
  const nextNodes = existingNodes.slice(0, -1);
  const nextCycleTargetIndex =
    cycleTargetIndex !== null && cycleTargetIndex >= nextNodes.length ? null : cycleTargetIndex;

  builder.addStep({
    description: `Mark tail node ${tailNode.value} for deletion`,
    line: 3,
    nodes: existingNodes,
    activeIds: [tailNode.id],
    visitedIds,
    deletedIds: [tailNode.id],
    pointers: {
      tail: tailNode.id,
    },
    outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
    statusText: `Tail ${tailNode.value} is highlighted in red`,
    result: {
      title: "Delete Tail",
      value: `Tail ${tailNode.value} is ready to be removed`,
    },
    statusTone: "danger",
  });

  builder.addStep({
    description: `Reconnect the new tail and collapse the gap`,
    line: 4,
    nodes: nextNodes,
    activeIds: [nextNodes[nextNodes.length - 1].id],
    visitedIds,
    pointers: {
      tail: nextNodes[nextNodes.length - 1].id,
    },
    outputText: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    statusText: `Deleted tail node ${tailNode.value}`,
    result: {
      title: "Delete Tail",
      value: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    },
    cycleTargetIndexOverride: nextCycleTargetIndex,
    arrowDirections: createLinearDirections(listType, nextNodes.length),
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes,
    nextCycleTargetIndex,
    outputText: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    statusText: `Deleted tail node ${tailNode.value}`,
    resultTitle: "Delete Tail",
    resultValue: buildTraversalResult(nextNodes, nextCycleTargetIndex),
  });
};

const buildDeleteValueSession = ({
  listType,
  nodes,
  value,
  cycleTargetIndex,
  operationCount,
}) => {
  if (!nodes.length) {
    return createNoopSession({
      listType,
      operation: "deleteValue",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Delete by value skipped because the list is empty",
    });
  }

  const existingNodes = cloneNodes(nodes);
  const targetIndex = findNodeIndexByValue(existingNodes, value);

  if (targetIndex === -1) {
    const builder = createSessionBuilder({
      listType,
      operation: "deleteValue",
      operationCount,
      baseOutputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      baseStatusText: `Searching for value ${value} to delete`,
      cycleTargetIndex,
    });
    const visitedIds = [];

    existingNodes.forEach((node) => {
      visitedIds.push(node.id);
      builder.addStep({
        description: `Check node ${node.value} while searching for ${value}`,
        line: 2,
        nodes: existingNodes,
        activeIds: [node.id],
        visitedIds,
        pointers: {
          curr: node.id,
        },
        outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
        statusText: `Value ${value} not found yet`,
        result: {
          title: "Delete by Value",
          value: `Checked ${node.value} and continued`,
        },
        nodesTraversedDelta: 1,
      });
    });

    builder.addStep({
      description: `Stop because value ${value} does not exist in the list`,
      line: 5,
      nodes: existingNodes,
      visitedIds,
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: `Value ${value} was not found`,
      result: {
        title: "Delete by Value",
        value: `Value ${value} does not exist in the list`,
      },
      statusTone: "warning",
    });

    return builder.finalize({
      nextNodes: existingNodes,
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: `Delete by value failed because ${value} was not found`,
      resultTitle: "Delete by Value",
      resultValue: `Value ${value} not found`,
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "deleteValue",
    operationCount,
    baseOutputText: buildTraversalResult(existingNodes, cycleTargetIndex),
    baseStatusText: `Deleting the first occurrence of ${value}`,
    cycleTargetIndex,
  });

  const visitedIds = [];

  for (let index = 0; index <= targetIndex; index += 1) {
    const current = existingNodes[index];
    visitedIds.push(current.id);
    builder.addStep({
      description: `Traverse node ${current.value} while locating ${value}`,
      line: current.value === value ? 3 : 2,
      nodes: existingNodes,
      activeIds: [current.id],
      visitedIds,
      pointers: {
        curr: current.id,
      },
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: current.value === value ? `Found ${value}` : `Searching for ${value}`,
      result: {
        title: "Delete by Value",
        value: current.value === value ? `Matched node ${value}` : `Checked ${current.value}`,
      },
      nodesTraversedDelta: 1,
      statusTone: current.value === value ? "warning" : "default",
    });
  }

  const targetNode = existingNodes[targetIndex];
  const nextNodes = existingNodes.filter((node) => node.id !== targetNode.id);
  const nextCycleTargetIndex =
    cycleTargetIndex === null || cycleTargetIndex === undefined
      ? null
      : cycleTargetIndex === targetIndex
        ? null
        : cycleTargetIndex > targetIndex
          ? cycleTargetIndex - 1
          : cycleTargetIndex;

  builder.addStep({
    description: `Highlight node ${targetNode.value} in red before removing it`,
    line: 3,
    nodes: existingNodes,
    activeIds: [targetNode.id],
    visitedIds,
    deletedIds: [targetNode.id],
    pointers: {
      curr: targetNode.id,
    },
    outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
    statusText: `Node ${targetNode.value} is marked for deletion`,
    result: {
      title: "Delete by Value",
      value: `Node ${targetNode.value} is about to be removed`,
    },
    statusTone: "danger",
  });

  builder.addStep({
    description: `Reconnect the list after deleting ${targetNode.value}`,
    line: 4,
    nodes: nextNodes,
    visitedIds,
    activeIds: nextNodes[Math.max(0, targetIndex - 1)] ? [nextNodes[Math.max(0, targetIndex - 1)].id] : [],
    outputText: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    statusText: `Deleted value ${targetNode.value}`,
    result: {
      title: "Delete by Value",
      value: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    },
    cycleTargetIndexOverride: nextCycleTargetIndex,
    arrowDirections: createLinearDirections(listType, nextNodes.length),
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes,
    nextCycleTargetIndex,
    outputText: buildTraversalResult(nextNodes, nextCycleTargetIndex),
    statusText: `Deleted value ${targetNode.value}`,
    resultTitle: "Delete by Value",
    resultValue: buildTraversalResult(nextNodes, nextCycleTargetIndex),
  });
};

const buildTraverseSession = ({
  listType,
  nodes,
  cycleTargetIndex,
  operationCount,
}) => {
  if (!nodes.length) {
    return createNoopSession({
      listType,
      operation: "traverse",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Traverse skipped because the list is empty",
      resultValue: "Traversal: Empty list",
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "traverse",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: "Traversing the linked list",
    cycleTargetIndex,
  });

  const existingNodes = cloneNodes(nodes);
  const visitedIds = [];
  const visitedValues = [];

  existingNodes.forEach((node) => {
    visitedIds.push(node.id);
    visitedValues.push(node.value);
    builder.addStep({
      description: `Visit node ${node.value} and move to the next pointer`,
      line: 3,
      nodes: existingNodes,
      activeIds: [node.id],
      visitedIds,
      pointers: {
        curr: node.id,
      },
      outputText: `Traversal: ${visitedValues.join(" → ")}`,
      statusText: `Visited ${node.value}`,
      result: {
        title: "Traverse List",
        value: `Traversal so far: ${visitedValues.join(" → ")}`,
      },
      nodesTraversedDelta: 1,
      statusTone: "info",
    });
  });

  const traversalText = `Traversal: ${visitedValues.join(" → ")}`;

  builder.addStep({
    description: "Traversal finished after visiting every node",
    line: 4,
    nodes: existingNodes,
    visitedIds,
    outputText: traversalText,
    statusText: traversalText,
    result: {
      title: "Traverse List",
      value: traversalText,
    },
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes: existingNodes,
    outputText: traversalText,
    statusText: "Traversal completed",
    resultTitle: "Traverse List",
    resultValue: traversalText,
  });
};

const buildSearchSession = ({
  listType,
  nodes,
  value,
  cycleTargetIndex,
  operationCount,
}) => {
  if (!nodes.length) {
    return createNoopSession({
      listType,
      operation: "search",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Search skipped because the list is empty",
      resultValue: `Value ${value} was not found`,
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "search",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: `Searching for value ${value}`,
    cycleTargetIndex,
  });

  const existingNodes = cloneNodes(nodes);
  const visitedIds = [];
  const targetIndex = findNodeIndexByValue(existingNodes, value);

  for (let index = 0; index < existingNodes.length; index += 1) {
    const node = existingNodes[index];
    visitedIds.push(node.id);
    const found = index === targetIndex;
    builder.addStep({
      description: found ? `Stop at node ${node.value} because the search found ${value}` : `Compare node ${node.value} with target ${value}`,
      line: found ? 3 : 2,
      nodes: existingNodes,
      activeIds: [node.id],
      visitedIds,
      foundIds: found ? [node.id] : [],
      pointers: {
        curr: node.id,
      },
      outputText: found ? `Search: Found ${value} at index ${index}` : `Search: checked ${node.value}`,
      statusText: found ? `Found ${value} at index ${index}` : `Still searching for ${value}`,
      result: {
        title: "Search",
        value: found ? `Found ${value} at index ${index}` : `Compared ${node.value} with ${value}`,
      },
      nodesTraversedDelta: 1,
      statusTone: found ? "success" : "default",
    });

    if (found) break;
  }

  const searchText =
    targetIndex >= 0 ? `Search: Found ${value} at index ${targetIndex}` : `Search: ${value} was not found`;

  builder.addStep({
    description: targetIndex >= 0 ? `Search completed with a match for ${value}` : `Search completed without finding ${value}`,
    line: targetIndex >= 0 ? 3 : 5,
    nodes: existingNodes,
    visitedIds,
    foundIds: targetIndex >= 0 ? [existingNodes[targetIndex].id] : [],
    outputText: searchText,
    statusText: searchText,
    result: {
      title: "Search",
      value: searchText,
    },
    statusTone: targetIndex >= 0 ? "success" : "warning",
  });

  return builder.finalize({
    nextNodes: existingNodes,
    outputText: searchText,
    statusText: searchText,
    resultTitle: "Search",
    resultValue: searchText,
  });
};

const buildReverseSession = ({
  listType,
  nodes,
  cycleTargetIndex,
  operationCount,
}) => {
  if (nodes.length < 2) {
    return createNoopSession({
      listType,
      operation: "reverse",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Reverse skipped because the list needs at least two nodes",
      resultValue: buildTraversalResult(nodes, cycleTargetIndex),
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "reverse",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: "Reversing the list one link at a time",
    cycleTargetIndex,
  });

  const existingNodes = cloneNodes(nodes);
  const processedIds = [];
  let previousId = null;

  existingNodes.forEach((node) => {
    builder.addStep({
      description: `Highlight current node ${node.value} before reversing its pointer`,
      line: 3,
      nodes: existingNodes,
      activeIds: [node.id],
      visitedIds: processedIds,
      pointers: {
        curr: node.id,
        prev: previousId,
      },
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: `Current pointer is at ${node.value}`,
      result: {
        title: "Reverse List",
        value: `Preparing to reverse the link for node ${node.value}`,
      },
      nodesTraversedDelta: 1,
      statusTone: "warning",
    });

    processedIds.push(node.id);

    builder.addStep({
      description: `Flip the arrow for ${node.value} so it points back toward the reversed prefix`,
      line: 5,
      nodes: existingNodes,
      activeIds: [node.id],
      visitedIds: processedIds,
      pointers: {
        curr: node.id,
        prev: previousId,
      },
      outputText: `Reverse preview: ${existingNodes
        .slice(0, processedIds.length)
        .map((item) => item.value)
        .reverse()
        .join(" ← ")}`,
      statusText: `Link for ${node.value} now points backward`,
      result: {
        title: "Reverse List",
        value: `Reversed links for ${processedIds.length} node${processedIds.length === 1 ? "" : "s"}`,
      },
      arrowDirections: createReverseDirections(existingNodes.length, processedIds.length, listType),
      statusTone: "info",
    });

    previousId = node.id;
  });

  const nextNodes = cloneNodes(existingNodes).reverse();

  builder.addStep({
    description: "Slide every node into the reversed order and update head and tail",
    line: 8,
    nodes: nextNodes,
    activeIds: [nextNodes[0].id, nextNodes[nextNodes.length - 1].id],
    pointers: {
      head: nextNodes[0].id,
      tail: nextNodes[nextNodes.length - 1].id,
    },
    outputText: buildTraversalResult(nextNodes),
    statusText: "The list is now reversed",
    result: {
      title: "Reverse List",
      value: buildTraversalResult(nextNodes),
    },
    arrowDirections: createLinearDirections(listType, nextNodes.length),
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes,
    nextCycleTargetIndex: null,
    outputText: buildTraversalResult(nextNodes),
    statusText: "Reversed the linked list",
    resultTitle: "Reverse List",
    resultValue: buildTraversalResult(nextNodes),
  });
};

const buildFindMiddleSession = ({
  listType,
  nodes,
  cycleTargetIndex,
  operationCount,
}) => {
  if (!nodes.length) {
    return createNoopSession({
      listType,
      operation: "findMiddle",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Find middle skipped because the list is empty",
      resultValue: "Middle Node: -",
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "findMiddle",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: "Using slow and fast pointers to find the middle node",
    cycleTargetIndex,
  });

  const existingNodes = cloneNodes(nodes);
  let slowIndex = 0;
  let fastIndex = 0;

  builder.addStep({
    description: "Start slow and fast pointers at the head",
    line: 1,
    nodes: existingNodes,
    activeIds: [existingNodes[0].id],
    pointers: {
      slow: existingNodes[0].id,
      fast: existingNodes[0].id,
    },
    outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
    statusText: "Both pointers begin at the head",
    result: {
      title: "Find Middle Node",
      value: "Slow and fast pointers are aligned at the start",
    },
    statusTone: "info",
  });

  while (fastIndex < existingNodes.length - 1 && fastIndex + 1 < existingNodes.length) {
    slowIndex += 1;
    fastIndex += 2;
    const safeFastIndex = Math.min(fastIndex, existingNodes.length - 1);

    builder.addStep({
      description: `Move slow to ${existingNodes[slowIndex].value} and fast to ${existingNodes[safeFastIndex].value}`,
      line: 3,
      nodes: existingNodes,
      visitedIds: existingNodes.slice(0, slowIndex + 1).map((node) => node.id),
      activeIds: [existingNodes[slowIndex].id, existingNodes[safeFastIndex].id],
      pointers: {
        slow: existingNodes[slowIndex].id,
        fast: existingNodes[safeFastIndex].id,
      },
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: `Slow is at ${existingNodes[slowIndex].value}, fast is at ${existingNodes[safeFastIndex].value}`,
      result: {
        title: "Find Middle Node",
        value: `Slow pointer now highlights ${existingNodes[slowIndex].value}`,
      },
      nodesTraversedDelta: 2,
      statusTone: "warning",
    });

    if (safeFastIndex >= existingNodes.length - 1) break;
  }

  builder.addStep({
    description: `Stop because slow pointer ${existingNodes[slowIndex].value} is at the middle node`,
    line: 5,
    nodes: existingNodes,
    visitedIds: existingNodes.slice(0, slowIndex + 1).map((node) => node.id),
    foundIds: [existingNodes[slowIndex].id],
    pointers: {
      slow: existingNodes[slowIndex].id,
      fast: existingNodes[Math.min(fastIndex, existingNodes.length - 1)].id,
    },
    outputText: `Middle Node: ${existingNodes[slowIndex].value}`,
    statusText: `Middle node is ${existingNodes[slowIndex].value}`,
    result: {
      title: "Find Middle Node",
      value: `Middle Node: ${existingNodes[slowIndex].value}`,
    },
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes: existingNodes,
    outputText: `Middle Node: ${existingNodes[slowIndex].value}`,
    statusText: `Middle node is ${existingNodes[slowIndex].value}`,
    resultTitle: "Find Middle Node",
    resultValue: `Middle Node: ${existingNodes[slowIndex].value}`,
  });
};

const nextCycleIndex = (currentIndex, length, cycleTargetIndex) => {
  if (currentIndex === null || currentIndex === undefined) return null;
  if (length === 0) return null;
  if (currentIndex === length - 1) {
    return cycleTargetIndex === null || cycleTargetIndex === undefined ? null : cycleTargetIndex;
  }
  return currentIndex + 1;
};

const advanceCycleIndex = (startIndex, steps, length, cycleTargetIndex) => {
  let currentIndex = startIndex;
  for (let index = 0; index < steps; index += 1) {
    currentIndex = nextCycleIndex(currentIndex, length, cycleTargetIndex);
    if (currentIndex === null || currentIndex === undefined) break;
  }
  return currentIndex;
};

const buildDetectCycleSession = ({
  listType,
  nodes,
  cycleTargetIndex,
  operationCount,
}) => {
  if (nodes.length < 2) {
    return createNoopSession({
      listType,
      operation: "detectCycle",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Cycle detection needs at least two nodes",
      resultValue: "Cycle Detected: No",
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "detectCycle",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText:
      cycleTargetIndex === null || cycleTargetIndex === undefined
        ? "Running Floyd's cycle detection on a linear list"
        : `Running Floyd's cycle detection with tail linked to index ${cycleTargetIndex}`,
    cycleTargetIndex,
  });

  const existingNodes = cloneNodes(nodes);
  let slowIndex = 0;
  let fastIndex = 0;
  let foundCycle = false;
  let guard = 0;
  const limit = Math.max(existingNodes.length * 4, 8);

  builder.addStep({
    description: "Place slow and fast pointers at the head",
    line: 1,
    nodes: existingNodes,
    activeIds: [existingNodes[0].id],
    pointers: {
      slow: existingNodes[0].id,
      fast: existingNodes[0].id,
    },
    outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
    statusText: "Slow and fast pointers start together",
    result: {
      title: "Detect Cycle",
      value: cycleTargetIndex === null || cycleTargetIndex === undefined ? "No explicit cycle link is active" : `Cycle link connects tail back to index ${cycleTargetIndex}`,
    },
    statusTone: "info",
  });

  while (guard < limit) {
    const nextSlow = advanceCycleIndex(slowIndex, 1, existingNodes.length, cycleTargetIndex);
    const nextFast = advanceCycleIndex(fastIndex, 2, existingNodes.length, cycleTargetIndex);
    guard += 1;

    if (nextSlow === null || nextFast === null) {
      break;
    }

    slowIndex = nextSlow;
    fastIndex = nextFast;

    builder.addStep({
      description: `Move slow to ${existingNodes[slowIndex].value} and fast to ${existingNodes[fastIndex].value}`,
      line: 3,
      nodes: existingNodes,
      activeIds: [existingNodes[slowIndex].id, existingNodes[fastIndex].id],
      visitedIds: [existingNodes[slowIndex].id, existingNodes[fastIndex].id],
      pointers: {
        slow: existingNodes[slowIndex].id,
        fast: existingNodes[fastIndex].id,
      },
      outputText: buildTraversalResult(existingNodes, cycleTargetIndex),
      statusText: `Slow=${existingNodes[slowIndex].value}, Fast=${existingNodes[fastIndex].value}`,
      result: {
        title: "Detect Cycle",
        value: `Slow at ${existingNodes[slowIndex].value}, fast at ${existingNodes[fastIndex].value}`,
      },
      cycleTargetIndexOverride: cycleTargetIndex,
      nodesTraversedDelta: 2,
      statusTone: "warning",
    });

    if (slowIndex === fastIndex) {
      foundCycle = true;
      builder.addStep({
        description: `Pointers collide at node ${existingNodes[slowIndex].value}, so a cycle exists`,
        line: 5,
        nodes: existingNodes,
        foundIds: [existingNodes[slowIndex].id],
        activeIds: [existingNodes[slowIndex].id],
        pointers: {
          slow: existingNodes[slowIndex].id,
          fast: existingNodes[fastIndex].id,
        },
        outputText: "Cycle Detected: Yes",
        statusText: `Cycle detected at node ${existingNodes[slowIndex].value}`,
        result: {
          title: "Detect Cycle",
          value: `Cycle Detected: Yes, meeting point = ${existingNodes[slowIndex].value}`,
        },
        cycleTargetIndexOverride: cycleTargetIndex,
        statusTone: "success",
      });
      break;
    }
  }

  if (!foundCycle) {
    builder.addStep({
      description: "Fast pointer reached the end first, so the list has no cycle",
      line: 6,
      nodes: existingNodes,
      pointers: {
        slow: existingNodes[Math.min(slowIndex, existingNodes.length - 1)]?.id ?? null,
        fast: existingNodes[Math.min(fastIndex, existingNodes.length - 1)]?.id ?? null,
      },
      outputText: "Cycle Detected: No",
      statusText: "No cycle detected",
      result: {
        title: "Detect Cycle",
        value: "Cycle Detected: No",
      },
      cycleTargetIndexOverride: cycleTargetIndex,
      statusTone: "warning",
    });
  }

  return builder.finalize({
    nextNodes: existingNodes,
    nextCycleTargetIndex: cycleTargetIndex,
    outputText: foundCycle ? "Cycle Detected: Yes" : "Cycle Detected: No",
    statusText: foundCycle ? "Cycle detected with Floyd's algorithm" : "No cycle detected",
    resultTitle: "Detect Cycle",
    resultValue: foundCycle ? "Cycle Detected: Yes" : "Cycle Detected: No",
  });
};

const buildMergeSortedSession = ({
  listType,
  nodes,
  mergeValues,
  cycleTargetIndex,
  operationCount,
  createId,
}) => {
  const leftNodes = normalizeSortedNodes(nodes);
  const rightNodes = createMergeNodes([...mergeValues].sort((left, right) => left - right), createId);

  if (!leftNodes.length && !rightNodes.length) {
    return createNoopSession({
      listType,
      operation: "mergeSorted",
      nodes,
      cycleTargetIndex,
      operationCount,
      message: "Merge skipped because both sorted lists are empty",
      resultValue: "Merged List: Empty list",
    });
  }

  const builder = createSessionBuilder({
    listType,
    operation: "mergeSorted",
    operationCount,
    baseOutputText: buildTraversalResult(nodes, cycleTargetIndex),
    baseStatusText: "Merging the current sorted list with the secondary sorted list",
    cycleTargetIndex: null,
  });

  const mergedNodes = [];
  const auxiliaryNodes = cloneNodes(rightNodes);
  let leftIndex = 0;
  let rightIndex = 0;

  builder.addStep({
    description: "Show both sorted input lists before the merge begins",
    line: 1,
    nodes: leftNodes,
    auxiliaryNodes,
    outputText: `Primary: ${formatListValues(leftNodes)} | Secondary: ${formatListValues(auxiliaryNodes)}`,
    statusText: "Both sorted inputs are ready",
    result: {
      title: "Merge Two Sorted Lists",
      value: "Preparing to compare the first nodes from both lists",
    },
    statusTone: "info",
  });

  while (leftIndex < leftNodes.length && rightIndex < auxiliaryNodes.length) {
    const leftNode = leftNodes[leftIndex];
    const rightNode = auxiliaryNodes[rightIndex];
    const takeLeft = leftNode.value <= rightNode.value;
    const chosenNode = takeLeft ? leftNode : rightNode;

    mergedNodes.push(chosenNode);

    builder.addStep({
      description: `Compare ${leftNode.value} and ${rightNode.value}, then append ${chosenNode.value} to the merged list`,
      line: 2,
      nodes: leftNodes,
      activeIds: [leftNode.id],
      auxiliaryNodes,
      auxiliaryActiveIds: [rightNode.id],
      mergedPreview: mergedNodes.map((node) => node.value),
      outputText: `Merged Preview: ${mergedNodes.map((node) => node.value).join(" → ")}`,
      statusText: `Appended ${chosenNode.value} to the merged output`,
      result: {
        title: "Merge Two Sorted Lists",
        value: `Merged preview: ${mergedNodes.map((node) => node.value).join(" → ")}`,
      },
      nodesTraversedDelta: 2,
      statusTone: "warning",
    });

    if (takeLeft) leftIndex += 1;
    else rightIndex += 1;
  }

  while (leftIndex < leftNodes.length) {
    mergedNodes.push(leftNodes[leftIndex]);
    builder.addStep({
      description: `Append remaining node ${leftNodes[leftIndex].value} from the primary list`,
      line: 5,
      nodes: leftNodes,
      activeIds: [leftNodes[leftIndex].id],
      auxiliaryNodes,
      mergedPreview: mergedNodes.map((node) => node.value),
      outputText: `Merged Preview: ${mergedNodes.map((node) => node.value).join(" → ")}`,
      statusText: `Added ${leftNodes[leftIndex].value} from the primary list`,
      result: {
        title: "Merge Two Sorted Lists",
        value: `Merged preview: ${mergedNodes.map((node) => node.value).join(" → ")}`,
      },
      nodesTraversedDelta: 1,
      statusTone: "info",
    });
    leftIndex += 1;
  }

  while (rightIndex < auxiliaryNodes.length) {
    mergedNodes.push(auxiliaryNodes[rightIndex]);
    builder.addStep({
      description: `Append remaining node ${auxiliaryNodes[rightIndex].value} from the secondary list`,
      line: 5,
      nodes: leftNodes,
      auxiliaryNodes,
      auxiliaryActiveIds: [auxiliaryNodes[rightIndex].id],
      mergedPreview: mergedNodes.map((node) => node.value),
      outputText: `Merged Preview: ${mergedNodes.map((node) => node.value).join(" → ")}`,
      statusText: `Added ${auxiliaryNodes[rightIndex].value} from the secondary list`,
      result: {
        title: "Merge Two Sorted Lists",
        value: `Merged preview: ${mergedNodes.map((node) => node.value).join(" → ")}`,
      },
      nodesTraversedDelta: 1,
      statusTone: "info",
    });
    rightIndex += 1;
  }

  builder.addStep({
    description: "Place the merged nodes back into the main visualization lane",
    line: 5,
    nodes: mergedNodes,
    activeIds: mergedNodes.map((node) => node.id),
    outputText: `Merged List: ${formatListValues(mergedNodes)}`,
    statusText: "Merge completed successfully",
    result: {
      title: "Merge Two Sorted Lists",
      value: `Merged List: ${formatListValues(mergedNodes)}`,
    },
    arrowDirections: createLinearDirections(listType, mergedNodes.length),
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes: mergedNodes,
    nextCycleTargetIndex: null,
    outputText: `Merged List: ${formatListValues(mergedNodes)}`,
    statusText: "Merged two sorted lists",
    resultTitle: "Merge Two Sorted Lists",
    resultValue: `Merged List: ${formatListValues(mergedNodes)}`,
  });
};

const buildResetSession = ({
  listType,
  operationCount,
}) => {
  const builder = createSessionBuilder({
    listType,
    operation: "reset",
    operationCount,
    baseOutputText: DEFAULT_OUTPUT_TEXT,
    baseStatusText: "Resetting the linked list",
    cycleTargetIndex: null,
  });

  builder.addStep({
    description: "Fade every node out and reset the list to an empty state",
    line: 2,
    nodes: [],
    outputText: DEFAULT_OUTPUT_TEXT,
    statusText: "The list has been reset",
    result: {
      title: "Reset List",
      value: "All nodes were removed from the linked list",
    },
    statusTone: "success",
  });

  return builder.finalize({
    nextNodes: [],
    nextCycleTargetIndex: null,
    outputText: DEFAULT_OUTPUT_TEXT,
    statusText: "Reset the linked list",
    resultTitle: "Reset List",
    resultValue: "Traversal: Empty list",
  });
};

export const buildLinkedListAlgorithmSession = ({
  listType,
  nodes,
  operation,
  value,
  position,
  cycleTargetIndex = null,
  mergeValues = [],
  operationCount = 0,
  createId,
}) => {
  switch (operation) {
    case "insertHead":
      return buildInsertHeadSession({ listType, nodes, value, cycleTargetIndex, operationCount, createId });
    case "insertTail":
      return buildInsertTailSession({ listType, nodes, value, cycleTargetIndex, operationCount, createId });
    case "insertPosition":
      return buildInsertPositionSession({ listType, nodes, value, position, cycleTargetIndex, operationCount, createId });
    case "deleteHead":
      return buildDeleteHeadSession({ listType, nodes, cycleTargetIndex, operationCount });
    case "deleteTail":
      return buildDeleteTailSession({ listType, nodes, cycleTargetIndex, operationCount });
    case "deleteValue":
      return buildDeleteValueSession({ listType, nodes, value, cycleTargetIndex, operationCount });
    case "traverse":
      return buildTraverseSession({ listType, nodes, cycleTargetIndex, operationCount });
    case "search":
      return buildSearchSession({ listType, nodes, value, cycleTargetIndex, operationCount });
    case "reverse":
      return buildReverseSession({ listType, nodes, cycleTargetIndex, operationCount });
    case "findMiddle":
      return buildFindMiddleSession({ listType, nodes, cycleTargetIndex, operationCount });
    case "detectCycle":
      return buildDetectCycleSession({ listType, nodes, cycleTargetIndex, operationCount });
    case "mergeSorted":
      return buildMergeSortedSession({ listType, nodes, mergeValues, cycleTargetIndex, operationCount, createId });
    case "reset":
      return buildResetSession({ listType, operationCount });
    default:
      return createNoopSession({
        listType,
        operation,
        nodes,
        cycleTargetIndex,
        operationCount,
        message: "No linked list operation was selected",
      });
  }
};
