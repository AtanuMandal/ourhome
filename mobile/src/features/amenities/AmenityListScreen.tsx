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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useAmenities } from './hooks/useAmenities';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Amenity } from '../../api/types';

type AmenitiesNav = NativeStackNavigationProp<{
  AmenityList: undefined;
  AmenityBooking: { amenityId: string; amenityName: string };
  AmenityForm: undefined;
}>;

export function AmenityListScreen() {
  const navigation = useNavigation<AmenitiesNav>();
  const societyId = useSocietyId();
  const isAdmin = useAuthStore((s) => s.user?.role === 'SUAdmin');
  const { data: amenities, isLoading, refetch } = useAmenities(societyId);

  function renderItem({ item }: { item: Amenity }) {
    return (
      <View style={styles.item}>
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
        <View style={styles.footer}>
          <Text style={styles.details}>
            Capacity: {item.capacity} · {item.operatingStart} – {item.operatingEnd}
          </Text>
          {item.isActive && (
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => navigation.navigate('AmenityBooking', { amenityId: item.id, amenityName: item.name })}
            >
              <Text style={styles.bookBtnText}>Book</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          accessibilityLabel="Add amenity"
          onPress={() => navigation.navigate('AmenityForm')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
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
  inactiveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  inactiveBadgeText: { fontSize: typography.fontSize.xs, color: '#991B1B', fontWeight: typography.fontWeight.medium },
  description: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: 6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  details: { fontSize: typography.fontSize.xs, color: colors.text.disabled, flex: 1 },
  bookBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  bookBtnText: { color: '#FFF', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
