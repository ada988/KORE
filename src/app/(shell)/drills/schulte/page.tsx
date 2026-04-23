"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconGrid, IconTrophy, IconCheck } from "@/components/ui/Icons";

const SIZE = 5;
const TOTAL = SIZE * SIZE;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type Phase = "intro" | "playing" | "done";

export default function SchultePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [grid, setGrid] = useState<number[]>([]);
  const [next, setNext] = useState(1);
  const [flash, setFlash] = useState<number | null>(null);
  const [startMs, setStartMs] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    setGrid(shuffle(Array.from({ length: TOTAL }, (_, i) => i + 1)));
    setNext(1);
    setFlash(null);
    setElapsed(0);
    const now = Date.now();
    setStartMs(now);
    setPhase("playing");
    timerRef.current = setInterval(() => setElapsed(Date.now() - now), 100);
  }, []);

  const handleTap = useCallback((n: number) => {
    if (n !== next) {
      setFlash(n);
      setTimeout(() => setFlash(null), 300);
      return;
    }
    if (next === TOTAL) {
      const finalMs = Date.now() - startMs;
      setElapsed(finalMs);
      if (timerRef.current) clearInterval(timerRef.current);
      setBestMs((prev) => (prev === null || finalMs < prev ? finalMs : prev));
      setPhase("done");
    } else {
      setNext((p) => p + 1);
    }
  }, [next, startMs]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const isNewBest = bestMs === elapsed && phase === "done";

  if (phase === "intro") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "20px",
            backgroundColor: "color-mix(in srgb, var(--accent) 15%, var(--bg-elevated))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconGrid size={32} style={{ color: "var(--accent)" }} />
          </div>
          <h1 style={titleStyle}>טבלת שולטה</h1>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "var(--ui-size)", maxWidth: "280px", lineHeight: 1.6 }}>
            מצא את המספרים 1 עד 25 לפי הסדר, במהירות האפשרית.
            <br /><br />
            הכוונה <strong>לא</strong> לנייד את הראש — רק את העיניים.
          </p>
          {bestMs !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--focus-amber)" }}>
              <IconTrophy size={14} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>שיא: <bdi>{formatTime(bestMs)}</bdi></span>
            </div>
          )}
          <button onClick={startGame} style={accentBtn}>התחל</button>
          <button onClick={() => router.back()} style={ghostLink}>חזור</button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--comp-green) 15%, var(--bg-elevated))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconCheck size={32} style={{ color: "var(--comp-green)" }} />
          </div>
          <h1 style={titleStyle}>סיימת!</h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "36px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr" }}>
            {formatTime(elapsed)}
          </p>
          {isNewBest && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--focus-amber)" }}>
              <IconTrophy size={16} />
              <span style={{ fontFamily: "var(--font-assistant)", fontSize: "14px", fontWeight: 600 }}>שיא אישי חדש!</span>
            </div>
          )}
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button onClick={startGame} style={accentBtn}>שחק שוב</button>
            <button onClick={() => router.back()} style={ghostBtn}>חזור</button>
          </div>
        </div>
      </div>
    );
  }

  const secStr = (elapsed / 1000).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase("intro"); }} style={ghostLink}>
          עצור
        </button>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr" }}>
          <bdi>{secStr}</bdi>s
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "15px", color: "var(--accent)", fontWeight: 700 }}>
          <bdi>{next}</bdi>
        </p>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
        gap: "var(--space-2)", flex: 1, maxWidth: "380px", margin: "0 auto", width: "100%",
      }}>
        {grid.map((n, i) => {
          const done = n < next;
          const isFlash = flash === n;
          return (
            <button
              key={i}
              onClick={() => handleTap(n)}
              style={{
                aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: done
                  ? "color-mix(in srgb, var(--comp-green) 18%, var(--bg-elevated))"
                  : isFlash
                  ? "color-mix(in srgb, var(--error-red) 18%, var(--bg-elevated))"
                  : "var(--bg-surface)",
                border: `1px solid ${done ? "color-mix(in srgb, var(--comp-green) 40%, transparent)" : isFlash ? "color-mix(in srgb, var(--error-red) 40%, transparent)" : "var(--border)"}`,
                borderRadius: "10px", cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: "17px", fontWeight: 700,
                color: done ? "var(--comp-green)" : "var(--text-primary)",
                transition: "background-color 0.12s, border-color 0.12s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {done ? <IconCheck size={14} /> : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const centerLayout: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  padding: "var(--space-6)", minHeight: "80vh",
};
const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h1)", color: "var(--text-primary)",
};
const accentBtn: React.CSSProperties = {
  padding: "var(--space-3) var(--space-8)", backgroundColor: "var(--accent)", color: "#fff",
  fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "var(--ui-size)",
  borderRadius: "10px", border: "none", cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "var(--space-3) var(--space-8)", backgroundColor: "transparent",
  color: "var(--text-secondary)", fontFamily: "var(--font-heebo)", fontWeight: 400,
  fontSize: "var(--ui-size)", borderRadius: "10px", border: "1px solid var(--border)", cursor: "pointer",
};
const ghostLink: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-tertiary)", padding: 0,
};
