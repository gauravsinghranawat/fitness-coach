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
