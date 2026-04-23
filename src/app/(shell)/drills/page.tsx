"use client";

import Link from "next/link";
import { IconGrid, IconLeaf, IconEye, IconChevronRight, IconTarget } from "@/components/ui/Icons";

const DRILLS = [
  {
    href: "/drills/schulte",
    Icon: IconGrid,
    title: "טבלת שולטה",
    subtitle: "ריכוז ועיבוד חזותי",
    detail: "מצא מספרים 1–25 לפי הסדר",
    duration: "2–3 דק׳",
    color: "var(--accent)",
  },
  {
    href: "/drills/roots",
    Icon: IconLeaf,
    title: "זיהוי שורשים",
    subtitle: "מורפולוגיה עברית",
    detail: "זהה את השורש של המילה",
    duration: "3–5 דק׳",
    color: "var(--comp-green)",
  },
  {
    href: "/drills/saccade",
    Icon: IconEye,
    title: "תנועות עיניים",
    subtitle: "אימון סקאדות",
    detail: "עקוב אחרי נקודת הפוקוס",
    duration: "1–2 דק׳",
    color: "var(--focus-amber)",
  },
  {
    href: "/drills/peripheral",
    Icon: IconTarget,
    title: "ראייה היקפית",
    subtitle: "עיבוד פארא-פובאלי",
    detail: "זהה מילים בהבזק קצר",
    duration: "2 דק׳",
    color: "var(--root-red)",
  },
];

export default function DrillsPage() {
  return (
    <div style={{ padding: "var(--space-5) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-rubik)", fontWeight: 700, fontSize: "var(--text-h2)", color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
          אימונים
        </h1>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          מיומנויות ריכוז, עיבוד חזותי ומורפולוגיה — אימונים שמגובים במחקר.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {DRILLS.map(({ href, Icon, title, subtitle, detail, duration, color }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-4)",
              backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "16px", padding: "var(--space-4) var(--space-5)", textDecoration: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{
              width: "48px", height: "48px", borderRadius: "13px", flexShrink: 0,
              backgroundColor: `color-mix(in srgb, ${color} 14%, var(--bg-elevated))`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={22} style={{ color }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "var(--font-heebo)", fontWeight: 600, fontSize: "16px", color: "var(--text-primary)", marginBottom: "3px" }}>
                {title}
              </p>
              <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                {detail}
              </p>
              <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)" }}>
                {subtitle} · {duration}
              </p>
            </div>
            <IconChevronRight size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0, transform: "rotate(180deg)" }} />
          </Link>
        ))}
      </div>

      <div style={{
        backgroundColor: "var(--bg-surface)", borderRadius: "14px",
        padding: "var(--space-4) var(--space-5)", border: "1px solid var(--border)",
        borderInlineStart: "3px solid var(--accent)",
      }}>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, direction: "rtl" }}>
          <strong>מה המחקר אומר:</strong> קריאה מהירה היא מיתוס — אך ריכוז, עיבוד אוטומטי של מילים, ומודעות מורפולוגית הן מיומנויות אמיתיות שניתן לאמן.
        </p>
      </div>
    </div>
  );
}
