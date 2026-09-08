import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { theme } from '../../lib/theme';
import TopBar from '../../components/TopBar';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const typeIcon: Record<string, string> = {
  CHAT: '💬', SYSTEM: '⚙️', EVENT: '📅', PROJECT: '🏗️', PAYMENT: '💳', ELECTION: '🛡️',
};

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [d, user] = await Promise.all([api('/notifications'), api('/auth/me').catch(() => null)]);
      setItems(d);
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
      <TopBar title="Notifications" avatarUrl={me?.profile?.avatarUrl} initial={me?.profile?.fullName?.charAt(0)} />
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.blue} colors={[theme.blue]} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No notifications yet.</Text></View>}
        renderItem={({ item }) => (
          <Pressable style={[s.card, !item.read && s.unreadCard]} onPress={() => item.link && router.push(item.link as any)}>
            <View style={s.icon}><Text style={{ fontSize: 18 }}>{typeIcon[item.type] || '🔔'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.body} numberOfLines={2}>{item.body}</Text>
              <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={s.dot} />}
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
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: theme.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  unreadCard: { borderColor: theme.blue },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.blue50, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: theme.text },
  body: { fontSize: 13, color: theme.muted, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 11, color: theme.muted, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.blue, marginTop: 4 },
});
