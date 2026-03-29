import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useCafe } from '@/hooks/use-cafe';
import { generateDynamicQR } from '@/utils/qr-crypto';
import { BRAND } from '@/constants/theme';

const QR_REFRESH_INTERVAL = 5000; // Refresh every 5s for smooth UX
const QR_LIFETIME_SECONDS = 30;   // Server accepts codes up to 30s old

export default function QRGeneratorScreen() {
  const { cafe, isLoading: cafeLoading } = useCafe();
  const [qrData, setQrData] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME_SECONDS);
  const [isGenerating, setIsGenerating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const generateCode = useCallback(async () => {
    if (!cafe) return;
    setIsGenerating(true);
    try {
      const data = await generateDynamicQR(cafe.id, cafe.qr_secret);
      setQrData(data);
      setSecondsLeft(QR_LIFETIME_SECONDS);
    } catch (err) {
      if (__DEV__) console.error('QR generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [cafe]);

  // Generate on mount and set up auto-refresh
  useEffect(() => {
    if (!cafe) return;

    generateCode();
    intervalRef.current = setInterval(generateCode, QR_REFRESH_INTERVAL);

    // Countdown timer (ticks every second)
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [cafe, generateCode]);

  // Pulse animation when < 10 seconds remain
  useEffect(() => {
    if (secondsLeft <= 10 && secondsLeft > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [secondsLeft, pulseAnim]);

  if (cafeLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading your cafe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cafe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="store-alert-outline" size={64} color={BRAND.textMuted} />
          <Text style={styles.noDataTitle}>No Cafe Linked</Text>
          <Text style={styles.noDataText}>
            Your account is not linked to a cafe yet.{'\n'}
            Contact PerkUp support to get set up.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="qrcode" size={28} color={BRAND.primary} />
        <Text style={styles.headerTitle}>{cafe.name}</Text>
      </View>

      <View style={styles.content}>
        {/* QR Code Card */}
        <Animated.View style={[styles.qrCard, { transform: [{ scale: pulseAnim }] }]}>
          {qrData ? (
            <QRCode
              value={qrData}
              size={260}
              backgroundColor="white"
              color={BRAND.background}
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <ActivityIndicator size="large" color={BRAND.primary} />
            </View>
          )}
        </Animated.View>

        {/* Timer */}
        <View style={styles.timerRow}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={20}
            color={secondsLeft <= 10 ? BRAND.warning : BRAND.textSecondary}
          />
          <Text
            style={[
              styles.timerText,
              secondsLeft <= 10 && { color: BRAND.warning },
            ]}
          >
            Refreshes in {secondsLeft}s
          </Text>
          {isGenerating && (
            <ActivityIndicator size="small" color={BRAND.primary} style={{ marginLeft: 8 }} />
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <MaterialCommunityIcons name="shield-check-outline" size={24} color={BRAND.success} />
          <View style={styles.instructionTextContainer}>
            <Text style={styles.instructionTitle}>Secure Dynamic Code</Text>
            <Text style={styles.instructionBody}>
              This code refreshes automatically every 5 seconds. Each code can only
              be used once and expires after 30 seconds. Customers cannot reuse or
              share photos of this code.
            </Text>
          </View>
        </View>

        {/* Rate Limit Info */}
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={BRAND.textMuted} />
          <Text style={styles.infoText}>
            Each customer can only scan once every 15 minutes
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 16, color: BRAND.textSecondary },
  noDataTitle: { fontSize: 20, fontWeight: 'bold', color: BRAND.text, marginTop: 16 },
  noDataText: { fontSize: 15, color: BRAND.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: BRAND.card,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: BRAND.text },
  content: { flex: 1, alignItems: 'center', paddingTop: 24, paddingHorizontal: 20 },
  qrCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  qrPlaceholder: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.textSecondary,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: BRAND.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  instructionTextContainer: { flex: 1 },
  instructionTitle: { fontSize: 15, fontWeight: '700', color: BRAND.text },
  instructionBody: { fontSize: 13, color: BRAND.textSecondary, marginTop: 4, lineHeight: 20 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  infoText: { fontSize: 13, color: BRAND.textMuted },
});
