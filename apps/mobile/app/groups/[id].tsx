import { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { theme } from '../../lib/theme';

const MAMAAA_ID = 'mamaaa-ai-bot';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = async () => {
    try {
      const [g, mem, r] = await Promise.all([
        api(`/year-groups/${id}`),
        api(`/year-groups/${id}/members`).catch(() => []),
        api(`/year-groups/${id}/chat-room`).catch(() => null),
      ]);
      setGroup(g);
      setMembers(mem);
      setRoom(r);
      if (r?.id) {
        const msgs = await api(`/chat/rooms/${r.id}/messages?limit=50`);
        setMessages(msgs.reverse());
      }
    } catch {}
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [id]));

  const send = async () => {
    if (!input.trim() || !room?.id) return;
    setSending(true);
    const body = input.trim();
    setInput('');
    try {
      await api(`/chat/rooms/${room.id}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
      const msgs = await api(`/chat/rooms/${room.id}/messages?limit=50`);
      setMessages(msgs.reverse());
    } catch {}
    setSending(false);
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;
  if (!group) return <View style={s.loading}><Text style={{ color: theme.text }}>Group not found</Text></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.breadcrumb}>Home <Text style={s.crumbSep}>›</Text> Groups <Text style={s.crumbSep}>›</Text> <Text style={s.crumbActive}>{group.name}</Text></Text>
        </View>
        {group.canManage && (
          <Pressable style={s.manageBtn}><Text style={s.manageText}>Manage</Text></Pressable>
        )}
      </View>

      {/* Group info card */}
      <View style={s.infoCard}>
        <View style={s.infoRow}>
          {group.imageUrl ? (
            <Image source={{ uri: group.imageUrl }} style={s.cover} />
          ) : (
            <View style={s.coverPlaceholder}><Text style={s.coverText}>{group.year}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.groupName}>{group.name}</Text>
            <Text style={s.groupMeta}>{group._count?.memberships ?? 0} members</Text>
            {group.description ? <Text style={s.groupDesc} numberOfLines={2}>{group.description}</Text> : null}
          </View>
        </View>
        <View style={s.memberRow}>
          <View style={s.memberStack}>
            {members.slice(0, 4).map((m, i) => (
              <View key={m.id} style={[s.memberAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }]}>
                {m.profile?.avatarUrl ? (
                  <Image source={{ uri: m.profile.avatarUrl }} style={s.memberAvatarImg} />
                ) : (
                  <Text style={s.memberAvatarText}>{m.profile?.fullName?.charAt(0) || '?'}</Text>
                )}
              </View>
            ))}
            {members.length > 4 && (
              <View style={[s.memberAvatar, { marginLeft: -10 }]}><Text style={s.memberAvatarText}>+{members.length - 4}</Text></View>
            )}
          </View>
          <View style={s.callIcons}>
            <Pressable style={s.callIcon}><Text>📞</Text></Pressable>
            <Pressable style={s.callIcon}><Text>🎥</Text></Pressable>
            <Pressable style={s.callIcon}><Text>⛶</Text></Pressable>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={s.emptyMsg}>No messages yet. Say akwaaba!</Text>}
        renderItem={({ item }) => {
          const isBot = item.userId === MAMAAA_ID;
          return (
            <View style={[s.msgRow, isBot && s.botMsgRow]}>
              <View style={s.msgAvatar}><Text style={{ fontSize: 14 }}>{isBot ? '🎓' : (item.user?.profile?.fullName?.charAt(0) || '?')}</Text></View>
              <View style={[s.msgBubble, isBot && s.botBubble]}>
                {!isBot && <Text style={s.msgName}>{item.user?.profile?.fullName || 'Someone'}</Text>}
                <Text style={s.msgBody}>{item.body}</Text>
                <Text style={s.msgTime}>{new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={s.inputBar}>
        <Pressable style={s.inputIcon}><Text style={{ fontSize: 18 }}>📎</Text></Pressable>
        <Pressable style={s.inputIcon}><Text style={{ fontSize: 18 }}>⚡</Text></Pressable>
        <Pressable style={s.inputIcon}><Text style={{ fontSize: 18 }}>😊</Text></Pressable>
        <TextInput
          style={s.input}
          placeholder="Type a message..."
          placeholderTextColor={theme.muted}
          value={input}
          onChangeText={setInput}
        />
        <Pressable style={s.sendBtn} onPress={send} disabled={sending}>
          <Text style={{ fontSize: 16 }}>{input.trim() ? '➤' : '🎤'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.chatBg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingTop: 50, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 26, color: theme.blue },
  breadcrumb: { fontSize: 13, color: theme.muted },
  crumbSep: { color: theme.muted },
  crumbActive: { color: theme.blue, fontWeight: '700' },
  manageBtn: { backgroundColor: theme.blueBright, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  manageText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  infoCard: { backgroundColor: theme.card, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cover: { width: 48, height: 48, borderRadius: 12 },
  coverPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center' },
  coverText: { color: theme.blue, fontWeight: '900' },
  groupName: { fontSize: 16, fontWeight: '800', color: theme.text },
  groupMeta: { fontSize: 12, color: theme.muted, marginTop: 2 },
  groupDesc: { fontSize: 12, color: theme.muted, marginTop: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  memberStack: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.blue100, borderWidth: 2, borderColor: theme.card, justifyContent: 'center', alignItems: 'center' },
  memberAvatarImg: { width: '100%', height: '100%', borderRadius: 15 },
  memberAvatarText: { color: theme.blue, fontSize: 11, fontWeight: '800' },
  callIcons: { flexDirection: 'row', gap: 16 },
  callIcon: { padding: 4 },
  emptyMsg: { textAlign: 'center', color: theme.muted, marginTop: 20 },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  botMsgRow: { alignItems: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center' },
  msgBubble: { backgroundColor: theme.card, borderRadius: 14, padding: 10, maxWidth: '78%', borderWidth: 1, borderColor: theme.border },
  botBubble: { backgroundColor: theme.blue50 },
  msgName: { fontSize: 12, fontWeight: '700', color: theme.blue, marginBottom: 3 },
  msgBody: { fontSize: 14, color: theme.text, lineHeight: 20 },
  msgTime: { fontSize: 10, color: theme.muted, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, gap: 4 },
  inputIcon: { padding: 8 },
  input: { flex: 1, backgroundColor: theme.blue50, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: theme.text, marginHorizontal: 4 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.blueBright, justifyContent: 'center', alignItems: 'center' },
});
