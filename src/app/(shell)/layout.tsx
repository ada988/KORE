"use client";

import { BottomNav } from "@/components/nav/BottomNav";
import { useAppStore } from "@/stores/app";
import { useEffect } from "react";

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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "light") root.classList.add("light");
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
