import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useVisitorList, useVisitorDefaultView, useApproveVisitor, useDenyVisitor, useCheckOutVisitor, useCheckInVisitorByPass } from './hooks/useVisitors';
import { normalizeError } from '../../shared/utils/errors';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDateTime } from '../../shared/utils/date';
import type { Visitor } from '../../api/types';

type VisitorsNav = NativeStackNavigationProp<{ VisitorList: undefined; VisitorRegister: undefined; VisitorDetail: { id: string } }>;

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Denied', value: 'Denied' },
  { label: 'Checked In', value: 'CheckedIn' },
  { label: 'Checked Out', value: 'CheckedOut' },
];

export function VisitorListScreen() {
  const navigation = useNavigation<VisitorsNav>();
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const myApartmentId = useAuthStore((s) => s.user?.apartmentId ?? '');

  const canModerate = role === 'SUAdmin' || role === 'SUSecurity';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search);

  const params: Record<string, string | number> = {};
  if (debouncedSearch) params.search = debouncedSearch;
  if (statusFilter) params.status = statusFilter;

  // No filter applied — show all Pending visitors plus the 10 most recent, not the whole
  // history. Applying any search/status switches to the normal paginated filtered list.
  const isDefaultView = !debouncedSearch && !statusFilter;

  const filteredList = useVisitorList(societyId, Object.keys(params).length > 0 ? params : undefined, !isDefaultView);
  const defaultView = useVisitorDefaultView(societyId, isDefaultView);

  const data = isDefaultView ? (defaultView.data ?? []) : filteredList.data;
  const isLoading = isDefaultView ? defaultView.isLoading : filteredList.isLoading;
  const hasNextPage = isDefaultView ? false : filteredList.hasNextPage;
  const fetchNextPage = isDefaultView ? async () => undefined : filteredList.fetchNextPage;
  const refetch = isDefaultView ? defaultView.refetch : filteredList.refetch;

  const { mutate: approve } = useApproveVisitor(societyId);
  const { mutate: deny } = useDenyVisitor(societyId);
  const { mutate: checkOut } = useCheckOutVisitor(societyId);
  const { mutateAsync: checkInByPass, isPending: isVerifyingPass } = useCheckInVisitorByPass(societyId);
  const [passCode, setPassCode] = useState('');

  // Gate flow: verifying a pass checks the visitor in as one step — security never has to
  // check them in separately. An already checked-in pass verifies fine (exit flow).
  async function handleVerifyPass(): Promise<void> {
    const code = passCode.trim();
    if (!code) return;
    try {
      const visitor = await checkInByPass(code);
      setPassCode('');
      Alert.alert('Pass verified', `${visitor.visitorName} is checked in.`);
    } catch (e) {
      Alert.alert('Could not verify the pass', normalizeError(e));
    }
  }

  const canApprove = useCallback((item: Visitor): boolean => {
    if (item.status !== 'Pending') return false;
    // Only the host resident can approve a visitor — SUAdmin and SUSecurity may deny but not approve.
    return item.hostApartmentId === myApartmentId;
  }, [myApartmentId]);

  const canCheckOut = useCallback((item: Visitor): boolean => {
    return canModerate && item.status === 'CheckedIn';
  }, [canModerate]);

  const renderItem = useCallback(({ item }: { item: Visitor }) => {
    return (
      <TouchableOpacity
        style={[styles.item, item.isOverstay === true && styles.itemOverstay]}
        onPress={() => navigation.navigate('VisitorDetail', { id: item.id })}
      >
        <View style={styles.itemTop}>
          <View style={styles.itemLeft}>
            <Text style={[styles.visitorName, item.isOverstay === true && styles.visitorNameOverstay]}>
              {item.visitorName}
            </Text>
            {item.companyName != null && item.companyName !== '' && (
              <Text style={styles.company}>{item.companyName}</Text>
            )}
            <Text style={styles.meta}>
              {item.hostResidentName} • {item.hostBlockName} {item.hostFloorNumber}-{item.hostFlatNumber}
            </Text>
            <Text style={styles.purpose}>{item.purpose}</Text>
            {item.checkInTime != null && (
              <Text style={styles.time}>{formatDateTime(item.checkInTime)}</Text>
            )}
            {item.isOverstay === true && (
              <Text style={styles.overstayFlag}>Overstaying past the society threshold</Text>
            )}
          </View>
          <StatusChip status={item.status} />
        </View>

        {(canApprove(item) || canCheckOut(item) || (canModerate && item.status === 'Pending')) && (
          <View style={styles.actions}>
            {canApprove(item) && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={(e) => { e.stopPropagation(); approve(item.id); }}
              >
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
            )}
            {(canModerate && item.status === 'Pending') && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.denyBtn]}
                onPress={(e) => { e.stopPropagation(); deny(item.id); }}
              >
                <Text style={styles.actionBtnText}>Deny</Text>
              </TouchableOpacity>
            )}
            {canCheckOut(item) && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.checkOutBtn]}
                onPress={(e) => { e.stopPropagation(); checkOut(item.id); }}
              >
                <Text style={styles.actionBtnText}>Check Out</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation, canApprove, canCheckOut, canModerate, approve, deny, checkOut]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Visitors" showMenu />
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search visitors..."
          placeholderTextColor={colors.text.disabled}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.statusFilter}>
          <SearchableSelect
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All statuses"
          />
        </View>
      </View>
      {canModerate && (
        <View style={styles.gateRow}>
          <TextInput
            style={[styles.searchInput, styles.gateInput]}
            placeholder="Visitor pass code"
            placeholderTextColor={colors.text.disabled}
            value={passCode}
            onChangeText={setPassCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.gateBtn, (isVerifyingPass || !passCode.trim()) && styles.gateBtnDisabled]}
            disabled={isVerifyingPass || !passCode.trim()}
            onPress={() => void handleVerifyPass()}
          >
            <Text style={styles.gateBtnText}>{isVerifyingPass ? 'Verifying…' : 'Verify & Check In'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {isDefaultView && (
        <Text style={styles.hint}>Showing pending and checked-in visitors plus the 10 most recent. Search or filter for more.</Text>
      )}
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
  filters: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFilter: { marginTop: spacing.xs },
  gateRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  gateInput: { flex: 1 },
  gateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  gateBtnDisabled: { opacity: 0.5 },
  gateBtnText: {
    color: '#FFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    backgroundColor: colors.surface,
  },
  item: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  // Visitor overstaying the society threshold — flagged in red per requirements
  itemOverstay: {
    backgroundColor: 'rgba(211, 47, 47, 0.06)',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  visitorNameOverstay: { color: colors.error },
  overstayFlag: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  visitorName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  company: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 1 },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  purpose: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  time: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  approveBtn: { backgroundColor: '#059669' },
  denyBtn: { backgroundColor: colors.error },
  checkOutBtn: { backgroundColor: colors.primary },
  actionBtnText: { color: '#FFF', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
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
