import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { EmptyState } from '../../shared/components/EmptyState';
import { useShifts, useDeleteShift } from './hooks/useStaff';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Shift } from '../../api/types';

/** "HH:mm:ss" (backend TimeSpan serialization) → "HH:mm" for display. */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}

export function ShiftListScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const { data: shifts, isLoading } = useShifts(societyId);
  const deleteShift = useDeleteShift(societyId);

  function handleDelete(shift: Shift): void {
    Alert.alert('Delete shift', `Delete shift "${shift.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteShift.mutate(shift.id, {
            onError: (e) => Alert.alert('Could not delete shift', normalizeError(e)),
          });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Shifts" showBack />
      <LoadingOverlay visible={isLoading} />
      <FlatList
        data={shifts ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={(shifts ?? []).length === 0 ? styles.emptyContainer : styles.content}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {formatTime(item.startTime)} – {formatTime(item.endTime)} · {item.graceMinutes} min grace
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ShiftForm', { id: item.id })}
              accessibilityLabel="Edit shift"
            >
              <Text style={styles.actionButtonText}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
              disabled={deleteShift.isPending}
              accessibilityLabel="Delete shift"
            >
              <Text style={styles.actionButtonText}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={!isLoading ? <EmptyState icon="🕐" title="No shifts defined yet" /> : null}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ShiftForm', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  emptyContainer: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  itemInfo: { flex: 1 },
  name: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  separator: { height: 1, backgroundColor: colors.border },
  actionButton: { marginLeft: spacing.xs, padding: spacing.xs },
  actionButtonText: { fontSize: typography.fontSize.lg },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 30 },
});
