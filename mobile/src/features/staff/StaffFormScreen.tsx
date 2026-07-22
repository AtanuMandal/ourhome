import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { useStaffMember, useShifts, useCreateStaff, useUpdateStaff } from './hooks/useStaff';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Shift, StaffCategory, StaffEmploymentType } from '../../api/types';

const CATEGORY_OPTIONS = [
  { label: 'Security', value: 'Security' },
  { label: 'Housekeeping', value: 'Housekeeping' },
  { label: 'Gardener', value: 'Gardener' },
  { label: 'Plumber', value: 'Plumber' },
  { label: 'Electrician', value: 'Electrician' },
  { label: 'Other', value: 'Other' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: 'On Payroll', value: 'OnPayroll' },
  { label: 'Contractor', value: 'Contractor' },
];

export function StaffFormScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const route = useRoute<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const staffId: string | undefined = route.params?.id;
  const isEditMode = !!staffId;

  const { data: existingStaff, isLoading: loadingStaff } = useStaffMember(societyId, staffId ?? '');
  const { data: shifts } = useShifts(societyId);
  const createStaff = useCreateStaff(societyId);
  const updateStaff = useUpdateStaff(societyId);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<StaffCategory>('Security');
  const [employmentType, setEmploymentType] = useState<StaffEmploymentType>('OnPayroll');
  const [shiftId, setShiftId] = useState('');

  useEffect(() => {
    if (existingStaff) {
      setFullName(existingStaff.fn);
      setPhone(existingStaff.ph);
      setCategory(existingStaff.cat);
      setEmploymentType(existingStaff.et);
      setShiftId(existingStaff.sid ?? '');
    }
  }, [existingStaff]);

  const shiftOptions = [{ label: 'No shift', value: '' }, ...(shifts ?? []).map((s: Shift) => ({ label: s.nm, value: s.id }))];
  const isSaving = createStaff.isPending || updateStaff.isPending;
  const isValid = fullName.trim().length > 0 && /^\d{10}$/.test(phone.trim());

  function handleSubmit(): void {
    if (!isValid) return;

    if (isEditMode) {
      updateStaff.mutate(
        { id: staffId!, data: { fullName: fullName.trim(), phone: phone.trim(), shiftId: shiftId || undefined } },
        {
          onSuccess: () => navigation.goBack(),
          onError: (e) => Alert.alert('Could not update staff', normalizeError(e)),
        }
      );
    } else {
      createStaff.mutate(
        { fullName: fullName.trim(), phone: phone.trim(), category, employmentType, shiftId: shiftId || undefined },
        {
          onSuccess: () => navigation.goBack(),
          onError: (e) => Alert.alert('Could not add staff', normalizeError(e)),
        }
      );
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title={isEditMode ? 'Edit Staff' : 'Add Staff'} showBack />
      <LoadingOverlay visible={loadingStaff || isSaving} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full name" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="10-digit phone" keyboardType="phone-pad" />

        {!isEditMode && (
          <>
            <Text style={styles.label}>Category</Text>
            <SearchableSelect options={CATEGORY_OPTIONS} value={category} onChange={(v) => setCategory(v as StaffCategory)} />

            <Text style={styles.label}>Employment Type</Text>
            <SearchableSelect options={EMPLOYMENT_TYPE_OPTIONS} value={employmentType} onChange={(v) => setEmploymentType(v as StaffEmploymentType)} />
          </>
        )}

        <Text style={styles.label}>Shift</Text>
        <SearchableSelect options={shiftOptions} value={shiftId} onChange={setShiftId} placeholder="No shift" />

        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isSaving}
        >
          <Text style={styles.submitButtonText}>{isEditMode ? 'Save Changes' : 'Add Staff'}</Text>
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
