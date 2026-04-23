"use client";

import { BottomNav } from "@/components/nav/BottomNav";
import { useAppStore } from "@/stores/app";
import { useEffect } from "react";
import { maybeScheduleReminder } from "@/lib/reminders";

const FONT_MAP: Record<string, string> = {
  heebo: "var(--font-heebo)",
  frank: "var(--font-frank)",
  assistant: "var(--font-assistant)",
  rubik: "var(--font-rubik)",
};

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const fontFamily = useAppStore((s) => s.fontFamily);
  const readingSize = useAppStore((s) => s.readingSize);
  const letterSpacing = useAppStore((s) => s.letterSpacing);
  const ambience = useAppStore((s) => s.ambience);
  const reminderEnabled = useAppStore((s) => s.reminderEnabled);
  const reminderHour = useAppStore((s) => s.reminderHour);

  // Theme application with live prefers-color-scheme listener for "auto" mode
  useEffect(() => {
    const root = document.documentElement;

    const applyAuto = () => {
      root.classList.remove("dark", "light");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    };

    if (theme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
      return;
    }
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      return;
    }

    // auto
    applyAuto();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyAuto);
    return () => mq.removeEventListener("change", applyAuto);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--reading-font",
      FONT_MAP[fontFamily] ?? "var(--font-heebo)"
    );
  }, [fontFamily]);

  useEffect(() => {
    document.documentElement.style.setProperty("--reading-size", `${readingSize}px`);
  }, [readingSize]);

  useEffect(() => {
    document.documentElement.style.setProperty("--reading-letter-spacing", `${letterSpacing / 10}px`);
  }, [letterSpacing]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("ambience-sepia", "ambience-high-contrast");
    if (ambience === "sepia") root.classList.add("ambience-sepia");
    if (ambience === "high-contrast") root.classList.add("ambience-high-contrast");
  }, [ambience]);

  useEffect(() => {
    maybeScheduleReminder(reminderEnabled, reminderHour);
  }, [reminderEnabled, reminderHour]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
