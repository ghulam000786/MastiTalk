import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth'; // Emergent mein ye hook hota hai

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  // Jab tak user load ho raha hai
  if (isLoading) {
    return null;
  }

  // Agar user admin nahi hai to home bhej do
  if (user?.role !== "ADMIN") {
    return <Redirect href="/" />;
  }

  // Admin hai to admin pages dikhao
  return <Stack screenOptions={{ headerShown: false }} />;
}
