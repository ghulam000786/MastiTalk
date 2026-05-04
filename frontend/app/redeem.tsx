import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { C } from '../src/theme';

type Cfg = {
  credits: number;
  credit_to_inr_rate: number;
  min_payout_credits: number;
  inr_equivalent: number;
  call_earn_per_min: number;
  gender?: string | null;
};

type Payout = {
  id: string;
  credits: number;
  inr_amount: number;
  method: 'upi' | 'bank';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  details?: any;
  created_at: string;
};

export default function Redeem() {
  const { user, refresh } = useAuth();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [history, setHistory] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [amount, setAmount] = useState<string>('');
  const [upiId, setUpiId] = useState('');
  const [accName, setAccName] = useState('');
  const [accNo, setAccNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([
        api<Cfg>('/payout/config'),
        api<{ payouts: Payout[] }>('/payout/history'),
      ]);
      setCfg(c);
      setHistory(h.payouts || []);
      if (!amount) setAmount(String(Math.max(c.min_payout_credits, c.credits)));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const inr = cfg ? Math.max(0, Number(amount || 0)) * cfg.credit_to_inr_rate : 0;

  const submit = async () => {
    if (!cfg) return;
    const n = Math.floor(Number(amount || 0));
    if (!n || n < cfg.min_payout_credits) {
      Alert.alert('Invalid', `Minimum redeem is ${cfg.min_payout_credits} credits.`);
      return;
    }
    if (n > cfg.credits) {
      Alert.alert('Not enough credits', `You have ${cfg.credits} credits.`);
      return;
    }
    const payload: any = { amount: n, method };
    if (method === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        Alert.alert('Invalid UPI', 'Enter a valid UPI like name@paytm');
        return;
      }
      payload.upi_id = upiId.trim();
    } else {
      if (!accName.trim() || accName.trim().length < 2) { Alert.alert('Invalid', 'Enter account holder name.'); return; }
      if (!/^[0-9]{6,20}$/.test(accNo.trim())) { Alert.alert('Invalid', 'Enter valid account number.'); return; }
      if (ifsc.trim().length !== 11) { Alert.alert('Invalid', 'IFSC must be 11 characters.'); return; }
      if (!bankName.trim()) { Alert.alert('Invalid', 'Enter bank name.'); return; }
      payload.account_name = accName.trim();
      payload.account_number = accNo.trim();
      payload.ifsc = ifsc.trim().toUpperCase();
      payload.bank_name = bankName.trim();
    }
    setSubmitting(true);
    try {
      await api('/payout/request', { method: 'POST', body: JSON.stringify(payload) });
      Alert.alert(
        'Request submitted 🎉',
        `₹${(n * cfg.credit_to_inr_rate).toFixed(2)} will be paid to your ${method === 'upi' ? 'UPI' : 'bank account'} within 24-72 hours after admin review.`,
      );
      setAmount('');
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusPill = (status: Payout['status']) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      pending: { bg: '#FFF3D6', fg: '#B45309', label: 'PENDING' },
      approved: { bg: '#DBEAFE', fg: '#1D4ED8', label: 'APPROVED' },
      paid: { bg: '#DCFCE7', fg: '#15803D', label: 'PAID' },
      rejected: { bg: '#FEE2E2', fg: '#B91C1C', label: 'REJECTED' },
    };
    const m = map[status] || map.pending;
    return (
      <View style={[s.pill, { backgroundColor: m.bg }]}>
        <Text style={[s.pillText, { color: m.fg }]}>{m.label}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.wrap} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.pink} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const isGirl = (user?.gender || '').toLowerCase() === 'girl';
  if (!isGirl) {
    return (
      <SafeAreaView style={s.wrap} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="redeem-back">
            <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Redeem</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="information-circle" size={48} color={C.textMuted} />
          <Text style={{ marginTop: 12, color: C.textSecondary, textAlign: 'center' }}>
            Only female users can redeem credits for cash.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="redeem-back">
            <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title} testID="redeem-title">Redeem Credits</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero balance */}
          <View style={s.hero}>
            <View style={s.heroGlow} />
            <Text style={s.heroLabel}>AVAILABLE CREDITS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <Ionicons name="diamond" size={22} color="#fff" />
              <Text style={s.heroValue} testID="redeem-credits">{cfg?.credits ?? 0}</Text>
            </View>
            <Text style={s.heroNote}>
              ≈ ₹{(cfg?.inr_equivalent ?? 0).toFixed(2)} · 100 credits = ₹{((cfg?.credit_to_inr_rate ?? 0) * 100).toFixed(0)}
            </Text>
            <Text style={s.heroSub}>You earn {cfg?.call_earn_per_min ?? 0} credits per minute of call</Text>
          </View>

          {/* Method picker */}
          <Text style={s.sectionLabel}>PAYOUT METHOD</Text>
          <View style={s.methodRow}>
            <TouchableOpacity
              style={[s.methodCard, method === 'upi' && s.methodCardActive]}
              onPress={() => setMethod('upi')}
              testID="method-upi"
            >
              <Ionicons name="phone-portrait" size={22} color={method === 'upi' ? C.pink : C.textSecondary} />
              <Text style={[s.methodText, method === 'upi' && { color: C.pink }]}>UPI</Text>
              <Text style={s.methodSub}>Instant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.methodCard, method === 'bank' && s.methodCardActive]}
              onPress={() => setMethod('bank')}
              testID="method-bank"
            >
              <Ionicons name="business" size={22} color={method === 'bank' ? C.pink : C.textSecondary} />
              <Text style={[s.methodText, method === 'bank' && { color: C.pink }]}>Bank</Text>
              <Text style={s.methodSub}>1-2 days</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <Text style={s.sectionLabel}>AMOUNT (CREDITS)</Text>
          <View style={s.input}>
            <Ionicons name="diamond" size={18} color={C.purple} />
            <TextInput
              style={s.inputText}
              value={amount}
              onChangeText={t => setAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder={`Min ${cfg?.min_payout_credits ?? 100}`}
              placeholderTextColor={C.textMuted}
              testID="redeem-amount"
            />
            <Text style={s.inputHint}>= ₹{inr.toFixed(2)}</Text>
          </View>
          <Text style={s.helper}>
            Minimum {cfg?.min_payout_credits ?? 100} credits · Available {cfg?.credits ?? 0}
          </Text>

          {/* Quick amount chips */}
          <View style={s.chipsRow}>
            {[100, 250, 500, 1000].map(v => (
              <TouchableOpacity
                key={v}
                style={s.chip}
                onPress={() => setAmount(String(Math.min(v, cfg?.credits ?? v)))}
                testID={`chip-${v}`}
              >
                <Text style={s.chipText}>{v}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.chip}
              onPress={() => setAmount(String(cfg?.credits ?? 0))}
              testID="chip-max"
            >
              <Text style={s.chipText}>MAX</Text>
            </TouchableOpacity>
          </View>

          {/* Details */}
          {method === 'upi' ? (
            <>
              <Text style={s.sectionLabel}>UPI ID</Text>
              <View style={s.input}>
                <Ionicons name="at" size={18} color={C.textSecondary} />
                <TextInput
                  style={s.inputText}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="yourname@paytm"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                  testID="redeem-upi"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={s.sectionLabel}>BANK DETAILS</Text>
              <View style={s.input}>
                <Ionicons name="person" size={18} color={C.textSecondary} />
                <TextInput
                  style={s.inputText}
                  value={accName}
                  onChangeText={setAccName}
                  placeholder="Account holder name"
                  placeholderTextColor={C.textMuted}
                  testID="redeem-acc-name"
                />
              </View>
              <View style={s.input}>
                <Ionicons name="card" size={18} color={C.textSecondary} />
                <TextInput
                  style={s.inputText}
                  value={accNo}
                  onChangeText={t => setAccNo(t.replace(/[^0-9]/g, ''))}
                  placeholder="Account number"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  testID="redeem-acc-no"
                />
              </View>
              <View style={s.input}>
                <Ionicons name="barcode" size={18} color={C.textSecondary} />
                <TextInput
                  style={s.inputText}
                  value={ifsc}
                  onChangeText={t => setIfsc(t.toUpperCase())}
                  placeholder="IFSC (e.g. HDFC0001234)"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="characters"
                  maxLength={11}
                  testID="redeem-ifsc"
                />
              </View>
              <View style={s.input}>
                <Ionicons name="business" size={18} color={C.textSecondary} />
                <TextInput
                  style={s.inputText}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Bank name"
                  placeholderTextColor={C.textMuted}
                  testID="redeem-bank-name"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
            testID="redeem-submit"
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={s.submitText}>Request Payout</Text>
                </>
            }
          </TouchableOpacity>

          <View style={s.note}>
            <Ionicons name="information-circle" size={16} color={C.purple} />
            <Text style={s.noteText}>
              Payouts are reviewed by admin and processed within 24-72 hours. Credits will be deducted immediately on request.
            </Text>
          </View>

          {/* History */}
          <Text style={s.sectionLabel}>PAYOUT HISTORY</Text>
          {history.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>No payouts yet.</Text>
            </View>
          ) : history.map(p => (
            <View key={p.id} style={s.histRow} testID={`hist-${p.id}`}>
              <View style={[s.histIcon, { backgroundColor: C.purpleBg }]}>
                <Ionicons name={p.method === 'upi' ? 'phone-portrait' : 'business'} size={18} color={C.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.histTitle}>₹{p.inr_amount.toFixed(2)} · {p.credits} credits</Text>
                <Text style={s.histSub}>
                  {p.method === 'upi' ? p.details?.upi_id : `${p.details?.bank_name || 'Bank'} ··${(p.details?.account_number || '').slice(-4)}`}
                </Text>
                <Text style={s.histDate}>{new Date(p.created_at).toLocaleString()}</Text>
              </View>
              {statusPill(p.status)}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
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
  heroValue: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  heroNote: { color: '#fff', fontSize: 13, marginTop: 8, fontWeight: '600' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },

  sectionLabel: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: 22, marginBottom: 10 },

  methodRow: { flexDirection: 'row', gap: 10 },
  methodCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center', gap: 4,
  },
  methodCardActive: { borderColor: C.pink, backgroundColor: C.pinkBg },
  methodText: { color: C.textPrimary, fontWeight: '800', fontSize: 15 },
  methodSub: { color: C.textMuted, fontSize: 10 },

  input: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surfaceAlt, borderRadius: 14, paddingHorizontal: 14,
    height: 52, marginBottom: 10,
  },
  inputText: { flex: 1, color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  inputHint: { color: C.textMuted, fontSize: 12, fontWeight: '700' },
  helper: { color: C.textMuted, fontSize: 11, marginTop: -4, marginBottom: 4 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.pinkBg },
  chipText: { color: C.pink, fontWeight: '800', fontSize: 12 },

  submitBtn: {
    marginTop: 20, paddingVertical: 16, borderRadius: 999,
    backgroundColor: C.pink, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: C.pink, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.purpleBg, padding: 14, borderRadius: 14, marginTop: 16 },
  noteText: { color: C.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 },

  emptyBox: { padding: 20, backgroundColor: C.surfaceAlt, borderRadius: 14, alignItems: 'center' },
  histRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  histIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  histTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '800' },
  histSub: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  histDate: { color: C.textMuted, fontSize: 10, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
