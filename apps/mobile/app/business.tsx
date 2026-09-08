import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { api } from '../lib/api';
import { theme } from '../lib/theme';

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

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;

  return (
    <FlatList
      style={s.root}
      data={data}
      keyExtractor={x => x.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.blue} colors={[theme.blue]} />}
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
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.muted, fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: theme.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border },
  logo: { width: 56, height: 56, borderRadius: 14, marginRight: 14 },
  logoPlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: theme.text },
  category: { fontSize: 12, color: theme.blue, fontWeight: '600', marginTop: 2 },
  desc: { fontSize: 13, color: theme.muted, marginTop: 6, lineHeight: 18 },
  location: { fontSize: 12, color: theme.muted, marginTop: 6 },
});
