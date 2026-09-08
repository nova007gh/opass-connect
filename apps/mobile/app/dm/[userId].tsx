import { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { theme, roleColor, roleLabel } from '../../lib/theme';

export default function DMChat() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [otherUser, setOtherUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [meId, setMeId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = async () => {
    try {
      const [d, me] = await Promise.all([api(`/dm/${userId}`), api('/auth/me').catch(() => null)]);
      setOtherUser(d.user);
      setMessages(d.messages);
      setMeId(me?.id || '');
    } catch {}
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [userId]));

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    const body = input.trim();
    setInput('');
    try {
      await api(`/dm/${userId}`, { method: 'POST', body: JSON.stringify({ body }) });
      const d = await api(`/dm/${userId}`);
      setMessages(d.messages);
    } catch {}
    setSending(false);
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={theme.blue} /></View>;
  if (!otherUser) return <View style={s.loading}><Text style={{ color: theme.text }}>User not found</Text></View>;

  const name = otherUser.profile?.fullName || otherUser.email;
  const isBot = userId === 'mamaaa-ai-bot';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        {otherUser.profile?.avatarUrl ? (
          <Image source={{ uri: otherUser.profile.avatarUrl }} style={s.headerAvatar} />
        ) : (
          <View style={[s.headerAvatarPlaceholder, isBot && { backgroundColor: theme.blueDark }]}>
            <Text style={s.headerAvatarText}>{isBot ? '🎓' : name?.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{name}</Text>
          {otherUser.role && ['ADMIN', 'SUPER_ADMIN', 'EXECUTIVE', 'MODERATOR', 'YEAR_ADMIN'].includes(otherUser.role) && (
            <Text style={[s.headerRole, { color: roleColor(otherUser.role) }]}>{roleLabel(otherUser.role)}</Text>
          )}
        </View>
        {!isBot && (
          <View style={s.callIcons}>
            <Pressable style={s.callIcon}><Text>📞</Text></Pressable>
            <Pressable style={s.callIcon}><Text>🎥</Text></Pressable>
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={s.emptyMsg}>Say akwaaba to start the conversation!</Text>}
        renderItem={({ item }) => {
          const mine = item.senderId === meId;
          return (
            <View style={[s.msgRow, mine && s.msgRowMine]}>
              <View style={[s.msgBubble, mine ? s.myBubble : s.theirBubble]}>
                <Text style={[s.msgBody, mine && { color: '#fff' }]}>{item.body}</Text>
                <Text style={[s.msgTime, mine && { color: 'rgba(255,255,255,0.7)' }]}>
                  {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
      />

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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingTop: 50, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 26, color: theme.blue },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.blue100, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: theme.blue, fontWeight: '800' },
  headerName: { fontSize: 15, fontWeight: '800', color: theme.text },
  headerRole: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  callIcons: { flexDirection: 'row', gap: 14 },
  callIcon: { padding: 4 },
  emptyMsg: { textAlign: 'center', color: theme.muted, marginTop: 20 },
  msgRow: { flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgBubble: { borderRadius: 16, padding: 12, maxWidth: '78%' },
  theirBubble: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderBottomLeftRadius: 4 },
  myBubble: { backgroundColor: theme.blueBright, borderBottomRightRadius: 4 },
  msgBody: { fontSize: 14, color: theme.text, lineHeight: 20 },
  msgTime: { fontSize: 10, color: theme.muted, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, gap: 4 },
  inputIcon: { padding: 8 },
  input: { flex: 1, backgroundColor: theme.blue50, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: theme.text, marginHorizontal: 4 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.blueBright, justifyContent: 'center', alignItems: 'center' },
});
