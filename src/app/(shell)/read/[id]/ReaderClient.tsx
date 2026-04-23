"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RsvpReader } from "@/components/reading/RsvpReader";
import { tokenizeText } from "@/lib/tokenize";
import { getDemoPassage, type DemoPassage, type DemoQuestion } from "@/lib/demo-passages";
import { getDb } from "@/lib/db";
import { saveSession } from "@/lib/session-utils";
import { useRsvpStore } from "@/stores/rsvp";
import type { ProcessedPassage } from "@/types/token";

type PageProps = { params: Promise<{ id: string }> };

export default function ReaderClient({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const wpm = useRsvpStore((s) => s.wpm);

  const [passage, setPassage] = useState<ProcessedPassage | null>(null);
  const [demoPassage, setDemoPassage] = useState<DemoPassage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"reading" | "quiz" | "done">("reading");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    async function load() {
      if (id.startsWith("demo-")) {
        const demo = getDemoPassage(id);
        if (!demo) { setError("הקטע לא נמצא"); return; }
        setDemoPassage(demo);
        setPassage(tokenizeText(demo.body_raw, demo.id, demo.title));
      } else {
        const db = getDb();
        const saved = await db.passages.get(id);
        if (!saved) { setError("הקטע לא נמצא"); return; }
        setPassage(tokenizeText(saved.body_raw, saved.id, saved.title));
      }
    }
    load();
  }, [id]);

  const handleComplete = useCallback(async () => {
    if (!passage) return;
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    const wpmActual = durationSec > 0 ? Math.round((passage.wordCount / durationSec) * 60) : wpm;

    await saveSession({
      passage_id: id,
      mode: "rsvp",
      wpm_target: wpm,
      wpm_actual: wpmActual,
      nikud_mode: null,
      chunk_size: null,
      ended_at: new Date().toISOString(),
      duration_seconds: durationSec,
      words_read: passage.wordCount,
      chars_read: passage.charCount,
      completion_ratio: 1,
      regressions_count: 0,
      pauses_count: 0,
      comprehension_score: null,
      engagement_score: null,
      device_info: null,
    });

    const questions = demoPassage?.questions;
    if (questions && questions.length > 0) {
      setPhase("quiz");
    } else {
      setPhase("done");
    }
  }, [passage, id, wpm, demoPassage]);

  const handleQuizSubmit = useCallback(() => {
    const questions = demoPassage?.questions ?? [];
    let correct = 0;
    for (const q of questions) {
      const ans = quizAnswers[q.id];
      const correctOpt = q.options.find((o) => o.is_correct);
      if (ans && correctOpt && ans === correctOpt.id) correct++;
    }
    setScore({ correct, total: questions.length });
    setPhase("done");
  }, [quizAnswers, demoPassage]);

  if (error) {
    return (
      <div style={centerLayout}>
        <p style={{ color: "var(--error-red)", fontFamily: "var(--font-heebo)" }}>{error}</p>
        <button onClick={() => router.back()} style={ghostBtn}>חזור</button>
      </div>
    );
  }

  if (!passage) {
    return (
      <div style={centerLayout}>
        <p style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-assistant)" }}>...טוען</p>
      </div>
    );
  }

  if (phase === "reading") {
    return (
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <RsvpReader passage={passage} onComplete={handleComplete} />
        <button
          onClick={() => router.back()}
          style={{
            position: "fixed", top: "var(--space-4)", insetInlineStart: "var(--space-4)",
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)", opacity: 0.6,
            zIndex: 200,
          }}
        >← חזור</button>
      </div>
    );
  }

  if (phase === "quiz" && demoPassage?.questions) {
    return (
      <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)" }}>
          שאלות הבנה
        </h1>
        {demoPassage.questions.map((q) => (
          <QuizQuestion
            key={q.id}
            question={q}
            selected={quizAnswers[q.id]}
            onSelect={(optId) => setQuizAnswers((prev) => ({ ...prev, [q.id]: optId }))}
          />
        ))}
        <button
          onClick={handleQuizSubmit}
          disabled={Object.keys(quizAnswers).length < demoPassage.questions.length}
          style={{ ...accentBtn, opacity: Object.keys(quizAnswers).length < demoPassage.questions.length ? 0.5 : 1 }}
        >
          בדוק תשובות
        </button>
      </div>
    );
  }

  // Done screen
  const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
  const wpmActual = durationSec > 0 ? Math.round((passage.wordCount / durationSec) * 60) : wpm;
  return (
    <div style={centerLayout}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
        <div style={{ fontSize: "48px" }}>✓</div>
        <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h1)", color: "var(--text-primary)" }}>
          סיימת!
        </h1>

        {score && (
          <div style={{
            backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "16px", padding: "var(--space-5)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "100%", maxWidth: "320px",
          }}>
            <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", textAlign: "center" }}>
              הבנת הנקרא: <strong style={{ color: score.correct >= score.total * 0.7 ? "var(--comp-green)" : "var(--focus-amber)" }}>
                {score.correct}/{score.total}
              </strong>
            </p>
          </div>
        )}

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)",
          width: "100%", maxWidth: "320px",
        }}>
          {[
            { label: "מילים", value: passage.wordCount.toLocaleString("he-IL") },
            { label: "מ״ד", value: String(wpmActual) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "12px", padding: "var(--space-4)", textAlign: "center",
            }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr" }}>{value}</p>
              <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>{label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => { setPhase("reading"); startTimeRef.current = Date.now(); }} style={accentBtn}>
            קרא שוב
          </button>
          <button onClick={() => router.push("/read")} style={ghostBtn}>
            קטע חדש
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizQuestion({ question, selected, onSelect }: {
  question: DemoQuestion;
  selected: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{
      backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: "14px", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)",
    }}>
      <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6 }}>
        {question.question_text}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-3)",
              backgroundColor: selected === opt.id ? "color-mix(in srgb, var(--accent) 12%, var(--bg-elevated))" : "var(--bg-elevated)",
              border: `1px solid ${selected === opt.id ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "10px", padding: "var(--space-3)", textAlign: "right", cursor: "pointer", width: "100%",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "12px",
              color: selected === opt.id ? "var(--accent)" : "var(--text-tertiary)",
              minWidth: "18px", fontWeight: 700,
            }}>{opt.id}</span>
            <span style={{ fontFamily: "var(--font-heebo)", fontSize: "14px", color: "var(--text-primary)", flex: 1, textAlign: "right" }}>
              {opt.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const centerLayout: React.CSSProperties = {
  flex: 1, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  padding: "var(--space-6)", minHeight: "60vh",
};
const accentBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "var(--space-3) var(--space-8)",
  backgroundColor: "var(--accent)", color: "#fff",
  fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "var(--ui-size)",
  borderRadius: "10px", border: "none", cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "var(--space-3) var(--space-8)",
  backgroundColor: "transparent", color: "var(--text-secondary)",
  fontFamily: "var(--font-heebo)", fontWeight: 400, fontSize: "var(--ui-size)",
  borderRadius: "10px", border: "1px solid var(--border)", cursor: "pointer",
};
