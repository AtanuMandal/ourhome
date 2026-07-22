import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useCheckInVisitorByPass } from './hooks/useVisitors';
import { AppHeader } from '../../shared/components/AppHeader';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

/**
 * Extracts the pass code from the scanned QR payload. Pass QRs encode the raw
 * pass code; shared pass links may encode a URL ending in the code, so the last
 * path segment is used as a fallback.
 */
function extractPassCode(data: string): string {
  const trimmed = data.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    const segments = trimmed.split('?')[0].split('/').filter(Boolean);
    return segments[segments.length - 1] ?? trimmed;
  }
  return trimmed;
}

/**
 * Gate QR scanner for SUSecurity (and SUAdmin): scanning a valid visitor pass
 * verifies it and checks the visitor in as one step — no typing needed.
 */
export function VisitorScanScreen() {
  const navigation = useNavigation();
  const societyId = useSocietyId();
  const [permission, requestPermission] = useCameraPermissions();
  const { mutateAsync: checkInByPass } = useCheckInVisitorByPass(societyId);
  const [verifying, setVerifying] = useState(false);
  // Ref (not state) so a burst of scan callbacks between renders can't double-submit.
  const scanLock = useRef(false);

  async function handleScanned(result: BarcodeScanningResult): Promise<void> {
    if (scanLock.current) return;
    scanLock.current = true;
    setVerifying(true);

    const passCode = extractPassCode(result.data ?? '');
    try {
      const visitor = await checkInByPass(passCode);
      Alert.alert(
        'Pass valid — checked in',
        `${visitor.vn} is now checked in.`,
        [
          { text: 'Scan next', onPress: () => { scanLock.current = false; } },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]
      );
    } catch (e) {
      Alert.alert('Invalid pass', normalizeError(e), [
        { text: 'Try again', onPress: () => { scanLock.current = false; } },
        { text: 'Close', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setVerifying(false);
    }
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <AppHeader title="Scan Visitor Pass" showBack />
        <View style={styles.permissionBox}>
          <Text style={styles.permissionText}>
            Camera access is needed to scan visitor pass QR codes.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={() => void requestPermission()}>
            <Text style={styles.permissionBtnText}>Allow camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Scan Visitor Pass" showBack />
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(result) => void handleScanned(result)}
        />
        <View style={styles.frame} pointerEvents="none" />
        <Text style={styles.hint}>
          {verifying ? 'Verifying pass…' : 'Point the camera at the visitor pass QR code'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  cameraWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  frame: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#FFF',
    borderRadius: 16,
    opacity: 0.85,
  },
  hint: {
    color: '#FFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.xl,
    fontSize: typography.fontSize.sm,
    overflow: 'hidden',
  },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  permissionText: { fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center' },
  permissionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  permissionBtnText: { color: '#FFF', fontWeight: typography.fontWeight.semibold },
});
