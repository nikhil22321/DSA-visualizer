export const STACK_QUEUE_MODES = [
  { value: "stack", label: "Stack Mode", behavior: "LIFO" },
  { value: "queue", label: "Queue Mode", behavior: "FIFO" },
];

export const STACK_QUEUE_MAX_CAPACITY = 8;

export const STACK_QUEUE_LAYOUT = {
  itemWidth: 132,
  itemHeight: 58,
  itemGap: 16,
  stack: {
    width: 420,
    height: 400,
    laneX: 144,
    floorY: 296,
    spawnY: 32,
  },
  queue: {
    width: 760,
    height: 260,
    laneY: 122,
    leftPad: 88,
    spawnOffsetX: 120,
  },
};

export const DEFAULT_STATUS_TEXT = "Choose a mode and run an operation to begin the visualization.";

export const STACK_QUEUE_PSEUDOCODE = {
  push: [
    "incoming = x",
    "place incoming above the stack",
    "stack.push(incoming)",
    "top = stack.last()",
  ],
  pop: [
    "if stack is empty: underflow",
    "highlight top element",
    "stack.pop()",
    "top = stack.last()",
  ],
  peek: [
    "if stack is empty: underflow",
    "top = stack.last()",
    "highlight top",
  ],
  enqueue: [
    "incoming = x",
    "place incoming at the rear side",
    "queue.enqueue(incoming)",
    "rear = queue.last()",
  ],
  dequeue: [
    "if queue is empty: underflow",
    "highlight front element",
    "queue.dequeue()",
    "front = queue.first()",
  ],
  front: [
    "if queue is empty: underflow",
    "front = queue.first()",
    "highlight front",
  ],
  reset: [
    "clear every element",
    "reset pointers",
    "reset output and counters",
  ],
};

const toneFromIds = ({ activeIds = [], removedIds = [], settledIds = [] }, itemId) => {
  if (removedIds.includes(itemId)) return "removed";
  if (activeIds.includes(itemId)) return "active";
  if (settledIds.includes(itemId)) return "active";
  return "default";
};

const getStackPosition = (slotIndex) => ({
  x: STACK_QUEUE_LAYOUT.stack.laneX,
  y:
    STACK_QUEUE_LAYOUT.stack.floorY -
    slotIndex * (STACK_QUEUE_LAYOUT.itemHeight + STACK_QUEUE_LAYOUT.itemGap),
});

const getQueuePosition = (slotIndex) => ({
  x:
    STACK_QUEUE_LAYOUT.queue.leftPad +
    slotIndex * (STACK_QUEUE_LAYOUT.itemWidth + STACK_QUEUE_LAYOUT.itemGap),
  y: STACK_QUEUE_LAYOUT.queue.laneY,
});

const getBasePosition = (mode, slotIndex) => (mode === "stack" ? getStackPosition(slotIndex) : getQueuePosition(slotIndex));

const buildStageMeta = (mode, count) => {
  if (mode === "stack") {
    return {
      width: STACK_QUEUE_LAYOUT.stack.width,
      height: STACK_QUEUE_LAYOUT.stack.height,
    };
  }

  const queueWidth = Math.max(
    STACK_QUEUE_LAYOUT.queue.width,
    STACK_QUEUE_LAYOUT.queue.leftPad * 2 +
      Math.max(count, 1) * STACK_QUEUE_LAYOUT.itemWidth +
      Math.max(count - 1, 0) * STACK_QUEUE_LAYOUT.itemGap,
  );

  return {
    width: queueWidth,
    height: STACK_QUEUE_LAYOUT.queue.height,
  };
};

const resolvePointer = (mode, items, stage) => {
  if (!items.length) {
    if (mode === "stack") {
      return [
        {
          key: "top",
          label: "Top",
          x: stage.width / 2 - 34,
          y: 88,
        },
      ];
    }

    return [
      {
        key: "front",
        label: "Front",
        x: STACK_QUEUE_LAYOUT.queue.leftPad - 12,
        y: 40,
      },
      {
        key: "rear",
        label: "Rear",
        x: stage.width - STACK_QUEUE_LAYOUT.queue.leftPad - 56,
        y: 40,
      },
    ];
  }

  if (mode === "stack") {
    const topPosition = getStackPosition(items.length - 1);
    return [
      {
        key: "top",
        label: "Top",
        x: topPosition.x + STACK_QUEUE_LAYOUT.itemWidth / 2 - 34,
        y: topPosition.y - 42,
      },
    ];
  }

  const frontPosition = getQueuePosition(0);
  const rearPosition = getQueuePosition(items.length - 1);

  return [
    {
      key: "front",
      label: "Front",
      x: frontPosition.x + STACK_QUEUE_LAYOUT.itemWidth / 2 - 38,
      y: 42,
    },
    {
      key: "rear",
      label: "Rear",
      x: rearPosition.x + STACK_QUEUE_LAYOUT.itemWidth / 2 - 32,
      y: 42,
    },
  ];
};

export const cloneStructureItems = (items = []) => items.map((item) => ({ ...item }));

export const createStructureItem = (id, value) => ({
  id,
  value,
});

export const getModeMeta = (mode) => STACK_QUEUE_MODES.find((option) => option.value === mode) || STACK_QUEUE_MODES[0];

export const getPrimaryActionLabel = (mode) => (mode === "stack" ? "Push" : "Enqueue");

export const getSecondaryActionLabel = (mode) => (mode === "stack" ? "Pop" : "Dequeue");

export const getInspectActionLabel = (mode) => (mode === "stack" ? "Peek" : "Front");

export const getOperationLabel = (mode, operation) => {
  const lookup = {
    stack: {
      push: "Push",
      pop: "Pop",
      peek: "Peek",
      reset: "Reset",
      idle: "Idle",
    },
    queue: {
      enqueue: "Enqueue",
      dequeue: "Dequeue",
      front: "Front",
      reset: "Reset",
      idle: "Idle",
    },
  };

  return lookup[mode]?.[operation] || "Structure";
};

export const getPseudocodeForOperation = (operation) => STACK_QUEUE_PSEUDOCODE[operation] || [];

export const getOutputText = (mode, items = []) => {
  if (mode === "stack") {
    return `Top Element: ${items.length ? items[items.length - 1].value : "-"}`;
  }

  return `Front Element: ${items.length ? items[0].value : "-"}`;
};

export const getStatusFromMode = (mode, items = []) => {
  if (!items.length) {
    return mode === "stack" ? "Stack is empty." : "Queue is empty.";
  }

  return mode === "stack"
    ? `Stack ready with ${items.length} element${items.length === 1 ? "" : "s"}.`
    : `Queue ready with ${items.length} element${items.length === 1 ? "" : "s"}.`;
};

export const buildVisualState = ({
  mode,
  items,
  activeIds = [],
  removedIds = [],
  settledIds = [],
  itemOverrides = {},
  transientItems = [],
}) => {
  const baseItems = cloneStructureItems(items);
  const stage = buildStageMeta(mode, baseItems.length + transientItems.length);

  const renderBaseItem = (item, index) => {
    const override = itemOverrides[item.id] || {};
    const basePosition = getBasePosition(mode, override.slotIndex ?? index);

    return {
      id: item.id,
      value: item.value,
      x: override.x ?? basePosition.x,
      y: override.y ?? basePosition.y,
      opacity: override.opacity ?? 1,
      scale: override.scale ?? 1,
      tone: override.tone || toneFromIds({ activeIds, removedIds, settledIds }, item.id),
      zIndex: override.zIndex ?? 1,
    };
  };

  const renderTransientItem = ({ item, slotIndex, ...override }) => {
    const basePosition = getBasePosition(mode, slotIndex ?? baseItems.length);
    return {
      id: item.id,
      value: item.value,
      x: override.x ?? basePosition.x,
      y: override.y ?? basePosition.y,
      opacity: override.opacity ?? 1,
      scale: override.scale ?? 1,
      tone: override.tone || "active",
      zIndex: override.zIndex ?? 3,
    };
  };

  const visualItems = [
    ...baseItems.map(renderBaseItem),
    ...transientItems.map(renderTransientItem),
  ];

  const pointers = resolvePointer(mode, baseItems, stage);

  return {
    stage,
    visualItems,
    pointers,
  };
};

export const createStackQueueStep = ({
  mode,
  operation,
  description,
  message,
  line = 0,
  items,
  outputText,
  statusText,
  operationCount = 0,
  executionTimeMs = 0,
  activeIds = [],
  removedIds = [],
  settledIds = [],
  itemOverrides = {},
  transientItems = [],
  result,
  statusTone = "default",
}) => {
  const clonedItems = cloneStructureItems(items);
  const visualState = buildVisualState({
    mode,
    items: clonedItems,
    activeIds,
    removedIds,
    settledIds,
    itemOverrides,
    transientItems,
  });

  return {
    type: "stack-queue",
    mode,
    operation,
    description,
    message: message || description,
    line,
    items: clonedItems,
    outputText,
    statusText,
    statusTone,
    stage: visualState.stage,
    visualItems: visualState.visualItems,
    pointers: visualState.pointers,
    result,
    stats: {
      operationCount,
      elementsCount: clonedItems.length,
      executionTimeMs,
    },
    internalState: {
      mode,
      elements: clonedItems.map((item) => item.value),
      top: clonedItems[clonedItems.length - 1]?.value ?? null,
      front: clonedItems[0]?.value ?? null,
      rear: clonedItems[clonedItems.length - 1]?.value ?? null,
      activeIds,
      removedIds,
    },
  };
};

export const createIdleStackQueueStep = ({
  mode,
  items,
  operationCount = 0,
  executionTimeMs = 0,
  outputText = getOutputText(mode, items),
  statusText = getStatusFromMode(mode, items),
}) =>
  createStackQueueStep({
    mode,
    operation: "idle",
    description: mode === "stack" ? "Stack workspace ready" : "Queue workspace ready",
    message: mode === "stack" ? "Step 1: Stack workspace ready" : "Step 1: Queue workspace ready",
    items,
    outputText,
    statusText,
    operationCount,
    executionTimeMs,
    result: {
      title: mode === "stack" ? "Stack" : "Queue",
      value: outputText,
      outputText,
      statusText,
      executionTimeMs,
      operationCount,
      severity: "success",
    },
  });
