"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDb } from "@/lib/db";
import * as haptics from "@/lib/haptics";
import type { ProcessedPassage } from "@/types/token";

type Props = {
  passage: ProcessedPassage;
  onComplete?: () => void;
  onIdxChange?: (idx: number) => void;
  startIdx?: number;
};

/**
 * Classic scrollable reader — research-backed "deep reading" mode.
 * Complement to RSVP: Delgado et al. 2018 found paginated text
 * improves inference comprehension vs. scroll. We use scroll with
 * a soft fade at page boundaries and tap-to-highlight-save.
 */
export function PaginatedReader({ passage, onComplete, onIdxChange, startIdx = 0 }: Props) {
  const text = useMemo(() => passage.tokens.map((t) => t.surface).join(""), [passage]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    // approximate startIdx → scroll position
    if (startIdx > 0 && containerRef.current) {
      const ratio = startIdx / Math.max(1, passage.tokens.length);
      containerRef.current.scrollTop = containerRef.current.scrollHeight * ratio;
    }
  }, [startIdx, passage.tokens.length]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const ratio = max > 0 ? el.scrollTop / max : 0;
    const approxIdx = Math.round(passage.tokens.length * ratio);
    onIdxChange?.(approxIdx);
    if (ratio >= 0.98 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [onIdxChange, onComplete, passage.tokens.length]);

  const saveHighlight = useCallback(async () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const selectedText = sel.toString().trim();
    if (selectedText.length < 3) return;

    const db = getDb();
    const now = new Date().toISOString();
    await db.highlights.add({
      id: crypto.randomUUID(),
      user_id: "local",
      passage_id: passage.id,
      start_offset: 0,
      end_offset: selectedText.length,
      selected_text: selectedText,
      color: "amber",
      note: null,
      created_at: now,
    });

    // Auto-create a review card
    await db.review_cards.add({
      id: crypto.randomUUID(),
      user_id: "local",
      card_type: "vocab",
      front: selectedText,
      back: `מתוך: ${passage.title}`,
      context_passage_id: passage.id,
      due: now,
      stability: null,
      difficulty: null,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: null,
      created_at: now,
    });

    haptics.success();
    setSavedCount((n) => n + 1);
    sel.removeAllRanges();
  }, [passage.id, passage.title]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onMouseUp={saveHighlight}
        onTouchEnd={saveHighlight}
        className="paginated-reader"
        style={{
          flex: 1, overflowY: "auto", paddingBlockStart: "calc(56px + var(--space-5))",
          paddingBlockEnd: "calc(72px + env(safe-area-inset-bottom, 0px))",
          color: "var(--text-primary)", whiteSpace: "pre-wrap",
        }}
      >
        <h1 style={{
          fontFamily: "var(--font-rubik)", fontWeight: 700,
          fontSize: "var(--text-h2)", color: "var(--text-primary)",
          marginBottom: "var(--space-4)", direction: "rtl",
        }}>
          {passage.title}
        </h1>
        <div style={{ lineHeight: "var(--reading-line-height)", direction: "rtl" }}>
          {text}
        </div>
      </div>

      {savedCount > 0 && (
        <div style={{
          position: "fixed", bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + var(--space-3))",
          insetInlineEnd: "var(--space-3)", zIndex: 50,
          backgroundColor: "color-mix(in srgb, var(--focus-amber) 18%, var(--bg-surface))",
          border: "1px solid var(--focus-amber)",
          borderRadius: "20px", padding: "5px 12px",
          fontFamily: "var(--font-mono)", fontSize: "12px",
          color: "var(--focus-amber)", fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}>
          <bdi>{savedCount}</bdi> נשמרו לחזרה
        </div>
      )}

      <div style={{
        position: "fixed", top: "56px",
        insetInlineStart: "50%", transform: "translateX(-50%)",
        fontFamily: "var(--font-assistant)", fontSize: "11px",
        color: "var(--text-tertiary)",
      }}>
        סמן קטע באצבע/עכבר לשמור לחזרה
      </div>
    </div>
  );
}
