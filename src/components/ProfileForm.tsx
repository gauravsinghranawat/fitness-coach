import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, Choice, ErrorText, Field, Stat, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { localDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { ageFromBirthYear, computeTargets, KCAL_FLOOR } from '@/lib/targets';
import {
  ACTIVITY_LABELS,
  DIET_LABELS,
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  type ActivityLevel,
  type DietType,
  type Equipment,
  type Goal,
  type Profile,
  type Sex,
} from '@/lib/types';
import { space } from '@/theme';

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return s.trim() === '' || Number.isNaN(n) ? null : n;
};

const STEPS = ['About you', 'Your goal', 'Food', 'Training', 'Your targets'] as const;

interface Props {
  initial: Profile | null;
  initialWeightKg?: number | null;
  onSaved: () => void;
}

/** Onboarding and "edit profile" share this form. Targets are computed in code. */
export function ProfileForm({ initial, initialWeightKg, onSaved }: Props) {
  const { session, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initial?.display_name ?? '');
  const [birthYear, setBirthYear] = useState(initial?.birth_year ? String(initial.birth_year) : '');
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [height, setHeight] = useState(initial?.height_cm ? String(initial.height_cm) : '');
  const [weight, setWeight] = useState(initialWeightKg ? String(initialWeightKg) : '');
  const [goal, setGoal] = useState<Goal | null>(initial?.goal ?? null);
  const [activity, setActivity] = useState<ActivityLevel | null>(initial?.activity_level ?? null);
  const [diet, setDiet] = useState<DietType | null>(initial?.diet_type ?? null);
  const [allergies, setAllergies] = useState((initial?.allergies ?? []).join(', '));
  const [equipment, setEquipment] = useState<Equipment | null>(initial?.equipment ?? null);
  const [days, setDays] = useState<number | null>(initial?.days_per_week ?? null);
  const [minutes, setMinutes] = useState<number | null>(initial?.session_minutes ?? null);
  const [injuries, setInjuries] = useState(initial?.injuries ?? '');

  const by = num(birthYear);
  const h = num(height);
  const w = num(weight);
  const thisYear = new Date().getFullYear();

  function validate(s: number): string | null {
    if (s === 0) {
      if (!by || by < 1920 || by > thisYear - 13) return 'Enter a birth year (you need to be at least 13).';
      if (!sex) return 'Choose the sex used for the calorie formula.';
      if (!h || h < 100 || h > 250) return 'Enter your height in cm (100–250).';
      if (!w || w < 30 || w > 300) return 'Enter your weight in kg (30–300).';
    }
    if (s === 1) {
      if (!goal) return 'Choose a goal.';
      if (!activity) return 'Choose how active your day is.';
    }
    if (s === 2 && !diet) return 'Choose your diet type.';
    if (s === 3) {
      if (!equipment) return 'Choose what equipment you have.';
      if (!days) return 'Choose training days per week.';
      if (!minutes) return 'Choose a typical session length.';
    }
    return null;
  }

  const targets = useMemo(() => {
    if (!by || !sex || !h || !w || !goal || !activity) return null;
    return computeTargets({
      sex,
      age: ageFromBirthYear(by),
      heightCm: h,
      weightKg: w,
      activity,
      goal,
    });
  }, [by, sex, h, w, goal, activity]);

  function next() {
    const problem = validate(step);
    setError(problem);
    if (!problem) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function save() {
    const userId = session?.user.id;
    if (!userId || !targets) return;
    setSaving(true);
    setError(null);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: name.trim() || null,
        birth_year: by,
        sex,
        height_cm: h,
        activity_level: activity,
        goal,
        diet_type: diet,
        allergies: allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        injuries: injuries.trim() || null,
        equipment,
        days_per_week: days,
        session_minutes: minutes,
        target_kcal: targets.targetKcal,
        target_protein_g: targets.proteinG,
        onboarded_at: initial?.onboarded_at ?? new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      setSaving(false);
      setError(profileError.message);
      return;
    }

    // Record today's weight so progress charts have a starting point.
    const { error: weightError } = await supabase
      .from('body_metrics')
      .upsert({ user_id: userId, date: localDate(), weight_kg: w }, { onConflict: 'user_id,date' });
    if (weightError) console.warn('Could not save weight', weightError.message);

    await refreshProfile();
    setSaving(false);
    onSaved();
  }

  return (
    <View>
      <Title subtitle={`Step ${step + 1} of ${STEPS.length}`}>{STEPS[step]}</Title>

      {step === 0 && (
        <>
          <Field label="Name (optional)" value={name} onChangeText={setName} placeholder="What should the coach call you?" />
          <Field label="Birth year" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" placeholder="1995" maxLength={4} />
          <Choice
            label="Sex (for the calorie formula)"
            options={[
              { value: 'male' as Sex, label: 'Male' },
              { value: 'female' as Sex, label: 'Female' },
            ]}
            value={sex}
            onChange={setSex}
          />
          <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="172" />
          <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="74.5" />
        </>
      )}

      {step === 1 && (
        <>
          <Choice label="Main goal" options={toOptions(GOAL_LABELS)} value={goal} onChange={setGoal} />
          <Choice label="Daily activity outside workouts" options={toOptions(ACTIVITY_LABELS)} value={activity} onChange={setActivity} />
        </>
      )}

      {step === 2 && (
        <>
          <Choice label="Diet type" options={toOptions(DIET_LABELS)} value={diet} onChange={setDiet} />
          <Field
            label="Allergies or foods to avoid (optional)"
            value={allergies}
            onChangeText={setAllergies}
            placeholder="peanuts, lactose"
            hint="Separate with commas."
          />
        </>
      )}

      {step === 3 && (
        <>
          <Choice label="Equipment" options={toOptions(EQUIPMENT_LABELS)} value={equipment} onChange={setEquipment} />
          <Choice
            label="Training days per week"
            options={[2, 3, 4, 5, 6].map((d) => ({ value: d, label: String(d) }))}
            value={days}
            onChange={setDays}
          />
          <Choice
            label="Typical session length"
            options={[20, 30, 45, 60, 90].map((m) => ({ value: m, label: `${m} min` }))}
            value={minutes}
            onChange={setMinutes}
          />
          <Field
            label="Injuries or limits (optional)"
            value={injuries}
            onChangeText={setInjuries}
            placeholder="e.g. lower back pain on deadlifts"
            multiline
            hint="The coach will avoid exercises that load these areas."
          />
        </>
      )}

      {step === 4 && targets && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', gap: space.lg }}>
              <Stat value={`${targets.targetKcal}`} label="kcal per day" />
              <Stat value={`${targets.proteinG} g`} label="protein per day" />
            </View>
            <Body muted>
              Maintenance is about {targets.maintenanceKcal} kcal. Your target is set for “{goal ? GOAL_LABELS[goal] : ''}”.
            </Body>
            {targets.floorApplied && sex ? (
              <Body muted>Raised to the {KCAL_FLOOR[sex]} kcal minimum, which is as low as this app will go.</Body>
            ) : null}
          </Card>
          <Body muted>
            These are estimates from a standard formula, not medical advice. If you have a health condition, are pregnant,
            or have a history of disordered eating, check targets with a doctor or dietitian.
          </Body>
        </>
      )}

      <View style={{ height: space.lg }} />
      <ErrorText>{error}</ErrorText>

      <View style={{ gap: space.sm }}>
        {step < STEPS.length - 1 ? (
          <Button title="Continue" onPress={next} />
        ) : (
          <Button title="Save and start" onPress={save} loading={saving} />
        )}
        {step > 0 ? <Button title="Back" variant="secondary" onPress={() => setStep((s) => s - 1)} /> : null}
      </View>
    </View>
  );
}
