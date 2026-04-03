import { runStepAnimation } from "@/helpers/animation";
import { buildStackQueueSession } from "@/modules/stackQueue/stackQueueAlgorithms";
import { createIdleStackQueueStep, getOperationLabel, getPseudocodeForOperation } from "@/modules/stackQueue/stackQueueUtils";

export const createStackQueueInitialStep = ({
  mode,
  items,
  operationCount = 0,
  executionTimeMs = 0,
  outputText,
  statusText,
}) =>
  createIdleStackQueueStep({
    mode,
    items,
    operationCount,
    executionTimeMs,
    outputText,
    statusText,
  });

export const prepareStackQueueSession = ({
  mode,
  items,
  operation,
  value,
  operationCount,
  createId,
}) => {
  const session = buildStackQueueSession({
    mode,
    items,
    operation,
    value,
    operationCount,
    createId,
  });

  return {
    ...session,
    operationLabel: getOperationLabel(mode, operation),
  };
};

export const getStackQueuePseudocode = (operation) => getPseudocodeForOperation(operation);

export const executeStackQueueSession = async ({
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
