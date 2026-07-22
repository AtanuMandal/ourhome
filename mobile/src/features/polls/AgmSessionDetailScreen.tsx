import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useAgmSession } from './hooks/useAgmSessions';
import { useCastVote, useClosePoll, usePublishPollResults } from './hooks/usePolls';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { Poll } from '../../api/types';

interface AgmSessionDetailScreenProps {
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

function ResolutionCard({
  resolution, canVote, selected, onToggleOption, onSubmitVote, voting, isAdmin, onClose, onPublish, actioning,
}: {
  resolution: Poll;
  canVote: boolean;
  selected: Set<string>;
  onToggleOption: (optionId: string) => void;
  onSubmitVote: () => void;
  voting: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onPublish: () => void;
  actioning: boolean;
}) {
  const readOnlyVote = resolution.hv && !resolution.avc;

  return (
    <View style={styles.card}>
      <Text style={styles.resolutionTitle}>{resolution.tt}</Text>
      <Text style={styles.resolutionDesc}>{resolution.ds}</Text>
      <Text style={styles.meta}>Closes {new Date(resolution.ca).toLocaleString()} · {resolution.st}</Text>
      <Text style={styles.meta}>Target: {targetAudienceLabel(resolution)}</Text>

      {resolution.oc && (
        <View style={[styles.outcomeBanner, { backgroundColor: outcomeStyle(resolution.oc).backgroundColor }]}>
          <Text style={{ color: outcomeStyle(resolution.oc).color, fontWeight: typography.fontWeight.bold }}>
            Outcome: {resolution.oc === 'NoQuorum' ? 'No Quorum Reached' : resolution.oc}
          </Text>
        </View>
      )}

      {canVote && (
        <View style={styles.section}>
          {readOnlyVote ? (
            <Text>
              You voted for: {resolution.op.filter((o) => resolution.mso?.includes(o.id)).map((o) => o.tx).join(', ')}
            </Text>
          ) : (
            <>
              {resolution.op.map((o) => (
                <TouchableOpacity key={o.id} style={styles.optionRow} onPress={() => onToggleOption(o.id)}>
                  <View style={[styles.optionMarker, selected.has(o.id) && styles.optionMarkerSelected]} />
                  <Text style={styles.optionLabel}>{o.tx}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.voteButton} onPress={onSubmitVote} disabled={voting || selected.size === 0}>
                <Text style={styles.voteButtonText}>{resolution.hv ? 'Change Vote' : 'Submit Vote'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {resolution.tl && (
        <View style={styles.section}>
          {resolution.pc != null && resolution.elc != null && (
            <Text style={styles.meta}>{resolution.pc} of {resolution.elc} eligible have voted</Text>
          )}
          {resolution.tl.map((t) => (
            <View key={t.id} style={styles.tallyRow}>
              <Text>{t.tx}</Text>
              <Text style={styles.tallyCount}>{t.vc}</Text>
            </View>
          ))}
        </View>
      )}

      {isAdmin && (
        <View style={styles.adminActions}>
          {resolution.st === 'Open' && (
            <TouchableOpacity style={styles.adminButton} onPress={onClose} disabled={actioning}>
              <Text style={styles.adminButtonText}>Close Early</Text>
            </TouchableOpacity>
          )}
          {resolution.st === 'Closed' && !resolution.rp && (
            <TouchableOpacity style={styles.adminButton} onPress={onPublish} disabled={actioning}>
              <Text style={styles.adminButtonText}>Publish Results</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export function AgmSessionDetailScreen({ route }: AgmSessionDetailScreenProps) {
  const { id } = route.params;
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl ?? '');
  const isAdmin = role === 'SUAdmin';

  const { data: session, isLoading } = useAgmSession(societyId, id);
  const closePoll = useClosePoll(societyId);
  const publishResults = usePublishPollResults(societyId);
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [votingId, setVotingId] = useState<string | null>(null);

  function toggleOption(pollId: string, optionId: string) {
    setSelections((prev) => {
      const current = new Set(prev[pollId] ?? []);
      if (current.has(optionId)) current.delete(optionId); else current.add(optionId);
      return { ...prev, [pollId]: current };
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="AGM Session" showBack />
      <LoadingOverlay visible={isLoading} />
      {session && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sessionTitle}>{session.tt}</Text>
            <Text style={styles.resolutionDesc}>{session.ds}</Text>
            <Text style={styles.meta}>{new Date(session.sd).toLocaleString()} · {session.r.length} resolution(s)</Text>
          </View>

          {isAdmin && (
            <TouchableOpacity
              style={styles.addResolutionLink}
              onPress={() => navigation.navigate('PollForm', { agmSessionId: session.id })}
            >
              <Text style={styles.addResolutionLinkText}>+ Add Resolution</Text>
            </TouchableOpacity>
          )}

          {session.r.map((resolution: Poll) => (
            <ResolutionCardContainer
              key={resolution.id}
              resolution={resolution}
              societyId={societyId}
              role={role}
              isAdmin={isAdmin}
              selected={selections[resolution.id] ?? new Set()}
              onToggleOption={(optionId) => toggleOption(resolution.id, optionId)}
              voting={votingId === resolution.id}
              setVotingId={setVotingId}
              closePoll={closePoll}
              publishResults={publishResults}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ResolutionCardContainer({
  resolution, societyId, role, isAdmin, selected, onToggleOption, voting, setVotingId, closePoll, publishResults,
}: {
  resolution: Poll;
  societyId: string;
  role: string;
  isAdmin: boolean;
  selected: Set<string>;
  onToggleOption: (optionId: string) => void;
  voting: boolean;
  setVotingId: (id: string | null) => void;
  closePoll: ReturnType<typeof useClosePoll>;
  publishResults: ReturnType<typeof usePublishPollResults>;
}) {
  const castVote = useCastVote(societyId, resolution.id);
  const canVote = role === 'SUUser' && resolution.st === 'Open';

  async function handleSubmitVote(): Promise<void> {
    if (selected.size === 0) return;
    setVotingId(resolution.id);
    try {
      await castVote.mutateAsync({ selectedOptionIds: Array.from(selected) });
      Alert.alert('Vote recorded');
    } catch (e) {
      Alert.alert('Could not record vote', normalizeError(e));
    } finally {
      setVotingId(null);
    }
  }

  async function handleClose(): Promise<void> {
    try {
      await closePoll.mutateAsync(resolution.id);
    } catch (e) {
      Alert.alert('Could not close resolution', normalizeError(e));
    }
  }

  async function handlePublish(): Promise<void> {
    try {
      await publishResults.mutateAsync(resolution.id);
    } catch (e) {
      Alert.alert('Could not publish results', normalizeError(e));
    }
  }

  return (
    <ResolutionCard
      resolution={resolution}
      canVote={canVote}
      selected={selected}
      onToggleOption={onToggleOption}
      onSubmitVote={() => void handleSubmitVote()}
      voting={voting}
      isAdmin={isAdmin}
      onClose={() => void handleClose()}
      onPublish={() => void handlePublish()}
      actioning={closePoll.isPending || publishResults.isPending}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  sessionTitle: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  resolutionTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  resolutionDesc: { fontSize: typography.fontSize.base, color: colors.text.secondary, marginTop: spacing.xs },
  meta: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs },
  outcomeBanner: { borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
  section: { marginTop: spacing.md },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  optionMarker: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  optionMarkerSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionLabel: { fontSize: typography.fontSize.base, color: colors.text.primary },
  voteButton: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  voteButtonText: { color: '#FFF', fontWeight: typography.fontWeight.semibold },
  tallyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  tallyCount: { fontWeight: typography.fontWeight.semibold },
  adminActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  adminButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  adminButtonText: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  addResolutionLink: { marginBottom: spacing.md },
  addResolutionLinkText: { color: colors.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
});
