-- KORÉ — Initial Schema
-- Run against Supabase Postgres. Assumes supabase/auth is enabled.

-- ── Enable required extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  hebrew_level text check (hebrew_level in ('native','advanced','intermediate','learner')),
  user_type text check (user_type in ('adult','student','pet','dyslexic')),
  goal_minutes_per_day int default 20,
  target_wpm int,
  pet_exam_date date,
  baseline_wpm int,
  baseline_comprehension numeric(4,3),
  preferences jsonb default '{}'::jsonb,
  subscription_tier text default 'free' check (subscription_tier in ('free','pro','pro_plus','lifetime')),
  subscription_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── passages ─────────────────────────────────────────────────────────────────
create table passages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  source_type text check (source_type in ('paste','url','epub','pdf','library','pet','wikipedia','benyehuda')),
  source_url text,
  title text not null,
  author text,
  body_raw text not null,
  body_nikud jsonb,
  body_segmented jsonb,
  word_count int not null,
  char_count int not null,
  difficulty_band text check (difficulty_band in ('easy','medium','hard','pet')),
  domain text,
  language text default 'he',
  is_public boolean default false,
  copyright_status text,
  content_hash text unique,
  created_at timestamptz default now()
);

create index passages_owner_idx on passages(owner_id);
create index passages_difficulty_idx on passages(difficulty_band) where is_public = true;

alter table passages enable row level security;

create policy "Users can view own passages"
  on passages for select
  using (auth.uid() = owner_id);

create policy "All authenticated users can view public passages"
  on passages for select
  using (is_public = true and auth.role() = 'authenticated');

create policy "Users can insert own passages"
  on passages for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own passages"
  on passages for update
  using (auth.uid() = owner_id);

create policy "Users can delete own passages"
  on passages for delete
  using (auth.uid() = owner_id);

-- ── reading_sessions ─────────────────────────────────────────────────────────
create table reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  passage_id uuid references passages(id) on delete cascade not null,
  mode text check (mode in ('rsvp','paginated','scroll','chunking','tracker','pet','listen')),
  wpm_target int,
  wpm_actual int,
  nikud_mode text,
  chunk_size int,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int,
  words_read int,
  chars_read int,
  completion_ratio numeric(4,3),
  regressions_count int default 0,
  pauses_count int default 0,
  comprehension_score numeric(4,3),
  engagement_score numeric(4,3),
  device_info jsonb
);

create index reading_sessions_user_idx on reading_sessions(user_id, started_at desc);

alter table reading_sessions enable row level security;

create policy "Users can manage own sessions"
  on reading_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── questions ─────────────────────────────────────────────────────────────────
create table questions (
  id uuid primary key default gen_random_uuid(),
  passage_id uuid references passages(id) on delete cascade not null,
  question_type text check (question_type in ('mcq','cloze','open','summary')),
  bloom_level text check (bloom_level in ('remember','understand','apply','analyze','evaluate')),
  question_text text not null,
  options jsonb,
  correct_answer text,
  source_span text,
  explanation text,
  generated_by text default 'claude-sonnet-4-5',
  generated_at timestamptz default now(),
  human_verified boolean default false
);

create index questions_passage_idx on questions(passage_id);

alter table questions enable row level security;

create policy "All authenticated users can view questions for accessible passages"
  on questions for select
  using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from passages p
      where p.id = questions.passage_id
        and (p.is_public = true or p.owner_id = auth.uid())
    )
  );

-- ── question_attempts ─────────────────────────────────────────────────────────
create table question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  session_id uuid references reading_sessions(id) on delete set null,
  user_answer text,
  is_correct boolean,
  time_taken_seconds int,
  attempted_at timestamptz default now()
);

alter table question_attempts enable row level security;

create policy "Users can manage own question attempts"
  on question_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── review_cards ──────────────────────────────────────────────────────────────
create table review_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  card_type text check (card_type in ('question','vocab','root','homograph')),
  front text not null,
  back text not null,
  context_passage_id uuid references passages(id) on delete set null,
  due timestamptz not null default now(),
  stability numeric,
  difficulty numeric,
  elapsed_days int default 0,
  scheduled_days int default 0,
  reps int default 0,
  lapses int default 0,
  state int default 0,
  last_review timestamptz,
  created_at timestamptz default now()
);

create index review_cards_due_idx on review_cards(user_id, due);

alter table review_cards enable row level security;

create policy "Users can manage own review cards"
  on review_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── vocabulary ────────────────────────────────────────────────────────────────
create table vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  word text not null,
  lemma text,
  root text,
  pos text,
  definition_he text,
  definition_en text,
  first_seen_passage_id uuid references passages(id) on delete set null,
  seen_count int default 1,
  mastery_level int default 0 check (mastery_level between 0 and 5),
  created_at timestamptz default now(),
  unique (user_id, lemma)
);

alter table vocabulary enable row level security;

create policy "Users can manage own vocabulary"
  on vocabulary for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── highlights ────────────────────────────────────────────────────────────────
create table highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  passage_id uuid references passages(id) on delete cascade not null,
  start_offset int not null,
  end_offset int not null,
  selected_text text not null,
  color text default 'yellow',
  note text,
  created_at timestamptz default now()
);

alter table highlights enable row level security;

create policy "Users can manage own highlights"
  on highlights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── collections ───────────────────────────────────────────────────────────────
create table collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  icon text,
  color text,
  position int,
  created_at timestamptz default now()
);

alter table collections enable row level security;

create policy "Users can manage own collections"
  on collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table collection_passages (
  collection_id uuid references collections(id) on delete cascade,
  passage_id uuid references passages(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (collection_id, passage_id)
);

alter table collection_passages enable row level security;

create policy "Users can manage own collection passages"
  on collection_passages for all
  using (
    exists (
      select 1 from collections c
      where c.id = collection_passages.collection_id
        and c.user_id = auth.uid()
    )
  );

-- ── streaks ───────────────────────────────────────────────────────────────────
create table streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_date date,
  freezes_remaining int default 2,
  pause_until date
);

alter table streaks enable row level security;

create policy "Users can manage own streak"
  on streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── daily_stats ───────────────────────────────────────────────────────────────
create table daily_stats (
  user_id uuid references profiles(id) on delete cascade,
  date date,
  sessions_count int default 0,
  minutes_read int default 0,
  words_read int default 0,
  chars_read int default 0,
  avg_wpm numeric,
  avg_comprehension numeric(4,3),
  questions_attempted int default 0,
  questions_correct int default 0,
  cards_reviewed int default 0,
  primary key (user_id, date)
);

alter table daily_stats enable row level security;

create policy "Users can manage own daily stats"
  on daily_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── pet_performance ───────────────────────────────────────────────────────────
create table pet_performance (
  user_id uuid references profiles(id) on delete cascade,
  question_type text,
  attempts int default 0,
  correct int default 0,
  avg_time_seconds numeric,
  last_attempted_at timestamptz,
  primary key (user_id, question_type)
);

alter table pet_performance enable row level security;

create policy "Users can manage own PET performance"
  on pet_performance for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
