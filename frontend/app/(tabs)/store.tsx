import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

type Pack = { id: string; coins: number; price_inr: number; label: string; badge?: string };

export default function Store() {
  const { user } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ packs: Pack[] }>('/packs');
        setPacks(r.packs);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  const buy = async (pack: Pack) => {
    setBuying(pack.id);
    try {
      router.push({ pathname: '/checkout', params: { packId: pack.id } });
    } finally {
      setBuying(null);
    }
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Coin Store</Text>
        <View style={s.balancePill}>
          <Ionicons name="diamond" size={14} color={C.gold} />
          <Text style={s.balancePillText} testID="store-balance-text">{user?.coins ?? 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}>
        <Text style={s.sub}>Pick a pack that suits you. Pay securely via Razorpay.</Text>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={C.gold} />
          </View>
        ) : (
          <View style={{ gap: 14, marginTop: 16 }}>
            {packs.map(p => (
              <TouchableOpacity
                key={p.id}
                testID={`pack-${p.id}`}
                activeOpacity={0.85}
                style={[s.pack, p.badge ? s.packHighlight : null]}
                onPress={() => buy(p)}
                disabled={buying === p.id}
              >
                <View style={s.packIcon}>
                  <Ionicons name="diamond" size={26} color={C.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.packLabel}>{p.label}</Text>
                    {p.badge ? (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{p.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={s.packCoins}>{p.coins.toLocaleString()} coins</Text>
                  <Text style={s.packMins}>{Math.floor(p.coins / 10)} mins of calls</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.price}>₹{p.price_inr}</Text>
                  <View style={s.buyPill}>
                    {buying === p.id ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={s.buyPillText}>Buy</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.note} testID="razorpay-note">
          <Ionicons name="shield-checkmark" size={16} color={C.gold} />
          <Text style={s.noteText}>
            Secured by Razorpay. Use test card 4111 1111 1111 1111, any CVV, any future date.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: C.borderGlass,
  },
  balancePillText: { color: C.textPrimary, fontWeight: '700' },
  sub: { color: C.textSecondary, fontSize: 13, lineHeight: 19 },

  pack: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  packHighlight: { borderColor: C.gold, borderWidth: 1.5 },
  packIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: C.surfaceHi,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.borderGlass,
  },
  packLabel: { color: C.textPrimary, fontWeight: '700', fontSize: 16 },
  packCoins: { color: C.gold, fontSize: 14, fontWeight: '700', marginTop: 2 },
  packMins: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  price: { color: C.textPrimary, fontSize: 18, fontWeight: '800' },
  buyPill: {
    backgroundColor: C.gold, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, marginTop: 6, minWidth: 52, alignItems: 'center',
  },
  buyPillText: { color: '#000', fontWeight: '700', fontSize: 12 },
  badge: { backgroundColor: C.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#000', fontSize: 10, fontWeight: '700' },

  note: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: C.surface, padding: 14, borderRadius: 14,
    marginTop: 20, borderWidth: 1, borderColor: C.border,
  },
  noteText: { color: C.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 },
});
