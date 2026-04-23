import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "קוֹרֵא — KORÉ",
};

export default function HomePage() {
  return (
    <main
      className="flex flex-col flex-1 items-center justify-center min-h-dvh"
      style={{ backgroundColor: "var(--bg)", padding: "var(--space-8)" }}
    >
      {/* Logo / wordmark */}
      <div
        style={{
          textAlign: "center",
          marginBlockEnd: "var(--space-12)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-rubik)",
            fontWeight: 900,
            fontSize: "clamp(56px, 12vw, 96px)",
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            marginBlockEnd: "var(--space-3)",
            direction: "rtl",
          }}
          lang="he"
        >
          {/* Root letters ק-ר-א subtly in --root-red, as per brand spec */}
          <span style={{ color: "var(--root-red)" }}>ק</span>
          <span>וֹ</span>
          <span style={{ color: "var(--root-red)" }}>ר</span>
          <span>ֵ</span>
          <span style={{ color: "var(--root-red)" }}>א</span>
        </h1>
        <p
          style={{
            fontFamily: "var(--font-assistant)",
            fontWeight: 300,
            fontSize: "var(--text-caption)",
            letterSpacing: "0.12em",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
          }}
        >
          K O R É
        </p>
      </div>

      {/* Tagline */}
      <p
        style={{
          fontFamily: "var(--font-heebo)",
          fontWeight: 400,
          fontSize: "clamp(18px, 3vw, 24px)",
          lineHeight: 1.6,
          color: "var(--text-secondary)",
          textAlign: "center",
          maxWidth: "500px",
          direction: "rtl",
        }}
        lang="he"
      >
        לקרוא מהר זה מיתוס.
        <br />
        לקרוא טוב יותר זה מדע.
      </p>

      {/* Subtle divider */}
      <div
        style={{
          width: "40px",
          height: "1px",
          backgroundColor: "var(--border)",
          marginBlock: "var(--space-10)",
        }}
        aria-hidden="true"
      />

      {/* Feature list — brief, honest */}
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          textAlign: "center",
          fontFamily: "var(--font-assistant)",
          fontSize: "var(--ui-size)",
          color: "var(--text-tertiary)",
          direction: "rtl",
        }}
        lang="he"
      >
        <li>קריאה מהירה RSVP עם ORP מותאם למורפולוגיה עברית</li>
        <li>הבנת הנקרא מבוססת AI עם 5 שאלות ברמות Bloom</li>
        <li>סימולטור פסיכומטרי — אימון מכוון-שאלה</li>
        <li>חזרה מרווחת FSRS לשמירת אוצר מילים</li>
      </ul>

      {/* CTA */}
      <div
        style={{
          marginBlockStart: "var(--space-12)",
          display: "flex",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/read"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-3) var(--space-8)",
            backgroundColor: "var(--accent)",
            color: "#fff",
            fontFamily: "var(--font-heebo)",
            fontWeight: 500,
            fontSize: "var(--ui-size)",
            borderRadius: "8px",
            textDecoration: "none",
            transition: `background-color var(--duration-quick) var(--ease-ui)`,
            direction: "rtl",
          }}
          lang="he"
        >
          התחל לקרוא
        </Link>
        <Link
          href="/home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-3) var(--space-8)",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-heebo)",
            fontWeight: 400,
            fontSize: "var(--ui-size)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            textDecoration: "none",
            direction: "rtl",
          }}
          lang="he"
        >
          פתח את האפליקציה
        </Link>
      </div>

      {/* Build status */}
      <p
        style={{
          position: "fixed",
          bottom: "var(--space-4)",
          insetInlineEnd: "var(--space-6)",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--text-tertiary)",
          opacity: 0.5,
        }}
      >
        v0.1.0 — Week 1 Foundation
      </p>
    </main>
  );
}
