import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { amenitiesApi } from '../../api/endpoints/amenities';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

/** SUAdmin creates a bookable amenity (gym, clubhouse, court…). */
export function AmenityFormScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const societyId = useSocietyId();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [rules, setRules] = useState('');
  const [slotMinutes, setSlotMinutes] = useState('60');
  const [operatingStart, setOperatingStart] = useState('06:00');
  const [operatingEnd, setOperatingEnd] = useState('22:00');
  const [advanceDays, setAdvanceDays] = useState('7');

  const create = useMutation({
    mutationFn: () =>
      amenitiesApi.createAmenity(societyId, {
        name: name.trim(),
        description: description.trim(),
        capacity: Number(capacity) || 1,
        rules: rules.trim(),
        bookingSlotMinutes: Number(slotMinutes) || 60,
        operatingStart: operatingStart.trim(),
        operatingEnd: operatingEnd.trim(),
        advanceBookingDays: Number(advanceDays) || 7,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['amenities', societyId] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert('Could not create amenity', normalizeError(e)),
  });

  const isValid = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Add Amenity" showBack />
      <LoadingOverlay visible={create.isPending} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Clubhouse" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline numberOfLines={3} />

        <Text style={styles.label}>Capacity</Text>
        <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />

        <Text style={styles.label}>Rules</Text>
        <TextInput style={[styles.input, styles.multiline]} value={rules} onChangeText={setRules} multiline numberOfLines={3} />

        <Text style={styles.label}>Booking slot (minutes)</Text>
        <TextInput style={styles.input} value={slotMinutes} onChangeText={setSlotMinutes} keyboardType="number-pad" />

        <Text style={styles.label}>Opens at (HH:mm)</Text>
        <TextInput style={styles.input} value={operatingStart} onChangeText={setOperatingStart} placeholder="06:00" autoCapitalize="none" />

        <Text style={styles.label}>Closes at (HH:mm)</Text>
        <TextInput style={styles.input} value={operatingEnd} onChangeText={setOperatingEnd} placeholder="22:00" autoCapitalize="none" />

        <Text style={styles.label}>Advance booking (days)</Text>
        <TextInput style={styles.input} value={advanceDays} onChangeText={setAdvanceDays} keyboardType="number-pad" />

        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          disabled={!isValid || create.isPending}
          onPress={() => create.mutate()}
        >
          <Text style={styles.submitBtnText}>Create Amenity</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  submitBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
