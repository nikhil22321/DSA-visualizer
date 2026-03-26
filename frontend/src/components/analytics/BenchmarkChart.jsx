import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const BenchmarkChart = ({ data, title = "Benchmark Engine" }) => (
  <Card className="border-border/70 bg-card/70" data-testid="benchmark-chart-card">
    <CardHeader className="pb-2">
      <CardTitle className="font-heading text-base" data-testid="benchmark-chart-title">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-[280px] w-full min-w-0" data-testid="benchmark-chart-canvas">
        <ResponsiveContainer width="99%" height={260} minWidth={260}>
          <LineChart data={data} margin={{ left: 10, right: 10, top: 12, bottom: 8 }}>
            <XAxis dataKey="size" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
            <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="leftOps"
              name="Algo A Ops"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="rightOps"
              name="Algo B Ops"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="leftMs"
              name="Algo A ms"
              stroke="hsl(var(--chart-3))"
              strokeDasharray="5 4"
              strokeWidth={1.6}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="rightMs"
              name="Algo B ms"
              stroke="hsl(var(--chart-4))"
              strokeDasharray="5 4"
              strokeWidth={1.6}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);
