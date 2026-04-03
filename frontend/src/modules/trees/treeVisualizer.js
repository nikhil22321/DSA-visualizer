import { runTreeAlgorithm, treeAlgorithmInfo } from "@/modules/trees/treeAlgorithms";
import {
  addManualChild,
  addManualRoot,
  countNodes,
  deleteBstValue,
  deleteNodeById,
  flattenTree,
  generateRandomTree,
  getTreeHeight,
  insertBstValue,
  relayoutTree,
} from "@/modules/trees/treeUtils";

export const treeTypeOptions = [
  { value: "binary", label: "Binary Tree" },
  { value: "bst", label: "Binary Search Tree" },
];

export const createIdleTreeStep = ({
  root,
  description = "Tree ready.",
  output = "Build a tree or run an algorithm.",
  line = 1,
  currentNodeId = null,
  selectedNodeId = null,
  visitedNodeIds = [],
  resultNodeIds = [],
  deletedNodeIds = [],
  executionTimeMs = 0,
}) => {
  const laidOutRoot = relayoutTree(root);
  return {
    description,
    output,
    line,
    treeRoot: laidOutRoot,
    currentNodeId,
    selectedNodeId,
    visitedNodeIds,
    resultNodeIds,
    deletedNodeIds,
    stats: {
      nodesVisited: visitedNodeIds.length || resultNodeIds.length || 0,
      executionTimeMs,
      totalNodes: countNodes(laidOutRoot),
      treeHeight: getTreeHeight(laidOutRoot),
    },
  };
};

export const buildAlgorithmSession = ({ root, algorithmKey, params, selectedNodeId }) => {
  const laidOutRoot = relayoutTree(root);
  const execution = runTreeAlgorithm(laidOutRoot, algorithmKey, params);
  const steps = execution.steps.map((step) =>
    createIdleTreeStep({
      root: laidOutRoot,
      description: step.description,
      output: step.output || execution.result,
      line: step.line,
      currentNodeId: step.currentNodeId,
      selectedNodeId,
      visitedNodeIds: step.visitedNodeIds,
      resultNodeIds: step.resultNodeIds,
      deletedNodeIds: step.deletedNodeIds,
      executionTimeMs: execution.executionTimeMs,
    }),
  );

  return {
    steps: steps.length
      ? steps
      : [
          createIdleTreeStep({
            root: laidOutRoot,
            description: "No steps generated.",
            output: execution.result,
            executionTimeMs: execution.executionTimeMs,
          }),
        ],
    result: execution.result,
    summary: {
      totalNodes: execution.totalNodes,
      height: execution.height,
      isBst: execution.isBst,
      executionTimeMs: execution.executionTimeMs,
    },
  };
};

export const treeMutations = {
  addManualRoot,
  addManualChild,
  deleteNodeById,
  insertBstValue,
  deleteBstValue,
  generateRandomTree,
};

export const getTreeAlgorithmMeta = (algorithmKey) => treeAlgorithmInfo[algorithmKey] || treeAlgorithmInfo.inorder;

export const getTreeCanvasData = (root) => flattenTree(root);
