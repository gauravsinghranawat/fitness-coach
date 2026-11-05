import { router } from 'expo-router';

import { Body, Button, Card, Label, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Coach() {
  const { session, signOut } = useAuth();
  return (
    <Screen>
      <Title subtitle="Weekly check-ins and questions, using your own data.">Coach</Title>
      <Card>
        <Label>Coming in milestone 5</Label>
        <Body muted>
          A weekly review of what went well and what to change, plus a chat for questions like “my knee hurts on
          squats, what should I do instead?”
        </Body>
      </Card>
      <Card>
        <Label>Account</Label>
        <Body muted>Signed in as {session?.user.email}</Body>
        <Button title="Edit profile and targets" variant="secondary" onPress={() => router.push('/edit-profile')} />
        <Button title="Sign out" variant="danger" onPress={signOut} />
      </Card>
    </Screen>
  );
}
