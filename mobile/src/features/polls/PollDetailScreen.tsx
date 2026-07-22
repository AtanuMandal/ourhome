import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { usePoll, useCastVote, useClosePoll, usePublishPollResults } from './hooks/usePolls';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Poll, PollOption, PollOptionTally } from '../../api/types';

interface PollDetailScreenProps {
  route: { params: { id: string } };
}

function outcomeStyle(outcome: string) {
  switch (outcome) {
    case 'Passed': return { backgroundColor: '#E8F5E9', color: '#2E7D32' };
    case 'Failed': return { backgroundColor: '#FFEBEE', color: '#C62828' };
    default: return { backgroundColor: '#FFF3E0', color: '#E65100' };
  }
}

function targetAudienceLabel(poll: Poll): string {
  if (poll.ta === 'FullSociety') return 'Full Society';
  return `${poll.ta === 'PerBlock' ? 'Block' : 'Blocks'}: ${poll.tbn.join(', ')}`;
}

export function PollDetailScreen({ route }: PollDetailScreenProps) {
  const { id } = route.params;
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl ?? '');
  const isAdmin = role === 'SUAdmin';

  const { data: poll, isLoading } = usePoll(societyId, id);
  const castVote = useCastVote(societyId, id);
  const closePoll = useClosePoll(societyId);
  const publishResults = usePublishPollResults(societyId);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(poll?.mso ?? []));
  }, [poll?.mso]);

  if (isLoading || !poll) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <AppHeader title="Poll" showBack />
        <LoadingOverlay visible={isLoading} />
      </SafeAreaView>
    );
  }

  const canVote = role === 'SUUser' && poll.st === 'Open';
  const readOnlyVote = poll.hv && !poll.avc;

  function toggleOption(optionId: string): void {
    setSelected((prev) => {
      const next = new Set(poll!.ty === 'SingleChoice' ? [] : prev);
      if (poll!.ty === 'SingleChoice') {
        next.add(optionId);
      } else if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
      return next;
    });
  }

  async function handleVote(): Promise<void> {
    if (selected.size === 0) return;
    try {
      await castVote.mutateAsync({ selectedOptionIds: Array.from(selected) });
      Alert.alert('Vote recorded');
    } catch (e) {
      Alert.alert('Could not record vote', normalizeError(e));
    }
  }

  async function handleClose(): Promise<void> {
    try {
      await closePoll.mutateAsync(id);
    } catch (e) {
      Alert.alert('Could not close poll', normalizeError(e));
    }
  }

  async function handlePublish(): Promise<void> {
    try {
      await publishResults.mutateAsync(id);
    } catch (e) {
      Alert.alert('Could not publish results', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Poll" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{poll.tt}</Text>
        {poll.agm && (
          <View style={styles.agmBadge}><Text style={styles.agmBadgeText}>AGM Resolution</Text></View>
        )}
        <Text style={styles.description}>{poll.ds}</Text>
        <Text style={styles.meta}>
          Opens {new Date(poll.oa).toLocaleString()} · Closes {new Date(poll.ca).toLocaleString()} · {poll.st}
        </Text>
        <Text style={styles.meta}>Target: {targetAudienceLabel(poll)}</Text>

        {poll.oc && (
          <View style={[styles.outcomeBanner, { backgroundColor: outcomeStyle(poll.oc).backgroundColor }]}>
            <Text style={{ color: outcomeStyle(poll.oc).color, fontWeight: typography.fontWeight.bold }}>
              Outcome: {poll.oc === 'NoQuorum' ? 'No Quorum Reached' : poll.oc}
            </Text>
          </View>
        )}

        {canVote && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast Your Vote</Text>
            {readOnlyVote ? (
              <Text>
                You voted for: {poll.op.filter((o: PollOption) => poll.mso?.includes(o.id)).map((o: PollOption) => o.tx).join(', ')}
              </Text>
            ) : (
              <>
                {poll.op.map((o: PollOption) => (
                  <TouchableOpacity key={o.id} style={styles.optionRow} onPress={() => toggleOption(o.id)}>
                    <View style={[styles.optionMarker, selected.has(o.id) && styles.optionMarkerSelected]} />
                    <Text style={styles.optionLabel}>{o.tx}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.voteButton} onPress={() => void handleVote()} disabled={castVote.isPending || selected.size === 0}>
                  <Text style={styles.voteButtonText}>{poll.hv ? 'Change Vote' : 'Submit Vote'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {poll.tl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tally</Text>
            {poll.pc != null && poll.elc != null && (
              <Text style={styles.meta}>{poll.pc} of {poll.elc} eligible have voted</Text>
            )}
            {poll.tl.map((t: PollOptionTally) => (
              <View key={t.id} style={styles.tallyRow}>
                <Text>{t.tx}</Text>
                <Text style={styles.tallyCount}>{t.vc}</Text>
              </View>
            ))}
          </View>
        )}

        {isAdmin && (
          <View style={styles.adminActions}>
            {poll.st === 'Open' && (
              <TouchableOpacity style={styles.adminButton} onPress={() => void handleClose()} disabled={closePoll.isPending}>
                <Text style={styles.adminButtonText}>Close Poll Early</Text>
              </TouchableOpacity>
            )}
            {poll.st === 'Closed' && !poll.rp && (
              <TouchableOpacity style={styles.adminButton} onPress={() => void handlePublish()} disabled={publishResults.isPending}>
                <Text style={styles.adminButtonText}>Publish Results</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  agmBadge: { alignSelf: 'flex-start', backgroundColor: '#F3E5F5', borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: spacing.xs },
  agmBadgeText: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: '#6A1B9A' },
  description: { fontSize: typography.fontSize.base, color: colors.text.secondary, marginTop: spacing.xs },
  meta: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs },
  outcomeBanner: { borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
  section: { marginTop: spacing.lg },
  sectionTitle: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, textTransform: 'uppercase', marginBottom: spacing.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  optionMarker: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  optionMarkerSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionLabel: { fontSize: typography.fontSize.base, color: colors.text.primary },
  voteButton: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  voteButtonText: { color: '#FFF', fontWeight: typography.fontWeight.semibold },
  tallyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  tallyCount: { fontWeight: typography.fontWeight.semibold },
  adminActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  adminButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  adminButtonText: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
});
