import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useComplaint, useResolveComplaint } from './hooks/useComplaints';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { SearchableSelect } from '../../shared/components/SearchableSelect';
import { normalizeError } from '../../shared/utils/errors';
import { formatDate } from '../../shared/utils/date';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface ComplaintDetailScreenProps {
  route: { params: { id: string } };
}

const RESOLVE_STATUSES = [
  { label: 'In Progress', value: 'InProgress' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
  { label: 'Rejected', value: 'Rejected' },
];

export function ComplaintDetailScreen({ route }: ComplaintDetailScreenProps) {
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl ?? '');
  const isAdmin = role === 'SUAdmin' || role === 'HQAdmin';

  const { id } = route.params;
  const { data: complaint, isLoading } = useComplaint(societyId, id);
  const { mutateAsync: resolveComplaint, isPending: isResolving } = useResolveComplaint(societyId);

  const [resolveStatus, setResolveStatus] = useState<'InProgress' | 'Resolved' | 'Closed' | 'Rejected'>('Resolved');
  const [notes, setNotes] = useState('');

  async function handleResolve(): Promise<void> {
    Alert.alert(
      'Update Status',
      `Set complaint status to "${resolveStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await resolveComplaint({ id, status: resolveStatus, notes: notes.trim() || undefined });
              Alert.alert('Success', 'Complaint status updated.');
            } catch (e) {
              Alert.alert('Error', normalizeError(e));
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Complaint" showBack />
      <LoadingOverlay visible={isLoading || isResolving} />
      {complaint != null && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{complaint.tt}</Text>
            <StatusChip status={complaint.st} />
          </View>

          <View style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{complaint.cat}</Text>
            </View>
            <View style={[styles.badge, styles.priorityBadge]}>
              <Text style={styles.badgeText}>{complaint.pr}</Text>
            </View>
          </View>

          <Text style={styles.description}>{complaint.ds}</Text>

          <Text style={styles.meta}>
            Raised: {formatDate(complaint.ca)}
          </Text>
          {complaint.ra != null && (
            <Text style={styles.meta}>Resolved: {formatDate(complaint.ra)}</Text>
          )}

          {isAdmin && (
            <View style={styles.resolveSection}>
              <Text style={styles.sectionTitle}>Update Status</Text>
              <SearchableSelect
                options={RESOLVE_STATUSES}
                value={resolveStatus}
                onChange={(v) => setResolveStatus(v as typeof resolveStatus)}
                placeholder="Select new status"
              />
              <TouchableOpacity
                style={styles.resolveButton}
                onPress={() => void handleResolve()}
                disabled={isResolving}
              >
                <Text style={styles.resolveButtonText}>Update Status</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityBadge: { borderColor: colors.warning, backgroundColor: '#FFFBEB' },
  badgeText: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  meta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
    marginBottom: 4,
  },
  resolveSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  resolveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  resolveButtonText: {
    color: '#FFF',
    fontWeight: typography.fontWeight.semibold,
  },
});
