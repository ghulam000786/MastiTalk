import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C } from '../src/theme';

export default function Terms() {
  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="terms-back-btn">
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={s.updated}>Last updated: April 2026</Text>

        <Text style={s.h2}>1. Acceptance of terms</Text>
        <Text style={s.p}>
          By creating a Coin Connect account or using the app, you agree to these Terms. If you do not agree,
          please uninstall the app.
        </Text>

        <Text style={s.h2}>2. Eligibility</Text>
        <Text style={s.p}>
          You must be at least 18 years old to use Coin Connect. You are responsible for keeping your account
          and password secure.
        </Text>

        <Text style={s.h2}>3. Community rules</Text>
        <Text style={s.p}>
          Coin Connect is a friendly community. The following are prohibited and will result in a ban:
        </Text>
        <Text style={s.li}>• Nudity, sexual content, or suggestive conduct on video calls.</Text>
        <Text style={s.li}>• Harassment, hate speech, or threats of violence.</Text>
        <Text style={s.li}>• Impersonation or fraudulent activity.</Text>
        <Text style={s.li}>• Sharing or soliciting personal data of others.</Text>
        <Text style={s.li}>• Any illegal activity or content.</Text>

        <Text style={s.h2}>4. Coins & payments</Text>
        <Text style={s.p}>
          Coins are a virtual, non-refundable credit used for in-app calls (10 coins/min). Payments are processed
          by Razorpay. Purchases are final; we do not refund used coins. Unused coins remain in your account for
          as long as it is active.
        </Text>

        <Text style={s.h2}>5. Reporting & moderation</Text>
        <Text style={s.p}>
          You can report or block any user from their profile or the chat screen. Reports are reviewed within 24 hours.
          Accounts violating community rules may be warned, suspended, or permanently banned without refund.
        </Text>

        <Text style={s.h2}>6. Limitation of liability</Text>
        <Text style={s.p}>
          Coin Connect is provided "as is". We are not responsible for content shared by other users during calls or
          messages. Use the service at your own risk.
        </Text>

        <Text style={s.h2}>7. Termination</Text>
        <Text style={s.p}>
          We may suspend or terminate accounts that violate these Terms. You can delete your account at any time.
        </Text>

        <Text style={s.h2}>8. Changes</Text>
        <Text style={s.p}>
          We may update these Terms. Continued use of the app after changes means you accept the updated Terms.
        </Text>

        <Text style={s.h2}>9. Contact</Text>
        <Text style={s.p}>Questions? Email support@coinconnect.app</Text>
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
