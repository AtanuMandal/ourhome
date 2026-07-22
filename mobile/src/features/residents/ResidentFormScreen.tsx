import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { useCreateResident } from './hooks/useResidents';
import { apartmentsApi } from '../../api/endpoints/apartments';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatApartmentLabel } from '../../shared/utils/apartment';

const ROLE_OPTIONS = [
  { label: 'Resident', value: 'SUUser' },
  { label: 'Security', value: 'SUSecurity' },
  { label: 'Society Admin', value: 'SUAdmin' },
];

const RESIDENT_TYPE_OPTIONS = [
  { label: 'Owner', value: 'Owner' },
  { label: 'Tenant', value: 'Tenant' },
  { label: 'Family Member', value: 'FamilyMember' },
  { label: 'Co-Occupant', value: 'CoOccupant' },
  { label: 'Society Admin', value: 'SocietyAdmin' },
];

/** SUAdmin creates a user directly (resident, security, or another admin). */
export function ResidentFormScreen() {
  const navigation = useNavigation();
  const societyId = useSocietyId();
  const invitedByUserId = useAuthStore((s) => s.user?.id ?? '');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('SUUser');
  const [residentType, setResidentType] = useState('Owner');
  const [apartmentId, setApartmentId] = useState('');

  const { data: apartments } = useQuery({
    queryKey: ['apartments-lookup', societyId],
    queryFn: () => apartmentsApi.getApartments(societyId, { page: 1, pageSize: 500 }),
    enabled: !!societyId,
  });

  const create = useCreateResident(societyId);

  const apartmentOptions = [
    { label: 'No apartment', value: '' },
    ...(apartments?.items ?? []).map((a) => ({
      value: a.id,
      label: formatApartmentLabel(a.blk, a.flr, a.num),
    })),
  ];

  const isValid = fullName.trim().length > 0 && /\S+@\S+\.\S+/.test(email.trim());

  function handleSubmit(): void {
    create.mutate(
      {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        residentType,
        apartmentId: apartmentId || undefined,
        invitedByUserId,
      },
      {
        onSuccess: () => {
          Alert.alert('User created', `${fullName.trim()} has been added. They will receive login credentials by email.`, [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
        onError: (e) => Alert.alert('Could not create user', normalizeError(e)),
      }
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Add User" showBack />
      <LoadingOverlay visible={create.isPending} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Full name</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full name" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="user@example.com" keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="10-digit phone" keyboardType="phone-pad" />

        <Text style={styles.label}>Role</Text>
        <SearchableSelect options={ROLE_OPTIONS} value={role} onChange={setRole} />

        <Text style={styles.label}>Resident type</Text>
        <SearchableSelect options={RESIDENT_TYPE_OPTIONS} value={residentType} onChange={setResidentType} />

        <Text style={styles.label}>Apartment</Text>
        <SearchableSelect options={apartmentOptions} value={apartmentId} onChange={setApartmentId} placeholder="No apartment" />

        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          disabled={!isValid || create.isPending}
          onPress={handleSubmit}
        >
          <Text style={styles.submitBtnText}>Create User</Text>
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
