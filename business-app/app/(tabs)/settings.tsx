import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useCafe } from '@/hooks/use-cafe';
import { BRAND } from '@/constants/theme';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { cafe } = useCafe();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="cog-outline" size={28} color={BRAND.primary} />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Account Info */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email ?? 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={[styles.infoValue, { fontSize: 12 }]}>{user?.id ?? 'N/A'}</Text>
          </View>
        </View>

        {/* Cafe Info */}
        <Text style={styles.sectionTitle}>Cafe</Text>
        <View style={styles.card}>
          {cafe ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{cafe.name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cafe ID</Text>
                <Text style={[styles.infoValue, { fontSize: 12 }]}>{cafe.id}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>QR Secret</Text>
                <Text style={[styles.infoValue, { fontSize: 12 }]}>
                  {cafe.qr_secret.slice(0, 8)}...{cafe.qr_secret.slice(-4)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noData}>No cafe linked to this account</Text>
          )}
        </View>

        {/* Security Info */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <View style={styles.securityRow}>
            <MaterialCommunityIcons name="shield-check" size={20} color={BRAND.success} />
            <Text style={styles.securityText}>HMAC-SHA256 signed QR codes</Text>
          </View>
          <View style={styles.securityRow}>
            <MaterialCommunityIcons name="timer-outline" size={20} color={BRAND.success} />
            <Text style={styles.securityText}>30-second code expiry</Text>
          </View>
          <View style={styles.securityRow}>
            <MaterialCommunityIcons name="content-copy" size={20} color={BRAND.success} />
            <Text style={styles.securityText}>Single-use nonce (replay protection)</Text>
          </View>
          <View style={styles.securityRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={BRAND.success} />
            <Text style={styles.securityText}>15-minute per-user rate limit</Text>
          </View>
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialCommunityIcons name="logout" size={20} color={BRAND.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: BRAND.card,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: BRAND.text },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
    color: BRAND.primary,
  },
  card: {
    backgroundColor: BRAND.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: { fontSize: 14, color: BRAND.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: BRAND.text, flexShrink: 1 },
  divider: { height: 1, backgroundColor: BRAND.cardLight, marginVertical: 12 },
  noData: { fontSize: 14, color: BRAND.textMuted, textAlign: 'center' },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  securityText: { fontSize: 14, color: BRAND.text },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  signOutText: { color: BRAND.danger, fontSize: 16, fontWeight: '700' },
});
