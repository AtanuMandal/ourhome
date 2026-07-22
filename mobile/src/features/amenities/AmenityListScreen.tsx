import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useAmenities, useBookings, useCancelBooking, useApproveBooking, useRejectBooking } from './hooks/useAmenities';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusChip } from '../../shared/components/StatusChip';
import { normalizeError } from '../../shared/utils/errors';
import { formatDateTime } from '../../shared/utils/date';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Amenity, AmenityBooking } from '../../api/types';

type AmenitiesNav = NativeStackNavigationProp<{
  AmenityList: undefined;
  AmenityBooking: { amenityId: string; amenityName: string };
  AmenityForm: undefined;
}>;

export function AmenityListScreen() {
  const navigation = useNavigation<AmenitiesNav>();
  const societyId = useSocietyId();
  const isAdmin = useAuthStore((s) => s.user?.rl === 'SUAdmin');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { data: amenities, isLoading, refetch } = useAmenities(societyId);
  const { data: bookingsPage, refetch: refetchBookings } = useBookings(societyId);
  const [cancelTarget, setCancelTarget] = React.useState<AmenityBooking | null>(null);
  const [cancelRemarks, setCancelRemarks] = React.useState('');
  const { mutateAsync: cancelBooking } = useCancelBooking(societyId);
  const { mutateAsync: approveBooking } = useApproveBooking(societyId);
  const { mutateAsync: rejectBooking } = useRejectBooking(societyId);

  const bookings = bookingsPage?.items ?? [];

  function canCancel(b: AmenityBooking): boolean {
    if (b.st !== 'Pending' && b.st !== 'Approved') return false;
    return isAdmin || b.uid === userId;
  }

  function handleCancel(b: AmenityBooking): void {
    const isOwn = b.uid === userId;
    if (isOwn) {
      Alert.alert('Cancel Booking', `Cancel your ${b.an} booking?`, [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: () => {
            cancelBooking({ id: b.id }).catch((e) => Alert.alert('Error', normalizeError(e)));
          },
        },
      ]);
      return;
    }
    // Admin cancelling a resident's booking must give a reason — collected in a
    // cross-platform modal (Alert.prompt is iOS-only) and shown to the resident.
    setCancelTarget(b);
    setCancelRemarks('');
  }

  function confirmAdminCancel(): void {
    if (!cancelTarget) return;
    if (!cancelRemarks.trim()) {
      Alert.alert('Validation', 'Remarks are required when cancelling a resident booking.');
      return;
    }
    const id = cancelTarget.id;
    const remarks = cancelRemarks.trim();
    setCancelTarget(null);
    cancelBooking({ id, remarks }).catch((e) => Alert.alert('Error', normalizeError(e)));
  }

  function handleApprove(b: AmenityBooking): void {
    approveBooking({ id: b.id }).catch((e) => Alert.alert('Error', normalizeError(e)));
  }

  function handleReject(b: AmenityBooking): void {
    rejectBooking({ id: b.id }).catch((e) => Alert.alert('Error', normalizeError(e)));
  }

  function renderBooking(b: AmenityBooking): React.ReactElement {
    return (
      <View key={b.id} style={styles.bookingItem}>
        <View style={styles.itemTop}>
          <Text style={styles.name}>{b.an}</Text>
          <StatusChip status={b.st} />
        </View>
        <Text style={styles.details}>
          {formatDateTime(b.stt)} – {formatDateTime(b.ent)}
        </Text>
        {!!b.adn && <Text style={styles.details}>Notes: {b.adn}</Text>}
        {b.st === 'Cancelled' && !!b.cr && (
          <Text style={styles.cancelRemarks}>
            Cancelled{b.cid && b.cid !== b.uid ? ' by admin' : ''}:{' '}
            {b.cr}
          </Text>
        )}
        <View style={styles.bookingActions}>
          {isAdmin && b.st === 'Pending' && (
            <>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(b)}>
                <Text style={styles.bookBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(b)}>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {canCancel(b) && (
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleCancel(b)}>
              <Text style={styles.rejectBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  function renderItem({ item }: { item: Amenity }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.name}>{item.nm}</Text>
          {item.ac ? (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Available</Text>
            </View>
          ) : (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Unavailable</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>{item.ds}</Text>
        <View style={styles.footer}>
          <Text style={styles.details}>
            Capacity: {item.cap} · {item.os} – {item.oe}
          </Text>
          {item.ac && (
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => navigation.navigate('AmenityBooking', { amenityId: item.id, amenityName: item.nm })}
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
            onRefresh={() => {
              void refetch();
              void refetchBookings();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="🏊" title="No amenities" subtitle="Society amenities will appear here" />
          ) : null
        }
        ListFooterComponent={
          <View style={styles.bookingsSection}>
            <Text style={styles.sectionTitle}>{isAdmin ? 'All Bookings' : 'My Bookings'}</Text>
            {bookings.length === 0 ? (
              <Text style={styles.details}>No bookings yet.</Text>
            ) : (
              bookings.map(renderBooking)
            )}
          </View>
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

      <Modal visible={cancelTarget != null} transparent animationType="fade"
             onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Cancel Booking</Text>
            <Text style={styles.details}>
              Remarks for the resident (required) — they will see this on their booking.
            </Text>
            <TextInput
              style={styles.remarksInput}
              value={cancelRemarks}
              onChangeText={setCancelRemarks}
              placeholder="Reason for cancellation"
              placeholderTextColor={colors.text.disabled}
              multiline
            />
            <View style={styles.bookingActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => setCancelTarget(null)}>
                <Text style={styles.rejectBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={confirmAdminCancel}>
                <Text style={styles.bookBtnText}>Cancel booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  bookingsSection: { padding: spacing.md },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  bookingItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  cancelRemarks: { fontSize: typography.fontSize.sm, color: colors.error, marginTop: 2 },
  bookingActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  approveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  rejectBtnText: { color: colors.error, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  dialog: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, width: '100%', maxWidth: 420, gap: spacing.sm },
  dialogTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  remarksInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 72,
    textAlignVertical: 'top',
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
});
