import { useMemo, useState } from "react";
import { line, scaleLinear } from "d3";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ComplexitySimulator = () => {
  const [maxN, setMaxN] = useState(80);

  const chartData = useMemo(() => {
    const points = Array.from({ length: maxN }, (_, i) => i + 1);
    return points.map((n) => ({
      n,
      linear: n,
      nLogN: n * Math.log2(n + 1),
      quadratic: n * n,
    }));
  }, [maxN]);

  const width = 680;
  const height = 260;
  const padding = 24;
  const xScale = scaleLinear().domain([1, maxN]).range([padding, width - padding]);
  const maxY = chartData[chartData.length - 1]?.quadratic || 1;
  const yScale = scaleLinear().domain([0, maxY]).range([height - padding, padding]);

  const pathGenerator = line()
    .x((d) => xScale(d.n))
    .y((d) => yScale(d.value));

  const linearPath = pathGenerator(chartData.map((d) => ({ n: d.n, value: d.linear })));
  const nlognPath = pathGenerator(chartData.map((d) => ({ n: d.n, value: d.nLogN })));
  const quadraticPath = pathGenerator(chartData.map((d) => ({ n: d.n, value: d.quadratic })));

  return (
    <Card className="border-border/70 bg-card/70" data-testid="complexity-simulator-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base" data-testid="complexity-simulator-title">
          Interactive Complexity Simulator (n vs operations)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex flex-col gap-2" data-testid="complexity-simulator-size-control">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Input size: {maxN}</span>
          <input
            type="range"
            min="20"
            max="180"
            step="2"
            value={maxN}
            onChange={(event) => setMaxN(Number(event.target.value))}
            data-testid="complexity-simulator-size-range"
          />
        </label>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-xl border border-border/70 bg-background/70" data-testid="complexity-simulator-svg">
          <path d={linearPath || ""} stroke="hsl(var(--chart-1))" strokeWidth="2" fill="none" />
          <path d={nlognPath || ""} stroke="hsl(var(--chart-2))" strokeWidth="2" fill="none" />
          <path d={quadraticPath || ""} stroke="hsl(var(--chart-3))" strokeWidth="2" fill="none" />
          <text x="30" y="30" className="fill-foreground text-[11px]">O(n)</text>
          <text x="30" y="46" className="fill-foreground text-[11px]">O(n log n)</text>
          <text x="30" y="62" className="fill-foreground text-[11px]">O(n²)</text>
        </svg>
      </CardContent>
    </Card>
  );
};
