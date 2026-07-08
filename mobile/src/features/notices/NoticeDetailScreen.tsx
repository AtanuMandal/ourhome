import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useNotice, useMarkNoticeRead } from './hooks/useNotices';
import { usePollsByLinkedNotice } from '../polls/hooks/usePolls';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDateTime } from '../../shared/utils/date';

interface NoticeDetailScreenProps {
  route: { params: { id: string } };
}

export function NoticeDetailScreen({ route }: NoticeDetailScreenProps) {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const societyId = useSocietyId();
  const { id } = route.params;
  const { data: notice, isLoading } = useNotice(societyId, id);
  const { mutate: markRead } = useMarkNoticeRead(societyId);
  const { data: linkedPolls } = usePollsByLinkedNotice(societyId, id);
  const linkedPoll = linkedPolls?.items?.[0];

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
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.meta}>
            {notice.category} · {formatDateTime(notice.publishAt)}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{notice.content}</Text>

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
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  meta: { fontSize: typography.fontSize.xs, color: colors.text.disabled },
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
