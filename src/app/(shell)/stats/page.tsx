"use client";

import { useState, useEffect, useCallback } from "react";
import { getDailyStats, getRecentSessions, getStreak } from "@/lib/session-utils";
import { IconFlame, IconCheck, IconBarChart } from "@/components/ui/Icons";
import type { DailyStats, ReadingSession, Streak } from "@/types/database";

export default function StatsPage() {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);

  const load = useCallback(async () => {
    const [s, ss, str] = await Promise.all([getDailyStats(14), getRecentSessions(10), getStreak()]);
    setStats(s.sort((a, b) => a.date.localeCompare(b.date)));
    setSessions(ss);
    setStreak(str ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalWords = stats.reduce((s, d) => s + d.words_read, 0);
  const totalMinutes = stats.reduce((s, d) => s + d.minutes_read, 0);
  const avgWpm = stats.filter((d) => d.avg_wpm).reduce((s, d, _, a) => s + (d.avg_wpm ?? 0) / a.length, 0);
  const maxWpm = stats.reduce((m, d) => Math.max(m, d.avg_wpm ?? 0), 0);

  const last7 = stats.slice(-7);
  const maxWords = Math.max(...last7.map((d) => d.words_read), 1);
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = stats.find((d) => d.date === today);

  if (sessions.length === 0 && stats.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-8)", gap: "var(--space-4)", textAlign: "center" }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "20px",
          backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4,
        }}>
          <IconBarChart size={32} style={{ color: "var(--text-tertiary)" }} />
        </div>
        <p style={{ fontFamily: "var(--font-assistant)", color: "var(--text-tertiary)", maxWidth: "260px", lineHeight: 1.6, fontSize: "15px" }}>
          עדיין אין נתונים. התחל לקרוא כדי לצפות בהתקדמות שלך.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-5) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <h1 style={pageTitle}>התקדמות</h1>

      {/* Streak card */}
      <div style={{
        backgroundColor: "var(--bg-surface)", borderRadius: "16px",
        padding: "var(--space-5)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "var(--space-5)",
      }}>
        <div style={{
          width: "52px", height: "52px", borderRadius: "14px", flexShrink: 0,
          backgroundColor: streak?.current_streak ? "color-mix(in srgb, #f97316 15%, var(--bg-elevated))" : "var(--bg-elevated)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconFlame size={24} style={{ color: streak?.current_streak ? "#f97316" : "var(--text-tertiary)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "34px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr", lineHeight: 1 }}>
            {streak?.current_streak ?? 0}
          </p>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-tertiary)", marginTop: "3px" }}>
            ימים רצופים · שיא: <bdi>{streak?.longest_streak ?? 0}</bdi>
          </p>
        </div>
        {todayStats && (
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            backgroundColor: "color-mix(in srgb, var(--comp-green) 12%, transparent)",
            borderRadius: "8px", padding: "5px 10px",
          }}>
            <IconCheck size={12} style={{ color: "var(--comp-green)" }} />
            <span style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--comp-green)", fontWeight: 600 }}>
              היום
            </span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        {[
          { label: "מילים (14 ימים)", value: totalWords.toLocaleString("he-IL") },
          { label: "דקות קריאה", value: String(totalMinutes) },
          { label: "מ״ד ממוצע", value: avgWpm > 0 ? String(Math.round(avgWpm)) : "—" },
          { label: "מ״ד שיא", value: maxWpm > 0 ? String(Math.round(maxWpm)) : "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{
            backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "14px", padding: "var(--space-4)",
          }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr", marginBottom: "4px" }}>
              {value}
            </p>
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* 7-day bar chart */}
      {last7.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "16px", padding: "var(--space-5)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--space-4)" }}>
            <h2 style={sectionHeader}>מילים יומיות</h2>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)", direction: "ltr" }}>
              max: {maxWords.toLocaleString("he-IL")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-2)", height: "88px", direction: "rtl" }}>
            {last7.map((d) => {
              const ratio = d.words_read / maxWords;
              const dayLabel = new Date(d.date).toLocaleDateString("he-IL", { weekday: "short" });
              const isToday = d.date === today;
              return (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", height: "100%" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div style={{
                      width: "100%", height: `${Math.max(4, ratio * 100)}%`,
                      backgroundColor: isToday ? "var(--accent)" : "color-mix(in srgb, var(--accent) 30%, var(--bg-elevated))",
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.4s var(--ease-ui)",
                    }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-assistant)", fontSize: "10px", color: isToday ? "var(--accent)" : "var(--text-tertiary)", fontWeight: isToday ? 700 : 400 }}>
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div>
          <h2 style={{ ...sectionHeader, marginBottom: "var(--space-3)" }}>סשנים אחרונים</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {sessions.map((s) => {
              const date = new Date(s.started_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
              const time = new Date(s.started_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={s.id} style={{
                  backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: "12px", padding: "var(--space-3) var(--space-4)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {date} · {time}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                      <bdi>{s.words_read ?? 0}</bdi> מילים · <bdi>{Math.round((s.duration_seconds ?? 0) / 60) || 1}</bdi> דק׳
                    </p>
                  </div>
                  {s.wpm_actual && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700, color: "var(--accent)" }}>
                      <bdi>{s.wpm_actual}</bdi>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)", marginInlineStart: "4px" }}>מ״ד</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const pageTitle: React.CSSProperties = {
  fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)",
};
const sectionHeader: React.CSSProperties = {
  fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "12px",
  color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em",
};
