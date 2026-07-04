import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useVisitorList } from './hooks/useVisitors';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDateTime } from '../../shared/utils/date';
import type { Visitor } from '../../api/types';

type VisitorsNav = NativeStackNavigationProp<{ VisitorList: undefined; VisitorRegister: undefined; VisitorDetail: { id: string } }>;

export function VisitorListScreen() {
  const navigation = useNavigation<VisitorsNav>();
  const societyId = useSocietyId();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useVisitorList(societyId, debouncedSearch ? { search: debouncedSearch } : undefined);

  function renderItem({ item }: { item: Visitor }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemLeft}>
          <Text style={styles.visitorName}>{item.visitorName}</Text>
          <Text style={styles.meta}>
            {item.hostResidentName} • {item.purpose}
          </Text>
          {item.checkInTime != null && (
            <Text style={styles.time}>{formatDateTime(item.checkInTime)}</Text>
          )}
        </View>
        <StatusChip status={item.status} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Visitors" showMenu />
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search visitors..."
          placeholderTextColor={colors.text.disabled}
          value={search}
          onChangeText={setSearch}
        />
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
            <EmptyState icon="🚪" title="No visitors found" subtitle="Visitor entries will appear here" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <TouchableOpacity
        style={styles.fab}
        accessibilityLabel="Register visitor"
        onPress={() => navigation.navigate('VisitorRegister')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { padding: spacing.sm, backgroundColor: colors.surface },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  visitorName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  time: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
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
