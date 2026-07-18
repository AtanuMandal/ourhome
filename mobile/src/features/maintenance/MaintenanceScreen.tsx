import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useActiveApartment } from '../../shared/hooks/useActiveApartment';
import { useMaintenanceList, useSubmitPaymentProof } from './hooks/useMaintenance';
import { maintenanceApi } from '../../api/endpoints/maintenance';
import { pickImageFile, type PickedFile } from '../../camera/ImagePicker';
import { pickProofDocument } from '../../camera/DocumentPicker';
import { viewRemoteFile } from '../../camera/fileViewer';
import { resolveFileUrl } from '../../camera/imageUpload';
import { isImageUrl, fileKindLabel, extensionOf } from '../../shared/utils/fileType';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { EmptyState } from '../../shared/components/EmptyState';
import { CurrencyText } from '../../shared/components/CurrencyText';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDate } from '../../shared/utils/date';
import type { MaintenanceCharge } from '../../api/types';

/** A payment-proof thumbnail: images render inline (existing behavior, unchanged); non-image
 *  files (PDF/Word/Excel) render a file-type tile that downloads and opens the file via the
 *  OS share sheet when tapped — there's no browser "new tab" on mobile, so this is the
 *  equivalent affordance for viewing a document proof. */
function ProofThumb({ url, fileName }: { url: string; fileName?: string }) {
  const [opening, setOpening] = useState(false);

  if (isImageUrl(url)) {
    return <Image source={{ uri: resolveFileUrl(url) }} style={styles.proofThumb} />;
  }

  async function handleView(): Promise<void> {
    if (opening) return;
    setOpening(true);
    try {
      await viewRemoteFile(url, fileName ?? `proof.${extensionOf(url) || 'file'}`);
    } catch (e) {
      Alert.alert('Could not open file', normalizeError(e));
    } finally {
      setOpening(false);
    }
  }

  return (
    <TouchableOpacity
      style={styles.proofThumb}
      onPress={() => void handleView()}
      disabled={opening}
      accessibilityLabel="View proof file"
    >
      {opening ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text style={styles.proofThumbLabel}>{fileKindLabel(url)}</Text>
      )}
    </TouchableOpacity>
  );
}

const STATUS_FILTERS = ['All', 'Pending', 'ProofSubmitted', 'Paid', 'Overdue'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A charge that hasn't been paid and isn't already awaiting admin review can have proof submitted.
function isSelectableCharge(charge: MaintenanceCharge): boolean {
  return charge.status === 'Pending' || charge.status === 'Rejected';
}

interface GroupedSubmission {
  key: string;
  apartmentNumber: string;
  status: 'ProofSubmitted' | 'Paid';
  charges: MaintenanceCharge[];
  totalAmount: number;
}

type DenyTarget = { type: 'single'; chargeId: string } | { type: 'group'; chargeIds: string[] };

/** "Apr 2026" for a single-period group, "Apr 2026 – Jun 2026" when it spans several. */
function formatPeriodRange(charges: MaintenanceCharge[]): string {
  if (charges.length === 0) return '';
  const sorted = [...charges].sort((a, b) => (a.chargeYear * 100 + a.chargeMonth) - (b.chargeYear * 100 + b.chargeMonth));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstLabel = `${MONTHS[first.chargeMonth - 1]} ${first.chargeYear}`;
  const lastLabel = `${MONTHS[last.chargeMonth - 1]} ${last.chargeYear}`;
  return firstLabel === lastLabel ? firstLabel : `${firstLabel} – ${lastLabel}`;
}

export function MaintenanceScreen() {
  const societyId = useSocietyId();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role ?? '');
  // Matches the backend's allow-list: only SUAdmin/HQAdmin may list charges society-wide;
  // everyone else must scope the query to their own apartment or the API returns Forbidden.
  const isAdmin = role === 'SUAdmin' || role === 'HQAdmin';
  const { activeApartmentId } = useActiveApartment();
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedProof, setUploadedProof] = useState<{ fileName: string; fileUrl: string } | null>(null);

  const params: Record<string, string | number> = {};
  if (selectedStatus !== 'All') params.status = selectedStatus;
  if (!isAdmin && activeApartmentId) params.apartmentId = activeApartmentId;

  // Hold the query until a resident's apartment id is known — firing without it would 403.
  const listEnabled = isAdmin || !!activeApartmentId;
  const { data, isLoading, fetchNextPage, hasNextPage, refetch } =
    useMaintenanceList(societyId, Object.keys(params).length > 0 ? params : undefined, listEnabled);
  const { mutate: submitProof, isPending: submitting } = useSubmitPaymentProof(societyId);

  const selectableCount = data.filter(isSelectableCharge).length;

  // Clubbed submissions: a resident can select several charges (often across different months)
  // and submit one proof for all of them — the backend stamps every charge in that call with the
  // same submissionGroupId. A group needs 2+ members; a lone submission renders as a normal card.
  // Denying breaks the group apart (member charges become Rejected, excluded below), matching
  // "falls back to the default view"; approving keeps it clustered, now shown as Paid.
  const groupedSubmissions = useMemo<GroupedSubmission[]>(() => {
    const byKey = new Map<string, MaintenanceCharge[]>();
    for (const charge of data) {
      if (charge.status !== 'ProofSubmitted' && charge.status !== 'Paid') continue;
      if (!charge.submissionGroupId) continue;
      const key = `${charge.apartmentId}|${charge.submissionGroupId}`;
      const list = byKey.get(key) ?? [];
      list.push(charge);
      byKey.set(key, list);
    }

    return Array.from(byKey.entries())
      .filter(([, charges]) => charges.length >= 2)
      .map(([key, charges]) => {
        const sorted = [...charges].sort((a, b) => (a.chargeYear * 100 + a.chargeMonth) - (b.chargeYear * 100 + b.chargeMonth));
        return {
          key,
          apartmentNumber: sorted[0].apartmentNumber,
          status: sorted.every((c) => c.status === 'Paid') ? ('Paid' as const) : ('ProofSubmitted' as const),
          charges: sorted,
          totalAmount: sorted.reduce((sum, c) => sum + c.amount, 0),
        };
      });
  }, [data]);

  const groupedChargeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of groupedSubmissions) for (const charge of group.charges) ids.add(charge.id);
    return ids;
  }, [groupedSubmissions]);

  const [denyTarget, setDenyTarget] = useState<DenyTarget | null>(null);
  const [denyReason, setDenyReason] = useState('');

  function openDenyDialog(target: DenyTarget): void {
    setDenyReason('');
    setDenyTarget(target);
  }

  // Admin actions — approve a submitted proof or mark a charge paid directly (offline payment).
  const adminAction = useMutation({
    mutationFn: ({ chargeId, action }: { chargeId: string; action: 'approve' | 'mark-paid' }) =>
      action === 'approve'
        ? maintenanceApi.approveProof(societyId, chargeId, { paymentMethod: 'Offline', notes: 'Approved from mobile app' })
        : maintenanceApi.markPaid(societyId, chargeId, { paymentMethod: 'Offline', notes: 'Marked paid from mobile app' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
    onError: (e) => Alert.alert('Could not update charge', normalizeError(e)),
  });

  const denyMutation = useMutation({
    mutationFn: (chargeId: string) => maintenanceApi.denyProof(societyId, chargeId, denyReason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setDenyTarget(null);
    },
    onError: (e) => Alert.alert('Could not deny proof', normalizeError(e)),
  });

  const approveGroupMutation = useMutation({
    mutationFn: (chargeIds: string[]) =>
      maintenanceApi.approveProofGroup(societyId, chargeIds, { paymentMethod: 'Offline', notes: 'Approved from mobile app' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
    onError: (e) => Alert.alert('Could not approve submission', normalizeError(e)),
  });

  const denyGroupMutation = useMutation({
    mutationFn: (chargeIds: string[]) => maintenanceApi.denyProofGroup(societyId, chargeIds, denyReason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setDenyTarget(null);
    },
    onError: (e) => Alert.alert('Could not deny submission', normalizeError(e)),
  });

  function confirmDeny(): void {
    if (!denyTarget || !denyReason.trim()) return;
    if (denyTarget.type === 'single') denyMutation.mutate(denyTarget.chargeId);
    else denyGroupMutation.mutate(denyTarget.chargeIds);
  }

  const isDenying = denyMutation.isPending || denyGroupMutation.isPending;

  function toggleChargeSelection(chargeId: string): void {
    setSelectedChargeIds((prev) =>
      prev.includes(chargeId) ? prev.filter((id) => id !== chargeId) : [...prev, chargeId]
    );
  }

  async function handlePickFile(picker: () => Promise<PickedFile | null>): Promise<void> {
    const file = await picker();
    if (!file) return;

    setUploading(true);
    try {
      const result = await maintenanceApi.uploadPaymentProof(societyId, file);
      setUploadedProof(result);
    } catch (e) {
      Alert.alert('Could not upload proof', normalizeError(e));
    } finally {
      setUploading(false);
    }
  }

  function handleSubmitProof(): void {
    if (selectedChargeIds.length === 0 || !uploadedProof) return;

    submitProof(
      { chargeIds: selectedChargeIds, proofUrl: uploadedProof.fileUrl, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setSelectedChargeIds([]);
          setUploadedProof(null);
          setNotes('');
          Alert.alert('Submitted', 'Payment proof submitted for review.');
        },
        onError: (e) => Alert.alert('Could not submit proof', normalizeError(e)),
      }
    );
  }

  const renderItem = useCallback(({ item }: { item: MaintenanceCharge }) => {
    const selectable = isSelectableCharge(item);
    const selected = selectedChargeIds.includes(item.id);
    return (
      <View style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.apartment}>{item.apartmentNumber}</Text>
          <CurrencyText amount={item.amount} style={styles.amount} />
        </View>
        <Text style={styles.period}>
          {MONTHS[(item.chargeMonth ?? 1) - 1]} {item.chargeYear}
        </Text>
        <View style={styles.itemBottom}>
          <StatusChip status={item.status} />
          <Text style={[styles.dueDate, item.isOverdue && styles.overdue]}>
            Due: {formatDate(item.dueDate)}
          </Text>
        </View>
        {selectable && (
          <TouchableOpacity
            style={styles.selectRow}
            onPress={() => toggleChargeSelection(item.id)}
            accessibilityLabel={selected ? 'Deselect charge' : 'Select charge for proof submission'}
          >
            <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
              {selected && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.selectRowText}>Include in proof submission</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Rejected' && item.rejectionReason && (
          <Text style={styles.rejectionText}>Denied: {item.rejectionReason}</Text>
        )}
        {item.proofs.length > 0 && (
          <View style={styles.proofList}>
            <Text style={styles.proofListTitle}>Submitted proofs</Text>
            {item.proofs.map((proof) => (
              <View key={proof.proofUrl + proof.submittedAt} style={styles.proofItem}>
                <ProofThumb url={proof.proofUrl} />
                <Text style={styles.proofItemText}>{formatDate(proof.submittedAt)}</Text>
              </View>
            ))}
          </View>
        )}
        {isAdmin && groupedChargeIds.has(item.id) && (
          <Text style={styles.groupedNote}>Part of a clubbed submission — review it above.</Text>
        )}
        {isAdmin && item.status !== 'Paid' && !groupedChargeIds.has(item.id) && (
          <View style={styles.adminRow}>
            {item.status === 'ProofSubmitted' && (
              <>
                <TouchableOpacity
                  style={[styles.adminBtn, styles.adminApprove]}
                  disabled={adminAction.isPending}
                  onPress={() => adminAction.mutate({ chargeId: item.id, action: 'approve' })}
                >
                  <Text style={styles.adminBtnText}>Approve proof</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adminBtn, styles.adminDeny]}
                  disabled={adminAction.isPending}
                  onPress={() => openDenyDialog({ type: 'single', chargeId: item.id })}
                >
                  <Text style={styles.adminBtnText}>Deny</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.adminBtn}
              disabled={adminAction.isPending}
              onPress={() => adminAction.mutate({ chargeId: item.id, action: 'mark-paid' })}
            >
              <Text style={styles.adminBtnText}>Mark paid</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChargeIds, isAdmin, adminAction.isPending, groupedChargeIds]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Maintenance" showMenu />
      <View style={styles.filters}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filter, selectedStatus === s && styles.filterActive]}
            onPress={() => setSelectedStatus(s)}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === s && styles.filterTextActive,
              ]}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isAdmin && groupedSubmissions.length > 0 && (
        <View style={styles.groupSection}>
          <Text style={styles.groupSectionTitle}>Clubbed payment proof submissions</Text>
          <Text style={styles.groupSectionCopy}>Charges a resident submitted together in one proof upload.</Text>
          {groupedSubmissions.map((group) => {
            const latestProof = group.charges[0].proofs[group.charges[0].proofs.length - 1];
            return (
              <View key={group.key} style={styles.groupCard}>
                <View style={styles.groupCardTop}>
                  <Text style={styles.groupApartment}>{group.apartmentNumber}</Text>
                  <StatusChip status={group.status} />
                </View>
                <Text style={styles.groupMeta}>
                  {formatPeriodRange(group.charges)} · {group.charges.length} charges
                </Text>
                <CurrencyText amount={group.totalAmount} style={styles.groupAmount} />
                {latestProof && (
                  <View style={styles.proofItem}>
                    <ProofThumb url={latestProof.proofUrl} />
                    <Text style={styles.proofItemText}>Proof submitted {formatDate(latestProof.submittedAt)}</Text>
                  </View>
                )}
                {group.status === 'ProofSubmitted' && (
                  <View style={styles.adminRow}>
                    <TouchableOpacity
                      style={[styles.adminBtn, styles.adminApprove]}
                      disabled={approveGroupMutation.isPending}
                      onPress={() => approveGroupMutation.mutate(group.charges.map((c) => c.id))}
                    >
                      <Text style={styles.adminBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.adminBtn, styles.adminDeny]}
                      disabled={denyGroupMutation.isPending}
                      onPress={() => openDenyDialog({ type: 'group', chargeIds: group.charges.map((c) => c.id) })}
                    >
                      <Text style={styles.adminBtnText}>Deny</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {selectableCount > 0 && (
        <View style={styles.proofForm}>
          <Text style={styles.proofFormTitle}>Submit payment proof</Text>
          <Text style={styles.proofFormCopy}>
            Select one or more unpaid charges above, upload a proof, and submit for admin approval.
          </Text>

          <View style={styles.pickRow}>
            <TouchableOpacity style={[styles.pickButton, styles.pickButtonFlex]} onPress={() => void handlePickFile(pickImageFile)} disabled={uploading}>
              <Text style={styles.pickButtonText}>{uploading ? 'Uploading...' : 'Pick proof photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickButton, styles.pickButtonFlex]} onPress={() => void handlePickFile(pickProofDocument)} disabled={uploading}>
              <Text style={styles.pickButtonText}>{uploading ? 'Uploading...' : 'Pick proof document'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.proofFormCopy}>Accepted: JPEG, PNG, PDF, Word, or Excel.</Text>

          {uploadedProof && (
            <View style={styles.proofItem}>
              <ProofThumb url={uploadedProof.fileUrl} fileName={uploadedProof.fileName} />
              <Text style={styles.proofItemText}>{uploadedProof.fileName}</Text>
            </View>
          )}

          <TextInput
            style={styles.notesInput}
            placeholder="Optional transaction details"
            placeholderTextColor={colors.text.disabled}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitButton, (selectedChargeIds.length === 0 || !uploadedProof || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmitProof}
            disabled={selectedChargeIds.length === 0 || !uploadedProof || submitting}
          >
            <Text style={styles.submitButtonText}>
              Submit proof for {selectedChargeIds.length} charge{selectedChargeIds.length === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
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
            <EmptyState icon="💰" title="No charges found" />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Modal visible={!!denyTarget} transparent animationType="fade" onRequestClose={() => setDenyTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Deny payment proof</Text>
            <Text style={styles.dialogHint}>
              Explain what&apos;s wrong with the proof so the resident can correct it.
            </Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={3}
              value={denyReason}
              onChangeText={setDenyReason}
              placeholder="Reason for denial"
              placeholderTextColor={colors.text.disabled}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setDenyTarget(null)} disabled={isDenying}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.denyConfirmButton, (!denyReason.trim() || isDenying) && styles.submitButtonDisabled]}
                disabled={!denyReason.trim() || isDenying}
                onPress={confirmDeny}
                accessibilityLabel="Confirm deny"
              >
                <Text style={styles.denyConfirmButtonText}>{isDenying ? 'Denying…' : 'Deny'}</Text>
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
  filters: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  filter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  filterTextActive: { color: '#FFF', fontWeight: typography.fontWeight.medium },
  item: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  apartment: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  amount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  period: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.sm },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dueDate: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  overdue: { color: colors.error },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { flex: 1 },
  selectRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.xs },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: '#FFF', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold },
  selectRowText: { fontSize: typography.fontSize.sm, color: colors.text.primary },
  proofList: { marginTop: spacing.sm, gap: spacing.xs },
  proofListTitle: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  proofItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  proofThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  proofThumbLabel: { fontSize: 10, fontWeight: typography.fontWeight.bold, color: colors.text.secondary },
  proofItemText: { fontSize: typography.fontSize.xs, color: colors.text.secondary, flexShrink: 1 },
  proofForm: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  proofFormTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  proofFormCopy: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  pickRow: { flexDirection: 'row', gap: spacing.sm },
  pickButton: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: 8, padding: spacing.sm, alignItems: 'center',
  },
  pickButtonFlex: { flex: 1 },
  pickButtonText: { color: colors.primary, fontWeight: typography.fontWeight.medium },
  notesInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm,
    fontSize: typography.fontSize.sm, color: colors.text.primary, minHeight: 44,
  },
  submitButton: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.sm, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#FFF', fontWeight: typography.fontWeight.semibold },
  adminRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  adminBtn: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  adminApprove: { backgroundColor: '#059669' },
  adminDeny: { backgroundColor: colors.error },
  adminBtnText: { color: '#FFF', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  rejectionText: { fontSize: typography.fontSize.xs, color: colors.error, fontWeight: typography.fontWeight.semibold, marginTop: spacing.xs },
  groupedNote: { fontSize: typography.fontSize.xs, color: colors.text.secondary, fontStyle: 'italic', marginTop: spacing.sm },
  groupSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupSectionTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  groupSectionCopy: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: -spacing.xs },
  groupCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    gap: 4,
  },
  groupCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupApartment: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  groupMeta: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  groupAmount: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  dialog: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, width: '100%', maxWidth: 420 },
  dialogTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.xs },
  dialogHint: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  cancelText: { color: colors.text.secondary, fontSize: typography.fontSize.base, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  denyConfirmButton: { backgroundColor: colors.error, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  denyConfirmButtonText: { color: '#FFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },
});
