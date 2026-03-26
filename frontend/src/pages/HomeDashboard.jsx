import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, ChartNoAxesCombined, Cpu, GraduationCap, Rocket } from "lucide-react";

import { ComplexitySimulator } from "@/components/analytics/ComplexitySimulator";
import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { FlowBuilder } from "@/components/visuals/FlowBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPracticeQuestions, getRecommendation } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const modules = [
  {
    title: "Sorting Lab",
    description: "Side-by-side algorithm comparison with timeline replay and benchmark analytics.",
    link: "/sorting",
    testId: "dashboard-module-sorting",
  },
  {
    title: "Graph Lab",
    description: "Traversal, shortest path, MST, and debugger watch windows with state inspection.",
    link: "/graph",
    testId: "dashboard-module-graph",
  },
  {
    title: "Pathfinding Studio",
    description: "Interactive grid simulation for A*, Dijkstra, BFS, DFS, and greedy search.",
    link: "/pathfinding",
    testId: "dashboard-module-pathfinding",
  },
  {
    title: "Maze Generator",
    description: "Recursive Backtracking, Prim and Division algorithms with run recording.",
    link: "/maze",
    testId: "dashboard-module-maze",
  },
];

export default function HomeDashboard() {
  const [question, setQuestion] = useState(null);
  const [inputSize, setInputSize] = useState(120);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const { lastRecommendation, setLastRecommendation } = useAppStore();

  useEffect(() => {
    const loadPractice = async () => {
      try {
        const questions = await getPracticeQuestions();
        if (questions?.length) {
          setQuestion(questions[0]);
        }
      } catch (error) {
        setQuestion(null);
      }
    };
    loadPractice();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Algorithms", value: "35+", icon: Cpu, testId: "dashboard-stat-algorithms" },
      { label: "Visualizer Modules", value: "9", icon: ChartNoAxesCombined, testId: "dashboard-stat-modules" },
      { label: "Learning Modes", value: "2", icon: GraduationCap, testId: "dashboard-stat-modes" },
      { label: "AI Tutor", value: "GPT-5.2", icon: Bot, testId: "dashboard-stat-ai" },
    ],
    [],
  );

  const runRecommendation = async () => {
    try {
      setLoadingRecommendation(true);
      const result = await getRecommendation({
        domain: "sorting",
        input_size: inputSize,
        input_type: "random",
        memory_sensitive: false,
        stability_required: false,
      });
      setLastRecommendation(result);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  return (
    <PageMotionWrapper testId="home-dashboard-page">
      <section
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
        data-testid="dashboard-hero-section"
      >
        <img
          src="https://images.unsplash.com/photo-1734971702046-87ab24ceba47?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMHRlY2hub2xvZ3klMjBuZXR3b3JrJTIwbm9kZXN8ZW58MHx8fHwxNzczNjQ4MzMzfDA&ixlib=rb-4.1.0&q=85"
          alt="Abstract data network"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
          data-testid="dashboard-hero-image"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" aria-hidden />

        <div className="relative z-10 max-w-3xl space-y-4" data-testid="dashboard-hero-content">
          <p className="text-xs uppercase tracking-[0.25em] text-primary" data-testid="dashboard-hero-label">
            The Engineering Standard for Algorithm Mastery
          </p>
          <h2 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" data-testid="dashboard-hero-title">
            Build, Replay, Debug, and Benchmark Algorithms in Real Time.
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base" data-testid="dashboard-hero-description">
            AlgoViz Pro combines professional simulation, timeline recording, AI tutoring, and analytics into one startup-grade
            learning platform.
          </p>
          <div className="flex flex-wrap items-center gap-3" data-testid="dashboard-hero-actions">
            <Button asChild className="rounded-full" data-testid="dashboard-start-sorting-button">
              <Link to="/sorting">
                Launch Sorting Lab <Rocket className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full" data-testid="dashboard-open-pathfinding-button">
              <Link to="/pathfinding">
                Open Pathfinding <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="dashboard-stat-grid">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-border/70 bg-card/70" data-testid={item.testId}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{item.label}</p>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 font-heading text-3xl font-bold" data-testid={`${item.testId}-value`}>
                  {item.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12" data-testid="dashboard-modules-and-builder">
        <div className="space-y-4 lg:col-span-7" data-testid="dashboard-module-cards-column">
          {modules.map((module) => (
            <Card key={module.title} className="border-border/70 bg-card/70" data-testid={module.testId}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <h3 className="font-heading text-xl" data-testid={`${module.testId}-title`}>
                    {module.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground" data-testid={`${module.testId}-description`}>
                    {module.description}
                  </p>
                </div>
                <Button asChild className="rounded-full" variant="secondary" data-testid={`${module.testId}-open-button`}>
                  <Link to={module.link}>Open Module</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4 lg:col-span-5" data-testid="dashboard-builder-column">
          <Card className="border-border/70 bg-card/70" data-testid="dashboard-flow-builder-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="dashboard-flow-builder-title">
                Custom Algorithm Builder (Block Flow)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FlowBuilder />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/70" data-testid="dashboard-practice-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="dashboard-practice-title">
                Practice Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              {question ? (
                <div className="space-y-3" data-testid="dashboard-practice-content">
                  <p className="font-medium" data-testid="dashboard-practice-question">
                    {question.prompt}
                  </p>
                  <ul className="space-y-2">
                    {question.choices.map((choice, idx) => (
                      <li key={choice} className="rounded-lg border border-border/60 px-3 py-2 text-sm" data-testid={`dashboard-practice-choice-${idx}`}>
                        {choice}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="dashboard-practice-empty">
                  Practice questions will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12" data-testid="dashboard-analytics-section">
        <div className="lg:col-span-8">
          <ComplexitySimulator />
        </div>
        <Card className="border-border/70 bg-card/70 lg:col-span-4" data-testid="dashboard-recommendation-card">
          <CardHeader>
            <CardTitle className="font-heading text-base" data-testid="dashboard-recommendation-title">
              Algorithm Recommendation System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="input-size" className="text-xs uppercase tracking-widest text-muted-foreground">
                Input Size
              </label>
              <Input
                id="input-size"
                type="number"
                min={1}
                value={inputSize}
                onChange={(event) => setInputSize(Number(event.target.value || 1))}
                data-testid="dashboard-recommendation-input-size"
              />
            </div>
            <Button
              type="button"
              onClick={runRecommendation}
              className="w-full rounded-full"
              data-testid="dashboard-recommendation-run-button"
              disabled={loadingRecommendation}
            >
              {loadingRecommendation ? "Analyzing..." : "Recommend Best Algorithm"}
            </Button>

            {lastRecommendation ? (
              <div className="rounded-xl border border-border/70 bg-background/70 p-4 text-sm" data-testid="dashboard-recommendation-result">
                <p>
                  <strong>Recommended:</strong> {lastRecommendation.recommendation}
                </p>
                <p className="mt-2 text-muted-foreground">{lastRecommendation.rationale}</p>
                <p className="mt-2 font-code text-xs">
                  Alternatives: {lastRecommendation.alternatives?.join(", ")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="dashboard-recommendation-placeholder">
                Example: Quick Sort performs better for large random datasets.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </PageMotionWrapper>
  );
}
