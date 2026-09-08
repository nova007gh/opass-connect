import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../lib/api';
import { theme, roleColor, roleLabel } from '../../lib/theme';

const rows: [string, string, string][] = [
  ['My Profile', '/profile', '👤'],
  ['Year Groups', '/(tabs)/directory', '🎓'],
  ['Assembly Hall', '/assembly', '🎙️'],
  ['Events', '/events', '📅'],
  ['Support Projects', '/projects', '❤️'],
  ['Dues & Payments', '/payments', '💳'],
  ['Elections', '/elections', '🛡️'],
  ['Business', '/business', '📈'],
  ['Mamaa AI', '/dm/mamaaa-ai-bot', '🤖'],
];

export default function Menu() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    api('/auth/me').then(u => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []));

  const logout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('opass_token');
        await AsyncStorage.removeItem('opass_user');
        router.replace('/login');
      }},
    ]);
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;

  const p = user?.profile || {};
  const role = user?.role || 'MEMBER';

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
      <Text style={s.header}>Menu</Text>

      <Pressable style={s.profileCard} onPress={() => router.push('/profile')}>
        {p.avatarUrl ? (
          <Image source={{ uri: p.avatarUrl }} style={s.avatar} />
        ) : (
          <View style={s.avatarPlaceholder}><Text style={s.avatarText}>{(p.fullName || 'U').charAt(0)}</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{p.fullName || user?.email}</Text>
          <View style={[s.roleBadge, { backgroundColor: roleColor(role) + '33' }]}>
            <Text style={[s.roleText, { color: roleColor(role) }]}>{roleLabel(role)}</Text>
          </View>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>

      <Text style={s.sectionTitle}>Explore</Text>
      <View style={s.menuGroup}>
        {rows.map(([label, path, icon], i) => (
          <Pressable key={label} style={[s.row, i < rows.length - 1 && s.rowBorder]} onPress={() => router.push(path as any)}>
            <View style={s.rowIcon}><Text style={{ fontSize: 17 }}>{icon}</Text></View>
            <Text style={s.rowLabel}>{label}</Text>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  header: { fontSize: 22, fontWeight: '900', color: theme.text, marginBottom: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarPlaceholder: { width: 54, height: 54, borderRadius: 27, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: theme.blue, fontWeight: '900', fontSize: 20 },
  name: { fontSize: 16, fontWeight: '800', color: theme.text },
  roleBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  roleText: { fontSize: 11, fontWeight: '800' },
  chevron: { fontSize: 22, color: theme.muted },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: theme.muted, marginBottom: 8, letterSpacing: 0.5 },
  menuGroup: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.blue50, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 15, color: theme.text, fontWeight: '600' },
  logoutBtn: { backgroundColor: 'rgba(248,113,113,0.15)', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  logoutText: { color: theme.red, fontSize: 16, fontWeight: '800' },
});
