import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Choice, ErrorText, Field, Label } from '@/components/ui';
import { localDate, relativeDate } from '@/lib/dates';
import { mealTypeForNow } from '@/lib/meals';
import { fmt, parseNum } from '@/lib/numbers';
import { supabase } from '@/lib/supabase';
import { MEAL_LABELS, type Meal, type MealType } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';

const MEAL_OPTIONS = (Object.keys(MEAL_LABELS) as MealType[]).map((value) => ({ value, label: MEAL_LABELS[value] }));
const MEAL_COLS = 'id, date, meal_type, description, kcal, protein_g, carbs_g, fat_g, source';

const str = (n: number | null) => (n === null ? '' : fmt(n));

export default function AddMeal() {
  const params = useLocalSearchParams<{ id?: string; date?: string; type?: MealType }>();
  const t = useTheme();
  const editing = !!params.id;

  const [loaded, setLoaded] = useState(!editing);
  const [date, setDate] = useState(params.date ?? localDate());
  const [type, setType] = useState<MealType>(params.type ?? mealTypeForNow());
  const [description, setDescription] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [recent, setRecent] = useState<Meal[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fill(m: Meal) {
    setDescription(m.description);
    setKcal(str(m.kcal));
    setProtein(str(m.protein_g));
    setCarbs(str(m.carbs_g));
    setFat(str(m.fat_g));
  }

  useEffect(() => {
    if (editing) {
      supabase
        .from('meals')
        .select(MEAL_COLS)
        .eq('id', params.id!)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const m = data as Meal;
            fill(m);
            setType(m.meal_type);
            setDate(m.date);
          }
          setLoaded(true);
        });
      return;
    }
    // Recent distinct meals, so a usual breakfast is one tap.
    supabase
      .from('meals')
      .select(MEAL_COLS)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const seen = new Set<string>();
        const unique = ((data as Meal[]) ?? []).filter((m) => {
          const key = m.description.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setRecent(unique.slice(0, 8));
      });
  }, [editing, params.id]);

  async function save() {
    const k = parseNum(kcal);
    const p = parseNum(protein);
    const c = parseNum(carbs);
    const f = parseNum(fat);
    if (!description.trim()) return setError('Describe what you ate, e.g. “2 rotis, dal, curd”.');
    if (k === null || k < 0 || k > 10000) return setError('Enter calories (0–10000 kcal).');
    for (const [name, v] of [['Protein', p], ['Carbs', c], ['Fat', f]] as const) {
      if (v !== null && (v < 0 || v > 1000)) return setError(`${name} should be between 0 and 1000 g.`);
    }
    const row = {
      date,
      meal_type: type,
      description: description.trim(),
      kcal: Math.round(k),
      protein_g: p,
      carbs_g: c,
      fat_g: f,
    };
    setSaving(true);
    setError(null);
    const { error: e } = editing
      ? await supabase.from('meals').update(row).eq('id', params.id!)
      : await supabase.from('meals').insert(row);
    setSaving(false);
    if (e) return setError(e.message);
    router.back();
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setSaving(true);
    const { error: e } = await supabase.from('meals').delete().eq('id', params.id!);
    setSaving(false);
    if (e) return setError(e.message);
    router.back();
  }

  if (!loaded) return null;

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: 64 }}
      keyboardShouldPersistTaps="handled"
    >
      <Body muted>{relativeDate(date)}</Body>
      <View style={{ height: space.md }} />
      <Choice label="Meal" options={MEAL_OPTIONS} value={type} onChange={setType} />

      {recent.length ? (
        <View style={{ marginBottom: space.lg }}>
          <Label>Recent — tap to reuse</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {recent.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => fill(m)}
                style={({ pressed }) => ({
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: t.card,
                  borderRadius: radius.md,
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                  opacity: pressed ? 0.6 : 1,
                  maxWidth: '100%',
                })}
              >
                <Text style={{ color: t.text }} numberOfLines={1}>
                  {m.description}
                </Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>
                  {m.kcal ?? '—'} kcal · {fmt(m.protein_g)} g protein
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Field
        label="What did you eat?"
        value={description}
        onChangeText={setDescription}
        placeholder="2 rotis, 1 bowl dal, curd"
      />
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
        <Field compact label="Kcal" value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="450" />
        <Field compact label="Protein g" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" placeholder="18" />
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.lg }}>
        <Field compact label="Carbs g" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" placeholder="optional" />
        <Field compact label="Fat g" value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="optional" />
      </View>
      <Body muted>Use the label on the packet, or a rough estimate — consistency matters more than precision.</Body>
      <View style={{ height: space.lg }} />

      <ErrorText>{error}</ErrorText>
      <View style={{ gap: space.md }}>
        <Button title={editing ? 'Save changes' : 'Add to log'} onPress={save} loading={saving} />
        {editing ? (
          <Button
            title={confirmDelete ? 'Tap again to delete' : 'Delete'}
            variant="danger"
            onPress={remove}
            disabled={saving}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}
