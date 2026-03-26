import { create } from "zustand";

export const useAppStore = create((set) => ({
  mode: "learning",
  globalSpeed: 500,
  shortcutsEnabled: true,
  lastRecommendation: null,
  setMode: (mode) => set({ mode }),
  setGlobalSpeed: (globalSpeed) => set({ globalSpeed }),
  setShortcutsEnabled: (shortcutsEnabled) => set({ shortcutsEnabled }),
  setLastRecommendation: (lastRecommendation) => set({ lastRecommendation }),
}));
