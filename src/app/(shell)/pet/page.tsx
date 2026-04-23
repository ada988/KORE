"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DEMO_PASSAGES } from "@/lib/demo-passages";
import { IconTarget, IconCheck } from "@/components/ui/Icons";
import * as haptics from "@/lib/haptics";

/**
 * PET (Psychometric Entrance Test) simulation mode.
 * Matches the Israeli exam's reading-section format:
 * - 400-600 word unpointed passage
 * - 5-6 comprehension questions
 * - 6-minute timer
 * - "Question-directed reading" workflow (קריאה מכוונת שאלה) — questions
 *   shown FIRST, then passage, per every prep institute's method.
 */

const PET_TIME_SEC = 6 * 60;

type Phase = "intro" | "questions_preview" | "reading" | "quiz" | "done";

export default function PetPage() {
  const router = useRouter();
  const petPassages = DEMO_PASSAGES.filter(
    (p) => p.difficulty_band === "pet" || (p.questions?.length ?? 0) >= 2,
  );

  const [phase, setPhase] = useState<Phase>("intro");
  const [passageIdx, setPassageIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(PET_TIME_SEC);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const tickRef = useRef<number | null>(null);

  const passage = petPassages[passageIdx];

  useEffect(() => {
    if (phase !== "reading" && phase !== "quiz") {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          if (tickRef.current !== null) window.clearInterval(tickRef.current);
          haptics.error();
          setPhase("done");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
    };
  }, [phase]);

  const start = useCallback(() => {
    setSecLeft(PET_TIME_SEC);
    setPhase("questions_preview");
    haptics.tap();
  }, []);

  const submitQuiz = useCallback(() => {
    if (!passage?.questions) return;
    let correct = 0;
    for (const q of passage.questions) {
      const ans = quizAnswers[q.id];
      const correctOpt = q.options.find((o) => o.is_correct);
      if (ans && correctOpt && ans === correctOpt.id) correct++;
    }
    setScore({ correct, total: passage.questions.length });
    setPhase("done");
    haptics.chime();
  }, [passage, quizAnswers]);

  const nextPassage = useCallback(() => {
    if (passageIdx + 1 >= petPassages.length) {
      router.push("/home");
      return;
    }
    setPassageIdx((i) => i + 1);
    setQuizAnswers({});
    setScore(null);
    setSecLeft(PET_TIME_SEC);
    setPhase("intro");
  }, [passageIdx, petPassages.length, router]);

  if (petPassages.length === 0) {
    return (
      <div style={centerLayout}>
        <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-tertiary)" }}>
          אין קטעים עם שאלות פסיכומטרי בספרייה
        </p>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", maxWidth: "420px" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "20px",
            backgroundColor: "color-mix(in srgb, var(--accent) 15%, var(--bg-elevated))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconTarget size={34} style={{ color: "var(--accent)" }} />
          </div>
          <h1 style={titleStyle}>סימולציית פסיכומטרי</h1>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            קטע קריאה אחד, <bdi>{passage?.questions?.length ?? 5}</bdi> שאלות, <bdi>6</bdi> דקות.
            <br />
            קרא את השאלות קודם, ואז את הקטע — זו שיטת "קריאה מכוונת שאלה".
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-tertiary)" }}>
            קטע <bdi>{passageIdx + 1}</bdi>/<bdi>{petPassages.length}</bdi>: {passage?.title}
          </p>
          <button onClick={start} style={accentBtn}>התחל</button>
          <button onClick={() => router.back()} style={ghostLink}>חזור</button>
        </div>
      </div>
    );
  }

  if (phase === "questions_preview" && passage?.questions) {
    return (
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <PetTimer secLeft={secLeft} />
        <h2 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h3)", color: "var(--text-primary)" }}>
          שאלות הקטע
        </h2>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>
          קרא עכשיו לפני שפותחים את הקטע
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {passage.questions.map((q, i) => (
            <div key={q.id} style={{
              backgroundColor: "var(--bg-surface)", borderRadius: "12px",
              padding: "var(--space-4)", border: "1px solid var(--border)",
            }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px" }}>
                <bdi>{i + 1}</bdi>
              </p>
              <p style={{ fontFamily: "var(--font-heebo)", fontSize: "15px", color: "var(--text-primary)", lineHeight: 1.6, direction: "rtl" }}>
                {q.question_text}
              </p>
            </div>
          ))}
        </div>
        <button onClick={() => { setPhase("reading"); haptics.tap(); }} style={accentBtn}>
          פתח את הקטע
        </button>
      </div>
    );
  }

  if (phase === "reading" && passage) {
    return (
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <PetTimer secLeft={secLeft} />
        <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)" }}>
          {passage.title}
        </h1>
        <div style={{
          fontFamily: "var(--reading-font, var(--font-heebo))",
          fontSize: "var(--reading-size)", lineHeight: 1.8,
          color: "var(--text-primary)", direction: "rtl",
          whiteSpace: "pre-wrap",
        }}>
          {passage.body_raw}
        </div>
        <button onClick={() => { setPhase("quiz"); haptics.tap(); }} style={accentBtn}>
          עבור לשאלות
        </button>
      </div>
    );
  }

  if (phase === "quiz" && passage?.questions) {
    return (
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <PetTimer secLeft={secLeft} />
        <h2 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)" }}>
          שאלות
        </h2>
        {passage.questions.map((q) => (
          <div key={q.id} style={{
            backgroundColor: "var(--bg-surface)", borderRadius: "12px",
            padding: "var(--space-4)", border: "1px solid var(--border)",
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
          }}>
            <p style={{ fontFamily: "var(--font-heebo)", fontSize: "15px", color: "var(--text-primary)", lineHeight: 1.6, direction: "rtl" }}>
              {q.question_text}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {q.options.map((opt) => {
                const selected = quizAnswers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => { setQuizAnswers((p) => ({ ...p, [q.id]: opt.id })); haptics.tap(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "var(--space-2) var(--space-3)",
                      backgroundColor: selected ? "color-mix(in srgb, var(--accent) 12%, var(--bg-elevated))" : "var(--bg-elevated)",
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "8px", cursor: "pointer", textAlign: "right",
                      direction: "rtl",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: selected ? "var(--accent)" : "var(--text-tertiary)", fontWeight: 700, minWidth: "16px" }}>
                      {opt.id}
                    </span>
                    <span style={{ fontFamily: "var(--font-heebo)", fontSize: "14px", color: "var(--text-primary)" }}>
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button
          onClick={submitQuiz}
          disabled={Object.keys(quizAnswers).length < passage.questions.length}
          style={{ ...accentBtn, opacity: Object.keys(quizAnswers).length < passage.questions.length ? 0.5 : 1 }}
        >
          בדוק תשובות
        </button>
      </div>
    );
  }

  // done
  const timeUsed = PET_TIME_SEC - secLeft;
  const mm = Math.floor(timeUsed / 60);
  const ss = timeUsed % 60;
  const pct = score ? (score.correct / score.total) * 100 : 0;

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
        {score && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "48px", fontWeight: 700, color: pct >= 70 ? "var(--comp-green)" : "var(--focus-amber)", fontVariantNumeric: "tabular-nums" }}>
            {score.correct}/{score.total}
          </p>
        )}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
          זמן: {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button onClick={nextPassage} style={accentBtn}>
            {passageIdx + 1 < petPassages.length ? "קטע הבא" : "סיים"}
          </button>
          <button onClick={() => router.push("/home")} style={ghostBtn}>חזור</button>
        </div>
      </div>
    </div>
  );
}

function PetTimer({ secLeft }: { secLeft: number }) {
  const mm = String(Math.floor(secLeft / 60)).padStart(2, "0");
  const ss = String(secLeft % 60).padStart(2, "0");
  const low = secLeft < 60;
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 10,
      display: "flex", justifyContent: "center", alignItems: "center",
      padding: "var(--space-2)",
      backgroundColor: low ? "color-mix(in srgb, var(--error-red) 14%, var(--bg))" : "var(--bg)",
      borderBottom: "1px solid var(--border)",
      fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700,
      color: low ? "var(--error-red)" : "var(--text-primary)",
      fontVariantNumeric: "tabular-nums", direction: "ltr",
    }}>
      {mm}:{ss}
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
  padding: "var(--space-4) var(--space-8)", backgroundColor: "var(--accent)", color: "#fff",
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
