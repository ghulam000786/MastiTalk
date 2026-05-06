import { Redirect, Stack } from 'expo-router';
import { useAuth } from'../../hooks/useAuth';
import { ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (user?.is_admin !== true) {  // ← {} bracket zaruri hai
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
