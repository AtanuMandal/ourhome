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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useActiveApartment } from '../../shared/hooks/useActiveApartment';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useVisitorList, useVisitorDefaultView, useApproveVisitor, useDenyVisitor, useCheckOutVisitor, useCheckInVisitorByPass } from './hooks/useVisitors';
import { visitorsApi } from '../../api/endpoints/visitors';
import { normalizeError } from '../../shared/utils/errors';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { resolveFileUrl } from '../../camera/imageUpload';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDateTime } from '../../shared/utils/date';
import type { Visitor } from '../../api/types';

type VisitorsNav = NativeStackNavigationProp<{ VisitorList: undefined; VisitorRegister: undefined; VisitorDetail: { id: string }; VisitorScan: undefined }>;

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
  // Multi-apartment aware: host-approval rights follow the apartment selected in the drawer.
  const { activeApartmentId } = useActiveApartment();
  const myApartmentId = activeApartmentId ?? '';

  // SUAdmin/SUSecurity manage every visitor; a resident (SUUser) additionally manages visitors
  // hosted by their own apartment — matches the web app's canModerate(visitor) (see
  // visitor-list.component.ts). Check-out stays role-only (canManageVisitors), never host-only.
  const canManageVisitors = role === 'SUAdmin' || role === 'SUSecurity';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [residentName, setResidentName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebounce(search);
  const debouncedResident = useDebounce(residentName);

  const params: Record<string, string | number> = {};
  if (debouncedSearch) params.search = debouncedSearch;
  if (statusFilter) params.status = statusFilter;
  if (debouncedResident) params.residentName = debouncedResident;
  if (fromDate.trim()) params.fromDate = fromDate.trim();
  if (toDate.trim()) params.toDate = toDate.trim();

  // No filter applied — show all Pending visitors plus the 10 most recent, not the whole
  // history. Applying any search/status/date filter switches to the paginated filtered list.
  const isDefaultView = Object.keys(params).length === 0;

  const filteredList = useVisitorList(societyId, Object.keys(params).length > 0 ? params : undefined, !isDefaultView);
  const defaultView = useVisitorDefaultView(societyId, isDefaultView);

  const data = isDefaultView ? (defaultView.data ?? []) : filteredList.data;
  // Backend already sorts overstaying visitors to the top of the list — this just drives the banner count.
  const overstayCount = data.filter((v) => v.isOverstay === true).length;
  const isLoading = isDefaultView ? defaultView.isLoading : filteredList.isLoading;
  const hasNextPage = isDefaultView ? false : filteredList.hasNextPage;
  const fetchNextPage = isDefaultView ? async () => undefined : filteredList.fetchNextPage;
  const refetch = isDefaultView ? defaultView.refetch : filteredList.refetch;

  const { mutate: approve } = useApproveVisitor(societyId);
  const { mutate: deny } = useDenyVisitor(societyId);
  const { mutate: checkOut } = useCheckOutVisitor(societyId);
  const { mutateAsync: checkInByPass, isPending: isVerifyingPass } = useCheckInVisitorByPass(societyId);
  const [passCode, setPassCode] = useState('');

  // The visitor log as CSV, written to cache and handed to the OS share sheet — mobile's
  // counterpart of the web app's "Export CSV" download.
  async function handleExportCsv(): Promise<void> {
    setExporting(true);
    try {
      const csv = await visitorsApi.exportCsv(societyId, Object.keys(params).length > 0 ? params : undefined);
      const uri = `${FileSystem.cacheDirectory}visitor-log.csv`;
      await FileSystem.writeAsStringAsync(uri, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Visitor log' });
      }
    } catch (e) {
      Alert.alert('Could not export the visitor log', normalizeError(e));
    } finally {
      setExporting(false);
    }
  }

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

  const canDeny = useCallback((item: Visitor): boolean => {
    if (item.status !== 'Pending') return false;
    // SUAdmin/SUSecurity may deny any visitor; a resident may deny one hosted by their own
    // apartment even though they can't deny anyone else's.
    return canManageVisitors || item.hostApartmentId === myApartmentId;
  }, [canManageVisitors, myApartmentId]);

  const canCheckOut = useCallback((item: Visitor): boolean => {
    return canManageVisitors && item.status === 'CheckedIn';
  }, [canManageVisitors]);

  const renderItem = useCallback(({ item }: { item: Visitor }) => {
    return (
      <TouchableOpacity
        style={[styles.item, item.isOverstay === true && styles.itemOverstay]}
        onPress={() => navigation.navigate('VisitorDetail', { id: item.id })}
      >
        <View style={styles.itemTop}>
          {item.visitorImageUrl ? (
            <Image
              source={{ uri: resolveFileUrl(item.visitorImageUrl) }}
              style={styles.avatarImage}
              accessibilityLabel={`Photo of ${item.visitorName}`}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{item.visitorName?.[0] ?? '?'}</Text>
            </View>
          )}
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

        {(canApprove(item) || canDeny(item) || canCheckOut(item)) && (
          <View style={styles.actions}>
            {canApprove(item) && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={(e) => { e.stopPropagation(); approve(item.id); }}
              >
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
            )}
            {canDeny(item) && (
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
  }, [navigation, canApprove, canDeny, canCheckOut, approve, deny, checkOut]);

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
        <View style={styles.filterActionsRow}>
          <TouchableOpacity onPress={() => setShowMoreFilters((v) => !v)}>
            <Text style={styles.filterActionText}>{showMoreFilters ? 'Hide filters' : 'More filters'}</Text>
          </TouchableOpacity>
          {canManageVisitors && (
            <TouchableOpacity onPress={() => void handleExportCsv()} disabled={exporting}>
              <Text style={styles.filterActionText}>{exporting ? 'Exporting…' : 'Export CSV'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {showMoreFilters && (
          <View style={styles.moreFilters}>
            {canManageVisitors && (
              <TextInput
                style={styles.searchInput}
                placeholder="Resident name"
                placeholderTextColor={colors.text.disabled}
                value={residentName}
                onChangeText={setResidentName}
              />
            )}
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.searchInput, styles.dateInput]}
                placeholder="From (YYYY-MM-DD)"
                placeholderTextColor={colors.text.disabled}
                value={fromDate}
                onChangeText={setFromDate}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.searchInput, styles.dateInput]}
                placeholder="To (YYYY-MM-DD)"
                placeholderTextColor={colors.text.disabled}
                value={toDate}
                onChangeText={setToDate}
                autoCapitalize="none"
              />
            </View>
          </View>
        )}
      </View>
      {canManageVisitors && (
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
          <TouchableOpacity
            style={styles.gateBtn}
            accessibilityLabel="Scan visitor pass QR code"
            onPress={() => navigation.navigate('VisitorScan')}
          >
            <Text style={styles.gateBtnText}>📷 Scan</Text>
          </TouchableOpacity>
        </View>
      )}
      {isDefaultView && (
        <Text style={styles.hint}>Showing pending and checked-in visitors plus the 10 most recent. Search or filter for more.</Text>
      )}
      {overstayCount > 0 && (
        <View style={styles.overstayBanner}>
          <Text style={styles.overstayBannerText}>
            ⚠ {overstayCount} visitor{overstayCount === 1 ? '' : 's'} overstaying the allowed time — flagged in red below.
          </Text>
        </View>
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
  filterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  filterActionText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  moreFilters: { marginTop: spacing.xs, gap: spacing.xs },
  dateRow: { flexDirection: 'row', gap: spacing.xs },
  dateInput: { flex: 1 },
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
  overstayBanner: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  overstayBannerText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.semibold,
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
    gap: spacing.sm,
  },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
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
