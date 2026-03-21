import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { pendingReward } from '@/utils/rewardState';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
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
    // router.back() dismisses the scanner modal and returns to the existing
    // (tabs) screen. router.replace('/(tabs)') would push a duplicate (tabs)
    // instance onto the stack, requiring multiple back-presses to escape.
    router.back();
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="camera-off" size={64} color="#D97706" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
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

      // 2. For testing, use hardcoded user_id
      const testUserId = 'test-user-123';

      // 3. Record the scan
      console.log('📝 Recording scan...');
      const { error: scanError } = await supabase.from('scans').insert({
        user_id: testUserId,
        cafe_id: cafe.id,
        qr_code: data,
      });

      if (scanError) {
        console.error('❌ Scan insert error:', scanError);
        throw new Error(`Failed to record scan: ${scanError.message}`);
      }

      console.log('✅ Scan recorded');

      // 4. Get or create loyalty card (NOT using .single() - it fails when no rows)
      console.log('🔍 Looking up loyalty card...');
      const { data: loyaltyCards, error: loyaltyError } = await supabase
        .from('user_loyalty_cards')
        .select('*')
        .eq('user_id', testUserId)
        .eq('cafe_id', cafe.id);

      if (loyaltyError) {
        console.error('❌ Loyalty card lookup error:', loyaltyError);
        throw new Error(`Failed to lookup loyalty card: ${loyaltyError.message}`);
      }

      const loyaltyCard = loyaltyCards && loyaltyCards.length > 0 ? loyaltyCards[0] : null;
      let newStamps = 1;

      if (loyaltyCard) {
        console.log('📊 Existing card found, stamps:', loyaltyCard.stamps);
        newStamps = loyaltyCard.stamps + 1;
        const { error: updateError } = await supabase
          .from('user_loyalty_cards')
          .update({ stamps: newStamps })
          .eq('id', loyaltyCard.id);

        if (updateError) {
          console.error('❌ Card update error:', updateError);
          throw new Error(`Failed to update loyalty card: ${updateError.message}`);
        }
        console.log('✅ Card updated, new stamps:', newStamps);
      } else {
        console.log('🆕 Creating new loyalty card...');
        const { error: createError } = await supabase
          .from('user_loyalty_cards')
          .insert({
            user_id: testUserId,
            cafe_id: cafe.id,
            stamps: 1,
          });

        if (createError) {
          console.error('❌ Card creation error:', createError);
          throw new Error(`Failed to create loyalty card: ${createError.message}`);
        }
        console.log('✅ New card created');
      }

      // 5. Show in-UI success overlay for 1 second, then auto-navigate home
      console.log('🎉 Scan successful! Stamps:', newStamps);
      const rewardsTrigger = newStamps % 10 === 0;

      // Store reward info so the Home screen can show the congrats popup
      // immediately upon arrival — no extra DB call needed.
      if (rewardsTrigger) {
        pendingReward.active = true;
        pendingReward.cafeName = cafe.name;
        pendingReward.stampCount = newStamps;
      }

      setIsLoading(false);
      setSuccessInfo({ stamps: newStamps, cafeName: cafe.name, isReward: rewardsTrigger });

      setTimeout(() => {
        router.back();
      }, 1000);
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
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.overlayRight} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Success Overlay — shown for 1 second then auto-navigates */}
      {successInfo && (
        <View style={styles.successOverlay}>
          <MaterialCommunityIcons
            name={successInfo.isReward ? 'gift-outline' : 'check-circle-outline'}
            size={80}
            color="#D97706"
          />
          <Text style={styles.successTitle}>
            {successInfo.isReward ? '🎉 Reward Earned!' : '✅ Stamp Added!'}
          </Text>
          <Text style={styles.successText}>
            {successInfo.isReward
              ? `Free coffee at ${successInfo.cafeName}!`
              : `${successInfo.stamps} / 10 stamps at ${successInfo.cafeName}`}
          </Text>
          <Text style={styles.successSubtext}>Returning home...</Text>
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={styles.loadingText}>Processing scan...</Text>
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
        <Text style={styles.instructionsText}>
          {isLoading ? 'Processing...' : 'Align QR code in the frame'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#D97706',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#D97706',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 280,
  },
  overlayLeft: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 1,
    borderColor: '#D97706',
    position: 'relative',
  },
  overlayRight: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#D97706',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 20,
  },
  instructions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#D97706',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    gap: 12,
  },
  successTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  successText: {
    color: '#D97706',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  successSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
  },
});
