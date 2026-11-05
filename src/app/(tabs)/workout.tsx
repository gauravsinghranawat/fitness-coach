import { useEffect, useState } from 'react';

import { Body, Card, Label, Screen, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { EQUIPMENT_LABELS } from '@/lib/types';
import { useAuth } from '@/lib/auth';

export default function Workout() {
  const { profile } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('exercises')
      .select('id', { count: 'exact', head: true })
      .then(({ count: c }) => setCount(c ?? 0));
  }, []);

  return (
    <Screen>
      <Title subtitle="Log sets as you train.">Workout</Title>
      <Card>
        <Label>Coming in milestone 2</Label>
        <Body muted>
          The logger: pick an exercise, record sets with reps, weight and effort (RPE), and a rest timer between sets.
        </Body>
      </Card>
      <Card>
        <Label>Ready now</Label>
        <Body>
          {count === null ? 'Checking exercise library…' : `${count} exercises in your library.`}
        </Body>
        {profile?.equipment ? (
          <Body muted>
            Set up for: {EQUIPMENT_LABELS[profile.equipment]}, {profile.days_per_week} days a week,{' '}
            {profile.session_minutes} min sessions.
          </Body>
        ) : null}
      </Card>
    </Screen>
  );
}
