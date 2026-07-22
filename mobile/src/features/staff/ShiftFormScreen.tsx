import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { useShifts, useCreateShift, useUpdateShift } from './hooks/useStaff';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:mm:ss" (backend TimeSpan serialization) → "HH:mm" for the text input. */
function toInputTime(value: string): string {
  return value.slice(0, 5);
}

/** "HH:mm" (from the text input) → "HH:mm:ss" for the backend TimeSpan. */
function toApiTime(value: string): string {
  return `${value}:00`;
}

export function ShiftFormScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const route = useRoute<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const shiftId: string | undefined = route.params?.id;
  const isEditMode = !!shiftId;

  const { data: shifts, isLoading } = useShifts(societyId);
  const createShift = useCreateShift(societyId);
  const updateShift = useUpdateShift(societyId);

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [graceMinutes, setGraceMinutes] = useState('30');

  useEffect(() => {
    if (isEditMode && shifts) {
      const existing = shifts.find((s) => s.id === shiftId);
      if (existing) {
        setName(existing.name);
        setStartTime(toInputTime(existing.startTime));
        setEndTime(toInputTime(existing.endTime));
        setGraceMinutes(String(existing.graceMinutes));
      }
    }
  }, [isEditMode, shiftId, shifts]);

  const isSaving = createShift.isPending || updateShift.isPending;
  const isValid = name.trim().length > 0 && TIME_PATTERN.test(startTime) && TIME_PATTERN.test(endTime) && Number(graceMinutes) >= 0;

  function handleSubmit(): void {
    if (!isValid) return;

    const dto = {
      name: name.trim(),
      startTime: toApiTime(startTime),
      endTime: toApiTime(endTime),
      graceMinutes: Number(graceMinutes),
    };

    if (isEditMode) {
      updateShift.mutate(
        { id: shiftId!, data: dto },
        {
          onSuccess: () => navigation.goBack(),
          onError: (e) => Alert.alert('Could not update shift', normalizeError(e)),
        }
      );
    } else {
      createShift.mutate(dto, {
        onSuccess: () => navigation.goBack(),
        onError: (e) => Alert.alert('Could not add shift', normalizeError(e)),
      });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title={isEditMode ? 'Edit Shift' : 'Add Shift'} showBack />
      <LoadingOverlay visible={isLoading || isSaving} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Shift Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Morning Security" />

        <Text style={styles.label}>Start Time (24h, HH:MM)</Text>
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" keyboardType="numbers-and-punctuation" />

        <Text style={styles.label}>End Time (24h, HH:MM)</Text>
        <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="17:00" keyboardType="numbers-and-punctuation" />

        <Text style={styles.label}>Grace Period (minutes)</Text>
        <TextInput style={styles.input} value={graceMinutes} onChangeText={setGraceMinutes} placeholder="30" keyboardType="number-pad" />

        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isSaving}
        >
          <Text style={styles.submitButtonText}>{isEditMode ? 'Save Changes' : 'Add Shift'}</Text>
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
  submitButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
