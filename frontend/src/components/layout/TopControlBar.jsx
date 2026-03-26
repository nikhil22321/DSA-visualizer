import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Bell, Brain, Gauge, MoonStar, SunMedium, TerminalSquare } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/useAppStore";

const themeButtons = [
  { value: "light", label: "Light", icon: SunMedium, testId: "theme-light-button" },
  { value: "dark", label: "Dark", icon: MoonStar, testId: "theme-dark-button" },
  { value: "hacker", label: "Hacker", icon: TerminalSquare, testId: "theme-hacker-button" },
];

export const TopControlBar = () => {
  const { theme, setTheme } = useTheme();
  const { mode, setMode, globalSpeed, setGlobalSpeed, shortcutsEnabled, setShortcutsEnabled } = useAppStore();

  useEffect(() => {
    if (!theme) setTheme("dark");
  }, [setTheme, theme]);

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl"
      data-testid="top-control-bar"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex items-center gap-2" data-testid="theme-toggle-group">
          {themeButtons.map((option) => {
            const Icon = option.icon;
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                data-testid={option.testId}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors duration-200",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card/60 hover:bg-accent",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" /> {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4" data-testid="global-mode-controls">
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-2" data-testid="learning-expert-toggle">
            <Brain className="h-4 w-4 text-primary" />
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs transition-colors duration-200 ${mode === "learning" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              onClick={() => setMode("learning")}
              data-testid="learning-mode-button"
            >
              Learning
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs transition-colors duration-200 ${mode === "expert" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              onClick={() => setMode("expert")}
              data-testid="expert-mode-button"
            >
              Expert
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-2" data-testid="global-speed-control">
            <Gauge className="h-4 w-4 text-primary" />
            <label htmlFor="global-speed-range" className="text-xs font-semibold">
              Speed
            </label>
            <input
              id="global-speed-range"
              type="range"
              min="120"
              max="1200"
              step="20"
              value={globalSpeed}
              onChange={(event) => setGlobalSpeed(Number(event.target.value))}
              className="w-24"
              data-testid="global-speed-range-input"
            />
            <span className="font-code text-xs text-muted-foreground" data-testid="global-speed-value">
              {globalSpeed}ms
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-2" data-testid="shortcut-switch-control">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Shortcuts</span>
            <Switch
              checked={shortcutsEnabled}
              onCheckedChange={setShortcutsEnabled}
              data-testid="shortcuts-enabled-switch"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
