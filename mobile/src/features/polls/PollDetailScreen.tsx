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
  if (poll.targetAudience === 'FullSociety') return 'Full Society';
  return `${poll.targetAudience === 'PerBlock' ? 'Block' : 'Blocks'}: ${poll.targetBlockNames.join(', ')}`;
}

export function PollDetailScreen({ route }: PollDetailScreenProps) {
  const { id } = route.params;
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const isAdmin = role === 'SUAdmin';

  const { data: poll, isLoading } = usePoll(societyId, id);
  const castVote = useCastVote(societyId, id);
  const closePoll = useClosePoll(societyId);
  const publishResults = usePublishPollResults(societyId);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(poll?.mySelectedOptionIds ?? []));
  }, [poll?.mySelectedOptionIds]);

  if (isLoading || !poll) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <AppHeader title="Poll" showBack />
        <LoadingOverlay visible={isLoading} />
      </SafeAreaView>
    );
  }

  const canVote = role === 'SUUser' && poll.status === 'Open';
  const readOnlyVote = poll.hasVoted && !poll.allowVoteChange;

  function toggleOption(optionId: string): void {
    setSelected((prev) => {
      const next = new Set(poll!.type === 'SingleChoice' ? [] : prev);
      if (poll!.type === 'SingleChoice') {
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
        <Text style={styles.title}>{poll.title}</Text>
        {poll.isAgmResolution && (
          <View style={styles.agmBadge}><Text style={styles.agmBadgeText}>AGM Resolution</Text></View>
        )}
        <Text style={styles.description}>{poll.description}</Text>
        <Text style={styles.meta}>
          Opens {new Date(poll.opensAt).toLocaleString()} · Closes {new Date(poll.closesAt).toLocaleString()} · {poll.status}
        </Text>
        <Text style={styles.meta}>Target: {targetAudienceLabel(poll)}</Text>

        {poll.outcome && (
          <View style={[styles.outcomeBanner, { backgroundColor: outcomeStyle(poll.outcome).backgroundColor }]}>
            <Text style={{ color: outcomeStyle(poll.outcome).color, fontWeight: typography.fontWeight.bold }}>
              Outcome: {poll.outcome === 'NoQuorum' ? 'No Quorum Reached' : poll.outcome}
            </Text>
          </View>
        )}

        {canVote && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast Your Vote</Text>
            {readOnlyVote ? (
              <Text>
                You voted for: {poll.options.filter((o: PollOption) => poll.mySelectedOptionIds?.includes(o.id)).map((o: PollOption) => o.text).join(', ')}
              </Text>
            ) : (
              <>
                {poll.options.map((o: PollOption) => (
                  <TouchableOpacity key={o.id} style={styles.optionRow} onPress={() => toggleOption(o.id)}>
                    <View style={[styles.optionMarker, selected.has(o.id) && styles.optionMarkerSelected]} />
                    <Text style={styles.optionLabel}>{o.text}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.voteButton} onPress={() => void handleVote()} disabled={castVote.isPending || selected.size === 0}>
                  <Text style={styles.voteButtonText}>{poll.hasVoted ? 'Change Vote' : 'Submit Vote'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {poll.tally && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tally</Text>
            {poll.participantCount != null && poll.eligibleCount != null && (
              <Text style={styles.meta}>{poll.participantCount} of {poll.eligibleCount} eligible have voted</Text>
            )}
            {poll.tally.map((t: PollOptionTally) => (
              <View key={t.id} style={styles.tallyRow}>
                <Text>{t.text}</Text>
                <Text style={styles.tallyCount}>{t.voteCount}</Text>
              </View>
            ))}
          </View>
        )}

        {isAdmin && (
          <View style={styles.adminActions}>
            {poll.status === 'Open' && (
              <TouchableOpacity style={styles.adminButton} onPress={() => void handleClose()} disabled={closePoll.isPending}>
                <Text style={styles.adminButtonText}>Close Poll Early</Text>
              </TouchableOpacity>
            )}
            {poll.status === 'Closed' && !poll.resultsPublished && (
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
