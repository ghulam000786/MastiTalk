import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/auth';
import { C } from '../src/theme';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.pink} size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/match" />;
}
