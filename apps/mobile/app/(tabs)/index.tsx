import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../lib/api';
import { theme, roleColor, roleLabel } from '../../lib/theme';
import TopBar from '../../components/TopBar';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const me = await api('/auth/me');
      setUser(me);
      await AsyncStorage.setItem('opass_user', JSON.stringify(me));
    } catch {
      await AsyncStorage.removeItem('opass_token');
      router.replace('/login');
      return;
    }
    try { setStats(await api('/stats')); } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;

  const name = user?.profile?.fullName?.split(' ')[0] || user?.profile?.nickname || 'Opanin';
  const role = user?.role || 'MEMBER';
  const rColor = roleColor(role);

  const items: [string, string, string][] = [
    ['My Profile', '/profile', '👤'],
    ['Year Groups', '/(tabs)/directory', '🎓'],
    ['Events', '/events', '📅'],
    ['Chatroom', '/assembly', '🎙️'],
    ['Support Projects', '/projects', '❤️'],
    ['Dues & Payments', '/payments', '💳'],
    ['Elections', '/elections', '🛡️'],
    ['Business', '/business', '📈'],
  ];

  return (
    <View style={s.root}>
      <TopBar title="Home" avatarUrl={user?.profile?.avatarUrl} initial={name.charAt(0)} />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.blue} colors={[theme.blue]} />}
      >
        <Text style={s.greeting}>{greeting}, Opanin {name}!</Text>

        <View style={s.logoCard}>
          <View style={s.crest}><Text style={s.crestText}>OP</Text></View>
          <Text style={s.brand}>OPASS CONNECT</Text>
          <Text style={s.brandSub}>OFORI PANIN SENIOR HIGH SCHOOL</Text>
          <Text style={s.motto}>ONE SCHOOL. ONE NETWORK. <Text style={{ color: theme.blue }}>ONE LEGACY.</Text></Text>
        </View>

        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search classmates, groups, events..."
            placeholderTextColor={theme.muted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => search.trim() && router.push('/(tabs)/directory')}
          />
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats?.yearGroups ?? '—'}</Text>
            <Text style={s.statLabel}>YEAR GROUPS</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats?.projects ?? '—'}</Text>
            <Text style={s.statLabel}>PROJECTS</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>GHS {Number(stats?.raised ?? 0).toLocaleString()}</Text>
            <Text style={s.statLabel}>RAISED</Text>
          </View>
        </View>

        <View style={s.grid}>
          {items.map(([label, path, icon]) => (
            <Pressable key={label} style={s.gridItem} onPress={() => router.push(path as any)}>
              <View style={s.gridIcon}><Text style={s.gridIconText}>{icon}</Text></View>
              <Text style={s.gridLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={s.mamaaCard} onPress={() => router.push('/dm/mamaaa-ai-bot' as any)}>
          <View style={s.mamaaIcon}><Text style={{ fontSize: 22 }}>🎓</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.mamaaTitle}>Chat with Mamaa AI</Text>
            <Text style={s.mamaaSub}>Ask me anything about OPASS, events, elections, projects, or just chat!</Text>
          </View>
          <Text style={s.mamaaArrow}>💬</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 20 },
  greeting: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 14 },
  logoCard: {
    backgroundColor: theme.card, borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  crest: { width: 56, height: 56, borderRadius: 16, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  crestText: { color: theme.blue, fontWeight: '900', fontSize: 16 },
  brand: { fontSize: 22, fontWeight: '900', color: theme.text, letterSpacing: 1 },
  brandSub: { fontSize: 11, color: theme.muted, fontWeight: '700', marginTop: 6, letterSpacing: 1 },
  motto: { fontSize: 12, color: theme.text, marginTop: 10, fontWeight: '700', textAlign: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: theme.text, fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: theme.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statValue: { fontSize: 16, fontWeight: '900', color: theme.blue },
  statLabel: { fontSize: 9, color: theme.muted, marginTop: 6, fontWeight: '700', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  gridItem: { width: '22%', alignItems: 'center', gap: 8 },
  gridIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  gridIconText: { fontSize: 22 },
  gridLabel: { fontSize: 10.5, color: theme.text, fontWeight: '600', textAlign: 'center' },
  mamaaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.blueDark, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  mamaaIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  mamaaTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  mamaaSub: { color: '#c7d8ff', fontSize: 12, marginTop: 4 },
  mamaaArrow: { fontSize: 18 },
});
