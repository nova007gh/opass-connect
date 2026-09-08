import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../lib/api';

export default function Elections() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await api('/elections');
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
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No active elections.</Text></View>}
      renderItem={({ item }) => (
        <View style={s.card}>
          <Text style={s.title}>{item.title}</Text>
          {item.description && <Text style={s.desc}>{item.description}</Text>}
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Candidates</Text>
            <Text style={s.infoValue}>{item._count?.candidates ?? 0}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Votes cast</Text>
            <Text style={s.infoValue}>{item._count?.votes ?? 0}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Status</Text>
            <Text style={[s.infoValue, { color: item.status === 'OPEN' ? '#22C55E' : '#6B7280' }]}>{item.status}</Text>
          </View>
          {item.endsAt && <Text style={s.endsAt}>Ends: {new Date(item.endsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>}
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
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 17, fontWeight: '800', color: '#050505' },
  desc: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginTop: 10 },
  infoLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#050505', fontWeight: '700' },
  endsAt: { fontSize: 12, color: '#9CA3AF', marginTop: 10 },
});
