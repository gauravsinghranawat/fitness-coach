# Fitness Coach

A personal fitness app: log workouts, meals and body metrics; Claude suggests the next workout and meal plan from that history. Read `AGENTS.md` too — it has Expo-specific rules (Expo SDK 58 changes often; check versioned docs before using an Expo API).

## Stack

- Expo SDK 58 + React Native + TypeScript, Expo Router (routes in `src/app/`, `@/` → `src/`)
- Supabase: Postgres + Auth + Edge Functions (Deno). Client in `src/lib/supabase.ts`
- Claude API — called **only** from Supabase Edge Functions, never from the app
- Install packages with `npx expo install <pkg>` (add `EXPO_OFFLINE=1` if the Expo API is unreachable)

## Layout

```
src/app/_layout.tsx        Root: AuthProvider + Stack.Protected guards (signed out → sign-in, not onboarded → onboarding, else tabs)
src/app/(tabs)/            Today, Workout, Food, Progress, Coach
src/app/edit-profile.tsx   Modal reusing ProfileForm
src/components/ui.tsx      Screen, Card, Button, Field, Choice, Stat… (use these, don't restyle per screen)
src/components/ProfileForm.tsx   Onboarding / edit profile (5 steps)
src/lib/auth.tsx           Session + profile context (useAuth)
src/lib/targets.ts         Calorie/protein targets (Mifflin-St Jeor). Targets are computed in code, never by the AI
src/lib/types.ts           Row types + display labels — keep in sync with migrations
src/theme.ts               Light/dark tokens via useTheme()
supabase/migrations/       Schema, RLS, seed data
```

## Conventions

- Every user-owned table has `user_id` (default `auth.uid()`) and row-level security. New tables need RLS policies + grants to `authenticated` in the same migration. Never use the service-role key in the app.
- Dates in `date` columns are the phone's local date: use `localDate()` from `src/lib/dates.ts`.
- Units: kg, cm, kcal. Indian foods and vegetarian diets are first-class.
- Secrets live in `.env` (gitignored) and Supabase secrets (`supabase secrets set ANTHROPIC_API_KEY=…`). Never commit keys or put them in code.
- Ask the user before creating accounts or doing anything that needs their credentials.

## AI rules (milestone 3+)

- One Edge Function per job: `suggest-workout`, `suggest-meals`, `parse-meal` (Haiku), `weekly-review`.
- Send a compact snapshot (profile + last 14 days, or weekly_summaries), ask for JSON via tool use, validate with Zod, save to `ai_plans`.
- Safety in the system prompt: avoid exercises that load listed injuries; never below 1200 kcal (female) / 1500 kcal (male) or >1%/week weight loss; refer to a doctor for pain, dizziness, chest symptoms, diabetes, heart disease or pregnancy.
- Rate-limit each function per user per day.

## Checks before calling a task done

```
npm run typecheck
EXPO_OFFLINE=1 npx expo export --platform android   # bundles without a device
```

## Milestones

1. ✅ Foundation — project, login, migrations + RLS, onboarding saving profile and targets
2. Logging — workout logger (sets, RPE, rest timer), food log with manual macros, body weight
3. AI suggestions — suggest-workout, suggest-meals, Today screen shows the plan
4. Smarter logging + progress — parse-meal, charts, PRs, weekly_summaries job
5. Coach + polish — weekly review, chat, rate/spend limits, icon, optional web deploy
