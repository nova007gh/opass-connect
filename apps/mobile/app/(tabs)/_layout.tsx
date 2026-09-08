import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../lib/theme';

function TabIcon({ label, color, focused }: { label: string; color: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}

export default function TabsLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('opass_token');
      if (!token) { router.replace('/login'); return; }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.blue,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: s.tabBar,
        tabBarLabelStyle: s.tabLabel,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <TabIcon label="🏠" color={color} focused={focused} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: ({ color, focused }) => <TabIcon label="💬" color={color} focused={focused} /> }} />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ focused }) => (
            <View style={[s.crestWrap, focused && s.crestWrapActive]}>
              <View style={s.crestCircle}>
                <Text style={s.crestText}>OP</Text>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications', tabBarIcon: ({ color, focused }) => <TabIcon label="🔔" color={color} focused={focused} /> }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarIcon: ({ color, focused }) => <TabIcon label="☰" color={color} focused={focused} /> }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(20,20,38,0.97)',
    borderTopColor: theme.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontWeight: '700' },
  crestWrap: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    marginTop: -18, backgroundColor: theme.bg, borderWidth: 2, borderColor: theme.border,
  },
  crestWrapActive: { borderColor: theme.blue },
  crestCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: theme.blueDark,
    justifyContent: 'center', alignItems: 'center',
  },
  crestText: { color: theme.blue, fontWeight: '900', fontSize: 12 },
});
