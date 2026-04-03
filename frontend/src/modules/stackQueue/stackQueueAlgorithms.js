import {
  STACK_QUEUE_LAYOUT,
  STACK_QUEUE_MAX_CAPACITY,
  cloneStructureItems,
  createIdleStackQueueStep,
  createStackQueueStep,
  createStructureItem,
  getInspectActionLabel,
  getOperationLabel,
  getOutputText,
  getStatusFromMode,
} from "@/modules/stackQueue/stackQueueUtils";

const buildResult = ({ mode, title, value, outputText, statusText, executionTimeMs, operationCount, severity = "success" }) => ({
  mode,
  title,
  value,
  outputText,
  statusText,
  executionTimeMs,
  operationCount,
  severity,
});

const createSessionBuilder = ({ mode, operation, operationCount }) => {
  const startedAt = performance.now();
  const steps = [];

  const addStep = (config) => {
    steps.push(
      createStackQueueStep({
        mode,
        operation,
        items: config.items,
        description: config.description,
        message: config.message,
        line: config.line,
        outputText: config.outputText ?? getOutputText(mode, config.items),
        statusText: config.statusText ?? getStatusFromMode(mode, config.items),
        operationCount,
        activeIds: config.activeIds,
        removedIds: config.removedIds,
        settledIds: config.settledIds,
        itemOverrides: config.itemOverrides,
        transientItems: config.transientItems,
        result: config.result,
        statusTone: config.statusTone,
      }),
    );
  };

  const finalize = ({ nextItems, title, value, outputText, statusText, severity = "success" }) => {
    const executionTimeMs = Math.max(Math.round(performance.now() - startedAt), steps.length * 180, 140);
    const result = buildResult({
      mode,
      title,
      value,
      outputText,
      statusText,
      executionTimeMs,
      operationCount,
      severity,
    });

    const finalizedSteps = steps.map((step) => ({
      ...step,
      result,
      stats: {
        ...step.stats,
        executionTimeMs,
      },
    }));

    return {
      steps: finalizedSteps,
      nextItems: cloneStructureItems(nextItems),
      result,
      operationLabel: getOperationLabel(mode, operation),
    };
  };

  return { addStep, finalize };
};

const buildWarningSession = ({ mode, operation, items, operationCount, title, value, statusText }) => {
  const result = buildResult({
    mode,
    title,
    value,
    outputText: getOutputText(mode, items),
    statusText,
    executionTimeMs: 160,
    operationCount,
    severity: "danger",
  });

  const step = createStackQueueStep({
    mode,
    operation,
    items,
    description: statusText,
    message: `Step 1: ${statusText}`,
    line: 1,
    outputText: getOutputText(mode, items),
    statusText,
    operationCount,
    statusTone: "danger",
    result,
  });

  return {
    steps: [
      {
        ...step,
        stats: {
          ...step.stats,
          executionTimeMs: 160,
        },
      },
    ],
    nextItems: cloneStructureItems(items),
    result,
    operationLabel: getOperationLabel(mode, operation),
  };
};

const buildPushSession = ({ mode, items, value, operationCount, createId }) => {
  const existingItems = cloneStructureItems(items);
  if (existingItems.length >= STACK_QUEUE_MAX_CAPACITY) {
    return buildWarningSession({
      mode,
      operation: "push",
      items: existingItems,
      operationCount,
      title: "Stack Overflow",
      value: `Stack Overflow: maximum capacity is ${STACK_QUEUE_MAX_CAPACITY}.`,
      statusText: "Stack Overflow",
    });
  }

  const builder = createSessionBuilder({
    mode,
    operation: "push",
    operationCount,
  });

  const newItem = createStructureItem(createId(), value);
  const nextItems = [...existingItems, newItem];
  const finalY =
    STACK_QUEUE_LAYOUT.stack.floorY -
    existingItems.length * (STACK_QUEUE_LAYOUT.itemHeight + STACK_QUEUE_LAYOUT.itemGap);

  builder.addStep({
    items: existingItems,
    description: `New element ${value} appears above the stack`,
    message: `Step 1: Push ${value}`,
    line: 1,
    transientItems: [
      {
        item: newItem,
        slotIndex: existingItems.length,
        y: STACK_QUEUE_LAYOUT.stack.spawnY,
        opacity: 0.2,
        scale: 0.92,
      },
    ],
    statusText: `Incoming node ${value} is entering the stack lane.`,
    statusTone: "warning",
  });

  builder.addStep({
    items: nextItems,
    description: `Move ${value} down to the top of the stack`,
    message: `Step 2: Move element to top`,
    line: 3,
    activeIds: [newItem.id],
    itemOverrides: {
      [newItem.id]: {
        y: finalY + 14,
        scale: 1.08,
        zIndex: 3,
      },
    },
    statusText: `Element ${value} slides into the top slot.`,
    statusTone: "info",
  });

  builder.addStep({
    items: nextItems,
    description: `Settle ${value} with a bounce and update the top pointer`,
    message: `Step 3: Update top pointer`,
    line: 4,
    settledIds: [newItem.id],
    itemOverrides: {
      [newItem.id]: {
        y: finalY,
        scale: 1,
        zIndex: 2,
      },
    },
    statusText: `Top pointer now references ${value}.`,
    statusTone: "success",
  });

  return builder.finalize({
    nextItems,
    title: "Stack",
    value: `Top Element: ${value}`,
    outputText: getOutputText(mode, nextItems),
    statusText: `Pushed ${value} onto the stack.`,
  });
};

const buildPopSession = ({ mode, items, operationCount }) => {
  const existingItems = cloneStructureItems(items);
  if (!existingItems.length) {
    return buildWarningSession({
      mode,
      operation: "pop",
      items: existingItems,
      operationCount,
      title: "Stack Underflow",
      value: "Stack Underflow: there is nothing to pop.",
      statusText: "Stack Underflow",
    });
  }

  const builder = createSessionBuilder({
    mode,
    operation: "pop",
    operationCount,
  });

  const removed = existingItems[existingItems.length - 1];
  const currentY =
    STACK_QUEUE_LAYOUT.stack.floorY -
    (existingItems.length - 1) * (STACK_QUEUE_LAYOUT.itemHeight + STACK_QUEUE_LAYOUT.itemGap);
  const nextItems = existingItems.slice(0, -1);

  builder.addStep({
    items: existingItems,
    description: `Highlight top element ${removed.value}`,
    message: `Step 1: Highlight top element`,
    line: 2,
    activeIds: [removed.id],
    itemOverrides: {
      [removed.id]: {
        scale: 1.08,
        zIndex: 3,
      },
    },
    statusText: `Top element ${removed.value} is selected for removal.`,
    statusTone: "warning",
  });

  builder.addStep({
    items: existingItems,
    description: `Lift ${removed.value} upward`,
    message: `Step 2: Move top element upward`,
    line: 3,
    removedIds: [removed.id],
    itemOverrides: {
      [removed.id]: {
        y: currentY - 38,
        scale: 1.04,
        zIndex: 4,
        tone: "removed",
      },
    },
    statusText: `${removed.value} is leaving the stack.`,
    statusTone: "danger",
  });

  builder.addStep({
    items: existingItems,
    description: `Fade ${removed.value} out of the stack`,
    message: `Step 3: Fade removed element`,
    line: 3,
    removedIds: [removed.id],
    itemOverrides: {
      [removed.id]: {
        y: currentY - 74,
        opacity: 0,
        scale: 0.92,
        zIndex: 4,
        tone: "removed",
      },
    },
    statusText: `${removed.value} fades out while the stack prepares its new top.`,
    statusTone: "danger",
  });

  builder.addStep({
    items: nextItems,
    description: `Collapse the stack and update the top pointer`,
    message: `Step 4: Remove element and update top`,
    line: 4,
    statusText: nextItems.length ? `Top pointer now references ${nextItems[nextItems.length - 1].value}.` : "The stack is now empty.",
    statusTone: "success",
  });

  return builder.finalize({
    nextItems,
    title: "Stack",
    value: getOutputText(mode, nextItems),
    outputText: getOutputText(mode, nextItems),
    statusText: `Popped ${removed.value} from the stack.`,
  });
};

const buildPeekSession = ({ mode, items, operationCount }) => {
  const existingItems = cloneStructureItems(items);
  if (!existingItems.length) {
    return buildWarningSession({
      mode,
      operation: "peek",
      items: existingItems,
      operationCount,
      title: "Stack Underflow",
      value: "Stack Underflow: there is nothing to peek.",
      statusText: "Stack Underflow",
    });
  }

  const builder = createSessionBuilder({
    mode,
    operation: "peek",
    operationCount,
  });

  const topItem = existingItems[existingItems.length - 1];

  builder.addStep({
    items: existingItems,
    description: `Highlight top element ${topItem.value}`,
    message: `Step 1: Highlight top element`,
    line: 2,
    activeIds: [topItem.id],
    itemOverrides: {
      [topItem.id]: {
        scale: 1.1,
        zIndex: 3,
      },
    },
    statusText: `Peek focuses on ${topItem.value} without removing it.`,
    statusTone: "warning",
  });

  builder.addStep({
    items: existingItems,
    description: `Return the top element to its resting position`,
    message: `Step 2: Keep top element in place`,
    line: 3,
    settledIds: [topItem.id],
    statusText: `Top element remains ${topItem.value}.`,
    statusTone: "success",
  });

  return builder.finalize({
    nextItems: existingItems,
    title: "Stack",
    value: `Top Element: ${topItem.value}`,
    outputText: getOutputText(mode, existingItems),
    statusText: `Peek returned ${topItem.value}.`,
  });
};

const buildEnqueueSession = ({ mode, items, value, operationCount, createId }) => {
  const existingItems = cloneStructureItems(items);
  if (existingItems.length >= STACK_QUEUE_MAX_CAPACITY) {
    return buildWarningSession({
      mode,
      operation: "enqueue",
      items: existingItems,
      operationCount,
      title: "Queue Overflow",
      value: `Queue Overflow: maximum capacity is ${STACK_QUEUE_MAX_CAPACITY}.`,
      statusText: "Queue Overflow",
    });
  }

  const builder = createSessionBuilder({
    mode,
    operation: "enqueue",
    operationCount,
  });

  const newItem = createStructureItem(createId(), value);
  const nextItems = [...existingItems, newItem];
  const finalX =
    STACK_QUEUE_LAYOUT.queue.leftPad +
    existingItems.length * (STACK_QUEUE_LAYOUT.itemWidth + STACK_QUEUE_LAYOUT.itemGap);

  builder.addStep({
    items: existingItems,
    description: `New element ${value} appears outside the queue`,
    message: `Step 1: Enqueue ${value}`,
    line: 1,
    transientItems: [
      {
        item: newItem,
        slotIndex: existingItems.length,
        x: finalX + STACK_QUEUE_LAYOUT.queue.spawnOffsetX,
        opacity: 0.2,
        scale: 0.92,
      },
    ],
    statusText: `Incoming node ${value} is staged at the rear side.`,
    statusTone: "warning",
  });

  builder.addStep({
    items: nextItems,
    description: `Slide ${value} left into the rear slot`,
    message: `Step 2: Move element to rear`,
    line: 3,
    activeIds: [newItem.id],
    itemOverrides: {
      [newItem.id]: {
        x: finalX + 18,
        scale: 1.05,
        zIndex: 3,
      },
    },
    statusText: `${value} moves into the rear position.`,
    statusTone: "info",
  });

  builder.addStep({
    items: nextItems,
    description: `Settle ${value} and update the rear pointer`,
    message: `Step 3: Update rear pointer`,
    line: 4,
    settledIds: [newItem.id],
    statusText: `Rear pointer now references ${value}.`,
    statusTone: "success",
  });

  return builder.finalize({
    nextItems,
    title: "Queue",
    value: getOutputText(mode, nextItems),
    outputText: getOutputText(mode, nextItems),
    statusText: `Enqueued ${value} into the queue.`,
  });
};

const buildDequeueSession = ({ mode, items, operationCount }) => {
  const existingItems = cloneStructureItems(items);
  if (!existingItems.length) {
    return buildWarningSession({
      mode,
      operation: "dequeue",
      items: existingItems,
      operationCount,
      title: "Queue Underflow",
      value: "Queue Underflow: there is nothing to dequeue.",
      statusText: "Queue Underflow",
    });
  }

  const builder = createSessionBuilder({
    mode,
    operation: "dequeue",
    operationCount,
  });

  const removed = existingItems[0];
  const currentX = STACK_QUEUE_LAYOUT.queue.leftPad;
  const nextItems = existingItems.slice(1);

  builder.addStep({
    items: existingItems,
    description: `Highlight front element ${removed.value}`,
    message: `Step 1: Highlight front element`,
    line: 2,
    activeIds: [removed.id],
    itemOverrides: {
      [removed.id]: {
        scale: 1.08,
        zIndex: 3,
      },
    },
    statusText: `Front element ${removed.value} is selected for removal.`,
    statusTone: "warning",
  });

  builder.addStep({
    items: existingItems,
    description: `Slide ${removed.value} out of the queue`,
    message: `Step 2: Move front element left`,
    line: 3,
    removedIds: [removed.id],
    itemOverrides: {
      [removed.id]: {
        x: currentX - 48,
        scale: 1.04,
        zIndex: 4,
        tone: "removed",
      },
    },
    statusText: `${removed.value} is leaving from the front.`,
    statusTone: "danger",
  });

  builder.addStep({
    items: existingItems,
    description: `Fade ${removed.value} and prepare the queue shift`,
    message: `Step 3: Fade removed element`,
    line: 3,
    removedIds: [removed.id],
    itemOverrides: {
      [removed.id]: {
        x: currentX - 96,
        opacity: 0,
        scale: 0.92,
        zIndex: 4,
        tone: "removed",
      },
    },
    statusText: `Remaining elements prepare to shift left.`,
    statusTone: "danger",
  });

  builder.addStep({
    items: nextItems,
    description: `Shift the remaining queue left and update the pointers`,
    message: `Step 4: Shift remaining queue`,
    line: 4,
    statusText: nextItems.length ? `Front pointer now references ${nextItems[0].value}.` : "The queue is now empty.",
    statusTone: "success",
  });

  return builder.finalize({
    nextItems,
    title: "Queue",
    value: getOutputText(mode, nextItems),
    outputText: getOutputText(mode, nextItems),
    statusText: `Dequeued ${removed.value} from the queue.`,
  });
};

const buildFrontSession = ({ mode, items, operationCount }) => {
  const existingItems = cloneStructureItems(items);
  if (!existingItems.length) {
    return buildWarningSession({
      mode,
      operation: "front",
      items: existingItems,
      operationCount,
      title: "Queue Underflow",
      value: "Queue Underflow: there is no front element.",
      statusText: "Queue Underflow",
    });
  }

  const builder = createSessionBuilder({
    mode,
    operation: "front",
    operationCount,
  });

  const frontItem = existingItems[0];

  builder.addStep({
    items: existingItems,
    description: `Highlight the front element ${frontItem.value}`,
    message: `Step 1: Highlight front element`,
    line: 2,
    activeIds: [frontItem.id],
    itemOverrides: {
      [frontItem.id]: {
        scale: 1.1,
        zIndex: 3,
      },
    },
    statusText: `Front focuses on ${frontItem.value} without removing it.`,
    statusTone: "warning",
  });

  builder.addStep({
    items: existingItems,
    description: `Return the front element to its resting position`,
    message: `Step 2: Keep front element in place`,
    line: 3,
    settledIds: [frontItem.id],
    statusText: `Front element remains ${frontItem.value}.`,
    statusTone: "success",
  });

  return builder.finalize({
    nextItems: existingItems,
    title: "Queue",
    value: `Front Element: ${frontItem.value}`,
    outputText: getOutputText(mode, existingItems),
    statusText: `Front returned ${frontItem.value}.`,
  });
};

const buildResetSession = ({ mode, items, operationCount }) => {
  const existingItems = cloneStructureItems(items);

  if (!existingItems.length) {
    const result = buildResult({
      mode,
      title: mode === "stack" ? "Stack" : "Queue",
      value: getOutputText(mode, []),
      outputText: getOutputText(mode, []),
      statusText: mode === "stack" ? "Stack already empty." : "Queue already empty.",
      executionTimeMs: 120,
      operationCount,
      severity: "success",
    });

    return {
      steps: [
        createIdleStackQueueStep({
          mode,
          items: [],
          operationCount,
          statusText: result.statusText,
        }),
      ],
      nextItems: [],
      result,
      operationLabel: "Reset",
    };
  }

  const builder = createSessionBuilder({
    mode,
    operation: "reset",
    operationCount,
  });

  builder.addStep({
    items: existingItems,
    description: `Fade out every ${mode} element`,
    message: `Step 1: Fade out current ${mode}`,
    line: 1,
    removedIds: existingItems.map((item) => item.id),
    itemOverrides: Object.fromEntries(
      existingItems.map((item, index) => [
        item.id,
        mode === "stack"
          ? {
              y:
                STACK_QUEUE_LAYOUT.stack.floorY -
                index * (STACK_QUEUE_LAYOUT.itemHeight + STACK_QUEUE_LAYOUT.itemGap) -
                24,
              opacity: 0,
              tone: "removed",
            }
          : {
              x:
                STACK_QUEUE_LAYOUT.queue.leftPad +
                index * (STACK_QUEUE_LAYOUT.itemWidth + STACK_QUEUE_LAYOUT.itemGap),
              y: STACK_QUEUE_LAYOUT.queue.laneY - 18,
              opacity: 0,
              tone: "removed",
            },
      ]),
    ),
    statusText: `Reset clears every element from the ${mode}.`,
    statusTone: "danger",
  });

  builder.addStep({
    items: [],
    description: `Reset the ${mode} and clear every pointer`,
    message: `Step 2: Reset pointers and counters`,
    line: 3,
    statusText: mode === "stack" ? "Stack reset complete." : "Queue reset complete.",
    statusTone: "success",
  });

  return builder.finalize({
    nextItems: [],
    title: mode === "stack" ? "Stack" : "Queue",
    value: getOutputText(mode, []),
    outputText: getOutputText(mode, []),
    statusText: mode === "stack" ? "Stack reset complete." : "Queue reset complete.",
  });
};

export const buildStackQueueSession = ({
  mode,
  items,
  operation,
  value,
  operationCount = 0,
  createId,
}) => {
  if (mode === "stack") {
    if (operation === "push") return buildPushSession({ mode, items, value, operationCount, createId });
    if (operation === "pop") return buildPopSession({ mode, items, operationCount });
    if (operation === "peek") return buildPeekSession({ mode, items, operationCount });
    if (operation === "reset") return buildResetSession({ mode, items, operationCount });
  }

  if (mode === "queue") {
    if (operation === "enqueue") return buildEnqueueSession({ mode, items, value, operationCount, createId });
    if (operation === "dequeue") return buildDequeueSession({ mode, items, operationCount });
    if (operation === "front") return buildFrontSession({ mode, items, operationCount });
    if (operation === "reset") return buildResetSession({ mode, items, operationCount });
  }

  return buildWarningSession({
    mode,
    operation,
    items,
    operationCount,
    title: mode === "stack" ? "Stack" : "Queue",
    value: `${getInspectActionLabel(mode)} is not available.`,
    statusText: `Unsupported operation: ${operation}`,
  });
};
