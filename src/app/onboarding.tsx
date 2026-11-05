import { ProfileForm } from '@/components/ProfileForm';
import { Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Onboarding() {
  const { profile } = useAuth();
  // When the profile saves, onboarded_at is set and the root layout switches to the tabs.
  return (
    <Screen>
      <ProfileForm initial={profile} onSaved={() => {}} />
    </Screen>
  );
}
