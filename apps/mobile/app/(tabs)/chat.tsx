import { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { theme, roleColor, roleLabel } from '../../lib/theme';
import TopBar from '../../components/TopBar';

function timeAgo(date: string) {
  const d = new Date(date).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export default function Chat() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [convos, ygs, user] = await Promise.all([
        api('/dm/conversations').catch(() => []),
        api('/year-groups?mine=true').catch(() => []),
        api('/auth/me').catch(() => null),
      ]);
      setConversations(convos);
      setGroups(ygs);
      setMe(user);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;

  return (
    <View style={s.root}>
      <TopBar title="Chat" avatarUrl={me?.profile?.avatarUrl} initial={me?.profile?.fullName?.charAt(0)} />
      <FlatList
        data={[{ type: 'header', id: 'h1' }, ...conversations.map(c => ({ type: 'dm', ...c })), { type: 'groupsHeader', id: 'h2' }, ...groups.map((g: any) => ({ type: 'group', ...g }))]}
        keyExtractor={(item: any) => item.id || item.user?.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.blue} colors={[theme.blue]} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        renderItem={({ item }: any) => {
          if (item.type === 'header') {
            return conversations.length > 0 ? <Text style={s.sectionLabel}>All Chats</Text> : null;
          }
          if (item.type === 'groupsHeader') {
            return <Text style={[s.sectionLabel, { marginTop: 8 }]}>My Year Groups</Text>;
          }
          if (item.type === 'dm') {
            const u = item.user;
            const name = u?.profile?.fullName || u?.email;
            return (
              <Pressable style={s.dmRow} onPress={() => router.push(`/dm/${u.id}` as any)}>
                {u?.profile?.avatarUrl ? (
                  <Image source={{ uri: u.profile.avatarUrl }} style={s.dmAvatar} />
                ) : (
                  <View style={[s.dmAvatarPlaceholder, u.id === 'mamaaa-ai-bot' && { backgroundColor: theme.blueDark }]}>
                    <Text style={s.dmAvatarText}>{u.id === 'mamaaa-ai-bot' ? '🎓' : name?.charAt(0)}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.dmName} numberOfLines={1}>{name}</Text>
                    {['ADMIN', 'SUPER_ADMIN', 'EXECUTIVE', 'MODERATOR', 'YEAR_ADMIN'].includes(u.role) && (
                      <View style={[s.roleBadge, { backgroundColor: roleColor(u.role) + '33' }]}>
                        <Text style={[s.roleBadgeText, { color: roleColor(u.role) }]}>{roleLabel(u.role)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.dmPreview} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
                <Text style={s.dmTime}>{timeAgo(item.lastAt)}</Text>
              </Pressable>
            );
          }
          // group
          return (
            <Pressable style={s.groupCard} onPress={() => router.push(`/groups/${item.id}` as any)}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.groupImg} />
              ) : (
                <View style={s.groupImgPlaceholder}><Text style={s.groupImgText}>{item.year}</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.groupName}>{item.name}</Text>
                <Text style={s.groupMeta}>{item._count?.memberships ?? 0} members</Text>
              </View>
              <Text style={s.arrow}>→</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No conversations yet. Visit the Directory to find alumni.</Text></View>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.muted, fontSize: 14, textAlign: 'center' },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: theme.blue, marginBottom: 10, marginTop: 4 },
  dmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  dmAvatar: { width: 46, height: 46, borderRadius: 23 },
  dmAvatarPlaceholder: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.blue100, justifyContent: 'center', alignItems: 'center' },
  dmAvatarText: { color: theme.blue, fontWeight: '800', fontSize: 16 },
  dmName: { fontSize: 15, fontWeight: '700', color: theme.text, flexShrink: 1 },
  dmPreview: { fontSize: 13, color: theme.muted, marginTop: 3 },
  dmTime: { fontSize: 11, color: theme.muted },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  roleBadgeText: { fontSize: 9, fontWeight: '800' },
  groupCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  groupImg: { width: 46, height: 46, borderRadius: 12 },
  groupImgPlaceholder: { width: 46, height: 46, borderRadius: 12, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center' },
  groupImgText: { color: theme.blue, fontWeight: '900', fontSize: 13 },
  groupName: { fontSize: 15, fontWeight: '700', color: theme.text },
  groupMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
  arrow: { color: theme.muted, fontSize: 16 },
});
