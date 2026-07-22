import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useActiveApartment } from '../../shared/hooks/useActiveApartment';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { servicesApi } from '../../api/endpoints/services';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const SERVICE_TYPE_OPTIONS = ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'Cleaner', 'AC_Repair', 'Other']
  .map((t) => ({ label: t.replace('_', ' '), value: t }));

export function ServiceRequestFormScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const societyId = useSocietyId();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { apartments, activeApartmentId } = useActiveApartment();
  const apartmentId = activeApartmentId ?? apartments[0]?.aid ?? '';

  const [serviceType, setServiceType] = useState('Plumber');
  const [description, setDescription] = useState('');
  const [preferredDateTime, setPreferredDateTime] = useState('');

  const create = useMutation({
    mutationFn: () =>
      servicesApi.createRequest(societyId, {
        apartmentId,
        userId,
        serviceType,
        description: description.trim(),
        preferredDateTime: preferredDateTime.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service-requests', societyId] });
      Alert.alert('Request submitted', 'Your service request has been created.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e) => Alert.alert('Could not submit request', normalizeError(e)),
  });

  const isValid = !!apartmentId && description.trim().length > 0 && preferredDateTime.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="New Service Request" showBack />
      <LoadingOverlay visible={create.isPending} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Service type</Text>
        <SearchableSelect options={SERVICE_TYPE_OPTIONS} value={serviceType} onChange={setServiceType} />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue or work needed…"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Preferred date &amp; time</Text>
        <TextInput
          style={styles.input}
          value={preferredDateTime}
          onChangeText={setPreferredDateTime}
          placeholder="2026-07-20T10:00"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          disabled={!isValid || create.isPending}
          onPress={() => create.mutate()}
        >
          <Text style={styles.submitBtnText}>Submit Request</Text>
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
  multiline: { minHeight: 90, textAlignVertical: 'top' },
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
