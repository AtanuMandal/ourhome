import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useActiveApartment } from '../../shared/hooks/useActiveApartment';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { apartmentsApi } from '../../api/endpoints/apartments';
import { usersApi } from '../../api/endpoints/users';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatApartmentLabel } from '../../shared/utils/apartment';

const RESIDENT_TYPE_OPTIONS = [
  { label: 'Owner', value: 'Owner' },
  { label: 'Tenant', value: 'Tenant' },
];

/**
 * The resident's own apartment hub: household members, direct member invitations
 * (email → invite link to this apartment), and requesting to join another apartment.
 */
export function MyApartmentScreen() {
  const societyId = useSocietyId();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { apartments, activeApartmentId } = useActiveApartment();
  const apartmentId = activeApartmentId ?? apartments[0]?.aid ?? '';

  const [inviteEmail, setInviteEmail] = useState('');
  const [joinApartmentId, setJoinApartmentId] = useState('');
  const [joinResidentType, setJoinResidentType] = useState<'Owner' | 'Tenant'>('Tenant');

  const { data: apartment, isLoading } = useQuery({
    queryKey: ['my-apartment', societyId, apartmentId],
    queryFn: () => apartmentsApi.getApartment(societyId, apartmentId),
    enabled: !!societyId && !!apartmentId,
  });

  const { data: allApartments } = useQuery({
    queryKey: ['apartments-lookup', societyId],
    queryFn: () => apartmentsApi.getApartments(societyId, { page: 1, pageSize: 500 }),
    enabled: !!societyId,
  });

  const invite = useMutation({
    mutationFn: () => usersApi.shareInviteLink(societyId, inviteEmail.trim(), apartmentId),
    onSuccess: () => {
      setInviteEmail('');
      Alert.alert('Invite sent', 'An invitation to join your apartment has been emailed.');
    },
    onError: (e) => Alert.alert('Could not send invite', normalizeError(e)),
  });

  const joinRequest = useMutation({
    mutationFn: () => usersApi.requestApartmentJoin(societyId, userId, { apartmentId: joinApartmentId, residentType: joinResidentType }),
    onSuccess: () => {
      setJoinApartmentId('');
      Alert.alert('Request submitted', 'Your apartment join request is awaiting approval.');
    },
    onError: (e) => Alert.alert('Could not submit request', normalizeError(e)),
  });

  const apartmentOptions = (allApartments?.items ?? [])
    .filter((a) => !apartments.some((mine) => mine.aid === a.id))
    .map((a) => ({
      value: a.id,
      label: formatApartmentLabel(a.blk, a.flr, a.num),
    }));

  const inviteValid = /\S+@\S+\.\S+/.test(inviteEmail.trim());

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="My Apartment" showMenu />
      <LoadingOverlay visible={isLoading || invite.isPending || joinRequest.isPending} />
      <ScrollView contentContainerStyle={styles.content}>
        {apartmentId === '' ? (
          <Text style={styles.hint}>You are not linked to an apartment yet. Request to join one below.</Text>
        ) : (
          <>
            <Text style={styles.section}>
              {apartment ? formatApartmentLabel(apartment.blk, apartment.flr, apartment.num) : 'Apartment'}
            </Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Residents</Text>
              {(apartment?.res ?? []).map((r) => (
                <View key={r.uid} style={styles.residentRow}>
                  <Text style={styles.residentName}>{r.unm}</Text>
                  <Text style={styles.residentType}>{r.rt}</Text>
                </View>
              ))}
              {apartment && apartment.res.length === 0 && (
                <Text style={styles.hint}>No residents recorded.</Text>
              )}
            </View>

            <Text style={styles.section}>Invite a household member</Text>
            <Text style={styles.hint}>They get an email link to join this apartment directly.</Text>
            <View style={styles.inviteRow}>
              <TextInput
                style={[styles.input, styles.inviteInput]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="member@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.actionBtn, (!inviteValid || invite.isPending) && styles.actionBtnDisabled]}
                disabled={!inviteValid || invite.isPending}
                onPress={() => invite.mutate()}
              >
                <Text style={styles.actionBtnText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.section}>Request to join an apartment</Text>
        <Text style={styles.label}>Apartment</Text>
        <SearchableSelect
          options={apartmentOptions}
          value={joinApartmentId}
          onChange={setJoinApartmentId}
          placeholder="Select apartment"
        />
        <Text style={styles.label}>Join as</Text>
        <SearchableSelect
          options={RESIDENT_TYPE_OPTIONS}
          value={joinResidentType}
          onChange={(v) => setJoinResidentType(v as 'Owner' | 'Tenant')}
        />
        <TouchableOpacity
          style={[styles.actionBtn, styles.joinBtn, (!joinApartmentId || joinRequest.isPending) && styles.actionBtnDisabled]}
          disabled={!joinApartmentId || joinRequest.isPending}
          onPress={() => joinRequest.mutate()}
        >
          <Text style={styles.actionBtnText}>Submit Join Request</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  section: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  hint: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardTitle: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing.xs },
  residentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  residentName: { fontSize: typography.fontSize.base, color: colors.text.primary },
  residentType: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
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
  inviteRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  inviteInput: { flex: 1 },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  joinBtn: { marginTop: spacing.lg },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#FFF', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
});
