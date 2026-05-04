import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { C } from '../src/theme';

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState<'gender' | 'age'>('gender');
  const [gender, setGender] = useState<'boy' | 'girl' | null>(null);
  const [age, setAge] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const next = () => {
    if (!gender) { setError('Please select Boy or Girl'); return; }
    setError('');
    setStep('age');
  };

  const submit = async () => {
    setError('');
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum)) { setError('Please enter your age'); return; }
    if (ageNum < 18) { setError('You must be at least 18 years old to use Coin Connect'); return; }
    if (ageNum > 120) { setError('Please enter a valid age'); return; }
    if (!gender) { setStep('gender'); return; }
    setSubmitting(true);
    try {
      await api('/users/onboarding', {
        method: 'POST',
        body: JSON.stringify({ gender, age: ageNum }),
      });
      await refresh();
      router.replace('/(tabs)/match');
    } catch (e: any) {
      setError(e.message || 'Could not save');
    } finally { setSubmitting(false); }
  };

  return (
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={s.bgGlow} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled">
          {/* Stepper */}
          <View style={s.stepper}>
            <View style={[s.dot, step === 'gender' || step === 'age' ? s.dotActive : null]} />
            <View style={[s.line, step === 'age' ? s.lineActive : null]} />
            <View style={[s.dot, step === 'age' ? s.dotActive : null]} />
          </View>

          {/* Welcome */}
          <View style={s.head}>
            <View style={s.logoSm}>
              <Ionicons name="flame" size={36} color="#fff" />
            </View>
            <Text style={s.welcome}>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</Text>
            <Text style={s.subline}>Just two quick questions before we connect you.</Text>
          </View>

          {step === 'gender' ? (
            <View style={s.card}>
              <Text style={s.qTitle}>I am a…</Text>
              <Text style={s.qSub}>This helps us match you better.</Text>

              <View style={s.genderCols}>
                <TouchableOpacity
                  testID="ob-gender-boy"
                  style={[s.gCard, gender === 'boy' && s.gCardActive]}
                  onPress={() => setGender('boy')}
                  activeOpacity={0.85}
                >
                  <View style={[s.gIcon, gender === 'boy' && { backgroundColor: '#fff' }]}>
                    <Ionicons name="male" size={32} color={gender === 'boy' ? C.pink : '#fff'} />
                  </View>
                  <Text style={[s.gLabel, gender === 'boy' && { color: '#fff' }]}>Boy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="ob-gender-girl"
                  style={[s.gCard, gender === 'girl' && s.gCardActive]}
                  onPress={() => setGender('girl')}
                  activeOpacity={0.85}
                >
                  <View style={[s.gIcon, gender === 'girl' && { backgroundColor: '#fff' }]}>
                    <Ionicons name="female" size={32} color={gender === 'girl' ? C.pink : '#fff'} />
                  </View>
                  <Text style={[s.gLabel, gender === 'girl' && { color: '#fff' }]}>Girl</Text>
                </TouchableOpacity>
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <TouchableOpacity
                testID="ob-next-btn"
                style={[s.btn, !gender && { opacity: 0.5 }]}
                onPress={next}
                disabled={!gender}
              >
                <Text style={s.btnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.qTitle}>How old are you?</Text>
              <Text style={s.qSub}>You must be 18 or older to use Coin Connect.</Text>

              <TextInput
                testID="ob-age-input"
                value={age}
                onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
                style={s.ageInput}
                placeholder="18"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="number-pad"
                maxLength={3}
                autoFocus
              />

              {error ? <Text style={s.error}>{error}</Text> : null}

              <View style={s.btnRow}>
                <TouchableOpacity
                  style={s.btnGhost}
                  onPress={() => { setStep('gender'); setError(''); }}
                  testID="ob-back-btn"
                >
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                  <Text style={s.btnGhostText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="ob-submit-btn"
                  style={[s.btn, { flex: 1 }, submitting && { opacity: 0.6 }]}
                  onPress={submit}
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="#fff" />
                    : (
                      <>
                        <Text style={s.btnText}>Start matching</Text>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      </>
                    )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={s.disclaimer}>
            By continuing you agree to our Terms of Service and Privacy Policy.
            We use this info only to improve your match quality.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bgDark },
  bgGlow: { position: 'absolute', top: '15%', left: '50%', marginLeft: -200, width: 400, height: 400, borderRadius: 200, backgroundColor: C.pink, opacity: 0.18 },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, marginBottom: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActive: { backgroundColor: C.pink },
  line: { width: 60, height: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  lineActive: { backgroundColor: C.pink },

  head: { alignItems: 'center', marginBottom: 24 },
  logoSm: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.pink,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: C.pink, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  welcome: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subline: { color: '#C9B6D8', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 8,
  },
  qTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  qSub: { color: '#C9B6D8', fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 24 },

  genderCols: { flexDirection: 'row', gap: 12 },
  gCard: {
    flex: 1, alignItems: 'center', paddingVertical: 28, borderRadius: 18,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  gCardActive: {
    borderColor: C.pink, backgroundColor: C.pink,
    shadowColor: C.pink, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  gIcon: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,45,123,0.2)', marginBottom: 12,
  },
  gLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },

  ageInput: {
    color: '#fff', fontSize: 56, fontWeight: '900', textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingVertical: 24,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.pink, paddingVertical: 16, borderRadius: 999, marginTop: 24,
    shadowColor: C.pink, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'stretch' },
  btnGhost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 16, paddingHorizontal: 18, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 24,
  },
  btnGhostText: { color: '#fff', fontWeight: '600' },
  error: { color: '#FCA5A5', fontSize: 13, textAlign: 'center', marginTop: 12 },
  disclaimer: { color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 24, paddingHorizontal: 12 },
});
