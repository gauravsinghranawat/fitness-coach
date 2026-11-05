import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Label, Meter, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { localDate } from '@/lib/dates';
import { totals, type MacroTotals } from '@/lib/meals';
import { fmt, parseNum } from '@/lib/numbers';
import { supabase } from '@/lib/supabase';
import { GOAL_LABELS, type BodyMetric } from '@/lib/types';
import { space } from '@/theme';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

interface TodayWorkout {
  id: string;
  duration_min: number | null;
  workout_sets: { id: string }[];
}

export default function Today() {
  const { profile, session } = useAuth();
  const [food, setFood] = useState<MacroTotals | null>(null);
  const [workout, setWorkout] = useState<TodayWorkout | null | undefined>(undefined);

  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [sleep, setSleep] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const today = localDate();
      supabase
        .from('meals')
        .select('kcal, protein_g, carbs_g, fat_g')
        .eq('date', today)
        .then(({ data }) => setFood(totals(data ?? [])));
      supabase
        .from('workouts')
        .select('id, duration_min, workout_sets(id)')
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => setWorkout((data as TodayWorkout | null) ?? null));
      supabase
        .from('body_metrics')
        .select('id, date, weight_kg, waist_cm, sleep_hrs')
        .eq('date', today)
        .maybeSingle()
        .then(({ data }) => {
          const m = data as BodyMetric | null;
          setWeight(m?.weight_kg ? fmt(m.weight_kg) : '');
          setWaist(m?.waist_cm ? fmt(m.waist_cm) : '');
          setSleep(m?.sleep_hrs ? fmt(m.sleep_hrs) : '');
        });
    }, []),
  );

  async function saveMetrics() {
    const w = parseNum(weight);
    const wc = parseNum(waist);
    const sl = parseNum(sleep);
    if (w === null && wc === null && sl === null) return setError('Enter at least one value.');
    if (w !== null && (w < 30 || w > 300)) return setError('Enter a weight between 30 and 300 kg.');
    if (wc !== null && (wc < 30 || wc > 250)) return setError('Enter a waist between 30 and 250 cm.');
    if (sl !== null && (sl < 0 || sl > 24)) return setError('Sleep is 0–24 hours.');
    setSaving(true);
    setError(null);
    const { error: e } = await supabase
      .from('body_metrics')
      .upsert(
        { user_id: session!.user.id, date: localDate(), weight_kg: w, waist_cm: wc, sleep_hrs: sl },
        { onConflict: 'user_id,date' },
      );
    setSaving(false);
    if (e) return setError(e.message);
    setSaved('Saved for today.');
  }

  const name = profile?.display_name ? `, ${profile.display_name}` : '';

  return (
    <Screen>
      <Title subtitle={profile?.goal ? `Goal: ${GOAL_LABELS[profile.goal]}` : undefined}>
        {greeting()}
        {name}
      </Title>

      <Card>
        <Label>Food today</Label>
        <Meter label="Calories" value={food?.kcal ?? 0} target={profile?.target_kcal ?? null} unit="kcal" warnAbove={1.1} />
        <Meter label="Protein" value={food?.protein ?? 0} target={profile?.target_protein_g ?? null} unit="g" />
        <Button title="Log food" variant="secondary" onPress={() => router.push('/add-meal')} />
      </Card>

      <Card>
        <Label>Training today</Label>
        {workout === undefined ? (
          <Body muted>Loading…</Body>
        ) : workout === null ? (
          <>
            <Body muted>No workout logged yet.</Body>
            <Button title="Go to Workout" variant="secondary" onPress={() => router.navigate('/workout')} />
          </>
        ) : (
          <>
            <Body>
              {workout.duration_min === null
                ? `In progress · ${workout.workout_sets.length} sets so far`
                : `Done · ${workout.duration_min} min · ${workout.workout_sets.length} sets`}
            </Body>
            <Button
              title={workout.duration_min === null ? 'Resume workout' : 'View workout'}
              variant="secondary"
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: workout.id } })}
            />
          </>
        )}
      </Card>

      <Card>
        <Label>Today's plan</Label>
        <Body muted>
          Your AI workout and meal plan will appear here once the coach is switched on (milestone 3). Until then, log
          a week of training and food so it has something to learn from.
        </Body>
      </Card>

      <Card>
        <Label>Body</Label>
        <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
          <Field compact label="Weight kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="74.5" />
          <Field compact label="Waist cm" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="opt." />
          <Field compact label="Sleep h" value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" placeholder="opt." />
        </View>
        <Body muted>Weigh yourself in the morning, after the bathroom, before eating.</Body>
        <ErrorText>{error}</ErrorText>
        {saved ? <Body muted>{saved}</Body> : null}
        <Button title="Save" onPress={saveMetrics} loading={saving} />
      </Card>
    </Screen>
  );
}
