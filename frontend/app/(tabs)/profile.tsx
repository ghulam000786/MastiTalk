import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

export default function Profile() {
  const { user, logout } = useAuth();

  const confirmLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
      </View>

      <View style={s.card}>
        <View style={s.avatar} testID="profile-avatar">
          <Text style={s.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.name} testID="profile-name">{user?.name}</Text>
        <Text style={s.email} testID="profile-email">{user?.email}</Text>
        <View style={s.balancePill}>
          <Ionicons name="diamond" size={14} color={C.gold} />
          <Text style={s.balanceText}>{user?.coins ?? 0} coins</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 24 }}>
        <MenuRow icon="diamond-outline" label="Buy coins" onPress={() => router.push('/(tabs)/store')} testID="menu-store" />
        <MenuRow icon="time-outline" label="Activity history" onPress={() => router.push('/(tabs)/history')} testID="menu-history" />
        <MenuRow icon="shield-checkmark-outline" label="Secured by Razorpay + Agora" testID="menu-security" />
        <MenuRow icon="log-out-outline" label="Sign out" onPress={confirmLogout} danger testID="logout-btn" />
      </View>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, onPress, danger, testID }: any) {
  return (
    <TouchableOpacity style={[s.row, danger && { borderColor: 'rgba(239,68,68,0.3)' }]} onPress={onPress} testID={testID}>
      <Ionicons name={icon} size={20} color={danger ? C.danger : C.gold} />
      <Text style={[s.rowText, danger && { color: C.danger }]}>{label}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={C.textMuted} /> : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  card: {
    marginHorizontal: 20, alignItems: 'center', padding: 24,
    backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.border,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: C.surfaceHi,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.borderGlass,
  },
  avatarText: { color: C.gold, fontSize: 32, fontWeight: '800' },
  name: { color: C.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 12 },
  email: { color: C.textSecondary, fontSize: 13, marginTop: 2 },
  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surfaceHi, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, marginTop: 14, borderWidth: 1, borderColor: C.borderGlass,
  },
  balanceText: { color: C.textPrimary, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  rowText: { color: C.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
});
