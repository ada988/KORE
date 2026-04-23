"use client";

import { BottomNav } from "@/components/nav/BottomNav";
import { useAppStore } from "@/stores/app";
import { useEffect } from "react";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "light") root.classList.add("light");
  }, [theme]);

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
