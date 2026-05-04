import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { C } from '../src/theme';

type Pack = { id: string; coins: number; price_inr: number; label: string; badge?: string };

export default function Store() {
  const { user } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [paymentLink, setPaymentLink] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ packs: Pack[]; razorpay_payment_link?: string }>('/packs');
        setPacks(r.packs);
        setPaymentLink(r.razorpay_payment_link || '');
      } catch (e: any) { Alert.alert('Error', e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const buy = (p: Pack) => router.push({ pathname: '/checkout', params: { packId: p.id } });

  const openPaymentLink = async () => {
    if (!paymentLink) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(paymentLink, '_blank');
    } else {
      try { await Linking.openURL(paymentLink); } catch {}
    }
    Alert.alert(
      'Quick Pay opened',
      'Complete the payment on Razorpay. After paying, please share the Payment ID with support to credit your coins.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="store-back-btn">
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title} testID="store-title">Buy Coins</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <View style={s.hero}>
          <View style={s.heroGlow} />
          <Text style={s.heroLabel}>YOUR BALANCE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <View style={s.bigCoin}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>₿</Text></View>
            <Text style={s.heroValue} testID="store-balance">{user?.coins ?? 0}</Text>
            <Text style={s.heroUnit}>coins</Text>
          </View>
          <Text style={s.heroNote}>Each minute of call costs 10 coins</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={C.pink} size="large" />
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: 16 }}>
            {packs.map(p => (
              <TouchableOpacity
                key={p.id} testID={`pack-${p.id}`}
                style={[s.pack, p.badge ? s.packHl : null]}
                onPress={() => buy(p)}
                activeOpacity={0.85}
              >
                <View style={s.packIcon}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>₿</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.packLabel}>{p.label}</Text>
                    {p.badge ? (
                      <View style={s.badge}><Text style={s.badgeText}>{p.badge}</Text></View>
                    ) : null}
                  </View>
                  <Text style={s.packCoins}>{p.coins.toLocaleString()} coins</Text>
                  <Text style={s.packMins}>≈ {Math.floor(p.coins / 10)} mins of calls</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.price}>₹{p.price_inr}</Text>
                  <View style={s.buyPill}><Text style={s.buyPillText}>Buy</Text></View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.note}>
          <Ionicons name="shield-checkmark" size={16} color={C.green} />
          <Text style={s.noteText}>
            Payments are secured by Razorpay. Test card: 4111 1111 1111 1111, any CVV, future expiry.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '800' },

  hero: {
    backgroundColor: C.pink, borderRadius: 24, padding: 20, marginTop: 8,
    overflow: 'hidden', position: 'relative',
    shadowColor: C.pink, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroGlow: { position: 'absolute', right: -50, bottom: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#fff', opacity: 0.12 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  bigCoin: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center' },
  heroValue: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  heroUnit: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  heroNote: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8 },

  pack: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  packHl: { borderColor: C.pink, borderWidth: 1.5 },
  packIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center' },
  packLabel: { color: C.textPrimary, fontSize: 16, fontWeight: '800' },
  packCoins: { color: C.pink, fontSize: 14, fontWeight: '800', marginTop: 2 },
  packMins: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  price: { color: C.textPrimary, fontSize: 18, fontWeight: '800' },
  buyPill: { backgroundColor: C.pink, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginTop: 6 },
  buyPillText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  badge: { backgroundColor: C.pink, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.surfaceAlt, padding: 14, borderRadius: 14, marginTop: 18 },
  noteText: { color: C.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 },
  quickPay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 14, borderRadius: 999,
    backgroundColor: C.purple,
  },
  quickPayText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
