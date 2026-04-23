import type { Token } from "@/types/token";

export type OrpMode = "fixed" | "root" | "classic";

/**
 * Computes the pivot character index within a token's surface string.
 *
 * The pivot is the character rendered in --root-red in the RSVP view.
 * Three modes:
 *  - "classic": ~30% from the start (mirrored Spritz-style for RTL Hebrew)
 *  - "root": center on the middle root letter (the unique KORÉ feature)
 *  - "fixed": Spritz lookup table by word length
 *
 * Returns an index into token.surface (0-based, left-to-right within the string).
 * Note: Hebrew strings in JS are stored LTR in memory even though rendered RTL.
 */
export function computeOrpPosition(token: Token, mode: OrpMode): number {
  const len = token.surface.length;

  if (len === 0) return 0;

  if (mode === "root" && token.rootPositions !== undefined) {
    // Center on the MIDDLE root letter of the 3-letter root
    const mid = Math.floor(token.rootPositions.length / 2);
    return token.rootPositions[mid] ?? Math.floor(len * 0.3);
  }

  if (mode === "classic") {
    // Spritz-style: pivot at ~30% from start of the surface string.
    // For RTL Hebrew rendered in a RTL context this positions the pivot
    // visually in the right portion of the word as the eye expects.
    return Math.max(0, Math.floor(len * 0.3));
  }

  // "fixed" mode: Spritz original lookup table, adapted for Hebrew
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
