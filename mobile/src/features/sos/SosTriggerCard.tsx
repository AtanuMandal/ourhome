import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet } from 'react-native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useSosAlert, useTriggerSosAlert, useMarkSosAlertFalseAlarm } from './hooks/useSos';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { SosCategory } from '../../api/types';

const CATEGORIES: { value: SosCategory; label: string }[] = [
  { value: 'Fire', label: 'Fire' },
  { value: 'Medical', label: 'Medical' },
  { value: 'SecurityIntrusion', label: 'Security / Intrusion' },
  { value: 'Other', label: 'Other' },
];

const ACTIVE_STATUSES = new Set(['Triggered', 'Acknowledged']);
const POLL_INTERVAL_MS = 10_000;

export function SosTriggerCard() {
  const societyId = useSocietyId();
  const [showDialog, setShowDialog] = useState(false);
  const [category, setCategory] = useState<SosCategory>('Fire');
  const [note, setNote] = useState('');
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  const triggerAlert = useTriggerSosAlert(societyId);
  const markFalseAlarm = useMarkSosAlertFalseAlarm(societyId);
  const { data: activeAlert } = useSosAlert(societyId, activeAlertId ?? '', {
    refetchInterval: (query) => {
      const status = query.state.data?.st;
      return status && !ACTIVE_STATUSES.has(status) ? false : POLL_INTERVAL_MS;
    },
  });

  function openDialog() {
    setCategory('Fire');
    setNote('');
    setShowDialog(true);
  }

  function confirmTrigger() {
    triggerAlert.mutate(
      { category, note: note.trim() || undefined },
      {
        onSuccess: (alert) => {
          setShowDialog(false);
          setActiveAlertId(alert.id);
        },
        onError: (e) => Alert.alert('Could not send SOS alert', normalizeError(e)),
      }
    );
  }

  function handleFalseAlarm() {
    if (!activeAlertId) return;
    markFalseAlarm.mutate(activeAlertId, {
      onError: (e) => Alert.alert('Could not update alert', normalizeError(e)),
    });
  }

  if (activeAlert && activeAlertId) {
    const settled = !ACTIVE_STATUSES.has(activeAlert.st);
    return (
      <View style={[styles.statusCard, settled ? styles.statusCardSettled : styles.statusCardActive]}>
        <Text style={styles.statusTitle}>
          SOS: {activeAlert.cat} — {activeAlert.st}
        </Text>
        {activeAlert.st === 'Triggered' && (
          <Text style={styles.statusMeta}>Waiting for security/admin to acknowledge…</Text>
        )}
        {activeAlert.st === 'Acknowledged' && (
          <Text style={styles.statusMeta}>Acknowledged by {activeAlert.aun}</Text>
        )}
        {activeAlert.st === 'Resolved' && (
          <Text style={styles.statusMeta}>Resolved by {activeAlert.run}</Text>
        )}
        {activeAlert.st === 'FalseAlarm' && <Text style={styles.statusMeta}>Marked as a false alarm</Text>}

        {!settled ? (
          <TouchableOpacity style={styles.falseAlarmButton} onPress={handleFalseAlarm} disabled={markFalseAlarm.isPending}>
            <Text style={styles.falseAlarmText}>False Alarm</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.dismissButton} onPress={() => setActiveAlertId(null)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.sosButton} onPress={openDialog}>
        <Text style={styles.sosButtonIcon}>🚨</Text>
        <Text style={styles.sosButtonText}>SOS</Text>
      </TouchableOpacity>

      <Modal visible={showDialog} transparent animationType="fade" onRequestClose={() => setShowDialog(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Raise an SOS Alert</Text>
            <Text style={styles.dialogHint}>
              Security and the society admin will be notified immediately with your apartment details.
            </Text>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.categoryOption, category === c.value && styles.categoryOptionSelected]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={category === c.value ? styles.categoryTextSelected : styles.categoryText}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
              placeholder="Anything responders should know right away"
              placeholderTextColor={colors.text.disabled}
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setShowDialog(false)} disabled={triggerAlert.isPending}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.triggerButton} onPress={confirmTrigger} disabled={triggerAlert.isPending}>
                <Text style={styles.triggerButtonText}>{triggerAlert.isPending ? 'Sending…' : 'Trigger SOS'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sosButtonIcon: { fontSize: 22 },
  sosButtonText: { color: '#FFF', fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, letterSpacing: 1 },
  statusCard: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, gap: spacing.xs },
  statusCardActive: { backgroundColor: '#FFEBEE' },
  statusCardSettled: { backgroundColor: '#E8F5E9' },
  statusTitle: { fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base, color: colors.text.primary },
  statusMeta: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  falseAlarmButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.error, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  falseAlarmText: { color: colors.error, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  dismissButton: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 6 },
  dismissText: { color: colors.text.secondary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  dialog: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, width: '100%', maxWidth: 420 },
  dialogTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.xs },
  dialogHint: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md },
  fieldLabel: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs, marginTop: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, width: '47%' },
  categoryOptionSelected: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
  categoryText: { color: colors.text.primary, fontSize: typography.fontSize.sm },
  categoryTextSelected: { color: '#D32F2F', fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 72,
  },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  cancelText: { color: colors.text.secondary, fontSize: typography.fontSize.base, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  triggerButton: { backgroundColor: '#D32F2F', borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  triggerButtonText: { color: '#FFF', fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.base },
});
