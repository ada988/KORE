"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DEMO_PASSAGES } from "@/lib/demo-passages";
import { getStreak, getDailyStats, getRecentSessions } from "@/lib/session-utils";
import { useAppStore } from "@/stores/app";
import type { Streak, DailyStats, ReadingSession } from "@/types/database";

export default function HomePage() {
  const dailyGoal = useAppStore((s) => s.dailyGoalMinutes);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [lastSession, setLastSession] = useState<ReadingSession | null>(null);

  const load = useCallback(async () => {
    const [s, stats, sessions] = await Promise.all([
      getStreak(),
      getDailyStats(1),
      getRecentSessions(1),
    ]);
    setStreak(s ?? null);
    setTodayStats(stats[0] ?? null);
    setLastSession(sessions[0] ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  const todayMinutes = todayStats?.minutes_read ?? 0;
  const goalRatio = Math.min(1, todayMinutes / dailyGoal);

  return (
    <div style={{ padding: "var(--space-6) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)", marginBottom: "2px" }}>
            שלום 👋
          </h1>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>{today}</p>
        </div>

        {/* Streak badge */}
        <Link href="/stats" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "12px", padding: "var(--space-2) var(--space-3)",
          }}>
            <span style={{ fontSize: "20px", lineHeight: 1 }}>🔥</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--text-secondary)", fontWeight: 700, marginTop: "2px" }}>
              {streak?.current_streak ?? 0}
            </span>
          </div>
        </Link>
      </div>

      {/* Today's goal */}
      <div style={{
        backgroundColor: "var(--bg-surface)", borderRadius: "16px",
        padding: "var(--space-5)", border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
          <span style={{ fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "var(--ui-size)", color: "var(--text-primary)" }}>
            יעד יומי
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>
            <bdi>{todayMinutes}</bdi>/<bdi>{dailyGoal}</bdi> דקות
          </span>
        </div>
        {/* RTL progress bar */}
        <div style={{
          height: "8px", backgroundColor: "var(--bg-elevated)", borderRadius: "4px",
          overflow: "hidden", direction: "rtl",
        }}>
          <div style={{
            height: "100%", width: `${Math.round(goalRatio * 100)}%`,
            backgroundColor: goalRatio >= 1 ? "var(--comp-green)" : "var(--accent)",
            borderRadius: "4px",
            transition: "width var(--duration-slow) var(--ease-ui)",
          }} />
        </div>
        {goalRatio >= 1 && (
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)", color: "var(--comp-green)", marginTop: "var(--space-2)", textAlign: "center" }}>
            השגת את היעד היומי! ✓
          </p>
        )}
      </div>

      {/* Continue reading */}
      {lastSession && (
        <div>
          <h2 style={{ fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "var(--space-3)" }}>
            המשך קריאה
          </h2>
          <Link
            href={`/read/${lastSession.passage_id}`}
            style={{
              display: "block", textDecoration: "none",
              backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "12px", padding: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 500, color: "var(--text-primary)", marginBottom: "4px" }}>
                  המשך מהמקום שעצרת
                </p>
                <p style={{ fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>
                  <bdi>{lastSession.wpm_actual ?? 300}</bdi> מ״ד · <bdi>{lastSession.words_read ?? 0}</bdi> מילים
                </p>
              </div>
              <span style={{ color: "var(--accent)", fontSize: "20px" }}>←</span>
            </div>
          </Link>
        </div>
      )}

      {/* Quick start */}
      <div>
        <h2 style={{ fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "var(--space-3)" }}>
          קטעים מומלצים
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {DEMO_PASSAGES.slice(0, 3).map((p) => (
            <Link
              key={p.id}
              href={`/read/${p.id}`}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "var(--space-4)", textDecoration: "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "var(--ui-size)", color: "var(--text-primary)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.title}
                </p>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                  <DifficultyPill band={p.difficulty_band} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)" }}>
                    <bdi>{p.word_count}</bdi> מילים
                  </span>
                </div>
              </div>
              <span style={{ color: "var(--accent)", marginInlineStart: "var(--space-3)", flexShrink: 0 }}>←</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's drill suggestion */}
      <div>
        <h2 style={{ fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "var(--space-3)" }}>
          אימון יומי מומלץ
        </h2>
        <Link
          href="/drills/schulte"
          style={{
            display: "flex", alignItems: "center", gap: "var(--space-4)",
            backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "12px", padding: "var(--space-4)", textDecoration: "none",
          }}
        >
          <div style={{
            width: "44px", height: "44px", borderRadius: "10px",
            backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontSize: "20px",
          }}>⚡</div>
          <div>
            <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 500, color: "var(--text-primary)", marginBottom: "2px" }}>
              טבלת שולטה
            </p>
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>
              אימון ריכוז ועיבוד חזותי · 2-3 דקות
            </p>
          </div>
        </Link>
      </div>

      {/* Stats preview */}
      {todayStats && (
        <div>
          <h2 style={{ fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "var(--space-3)" }}>
            היום
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
            {[
              { label: "מילים", value: (todayStats.words_read ?? 0).toLocaleString("he-IL") },
              { label: "דקות", value: String(todayStats.minutes_read ?? 0) },
              { label: "מ״ד ממוצע", value: todayStats.avg_wpm ? String(Math.round(todayStats.avg_wpm)) : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "var(--space-3)", textAlign: "center",
              }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr" }}>{value}</p>
                <p style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DifficultyPill({ band }: { band: string }) {
  const config: Record<string, { label: string; color: string }> = {
    easy: { label: "קל", color: "var(--comp-green)" },
    medium: { label: "בינוני", color: "var(--focus-amber)" },
    hard: { label: "קשה", color: "var(--root-red)" },
    pet: { label: "פסיכומטרי", color: "var(--accent)" },
  };
  const c = config[band] ?? config["medium"]!;
  return (
    <span style={{
      fontFamily: "var(--font-assistant)", fontSize: "11px", fontWeight: 600,
      color: c.color, backgroundColor: `color-mix(in srgb, ${c.color} 12%, transparent)`,
      padding: "2px 8px", borderRadius: "20px",
    }}>
      {c.label}
    </span>
  );
}
