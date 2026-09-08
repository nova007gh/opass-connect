import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem('opass_token');
      if (!token) { router.replace('/login'); return; }
      const u = await AsyncStorage.getItem('opass_user');
      if (u) setUser(JSON.parse(u));
      const me = await api('/auth/me');
      setUser(me);
      await AsyncStorage.setItem('opass_user', JSON.stringify(me));
    } catch {
      await AsyncStorage.removeItem('opass_token');
      router.replace('/login');
      return;
    }
    try {
      const s = await api('/stats');
      setStats(s);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const logout = async () => {
    await AsyncStorage.removeItem('opass_token');
    await AsyncStorage.removeItem('opass_user');
    router.replace('/login');
  };

  if (loading) {
    return <View style={s.loading}><ActivityIndicator size="large" color="#0B2D6B" /></View>;
  }

  const name = user?.profile?.fullName?.split(' ')[0] || 'Opanin';
  const role = user?.role || 'MEMBER';
  const roleColor = role === 'SUPER_ADMIN' ? '#7C3AED' : role === 'ADMIN' ? '#2563EB' : role === 'EXECUTIVE' ? '#059669' : '#6B7280';

  const items: [string, string, string][] = [
    ['Profile', '/profile', '👤'],
    ['Year Groups', '/groups', '🎓'],
    ['Assembly Hall', '/assembly', '💬'],
    ['Events', '/events', '📅'],
    ['Projects', '/projects', '🏗️'],
    ['Dues', '/payments', '💳'],
    ['Elections', '/elections', '🗳️'],
    ['Business', '/business', '💼'],
    ['Mamaa AI', '/mamaaa', '🤖'],
  ];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B2D6B']} />}
    >
      {/* Hero header */}
      <View style={s.hero}>
        <Text style={s.heroKicker}>OFORI PANIN SHS ALUMNI</Text>
        <Text style={s.heroTitle}>OPASS CONNECT</Text>
        <Text style={s.heroMotto}>One School. One Network. One Legacy.</Text>
      </View>

      {/* Greeting */}
      <View style={s.greeting}>
        <View style={{ flex: 1 }}>
          <Text style={s.greetingText}>Akwaaba, Opanin {name}!</Text>
          <View style={s.roleRow}>
            <View style={[s.roleBadge, { backgroundColor: roleColor + '22' }]}>
              <Text style={[s.roleText, { color: roleColor }]}>{role.replace('_', ' ')}</Text>
            </View>
            {user?.verification === 'VERIFIED' && (
              <View style={s.verifiedBadge}>
                <Text style={s.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={logout} style={s.logoutBtn}>
          <Text style={s.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Stats */}
      {stats && (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats.users ?? '—'}</Text>
            <Text style={s.statLabel}>Members</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats.events ?? '—'}</Text>
            <Text style={s.statLabel}>Events</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats.projects ?? '—'}</Text>
            <Text style={s.statLabel}>Projects</Text>
          </View>
        </View>
      )}

      {/* Menu grid */}
      <Text style={s.sectionTitle}>Explore</Text>
      <View style={s.grid}>
        {items.map(([name, path, icon]) => (
          <Pressable key={name} style={s.card} onPress={() => router.push(path as any)}>
            <Text style={s.cardIcon}>{icon}</Text>
            <Text style={s.cardText}>{name}</Text>
          </Pressable>
        ))}
      </View>

      {/* Live banner */}
      <View style={s.live}>
        <View style={s.liveBadge}>
          <Text style={s.liveBadgeText}>LIVE</Text>
        </View>
        <Text style={s.liveTitle}>OPASS Assembly Hall</Text>
        <Text style={s.liveText}>Join alumni worldwide in the conversation.</Text>
        <Pressable style={s.liveBtn} onPress={() => router.push('/assembly')}>
          <Text style={s.liveBtnText}>Join Chat →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fc' },
  content: { padding: 16, paddingBottom: 40 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f9fc' },
  hero: { backgroundColor: '#0B2D6B', borderRadius: 24, padding: 24, marginBottom: 16 },
  heroKicker: { color: '#DCE8FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 8 },
  heroMotto: { color: '#9CB5D9', fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  greeting: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  greetingText: { fontSize: 20, fontWeight: '800', color: '#050505' },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  roleText: { fontSize: 11, fontWeight: '700' },
  verifiedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#ECFDF5' },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#22C55E' },
  logoutBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: '#FEE2E2' },
  logoutText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#0B2D6B' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#050505', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  card: { width: '47%', minHeight: 100, backgroundColor: '#fff', borderRadius: 18, padding: 16, justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'flex-start' },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardText: { color: '#0B2D6B', fontWeight: '800', fontSize: 15 },
  live: { backgroundColor: '#050505', borderRadius: 22, padding: 20 },
  liveBadge: { backgroundColor: '#DC2626', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  liveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  liveTitle: { color: '#fff', fontWeight: '900', fontSize: 20, marginTop: 12 },
  liveText: { color: '#9CA3AF', marginTop: 5, fontSize: 14 },
  liveBtn: { marginTop: 14, backgroundColor: '#0B2D6B', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, alignSelf: 'flex-start' },
  liveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
