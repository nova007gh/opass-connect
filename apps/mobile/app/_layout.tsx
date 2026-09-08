import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Layout() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('opass_token');
      setLoggedIn(!!token);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#0B2D6B" />
        <Text style={s.loadingText}>OPASS CONNECT</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#0B2D6B' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '800' },
      contentStyle: { backgroundColor: '#f7f9fc' },
    }}>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="login" options={{ title: 'Sign In', headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
      <Stack.Screen name="groups" options={{ title: 'Year Groups' }} />
      <Stack.Screen name="assembly" options={{ title: 'Assembly Hall' }} />
      <Stack.Screen name="events" options={{ title: 'Events' }} />
      <Stack.Screen name="projects" options={{ title: 'Projects' }} />
      <Stack.Screen name="payments" options={{ title: 'Dues & Payments' }} />
      <Stack.Screen name="elections" options={{ title: 'Elections' }} />
      <Stack.Screen name="business" options={{ title: 'Business' }} />
      <Stack.Screen name="mamaaa" options={{ title: 'Mamaa AI' }} />
    </Stack>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B2D6B' },
  loadingText: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 12 },
});
