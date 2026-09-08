import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../lib/api';
import { theme } from '../lib/theme';

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

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.blue} colors={[theme.blue]} />}
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
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  hero: { backgroundColor: theme.blueDark, padding: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroSub: { color: '#c7d8ff', fontSize: 14, marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: theme.blue, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.muted, fontSize: 14, textAlign: 'center' },
  card: { flexDirection: 'row', backgroundColor: theme.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  purpose: { fontSize: 15, fontWeight: '700', color: theme.text },
  date: { fontSize: 12, color: theme.muted, marginTop: 4 },
  amount: { fontSize: 16, fontWeight: '900', color: theme.blue },
  statusBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  paidBadge: { backgroundColor: 'rgba(52,211,153,0.15)' },
  pendingBadge: { backgroundColor: 'rgba(251,191,36,0.15)' },
  statusText: { fontSize: 10, fontWeight: '800' },
  paidText: { color: theme.green },
  pendingText: { color: theme.amber },
});
