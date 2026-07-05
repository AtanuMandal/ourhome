import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { pickImage } from './ImagePicker';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type Tab = 'camera' | 'gallery';

interface CameraCaptureProps {
  visible: boolean;
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export function CameraCapture({ visible, onCapture, onClose }: CameraCaptureProps) {
  const [tab, setTab] = useState<Tab>('camera');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  async function handleCapture(): Promise<void> {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  }

  async function handleGallery(): Promise<void> {
    const uri = await pickImage();
    if (uri) {
      onCapture(uri);
    }
  }

  async function handleRequestPermission(): Promise<void> {
    await requestPermission();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === 'camera' && styles.tabActive]}
            onPress={() => setTab('camera')}
          >
            <Text style={[styles.tabText, tab === 'camera' && styles.tabTextActive]}>
              Camera
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'gallery' && styles.tabActive]}
            onPress={() => setTab('gallery')}
          >
            <Text style={[styles.tabText, tab === 'gallery' && styles.tabTextActive]}>
              Gallery
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'camera' ? (
          <View style={styles.cameraContainer}>
            {permission?.granted ? (
              <>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={() => void handleCapture()}
                  >
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>
                  Camera permission is required to take photos.
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={() => void handleRequestPermission()}
                >
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.galleryContainer}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={() => void handleGallery()}
            >
              <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    paddingTop: 48,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { color: '#888', fontSize: typography.fontSize.base },
  tabTextActive: { color: '#FFF', fontWeight: typography.fontWeight.semibold },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraControls: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  permissionText: { color: '#FFF', textAlign: 'center', marginBottom: spacing.md },
  permissionButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 8,
  },
  permissionButtonText: { color: '#FFF' },
  galleryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  galleryButtonText: { color: '#FFF', fontSize: typography.fontSize.base },
  closeButton: {
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: '#111',
  },
  closeText: { color: '#FFF', fontSize: typography.fontSize.base },
});
