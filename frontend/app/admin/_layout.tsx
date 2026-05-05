import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  // Abhi ke liye sirf is_admin check karo
  if (user?.is_admin !== true) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
