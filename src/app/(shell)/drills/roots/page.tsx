"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Question = {
  word: string;
  nikud?: string;
  meaning: string;
  options: string[];
  correct: string;
};

const QUESTIONS: Question[] = [
  { word: "כתיבה", meaning: "מעשה רישום", options: ["כ-ת-ב", "כ-ת-ה", "ק-ת-ב", "כ-ת-ן"], correct: "כ-ת-ב" },
  { word: "ספרייה", meaning: "מקום שמירת ספרים", options: ["ס-פ-ר", "ס-פ-ה", "ש-פ-ר", "ס-ב-ר"], correct: "ס-פ-ר" },
  { word: "מדבר", meaning: "מקום ללא מים", options: ["ד-ב-ר", "מ-ד-ב", "ד-ו-ב", "ד-ב-ק"], correct: "ד-ב-ר" },
  { word: "ילדות", meaning: "שנות הילד", options: ["י-ל-ד", "ו-ל-ד", "י-ל-ה", "כ-ל-ד"], correct: "י-ל-ד" },
  { word: "מוזיקאי", meaning: "נגן", options: ["מ-ו-ז", "נ-ג-ן", "ז-מ-ר", "נ-ז-ם"], correct: "ז-מ-ר" },
  { word: "שמחה", meaning: "רגש חיובי", options: ["ש-מ-ח", "ש-מ-ה", "ש-מ-ן", "ס-מ-ח"], correct: "ש-מ-ח" },
  { word: "ברכה", meaning: "איחול טוב", options: ["ב-ר-ך", "ב-ר-כ", "פ-ר-ך", "ב-ר-ח"], correct: "ב-ר-ך" },
  { word: "לימוד", meaning: "הפעולה של ללמוד", options: ["ל-מ-ד", "ל-ו-מ", "ל-מ-ה", "ל-מ-ן"], correct: "ל-מ-ד" },
  { word: "עבודה", meaning: "מלאכה", options: ["ע-ב-ד", "ע-ב-ה", "ע-ו-ד", "ע-פ-ד"], correct: "ע-ב-ד" },
  { word: "שמירה", meaning: "פעולת שמירה", options: ["ש-מ-ר", "ש-מ-ה", "ש-ו-ר", "ש-מ-ן"], correct: "ש-מ-ר" },
  { word: "פתיחה", meaning: "הפעולה של לפתוח", options: ["פ-ת-ח", "פ-ת-ה", "פ-ת-ק", "פ-ת-ר"], correct: "פ-ת-ח" },
  { word: "גדולה", meaning: "תיאור הגודל", options: ["ג-ד-ל", "ג-ד-ה", "ג-ד-ר", "ג-ל-ד"], correct: "ג-ד-ל" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type Phase = "intro" | "playing" | "done";

export default function RootsPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const start = useCallback(() => {
    setQuestions(shuffle(QUESTIONS).slice(0, 8));
    setIdx(0); setSelected(null); setCorrect(0); setRevealed(false);
    setPhase("playing");
  }, []);

  const handleSelect = useCallback((opt: string) => {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
    if (opt === questions[idx]!.correct) setCorrect((p) => p + 1);
  }, [revealed, questions, idx]);

  const handleNext = useCallback(() => {
    if (idx + 1 >= questions.length) {
      setPhase("done");
    } else {
      setIdx((p) => p + 1);
      setSelected(null);
      setRevealed(false);
    }
  }, [idx, questions.length]);

  const q = questions[idx];

  if (phase === "intro") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{ fontSize: "48px" }}>🌿</div>
          <h1 style={titleStyle}>זיהוי שורשים</h1>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "var(--ui-size)", maxWidth: "280px", lineHeight: 1.6 }}>
            בחר את השורש התלת-אותיות הנכון של המילה המוצגת.
          </p>
          <button onClick={start} style={accentBtn}>התחל</button>
          <button onClick={() => router.back()} style={ghostLink}>← חזור</button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
          <div style={{ fontSize: "48px" }}>{pct >= 80 ? "🌟" : pct >= 60 ? "👍" : "💪"}</div>
          <h1 style={titleStyle}>סיימת!</h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: 700, color: pct >= 80 ? "var(--comp-green)" : pct >= 60 ? "var(--focus-amber)" : "var(--root-red)" }}>
            {correct}/{questions.length}
          </p>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "14px" }}>
            {pct >= 80 ? "מצוין! שולטת בשורשים." : pct >= 60 ? "טוב! יש מקום לשיפור." : "אל תתייאש, כך לומדים שורשים."}
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button onClick={start} style={accentBtn}>שחק שוב</button>
            <button onClick={() => router.back()} style={ghostBtn}>חזור</button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: "420px", margin: "0 auto", width: "100%" }}>
      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => setPhase("intro")} style={ghostLink}>← עצור</button>
        <div style={{ display: "flex", gap: "4px" }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              width: "8px", height: "8px", borderRadius: "50%",
              backgroundColor: i < idx ? "var(--comp-green)" : i === idx ? "var(--accent)" : "var(--border)",
            }} />
          ))}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-tertiary)" }}>
          <bdi>{idx + 1}</bdi>/<bdi>{questions.length}</bdi>
        </span>
      </div>

      {/* Word card */}
      <div style={{
        backgroundColor: "var(--bg-surface)", borderRadius: "20px", padding: "var(--space-8)",
        textAlign: "center", border: "1px solid var(--border)",
      }}>
        <p style={{ fontFamily: "var(--font-heebo)", fontSize: "clamp(32px,8vw,52px)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-2)", direction: "rtl" }}>
          {q.word}
        </p>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "14px", color: "var(--text-tertiary)" }}>{q.meaning}</p>
      </div>

      {/* Options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        {q.options.map((opt) => {
          const isSelected = selected === opt;
          const isCorrect = revealed && opt === q.correct;
          const isWrong = revealed && isSelected && opt !== q.correct;
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              style={{
                padding: "var(--space-4)",
                backgroundColor: isCorrect
                  ? "color-mix(in srgb, var(--comp-green) 20%, var(--bg-elevated))"
                  : isWrong
                  ? "color-mix(in srgb, var(--error-red) 15%, var(--bg-elevated))"
                  : "var(--bg-surface)",
                border: `2px solid ${isCorrect ? "var(--comp-green)" : isWrong ? "var(--error-red)" : isSelected ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "14px",
                fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700,
                color: isCorrect ? "var(--comp-green)" : isWrong ? "var(--error-red)" : "var(--text-primary)",
                cursor: "pointer", direction: "rtl",
                WebkitTapHighlightColor: "transparent",
                transition: "background-color 0.15s, border-color 0.15s",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation / next */}
      {revealed && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{
            backgroundColor: "var(--bg-surface)", borderRadius: "12px",
            padding: "var(--space-4)", border: "1px solid var(--border)",
            borderInlineStart: `3px solid ${selected === q.correct ? "var(--comp-green)" : "var(--error-red)"}`,
          }}>
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {selected === q.correct
                ? `נכון! השורש ${q.correct} מופיע במילה "${q.word}".`
                : `השורש הנכון הוא ${q.correct}.`}
            </p>
          </div>
          <button onClick={handleNext} style={accentBtn}>
            {idx + 1 < questions.length ? "הבא ←" : "סיים"}
          </button>
        </div>
      )}
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
  fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)", color: "var(--text-tertiary)", padding: 0,
};
