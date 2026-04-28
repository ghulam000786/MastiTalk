import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../src/api';
import { C } from '../src/theme';

type Txn = {
  id: string; type: 'credit' | 'debit'; coins: number; source: string;
  channel_name?: string; minutes?: number; amount_inr?: number; created_at: string;
};

export default function History() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const r = await api<{ transactions: Txn[] }>('/transactions');
    setTxns(r.transactions || []);
  };

  useFocusEffect(useCallback(() => {
    setLoading(true); load().finally(() => setLoading(false));
  }, []));

  const onRefresh = async () => { setRefreshing(true); try { await load(); } catch {} setRefreshing(false); };
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="history-back-btn">
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Activity</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color={C.pink} /></View>
        ) : txns.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={36} color={C.textMuted} />
            <Text style={s.emptyTitle}>No activity yet</Text>
            <Text style={s.emptySub}>Your purchases and calls will appear here.</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {txns.map(t => (
              <View key={t.id} style={s.row} testID={`txn-${t.id}`}>
                <View style={[s.rowIcon, { backgroundColor: t.type === 'credit' ? C.yellowBg : C.pinkBg }]}>
                  <Ionicons
                    name={t.type === 'credit' ? 'arrow-down-circle' : 'videocam'}
                    size={20}
                    color={t.type === 'credit' ? C.yellow : C.pink}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>
                    {t.type === 'credit' ? 'Coins purchased' : `Call · ${t.channel_name || '-'}`}
                  </Text>
                  <Text style={s.rowSub}>
                    {t.type === 'credit'
                      ? `${t.amount_inr ? `₹${t.amount_inr} · ` : ''}${fmt(t.created_at)}`
                      : `${t.minutes ?? 0} min · ${fmt(t.created_at)}`}
                  </Text>
                </View>
                <Text style={[s.rowAmount, { color: t.type === 'credit' ? C.green : C.pink }]}>
                  {t.type === 'credit' ? '+' : '-'}{t.coins}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '800' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { color: C.textPrimary, fontWeight: '700', fontSize: 14 },
  rowSub: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { color: C.textPrimary, fontWeight: '700', fontSize: 16, marginTop: 8 },
  emptySub: { color: C.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});
