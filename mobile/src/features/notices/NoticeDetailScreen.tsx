import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useNotice, useMarkNoticeRead } from './hooks/useNotices';
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
  const societyId = useSocietyId();
  const { id } = route.params;
  const { data: notice, isLoading } = useNotice(societyId, id);
  const { mutate: markRead } = useMarkNoticeRead(societyId);

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
});
