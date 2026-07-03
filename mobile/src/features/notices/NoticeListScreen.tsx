import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useNoticeList } from './hooks/useNotices';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../shared/utils/date';
import type { Notice } from '../../api/types';

export function NoticeListScreen() {
  const societyId = useSocietyId();
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useNoticeList(societyId);

  function renderItem({ item }: { item: Notice }) {
    return (
      <TouchableOpacity style={[styles.item, !item.isRead && styles.unread]}>
        {!item.isRead && <View style={styles.dot} />}
        <View style={styles.itemContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.meta}>
            {item.postedBy} · {formatDate(item.postedAt)}
          </Text>
          <Text style={styles.preview} numberOfLines={2}>
            {item.content}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Notices" showMenu />
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
            <EmptyState icon="📢" title="No notices" subtitle="Society notices will appear here" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  item: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  unread: { backgroundColor: '#EFF6FF' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  itemContent: { flex: 1 },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  meta: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginBottom: 4 },
  preview: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
