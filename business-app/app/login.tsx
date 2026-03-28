import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/hooks/use-auth';
import { BRAND } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }

    setError(null);
    setIsSubmitting(true);
    try {
      const { error: authError } = await signIn(email.trim(), password);
      if (authError) setError(authError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoArea}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="store" size={44} color="white" />
            </View>
            <Text style={styles.appName}>PerkUp Business</Text>
            <Text style={styles.tagline}>Manage your cafe&apos;s loyalty program</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>

            {error && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={BRAND.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={BRAND.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={BRAND.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              editable={!isSubmitting}
            />

            <Pressable
              style={[styles.button, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </Pressable>

            {Platform.OS === 'ios' && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={async () => {
                    setError(null);
                    setIsSubmitting(true);
                    try {
                      const { error: appleError } = await signInWithApple();
                      if (appleError) setError(appleError);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: BRAND.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: BRAND.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: { fontSize: 28, fontWeight: 'bold', marginTop: 16, color: BRAND.text },
  tagline: { fontSize: 14, color: BRAND.textSecondary, marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: BRAND.card,
    borderRadius: 20,
    padding: 24,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: BRAND.text },
  label: { fontSize: 13, fontWeight: '600', color: BRAND.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: BRAND.cardLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: BRAND.text,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: BRAND.primary,
  },
  buttonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  errorText: { color: BRAND.danger, fontSize: 14, flex: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BRAND.cardLight },
  dividerText: { color: BRAND.textMuted, marginHorizontal: 12, fontSize: 13 },
  appleButton: { height: 52, width: '100%' },
});
