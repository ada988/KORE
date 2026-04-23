"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_PASSAGES } from "@/lib/demo-passages";
import { getStreak, getDailyStats, getRecentSessions } from "@/lib/session-utils";
import { useAppStore } from "@/stores/app";
import { IconFlame, IconCheck, IconChevronRight, IconLightning, IconBook } from "@/components/ui/Icons";
import type { Streak, DailyStats, ReadingSession } from "@/types/database";

export default function HomePage() {
  const dailyGoal = useAppStore((s) => s.dailyGoalMinutes);
  const onboarded = useAppStore((s) => s.onboarded);
  const router = useRouter();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [lastSession, setLastSession] = useState<ReadingSession | null>(null);

  useEffect(() => {
    if (!onboarded) {
      router.replace("/onboarding");
    }
  }, [onboarded, router]);

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
  const goalDone = goalRatio >= 1;

  return (
    <div style={{ padding: "var(--space-5) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)", marginBottom: "3px" }}>
            שלום
          </h1>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>{today}</p>
        </div>

        <Link href="/stats" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "14px", padding: "var(--space-2) var(--space-3)",
            gap: "2px", minWidth: "48px",
          }}>
            <IconFlame size={18} style={{ color: streak?.current_streak ? "#f97316" : "var(--text-tertiary)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-primary)", fontWeight: 700 }}>
              {streak?.current_streak ?? 0}
            </span>
          </div>
        </Link>
      </div>

      {/* Today's goal — circular ring */}
      <div style={{
        backgroundColor: "var(--bg-surface)", borderRadius: "16px",
        padding: "var(--space-5)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "var(--space-5)",
      }}>
        <GoalRing ratio={goalRatio} size={84} strokeWidth={7} done={goalDone} />
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "15px", color: "var(--text-primary)", marginBottom: "3px" }}>
            יעד יומי
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: goalDone ? "var(--comp-green)" : "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
            <bdi>{todayMinutes}</bdi>/<bdi>{dailyGoal}</bdi> דקות
          </p>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "3px" }}>
            {goalDone ? "סיימת את היעד היומי" : `עוד ${Math.max(0, dailyGoal - todayMinutes)} דק׳`}
          </p>
        </div>
        {goalDone && <IconCheck size={20} style={{ color: "var(--comp-green)" }} />}
      </div>

      {/* Continue reading */}
      {lastSession && (
        <div>
          <SectionTitle>המשך קריאה</SectionTitle>
          <Link
            href={`/read/${lastSession.passage_id}`}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-4)",
              textDecoration: "none",
              backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "14px", padding: "var(--space-4)",
            }}
          >
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
              backgroundColor: "color-mix(in srgb, var(--accent) 12%, var(--bg-elevated))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconBook size={18} style={{ color: "var(--accent)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "15px", color: "var(--text-primary)", marginBottom: "3px" }}>
                המשך מהמקום שעצרת
              </p>
              <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>
                <bdi>{lastSession.wpm_actual ?? 300}</bdi> מ״ד · <bdi>{lastSession.words_read ?? 0}</bdi> מילים
              </p>
            </div>
            <IconChevronRight size={16} style={{ color: "var(--text-tertiary)", transform: "rotate(180deg)" }} />
          </Link>
        </div>
      )}

      {/* Recommended passages */}
      <div>
        <SectionTitle>קטעים מומלצים</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {DEMO_PASSAGES.slice(0, 4).map((p) => (
            <Link
              key={p.id}
              href={`/read/${p.id}`}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "var(--space-3) var(--space-4)", textDecoration: "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "15px", color: "var(--text-primary)", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.title}
                </p>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <DifficultyPill band={p.difficulty_band} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)" }}>
                    <bdi>{p.word_count}</bdi> מילים
                  </span>
                </div>
              </div>
              <IconChevronRight size={14} style={{ color: "var(--text-tertiary)", marginInlineStart: "var(--space-3)", flexShrink: 0, transform: "rotate(180deg)" }} />
            </Link>
          ))}
        </div>
      </div>

      {/* PET simulation */}
      <Link
        href="/pet"
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-4)",
          backgroundColor: "color-mix(in srgb, var(--accent) 8%, var(--bg-surface))",
          border: "1px solid var(--accent)",
          borderRadius: "14px", padding: "var(--space-4)", textDecoration: "none",
        }}
      >
        <div style={{
          width: "44px", height: "44px", borderRadius: "11px",
          backgroundColor: "color-mix(in srgb, var(--accent) 22%, var(--bg-elevated))",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent)", fontWeight: 700 }}>PET</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 600, fontSize: "15px", color: "var(--text-primary)", marginBottom: "3px" }}>
            סימולציית פסיכומטרי
          </p>
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>
            6 דקות · 5 שאלות · קריאה מכוונת שאלה
          </p>
        </div>
        <IconChevronRight size={16} style={{ color: "var(--accent)", transform: "rotate(180deg)" }} />
      </Link>

      {/* Daily drill */}
      <div>
        <SectionTitle>אימון יומי מומלץ</SectionTitle>
        <Link
          href="/drills/schulte"
          style={{
            display: "flex", alignItems: "center", gap: "var(--space-4)",
            backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "14px", padding: "var(--space-4)", textDecoration: "none",
          }}
        >
          <div style={{
            width: "44px", height: "44px", borderRadius: "11px",
            backgroundColor: "color-mix(in srgb, var(--accent) 15%, var(--bg-elevated))",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <IconLightning size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "15px", color: "var(--text-primary)", marginBottom: "3px" }}>
              טבלת שולטה
            </p>
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>
              ריכוז ועיבוד חזותי · 2-3 דקות
            </p>
          </div>
          <IconChevronRight size={16} style={{ color: "var(--text-tertiary)", transform: "rotate(180deg)" }} />
        </Link>
      </div>

      {/* Today stats */}
      {todayStats && (
        <div>
          <SectionTitle>היום</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
            {[
              { label: "מילים", value: (todayStats.words_read ?? 0).toLocaleString("he-IL") },
              { label: "דקות", value: String(todayStats.minutes_read ?? 0) },
              { label: "מ״ד", value: todayStats.avg_wpm ? String(Math.round(todayStats.avg_wpm)) : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "var(--space-3)", textAlign: "center",
              }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr" }}>{value}</p>
                <p style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "12px",
      color: "var(--text-tertiary)", marginBottom: "var(--space-3)",
      textTransform: "uppercase", letterSpacing: "0.08em",
    }}>
      {children}
    </h2>
  );
}

function GoalRing({ ratio, size, strokeWidth, done }: { ratio: number; size: number; strokeWidth: number; done: boolean }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, ratio));
  const offset = c * (1 - clamped);
  const color = done ? "var(--comp-green)" : "var(--accent)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s var(--ease-ui)" }}
      />
      <text
        x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fontFamily="var(--font-mono)" fontSize="16" fontWeight="700"
        fill="var(--text-primary)" style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(clamped * 100)}%
      </text>
    </svg>
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
      fontFamily: "var(--font-assistant)", fontSize: "10px", fontWeight: 600,
      color: c.color, backgroundColor: `color-mix(in srgb, ${c.color} 12%, transparent)`,
      padding: "2px 7px", borderRadius: "20px",
    }}>
      {c.label}
    </span>
  );
}
