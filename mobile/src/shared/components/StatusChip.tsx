import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface StatusChipProps {
  status: string;
}

interface ChipColor {
  bg: string;
  text: string;
}

function getChipColor(status: string): ChipColor {
  const s = status.toLowerCase();
  if (['approved', 'active', 'published', 'completed'].includes(s)) {
    return { bg: '#DCFCE7', text: colors.success };
  }
  if (['pending', 'inprogress', 'in progress'].includes(s)) {
    return { bg: '#FEF9C3', text: colors.warning };
  }
  if (['denied', 'inactive', 'cancelled'].includes(s)) {
    return { bg: '#FEE2E2', text: colors.error };
  }
  return { bg: '#F3F4F6', text: colors.text.secondary };
}

export function StatusChip({ status }: StatusChipProps) {
  const chipColor = getChipColor(status);
  return (
    <View style={[styles.chip, { backgroundColor: chipColor.bg }]}>
      <Text style={[styles.text, { color: chipColor.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
