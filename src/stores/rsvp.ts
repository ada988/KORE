"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrpMode } from "@/engines/orp";

type NikudMode = "off" | "full" | "partial";
export type SpeedMode = "steady" | "progressive" | "burst" | "adaptive";

type RsvpPreferences = {
  wpm: number;
  chunkSize: number;
  orpMode: OrpMode;
  nikudMode: NikudMode;
  adaptivePauses: boolean;
  /** steady = constant; progressive = ramp up +N WPM/min to ceiling; burst = alternating fast/slow intervals; adaptive = titrates on comprehension */
  speedMode: SpeedMode;
  /** WPM/minute ramp in progressive mode */
  progressiveRampPerMin: number;
  /** WPM ceiling in progressive + adaptive modes */
  speedCeiling: number;
  /** WPM floor */
  speedFloor: number;
  /** Burst: WPM delta during sprint */
  burstBoost: number;
  /** Burst: duration of sprint seconds */
  burstSprintSec: number;
  /** Burst: cooldown seconds at baseline */
  burstRestSec: number;
  /** Show root letter highlights when root data present */
  highlightRoots: boolean;
  /** Reading mode: rsvp (pivot) vs paginated (scrollable) */
  readingMode: "rsvp" | "paginated";
};

type RsvpState = RsvpPreferences & {
  setWpm: (wpm: number) => void;
  setChunkSize: (size: number) => void;
  setOrpMode: (mode: OrpMode) => void;
  setNikudMode: (mode: NikudMode) => void;
  setAdaptivePauses: (enabled: boolean) => void;
  setSpeedMode: (mode: SpeedMode) => void;
  setProgressiveRampPerMin: (n: number) => void;
  setSpeedCeiling: (n: number) => void;
  setSpeedFloor: (n: number) => void;
  setBurstBoost: (n: number) => void;
  setBurstSprintSec: (n: number) => void;
  setBurstRestSec: (n: number) => void;
  setHighlightRoots: (v: boolean) => void;
  setReadingMode: (m: "rsvp" | "paginated") => void;
  resetSpeedPrefs: () => void;
};

const DEFAULTS: RsvpPreferences = {
  wpm: 300,
  chunkSize: 1,
  orpMode: "root",
  nikudMode: "partial",
  adaptivePauses: true,
  speedMode: "steady",
  progressiveRampPerMin: 25,
  speedCeiling: 500,
  speedFloor: 150,
  burstBoost: 150,
  burstSprintSec: 20,
  burstRestSec: 40,
  highlightRoots: true,
  readingMode: "rsvp",
};

export const useRsvpStore = create<RsvpState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setWpm: (wpm) => set({ wpm: Math.min(900, Math.max(80, wpm)) }),
      setChunkSize: (chunkSize) =>
        set({ chunkSize: Math.min(4, Math.max(1, chunkSize)) }),
      setOrpMode: (orpMode) => set({ orpMode }),
      setNikudMode: (nikudMode) => set({ nikudMode }),
      setAdaptivePauses: (adaptivePauses) => set({ adaptivePauses }),
      setSpeedMode: (speedMode) => set({ speedMode }),
      setProgressiveRampPerMin: (progressiveRampPerMin) =>
        set({ progressiveRampPerMin: Math.min(100, Math.max(5, progressiveRampPerMin)) }),
      setSpeedCeiling: (speedCeiling) =>
        set({ speedCeiling: Math.min(900, Math.max(200, speedCeiling)) }),
      setSpeedFloor: (speedFloor) =>
        set({ speedFloor: Math.min(400, Math.max(80, speedFloor)) }),
      setBurstBoost: (burstBoost) =>
        set({ burstBoost: Math.min(400, Math.max(25, burstBoost)) }),
      setBurstSprintSec: (burstSprintSec) =>
        set({ burstSprintSec: Math.min(120, Math.max(5, burstSprintSec)) }),
      setBurstRestSec: (burstRestSec) =>
        set({ burstRestSec: Math.min(180, Math.max(5, burstRestSec)) }),
      setHighlightRoots: (highlightRoots) => set({ highlightRoots }),
      setReadingMode: (readingMode) => set({ readingMode }),
      resetSpeedPrefs: () =>
        set({
          wpm: DEFAULTS.wpm,
          speedMode: DEFAULTS.speedMode,
          progressiveRampPerMin: DEFAULTS.progressiveRampPerMin,
          speedCeiling: DEFAULTS.speedCeiling,
          speedFloor: DEFAULTS.speedFloor,
          burstBoost: DEFAULTS.burstBoost,
          burstSprintSec: DEFAULTS.burstSprintSec,
          burstRestSec: DEFAULTS.burstRestSec,
        }),
    }),
    { name: "kore-rsvp-prefs", version: 2 },
  ),
);

export const RSVP_DEFAULTS = DEFAULTS;

/**
 * Built-in WPM presets grouped by reading mode.
 * Values from Rayner et al. (2016) reading-rate taxonomy.
 */
export const SPEED_PRESETS: { id: string; label: string; labelEn: string; wpm: number }[] = [
  { id: "deep", label: "עיון", labelEn: "Study", wpm: 200 },
  { id: "normal", label: "רגיל", labelEn: "Normal", wpm: 300 },
  { id: "brisk", label: "מהיר", labelEn: "Brisk", wpm: 400 },
  { id: "skim", label: "דילוג", labelEn: "Skim", wpm: 550 },
];
