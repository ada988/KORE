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
  // Validate URL
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("unsupported protocol");
  }

  // Try jina.ai reader (returns markdown-ish plain text)
  const proxyUrl = `https://r.jina.ai/${url}`;
  const res = await fetch(proxyUrl, {
    headers: { Accept: "text/plain", "X-Return-Format": "text" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`extraction failed (${res.status})`);
  }
  const raw = await res.text();

  // Parse jina's response: first non-empty line after "Title:" header
  const titleMatch = /^Title:\s*(.+)$/m.exec(raw);
  const siteMatch = /^URL Source:\s*(.+)$/m.exec(raw);
  const title = titleMatch?.[1]?.trim() ?? parsed.hostname;
  const siteName = siteMatch?.[1] ? new URL(siteMatch[1]).hostname : parsed.hostname;

  // Body starts after "Markdown Content:" marker
  const bodyIdx = raw.indexOf("Markdown Content:");
  let body = bodyIdx >= 0 ? raw.slice(bodyIdx + "Markdown Content:".length).trim() : raw.trim();

  // Strip markdown artifacts (headings, images, links) but keep text
  body = body
    .replace(/^\s*#+\s*/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (body.length < 40) throw new Error("no content extracted");

  return { title, body, siteName, url };
}
