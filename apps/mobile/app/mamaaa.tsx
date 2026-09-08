import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';

export default function Mamaaa() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Akwaaba! I am Mr. Atsu, your Mamaa AI assistant. Ask me about events, elections, projects, year groups, or anything OPASS!' },
  ]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const mine = input.trim();
    setMessages(m => [...m, { role: 'user', text: mine }]);
    setInput('');
    setLoading(true);
    try {
      const d = await api('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: mine }),
      });
      setMessages(m => [...m, { role: 'assistant', text: d.message ?? d.reply ?? 'I could not complete that request.' }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, I am having trouble right now. Please try again.' }]);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <ScrollView style={s.msgList} contentContainerStyle={s.msgContent}>
        {messages.map((m, i) => (
          <View key={i} style={[s.msg, m.role === 'user' ? s.userMsg : s.botMsg]}>
            {m.role === 'assistant' && <Text style={s.botIcon}>🎓</Text>}
            <Text style={[s.msgText, m.role === 'user' ? s.userText : s.botText]}>{m.text}</Text>
          </View>
        ))}
        {loading && <View style={[s.msg, s.botMsg]}><Text style={s.botIcon}>🎓</Text><ActivityIndicator color="#0B2D6B" /></View>}
      </ScrollView>
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder="Ask Mamaa AI anything..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable style={s.sendBtn} onPress={send} disabled={loading}>
          <Text style={s.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fc' },
  msgList: { flex: 1, padding: 16 },
  msgContent: { paddingBottom: 16, gap: 10 },
  msg: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '90%' },
  userMsg: { alignSelf: 'flex-end', backgroundColor: '#0B2D6B', borderRadius: 16, borderBottomRightRadius: 4, padding: 12 },
  botMsg: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  botIcon: { fontSize: 22 },
  msgText: { fontSize: 15, lineHeight: 20 },
  userText: { color: '#fff' },
  botText: { color: '#050505' },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f7f9fc', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB', maxHeight: 100 },
  sendBtn: { backgroundColor: '#0B2D6B', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14 },
  sendText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
