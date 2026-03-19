import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

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
    if (!data || hasScanned) return;
    
    setHasScanned(true);
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
                setHasScanned(false);
                setIsLoading(false);
              },
              style: 'default',
            },
            {
              text: 'Go Back',
              onPress: () => {
                setIsLoading(false);
                router.back();
              },
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
                setHasScanned(false);
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

      // 5. Show success
      console.log('🎉 Scan successful! Stamps:', newStamps);
      const rewardsTrigger = newStamps % 10 === 0;
      Alert.alert(
        rewardsTrigger ? '🎉 Reward Earned!' : '✅ Stamp Added',
        rewardsTrigger
          ? `You've earned a free coffee at ${cafe.name}!\nTotal stamps: ${newStamps}`
          : `Stamp added at ${cafe.name}\nStamps: ${newStamps}/10`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsLoading(false);
              router.back();
            },
          },
          {
            text: 'Scan Another',
            onPress: () => {
              setHasScanned(false);
              setIsLoading(false);
            },
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Scan failed:', errorMessage, error);
      Alert.alert(
        'Scan Failed',
        `${errorMessage}\n\nTroubleshooting:\n1. Check internet connection\n2. Verify QR code is valid\n3. Check browser console (F12)`,
        [
          {
            text: 'Try Again',
            onPress: () => {
              setHasScanned(false);
              setIsLoading(false);
            },
          },
          {
            text: 'Go Back',
            onPress: () => {
              setIsLoading(false);
              router.back();
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        onBarcodeScanned={isLoading ? undefined : handleBarCodeScanned}
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
        onPress={() => router.back()}
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
});
