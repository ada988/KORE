"use client";

import { fsrs, createEmptyCard, Rating, State, type Card } from "ts-fsrs";
import type { ReviewCard } from "@/types/database";

const scheduler = fsrs();

/**
 * Convert a DB ReviewCard into an FSRS Card.
 * New cards (no last_review) get default stability/difficulty.
 */
export function toFsrsCard(dbCard: ReviewCard): Card {
  const empty = createEmptyCard(new Date(dbCard.due));
  return {
    due: new Date(dbCard.due),
    stability: dbCard.stability ?? empty.stability,
    difficulty: dbCard.difficulty ?? empty.difficulty,
    elapsed_days: dbCard.elapsed_days,
    scheduled_days: dbCard.scheduled_days,
    learning_steps: 0,
    reps: dbCard.reps,
    lapses: dbCard.lapses,
    state: dbCard.state as State,
    ...(dbCard.last_review ? { last_review: new Date(dbCard.last_review) } : {}),
  };
}

/**
 * Schedule next review given a user rating (1-4 → Again/Hard/Good/Easy).
 * Returns the next-card fields to persist.
 */
export function scheduleNext(dbCard: ReviewCard, rating: 1 | 2 | 3 | 4): Partial<ReviewCard> {
  const card = toFsrsCard(dbCard);
  const now = new Date();
  const fsrsRating: Rating = rating === 1 ? Rating.Again : rating === 2 ? Rating.Hard : rating === 3 ? Rating.Good : Rating.Easy;
  const result = scheduler.next(card, now, fsrsRating);
  const next = result.card;

  return {
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state as 0 | 1 | 2 | 3,
    last_review: now.toISOString(),
  };
}
