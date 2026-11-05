import { mmss } from './dates';
import { fmt } from './numbers';
import type { Exercise, WorkoutSet } from './types';

export const isCardio = (e: Pick<Exercise, 'muscle_group'>) => e.muscle_group === 'cardio';

/** Training volume in kg (weight × reps). Bodyweight and cardio sets count as 0. */
export function volumeKg(sets: Pick<WorkoutSet, 'reps' | 'weight_kg'>[]): number {
  return sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight_kg ?? 0), 0);
}

/** One set as text: "60 kg × 8 @ RPE 8", "8 reps", "20:00 · 3.2 km". */
export function describeSet(s: WorkoutSet, cardio: boolean): string {
  if (cardio) {
    const parts = [];
    if (s.time_sec) parts.push(mmss(s.time_sec));
    if (s.distance_km) parts.push(`${fmt(s.distance_km, 2)} km`);
    return parts.join(' · ') || '—';
  }
  const main = s.weight_kg ? `${fmt(s.weight_kg, 2)} kg × ${s.reps ?? 0}` : `${s.reps ?? 0} reps`;
  return s.rpe ? `${main} @ RPE ${fmt(s.rpe)}` : main;
}

/** Minutes since start, clamped to the 0–600 range the database allows. */
export function minutesSince(startedAt: string, now = Date.now()): number {
  return Math.min(600, Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 60_000)));
}
