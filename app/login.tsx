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
import { DEFAULT_CONFIG } from '@/constants/remote-config-defaults';
import { PerkUpLogo } from '@/components/perkup-logo';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { signIn, signUp, signInWithApple } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const brand = DEFAULT_CONFIG.brandPrimary;
  const brandDark = DEFAULT_CONFIG.brandPrimaryDark;

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (mode === 'register' && password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error: authError } = await signIn(email.trim(), password);
        if (authError) setError(authError);
      } else {
        const { error: authError } = await signUp(email.trim(), password);
        if (authError) {
          setError(authError);
        } else {
          setShowSuccess(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
    setShowSuccess(false);
    setConfirmPassword('');
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: DEFAULT_CONFIG.backgroundLight }]}>
        <View style={styles.successContainer}>
          <MaterialCommunityIcons name="email-check-outline" size={72} color={brand} />
          <Text style={styles.successTitle}>Check your email!</Text>
          <Text style={styles.successText}>
            We sent a confirmation link to {email}. Please verify your email to sign in.
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: brand }]}
            onPress={() => {
              setShowSuccess(false);
              setMode('login');
            }}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: DEFAULT_CONFIG.backgroundLight }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Branding */}
          <View style={styles.logoArea}>
            <PerkUpLogo size={88} color={brand} />
            <Text style={[styles.appName, { color: brandDark }]}>
              {DEFAULT_CONFIG.appName}
            </Text>
            <Text style={styles.tagline}>
              {mode === 'login'
                ? 'Sign in to collect stamps & rewards'
                : 'Create an account to get started'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: brandDark }]}>
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </Text>

            {error && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={mode === 'register' ? 'newPassword' : 'password'}
              editable={!isSubmitting}
            />

            {mode === 'register' && (
              <>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  editable={!isSubmitting}
                />
              </>
            )}

            <Pressable
              style={[styles.button, { backgroundColor: brand }, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'login' ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </Pressable>

            {/* Apple Sign-In */}
            {Platform.OS === 'ios' && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
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

          {/* Toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <Pressable onPress={toggleMode} disabled={isSubmitting}>
              <Text style={[styles.toggleLink, { color: brand }]}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  /* Logo */
  logoArea: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 28, fontWeight: 'bold', marginTop: 16 },
  tagline: { fontSize: 14, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  /* Card */
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 },
  /* Apple */
  appleButton: { width: '100%', height: 52, marginTop: 16 },
  /* Error */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  errorText: { color: '#DC2626', fontSize: 13, marginLeft: 8, flex: 1 },
  /* Toggle */
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  toggleText: { color: '#6B7280', fontSize: 14 },
  toggleLink: { fontSize: 14, fontWeight: '700' },
  /* Success */
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 20 },
  successText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    marginBottom: 32,
  },
});
