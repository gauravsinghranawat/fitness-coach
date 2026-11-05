// Shapes of the database rows the app uses. Keep in sync with supabase/migrations.

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'fat_loss' | 'muscle_gain' | 'endurance' | 'general_fitness';
export type DietType = 'vegetarian' | 'eggetarian' | 'non_vegetarian' | 'vegan';
export type Equipment = 'gym' | 'home_dumbbells' | 'bodyweight';

export interface Profile {
  id: string;
  display_name: string | null;
  birth_year: number | null;
  sex: Sex | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  diet_type: DietType | null;
  allergies: string[];
  injuries: string | null;
  equipment: Equipment | null;
  days_per_week: number | null;
  session_minutes: number | null;
  target_kcal: number | null;
  target_protein_g: number | null;
  onboarded_at: string | null;
}

export interface BodyMetric {
  id: string;
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  sleep_hrs: number | null;
}

export const GOAL_LABELS: Record<Goal, string> = {
  fat_loss: 'Lose fat',
  muscle_gain: 'Build muscle',
  endurance: 'Endurance',
  general_fitness: 'General fitness',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Mostly sitting',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
  very_active: 'Athlete / physical job',
};

export const DIET_LABELS: Record<DietType, string> = {
  vegetarian: 'Vegetarian',
  eggetarian: 'Eggetarian',
  non_vegetarian: 'Non-vegetarian',
  vegan: 'Vegan',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  gym: 'Full gym',
  home_dumbbells: 'Home, with dumbbells',
  bodyweight: 'No equipment',
};

// ---------------------------------------------------------------------------
// Logging (milestone 2)
// ---------------------------------------------------------------------------

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'full_body'
  | 'cardio';

export type ExerciseEquipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'cardio_machine'
  | 'none';

export interface Exercise {
  id: string;
  user_id: string | null;
  name: string;
  muscle_group: MuscleGroup;
  equipment: ExerciseEquipment;
  is_custom: boolean;
}

export interface Workout {
  id: string;
  date: string;
  started_at: string | null;
  /** Null while the workout is still in progress. */
  duration_min: number | null;
  notes: string | null;
  source: 'manual' | 'ai_plan';
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_no: number;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  distance_km: number | null;
  time_sec: number | null;
  created_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  date: string;
  meal_type: MealType;
  description: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: 'manual' | 'ai_parsed';
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
  full_body: 'Full body',
  cardio: 'Cardio',
};

export const EXERCISE_EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  cardio_machine: 'Cardio machine',
  none: 'None',
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
