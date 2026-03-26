import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { pendingReward } from '@/utils/rewardState';
import { useRemoteConfig } from '@/hooks/use-remote-config';
import { useAuth } from '@/hooks/use-auth';

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
  // Synchronous ref guard — unlike useState, this updates immediately and
  // prevents the native camera from firing a second DB insert before React
  // has had a chance to re-render.
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

    isScanning.current = true; // Blocks re-entrant calls before any await
    setIsLoading(true);

    try {
      console.log('🔍 Scanning QR code:', data);

      // 1. Find cafe by QR code
      const { data: cafe, error: cafeError } = await supabase
        .from('cafes')
        .select('*')
        .eq('qr_code', data)
        .single();

      if (cafeError) {
        console.error('❌ Cafe lookup error:', cafeError);
        Alert.alert(
          'Unknown QR Code',
          `This QR code is not registered in our system.\nScanned: ${data}\n\nError: ${cafeError.message}`,
          [
            {
              text: 'Scan Again',
              onPress: () => {
                isScanning.current = false;
                setIsLoading(false);
              },
              style: 'default',
            },
            {
              text: 'Go Back',
              onPress: handleGoBack,
            },
          ]
        );
        return;
      }

      if (!cafe) {
        console.error('❌ Cafe not found for QR:', data);
        Alert.alert(
          'Cafe Not Found',
          `No cafe registered with code: ${data}`,
          [
            {
              text: 'Scan Again',
              onPress: () => {
                isScanning.current = false;
                setIsLoading(false);
              },
            },
          ]
        );
        return;
      }

      console.log('✅ Cafe found:', cafe.name);

      // 2. Use the authenticated user's ID
      const authUserId = user?.id;
      if (!authUserId) {
        Alert.alert('Error', 'You must be signed in to scan.');
        isScanning.current = false;
        setIsLoading(false);
        return;
      }

      // 3. Single transactional RPC: records scan, gets/creates loyalty card,
      //    increments stamps, and if target is reached resets to 0 + inserts reward.
      console.log('📝 Calling record_stamp RPC...');
      const { data: rpcResult, error: rpcError } = await supabase.rpc('record_stamp', {
        p_user_id: authUserId,
        p_cafe_id: cafe.id,
        p_qr_code: data,
        p_target: cfg.stampsPerCard,
      });

      if (rpcError) {
        console.error('❌ record_stamp RPC error:', rpcError);
        throw new Error(`Failed to record stamp: ${rpcError.message}`);
      }

      const newStamps: number = rpcResult.new_stamps;
      const rewardsTrigger: boolean = rpcResult.is_reward;

      console.log('✅ RPC complete — stamps:', newStamps, 'reward:', rewardsTrigger);

      // 4. Show in-UI success overlay then auto-navigate home
      console.log('🎉 Scan successful! Stamps:', newStamps);

      if (rewardsTrigger) {
        pendingReward.active = true;
        pendingReward.cafeName = cafe.name;
        pendingReward.stampCount = newStamps;
      }

      setIsLoading(false);
      setSuccessInfo({ stamps: newStamps, cafeName: cafe.name, isReward: rewardsTrigger });

      setTimeout(() => {
        router.back();
      }, cfg.scanRedirectDelayMs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Scan failed:', errorMessage, error);
      Alert.alert(
        '❌ Scan Failed',
        `${errorMessage}\n\nTroubleshooting:\n1. Check internet connection\n2. Verify QR code is valid`,
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
