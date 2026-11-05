import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Body, Card, Label, Screen, Title } from '@/components/ui';
import { shortDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { BodyMetric } from '@/lib/types';
import { space } from '@/theme';

export default function Progress() {
  const [rows, setRows] = useState<BodyMetric[] | null>(null);

  // Reload whenever the tab is opened, so a weight logged on Today shows up.
  useFocusEffect(
    useCallback(() => {
      supabase
        .from('body_metrics')
        .select('id, date, weight_kg, waist_cm, sleep_hrs')
        .order('date', { ascending: false })
        .limit(14)
        .then(({ data }) => setRows((data as BodyMetric[]) ?? []));
    }, []),
  );

  return (
    <Screen>
      <Title subtitle="Charts for weight, training volume and food arrive in milestone 4.">Progress</Title>
      <Card>
        <Label>Recent body log</Label>
        {rows === null ? (
          <Body muted>Loading…</Body>
        ) : rows.length === 0 ? (
          <Body muted>No weigh-ins yet. Log one on the Today tab.</Body>
        ) : (
          rows.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs }}>
              <Body muted>{shortDate(r.date)}</Body>
              <Body>
                {[
                  r.weight_kg !== null ? `${r.weight_kg} kg` : null,
                  r.waist_cm !== null ? `waist ${r.waist_cm} cm` : null,
                  r.sleep_hrs !== null ? `${r.sleep_hrs} h sleep` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Body>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
