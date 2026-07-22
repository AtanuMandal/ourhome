import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useSosAlertList, useAcknowledgeSosAlert, useResolveSosAlert } from './hooks/useSos';
import { AppHeader } from '../../shared/components/AppHeader';
import { EmptyState } from '../../shared/components/EmptyState';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { SosAlert, SosAlertStatus } from '../../api/types';

const STATUS_FILTERS: { value: SosAlertStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'Triggered', label: 'Triggered' },
  { value: 'Acknowledged', label: 'Acknowledged' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'FalseAlarm', label: 'False Alarm' },
];

const CATEGORY_LABELS: Record<string, string> = {
  Fire: 'Fire',
  Medical: 'Medical',
  SecurityIntrusion: 'Security / Intrusion',
  Other: 'Other',
};

export function SosAlertListScreen() {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl ?? '');
  const isAdmin = role === 'SUAdmin';
  // Any resident can view alerts; only SUAdmin/SUSecurity can acknowledge/resolve them.
  const canAct = role === 'SUAdmin' || role === 'SUSecurity';
  const [statusFilter, setStatusFilter] = useState<SosAlertStatus | undefined>(undefined);

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } = useSosAlertList(
    societyId,
    statusFilter ? { status: statusFilter } : undefined
  );
  const acknowledge = useAcknowledgeSosAlert(societyId);
  const resolve = useResolveSosAlert(societyId);

  const handleAcknowledge = useCallback((alert: SosAlert) => {
    acknowledge.mutate(alert.id, { onError: (e) => Alert.alert('Could not acknowledge', normalizeError(e)) });
  }, [acknowledge]);

  const handleResolve = useCallback((alert: SosAlert) => {
    resolve.mutate(alert.id, { onError: (e) => Alert.alert('Could not resolve', normalizeError(e)) });
  }, [resolve]);

  const renderItem = useCallback(({ item }: { item: SosAlert }) => {
    return (
      <View style={[styles.card, item.st === 'Triggered' && styles.cardActive]}>
        <Text style={styles.cardTitle}>
          {CATEGORY_LABELS[item.cat] ?? item.cat} — {item.al}
        </Text>
        <Text style={styles.cardMeta}>
          {item.un} · {new Date(item.ta).toLocaleString()}
        </Text>
        {!!item.nt && <Text style={styles.cardNote}>{item.nt}</Text>}
        {item.ec > 0 && <Text style={styles.escalated}>Escalated {item.ec}x</Text>}
        <View style={styles.cardFooter}>
          <View style={[styles.statusChip, statusChipStyle(item.st)]}>
            <Text style={styles.statusChipText}>{item.st}</Text>
          </View>
          <View style={styles.actions}>
            {canAct && item.st === 'Triggered' && (
              <TouchableOpacity style={styles.ackButton} onPress={() => handleAcknowledge(item)} disabled={acknowledge.isPending}>
                <Text style={styles.ackButtonText}>Acknowledge</Text>
              </TouchableOpacity>
            )}
            {canAct && (item.st === 'Triggered' || item.st === 'Acknowledged') && (
              <TouchableOpacity style={styles.resolveButton} onPress={() => handleResolve(item)} disabled={resolve.isPending}>
                <Text style={styles.resolveButtonText}>Resolve</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }, [handleAcknowledge, handleResolve, acknowledge.isPending, resolve.isPending, canAct]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="SOS Alerts" showMenu />
      {isAdmin && (
        <TouchableOpacity style={styles.reportLink} onPress={() => navigation.navigate('SosAlertReport')}>
          <Text style={styles.reportLinkText}>View Report →</Text>
        </TouchableOpacity>
      )}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipSelected]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={statusFilter === f.value ? styles.filterTextSelected : styles.filterText}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} tintColor={colors.primary} />}
        onEndReached={() => {
          if (hasNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={!isLoading ? <EmptyState icon="🚨" title="No SOS alerts" /> : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

function statusChipStyle(status: SosAlertStatus) {
  switch (status) {
    case 'Triggered': return { backgroundColor: '#FFEBEE' };
    case 'Acknowledged': return { backgroundColor: '#FFF8E1' };
    case 'Resolved': return { backgroundColor: '#E8F5E9' };
    default: return { backgroundColor: '#ECEFF1' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  reportLink: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  reportLinkText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  filterChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  filterTextSelected: { fontSize: typography.fontSize.xs, color: '#FFF', fontWeight: typography.fontWeight.semibold },
  listContent: { padding: spacing.md },
  emptyContainer: { flex: 1 },
  separator: { height: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, gap: 4 },
  cardActive: { borderWidth: 1, borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
  cardTitle: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  cardMeta: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  cardNote: { fontSize: typography.fontSize.xs, fontStyle: 'italic', color: colors.text.primary },
  escalated: { fontSize: typography.fontSize.xs, color: '#E65100', fontWeight: typography.fontWeight.semibold },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  statusChip: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusChipText: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  actions: { flexDirection: 'row', gap: spacing.xs },
  ackButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  ackButtonText: { color: colors.primary, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
  resolveButton: { borderWidth: 1, borderColor: colors.error, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  resolveButtonText: { color: colors.error, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold },
});
