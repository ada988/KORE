"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEMO_PASSAGES } from "@/lib/demo-passages";
import { savePassage, getSavedPassages } from "@/lib/session-utils";
import { tokenizeText } from "@/lib/tokenize";
import type { Passage } from "@/types/database";

type View = "browse" | "paste";

export default function ReadPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("browse");
  const [text, setText] = useState("");
  const [savedPassages, setSavedPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSavedPassages().then(setSavedPassages);
  }, []);

  const handleStart = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    const tokenized = tokenizeText(text, "tmp", "קריאה חופשית");
    const id = await savePassage("קריאה חופשית", text, tokenized.wordCount, tokenized.charCount);
    router.push(`/read/${id}`);
  }, [text, router]);

  if (view === "paste") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <button onClick={() => setView("browse")} style={backBtn}>← חזור</button>
          <h1 style={pageTitle}>הדבקת טקסט</h1>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          dir="rtl"
          lang="he"
          placeholder="הדבק כאן כל טקסט עברי..."
          style={{
            flex: 1, width: "100%",
            fontFamily: "var(--font-heebo)", fontSize: "var(--ui-size)", lineHeight: 1.7,
            color: "var(--text-primary)", backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)", borderRadius: "12px",
            padding: "var(--space-4)", resize: "none", outline: "none", direction: "rtl",
            minHeight: "240px",
          }}
        />
        <button
          onClick={handleStart}
          disabled={!text.trim() || loading}
          style={{
            ...accentBtn,
            marginTop: "var(--space-4)",
            opacity: !text.trim() || loading ? 0.5 : 1,
          }}
        >
          {loading ? "...טוען" : "התחל לקרוא"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={pageTitle}>קריאה</h1>
        <button onClick={() => setView("paste")} style={accentBtn}>+ הוסף טקסט</button>
      </div>

      {/* Saved passages */}
      {savedPassages.length > 0 && (
        <section>
          <h2 style={sectionHeader}>שמורים</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {savedPassages.map((p) => (
              <PassageRow
                key={p.id}
                title={p.title}
                wordCount={p.word_count}
                band={p.difficulty_band ?? "medium"}
                domain={p.domain ?? "כללי"}
                onClick={() => router.push(`/read/${p.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Demo library */}
      <section>
        <h2 style={sectionHeader}>ספרייה</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {DEMO_PASSAGES.map((p) => (
            <PassageRow
              key={p.id}
              title={p.title}
              author={p.author}
              wordCount={p.word_count}
              band={p.difficulty_band}
              domain={p.domain}
              onClick={() => router.push(`/read/${p.id}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PassageRow({
  title, author, wordCount, band, domain, onClick,
}: {
  title: string; author?: string | undefined; wordCount: number;
  band: string; domain: string; onClick: () => void;
}) {
  const bandColors: Record<string, string> = {
    easy: "var(--comp-green)", medium: "var(--focus-amber)",
    hard: "var(--root-red)", pet: "var(--accent)",
  };
  const bandLabels: Record<string, string> = {
    easy: "קל", medium: "בינוני", hard: "קשה", pet: "פסיכומטרי",
  };
  const color = bandColors[band] ?? bandColors.medium;

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "var(--space-4)", textAlign: "right",
        cursor: "pointer", width: "100%", WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "var(--ui-size)",
          color: "var(--text-primary)", marginBottom: "4px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {title}
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
          {author && (
            <span style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)" }}>
              {author}
            </span>
          )}
          <span style={{
            fontFamily: "var(--font-assistant)", fontSize: "11px", fontWeight: 600,
            color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
            padding: "1px 8px", borderRadius: "20px",
          }}>
            {bandLabels[band] ?? band}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)" }}>
            <bdi>{wordCount}</bdi> מילים
          </span>
          <span style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)" }}>
            {domain}
          </span>
        </div>
      </div>
      <span style={{ color: "var(--accent)", marginInlineStart: "var(--space-3)", flexShrink: 0 }}>←</span>
    </button>
  );
}

const pageTitle: React.CSSProperties = {
  fontFamily: "var(--font-rubik)", fontWeight: 700,
  fontSize: "var(--text-h2)", color: "var(--text-primary)",
};
const sectionHeader: React.CSSProperties = {
  fontFamily: "var(--font-assistant)", fontWeight: 600, fontSize: "14px",
  color: "var(--text-tertiary)", marginBottom: "var(--space-3)",
};
const backBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)",
  color: "var(--text-tertiary)", padding: "var(--space-1)",
};
const accentBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "var(--space-2) var(--space-5)",
  backgroundColor: "var(--accent)", color: "#fff",
  fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "var(--ui-size)",
  borderRadius: "10px", border: "none", cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};
