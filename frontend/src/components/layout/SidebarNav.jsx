import { NavLink } from "react-router-dom";
import {
  Binary,
  CircleDashed,
  Compass,
  Container,
  GitBranch,
  Home,
  List,
  Network,
  Route,
  Scan,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home, testId: "nav-dashboard-link" },
  { to: "/sorting", label: "Sorting", icon: Scan, testId: "nav-sorting-link" },
  { to: "/graph", label: "Graph", icon: Network, testId: "nav-graph-link" },
  { to: "/pathfinding", label: "Pathfinding", icon: Route, testId: "nav-pathfinding-link" },
  { to: "/maze", label: "Maze", icon: Compass, testId: "nav-maze-link" },
  { to: "/tree", label: "Tree", icon: GitBranch, testId: "nav-tree-link" },
  { to: "/linked-list", label: "Linked List", icon: List, testId: "nav-linked-list-link" },
  { to: "/stack", label: "Stack", icon: Container, testId: "nav-stack-link" },
  { to: "/queue", label: "Queue", icon: CircleDashed, testId: "nav-queue-link" },
];

export const SidebarNav = () => (
  <aside
    className="sticky top-0 hidden h-screen w-72 flex-col border-r border-border/60 bg-card/70 backdrop-blur-xl lg:flex"
    data-testid="sidebar-navigation"
  >
    <div className="border-b border-border/60 p-6" data-testid="brand-section">
      <p className="font-heading text-sm uppercase tracking-[0.2em] text-primary" data-testid="brand-label">
        AlgoViz Pro
      </p>
      <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight" data-testid="brand-title">
        Algorithm Mastery Workspace
      </h1>
      <p className="mt-2 text-sm text-muted-foreground" data-testid="brand-subtitle">
        Startup-grade visual simulator suite
      </p>
    </div>

    <nav className="flex-1 space-y-2 p-4" data-testid="sidebar-link-list">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.testId}
            className={({ isActive }) =>
              [
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>

    <div className="border-t border-border/60 p-4" data-testid="sidebar-footer-shortcuts">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Shortcuts</p>
      <p className="mt-2 text-xs text-foreground" data-testid="shortcut-play-pause">Space: Play/Pause</p>
      <p className="text-xs text-foreground" data-testid="shortcut-step-forward">→: Step Forward</p>
      <p className="text-xs text-foreground" data-testid="shortcut-step-back">←: Step Back</p>
      <p className="mt-3 inline-flex items-center gap-2 rounded border border-primary/40 px-2 py-1 font-code text-xs text-primary" data-testid="zustand-indicator">
        <Binary className="h-3 w-3" /> Zustand State Active
      </p>
    </div>
  </aside>
);
