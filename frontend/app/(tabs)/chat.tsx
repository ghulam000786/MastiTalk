import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { C } from '../../src/theme';

type Conv = {
  conversation_id: string;
  peer: { id: string; name: string; picture: string };
  last_text: string;
  last_at: string;
  is_mine: boolean;
};

export default function Chat() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api<{ conversations: Conv[] }>('/chat/conversations')
      .then(r => setConvs(r.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []));

  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'now';
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h`;
      return `${Math.floor(hrs / 24)}d`;
    } catch { return ''; }
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
      </View>
      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color={C.pink} size="large" />
        </View>
      ) : convs.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="chatbubbles" size={36} color={C.pink} />
          </View>
          <Text style={s.emptyTitle}>No conversations yet</Text>
          <Text style={s.emptySub}>Start a video call to meet new people, then chat with them.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/match')} testID="empty-start-btn">
            <Ionicons name="videocam" size={18} color="#fff" />
            <Text style={s.emptyBtnText}>Start a match</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {convs.map(c => (
            <TouchableOpacity
              key={c.conversation_id}
              testID={`chat-row-${c.peer.id}`}
              style={s.row}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/chat/[peer]', params: { peer: c.peer.id } })}
            >
              <Image source={{ uri: c.peer.picture }} style={s.avatar} />
              <View style={{ flex: 1 }}>
                <View style={s.rowHead}>
                  <Text style={s.name} numberOfLines={1}>{c.peer.name}</Text>
                  <Text style={s.time}>{fmtTime(c.last_at)}</Text>
                </View>
                <Text style={s.last} numberOfLines={1}>
                  {c.is_mine ? 'You: ' : ''}{c.last_text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: C.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surfaceAlt },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: C.textPrimary, fontSize: 16, fontWeight: '700', flex: 1 },
  time: { color: C.textMuted, fontSize: 12 },
  last: { color: C.textSecondary, fontSize: 14, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: C.pinkBg, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptySub: { color: C.textMuted, fontSize: 13, textAlign: 'center', marginHorizontal: 30, lineHeight: 18 },
  emptyBtn: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.pink, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
