import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { C } from '../../src/theme';
import { useAuth } from '../../src/auth';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: C.borderSoft,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 68,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: C.pink,
        tabBarInactiveTintColor: C.textMuted,
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'globe' : 'globe-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          tabBarIcon: ({ focused }) => <CenterIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function CenterIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.center, focused ? styles.centerActive : styles.centerInactive]}>
      <Ionicons name="play" size={22} color={focused ? '#fff' : C.textMuted} />
    </View>
  );
}
const styles = StyleSheet.create({
  center: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  centerActive: {
    backgroundColor: C.pink,
    shadowColor: C.pink, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  centerInactive: { backgroundColor: '#F4F4F7' },
});
