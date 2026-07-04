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
import { useComplaintList } from './hooks/useComplaints';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../shared/utils/date';
import type { Complaint } from '../../api/types';

export function ComplaintListScreen() {
  const societyId = useSocietyId();
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useComplaintList(societyId);

  function renderItem({ item }: { item: Complaint }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.category}>{item.category}</Text>
          <StatusChip status={item.status} />
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.meta}>
          {item.priority} · {formatDate(item.createdAt)}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Complaints" showMenu />
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
            <EmptyState icon="📝" title="No complaints" subtitle="Complaints will appear here" />
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
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  category: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  description: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs },
  meta: { fontSize: typography.fontSize.xs, color: colors.text.disabled },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
