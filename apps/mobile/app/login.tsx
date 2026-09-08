import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { theme } from '../lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
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
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.crest}><Text style={s.crestText}>OP</Text></View>
        <Text style={s.brand}>OPASS CONNECT</Text>
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to continue connecting with OPASS alumni.</Text>

        <View style={s.form}>
          <Text style={s.label}>Email Address</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>✉️</Text>
            <TextInput
              style={s.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={theme.muted}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={s.label}>Password</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>🔒</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={theme.muted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword(v => !v)}>
              <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>

          <View style={s.row}>
            <Pressable style={s.rememberRow} onPress={() => setRemember(v => !v)}>
              <View style={[s.checkbox, remember && s.checkboxChecked]}>
                {remember && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.rememberText}>Remember me</Text>
            </Pressable>
            <Pressable onPress={() => Alert.alert('Forgot Password', 'Please contact an OPASS administrator to reset your password.')}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable style={s.btn} onPress={submit} disabled={loading}>
            <Text style={s.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </Pressable>

          <Pressable onPress={() => Alert.alert('Sign Up', 'Please visit opass-connect.vercel.app to create an account, or ask an administrator to add you.')}>
            <Text style={s.signupText}>Don't have an account? <Text style={s.signupLink}>Sign up</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  container: { flexGrow: 1, alignItems: 'center', padding: 28, paddingTop: 60 },
  crest: { width: 84, height: 84, borderRadius: 22, backgroundColor: theme.blueDark, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: theme.border },
  crestText: { color: theme.blue, fontWeight: '900', fontSize: 24 },
  brand: { fontSize: 22, fontWeight: '900', color: theme.text, letterSpacing: 1 },
  brandDot: { color: theme.blue },
  title: { fontSize: 22, fontWeight: '800', color: theme.blue, marginTop: 14 },
  subtitle: { fontSize: 13, color: theme.muted, marginTop: 6, textAlign: 'center' },
  form: { width: '100%', maxWidth: 360, marginTop: 28 },
  label: { color: theme.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 18, gap: 10,
  },
  inputIcon: { fontSize: 15 },
  input: { flex: 1, color: theme.text, fontSize: 15, paddingVertical: 12 },
  eyeIcon: { fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: theme.muted, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: theme.blueBright, borderColor: theme.blueBright },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '900' },
  rememberText: { color: theme.text, fontSize: 13 },
  forgotText: { color: theme.blue, fontSize: 13, fontWeight: '700' },
  btn: { backgroundColor: theme.blueBright, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  signupText: { color: theme.muted, fontSize: 13, textAlign: 'center', marginTop: 20 },
  signupLink: { color: theme.blue, fontWeight: '700' },
});
