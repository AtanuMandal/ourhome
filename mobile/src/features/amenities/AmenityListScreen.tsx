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
import { useAmenities, useBookingList } from './hooks/useAmenities';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../shared/utils/date';
import type { AmenityBooking } from '../../api/types';

export function AmenityListScreen() {
  const societyId = useSocietyId();
  const { data: amenities } = useAmenities(societyId);
  const { data: bookings, isLoading, fetchNextPage, hasNextPage, refetch } =
    useBookingList(societyId);

  function renderBooking({ item }: { item: AmenityBooking }) {
    return (
      <View style={styles.bookingItem}>
        <View style={styles.bookingLeft}>
          <Text style={styles.amenityName}>{item.amenityName}</Text>
          <Text style={styles.bookingDate}>{formatDate(item.bookingDate)}</Text>
          <Text style={styles.bookingTime}>
            {item.startTime} – {item.endTime}
          </Text>
        </View>
        <StatusChip status={item.status} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Amenities" showMenu />

      {amenities != null && amenities.length > 0 && (
        <View style={styles.amenitiesBar}>
          {(amenities as import('../../api/types').Amenity[]).filter((a) => a.isActive).map((a) => (
            <TouchableOpacity key={a.id} style={styles.amenityChip}>
              <Text style={styles.amenityChipText}>{a.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.sectionHeader}>My Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : undefined}
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
            <EmptyState icon="🏊" title="No bookings yet" subtitle="Book an amenity to get started" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  amenitiesBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  amenityChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  amenityChipText: { color: '#FFF', fontSize: typography.fontSize.sm },
  sectionHeader: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  bookingLeft: { flex: 1 },
  amenityName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  bookingDate: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  bookingTime: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
});
