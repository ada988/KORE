"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "auto";
export type FontFamily = "heebo" | "frank" | "assistant" | "rubik";
export type ReaderAmbience = "default" | "sepia" | "high-contrast";
export type UILanguage = "he" | "en";

type AppState = {
  theme: Theme;
  fontFamily: FontFamily;
  readingSize: number;
  letterSpacing: number;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  onboarded: boolean;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  ambience: ReaderAmbience;
  uiLanguage: UILanguage;
  analyticsOptOut: boolean;
  reminderEnabled: boolean;
  reminderHour: number;
  /** Anthropic API key (optional, used for client-side quiz/Nakdan calls) */
  anthropicKey: string;
  /** Mind-wandering probes during paginated reading */
  mindWanderProbes: boolean;
  /** Baseline WPM from onboarding calibration */
  baselineWpm: number | null;

  setTheme: (t: Theme) => void;
  setFontFamily: (f: FontFamily) => void;
  setReadingSize: (s: number) => void;
  setLetterSpacing: (s: number) => void;
  setDailyGoalMinutes: (m: number) => void;
  setWeeklyGoalMinutes: (m: number) => void;
  completeOnboarding: () => void;
  setHapticsEnabled: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setAmbience: (a: ReaderAmbience) => void;
  setUILanguage: (l: UILanguage) => void;
  setAnalyticsOptOut: (v: boolean) => void;
  setReminderEnabled: (v: boolean) => void;
  setReminderHour: (h: number) => void;
  setAnthropicKey: (k: string) => void;
  setMindWanderProbes: (v: boolean) => void;
  setBaselineWpm: (n: number | null) => void;
  resetAll: () => void;
};

const DEFAULTS = {
  theme: "auto" as Theme,
  fontFamily: "heebo" as FontFamily,
  readingSize: 22,
  letterSpacing: 0,
  dailyGoalMinutes: 20,
  weeklyGoalMinutes: 120,
  onboarded: false,
  hapticsEnabled: true,
  soundEnabled: false,
  ambience: "default" as ReaderAmbience,
  uiLanguage: "he" as UILanguage,
  analyticsOptOut: false,
  reminderEnabled: false,
  reminderHour: 20,
  anthropicKey: "",
  mindWanderProbes: true,
  baselineWpm: null as number | null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setTheme: (theme) => set({ theme }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setReadingSize: (s) => set({ readingSize: Math.min(32, Math.max(16, s)) }),
      setLetterSpacing: (s) => set({ letterSpacing: Math.min(6, Math.max(0, s)) }),
      setDailyGoalMinutes: (m) => set({ dailyGoalMinutes: Math.min(120, Math.max(5, m)) }),
      setWeeklyGoalMinutes: (m) => set({ weeklyGoalMinutes: Math.min(840, Math.max(35, m)) }),
      completeOnboarding: () => set({ onboarded: true }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setAmbience: (ambience) => set({ ambience }),
      setUILanguage: (uiLanguage) => set({ uiLanguage }),
      setAnalyticsOptOut: (analyticsOptOut) => set({ analyticsOptOut }),
      setReminderEnabled: (reminderEnabled) => set({ reminderEnabled }),
      setReminderHour: (h) => set({ reminderHour: Math.min(23, Math.max(0, h)) }),
      setAnthropicKey: (anthropicKey) => set({ anthropicKey }),
      setMindWanderProbes: (mindWanderProbes) => set({ mindWanderProbes }),
      setBaselineWpm: (baselineWpm) => set({ baselineWpm }),
      resetAll: () => set({ ...DEFAULTS, onboarded: true }),
    }),
    { name: "kore-app-prefs", version: 2 }
  )
);

export const APP_DEFAULTS = DEFAULTS;
