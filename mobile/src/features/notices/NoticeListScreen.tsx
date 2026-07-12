import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useNoticeList, useMarkNoticeRead } from './hooks/useNotices';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../shared/utils/date';
import type { Notice } from '../../api/types';

type NoticesNav = NativeStackNavigationProp<{
  NoticeList: undefined;
  NoticeDetail: { id: string };
  NoticeCreate: undefined;
}>;

export function NoticeListScreen() {
  const navigation = useNavigation<NoticesNav>();
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const isAdmin = role === 'SUAdmin' || role === 'HQAdmin';

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useNoticeList(societyId);
  const { mutate: markRead } = useMarkNoticeRead(societyId);

  const handleMarkRead = useCallback((id: string, e: { stopPropagation: () => void }): void => {
    e.stopPropagation();
    markRead(id);
  }, [markRead]);

  const renderItem = useCallback(({ item }: { item: Notice }) => {
    return (
      <TouchableOpacity
        style={[styles.item, !item.isReadByCurrentUser && styles.unread]}
        onPress={() => {
          if (!item.isReadByCurrentUser) markRead(item.id);
          navigation.navigate('NoticeDetail', { id: item.id });
        }}
      >
        {!item.isReadByCurrentUser && <View style={styles.dot} />}
        <View style={styles.itemContent}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.isReadByCurrentUser ? (
              <Text style={styles.readTick} accessibilityLabel="Read">✓</Text>
            ) : (
              <TouchableOpacity
                style={styles.markReadBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Mark as read"
                onPress={(e) => handleMarkRead(item.id, e)}
              >
                <Text style={styles.markReadText}>✓</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.meta}>
            {item.category} · {formatDate(item.publishAt)}
          </Text>
          <Text style={styles.preview} numberOfLines={2}>
            {item.content}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, markRead, handleMarkRead]);

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
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          accessibilityLabel="Post notice"
          onPress={() => navigation.navigate('NoticeCreate')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
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
    flexShrink: 0,
  },
  itemContent: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  markReadBtn: {
    marginLeft: spacing.xs,
    padding: 2,
  },
  markReadText: { fontSize: typography.fontSize.sm, color: colors.primary },
  readTick: { fontSize: typography.fontSize.sm, color: '#2e7d32', marginLeft: spacing.xs, padding: 2 },
  meta: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginBottom: 4 },
  preview: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
});
