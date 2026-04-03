import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopControlBar } from "@/components/layout/TopControlBar";
import { useAppStore } from "@/store/useAppStore";

export const AppLayout = () => {
  const location = useLocation();
  const recordModuleVisit = useAppStore((state) => state.recordModuleVisit);
  const accentTheme = useAppStore((state) => state.accentTheme);

  useEffect(() => {
    recordModuleVisit(location.pathname);
  }, [location.pathname, recordModuleVisit]);

  useEffect(() => {
    document.documentElement.dataset.accent = accentTheme;
  }, [accentTheme]);

  return (
    <div className="min-h-screen bg-background" data-testid="app-layout-root">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-96 w-96 rounded-full bg-chart-2/20 blur-3xl" />
        <div className="dashboard-orbit absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="flex min-h-screen">
        <SidebarNav />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col" data-testid="content-column">
          <TopControlBar />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 lg:px-8" data-testid="page-main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
