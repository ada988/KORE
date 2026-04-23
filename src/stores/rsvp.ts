"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrpMode } from "@/engines/orp";

type NikudMode = "off" | "full" | "partial";

type RsvpPreferences = {
  wpm: number;
  chunkSize: number;
  orpMode: OrpMode;
  nikudMode: NikudMode;
  adaptivePauses: boolean;
};

type RsvpState = RsvpPreferences & {
  setWpm: (wpm: number) => void;
  setChunkSize: (size: number) => void;
  setOrpMode: (mode: OrpMode) => void;
  setNikudMode: (mode: NikudMode) => void;
  setAdaptivePauses: (enabled: boolean) => void;
};

export const useRsvpStore = create<RsvpState>()(
  persist(
    (set) => ({
      wpm: 300,
      chunkSize: 1,
      orpMode: "root",
      nikudMode: "partial",
      adaptivePauses: true,

      setWpm: (wpm) => set({ wpm: Math.min(800, Math.max(100, wpm)) }),
      setChunkSize: (chunkSize) =>
        set({ chunkSize: Math.min(4, Math.max(1, chunkSize)) }),
      setOrpMode: (orpMode) => set({ orpMode }),
      setNikudMode: (nikudMode) => set({ nikudMode }),
      setAdaptivePauses: (adaptivePauses) => set({ adaptivePauses }),
    }),
    {
      name: "kore-rsvp-prefs",
    },
  ),
);
