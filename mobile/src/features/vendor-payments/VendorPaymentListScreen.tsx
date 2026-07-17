import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import {
  useVendorChargeList,
  useMarkVendorChargePaid,
  useSetVendorChargeActive,
  useDeleteVendorCharge,
} from './hooks/useVendorPayments';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { CurrencyText } from '../../shared/components/CurrencyText';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../shared/utils/date';
import type { VendorCharge } from '../../api/endpoints/vendor-payments';

export function VendorPaymentListScreen() {
  const societyId = useSocietyId();
  const isAdmin = useAuthStore((s) => s.user?.role === 'SUAdmin');
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useVendorChargeList(societyId);
  const markPaid = useMarkVendorChargePaid(societyId);
  const setActive = useSetVendorChargeActive(societyId);
  const deleteCharge = useDeleteVendorCharge(societyId);

  function handleMarkPaid(item: VendorCharge): void {
    Alert.alert('Mark paid', `Mark the ₹${item.amount} charge to ${item.vendorName} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: () => markPaid.mutate(
          { chargeId: item.id, data: { paymentMethod: 'Offline', notes: 'Marked paid from mobile app' } },
          { onError: (e) => Alert.alert('Could not mark paid', normalizeError(e)) }
        ),
      },
    ]);
  }

  function handleDelete(item: VendorCharge): void {
    Alert.alert('Delete charge', `Delete the ${item.chargeType} charge to ${item.vendorName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCharge.mutate(item.id, {
          onError: (e) => Alert.alert('Could not delete charge', normalizeError(e)),
        }),
      },
    ]);
  }

  function renderItem({ item }: { item: VendorCharge }) {
    const busy = markPaid.isPending || setActive.isPending || deleteCharge.isPending;
    return (
      <View style={[styles.item, !item.isActive && styles.itemInactive]}>
        <View style={styles.itemTop}>
          <Text style={styles.vendor}>{item.vendorName}</Text>
          <CurrencyText amount={item.amount} style={styles.amount} />
        </View>
        <Text style={styles.category}>{item.chargeType}{!item.isActive ? ' • Inactive' : ''}</Text>
        <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        <View style={styles.itemBottom}>
          <StatusChip status={item.status} />
          <Text style={styles.date}>{formatDate(item.dueDate)}</Text>
        </View>
        {isAdmin && (
          <View style={styles.actionRow}>
            {item.status !== 'Paid' && item.isActive && (
              <TouchableOpacity style={styles.actionBtn} disabled={busy} onPress={() => handleMarkPaid(item)}>
                <Text style={styles.actionBtnText}>Mark paid</Text>
              </TouchableOpacity>
            )}
            {item.status !== 'Paid' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.neutralBtn]}
                disabled={busy}
                onPress={() => setActive.mutate(
                  { chargeId: item.id, active: !item.isActive },
                  { onError: (e) => Alert.alert('Could not update charge', normalizeError(e)) }
                )}
              >
                <Text style={styles.actionBtnText}>{item.isActive ? 'Inactivate' : 'Activate'}</Text>
              </TouchableOpacity>
            )}
            {item.status !== 'Paid' && (
              <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} disabled={busy} onPress={() => handleDelete(item)}>
                <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Vendor Payments" showMenu />
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
            <EmptyState icon="🏦" title="No vendor payments" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  item: { padding: spacing.md, backgroundColor: colors.surface },
  itemInactive: { opacity: 0.6 },
  actionRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  actionBtn: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  neutralBtn: { backgroundColor: '#6B7280' },
  dangerBtn: { backgroundColor: colors.error },
  actionBtnText: { color: '#FFF', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  vendor: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  amount: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  category: { fontSize: typography.fontSize.xs, color: colors.primary, marginBottom: 2 },
  description: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: typography.fontSize.xs, color: colors.text.disabled },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
