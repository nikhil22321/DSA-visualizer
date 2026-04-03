import { runStepAnimation } from "@/helpers/animation";
import { buildLinkedListAlgorithmSession } from "@/modules/linkedList/linkedListAlgorithms";
import {
  DEFAULT_OUTPUT_TEXT,
  DEFAULT_STATUS_TEXT,
  LINKED_LIST_PSEUDOCODE,
  createIdleLinkedListStep,
} from "@/modules/linkedList/linkedListUtils";

const OPERATION_LABELS = {
  insertHead: "Insert at Head",
  insertTail: "Insert at Tail",
  insertPosition: "Insert at Position",
  deleteHead: "Delete Head",
  deleteTail: "Delete Tail",
  deleteValue: "Delete by Value",
  traverse: "Traverse List",
  search: "Search",
  reverse: "Reverse List",
  findMiddle: "Find Middle Node",
  detectCycle: "Detect Cycle",
  mergeSorted: "Merge Two Sorted Lists",
  reset: "Reset List",
};

export const getLinkedListOperationLabel = (operation) => OPERATION_LABELS[operation] || "Linked List";

export const getLinkedListPseudocode = (operation) => LINKED_LIST_PSEUDOCODE[operation] || [];

export const createLinkedListInitialStep = ({
  listType,
  nodes,
  cycleTargetIndex = null,
  operationCount = 0,
  executionTimeMs = 0,
}) =>
  createIdleLinkedListStep({
    listType,
    nodes,
    cycleTargetIndex,
    operationCount,
    executionTimeMs,
    statusText: DEFAULT_STATUS_TEXT,
    outputText: DEFAULT_OUTPUT_TEXT,
  });

export const prepareLinkedListSession = ({
  listType,
  nodes,
  operation,
  value,
  position,
  cycleTargetIndex,
  mergeValues,
  operationCount,
  createId,
}) => {
  const session = buildLinkedListAlgorithmSession({
    listType,
    nodes,
    operation,
    value,
    position,
    cycleTargetIndex,
    mergeValues,
    operationCount,
    createId,
  });

  return {
    ...session,
    operationLabel: getLinkedListOperationLabel(operation),
  };
};

export const executeLinkedListSession = async ({
  steps,
  onStep,
  getDelay,
  pauseRef,
  abortRef,
}) =>
  runStepAnimation({
    steps,
    onStep,
    getDelay,
    pauseRef,
    abortRef,
  });
