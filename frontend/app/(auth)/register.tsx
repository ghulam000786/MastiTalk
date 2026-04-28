import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    if (!name || !email || !password) { setError('All fields required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
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
          <View style={s.logo}>
            <Ionicons name="diamond" size={28} color={C.gold} />
          </View>
          <Text style={s.brandText}>Create account</Text>
          <Text style={s.brandSub}>Get 50 free coins on signup</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Full name</Text>
          <TextInput
            testID="register-name-input"
            style={s.input} placeholder="Jane Doe" placeholderTextColor={C.textMuted}
            value={name} onChangeText={setName}
          />
          <Text style={s.label}>Email</Text>
          <TextInput
            testID="register-email-input"
            style={s.input} placeholder="you@example.com" placeholderTextColor={C.textMuted}
            autoCapitalize="none" keyboardType="email-address"
            value={email} onChangeText={setEmail}
          />
          <Text style={s.label}>Password</Text>
          <TextInput
            testID="register-password-input"
            style={s.input} placeholder="At least 6 characters" placeholderTextColor={C.textMuted}
            secureTextEntry value={password} onChangeText={setPassword}
          />

          {error ? <Text style={s.error} testID="register-error">{error}</Text> : null}

          <TouchableOpacity
            testID="register-submit-btn"
            style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={s.btnText}>Create account</Text>}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity testID="go-login-btn">
                <Text style={s.link}>Sign in</Text>
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
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.borderGlass,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  brandText: { color: C.textPrimary, fontSize: 26, fontWeight: '700' },
  brandSub: { color: C.gold, marginTop: 4, fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: C.surface, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: C.border,
  },
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
