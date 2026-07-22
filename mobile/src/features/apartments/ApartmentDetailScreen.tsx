import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { apartmentsApi } from '../../api/endpoints/apartments';
import { usersApi } from '../../api/endpoints/users';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatApartmentLabel } from '../../shared/utils/apartment';
import { formatDate } from '../../shared/utils/date';

type ApartmentsStackNav = NativeStackNavigationProp<{
  ApartmentList: undefined;
  ApartmentDetail: { id: string };
  ApartmentForm: { id?: string };
}>;

const MEMBER_TYPE_OPTIONS = [
  { label: 'Family Member', value: 'FamilyMember' },
  { label: 'Co-Occupant', value: 'CoOccupant' },
];

const TRANSFER_TYPE_OPTIONS = [
  { label: 'Ownership transfer', value: 'ownership' },
  { label: 'Tenancy transfer', value: 'tenancy' },
];

/**
 * SUAdmin apartment administration: residents, status, household members,
 * ownership/tenancy transfer, resident history, and delete.
 */
export function ApartmentDetailScreen() {
  const navigation = useNavigation<ApartmentsStackNav>();
  const route = useRoute<{ key: string; name: string; params: { id: string } }>();
  const queryClient = useQueryClient();
  const societyId = useSocietyId();
  const apartmentId = route.params.id;

  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberType, setMemberType] = useState<'FamilyMember' | 'CoOccupant'>('FamilyMember');

  const [transferType, setTransferType] = useState<'ownership' | 'tenancy'>('ownership');
  const [transferName, setTransferName] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { data: apartment, isLoading } = useQuery({
    queryKey: ['apartment', societyId, apartmentId],
    queryFn: () => apartmentsApi.getApartment(societyId, apartmentId),
    enabled: !!societyId,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['apartment-history', societyId, apartmentId],
    queryFn: () => apartmentsApi.getResidentHistory(societyId, apartmentId),
    enabled: !!societyId && showHistory,
  });

  function invalidate(): void {
    void queryClient.invalidateQueries({ queryKey: ['apartment', societyId, apartmentId] });
    void queryClient.invalidateQueries({ queryKey: ['apartments'] });
    void queryClient.invalidateQueries({ queryKey: ['apartment-history', societyId, apartmentId] });
  }

  const changeStatus = useMutation({
    mutationFn: (status: 'Available' | 'UnderMaintenance') =>
      apartmentsApi.changeStatus(societyId, apartmentId, status, 'Changed from mobile app'),
    onSuccess: invalidate,
    onError: (e) => Alert.alert('Could not change status', normalizeError(e)),
  });

  const deleteApartment = useMutation({
    mutationFn: () => apartmentsApi.deleteApartment(societyId, apartmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['apartments'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert('Could not delete apartment', normalizeError(e)),
  });

  const addMember = useMutation({
    mutationFn: () =>
      usersApi.addHouseholdMember(societyId, apartmentId, {
        fullName: memberName.trim(),
        email: memberEmail.trim(),
        phone: memberPhone.trim(),
        residentType: memberType,
      }),
    onSuccess: () => {
      setMemberName(''); setMemberEmail(''); setMemberPhone('');
      invalidate();
      Alert.alert('Member added', 'The household member has been added.');
    },
    onError: (e) => Alert.alert('Could not add member', normalizeError(e)),
  });

  const transfer = useMutation({
    mutationFn: () => {
      const dto = { fullName: transferName.trim(), email: transferEmail.trim(), phone: transferPhone.trim() };
      return transferType === 'ownership'
        ? usersApi.transferOwnership(societyId, apartmentId, dto)
        : usersApi.transferTenancy(societyId, apartmentId, dto);
    },
    onSuccess: () => {
      setTransferName(''); setTransferEmail(''); setTransferPhone('');
      invalidate();
      Alert.alert('Transfer complete', `The ${transferType} has been transferred.`);
    },
    onError: (e) => Alert.alert('Could not transfer', normalizeError(e)),
  });

  function confirmDelete(): void {
    Alert.alert('Delete apartment', 'This permanently removes the apartment. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteApartment.mutate() },
    ]);
  }

  const memberValid = memberName.trim() && /\S+@\S+\.\S+/.test(memberEmail.trim()) && memberPhone.trim();
  const transferValid = transferName.trim() && /\S+@\S+\.\S+/.test(transferEmail.trim()) && transferPhone.trim();
  const label = apartment
    ? formatApartmentLabel(apartment.blk, apartment.flr, apartment.num)
    : 'Apartment';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title={label} showBack />
      <LoadingOverlay visible={isLoading || changeStatus.isPending || deleteApartment.isPending || addMember.isPending || transfer.isPending} />
      <ScrollView contentContainerStyle={styles.content}>
        {apartment && (
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle}>Status</Text>
              <StatusChip status={apartment.st} />
            </View>
            <View style={styles.btnRow}>
              {apartment.st !== 'Available' && (
                <TouchableOpacity style={styles.smallBtn} onPress={() => changeStatus.mutate('Available')}>
                  <Text style={styles.smallBtnText}>Mark Available</Text>
                </TouchableOpacity>
              )}
              {apartment.st !== 'UnderMaintenance' && (
                <TouchableOpacity style={[styles.smallBtn, styles.warnBtn]} onPress={() => changeStatus.mutate('UnderMaintenance')}>
                  <Text style={styles.smallBtnText}>Under Maintenance</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.smallBtn, styles.editBtn]} onPress={() => navigation.navigate('ApartmentForm', { id: apartmentId })}>
                <Text style={styles.smallBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.section}>Residents</Text>
        <View style={styles.card}>
          {(apartment?.res ?? []).map((r) => (
            <View key={r.uid} style={styles.residentRow}>
              <Text style={styles.residentName}>{r.unm}</Text>
              <Text style={styles.residentType}>{r.rt}</Text>
            </View>
          ))}
          {apartment && apartment.res.length === 0 && <Text style={styles.hint}>No residents.</Text>}
        </View>

        <Text style={styles.section}>Add household member</Text>
        <TextInput style={styles.input} value={memberName} onChangeText={setMemberName} placeholder="Full name" />
        <TextInput style={[styles.input, styles.inputGap]} value={memberEmail} onChangeText={setMemberEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={[styles.input, styles.inputGap]} value={memberPhone} onChangeText={setMemberPhone} placeholder="Phone" keyboardType="phone-pad" />
        <View style={styles.inputGap}>
          <SearchableSelect options={MEMBER_TYPE_OPTIONS} value={memberType} onChange={(v) => setMemberType(v as 'FamilyMember' | 'CoOccupant')} />
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, !memberValid && styles.actionBtnDisabled]}
          disabled={!memberValid || addMember.isPending}
          onPress={() => addMember.mutate()}
        >
          <Text style={styles.actionBtnText}>Add Member</Text>
        </TouchableOpacity>

        <Text style={styles.section}>Transfer resident</Text>
        <SearchableSelect options={TRANSFER_TYPE_OPTIONS} value={transferType} onChange={(v) => setTransferType(v as 'ownership' | 'tenancy')} />
        <TextInput style={[styles.input, styles.inputGap]} value={transferName} onChangeText={setTransferName} placeholder="New resident full name" />
        <TextInput style={[styles.input, styles.inputGap]} value={transferEmail} onChangeText={setTransferEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={[styles.input, styles.inputGap]} value={transferPhone} onChangeText={setTransferPhone} placeholder="Phone" keyboardType="phone-pad" />
        <TouchableOpacity
          style={[styles.actionBtn, !transferValid && styles.actionBtnDisabled]}
          disabled={!transferValid || transfer.isPending}
          onPress={() => transfer.mutate()}
        >
          <Text style={styles.actionBtnText}>Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.historyToggle} onPress={() => setShowHistory((v) => !v)}>
          <Text style={styles.historyToggleText}>{showHistory ? 'Hide resident history' : 'Show resident history'}</Text>
        </TouchableOpacity>
        {showHistory && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ownership history</Text>
            {(history?.oh ?? []).map((h, i) => (
              <Text key={`o-${h.uid}-${i}`} style={styles.historyRow}>
                {h.fn} — {formatDate(h.fu)}{h.tu ? ` to ${formatDate(h.tu)}` : ' (current)'}
              </Text>
            ))}
            <Text style={[styles.cardTitle, styles.inputGap]}>Tenant history</Text>
            {(history?.th ?? []).map((h, i) => (
              <Text key={`t-${h.uid}-${i}`} style={styles.historyRow}>
                {h.fn} — {formatDate(h.fu)}{h.tu ? ` to ${formatDate(h.tu)}` : ' (current)'}
              </Text>
            ))}
            {!historyLoading && (history?.oh ?? []).length === 0 && (history?.th ?? []).length === 0 && (
              <Text style={styles.hint}>No history recorded.</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteBtnText}>Delete Apartment</Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  smallBtn: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  warnBtn: { backgroundColor: '#F59E0B' },
  editBtn: { backgroundColor: '#059669' },
  smallBtnText: { color: '#FFF', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  residentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  residentName: { fontSize: typography.fontSize.base, color: colors.text.primary },
  residentType: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  hint: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  inputGap: { marginTop: spacing.xs },
  actionBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#FFF', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  historyToggle: { marginTop: spacing.lg, marginBottom: spacing.xs },
  historyToggleText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  historyRow: { fontSize: typography.fontSize.sm, color: colors.text.primary, marginTop: 4 },
  deleteBtn: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.error, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
