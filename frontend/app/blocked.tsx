import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../src/api';
import { C } from '../src/theme';

type BlockedUser = { id: string; name: string; picture: string; blocked_at: string };

export default function Blocked() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await api<{ blocked: BlockedUser[] }>('/blocked');
      setUsers(r.blocked || []);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []));

  const unblock = async (u: BlockedUser) => {
    const doIt = async () => {
      setBusyId(u.id);
      try {
        await api('/unblock', { method: 'POST', body: JSON.stringify({ user_id: u.id }) });
        setUsers(s => s.filter(x => x.id !== u.id));
      } catch (e: any) { Alert.alert('Error', e.message); }
      finally { setBusyId(null); }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Unblock ${u.name}?`)) doIt();
    } else {
      Alert.alert('Unblock?', `Unblock ${u.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', onPress: doIt },
      ]);
    }
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="blocked-back-btn">
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Blocked Users</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color={C.pink} size="large" />
        </View>
      ) : users.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="ban-outline" size={48} color={C.textMuted} />
          <Text style={s.emptyTitle}>No blocked users</Text>
          <Text style={s.emptySub}>Anyone you block will appear here. They can&apos;t call or message you.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
          {users.map(u => (
            <View key={u.id} style={s.row} testID={`blocked-${u.id}`}>
              <Image source={{ uri: u.picture }} style={s.avatar} />
              <Text style={s.name}>{u.name}</Text>
              <TouchableOpacity
                style={s.unblockBtn}
                onPress={() => unblock(u)}
                disabled={busyId === u.id}
                testID={`unblock-${u.id}`}
              >
                {busyId === u.id ? <ActivityIndicator color={C.pink} size="small" />
                  : <Text style={s.unblockText}>Unblock</Text>}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  title: { color: C.textPrimary, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptySub: { color: C.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  name: { flex: 1, color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  unblockBtn: { backgroundColor: C.pinkBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, minWidth: 84, alignItems: 'center' },
  unblockText: { color: C.pink, fontWeight: '700', fontSize: 13 },
});
