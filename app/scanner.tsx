import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { pendingReward } from '@/utils/rewardState';
import { useRemoteConfig } from '@/hooks/use-remote-config';
import { useAuth } from '@/hooks/use-auth';

interface DynamicQRPayload {
  cafe_id: string;
  ts: number;
  nonce: string;
  sig: string;
}

function parseDynamicQR(data: string): DynamicQRPayload | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.cafe_id && parsed.ts && parsed.nonce && parsed.sig) {
      return parsed as DynamicQRPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const cfg = useRemoteConfig();
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    stamps: number;
    cafeName: string;
    isReward: boolean;
  } | null>(null);
  const isScanning = useRef(false);

  const handleGoBack = () => {
    router.back();
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="camera-off" size={64} color={cfg.brandPrimary} />
          <Text style={[styles.permissionTitle, { color: cfg.brandPrimary }]}>
            Camera Permission Required
          </Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: cfg.brandPrimary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!data || isScanning.current) return;

    isScanning.current = true;
    setIsLoading(true);

    try {
      if (__DEV__) console.log('Scanning QR code:', data);

      const authUserId = user?.id;
      if (!authUserId) {
        Alert.alert('Error', 'You must be signed in to scan.');
        isScanning.current = false;
        setIsLoading(false);
        return;
      }

      // Parse dynamic QR payload
      const payload = parseDynamicQR(data);

      if (!payload) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not a valid PerkUp code. Please ask the cashier to show the current code.',
          [
            {
              text: 'Scan Again',
              onPress: () => {
                isScanning.current = false;
                setIsLoading(false);
              },
            },
            { text: 'Go Back', onPress: handleGoBack },
          ]
        );
        return;
      }

      // Client-side pre-check: reject obviously expired codes before network call
      const ageSeconds = Math.floor(Date.now() / 1000) - payload.ts;
      if (ageSeconds > 35) {
        Alert.alert(
          'Code Expired',
          'This QR code has expired. Please ask the cashier for a fresh code.',
          [
            {
              text: 'Scan Again',
              onPress: () => {
                isScanning.current = false;
                setIsLoading(false);
              },
            },
            { text: 'Go Back', onPress: handleGoBack },
          ]
        );
        return;
      }

      // All real validation happens server-side via the RPC
      if (__DEV__) console.log('Calling validate_dynamic_scan RPC...');
      const { data: rpcResult, error: rpcError } = await supabase.rpc('validate_dynamic_scan', {
        p_payload: payload,
        p_target: cfg.stampsPerCard,
      });

      if (rpcError) {
        if (__DEV__) console.error('validate_dynamic_scan RPC error:', rpcError);
        throw new Error(`Server error: ${rpcError.message}`);
      }

      // Check for application-level errors returned by the RPC
      if (rpcResult.error) {
        const errorMap: Record<string, string> = {
          EXPIRED: 'This QR code has expired. Please ask for a new code.',
          REPLAY: 'This QR code has already been used. Please ask for a new code.',
          INVALID_SIGNATURE: 'This QR code is invalid. It may have been tampered with.',
          RATE_LIMITED: rpcResult.message || 'Please wait 15 minutes between visits.',
          UNKNOWN_CAFE: 'This cafe is not registered in our system.',
          INVALID_PAYLOAD: 'Invalid QR code format.',
        };

        const message = errorMap[rpcResult.error] || rpcResult.message || 'Scan failed.';
        Alert.alert(
          'Scan Rejected',
          message,
          [
            {
              text: 'Scan Again',
              onPress: () => {
                isScanning.current = false;
                setIsLoading(false);
              },
            },
            { text: 'Go Back', onPress: handleGoBack },
          ]
        );
        return;
      }

      // Success!
      const newStamps: number = rpcResult.new_stamps;
      const rewardsTrigger: boolean = rpcResult.is_reward;
      const cafeName: string = rpcResult.cafe_name;

      if (__DEV__) console.log('Scan success — stamps:', newStamps, 'reward:', rewardsTrigger);

      if (rewardsTrigger) {
        pendingReward.active = true;
        pendingReward.cafeName = cafeName;
        pendingReward.stampCount = newStamps;
      }

      setIsLoading(false);
      setSuccessInfo({ stamps: newStamps, cafeName, isReward: rewardsTrigger });

      setTimeout(() => {
        router.back();
      }, cfg.scanRedirectDelayMs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (__DEV__) console.error('Scan failed:', errorMessage, error);
      Alert.alert(
        'Scan Failed',
        `${errorMessage}\n\nPlease check your internet connection and try again.`,
        [
          {
            text: 'Try Again',
            onPress: () => {
              isScanning.current = false;
              setIsLoading(false);
            },
            style: 'default',
          },
          {
            text: 'Go Back',
            onPress: handleGoBack,
            style: 'cancel',
          },
        ],
        { cancelable: false }
      );
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlayLeft} />
          <View style={[styles.scanFrame, { borderColor: cfg.brandPrimary }]}>
            <View style={[styles.corner, styles.cornerTopLeft, { borderColor: cfg.brandPrimary }]} />
            <View style={[styles.corner, styles.cornerTopRight, { borderColor: cfg.brandPrimary }]} />
            <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: cfg.brandPrimary }]} />
            <View style={[styles.corner, styles.cornerBottomRight, { borderColor: cfg.brandPrimary }]} />
          </View>
          <View style={styles.overlayRight} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Success Overlay */}
      {successInfo && (
        <View style={styles.successOverlay}>
          <MaterialCommunityIcons
            name={successInfo.isReward ? 'gift-outline' : 'check-circle-outline'}
            size={80}
            color={cfg.brandPrimary}
          />
          <Text style={styles.successTitle}>
            {successInfo.isReward ? '🎉 Reward Earned!' : '✅ Stamp Added!'}
          </Text>
          <Text style={[styles.successText, { color: cfg.brandPrimary }]}>
            {successInfo.isReward
              ? `Free coffee at ${successInfo.cafeName}!`
              : `${successInfo.stamps} / ${cfg.stampsPerCard} stamps at ${successInfo.cafeName}`}
          </Text>
          <Text style={styles.successSubtext}>Returning home...</Text>
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={cfg.brandPrimary} />
          <Text style={[styles.loadingText, { color: cfg.brandPrimary }]}>Processing scan...</Text>
        </View>
      )}

      {/* Close */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleGoBack}
        disabled={isLoading}
      >
        <MaterialCommunityIcons name="close" size={28} color="white" />
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionsText, { color: cfg.brandPrimary }]}>
          {isLoading ? 'Processing...' : 'Align QR code in the frame'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  permissionTitle: {
    fontSize: 20, fontWeight: 'bold', marginTop: 16, textAlign: 'center',
  },
  permissionText: {
    fontSize: 16, color: '#666', marginTop: 8, textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 24,
  },
  permissionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: 280 },
  overlayLeft: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanFrame: { width: 280, height: 280, borderWidth: 1, position: 'relative' },
  overlayRight: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  corner: { position: 'absolute', width: 24, height: 24 },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  closeButton: {
    position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 20,
  },
  instructions: {
    position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center',
  },
  instructionsText: {
    fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', gap: 12,
  },
  successTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  successText: { fontSize: 18, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  successSubtext: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },
});
