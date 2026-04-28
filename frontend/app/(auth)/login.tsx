import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Platform, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

export default function Login() {
  const { loginWithGoogleSession, login } = useAuth();
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);

  // Handle Emergent Auth callback (#session_id in URL fragment)
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (!hash.includes('session_id=')) return;
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) return;
    const sid = decodeURIComponent(m[1]);
    setLoading(true);
    (async () => {
      try {
        await loginWithGoogleSession(sid);
        // clear hash and navigate
        try { window.history.replaceState(null, '', window.location.pathname); } catch {}
        router.replace('/(tabs)/match');
      } catch (e: any) {
        Alert.alert('Sign-in failed', e.message || 'Please try again');
        setLoading(false);
      }
    })();
  }, [loginWithGoogleSession]);

  const onGoogle = () => {
    if (!agree) {
      Alert.alert('Please accept', 'Please agree to Terms of Service and Privacy Policy first');
      return;
    }
    setLoading(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = window.location.origin + '/';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }
    // On native: open in external browser. After user signs in, they'll need to return.
    // For now, fall back to demo email login on native.
    setLoading(false);
    quickDemo();
  };

  const quickDemo = async () => {
    setLoading(true);
    try {
      await login('smoke@test.com', 'pass1234');
      router.replace('/(tabs)/match');
    } catch (e: any) {
      Alert.alert('Sign-in failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top', 'bottom']}>
      <View style={s.bgGlow} />
      <View style={s.content}>
        <View style={s.brand}>
          <View style={s.logoGlow} />
          <View style={s.logo} testID="brand-logo">
            <Ionicons name="flame" size={56} color="#fff" />
          </View>
        </View>

        <Text style={s.title} testID="brand-title">Coin Connect</Text>
        <Text style={s.subtitle}>Random video calls. Real connections.</Text>
      </View>

      <View style={s.bottom}>
        <TouchableOpacity
          testID="login-google-btn"
          style={s.googleBtn}
          activeOpacity={0.9}
          onPress={onGoogle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View style={s.googleIcon}>
                <Text style={{ fontWeight: '900', color: '#4285F4', fontSize: 16 }}>G</Text>
              </View>
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={quickDemo} style={s.moreBtn} testID="more-options-btn">
          <Text style={s.moreText}>More options</Text>
          <Ionicons name="chevron-down" size={16} color={C.textOnPink} />
        </TouchableOpacity>

        <View style={s.terms}>
          <TouchableOpacity onPress={() => setAgree(v => !v)} testID="agree-checkbox" style={s.checkbox}>
            <View style={[s.checkInner, agree && { backgroundColor: C.pink }]}>
              {agree ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </View>
          </TouchableOpacity>
          <Text style={s.termsText}>
            I agree to the{' '}
            <Text style={s.link} onPress={() => Linking.openURL('https://policies.google.com/terms')}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={s.link} onPress={() => Linking.openURL('https://policies.google.com/privacy')}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bgDark },
  bgGlow: {
    position: 'absolute', top: '15%', left: '50%', marginLeft: -200,
    width: 400, height: 400, borderRadius: 200, backgroundColor: C.pink, opacity: 0.18,
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 28, position: 'relative' },
  logoGlow: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.pink, opacity: 0.25, top: -20,
  },
  logo: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: C.pink, justifyContent: 'center', alignItems: 'center',
    shadowColor: C.pink, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  title: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  subtitle: { color: '#C9B6D8', fontSize: 16, textAlign: 'center' },

  bottom: { paddingHorizontal: 20, paddingBottom: 16 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
    backgroundColor: C.pink, paddingVertical: 18, borderRadius: 999,
    shadowColor: C.pink, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  googleIcon: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  moreBtn: {
    flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6,
    paddingVertical: 16, paddingHorizontal: 20,
  },
  moreText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  terms: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginTop: 4 },
  checkbox: { padding: 2 },
  checkInner: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.pink,
    justifyContent: 'center', alignItems: 'center',
  },
  termsText: { color: '#C9B6D8', fontSize: 12, flex: 1, lineHeight: 18 },
  link: { color: '#fff', textDecorationLine: 'underline', fontWeight: '600' },
});
