import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { gamificationApi, type PointEvent } from '../../api/endpoints/gamification';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../shared/utils/date';

/** Rewards: the user's community points balance and earning history. */
export function RewardsScreen() {
  const societyId = useSocietyId();
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-points', societyId, userId],
    queryFn: () => gamificationApi.getUserPoints(societyId, userId),
    enabled: !!societyId && !!userId,
  });

  function renderItem({ item }: { item: PointEvent }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemLeft}>
          <Text style={styles.action}>{item.rsn}</Text>
          <Text style={styles.date}>{formatDate(item.ca)}</Text>
        </View>
        <Text style={[styles.points, item.pts < 0 && styles.pointsNegative]}>
          {item.pts > 0 ? `+${item.pts}` : item.pts}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Rewards" showMenu />
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>🏆</Text>
        <View>
          <Text style={styles.bannerLabel}>Your Points</Text>
          <Text style={styles.bannerValue}>{data?.tp ?? 0}</Text>
        </View>
      </View>
      <FlatList
        data={data?.h ?? []}
        keyExtractor={(item, index) => `${item.ca}-${item.pts}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={(data?.h ?? []).length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="🎯" title="No points yet" subtitle="Participate in the community to earn points" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerIcon: { fontSize: 32 },
  bannerLabel: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  bannerValue: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  action: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  description: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  date: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  points: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.success ?? '#059669' },
  pointsNegative: { color: colors.error },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
