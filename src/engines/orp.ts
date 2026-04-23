import type { Token } from "@/types/token";

export type OrpMode = "fixed" | "root" | "classic";

/**
 * Hebrew prefix clusters that can precede a content word.
 * Order matters: longest first (וכשה before כשה before שה).
 * Source: standard Hebrew morphology + Deutsch & Rayner 1999 foveal
 * landing-position research showing prefix-position effects.
 */
const HEBREW_PREFIX_CLUSTERS = [
  "וכשה", "ובשה", "ולשה", "ומשה", "ושה", "וכש",
  "כשה", "בשה", "לשה", "משה",
  "וה", "וב", "ול", "ומ", "וכ",
  "שה", "שב", "של", "שמ", "שכ",
  "כש", "כה", "כב",
  "מה", "מב",
  "בה", "בב",
  "לה", "לב",
  "ה", "ו", "ש", "ב", "ל", "מ", "כ",
];

/**
 * Detect the index where the stem starts, i.e. how many chars of prefix
 * cluster are at the front of the surface string (LTR memory order).
 * Conservative: only strips if the resulting stem is >= 3 chars.
 */
export function hebrewStemStart(surface: string): number {
  const bare = surface.replace(/[֑-ׇ]/g, "");
  for (const pfx of HEBREW_PREFIX_CLUSTERS) {
    if (bare.startsWith(pfx) && bare.length - pfx.length >= 3) {
      // Map the bare-index back to surface-index (nikud chars added offset)
      return findSurfaceIndex(surface, pfx.length);
    }
  }
  return 0;
}

function findSurfaceIndex(surface: string, bareIdx: number): number {
  let count = 0;
  for (let i = 0; i < surface.length; i++) {
    const ch = surface[i];
    if (!ch) continue;
    if (/[֑-ׇ]/.test(ch)) continue;
    if (count === bareIdx) return i;
    count++;
  }
  return surface.length;
}

/**
 * Computes the pivot character index within a token's surface string.
 * Modes:
 *  - "classic": ~30% from start
 *  - "root":    morphology-adaptive — skip Hebrew prefix cluster, then 30% of stem
 *  - "fixed":   Spritz length-based lookup
 */
export function computeOrpPosition(token: Token, mode: OrpMode): number {
  const len = token.surface.length;
  if (len === 0) return 0;

  if (mode === "root") {
    // Prefer explicit root-letter positions when available (from DictaBERT)
    if (token.rootPositions !== undefined) {
      const mid = Math.floor(token.rootPositions.length / 2);
      return token.rootPositions[mid] ?? Math.floor(len * 0.3);
    }
    // Heuristic: strip Hebrew prefix cluster, then ~30% of stem
    const stemStart = hebrewStemStart(token.surface);
    const stemLen = len - stemStart;
    if (stemLen >= 3) {
      return stemStart + Math.max(0, Math.floor(stemLen * 0.3));
    }
    return Math.max(0, Math.floor(len * 0.3));
  }

  if (mode === "classic") {
    return Math.max(0, Math.floor(len * 0.3));
  }

  if (len <= 2) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

/**
 * Splits a token's surface into three segments: before, pivot, after.
 * Used by the PivotWord component to colorize the pivot character.
 */
export function splitAtPivot(
  token: Token,
  mode: OrpMode,
): { before: string; pivot: string; after: string } {
  const pos = computeOrpPosition(token, mode);
  const s = token.surface;
  return {
    before: s.slice(0, pos),
    pivot: s.slice(pos, pos + 1),
    after: s.slice(pos + 1),
  };
}
