import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Platform, Linking, Alert, TextInput, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

type Mode = 'closed' | 'login' | 'register';

export default function Login() {
  const { loginWithGoogleSession, login, register } = useAuth();
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('closed');

  // form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl' | null>(null);
  const [age, setAge] = useState('');
  const [error, setError] = useState('');

  // Handle Emergent Auth callback (#session_id)
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
        try { window.history.replaceState(null, '', window.location.pathname); } catch {}
        router.replace('/(tabs)/match');
      } catch (e: any) {
        Alert.alert('Sign-in failed', e.message || 'Please try again');
        setLoading(false);
      }
    })();
  }, [loginWithGoogleSession]);

  const onGoogle = () => {
    if (!agree) { Alert.alert('Please accept', 'Agree to Terms & Privacy first'); return; }
    setLoading(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = window.location.origin + '/';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }
    setLoading(false);
    setMode('login');
  };

  const submitLogin = async () => {
    setError('');
    if (!email || !password) { setError('Email and password required'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/match');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const submitRegister = async () => {
    setError('');
    if (!name || !email || !password) { setError('All fields required'); return; }
    if (password.length < 6) { setError('Password must be 6+ characters'); return; }
    if (!gender) { setError('Please select your gender (Boy or Girl)'); return; }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum)) { setError('Please enter your age'); return; }
    if (ageNum < 18) { setError('You must be at least 18 years old to use Coin Connect'); return; }
    if (ageNum > 120) { setError('Please enter a valid age'); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, gender, ageNum);
      router.replace('/(tabs)/match');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  // Sheet form
  if (mode !== 'closed') {
    const isReg = mode === 'register';
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.wrap}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={s.bgGlow} />
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => { setMode('closed'); setError(''); }} style={s.formBack} testID="form-back-btn">
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={s.formHead}>
              <View style={s.logoSm}>
                <Ionicons name="flame" size={28} color="#fff" />
              </View>
              <Text style={s.formTitle}>{isReg ? 'Create account' : 'Welcome back'}</Text>
              <Text style={s.formSub}>{isReg ? '50 free coins on signup • 18+ only' : 'Sign in to continue'}</Text>
            </View>

            <View style={s.formCard}>
              {isReg ? (
                <>
                  <Text style={s.label}>Your name</Text>
                  <TextInput
                    testID="reg-name-input"
                    style={s.input} placeholder="e.g. Aman"
                    placeholderTextColor={C.textMuted}
                    value={name} onChangeText={setName}
                  />
                </>
              ) : null}

              <Text style={s.label}>Email</Text>
              <TextInput
                testID={isReg ? 'reg-email-input' : 'login-email-input'}
                style={s.input} placeholder="you@example.com"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none" keyboardType="email-address"
                value={email} onChangeText={setEmail}
              />

              <Text style={s.label}>Password</Text>
              <TextInput
                testID={isReg ? 'reg-password-input' : 'login-password-input'}
                style={s.input} placeholder={isReg ? 'At least 6 characters' : '••••••••'}
                placeholderTextColor={C.textMuted}
                secureTextEntry value={password} onChangeText={setPassword}
              />

              {isReg ? (
                <>
                  <Text style={s.label}>Your age (must be 18 or older)</Text>
                  <TextInput
                    testID="reg-age-input"
                    style={s.input} placeholder="e.g. 21"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad" maxLength={3}
                    value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
                  />

                  <Text style={s.label}>I am a</Text>
                  <View style={s.genderRow}>
                    <TouchableOpacity
                      testID="gender-boy-btn"
                      style={[s.genderBtn, gender === 'boy' && s.genderActive]}
                      onPress={() => setGender('boy')}
                    >
                      <Ionicons name="male" size={18} color={gender === 'boy' ? '#fff' : C.pink} />
                      <Text style={[s.genderText, gender === 'boy' && { color: '#fff' }]}>Boy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="gender-girl-btn"
                      style={[s.genderBtn, gender === 'girl' && s.genderActive]}
                      onPress={() => setGender('girl')}
                    >
                      <Ionicons name="female" size={18} color={gender === 'girl' ? '#fff' : C.pink} />
                      <Text style={[s.genderText, gender === 'girl' && { color: '#fff' }]}>Girl</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}

              {error ? <Text style={s.error} testID="form-error">{error}</Text> : null}

              <TouchableOpacity
                testID={isReg ? 'reg-submit-btn' : 'login-submit-btn'}
                style={[s.submit, loading && { opacity: 0.6 }]}
                onPress={isReg ? submitRegister : submitLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitText}>{isReg ? 'Create account' : 'Sign in'}</Text>}
              </TouchableOpacity>

              <View style={s.switchRow}>
                <Text style={s.switchText}>{isReg ? 'Already have an account?' : 'New here?'}</Text>
                <TouchableOpacity
                  testID={isReg ? 'switch-to-login' : 'switch-to-register'}
                  onPress={() => { setMode(isReg ? 'login' : 'register'); setError(''); }}
                >
                  <Text style={s.switchLink}>{isReg ? 'Sign in' : 'Create account'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // Closed (welcome) view
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
          style={s.googleBtn} activeOpacity={0.9}
          onPress={onGoogle} disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <View style={s.googleIcon}>
                <Text style={{ fontWeight: '900', color: '#4285F4', fontSize: 16 }}>G</Text>
              </View>
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s.altRow}>
          <TouchableOpacity testID="open-register-btn" style={s.altBtn} onPress={() => setMode('register')}>
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={s.altText}>Sign up with email</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="open-login-btn" style={s.altBtn} onPress={() => setMode('login')}>
            <Ionicons name="log-in" size={16} color="#fff" />
            <Text style={s.altText}>Sign in</Text>
          </TouchableOpacity>
        </View>

        <View style={s.terms}>
          <TouchableOpacity onPress={() => setAgree(v => !v)} testID="agree-checkbox" style={s.checkbox}>
            <View style={[s.checkInner, agree && { backgroundColor: C.pink }]}>
              {agree ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
            </View>
          </TouchableOpacity>
          <Text style={s.termsText}>
            I agree to the{' '}
            <Text style={s.link} onPress={() => Linking.openURL('https://policies.google.com/terms')}>Terms</Text>
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
  logoGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: C.pink, opacity: 0.25, top: -20 },
  logo: {
    width: 130, height: 130, borderRadius: 65, backgroundColor: C.pink,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.pink, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 20,
  },
  title: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  subtitle: { color: '#C9B6D8', fontSize: 16, textAlign: 'center' },

  bottom: { paddingHorizontal: 20, paddingBottom: 16 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
    backgroundColor: C.pink, paddingVertical: 18, borderRadius: 999,
    shadowColor: C.pink, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  googleIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  altRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  altBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  altText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  terms: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginTop: 14 },
  checkbox: { padding: 2 },
  checkInner: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.pink, justifyContent: 'center', alignItems: 'center' },
  termsText: { color: '#C9B6D8', fontSize: 12, flex: 1, lineHeight: 18 },
  link: { color: '#fff', textDecorationLine: 'underline', fontWeight: '600' },

  // Form
  formBack: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12,
  },
  formHead: { alignItems: 'center', marginVertical: 16 },
  logoSm: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.pink,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  formTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  formSub: { color: '#C9B6D8', fontSize: 13, marginTop: 4 },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  label: { color: '#C9B6D8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14,
    height: 52, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.pink,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  genderActive: { backgroundColor: C.pink },
  genderText: { color: C.pink, fontWeight: '700' },
  error: { color: '#FCA5A5', fontSize: 13, marginTop: 12 },
  submit: {
    backgroundColor: C.pink, height: 52, borderRadius: 999,
    justifyContent: 'center', alignItems: 'center', marginTop: 22,
    shadowColor: C.pink, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  switchText: { color: '#C9B6D8', fontSize: 13 },
  switchLink: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
