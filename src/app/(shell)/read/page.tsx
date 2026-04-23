"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DEMO_PASSAGES } from "@/lib/demo-passages";
import { savePassage, getSavedPassages, deletePassage, getBookmark } from "@/lib/session-utils";
import { extractArticle, fetchFeed, type RssItem } from "@/lib/extract";
import { importFile } from "@/lib/file-import";
import { tokenizeText } from "@/lib/tokenize";
import * as haptics from "@/lib/haptics";
import { IconLink, IconBookmark, IconShare, IconTrash, IconPlus } from "@/components/ui/Icons";
import type { Passage } from "@/types/database";

type View = "browse" | "paste" | "url" | "rss";
type Category = "all" | "library" | "saved" | "easy" | "medium" | "hard" | "pet";

type UrlPreview = {
  title: string;
  body: string;
  siteName: string;
  wordCount: number;
  sourceUrl: string;
};

export default function ReadPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("browse");
  const [text, setText] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [urlPreview, setUrlPreview] = useState<UrlPreview | null>(null);
  const [rssUrl, setRssUrl] = useState("");
  const [rssItems, setRssItems] = useState<RssItem[]>([]);
  const [rssFeedTitle, setRssFeedTitle] = useState("");
  const [title, setTitle] = useState("");
  const [savedPassages, setSavedPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => getSavedPassages().then(setSavedPassages), []);
  useEffect(() => { refresh(); }, [refresh]);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2000);
  };

  const handleStart = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    const passageTitle = title.trim() || "קריאה חופשית";
    const tokenized = tokenizeText(text, "tmp", passageTitle);
    const id = await savePassage(passageTitle, text, tokenized.wordCount, tokenized.charCount);
    haptics.success();
    router.push(`/read/${id}`);
  }, [text, title, router]);

  const handleFileImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.epub,.txt,.md,application/pdf,application/epub+zip,text/plain";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setLoading(true);
      try {
        const imp = await importFile(file);
        if (imp.body.length < 40) throw new Error("empty");
        const tokenized = tokenizeText(imp.body, "tmp", imp.title);
        const id = await savePassage(
          imp.title, imp.body,
          tokenized.wordCount, tokenized.charCount,
          { source_type: imp.sourceType === "txt" ? "paste" : imp.sourceType },
        );
        haptics.success();
        router.push(`/read/${id}`);
      } catch (err) {
        haptics.error();
        const msg = err instanceof Error ? err.message : "unknown";
        flash(`ייבוא נכשל: ${msg.slice(0, 40)}`);
        setLoading(false);
      }
    };
    input.click();
  }, [router]);

  const handleFetchFeed = useCallback(async () => {
    if (!rssUrl.trim()) return;
    setLoading(true);
    try {
      const { items, feedTitle } = await fetchFeed(rssUrl.trim());
      setRssItems(items);
      setRssFeedTitle(feedTitle);
      haptics.success();
    } catch {
      haptics.error();
      flash("לא הצלחנו לטעון את הפיד");
    } finally {
      setLoading(false);
    }
  }, [rssUrl]);

  const handleRssItemOpen = useCallback(async (item: RssItem) => {
    setLoading(true);
    try {
      const data = await extractArticle(item.url);
      const tokenized = tokenizeText(data.body, "tmp", data.title || item.title);
      const id = await savePassage(
        data.title || item.title, data.body,
        tokenized.wordCount, tokenized.charCount,
        { source_type: "url", source_url: item.url, domain: data.siteName ?? null },
      );
      haptics.success();
      router.push(`/read/${id}`);
    } catch {
      haptics.error();
      flash("לא הצלחנו לטעון את הכתבה");
      setLoading(false);
    }
  }, [router]);

  const handleUrlImport = useCallback(async () => {
    if (!urlValue.trim()) return;
    setLoading(true);
    setUrlPreview(null);
    try {
      const data = await extractArticle(urlValue.trim());
      const tokenized = tokenizeText(data.body, "tmp", data.title);
      setUrlPreview({
        title: data.title,
        body: data.body,
        siteName: data.siteName ?? "",
        wordCount: tokenized.wordCount,
        sourceUrl: urlValue.trim(),
      });
      haptics.success();
    } catch (err) {
      haptics.error();
      const msg = err instanceof Error ? err.message : "unknown";
      flash(`לא הצלחנו לייבא: ${msg.slice(0, 40)}`);
    } finally {
      setLoading(false);
    }
  }, [urlValue]);

  const handleConfirmImport = useCallback(async () => {
    if (!urlPreview) return;
    setLoading(true);
    const tokenized = tokenizeText(urlPreview.body, "tmp", urlPreview.title);
    const id = await savePassage(
      urlPreview.title, urlPreview.body,
      tokenized.wordCount, tokenized.charCount,
      { source_type: "url", source_url: urlPreview.sourceUrl, domain: urlPreview.siteName || null },
    );
    haptics.success();
    router.push(`/read/${id}`);
  }, [urlPreview, router]);

  const allPassages = useMemo(() => {
    const demos = DEMO_PASSAGES.map((p) => ({
      ...p, _kind: "library" as const,
    }));
    const saved = savedPassages.map((p) => ({
      id: p.id, title: p.title, author: p.author ?? undefined,
      difficulty_band: p.difficulty_band ?? "medium",
      domain: p.domain ?? "כללי", word_count: p.word_count,
      _kind: "saved" as const,
    }));
    return [...saved, ...demos];
  }, [savedPassages]);

  const filtered = useMemo(() => {
    if (category === "all") return allPassages;
    if (category === "library") return allPassages.filter((p) => p._kind === "library");
    if (category === "saved") return allPassages.filter((p) => p._kind === "saved");
    return allPassages.filter((p) => p.difficulty_band === category);
  }, [allPassages, category]);

  if (view === "paste") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <button onClick={() => setView("browse")} style={backBtn}>← חזור</button>
          <h1 style={pageTitle}>הדבקת טקסט</h1>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="כותרת (אופציונלי)"
          dir="rtl"
          style={{
            fontFamily: "var(--font-heebo)", fontSize: "15px",
            color: "var(--text-primary)", backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)", borderRadius: "10px",
            padding: "var(--space-3) var(--space-4)", outline: "none",
            marginBottom: "var(--space-3)",
          }}
        />
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
          style={{ ...accentBtn, marginTop: "var(--space-4)", opacity: !text.trim() || loading ? 0.5 : 1 }}
        >
          {loading ? "...טוען" : "התחל לקרוא"}
        </button>
      </div>
    );
  }

  if (view === "rss") {
    return (
      <div style={{ display: "flex", flexDirection: "column", padding: "var(--space-4)", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button onClick={() => setView("browse")} style={backBtn}>← חזור</button>
          <h1 style={pageTitle}>פידים (RSS)</h1>
        </div>
        <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          הדבק כתובת פיד RSS/Atom של אתר חדשות, בלוג, או פודקאסט.
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <input
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            placeholder="https://site.co.il/feed"
            dir="ltr"
            style={{
              flex: 1, fontFamily: "var(--font-mono)", fontSize: "13px",
              color: "var(--text-primary)", backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)", borderRadius: "10px",
              padding: "var(--space-3)", outline: "none",
            }}
          />
          <button onClick={handleFetchFeed} disabled={!rssUrl.trim() || loading} style={{ ...accentBtn, opacity: !rssUrl.trim() || loading ? 0.5 : 1 }}>
            {loading ? "..." : "טען"}
          </button>
        </div>
        {rssFeedTitle && (
          <p style={{ fontFamily: "var(--font-assistant)", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
            {rssFeedTitle}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {rssItems.map((item) => (
            <button
              key={item.url}
              onClick={() => handleRssItemOpen(item)}
              disabled={loading}
              style={{
                backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "var(--space-3) var(--space-4)",
                textAlign: "right", cursor: loading ? "wait" : "pointer",
                direction: "rtl",
              }}
            >
              <p style={{ fontFamily: "var(--font-heebo)", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "3px" }}>
                {item.title}
              </p>
              {item.summary && (
                <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                  {item.summary}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === "url") {
    return (
      <div style={{ display: "flex", flexDirection: "column", padding: "var(--space-4)", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button onClick={() => { setView("browse"); setUrlPreview(null); }} style={backBtn}>← חזור</button>
          <h1 style={pageTitle}>ייבוא מכתובת</h1>
        </div>

        {!urlPreview && (
          <>
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              הדבק כתובת של מאמר באינטרנט. הטקסט יחולץ דרך r.jina.ai ויהיה זמין לקריאה במצב לא מקוון.
            </p>
            <input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.co.il/article"
              dir="ltr"
              style={{
                fontFamily: "var(--font-mono)", fontSize: "14px",
                color: "var(--text-primary)", backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)", borderRadius: "10px",
                padding: "var(--space-3) var(--space-4)", outline: "none",
              }}
            />
            <button
              onClick={handleUrlImport}
              disabled={!urlValue.trim() || loading}
              style={{ ...accentBtn, opacity: !urlValue.trim() || loading ? 0.5 : 1 }}
            >
              {loading ? "...מחלץ" : "חלץ טקסט"}
            </button>
            <div style={{
              padding: "var(--space-3) var(--space-4)",
              backgroundColor: "var(--bg-surface)", borderRadius: "10px",
              border: "1px solid var(--border)", borderInlineStart: "3px solid var(--focus-amber)",
            }}>
              <p style={{ fontFamily: "var(--font-assistant)", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                הייבוא כפוף לזכויות יוצרים. יש להשתמש רק בתוכן שיש לך הרשאה לקרוא.
              </p>
            </div>
          </>
        )}

        {urlPreview && (
          <>
            <div style={{
              padding: "var(--space-4)", backgroundColor: "var(--bg-surface)",
              borderRadius: "12px", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", gap: "var(--space-2)",
            }}>
              <input
                value={urlPreview.title}
                onChange={(e) => setUrlPreview({ ...urlPreview, title: e.target.value })}
                style={{
                  fontFamily: "var(--font-heebo)", fontSize: "17px", fontWeight: 600,
                  color: "var(--text-primary)", backgroundColor: "transparent",
                  border: "none", outline: "none", direction: "rtl",
                }}
              />
              <div style={{ display: "flex", gap: "var(--space-3)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                <span>{urlPreview.siteName}</span>
                <span>·</span>
                <span><bdi>{urlPreview.wordCount}</bdi> מילים</span>
              </div>
            </div>
            <textarea
              value={urlPreview.body}
              onChange={(e) => setUrlPreview({ ...urlPreview, body: e.target.value })}
              dir="rtl"
              lang="he"
              style={{
                minHeight: "280px", maxHeight: "420px", resize: "vertical",
                fontFamily: "var(--font-heebo)", fontSize: "14px", lineHeight: 1.7,
                color: "var(--text-primary)", backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)", borderRadius: "12px",
                padding: "var(--space-4)", outline: "none", direction: "rtl",
              }}
            />
            <p style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)", textAlign: "center" }}>
              ערוך את הטקסט אם יש שאריות תפריט או ניווט
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              <button onClick={() => setUrlPreview(null)} style={ghostBtnInline}>נסה שוב</button>
              <button onClick={handleConfirmImport} disabled={loading} style={{ ...accentBtn, opacity: loading ? 0.5 : 1 }}>
                {loading ? "..." : "שמור ופתח"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const CATEGORIES: { id: Category; label: string }[] = [
    { id: "all", label: "הכל" },
    { id: "saved", label: "שמורים" },
    { id: "library", label: "ספרייה" },
    { id: "easy", label: "קל" },
    { id: "medium", label: "בינוני" },
    { id: "hard", label: "קשה" },
    { id: "pet", label: "פסיכומטרי" },
  ];

  return (
    <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={pageTitle}>קריאה</h1>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button onClick={() => { handleFileImport(); haptics.tap(); }} style={iconBtn} aria-label="קובץ">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </button>
          <button onClick={() => { setView("rss"); haptics.tap(); }} style={iconBtn} aria-label="RSS">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
            </svg>
          </button>
          <button onClick={() => { setView("url"); haptics.tap(); }} style={iconBtn} aria-label="ייבא מכתובת">
            <IconLink size={16} />
          </button>
          <button onClick={() => { setView("paste"); haptics.tap(); }} style={accentBtn}>
            <IconPlus size={14} style={{ marginInlineEnd: "4px" }} />
            טקסט
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCategory(c.id); haptics.tap(); }}
            style={{
              padding: "6px 14px", flexShrink: 0,
              backgroundColor: category === c.id ? "var(--accent)" : "var(--bg-surface)",
              color: category === c.id ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${category === c.id ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "20px", fontFamily: "var(--font-assistant)", fontSize: "13px",
              fontWeight: category === c.id ? 600 : 400, cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: "var(--space-8) var(--space-4)", textAlign: "center",
          color: "var(--text-tertiary)", fontFamily: "var(--font-assistant)",
          fontSize: "14px",
        }}>
          אין קטעים בקטגוריה זו
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {filtered.map((p) => (
          <PassageRow
            key={p.id}
            passage={p}
            onClick={() => router.push(`/read/${p.id}`)}
            onHistory={() => router.push(`/passages/${p.id}/history`)}
            onDelete={p._kind === "saved" ? async () => {
              await deletePassage(p.id);
              haptics.bump();
              refresh();
            } : undefined}
          />
        ))}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + var(--space-4))",
          insetInline: 0, display: "flex", justifyContent: "center", zIndex: 150,
        }}>
          <div style={toastStyle}>{toast}</div>
        </div>
      )}
    </div>
  );
}

function PassageRow({
  passage, onClick, onDelete, onHistory,
}: {
  passage: { id: string; title: string; author?: string | undefined; word_count: number; difficulty_band: string; domain: string; _kind: "library" | "saved" };
  onClick: () => void;
  onDelete?: (() => void) | undefined;
  onHistory: () => void;
}) {
  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => { setBookmarked(getBookmark(passage.id) !== null); }, [passage.id]);

  const bandColors: Record<string, string> = {
    easy: "var(--comp-green)", medium: "var(--focus-amber)",
    hard: "var(--root-red)", pet: "var(--accent)",
  };
  const bandLabels: Record<string, string> = {
    easy: "קל", medium: "בינוני", hard: "קשה", pet: "פסיכומטרי",
  };
  const color = bandColors[passage.difficulty_band] ?? bandColors.medium;

  const share = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Preserve any basePath (e.g. /KORE) from the current pathname
    const pathPrefix = window.location.pathname.split("/read")[0] ?? "";
    const url = `${window.location.origin}${pathPrefix}/read/${passage.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: passage.title, url }); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        haptics.success();
      } catch { /* clipboard denied */ }
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "var(--space-4)", cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
          {bookmarked && <IconBookmark size={12} style={{ color: "var(--focus-amber)", flexShrink: 0 }} />}
          <p style={{
            fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "var(--ui-size)",
            color: "var(--text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {passage.title}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
          {passage.author && (
            <span style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)" }}>
              {passage.author}
            </span>
          )}
          <span style={{
            fontFamily: "var(--font-assistant)", fontSize: "11px", fontWeight: 600,
            color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
            padding: "1px 8px", borderRadius: "20px",
          }}>
            {bandLabels[passage.difficulty_band] ?? passage.difficulty_band}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
            <bdi>{passage.word_count}</bdi> מילים
          </span>
          <span style={{ fontFamily: "var(--font-assistant)", fontSize: "11px", color: "var(--text-tertiary)" }}>
            {passage.domain}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center", marginInlineStart: "var(--space-2)" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onHistory(); }}
          style={iconBtnInline} aria-label="היסטוריה"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v5l3 2"/><circle cx="12" cy="12" r="9"/>
          </svg>
        </button>
        <button onClick={share} style={iconBtnInline} aria-label="שתף">
          <IconShare size={14} style={{ color: "var(--text-tertiary)" }} />
        </button>
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={iconBtnInline} aria-label="מחק">
            <IconTrash size={14} style={{ color: "var(--error-red)" }} />
          </button>
        )}
      </div>
    </div>
  );
}

const pageTitle: React.CSSProperties = {
  fontFamily: "var(--font-rubik)", fontWeight: 700,
  fontSize: "var(--text-h2)", color: "var(--text-primary)",
};
const backBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontFamily: "var(--font-assistant)", fontSize: "var(--text-caption)",
  color: "var(--text-tertiary)", padding: "var(--space-1)",
};
const accentBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "var(--space-2) var(--space-4)",
  backgroundColor: "var(--accent)", color: "#fff",
  fontFamily: "var(--font-heebo)", fontWeight: 500, fontSize: "14px",
  borderRadius: "10px", border: "none", cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};
const iconBtn: React.CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)",
  borderRadius: "10px", border: "1px solid var(--border)", cursor: "pointer",
};
const ghostBtnInline: React.CSSProperties = {
  padding: "var(--space-3)", backgroundColor: "var(--bg-surface)",
  color: "var(--text-secondary)", fontFamily: "var(--font-heebo)",
  fontWeight: 400, fontSize: "14px", borderRadius: "10px",
  border: "1px solid var(--border)", cursor: "pointer",
};
const iconBtnInline: React.CSSProperties = {
  padding: "6px", backgroundColor: "transparent", border: "none", cursor: "pointer",
  borderRadius: "6px", WebkitTapHighlightColor: "transparent",
};
const toastStyle: React.CSSProperties = {
  backgroundColor: "var(--text-primary)", color: "var(--bg)",
  padding: "var(--space-2) var(--space-4)", borderRadius: "10px",
  fontFamily: "var(--font-heebo)", fontSize: "13px",
};
