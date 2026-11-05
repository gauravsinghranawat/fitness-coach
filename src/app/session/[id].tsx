import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ExercisePicker } from '@/components/ExercisePicker';
import { RestTimer } from '@/components/RestTimer';
import { Body, Button, Card, ErrorText, Field, IconButton, Label, Screen, Title } from '@/components/ui';
import { relativeDate } from '@/lib/dates';
import { fmt, parseNum } from '@/lib/numbers';
import { supabase } from '@/lib/supabase';
import { EXERCISE_EQUIPMENT_LABELS, MUSCLE_LABELS, type Exercise, type Workout, type WorkoutSet } from '@/lib/types';
import { describeSet, isCardio, minutesSince, volumeKg } from '@/lib/workouts';
import { space, useTheme } from '@/theme';

const EXERCISE_COLS = 'id, user_id, name, muscle_group, equipment, is_custom';
const SET_COLS = 'id, workout_id, exercise_id, set_no, reps, weight_kg, rpe, distance_km, time_sec, created_at';

type SetWithExercise = WorkoutSet & { exercises: Exercise };

export default function WorkoutSession() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [lastTime, setLastTime] = useState<Record<string, WorkoutSet[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [restSec, setRestSec] = useState(90);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inProgress = !!workout && workout.duration_min === null;

  // The sets from the most recent *other* workout for each exercise, for "last time" hints.
  const loadLastTime = useCallback(
    async (exerciseIds: string[]) => {
      if (!exerciseIds.length) return;
      const { data } = await supabase
        .from('workout_sets')
        .select(SET_COLS)
        .in('exercise_id', exerciseIds)
        .neq('workout_id', id)
        .order('created_at', { ascending: false })
        .limit(300);
      const byExercise: Record<string, WorkoutSet[]> = {};
      for (const s of (data as WorkoutSet[]) ?? []) {
        const list = (byExercise[s.exercise_id] ??= []);
        if (list.length === 0 || list[0].workout_id === s.workout_id) list.unshift(s);
      }
      setLastTime((prev) => ({ ...prev, ...byExercise }));
    },
    [id],
  );

  useEffect(() => {
    (async () => {
      const [w, s] = await Promise.all([
        supabase.from('workouts').select('id, date, started_at, duration_min, notes, source').eq('id', id).maybeSingle(),
        supabase
          .from('workout_sets')
          .select(`${SET_COLS}, exercises(${EXERCISE_COLS})`)
          .eq('workout_id', id)
          .order('created_at'),
      ]);
      if (w.error || s.error) return setLoadError((w.error ?? s.error)!.message);
      if (!w.data) return setLoadError('This workout no longer exists.');
      const rows = (s.data ?? []) as unknown as SetWithExercise[];
      const ordered: Exercise[] = [];
      for (const r of rows) if (!ordered.some((e) => e.id === r.exercise_id)) ordered.push(r.exercises);
      setWorkout(w.data as Workout);
      setNotes(w.data.notes ?? '');
      setExercises(ordered);
      setSets(rows.map(({ exercises: _e, ...set }) => set));
      loadLastTime(ordered.map((e) => e.id));
    })();
  }, [id, loadLastTime]);

  // Re-render the elapsed time every 30 s while the workout is running.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!inProgress) return;
    const i = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, [inProgress]);

  const totalVolume = useMemo(() => volumeKg(sets), [sets]);

  function addExercise(e: Exercise) {
    setPickerOpen(false);
    if (exercises.some((x) => x.id === e.id)) return;
    setExercises((prev) => [...prev, e]);
    loadLastTime([e.id]);
  }

  async function logSet(exercise: Exercise, values: Partial<WorkoutSet>): Promise<string | null> {
    const mine = sets.filter((s) => s.exercise_id === exercise.id);
    const setNo = Math.max(0, ...mine.map((s) => s.set_no)) + 1;
    if (setNo > 50) return 'That is the 50-set limit for one exercise.';
    const { data, error: e } = await supabase
      .from('workout_sets')
      .insert({ workout_id: id, exercise_id: exercise.id, set_no: setNo, ...values })
      .select(SET_COLS)
      .single();
    if (e) return e.message;
    setSets((prev) => [...prev, data as WorkoutSet]);
    if (inProgress && !isCardio(exercise)) setRestEndsAt(Date.now() + restSec * 1000);
    return null;
  }

  async function deleteSet(setId: string) {
    const { error: e } = await supabase.from('workout_sets').delete().eq('id', setId);
    if (e) return setError(e.message);
    setSets((prev) => prev.filter((s) => s.id !== setId));
  }

  function removeExercise(exerciseId: string) {
    // Only offered when the exercise has no sets, so there is nothing to delete in the database.
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
  }

  async function finish() {
    if (!workout) return;
    if (sets.length === 0) return setError('Log at least one set, or delete this workout below.');
    setSaving(true);
    setError(null);
    const patch: Partial<Workout> = { notes: notes.trim() || null };
    if (inProgress) patch.duration_min = workout.started_at ? minutesSince(workout.started_at) : 0;
    const { error: e } = await supabase.from('workouts').update(patch).eq('id', id);
    setSaving(false);
    if (e) return setError(e.message);
    router.back();
  }

  async function deleteWorkout() {
    if (!confirmDelete) return setConfirmDelete(true);
    setSaving(true);
    const { error: e } = await supabase.from('workouts').delete().eq('id', id); // sets cascade
    setSaving(false);
    if (e) return setError(e.message);
    router.back();
  }

  if (loadError || !workout) {
    return (
      <Screen>
        <BackButton />
        {loadError ? <ErrorText>{loadError}</ErrorText> : <Body muted>Loading…</Body>}
      </Screen>
    );
  }

  const subtitle = inProgress
    ? `${relativeDate(workout.date)} · ${workout.started_at ? minutesSince(workout.started_at) : 0} min so far`
    : `${relativeDate(workout.date)} · ${workout.duration_min} min`;

  return (
    <Screen
      footer={
        inProgress ? (
          <RestTimer endsAt={restEndsAt} onChange={setRestEndsAt} restSec={restSec} onRestSecChange={setRestSec} />
        ) : null
      }
      edges={inProgress ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    >
      <BackButton />
      <Title subtitle={subtitle}>{inProgress ? 'Workout in progress' : 'Workout'}</Title>

      {exercises.length === 0 ? (
        <Card>
          <Body muted>Add your first exercise, then log each set as you finish it.</Body>
        </Card>
      ) : null}

      {exercises.map((e) => (
        <ExerciseBlock
          key={e.id}
          exercise={e}
          sets={sets.filter((s) => s.exercise_id === e.id)}
          lastSets={lastTime[e.id] ?? []}
          onLog={(values) => logSet(e, values)}
          onDeleteSet={deleteSet}
          onRemove={() => removeExercise(e.id)}
        />
      ))}

      <Button title="Add exercise" variant="secondary" onPress={() => setPickerOpen(true)} />

      <Card>
        <Label>{inProgress ? 'Finish' : 'Notes'}</Label>
        <Body muted>
          {sets.length} sets · {exercises.length} exercises
          {totalVolume ? ` · ${Math.round(totalVolume).toLocaleString()} kg volume` : ''}
        </Body>
        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Felt strong; left knee a bit sore on lunges"
          multiline
        />
        <ErrorText>{error}</ErrorText>
        <Button title={inProgress ? 'Finish workout' : 'Save notes'} onPress={finish} loading={saving} />
        <Button
          title={confirmDelete ? 'Tap again to delete this workout' : 'Delete workout'}
          variant="danger"
          onPress={deleteWorkout}
          disabled={saving}
        />
      </Card>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        selectedIds={exercises.map((e) => e.id)}
      />
    </Screen>
  );
}

function BackButton() {
  return (
    <View style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}>
      <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
    </View>
  );
}

function ExerciseBlock({
  exercise,
  sets,
  lastSets,
  onLog,
  onDeleteSet,
  onRemove,
}: {
  exercise: Exercise;
  sets: WorkoutSet[];
  lastSets: WorkoutSet[];
  onLog: (values: Partial<WorkoutSet>) => Promise<string | null>;
  onDeleteSet: (id: string) => void;
  onRemove: () => void;
}) {
  const t = useTheme();
  const cardio = isCardio(exercise);

  // Prefill from the previous set today, else the first set last time.
  const template = sets[sets.length - 1] ?? lastSets[0];
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [minutes, setMinutes] = useState('');
  const [km, setKm] = useState('');
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!template || template.id === prefilledFrom) return;
    setPrefilledFrom(template.id);
    setWeight(template.weight_kg ? fmt(template.weight_kg, 2) : '');
    setReps(template.reps ? String(template.reps) : '');
    setMinutes(template.time_sec ? fmt(template.time_sec / 60) : '');
    setKm(template.distance_km ? fmt(template.distance_km, 2) : '');
    // RPE is how this set felt, so don't carry it over.
    setRpe('');
  }, [template, prefilledFrom]);

  async function log() {
    let values: Partial<WorkoutSet>;
    if (cardio) {
      const m = parseNum(minutes);
      const d = parseNum(km);
      if (m === null && d === null) return setError('Enter minutes, distance or both.');
      if (m !== null && (m <= 0 || m > 600)) return setError('Minutes should be between 0 and 600.');
      if (d !== null && (d < 0 || d > 1000)) return setError('Distance looks wrong.');
      values = { time_sec: m === null ? null : Math.round(m * 60), distance_km: d };
    } else {
      const r = parseNum(reps);
      const w = parseNum(weight);
      const e = parseNum(rpe);
      if (r === null || r < 1 || r > 500 || !Number.isInteger(r)) return setError('Enter reps (a whole number).');
      if (w !== null && (w < 0 || w > 1000)) return setError('Weight should be between 0 and 1000 kg.');
      if (e !== null && (e < 1 || e > 10)) return setError('RPE is 1–10 (10 = nothing left).');
      values = { reps: r, weight_kg: w, rpe: e === null ? null : Math.round(e * 2) / 2 };
    }
    setSaving(true);
    setError(null);
    const err = await onLog(values);
    setSaving(false);
    if (err) setError(err);
    else setRpe('');
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Body>{exercise.name}</Body>
          <Body muted>
            {MUSCLE_LABELS[exercise.muscle_group]} · {EXERCISE_EQUIPMENT_LABELS[exercise.equipment]}
          </Body>
        </View>
        {sets.length === 0 ? <IconButton icon="close" label={`Remove ${exercise.name}`} onPress={onRemove} /> : null}
      </View>

      {lastSets.length ? (
        <Body muted>Last time: {lastSets.map((s) => describeSet(s, cardio)).join(', ')}</Body>
      ) : null}

      {sets.map((s, i) => (
        <View
          key={s.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingTop: space.xs,
          }}
        >
          <View style={{ width: 28 }}>
            <Body muted>{i + 1}</Body>
          </View>
          <View style={{ flex: 1 }}>
            <Body>{describeSet(s, cardio)}</Body>
          </View>
          <IconButton icon="trash-outline" label={`Delete set ${i + 1}`} onPress={() => onDeleteSet(s.id)} />
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        {cardio ? (
          <>
            <Field compact label="Minutes" value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad" placeholder="20" />
            <Field compact label="Km" value={km} onChangeText={setKm} keyboardType="decimal-pad" placeholder="3.0" />
          </>
        ) : (
          <>
            <Field compact label="Kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="—" />
            <Field compact label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="8" />
            <Field compact label="RPE" value={rpe} onChangeText={setRpe} keyboardType="decimal-pad" placeholder="8" />
          </>
        )}
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title={`Log set ${sets.length + 1}`} onPress={log} loading={saving} />
    </Card>
  );
}
