import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../lib/api';

export default function Groups() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await api('/year-groups');
      setData(d);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#0B2D6B" /></View>;

  return (
    <FlatList
      style={s.root}
      data={data}
      keyExtractor={x => x.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B2D6B']} />}
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No year groups yet.</Text></View>}
      renderItem={({ item }) => (
        <View style={s.card}>
          <View style={s.yearBadge}>
            <Text style={s.yearText}>{item.year}</Text>
          </View>
          <View style={s.body}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.members}>{item._count?.memberships ?? 0} members</Text>
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f9fc' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  yearBadge: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#0B2D6B', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  yearText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#050505' },
  members: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});
