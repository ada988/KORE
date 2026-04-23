import type { Token } from "@/types/token";

export type RsvpFrame = {
  tokens: Token[];
  /** 0-based index of the first token in this frame within the passage */
  startIdx: number;
  /** True when this is the last frame — engine will emit "complete" after */
  isLast: boolean;
  /** Effective WPM at time of emission (reflects progressive/burst modulation) */
  effectiveWpm: number;
};

export type RsvpEvent =
  | { type: "frame"; frame: RsvpFrame }
  | { type: "complete" }
  | { type: "progress"; ratio: number }
  | { type: "wpm"; wpm: number };

export type RsvpListener = (event: RsvpEvent) => void;

export type SpeedMode = "steady" | "progressive" | "burst" | "adaptive";

export type RsvpConfig = {
  /** Base WPM, 80–900 */
  wpm: number;
  /** Tokens per frame, 1–4 */
  chunkSize: number;
  /** Punctuation + rare-word pause multipliers */
  adaptivePauses: boolean;
  /** Starting token index (resume / bookmark) */
  startIdx?: number | undefined;
  /** Speed modulation strategy */
  speedMode?: SpeedMode | undefined;
  /** Progressive: WPM added per minute elapsed */
  progressiveRampPerMin?: number | undefined;
  /** Hard ceiling for any modulated mode */
  speedCeiling?: number | undefined;
  /** Hard floor for any modulated mode */
  speedFloor?: number | undefined;
  /** Burst: WPM delta during sprint window */
  burstBoost?: number | undefined;
  burstSprintSec?: number | undefined;
  burstRestSec?: number | undefined;
};

const PAUSE_MULTIPLIERS = {
  period: 2.5,
  comma: 1.5,
  colon: 1.8,
  long_word: 1.3,
  low_freq: 1.4,
  max: 3.0,
} as const;

export class RsvpEngine {
  private readonly tokens: Token[];
  private config: RsvpConfig;
  private currentIdx: number;
  private nextDueMs: number = 0;
  private rafId: number | null = null;
  private paused: boolean = true;
  private readonly listeners = new Set<RsvpListener>();
  private playStartMs: number = 0;
  private cumulativePlaySec: number = 0;
  private resumedAtMs: number = 0;
  private lastEmittedWpm: number = 0;

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
    this.playStartMs = performance.now();
    this.resumedAtMs = this.playStartMs;
    this.cumulativePlaySec = 0;
    this.tick();
  }

  pause(): void {
    if (this.paused) return;
    this.cumulativePlaySec += (performance.now() - this.resumedAtMs) / 1000;
    this.paused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.resumedAtMs = performance.now();
    this.nextDueMs = performance.now();
    this.tick();
  }

  /** Seek back N content words from current position. */
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

  /** Direct token-index seek; used for bookmarks and scrub bar. */
  seekToIdx(idx: number): void {
    this.currentIdx = Math.max(0, Math.min(this.tokens.length - 1, idx));
    if (!this.paused) this.nextDueMs = performance.now();
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

  setSpeedMode(speedMode: SpeedMode): void {
    this.config = { ...this.config, speedMode };
  }

  updateSpeedConfig(partial: Partial<RsvpConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  get isPlaying(): boolean {
    return !this.paused;
  }

  get currentIndex(): number {
    return this.currentIdx;
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

  /** Compute effective WPM for this moment given speed mode. */
  private effectiveWpm(): number {
    const base = this.config.wpm;
    const mode = this.config.speedMode ?? "steady";
    const ceiling = this.config.speedCeiling ?? 900;
    const floor = this.config.speedFloor ?? 80;

    if (mode === "steady" || mode === "adaptive") {
      return Math.min(ceiling, Math.max(floor, base));
    }

    const liveSec = this.paused
      ? this.cumulativePlaySec
      : this.cumulativePlaySec + (performance.now() - this.resumedAtMs) / 1000;

    if (mode === "progressive") {
      const ramp = this.config.progressiveRampPerMin ?? 25;
      const added = (liveSec / 60) * ramp;
      return Math.min(ceiling, Math.max(floor, base + added));
    }

    if (mode === "burst") {
      const sprint = this.config.burstSprintSec ?? 20;
      const rest = this.config.burstRestSec ?? 40;
      const cycle = sprint + rest;
      if (cycle <= 0) return base;
      const phase = liveSec % cycle;
      const boost = this.config.burstBoost ?? 150;
      const isSprint = phase < sprint;
      const target = isSprint ? base + boost : base;
      return Math.min(ceiling, Math.max(floor, target));
    }

    return base;
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
      const effective = this.effectiveWpm();

      this.emit({
        type: "frame",
        frame: {
          tokens: chunk,
          startIdx: this.currentIdx - chunk.length,
          isLast,
          effectiveWpm: effective,
        },
      });

      this.emit({ type: "progress", ratio: this.progressRatio });

      // Emit wpm change when it moves meaningfully (for UI counter)
      if (Math.abs(effective - this.lastEmittedWpm) >= 5) {
        this.lastEmittedWpm = effective;
        this.emit({ type: "wpm", wpm: effective });
      }

      const duration = this.computeDuration(chunk, effective);
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
      if (token.isPunctEnd || token.isClauseEnd) break;
    }

    return chunk;
  }

  private computeDuration(chunk: Token[], effectiveWpm: number): number {
    const wordCount = chunk.filter((t) => t.kind === "word").length;
    if (wordCount === 0) return 0;

    const baseMs = (60_000 / effectiveWpm) * wordCount;

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
