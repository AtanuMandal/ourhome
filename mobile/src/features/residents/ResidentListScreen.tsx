import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useResidentList, useDeleteResident } from './hooks/useResidents';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { User } from '../../api/types';

const ROLE_ORDER = ['SUAdmin', 'HQAdmin', 'HQUser', 'SUSecurity', 'SUUser'];
const ROLE_LABELS: Record<string, string> = {
  SUAdmin: 'Society Admins',
  HQAdmin: 'HQ Admins',
  HQUser: 'HQ Viewers',
  SUSecurity: 'Security',
  SUUser: 'Residents',
};

export function ResidentListScreen() {
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const isAdmin = role === 'SUAdmin' || role === 'HQAdmin';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useResidentList(societyId, debouncedSearch ? { search: debouncedSearch } : undefined);
  const deleteResident = useDeleteResident(societyId);

  const sections = useMemo(() => {
    const byRole = new Map<string, User[]>();
    for (const user of data) {
      const list = byRole.get(user.role) ?? [];
      list.push(user);
      byRole.set(user.role, list);
    }
    const roles = [...byRole.keys()].sort((a, b) => {
      const ia = ROLE_ORDER.indexOf(a);
      const ib = ROLE_ORDER.indexOf(b);
      return (ia === -1 ? ROLE_ORDER.length : ia) - (ib === -1 ? ROLE_ORDER.length : ib);
    });
    return roles.map((r) => ({ title: ROLE_LABELS[r] ?? r, data: byRole.get(r) ?? [] }));
  }, [data]);

  function handleDelete(user: User): void {
    Alert.alert('Delete user', `Delete ${user.fullName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteResident.mutate(user.id, {
            onError: (e) => Alert.alert('Could not delete user', normalizeError(e)),
          });
        },
      },
    ]);
  }

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
        {isAdmin && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
            disabled={deleteResident.isPending}
          >
            <Text style={styles.deleteButtonText}>🗑</Text>
          </TouchableOpacity>
        )}
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
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title} ({section.data.length})</Text>
          </View>
        )}
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
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  deleteButtonText: { fontSize: typography.fontSize.lg },
});
