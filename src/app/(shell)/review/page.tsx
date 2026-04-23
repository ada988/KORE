"use client";

import { useState, useEffect, useCallback } from "react";
import { getDb } from "@/lib/db";
import { IconCheck, IconStar, IconPlus } from "@/components/ui/Icons";
import * as haptics from "@/lib/haptics";
import type { ReviewCard } from "@/types/database";

const LOCAL_USER_ID = "local";

/**
 * Seed a handful of classic Hebrew homograph + root cards for first-run demo.
 * Homographs chosen per Bar-On & Ravid (2017) — high-frequency ambiguity.
 */
const SEED_CARDS: Array<Pick<ReviewCard, "card_type" | "front" | "back">> = [
  { card_type: "homograph", front: "ספר", back: "ספר = book / barber / counted / recount — ההקשר קובע" },
  { card_type: "homograph", front: "פרה", back: "פרה = cow (shem etzem) / purru = she is fruitful (po'al)" },
  { card_type: "homograph", front: "ברא", back: "ברא = create (verb) / healthy (shaleem)" },
  { card_type: "homograph", front: "דברה", back: "דברה = she spoke / plague / commandment (contextual)" },
  { card_type: "root", front: "כ-ת-ב", back: "לכתוב, כתיבה, כתב, מכתב, כותרת" },
  { card_type: "root", front: "ל-מ-ד", back: "ללמוד, ללמד, תלמיד, מלמד, לימוד" },
  { card_type: "root", front: "ר-א-ה", back: "לראות, ראיה, מראה, ראשית" },
  { card_type: "root", front: "ש-מ-ר", back: "לשמור, שומר, משמר, שמירה, שמרנות" },
  { card_type: "vocab", front: "הינומה", back: "צעיף הכלה; כיסוי שקוף על הראש" },
  { card_type: "vocab", front: "תזכיר", back: "מסמך קצר המסכם החלטה או הצעת פעולה" },
];

async function ensureSeed() {
  const db = getDb();
  const count = await db.review_cards.where("user_id").equals(LOCAL_USER_ID).count();
  if (count > 0) return;
  const now = new Date().toISOString();
  await db.review_cards.bulkAdd(
    SEED_CARDS.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      user_id: LOCAL_USER_ID,
      context_passage_id: null,
      due: now,
      stability: null,
      difficulty: null,
      elapsed_days: 0,
      scheduled_days: 1,
      reps: 0,
      lapses: 0,
      state: 0 as const,
      last_review: null,
      created_at: now,
    })),
  );
}

export default function ReviewPage() {
  const [dueCards, setDueCards] = useState<ReviewCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [phase, setPhase] = useState<"loading" | "empty" | "reviewing" | "done">("loading");

  const load = useCallback(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const cards = await db.review_cards
      .where("user_id").equals(LOCAL_USER_ID)
      .and((c) => c.due <= now)
      .limit(20)
      .toArray();
    setDueCards(cards);
    setPhase(cards.length === 0 ? "empty" : "reviewing");
    setIdx(0);
    setFlipped(false);
  }, []);

  const seedAndLoad = useCallback(async () => {
    await ensureSeed();
    await load();
    haptics.tap();
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const handleRate = useCallback(async (rating: 1 | 2 | 3 | 4) => {
    const card = dueCards[idx];
    if (!card) return;
    if (rating === 1) haptics.error(); else haptics.tap();

    // Simple scheduling without full FSRS: multiply stability by rating factor
    const factor = [0.5, 1, 2, 4][rating - 1]!;
    const nextDays = Math.max(1, Math.round((card.scheduled_days || 1) * factor));
    const nextDue = new Date(Date.now() + nextDays * 86400000).toISOString();

    const db = getDb();
    await db.review_cards.update(card.id, {
      due: nextDue,
      reps: card.reps + 1,
      lapses: rating === 1 ? card.lapses + 1 : card.lapses,
      scheduled_days: nextDays,
      last_review: new Date().toISOString(),
      state: rating <= 1 ? 1 : 2,
    });

    if (idx + 1 >= dueCards.length) {
      setPhase("done");
    } else {
      setIdx((p) => p + 1);
      setFlipped(false);
    }
  }, [dueCards, idx]);

  if (phase === "loading") {
    return (
      <div style={centerLayout}>
        <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-tertiary)" }}>...טוען</p>
      </div>
    );
  }

  if (phase === "empty") {
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
          <h1 style={titleStyle}>אין כרטיסיות לחזרה</h1>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", maxWidth: "300px", lineHeight: 1.6, fontSize: "var(--ui-size)" }}>
            כרטיסיות נוצרות אוטומטית מסימון טקסט בקורא הרגיל ומשאלות הבנה.
          </p>
          <button onClick={seedAndLoad} style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "var(--space-3) var(--space-6)",
            backgroundColor: "var(--accent)", color: "#fff",
            fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "14px",
            borderRadius: "10px", border: "none", cursor: "pointer",
          }}>
            <IconPlus size={14} />
            טען חבילת הדגמה
          </button>
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
            backgroundColor: "color-mix(in srgb, var(--focus-amber) 15%, var(--bg-elevated))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconStar size={32} style={{ color: "var(--focus-amber)" }} />
          </div>
          <h1 style={titleStyle}>סיימת את החזרה!</h1>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "var(--ui-size)" }}>
            עברת על <bdi>{dueCards.length}</bdi> כרטיסיות.
          </p>
          <button onClick={load} style={ghostBtn}>בדוק שוב</button>
        </div>
      </div>
    );
  }

  const card = dueCards[idx];
  if (!card) return null;
  const progress = (idx / dueCards.length) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "var(--space-4)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h3)", color: "var(--text-primary)" }}>
          חזרה
        </h1>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-tertiary)" }}>
          <bdi>{idx + 1}</bdi>/<bdi>{dueCards.length}</bdi>
        </span>
      </div>

      {/* Progress */}
      <div style={{ height: "4px", backgroundColor: "var(--bg-elevated)", borderRadius: "2px", marginBottom: "var(--space-5)", direction: "rtl" }}>
        <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "var(--accent)", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>

      {/* Card */}
      <div
        onClick={() => !flipped && setFlipped(true)}
        style={{
          flex: 1, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "20px", padding: "var(--space-8)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          cursor: flipped ? "default" : "pointer", WebkitTapHighlightColor: "transparent",
          minHeight: "240px",
        }}
      >
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)",
          marginBottom: "var(--space-4)", textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          {card.card_type === "vocab" ? "מילה" : card.card_type === "root" ? "שורש" : "שאלה"}
        </span>
        <p style={{
          fontFamily: "var(--font-heebo)", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700,
          color: "var(--text-primary)", textAlign: "center", direction: "rtl", lineHeight: 1.5,
        }}>
          {card.front}
        </p>

        {flipped ? (
          <div style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
            <div style={{ width: "40px", height: "1px", backgroundColor: "var(--border)", margin: "0 auto var(--space-5)" }} />
            <p style={{
              fontFamily: "var(--font-heebo)", fontSize: "var(--ui-size)", color: "var(--text-secondary)",
              direction: "rtl", lineHeight: 1.7, maxWidth: "300px",
            }}>
              {card.back}
            </p>
          </div>
        ) : (
          <p style={{ marginTop: "var(--space-6)", fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-tertiary)" }}>
            לחץ לגלות
          </p>
        )}
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "var(--space-2)", marginTop: "var(--space-5)" }}>
          {[
            { rating: 1 as const, label: "שכחתי", color: "var(--error-red)" },
            { rating: 2 as const, label: "קשה", color: "var(--focus-amber)" },
            { rating: 3 as const, label: "טוב", color: "var(--comp-green)" },
            { rating: 4 as const, label: "קל", color: "var(--accent)" },
          ].map(({ rating, label, color }) => (
            <button
              key={rating}
              onClick={() => handleRate(rating)}
              style={{
                padding: "var(--space-3) var(--space-2)", borderRadius: "12px",
                backgroundColor: `color-mix(in srgb, ${color} 12%, var(--bg-elevated))`,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                cursor: "pointer", fontFamily: "var(--font-assistant)", fontSize: "13px",
                color, fontWeight: 600, WebkitTapHighlightColor: "transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const centerLayout: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  padding: "var(--space-6)", minHeight: "60vh",
};
const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h1)", color: "var(--text-primary)",
};
const ghostBtn: React.CSSProperties = {
  padding: "var(--space-3) var(--space-8)", backgroundColor: "transparent", color: "var(--text-secondary)",
  fontFamily: "var(--font-heebo)", fontWeight: 400, fontSize: "var(--ui-size)",
  borderRadius: "10px", border: "1px solid var(--border)", cursor: "pointer",
};
