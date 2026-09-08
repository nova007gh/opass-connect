import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../lib/theme';

export default function Layout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('opass_token').finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={theme.blue} />
        <Text style={s.loadingText}>OPASS CONNECT</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.blue,
        headerTitleStyle: { fontWeight: '800', color: theme.text },
        contentStyle: { backgroundColor: theme.bg },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
        <Stack.Screen name="groups/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="dm/[userId]" options={{ headerShown: false }} />
        <Stack.Screen name="assembly" options={{ title: 'Assembly Hall' }} />
        <Stack.Screen name="events" options={{ title: 'Events' }} />
        <Stack.Screen name="projects" options={{ title: 'Support Projects' }} />
        <Stack.Screen name="payments" options={{ title: 'Dues & Payments' }} />
        <Stack.Screen name="elections" options={{ title: 'Elections' }} />
        <Stack.Screen name="business" options={{ title: 'Business' }} />
      </Stack>
    </>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  loadingText: { color: theme.blue, fontSize: 20, fontWeight: '900', marginTop: 12 },
});
