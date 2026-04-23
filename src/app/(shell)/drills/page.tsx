"use client";

import Link from "next/link";

const DRILLS = [
  {
    href: "/drills/schulte",
    emoji: "🟦",
    title: "טבלת שולטה",
    subtitle: "ריכוז ועיבוד חזותי",
    detail: "מצא מספרים 1–25 לפי הסדר",
    duration: "2–3 דק׳",
    color: "var(--accent)",
  },
  {
    href: "/drills/roots",
    emoji: "🌿",
    title: "זיהוי שורשים",
    subtitle: "מורפולוגיה עברית",
    detail: "זהה את השורש של המילה",
    duration: "3–5 דק׳",
    color: "var(--comp-green)",
  },
  {
    href: "/drills/saccade",
    emoji: "👁",
    title: "תנועות עיניים",
    subtitle: "אימון סקאדות",
    detail: "עקוב אחרי נקודת הפוקוס",
    duration: "1–2 דק׳",
    color: "var(--focus-amber)",
  },
];

export default function DrillsPage() {
  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)" }}>
        אימונים
      </h1>
      <p style={{ fontFamily: "var(--font-assistant)", fontSize: "var(--ui-size)", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "-var(--space-3)" }}>
        אימונים ממוקדים לשיפור ריכוז, עיבוד חזותי ומודעות מורפולוגית.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {DRILLS.map((drill) => (
          <Link
            key={drill.href}
            href={drill.href}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-4)",
              backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "16px", padding: "var(--space-5)", textDecoration: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{
              width: "52px", height: "52px", borderRadius: "14px", flexShrink: 0,
              backgroundColor: `color-mix(in srgb, ${drill.color} 15%, var(--bg-elevated))`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px",
            }}>
              {drill.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 600, fontSize: "var(--ui-size)", color: "var(--text-primary)", marginBottom: "3px" }}>
                {drill.title}
              </p>
              <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "3px" }}>
                {drill.detail}
              </p>
              <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>
                {drill.subtitle} · {drill.duration}
              </p>
            </div>
            <span style={{ color: "var(--accent)", flexShrink: 0 }}>←</span>
          </Link>
        ))}
      </div>

      {/* Science note */}
      <div style={{
        backgroundColor: "var(--bg-surface)", borderRadius: "14px",
        padding: "var(--space-4)", border: "1px solid var(--border)",
        borderInlineStart: `3px solid var(--accent)`,
      }}>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, direction: "rtl" }}>
          <strong>מה המחקר אומר:</strong> קריאה מהירה היא מיתוס — אך ריכוז, עיבוד אוטומטי של מילים, ומודעות מורפולוגית הם מיומנויות אמיתיות שניתן לאמן.
        </p>
      </div>
    </div>
  );
}
