import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useAmenities, useCreateBooking } from './hooks/useAmenities';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface AmenityBookingScreenProps {
  route: { params: { amenityId: string; amenityName: string } };
}

export function AmenityBookingScreen({ route }: AmenityBookingScreenProps) {
  const navigation = useNavigation();
  const societyId = useSocietyId();
  const apartmentId = useAuthStore((s) => s.user?.apartmentId ?? '');
  const { amenityId, amenityName } = route.params;

  const { mutateAsync: createBooking, isPending } = useCreateBooking(societyId);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  async function handleBook(): Promise<void> {
    if (!startTime.trim() || !endTime.trim()) {
      Alert.alert('Validation', 'Start and end time are required.');
      return;
    }
    if (!apartmentId) {
      Alert.alert('Error', 'Apartment not found in your profile. Please contact admin.');
      return;
    }
    try {
      await createBooking({
        amenityId,
        apartmentId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      Alert.alert('Booking Confirmed', `${amenityName} has been booked.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Booking Failed', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title={`Book ${amenityName}`} showBack />
      <LoadingOverlay visible={isPending} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Enter the start and end times for your booking in YYYY-MM-DDTHH:MM format (e.g. 2026-07-10T09:00).
          </Text>
        </View>

        <Text style={styles.label}>Start Time *</Text>
        <TextInput
          style={styles.input}
          value={startTime}
          onChangeText={setStartTime}
          placeholder="2026-07-10T09:00"
          placeholderTextColor={colors.text.disabled}
          autoCapitalize="none"
        />

        <Text style={styles.label}>End Time *</Text>
        <TextInput
          style={styles.input}
          value={endTime}
          onChangeText={setEndTime}
          placeholder="2026-07-10T10:00"
          placeholderTextColor={colors.text.disabled}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => void handleBook()}
          disabled={isPending}
        >
          <Text style={styles.bookButtonText}>Confirm Booking</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: 4,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.surface,
  },
  bookButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
