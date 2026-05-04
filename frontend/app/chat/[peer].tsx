import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

type Msg = { id: string; from_user_id: string; to_user_id: string; text: string; created_at: string };
type Peer = { id: string; name: string; picture: string };

export default function ChatRoom() {
  const { peer: peerId } = useLocalSearchParams<{ peer: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pollRef = useRef<any>(null);

  const load = async () => {
    if (!peerId) return;
    try {
      const r = await api<{ messages: Msg[]; peer: Peer }>(`/chat/messages/${peerId}`);
      setMessages(r.messages || []);
      setPeer(r.peer);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
    pollRef.current = setInterval(load, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [peerId]));

  const send = async () => {
    const t = text.trim();
    if (!t || sending || !peerId) return;
    setSending(true);
    setText('');
    try {
      const r = await api<{ message: Msg }>('/chat/send', {
        method: 'POST', body: JSON.stringify({ to_user_id: peerId, text: t }),
      });
      setMessages(m => [...m, r.message]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e: any) {
      Alert.alert('Could not send', e.message);
      setText(t);
    } finally { setSending(false); }
  };

  const doReport = () => {
    setMenuOpen(false);
    router.push({ pathname: '/report', params: { userId: peerId, name: peer?.name || '' } });
  };

  const doBlock = () => {
    setMenuOpen(false);
    const confirmBlock = async () => {
      try {
        await api('/block', { method: 'POST', body: JSON.stringify({ user_id: peerId }) });
        router.back();
      } catch (e: any) { Alert.alert('Error', e.message); }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Block ${peer?.name || 'this user'}? They cannot message or call you.`)) confirmBlock();
    } else {
      Alert.alert(`Block ${peer?.name || 'user'}?`, 'They cannot message or call you.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: confirmBlock },
      ]);
    }
  };

  const videoCall = async () => {
    if (!peer) return;
    if ((user?.coins ?? 0) < 10) { router.push('/store'); return; }
    const channel = `cc_${(user?.id || '').slice(0, 6)}_${peer.id.slice(0, 6)}`;
    router.push({
      pathname: '/call/[channel]',
      params: { channel, peer: JSON.stringify({ name: peer.name, photo: peer.picture }) },
    });
  };

  const fmt = (iso: string) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

  if (loading) {
    return <SafeAreaView style={s.wrap}><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.hBtn} testID="chat-back-btn">
            <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.peerBox} onPress={() => setMenuOpen(o => !o)} activeOpacity={0.8}>
            <Image source={{ uri: peer?.picture }} style={s.peerAvatar} />
            <Text style={s.peerName} numberOfLines={1}>{peer?.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.hBtn} onPress={videoCall} testID="chat-video-btn">
            <Ionicons name="videocam" size={22} color={C.pink} />
          </TouchableOpacity>
          <TouchableOpacity style={s.hBtn} onPress={() => setMenuOpen(o => !o)} testID="chat-menu-btn">
            <Ionicons name="ellipsis-vertical" size={20} color={C.textPrimary} />
          </TouchableOpacity>
        </View>
        {menuOpen && (
          <View style={s.menu}>
            <TouchableOpacity style={s.menuItem} onPress={doReport} testID="menu-report-btn">
              <Ionicons name="flag" size={18} color={C.danger} />
              <Text style={[s.menuText, { color: C.danger }]}>Report user</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={doBlock} testID="menu-block-btn">
              <Ionicons name="ban" size={18} color={C.danger} />
              <Text style={[s.menuText, { color: C.danger }]}>Block user</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: C.textMuted, fontSize: 13 }}>Start the conversation with a friendly hi 👋</Text>
          </View>
        ) : messages.map(m => {
          const mine = m.from_user_id === user?.id;
          return (
            <View key={m.id} style={[s.bubbleRow, mine ? { justifyContent: 'flex-end' } : null]} testID={`msg-${m.id}`}>
              <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleThem]}>
                <Text style={[s.bubbleText, mine ? { color: '#fff' } : null]}>{m.text}</Text>
                <Text style={[s.bubbleTime, mine ? { color: 'rgba(255,255,255,0.7)' } : null]}>{fmt(m.created_at)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
        <View style={s.inputRow}>
          <TextInput
            testID="chat-text-input"
            style={s.input} placeholder="Type a message…" placeholderTextColor={C.textMuted}
            value={text} onChangeText={setText} multiline
            onSubmitEditing={send}
          />
          <TouchableOpacity style={s.sendBtn} onPress={send} disabled={sending || !text.trim()} testID="chat-send-btn">
            {sending ? <ActivityIndicator color="#fff" size="small" /> :
              <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F8F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.borderSoft, backgroundColor: '#fff' },
  hBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  peerBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  peerAvatar: { width: 36, height: 36, borderRadius: 18 },
  peerName: { color: C.textPrimary, fontSize: 16, fontWeight: '700', flex: 1 },
  menu: { position: 'absolute', right: 12, top: 58, backgroundColor: '#fff', borderRadius: 14, padding: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6, borderWidth: 1, borderColor: C.border, zIndex: 10 },
  menuItem: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  menuText: { fontSize: 14, fontWeight: '600' },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: C.pink, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleText: { color: C.textPrimary, fontSize: 15, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: C.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: C.borderSoft, backgroundColor: '#fff', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, color: C.textPrimary, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.pink, justifyContent: 'center', alignItems: 'center' },
});
