import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Body, Button, Card, Choice, ErrorText, Field, IconButton, Label, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  EXERCISE_EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  type Exercise,
  type ExerciseEquipment,
  type MuscleGroup,
} from '@/lib/types';
import { space, useTheme } from '@/theme';

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
  /** Already in this workout; shown with a tick. */
  selectedIds: string[];
}

export function ExercisePicker({ visible, onClose, onPick, selectedIds }: Props) {
  const t = useTheme();
  const { session } = useAuth();
  const [all, setAll] = useState<Exercise[] | null>(null);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!visible || all) return;
    supabase
      .from('exercises')
      .select('id, user_id, name, muscle_group, equipment, is_custom')
      .order('name')
      .then(({ data }) => setAll((data as Exercise[]) ?? []));
  }, [visible, all]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (all ?? []).filter(
      (e) => (!muscle || e.muscle_group === muscle) && (!q || e.name.toLowerCase().includes(q)),
    );
  }, [all, query, muscle]);

  function close() {
    setQuery('');
    setAdding(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: t.bg, padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Title>{adding ? 'New exercise' : 'Add exercise'}</Title>
          <IconButton icon="close" label="Close" onPress={close} />
        </View>

        {adding ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxl }}>
          <NewExercise
            userId={session!.user.id}
            initialName={query}
            onCancel={() => setAdding(false)}
            onCreated={(e) => {
              setAll((prev) => [...(prev ?? []), e].sort((a, b) => a.name.localeCompare(b.name)));
              setAdding(false);
              setQuery('');
              onPick(e);
            }}
          />
          </ScrollView>
        ) : (
          <>
            <Field
              label="Search"
              value={query}
              onChangeText={setQuery}
              placeholder="Squat, row, push-up…"
              autoCorrect={false}
              compact
            />
            <FlatList
              horizontal
              data={[null, ...MUSCLES]}
              keyExtractor={(m) => m ?? 'all'}
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: space.sm }}
              renderItem={({ item }) => {
                const selected = item === muscle;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setMuscle(item)}
                    style={{
                      borderWidth: 1,
                      borderRadius: 999,
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm,
                      backgroundColor: selected ? t.accentSoft : t.card,
                      borderColor: selected ? t.accent : t.border,
                    }}
                  >
                    <Text style={{ color: t.text, fontWeight: selected ? '600' : '400' }}>
                      {item ? MUSCLE_LABELS[item] : 'All'}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <FlatList
              data={shown}
              keyExtractor={(e) => e.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Body muted>{all === null ? 'Loading…' : 'No match.'}</Body>}
              ListFooterComponent={
                <View style={{ paddingVertical: space.lg }}>
                  <Button title="Can't find it? Add your own" variant="secondary" onPress={() => setAdding(true)} />
                </View>
              }
              renderItem={({ item }) => {
                const picked = selectedIds.includes(item.id);
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onPick(item);
                      setQuery('');
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: space.md,
                      borderBottomWidth: 1,
                      borderBottomColor: t.border,
                      opacity: pressed ? 0.6 : 1,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.text, fontSize: 16 }}>{item.name}</Text>
                      <Text style={{ color: t.muted, fontSize: 13 }}>
                        {MUSCLE_LABELS[item.muscle_group]} · {EXERCISE_EQUIPMENT_LABELS[item.equipment]}
                        {item.is_custom ? ' · yours' : ''}
                      </Text>
                    </View>
                    {picked ? <Text style={{ color: t.accent, fontWeight: '600' }}>Added</Text> : null}
                  </Pressable>
                );
              }}
            />
          </>
        )}
      </View>
    </Modal>
  );
}

function NewExercise({
  userId,
  initialName,
  onCancel,
  onCreated,
}: {
  userId: string;
  initialName: string;
  onCancel: () => void;
  onCreated: (e: Exercise) => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<ExerciseEquipment | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Give it a name.');
    if (!muscle || !equipment) return setError('Pick a muscle group and equipment.');
    setSaving(true);
    setError(null);
    // exercises.user_id has no default (library rows are null), so set it explicitly.
    const { data, error: e } = await supabase
      .from('exercises')
      .insert({ user_id: userId, name: trimmed, muscle_group: muscle, equipment })
      .select('id, user_id, name, muscle_group, equipment, is_custom')
      .single();
    setSaving(false);
    if (e) return setError(e.code === '23505' ? 'You already have an exercise with that name.' : e.message);
    onCreated(data as Exercise);
  }

  return (
    <Card>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Surya namaskar" />
      <Choice label="Muscle group" options={toOptions(MUSCLE_LABELS)} value={muscle} onChange={setMuscle} />
      <Choice
        label="Equipment"
        options={toOptions(EXERCISE_EQUIPMENT_LABELS)}
        value={equipment}
        onChange={setEquipment}
      />
      <Label>Cardio exercises log time and distance; everything else logs reps and weight.</Label>
      <ErrorText>{error}</ErrorText>
      <Button title="Save exercise" onPress={save} loading={saving} />
      <Button title="Back to list" variant="secondary" onPress={onCancel} />
    </Card>
  );
}
