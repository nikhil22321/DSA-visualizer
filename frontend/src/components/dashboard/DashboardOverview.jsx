import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  Compass,
  Cpu,
  Flame,
  GitBranch,
  Layers3,
  LayoutGrid,
  ListChecks,
  Network,
  PlayCircle,
  Rocket,
  Sparkles,
  TimerReset,
  Trophy,
  Waypoints,
} from "lucide-react";

import { ComplexitySimulator } from "@/components/analytics/ComplexitySimulator";
import { FlowBuilder } from "@/components/visuals/FlowBuilder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { algorithmCatalog, dashboardModules, dashboardQuickActions } from "@/data/dashboardConfig";
import { getPracticeQuestions, getRecommendation } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const sectionTransition = { duration: 0.4, ease: "easeOut" };

const activityIconMap = {
  module: LayoutGrid,
  algorithm: Cpu,
  completion: CheckCircle2,
  generation: Sparkles,
  practice: BrainCircuit,
};

const moduleIconMap = {
  sorting: ChartNoAxesCombined,
  graph: Network,
  pathfinding: Waypoints,
  maze: Compass,
  tree: GitBranch,
  "linked-list": ListChecks,
  stack: Layers3,
  queue: TimerReset,
};

const performanceTrendData = [
  { size: 100, quick: 7, merge: 9, heap: 12, practice: 74 },
  { size: 250, quick: 14, merge: 16, heap: 20, practice: 78 },
  { size: 500, quick: 24, merge: 28, heap: 35, practice: 83 },
  { size: 1000, quick: 39, merge: 45, heap: 58, practice: 88 },
  { size: 2000, quick: 62, merge: 70, heap: 86, practice: 92 },
];

const algorithmComparisonData = [
  { label: "Quick Sort", execution: 92, memory: 68, stability: 40 },
  { label: "Merge Sort", execution: 86, memory: 52, stability: 92 },
  { label: "Heap Sort", execution: 74, memory: 79, stability: 35 },
  { label: "BFS", execution: 81, memory: 71, stability: 88 },
  { label: "A*", execution: 89, memory: 65, stability: 84 },
];

const heroCardStats = [
  { label: "Benchmark Replays", value: "Live", icon: PlayCircle },
  { label: "Weekly Streak", value: "12 days", icon: Flame },
  { label: "Guided Explanations", value: "Always On", icon: BookOpen },
];

const formatHours = (minutes) => `${(minutes / 60).toFixed(minutes >= 600 ? 0 : 1)}h`;

const getAchievementCards = (modulesCompleted, practiceSessions, graphProgress) => [
  {
    title: "Completed Sorting Module",
    description: "Finished the flagship sorting curriculum with benchmark replay and comparison mode.",
    unlocked: modulesCompleted >= 1,
    icon: Trophy,
  },
  {
    title: "Ran 50+ Simulations",
    description: "Built consistent reps across labs, debugger views, and guided playbacks.",
    unlocked: practiceSessions >= 50,
    icon: Award,
  },
  {
    title: "Mastered Graph Algorithms",
    description: "Reached advanced traversal confidence with graph exploration and path analysis.",
    unlocked: graphProgress >= 70,
    icon: BrainCircuit,
  },
];

export function DashboardOverview() {
  const [question, setQuestion] = useState(null);
  const [inputSize, setInputSize] = useState(120);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const {
    lastRecommendation,
    setLastRecommendation,
    moduleProgress,
    recentActivity,
    lastOpenedModule,
    learnerProfile,
    logActivity,
  } = useAppStore();

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

  const algorithmsCount = useMemo(
    () => Object.values(algorithmCatalog).reduce((total, count) => total + count, 0),
    [],
  );

  const enrichedModules = useMemo(
    () =>
      dashboardModules.map((module) => ({
        ...module,
        ...(moduleProgress[module.key] || {}),
      })),
    [moduleProgress],
  );

  const modulesCompleted = useMemo(
    () => enrichedModules.filter((module) => module.progress >= 100).length,
    [enrichedModules],
  );

  const totalMinutesLearned = useMemo(
    () => enrichedModules.reduce((total, module) => total + (module.minutesSpent || 0), 0),
    [enrichedModules],
  );

  const learningProgress = useMemo(() => {
    if (!enrichedModules.length) return 0;
    const average = enrichedModules.reduce((total, module) => total + module.progress, 0) / enrichedModules.length;
    return Math.round(average);
  }, [enrichedModules]);

  const stats = useMemo(
    () => [
      {
        label: "Algorithms Practiced",
        value: learnerProfile.algorithmsPracticed,
        detail: `Across ${algorithmsCount}+ supported paths`,
        trend: "+6 this week",
        icon: Cpu,
        testId: "dashboard-stat-algorithms-practiced",
      },
      {
        label: "Modules Completed",
        value: `${modulesCompleted}/${dashboardModules.length}`,
        detail: `${learningProgress}% average module progress`,
        trend: `${modulesCompleted} mastered`,
        icon: CheckCircle2,
        testId: "dashboard-stat-modules-completed",
      },
      {
        label: "Time Spent Learning",
        value: formatHours(totalMinutesLearned),
        detail: `${learnerProfile.practiceSessions} simulation sessions`,
        trend: "+3.4h this week",
        icon: Clock3,
        testId: "dashboard-stat-learning-time",
      },
      {
        label: "Accuracy / Success Rate",
        value: `${learnerProfile.successRate}%`,
        detail: "Challenge completion quality score",
        trend: "Up 4%",
        icon: Rocket,
        testId: "dashboard-stat-success-rate",
      },
    ],
    [algorithmsCount, learnerProfile.algorithmsPracticed, learnerProfile.practiceSessions, learnerProfile.successRate, learningProgress, modulesCompleted, totalMinutesLearned],
  );

  const continueLearningModules = useMemo(
    () =>
      [...enrichedModules]
        .filter((module) => module.progress < 100)
        .sort((left, right) => {
          const leftTime = left.lastVisitedAt ? new Date(left.lastVisitedAt).getTime() : 0;
          const rightTime = right.lastVisitedAt ? new Date(right.lastVisitedAt).getTime() : 0;
          return rightTime - leftTime || right.progress - left.progress;
        })
        .slice(0, 2),
    [enrichedModules],
  );

  const achievements = useMemo(
    () => getAchievementCards(modulesCompleted, learnerProfile.practiceSessions, moduleProgress.graph?.progress || 0),
    [learnerProfile.practiceSessions, moduleProgress.graph?.progress, modulesCompleted],
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

  const scrollToModules = () => {
    document.getElementById("dashboard-modules-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const recordDashboardAction = (action) => {
    logActivity({
      type: "practice",
      title: action.activityTitle,
      description: action.activityDescription,
      moduleKey: action.moduleKey,
      route: action.route,
      minutesDelta: 6,
      progressDelta: 2,
      sessionDelta: 1,
      algorithmsDelta: action.id === "practice-mode" ? 1 : 0,
    });
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={sectionTransition}
        className="relative overflow-hidden rounded-[2rem] dashboard-panel p-8 sm:p-10"
        data-testid="dashboard-hero-section"
      >
        <div className="dashboard-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="dashboard-pulse absolute -left-20 top-8 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="dashboard-orbit absolute right-6 top-8 h-64 w-64 rounded-full bg-chart-2/20 blur-3xl" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_42%),radial-gradient(circle_at_80%_20%,hsl(var(--chart-2)/0.16),transparent_36%),linear-gradient(135deg,hsl(var(--background)/0.92),hsl(var(--background)/0.72))]" aria-hidden />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_0.8fr] lg:items-end" data-testid="dashboard-hero-content">
          <div className="space-y-6">
            <Badge className="rounded-full border-primary/30 bg-primary/10 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-primary shadow-none">
              Product Analytics Workspace
            </Badge>
            <div className="space-y-4">
              <h2 className="max-w-4xl font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" data-testid="dashboard-hero-title">
                Learn algorithms through a dashboard that feels like a real developer product.
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base" data-testid="dashboard-hero-description">
                AlgoViz Pro now surfaces progress, recent actions, continuation flows, and comparative performance insights so your
                practice feels structured, measurable, and polished.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3" data-testid="dashboard-hero-highlight-stats">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Algorithms</p>
                <p className="mt-2 font-heading text-3xl">{algorithmsCount}+</p>
                <p className="mt-1 text-xs text-muted-foreground">Coverage across sorting, graphs, pathfinding, and core data structures.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Modules</p>
                <p className="mt-2 font-heading text-3xl">{dashboardModules.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Dedicated labs for simulation, debugging, and structural mastery.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Learning Progress</p>
                <p className="mt-2 font-heading text-3xl">{learningProgress}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Average progress across your active curriculum.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3" data-testid="dashboard-hero-actions">
              <Button asChild className="rounded-full px-6" data-testid="dashboard-start-learning-button">
                <Link
                  to={lastOpenedModule?.route || "/sorting"}
                  onClick={() =>
                    logActivity({
                      type: "practice",
                      title: "Started Learning",
                      description: "Resumed the last active module from the hero CTA.",
                      moduleKey: lastOpenedModule?.key || "sorting",
                      route: lastOpenedModule?.route || "/sorting",
                      minutesDelta: 8,
                      progressDelta: 2,
                      sessionDelta: 1,
                    })
                  }
                >
                  Start Learning <Rocket className="h-4 w-4" />
                </Link>
              </Button>
              <Button type="button" variant="outline" className="rounded-full px-6" onClick={scrollToModules} data-testid="dashboard-explore-modules-button">
                Explore Modules <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-background/80 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspace Overview</p>
                <p className="mt-2 font-heading text-2xl">Momentum Snapshot</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <BrainCircuit className="h-5 w-5" />
              </div>
            </div>
            {heroCardStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">Built for guided and expert workflows</p>
                    </div>
                  </div>
                  <p className="font-code text-xs uppercase tracking-[0.2em] text-primary">{item.value}</p>
                </div>
              );
            })}
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Average Module Progress</p>
                <p className="font-heading text-2xl">{learningProgress}%</p>
              </div>
              <Progress value={learningProgress} className="mt-3 h-2.5" />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={sectionTransition}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        data-testid="dashboard-stat-grid"
      >
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="dashboard-panel dashboard-card-hover rounded-3xl" data-testid={item.testId}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 font-heading text-3xl font-bold" data-testid={`${item.testId}-value`}>
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Trend</span>
                  <span className="text-sm font-semibold text-primary">{item.trend}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.section>

      <motion.section
        id="dashboard-modules-section"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={sectionTransition}
        className="space-y-4"
        data-testid="dashboard-modules-section"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Modules</p>
            <h3 className="mt-2 font-heading text-3xl">Structured labs for every major DSA workflow</h3>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Each module now carries progress visibility, short descriptions, and clearer entry points so the dashboard works like a real
            learning control center.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" data-testid="dashboard-module-cards-column">
          {enrichedModules.map((module) => {
            const Icon = moduleIconMap[module.key] || LayoutGrid;
            return (
              <Card key={module.key} className="dashboard-panel dashboard-card-hover rounded-[1.75rem]" data-testid={`dashboard-module-${module.key}`}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-heading text-2xl">{module.title}</h4>
                          <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">
                            {module.category}
                          </Badge>
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                    <Button asChild variant="secondary" className="rounded-full">
                      <Link
                        to={module.route}
                        onClick={() =>
                          logActivity({
                            type: "module",
                            title: `Resumed ${module.title}`,
                            description: `Jumped back into ${module.shortLabel.toLowerCase()}.`,
                            moduleKey: module.key,
                            route: module.route,
                            minutesDelta: 5,
                            progressDelta: 1,
                            sessionDelta: 1,
                          })
                        }
                      >
                        Open Module
                      </Link>
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Progress</p>
                        <p className="text-sm font-semibold">{module.progress}%</p>
                      </div>
                      <Progress value={module.progress} className="mt-3 h-2.5" />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span>{module.lessonsCompleted}/{module.lessonsTotal} lessons complete</span>
                        <span>{module.minutesSpent} mins logged</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Focus</p>
                      <p className="mt-3 text-sm font-medium">{module.shortLabel}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {module.lastVisitedAt
                          ? `Last opened ${formatDistanceToNow(new Date(module.lastVisitedAt), { addSuffix: true })}`
                          : "Ready for a fresh session"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={sectionTransition}
        className="grid grid-cols-1 gap-5 lg:grid-cols-12"
        data-testid="dashboard-analytics-section"
      >
        <Card className="dashboard-panel rounded-[1.75rem] lg:col-span-8">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-primary">Performance Analytics</p>
                <CardTitle className="mt-2 font-heading text-3xl">Interactive benchmark insights</CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Compare execution time against input size and review multi-algorithm strengths through a dashboard-native chart system.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Success Lift</p>
                <p className="mt-2 font-heading text-2xl">{learnerProfile.successRate}%</p>
                <p className="text-xs text-muted-foreground">Practice mode performance score</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="execution" className="space-y-5">
              <TabsList className="rounded-full bg-background/70 p-1">
                <TabsTrigger value="execution" className="rounded-full">Execution Time vs Input Size</TabsTrigger>
                <TabsTrigger value="comparison" className="rounded-full">Algorithm Comparison</TabsTrigger>
              </TabsList>

              <TabsContent value="execution" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fastest Curve</p>
                    <p className="mt-2 text-lg font-semibold">Quick Sort</p>
                    <p className="mt-1 text-sm text-muted-foreground">Best overall responsiveness on larger random datasets.</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stable Baseline</p>
                    <p className="mt-2 text-lg font-semibold">Merge Sort</p>
                    <p className="mt-1 text-sm text-muted-foreground">Consistent scaling with clearer predictability.</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Practice Confidence</p>
                    <p className="mt-2 text-lg font-semibold">+18 pts</p>
                    <p className="mt-1 text-sm text-muted-foreground">Learner confidence rises as input size complexity increases.</p>
                  </div>
                </div>

                <div className="h-[340px] w-full rounded-[1.5rem] border border-border/60 bg-background/70 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceTrendData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="quickGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.38} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="mergeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="size" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="time" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="practice" orientation="right" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "1rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background) / 0.96)",
                        }}
                      />
                      <Legend />
                      <Area yAxisId="time" type="monotone" dataKey="quick" name="Quick Sort (ms)" stroke="hsl(var(--chart-1))" fill="url(#quickGradient)" strokeWidth={2.4} />
                      <Area yAxisId="time" type="monotone" dataKey="merge" name="Merge Sort (ms)" stroke="hsl(var(--chart-2))" fill="url(#mergeGradient)" strokeWidth={2.2} />
                      <Area yAxisId="time" type="monotone" dataKey="heap" name="Heap Sort (ms)" stroke="hsl(var(--chart-3))" fillOpacity={0} strokeWidth={2} />
                      <Area yAxisId="practice" type="monotone" dataKey="practice" name="Confidence Score" stroke="hsl(var(--chart-4))" fillOpacity={0} strokeDasharray="6 5" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="comparison" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                  Normalized comparison across runtime feel, memory usage, and reliability for common study scenarios.
                </div>
                <div className="h-[340px] w-full rounded-[1.5rem] border border-border/60 bg-background/70 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={algorithmComparisonData} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "1rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background) / 0.96)",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="execution" name="Execution" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="memory" name="Memory Efficiency" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="stability" name="Reliability" fill="hsl(var(--chart-4))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-5 lg:col-span-4">
          <ComplexitySimulator />

          <Card className="dashboard-panel rounded-[1.75rem]" data-testid="dashboard-recommendation-card">
            <CardHeader>
              <CardTitle className="font-heading text-2xl" data-testid="dashboard-recommendation-title">
                Algorithm Recommendation System
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tune the input size and compare recommendation guidance against your benchmark intuition.
              </p>
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
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm" data-testid="dashboard-recommendation-result">
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
                  Example: Quick Sort performs better for large random datasets with low memory sensitivity.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={sectionTransition}
        className="space-y-4"
        data-testid="dashboard-achievements-section"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Achievements</p>
            <h3 className="mt-2 font-heading text-3xl">Milestones worth surfacing</h3>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Badge-style achievement cards make the experience feel more like a real learning platform instead of a static landing page.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;
            return (
              <Card key={achievement.title} className="dashboard-panel dashboard-card-hover rounded-[1.75rem]">
                <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge
                      variant={achievement.unlocked ? "default" : "outline"}
                      className={achievement.unlocked ? "rounded-full" : "rounded-full border-border/70 bg-background/70"}
                    >
                      {achievement.unlocked ? "Unlocked" : "In Progress"}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-heading text-2xl">{achievement.title}</h4>
                    <p className="mt-2 text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={sectionTransition}
        className="grid grid-cols-1 gap-5 xl:grid-cols-12"
        data-testid="dashboard-activity-practice-section"
      >
        <Card className="dashboard-panel rounded-[1.75rem] xl:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-primary">Recent Activity</p>
                <CardTitle className="mt-2 font-heading text-2xl">Your latest actions</CardTitle>
              </div>
              <Badge variant="outline" className="rounded-full border-border/70 bg-background/70">
                {recentActivity.length} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity) => {
              const Icon = activityIconMap[activity.type] || LayoutGrid;
              return (
                <div key={activity.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{activity.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-5 xl:col-span-4">
          <Card className="dashboard-panel rounded-[1.75rem]" data-testid="dashboard-continue-learning-card">
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.22em] text-primary">Continue Learning</p>
              <CardTitle className="font-heading text-2xl">Resume where you left off</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Last Opened Module</p>
                <h4 className="mt-2 font-heading text-2xl">{lastOpenedModule?.title || "Sorting Lab"}</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  {lastOpenedModule?.description || "Continue benchmark replay and algorithm walkthroughs."}
                </p>
                <Button asChild className="mt-4 rounded-full">
                  <Link
                    to={lastOpenedModule?.route || "/sorting"}
                    onClick={() =>
                      logActivity({
                        type: "practice",
                        title: `Resumed ${lastOpenedModule?.title || "Sorting Lab"}`,
                        description: "Picked up an in-progress learning path from Continue Learning.",
                        moduleKey: lastOpenedModule?.key || "sorting",
                        route: lastOpenedModule?.route || "/sorting",
                        minutesDelta: 10,
                        progressDelta: 3,
                        sessionDelta: 1,
                      })
                    }
                  >
                    Resume Module <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="space-y-3">
                {continueLearningModules.map((module) => (
                  <div key={module.key} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                    <div>
                      <p className="font-medium">{module.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{module.progress}% complete</p>
                    </div>
                    <Button asChild variant="outline" className="rounded-full">
                      <Link
                        to={module.route}
                        onClick={() =>
                          logActivity({
                            type: "practice",
                            title: `Continued ${module.title}`,
                            description: `Returned to ${module.shortLabel.toLowerCase()} from dashboard recommendations.`,
                            moduleKey: module.key,
                            route: module.route,
                            minutesDelta: 7,
                            progressDelta: 2,
                            sessionDelta: 1,
                          })
                        }
                      >
                        Resume
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-panel rounded-[1.75rem]" data-testid="dashboard-quick-actions-card">
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.22em] text-primary">Quick Actions</p>
              <CardTitle className="font-heading text-2xl">Jump into a workflow instantly</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dashboardQuickActions.map((action) => (
                <Button key={action.id} asChild variant="outline" className="h-auto justify-start rounded-2xl px-4 py-4 text-left">
                  <Link to={action.route} onClick={() => recordDashboardAction(action)}>
                    <div>
                      <p className="text-sm font-semibold">{action.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 xl:col-span-4">
          <Card className="dashboard-panel rounded-[1.75rem]" data-testid="dashboard-flow-builder-card">
            <CardHeader>
              <CardTitle className="font-heading text-2xl" data-testid="dashboard-flow-builder-title">
                Custom Algorithm Builder
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Keep the existing block-flow builder, now framed as a premium sandbox for experimentation.
              </p>
            </CardHeader>
            <CardContent>
              <FlowBuilder />
            </CardContent>
          </Card>

          <Card className="dashboard-panel rounded-[1.75rem]" data-testid="dashboard-practice-card">
            <CardHeader>
              <CardTitle className="font-heading text-2xl" data-testid="dashboard-practice-title">
                Practice Mode
              </CardTitle>
              <p className="text-sm text-muted-foreground">Targeted challenge prompts with guided decision-making.</p>
            </CardHeader>
            <CardContent>
              {question ? (
                <div className="space-y-3" data-testid="dashboard-practice-content">
                  <p className="font-medium" data-testid="dashboard-practice-question">
                    {question.prompt}
                  </p>
                  <ul className="space-y-2">
                    {question.choices.map((choice, idx) => (
                      <li
                        key={choice}
                        className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-sm transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
                        data-testid={`dashboard-practice-choice-${idx}`}
                      >
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
      </motion.section>
    </>
  );
}
