import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C } from '../src/theme';

export default function Privacy() {
  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="privacy-back-btn">
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.updated}>Last updated: April 2026</Text>

        <Text style={s.h2}>1. Introduction</Text>
        <Text style={s.p}>
          Coin Connect ("we", "our", "us") respects your privacy. This Privacy Policy describes how we collect, use,
          share, and protect your information when you use our mobile application.
        </Text>

        <Text style={s.h2}>2. Information we collect</Text>
        <Text style={s.p}>When you use the app, we collect:</Text>
        <Text style={s.li}>• Account info: name, email, gender, and optional profile photo.</Text>
        <Text style={s.li}>• Authentication: password (hashed), Google sign-in token (when used).</Text>
        <Text style={s.li}>• Call & chat metadata: channel names, duration, timestamps, and message text.</Text>
        <Text style={s.li}>• Payments: Razorpay handles your card details; we store only order ID, amount, and status.</Text>
        <Text style={s.li}>• Device permissions: camera and microphone are used only during an active call; audio/video streams are never recorded or stored on our servers.</Text>

        <Text style={s.h2}>3. How we use your information</Text>
        <Text style={s.p}>
          We use your data to run matching, video calls, chat, coin wallet, transaction history, and to protect the community
          (investigating reports, blocking abuse). We never sell personal data.
        </Text>

        <Text style={s.h2}>4. Third-party services</Text>
        <Text style={s.li}>• Agora.io — real-time voice & video transmission.</Text>
        <Text style={s.li}>• Razorpay — payment processing.</Text>
        <Text style={s.li}>• Google Sign-In (optional) — authentication.</Text>
        <Text style={s.p}>Each provider has their own privacy policy which applies alongside ours.</Text>

        <Text style={s.h2}>5. Your rights</Text>
        <Text style={s.p}>
          You can request deletion of your account and associated data by emailing support. You can block or report
          any user from within the app. You can sign out at any time from the Profile tab.
        </Text>

        <Text style={s.h2}>6. Children</Text>
        <Text style={s.p}>
          Coin Connect is not intended for users under 18. If we learn a minor has registered, we will delete the account.
        </Text>

        <Text style={s.h2}>7. Data retention</Text>
        <Text style={s.p}>
          We retain account and transaction data as long as your account is active. Chat messages are stored to let
          you continue conversations. You can delete your account at any time; backups are purged within 30 days.
        </Text>

        <Text style={s.h2}>8. Contact us</Text>
        <Text style={s.p}>
          Questions about this policy? Email us at support@coinconnect.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  title: { color: C.textPrimary, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  updated: { color: C.textMuted, fontSize: 12, marginBottom: 16 },
  h2: { color: C.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  p: { color: C.textSecondary, fontSize: 14, lineHeight: 21 },
  li: { color: C.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 4 },
});
