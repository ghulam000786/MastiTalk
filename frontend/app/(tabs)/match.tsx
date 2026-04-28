import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Animated, Easing, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth';
import { api } from '../../src/api';
import { C } from '../../src/theme';

export default function Match() {
  const { user, refresh } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);
  const [matching, setMatching] = useState(false);

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    refresh();
    api<{ online_count: number }>('/explore').then(r => setOnlineCount(r.online_count)).catch(() => {});
  }, [refresh]));

  useEffect(() => {
    const animate = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ])
      );
    Animated.parallel([animate(ring1, 0), animate(ring2, 800), animate(ring3, 1600)]).start();
  }, [ring1, ring2, ring3]);

  const startMatch = async () => {
    if ((user?.coins ?? 0) < 10) {
      Alert.alert('Need more coins', 'You need at least 10 coins to start a call. Tap the + to top up.');
      return;
    }
    setMatching(true);
    try {
      // Pick a random online profile
      const r = await api<{ profiles: any[] }>('/explore');
      const onlinePeople = (r.profiles || []).filter(p => p.online);
      const pick = onlinePeople.length
        ? onlinePeople[Math.floor(Math.random() * onlinePeople.length)]
        : (r.profiles[0] || null);
      const channel = `cc_${(user?.id || 'me').slice(0, 6)}_${Date.now().toString(36)}`;
      router.push({ pathname: '/call/[channel]', params: {
        channel,
        peer: pick ? JSON.stringify({ name: pick.name, country: pick.country, photo: pick.photo, flag: pick.flag }) : '',
      }});
    } catch (e: any) {
      Alert.alert('Could not start', e.message);
    } finally {
      setMatching(false);
    }
  };

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.6, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.2] }) }],
  });

  const avatarUri = user?.picture
    || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80';

  return (
    <View style={s.wrap}>
      <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
        <View style={s.topBar}>
          <View style={s.coinPill} testID="match-credits-pill">
            <View style={s.coinDot} />
            <Text style={s.coinPillText}>{user?.credits ?? 2}</Text>
            <View style={s.plusBtn}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </View>
          <TouchableOpacity
            testID="match-coins-pill"
            style={s.coinPillRight}
            onPress={() => router.push('/store')}
            activeOpacity={0.85}
          >
            <View style={s.coinIconYellow}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#fff' }}>₿</Text>
            </View>
            <Text style={s.coinPillRightText} testID="match-coins-text">{user?.coins ?? 0}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={s.center}>
        <View style={s.ringWrap}>
          <Animated.View style={[s.ring, ringStyle(ring1)]} />
          <Animated.View style={[s.ring, ringStyle(ring2)]} />
          <Animated.View style={[s.ring, ringStyle(ring3)]} />
          <View style={s.dotA} />
          <View style={s.dotB} />
          <View style={s.dotC} />
          <View style={s.dotD} />
          <View style={s.dotE} />
          <View style={s.avatarOuter}>
            <Image source={{ uri: avatarUri }} style={s.avatar} testID="match-avatar" />
          </View>
        </View>

        <Text style={s.titleLine} testID="match-title">Tap Start to find a match</Text>
        <Text style={s.subtitleLine}>10 coins/min</Text>
      </View>

      <View style={s.bottom}>
        <TouchableOpacity
          testID="start-match-btn"
          style={s.startBtn}
          onPress={startMatch}
          activeOpacity={0.9}
          disabled={matching}
        >
          <Ionicons name="videocam" size={22} color="#fff" />
          <Text style={s.startBtnText}>{matching ? 'Finding…' : 'Start'}</Text>
        </TouchableOpacity>
        <Text style={s.online} testID="online-count">{onlineCount} girls online now</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bgDark },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  coinPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  coinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.yellow },
  coinPillText: { color: '#fff', fontWeight: '700', fontSize: 13, marginRight: 4 },
  plusBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.pink, justifyContent: 'center', alignItems: 'center' },

  coinPillRight: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  coinIconYellow: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.yellow,
    justifyContent: 'center', alignItems: 'center',
  },
  coinPillRightText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  ringWrap: { width: 320, height: 320, justifyContent: 'center', alignItems: 'center' },
  ring: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    borderWidth: 1, borderColor: C.pink,
  },
  dotA: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink, top: 60, right: 70 },
  dotB: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.yellow, top: 90, left: 50 },
  dotC: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: C.pink, bottom: 80, right: 50 },
  dotD: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: C.yellow, bottom: 60, left: 80 },
  dotE: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: C.pink, top: 130, right: 30 },

  avatarOuter: {
    width: 168, height: 168, borderRadius: 84,
    borderWidth: 3, borderColor: C.pink,
    padding: 4, backgroundColor: C.bgDark,
    shadowColor: C.pink, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 80 },

  titleLine: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 28 },
  subtitleLine: { color: '#C9B6D8', fontSize: 14, marginTop: 6 },

  bottom: { paddingHorizontal: 16, paddingBottom: 12 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.pink, paddingVertical: 18, borderRadius: 999,
    shadowColor: C.pink, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  online: { color: '#C9B6D8', fontSize: 12, textAlign: 'center', marginTop: 10, marginBottom: 4 },
});
