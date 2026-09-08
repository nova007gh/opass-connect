import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { api } from '../lib/api';
import { theme } from '../lib/theme';

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

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;

  return (
    <FlatList
      style={s.root}
      data={data}
      keyExtractor={x => x.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.blue} colors={[theme.blue]} />}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.muted, fontSize: 15 },
  card: { backgroundColor: theme.card, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: theme.border },
  projectImg: { width: '100%', height: 140, borderRadius: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  desc: { fontSize: 13, color: theme.muted, marginTop: 6, lineHeight: 18 },
  progressWrap: { height: 8, backgroundColor: theme.blue50, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: theme.blue, borderRadius: 4 },
  fundingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  raised: { fontSize: 16, fontWeight: '900', color: theme.blue },
  goal: { fontSize: 13, color: theme.muted },
  statusBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  fundedBadge: { backgroundColor: 'rgba(52,211,153,0.15)' },
  activeBadge: { backgroundColor: theme.blue50 },
  statusText: { fontSize: 11, fontWeight: '800' },
  fundedText: { color: theme.green },
  activeText: { color: theme.blue },
});
