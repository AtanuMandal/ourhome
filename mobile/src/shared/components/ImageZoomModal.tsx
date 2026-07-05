import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

interface ImageZoomModalProps {
  visible: boolean;
  uri: string;
  onClose: () => void;
}

/** Full-screen preview popup with zoom in/out for an image, e.g. a visitor photo or payment proof. */
export function ImageZoomModal({ visible, uri, onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(MIN_SCALE);

  useEffect(() => {
    if (visible) setScale(MIN_SCALE);
  }, [visible]);

  function zoomIn(): void {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  }

  function zoomOut(): void {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={zoomOut} disabled={scale <= MIN_SCALE} accessibilityLabel="Zoom out">
            <Text style={[styles.toolbarBtnText, scale <= MIN_SCALE && styles.toolbarBtnTextDisabled]}>−</Text>
          </TouchableOpacity>
          <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
          <TouchableOpacity style={styles.toolbarBtn} onPress={zoomIn} disabled={scale >= MAX_SCALE} accessibilityLabel="Zoom in">
            <Text style={[styles.toolbarBtnText, scale >= MAX_SCALE && styles.toolbarBtnTextDisabled]}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.toolbarBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.viewport}>
          <Image source={{ uri }} style={[styles.image, { transform: [{ scale }] }]} resizeMode="contain" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  toolbarBtnText: { color: '#fff', fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  toolbarBtnTextDisabled: { opacity: 0.4 },
  scaleText: { color: '#fff', fontSize: typography.fontSize.sm, minWidth: 44, textAlign: 'center' },
  viewport: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '90%', height: '80%' },
});
