import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
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

const FACE_ID_KEY = '@settings/faceIdEnabled';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const cfg = useRemoteConfig();

  // Profile fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [feedback, setFeedback] = useState('');

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

    // Check biometric availability
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      const stored = await AsyncStorage.getItem(FACE_ID_KEY);
      if (stored === 'true') setFaceIdEnabled(true);
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

  const handleSave = () => {
    Alert.alert('Saved', 'Your profile has been updated.');
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

  const brand = cfg.brandPrimary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cfg.backgroundLight }]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="cog-outline" size={28} color={brand} />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Section */}
        <Text style={[styles.sectionTitle, { color: brand }]}>Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#9CA3AF"
            value={dob}
            onChangeText={setDob}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Your address"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
            textContentType="fullStreetAddress"
          />

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+61 400 000 000"
            placeholderTextColor="#9CA3AF"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />

          <Pressable style={[styles.saveButton, { backgroundColor: brand }]} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </Pressable>
        </View>

        {/* Security Section */}
        {biometricAvailable && (
          <>
            <Text style={[styles.sectionTitle, { color: brand }]}>Security</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <MaterialCommunityIcons
                    name={Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint'}
                    size={24}
                    color={brand}
                  />
                  <Text style={styles.switchText}>
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
        <View style={styles.card}>
          <TextInput
            style={[styles.input, styles.inputMultiline, { minHeight: 80 }]}
            placeholder="Tell us what you think…"
            placeholderTextColor="#9CA3AF"
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
});
