import { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Image, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { theme } from '../../lib/theme';
import TopBar from '../../components/TopBar';

export default function Directory() {
  const [groups, setGroups] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (q?: string) => {
    try {
      const [d, user] = await Promise.all([
        api(`/year-groups${q ? `?search=${encodeURIComponent(q)}` : ''}`),
        me ? Promise.resolve(me) : api('/auth/me').catch(() => null),
      ]);
      setGroups(d);
      if (!me) setMe(user);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(search); }, []));
  const onRefresh = () => { setRefreshing(true); load(search); };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;

  return (
    <View style={s.root}>
      <TopBar title="Directory" avatarUrl={me?.profile?.avatarUrl} initial={me?.profile?.fullName?.charAt(0)} />
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search your groups by year or name..."
          placeholderTextColor={theme.muted}
          value={search}
          onChangeText={t => { setSearch(t); load(t); }}
        />
      </View>
      <FlatList
        data={groups}
        keyExtractor={g => g.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.blue} colors={[theme.blue]} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 20 }}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No year groups found.</Text></View>}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/groups/${item.id}` as any)}>
            <View style={s.cardHeader}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.cover} />
              ) : (
                <View style={s.coverPlaceholder}><Text style={s.coverText}>{item.year}</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.name}>{item.name}</Text>
                  {item.isMember && <View style={s.joinedBadge}><Text style={s.joinedText}>✓ Joined</Text></View>}
                </View>
                <Text style={s.meta}>Class of {item.year} · {item._count?.memberships ?? 0} members</Text>
              </View>
            </View>
            {item.description ? <Text style={s.desc} numberOfLines={2}>{item.description}</Text> : null}
            <View style={s.actionsRow}>
              <Text style={s.actionLink}>Feed</Text>
              <Text style={s.actionLink}>Chat</Text>
              {item.canManage && <>
                <Text style={s.actionLink}>Edit</Text>
                <Text style={s.actionLink}>Invite</Text>
              </>}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.muted, fontSize: 14 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginTop: 12, gap: 10,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: theme.text, fontSize: 14 },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: theme.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cover: { width: 52, height: 52, borderRadius: 14 },
  coverPlaceholder: { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center' },
  coverText: { color: theme.blue, fontWeight: '900', fontSize: 13 },
  name: { fontSize: 16, fontWeight: '800', color: theme.text },
  meta: { fontSize: 12, color: theme.muted, marginTop: 3 },
  joinedBadge: { backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  joinedText: { color: theme.green, fontSize: 10, fontWeight: '800' },
  desc: { fontSize: 13, color: theme.muted, marginBottom: 10, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 18, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 },
  actionLink: { color: theme.blue, fontSize: 13, fontWeight: '700' },
});
