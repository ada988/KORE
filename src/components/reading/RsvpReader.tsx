"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PivotWord } from "./PivotWord";
import { useRsvpEngine } from "@/hooks/useRsvpEngine";
import { useRsvpStore, SPEED_PRESETS, type SpeedMode } from "@/stores/rsvp";
import * as haptics from "@/lib/haptics";
import type { ProcessedPassage } from "@/types/token";

type Props = {
  passage: ProcessedPassage;
  onComplete?: () => void;
  onIdxChange?: (idx: number) => void;
  startIdx?: number;
};

/**
 * The hero RSVP reading screen.
 * Tap: pause/play. Double-tap: seek back 5 words.
 * Bottom overlay: speed preset chips, +/- buttons, mode switcher, regression, CPM.
 */
export function RsvpReader({ passage, onComplete, onIdxChange, startIdx }: Props) {
  const wpm = useRsvpStore((s) => s.wpm);
  const setWpm = useRsvpStore((s) => s.setWpm);
  const speedMode = useRsvpStore((s) => s.speedMode);
  const setSpeedMode = useRsvpStore((s) => s.setSpeedMode);

  const {
    currentFrame,
    effectiveWpm,
    isPlaying,
    progress,
    currentIdx,
    isComplete,
    play,
    toggle,
    seekBack,
    seekForward,
  } = useRsvpEngine(passage.tokens, startIdx !== undefined ? { startIdx } : {});

  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (isComplete) onComplete?.();
  }, [isComplete, onComplete]);

  useEffect(() => {
    onIdxChange?.(currentIdx);
  }, [currentIdx, onIdxChange]);

  // Auto-hide controls while playing
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    const t = window.setTimeout(() => setShowControls(false), 1600);
    return () => window.clearTimeout(t);
  }, [isPlaying]);

  // Compute CPM from effective WPM and average chars/word of this passage
  const avgCharsPerWord = useMemo(() => {
    if (passage.wordCount === 0) return 4.5;
    return passage.charCount / passage.wordCount;
  }, [passage]);
  const cpm = Math.round(effectiveWpm * avgCharsPerWord);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.code === "ArrowLeft") {
        seekBack(1);
        haptics.tap();
      } else if (e.code === "ArrowRight") {
        seekForward(1);
        haptics.tap();
      } else if (e.code === "ArrowUp") {
        setWpm(wpm + 25);
        haptics.tap();
      } else if (e.code === "ArrowDown") {
        setWpm(wpm - 25);
        haptics.tap();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggle, seekBack, seekForward, setWpm, wpm]);

  const handleTap = useCallback(() => {
    haptics.tap();
    toggle();
  }, [toggle]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      seekBack(5);
      haptics.bump();
    },
    [seekBack],
  );

  const displayTokens = currentFrame?.tokens ?? [];
  const wordTokens = displayTokens.filter((t) => t.kind === "word");

  return (
    <div
      className="rsvp-stage"
      onClick={handleTap}
      onDoubleClick={handleDoubleClick}
      onMouseMove={() => setShowControls(true)}
      role="main"
      aria-label="קוֹרֵא RSVP"
    >
      {/* Guide lines */}
      <div className="rsvp-guide-line rsvp-guide-line--top" aria-hidden="true" />
      <div className="rsvp-guide-line rsvp-guide-line--bottom" aria-hidden="true" />

      {/* Progress scrub bar (top) */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", top: 0, insetInline: 0, height: "2px",
          backgroundColor: "var(--bg-elevated)", zIndex: 150,
        }}
      >
        <div
          className="progress-fill"
          style={{
            height: "100%", width: `${progress * 100}%`,
            backgroundColor: "var(--accent)",
            transition: "width 120ms linear",
          }}
        />
      </div>

      {/* Word display */}
      <div className="rsvp-word-area" aria-live="off" aria-atomic="true">
        {wordTokens.length === 0 && !isPlaying && (
          <StartPrompt onStart={play} />
        )}
        {wordTokens.map((token) => (
          <PivotWord key={token.idx} token={token} fontSize="clamp(28px, 5vw, 52px)" />
        ))}
      </div>

      {/* Controls overlay */}
      <div
        className="rsvp-controls"
        style={{
          position: "absolute",
          bottom: "var(--space-6)",
          insetInline: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-4)",
          opacity: showControls ? 1 : 0,
          transition: `opacity var(--duration-base) var(--ease-ui)`,
          pointerEvents: showControls ? "auto" : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <CircleBtn aria="קפוץ 5 מילים אחורה" onClick={() => { seekBack(5); haptics.bump(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </CircleBtn>
          <CircleBtn aria="האט" onClick={() => { setWpm(wpm - 25); haptics.tap(); }}>−</CircleBtn>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            minWidth: "96px", textAlign: "center",
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700,
              color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", direction: "ltr",
            }}>
              {Math.round(effectiveWpm)}
            </span>
            <span style={{ fontFamily: "var(--font-assistant)", fontSize: "10px", color: "var(--text-tertiary)" }}>
              מ״ד · <bdi>{cpm.toLocaleString("he-IL")}</bdi> תווים/דק׳
            </span>
          </div>
          <CircleBtn aria="האץ" onClick={() => { setWpm(wpm + 25); haptics.tap(); }}>+</CircleBtn>
          <CircleBtn aria="קפוץ 5 מילים קדימה" onClick={() => { seekForward(5); haptics.bump(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </CircleBtn>
        </div>

        {/* Speed preset chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
          {SPEED_PRESETS.map((p) => (
            <PresetChip
              key={p.id}
              label={p.label}
              wpm={p.wpm}
              active={wpm === p.wpm}
              onClick={() => { setWpm(p.wpm); haptics.tap(); }}
            />
          ))}
        </div>

        {/* Speed mode selector */}
        <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-elevated)", padding: "3px", borderRadius: "10px" }}>
          {([
            { id: "steady", label: "קבוע" },
            { id: "progressive", label: "מדורג" },
            { id: "burst", label: "פרצים" },
          ] as { id: SpeedMode; label: string }[]).map((m) => (
            <button
              key={m.id}
              onClick={() => { setSpeedMode(m.id); haptics.tap(); }}
              style={{
                padding: "5px 12px", borderRadius: "7px", border: "none",
                backgroundColor: speedMode === m.id ? "var(--bg-surface)" : "transparent",
                color: speedMode === m.id ? "var(--text-primary)" : "var(--text-tertiary)",
                fontFamily: "var(--font-assistant)", fontSize: "12px",
                fontWeight: speedMode === m.id ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <ProgressDisplay ratio={progress} wordCount={passage.wordCount} />
      </div>
    </div>
  );
}

function StartPrompt({ onStart }: { onStart: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onStart();
      }}
      style={{
        fontSize: "var(--ui-size)", fontFamily: "var(--font-assistant)",
        color: "var(--text-secondary)", background: "none", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "var(--space-3) var(--space-6)", cursor: "pointer",
      }}
    >
      לחץ להתחלה
    </button>
  );
}

function CircleBtn({ children, onClick, aria }: { children: React.ReactNode; onClick: () => void; aria: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      style={{
        width: "36px", height: "36px", borderRadius: "50%",
        backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
        color: "var(--accent)", fontSize: "18px", fontWeight: 600,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", WebkitTapHighlightColor: "transparent",
        fontFamily: "var(--font-mono)",
      }}
    >
      {children}
    </button>
  );
}

function PresetChip({ label, wpm, active, onClick }: { label: string; wpm: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        backgroundColor: active ? "color-mix(in srgb, var(--accent) 18%, var(--bg-surface))" : "var(--bg-surface)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        color: active ? "var(--accent)" : "var(--text-secondary)",
        borderRadius: "20px", fontFamily: "var(--font-assistant)", fontSize: "11px",
        fontWeight: active ? 600 : 400, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: "6px",
      }}
    >
      {label}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", opacity: 0.7 }}>{wpm}</span>
    </button>
  );
}

function ProgressDisplay({ ratio, wordCount }: { ratio: number; wordCount: number }) {
  const pct = Math.round(ratio * 100);
  const wordsRead = Math.round(ratio * wordCount);

  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        color: "var(--text-tertiary)",
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        direction: "ltr", fontVariantNumeric: "tabular-nums",
      }}
    >
      <span>{wordsRead}</span>
      <span style={{ color: "var(--border)" }}>/</span>
      <span>{wordCount}</span>
      <span style={{ color: "var(--border)", marginInlineStart: "var(--space-1)" }}>({pct}%)</span>
    </div>
  );
}
