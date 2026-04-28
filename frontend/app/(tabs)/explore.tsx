import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { C } from '../../src/theme';

type Profile = {
  id: string; name: string; country: string; flag: string; online: boolean; photo: string;
};

export default function Explore() {
  const { user, refresh } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    refresh();
    setLoading(true);
    api<{ profiles: Profile[] }>('/explore')
      .then(r => setProfiles(r.profiles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]));

  const callProfile = (p: Profile) => {
    if ((user?.coins ?? 0) < 10) {
      router.push('/store'); return;
    }
    const channel = `cc_${(user?.id || 'me').slice(0, 6)}_${p.id}`;
    router.push({ pathname: '/call/[channel]', params: {
      channel,
      peer: JSON.stringify({ name: p.name, country: p.country, photo: p.photo, flag: p.flag }),
    }});
  };

  return (
    <SafeAreaView style={s.wrap} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title} testID="explore-title">Explore</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            testID="explore-coins-pill"
            style={s.balancePill}
            onPress={() => router.push('/store')}
            activeOpacity={0.85}
          >
            <View style={s.coinIcon}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#fff' }}>₿</Text>
            </View>
            <Text style={s.balanceText} testID="explore-coins-text">{user?.coins ?? 0}</Text>
            <View style={s.plusBtn}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color={C.textPrimary} />
        </View>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 80, alignItems: 'center' }}>
          <ActivityIndicator color={C.pink} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={s.grid}>
            {profiles.map(p => (
              <TouchableOpacity
                key={p.id}
                testID={`explore-card-${p.id}`}
                style={s.card}
                onPress={() => callProfile(p)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: p.photo }} style={s.photo} />
                <View style={[s.dot, { backgroundColor: p.online ? C.green : '#D1C4D8' }]} />
                <View style={s.info}>
                  <Text style={s.name}>{p.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12 }}>{p.flag}</Text>
                    <Text style={s.country}>{p.country}</Text>
                  </View>
                </View>
                <View style={s.callBtn}>
                  <Ionicons name="videocam" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
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

  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  coinIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.yellow, justifyContent: 'center', alignItems: 'center' },
  balanceText: { color: C.textPrimary, fontWeight: '700', fontSize: 14 },
  plusBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.pink, justifyContent: 'center', alignItems: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '48%', aspectRatio: 0.78, borderRadius: 18, overflow: 'hidden',
    backgroundColor: C.surfaceAlt, position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  dot: { position: 'absolute', top: 10, left: 10, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  info: { position: 'absolute', bottom: 12, left: 12, right: 60 },
  name: { color: '#fff', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  country: { color: '#fff', fontSize: 11, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 },
  callBtn: {
    position: 'absolute', bottom: 10, right: 10, width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.pink, justifyContent: 'center', alignItems: 'center',
    shadowColor: C.pink, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
