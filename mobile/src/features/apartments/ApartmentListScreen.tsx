import React, { useMemo, useState } from 'react';
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../store/authStore';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useApartmentList } from './hooks/useApartments';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { apartmentsApi } from '../../api/endpoints/apartments';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Apartment } from '../../api/types';
import { formatApartmentLabel } from '../../shared/utils/apartment';

type ApartmentsNav = NativeStackNavigationProp<{
  ApartmentList: undefined;
  ApartmentDetail: { id: string };
  ApartmentForm: { id?: string };
}>;

export function ApartmentListScreen() {
  const navigation = useNavigation<ApartmentsNav>();
  const societyId = useSocietyId();
  const isAdmin = useAuthStore((s) => s.user?.role === 'SUAdmin');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useApartmentList(societyId, debouncedSearch ? { search: debouncedSearch } : undefined);

  // The apartment directory report as CSV, written to cache and handed to the OS share
  // sheet — mobile's counterpart of the web app's "Download Report" download.
  async function handleExportDirectory(): Promise<void> {
    setExporting(true);
    try {
      const csv = await apartmentsApi.exportDirectory(societyId);
      const uri = `${FileSystem.cacheDirectory}apartment-directory.csv`;
      await FileSystem.writeAsStringAsync(uri, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Apartment directory report' });
      }
    } catch (e) {
      Alert.alert('Could not export the apartment report', normalizeError(e));
    } finally {
      setExporting(false);
    }
  }

  const sortedData = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          b.floorNumber - a.floorNumber ||
          a.apartmentNumber.localeCompare(b.apartmentNumber)
      ),
    [data]
  );

  function renderItem({ item }: { item: Apartment }) {
    const label = formatApartmentLabel(item.blockName, item.floorNumber, item.apartmentNumber);
    return (
      <TouchableOpacity
        style={styles.item}
        disabled={!isAdmin}
        onPress={() => navigation.navigate('ApartmentDetail', { id: item.id })}
      >
        <View style={styles.itemLeft}>
          <Text style={styles.number}>{label}</Text>
          <Text style={styles.residents}>
            {item.residents.length} resident{item.residents.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <StatusChip status={item.status} />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Apartments" showMenu />
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by apartment number..."
          placeholderTextColor={colors.text.disabled}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {isAdmin && (
        <TouchableOpacity style={styles.reportLink} onPress={handleExportDirectory} disabled={exporting}>
          <Text style={styles.reportLinkText}>{exporting ? 'Preparing report…' : 'Download Apartment Report →'}</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={sortedData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={sortedData.length === 0 ? styles.emptyContainer : undefined}
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
            <EmptyState icon="🏢" title="No apartments found" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          accessibilityLabel="Add apartment"
          onPress={() => navigation.navigate('ApartmentForm', {})}
        >
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
  reportLink: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.surface },
  reportLinkText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  itemLeft: { flex: 1 },
  number: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  residents: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
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
    elevation: 6,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
});
