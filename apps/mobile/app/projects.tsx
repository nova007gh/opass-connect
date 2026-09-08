import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../lib/api';

export default function Projects() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await api('/projects');
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
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No projects yet.</Text></View>}
      renderItem={({ item }) => {
        const raised = Number(item.raisedAmount || 0);
        const goal = Number(item.goalAmount || 1);
        const pct = Math.min(100, Math.round((raised / goal) * 100));
        const funded = pct >= 100;
        return (
          <View style={s.card}>
            {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={s.projectImg} />}
            <Text style={s.title}>{item.title}</Text>
            {item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
            <View style={s.progressWrap}>
              <View style={[s.progress, { width: `${pct}%` }]} />
            </View>
            <View style={s.fundingRow}>
              <Text style={s.raised}>GHS {raised.toLocaleString()}</Text>
              <Text style={s.goal}>of GHS {goal.toLocaleString()}</Text>
            </View>
            <View style={[s.statusBadge, funded ? s.fundedBadge : s.activeBadge]}>
              <Text style={[s.statusText, funded ? s.fundedText : s.activeText]}>{funded ? 'FUNDED' : `${pct}% FUNDED`}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

import { Image } from 'react-native';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f9fc' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 15 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  projectImg: { width: '100%', height: 140, borderRadius: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#050505' },
  desc: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 18 },
  progressWrap: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: '#0B2D6B', borderRadius: 4 },
  fundingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  raised: { fontSize: 16, fontWeight: '900', color: '#0B2D6B' },
  goal: { fontSize: 13, color: '#6B7280' },
  statusBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  fundedBadge: { backgroundColor: '#ECFDF5' },
  activeBadge: { backgroundColor: '#EFF6FF' },
  statusText: { fontSize: 11, fontWeight: '800' },
  fundedText: { color: '#22C55E' },
  activeText: { color: '#0B2D6B' },
});
