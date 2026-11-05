# Fitness Coach

Log workouts, meals and weight; get workout and meal suggestions from Claude based on your own history. Built with Expo (Android, iOS, web) and Supabase.

**Status:** milestone 2 of 5 — sign-in, onboarding with calorie/protein targets, a workout logger (sets, RPE, rest timer, "last time" hints, custom exercises), a food log with manual macros against your targets, and body weight / waist / sleep logging. Database uses row-level security. See `CLAUDE.md` for the roadmap.

## First-time setup (about 15 minutes)

You need: a computer with [Node.js](https://nodejs.org) 20 or newer, and the **Expo Go** app on your phone (Play Store / App Store).

### 1. Get the code running

```bash
git clone <this repo>
cd fitness-coach
npm install
cp .env.example .env
```

### 2. Connect your Supabase project

1. Open your project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. **Project Settings → API Keys**: copy the **Publishable key** (`sb_publishable_…`) into `.env` as `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The URL is already filled in.
   - Do **not** use the secret / service-role key in the app.
3. **Create the tables.** Either:
   - **SQL Editor (easiest):** paste and run `supabase/migrations/20261105000000_init.sql`, then `supabase/migrations/20261105000100_seed_exercises.sql`, in that order.
   - **Supabase CLI:** `npx supabase login`, `npx supabase init` (keep the existing migrations), `npx supabase link --project-ref ajyereaizkgyqrgrmdnb`, then `npx supabase db push`.
4. **Authentication → Sign In / Providers → Email**: for a personal app, turn **off** "Confirm email" so you can sign in straight away. (If you leave it on, click the link in the confirmation email, then sign in.)

### 3. Run it on your phone

```bash
npx expo start
```

Scan the QR code with your phone's camera (iPhone) or the Expo Go app (Android). Phone and computer must be on the same Wi-Fi; if not, use `npx expo start --tunnel`.

Create an account, finish onboarding, and you should land on the **Today** tab with your targets.

### Changed `.env`?

Restart with `npx expo start --clear`.

## Useful commands

| Command | What it does |
| --- | --- |
| `npx expo start` | Dev server (phone via Expo Go, `w` for web) |
| `npm run typecheck` | TypeScript check |
| `npx expo export --platform android` | Full bundle build, catches build errors without a phone |

## Security notes

- Every table uses row-level security: a signed-in user can only read and change their own rows. The shared exercise library is read-only.
- The Claude API key (from milestone 3) is stored as a Supabase secret and used only inside Edge Functions — never in the app or this repo.
- Targets are estimates from the Mifflin-St Jeor formula, with minimums of 1200 kcal (female) / 1500 kcal (male). Not medical advice.

## Continuing with Claude Code

Open this folder in Claude Code and say, for example: *"Read CLAUDE.md and build milestone 2."*
