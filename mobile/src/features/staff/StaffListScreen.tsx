import React, { useCallback, useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useStaffList, useOnDutyStaff, useCheckInStaff, useCheckOutStaff, useDeactivateStaff } from './hooks/useStaff';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Staff, StaffAttendance, StaffCategory } from '../../api/types';

const CATEGORY_ORDER: StaffCategory[] = ['Security', 'Housekeeping', 'Gardener', 'Plumber', 'Electrician', 'Other'];

export function StaffListScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const isAdmin = role === 'SUAdmin';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useStaffList(societyId, debouncedSearch ? { search: debouncedSearch } : undefined);
  const { data: onDuty } = useOnDutyStaff(societyId);
  const checkInStaff = useCheckInStaff(societyId);
  const checkOutStaff = useCheckOutStaff(societyId);
  const deactivateStaff = useDeactivateStaff(societyId);

  const onDutyStaffIds = useMemo(() => new Set((onDuty ?? []).map((a: StaffAttendance) => a.staffId)), [onDuty]);

  const sections = useMemo(() => {
    const byCategory = new Map<string, Staff[]>();
    for (const staff of data) {
      const list = byCategory.get(staff.category) ?? [];
      list.push(staff);
      byCategory.set(staff.category, list);
    }
    return CATEGORY_ORDER
      .filter((category) => byCategory.has(category))
      .map((category) => ({ title: category, data: byCategory.get(category) ?? [] }));
  }, [data]);

  const handleCheckIn = useCallback((staff: Staff): void => {
    checkInStaff.mutate(staff.id, {
      onError: (e) => Alert.alert('Could not check in', normalizeError(e)),
    });
  }, [checkInStaff]);

  const handleCheckOut = useCallback((staff: Staff): void => {
    checkOutStaff.mutate(staff.id, {
      onError: (e) => Alert.alert('Could not check out', normalizeError(e)),
    });
  }, [checkOutStaff]);

  const handleDeactivate = useCallback((staff: Staff): void => {
    Alert.alert('Deactivate staff', `Deactivate ${staff.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          deactivateStaff.mutate(staff.id, {
            onError: (e) => Alert.alert('Could not deactivate staff', normalizeError(e)),
          });
        },
      },
    ]);
  }, [deactivateStaff]);

  const renderItem = useCallback(({ item }: { item: Staff }) => {
    const isOnDuty = onDutyStaffIds.has(item.id);
    return (
      <View style={styles.item}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.meta}>
            {item.phone}{item.shiftName ? ` · ${item.shiftName}` : ''}
          </Text>
          {!item.isActive && <StatusChip status="Inactive" />}
        </View>
        {isOnDuty && (
          <View style={styles.onDutyChip}>
            <Text style={styles.onDutyText}>On Duty</Text>
          </View>
        )}
        {item.isActive && (
          <TouchableOpacity
            style={[styles.actionButton, isOnDuty ? styles.checkOutButton : styles.checkInButton]}
            onPress={() => (isOnDuty ? handleCheckOut(item) : handleCheckIn(item))}
            disabled={checkInStaff.isPending || checkOutStaff.isPending}
          >
            <Text style={isOnDuty ? styles.checkOutText : styles.checkInText}>
              {isOnDuty ? 'Check Out' : 'Check In'}
            </Text>
          </TouchableOpacity>
        )}
        {isAdmin && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => navigation.navigate('StaffForm', { id: item.id })}
          >
            <Text style={styles.deleteButtonText}>✎</Text>
          </TouchableOpacity>
        )}
        {isAdmin && item.isActive && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeactivate(item)}
            disabled={deactivateStaff.isPending}
          >
            <Text style={styles.deleteButtonText}>🚫</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [onDutyStaffIds, isAdmin, navigation, handleCheckIn, handleCheckOut, handleDeactivate, checkInStaff.isPending, checkOutStaff.isPending, deactivateStaff.isPending]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Staff" showMenu />
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff..."
          placeholderTextColor={colors.text.disabled}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {isAdmin && (
        <TouchableOpacity style={styles.reportLink} onPress={() => navigation.navigate('StaffAttendanceReport')}>
          <Text style={styles.reportLinkText}>View Attendance Report →</Text>
        </TouchableOpacity>
      )}
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
          <RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
        onEndReached={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={!isLoading ? <EmptyState icon="👷" title="No staff found" /> : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('StaffForm', {})}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
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
    gap: spacing.xs,
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
  onDutyChip: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  onDutyText: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.success },
  actionButton: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6, borderWidth: 1 },
  checkInButton: { borderColor: colors.primary },
  checkOutButton: { borderColor: colors.error },
  checkInText: { color: colors.primary, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  checkOutText: { color: colors.error, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  deleteButton: { marginLeft: spacing.xs, padding: spacing.xs },
  deleteButtonText: { fontSize: typography.fontSize.lg },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 30 },
  reportLink: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  reportLinkText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
});
