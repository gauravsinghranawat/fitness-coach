import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Body, Screen, Title } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {isSupabaseConfigured ? (
        <AuthProvider>
          <Routes />
        </AuthProvider>
      ) : (
        <SetupNeeded />
      )}
    </SafeAreaProvider>
  );
}

/** Which screens exist depends on who is signed in and whether onboarding is done. */
function Routes() {
  const { session, profile, loading } = useAuth();
  const t = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  const signedIn = !!session;
  const onboarded = !!profile?.onboarded_at;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="edit-profile"
          options={{ presentation: 'modal', headerShown: true, title: 'Edit profile' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

function SetupNeeded() {
  return (
    <Screen>
      <Title subtitle="The app can't reach your database yet.">Almost there</Title>
      <Body>
        Copy .env.example to .env, paste your Supabase project URL and publishable key, then restart with
        “npx expo start --clear”. The README has the details.
      </Body>
    </Screen>
  );
}
