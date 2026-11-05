import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import { ProfileForm } from '@/components/ProfileForm';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { space, useTheme } from '@/theme';

export default function EditProfile() {
  const { profile } = useAuth();
  const t = useTheme();
  const [weight, setWeight] = useState<number | null | undefined>(undefined);

  // Prefill with the most recent logged weight.
  useEffect(() => {
    supabase
      .from('body_metrics')
      .select('weight_kg')
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setWeight(data?.weight_kg ?? null));
  }, []);

  if (weight === undefined) return null;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space.lg, paddingBottom: 64 }}>
      <ProfileForm initial={profile} initialWeightKg={weight} onSaved={() => router.back()} />
    </ScrollView>
  );
}
