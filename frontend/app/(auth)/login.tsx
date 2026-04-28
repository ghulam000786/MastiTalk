import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.wrap}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <View style={s.logo} testID="brand-logo">
            <Ionicons name="diamond" size={28} color={C.gold} />
          </View>
          <Text style={s.brandText}>Coin Connect</Text>
          <Text style={s.brandSub}>Premium video calls, pay as you go</Text>
        </View>

        <View style={s.card}>
          <Text style={s.h1}>Welcome back</Text>
          <Text style={s.sub}>Sign in to continue your conversations</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            testID="login-email-input"
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            testID="login-password-input"
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={s.error} testID="login-error">{error}</Text> : null}

          <TouchableOpacity
            testID="login-submit-btn"
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>Sign in</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>New to Coin Connect?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity testID="go-register-btn">
                <Text style={s.link}>Create account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.borderGlass,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  brandText: { color: C.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  brandSub: { color: C.textSecondary, marginTop: 4, fontSize: 14 },
  card: {
    backgroundColor: C.surface, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: C.border,
  },
  h1: { color: C.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  sub: { color: C.textSecondary, fontSize: 14, marginBottom: 24 },
  label: { color: C.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 16,
    height: 54, color: C.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: C.border,
  },
  btn: {
    backgroundColor: C.gold, borderRadius: 16, height: 54,
    justifyContent: 'center', alignItems: 'center', marginTop: 24,
  },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  footerText: { color: C.textSecondary, fontSize: 14 },
  link: { color: C.gold, fontSize: 14, fontWeight: '700' },
  error: { color: C.danger, fontSize: 13, marginTop: 12 },
});
