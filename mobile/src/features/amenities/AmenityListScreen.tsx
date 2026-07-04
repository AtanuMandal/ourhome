import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAmenities } from './hooks/useAmenities';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Amenity } from '../../api/types';

export function AmenityListScreen() {
  const societyId = useSocietyId();
  const { data: amenities, isLoading, refetch } = useAmenities(societyId);

  function renderItem({ item }: { item: Amenity }) {
    return (
      <TouchableOpacity style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.name}>{item.name}</Text>
          {item.isActive ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Available</Text>
            </View>
          ) : (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Unavailable</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.details}>
          Capacity: {item.capacity} · {item.operatingStart} – {item.operatingEnd}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Amenities" showMenu />
      <FlatList
        data={amenities ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={(amenities ?? []).length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="🏊" title="No amenities" subtitle="Society amenities will appear here" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  item: { padding: spacing.md, backgroundColor: colors.surface },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  activeBadgeText: { fontSize: typography.fontSize.xs, color: '#065F46', fontWeight: typography.fontWeight.medium },
  inactiveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  inactiveBadgeText: { fontSize: typography.fontSize.xs, color: '#991B1B', fontWeight: typography.fontWeight.medium },
  description: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: 4 },
  details: { fontSize: typography.fontSize.xs, color: colors.text.disabled },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
