import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, ErrorText, IconButton, Label, Meter, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { addDays, localDate, relativeDate } from '@/lib/dates';
import { mealTypeForNow, totals } from '@/lib/meals';
import { fmt } from '@/lib/numbers';
import { supabase } from '@/lib/supabase';
import { DIET_LABELS, MEAL_LABELS, type Meal, type MealType } from '@/lib/types';
import { space } from '@/theme';

const MEAL_ORDER = Object.keys(MEAL_LABELS) as MealType[];

export default function Food() {
  const { profile } = useAuth();
  const [date, setDate] = useState(localDate());
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    supabase
      .from('meals')
      .select('id, date, meal_type, description, kcal, protein_g, carbs_g, fat_g, source')
      .eq('date', date)
      .order('created_at')
      .then(({ data, error: e }) => {
        setError(e?.message ?? null);
        setMeals((data as Meal[]) ?? []);
      });
  }, [date]);

  // Reload on focus (after adding a meal) and when the day changes.
  useFocusEffect(load);

  const isToday = date === localDate();
  const sum = totals(meals ?? []);

  function changeDay(delta: number) {
    setMeals(null);
    setDate((d) => addDays(d, delta));
  }

  return (
    <Screen>
      <Title subtitle={profile?.diet_type ? DIET_LABELS[profile.diet_type] : undefined}>Food</Title>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="chevron-back" label="Previous day" onPress={() => changeDay(-1)} />
        <Body>{relativeDate(date)}</Body>
        {isToday ? (
          <View style={{ width: 36 }} />
        ) : (
          <IconButton icon="chevron-forward" label="Next day" onPress={() => changeDay(1)} />
        )}
      </View>

      <Card>
        <Meter label="Calories" value={sum.kcal} target={profile?.target_kcal ?? null} unit="kcal" warnAbove={1.1} />
        <Meter label="Protein" value={sum.protein} target={profile?.target_protein_g ?? null} unit="g" />
        <Body muted>
          Carbs {fmt(sum.carbs, 0)} g · Fat {fmt(sum.fat, 0)} g
        </Body>
      </Card>

      <Button
        title="Add food"
        onPress={() =>
          router.push({
            pathname: '/add-meal',
            params: { date, type: isToday ? mealTypeForNow() : 'lunch' },
          })
        }
      />
      <ErrorText>{error}</ErrorText>

      {meals === null ? (
        <Body muted>Loading…</Body>
      ) : meals.length === 0 ? (
        <Card>
          <Body muted>Nothing logged {isToday ? 'yet today' : 'this day'}.</Body>
        </Card>
      ) : (
        MEAL_ORDER.filter((type) => meals.some((m) => m.meal_type === type)).map((type) => {
          const list = meals.filter((m) => m.meal_type === type);
          return (
            <Card key={type}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Label>{MEAL_LABELS[type]}</Label>
                <Label>{totals(list).kcal} kcal</Label>
              </View>
              {list.map((m) => (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityHint="Edit or delete"
                  onPress={() => router.push({ pathname: '/add-meal', params: { id: m.id } })}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: space.xs })}
                >
                  <Body>{m.description}</Body>
                  <Body muted>
                    {m.kcal ?? '—'} kcal · {fmt(m.protein_g)} g protein
                  </Body>
                </Pressable>
              ))}
            </Card>
          );
        })
      )}

      {profile?.allergies.length ? <Body muted>Avoiding: {profile.allergies.join(', ')}</Body> : null}
    </Screen>
  );
}
