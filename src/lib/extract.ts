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
