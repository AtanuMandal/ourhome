import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { resolveFileUrl } from '../../camera/imageUpload';
import { ImageZoomModal } from './ImageZoomModal';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface UserAvatarProps {
  name: string;
  /** App-relative profile picture URL (e.g. "files/profile-pictures/..."). */
  pictureUrl?: string | null;
  size?: number;
  /** Tap-to-zoom on the picture; disable in dense contexts. */
  zoom?: boolean;
}

/**
 * User avatar shown wherever a user is listed: renders the profile picture when one exists
 * (with the standard tap-to-zoom modal), otherwise the user's initials.
 */
export function UserAvatar({ name, pictureUrl, size = 40, zoom = true }: UserAvatarProps) {
  const [zoomVisible, setZoomVisible] = useState(false);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (!pictureUrl) {
    return (
      <View style={[styles.initialsCircle, circle]}>
        <Text style={[styles.initialsText, { fontSize: size * 0.38 }]}>{initials || '?'}</Text>
      </View>
    );
  }

  const uri = resolveFileUrl(pictureUrl);
  return (
    <>
      <TouchableOpacity
        disabled={!zoom}
        onPress={() => setZoomVisible(true)}
        accessibilityLabel={`${name} profile picture`}
      >
        <Image source={{ uri }} style={circle} />
      </TouchableOpacity>
      {zoom && (
        <ImageZoomModal visible={zoomVisible} uri={uri} onClose={() => setZoomVisible(false)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  initialsCircle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFF',
    fontWeight: typography.fontWeight.bold,
  },
});
