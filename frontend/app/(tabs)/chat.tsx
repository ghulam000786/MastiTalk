import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/theme';

const FAKE_CHATS = [
  { id: 'c1', name: 'Riya', last: 'Hii! Was nice talking to you 😊', time: '2m', unread: 2,
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80' },
  { id: 'c2', name: 'Ananya', last: 'Call me back when you are free', time: '1h', unread: 0,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80' },
  { id: 'c3', name: 'Mei', last: 'こんにちは ✨', time: '3h', unread: 1,
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80' },
  { id: 'c4', name: 'Priya', last: 'Loved our chat yesterday', time: '1d', unread: 0,
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80' },
];

export default function Chat() {
  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <Ionicons name="search" size={22} color={C.textPrimary} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {FAKE_CHATS.map(c => (
          <TouchableOpacity key={c.id} style={s.row} testID={`chat-row-${c.id}`} activeOpacity={0.8}>
            <Image source={{ uri: c.photo }} style={s.avatar} />
            <View style={{ flex: 1 }}>
              <View style={s.rowHead}>
                <Text style={s.name}>{c.name}</Text>
                <Text style={s.time}>{c.time}</Text>
              </View>
              <View style={s.rowFoot}>
                <Text style={s.last} numberOfLines={1}>{c.last}</Text>
                {c.unread > 0 ? (
                  <View style={s.unread}>
                    <Text style={s.unreadText}>{c.unread}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <View style={s.tip}>
          <Ionicons name="sparkles" size={16} color={C.pink} />
          <Text style={s.tipText}>Have a great call to start a new conversation!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  title: { color: C.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  name: { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  time: { color: C.textMuted, fontSize: 12 },
  last: { color: C.textSecondary, fontSize: 14, flex: 1, marginRight: 8 },
  unread: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7,
    backgroundColor: C.pink, justifyContent: 'center', alignItems: 'center',
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 16, padding: 14,
    backgroundColor: C.pinkBg, borderRadius: 14,
  },
  tipText: { color: C.pinkDark, fontSize: 13, fontWeight: '500', flex: 1 },
});
