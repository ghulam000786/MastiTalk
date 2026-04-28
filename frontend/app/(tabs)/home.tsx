import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

export default function Home() {
  const { user, refresh } = useAuth();
  const [channel, setChannel] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const startCall = () => {
    const ch = channel.trim();
    if (!ch) { Alert.alert('Channel required', 'Enter a channel name to call'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(ch)) {
      Alert.alert('Invalid channel', 'Use only letters, numbers, dash or underscore'); return;
    }
    if ((user?.coins ?? 0) < 10) {
      Alert.alert('Low balance', 'You need at least 10 coins to start a call. Buy a coin pack from the Store.');
      return;
    }
    router.push({ pathname: '/call/[channel]', params: { channel: ch } });
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />}
        >
          <View style={s.header}>
            <View>
              <Text style={s.hi}>Hello,</Text>
              <Text style={s.name} testID="home-user-name">{user?.name || 'Friend'}</Text>
            </View>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          </View>

          {/* Balance card */}
          <View style={s.balanceCard} testID="balance-card">
            <View style={s.balanceGlow} />
            <Text style={s.balanceLabel}>Your balance</Text>
            <View style={s.balanceRow}>
              <Ionicons name="diamond" size={28} color={C.gold} />
              <Text style={s.balanceValue} testID="coin-balance-text">{user?.coins ?? 0}</Text>
              <Text style={s.balanceUnit}>coins</Text>
            </View>
            <View style={s.balanceActions}>
              <TouchableOpacity
                testID="buy-coins-btn"
                style={s.primaryBtn}
                onPress={() => router.push('/(tabs)/store')}
              >
                <Ionicons name="add-circle" size={18} color="#000" />
                <Text style={s.primaryBtnText}>Buy coins</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="history-btn"
                style={s.ghostBtn}
                onPress={() => router.push('/(tabs)/history')}
              >
                <Ionicons name="receipt-outline" size={18} color={C.textPrimary} />
                <Text style={s.ghostBtnText}>History</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Start call */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Start a video call</Text>
            <Text style={s.sectionSub}>Enter any channel name. Share it with your friend to connect.</Text>

            <View style={s.inputWrap}>
              <Ionicons name="radio-outline" size={18} color={C.textMuted} />
              <TextInput
                testID="channel-input"
                style={s.input}
                placeholder="e.g. team-standup"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                value={channel}
                onChangeText={setChannel}
              />
            </View>

            <TouchableOpacity testID="start-call-btn" style={s.callBtn} onPress={startCall}>
              <Ionicons name="videocam" size={20} color="#000" />
              <Text style={s.callBtnText}>Start call · 10 coins/min</Text>
            </TouchableOpacity>
          </View>

          {/* Info tiles */}
          <View style={s.tileRow}>
            <View style={s.tile}>
              <Ionicons name="shield-checkmark" size={20} color={C.gold} />
              <Text style={s.tileText}>Secured by{'\n'}Agora RTC</Text>
            </View>
            <View style={s.tile}>
              <Ionicons name="lock-closed" size={20} color={C.gold} />
              <Text style={s.tileText}>Payments via{'\n'}Razorpay</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  hi: { color: C.textSecondary, fontSize: 14 },
  name: { color: C.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.surfaceHi, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.borderGlass },
  avatarText: { color: C.gold, fontSize: 18, fontWeight: '700' },

  balanceCard: {
    marginHorizontal: 20, padding: 24, borderRadius: 28,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderGlass,
    overflow: 'hidden', position: 'relative',
  },
  balanceGlow: {
    position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.gold, opacity: 0.08,
  },
  balanceLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 10 },
  balanceValue: { color: C.textPrimary, fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  balanceUnit: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
  balanceActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primaryBtn: {
    flex: 1, backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  primaryBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  ghostBtn: {
    flex: 1, backgroundColor: C.surfaceHi, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: C.borderGlass,
  },
  ghostBtnText: { color: C.textPrimary, fontWeight: '600', fontSize: 14 },

  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sectionSub: { color: C.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 19 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 14,
    height: 54, borderWidth: 1, borderColor: C.border, marginTop: 16,
  },
  input: { flex: 1, color: C.textPrimary, fontSize: 15 },
  callBtn: {
    backgroundColor: C.gold, borderRadius: 16, height: 54, marginTop: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  callBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },

  tileRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 24 },
  tile: {
    flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  tileText: { color: C.textSecondary, fontSize: 12, fontWeight: '500', lineHeight: 17 },
});
