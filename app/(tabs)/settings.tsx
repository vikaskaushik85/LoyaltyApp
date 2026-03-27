import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/use-auth';
import { useRemoteConfig } from '@/hooks/use-remote-config';
import { useAppColors } from '@/hooks/use-app-colors';
import { supabase } from '@/utils/supabase';

const FACE_ID_KEY = '@settings/faceIdEnabled';
const PROFILE_KEY = '@settings/profile';

export default function SettingsScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const cfg = useRemoteConfig();
  const colors = useAppColors();
  const router = useRouter();

  // Profile fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Face ID
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);

  useEffect(() => {
    // Auto-populate from auth user
    if (user) {
      setEmail(user.email ?? '');
      const meta = user.user_metadata;
      if (meta?.full_name) setName(meta.full_name);
      else if (meta?.name) setName(meta.name);
    }

    // Load saved profile + biometric preference
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      const stored = await AsyncStorage.getItem(FACE_ID_KEY);
      if (stored === 'true') setFaceIdEnabled(true);

      const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed.dob) setDob(parsed.dob);
          if (parsed.address) setAddress(parsed.address);
          if (parsed.mobile) setMobile(parsed.mobile);
        } catch {
          // Ignore corrupt data
        }
      }
    })();
  }, [user]);

  const toggleFaceId = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric login',
        fallbackLabel: 'Use passcode',
      });
      if (!result.success) return;
    }
    setFaceIdEnabled(value);
    await AsyncStorage.setItem(FACE_ID_KEY, String(value));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ name, dob, address, mobile }));
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error && __DEV__) console.warn('Profile metadata update failed:', error.message);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendFeedback = () => {
    if (!feedback.trim()) {
      Alert.alert('Feedback', 'Please enter your feedback first.');
      return;
    }
    Linking.openURL(`mailto:support@perkup.app?subject=App Feedback&body=${encodeURIComponent(feedback)}`);
    setFeedback('');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error } = await deleteAccount();
              if (error) {
                Alert.alert('Error', error);
                return;
              }
              await AsyncStorage.multiRemove([FACE_ID_KEY, PROFILE_KEY]);
            } catch {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const brand = cfg.brandPrimary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <MaterialCommunityIcons name="cog-outline" size={28} color={brand} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Section */}
        <Text style={[styles.sectionTitle, { color: brand }]}>Profile</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
          />

          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled, { backgroundColor: colors.inputDisabledBg, color: colors.inputDisabledText }]}
            value={email}
            editable={false}
          />

          <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={colors.textTertiary}
            value={dob}
            onChangeText={setDob}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.label, { color: colors.text }]}>Address</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBg, color: colors.inputText }]}
            placeholder="Your address"
            placeholderTextColor={colors.textTertiary}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
            textContentType="fullStreetAddress"
          />

          <Text style={[styles.label, { color: colors.text }]}>Mobile Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
            placeholder="+61 400 000 000"
            placeholderTextColor={colors.textTertiary}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />

          <Pressable
            style={[styles.saveButton, { backgroundColor: brand }, isSaving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </Pressable>
        </View>

        {/* Security Section */}
        {biometricAvailable && (
          <>
            <Text style={[styles.sectionTitle, { color: brand }]}>Security</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <MaterialCommunityIcons
                    name={Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint'}
                    size={24}
                    color={brand}
                  />
                  <Text style={[styles.switchText, { color: colors.text }]}>
                    {Platform.OS === 'ios' ? 'Face ID' : 'Biometric Login'}
                  </Text>
                </View>
                <Switch
                  value={faceIdEnabled}
                  onValueChange={toggleFaceId}
                  trackColor={{ false: '#D1D5DB', true: brand }}
                  thumbColor="white"
                />
              </View>
            </View>
          </>
        )}

        {/* Feedback Section */}
        <Text style={[styles.sectionTitle, { color: brand }]}>Feedback</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.input, styles.inputMultiline, { minHeight: 80, backgroundColor: colors.inputBg, color: colors.inputText }]}
            placeholder="Tell us what you think…"
            placeholderTextColor={colors.textTertiary}
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
          />
          <Pressable
            style={[styles.feedbackButton, { borderColor: brand }]}
            onPress={handleSendFeedback}
          >
            <MaterialCommunityIcons name="send-outline" size={18} color={brand} />
            <Text style={[styles.feedbackButtonText, { color: brand }]}>Send Feedback</Text>
          </Pressable>
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Legal */}
        <Text style={[styles.sectionTitle, { color: brand, marginTop: 20 }]}>Legal</Text>
        <Pressable
          style={[styles.legalButton, { backgroundColor: colors.card }]}
          onPress={() => router.push('/privacy-policy' as any)}
        >
          <MaterialCommunityIcons name="shield-lock-outline" size={20} color={brand} />
          <Text style={[styles.legalButtonText, { color: colors.text }]}>Privacy Policy</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
        </Pressable>

        {/* Delete Account */}
        <Pressable
          style={[styles.deleteButton, isDeleting && { opacity: 0.6 }]}
          onPress={handleDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <>
              <MaterialCommunityIcons name="account-remove-outline" size={20} color="#DC2626" />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  inputDisabled: { color: '#9CA3AF', backgroundColor: '#E5E7EB' },
  inputMultiline: { textAlignVertical: 'top', paddingTop: 14 },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
    gap: 8,
  },
  feedbackButtonText: { fontSize: 15, fontWeight: '600' },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  signOutText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  legalButtonText: { flex: 1, fontSize: 16, fontWeight: '600' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
});
