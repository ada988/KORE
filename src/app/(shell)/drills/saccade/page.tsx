"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Phase = "intro" | "playing" | "done";

const ROUNDS = 20;
const BASE_INTERVAL = 1600;

export default function SaccadePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [side, setSide] = useState<"right" | "left">("right");
  const [round, setRound] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextRound = useCallback((rnd: number) => {
    if (rnd >= ROUNDS) {
      setPhase("done");
      return;
    }
    setWaiting(false);
    setSide(Math.random() > 0.5 ? "right" : "left");
    setRound(rnd);
    const interval = Math.max(600, BASE_INTERVAL - rnd * 40);
    timeoutRef.current = setTimeout(() => {
      setMisses((p) => p + 1);
      setWaiting(true);
      setTimeout(() => nextRound(rnd + 1), 400);
    }, interval);
  }, []);

  const start = useCallback(() => {
    setRound(0); setHits(0); setMisses(0); setWaiting(false);
    setPhase("playing");
    nextRound(0);
  }, [nextRound]);

  const handleTap = useCallback((tappedSide: "right" | "left") => {
    if (waiting) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (tappedSide === side) {
      setHits((p) => p + 1);
    } else {
      setMisses((p) => p + 1);
    }
    setWaiting(true);
    setTimeout(() => nextRound(round + 1), 300);
  }, [side, round, waiting, nextRound]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
  const progress = round / ROUNDS;

  if (phase === "intro") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{ fontSize: "48px" }}>👁</div>
          <h1 style={titleStyle}>תנועות עיניים</h1>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "var(--ui-size)", maxWidth: "300px", lineHeight: 1.6 }}>
            נקודה תופיע משמאל או מימין. לחץ על הצד הנכון מהר ככל האפשר.
            <br /><br />
            האתגר גובר עם הזמן — כל סיבוב מהיר יותר.
          </p>
          <button onClick={start} style={accentBtn}>התחל</button>
          <button onClick={() => router.back()} style={ghostLink}>← חזור</button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{ fontSize: "48px" }}>{accuracy >= 80 ? "🎯" : "👁"}</div>
          <h1 style={titleStyle}>סיבוב הסתיים</h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: 700, color: accuracy >= 80 ? "var(--comp-green)" : "var(--focus-amber)" }}>
            {accuracy}%
          </p>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-tertiary)", fontSize: "14px" }}>
            <bdi>{hits}</bdi> פגיעות · <bdi>{misses}</bdi> החמצות
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button onClick={start} style={accentBtn}>שחק שוב</button>
            <button onClick={() => router.back()} style={ghostBtn}>חזור</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Progress bar */}
      <div style={{ height: "4px", backgroundColor: "var(--bg-elevated)", direction: "rtl" }}>
        <div style={{
          height: "100%", width: `${progress * 100}%`,
          backgroundColor: "var(--accent)", transition: "width 0.3s",
        }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-3) var(--space-4)" }}>
        <button onClick={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setPhase("intro"); }} style={ghostLink}>
          ← עצור
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-tertiary)" }}>
          <bdi>{round}</bdi>/<bdi>{ROUNDS}</bdi>
        </span>
      </div>

      {/* Two tap zones */}
      <div style={{ flex: 1, display: "flex", minHeight: "300px" }}>
        {/* Right zone (RTL: displayed on the right = visual left) */}
        <button
          onClick={() => handleTap("left")}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: !waiting && side === "left" ? "color-mix(in srgb, var(--accent) 12%, var(--bg-surface))" : "var(--bg)",
            border: "none", cursor: "pointer",
            transition: "background-color 0.1s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {!waiting && side === "left" && (
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              backgroundColor: "var(--accent)",
              boxShadow: "0 0 0 12px color-mix(in srgb, var(--accent) 20%, transparent)",
            }} />
          )}
        </button>

        {/* Center divider */}
        <div style={{ width: "1px", backgroundColor: "var(--border)", alignSelf: "stretch" }} />

        {/* Left zone (RTL: displayed on the left = visual right) */}
        <button
          onClick={() => handleTap("right")}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: !waiting && side === "right" ? "color-mix(in srgb, var(--accent) 12%, var(--bg-surface))" : "var(--bg)",
            border: "none", cursor: "pointer",
            transition: "background-color 0.1s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {!waiting && side === "right" && (
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              backgroundColor: "var(--accent)",
              boxShadow: "0 0 0 12px color-mix(in srgb, var(--accent) 20%, transparent)",
            }} />
          )}
        </button>
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
  padding: "var(--space-3) var(--space-8)", backgroundColor: "transparent", color: "var(--text-secondary)",
  fontFamily: "var(--font-heebo)", fontWeight: 400, fontSize: "var(--ui-size)",
  borderRadius: "10px", border: "1px solid var(--border)", cursor: "pointer",
};
const ghostLink: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)", color: "var(--text-tertiary)", padding: 0,
};
