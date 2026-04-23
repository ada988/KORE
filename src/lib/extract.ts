"use client";

/**
 * Client-side article extraction.
 * Because the app ships as a static export, there's no server to proxy
 * through. We try a direct fetch first (will fail on most sites due to CORS),
 * then fall back to r.jina.ai — a public reader service that returns a
 * text-only rendering of any URL. No API key required.
 */

export type ExtractResult = {
  title: string;
  body: string;
  siteName?: string;
  byline?: string;
  url: string;
};

export type RssItem = {
  title: string;
  url: string;
  summary: string;
  pubDate?: string | undefined;
};

/**
 * Fetch an RSS or Atom feed via r.jina.ai proxy (returns text) and parse to items.
 */
export async function fetchFeed(feedUrl: string): Promise<{ feedTitle: string; items: RssItem[] }> {
  const parsed = new URL(feedUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("unsupported protocol");
  }

  // Use allorigins for raw XML pass-through — r.jina.ai converts to text
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`feed fetch failed (${res.status})`);
  const xml = await res.text();

  const feedTitle = /<channel>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i.exec(xml)?.[1]?.trim()
    ?? /<feed[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i.exec(xml)?.[1]?.trim()
    ?? parsed.hostname;

  const items: RssItem[] = [];
  // RSS <item>
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1] ?? "";
    const title = strip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block)?.[1] ?? "");
    const url = strip(/<link[^>]*>([\s\S]*?)<\/link>/i.exec(block)?.[1] ?? "");
    const desc = strip(/<description[^>]*>([\s\S]*?)<\/description>/i.exec(block)?.[1] ?? "");
    const pubDate = strip(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i.exec(block)?.[1] ?? "");
    if (title && url) items.push({ title, url, summary: desc.slice(0, 200), pubDate: pubDate || undefined });
  }
  // Atom <entry>
  if (items.length === 0) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    while ((m = entryRegex.exec(xml)) !== null) {
      const block = m[1] ?? "";
      const title = strip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block)?.[1] ?? "");
      const url = /<link[^>]*href=["']([^"']+)["']/i.exec(block)?.[1] ?? "";
      const summary = strip(/<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(block)?.[1] ?? "");
      if (title && url) items.push({ title, url, summary: summary.slice(0, 200) });
    }
  }

  if (items.length === 0) throw new Error("no items");
  return { feedTitle: strip(feedTitle), items: items.slice(0, 30) };
}

function strip(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractArticle(url: string): Promise<ExtractResult> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("unsupported protocol");
  }

  const proxyUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(proxyUrl, {
    headers: {
      Accept: "text/plain",
      "X-Return-Format": "text",
      "X-With-Generated-Alt": "false",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`extraction failed (${res.status})`);
  }
  const raw = await res.text();

  const titleMatch = /^Title:\s*(.+)$/m.exec(raw);
  const siteMatch = /^URL Source:\s*(.+)$/m.exec(raw);
  const title = titleMatch?.[1]?.trim() ?? parsed.hostname;
  let siteName = parsed.hostname;
  try {
    if (siteMatch?.[1]) siteName = new URL(siteMatch[1]).hostname;
  } catch { /* fall back to parsed hostname */ }

  const bodyIdx = raw.indexOf("Markdown Content:");
  let body = bodyIdx >= 0 ? raw.slice(bodyIdx + "Markdown Content:".length).trim() : raw.trim();

  body = cleanMarkdown(body);

  if (body.length < 80) throw new Error("no content extracted");

  return { title, body, siteName, url };
}

function cleanMarkdown(input: string): string {
  let s = input;

  // Strip images: ![alt](url) and ![alt][ref]
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  s = s.replace(/!\[[^\]]*\]\[[^\]]*\]/g, "");

  // Strip link-wrapped citation numbers: [[1]](url), [1]
  s = s.replace(/\[\[\d+\]\]\([^)]+\)/g, "");
  s = s.replace(/\[\d+\]/g, "");

  // Strip Wikipedia-style "[source needed]" etc. in Hebrew
  s = s.replace(/\[דרוש מקור[^\]]*\]/g, "");
  s = s.replace(/\[citation needed\]/gi, "");

  // Collapse markdown links to plain text: [text](url) → text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Strip remaining bare URLs
  s = s.replace(/\bhttps?:\/\/\S+/g, "");

  // Strip headings, bold/italic markers, blockquote marks
  s = s.replace(/^\s{0,3}#+\s*/gm, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  s = s.replace(/^\s{0,3}>\s?/gm, "");
  s = s.replace(/^\s{0,3}[-*+]\s+/gm, "• ");

  // Drop "Image N" orphan labels from jina.ai rendering
  s = s.replace(/^Image \d+.*$/gmi, "");

  // Drop table rows / pipe separators → convert to commas
  s = s.replace(/^\s*\|.*\|.*$/gm, (row) =>
    row.split("|").map((c) => c.trim()).filter(Boolean).join(", "),
  );

  // Collapse multiple spaces and blank-line runs
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");

  // Drop lines that are just 1-2 words (nav/button remnants)
  s = s
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t.length === 0) return true;
      if (t.length < 6) return false;
      return true;
    })
    .join("\n");

  return s.trim();
}
