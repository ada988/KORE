import type { Token, ProcessedPassage } from "@/types/token";

const PUNCT_END = /[.!?]/;
const CLAUSE_END = /[,;:]/;
const WHITESPACE = /^\s+$/;
const PUNCT = /^[^\u05D0-\u05EAa-zA-Z0-9]+$/;

export function tokenizeText(text: string, id: string, title: string): ProcessedPassage {
  const raw = text.trim();
  const tokens: Token[] = [];
  let idx = 0;
  let wordCount = 0;

  // Split on whitespace boundaries, keeping delimiters
  const parts = raw.split(/(\s+)/);

  for (const part of parts) {
    if (!part) continue;

    if (WHITESPACE.test(part)) {
      tokens.push({ idx: idx++, surface: part, kind: "whitespace", charCount: part.length });
      continue;
    }

    // Split word from trailing punctuation
    const wordMatch = part.match(/^([\u05D0-\u05EA\u05F0-\u05F4\uFB1D-\uFB4Ea-zA-Z0-9''-]+)([^a-zA-Z0-9\u05D0-\u05EA]*)$/);
    if (wordMatch) {
      const [, word, trailing] = wordMatch;
      if (word) {
        const isPunctEnd = trailing ? PUNCT_END.test(trailing) : false;
        const isClauseEnd = trailing ? CLAUSE_END.test(trailing) : false;
        tokens.push({
          idx: idx++,
          surface: word + (trailing ?? ""),
          kind: /[\u05D0-\u05EA]/.test(word) || /[a-zA-Z]/.test(word) ? "word" : "number",
          charCount: word.length,
          isPunctEnd,
          isClauseEnd,
        });
        wordCount++;
      }
    } else if (PUNCT.test(part)) {
      tokens.push({
        idx: idx++,
        surface: part,
        kind: "punct",
        charCount: part.length,
        isPunctEnd: PUNCT_END.test(part),
        isClauseEnd: CLAUSE_END.test(part),
      });
    } else {
      tokens.push({ idx: idx++, surface: part, kind: "word", charCount: part.length });
      wordCount++;
    }
  }

  return {
    id,
    title,
    tokens,
    wordCount,
    charCount: raw.length,
    difficultyBand: "medium",
  };
}
