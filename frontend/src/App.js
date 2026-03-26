import "@/App.css";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import GraphPage from "@/pages/GraphPage";
import HomeDashboard from "@/pages/HomeDashboard";
import MazePage from "@/pages/MazePage";
import PathfindingPage from "@/pages/PathfindingPage";
import ScaffoldPage from "@/pages/ScaffoldPage";
import SortingPage from "@/pages/SortingPage";

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
            <Route path="tree" element={<ScaffoldPage type="tree" />} />
            <Route path="linked-list" element={<ScaffoldPage type="linked-list" />} />
            <Route path="stack" element={<ScaffoldPage type="stack" />} />
            <Route path="queue" element={<ScaffoldPage type="queue" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}

export default App;
