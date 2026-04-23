"use client";

import Dexie, { type EntityTable } from "dexie";
import type {
  Passage,
  ReadingSession,
  ReviewCard,
  VocabularyItem,
  Highlight,
  DailyStats,
  Streak,
} from "@/types/database";

/**
 * Client-side IndexedDB store via Dexie.
 * Contains all data needed for offline-first operation.
 * Schema version must increment on any structural change.
 */
export class KoreDatabase extends Dexie {
  passages!: EntityTable<Passage, "id">;
  reading_sessions!: EntityTable<ReadingSession, "id">;
  review_cards!: EntityTable<ReviewCard, "id">;
  vocabulary!: EntityTable<VocabularyItem, "id">;
  highlights!: EntityTable<Highlight, "id">;
  daily_stats!: EntityTable<DailyStats, "date">;
  streak!: EntityTable<Streak, "user_id">;

  constructor() {
    super("kore");
    this.version(1).stores({
      passages: "id, owner_id, content_hash, difficulty_band, created_at",
      reading_sessions: "id, user_id, passage_id, started_at",
      review_cards: "id, user_id, due, card_type, state",
      vocabulary: "id, user_id, lemma, [user_id+lemma]",
      highlights: "id, user_id, passage_id, created_at",
      daily_stats: "[user_id+date], user_id, date",
      streak: "user_id",
    });
  }
}

let _db: KoreDatabase | null = null;

export function getDb(): KoreDatabase {
  if (_db === null) {
    _db = new KoreDatabase();
  }
  return _db;
}
