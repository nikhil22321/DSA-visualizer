import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { dashboardModules, routeModuleMap } from "@/data/dashboardConfig";

const ACTIVITY_LIMIT = 8;

const buildModuleProgress = () =>
  dashboardModules.reduce((accumulator, module) => {
    accumulator[module.key] = {
      title: module.title,
      route: module.route,
      category: module.category,
      description: module.description,
      lessonsCompleted: module.lessonsCompleted,
      lessonsTotal: module.lessonsTotal,
      progress: module.progress,
      minutesSpent: module.minutesSpent,
      lastVisitedAt: null,
    };
    return accumulator;
  }, {});

const buildInitialRecentActivity = () => {
  const now = Date.now();
  return [
    {
      id: "activity-quick-sort",
      type: "algorithm",
      title: "Ran Quick Sort",
      description: "Benchmarked a sorting session with replay controls.",
      moduleKey: "sorting",
      route: "/sorting",
      occurredAt: new Date(now - 18 * 60 * 1000).toISOString(),
    },
    {
      id: "activity-bfs",
      type: "completion",
      title: "Completed BFS",
      description: "Wrapped a graph traversal walkthrough in Graph Lab.",
      moduleKey: "graph",
      route: "/graph",
      occurredAt: new Date(now - 62 * 60 * 1000).toISOString(),
    },
    {
      id: "activity-maze",
      type: "generation",
      title: "Generated Maze",
      description: "Created a new recursive maze for pathfinding experiments.",
      moduleKey: "maze",
      route: "/maze",
      occurredAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "activity-linked-list",
      type: "practice",
      title: "Reversed Linked List",
      description: "Reviewed pointer updates and node traversal states.",
      moduleKey: "linked-list",
      route: "/linked-list",
      occurredAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

const defaultLastOpenedModule = {
  key: "pathfinding",
  title: "Pathfinding Studio",
  route: "/pathfinding",
  description: "Continue the grid-search session and inspect debugger state.",
  lastVisitedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
};

const pushActivity = (recentActivity, activity) => [activity, ...recentActivity.filter((item) => item.id !== activity.id)].slice(0, ACTIVITY_LIMIT);

export const useAppStore = create(
  persist(
    (set) => ({
      mode: "learning",
      globalSpeed: 500,
      shortcutsEnabled: true,
      lastRecommendation: null,
      accentTheme: "blue",
      moduleProgress: buildModuleProgress(),
      lastOpenedModule: defaultLastOpenedModule,
      recentActivity: buildInitialRecentActivity(),
      learnerProfile: {
        algorithmsPracticed: 29,
        practiceSessions: 58,
        successRate: 91,
        streakDays: 12,
      },
      setMode: (mode) => set({ mode }),
      setGlobalSpeed: (globalSpeed) => set({ globalSpeed }),
      setShortcutsEnabled: (shortcutsEnabled) => set({ shortcutsEnabled }),
      setLastRecommendation: (lastRecommendation) => set({ lastRecommendation }),
      setAccentTheme: (accentTheme) => set({ accentTheme }),
      logActivity: ({
        type = "practice",
        title,
        description,
        moduleKey,
        route,
        minutesDelta = 0,
        progressDelta = 0,
        sessionDelta = 1,
        algorithmsDelta = 0,
        successRate,
      }) =>
        set((state) => {
          const existingModule = moduleKey ? state.moduleProgress[moduleKey] : null;
          const nextModuleProgress = moduleKey && existingModule
            ? {
                ...state.moduleProgress,
                [moduleKey]: {
                  ...existingModule,
                  progress: Math.min(100, existingModule.progress + progressDelta),
                  minutesSpent: existingModule.minutesSpent + minutesDelta,
                  lastVisitedAt: new Date().toISOString(),
                },
              }
            : state.moduleProgress;

          return {
            moduleProgress: nextModuleProgress,
            recentActivity: pushActivity(state.recentActivity, {
              id: `${moduleKey || "dashboard"}-${Date.now()}`,
              type,
              title,
              description,
              moduleKey,
              route: route || existingModule?.route || "/",
              occurredAt: new Date().toISOString(),
            }),
            learnerProfile: {
              ...state.learnerProfile,
              practiceSessions: state.learnerProfile.practiceSessions + sessionDelta,
              algorithmsPracticed: state.learnerProfile.algorithmsPracticed + algorithmsDelta,
              successRate: successRate ?? state.learnerProfile.successRate,
            },
            lastOpenedModule:
              existingModule && route
                ? {
                    key: moduleKey,
                    title: existingModule.title,
                    route,
                    description: existingModule.description,
                    lastVisitedAt: new Date().toISOString(),
                  }
                : state.lastOpenedModule,
          };
        }),
      recordModuleVisit: (pathname) =>
        set((state) => {
          const matchedModule = routeModuleMap[pathname];
          if (!matchedModule) {
            return {};
          }

          const previousVisit = state.moduleProgress[matchedModule.key]?.lastVisitedAt;
          const now = new Date().toISOString();
          const nextModuleProgress = {
            ...state.moduleProgress,
            [matchedModule.key]: {
              ...state.moduleProgress[matchedModule.key],
              lastVisitedAt: now,
              minutesSpent: state.moduleProgress[matchedModule.key].minutesSpent + 3,
            },
          };

          const shouldLogVisit = !previousVisit || Date.now() - new Date(previousVisit).getTime() > 5 * 60 * 1000;

          return {
            moduleProgress: nextModuleProgress,
            lastOpenedModule: {
              key: matchedModule.key,
              title: matchedModule.title,
              route: matchedModule.route,
              description: matchedModule.description,
              lastVisitedAt: now,
            },
            recentActivity: shouldLogVisit
              ? pushActivity(state.recentActivity, {
                  id: `visit-${matchedModule.key}-${Date.now()}`,
                  type: "module",
                  title: `Opened ${matchedModule.title}`,
                  description: `Resumed ${matchedModule.shortLabel.toLowerCase()} and workspace controls.`,
                  moduleKey: matchedModule.key,
                  route: matchedModule.route,
                  occurredAt: now,
                })
              : state.recentActivity,
          };
        }),
      getModuleByRoute: (pathname) => routeModuleMap[pathname] || null,
    }),
    {
      name: "algoviz-dashboard-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        globalSpeed: state.globalSpeed,
        shortcutsEnabled: state.shortcutsEnabled,
        lastRecommendation: state.lastRecommendation,
        accentTheme: state.accentTheme,
        moduleProgress: state.moduleProgress,
        lastOpenedModule: state.lastOpenedModule,
        recentActivity: state.recentActivity,
        learnerProfile: state.learnerProfile,
      }),
    },
  ),
);
