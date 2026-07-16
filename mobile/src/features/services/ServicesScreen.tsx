import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { servicesApi, type ServiceProvider, type ServiceRequest } from '../../api/endpoints/services';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDateTime } from '../../shared/utils/date';

export type ServicesStackParams = {
  ServicesHome: undefined;
  ServiceRequestForm: undefined;
  ServiceProviderForm: undefined;
};

type ServicesNav = NativeStackNavigationProp<ServicesStackParams>;
type Tab = 'providers' | 'requests';

/** Service directory + the society's service requests, mirroring the web /services feature. */
export function ServicesScreen() {
  const navigation = useNavigation<ServicesNav>();
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const isAdmin = role === 'SUAdmin';
  const [tab, setTab] = useState<Tab>('providers');

  const providers = useQuery({
    queryKey: ['service-providers', societyId],
    queryFn: () => servicesApi.listProviders(societyId, { page: 1, pageSize: 100 }),
    enabled: !!societyId,
  });

  const requests = useQuery({
    queryKey: ['service-requests', societyId],
    queryFn: () => servicesApi.listRequests(societyId, { page: 1, pageSize: 100 }),
    enabled: !!societyId && tab === 'requests',
  });

  function renderProvider({ item }: { item: ServiceProvider }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.title}>{item.providerName}</Text>
          <StatusChip status={item.status} />
        </View>
        <Text style={styles.meta}>{item.serviceTypes.join(', ')}</Text>
        <Text style={styles.meta}>{item.contactName} • {item.contactPhone}</Text>
        {!!item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}
        {item.reviewCount > 0 && (
          <Text style={styles.rating}>★ {item.rating.toFixed(1)} ({item.reviewCount} reviews)</Text>
        )}
      </View>
    );
  }

  function renderRequest({ item }: { item: ServiceRequest }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.title}>{item.serviceType}</Text>
          <StatusChip status={item.status} />
        </View>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.meta}>Preferred: {formatDateTime(item.preferredDateTime)}</Text>
      </View>
    );
  }

  const isProviders = tab === 'providers';
  const activeQuery = isProviders ? providers : requests;
  const items = activeQuery.data?.items ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Services" showMenu />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, isProviders && styles.tabBtnActive]} onPress={() => setTab('providers')}>
          <Text style={[styles.tabText, isProviders && styles.tabTextActive]}>Providers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, !isProviders && styles.tabBtnActive]} onPress={() => setTab('requests')}>
          <Text style={[styles.tabText, !isProviders && styles.tabTextActive]}>Requests</Text>
        </TouchableOpacity>
      </View>
      {isProviders ? (
        <FlatList
          data={providers.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderProvider}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
          refreshControl={
            <RefreshControl refreshing={providers.isLoading} onRefresh={() => void providers.refetch()} tintColor={colors.primary} />
          }
          ListEmptyComponent={!providers.isLoading ? <EmptyState icon="🛠️" title="No service providers" /> : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <FlatList
          data={requests.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
          refreshControl={
            <RefreshControl refreshing={requests.isLoading} onRefresh={() => void requests.refetch()} tintColor={colors.primary} />
          }
          ListEmptyComponent={!requests.isLoading ? <EmptyState icon="📋" title="No service requests" /> : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      {isAdmin && isProviders && (
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          accessibilityLabel="Register provider"
          onPress={() => navigation.navigate('ServiceProviderForm')}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      )}
      {!isProviders && (
        <TouchableOpacity
          style={styles.fab}
          accessibilityLabel="New service request"
          onPress={() => navigation.navigate('ServiceRequestForm')}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, padding: spacing.xs, gap: spacing.xs },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, fontWeight: typography.fontWeight.semibold },
  tabTextActive: { color: '#FFF' },
  item: { padding: spacing.md, backgroundColor: colors.surface },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, flex: 1, marginRight: spacing.sm },
  meta: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  description: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 4 },
  rating: { fontSize: typography.fontSize.sm, color: '#F59E0B', marginTop: 4 },
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
  fabSecondary: { backgroundColor: '#059669' },
  fabText: { color: '#FFF', fontSize: 26 },
});
