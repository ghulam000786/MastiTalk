import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, Platform, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

type Status = 'pending' | 'approved' | 'paid' | 'rejected' | 'all';

type Payout = {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  credits: number;
  inr_amount: number;
  method: 'upi' | 'bank';
  details?: any;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_note?: string;
  transaction_ref?: string;
};

type Stats = {
  payouts_by_status: Record<string, { count: number; credits: number; inr: number }>;
  users: { total: number; girls: number; boys: number };
};

const STATUS_FILTERS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Status>('pending');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionPayout, setActionPayout] = useState<Payout | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'mark-paid' | null>(null);
  const [note, setNote] = useState('');
  const [txRef, setTxRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pr, st] = await Promise.all([
        api('/admin/payouts?status=${filter}'),
        ('/admin/stats'),
      ]);
      setPayouts(pr.payouts || []);
      setStats(st);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // ===== YAHAN SE CHANGE HAI =====
  console.log("ADMIN CHECK:", user);

  if (!user?.isAdmin &&!user?.is_admin && user?.role!== 'ADMIN') {
    return (
      <SafeAreaView style={s.wrap} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Admin Panel</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="lock-closed" size={48} color={C.textMuted} />
          <Text style={{ marginTop: 12, color: C.textSecondary, textAlign: 'center' }}>
            Admin access required.
          </Text>
          <Text style={{ marginTop: 8, color: 'red', fontSize: 11, textAlign: 'center' }}>
            Email: {user?.email || 'null'}{'\n'}
            isAdmin: {String(user?.isAdmin)} | is_admin: {String(user?.is_admin)} | role: {user?.role || 'null'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  // ===== YAHAN TAK CHANGE HAI =====

  const openAction = (p: Payout, type: 'approve' | 'reject' | 'mark-paid') => {
    setActionPayout(p); setActionType(type); setNote(''); setTxRef('');
  };
  const closeAction = () => { setActionPayout(null); setActionType(null); };

  const submitAction = async () => {
    if (!actionPayout ||!actionType) return;
    setSubmitting(true);
    try {
      const path = '/admin/payouts/${actionPayout.id}/${actionType}';
      await api(path, {
        method: 'POST',
        body: JSON.stringify({ note, transaction_ref: txRef }),
      });
      const verb = actionType === 'approve'? 'approved' : actionType === 'reject'? 'rejected' : 'marked paid';
      Alert.alert('Done', 'Payout ${verb}.');
      closeAction();
      load();
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Action failed');
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

  const copy = (text: string) => {
    if (Platform.OS === 'web' && typeof navigator!== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      Alert.alert('Copied', text);
    } else {
      Alert.alert('Value', text);
    }
  };

  const pendingCount = stats?.payouts_by_status?.pending?.count || 0;
  const totalPaidInr = stats?.payouts_by_status?.paid?.inr || 0;

  return (
  <>
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="admin-back">
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Admin Panel</Text>
        <TouchableOpacity onPress={() => router.push('/change-password')} style={s.backBtn}>
          <Ionicons name="settings" size={20} color={C.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.pink} />}
      >
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: C.pink }]}>
            <Text style={s.statLabel}>PENDING</Text>
            <Text style={s.statValue}>{pendingCount}</Text>
            <Text style={s.statSub}>requests</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.purple }]}>
            <Text style={s.statLabel}>TOTAL PAID</Text>
            <Text style={s.statValue}>₹{totalPaidInr.toFixed(0)}</Text>
            <Text style={s.statSub}>{stats?.payouts_by_status?.paid?.count || 0} payouts</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.green }]}>
            <Text style={s.statLabel}>USERS</Text>
            <Text style={s.statValue}>{stats?.users?.total?? 0}</Text>
            <Text style={s.statSub}>♀️ {stats?.users?.girls?? 0} · ♂️ {stats?.users?.boys?? 0}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}>
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, filter === f.key && s.filterChipActive]}
              onPress={() => { setLoading(true); setFilter(f.key); }}
              testID={'filter-${f.key}'}
            >
              <Text style={[s.filterText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={C.pink} size="large" />
          </View>
        ) : payouts.length === 0? (
          <View style={s.empty}>
            <Ionicons name="file-tray" size={36} color={C.textMuted} />
            <Text style={s.emptyText}>No {filter!== 'all'? filter : ''} payouts</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {payouts.map(p => (
              <View key={p.id} style={s.card} testID={'payout-${p.id}'}>
                <View style={s.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{p.user_name || '—'}</Text>
                    <Text style={s.userEmail}>{p.user_email || ''}</Text>
                  </View>
                  {statusPill(p.status)}
                </View>

                <View style={s.amountRow}>
                  <View>
                    <Text style={s.amountInr}>₹{p.inr_amount.toFixed(2)}</Text>
                    <Text style={s.amountSub}>{p.credits} credits</Text>
                  </View>
                  <View style={s.methodBadge}>
                    <Ionicons name={p.method === 'upi'? 'phone-portrait' : 'business'} size={14} color={C.purple} />
                    <Text style={s.methodText}>{p.method.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={s.details}>
                  {p.method === 'upi'? (
                    <TouchableOpacity onPress={() => copy(p.details?.upi_id || '')} style={s.detailRow}>
                      <Text style={s.detailLabel}>UPI ID</Text>
                      <Text style={s.detailValue} selectable>{p.details?.upi_id}</Text>
                      <Ionicons name="copy" size={14} color={C.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Name</Text>
                        <Text style={s.detailValue} selectable>{p.details?.account_name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => copy(p.details?.account_number || '')} style={s.detailRow}>
                        <Text style={s.detailLabel}>A/c No</Text>
                        <Text style={s.detailValue} selectable>{p.details?.account_number}</Text>
                        <Ionicons name="copy" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => copy(p.details?.ifsc || '')} style={s.detailRow}>
                        <Text style={s.detailLabel}>IFSC</Text>
                        <Text style={s.detailValue} selectable>{p.details?.ifsc}</Text>
                        <Ionicons name="copy" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Bank</Text>
                        <Text style={s.detailValue} selectable>{p.details?.bank_name}</Text>
                      </View>
                    </>
                  )}
                </View>

                <Text style={s.created}>
                  Requested {new Date(p.created_at).toLocaleString()}
                  {p.reviewed_at? ` · Reviewed ${new Date(p.reviewed_at).toLocaleString()} by ${p.reviewed_by || ''}` : ''}
                </Text>
                {p.admin_note? <Text style={s.adminNote}>Note: {p.admin_note}</Text> : null}
                {p.transaction_ref? <Text style={s.adminNote}>Txn Ref: {p.transaction_ref}</Text> : null}

                {p.status === 'pending' && (
                  <View style={s.actions}>
                    <TouchableOpacity style={[s.actBtn, { backgroundColor: '#DBEAFE' }]} onPress={() => openAction(p, 'approve')}>
                      <Ionicons name="checkmark" size={16} color="#1D4ED8" />
                      <Text style={[s.actText, { color: '#1D4ED8' }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => openAction(p, 'reject')}>
                      <Ionicons name="close" size={16} color="#B91C1C" />
                      <Text style={[s.actText, { color: '#B91C1C' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actBtn, { backgroundColor: C.pink }]} onPress={() => openAction(p, 'mark-paid')}>
                      <Ionicons name="cash" size={16} color="#fff" />
                      <Text style={[s.actText, { color: '#fff' }]}>Paid</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {p.status === 'approved' && (
                  <View style={s.actions}>
                    <TouchableOpacity style={[s.actBtn, { backgroundColor: C.pink, flex: 1 }]} onPress={() => openAction(p, 'mark-paid')}>
                      <Ionicons name="cash" size={16} color="#fff" />
                      <Text style={[s.actText, { color: '#fff' }]}>Mark as Paid</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!actionPayout} animationType="slide" transparent onRequestClose={closeAction}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {actionType === 'approve' && 'Approve Payout'}
              {actionType === 'reject' && 'Reject Payout'}
              {actionType === 'mark-paid' && 'Mark as Paid'}
            </Text>
            {actionPayout && (
              <Text style={s.modalSub}>
                ₹{actionPayout.inr_amount.toFixed(2)} · {actionPayout.user_name} · {actionPayout.method.toUpperCase()}
              </Text>
            )}
            {actionType === 'reject'? (
              <View style={s.modalNote}>
                <Ionicons name="warning" size={14} color="#B91C1C" />
                <Text style={s.modalNoteText}>Credits will be refunded to user's account.</Text>
              </View>
            ) : null}
            <Text style={s.modalLabel}>Note (optional)</Text>
            <TextInput
              style={s.modalInput}
              value={note}
              onChangeText={setNote}
              placeholder="Internal note..."
              placeholderTextColor={C.textMuted}
              multiline
            />
            {actionType === 'mark-paid' && (
              <>
                <Text style={s.modalLabel}>Transaction Reference</Text>
                <TextInput
                  style={s.modalInput}
                  value={txRef}
                  onChangeText={setTxRef}
                  placeholder="UTR / Transaction ID"
                  placeholderTextColor={C.textMuted}
                />
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={s.modalCancel} onPress={closeAction} disabled={submitting}>
                <Text style={{ color: C.textPrimary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirm, submitting && { opacity: 0.6 }]}
                onPress={submitAction}
                disabled={submitting}
              >
                {submitting? <ActivityIndicator color="#fff" /> : (
                  <Text style={{ color: '#fff', fontWeight: '800' }}>
                    {actionType === 'approve'? 'Approve' : actionType === 'reject'? 'Reject' : 'Confirm Paid'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 16 },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  statSub: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 2 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.surfaceAlt },
  filterChipActive: { backgroundColor: C.pink },
  filterText: { color: C.textPrimary, fontWeight: '700', fontSize: 12 },
  empty: { paddingVertical: 60, alignItems: 'center', gap: 8 },
  emptyText: { color: C.textMuted, fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { color: C.textPrimary, fontSize: 15, fontWeight: '800' },
  userEmail: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  amountInr: { color: C.pink, fontSize: 24, fontWeight: '900' },
  amountSub: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  methodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.purpleBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  methodText: { color: C.purple, fontSize: 11, fontWeight: '800' },
  details: { marginTop: 12, gap: 6, padding: 12, backgroundColor: C.surfaceAlt, borderRadius: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { color: C.textMuted, fontSize: 11, fontWeight: '700', width: 60 },
  detailValue: { color: C.textPrimary, fontSize: 13, fontWeight: '700', flex: 1 },
  created: { color: C.textMuted, fontSize: 10, marginTop: 8 },
  adminNote: { color: C.textSecondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 999 },
  actText: { fontSize: 12, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { color: C.textPrimary, fontSize: 20, fontWeight: '800' },
  modalSub: { color: C.textSecondary, fontSize: 13, marginTop: 4 },
  modalLabel: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 16, marginBottom: 6 },
  modalInput: { backgroundColor: C.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.textPrimary, fontSize: 14, minHeight: 48 },
  modalNote: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10, marginTop: 12 },
  modalNoteText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: C.surfaceAlt, alignItems: 'center' },
  modalConfirm: { flex: 2, paddingVertical: 14, borderRadius: 999, backgroundColor: C.pink, alignItems: 'center' },
});
