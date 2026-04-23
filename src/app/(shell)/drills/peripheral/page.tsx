"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconEye, IconCheck } from "@/components/ui/Icons";
import * as haptics from "@/lib/haptics";

/**
 * Peripheral vision drill — research-driven.
 * User fixates on a center pivot; words flash briefly to the left and right
 * at varying eccentricity. User calls out whether they saw the same or
 * different word (force-choice via tap).
 *
 * Train: perceptual span use, not expansion (Rayner 2010) — task builds
 * attention allocation across foveal + parafoveal regions.
 */

const WORDS = [
  "אור", "שמש", "ים", "ספר", "דרך", "בית", "מים", "לחם",
  "שלום", "זמן", "מקום", "חיים", "עולם", "מילה", "קולו", "ראש",
  "עץ", "דלת", "שיר", "צבע", "צורה", "חבר", "עבר", "חדש",
];

type Phase = "intro" | "playing" | "done";

type Trial = { left: string; center: string; right: string; match: boolean };

function genTrial(): Trial {
  const i = Math.floor(Math.random() * WORDS.length);
  const j = Math.floor(Math.random() * WORDS.length);
  let k = Math.floor(Math.random() * WORDS.length);
  while (k === i) k = Math.floor(Math.random() * WORDS.length);
  const match = Math.random() < 0.5;
  return {
    left: WORDS[i]!,
    center: WORDS[j]!,
    right: match ? WORDS[i]! : WORDS[k]!,
    match,
  };
}

const TRIAL_COUNT = 10;
const FLASH_MS = 200;

export default function PeripheralPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [trial, setTrial] = useState<Trial | null>(null);
  const [idx, setIdx] = useState(0);
  const [showWords, setShowWords] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const timerRef = useRef<number | null>(null);

  const nextTrial = useCallback((i: number) => {
    if (i >= TRIAL_COUNT) {
      setPhase("done");
      return;
    }
    const t = genTrial();
    setTrial(t);
    setIdx(i);
    setShowWords(false);
    setAwaitingAnswer(false);
    // Fixate 600ms, then flash
    timerRef.current = window.setTimeout(() => {
      setShowWords(true);
      timerRef.current = window.setTimeout(() => {
        setShowWords(false);
        setAwaitingAnswer(true);
      }, FLASH_MS);
    }, 600);
  }, []);

  const start = useCallback(() => {
    setCorrect(0);
    setPhase("playing");
    nextTrial(0);
  }, [nextTrial]);

  const answer = useCallback((guess: boolean) => {
    if (!awaitingAnswer || !trial) return;
    const right = guess === trial.match;
    if (right) {
      setCorrect((c) => c + 1);
      haptics.success();
    } else {
      haptics.error();
    }
    nextTrial(idx + 1);
  }, [awaitingAnswer, trial, idx, nextTrial]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (phase === "intro") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "20px",
            backgroundColor: "color-mix(in srgb, var(--focus-amber) 15%, var(--bg-elevated))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconEye size={32} style={{ color: "var(--focus-amber)" }} />
          </div>
          <h1 style={titleStyle}>ראייה היקפית</h1>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "var(--ui-size)", maxWidth: "280px", lineHeight: 1.6 }}>
            הסתכל על הנקודה במרכז. שלוש מילים יופיעו בהבזק קצר. החלט אם המילה בשמאל זהה למילה בימין.
          </p>
          <button onClick={start} style={accentBtn}>התחל</button>
          <button onClick={() => router.back()} style={ghostLink}>חזור</button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const pct = Math.round((correct / TRIAL_COUNT) * 100);
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
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "40px", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {correct}/{TRIAL_COUNT}
          </p>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "14px" }}>
            {pct >= 80 ? "מצוין! מודעות היקפית חזקה." : pct >= 60 ? "טוב. עוד תרגול יעזור." : "זה קשה. המשך לתרגל."}
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button onClick={start} style={accentBtn}>שחק שוב</button>
            <button onClick={() => router.back()} style={ghostBtn}>חזור</button>
          </div>
        </div>
      </div>
    );
  }

  // playing
  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: "480px", margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => setPhase("intro")} style={ghostLink}>עצור</button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
          <bdi>{idx + 1}</bdi>/<bdi>{TRIAL_COUNT}</bdi>
        </span>
      </div>

      <div style={{
        minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-8)", backgroundColor: "var(--bg-surface)", borderRadius: "20px",
        border: "1px solid var(--border)", direction: "rtl",
      }}>
        <span style={{
          fontFamily: "var(--font-heebo)", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)",
          opacity: showWords ? 1 : 0, transition: "opacity 60ms",
        }}>
          {trial?.right}
        </span>
        <span style={{
          width: "10px", height: "10px", borderRadius: "50%",
          backgroundColor: "var(--accent)",
        }} />
        <span style={{
          fontFamily: "var(--font-heebo)", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)",
          opacity: showWords ? 1 : 0, transition: "opacity 60ms",
        }}>
          {trial?.left}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <button
          onClick={() => answer(true)}
          disabled={!awaitingAnswer}
          style={{
            padding: "var(--space-4)",
            backgroundColor: awaitingAnswer ? "color-mix(in srgb, var(--comp-green) 14%, var(--bg-surface))" : "var(--bg-surface)",
            border: `2px solid ${awaitingAnswer ? "var(--comp-green)" : "var(--border)"}`,
            borderRadius: "14px", fontFamily: "var(--font-heebo)", fontSize: "16px", fontWeight: 600,
            color: awaitingAnswer ? "var(--comp-green)" : "var(--text-tertiary)",
            cursor: awaitingAnswer ? "pointer" : "not-allowed",
            transition: "all 0.12s",
          }}
        >
          זהות
        </button>
        <button
          onClick={() => answer(false)}
          disabled={!awaitingAnswer}
          style={{
            padding: "var(--space-4)",
            backgroundColor: awaitingAnswer ? "color-mix(in srgb, var(--root-red) 14%, var(--bg-surface))" : "var(--bg-surface)",
            border: `2px solid ${awaitingAnswer ? "var(--root-red)" : "var(--border)"}`,
            borderRadius: "14px", fontFamily: "var(--font-heebo)", fontSize: "16px", fontWeight: 600,
            color: awaitingAnswer ? "var(--root-red)" : "var(--text-tertiary)",
            cursor: awaitingAnswer ? "pointer" : "not-allowed",
            transition: "all 0.12s",
          }}
        >
          שונות
        </button>
      </div>

      <p style={{ textAlign: "center", fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>
        הסתכל על הנקודה — אל תזיז את העיניים
      </p>
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
  width: "100%", padding: "var(--space-4)", backgroundColor: "var(--accent)", color: "#fff",
  fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "var(--ui-size)",
  borderRadius: "12px", border: "none", cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "var(--space-3) var(--space-8)", backgroundColor: "transparent", color: "var(--text-secondary)",
  fontFamily: "var(--font-heebo)", fontWeight: 400, fontSize: "var(--ui-size)",
  borderRadius: "10px", border: "1px solid var(--border)", cursor: "pointer",
};
const ghostLink: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-tertiary)", padding: 0,
};
