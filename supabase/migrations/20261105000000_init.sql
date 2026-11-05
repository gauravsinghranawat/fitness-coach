-- Fitness Coach: initial schema
-- Every user-owned table has user_id + row-level security, so a signed-in user
-- can only ever read or change their own rows. Never use the service-role key in the app.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per user, filled at onboarding, sent to Claude as context
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text,
  birth_year        int check (birth_year between 1920 and 2020),
  sex               text check (sex in ('male', 'female')),
  height_cm         numeric(5, 1) check (height_cm between 100 and 250),
  activity_level    text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal              text check (goal in ('fat_loss', 'muscle_gain', 'endurance', 'general_fitness')),
  diet_type         text check (diet_type in ('vegetarian', 'eggetarian', 'non_vegetarian', 'vegan')),
  allergies         text[] not null default '{}',
  injuries          text,
  equipment         text check (equipment in ('gym', 'home_dumbbells', 'bodyweight')),
  days_per_week     int check (days_per_week between 1 and 7),
  session_minutes   int check (session_minutes between 10 and 180),
  target_kcal       int check (target_kcal between 1000 and 6000),
  target_protein_g  int check (target_protein_g between 20 and 400),
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create an empty profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- exercises: shared library (user_id null) + each user's custom exercises
-- ---------------------------------------------------------------------------
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,
  name          text not null,
  muscle_group  text not null check (muscle_group in (
                  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs',
                  'glutes', 'core', 'full_body', 'cardio')),
  equipment     text not null check (equipment in (
                  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight',
                  'kettlebell', 'band', 'cardio_machine', 'none')),
  is_custom     boolean generated always as (user_id is not null) stored,
  created_at    timestamptz not null default now(),
  unique nulls not distinct (user_id, name)
);

-- ---------------------------------------------------------------------------
-- ai_plans: every suggestion Claude makes, stored as validated JSON
-- ---------------------------------------------------------------------------
create table public.ai_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('workout', 'meal', 'weekly_review')),
  for_date    date not null default current_date,
  plan_json   jsonb not null,
  model       text,
  accepted    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- workouts + workout_sets
-- ---------------------------------------------------------------------------
create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null default current_date,
  started_at    timestamptz,
  duration_min  int check (duration_min between 0 and 600),
  notes         text,
  source        text not null default 'manual' check (source in ('manual', 'ai_plan')),
  ai_plan_id    uuid references public.ai_plans (id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.workout_sets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id   uuid not null references public.workouts (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id),
  set_no       int not null check (set_no between 1 and 50),
  reps         int check (reps between 0 and 500),
  weight_kg    numeric(6, 2) check (weight_kg between 0 and 1000),
  rpe          numeric(3, 1) check (rpe between 1 and 10),
  distance_km  numeric(6, 2) check (distance_km >= 0),
  time_sec     int check (time_sec >= 0),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- meals, body_metrics, weekly_summaries
-- ---------------------------------------------------------------------------
create table public.meals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date         date not null default current_date,
  meal_type    text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description  text not null,
  kcal         int check (kcal between 0 and 10000),
  protein_g    numeric(6, 1) check (protein_g >= 0),
  carbs_g      numeric(6, 1) check (carbs_g >= 0),
  fat_g        numeric(6, 1) check (fat_g >= 0),
  source       text not null default 'manual' check (source in ('manual', 'ai_parsed')),
  created_at   timestamptz not null default now()
);

create table public.body_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null default current_date,
  weight_kg   numeric(5, 1) check (weight_kg between 20 and 400),
  waist_cm    numeric(5, 1) check (waist_cm between 30 and 250),
  sleep_hrs   numeric(3, 1) check (sleep_hrs between 0 and 24),
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

create table public.weekly_summaries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start        date not null,
  workouts_count    int not null default 0,
  total_volume_kg   numeric(10, 1) not null default 0,
  avg_kcal          int,
  avg_protein_g     numeric(6, 1),
  weight_change_kg  numeric(4, 1),
  created_at        timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- Indexes for the queries the app runs most ("my last N days")
-- ---------------------------------------------------------------------------
create index exercises_user_idx        on public.exercises (user_id);
create index ai_plans_user_date_idx    on public.ai_plans (user_id, for_date desc);
create index workouts_user_date_idx    on public.workouts (user_id, date desc);
create index workout_sets_workout_idx  on public.workout_sets (workout_id);
create index workout_sets_user_idx     on public.workout_sets (user_id, exercise_id);
create index meals_user_date_idx       on public.meals (user_id, date desc);
create index body_metrics_user_idx     on public.body_metrics (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.ai_plans          enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.meals             enable row level security;
alter table public.body_metrics      enable row level security;
alter table public.weekly_summaries  enable row level security;

-- profiles: the row whose id is the user (created by the signup trigger)
create policy "profiles: read own"   on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- exercises: everyone reads the shared library; users manage only their own
create policy "exercises: read library and own" on public.exercises for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "exercises: insert own" on public.exercises for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "exercises: update own" on public.exercises for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises: delete own" on public.exercises for delete to authenticated
  using (user_id = (select auth.uid()));

-- simple owner-only tables
create policy "ai_plans: own rows" on public.ai_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workouts: own rows" on public.workouts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "meals: own rows" on public.meals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "body_metrics: own rows" on public.body_metrics for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "weekly_summaries: own rows" on public.weekly_summaries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- workout_sets: own rows, and the parent workout must also be yours
create policy "workout_sets: own rows" on public.workout_sets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Grants: signed-in users only; the anonymous role gets nothing
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.exercises, public.ai_plans, public.workouts,
  public.workout_sets, public.meals, public.body_metrics, public.weekly_summaries from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.exercises, public.ai_plans, public.workouts,
  public.workout_sets, public.meals, public.body_metrics, public.weekly_summaries to authenticated;
