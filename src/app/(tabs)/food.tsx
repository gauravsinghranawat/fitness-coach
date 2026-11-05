import { Body, Card, Label, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DIET_LABELS } from '@/lib/types';

export default function Food() {
  const { profile } = useAuth();
  return (
    <Screen>
      <Title subtitle="What you ate, against your targets.">Food</Title>
      <Card>
        <Label>Coming in milestone 2</Label>
        <Body muted>
          A food log with daily totals. In milestone 4 you'll type meals in plain words (“2 rotis, dal, curd”) and the
          coach fills in the calories and protein for you to confirm.
        </Body>
      </Card>
      {profile?.diet_type ? (
        <Card>
          <Label>Your settings</Label>
          <Body>
            {DIET_LABELS[profile.diet_type]} · {profile.target_kcal} kcal · {profile.target_protein_g} g protein
          </Body>
          {profile.allergies.length ? <Body muted>Avoiding: {profile.allergies.join(', ')}</Body> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
