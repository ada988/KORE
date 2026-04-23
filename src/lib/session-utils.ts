"use client";

import { getDb } from "./db";
import type { ReadingSession } from "@/types/database";

const LOCAL_USER_ID = "local";

export async function saveSession(
  data: Omit<ReadingSession, "id" | "user_id" | "started_at">
): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  const session: ReadingSession = {
    ...data,
    id,
    user_id: LOCAL_USER_ID,
    started_at: new Date().toISOString(),
    regressions_count: data.regressions_count ?? 0,
    pauses_count: data.pauses_count ?? 0,
  };
  await db.reading_sessions.add(session);

  // Update daily stats
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.daily_stats
    .where("[user_id+date]")
    .equals([LOCAL_USER_ID, today])
    .first();

  const words = data.words_read ?? 0;
  const mins = Math.round((data.duration_seconds ?? 0) / 60);
  const wpm = data.wpm_actual ?? 0;

  if (existing) {
    await db.daily_stats.update([LOCAL_USER_ID, today] as unknown as string, {
      sessions_count: existing.sessions_count + 1,
      minutes_read: existing.minutes_read + mins,
      words_read: existing.words_read + words,
      avg_wpm: wpm > 0 ? Math.round((existing.avg_wpm ?? wpm + wpm) / 2) : existing.avg_wpm,
    });
  } else {
    await db.daily_stats.add({
      user_id: LOCAL_USER_ID,
      date: today,
      sessions_count: 1,
      minutes_read: mins,
      words_read: words,
      chars_read: data.chars_read ?? 0,
      avg_wpm: wpm > 0 ? wpm : null,
      avg_comprehension: null,
      questions_attempted: 0,
      questions_correct: 0,
      cards_reviewed: 0,
    });
  }

  // Update streak
  await updateStreak(today);

  return id;
}

async function updateStreak(today: string) {
  const db = getDb();
  const streak = await db.streak.where("user_id").equals(LOCAL_USER_ID).first();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (!streak) {
    await db.streak.add({
      user_id: LOCAL_USER_ID,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
      freezes_remaining: 2,
      pause_until: null,
    });
    return;
  }

  if (streak.last_activity_date === today) return; // already counted today

  const isConsecutive = streak.last_activity_date === yesterday;
  const newStreak = isConsecutive ? streak.current_streak + 1 : 1;

  await db.streak.update(LOCAL_USER_ID, {
    current_streak: newStreak,
    longest_streak: Math.max(streak.longest_streak, newStreak),
    last_activity_date: today,
  });
}

export async function getStreak() {
  const db = getDb();
  return db.streak.where("user_id").equals(LOCAL_USER_ID).first();
}

export async function getRecentSessions(limit = 20) {
  const db = getDb();
  return db.reading_sessions
    .where("user_id")
    .equals(LOCAL_USER_ID)
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getDailyStats(days = 7) {
  const db = getDb();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  const stats = await db.daily_stats
    .where("user_id")
    .equals(LOCAL_USER_ID)
    .toArray();
  return stats.filter((s) => dates.includes(s.date));
}

export async function savePassage(
  title: string,
  body_raw: string,
  wordCount: number,
  charCount: number
): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  await db.passages.add({
    id,
    owner_id: LOCAL_USER_ID,
    source_type: "paste",
    source_url: null,
    title,
    author: null,
    body_raw,
    body_nikud: null,
    body_segmented: null,
    word_count: wordCount,
    char_count: charCount,
    difficulty_band: "medium",
    domain: null,
    language: "he",
    is_public: false,
    copyright_status: null,
    content_hash: null,
    created_at: new Date().toISOString(),
  });
  return id;
}

export async function getSavedPassages() {
  const db = getDb();
  return db.passages
    .where("owner_id")
    .equals(LOCAL_USER_ID)
    .reverse()
    .toArray();
}
