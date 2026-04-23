"use client";

import { useMemo } from "react";
import { splitAtPivot } from "@/engines/orp";
import { useRsvpStore } from "@/stores/rsvp";
import type { Token } from "@/types/token";

type Props = {
  token: Token;
  fontSize?: string;
};

/**
 * Renders a single token with its ORP pivot letter in --root-red.
 * This is the most-rendered component in the app — keep it lean.
 */
export function PivotWord({ token, fontSize = "var(--reading-size)" }: Props) {
  const orpMode = useRsvpStore((s) => s.orpMode);
  const nikudMode = useRsvpStore((s) => s.nikudMode);

  const displaySurface = useMemo(() => {
    if (nikudMode === "full" && token.nikud) return token.nikud;
    if (nikudMode === "partial" && token.nikudPartial) return token.nikudPartial;
    return token.surface;
  }, [token, nikudMode]);

  const { before, pivot, after } = useMemo(
    () => splitAtPivot({ ...token, surface: displaySurface }, orpMode),
    [token, displaySurface, orpMode],
  );

  return (
    <span
      style={{ fontSize, lineHeight: 1, direction: "rtl", unicodeBidi: "isolate" }}
      lang="he"
    >
      <span>{before}</span>
      <span className="rsvp-pivot" aria-hidden="true">
        {pivot}
      </span>
      <span>{after}</span>
    </span>
  );
}
