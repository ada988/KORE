"use client";

/**
 * Client-side call to Dicta's Nakdan API (free v2 endpoint, open CORS).
 * Adds vowel pointing (nikud) to unpointed Hebrew text.
 * For homograph-selective mode, we apply nikud only to tokens where multiple
 * valid readings exist (per Bar-On & Ravid 2017 — 25-40% of content words).
 */

type DictaOption = [string, Array<[string, string, boolean]>];
type DictaWord = {
  word: string;
  sep: boolean;
  options: DictaOption[];
  fpasuk: boolean;
};

export type NakdanMap = {
  /** Surface token (unpointed) → full nikud form */
  full: Map<string, string>;
  /** Surface token → partial nikud only if ambiguous (>=2 readings) */
  partial: Map<string, string>;
  /** Surface → flag indicating whether this token had ambiguity */
  ambiguous: Map<string, boolean>;
};

const ENDPOINT = "https://nakdan-2-0.loadbalancer.dicta.org.il/api";

export async function nakdanize(text: string): Promise<NakdanMap> {
  if (!text.trim()) {
    return { full: new Map(), partial: new Map(), ambiguous: new Map() };
  }

  // Dicta v2 has ~10k char limit per call — chunk if needed
  const chunks = chunkText(text, 8000);
  const full = new Map<string, string>();
  const partial = new Map<string, string>();
  const ambiguous = new Map<string, boolean>();

  for (const chunk of chunks) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        task: "nakdan",
        genre: "modern",
        data: chunk,
        addmorph: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`nakdan ${res.status}`);

    const words: DictaWord[] = await res.json();
    for (const w of words) {
      if (w.sep || !w.word) continue;
      const options = w.options;
      if (!options || options.length === 0) continue;
      const first = options[0]?.[0];
      if (!first) continue;

      full.set(w.word, first);

      // Homograph-selective: two or more distinct pointings
      const distinctForms = new Set(options.map((o) => o[0]));
      if (distinctForms.size >= 2) {
        ambiguous.set(w.word, true);
        partial.set(w.word, first);
      }
    }
  }

  return { full, partial, ambiguous };
}

function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxLen, text.length);
    if (end < text.length) {
      // Break on whitespace
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > i) end = lastSpace;
    }
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

const CACHE_KEY_PREFIX = "kore-nakdan:";

export function getCachedNakdan(passageId: string): NakdanMap | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CACHE_KEY_PREFIX + passageId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { full: [string, string][]; partial: [string, string][]; ambiguous: [string, boolean][] };
    return {
      full: new Map(parsed.full),
      partial: new Map(parsed.partial),
      ambiguous: new Map(parsed.ambiguous),
    };
  } catch {
    return null;
  }
}

export function cacheNakdan(passageId: string, map: NakdanMap): void {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      full: Array.from(map.full.entries()),
      partial: Array.from(map.partial.entries()),
      ambiguous: Array.from(map.ambiguous.entries()),
    };
    window.localStorage.setItem(CACHE_KEY_PREFIX + passageId, JSON.stringify(payload));
  } catch {
    // storage full — ignore
  }
}
