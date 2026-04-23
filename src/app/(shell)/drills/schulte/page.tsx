"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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

  if (phase === "intro") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{ fontSize: "48px" }}>🟦</div>
          <h1 style={titleStyle}>טבלת שולטה</h1>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "var(--ui-size)", maxWidth: "280px", lineHeight: 1.6 }}>
            מצא את המספרים 1 עד 25 לפי הסדר, במהירות האפשרית.
            <br/><br/>
            הכוונה <strong>לא</strong> לנייד את הראש — רק את העיניים.
          </p>
          {bestMs && <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-tertiary)" }}>
            שיא אישי: <bdi>{formatTime(bestMs)}</bdi>
          </p>}
          <button onClick={startGame} style={accentBtn}>התחל</button>
          <button onClick={() => router.back()} style={ghostLink}>← חזור</button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{ fontSize: "48px" }}>✓</div>
          <h1 style={titleStyle}>סיימת!</h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr" }}>
            {formatTime(elapsed)}
          </p>
          {bestMs === elapsed && (
            <p style={{ fontFamily: "var(--font-assistant)", color: "var(--comp-green)", fontSize: "14px" }}>
              🏆 שיא אישי חדש!
            </p>
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
          ← עצור
        </button>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr" }}>
          <bdi>{secStr}</bdi>s
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--accent)", fontWeight: 700 }}>
          → <bdi>{next}</bdi>
        </p>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
        gap: "var(--space-2)", flex: 1, maxWidth: "360px", margin: "0 auto", width: "100%",
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
                  ? "color-mix(in srgb, var(--comp-green) 20%, var(--bg-elevated))"
                  : isFlash
                  ? "color-mix(in srgb, var(--error-red) 20%, var(--bg-elevated))"
                  : "var(--bg-surface)",
                border: `1px solid ${done ? "var(--comp-green)" : isFlash ? "var(--error-red)" : "var(--border)"}`,
                borderRadius: "10px", cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700,
                color: done ? "var(--comp-green)" : "var(--text-primary)",
                transition: "background-color 0.15s, border-color 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {done ? "✓" : n}
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
  fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h1)",
  color: "var(--text-primary)",
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
  fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)", color: "var(--text-tertiary)", padding: 0,
};
