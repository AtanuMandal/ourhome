import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { usePollList } from './hooks/usePolls';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { PollSummary } from '../../api/types';

function statusChipStyle(status: PollSummary['status']) {
  switch (status) {
    case 'Scheduled': return { backgroundColor: '#FFF8E1' };
    case 'Open': return { backgroundColor: '#E3F2FD' };
    default: return { backgroundColor: '#ECEFF1' };
  }
}

export function PollListScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const isAdmin = role === 'SUAdmin';

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } = usePollList(societyId);

  function renderItem({ item }: { item: PollSummary }) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PollDetail', { id: item.id })}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {item.type === 'MultipleChoice' ? 'Multiple choice' : 'Single choice'}
            {item.isAgmResolution ? ' · AGM Resolution' : ''} · Closes {new Date(item.closesAt).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.statusChip, statusChipStyle(item.status)]}>
          <Text style={styles.statusChipText}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Polls" showMenu />
      <TouchableOpacity style={styles.agmSessionsLink} onPress={() => navigation.navigate('AgmSessionList')}>
        <Text style={styles.agmSessionsLinkText}>AGM Sessions →</Text>
      </TouchableOpacity>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} tintColor={colors.primary} />}
        onEndReached={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={!isLoading ? <EmptyState icon="🗳️" title="No polls" /> : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('PollForm')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  agmSessionsLink: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  agmSessionsLinkText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  listContent: { padding: spacing.md },
  emptyContainer: { flex: 1 },
  separator: { height: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  cardMeta: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 2 },
  statusChip: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  statusChipText: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  fab: {
    position: 'absolute', right: spacing.md, bottom: spacing.md, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 30 },
});
