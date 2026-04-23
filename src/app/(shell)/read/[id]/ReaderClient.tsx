"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RsvpReader } from "@/components/reading/RsvpReader";
import { PaginatedReader } from "@/components/reading/PaginatedReader";
import { tokenizeText } from "@/lib/tokenize";
import { getDemoPassage, type DemoPassage, type DemoQuestion } from "@/lib/demo-passages";
import { getDb } from "@/lib/db";
import { saveSession, getBookmark, setBookmark, clearBookmark, checkAchievements } from "@/lib/session-utils";
import { useRsvpStore } from "@/stores/rsvp";
import { useAppStore } from "@/stores/app";
import { IconCheck, IconBookmark } from "@/components/ui/Icons";
import * as haptics from "@/lib/haptics";
import { generateQuestions, type AIQuestion } from "@/lib/ai-questions";
import type { ProcessedPassage } from "@/types/token";

type PageProps = { params: Promise<{ id: string }> };

export default function ReaderClient({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const wpm = useRsvpStore((s) => s.wpm);
  const readingMode = useRsvpStore((s) => s.readingMode);
  const setReadingMode = useRsvpStore((s) => s.setReadingMode);
  const anthropicKey = useAppStore((s) => s.anthropicKey);

  const [passage, setPassage] = useState<ProcessedPassage | null>(null);
  const [passageBody, setPassageBody] = useState<string>("");
  const [demoPassage, setDemoPassage] = useState<DemoPassage | null>(null);
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[] | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"reading" | "quiz" | "done">("reading");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [questionResults, setQuestionResults] = useState<Record<string, { correct: boolean; correctId: string }>>({});
  const [startIdx, setStartIdx] = useState<number>(0);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [newAchievements, setNewAchievements] = useState<{ title: string }[]>([]);
  const startTimeRef = useRef(Date.now());
  const bookmarkSavedRef = useRef(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    async function load() {
      const bookmark = getBookmark(id);
      if (bookmark !== null) setStartIdx(bookmark);

      if (id.startsWith("demo-")) {
        const demo = getDemoPassage(id);
        if (!demo) { setError("הקטע לא נמצא"); return; }
        setDemoPassage(demo);
        setPassage(tokenizeText(demo.body_raw, demo.id, demo.title));
        setPassageBody(demo.body_raw);
      } else {
        const db = getDb();
        const saved = await db.passages.get(id);
        if (!saved) { setError("הקטע לא נמצא"); return; }
        setPassage(tokenizeText(saved.body_raw, saved.id, saved.title));
        setPassageBody(saved.body_raw);
      }
    }
    load();
  }, [id]);

  // Persist bookmark as user reads (throttled via flag)
  useEffect(() => {
    if (!passage) return;
    if (currentIdx <= 1) return;
    if (currentIdx >= passage.tokens.length - 1) return;
    setBookmark(id, currentIdx);
  }, [currentIdx, id, passage]);

  const handleComplete = useCallback(async () => {
    if (!passage) return;
    if (bookmarkSavedRef.current) return;
    bookmarkSavedRef.current = true;

    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    const wpmActual = durationSec > 0 ? Math.round((passage.wordCount / durationSec) * 60) : wpm;

    await saveSession({
      passage_id: id,
      mode: readingMode === "rsvp" ? "rsvp" : "paginated",
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

    clearBookmark(id);
    const earned = await checkAchievements();
    setNewAchievements(earned.map((a) => ({ title: a.title })));

    const questions = demoPassage?.questions;
    if (questions && questions.length > 0) {
      setPhase("quiz");
    } else {
      setPhase("done");
    }
  }, [passage, id, wpm, demoPassage, readingMode]);

  const handleGenerateAIQuestions = useCallback(async () => {
    if (!passage || !anthropicKey.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const qs = await generateQuestions({
        apiKey: anthropicKey,
        passageTitle: passage.title,
        passageBody,
      });
      setAiQuestions(qs);
      setPhase("quiz");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      setAiError(msg);
      haptics.error();
    } finally {
      setAiGenerating(false);
    }
  }, [passage, anthropicKey, passageBody]);

  const activeQuestions = demoPassage?.questions ?? (aiQuestions ? aiQuestions.map((q) => ({
    id: q.id,
    bloom_level: q.bloom_level as "remember" | "understand" | "analyze" | "evaluate",
    question_text: q.question_text,
    options: q.options,
    explanation: q.explanation,
  })) : null);

  const handleQuizSubmit = useCallback(() => {
    const questions = activeQuestions ?? [];
    let correct = 0;
    const results: Record<string, { correct: boolean; correctId: string }> = {};
    for (const q of questions) {
      const ans = quizAnswers[q.id];
      const correctOpt = q.options.find((o) => o.is_correct);
      const isCorrect = !!(ans && correctOpt && ans === correctOpt.id);
      if (isCorrect) correct++;
      results[q.id] = { correct: isCorrect, correctId: correctOpt?.id ?? "" };
    }
    setQuestionResults(results);
    setScore({ correct, total: questions.length });
    setPhase("done");
    haptics.chime();
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
        <div className="skeleton" style={{ width: "60%", height: "24px", marginBottom: "var(--space-3)" }} />
        <div className="skeleton" style={{ width: "40%", height: "14px" }} />
      </div>
    );
  }

  if (phase === "reading") {
    const hasBookmark = startIdx > 0;
    return (
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {readingMode === "rsvp" ? (
          <RsvpReader
            passage={passage}
            onComplete={handleComplete}
            onIdxChange={setCurrentIdx}
            startIdx={startIdx}
          />
        ) : (
          <PaginatedReader
            passage={passage}
            onComplete={handleComplete}
            startIdx={startIdx}
            onIdxChange={setCurrentIdx}
          />
        )}

        <div style={{
          position: "fixed", top: "var(--space-3)", insetInlineStart: "var(--space-3)",
          display: "flex", gap: "var(--space-2)", zIndex: 200,
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "10px", padding: "6px 12px", cursor: "pointer",
              fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-secondary)",
            }}
          >
            ← חזור
          </button>
          <button
            onClick={() => { setReadingMode(readingMode === "rsvp" ? "paginated" : "rsvp"); haptics.tap(); }}
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "10px", padding: "6px 12px", cursor: "pointer",
              fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-secondary)",
            }}
          >
            {readingMode === "rsvp" ? "עבור לרגיל" : "עבור ל-RSVP"}
          </button>
        </div>

        {hasBookmark && (
          <div style={{
            position: "fixed", top: "var(--space-3)", insetInlineEnd: "var(--space-3)",
            background: "color-mix(in srgb, var(--focus-amber) 18%, var(--bg-surface))",
            border: "1px solid var(--focus-amber)",
            borderRadius: "10px", padding: "5px 10px", zIndex: 200,
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            <IconBookmark size={12} style={{ color: "var(--focus-amber)" }} />
            <span style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--focus-amber)", fontWeight: 600 }}>
              ממשיך מהסימניה
            </span>
          </div>
        )}
      </div>
    );
  }

  if (phase === "quiz" && activeQuestions) {
    return (
      <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)" }}>
          שאלות הבנה
          {aiQuestions && <span style={{ marginInlineStart: "8px", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent)", fontWeight: 400 }}>AI</span>}
        </h1>
        {activeQuestions.map((q) => (
          <QuizQuestion
            key={q.id}
            question={q as DemoQuestion}
            selected={quizAnswers[q.id]}
            onSelect={(optId) => { setQuizAnswers((prev) => ({ ...prev, [q.id]: optId })); haptics.tap(); }}
          />
        ))}
        <button
          onClick={handleQuizSubmit}
          disabled={Object.keys(quizAnswers).length < activeQuestions.length}
          style={{ ...accentBtn, opacity: Object.keys(quizAnswers).length < activeQuestions.length ? 0.5 : 1 }}
        >
          בדוק תשובות
        </button>
      </div>
    );
  }

  const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
  const wpmActual = durationSec > 0 ? Math.round((passage.wordCount / durationSec) * 60) : wpm;
  const cpm = Math.round(passage.charCount / Math.max(1, durationSec) * 60);
  const scoreColor = score ? (score.correct >= score.total * 0.7 ? "var(--comp-green)" : "var(--focus-amber)") : "var(--comp-green)";
  return (
    <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-5)", overflowY: "auto" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", textAlign: "center" }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          backgroundColor: `color-mix(in srgb, ${scoreColor} 15%, var(--bg-elevated))`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconCheck size={28} style={{ color: scoreColor }} />
        </div>
        <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h1)", color: "var(--text-primary)" }}>
          סיימת!
        </h1>
      </div>

      {newAchievements.length > 0 && (
        <div style={{
          backgroundColor: "color-mix(in srgb, var(--focus-amber) 10%, var(--bg-surface))",
          border: "1px solid var(--focus-amber)",
          borderRadius: "14px", padding: "var(--space-4)",
          display: "flex", flexDirection: "column", gap: "var(--space-2)",
        }}>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", fontWeight: 700, color: "var(--focus-amber)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            הישג חדש
          </p>
          {newAchievements.map((a) => (
            <p key={a.title} style={{ fontFamily: "var(--font-heebo)", fontSize: "15px", color: "var(--text-primary)" }}>
              🏆 {a.title}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        {[
          { label: "מילים", value: passage.wordCount.toLocaleString("he-IL") },
          { label: "מ״ד", value: String(wpmActual) },
          { label: "תווים/דק׳", value: String(cpm) },
          ...(score ? [{ label: "הבנה", value: `${score.correct}/${score.total}` }] : []),
        ].map(({ label, value }) => (
          <div key={label} style={{
            backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "12px", padding: "var(--space-4)", textAlign: "center",
          }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr", fontVariantNumeric: "tabular-nums" }}>{value}</p>
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* AI quiz offer when no pre-baked quiz and user has key */}
      {!demoPassage?.questions && !score && !aiQuestions && anthropicKey.trim() && (
        <div style={{
          backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "14px", padding: "var(--space-4)",
          display: "flex", alignItems: "center", gap: "var(--space-3)",
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 600, fontSize: "15px", color: "var(--text-primary)", marginBottom: "2px" }}>
              שאלות הבנה עם AI
            </p>
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>
              בדוק את הבנתך עם Claude
            </p>
          </div>
          <button
            onClick={handleGenerateAIQuestions}
            disabled={aiGenerating}
            style={{ ...accentBtn, padding: "var(--space-2) var(--space-5)", fontSize: "14px", opacity: aiGenerating ? 0.6 : 1 }}
          >
            {aiGenerating ? "...יוצר" : "צור שאלות"}
          </button>
        </div>
      )}
      {aiError && (
        <div style={{
          backgroundColor: "color-mix(in srgb, var(--error-red) 10%, var(--bg-surface))",
          border: "1px solid var(--error-red)", borderRadius: "10px", padding: "var(--space-3)",
          fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--error-red)",
        }}>
          שגיאה: {aiError}. בדוק את מפתח ה-API בהגדרות.
        </div>
      )}

      {score && activeQuestions && Object.keys(questionResults).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <h2 style={{ fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            תשובות
          </h2>
          {(activeQuestions ?? []).map((q) => {
            const result = questionResults[q.id];
            const userAnswerId = quizAnswers[q.id];
            const correctOpt = q.options.find((o) => o.id === result?.correctId);
            const userOpt = q.options.find((o) => o.id === userAnswerId);
            const isCorrect = result?.correct ?? false;
            const borderColor = isCorrect ? "var(--comp-green)" : "var(--error-red)";
            return (
              <div key={q.id} style={{
                backgroundColor: "var(--bg-surface)", borderRadius: "12px",
                padding: "var(--space-4)", border: "1px solid var(--border)",
                borderInlineStart: `3px solid ${borderColor}`,
              }}>
                <p style={{ fontFamily: "var(--font-heebo)", fontSize: "14px", color: "var(--text-primary)", marginBottom: "var(--space-2)", lineHeight: 1.5 }}>
                  {q.question_text}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {!isCorrect && userOpt && (
                    <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--error-red)" }}>
                      ✕ תשובתך: {userOpt.text}
                    </p>
                  )}
                  <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--comp-green)", display: "flex", alignItems: "center", gap: "5px" }}>
                    <IconCheck size={12} style={{ color: "var(--comp-green)", flexShrink: 0 }} />
                    {isCorrect ? "נכון" : `התשובה הנכונה: ${correctOpt?.text ?? ""}`}
                  </p>
                  {q.explanation && (
                    <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                      {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => { setPhase("reading"); startTimeRef.current = Date.now(); bookmarkSavedRef.current = false; setStartIdx(0); }} style={accentBtn}>
          קרא שוב
        </button>
        <button onClick={() => router.push("/read")} style={ghostBtn}>
          קטע חדש
        </button>
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
