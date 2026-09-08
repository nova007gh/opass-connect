import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { api } from '../lib/api';

export default function Events() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await api('/events');
      setData(d);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color="#0B2D6B" /></View>;

  const upcoming = data.filter(e => new Date(e.startsAt) >= new Date());
  const past = data.filter(e => new Date(e.startsAt) < new Date());

  return (
    <FlatList
      style={s.root}
      data={[...upcoming, ...past]}
      keyExtractor={x => x.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B2D6B']} />}
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No events yet.</Text></View>}
      ListHeaderComponent={upcoming.length > 0 ? <Text style={s.sectionLabel}>Upcoming ({upcoming.length})</Text> : undefined}
      renderItem={({ item, index }) => {
        const isUpcoming = index < upcoming.length;
        const date = new Date(item.startsAt);
        return (
          <View style={[s.card, !isUpcoming && s.pastCard]}>
            <View style={s.dateBox}>
              <Text style={s.dateDay}>{date.getDate()}</Text>
              <Text style={s.dateMonth}>{date.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardDate}>{date.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
              <Text style={s.cardVenue}>📍 {item.venue || 'Virtual / TBA'}</Text>
              {item.description && <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>}
              {isUpcoming && <View style={s.upcomingBadge}><Text style={s.upcomingText}>UPCOMING</Text></View>}
            </View>
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7f9fc' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 15 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#0B2D6B', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  pastCard: { opacity: 0.6 },
  dateBox: { width: 56, alignItems: 'center', backgroundColor: '#0B2D6B', borderRadius: 12, paddingVertical: 10, marginRight: 14 },
  dateDay: { color: '#fff', fontSize: 24, fontWeight: '900' },
  dateMonth: { color: '#DCE8FF', fontSize: 11, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#050505' },
  cardDate: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  cardVenue: { fontSize: 13, color: '#0B2D6B', marginTop: 4, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 18 },
  upcomingBadge: { marginTop: 8, backgroundColor: '#ECFDF5', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  upcomingText: { fontSize: 10, fontWeight: '800', color: '#22C55E' },
});
