import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '../src/api';
import { C } from '../src/theme';

const REASONS = [
  'Nudity / sexual content',
  'Abusive or harassing behaviour',
  'Spam / scam',
  'Hate speech',
  'Underage user',
  'Impersonation',
  'Violence or dangerous content',
  'Other',
];

export default function Report() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!selected) { Alert.alert('Pick a reason', 'Please select at least one reason.'); return; }
    setSubmitting(true);
    try {
      await api('/report', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reason: selected, context }),
      });
      const msg = 'Thank you. Our team will review this report within 24 hours.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg); router.back();
      } else {
        Alert.alert('Report sent', msg, [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (e: any) {
      Alert.alert('Could not submit', e.message);
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="report-back-btn">
          <Ionicons name="close" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Report{name ? ` ${name}` : ''}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.intro}>Your report is confidential. We review every report within 24 hours.</Text>

        <Text style={s.sectionLabel}>WHY ARE YOU REPORTING?</Text>
        <View style={{ gap: 8 }}>
          {REASONS.map(r => (
            <TouchableOpacity
              key={r} testID={`reason-${r}`}
              style={[s.reason, selected === r && s.reasonActive]}
              onPress={() => setSelected(r)}
            >
              <View style={[s.radio, selected === r && { borderColor: C.pink, backgroundColor: C.pink }]}>
                {selected === r ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
              </View>
              <Text style={[s.reasonText, selected === r && { color: C.pink, fontWeight: '700' }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>ADDITIONAL DETAILS (OPTIONAL)</Text>
        <TextInput
          testID="report-context-input"
          value={context} onChangeText={setContext}
          style={s.textarea} placeholder="Share any context that might help our team…"
          placeholderTextColor={C.textMuted} multiline numberOfLines={4}
        />

        <TouchableOpacity
          testID="report-submit-btn"
          style={[s.submit, (!selected || submitting) && { opacity: 0.5 }]}
          onPress={submit} disabled={!selected || submitting}
        >
          <Text style={s.submitText}>{submitting ? 'Submitting…' : 'Submit report'}</Text>
        </TouchableOpacity>
        <Text style={s.small}>Submitting a false report may lead to account action against you.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  title: { color: C.textPrimary, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  intro: { color: C.textSecondary, fontSize: 13, lineHeight: 19 },
  sectionLabel: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 24, marginBottom: 10 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  reasonActive: { borderColor: C.pink, backgroundColor: C.pinkBg },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  reasonText: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  textarea: { backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 14, color: C.textPrimary, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  submit: { backgroundColor: C.pink, borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  small: { color: C.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
