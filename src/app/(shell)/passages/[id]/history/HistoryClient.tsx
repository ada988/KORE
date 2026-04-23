"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/db";
import { getDemoPassage } from "@/lib/demo-passages";
import type { ReadingSession, Passage } from "@/types/database";

/**
 * Per-passage reading history — every session for this passage,
 * with WPM curve and time spent.
 */

type PageProps = { params: Promise<{ id: string }> };

export default function HistoryClient({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState<Passage | null>(null);

  useEffect(() => {
    async function load() {
      const db = getDb();
      const s = await db.reading_sessions
        .where("passage_id").equals(id)
        .reverse()
        .toArray();
      setSessions(s);

      if (id.startsWith("demo-")) {
        const demo = getDemoPassage(id);
        if (demo) setTitle(demo.title);
      } else {
        const p = await db.passages.get(id);
        if (p) { setPassage(p); setTitle(p.title); }
      }
    }
    load();
  }, [id]);

  const maxWpm = Math.max(100, ...sessions.map((s) => s.wpm_actual ?? 0));
  const avgWpm = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + (s.wpm_actual ?? 0), 0) / sessions.length)
    : 0;
  const totalSec = sessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);
  const totalMin = Math.round(totalSec / 60);

  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "10px", padding: "6px 12px", cursor: "pointer",
            fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-secondary)",
          }}
        >← חזור</button>
      </div>

      <div>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
          היסטוריית קריאה
        </p>
        <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)" }}>
          {title || "קטע"}
        </h1>
        {passage?.author && (
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-tertiary)", marginTop: "3px" }}>
            {passage.author}
          </p>
        )}
      </div>

      {sessions.length === 0 ? (
        <div style={{
          padding: "var(--space-8)", textAlign: "center",
          fontFamily: "var(--font-assistant)", color: "var(--text-tertiary)",
        }}>
          עדיין לא קראת את הקטע
          <br />
          <button
            onClick={() => router.push(`/read/${id}`)}
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-3) var(--space-6)",
              backgroundColor: "var(--accent)", color: "#fff",
              border: "none", borderRadius: "10px", cursor: "pointer",
              fontFamily: "var(--font-heebo)", fontSize: "14px",
            }}
          >
            התחל לקרוא
          </button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
            <StatBox label="סשנים" value={String(sessions.length)} />
            <StatBox label="מ״ד ממוצע" value={avgWpm > 0 ? String(avgWpm) : "—"} />
            <StatBox label="דקות סה״כ" value={String(totalMin)} />
          </div>

          {/* WPM curve */}
          <div style={{
            backgroundColor: "var(--bg-surface)", borderRadius: "14px",
            padding: "var(--space-4)", border: "1px solid var(--border)",
          }}>
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--space-3)" }}>
              עקומת WPM
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "80px", direction: "ltr" }}>
              {[...sessions].reverse().map((s, i) => {
                const h = ((s.wpm_actual ?? 0) / maxWpm) * 100;
                return (
                  <div key={s.id} title={`${s.wpm_actual} WPM · ${new Date(s.started_at).toLocaleDateString("he-IL")}`} style={{
                    flex: 1, minWidth: "4px",
                    height: `${Math.max(3, h)}%`,
                    backgroundColor: i === sessions.length - 1 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 35%, var(--bg-elevated))",
                    borderRadius: "2px",
                  }} />
                );
              })}
            </div>
          </div>

          {/* Session list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {sessions.map((s) => {
              const date = new Date(s.started_at);
              return (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderRadius: "12px", padding: "var(--space-3) var(--space-4)",
                }}>
                  <div>
                    <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-primary)" }}>
                      {date.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                      <bdi>{date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</bdi>
                      {" · "}
                      <bdi>{Math.round((s.duration_seconds ?? 0) / 60) || 1}</bdi> דק׳
                      {" · "}
                      {s.mode}
                    </p>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                    <bdi>{s.wpm_actual ?? 0}</bdi>
                    <span style={{ fontSize: "10px", color: "var(--text-tertiary)", marginInlineStart: "3px" }}>מ״ד</span>
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => router.push(`/read/${id}`)}
            style={{
              padding: "var(--space-4)", backgroundColor: "var(--accent)",
              color: "#fff", border: "none", borderRadius: "12px",
              fontFamily: "var(--font-heebo)", fontSize: "15px", fontWeight: 500,
              cursor: "pointer",
            }}
          >
            קרא שוב
          </button>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: "12px", padding: "var(--space-3)", textAlign: "center",
    }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", direction: "ltr", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      <p style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
        {label}
      </p>
    </div>
  );
}

