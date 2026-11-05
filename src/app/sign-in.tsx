import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Body, Button, ErrorText, Field, Screen, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

export default function SignIn() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!email.includes('@')) return setError('Enter a valid email.');
    if (password.length < 8) return setError('Use a password of at least 8 characters.');

    setBusy(true);
    const creds = { email: email.trim(), password };
    if (mode === 'sign-in') {
      const { error: e } = await supabase.auth.signInWithPassword(creds);
      if (e) setError(e.message);
    } else {
      const { data, error: e } = await supabase.auth.signUp(creds);
      if (e) setError(e.message);
      else if (!data.session) {
        // Supabase's "Confirm email" setting is on: the user must click the link first.
        setNotice('Check your inbox to confirm your email, then sign in here.');
        setMode('sign-in');
      }
    }
    // On success the auth listener updates the session and the router moves on.
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ height: space.xxl }} />
        <Title subtitle="Track training and food, and get a plan built from your own logs.">Fitness Coach</Title>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
        />
        <ErrorText>{error}</ErrorText>
        {notice ? <Body>{notice}</Body> : null}
        <Button title={mode === 'sign-in' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />
        <Button
          title={mode === 'sign-in' ? 'New here? Create an account' : 'Have an account? Sign in'}
          variant="secondary"
          onPress={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setError(null);
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
