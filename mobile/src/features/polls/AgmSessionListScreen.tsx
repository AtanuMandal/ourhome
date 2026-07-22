import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useAgmSessionList } from './hooks/useAgmSessions';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { AgmSessionSummary } from '../../api/types';

export function AgmSessionListScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl ?? '');
  const isAdmin = role === 'SUAdmin';

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } = useAgmSessionList(societyId);

  function renderItem({ item }: { item: AgmSessionSummary }) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AgmSessionDetail', { id: item.id })}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.tt}</Text>
          <Text style={styles.cardMeta}>
            {new Date(item.sd).toLocaleDateString()} · {item.rc} resolution(s)
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="AGM Sessions" showBack />
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
        ListEmptyComponent={!isLoading ? <EmptyState icon="👥" title="No AGM sessions" /> : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AgmSessionForm')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md },
  emptyContainer: { flex: 1 },
  separator: { height: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  cardMeta: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 2 },
  fab: {
    position: 'absolute', right: spacing.md, bottom: spacing.md, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 30 },
});
