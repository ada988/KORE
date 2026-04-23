"use client";

import { getDb } from "./db";
import type { ReadingSession, DailyStats } from "@/types/database";

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

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.daily_stats
    .where("[user_id+date]")
    .equals([LOCAL_USER_ID, today])
    .first();

  const words = data.words_read ?? 0;
  const mins = Math.max(1, Math.round((data.duration_seconds ?? 0) / 60));
  const wpm = data.wpm_actual ?? 0;

  if (existing) {
    await db.daily_stats.update([LOCAL_USER_ID, today] as unknown as string, {
      sessions_count: existing.sessions_count + 1,
      minutes_read: existing.minutes_read + mins,
      words_read: existing.words_read + words,
      chars_read: existing.chars_read + (data.chars_read ?? 0),
      avg_wpm: wpm > 0 ? Math.round(((existing.avg_wpm ?? wpm) + wpm) / 2) : existing.avg_wpm,
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

  await updateStreak(today);
  await checkAchievements();

  return id;
}

/**
 * Streak update with freeze logic:
 * - +1 if consecutive with yesterday
 * - If gap of exactly 1 missed day AND freezes_remaining > 0: consume freeze, keep streak
 * - Otherwise reset to 1
 * - Freezes regenerate 1 per week (capped at 3)
 */
async function updateStreak(today: string) {
  const db = getDb();
  const streak = await db.streak.where("user_id").equals(LOCAL_USER_ID).first();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

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

  if (streak.last_activity_date === today) return;

  const isConsecutive = streak.last_activity_date === yesterday;
  const canFreeze =
    streak.last_activity_date === dayBefore && streak.freezes_remaining > 0;

  let newStreak = 1;
  let newFreezes = streak.freezes_remaining;

  if (isConsecutive) {
    newStreak = streak.current_streak + 1;
  } else if (canFreeze) {
    newStreak = streak.current_streak + 1;
    newFreezes = Math.max(0, streak.freezes_remaining - 1);
  }

  await db.streak.update(LOCAL_USER_ID, {
    current_streak: newStreak,
    longest_streak: Math.max(streak.longest_streak, newStreak),
    last_activity_date: today,
    freezes_remaining: newFreezes,
  });
}

export async function manualEarnFreeze() {
  const db = getDb();
  const s = await db.streak.where("user_id").equals(LOCAL_USER_ID).first();
  if (!s) return;
  await db.streak.update(LOCAL_USER_ID, {
    freezes_remaining: Math.min(3, s.freezes_remaining + 1),
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
  charCount: number,
  opts?: { source_type?: "paste" | "url" | "library" | "pdf" | "epub" | "wikipedia" | "benyehuda"; source_url?: string; domain?: string | null; author?: string | null }
): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  await db.passages.add({
    id,
    owner_id: LOCAL_USER_ID,
    source_type: opts?.source_type ?? "paste",
    source_url: opts?.source_url ?? null,
    title,
    author: opts?.author ?? null,
    body_raw,
    body_nikud: null,
    body_segmented: null,
    word_count: wordCount,
    char_count: charCount,
    difficulty_band: "medium",
    domain: opts?.domain ?? null,
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

export async function deletePassage(id: string) {
  const db = getDb();
  await db.passages.delete(id);
  await db.reading_sessions.where("passage_id").equals(id).delete();
  window.localStorage.removeItem(bookmarkKey(id));
}

// ── Bookmarks ───────────────────────────────────────────────────────────────

function bookmarkKey(passageId: string) {
  return `kore-bookmark:${passageId}`;
}

export function getBookmark(passageId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(bookmarkKey(passageId));
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function setBookmark(passageId: string, tokenIdx: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(bookmarkKey(passageId), String(tokenIdx));
}

export function clearBookmark(passageId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(bookmarkKey(passageId));
}

// ── Weekly progress ──────────────────────────────────────────────────────────

export async function getWeeklyProgress() {
  const stats = await getDailyStats(7);
  const minutes = stats.reduce((s, d) => s + d.minutes_read, 0);
  const words = stats.reduce((s, d) => s + d.words_read, 0);
  const days = stats.filter((d) => d.minutes_read > 0).length;
  return { minutes, words, days };
}

// ── Achievements ─────────────────────────────────────────────────────────────

export type Achievement = {
  id: string;
  title: string;
  description: string;
  earnedAt: string;
};

const ACH_KEY = "kore-achievements";

export function getAchievements(): Achievement[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(ACH_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAchievements(list: Achievement[]): void {
  window.localStorage.setItem(ACH_KEY, JSON.stringify(list));
}

export async function checkAchievements(): Promise<Achievement[]> {
  if (typeof window === "undefined") return [];
  const existing = getAchievements();
  const existingIds = new Set(existing.map((a) => a.id));
  const earned: Achievement[] = [];

  const stats = await getDailyStats(30);
  const totalWords = stats.reduce((s, d) => s + d.words_read, 0);
  const streak = await getStreak();
  const maxWpm = stats.reduce((m, d) => Math.max(m, d.avg_wpm ?? 0), 0);

  const rules: { id: string; cond: boolean; title: string; description: string }[] = [
    { id: "first-session", cond: stats.some((s) => s.sessions_count > 0), title: "ההתחלה", description: "סיום הסשן הראשון" },
    { id: "words-1k", cond: totalWords >= 1000, title: "אלף מילים", description: "<bdi>1,000</bdi> מילים נקראו" },
    { id: "words-10k", cond: totalWords >= 10000, title: "עשרת אלפים", description: "<bdi>10,000</bdi> מילים נקראו" },
    { id: "words-100k", cond: totalWords >= 100000, title: "מאה אלף", description: "<bdi>100,000</bdi> מילים נקראו" },
    { id: "streak-3", cond: (streak?.current_streak ?? 0) >= 3, title: "שלושה ברצף", description: "3 ימים רצופים" },
    { id: "streak-7", cond: (streak?.longest_streak ?? 0) >= 7, title: "שבוע מלא", description: "7 ימים רצופים" },
    { id: "streak-30", cond: (streak?.longest_streak ?? 0) >= 30, title: "חודש שלם", description: "30 ימים רצופים" },
    { id: "wpm-300", cond: maxWpm >= 300, title: "300 מ״ד", description: "הגעת ל-300 מ״ד" },
    { id: "wpm-450", cond: maxWpm >= 450, title: "450 מ״ד", description: "הגעת ל-450 מ״ד" },
    { id: "wpm-600", cond: maxWpm >= 600, title: "מהיר במיוחד", description: "הגעת ל-600 מ״ד" },
  ];

  for (const r of rules) {
    if (r.cond && !existingIds.has(r.id)) {
      const ach: Achievement = {
        id: r.id,
        title: r.title,
        description: r.description,
        earnedAt: new Date().toISOString(),
      };
      earned.push(ach);
      existing.push(ach);
    }
  }

  if (earned.length > 0) saveAchievements(existing);
  return earned;
}

// ── Export / import ──────────────────────────────────────────────────────────

export async function exportStatsCSV(): Promise<string> {
  const stats = await getDailyStats(365);
  const header = "date,sessions,minutes,words,chars,avg_wpm,avg_comprehension";
  const rows = stats
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d: DailyStats) =>
      [
        d.date,
        d.sessions_count,
        d.minutes_read,
        d.words_read,
        d.chars_read,
        d.avg_wpm ?? "",
        d.avg_comprehension ?? "",
      ].join(","),
    )
    .join("\n");
  return `${header}\n${rows}`;
}

export async function clearAllData(): Promise<void> {
  const db = getDb();
  await Promise.all([
    db.passages.clear(),
    db.reading_sessions.clear(),
    db.review_cards.clear(),
    db.vocabulary.clear(),
    db.highlights.clear(),
    db.daily_stats.clear(),
    db.streak.clear(),
  ]);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACH_KEY);
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith("kore-bookmark:"))
      .forEach((k) => window.localStorage.removeItem(k));
  }
}
