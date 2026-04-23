"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app";
import { useRsvpStore } from "@/stores/rsvp";
import * as haptics from "@/lib/haptics";
import { IconCheck, IconSpeed } from "@/components/ui/Icons";

/**
 * Speed calibration onboarding — measures user's natural reading pace
 * by presenting a standard 150-word Hebrew passage in classic paginated mode
 * and timing from start to end tap. No WPM reveal until done (Klimovich 2023
 * showed metacognitive awareness alone produces gains; we don't want to bias
 * the measurement).
 */

const CALIBRATION_PASSAGE = `השפה העברית היא אחת השפות העתיקות בעולם, ובה בעת אחת הצעירות. היא נכתבת ונקראת מימין לשמאל, ומבוססת על מערכת אותיות עיצוריות בלבד, ללא אותיות ניקוד. אוצר המילים העברי נבנה סביב שורשים בני שלוש אותיות, שמהם נגזרים בניינים ומשקלים שונים המעניקים לכל שורש משמעויות רבות.

במשך כאלפיים שנה שימשה העברית בעיקר כשפת תפילה ולימוד, ולא כשפה מדוברת יומיומית. בסוף המאה התשע-עשרה הוביל אליעזר בן-יהודה את תהליך החייאת השפה, והפך אותה שוב לשפה חיה ומדוברת. כיום העברית היא שפה רשמית במדינת ישראל, ובה כותבים ספרים, עיתונים וקוד מחשב, ובה מדברים מיליוני אנשים בכל רגע נתון.

קריאה בעברית דורשת מהקורא לפענח מילים ללא ניקוד, ולכן התפתחה מיומנות יוצאת דופן של הסקה הקשרית. קורא מיומן מזהה את המשמעות הנכונה מתוך כל האפשרויות במהירות, על סמך התחביר והרקע של המשפט.`;

const PASSAGE_WORDS = CALIBRATION_PASSAGE.split(/\s+/).filter(Boolean).length;

type Phase = "welcome" | "reading" | "result";

export default function OnboardingPage() {
  const router = useRouter();
  const setBaselineWpm = useAppStore((s) => s.setBaselineWpm);
  const setWpm = useRsvpStore((s) => s.setWpm);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [phase, setPhase] = useState<Phase>("welcome");
  const [wpm, setMeasuredWpm] = useState<number | null>(null);
  const startMsRef = useRef<number>(0);

  const beginReading = useCallback(() => {
    startMsRef.current = performance.now();
    setPhase("reading");
    haptics.tap();
  }, []);

  const finishReading = useCallback(() => {
    const sec = (performance.now() - startMsRef.current) / 1000;
    const measured = Math.round((PASSAGE_WORDS / sec) * 60);
    const clamped = Math.min(600, Math.max(80, measured));
    setMeasuredWpm(clamped);
    setBaselineWpm(clamped);
    // Default reading WPM: 85% of baseline to allow comprehension headroom
    setWpm(Math.round(clamped * 0.85 / 25) * 25);
    setPhase("result");
    haptics.success();
  }, [setBaselineWpm, setWpm]);

  const done = useCallback(() => {
    completeOnboarding();
    router.push("/home");
  }, [completeOnboarding, router]);

  if (phase === "welcome") {
    return (
      <div style={centerLayout}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)", maxWidth: "440px" }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "22px",
            backgroundColor: "color-mix(in srgb, var(--accent) 15%, var(--bg-elevated))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconSpeed size={36} style={{ color: "var(--accent)" }} />
          </div>
          <h1 style={titleStyle}>ברוך הבא לקוֹרֵא</h1>
          <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-secondary)", fontSize: "15px", lineHeight: 1.7 }}>
            לפני שנתחיל, נמדוד את מהירות הקריאה הטבעית שלך.
            <br />
            קטע קצר של <bdi>{PASSAGE_WORDS}</bdi> מילים.
            קרא בקצב שלך, עצור בסוף.
          </p>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)", maxWidth: "380px", lineHeight: 1.6 }}>
            <strong>הערה מדעית:</strong> קריאה טובה נעה בין 200–400 מ״ד עם הבנה מלאה.
            מעל 500 מ״ד זה כבר דילוג, לא קריאה.
          </p>
          <button onClick={beginReading} style={accentBtn}>התחל מדידה</button>
          <button onClick={done} style={ghostLink}>דלג לעת עתה</button>
        </div>
      </div>
    );
  }

  if (phase === "reading") {
    return (
      <div style={{ padding: "var(--space-5)", maxWidth: "620px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-5)", minHeight: "100vh" }}>
        <CalibTimer startMs={startMsRef.current} />
        <div
          style={{
            fontFamily: "var(--reading-font, var(--font-heebo))",
            fontSize: "var(--reading-size)", lineHeight: 1.8,
            color: "var(--text-primary)", direction: "rtl",
            whiteSpace: "pre-wrap",
          }}
        >
          {CALIBRATION_PASSAGE}
        </div>
        <button onClick={finishReading} style={accentBtn}>סיימתי לקרוא</button>
      </div>
    );
  }

  // result
  const tier =
    wpm! >= 450 ? { label: "מהיר מאוד", color: "var(--accent)" } :
    wpm! >= 350 ? { label: "מהיר", color: "var(--comp-green)" } :
    wpm! >= 250 ? { label: "ממוצע", color: "var(--focus-amber)" } :
    { label: "נוח", color: "var(--text-secondary)" };

  return (
    <div style={centerLayout}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-5)" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          backgroundColor: `color-mix(in srgb, ${tier.color} 15%, var(--bg-elevated))`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconCheck size={36} style={{ color: tier.color }} />
        </div>
        <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-tertiary)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          מהירות הקריאה שלך
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "72px", fontWeight: 700, color: tier.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          <bdi>{wpm}</bdi>
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--text-tertiary)" }}>
          מ״ד · {tier.label}
        </p>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", maxWidth: "340px", lineHeight: 1.7 }}>
          הגדרנו את מהירות ברירת המחדל שלך ל-{Math.round(wpm! * 0.85 / 25) * 25} מ״ד — מעט איטי מהקצב הטבעי, כדי לאפשר הבנה מלאה.
          ניתן לשנות בכל עת.
        </p>
        <button onClick={done} style={accentBtn}>התחל לקרוא</button>
      </div>
    </div>
  );
}

function CalibTimer({ startMs }: { startMs: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);
  const sec = Math.floor((performance.now() - startMs) / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums", direction: "ltr" }}>
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
const ghostLink: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-tertiary)", padding: 0,
};
