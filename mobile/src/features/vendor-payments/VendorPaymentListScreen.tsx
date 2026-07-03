import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useVendorPaymentList } from './hooks/useVendorPayments';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { CurrencyText } from '../../shared/components/CurrencyText';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../shared/utils/date';
import type { VendorPayment } from '../../api/endpoints/vendor-payments';

export function VendorPaymentListScreen() {
  const societyId = useSocietyId();
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useVendorPaymentList(societyId);

  function renderItem({ item }: { item: VendorPayment }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.vendor}>{item.vendorName}</Text>
          <CurrencyText amount={item.amount} style={styles.amount} />
        </View>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        <View style={styles.itemBottom}>
          <StatusChip status={item.status} />
          <Text style={styles.date}>{formatDate(item.paymentDate)}</Text>
        </View>
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
