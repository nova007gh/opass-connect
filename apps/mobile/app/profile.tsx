import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { api } from '../lib/api';

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/auth/me').then(u => { setUser(u); setLoading(false); }).catch(() => {
      AsyncStorage.removeItem('opass_token').then(() => router.replace('/login'));
    });
  }, []);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#0B2D6B" /></View>;
  if (!user) return <View style={s.loading}><Text>No profile found</Text></View>;

  const p = user.profile || {};
  const fullName = p.fullName || 'Unnamed';
  const role = user.role || 'MEMBER';
  const roleColor = role === 'SUPER_ADMIN' ? '#7C3AED' : role === 'ADMIN' ? '#2563EB' : role === 'EXECUTIVE' ? '#059669' : '#6B7280';

  const logout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('opass_token');
        await AsyncStorage.removeItem('opass_user');
        router.replace('/login');
      }},
    ]);
  };

  return (
    <ScrollView style={s.root}>
      {/* Cover */}
      <View style={s.cover} />

      {/* Avatar + name */}
      <View style={s.header}>
        <View style={s.avatarWrap}>
          {p.avatarUrl ? (
            <Image source={{ uri: p.avatarUrl }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={s.name}>{fullName}</Text>
        {p.nickname && <Text style={s.nickname}>@{p.nickname}</Text>}
        <View style={s.badgeRow}>
          <View style={[s.roleBadge, { backgroundColor: roleColor + '22' }]}>
            <Text style={[s.roleText, { color: roleColor }]}>{role.replace('_', ' ')}</Text>
          </View>
          {user.verification === 'VERIFIED' && (
            <View style={s.verifiedBadge}><Text style={s.verifiedText}>✓ Verified</Text></View>
          )}
        </View>
        {p.profession && <Text style={s.profession}>{p.profession}</Text>}
      </View>

      {/* Info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>About</Text>
        {p.bio && <Text style={s.bio}>{p.bio}</Text>}
        <View style={s.infoRow}><Text style={s.infoLabel}>Email</Text><Text style={s.infoValue}>{user.email}</Text></View>
        {p.graduationYear && <View style={s.infoRow}><Text style={s.infoLabel}>Class of</Text><Text style={s.infoValue}>{p.graduationYear}</Text></View>}
        {p.house && <View style={s.infoRow}><Text style={s.infoLabel}>House</Text><Text style={s.infoValue}>{p.house}</Text></View>}
        {p.positionHeld && <View style={s.infoRow}><Text style={s.infoLabel}>Position Held</Text><Text style={s.infoValue}>{p.positionHeld}</Text></View>}
        {p.country && <View style={s.infoRow}><Text style={s.infoLabel}>Country</Text><Text style={s.infoValue}>{p.country}</Text></View>}
        {p.city && <View style={s.infoRow}><Text style={s.infoLabel}>City</Text><Text style={s.infoValue}>{p.city}</Text></View>}
      </View>

      {/* Year Groups */}
      {user.memberships && user.memberships.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Year Groups</Text>
          {user.memberships.map((m: any) => (
            <View key={m.id} style={s.ygCard}>
              <Text style={s.ygName}>{m.yearGroup?.name || 'Year Group'}</Text>
              <Text style={s.ygYear}>Class of {m.yearGroup?.year}</Text>
              {m.isLeader && <Text style={s.leaderBadge}>★ Leader</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Sign out */}
      <Pressable style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f9fc' },
  cover: { height: 140, backgroundColor: '#0B2D6B' },
  header: { alignItems: 'center', marginTop: -55, paddingBottom: 20 },
  avatarWrap: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#f7f9fc', padding: 4, marginBottom: 12 },
  avatar: { width: '100%', height: '100%', borderRadius: 55 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 55, backgroundColor: '#0B2D6B', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 42, fontWeight: '900' },
  name: { fontSize: 22, fontWeight: '900', color: '#050505' },
  nickname: { fontSize: 15, color: '#6B7280', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 },
  roleText: { fontSize: 12, fontWeight: '700' },
  verifiedBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, backgroundColor: '#ECFDF5' },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },
  profession: { fontSize: 14, color: '#0B2D6B', fontWeight: '600', marginTop: 8 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#050505', marginBottom: 12 },
  bio: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#050505', fontWeight: '600', textAlign: 'right' },
  ygCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  ygName: { fontSize: 15, fontWeight: '700', color: '#0B2D6B' },
  ygYear: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  leaderBadge: { fontSize: 12, color: '#F59E0B', fontWeight: '700', marginTop: 4 },
  logoutBtn: { marginHorizontal: 16, marginBottom: 40, backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  logoutText: { color: '#DC2626', fontSize: 16, fontWeight: '800' },
});
