import "@/App.css";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import GraphPage from "@/pages/GraphPage";
import HomeDashboard from "@/pages/HomeDashboard";
import LinkedListPage from "@/pages/LinkedListPage";
import MazePage from "@/pages/MazePage";
import PathfindingPage from "@/pages/PathfindingPage";
import SortingPage from "@/pages/SortingPage";
import StackQueueModulePage from "@/pages/StackQueueModulePage";
import TreeModulePage from "@/pages/TreeModulePage";

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      storageKey="algoviz-theme"
      themes={["light", "dark", "hacker"]}
      enableSystem={false}
      disableTransitionOnChange
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomeDashboard />} />
            <Route path="sorting" element={<SortingPage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="pathfinding" element={<PathfindingPage />} />
            <Route path="maze" element={<MazePage />} />
            <Route path="tree" element={<TreeModulePage />} />
            <Route path="linked-list" element={<LinkedListPage />} />
            <Route path="stack" element={<StackQueueModulePage initialMode="stack" pageTestId="stack-page" />} />
            <Route path="queue" element={<StackQueueModulePage initialMode="queue" pageTestId="queue-page" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}

export default App;
