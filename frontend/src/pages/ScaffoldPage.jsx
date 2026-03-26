import { Wrench } from "lucide-react";

import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const scaffoldMap = {
  tree: {
    title: "Tree Visualizer (Production Scaffold)",
    features: [
      "Binary Tree, BST, AVL, Trie, Segment Tree data models",
      "Insert/Delete/Search actions and traversal playback",
      "Node rotation debugger and balancing insights",
    ],
  },
  "linked-list": {
    title: "Linked List Visualizer (Production Scaffold)",
    features: [
      "Singly, Doubly, Circular linked list structures",
      "Insert/Delete/Search/Reverse/Cycle detection controls",
      "Pointer-state debugger panel for head/tail/current",
    ],
  },
  stack: {
    title: "Stack Visualizer (Production Scaffold)",
    features: [
      "Push/Pop/Peek interactions with timeline controls",
      "Balanced Parentheses and Infix/Postfix applications",
      "Runtime statistics and expression state tracing",
    ],
  },
  queue: {
    title: "Queue Visualizer (Production Scaffold)",
    features: [
      "Queue, Circular Queue, Deque, Priority Queue",
      "Enqueue/Dequeue timeline and memory view",
      "Operation cost insights and comparator logic panel",
    ],
  },
};

export default function ScaffoldPage({ type = "tree" }) {
  const content = scaffoldMap[type] || scaffoldMap.tree;

  return (
    <PageMotionWrapper testId={`${type}-scaffold-page`}>
      <Card className="border-border/70 bg-card/70" data-testid={`${type}-scaffold-card`}>
        <CardHeader>
          <CardTitle className="font-heading text-2xl" data-testid={`${type}-scaffold-title`}>
            {content.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm" data-testid={`${type}-scaffold-status`}>
            <Wrench className="h-4 w-4 text-primary" />
            Production-ready route scaffolding is active. Module architecture, navigation, and control surfaces are prepared.
          </p>
          <ul className="space-y-3">
            {content.features.map((feature, index) => (
              <li
                key={feature}
                className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm"
                data-testid={`${type}-scaffold-feature-${index}`}
              >
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageMotionWrapper>
  );
}
