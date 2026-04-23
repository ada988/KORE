"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "auto";
export type FontFamily = "heebo" | "frank" | "assistant" | "rubik";

type AppState = {
  theme: Theme;
  fontFamily: FontFamily;
  readingSize: number;
  dailyGoalMinutes: number;
  onboarded: boolean;

  setTheme: (t: Theme) => void;
  setFontFamily: (f: FontFamily) => void;
  setReadingSize: (s: number) => void;
  setDailyGoalMinutes: (m: number) => void;
  completeOnboarding: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "auto",
      fontFamily: "heebo",
      readingSize: 22,
      dailyGoalMinutes: 20,
      onboarded: false,

      setTheme: (theme) => set({ theme }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setReadingSize: (s) => set({ readingSize: Math.min(32, Math.max(16, s)) }),
      setDailyGoalMinutes: (m) => set({ dailyGoalMinutes: Math.min(120, Math.max(5, m)) }),
      completeOnboarding: () => set({ onboarded: true }),
    }),
    { name: "kore-app-prefs" }
  )
);
