"use client";

import { useCallback, useEffect } from "react";
import { PivotWord } from "./PivotWord";
import { useRsvpEngine } from "@/hooks/useRsvpEngine";
import { useRsvpStore } from "@/stores/rsvp";
import type { ProcessedPassage } from "@/types/token";

type Props = {
  passage: ProcessedPassage;
  onComplete?: () => void;
};

/**
 * The hero RSVP reading screen.
 *
 * Layout rules (from design spec):
 * - Word area is optically centered (shifted up ~3% via padding-block-end on .rsvp-stage)
 * - Two horizontal hairlines bracket the current word
 * - Entire screen is the tap target: tap = pause, double-tap = seek back 5 words
 * - No chrome while playing; controls fade in on hover/pause
 */
export function RsvpReader({ passage, onComplete }: Props) {
  const { wpm, setWpm, chunkSize } = useRsvpStore((s) => ({
    wpm: s.wpm,
    setWpm: s.setWpm,
    chunkSize: s.chunkSize,
  }));

  const { currentFrame, isPlaying, progress, isComplete, play, pause, toggle, seekBack } =
    useRsvpEngine(passage.tokens);

  useEffect(() => {
    if (isComplete) onComplete?.();
  }, [isComplete, onComplete]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.code === "ArrowLeft") {
        seekBack(1);
      } else if (e.code === "ArrowRight") {
        seekBack(-1);
      } else if (e.code === "ArrowUp") {
        setWpm(wpm + 25);
      } else if (e.code === "ArrowDown") {
        setWpm(wpm - 25);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggle, seekBack, setWpm, wpm]);

  const handleTap = useCallback(() => toggle(), [toggle]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      seekBack(5);
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
      role="main"
      aria-label="קוֹרֵא RSVP"
    >
      {/* Guide lines */}
      <div className="rsvp-guide-line rsvp-guide-line--top" aria-hidden="true" />
      <div className="rsvp-guide-line rsvp-guide-line--bottom" aria-hidden="true" />

      {/* Word display */}
      <div className="rsvp-word-area" aria-live="off" aria-atomic="true">
        {wordTokens.length === 0 && !isPlaying && (
          <StartPrompt onStart={play} />
        )}
        {wordTokens.map((token) => (
          <PivotWord key={token.idx} token={token} fontSize="clamp(28px, 5vw, 52px)" />
        ))}
      </div>

      {/* Controls overlay — visible on hover/pause */}
      <div
        className="rsvp-controls"
        style={{
          position: "absolute",
          bottom: "var(--space-8)",
          insetInlineStart: 0,
          insetInlineEnd: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-6)",
          opacity: isPlaying ? 0 : 1,
          transition: `opacity var(--duration-base) var(--ease-ui)`,
          pointerEvents: isPlaying ? "none" : "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <WpmControl wpm={wpm} onWpmChange={setWpm} />
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
      className="text-text-secondary hover:text-accent transition-colors"
      style={{ fontSize: "var(--ui-size)", fontFamily: "var(--font-assistant)" }}
    >
      לחץ להתחלה
    </button>
  );
}

function WpmControl({
  wpm,
  onWpmChange,
}: {
  wpm: number;
  onWpmChange: (v: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-caption)",
        color: "var(--text-tertiary)",
      }}
    >
      <button
        aria-label="האט"
        onClick={() => onWpmChange(wpm - 25)}
        style={{ padding: "var(--space-1) var(--space-2)", color: "var(--accent)" }}
      >
        −
      </button>
      <span dir="ltr">
        <bdi>{wpm}</bdi> מ״ד
      </span>
      <button
        aria-label="האץ"
        onClick={() => onWpmChange(wpm + 25)}
        style={{ padding: "var(--space-1) var(--space-2)", color: "var(--accent)" }}
      >
        +
      </button>
    </div>
  );
}

function ProgressDisplay({
  ratio,
  wordCount,
}: {
  ratio: number;
  wordCount: number;
}) {
  const pct = Math.round(ratio * 100);
  const wordsRead = Math.round(ratio * wordCount);

  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-caption)",
        color: "var(--text-tertiary)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        direction: "ltr",
      }}
    >
      <span>{wordsRead}</span>
      <span style={{ color: "var(--border)" }}>/</span>
      <span>{wordCount}</span>
      <span style={{ color: "var(--border)", marginInlineStart: "var(--space-1)" }}>
        ({pct}%)
      </span>
    </div>
  );
}
