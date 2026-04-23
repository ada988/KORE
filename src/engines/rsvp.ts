import type { Token } from "@/types/token";

export type RsvpFrame = {
  tokens: Token[];
  /** 0-based index of the first token in this frame within the passage */
  startIdx: number;
  /** True when this is the last frame — engine will emit "complete" after */
  isLast: boolean;
};

export type RsvpEvent =
  | { type: "frame"; frame: RsvpFrame }
  | { type: "complete" }
  | { type: "progress"; ratio: number };

export type RsvpListener = (event: RsvpEvent) => void;

export type RsvpConfig = {
  /** Words per minute, 100–800 */
  wpm: number;
  /** Number of tokens shown per frame (1–4) */
  chunkSize: number;
  /** Whether to apply pause multipliers at punctuation and rare/long words */
  adaptivePauses: boolean;
  /** Starting token index (for resume) */
  startIdx?: number | undefined;
};

/**
 * Research-derived pause multipliers.
 * Applied multiplicatively; combined multipliers are capped at 3× to prevent
 * jarring pauses on complex sentences.
 */
const PAUSE_MULTIPLIERS = {
  period: 2.5, // . ! ?
  comma: 1.5, // , ; :
  colon: 1.8, // em-dash, en-dash
  long_word: 1.3, // > 6 chars
  low_freq: 1.4, // frequencyRank > 10_000
  max: 3.0,
} as const;

/**
 * Drift-corrected RSVP scheduler.
 *
 * Uses `performance.now()` for sub-millisecond timing and adds durations to a
 * running "next due" timestamp rather than to `Date.now()`. This prevents
 * accumulated drift when frames run slightly late (which they always do in RAF).
 *
 * The engine is a pure event emitter — it has no React dependency and can be
 * tested without a DOM.
 */
export class RsvpEngine {
  private readonly tokens: Token[];
  private config: RsvpConfig;
  private currentIdx: number;
  private nextDueMs: number = 0;
  private rafId: number | null = null;
  private paused: boolean = true;
  private readonly listeners = new Set<RsvpListener>();

  constructor(tokens: Token[], config: RsvpConfig) {
    this.tokens = tokens;
    this.config = config;
    this.currentIdx = config.startIdx ?? 0;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  start(): void {
    if (!this.paused) return;
    this.paused = false;
    this.nextDueMs = performance.now();
    this.tick();
  }

  pause(): void {
    this.paused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    // Re-anchor nextDueMs so we don't catch up on all the skipped time
    this.nextDueMs = performance.now();
    this.tick();
  }

  seekBackWords(count: number): void {
    const wordTokens = this.tokens
      .slice(0, this.currentIdx)
      .filter((t) => t.kind === "word");
    const targetWordCount = Math.max(0, wordTokens.length - count);

    let wordsSeen = 0;
    let newIdx = 0;
    for (let i = 0; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t === undefined) break;
      if (t.kind === "word") {
        if (wordsSeen >= targetWordCount) {
          newIdx = i;
          break;
        }
        wordsSeen++;
      }
    }
    this.currentIdx = newIdx;
    if (!this.paused) {
      this.nextDueMs = performance.now();
    }
  }

  setWpm(wpm: number): void {
    this.config = { ...this.config, wpm };
  }

  setChunkSize(chunkSize: number): void {
    this.config = { ...this.config, chunkSize };
  }

  setAdaptivePauses(adaptivePauses: boolean): void {
    this.config = { ...this.config, adaptivePauses };
  }

  get isPlaying(): boolean {
    return !this.paused;
  }

  get progressRatio(): number {
    const wordTokens = this.tokens.filter((t) => t.kind === "word");
    if (wordTokens.length === 0) return 0;
    const done = this.tokens
      .slice(0, this.currentIdx)
      .filter((t) => t.kind === "word").length;
    return done / wordTokens.length;
  }

  on(listener: RsvpListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.pause();
    this.listeners.clear();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private emit(event: RsvpEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private tick = (): void => {
    if (this.paused) return;

    const now = performance.now();

    if (now >= this.nextDueMs) {
      if (this.currentIdx >= this.tokens.length) {
        this.paused = true;
        this.emit({ type: "complete" });
        return;
      }

      const chunk = this.getNextChunk();
      const isLast = this.currentIdx >= this.tokens.length;

      this.emit({
        type: "frame",
        frame: { tokens: chunk, startIdx: this.currentIdx - chunk.length, isLast },
      });

      this.emit({ type: "progress", ratio: this.progressRatio });

      // Drift-corrected: add duration to the scheduled time, NOT to `now`.
      // This means if a frame is 2ms late, the next frame runs 2ms sooner.
      const duration = this.computeDuration(chunk);
      this.nextDueMs += duration;

      if (isLast) {
        this.paused = true;
        this.emit({ type: "complete" });
        return;
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private getNextChunk(): Token[] {
    const chunk: Token[] = [];
    let wordsInChunk = 0;

    while (
      this.currentIdx < this.tokens.length &&
      wordsInChunk < this.config.chunkSize
    ) {
      const token = this.tokens[this.currentIdx];
      if (token === undefined) break;
      chunk.push(token);
      this.currentIdx++;
      if (token.kind === "word") wordsInChunk++;
      // Include trailing punctuation/whitespace that belongs to this chunk
      if (token.isPunctEnd || token.isClauseEnd) break;
    }

    return chunk;
  }

  private computeDuration(chunk: Token[]): number {
    const wordCount = chunk.filter((t) => t.kind === "word").length;
    if (wordCount === 0) return 0;

    const baseMs = (60_000 / this.config.wpm) * wordCount;

    if (!this.config.adaptivePauses) return baseMs;

    let multiplier = 1;
    const last = chunk[chunk.length - 1];

    if (last?.isPunctEnd) {
      multiplier *= PAUSE_MULTIPLIERS.period;
    } else if (last?.isClauseEnd) {
      multiplier *= PAUSE_MULTIPLIERS.comma;
    }

    if (chunk.some((t) => t.charCount > 6)) {
      multiplier *= PAUSE_MULTIPLIERS.long_word;
    }

    if (
      chunk.some(
        (t) => t.frequencyRank !== undefined && t.frequencyRank > 10_000,
      )
    ) {
      multiplier *= PAUSE_MULTIPLIERS.low_freq;
    }

    return baseMs * Math.min(multiplier, PAUSE_MULTIPLIERS.max);
  }
}
