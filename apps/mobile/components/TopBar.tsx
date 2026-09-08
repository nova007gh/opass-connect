import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { theme } from '../lib/theme';

export default function TopBar({ title, avatarUrl, initial, onMenuPress }: { title: string; avatarUrl?: string; initial?: string; onMenuPress?: () => void }) {
  return (
    <View style={s.root}>
      <Pressable style={s.iconBtn} onPress={onMenuPress || (() => router.push('/(tabs)/menu'))}>
        <Text style={s.hamburger}>☰</Text>
      </Pressable>
      <Text style={s.title}>{title}</Text>
      <View style={s.right}>
        <Pressable style={s.iconBtn} onPress={() => router.push('/(tabs)/notifications')}>
          <Text style={s.icon}>🔔</Text>
        </Pressable>
        <Pressable style={s.avatarBtn} onPress={() => router.push('/profile')}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarText}>{initial || 'U'}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(20,20,38,0.95)',
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  iconBtn: { padding: 6 },
  hamburger: { fontSize: 22, color: theme.blue },
  icon: { fontSize: 18, color: theme.blue },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: theme.blue, marginLeft: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarBtn: { marginLeft: 4 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: theme.blue, fontWeight: '800', fontSize: 13 },
});
