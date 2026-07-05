import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

type ComplaintsNav = NativeStackNavigationProp<{
  ComplaintList: undefined;
  ComplaintCreate: undefined;
  ComplaintDetail: { id: string };
}>;

export function ComplaintListScreen() {
  const navigation = useNavigation<ComplaintsNav>();
  const societyId = useSocietyId();
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useComplaintList(societyId);

  function renderItem({ item }: { item: Complaint }) {
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.navigate('ComplaintDetail', { id: item.id })}
      >
        <View style={styles.itemTop}>
          <Text style={styles.category}>{item.category}</Text>
          <StatusChip status={item.status} />
        </View>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.meta}>
          {item.priority} · {formatDate(item.createdAt)}
        </Text>
      </TouchableOpacity>
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
      <TouchableOpacity
        style={styles.fab}
        accessibilityLabel="New complaint"
        onPress={() => navigation.navigate('ComplaintCreate')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  item: { padding: spacing.md, backgroundColor: colors.surface },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  category: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  description: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.xs },
  meta: { fontSize: typography.fontSize.xs, color: colors.text.disabled },
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
