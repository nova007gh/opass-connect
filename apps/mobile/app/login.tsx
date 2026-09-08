import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { api } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const d = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      await AsyncStorage.setItem('opass_token', d.token);
      await AsyncStorage.setItem('opass_user', JSON.stringify(d.user));
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.logo}>
          <Text style={s.logoText}>OPASS</Text>
          <Text style={s.logoSub}>CONNECT</Text>
        </View>
        <Text style={s.tagline}>Ofori Panin Senior High School</Text>
        <Text style={s.motto}>One School. One Network. One Legacy.</Text>

        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable style={s.btn} onPress={submit} disabled={loading}>
            {loading ? (
              <Text style={s.btnText}>Signing in...</Text>
            ) : (
              <Text style={s.btnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <Text style={s.footer}>Opanin, akwaaba back to your alumni network.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B2D6B' },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  logo: { alignItems: 'center' },
  logoText: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  logoSub: { fontSize: 28, fontWeight: '700', color: '#DCE8FF', letterSpacing: 2 },
  tagline: { color: '#DCE8FF', fontSize: 14, fontWeight: '600', marginTop: 10 },
  motto: { color: '#9CB5D9', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  form: { width: '100%', maxWidth: 340, marginTop: 36 },
  label: { color: '#DCE8FF', fontSize: 13, fontWeight: '700', marginBottom: 6, marginLeft: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 16, marginBottom: 16, borderWidth: 0,
  },
  btn: {
    backgroundColor: '#F59E0B', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  footer: { color: '#9CB5D9', fontSize: 13, marginTop: 28, textAlign: 'center' },
});
