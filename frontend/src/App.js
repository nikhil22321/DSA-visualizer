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
import QueuePage from "@/pages/QueuePage";
import SortingPage from "@/pages/SortingPage";
import StackPage from "@/pages/StackPage";
import TreePage from "@/pages/TreePage";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" themes={["light", "dark", "hacker"]} enableSystem={false}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomeDashboard />} />
            <Route path="sorting" element={<SortingPage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="pathfinding" element={<PathfindingPage />} />
            <Route path="maze" element={<MazePage />} />
            <Route path="tree" element={<TreePage />} />
            <Route path="linked-list" element={<LinkedListPage />} />
            <Route path="stack" element={<StackPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}

export default App;
