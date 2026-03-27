import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRemoteConfig } from '@/hooks/use-remote-config';
import { useAppColors } from '@/hooks/use-app-colors';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const cfg = useRemoteConfig();
  const colors = useAppColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: colors.textTertiary }]}>Last updated: March 2026</Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {cfg.appName} collects the following information when you create an account and use our services:{'\n\n'}
          • Email address (for account authentication){'\n'}
          • Name, date of birth, address, and mobile number (optional profile fields){'\n'}
          • Loyalty stamp and reward activity{'\n'}
          • Device information for biometric authentication preferences
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. How We Use Your Information</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We use your information to:{'\n\n'}
          • Provide and maintain the loyalty stamp service{'\n'}
          • Authenticate your identity and secure your account{'\n'}
          • Track your stamps and rewards across participating cafes{'\n'}
          • Send service-related communications
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Data Storage & Security</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your data is securely stored using Supabase with industry-standard encryption. We use Row Level Security (RLS) to ensure you can only access your own data. Biometric data never leaves your device.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Third-Party Services</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We use the following third-party services:{'\n\n'}
          • Supabase (database and authentication){'\n'}
          • Apple Sign-In (optional authentication){'\n\n'}
          These services have their own privacy policies governing their use of your data.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Your Rights</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          You have the right to:{'\n\n'}
          • Access your personal data{'\n'}
          • Correct inaccurate data{'\n'}
          • Delete your account and associated data{'\n'}
          • Export your data{'\n\n'}
          You can delete your account from the Settings screen at any time.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Data Retention</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We retain your data for as long as your account is active. When you delete your account, all personal data is permanently removed within 30 days.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Contact Us</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If you have questions about this privacy policy, contact us at support@perkup.app.
        </Text>

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
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  updated: { fontSize: 13, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 24 },
});
