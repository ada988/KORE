"use client";

import { useAppStore, type Theme, type FontFamily } from "@/stores/app";
import { useRsvpStore } from "@/stores/rsvp";
import type { OrpMode } from "@/engines/orp";

export default function SettingsPage() {
  const theme = useAppStore((s) => s.theme);
  const fontFamily = useAppStore((s) => s.fontFamily);
  const readingSize = useAppStore((s) => s.readingSize);
  const dailyGoal = useAppStore((s) => s.dailyGoalMinutes);
  const setTheme = useAppStore((s) => s.setTheme);
  const setFontFamily = useAppStore((s) => s.setFontFamily);
  const setReadingSize = useAppStore((s) => s.setReadingSize);
  const setDailyGoal = useAppStore((s) => s.setDailyGoalMinutes);

  const wpm = useRsvpStore((s) => s.wpm);
  const chunkSize = useRsvpStore((s) => s.chunkSize);
  const orpMode = useRsvpStore((s) => s.orpMode);
  const nikudMode = useRsvpStore((s) => s.nikudMode);
  const adaptivePauses = useRsvpStore((s) => s.adaptivePauses);
  const setWpm = useRsvpStore((s) => s.setWpm);
  const setChunkSize = useRsvpStore((s) => s.setChunkSize);
  const setOrpMode = useRsvpStore((s) => s.setOrpMode);
  const setNikudMode = useRsvpStore((s) => s.setNikudMode);
  const setAdaptivePauses = useRsvpStore((s) => s.setAdaptivePauses);

  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <h1 style={pageTitle}>הגדרות</h1>

      {/* Appearance */}
      <Section title="מראה">
        <SegmentedControl
          label="ערכת צבעים"
          options={[
            { value: "auto", label: "אוטומטי" },
            { value: "dark", label: "כהה" },
            { value: "light", label: "בהיר" },
          ]}
          value={theme}
          onChange={(v) => setTheme(v as Theme)}
        />
        <SegmentedControl
          label="גופן קריאה"
          options={[
            { value: "heebo", label: "Heebo" },
            { value: "frank", label: "Frank" },
            { value: "assistant", label: "Assistant" },
            { value: "rubik", label: "Rubik" },
          ]}
          value={fontFamily}
          onChange={(v) => setFontFamily(v as FontFamily)}
        />
        <SliderRow
          label="גודל גופן"
          value={readingSize}
          min={16} max={32} step={2}
          display={`${readingSize}px`}
          onChange={setReadingSize}
        />
      </Section>

      {/* Reading */}
      <Section title="קריאת RSVP">
        <SliderRow
          label="מהירות (מ״ד)"
          value={wpm}
          min={100} max={800} step={25}
          display={String(wpm)}
          onChange={setWpm}
        />
        <SegmentedControl
          label="גודל קטע"
          options={[
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
          ]}
          value={String(chunkSize)}
          onChange={(v) => setChunkSize(Number(v))}
        />
        <SegmentedControl
          label="מצב ORP"
          options={[
            { value: "root", label: "שורש" },
            { value: "classic", label: "קלאסי" },
            { value: "fixed", label: "קבוע" },
          ]}
          value={orpMode}
          onChange={(v) => setOrpMode(v as OrpMode)}
        />
        <SegmentedControl
          label="ניקוד"
          options={[
            { value: "off", label: "ללא" },
            { value: "partial", label: "חלקי" },
            { value: "full", label: "מלא" },
          ]}
          value={nikudMode}
          onChange={(v) => setNikudMode(v as "off" | "partial" | "full")}
        />
        <ToggleRow
          label="השהיות אדפטיביות"
          sublabel="האטה בסימני פיסוק ומילים נדירות"
          value={adaptivePauses}
          onChange={setAdaptivePauses}
        />
      </Section>

      {/* Goals */}
      <Section title="יעדים">
        <SliderRow
          label="יעד יומי (דקות)"
          value={dailyGoal}
          min={5} max={120} step={5}
          display={`${dailyGoal} דק׳`}
          onChange={setDailyGoal}
        />
      </Section>

      {/* About */}
      <Section title="אודות">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <InfoRow label="גרסה" value="0.1.0 — offline" />
          <InfoRow label="אחסון" value="מקומי בלבד (IndexedDB)" />
          <InfoRow label="מצב" value="ללא שרת · ללא מפתחות" />
        </div>
        <div style={{
          marginTop: "var(--space-4)", backgroundColor: "var(--bg-elevated)",
          borderRadius: "12px", padding: "var(--space-4)",
          borderInlineStart: "3px solid var(--accent)",
        }}>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <strong>לקרוא מהר זה מיתוס. לקרוא טוב יותר זה מדע.</strong>
            <br />
            קוֹרֵא בנוי על מחקר קוגניטיבי, לא על הבטחות שיווקיות.
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{
        fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "14px",
        color: "var(--text-tertiary)", marginBottom: "var(--space-3)",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        {title}
      </h2>
      <div style={{
        backgroundColor: "var(--bg-surface)", borderRadius: "16px",
        border: "1px solid var(--border)", overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

function SegmentedControl({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <RowWrap label={label}>
      <div style={{
        display: "flex", backgroundColor: "var(--bg-elevated)",
        borderRadius: "8px", padding: "2px", gap: "2px",
      }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              backgroundColor: value === opt.value ? "var(--bg-surface)" : "transparent",
              border: value === opt.value ? "1px solid var(--border)" : "1px solid transparent",
              borderRadius: "6px", cursor: "pointer",
              fontFamily: "var(--font-assistant)", fontSize: "13px",
              color: value === opt.value ? "var(--text-primary)" : "var(--text-tertiary)",
              fontWeight: value === opt.value ? 600 : 400,
              transition: "background-color 0.1s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </RowWrap>
  );
}

function SliderRow({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <RowWrap label={label} sublabel={display}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "140px", accentColor: "var(--accent)" }}
      />
    </RowWrap>
  );
}

function ToggleRow({ label, sublabel, value, onChange }: {
  label: string; sublabel?: string | undefined; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <RowWrap label={label} sublabel={sublabel}>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: "44px", height: "26px", borderRadius: "13px",
          backgroundColor: value ? "var(--accent)" : "var(--bg-elevated)",
          border: `1px solid ${value ? "var(--accent)" : "var(--border)"}`,
          position: "relative", cursor: "pointer", flexShrink: 0,
          transition: "background-color 0.2s",
        }}
      >
        <span style={{
          position: "absolute", top: "2px",
          insetInlineStart: value ? "20px" : "2px",
          width: "20px", height: "20px", borderRadius: "50%",
          backgroundColor: "#fff",
          transition: "inset-inline-start 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </RowWrap>
  );
}

function RowWrap({ label, sublabel, children }: {
  label: string; sublabel?: string | undefined; children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "var(--space-4) var(--space-5)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "var(--ui-size)", color: "var(--text-primary)", fontWeight: 500 }}>
          {label}
        </p>
        {sublabel && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
            {sublabel}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-3) var(--space-5)" }}>
      <span style={{ fontFamily: "var(--font-assistant)", fontSize: "14px", color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-tertiary)" }}>{value}</span>
    </div>
  );
}

const pageTitle: React.CSSProperties = {
  fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)",
};
