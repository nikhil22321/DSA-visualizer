import { Activity, ArrowLeftRight, BarChart2, Boxes, Clock3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const statCards = [
  { key: "executionSteps", label: "Execution Steps", icon: Activity, testId: "stat-execution-steps" },
  { key: "comparisons", label: "Comparisons", icon: ArrowLeftRight, testId: "stat-comparisons" },
  { key: "swaps", label: "Swaps/Writes", icon: Boxes, testId: "stat-swaps" },
  { key: "visitedNodes", label: "Visited Nodes", icon: BarChart2, testId: "stat-visited" },
  { key: "frontierPeak", label: "Frontier Peak", icon: Clock3, testId: "stat-frontier-peak" },
];

export const StatsGrid = ({ stats = {} }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="stats-grid">
    {statCards.map((item) => {
      const Icon = item.icon;
      return (
        <Card key={item.key} className="border-border/70 bg-card/70" data-testid={item.testId}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-3 font-code text-xl font-semibold" data-testid={`${item.testId}-value`}>
              {stats[item.key] ?? 0}
            </p>
          </CardContent>
        </Card>
      );
    })}
  </div>
);
