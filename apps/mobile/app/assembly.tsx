import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, Pressable, RefreshControl } from 'react-native';
import { api } from '../lib/api';
import { theme } from '../lib/theme';

export default function Assembly() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = async () => {
    try {
      const d = await api('/chat/rooms');
      setRooms(d);
    } catch {}
    setLoading(false);
  };

  const loadMessages = async (roomId: string) => {
    try {
      const d = await api(`/chat/rooms/${roomId}/messages?limit=50`);
      setMessages(d.reverse());
    } catch {}
  };

  useEffect(() => { loadRooms(); }, []);

  const openRoom = (room: any) => {
    setActiveRoom(room);
    loadMessages(room.id);
  };

  const send = async () => {
    if (!input.trim() || !activeRoom) return;
    setSending(true);
    try {
      await api(`/chat/rooms/${activeRoom.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: input.trim() }),
      });
      setInput('');
      loadMessages(activeRoom.id);
    } catch {}
    setSending(false);
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;

  if (activeRoom) {
    return (
      <View style={s.root}>
        <Pressable style={s.backBtn} onPress={() => { setActiveRoom(null); setMessages([]); }}>
          <Text style={s.backText}>← Back to rooms</Text>
        </Pressable>
        <Text style={s.roomTitle}>{activeRoom.name}</Text>
        <FlatList
          style={s.msgList}
          data={messages}
          keyExtractor={x => x.id}
          inverted
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMessages(activeRoom.id)} tintColor={theme.blue} colors={[theme.blue]} />}
          ListEmptyComponent={<Text style={s.emptyMsg}>No messages yet. Say akwaaba!</Text>}
          renderItem={({ item }) => (
            <View style={[s.msg, item.userId === 'mamaaa-ai-bot' && s.botMsg]}>
              <Text style={s.msgName}>{item.user?.profile?.fullName || 'Someone'}</Text>
              <Text style={s.msgBody}>{item.body}</Text>
              <Text style={s.msgTime}>{new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
          )}
        />
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Type a message..."
            placeholderTextColor={theme.muted}
            value={input}
            onChangeText={setInput}
          />
          <Pressable style={s.sendBtn} onPress={send} disabled={sending}>
            <Text style={s.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={s.root}
      data={rooms}
      keyExtractor={x => x.id}
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No chat rooms yet.</Text></View>}
      ListHeaderComponent={<Text style={s.sectionLabel}>Chat Rooms ({rooms.length})</Text>}
      renderItem={({ item }) => (
        <Pressable style={s.card} onPress={() => openRoom(item)}>
          <View style={s.roomIcon}><Text style={s.roomIconText}>💬</Text></View>
          <View style={s.cardBody}>
            <Text style={s.cardName}>{item.name}</Text>
            <Text style={s.cardCount}>{item._count?.messages ?? 0} messages</Text>
          </View>
          <Text style={s.arrow}>→</Text>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.muted, fontSize: 15 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: theme.blue, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  card: { flexDirection: 'row', backgroundColor: theme.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, alignItems: 'center' },
  roomIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.blue50, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  roomIconText: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '800', color: theme.text },
  cardCount: { fontSize: 13, color: theme.muted, marginTop: 4 },
  arrow: { fontSize: 20, color: theme.muted },
  backBtn: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backText: { color: theme.blue, fontSize: 15, fontWeight: '700' },
  roomTitle: { fontSize: 20, fontWeight: '900', color: theme.text, paddingHorizontal: 16, paddingBottom: 8 },
  msgList: { flex: 1, paddingHorizontal: 16 },
  emptyMsg: { textAlign: 'center', color: theme.muted, padding: 20 },
  msg: { backgroundColor: theme.card, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  botMsg: { backgroundColor: theme.blue50, borderColor: theme.border },
  msgName: { fontSize: 13, fontWeight: '700', color: theme.blue },
  msgBody: { fontSize: 14, color: theme.text, marginTop: 4, lineHeight: 20 },
  msgTime: { fontSize: 11, color: theme.muted, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 },
  input: { flex: 1, backgroundColor: theme.bg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: theme.border, color: theme.text },
  sendBtn: { backgroundColor: theme.blueBright, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
