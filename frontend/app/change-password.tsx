import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../src/api';
import { C } from '../src/theme';

export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next1, setNext1] = useState('');
  const [next2, setNext2] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!next1 || next1.length < 6) { Alert.alert('Invalid', 'New password must be at least 6 characters.'); return; }
    if (next1 !== next2) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await api('/account/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: current, new_password: next1 }),
      });
      Alert.alert('Success', 'Password updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Change Password</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={s.note}>
            <Ionicons name="information-circle" size={16} color={C.purple} />
            <Text style={s.noteText}>
              Leave 'Current password' blank if you signed in with Google and never set a password.
            </Text>
          </View>

          <Text style={s.label}>CURRENT PASSWORD</Text>
          <View style={s.input}>
            <Ionicons name="lock-closed" size={18} color={C.textSecondary} />
            <TextInput
              style={s.text}
              value={current}
              onChangeText={setCurrent}
              placeholder="Current password (if any)"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!show}
              autoCapitalize="none"
              testID="cp-current"
            />
          </View>

          <Text style={s.label}>NEW PASSWORD</Text>
          <View style={s.input}>
            <Ionicons name="key" size={18} color={C.textSecondary} />
            <TextInput
              style={s.text}
              value={next1}
              onChangeText={setNext1}
              placeholder="New password (min 6 chars)"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!show}
              autoCapitalize="none"
              testID="cp-new1"
            />
          </View>
          <View style={s.input}>
            <Ionicons name="key" size={18} color={C.textSecondary} />
            <TextInput
              style={s.text}
              value={next2}
              onChangeText={setNext2}
              placeholder="Confirm new password"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!show}
              autoCapitalize="none"
              testID="cp-new2"
            />
          </View>

          <TouchableOpacity onPress={() => setShow(v => !v)} style={s.showRow}>
            <Ionicons name={show ? 'eye-off' : 'eye'} size={16} color={C.textSecondary} />
            <Text style={s.showText}>{show ? 'Hide passwords' : 'Show passwords'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, submitting && { opacity: 0.6 }]}
            onPress={submit}
            disabled={submitting}
            testID="cp-submit"
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Update Password</Text>}
          </TouchableOpacity>
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
  label: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceAlt, borderRadius: 14, paddingHorizontal: 14, height: 52, marginBottom: 8 },
  text: { flex: 1, color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  showText: { color: C.textSecondary, fontSize: 12 },
  btn: { marginTop: 24, paddingVertical: 16, borderRadius: 999, backgroundColor: C.pink, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.purpleBg, padding: 14, borderRadius: 14 },
  noteText: { color: C.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 },
});
