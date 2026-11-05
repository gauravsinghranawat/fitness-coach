import type { Meal, MealType } from './types';

/** A sensible default for "what meal is it now?". */
export function mealTypeForNow(d = new Date()): MealType {
  const h = d.getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
}

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function totals(meals: Pick<Meal, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>[]): MacroTotals {
  return meals.reduce(
    (t, m) => ({
      kcal: t.kcal + (m.kcal ?? 0),
      protein: t.protein + (m.protein_g ?? 0),
      carbs: t.carbs + (m.carbs_g ?? 0),
      fat: t.fat + (m.fat_g ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
