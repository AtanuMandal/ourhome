import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useResidentList } from './hooks/useResidents';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { User } from '../../api/types';

export function ResidentListScreen() {
  const societyId = useSocietyId();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useResidentList(societyId, debouncedSearch ? { search: debouncedSearch } : undefined);

  function renderItem({ item }: { item: User }) {
    return (
      <View style={styles.item}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.meta}>{item.residentType} · {item.phone}</Text>
          {(item.apartments && item.apartments.length > 0) && (
            <Text style={styles.apartment}>
              {item.apartments.map((a) => a.name).join(', ')}
            </Text>
          )}
        </View>
        <StatusChip status={item.isActive ? 'Active' : 'Inactive'} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Residents" showMenu />
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search residents..."
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
            <EmptyState icon="👥" title="No residents found" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: { color: '#FFF', fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg },
  itemInfo: { flex: 1 },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  apartment: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
