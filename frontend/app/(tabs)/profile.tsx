import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

export default function Profile() {
  const { user, logout } = useAuth();
  const [beauty, setBeauty] = React.useState(false);
  const isGirl = (user?.gender || '').toLowerCase() === 'girl';
  const isAdmin = !!user?.is_admin;

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      // simple confirm on web
      if (typeof window !== 'undefined' && window.confirm('Sign out?')) {
        logout().then(() => router.replace('/(auth)/login'));
      }
      return;
    }
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await logout(); router.replace('/(auth)/login');
      }},
    ]);
  };

  const initial = (user?.name || 'U').charAt(0).toUpperCase();
  const avatar = user?.picture
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=FF2D7B&color=fff&size=200`;

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.pageTitle} testID="profile-title">Profile</Text>

        {/* Pink gradient hero card */}
        <View style={s.hero} testID="profile-hero">
          <View style={s.heroGlow} />
          <Image source={{ uri: avatar }} style={s.heroAvatar} testID="profile-avatar" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.heroName} numberOfLines={1} testID="profile-name">{user?.name || 'User'}</Text>
            <Text style={s.heroEmail} numberOfLines={1} testID="profile-email">{user?.email}</Text>
            <View style={s.genderPill}>
              <Ionicons name={isGirl ? 'female' : 'male'} size={11} color="#fff" />
              <Text style={s.genderText}>{isGirl ? 'GIRL' : 'BOY'}</Text>
            </View>
          </View>
        </View>

        {/* Stat tiles */}
        <View style={s.stats}>
          {isGirl ? (
            <View style={s.stat} testID="stat-credits">
              <View style={[s.statIcon, { backgroundColor: C.purpleBg }]}>
                <Ionicons name="diamond" size={16} color={C.purple} />
              </View>
              <Text style={s.statValue}>{user?.credits ?? 0}</Text>
              <Text style={s.statLabel}>Credits</Text>
            </View>
          ) : (
            <View style={s.stat} testID="stat-coins">
              <View style={[s.statIcon, { backgroundColor: C.yellowBg }]}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: C.yellow }}>₿</Text>
              </View>
              <Text style={s.statValue} testID="profile-coins">{user?.coins ?? 0}</Text>
              <Text style={s.statLabel}>Coins</Text>
            </View>
          )}
          {isGirl ? (
            <View style={s.stat} testID="stat-earnings">
              <View style={[s.statIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="cash" size={16} color={C.green} />
              </View>
              <Text style={s.statValue}>₹{(((user?.credits ?? 0) * 0.40)).toFixed(0)}</Text>
              <Text style={s.statLabel}>Earnings</Text>
            </View>
          ) : (
            <View style={s.stat} testID="stat-credits">
              <View style={[s.statIcon, { backgroundColor: C.purpleBg }]}>
                <Ionicons name="diamond" size={16} color={C.purple} />
              </View>
              <Text style={s.statValue}>{user?.credits ?? 0}</Text>
              <Text style={s.statLabel}>Credits</Text>
            </View>
          )}
          <TouchableOpacity style={s.stat} onPress={() => router.push('/history')} testID="stat-history">
            <View style={[s.statIcon, { backgroundColor: C.pinkBg }]}>
              <Ionicons name="time" size={16} color={C.pink} />
            </View>
            <Text style={s.statValue}>—</Text>
            <Text style={s.statLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* CTA: Redeem for girls, Get VIP for boys */}
        {isGirl ? (
          <TouchableOpacity style={s.vip} testID="redeem-btn" onPress={() => router.push('/redeem')}>
            <Ionicons name="cash" size={20} color="#fff" />
            <Text style={s.vipText}>Redeem to UPI / Bank</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.vip} testID="vip-btn" onPress={() => router.push('/store')}>
            <Ionicons name="flash" size={20} color="#fff" />
            <Text style={s.vipText}>Get Coins</Text>
          </TouchableOpacity>
        )}

        {/* Preferences */}
        <Text style={s.sectionLabel}>PREFERENCES</Text>
        <TouchableOpacity style={s.row} testID="row-language">
          <View style={[s.rowIcon, { backgroundColor: C.blueBg }]}>
            <Ionicons name="globe" size={18} color={C.blue} />
          </View>
          <Text style={s.rowText}>App language</Text>
          <Text style={s.rowVal}>English</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>
        <View style={s.row} testID="row-beauty">
          <View style={[s.rowIcon, { backgroundColor: C.pinkBg }]}>
            <Ionicons name="sparkles" size={18} color={C.pink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowText}>Camera beauty</Text>
            <Text style={s.rowSub}>Smooth skin & soft glow during calls</Text>
          </View>
          <Switch
            value={beauty}
            onValueChange={setBeauty}
            trackColor={{ false: '#E5E5EA', true: C.pinkSoft }}
            thumbColor={beauty ? C.pink : '#fff'}
          />
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <TouchableOpacity style={s.row} testID="row-change-password" onPress={() => router.push('/change-password')}>
          <View style={[s.rowIcon, { backgroundColor: C.blueBg }]}>
            <Ionicons name="key" size={18} color={C.blue} />
          </View>
          <Text style={s.rowText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>
        {isAdmin ? (
          <TouchableOpacity style={[s.row, { borderColor: C.pink, backgroundColor: C.pinkBg }]} testID="row-admin" onPress={() => router.push('/admin')}>
            <View style={[s.rowIcon, { backgroundColor: C.pink }]}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowText, { color: C.pink }]}>Admin Panel</Text>
              <Text style={s.rowSub}>Manage payouts & users</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.pink} />
          </TouchableOpacity>
        ) : null}

        {/* About */}
        <Text style={s.sectionLabel}>ABOUT</Text>
        <TouchableOpacity style={s.row} testID="row-privacy" onPress={() => router.push('/privacy')}>
          <View style={[s.rowIcon, { backgroundColor: C.purpleBg }]}>
            <Ionicons name="lock-closed" size={18} color={C.purple} />
          </View>
          <Text style={s.rowText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.row} testID="row-terms" onPress={() => router.push('/terms')}>
          <View style={[s.rowIcon, { backgroundColor: C.yellowBg }]}>
            <Ionicons name="document-text" size={18} color={C.yellow} />
          </View>
          <Text style={s.rowText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.row} testID="row-blocked" onPress={() => router.push('/blocked')}>
          <View style={[s.rowIcon, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="ban" size={18} color={C.green} />
          </View>
          <Text style={s.rowText}>Blocked users</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[s.row, { borderColor: 'rgba(239,68,68,0.2)', marginTop: 16 }]} onPress={confirmLogout} testID="logout-btn">
          <View style={[s.rowIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="log-out" size={18} color={C.danger} />
          </View>
          <Text style={[s.rowText, { color: C.danger }]}>Sign out</Text>
        </TouchableOpacity>

        <Text style={s.footer}>Coin Connect · v1.0.0{'\n'}Powered by Agora & Razorpay</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  pageTitle: { color: C.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },

  hero: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, padding: 16, borderRadius: 24,
    backgroundColor: C.pink, position: 'relative', overflow: 'hidden',
    shadowColor: C.pink, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroGlow: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff', opacity: 0.12 },
  heroAvatar: { width: 70, height: 70, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  heroName: { color: '#fff', fontSize: 19, fontWeight: '800' },
  heroEmail: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  genderPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, alignSelf: 'flex-start', marginTop: 8,
  },
  genderText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.border, alignItems: 'flex-start' },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { color: C.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600' },

  vip: {
    marginHorizontal: 16, marginTop: 16, paddingVertical: 16, borderRadius: 999,
    backgroundColor: C.pink, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: C.pink, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  vipText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  sectionLabel: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 24, marginTop: 24, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 8, paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.border,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowText: { color: C.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  rowSub: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  rowVal: { color: C.textMuted, fontSize: 13, marginRight: 4 },

  footer: { color: C.textMuted, fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
