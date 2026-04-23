"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, type Theme, type FontFamily, type ReaderAmbience, type UILanguage } from "@/stores/app";
import { useRsvpStore, type SpeedMode } from "@/stores/rsvp";
import type { OrpMode } from "@/engines/orp";
import { clearAllData, exportStatsCSV, getAchievements } from "@/lib/session-utils";
import { requestReminderPermission } from "@/lib/reminders";
import * as haptics from "@/lib/haptics";
import {
  IconPalette, IconSpeed, IconTarget, IconBell, IconDatabase,
  IconDownload, IconUpload, IconGlobe, IconUser, IconShield,
  IconInfo, IconTrash, IconRefresh,
} from "@/components/ui/Icons";

const APP_VERSION = "0.2.0";

export default function SettingsPage() {
  const router = useRouter();
  // App prefs
  const theme = useAppStore((s) => s.theme);
  const fontFamily = useAppStore((s) => s.fontFamily);
  const readingSize = useAppStore((s) => s.readingSize);
  const letterSpacing = useAppStore((s) => s.letterSpacing);
  const ambience = useAppStore((s) => s.ambience);
  const dailyGoal = useAppStore((s) => s.dailyGoalMinutes);
  const weeklyGoal = useAppStore((s) => s.weeklyGoalMinutes);
  const hapticsEnabled = useAppStore((s) => s.hapticsEnabled);
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const reminderEnabled = useAppStore((s) => s.reminderEnabled);
  const reminderHour = useAppStore((s) => s.reminderHour);
  const uiLanguage = useAppStore((s) => s.uiLanguage);
  const analyticsOptOut = useAppStore((s) => s.analyticsOptOut);
  const anthropicKey = useAppStore((s) => s.anthropicKey);
  const mindWanderProbes = useAppStore((s) => s.mindWanderProbes);
  const baselineWpm = useAppStore((s) => s.baselineWpm);

  const setTheme = useAppStore((s) => s.setTheme);
  const setFontFamily = useAppStore((s) => s.setFontFamily);
  const setReadingSize = useAppStore((s) => s.setReadingSize);
  const setLetterSpacing = useAppStore((s) => s.setLetterSpacing);
  const setAmbience = useAppStore((s) => s.setAmbience);
  const setDailyGoal = useAppStore((s) => s.setDailyGoalMinutes);
  const setWeeklyGoal = useAppStore((s) => s.setWeeklyGoalMinutes);
  const setHaptics = useAppStore((s) => s.setHapticsEnabled);
  const setSound = useAppStore((s) => s.setSoundEnabled);
  const setReminderEnabled = useAppStore((s) => s.setReminderEnabled);
  const setReminderHour = useAppStore((s) => s.setReminderHour);
  const setUILanguage = useAppStore((s) => s.setUILanguage);
  const setAnalyticsOptOut = useAppStore((s) => s.setAnalyticsOptOut);
  const setAnthropicKey = useAppStore((s) => s.setAnthropicKey);
  const setMindWanderProbes = useAppStore((s) => s.setMindWanderProbes);
  const resetAll = useAppStore((s) => s.resetAll);

  // RSVP prefs
  const wpm = useRsvpStore((s) => s.wpm);
  const chunkSize = useRsvpStore((s) => s.chunkSize);
  const orpMode = useRsvpStore((s) => s.orpMode);
  const nikudMode = useRsvpStore((s) => s.nikudMode);
  const adaptivePauses = useRsvpStore((s) => s.adaptivePauses);
  const speedMode = useRsvpStore((s) => s.speedMode);
  const progressiveRampPerMin = useRsvpStore((s) => s.progressiveRampPerMin);
  const speedCeiling = useRsvpStore((s) => s.speedCeiling);
  const highlightRoots = useRsvpStore((s) => s.highlightRoots);
  const readingMode = useRsvpStore((s) => s.readingMode);

  const setWpm = useRsvpStore((s) => s.setWpm);
  const setChunkSize = useRsvpStore((s) => s.setChunkSize);
  const setOrpMode = useRsvpStore((s) => s.setOrpMode);
  const setNikudMode = useRsvpStore((s) => s.setNikudMode);
  const setAdaptivePauses = useRsvpStore((s) => s.setAdaptivePauses);
  const setSpeedMode = useRsvpStore((s) => s.setSpeedMode);
  const setProgressiveRampPerMin = useRsvpStore((s) => s.setProgressiveRampPerMin);
  const setSpeedCeiling = useRsvpStore((s) => s.setSpeedCeiling);
  const setHighlightRoots = useRsvpStore((s) => s.setHighlightRoots);
  const setReadingMode = useRsvpStore((s) => s.setReadingMode);
  const resetSpeedPrefs = useRsvpStore((s) => s.resetSpeedPrefs);

  // Keep localStorage in sync so haptics module sees prefs
  useEffect(() => { haptics.setHapticsEnabled(hapticsEnabled); }, [hapticsEnabled]);
  useEffect(() => { haptics.setSoundEnabled(soundEnabled); }, [soundEnabled]);

  const [achievementsCount, setAchievementsCount] = useState(0);
  useEffect(() => { setAchievementsCount(getAchievements().length); }, []);

  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const exportPrefs = useCallback(() => {
    const payload = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      app: useAppStore.getState(),
      rsvp: useRsvpStore.getState(),
      achievements: getAchievements(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kore-prefs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    haptics.success();
    flash("ההגדרות יוצאו");
  }, [flash]);

  const importPrefs = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        if (parsed.app) useAppStore.setState(parsed.app);
        if (parsed.rsvp) useRsvpStore.setState(parsed.rsvp);
        if (Array.isArray(parsed.achievements)) {
          window.localStorage.setItem("kore-achievements", JSON.stringify(parsed.achievements));
        }
        haptics.success();
        flash("ההגדרות יובאו");
      } catch {
        haptics.error();
        flash("קובץ לא תקין");
      }
    };
    input.click();
  }, [flash]);

  const exportCSV = useCallback(async () => {
    const csv = await exportStatsCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kore-stats-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    haptics.success();
    flash("הסטטיסטיקה יוצאה");
  }, [flash]);

  const handleClearData = useCallback(async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    await clearAllData();
    haptics.success();
    setConfirmClear(false);
    flash("כל הנתונים נמחקו");
  }, [confirmClear, flash]);

  const toggleReminder = useCallback(async (v: boolean) => {
    if (v) {
      const perm = await requestReminderPermission();
      if (perm !== "granted") {
        flash("יש לאשר הרשאה להתראות");
        return;
      }
    }
    setReminderEnabled(v);
    haptics.tap();
  }, [setReminderEnabled, flash]);

  return (
    <div style={{ padding: "var(--space-4) var(--space-4) var(--space-12)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1 style={pageTitle}>הגדרות</h1>

      {/* Appearance */}
      <Section title="מראה" icon={<IconPalette size={15} />}>
        <SegmentedControl
          label="ערכת צבעים"
          options={[
            { value: "auto", label: "אוטומטי" },
            { value: "light", label: "בהיר" },
            { value: "dark", label: "כהה" },
          ]}
          value={theme}
          onChange={(v) => { setTheme(v as Theme); haptics.tap(); }}
        />
        <SegmentedControl
          label="אווירה"
          options={[
            { value: "default", label: "רגיל" },
            { value: "sepia", label: "ספיה" },
            { value: "high-contrast", label: "ניגוד" },
          ]}
          value={ambience}
          onChange={(v) => { setAmbience(v as ReaderAmbience); haptics.tap(); }}
        />
        <FontChoice value={fontFamily} onChange={(v) => { setFontFamily(v); haptics.tap(); }} />
        <SliderRow
          label="גודל גופן"
          value={readingSize} min={16} max={32} step={2}
          display={`${readingSize}px`}
          onChange={setReadingSize}
        />
        <SliderRow
          label="מרווח אותיות"
          value={letterSpacing} min={0} max={6} step={1}
          display={letterSpacing === 0 ? "ללא" : `+${letterSpacing / 10}px`}
          onChange={setLetterSpacing}
        />
      </Section>

      {/* Speed reading */}
      <Section title="קריאת RSVP" icon={<IconSpeed size={15} />}>
        <SegmentedControl
          label="מצב קריאה"
          options={[
            { value: "rsvp", label: "RSVP" },
            { value: "paginated", label: "רגיל" },
          ]}
          value={readingMode}
          onChange={(v) => { setReadingMode(v as "rsvp" | "paginated"); haptics.tap(); }}
        />
        <SegmentedControl
          label="קצב"
          options={[
            { value: "steady", label: "קבוע" },
            { value: "progressive", label: "מדורג" },
            { value: "burst", label: "פרצים" },
          ]}
          value={speedMode}
          onChange={(v) => { setSpeedMode(v as SpeedMode); haptics.tap(); }}
        />
        <SliderRow
          label="מהירות (מ״ד)"
          value={wpm} min={100} max={800} step={25}
          display={String(wpm)}
          onChange={setWpm}
        />
        {speedMode === "progressive" && (
          <>
            <SliderRow
              label="עלייה ל-WPM/דקה"
              value={progressiveRampPerMin} min={5} max={80} step={5}
              display={`+${progressiveRampPerMin}`}
              onChange={setProgressiveRampPerMin}
            />
            <SliderRow
              label="תקרת מהירות"
              value={speedCeiling} min={250} max={800} step={25}
              display={String(speedCeiling)}
              onChange={setSpeedCeiling}
            />
          </>
        )}
        <SegmentedControl
          label="גודל קטע"
          options={[
            { value: "1", label: "1" }, { value: "2", label: "2" },
            { value: "3", label: "3" }, { value: "4", label: "4" },
          ]}
          value={String(chunkSize)}
          onChange={(v) => { setChunkSize(Number(v)); haptics.tap(); }}
        />
        <SegmentedControl
          label="מצב ORP"
          options={[
            { value: "root", label: "שורש" },
            { value: "classic", label: "קלאסי" },
            { value: "fixed", label: "קבוע" },
          ]}
          value={orpMode}
          onChange={(v) => { setOrpMode(v as OrpMode); haptics.tap(); }}
        />
        <SegmentedControl
          label="ניקוד"
          options={[
            { value: "off", label: "ללא" },
            { value: "partial", label: "חלקי" },
            { value: "full", label: "מלא" },
          ]}
          value={nikudMode}
          onChange={(v) => { setNikudMode(v as "off" | "partial" | "full"); haptics.tap(); }}
        />
        <ToggleRow label="השהיות אדפטיביות" sublabel="האטה בסימני פיסוק ומילים נדירות"
          value={adaptivePauses} onChange={(v) => { setAdaptivePauses(v); haptics.tap(); }} />
        <ToggleRow label="הדגשת שורשים" sublabel="סימון אותיות שורש במילים"
          value={highlightRoots} onChange={(v) => { setHighlightRoots(v); haptics.tap(); }} />
        <ActionRow label="איפוס הגדרות מהירות" danger={false}
          onClick={() => { resetSpeedPrefs(); haptics.bump(); flash("הגדרות מהירות אופסו"); }}>
          <IconRefresh size={14} />
        </ActionRow>
      </Section>

      {/* Goals */}
      <Section title="יעדים" icon={<IconTarget size={15} />}>
        <SliderRow
          label="יעד יומי"
          value={dailyGoal} min={5} max={120} step={5}
          display={`${dailyGoal} דק׳`}
          onChange={setDailyGoal}
        />
        <SliderRow
          label="יעד שבועי"
          value={weeklyGoal} min={35} max={840} step={35}
          display={`${weeklyGoal} דק׳`}
          onChange={setWeeklyGoal}
        />
        <InfoRow label="הישגים" value={`${achievementsCount}/10`} />
      </Section>

      {/* Notifications */}
      <Section title="התראות" icon={<IconBell size={15} />}>
        <ToggleRow label="תזכורת יומית" sublabel="התראה לקריאה"
          value={reminderEnabled} onChange={toggleReminder} />
        {reminderEnabled && (
          <SliderRow
            label="שעת תזכורת"
            value={reminderHour} min={6} max={23} step={1}
            display={`${String(reminderHour).padStart(2, "0")}:00`}
            onChange={setReminderHour}
          />
        )}
      </Section>

      {/* Feedback */}
      <Section title="משוב" icon={<IconSpeed size={15} />}>
        <ToggleRow label="רטט" sublabel="משוב מישושי במכשירים תומכים"
          value={hapticsEnabled} onChange={setHaptics} />
        <ToggleRow label="צלילים" sublabel="אישורים קצרים"
          value={soundEnabled} onChange={setSound} />
      </Section>

      {/* Account & language */}
      <Section title="חשבון ושפה" icon={<IconUser size={15} />}>
        <SegmentedControl
          label="שפת ממשק"
          options={[{ value: "he", label: "עברית" }, { value: "en", label: "English" }]}
          value={uiLanguage}
          onChange={(v) => { setUILanguage(v as UILanguage); haptics.tap(); flash(v === "en" ? "English UI: coming in v0.3" : "עברית מופעל"); }}
        />
        <InfoRow label="משתמש" value="מקומי בלבד" />
        <ActionRow label="התחברות / סנכרון" danger={false}
          onClick={() => flash("סנכרון ענן: בקרוב")}>
          <IconGlobe size={14} />
        </ActionRow>
      </Section>

      {/* AI + Focus */}
      <Section title="AI ומיקוד" icon={<IconInfo size={15} />}>
        <ApiKeyRow value={anthropicKey} onChange={setAnthropicKey} />
        <ToggleRow label="בדיקות מיקוד בקריאה"
          sublabel='בקריאה רגילה: "האם עדיין איתך?"'
          value={mindWanderProbes} onChange={setMindWanderProbes} />
        <InfoRow label="מהירות בסיס" value={baselineWpm ? `${baselineWpm} מ״ד` : "לא נמדדה"} />
        <ActionRow label="מדידת מהירות בסיס מחדש"
          onClick={() => router.push("/onboarding")}>
          <IconRefresh size={14} />
        </ActionRow>
      </Section>

      {/* Privacy */}
      <Section title="פרטיות" icon={<IconShield size={15} />}>
        <ToggleRow label="ביטול אנליטיקס"
          sublabel="לא לשלוח נתוני שימוש אנונימיים"
          value={analyticsOptOut} onChange={setAnalyticsOptOut} />
      </Section>

      {/* Data */}
      <Section title="נתונים" icon={<IconDatabase size={15} />}>
        <ActionRow label="ייצוא הגדרות (JSON)" onClick={exportPrefs}>
          <IconDownload size={14} />
        </ActionRow>
        <ActionRow label="ייבוא הגדרות" onClick={importPrefs}>
          <IconUpload size={14} />
        </ActionRow>
        <ActionRow label="ייצוא סטטיסטיקה (CSV)" onClick={exportCSV}>
          <IconDownload size={14} />
        </ActionRow>
        <ActionRow label="איפוס כל ההגדרות" onClick={() => { resetAll(); haptics.bump(); flash("אופס"); }}>
          <IconRefresh size={14} />
        </ActionRow>
        <ActionRow
          label={confirmClear ? "לחץ שוב למחיקה" : "מחיקת כל הנתונים"}
          onClick={handleClearData}
          danger
        >
          <IconTrash size={14} />
        </ActionRow>
      </Section>

      {/* About */}
      <Section title="אודות" icon={<IconInfo size={15} />}>
        <InfoRow label="גרסה" value={`${APP_VERSION} — offline`} />
        <InfoRow label="אחסון" value="מקומי (IndexedDB)" />
        <InfoRow label="מצב" value="ללא שרת · ללא מפתחות" />
        <div style={{
          padding: "var(--space-4)",
          borderTop: "1px solid var(--border)",
          borderInlineStart: "3px solid var(--accent)",
          backgroundColor: "color-mix(in srgb, var(--accent) 4%, var(--bg-surface))",
        }}>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <strong>לקרוא מהר זה מיתוס. לקרוא טוב יותר זה מדע.</strong>
            <br />
            קוֹרֵא בנוי על מחקר קוגניטיבי, לא על הבטחות שיווקיות.
          </p>
        </div>
      </Section>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + var(--space-4))",
          insetInline: 0, display: "flex", justifyContent: "center", zIndex: 150, pointerEvents: "none",
        }}>
          <div style={{
            backgroundColor: "var(--text-primary)", color: "var(--bg)",
            padding: "var(--space-2) var(--space-4)", borderRadius: "10px",
            fontFamily: "var(--font-heebo)", fontSize: "13px",
            boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
          }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "12px",
        color: "var(--text-tertiary)", marginBottom: "var(--space-2)",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        {icon}<span>{title}</span>
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

function ApiKeyRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [shown, setShown] = useState(false);
  const masked = value ? `•••••${value.slice(-4)}` : "";
  return (
    <div style={{
      padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: "var(--space-2)",
    }}>
      <div>
        <p style={labelStyle}>מפתח Anthropic (Claude)</p>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
          נשמר מקומית בדפדפן; משמש ליצירת שאלות הבנה
        </p>
      </div>
      {shown ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-ant-..."
          dir="ltr"
          style={{
            fontFamily: "var(--font-mono)", fontSize: "12px",
            color: "var(--text-primary)", backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)", borderRadius: "8px",
            padding: "var(--space-2) var(--space-3)", outline: "none",
            direction: "ltr",
          }}
        />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-tertiary)",
            flex: 1, padding: "var(--space-2) var(--space-3)",
            backgroundColor: "var(--bg-elevated)", borderRadius: "8px",
            border: "1px solid var(--border)", direction: "ltr",
          }}>
            {masked || "לא הוגדר"}
          </span>
          <button
            onClick={() => setShown(true)}
            style={{
              padding: "6px 12px", border: "1px solid var(--border)",
              borderRadius: "8px", backgroundColor: "var(--bg-surface)",
              fontFamily: "var(--font-assistant)", fontSize: "12px",
              color: "var(--accent)", cursor: "pointer",
            }}
          >
            {value ? "שנה" : "הוסף"}
          </button>
        </div>
      )}
    </div>
  );
}

function FontChoice({ value, onChange }: { value: FontFamily; onChange: (v: FontFamily) => void }) {
  const fonts: { id: FontFamily; label: string; family: string }[] = [
    { id: "heebo", label: "Heebo", family: "var(--font-heebo)" },
    { id: "frank", label: "Frank", family: "var(--font-frank)" },
    { id: "assistant", label: "Assistant", family: "var(--font-assistant)" },
    { id: "rubik", label: "Rubik", family: "var(--font-rubik)" },
  ];
  return (
    <div style={rowStyle}>
      <p style={labelStyle}>גופן קריאה</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "var(--space-3)" }}>
        {fonts.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            style={{
              padding: "var(--space-3)", textAlign: "center",
              backgroundColor: value === f.id ? "color-mix(in srgb, var(--accent) 10%, var(--bg-elevated))" : "var(--bg-elevated)",
              border: `1px solid ${value === f.id ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "10px", cursor: "pointer",
            }}
          >
            <p style={{ fontFamily: f.family, fontSize: "20px", color: "var(--text-primary)", marginBottom: "2px", direction: "rtl" }}>
              קוֹרֵא
            </p>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: "10px",
              color: value === f.id ? "var(--accent)" : "var(--text-tertiary)",
            }}>
              {f.label}
            </p>
          </button>
        ))}
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
        onClick={() => { onChange(!value); haptics.tap(); }}
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

function ActionRow({ label, onClick, children, danger = false }: {
  label: string; onClick: () => void; children?: React.ReactNode; danger?: boolean;
}) {
  const color = danger ? "var(--error-red)" : "var(--accent)";
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        width: "100%", padding: "var(--space-4) var(--space-5)",
        backgroundColor: "transparent", border: "none",
        borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "inherit",
        color, fontFamily: "var(--font-heebo)", fontSize: "var(--ui-size)",
        fontWeight: 500, WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {children}
    </button>
  );
}

function RowWrap({ label, sublabel, children }: {
  label: string; sublabel?: string | undefined; children: React.ReactNode;
}) {
  return (
    <div style={rowStyle}>
      <div>
        <p style={labelStyle}>{label}</p>
        {sublabel && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
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
    <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontFamily: "var(--font-assistant)", fontSize: "14px", color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

const pageTitle: React.CSSProperties = {
  fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)",
};
const rowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "var(--space-4) var(--space-5)",
  borderBottom: "1px solid var(--border)",
  flexDirection: undefined,
};
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-assistant)", fontSize: "var(--ui-size)",
  color: "var(--text-primary)", fontWeight: 500,
};
