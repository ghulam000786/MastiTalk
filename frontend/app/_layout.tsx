import React from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../src/auth';
import { View } from 'react-native';
import { C } from '../src/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <Slot />
            <StatusBar style="light" />
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
