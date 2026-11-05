import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, ErrorText, Label, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { localDate, relativeDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { EQUIPMENT_LABELS } from '@/lib/types';
import { minutesSince, volumeKg } from '@/lib/workouts';
import { space, useTheme } from '@/theme';

interface WorkoutRow {
  id: string;
  date: string;
  started_at: string | null;
  duration_min: number | null;
  notes: string | null;
  workout_sets: { exercise_id: string; reps: number | null; weight_kg: number | null; exercises: { name: string } }[];
}

export default function WorkoutTab() {
  const { profile } = useAuth();
  const t = useTheme();
  const [rows, setRows] = useState<WorkoutRow[] | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('workouts')
        .select('id, date, started_at, duration_min, notes, workout_sets(exercise_id, reps, weight_kg, exercises(name))')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data, error: e }) => {
          if (e) setError(e.message);
          setRows((data as unknown as WorkoutRow[]) ?? []);
        });
    }, []),
  );

  const active = rows?.find((w) => w.duration_min === null);
  const done = rows?.filter((w) => w.duration_min !== null) ?? [];

  async function start() {
    setStarting(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('workouts')
      .insert({ date: localDate(), started_at: new Date().toISOString() })
      .select('id')
      .single();
    setStarting(false);
    if (e) return setError(e.message);
    router.push({ pathname: '/session/[id]', params: { id: data.id } });
  }

  return (
    <Screen>
      <Title subtitle="Log sets as you train.">Workout</Title>

      {active ? (
        <Card style={{ borderColor: t.accent }}>
          <Label>In progress</Label>
          <Body>
            Started {relativeDate(active.date).toLowerCase()}
            {active.started_at ? `, ${minutesSince(active.started_at)} min ago` : ''} ·{' '}
            {active.workout_sets.length} sets
          </Body>
          <Button
            title="Resume workout"
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: active.id } })}
          />
        </Card>
      ) : (
        <Card>
          <Label>Train today</Label>
          {profile?.equipment ? (
            <Body muted>
              {EQUIPMENT_LABELS[profile.equipment]} · {profile.days_per_week} days a week · {profile.session_minutes} min
            </Body>
          ) : null}
          <Button title="Start workout" onPress={start} loading={starting} />
        </Card>
      )}
      <ErrorText>{error}</ErrorText>

      <Label>History</Label>
      {rows === null ? (
        <Body muted>Loading…</Body>
      ) : done.length === 0 ? (
        <Card>
          <Body muted>No workouts yet. Your finished sessions show up here.</Body>
        </Card>
      ) : (
        done.map((w) => {
          const names = [...new Set(w.workout_sets.map((s) => s.exercises.name))];
          const volume = volumeKg(w.workout_sets);
          return (
            <Pressable
              key={w.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/session/[id]', params: { id: w.id } })}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Body>{relativeDate(w.date)}</Body>
                  <Body muted>
                    {w.duration_min} min · {w.workout_sets.length} sets
                    {volume ? ` · ${Math.round(volume).toLocaleString()} kg` : ''}
                  </Body>
                </View>
                <Body muted>{names.join(', ') || 'No sets'}</Body>
                {w.notes ? (
                  <View style={{ marginTop: space.xs }}>
                    <Body muted>“{w.notes}”</Body>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
