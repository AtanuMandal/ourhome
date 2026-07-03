import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useMaintenanceList } from './hooks/useMaintenance';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { CurrencyText } from '../../shared/components/CurrencyText';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate, isOverdue } from '../../shared/utils/date';
import type { MaintenanceCharge } from '../../api/types';

const STATUS_FILTERS = ['All', 'Pending', 'Paid', 'Overdue'];

export function MaintenanceScreen() {
  const societyId = useSocietyId();
  const [selectedStatus, setSelectedStatus] = useState('All');

  const params =
    selectedStatus !== 'All' ? { status: selectedStatus } : undefined;
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useMaintenanceList(societyId, params);

  function renderItem({ item }: { item: MaintenanceCharge }) {
    const overdue = item.status !== 'Paid' && isOverdue(item.dueDate);
    return (
      <View style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.apartment}>{item.apartmentNumber}</Text>
          <CurrencyText amount={item.amount} style={styles.amount} />
        </View>
        <Text style={styles.period}>
          {item.month} {item.year}
        </Text>
        <View style={styles.itemBottom}>
          <StatusChip status={item.status} />
          <Text style={[styles.dueDate, overdue && styles.overdue]}>
            Due: {formatDate(item.dueDate)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Maintenance" showMenu />
      <View style={styles.filters}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filter, selectedStatus === s && styles.filterActive]}
            onPress={() => setSelectedStatus(s)}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === s && styles.filterTextActive,
              ]}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="💰" title="No charges found" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  filter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  filterTextActive: { color: '#FFF', fontWeight: typography.fontWeight.medium },
  item: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  apartment: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  amount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  period: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dueDate: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  overdue: { color: colors.error },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
