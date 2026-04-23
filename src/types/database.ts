/**
 * TypeScript types mirroring the Supabase Postgres schema.
 * Keep in sync with supabase/migrations/.
 */

export type HebrewLevel = "native" | "advanced" | "intermediate" | "learner";
export type UserType = "adult" | "student" | "pet" | "dyslexic";
export type SubscriptionTier = "free" | "pro" | "pro_plus" | "lifetime";
export type SourceType =
  | "paste"
  | "url"
  | "epub"
  | "pdf"
  | "library"
  | "pet"
  | "wikipedia"
  | "benyehuda";
export type DifficultyBand = "easy" | "medium" | "hard" | "pet";
export type ReadingMode =
  | "rsvp"
  | "paginated"
  | "scroll"
  | "chunking"
  | "tracker"
  | "pet"
  | "listen";
export type QuestionType = "mcq" | "cloze" | "open" | "summary";
export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate";
export type CardType = "question" | "vocab" | "root" | "homograph";

export type Profile = {
  id: string;
  display_name: string | null;
  hebrew_level: HebrewLevel | null;
  user_type: UserType | null;
  goal_minutes_per_day: number;
  target_wpm: number | null;
  pet_exam_date: string | null;
  baseline_wpm: number | null;
  baseline_comprehension: number | null;
  preferences: Record<string, unknown>;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Passage = {
  id: string;
  owner_id: string | null;
  source_type: SourceType;
  source_url: string | null;
  title: string;
  author: string | null;
  body_raw: string;
  body_nikud: Record<string, unknown> | null;
  body_segmented: Record<string, unknown> | null;
  word_count: number;
  char_count: number;
  difficulty_band: DifficultyBand | null;
  domain: string | null;
  language: string;
  is_public: boolean;
  copyright_status: string | null;
  content_hash: string | null;
  created_at: string;
};

export type ReadingSession = {
  id: string;
  user_id: string;
  passage_id: string;
  mode: ReadingMode;
  wpm_target: number | null;
  wpm_actual: number | null;
  nikud_mode: string | null;
  chunk_size: number | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  words_read: number | null;
  chars_read: number | null;
  completion_ratio: number | null;
  regressions_count: number;
  pauses_count: number;
  comprehension_score: number | null;
  engagement_score: number | null;
  device_info: Record<string, unknown> | null;
};

export type MCQOption = {
  id: string; // Hebrew letter א–ד
  text: string;
  is_correct: boolean;
  rationale: string;
};

export type Question = {
  id: string;
  passage_id: string;
  question_type: QuestionType;
  bloom_level: BloomLevel;
  question_text: string;
  options: MCQOption[] | null;
  correct_answer: string | null;
  source_span: string | null;
  explanation: string | null;
  generated_by: string;
  generated_at: string;
  human_verified: boolean;
};

export type QuestionAttempt = {
  id: string;
  user_id: string;
  question_id: string;
  session_id: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  time_taken_seconds: number | null;
  attempted_at: string;
};

export type ReviewCard = {
  id: string;
  user_id: string;
  card_type: CardType;
  front: string;
  back: string;
  context_passage_id: string | null;
  // FSRS fields
  due: string;
  stability: number | null;
  difficulty: number | null;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3; // new | learning | review | relearning
  last_review: string | null;
  created_at: string;
};

export type VocabularyItem = {
  id: string;
  user_id: string;
  word: string;
  lemma: string | null;
  root: string | null;
  pos: string | null;
  definition_he: string | null;
  definition_en: string | null;
  first_seen_passage_id: string | null;
  seen_count: number;
  mastery_level: 0 | 1 | 2 | 3 | 4 | 5;
  created_at: string;
};

export type Highlight = {
  id: string;
  user_id: string;
  passage_id: string;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  color: string;
  note: string | null;
  created_at: string;
};

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  position: number | null;
  created_at: string;
};

export type Streak = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  freezes_remaining: number;
  pause_until: string | null;
};

export type DailyStats = {
  user_id: string;
  date: string;
  sessions_count: number;
  minutes_read: number;
  words_read: number;
  chars_read: number;
  avg_wpm: number | null;
  avg_comprehension: number | null;
  questions_attempted: number;
  questions_correct: number;
  cards_reviewed: number;
};

export type PETPerformance = {
  user_id: string;
  question_type: string;
  attempts: number;
  correct: number;
  avg_time_seconds: number | null;
  last_attempted_at: string | null;
};
