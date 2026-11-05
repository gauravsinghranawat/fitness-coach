import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Label, Stat, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { localDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { GOAL_LABELS } from '@/lib/types';
import { space } from '@/theme';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const { profile, session } = useAuth();
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function logWeight() {
    const w = Number(weight.replace(',', '.'));
    if (!w || w < 30 || w > 300) return setError('Enter a weight between 30 and 300 kg.');
    setSaving(true);
    setError(null);
    const { error: e } = await supabase
      .from('body_metrics')
      .upsert({ user_id: session!.user.id, date: localDate(), weight_kg: w }, { onConflict: 'user_id,date' });
    setSaving(false);
    if (e) return setError(e.message);
    setSaved(`${w} kg saved for today.`);
    setWeight('');
  }

  const name = profile?.display_name ? `, ${profile.display_name}` : '';

  return (
    <Screen>
      <Title subtitle={profile?.goal ? `Goal: ${GOAL_LABELS[profile.goal]}` : undefined}>
        {greeting()}
        {name}
      </Title>

      <Card>
        <Label>Daily targets</Label>
        <View style={{ flexDirection: 'row', gap: space.lg }}>
          <Stat value={`${profile?.target_kcal ?? '—'}`} label="kcal" />
          <Stat value={`${profile?.target_protein_g ?? '—'} g`} label="protein" />
        </View>
      </Card>

      <Card>
        <Label>Today's plan</Label>
        <Body muted>
          Your AI workout and meal plan will appear here once the coach is switched on (milestone 3). Until then, log
          a week of training and food so it has something to learn from.
        </Body>
      </Card>

      <Card>
        <Label>Log today's weight</Label>
        <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="74.5" />
        <ErrorText>{error}</ErrorText>
        {saved ? <Body muted>{saved}</Body> : null}
        <Button title="Save weight" onPress={logWeight} loading={saving} />
      </Card>
    </Screen>
  );
}
