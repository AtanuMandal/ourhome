import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useNotice, useMarkNoticeRead, useNoticeReadReceipts } from './hooks/useNotices';
import { usePollsByLinkedNotice } from '../polls/hooks/usePolls';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDateTime } from '../../shared/utils/date';
import type { NoticeReadReceiptEntry } from '../../api/endpoints/notices';

interface NoticeDetailScreenProps {
  route: { params: { id: string } };
}

export function NoticeDetailScreen({ route }: NoticeDetailScreenProps) {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'SUAdmin' || role === 'HQAdmin';
  const { id } = route.params;
  const { data: notice, isLoading } = useNotice(societyId, id);
  const { mutate: markRead } = useMarkNoticeRead(societyId);
  const { data: linkedPolls } = usePollsByLinkedNotice(societyId, id);
  const linkedPoll = linkedPolls?.items?.[0];

  const [showReadReport, setShowReadReport] = useState(false);
  const { data: readReceipts, isLoading: isLoadingReceipts } = useNoticeReadReceipts(societyId, id, showReadReport);

  useEffect(() => {
    if (notice && !notice.isReadByCurrentUser) {
      markRead(id);
    }
  }, [notice, id, markRead]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Notice" showBack />
      <LoadingOverlay visible={isLoading} />
      {notice != null && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{notice.title}</Text>
            {isAdmin && (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  accessibilityLabel="Edit notice"
                  onPress={() => navigation.navigate('NoticeCreate', { id })}
                >
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Read report"
                  onPress={() => setShowReadReport((v) => !v)}
                >
                  <Text style={styles.editLink}>Read report</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Text style={styles.meta}>
            {notice.category} · {formatDateTime(notice.publishAt)}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{notice.content}</Text>

          {showReadReport && (
            <View style={styles.readReportCard}>
              <Text style={styles.readReportTitle}>Read Report</Text>
              {isLoadingReceipts && <Text style={styles.meta}>Loading…</Text>}
              {readReceipts != null && (
                <>
                  <Text style={styles.receiptHeading}>Read ({readReceipts.read.length})</Text>
                  {readReceipts.read.length === 0 && (
                    <Text style={styles.meta}>No one has read this notice yet.</Text>
                  )}
                  {readReceipts.read.map((entry: NoticeReadReceiptEntry) => (
                    <Text key={entry.userId} style={styles.receiptRow}>✓ {entry.fullName}</Text>
                  ))}
                  <Text style={[styles.receiptHeading, { marginTop: spacing.sm }]}>
                    Unread ({readReceipts.unread.length})
                  </Text>
                  {readReceipts.unread.length === 0 && (
                    <Text style={styles.meta}>Everyone has read this notice.</Text>
                  )}
                  {readReceipts.unread.map((entry: NoticeReadReceiptEntry) => (
                    <Text key={entry.userId} style={styles.receiptRow}>○ {entry.fullName}</Text>
                  ))}
                </>
              )}
            </View>
          )}

          {linkedPoll && (
            <TouchableOpacity style={styles.linkedPollBanner} onPress={() => navigation.navigate('PollDetail', { id: linkedPoll.id })}>
              <Text style={styles.linkedPollText}>
                🗳️ This notice has an associated poll: <Text style={styles.linkedPollTitle}>{linkedPoll.title}</Text> — tap to view or vote
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  editLink: { color: colors.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  meta: { fontSize: typography.fontSize.xs, color: colors.text.disabled },
  readReportCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readReportTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  receiptHeading: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  receiptRow: { fontSize: typography.fontSize.sm, color: colors.text.primary, paddingVertical: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  body: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: 24,
  },
  attachment: {
    marginTop: spacing.lg,
    padding: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  attachmentText: { color: '#FFF', fontWeight: typography.fontWeight.medium },
  linkedPollBanner: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#EDE7F6',
  },
  linkedPollText: { fontSize: typography.fontSize.sm, color: '#4527A0' },
  linkedPollTitle: { fontWeight: typography.fontWeight.semibold },
});
