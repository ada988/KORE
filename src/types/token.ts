/**
 * A single token produced by the Hebrew preprocessing pipeline.
 * Stored in passages.body_segmented in Supabase.
 */
export type TokenKind =
  | "word"
  | "punct"
  | "number"
  | "whitespace"
  | "latin";

export type PartOfSpeech =
  | "NOUN"
  | "VERB"
  | "ADJ"
  | "ADV"
  | "PRON"
  | "DET"
  | "PREP"
  | "CONJ"
  | "INTJ"
  | "NUM"
  | "PUNCT"
  | "X";

export type Token = {
  /** Sequential index in the passage's token array */
  idx: number;

  /** The raw surface form as it appears in the source text */
  surface: string;

  kind: TokenKind;

  /** Canonical dictionary form (lemma) */
  lemma?: string | undefined;

  /** 3–4 letter Hebrew root (שורש), present for most native Hebrew words */
  root?: string | undefined;

  /**
   * Indices of the root letters within `surface`.
   * Tuple of 3 (or 4) positions — used to position the RSVP pivot on the middle root letter.
   */
  rootPositions?: [number, number, number] | [number, number, number, number] | undefined;

  /** Prefix morphemes, e.g. ['ו', 'ה'] for וְהַ */
  prefixes?: string[] | undefined;

  /** Suffix morphemes */
  suffixes?: string[] | undefined;

  pos?: PartOfSpeech | undefined;

  /** Fully pointed (nikud) form from DICTA Nakdan */
  nikud?: string | undefined;

  /** Nikud only where homograph disambiguation is needed (the unique middle mode) */
  nikudPartial?: string | undefined;

  /** True when this token is a Hebrew homograph with context-dependent reading */
  ambiguous?: boolean | undefined;

  /** True when token ends a sentence (.  !  ?) */
  isPunctEnd?: boolean | undefined;

  /** True when token ends a clause (, ; :) */
  isClauseEnd?: boolean | undefined;

  /**
   * Frequency rank from the HeLP corpus (Hebrew Lexicon Profile).
   * Lower = more common. >10,000 = rare word → triggers slow-down multiplier in RSVP.
   */
  frequencyRank?: number | undefined;

  /** Total character count of surface — used for RSVP pause multiplier heuristics */
  charCount: number;
};

/** A processed passage ready for the reading engine */
export type ProcessedPassage = {
  id: string;
  title: string;
  tokens: Token[];
  wordCount: number;
  charCount: number;
  difficultyBand: "easy" | "medium" | "hard" | "pet";
  domain?: string | undefined;
};
