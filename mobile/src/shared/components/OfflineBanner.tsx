import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStore } from '../../store/networkStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        You are offline — some features may be unavailable.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
