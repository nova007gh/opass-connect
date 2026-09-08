import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../lib/api';

export default function Payments() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await api('/payments/history');
      setHistory(d);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#0B2D6B" /></View>;

  return (
    <View style={s.root}>
      <View style={s.hero}>
        <Text style={s.heroTitle}>Dues & Payments</Text>
        <Text style={s.heroSub}>Support OPASS and stay current</Text>
      </View>
      <Text style={s.sectionLabel}>Payment History</Text>
      <FlatList
        data={history}
        keyExtractor={x => x.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B2D6B']} />}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No payments yet. Your dues help fund school projects.</Text></View>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardLeft}>
              <Text style={s.purpose}>{item.purpose}</Text>
              <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
            <View style={s.cardRight}>
              <Text style={s.amount}>{item.currency} {Number(item.amount).toLocaleString()}</Text>
              <View style={[s.statusBadge, item.status === 'PAID' ? s.paidBadge : s.pendingBadge]}>
                <Text style={[s.statusText, item.status === 'PAID' ? s.paidText : s.pendingText]}>{item.status}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f9fc' },
  hero: { backgroundColor: '#0B2D6B', padding: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroSub: { color: '#DCE8FF', fontSize: 14, marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#0B2D6B', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  purpose: { fontSize: 15, fontWeight: '700', color: '#050505' },
  date: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  amount: { fontSize: 16, fontWeight: '900', color: '#0B2D6B' },
  statusBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  paidBadge: { backgroundColor: '#ECFDF5' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 10, fontWeight: '800' },
  paidText: { color: '#22C55E' },
  pendingText: { color: '#D97706' },
});
