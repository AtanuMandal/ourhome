import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStore } from '../../store/networkStore';
import { useThemeColors } from '../hooks/useThemeColors';
import type { ColorTokens } from '../../theme/themes';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// Rendered on every screen (both pre- and post-login), so it must react to the theme rather
// than freeze at whatever colors.ts resolved to at cold start — hence useThemeColors() here
// instead of the static `colors` import most screens use.
export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const colors = useThemeColors();

  if (isOnline) return null;

  const styles = getStyles(colors);
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        You are offline — some features may be unavailable.
      </Text>
    </View>
  );
}

function getStyles(colors: ColorTokens) {
  return StyleSheet.create({
    banner: {
      backgroundColor: '#FEF9C3',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.warning,
    },
    text: {
      fontSize: typography.fontSize.sm,
      color: colors.warning,
      textAlign: 'center',
      fontWeight: typography.fontWeight.medium,
    },
  });
}
