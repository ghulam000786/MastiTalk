import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { C } from '../../src/theme';

type Txn = {
  id: string; type: 'credit' | 'debit'; coins: number; source: string;
  pack_id?: string; call_id?: string; channel_name?: string; minutes?: number;
  amount_inr?: number; created_at: string;
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
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(); } catch {}
    setRefreshing(false);
  };

  const fmt = (iso: string) => {
    try { const d = new Date(iso); return d.toLocaleString(); } catch { return iso; }
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}><Text style={s.title}>Activity</Text></View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />}
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color={C.gold} /></View>
        ) : txns.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={36} color={C.textMuted} />
            <Text style={s.emptyTitle}>No transactions yet</Text>
            <Text style={s.emptySub}>Your coin purchases and calls will show up here.</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 10 }}>
            {txns.map(t => (
              <View key={t.id} style={s.row} testID={`txn-${t.id}`}>
                <View style={[s.rowIcon, { backgroundColor: t.type === 'credit' ? 'rgba(212,175,55,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  <Ionicons
                    name={t.type === 'credit' ? 'arrow-down-circle' : 'videocam'}
                    size={22}
                    color={t.type === 'credit' ? C.gold : C.danger}
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
                <Text style={[s.rowAmount, { color: t.type === 'credit' ? C.gold : C.danger }]}>
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
  wrap: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  rowIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { color: C.textPrimary, fontWeight: '600', fontSize: 15 },
  rowSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { color: C.textPrimary, fontWeight: '700', fontSize: 16, marginTop: 8 },
  emptySub: { color: C.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});
