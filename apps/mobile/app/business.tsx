import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { api } from '../lib/api';

export default function Business() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await api('/businesses');
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
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No businesses listed yet.</Text></View>}
      renderItem={({ item }) => (
        <View style={s.card}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={s.logo} />
          ) : (
            <View style={s.logoPlaceholder}><Text style={s.logoText}>{item.name?.charAt(0) || 'B'}</Text></View>
          )}
          <View style={s.body}>
            <Text style={s.name}>{item.name}</Text>
            {item.category && <Text style={s.category}>{item.category}</Text>}
            {item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
            {item.city && <Text style={s.location}>📍 {item.city}{item.country ? `, ${item.country}` : ''}</Text>}
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
  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  logo: { width: 56, height: 56, borderRadius: 14, marginRight: 14 },
  logoPlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#0B2D6B', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#050505' },
  category: { fontSize: 12, color: '#0B2D6B', fontWeight: '600', marginTop: 2 },
  desc: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 18 },
  location: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
});
