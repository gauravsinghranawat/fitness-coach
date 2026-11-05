// Daily calorie and protein targets, computed in code (never by the AI).
// Mifflin-St Jeor resting energy x activity factor, then a goal adjustment,
// with conservative floors so a fat-loss target never gets unsafely low.

import type { ActivityLevel, Goal, Sex } from './types';

export interface TargetInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
}

export interface Targets {
  bmr: number;
  maintenanceKcal: number;
  targetKcal: number;
  proteinG: number;
  floorApplied: boolean;
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  fat_loss: -0.2,
  muscle_gain: 0.1,
  endurance: 0,
  general_fitness: 0,
};

const PROTEIN_G_PER_KG: Record<Goal, number> = {
  fat_loss: 1.8,
  muscle_gain: 1.8,
  endurance: 1.4,
  general_fitness: 1.2,
};

export const KCAL_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 };

const round10 = (n: number) => Math.round(n / 10) * 10;

export function mifflinStJeor(sex: Sex, age: number, heightCm: number, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function computeTargets(input: TargetInput): Targets {
  const bmr = mifflinStJeor(input.sex, input.age, input.heightCm, input.weightKg);
  const maintenance = bmr * ACTIVITY_FACTOR[input.activity];
  const raw = maintenance * (1 + GOAL_ADJUSTMENT[input.goal]);
  const floor = KCAL_FLOOR[input.sex];
  const targetKcal = Math.max(raw, floor);

  return {
    bmr: Math.round(bmr),
    maintenanceKcal: round10(maintenance),
    targetKcal: round10(targetKcal),
    proteinG: Math.round(input.weightKg * PROTEIN_G_PER_KG[input.goal]),
    floorApplied: raw < floor,
  };
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}
